// ==UserScript==
// @name         Cabin PA addon for GeoFS
// @namespace    https://geofs-cabin-pa.local
// @version      1.5.0
// @description  Cabin announcements panel with speech synthesis, seatbelt chime, safety audio with delay, control lock, and boarding music
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  const state = {
    seatbelt: false,
    voiceName: null,
    safetySrc: null,
    safetyAudio: null,
    safetyTimer: null,
    boardingSrc: null,
    boardingAudio: null
  };

  const messages = {
    boarding: "Welcome aboard. We are preparing for departure. Please stow carry-on items, fasten your seat belts, and ensure electronic devices are in airplane mode. Cabin crew will be coming through the aisle to assist.",
    safety: "Please direct your attention to the cabin crew for the safety demonstration. Fasten your seat belt low and tight. In case of a loss of cabin pressure, oxygen masks will drop from the overhead panel. Place the mask over your nose and mouth and secure it before assisting others.",
    takeoff: "Cabin crew, please be seated for takeoff. Passengers, we will be departing shortly. Please make sure your seat backs and tray tables are in the upright position and window shades are open.",
    cruise: "We have reached our cruising altitude. The seat belt sign may be switched off, however we recommend keeping your seat belt fastened while seated. Cabin service will begin shortly.",
    descent: "We are beginning our descent. Please return to your seats, fasten seat belts, and ensure all electronic devices are secured. Cabin crew will prepare the cabin for landing.",
    landing: "Cabin crew, prepare for landing. Passengers, please ensure seat belts are fastened, tray tables stowed, and window shades open as we make our final approach.",
    taxiin: "Welcome to our destination. Please remain seated with your seat belt fastened until we have reached the gate and the seat belt sign has been switched off.",
    seatbeltOn: "The seat belt sign has been turned on. Please return to your seats and fasten seat belts. Thank you.",
    seatbeltOff: "The seat belt sign has been turned off. You may now move about the cabin, keeping your seat belt fastened while seated.",
    safetyVideoIntro: "For your safety, please pay attention to the safety video."
  };

  function init() {
    if (document.getElementById("cabin-pa-panel")) return;
    injectStyles();
    createOverlay();
    createToggleButton();
    createPanel();
    initVoices();
    loadVoicePreference();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeyup, true);
    document.addEventListener("keypress", handleKeypress, true);
    document.addEventListener("wheel", handlePointerBlock, { capture: true, passive: false });
    document.addEventListener("mousedown", handlePointerBlock, true);
    document.addEventListener("mouseup", handlePointerBlock, true);
    document.addEventListener("mousemove", handlePointerBlock, true);
    document.addEventListener("touchstart", handlePointerBlock, { capture: true, passive: false });
    document.addEventListener("touchmove", handlePointerBlock, { capture: true, passive: false });
    document.addEventListener("touchend", handlePointerBlock, true);
    document.addEventListener("contextmenu", handlePointerBlock, true);
  }

  function injectStyles() {
    const s = document.createElement("style");
    s.textContent =
      "#cabin-pa-panel{position:fixed;top:16px;right:16px;width:340px;background:rgba(22,23,26,.92);color:#fff;border-radius:10px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(6px);z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      "#cabin-pa-panel .title{font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}" +
      "#cabin-pa-panel .row{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}" +
      "#cabin-pa-panel button{flex:1;padding:8px 10px;border:none;border-radius:8px;background:#2b2f36;color:#fff;cursor:pointer;font-weight:500}" +
      "#cabin-pa-panel button:hover{background:#3a3f47}" +
      "#cabin-pa-panel .accent{background:#3d6cff}" +
      "#cabin-pa-panel input, #cabin-pa-panel select{flex:1;padding:8px 10px;border-radius:8px;border:1px solid #454a52;background:#1f2228;color:#fff}" +
      "#cabin-pa-panel input[type=file]{flex:2}" +
      "#cabin-pa-panel .close{width:auto;background:#444}" +
      "#cabin-pa-panel .small{font-size:12px;opacity:.85}" +
      "#cabin-pa-toggle{position:fixed;left:50%;transform:translateX(-50%);bottom:88px;padding:10px 16px;border-radius:999px;border:none;background:#3d6cff;color:#fff;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:1000000;cursor:pointer}" +
      "#cabin-pa-toggle:hover{filter:brightness(1.08)}" +
      "@media (max-height:700px){#cabin-pa-toggle{bottom:64px}}" +
      "@media (max-height:540px){#cabin-pa-toggle{bottom:48px}}" +
      "#cabin-pa-overlay{position:fixed;inset:0;background:transparent;z-index:999998;display:none}";
    document.head.appendChild(s);
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cabin-pa-overlay";
    document.body.appendChild(overlay);
  }

  function createToggleButton() {
    if (document.getElementById("cabin-pa-toggle")) return;
    const toggle = document.createElement("button");
    toggle.id = "cabin-pa-toggle";
    toggle.type = "button";
    toggle.textContent = "Cabin PA";
    toggle.addEventListener("click", () => {
      const panel = document.getElementById("cabin-pa-panel");
      setPanelVisible(!(panel && panel.style.display !== "none"));
    });
    document.body.appendChild(toggle);
  }

  function setPanelVisible(visible) {
    const panel = document.getElementById("cabin-pa-panel");
    const overlay = document.getElementById("cabin-pa-overlay");
    if (!panel || !overlay) return;
    panel.style.display = visible ? "block" : "none";
    overlay.style.display = visible ? "block" : "none";
  }

  function isPanelVisible() {
    const panel = document.getElementById("cabin-pa-panel");
    return !!panel && panel.style.display !== "none";
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "cabin-pa-panel";
    panel.style.display = "none";
    panel.innerHTML =
      '<div class="title"><span>Cabin PA</span><button class="close" id="cabin-pa-close">Hide</button></div>' +
      '<div class="row">' +
      btn("Boarding", "boarding") +
      btn("Safety", "safety") +
      btn("Takeoff", "takeoff") +
      "</div>" +
      '<div class="row">' +
      btn("Cruise", "cruise") +
      btn("Descent", "descent") +
      btn("Landing", "landing") +
      "</div>" +
      '<div class="row">' +
      btn("Taxi‑in", "taxiin") +
      btn("Seatbelt On", "seatbeltOn", "accent") +
      btn("Seatbelt Off", "seatbeltOff") +
      "</div>" +
      '<div class="row">' +
      '<input type="text" id="cabin-pa-custom" placeholder="Custom announcement">' +
      '<button id="cabin-pa-say">Speak</button>' +
      "</div>" +
      '<div class="row">' +
      '<select id="cabin-pa-voice"></select>' +
      "</div>" +
      '<div class="row">' +
      '<input type="file" id="cabin-pa-safety-file" accept="audio/*">' +
      btn("Play Safety Video", "playSafety", "accent") +
      "</div>" +
      '<div class="row small"><span id="cabin-pa-safety-status">No safety audio attached</span></div>' +
      '<div class="row">' +
      '<input type="file" id="cabin-pa-boarding-file" accept="audio/*">' +
      btn("Start Boarding Music", "boardingStart", "accent") +
      btn("Stop Boarding Music", "boardingStop") +
      "</div>" +
      '<div class="row small"><span id="cabin-pa-boarding-status">No boarding music attached</span><span style="margin-left:auto">Shortcut: Shift+P</span></div>';
    document.body.appendChild(panel);
    panel.addEventListener("click", onPanelClick);

    const safetyFile = document.getElementById("cabin-pa-safety-file");
    safetyFile.addEventListener("change", onSafetyFileChange);

    const boardingFile = document.getElementById("cabin-pa-boarding-file");
    boardingFile.addEventListener("change", onBoardingFileChange);
  }

  function btn(label, action, extra) {
    const cls = extra ? " " + extra : "";
    return '<button data-action="' + action + '" class="' + cls + '">' + label + "</button>";
  }

  function onPanelClick(e) {
    const t = e.target;
    if (t.id === "cabin-pa-close") {
      setPanelVisible(false);
      return;
    }
    if (t.id === "cabin-pa-say") {
      const val = document.getElementById("cabin-pa-custom").value.trim();
      if (val) speak(val);
      return;
    }
    const action = t.getAttribute("data-action");
    if (!action) return;

    if (action === "playSafety") {
      if (state.safetyTimer) {
        clearTimeout(state.safetyTimer);
        state.safetyTimer = null;
      }
      if (state.safetyAudio) {
        try { state.safetyAudio.pause(); } catch (_) {}
        state.safetyAudio.currentTime = 0;
      }
      setSafetyStatus(state.safetyAudio ? "Narrator speaking… safety audio will start in 5 seconds" : "Attach a safety audio file first");
      speakAsync(messages.safetyVideoIntro).then(() => {
        if (!state.safetyAudio) return;
        state.safetyTimer = setTimeout(() => {
          state.safetyTimer = null;
          try {
            state.safetyAudio.currentTime = 0;
            state.safetyAudio.play().then(() => {
              setSafetyStatus("Playing safety audio…");
            }).catch(() => {
              setSafetyStatus("Safety audio play failed");
            });
          } catch (_) {
            setSafetyStatus("Safety audio play failed");
          }
        }, 5000);
      });
      return;
    }

    if (action === "boardingStart") {
      if (!state.boardingAudio) {
        setBoardingStatus("Attach a boarding music file first");
        return;
      }
      try {
        state.boardingAudio.currentTime = 0;
        state.boardingAudio.play().then(() => {
          setBoardingStatus("Boarding music playing");
        }).catch(() => {
          setBoardingStatus("Failed to play boarding music");
        });
      } catch (_) {
        setBoardingStatus("Failed to play boarding music");
      }
      return;
    }

    if (action === "boardingStop") {
      if (!state.boardingAudio) {
        setBoardingStatus("No boarding music attached");
        return;
      }
      try {
        state.boardingAudio.pause();
        setBoardingStatus("Boarding music stopped");
      } catch (_) {
        setBoardingStatus("Failed to stop boarding music");
      }
      return;
    }

    if (action === "seatbeltOn") {
      state.seatbelt = true;
      ding();
      speak(messages.seatbeltOn);
      return;
    }
    if (action === "seatbeltOff") {
      state.seatbelt = false;
      ding();
      speak(messages.seatbeltOff);
      return;
    }

    const text = messages[action];
    if (text) speak(text);
  }

  function handleKeydown(e) {
    const isToggle = e.shiftKey && String(e.key).toLowerCase() === "p";
    if (isToggle) {
      const panel = document.getElementById("cabin-pa-panel");
      setPanelVisible(!(panel && panel.style.display !== "none"));
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }

  function handleKeyup(e) {
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }

  function handleKeypress(e) {
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }

  function handlePointerBlock(e) {
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) return;
    e.stopImmediatePropagation();
    e.stopPropagation();
    try { e.preventDefault(); } catch (_) {}
  }

  function onSafetyFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (state.safetyTimer) {
      clearTimeout(state.safetyTimer);
      state.safetyTimer = null;
    }
    if (state.safetyAudio) {
      try { state.safetyAudio.pause(); } catch (_) {}
    }
    if (state.safetySrc) {
      try { URL.revokeObjectURL(state.safetySrc); } catch (_) {}
    }
    state.safetyAudio = null;
    state.safetySrc = null;

    if (!file) {
      setSafetyStatus("No safety audio attached");
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.onended = () => setSafetyStatus("Safety audio finished");
    audio.onerror = () => setSafetyStatus("Failed to load safety audio");
    state.safetySrc = url;
    state.safetyAudio = audio;
    setSafetyStatus('Attached: "' + (file.name || "audio") + '"');
  }

  function onBoardingFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (state.boardingAudio) {
      try { state.boardingAudio.pause(); } catch (_) {}
    }
    if (state.boardingSrc) {
      try { URL.revokeObjectURL(state.boardingSrc); } catch (_) {}
    }
    state.boardingAudio = null;
    state.boardingSrc = null;

    if (!file) {
      setBoardingStatus("No boarding music attached");
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.onended = () => setBoardingStatus("Boarding music finished");
    audio.onerror = () => setBoardingStatus("Failed to load boarding music");
    state.boardingSrc = url;
    state.boardingAudio = audio;
    setBoardingStatus('Attached: "' + (file.name || "audio") + '"');
  }

  function setSafetyStatus(text) {
    const el = document.getElementById("cabin-pa-safety-status");
    if (el) el.textContent = text;
  }

  function setBoardingStatus(text) {
    const el = document.getElementById("cabin-pa-boarding-status");
    if (el) el.textContent = text;
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = resolveVoice();
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  function speakAsync(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        setTimeout(resolve, 0);
        return;
      }
      try { window.speechSynthesis.cancel(); } catch (_) {}
      const u = new SpeechSynthesisUtterance(text);
      const v = resolveVoice();
      if (v) u.voice = v;
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  function initVoices() {
    const fill = () => {
      const select = document.getElementById("cabin-pa-voice");
      if (!select) return;
      const voices = window.speechSynthesis.getVoices() || [];
      select.innerHTML = "";
      voices.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = v.name + " (" + (v.lang || "unknown") + ")";
        select.appendChild(opt);
      });
      const saved = state.voiceName || localStorage.getItem("cabinPaVoice");
      if (saved) {
        const match = Array.from(select.options).find((o) => o.value === saved);
        if (match) select.value = saved;
      } else {
        const en = Array.from(select.options).find((o) => String(o.textContent).includes("(en"));
        if (en) select.value = en.value;
      }
      select.addEventListener("change", () => {
        state.voiceName = select.value;
        localStorage.setItem("cabinPaVoice", state.voiceName);
      });
    };
    fill();
    window.speechSynthesis.onvoiceschanged = fill;
  }

  function resolveVoice() {
    const voices = window.speechSynthesis.getVoices() || [];
    const name = state.voiceName || localStorage.getItem("cabinPaVoice");
    if (name) {
      const v = voices.find((x) => x.name === name);
      if (v) return v;
    }
    const en = voices.find((x) => String(x.lang || "").toLowerCase().startsWith("en"));
    return en || voices[0] || null;
  }

  function loadVoicePreference() {
    const saved = localStorage.getItem("cabinPaVoice");
    if (saved) state.voiceName = saved;
  }

  function ding() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      const t = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.00001, t + 0.35);
      o.stop(t + 0.38);
      setTimeout(() => ctx.close(), 450);
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();