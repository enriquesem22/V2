// import.js — Pestaña Importar: lectura de anuncios y análisis con IA
// Proveedores: Groq (gratis), OpenAI, Google Gemini, Anthropic Claude
// Lectura de URLs: Jina AI Reader (gratuito, sin API key)
// Los comparables solo se extraen de datos reales (no se generan con IA)



// ─── CONFIG localStorage ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 9 · CONFIG IA  —  OpenAI · Gemini · Claude
// ═══════════════════════════════════════════════════════
const CFG_KEY = 'return_config_v1';
function loadConfig(){
  try{
    const cfg = JSON.parse(localStorage.getItem(CFG_KEY)||'{}');
    // Si el proveedor guardado no tiene key, resetear a groq
    const keyMap = {groq:cfg.groqKey,openai:cfg.openaiKey,google:cfg.googKey,anthropic:cfg.anthKey};
    if(cfg.provider && !keyMap[cfg.provider]) cfg.provider = 'groq';
    if(!cfg.provider) cfg.provider = 'groq';
    return cfg;
  }catch(e){ return {provider:'groq'}; }
}
function saveConfig(c){ localStorage.setItem(CFG_KEY, JSON.stringify(c)); }

window.saveApiConfig = function(){
  const cfg = {
    provider:      document.getElementById('ai-provider')?.value || 'groq',
    groqKey:       (document.getElementById('groq-key')?.value||'').trim(),
    openaiKey:     document.getElementById('openai-key')?.value?.trim() || '',
    googKey:       document.getElementById('goog-key')?.value?.trim() || '',
    anthKey:       document.getElementById('anth-key')?.value?.trim() || '',
    proxyUrl:      document.getElementById('proxy-url')?.value?.trim() || '',
    driveClientId: document.getElementById('drive-client-id')?.value?.trim() || '',
    ghToken:       document.getElementById('gh-token')?.value?.trim() || '',
  };
  if(cfg.driveClientId) driveClientId = cfg.driveClientId;
  if(cfg.ghToken) ghToken = cfg.ghToken;
  saveConfig(cfg);
  const st = document.getElementById('cfg-status');
  if(st){ st.textContent = '✓ Configuración guardada'; st.style.color='#16a34a'; setTimeout(()=>{st.textContent='';},3000); }
};

window.toggleProviderFields = function(){
  const p = document.getElementById('ai-provider')?.value;
  ['row-groq','row-openai','row-goog','row-anth'].forEach(function(id){
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const map={groq:'row-groq',openai:'row-openai',google:'row-goog',anthropic:'row-anth'};
  const show=document.getElementById(map[p]);
  if(show) show.style.display='';
};

// ─── INICIALIZAR PESTAÑA IMPORTAR ────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 10 · IMPORTAR ANUNCIO  —  UI + llamadas a IA
// ═══════════════════════════════════════════════════════

function initImport(){
  const el = document.getElementById('ip-content');
  if(!el) return;
  // Renderizar solo la primera vez
  if(!el.dataset.init){
    el.dataset.init = '1';
    el.innerHTML = importarHTML();
  }
  // Siempre restaurar configuración guardada
  const cfg = loadConfig();
  const setV = (id,v)=>{ const e=document.getElementById(id); if(e!==null&&v) e.value=v; };
  setV('ai-provider', cfg.provider||'groq');
  setV('groq-key', cfg.groqKey||'');
  setV('openai-key', cfg.openaiKey||'');
  setV('goog-key', cfg.googKey||'');
  setV('anth-key', cfg.anthKey||'');
  setV('proxy-url', cfg.proxyUrl||'');
  setV('drive-client-id', cfg.driveClientId||'');
  setV('gh-token', cfg.ghToken||'');
  if(cfg.driveClientId) driveClientId = cfg.driveClientId;
  if(cfg.ghToken){
    ghToken = cfg.ghToken;
    const a = document.getElementById('gh-actions');
    if(a) a.style.display = '';
    setGhStatus('✓ GitHub configurado (↓ para sincronizar)','#16a34a');
  }
  try{ toggleProviderFields(); }catch(e){}
  if(driveToken) updateDriveUI(true);
}
// sw patching moved to unified sw function below

// ─── HTML IMPORTAR ───────────────────────────────────────────────────
function importarHTML(){
  return `<div style="max-width:820px">
    <div class="sec">
      <div class="sec-h" onclick="toggleSec2('sec-cfg')">
        <span class="sec-ht">⚙ Configuración IA y servidor</span>
        <span class="arr open" id="a-sec-cfg">▼</span>
      </div>
      <div class="sec-b open" id="sec-cfg">
        <div class="irow">
          <div class="ilbl">Proveedor de IA</div>
          <div class="iwrap">
            <select id="ai-provider" onchange="toggleProviderFields()">
              <option value="groq">Groq — GRATIS · Llama 3.1 · Sin tarjeta</option>
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="google">Google Gemini</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
        </div>

        <div id="row-groq">
          <div class="irow">
            <div class="ilbl">Groq API Key <span style="color:#16a34a;font-weight:500">— GRATIS, sin tarjeta</span></div>
            <div class="iwrap"><input type="password" id="groq-key" placeholder="gsk_..." style="font-family:'Courier New',monospace;font-size:12px"></div>
          </div>
          <div style="font-size:10px;color:#bbb;margin:-4px 0 8px;line-height:1.5">
            Crea tu key gratis en <a href="https://console.groq.com/keys" target="_blank" style="color:#ba7517">console.groq.com/keys</a> · 14.400 peticiones/día · Modelo: <b>llama-3.1-8b-instant</b>
          </div>
        </div>

        <div id="row-openai" style="display:none">
          <div class="irow">
            <div class="ilbl">OpenAI API Key</div>
            <div class="iwrap"><input type="password" id="openai-key" placeholder="sk-proj-..." style="font-family:'Courier New',monospace;font-size:12px"></div>
          </div>
          <div style="font-size:10px;color:#bbb;margin:-4px 0 8px;line-height:1.5">
            <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#ba7517">platform.openai.com/api-keys</a> · Modelo: <b>gpt-4o-mini</b> (~0,002€ por anuncio)
          </div>
        </div>

        <div id="row-goog" style="display:none">
          <div class="irow">
            <div class="ilbl">Google API Key <span style="color:#16a34a;font-weight:400">— gratuita</span></div>
            <div class="iwrap"><input type="password" id="goog-key" placeholder="AIzaSy..." style="font-family:'Courier New',monospace;font-size:12px"></div>
          </div>
          <div style="font-size:10px;color:#bbb;margin:-4px 0 8px;line-height:1.5">
            <a href="https://aistudio.google.com/apikey" target="_blank" style="color:#ba7517">aistudio.google.com/apikey</a> · Modelo: <b>gemini-2.0-flash-lite</b> · 1.500 peticiones/día gratis
          </div>
        </div>

        <div id="row-anth" style="display:none">
          <div class="irow">
            <div class="ilbl">Anthropic API Key</div>
            <div class="iwrap"><input type="password" id="anth-key" placeholder="sk-ant-..." style="font-family:'Courier New',monospace;font-size:12px"></div>
          </div>
          <div style="font-size:10px;color:#bbb;margin:-4px 0 8px">
            <a href="https://console.anthropic.com" target="_blank" style="color:#ba7517">console.anthropic.com</a>
          </div>
        </div>

        <div class="irow">
          <div class="ilbl">URL proxy servidor propio <span style="color:#bbb;font-weight:400">(opcional — para scraping de Idealista)</span></div>
          <div class="iwrap"><input type="url" id="proxy-url" placeholder="https://tu-servidor.run.app/fetch" style="font-size:12px"></div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <button onclick="saveApiConfig()" style="padding:7px 16px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Guardar configuración</button>
          <span id="cfg-status" style="font-size:11px"></span>
        </div>

        <div style="border-top:1px solid #e5e5e0;margin-top:14px;padding-top:14px">
          <div style="font-size:12px;font-weight:500;color:#555;margin-bottom:8px;display:flex;align-items:center;gap:8px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub — almacenamiento del portfolio
          </div>
          <div style="font-size:10px;color:#bbb;line-height:1.5;margin-bottom:10px;padding:8px 10px;background:#f9f9f7;border-radius:6px">
            Guarda el portfolio en tu repositorio de GitHub. Funciona desde cualquier dispositivo sin necesidad de Google Drive.
          </div>
          <div class="irow">
            <div class="ilbl">Personal Access Token <span style="color:#bbb;font-weight:400">(github.com/settings/tokens)</span></div>
            <div class="iwrap"><input type="password" id="gh-token" placeholder="ghp_..." style="font-size:12px;font-family:'Courier New',monospace"></div>
          </div>
          <div style="font-size:10px;color:#bbb;margin:-4px 0 8px">Crea un token en GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic). Marca solo el permiso <b>repo</b>.</div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <button onclick="testGithubToken()" style="padding:7px 14px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Conectar GitHub</button>
            <span id="gh-status" style="font-size:11px;color:#aaa"></span>
          </div>
          <div id="gh-actions" style="display:none;margin-top:8px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <button onclick="githubPush()" style="padding:6px 12px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555">↑ Subir a GitHub</button>
              <button onclick="githubPull()" style="padding:6px 12px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555">↓ Descargar de GitHub</button>
              <span id="gh-last-sync" style="font-size:10px;color:#bbb"></span>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid #e5e5e0;margin-top:14px;padding-top:14px">
          <div style="font-size:12px;font-weight:500;color:#555;margin-bottom:8px">Google Drive — sincronización</div>
          <div style="font-size:10px;color:#bbb;line-height:1.5;margin-bottom:10px;padding:8px 10px;background:#f9f9f7;border-radius:6px">
            Guarda el portfolio y el estado en tu carpeta de Drive. Los archivos aparecerán como <b>return_portfolio.json</b> y <b>return_state.json</b>.
          </div>
          <div class="irow">
            <div class="ilbl">OAuth 2.0 Client ID <span style="color:#bbb;font-weight:400">(de GCP Console → Clientes)</span></div>
            <div class="iwrap"><input type="text" id="drive-client-id" placeholder="253233836006-xxxx.apps.googleusercontent.com" style="font-size:11px;font-family:'Courier New',monospace"></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <button id="drive-connect-btn" onclick="connectDrive()" style="padding:7px 14px;border:1px solid #4285f4;border-radius:6px;background:#4285f4;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">Conectar con Google Drive</button>
            <button id="drive-disconnect-btn" onclick="disconnectDrive()" style="padding:7px 14px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;color:#dc2626;display:none">Desconectar</button>
            <span id="drive-status" style="font-size:11px;color:#aaa"></span>
          </div>
          <div id="drive-actions" style="margin-top:8px;display:none">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <button onclick="drivePush()" style="padding:6px 12px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555">↑ Subir a Drive</button>
              <button onclick="drivePull()" style="padding:6px 12px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555">↓ Descargar de Drive</button>
              <button onclick="driveSyncAll()" style="padding:6px 12px;border:1px solid #86efac;border-radius:6px;background:#f0fdf4;font-size:11px;cursor:pointer;font-family:inherit;color:#15803d">⟳ Sincronizar ahora</button>
              <span id="drive-last-sync" style="font-size:10px;color:#bbb"></span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="sec">
      <div class="sec-h" onclick="toggleSec2('sec-import')">
        <span class="sec-ht">Importar anuncio</span>
        <span class="arr open" id="a-sec-import">▼</span>
      </div>
      <div class="sec-b open" id="sec-import">
        <div style="font-size:11px;color:#888;line-height:1.6;margin-bottom:10px;border:1px solid #e5e5e0;border-radius:6px;padding:10px 12px;background:#fafaf8">
          <b style="color:#555">Cómo importar:</b><br>
          <b style="color:#ba7517">Opción A — URL directa (gratis, recomendado):</b><br>
          Pega el enlace del anuncio y pulsa <b>Leer página →</b>. Funciona con Idealista, Fotocasa, pisos.com.<br><br>
          <b style="color:#555">Opción B — Texto manual:</b><br>
          Selecciona todo en el anuncio (Ctrl+A → Ctrl+C), pégalo abajo y pulsa <b>Analizar con IA</b>.
        </div>

        <div class="ilbl" style="margin-bottom:4px">URL del anuncio <span style="color:#ba7517">— gratis, sin configuración extra</span></div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div class="iwrap" style="flex:1">
            <input type="url" id="url-inp" placeholder="https://www.idealista.com/inmueble/... o fotocasa, pisos.com..." style="font-size:12px">
          </div>
          <button onclick="fetchUrl()" id="url-btn" style="padding:7px 14px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;white-space:nowrap">Leer página →</button>
        </div>

        <div class="ilbl" style="margin-bottom:4px">Texto del anuncio</div>
        <textarea id="listing-txt" rows="9" style="width:100%;border:1px solid #e5e5e0;border-radius:6px;padding:10px;font-size:12px;font-family:inherit;line-height:1.5;resize:vertical;outline:none;color:#1a1a1a;background:#fff" placeholder="Pega aquí el texto del anuncio...&#10;&#10;Ejemplo:&#10;Piso en venta en Triana, Sevilla&#10;Precio: 185.000 €&#10;75 m² · 3 hab · 1 baño · Planta 2ª sin ascensor&#10;Estado: Para reformar · Año 1963&#10;Comunidad: 45 €/mes · IBI: 280 €/año"></textarea>

        <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">
          <button onclick="analizarAnuncio()" id="analyze-btn" style="padding:8px 18px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500">Analizar con IA</button>
          <button onclick="clearImport()" style="padding:8px 12px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit;color:#888">Limpiar</button>
          <span id="analyze-status" style="font-size:11px;color:#aaa"></span>
        </div>
      </div>
    </div>
    <div id="import-result"></div>
  </div>`;
}

window.toggleSec2 = function(id){
  const b=document.getElementById(id),a=document.getElementById('a-'+id);
  if(!b)return;
  b.classList.toggle('open');
  if(a)a.classList.toggle('open',b.classList.contains('open'));
};

// ─── FETCH URL ───────────────────────────────────────────────────────
window.fetchUrl = async function(){
  const url = document.getElementById('url-inp')?.value?.trim();
  if(!url){ alert('Introduce una URL'); return; }
  const cfg = loadConfig();
  const btn = document.getElementById('url-btn');
  const st  = document.getElementById('analyze-status');
  btn.textContent = 'Leyendo...'; btn.disabled = true;
  st.textContent = ''; st.style.color = '#aaa';

  // ── MÉTODO 1: Jina AI Reader — GRATIS, sin API key ───────────────
  st.textContent = 'Leyendo con Jina Reader (gratis)...';
  try{
    const jinaUrl = 'https://r.jina.ai/' + url;
    const c1 = new AbortController(); setTimeout(()=>c1.abort(), 15000);
    const r = await fetch(jinaUrl, {
      headers:{ 'Accept': 'text/plain', 'X-Return-Format': 'markdown', 'X-With-Images-Summary': 'true' },
      signal: c1.signal
    });
    if(r.ok){
      let raw = await r.text();
      // Limpiar basura típica de portales inmobiliarios
      // Quitar bloques de idiomas repetidos
      raw = raw.replace(/(Español Català English Français[\s\S]{0,300}){2,}/g, '');
      // Quitar líneas de navegación irrelevantes
      raw = raw.replace(/Saltar al contenido principal.*?\n/g, '');
      raw = raw.replace(/Guardar favorito.*?\n/gi, '');
      raw = raw.replace(/Compartir.*?\n/gi, '');
      // Limpiar espacios múltiples
      raw = raw.replace(/\n{3,}/g, '\n\n').trim();
      const text = raw.substring(0, 6000).trim();
      if(text.length > 200){
        // Extraer URLs de imágenes del texto de Jina
        const mdImgs=[...raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map(m=>m[1]);
        const dirImgs=(raw.match(/https?:\/\/[^\s"')\]]+\.(?:jpg|jpeg|png|webp)[^\s]{0,60}/gi)||[]);
        const allImgs=[...new Set([...mdImgs,...dirImgs])].filter(u=>!u.includes('logo')&&!u.includes('icon')).slice(0,6);
        window._jinaImageUrls=allImgs;
        raw=raw.replace(/!\[[^\]]*\]\([^)]+\)/g,'');
        document.getElementById('listing-txt').value = text;
        st.textContent = '✓ Página leída'+(allImgs.length?' · '+allImgs.length+' foto(s) detectada(s)':'')+'. Pulsa Analizar con IA.';
        st.style.color = '#16a34a';
        btn.textContent = 'Leer página →'; btn.disabled = false;
        return;
      }
    }
  }catch(e){ console.log('Jina error:', e.message); }

  // ── MÉTODO 2: allorigins.win ──────────────────────────────────────
  st.textContent = 'Probando proxy alternativo...';
  try{
    const c2 = new AbortController(); setTimeout(()=>c2.abort(), 10000);
    const r2 = await fetch('https://api.allorigins.win/get?url='+encodeURIComponent(url), {signal:c2.signal});
    if(r2.ok){
      const d = await r2.json();
      const text = (d.contents||'')
        .replace(/<scr'+'ipt[\s\S]*?<\/sc'+'ript>/gi,'')
        .replace(/<style[\s\S]*?<\/style>/gi,'')
        .replace(/<[^>]+>/g,' ')
        .replace(/\s+/g,' ')
        .substring(0,8000).trim();
      if(text.length > 200){
        document.getElementById('listing-txt').value = text;
        st.textContent = '✓ Contenido obtenido. Pulsa Analizar con IA.';
        st.style.color = '#16a34a';
        btn.textContent = 'Leer página →'; btn.disabled = false;
        return;
      }
    }
  }catch(e){ console.log('allorigins error:', e.message); }

  // ── MÉTODO 3: corsproxy.io ────────────────────────────────────────
  try{
    const c3 = new AbortController(); setTimeout(()=>c3.abort(), 10000);
    const r3 = await fetch('https://corsproxy.io/?'+encodeURIComponent(url), {signal:c3.signal});
    if(r3.ok){
      const text = (await r3.text())
        .replace(/<scr'+'ipt[\s\S]*?<\/sc'+'ript>/gi,'')
        .replace(/<style[\s\S]*?<\/style>/gi,'')
        .replace(/<[^>]+>/g,' ')
        .replace(/\s+/g,' ')
        .substring(0,8000).trim();
      if(text.length > 200){
        document.getElementById('listing-txt').value = text;
        st.textContent = '✓ Contenido obtenido. Pulsa Analizar con IA.';
        st.style.color = '#16a34a';
        btn.textContent = 'Leer página →'; btn.disabled = false;
        return;
      }
    }
  }catch(e){ console.log('corsproxy error:', e.message); }

  // ── MÉTODO 4: Proxy propio ────────────────────────────────────────
  if(cfg.proxyUrl){
    try{
      const c4 = new AbortController(); setTimeout(()=>c4.abort(), 12000);
      const r4 = await fetch(cfg.proxyUrl+'?url='+encodeURIComponent(url), {signal:c4.signal});
      if(r4.ok){
        const d = await r4.json();
        const text = (d.content||d.text||'').substring(0,8000);
        if(text.length > 100){
          document.getElementById('listing-txt').value = text;
          st.textContent = '✓ Contenido obtenido via proxy. Pulsa Analizar con IA.';
          st.style.color = '#16a34a';
          btn.textContent = 'Leer página →'; btn.disabled = false;
          return;
        }
      }
    }catch(e){ console.log('Custom proxy error:', e.message); }
  }

  // ── FALLBACK ──────────────────────────────────────────────────────
  st.textContent = 'No se pudo leer la URL. Copia y pega el texto del anuncio manualmente.';
  st.style.color = '#d97706';
  btn.textContent = 'Leer página →'; btn.disabled = false;
};// ─── PROMPTS Y LLAMADAS A IA ──────────────────────────────────────────
const PROMPT_BASE=`Eres experto en inversión inmobiliaria española. Extrae los datos del anuncio y devuelve SOLO JSON válido, sin texto adicional ni backticks. Si un dato no aparece usa null.

JSON requerido:
{"precio":null,"superficie":null,"superficie_util":null,"habitaciones":null,"banos":null,"planta":null,"ascensor":null,"estado":null,"ano_construccion":null,"direccion":null,"municipio":null,"barrio":null,"provincia":null,"cp":null,"gastos_comunidad":null,"ibi":null,"honorarios_agencia_pct":null,"garaje":null,"trastero":null,"orientacion":null,"certificado_energetico":null,"descripcion_breve":null,"plataforma":null,"notas_inversor":null,"foto_urls":null}

Valores posibles para estado: "buen estado"|"para reformar"|"obra nueva"|null
Valores para plataforma: "idealista"|"fotocasa"|"pisos.com"|"habitaclia"|"otro"
notas_inversor: 1-2 frases clave para un inversor (riesgos, oportunidades, alertas).
foto_urls: array con las URLs de las fotos del inmueble que aparezcan en el texto (máximo 6). Si no hay URLs de imágenes, null.

ANUNCIO:
`;

async function callGroq(txt,key){
  const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({
      model:'llama-3.1-8b-instant',
      messages:[{role:'user',content:PROMPT_BASE+txt.substring(0,5000)}],
      max_tokens:900,
      temperature:0.1
    })
  });
  if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Groq '+r.status);}
  return (await r.json()).choices?.[0]?.message?.content||'';
}

async function callOpenAI(txt,key){
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:PROMPT_BASE+txt.substring(0,5000)}],max_tokens:900})});
  if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error OpenAI '+r.status);}
  return (await r.json()).choices?.[0]?.message?.content||'';
}

async function callGemini(txt,key){
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:PROMPT_BASE+txt.substring(0,5000)}]}]})});
  if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Gemini '+r.status);}
  return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text||'';
}

async function callClaude(txt,key){
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:900,messages:[{role:'user',content:PROMPT_BASE+txt.substring(0,5000)}]})});
  if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Claude '+r.status);}
  return (await r.json()).content?.[0]?.text||'';
}

window.analizarAnuncio = async function(){
  const txt = document.getElementById('listing-txt')?.value?.trim();
  if(!txt){ alert('Pega primero el texto del anuncio'); return; }
  
  // Leer config directamente de localStorage para evitar cualquier problema de caché
  let cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('return_config_v1')||'{}'); }catch(e){}
  
  // Determinar proveedor y key
  const providerSel = document.getElementById('ai-provider')?.value || cfg.provider || 'groq';
  const keys = {
    groq: cfg.groqKey || '',
    openai: cfg.openaiKey || '',
    google: cfg.googKey || '',
    anthropic: cfg.anthKey || ''
  };
  
  // Usar el proveedor del selector si tiene key, sino buscar el primero con key
  let provider = providerSel;
  if(!keys[provider]){
    provider = Object.keys(keys).find(p=>keys[p]) || 'groq';
  }
  const key = keys[provider];
  
  if(!key){
    alert('No hay API key configurada.\n\nVe a Configuración IA → introduce tu key de Groq → Guardar configuración.');
    return;
  }
  
  const btn = document.getElementById('analyze-btn');
  const st = document.getElementById('analyze-status');
  btn.textContent = 'Analizando...'; btn.disabled = true;
  st.textContent = 'Enviando a ' + {groq:'Groq (gratis)',openai:'ChatGPT',google:'Gemini',anthropic:'Claude'}[provider] + '...';
  st.style.color = '#aaa';
  
  const PROMPT = `Eres experto en inversión inmobiliaria española. Extrae los datos y devuelve SOLO JSON válido sin texto adicional ni backticks markdown.

JSON requerido (usa null si no aparece):
{"precio":null,"superficie":null,"superficie_util":null,"habitaciones":null,"banos":null,"planta":null,"ascensor":null,"estado":null,"ano_construccion":null,"direccion":null,"cp":null,"municipio":null,"barrio":null,"provincia":null,"gastos_comunidad":null,"ibi":null,"honorarios_agencia_pct":null,"garaje":null,"trastero":null,"orientacion":null,"certificado_energetico":null,"descripcion_breve":null,"plataforma":null,"notas_inversor":null,"foto_urls":null}

Reglas:
- estado: "buen estado" | "para reformar" | "obra nueva" | null
- plataforma: "idealista" | "fotocasa" | "pisos.com" | "habitaclia" | "otro"
- direccion: calle y número exacto (ej: "Calle Mayor 12, 3B")
- cp: código postal 5 dígitos si aparece
- notas_inversor: 1-2 frases clave para inversor (riesgos, oportunidades)
- foto_urls: array de URLs de imágenes que aparezcan en el texto, máximo 6, o null
- ascensor: true | false | null

ANUNCIO:
` + txt.substring(0, 5000);

  try{
    let raw = '';
    if(provider === 'groq'){
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:PROMPT}],max_tokens:1000,temperature:0.1})
      });
      if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Groq '+r.status);}
      raw = (await r.json()).choices?.[0]?.message?.content || '';
    } else if(provider === 'openai'){
      const r = await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:PROMPT}],max_tokens:1000})
      });
      if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error OpenAI '+r.status);}
      raw = (await r.json()).choices?.[0]?.message?.content || '';
    } else if(provider === 'google'){
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key='+key,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:PROMPT}]}]})
      });
      if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Gemini '+r.status);}
      raw = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const r = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1000,messages:[{role:'user',content:PROMPT}]})
      });
      if(!r.ok){const e=await r.json();throw new Error(e.error?.message||'Error Claude '+r.status);}
      raw = (await r.json()).content?.[0]?.text || '';
    }
    
    // Extraer JSON de la respuesta
    const m = raw.match(/\{[\s\S]*\}/);
    if(!m) throw new Error('La IA no devolvió JSON. Respuesta: ' + raw.substring(0,100));
    const parsed = JSON.parse(m[0]);
    
    // Añadir fotos detectadas por Jina si la IA no encontró ninguna
    if((!parsed.foto_urls||!parsed.foto_urls.length) && window._jinaImageUrls?.length){
      parsed.foto_urls = window._jinaImageUrls;
    }
    
    mostrarResultadoImport(parsed);
    st.textContent = '✓ Analizado con ' + {groq:'Groq',openai:'ChatGPT',google:'Gemini',anthropic:'Claude'}[provider];
    st.style.color = '#16a34a';
  }catch(e){
    st.textContent = 'Error: ' + e.message;
    st.style.color = '#dc2626';
    console.error('analizarAnuncio error:', e);
  }
  btn.textContent = 'Analizar con IA'; btn.disabled = false;
};
function mostrarResultadoImport(d){
  const r=document.getElementById('import-result');if(!r)return;
  window._lastImport=d;
  const ef2=n=>n!=null?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(n):'—';
  const filas=[
    ['Precio',d.precio!=null?ef2(d.precio)+' €':null],
    ['Superficie',d.superficie!=null?d.superficie+' m²':null],
    ['Superficie útil',d.superficie_util!=null?d.superficie_util+' m²':null],
    ['Habitaciones',d.habitaciones],['Baños',d.banos],
    ['Planta',d.planta!=null?(d.planta===0?'Bajo':d.planta+'ª'):null],
    ['Ascensor',d.ascensor===true?'Sí':d.ascensor===false?'No':null],
    ['Estado',d.estado],['Año construcción',d.ano_construccion],
    ['Dirección',d.direccion],['Código postal',d.cp],
    ['Municipio',d.municipio],['Barrio',d.barrio],['Provincia',d.provincia],
    ['Garaje',d.garaje===true?'Sí':null],['Trastero',d.trastero===true?'Sí':null],
    ['Orientación',d.orientacion],['Certif. energético',d.certificado_energetico],
    ['Comunidad',d.gastos_comunidad!=null?d.gastos_comunidad+' €/mes':null],
    ['IBI',d.ibi!=null?d.ibi+' €/año':null],
    ['Honorarios agencia',d.honorarios_agencia_pct!=null?d.honorarios_agencia_pct+'%':null],
    ['Plataforma',d.plataforma],
  ].filter(([,v])=>v!==null&&v!==undefined&&v!=='');
  r.innerHTML=`<div class="sec" style="margin-top:8px">
    <div class="sec-h" style="cursor:default;background:#f0fdf4;border-bottom:1px solid #86efac">
      <span class="sec-ht" style="color:#15803d">✓ Datos extraídos del anuncio</span>
    </div>
    <div class="sec-b open" style="display:block">
      ${d.descripcion_breve?`<div style="font-size:12px;color:#555;margin-bottom:10px;padding:8px 10px;background:#f9f9f7;border-radius:6px;line-height:1.5">${sanitize(d.descripcion_breve)}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        ${filas.map(([l,v],i)=>`<div class="dr" style="${i%2?'background:#fafaf8':''}"><span class="dl">${l}</span><span class="dv">${v}</span></div>`).join('')}
      </div>
      ${d.notas_inversor?`<div style="font-size:11px;color:#92400e;margin-top:10px;padding:9px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;line-height:1.6"><b>Nota inversor:</b> ${sanitize(d.notas_inversor)}</div>`:''}
      ${d.foto_urls&&d.foto_urls.length>0?`<div style="margin-top:12px"><div style="font-size:11px;font-weight:500;color:#555;margin-bottom:6px">📷 Fotos del inmueble</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${d.foto_urls.slice(0,6).map(u=>`<a href="${u}" target="_blank" style="display:block;aspect-ratio:4/3;overflow:hidden;border-radius:6px;border:1px solid #e5e5e0"><img src="${u}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'" loading="lazy"></a>`).join('')}</div></div>`:''}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">
        <button onclick="aplicarActivo()" style="padding:8px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:11px;cursor:pointer;font-family:inherit;font-weight:500">Aplicar a Activo</button>
        <button onclick="aplicarYIrFlip()" style="padding:8px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555;font-weight:500">Ir a Flip →</button>
        <button onclick="guardarComoCase()" style="padding:8px;border:1px solid #86efac;border-radius:6px;background:#f0fdf4;font-size:11px;cursor:pointer;font-family:inherit;color:#15803d;font-weight:500">Guardar en Portfolio</button>
      </div>
    </div>
  </div>`;
}

window.aplicarActivo=function(){
  const d=window._lastImport;if(!d)return;
  // Datos financieros
  if(d.precio) window.S.pc=d.precio;
  if(d.superficie) window.F.sup=d.superficie;
  if(d.gastos_comunidad) window.B.com=Math.round(d.gastos_comunidad*12);
  if(d.ibi) window.B.ibi=d.ibi;
  if(d.honorarios_agencia_pct) window.S.hon=d.honorarios_agencia_pct;
  // Dirección y CP
  if(d.direccion) window.S._direccion=d.direccion;
  if(d.cp) window.S._cp=d.cp;
  
  // Ubicación en cascada con búsqueda flexible
  const geo=window.GEO||{};
  // Buscar provincia (exacta o parcial)
  const provKey=Object.keys(geo).find(k=>k.toLowerCase()===( d.provincia||'').toLowerCase())||
                Object.keys(geo).find(k=>k.toLowerCase().includes((d.provincia||'').toLowerCase()));
  if(provKey){
    window.SEL.prov=provKey;
    window.SEL.mun='';window.SEL.bar='';window.SEL.sub='';
    const muns=geo[provKey].municipios||{};
    // Buscar municipio
    const munKey=Object.keys(muns).find(k=>k.toLowerCase()===(d.municipio||'').toLowerCase())||
                 Object.keys(muns).find(k=>k.toLowerCase().includes((d.municipio||'').toLowerCase()))||
                 Object.keys(muns).find(k=>(d.municipio||'').toLowerCase().includes(k.toLowerCase()));
    if(munKey){
      window.SEL.mun=munKey;
      const bars=muns[munKey].barrios||{};
      // Buscar barrio
      const barKey=Object.keys(bars).find(k=>k.toLowerCase()===(d.barrio||'').toLowerCase())||
                   Object.keys(bars).find(k=>k.toLowerCase().includes((d.barrio||'').toLowerCase()));
      if(barKey) window.SEL.bar=barKey;
    }
  }
  
  window.rSI();window.rSR();window.rFI();window.rFR();window.rBI();window.rBR();
  if(window.rebuildSelects) setTimeout(window.rebuildSelects,50);
  if(window.doMapUpdate) setTimeout(window.doMapUpdate,200);
  swTab('ap');
};
window.aplicarYIrFlip=function(){window.aplicarActivo();setTimeout(()=>swTab('fp'),150);};
// ─── BÚSQUEDA DE COMPARABLES ─────────────────────────────────────────
window.buscarComparables = async function(){
  const btn = document.getElementById('btn-comps');
  const st  = document.getElementById('comps-status');
  const res = document.getElementById('comps-result');
  if(!btn||!st||!res) return;

  // Check we have a location
  const sel = window.SEL||{};
  if(!sel.prov){ st.textContent='Selecciona primero una provincia.'; return; }

  // Check we have a key
  let cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('return_config_v1')||'{}'); }catch(e){}
  const key = cfg.groqKey||cfg.openaiKey||cfg.anthKey||'';
  if(!key){ st.textContent='Configura una API key en la pestaña Importar.'; return; }
  const provider = cfg.groqKey?'groq':cfg.openaiKey?'openai':'anthropic';

  btn.disabled=true; btn.textContent='Buscando...';
  st.textContent='Obteniendo anuncios de Idealista...'; st.style.color='#aaa';
  res.innerHTML='';

  try{
    // Build Idealista URL for the zone
    const {m,b,s} = getD();
    const slugData = m ? (s||b||m) : null;
    const slug = slugData&&m ? m.slug||'' : '';
    const sup = F.sup||65;
    const habsFiltro = window.S._habs ? `&habitaciones=${window.S._habs}` : '';

    // Try to get listings via Jina
    const baseUrl = slug
      ? `https://www.idealista.com/venta-viviendas/${slug}/`
      : `https://www.idealista.com/venta-viviendas/${encodeURIComponent((sel.mun||sel.prov||'').toLowerCase().replace(/ /g,'-'))}-${encodeURIComponent((sel.prov||'').toLowerCase().replace(/ /g,'-'))}/`;

    st.textContent='Leyendo resultados de Idealista...';
    let rawText = '';

    try{
      const c1 = new AbortController();
      setTimeout(()=>c1.abort(), 15000);
      const r = await fetch('https://r.jina.ai/' + baseUrl, {
        headers:{'Accept':'text/plain','X-Return-Format':'markdown'},
        signal: c1.signal
      });
      if(r.ok) rawText = (await r.text()).substring(0, 8000);
    }catch(e){ console.log('Jina error:', e.message); }

    if(!rawText || rawText.length < 200){
      st.textContent='No se pudo acceder a Idealista para esta zona.';
      res.innerHTML = '<div class="note-card" style="color:#d97706;border-color:#fcd34d;background:#fffbeb">No se han podido obtener comparables reales. Se mantiene la estimación por mercado zonal.</div>';
      btn.disabled=false; btn.textContent='\uD83D\uDD0D Buscar comparables en Idealista';
      return;
    }

    st.textContent='Extrayendo comparables con IA...';

    const prompt = `Eres experto en valoración inmobiliaria residencial española (metodología RICS).
Analiza este texto de Idealista y extrae hasta 8 anuncios comparables de pisos/apartamentos en venta.
Si no hay datos reales suficientes del texto, devuelve {"comparables":[],"estadisticas":{"pm2_min":0,"pm2_max":0,"pm2_medio":0,"pm2_mediana":0,"n":0}} sin inventar datos.

Zona: ${sel.mun||sel.prov||sel.prov} (${sel.bar||''})
Superficie referencia: ${sup} m²

Devuelve SOLO JSON válido sin texto adicional:
{"comparables":[
  {"direccion":"Calle X, nº Y","precio":150000,"superficie":65,"pm2":2307,"habitaciones":3,"banos":1,"planta":"2ª","ascensor":true,"estado":"buen estado","antiguedad":1985,"fuente":"Idealista"}
],"estadisticas":{"pm2_min":0,"pm2_max":0,"pm2_medio":0,"pm2_mediana":0,"n":0}}

TEXTO:
${rawText.substring(0,5000)}`;

    let raw = '';
    if(provider==='groq'){
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.groqKey},
        body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:prompt}],max_tokens:1500,temperature:0.2})
      });
      if(r.ok) raw = (await r.json()).choices?.[0]?.message?.content||'';
    } else if(provider==='openai'){
      const r = await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.openaiKey},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:prompt}],max_tokens:1500})
      });
      if(r.ok) raw = (await r.json()).choices?.[0]?.message?.content||'';
    } else {
      const r = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':cfg.anthKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1500,messages:[{role:'user',content:prompt}]})
      });
      if(r.ok) raw = (await r.json()).content?.[0]?.text||'';
    }

    const m2 = raw.match(/\{[\s\S]*\}/);
    if(!m2) throw new Error('Sin JSON en respuesta');
    const data = JSON.parse(m2[0]);
    const comps = data.comparables||[];
    const stats = data.estadisticas||{};

    if(!comps.length){
      res.innerHTML = '<div class="note-card" style="color:#d97706;border-color:#fcd34d;background:#fffbeb">No se han podido obtener comparables reales de Idealista para esta zona. Se mantiene la estimación por mercado zonal.</div>';
      st.textContent=''; btn.disabled=false; btn.textContent='\uD83D\uDD0D Buscar comparables';
      return;
    }

    // Recalculate stats from actual data
    const pm2s = comps.map(c=>c.pm2||Math.round(c.precio/c.superficie)).filter(x=>x>0);
    const pm2min = Math.min(...pm2s);
    const pm2max = Math.max(...pm2s);
    const pm2med = Math.round(pm2s.reduce((a,b)=>a+b,0)/pm2s.length);
    const sorted = [...pm2s].sort((a,b)=>a-b);
    const pm2median = sorted.length%2===0
      ? Math.round((sorted[sorted.length/2-1]+sorted[sorted.length/2])/2)
      : sorted[Math.floor(sorted.length/2)];

    // Store for use in valuation
    window._comparables = {comps, pm2min, pm2max, pm2med, pm2median, zona: sel.mun||sel.prov};

    // Render table
    const ef2 = n => n>0 ? new Intl.NumberFormat('es-ES').format(Math.round(n))+' €' : '—';
    res.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px 12px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:500;color:#15803d;margin-bottom:6px">${comps.length} comparables · ${sel.mun||sel.prov} ${sel.bar?'· '+sel.bar:''}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          <div style="text-align:center"><div style="font-size:10px;color:#aaa">Mín €/m²</div><div style="font-size:14px;font-weight:600;font-family:'Courier New',monospace">${pm2min.toLocaleString('es-ES')}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:#aaa">Máx €/m²</div><div style="font-size:14px;font-weight:600;font-family:'Courier New',monospace">${pm2max.toLocaleString('es-ES')}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:#aaa">Media €/m²</div><div style="font-size:16px;font-weight:700;font-family:'Courier New',monospace;color:#15803d">${pm2med.toLocaleString('es-ES')}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:#aaa">Mediana €/m²</div><div style="font-size:14px;font-weight:600;font-family:'Courier New',monospace">${pm2median.toLocaleString('es-ES')}</div></div>
        </div>
      </div>
      <div style="overflow-x:auto;border-radius:6px;border:1px solid #e5e5e0">
        <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:system-ui,-apple-system,sans-serif">
          <thead>
            <tr style="background:#f4f4f0">
              <th style="padding:6px 8px;text-align:left;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Dirección</th>
              <th style="padding:6px 8px;text-align:right;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Precio</th>
              <th style="padding:6px 8px;text-align:right;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">m²</th>
              <th style="padding:6px 8px;text-align:right;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0;font-weight:700">€/m²</th>
              <th style="padding:6px 8px;text-align:center;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Hab</th>
              <th style="padding:6px 8px;text-align:center;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Planta</th>
              <th style="padding:6px 8px;text-align:left;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Estado</th>
              <th style="padding:6px 8px;text-align:center;color:#555;font-weight:500;border-bottom:1px solid #e5e5e0">Año</th>
            </tr>
          </thead>
          <tbody>
            ${comps.map((c,i)=>{
              const pm2c = c.pm2||Math.round(c.precio/c.superficie);
              const pm2col = pm2c<=pm2med*0.9?'#16a34a':pm2c>=pm2med*1.1?'#dc2626':'#1a1a1a';
              return `<tr style="${i%2?'background:#fafaf8':''}">
                <td style="padding:6px 8px;color:#555;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.direccion||''}">${c.direccion||'—'}</td>
                <td style="padding:6px 8px;text-align:right;font-family:'Courier New',monospace">${ef2(c.precio)}</td>
                <td style="padding:6px 8px;text-align:right;font-family:'Courier New',monospace">${c.superficie||'—'}</td>
                <td style="padding:6px 8px;text-align:right;font-family:'Courier New',monospace;font-weight:700;color:${pm2col}">${pm2c.toLocaleString('es-ES')}</td>
                <td style="padding:6px 8px;text-align:center">${c.habitaciones||'—'}</td>
                <td style="padding:6px 8px;text-align:center">${c.planta||'—'}${c.ascensor?'🛗':''}</td>
                <td style="padding:6px 8px;color:#888;font-size:10px">${c.estado||'—'}</td>
                <td style="padding:6px 8px;text-align:center;color:#aaa">${c.antiguedad||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:10px;color:#bbb;margin-top:6px;line-height:1.5">
        Fuente: Idealista (lectura automática vía Jina AI). Datos orientativos. Verde = por debajo de la media · Rojo = por encima.
        <button onclick="aplicarMediaComparables(${pm2med})" style="margin-left:8px;padding:3px 8px;border:1px solid #ba7517;border-radius:4px;background:#fff;font-size:10px;cursor:pointer;color:#ba7517">Usar media (${pm2med.toLocaleString('es-ES')} €/m²) como base</button>
      </div>`;

    st.textContent=''; 
    btn.textContent='🔄 Actualizar comparables';

  }catch(e){
    st.textContent='Error: '+e.message; st.style.color='#dc2626';
    btn.textContent='🔍 Buscar comparables en Idealista';
    console.error('comparables error:', e);
  }
  btn.disabled=false;
};

window.aplicarMediaComparables = function(pm2med){
  // Override GEO base price with comparable median
  window._comparablesOverride = pm2med;
  rMKT();
};

window.clearImport=function(){
  ['listing-txt','url-inp'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const r=document.getElementById('import-result');if(r)r.innerHTML='';
  const st=document.getElementById('analyze-status');if(st)st.textContent='';
};

// ─── PORTFOLIO ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 11 · PORTFOLIO  —  casos de inversión
// ═══════════════════════════════════════════════════════

