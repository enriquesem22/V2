// app.js — Lógica principal de la app Return
// Estado global, mapa, presupuesto, UI helpers, eventos, rendering de pestañas
// Depende de: geo-data.js, finance.js, market.js


window.onerror=function(m,s,l,c,e){
  var d=document.createElement('div');
  d.style.cssText='position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:10px;font-size:11px;z-index:9999;font-family:monospace;white-space:pre-wrap';
  d.textContent='ERR: '+m+'\nLine:'+l+' Col:'+c+'\n'+(e&&e.stack?e.stack.slice(0,200):'');
  document.body&&document.body.appendChild(d);
};
window.addEventListener('unhandledrejection',function(e){
  var d=document.createElement('div');
  d.style.cssText='position:fixed;top:60px;left:0;right:0;background:#d97706;color:#fff;padding:10px;font-size:11px;z-index:9999;font-family:monospace';
  d.textContent='PROMISE: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason));
  document.body&&document.body.appendChild(d);
});
// ╔═══════════════════════════════════════════════════════╗
// ║         RETURN — Analizador de Inversión Inmobiliaria  ║
// ╠═══════════════════════════════════════════════════════╣
// ║  § 1  Utilidades y formateo                           ║
// ║  § 2  Estado global (S, F, B)                         ║
// ║  § 3  Mapa y ubicación (Leaflet + GEO database)       ║
// ║  § 4  Presupuesto por partidas                        ║
// ║  § 5  Cálculos financieros (cS, cF, cB)               ║
// ║  § 6  Constructores de UI                             ║
// ║  § 7  Eventos globales (us, uf, ub, sw, ts)           ║
// ║  § 8  Rendering (rSI, rSR, rFI, rFR, rBI, rBR)        ║
// ║  § 9  Config IA (OpenAI · Gemini · Claude)             ║
// ║  § 10 Importar anuncio con IA                         ║
// ║  § 11 Portfolio de casos                              ║
// ║  § 12 GitHub Storage                                  ║
// ║  § 13 Google Drive                                    ║
// ║  § 14 Auto-save · Auto-restore · Criterios búsqueda   ║
// ╚═══════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// § 1 · UTILIDADES Y FORMATEO
// ─── SANITIZACIÓN DE HTML ──────────────────────────────────────────
// Previene XSS en contenido de IA, scraping e inputs de usuario
// sanitize: escapa HTML para prevenir XSS en contenido de IA e inputs
function sanitize(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


// ═══════════════════════════════════════════════════════
const ef=n=>isFinite(n)?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n))+'\u202f\u20ac':'—';
const ep=(n,d=1)=>isFinite(n)&&!isNaN(n)?n.toFixed(d)+'%':'—';
const OS={};
// ═══════════════════════════════════════════════════════
// § 2 · ESTADO GLOBAL  —  S (Activo) · F (Flip) · B (BTR)
// ═══════════════════════════════════════════════════════
window.S={pc:75000,itp:7,not:1.5,dd:350,hon:0,fin:false,ltv:70,ti:4.5,hip:20};
window.F={sup:65,rm2:350,ct:15,ind:2000,pl:8,pv:120000,gv:5};
window.B={ref:8000,ct:15,rnt:550,vac:5,ibi:300,com:600,seg:180,imp:true,mnt:1,ges:0};
let S=window.S, F=window.F, B=window.B;
window._presupuestoTotal=null;

// ─── ESTADO SELECCIÓN ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 3 · MAPA Y UBICACIÓN  —  Leaflet + GEO database
// ═══════════════════════════════════════════════════════
// SEL: objeto de ubicación compartido entre todos los bloques de script
window.SEL = window.SEL || {prov:'',mun:'',bar:'',sub:''};
let SEL = window.SEL;

// ─── BASE DE DATOS GEO + PRECIOS ─────────────────────────────────────
// poly: array de [lat,lng] — contorno aproximado del área
// v: €/m² venta media | a: €/m² alquiler medio
// vr/ar: rango orientativo | note: contexto inversor

// ─── MAPA ──────────────────────────────────────────────────────────────
let mapObj=null,mapMarker=null,mapPoly=null,mapCircle=null,mapReady=false;

function initMap(){
  if(mapObj||!window.L)return;
  const el=document.getElementById('mapa');
  if(!el)return;
  mapObj=L.map('mapa',{zoomControl:true,attributionControl:true}).setView([40.0,-3.7],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(mapObj);
  mapReady=true;
}

function clearMapLayers(){
  if(mapMarker){mapMarker.remove();mapMarker=null;}
  if(mapPoly){mapPoly.remove();mapPoly=null;}
  if(mapCircle){mapCircle.remove();mapCircle=null;}
}

function updateMap(data,label){
  if(!mapReady)initMap();
  if(!mapReady)return;
  clearMapLayers();
  const coords=data.coords,zoom=data.zoom||13;
  mapObj.setView(coords,zoom,{animate:true});
  // Marcador
  const icon=L.divIcon({className:'',html:`<div style="background:#ba7517;width:12px;height:12px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>`,iconSize:[12,12],iconAnchor:[6,6]});
  mapMarker=L.marker(coords,{icon}).addTo(mapObj);
  if(label)mapMarker.bindPopup(`<div style="font-family:system-ui;font-size:12px;font-weight:500;min-width:110px;line-height:1.5">${label}</div>`).openPopup();
  // Polígono si existe
  if(data.poly&&data.poly.length>2){
    mapPoly=L.polygon(data.poly,{color:'#ba7517',weight:2.5,opacity:0.9,fillColor:'#ba7517',fillOpacity:0.10,dashArray:'6,4'}).addTo(mapObj);
  } else {
    // Círculo indicativo si no hay polígono
    const radios={6:40000,9:20000,10:10000,11:8000,12:4000,13:1500,14:800,15:400,16:200};
    const r=radios[zoom]||1500;
    mapCircle=L.circle(coords,{color:'#ba7517',weight:1.5,opacity:0.7,fillColor:'#ba7517',fillOpacity:0.08,radius:r,dashArray:'5,5'}).addTo(mapObj);
  }
  setTimeout(()=>mapObj.invalidateSize(),100);
}

// ─── SELECCIÓN EN CASCADA ─────────────────────────────────────────────
function getD(){
  const p=GEO[SEL.prov],m=SEL.mun?p?.municipios?.[SEL.mun]:null,b=SEL.bar&&m?.barrios?m.barrios[SEL.bar]:null,s=SEL.sub&&b?.subbarrios?b.subbarrios[SEL.sub]:null;
  return{p,m,b,s};
}
function getMuns(){const {p}=getD();return p?Object.keys(p.municipios):[];}
function getBars(){const {m}=getD();return m?.barrios?Object.keys(m.barrios):[];}
function getSubs(){const {b}=getD();return b?.subbarrios?Object.keys(b.subbarrios):[];}

function setProv(v){SEL={prov:v,mun:'',bar:'',sub:''};window.SEL=SEL;rebuildSelects();doMapUpdate();}
function setMun(v){SEL={...SEL,mun:v,bar:'',sub:''};window.SEL=SEL;rebuildSelects();doMapUpdate();}
function setBar(v){SEL={...SEL,bar:v,sub:''};window.SEL=SEL;rebuildSelects();doMapUpdate();}
function setSub(v){SEL={...SEL,sub:v};window.SEL=SEL;rebuildSelects();doMapUpdate();}

function doMapUpdate(){
  const {p,m,b,s}=getD();
  const data=s||b||m||p;
  if(!data)return;
  let lbl=[];
  if(SEL.sub)lbl.push(`<b>${SEL.sub}</b>`);
  if(SEL.bar)lbl.push(SEL.bar);
  if(SEL.mun)lbl.push(`<span style="color:#888;font-weight:400">${SEL.mun}</span>`);
  updateMap(data,lbl.length?lbl.join('<br>'):SEL.prov);
  rPreciosMercado();
}

function optList(items,sel,ph){
  return`<option value="">${ph}</option>`+items.map(v=>`<option value="${v}"${v===sel?' selected':''}>${v}</option>`).join('');
}

function rebuildSelects(){
  const muns=getMuns(),bars=getBars(),subs=getSubs();
  const ms=document.getElementById('sel-mun');
  if(ms){ms.innerHTML=optList(muns,SEL.mun,'— municipio —');ms.disabled=!SEL.prov;}
  const row_b=document.getElementById('row-bar'),bs=document.getElementById('sel-bar');
  if(row_b&&bs){row_b.style.display=muns.length&&SEL.mun&&bars.length?'':'none';bs.innerHTML=optList(bars,SEL.bar,'— barrio —');bs.disabled=!SEL.mun;}
  const row_s=document.getElementById('row-sub'),ss=document.getElementById('sel-sub');
  if(row_s&&ss){row_s.style.display=SEL.bar&&subs.length?'':'none';ss.innerHTML=optList(subs,SEL.sub,'— sub-barrio —');ss.disabled=!SEL.bar;}
  rPreciosMercado();
}

function rPreciosMercado(){
  const el=document.getElementById('mkt-panel');
  if(!el)return;
  const {m,b,s}=getD();
  if(!m){el.innerHTML='';return;}
  const precio=s||b||m;
  const nivel=s?SEL.sub:b?SEL.bar:SEL.mun;
  const nivel2=s?`${SEL.bar} · ${SEL.mun}`:b?SEL.mun:'';
  const sup=+F.sup||65;
  const pvEst=Math.round(precio.v*sup),rentEst=Math.round(precio.a*sup);
  const slug=m.slug||'';
  const rango_v=(s||b)?m.vr:m.vr;
  const rango_a=(s||b)?m.ar:m.ar;
  el.innerHTML=`<div class="mkt-card">
    <div class="mkt-hdr">Mercado<span class="mkt-loc">${nivel}${nivel2?` · ${nivel2}`:''}</span></div>
    <div class="mkt-body">
      <div class="mkt-grid">
        <div class="mkt-kpi"><div class="mkt-kpi-lbl">Venta</div>
          <div class="mkt-kpi-val">${precio.v.toLocaleString('es-ES')} €/m²</div>
          ${rango_v?`<div class="mkt-kpi-range">Rango mun.: ${rango_v} €/m²</div>`:''}
          <div class="mkt-kpi-sub">Para ${sup} m² → <b>${pvEst.toLocaleString('es-ES')} €</b></div>
        </div>
        <div class="mkt-kpi"><div class="mkt-kpi-lbl">Alquiler</div>
          <div class="mkt-kpi-val">${precio.a.toFixed(1)} €/m²</div>
          ${rango_a?`<div class="mkt-kpi-range">Rango mun.: ${rango_a} €/m²</div>`:''}
          <div class="mkt-kpi-sub">Para ${sup} m² → <b>${rentEst.toLocaleString('es-ES')} €/mes</b></div>
        </div>
      </div>
      ${precio.note?`<div class="mkt-note">${precio.note}</div>`:''}
      <div class="mkt-src">Estimación mercado 2024 (Idealista · MITMA · Tinsa). Verificar con anuncio real.</div>
      <div class="mkt-btns">
        ${slug?`<a class="mkt-btn dark" href="https://www.idealista.com/venta-viviendas/${slug}/" target="_blank">Ver venta →</a>
        <a class="mkt-btn dark" href="https://www.idealista.com/alquiler-viviendas/${slug}/" target="_blank">Ver alquiler →</a>`:''}
      </div>
      <div class="mkt-apply">
        <button class="mkt-btn green" onclick="applyPV(${pvEst})">Aplicar precio venta → Flip</button>
        <button class="mkt-btn green" onclick="applyRent(${rentEst})">Aplicar renta → Buy to rent</button>
      </div>
    </div>
  </div>`;
}

window.applyPV=(v)=>{F.pv=v;rFI();rFR();swTab('fp');};
window.applyRent=(r)=>{B.rnt=r;rBI();rBR();swTab('bp');};

// ─── PRESUPUESTO ─────────────────────────────────────────────────────
const COL={'Vaciado y demolición':'#e57373','Instalación eléctrica':'#ffd54f','Fontanería y saneamiento':'#4fc3f7','Suelos':'#ce93d8','Paredes y techos':'#80cbc4','Baño/s':'#81d4fa','Cocina':'#ffb74d','Carpintería interior':'#a1887f','Ventanas y exterior':'#90a4ae','Climatización':'#81c784','Acabados finales':'#f4a460','Gestión y licencias':'#b0bec5','Home staging (flip)':'#f48fb1'};
// ═══════════════════════════════════════════════════════
// § 4 · PRESUPUESTO POR PARTIDAS
// ═══════════════════════════════════════════════════════
window.CATS=[
  {n:'Vaciado y demolición',open:true,items:[{d:'Levantado de pavimento existente',u:'m²',q:65,p:10,on:true,ref:'8–14 €/m²'},{d:'Derribo tabiques (si aplica)',u:'m²',q:15,p:20,on:false,ref:'15–28 €/m²'},{d:'Gestión de escombros y contenedor',u:'ud',q:1,p:450,on:true,ref:'350–600 €'},{d:'Retirada muebles y enseres',u:'ud',q:1,p:200,on:false,ref:'150–400 €'}]},
  {n:'Instalación eléctrica',open:true,items:[{d:'Instalación eléctrica completa (~65m²)',u:'ud',q:1,p:3200,on:true,ref:'2.800–4.500 €'},{d:'Cuadro eléctrico y protecciones',u:'ud',q:1,p:350,on:true,ref:'300–500 €'},{d:'Puntos de luz adicionales',u:'ud',q:4,p:80,on:false,ref:'60–120 €/ud'},{d:'Boletín eléctrico',u:'ud',q:1,p:150,on:true,ref:'120–200 €'}]},
  {n:'Fontanería y saneamiento',open:true,items:[{d:'Renovación fontanería completa',u:'ud',q:1,p:2500,on:true,ref:'2.000–3.500 €'},{d:'Sustitución bajante',u:'ud',q:1,p:550,on:false,ref:'350–900 €'},{d:'Bañera por plato de ducha',u:'ud',q:1,p:550,on:true,ref:'400–800 €'}]},
  {n:'Suelos',open:true,items:[{d:'Porcelánico o gres (mat.+inst.)',u:'m²',q:65,p:38,on:true,ref:'28–55 €/m²'},{d:'Rodapié',u:'ml',q:55,p:8,on:true,ref:'6–12 €/ml'},{d:'Pulido terrazo existente',u:'m²',q:65,p:15,on:false,ref:'12–20 €/m²'},{d:'Parquet laminado (alternativa)',u:'m²',q:65,p:25,on:false,ref:'18–35 €/m²'}]},
  {n:'Paredes y techos',open:true,items:[{d:'Picado de gotelé + alisado',u:'m²',q:180,p:9,on:true,ref:'7–13 €/m²'},{d:'Reparación humedades puntuales',u:'ud',q:1,p:250,on:false,ref:'150–500 €'},{d:'Falso techo pladur',u:'m²',q:30,p:32,on:false,ref:'25–45 €/m²'}]},
  {n:'Baño/s',open:true,items:[{d:'Reforma integral baño (alicatado+sanitarios)',u:'ud',q:1,p:3800,on:true,ref:'3.000–5.500 €'},{d:'Baño adicional (si hay 2)',u:'ud',q:0,p:3200,on:false,ref:'2.500–4.500 €'},{d:'Mampara de ducha',u:'ud',q:1,p:400,on:true,ref:'280–650 €'},{d:'Mueble de baño con lavabo',u:'ud',q:1,p:350,on:true,ref:'250–600 €'}]},
  {n:'Cocina',open:true,items:[{d:'Muebles cocina (~3m lineales)',u:'ud',q:1,p:2200,on:true,ref:'1.500–3.500 €'},{d:'Encimera (silestone o compacto)',u:'ud',q:1,p:450,on:true,ref:'300–800 €'},{d:'Fregadero + grifo monomando',u:'ud',q:1,p:220,on:true,ref:'150–350 €'},{d:'Electrodomésticos (horno+placa+campana)',u:'ud',q:1,p:900,on:true,ref:'600–1.500 €'},{d:'Alicatado frente cocina',u:'m²',q:8,p:35,on:true,ref:'25–50 €/m²'},{d:'Frigorífico (BTR)',u:'ud',q:1,p:500,on:false,ref:'350–900 €'}]},
  {n:'Carpintería interior',open:false,items:[{d:'Puertas de paso lacadas (mat.+inst.)',u:'ud',q:5,p:320,on:true,ref:'250–420 €/ud'},{d:'Puerta de entrada (blindada)',u:'ud',q:1,p:1100,on:true,ref:'800–1.600 €'},{d:'Armario empotrado (~60cm/módulo)',u:'ud',q:4,p:480,on:false,ref:'350–700 €/ud'}]},
  {n:'Ventanas y exterior',open:false,items:[{d:'Ventana PVC doble acristalamiento',u:'ud',q:6,p:480,on:false,ref:'320–650 €/ud'},{d:'Persiana (sustitución motorizada)',u:'ud',q:4,p:220,on:false,ref:'150–320 €/ud'}]},
  {n:'Climatización',open:false,items:[{d:'Split 1×1 inverter instalado',u:'ud',q:2,p:950,on:false,ref:'750–1.300 €/ud'},{d:'Preinstalación (sin unidad)',u:'ud',q:2,p:200,on:false,ref:'150–280 €/ud'}]},
  {n:'Acabados finales',open:true,items:[{d:'Pintura interior completa (2 manos)',u:'m²',q:200,p:7,on:true,ref:'5–10 €/m²'},{d:'Limpieza de obra final',u:'ud',q:1,p:280,on:true,ref:'200–400 €'},{d:'Pequeños remates y ajustes',u:'ud',q:1,p:300,on:true,ref:'200–500 €'}]},
  {n:'Gestión y licencias',open:false,items:[{d:'Aparejador / arquitecto técnico',u:'ud',q:1,p:1200,on:true,ref:'800–2.000 €'},{d:'Licencia de obras menor',u:'ud',q:1,p:350,on:true,ref:'200–600 €'},{d:'Certificado energético',u:'ud',q:1,p:180,on:true,ref:'150–250 €'}]},
  {n:'Home staging (flip)',open:false,items:[{d:'Home staging básico',u:'ud',q:1,p:1200,on:false,ref:'800–2.500 €'},{d:'Fotografía profesional',u:'ud',q:1,p:200,on:false,ref:'150–350 €'},{d:'Tour virtual 3D',u:'ud',q:1,p:350,on:false,ref:'250–600 €'}]},
];
let CATS=window.CATS;
function catTot(c){return c&&c.items?c.items.filter(i=>i.on).reduce((s,i)=>s+(+i.q||0)*(+i.p||0),0):0;}
function grandTot(){return CATS.reduce((s,c)=>s+catTot(c),0);}
function syncAll(){window._presupuestoTotal=grandTot()||null;rFI();rFR();rBI();rBR();}
function rPresupuesto(){
  CATS=window.CATS;const tot=grandTot();let cats='';
  CATS.forEach((cat,ci)=>{const ct=catTot(cat),col=COL[cat.n]||'#aaa',ac=cat.items.filter(i=>i.on).length;
    cats+=`<div class="cat-block"><div class="cat-hdr" onclick="tCat(${ci})"><span class="cat-name"><span class="cat-dot" style="background:${col}"></span>${cat.n}<span class="cat-badge">${ac}/${cat.items.length}</span></span><div style="display:flex;align-items:center;gap:10px"><span class="cat-total-lbl" id="ct-${ci}">${ef(ct)}</span><span class="arr${cat.open?' open':''}" id="ca-${ci}">▼</span></div></div>`;
    cats+=`<div class="cat-body${cat.open?' open':''}" id="cb-${ci}"><table class="ptable"><thead><tr><th style="width:3%"></th><th style="width:40%">Partida</th><th style="width:7%">Ud</th><th class="r" style="width:9%">Cant.</th><th class="r" style="width:12%">€/ud</th><th style="width:14%" class="r">Referencia</th><th class="r" style="width:12%">Total</th><th style="width:3%"></th></tr></thead><tbody>`;
    cat.items.forEach((it,ii)=>{const itot=it.on?(+it.q||0)*(+it.p||0):0;cats+=`<tr style="${it.on?'':'opacity:.45'}"><td><input type="checkbox" class="chk" ${it.on?'checked':''} onchange="toggleItem(${ci},${ii},this.checked)"></td><td><input class="pinput" value="${it.d}" onchange="upItem(${ci},${ii},'d',this.value)" ${it.on?'':'disabled'}></td><td><input class="pinput" value="${it.u}" onchange="upItem(${ci},${ii},'u',this.value)" style="width:34px" ${it.on?'':'disabled'}></td><td><input class="pinput mono" type="number" value="${it.q}" step="any" oninput="upItem(${ci},${ii},'q',+this.value)" ${it.on?'':'disabled'}></td><td><input class="pinput mono" type="number" value="${it.p}" step="any" oninput="upItem(${ci},${ii},'p',+this.value)" ${it.on?'':'disabled'}></td><td class="precio-ref">${it.ref||''}</td><td class="tc" id="it-${ci}-${ii}">${it.on?ef(itot):'—'}</td><td><button class="del-btn" onclick="delItem(${ci},${ii})">✕</button></td></tr>`;});
    cats+=`</tbody></table><button class="add-btn" onclick="addItem(${ci})">+ Añadir partida</button></div></div>`;
  });
  const sumRows=CATS.map((c,ci)=>`<div class="csr"><span class="csl"><span class="cat-dot" style="background:${COL[c.n]||'#aaa'}"></span>${c.n}</span><span class="csv" id="cs-${ci}">${ef(catTot(c))}</span></div>`).join('');
  document.getElementById('presupuesto').innerHTML=`<div class="pb-wrap"><div>${cats}</div><div class="pb-summary"><div class="pb-total-card"><div class="pb-total-lbl">Total presupuesto activo</div><div class="pb-total-val" id="pb-grand">${ef(tot)}</div><div class="pb-total-sub" id="pb-m2">${F.sup?'≈ '+Math.round(tot/(+F.sup||1))+' €/m²':''}</div></div><div class="pb-sync-box">Sincronizado con Flip y Buy to rent. Solo suman las partidas con ✓.</div><div class="sum-card"><div class="sum-title">Por categoría</div>${sumRows}<div style="height:5px"></div><div class="csr" style="border-top:1px solid #e5e5e0;padding-top:6px"><span class="csl" style="font-weight:500;color:#1a1a1a">Total</span><span class="csv" style="color:#ba7517;font-weight:500" id="cs-total">${ef(tot)}</span></div></div><div class="pb-actions"><button class="pb-btn" onclick="addCat()">+ Categoría</button><button class="pb-btn" onclick="clearAll()" style="color:#dc2626;border-color:#fca5a5">Vaciar</button></div></div></div>`;
  syncAll();
}
function toggleItem(ci,ii,val){CATS[ci].items[ii].on=val;refreshPbTotals();rPresupuesto();}
function upItem(ci,ii,k,v){CATS[ci].items[ii][k]=v;const it=CATS[ci].items[ii],itot=it.on?(+it.q||0)*(+it.p||0):0;const el=document.getElementById(`it-${ci}-${ii}`);if(el)el.textContent=it.on?ef(itot):'—';refreshPbTotals();}
function refreshPbTotals(){const tot=grandTot();CATS.forEach((c,ci)=>{const e=document.getElementById(`ct-${ci}`),s=document.getElementById(`cs-${ci}`);const v=ef(catTot(c));if(e)e.textContent=v;if(s)s.textContent=v;});const ge=document.getElementById('pb-grand'),m2=document.getElementById('pb-m2'),cst=document.getElementById('cs-total');if(ge)ge.textContent=ef(tot);if(m2)m2.textContent=F.sup?'≈ '+Math.round(tot/(+F.sup||1))+' €/m²':'';if(cst)cst.textContent=ef(tot);window._presupuestoTotal=tot||null;rFR();rBR();}
function tCat(ci){CATS[ci].open=!CATS[ci].open;const b=document.getElementById(`cb-${ci}`),a=document.getElementById(`ca-${ci}`);if(b)b.classList.toggle('open',CATS[ci].open);if(a)a.classList.toggle('open',CATS[ci].open);}
function addItem(ci){CATS[ci].items.push({d:'Nueva partida',u:'ud',q:1,p:0,on:true,ref:''});rPresupuesto();}
function delItem(ci,ii){CATS[ci].items.splice(ii,1);rPresupuesto();}
function addCat(){const name=prompt('Nombre de la nueva categoría:');if(!name)return;COL[name]='#b0bec5';CATS.push({n:name,open:true,items:[]});rPresupuesto();}
function clearAll(){if(!confirm('¿Desactivar todas las partidas?'))return;CATS.forEach(c=>c.items.forEach(i=>i.on=false));rPresupuesto();}

// ─── CÁLCULOS ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// § 5 · CÁLCULOS FINANCIEROS  —  cS · cF · cB
// ═══════════════════════════════════════════════════════


function ir(lb,vl,un,fn){return`<div class="irow irow-num"><div class="ilbl">${lb}</div><div class="iwrap"><input type="number" value="${vl}" step="any" oninput="${fn}"><div class="iunit">${un}</div></div></div>`;}
function tgrow(lb,vl,fn,sb){return`<div class="trow"><div><div class="tlbl">${lb}</div>${sb?`<div class="tsub">${sb}</div>`:''}</div><div class="tog${vl?' on':''}" onclick="${fn}"><div class="togk"></div></div></div>`;}
function sec(tt,bd,id,df=true){if(OS[id]===undefined)OS[id]=df;const o=OS[id];return`<div class="sec"><div class="sec-h" onclick="ts('${id}')"><span class="sec-ht">${tt}</span><span class="arr${o?' open':''}" id="a-${id}">▼</span></div><div class="sec-b${o?' open':''}" id="${id}">${bd}</div></div>`;}
function kp(lb,vl,sb,cl){return`<div class="kpi"><div class="kl">${lb}</div><div class="kv${cl?' '+cl:''}">${vl}</div>${sb?`<div class="ks">${sb}</div>`:''}</div>`;}
function dr(lb,vl,cl){return`<div class="dr"><span class="dl">${lb}</span><span class="dv${cl?' '+cl:''}">${vl}</span></div>`;}
function sc2(v){return v>=20?'sp':v>=10?'sw':v>=0?'':'sn';}

// ═══════════════════════════════════════════════════════
// § 7 · EVENTOS GLOBALES  —  us · uf · ub · sw · ts
// ═══════════════════════════════════════════════════════
window.us=(k,v)=>{S[k]=v;rSR();rFR();rBR();};
window.uf=(k,v)=>{F[k]=v;if(k==='sup')rPreciosMercado();rFI();rFR();};
window.ub=(k,v)=>{B[k]=v;rBR();};
window.tsh=(k)=>{S[k]=!S[k];rSI();rSR();rFR();rBR();};
window.tb2=(k)=>{B[k]=!B[k];rBI();rBR();};
window.ts=(id)=>{OS[id]=!OS[id];const b=document.getElementById(id),a=document.getElementById('a-'+id);if(b)b.classList.toggle('open',OS[id]);if(a)a.classList.toggle('open',OS[id]);};
window.sw=function(pid,btn){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  ['ap','mp','pp','fp','bp','ip','pp2'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const panel=document.getElementById(pid);
  if(panel) panel.classList.add('active');
  if(pid==='ap'&&mapObj) setTimeout(()=>mapObj.invalidateSize(),80);
  if(pid==='mp') setTimeout(()=>{rMKT();if(mapObj)setTimeout(()=>mapObj.invalidateSize(),150);},50);
  if(pid==='ip') setTimeout(initImport,50);
  if(pid==='pp2') setTimeout(()=>window.loadPortfolio(),50);
};
window.setProv=setProv;window.setMun=setMun;window.setBar=setBar;window.setSub=setSub;

// Helper: navigate to tab by panel id (robust, no index)
window.swTab = function(pid){
  var btn = document.querySelector('[data-tab="'+pid+'"]');
  window.sw(pid, btn);
};

// ═══════════════════════════════════════════════════════
// § 8 · RENDERING  —  rSI · rSR · rFI · rFR · rBI · rBR
// ═══════════════════════════════════════════════════════
function rSI(){
  document.getElementById('si').innerHTML=
    sec('Datos del inmueble',
      ir('Precio de compra',S.pc,'€',"us('pc',+this.value)")+
      ir('Superficie',F.sup,'m²',"uf('sup',+this.value)")
    ,'sActivo')+
    sec('Gastos de adquisición',
      ir('ITP',S.itp,'%',"us('itp',+this.value)")+
      ir('Notaría + Registro',S.not,'%',"us('not',+this.value)")+
      ir('Due diligence',S.dd,'€',"us('dd',+this.value)")+
      ir('Honorarios comprador',S.hon,'%',"us('hon',+this.value)")
    ,'sGastos')+
    sec('Financiación',
      tgrow('Financiación hipotecaria',S.fin,"tsh('fin')")+(S.fin?ir('LTV',S.ltv,'%',"us('ltv',+this.value)")+ir('Tipo de interés',S.ti,'%',"us('ti',+this.value)")+ir('Plazo hipoteca',S.hip,'años',"us('hip',+this.value)"):'')
    ,'sFin');
}


// ─── ARRANQUE ──────────────────────────────────────────────────────
// El render inicial se dispara desde index.html (DOMContentLoaded),
// después de que todos los módulos hayan cargado.
// Ver: window._appInit() en index.html
