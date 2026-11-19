# filament-stock-sync

Workflow [Mistral Workflows](https://mistral.ai) qui synchronise le **stock de filament TigerTag**
avec les **impressions terminées** suivies dans Notion, et remonte des **alertes de stock faible**.

## Ce que ça fait

Workflow `filament-stock-sync` (exécution à la demande, en tant qu'utilisateur — `on_behalf_of`) :

1. Lit la base Notion **« File d'attente d'impression 3D »** : lignes `Statut = Terminé`
   pas encore cochées `Stock décompté`.
2. Pour chaque impression, répartit `Total finalement (g)` **à parts égales** entre les
   filaments cochés qui ont une bobine correspondante dans TigerTag (correspondance
   matière + couleur, la bobine la plus vide d'abord, débordement sur la suivante).
   Les libellés sans bobine (ex. `OTHER`, `PLA Skin`) sont ignorés et rapportés.
3. Déduit les grammes de chaque bobine TigerTag (`set_spool_weight`, mode `consumed`).
4. Coche `Stock décompté` sur la ligne Notion (jamais de double décompte).
5. Crée une alerte dans la base Notion **« ⚠️ Alertes stock faible (filament) »** pour chaque
   bobine sous le seuil (200 g par défaut) — sans doublon tant que l'alerte n'est pas cochée `Résolue`.

Workflow `low-stock-alert` : ne fait que l'étape 5, à la demande.

## Entrées / sorties

- `filament-stock-sync` : `{ "dry_run": true, "done_status": "Terminé", "low_stock_threshold_g": 200.0, "queue_data_source_url": "collection://…", "alerts_data_source_url": "collection://…" }`
  - `dry_run=true` (défaut) : calcule et rapporte sans rien écrire. Lancer d'abord en dry-run,
    vérifier, puis relancer avec `dry_run=false`.
  - Retourne les impressions traitées, les déductions par bobine, les libellés ignorés,
    le total d'heures d'impression (utile pour le suivi d'entretien) et les alertes créées.
- `low-stock-alert` : `{ "dry_run": true, "low_stock_threshold_g": 200.0, "alerts_data_source_url": "collection://…" }`

## Identifiants Notion utilisés (par défaut)

- File d'attente : `collection://b87210bb-21b5-822b-8bab-07f4f62f4a86` (propriété `Stock décompté` ajoutée par le projet)
- Alertes : `collection://41d210bb-21b5-8124-afb6-000bac625922` (base « ⚠️ Alertes stock faible (filament) » sous le Dashboard impression 3D)

## Connecteurs

`notion` et `tigersystem_7e7f`, résolus **as the triggering user** (`on_behalf_of=True`) :
les exécutions lancées par un utilisateur utilisent ses credentials OAuth.
⚠️ Les exécutions planifiées (schedule) ou webhook n'ont pas d'utilisateur : elles
nécessitent des **credentials workspace** sur les deux connecteurs (Mistral Studio),
sinon elles échouent à l'authentification.

## Développement

```bash
# tests (environnement de test Temporal, activités stubées)
cd apps/worker && uv run --all-packages python -m pytest tests/ -q

# lint advisory
bunx nx run worker:semgrep

# test rapide d'un workflow via l'API (nécessite .env avec MISTRAL_API_KEY)
cd apps/worker && uv run --all-packages python ../../.agents/skills/capability-workflows/scripts/test_workflow.py \
  src/worker/workflows/filament_stock_sync.py --input '{"dry_run": true}' --timeout 30

# dev local avec hot-reload
mistral apps dev --filter worker
```

Déploiement managé : `mistral apps deploy` (pousse d'abord le commit) — voir
`.agents/skills/capability-workflows/references/guides/managed-deployments.mdx`.
