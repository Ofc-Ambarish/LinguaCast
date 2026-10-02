/* ============================================================
   LinguaCast — Broadcast Your Voice Worldwide
   © 2026 Ambarish. All rights reserved.
   ============================================================ */

/* ---------------- Element References ---------------- */
const micBtn           = document.getElementById('micBtn');
const micStatus        = document.getElementById('micStatus');
const originalText     = document.getElementById('originalText');
const translatedText   = document.getElementById('translatedText');
const sourceLang       = document.getElementById('sourceLang');
const targetLang       = document.getElementById('targetLang');
const swapBtn          = document.getElementById('swapBtn');
const playBtn          = document.getElementById('playBtn');
const copyOriginal     = document.getElementById('copyOriginal');
const copyTranslation  = document.getElementById('copyTranslation');
const autoPlayToggle   = document.getElementById('autoPlayToggle');
const echoGuardToggle  = document.getElementById('echoGuardToggle');
const speedRange       = document.getElementById('speedRange');
const speedValue       = document.getElementById('speedValue');
const connectionStatus = document.getElementById('connectionStatus');
const statusText       = document.getElementById('statusText');
const historyBtn       = document.getElementById('historyBtn');
const historyBadge     = document.getElementById('historyBadge');
const historyOverlay   = document.getElementById('historyOverlay');
const closeHistory     = document.getElementById('closeHistory');
const historyList      = document.getElementById('historyList');
const exportBtn        = document.getElementById('exportBtn');
const clearHistoryBtn  = document.getElementById('clearHistoryBtn');
const visualizer       = document.getElementById('visualizer');
const vizCtx           = visualizer.getContext('2d');
const toast            = document.getElementById('toast');
const themeToggle      = document.getElementById('themeToggle');

/* ---------------- State ---------------- */
let recognition        = null;
let isListening        = false;
let finalTranscript    = '';
let currentOriginal    = '';
let currentTranslation = '';
let agentSpeaking      = false;
let cooldownTimer      = null;
let debounceTimer      = null;
const COOLDOWN_MS      = 1400;
const DEBOUNCE_MS      = 600;

let audioContext       = null;
let analyser           = null;
let micStream          = null;
let vizAnimation       = null;

/* ---------------- Config ---------------- */
const HISTORY_KEY      = 'linguacast_history';
const THEME_KEY        = 'linguacast_theme';
const MAX_HISTORY      = 100;

/* ============================================================
   1. THEME TOGGLE (Dark / Light)
   ============================================================ */
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
}

themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  showToast(isLight ? '☀️ Light mode' : '🌙 Dark mode');
});

/* React to OS-level theme changes (only if user hasn't chosen) */
window.matchMedia('(prefers-color-scheme: light)')
  .addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });

/* ============================================================
   2. INTERNET STATUS
   ============================================================ */
function updateConnectionStatus() {
  const online = navigator.onLine;
  if (online) {
    connectionStatus.classList.remove('offline');
    statusText.textContent = 'Connected';
  } else {
    connectionStatus.classList.add('offline');
    statusText.textContent = 'Offline';
  }
}

window.addEventListener('online',  updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

/* ============================================================
   3. TOAST NOTIFICATIONS
   ============================================================ */
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============================================================
   4. SPEECH RECOGNITION
   ============================================================ */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  micStatus.textContent = '❌ Speech Recognition not supported. Use Chrome or Edge.';
  micBtn.disabled = true;
}

function createRecognition() {
  const rec = new SpeechRecognition();
  rec.continuous     = true;
  rec.interimResults = true;
  rec.lang           = sourceLang.value;

  rec.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    micStatus.textContent = '🎧 Listening… speak now';
    startVisualizer();
  };

  rec.onresult = (event) => {
    if (echoGuardToggle.checked && (agentSpeaking || cooldownTimer !== null)) return;

    let interim = '';
    let final   = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript + ' ';
      else interim += transcript;
    }

    if (final) {
      finalTranscript += final;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        translateText(finalTranscript.trim());
      }, DEBOUNCE_MS);
    }

    originalText.textContent = finalTranscript + interim;
  };

  rec.onerror = (event) => {
    console.error('Speech error:', event.error);

    if (event.error === 'not-allowed') {
      micStatus.textContent = '❌ Microphone access denied';
    } else if (event.error === 'no-speech') {
      /* silent */
    } else if (event.error === 'network') {
      micStatus.textContent = '⚠️ Network issue — check internet';
    } else if (event.error === 'aborted') {
      /* ignore */
    } else {
      micStatus.textContent = `⚠️ Error: ${event.error}`;
    }
  };

  rec.onend = () => {
    isListening = false;
    micBtn.classList.remove('listening');
    micStatus.textContent = 'Tap the mic to begin';
    stopVisualizer();
  };

  return rec;
}

/* ============================================================
   5. TRANSLATION — Unofficial Google Translate Endpoint
   ============================================================ */
async function translateText(text) {
  if (!text) return;

  if (!navigator.onLine) {
    micStatus.textContent = '⚠️ No internet — cannot translate';
    showToast('⚠️ No internet connection');
    return;
  }

  const from = sourceLang.value.split('-')[0];
  const to   = targetLang.value.split('-')[0];

  if (from === to) {
    currentOriginal    = text;
    currentTranslation = text;
    translatedText.textContent = text;
    playBtn.disabled = false;
    return;
  }

  try {
    micStatus.textContent = '🔄 Translating…';

    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    const res  = await fetch(url);
    const data = await res.json();

    const translated = (data?.[0] || [])
      .map(item => item?.[0])
      .filter(Boolean)
      .join('')
      .trim() || '—';

    currentOriginal    = text;
    currentTranslation = translated;

    translatedText.textContent = translated;
    playBtn.disabled = false;
    micStatus.textContent = '✅ Done';

    saveToHistory(text, translated, sourceLang.value, targetLang.value);

    if (autoPlayToggle.checked) speakTranslation();
  } catch (err) {
    console.error(err);
    micStatus.textContent = '❌ Translation failed';
    showToast('❌ Translation failed');
  }
}

/* ============================================================
   6. TEXT-TO-SPEECH (with echo guard)
   ============================================================ */
function speakTranslation() {
  if (!currentTranslation) return;

  if (echoGuardToggle.checked && isListening && recognition) {
    try { recognition.stop(); } catch (_) {}
  }

  agentSpeaking = true;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(currentTranslation);
  utter.lang  = targetLang.value;
  utter.rate  = parseFloat(speedRange.value);
  utter.pitch = 1;

  utter.onstart = () => { micStatus.textContent = '🔊 Speaking translation…'; };

  utter.onend = () => {
    agentSpeaking = false;
    if (cooldownTimer) clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => {
      cooldownTimer = null;
      micStatus.textContent = 'Tap the mic to begin';
    }, echoGuardToggle.checked ? COOLDOWN_MS : 0);
  };

  utter.onerror = (e) => {
    console.error('TTS error:', e);
    agentSpeaking = false;
  };

  window.speechSynthesis.speak(utter);
}

/* ============================================================
   7. AUDIO VISUALIZER
   ============================================================ */
async function startVisualizer() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser     = audioContext.createAnalyser();
    analyser.fftSize = 64;

    const source = audioContext.createMediaStreamSource(micStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);

    function draw() {
      vizAnimation = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      vizCtx.clearRect(0, 0, visualizer.width, visualizer.height);

      const barWidth = (visualizer.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * visualizer.height * 0.85;

        const gradient = vizCtx.createLinearGradient(0, 0, 0, visualizer.height);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#6366f1');

        vizCtx.fillStyle = gradient;
        vizCtx.fillRect(x, visualizer.height - barHeight, barWidth - 1.5, barHeight);
        x += barWidth;
      }
    }
    draw();
  } catch (err) {
    console.warn('Visualizer unavailable:', err);
  }
}

function stopVisualizer() {
  if (vizAnimation) cancelAnimationFrame(vizAnimation);
  vizAnimation = null;

  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  vizCtx.clearRect(0, 0, visualizer.width, visualizer.height);
}

/* ============================================================
   8. HISTORY MANAGEMENT
   ============================================================ */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(original, translated, from, to) {
  const history = getHistory();

  history.unshift({
    id: Date.now(),
    original,
    translated,
    from,
    to,
    time: new Date().toLocaleString()
  });

  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateHistoryBadge();

  if (historyOverlay.classList.contains('open')) renderHistory();
}

function updateHistoryBadge() {
  const count = getHistory().length;
  historyBadge.textContent = count;
  historyBadge.style.display = count > 0 ? 'inline-block' : 'none';
}

function renderHistory() {
  const history = getHistory();

  if (!history.length) {
    historyList.innerHTML = '<p class="empty-history">No translations yet.</p>';
    return;
  }

  historyList.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="lang-pair">
        ${item.from} → ${item.to}
      </div>
      <div class="original">"${escapeHtml(item.original)}"</div>
      <div class="translated">${escapeHtml(item.translated)}</div>
      <div class="time">${item.time}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   9. EVENT LISTENERS
   ============================================================ */

micBtn.addEventListener('click', () => {
  if (!SpeechRecognition) return;

  if (isListening) {
    try { recognition.stop(); } catch (_) {}
    return;
  }

  finalTranscript    = '';
  currentOriginal    = '';
  currentTranslation = '';
  originalText.textContent   = '';
  translatedText.textContent = '';
  playBtn.disabled = true;

  recognition = createRecognition();
  recognition.lang = sourceLang.value;

  try {
    recognition.start();
  } catch (err) {
    console.error(err);
    micStatus.textContent = '⚠️ Could not start microphone';
  }
});

playBtn.addEventListener('click', () => {
  if (currentTranslation) speakTranslation();
});

copyOriginal.addEventListener('click', async () => {
  const text = originalText.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Original copied');
  } catch {
    showToast('❌ Copy failed');
  }
});

copyTranslation.addEventListener('click', async () => {
  const text = translatedText.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Translation copied');
  } catch {
    showToast('❌ Copy failed');
  }
});

swapBtn.addEventListener('click', () => {
  const s = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = s;

  if (isListening) {
    try { recognition.stop(); } catch (_) {}
  }
  showToast('🔄 Languages swapped');
});

speedRange.addEventListener('input', () => {
  speedValue.textContent = parseFloat(speedRange.value).toFixed(1) + '×';
});

sourceLang.addEventListener('change', () => {
  if (isListening) {
    try { recognition.stop(); } catch (_) {}
  }
});

historyBtn.addEventListener('click', () => {
  renderHistory();
  historyOverlay.classList.add('open');
});

closeHistory.addEventListener('click', () => {
  historyOverlay.classList.remove('open');
});

historyOverlay.addEventListener('click', (e) => {
  if (e.target === historyOverlay) {
    historyOverlay.classList.remove('open');
  }
});

exportBtn.addEventListener('click', () => {
  const history = getHistory();
  if (!history.length) {
    showToast('⚠️ History is empty');
    return;
  }

  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `linguacast-history-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 History exported');
});

clearHistoryBtn.addEventListener('click', () => {
  if (!getHistory().length) {
    showToast('⚠️ History is already empty');
    return;
  }

  if (confirm('Delete all translation history?')) {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    updateHistoryBadge();
    showToast('🗑️ History cleared');
  }
});

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    micBtn.click();
  }
  if (e.code === 'KeyT') {
    themeToggle.click();
  }
});

/* ============================================================
   10. INIT
   ============================================================ */
initTheme();
updateHistoryBadge();
speedValue.textContent = parseFloat(speedRange.value).toFixed(1) + '×';

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();