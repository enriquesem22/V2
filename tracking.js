// tracking.js — Watchlist de pisos en seguimiento
// Carga una base JSON versionada en GitHub y la fusiona con ediciones locales.

const WATCHLIST_KEY = 'return_watchlist_v1';
const WATCHLIST_SOURCE = 'data/watchlist.json';

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
function pctTracking(n){
  return isFinite(n)&&n!==null ? Number(n).toFixed(1)+'%' : '—';
}
function mergeWatchlist(baseItems, localItems){
  const map = new Map();
  (baseItems||[]).forEach(item=>map.set(item.id, {...item}));
  (localItems||[]).forEach(local=>{
    const base = map.get(local.id) || {};
    map.set(local.id, {
      ...base,
      ...local,
      snapshots: Array.isArray(local.snapshots) && local.snapshots.length ? local.snapshots : (base.snapshots||[]),
      notes: local.notes || base.notes || '',
      updatedAt: local.updatedAt || base.updatedAt || base.checkedAt || null
    });
  });
  return [...map.values()];
}

async function loadBaseWatchlist(){
  const r = await fetch(WATCHLIST_SOURCE + '?v=' + Date.now(), {cache:'no-store'});
  if(!r.ok) throw new Error('No se pudo cargar '+WATCHLIST_SOURCE);
  const data = await r.json();
  return Array.isArray(data) ? {metadata:{}, properties:data} : data;
}

window.importBaseWatchlist = async function(){
  const status = document.getElementById('tracking-status');
  try{
    if(status){status.textContent='Cargando watchlist base...';status.style.color='#d97706';}
    const base = await loadBaseWatchlist();
    const merged = mergeWatchlist(base.properties||[], getWatchlist());
    saveWatchlist(merged);
    if(status){status.textContent='✓ Watchlist importada: '+merged.length+' pisos';status.style.color='#16a34a';}
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

function priorityColor(p){
  return p==='A'?'#16a34a':p==='B'?'#d97706':p==='C'?'#64748b':'#dc2626';
}
function decisionLabel(d){
  return String(d||'por_verificar').replace(/_/g,' ');
}
function riskColor(r){
  return /muy_alto|alto/.test(r||'')?'#dc2626':/medio_alto|medio/.test(r||'')?'#d97706':'#16a34a';
}

function renderTracking(el){
  if(!el) return;
  const items = getWatchlist();
  const filtered = items.slice().sort((a,b)=>{
    const order = {A:1,B:2,C:3,D:4};
    return (order[a.priority]||9)-(order[b.priority]||9) || (a.price||0)-(b.price||0);
  });
  const total = filtered.length;
  const serious = filtered.filter(p=>['A','B'].includes(p.priority)).length;
  const clean = filtered.filter(p=>!/(ocupado|sin_posesion|nuda_propiedad)/i.test(p.occupancyStatus||'')).length;
  const avg = total ? Math.round(filtered.reduce((s,p)=>s+(p.priceM2||((p.price||0)/(p.surfaceM2||1))),0)/total) : 0;

  el.innerHTML = `
    <div style="max-width:1120px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:18px;font-weight:500;color:#1a1a1a">Tracking de pisos</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px">Watchlist local + datos base versionados en GitHub</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="importBaseWatchlist()" style="padding:8px 12px;border:1px solid #ba7517;border-radius:8px;background:#fff;color:#ba7517;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Importar base Macarena</button>
          <button onclick="exportWatchlist()" style="padding:8px 12px;border:1px solid #e5e5e0;border-radius:8px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Exportar JSON</button>
        </div>
      </div>
      <div id="tracking-status" style="font-size:11px;color:#aaa;margin-bottom:10px"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Total</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600">${total}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Prioridad A/B</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600;color:#ba7517">${serious}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Operaciones limpias aprox.</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600">${clean}</div></div>
        <div style="background:#f4f4f0;border-radius:10px;padding:12px"><div style="font-size:10px;color:#aaa">Media €/m² muestra</div><div style="font-size:22px;font-family:'Courier New',monospace;font-weight:600">${avg?avg.toLocaleString('es-ES'):'—'}</div></div>
      </div>
      ${filtered.length===0 ? `<div style="text-align:center;padding:48px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa"><div style="font-size:34px;margin-bottom:8px">🔎</div><div style="font-size:14px;color:#777;font-weight:500">Sin pisos en tracking</div><div style="font-size:12px;margin-top:4px">Pulsa “Importar base Macarena” para cargar los pisos detectados.</div></div>` : `
        <div style="overflow-x:auto;border:1px solid #e5e5e0;border-radius:12px">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f4f4f0;color:#555">
              <th style="padding:8px;text-align:center">Prio.</th>
              <th style="padding:8px;text-align:left">Inmueble</th>
              <th style="padding:8px;text-align:right">Precio</th>
              <th style="padding:8px;text-align:right">€/m²</th>
              <th style="padding:8px;text-align:center">Hab.</th>
              <th style="padding:8px;text-align:center">Planta</th>
              <th style="padding:8px;text-align:left">Estado</th>
              <th style="padding:8px;text-align:left">Decisión</th>
              <th style="padding:8px;text-align:left">Acción</th>
              <th style="padding:8px;text-align:center">Editar</th>
            </tr></thead>
            <tbody>${filtered.map((p,i)=>{
              const pm2 = p.priceM2 || Math.round((p.price||0)/(p.surfaceM2||1));
              const floor = p.floor ? p.floor + 'ª' : '—';
              const elev = p.elevator ? ' · asc.' : ' sin asc.';
              const rowBg = i%2 ? '#fafaf8' : '#fff';
              return `<tr style="background:${rowBg};border-top:1px solid #f0f0ea">
                <td style="padding:8px;text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${priorityColor(p.priority)};color:#fff;font-weight:700">${sanitizeTracking(p.priority||'?')}</span></td>
                <td style="padding:8px;min-width:210px"><div style="font-weight:500;color:#1a1a1a">${sanitizeTracking(p.title)}</div><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.neighborhood||p.district||'')} · ${sanitizeTracking(p.surfaceM2||'—')} m²</div>${p.url?`<a href="${sanitizeTracking(p.url)}" target="_blank" style="font-size:10px;color:#ba7517;text-decoration:none">Abrir anuncio ↗</a>`:''}</td>
                <td style="padding:8px;text-align:right;font-family:'Courier New',monospace;font-weight:600">${moneyTracking(p.price)}</td>
                <td style="padding:8px;text-align:right;font-family:'Courier New',monospace">${pm2?pm2.toLocaleString('es-ES'):'—'}</td>
                <td style="padding:8px;text-align:center">${p.rooms||'—'}</td>
                <td style="padding:8px;text-align:center">${floor}${elev}</td>
                <td style="padding:8px"><span style="color:${riskColor(p.riskLevel)};font-weight:500">${sanitizeTracking((p.occupancyStatus||'por_verificar').replace(/_/g,' '))}</span><div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.riskLevel||'')}</div></td>
                <td style="padding:8px;min-width:150px">${sanitizeTracking(decisionLabel(p.decision))}<div style="color:#aaa;margin-top:2px">${sanitizeTracking(p.checkedAt||'')}</div></td>
                <td style="padding:8px;min-width:180px;color:#555">${sanitizeTracking(p.nextAction||'—')}</td>
                <td style="padding:8px;text-align:center;white-space:nowrap">
                  <button onclick="addTrackingSnapshot('${p.id}')" title="Añadir revisión" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">↻</button>
                  <button onclick="updateTrackingDecision('${p.id}')" title="Editar criterio" style="padding:5px 8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;cursor:pointer">✎</button>
                  <button onclick="deleteTrackingItem('${p.id}')" title="Eliminar" style="padding:5px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer">×</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div style="font-size:10px;color:#aaa;margin-top:8px;line-height:1.5">A/B = seguimiento real. C = comparable/caso especial. D = descartado por riesgo, ocupación, nuda propiedad, sin posesión o mala planta.</div>
      `}
    </div>`;
}

window.loadTracking = function(){
  const el = document.getElementById('tp-content');
  if(!el) return;
  renderTracking(el);
  if(getWatchlist().length===0){
    window.importBaseWatchlist && window.importBaseWatchlist();
  }
};

document.addEventListener('DOMContentLoaded', function(){
  if(document.getElementById('tp-content')) renderTracking(document.getElementById('tp-content'));
});
