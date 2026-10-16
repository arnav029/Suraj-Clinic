/* ============================================================
   Suraj Clinic — interactions
   No dependencies. Live clinic-hours status, theme toggle,
   mobile menu, one-open-at-a-time FAQ. Text translation lives
   in i18n.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. live clinic status -------------------------
     Hours are the single source of truth for every status line
     on the page. Times are minutes from midnight, evaluated in
     Asia/Kolkata so the status is correct for a visitor in any
     timezone (e.g. relatives abroad checking the clinic hours). */

  var SESSIONS = [
    [9 * 60 + 30, 14 * 60],       //  9:30 AM – 2:00 PM
    [17 * 60 + 30, 21 * 60 + 30]  //  5:30 PM – 9:30 PM
  ];

  var i18n = window.scI18n || { lang: function () { return "en"; }, digits: String };

  var TEXT = {
    en: {
      closing: function (n) { return "Closing in " + n + " min"; },
      openUntil: function (t) { return "Open now · until " + t; },
      opensIn: function (n) { return "Opens in " + n + " min"; },
      opensAt: function (t) { return "Closed · opens " + t; },
      tomorrow: function (t) { return "Closed · opens " + t + " tomorrow"; }
    },
    mr: {
      closing: function (n) { return n + " मिनिटांत बंद होईल"; },
      openUntil: function (t) { return "आता सुरू · " + t + " पर्यंत"; },
      opensIn: function (n) { return n + " मिनिटांत सुरू होईल"; },
      opensAt: function (t) { return "बंद · " + t + " वाजता सुरू होईल"; },
      tomorrow: function (t) { return "बंद · उद्या " + t + " वाजता सुरू होईल"; }
    }
  };

  function clinicNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    }).formatToParts(new Date());

    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === "hour") h = parseInt(p.value, 10);
      if (p.type === "minute") m = parseInt(p.value, 10);
    });
    return (h % 24) * 60 + m;
  }

  function fmt(mins, lang) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    var h12 = h % 12 === 0 ? 12 : h % 12;
    var clock = h12 + (m ? ":" + (m < 10 ? "0" + m : m) : "");

    if (lang === "mr") {
      // Marathi names the part of the day instead of AM/PM
      var part = h < 12 ? "सकाळी" : h < 16 ? "दुपारी" : h < 20 ? "संध्याकाळी" : "रात्री";
      return part + " " + i18n.digits(clock);
    }
    return clock + " " + (h < 12 ? "AM" : "PM");
  }

  function clinicStatus() {
    var now = clinicNow();
    var lang = i18n.lang();
    var T = TEXT[lang] || TEXT.en;
    var n = function (x) { return lang === "mr" ? i18n.digits(x) : x; };

    for (var i = 0; i < SESSIONS.length; i++) {
      var open = SESSIONS[i][0], close = SESSIONS[i][1];

      if (now >= open && now < close) {
        var left = close - now;
        return { open: true, text: left <= 30 ? T.closing(n(left)) : T.openUntil(fmt(close, lang)) };
      }
      if (now < open) {
        var until = open - now;
        return { open: false, text: until <= 60 ? T.opensIn(n(until)) : T.opensAt(fmt(open, lang)) };
      }
    }
    // past the last session — next opening is tomorrow morning
    return { open: false, text: T.tomorrow(fmt(SESSIONS[0][0], lang)) };
  }

  function paintStatus() {
    var s = clinicStatus();
    var lines = document.querySelectorAll(".status");

    for (var i = 0; i < lines.length; i++) {
      var txt = lines[i].querySelector(".txt");
      if (txt) txt.textContent = s.text;
      lines[i].classList.toggle("is-open", s.open);
      lines[i].classList.toggle("is-closed", !s.open);
    }

    // highlight whichever session row is live in the hours table
    var now = clinicNow();
    var rows = document.querySelectorAll(".hours tr[data-session]");
    for (var j = 0; j < rows.length; j++) {
      var sess = SESSIONS[+rows[j].getAttribute("data-session")];
      rows[j].classList.toggle("now", now >= sess[0] && now < sess[1]);
    }
  }

  paintStatus();
  setInterval(paintStatus, 30000);
  document.addEventListener("sc:langchange", paintStatus);

  /* ---------- 2. theme toggle ---------- */
  var themeBtn = document.getElementById("themeBtn");

  function currentTheme() {
    var set = document.documentElement.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("sc-theme", next); } catch (e) {}
    });
  }

  /* ---------- 3. mobile menu ---------- */
  var header = document.getElementById("siteHeader");
  var menuBtn = document.getElementById("menuBtn");

  function setMenu(open) {
    if (!header || !menuBtn) return;
    header.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setMenu(!header.classList.contains("nav-open"));
    });
    document.querySelectorAll("#siteNav a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- 4. FAQ: one open at a time ---------- */
  var faqItems = document.querySelectorAll(".faq details");
  faqItems.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      faqItems.forEach(function (other) { if (other !== d) other.open = false; });
    });
  });

  /* ---------- 5. footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
