/* ============================================================
   Suraj Clinic — interactions
   No dependencies. Replaces the AOS library with a ~20-line
   IntersectionObserver, and adds live clinic-hours status.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. live clinic status -------------------------
     Hours are the single source of truth for every status pill
     on the page. Times are minutes from midnight, evaluated in
     Asia/Kolkata so the badge is correct for a visitor in any
     timezone (e.g. relatives abroad checking the clinic hours). */

  var SESSIONS = [
    [9 * 60 + 30, 14 * 60],       //  9:30 AM – 2:00 PM
    [17 * 60 + 30, 22 * 60]       //  5:30 PM – 10:00 PM
  ];

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

  function fmt(mins) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    var ampm = h < 12 ? "AM" : "PM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ":" + (m < 10 ? "0" + m : m) : "") + " " + ampm;
  }

  function clinicStatus() {
    var now = clinicNow();

    for (var i = 0; i < SESSIONS.length; i++) {
      var open = SESSIONS[i][0], close = SESSIONS[i][1];

      if (now >= open && now < close) {
        var left = close - now;
        return {
          open: true,
          text: left <= 30
            ? "Closing in " + left + " min"
            : "Open now · until " + fmt(close)
        };
      }
      if (now < open) {
        var until = open - now;
        return {
          open: false,
          text: until <= 60
            ? "Opens in " + until + " min"
            : "Closed · opens " + fmt(open)
        };
      }
    }
    // past the last session — next opening is tomorrow morning
    return { open: false, text: "Closed · opens " + fmt(SESSIONS[0][0]) + " tomorrow" };
  }

  function paintStatus() {
    var s = clinicStatus();
    var pills = document.querySelectorAll(".status");

    for (var i = 0; i < pills.length; i++) {
      var pill = pills[i];
      var txt = pill.querySelector(".txt");
      if (txt) txt.textContent = s.text;
      pill.classList.toggle("is-open", s.open);
      pill.classList.toggle("is-closed", !s.open);
    }

    // mark whichever session row is live inside the location cards
    var now = clinicNow();
    var rows = document.querySelectorAll(".loc .hours .row");
    for (var j = 0; j < rows.length; j++) {
      var sess = SESSIONS[j % SESSIONS.length];
      rows[j].classList.toggle("now", now >= sess[0] && now < sess[1]);
    }
  }

  paintStatus();
  setInterval(paintStatus, 30000);

  /* ---------- 2. scroll reveal (replaces AOS) ---------- */
  var revealables = document.querySelectorAll(".reveal");

  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // stagger siblings so grids cascade instead of popping at once
        var sibs = Array.prototype.slice.call(el.parentNode.children);
        var idx = Math.min(sibs.indexOf(el), 5);
        el.style.transitionDelay = (idx * 90) + "ms";
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. sticky header + scroll progress + action bar ---------- */
  var nav = document.getElementById("siteNav");
  var progress = document.getElementById("progress");
  var actionbar = document.getElementById("actionbar");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (nav) nav.classList.toggle("stuck", y > 8);
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    if (actionbar) actionbar.classList.toggle("show", y > 420);

    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- 4. active section in nav ---------- */
  var navLinks = document.querySelectorAll(".nav-links a");
  var sections = [];
  navLinks.forEach(function (a) {
    var el = document.querySelector(a.getAttribute("href"));
    if (el) sections.push({ el: el, link: a });
  });

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove("active"); });
        var match = sections.find(function (s) { return s.el === entry.target; });
        if (match) match.link.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { spy.observe(s.el); });
  }

  /* ---------- 5. mobile drawer ---------- */
  var drawer = document.getElementById("drawer");
  var burger = document.getElementById("burger");
  var closeBtn = document.getElementById("closeDrawer");

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    if (burger) burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = drawer.querySelector("nav a");
      if (first) first.focus({ preventScroll: true });
    } else if (burger) {
      burger.focus({ preventScroll: true });
    }
  }

  if (burger) burger.addEventListener("click", function () { setDrawer(true); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setDrawer(false); });
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setDrawer(false); });
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("open")) setDrawer(false);
  });

  /* ---------- 6. theme toggle ---------- */
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

  /* ---------- 7. seamless marquee ---------- */
  var marquee = document.getElementById("marquee");
  if (marquee && !reduce) {
    // duplicate the items once so the -50% keyframe loops without a seam
    marquee.innerHTML += marquee.innerHTML;
  }

  /* ---------- 8. accordion: one open at a time ---------- */
  var faqItems = document.querySelectorAll(".faq details");
  faqItems.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      faqItems.forEach(function (other) { if (other !== d) other.open = false; });
    });
  });

  /* ---------- 9. footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
