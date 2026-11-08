/* 2T Doorstep Car Detailing - shared script (home page + booking page)
   Prices, services, areas and settings live in data.js.
*/
(function () {
  "use strict";
  const SITE = window.SITE;
  const CONFIG = SITE.CONFIG;

  /* ================= Helpers (also used by booking.js) ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const svg = (id, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formatINR = (n) => Number(n).toLocaleString("en-IN");
  const rangeText = (nums) => {
    const lo = Math.min(...nums), hi = Math.max(...nums);
    return lo === hi ? "₹" + formatINR(lo) : "₹" + formatINR(lo) + " – " + formatINR(hi);
  };
  const money = (nums, from) => (from ? "From " : "") + rangeText(nums);
  const waLink = (msg) => "https://wa.me/" + CONFIG.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  const bookUrl = (params) => {
    const q = Object.keys(params).filter((k) => params[k]).map((k) => k + "=" + encodeURIComponent(params[k])).join("&");
    return "/book" + (q ? "?" + q : "");
  };

  /* ================= Services from data.js ================= */
  // nums(size) gives the price list for a car size; "from" means a starting price.
  const SERVICES = [
    ...SITE.PACKS.map((p) => ({ name: p.name, icon: p.icon, group: "Detailing packs", from: false, per: "", nums: (size) => [p.prices[size]] })),
    ...SITE.SPECIALS.map((x) => ({ name: x.name, icon: x.icon, group: "Coatings and specialist", from: !!x.from, per: x.per || "", nums: () => [x.price] }))
  ];
  const serviceByName = (n) => SERVICES.find((x) => x.name === n);
  const unitLabel = (svc, size) => svc.per ? "₹" + formatINR(svc.nums(size)[0]) + " per " + svc.per : money(svc.nums(size), svc.from);
  const ADDONS = {};
  SITE.ADDONS.forEach((a) => { ADDONS[a.name] = { price: a.price, from: !!a.from, icon: a.icon, includedIn: a.includedIn || "" }; });

  /* ================= Places we serve (matching) ================= */
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z]/g, "");
  const toPlace = (kind) => (p) => ({
    name: p.name, kind: p.state ? kind + ", " + p.state : kind,
    keys: [p.name].concat(p.aka || []).map(norm).filter(Boolean)
  });
  const PLACES = SITE.TOWNS.map(toPlace("Town")).concat(SITE.VILLAGES.map(toPlace("Village")));
  const isServed = (t) => PLACES.some((p) => p.keys.includes(norm(t)));
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // Lower score = better match. Allows common spellings and small typos.
  function matchPlaces(q) {
    const n = norm(q);
    if (n.length < 2) return [];
    const scored = PLACES.map((p) => {
      let best = 99;
      p.keys.forEach((k) => {
        if (k === n) best = Math.min(best, 0);
        else if (k.startsWith(n)) best = Math.min(best, 1);
        else if (n.length >= 3 && k.includes(n)) best = Math.min(best, 2);
        else if (n.length >= 4) {
          const dist = editDistance(n, k.slice(0, Math.max(n.length, Math.min(k.length, n.length + 1))));
          const full = editDistance(n, k);
          const tol = n.length >= 7 ? 2 : 1;
          if (Math.min(dist, full) <= tol) best = Math.min(best, 3 + Math.min(dist, full));
        }
      });
      return { p, best };
    }).filter((x) => x.best < 99);
    scored.sort((a, b) => a.best - b.best || a.p.name.localeCompare(b.p.name));
    return scored.slice(0, 6);
  }


  window.T2 = { SITE, CONFIG, $, $$, svg, esc, formatINR, rangeText, money, waLink, bookUrl, SERVICES, serviceByName, unitLabel, ADDONS, PLACES, isServed };

  /* ================= Scroll reveal ================= */
  document.documentElement.classList.add("js");
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el, i) => { el.style.setProperty("--rd", (i % 3) * 0.08 + "s"); io.observe(el); });
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ================= Home page: prices from data.js ================= */
  // Elements with data-price-of="Service or add-on name" show that price.
  $$("[data-price-of]").forEach((el) => {
    const name = el.dataset.priceOf;
    const svc = serviceByName(name), add = ADDONS[name];
    if (svc) el.textContent = svc.per ? "₹" + formatINR(svc.nums()[0]) + " per " + svc.per : ("plain" in el.dataset ? rangeText(svc.nums()) : money(svc.nums(), svc.from));
    else if (add) el.textContent = money([add.price], add.from);
  });
  const lowestAddon = Math.min(...SITE.ADDONS.map((a) => a.price));
  $$("[data-lowest-addon]").forEach((el) => { el.textContent = "₹" + formatINR(lowestAddon); });
  const lowestPack = Math.min(...SITE.PACKS.map((p) => Math.min(p.prices.small, p.prices.mid, p.prices.big)));
  $$("[data-lowest-pack]").forEach((el) => { el.textContent = "₹" + formatINR(lowestPack); });

  /* ================= Home page: size picker on the pack cards ================= */
  const packCards = $$(".pack");
  const sizeBtns = $$(".size-btn");
  let homeSize = "small";
  Object.keys(CONFIG.SIZES).forEach((k) => { const el = $('[data-hint="' + k + '"]'); if (el) el.textContent = CONFIG.SIZES[k].hint; });
  function applySize(size) {
    homeSize = size;
    sizeBtns.forEach((b) => {
      const on = b.dataset.size === size;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    packCards.forEach((card) => {
      const svc = serviceByName(card.dataset.pack);
      if (!svc) return;
      const amt = $(".amt", card), next = formatINR(svc.nums(size)[0]);
      if (amt.textContent !== next) {
        amt.classList.add("is-changing");
        setTimeout(() => { amt.textContent = next; amt.classList.remove("is-changing"); }, 120);
      }
      const note = $(".js-size-note", card);
      if (note) note.textContent = CONFIG.SIZES[size].label + " car";
    });
  }
  sizeBtns.forEach((b, i) => {
    b.addEventListener("click", () => applySize(b.dataset.size));
    b.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = sizeBtns[(i + dir + sizeBtns.length) % sizeBtns.length];
      next.focus();
      applySize(next.dataset.size);
    });
  });
  if (packCards.length) applySize("small");

  // Book links carry the chosen car size to the booking page
  $$("a.js-book-pack, a.js-book-service").forEach((a) => a.addEventListener("click", () => {
    const url = new URL(a.getAttribute("href"), location.href);
    url.searchParams.set("size", homeSize);
    a.href = "/book" + url.search;
  }));

  /* ================= Home page: service area checker ================= */
  const areaInput = $("#areaInput");
  if (areaInput) {
    const areaSuggest = $("#areaSuggest");
    const areaResult = $("#areaResult");
    const waAsk = (place) => waLink("Hello " + CONFIG.BUSINESS_NAME + ", do you provide doorstep car detailing in " + place + "?");

    function showResult(place, found) {
      areaSuggest.hidden = true;
      areaResult.className = "area-result " + (found ? "is-yes" : "is-no");
      areaResult.innerHTML = found
        ? `<div class="area-result-text">${svg("i-check")}<span><strong>Yes, we come to ${esc(place.name)}.</strong> Book a time that suits you.</span></div>
           <a class="btn btn-primary btn-sm" href="${bookUrl({ town: place.name })}">Book in ${esc(place.name)}</a>`
        : `<div class="area-result-text">${svg("i-pin")}<span><strong>${esc(place)} is not on our list yet.</strong> We may still reach you. Ask us and we will confirm.</span></div>
           <a class="btn btn-gold btn-sm" href="${waAsk(place)}" target="_blank" rel="noopener">${svg("i-wa")}Ask on WhatsApp</a>`;
    }
    function renderSuggest() {
      const q = areaInput.value.trim();
      const hits = matchPlaces(q);
      areaResult.className = "area-result"; areaResult.innerHTML = "";
      if (!q) { areaSuggest.hidden = true; return; }
      if (hits.length && hits[0].best === 0) { showResult(hits[0].p, true); return; }
      if (!hits.length) {
        areaSuggest.hidden = true;
        if (norm(q).length >= 3) showResult(q, false);
        return;
      }
      areaSuggest.innerHTML = hits.map(({ p }) =>
        `<li><button type="button" class="suggest-item" data-place="${esc(p.name)}">${svg("i-pin")}<span>${esc(p.name)}</span><small>${esc(p.kind)}</small></button></li>`).join("");
      areaSuggest.hidden = false;
    }
    areaInput.addEventListener("input", renderSuggest);
    areaInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && !areaSuggest.hidden) { e.preventDefault(); const f = $(".suggest-item", areaSuggest); if (f) f.focus(); }
      if (e.key === "Enter") {
        e.preventDefault();
        const hits = matchPlaces(areaInput.value);
        if (hits.length) { areaInput.value = hits[0].p.name; showResult(hits[0].p, true); }
        else if (areaInput.value.trim()) showResult(areaInput.value.trim(), false);
      }
      if (e.key === "Escape") areaSuggest.hidden = true;
    });
    areaSuggest.addEventListener("click", (e) => {
      const b = e.target.closest("[data-place]");
      if (!b) return;
      const p = PLACES.find((x) => x.name === b.dataset.place);
      areaInput.value = p.name; showResult(p, true);
      const btn = $("a.btn", areaResult); if (btn) btn.focus();
    });
    areaSuggest.addEventListener("keydown", (e) => {
      const items = $$(".suggest-item", areaSuggest);
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); i <= 0 ? areaInput.focus() : items[i - 1].focus(); }
      if (e.key === "Escape") { areaSuggest.hidden = true; areaInput.focus(); }
    });
    $$(".place").forEach((b) => b.addEventListener("click", () => {
      const p = PLACES.find((x) => x.name === b.firstChild.textContent.trim());
      areaInput.value = p.name; showResult(p, true);
      areaResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }));
    const villagesBox = $("#villages");
    const villagesToggle = $("#villagesToggle");
    villagesToggle.addEventListener("click", () => {
      const open = villagesBox.hidden;
      villagesBox.hidden = !open;
      villagesToggle.setAttribute("aria-expanded", open ? "true" : "false");
      $("span", villagesToggle).textContent = open ? "Hide villages" : "Show " + $$(".place", villagesBox).length + " villages";
    });
  }

  /* ================= Direct WhatsApp chat links ================= */
  $$(".js-wa-chat").forEach((a) => {
    a.href = waLink("Hello " + CONFIG.BUSINESS_NAME + ", I'd like to know more about your car detailing services.");
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ================= Footer ================= */
  const n = CONFIG.WHATSAPP_NUMBER;
  const phone = $("#footerPhone");
  if (phone && n.length > 2) phone.textContent = "+" + n.slice(0, 2) + " " + n.slice(2, 7) + " " + n.slice(7);
  const year = $("#year"); if (year) year.textContent = new Date().getFullYear();

  /* ================= Clean address bar: no #section ================= */
  // Menu links still scroll to their section, but the address stays yourdomain.in
  const onHome = !!document.getElementById("packs");
  const goSection = (id, smooth) => {
    const el = document.getElementById(id);
    if (!el) return false;
    if (id === "top") window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    else el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    return true;
  };
  document.addEventListener("click", (e) => {
    if (!onHome || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest("a[href]");
    const m = a && a.getAttribute("href").match(/^\/?#([\w-]+)$/);
    if (m && goSection(m[1], true)) e.preventDefault();
  });
  // Arriving from the booking page with /#packs: scroll there, then tidy the address
  if (onHome && location.hash.length > 1) {
    const id = location.hash.slice(1);
    history.replaceState(null, "", location.pathname);
    requestAnimationFrame(() => goSection(id, false));
  }

  /* ================= Mobile menu ================= */
  const menuBtn = $("#menuBtn");
  const menu = $("#mobileMenu");
  function setMenu(open, focusBack) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    if (open) { const first = $("a", menu); if (first) first.focus(); }
    else if (focusBack) menuBtn.focus();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => setMenu(menu.hidden));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false, true); });
    window.matchMedia("(min-width: 900px)").addEventListener("change", (mq) => { if (mq.matches) setMenu(false); });
  }

})();
