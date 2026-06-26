// storage.js — Capa de persistencia y sincronización
// Tres niveles: localStorage (local) → GitHub (remoto) → Google Drive (remoto)
// Dashboard assets: GitHub es la fuente de verdad; se mantienen solo en memoria.

// ─── GITHUB STORAGE ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 12 · GITHUB STORAGE  —  sincronización
// ═══════════════════════════════════════════════════════
const GH_REPO = 'enriquesem22/V2';
const GH_FILE = 'portfolio.json';
const GH_STATE_FILE = 'state.json';
const GH_TOKEN_LS_KEY = 'return_gh_token_v1';
let ghToken = null;

function setGhStatus(msg, color){ const el=document.getElementById('gh-status'); if(el){el.textContent=msg;el.style.color=color||'#aaa';} }
function setGhLastSync(t){ const el=document.getElementById('gh-last-sync'); if(el)el.textContent='Última sync: '+t; }

function ghHeaders(extra){
  const headers = Object.assign({'Accept':'application/vnd.github.v3+json'}, extra || {});
  if(ghToken) headers.Authorization = 'Bearer ' + ghToken;
  return headers;
}

window.testGithubToken = async function(tokenOverride){
  const token = tokenOverride || document.getElementById('cfg-gh-token')?.value?.trim() || document.getElementById('gh-token')?.value?.trim();
  if(!token){ alert('Introduce el token de GitHub'); return; }
  setGhStatus('Conectando...','#d97706');
  var cfgStatus = document.getElementById('cfg-gh-status');
  if(cfgStatus){ cfgStatus.textContent = 'Conectando...'; cfgStatus.style.color = '#d97706'; }
  try{
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}`,{
      headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github.v3+json'}
    });
    if(!r.ok) throw new Error('Token inválido o sin acceso al repositorio');
    ghToken = token;
    localStorage.setItem(GH_TOKEN_LS_KEY, token);
    setGhStatus('✓ Conectado a GitHub','#16a34a');
    if(cfgStatus){ cfgStatus.textContent = '✓ Conectado y guardado'; cfgStatus.style.color = '#16a34a'; }
    var cfgInput = document.getElementById('cfg-gh-token');
    if(cfgInput) cfgInput.value = token;
    updateSettingsGhButtons(true);
    const actions = document.getElementById('gh-actions');
    if(actions) actions.style.display = '';
    if(typeof window.loadDashboard === 'function') window.loadDashboard();
  }catch(e){
    setGhStatus('Error: '+e.message,'#dc2626');
    if(cfgStatus){ cfgStatus.textContent = '✗ '+e.message; cfgStatus.style.color = '#dc2626'; }
  }
};

window.disconnectGithub = function(){
  ghToken = null;
  localStorage.removeItem(GH_TOKEN_LS_KEY);
  ['gh-token','cfg-gh-token'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
  const actions = document.getElementById('gh-actions');
  if(actions) actions.style.display = 'none';
  setGhStatus('Desconectado','#aaa');
  var cfgStatus = document.getElementById('cfg-gh-status');
  if(cfgStatus){ cfgStatus.textContent = 'Desconectado'; cfgStatus.style.color = '#aaa'; }
  updateSettingsGhButtons(false);
};

function updateSettingsGhButtons(connected){
  var btnCon = document.getElementById('cfg-gh-connect');
  var btnDis = document.getElementById('cfg-gh-disconnect');
  if(btnCon) btnCon.style.display = connected ? 'none' : '';
  if(btnDis) btnDis.style.display = connected ? '' : 'none';
}

async function ghGetFile(filename){
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filename}`,{
    headers: ghHeaders()
  });
  if(r.status===404) return null;
  if(!r.ok) throw new Error('Error leyendo '+filename+': '+r.status);
  const d = await r.json();
  return { content: JSON.parse(decodeURIComponent(escape(atob(d.content.replace(/\n/g,''))))), sha: d.sha };
}

async function ghPutFile(filename, data, sha){
  if(!ghToken) throw new Error('no-token');
  const body = { message: 'Update '+filename, content: btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2)))) };
  if(sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filename}`,{
    method:'PUT',
    headers: ghHeaders({'Content-Type':'application/json'}),
    body: JSON.stringify(body)
  });
  if(!r.ok){ const e=await r.json(); throw new Error(e.message||'Error guardando '+filename); }
  return await r.json();
}

window.githubPush = async function(){
  if(!ghToken){ alert('Conecta GitHub primero'); return; }
  setGhStatus('Subiendo a GitHub...','#d97706');
  try{
    // Portfolio
    const portfolio = getPortfolio();
    const pfExisting = await ghGetFile(GH_FILE);
    await ghPutFile(GH_FILE, portfolio, pfExisting?.sha);
    // State
    const state = JSON.parse(localStorage.getItem('return_state_v1')||'{}');
    const stExisting = await ghGetFile(GH_STATE_FILE);
    await ghPutFile(GH_STATE_FILE, state, stExisting?.sha);
    const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    setGhStatus('✓ Guardado en GitHub a las '+now,'#16a34a');
    setGhLastSync(now);
  }catch(e){ setGhStatus('Error: '+e.message,'#dc2626'); }
};

window.githubPull = async function(){
  if(!ghToken) return;
  setGhStatus('Descargando de GitHub...','#d97706');
  try{
    // Portfolio - merge
    const pfData = await ghGetFile(GH_FILE);
    if(pfData && Array.isArray(pfData.content)){
      const local = getPortfolio();
      const merged = [...local];
      pfData.content.forEach(gc=>{ if(!merged.find(lc=>lc.id===gc.id)) merged.push(gc); });
      merged.sort((a,b)=>b.id-a.id);
      localStorage.setItem(DB_KEY, JSON.stringify(merged));
      const pp2el = document.getElementById('pp2-content');
      if(pp2el) renderPortfolio(pp2el);
    }
    // State
    const stData = await ghGetFile(GH_STATE_FILE);
    if(stData && stData.content){
      localStorage.setItem('return_state_v1', JSON.stringify(stData.content));
    }
    const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    setGhStatus('✓ Sincronizado a las '+now,'#16a34a');
    setGhLastSync(now);
  }catch(e){ setGhStatus('Error: '+e.message,'#dc2626'); }
};

// Auto-push to GitHub when saving
const _origSavePortfolioGH = window.savePortfolio;
window.savePortfolio = function(c){
  if(_origSavePortfolioGH) _origSavePortfolioGH(c);
  if(ghToken) setTimeout(window.githubPush, 1000);
};

// Auto-cargar token de GitHub guardado en localStorage
document.addEventListener('DOMContentLoaded', function(){
  try {
    var saved = localStorage.getItem(GH_TOKEN_LS_KEY);
    if(saved){
      ghToken = saved;
      setGhStatus('✓ Conectado a GitHub','#16a34a');
      var actions = document.getElementById('gh-actions');
      if(actions) actions.style.display = '';
    }
  } catch(e) {}
});

// SEL ya inicializado en bloque principal


// ─── GOOGLE DRIVE SYNC ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 13 · GOOGLE DRIVE  —  sincronización
// ═══════════════════════════════════════════════════════
const DRIVE_FOLDER_ID = null;
const DRIVE_PORTFOLIO_FILE = 'return_portfolio.json';
const DRIVE_STATE_FILE     = 'return_state.json';
const DRIVE_SCOPES         = 'https://www.googleapis.com/auth/drive';

let driveToken = null;
let driveClientId = '';
let driveTokenClient = null;
let gapiReady = false;

// Load saved client ID (deferred: needs loadConfig from import.js)
document.addEventListener('DOMContentLoaded', function(){
  if (typeof loadConfig !== 'function') return;
  const cfg = loadConfig();
  if(cfg.driveClientId) driveClientId = cfg.driveClientId;
});

// Init GAPI
function initGapi(){
  return new Promise((resolve, reject)=>{
    if(gapiReady){resolve();return;}
    gapi.load('client', async ()=>{
      try{
        await gapi.client.init({});
        gapiReady = true;
        resolve();
      }catch(e){ reject(e); }
    });
  });
}

window.connectDrive = async function(){
  driveClientId = document.getElementById('drive-client-id')?.value?.trim();
  if(!driveClientId){ alert('Introduce el Client ID de OAuth y guarda la configuración primero'); return; }
  const cfg = loadConfig();
  cfg.driveClientId = driveClientId;
  saveConfig(cfg);
  setDriveStatus('Conectando...','#d97706');
  // Cargar Google APIs si no están disponibles
  if(!window.google || !window.gapi){
    try{
      await new Promise(function(res,rej){
        var s1=document.createElement('script');
        s1.src='https://apis.google.com/js/api.js';
        s1.onload=function(){
          var s2=document.createElement('script');
          s2.src='https://accounts.google.com/gsi/client';
          s2.onload=res; s2.onerror=rej;
          document.head.appendChild(s2);
        };
        s1.onerror=rej;
        document.head.appendChild(s1);
      });
    }catch(e){ setDriveStatus('Error cargando Google APIs: '+e.message,'#dc2626'); return; }
  }
  try{
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: driveClientId,
      scope: DRIVE_SCOPES,
      callback: async (resp)=>{
        if(resp.error){ setDriveStatus('Error OAuth: '+resp.error,'#dc2626'); return; }
        driveToken = resp.access_token;
        setDriveStatus('✓ Conectado a Google Drive','#16a34a');
        updateDriveUI(true);
        await driveSyncAll();
      }
    });
    driveTokenClient.requestAccessToken({prompt:'consent'});
  }catch(e){
    setDriveStatus('Error: '+e.message+' — Asegúrate de que la Drive API está habilitada en GCP','#dc2626');
  }
};

window.disconnectDrive = function(){
  if(driveToken) google.accounts.oauth2.revoke(driveToken);
  driveToken = null;
  setDriveStatus('Desconectado','#aaa');
  updateDriveUI(false);
};

function setDriveStatus(msg, color){
  const el = document.getElementById('drive-status');
  if(el){ el.textContent=msg; el.style.color=color||'#aaa'; }
}

function updateDriveUI(connected){
  const btn = document.getElementById('drive-connect-btn');
  const disc = document.getElementById('drive-disconnect-btn');
  const actions = document.getElementById('drive-actions');
  if(btn) btn.style.display = connected?'none':'';
  if(disc) disc.style.display = connected?'':'none';
  if(actions) actions.style.display = connected?'':'none';
}

// ─── DRIVE API HELPERS ────────────────────────────────────────────────
async function driveListFiles(){
  const pf = encodeURIComponent("name='" + DRIVE_PORTFOLIO_FILE + "' or name='" + DRIVE_STATE_FILE + "'");
  const q = pf + '&fields=files(id,name,modifiedTime)&spaces=drive&q=' + encodeURIComponent('trashed=false');
  const qFinal = encodeURIComponent("(name='" + DRIVE_PORTFOLIO_FILE + "' or name='" + DRIVE_STATE_FILE + "') and trashed=false");
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + qFinal + '&fields=files(id,name,modifiedTime)';
  const r = await fetch(url, {headers:{'Authorization':'Bearer '+driveToken}});
  if(!r.ok) throw new Error('Error listando archivos: '+r.status);
  const d = await r.json();
  return d.files || [];
}

async function driveReadFile(fileId){
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {headers:{'Authorization':'Bearer '+driveToken}});
  if(!r.ok) throw new Error('Error leyendo archivo: '+r.status);
  return await r.json();
}

async function driveWriteFile(name, data, existingId){
  const token = driveToken;
  const jsonStr = JSON.stringify(data);
  if(!existingId){
    // Multipart upload: metadata + content in one request
    const boundary = 'return_app_boundary_xyz';
    const meta = JSON.stringify(DRIVE_FOLDER_ID ? {name, parents:[DRIVE_FOLDER_ID]} : {name});
    const body = '--'+boundary+'\r\n'+
      'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
      meta+'\r\n'+
      '--'+boundary+'\r\n'+
      'Content-Type: application/json\r\n\r\n'+
      jsonStr+'\r\n'+
      '--'+boundary+'--';
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+token,
        'Content-Type':'multipart/related; boundary='+boundary
      },
      body
    });
    if(!r.ok){const e=await r.text();throw new Error('Error creando archivo: '+r.status+' '+e);}
    const result = await r.json();
    return result.id;
  } else {
    // Update existing file content
    const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,{
      method:'PATCH',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body: jsonStr
    });
    if(!r.ok){const e=await r.text();throw new Error('Error actualizando archivo: '+r.status+' '+e);}
    return existingId;
  }
}

// ─── SYNC FUNCTIONS ───────────────────────────────────────────────────
async function driveSyncAll(){
  setDriveStatus('Sincronizando...','#d97706');
  try{
    const files = await driveListFiles();
    const pfFile = files.find(f=>f.name===DRIVE_PORTFOLIO_FILE);
    const stFile = files.find(f=>f.name===DRIVE_STATE_FILE);

    // Merge Drive + local portfolio
    let mergedPortfolio = JSON.parse(localStorage.getItem(DB_KEY)||'[]');
    if(pfFile){
      const drivePf = await driveReadFile(pfFile.id);
      if(Array.isArray(drivePf)){
        drivePf.forEach(dc=>{ if(!mergedPortfolio.find(lc=>lc.id===dc.id)) mergedPortfolio.push(dc); });
        mergedPortfolio.sort((a,b)=>b.id-a.id);
        localStorage.setItem(DB_KEY, JSON.stringify(mergedPortfolio));
      }
    }
    // Push merged back to Drive
    await driveWriteFile(DRIVE_PORTFOLIO_FILE, mergedPortfolio, pfFile?.id);
    if(document.getElementById('pp2-content')) renderPortfolio(document.getElementById('pp2-content'));

    // Pull state from Drive
    if(stFile){
      const state = await driveReadFile(stFile.id);
      localStorage.setItem('return_state_v1', JSON.stringify(state));
    }
    // Push state to Drive
    const localState = JSON.parse(localStorage.getItem('return_state_v1')||'{}');
    await driveWriteFile(DRIVE_STATE_FILE, localState, stFile?.id);

    const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    setDriveStatus('✓ Sincronizado a las '+now,'#16a34a');
    updateDriveLastSync(now);
  }catch(e){
    setDriveStatus('Error sync: '+e.message,'#dc2626');
    console.error(e);
  }
}

window.drivePush = async function(){
  if(!driveToken){ alert('Conecta con Google Drive primero'); return; }
  setDriveStatus('Subiendo a Drive...','#d97706');
  try{
    // Capture LIVE current state
    const liveState = {
      S: {...window.S},
      F: {...window.F},
      B: {...window.B},
      SEL: {...(window.SEL||{})},
      presupuesto: window._presupuestoTotal||null,
      CATS: window.CATS ? window.CATS.map(c=>({n:c.n,open:c.open,items:c.items.map(i=>({...i}))})) : [],
      savedAt: new Date().toISOString()
    };
    // Also update localStorage
    localStorage.setItem('return_state_v1', JSON.stringify(liveState));

    const portfolio = JSON.parse(localStorage.getItem('return_portfolio_v1')||'[]');

    const files = await driveListFiles();
    const pfFile = files.find(f=>f.name===DRIVE_PORTFOLIO_FILE);
    const stFile = files.find(f=>f.name===DRIVE_STATE_FILE);

    await Promise.all([
      driveWriteFile(DRIVE_PORTFOLIO_FILE, portfolio, pfFile?.id),
      driveWriteFile(DRIVE_STATE_FILE, liveState, stFile?.id)
    ]);

    const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    setDriveStatus('✓ Subido a las '+now,'#16a34a');
    updateDriveLastSync(now);
  }catch(e){ setDriveStatus('Error: '+e.message,'#dc2626'); }
};

window.drivePull = async function(){
  if(!driveToken){ alert('Conecta con Google Drive primero'); return; }
  if(!confirm('¿Cargar desde Drive? Esto sobreescribirá los datos locales.'))return;
  setDriveStatus('Descargando de Drive...','#d97706');
  try{
    const files = await driveListFiles();
    const pfFile = files.find(f=>f.name===DRIVE_PORTFOLIO_FILE);
    const stFile = files.find(f=>f.name===DRIVE_STATE_FILE);
    if(pfFile){
      const portfolio = await driveReadFile(pfFile.id);
      localStorage.setItem('return_portfolio_v1', JSON.stringify(portfolio));
      if(document.getElementById('pp2-content')) window.loadPortfolio();
    }
    if(stFile){
      const state = await driveReadFile(stFile.id);
      localStorage.setItem('return_state_v1', JSON.stringify(state));
      autoRestore();
    }
    const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    setDriveStatus('✓ Cargado a las '+now,'#16a34a');
    updateDriveLastSync(now);
  }catch(e){ setDriveStatus('Error: '+e.message,'#dc2626'); }
};

function updateDriveLastSync(time){
  const el = document.getElementById('drive-last-sync');
  if(el) el.textContent = 'Última sync: '+time;
}

// ─── AUTO-SAVE PATCH para push a Drive ───────────────────────────────
let driveSaveTimer = null;
const _origAutoSave = window.autoSave;
window.autoSave = function(){
  if(_origAutoSave) _origAutoSave();
  if(driveToken){
    clearTimeout(driveSaveTimer);
    driveSaveTimer = setTimeout(window.drivePush, 3000); // Push 3s after last change
  }
};

// Portfolio save patch
const _origSavePortfolio = window.savePortfolio || function(){};
// savePortfolio defined in § 11 Portfolio section

// Drive UI now embedded directly in importarHTML



// ─── AUTO-SAVE / AUTO-RESTORE ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 14 · AUTO-SAVE · AUTO-RESTORE · CRITERIOS DE BÚSQUEDA
// ═══════════════════════════════════════════════════════
const STATE_KEY='return_state_v1';

function autoSave(){
  try{
    localStorage.setItem(STATE_KEY,JSON.stringify({
      S:{...window.S},F:{...window.F},B:{...window.B},
      SEL:{...window.SEL},
      presupuesto:window._presupuestoTotal||null,
      CATS:window.CATS?window.CATS.map(c=>({n:c.n,open:c.open,items:c.items.map(i=>({d:i.d,u:i.u,q:i.q,p:i.p,on:i.on,ref:i.ref||''}))})):[],
      savedAt:new Date().toISOString()
    }));
  }catch(e){}
}

function autoRestore(){
  try{
    const raw=localStorage.getItem(STATE_KEY);
    if(!raw)return;
    const st=JSON.parse(raw);
    if(st.S&&typeof st.S==='object')Object.assign(window.S,st.S);
    if(st.F&&typeof st.F==='object')Object.assign(window.F,st.F);
    if(st.B&&typeof st.B==='object')Object.assign(window.B,st.B);
    if(st.SEL&&typeof st.SEL==='object')Object.assign(window.SEL,st.SEL);
    if(st.presupuesto!=null)window._presupuestoTotal=st.presupuesto;
    // Validar CATS: si hay caracteres corruptos, descartar y usar los por defecto
    if(st.CATS&&st.CATS.length){
      const testStr=JSON.stringify(st.CATS);
      const hasGarbage=/Ã|Â°|Â±|Å|Ã©|Ã³|Ã¡|Ã­|Ãº/.test(testStr);
      if(!hasGarbage) window.CATS=st.CATS;
      else { console.log('CATS encoding corrupted - using defaults'); localStorage.removeItem(STATE_KEY); }
    }
    // Rebuild UI after restore
    if(window.rSI)window.rSI();
    if(window.rSR)window.rSR();
    if(window.rPresupuesto)window.rPresupuesto();
    if(window.rFI)window.rFI();
    if(window.rFR)window.rFR();
    if(window.rBI)window.rBI();
    if(window.rBR)window.rBR();
    // Restore location dropdowns and map
    if(window.SEL&&window.SEL.prov){
      setTimeout(()=>{
        if(window.rebuildSelects)window.rebuildSelects();
        if(window.doMapUpdate)window.doMapUpdate();
      },300);
    }
  }catch(e){console.log('Restore error:',e);}
}

// ─── SEARCH PREFERENCES ──────────────────────────────────────────────
const PREFS_KEY='return_prefs_v1';
function loadPrefs(){try{return JSON.parse(localStorage.getItem(PREFS_KEY)||'null')||{presMin:40000,presMax:90000,habMin:2,zonasText:'San Juan de Aznalfarache, Mairena del Aljarafe',ascensorRule:'3sin',estadoRef:'para reformar o buen estado',notasLibres:'',yieldMinBTR:7,roiMinFlip:20};}catch(e){return{};}}
function savePrefs(p){localStorage.setItem(PREFS_KEY,JSON.stringify(p));}

window.abrirPrefs=function(){
  const p=loadPrefs();
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:12px;padding:24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;font-family:system-ui,-apple-system,sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:500">Mis criterios de búsqueda</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;line-height:1">×</button>
      </div>

      <div style="font-size:11px;color:#aaa;margin-bottom:16px;line-height:1.5;background:#f9f9f7;padding:8px 10px;border-radius:6px">
        Estos criterios son tu referencia personal de inversión. Se guardan en el navegador y puedes consultarlos en cualquier momento. No afectan a los cálculos — son tu guía de decisión.
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#666;margin-bottom:4px">Presupuesto de compra</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Mínimo</div>
            <div style="display:flex;align-items:center;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
              <input type="number" id="pf-presMin" value="${p.presMin||40000}" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none">
              <span style="padding:6px 9px;font-size:11px;color:#aaa;background:#f4f4f0;border-left:1px solid #e5e5e0">€</span>
            </div>
          </div>
          <div>
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Máximo</div>
            <div style="display:flex;align-items:center;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
              <input type="number" id="pf-presMax" value="${p.presMax||90000}" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none">
              <span style="padding:6px 9px;font-size:11px;color:#aaa;background:#f4f4f0;border-left:1px solid #e5e5e0">€</span>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#666;margin-bottom:4px">Habitaciones mínimas</div>
        <div style="display:flex;align-items:center;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden;max-width:160px">
          <input type="number" id="pf-habMin" value="${p.habMin||2}" min="1" max="10" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none">
          <span style="padding:6px 9px;font-size:11px;color:#aaa;background:#f4f4f0;border-left:1px solid #e5e5e0">hab</span>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#666;margin-bottom:4px">Zonas prioritarias</div>
        <div style="border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
          <textarea id="pf-zonas" rows="3" style="width:100%;border:none;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;resize:vertical">${p.zonasText||''}</textarea>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#666;margin-bottom:6px">Criterio planta / ascensor</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
            ['3sin','Descartar 3ª o superior sin ascensor (mi criterio actual)'],
            ['cualquier','Cualquier planta con o sin ascensor'],
            ['soloAsc','Solo con ascensor en cualquier planta'],
            ['bajo','Preferencia planta baja o 1ª'],
          ].map(([v,l])=>`<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#555;cursor:pointer">
            <input type="radio" name="pf-asc" value="${v}" ${(p.ascensorRule||'3sin')===v?'checked':''} style="accent-color:#ba7517">
            ${l}
          </label>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#666;margin-bottom:4px">Estado del inmueble preferido</div>
        <div style="border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
          <select id="pf-estado" style="width:100%;border:none;padding:8px 10px;font-size:13px;font-family:inherit;outline:none;background:#fff;cursor:pointer">
            <option value="para reformar o buen estado" ${(p.estadoRef||'')==='para reformar o buen estado'?'selected':''}>Para reformar o buen estado</option>
            <option value="para reformar" ${p.estadoRef==='para reformar'?'selected':''}>Solo para reformar</option>
            <option value="buen estado" ${p.estadoRef==='buen estado'?'selected':''}>Solo buen estado</option>
            <option value="cualquier estado" ${p.estadoRef==='cualquier estado'?'selected':''}>Cualquier estado</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:#666;margin-bottom:4px">Yield mínima BTR</div>
          <div style="display:flex;align-items:center;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
            <input type="number" id="pf-yieldMin" value="${p.yieldMinBTR||7}" step="0.5" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none">
            <span style="padding:6px 9px;font-size:11px;color:#aaa;background:#f4f4f0;border-left:1px solid #e5e5e0">% neta</span>
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#666;margin-bottom:4px">ROI mínimo Flip</div>
          <div style="display:flex;align-items:center;border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
            <input type="number" id="pf-roiMin" value="${p.roiMinFlip||20}" step="1" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none">
            <span style="padding:6px 9px;font-size:11px;color:#aaa;background:#f4f4f0;border-left:1px solid #e5e5e0">% capital</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:11px;color:#666;margin-bottom:4px">Notas libres</div>
        <div style="border:1px solid #e5e5e0;border-radius:6px;overflow:hidden">
          <textarea id="pf-notas" rows="3" placeholder="Ej: solo pisos, no locales. Evitar fincas sin ITE. Preferencia plantas intermedias..." style="width:100%;border:none;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;resize:vertical">${p.notasLibres||''}</textarea>
        </div>
      </div>

      <div style="display:flex;gap:8px">
        <button onclick="guardarPrefs()" style="flex:1;padding:9px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500">Guardar criterios</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:9px 16px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;color:#555">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
};

window.guardarPrefs=function(){
  const asc=document.querySelector('input[name="pf-asc"]:checked')?.value||'3sin';
  const p={
    presMin:+document.getElementById('pf-presMin')?.value||40000,
    presMax:+document.getElementById('pf-presMax')?.value||90000,
    habMin:+document.getElementById('pf-habMin')?.value||2,
    zonasText:document.getElementById('pf-zonas')?.value||'',
    ascensorRule:asc,
    estadoRef:document.getElementById('pf-estado')?.value||'',
    yieldMinBTR:+document.getElementById('pf-yieldMin')?.value||7,
    roiMinFlip:+document.getElementById('pf-roiMin')?.value||20,
    notasLibres:document.getElementById('pf-notas')?.value||'',
  };
  savePrefs(p);
  document.querySelector('[style*=fixed]')?.remove();
  mostrarBadgePrefs();
};

function mostrarBadgePrefs(){
  const p=loadPrefs();
  const el=document.getElementById('prefs-badge');
  if(!el)return;
  const zonas=p.zonasText?p.zonasText.split(',').map(z=>z.trim()).filter(Boolean):[];
  el.innerHTML=`
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
      <span style="font-size:11px;background:#1a1a1a;color:#fff;border-radius:4px;padding:2px 8px">${(p.presMin/1000).toFixed(0)}k – ${(p.presMax/1000).toFixed(0)}k €</span>
      <span style="font-size:11px;background:#f4f4f0;border:1px solid #e5e5e0;border-radius:4px;padding:2px 8px">min. ${p.habMin} hab</span>
      ${zonas.slice(0,3).map(z=>`<span style="font-size:11px;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:2px 8px;color:#92400e">${z}</span>`).join('')}
      <span style="font-size:11px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:2px 8px;color:#15803d">BTR ≥${p.yieldMinBTR}%</span>
      <span style="font-size:11px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:2px 8px;color:#15803d">Flip ROI ≥${p.roiMinFlip}%</span>
    </div>`;
}

// ─── PATCH rSR para inyectar badge de criterios ───────────────────────
const _origRSR=window.rSR;
window.rSR=function(){
  if(_origRSR)_origRSR();
  // Añadir botón de criterios si no existe
  const sr=document.getElementById('sr');
  if(!sr)return;
  if(document.getElementById('prefs-card'))return;
  const card=document.createElement('div');
  card.id='prefs-card';
  card.style.cssText='border:1px solid #e5e5e0;border-radius:10px;padding:12px;margin-bottom:8px;background:#fff';
  card.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:12px;font-weight:500;color:#555">Mis criterios de búsqueda</div>
      <button onclick="abrirPrefs()" style="padding:4px 10px;border:1px solid #e5e5e0;border-radius:5px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555;font-weight:500">Editar</button>
    </div>
    <div id="prefs-badge"></div>`;
  sr.insertBefore(card, sr.firstChild);
  mostrarBadgePrefs();
};

// ─── PATCH us/uf/ub/tsh/tb2 para auto-save ───────────────────────────
const _origUs=window.us,_origUf=window.uf,_origUb=window.ub,_origTsh=window.tsh,_origTb2=window.tb2;
window.us=(k,v)=>{if(_origUs)_origUs(k,v);autoSave();};
window.uf=(k,v)=>{if(_origUf)_origUf(k,v);autoSave();};
window.ub=(k,v)=>{if(_origUb)_origUb(k,v);autoSave();};
window.tsh=(k)=>{if(_origTsh)_origTsh(k);autoSave();};
window.tb2=(k)=>{if(_origTb2)_origTb2(k);autoSave();};

// Patch SEL updates to auto-save
const _origSetProv=window.setProv,_origSetMun=window.setMun,_origSetBar=window.setBar,_origSetSub=window.setSub;
window.setProv=(v)=>{if(_origSetProv)_origSetProv(v);autoSave();};
window.setMun=(v)=>{if(_origSetMun)_origSetMun(v);autoSave();};
window.setBar=(v)=>{if(_origSetBar)_origSetBar(v);autoSave();};
window.setSub=(v)=>{if(_origSetSub)_origSetSub(v);autoSave();};

// ─── DASHBOARD ASSETS GITHUB SYNC ────────────────────────────────────
// Cada activo del dashboard se guarda como dashboard/{id}.json en el repo

window.githubSaveDashboardAsset = async function(asset) {
  if (!ghToken) return { ok: false, reason: 'no-token' };
  try {
    var path = 'dashboard/' + asset.id + '.json';
    var existing = null;
    try { existing = await ghGetFile(path); } catch(e) {}
    await ghPutFile(path, asset, existing ? existing.sha : null);
    return { ok: true };
  } catch(e) {
    return { ok: false, reason: e.message };
  }
};

window.githubDeleteDashboardAsset = async function(id) {
  if (!ghToken) return { ok: false, reason: 'no-token' };
  try {
    var path = 'dashboard/' + id + '.json';
    var existing = null;
    try { existing = await ghGetFile(path); } catch(e) {}
    if (!existing) return { ok: true };
    var r = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + path, {
      method: 'DELETE',
      headers: ghHeaders({'Content-Type':'application/json'}),
      body: JSON.stringify({ message: 'Delete property: ' + id, sha: existing.sha })
    });
    if (!r.ok) {
      var e = await r.json().catch(function(){ return {}; });
      return { ok: false, reason: e.message || ('HTTP ' + r.status) };
    }
    return { ok: true };
  } catch(e) {
    return { ok: false, reason: e.message };
  }
};

window.githubLoadDashboardAssets = async function() {
  try {
    var r = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/dashboard', {
      headers: ghHeaders()
    });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var entries = await r.json();
    var assets = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      try {
        if (entry.type === 'dir') {
          // Nuevo formato: dashboard/{nombre}/asset.json
          var fileData = await ghGetFile(entry.path + '/asset.json');
          if (fileData && fileData.content) assets.push(fileData.content);
        } else if (entry.type === 'file' && entry.name.endsWith('.json')) {
          // Formato antiguo: dashboard/{id}.json
          var fileData2 = await ghGetFile(entry.path);
          if (fileData2 && fileData2.content) assets.push(fileData2.content);
        }
      } catch(e2) { console.warn('Error loading', entry.name, e2); }
    }
    return assets;
  } catch(e) {
    console.error('githubLoadDashboardAssets:', e);
    return null;
  }
};

window.githubHasDashboardToken = function() { return !!ghToken; };

// ─── MODAL DE AJUSTES ────────────────────────────────────────────────────────
window.openSettings = function(){
  var existing = document.getElementById('settings-modal-overlay');
  if(existing){ existing.remove(); return; }

  var cfg = (typeof loadConfig === 'function') ? loadConfig() : {};
  var savedToken = localStorage.getItem(GH_TOKEN_LS_KEY) || '';
  var connected = !!ghToken;

  var ov = document.createElement('div');
  ov.id = 'settings-modal-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9500;display:flex;align-items:flex-start;justify-content:flex-end;padding:56px 12px 0';

  var provOpts = ['groq','openai','google','anthropic'].map(function(p){
    var labels = {groq:'Groq (gratis)',openai:'OpenAI',google:'Google Gemini',anthropic:'Anthropic Claude'};
    return '<option value="'+p+'"'+(cfg.provider===p?' selected':'')+'>'+labels[p]+'</option>';
  }).join('');

  ov.innerHTML =
    '<div style="background:#fff;border-radius:14px;padding:0;width:380px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22);font-family:system-ui,-apple-system,sans-serif">' +

    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #f0f0ea">' +
    '<div style="font-size:15px;font-weight:600;color:#1a1a1a">⚙ Ajustes</div>' +
    '<button id="cfg-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#aaa;line-height:1">×</button>' +
    '</div>' +

    // GitHub section
    '<div style="padding:16px 20px;border-bottom:1px solid #f0f0ea">' +
    '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">GitHub</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:8px;line-height:1.5">Token <em>fine-grained</em> para <strong>enriquesem22/V2</strong> con permiso <strong>Contents: Read &amp; write</strong>. Se guarda en el navegador.</div>' +
    '<div style="margin-bottom:8px">' +
    '<input id="cfg-gh-token" type="password" value="'+escapeHtmlAttr(savedToken)+'" placeholder="ghp_..." ' +
    'style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box;color:#1a1a1a">' +
    '</div>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<button id="cfg-gh-connect" style="padding:7px 14px;border:none;border-radius:6px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500'+(connected?';display:none':'')+'">Conectar y guardar</button>' +
    '<button id="cfg-gh-disconnect" style="padding:7px 14px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#dc2626;font-size:12px;cursor:pointer;font-family:inherit'+(connected?'':';display:none')+'">Desconectar</button>' +
    '<span id="cfg-gh-status" style="font-size:11px;color:'+(connected?'#16a34a':'#aaa')+'">'+(connected?'✓ Conectado':'Sin conectar')+'</span>' +
    '</div>' +
    '</div>' +

    // IA section
    '<div style="padding:16px 20px;border-bottom:1px solid #f0f0ea">' +
    '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Inteligencia Artificial</div>' +
    '<div style="margin-bottom:10px">' +
    '<div style="font-size:11px;color:#666;margin-bottom:4px">Proveedor</div>' +
    '<select id="cfg-ai-provider" onchange="cfgToggleProvider()" style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:13px;font-family:inherit;outline:none;background:#fff;cursor:pointer;box-sizing:border-box">' +
    provOpts + '</select>' +
    '</div>' +
    '<div id="cfg-row-groq" style="margin-bottom:8px'+(cfg.provider!=='groq'&&cfg.provider?';display:none':'')+'">'+
    '<div style="font-size:11px;color:#666;margin-bottom:4px">API Key Groq</div>'+
    '<input id="cfg-groq-key" type="password" value="'+escapeHtmlAttr(cfg.groqKey||'')+'" placeholder="gsk_..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box">'+
    '</div>' +
    '<div id="cfg-row-openai" style="margin-bottom:8px;display:'+(cfg.provider==='openai'?'block':'none')+'">'+
    '<div style="font-size:11px;color:#666;margin-bottom:4px">API Key OpenAI</div>'+
    '<input id="cfg-openai-key" type="password" value="'+escapeHtmlAttr(cfg.openaiKey||'')+'" placeholder="sk-..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box">'+
    '</div>' +
    '<div id="cfg-row-google" style="margin-bottom:8px;display:'+(cfg.provider==='google'?'block':'none')+'">'+
    '<div style="font-size:11px;color:#666;margin-bottom:4px">API Key Google Gemini</div>'+
    '<input id="cfg-goog-key" type="password" value="'+escapeHtmlAttr(cfg.googKey||'')+'" placeholder="AIza..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box">'+
    '</div>' +
    '<div id="cfg-row-anth" style="margin-bottom:8px;display:'+(cfg.provider==='anthropic'?'block':'none')+'">'+
    '<div style="font-size:11px;color:#666;margin-bottom:4px">API Key Anthropic</div>'+
    '<input id="cfg-anth-key" type="password" value="'+escapeHtmlAttr(cfg.anthKey||'')+'" placeholder="sk-ant-..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box">'+
    '</div>' +
    '<div style="margin-bottom:8px">' +
    '<div style="font-size:11px;color:#666;margin-bottom:4px">Proxy URL <span style="color:#bbb">(opcional)</span></div>'+
    '<input id="cfg-proxy-url" type="url" value="'+escapeHtmlAttr(cfg.proxyUrl||'')+'" placeholder="https://mi-proxy.com/..." style="width:100%;padding:8px 10px;border:1px solid #e5e5e0;border-radius:6px;font-size:12px;font-family:\'Courier New\',monospace;outline:none;box-sizing:border-box">'+
    '</div>' +
    '<button onclick="cfgSaveAI()" style="padding:7px 16px;border:none;border-radius:6px;background:#ba7517;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Guardar IA</button>' +
    '<span id="cfg-ai-status" style="font-size:11px;color:#16a34a;margin-left:10px"></span>' +
    '</div>' +

    // Importar
    '<div style="padding:16px 20px;border-bottom:1px solid #f0f0ea">' +
    '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Importar activos</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:10px;line-height:1.5">Importa activos desde ficheros JSON o mediante IA.</div>' +
    '<button onclick="(function(){var o=document.getElementById(\'settings-modal-overlay\');if(o)o.remove();var t=document.querySelector(\'.tab[data-tab=\\\"ip\\\"]\');if(t){t.style.display=\'\';if(typeof sw===\'function\')sw(\'ip\',t);}})();" style="padding:7px 14px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Ir a Importar →</button>' +
    '</div>' +

    // Criterios de búsqueda
    '<div style="padding:16px 20px">' +
    '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Criterios de búsqueda</div>' +
    '<button onclick="abrirPrefs()" style="padding:7px 14px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;color:#555;font-size:12px;cursor:pointer;font-family:inherit">Editar mis criterios →</button>' +
    '</div>' +

    '</div>';

  document.body.appendChild(ov);

  // Close handlers
  document.getElementById('cfg-close').addEventListener('click', function(){ ov.remove(); });
  ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });

  // GitHub buttons
  document.getElementById('cfg-gh-connect').addEventListener('click', function(){
    window.testGithubToken();
  });
  document.getElementById('cfg-gh-disconnect').addEventListener('click', function(){
    window.disconnectGithub();
  });
};

function escapeHtmlAttr(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

window.cfgToggleProvider = function(){
  var p = document.getElementById('cfg-ai-provider')?.value;
  ['groq','openai','google','anth'].forEach(function(k){
    var el = document.getElementById('cfg-row-'+k);
    if(el) el.style.display = (k===p||(k==='google'&&p==='google')) ? 'block' : 'none';
  });
  // google ID fix
  var goog = document.getElementById('cfg-row-google');
  if(goog) goog.style.display = (p==='google') ? 'block' : 'none';
};

window.cfgSaveAI = function(){
  var p = document.getElementById('cfg-ai-provider')?.value || 'groq';
  var cfg = (typeof loadConfig === 'function') ? loadConfig() : {};
  cfg.provider  = p;
  cfg.groqKey   = (document.getElementById('cfg-groq-key')?.value||'').trim();
  cfg.openaiKey = (document.getElementById('cfg-openai-key')?.value||'').trim();
  cfg.googKey   = (document.getElementById('cfg-goog-key')?.value||'').trim();
  cfg.anthKey   = (document.getElementById('cfg-anth-key')?.value||'').trim();
  cfg.proxyUrl  = (document.getElementById('cfg-proxy-url')?.value||'').trim();
  if(typeof saveConfig === 'function') saveConfig(cfg);
  // Sync también al formulario de la pestaña Importar si está abierta
  ['ai-provider','groq-key','openai-key','goog-key','anth-key','proxy-url'].forEach(function(id){
    var src = document.getElementById('cfg-'+id.replace('-key','-key').replace('ai-','ai-'));
    var dst = document.getElementById(id);
    if(src && dst) dst.value = src.value;
  });
  var st = document.getElementById('cfg-ai-status');
  if(st){ st.textContent = '✓ Guardado'; setTimeout(function(){ st.textContent=''; }, 2500); }
};

// ─── RESTAURAR AL CARGAR ──────────────────────────────────────────────
window.addEventListener('load', function(){
  // 1. Restaurar estado guardado
  try{ autoRestore(); }catch(e){ console.error('autoRestore:',e); }

  // 2. Renderizar pestaña Importar
  try{
    var ipEl = document.getElementById('ip-content');
    if(ipEl && !ipEl.dataset.ready && typeof importarHTML === 'function'){
      ipEl.dataset.ready = '1';
      var cfg = loadConfig();
      ipEl.innerHTML = importarHTML();
      var setV = function(id,v){ var e=document.getElementById(id); if(e&&v) e.value=v; };
      setV('ai-provider', cfg.provider||'groq');
      setV('groq-key', cfg.groqKey||'');
      setV('openai-key', cfg.openaiKey||'');
      setV('goog-key', cfg.googKey||'');
      setV('anth-key', cfg.anthKey||'');
      setV('proxy-url', cfg.proxyUrl||'');
      setV('drive-client-id', cfg.driveClientId||'');
      if(cfg.driveClientId) driveClientId = cfg.driveClientId;
      try{ toggleProviderFields(); }catch(e){}
    }
  }catch(e){ console.error('init importar:',e); }

  // 3. Renderizar Portfolio
  try{
    var pp2El = document.getElementById('pp2-content');
    if(pp2El && typeof renderPortfolio === 'function') renderPortfolio(pp2El);
  }catch(e){ console.error('init portfolio:',e); }
});


