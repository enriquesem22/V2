// tracking-hotfix-v214.js
// Hotfix: define helpers that tracking.js expects after v2.13 refactor.
(function(){
  if (!window.decisionLabel) {
    window.decisionLabel = function(value){
      return String(value || 'por_verificar').replace(/_/g, ' ');
    };
  }
})();
