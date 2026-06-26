// ai-chat.js — Chat flotante IA + auto-relleno de activos
// v1.0: Chat con OpenAI/Groq/Gemini/Claude, relleno de formulario desde URL

(function() {

// ── CONFIG ────────────────────────────────────────────────────────────────────

function loadAICfg() {
  try { return JSON.parse(localStorage.getItem('return_config_v1') || '{}'); } catch(e) { return {}; }
}

function getProviderAndKey() {
  var cfg = loadAICfg();
  var order = ['openai', 'groq', 'google', 'anthropic'];
  var keyMap = { openai: 'openaiKey', groq: 'groqKey', google: 'googKey', anthropic: 'anthKey' };
  var preferred = cfg.provider || 'groq';
  if (cfg[keyMap[preferred]]) return { provider: preferred, key: cfg[keyMap[preferred]] };
  for (var i = 0; i < order.length; i++) {
    if (cfg[keyMap[order[i]]]) return { provider: order[i], key: cfg[keyMap[order[i]]] };
  }
  return null;
}

function providerName(p) {
  return { openai: 'ChatGPT', groq: 'Groq', google: 'Gemini', anthropic: 'Claude' }[p] || p;
}

// ── API CALLS ─────────────────────────────────────────────────────────────────

async function callAI(messages, maxTokens) {
  var pk = getProviderAndKey();
  if (!pk) throw new Error('Sin API key. Configúrala en la pestaña Importar → Configuración IA.');
  var p = pk.provider, key = pk.key;
  maxTokens = maxTokens || 800;

  if (p === 'openai') {
    var r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: messages, max_tokens: maxTokens, temperature: 0.3 })
    });
    if (!r.ok) { var e = await r.json(); throw new Error(e.error?.message || 'Error OpenAI ' + r.status); }
    return { text: (await r.json()).choices?.[0]?.message?.content || '', provider: p };
  }

  if (p === 'groq') {
    var r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: messages, max_tokens: maxTokens, temperature: 0.3 })
    });
    if (!r2.ok) { var e2 = await r2.json(); throw new Error(e2.error?.message || 'Error Groq ' + r2.status); }
    return { text: (await r2.json()).choices?.[0]?.message?.content || '', provider: p };
  }

  if (p === 'google') {
    var parts = messages.map(function(m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; });
    var r3 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + key, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: parts })
    });
    if (!r3.ok) { var e3 = await r3.json(); throw new Error(e3.error?.message || 'Error Gemini ' + r3.status); }
    return { text: (await r3.json()).candidates?.[0]?.content?.parts?.[0]?.text || '', provider: p };
  }

  if (p === 'anthropic') {
    var sys = messages.find(function(m) { return m.role === 'system'; });
    var rest = messages.filter(function(m) { return m.role !== 'system'; });
    var r4 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, system: sys ? sys.content : undefined, messages: rest })
    });
    if (!r4.ok) { var e4 = await r4.json(); throw new Error(e4.error?.message || 'Error Claude ' + r4.status); }
    return { text: (await r4.json()).content?.[0]?.text || '', provider: p };
  }

  throw new Error('Proveedor desconocido: ' + p);
}

// ── PAGE READER (Jina + fallbacks) ───────────────────────────────────────────

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tryFetch(label, fetchFn, onStatus, minLen) {
  minLen = minLen || 300;
  try {
    onStatus('Leyendo (' + label + ')...', '#d97706');
    var result = await fetchFn();
    if (result && result.length >= minLen) return result;
    console.log(label + ': contenido muy corto (' + (result ? result.length : 0) + ' chars)');
  } catch(e) {
    console.log(label + ' error:', e.name === 'AbortError' ? 'timeout' : e.message);
  }
  return null;
}

function abortAfter(ms) {
  var c = new AbortController();
  setTimeout(function() { c.abort(); }, ms);
  return c;
}

window.readPageForFill = async function(url, onStatus) {
  onStatus = onStatus || function() {};
  var text = null;

  // 1. Jina AI — GET simple sin headers custom (evita CORS preflight)
  text = await tryFetch('Jina', async function() {
    var c = abortAfter(16000);
    var r = await fetch('https://r.jina.ai/' + url, { signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.text()).replace(/\n{3,}/g, '\n\n').trim().substring(0, 8000);
  }, onStatus);

  // 2. Jina a través de allorigins (meta-proxy: evita CORS del navegador)
  if (!text) {
    text = await tryFetch('Jina+proxy', async function() {
      var jinaUrl = 'https://r.jina.ai/' + url;
      var c = abortAfter(18000);
      var r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(jinaUrl), { signal: c.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var t = (await r.text()).trim();
      // allorigins puede devolver HTML de error si Jina falla
      if (t.startsWith('<')) throw new Error('respuesta HTML, no markdown');
      return t.substring(0, 8000);
    }, onStatus);
  }

  // 3. allorigins directo (HTML del anuncio)
  if (!text) {
    text = await tryFetch('allorigins', async function() {
      var c = abortAfter(12000);
      var r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url), { signal: c.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      return cleanHtml(d.contents || '').substring(0, 8000);
    }, onStatus);
  }

  // 4. corsproxy.io directo
  if (!text) {
    text = await tryFetch('corsproxy', async function() {
      var c = abortAfter(12000);
      var r = await fetch('https://corsproxy.io/?' + encodeURIComponent(url), { signal: c.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return cleanHtml(await r.text()).substring(0, 8000);
    }, onStatus);
  }

  // 5. htmlreader.vercel.app — proxy alternativo
  if (!text) {
    text = await tryFetch('htmlreader', async function() {
      var c = abortAfter(12000);
      var r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://r.jina.ai/' + encodeURIComponent(url)), { signal: c.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var t = (await r.text()).trim();
      if (t.startsWith('<')) throw new Error('HTML en lugar de texto');
      return t.substring(0, 8000);
    }, onStatus);
  }

  return text || '';
};

// ── FILL ASSET FROM TEXT (AI extraction) ──────────────────────────────────────

var FILL_PROMPT =
  'Eres un analista inmobiliario especializado en inversión residencial en España.\n\n' +
  'Extrae los datos del siguiente anuncio inmobiliario. Devuelve SOLO JSON válido, sin texto adicional, sin markdown, sin backticks.\n\n' +
  'Reglas ESTRICTAS:\n' +
  '1. NO inventes datos. Solo extrae lo que aparezca explícitamente en el texto.\n' +
  '2. Si un dato no aparece, usa null (o [] para listas).\n' +
  '3. Los campos de análisis (description_summary, positive_points, risks_or_unknowns, missing_data) SÍ los puedes inferir a partir de lo que lees.\n\n' +
  'Devuelve exactamente este JSON:\n' +
  '{\n' +
  '  "price": null,\n' +
  '  "title": null,\n' +
  '  "address_or_area": null,\n' +
  '  "municipality": null,\n' +
  '  "province": null,\n' +
  '  "neighborhood": null,\n' +
  '  "built_area_m2": null,\n' +
  '  "useful_area_m2": null,\n' +
  '  "bedrooms": null,\n' +
  '  "bathrooms": null,\n' +
  '  "floor": null,\n' +
  '  "has_elevator": null,\n' +
  '  "condition": null,\n' +
  '  "source": null,\n' +
  '  "lat": null,\n' +
  '  "lng": null,\n' +
  '  "energy_certificate": {"consumption": null, "emissions": null},\n' +
  '  "advertiser": null,\n' +
  '  "listing_reference": null,\n' +
  '  "last_updated": null,\n' +
  '  "description_summary": null,\n' +
  '  "positive_points": [],\n' +
  '  "risks_or_unknowns": [],\n' +
  '  "missing_data": []\n' +
  '}\n\n' +
  'Definiciones:\n' +
  '- price: número entero en euros (sin puntos ni €)\n' +
  '- title: dirección exacta (ej: "Calle Mayor 12, 3B") si aparece, o null\n' +
  '- address_or_area: dirección o zona/barrio del anuncio\n' +
  '- municipality: municipio o ciudad (ej: "Sevilla", "L\'Hospitalet de Llobregat")\n' +
  '- built_area_m2: m² construidos, entero\n' +
  '- useful_area_m2: m² útiles, entero (si aparece)\n' +
  '- bedrooms: número de habitaciones, entero\n' +
  '- bathrooms: número de baños, entero\n' +
  '- floor: planta (ej: "2", "Bajo", "Ático")\n' +
  '- has_elevator: true | false | null\n' +
  '- condition: "a_reformar" si está para reformar/mal estado | "segunda_mano" sin indicar estado | "buen_estado" si buen estado | "reformado" si ya reformado | "obra_nueva" si nueva construcción\n' +
  '- source: "Idealista" | "Solvia" | "Habitaclia" | "Fotocasa" | "Milanuncios" | "Otra" según el portal\n' +
  '- lat/lng: coordenadas numéricas solo si aparecen explícitamente\n' +
  '- energy_certificate: extraer consumo (kWh/m²·año) y emisiones (kgCO₂/m²·año) si aparecen\n' +
  '- advertiser: nombre de la agencia o particular que anuncia\n' +
  '- listing_reference: código de referencia del anuncio\n' +
  '- last_updated: fecha de actualización del anuncio (formato YYYY-MM-DD si posible)\n' +
  '- description_summary: resumen de 2-3 frases del anuncio en español\n' +
  '- positive_points: máximo 5 puntos positivos del inmueble\n' +
  '- risks_or_unknowns: máximo 5 riesgos, dudas o aspectos negativos que detectes\n' +
  '- missing_data: datos relevantes para un inversor que NO aparecen en el anuncio\n\n' +
  'TEXTO DEL ANUNCIO:\n';

window.analyzeTextForAsset = async function(text, onStatus) {
  onStatus = onStatus || function() {};
  var pk = getProviderAndKey();
  if (!pk) throw new Error('Sin API key. Configúrala en la pestaña Importar → Configuración IA.');

  onStatus('Analizando con ' + providerName(pk.provider) + '...', '#d97706');

  var result = await callAI([
    { role: 'user', content: FILL_PROMPT + text.substring(0, 6000) }
  ], 800);

  // Strip any markdown code fences
  var cleaned = result.text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  var m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió JSON válido. Respuesta: ' + result.text.substring(0, 80));
  var data = JSON.parse(m[0]);

  // Check if any meaningful field was extracted (ignore always-present empty arrays/objects)
  var coreFields = ['price', 'title', 'address_or_area', 'municipality', 'built_area_m2', 'bedrooms', 'condition'];
  var filled = coreFields.filter(function(k) { return data[k] !== null && data[k] !== undefined; });
  if (!filled.length) throw new Error('La IA no encontró datos en el texto. El contenido leído puede no ser un anuncio inmobiliario.');

  return data;
};

window.fillAssetWithAI = async function(url, onStatus) {
  onStatus = onStatus || function() {};
  var text = await window.readPageForFill(url, onStatus);
  if (!text) {
    throw new Error(
      'Idealista y Solvia bloquean lectores automáticos. ' +
      'Usa la opción "Pegar texto": abre el anuncio, selecciona todo (Ctrl+A), copia (Ctrl+C) y pégalo en el área de texto.'
    );
  }
  onStatus('Leídos ' + text.length + ' caracteres. Analizando...', '#d97706');
  return window.analyzeTextForAsset(text, onStatus);
};

// ── CHAT ──────────────────────────────────────────────────────────────────────

var _chatHistory = [];
var _chatOpen = false;

function assetContext() {
  if (typeof window.getDashboardAssets !== 'function') return '';
  try {
    var assets = window.getDashboardAssets ? window.getDashboardAssets() : [];
    if (!assets.length) return 'El usuario aún no tiene activos en seguimiento.';
    var stageCount = {};
    assets.forEach(function(a) { stageCount[a.stage] = (stageCount[a.stage] || 0) + 1; });
    var summary = Object.keys(stageCount).map(function(s) { return stageCount[s] + ' ' + s.replace(/_/g, ' '); }).join(', ');
    var topAssets = assets.slice(0, 5).map(function(a) {
      return (a.title || 'Sin título') + (a.price ? ' (' + Math.round(a.price / 1000) + 'k€)' : '') + ' [' + (a.stage || 'nuevo') + ']';
    }).join('; ');
    return 'El usuario tiene ' + assets.length + ' activos: ' + summary + '. Principales: ' + topAssets + '.';
  } catch(e) { return ''; }
}

function systemPrompt() {
  return 'Eres un asesor experto en inversión inmobiliaria en España. ' +
    'Ayudas a evaluar activos, calcular rentabilidades (flip, buy-to-rent), entender el mercado y gestionar el pipeline de inversión. ' +
    assetContext() + ' ' +
    'Responde siempre en español. Sé conciso, directo y práctico. Usa números cuando sea útil.';
}

function escChat(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatMsg(text) {
  return escChat(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-family:\'Courier New\',monospace;font-size:11px">$1</code>')
    .replace(/\n/g, '<br>');
}

function renderChatMessages() {
  var el = document.getElementById('ai-chat-msgs');
  if (!el) return;
  if (!_chatHistory.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px 12px;color:#aaa">' +
      '<div style="font-size:28px;margin-bottom:8px">💬</div>' +
      '<div style="font-size:12px;line-height:1.6">Pregúntame sobre rentabilidades, mercados, cómo evaluar activos, estrategias flip o buy-to-rent...</div>' +
      '</div>';
    return;
  }
  el.innerHTML = _chatHistory.map(function(m) {
    var isUser = m.role === 'user';
    return '<div style="display:flex;justify-content:' + (isUser ? 'flex-end' : 'flex-start') + ';margin-bottom:10px">' +
      '<div style="max-width:82%;padding:9px 12px;border-radius:' + (isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';background:' + (isUser ? '#ba7517' : '#f4f4f0') + ';color:' + (isUser ? '#fff' : '#1a1a1a') + ';font-size:12px;line-height:1.55">' +
      formatMsg(m.content) +
      '</div></div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function setChatStatus(text, color) {
  var el = document.getElementById('ai-chat-status');
  if (el) { el.textContent = text || ''; el.style.color = color || '#aaa'; }
}

window.sendAIMessage = async function() {
  var inp = document.getElementById('ai-chat-input');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;

  var pk = getProviderAndKey();
  if (!pk) {
    setChatStatus('Sin API key. Ve a Importar → Configuración IA.', '#dc2626');
    return;
  }

  inp.value = '';
  inp.style.height = 'auto';
  _chatHistory.push({ role: 'user', content: text });
  renderChatMessages();
  setChatStatus('Escribiendo...', '#aaa');

  var sendBtn = document.getElementById('ai-chat-send');
  if (sendBtn) sendBtn.disabled = true;

  try {
    var msgs = [{ role: 'system', content: systemPrompt() }].concat(
      _chatHistory.slice(-10).map(function(m) { return { role: m.role, content: m.content }; })
    );
    var result = await callAI(msgs, 900);
    _chatHistory.push({ role: 'assistant', content: result.text });
    renderChatMessages();
    setChatStatus('', '');
  } catch(e) {
    setChatStatus('Error: ' + e.message, '#dc2626');
    _chatHistory.pop();
    renderChatMessages();
  }

  if (sendBtn) sendBtn.disabled = false;
  if (inp) inp.focus();
};

window.clearAIChat = function() {
  _chatHistory = [];
  renderChatMessages();
  setChatStatus('', '');
};

window.toggleAIChat = function() {
  _chatOpen = !_chatOpen;
  var panel = document.getElementById('ai-chat-panel');
  var btn = document.getElementById('ai-chat-toggle-btn');
  if (panel) {
    panel.style.display = _chatOpen ? 'flex' : 'none';
    if (_chatOpen) {
      renderChatMessages();
      var inp = document.getElementById('ai-chat-input');
      if (inp) setTimeout(function() { inp.focus(); }, 100);
    }
  }
  if (btn) btn.innerHTML = _chatOpen ? '✕' : '💬';
};

function buildChatUI() {
  if (document.getElementById('ai-chat-panel')) return;

  var pk = getProviderAndKey();
  var provLabel = pk ? providerName(pk.provider) : 'IA';

  var wrapper = document.createElement('div');
  wrapper.id = 'ai-chat-root';
  wrapper.innerHTML =
    // Floating button
    '<button id="ai-chat-toggle-btn" onclick="toggleAIChat()" title="Abrir chat IA" ' +
    'style="position:fixed;bottom:24px;right:24px;z-index:8000;width:52px;height:52px;border-radius:50%;border:none;' +
    'background:#ba7517;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(186,117,23,.45);' +
    'display:flex;align-items:center;justify-content:center;transition:.15s">💬</button>' +

    // Chat panel
    '<div id="ai-chat-panel" style="display:none;position:fixed;bottom:88px;right:24px;z-index:8000;' +
    'width:360px;height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);' +
    'border:1px solid #e5e5e0;flex-direction:column;overflow:hidden">' +

    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;' +
    'background:#ba7517;color:#fff;flex-shrink:0">' +
    '<div><div style="font-weight:500;font-size:14px">Chat IA · ' + escChat(provLabel) + '</div>' +
    '<div style="font-size:10px;opacity:.8">Asesor de inversión inmobiliaria</div></div>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<button onclick="clearAIChat()" title="Nueva conversación" style="background:rgba(255,255,255,.2);border:none;color:#fff;cursor:pointer;border-radius:6px;padding:4px 8px;font-size:10px;font-family:inherit">Nueva</button>' +
    '</div>' +
    '</div>' +

    // Messages
    '<div id="ai-chat-msgs" style="flex:1;overflow-y:auto;padding:12px;scroll-behavior:smooth"></div>' +

    // Status
    '<div id="ai-chat-status" style="padding:0 16px 4px;font-size:10px;color:#aaa;min-height:16px"></div>' +

    // Input area
    '<div style="padding:10px 12px;border-top:1px solid #f0f0ea;flex-shrink:0">' +
    '<div style="display:flex;gap:8px;align-items:flex-end">' +
    '<textarea id="ai-chat-input" rows="2" placeholder="Pregunta sobre rentabilidades, mercados, estrategias..." ' +
    'style="flex:1;border:1px solid #e5e5e0;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit;' +
    'resize:none;outline:none;line-height:1.4;max-height:100px;overflow-y:auto"></textarea>' +
    '<button id="ai-chat-send" onclick="sendAIMessage()" ' +
    'style="padding:8px 14px;border:none;border-radius:8px;background:#ba7517;color:#fff;cursor:pointer;' +
    'font-size:13px;flex-shrink:0;font-family:inherit;height:38px">→</button>' +
    '</div>' +
    (pk ? '' : '<div style="font-size:10px;color:#dc2626;margin-top:6px">⚠ Configura una API key en Importar → Configuración IA</div>') +
    '</div>' +

    '</div>';

  document.body.appendChild(wrapper);

  // Enter to send
  document.addEventListener('keydown', function(e) {
    var inp = document.getElementById('ai-chat-input');
    if (e.target === inp && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.sendAIMessage();
    }
  });

  renderChatMessages();
}

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(buildChatUI, 300);
});

// Expose getDashboardAssets for context (resolved at call time)
if (typeof window.getDashboardAssets === 'undefined') {
  window.getDashboardAssets = function() {
    try { var r = JSON.parse(localStorage.getItem('return_dashboard_assets_v1') || '[]'); return Array.isArray(r) ? r : []; } catch(e) { return []; }
  };
}

})();
