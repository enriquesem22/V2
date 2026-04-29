// portfolio.js — Portfolio de casos de inversión
// Incluye render de tarjetas, mapa, guardar/cargar/borrar casos y fotos permanentes

const DB_KEY='return_portfolio_v1';
function getPortfolio(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'[]');}catch(e){return[];}}
function savePortfolio(c){localStorage.setItem(DB_KEY,JSON.stringify(c));}


// ─── GUARDAR IMÁGENES COMO BASE64 ────────────────────────────────────
async function fetchImageAsBase64(url){
  // Intentar via proxy CORS para imágenes de portales
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ];
  for(const proxy of proxies){
    try{
      const c = new AbortController();
      setTimeout(()=>c.abort(), 8000);
      const r = await fetch(proxy + encodeURIComponent(url), {signal:c.signal});
      if(!r.ok) continue;
      const blob = await r.blob();
      if(!blob.type.startsWith('image/')) continue;
      // Redimensionar a thumbnail para ahorrar espacio
      return await blobToBase64Thumbnail(blob, 400, 280);
    }catch(e){ continue; }
  }
  return null;
}

function blobToBase64Thumbnail(blob, maxW, maxH){
  return new Promise((resolve)=>{
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const ratio = Math.min(maxW/w, maxH/h, 1);
      canvas.width = Math.round(w*ratio);
      canvas.height = Math.round(h*ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function descargarFotos(urls){
  if(!urls||!urls.length) return [];
  const st = document.getElementById('analyze-status');
  const fotos = [];
  for(let i=0; i<Math.min(urls.length,5); i++){
    if(st) st.textContent = `Guardando foto ${i+1}/${Math.min(urls.length,5)}...`;
    const b64 = await fetchImageAsBase64(urls[i]);
    if(b64) fotos.push({url:urls[i], b64});
    else fotos.push({url:urls[i], b64:null}); // guardar URL aunque falle
  }
  if(st) st.textContent = '';
  return fotos;
}

window.guardarComoCase=async function(){
  const d = window._lastImport || {};

  // ── APLICAR TODOS LOS DATOS DEL ANUNCIO AL ESTADO ──────────────
  // Datos financieros
  if(d.precio)                window.S.pc  = d.precio;
  if(d.superficie)            window.F.sup = d.superficie;
  if(d.gastos_comunidad)      window.B.com = Math.round(d.gastos_comunidad * 12);
  if(d.ibi)                   window.B.ibi = d.ibi;
  if(d.honorarios_agencia_pct) window.S.hon = d.honorarios_agencia_pct;
  if(d.direccion)             window.S._direccion = d.direccion;
  if(d.cp)                    window.S._cp = d.cp;

  // Ubicación — búsqueda flexible en GEO
  const geo = window.GEO || {};
  const provInput = (d.provincia || '').toLowerCase().trim();
  const munInput  = (d.municipio || '').toLowerCase().trim();
  const barInput  = (d.barrio    || '').toLowerCase().trim();

  let provKey='', munKey='', barKey='';

  if(provInput){
    provKey = Object.keys(geo).find(k=>k.toLowerCase()===provInput) ||
              Object.keys(geo).find(k=>k.toLowerCase().includes(provInput)) ||
              Object.keys(geo).find(k=>provInput.includes(k.toLowerCase())) || '';
  }
  if(provKey && munInput){
    const muns = geo[provKey].municipios || {};
    munKey = Object.keys(muns).find(k=>k.toLowerCase()===munInput) ||
             Object.keys(muns).find(k=>k.toLowerCase().includes(munInput)) ||
             Object.keys(muns).find(k=>munInput.includes(k.toLowerCase())) || '';
    if(munKey && barInput){
      const bars = muns[munKey].barrios || {};
      barKey = Object.keys(bars).find(k=>k.toLowerCase()===barInput) ||
               Object.keys(bars).find(k=>k.toLowerCase().includes(barInput)) ||
               Object.keys(bars).find(k=>barInput.includes(k.toLowerCase())) || '';
    }
  }

  // Actualizar SEL usando las funciones que modifican el objeto LOCAL correcto
  if(provKey){
    window.setProv(provKey);                    // actualiza SEL local + rebuild selects
    if(munKey)  window.setMun(munKey);          // actualiza SEL.mun + rebuild
    if(barKey)  window.setBar(barKey);          // actualiza SEL.bar + rebuild
  }

  // Obtener coords para el mapa
  let coords = null;
  if(provKey && geo[provKey]){
    const pd = geo[provKey];
    if(munKey && pd.municipios && pd.municipios[munKey]){
      const md = pd.municipios[munKey];
      coords = barKey && md.barrios && md.barrios[barKey] ? md.barrios[barKey].coords : md.coords;
    } else coords = pd.coords;
  }

  // ── NOMBRE POR DEFECTO ──────────────────────────────────────────
  const baseDir = window.S._direccion || d.direccion || d.descripcion_breve || 'Nuevo caso';
  const existingCases = getPortfolio();
  const sameName = existingCases.filter(c => c.name === baseDir || c.name.startsWith(baseDir + ' '));
  let defaultName = baseDir;
  if(sameName.length > 0){
    const nums = sameName.map(c => { const m = c.name.slice(baseDir.length).trim(); return m===''?1:parseInt(m)||1; });
    defaultName = baseDir + ' ' + (Math.max(...nums) + 1);
  }
  const name = prompt('Nombre para este caso:', defaultName);
  if(!name) return;

  // ── DESCARGAR FOTOS ─────────────────────────────────────────────
  let fotosGuardadas = [];
  if(d.foto_urls && d.foto_urls.length > 0){
    const st = document.getElementById('analyze-status');
    if(st){ st.textContent='Guardando fotos...'; st.style.color='#ba7517'; }
    fotosGuardadas = await descargarFotos(d.foto_urls);
    if(st) st.textContent = '';
  }

  // ── CALCULAR RESULTADOS ─────────────────────────────────────────
  const _S = window.S, _F = window.F, _B = window.B;
  let resF={rc:0,mn:0,ra:0,tot:0,cr:0}, resB={rn:0,rb:0,coc:0,bn:0,cf:0,tot:0};
  try{ const r=cF(_S,_F); resF={rc:+(r.rc||0).toFixed(2),mn:Math.round(r.mn||0),ra:+(r.ra||0).toFixed(2),tot:Math.round(r.tot||0),cr:Math.round(r.cr||0)}; }catch(e){}
  try{ const r=cB(_S,_B); resB={rn:+(r.rn||0).toFixed(2),rb:+(r.rb||0).toFixed(2),coc:+(r.coc||0).toFixed(2),bn:Math.round(r.bn||0),cf:Math.round(r.cf||0),tot:Math.round(r.tot||0)}; }catch(e){}

  // ── CONSTRUIR CASO ──────────────────────────────────────────────
  // Leer SEL actualizado (después de setProv/setMun/setBar)
  const selNow = window.SEL || {};
  const caso = {
    id:    Date.now(),
    name,
    date:  new Date().toISOString().slice(0,10),
    loc: {
      prov: selNow.prov || provKey || '',
      mun:  selNow.mun  || munKey  || '',
      bar:  selNow.bar  || barKey  || '',
      sub:  selNow.sub  || '',
      _provincia: d.provincia || '',
      _municipio: d.municipio || '',
      _barrio:    d.barrio    || '',
      _coords:    coords
    },
    fotos:       fotosGuardadas,
    S:           {..._S},
    F:           {..._F},
    B:           {..._B},
    presupuesto: window._presupuestoTotal || 0,
    CATS:        window.CATS ? window.CATS.map(c=>({n:c.n,open:c.open,items:c.items.map(i=>({d:i.d,u:i.u,q:i.q,p:i.p,on:i.on,ref:i.ref||''}))})) : [],
    importData:  d,
    resultado:   {flip:resF, btr:resB},
    notas:       ''
  };

  existingCases.unshift(caso);
  savePortfolio(existingCases);

  // Actualizar UI
  const pp2el = document.getElementById('pp2-content');
  if(pp2el) renderPortfolio(pp2el);
  if(typeof driveToken!=='undefined'&&driveToken) window.drivePush&&window.drivePush().catch(()=>{});
  if(typeof ghToken!=='undefined'&&ghToken) window.githubPush&&window.githubPush().catch(()=>{});

  const fotasOk = fotosGuardadas.filter(f=>f.b64).length;
  alert('✓ Guardado: "'+name+'"' + (provKey?' · '+provKey:'') + (fotasOk>0?' · '+fotasOk+' foto(s)':''));
};
window.saveCurrentCase=function(){
  // Force autoSave first so localStorage is up to date
  if(window.autoSave) window.autoSave();
  window._lastImport=window._lastImport||{};
  window.guardarComoCase();
};
// Also refresh portfolio when tab is opened
// sw unified below

window.loadPortfolio=function(){
  const el=document.getElementById('pp2-content');
  if(!el){console.log('pp2-content not found');return;}
  // Show local data immediately
  renderPortfolio(el);
  // Auto-sync with GitHub if connected
  if(ghToken){
    githubPull().then(()=>{
      // Re-render after GitHub sync
      if(el) renderPortfolio(el);
    }).catch(()=>{});
    return;
  }
  if(driveToken){
    driveListFiles().then(files=>{
      const pfFile=files.find(f=>f.name===DRIVE_PORTFOLIO_FILE);
      if(pfFile){
        driveReadFile(pfFile.id).then(driveCases=>{
          if(Array.isArray(driveCases)){
            const localCases=getPortfolio();
            const merged=[...localCases]; // local wins (most recent)
            driveCases.forEach(dc=>{
              if(!merged.find(lc=>lc.id===dc.id)) merged.push(dc);
            });
            merged.sort((a,b)=>b.id-a.id);
            localStorage.setItem(DB_KEY,JSON.stringify(merged));
            renderPortfolio(el); // re-render with merged data
          }
        }).catch(()=>{});
      }
    }).catch(()=>{});
  }
  return;
  renderPortfolio(el);
};

function renderPortfolio(el){
  CATS=window.CATS;
  const cases=getPortfolio();
  const N=cases.length;
  const ef2=n=>isFinite(n)&&n!==null?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n))+' €':'—';
  const ep2=(n,d=1)=>isFinite(n)&&!isNaN(n)?n.toFixed(d)+'%':'—';
  const avgF=N?+(cases.reduce((s,c)=>s+(c.resultado?.flip?.rc||0),0)/N).toFixed(1):0;
  const avgB=N?+(cases.reduce((s,c)=>s+(c.resultado?.btr?.rn||0),0)/N).toFixed(1):0;
  const totInv=cases.reduce((s,c)=>s+(c.S?.pc||0)+(c.presupuesto||0),0);
  const driveIndicator=driveToken?'<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#16a34a;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:2px 8px">● Drive conectado</span>':'';

  el.innerHTML=`
  <div style="max-width:1000px">
    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:18px;font-weight:500;color:#1a1a1a">Portfolio</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px">${N} operacion${N!==1?'es':''} guardada${N!==1?'s':''} ${driveIndicator}</div>
      </div>
      <button onclick="saveCurrentCase()" style="padding:8px 16px;border:1px solid #1a1a1a;border-radius:8px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">+ Guardar análisis actual</button>
    </div>

    <!-- MAPA PORTFOLIO -->
    ${N>0?`<div style="border:1px solid #e5e5e0;border-radius:10px;overflow:hidden;margin-bottom:18px"><div style="background:#f4f4f0;padding:9px 12px;font-size:12px;font-weight:500;color:#555">&#x1f5fa; Mapa del portfolio</div><div id="portfolio-map" style="height:260px"></div></div>`:''}

    <!-- STATS -->
    ${N>0?`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      <div style="background:#f4f4f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;color:#aaa;margin-bottom:4px">Operaciones</div>
        <div style="font-size:24px;font-weight:500;font-family:'Courier New',monospace">${N}</div>
      </div>
      <div style="background:#f4f4f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;color:#aaa;margin-bottom:4px">ROI flip medio</div>
        <div style="font-size:24px;font-weight:500;font-family:'Courier New',monospace;color:${avgF>=20?'#16a34a':avgF>=10?'#d97706':'#dc2626'}">${ep2(avgF)}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px">sobre capital</div>
      </div>
      <div style="background:#f4f4f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;color:#aaa;margin-bottom:4px">Yield BTR media</div>
        <div style="font-size:24px;font-weight:500;font-family:'Courier New',monospace;color:${avgB>=7?'#16a34a':avgB>=5?'#d97706':'#dc2626'}">${ep2(avgB)}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px">neta</div>
      </div>
      <div style="background:#f4f4f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;color:#aaa;margin-bottom:4px">Capital invertido</div>
        <div style="font-size:22px;font-weight:500;font-family:'Courier New',monospace">${ef2(totInv)}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px">compra + reforma</div>
      </div>
    </div>`:''}

    <!-- CASOS -->
    ${N===0?`<div style="text-align:center;padding:56px 24px;border:1px dashed #e5e5e0;border-radius:12px;color:#aaa">
      <div style="font-size:36px;margin-bottom:10px">📁</div>
      <div style="font-size:14px;font-weight:500;margin-bottom:6px;color:#999">Sin operaciones guardadas</div>
      <div style="font-size:12px">Rellena los datos de una operación y pulsa<br><b>+ Guardar análisis actual</b></div>
    </div>`:cases.map((c,i)=>{
      const rc=c.resultado?.flip?.rc||0, rn=c.resultado?.btr?.rn||0, mn=c.resultado?.flip?.mn||0;
      const tagF=rc>=20?'#16a34a':rc>=10?'#d97706':'#dc2626';
      const tagB=rn>=7?'#16a34a':rn>=5?'#d97706':'#dc2626';
      const locStr=[c.loc?.sub,c.loc?.bar||c.loc?._barrio,c.loc?.mun||c.loc?._municipio,c.loc?.prov||c.loc?._provincia].filter(Boolean).join(' · ')||c.importData?.municipio||'';
      const reforma=c.presupuesto>0?c.presupuesto:(c.F?.rm2||0)*(c.F?.sup||0);
      const totProy=(c.S?.pc||0)+(reforma||0);
      return `<div style="border:1px solid #e5e5e0;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <!-- CABECERA CASO -->
        <div style="display:flex;align-items:start;justify-content:space-between;padding:14px 16px;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:500;margin-bottom:2px;color:#1a1a1a">${c.name}</div>
            <div style="font-size:11px;color:#aaa">${c.date}${locStr?' · '+locStr:''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            <button onclick="loadCase(${i})" style="padding:6px 14px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;color:#555;font-weight:500">Cargar</button>
            <button onclick="exportCasePDF(${i})" title="Exportar informe PDF" style="padding:6px 10px;border:1px solid #ba7517;border-radius:6px;background:#fffaf3;font-size:11px;cursor:pointer;color:#ba7517;font-weight:600">PDF</button>
            <button onclick="addNoteCase(${i})" title="Nota" style="padding:6px 10px;border:1px solid #e5e5e0;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;color:#aaa">📝</button>
            <button onclick="deleteCase(${i})" style="padding:6px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;font-size:12px;cursor:pointer;color:#dc2626">✕</button>
          </div>
        </div>
        <!-- DATOS CLAVE -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid #f0f0ea">
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Compra</div>
            <div style="font-size:14px;font-weight:500;font-family:'Courier New',monospace">${c.S?.pc>0?ef2(c.S.pc):'—'}</div>
          </div>
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Reforma${c.presupuesto>0?' (presup.)':''}</div>
            <div style="font-size:14px;font-weight:500;font-family:'Courier New',monospace">${reforma>0?ef2(reforma):'—'}</div>
          </div>
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Superficie</div>
            <div style="font-size:14px;font-weight:500;font-family:'Courier New',monospace">${c.F?.sup>0?c.F.sup+' m²':'—'}</div>
          </div>
          <div style="padding:10px 14px">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Inversión total</div>
            <div style="font-size:14px;font-weight:500;font-family:'Courier New',monospace;color:#ba7517">${totProy>0?ef2(totProy):'—'}</div>
          </div>
        </div>
        <!-- RESULTADOS -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid #f0f0ea;background:#fafaf8">
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">ROI flip</div>
            <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:${tagF}">${ep2(rc)}</div>
          </div>
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Margen neto</div>
            <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:${mn>0?'#16a34a':'#dc2626'}">${ef2(mn)}</div>
          </div>
          <div style="padding:10px 14px;border-right:1px solid #f0f0ea">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">Yield BTR neta</div>
            <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:${tagB}">${ep2(rn)}</div>
          </div>
          <div style="padding:10px 14px">
            <div style="font-size:10px;color:#aaa;margin-bottom:3px">${c.S?.fin?'Cash on cash':'Renta mensual'}</div>
            <div style="font-size:16px;font-weight:500;font-family:'Courier New',monospace;color:${tagB}">${c.S?.fin?ep2(c.resultado?.btr?.coc):c.B?.rnt>0?ef2(c.B.rnt)+'/mes':'—'}</div>
          </div>
        </div>
        ${c.notas?`<div style="padding:8px 16px;border-top:1px solid #f0f0ea;font-size:11px;color:#888;background:#fafaf8;line-height:1.5">📝 ${c.notas}</div>`:''}
        ${c.importData?.notas_inversor?`<div style="padding:8px 16px;border-top:1px solid #f0f0ea;font-size:11px;color:#92400e;background:#fffbeb;line-height:1.5">${c.importData.notas_inversor}</div>`:''}
    ${(c.fotos&&c.fotos.length>0)?`<div style="padding:10px 16px;border-top:1px solid #f0f0ea;background:#fafaf8">
      <div style="font-size:10px;color:#aaa;margin-bottom:6px">📷 ${c.fotos.filter(f=>f.b64).length} foto(s) guardada(s) permanentemente</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${c.fotos.slice(0,5).map(f=>f.b64?
          `<a href="${f.url}" target="_blank"><img src="${f.b64}" style="height:72px;width:108px;object-fit:cover;border-radius:5px;border:1px solid #e5e5e0"></a>`:
          `<a href="${f.url}" target="_blank" style="height:72px;width:108px;border-radius:5px;border:1px solid #e5e5e0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;text-decoration:none;background:#f4f4f0">🔗 ver</a>`
        ).join('')}
      </div></div>`:''}
      </div>`;
    }).join('')}

    <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="handleImportFile(this)">
  </div>`;
  // Init portfolio map
  if(N>0) setTimeout(function(){
    var mapEl=document.getElementById('portfolio-map');
    if(!mapEl||!window.L)return;
    if(window._portfolioMap){window._portfolioMap.remove();window._portfolioMap=null;}
    var pMap=L.map('portfolio-map',{zoomControl:true,scrollWheelZoom:false}).setView([40,-3.7],6);
    window._portfolioMap=pMap;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'\u00a9 OSM',maxZoom:19}).addTo(pMap);
    var bounds=[];
    cases.forEach(function(c){
      // Buscar coordenadas con múltiples fuentes
      var coords = (c.loc && c.loc._coords) || null;
      if(!coords){
        var geo=window.GEO||{};
        var prov = c.loc&&(c.loc.prov||c.loc._provincia) || (c.importData&&c.importData.provincia);
        var mun  = c.loc&&(c.loc.mun ||c.loc._municipio) || (c.importData&&c.importData.municipio);
        var bar  = c.loc&&(c.loc.bar ||c.loc._barrio)    || (c.importData&&c.importData.barrio);
        // Búsqueda flexible de provincia
        var provKey = prov && (geo[prov] ? prov : Object.keys(geo).find(k=>k.toLowerCase().includes((prov||'').toLowerCase())));
        if(provKey && geo[provKey]){
          var pd=geo[provKey];
          // Búsqueda flexible de municipio
          var muns=pd.municipios||{};
          var munKey=mun&&(muns[mun]?mun:Object.keys(muns).find(k=>k.toLowerCase().includes((mun||'').toLowerCase())));
          if(munKey && muns[munKey]){
            var md=muns[munKey];
            var bars=md.barrios||{};
            var barKey=bar&&(bars[bar]?bar:Object.keys(bars).find(k=>k.toLowerCase().includes((bar||'').toLowerCase())));
            coords = barKey&&bars[barKey] ? bars[barKey].coords : md.coords;
          } else coords=pd.coords;
        }
      }
      if(!coords)return;
      bounds.push(coords);
      var rc=c.resultado&&c.resultado.flip&&c.resultado.flip.rc||0;
      var rn=c.resultado&&c.resultado.btr&&c.resultado.btr.rn||0;
      var col=rc>=20||rn>=7?'#16a34a':rc>=10||rn>=5?'#d97706':'#dc2626';
      var lbl=c.name.length>16?c.name.slice(0,15)+'\u2026':c.name;
      var icon=L.divIcon({className:'',html:'<div style="background:'+col+';color:#fff;font-size:10px;font-weight:600;padding:3px 7px;border-radius:5px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,.3);border:2px solid #fff">'+lbl+'</div>',iconAnchor:[0,20]});
      var popup='<b>'+c.name+'</b><br>'+c.date+(c.S&&c.S.pc?'<br>'+new Intl.NumberFormat('es-ES').format(c.S.pc)+' \u20ac':'')+(rc?'<br>ROI: '+rc.toFixed(1)+'%':'')+(rn?'<br>Yield: '+rn.toFixed(1)+'%':'')+(c.S&&c.S._direccion?'<br>'+c.S._direccion:'');
      L.marker(coords,{icon}).addTo(pMap).bindPopup(popup);
    });
    if(bounds.length===1)pMap.setView(bounds[0],14);
    else if(bounds.length>1)try{pMap.fitBounds(bounds,{padding:[30,30]});}catch(e){}
    setTimeout(function(){pMap.invalidateSize();},200);
  },300);
}

window.loadCase=function(i){
  const c=getPortfolio()[i];if(!c)return;
  if(!confirm('Cargar "'+c.name+'"? Reemplaza los datos actuales.'))return;
  if(c.S)Object.assign(window.S,c.S);
  if(c.F)Object.assign(window.F,c.F);
  if(c.B)Object.assign(window.B,c.B);
  if(c.loc)Object.assign(window.SEL,c.loc);
  if(c.CATS&&c.CATS.length)window.CATS=c.CATS;
  window._presupuestoTotal=c.presupuesto||null;
  window._lastImport=c.importData||null;
  window.rSI();window.rSR();
  if(window.rPresupuesto)window.rPresupuesto();
  window.rFI();window.rFR();window.rBI();window.rBR();
  setTimeout(()=>{
    if(window.SEL&&window.SEL.prov&&window.rebuildSelects)window.rebuildSelects();
    if(window.doMapUpdate)window.doMapUpdate();
  },250);
  swTab('ap');
  alert('Cargado: "'+c.name+'"');
};
window.deleteCase=function(i){
  const cases=getPortfolio();
  if(!confirm('¿Eliminar "'+cases[i]?.name+'"?'))return;
  cases.splice(i,1);
  savePortfolio(cases);
  // Refresh immediately
  const pp2el=document.getElementById('pp2-content');
  if(pp2el) renderPortfolio(pp2el);
  // Push to Drive in background
  if(driveToken) window.drivePush().catch(e=>console.log('Delete push error:',e));
};
window.addNoteCase=function(i){const cases=getPortfolio();const n=prompt('Nota:',cases[i]?.notas||'');if(n===null)return;cases[i].notas=n;savePortfolio(cases);window.loadPortfolio();};
window.exportPortfolio=function(){const b=new Blob([JSON.stringify(getPortfolio(),null,2)],{type:'application/json'});const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(b),download:'return_portfolio_'+new Date().toISOString().slice(0,10)+'.json'});a.click();};
window.importPortfolioFile=function(){document.getElementById('import-file-input')?.click();};
window.handleImportFile=function(input){const f=input.files[0];if(!f)return;const reader=new FileReader();reader.onload=function(e){try{const imp=JSON.parse(e.target.result);if(!Array.isArray(imp))throw new Error('Formato incorrecto');savePortfolio([...imp,...getPortfolio()]);window.loadPortfolio();alert('✓ '+imp.length+' caso(s) importados');}catch(err){alert('Error: '+err.message);}};reader.readAsText(f);};

function casePdfMoney(n){return isFinite(n)&&n!==null?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n))+' €':'—';}
function casePdfPct(n,d){d=d===undefined?1:d;return isFinite(n)&&!isNaN(n)?Number(n).toFixed(d)+'%':'—';}
function casePdfEsc(v){if(v===null||v===undefined)return '';return String(v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function casePdfRows(rows){return rows.map(function(r){return '<tr><td>'+casePdfEsc(r[0])+'</td><td>'+casePdfEsc(r[1])+'</td></tr>';}).join('');}

window.exportCasePDF=function(i){
  var c=getPortfolio()[i];
  if(!c){alert('No encuentro este caso.');return;}
  var S=c.S||{}, F=c.F||{}, B=c.B||{}, flip=(c.resultado&&c.resultado.flip)||{}, btr=(c.resultado&&c.resultado.btr)||{}, imp=c.importData||{};
  var reforma=c.presupuesto>0?c.presupuesto:(F.rm2||0)*(F.sup||0);
  var inversion=(S.pc||0)+(reforma||0);
  var loc=[c.loc&&c.loc.sub,c.loc&&(c.loc.bar||c.loc._barrio),c.loc&&(c.loc.mun||c.loc._municipio),c.loc&&(c.loc.prov||c.loc._provincia)].filter(Boolean).join(' · ');
  var url=imp.url||imp.link||S._url||'';
  var photos=(c.fotos||[]).filter(function(f){return f&&f.b64;}).slice(0,4);
  var partidas=[];
  (c.CATS||[]).forEach(function(cat){
    (cat.items||[]).forEach(function(it){
      if(it&&it.on){partidas.push([cat.n, it.d, it.u, it.q, it.p, (+it.q||0)*(+it.p||0)]);}
    });
  });
  partidas.sort(function(a,b){return b[5]-a[5];});
  var topPartidas=partidas.slice(0,12).map(function(p){return '<tr><td>'+casePdfEsc(p[0])+'</td><td>'+casePdfEsc(p[1])+'</td><td>'+casePdfEsc(p[3]+' '+p[2])+'</td><td>'+casePdfMoney(p[4])+'</td><td>'+casePdfMoney(p[5])+'</td></tr>';}).join('');

  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+casePdfEsc(c.name)+' - Return</title><style>'+
    '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;margin:0;background:#fff;font-size:12px;line-height:1.35}.page{max-width:900px;margin:0 auto}.top{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #1a1a1a;padding-bottom:12px;margin-bottom:16px}.brand{font-size:22px;font-weight:700}.sub{color:#777;font-size:11px;margin-top:3px}.title{font-size:20px;font-weight:700;margin:0 0 4px}.loc{color:#777}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.kpi{border:1px solid #ddd;border-radius:8px;padding:10px;background:#fafafa}.kpi .l{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.03em}.kpi .v{font-size:18px;font-weight:700;margin-top:4px}.ok{color:#15803d}.warn{color:#b45309}.bad{color:#dc2626}.sec{margin-top:16px;page-break-inside:avoid}.sec h2{font-size:14px;margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid #ddd}table{width:100%;border-collapse:collapse}td,th{padding:7px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}th{background:#f4f4f0;font-size:10px;color:#555;text-transform:uppercase}td:nth-child(2),td:last-child{text-align:right}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:14px}.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;color:#92400e}.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.photos img{width:100%;height:105px;object-fit:cover;border-radius:8px;border:1px solid #ddd}.small{font-size:10px;color:#777}.footer{margin-top:22px;border-top:1px solid #ddd;padding-top:8px;color:#777;font-size:10px}.printbtn{position:fixed;right:18px;top:18px;padding:9px 14px;border:1px solid #1a1a1a;border-radius:8px;background:#1a1a1a;color:#fff;cursor:pointer}@media print{.printbtn{display:none}.page{max-width:none}}'+
    '</style></head><body><button class="printbtn" onclick="window.print()">Guardar como PDF</button><div class="page">'+
    '<div class="top"><div><div class="brand">Return</div><div class="sub">Informe de inversión inmobiliaria</div></div><div style="text-align:right"><h1 class="title">'+casePdfEsc(c.name)+'</h1><div class="loc">'+casePdfEsc(c.date||'')+(loc?' · '+casePdfEsc(loc):'')+'</div></div></div>'+
    '<div class="grid"><div class="kpi"><div class="l">Compra</div><div class="v">'+casePdfMoney(S.pc)+'</div></div><div class="kpi"><div class="l">Reforma</div><div class="v">'+casePdfMoney(reforma)+'</div></div><div class="kpi"><div class="l">Inversión total</div><div class="v">'+casePdfMoney(inversion)+'</div></div><div class="kpi"><div class="l">Superficie</div><div class="v">'+(F.sup?casePdfEsc(F.sup+' m²'):'—')+'</div></div></div>'+
    '<div class="grid"><div class="kpi"><div class="l">ROI flip</div><div class="v '+((flip.rc||0)>=20?'ok':(flip.rc||0)>=10?'warn':'bad')+'">'+casePdfPct(flip.rc)+'</div></div><div class="kpi"><div class="l">Margen neto flip</div><div class="v '+((flip.mn||0)>0?'ok':'bad')+'">'+casePdfMoney(flip.mn)+'</div></div><div class="kpi"><div class="l">Yield BTR neta</div><div class="v '+((btr.rn||0)>=7?'ok':(btr.rn||0)>=5?'warn':'bad')+'">'+casePdfPct(btr.rn)+'</div></div><div class="kpi"><div class="l">Cash on cash</div><div class="v">'+casePdfPct(btr.coc)+'</div></div></div>'+
    (photos.length?'<div class="sec"><h2>Fotos</h2><div class="photos">'+photos.map(function(f){return '<img src="'+f.b64+'">';}).join('')+'</div></div>':'')+
    '<div class="twocol"><div class="sec"><h2>Datos del activo</h2><table>'+casePdfRows([['Dirección',S._direccion||imp.direccion||c.name],['Ubicación',loc||'—'],['Precio compra',casePdfMoney(S.pc)],['Superficie',F.sup?F.sup+' m²':'—'],['Habitaciones',imp.habitaciones||'—'],['Baños',imp.banos||'—'],['Planta',imp.planta||'—'],['Ascensor',imp.ascensor===true?'Sí':imp.ascensor===false?'No':'—'],['Estado',imp.estado||'—'],['Año construcción',imp.ano_construccion||'—'],['URL anuncio',url||'—']])+'</table></div>'+
    '<div class="sec"><h2>Hipótesis principales</h2><table>'+casePdfRows([['ITP',casePdfPct(S.itp)],['Notaría/registro/gestoría',casePdfPct(S.not)],['Due diligence',casePdfMoney(S.dd)],['Honorarios agencia',casePdfPct(S.hon)],['Financiación',S.fin?'Sí':'No'],['LTV',casePdfPct(S.ltv)],['Tipo interés',casePdfPct(S.ti)],['Plazo hipoteca',S.hip?S.hip+' años':'—'],['Alquiler mensual',casePdfMoney(B.rnt)],['Vacancia',casePdfPct(B.vac)],['IBI anual',casePdfMoney(B.ibi)],['Comunidad anual',casePdfMoney(B.com)]])+'</table></div></div>'+
    '<div class="twocol"><div class="sec"><h2>Resultado Flip</h2><table>'+casePdfRows([['Venta estimada',casePdfMoney(F.pv)],['Coste total proyecto',casePdfMoney(flip.tot)],['Capital requerido',casePdfMoney(flip.cr)],['Margen neto',casePdfMoney(flip.mn)],['ROI sobre capital',casePdfPct(flip.rc)],['Rentabilidad anualizada',casePdfPct(flip.ra)]])+'</table></div>'+
    '<div class="sec"><h2>Resultado Buy to Rent</h2><table>'+casePdfRows([['Renta bruta anual',casePdfPct(btr.rb)],['Yield neta',casePdfPct(btr.rn)],['Cash on cash',casePdfPct(btr.coc)],['Beneficio neto anual',casePdfMoney(btr.bn)],['Cash flow anual',casePdfMoney(btr.cf)],['Coste total',casePdfMoney(btr.tot)]])+'</table></div></div>'+
    (topPartidas?'<div class="sec"><h2>Principales partidas de reforma</h2><table><thead><tr><th>Categoría</th><th>Partida</th><th>Cantidad</th><th>€/ud</th><th>Total</th></tr></thead><tbody>'+topPartidas+'</tbody></table><div class="small">Se muestran las 12 partidas activas de mayor importe. Presupuesto total guardado: '+casePdfMoney(c.presupuesto||reforma)+'.</div></div>':'')+
    (c.notas||imp.notas_inversor?'<div class="sec"><h2>Notas</h2><div class="note">'+casePdfEsc([c.notas,imp.notas_inversor].filter(Boolean).join('\n\n')).replace(/\n/g,'<br>')+'</div></div>':'')+
    '<div class="footer">Informe generado desde Return el '+new Date().toLocaleDateString('es-ES')+'. Datos orientativos según hipótesis guardadas en el caso.</div>'+
    '<script>setTimeout(function(){window.print();},400);<\/script></div></body></html>';

  var w=window.open('', '_blank');
  if(!w){alert('El navegador ha bloqueado la ventana emergente. Permite pop-ups para exportar el PDF.');return;}
  w.document.open();
  w.document.write(html);
  w.document.close();
};

// ─── GITHUB STORAGE ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 12 · GITHUB STORAGE  —  sincronización
// ═══════════════════════════════════════════════════════

