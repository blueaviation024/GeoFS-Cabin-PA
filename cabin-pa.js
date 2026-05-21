// ==UserScript==
// @name         Cabin PA addon for GeoFS
// @namespace    https://geofs-cabin-pa.local
// @version      1.8.5
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
    primaryLang: null // new: selected primary language code (e.g. "en", "es")
  };

  const messages = {
    boarding: "Welcome aboard your {airline} flight {flight} bound for {dest}. We are glad to have you onboard with us. As we prepare for departure, please stow carry-on items, fasten your seat belts, and ensure electronic devices are in flight safe mode. If this is not your flight, please don't hesitate to ask a crew member for help.",
    boardingDoorOpen: "The boarding door has been opened; passengers may now disembark.",
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
  }

  function injectStyles() {
    const s = document.createElement("style");
    s.textContent =
      "#cabin-pa-panel{position:fixed;top:16px;right:16px;width:420px;background:rgba(22,23,26,.92);color:#fff;border-radius:10px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(6px);z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
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
      "#cabin-pa-overlay{position:fixed;inset:0;background:transparent;z-index:999998;display:none}" +
      "#cabin-pa-panel .meta-label{font-size:12px;opacity:.85;width:100%}" +
      /* language picker modal */
      "#cabin-pa-lang-picker{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:320px;max-height:60vh;overflow:auto;background:#121316;border-radius:10px;padding:10px;z-index:1000001;display:none;box-shadow:0 8px 24px rgba(0,0,0,.6)}" +
      "#cabin-pa-lang-picker h3{margin:0 0 8px 0;font-size:14px}" +
      "#cabin-pa-lang-picker ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}" +
      "#cabin-pa-lang-picker li{background:#1f2228;padding:8px;border-radius:6px;cursor:pointer;text-align:center}" +
      "#cabin-pa-lang-picker li:hover{background:#2b2f36}";
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

    v1.addEventListener("change", () => { state.voiceName = v1.value; localStorage.setItem("cabinPaVoice", state.voiceName); });
    v2.addEventListener("change", () => { state.voiceName2 = v2.value; localStorage.setItem("cabinPaVoice2", state.voiceName2); });

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

  function getTargetLangForVoice(voice) {
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
    const targetLang = getTargetLangForVoice(voice);
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
      const targetLang = getTargetLangForVoice(voice);
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

      const firstLang = getTargetLangForVoice(first);
      const secondLang = getTargetLangForVoice(second);

      Promise.all([
        translateText(text, firstLang),
        translateText(text, secondLang)
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
      voices.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = v.name + " (" + (v.lang || "unknown") + (v.localService ? " local" : "") + ")";
        select.appendChild(opt);
        const opt2 = opt.cloneNode(true);
        select2.appendChild(opt2);
      });
      const saved = state.voiceName || localStorage.getItem("cabinPaVoice");
      const saved2 = state.voiceName2 || localStorage.getItem("cabinPaVoice2");
      if (saved) {
        const match = Array.from(select.options).find((o) => o.value === saved);
        if (match) select.value = saved;
      } else if (voices.length) {
        const g = voices.find(v => /Google/i.test(v.name));
        if (g) {
          state.voiceName = g.name;
          localStorage.setItem("cabinPaVoice", state.voiceName);
          const opt = Array.from(select.options).find(o => o.value === g.name);
          if (opt) select.value = g.name;
        }
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
        localStorage.setItem("cabinPaVoice", state.voiceName);
      });
      select2.addEventListener("change", () => {
        state.voiceName2 = select2.value;
        localStorage.setItem("cabinPaVoice2", state.voiceName2);
      });

      // populate language picker list now that voices are available
      buildLanguageList();
    };
    fill();
    // assign callback for onvoiceschanged
    if (typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = fill;
    }
    // polling fallback for environments where onvoiceschanged may not fire or is delayed
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
    const voices = window.speechSynthesis.getVoices() || [];
    // collect unique language codes and prefer shorter codes (e.g. "en")
    const map = {};
    voices.forEach(v => {
      const lc = String(v.lang || "unknown").split("-")[0].toLowerCase();
      if (!map[lc]) map[lc] = { code: lc, sample: v.lang || "", voices: [v] };
      else map[lc].voices.push(v);
    });
    const items = Object.values(map).sort((a,b) => a.code.localeCompare(b.code));
    listEl.innerHTML = "";
    items.forEach(it => {
      const li = document.createElement("li");
      li.textContent = it.code + (it.sample && it.sample !== it.code ? " (" + it.sample + ")" : "");
      li.title = "Voices: " + it.voices.map(v => v.name).join(", ");
      li.addEventListener("click", () => {
        setPrimaryLanguage(it.code);
        hideLanguagePicker();
      });
      listEl.appendChild(li);
    });
    if (!items.length) {
      listEl.innerHTML = '<li style="grid-column:1/-1">No voices available</li>';
    }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
