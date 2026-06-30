// ficha-analisis-patch.js — Guardar y restaurar el análisis financiero dentro de cada ficha
// v2.39: añade el botón "Guardar análisis en la ficha" (que los patches de inversión
// anteriores eliminaban al reescribir la tarjeta) y restaura S/F/B/CATS guardados al abrir.
(function(){
  'use strict';

  window.RETURN_FICHA_ANALISIS_VERSION = '2.39';

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
      if (an.presupuesto) window._presupuestoTotal = an.presupuesto;
      ['rSI','rSR','rFI','rFR','rBI','rBR','rPresupuesto'].forEach(function(fn){
        if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
      });
    }
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
