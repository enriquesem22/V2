// state-patch.js — v2.13
// Mantiene selectedTrackingProperty dentro del estado principal al guardar/restaurar.
(function(){
  var SELECTED_KEY = 'return_selected_tracking_property';
  var STATE_KEY = 'return_state_v1';

  function parseJson(raw, fallback){
    try{return JSON.parse(raw || '');}catch(e){return fallback;}
  }

  function captureSelected(){
    return window._selectedTrackingProperty || parseJson(localStorage.getItem(SELECTED_KEY), null);
  }

  function enrichState(){
    try{
      var state = parseJson(localStorage.getItem(STATE_KEY), {});
      var selected = captureSelected();
      if(selected) state.selectedTrackingProperty = selected;
      if(window.S) state.S = Object.assign({}, window.S);
      if(window.F) state.F = Object.assign({}, window.F);
      if(window.B) state.B = Object.assign({}, window.B);
      if(window.SEL) state.SEL = Object.assign({}, window.SEL);
      state.savedAt = new Date().toISOString();
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }catch(e){}
  }

  function restoreSelected(){
    try{
      var state = parseJson(localStorage.getItem(STATE_KEY), {});
      if(state && state.selectedTrackingProperty){
        window._selectedTrackingProperty = state.selectedTrackingProperty;
        localStorage.setItem(SELECTED_KEY, JSON.stringify(state.selectedTrackingProperty));
      }
    }catch(e){}
  }

  function patchAutoSave(){
    if(window.autoSave && !window.autoSave.__statePatchV213){
      var oldAutoSave = window.autoSave;
      window.autoSave = function(){
        if(oldAutoSave) oldAutoSave();
        enrichState();
      };
      window.autoSave.__statePatchV213 = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    restoreSelected();
    patchAutoSave();
    setTimeout(patchAutoSave, 500);
  });

  window.captureReturnStateV213 = enrichState;
})();
