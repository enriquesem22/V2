// investment-unify-patch.js — Unifica Flip + Buy to Rent en una sola pestaña "Inversión"
// v2.31: Dashboard y ficha usan la misma fuente de verdad asset -> S/F/B -> cF/cB.
(function(){
  'use strict';

  window.RETURN_INVESTMENT_UNIFY_PATCH_VERSION = '2.31';

  function n(v){ var x = parseFloat(v); return isFinite(x) ? x : 0; }
  function pct(v){ return isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) + '%' : '—'; }
  function euro(v){
    if (typeof window.ef === 'function') return window.ef(v);
    if (!isFinite(v)) return '—';
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' €';
  }
  function esc(str){
    if (typeof window.escD === 'function') return window.escD(str);
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; });
  }

  var BTR_REFORM_BY_CONDITION = {
    a_reformar: 450,
    segunda_mano: 120,
    buen_estado: 50,
    reformado: 0,
    obra_nueva: 0
  };

  function btrFromAsset(asset){
    var d = window.B || { ref:8000, ct:15, rnt:550, vac:5, ibi:300, com:600, seg:180, imp:true, mnt:1, ges:0 };
    var price = n(asset && asset.price);
    var sup = n(asset && asset.surface);
    var rm2 = BTR_REFORM_BY_CONDITION[asset && asset.condition];
    if (rm2 === undefined) rm2 = sup ? 120 : 0;

    var ref = sup ? Math.round(sup * rm2) : n(d.ref);
    var rent = n(asset && (asset.rentMonthly || asset.monthlyRent || asset.rent || asset.renta));
    if (!rent && price) rent = Math.round(price * 0.05 / 12); // misma hipótesis base que usaba el dashboard
    if (!rent) rent = n(d.rnt);

    return {
      ref: ref,
      ct: n(d.ct) || 15,
      rnt: rent,
      vac: n(d.vac) || 5,
      ibi: n(d.ibi) || 300,
      com: n(d.com) || 600,
      seg: n(d.seg) || 180,
      imp: d.imp !== false,
      mnt: isFinite(parseFloat(d.mnt)) ? parseFloat(d.mnt) : 1,
      ges: isFinite(parseFloat(d.ges)) ? parseFloat(d.ges) : 0
    };
  }

  function investmentFromAsset(asset){
    if (!asset) return null;
    var s = (typeof window.sFromAsset === 'function')
      ? window.sFromAsset(asset)
      : { pc:n(asset.price), itp:(window.S&&S.itp)||7, not:(window.S&&S.not)||1.5, dd:(window.S&&S.dd)||350, hon:(window.S&&S.hon)||0, fin:!!(window.S&&S.fin), ltv:(window.S&&S.ltv)||70, ti:(window.S&&S.ti)||4.5, hip:(window.S&&S.hip)||20 };
    var f = (typeof window.flipFromAsset === 'function')
      ? window.flipFromAsset(asset)
      : { sup:n(asset.surface), rm2:350, ct:15, ind:2000, pl:8, pv:0, gv:5 };
    var b = btrFromAsset(asset);

    var savedPT = window._presupuestoTotal;
    window._presupuestoTotal = null; // dashboard/ficha no deben depender de un presupuesto abierto de otro activo
    var flip = null, btr = null;
    try { if (typeof window.cF === 'function' && s.pc && f.sup) flip = window.cF(s, f); } catch(e) {}
    try { if (typeof window.cB === 'function' && s.pc) btr = window.cB(s, b); } catch(e) {}
    window._presupuestoTotal = savedPT;

    return { s:s, f:f, b:b, flip:flip, btr:btr };
  }
  window.investmentFromAsset = investmentFromAsset;
  window.btrFromAsset = btrFromAsset;

  // Mantiene compatibilidad con cualquier render antiguo que siga llamando a calcBTR(asset).
  window.calcBTR = function(asset){
    var inv = investmentFromAsset(asset);
    if (!inv || !inv.btr) return null;
    var metric = inv.s.fin ? inv.btr.coc : inv.btr.rn;
    return { annualGross: inv.btr.ra, annualNet: inv.btr.bn, roi: Math.round(metric * 10) / 10, raw: inv.btr };
  };

  window.populateCalculatorsFromAsset = function(asset){
    var inv = investmentFromAsset(asset);
    if (!inv) return;

    if (window.S) {
      Object.keys(inv.s).forEach(function(k){ window.S[k] = inv.s[k]; });
      window.S._direccion = asset.address || asset.title || window.S._direccion || '';
      if (asset.rooms) window.S._habs = parseFloat(asset.rooms) || window.S._habs;
      if (asset.condition) {
        var stateMap = { a_reformar:'para reformar', segunda_mano:'buen estado', buen_estado:'buen estado', reformado:'buen estado', obra_nueva:'obra nueva' };
        window.S._estado = stateMap[asset.condition] || window.S._estado;
      }
    }
    if (window.F) Object.keys(inv.f).forEach(function(k){ window.F[k] = inv.f[k]; });
    if (window.B) Object.keys(inv.b).forEach(function(k){ window.B[k] = inv.b[k]; });

    ['rSI','rSR','rFI','rFR','rBI','rBR','rPresupuesto'].forEach(function(fn){
      if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} }
    });

    if (window.GEO && (asset.city || asset.neighborhood)) {
      var cityLow = (asset.city || '').toLowerCase();
      var nbLow = (asset.neighborhood || '').toLowerCase();
      Object.keys(window.GEO).forEach(function(prov){
        var muns = (window.GEO[prov] && window.GEO[prov].municipios) || {};
        Object.keys(muns).forEach(function(mun){
          if (cityLow && (mun.toLowerCase().includes(cityLow) || cityLow.includes(mun.toLowerCase()))) {
            window.SEL = window.SEL || {};
            window.SEL.prov = prov; window.SEL.mun = mun; window.SEL.bar = ''; window.SEL.sub = '';
            Object.keys(muns[mun].barrios || {}).forEach(function(bar){
              if (nbLow && bar.toLowerCase().includes(nbLow)) window.SEL.bar = bar;
            });
          }
        });
      });
      if (typeof window.rebuildSelects === 'function') setTimeout(window.rebuildSelects, 80);
      if (typeof window.doMapUpdate === 'function') setTimeout(window.doMapUpdate, 200);
    }
  };

  function colorMetric(v, good, mid){
    return v >= good ? '#16a34a' : v >= mid ? '#d97706' : '#dc2626';
  }

  // Re-render de filas: dashboard usa exactamente investmentFromAsset(asset), igual que la ficha.
  window.renderRow = function(asset, i){
    var inv = investmentFromAsset(asset) || {};
    var flip = inv.flip;
    var btr = inv.btr;
    var pm2 = (asset.price && asset.surface) ? Math.round(asset.price / asset.surface).toLocaleString('es-ES') + ' €/m²' : '—';

    var flipCell = '<span style="color:#d1d5db;font-size:11px">—</span>';
    if (flip && isFinite(flip.rc)) {
      var frc = Math.round(flip.rc);
      flipCell = '<div style="font-size:13px;font-weight:600;color:' + colorMetric(frc,25,15) + ';line-height:1.2">' + frc + '%</div>' +
        '<div style="font-size:10px;color:#888;font-family:\'Courier New\',monospace">' + euro(flip.mn) + '</div>';
    }

    var btrCell = '<span style="color:#d1d5db;font-size:11px">—</span>';
    if (btr) {
      var metric = inv.s && inv.s.fin ? btr.coc : btr.rn;
      btrCell = '<div style="font-size:13px;font-weight:600;color:' + colorMetric(metric,7,5) + ';line-height:1.2">' + pct(metric) + '</div>' +
        '<div style="font-size:10px;color:#888;font-family:\'Courier New\',monospace">' + euro(btr.bn) + '/año</div>';
    }

    var btnAnalyze = '<button data-action="analyze-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #16a34a;border-radius:5px;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:11px;font-family:inherit">Ficha</button>';
    var btnDel = '<button data-action="delete-asset" data-id="' + asset.id + '" style="padding:4px 7px;border:1px solid #fca5a5;border-radius:5px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:11px;font-family:inherit">×</button>';
    var photos = Array.isArray(asset.foto_urls) ? asset.foto_urls : [];
    var thumbSrc = asset.foto_portada || (photos.length ? photos[0] : '');
    var thumbHtml = thumbSrc && typeof window.mkImg === 'function' ? window.mkImg(thumbSrc, 'width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e0;flex-shrink:0;display:block') : '';

    return '<tr style="background:' + (i % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
      '<td style="padding:8px;text-align:center">' + (typeof window.prioBadge==='function'?window.prioBadge(asset.priority):esc(asset.priority||'')) + '</td>' +
      '<td style="padding:8px">' + (typeof window.stageBadge==='function'?window.stageBadge(asset.stage):esc(asset.stage||'')) + '</td>' +
      '<td style="padding:8px;font-size:11px;color:#ba7517;font-weight:500">' + esc(asset.source || '—') + '</td>' +
      '<td style="padding:8px;min-width:190px"><div style="display:flex;align-items:center;gap:8px">' + thumbHtml + '<div>' +
      '<div data-action="analyze-asset" data-id="' + asset.id + '" style="font-weight:500;color:#ba7517;font-size:12px;cursor:pointer;text-decoration:underline;text-decoration-style:dotted" title="Abrir ficha">' + esc(asset.title || asset.address || '—') + '</div>' +
      '<div style="color:#aaa;font-size:10px;margin-top:2px">' + esc(asset.city || '') + (asset.neighborhood ? ' · ' + esc(asset.neighborhood) : '') + (asset.surface ? ' · ' + asset.surface + ' m²' : '') + (asset.rooms ? ' · ' + asset.rooms + ' hab.' : '') + '</div>' +
      (asset.url ? '<a href="' + esc(asset.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a>' : '') +
      '</div></div></td>' +
      '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;font-weight:600;white-space:nowrap">' + euro(asset.price) + '</td>' +
      '<td style="padding:8px;text-align:right;font-family:\'Courier New\',monospace;color:#888;font-size:11px">' + pm2 + '</td>' +
      '<td style="padding:8px;text-align:center">' + flipCell + '</td>' +
      '<td style="padding:8px;text-align:center">' + btrCell + '</td>' +
      '<td style="padding:8px;text-align:center;white-space:nowrap"><div style="display:flex;gap:4px;justify-content:center">' + btnAnalyze + btnDel + '</div></td>' +
      '</tr>';
  };

  window.renderAssetDetail = function(asset){
    var el = document.getElementById('adp-content');
    if (!el) return;
    var inv = investmentFromAsset(asset) || {};
    var flip = inv.flip, btr = inv.btr;
    var photos = Array.isArray(asset.foto_urls) ? asset.foto_urls.filter(Boolean) : [];
    var coverSrc = asset.foto_portada || (photos.length ? photos[0] : '');
    var coverHtml = coverSrc && typeof window.mkImg === 'function' ? window.mkImg(coverSrc, 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:1px solid #e5e5e0;flex-shrink:0') : '';

    function row(label, value, color){
      if (!value && value !== 0) return '';
      return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid #f5f5f0"><span style="font-size:11px;color:#888">' + label + '</span><span style="font-size:13px;font-weight:500;color:' + (color || '#1a1a1a') + '">' + value + '</span></div>';
    }
    function card(title, body, accent){
      return '<div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:16px 18px;margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:' + (accent || '#555') + ';text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">' + title + '</div>' + body + '</div>';
    }
    function mini(title, value, sub, color){
      return '<div style="background:#fafaf8;border:1px solid #eee;border-radius:10px;padding:12px"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em">' + title + '</div><div style="font-size:20px;font-weight:700;font-family:\'Courier New\',monospace;color:' + (color || '#1a1a1a') + ';margin-top:3px">' + value + '</div>' + (sub ? '<div style="font-size:10px;color:#888;margin-top:2px">' + sub + '</div>' : '') + '</div>';
    }

    var basicBody = row('Precio', euro(asset.price), '#ba7517') +
      row('Superficie', asset.surface ? asset.surface + ' m²' : null) +
      row('Precio/m²', (asset.price && asset.surface) ? Math.round(asset.price / asset.surface).toLocaleString('es-ES') + ' €/m²' : null) +
      row('Habitaciones', asset.rooms ? asset.rooms + ' hab.' : null) +
      row('Estado', asset.condition && window.CONDITION_OPTIONS ? (window.CONDITION_OPTIONS[asset.condition] || asset.condition) : asset.condition) +
      row('Fuente', asset.source) +
      (asset.url ? '<div style="padding:7px 0;border-bottom:1px solid #f5f5f0"><a href="' + esc(asset.url) + '" target="_blank" rel="noopener" style="font-size:12px;color:#ba7517;text-decoration:none">Ver anuncio ↗</a></div>' : '');

    var crmBody = row('Estado pipeline', typeof window.stageCfg==='function' ? window.stageCfg(asset.stage).label : asset.stage) +
      row('Prioridad', asset.priority ? 'Prioridad ' + asset.priority : null) +
      row('Agente contactado', asset.contactedAgent ? '✓ Sí' : '○ No') +
      row('Fecha contacto', asset.contactDate) +
      row('Fecha visita', asset.visitDate, '#8b5cf6') +
      row('Importe oferta', asset.offerAmount ? euro(asset.offerAmount) : null, '#ef4444');

    var flipBox = flip ? mini('Flip · ROI capital', pct(flip.rc), 'Margen neto: ' + euro(flip.mn), colorMetric(flip.rc,25,15)) : mini('Flip', '—', 'Faltan datos', '#aaa');
    var metric = btr && inv.s && inv.s.fin ? btr.coc : btr ? btr.rn : NaN;
    var btrBox = btr ? mini((inv.s && inv.s.fin ? 'BTR · Cash on cash' : 'BTR · Rent. neta'), pct(metric), 'Beneficio neto: ' + euro(btr.bn) + '/año', colorMetric(metric,7,5)) : mini('Buy to Rent', '—', 'Faltan datos', '#aaa');
    var invBody = '<div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:12px">Estos son los mismos datos que se muestran en el dashboard. Al abrir la pestaña <b>Inversión</b> se cargan los mismos parámetros en Flip y Buy to Rent.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' + flipBox + btrBox + '</div>' +
      '<button onclick="(function(){var t=document.querySelector(\'.tab[data-tab=fp]\');if(t&&typeof sw===\'function\')sw(\'fp\',t);})()" style="width:100%;padding:10px 14px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600">Abrir pestaña Inversión →</button>';

    var notasBody = asset.notes ? '<div style="font-size:12px;color:#444;line-height:1.7;white-space:pre-wrap">' + esc(asset.notes) + '</div>' : '<div style="font-size:11px;color:#aaa">Sin notas.</div>';
    var locParts = [asset.city, asset.neighborhood, asset.province].filter(Boolean);
    var locBody = locParts.length ? row('Ubicación', locParts.join(' · ')) : '<div style="font-size:11px;color:#aaa">Sin datos de ubicación</div>';
    var extraPhotos = photos.filter(function(u){ return u !== coverSrc; });
    var photosHtml = extraPhotos.length && typeof window.mkImg === 'function' ? '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:20px;scrollbar-width:thin">' + extraPhotos.map(function(u){ return window.mkImg(u, 'height:140px;min-width:200px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e0;flex-shrink:0'); }).join('') + '</div>' : '';

    el.innerHTML = '<div style="max-width:900px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px"><div style="display:flex;gap:14px;align-items:flex-start">' + coverHtml + '<div><div style="font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:4px">' + esc(asset.title || asset.address || 'Sin título') + '</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + (typeof window.stageBadge==='function'?window.stageBadge(asset.stage):'') + ' ' + (typeof window.prioBadge==='function'?window.prioBadge(asset.priority):'') + (asset.city ? '<span style="font-size:11px;color:#888">' + esc(asset.city) + (asset.neighborhood ? ' · ' + esc(asset.neighborhood) : '') + '</span>' : '') + (asset.ref_code ? '<span style="font-size:11px;color:#aaa;font-family:\'Courier New\',monospace">Ref: ' + esc(asset.ref_code) + '</span>' : '') + '</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-action="edit-asset" data-id="' + asset.id + '" style="padding:8px 16px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;cursor:pointer;font-size:12px;font-family:inherit;font-weight:500">Editar ficha</button><button onclick="volverAlDashboard()" style="padding:8px 16px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;cursor:pointer;font-size:12px;font-family:inherit">← Dashboard</button></div></div>' +
      photosHtml + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div>' + card('Datos del inmueble', basicBody) + card('Localización', locBody) + card('Notas', notasBody) + '</div><div>' + card('Pipeline CRM', crmBody) + card('Inversión', invBody, '#ba7517') + '</div></div></div>';

    var editBtn = el.querySelector('[data-action="edit-asset"]');
    if (editBtn && typeof window.renderAssetEditInline === 'function') editBtn.addEventListener('click', function(){ window.renderAssetEditInline(asset); });
  };

  function setupInvestmentTab(){
    var fpTab = document.querySelector('.tab[data-tab="fp"]');
    var bpTab = document.querySelector('.tab[data-tab="bp"]');
    if (fpTab) fpTab.textContent = 'Inversión';
    if (bpTab) bpTab.style.display = 'none';

    var fp = document.getElementById('fp');
    if (fp && !fp.dataset.investmentUnified) {
      fp.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start"><div><div style="font-size:12px;font-weight:600;color:#ba7517;margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em">Flip</div><div id="fi"></div><div id="fr"></div></div><div><div style="font-size:12px;font-weight:600;color:#16a34a;margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em">Buy to Rent</div><div id="bi"></div><div id="br"></div></div></div>';
      fp.dataset.investmentUnified = '1';
    }
    var bp = document.getElementById('bp');
    if (bp) bp.innerHTML = '';
    ['rFI','rFR','rBI','rBR'].forEach(function(fn){ if (typeof window[fn] === 'function') { try { window[fn](); } catch(e) {} } });
  }
  window.setupInvestmentTab = setupInvestmentTab;

  var oldOpenAssetDetail = window.openAssetDetail;
  if (typeof oldOpenAssetDetail === 'function') {
    window.openAssetDetail = function(id){
      oldOpenAssetDetail(id);
      setupInvestmentTab();
      var bpTab = document.querySelector('.tab[data-tab="bp"]');
      if (bpTab) bpTab.style.display = 'none';
    };
  }

  if (typeof window.applyRent === 'function') {
    window.applyRent = function(r){
      if (window.B) window.B.rnt = r;
      if (typeof window.rBI === 'function') window.rBI();
      if (typeof window.rBR === 'function') window.rBR();
      if (typeof window.swTab === 'function') window.swTab('fp');
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupInvestmentTab();
    var el = document.getElementById('dp-content');
    if (el && typeof window.renderDashboard === 'function') {
      try { window.renderDashboard(el); } catch(e) {}
    }
  });
})();
