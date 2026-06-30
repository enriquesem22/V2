// ficha-analisis-patch.js — Guardar y restaurar el análisis financiero dentro de cada ficha
// v2.39: añade el botón "Guardar análisis en la ficha" (que los patches de inversión
// anteriores eliminaban al reescribir la tarjeta) y restaura S/F/B/CATS guardados al abrir.
(function(){
  'use strict';

  window.RETURN_FICHA_ANALISIS_VERSION = '2.45';

  // ── Estilos de coherencia visual para todas las pestañas de la ficha ──
  (function injectCoherenceStyles(){
    if (document.getElementById('ficha-coherence-styles')) return;
    var st = document.createElement('style');
    st.id = 'ficha-coherence-styles';
    st.textContent = [
      '/* Mismo ancho y centrado en todas las pestañas de la ficha */',
      '#adp-content > div, #mp > .g2, #pp > #presupuesto, #fp > div, #bp > div {',
      '  max-width: 1000px !important; margin-left: auto !important; margin-right: auto !important;',
      '}',
      '/* Tarjetas con el mismo radio en todas las pestañas */',
      '#mp .sec, #pp .sec, #fp .sec, #bp .sec,',
      '#mp .mkt-card, #pp .cat-block, #pp .pb-total-card,',
      '#mp .sum-card, #fp .sum-card, #bp .sum-card,',
      '#mp .verdict, #fp .verdict, #bp .verdict,',
      '#mp .note-card, #fp .refbox, #bp .refbox { border-radius: 12px !important; }',
      '/* Espacio inferior cuando la barra de edición está fija abajo */',
      'body.ficha-editing .panel { padding-bottom: 88px; }'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  })();

  // ── 0) Fuente de verdad única: si el activo tiene análisis guardado, todas las vistas
  //    (tabla del dashboard, tarjeta de la ficha, etc.) usan ESOS números, no la estimación. ──
  var oldInvestmentFromAsset = window.investmentFromAsset;
  window.investmentFromAsset = function(asset){
    if (asset && asset.analisis && asset.analisis.resultado) {
      var an = asset.analisis;
      return {
        s: an.S || {},
        f: an.F || {},
        b: an.B || {},
        flip: an.resultado.flip || null,
        btr: an.resultado.btr || null
      };
    }
    return (typeof oldInvestmentFromAsset === 'function') ? oldInvestmentFromAsset(asset) : null;
  };

  // ── 0b) Tabla del dashboard: usar la MISMA fuente y el MISMO formato que la ficha ──
  // (renderRow del unify-patch llamaba a su investmentFromAsset interno y redondeaba el ROI
  //  Flip a entero; aquí usamos window.investmentFromAsset y 1 decimal, igual que la ficha.)
  // Mismo formato exacto que la ficha (app.js: ep = n.toFixed(1)+'%')
  function pctF(v){
    if (typeof window.ep === 'function') return window.ep(v);
    return (isFinite(v) && !isNaN(v)) ? v.toFixed(1) + '%' : '—';
  }
  function euroF(v){
    if (typeof window.ef === 'function') return window.ef(v);
    return isFinite(v) ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' €' : '—';
  }
  function escF(s){
    if (typeof window.escD === 'function') return window.escD(s);
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]; });
  }
  function colF(v, good, mid){ return v >= good ? '#16a34a' : v >= mid ? '#d97706' : '#dc2626'; }

  window.renderRow = function(asset, i){
    var inv = window.investmentFromAsset(asset) || {};
    var flip = inv.flip, btr = inv.btr;
    var pm2 = (asset.price && asset.surface) ? Math.round(asset.price / asset.surface).toLocaleString('es-ES') + ' €/m²' : '—';

    var flipCell = '<span style="color:#d1d5db;font-size:11px">—</span>';
    if (flip && isFinite(flip.rc)) {
      flipCell = '<div style="font-size:13px;font-weight:600;color:' + colF(flip.rc, 25, 15) + ';line-height:1.2">' + pctF(flip.rc) + '</div>' +
        '<div style="font-size:10px;color:#888;font-family:\'Courier New\',monospace">' + euroF(flip.mn) + '</div>';
    }

    var btrCell = '<span style="color:#d1d5db;font-size:11px">—</span>';
    if (btr) {
      var metric = inv.s && inv.s.fin ? btr.coc : btr.rn;
      btrCell = '<div style="font-size:13px;font-weight:600;color:' + colF(metric, 7, 5) + ';line-height:1.2">' + pctF(metric) + '</div>' +
        '<div style="font-size:10px;color:#888;font-family:\'Courier New\',monospace">' + euroF(btr.bn) + '/año</div>';
    }

    var btnAnalyze = '<button data-action="analyze-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #16a34a;border-radius:5px;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:11px;font-family:inherit">Ficha</button>';
    var btnDel = '<button data-action="delete-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #fca5a5;border-radius:5px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:11px;font-family:inherit">×</button>';
    var photos = Array.isArray(asset.foto_urls) ? asset.foto_urls : [];
    var thumbSrc = asset.foto_portada || (photos.length ? photos[0] : '');
    var thumbHtml = thumbSrc && typeof window.mkImg === 'function' ? window.mkImg(thumbSrc, 'width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e0;flex-shrink:0;display:block') : '';

    return '<tr style="background:' + (i % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
      '<td style="padding:8px;text-align:center">' + (typeof window.prioBadge==='function'?window.prioBadge(asset.priority):escF(asset.priority||'')) + '</td>' +
      '<td style="padding:8px">' + (typeof window.stageBadge==='function'?window.stageBadge(asset.stage):escF(asset.stage||'')) + '</td>' +
      '<td style="padding:8px;font-size:11px;color:#ba7517;font-weight:500">' + escF(asset.source || '—') + '</td>' +
      '<td style="padding:8px;min-width:190px"><div style="display:flex;align-items:center;gap:8px">' + thumbHtml + '<div>' +
      '<div data-action="analyze-asset" data-id="' + asset.id + '" style="font-weight:500;color:#ba7517;font-size:12px;cursor:pointer;text-decoration:underline;text-decoration-style:dotted" title="Abrir ficha">' + escF(asset.title || asset.address || '—') + '</div>' +
      '<div style="color:#aaa;font-size:10px;margin-top:2px">' + escF(asset.city || '') + (asset.neighborhood ? ' · ' + escF(asset.neighborhood) : '') + (asset.surface ? ' · ' + asset.surface + ' m²' : '') + (asset.rooms ? ' · ' + asset.rooms + ' hab.' : '') + '</div>' +
      (asset.url ? '<a href="' + escF(asset.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a>' : '') +
      '</div></div></td>' +
      '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;font-weight:600;white-space:nowrap">' + euroF(asset.price) + '</td>' +
      '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;color:#888;font-size:11px">' + pm2 + '</td>' +
      '<td style="padding:8px;text-align:center">' + flipCell + '</td>' +
      '<td style="padding:8px;text-align:center">' + btrCell + '</td>' +
      '<td style="padding:8px;text-align:center;white-space:nowrap"><div style="display:flex;gap:4px;justify-content:center">' + btnAnalyze + btnDel + '</div></td>' +
      '</tr>';
  };

  // ── 1) Al poblar los calculadores desde un activo, si tiene análisis guardado, restaurarlo ──
  var oldPopulate = window.populateCalculatorsFromAsset;
  window.populateCalculatorsFromAsset = function(asset){
    // Primero el comportamiento previo (estimaciones + preselección GEO + render)
    if (typeof oldPopulate === 'function') {
      try { oldPopulate(asset); } catch(e) {}
    }
    // Después, si hay análisis guardado, sobrescribir con los valores reales
    if (asset && asset.analisis) {
      var an = asset.analisis;
      if (window.S && an.S) Object.assign(window.S, an.S);
      if (window.F && an.F) Object.assign(window.F, an.F);
      if (window.B && an.B) Object.assign(window.B, an.B);
      if (an.CATS && an.CATS.length) window.CATS = an.CATS;
      // Fijar siempre el presupuesto guardado (null si no había) para no heredar el de otro activo
      window._presupuestoTotal = an.presupuesto || null;
    } else {
      // Sin análisis guardado: misma base que la estimación de la tabla (sin presupuesto detallado)
      window._presupuestoTotal = null;
    }
    // Re-render para que la ficha refleje exactamente la base usada por la tabla
    ['rSI','rSR','rFI','rFR','rBI','rBR','rPresupuesto'].forEach(function(fn){
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
  };

  // ── 2) Tarjeta de resumen del análisis guardado (solo lectura; se edita con el modo edición) ──
  function injectSaveCard(asset){
    if (window._fichaEdit && window._fichaEdit.on) return; // en modo edición no se inyecta
    var root = document.getElementById('adp-content');
    if (!root) return;

    var prev = document.getElementById('ficha-analisis-card');
    if (prev) prev.remove();

    // El botón de editar ahora vive en la fila de pestañas: ocultar el duplicado del header
    var headerEditBtn = root.querySelector('[data-action="edit-asset"]');
    if (headerEditBtn) headerEditBtn.style.display = 'none';

    // Localizar la tarjeta de inversión para insertar la nuestra justo debajo
    var card = null;
    var divs = root.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var t = (divs[i].textContent || '').trim();
      if (t === 'Inversión' || t === 'Análisis de inversión' || t === 'Análisis de inversión guardado') {
        card = divs[i].parentElement;
        break;
      }
    }

    var ef = (typeof window.ef === 'function') ? window.ef : function(n){ return isFinite(n) ? Math.round(n).toLocaleString('es-ES') + ' €' : '—'; };

    var box = document.createElement('div');
    box.id = 'ficha-analisis-card';
    box.style.cssText = 'background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:16px 18px;margin-bottom:14px';

    var hasSaved = asset.analisis && asset.analisis.resultado;
    var inner = '<div style="font-size:11px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Análisis guardado en la ficha</div>';

    if (hasSaved) {
      var f = asset.analisis.resultado.flip || {};
      var b = asset.analisis.resultado.btr || {};
      var pres = asset.analisis.presupuesto || 0;
      var savedAt = asset.analisis.savedAt ? new Date(asset.analisis.savedAt).toLocaleDateString('es-ES') : '';
      var tagF = (+f.rc || 0) >= 20 ? '#16a34a' : (+f.rc || 0) >= 10 ? '#d97706' : '#dc2626';
      var tagB = (+b.rn || 0) >= 7  ? '#16a34a' : (+b.rn || 0) >= 5  ? '#d97706' : '#dc2626';
      inner +=
        '<div style="font-size:10px;color:#aaa;margin-bottom:8px">Guardado' + (savedAt ? ' el ' + savedAt : '') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
          '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px">' +
            '<div style="font-size:10px;color:#92400e;font-weight:600;margin-bottom:3px">FLIP · ROI</div>' +
            '<div style="font-size:18px;font-weight:700;color:' + tagF + ';font-family:\'Courier New\',monospace">' + (isFinite(f.rc) ? (+f.rc).toFixed(1) + '%' : '—') + '</div>' +
            '<div style="font-size:10px;color:#888;margin-top:2px">Margen ' + ef(f.mn) + '</div>' +
          '</div>' +
          '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:9px">' +
            '<div style="font-size:10px;color:#15803d;font-weight:600;margin-bottom:3px">BTR · Yield neta</div>' +
            '<div style="font-size:18px;font-weight:700;color:' + tagB + ';font-family:\'Courier New\',monospace">' + (isFinite(b.rn) ? (+b.rn).toFixed(1) + '%' : '—') + '</div>' +
            '<div style="font-size:10px;color:#888;margin-top:2px">' + ef(b.bn) + '/año</div>' +
          '</div>' +
        '</div>' +
        (pres > 0 ? '<div style="font-size:11px;color:#666;margin-bottom:10px">Presupuesto de reforma guardado: <b>' + ef(pres) + '</b></div>' : '');
    } else {
      inner += '<div style="font-size:12px;color:#666;line-height:1.5;margin-bottom:10px">Aún no has guardado el análisis en esta ficha. Pulsa <b>«Editar ficha»</b> arriba para entrar en modo edición, ajusta los datos en las pestañas y guarda al salir.</div>';
    }

    inner += '<div style="font-size:11px;color:#888;line-height:1.5;margin-top:2px">Para modificar precio, reforma, financiación o cualquier dato usa <b>«Editar ficha»</b> (arriba). Todo se guarda junto al salir del modo edición.</div>';

    box.innerHTML = inner;

    // Insertar tras la tarjeta de inversión; si no se encuentra, al final del contenido
    if (card && card.parentNode) {
      card.parentNode.insertBefore(box, card.nextSibling);
    } else {
      root.appendChild(box);
    }
  }

  // ── 3) Reinyectar la tarjeta cada vez que se renderiza la ficha ──
  var oldRenderAssetDetail = window.renderAssetDetail;
  window.renderAssetDetail = function(asset){
    if (window._fichaEdit && window._fichaEdit.on) return; // no re-render en modo edición
    var r = (typeof oldRenderAssetDetail === 'function') ? oldRenderAssetDetail.apply(this, arguments) : undefined;
    // 220ms: después del rewrite de investment-card-consistency-patch (que corre a 0 y 150ms)
    setTimeout(function(){ try { injectSaveCard(asset); } catch(e) {} }, 220);
    return r;
  };

  // ══════════════════════════════════════════════════════════════════
  // ── 4) MODO EDICIÓN GLOBAL de la ficha ──
  //    Un único botón "Editar ficha" entra en modo edición. Se pueden cambiar
  //    datos en todas las pestañas (inmueble, Mercado, Presupuesto, Inversión)
  //    y todo se recalcula en vivo, pero NO se guarda en la ficha hasta pulsar
  //    "Guardar y salir". "Cancelar" descarta los cambios.
  // ══════════════════════════════════════════════════════════════════
  window._fichaEdit = window._fichaEdit || { on:false, asset:null };

  function todayISOf(){ return (typeof window.todayISO === 'function') ? window.todayISO() : new Date().toISOString().slice(0,10); }

  function reRenderCalculators(){
    ['rSI','rSR','rFI','rFR','rBI','rBR','rPresupuesto'].forEach(function(fn){
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });
  }

  function buildEditBar(){
    if (document.getElementById('ficha-edit-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'ficha-edit-bar';
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9700;background:#1a1a1a;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;box-shadow:0 -4px 16px rgba(0,0,0,.25);font-family:system-ui,-apple-system,sans-serif';
    bar.innerHTML =
      '<span style="font-size:12px;line-height:1.4">✏️ <b>Modo edición</b> — cambia datos en cualquier pestaña; se recalculan en vivo. Nada se guarda en la ficha hasta «Guardar y salir».</span>' +
      '<span style="display:flex;gap:8px;flex-shrink:0">' +
        '<button id="ficha-edit-cancel" style="padding:8px 14px;border:1px solid #666;border-radius:7px;background:transparent;color:#fff;font-size:12px;cursor:pointer;font-family:inherit">Cancelar</button>' +
        '<button id="ficha-edit-save" style="padding:8px 16px;border:none;border-radius:7px;background:#16a34a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600">Guardar y salir</button>' +
      '</span>';
    document.body.appendChild(bar);
    document.getElementById('ficha-edit-cancel').addEventListener('click', cancelFichaEdit);
    document.getElementById('ficha-edit-save').addEventListener('click', saveFichaEdit);
  }
  function removeEditBar(){ var b = document.getElementById('ficha-edit-bar'); if (b) b.remove(); }

  function renderFichaEditForm(asset){
    var el = document.getElementById('adp-content');
    if (!el) return;
    var fields = (typeof window.renderFormFields === 'function') ? window.renderFormFields(asset) : '<div style="color:#aaa;font-size:12px">Formulario no disponible.</div>';
    el.innerHTML =
      '<div style="max-width:1000px;margin:0 auto;padding:8px 0 90px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
          '<div style="font-size:15px;font-weight:600;color:#1a1a1a">Editando — ' + ((typeof window.escD === 'function') ? window.escD(asset.title || 'activo') : (asset.title || 'activo')) + '</div>' +
        '</div>' +
        '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#92400e;line-height:1.5">' +
          'Aquí editas los <b>datos del inmueble y el seguimiento</b>. Para el análisis financiero usa las pestañas <b>Mercado</b>, <b>Presupuesto</b> e <b>Inversión</b> (se recalculan en vivo). Al terminar pulsa <b>Guardar y salir</b> abajo: se guarda todo junto en la ficha.' +
        '</div>' +
        fields +
      '</div>';

    // Enlace en vivo: cambiar precio/superficie en el formulario actualiza los cálculos del resto de pestañas
    var pEl = document.getElementById('df-price');
    if (pEl) pEl.addEventListener('input', function(){
      var v = parseFloat(this.value);
      if (window.S && isFinite(v)) { window.S.pc = Math.round(v); reRenderCalculators(); }
    });
    var sEl = document.getElementById('df-surface');
    if (sEl) sEl.addEventListener('input', function(){
      var v = parseFloat(this.value);
      if (window.F && isFinite(v)) { window.F.sup = v; reRenderCalculators(); }
    });
  }

  function enterFichaEdit(asset){
    if (!asset) return;
    window._fichaEdit = { on:true, asset:asset };
    // Asegurar que los calculadores tienen los datos del activo (restaura análisis guardado si existe)
    if (typeof window.populateCalculatorsFromAsset === 'function') {
      try { window.populateCalculatorsFromAsset(asset); } catch(e) {}
    }
    // Ir a la pestaña Ficha y mostrar el formulario
    if (typeof window.sw === 'function') {
      var t = document.querySelector('.tab[data-tab="adp"]');
      try { window.sw('adp', t); } catch(e) {}
    }
    document.body.classList.add('ficha-editing');
    renderFichaEditForm(asset);
    buildEditBar();
    updateEditTabButton();
  }
  window.enterFichaEdit = enterFichaEdit;

  async function saveFichaEdit(){
    var stt = window._fichaEdit;
    if (!stt || !stt.on) return;
    var asset = stt.asset;
    var saveBtn = document.getElementById('ficha-edit-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

    // 1) Datos del inmueble/CRM desde el formulario (si está presente)
    var base = {};
    if (typeof window.readForm === 'function' && document.getElementById('df-title')) {
      try { base = window.readForm(asset.id); } catch(e) { base = {}; }
    }
    // Sincronizar precio/superficie del formulario hacia los calculadores antes de calcular
    if (base.price != null && window.S) window.S.pc = Math.round(base.price);
    if (base.surface != null && window.F) window.F.sup = base.surface;

    // 2) Análisis desde los calculadores en vivo
    var S = Object.assign({}, window.S || {});
    var F = Object.assign({}, window.F || {});
    var B = Object.assign({}, window.B || {});
    var CATS = window.CATS ? window.CATS.map(function(c){ return { n:c.n, open:c.open, items:(c.items||[]).map(function(i){ return { d:i.d, u:i.u, q:i.q, p:i.p, on:i.on, ref:i.ref||'' }; }) }; }) : [];
    var presupuesto = window._presupuestoTotal || 0;
    var resF = { rc:0, mn:0, ra:0, tot:0, cr:0 };
    var resB = { rn:0, rb:0, coc:0, bn:0, cf:0, tot:0 };
    try { var r1 = window.cF(S, F); resF = { rc:+(r1.rc||0).toFixed(2), mn:Math.round(r1.mn||0), ra:+(r1.ra||0).toFixed(2), tot:Math.round(r1.tot||0), cr:Math.round(r1.cr||0) }; } catch(e) {}
    try { var r2 = window.cB(S, B); resB = { rn:+(r2.rn||0).toFixed(2), rb:+(r2.rb||0).toFixed(2), coc:+(r2.coc||0).toFixed(2), bn:Math.round(r2.bn||0), cf:Math.round(r2.cf||0), tot:Math.round(r2.tot||0) }; } catch(e) {}

    // 3) Fusionar en el activo
    var merged = Object.assign({}, asset, base);
    merged.id = asset.id;
    merged.createdAt = asset.createdAt || todayISOf();
    merged.lastUpdated = todayISOf();
    if (!merged.foto_portada && asset.foto_portada) merged.foto_portada = asset.foto_portada;
    if (S.pc) merged.price = Math.round(S.pc);
    if (F.sup) merged.surface = F.sup;
    merged.analisis = { S:S, F:F, B:B, CATS:CATS, presupuesto:presupuesto, resultado:{ flip:resF, btr:resB }, savedAt:new Date().toISOString() };

    // 4) Persistir una sola vez (memoria + GitHub)
    try {
      if (typeof window.getDashboardAssets === 'function' && typeof window.saveDashboardAssets === 'function') {
        window.saveDashboardAssets(window.getDashboardAssets().map(function(a){ return a.id === asset.id ? merged : a; }));
      }
      if (typeof window.githubSaveDashboardAsset === 'function') {
        var res = await window.githubSaveDashboardAsset(merged);
        if (res && res.ok === false) throw new Error(res.reason || 'no se pudo guardar');
        if (res && res.asset) merged = res.asset;
      }
    } catch(e) {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar y salir'; }
      if (typeof window.showDashToast === 'function') window.showDashToast('Error al guardar: ' + e.message, false);
      return;
    }

    // 5) Salir del modo edición y mostrar la ficha actualizada
    window._fichaEdit = { on:false, asset:null };
    window._currentFichaAsset = merged;
    document.body.classList.remove('ficha-editing');
    removeEditBar();
    updateEditTabButton();
    var adpTab = document.querySelector('.tab[data-tab="adp"]');
    if (adpTab) { var tl = (merged.title || merged.address || 'Ficha').substring(0,22); if (merged.ref_code) tl += ' · ' + merged.ref_code; adpTab.textContent = tl; }
    if (typeof window.renderAssetDetail === 'function') window.renderAssetDetail(merged);
    if (typeof window.showDashToast === 'function') window.showDashToast('Ficha guardada ✓', true);
  }

  function cancelFichaEdit(){
    var stt = window._fichaEdit;
    if (!stt || !stt.on) return;
    var asset = stt.asset;
    window._fichaEdit = { on:false, asset:null };
    document.body.classList.remove('ficha-editing');
    removeEditBar();
    updateEditTabButton();
    // Revertir los calculadores al estado guardado del activo
    if (typeof window.populateCalculatorsFromAsset === 'function') {
      try { window.populateCalculatorsFromAsset(asset); } catch(e) {}
    }
    if (typeof window.renderAssetDetail === 'function') window.renderAssetDetail(asset);
  }

  // Redirigir TODOS los puntos de edición (header "Editar ficha", edición desde mapa/dashboard)
  // al modo edición global unificado.
  window.renderAssetEditInline = function(asset){ enterFichaEdit(asset); };

  // ══════════════════════════════════════════════════════════════════
  // ── 5) BOTÓN ÚNICO DE EDICIÓN EN LA FILA DE PESTAÑAS ──
  //    Visible en todas las pestañas de la ficha; alterna Editar / Guardar y salir.
  // ══════════════════════════════════════════════════════════════════
  function onEditTabClick(){
    if (window._fichaEdit && window._fichaEdit.on) {
      saveFichaEdit();
    } else if (window._currentFichaAsset) {
      enterFichaEdit(window._currentFichaAsset);
    }
  }

  function ensureEditTabButton(){
    var tabs = document.getElementById('main-tabs');
    if (!tabs) return;
    var btn = document.getElementById('tab-edit-ficha');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'tab-edit-ficha';
      btn.type = 'button';
      btn.style.cssText = 'margin-left:auto;padding:6px 14px;border-radius:7px;border:1px solid #ba7517;background:#fff;color:#ba7517;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;align-self:center';
      btn.addEventListener('click', onEditTabClick);
      tabs.appendChild(btn);
    }
    updateEditTabButton();
  }

  function updateEditTabButton(){
    var btn = document.getElementById('tab-edit-ficha');
    if (!btn) return;
    if (window._fichaEdit && window._fichaEdit.on) {
      btn.textContent = '✓ Guardar y salir';
      btn.style.background = '#16a34a';
      btn.style.color = '#fff';
      btn.style.borderColor = '#16a34a';
    } else {
      btn.textContent = '✏️ Editar ficha';
      btn.style.background = '#fff';
      btn.style.color = '#ba7517';
      btn.style.borderColor = '#ba7517';
    }
  }

  function setEditTabVisible(show){
    var btn = document.getElementById('tab-edit-ficha');
    if (btn) btn.style.display = show ? '' : 'none';
  }

  // Mostrar el botón al abrir una ficha y recordar el activo actual
  var oldOpenAssetDetail = window.openAssetDetail;
  window.openAssetDetail = function(id){
    var r = (typeof oldOpenAssetDetail === 'function') ? oldOpenAssetDetail.apply(this, arguments) : undefined;
    try {
      var asset = (typeof window.getDashboardAssets === 'function')
        ? window.getDashboardAssets().find(function(a){ return a.id === id; })
        : null;
      if (asset) window._currentFichaAsset = asset;
    } catch(e) {}
    ensureEditTabButton();
    setEditTabVisible(true);
    return r;
  };

  // Ocultar el botón al volver al dashboard
  var oldVolver = window.volverAlDashboard;
  window.volverAlDashboard = function(){
    setEditTabVisible(false);
    window._currentFichaAsset = null;
    return (typeof oldVolver === 'function') ? oldVolver.apply(this, arguments) : undefined;
  };

  var oldLoadDashboard = window.loadDashboard;
  if (typeof oldLoadDashboard === 'function') {
    window.loadDashboard = function(){
      setEditTabVisible(false);
      return oldLoadDashboard.apply(this, arguments);
    };
  }

})();
