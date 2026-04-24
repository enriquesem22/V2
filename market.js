// market.js — Pestaña Mercado: valoración RICS y comparables
// Metodología: RICS Red Book 2024, OBPVA 8 (Enfoque de mercado con ajustes cualitativos)

function rMKT(){
  const provs=Object.keys(GEO).sort();
  const muns=getMuns(),bars=getBars(),subs=getSubs();
  const {m,b,s}=getD();
  const precio=s||b||m;
  const imp=window._lastImport||{};

  // Leer estado actual del inmueble (import o manual)
  const sup      = +(F.sup||imp.superficie||65);
  const planta   = S._planta!=null?S._planta:(imp.planta!=null?imp.planta:null);
  const ascensor = S._ascensor!=null?S._ascensor:(imp.ascensor!=null?imp.ascensor:null);
  const estado   = S._estado||(imp.estado||'buen estado');
  const ano      = S._ano||(imp.ano_construccion||null);
  const habs     = S._habs||(imp.habitaciones||null);
  const banos    = S._banos||(imp.banos||null);
  const garaje   = S._garaje!=null?S._garaje:(imp.garaje||false);
  const trastero = S._trastero!=null?S._trastero:(imp.trastero||false);
  const terraza  = S._terraza||false;
  const orient   = S._orient||(imp.orientacion||null);
  const cert     = S._cert||(imp.certificado_energetico||null);
  // ESG factors
  const inundacion = S._inundacion||false;
  const ruido      = S._ruido||false;
  const transporte = S._transporte||false;
  const recargaVE  = S._recargaVE||false;
  const amianto    = S._amianto||false;

  const val = precio ? calcValoracion(precio,
    {sup,planta,ascensor,estado,ano,habs,banos,garaje,trastero,terraza,orient,cert,
     inundacion,ruido,transporte,recargaVE,amianto}) : null;
  const slug = m?m.slug||'':'';

  document.getElementById('mi').innerHTML=
    sec('Ubicación',
      `<div class="irow"><div class="ilbl">Dirección</div><div class="iwrap"><input type="text" value="${S._direccion||''}" placeholder="Calle y número" oninput="window.S._direccion=this.value" style="font-family:inherit;font-size:13px;flex:1;border:none;background:#fff;padding:7px 10px;outline:none;min-width:0"><div class="iunit">📍</div></div></div>`+
      `<div class="irow"><div class="ilbl">Provincia</div><div class="iwrap"><select onchange="setProv(this.value);setTimeout(rMKT,80)">${optList(provs,SEL.prov,'— provincia —')}</select></div></div>`+
      `<div class="irow"><div class="ilbl">Municipio</div><div class="iwrap"><select id="sel-mun" onchange="setMun(this.value);setTimeout(rMKT,80)"${!SEL.prov?' disabled':''}>${optList(muns,SEL.mun,'— municipio —')}</select></div></div>`+
      `<div class="irow" id="row-bar" style="${SEL.mun&&bars.length?'':'display:none'}"><div class="ilbl">Barrio</div><div class="iwrap"><select id="sel-bar" onchange="setBar(this.value);setTimeout(rMKT,80)"${!SEL.mun?' disabled':''}>${optList(bars,SEL.bar,'— barrio —')}</select></div></div>`+
      `<div class="irow" id="row-sub" style="${SEL.bar&&subs.length?'':'display:none'}"><div class="ilbl">Sub-barrio</div><div class="iwrap"><select id="sel-sub" onchange="setSub(this.value);setTimeout(rMKT,80)"${!SEL.bar?' disabled':''}>${optList(subs,SEL.sub,'— sub-barrio —')}</select></div></div>`
    ,'mUbic')+

    sec('Características del inmueble',
      `<div class="irow"><div class="ilbl">Superficie útil</div><div class="iwrap"><input type="number" value="${sup}" step="1" oninput="F.sup=+this.value;window.S._sup=+this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none"><div class="iunit">m²</div></div></div>`+
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px">
        <div><div class="ilbl">Habitaciones</div><div class="iwrap"><input type="number" value="${habs||''}" min="1" max="10" placeholder="3" oninput="window.S._habs=+this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none"><div class="iunit">hab</div></div></div>
        <div><div class="ilbl">Baños</div><div class="iwrap"><input type="number" value="${banos||''}" min="1" max="5" placeholder="1" oninput="window.S._banos=+this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none"><div class="iunit">baños</div></div></div>
      </div>`+
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px">
        <div><div class="ilbl">Planta</div><div class="iwrap"><input type="number" value="${planta!=null?planta:''}" min="0" max="30" placeholder="2" oninput="window.S._planta=+this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none"><div class="iunit">ª</div></div></div>
        <div><div class="ilbl">Ascensor</div><div class="iwrap"><select onchange="window.S._ascensor=this.value==='si';rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;outline:none;cursor:pointer">
          <option value="">— —</option>
          <option value="si" ${ascensor===true?'selected':''}>Sí</option>
          <option value="no" ${ascensor===false?'selected':''}>No</option>
        </select></div></div>
      </div>`+
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px">
        <div><div class="ilbl">Estado</div><div class="iwrap"><select onchange="window.S._estado=this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;outline:none;cursor:pointer">
          <option value="buen estado" ${estado==='buen estado'?'selected':''}>Buen estado</option>
          <option value="para reformar" ${estado==='para reformar'?'selected':''}>Para reformar</option>
          <option value="obra nueva" ${estado==='obra nueva'?'selected':''}>Obra nueva</option>
        </select></div></div>
        <div><div class="ilbl">Año construcción</div><div class="iwrap"><input type="number" value="${ano||''}" min="1900" max="2026" placeholder="1980" oninput="window.S._ano=+this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;outline:none"><div class="iunit">año</div></div></div>
      </div>`+
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px">
        <div><div class="ilbl">Orientación</div><div class="iwrap"><select onchange="window.S._orient=this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;outline:none;cursor:pointer">
          <option value="">— —</option>
          <option value="sur" ${orient==='sur'||orient==='Sur'?'selected':''}>Sur ☀️ (+4%)</option>
          <option value="este" ${orient==='este'||orient==='Este'?'selected':''}>Este 🌅 (+2%)</option>
          <option value="oeste" ${orient==='oeste'||orient==='Oeste'?'selected':''}>Oeste (+1%)</option>
          <option value="norte" ${orient==='norte'||orient==='Norte'?'selected':''}>Norte (-3%)</option>
        </select></div></div>
        <div><div class="ilbl">Certif. energético</div><div class="iwrap"><select onchange="window.S._cert=this.value;rMKT()" style="flex:1;border:none;padding:7px 10px;font-size:13px;outline:none;cursor:pointer">
          <option value="">— —</option>
          <option value="A" ${cert==='A'?'selected':''}>A +7%</option>
          <option value="B" ${cert==='B'?'selected':''}>B +4%</option>
          <option value="C" ${cert==='C'?'selected':''}>C +1%</option>
          <option value="D" ${cert==='D'?'selected':''}>D  0%</option>
          <option value="E" ${cert==='E'?'selected':''}>E -3%</option>
          <option value="F" ${cert==='F'?'selected':''}>F -6%</option>
          <option value="G" ${cert==='G'?'selected':''}>G -10%</option>
        </select></div></div>
      </div>`+
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:9px">
        ${mktCheck('Garaje +5%',garaje,'window.S._garaje=this.checked')}
        ${mktCheck('Trastero +2%',trastero,'window.S._trastero=this.checked')}
        ${mktCheck('Terraza +3%',terraza,'window.S._terraza=this.checked')}
      </div>`
    ,'mCaract')+

    sec('Factores ESG (RICS OBPVA 8 §3.7)',
      `<div style="font-size:11px;color:#aaa;margin-bottom:8px;line-height:1.5">Según RICS Red Book (OBPVA 8 §3.7.4), estos factores medioambientales, sociales y de gobernanza impactan directamente en el valor de mercado.</div>`+
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${mktCheck('Zona inundación -10%',inundacion,'window.S._inundacion=this.checked')}
        ${mktCheck('Ruido/contaminación -5%',ruido,'window.S._ruido=this.checked')}
        ${mktCheck('Excelente transporte +4%',transporte,'window.S._transporte=this.checked')}
        ${mktCheck('Recarga VE en garaje +2%',recargaVE,'window.S._recargaVE=this.checked')}
        ${mktCheck('Posible amianto -12%',amianto,'window.S._amianto=this.checked')}
      </div>`
    ,'mESG');

  document.getElementById('mr').innerHTML=
    `<div id="mapa"></div>`+
    (!precio?`<div class="note-card" style="margin-top:8px">Selecciona una ubicación para ver la estimación.</div>`:
    `<div style="background:#1a1a1a;border-radius:10px;padding:16px;margin-top:8px;margin-bottom:8px">
      <div style="font-size:11px;color:#666;margin-bottom:2px">Valor estimado de venta</div>
      <div style="font-size:28px;font-weight:500;font-family:'Courier New',monospace;color:#fff">${ef(val.precioEst)}</div>
      <div style="font-size:12px;color:#555;margin-top:2px">${val.pm2Est.toLocaleString('es-ES')} €/m² · Rango: ${ef(val.precioMin)} – ${ef(val.precioMax)}</div>
      <div style="font-size:10px;color:#444;margin-top:4px">Base mercado zona: ${val.pm2Base.toLocaleString('es-ES')} €/m² · Ajuste total: <span style="color:${val.ajustTotal>0?'#4ade80':val.ajustTotal<0?'#f87171':'#aaa'}">${val.ajustTotal>0?'+':''}${val.ajustTotal.toFixed(1)}%</span></div>
    </div>
    <div class="kpis" style="margin-bottom:8px">
      <div class="kpi"><div class="kl">Renta mensual est.</div><div class="kv">${ef(val.rentaEst)}/mes</div><div class="ks">${val.pm2Alq.toFixed(1)} €/m²</div></div>
      <div class="kpi"><div class="kl">Yield bruta est.</div><div class="kv ${val.yieldBruta>=7?'pos':val.yieldBruta>=5?'warn':'neg'}">${val.yieldBruta.toFixed(1)}%</div><div class="ks">sobre precio estimado</div></div>
    </div>
    <div class="sec" style="margin-bottom:8px"><div class="sec-h" onclick="ts('mAjustes')"><span class="sec-ht">Desglose de ajustes RICS</span><span class="arr open" id="a-mAjustes">▼</span></div>
    <div class="sec-b open" id="mAjustes">
      <div style="font-size:10px;color:#aaa;margin-bottom:6px;line-height:1.5">Metodología: Enfoque de mercado con ajustes cualitativos según RICS OBPVA 8. Cada factor refleja su impacto sobre el precio base de la zona.</div>
      ${val.ajustes.map(a=>`<div class="dr">
        <div>
          <div class="dl">${a.nombre}</div>
          ${a.detalle?`<div style="font-size:10px;color:#bbb;margin-top:1px">${a.detalle}</div>`:''}
        </div>
        <span class="dv ${a.pct>0?'pos':a.pct<0?'neg':''}" style="font-weight:600;white-space:nowrap">${a.pct>0?'+':''}${a.pct.toFixed(1)}%</span>
      </div>`).join('')}
      <div class="dr" style="border-top:2px solid #e5e5e0;margin-top:4px;padding-top:6px">
        <span class="dl" style="font-weight:600">Ajuste total aplicado</span>
        <span class="dv ${val.ajustTotal>0?'pos':val.ajustTotal<0?'neg':''}" style="font-weight:700">${val.ajustTotal>0?'+':''}${val.ajustTotal.toFixed(1)}%</span>
      </div>
    </div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button onclick="window.S.pc=${Math.round(val.precioEst)};rSI();rSR();rFR();rBR();swTab('ap')" class="mkt-btn green" style="flex:1">Aplicar precio → Activo</button>
      <button onclick="applyPV(${Math.round(val.precioEst)})" class="mkt-btn green" style="flex:1">Aplicar → Flip</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button onclick="applyRent(${Math.round(val.rentaEst)})" class="mkt-btn green" style="flex:1">Aplicar renta → BTR</button>
    </div>
    ${slug?`<div style="display:flex;gap:6px;flex-wrap:wrap"><a class="mkt-btn dark" href="https://www.idealista.com/venta-viviendas/${slug}/" target="_blank">Comparables venta →</a><a class="mkt-btn dark" href="https://www.idealista.com/alquiler-viviendas/${slug}/" target="_blank">Comparables alquiler →</a></div>`:''}
    <div style="font-size:10px;color:#ccc;margin-top:8px;line-height:1.5;padding:8px;background:#f9f9f7;border-radius:6px">
      ⚠ Estimación orientativa basada en el Enfoque de Mercado (RICS DBPV 3) con ajustes cualitativos según RICS Red Book 2024 (OBPVA 8). No sustituye una valoración formal emitida por un tasador habilitado.
    </div>`);

  // Render comparables section
  document.getElementById('mr').innerHTML += `
    <div class="sec" style="margin-top:8px">
      <div class="sec-h" onclick="ts('mComps')"><span class="sec-ht">📊 Comparables de mercado</span><span class="arr" id="a-mComps">▼</span></div>
      <div class="sec-b" id="mComps">
        <div style="font-size:11px;color:#888;line-height:1.5;margin-bottom:10px">
          Búsqueda automática de anuncios activos en la zona seleccionada. Usa Idealista como fuente y IA para extraer los datos. Requiere API key de Groq configurada.
        </div>
        <button onclick="buscarComparables()" id="btn-comps" style="width:100%;padding:9px;border:1px solid #1a1a1a;border-radius:6px;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">
          🔍 Buscar comparables en Idealista
        </button>
        <div id="comps-status" style="font-size:11px;color:#aaa;margin-top:6px;text-align:center"></div>
        <div id="comps-result" style="margin-top:8px"></div>
      </div>
    </div>`;

  setTimeout(()=>{initMap();doMapUpdate();},100);
}
function mktCheck(label, checked, fn){
  return `<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555;cursor:pointer;padding:7px 10px;border:1px solid ${checked?'#86efac':'#e5e5e0'};border-radius:6px;background:${checked?'#f0fdf4':'#fff'}">
    <input type="checkbox" ${checked?'checked':''} onchange="${fn};rMKT()" style="accent-color:#ba7517;width:14px;height:14px"> ${label}
  </label>`;
}

// ─── VALORACIÓN BASADA EN RICS RED BOOK (OBPVA 8) ────────────────────
// Factores de ajuste según:
// - OBPVA 8 §1.2: características físicas del inmueble
// - OBPVA 8 §2.3: estado de conservación
// - OBPVA 8 §3.4: eficiencia energética y riesgo de obsolescencia
// - OBPVA 8 §3.7.4: factores ESG (medioambiental, social, gobernanza)
// - Enfoque de mercado (DBPV 3): comparables ajustados
function calcValoracion(precio, prop){
  const {sup, planta, ascensor, estado, ano, habs, banos,
         garaje, trastero, terraza, orient, cert,
         amianto, inundacion, ruido, transporte, recargaVE} = prop;
  const ajustes = [];
  let total = 0;

  const add = (nombre, pct, detalle) => {
    ajustes.push({nombre, pct, detalle: detalle||''});
    total += pct;
  };

  // ── A. ESTADO DE CONSERVACIÓN (RICS OBPVA 8 §2.3) ──────────────
  if(estado === 'obra nueva')         add('Obra nueva', +15, 'Prima máxima por inmueble sin uso');
  else if(estado === 'para reformar') add('Para reformar', -15, 'Descuento por coste reforma pendiente');
  // Buen estado: 0% (base)

  // ── B. ANTIGÜEDAD DEL EDIFICIO (RICS OBPVA 8 §1.2.b.ii) ─────────
  if(ano){
    const edad = new Date().getFullYear() - ano;
    if(edad <= 5)        add('Edificio muy reciente (≤5 años)', +8, 'Materiales y sistemas en óptimo estado');
    else if(edad <= 15)  add('Edificio reciente (6-15 años)', +4, 'Sin obsolescencia técnica significativa');
    else if(edad <= 30)  add('Edificio moderno (16-30 años)', +1, 'Mantenimiento habitual suficiente');
    else if(edad <= 50)  add('Edificio consolidado (31-50 años)', -3, 'Posibles actualizaciones de instalaciones');
    else if(edad <= 70)  add('Edificio antiguo (51-70 años)', -6, 'Probable obsolescencia funcional parcial');
    else                 add('Edificio histórico (>70 años)', -9, 'Alta obsolescencia; valorar rehabilitación');
  }

  // ── C. PLANTA Y ACCESIBILIDAD (RICS OBPVA 8 §1.2.b.iii) ─────────
  if(planta != null){
    const pl = parseInt(planta);
    if(pl === 0){
      add('Planta baja', -8, 'Menor luminosidad, privacidad e intimidad');
    } else if(pl === 1){
      if(ascensor === false) add('1ª planta sin ascensor', -2, 'Barrera de accesibilidad leve');
      else                   add('1ª planta con ascensor', +1, 'Buena accesibilidad y usabilidad');
    } else if(pl >= 2 && pl <= 3){
      if(ascensor === false) add('Planta media sin ascensor', -8, 'Barrera de accesibilidad significativa');
      else                   add('Planta media con ascensor', +2, 'Altura óptima: luminosidad + accesibilidad');
    } else if(pl >= 4){
      if(ascensor === false) add('Planta alta SIN ascensor', -15, 'Barrera de accesibilidad severa; desaconsejado');
      else                   add('Planta alta con ascensor y vistas', +4, 'Prima por vistas y luminosidad');
    }
  }

  // ── D. CERTIFICADO ENERGÉTICO (RICS OBPVA 8 §3.4, §3.7.4.a) ─────
  // Riesgo de obsolescencia por carbonización: activos con peor cert. perderán valor
  const certMap = {A: +7, B: +4, C: +1, D: 0, E: -3, F: -6, G: -10};
  if(cert && certMap[cert] !== undefined){
    const pct = certMap[cert];
    const detMap = {
      A: 'Máxima eficiencia energética; sin riesgo de obsolescencia normativa',
      B: 'Alta eficiencia; valorado positivamente por compradores e inversores',
      C: 'Eficiencia media-alta; cumple estándares actuales',
      D: 'Eficiencia media (referencia de mercado)',
      E: 'Eficiencia por debajo de media; riesgo de obligación de mejoras',
      F: 'Baja eficiencia; posible obsolescencia normativa (EPBD 2024)',
      G: 'Mínima eficiencia; alto riesgo de descuento de mercado y normativa'
    };
    add('Certif. energético ' + cert, pct, detMap[cert] || '');
  }

  // ── E. RATIO BAÑOS/HABITACIONES (RICS OBPVA 8 §1.2.b.iv) ─────────
  if(habs && banos){
    const ratio = banos / habs;
    if(ratio >= 1)         add('Baño por habitación (ratio '+ratio.toFixed(2)+')', +5, 'Alta funcionalidad y confort; atractivo para alquiler de calidad');
    else if(ratio >= 0.6)  add('Buena dotación de baños (ratio '+ratio.toFixed(2)+')', +2, 'Por encima de la media del mercado');
    else if(ratio < 0.35)  add('Dotación de baños insuficiente (ratio '+ratio.toFixed(2)+')', -4, 'Limitación funcional relevante para el mercado');
  }

  // ── F. EXTRAS Y EQUIPAMIENTO (RICS OBPVA 8 §1.2.b.v) ─────────────
  if(garaje)   add('Garaje incluido', +5, 'Activo complementario con alta demanda en zonas urbanas');
  if(trastero) add('Trastero', +2, 'Mejora la funcionalidad y el almacenamiento');
  if(terraza)  add('Terraza o balcón', +3, 'Espacio exterior: demanda muy alta post-2020');

  // ── G. ORIENTACIÓN (factor solar y confort) ───────────────────────
  const orientMap = {sur: +4, este: +2, oeste: +1, norte: -3};
  if(orient && orientMap[orient] !== undefined){
    const detOrient = {
      sur: 'Máxima captación solar; menor gasto energético en calefacción',
      este: 'Sol de mañana; confortable y eficiente',
      oeste: 'Sol de tarde; calor en verano, valorado según zona',
      norte: 'Escasa captación solar; mayor gasto energético'
    };
    add('Orientación ' + orient, orientMap[orient], detOrient[orient] || '');
  }

  // ── H. FACTORES ESG / SOSTENIBILIDAD (RICS OBPVA 8 §3.7.4) ───────

  // Riesgo de inundación (RICS OBPVA 8 §3.2)
  if(inundacion) add('Zona de riesgo de inundación', -10, 'RICS OBPVA 8 §3.2: impacta disponibilidad seguro y valor comerciabilidad');

  // Contaminación acústica (RICS OBPVA 8 §3.7.4.q)
  if(ruido) add('Zona de ruido/contaminación acústica', -5, 'RICS OBPVA 8 §3.7.4.q: impacto comunitario negativo sobre el valor');

  // Conectividad y transporte (RICS OBPVA 8 §3.7.4.m)
  if(transporte) add('Excelente conectividad y transporte', +4, 'RICS OBPVA 8 §3.7.4.m: movilidad como factor social de valor');

  // Punto de recarga vehículo eléctrico (RICS OBPVA 8 §3.7.4.n)
  if(recargaVE) add('Punto de recarga VE en garaje', +2, 'RICS OBPVA 8 §3.7.4.n: movilidad sostenible, creciente demanda');

  // Materiales peligrosos - amianto (RICS OBPVA 8 §1.2.b.viii)
  if(amianto) add('Posible presencia de amianto', -12, 'RICS OBPVA 8 §1.2.b.viii: coste de saneamiento y limitación comercial');

  // ── I. CÁLCULO FINAL ──────────────────────────────────────────────
  // Aplicar ajuste al precio base de zona (Enfoque de Mercado, DBPV 3)
  // Si hay comparables reales, usar su mediana como base en lugar del precio GEO
  const pm2Base = (window._comparablesOverride && window._comparablesOverride > 0)
    ? window._comparablesOverride
    : precio.v;
  const factor = 1 + Math.max(-60, Math.min(50, total)) / 100; // cap ±60%
  const pm2Est  = Math.round(pm2Base * factor);
  const pm2Alq  = Math.round(precio.a * factor * 10) / 10;
  const precioEst = Math.round(pm2Est * sup);
  // Rango de incertidumbre ±8% (coherente con práctica RICS)
  const precioMin = Math.round(precioEst * 0.92);
  const precioMax = Math.round(precioEst * 1.08);
  const rentaEst  = Math.round(pm2Alq * sup);
  const yieldBruta = precioEst > 0 ? (rentaEst * 12 / precioEst * 100) : 0;

  return {pm2Est, pm2Base, pm2Alq, precioEst, precioMin, precioMax,
          rentaEst, yieldBruta, ajustes, ajustTotal: total};
}

window.rMKT=rMKT;

function rSR(){
  const c=cS(S);
  document.getElementById('sr').innerHTML=
    
    `<div class="sum-card"><div class="sum-title">Resumen de costes de entrada</div>${dr('Precio de compra',ef(S.pc))}${dr('ITP',ef(c.it))}${dr('Notaría + Registro',ef(c.nr))}${dr('Due diligence',ef(S.dd))}${S.hon>0?dr('Honorarios comprador',ef(c.hn)):''}<div class="gap"></div>${dr('Total gastos de adquisición',ef(c.ga),'hl')}${dr('Coste de entrada total',ef(S.pc+c.ga),'hl')}${S.fin?`<div class="gap"></div>${dr('Principal hipotecario',ef(c.pr))}${dr('Cuota mensual estimada',ef(c.cm)+'/mes')}${dr('Capital propio (sin reforma)',ef(S.pc*(1-S.ltv/100)),'warn')}`:''}
    </div>${window.S._direccion?`<div class="note-card" style="margin-bottom:8px;border-color:#ba7517;color:#555"><b>Dirección:</b> ${window.S._direccion}${window.S._cp?" · CP "+window.S._cp:""}</div>`:""}${(window._lastImport&&window._lastImport.foto_urls&&window._lastImport.foto_urls.length>0)?`<div class="sec" style="margin-bottom:8px"><div class="sec-h" onclick="ts('fotosActivo')"><span class="sec-ht">📷 Fotos del inmueble</span><span class="arr" id="a-fotosActivo">▼</span></div><div class="sec-b" id="fotosActivo"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${window._lastImport.foto_urls.slice(0,6).map(u=>"<a href='"+u+"' target='_blank' style='display:block;aspect-ratio:4/3;overflow:hidden;border-radius:5px;border:1px solid #e5e5e0'><img src='"+u+"' style='width:100%;height:100%;object-fit:cover' onerror=\"this.parentElement.style.display=\'none\'\" loading='lazy'></a>").join("")}</div></div></div>`:""}<div class="note-card">La reforma se define en la pestaña Presupuesto. Los precios de mercado y el mapa se actualizan con la ubicación seleccionada.</div>`;
  setTimeout(()=>{initMap();doMapUpdate();},100);
}

function rFI(){const hasP=window._presupuestoTotal>0;document.getElementById('fi').innerHTML=(hasP?`<div class="green-note">Reforma desde presupuesto por partidas: <b>${ef(window._presupuestoTotal)}</b></div>`:'')+sec('Reforma y costes',(!hasP?ir('Coste €/m²',F.rm2,'€/m²',"uf('rm2',+this.value)"):'')+ir('Contingencia',F.ct,'%',"uf('ct',+this.value)")+ir('Costes indirectos',F.ind,'€',"uf('ind',+this.value)")+ir('Plazo total',F.pl,'meses',"uf('pl',+this.value)"),'fR')+sec('Venta',ir('Precio de venta',F.pv,'€',"uf('pv',+this.value)")+ir('Gastos de venta',F.gv,'%',"uf('gv',+this.value)"),'fV');}
function rFR(){const c=cF(S,F),v=vF(c.rc,c.mn),sk=c.rc>=20?'pos':c.rc<0?'neg':c.rc>=15?'warn':'',ak=c.ra>=30?'pos':c.ra<0?'neg':'';document.getElementById('fr').innerHTML=`<div class="verdict ${v.c}"><div class="vt"><div class="vic">${v.i}</div><div><div class="vlb">Veredicto</div><div class="vvl">${v.l}</div></div></div><div class="vrs">${v.w}</div></div>`+`<div class="kpis">${kp('ROI sobre capital',ep(c.rc),F.pl+' meses',sk)}${kp('ROI anualizado',ep(c.ra),'',ak)}${kp('Margen neto',ef(c.mn),'',c.mn>0?'pos':'neg')}${kp('Coste total',ef(c.tot),'Capital: '+ef(c.cap))}</div>`+sec('Desglose completo',dr('Precio de compra',ef(S.pc))+dr('ITP',ef(c.it))+dr('Notaría + Registro',ef(c.nr))+dr('Due diligence',ef(S.dd))+(S.hon>0?dr('Honorarios comprador',ef(c.hn)):'')+dr('Reforma',ef(c.cr))+dr('Contingencia',ef(c.co))+dr('Costes indirectos',ef(F.ind))+(S.fin?dr('Intereses obra',ef(c.io)):'')+dr('Coste total proyecto',ef(c.tot),'hl')+'<div class="gap"></div>'+dr('Precio de venta',ef(F.pv))+dr('Gastos de venta','− '+ef(c.gve))+dr('Ingreso neto venta',ef(c.ing))+'<div class="gap"></div>'+dr('Margen bruto',ef(c.mb),c.mb>0?'pos':'neg')+dr('Margen neto',ef(c.mn),c.mn>0?'pos':'neg')+dr('ROI total sobre inversión',ep(c.rt))+dr('ROI sobre capital propio',ep(c.rc),sk||'warn')+dr('ROI anualizado',ep(c.ra),ak),'frD')+sec('Análisis de sensibilidad',`<div class="sttl">ROI sobre capital según precio de venta y coste de reforma</div><div class="ssub">Filas: precio venta (−10%→+10%) · Columnas: reforma (−15% / base / +15%)</div><table class="st"><thead><tr><th>PV/Reforma</th><th>−15%</th><th>Base</th><th>+15%</th></tr></thead><tbody>${[-10,-5,0,5,10].map((pp,i)=>`<tr class="${pp===0?'base':''}"><td>${pp>0?'+':''}${pp}%</td>${c.sens[i].map(x=>`<td class="${sc2(x)}">${x.toFixed(1)}%</td>`).join('')}</tr>`).join('')}</tbody></table>`,'frS');}
function rBI(){const hasP=window._presupuestoTotal>0;document.getElementById('bi').innerHTML=(hasP?`<div class="green-note">Reforma desde presupuesto por partidas: <b>${ef(window._presupuestoTotal)}</b></div>`:'')+sec('Reforma',(!hasP?ir('Reforma total',B.ref,'€',"ub('ref',+this.value)"):'')+ir('Contingencia',B.ct,'%',"ub('ct',+this.value)"),'bR')+sec('Alquiler',ir('Renta mensual',B.rnt,'€/mes',"ub('rnt',+this.value)")+ir('Vacancia estimada',B.vac,'%',"ub('vac',+this.value)"),'bAlq')+sec('Gastos anuales',ir('IBI',B.ibi,'€/año',"ub('ibi',+this.value)")+ir('Comunidad',B.com,'€/año',"ub('com',+this.value)")+ir('Seguro hogar',B.seg,'€/año',"ub('seg',+this.value)")+tgrow('Seguro de impago',B.imp,"tb2('imp')",'4,5% renta anual')+ir('Mantenimiento',B.mnt,'% precio',"ub('mnt',+this.value)")+ir('Gestoría',B.ges,'% renta',"ub('ges',+this.value)"),'bGts');}
function rBR(){const c=cB(S,B),v=vB(c.rn,c.coc,S.fin),bk=c.rb>=9?'pos':c.rb<5?'neg':'warn',nk=c.rn>=6?'pos':c.rn<0?'neg':'warn',ck=c.coc>=7?'pos':c.coc<0?'neg':'warn';document.getElementById('br').innerHTML=`<div class="verdict ${v.c}"><div class="vt"><div class="vic">${v.i}</div><div><div class="vlb">Veredicto</div><div class="vvl">${v.l}</div></div></div><div class="vrs">${v.w}</div></div>`+`<div class="kpis">${kp('Rent. bruta',ep(c.rb),'',bk)}${kp('Rent. neta',ep(c.rn),'',nk)}${S.fin?kp('Cash on cash',ep(c.coc),'',ck):kp('Beneficio neto',ef(c.bn),'por año',c.bn>0?'pos':'neg')}${S.fin?kp('Cash flow',ef(c.cf/12)+'/mes','tras hipoteca',c.cf>0?'pos':'neg'):kp('Payback',isFinite(c.pb)?c.pb.toFixed(1)+' años':'—','')}</div>`+sec('Inversión total',dr('Precio de compra',ef(S.pc))+dr('ITP',ef(c.it))+dr('Notaría + Registro',ef(c.nr))+dr('Due diligence',ef(S.dd))+dr('Reforma',ef(c.ref))+dr('Contingencia',ef(c.co))+dr('Coste total',ef(c.tot),'hl')+(S.fin?dr('Capital propio',ef(c.cap),'hl'):''),'brI')+sec('Cuenta de explotación anual',dr('Renta bruta anual',ef(c.ra))+dr('Vacancia','− '+ef(c.ve))+dr('Ingresos efectivos',ef(c.ie),'hl')+'<div class="gap"></div>'+dr('IBI','− '+ef(B.ibi))+dr('Comunidad','− '+ef(B.com))+dr('Seguro hogar','− '+ef(B.seg))+(B.imp?dr('Seguro impago (4,5%)','− '+ef(c.si)):'')+dr('Mantenimiento','− '+ef(c.mt))+(c.gs>0?dr('Gestoría','− '+ef(c.gs)):'')+'<div class="gap"></div>'+dr('Beneficio operativo neto',ef(c.bn),c.bn>0?'pos':'neg')+(S.fin?dr('Cuota hipoteca anual','− '+ef(c.ca))+dr('Cash flow tras hipoteca',ef(c.cf),c.cf>0?'pos':'neg'):'')+'<div class="gap"></div>'+dr('Rentabilidad bruta',ep(c.rb),bk)+dr('Rentabilidad neta',ep(c.rn),nk)+(S.fin?dr('Cash on cash',ep(c.coc),ck):''),'brE')+`<div class="refbox">Renta necesaria para yield neta del 7%: <b>${ef(c.r7)}/mes</b><br>Benchmark mínimo Valencia: 9–11% bruta · Media España 2024: 7,2% bruta<br>Seguro impago: 4,5% renta anual · Cobertura hasta 12 mensualidades</div>`;}

try{rSI();}catch(e){console.error('rSI:',e);}
try{rSR();}catch(e){console.error('rSR:',e);}
try{rPresupuesto();}catch(e){console.error('rPresupuesto:',e);}
try{rFI();}catch(e){console.error('rFI:',e);}
try{rFR();}catch(e){console.error('rFR:',e);}
try{rBI();}catch(e){console.error('rBI:',e);}
try{rBR();}catch(e){console.error('rBR:',e);}
