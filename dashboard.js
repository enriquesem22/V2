// dashboard.js — Pipeline principal de activos inmobiliarios
// v1.0: Dashboard con mapa, pipeline, KPIs y formulario de seguimiento CRM

var DASHBOARD_VERSION = '1.0';
var _dashboardAssets = [];
var _dashboardLoadedFromGitHub = false;

// Proxy de imágenes: weserv.nl requiere URL sin protocolo
function imgProxy(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.includes('weserv.nl')) return url;
  return 'https://images.weserv.nl/?url=' + url.replace(/^https?:\/\//, '') + '&w=800&output=jpg&we&maxage=7d';
}

// Genera <img>: 1) URL directa sin Referer, 2) fallback proxy, 3) texto "Sin foto"
function mkImg(url, style) {
  if (!url) return '';
  // proxy sin escapes HTML — lo usaremos dentro de un string JS con comillas simples
  var proxyUrl = imgProxy(url).replace(/'/g, '%27');
  // onErr es código JS puro; se HTML-escapará una sola vez al meterlo en el atributo
  var onErr = "if(this.dataset.tried){this.setAttribute('style','" +
    style.replace(/'/g, "\\'") + ";object-fit:cover;background:#f0f0eb');" +
    "this.removeAttribute('src');this.textContent='Sin foto';" +
    "}else{this.dataset.tried=1;this.src='" + proxyUrl + "';}";
  return '<img src="' + escD(url) + '" referrerpolicy="no-referrer"' +
    ' onerror="' + escD(onErr) + '"' +
    ' style="' + style + '">';
}

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

// ── UTILS ─────────────────────────────────────────────────────────────────────

function showDashToast(msg, ok) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
    'background:' + (ok ? '#15803d' : '#b91c1c') + ';color:#fff;padding:9px 20px;' +
    'border-radius:8px;font-size:12px;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,.25);' +
    'white-space:nowrap;pointer-events:none;transition:opacity .3s';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 350); }, 3200);
}

// ── STORAGE ───────────────────────────────────────────────────────────────────

function getDashboardAssets() {
  return _dashboardAssets.slice();
}

function saveDashboardAssets(assets) {
  _dashboardAssets = Array.isArray(assets) ? assets.slice() : [];
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
  var btnAnalyze = '<button data-action="analyze-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #16a34a;border-radius:5px;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:11px;font-family:inherit">Ver ficha</button>';
  var btnDel     = '<button data-action="delete-asset"  data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #fca5a5;border-radius:5px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:11px;font-family:inherit">×</button>';

  var photos = Array.isArray(asset.foto_urls) ? asset.foto_urls : [];
  var thumbSrc = asset.foto_portada || (photos.length ? photos[0] : '');
  var thumbHtml = thumbSrc ? mkImg(thumbSrc, 'width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e0;flex-shrink:0;display:block') : '';

  return '<tr style="background:' + (i % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
    '<td style="padding:8px;text-align:center">' + prioBadge(asset.priority) + '</td>' +
    '<td style="padding:8px">' + stageBadge(asset.stage) + '</td>' +
    '<td style="padding:8px;font-size:11px;color:#ba7517;font-weight:500">' + escD(asset.source || '—') + '</td>' +
    '<td style="padding:8px;min-width:190px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      thumbHtml +
      '<div>' +
        '<div data-action="analyze-asset" data-id="' + asset.id + '" style="font-weight:500;color:#ba7517;font-size:12px;cursor:pointer;text-decoration:underline;text-decoration-style:dotted" title="Abrir análisis">' + escD(asset.title || asset.address || '—') + '</div>' +
        '<div style="color:#aaa;font-size:10px;margin-top:2px">' + escD(asset.city || '') + (asset.neighborhood ? ' · ' + escD(asset.neighborhood) : '') + (asset.surface ? ' · ' + asset.surface + ' m²' : '') + (asset.rooms ? ' · ' + asset.rooms + ' hab.' : '') + '</div>' +
        (asset.url ? '<a href="' + escD(asset.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a>' : '') +
      '</div>' +
      '</div>' +
    '</td>' +
    '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;font-weight:600;white-space:nowrap">' + moneyD(asset.price) + '</td>' +
    '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;color:#888;font-size:11px">' + pm2 + '</td>' +
    '<td style="padding:8px;text-align:center;font-size:11px">' + agentCell + '</td>' +
    '<td style="padding:8px;text-align:center;font-size:11px">' + visitCell + '</td>' +
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

    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
    '<div style="font-size:17px;font-weight:500;color:#1a1a1a">' + (isEdit ? 'Editar activo' : 'Añadir nuevo activo') + '</div>' +
    '<button id="dash-modal-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:#aaa;line-height:1;padding:0 4px">×</button>' +
    '</div>' +

    // AI fill section
    '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;margin-bottom:18px">' +
    '<div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:10px">✨ Rellenar campos con IA</div>' +

    '<div style="font-size:10px;color:#92400e;margin-bottom:6px;font-weight:500">Opción 1 — Pega el link del anuncio:</div>' +
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
    '<input id="df-ai-url" type="url" placeholder="https://www.idealista.com/inmueble/..." ' +
    'style="flex:1;padding:8px 10px;border:1px solid #fcd34d;border-radius:6px;font-size:12px;font-family:inherit;outline:none;background:#fff;color:#1a1a1a">' +
    '<button id="df-ai-btn" onclick="runAIFill(\'url\')" style="padding:8px 14px;border:none;border-radius:6px;background:#d97706;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;white-space:nowrap">Leer y rellenar →</button>' +
    '</div>' +

    '<div style="font-size:10px;color:#92400e;margin-bottom:4px;font-weight:500">Opción 2 — Pega el texto del anuncio directamente:</div>' +
    '<textarea id="df-ai-text" rows="4" placeholder="Copia y pega aquí el texto del anuncio (Ctrl+A en la página del anuncio, Ctrl+C, y pega aquí)..." ' +
    'style="width:100%;padding:8px 10px;border:1px solid #fcd34d;border-radius:6px;font-size:11px;font-family:inherit;outline:none;background:#fff;color:#1a1a1a;resize:vertical;box-sizing:border-box;margin-bottom:6px"></textarea>' +
    '<button id="df-ai-txt-btn" onclick="runAIFill(\'text\')" style="padding:7px 14px;border:none;border-radius:6px;background:#92400e;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Analizar texto →</button>' +

    '<div id="df-ai-status" style="font-size:11px;color:#92400e;margin-top:8px;min-height:16px;line-height:1.4"></div>' +
    '<div id="df-ai-analysis" style="display:none;margin-top:10px"></div>' +
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

    '<div style="grid-column:1/-1">' + mkLabel('Foto portada (URL)') +
    mkInput('df-foto-portada', 'url', asset.foto_portada || '', 'https://...') +
    '</div>' +

    '<div style="grid-column:1/-1">' + mkLabel('Notas') +
    '<textarea id="df-notes" placeholder="Observaciones, próximos pasos, pendientes..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:13px;font-family:inherit;color:#1a1a1a;outline:none;box-sizing:border-box;height:80px;resize:vertical">' + escD(asset.notes || '') + '</textarea>' +
    '</div>' +

    '</div>' +

    '<input type="hidden" id="df-foto-urls" value="' + escD(JSON.stringify(asset.foto_urls || [])) + '">' +

    // Photo strip preview (if existing photos)
    (asset.foto_urls && asset.foto_urls.length ?
      '<div style="margin-top:12px;display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">' +
      asset.foto_urls.slice(0, 8).map(function(u) {
        return mkImg(u, 'width:72px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e0;flex-shrink:0');
      }).join('') +
      '</div>' : '') +

    '<div style="display:flex;gap:10px;margin-top:22px;justify-content:flex-end">' +
    '<button id="dash-modal-cancel" style="padding:10px 20px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;cursor:pointer;font-family:inherit;font-size:13px">Cancelar</button>' +
    '<button id="dash-modal-save" data-id="' + escD(asset.id || '') + '" style="padding:10px 22px;border:none;border-radius:8px;background:#ba7517;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500">' + (isEdit ? 'Guardar cambios' : 'Añadir activo') + '</button>' +
    '</div>' +
    '</div></div>';
}


window.runAIFill = async function(mode) {
  if (typeof window.analyzeTextForAsset !== 'function') {
    alert('El módulo de IA no está cargado todavía. Espera un momento y vuelve a intentarlo.');
    return;
  }

  function setStatus(msg, color) {
    var el = document.getElementById('df-ai-status');
    if (el) { el.textContent = msg; el.style.color = color || '#92400e'; }
  }
  function setField(id, value) {
    var el = document.getElementById(id);
    if (el && value !== null && value !== undefined && String(value).trim() !== '') el.value = value;
  }
  function setSelect(id, value) {
    var el = document.getElementById(id);
    if (!el || !value) return;
    var s = String(value);
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === s || el.options[i].text === s) { el.selectedIndex = i; return; }
    }
  }
  function fmtNum(n) { return n ? Number(n).toLocaleString('es-ES') : '—'; }
  function escH(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var urlBtn   = document.getElementById('df-ai-btn');
  var txtBtn   = document.getElementById('df-ai-txt-btn');
  var activeBtn = mode === 'text' ? txtBtn : urlBtn;
  var origLabel = activeBtn ? activeBtn.textContent : '';
  if (activeBtn) { activeBtn.disabled = true; activeBtn.textContent = 'Procesando...'; }

  var analysisEl = document.getElementById('df-ai-analysis');
  if (analysisEl) { analysisEl.style.display = 'none'; analysisEl.innerHTML = ''; }

  try {
    var data;
    var url = (document.getElementById('df-ai-url') || {}).value || '';

    if (mode === 'text') {
      var text = (document.getElementById('df-ai-text') || {}).value || '';
      if (!text.trim()) { setStatus('Pega primero el texto del anuncio en el área de texto.', '#dc2626'); return; }
      data = await window.analyzeTextForAsset(text.trim(), setStatus);
    } else {
      if (!url.trim()) { setStatus('Pega primero una URL de anuncio.', '#dc2626'); return; }
      setField('df-url', url.trim());
      data = await window.fillAssetWithAI(url.trim(), setStatus);
    }

    // ── PASO 1: Rellenar formulario ───────────────────────────────────────────
    // Mapeo del nuevo schema rico → campos del formulario
    var titleVal = data.address_or_area || data.title;
    var cityVal  = data.municipality || data.city;
    var m2Val    = data.built_area_m2 || data.surface;
    var roomsVal = data.bedrooms || data.rooms;

    if (titleVal)          setField('df-title',         titleVal);
    if (cityVal)           setField('df-city',           cityVal);
    if (data.neighborhood) setField('df-neighborhood',   data.neighborhood);
    if (data.price)        setField('df-price',          data.price);
    if (m2Val)             setField('df-surface',        m2Val);
    if (roomsVal)          setField('df-rooms',          roomsVal);
    if (data.lat)          setField('df-lat',            data.lat);
    if (data.lng)          setField('df-lng',            data.lng);
    if (data.condition)    setSelect('df-condition',     data.condition);
    if (data.source)       setSelect('df-source',        data.source);
    if (url && !document.getElementById('df-url').value) setField('df-url', url.trim());
    if (data.foto_urls && data.foto_urls.length) {
      var fotoEl = document.getElementById('df-foto-urls');
      if (fotoEl) fotoEl.value = JSON.stringify(data.foto_urls);
    }

    var basicMap = {title: titleVal, ciudad: cityVal, barrio: data.neighborhood,
                    precio: data.price, m2: m2Val, habitaciones: roomsVal,
                    estado: data.condition, fuente: data.source};
    var filled = Object.keys(basicMap).filter(function(k) {
      var v = basicMap[k]; return v !== null && v !== undefined && String(v).trim() !== '';
    });
    setStatus('✓ Rellenados ' + filled.length + ' campos: ' + filled.join(', ') + '. Revisa y ajusta.', '#15803d');

    // ── PASO 2: Panel de análisis IA ─────────────────────────────────────────
    if (!analysisEl) { if (activeBtn) { activeBtn.disabled = false; activeBtn.textContent = origLabel; } return; }
    var html = '';

    // Cálculos de inversión
    var priceN = parseFloat(data.price);
    var m2N    = parseFloat(m2Val);
    if (priceN && m2N) {
      var ppm2 = Math.round(priceN / m2N);
      var buyC = Math.round(priceN * 0.11); // ITP ~8% + notaría + registro + gestoría ~3%
      var refMap = {a_reformar: 550, segunda_mano: 150, buen_estado: 50, reformado: 0, obra_nueva: 0};
      var refPm2 = refMap[data.condition] !== undefined ? refMap[data.condition] : 300;
      var refC  = Math.round(m2N * refPm2);
      var totalInv = priceN + buyC + refC;
      html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;margin-bottom:8px">' +
        '<div style="font-size:11px;font-weight:600;color:#15803d;margin-bottom:6px">📊 Análisis rápido de inversión</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;font-size:11px;color:#166534">' +
        '<div>Precio/m²: <strong>' + fmtNum(ppm2) + ' €</strong></div>' +
        '<div>Gastos compra est. (11%): <strong>' + fmtNum(buyC) + ' €</strong></div>' +
        '<div>Reforma est. (' + refPm2 + ' €/m²): <strong>' + fmtNum(refC) + ' €</strong></div>' +
        '<div>Inversión total est.: <strong>' + fmtNum(totalInv) + ' €</strong></div>' +
        '</div></div>';
    }

    // Resumen
    if (data.description_summary) {
      html += '<div style="font-size:11px;color:#444;line-height:1.5;background:#f9f9f7;border-radius:6px;padding:8px 10px;margin-bottom:8px">' +
        '<strong>Resumen:</strong> ' + escH(data.description_summary) + '</div>';
    }

    // Puntos positivos
    if (data.positive_points && data.positive_points.length) {
      html += '<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:600;color:#15803d;margin-bottom:2px">✅ Puntos positivos</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:11px;color:#166534;line-height:1.6">' +
        data.positive_points.map(function(p) { return '<li>' + escH(p) + '</li>'; }).join('') + '</ul></div>';
    }

    // Riesgos
    if (data.risks_or_unknowns && data.risks_or_unknowns.length) {
      html += '<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:600;color:#b91c1c;margin-bottom:2px">⚠️ Riesgos / incógnitas</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:11px;color:#7f1d1d;line-height:1.6">' +
        data.risks_or_unknowns.map(function(r) { return '<li>' + escH(r) + '</li>'; }).join('') + '</ul></div>';
    }

    // Datos que faltan
    if (data.missing_data && data.missing_data.length) {
      html += '<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:#b45309;margin-bottom:2px">❓ Datos que faltan preguntar</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:11px;color:#92400e;line-height:1.6">' +
        data.missing_data.map(function(m) { return '<li>' + escH(m) + '</li>'; }).join('') + '</ul></div>';
    }

    // Ficha técnica extra
    var extras = [];
    if (data.floor) extras.push('Planta: ' + escH(data.floor));
    if (data.bathrooms) extras.push('Baños: ' + data.bathrooms);
    if (data.has_elevator === true) extras.push('Ascensor: Sí');
    else if (data.has_elevator === false) extras.push('Ascensor: No');
    if (data.useful_area_m2) extras.push('Útiles: ' + data.useful_area_m2 + ' m²');
    if (data.province) extras.push('Provincia: ' + escH(data.province));
    if (data.energy_certificate && (data.energy_certificate.consumption || data.energy_certificate.emissions)) {
      var ec = [];
      if (data.energy_certificate.consumption) ec.push(data.energy_certificate.consumption);
      if (data.energy_certificate.emissions) ec.push(data.energy_certificate.emissions + ' CO₂');
      extras.push('Energía: ' + ec.join(' · '));
    }
    if (data.advertiser) extras.push('Anunciante: ' + escH(data.advertiser));
    if (data.listing_reference) extras.push('Ref: ' + escH(data.listing_reference));
    if (data.last_updated) extras.push('Actualizado: ' + escH(data.last_updated));

    if (extras.length) {
      html += '<div style="font-size:10px;color:#666;line-height:1.8;border-top:1px solid #e5e5e0;padding-top:6px">' +
        extras.join(' &nbsp;·&nbsp; ') + '</div>';
    }

    if (html) {
      analysisEl.innerHTML = html;
      analysisEl.style.display = 'block';
    }

  } catch(e) {
    setStatus('✗ ' + e.message, '#dc2626');
    console.error('AI fill error:', e);
  }

  if (activeBtn) { activeBtn.disabled = false; activeBtn.textContent = origLabel; }
};

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
    notes:         v('df-notes'),
    foto_portada:  v('df-foto-portada'),
    foto_urls:     (function() { try { return JSON.parse(document.getElementById('df-foto-urls').value || '[]'); } catch(e) { return []; } })()
  };
}

async function saveFromModal(existingId) {
  var data = readForm(existingId);
  if (!data.title) { alert('Introduce un título o dirección.'); return; }
  if (typeof window.githubSaveDashboardAsset !== 'function') {
    alert('GitHub no está disponible todavía. Recarga la página e inténtalo de nuevo.');
    return;
  }

  var assets = getDashboardAssets();
  if (existingId) {
    var orig = assets.find(function(a) { return a.id === existingId; });
    data.createdAt = orig ? orig.createdAt : todayISO();
    assets = assets.map(function(a) { return a.id === existingId ? data : a; });
  } else {
    data.createdAt = todayISO();
    assets.unshift(data);
  }

  var saveBtn = document.getElementById('dash-modal-save');
  var oldLabel = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

  var result = await window.githubSaveDashboardAsset(data);
  if (!result.ok) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = oldLabel; }
    if (result.reason === 'no-token') {
      alert('Para guardar en GitHub necesitas conectar GitHub en la pestaña Importar. El token no se guarda en el navegador.');
    } else {
      alert('No se pudo guardar en GitHub: ' + result.reason);
    }
    return;
  }

  saveDashboardAssets(assets);
  closeModal();
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  showDashToast('Guardado en GitHub - ' + (data.title || data.id), true);
}

function closeModal() {
  document.querySelectorAll('#dash-modal-overlay').forEach(function(el) { el.remove(); });
}

function openModal(asset) {
  // Eliminar TODOS los modales existentes antes de crear uno nuevo
  closeModal();

  // Crear el elemento directamente (evita el problema de getElementById con duplicados)
  var tmp = document.createElement('div');
  tmp.innerHTML = renderModal(asset);
  var ov = tmp.firstElementChild;
  document.body.appendChild(ov);

  // Enganchamos eventos al ov concreto, nunca a getElementById
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  var btnClose  = ov.querySelector('#dash-modal-close');
  var btnCancel = ov.querySelector('#dash-modal-cancel');
  var btnSave   = ov.querySelector('#dash-modal-save');
  if (btnClose)  btnClose.addEventListener('click',  function() { ov.remove(); });
  if (btnCancel) btnCancel.addEventListener('click', function() { ov.remove(); });
  if (btnSave)   btnSave.addEventListener('click', function() {
    saveFromModal(btnSave.getAttribute('data-id') || null);
  });
}

function openAddAsset() { openModal({}); }

window.openEditAsset = function(id) {
  var asset = getDashboardAssets().find(function(a) { return a.id === id; });
  if (!asset) return;
  openModal(asset);
};

// ── IMPORT FROM WATCHLIST ──────────────────────────────────────────────────────

async function importFromWatchlist() {
  if (typeof window.githubSaveDashboardAsset !== 'function') {
    alert('GitHub no está disponible todavía. Recarga la página e inténtalo de nuevo.');
    return;
  }
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

  var imported = toImport.map(function(w) {
    return {
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
    };
  });

  for (var i = 0; i < imported.length; i++) {
    var result = await window.githubSaveDashboardAsset(imported[i]);
    if (!result.ok) {
      if (result.reason === 'no-token') {
        alert('Para importar al Dashboard necesitas conectar GitHub en la pestaña Importar. El token no se guarda en el navegador.');
      } else {
        alert('No se pudo guardar en GitHub: ' + result.reason);
      }
      return;
    }
  }

  saveDashboardAssets(imported.concat(existing));
  alert('Importados ' + imported.length + ' activos A/B del Tracking a GitHub.');
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
}

// ── ASSET DETAIL (FICHA) ──────────────────────────────────────────────────────

function calcFlip(asset) {
  var p = parseFloat(asset.price), m2 = parseFloat(asset.surface);
  if (!isFinite(p) || !isFinite(m2) || p <= 0 || m2 <= 0) return null;
  var refMap = { a_reformar: 550, segunda_mano: 150, buen_estado: 50, reformado: 0, obra_nueva: 0 };
  var refPm2 = refMap[asset.condition] !== undefined ? refMap[asset.condition] : 300;
  var buyC   = Math.round(p * 0.11);
  var refC   = Math.round(m2 * refPm2);
  var total  = p + buyC + refC;
  var sale   = Math.round(total * 1.25);
  var profit = sale - total;
  var roi    = Math.round((profit / total) * 100);
  return { p: p, m2: m2, ppm2: Math.round(p/m2), refPm2: refPm2, buyC: buyC, refC: refC, total: total, sale: sale, profit: profit, roi: roi };
}

function renderAssetDetail(asset) {
  var el = document.getElementById('adp-content');
  if (!el) return;

  var flip = calcFlip(asset);
  var photos = Array.isArray(asset.foto_urls) ? asset.foto_urls.filter(Boolean) : [];
  var coverSrc = asset.foto_portada || (photos.length ? photos[0] : '');
  var stageC = stageCfg(asset.stage);

  // ── Foto portada ──
  var coverHtml = coverSrc ? mkImg(coverSrc, 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:1px solid #e5e5e0;flex-shrink:0') : '';

  // ── Strip fotos adicionales ──
  var extraPhotos = photos.filter(function(u) { return u !== coverSrc; });
  var photosHtml = extraPhotos.length
    ? '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:20px;scrollbar-width:thin">' +
      extraPhotos.map(function(u) {
        return mkImg(u, 'height:140px;min-width:200px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e0;flex-shrink:0');
      }).join('') + '</div>'
    : '';

  // ── Helpers ──
  function row(label, value, color) {
    if (!value && value !== 0) return '';
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid #f5f5f0">' +
      '<span style="font-size:11px;color:#888">' + label + '</span>' +
      '<span style="font-size:13px;font-weight:500;color:' + (color || '#1a1a1a') + '">' + value + '</span>' +
      '</div>';
  }
  function card(title, body, accent) {
    return '<div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:16px 18px;margin-bottom:14px">' +
      '<div style="font-size:11px;font-weight:600;color:' + (accent || '#555') + ';text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">' + title + '</div>' +
      body + '</div>';
  }

  // ── Datos básicos ──
  var basicBody =
    row('Precio', moneyD(asset.price), '#ba7517') +
    row('Superficie', asset.surface ? asset.surface + ' m²' : null) +
    row('Precio/m²', (asset.price && asset.surface) ? Math.round(asset.price / asset.surface).toLocaleString('es-ES') + ' €/m²' : null) +
    row('Habitaciones', asset.rooms ? asset.rooms + ' hab.' : null) +
    row('Estado', asset.condition ? CONDITION_OPTIONS[asset.condition] || asset.condition : null) +
    row('Fuente', asset.source) +
    (asset.url ? '<div style="padding:7px 0;border-bottom:1px solid #f5f5f0"><a href="' + escD(asset.url) + '" target="_blank" rel="noopener" style="font-size:12px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a></div>' : '');

  // ── Localización ──
  var locParts = [asset.city, asset.neighborhood, asset.province].filter(Boolean);
  var locBody = locParts.length ? row('Ubicación', locParts.join(' · ')) : '<div style="font-size:11px;color:#aaa">Sin datos de ubicación</div>';

  // ── Pipeline CRM ──
  var crmBody =
    row('Estado pipeline', stageC.label) +
    row('Prioridad', asset.priority ? 'Prioridad ' + asset.priority : null) +
    row('Agente contactado', asset.contactedAgent ? '✓ Sí' : '○ No') +
    row('Fecha contacto', asset.contactDate) +
    row('Fecha visita', asset.visitDate, '#8b5cf6') +
    row('Importe oferta', asset.offerAmount ? moneyD(asset.offerAmount) : null, '#ef4444');

  // ── Análisis flip ──
  var flipBody;
  if (flip) {
    var roiColor = flip.roi >= 20 ? '#16a34a' : flip.roi >= 10 ? '#d97706' : '#dc2626';
    flipBody =
      row('Precio de compra', moneyD(flip.p)) +
      row('Gastos compra (11%)', moneyD(flip.buyC)) +
      row('Reforma est. (' + flip.refPm2 + ' €/m²)', moneyD(flip.refC)) +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:2px solid #e5e5e0;margin-top:4px">' +
        '<span style="font-size:11px;font-weight:600;color:#1a1a1a">Inversión total</span>' +
        '<span style="font-size:15px;font-weight:700;color:#1a1a1a;font-family:\'Courier New\',monospace">' + moneyD(flip.total) + '</span>' +
      '</div>' +
      row('Precio venta est. (×1.25)', moneyD(flip.sale), '#16a34a') +
      row('Beneficio bruto', moneyD(flip.profit), '#16a34a') +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px">' +
        '<span style="font-size:12px;font-weight:600;color:#555">ROI estimado</span>' +
        '<span style="font-size:24px;font-weight:700;color:' + roiColor + ';font-family:\'Courier New\',monospace">' + flip.roi + '%</span>' +
      '</div>';
  } else {
    flipBody = '<div style="font-size:11px;color:#aaa">Introduce precio y superficie para calcular el flip.</div>';
  }

  // ── Notas ──
  var notasBody = asset.notes
    ? '<div style="font-size:12px;color:#444;line-height:1.7;white-space:pre-wrap">' + escD(asset.notes) + '</div>'
    : '<div style="font-size:11px;color:#aaa">Sin notas.</div>';

  // ── Layout ──
  el.innerHTML =
    '<div style="max-width:900px">' +

    // Header
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">' +
      '<div style="display:flex;gap:14px;align-items:flex-start">' +
        coverHtml +
        '<div>' +
          '<div style="font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:4px">' + escD(asset.title || asset.address || 'Sin título') + '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            stageBadge(asset.stage) + ' ' + prioBadge(asset.priority) +
            (asset.city ? '<span style="font-size:11px;color:#888">' + escD(asset.city) + (asset.neighborhood ? ' · ' + escD(asset.neighborhood) : '') + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button data-action="edit-asset" data-id="' + asset.id + '" style="padding:8px 16px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;cursor:pointer;font-size:12px;font-family:inherit;font-weight:500">Editar ficha</button>' +
        '<button onclick="volverAlDashboard()" style="padding:8px 16px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;cursor:pointer;font-size:12px;font-family:inherit">← Dashboard</button>' +
      '</div>' +
    '</div>' +

    // Fotos
    photosHtml +

    // Grid 2 columnas en pantallas grandes
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +

      '<div>' +
        card('Datos del inmueble', basicBody) +
        card('Localización', locBody) +
        card('Notas', notasBody) +
      '</div>' +

      '<div>' +
        card('Pipeline CRM', crmBody) +
        card('Análisis Flip', flipBody, '#ba7517') +
      '</div>' +

    '</div>' +
    '</div>';

  // Bind edit button
  el.querySelector('[data-action="edit-asset"]').addEventListener('click', function() {
    window.openEditAsset(asset.id);
  });
}

window.openAssetDetail = function(id) {
  var asset = getDashboardAssets().find(function(a) { return a.id === id; });
  if (!asset) return;

  // Poblar calculadores con datos del asset (o dejar en 0 si no hay datos)
  if (window.S) window.S.pc = asset.price ? Math.round(asset.price) : 0;
  if (window.F) {
    window.F.sup = asset.surface ? Math.round(asset.surface) : 0;
    if (asset.price) window.F.pco = Math.round(asset.price);
  }
  if (window.B) {
    window.B.sup = asset.surface ? Math.round(asset.surface) : 0;
    if (asset.price) window.B.pco = Math.round(asset.price);
  }
  ['rSI','rSR','rFI','rFR','rBI','rBR'].forEach(function(fn) {
    if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
  });
  if (window.GEO && (asset.city || asset.neighborhood)) {
    var cityLow = (asset.city || '').toLowerCase();
    var nbLow   = (asset.neighborhood || '').toLowerCase();
    Object.keys(window.GEO).forEach(function(prov) {
      var muns = window.GEO[prov].municipios || {};
      Object.keys(muns).forEach(function(mun) {
        if (mun.toLowerCase().includes(cityLow) || cityLow.includes(mun.toLowerCase())) {
          window.SEL = window.SEL || {};
          window.SEL.prov = prov; window.SEL.mun = mun; window.SEL.bar = ''; window.SEL.sub = '';
          Object.keys(muns[mun].barrios || {}).forEach(function(bar) {
            if (nbLow && bar.toLowerCase().includes(nbLow)) window.SEL.bar = bar;
          });
        }
      });
    });
    if (typeof window.rebuildSelects === 'function') setTimeout(window.rebuildSelects, 80);
    if (typeof window.doMapUpdate    === 'function') setTimeout(window.doMapUpdate,    200);
  }

  // Renderizar ficha
  renderAssetDetail(asset);

  // Mostrar pestañas de activo (todas menos Importar)
  document.querySelectorAll('#main-tabs .tab').forEach(function(t) {
    t.style.display = (t.getAttribute('data-tab') === 'ip') ? 'none' : '';
  });

  // Poner nombre del asset en la pestaña Ficha
  var adpTab = document.querySelector('.tab[data-tab="adp"]');
  if (adpTab) adpTab.textContent = (asset.title || asset.address || 'Ficha').substring(0, 28);

  // Navegar a Ficha
  if (typeof window.sw === 'function') window.sw('adp', adpTab);
};

window.volverAlDashboard = function() {
  document.querySelectorAll('#main-tabs .app-tab').forEach(function(t) { t.style.display = 'none'; });
  var adpTab = document.querySelector('.tab[data-tab="adp"]');
  if (adpTab) adpTab.textContent = 'Ficha';
  var dpTab = document.querySelector('.tab[data-tab="dp"]');
  if (typeof window.sw === 'function') window.sw('dp', dpTab);
  if (typeof window.loadDashboard === 'function') window.loadDashboard();
};

// ── ACTIONS ───────────────────────────────────────────────────────────────────

async function deleteAsset(id) {
  var assets = getDashboardAssets();
  var asset = assets.find(function(a) { return a.id === id; });
  if (!asset || !confirm('¿Eliminar “' + (asset.title || 'este activo') + '”?')) return;

  if (typeof window.githubDeleteDashboardAsset !== 'function') {
    alert('GitHub no está disponible todavía. Recarga la página e inténtalo de nuevo.');
    return;
  }

  var result = await window.githubDeleteDashboardAsset(id);
  if (!result.ok) {
    if (result.reason === 'no-token') {
      alert('Para borrar en GitHub necesitas conectar GitHub en la pestaña Importar. El token no se guarda en el navegador.');
    } else {
      alert('No se pudo borrar en GitHub: ' + result.reason);
    }
    return;
  }

  saveDashboardAssets(assets.filter(function(a) { return a.id !== id; }));
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  showDashToast('Eliminado de GitHub - ' + (asset.title || id), true);
}

function analyzeAsset(id) {
  var asset = getDashboardAssets().find(function(a) { return a.id === id; });
  if (!asset) return;

  window.openAssetDetail(asset.id);
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
    '<button id="dash-import-wl" style="padding:8px 14px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Importar Tracking</button>' +
    '<button id="dash-gh-sync" title="Cargar activos desde GitHub" style="padding:8px 14px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">GitHub</button>' +
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

  var ghBtn = document.getElementById('dash-gh-sync');
  if (ghBtn) ghBtn.addEventListener('click', syncDashboardFromGitHub);

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

// ── GITHUB SYNC ───────────────────────────────────────────────────────────────

async function syncDashboardFromGitHub() {
  var btn = document.getElementById('dash-gh-sync');
  if (btn) { btn.textContent = 'Sincronizando...'; btn.disabled = true; }

  if (typeof window.githubLoadDashboardAssets !== 'function') {
    showDashToast('GitHub no está disponible todavía', false);
    if (btn) { btn.textContent = 'GitHub'; btn.disabled = false; }
    return;
  }

  var ghAssets = await window.githubLoadDashboardAssets();

  if (ghAssets === null) {
    showDashToast('No se pudieron leer los activos de GitHub', false);
    if (btn) { btn.textContent = 'GitHub'; btn.disabled = false; }
    return;
  }

  ghAssets.sort(function(a, b) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  saveDashboardAssets(ghAssets);
  _dashboardLoadedFromGitHub = true;
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  showDashToast('Cargados ' + ghAssets.length + ' activos desde GitHub', true);

  if (btn) { btn.textContent = 'GitHub'; btn.disabled = false; }
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

window.loadDashboard = function() {
  // Al entrar al dashboard, ocultar todas las pestañas secundarias
  document.querySelectorAll('#main-tabs .app-tab').forEach(function(t) { t.style.display = 'none'; });
  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  if (_dashMap) setTimeout(function() { _dashMap.invalidateSize(); }, 150);
  if (!_dashboardLoadedFromGitHub) syncDashboardFromGitHub();
};

document.addEventListener('DOMContentLoaded', function() {
  // Ocultar pestañas secundarias al inicio (por si el HTML cacheado no tiene display:none)
  document.querySelectorAll('.app-tab').forEach(function(t) { t.style.display = 'none'; });

  var el = document.getElementById('dp-content');
  if (el) renderDashboard(el);
  if (!_dashboardLoadedFromGitHub) syncDashboardFromGitHub();
});
