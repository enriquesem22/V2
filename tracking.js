// tracking.js — Watchlist de pisos en seguimiento
// v2.11: mercados por clave fija, portales Idealista/Solvia y reset de base local.

const WATCHLIST_KEY = 'return_watchlist_v1';
const WATCHLIST_SOURCES = {
  macarena: {label:'Macarena', file:'data/watchlist.json', marketKey:'macarena', portal:'Idealista'},
  manresa: {label:'Manresa', file:'data/watchlist-manresa.json', marketKey:'manresa', portal:'Idealista'},
  sanjuan: {label:'San Juan de Aznalfarache', file:'data/watchlist-san-juan.json', marketKey:'sanjuan', portal:'Idealista'},
  solvia: {label:'Solvia - todas las zonas', file:'data/watchlist-solvia.json', marketKey:null, portal:'Solvia'}
};
window._trackingArea = window._trackingArea || 'all';

function getWatchlist(){ try{return JSON.parse(localStorage.getItem(WATCHLIST_KEY)||'[]');}catch(e){return[];} }
function saveWatchlist(items){ localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items||[])); }
function sanitizeTracking(str){ if(str==null)return ''; return String(str).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
function moneyTracking(n){ return isFinite(n)&&n!==null ? new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n))+' €' : '—'; }
function priceM2Tracking(p){ if(p.priceM2)return p.priceM2; if(p.price && p.surfaceM2)return Math.round(p.price/p.surfaceM2); return null; }
function marketTimeLabel(p){ var mt=p&&p.marketTimeEstimate; if(mt&&mt.label)return mt.label; if(mt&&isFinite(mt.minDays)&&isFinite(mt.maxDays))return mt.minDays+'-'+mt.maxDays+' días'; return '—'; }
function marketTimeColor(p){ var mt=p&&p.marketTimeEstimate; var max=mt&&isFinite(mt.maxDays)?Number(mt.maxDays):null; if(max===null)return '#64748b'; if(max<=75)return '#16a34a'; if(max<=140)return '#d97706'; return '#dc2626'; }
function priorityColor(p){ return p==='A'?'#16a34a':p==='B'?'#d97706':p==='C'?'#64748b':'#dc2626'; }
function riskColor(r){ return /muy_alto|alto/.test(r||'')?'#dc2626':/medio_alto|medio/.test(r||'')?'#d97706':'#16a34a'; }
function decisionLabel(d){ return String(d||'por_verificar').replace(/_/g,' '); }
function areaLabelFromKey(k){ if(k==='all')return 'Todos'; if(k==='macarena')return 'Macarena'; if(k==='manresa')return 'Manresa'; if(k==='sanjuan')return 'San Juan'; return 'Otros'; }
function streetLabel(p){ return p.street || p.address || p.title || '—'; }
function floorLabel(p){ if(p.floor===0)return 'Bajo'; if(p.floor===null||p.floor===undefined||p.floor==='')return 'Por verificar'; return p.floor+'ª'; }
function elevatorLabel(p){ if(p.elevator===true)return 'Sí'; if(p.elevator===false)return 'No'; return 'Por verificar'; }
function elevatorColor(p){ if(p.elevator===true)return '#16a34a'; if(p.elevator===false)return '#dc2626'; return '#64748b'; }
function portalLabel(p){ return p.portal || (p.source==='solvia'?'Solvia':'Idealista'); }

function inferMarketKey(p){
  if(p.marketKey)return p.marketKey;
  var txt=[p.city,p.district,p.neighborhood,p.sourceArea,p.title,p.street,p.address,p.url].filter(Boolean).join(' ').toLowerCase();
  if(txt.indexOf('manresa')>=0)return 'manresa';
  if(txt.indexOf('san juan')>=0 || txt.indexOf('aznalfarache')>=0)return 'sanjuan';
  if(txt.indexOf('macarena')>=0 || txt.indexOf('villegas')>=0 || txt.indexOf('doctor fedriani')>=0 || txt.indexOf('parlamento')>=0 || txt.indexOf('torneo')>=0 || txt.indexOf('hermano pablo')>=0 || txt.indexOf('constantina')>=0 || txt.indexOf('begonia')>=0 || txt.indexOf('jose bermejo')>=0 || txt.indexOf('los romeros')>=0 || txt.indexOf('blasco ibanez')>=0)return 'macarena';
  return 'otros';
}
function normalizeItem(item, sourceKey, meta){
  var out=Object.assign({}, item||{});
  var src=WATCHLIST_SOURCES[sourceKey]||{};
  out.portal = out.portal || src.portal || (out.source==='solvia'?'Solvia':'Idealista');
  out.source = out.source || (String(out.portal).toLowerCase()==='solvia'?'solvia':'idealista');
  out.sourceArea = out.sourceArea || (meta&&meta.area) || '';
  out.marketKey = out.marketKey || src.marketKey || inferMarketKey(out);
  out.id = out.id || (out.source+'_'+out.marketKey+'_'+String(out.title||Date.now()).toLowerCase().replace(/[^a-z0-9]+/g,'_'));
  return out;
}
function getNormalizedWatchlist(){ return getWatchlist().map(function(p){ return normalizeItem(p); }); }
function mergeWatchlist(baseItems, localItems, sourceKey, meta){
  var map=new Map();
  (baseItems||[]).forEach(function(item){ var n=normalizeItem(item,sourceKey,meta); map.set(n.id,n); });
  (localItems||[]).forEach(function(local){ var n=normalizeItem(local); var base=map.get(n.id)||{}; map.set(n.id,Object.assign({},base,n,{snapshots:(n.snapshots&&n.snapshots.length)?n.snapshots:(base.snapshots||[]),notes:n.notes||base.notes||'',updatedAt:n.updatedAt||base.updatedAt||base.checkedAt||null})); });
  return Array.from(map.values());
}
async function loadBaseWatchlist(sourceKey){
  var src=WATCHLIST_SOURCES[sourceKey]||WATCHLIST_SOURCES.macarena;
  var r=await fetch(src.file+'?v=2.11.'+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('No se pudo cargar '+src.file);
  var data=await r.json();
  return Array.isArray(data)?{metadata:{area:src.label},properties:data}:data;
}
window.importBaseWatchlist=async function(sourceKey){
  var select=document.getElementById('tracking-source-select');
  var key=sourceKey || (select&&select.value) || 'macarena';
  var status=document.getElementById('tracking-status');
  try{
    if(status){status.textContent='Cargando base...';status.style.color='#d97706';}
    var base=await loadBaseWatchlist(key);
    var merged=mergeWatchlist(base.properties||[],getWatchlist(),key,base.metadata||{});
    saveWatchlist(merged);
    window._trackingArea=(WATCHLIST_SOURCES[key]&&WATCHLIST_SOURCES[key].marketKey)||window._trackingArea||'all';
    if(status){status.textContent='✓ Importado: '+((base.metadata&&base.metadata.area)||WATCHLIST_SOURCES[key].label)+' · '+merged.length+' pisos totales';status.style.color='#16a34a';}
    renderTracking(document.getElementById('tp-content'));
  }catch(e){ if(status){status.textContent='Error: '+e.message;status.style.color='#dc2626';} }
};
window.importAllWatchlists=async function(){
  var status=document.getElementById('tracking-status');
  try{
    if(status){status.textContent='Importando Idealista + Solvia...';status.style.color='#d97706';}
    var merged=[];
    for(var key of Object.keys(WATCHLIST_SOURCES)){
      var base=await loadBaseWatchlist(key);
      merged=mergeWatchlist(base.properties||[],merged,key,base.metadata||{});
    }
    saveWatchlist(merged);
    window._trackingArea='all';
    if(status){status.textContent='✓ Base reiniciada/importada · '+merged.length+' pisos totales';status.style.color='#16a34a';}
    renderTracking(document.getElementById('tp-content'));
  }catch(e){ if(status){status.textContent='Error: '+e.message;status.style.color='#dc2626';} }
};
window.resetTrackingBase=function(){ if(confirm('¿Reiniciar tracking local e importar de nuevo Idealista + Solvia?')){ localStorage.removeItem(WATCHLIST_KEY); window.importAllWatchlists(); } };
window.setTrackingArea=function(areaKey){ window._trackingArea=areaKey||'all'; renderTracking(document.getElementById('tp-content')); };
window.addTrackingSnapshot=function(id){
  var items=getNormalizedWatchlist(); var item=items.find(function(p){return p.id===id;}); if(!item)return;
  var priceRaw=prompt('Precio actual:', item.price || ''); if(priceRaw===null)return;
  var price=Number(String(priceRaw).replace(/[^0-9.,]/g,'').replace(',','.')) || item.price || 0;
  var statusText=prompt('Estado actual:', item.status || 'publicado'); if(statusText===null)return;
  var note=prompt('Nota de revisión:', 'Revisión manual');
  item.price=price; item.status=statusText; item.checkedAt=new Date().toISOString().slice(0,10); item.updatedAt=new Date().toISOString(); item.snapshots=item.snapshots||[];
  item.snapshots.unshift({checkedAt:item.checkedAt,price:price,available:!/(vendido|retirado|no disponible)/i.test(statusText),statusText:statusText,notes:note||''});
  saveWatchlist(items); renderTracking(document.getElementById('tp-content'));
};
window.updateTrackingDecision=function(id){
  var items=getNormalizedWatchlist(); var item=items.find(function(p){return p.id===id;}); if(!item)return;
  var decision=prompt('Decisión:', item.decision || 'tracking_serio'); if(decision===null)return;
  var priority=prompt('Prioridad A/B/C/D:', item.priority || 'B'); if(priority===null)return;
  var notes=prompt('Notas:', item.notes || ''); if(notes===null)return;
  item.decision=decision; item.priority=String(priority||'B').toUpperCase().slice(0,1); item.notes=notes; item.updatedAt=new Date().toISOString();
  saveWatchlist(items); renderTracking(document.getElementById('tp-content'));
};
window.updateMarketTimeEstimate=function(id){
  var items=getNormalizedWatchlist(); var item=items.find(function(p){return p.id===id;}); if(!item)return;
  var mt=item.marketTimeEstimate||{}; var minRaw=prompt('Días mínimos estimados en mercado:',mt.minDays||'30'); if(minRaw===null)return;
  var maxRaw=prompt('Días máximos estimados en mercado:',mt.maxDays||'90'); if(maxRaw===null)return;
  var reason=prompt('Motivo:',mt.rationale||'Estimación manual');
  item.marketTimeEstimate={minDays:Number(minRaw)||0,maxDays:Number(maxRaw)||0,label:(Number(minRaw)||0)+'-'+(Number(maxRaw)||0)+' días',confidence:mt.confidence||'manual',rationale:reason||''};
  item.updatedAt=new Date().toISOString(); saveWatchlist(items); renderTracking(document.getElementById('tp-content'));
};
window.deleteTrackingItem=function(id){ var items=getNormalizedWatchlist(); var item=items.find(function(p){return p.id===id;}); if(!item||!confirm('¿Eliminar de tracking '+(item.title||id)+'?'))return; saveWatchlist(items.filter(function(p){return p.id!==id;})); renderTracking(document.getElementById('tp-content')); };
window.exportWatchlist=function(){ var b=new Blob([JSON.stringify(getNormalizedWatchlist(),null,2)],{type:'application/json'}); var a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(b),download:'return_watchlist_'+new Date().toISOString().slice(0,10)+'.json'}); a.click(); };

function tabCount(items,key){ if(key==='all')return items.length; return items.filter(function(p){return p.marketKey===key;}).length; }
function renderTracking(el){
  if(!el)return;
  var allItems=getNormalizedWatchlist();
  var activeArea=window._trackingArea||'all';
  var items=activeArea==='all'?allItems:allItems.filter(function(p){return p.marketKey===activeArea;});
  var filtered=items.slice().sort(function(a,b){var order={A:1,B:2,C:3,D:4}; return (order[a.priority]||9)-(order[b.priority]||9)||(a.price||0)-(b.price||0);});
  var total=filtered.length;
  var serious=filtered.filter(function(p){return ['A','B'].indexOf(p.priority)>=0;}).length;
  var clean=filtered.filter(function(p){return !/(ocupado|sin_posesion|nuda_propiedad|cesion|situacion_especial)/i.test((p.occupancyStatus||'')+' '+(p.decision||''));}).length;
  var avg=total?Math.round(filtered.reduce(function(s,p){return s+(priceM2Tracking(p)||0);},0)/total):0;
  var fast=filtered.filter(function(p){return p.marketTimeEstimate && p.marketTimeEstimate.maxDays<=90;}).length;
  var tabs=['all','macarena','manresa','sanjuan'];
  var html='';
  html+='<div style="max-width:1280px">';
  html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap"><div><div style="font-size:18px;font-weight:500;color:#1a1a1a">Tracking de pisos</div><div style="font-size:11px;color:#aaa;margin-top:2px">Mercados separados por clave fija · Idealista + Solvia</div></div>';
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="tracking-source-select" style="padding:8px 10px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;font-family:inherit">';
  Object.keys(WATCHLIST_SOURCES).forEach(function(k){html+='<option value="'+k+'">'+sanitizeTracking(WATCHLIST_SOURCES[k].label)+'</option>';});
  html+='</select><button onclick="importBaseWatchlist()" style="padding:8px 12px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar fuente</button><button onclick="importAllWatchlists()" style="padding:8px 12px;border:1px solid #1a1a1a;border-radius:8px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar todo</button><button onclick="resetTrackingBase()" style="padding:8px 12px;border:1px solid #dc2626;border-radius:8px;background:#fff;color:#dc2626;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Reiniciar base</button><button onclick="exportWatchlist()" style="padding:8px 12px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Exportar JSON</button></div></div>';
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
  tabs.forEach(function(k){var active=activeArea===k; html+='<button onclick="setTrackingArea(\''+k+'\')" style="padding:8px 12px;border:1px solid '+(active?'#1a1a1a':'#e5e5e0')+';border-radius:999px;background:'+(active?'#1a1a1a':'#fff')+';color:'+(active?'#fff':'#555')+';font-size:12px;cursor:pointer;font-family:inherit;font-weight:'+(active?'600':'400')+'">'+areaLabelFromKey(k)+' <span style="opacity:.65">'+tabCount(allItems,k)+'</span></button>';});
  html+='</div><div id="tracking-status" style="font-size:11px;color:#aaa;margin-bottom:10px"></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px"><div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Zona activa</div><div style="font-size:18px;font-family:Courier New,monospace;font-weight:600">'+sanitizeTracking(areaLabelFromKey(activeArea))+'</div></div><div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Prioridad A/B</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600;color:#ba7517">'+serious+'</div></div><div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Operaciones limpias aprox.</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600">'+clean+'</div></div><div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Salida estimada ≤90d</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600;color:#16a34a">'+fast+'</div></div><div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Media €/m² muestra</div><div style="font-size:22px;font-family:Courier New,monospace;font-weight:600">'+(avg?avg.toLocaleString('es-ES'):'—')+'</div></div></div>';
  if(filtered.length===0){ html+='<div style="text-align:center;padding:48px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa"><div style="font-size:34px;margin-bottom:8px">🔎</div><div style="font-size:14px;color:#777;font-weight:500">Sin pisos en esta pestaña</div><div style="font-size:12px;margin-top:4px">Pulsa “Reiniciar base” para recargar Idealista + Solvia.</div></div>'; }
  else{
    html+='<div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f4f4f0;color:#555"><th style="padding:8px;text-align:center">Prio.</th><th style="padding:8px;text-align:left">Mercado</th><th style="padding:8px;text-align:left">Portal</th><th style="padding:8px;text-align:left">Calle</th><th style="padding:8px;text-align:right">Precio</th><th style="padding:8px;text-align:right">€/m²</th><th style="padding:8px;text-align:center">Hab.</th><th style="padding:8px;text-align:center">Planta</th><th style="padding:8px;text-align:center">Ascensor</th><th style="padding:8px;text-align:left">Estado</th><th style="padding:8px;text-align:left">Tiempo mercado</th><th style="padding:8px;text-align:left">Decisión</th><th style="padding:8px;text-align:left">Acción</th><th style="padding:8px;text-align:center">Editar</th></tr></thead><tbody>';
    filtered.forEach(function(p,i){var pm2=priceM2Tracking(p); html+='<tr style="background:'+(i%2?'#fafaf8':'#fff')+';border-top:1px solid #f0f0ea"><td style="padding:8px;text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:'+priorityColor(p.priority)+';color:#fff;font-weight:700">'+sanitizeTracking(p.priority||'?')+'</span></td><td style="padding:8px;min-width:120px"><div style="font-weight:500;color:#555">'+sanitizeTracking(areaLabelFromKey(p.marketKey))+'</div><div style="color:#aaa;margin-top:2px">'+sanitizeTracking(p.neighborhood||p.district||p.city||'')+'</div></td><td style="padding:8px;font-weight:600;color:'+(portalLabel(p)==='Solvia'?'#0f766e':'#ba7517')+'">'+sanitizeTracking(portalLabel(p))+'</td><td style="padding:8px;min-width:190px"><div style="font-weight:500;color:#1a1a1a">'+sanitizeTracking(streetLabel(p))+'</div><div style="color:#aaa;margin-top:2px">'+sanitizeTracking(p.surfaceM2||'—')+' m² · '+sanitizeTracking(String(p.condition||'por verificar').replace(/_/g,' '))+'</div>'+(p.url?'<a href="'+sanitizeTracking(p.url)+'" target="_blank" style="font-size:10px;color:#ba7517;text-decoration:none">Abrir anuncio ↗</a>':'')+'</td><td style="padding:8px;text-align:right;font-family:Courier New,monospace;font-weight:600">'+moneyTracking(p.price)+'</td><td style="padding:8px;text-align:right;font-family:Courier New,monospace">'+(pm2?pm2.toLocaleString('es-ES'):'—')+'</td><td style="padding:8px;text-align:center">'+(p.rooms||'—')+'</td><td style="padding:8px;text-align:center;font-weight:500">'+sanitizeTracking(floorLabel(p))+'</td><td style="padding:8px;text-align:center"><span style="color:'+elevatorColor(p)+';font-weight:600">'+sanitizeTracking(elevatorLabel(p))+'</span></td><td style="padding:8px"><span style="color:'+riskColor(p.riskLevel)+';font-weight:500">'+sanitizeTracking(String(p.occupancyStatus||'por_verificar').replace(/_/g,' '))+'</span><div style="color:#aaa;margin-top:2px">'+sanitizeTracking(p.riskLevel||'')+'</div></td><td style="padding:8px;min-width:125px"><span title="'+sanitizeTracking((p.marketTimeEstimate&&p.marketTimeEstimate.rationale)||'')+'" style="color:'+marketTimeColor(p)+';font-weight:600">'+sanitizeTracking(marketTimeLabel(p))+'</span><div style="color:#aaa;margin-top:2px">'+sanitizeTracking((p.marketTimeEstimate&&p.marketTimeEstimate.confidence)||'orientativo')+'</div></td><td style="padding:8px;min-width:150px">'+sanitizeTracking(decisionLabel(p.decision))+'<div style="color:#aaa;margin-top:2px">'+sanitizeTracking(p.checkedAt||'')+'</div></td><td style="padding:8px;min-width:180px;color:#555">'+sanitizeTracking(p.nextAction||'—')+'</td><td style="padding:8px;text-align:center;white-space:nowrap"><button onclick="addTrackingSnapshot(\''+p.id+'\')" title="Añadir revisión" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">↻</button><button onclick="updateTrackingDecision(\''+p.id+'\')" title="Editar criterio" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">✎</button><button onclick="updateMarketTimeEstimate(\''+p.id+'\')" title="Editar tiempo" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">⏱</button><button onclick="deleteTrackingItem(\''+p.id+'\')" title="Eliminar" style="padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer">×</button></td></tr>';});
    html+='</tbody></table></div><div style="font-size:10px;color:#aaa;margin-top:8px;line-height:1.5">Los mercados ya se separan por marketKey fijo. Si ves contadores raros, pulsa Reiniciar base para limpiar datos antiguos del navegador.</div>';
  }
  html+='</div>'; el.innerHTML=html;
}
window.loadTracking=function(){ var el=document.getElementById('tp-content'); if(!el)return; renderTracking(el); if(getWatchlist().length===0){ window.importAllWatchlists(); } };
document.addEventListener('DOMContentLoaded',function(){ if(document.getElementById('tp-content'))renderTracking(document.getElementById('tp-content')); });
