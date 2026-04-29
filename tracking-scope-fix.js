// tracking-scope-fix.js
// Evita que la UI de Tracking se renderice fuera de su pestaña.

(function () {
  function getTrackingPanel() {
    return document.getElementById('tp');
  }

  function getTrackingRoot() {
    return document.getElementById('tp-content');
  }

  function isTrackingActive() {
    var panel = getTrackingPanel();
    return !!(panel && panel.classList.contains('active'));
  }

  function cleanTrackingOutsidePanel() {
    var panel = getTrackingPanel();
    if (!panel) return;

    document.querySelectorAll('#tracking-status, #tracking-source-select').forEach(function (el) {
      if (panel.contains(el)) return;

      var container = el.closest('.sec, .tracking-wrap, table, div');
      if (container && !panel.contains(container)) {
        container.remove();
      } else {
        el.remove();
      }
    });
  }

  function clearTrackingIfInactive() {
    var root = getTrackingRoot();
    if (root && !isTrackingActive()) root.innerHTML = '';
    cleanTrackingOutsidePanel();
  }

  if (typeof window.renderTracking === 'function') {
    var originalRenderTracking = window.renderTracking;

    window.renderTracking = function (el) {
      var root = getTrackingRoot();
      if (!root) return;

      if (el && el !== root) return;

      if (!isTrackingActive()) {
        root.innerHTML = '';
        cleanTrackingOutsidePanel();
        return;
      }

      originalRenderTracking(root);
      cleanTrackingOutsidePanel();
    };
  }

  window.loadTracking = function () {
    var root = getTrackingRoot();
    if (!root) return;

    if (!isTrackingActive()) {
      root.innerHTML = '';
      cleanTrackingOutsidePanel();
      return;
    }

    if (typeof window.renderTracking === 'function') {
      window.renderTracking(root);
    }
  };

  if (typeof window.sw === 'function') {
    var originalSw = window.sw;

    window.sw = function (id, btn) {
      originalSw(id, btn);

      if (id !== 'tp') {
        var root = getTrackingRoot();
        if (root) root.innerHTML = '';
      }

      cleanTrackingOutsidePanel();
    };
  }

  document.addEventListener('DOMContentLoaded', clearTrackingIfInactive);
})();
