// tracking.js — Watchlist de pisos en seguimiento
// Carga bases JSON versionadas en GitHub y las fusiona con ediciones locales.

const WATCHLIST_KEY = 'return_watchlist_v1';
const WATCHLIST_SOURCES = {
  macarena: {label:'Macarena', file:'data/watchlist.json'},
  manresa: {label:'Manresa', file:'data/watchlist-manresa.json'},
  sanjuan: {label:'San Juan de Aznalfarache', file:'data/watchlist-san-juan.json'}
};
const WATCHLIST_SOURCE = WATCHLIST_SOURCES.macarena.file; // compatibilidad

window._trackingArea = window._trackingArea || 'all';

function getWatchlist(){
  try{return JSON.parse(localStorage.getItem(WATCHLIST_KEY)||'[]');}catch(e){return[];}
}
function saveWatchlist(items){
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items||[]));
}
function sanitizeTracking(str){
  if(str==null) return '';
  if(typeof sanitize==='function') return sanitize(str);
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function moneyTracking(n){
  return isFinite(n)&&n!==null ? new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n))+' €' : '—';
}
function marketTimeLabel(p){
  const mt = p && p.marketTimeEstimate;
  if(mt && mt.label) return mt.label;
  if(mt && isFinite(mt.minDays) && isFinite(mt.maxDays)) return mt.minDays+'-'+mt.maxDays+' dias';
  return '—';
}
function marketTimeColor(p){
  const mt = p && p.marketTimeEstimate;
  const max = mt && isFinite(mt.maxDays) ? Number(mt.maxDays) : null;
  if(max===null) return '#64748b';
  if(max<=75) return '#16a34a';
  if(max<=140) return '#d97706';
  return '#dc2626';
}
function mergeWatchlist(baseItems, localItems, meta){
  const map = new Map();
  (baseItems||[]).forEach(item=>map.set(item.id, {...item, sourceArea:item.sourceArea || meta?.area || ''}));
  (localItems||[]).forEach(local=>{
    const base = map.get(local.id) || {};
    map.set(local.id, {
      ...base,
      ...local,
      sourceArea: local.sourceArea || base.sourceArea || meta?.area || '',
      snapshots: Array.isArray(local.snapshots) && local.snapshots.length ? local.snapshots : (base.snapshots||[]),
      notes: local.notes || base.notes || '',
      updatedAt: local.updatedAt || base.updatedAt || base.checkedAt || null
    });
  });
  return [...map.values()];
}

async function loadBaseWatchlist(sourceKey){
  const src = WATCHLIST_SOURCES[sourceKey] || WATCHLIST_SOURCES.macarena;
  const r = await fetch(src.file + '?v=' + Date.now(), {cache:'no-store'});
  if(!r.ok) throw new Error('No se pudo cargar '+src.file);
  const data = await r.json();
  return Array.isArray(data) ? {metadata:{area:src.label}, properties:data} : data;
}

window.importBaseWatchlist = async function(sourceKey){
  const select = document.getElementById('tracking-source-select');
  const key = sourceKey || select?.value || 'macarena';
  const status = document.getElementById('tracking-status');
  try{
    if(status){status.textContent='Cargando watchlist base...';status.style.color='#d97706';}
    const base = await loadBaseWatchlist(key);
    const merged = mergeWatchlist(base.properties||[], getWatchlist(), base.metadata||{});
    saveWatchlist(merged);
    window._trackingArea = key;
    if(status){status.textContent='✓ Watchlist importada: '+(base.metadata?.area||WATCHLIST_SOURCES[key]?.label||key)+' · '+merged.length+' pisos totales';status.style.color='#16a34a';}
    renderTracking(document.getElementById('tp-content'));
  }catch(e){
    if(status){status.textContent='Error: '+e.message;status.style.color='#dc2626';}
  }
};

window.importAllWatchlists = async function(){
  const status = document.getElementById('tracking-status');
  try{
    if(status){status.textContent='Importando todas las zonas...';status.style.color='#d97706';}
    let merged = getWatchlist();
    for(const key of Object.keys(WATCHLIST_SOURCES)){
      const base = await loadBaseWatchlist(key);
      merged = mergeWatchlist(base.properties||[], merged, base.metadata||{});
    }
    saveWatchlist(merged);
    window._trackingArea = 'all';
    if(status){status.textContent='✓ Importadas todas las zonas · '+merged.length+' pisos totales';status.style.color='#16a34a';}
    renderTracking(document.getElementById('tp-content'));
  }catch(e){
    if(status){status.textContent='Error: '+e.message;status.style.color='#dc2626';}
  }
};

window.addTrackingSnapshot = function(id){
  const items = getWatchlist();
  const item = items.find(p=>p.id===id);
  if(!item) return;
  const priceRaw = prompt('Precio actual:', item.price || '');
  if(priceRaw===null) return;
  const price = Number(String(priceRaw).replace(/[^0-9.,]/g,'').replace(',','.')) || item.price || 0;
  const statusText = prompt('Estado actual (publicado, reservado, vendido, retirado, bajada, ocupado...):', item.status || 'publicado');
  if(statusText===null) return;
  const note = prompt('Nota de revisión:', 'Revisión manual');
  item.price = price;
  item.status = statusText;
  item.checkedAt = new Date().toISOString().slice(0,10);
  item.updatedAt = new Date().toISOString();
  item.snapshots = item.snapshots || [];
  item.snapshots.unshift({checkedAt:item.checkedAt, price, available:!/(vendido|retirado|no disponible)/i.test(statusText), statusText, notes:note||''});
  saveWatchlist(items);
  renderTracking(document.getElementById('tp-content'));
};

window.updateTrackingDecision = function(id){
  const items = getWatchlist();
  const item = items.find(p=>p.id===id);
  if(!item) return;
  const decision = prompt('Decisión:', item.decision || 'tracking_serio');
  if(decision===null) return;
  const priority = prompt('Prioridad A/B/C/D:', item.priority || 'B');
  if(priority===null) return;
  const notes = prompt('Notas:', item.notes || '');
  if(notes===null) return;
  item.decision = decision;
  item.priority = String(priority||'B').toUpperCase().slice(0,1);
  item.notes = notes;
  item.updatedAt = new Date().toISOString();
  saveWatchlist(items);
  renderTracking(document.getElementById('tp-content'));
};

window.updateMarketTimeEstimate = function(id){
  const items = getWatchlist();
  const item = items.find(p=>p.id===id);
  if(!item) return;
  const mt = item.marketTimeEstimate || {};
  const minRaw = prompt('Días mínimos estimados en mercado:', mt.minDays || '30');
  if(minRaw===null) return;
  const maxRaw = prompt('Días máximos estimados en mercado:', mt.maxDays || '90');
  if(maxRaw===null) return;
  const reason = prompt('Motivo de la estimación:', mt.rationale || 'Estimación manual');
  item.marketTimeEstimate = {
    minDays: Number(minRaw)||0,
    maxDays: Number(maxRaw)||0,
    label: (Number(minRaw)||0)+'-'+(Number(maxRaw)||0)+' dias',
    confidence: mt.confidence || 'manual',
    rationale: reason || ''
  };
  item.updatedAt = new Date().toISOString();
  saveWatchlist(items);
  renderTracking(document.getElementById('tp-content'));
};

window.deleteTrackingItem = function(id){
  const items = getWatchlist();
  const item = items.find(p=>p.id===id);
  if(!item || !confirm('¿Eliminar de tracking "'+(item.title||id)+'"?')) return;
  saveWatchlist(items.filter(p=>p.id!==id));
  renderTracking(document.getElementById('tp-content'));
};

window.exportWatchlist = function(){
  const b = new Blob([JSON.stringify(getWatchlist(), null, 2)], {type:'application/json'});
  const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(b), download:'return_watchlist_'+new Date().toISOString().slice(0,10)+'.json'});
  a.click();
};

window.setTrackingArea = function(areaKey){
  window._trackingArea = areaKey || 'all';
  renderTracking(document.getElementById('tp-content'));
};

function priorityColor(p){
  return p==='A'?'#16a34a':p==='B'?'#d97706':p==='C'?'#64748b':'#dc2626';
}
function decisionLabel(d){
  return String(d||'por_verificar').replace(/_/g,' ');
}
function riskColor(r){
  return /muy_alto|alto/.test(r||'')?'#dc2626':/medio_alto|medio/.test(r||'')?'#d97706':'#16a34a';
}
function areaKeyFromItem(p){
  const txt = [p.city, p.district, p.neighborhood, p.sourceArea, p.title].filter(Boolean).join(' ').toLowerCase();
  if(txt.includes('manresa')) return 'manresa';
  if(txt.includes('san juan')) return 'sanjuan';
  if(txt.includes('macarena') || txt.includes('villegas') || txt.includes('doctor fedriani') || txt.includes('parlamento') || txt.includes('torneo')) return 'macarena';
  return 'otros';
}
function areaLabelFromKey(k){
  if(k==='all') return 'Todos';
  return WATCHLIST_SOURCES[k]?.label || 'Otros';
}
function streetLabel(p){
  return p.street || p.address || p.title || '—';
}
function floorLabel(p){
  if(p.floor===0) return 'Bajo';
  if(p.floor===null || p.floor===undefined || p.floor==='') return 'Por verificar';
  return p.floor + 'ª';
}
function elevatorLabel(p){
  if(p.elevator===true) return 'Sí';
  if(p.elevator===false) return 'No';
  return 'Por verificar';
}
function elevatorColor(p){
  if(p.elevator===true) return '#16a34a';
  if(p.elevator===false) return '#dc2626';
  return '#64748b';
}
function tabCount(items, key){
  if(key==='all') return items.length;
  return items.filter(p=>areaKeyFromItem(p)===key).length;
}

function renderTracking(el){
  if(!el) return;
  const allItems = getWatchlist();
  const activeArea = window._trackingArea || 'all';
  const items = activeArea==='all' ? allItems : allItems.filter(p=>areaKeyFromItem(p)===activeArea);
  const filtered = items.slice().sort((a,b)=>{
    const order = {A:1,B:2,C:3,D:4};
    return (order[a.priority]||9)-(order[b.priority]||9) || (a.price||0)-(b.price||0);
  });
  const total = filtered.length;
  const serious = filtered.filter(p=>['A','B'].includes(p.priority)).length;
  const clean = filtered.filter(p=>!/(ocupado|sin_posesion|nuda_propiedad|cesion)/i.test((p.occupancyStatus||'')+' '+(p.decision||''))).length;
  const avg = total ? Math.round(filtered.reduce((s,p)=>s+(p.priceM2||((p.price||0)/(p.surfaceM2||1))),0)/total) : 0;
  const fast = filtered.filter(p=>p.marketTimeEstimate && p.marketTimeEstimate.maxDays<=90).length;
  const tabs = ['all','macarena','manresa','sanjuan'];

  el.innerHTML = `
    <div style="max-width:1240px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:18px;font-weight:500;color:#1a1a1a">Tracking de pisos</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px">Watchlist por zonas · calle, planta, ascensor y estimación de tiempo en mercado</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select id="tracking-source-select" style="padding:8px 10px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;font-family:inherit">
            ${Object.entries(WATCHLIST_SOURCES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
          <button onclick="importBaseWatchlist()" style="padding:8px 12px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar zona</button>
          <button onclick="importAllWatchlists()" style="padding:8px 12px;border:1px solid #1a1a1a;border-radius:8px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar todo</button>
          <button onclick="exportWatchlist()" style="padding:8px 12px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Exportar JSON</button>
        </div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${tabs.map(k=>{
          const active = activeArea===k;
          const count = tabCount(allItems,k);
          return `<button onclick="setTrackingArea('${k}')" style="padding:8px 12px;border:1px solid ${active?'#1a1a1a':'#e5e5e0'};border-radius:999px;background:${active?'#1a1a1a':'#fff'};color:${active?'#fff':'#555'};font-size:12px;cursor:pointer;font-family:inherit;font-weight:${active?'600':'400'}">${areaLabelFromKey(k)} <span style="opacity:.65">${count}</span></button>`;
        }).join('')}
      </div>

      <div id="tracking-status" style="font-size:11px;color:#aaa;margin-bottom:10px"></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Zona activa</div><div style="font-size:18px;font-family:'Courier New',monospace;font-weight:600">${sanitizeTracking(areaLabelFromKey(activeArea))}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Prioridad A/B</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600;color:#ba7517">${serious}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Operaciones limpias aprox.</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600">${clean}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Salida estimada ≤90d</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600;color:#16a34a">${fast}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Media €/m² muestra</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600">${avg?avg.toLocaleString('es-ES'):'—'}</div></div>
      </div>
      ${filtered.length===0 ? `<div style="text-align:center;padding:48px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa"><div style="font-size:34px;margin-bottom:8px">🔎</div><div style="font-size:14px;color:#777;font-weight:500">Sin pisos en esta pestaña</div><div style="font-size:12px;margin-top:4px">Pulsa “Importar zona” o “Importar todo” para cargar las bases disponibles.</div></div>` : `
        <div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f4f4f0;color:#555">
              <th style="padding:8px;text-align:center">Prio.</th>
              <th style="padding:8px;text-align:left">Lugar</th>
              <th style="padding:8px;text-align:left">Calle</th>
              <th style="padding:8px;text-align:right">Precio</th>
              <th style="padding:8px;text-align:right">€/m²</th>
              <th style="padding:8px;text-align:center">Hab.</th>
              <th style="padding:8px;text-align:center">Planta</th>
              <th style="padding:8px;text-align:center">Ascensor</th>
              <th style="padding:8px;text-align:left">Estado</th>
              <th style="padding:8px;text-align:left">Tiempo mercado</th>
              <th style="padding:8px;text-align:left">Decisión</th>
              <th style="padding:8px;text-align:left">Acción</th>
              <th style="padding:8px;text-align:center">Editar</th>
            </tr></thead>
            <tbody>${filtered.map((p,i)=>{
              const pm2 = p.priceM2 || Math.round((p.price||0)/(p.surfaceM2||1));
              const rowBg = i%2 ? '#fafaf8' : '#fff';
              const mt = marketTimeLabel(p);
              return `<tr style="background:${rowBg};border-top:1px solid #f0f0ea">
                <td style="padding:8px;text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${priorityColor(p.priority)};color:#fff;font-weight:700">${sanitizeTracking(p.priority||'?')}</span></td>
                <td style="padding:8px;min-width:130px"><div style="font-weight:500;color:#555">${sanitizeTracking(p.city||'')}</div><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.neighborhood||p.district||p.sourceArea||'')}</div></td>
                <td style="padding:8px;min-width:190px"><div style="font-weight:500;color:#1a1a1a">${sanitizeTracking(streetLabel(p))}</div><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.surfaceM2||'—')} m² · ${sanitizeTracking(p.condition||'por verificar').replace(/_/g,' ')}</div>${p.url?`<a href="${sanitizeTracking(p.url)}" target="_blank" style="font-size:10px;color:#ba7517;text-decoration:none">Abrir anuncio ↗</a>`:''}</td>
                <td style="padding:8px;text-align:right;font-family:'Courier New',monospace;font-weight:600">${moneyTracking(p.price)}</td>
                <td style="padding:8px;text-align:right;font-family:'Courier New',monospace">${pm2?pm2.toLocaleString('es-ES'):'—'}</td>
                <td style="padding:8px;text-align:center">${p.rooms||'—'}</td>
                <td style="padding:8px;text-align:center;font-weight:500">${sanitizeTracking(floorLabel(p))}</td>
                <td style="padding:8px;text-align:center"><span style="color:${elevatorColor(p)};font-weight:600">${sanitizeTracking(elevatorLabel(p))}</span></td>
                <td style="padding:8px"><span style="color:${riskColor(p.riskLevel)};font-weight:500">${sanitizeTracking((p.occupancyStatus||'por_verificar').replace(/_/g,' '))}</span><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.riskLevel||'')}</div></td>
                <td style="padding:8px;min-width:125px"><span title="${sanitizeTracking(p.marketTimeEstimate?.rationale||'')}" style="color:${marketTimeColor(p)};font-weight:600">${sanitizeTracking(mt)}</span><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.marketTimeEstimate?.confidence||'orientativo')}</div></td>
                <td style="padding:8px;min-width:150px">${sanitizeTracking(decisionLabel(p.decision))}<div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.checkedAt||'')}</div></td>
                <td style="padding:8px;min-width:180px;color:#555">${sanitizeTracking(p.nextAction||'—')}</td>
                <td style="padding:8px;text-align:center;white-space:nowrap">
                  <button onclick="addTrackingSnapshot('${p.id}')" title="Añadir revisión" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">↻</button>
                  <button onclick="updateTrackingDecision('${p.id}')" title="Editar criterio" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">✎</button>
                  <button onclick="updateMarketTimeEstimate('${p.id}')" title="Editar tiempo en mercado" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">⏱</button>
                  <button onclick="deleteTrackingItem('${p.id}')" title="Eliminar" style="padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer">×</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div style="font-size:10px;color:#aaa;margin-top:8px;line-height:1.5">Las pestañas separan tus zonas de búsqueda. La calle sale de los campos street, address o title; planta y ascensor aparecen como columnas independientes. El “tiempo mercado” es orientativo y debe ajustarse con revisiones reales.</div>
      `}
    </div>`;
}

window.loadTracking = function(){
  const el = document.getElementById('tp-content');
  if(!el) return;
  renderTracking(el);
  if(getWatchlist().length===0){
    window.importAllWatchlists && window.importAllWatchlists();
  }
};

document.addEventListener('DOMContentLoaded', function(){
  if(document.getElementById('tp-content')) renderTracking(document.getElementById('tp-content'));
});
