'use strict';

const STORAGE_KEY = 'p1s-maintenance-tracker-v1';

const CATEGORIES = {
  nettoyage: 'Nettoyage',
  lubrification: 'Lubrification',
  usure: "Pièce d'usure",
  controle: 'Contrôle',
};

// Intervalles suggérés en heures d'impression, issus du guide officiel Bambu Lab série P1
// (wiki.bambulab.com/en/p1/maintenance/p1p-maintenance) converti en heures :
// hypothèse ~8 h/jour => 1 mois ≈ 240 h, 3 mois ≈ 720 h ; 1 bobine ≈ 50 h d'impression.
const TASKS = [
  {
    id: 'plate-wipe',
    cat: 'nettoyage',
    title: 'Nettoyer le plateau à l\'alcool isopropylique (IPA)',
    desc: 'Essuyer la plaque PEI avec un chiffon microfibre et de l\'alcool isopropylique. Ne jamais toucher la surface avec les doigts (les huiles de peau réduisent l\'adhérence).',
    interval: 10,
    note: 'Avant chaque impression / tous les 1–2 jours (wiki : nettoyer régulièrement le plateau).',
  },
  {
    id: 'plate-wash',
    cat: 'nettoyage',
    title: 'Laver le plateau à l\'eau chaude + liquide vaisselle',
    desc: 'Lavage complet de la plaque texturée PEI à l\'eau chaude et au liquide vaisselle, rinçage abondant, séchage. Si l\'adhérence ne revient pas : frotter très légèrement au papier de verre grain 600.',
    interval: 50,
    note: 'Dès que l\'adhérence baisse et au moins toutes les semaines (≈ 50 h à 7–8 h/jour).',
  },
  {
    id: 'chamber',
    cat: 'nettoyage',
    title: "Nettoyer l'intérieur de la chambre",
    desc: 'Aspirer les débris de filament et la poussière au fond de la chambre, essuyer les parois, vider et dégager la goulotte d\'évacuation des déchets (poop chute).',
    interval: 50,
    note: 'Toutes les semaines en usage régulier (≈ 50 h).',
  },
  {
    id: 'carbon-rods',
    cat: 'nettoyage',
    title: "Nettoyer les tiges carbone de l'axe X à l'alcool isopropylique",
    desc: 'Appliquer généreusement de l\'IPA sur un chiffon microfibre et essuyer toute la longueur des deux tiges carbone, puis déplacer la tête d\'impression sur toute la course pour nettoyer l\'intérieur des paliers.',
    interval: 240,
    note: 'Tous les mois (≈ 240 h), ou toutes les ~5 bobines d\'ABS/ASA (~250 h). ATTENTION : jamais de graisse ni d\'huile sur les tiges carbone (usure prématurée).',
  },
  {
    id: 'fans',
    cat: 'nettoyage',
    title: 'Nettoyer les ventilateurs (auxiliaire + hotend)',
    desc: 'Imprimante éteinte, souffler à l\'air comprimé sur les pales du ventilateur auxiliaire et du ventilateur de hotend en maintenant les pales immobiles pour retirer poussière et débris.',
    interval: 50,
    note: 'Vérification toutes les semaines (wiki : check hebdomadaire X1/P1).',
  },
  {
    id: 'camera',
    cat: 'nettoyage',
    title: "Nettoyer l'objectif de la caméra de chambre (et le lidar)",
    desc: 'Essuyer délicatement l\'objectif de la caméra avec un chiffon microfibre et un peu d\'IPA (coton-tige pour les bords). Idem pour la lentille lidar si l\'image est floue ou en cas d\'erreur lidar.',
    interval: 100,
    note: 'Dès que l\'image est floue ; toutes les semaines si vous imprimez de l\'ABS (≈ 50 h).',
  },
  {
    id: 'extruder',
    cat: 'nettoyage',
    title: "Nettoyer l'extrudeur et graisser ses engrenages",
    desc: 'Démonter l\'extrudeur, retirer la poussière de filament sur l\'engrenage jaune (brosse + air comprimé) et appliquer une très fine couche de graisse sur les engrenages avant remontage.',
    interval: 250,
    note: 'Dès que de la poussière est visible sur l\'engrenage jaune, soit environ toutes les 5 bobines (~250 h).',
  },
  {
    id: 'nozzle-deep',
    cat: 'nettoyage',
    title: 'Nettoyage en profondeur de la buse (chauffe + cold pull)',
    desc: 'Retirer le capot avant et le chausson silicone, chauffer la buse à 200 °C, essuyer la surface avec un chiffon/tissu ou des pinces (gants résistants à la chaleur), puis faire un cold pull pour vider les résidus internes de la buse.',
    interval: 250,
    note: 'Tous les mois / ~5 bobines (~250 h) ; plus souvent avec des filaments abrasifs (PA+CF, PA+GF) ou en cas de sous-extrusion.',
  },
  {
    id: 'yz-rods',
    cat: 'lubrification',
    title: 'Huile anti-rouille sur les tiges acier Y et Z',
    desc: 'Essuyer les tiges linéaires en acier des axes Y et Z avec un chiffon + IPA, puis appliquer une fine couche uniforme d\'huile anti-rouille (ex. Super Lube 52004) pour protéger de la rouille. Ne pas mettre d\'IPA dans les roulements.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h à 8 h/jour), en même temps que le graissage des vis Z.',
  },
  {
    id: 'z-screws',
    cat: 'lubrification',
    title: "Graisser les 3 vis trapézoïdales de l'axe Z",
    desc: 'Nettoyer les trois vis trapézoïdales de l\'axe Z, appliquer une fine couche de graisse lubrifiante (Super Lube 92003, Lucas Oil 10533 ou graisse Bambu), puis monter/descendre le plateau plusieurs fois pour répartir. Essuyer l\'excès.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h à 8 h/jour) — guide officiel Bambu.',
  },
  {
    id: 'idlers',
    cat: 'lubrification',
    title: 'Lubrifier les poulies de renvoi (idlers) si grincement',
    desc: 'Uniquement en cas de bruit de grincement : déposer une petite goutte d\'huile lubrifiante (Super Lube 52004) entre la bride de la poulie et son support plastique, dessus et dessous. Ne jamais lubrifier les courroies.',
    interval: 720,
    note: 'Si nécessaire uniquement (bruit anormal) ; contrôle à 3 mois.',
  },
  {
    id: 'cutter',
    cat: 'usure',
    title: 'Changer la lame du coupe-filament (cutter)',
    desc: 'Remplacer la petite lame située dans l\'extrudeur. Une lame émoussée coupe mal le filament et provoque des échecs de rétraction/déchargement AMS ("failed to cut the filament").',
    interval: 500,
    note: 'Vérifier toutes les 3–5 bobines ; remplacer toutes les 10–15 bobines (~500–750 h, Bambu observe ~5 000–7 000 coupes) ; après 1–2 bobines si filament abrasif.',
  },
  {
    id: 'wiper',
    cat: 'usure',
    title: "Vérifier / remplacer l'essuie-buse (nozzle wiper)",
    desc: 'Vérifier avant chaque impression que le wiper est propre, sans débris de filament, côté PTFE intact et bien à plat ; le remplacer s\'il est déchiré, déformé, durci ou s\'il n\'essuie plus proprement.',
    interval: 100,
    note: 'Contrôle visuel à chaque impression ; inspection approfondie toutes les ~100 h.',
  },
  {
    id: 'ptfe',
    cat: 'usure',
    title: 'Inspecter / remplacer les tubes PTFE (extrudeur + AMS)',
    desc: 'Contrôler l\'absence de pincements, coupures, débris ou usure interne. Remplacer si le tube ne tient plus dans le raccord, si le filament ne passe plus, ou si le raccord est endommagé.',
    interval: 480,
    note: 'Tube extrudeur : ~10 bobines standard, ~5 bobines abrasif. Tubes AMS : tous les 2 mois (~480 h), tous les 1 mois si fibre de carbone.',
  },
  {
    id: 'carbon-filter',
    cat: 'usure',
    title: 'Changer le filtre à charbon actif de la P1S',
    desc: 'Remplacer le filtre à charbon actif situé dans le capot supérieur. Un filtre saturé ne filtre plus les particules fines et odeurs (surtout ABS/ASA).',
    interval: 720,
    note: 'Tous les 3 mois à ~8 h/jour (~720 h) ; tous les 1–2 mois avec ABS/ASA ou odeurs marquées.',
  },
  {
    id: 'sock',
    cat: 'usure',
    title: 'Remplacer le chausson silicone du hotend si usé',
    desc: 'Remplacer le chausson silicone autour du hotend s\'il est déchiré, déformé, ou s\'il ne tient plus en place (buse à température ambiante pour le retirer).',
    interval: 1000,
    note: 'Dès les signes d\'usure ; contrôle systématique vers 1 000 h.',
  },
  {
    id: 'plate',
    cat: 'usure',
    title: "Changer le plateau d'impression (plaque PEI texturée)",
    desc: 'Remplacer la plaque PEI texturée lorsque l\'adhérence reste insuffisante malgré les lavages et le ponçage léger (grain 600), ou si le revêtement est rayé/décollé. Pensez à retourner la plaque pour utiliser l\'autre face entre-temps.',
    interval: 2000,
    note: 'Durée de vie constatée : environ 1 000–2 500 h selon l\'usage (consommable officiel Bambu).',
  },
  {
    id: 'belts',
    cat: 'controle',
    title: 'Vérifier la tension des courroies',
    desc: 'Contrôler la tension des courroies (vis de tension à l\'arrière de la tête) : une courroie détendue provoque des décalages de couches et du ghosting. Re-tendre si l\'imprimante signale une courroie lâche ou si des défauts apparaissent.',
    interval: 720,
    note: 'Tous les 3 mois (~720 h) et à chaque alerte de l\'imprimante.',
  },
  {
    id: 'nozzle-wear',
    cat: 'controle',
    title: "Inspecter l'usure de la buse (filaments abrasifs CF/GF)",
    desc: 'Avec des filaments chargés (carbone/verre), inspecter régulièrement l\'alésage de la buse à la lampe : un orifice élargi = buse usée. Remplacer la buse/le hotend si l\'extrusion reste instable après nettoyage et calibration.',
    interval: 500,
    note: 'Contrôle toutes les ~500 h, plus souvent si impression intensive de matériaux abrasifs.',
  },
  {
    id: 'screws',
    cat: 'controle',
    title: 'Vérifier le serrage des vis accessibles',
    desc: 'Contrôle visuel rapide du serrage des vis du châssis et de la tête (les vibrations peuvent les desserrer avec le temps).',
    interval: 500,
    note: 'Contrôle rapide toutes les ~500 h.',
  },
];

const SOON_RATIO = 0.25;

const state = loadState();
let filter = 'all';
let sortMode = 'due';
let searchQuery = '';

function defaultState() {
  return { totalHours: 0, avgPerDay: 4, tasks: {} };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      totalHours: Number(parsed.totalHours) || 0,
      avgPerDay: parsed.avgPerDay != null ? Number(parsed.avgPerDay) : 4,
      tasks: parsed.tasks && typeof parsed.tasks === 'object' ? parsed.tasks : {},
    };
  } catch (e) {
    return defaultState();
  }
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
  const days = remaining / state.avgPerDay;
  const d = new Date(Date.now() + days * 86400000);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABEL = { ok: 'OK', soon: 'Bientôt', overdue: 'En retard' };

function renderStats(items) {
  const overdue = items.filter(i => i.status === 'overdue');
  const soon = items.filter(i => i.status === 'soon');
  const next = items.slice().sort((a, b) => a.remaining - b.remaining)[0];
  const el = document.getElementById('stats');
  el.innerHTML = `
    <div class="stat-card">
      <div class="label">Heures totales</div>
      <div class="value">${fmtHours(state.totalHours)}</div>
      <div class="sub">${state.tasks && Object.keys(state.tasks).length ? Object.values(state.tasks).filter(t => t.lastDone != null).length + ' entretien(s) enregistré(s)' : 'Aucun entretien enregistré'}</div>
    </div>
    <div class="stat-card ${overdue.length ? 'alert' : ''}">
      <div class="label">En retard</div>
      <div class="value">${overdue.length}</div>
      <div class="sub">${overdue.length ? overdue.slice(0, 2).map(o => o.task.title).join(' · ') + (overdue.length > 2 ? '…' : '') : 'Aucun retard'}</div>
    </div>
    <div class="stat-card ${soon.length ? 'warn' : ''}">
      <div class="label">À faire bientôt</div>
      <div class="value">${soon.length}</div>
      <div class="sub">${soon.length ? 'Dans les 25 % de l\'intervalle' : 'Rien à venir'}</div>
    </div>
    <div class="stat-card">
      <div class="label">Prochaine échéance</div>
      <div class="value" style="font-size:16px">${next ? next.task.title : '—'}</div>
      <div class="sub">${next ? 'à ' + fmtHours(next.nextDue) + (next.remaining > 0 ? ' (dans ' + fmtHours(next.remaining) + ')' : ' (dépassée de ' + fmtHours(-next.remaining) + ')') : ''}</div>
    </div>`;
}

function renderTasks() {
  let items = TASKS.map(computeTask);
  if (filter !== 'all') items = items.filter(i => i.status === filter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => (i.task.title + ' ' + i.task.desc + ' ' + i.task.note).toLowerCase().includes(q));
  }
  if (sortMode === 'due') items.sort((a, b) => a.remaining - b.remaining);
  else if (sortMode === 'overdue') items.sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0) || a.remaining - b.remaining);
  else if (sortMode === 'interval') items.sort((a, b) => a.interval - b.interval);
  else if (sortMode === 'title') items.sort((a, b) => a.task.title.localeCompare(b.task.title, 'fr'));

  const list = document.getElementById('taskList');
  if (!items.length) {
    list.innerHTML = '<div class="empty">Aucune tâche ne correspond à ce filtre.</div>';
    return;
  }

  list.innerHTML = items.map(renderCard).join('');
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
    dueTxt = 'Prochaine échéance : <strong>' + fmtHours(nextDue) + '</strong> — reste <strong>' + fmtHours(remaining) + '</strong>' + (est ? ' <span class="soon-text">≈ le ' + est + '</span>' : '');
  } else {
    dueTxt = '<span class="overdue-text">En retard de ' + fmtHours(-remaining) + '</span> — échéance : <strong>' + fmtHours(nextDue) + '</strong>';
  }
  const historyHtml = t.history.length
    ? '<div class="history">Historique (récent → ancien) :<ul>' +
      t.history.slice(0, 5).map(h => '<li>' + fmtHours(h.h) + ' — ' + fmtDate(h.iso) + '</li>').join('') +
      (t.history.length > 5 ? '<li>… ' + (t.history.length - 5) + ' autre(s)</li>' : '') +
      '</ul></div>'
    : '';
  const overrideNote = t.intervalOverride != null ? ' <button class="mini-btn" data-action="reset-interval" data-id="' + task.id + '" title="Revenir à l\'intervalle suggéré">↺ défaut (' + task.interval + ' h)</button>' : '';

  return `
  <article class="task-card ${status}" data-id="${task.id}">
    <div class="task-head">
      <div>
        <div class="cat">${CATEGORIES[task.cat]}</div>
        <div class="task-title">${task.title}</div>
      </div>
      <span class="badge ${status}">${STATUS_LABEL[status]}</span>
    </div>
    <p class="task-desc">${task.desc}</p>
    <p class="task-note">${task.note}</p>
    <div class="progress-track" title="${pct} % de l'intervalle écoulé">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="task-meta">
      <span>${lastDoneTxt}</span>
      <span>${dueTxt}</span>
      <span>Intervalle suivi : <strong>${fmtHours(interval)}</strong> · progression ${pct} %</span>
    </div>
    <div class="task-actions">
      <button class="done-btn" data-action="done-now" data-id="${task.id}">✓ Fait maintenant</button>
      <input class="mini-input" type="number" min="0" step="1" placeholder="h" data-custom-hour="${task.id}" aria-label="Heures au moment de l'entretien">
      <button class="mini-btn" data-action="done-custom" data-id="${task.id}">Fait à…</button>
    </div>
    <div class="interval-row">
      <span>Intervalle :</span>
      <input class="mini-input" type="number" min="1" step="1" value="${interval}" data-action="set-interval" data-id="${task.id}" aria-label="Intervalle en heures">
      <span>h</span>
      ${overrideNote}
      <button class="mini-btn" data-action="reset-task" data-id="${task.id}" title="Effacer l'historique de cette tâche">Effacer l'historique</button>
    </div>
    ${historyHtml}
  </article>`;
}

function renderAll() {
  document.getElementById('totalHours').value = state.totalHours;
  document.getElementById('avgPerDay').value = state.avgPerDay;
  renderStats(TASKS.map(computeTask));
  renderTasks();
}

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

document.getElementById('taskList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'done-now') markDone(id, state.totalHours);
  else if (action === 'done-custom') {
    const input = document.querySelector('input[data-custom-hour="' + id + '"]');
    if (input && input.value !== '') markDone(id, Number(input.value));
    else input && input.focus();
  } else if (action === 'reset-interval') {
    const t = getTaskState(id);
    t.intervalOverride = null;
    saveState();
    renderAll();
  } else if (action === 'reset-task') {
    if (confirm('Effacer tout l\'historique de cette tâche ?')) {
      state.tasks[id] = { lastDone: null, intervalOverride: getTaskState(id).intervalOverride, history: [] };
      saveState();
      renderAll();
    }
  }
});

document.getElementById('taskList').addEventListener('change', (e) => {
  const input = e.target.closest('input[data-action="set-interval"]');
  if (!input) return;
  const id = input.dataset.id;
  const v = Number(input.value);
  const t = getTaskState(id);
  if (!isNaN(v) && v > 0) {
    t.intervalOverride = Math.round(v);
    saveState();
    renderAll();
  } else {
    input.value = effectiveInterval(TASKS.find(x => x.id === id));
  }
});

document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const step = Number(btn.dataset.step);
    state.totalHours = Math.max(0, Math.round(state.totalHours + step));
    saveState();
    renderAll();
  });
});

document.getElementById('totalHours').addEventListener('change', (e) => {
  const v = Number(e.target.value);
  state.totalHours = isNaN(v) || v < 0 ? 0 : Math.round(v);
  saveState();
  renderAll();
});

document.getElementById('avgPerDay').addEventListener('change', (e) => {
  const v = Number(e.target.value);
  state.avgPerDay = isNaN(v) || v < 0 ? 0 : Math.min(24, v);
  saveState();
  renderAll();
});

document.getElementById('filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  filter = chip.dataset.filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
  renderTasks();
});

document.getElementById('sort').addEventListener('change', (e) => {
  sortMode = e.target.value;
  renderTasks();
});

document.getElementById('search').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderTasks();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = { version: 1, app: 'p1s-maintenance-tracker', exportedAt: new Date().toISOString(), state };
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

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.state ? parsed.state : parsed;
      state.totalHours = Number(incoming.totalHours) || 0;
      state.avgPerDay = incoming.avgPerDay != null ? Number(incoming.avgPerDay) : 4;
      state.tasks = incoming.tasks && typeof incoming.tasks === 'object' ? incoming.tasks : {};
      saveState();
      renderAll();
      alert('Import réussi.');
    } catch (err) {
      alert('Fichier invalide : impossible de l\'importer.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (confirm('Réinitialiser toutes les données (heures totales et historiques) ?')) {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = defaultState();
    state.totalHours = fresh.totalHours;
    state.avgPerDay = fresh.avgPerDay;
    state.tasks = fresh.tasks;
    renderAll();
  }
});

renderAll();
