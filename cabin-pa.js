// ==UserScript==
// @name         Cabin PA addon for GeoFS
// @namespace    https://geofs-cabin-pa.local
// @version      2.0.0
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
    voiceName2: null,
    voiceLang: null, // language code for first voice (for translation)
    voiceLang2: null, // language code for second voice (for translation)
    dualEnabled: false,
    dualOrderPrimaryFirst: true,
    useBestVoiceAuto: false,
    safetySrc: null,
    safetyAudio: null,
    safetyTimer: null,
    boardingSrc: null,
    boardingAudio: null,
    airlineName: null,
    flightNumber: null,
    destination: null,
    primaryLang: null, // new: selected primary language code (e.g. "en", "es")
    scriptVersion: "2.0.0"
  };

  const messages = {
    boarding: "Welcome aboard your {airline} flight {flight} bound for {dest}. We are glad to have you onboard with us. As we prepare for departure, please stow carry-on items, fasten your seat belts, and ensure electronic devices are in flight safe mode. If this is not your flight, please don't hesitate to ask a crew member for help.",
    boardingDoorOpen: "The boarding door has been opened; passengers may now disembark. Thank you for flying {airline}. Once again, welcome to {dest}",
    safety: "Please direct your attention to the cabin crew for the safety demonstration. Fasten your seat belt low and tight. In case of a loss of cabin pressure, oxygen masks will drop from the overhead panel. Place the mask over your nose and mouth and secure it before assisting others.",
    takeoff: "Cabin crew, takeoff stations. We are about to take off. Please make sure your seat backs and tray tables are in the upright position and window shades are raised.",
    cruise: "We have reached our cruising altitude. The seat belt sign may be switched off, however we recommend keeping your seat belt fastened while seated. Cabin crew will be serving meals in a few moments.",
    descent: "We are beginning our descent into {dest}. Please return to your seats, fasten seat belts, and ensure all electronic devices are secured. Cabin crew will now perform a pre-descent cabin check.",
    landing: "Cabin crew, prepare for arrival. We are beginning our final descent. Please ensure seat belts are fastened, tray tables stowed, and window shades raised as we make our final approach.",
    taxiin: "We have just landed at {dest}. For your safety and comfort, please remain seated with your seat belt fastened until the captain turns off the seatbelt sign. Please check your surroundings to ensure if you never leave your personal belongings behind. Be cautious when opening the overhead bins as heavy items may have moved during the flight. On behalf of the Captain, First Officer and the cabin crew, we thank you for flying {airline}. We hope to see you again soon.",
    seatbeltOn: "The seat belt sign has been turned on. Please return to your seats and fasten your seat belts. Thank you for your cooperation.",
    seatbeltOff: "The seat belt sign has been turned off. You may now move about the cabin, keeping your seat belt fastened while seated.",
    safetyVideoIntro: "At {airline}, your safety is our top priority. Please pay close attention to the following safety demonstration, which will cover important information about your flight and how to respond in an emergency. We appreciate your attention and cooperation in ensuring a safe and comfortable journey for everyone on board."
  };

  function init() {
    if (document.getElementById("cabin-pa-panel")) return;
    injectStyles();
    createOverlay();
    createToggleButton();
    createPanel();
    loadVoicePreference();
    initVoices();
    loadFlightInfo();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeyup, true);
    document.addEventListener("keypress", handleKeypress, true);
    
    // Check for updates on startup
    checkForUpdates();
    // Check for updates every 1 minute
    setInterval(checkForUpdates, 60 * 1000);
  }

  function injectStyles() {
    const s = document.createElement("style");
    s.textContent =
      "#cabin-pa-panel{position:fixed;top:16px;right:16px;width:360px;background:rgba(255,255,255,.98);color:#1a1a1a;border-radius:10px;padding:10px;box-shadow:0 8px 32px rgba(0,0,0,.12);backdrop-filter:blur(6px);z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;border:1px solid rgba(0,0,0,.08);font-size:13px}" +
      "#cabin-pa-panel .title{font-weight:700;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;color:#0d47a1;font-size:14px}" +
      "#cabin-pa-panel .row{display:flex;gap:6px;flex-wrap:wrap;margin:5px 0}" +
      "#cabin-pa-panel button{flex:1;padding:7px 10px;border:none;border-radius:7px;background:#f0f0f0;color:#1a1a1a;cursor:pointer;font-weight:600;transition:all .2s;border:1px solid #e0e0e0;font-size:12px}" +
      "#cabin-pa-panel button:hover{background:#e8e8e8;border-color:#d0d0d0}" +
      "#cabin-pa-panel .accent{background:#00a8ff;color:#fff;border-color:#00a8ff}" +
      "#cabin-pa-panel .accent:hover{background:#0091d9;border-color:#0091d9}" +
      "#cabin-pa-panel input, #cabin-pa-panel select{flex:1;padding:7px 10px;border-radius:7px;border:1px solid #d0d0d0;background:#fafafa;color:#1a1a1a;font-size:12px;transition:border .2s}" +
      "#cabin-pa-panel input:focus, #cabin-pa-panel select:focus{outline:none;border-color:#00a8ff;box-shadow:0 0 0 3px rgba(0,168,255,.1)}" +
      "#cabin-pa-panel input[type=file]{flex:2}" +
      "#cabin-pa-panel .close{width:auto;background:#ff6b6b;color:#fff;border-color:#ff6b6b}" +
      "#cabin-pa-panel .close:hover{background:#ff5252;border-color:#ff5252}" +
      "#cabin-pa-panel .small{font-size:11px;opacity:.7;color:#666}" +
      "#cabin-pa-toggle{position:fixed;left:50%;transform:translateX(-50%);bottom:88px;padding:9px 16px;border-radius:999px;border:none;background:#00a8ff;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(0,168,255,.3);z-index:1000000;cursor:pointer;transition:all .2s;font-size:13px}" +
      "#cabin-pa-toggle:hover{background:#0091d9;box-shadow:0 10px 28px rgba(0,168,255,.4);transform:translateX(-50%) translateY(-2px)}" +
      "@media (max-height:700px){#cabin-pa-toggle{bottom:64px}}" +
      "@media (max-height:540px){#cabin-pa-toggle{bottom:48px}}" +
      "#cabin-pa-overlay{position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:999998;display:none;backdrop-filter:blur(2px)}" +
      "#cabin-pa-panel .meta-label{font-size:11px;opacity:.7;width:100%;color:#666}" +
      /* language picker modal */
      "#cabin-pa-lang-picker{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:280px;max-height:60vh;overflow:auto;background:#fff;border-radius:10px;padding:11px;z-index:1000001;display:none;box-shadow:0 12px 40px rgba(0,0,0,.15);border:1px solid rgba(0,0,0,.08)}" +
      "#cabin-pa-lang-picker h3{margin:0 0 9px 0;font-size:13px;font-weight:700;color:#0d47a1}" +
      "#cabin-pa-lang-picker ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}" +
      "#cabin-pa-lang-picker li{background:#f5f5f5;padding:8px;border-radius:6px;cursor:pointer;text-align:center;font-weight:500;color:#1a1a1a;border:1px solid #e8e8e8;transition:all .2s;font-size:12px}" +
      "#cabin-pa-lang-picker li:hover{background:#00a8ff;color:#fff;border-color:#00a8ff}";
    document.head.appendChild(s);
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cabin-pa-overlay";
    overlay.addEventListener("click", () => setPanelVisible(false));
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
      '<input type="text" id="cabin-pa-airline" placeholder="Airline name">' +
      '<input type="text" id="cabin-pa-flight" placeholder="Flight number">' +
      '<input type="text" id="cabin-pa-destination" placeholder="Destination">' +
      "</div>" +
      '<div class="row small"><span class="meta-label">These values are used in Boarding, Descent and Taxi‑in announcements.</span></div>' +
      // language selector button (new)
      '<div class="row">' +
      '<button id="cabin-pa-lang-btn">Choose primary language</button>' +
      '<div id="cabin-pa-lang-selected" style="align-self:center;padding:6px 8px;border-radius:6px;background:#1f2228;">None</div>' +
      "</div>" +
      // dual language controls
      '<div class="row">' +
      '<select id="cabin-pa-voice"></select>' +
      '<select id="cabin-pa-voice-2"></select>' +
      "</div>" +
      '<div class="row small"><label><input type="checkbox" id="cabin-pa-dual"> Enable dual-language (speak both)</label><label style="margin-left:auto"><input type="checkbox" id="cabin-pa-dual-order"> Primary first</label></div>' +
      '<div class="row small"><label><input type="checkbox" id="cabin-pa-auto-best"> Auto-select best available voice</label></div>' +
      '<div class="row">' +
      btn("Boarding", "boarding") +
      btn("Boarding Door Open", "boardingDoorOpen") +
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
      '<input type="file" id="cabin-pa-safety-file" accept="audio/*">' +
      "</div>" +
      '<div class="row">' +
      btn("Safety Audio (Announcement)", "playSafety", "accent") +
      btn("Safety Audio (Direct)", "playSafetyDirect", "accent") +
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

    // language picker container (hidden by default)
    const langPicker = document.createElement("div");
    langPicker.id = "cabin-pa-lang-picker";
    langPicker.innerHTML = '<h3>Select primary language</h3><ul id="cabin-pa-lang-list"></ul>';
    document.body.appendChild(langPicker);

    const safetyFile = document.getElementById("cabin-pa-safety-file");
    safetyFile.addEventListener("change", onSafetyFileChange);

    const boardingFile = document.getElementById("cabin-pa-boarding-file");
    boardingFile.addEventListener("change", onBoardingFileChange);

    // flight info inputs
    const airlineInput = document.getElementById("cabin-pa-airline");
    const flightInput = document.getElementById("cabin-pa-flight");
    const destInput = document.getElementById("cabin-pa-destination");
    airlineInput.addEventListener("input", onFlightInfoChange);
    flightInput.addEventListener("input", onFlightInfoChange);
    destInput.addEventListener("input", onFlightInfoChange);

    // dual voice controls events & load stored settings
    const v1 = document.getElementById("cabin-pa-voice");
    const v2 = document.getElementById("cabin-pa-voice-2");
    const dual = document.getElementById("cabin-pa-dual");
    const dualOrder = document.getElementById("cabin-pa-dual-order");
    const autoBest = document.getElementById("cabin-pa-auto-best");
    dual.addEventListener("change", () => { state.dualEnabled = dual.checked; localStorage.setItem("cabinPaDual", state.dualEnabled ? "1" : "0"); });
    dualOrder.addEventListener("change", () => { state.dualOrderPrimaryFirst = dualOrder.checked; localStorage.setItem("cabinPaDualOrder", state.dualOrderPrimaryFirst ? "1" : "0"); });
    autoBest.addEventListener("change", () => { state.useBestVoiceAuto = autoBest.checked; localStorage.setItem("cabinPaAutoBest", state.useBestVoiceAuto ? "1" : "0"); });

    // voice change listeners are added by initVoices()

    // language button behavior
    const langBtn = document.getElementById("cabin-pa-lang-btn");
    const langSelected = document.getElementById("cabin-pa-lang-selected");
    langBtn.addEventListener("click", showLanguagePicker);
    // clicking outside picker hides it
    document.addEventListener("click", (ev) => {
      const picker = document.getElementById("cabin-pa-lang-picker");
      if (!picker) return;
      const target = ev.target;
      if (picker.contains(target) || target === langBtn) return;
      hideLanguagePicker();
    }, true);

    updateLanguageDisplay();
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

    if (action === "playSafetyDirect") {
      if (!state.safetyAudio) {
        setSafetyStatus("Attach a safety audio file first");
        return;
      }
      if (state.safetyTimer) {
        clearTimeout(state.safetyTimer);
        state.safetyTimer = null;
      }
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
  }

  function handleKeyup(e) {
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }
  }

  function handleKeypress(e) {
    if (!isPanelVisible()) return;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel && panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return;
    }
  }

  // We no longer block all page pointer events globally. The overlay handles outside clicks while the panel is visible.
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
    audio.load();
    // Attempt to unlock playback in browsers that require a prior user gesture.
    audio.muted = true;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => {
      audio.muted = false;
    });
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
    audio.load();
    audio.muted = true;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => {
      audio.muted = false;
    });
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

  function populatePlaceholders(text) {
    const a = state.airlineName || localStorage.getItem("cabinPaAirline") || "";
    const f = state.flightNumber || localStorage.getItem("cabinPaFlight") || "";
    const d = state.destination || localStorage.getItem("cabinPaDestination") || "";
    return String(text)
      .replace(/\{airline\}/g, a)
      .replace(/\{flight\}/g, f)
      .replace(/\{dest\}/g, d);
  }

  function isEnglishLang(lang) {
    return !lang || /^en\b/i.test(String(lang));
  }

  function getTargetLangForVoice(voice, voiceLang) {
    // If we have an explicit language for this voice, use it
    if (voiceLang) return voiceLang;
    // Otherwise try to extract from voice's lang property
    if (voice && voice.lang) return String(voice.lang);
    if (state.primaryLang) return String(state.primaryLang);
    return null;
  }

  async function translateText(text, targetLang) {
    if (!text || !targetLang || isEnglishLang(targetLang)) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
      const resp = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!resp.ok) throw new Error('translate failed');
      const data = await resp.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((part) => part[0]).join('');
      }
    } catch (e) {
      console.warn('Translation failed, speaking original text', e);
    }
    return text;
  }

  function speakUtterance(text, voice, onend) {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    if (onend) u.onend = onend;
    if (onend) u.onerror = onend;
    window.speechSynthesis.speak(u);
  }

  // Speak (fire-and-forget) — supports dual-language if enabled
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    text = populatePlaceholders(text);
    if (state.dualEnabled) {
      speakDualAsync(text).catch(() => {});
      return;
    }
    window.speechSynthesis.cancel();
    const voice = resolveVoice();
    const targetLang = getTargetLangForVoice(voice, state.voiceLang);
    if (voice && !isEnglishLang(targetLang)) {
      translateText(text, targetLang).then((translated) => {
        speakUtterance(translated, voice);
      }).catch(() => {
        speakUtterance(text, voice);
      });
      return;
    }
    speakUtterance(text, voice);
  }

  // speakAsync returns a Promise that resolves after speech (or dual speech) finishes
  function speakAsync(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { setTimeout(resolve, 0); return; }
      text = populatePlaceholders(text);
      if (state.dualEnabled) {
        speakDualAsync(text).then(resolve);
        return;
      }
      try { window.speechSynthesis.cancel(); } catch (_) {}
      const voice = resolveVoice();
      const targetLang = getTargetLangForVoice(voice, state.voiceLang);
      if (voice && !isEnglishLang(targetLang)) {
        translateText(text, targetLang).then((translated) => {
          const u = new SpeechSynthesisUtterance(translated);
          if (voice) u.voice = voice;
          u.rate = 1;
          u.pitch = 1;
          u.volume = 1;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        }).catch(() => {
          const u = new SpeechSynthesisUtterance(text);
          if (voice) u.voice = voice;
          u.rate = 1;
          u.pitch = 1;
          u.volume = 1;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        });
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  // Dual-language helpers ------------------------------------------------

  function speakDual(text) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
    const voices = window.speechSynthesis.getVoices() || [];
    if (state.useBestVoiceAuto) autoSelectBestVoices(voices);

    // pick primary voice by explicit name or primaryLang or fallback
    const primary = resolveVoiceByName(state.voiceName) || resolveVoiceForLang(state.primaryLang) || resolveVoice();
    const secondary = resolveVoiceByName(state.voiceName2) || findAnyOtherVoice(primary);

    const first = state.dualOrderPrimaryFirst ? primary : secondary;
    const second = state.dualOrderPrimaryFirst ? secondary : primary;

    if (!first && !second) return;

    const speakUtter = (voice, txt, onend) => {
      const u = new SpeechSynthesisUtterance(txt);
      if (voice) u.voice = voice;
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      if (onend) u.onend = onend;
      window.speechSynthesis.speak(u);
    };

    if (first && second) {
      speakUtter(first, text, () => speakUtter(second, text));
    } else {
      const v = first || second;
      speakUtter(v, text);
    }
  }

  function speakDualAsync(text) {
    return new Promise((resolve) => {
      try { window.speechSynthesis.cancel(); } catch (_) {}
      const voices = window.speechSynthesis.getVoices() || [];
      if (state.useBestVoiceAuto) autoSelectBestVoices(voices);

      const primary = resolveVoiceByName(state.voiceName) || resolveVoiceForLang(state.primaryLang) || resolveVoice();
      const secondary = resolveVoiceByName(state.voiceName2) || findAnyOtherVoice(primary);

      const first = state.dualOrderPrimaryFirst ? primary : secondary;
      const second = state.dualOrderPrimaryFirst ? secondary : primary;
      const firstLang = state.dualOrderPrimaryFirst ? state.voiceLang : state.voiceLang2;
      const secondLang = state.dualOrderPrimaryFirst ? state.voiceLang2 : state.voiceLang;

      if (!first && !second) { resolve(); return; }

      const speakUtter = (voice, txt) => {
        return new Promise((res) => {
          const u = new SpeechSynthesisUtterance(txt);
          if (voice) u.voice = voice;
          u.rate = 1;
          u.pitch = 1;
          u.volume = 1;
          u.onend = () => res();
          u.onerror = () => res();
          window.speechSynthesis.speak(u);
        });
      };

      const firstTargetLang = getTargetLangForVoice(first, firstLang);
      const secondTargetLang = getTargetLangForVoice(second, secondLang);

      Promise.all([
        translateText(text, firstTargetLang),
        translateText(text, secondTargetLang)
      ]).then(([firstText, secondText]) => {
        if (first && second) {
          speakUtter(first, firstText).then(() => speakUtter(second, secondText)).then(() => resolve());
        } else {
          const v = first || second;
          const t = first ? firstText : secondText;
          speakUtter(v, t).then(() => resolve());
        }
      }).catch(() => {
        if (first && second) {
          speakUtter(first, text).then(() => speakUtter(second, text)).then(() => resolve());
        } else {
          const v = first || second;
          speakUtter(v, text).then(() => resolve());
        }
      });
    });
  }

  function resolveVoiceByName(name) {
    if (!name) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find((x) => x.name === name) || null;
  }

  function resolveVoiceForLang(langCode) {
    if (!langCode) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const lc = String(langCode || "").toLowerCase();
    // prefer exact prefix match (e.g. "en" -> "en-US")
    const match = voices.find(v => String(v.lang || "").toLowerCase().startsWith(lc));
    if (match) return match;
    // fallback: any voice that contains the code
    return voices.find(v => String(v.lang || "").toLowerCase().includes(lc)) || null;
  }

  function findAnyOtherVoice(exclude) {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    if (!exclude) return voices[0];
    return voices.find((v) => v.name !== (exclude.name || "")) || null;
  }

  // Try to auto-select "best" voices: prefer localService & different languages if possible
  function autoSelectBestVoices(voices) {
    if (!voices || !voices.length) return;
    const primary = voices.find(v => v.localService && String(v.lang || "").toLowerCase().startsWith("en")) ||
                    voices.find(v => String(v.lang || "").toLowerCase().startsWith("en")) ||
                    voices[0];
    const secondary = voices.find(v => v.lang !== (primary && primary.lang)) || voices.find(v => v.name !== (primary && primary.name));
    if (primary) state.voiceName = primary.name;
    if (secondary) state.voiceName2 = secondary.name;
    localStorage.setItem("cabinPaVoice", state.voiceName || "");
    localStorage.setItem("cabinPaVoice2", state.voiceName2 || "");
  }

  function initVoices() {
    const fill = () => {
      const select = document.getElementById("cabin-pa-voice");
      const select2 = document.getElementById("cabin-pa-voice-2");
      if (!select || !select2) return;
      const voices = window.speechSynthesis.getVoices() || [];
      select.innerHTML = "";
      select2.innerHTML = "";
      
      // Comprehensive language list (one voice per language)
      const allLanguages = [
        { code: "ar", name: "Arabic" },
        { code: "bg", name: "Bulgarian" },
        { code: "ca", name: "Catalan" },
        { code: "cs", name: "Czech" },
        { code: "cy", name: "Welsh" },
        { code: "da", name: "Danish" },
        { code: "de", name: "German" },
        { code: "el", name: "Greek" },
        { code: "en", name: "English" },
        { code: "es", name: "Spanish" },
        { code: "et", name: "Estonian" },
        { code: "fi", name: "Finnish" },
        { code: "fil", name: "Filipino" },
        { code: "fr", name: "French" },
        { code: "he", name: "Hebrew" },
        { code: "hi", name: "Hindi" },
        { code: "hr", name: "Croatian" },
        { code: "hu", name: "Hungarian" },
        { code: "id", name: "Indonesian" },
        { code: "it", name: "Italian" },
        { code: "ja", name: "Japanese" },
        { code: "ko", name: "Korean" },
        { code: "lt", name: "Lithuanian" },
        { code: "lv", name: "Latvian" },
        { code: "nb", name: "Norwegian" },
        { code: "nl", name: "Dutch" },
        { code: "pl", name: "Polish" },
        { code: "pt", name: "Portuguese" },
        { code: "ro", name: "Romanian" },
        { code: "ru", name: "Russian" },
        { code: "sk", name: "Slovak" },
        { code: "sl", name: "Slovenian" },
        { code: "sv", name: "Swedish" },
        { code: "th", name: "Thai" },
        { code: "tr", name: "Turkish" },
        { code: "uk", name: "Ukrainian" },
        { code: "zh", name: "Chinese" }
      ];
      
      // First pass: collect native voices for each language
      const nativeVoicesByLang = {};
      allLanguages.forEach((lang) => {
        const voicesForLang = voices.filter(v => {
          const vLang = String(v.lang || "").toLowerCase();
          return vLang === lang.code || vLang.startsWith(lang.code + "-");
        });
        if (voicesForLang.length > 0) {
          const local = voicesForLang.find(v => v.localService);
          const chosen = local || voicesForLang[0];
          nativeVoicesByLang[lang.code] = chosen;
        }
      });
      
      // Find best voice for a language - ONLY SHOW LANGUAGES WITH NATIVE VOICES
      const getBestVoiceForLang = (langCode) => {
        // If this language has a native voice, use it
        if (nativeVoicesByLang[langCode]) {
          return { voice: nativeVoicesByLang[langCode], needsTranslation: false, langCode: null };
        }
        
        // NO FALLBACK - return null for languages without native voices
        return { voice: null, needsTranslation: false, langCode: null };
      };
      
      // Create one option per language - ONLY FOR LANGUAGES WITH NATIVE VOICES
      allLanguages.forEach((lang) => {
        const best = getBestVoiceForLang(lang.code);
        if (!best.voice) return;
        
        const opt = document.createElement("option");
        opt.value = best.voice.name;
        
        if (best.needsTranslation) {
          // Store language code for translation
          opt.dataset.translationLang = best.langCode;
          opt.textContent = lang.name + " (" + best.voice.name + " - translated)";
        } else {
          opt.textContent = lang.name + " (" + best.voice.name + ")";
        }
        
        select.appendChild(opt);
        const opt2 = opt.cloneNode(true);
        select2.appendChild(opt2);
      });
      
      const saved = state.voiceName || localStorage.getItem("cabinPaVoice");
      const saved2 = state.voiceName2 || localStorage.getItem("cabinPaVoice2");
      if (saved) {
        const match = Array.from(select.options).find((o) => o.value === saved);
        if (match) select.value = saved;
      }
      if (saved2) {
        const match2 = Array.from(select2.options).find((o) => o.value === saved2);
        if (match2) select2.value = saved2;
      }
      
      const dual = document.getElementById("cabin-pa-dual");
      const dualOrder = document.getElementById("cabin-pa-dual-order");
      const autoBest = document.getElementById("cabin-pa-auto-best");
      dual.checked = !!localStorage.getItem("cabinPaDual");
      dualOrder.checked = localStorage.getItem("cabinPaDualOrder") !== "0";
      autoBest.checked = localStorage.getItem("cabinPaAutoBest") === "1";
      state.dualEnabled = dual.checked;
      state.dualOrderPrimaryFirst = dualOrder.checked;
      state.useBestVoiceAuto = autoBest.checked;

      select.addEventListener("change", () => {
        state.voiceName = select.value;
        const selectedOpt = select.options[select.selectedIndex];
        state.voiceLang = selectedOpt.dataset.translationLang || null;
        localStorage.setItem("cabinPaVoice", state.voiceName);
      });
      select2.addEventListener("change", () => {
        state.voiceName2 = select2.value;
        const selectedOpt2 = select2.options[select2.selectedIndex];
        state.voiceLang2 = selectedOpt2.dataset.translationLang || null;
        localStorage.setItem("cabinPaVoice2", state.voiceName2);
      });

      buildLanguageList();
    };
    fill();
    if (typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = fill;
    }
    (function pollVoices(attemptsLeft = 12) {
      const v = (window.speechSynthesis && window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
      if (v && v.length) return;
      if (attemptsLeft <= 0) return;
      setTimeout(() => {
        fill();
        pollVoices(attemptsLeft - 1);
      }, 300);
    })();
  }

  function resolveVoice() {
    const voices = window.speechSynthesis.getVoices() || [];
    const name = state.voiceName || localStorage.getItem("cabinPaVoice");
    if (name) {
      const v = voices.find((x) => x.name === name);
      if (v) return v;
    }
    if (state.primaryLang) {
      const byLang = resolveVoiceForLang(state.primaryLang);
      if (byLang) return byLang;
    }
    const googleVoice = voices.find((x) => /Google/i.test(x.name));
    if (googleVoice) return googleVoice;
    const en = voices.find((x) => String(x.lang || "").toLowerCase().startsWith("en"));
    return en || voices[0] || null;
  }

  function loadVoicePreference() {
    const saved = localStorage.getItem("cabinPaVoice");
    if (saved) state.voiceName = saved;
    const saved2 = localStorage.getItem("cabinPaVoice2");
    if (saved2) state.voiceName2 = saved2;
    state.dualEnabled = localStorage.getItem("cabinPaDual") === "1";
    state.dualOrderPrimaryFirst = localStorage.getItem("cabinPaDualOrder") !== "0";
    state.useBestVoiceAuto = localStorage.getItem("cabinPaAutoBest") === "1";
    state.primaryLang = localStorage.getItem("cabinPaPrimaryLang") || null;
  }

  function loadFlightInfo() {
    const a = localStorage.getItem("cabinPaAirline") || "";
    const f = localStorage.getItem("cabinPaFlight") || "";
    const d = localStorage.getItem("cabinPaDestination") || "";
    state.airlineName = a;
    state.flightNumber = f;
    state.destination = d;
    const ai = document.getElementById("cabin-pa-airline");
    const fi = document.getElementById("cabin-pa-flight");
    const di = document.getElementById("cabin-pa-destination");
    if (ai) ai.value = a;
    if (fi) fi.value = f;
    if (di) di.value = d;
  }

  function onFlightInfoChange() {
    const ai = document.getElementById("cabin-pa-airline");
    const fi = document.getElementById("cabin-pa-flight");
    const di = document.getElementById("cabin-pa-destination");
    state.airlineName = ai ? ai.value.trim() : "";
    state.flightNumber = fi ? fi.value.trim() : "";
    state.destination = di ? di.value.trim() : "";
    localStorage.setItem("cabinPaAirline", state.airlineName || "");
    localStorage.setItem("cabinPaFlight", state.flightNumber || "");
    localStorage.setItem("cabinPaDestination", state.destination || "");
  }

  // language picker helpers -----------------------------------------------
  function showLanguagePicker() {
    const picker = document.getElementById("cabin-pa-lang-picker");
    if (!picker) return;
    picker.style.display = "block";
    // ensure list built (voices may load later)
    buildLanguageList();
  }

  function hideLanguagePicker() {
    const picker = document.getElementById("cabin-pa-lang-picker");
    if (!picker) return;
    picker.style.display = "none";
  }

  function buildLanguageList() {
    const listEl = document.getElementById("cabin-pa-lang-list");
    if (!listEl) return;
    
    // Predefined comprehensive language list
    const allLanguages = [
      { code: "ar", name: "Arabic" },
      { code: "bg", name: "Bulgarian" },
      { code: "ca", name: "Catalan" },
      { code: "cs", name: "Czech" },
      { code: "cy", name: "Welsh" },
      { code: "da", name: "Danish" },
      { code: "de", name: "German" },
      { code: "el", name: "Greek" },
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "et", name: "Estonian" },
      { code: "fi", name: "Finnish" },
      { code: "fil", name: "Filipino" },
      { code: "fr", name: "French" },
      { code: "he", name: "Hebrew" },
      { code: "hi", name: "Hindi" },
      { code: "hr", name: "Croatian" },
      { code: "hu", name: "Hungarian" },
      { code: "id", name: "Indonesian" },
      { code: "it", name: "Italian" },
      { code: "ja", name: "Japanese" },
      { code: "ko", name: "Korean" },
      { code: "lt", name: "Lithuanian" },
      { code: "lv", name: "Latvian" },
      { code: "nb", name: "Norwegian" },
      { code: "nl", name: "Dutch" },
      { code: "pl", name: "Polish" },
      { code: "pt", name: "Portuguese" },
      { code: "ro", name: "Romanian" },
      { code: "ru", name: "Russian" },
      { code: "sk", name: "Slovak" },
      { code: "sl", name: "Slovenian" },
      { code: "sv", name: "Swedish" },
      { code: "th", name: "Thai" },
      { code: "tr", name: "Turkish" },
      { code: "uk", name: "Ukrainian" },
      { code: "zh", name: "Chinese" }
    ];
    
    const voices = window.speechSynthesis.getVoices() || [];
    const availableLangs = new Set();
    voices.forEach(v => {
      const lc = String(v.lang || "").split("-")[0].toLowerCase();
      availableLangs.add(lc);
    });
    
    listEl.innerHTML = "";
    allLanguages.forEach(lang => {
      const li = document.createElement("li");
      const available = availableLangs.has(lang.code);
      li.textContent = lang.name + (available ? " ✓" : "");
      li.title = lang.code + (available ? " (Available)" : " (No voice available)");
      li.style.opacity = available ? "1" : "0.5";
      li.addEventListener("click", () => {
        setPrimaryLanguage(lang.code);
        hideLanguagePicker();
      });
      listEl.appendChild(li);
    });
  }

  function setPrimaryLanguage(code) {
    state.primaryLang = code || null;
    if (state.primaryLang) localStorage.setItem("cabinPaPrimaryLang", state.primaryLang);
    else localStorage.removeItem("cabinPaPrimaryLang");
    // set voiceName to a voice matching that language if possible
    const v = resolveVoiceForLang(state.primaryLang);
    if (v) {
      state.voiceName = v.name;
      localStorage.setItem("cabinPaVoice", state.voiceName);
      // update select UI if present
      const sel = document.getElementById("cabin-pa-voice");
      if (sel) {
        const opt = Array.from(sel.options).find(o => o.value === v.name);
        if (opt) sel.value = v.name;
      }
    }
    updateLanguageDisplay();
  }

  function updateLanguageDisplay() {
    const el = document.getElementById("cabin-pa-lang-selected");
    if (!el) return;
    el.textContent = state.primaryLang ? state.primaryLang : "None";
  }
  // -----------------------------------------------------------------------

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

  // Update check functions
  async function checkForUpdates() {
    try {
      const repoUrl = "https://api.github.com/repos/blueaviation024/GeoFS-Cabin-PA/commits?per_page=1";
      const response = await fetch(repoUrl, { method: 'GET', mode: 'cors' });
      if (!response.ok) return;
      const commits = await response.json();
      if (!Array.isArray(commits) || commits.length === 0) return;
      
      const latestCommit = commits[0].sha;
      const storedCommit = localStorage.getItem("cabinPaLastCommit");
      
      if (storedCommit && storedCommit !== latestCommit) {
        // Update available!
        showUpdateNotification();
      }
      localStorage.setItem("cabinPaLastCommit", latestCommit);
    } catch (e) {
      console.warn("Failed to check for updates:", e);
    }
  }

  function showUpdateNotification() {
    // Create modal overlay for update
    const updateModal = document.createElement("div");
    updateModal.id = "cabin-pa-update-modal";
    updateModal.style.cssText = 
      "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)";
    
    const modalContent = document.createElement("div");
    modalContent.style.cssText =
      "background:#fff;border-radius:10px;padding:20px;width:90%;max-width:400px;box-shadow:0 12px 40px rgba(0,0,0,.25);text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
    
    const title = document.createElement("h2");
    title.textContent = "Update Available!";
    title.style.cssText = "margin:0 0 10px 0;color:#0d47a1;font-size:18px";
    
    const message = document.createElement("p");
    message.textContent = "A new version of Cabin PA is available. Click the button below to update.";
    message.style.cssText = "margin:0 0 15px 0;color:#666;font-size:14px;line-height:1.5";
    
    const updateBtn = document.createElement("button");
    updateBtn.textContent = "Update Script";
    updateBtn.style.cssText = 
      "background:#00a8ff;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;margin-right:8px;transition:all .2s";
    updateBtn.onmouseover = () => updateBtn.style.background = "#0091d9";
    updateBtn.onmouseout = () => updateBtn.style.background = "#00a8ff";
    updateBtn.onclick = () => {
      window.open("https://github.com/blueaviation024/GeoFS-Cabin-PA/blob/main/cabin-pa.js", "_blank");
      dismissUpdateModal(updateModal);
    };
    
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "Later";
    dismissBtn.style.cssText =
      "background:#f0f0f0;color:#1a1a1a;border:1px solid #d0d0d0;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:all .2s";
    dismissBtn.onmouseover = () => dismissBtn.style.background = "#e8e8e8";
    dismissBtn.onmouseout = () => dismissBtn.style.background = "#f0f0f0";
    dismissBtn.onclick = () => dismissUpdateModal(updateModal);
    
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = "display:flex;gap:8px;justify-content:center";
    buttonContainer.appendChild(updateBtn);
    buttonContainer.appendChild(dismissBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(message);
    modalContent.appendChild(buttonContainer);
    updateModal.appendChild(modalContent);
    
    document.body.appendChild(updateModal);
  }

  function dismissUpdateModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
