// dashboard.js — Pipeline principal de activos inmobiliarios
// v1.0: Dashboard con mapa, pipeline, KPIs y formulario de seguimiento CRM

var DASHBOARD_VERSION = '1.0';
var DASHBOARD_KEY = 'return_dashboard_assets_v1';

var STAGE_CONFIG = {
  nuevo:             { label: 'Nuevo',              color: '#94a3b8', bg: '#f1f5f9' },
  analizando:        { label: 'Analizando',          color: '#3b82f6', bg: '#eff6ff' },
  contactado:        { label: 'Contactado',          color: '#f59e0b', bg: '#fffbeb' },
  visita_programada: { label: 'Visita programada',   color: '#8b5cf6', bg: '#f5f3ff' },
  visitado:          { label: 'Visitado',            color: '#0ea5e9', bg: '#f0f9ff' },
  oferta_enviada:    { label: 'Oferta enviada',      color: '#f97316', bg: '#fff7ed' },
  negociando:        { label: 'Negociando',          color: '#ef4444', bg: '#fef2f2' },
  descartado:        { label: 'Descartado',          color: '#6b7280', bg: '#f9fafb' },
  cerrado:           { label: 'Cerrado ✓',      color: '#16a34a', bg: '#f0fdf4' }
};

var SOURCE_OPTIONS = ['Idealista', 'Solvia', 'Habitaclia', 'Fotocasa', 'Milanuncios', 'Subasta', 'Otra'];
var PRIORITY_OPTIONS = ['A', 'B', 'C', 'D'];
var CONDITION_OPTIONS = {
  a_reformar:    'A reformar',
  segunda_mano:  'Segunda mano',
  buen_estado:   'Buen estado',
  reformado:     'Reformado',
  obra_nueva:    'Obra nueva'
};

var _dashMap = null;
var _dashMarkers = [];
var _dashMapReady = false;

// ── STORAGE ───────────────────────────────────────────────────────────────────

function getDashboardAssets() {
  try {
    var raw = JSON.parse(localStorage.getItem(DASHBOARD_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (e) { return []; }
}

function saveDashboardAssets(assets) {
  try { localStorage.setItem(DASHBOARD_KEY, JSON.stringify(assets || [])); } catch (e) {}
}

function newAssetId() {
  return 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

// ── HELPERS ───────────────────────────────────────────────────────────────────

function moneyD(n) {
  if (!isFinite(n) || n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
}

function escD(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function stageCfg(stage) { return STAGE_CONFIG[stage] || STAGE_CONFIG.nuevo; }

function stageBadge(stage) {
  var c = stageCfg(stage);
  return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:600;color:' + c.color + ';background:' + c.bg + ';border:1px solid ' + c.color + '33">' + c.label + '</span>';
}

function prioBadge(p) {
  var cols = { A: '#16a34a', B: '#d97706', C: '#64748b', D: '#dc2626' };
  var col = cols[p] || '#64748b';
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:' + col + ';color:#fff;font-size:10px;font-weight:700">' + escD(p || '?') + '</span>';
}

// ── MAP ───────────────────────────────────────────────────────────────────────

function initDashMap() {
  if (_dashMap || !window.L) return;
  var el = document.getElementById('dashboard-map');
  if (!el) return;
  _dashMap = L.map('dashboard-map', { zoomControl: true }).setView([40.0, -3.7], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(_dashMap);
  _dashMapReady = true;
}

function updateDashMap(assets) {
  if (!_dashMapReady) initDashMap();
  if (!_dashMapReady) return;

  _dashMarkers.forEach(function(m) { m.remove(); });
  _dashMarkers = [];

  var bounds = [];
  assets.forEach(function(asset) {
    var lat = parseFloat(asset.lat), lng = parseFloat(asset.lng);
    if (!isFinite(lat) || !isFinite(lng)) return;
    var c = stageCfg(asset.stage);
    var icon = L.divIcon({
      className: '',
      html: '<div style="background:' + c.color + ';width:13px;height:13px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>',
      iconSize: [13, 13], iconAnchor: [6, 6]
    });
    var popup =
      '<div style="font-family:system-ui;font-size:12px;min-width:170px;line-height:1.5">' +
      '<div style="font-weight:600;color:#1a1a1a">' + escD(asset.title || asset.address || 'Sin título') + '</div>' +
      '<div style="color:#ba7517;font-weight:500">' + moneyD(asset.price) + '</div>' +
      '<div style="color:' + c.color + ';font-size:11px">' + c.label + '</div>' +
      (asset.surface ? '<div style="color:#888;font-size:11px">' + asset.surface + ' m²</div>' : '') +
      '<div style="margin-top:7px"><button onclick="openEditAsset(\'' + asset.id + '\')" style="padding:4px 9px;border:1px solid #ba7517;border-radius:5px;background:#fff;color:#ba7517;cursor:pointer;font-size:10px;font-family:inherit">Editar</button></div>' +
      '</div>';
    var marker = L.marker([lat, lng], { icon: icon }).addTo(_dashMap);
    marker.bindPopup(popup);
    _dashMarkers.push(marker);
    bounds.push([lat, lng]);
  });

  if (bounds.length === 1) _dashMap.setView(bounds[0], 14);
  else if (bounds.length > 1) _dashMap.fitBounds(bounds, { padding: [30, 30] });
  setTimeout(function() { _dashMap.invalidateSize(); }, 120);
}

window.invalidateDashMap = function() {
  if (_dashMap) setTimeout(function() { _dashMap.invalidateSize(); }, 120);
};

// ── KPIs ──────────────────────────────────────────────────────────────────────

function renderKPIs(assets) {
  var total = assets.length;
  var ab = assets.filter(function(a) { return a.priority === 'A' || a.priority === 'B'; }).length;
  var vis = assets.filter(function(a) { return a.stage === 'visita_programada'; }).length;
  var neg = assets.filter(function(a) { return a.stage === 'negociando' || a.stage === 'oferta_enviada'; }).length;
  var done = assets.filter(function(a) { return a.stage === 'cerrado'; }).length;

  var kpis = [
    { label: 'Total activos',           value: total, color: '#1a1a1a' },
    { label: 'Prioridad A / B',         value: ab,    color: '#ba7517' },
    { label: 'Visitas programadas',     value: vis,   color: '#8b5cf6' },
    { label: 'Oferta / Negociación', value: neg, color: '#ef4444' },
    { label: 'Cerrados',                value: done,  color: '#16a34a' }
  ];

  return '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">' +
    kpis.map(function(k) {
      return '<div style="background:#fff;border:1px solid #e5e5e0;border-radius:10px;padding:14px 12px">' +
        '<div style="font-size:10px;color:#aaa;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">' + k.label + '</div>' +
        '<div style="font-size:28px;font-family:\'Courier New\',monospace;font-weight:700;color:' + k.color + '">' + k.value + '</div>' +
        '</div>';
    }).join('') +
    '</div>';
}

// ── PIPELINE ──────────────────────────────────────────────────────────────────

function renderPipeline(assets) {
  var active = ['nuevo', 'analizando', 'contactado', 'visita_programada', 'visitado', 'oferta_enviada', 'negociando'];
  return '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:18px;scrollbar-width:thin">' +
    active.map(function(stage) {
      var c = stageCfg(stage);
      var count = assets.filter(function(a) { return a.stage === stage; }).length;
      var hasBorder = count > 0;
      return '<div style="min-width:115px;flex-shrink:0;text-align:center;padding:12px 8px;border-radius:10px;border:2px solid ' + (hasBorder ? c.color : '#e5e5e0') + ';background:' + (hasBorder ? c.bg : '#fafaf8') + ';transition:.15s">' +
        '<div style="font-size:26px;font-weight:700;color:' + c.color + ';font-family:\'Courier New\',monospace;line-height:1">' + count + '</div>' +
        '<div style="font-size:10px;color:#666;margin-top:5px;line-height:1.3">' + c.label + '</div>' +
        '</div>';
    }).join('') +
    '<div style="min-width:100px;flex-shrink:0;text-align:center;padding:12px 8px;border-radius:10px;border:1px dashed #d1d5db;background:#f9fafb;opacity:.7">' +
      '<div style="font-size:26px;font-weight:700;color:#6b7280;font-family:\'Courier New\',monospace;line-height:1">' + assets.filter(function(a) { return a.stage === 'descartado'; }).length + '</div>' +
      '<div style="font-size:10px;color:#9ca3af;margin-top:5px">Descartados</div>' +
    '</div>' +
    '<div style="min-width:100px;flex-shrink:0;text-align:center;padding:12px 8px;border-radius:10px;border:2px solid #16a34a;background:#f0fdf4">' +
      '<div style="font-size:26px;font-weight:700;color:#16a34a;font-family:\'Courier New\',monospace;line-height:1">' + assets.filter(function(a) { return a.stage === 'cerrado'; }).length + '</div>' +
      '<div style="font-size:10px;color:#16a34a;margin-top:5px">Cerrados</div>' +
    '</div>' +
    '</div>';
}

// ── TABLE ─────────────────────────────────────────────────────────────────────

function renderRow(asset, i) {
  var pm2 = (asset.price && asset.surface) ? Math.round(asset.price / asset.surface).toLocaleString('es-ES') + ' €/m²' : '—';
  var visitCell = asset.visitDate
    ? '<span style="color:#8b5cf6;font-weight:500">' + asset.visitDate + '</span>'
    : '<span style="color:#d1d5db">—</span>';
  var agentCell = asset.contactedAgent
    ? '<span style="color:#16a34a;font-size:15px">✓</span>' + (asset.contactDate ? '<div style="font-size:9px;color:#aaa">' + asset.contactDate + '</div>' : '')
    : '<span style="color:#d1d5db;font-size:15px">○</span>';
  var btnEdit    = '<button data-action="edit-asset"    data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #ba7517;border-radius:5px;background:#fff;color:#ba7517;cursor:pointer;font-size:11px;font-family:inherit">Editar</button>';
  var btnAnalyze = '<button data-action="analyze-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #16a34a;border-radius:5px;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:11px;font-family:inherit">Analizar</button>';
  var btnDel     = '<button data-action="delete-asset"  data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #fca5a5;border-radius:5px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:11px;font-family:inherit">×</button>';

  return '<tr style="background:' + (i % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
    '<td style="padding:8px;text-align:center">' + prioBadge(asset.priority) + '</td>' +
    '<td style="padding:8px">' + stageBadge(asset.stage) + '</td>' +
    '<td style="padding:8px;font-size:11px;color:#ba7517;font-weight:500">' + escD(asset.source || '—') + '</td>' +
    '<td style="padding:8px;min-width:190px">' +
      '<div style="font-weight:500;color:#1a1a1a;font-size:12px">' + escD(asset.title || asset.address || '—') + '</div>' +
      '<div style="color:#aaa;font-size:10px;margin-top:2px">' + escD(asset.city || '') + (asset.neighborhood ? ' · ' + escD(asset.neighborhood) : '') + (asset.surface ? ' · ' + asset.surface + ' m²' : '') + (asset.rooms ? ' · ' + asset.rooms + ' hab.' : '') + '</div>' +
      (asset.url ? '<a href="' + escD(asset.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a>' : '') +
    '</td>' +
    '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;font-weight:600;white-space:nowrap">' + moneyD(asset.price) + '</td>' +
    '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;color:#888;font-size:11px">' + pm2 + '</td>' +
    '<td style="padding:8px;text-align:center;font-size:11px">' + agentCell + '</td>' +
    '<td style="padding:8px;text-align:center;font-size:11px">' + visitCell + '</td>' +
    '<td style="padding:8px;font-size:11px;color:#555;max-width:180px;word-break:break-word">' + escD(asset.notes || '—') + '</td>' +
    '<td style="padding:8px;text-align:center;white-space:nowrap">' +
      '<div style="display:flex;gap:4px;justify-content:center">' + btnEdit + btnAnalyze + btnDel + '</div>' +
    '</td>' +
    '</tr>';
}

function renderTable(assets, showArchived) {
  var active = assets.filter(function(a) { return a.stage !== 'descartado' && a.stage !== 'cerrado'; });
  var archived = assets.filter(function(a) { return a.stage === 'descartado' || a.stage === 'cerrado'; });
  var stageOrder = { negociando: 1, oferta_enviada: 2, visita_programada: 3, visitado: 4, contactado: 5, analizando: 6, nuevo: 7 };
  var prioOrder  = { A: 1, B: 2, C: 3, D: 4 };

  function sortAssets(list) {
    return list.slice().sort(function(a, b) {
      var s = (stageOrder[a.stage] || 9) - (stageOrder[b.stage] || 9);
      return s !== 0 ? s : (prioOrder[a.priority] || 9) - (prioOrder[b.priority] || 9);
    });
  }

  var thead = '<thead><tr style="background:#f4f4f0;color:#555">' +
    '<th style="padding:8px;text-align:center">Prio.</th>' +
    '<th style="padding:8px;text-align:left">Estado</th>' +
    '<th style="padding:8px;text-align:left">Fuente</th>' +
    '<th style="padding:8px;text-align:left">Inmueble</th>' +
    '<th style="padding:8px;text-align:right">Precio</th>' +
    '<th style="padding:8px;text-align:right">€/m²</th>' +
    '<th style="padding:8px;text-align:center">Contactado</th>' +
    '<th style="padding:8px;text-align:center">Visita</th>' +
    '<th style="padding:8px;text-align:left">Notas</th>' +
    '<th style="padding:8px;text-align:center">Acciones</th>' +
    '</tr></thead>';

  if (!active.length) {
    return '<div style="text-align:center;padding:48px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa;margin-top:16px">' +
      '<div style="font-size:38px;margin-bottom:8px">🏠</div>' +
      '<div style="font-size:14px;color:#777;font-weight:500">Sin activos en el pipeline</div>' +
      '<div style="font-size:12px;margin-top:4px">Pulsa “+ Añadir activo” para empezar a trackear inmuebles.</div>' +
      '</div>';
  }

  var html = '<div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px;margin-top:16px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:11px">' + thead + '<tbody>' +
    sortAssets(active).map(function(a, i) { return renderRow(a, i); }).join('') +
    '</tbody></table></div>';

  if (archived.length) {
    html += '<div style="margin-top:12px">' +
      '<button id="dash-toggle-archived" style="padding:6px 13px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;color:#aaa;font-size:11px;cursor:pointer;font-family:inherit">' +
      (showArchived ? 'Ocultar' : 'Ver') + ' descartados y cerrados (' + archived.length + ')' +
      '</button>' +
      (showArchived ?
        '<div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px;margin-top:10px;opacity:.7">' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px">' + thead + '<tbody>' +
        sortAssets(archived).map(function(a, i) { return renderRow(a, i); }).join('') +
        '</tbody></table></div>' : '') +
      '</div>';
  }

  return html;
}

// ── MODAL FORM ────────────────────────────────────────────────────────────────

function mkInput(id, type, value, placeholder) {
  var s = 'width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:13px;font-family:inherit;color:#1a1a1a;outline:none;box-sizing:border-box';
  return '<input id="' + id + '" type="' + type + '" value="' + escD(value || '') + '" placeholder="' + escD(placeholder || '') + '" style="' + s + '">';
}

function mkSelect(id, optionsHtml) {
  var s = 'width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:13px;font-family:inherit;color:#1a1a1a;outline:none;box-sizing:border-box;background:#fff;cursor:pointer';
  return '<select id="' + id + '" style="' + s + '">' + optionsHtml + '</select>';
}

function mkLabel(text, required) {
  return '<label style="display:block;font-size:11px;color:#666;margin-bottom:3px;margin-top:12px">' + text + (required ? ' <span style="color:#dc2626">*</span>' : '') + '</label>';
}

function opts(list, selected) {
  return list.map(function(v) {
    return '<option value="' + escD(v) + '"' + (v === selected ? ' selected' : '') + '>' + escD(v) + '</option>';
  }).join('');
}

function renderModal(asset) {
  var isEdit = !!asset.id;

  var stageOpts = Object.keys(STAGE_CONFIG).map(function(s) {
    return '<option value="' + s + '"' + (s === (asset.stage || 'nuevo') ? ' selected' : '') + '>' + STAGE_CONFIG[s].label + '</option>';
  }).join('');

  var condOpts = '<option value="">— seleccionar —</option>' + Object.keys(CONDITION_OPTIONS).map(function(k) {
    return '<option value="' + k + '"' + (k === (asset.condition || '') ? ' selected' : '') + '>' + CONDITION_OPTIONS[k] + '</option>';
  }).join('');

  var prioOpts = '<option value="">— seleccionar —</option>' + PRIORITY_OPTIONS.map(function(p) {
    return '<option value="' + p + '"' + (p === (asset.priority || 'B') ? ' selected' : '') + '>Prioridad ' + p + '</option>';
  }).join('');

  var sourceOpts = '<option value="">— seleccionar —</option>' + opts(SOURCE_OPTIONS, asset.source || 'Idealista');
  var contactedOpts = '<option value="no"' + (!asset.contactedAgent ? ' selected' : '') + '>No</option><option value="yes"' + (asset.contactedAgent ? ' selected' : '') + '>Sí</option>';

  var g2 = 'display:grid;grid-template-columns:1fr 1fr;gap:0 14px';

  return '<div id="dash-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px">' +
    '<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22)">' +

    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
    '<div style="font-size:17px;font-weight:500;color:#1a1a1a">' + (isEdit ? 'Editar activo' : 'Añadir nuevo activo') + '</div>' +
    '<button id="dash-modal-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:#aaa;line-height:1;padding:0 4px">×</button>' +
    '</div>' +

    '<div style="' + g2 + '">' +

    '<div style="grid-column:1/-1">' +
    mkLabel('Título / Dirección', true) +
    mkInput('df-title', 'text', asset.title || asset.address || '', 'Calle Mayor nº 12, piso 2º...') +
    '</div>' +

    '<div>' + mkLabel('Fuente') + mkSelect('df-source', sourceOpts) + '</div>' +
    '<div>' + mkLabel('URL del anuncio') + mkInput('df-url', 'url', asset.url || '', 'https://...') + '</div>' +

    '<div>' + mkLabel('Ciudad / Municipio') + mkInput('df-city', 'text', asset.city || '', 'Sevilla, Manresa...') + '</div>' +
    '<div>' + mkLabel('Barrio / Zona') + mkInput('df-neighborhood', 'text', asset.neighborhood || '', 'Macarena, Centre...') + '</div>' +

    '<div>' + mkLabel('Precio (€)') + mkInput('df-price', 'number', asset.price || '', '120000') + '</div>' +
    '<div>' + mkLabel('Superficie (m²)') + mkInput('df-surface', 'number', asset.surface || '', '65') + '</div>' +

    '<div>' + mkLabel('Habitaciones') + mkInput('df-rooms', 'number', asset.rooms || '', '3') + '</div>' +
    '<div>' + mkLabel('Estado del inmueble') + mkSelect('df-condition', condOpts) + '</div>' +

    '<div>' + mkLabel('Estado pipeline', true) + mkSelect('df-stage', stageOpts) + '</div>' +
    '<div>' + mkLabel('Prioridad') + mkSelect('df-priority', prioOpts) + '</div>' +

    '<div>' + mkLabel('Comercial contactado') + mkSelect('df-contacted', contactedOpts) + '</div>' +
    '<div>' + mkLabel('Fecha de contacto') + mkInput('df-contactDate', 'date', asset.contactDate || '', '') + '</div>' +

    '<div>' + mkLabel('Fecha de visita') + mkInput('df-visitDate', 'date', asset.visitDate || '', '') + '</div>' +
    '<div>' + mkLabel('Importe oferta (€)') + mkInput('df-offerAmount', 'number', asset.offerAmount || '', '105000') + '</div>' +

    '<div>' + mkLabel('Latitud (mapa)') + mkInput('df-lat', 'number', asset.lat || '', '37.3898') + '</div>' +
    '<div>' + mkLabel('Longitud (mapa)') + mkInput('df-lng', 'number', asset.lng || '', '-5.9938') + '</div>' +

    '<div style="grid-column:1/-1">' + mkLabel('Notas') +
    '<textarea id="df-notes" placeholder="Observaciones, próximos pasos, pendientes..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:13px;font-family:inherit;color:#1a1a1a;outline:none;box-sizing:border-box;height:80px;resize:vertical">' + escD(asset.notes || '') + '</textarea>' +
    '</div>' +

    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:22px;justify-content:flex-end">' +
    '<button id="dash-modal-cancel" style="padding:10px 20px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;cursor:pointer;font-family:inherit;font-size:13px">Cancelar</button>' +
    '<button id="dash-modal-save" data-id="' + escD(asset.id || '') + '" style="padding:10px 22px;border:none;border-radius:8px;background:#ba7517;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500">' + (isEdit ? 'Guardar cambios' : 'Añadir activo') + '</button>' +
    '</div>' +
    '</div></div>';
}

function closeModal() {
  var el = document.getElementById('dash-modal-overlay');
  if (el) el.remove();
}

function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function nv(id) { var x = v(id); return x ? parseFloat(x) : null; }

function readForm(existingId) {
  return {
    id: existingId || newAssetId(),
    lastUpdated: todayISO(),
    title:         v('df-title'),
    source:        v('df-source'),
    url:           v('df-url'),
    city:          v('df-city'),
    neighborhood:  v('df-neighborhood'),
    price:         nv('df-price'),
    surface:       nv('df-surface'),
    rooms:         nv('df-rooms'),
    condition:     v('df-condition'),
    stage:         v('df-stage') || 'nuevo',
    priority:      v('df-priority') || 'C',
    contactedAgent: v('df-contacted') === 'yes',
    contactDate:   v('df-contactDate') || null,
    visitDate:     v('df-visitDate') || null,
    offerAmount:   nv('df-offerAmount'),
    lat:           nv('df-lat'),
    lng:           nv('df-lng'),
    notes:         v('df-notes')
  };
}

function saveFromModal(existingId) {
  var data = readForm(existingId);
  if (!data.title) { alert('Introduce un título o dirección.'); return; }

  var assets = getDashboardAssets();
  if (existingId) {
    var orig = assets.find(function(a) { return a.id === existingId; });
    data.createdAt = orig ? orig.createdAt : todayISO();
    assets = assets.map(function(a) { return a.id === existingId ? data : a; });
  } else {
    data.createdAt = todayISO();
    assets.unshift(data);
  }

  saveDashboardAssets(assets);
  closeModal();
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
}

function attachModalEvents() {
  var ov = document.getElementById('dash-modal-overlay');
  if (!ov) return;
  ov.addEventListener('click', function(e) { if (e.target === ov) closeModal(); });
  var close = document.getElementById('dash-modal-close');
  if (close) close.addEventListener('click', closeModal);
  var cancel = document.getElementById('dash-modal-cancel');
  if (cancel) cancel.addEventListener('click', closeModal);
  var save = document.getElementById('dash-modal-save');
  if (save) save.addEventListener('click', function() {
    saveFromModal(save.getAttribute('data-id') || null);
  });
}

function openAddAsset() {
  document.body.insertAdjacentHTML('beforeend', renderModal({}));
  attachModalEvents();
}

window.openEditAsset = function(id) {
  var asset = getDashboardAssets().find(function(a) { return a.id === id; });
  if (!asset) return;
  document.body.insertAdjacentHTML('beforeend', renderModal(asset));
  attachModalEvents();
};

// ── IMPORT FROM WATCHLIST ──────────────────────────────────────────────────────

function importFromWatchlist() {
  if (typeof window.getNormalizedWatchlist !== 'function') {
    alert('El módulo de Tracking no está cargado. Ve a la pestaña Tracking primero.');
    return;
  }
  var watchlist = window.getNormalizedWatchlist();
  if (!watchlist.length) {
    alert('No hay activos en el Tracking. Importa primero desde la pestaña Tracking.');
    return;
  }

  var existing = getDashboardAssets();
  var existingUrls = existing.map(function(a) { return a.url; }).filter(Boolean);
  var existingIds  = existing.map(function(a) { return a.id; });

  var toImport = watchlist.filter(function(w) {
    if (w.url && existingUrls.indexOf(w.url) >= 0) return false;
    if (existingIds.indexOf('track_' + w.id) >= 0) return false;
    return ['A', 'B'].indexOf(w.priority) >= 0;
  });

  if (!toImport.length) {
    alert('No hay activos A/B nuevos en el Tracking (o ya están todos en el dashboard).');
    return;
  }

  toImport.forEach(function(w) {
    existing.push({
      id:             'track_' + w.id,
      createdAt:      todayISO(),
      lastUpdated:    todayISO(),
      title:          w.street || w.title || w.address || '',
      source:         w.portal || 'Idealista',
      url:            w.url || '',
      city:           w.city || w.marketKey || '',
      neighborhood:   w.neighborhood || w.district || '',
      price:          w.price || null,
      surface:        w.surfaceM2 || null,
      rooms:          w.rooms || null,
      condition:      w.condition || '',
      stage:          'nuevo',
      priority:       w.priority || 'C',
      contactedAgent: false,
      contactDate:    null,
      visitDate:      null,
      offerAmount:    null,
      lat:            null,
      lng:            null,
      notes:          w.notes || ''
    });
  });

  saveDashboardAssets(existing);
  alert('Importados ' + toImport.length + ' activos A/B del Tracking al dashboard.');
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────

function deleteAsset(id) {
  var assets = getDashboardAssets();
  var asset = assets.find(function(a) { return a.id === id; });
  if (!asset || !confirm('¿Eliminar “' + (asset.title || 'este activo') + '”?')) return;
  saveDashboardAssets(assets.filter(function(a) { return a.id !== id; }));
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
}

function analyzeAsset(id) {
  var asset = getDashboardAssets().find(function(a) { return a.id === id; });
  if (!asset) return;
  if (window.S && asset.price) window.S.pc = Math.round(asset.price);
  if (window.F && asset.surface) window.F.sup = Math.round(asset.surface);
  ['rSI','rSR','rFI','rFR','rBI','rBR'].forEach(function(fn) {
    if (typeof window[fn] === 'function') { try { window[fn](); } catch (e) {} }
  });
  var btn = document.querySelector('.tab[data-tab="ap"]');
  if (typeof window.sw === 'function') window.sw('ap', btn);
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────

window._dashShowArchived = false;

function renderDashboard(el) {
  if (!el) return;
  var assets = getDashboardAssets();
  var withCoords = assets.filter(function(a) { return isFinite(parseFloat(a.lat)) && isFinite(parseFloat(a.lng)); });
  var noMap = withCoords.length === 0;

  var mapPlaceholder = noMap
    ? '<div style="height:320px;border-radius:12px;border:1px dashed #e5e5e0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9f9f7;color:#aaa">' +
      '<div style="font-size:32px;margin-bottom:8px">🗺️</div>' +
      '<div style="font-size:12px;text-align:center;line-height:1.6">Sin coordenadas todavía.<br>Añade Latitud/Longitud en cada activo<br>para verlos en el mapa.</div>' +
      '</div>'
    : '<div id="dashboard-map" style="height:320px;border-radius:12px;border:1px solid #e5e5e0;overflow:hidden"></div>';

  var legend = '<div style="background:#fff;border:1px solid #e5e5e0;border-radius:10px;padding:14px">' +
    '<div style="font-size:11px;font-weight:500;color:#555;margin-bottom:10px">Leyenda del mapa</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px">' +
    Object.keys(STAGE_CONFIG).map(function(s) {
      var c = STAGE_CONFIG[s];
      return '<div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:' + c.color + ';flex-shrink:0;border:1px solid rgba(0,0,0,.1)"></div><span style="font-size:11px;color:#555">' + c.label + '</span></div>';
    }).join('') +
    '</div></div>';

  el.innerHTML =
    '<div style="max-width:1400px">' +

    // Header
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">' +
    '<div>' +
    '<div style="font-size:19px;font-weight:500;color:#1a1a1a">Pipeline de activos</div>' +
    '<div style="font-size:11px;color:#aaa;margin-top:3px">Inmuebles en seguimiento · Idealista · Solvia · y más</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button id="dash-import-wl" style="padding:8px 14px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Importar desde Tracking</button>' +
    '<button id="dash-add" style="padding:8px 18px;border:none;border-radius:8px;background:#ba7517;color:#fff;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500">+ Añadir activo</button>' +
    '</div>' +
    '</div>' +

    // KPIs
    renderKPIs(assets) +

    // Pipeline
    renderPipeline(assets) +

    // Map + legend
    '<div style="display:grid;grid-template-columns:1fr 220px;gap:14px;margin-bottom:20px;align-items:start">' +
    '<div>' + mapPlaceholder + '</div>' +
    '<div>' + legend + '</div>' +
    '</div>' +

    // Table
    renderTable(assets, window._dashShowArchived) +

    '</div>';

  // Events
  var addBtn = document.getElementById('dash-add');
  if (addBtn) addBtn.addEventListener('click', openAddAsset);

  var importBtn = document.getElementById('dash-import-wl');
  if (importBtn) importBtn.addEventListener('click', importFromWatchlist);

  var archBtn = document.getElementById('dash-toggle-archived');
  if (archBtn) archBtn.addEventListener('click', function() {
    window._dashShowArchived = !window._dashShowArchived;
    renderDashboard(el);
  });

  el.addEventListener('click', function handler(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (action === 'edit-asset')    window.openEditAsset(id);
    else if (action === 'delete-asset')  deleteAsset(id);
    else if (action === 'analyze-asset') analyzeAsset(id);
  }, { once: false });

  // Map
  if (!noMap) {
    setTimeout(function() {
      initDashMap();
      updateDashMap(assets);
    }, 80);
  }
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

window.loadDashboard = function() {
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  if (_dashMap) setTimeout(function() { _dashMap.invalidateSize(); }, 150);
};

document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
});
