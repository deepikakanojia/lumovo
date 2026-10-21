// Status: DRAFT
// Progressive enhancement only: all content is already in index.html.
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.add("js");

  var STORE_KEY = "lumovo.arrival.v1";
  var TOTAL = 3;
  var CHECK_HTML = ' <span class="check" title="Being verified before publishing">check</span>';

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  /* ---------- 1. Progress ---------- */
  function loadDone() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.done)) {
        return parsed.done.filter(function (n) { return n >= 1 && n <= TOTAL; });
      }
    } catch (e) { /* storage unavailable */ }
    return [];
  }
  function saveDone(list) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ done: list })); } catch (e) { /* ignore */ }
  }
  var done = loadDone();

  function renderProgress() {
    var n = done.length;
    var label = $("#progress-label");
    if (label) label.textContent = n + " / " + TOTAL + " steps";
    var bar = $("#progress-bar");
    if (bar) bar.style.width = (n / TOTAL * 100) + "%";
    var pb = $(".bar[role=progressbar]");
    if (pb) pb.setAttribute("aria-valuenow", String(n));
    $$(".step[data-step]").forEach(function (sec) {
      var num = Number(sec.getAttribute("data-step"));
      var isDone = done.indexOf(num) !== -1;
      sec.classList.toggle("done", isDone);
      var badge = $(".badge", sec);
      if (badge) badge.textContent = isDone ? "✓" : badge.getAttribute("data-num");
      var btn = $(".done-btn", sec);
      if (btn) {
        btn.setAttribute("aria-pressed", String(isDone));
        btn.textContent = isDone ? "Step done ✓ (undo)" : "Mark step done ✓";
        btn.classList.toggle("good", isDone);
        btn.classList.toggle("secondary", !isDone);
      }
    });
    $$("[data-recap]").forEach(function (li) {
      li.classList.toggle("done", done.indexOf(Number(li.getAttribute("data-recap"))) !== -1);
    });
  }

  $$(".done-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = Number(btn.getAttribute("data-done"));
      var i = done.indexOf(n);
      if (i === -1) done.push(n); else done.splice(i, 1);
      saveDone(done);
      renderProgress();
    });
  });
  var restart = $("#restart");
  if (restart) restart.addEventListener("click", function () {
    done = [];
    saveDone(done);
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    renderProgress();
    var top = $("#step-1");
    if (top) scrollToEl(top);
  });

  /* ---------- 5. Smooth scroll for in-page links ---------- */
  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href").slice(1);
      var target = id && doc.getElementById(id);
      if (!target) return;
      ev.preventDefault();
      scrollToEl(target);
      if (window.history && history.replaceState) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// */ } }
    });
  });

  /* ---------- 2. Greeting picker (tabs) ---------- */
  function defaultTabIndex(panels) {
    var h = new Date().getHours();
    var want = h >= 5 && h < 10 ? "Morning" : h >= 10 && h < 18 ? "Daytime" : h >= 18 && h < 22 ? "Evening" : "Night";
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].getAttribute("data-label") === want) return i;
    }
    return 0;
  }
  function initTabs() {
    var root = $("#greeting-picker");
    if (!root) return;
    var panels = $$(".tabpanel", root);
    if (!panels.length) return;
    var list = doc.createElement("div");
    list.className = "tabs";
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Time of day");
    var tabs = panels.map(function (p, i) {
      var t = doc.createElement("button");
      t.type = "button";
      t.setAttribute("role", "tab");
      t.id = "tab-" + i;
      p.id = p.id || "panel-" + i;
      p.setAttribute("aria-labelledby", t.id);
      t.setAttribute("aria-controls", p.id);
      t.textContent = p.getAttribute("data-label");
      list.appendChild(t);
      return t;
    });
    root.insertBefore(list, root.firstChild);
    function select(idx, focus) {
      tabs.forEach(function (t, i) {
        var on = i === idx;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[idx].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (ev) {
        var n = tabs.length, j = null;
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") j = (i + 1) % n;
        else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") j = (i + n - 1) % n;
        else if (ev.key === "Home") j = 0;
        else if (ev.key === "End") j = n - 1;
        if (j !== null) { ev.preventDefault(); select(j, true); }
      });
    });
    select(defaultTabIndex(panels), false);
  }

  /* ---------- Quick checks ---------- */
  function initQuickChecks() {
    $$("[data-quickcheck]").forEach(function (qc) {
      var items = $$(".qc-opts li", qc);
      var answer = $(".qc-answer", qc);
      if (!items.length || !answer) return;
      var wrap = doc.createElement("div");
      wrap.className = "qc-btns";
      var fb = doc.createElement("div");
      fb.className = "fb";
      fb.setAttribute("aria-live", "polite");
      items.forEach(function (li) {
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "opt-btn";
        b.innerHTML = li.innerHTML;
        var correct = li.getAttribute("data-correct") === "true";
        b.addEventListener("click", function () {
          $$(".opt-btn", wrap).forEach(function (x) { x.classList.remove("right", "wrong"); });
          if (correct) {
            b.classList.add("right");
            fb.className = "fb ok";
            fb.innerHTML = "<strong>Correct.</strong> " + answer.innerHTML;
          } else {
            b.classList.add("wrong");
            fb.className = "fb no";
            fb.innerHTML = "<strong>Not quite.</strong> " + answer.innerHTML + " Try again.";
          }
        });
        wrap.appendChild(b);
      });
      var anchor = $(".qc-opts", qc);
      anchor.parentNode.insertBefore(wrap, anchor);
      anchor.parentNode.insertBefore(fb, anchor);
    });
  }

  /* ---------- Checkout simulator ---------- */
  function initCheckout() {
    var sim = $("#checkout");
    if (!sim) return;
    var turns = $$(".turn", sim);
    var dots = $$(".dots i", sim);
    var fb = $("#checkout-fb");
    var win = $("#checkout-win");
    if (!turns.length) return;
    win.hidden = true;
    var current = 0;

    turns.forEach(function (turn, ti) {
      var ul = $(".opts", turn);
      var items = $$("li", ul);
      var btns = doc.createElement("div");
      btns.className = "reply-btns";
      items.forEach(function (li) {
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "opt-btn";
        b.innerHTML = li.innerHTML;
        var correct = li.getAttribute("data-correct") === "true";
        var text = li.getAttribute("data-feedback") || "";
        b.addEventListener("click", function () {
          if (ti !== current) return;
          if (!correct) {
            b.classList.add("wrong");
            fb.className = "fb no";
            fb.textContent = "Not quite." + (text ? " " + text : "");
            return;
          }
          $$(".opt-btn", btns).forEach(function (x) { x.disabled = true; });
          b.classList.add("right");
          fb.className = "fb ok";
          fb.textContent = text;
          if (dots[ti]) dots[ti].classList.add("on");
          current += 1;
          if (current < turns.length) {
            turns[current].hidden = false;
          } else {
            win.hidden = false;
          }
        });
        btns.appendChild(b);
      });
      ul.parentNode.replaceChild(btns, ul);
      turn.hidden = ti !== 0;
    });
  }

  /* ---------- Destination selector + option cards ---------- */
  var LABELS = [
    ["time", "Time"], ["price", "Price"], ["where", "Where"], ["which", "Which train"],
    ["ticket", "Ticket"], ["getOff", "Get off at"], ["goodFor", "Good for"], ["tip", "Tip"]
  ];
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cardHtml(o) {
    var rows = LABELS.map(function (pair) {
      var key = pair[0];
      if (!o[key]) return "";
      var badge = o.check && o.check.indexOf(key) !== -1 ? CHECK_HTML : "";
      return "<div><dt>" + pair[1] + "</dt><dd>" + o[key] + badge + "</dd></div>";
    }).join("");
    return '<div class="head"><h3><span>' + esc(o.labelEn) + '</span> (<em lang="fi">' + esc(o.labelFi) + "</em>)" +
      (o.recommended ? ' <span class="ribbon">Recommended</span>' : "") + "</h3></div>" +
      '<div class="opt-body"><dl class="info">' + rows + "</dl></div>";
  }
  function enhanceCards() {
    var cards = $$("#options .opt-card");
    cards.forEach(function (card, i) {
      var h3 = $("h3", card);
      var body = $(".opt-body", card);
      if (!h3 || !body) return;
      var btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "opt-toggle";
      btn.innerHTML = h3.innerHTML;
      body.id = body.id || "opt-body-" + i;
      btn.setAttribute("aria-controls", body.id);
      h3.innerHTML = "";
      h3.appendChild(btn);
      btn.addEventListener("click", function () { openCard(cards, i); });
    });
    if (cards.length) openCard(cards, 0);
  }
  function openCard(cards, idx) {
    cards.forEach(function (card, i) {
      var on = i === idx;
      var btn = $(".opt-toggle", card);
      var body = $(".opt-body", card);
      card.classList.toggle("open", on);
      if (btn) btn.setAttribute("aria-expanded", String(on));
      if (body) body.hidden = !on;
    });
  }
  function renderDestination(d) {
    var holder = $("#options");
    if (!holder || !d || !d.options) return;
    holder.innerHTML = "";
    d.options.forEach(function (o) {
      var art = doc.createElement("article");
      art.className = "opt-card";
      art.setAttribute("data-mode", o.mode);
      art.innerHTML = cardHtml(o);
      holder.appendChild(art);
    });
    enhanceCards();
    var card = $("#taxi-phrase");
    if (card) {
      var map = { fi: d.taxiPhraseFi, en: d.taxiPhraseEn, say: d.taxiPhraseSay };
      Object.keys(map).forEach(function (k) {
        var el = $('[data-taxi="' + k + '"]', card);
        if (!el) return;
        if (map[k]) { el.textContent = map[k]; el.hidden = false; } else { el.hidden = true; }
      });
    }
  }
  function initDestinations() {
    var data = window.LUMOVO_DESTINATIONS;
    var sel = $("#destination");
    if (!sel || !Array.isArray(data) || !data.length) { enhanceCards(); return; }
    var disabled = $$("option[disabled]", sel);
    sel.innerHTML = "";
    data.forEach(function (d, i) {
      var opt = doc.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name + " (" + d.nameFi + ")";
      if (i === 0) opt.selected = true;
      sel.appendChild(opt);
    });
    disabled.forEach(function (o) { sel.appendChild(o); });
    function current() {
      for (var i = 0; i < data.length; i++) if (data[i].id === sel.value) return data[i];
      return data[0];
    }
    sel.addEventListener("change", function () { renderDestination(current()); });
    renderDestination(current());
  }

  try { initTabs(); } catch (e) { /* keep static content */ }
  try { initQuickChecks(); } catch (e) { /* keep static content */ }
  try { initCheckout(); } catch (e) { /* keep static content */ }
  try { initDestinations(); } catch (e) { /* keep static content */ }
  renderProgress();
})();
