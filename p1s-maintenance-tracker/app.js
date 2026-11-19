'use strict';

const STORAGE_KEY = 'p1s-maintenance-tracker-v2';
const LEGACY_KEY = 'p1s-maintenance-tracker-v1';

const WIKI_P1 = 'https://wiki.bambulab.com/en/p1/maintenance/p1p-maintenance';
const WIKI_P1_INDEX = 'https://wiki.bambulab.com/en/p1/maintenance';
const WIKI_EXTRUDER = 'https://wiki.bambulab.com/en/p1/maintenance/extruder-cleaning-guide';
const WIKI_CUTTER = 'https://wiki.bambulab.com/en/x1/maintenance/replace-cutter';
const WIKI_CARBON = 'https://wiki.bambulab.com/en/general/carbon-rods-clearance';
const WIKI_LEADSCREW = 'https://wiki.bambulab.com/en/general/lead-screws-lubrication';
const WIKI_LUBRICANT = 'https://wiki.bambulab.com/en/filament-acc/acc/lubricant-grease-oil';
const WIKI_PTFE = 'https://wiki.bambulab.com/en/filament-acc/acc/ptfe-tube';
const WIKI_PLATES = 'https://wiki.bambulab.com/en/filament-acc/acc/plates';
const WIKI_BELT = 'https://wiki.bambulab.com/en/x1/maintenance/belt-tension';
const WIKI_FILTER = 'https://wiki.bambulab.com/en/x1/maintenance/replace-carbon-filter';
const WIKI_X1_BASIC = 'https://wiki.bambulab.com/en/x1/maintenance/basic-maintenance';
const WIKI_HOTEND = 'https://wiki.bambulab.com/en/p1/maintenance/complete-hotend-assembly';

const YT = {
  p1sGuide: 'https://www.youtube.com/watch?v=xLCZPZXkV1M',
  rodsScrews: 'https://www.youtube.com/watch?v=L2sZhYBfFpU',
  p1sClean: 'https://www.youtube.com/watch?v=Vm6JUFcioGo',
  fullP1s: 'https://www.youtube.com/watch?v=_cuoJuFJc7Y',
  coldPull: 'https://www.youtube.com/watch?v=AU-v8cll5g8',
  coldPull2: 'https://www.youtube.com/watch?v=NE5STdxv_dQ',
  cutter: 'https://www.youtube.com/watch?v=kL9mqHerPLg',
  cutterWiper: 'https://www.youtube.com/watch?v=9Agu3gEEHNI',
  wiper: 'https://www.youtube.com/watch?v=o5nTQsp9ds4',
  nozzle: 'https://www.youtube.com/watch?v=vBwoegg_c5M',
  hotendP1s: 'https://www.youtube.com/watch?v=k4SJwO_dqjM',
  amsPtfe: 'https://www.youtube.com/watch?v=FMZpHgd73Nw',
  filter: 'https://www.youtube.com/watch?v=banXzIBOXh4',
  periodic: 'https://www.youtube.com/watch?v=CxubmTN1Srs',
  extruderP1s: 'https://www.youtube.com/watch?v=aKFFmXsJmHk',
  playlist: 'https://www.youtube.com/playlist?list=PL3kfTBfpzFNvBFQaxbAwzXjI2C98zbFvM',
};

const THEMES = {
  nettoyage: { label: 'Nettoyage', icon: '🧽' },
  verification: { label: 'Vérification', icon: '🔍' },
  remplacement: { label: 'Remplacement', icon: '🔁' },
};
const THEME_ORDER = ['nettoyage', 'verification', 'remplacement'];

// Intervalles suggérés en heures d'impression, issus du guide officiel Bambu Lab série P1
// (~8 h/jour => 1 mois ≈ 240 h, 3 mois ≈ 720 h ; 1 bobine ≈ 50 h d'impression).
const TASKS = [
  {
    id: 'plate-wipe', theme: 'nettoyage',
    title: 'Nettoyer le plateau à l\'alcool isopropylique (IPA)',
    desc: 'Essuyer la plaque PEI avec un chiffon microfibre et de l\'alcool isopropylique. Ne jamais toucher la surface avec les doigts (les huiles de peau réduisent l\'adhérence).',
    interval: 10,
    note: 'Avant chaque impression / tous les 1–2 jours.',
    links: [
      { label: 'Wiki — plaques', url: WIKI_PLATES, type: 'wiki' },
      { label: 'Vidéo P1S', url: YT.p1sGuide, type: 'yt' },
    ],
  },
  {
    id: 'plate-wash', theme: 'nettoyage',
    title: 'Laver le plateau à l\'eau chaude + liquide vaisselle',
    desc: 'Lavage complet de la plaque texturée PEI à l\'eau chaude et au liquide vaisselle, rinçage abondant, séchage. Si l\'adhérence ne revient pas : frotter très légèrement au papier de verre grain 600.',
    interval: 50,
    note: 'Dès que l\'adhérence baisse et au moins toutes les semaines (≈ 50 h à 7–8 h/jour).',
    links: [
      { label: 'Wiki — plaques', url: WIKI_PLATES, type: 'wiki' },
      { label: 'Vidéo P1S', url: YT.p1sGuide, type: 'yt' },
    ],
  },
  {
    id: 'chamber', theme: 'nettoyage',
    title: 'Nettoyer l\'intérieur de la chambre',
    desc: 'Aspirer les débris de filament et la poussière au fond de la chambre, essuyer les parois, vider et dégager la goulotte d\'évacuation des déchets (poop chute).',
    interval: 50,
    note: 'Toutes les semaines en usage régulier (≈ 50 h).',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Vidéo nettoyage P1S', url: YT.p1sClean, type: 'yt' },
    ],
  },
  {
    id: 'carbon-rods', theme: 'nettoyage',
    title: 'Nettoyer les tiges carbone de l\'axe X à l\'alcool isopropylique',
    desc: 'Appliquer généreusement de l\'IPA sur un chiffon microfibre et essuyer toute la longueur des deux tiges carbone, puis déplacer la tête sur toute la course pour nettoyer l\'intérieur des paliers.',
    interval: 240,
    note: 'Tous les mois (≈ 240 h), ou toutes les ~5 bobines d\'ABS/ASA (~250 h). ATTENTION : jamais de graisse ni d\'huile sur les tiges carbone.',
    links: [
      { label: 'Wiki — tiges carbone', url: WIKI_CARBON, type: 'wiki' },
      { label: 'Vidéo rods + vis', url: YT.rodsScrews, type: 'yt' },
    ],
  },
  {
    id: 'fans', theme: 'nettoyage',
    title: 'Nettoyer les ventilateurs (auxiliaire + hotend)',
    desc: 'Imprimante éteinte, souffler à l\'air comprimé sur les pales du ventilateur auxiliaire et du ventilateur de hotend en maintenant les pales immobiles.',
    interval: 50,
    note: 'Vérification toutes les semaines.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Vidéo nettoyage P1S', url: YT.p1sClean, type: 'yt' },
    ],
  },
  {
    id: 'camera', theme: 'nettoyage',
    title: 'Nettoyer l\'objectif de la caméra de chambre (et le lidar)',
    desc: 'Essuyer délicatement l\'objectif de la caméra avec un chiffon microfibre et un peu d\'IPA (coton-tige pour les bords). Idem pour la lentille lidar si l\'image est floue ou en cas d\'erreur lidar.',
    interval: 100,
    note: 'Dès que l\'image est floue ; toutes les semaines si vous imprimez de l\'ABS (≈ 50 h).',
    links: [
      { label: 'Wiki — maintenance X1/P1', url: WIKI_X1_BASIC, type: 'wiki' },
      { label: 'Playlist maintenance', url: YT.playlist, type: 'yt' },
    ],
  },
  {
    id: 'extruder', theme: 'nettoyage',
    title: 'Nettoyer l\'extrudeur et graisser ses engrenages',
    desc: 'Démonter l\'extrudeur, retirer la poussière de filament sur l\'engrenage jaune (brosse + air comprimé) et appliquer une très fine couche de graisse sur les engrenages avant remontage.',
    interval: 250,
    note: 'Dès que de la poussière est visible sur l\'engrenage jaune, soit environ toutes les 5 bobines (~250 h).',
    links: [
      { label: 'Wiki — extrudeur P1', url: WIKI_EXTRUDER, type: 'wiki' },
      { label: 'Vidéo extrudeur P1S', url: YT.extruderP1s, type: 'yt' },
    ],
  },
  {
    id: 'nozzle-deep', theme: 'nettoyage',
    title: 'Nettoyage en profondeur de la buse (chauffe + cold pull)',
    desc: 'Retirer le capot avant et le chausson silicone, chauffer la buse à 200 °C, essuyer avec un chiffon ou des pinces (gants résistants à la chaleur), puis faire un cold pull pour vider les résidus internes.',
    interval: 250,
    note: 'Tous les mois / ~5 bobines (~250 h) ; plus souvent avec des filaments abrasifs ou en cas de sous-extrusion.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Vidéo cold pull', url: YT.coldPull, type: 'yt' },
      { label: 'Vidéo cold pull 2', url: YT.coldPull2, type: 'yt' },
    ],
  },
  {
    id: 'yz-rods', theme: 'nettoyage',
    title: 'Huile anti-rouille sur les tiges acier Y et Z',
    desc: 'Essuyer les tiges linéaires en acier des axes Y et Z avec un chiffon + IPA, puis appliquer une fine couche uniforme d\'huile anti-rouille (ex. Super Lube 52004). Ne pas mettre d\'IPA dans les roulements.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h à 8 h/jour), en même temps que le graissage des vis Z.',
    links: [
      { label: 'Wiki — lubrifiants', url: WIKI_LUBRICANT, type: 'wiki' },
      { label: 'Vidéo rods + vis', url: YT.rodsScrews, type: 'yt' },
    ],
  },
  {
    id: 'z-screws', theme: 'nettoyage',
    title: 'Graisser les 3 vis trapézoïdales de l\'axe Z',
    desc: 'Nettoyer les trois vis trapézoïdales de l\'axe Z, appliquer une fine couche de graisse (Super Lube 92003, Lucas Oil 10533 ou graisse Bambu), puis monter/descendre le plateau pour répartir. Essuyer l\'excès.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h à 8 h/jour) — guide officiel Bambu.',
    links: [
      { label: 'Wiki — vis trapézoïdales', url: WIKI_LEADSCREW, type: 'wiki' },
      { label: 'Vidéo rods + vis', url: YT.rodsScrews, type: 'yt' },
    ],
  },
  {
    id: 'idlers', theme: 'nettoyage',
    title: 'Lubrifier les poulies de renvoi (idlers) si grincement',
    desc: 'Uniquement en cas de bruit de grincement : une petite goutte d\'huile (Super Lube 52004) entre la bride de la poulie et son support plastique. Ne jamais lubrifier les courroies.',
    interval: 720,
    note: 'Si nécessaire uniquement (bruit anormal) ; contrôle à 3 mois.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Playlist maintenance', url: YT.playlist, type: 'yt' },
    ],
  },
  {
    id: 'wiper', theme: 'verification',
    title: 'Vérifier l\'essuie-buse (nozzle wiper)',
    desc: 'Vérifier avant chaque impression que le wiper est propre, sans débris de filament, côté PTFE intact et bien à plat ; le remplacer s\'il est déchiré, déformé, durci ou s\'il n\'essuie plus proprement.',
    interval: 100,
    note: 'Contrôle visuel à chaque impression ; inspection approfondie toutes les ~100 h.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Vidéo cutter + wiper', url: YT.cutterWiper, type: 'yt' },
    ],
  },
  {
    id: 'belts', theme: 'verification',
    title: 'Vérifier la tension des courroies',
    desc: 'Contrôler la tension des courroies (vis de tension à l\'arrière de la tête) : une courroie détendue provoque des décalages de couches et du ghosting. Re-tendre si l\'imprimante signale une courroie lâche.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h) et à chaque alerte de l\'imprimante.',
    links: [
      { label: 'Wiki — tension courroies', url: WIKI_BELT, type: 'wiki' },
      { label: 'Vidéo maintenance périodique', url: YT.periodic, type: 'yt' },
    ],
  },
  {
    id: 'nozzle-wear', theme: 'verification',
    title: 'Inspecter l\'usure de la buse (filaments abrasifs CF/GF)',
    desc: 'Avec des filaments chargés (carbone/verre), inspecter régulièrement l\'alésage de la buse à la lampe : un orifice élargi = buse usée. Remplacer si l\'extrusion reste instable après nettoyage et calibration.',
    interval: 500,
    note: 'Contrôle toutes les ~500 h, plus souvent si impression intensive de matériaux abrasifs.',
    links: [
      { label: 'Wiki — hotend complet P1', url: WIKI_HOTEND, type: 'wiki' },
      { label: 'Vidéo remplacement buse', url: YT.nozzle, type: 'yt' },
      { label: 'Vidéo hotend P1S', url: YT.hotendP1s, type: 'yt' },
    ],
  },
  {
    id: 'screws', theme: 'verification',
    title: 'Vérifier le serrage des vis accessibles',
    desc: 'Contrôle visuel rapide du serrage des vis du châssis et de la tête (les vibrations peuvent les desserrer avec le temps).',
    interval: 500,
    note: 'Contrôle rapide toutes les ~500 h.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1_INDEX, type: 'wiki' },
      { label: 'Playlist maintenance', url: YT.playlist, type: 'yt' },
    ],
  },
  {
    id: 'cutter', theme: 'remplacement',
    title: 'Changer la lame du coupe-filament (cutter)',
    desc: 'Remplacer la petite lame située dans l\'extrudeur. Une lame émoussée coupe mal le filament et provoque des échecs de rétraction/déchargement AMS ("failed to cut the filament").',
    interval: 500,
    note: 'Vérifier toutes les 3–5 bobines ; remplacer toutes les 10–15 bobines (~500–750 h) ; après 1–2 bobines si abrasif.',
    links: [
      { label: 'Wiki — remplacer le cutter', url: WIKI_CUTTER, type: 'wiki' },
      { label: 'Vidéo remplacement lame', url: YT.cutter, type: 'yt' },
    ],
  },
  {
    id: 'ptfe', theme: 'remplacement',
    title: 'Remplacer les tubes PTFE (extrudeur + AMS) si usés',
    desc: 'Contrôler l\'absence de pincements, coupures, débris ou usure interne. Remplacer si le tube ne tient plus dans le raccord, si le filament ne passe plus, ou si le raccord est endommagé.',
    interval: 480,
    note: 'Tube extrudeur : ~10 bobines standard, ~5 bobines abrasif. Tubes AMS : tous les 2 mois (~480 h), 1 mois si fibre de carbone.',
    links: [
      { label: 'Wiki — tube PTFE', url: WIKI_PTFE, type: 'wiki' },
      { label: 'Vidéo tubes AMS', url: YT.amsPtfe, type: 'yt' },
    ],
  },
  {
    id: 'carbon-filter', theme: 'remplacement',
    title: 'Changer le filtre à charbon actif de la P1S',
    desc: 'Remplacer le filtre à charbon actif situé dans le capot supérieur. Un filtre saturé ne filtre plus les particules fines et odeurs (surtout ABS/ASA).',
    interval: 720,
    note: 'Tous les 3 mois à ~8 h/jour (~720 h) ; tous les 1–2 mois avec ABS/ASA ou odeurs marquées.',
    links: [
      { label: 'Wiki — filtre charbon', url: WIKI_FILTER, type: 'wiki' },
      { label: 'Vidéo filtre X1C/P1S', url: YT.filter, type: 'yt' },
    ],
  },
  {
    id: 'sock', theme: 'remplacement',
    title: 'Remplacer le chausson silicone du hotend si usé',
    desc: 'Remplacer le chausson silicone autour du hotend s\'il est déchiré, déformé, ou s\'il ne tient plus en place (buse à température ambiante pour le retirer).',
    interval: 1000,
    note: 'Dès les signes d\'usure ; contrôle systématique vers 1 000 h.',
    links: [
      { label: 'Wiki — maintenance P1', url: WIKI_P1, type: 'wiki' },
      { label: 'Vidéo maintenance complète', url: YT.fullP1s, type: 'yt' },
    ],
  },
  {
    id: 'plate', theme: 'remplacement',
    title: 'Changer le plateau d\'impression (plaque PEI texturée)',
    desc: 'Remplacer la plaque PEI texturée lorsque l\'adhérence reste insuffisante malgré les lavages et le ponçage léger (grain 600), ou si le revêtement est rayé/décollé. Pensez à retourner la plaque pour utiliser l\'autre face entre-temps.',
    interval: 2000,
    note: 'Durée de vie constatée : environ 1 000–2 500 h selon l\'usage (consommable officiel Bambu).',
    links: [
      { label: 'Wiki — plaques', url: WIKI_PLATES, type: 'wiki' },
      { label: 'Vidéo P1S', url: YT.p1sGuide, type: 'yt' },
    ],
  },
];

const IDENTITY_FIELDS = [
  { key: 'surname', label: 'Surnom de l\'imprimante', type: 'text', placeholder: 'Ma P1S' },
  { key: 'model', label: 'Modèle', type: 'text', placeholder: 'Bambu Lab P1S' },
  { key: 'serial', label: 'Numéro de série', type: 'text', placeholder: '00M09…' },
  { key: 'purchaseDate', label: 'Date d\'achat', type: 'date' },
  { key: 'startDate', label: 'Mise en service', type: 'date' },
  { key: 'firmware', label: 'Firmware', type: 'text', placeholder: '01.08.02.00' },
  { key: 'nozzleSize', label: 'Diamètre de buse', type: 'text', placeholder: '0,4 mm' },
  { key: 'nozzleMaterial', label: 'Matériau de buse', type: 'text', placeholder: 'Acier inoxydable / acier trempé' },
  { key: 'plate', label: 'Plateau', type: 'text', placeholder: 'PEI texturée double face' },
  { key: 'ams', label: 'AMS', type: 'text', placeholder: 'Oui — 1 AMS' },
  { key: 'location', label: 'Emplacement', type: 'text', placeholder: 'Bureau, atelier…' },
  { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
];

const SOON_RATIO = 0.25;
const STATUS_LABEL = { ok: 'OK', soon: 'Bientôt', overdue: 'En retard' };

const state = loadState();
let currentView = 'entretien';
let filter = 'all';
let sortMode = 'due';
let searchQuery = '';
let identityEditing = false;

function defaultPrinter() {
  return {
    surname: 'Ma P1S', model: 'Bambu Lab P1S', serial: '', purchaseDate: '', startDate: '',
    firmware: '', nozzleSize: '0,4 mm', nozzleMaterial: 'Acier inoxydable', plate: 'PEI texturée double face',
    ams: '', location: '', notes: '',
  };
}

function defaultState() {
  return { totalHours: 0, avgPerDay: 4, theme: 'dark', printer: defaultPrinter(), tasks: {} };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        totalHours: Number(p.totalHours) || 0,
        avgPerDay: p.avgPerDay != null ? Number(p.avgPerDay) : 4,
        theme: p.theme === 'light' ? 'light' : 'dark',
        printer: Object.assign(defaultPrinter(), p.printer || {}),
        tasks: p.tasks && typeof p.tasks === 'object' ? p.tasks : {},
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = JSON.parse(legacy);
      return {
        totalHours: Number(p.totalHours) || 0,
        avgPerDay: p.avgPerDay != null ? Number(p.avgPerDay) : 4,
        theme: 'dark',
        printer: defaultPrinter(),
        tasks: p.tasks && typeof p.tasks === 'object' ? p.tasks : {},
      };
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTaskState(id) {
  if (!state.tasks[id]) state.tasks[id] = { lastDone: null, intervalOverride: null, history: [] };
  const t = state.tasks[id];
  if (!Array.isArray(t.history)) t.history = [];
  return t;
}

function effectiveInterval(task) {
  const t = getTaskState(task.id);
  return t.intervalOverride != null && t.intervalOverride > 0 ? t.intervalOverride : task.interval;
}

function computeTask(task) {
  const t = getTaskState(task.id);
  const interval = effectiveInterval(task);
  const start = t.lastDone != null ? t.lastDone : 0;
  const nextDue = start + interval;
  const remaining = nextDue - state.totalHours;
  const progress = Math.min(1, Math.max(0, (state.totalHours - start) / interval));
  let status = 'ok';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= interval * SOON_RATIO) status = 'soon';
  return { task, t, interval, start, nextDue, remaining, progress, status };
}

function fmtHours(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' h';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function estDate(remaining) {
  if (state.avgPerDay <= 0 || remaining <= 0) return null;
  const d = new Date(Date.now() + (remaining / state.avgPerDay) * 86400000);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── Rendu ───────────────────────────────── */

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = state.theme === 'dark' ? '☀️ Thème clair' : '🌙 Thème sombre';
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.sb-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('view-entretien').classList.toggle('active', view === 'entretien');
  document.getElementById('view-identite').classList.toggle('active', view === 'identite');
  const title = document.getElementById('pageTitle');
  const sub = document.getElementById('pageSubtitle');
  if (view === 'identite') {
    title.textContent = 'Ma P1S';
    sub.textContent = 'Fiche d\'identité de votre imprimante et état global de l\'entretien';
  } else {
    title.textContent = 'Entretien';
    sub.textContent = 'Suivi de la maintenance de votre Bambu Lab P1S, basé sur le total d\'heures d\'impression';
  }
  if (view === 'identite') renderIdentity();
}

function renderStats(items) {
  const overdue = items.filter(i => i.status === 'overdue');
  const soon = items.filter(i => i.status === 'soon');
  const next = items.slice().sort((a, b) => a.remaining - b.remaining)[0];
  const doneCount = Object.values(state.tasks).filter(t => t.lastDone != null).length;
  document.getElementById('stats').innerHTML = `
    <div class="stat-card card">
      <div class="label">Heures totales</div>
      <div class="value">${fmtHours(state.totalHours)}</div>
      <div class="sub">${doneCount} entretien(s) enregistré(s)</div>
    </div>
    <div class="stat-card card ${overdue.length ? 'alert' : ''}">
      <div class="label">En retard</div>
      <div class="value">${overdue.length}</div>
      <div class="sub">${overdue.length ? overdue.slice(0, 2).map(o => esc(o.task.title)).join(' · ') + (overdue.length > 2 ? '…' : '') : 'Aucun retard'}</div>
    </div>
    <div class="stat-card card ${soon.length ? 'warn' : ''}">
      <div class="label">À faire bientôt</div>
      <div class="value">${soon.length}</div>
      <div class="sub">${soon.length ? 'Dans les 25 % de l\'intervalle' : 'Rien à venir'}</div>
    </div>
    <div class="stat-card card">
      <div class="label">Prochaine échéance</div>
      <div class="value" style="font-size:15px">${next ? esc(next.task.title) : '—'}</div>
      <div class="sub">${next ? 'à ' + fmtHours(next.nextDue) + (next.remaining > 0 ? ' (dans ' + fmtHours(next.remaining) + ')' : ' (dépassée de ' + fmtHours(-next.remaining) + ')') : ''}</div>
    </div>`;
}

function renderCard(item) {
  const { task, t, interval, nextDue, remaining, progress, status } = item;
  const pct = Math.round(progress * 100);
  const lastDoneTxt = t.lastDone != null
    ? 'Dernier entretien : <strong>' + fmtHours(t.lastDone) + '</strong>' + (t.history.length ? ' (' + fmtDate(t.history[0].iso) + ')' : '')
    : 'Jamais effectué (échéance prévue à ' + fmtHours(interval) + ')';
  let dueTxt;
  if (remaining > 0) {
    const est = estDate(remaining);
    dueTxt = 'Échéance : <strong>' + fmtHours(nextDue) + '</strong> — reste <strong>' + fmtHours(remaining) + '</strong>' + (est ? ' <span class="soon-text">≈ le ' + est + '</span>' : '');
  } else {
    dueTxt = '<span class="overdue-text">En retard de ' + fmtHours(-remaining) + '</span> — échéance : <strong>' + fmtHours(nextDue) + '</strong>';
  }
  const linksHtml = (task.links || []).map(l =>
    '<a class="link-chip ' + (l.type === 'yt' ? 'yt' : '') + '" href="' + l.url + '" target="_blank" rel="noopener">' +
    (l.type === 'yt' ? '▶️' : '📘') + ' ' + esc(l.label) + '</a>').join('');
  const historyHtml = t.history.length
    ? '<div class="history">Historique (récent → ancien) :<ul>' +
      t.history.slice(0, 5).map(h => '<li>' + fmtHours(h.h) + ' — ' + fmtDate(h.iso) + '</li>').join('') +
      (t.history.length > 5 ? '<li>… ' + (t.history.length - 5) + ' autre(s)</li>' : '') +
      '</ul></div>'
    : '';
  const overrideNote = t.intervalOverride != null
    ? ' <button class="btn" data-action="reset-interval" data-id="' + task.id + '" title="Revenir à l\'intervalle suggéré">↺ défaut (' + task.interval + ' h)</button>'
    : '';

  return `
  <article class="task-card card ${status}" data-id="${task.id}">
    <div class="task-head">
      <div class="task-title">${esc(task.title)}</div>
      <span class="badge ${status}">${STATUS_LABEL[status]}</span>
    </div>
    <p class="task-desc">${esc(task.desc)}</p>
    <p class="task-note">${esc(task.note)}</p>
    <div class="progress-track" title="${pct} % de l'intervalle écoulé">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="task-meta">
      <span>${lastDoneTxt}</span>
      <span>${dueTxt}</span>
      <span>Intervalle suivi : <strong>${fmtHours(interval)}</strong> · progression ${pct} %</span>
    </div>
    <div class="task-links">${linksHtml}</div>
    <div class="task-actions">
      <button class="btn primary" data-action="done-now" data-id="${task.id}">✓ Fait maintenant</button>
      <input class="mini-input" type="number" min="0" step="1" placeholder="h" data-custom-hour="${task.id}" aria-label="Heures au moment de l'entretien">
      <button class="btn" data-action="done-custom" data-id="${task.id}">Fait à…</button>
    </div>
    <div class="interval-row">
      <span>Intervalle :</span>
      <input class="mini-input" type="number" min="1" step="1" value="${interval}" data-action="set-interval" data-id="${task.id}" aria-label="Intervalle en heures">
      <span>h</span>
      ${overrideNote}
      <button class="btn" data-action="reset-task" data-id="${task.id}" title="Effacer l'historique de cette tâche">Effacer l'historique</button>
    </div>
    ${historyHtml}
  </article>`;
}

function renderTasks() {
  let items = TASKS.map(computeTask);
  if (filter !== 'all') items = items.filter(i => i.status === filter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => (i.task.title + ' ' + i.task.desc + ' ' + i.task.note).toLowerCase().includes(q));
  }
  if (sortMode === 'due') items.sort((a, b) => a.remaining - b.remaining);
  else if (sortMode === 'overdue') items.sort((a, b) => ((a.status === 'overdue' ? 0 : 1) - (b.status === 'overdue' ? 0 : 1)) || a.remaining - b.remaining);
  else if (sortMode === 'interval') items.sort((a, b) => a.interval - b.interval);
  else if (sortMode === 'title') items.sort((a, b) => a.task.title.localeCompare(b.task.title, 'fr'));

  const container = document.getElementById('taskSections');
  const sections = THEME_ORDER.map(theme => {
    const themeItems = items.filter(i => i.task.theme === theme);
    if (!themeItems.length) return '';
    const th = THEMES[theme];
    return `
    <section class="theme-section" data-theme-section="${theme}">
      <div class="theme-head">
        <span class="theme-icon">${th.icon}</span>
        <h2>${th.label}</h2>
        <span class="theme-count">${themeItems.length}</span>
      </div>
      <div class="task-grid">${themeItems.map(renderCard).join('')}</div>
    </section>`;
  }).join('');

  container.innerHTML = sections || '<div class="empty">Aucune tâche ne correspond à ce filtre.</div>';
}

function renderIdentity() {
  const p = state.printer;
  document.getElementById('idSurname').textContent = p.surname || 'Ma P1S';
  document.getElementById('idModel').textContent = p.model || 'Bambu Lab P1S';
  document.getElementById('editIdentityBtn').textContent = identityEditing ? '💾 Enregistrer' : '✏️ Modifier';

  const grid = document.getElementById('identityGrid');
  grid.innerHTML = IDENTITY_FIELDS.map(f => {
    const val = p[f.key] || '';
    const display = val || '<span class="id-value empty">Non renseigné</span>';
    if (identityEditing) {
      const input = f.type === 'textarea'
        ? '<textarea data-id-field="' + f.key + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>'
        : '<input type="' + f.type + '" data-id-field="' + f.key + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '">';
      return '<div class="id-field' + (f.wide ? ' wide' : '') + '"><label>' + esc(f.label) + '</label>' + input + '</div>';
    }
    return '<div class="id-field' + (f.wide ? ' wide' : '') + '"><label>' + esc(f.label) + '</label><div class="' + (val ? 'id-value' : 'id-value empty') + '">' + (val ? esc(val) : 'Non renseigné') + '</div></div>';
  }).join('');

  const items = TASKS.map(computeTask);
  const overdue = items.filter(i => i.status === 'overdue').length;
  const soon = items.filter(i => i.status === 'soon').length;
  const next = items.slice().sort((a, b) => a.remaining - b.remaining)[0];
  const doneCount = Object.values(state.tasks).filter(t => t.lastDone != null).length;
  document.getElementById('identityStats').innerHTML = `
    <div class="id-stat"><div class="label">Heures totales</div><div class="value">${fmtHours(state.totalHours)}</div><div class="sub">compteur d'impression</div></div>
    <div class="id-stat"><div class="label">Entretiens effectués</div><div class="value">${doneCount}</div><div class="sub">sur ${TASKS.length} tâches suivies</div></div>
    <div class="id-stat"><div class="label">En retard / bientôt</div><div class="value ${overdue ? 'alert' : ''}">${overdue} / ${soon}</div><div class="sub">tâches à traiter</div></div>
    <div class="id-stat"><div class="label">Prochaine échéance</div><div class="value" style="font-size:14px">${next ? esc(next.task.title) : '—'}</div><div class="sub">${next ? 'à ' + fmtHours(next.nextDue) + (next.remaining > 0 ? ' (dans ' + fmtHours(next.remaining) + ')' : ' (en retard de ' + fmtHours(-next.remaining) + ')') : ''}</div></div>`;
}

function renderAll() {
  document.getElementById('totalHours').value = state.totalHours;
  document.getElementById('avgPerDay').value = state.avgPerDay;
  applyTheme();
  renderStats(TASKS.map(computeTask));
  renderTasks();
  if (currentView === 'identite') renderIdentity();
}

/* ── Actions ─────────────────────────────── */

function markDone(id, hours) {
  const t = getTaskState(id);
  const h = Math.max(0, Math.round(Number(hours)));
  if (isNaN(h)) return;
  t.lastDone = h;
  t.history.unshift({ h, iso: new Date().toISOString() });
  if (t.history.length > 100) t.history.length = 100;
  saveState();
  renderAll();
}

document.body.addEventListener('click', (e) => {
  const nav = e.target.closest('.sb-nav-item');
  if (nav) { switchView(nav.dataset.view); return; }

  const stepBtn = e.target.closest('.step-btn');
  if (stepBtn) {
    state.totalHours = Math.max(0, Math.round(state.totalHours + Number(stepBtn.dataset.step)));
    saveState(); renderAll(); return;
  }

  const chip = e.target.closest('.chip');
  if (chip) {
    filter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderTasks(); return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'done-now') markDone(id, state.totalHours);
  else if (action === 'done-custom') {
    const input = document.querySelector('input[data-custom-hour="' + id + '"]');
    if (input && input.value !== '') markDone(id, Number(input.value));
    else if (input) input.focus();
  } else if (action === 'reset-interval') {
    getTaskState(id).intervalOverride = null;
    saveState(); renderAll();
  } else if (action === 'reset-task') {
    if (confirm('Effacer tout l\'historique de cette tâche ?')) {
      state.tasks[id] = { lastDone: null, intervalOverride: getTaskState(id).intervalOverride, history: [] };
      saveState(); renderAll();
    }
  }
});

document.body.addEventListener('change', (e) => {
  const target = e.target;
  if (target.id === 'totalHours') {
    const v = Number(target.value);
    state.totalHours = isNaN(v) || v < 0 ? 0 : Math.round(v);
    saveState(); renderAll();
  } else if (target.id === 'avgPerDay') {
    const v = Number(target.value);
    state.avgPerDay = isNaN(v) || v < 0 ? 0 : Math.min(24, v);
    saveState(); renderAll();
  } else if (target.id === 'sort') {
    sortMode = target.value;
    renderTasks();
  } else if (target.dataset && target.dataset.action === 'set-interval') {
    const id = target.dataset.id;
    const v = Number(target.value);
    if (!isNaN(v) && v > 0) {
      getTaskState(id).intervalOverride = Math.round(v);
      saveState(); renderAll();
    } else {
      target.value = effectiveInterval(TASKS.find(x => x.id === id));
    }
  } else if (target.dataset && target.dataset.idField) {
    state.printer[target.dataset.idField] = target.value;
    saveState();
    if (!identityEditing) renderIdentity();
  } else if (target.id === 'importFile') {
    const file = target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = parsed.state ? parsed.state : parsed;
        state.totalHours = Number(incoming.totalHours) || 0;
        state.avgPerDay = incoming.avgPerDay != null ? Number(incoming.avgPerDay) : 4;
        state.theme = incoming.theme === 'light' ? 'light' : 'dark';
        state.printer = Object.assign(defaultPrinter(), incoming.printer || {});
        state.tasks = incoming.tasks && typeof incoming.tasks === 'object' ? incoming.tasks : {};
        saveState(); renderAll();
        alert('Import réussi.');
      } catch (err) {
        alert('Fichier invalide : impossible de l\'importer.');
      }
      target.value = '';
    };
    reader.readAsText(file);
  }
});

document.getElementById('search').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderTasks();
});

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
});

document.getElementById('editIdentityBtn').addEventListener('click', () => {
  identityEditing = !identityEditing;
  if (!identityEditing) saveState();
  renderIdentity();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = { version: 2, app: 'p1s-maintenance-tracker', exportedAt: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'p1s-entretien-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (confirm('Réinitialiser toutes les données (fiche d\'identité, heures totales et historiques) ?')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    const fresh = defaultState();
    state.totalHours = fresh.totalHours;
    state.avgPerDay = fresh.avgPerDay;
    state.theme = fresh.theme;
    state.printer = fresh.printer;
    state.tasks = fresh.tasks;
    identityEditing = false;
    renderAll();
  }
});

renderAll();
