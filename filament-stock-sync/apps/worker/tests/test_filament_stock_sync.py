"""Tests for filament_stock_sync: pure mapping/deduction logic + workflow runs
with connector activities stubbed out (no network in tests)."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from mistralai import workflows
from mistralai.workflows.testing import create_test_worker
from worker.workflows.filament_stock_sync import (
    FilamentStockSync,
    LowStockAlert,
    compute_deductions,
    parse_label,
    spool_candidates,
)

WORKFLOW_EXECUTION_TIMEOUT = timedelta(seconds=10)

SPOOLS: list[dict[str, Any]] = [
    {
        "id": "s-black",
        "name": "Black",
        "brand": "Rosa3D",
        "material": "PLA",
        "remaining_g": 317.0,
    },
    {
        "id": "s-charcoal",
        "name": "Charcoal Black",
        "brand": "Polymaker",
        "material": "PLA",
        "remaining_g": 1000.0,
    },
    {
        "id": "s-cotton",
        "name": "Cotton White",
        "brand": "Polymaker",
        "material": "PLA",
        "remaining_g": 1000.0,
    },
    {
        "id": "s-white-hs",
        "name": "White",
        "brand": "Sunlu",
        "material": "PLA+",
        "remaining_g": 250.0,
    },
    {
        "id": "s-lagoon",
        "name": "Lagoon",
        "brand": "Rosa3D",
        "material": "PLA",
        "remaining_g": 536.5,
    },
    {
        "id": "s-klein",
        "name": "Klein Blue",
        "brand": "Sunlu",
        "material": "PLA+",
        "remaining_g": 92.5,
    },
    {
        "id": "s-coffee",
        "name": "Coffee Brown",
        "brand": "Sunlu",
        "material": "PLA+",
        "remaining_g": 244.0,
    },
    {
        "id": "s-winter",
        "name": "Winter White",
        "brand": "Rosa3D",
        "material": "PETG",
        "remaining_g": 305.0,
    },
]

PRINTS: list[dict[str, Any]] = [
    {
        "url": "https://app.notion.com/u1",
        "createdTime": "2026-04-27 11:00:00Z",
        "print_name": "Solo black",
        "filaments": '["PLA Black"]',
        "total_g": 400.0,
        "quantity": 1,
        "hours": 2.0,
        "stock_counted": None,
    },
    {
        "url": "https://app.notion.com/u2",
        "createdTime": "2026-05-19 10:00:00Z",
        "print_name": "Badge",
        "filaments": '["PLA White", "OTHER"]',
        "total_g": 100.0,
        "quantity": 1,
        "hours": 1.0,
        "stock_counted": None,
    },
]


# --- stub activities (same names as the real ones, no connector client) ------


@workflows.activity(name="notion-query-done-prints")
async def stub_fetch_done_prints(
    queue_data_source_url: str, done_status: str
) -> list[dict[str, Any]]:
    return [dict(p) for p in PRINTS]


@workflows.activity(name="tigertag-list-spools")
async def stub_fetch_spools() -> list[dict[str, Any]]:
    return [dict(s) for s in SPOOLS]


@workflows.activity(name="tigertag-consume")
async def stub_apply_consumption(
    spool_id: str, grams: float, dry_run: bool
) -> dict[str, Any]:
    return {"spool_id": spool_id, "grams": grams, "applied": not dry_run}


@workflows.activity(name="notion-mark-stock-counted")
async def stub_mark_counted(page_url: str, dry_run: bool) -> dict[str, Any]:
    return {"page": page_url, "marked": not dry_run}


@workflows.activity(name="notion-open-alert-spool-ids")
async def stub_open_alerts(alerts_data_source_url: str) -> list[str]:
    return []


@workflows.activity(name="notion-create-alert")
async def stub_create_alert(
    alerts_data_source_url: str, alert: dict[str, Any], detected_on: str, dry_run: bool
) -> dict[str, Any]:
    return {**alert, "created": not dry_run}


STUB_ACTIVITIES = [
    stub_fetch_done_prints,
    stub_fetch_spools,
    stub_apply_consumption,
    stub_mark_counted,
    stub_open_alerts,
    stub_create_alert,
]


# --- pure logic ---------------------------------------------------------------


def test_parse_label() -> None:
    assert parse_label("PLA Black") == (
        "PLA",
        ("black", "charcoal", "anthracite", "onyx"),
    )
    assert parse_label("PETG jaune") == (
        "PETG",
        ("yellow", "jaune", "orange", "sunny"),
    )
    assert parse_label("PLAN Orange") == ("PLA", ("orange", "juicy"))
    assert parse_label("OTHER") == (None, ())
    assert parse_label("PLA Skin") == ("PLA", ())  # no colour keywords -> unmapped


def test_spool_candidates_prefers_exact_material_and_emptiest() -> None:
    cands = spool_candidates("PLA Black", SPOOLS)
    assert [c["id"] for c in cands[:2]] == ["s-black", "s-charcoal"]
    # PLA Blue: "Lagoon" is PLA and blue-ish -> before the PLA+ Klein Blue
    cands = spool_candidates("PLA Blue", SPOOLS)
    assert cands[0]["id"] == "s-lagoon"
    assert "s-klein" in [c["id"] for c in cands]
    # PETG White -> Winter White (exact material), PLA whites must not appear first
    cands = spool_candidates("PETG White", SPOOLS)
    assert cands[0]["id"] == "s-winter"
    # PLA Brown: no exact-PLA colour hit -> material family + colour (Coffee Brown PLA+),
    # before any "exact material, any colour" fallback
    cands = spool_candidates("PLA Brown", SPOOLS)
    assert cands[0]["id"] == "s-coffee"
    # unmapped labels
    assert spool_candidates("OTHER", SPOOLS) == []
    assert spool_candidates("PLA Skin", SPOOLS) == []


def test_compute_deductions_fills_emptiest_first_and_overflows() -> None:
    prints = [PRINTS[0]]  # 400 g of PLA Black, only 317 g on the Rosa3D spool
    deductions, remaining = compute_deductions(prints, SPOOLS)
    by_spool = {d["spool_id"]: d["grams"] for d in deductions if d["spool_id"]}
    assert by_spool == {"s-black": 317.0, "s-charcoal": 83.0}
    assert remaining["s-black"] == 0.0
    assert remaining["s-charcoal"] == 917.0


def test_compute_deductions_splits_equally_and_skips_unmapped() -> None:
    deductions, remaining = compute_deductions(
        [PRINTS[1]], SPOOLS
    )  # 100 g over PLA White + OTHER
    by_spool = {d["spool_id"]: d["grams"] for d in deductions if d["spool_id"]}
    assert by_spool == {
        "s-cotton": 100.0
    }  # OTHER unmapped -> whole share on the mapped label
    assert remaining["s-cotton"] == 900.0


def test_compute_deductions_reports_shortfall_instead_of_clamping() -> None:
    prints = [dict(PRINTS[0], total_g=5000.0)]
    deductions, remaining = compute_deductions(prints, SPOOLS)
    shortfalls = [d for d in deductions if d.get("shortfall_g")]
    assert shortfalls and shortfalls[0]["shortfall_g"] > 0
    assert remaining["s-black"] == 0.0 and remaining["s-charcoal"] == 0.0


# --- workflow runs (stubbed activities) ---------------------------------------


async def test_stock_sync_dry_run(temporal_env) -> None:
    async with create_test_worker(
        temporal_env, workflows=[FilamentStockSync], activities=STUB_ACTIVITIES
    ):
        handle = await temporal_env.client.start_workflow(
            "filament-stock-sync",
            {"dry_run": True, "low_stock_threshold_g": 200.0},
            id="test-sync-dry",
            task_queue="test-task-queue",
            execution_timeout=WORKFLOW_EXECUTION_TIMEOUT,
        )
        result = await asyncio.wait_for(handle.result(), timeout=15)
        assert result["dry_run"] is True
        assert len(result["processed"]) == 2
        assert result["total_grams_deducted"] == 500.0
        assert result["total_print_hours"] == 3.0
        assert all(
            not d["applied"] for p in result["processed"] for d in p["deductions"]
        )
        assert all(not p["marked_counted"] for p in result["processed"])
        # "Badge" skipped OTHER
        badge = next(p for p in result["processed"] if p["name"] == "Badge")
        assert badge["skipped_filaments"] == ["OTHER"]
        # alerts: s-black (0 g left), s-klein (92.5 g), s-coffee? 244 -> no
        alert_ids = {a["spool_id"] for a in result["alerts"]}
        assert {"s-black", "s-klein"} <= alert_ids
        assert all(not a["created"] for a in result["alerts"])


async def test_stock_sync_applies(temporal_env) -> None:
    async with create_test_worker(
        temporal_env, workflows=[FilamentStockSync], activities=STUB_ACTIVITIES
    ):
        handle = await temporal_env.client.start_workflow(
            "filament-stock-sync",
            {"dry_run": False},
            id="test-sync-apply",
            task_queue="test-task-queue",
            execution_timeout=WORKFLOW_EXECUTION_TIMEOUT,
        )
        result = await asyncio.wait_for(handle.result(), timeout=15)
        assert all(
            d["applied"]
            for p in result["processed"]
            for d in p["deductions"]
            if d["spool_id"]
        )
        assert all(p["marked_counted"] for p in result["processed"])
        assert any(a["created"] for a in result["alerts"])


async def test_low_stock_alert_workflow(temporal_env) -> None:
    async with create_test_worker(
        temporal_env, workflows=[LowStockAlert], activities=STUB_ACTIVITIES
    ):
        handle = await temporal_env.client.start_workflow(
            "low-stock-alert",
            {"dry_run": False, "low_stock_threshold_g": 200.0},
            id="test-alerts",
            task_queue="test-task-queue",
            execution_timeout=WORKFLOW_EXECUTION_TIMEOUT,
        )
        result = await asyncio.wait_for(handle.result(), timeout=15)
        alert_ids = {a["spool_id"] for a in result["alerts"]}
        assert {"s-klein"} <= alert_ids  # 92.5 g, untouched by the sync tests
