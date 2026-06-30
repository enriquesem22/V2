// ficha-analisis-patch.js — Guardar y restaurar el análisis financiero dentro de cada ficha
// v2.39: añade el botón "Guardar análisis en la ficha" (que los patches de inversión
// anteriores eliminaban al reescribir la tarjeta) y restaura S/F/B/CATS guardados al abrir.
(function(){
  'use strict';

  window.RETURN_FICHA_ANALISIS_VERSION = '2.42';

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

  // ── 2) Inyectar la tarjeta con el botón de guardar (sobrevive al rewrite de los otros patches) ──
  function injectSaveCard(asset){
    var root = document.getElementById('adp-content');
    if (!root) return;

    var prev = document.getElementById('ficha-analisis-card');
    if (prev) prev.remove();

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
      inner += '<div style="font-size:12px;color:#666;line-height:1.5;margin-bottom:10px">Aún no has guardado el análisis en esta ficha. Ajusta los datos en la pestaña <b>Inversión</b> y pulsa el botón para guardarlos aquí de forma permanente.</div>';
    }

    inner += '<button id="ficha-analisis-save-btn" style="width:100%;padding:10px;border:none;border-radius:8px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">' +
      (hasSaved ? '↓ Actualizar análisis guardado' : '↓ Guardar análisis en esta ficha') + '</button>' +
      '<div id="ficha-analisis-status" style="font-size:11px;color:#16a34a;margin-top:6px;min-height:14px;text-align:center"></div>';

    box.innerHTML = inner;

    // Insertar tras la tarjeta de inversión; si no se encuentra, al final del contenido
    if (card && card.parentNode) {
      card.parentNode.insertBefore(box, card.nextSibling);
    } else {
      root.appendChild(box);
    }

    var btn = document.getElementById('ficha-analisis-save-btn');
    if (btn) btn.addEventListener('click', async function(){
      var st = document.getElementById('ficha-analisis-status');
      btn.disabled = true; var lbl = btn.textContent; btn.textContent = 'Guardando...';
      if (st) { st.style.color = '#d97706'; st.textContent = 'Guardando en GitHub...'; }
      try {
        if (typeof window.saveAnalysisToAsset === 'function') {
          await window.saveAnalysisToAsset(asset.id);
        }
      } catch(e) {
        if (st) { st.style.color = '#dc2626'; st.textContent = 'Error: ' + e.message; }
        btn.disabled = false; btn.textContent = lbl;
      }
    });
  }

  // ── 3) Reinyectar la tarjeta cada vez que se renderiza la ficha ──
  var oldRenderAssetDetail = window.renderAssetDetail;
  window.renderAssetDetail = function(asset){
    var r = (typeof oldRenderAssetDetail === 'function') ? oldRenderAssetDetail.apply(this, arguments) : undefined;
    // 220ms: después del rewrite de investment-card-consistency-patch (que corre a 0 y 150ms)
    setTimeout(function(){ try { injectSaveCard(asset); } catch(e) {} }, 220);
    return r;
  };

})();
