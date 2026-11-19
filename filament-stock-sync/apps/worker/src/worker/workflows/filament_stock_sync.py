"""Sync filament stock (TigerTag) from printed models (Notion) + low-stock alerts.

Workflow `filament-stock-sync`:
  1. reads the Notion "File d'attente d'impression 3D" rows with Statut = "Terminé"
     that are not yet marked "Stock décompté",
  2. maps each selected Filament label to TigerTag spools (material + colour,
     emptiest matching spool first, overflow onto the next candidate),
  3. splits "Total finalement (g)" equally between the mapped filaments and
     deducts the grams from each spool (`set_spool_weight`, mode "consumed"),
  4. marks the Notion row "Stock décompté" so it is never counted twice,
  5. raises a low-stock alert in the Notion alerts database for every spool
     below the threshold (idempotent: skips spools with an unresolved alert).

Workflow `low-stock-alert` runs only step 5 on demand.

Runs on behalf of the triggering user (`on_behalf_of=True`) so the Notion and
TigerTag connectors resolve that user's credentials. Scheduled/webhook runs
have no user and would need workspace-scope credentials on both connectors.

Assumption: "Total finalement (g)" is the total grams for the whole row
(`Quantité` is informational), split equally between the mapped filament labels.
Labels with no matching spool (e.g. OTHER, PLA Skin) are skipped and reported.
"""

from __future__ import annotations

import json
from typing import Any

import pydantic
from mistralai import workflows
from mistralai.workflows import Depends
from mistralai.workflows.plugins.mistralai.connectors import (
    ToolCallClient,
    connector,
    uses_connectors,
)

notion = connector("notion")
tigertag = connector("tigersystem_7e7f")

DEFAULT_QUEUE_DS = "collection://b87210bb-21b5-822b-8bab-07f4f62f4a86"
DEFAULT_ALERTS_DS = "collection://41d210bb-21b5-8124-afb6-000bac625922"
DONE_STATUS = "Terminé"
DEFAULT_THRESHOLD_G = 200.0

# --- pure mapping helpers (no I/O: safe to call from workflow code) ---------

_MATERIAL_ALIASES = {"pla": "PLA", "plan": "PLA", "petg": "PETG", "abs": "ABS"}
# Colour keyword -> name fragments matched against the TigerTag spool name
# (hex colours alone are not searchable, so this list carries the synonyms).
_COLOR_KEYWORDS = {
    "black": ("black", "charcoal", "anthracite", "onyx"),
    "white": ("white", "blanc", "cotton", "winter"),
    "grey": ("grey", "gray", "slate"),
    "gray": ("grey", "gray", "slate"),
    "red": ("red", "fire", "jasper", "cherry"),
    "wood": ("wood", "oak"),
    "yellow": ("yellow", "gold", "sunny"),
    "jaune": ("yellow", "jaune", "gold", "orange", "sunny"),
    "brown": ("brown", "coffee", "chocolate"),
    "blue": ("blue", "lagoon", "klein", "navy", "azure", "cyan", "turquoise", "indigo"),
    "orange": ("orange", "juicy"),
    "beige": ("beige", "army", "sand", "cream"),
    "green": ("green", "olive", "mint"),
    "pink": ("pink",),
    "purple": ("purple", "lavender", "violet"),
    # "skin" and anything unknown: no colour keywords -> label stays unmapped
}


def parse_label(label: str) -> tuple[str | None, tuple[str, ...]]:
    """Split a Notion filament label like 'PLA Black' into (material, colour keywords)."""
    parts = label.strip().split(None, 1)
    if not parts:
        return None, ()
    material = _MATERIAL_ALIASES.get(parts[0].lower())
    colour = parts[1].strip().lower() if len(parts) > 1 else ""
    keywords = _COLOR_KEYWORDS.get(colour, ())
    return material, keywords


def _material_rank(spool_material: str, material: str) -> int:
    if spool_material == material:
        return 0
    if material == "PLA" and spool_material.startswith("PLA"):
        return 1  # PLA+, PLA High Speed, ... as fallback
    return -1


def spool_candidates(label: str, spools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Candidate spools for a label: exact material + colour first, then material
    family + colour, then exact material alone, then family alone. Within a group,
    the emptiest spool comes first so low spools drain first."""
    material, keywords = parse_label(label)
    if material is None or not keywords:
        return []
    groups: list[list[dict[str, Any]]] = [[], [], [], []]
    for spool in spools:
        rank = _material_rank(str(spool.get("material", "")), material)
        if rank < 0:
            continue
        name = str(spool.get("name", "")).lower()
        colour_hit = any(k in name for k in keywords)
        groups[rank * 2 + (0 if colour_hit else 1)].append(spool)
    ordered: list[dict[str, Any]] = []
    for group in groups:
        ordered.extend(
            sorted(
                group, key=lambda s: (float(s.get("remaining_g") or 0), str(s["id"]))
            )
        )
    return ordered


def compute_deductions(
    prints: list[dict[str, Any]], spools: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, float]]:
    """Compute per-spool gram deductions for all prints, honouring remaining stock.

    Returns (deductions, remaining_after). Each deduction is a dict with
    print_url, print_name, filament_label, spool_id, grams. Prints are processed
    in the order given (the SQL query orders them by creation date). The total
    grams of a print are split equally between its mapped filament labels; each
    share fills candidate spools emptiest-first until exhausted (shortfall is
    reported on the print, never silently clamped).
    """
    remaining = {str(s["id"]): float(s.get("remaining_g") or 0) for s in spools}
    spool_names = {str(s["id"]): str(s.get("name", "")) for s in spools}
    deductions: list[dict[str, Any]] = []
    shortfalls: dict[str, float] = {}
    for print_row in prints:
        url = str(print_row.get("url", ""))
        name = str(print_row.get("print_name") or "")
        total_g = float(print_row.get("total_g") or 0)
        raw_filaments = print_row.get("filaments")
        labels = (
            json.loads(raw_filaments)
            if isinstance(raw_filaments, str)
            else list(raw_filaments or [])
        )
        mapped = [(label, spool_candidates(str(label), spools)) for label in labels]
        mapped = [(label, cands) for label, cands in mapped if cands]
        if total_g <= 0 or not mapped:
            continue
        share = total_g / len(mapped)
        for label, cands in mapped:
            need = share
            for spool in cands:
                if need <= 0:
                    break
                take = min(remaining[str(spool["id"])], need)
                if take > 0:
                    remaining[str(spool["id"])] -= take
                    need -= take
                    deductions.append(
                        {
                            "print_url": url,
                            "print_name": name,
                            "filament_label": label,
                            "spool_id": str(spool["id"]),
                            "spool_name": spool_names[str(spool["id"])],
                            "grams": round(take, 3),
                        }
                    )
            if need > 0:
                shortfalls[url] = shortfalls.get(url, 0.0) + round(need, 3)
    for url, grams in shortfalls.items():
        deductions.append(
            {
                "print_url": url,
                "print_name": next(
                    (p.get("print_name", "") for p in prints if p.get("url") == url), ""
                ),
                "filament_label": "",
                "spool_id": "",
                "spool_name": "",
                "grams": 0.0,
                "shortfall_g": grams,
            }
        )
    return deductions, remaining


def _loads(result: Any) -> Any:
    if isinstance(result, str):
        return json.loads(result)
    return result


# --- models ------------------------------------------------------------------


class StockSyncInput(pydantic.BaseModel):
    dry_run: bool = True
    done_status: str = DONE_STATUS
    low_stock_threshold_g: float = DEFAULT_THRESHOLD_G
    queue_data_source_url: str = DEFAULT_QUEUE_DS
    alerts_data_source_url: str = DEFAULT_ALERTS_DS


class DeductionOut(pydantic.BaseModel):
    print_url: str
    print_name: str
    filament_label: str
    spool_id: str
    spool_name: str
    grams: float
    applied: bool
    shortfall_g: float = 0.0


class PrintResult(pydantic.BaseModel):
    url: str
    name: str
    total_g: float
    hours: float
    deductions: list[DeductionOut]
    skipped_filaments: list[str]
    marked_counted: bool


class AlertOut(pydantic.BaseModel):
    spool_id: str
    name: str
    brand: str
    material: str
    remaining_g: float
    threshold_g: float
    created: bool


class StockSyncOutput(pydantic.BaseModel):
    dry_run: bool
    processed: list[PrintResult]
    total_grams_deducted: float
    total_print_hours: float
    alerts: list[AlertOut]


class LowStockAlertInput(pydantic.BaseModel):
    dry_run: bool = True
    low_stock_threshold_g: float = DEFAULT_THRESHOLD_G
    alerts_data_source_url: str = DEFAULT_ALERTS_DS


class LowStockAlertOutput(pydantic.BaseModel):
    dry_run: bool
    alerts: list[AlertOut]


# --- activities (all I/O lives here) -----------------------------------------


@workflows.activity(name="notion-query-done-prints")
async def fetch_done_prints(
    queue_data_source_url: str,
    done_status: str,
    client: ToolCallClient = Depends(notion),  # noqa: B008 - SDK DI pattern
) -> list[dict[str, Any]]:
    query = (
        'SELECT url, createdTime, "Nom de l’impression" AS print_name, "Filament" AS filaments, '
        '"Total finalement (g)" AS total_g, "Quantité" AS quantity, "Heure d’impression" AS hours, '
        f'"Stock décompté" AS stock_counted FROM "{queue_data_source_url}" '
        'WHERE "Statut" = ? AND ("Stock décompté" IS NULL OR "Stock décompté" <> \'__YES__\') '
        "ORDER BY createdTime ASC, url ASC"
    )
    result = await client.call_tool(
        "notion-query-data-sources",
        {
            "data": {
                "data_source_urls": [queue_data_source_url],
                "query": query,
                "params": [done_status],
            }
        },
    )
    payload = _loads(result)
    rows = payload.get("results", []) if isinstance(payload, dict) else payload
    return [dict(row) for row in rows]


@workflows.activity(name="tigertag-list-spools")
async def fetch_spools(
    client: ToolCallClient = Depends(tigertag),  # noqa: B008 - SDK DI pattern
) -> list[dict[str, Any]]:
    result = await client.call_tool("tigersystem_7e7f_search_inventory", {})
    payload = _loads(result)
    spools = payload.get("spools", []) if isinstance(payload, dict) else payload
    return [
        {
            "id": str(s["id"]),
            "name": str(s.get("name", "")),
            "brand": str(s.get("brand", "")),
            "material": str(s.get("material", "")),
            "remaining_g": float(s.get("remaining_g") or 0),
        }
        for s in spools
    ]


@workflows.activity(name="tigertag-consume", retry_policy_max_attempts=1)
async def apply_consumption(
    spool_id: str,
    grams: float,
    dry_run: bool,
    client: ToolCallClient = Depends(tigertag),  # noqa: B008 - SDK DI pattern
) -> dict[str, Any]:
    if dry_run:
        return {"spool_id": spool_id, "grams": grams, "applied": False}
    await client.call_tool(
        "tigersystem_7e7f_set_spool_weight",
        {"spool_id": spool_id, "grams": grams, "mode": "consumed"},
    )
    return {"spool_id": spool_id, "grams": grams, "applied": True}


@workflows.activity(name="notion-mark-stock-counted", retry_policy_max_attempts=1)
async def mark_counted(
    page_url: str,
    dry_run: bool,
    client: ToolCallClient = Depends(notion),  # noqa: B008 - SDK DI pattern
) -> dict[str, Any]:
    if dry_run:
        return {"page": page_url, "marked": False}
    await client.call_tool(
        "notion-update-page",
        {
            "page_id": page_url,
            "command": "update_properties",
            "properties": {"Stock décompté": "__YES__"},
        },
    )
    return {"page": page_url, "marked": True}


@workflows.activity(name="notion-open-alert-spool-ids")
async def fetch_open_alert_spool_ids(
    alerts_data_source_url: str,
    client: ToolCallClient = Depends(notion),  # noqa: B008 - SDK DI pattern
) -> list[str]:
    query = (
        f'SELECT "ID bobine TigerTag" AS spool_id FROM "{alerts_data_source_url}" '
        'WHERE "Résolue" IS NULL OR "Résolue" <> \'__YES__\''
    )
    result = await client.call_tool(
        "notion-query-data-sources",
        {"data": {"data_source_urls": [alerts_data_source_url], "query": query}},
    )
    payload = _loads(result)
    rows = payload.get("results", []) if isinstance(payload, dict) else payload
    return [str(row["spool_id"]) for row in rows if row.get("spool_id")]


@workflows.activity(name="notion-create-alert", retry_policy_max_attempts=1)
async def create_alert(
    alerts_data_source_url: str,
    alert: dict[str, Any],
    detected_on: str,
    dry_run: bool,
    client: ToolCallClient = Depends(notion),  # noqa: B008 - SDK DI pattern
) -> dict[str, Any]:
    properties = {
        "Alerte": f"{alert['name']} ({alert['material']}, {alert['brand']}) — {alert['remaining_g']} g restantes",
        "Bobine": alert["name"],
        "Marque": alert["brand"],
        "Matière": alert["material"],
        "Reste (g)": alert["remaining_g"],
        "Seuil (g)": alert["threshold_g"],
        "date:Détectée le:start": detected_on,
        "date:Détectée le:is_datetime": 0,
        "Résolue": "__NO__",
        "ID bobine TigerTag": alert["spool_id"],
    }
    if dry_run:
        return {**alert, "created": False}
    await client.call_tool(
        "notion-create-pages",
        {
            "parent": {"data_source_id": alerts_data_source_url},
            "pages": [{"properties": properties}],
        },
    )
    return {**alert, "created": True}


# --- workflows ----------------------------------------------------------------


async def raise_low_stock_alerts(
    alerts_data_source_url: str,
    low_stock_threshold_g: float,
    dry_run: bool,
    spools: list[dict[str, Any]],
    remaining: dict[str, float],
) -> list[AlertOut]:
    """Create one Notion alert per spool below the threshold, skipping spools that
    already have an unresolved alert (idempotent)."""
    low = [
        s
        for s in spools
        if remaining.get(str(s["id"]), float(s.get("remaining_g") or 0))
        < low_stock_threshold_g
    ]
    open_alerts = set(await fetch_open_alert_spool_ids(alerts_data_source_url))
    detected_on = workflows.workflow.now().date().isoformat()
    alerts: list[AlertOut] = []
    for s in sorted(
        low, key=lambda s: (float(s.get("remaining_g") or 0), str(s["id"]))
    ):
        alert = {
            "spool_id": str(s["id"]),
            "name": str(s.get("name", "")),
            "brand": str(s.get("brand", "")),
            "material": str(s.get("material", "")),
            "remaining_g": round(remaining.get(str(s["id"]), 0.0), 3),
            "threshold_g": low_stock_threshold_g,
        }
        if str(s["id"]) in open_alerts:
            alerts.append(AlertOut(**alert, created=False))
            continue
        created = await create_alert(
            alerts_data_source_url, alert, detected_on, dry_run
        )
        alerts.append(AlertOut(**alert, created=created["created"]))
    return alerts


@workflows.workflow.define(name="filament-stock-sync", on_behalf_of=True)
@uses_connectors(notion, tigertag)
class FilamentStockSync:
    @workflows.workflow.entrypoint
    async def run(self, inp: StockSyncInput) -> StockSyncOutput:
        prints = await fetch_done_prints(inp.queue_data_source_url, inp.done_status)
        spools = await fetch_spools()
        deductions, remaining = compute_deductions(prints, spools)

        by_print: dict[str, list[dict[str, Any]]] = {}
        for d in deductions:
            by_print.setdefault(d["print_url"], []).append(d)

        processed: list[PrintResult] = []
        total_grams = 0.0
        total_hours = 0.0
        for print_row in prints:
            url = str(print_row.get("url", ""))
            raw_filaments = print_row.get("filaments")
            labels = (
                json.loads(raw_filaments)
                if isinstance(raw_filaments, str)
                else list(raw_filaments or [])
            )
            mapped_labels = {
                label
                for label, cands in (
                    (str(l), spool_candidates(str(l), spools)) for l in labels
                )
                if cands
            }
            print_deductions = by_print.get(url, [])
            applied_deductions: list[DeductionOut] = []
            for d in print_deductions:
                result = await apply_consumption(d["spool_id"], d["grams"], inp.dry_run)
                applied_deductions.append(
                    DeductionOut(
                        print_url=d["print_url"],
                        print_name=d["print_name"],
                        filament_label=d["filament_label"],
                        spool_id=d["spool_id"],
                        spool_name=d["spool_name"],
                        grams=d["grams"],
                        applied=result["applied"],
                        shortfall_g=float(d.get("shortfall_g", 0.0)),
                    )
                )
                total_grams += d["grams"]
            total_hours += float(print_row.get("hours") or 0)
            marked = {"marked": False}
            if print_deductions and all(
                d.get("shortfall_g", 0.0) == 0.0 for d in print_deductions
            ):
                marked = await mark_counted(url, inp.dry_run)
            processed.append(
                PrintResult(
                    url=url,
                    name=str(print_row.get("print_name") or ""),
                    total_g=float(print_row.get("total_g") or 0),
                    hours=float(print_row.get("hours") or 0),
                    deductions=applied_deductions,
                    skipped_filaments=[
                        str(l) for l in labels if str(l) not in mapped_labels
                    ],
                    marked_counted=marked["marked"],
                )
            )

        alerts = await raise_low_stock_alerts(
            inp.alerts_data_source_url,
            inp.low_stock_threshold_g,
            inp.dry_run,
            spools,
            remaining,
        )
        return StockSyncOutput(
            dry_run=inp.dry_run,
            processed=processed,
            total_grams_deducted=round(total_grams, 3),
            total_print_hours=round(total_hours, 3),
            alerts=alerts,
        )


@workflows.workflow.define(name="low-stock-alert", on_behalf_of=True)
@uses_connectors(notion, tigertag)
class LowStockAlert:
    @workflows.workflow.entrypoint
    async def run(self, inp: LowStockAlertInput) -> LowStockAlertOutput:
        spools = await fetch_spools()
        remaining = {str(s["id"]): float(s.get("remaining_g") or 0) for s in spools}
        alerts = await raise_low_stock_alerts(
            inp.alerts_data_source_url,
            inp.low_stock_threshold_g,
            inp.dry_run,
            spools,
            remaining,
        )
        return LowStockAlertOutput(dry_run=inp.dry_run, alerts=alerts)
