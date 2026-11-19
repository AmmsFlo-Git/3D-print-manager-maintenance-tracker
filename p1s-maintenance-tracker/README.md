# Suivi d'entretien — Bambu Lab P1S

Application web statique (HTML/CSS/JS vanilla, aucune dépendance, fonctionne hors ligne)
pour suivre la maintenance d'une **Bambu Lab P1S** à partir du **total d'heures d'impression**.

## Utilisation

Ouvrir simplement `index.html` dans un navigateur, ou servir le dossier :

```bash
cd p1s-maintenance-tracker
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fonctionnalités

- Saisie du **total d'heures d'impression** (champ + boutons ±1/10/50 h), persisté en `localStorage`.
- **19 tâches d'entretien** basées sur le [guide officiel Bambu Lab série P1](https://wiki.bambulab.com/en/p1/maintenance/p1p-maintenance), chacune avec un **intervalle suggéré en heures** modifiable :
  nettoyage du plateau (IPA + lavage), nettoyage de la chambre, tiges carbone axe X à l'IPA,
  nettoyage ventilateurs et caméra, nettoyage extrudeur, nettoyage en profondeur de la buse (cold pull),
  graissage des vis trapézoïdales Z, huile anti-rouille des tiges Y/Z, poulies idlers,
  lame du coupe-filament, essuie-buse (wiper), tubes PTFE, filtre à charbon actif,
  chausson silicone, plateau PEI, tension des courroies, usure de buse, serrage des vis.
- Pour chaque tâche : barre de progression, statut (**OK / Bientôt / En retard**),
  prochaine échéance en heures, heures restantes, estimation de date (rythme moyen h/jour configurable),
  bouton « ✓ Fait maintenant » ou « Fait à X h », historique des entretiens.
- Filtres (Toutes / En retard / Bientôt / OK), recherche, tri.
- Export / import JSON, réinitialisation complète.

## Hypothèses de conversion en heures

Les recommandations officielles sont données en mois ou en bobines ; elles sont converties avec :
**~8 h/jour ⇒ 1 mois ≈ 240 h, 3 mois ≈ 720 h ; 1 bobine ≈ 50 h d'impression.**
Chaque intervalle reste modifiable individuellement dans l'interface.

## Données

Tout est stocké localement dans le navigateur (`localStorage`, clé `p1s-maintenance-tracker-v1`).
Aucune donnée n'est transmise à un serveur.
