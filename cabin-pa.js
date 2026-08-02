// ==UserScript==
// @name         Cabin PA addon for GeoFS
// @namespace    https://geofs-cabin-pa.local
// @version      2.1.5
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
    activeTab: "main"
  };

  const messages = {
    boarding: "Welcome onboard your {airline} flight {flight} to {dest}. Please stow your carry-on items, fasten your seatbelt, and prepare for departure.",
    boardingDoorOpen: "The boarding door is now open. Passengers may now disembark. Please follow the cabin crew instructions and exit the aircraft in an orderly manner. Thank yuo for flying {airline} and enjoy your stay in {dest}.",
    safety: "Ladies and gentlemen, please pay attention to the safety demonstration. Secure all carry-on items and follow the cabin crew instructions.",
    takeoff: "Cabin crew, takeoff stations. We are now about to take off. Please ensure your seatbacks and tray tables are in their full upright position, and your seatbelts are securely fastened.",
    cruise: "Ladies and gentlemen, we have reached cruising altitude. You may now use approved electronic devices and refreshments will be served shortly. Please check the menu for available options.",
    descent: "Ladies and gentlemen, we are beginning our descent into {dest}. Please return your seat backs and tray tables to their full upright position and fasten your seatbelts. Cabin crew will be coming through the cabin to collect any remaining service items. Thank you for flying {airline}.",
    landing: "Cabin crew, prepare for arrival. We are now in our final descent. Please ensure your seatbacks and tray tables are in their full upright position, and your seatbelts are securely fastened. We will be landing shortly.",
    taxiin: "Hello everyone, {airline} welcomes you to {dest}. Please remain seated with your seatbelt fastened until the aircraft has come to a complete stop and the seatbelt sign has been turned off. Please check your surroundings to ensure if you never leave any of your belongings. Be cautious when opening the overhead bins, as items may have shifted during the flight. On behalf of the captain, first officer, and the rest of the team, we thank you for choosing {airline}. We hope you had a pleasant journey and look forward to welcoming you on board again soon.",
    seatbeltOn: "The captain has switched on the fasten seatbelt sign. Please return to your seat and fasten your seatbelt. Thank you for your cooperation.",
    seatbeltOff: "The captain has switched off the fasten seatbelt sign. You may now move about the cabin, but please keep your seatbelt fastened while seated.",
    safetyVideoIntro: "At {airline}, your safety is our top priority. Please pay attention to the following safety demonstration video. It contains important information about the aircraft and emergency procedures. We appreciate your attention to keep you safe and comfortable during your flight."
  };

  const languageGroups = [
    {
      group: "English",
      languages: [
        { code: "en-US", name: "American English" },
        { code: "en-GB", name: "British English" },
        { code: "en-AU", name: "Australian English" },
        { code: "en-CA", name: "Canadian English" },
        { code: "en-IN", name: "Indian English" },
        { code: "en-IE", name: "Irish English" },
        { code: "en-ZA", name: "South African English" }
      ]
    },
    {
      group: "Spanish",
      languages: [
        { code: "es-ES", name: "Spanish (Spain)" },
        { code: "es-MX", name: "Spanish (Mexico)" },
        { code: "es-AR", name: "Spanish (Argentina)" },
        { code: "es-CO", name: "Spanish (Colombia)" },
        { code: "es-US", name: "Spanish (United States)" }
      ]
    },
    {
      group: "French",
      languages: [
        { code: "fr-FR", name: "French (France)" },
        { code: "fr-CA", name: "French (Canada)" },
        { code: "fr-BE", name: "French (Belgium)" },
        { code: "fr-CH", name: "French (Switzerland)" }
      ]
    },
    {
      group: "Chinese",
      languages: [
        { code: "zh-CN", name: "Chinese (Mandarin, Mainland)" },
        { code: "zh-TW", name: "Chinese (Mandarin, Taiwan)" },
        { code: "zh-HK", name: "Chinese (Cantonese, Hong Kong)" }
      ]
    },
    {
      group: "Portuguese",
      languages: [
        { code: "pt-PT", name: "Portuguese (Portugal)" },
        { code: "pt-BR", name: "Portuguese (Brazil)" }
      ]
    },
    {
      group: "German",
      languages: [
        { code: "de-DE", name: "German (Germany)" },
        { code: "de-AT", name: "German (Austria)" },
        { code: "de-CH", name: "German (Switzerland)" }
      ]
    },
    {
      group: "Arabic",
      languages: [
        { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
        { code: "ar-EG", name: "Arabic (Egypt)" },
        { code: "ar-AE", name: "Arabic (UAE)" }
      ]
    },
    {
      group: "Hindi",
      languages: [
        { code: "hi-IN", name: "Hindi" }
      ]
    },
    {
      group: "Tamil",
      languages: [
        { code: "ta-IN", name: "Tamil" }
      ]
    },
    {
      group: "Malay",
      languages: [
        { code: "ms-MY", name: "Malay" }
      ]
    },
    {
      group: "Asian",
      languages: [
        { code: "id-ID", name: "Indonesian" },
        { code: "fil-PH", name: "Filipino" },
        { code: "th-TH", name: "Thai" },
        { code: "vi-VN", name: "Vietnamese" },
        { code: "ja-JP", name: "Japanese" },
        { code: "ko-KR", name: "Korean" }
      ]
    },
    {
      group: "Other",
      languages: [
        { code: "ru-RU", name: "Russian" },
        { code: "it-IT", name: "Italian" },
        { code: "nl-NL", name: "Dutch" },
        { code: "sv-SE", name: "Swedish" },
        { code: "nb-NO", name: "Norwegian" },
        { code: "da-DK", name: "Danish" },
        { code: "fi-FI", name: "Finnish" },
        { code: "cs-CZ", name: "Czech" },
        { code: "sk-SK", name: "Slovak" },
        { code: "sl-SI", name: "Slovenian" },
        { code: "pl-PL", name: "Polish" },
        { code: "hr-HR", name: "Croatian" },
        { code: "hu-HU", name: "Hungarian" },
        { code: "ro-RO", name: "Romanian" },
        { code: "bg-BG", name: "Bulgarian" },
        { code: "lv-LV", name: "Latvian" },
        { code: "lt-LT", name: "Lithuanian" },
        { code: "el-GR", name: "Greek" },
        { code: "cy-GB", name: "Welsh" },
        { code: "ca-ES", name: "Catalan" },
        { code: "he-IL", name: "Hebrew" },
        { code: "tr-TR", name: "Turkish" },
        { code: "uk-UA", name: "Ukrainian" },
        { code: "et-EE", name: "Estonian" },
        { code: "af-ZA", name: "Afrikaans" },
        { code: "sw-KE", name: "Swahili" }
      ]
    }
  ];

  function getAllLanguages() {
    return languageGroups.flatMap(group => group.languages);
  }

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
      "#cabin-pa-panel .tab-bar{display:flex;gap:6px;margin:8px 0 12px 0}" +
      "#cabin-pa-panel .tab-bar button{flex:1;padding:8px 10px;border:none;border-radius:8px;background:#f0f0f0;color:#1a1a1a;cursor:pointer;font-weight:700;transition:all .2s;border:1px solid #e0e0e0;font-size:12px}" +
      "#cabin-pa-panel .tab-bar button.active{background:#00a8ff;color:#fff;border-color:#00a8ff;}" +
      "#cabin-pa-panel .tab-content{display:none}" +
      "#cabin-pa-panel .tab-content.active{display:block}" +
      "#cabin-pa-panel .seatmap-status{margin-bottom:8px;font-size:12px;color:#333}" +
      "#cabin-pa-panel .seatmap-grid{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow:auto;padding:6px;background:#f7fbff;border:1px solid #d7eaff;border-radius:10px;}" +
      "#cabin-pa-panel .seatmap-row{display:flex;align-items:center;gap:6px;}" +
      "#cabin-pa-panel .seatmap-row-label{width:24px;font-size:11px;color:#555;text-align:right;margin-right:4px;flex-shrink:0;}" +
      "#cabin-pa-panel .seatmap-seat-group{display:flex;gap:4px;}" +
      "#cabin-pa-panel .seat-cell{width:20px;height:18px;background:#d8e8ff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#0f1a2b;box-shadow:inset 0 1px 0 rgba(255,255,255,.7);position:relative;}" +
      "#cabin-pa-panel .seatmap-seat-group .seat-dot{width:6px;height:6px;border-radius:50%;position:absolute;bottom:2px;right:2px;box-shadow:0 0 0 1px rgba(255,255,255,.6);}" +
      "#cabin-pa-panel .seatmap-seat-group .seat-dot.passenger{background:#e53935;}" +
      "#cabin-pa-panel .seatmap-seat-group .seat-dot.crew{background:#43a047;}" +
      "#cabin-pa-panel .seatmap-aisle{width:10px;flex-shrink:0;}" +
      "#cabin-pa-panel .seatmap-legend{display:flex;gap:10px;align-items:center;margin-bottom:8px;font-size:11px;color:#555;}" +
      "#cabin-pa-panel .seatmap-legend span{display:flex;align-items:center;gap:4px;}" +
      "#cabin-pa-panel .seatmap-legend .dot{width:10px;height:10px;border-radius:50%;display:inline-block;}" +
      "#cabin-pa-panel .seatmap-note{font-size:11px;color:#666;margin-top:8px;line-height:1.4;}" +
      "#cabin-pa-panel .row{display:flex;gap:6px;flex-wrap:wrap;margin:5px 0}" +
      "#cabin-pa-panel button{flex:1;padding:7px 10px;border:none;border-radius:7px;background:#f0f0f0;color:#1a1a1a;cursor:pointer;font-weight:600;transition:all .2s;border:1px solid #e0e0e0;font-size:12px}" +
      "#cabin-pa-panel button:hover{background:#e8e8e8;border-color:#d0d0d0}" +
      "#cabin-pa-panel .accent{background:#00a8ff;color:#fff;border-color:#00a8ff}" +
      "#cabin-pa-panel .accent:hover{background:#0091d9;border-color:#0091d9}" +
      "#cabin-pa-panel .discord-link{font-size:12px;color:#00a8ff;text-decoration:underline;cursor:pointer;display:inline-block;margin-bottom:6px;}" +
      "#cabin-pa-panel .discord-link:hover{color:#0077cc;}" +
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
      "#cabin-pa-lang-picker li:hover{background:#00a8ff;color:#fff;border-color:#00a8ff}" +
      "#cabin-pa-lang-picker li.group-heading{grid-column:1/-1;background:transparent;border:none;color:#0d47a1;font-weight:700;cursor:default;padding:6px 0 2px 0;opacity:1}" +
      "#cabin-pa-lang-picker li.group-heading:hover{background:transparent;color:#0d47a1;border:none}";
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
    if (visible) {
      loadSeatMap();
    }
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
      '<div class="row small"><a class="discord-link" href="https://discord.gg/edYvUfb2jj" target="_blank" rel="noopener">Join the official addon server</a></div>' +
      '<div class="cabin-pa-tab-bar">' +
      '<button type="button" data-tab="main" class="active">Controls</button>' +
      '<button type="button" data-tab="seatmap">Seat Map</button>' +
      '</div>' +
      '<div id="cabin-pa-tab-main" class="tab-content active">' +
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
      '<div class="row small"><span id="cabin-pa-boarding-status">No boarding music attached</span><span style="margin-left:auto">Shortcut: Shift+P</span></div>' +
      '</div>' +
      '<div id="cabin-pa-tab-seatmap" class="tab-content" style="display:none;">' +
      '<div class="seatmap-status" id="cabin-pa-seatmap-status">Detecting aircraft...</div>' +
      '<div class="seatmap-legend"><span><i class="dot" style="background:#e53935"></i>Passengers</span><span><i class="dot" style="background:#43a047"></i>Cabin crew</span></div>' +
      '<div id="cabin-pa-seatmap-container" class="seatmap-grid"></div>' +
      '<div class="seatmap-note">If GeoFS aircraft data is available, Cabin PA will attempt to display the aircraft seating layout here.</div>' +
      '</div>';
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
    if (t.dataset.tab) {
      switchTab(t.dataset.tab);
      return;
    }
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

  function getSpeechVoices() {
    return (window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function')
      ? window.speechSynthesis.getVoices() || []
      : [];
  }

  async function translateText(text, targetLang) {
    if (!text || !targetLang || isEnglishLang(targetLang)) return text;
    if (typeof fetch !== 'function') return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
      const resp = await fetch(url);
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
    if (!isEnglishLang(targetLang)) {
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
      if (!isEnglishLang(targetLang)) {
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
    const primary = resolveVoiceByName(state.voiceName) || resolveVoiceForLang(state.primaryLang);
    const secondary = resolveVoiceByName(state.voiceName2) || null;

    const first = state.dualOrderPrimaryFirst ? primary : secondary;
    const second = state.dualOrderPrimaryFirst ? secondary : primary;

    if (!first && !second) {
      speakUtterance(text, null);
      return;
    }

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

      const primary = resolveVoiceByName(state.voiceName) || resolveVoiceForLang(state.primaryLang);
      const secondary = resolveVoiceByName(state.voiceName2) || null;

      const first = state.dualOrderPrimaryFirst ? primary : secondary;
      const second = state.dualOrderPrimaryFirst ? secondary : primary;
      const firstLang = state.dualOrderPrimaryFirst ? state.voiceLang : state.voiceLang2;
      const secondLang = state.dualOrderPrimaryFirst ? state.voiceLang2 : state.voiceLang;

      if (!first && !second) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
        return;
      }

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
    const voices = getSpeechVoices();
    return voices.find((x) => x.name === name) || null;
  }

  function getVoicesForLanguage(langCode, voices) {
    if (!langCode || !voices || !voices.length) return [];
    const normalizedLang = String(langCode || "").toLowerCase();
    return voices.filter((v) => {
      const vLang = String(v.lang || "").toLowerCase();
      return vLang === normalizedLang || vLang.startsWith(normalizedLang + "-");
    });
  }

  function choosePreferredVoiceForLanguage(langCode, voices) {
    const candidates = getVoicesForLanguage(langCode, voices);
    if (!candidates.length) return null;
    const male = candidates.find((v) => /male/i.test(v.name));
    if (male) return male;
    const local = candidates.find((v) => v.localService);
    return local || candidates[0];
  }

  function resolveVoiceForLang(langCode) {
    if (!langCode) return null;
    const voices = getSpeechVoices();
    return choosePreferredVoiceForLanguage(langCode, voices);
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
      const allLanguages = getAllLanguages();

      // Collect matching voices for each language variant so all available voices can be shown
      const voicesByLang = {};
      allLanguages.forEach((lang) => {
        const matches = getVoicesForLanguage(lang.code, voices);
        if (matches.length > 0) {
          voicesByLang[lang.code] = matches;
        }
      });

      // Create one option per actual voice for each language variant
      languageGroups.forEach((group) => {
        const groupEl = document.createElement("optgroup");
        groupEl.label = group.group;
        group.languages.forEach((lang) => {
          const matches = voicesByLang[lang.code];
          if (!matches || !matches.length) return;

          matches.forEach((voice) => {
            const opt = document.createElement("option");
            opt.value = voice.name;
            opt.textContent = lang.name + " (" + voice.name + ")";
            groupEl.appendChild(opt);
          });
        });
        if (groupEl.children.length) {
          select.appendChild(groupEl);
          select2.appendChild(groupEl.cloneNode(true));
        }
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
    const voices = getSpeechVoices();
    const name = state.voiceName || localStorage.getItem("cabinPaVoice");
    if (name) {
      const v = voices.find((x) => x.name === name);
      if (v) return v;
      // If the saved voice is no longer available, fall back instead of stopping speech entirely.
    }
    if (state.primaryLang) {
      const langVoice = resolveVoiceForLang(state.primaryLang);
      if (langVoice) return langVoice;
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
    listEl.innerHTML = "";
    languageGroups.forEach((group) => {
      const header = document.createElement("li");
      header.className = "group-heading";
      header.textContent = group.group;
      listEl.appendChild(header);

      group.languages.forEach((lang) => {
        const li = document.createElement("li");
        const available = voices.some((v) => {
          const vLang = String(v.lang || "").toLowerCase();
          const target = String(lang.code || "").toLowerCase();
          return vLang === target || vLang.startsWith(target + "-");
        });
        li.textContent = lang.name + (available ? " ✓" : "");
        li.title = lang.code + (available ? " (Available)" : " (No voice available)");
        li.style.opacity = available ? "1" : "0.5";
        li.style.cursor = available ? "pointer" : "default";
        if (available) {
          li.addEventListener("click", () => {
            setPrimaryLanguage(lang.code);
            hideLanguagePicker();
          });
        }
        listEl.appendChild(li);
      });
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

  function switchTab(tab) {
    const mainTab = document.getElementById("cabin-pa-tab-main");
    const seatTab = document.getElementById("cabin-pa-tab-seatmap");
    const buttons = Array.from(document.querySelectorAll("#cabin-pa-panel .cabin-pa-tab-bar button"));
    buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    if (mainTab) mainTab.style.display = tab === "main" ? "block" : "none";
    if (seatTab) seatTab.style.display = tab === "seatmap" ? "block" : "none";
    state.activeTab = tab;
    if (tab === "seatmap") loadSeatMap();
  }

  function detectAircraftInfoFromGeoFS() {
    try {
      const g = window.geofs || window.Geofs || window.geofsApp || window.geoFS || null;
      if (g) {
        if (g.aircraft) {
          const a = g.aircraft;
          if (typeof a === "string") return { name: a };
          if (a.name || a.title || a.model) {
            return { name: a.name || a.title || a.model, id: a.id || a.icao || a.type, type: a.type || a.category };
          }
          if (a.aircraftName) return { name: a.aircraftName, id: a.aircraftId || a.id };
        }
        if (g.activeAircraft) {
          const a = g.activeAircraft;
          if (a.name || a.title || a.model) {
            return { name: a.name || a.title || a.model, id: a.id || a.icao || a.type, type: a.type || a.category };
          }
        }
      }
      if (window.aircraft) {
        const a = window.aircraft;
        if (a.name || a.model) return { name: a.name || a.model, id: a.id || a.icao, type: a.type || a.category };
      }
    } catch (_) {}
    return null;
  }

  function getSeatMapTemplate(aircraftName) {
    const normalized = String(aircraftName || "").toLowerCase();
    const templates = [
      {match: /boeing\s*737|737/, name: "Boeing 737", pattern: "ABC_DEF", rows: 25},
      {match: /airbus\s*a320|a320/, name: "Airbus A320", pattern: "ABC_DEF", rows: 30},
      {match: /airbus\s*a321|a321/, name: "Airbus A321", pattern: "ABC_DEF", rows: 30},
      {match: /airbus\s*a330|a330/, name: "Airbus A330", pattern: "AB_CDEF_GH", rows: 34},
      {match: /airbus\s*a350|a350/, name: "Airbus A350", pattern: "ABC_DEFG_HIJ", rows: 36},
      {match: /boeing\s*777|777/, name: "Boeing 777", pattern: "ABC_DEFG_HIJ", rows: 40},
      {match: /boeing\s*787|787/, name: "Boeing 787", pattern: "ABC_DEF_GHI", rows: 35},
      {match: /embraer\s*190|e190/, name: "Embraer 190", pattern: "AB_CD", rows: 28},
      {match: /dash\s*8|q400|dhc-8/, name: "Bombardier Q400", pattern: "AB_CD", rows: 26}
    ];
    const found = templates.find((t) => t.match.test(normalized));
    if (found) return found;
    if (/airbus|boeing|777|787|a330|a350|a340/i.test(normalized)) {
      return {name: aircraftName, pattern: "ABC_DEFG_HIJ", rows: 36};
    }
    return {name: aircraftName, pattern: "ABC_DEF", rows: 28};
  }

  function renderSeatMap(aircraftName) {
    const container = document.getElementById("cabin-pa-seatmap-container");
    const status = document.getElementById("cabin-pa-seatmap-status");
    if (!container || !status) return;
    const template = getSeatMapTemplate(aircraftName || "Unknown aircraft");
    status.textContent = aircraftName ? `Detected aircraft: ${template.name}` : "Aircraft type unavailable";
    container.innerHTML = "";
    const rows = template.rows || 28;
    const groups = String(template.pattern).split("_");
    for (let row = 1; row <= rows; row++) {
      const rowEl = document.createElement("div");
      rowEl.className = "seatmap-row";
      const label = document.createElement("div");
      label.className = "seatmap-row-label";
      label.textContent = row;
      rowEl.appendChild(label);
      groups.forEach((group, index) => {
        if (index > 0) {
          const aisle = document.createElement("div");
          aisle.className = "seatmap-aisle";
          rowEl.appendChild(aisle);
        }
        const groupEl = document.createElement("div");
        groupEl.className = "seatmap-seat-group";
        for (const seat of group) {
          const seatEl = document.createElement("div");
          seatEl.className = "seat-cell";
          seatEl.textContent = `${row}${seat}`;
          const occupancyType = row === 1 ? "crew" : "passenger";
          const dot = document.createElement("span");
          dot.className = `seat-dot ${occupancyType}`;
          seatEl.appendChild(dot);
          groupEl.appendChild(seatEl);
        }
        rowEl.appendChild(groupEl);
      });
      container.appendChild(rowEl);
    }
  }

  function normalizeAircraftCandidate(item) {
    if (!item || typeof item !== "object") return null;
    const name = item.name || item.title || item.model || item.aircraftName || "";
    const id = item.id || item.icao || item.type || item.aircraftId || name;
    if (!name) return null;
    return { item, name: String(name), id: String(id || name) };
  }

  function findGeoFSAircraftArrays() {
    const seenKeys = new Set();
    const candidates = [];

    function scanArray(arr) {
      if (!Array.isArray(arr) || !arr.length) return;
      const normalized = arr
        .map(normalizeAircraftCandidate)
        .filter(Boolean);
      if (!normalized.length) return;
      const key = normalized.map((x) => x.id).join("|");
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      candidates.push(arr);
    }

    const roots = [window.geofs, window.Geofs, window.geofsApp, window.geoFS, window];
    roots.forEach((root) => {
      if (!root || typeof root !== "object") return;
      scanArray(root.aircrafts);
      scanArray(root.aircraftList);
      scanArray(root.aircraft);
      scanArray(root.aircraftData);
      scanArray(root.fleet);
    });

    for (const key in window) {
      if (!Object.prototype.hasOwnProperty.call(window, key)) continue;
      if (!/aircraft|plane|fleet|model/i.test(key)) continue;
      scanArray(window[key]);
    }

    return candidates.length ? candidates : null;
  }

  async function fetchGeoFSAircraftList() {
    const localAircraftArrays = findGeoFSAircraftArrays();
    if (localAircraftArrays && localAircraftArrays.length) {
      const merged = [];
      const seen = new Set();
      localAircraftArrays.forEach((arr) => {
        arr.forEach((item) => {
          const normalized = normalizeAircraftCandidate(item);
          if (!normalized) return;
          if (seen.has(normalized.id)) return;
          seen.add(normalized.id);
          merged.push(item);
        });
      });
      if (merged.length) return merged;
    }

    if (typeof fetch !== 'function') return null;
    const endpoints = ["/api/aircrafts", "/api/v1/aircrafts", "/api/v2/aircrafts"];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.aircrafts)) return data.aircrafts;
        if (data && Array.isArray(data.data)) return data.data;
      } catch (_) {}
    }
    return null;
  }

  async function loadSeatMap() {
    const status = document.getElementById("cabin-pa-seatmap-status");
    const container = document.getElementById("cabin-pa-seatmap-container");
    if (!status || !container) return;
    status.textContent = "Detecting aircraft from GeoFS...";
    container.innerHTML = "";
    const pageInfo = detectAircraftInfoFromGeoFS();
    if (pageInfo && pageInfo.name) {
      renderSeatMap(pageInfo.name);
      return;
    }
    const list = await fetchGeoFSAircraftList();
    if (list && list.length) {
      const found = list.find((item) => {
        const name = String(item.name || item.title || item.model || "").toLowerCase();
        return name && (/boeing\s*737|a320|a330|a350|777|787|embraer|q400|dash\s*8/.test(name));
      });
      if (found) {
        renderSeatMap(found.name || found.model || found.title || "Unknown aircraft");
        return;
      }
    }
    status.textContent = "Unable to detect aircraft details from GeoFS.";
    container.innerHTML = "<div style='font-size:12px;color:#555;'>Seat map unavailable. Ensure GeoFS aircraft data is loaded and try again.</div>";
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
    if (typeof fetch !== 'function') return;
    try {
      const repoUrl = "https://api.github.com/repos/blueaviation024/GeoFS-Cabin-PA/commits?per_page=1";
      const response = await fetch(repoUrl);
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
