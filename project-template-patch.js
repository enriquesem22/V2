// project-template-patch.js — Plantilla maestra para fichas/proyectos
// v2.32: cada proyecto nuevo se crea copiando esta plantilla y después se edita.
(function(){
  'use strict';

  window.RETURN_PROJECT_TEMPLATE_VERSION = '2.32';

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function uid(){ return Date.now(); }

  // Plantilla única de datos. Cualquier caso/proyecto nuevo debe nacer de aquí.
  var PROJECT_CASE_TEMPLATE = {
    schema_version: 'project_case_v2.32',
    id: null,
    name: 'Nuevo proyecto',
    date: null,
    updated_at: null,
    status: 'plantilla',
    tipo_operacion: 'inversion',
    estrategia: {
      flip: true,
      buy_to_rent: true,
      build_to_sell: false,
      otro: ''
    },
    loc: {
      prov: '',
      mun: '',
      bar: '',
      sub: '',
      _provincia: '',
      _municipio: '',
      _barrio: '',
      _coords: null
    },
    ficha: {
      datos_inmueble: {
        direccion: '',
        referencia_catastral: '',
        url_anuncio: '',
        fuente: '',
        uso_actual: '',
        uso_objetivo: 'vivienda',
        superficie_construida: 0,
        superficie_util: 0,
        habitaciones: 0,
        banos: 0,
        planta: '',
        ascensor: null,
        estado: '',
        ano_construccion: '',
        ocupacion: 'libre',
        cargas: '',
        notas: ''
      },
      compra: {
        precio_objetivo: 0,
        precio_publicado: 0,
        precio_oferta: 0,
        itp_pct: 7,
        notaria_registro_pct: 1.5,
        due_diligence: 350,
        honorarios_comprador_pct: 0,
        financiacion: false,
        ltv_pct: 70,
        interes_pct: 4.5,
        plazo_hipoteca_anos: 20
      },
      reforma: {
        presupuesto_total: 0,
        coste_m2: 350,
        contingencia_pct: 15,
        indirectos: 2000,
        plazo_meses: 8,
        alcance: '',
        riesgos_tecnicos: ''
      },
      flip: {
        precio_venta_estimado: 0,
        gastos_venta_pct: 5,
        roi_capital: 0,
        margen_neto: 0,
        roi_anualizado: 0,
        veredicto: '',
        notas: ''
      },
      buy_to_rent: {
        reforma_total: 0,
        contingencia_pct: 15,
        renta_mensual: 0,
        vacancia_pct: 5,
        ibi_anual: 300,
        comunidad_anual: 600,
        seguro_anual: 180,
        seguro_impago: true,
        mantenimiento_pct_precio: 1,
        gestoria_pct_renta: 0,
        rentabilidad_bruta: 0,
        rentabilidad_neta: 0,
        cash_on_cash: 0,
        cash_flow_anual: 0,
        notas: ''
      },
      mercado: {
        venta_eur_m2: 0,
        alquiler_eur_m2: 0,
        comparables_venta: [],
        comparables_alquiler: [],
        liquidez_zona: '',
        tiempo_venta_estimado: '',
        notas: ''
      },
      due_diligence: {
        registro: '',
        catastro: '',
        urbanismo: '',
        comunidad: '',
        ibi: '',
        ite: '',
        certificado_energetico: '',
        cedula_habitabilidad: '',
        licencias: '',
        riesgos_legales: ''
      },
      comercializacion: {
        publico_objetivo: '',
        estrategia_precio: '',
        canal_venta_alquiler: '',
        home_staging: false,
        fotografias: false,
        notas: ''
      },
      seguimiento: {
        prioridad: '',
        estado_pipeline: 'nuevo',
        agente: '',
        telefono_agente: '',
        email_agente: '',
        fecha_contacto: '',
        fecha_visita: '',
        importe_oferta: 0,
        proxima_accion: '',
        notas: ''
      },
      documentos: []
    },
    fotos: [],
    S: { pc:0, itp:7, not:1.5, dd:350, hon:0, fin:false, ltv:70, ti:4.5, hip:20, _direccion:'', _cp:'' },
    F: { sup:0, rm2:350, ct:15, ind:2000, pl:8, pv:0, gv:5 },
    B: { ref:0, ct:15, rnt:0, vac:5, ibi:300, com:600, seg:180, imp:true, mnt:1, ges:0 },
    presupuesto: 0,
    CATS: [],
    importData: {},
    resultado: {
      flip: { rc:0, mn:0, ra:0, tot:0, cr:0 },
      btr:  { rn:0, rb:0, coc:0, bn:0, cf:0, tot:0 }
    },
    notas: ''
  };

  window.PROJECT_CASE_TEMPLATE = PROJECT_CASE_TEMPLATE;

  function deepMerge(base, extra){
    var out = clone(base);
    extra = extra || {};
    Object.keys(extra).forEach(function(k){
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], extra[k]);
      } else if (extra[k] !== undefined) {
        out[k] = extra[k];
      }
    });
    return out;
  }

  function syncFichaFromLegacy(c){
    c.ficha = c.ficha || clone(PROJECT_CASE_TEMPLATE.ficha);
    c.S = c.S || clone(PROJECT_CASE_TEMPLATE.S);
    c.F = c.F || clone(PROJECT_CASE_TEMPLATE.F);
    c.B = c.B || clone(PROJECT_CASE_TEMPLATE.B);
    c.importData = c.importData || {};
    c.resultado = c.resultado || clone(PROJECT_CASE_TEMPLATE.resultado);

    var imp = c.importData || {};
    var d = c.ficha.datos_inmueble;
    d.direccion = d.direccion || c.S._direccion || imp.direccion || c.name || '';
    d.url_anuncio = d.url_anuncio || imp.url || imp.link || '';
    d.superficie_util = d.superficie_util || c.F.sup || imp.superficie || 0;
    d.habitaciones = d.habitaciones || imp.habitaciones || 0;
    d.banos = d.banos || imp.banos || 0;
    d.planta = d.planta || imp.planta || '';
    d.ascensor = d.ascensor !== null ? d.ascensor : (imp.ascensor !== undefined ? imp.ascensor : null);
    d.estado = d.estado || imp.estado || '';
    d.ano_construccion = d.ano_construccion || imp.ano_construccion || '';

    var compra = c.ficha.compra;
    compra.precio_publicado = compra.precio_publicado || c.S.pc || imp.precio || 0;
    compra.itp_pct = c.S.itp;
    compra.notaria_registro_pct = c.S.not;
    compra.due_diligence = c.S.dd;
    compra.honorarios_comprador_pct = c.S.hon;
    compra.financiacion = !!c.S.fin;
    compra.ltv_pct = c.S.ltv;
    compra.interes_pct = c.S.ti;
    compra.plazo_hipoteca_anos = c.S.hip;

    var reforma = c.ficha.reforma;
    reforma.presupuesto_total = c.presupuesto || reforma.presupuesto_total || 0;
    reforma.coste_m2 = c.F.rm2;
    reforma.contingencia_pct = c.F.ct;
    reforma.indirectos = c.F.ind;
    reforma.plazo_meses = c.F.pl;

    var flip = c.ficha.flip;
    flip.precio_venta_estimado = c.F.pv;
    flip.gastos_venta_pct = c.F.gv;
    flip.roi_capital = c.resultado.flip && c.resultado.flip.rc || 0;
    flip.margen_neto = c.resultado.flip && c.resultado.flip.mn || 0;
    flip.roi_anualizado = c.resultado.flip && c.resultado.flip.ra || 0;

    var btr = c.ficha.buy_to_rent;
    btr.reforma_total = c.B.ref;
    btr.contingencia_pct = c.B.ct;
    btr.renta_mensual = c.B.rnt;
    btr.vacancia_pct = c.B.vac;
    btr.ibi_anual = c.B.ibi;
    btr.comunidad_anual = c.B.com;
    btr.seguro_anual = c.B.seg;
    btr.seguro_impago = !!c.B.imp;
    btr.mantenimiento_pct_precio = c.B.mnt;
    btr.gestoria_pct_renta = c.B.ges;
    btr.rentabilidad_bruta = c.resultado.btr && c.resultado.btr.rb || 0;
    btr.rentabilidad_neta = c.resultado.btr && c.resultado.btr.rn || 0;
    btr.cash_on_cash = c.resultado.btr && c.resultado.btr.coc || 0;
    btr.cash_flow_anual = c.resultado.btr && c.resultado.btr.cf || 0;

    c.ficha.seguimiento.estado_pipeline = c.ficha.seguimiento.estado_pipeline || 'nuevo';
    c.ficha.seguimiento.notas = c.ficha.seguimiento.notas || c.notas || '';
    return c;
  }

  window.normalizeProjectCase = function(c){
    var merged = deepMerge(PROJECT_CASE_TEMPLATE, c || {});
    if (!merged.id) merged.id = uid();
    if (!merged.date) merged.date = today();
    merged.updated_at = new Date().toISOString();
    if (!merged.name) merged.name = 'Nuevo proyecto';
    if (!merged.schema_version) merged.schema_version = PROJECT_CASE_TEMPLATE.schema_version;
    return syncFichaFromLegacy(merged);
  };

  window.createProjectFromTemplate = function(overrides){
    return window.normalizeProjectCase(deepMerge(PROJECT_CASE_TEMPLATE, overrides || {}));
  };

  var oldSavePortfolio = window.savePortfolio;
  if (typeof oldSavePortfolio === 'function') {
    window.savePortfolio = function(cases){
      var list = Array.isArray(cases) ? cases.map(function(c){ return window.normalizeProjectCase(c); }) : [];
      oldSavePortfolio(list);
    };
  }

  window.newProjectFromTemplate = function(){
    var name = prompt('Nombre del nuevo proyecto:', 'Nuevo proyecto');
    if (!name) return;
    var cases = typeof window.getPortfolio === 'function' ? window.getPortfolio() : [];
    var c = window.createProjectFromTemplate({
      id: uid(),
      name: name,
      date: today(),
      status: 'nuevo',
      ficha: { seguimiento: { estado_pipeline: 'nuevo' } },
      notas: ''
    });
    cases.unshift(c);
    window.savePortfolio(cases);
    if (typeof window.loadPortfolio === 'function') window.loadPortfolio();
    alert('✓ Proyecto creado desde plantilla: "' + name + '"');
  };

  function injectTemplateButton(){
    var el = document.getElementById('pp2-content');
    if (!el || el.querySelector('#new-project-template-btn')) return;
    var header = el.querySelector('div[style*="justify-content:space-between"]');
    if (!header) return;
    var actions = header.querySelector('button') && header.querySelector('button').parentElement;
    if (!actions) return;
    var btn = document.createElement('button');
    btn.id = 'new-project-template-btn';
    btn.textContent = '+ Nuevo proyecto plantilla';
    btn.onclick = window.newProjectFromTemplate;
    btn.style.cssText = 'padding:8px 16px;border:1px solid #ba7517;border-radius:8px;background:#fffaf3;color:#ba7517;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;margin-right:8px';
    actions.insertBefore(btn, actions.firstChild);
  }

  var oldLoadPortfolio = window.loadPortfolio;
  if (typeof oldLoadPortfolio === 'function') {
    window.loadPortfolio = function(){
      var r = oldLoadPortfolio.apply(this, arguments);
      setTimeout(injectTemplateButton, 120);
      return r;
    };
  }

  // Cuando se abre la pestaña Portfolio, el botón se reinyecta tras el render.
  var oldSw = window.sw;
  if (typeof oldSw === 'function') {
    window.sw = function(pid, btn){
      var r = oldSw.apply(this, arguments);
      if (pid === 'pp2') setTimeout(injectTemplateButton, 180);
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      // Normaliza los proyectos existentes una sola vez para que todos tengan la ficha completa.
      if (typeof window.getPortfolio === 'function' && typeof window.savePortfolio === 'function') {
        var cases = window.getPortfolio();
        if (Array.isArray(cases) && cases.length) window.savePortfolio(cases);
      }
      injectTemplateButton();
    }, 300);
  });
})();
