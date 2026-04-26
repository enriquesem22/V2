// tracking.js — Watchlist de pisos en seguimiento
// v2.13: tracking refactor, zonas por marketKey, Idealista/Solvia mezclados por zona,
// botón Usar integrado, filtros rápidos, migración local, duplicados y días en mercado.

var TRACKING_VERSION = '2.13';
var TRACKING_SCHEMA_VERSION = 3;
var WATCHLIST_KEY = 'return_watchlist_v1';
var WATCHLIST_SCHEMA_KEY = 'return_watchlist_schema_v1';
var SELECTED_TRACKING_KEY = 'return_selected_tracking_property';

var WATCHLIST_SOURCES = {
  macarena: { label: 'Macarena', file: 'data/watchlist.json', marketKey: 'macarena', portal: 'Idealista' },
  manresa: { label: 'Manresa', file: 'data/watchlist-manresa.json', marketKey: 'manresa', portal: 'Idealista' },
  sanjuan: { label: 'San Juan de Aznalfarache', file: 'data/watchlist-san-juan.json', marketKey: 'sanjuan', portal: 'Idealista' },
  solvia: { label: 'Solvia - todas las zonas', file: 'data/watchlist-solvia.json', marketKey: null, portal: 'Solvia' }
};

var TRACKING_DEFAULT_FILTERS = {
  priorityAB: false,
  cleanOnly: false,
  fastOnly: false,
  portal: 'all',
  search: ''
};

window._trackingArea = window._trackingArea || 'all';
window._trackingFilters = window._trackingFilters || loadTrackingFilters();

function trackingTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

function escapeTracking(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function slugTracking(str) {
  return String(str || '')
    .toLowerCase()
    .normalize ? String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') :
    String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function moneyTracking(n) {
  return isFinite(n) && n !== null
    ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €'
    : '—';
}

function formatDateTracking(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

function daysBetweenTracking(a, b) {
  if (!a || !b) return null;
  var da = new Date(String(a).slice(0, 10) + 'T00:00:00');
  var db = new Date(String(b).slice(0, 10) + 'T00:00:00');
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.max(0, Math.round((db - da) / 86400000));
}

function loadTrackingFilters() {
  try {
    return Object.assign({}, TRACKING_DEFAULT_FILTERS, JSON.parse(localStorage.getItem('return_tracking_filters_v1') || '{}'));
  } catch (e) {
    return Object.assign({}, TRACKING_DEFAULT_FILTERS);
  }
}

function saveTrackingFilters() {
  try {
    localStorage.setItem('return_tracking_filters_v1', JSON.stringify(window._trackingFilters || TRACKING_DEFAULT_FILTERS));
  } catch (e) {}
}

function getWatchlistRaw() {
  try {
    var raw = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.properties)) return raw.properties;
    return [];
  } catch (e) {
    return [];
  }
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items || []));
  localStorage.setItem(WATCHLIST_SCHEMA_KEY, String(TRACKING_SCHEMA_VERSION));
}

function sourceKeyFromItem(item) {
  if (!item) return null;
  if (item.sourceKey) return item.sourceKey;
  if (String(item.portal || item.source || '').toLowerCase().indexOf('solvia') >= 0) return 'solvia';
  if (item.marketKey === 'macarena') return 'macarena';
  if (item.marketKey === 'manresa') return 'manresa';
  if (item.marketKey === 'sanjuan') return 'sanjuan';
  return null;
}

function portalLabel(item) {
  if (!item) return '—';
  return item.portal || (String(item.source || '').toLowerCase() === 'solvia' ? 'Solvia' : 'Idealista');
}

function areaLabelFromKey(key) {
  if (key === 'all') return 'Todos';
  if (key === 'macarena') return 'Macarena';
  if (key === 'manresa') return 'Manresa';
  if (key === 'sanjuan') return 'San Juan';
  return 'Otros';
}

function inferMarketKey(item) {
  if (item && item.marketKey) return item.marketKey;
  var txt = [
    item && item.city,
    item && item.district,
    item && item.neighborhood,
    item && item.sourceArea,
    item && item.title,
    item && item.street,
    item && item.address,
    item && item.url
  ].filter(Boolean).join(' ').toLowerCase();

  if (txt.indexOf('manresa') >= 0) return 'manresa';
  if (txt.indexOf('san juan') >= 0 || txt.indexOf('aznalfarache') >= 0) return 'sanjuan';
  if (
    txt.indexOf('macarena') >= 0 ||
    txt.indexOf('villegas') >= 0 ||
    txt.indexOf('doctor fedriani') >= 0 ||
    txt.indexOf('parlamento') >= 0 ||
    txt.indexOf('torneo') >= 0 ||
    txt.indexOf('hermano pablo') >= 0 ||
    txt.indexOf('constantina') >= 0 ||
    txt.indexOf('begonia') >= 0 ||
    txt.indexOf('jose bermejo') >= 0 ||
    txt.indexOf('los romeros') >= 0 ||
    txt.indexOf('blasco ibanez') >= 0
  ) return 'macarena';

  return 'otros';
}

function normalizeStreet(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/calle|c\/|avenida|av\.?|plaza|paseo|carretera/g, '')
    .normalize ? String(str || '').toLowerCase().replace(/calle|c\/|avenida|av\.?|plaza|paseo|carretera/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') :
    String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function canonicalKeyFor(item) {
  if (item && item.canonicalKey) return item.canonicalKey;
  var market = inferMarketKey(item);
  var street = normalizeStreet((item && (item.street || item.address || item.title)) || '');
  var surface = safeNumber(item && item.surfaceM2);
  var surfaceBucket = surface ? Math.round(surface / 5) * 5 : 'x';
  return [market, street || 'sin_calle', surfaceBucket].join('_');
}

function priceM2Tracking(item) {
  var pm2 = safeNumber(item && item.priceM2);
  if (pm2) return Math.round(pm2);
  var price = safeNumber(item && item.price);
  var sup = safeNumber(item && item.surfaceM2);
  if (price && sup) return Math.round(price / sup);
  return null;
}

function firstSeenFromItem(item) {
  if (item && item.firstSeenAt) return String(item.firstSeenAt).slice(0, 10);
  if (item && item.createdAt) return String(item.createdAt).slice(0, 10);
  if (item && item.checkedAt) return String(item.checkedAt).slice(0, 10);
  if (item && item.snapshots && item.snapshots.length) {
    var dates = item.snapshots.map(function (s) { return s && s.checkedAt; }).filter(Boolean).sort();
    if (dates.length) return String(dates[0]).slice(0, 10);
  }
  return trackingTodayISO();
}

function lastSeenFromItem(item) {
  if (item && item.lastSeenAt) return String(item.lastSeenAt).slice(0, 10);
  if (item && item.checkedAt) return String(item.checkedAt).slice(0, 10);
  if (item && item.updatedAt) return String(item.updatedAt).slice(0, 10);
  if (item && item.snapshots && item.snapshots.length) {
    var dates = item.snapshots.map(function (s) { return s && s.checkedAt; }).filter(Boolean).sort();
    if (dates.length) return String(dates[dates.length - 1]).slice(0, 10);
  }
  return trackingTodayISO();
}

function normalizeItem(item, sourceKey, meta) {
  var out = Object.assign({}, item || {});
  var src = WATCHLIST_SOURCES[sourceKey || sourceKeyFromItem(out)] || {};
  out.portal = out.portal || src.portal || (String(out.source || '').toLowerCase() === 'solvia' ? 'Solvia' : 'Idealista');
  out.source = out.source || (String(out.portal).toLowerCase() === 'solvia' ? 'solvia' : 'idealista');
  out.sourceKey = out.sourceKey || sourceKey || sourceKeyFromItem(out) || '';
  out.sourceArea = out.sourceArea || (meta && meta.area) || '';
  out.marketKey = out.marketKey || src.marketKey || inferMarketKey(out);
  out.street = out.street || out.address || out.title || '';
  out.price = safeNumber(out.price);
  out.surfaceM2 = safeNumber(out.surfaceM2);
  out.rooms = safeNumber(out.rooms);
  out.floor = out.floor === null || out.floor === undefined || out.floor === '' ? null : safeNumber(out.floor);
  out.elevator = out.elevator === true ? true : out.elevator === false ? false : null;
  out.priceM2 = priceM2Tracking(out);
  out.priority = String(out.priority || 'C').toUpperCase().slice(0, 1);
  out.riskLevel = out.riskLevel || 'medio';
  out.status = out.status || 'por_verificar';
  out.occupancyStatus = out.occupancyStatus || 'por_verificar';
  out.checkedAt = formatDateTracking(out.checkedAt || out.updatedAt || trackingTodayISO());
  out.firstSeenAt = firstSeenFromItem(out);
  out.lastSeenAt = lastSeenFromItem(out);
  out.daysOnMarket = daysBetweenTracking(out.firstSeenAt, trackingTodayISO());
  out.canonicalKey = canonicalKeyFor(out);
  out.id = out.id || [out.source, out.marketKey, slugTracking(out.street || out.title), out.surfaceM2 || 'x', out.price || 'x'].join('_');
  out.snapshots = Array.isArray(out.snapshots) ? out.snapshots : [];
  return out;
}

function getNormalizedWatchlist() {
  return getWatchlistRaw().map(function (item) { return normalizeItem(item); });
}

function migrateWatchlistIfNeeded() {
  var items = getWatchlistRaw();
  var savedVersion = Number(localStorage.getItem(WATCHLIST_SCHEMA_KEY) || '0');
  var needsMigration = savedVersion !== TRACKING_SCHEMA_VERSION || items.some(function (p) {
    return !p.marketKey || !p.canonicalKey || !p.firstSeenAt || !p.portal;
  });
  if (!needsMigration) return getNormalizedWatchlist();
  var normalized = items.map(function (item) { return normalizeItem(item); });
  saveWatchlist(normalized);
  return normalized;
}

function mergeWatchlist(baseItems, localItems, sourceKey, meta) {
  var map = new Map();

  (baseItems || []).forEach(function (item) {
    var n = normalizeItem(item, sourceKey, meta);
    map.set(n.id, n);
  });

  (localItems || []).forEach(function (local) {
    var n = normalizeItem(local);
    var base = map.get(n.id) || {};
    var merged = Object.assign({}, base, n);
    merged.snapshots = (n.snapshots && n.snapshots.length) ? n.snapshots : (base.snapshots || []);
    merged.firstSeenAt = base.firstSeenAt && n.firstSeenAt
      ? (base.firstSeenAt < n.firstSeenAt ? base.firstSeenAt : n.firstSeenAt)
      : (n.firstSeenAt || base.firstSeenAt || trackingTodayISO());
    merged.lastSeenAt = trackingTodayISO();
    merged.daysOnMarket = daysBetweenTracking(merged.firstSeenAt, trackingTodayISO());
    map.set(n.id, normalizeItem(merged));
  });

  return Array.from(map.values());
}

async function loadBaseWatchlist(sourceKey) {
  var src = WATCHLIST_SOURCES[sourceKey] || WATCHLIST_SOURCES.macarena;
  var r = await fetch(src.file + '?v=' + TRACKING_VERSION + '.' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo cargar ' + src.file);
  var data = await r.json();
  return Array.isArray(data) ? { metadata: { area: src.label }, properties: data } : data;
}

function setStatus(message, color) {
  var status = document.getElementById('tracking-status');
  if (status) {
    status.textContent = message || '';
    status.style.color = color || '#aaa';
  }
}

window.importBaseWatchlist = async function (sourceKey) {
  var select = document.getElementById('tracking-source-select');
  var key = sourceKey || (select && select.value) || 'macarena';
  try {
    setStatus('Cargando base...', '#d97706');
    var base = await loadBaseWatchlist(key);
    var merged = mergeWatchlist(base.properties || [], getNormalizedWatchlist(), key, base.metadata || {});
    saveWatchlist(merged);
    window._trackingArea = (WATCHLIST_SOURCES[key] && WATCHLIST_SOURCES[key].marketKey) || window._trackingArea || 'all';
    setStatus('✓ Importado: ' + ((base.metadata && base.metadata.area) || WATCHLIST_SOURCES[key].label) + ' · ' + merged.length + ' pisos totales', '#16a34a');
    renderTracking(document.getElementById('tp-content'));
  } catch (e) {
    setStatus('Error: ' + e.message, '#dc2626');
  }
};

window.importAllWatchlists = async function () {
  try {
    setStatus('Importando Idealista + Solvia...', '#d97706');
    var merged = [];
    var keys = Object.keys(WATCHLIST_SOURCES);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var base = await loadBaseWatchlist(key);
      merged = mergeWatchlist(base.properties || [], merged, key, base.metadata || {});
    }
    saveWatchlist(merged);
    window._trackingArea = 'all';
    setStatus('✓ Base reiniciada/importada · ' + merged.length + ' pisos totales', '#16a34a');
    renderTracking(document.getElementById('tp-content'));
  } catch (e) {
    setStatus('Error: ' + e.message, '#dc2626');
  }
};

window.resetTrackingBase = function () {
  if (confirm('¿Reiniciar tracking local e importar de nuevo Idealista + Solvia? Se perderán descartes o notas locales no exportadas.')) {
    localStorage.removeItem(WATCHLIST_KEY);
    localStorage.removeItem(WATCHLIST_SCHEMA_KEY);
    window.importAllWatchlists();
  }
};

function updateItemById(id, updater) {
  var items = getNormalizedWatchlist();
  var found = false;
  var updated = items.map(function (item) {
    if (item.id !== id) return item;
    found = true;
    var clone = Object.assign({}, item);
    updater(clone);
    clone.lastSeenAt = trackingTodayISO();
    clone.updatedAt = new Date().toISOString();
    return normalizeItem(clone);
  });
  if (found) saveWatchlist(updated);
  return found;
}

window.addTrackingSnapshot = function (id) {
  var item = getNormalizedWatchlist().find(function (p) { return p.id === id; });
  if (!item) return;

  var priceRaw = prompt('Precio actual:', item.price || '');
  if (priceRaw === null) return;

  var statusText = prompt('Estado actual:', item.status || 'publicado');
  if (statusText === null) return;

  var note = prompt('Nota de revisión:', 'Revisión manual');
  var price = safeNumber(priceRaw) || item.price || 0;
  var checkedAt = trackingTodayISO();

  updateItemById(id, function (p) {
    p.price = price;
    p.status = statusText;
    p.checkedAt = checkedAt;
    p.snapshots = p.snapshots || [];
    p.snapshots.unshift({
      checkedAt: checkedAt,
      price: price,
      available: !/(vendido|retirado|no disponible)/i.test(statusText),
      statusText: statusText,
      notes: note || ''
    });
  });
  renderTracking(document.getElementById('tp-content'));
};

window.updateTrackingDecision = function (id) {
  var item = getNormalizedWatchlist().find(function (p) { return p.id === id; });
  if (!item) return;

  var decision = prompt('Decisión:', item.decision || 'tracking_serio');
  if (decision === null) return;
  var priority = prompt('Prioridad A/B/C/D:', item.priority || 'B');
  if (priority === null) return;
  var notes = prompt('Notas:', item.notes || '');
  if (notes === null) return;

  updateItemById(id, function (p) {
    p.decision = decision;
    p.priority = String(priority || 'B').toUpperCase().slice(0, 1);
    p.notes = notes;
  });
  renderTracking(document.getElementById('tp-content'));
};

window.updateMarketTimeEstimate = function (id) {
  var item = getNormalizedWatchlist().find(function (p) { return p.id === id; });
  if (!item) return;

  var mt = item.marketTimeEstimate || {};
  var minRaw = prompt('Días mínimos estimados en mercado:', mt.minDays || '30');
  if (minRaw === null) return;
  var maxRaw = prompt('Días máximos estimados en mercado:', mt.maxDays || '90');
  if (maxRaw === null) return;
  var reason = prompt('Motivo:', mt.rationale || 'Estimación manual');

  updateItemById(id, function (p) {
    p.marketTimeEstimate = {
      minDays: Number(minRaw) || 0,
      maxDays: Number(maxRaw) || 0,
      label: (Number(minRaw) || 0) + '-' + (Number(maxRaw) || 0) + ' días',
      confidence: mt.confidence || 'manual',
      rationale: reason || ''
    };
  });
  renderTracking(document.getElementById('tp-content'));
};

window.deleteTrackingItem = function (id) {
  var items = getNormalizedWatchlist();
  var item = items.find(function (p) { return p.id === id; });
  if (!item || !confirm('¿Eliminar de tracking ' + (item.title || id) + '?')) return;
  saveWatchlist(items.filter(function (p) { return p.id !== id; }));
  renderTracking(document.getElementById('tp-content'));
};

window.exportWatchlist = function () {
  var b = new Blob([JSON.stringify(getNormalizedWatchlist(), null, 2)], { type: 'application/json' });
  var a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(b),
    download: 'return_watchlist_' + trackingTodayISO() + '.json'
  });
  a.click();
};

window.setTrackingArea = function (areaKey) {
  window._trackingArea = areaKey || 'all';
  renderTracking(document.getElementById('tp-content'));
};

function isRiskyItem(item) {
  var txt = [
    item && item.riskLevel,
    item && item.occupancyStatus,
    item && item.decision,
    item && item.status,
    item && item.condition
  ].filter(Boolean).join(' ').toLowerCase();

  return /(muy_alto|alto|ocupado|sin_posesion|nuda_propiedad|cesion|situacion_especial|remate)/.test(txt);
}

function estimateReformM2(item) {
  var c = String((item && item.condition) || '').toLowerCase();
  var direct = safeNumber(item && item.reformCostM2);
  if (direct) return Math.round(direct);
  if (/integral|para_reformar|sin_posesion|mal_estado/.test(c)) return 500;
  if (/reformado|buen_estado/.test(c)) return 180;
  if (/segunda_mano/.test(c)) return 300;
  return 350;
}

function rentFromGeo(item) {
  if (!window.GEO || !item || !item.surfaceM2) return null;
  var sup = safeNumber(item.surfaceM2);
  if (!sup) return null;

  try {
    if (item.marketKey === 'manresa' && window.GEO.Barcelona && window.GEO.Barcelona.municipios && window.GEO.Barcelona.municipios.Manresa) {
      return Math.round(window.GEO.Barcelona.municipios.Manresa.a * sup);
    }
    if (item.marketKey === 'sanjuan' && window.GEO.Sevilla && window.GEO.Sevilla.municipios && window.GEO.Sevilla.municipios['San Juan de Aznalfarache']) {
      return Math.round(window.GEO.Sevilla.municipios['San Juan de Aznalfarache'].a * sup);
    }
  } catch (e) {}
  return null;
}

function estimateRent(item) {
  var direct = safeNumber(item && (item.rentCurrentMonthly || item.rentEstimatedMonthly || item.marketRentMonthly));
  if (direct) return Math.round(direct);
  var geo = rentFromGeo(item);
  if (geo) return geo;
  var sup = safeNumber(item && item.surfaceM2);
  if (!sup) return null;

  var rate = 9;
  if (item.marketKey === 'macarena') rate = 9.5;
  if (item.marketKey === 'sanjuan') rate = 8.5;
  if (item.marketKey === 'manresa') rate = 9.5;
  return Math.round(sup * rate);
}

function estimateFlipSale(item) {
  var direct = safeNumber(item && (item.targetSalePrice || item.estimatedSalePrice || item.arv || item.afterRepairValue));
  if (direct) return Math.round(direct);

  var price = safeNumber(item && item.price);
  var sup = safeNumber(item && item.surfaceM2);
  if (!price && !sup) return null;

  var benchmarkM2 = 1500;
  if (item.marketKey === 'macarena') benchmarkM2 = 1700;
  if (item.marketKey === 'sanjuan') benchmarkM2 = 1450;
  if (item.marketKey === 'manresa') benchmarkM2 = 1550;

  if (sup) {
    var byM2 = Math.round((benchmarkM2 * sup) / 1000) * 1000;
    if (price) return Math.max(byM2, Math.round(price * 1.2 / 1000) * 1000);
    return byM2;
  }
  return Math.round(price * 1.25 / 1000) * 1000;
}

function saveSelectedIntoState(selected) {
  try {
    var raw = JSON.parse(localStorage.getItem('return_state_v1') || '{}');
    raw.selectedTrackingProperty = selected;
    raw.S = Object.assign({}, window.S || raw.S || {});
    raw.F = Object.assign({}, window.F || raw.F || {});
    raw.B = Object.assign({}, window.B || raw.B || {});
    raw.savedAt = new Date().toISOString();
    localStorage.setItem('return_state_v1', JSON.stringify(raw));
  } catch (e) {}
}

function refreshStudyAfterApply() {
  ['rSI', 'rSR', 'rFI', 'rFR', 'rBI', 'rBR'].forEach(function (fn) {
    if (typeof window[fn] === 'function') {
      try { window[fn](); } catch (e) { console.warn(fn, e); }
    }
  });
}

function goToActivoTab() {
  try {
    var btn = document.querySelector('.tab[data-tab="ap"]');
    if (typeof window.sw === 'function') window.sw('ap', btn);
    else if (btn) btn.click();
  } catch (e) {}
}

window.applyTrackingToStudy = function (id) {
  var item = getNormalizedWatchlist().find(function (p) { return p.id === id; });
  if (!item) {
    alert('No encuentro este inmueble en el tracking. Prueba a reiniciar base.');
    return;
  }

  if (isRiskyItem(item)) {
    var msg = 'Este inmueble tiene riesgo alto o situación especial.\n\n';
    msg += 'Estado: ' + (item.occupancyStatus || 'por verificar') + '\n';
    msg += 'Riesgo: ' + (item.riskLevel || 'por verificar') + '\n\n';
    msg += '¿Quieres usarlo igualmente como escenario especial?';
    if (!confirm(msg)) return;
  }

  var price = safeNumber(item.price);
  var sup = safeNumber(item.surfaceM2);
  var reformM2 = estimateReformM2(item);
  var rent = estimateRent(item);
  var sale = estimateFlipSale(item);

  if (window.S) {
    if (price) window.S.pc = Math.round(price);
  }
  if (window.F) {
    if (sup) window.F.sup = Math.round(sup);
    if (reformM2) window.F.rm2 = Math.round(reformM2);
    if (sale) window.F.pv = Math.round(sale);
  }
  if (window.B) {
    if (sup && reformM2) window.B.ref = Math.round(sup * reformM2);
    if (rent) window.B.rnt = Math.round(rent);
  }

  var selected = {
    id: item.id,
    title: item.title || item.street || '',
    street: item.street || item.address || item.title || '',
    marketKey: item.marketKey || '',
    market: areaLabelFromKey(item.marketKey),
    portal: portalLabel(item),
    price: price,
    surfaceM2: sup,
    rooms: item.rooms || null,
    floor: item.floor,
    elevator: item.elevator,
    riskLevel: item.riskLevel || '',
    occupancyStatus: item.occupancyStatus || '',
    rentMonthly: rent,
    estimatedFlipSale: sale,
    reformCostM2: reformM2,
    appliedAt: new Date().toISOString()
  };

  window._selectedTrackingProperty = selected;
  try { localStorage.setItem(SELECTED_TRACKING_KEY, JSON.stringify(selected)); } catch (e) {}

  refreshStudyAfterApply();
  if (typeof window.autoSave === 'function') {
    try { window.autoSave(); } catch (e) {}
  }
  saveSelectedIntoState(selected);

  setStatus(
    '✓ Aplicado al estudio: ' + (item.street || item.title || item.id) +
    ' · compra ' + (price ? Math.round(price).toLocaleString('es-ES') + ' €' : '—') +
    ' · sup. ' + (sup || '—') + ' m²' +
    ' · renta ' + (rent ? rent.toLocaleString('es-ES') + ' €/mes' : '—'),
    '#16a34a'
  );

  goToActivoTab();
};

function marketTimeLabel(item) {
  var mt = item && item.marketTimeEstimate;
  if (mt && mt.label) return mt.label;
  if (mt && isFinite(mt.minDays) && isFinite(mt.maxDays)) return mt.minDays + '-' + mt.maxDays + ' días';
  return '—';
}

function marketTimeColor(item) {
  var mt = item && item.marketTimeEstimate;
  var max = mt && isFinite(mt.maxDays) ? Number(mt.maxDays) : null;
  if (max === null) return '#64748b';
  if (max <= 75) return '#16a34a';
  if (max <= 140) return '#d97706';
  return '#dc2626';
}

function priorityColor(priority) {
  return priority === 'A' ? '#16a34a' : priority === 'B' ? '#d97706' : priority === 'C' ? '#64748b' : '#dc2626';
}

function riskColor(risk) {
  return /muy_alto|alto/.test(risk || '') ? '#dc2626' : /medio_alto|medio/.test(risk || '') ? '#d97706' : '#16a34a';
}

function streetLabel(item) {
  return item.street || item.address || item.title || '—';
}

function floorLabel(item) {
  if (item.floor === 0) return 'Bajo';
  if (item.floor === null || item.floor === undefined || item.floor === '') return 'Por verificar';
  return item.floor + 'ª';
}

function elevatorLabel(item) {
  if (item.elevator === true) return 'Sí';
  if (item.elevator === false) return 'No';
  return 'Por verificar';
}

function elevatorColor(item) {
  if (item.elevator === true) return '#16a34a';
  if (item.elevator === false) return '#dc2626';
  return '#64748b';
}

function tabCount(items, key) {
  if (key === 'all') return items.length;
  return items.filter(function (p) { return p.marketKey === key; }).length;
}

function duplicateCounts(items) {
  var counts = {};
  items.forEach(function (item) {
    counts[item.canonicalKey] = (counts[item.canonicalKey] || 0) + 1;
  });
  return counts;
}

function passesFilters(item, dupes) {
  var f = window._trackingFilters || TRACKING_DEFAULT_FILTERS;
  if (f.priorityAB && ['A', 'B'].indexOf(item.priority) < 0) return false;
  if (f.cleanOnly && isRiskyItem(item)) return false;
  if (f.fastOnly && !(item.marketTimeEstimate && Number(item.marketTimeEstimate.maxDays) <= 90)) return false;
  if (f.portal !== 'all' && String(portalLabel(item)).toLowerCase() !== f.portal) return false;
  if (f.search) {
    var haystack = [
      item.title, item.street, item.neighborhood, item.city, item.portal,
      item.occupancyStatus, item.decision, item.notes
    ].filter(Boolean).join(' ').toLowerCase();
    if (haystack.indexOf(String(f.search).toLowerCase()) < 0) return false;
  }
  return true;
}

function renderTabs(items, activeArea) {
  var tabs = ['all', 'macarena', 'manresa', 'sanjuan'];
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' +
    tabs.map(function (key) {
      var active = activeArea === key;
      return '<button data-action="area" data-area="' + key + '" style="padding:8px 12px;border:1px solid ' + (active ? '#1a1a1a' : '#e5e5e0') + ';border-radius:999px;background:' + (active ? '#1a1a1a' : '#fff') + ';color:' + (active ? '#fff' : '#555') + ';font-size:12px;cursor:pointer;font-family:inherit;font-weight:' + (active ? '600' : '400') + '">' +
        escapeTracking(areaLabelFromKey(key)) + ' <span style="opacity:.65">' + tabCount(items, key) + '</span></button>';
    }).join('') +
    '</div>';
}

function renderTopControls() {
  var f = window._trackingFilters || TRACKING_DEFAULT_FILTERS;
  var sourceOptions = Object.keys(WATCHLIST_SOURCES).map(function (key) {
    return '<option value="' + key + '">' + escapeTracking(WATCHLIST_SOURCES[key].label) + '</option>';
  }).join('');

  return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
    '<div><div style="font-size:18px;font-weight:500;color:#1a1a1a">Tracking de pisos</div>' +
    '<div style="font-size:11px;color:#aaa;margin-top:2px">Mercados por zona · Idealista y Solvia mezclados · v' + TRACKING_VERSION + '</div></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<select id="tracking-source-select" style="padding:8px 10px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;font-family:inherit">' + sourceOptions + '</select>' +
    '<button data-action="import-source" style="padding:8px 12px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar fuente</button>' +
    '<button data-action="import-all" style="padding:8px 12px;border:1px solid #1a1a1a;border-radius:8px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar todo</button>' +
    '<button data-action="reset-base" style="padding:8px 12px;border:1px solid #dc2626;border-radius:8px;background:#fff;color:#dc2626;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Reiniciar base</button>' +
    '<button data-action="export" style="padding:8px 12px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Exportar JSON</button>' +
    '</div></div>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
    '<label style="font-size:11px;color:#555"><input data-filter="priorityAB" type="checkbox" ' + (f.priorityAB ? 'checked' : '') + '> Solo A/B</label>' +
    '<label style="font-size:11px;color:#555"><input data-filter="cleanOnly" type="checkbox" ' + (f.cleanOnly ? 'checked' : '') + '> Solo limpios</label>' +
    '<label style="font-size:11px;color:#555"><input data-filter="fastOnly" type="checkbox" ' + (f.fastOnly ? 'checked' : '') + '> ≤90 días</label>' +
    '<select data-filter="portal" style="padding:6px 8px;border:1px solid #e5e5e0;border-radius:7px;font-size:11px;background:#fff">' +
    '<option value="all" ' + (f.portal === 'all' ? 'selected' : '') + '>Todos los portales</option>' +
    '<option value="idealista" ' + (f.portal === 'idealista' ? 'selected' : '') + '>Idealista</option>' +
    '<option value="solvia" ' + (f.portal === 'solvia' ? 'selected' : '') + '>Solvia</option>' +
    '</select>' +
    '<input data-filter="search" value="' + escapeTracking(f.search || '') + '" placeholder="Buscar calle, zona, estado..." style="padding:6px 8px;border:1px solid #e5e5e0;border-radius:7px;font-size:11px;min-width:210px">' +
    '</div>';
}

function renderStats(filtered, activeArea) {
  var total = filtered.length;
  var serious = filtered.filter(function (p) { return ['A', 'B'].indexOf(p.priority) >= 0; }).length;
  var clean = filtered.filter(function (p) { return !isRiskyItem(p); }).length;
  var avg = total ? Math.round(filtered.reduce(function (s, p) { return s + (priceM2Tracking(p) || 0); }, 0) / total) : 0;
  var fast = filtered.filter(function (p) { return p.marketTimeEstimate && p.marketTimeEstimate.maxDays <= 90; }).length;

  return '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">' +
    '<div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Zona activa</div><div style="font-size:18px;font-family:Courier New,monospace;font-weight:600">' + escapeTracking(areaLabelFromKey(activeArea)) + '</div></div>' +
    '<div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Prioridad A/B</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600;color:#ba7517">' + serious + '</div></div>' +
    '<div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Operaciones limpias aprox.</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600">' + clean + '</div></div>' +
    '<div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Salida estimada ≤90d</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600;color:#16a34a">' + fast + '</div></div>' +
    '<div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Media €/m² muestra</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600">' + (avg ? avg.toLocaleString('es-ES') : '—') + '</div></div>' +
    '</div>';
}

function renderRow(item, index, dupes) {
  var pm2 = priceM2Tracking(item);
  var duplicateCount = dupes[item.canonicalKey] || 0;
  var duplicateBadge = duplicateCount > 1
    ? '<span title="Posible duplicado entre portales" style="display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:9px">dup ' + duplicateCount + '</span>'
    : '';

  var risky = isRiskyItem(item);
  var useLabel = risky ? 'Usar riesgo' : 'Usar';
  var useStyle = risky
    ? 'padding:5px 8px;border:1px solid #d97706;border-radius:6px;background:#fffbeb;color:#b45309;cursor:pointer;font-weight:600;margin-right:2px'
    : 'padding:5px 8px;border:1px solid #16a34a;border-radius:6px;background:#f0fdf4;color:#15803d;cursor:pointer;font-weight:600;margin-right:2px';

  return '<tr style="background:' + (index % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
    '<td style="padding:8px;text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:' + priorityColor(item.priority) + ';color:#fff;font-weight:700">' + escapeTracking(item.priority || '?') + '</span></td>' +
    '<td style="padding:8px;min-width:120px"><div style="font-weight:500;color:#555">' + escapeTracking(areaLabelFromKey(item.marketKey)) + '</div><div style="color:#aaa;margin-top:2px">' + escapeTracking(item.neighborhood || item.district || item.city || '') + '</div></td>' +
    '<td style="padding:8px;font-weight:600;color:' + (portalLabel(item) === 'Solvia' ? '#0f766e' : '#ba7517') + '">' + escapeTracking(portalLabel(item)) + duplicateBadge + '</td>' +
    '<td style="padding:8px;min-width:200px"><div style="font-weight:500;color:#1a1a1a">' + escapeTracking(streetLabel(item)) + '</div><div style="color:#aaa;margin-top:2px">' + escapeTracking(item.surfaceM2 || '—') + ' m² · ' + escapeTracking(String(item.condition || 'por verificar').replace(/_/g, ' ')) + '</div>' + (item.url ? '<a href="' + escapeTracking(item.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Abrir anuncio ↗</a>' : '') + '</td>' +
    '<td style="padding:8px;text-align:right;font-family:Courier New,monospace;font-weight:600">' + moneyTracking(item.price) + '</td>' +
    '<td style="padding:8px;text-align:right;font-family:Courier New,monospace">' + (pm2 ? pm2.toLocaleString('es-ES') : '—') + '</td>' +
    '<td style="padding:8px;text-align:center">' + (item.rooms || '—') + '</td>' +
    '<td style="padding:8px;text-align:center;font-weight:500">' + escapeTracking(floorLabel(item)) + '</td>' +
    '<td style="padding:8px;text-align:center"><span style="color:' + elevatorColor(item) + ';font-weight:600">' + escapeTracking(elevatorLabel(item)) + '</span></td>' +
    '<td style="padding:8px"><span style="color:' + riskColor(item.riskLevel) + ';font-weight:500">' + escapeTracking(String(item.occupancyStatus || 'por_verificar').replace(/_/g, ' ')) + '</span><div style="color:#aaa;margin-top:2px">' + escapeTracking(item.riskLevel || '') + '</div></td>' +
    '<td style="padding:8px;min-width:125px"><span title="' + escapeTracking((item.marketTimeEstimate && item.marketTimeEstimate.rationale) || '') + '" style="color:' + marketTimeColor(item) + ';font-weight:600">' + escapeTracking(marketTimeLabel(item)) + '</span><div style="color:#aaa;margin-top:2px">' + escapeTracking((item.marketTimeEstimate && item.marketTimeEstimate.confidence) || 'orientativo') + '</div></td>' +
    '<td style="padding:8px;text-align:center">' + (item.daysOnMarket !== null && item.daysOnMarket !== undefined ? item.daysOnMarket + ' d' : '—') + '<div style="font-size:9px;color:#aaa">' + escapeTracking(formatDateTracking(item.firstSeenAt)) + '</div></td>' +
    '<td style="padding:8px;min-width:150px">' + escapeTracking(decisionLabel(item.decision)) + '<div style="color:#aaa;margin-top:2px">' + escapeTracking(item.checkedAt || '') + '</div></td>' +
    '<td style="padding:8px;min-width:180px;color:#555">' + escapeTracking(item.nextAction || '—') + '</td>' +
    '<td style="padding:8px;text-align:center;white-space:nowrap">' +
      '<button data-action="apply" data-id="' + escapeTracking(item.id) + '" title="Aplicar este inmueble al estudio" style="' + useStyle + '">' + useLabel + '</button>' +
      '<button data-action="snapshot" data-id="' + escapeTracking(item.id) + '" title="Añadir revisión" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">↻</button>' +
      '<button data-action="edit" data-id="' + escapeTracking(item.id) + '" title="Editar criterio" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">✎</button>' +
      '<button data-action="time" data-id="' + escapeTracking(item.id) + '" title="Editar tiempo" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">⏱</button>' +
      '<button data-action="delete" data-id="' + escapeTracking(item.id) + '" title="Eliminar" style="padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer">×</button>' +
    '</td>' +
    '</tr>';
}

function renderTable(items, dupes) {
  if (!items.length) {
    return '<div style="text-align:center;padding:48px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa">' +
      '<div style="font-size:34px;margin-bottom:8px">🔎</div>' +
      '<div style="font-size:14px;color:#777;font-weight:500">Sin pisos en esta vista</div>' +
      '<div style="font-size:12px;margin-top:4px">Pulsa Reiniciar base o limpia filtros para recargar Idealista + Solvia.</div>' +
      '</div>';
  }

  return '<div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f4f4f0;color:#555">' +
    '<th style="padding:8px;text-align:center">Prio.</th>' +
    '<th style="padding:8px;text-align:left">Mercado</th>' +
    '<th style="padding:8px;text-align:left">Portal</th>' +
    '<th style="padding:8px;text-align:left">Calle</th>' +
    '<th style="padding:8px;text-align:right">Precio</th>' +
    '<th style="padding:8px;text-align:right">€/m²</th>' +
    '<th style="padding:8px;text-align:center">Hab.</th>' +
    '<th style="padding:8px;text-align:center">Planta</th>' +
    '<th style="padding:8px;text-align:center">Ascensor</th>' +
    '<th style="padding:8px;text-align:left">Estado</th>' +
    '<th style="padding:8px;text-align:left">Tiempo mercado</th>' +
    '<th style="padding:8px;text-align:center">Visto</th>' +
    '<th style="padding:8px;text-align:left">Decisión</th>' +
    '<th style="padding:8px;text-align:left">Acción</th>' +
    '<th style="padding:8px;text-align:center">Operar</th>' +
    '</tr></thead><tbody>' +
    items.map(function (item, index) { return renderRow(item, index, dupes); }).join('') +
    '</tbody></table></div>' +
    '<div style="font-size:10px;color:#aaa;margin-top:8px;line-height:1.5">Los mercados se separan por marketKey fijo. Idealista y Solvia aparecen mezclados dentro de cada zona. Los duplicados se marcan como posibles coincidencias entre portales.</div>';
}

function filteredItemsForRender(allItems, activeArea, dupes) {
  var areaItems = activeArea === 'all' ? allItems : allItems.filter(function (p) { return p.marketKey === activeArea; });
  return areaItems
    .filter(function (p) { return passesFilters(p, dupes); })
    .sort(function (a, b) {
      var order = { A: 1, B: 2, C: 3, D: 4 };
      return (order[a.priority] || 9) - (order[b.priority] || 9) || (a.price || 0) - (b.price || 0);
    });
}

function attachTrackingEvents(root) {
  if (!root || root.__trackingEventsAttached) return;
  root.__trackingEventsAttached = true;

  root.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-action]');
    if (!btn || !root.contains(btn)) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    if (action === 'area') window.setTrackingArea(btn.getAttribute('data-area'));
    else if (action === 'import-source') window.importBaseWatchlist();
    else if (action === 'import-all') window.importAllWatchlists();
    else if (action === 'reset-base') window.resetTrackingBase();
    else if (action === 'export') window.exportWatchlist();
    else if (action === 'apply') window.applyTrackingToStudy(id);
    else if (action === 'snapshot') window.addTrackingSnapshot(id);
    else if (action === 'edit') window.updateTrackingDecision(id);
    else if (action === 'time') window.updateMarketTimeEstimate(id);
    else if (action === 'delete') window.deleteTrackingItem(id);
  });

  root.addEventListener('change', function (event) {
    var filter = event.target.getAttribute('data-filter');
    if (!filter) return;
    if (event.target.type === 'checkbox') window._trackingFilters[filter] = event.target.checked;
    else window._trackingFilters[filter] = event.target.value;
    saveTrackingFilters();
    renderTracking(root);
  });

  root.addEventListener('input', function (event) {
    var filter = event.target.getAttribute('data-filter');
    if (filter !== 'search') return;
    window._trackingFilters.search = event.target.value;
    saveTrackingFilters();
    clearTimeout(window.__trackingSearchTimer);
    window.__trackingSearchTimer = setTimeout(function () {
      renderTracking(root);
    }, 180);
  });
}

function renderTracking(el) {
  if (!el) return;
  var allItems = migrateWatchlistIfNeeded();
  var activeArea = window._trackingArea || 'all';
  var dupes = duplicateCounts(allItems);
  var filtered = filteredItemsForRender(allItems, activeArea, dupes);

  var html = '<div style="max-width:1320px">' +
    renderTopControls() +
    renderTabs(allItems, activeArea) +
    '<div id="tracking-status" style="font-size:11px;color:#aaa;margin-bottom:10px"></div>' +
    renderStats(filtered, activeArea) +
    renderTable(filtered, dupes) +
    '</div>';

  el.innerHTML = html;
  attachTrackingEvents(el);
}

window.loadTracking = function () {
  var el = document.getElementById('tp-content');
  if (!el) return;
  renderTracking(el);
  if (getWatchlistRaw().length === 0) {
    window.importAllWatchlists();
  }
};

window.getNormalizedWatchlist = getNormalizedWatchlist;
window.renderTracking = renderTracking;

document.addEventListener('DOMContentLoaded', function () {
  var el = document.getElementById('tp-content');
  if (el) renderTracking(el);
});
