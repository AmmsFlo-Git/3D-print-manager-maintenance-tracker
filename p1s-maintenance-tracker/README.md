# p1s-maintenance-tracker

Application web statique (HTML/CSS/JS vanilla, aucune dépendance, fonctionne hors ligne)
pour suivre la maintenance d'une **Bambu Lab P1S** à partir du **total d'heures d'impression**.

Design inspiré de **Tiger Studio Manager 2** (sidebar, thème clair/sombre, cartes, orange `#ff7a18`).

## Utilisation

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fonctionnalités

- **Fiche d'identité de la P1S** (vue « Ma P1S ») : surnom, modèle, n° de série, dates d'achat/mise en service,
  firmware, buse, plateau, AMS, emplacement, notes — éditables, plus l'état global (heures totales,
  entretiens effectués, en retard, prochaine échéance).
- Saisie du **total d'heures d'impression** (champ + boutons ±1/10/50 h), rythme moyen h/jour pour estimer les dates.
- **20 tâches d'entretien** réparties en 3 thèmes : **Nettoyage**, **Vérification**, **Remplacement**,
  chacune avec un **intervalle suggéré en heures** modifiable et des **liens tutoriels** (wiki officiel Bambu Lab + vidéos YouTube).
- Par tâche : barre de progression, statut (OK / Bientôt / En retard), échéance en heures, heures restantes,
  bouton « ✓ Fait », historique. Filtres, recherche, tri.
- Thème clair/sombre, export/import JSON, réinitialisation. Données en `localStorage`.

## Hypothèses de conversion en heures

Recommandations officielles (mois / bobines) converties avec : **~8 h/jour ⇒ 1 mois ≈ 240 h, 3 mois ≈ 720 h ; 1 bobine ≈ 50 h d'impression.**
Chaque intervalle reste modifiable dans l'interface. Les données de la v1 sont migrées automatiquement.
