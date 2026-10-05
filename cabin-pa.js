// ==UserScript==
// @name         Cabin PA addon for GeoFS
// @namespace    https://geofs-cabin-pa.local
// @version      2.3.0
// @description  Cabin announcements panel with speech synthesis, seatbelt chime, safety audio with delay, control lock, and boarding music
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  const seatbeltChimePageUrl = "https://blueaviation024.github.io/GeoFS-Cabin-PA/chime.html";
  const seatbeltChimeUrls = [
    "https://raw.githubusercontent.com/blueaviation024/GeoFS-Cabin-PA/main/seatbelt-chime.mp3",
    "https://raw.githubusercontent.com/blueaviation024/GeoFS-Cabin-PA/main/seatbelt%20chime.mp3"
  ];
  const seatbeltChimeState = {
    audio: null,
    activeUrl: null
  };

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
    activeTab: "main",
    panelVisible: false,
    cabinLightsOn: true,
    cabinMoodColor: "#ffbf69",
    themeMode: "auto",
    panelCompact: false,
    defaultTab: "main",
    autoHidePanel: true,
    playSeatbeltChimeEnabled: true
  };
  let startupIntroShown = false;
  let startupIntroTimer = null;
  let startupTipTimer = null;
  const startupTips = [
    "Set your airline, flight number, and destination to personalize announcements.",
    "Choose a primary language to match announcements with an available voice.",
    "Use the Cabin tab to adjust cabin lights and mood color without speaking an announcement.",
    "Attach your own audio for the safety demonstration or boarding music.",
    "Press Shift+P to open or close the Cabin PA panel."
  ];

  const messages = {
    boarding: "Welcome onboard your {airline} flight {flight} to {dest}. Please stow your carry-on items, fasten your seatbelt, and prepare for departure.",
    boardingDoorOpen: "The boarding door is now open. Passengers may now disembark. Please follow the cabin crew instructions and exit the aircraft in an orderly manner. Thank yuo for flying {airline} and enjoy your stay in {dest}.",
    safety: "Ladies and gentlemen, please pay attention to the safety demonstration. Secure all carry-on items and follow the cabin crew instructions.",
    takeoff: "Cabin crew, takeoff stations. We are now about to take off. Please ensure your seatbacks and tray tables are in their full upright position, and your seatbelts are securely fastened.",
    cruise: "Ladies and gentlemen, we have reached cruising altitude. You may now use approved electronic devices and refreshments will be served shortly. Please check the menu for available options.",
    descent: "Ladies and gentlemen, we are beginning our descent into {dest}. Please return your seat backs and tray tables to their full upright position and fasten your seatbelts. Cabin crew will be coming through the cabin to collect any remaining service items. Thank you for flying {airline}.",
    landing: "Cabin crew, prepare for arrival. We are now in our final descent. Please ensure your seatbacks and tray tables are in their full upright position, and your seatbelts are securely fastened. We will be landing shortly.",
    taxiin: "Hello everyone, {airline} welcomes you to {dest}. Please remain seated with your seatbelt fastened until the aircraft has come to a complete stop and the seatbelt sign has been turned off. Please check your surroundings to ensure if you never leave any of your belongings. Be cautious when opening the overhead bins, as items may have shifted during the flight. On behalf of the captain, first officer, and the rest of the team, we thank you for choosing {airline}. We hope you had a pleasant journey and look forward to welcoming you on board again soon.",
    armDoors: "Cabin crew, arm doors. Please ensure all doors are armed and the cabin is secure for departure.",
    disarmDoors: "Cabin crew, disarm doors. Please remain seated and await further instructions.",
    crosscheck: "Cabin crew, crosscheck. Please confirm all passengers are seated, seatbelts are fastened, and the cabin is clear and secure.",
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
    attachSeatbeltChimeHooks();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeyup, true);
    document.addEventListener("keypress", handleKeypress, true);

    // Check for updates on startup
    checkForUpdates();
    // Check for updates every 1 minute
    setInterval(checkForUpdates, 60 * 1000);
  }

  function attachSeatbeltChimeHooks() {
    document.addEventListener("click", handleGeoFSeatbeltClick, true);

    const observer = new MutationObserver(() => {
      const geoState = getSeatbeltStateFromGeoFS();
      if (geoState === null) return;
      if (state.seatbelt !== geoState) {
        state.seatbelt = geoState;
        playSeatbeltChime();
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-label", "title", "data-state", "data-seatbelt", "aria-pressed", "value"]
      });
    }
  }

  function handleGeoFSeatbeltClick(event) {
    const target = event && event.target && event.target.closest ? event.target.closest("button, [role='button'], div, span, label, input") : null;
    if (!target) return;

    const text = [
      target.textContent || "",
      target.getAttribute("aria-label") || "",
      target.getAttribute("title") || "",
      target.id || "",
      target.className || "",
      target.getAttribute("data-state") || "",
      target.getAttribute("data-seatbelt") || "",
      target.getAttribute("aria-pressed") || "",
      target.value || ""
    ].join(" ").toLowerCase();

    if (!/seatbelt|fasten.*belt|belt.*sign/.test(text)) return;

    const inferredState = inferSeatbeltStateFromText(text);
    if (inferredState === null) {
      const geoState = getSeatbeltStateFromGeoFS();
      if (geoState !== null && geoState !== state.seatbelt) {
        state.seatbelt = geoState;
        playSeatbeltChime();
      }
      return;
    }

    if (state.seatbelt !== inferredState) {
      state.seatbelt = inferredState;
      playSeatbeltChime();
    }
  }

  function inferSeatbeltStateFromText(text) {
    const onMatches = /(seatbelt.*(on|enabled|fasten|secure)|fasten.*seatbelt|belt.*on|switch.*on)/i.test(text);
    const offMatches = /(seatbelt.*(off|disabled|unfasten|release)|fasten.*off|belt.*off|switch.*off)/i.test(text);
    if (onMatches && !offMatches) return true;
    if (offMatches && !onMatches) return false;
    return null;
  }

  function getSeatbeltStateFromGeoFS() {
    try {
      const roots = [window.geofs, window.Geofs, window.geofsApp, window.geoFS, window];
      for (const root of roots) {
        if (!root || typeof root !== "object") continue;

        const keys = [
          "seatbelt", "seatBelt", "seatbeltState", "seatbeltSign",
          "fastenSeatbelt", "fastenSeatbeltSign", "beltSign", "belt"
        ];

        for (const key of keys) {
          const value = root[key];
          if (typeof value === "boolean") return value;
          if (typeof value === "string") {
            const lower = value.toLowerCase();
            if (/(on|enabled|fastened|secure)/.test(lower)) return true;
            if (/(off|disabled|unfastened|release)/.test(lower)) return false;
          }
        }

        const nested = root.flight || root.aircraft || root.state || root.gameState || root.ui;
        if (nested && typeof nested === "object") {
          for (const key of keys) {
            const value = nested[key];
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
              const lower = value.toLowerCase();
              if (/(on|enabled|fastened|secure)/.test(lower)) return true;
              if (/(off|disabled|unfastened|release)/.test(lower)) return false;
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function injectStyles() {
    const commonFont = "'Montserrat', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(fontLink);

    const s = document.createElement("style");
    s.textContent =
      "#cabin-pa-panel{position:fixed;top:16px;right:16px;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;box-sizing:border-box;background:rgba(255,255,255,.98);color:#1a1a1a;border-radius:10px;padding:9px 10px;box-shadow:0 8px 32px rgba(0,0,0,.12);backdrop-filter:blur(6px);z-index:999999;font-family:" + commonFont + ";border:1px solid rgba(0,0,0,.08);font-size:12px;opacity:0;transform:translateY(-8px) scale(.98);animation:cabinPaPanelIn .22s ease forwards;--cabin-pa-accent:#00a8ff;--cabin-pa-accent-strong:#0091d9}" +
      "@keyframes cabinPaPanelIn{0%{opacity:0;transform:translateY(-8px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}" +
      "@keyframes cabinPaTabIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}" +
      "#cabin-pa-panel .tab-content.tab-entering{animation:cabinPaTabIn .18s ease-out both}" +
      "@media (prefers-reduced-motion:reduce){#cabin-pa-panel .tab-content.tab-entering{animation:none}}" +
      "@keyframes cabinPaSpinner{to{transform:rotate(360deg)}}" +
      "@keyframes cabinPaProgress{from{width:8%}to{width:100%}}" +
      "#cabin-pa-panel.startup-loading > :not(#cabin-pa-startup){visibility:hidden!important}" +
      "#cabin-pa-startup{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto;border-radius:inherit;box-sizing:border-box;background:rgba(248,251,255,.98);z-index:3;font-family:" + commonFont + ";color:#172033}" +
      "#cabin-pa-panel[data-theme='dark'] #cabin-pa-startup{background:rgba(17,22,31,.98);color:#edf3ff}" +
      "#cabin-pa-startup, #cabin-pa-startup *{font-family:" + commonFont + " !important;box-sizing:border-box}" +
      "#cabin-pa-startup-card{width:min(320px,100%);padding:20px 16px;border-radius:14px;background:#fff;box-shadow:0 12px 36px rgba(0,0,0,.12);text-align:center;box-sizing:border-box}" +
      "#cabin-pa-panel[data-theme='dark'] #cabin-pa-startup-card{background:#1a2130;color:#edf3ff}" +
      "#cabin-pa-startup-mark{width:48px;height:48px;margin:0 auto 12px;border:3px solid #d9efff;border-top-color:#00a8ff;border-radius:50%;animation:cabinPaSpinner .9s linear infinite}" +
      "#cabin-pa-startup-card h2{margin:0 0 6px;font-size:18px;color:#0d47a1}" +
      "#cabin-pa-startup-status{margin:0;color:#627087;font-size:12px}" +
      "#cabin-pa-startup-track{height:5px;margin:18px 0;border-radius:99px;background:#e8eef5;overflow:hidden}" +
      "#cabin-pa-startup-progress{height:100%;width:8%;border-radius:inherit;background:linear-gradient(90deg,#00a8ff,#36c7d0);animation:cabinPaProgress 2.8s ease-out forwards}" +
      "#cabin-pa-startup-tip{min-height:38px;margin:0;padding:12px;border-radius:10px;background:#f3f8fc;color:#46556c;font-size:12px;line-height:1.5}" +
      "#cabin-pa-startup-card .tip-label{display:block;margin-bottom:4px;color:#0087cc;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}" +
      "@media (prefers-reduced-motion:reduce){#cabin-pa-startup-mark,#cabin-pa-startup-progress{animation:none}#cabin-pa-startup-progress{width:100%}}" +
      "#cabin-pa-panel .title{font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;color:#0d47a1;font-size:13px;font-family:" + commonFont + "}" +
      "#cabin-pa-panel .cabin-pa-tab-bar, #cabin-pa-panel .tab-bar{display:flex;gap:5px;margin:6px 0 8px 0}" +
      "#cabin-pa-panel .cabin-pa-tab-bar button, #cabin-pa-panel .tab-bar button{flex:1;padding:7px 8px;border:none;border-radius:8px;background:#f0f0f0;color:#1a1a1a;cursor:pointer;font-weight:700;transition:transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;box-shadow:0 2px 0 rgba(0,0,0,.04);border:1px solid #e0e0e0;font-size:11px;font-family:" + commonFont + "}" +
      "#cabin-pa-panel .cabin-pa-tab-bar button:hover, #cabin-pa-panel .tab-bar button:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(0,0,0,.08)}" +
      "#cabin-pa-panel .cabin-pa-btn-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex:0 0 16px;margin-right:7px;line-height:1;vertical-align:middle}" +
      "#cabin-pa-panel .cabin-pa-btn-icon svg{display:block;width:100%;height:100%;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      "#cabin-pa-panel .cabin-pa-btn-label{min-width:0;line-height:1.2}" +
      "#cabin-pa-panel .announcement-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:5px 0}" +
      "#cabin-pa-panel .announcement-grid button{display:flex;align-items:center;justify-content:flex-start;min-width:0;min-height:46px;width:100%;padding:7px 9px;text-align:left;flex:none}" +
      "#cabin-pa-panel.compact .announcement-grid{gap:4px;margin:4px 0}" +
      "#cabin-pa-panel.compact .announcement-grid button{min-height:42px;padding:6px 7px}" +
      "#cabin-pa-panel.compact #cabin-pa-lang-selected{padding:5px 7px;font-size:10px}" +
      "#cabin-pa-panel.compact{width:290px;max-width:calc(100vw - 32px)}" +
      "#cabin-pa-panel.compact .row{margin:3px 0;gap:4px}" +
      "#cabin-pa-panel.compact button, #cabin-pa-panel.compact input, #cabin-pa-panel.compact select{font-size:10px;padding:5px 7px}" +
      "#cabin-pa-panel.compact .small{font-size:10px}" +
      "#cabin-pa-panel .cabin-pa-tab-bar button:active, #cabin-pa-panel .tab-bar button:active{transform:translateY(0) scale(.98)}" +
      "#cabin-pa-panel .cabin-pa-tab-bar button.active, #cabin-pa-panel .tab-bar button.active{background:#00a8ff;color:#fff;border-color:#00a8ff;}" +
      "#cabin-pa-panel .tab-content{display:none}" +
      "#cabin-pa-panel[data-theme='dark']{background:rgba(17,22,31,.96);color:#edf3ff;border-color:rgba(255,255,255,.08);box-shadow:0 12px 34px rgba(0,0,0,.4)}" +
      "#cabin-pa-panel[data-theme='dark'] .title{color:#dfeefd}" +
      "#cabin-pa-panel[data-theme='dark'] .cabin-pa-tab-bar button, #cabin-pa-panel[data-theme='dark'] .tab-bar button{background:#1a2130;color:#edf3ff;border-color:#2d3848}" +
      "#cabin-pa-panel[data-theme='dark'] .cabin-pa-tab-bar button:hover, #cabin-pa-panel[data-theme='dark'] .tab-bar button:hover{background:#243042}" +
      "#cabin-pa-panel[data-theme='dark'] button{background:#202b3c;color:#edf3ff;border-color:#3a4961}" +
      "#cabin-pa-panel[data-theme='dark'] button:hover{background:#2a3750}" +
      "#cabin-pa-panel[data-theme='dark'] input, #cabin-pa-panel[data-theme='dark'] select{background:#101923;color:#edf3ff;border-color:#3b4d67}" +
      "#cabin-pa-panel[data-theme='dark'] .small, #cabin-pa-panel[data-theme='dark'] .meta-label, #cabin-pa-panel[data-theme='dark'] .seatmap-status, #cabin-pa-panel[data-theme='dark'] .seatmap-note, #cabin-pa-panel[data-theme='dark'] .seatmap-row-label, #cabin-pa-panel[data-theme='dark'] .seatmap-legend, #cabin-pa-panel[data-theme='dark'] .seatmap-legend span, #cabin-pa-panel[data-theme='dark'] .discord-link{color:#dce8ff}" +
      "#cabin-pa-panel[data-theme='dark'] .seatmap-grid{background:#121c2a;border-color:#2b394d}" +
      "#cabin-pa-panel[data-theme='dark'] .seat-cell{background:#2a3b57;color:#edf3ff}" +
      "#cabin-pa-panel[data-theme='dark'] .discord-link{color:#75c5ff}" +
      "#cabin-pa-panel[data-theme='dark'] .discord-link:hover{color:#9ad9ff}" +
      "#cabin-pa-panel[data-theme='dark'] .close{background:#ff6b6b;color:#fff;border-color:#ff6b6b}" +
      "#cabin-pa-panel[data-theme='dark'] .close:hover{background:#ff5252;border-color:#ff5252}" +
      "#cabin-pa-lang-picker[data-theme='dark']{background:#171d29;color:#edf3ff;border-color:#364760;box-shadow:0 12px 40px rgba(0,0,0,.35)}" +
      "#cabin-pa-lang-picker[data-theme='dark'] li{background:#1f2b39;color:#edf3ff;border-color:#394d65}" +
      "#cabin-pa-lang-picker[data-theme='dark'] li:hover{background:#00a8ff;color:#fff;border-color:#00a8ff}" +
      "#cabin-pa-lang-picker[data-theme='dark'] li.group-heading{color:#dfeefd}" +
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
      "#cabin-pa-panel .row{display:flex;gap:5px;flex-wrap:wrap;margin:4px 0;align-items:center}" +
      "#cabin-pa-panel .row > *{min-width:0;box-sizing:border-box}" +
      "#cabin-pa-panel #cabin-pa-lang-btn, #cabin-pa-panel #cabin-pa-lang-selected{flex:1 1 auto;min-width:0}" +
      "#cabin-pa-panel #cabin-pa-lang-selected{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%} " +
      "#cabin-pa-panel button{flex:1;padding:6px 8px;border:none;border-radius:7px;background:#f0f0f0;color:#1a1a1a;cursor:pointer;font-weight:600;transition:transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease, filter .15s ease;box-shadow:0 2px 0 rgba(0,0,0,.04);border:1px solid #e0e0e0;font-size:11px;will-change:transform, box-shadow;font-family:" + commonFont + "}" +
      "#cabin-pa-panel button:hover{background:#e8e8e8;border-color:#d0d0d0;transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.08)}" +
      "#cabin-pa-panel button:active{transform:translateY(0) scale(.98);box-shadow:0 2px 8px rgba(0,0,0,.06)}" +
      "#cabin-pa-panel .accent{background:var(--cabin-pa-accent);color:#fff;border-color:var(--cabin-pa-accent)}" +
      "#cabin-pa-panel .accent:hover{background:var(--cabin-pa-accent-strong);border-color:var(--cabin-pa-accent-strong);filter:brightness(1.02)}" +
      "#cabin-pa-panel .discord-link{font-size:12px;color:#00a8ff;text-decoration:underline;cursor:pointer;display:inline-block;margin-bottom:6px;}" +
      "#cabin-pa-panel .discord-link:hover{color:#0077cc;}" +
      "#cabin-pa-panel input, #cabin-pa-panel select{flex:1;padding:6px 8px;border-radius:7px;border:1px solid #d0d0d0;background:#fafafa;color:#1a1a1a;font-size:11px;transition:border .2s;font-family:" + commonFont + "}" +
      "#cabin-pa-panel .small, #cabin-pa-panel .meta-label, #cabin-pa-panel .seatmap-status, #cabin-pa-panel .seatmap-note, #cabin-pa-panel .seatmap-row-label, #cabin-pa-panel .seatmap-legend, #cabin-pa-panel .seatmap-legend span, #cabin-pa-panel .discord-link, #cabin-pa-lang-picker, #cabin-pa-lang-picker h3, #cabin-pa-lang-picker li{font-family:" + commonFont + "}" +
      "#cabin-pa-panel input:focus, #cabin-pa-panel select:focus{outline:none;border-color:#00a8ff;box-shadow:0 0 0 3px rgba(0,168,255,.1)}" +
      "#cabin-pa-panel input[type=file]{flex:2}" +
      "#cabin-pa-panel .close{width:auto;background:#ff6b6b;color:#fff;border-color:#ff6b6b}" +
      "#cabin-pa-panel .close:hover{background:#ff5252;border-color:#ff5252}" +
      "#cabin-pa-panel .small{font-size:11px;opacity:.7;color:#666}" +
      "#cabin-pa-toggle{position:fixed;left:50%;transform:translateX(-50%);bottom:88px;padding:8px 14px;border-radius:999px;border:none;background:#00a8ff;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(0,168,255,.3);z-index:1000000;cursor:pointer;transition:all .2s;font-size:12px;font-family:" + commonFont + "}" +
      "#cabin-pa-toggle:hover{background:#0091d9;box-shadow:0 10px 28px rgba(0,168,255,.4);transform:translateX(-50%) translateY(-2px)}" +
      "@media (max-height:700px){#cabin-pa-toggle{bottom:64px}}" +
      "@media (max-height:540px){#cabin-pa-toggle{bottom:48px}}" +
      "@keyframes cabinPaFadeIn{0%{opacity:0}100%{opacity:1}}" +
      "#cabin-pa-overlay{position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:999998;display:none;backdrop-filter:blur(2px);animation:cabinPaFadeIn .18s ease}" +
      "#cabin-pa-panel .meta-label{font-size:11px;opacity:.7;width:100%;color:#666}" +
      /* language picker modal */
      "#cabin-pa-lang-picker{--lang-picker-width:280px;--lang-picker-item-padding:8px;--lang-picker-font-size:12px;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:var(--lang-picker-width);max-width:calc(100vw - 24px);max-height:60vh;overflow:auto;background:#fff;border-radius:10px;padding:11px;z-index:1000001;display:none;box-shadow:0 12px 40px rgba(0,0,0,.15);border:1px solid rgba(0,0,0,.08);box-sizing:border-box}" +
      "#cabin-pa-lang-picker h3{margin:0 0 9px 0;font-size:13px;font-weight:700;color:#0d47a1}" +
      "#cabin-pa-lang-picker ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}" +
      "#cabin-pa-lang-picker li{background:#f5f5f5;padding:var(--lang-picker-item-padding);border-radius:6px;cursor:pointer;text-align:center;font-weight:500;color:#1a1a1a;border:1px solid #e8e8e8;transition:all .2s;font-size:var(--lang-picker-font-size);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#cabin-pa-lang-picker li:hover{background:#00a8ff;color:#fff;border-color:#00a8ff}" +
      "#cabin-pa-lang-picker li.group-heading{grid-column:1/-1;background:transparent;border:none;color:#0d47a1;font-weight:700;cursor:default;padding:6px 0 2px 0;opacity:1}" +
      "#cabin-pa-lang-picker li.group-heading:hover{background:transparent;color:#0d47a1;border:none}";
    document.head.appendChild(s);
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cabin-pa-overlay";
    overlay.addEventListener("click", () => {
      if (state.autoHidePanel) setPanelVisible(false);
    });
    document.body.appendChild(overlay);
  }

  function createToggleButton() {
    if (document.getElementById("cabin-pa-toggle")) return;
    const toggle = document.createElement("button");
    toggle.id = "cabin-pa-toggle";
    toggle.type = "button";
    toggle.textContent = "Cabin PA";
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextVisible = !state.panelVisible;
      setPanelVisible(nextVisible);
    });
    document.body.appendChild(toggle);
  }

  function setPanelVisible(visible) {
    const panel = document.getElementById("cabin-pa-panel");
    const overlay = document.getElementById("cabin-pa-overlay");
    if (!panel || !overlay) return;
    state.panelVisible = !!visible;
    if (visible) {
      if (!startupIntroShown) {
        startupIntroShown = true;
        panel.style.display = "block";
        panel.style.visibility = "visible";
        panel.style.opacity = "1";
        panel.style.animation = "cabinPaPanelIn .22s ease";
        panel.hidden = false;
        panel.classList.add("startup-loading");
        overlay.style.display = "none";
        overlay.style.visibility = "hidden";
        overlay.style.opacity = "0";
        overlay.hidden = true;
        showStartupIntro();
        return;
      }
      panel.style.display = "block";
      panel.style.visibility = "visible";
      panel.style.opacity = "1";
      panel.style.animation = "cabinPaPanelIn .22s ease";
      panel.hidden = false;
      overlay.style.display = "block";
      overlay.style.visibility = "visible";
      overlay.style.opacity = "1";
      overlay.style.animation = "cabinPaFadeIn .18s ease";
      overlay.hidden = false;
      requestAnimationFrame(() => {
        panel.style.display = "block";
        panel.style.visibility = "visible";
        panel.style.opacity = "1";
        overlay.style.display = "block";
        overlay.style.visibility = "visible";
        overlay.style.opacity = "1";
      });
      loadSeatMap();
      return;
    }

    clearTimeout(startupIntroTimer);
    clearInterval(startupTipTimer);
    startupIntroTimer = null;
    startupTipTimer = null;
    const startupScreen = document.getElementById("cabin-pa-startup");
    if (startupScreen) startupScreen.remove();
    panel.classList.remove("startup-loading");
    panel.style.display = "none";
    panel.style.visibility = "hidden";
    panel.style.opacity = "0";
    panel.style.animation = "none";
    panel.hidden = true;
    overlay.style.display = "none";
    overlay.style.visibility = "hidden";
    overlay.style.opacity = "0";
    overlay.style.animation = "none";
    overlay.hidden = true;
  }

  function showStartupIntro() {
    const intro = document.createElement("div");
    intro.id = "cabin-pa-startup";
    intro.setAttribute("role", "status");
    intro.setAttribute("aria-live", "polite");
    intro.innerHTML =
      '<div id="cabin-pa-startup-card">' +
      '<div id="cabin-pa-startup-mark" aria-hidden="true"></div>' +
      '<h2>Cabin PA</h2>' +
      '<p id="cabin-pa-startup-status">Preparing your cabin controls…</p>' +
      '<div id="cabin-pa-startup-track"><div id="cabin-pa-startup-progress"></div></div>' +
      '<p id="cabin-pa-startup-tip"><span class="tip-label">Cabin tip</span><span id="cabin-pa-startup-tip-text"></span></p>' +
      '</div>';
    const panel = document.getElementById("cabin-pa-panel");
    if (!panel) return;
    panel.appendChild(intro);

    let tipIndex = Math.floor(Math.random() * startupTips.length);
    const tipText = document.getElementById("cabin-pa-startup-tip-text");
    const updateTip = () => {
      if (!tipText) return;
      tipText.textContent = startupTips[tipIndex];
      tipIndex = (tipIndex + 1) % startupTips.length;
    };
    updateTip();
    startupTipTimer = setInterval(updateTip, 950);
    startupIntroTimer = setTimeout(() => {
      clearInterval(startupTipTimer);
      startupTipTimer = null;
      startupIntroTimer = null;
      const screen = document.getElementById("cabin-pa-startup");
      const panel = document.getElementById("cabin-pa-panel");
      if (screen) screen.remove();
      if (!state.panelVisible || !panel) return;
      panel.classList.remove("startup-loading");
      panel.style.display = "block";
      panel.style.visibility = "visible";
      panel.style.opacity = "1";
      panel.style.animation = "cabinPaPanelIn .22s ease";
      panel.hidden = false;
      requestAnimationFrame(() => {
        if (!state.panelVisible) return;
        panel.style.display = "block";
        panel.style.visibility = "visible";
        panel.style.opacity = "1";
      });
      loadSeatMap();
    }, 2800);
  }

  function isPanelVisible() {
    return !!state.panelVisible;
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "cabin-pa-panel";
    panel.style.display = "none";
    panel.innerHTML =
      '<div class="title"><span>Cabin PA</span><button class="close" id="cabin-pa-close">Hide</button></div>' +
      '<div class="row small"><a class="discord-link" href="https://discord.gg/edYvUfb2jj" target="_blank" rel="noopener">Join the official addon server</a></div>' +
      '<div class="cabin-pa-tab-bar">' +
      '<button type="button" data-tab="main" class="active"><span class="cabin-pa-btn-icon">' + iconSvg("sliders") + '</span>Controls</button>' +
      '<button type="button" data-tab="cabin"><span class="cabin-pa-btn-icon">' + iconSvg("lightbulb") + '</span>Cabin</button>' +
      '<button type="button" data-tab="settings"><span class="cabin-pa-btn-icon">' + iconSvg("settings") + '</span>Settings</button>' +
      '<button type="button" data-tab="seatmap"><span class="cabin-pa-btn-icon">' + iconSvg("seat") + '</span>Seat Map</button>' +
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
      '<div class="announcement-grid">' +
      btn("Boarding", "boarding", "announcement-btn", "ticket") +
      btn("Boarding Door Open", "boardingDoorOpen", "announcement-btn", "door-open") +
      btn("Safety", "safety", "announcement-btn", "life-ring") +
      btn("Takeoff", "takeoff", "announcement-btn", "plane") +
      btn("Cruise", "cruise", "announcement-btn", "cloud-sun") +
      btn("Descent", "descent", "announcement-btn", "trend-down") +
      btn("Landing", "landing", "announcement-btn", "plane-land") +
      btn("Taxi‑in", "taxiin", "announcement-btn", "car") +
      btn("Seatbelt On", "seatbeltOn", "accent announcement-btn", "lock") +
      btn("Seatbelt Off", "seatbeltOff", "announcement-btn", "lock-open") +
      btn("Arm Doors", "armDoors", "announcement-btn", "door-closed") +
      btn("Disarm Doors", "disarmDoors", "announcement-btn", "door-open") +
      btn("Crosscheck", "crosscheck", "announcement-btn", "check-circle") +
      "</div>" +
      '<div class="row">' +
      '<input type="text" id="cabin-pa-custom" placeholder="Custom announcement">' +
      '<button id="cabin-pa-say">Speak</button>' +
      "</div>" +
      '<div class="row">' +
      '<input type="file" id="cabin-pa-safety-file" accept="audio/*">' +
      "</div>" +
      '<div class="row">' +
      btn("Safety Audio (Announcement)", "playSafety", "accent", "volume") +
      btn("Safety Audio (Direct)", "playSafetyDirect", "accent", "megaphone") +
      "</div>" +
      '<div class="row small"><span id="cabin-pa-safety-status">No safety audio attached</span></div>' +
      '<div class="row">' +
      '<input type="file" id="cabin-pa-boarding-file" accept="audio/*">' +
      btn("Start Boarding Music", "boardingStart", "accent", "music") +
      btn("Stop Boarding Music", "boardingStop", "", "stop") +
      "</div>" +
      '<div class="row small"><span id="cabin-pa-boarding-status">No boarding music attached</span><span style="margin-left:auto">Shortcut: Shift+P</span></div>' +
      '</div>' +
      '<div id="cabin-pa-tab-cabin" class="tab-content" style="display:none;">' +
      '<div class="row">' +
      btn("Cabin Lights On", "cabinLightsOn", "", "lightbulb") +
      btn("Cabin Lights Off", "cabinLightsOff", "", "moon") +
      btn("Reading Lights", "readingLightsOn", "", "lamp") +
      "</div>" +
      '<div class="row">' +
      '<input type="color" id="cabin-pa-light-color" value="' + state.cabinMoodColor + '" title="Mood lighting color">' +
      '<button id="cabin-pa-set-mood" data-action="setMoodLighting" class="accent"><span class="cabin-pa-btn-icon">' + iconSvg("palette") + '</span><span class="cabin-pa-btn-label">Apply Mood</span></button>' +
      "</div>" +
      '<div class="row">' +
      '<button id="cabin-pa-lights-toggle" data-action="toggleCabinLightMode"><span class="cabin-pa-btn-icon">' + iconSvg("refresh") + '</span><span class="cabin-pa-btn-label">Cabin Mode</span></button>' +
      '<button data-action="moodLighting"><span class="cabin-pa-btn-icon">' + iconSvg("palette") + '</span><span class="cabin-pa-btn-label">Mood Lighting</span></button>' +
      "</div>" +
      '</div>' +
      '<div id="cabin-pa-tab-settings" class="tab-content" style="display:none;">' +
      '<div class="row">' +
      '<label for="cabin-pa-theme-mode" style="width:100%;font-size:11px;opacity:.8;"><span class="cabin-pa-btn-icon">' + iconSvg("palette") + '</span>Theme</label>' +
      '<select id="cabin-pa-theme-mode">' +
      '<option value="auto">Auto</option>' +
      '<option value="light">Light</option>' +
      '<option value="dark">Dark</option>' +
      '</select>' +
      '</div>' +
      '<div class="row">' +
      '<label for="cabin-pa-panel-size" style="width:100%;font-size:11px;opacity:.8;"><span class="cabin-pa-btn-icon">' + iconSvg("maximize") + '</span>Panel size</label>' +
      '<select id="cabin-pa-panel-size">' +
      '<option value="standard">Standard</option>' +
      '<option value="compact">Compact</option>' +
      '</select>' +
      '</div>' +
      '<div class="row">' +
      '<label for="cabin-pa-default-tab" style="width:100%;font-size:11px;opacity:.8;"><span class="cabin-pa-btn-icon">' + iconSvg("panels") + '</span>Default tab</label>' +
      '<select id="cabin-pa-default-tab">' +
      '<option value="main">Controls</option>' +
      '<option value="cabin">Cabin</option>' +
      '<option value="settings">Settings</option>' +
      '<option value="seatmap">Seat Map</option>' +
      '</select>' +
      '</div>' +
      '<div class="row small"><label><input type="checkbox" id="cabin-pa-seatbelt-chime"><span class="cabin-pa-btn-icon">' + iconSvg("bell") + '</span>Play seatbelt chime sounds</label></div>' +
      '<div class="row small"><label><input type="checkbox" id="cabin-pa-auto-hide"><span class="cabin-pa-btn-icon">' + iconSvg("click") + '</span>Auto-close on outside click</label></div>' +
      '<div class="row small"><span class="meta-label">These settings are saved automatically.</span></div>' +
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
    const themeModeSelect = document.getElementById("cabin-pa-theme-mode");
    const panelSizeSelect = document.getElementById("cabin-pa-panel-size");
    const defaultTabSelect = document.getElementById("cabin-pa-default-tab");
    const seatbeltChimeCheckbox = document.getElementById("cabin-pa-seatbelt-chime");
    const autoHideCheckbox = document.getElementById("cabin-pa-auto-hide");
    dual.addEventListener("change", () => { state.dualEnabled = dual.checked; localStorage.setItem("cabinPaDual", state.dualEnabled ? "1" : "0"); });
    dualOrder.addEventListener("change", () => { state.dualOrderPrimaryFirst = dualOrder.checked; localStorage.setItem("cabinPaDualOrder", state.dualOrderPrimaryFirst ? "1" : "0"); });
    autoBest.addEventListener("change", () => { state.useBestVoiceAuto = autoBest.checked; localStorage.setItem("cabinPaAutoBest", state.useBestVoiceAuto ? "1" : "0"); });
    if (themeModeSelect) {
      themeModeSelect.value = state.themeMode || "auto";
      themeModeSelect.addEventListener("change", () => {
        state.themeMode = themeModeSelect.value || "auto";
        localStorage.setItem("cabinPaThemeMode", state.themeMode);
        applyTheme();
      });
    }
    if (panelSizeSelect) {
      panelSizeSelect.value = state.panelCompact ? "compact" : "standard";
      panelSizeSelect.addEventListener("change", () => {
        state.panelCompact = panelSizeSelect.value === "compact";
        localStorage.setItem("cabinPaPanelCompact", state.panelCompact ? "1" : "0");
        applySettings();
      });
    }
    if (defaultTabSelect) {
      defaultTabSelect.value = state.defaultTab || "main";
      defaultTabSelect.addEventListener("change", () => {
        state.defaultTab = defaultTabSelect.value || "main";
        localStorage.setItem("cabinPaDefaultTab", state.defaultTab);
      });
    }
    if (seatbeltChimeCheckbox) {
      seatbeltChimeCheckbox.checked = state.playSeatbeltChimeEnabled;
      seatbeltChimeCheckbox.addEventListener("change", () => {
        state.playSeatbeltChimeEnabled = seatbeltChimeCheckbox.checked;
        localStorage.setItem("cabinPaSeatbeltChime", state.playSeatbeltChimeEnabled ? "1" : "0");
      });
    }
    if (autoHideCheckbox) {
      autoHideCheckbox.checked = state.autoHidePanel;
      autoHideCheckbox.addEventListener("change", () => {
        state.autoHidePanel = autoHideCheckbox.checked;
        localStorage.setItem("cabinPaAutoHidePanel", state.autoHidePanel ? "1" : "0");
      });
    }
    applyTheme();
    applySettings();

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

  function iconSvg(name) {
    const paths = {
      sliders: '<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3"/><path d="M2 14h4m4-6h4m4 8h4"/>',
      lightbulb: '<path d="M9 18h6m-5 4h4m-5-8a6 6 0 1 1 6 0c-.8.7-1 1.2-1 2h-4c0-.8-.2-1.3-1-2Z"/>',
      settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"/>',
      seat: '<path d="M6 4v6a3 3 0 0 0 3 3h7v7M8 13v7m8-7h2a2 2 0 0 1 2 2v4M6 20h14"/><path d="M10 7h7a2 2 0 0 1 2 2v4"/>',
      ticket: '<path d="M3 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h18a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4H3Z"/><path d="M13 7v2m0 3v2m0 3v1"/>',
      'door-open': '<path d="M4 21h16M7 21V5l11-2v18M7 5l11 3m-5 5h.01"/>',
      'door-closed': '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18m-8-9h.01"/>',
      'life-ring': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6m5.6 5.6 3.6 3.6m0-12.8-3.6 3.6m-5.6 5.6-3.6 3.6"/>',
      plane: '<path d="m2 16 20-6-8-3-3-5-2 1 1 5-5 2-3-2-1 1 2 4-1 3Z"/>',
      'cloud-sun': '<path d="M12 2v2m8 2-1.4 1.4M22 12h-2M4 12H2m3.4-6.6L4 4"/><path d="M8 18H6a4 4 0 1 1 1.2-7.8A6 6 0 0 1 19 12"/><path d="M13 21a4 4 0 1 1 0-8h4a4 4 0 1 1 0 8h-4Z"/>',
      'trend-down': '<path d="M3 7 9 13l4-4 8 8"/><path d="M15 17h6v-6"/>',
      'plane-land': '<path d="M2 19h20M4 15l7-2-2-8 2-1 5 7 5-1 1 2-6 3-3 3-3-2-5 1Z"/>',
      car: '<path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v7H3zm3 7v2m12-2v2M6 14h.01M18 14h.01"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
      'lock-open': '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.8-1"/>',
      'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
      volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/>',
      megaphone: '<path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11 15.2 13 21H8l-2-8M21 10v4"/>',
      music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
      moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
      lamp: '<path d="m9 3 6 0 4 10H5L9 3Z"/><path d="M12 13v5m-4 3h8m-6-3h4"/>',
      palette: '<path d="M12 3a9 9 0 0 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.5Z"/><path d="M7.5 10h.01M10 6.5h.01M15 7h.01M17 10.5h.01"/>',
      refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/>',
      maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
      panels: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m0-11h12"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
      click: '<path d="m9 11 3 10 2-4 4 2 1-2-4-2 4-2-10-3Z"/><path d="M5 3 3 5m8-4v3m8-1-2 2M2 11h3"/>'
    };
    const body = paths[name];
    return body ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">' + body + '</svg>' : "";
  }

  function btn(label, action, extra, icon) {
    const cls = extra ? " " + extra : "";
    const iconHtml = icon ? '<span class="cabin-pa-btn-icon">' + iconSvg(icon) + '</span>' : "";
    return '<button data-action="' + action + '" class="' + cls + '">' + iconHtml + '<span class="cabin-pa-btn-label">' + label + '</span></button>';
  }

  function setCabinMoodAccent(color) {
    const resolved = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color || "")) ? color : state.cabinMoodColor;
    state.cabinMoodColor = resolved;
    const panel = document.getElementById("cabin-pa-panel");
    if (panel) {
      panel.style.setProperty("--cabin-pa-accent", resolved);
      panel.style.setProperty("--cabin-pa-accent-strong", shadeColor(resolved, -18));
    }
    const input = document.getElementById("cabin-pa-light-color");
    if (input) input.value = resolved;
  }

  function shadeColor(hex, percent) {
    const normalized = String(hex || "#00a8ff").replace("#", "");
    const full = normalized.length === 3 ? normalized.split("").map((s) => s + s).join("") : normalized;
    const num = parseInt(full, 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) + amt;
    const g = ((num >> 8) & 0x00FF) + amt;
    const b = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (Math.min(255, Math.max(0, r)) << 16) + (Math.min(255, Math.max(0, g)) << 8) + Math.min(255, Math.max(0, b))).toString(16).slice(1);
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
      playSeatbeltChime();
      speak(messages.seatbeltOn);
      return;
    }
    if (action === "seatbeltOff") {
      state.seatbelt = false;
      playSeatbeltChime();
      speak(messages.seatbeltOff);
      return;
    }
    if (action === "cabinLightsOn") {
      state.cabinLightsOn = true;
      setCabinMoodAccent(state.cabinMoodColor);
      return;
    }
    if (action === "cabinLightsOff") {
      state.cabinLightsOn = false;
      setCabinMoodAccent("#8aa4c3");
      return;
    }
    if (action === "readingLightsOn") {
      setCabinMoodAccent(state.cabinMoodColor);
      return;
    }
    if (action === "moodLighting") {
      setCabinMoodAccent(state.cabinMoodColor);
      return;
    }
    if (action === "setMoodLighting") {
      const colorInput = document.getElementById("cabin-pa-light-color");
      if (colorInput) {
        state.cabinMoodColor = colorInput.value || state.cabinMoodColor;
      }
      setCabinMoodAccent(state.cabinMoodColor);
      return;
    }
    if (action === "toggleCabinLightMode") {
      state.cabinLightsOn = !state.cabinLightsOn;
      setCabinMoodAccent(state.cabinLightsOn ? state.cabinMoodColor : "#8aa4c3");
      return;
    }

    const text = messages[action];
    if (text) speak(text);
  }

  function handleKeydown(e) {
    const isToggle = e.shiftKey && String(e.key).toLowerCase() === "p";
    if (isToggle) {
      setPanelVisible(!state.panelVisible);
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
    const savedTheme = localStorage.getItem("cabinPaThemeMode");
    state.themeMode = savedTheme === "light" || savedTheme === "dark" || savedTheme === "auto" ? savedTheme : "auto";
    state.panelCompact = localStorage.getItem("cabinPaPanelCompact") === "1";
    const savedDefaultTab = localStorage.getItem("cabinPaDefaultTab");
    state.defaultTab = savedDefaultTab === "main" || savedDefaultTab === "cabin" || savedDefaultTab === "settings" || savedDefaultTab === "seatmap" ? savedDefaultTab : "main";
    state.autoHidePanel = localStorage.getItem("cabinPaAutoHidePanel") !== "0";
    state.playSeatbeltChimeEnabled = localStorage.getItem("cabinPaSeatbeltChime") !== "0";
  }

  function applyTheme() {
    const panel = document.getElementById("cabin-pa-panel");
    const picker = document.getElementById("cabin-pa-lang-picker");
    const themeSettings = document.getElementById("cabin-pa-theme-mode");
    if (!panel) return;
    const requested = state.themeMode || "auto";
    const resolved = requested === "auto"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : requested;
    panel.dataset.theme = resolved;
    if (picker) picker.dataset.theme = resolved;
    if (themeSettings) themeSettings.value = requested;
    if (requested === "auto") {
      const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      if (media && typeof media.addEventListener === "function") {
        media.addEventListener("change", applyTheme);
      } else if (media && typeof media.addListener === "function") {
        media.addListener(applyTheme);
      }
    }
  }

  function applySettings() {
    const panel = document.getElementById("cabin-pa-panel");
    const picker = document.getElementById("cabin-pa-lang-picker");
    const languageSelected = document.getElementById("cabin-pa-lang-selected");
    if (panel) {
      panel.classList.toggle("compact", !!state.panelCompact);
      panel.style.width = state.panelCompact ? "290px" : "340px";
    }
    if (picker) {
      picker.style.setProperty("--lang-picker-width", state.panelCompact ? "230px" : "280px");
      picker.style.setProperty("--lang-picker-item-padding", state.panelCompact ? "6px" : "8px");
      picker.style.setProperty("--lang-picker-font-size", state.panelCompact ? "11px" : "12px");
      picker.style.maxHeight = state.panelCompact ? "50vh" : "60vh";
    }
    if (languageSelected) {
      languageSelected.style.padding = state.panelCompact ? "5px 7px" : "6px 8px";
      languageSelected.style.fontSize = state.panelCompact ? "10px" : "12px";
    }
    const defaultTabSelect = document.getElementById("cabin-pa-default-tab");
    if (defaultTabSelect) defaultTabSelect.value = state.defaultTab || "main";
    const seatbeltChimeCheckbox = document.getElementById("cabin-pa-seatbelt-chime");
    if (seatbeltChimeCheckbox) seatbeltChimeCheckbox.checked = state.playSeatbeltChimeEnabled;
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
    const cabinTab = document.getElementById("cabin-pa-tab-cabin");
    const settingsTab = document.getElementById("cabin-pa-tab-settings");
    const seatTab = document.getElementById("cabin-pa-tab-seatmap");
    const buttons = Array.from(document.querySelectorAll("#cabin-pa-panel .cabin-pa-tab-bar button"));
    buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    const tabPanels = {
      main: mainTab,
      cabin: cabinTab,
      settings: settingsTab,
      seatmap: seatTab
    };
    Object.values(tabPanels).forEach((panel) => {
      if (!panel) return;
      panel.classList.remove("tab-entering");
      panel.style.display = "none";
    });
    const activePanel = tabPanels[tab];
    if (activePanel) {
      activePanel.style.display = "block";
      void activePanel.offsetWidth;
      activePanel.classList.add("tab-entering");
      activePanel.addEventListener("animationend", () => activePanel.classList.remove("tab-entering"), { once: true });
    }
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

  function getSeatbeltChimeAudio() {
    if (!seatbeltChimeState.audio) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = 1;
      audio.crossOrigin = "anonymous";
      seatbeltChimeState.audio = audio;
    }
    return seatbeltChimeState.audio;
  }

  function playSeatbeltChime() {
    try {
      const audio = getSeatbeltChimeAudio();
      let attempt = 0;
      const playNext = () => {
        const url = seatbeltChimeUrls[attempt];
        if (!url) return;
        if (audio.src !== url) {
          audio.src = url;
        }
        audio.currentTime = 0;
        audio.play().catch(() => {
          attempt += 1;
          if (seatbeltChimeUrls[attempt]) {
            playNext();
          }
        });
      };
      playNext();
    } catch (_) {}
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
