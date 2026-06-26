// investment-card-consistency-patch.js — la tarjeta de ficha usa los mismos cálculos que la pestaña Inversión
// v2.34: elimina divergencias entre resumen de ficha y panel Flip/BTR.
(function(){
  'use strict';

  window.RETURN_INVESTMENT_CARD_CONSISTENCY_VERSION = '2.34';

  function ef2(n){
    if (typeof window.ef === 'function') return window.ef(n);
    return isFinite(n) ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €' : '—';
  }
  function ep2(n){
    if (typeof window.ep === 'function') return window.ep(n);
    return isFinite(n) && !isNaN(n) ? Number(n).toFixed(1) + '%' : '—';
  }
  function colorMetric(v, good, mid){
    return v >= good ? '#16a34a' : v >= mid ? '#d97706' : '#dc2626';
  }
  function mini(title, value, sub, color){
    return '<div style="background:#fafaf8;border:1px solid #eee;border-radius:10px;padding:12px">' +
      '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em">' + title + '</div>' +
      '<div style="font-size:20px;font-weight:700;font-family:\'Courier New\',monospace;color:' + (color || '#1a1a1a') + ';margin-top:3px">' + value + '</div>' +
      (sub ? '<div style="font-size:10px;color:#888;margin-top:2px">' + sub + '</div>' : '') +
      '</div>';
  }

  function currentInvestmentResults(){
    var out = { flip:null, btr:null, btrMetric:NaN, btrLabel:'BTR · Rent. neta' };
    try {
      if (typeof window.cF === 'function' && window.S && window.F) out.flip = window.cF(window.S, window.F);
    } catch(e) {}
    try {
      if (typeof window.cB === 'function' && window.S && window.B) {
        out.btr = window.cB(window.S, window.B);
        out.btrMetric = window.S.fin ? out.btr.coc : out.btr.rn;
        out.btrLabel = window.S.fin ? 'BTR · Cash on cash' : 'BTR · Rent. neta';
      }
    } catch(e2) {}
    return out;
  }

  function findInvestmentCard(){
    var root = document.getElementById('adp-content');
    if (!root) return null;
    var divs = Array.prototype.slice.call(root.querySelectorAll('div'));
    for (var i = 0; i < divs.length; i++) {
      var txt = (divs[i].textContent || '').trim();
      if (txt === 'Inversión' || txt === 'Análisis de inversión') {
        return divs[i].parentElement || null;
      }
    }
    return null;
  }

  function syncInvestmentCardWithCurrentCalculators(){
    var card = findInvestmentCard();
    if (!card) return;
    var r = currentInvestmentResults();
    var flipBox = r.flip
      ? mini('Flip · ROI capital', ep2(r.flip.rc), 'Margen neto: ' + ef2(r.flip.mn), colorMetric(r.flip.rc, 25, 15))
      : mini('Flip', '—', 'Faltan datos', '#aaa');
    var btrBox = r.btr
      ? mini(r.btrLabel, ep2(r.btrMetric), 'Beneficio neto: ' + ef2(r.btr.bn) + '/año', colorMetric(r.btrMetric, 7, 5))
      : mini('Buy to Rent', '—', 'Faltan datos', '#aaa');

    card.innerHTML =
      '<div style="font-size:11px;font-weight:600;color:#ba7517;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Inversión</div>' +
      '<div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:12px">Estos datos salen directamente del mismo estado y de las mismas fórmulas que la pestaña <b>Inversión</b>. Si cambias Flip o Buy to Rent, este resumen queda alineado.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' + flipBox + btrBox + '</div>' +
      '<button onclick="(function(){var t=document.querySelector(\'.tab[data-tab=fp]\');if(t&&typeof sw===\'function\')sw(\'fp\',t);})()" style="width:100%;padding:10px 14px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600">Abrir pestaña Inversión →</button>';
  }

  var oldRenderAssetDetail = window.renderAssetDetail;
  if (typeof oldRenderAssetDetail === 'function') {
    window.renderAssetDetail = function(asset){
      var r = oldRenderAssetDetail.apply(this, arguments);
      // renderAssetDetail se llama después de populateCalculatorsFromAsset; esperamos también al setupInvestmentTab.
      setTimeout(syncInvestmentCardWithCurrentCalculators, 0);
      setTimeout(syncInvestmentCardWithCurrentCalculators, 150);
      return r;
    };
  }

  ['rFI','rFR','rBI','rBR'].forEach(function(fn){
    var old = window[fn];
    if (typeof old === 'function') {
      window[fn] = function(){
        var r = old.apply(this, arguments);
        setTimeout(syncInvestmentCardWithCurrentCalculators, 0);
        return r;
      };
    }
  });
})();
