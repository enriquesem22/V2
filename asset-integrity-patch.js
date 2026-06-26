// asset-integrity-patch.js — evita duplicados al editar assets del Dashboard
// v2.33: edición siempre actualiza el asset existente + deduplicación por id/url/ref/datos clave.
(function(){
  'use strict';

  window.RETURN_ASSET_INTEGRITY_PATCH_VERSION = '2.33';

  function isVal(v){ return v !== null && v !== undefined && String(v).trim() !== ''; }
  function norm(v){ return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function normUrl(u){
    u = String(u || '').trim().toLowerCase();
    if (!u) return '';
    u = u.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
    return u;
  }
  function normNum(v){ var n = parseFloat(v); return isFinite(n) ? Math.round(n) : ''; }
  function assetKeys(a){
    a = a || {};
    var keys = [];
    if (isVal(a.id)) keys.push('id:' + String(a.id));
    if (isVal(a.url)) keys.push('url:' + normUrl(a.url));
    if (isVal(a.ref_code)) keys.push('ref:' + norm(a.source || '') + ':' + norm(a.ref_code));
    var titleKey = [norm(a.title || a.address), norm(a.city), normNum(a.price), normNum(a.surface)].join('|');
    if (titleKey.replace(/\|/g, '')) keys.push('sig:' + titleKey);
    return keys.filter(function(k){ return k && !/:$/.test(k); });
  }
  function scoreAsset(a){
    if (!a) return 0;
    var s = 0;
    Object.keys(a).forEach(function(k){ if (isVal(a[k])) s++; });
    if (Array.isArray(a.foto_urls)) s += Math.min(a.foto_urls.length, 8);
    if (a.foto_portada) s += 2;
    if (a.notes) s += 1;
    s += new Date(a.lastUpdated || a.createdAt || 0).getTime() / 10000000000000;
    return s;
  }
  function mergeAssets(base, extra){
    base = Object.assign({}, base || {});
    extra = extra || {};
    Object.keys(extra).forEach(function(k){
      var v = extra[k];
      if (Array.isArray(v)) {
        var old = Array.isArray(base[k]) ? base[k] : [];
        var seen = {};
        base[k] = old.concat(v).filter(function(x){ var key = String(x); if (seen[key]) return false; seen[key] = true; return true; });
      } else if (isVal(v) || typeof v === 'boolean') {
        base[k] = v;
      }
    });
    return base;
  }
  function canonicalizeAssets(list){
    list = Array.isArray(list) ? list.filter(Boolean) : [];
    var out = [];
    var keyToIndex = {};

    list.forEach(function(raw){
      var a = Object.assign({}, raw);
      if (!isVal(a.id)) a.id = 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      var keys = assetKeys(a);
      var idx = -1;
      for (var i = 0; i < keys.length; i++) {
        if (keyToIndex[keys[i]] !== undefined) { idx = keyToIndex[keys[i]]; break; }
      }

      if (idx === -1) {
        idx = out.length;
        out.push(a);
      } else {
        var existing = out[idx];
        var preferred = scoreAsset(a) >= scoreAsset(existing) ? a : existing;
        var secondary = preferred === a ? existing : a;
        var merged = mergeAssets(secondary, preferred);
        merged.id = existing.id || a.id; // mantener id canónico para no crear ruta nueva
        merged.createdAt = existing.createdAt || a.createdAt || merged.createdAt;
        merged.lastUpdated = preferred.lastUpdated || a.lastUpdated || existing.lastUpdated || merged.lastUpdated;
        out[idx] = merged;
      }

      assetKeys(out[idx]).forEach(function(k){ keyToIndex[k] = idx; });
    });

    return out.sort(function(a,b){ return new Date(b.createdAt || b.lastUpdated || 0) - new Date(a.createdAt || a.lastUpdated || 0); });
  }

  window.canonicalizeDashboardAssets = canonicalizeAssets;

  var oldSaveDashboardAssets = window.saveDashboardAssets;
  if (typeof oldSaveDashboardAssets === 'function') {
    window.saveDashboardAssets = function(assets){
      oldSaveDashboardAssets(canonicalizeAssets(assets));
    };
  }

  var oldGithubLoad = window.githubLoadDashboardAssets;
  if (typeof oldGithubLoad === 'function') {
    window.githubLoadDashboardAssets = async function(){
      var assets = await oldGithubLoad.apply(this, arguments);
      if (!Array.isArray(assets)) return assets;
      return canonicalizeAssets(assets);
    };
  }

  var oldGithubSave = window.githubSaveDashboardAsset;
  if (typeof oldGithubSave === 'function') {
    window.githubSaveDashboardAsset = async function(asset){
      if (!asset) return { ok:false, reason:'asset vacío' };
      var current = [];
      try {
        if (typeof oldGithubLoad === 'function') {
          var loaded = await oldGithubLoad();
          if (Array.isArray(loaded)) current = loaded;
        }
      } catch(e) {}

      var beforeIds = current.map(function(a){ return a && a.id; }).filter(Boolean);
      var mergedList = canonicalizeAssets(current.concat([asset]));
      var saved = mergedList.find(function(a){
        return a.id === asset.id || assetKeys(a).some(function(k){ return assetKeys(asset).indexOf(k) >= 0; });
      }) || asset;

      var result = await oldGithubSave(saved);
      if (!result || !result.ok) return result;

      // Limpia duplicados remotos que ya existían por el bug anterior.
      if (typeof window.githubDeleteDashboardAsset === 'function') {
        var keepId = saved.id;
        var duplicateIds = beforeIds.filter(function(id){
          if (!id || id === keepId) return false;
          var old = current.find(function(a){ return a.id === id; });
          if (!old) return false;
          return assetKeys(old).some(function(k){ return assetKeys(saved).indexOf(k) >= 0; });
        });
        for (var i = 0; i < duplicateIds.length; i++) {
          try { await window.githubDeleteDashboardAsset(duplicateIds[i]); } catch(e2) {}
        }
      }

      return { ok:true, asset:saved };
    };
  }

  // Evita la ruta problemática: editar desde dashboard/mapa abre la ficha y usa edición inline con el id existente.
  var oldOpenEditAsset = window.openEditAsset;
  window.openEditAsset = function(id){
    var assets = typeof window.getDashboardAssets === 'function' ? window.getDashboardAssets() : [];
    assets = canonicalizeAssets(assets);
    if (typeof window.saveDashboardAssets === 'function') window.saveDashboardAssets(assets);
    var asset = assets.find(function(a){ return a.id === id; });
    if (!asset) {
      if (typeof oldOpenEditAsset === 'function') return oldOpenEditAsset(id);
      return;
    }
    if (typeof window.openAssetDetail === 'function') {
      window.openAssetDetail(asset.id);
      setTimeout(function(){
        if (typeof window.renderAssetEditInline === 'function') window.renderAssetEditInline(asset);
      }, 120);
      return;
    }
    if (typeof oldOpenEditAsset === 'function') return oldOpenEditAsset(id);
  };

  // Re-deduplica al entrar/renderizar dashboard para que los duplicados antiguos no vuelvan a verse.
  var oldLoadDashboard = window.loadDashboard;
  if (typeof oldLoadDashboard === 'function') {
    window.loadDashboard = function(){
      if (typeof window.getDashboardAssets === 'function' && typeof window.saveDashboardAssets === 'function') {
        window.saveDashboardAssets(window.getDashboardAssets());
      }
      return oldLoadDashboard.apply(this, arguments);
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      if (typeof window.getDashboardAssets === 'function' && typeof window.saveDashboardAssets === 'function') {
        window.saveDashboardAssets(window.getDashboardAssets());
      }
    }, 500);
  });
})();
