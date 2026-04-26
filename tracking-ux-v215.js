// tracking-ux-v215.js
// Mejora UX de Tracking: no autoimport, render aislado, localización más completa.
(function(){
  window.TRACKING_VERSION = '2.15';

  function esc(v){
    if (typeof escapeTracking === 'function') return escapeTracking(v);
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});
  }

  function locParts(item){
    item = item || {};
    var city = item.city || '';
    var province = item.province || '';
    var district = item.district || '';
    var neighborhood = item.neighborhood || '';
    var street = item.street || item.address || item.title || '';
    var market = typeof areaLabelFromKey === 'function' ? areaLabelFromKey(item.marketKey) : (item.marketKey || '');
    var cityLine = [city, province].filter(Boolean).join(', ');
    var zoneLine = [neighborhood, district].filter(Boolean).join(' · ');
    return {market:market, cityLine:cityLine, zoneLine:zoneLine, street:street};
  }

  function isTrackingTabActive(){
    var panel = document.getElementById('tp');
    return !!(panel && panel.classList && panel.classList.contains('active'));
  }

  function trackingRoot(){
    return document.getElementById('tp-content');
  }

  if (typeof window.loadTracking === 'function') {
    window.loadTracking = function(){
      var root = trackingRoot();
      if (!root) return;
      if (typeof window.renderTracking === 'function') window.renderTracking(root);
    };
  }

  if (typeof window.renderTracking === 'function') {
    var originalRenderTracking = window.renderTracking;
    window.renderTracking = function(el){
      var root = trackingRoot();
      if (!root) return;
      if (el && el !== root) return;
      originalRenderTracking(root);
      var hint = root.querySelector('#tracking-status');
      if (hint && typeof getWatchlistRaw === 'function' && getWatchlistRaw().length === 0) {
        hint.textContent = 'Tracking vacío. Importa una fuente o pulsa Importar todo. No se aplica nada al estudio hasta pulsar Usar en una vivienda.';
        hint.style.color = '#64748b';
      }
    };
  }

  if (typeof window.renderTopControls === 'function') {
    var originalRenderTopControls = window.renderTopControls;
    window.renderTopControls = function(){
      var html = originalRenderTopControls();
      return html.replace('Mercados por zona · Idealista y Solvia mezclados', 'Mercados por zona · Idealista y Solvia mezclados · importación manual');
    };
  }

  if (typeof window.renderRow === 'function') {
    window.renderRow = function(item, index, dupes) {
      var pm2 = typeof priceM2Tracking === 'function' ? priceM2Tracking(item) : null;
      var duplicateCount = dupes && item ? (dupes[item.canonicalKey] || 0) : 0;
      var duplicateBadge = duplicateCount > 1
        ? '<span title="Posible duplicado entre portales" style="display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:9px">dup ' + duplicateCount + '</span>'
        : '';
      var risky = typeof isRiskyItem === 'function' ? isRiskyItem(item) : false;
      var useLabel = risky ? 'Usar riesgo' : 'Usar';
      var useStyle = risky
        ? 'padding:5px 8px;border:1px solid #d97706;border-radius:6px;background:#fffbeb;color:#b45309;cursor:pointer;font-weight:600;margin-right:2px'
        : 'padding:5px 8px;border:1px solid #16a34a;border-radius:6px;background:#f0fdf4;color:#15803d;cursor:pointer;font-weight:600;margin-right:2px';
      var loc = locParts(item);
      var portal = typeof portalLabel === 'function' ? portalLabel(item) : (item.portal || item.source || '—');
      var market = typeof areaLabelFromKey === 'function' ? areaLabelFromKey(item.marketKey) : (item.marketKey || '—');
      var priorityColorValue = typeof priorityColor === 'function' ? priorityColor(item.priority) : '#64748b';
      var riskColorValue = typeof riskColor === 'function' ? riskColor(item.riskLevel) : '#64748b';
      var marketTime = typeof marketTimeLabel === 'function' ? marketTimeLabel(item) : '—';
      var marketTimeColorValue = typeof marketTimeColor === 'function' ? marketTimeColor(item) : '#64748b';
      var floor = typeof floorLabel === 'function' ? floorLabel(item) : (item.floor || 'Por verificar');
      var elevator = typeof elevatorLabel === 'function' ? elevatorLabel(item) : 'Por verificar';
      var elevatorColorValue = typeof elevatorColor === 'function' ? elevatorColor(item) : '#64748b';
      var decision = typeof decisionLabel === 'function' ? decisionLabel(item.decision) : String(item.decision || 'por verificar').replace(/_/g,' ');

      return '<tr style="background:' + (index % 2 ? '#fafaf8' : '#fff') + ';border-top:1px solid #f0f0ea">' +
        '<td style="padding:8px;text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:' + priorityColorValue + ';color:#fff;font-weight:700">' + esc(item.priority || '?') + '</span></td>' +
        '<td style="padding:8px;min-width:160px"><div style="font-weight:600;color:#555">' + esc(market) + '</div><div style="color:#777;margin-top:2px">' + esc(loc.cityLine || item.city || '') + '</div><div style="color:#aaa;margin-top:2px;font-size:10px">' + esc(loc.zoneLine || 'Barrio/distrito por verificar') + '</div></td>' +
        '<td style="padding:8px;font-weight:600;color:' + (portal === 'Solvia' ? '#0f766e' : '#ba7517') + '">' + esc(portal) + duplicateBadge + '</td>' +
        '<td style="padding:8px;min-width:230px"><div style="font-weight:600;color:#1a1a1a">' + esc(loc.street || 'Calle por verificar') + '</div><div style="color:#aaa;margin-top:2px">' + esc(item.surfaceM2 || '—') + ' m² · ' + esc(String(item.condition || 'por verificar').replace(/_/g, ' ')) + '</div><div style="color:#aaa;margin-top:2px;font-size:10px">' + esc([item.district, item.neighborhood].filter(Boolean).join(' · ')) + '</div>' + (item.url ? '<a href="' + esc(item.url) + '" target="_blank" rel="noopener" style="font-size:10px;color:#ba7517;text-decoration:none">Abrir anuncio ↗</a>' : '') + '</td>' +
        '<td style="padding:8px;text-align:right;font-family:Courier New,monospace;font-weight:600">' + (typeof moneyTracking === 'function' ? moneyTracking(item.price) : (item.price || '—')) + '</td>' +
        '<td style="padding:8px;text-align:right;font-family:Courier New,monospace">' + (pm2 ? pm2.toLocaleString('es-ES') : '—') + '</td>' +
        '<td style="padding:8px;text-align:center">' + esc(item.rooms || '—') + '</td>' +
        '<td style="padding:8px;text-align:center;font-weight:500">' + esc(floor) + '</td>' +
        '<td style="padding:8px;text-align:center"><span style="color:' + elevatorColorValue + ';font-weight:600">' + esc(elevator) + '</span></td>' +
        '<td style="padding:8px"><span style="color:' + riskColorValue + ';font-weight:500">' + esc(String(item.occupancyStatus || 'por_verificar').replace(/_/g, ' ')) + '</span><div style="color:#aaa;margin-top:2px">' + esc(item.riskLevel || '') + '</div></td>' +
        '<td style="padding:8px;min-width:125px"><span title="' + esc((item.marketTimeEstimate && item.marketTimeEstimate.rationale) || '') + '" style="color:' + marketTimeColorValue + ';font-weight:600">' + esc(marketTime) + '</span><div style="color:#aaa;margin-top:2px">' + esc((item.marketTimeEstimate && item.marketTimeEstimate.confidence) || 'orientativo') + '</div></td>' +
        '<td style="padding:8px;text-align:center">' + (item.daysOnMarket !== null && item.daysOnMarket !== undefined ? item.daysOnMarket + ' d' : '—') + '<div style="font-size:9px;color:#aaa">' + esc(typeof formatDateTracking === 'function' ? formatDateTracking(item.firstSeenAt) : (item.firstSeenAt || '')) + '</div></td>' +
        '<td style="padding:8px;min-width:150px">' + esc(decision) + '<div style="color:#aaa;margin-top:2px">' + esc(item.checkedAt || '') + '</div></td>' +
        '<td style="padding:8px;min-width:180px;color:#555">' + esc(item.nextAction || '—') + '</td>' +
        '<td style="padding:8px;text-align:center;white-space:nowrap">' +
          '<button data-action="apply" data-id="' + esc(item.id) + '" title="Aplicar este inmueble al estudio" style="' + useStyle + '">' + useLabel + '</button>' +
          '<button data-action="snapshot" data-id="' + esc(item.id) + '" title="Añadir revisión" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">↻</button>' +
          '<button data-action="edit" data-id="' + esc(item.id) + '" title="Editar criterio" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">✎</button>' +
          '<button data-action="time" data-id="' + esc(item.id) + '" title="Editar tiempo" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">⏱</button>' +
          '<button data-action="delete" data-id="' + esc(item.id) + '" title="Eliminar" style="padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer">×</button>' +
        '</td>' +
        '</tr>';
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    var activeTracking = isTrackingTabActive();
    var root = trackingRoot();
    if (root && !activeTracking) root.innerHTML = '';
  });
})();
