// tracking-apply.js — v2.12
// Añade botón "Usar" a cada inmueble del tracking y aplica sus datos al estudio.
(function(){
  function safeNumber(v){
    if(v===null || v===undefined || v==='') return null;
    var n=Number(String(v).replace(/[^0-9.,-]/g,'').replace(',','.'));
    return isFinite(n) ? n : null;
  }

  function getItems(){
    if(typeof getNormalizedWatchlist==='function') return getNormalizedWatchlist();
    try{return JSON.parse(localStorage.getItem('return_watchlist_v1')||'[]');}catch(e){return[];}
  }

  function getItem(id){
    return getItems().find(function(p){return p.id===id;});
  }

  function conditionText(p){
    return String((p && p.condition) || '').toLowerCase();
  }

  function estimateReformM2(p){
    var c=conditionText(p);
    if(p && p.reformCostM2) return safeNumber(p.reformCostM2) || 350;
    if(/integral|para_reformar|sin_posesion|mal_estado/.test(c)) return 500;
    if(/reformado|buen_estado/.test(c)) return 180;
    if(/segunda_mano/.test(c)) return 300;
    return 350;
  }

  function estimateRent(p){
    var direct=safeNumber(p.rentCurrentMonthly || p.rentEstimatedMonthly || p.marketRentMonthly);
    if(direct) return Math.round(direct);
    var sup=safeNumber(p.surfaceM2);
    if(!sup) return null;
    var key=p.marketKey || '';
    var rate=9;
    if(key==='macarena') rate=9.5;
    if(key==='sanjuan') rate=8.5;
    if(key==='manresa') rate=9.5;
    return Math.round(sup*rate);
  }

  function estimateFlipSale(p){
    var direct=safeNumber(p.targetSalePrice || p.estimatedSalePrice || p.arv || p.afterRepairValue);
    if(direct) return Math.round(direct);
    var price=safeNumber(p.price);
    var sup=safeNumber(p.surfaceM2);
    if(!price && !sup) return null;
    var key=p.marketKey || '';
    var benchmarkM2=1500;
    if(key==='macarena') benchmarkM2=1700;
    if(key==='sanjuan') benchmarkM2=1450;
    if(key==='manresa') benchmarkM2=1550;
    if(sup){
      var byM2=Math.round((benchmarkM2*sup)/1000)*1000;
      if(price) return Math.max(byM2, Math.round(price*1.2/1000)*1000);
      return byM2;
    }
    return Math.round(price*1.25/1000)*1000;
  }

  function refreshStudy(){
    ['rSI','rSR','rFI','rFR','rBI','rBR'].forEach(function(fn){
      if(typeof window[fn]==='function'){
        try{window[fn]();}catch(e){console.warn(fn,e);}
      }
    });
    if(typeof rPreciosMercado==='function'){
      try{rPreciosMercado();}catch(e){}
    }
  }

  function goToActivo(){
    try{
      var btn=document.querySelector('.tab[data-tab="ap"]');
      if(typeof sw==='function') sw('ap',btn);
      else if(btn) btn.click();
    }catch(e){}
  }

  window.applyTrackingToStudy=function(id){
    var p=getItem(id);
    if(!p){alert('No encuentro este inmueble en el tracking. Prueba a reiniciar base.');return;}

    var price=safeNumber(p.price);
    var sup=safeNumber(p.surfaceM2);
    var reformM2=estimateReformM2(p);
    var rent=estimateRent(p);
    var sale=estimateFlipSale(p);

    if(window.S){
      if(price) window.S.pc=Math.round(price);
      if(typeof S!=='undefined') S=window.S;
    }
    if(window.F){
      if(sup) window.F.sup=Math.round(sup);
      if(reformM2) window.F.rm2=Math.round(reformM2);
      if(sale) window.F.pv=Math.round(sale);
      if(typeof F!=='undefined') F=window.F;
    }
    if(window.B){
      if(sup && reformM2) window.B.ref=Math.round(sup*reformM2);
      if(rent) window.B.rnt=Math.round(rent);
      if(typeof B!=='undefined') B=window.B;
    }

    window._selectedTrackingProperty={
      id:p.id,
      title:p.title || p.street || '',
      street:p.street || p.address || p.title || '',
      marketKey:p.marketKey || '',
      portal:p.portal || p.source || '',
      price:price,
      surfaceM2:sup,
      rentMonthly:rent,
      estimatedFlipSale:sale,
      appliedAt:new Date().toISOString()
    };

    try{localStorage.setItem('return_selected_tracking_property', JSON.stringify(window._selectedTrackingProperty));}catch(e){}
    refreshStudy();

    var status=document.getElementById('tracking-status');
    if(status){
      status.textContent='✓ Aplicado al estudio: '+(p.street || p.title || p.id)+' · compra '+(price?Math.round(price).toLocaleString('es-ES')+' €':'—')+' · sup. '+(sup||'—')+' m² · renta '+(rent?rent.toLocaleString('es-ES')+' €/mes':'—');
      status.style.color='#16a34a';
    }
    goToActivo();
  };

  function addApplyButtons(){
    var root=document.getElementById('tp-content');
    if(!root) return;
    var buttons=root.querySelectorAll('button[onclick^="addTrackingSnapshot"]');
    buttons.forEach(function(btn){
      var parent=btn.parentElement;
      if(!parent || parent.querySelector('.tracking-apply-btn')) return;
      var onclick=btn.getAttribute('onclick')||'';
      var m=onclick.match(/'([^']+)'/);
      if(!m) return;
      var id=m[1];
      var use=document.createElement('button');
      use.className='tracking-apply-btn';
      use.textContent='Usar';
      use.title='Aplicar este inmueble a Activo, Flip y Buy to rent';
      use.style.cssText='padding:5px 8px;border:1px solid #16a34a;border-radius:6px;background:#f0fdf4;color:#15803d;cursor:pointer;font-weight:600;margin-right:2px';
      use.onclick=function(){window.applyTrackingToStudy(id);};
      parent.insertBefore(use, btn);
    });
  }

  function wrapRender(){
    if(typeof window.renderTracking==='function' && !window.renderTracking.__applyWrapped){
      var original=window.renderTracking;
      window.renderTracking=function(el){
        original(el);
        addApplyButtons();
      };
      window.renderTracking.__applyWrapped=true;
    }
    if(typeof window.loadTracking==='function' && !window.loadTracking.__applyWrapped){
      var oldLoad=window.loadTracking;
      window.loadTracking=function(){
        oldLoad();
        setTimeout(addApplyButtons,0);
      };
      window.loadTracking.__applyWrapped=true;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){wrapRender();addApplyButtons();});
  }else{
    wrapRender();addApplyButtons();
  }
})();
