/* 2T Doorstep Car Detailing - site script
   ------------------------------------------------------------------
   EDIT THESE VALUES. Pack prices live in index.html on each pack card
   (data-small / data-mid / data-big).
   ------------------------------------------------------------------ */
const CONFIG = {
  // Country code + number, digits only. Example: "919876543210"
  WHATSAPP_NUMBER: "919629885790",
  BUSINESS_NAME: "2T Doorstep Car Detailing",
  ADDON_PRICE: 1000,

  // TODO: confirm with client what Small / Mid / Big mean
  SIZES: {
    small: { label: "Small", hint: "Hatchback" },
    mid:   { label: "Mid",   hint: "Sedan" },
    big:   { label: "Big",   hint: "SUV and 7-seater" }
  },

  // Open every day, 5 AM to 7 PM
  TIME_SLOTS: ["5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
               "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"],
  BOOK_DAYS_AHEAD: 60,      // how far ahead customers can book
  CLOSED_WEEKDAYS: [],      // open all 7 days. To close a day: 0 = Sunday ... 6 = Saturday
  MIN_LEAD_MINUTES: 90,     // same-day slots must be at least this far from now

  // Shared GPS locations outside this box are rejected as wrong (Wayanad and Gudalur, with a margin)
  SERVICE_BOUNDS: { minLat: 11.2, maxLat: 12.15, minLng: 75.55, maxLng: 76.85 },
  MAX_LOCATION_ERROR_M: 1000, // reject GPS readings less accurate than this
  GOOD_LOCATION_M: 30,        // stop refining once the reading is this accurate

  // Places served are listed in index.html (section "areas"); edit them there.
};

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const svg = (id, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formatINR = (n) => n.toLocaleString("en-IN");
  const toNumbers = (str) => (String(str).match(/[\d,]+/g) || []).map((s) => parseInt(s.replace(/,/g, ""), 10));
  const rangeText = (nums) => {
    const lo = Math.min(...nums), hi = Math.max(...nums);
    return lo === hi ? "₹" + formatINR(lo) : "₹" + formatINR(lo) + " – " + formatINR(hi);
  };
  const waLink = (msg) => "https://wa.me/" + CONFIG.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);

  if (CONFIG.WHATSAPP_NUMBER === "919999999999") {
    console.warn("[2T Doorstep] Set CONFIG.WHATSAPP_NUMBER in script.js to the real WhatsApp number.");
  }

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

  /* ================= Data from pack cards ================= */
  const packCards = $$(".pack");
  const PACKS = packCards.map((c) => ({
    name: c.dataset.pack, icon: c.dataset.icon,
    small: c.dataset.small, mid: c.dataset.mid, big: c.dataset.big, el: c
  }));
  const SPECIALS = $$(".js-book-service").map((b) => ({
    name: b.dataset.service, icon: b.dataset.icon,
    price: Number(b.dataset.price), from: !!b.dataset.from, per: b.dataset.per || ""
  }));
  // Every bookable service. nums(size) gives the price list; "from" means a starting price.
  const SERVICES = [
    ...PACKS.map((p) => ({ name: p.name, icon: p.icon, group: "Detailing packs", from: false, per: "", nums: (size) => toNumbers(p[size]) })),
    ...SPECIALS.map((x) => ({ name: x.name, icon: x.icon, group: "Coatings and specialist", from: x.from, per: x.per, nums: () => [x.price] }))
  ];
  const serviceByName = (n) => SERVICES.find((x) => x.name === n);
  const money = (nums, from) => (from ? "From " : "") + rangeText(nums);
  const unitLabel = (svc, size) => svc.per ? "₹" + formatINR(svc.nums(size)[0]) + " per " + svc.per : money(svc.nums(size), svc.from);

  /* ================= Booking state ================= */
  const state = {
    step: 1, maxStep: 1,
    pack: "", size: "small", lights: 2, car: "", addons: [],
    date: "", slot: "",
    name: "", phone: "", house: "", street: "", landmark: "", town: "", pin: "",
    gps: null, pastedLink: "", parking: "", notes: ""
  };

  /* ================= Size picker on pack section ================= */
  const sizeBtns = $$(".size-btn");
  Object.keys(CONFIG.SIZES).forEach((k) => { const el = $('[data-hint="' + k + '"]'); if (el) el.textContent = CONFIG.SIZES[k].hint; });

  function applySize(size, fromForm) {
    state.size = size;
    sizeBtns.forEach((b) => {
      const on = b.dataset.size === size;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    packCards.forEach((card) => {
      const amt = $(".amt", card), next = card.dataset[size];
      if (amt.textContent !== next) {
        amt.classList.add("is-changing");
        setTimeout(() => { amt.textContent = next; amt.classList.remove("is-changing"); }, 120);
      }
      const note = $(".js-size-note", card);
      if (note) note.textContent = CONFIG.SIZES[size].label + " car";
    });
    if (!fromForm) sizeSelect.setValue(size, true);
    packSelect.render();
    renderSummary();
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

  /* ================= Custom select ================= */
  function CustomSelect(root, getOptions, onChange) {
    const btn = $(".cselect-btn", root);
    const val = $(".cselect-val", root);
    const list = $(".cselect-list", root);
    const placeholder = root.dataset.placeholder;
    const uid = root.id;
    let value = "", active = -1, opts = [];

    function render() {
      opts = getOptions();
      let lastGroup = null;
      list.innerHTML = opts.map((o, i) =>
        (o.group && o.group !== lastGroup ? `<li class="opt-group" role="presentation">${esc((lastGroup = o.group))}</li>` : "") +
        `<li class="opt-item" role="option" id="${uid}-o${i}" data-value="${esc(o.value)}" aria-selected="${o.value === value}">
          ${o.icon ? `<span class="opt-ic">${svg(o.icon)}</span>` : ""}
          <span class="opt-text"><span class="opt-name">${esc(o.label)}</span>${o.sub ? `<span class="opt-sub">${esc(o.sub)}</span>` : ""}</span>
          ${o.price ? `<span class="opt-price">${esc(o.price)}</span>` : ""}
          ${svg("i-check", "ic opt-tick")}
        </li>`).join("");
      const cur = opts.find((o) => o.value === value);
      val.textContent = cur ? cur.label : placeholder;
      val.classList.toggle("is-placeholder", !cur);
      setActive(active);
    }
    function setActive(i) {
      active = Math.max(0, Math.min(i, opts.length - 1));
      $$(".opt-item", list).forEach((li, j) => li.classList.toggle("is-active", j === active));
      const el = $("#" + uid + "-o" + active);
      if (el) { list.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
    }
    function open() {
      if (!list.hidden) return;
      closeAllSelects(root);
      render();
      list.hidden = false;
      root.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      const idx = opts.findIndex((o) => o.value === value);
      setActive(idx >= 0 ? idx : 0);
      list.focus();
    }
    function close(focusBtn) {
      if (list.hidden) return;
      list.hidden = true;
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (focusBtn) btn.focus();
    }
    function choose(i) {
      const o = opts[i];
      if (!o) return;
      setValue(o.value);
      close(true);
    }
    function setValue(v, silent) {
      value = v;
      render();
      if (!silent) onChange(v);
    }

    btn.addEventListener("click", () => (list.hidden ? open() : close(true)));
    btn.addEventListener("keydown", (e) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
    });
    list.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); setActive(active + 1); break;
        case "ArrowUp": e.preventDefault(); setActive(active - 1); break;
        case "Home": e.preventDefault(); setActive(0); break;
        case "End": e.preventDefault(); setActive(opts.length - 1); break;
        case "Enter": case " ": e.preventDefault(); choose(active); break;
        case "Escape": e.preventDefault(); close(true); break;
        case "Tab": close(false); break;
        default:
          if (e.key.length === 1) {
            const k = e.key.toLowerCase();
            const start = active + 1;
            for (let n = 0; n < opts.length; n++) {
              const j = (start + n) % opts.length;
              if (opts[j].label.toLowerCase().startsWith(k)) { setActive(j); break; }
            }
          }
      }
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest(".opt-item");
      if (li) choose($$(".opt-item", list).indexOf(li));
    });
    list.addEventListener("mousemove", (e) => {
      const li = e.target.closest(".opt-item");
      if (li) { const j = $$(".opt-item", list).indexOf(li); if (j !== active) setActive(j); }
    });

    root._close = close;
    render();
    return { render, setValue, get value() { return value; }, button: btn };
  }

  function closeAllSelects(except) {
    $$(".cselect").forEach((r) => { if (r !== except && r._close) r._close(false); });
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".cselect")) closeAllSelects(); });

  const packSelect = CustomSelect($("#packSelect"),
    () => SERVICES.map((x) => x.group === "Detailing packs"
      ? { value: x.name, label: x.name, icon: x.icon, group: x.group, price: "₹" + formatINR(x.nums(state.size)[0]) + (x.nums(state.size).length > 1 ? "+" : "") }
      : { value: x.name, label: x.name, icon: x.icon, group: x.group, sub: unitLabel(x, state.size) }),
    (v) => { state.pack = v; clearErr("pack"); syncLights(); syncAddons(); renderSummary(); });

  const sizeSelect = CustomSelect($("#sizeSelect"),
    () => Object.keys(CONFIG.SIZES).map((k) => ({ value: k, label: CONFIG.SIZES[k].label, sub: CONFIG.SIZES[k].hint, icon: "i-car" })),
    (v) => applySize(v, true));
  sizeSelect.setValue("small", true);

  /* ================= Headlight count ================= */
  const lightsField = $("#lightsField");
  const lightBtns = $$("#lightsPick button");
  function syncLights() {
    const svc = serviceByName(state.pack);
    lightsField.hidden = !(svc && svc.per === "headlight");
  }
  lightBtns.forEach((b) => b.addEventListener("click", () => {
    state.lights = Number(b.dataset.value);
    lightBtns.forEach((x) => x.setAttribute("aria-checked", x === b ? "true" : "false"));
    renderSummary();
  }));

  /* ================= Errors ================= */
  function setErr(key, msg) {
    const p = $("#err-" + key);
    if (!p) return;
    p.textContent = msg || "";
    const f = p.closest(".field");
    if (f) f.classList.toggle("has-error", !!msg);
  }
  const clearErr = (key) => setErr(key, "");

  /* ================= Step 1 inputs ================= */
  const carInput = $("#f-car");
  carInput.addEventListener("input", () => { state.car = carInput.value.trim(); clearErr("car"); renderSummary(); });
  // Add-on prices come from the checkboxes (data-price, data-from)
  const ADDONS = {};
  $$("#addonToggles input").forEach((cb) => { ADDONS[cb.value] = { price: Number(cb.dataset.price || CONFIG.ADDON_PRICE), from: !!cb.dataset.from }; });
  const addonText = (a) => money([ADDONS[a].price], ADDONS[a].from);
  // AC disinfection is already part of Interior Deep Clean, so it cannot be added twice
  const acInput = $("#acToggle input");
  const acPrice = $("#acToggle .toggle-price");
  function syncAddons() {
    const included = state.pack === "Interior Deep Clean";
    acInput.disabled = included;
    $("#acToggle").classList.toggle("is-included", included);
    acPrice.textContent = included ? "Included" : acPrice.dataset.normal;
    if (included && acInput.checked) {
      acInput.checked = false;
      state.addons = $$("#addonToggles input:checked").map((c) => c.value);
    }
  }
  $$("#addonToggles input").forEach((cb) => cb.addEventListener("change", () => {
    state.addons = $$("#addonToggles input:checked").map((c) => c.value);
    renderSummary();
  }));

  /* ================= Calendar ================= */
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const dateOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = isoOf(today);
  const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + CONFIG.BOOK_DAYS_AHEAD);
  const longDate = (iso) => dateOf(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = (iso) => dateOf(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const cal = $("#calendar");
  const calGrid = $(".cal-grid", cal);
  const calMonth = $(".cal-month", cal);
  const prevBtn = $('[data-cal="prev"]', cal);
  const nextBtn = $('[data-cal="next"]', cal);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let focusISO = todayISO;

  function dayAllowed(d) {
    return d >= today && d <= lastDay && !CONFIG.CLOSED_WEEKDAYS.includes(d.getDay()) && slotsFor(isoOf(d)).some((s) => s.ok);
  }

  function renderCal() {
    const y = view.getFullYear(), m = view.getMonth();
    calMonth.textContent = view.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    prevBtn.disabled = y === today.getFullYear() && m === today.getMonth();
    nextBtn.disabled = new Date(y, m + 1, 1) > lastDay;

    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < first; i++) html += "<span></span>";
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const iso = isoOf(date);
      const ok = dayAllowed(date);
      const cls = ["cal-day", iso === todayISO ? "is-today" : "", iso === state.date ? "is-selected" : ""].join(" ").trim();
      const label = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
        (iso === todayISO ? ", today" : "") + (ok ? "" : ", unavailable");
      html += `<button type="button" class="${cls}" data-iso="${iso}" aria-label="${label}" aria-pressed="${iso === state.date}" tabindex="${iso === focusISO ? 0 : -1}" ${ok ? "" : "disabled"}>${d}</button>`;
    }
    calGrid.innerHTML = html;
    // make sure one day is tabbable
    if (!$('.cal-day[tabindex="0"]:not(:disabled)', calGrid)) {
      const firstOk = $(".cal-day:not(:disabled)", calGrid);
      if (firstOk) { firstOk.tabIndex = 0; focusISO = firstOk.dataset.iso; }
    }
  }

  function moveFocus(days) {
    let d = dateOf(focusISO);
    for (let n = 0; n < 62; n++) {
      d.setDate(d.getDate() + days);
      if (d < today || d > lastDay) return;
      if (dayAllowed(d)) break;
    }
    focusISO = isoOf(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
    renderCal();
    const el = $('[data-iso="' + focusISO + '"]', calGrid);
    if (el) el.focus();
  }

  calGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".cal-day");
    if (!b || b.disabled) return;
    selectDate(b.dataset.iso);
    const el = $('[data-iso="' + b.dataset.iso + '"]', calGrid);
    if (el) el.focus();
  });
  calGrid.addEventListener("keydown", (e) => {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key]) { e.preventDefault(); moveFocus(map[e.key]); }
    else if (e.key === "PageDown") { e.preventDefault(); moveFocus(28); }
    else if (e.key === "PageUp") { e.preventDefault(); moveFocus(-28); }
  });
  prevBtn.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  nextBtn.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });

  function selectDate(iso) {
    state.date = iso;
    focusISO = iso;
    clearErr("date");
    const still = slotsFor(iso).find((s) => s.label === state.slot);
    if (!still || !still.ok) state.slot = "";
    renderCal();
    renderSlots();
    renderSummary();
  }

  /* ================= Time slots ================= */
  const slotsWrap = $("#slots");
  const toMinutes = (label) => {
    const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    return h * 60 + parseInt(m[2], 10);
  };
  const slotGroup = (label) => { const m = toMinutes(label); return m < 12 * 60 ? "Morning" : m < 16 * 60 ? "Afternoon" : "Evening"; };
  function slotsFor(iso) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + CONFIG.MIN_LEAD_MINUTES;
    return CONFIG.TIME_SLOTS.map((label) => ({ label, ok: iso !== todayISO || toMinutes(label) >= nowMin }));
  }
  function renderSlots() {
    $("#slotDate").textContent = state.date ? longDate(state.date) : "Choose a date first";
    if (!state.date) {
      let lastG = "";
      slotsWrap.innerHTML = CONFIG.TIME_SLOTS.map((l) => {
        const g = slotGroup(l);
        const head = g !== lastG ? `<p class="slot-group">${(lastG = g)}</p>` : "";
        return head + `<button type="button" class="slot" role="radio" aria-checked="false" disabled>${svg("i-clock")}${l}</button>`;
      }).join("");
      return;
    }
    const list = slotsFor(state.date);
    const sel = list.findIndex((s) => s.label === state.slot);
    const firstOk = list.findIndex((s) => s.ok);
    let lastGroup = "";
    slotsWrap.innerHTML = list.map((s, i) => {
      const g = slotGroup(s.label);
      const head = g !== lastGroup ? `<p class="slot-group">${(lastGroup = g)}</p>` : "";
      return head + `<button type="button" class="slot" role="radio" data-slot="${s.label}" aria-checked="${s.label === state.slot}" tabindex="${(sel >= 0 ? i === sel : i === firstOk) ? 0 : -1}" ${s.ok ? "" : "disabled"}>${svg("i-clock")}${s.label}</button>`;
    }).join("");
  }
  slotsWrap.addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    state.slot = b.dataset.slot;
    clearErr("slot");
    renderSlots();
    const el = $('[data-slot="' + state.slot + '"]', slotsWrap);
    if (el) el.focus();
    renderSummary();
  });
  slotsWrap.addEventListener("keydown", (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const btns = $$(".slot:not(:disabled)", slotsWrap);
    const i = btns.indexOf(document.activeElement);
    const next = btns[(i + dir + btns.length) % btns.length];
    if (next) next.click();
  });

  /* ================= Step 3: address ================= */
  const fields = { name: "#f-name", phone: "#f-phone", house: "#f-house", street: "#f-street", landmark: "#f-landmark", town: "#f-town", pin: "#f-pin", notes: "#f-notes" };
  Object.keys(fields).forEach((k) => {
    const el = $(fields[k]);
    el.addEventListener("input", () => {
      if (k === "pin") el.value = el.value.replace(/\D/g, "").slice(0, 6);
      state[k] = el.value.trim();
      clearErr(k);
      renderSummary();
    });
  });

  /* ---------- Location: GPS with accuracy checks, or a pasted Maps link ---------- */
  const locateBox = $("#locateBox");
  const locateBtn = $("#locateBtn");
  const locateBtnText = $("#locateBtnText");
  const locateStatus = $("#locateStatus");
  const locateResult = $("#locateResult");
  const mapLinkInput = $("#f-maplink");
  const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m");
  // Test mode: open the site with ?testlocation to skip the service-area check and see raw readings
  const TEST_LOC = new URLSearchParams(location.search).has("testlocation");
  const inArea = (la, lo) => { if (TEST_LOC) return true; const b = CONFIG.SERVICE_BOUNDS; return la >= b.minLat && la <= b.maxLat && lo >= b.minLng && lo <= b.maxLng; };
  const MAPS_RE = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*$/i;
  let watchId = null, stopTimer = null;

  function setLocState(kind, msg) {
    locateBox.classList.remove("is-done", "is-warn", "is-busy");
    if (kind) locateBox.classList.add(kind);
    locateStatus.textContent = msg;
  }
  function stopWatch() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearTimeout(stopTimer);
    locateBtn.disabled = false;
  }
  function clearGps() {
    state.gps = null;
    locateResult.hidden = true;
    locateBtnText.textContent = "Use my current location";
    setLocState("", "Works best on your phone with GPS turned on.");
    renderSummary();
  }
  function finishGps(best) {
    stopWatch();
    if (!best) { setLocState("is-warn", "Could not get your location. Paste a Google Maps link below, or add a landmark."); return; }
    const { latitude: la, longitude: lo, accuracy: acc } = best.coords;
    if (!inArea(la, lo)) {
      state.gps = null; locateResult.hidden = true;
      setLocState("is-warn", "Your device gave a location outside Wayanad and Gudalur, so it is probably not correct. This happens on laptops, or when GPS or precise location is off. Try on your phone with GPS on, or paste a Google Maps link below.");
      renderSummary(); return;
    }
    if (acc > CONFIG.MAX_LOCATION_ERROR_M) {
      state.gps = null; locateResult.hidden = true;
      setLocState("is-warn", "Your location is only accurate to about " + fmtDist(acc) + ", too rough to find you. Turn on GPS and precise location, then try again, or paste a Google Maps link below.");
      renderSummary(); return;
    }
    state.gps = { la, lo, acc };
    $("#locateAcc").textContent = "Pin added, within " + fmtDist(acc);
    $("#locateMap").href = gpsLink();
    locateResult.hidden = false;
    locateBtnText.textContent = "Update location";
    setLocState("is-done", acc > 100 ? "This pin is approximate. Please add a landmark so we can find you." : "Check the pin on the map before you send.");
    if (TEST_LOC) locateStatus.textContent = "Test mode (area check off). Lat " + la.toFixed(6) + ", Lng " + lo.toFixed(6) + ", accuracy " + fmtDist(acc) + ".";
    renderSummary();
  }
  const gpsLink = () => state.gps ? "https://www.google.com/maps?q=" + state.gps.la.toFixed(6) + "," + state.gps.lo.toFixed(6) : "";

  locateBtn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) { setLocState("is-warn", "This browser cannot share location. Paste a Google Maps link below instead."); return; }
    if (!window.isSecureContext) { setLocState("is-warn", "Location only works when the site is opened over https, such as on the live site."); return; }
    stopWatch();
    let best = null;
    locateBtn.disabled = true;
    setLocState("is-busy", "Finding your location…");
    watchId = navigator.geolocation.watchPosition((pos) => {
      if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
      setLocState("is-busy", "Improving accuracy… currently about " + fmtDist(best.coords.accuracy));
      if (best.coords.accuracy <= CONFIG.GOOD_LOCATION_M) finishGps(best);
    }, (err) => {
      if (best) { finishGps(best); return; }
      stopWatch();
      const msg = err.code === 1
        ? "Location permission is blocked. Allow location for this site in your browser settings, or paste a Google Maps link below."
        : "Could not get your location. Make sure GPS is on, or paste a Google Maps link below.";
      setLocState("is-warn", msg);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    stopTimer = setTimeout(() => finishGps(best), 15000);
  });
  if (TEST_LOC) setLocState("", "Test mode is on: the service-area check is switched off.");
  $("#locateClear").addEventListener("click", () => { clearGps(); locateBtn.focus(); });

  mapLinkInput.addEventListener("input", () => {
    state.pastedLink = mapLinkInput.value.trim();
    clearErr("maplink");
    renderSummary();
  });
  const mapLinkFinal = () => (state.pastedLink && MAPS_RE.test(state.pastedLink) ? state.pastedLink : gpsLink());

  const parkBtns = $$("#parking button");
  parkBtns.forEach((b) => b.addEventListener("click", () => {
    const on = b.getAttribute("aria-checked") !== "true";
    parkBtns.forEach((x) => x.setAttribute("aria-checked", "false"));
    b.setAttribute("aria-checked", on ? "true" : "false");
    state.parking = on ? b.dataset.value : "";
    renderSummary();
  }));

  /* ================= Totals and summaries ================= */
  function totals() {
    const svc = serviceByName(state.pack);
    if (!svc) return null;
    const qty = svc.per === "headlight" ? state.lights : 1;
    const base = svc.nums(state.size).map((n) => n * qty);
    const extra = state.addons.reduce((sum, a) => sum + ADDONS[a].price, 0);
    const from = svc.from || state.addons.some((a) => ADDONS[a].from);
    return { svc, qty, base, extra, from, total: base.map((n) => n + extra) };
  }
  const serviceLine = () => {
    const t = totals();
    if (!t) return state.pack;
    return state.pack + (t.svc.per === "headlight" ? " × " + t.qty : "");
  };
  const sizeText = () => CONFIG.SIZES[state.size].label + " (" + CONFIG.SIZES[state.size].hint + ")";
  const addressText = () => [state.house, state.street, state.landmark ? "Near " + state.landmark : "", state.town].filter(Boolean).join(", ") + (state.pin ? " - " + state.pin : "");

  function renderSummary() {
    const t = totals();
    const rows = [
      ["Service", serviceLine()],
      ["Car", state.car ? state.car + " · " + CONFIG.SIZES[state.size].label : CONFIG.SIZES[state.size].label + " car"],
      ["Add-ons", state.addons.join(", ")],
      ["Date and time", state.date ? shortDate(state.date) + (state.slot ? ", " + state.slot : "") : ""],
      ["Address", addressText()]
    ];
    $("#summary").innerHTML = rows.map(([k, v]) =>
      `<div><dt>${k}</dt><dd class="${v ? "" : "is-empty"}">${v ? esc(v) : "Not chosen yet"}</dd></div>`).join("");
    $("#summaryTotal").textContent = t ? money(t.total, t.from) : "–";
  }

  function renderReview() {
    const t = totals();
    const dl = (pairs) => "<dl>" + pairs.filter((p) => p[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("") + "</dl>";
    const block = (icon, title, step, body) =>
      `<section class="review-block"><div class="review-head"><h4>${svg(icon)}${title}</h4><button type="button" class="review-edit" data-go="${step}">Edit</button></div>${body}</section>`;
    $("#review").innerHTML =
      block("i-car", "Service", 1, dl([["Service", state.pack], ["Headlights", totals().svc.per === "headlight" ? String(state.lights) : ""], ["Car size", sizeText()], ["Car", state.car], ["Add-ons", state.addons.join(", ") || "None"]])) +
      block("i-cal", "Date and time", 2, dl([["Date", longDate(state.date)], ["Time", state.slot]])) +
      block("i-pin", "Address", 3, dl([["Name", state.name], ["Phone", state.phone], ["Address", addressText()], ["Map location", state.pastedLink && MAPS_RE.test(state.pastedLink) ? "Google Maps link added" : state.gps ? "GPS pin, about " + fmtDist(state.gps.acc) : ""], ["Parking", state.parking], ["Notes", state.notes]])) +
      `<div class="review-total">
        <div class="line"><span>${esc(serviceLine())}</span><span>${money(t.base, t.svc.from)}</span></div>
        ${state.addons.map((a) => `<div class="line"><span>${esc(a)}</span><span>${addonText(a)}</span></div>`).join("")}
        <div class="line total"><span>Estimated total</span><strong>${money(t.total, t.from)}</strong></div>
        ${t.from ? '<p class="review-note">Starting price. The final price is confirmed after we see your car.</p>' : ""}
      </div>`;
  }

  /* ================= Wizard ================= */
  const wizard = $("#wizard");
  const panels = $$(".panel", wizard);
  const progressBtns = $$(".progress-step", wizard);
  const backBtn = $("#backBtn"), nextBtnW = $("#nextBtn"), sendBtn = $("#sendBtn");

  function validate(step) {
    const bad = [];
    const need = (key, ok, msg, focusEl) => { if (!ok) { setErr(key, msg); bad.push(focusEl); } else clearErr(key); };
    if (step === 1) {
      need("pack", state.pack, "Select a service.", packSelect.button);
      need("car", state.car, "Enter your car make and model.", carInput);
    }
    if (step === 2) {
      need("date", state.date, "Choose a date.", $(".cal-day:not(:disabled)", calGrid));
      need("slot", state.slot, state.date ? "Choose a time slot." : "", $(".slot:not(:disabled)", slotsWrap));
    }
    if (step === 3) {
      need("name", state.name, "Enter your name.", $("#f-name"));
      need("phone", !state.phone || state.phone.replace(/\D/g, "").length >= 10, "Enter a valid 10-digit phone number, or leave it empty.", $("#f-phone"));
      need("house", state.house, "Enter your house or flat number.", $("#f-house"));
      need("street", state.street, "Enter your street and area.", $("#f-street"));
      need("town", state.town, "Enter your town or city.", $("#f-town"));
      need("pin", /^\d{6}$/.test(state.pin), "Enter a 6-digit pincode.", $("#f-pin"));
      need("maplink", !state.pastedLink || MAPS_RE.test(state.pastedLink), "This does not look like a Google Maps link. In Google Maps, tap Share, then Copy link, and paste it here.", mapLinkInput);
    }
    if (bad[0]) bad[0].focus();
    return bad.length === 0;
  }

  function goTo(step, opts = {}) {
    state.step = step;
    state.maxStep = Math.max(state.maxStep, step);
    panels.forEach((p) => { p.hidden = Number(p.dataset.step) !== step; });
    progressBtns.forEach((b) => {
      const n = Number(b.dataset.go);
      b.classList.toggle("is-current", n === step);
      b.classList.toggle("is-done", n < step || (n <= state.maxStep && n !== step));
      b.disabled = n > state.maxStep;
      if (n === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.parentElement.classList.toggle("is-reached", n <= state.maxStep);
    });
    backBtn.hidden = step === 1;
    nextBtnW.hidden = step === 4;
    sendBtn.hidden = step !== 4;
    if (step === 2) { renderCal(); renderSlots(); }
    if (step === 4) renderReview();
    if (opts.focus !== false) {
      const top = wizard.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) wizard.scrollIntoView({ behavior: "smooth", block: "start" });
      $(".panel-title", panels[step - 1]).focus({ preventScroll: true });
    }
  }

  nextBtnW.addEventListener("click", () => { if (validate(state.step)) goTo(state.step + 1); });
  backBtn.addEventListener("click", () => goTo(state.step - 1));
  progressBtns.forEach((b) => b.addEventListener("click", () => {
    const n = Number(b.dataset.go);
    if (n > state.step && !validate(state.step)) return;
    goTo(n);
  }));
  $("#review").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) goTo(Number(b.dataset.go)); });
  wizard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && state.step < 4) { e.preventDefault(); nextBtnW.click(); }
  });

  function bookingRef() {
    const d = new Date();
    return "2T-" + pad(d.getDate()) + pad(d.getMonth() + 1) + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  function buildMessage() {
    const t = totals();
    const line = "──────────────";
    const L = [
      "*NEW BOOKING REQUEST*",
      "Ref: " + bookingRef(),
      line,
      "",
      "🚗 *SERVICE*",
      "• Service: " + state.pack,
      t.svc.per === "headlight" ? "• Headlights: " + t.qty : null,
      "• Car: " + state.car,
      "• Size: " + sizeText()
    ];
    if (state.addons.length) L.push("• Add-ons: " + state.addons.join(", "));
    L.push(
      "",
      "📅 *DATE AND TIME*",
      "• " + longDate(state.date) + ", " + dateOf(state.date).getFullYear(),
      "• " + state.slot,
      "",
      "📍 *ADDRESS*",
      "• " + state.name + (state.phone ? ", " + state.phone : ""),
      "• " + [state.house, state.street].filter(Boolean).join(", "),
      state.landmark ? "• Near " + state.landmark : null,
      "• " + state.town + " - " + state.pin
    );
    const map = mapLinkFinal();
    if (map) L.push("• Map: " + map);
    if (state.parking) L.push("• Parking: " + state.parking);
    if (state.notes) L.push("", "📝 *NOTES*", state.notes);
    L.push(
      "",
      "💰 *ESTIMATED TOTAL: " + money(t.total, t.from) + "*",
      "• " + serviceLine() + ": " + money(t.base, t.svc.from)
    );
    state.addons.forEach((a) => L.push("• " + a + ": " + addonText(a)));
    if (t.from) L.push("• Final price confirmed after inspection");
    L.push(line, "Please confirm my slot. Thank you!");
    return L.filter((x) => x !== null).join("\n");
  }

  wizard.addEventListener("submit", (e) => {
    e.preventDefault();
    for (let s = 1; s <= 3; s++) { if (!validate(s)) { goTo(s); validate(s); return; } }
    window.open(waLink(buildMessage()), "_blank", "noopener");
  });

  /* ================= "Book this pack" buttons ================= */
  $$(".js-book-pack").forEach((b) => b.addEventListener("click", () => {
    const name = b.closest(".pack").dataset.pack;
    packSelect.setValue(name);
    sizeSelect.setValue(state.size, true);
    goTo(1, { focus: false });
    $("#book").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => carInput.focus({ preventScroll: true }), 600);
  }));

  $$(".js-book-service").forEach((b) => b.addEventListener("click", () => {
    packSelect.setValue(b.dataset.service);
    sizeSelect.setValue(state.size, true);
    goTo(1, { focus: false });
    $("#book").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => carInput.focus({ preventScroll: true }), 600);
  }));

  /* ================= Direct WhatsApp chat links ================= */
  $$(".js-wa-chat").forEach((a) => {
    a.href = waLink("Hello " + CONFIG.BUSINESS_NAME + ", I'd like to know more about your car detailing services.");
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ================= Sticky mobile button hides at the form ================= */
  const sticky = $("#stickyCta");
  if (sticky && "IntersectionObserver" in window) {
    const seen = new Set();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
      sticky.classList.toggle("is-hidden", seen.size > 0);
    }, { threshold: 0.05 });
    [$(".hero-actions"), $("#areas"), $("#book"), $(".cta-band"), $(".site-footer")].forEach((el) => el && obs.observe(el));
  }

  /* ================= Area chips, footer ================= */
  const n = CONFIG.WHATSAPP_NUMBER;
  if (n.length > 2) $("#footerPhone").textContent = "+" + n.slice(0, 2) + " " + n.slice(2, 7) + " " + n.slice(7);
  $("#year").textContent = new Date().getFullYear();

  /* ================= Service area checker ================= */
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z]/g, "");
  const PLACES = $$(".place").map((b) => {
    const name = b.firstChild.textContent.trim();
    const keys = [name].concat((b.dataset.aka || "").split(",")).map(norm).filter(Boolean);
    return { name, kind: name === "Gudalur" ? "Town, Tamil Nadu" : b.dataset.kind, keys };
  });
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

  const areaInput = $("#areaInput");
  const areaSuggest = $("#areaSuggest");
  const areaResult = $("#areaResult");
  const waAsk = (place) => waLink("Hello " + CONFIG.BUSINESS_NAME + ", do you provide doorstep car detailing in " + place + "?");

  function showResult(place, found) {
    areaSuggest.hidden = true;
    areaResult.className = "area-result " + (found ? "is-yes" : "is-no");
    areaResult.innerHTML = found
      ? `<div class="area-result-text">${svg("i-check")}<span><strong>Yes, we come to ${esc(place.name)}.</strong> Book a time that suits you.</span></div>
         <button type="button" class="btn btn-primary btn-sm" data-book-town="${esc(place.name)}">Book in ${esc(place.name)}</button>`
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
    const btn = $("[data-book-town]", areaResult); if (btn) btn.focus();
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
  areaResult.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book-town]");
    if (!b) return;
    const town = b.dataset.bookTown;
    const t = $("#f-town"); t.value = town; state.town = town; syncTownHint();
    renderSummary();
    $("#book").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const villagesBox = $("#villages");
  const villagesToggle = $("#villagesToggle");
  villagesToggle.addEventListener("click", () => {
    const open = villagesBox.hidden;
    villagesBox.hidden = !open;
    villagesToggle.setAttribute("aria-expanded", open ? "true" : "false");
    $("span", villagesToggle).textContent = open ? "Hide villages" : "Show " + $$(".place", villagesBox).length + " villages";
  });

  // Booking form: gentle note when the town is not on the list (never blocks booking)
  const townHint = $("#townHint");
  function syncTownHint() {
    const t = $("#f-town").value.trim();
    const show = t.length >= 3 && !isServed(t);
    townHint.hidden = !show;
    if (show) townHint.textContent = t + " is not on our usual list. Send the booking anyway and we will confirm on WhatsApp if we can reach you.";
  }
  $("#f-town").addEventListener("change", syncTownHint);
  $("#f-town").addEventListener("blur", syncTownHint);

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

  /* ================= Init ================= */
  applySize("small");
  renderCal();
  renderSlots();
  goTo(1, { focus: false });
})();
