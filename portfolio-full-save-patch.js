// portfolio-full-save-patch.js
// Guarda una foto completa del estado de la app dentro de cada caso del Portfolio.

(function(){
  function cloneSafe(value){
    try { return JSON.parse(JSON.stringify(value)); }
    catch(e) { return null; }
  }

  function readJSON(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) {
      return fallback;
    }
  }

  function captureLocalStorage(){
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        if (/key|token|secret|password/i.test(key)) continue;
        out[key] = localStorage.getItem(key);
      }
    } catch(e) {}
    return out;
  }

  window.captureFullAppSnapshot = function(){
    if (typeof window.autoSave === 'function') {
      try { window.autoSave(); } catch(e) {}
    }

    return {
      schema: 'return_full_snapshot_v1',
      capturedAt: new Date().toISOString(),
      appVersion: '2.18',
      state: {
        S: cloneSafe(window.S || {}),
        F: cloneSafe(window.F || {}),
        B: cloneSafe(window.B || {}),
        SEL: cloneSafe(window.SEL || {}),
        CATS: cloneSafe(window.CATS || []),
        OS: typeof OS !== 'undefined' ? cloneSafe(OS) : null,
        presupuestoTotal: window._presupuestoTotal || null,
        lastImport: cloneSafe(window._lastImport || null),
        selectedTrackingProperty: cloneSafe(window._selectedTrackingProperty || readJSON('return_selected_tracking_property', null)),
        trackingArea: window._trackingArea || null,
        trackingFilters: cloneSafe(window._trackingFilters || readJSON('return_tracking_filters_v1', null)),
        watchlist: readJSON('return_watchlist_v1', []),
        prefs: readJSON('return_prefs_v1', null),
        savedState: readJSON('return_state_v1', null)
      },
      localStorage: captureLocalStorage()
    };
  };

  function enrichCase(caso){
    if (!caso || typeof caso !== 'object') return caso;
    var snap = window.captureFullAppSnapshot ? window.captureFullAppSnapshot() : null;
    caso.fullSnapshot = snap;
    caso.rawState = snap ? snap.state : null;
    caso.localStorageSnapshot = snap ? snap.localStorage : null;
    caso.savedEverything = true;
    caso.savedEverythingAt = new Date().toISOString();
    return caso;
  }

  var originalSavePortfolio = window.savePortfolio || (typeof savePortfolio === 'function' ? savePortfolio : null);
  if (originalSavePortfolio && !window._savePortfolioFullPatched) {
    window._savePortfolioFullPatched = true;
    window.savePortfolio = function(cases){
      if (Array.isArray(cases) && cases.length) {
        cases = cases.map(function(c, idx){
          return idx === 0 && !c.savedEverything ? enrichCase(c) : c;
        });
      }
      return originalSavePortfolio(cases);
    };
    try { savePortfolio = window.savePortfolio; } catch(e) {}
  }

  var originalLoadCase = window.loadCase;
  if (typeof originalLoadCase === 'function' && !window._loadCaseFullPatched) {
    window._loadCaseFullPatched = true;
    window.loadCase = function(i){
      var cases = typeof getPortfolio === 'function' ? getPortfolio() : [];
      var c = cases && cases[i];
      var snap = c && (c.fullSnapshot || null);
      if (!snap || !snap.state) return originalLoadCase(i);

      if(!confirm('Cargar "'+c.name+'"? Reemplaza absolutamente todos los datos actuales guardados en la app.')) return;

      try {
        var st = snap.state;
        if (st.S) Object.assign(window.S, st.S);
        if (st.F) Object.assign(window.F, st.F);
        if (st.B) Object.assign(window.B, st.B);
        if (st.SEL) Object.assign(window.SEL, st.SEL);
        if (st.CATS) window.CATS = cloneSafe(st.CATS);
        if (st.presupuestoTotal !== undefined) window._presupuestoTotal = st.presupuestoTotal;
        if (st.lastImport !== undefined) window._lastImport = cloneSafe(st.lastImport);
        if (st.selectedTrackingProperty !== undefined) window._selectedTrackingProperty = cloneSafe(st.selectedTrackingProperty);
        if (st.trackingArea !== undefined) window._trackingArea = st.trackingArea;
        if (st.trackingFilters !== undefined) window._trackingFilters = cloneSafe(st.trackingFilters);

        if (snap.localStorage) {
          Object.keys(snap.localStorage).forEach(function(k){
            if (k === 'return_portfolio_v1') return;
            if (/key|token|secret|password/i.test(k)) return;
            try { localStorage.setItem(k, snap.localStorage[k]); } catch(e) {}
          });
        }

        if (st.savedState) localStorage.setItem('return_state_v1', JSON.stringify(st.savedState));
        if (st.watchlist) localStorage.setItem('return_watchlist_v1', JSON.stringify(st.watchlist));
        if (st.prefs) localStorage.setItem('return_prefs_v1', JSON.stringify(st.prefs));
        if (st.trackingFilters) localStorage.setItem('return_tracking_filters_v1', JSON.stringify(st.trackingFilters));
        if (st.selectedTrackingProperty) localStorage.setItem('return_selected_tracking_property', JSON.stringify(st.selectedTrackingProperty));

        ['rSI','rSR','rPresupuesto','rFI','rFR','rBI','rBR'].forEach(function(fn){
          if (typeof window[fn] === 'function') {
            try { window[fn](); } catch(e) {}
          }
        });
        setTimeout(function(){
          if (window.rebuildSelects) window.rebuildSelects();
          if (window.doMapUpdate) window.doMapUpdate();
        },250);
        if (typeof swTab === 'function') swTab('ap');
        alert('Cargado completo: "'+c.name+'"');
      } catch(e) {
        alert('Error cargando el snapshot completo: '+e.message);
        originalLoadCase(i);
      }
    };
  }
})();
