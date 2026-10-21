// Status: DRAFT
// Lumovo "Arrival" game engine. Consumes window.LUMOVO_JOURNEY (journey.js) and window.LumovoArt (art.js).
(function () {
  "use strict";

  var J = window.LUMOVO_JOURNEY;
  var KEY = "lumovo.arrival.game.v1";
  var PALETTE = ["#1b4fbf", "#2fe0a8", "#8b6cff", "#ffa62b", "#e5384f", "#f6f1e7", "#ffd23f", "#1e6b4f"];
  var NPC_COLORS = { fjord: "#1b4fbf", aurora2: "#8b6cff", taxi: "#ffd23f", cloudberry: "#ffa62b", aurora: "#2fe0a8", lingon: "#e5384f", pine: "#1e6b4f" };
  var SKY = {
    morning: ["#ffb88c", "#ffe2b8", "#bfe6ff"],
    day: ["#3e9bff", "#9fd4ff", "#e2f3ff"],
    evening: ["#ff7b54", "#d9487a", "#4a2c7a"],
    night: ["#070f2b", "#14245a", "#14245a"]
  };

  var $ = function (id) { return document.getElementById(id); };
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------------- tiny helpers ---------------- */
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    var k;
    props = props || {};
    for (k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
      var v = props[k];
      if (v === false || v === null || v === undefined) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function later(fn, ms) { return setTimeout(fn, ms); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function checkBadge() {
    return h("span", { class: "check-badge", title: "Being verified by a native speaker", text: "CHECK" });
  }

  /* ---------------- state ---------------- */
  function freshState() {
    return { v: 1, time: "day", route: null, scene: "start", xp: 0, stars: {}, done: {}, cards: {}, stamps: {}, hard: false, lantern: false };
  }
  var S = freshState();
  var R = { id: "start" };      // runtime state of the visible scene (not saved)
  var busy = false;
  var pendingFly = 0;
  var lastFocusBeforeDeck = null;

  function loadSave() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.v !== 1 || !J.scenes[o.scene]) return null;
      var f = freshState();
      for (var k in f) if (!(k in o)) o[k] = f[k];
      return o;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function clearSave() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ---------------- tokens ---------------- */
  function greeting() {
    var g = J.greetings[S.time] || J.greetings.day;
    if (S.time === "night") {
      var a = J.nightRule.arrival;
      return { casual: a.casual, polite: a.polite, distractor: g.distractor,
        casualEn: a.casualEn, politeEn: a.politeEn, distractorEn: g.distractorEn, cards: g.cards };
    }
    return g;
  }
  function T(s) {
    if (typeof s !== "string") return s;
    return s.replace(/\{greeting\.(\w+)\}/g, function (m, k) {
      var g = greeting(); return g[k] !== undefined ? g[k] : m;
    });
  }
  function scene(id) { return J.scenes[id]; }
  function totalCards() { return Object.keys(J.cards).length; }
  function cardCount() { return Object.keys(S.cards).length; }

  /* ---------------- art / stage ---------------- */
  var stage, panel, panelBody, fx, doorsEl, mainEl;
  var artCssInjected = false;

  function injectArtCss() {
    if (artCssInjected) return;
    if (window.LumovoArt && typeof window.LumovoArt.css === "string" && !$("lumovo-art-css")) {
      var st = document.createElement("style");
      st.id = "lumovo-art-css";
      st.textContent = window.LumovoArt.css;
      document.head.appendChild(st);
    }
    if (window.LumovoArt) artCssInjected = true;
  }

  function placeholder(id) {
    var c = SKY[S.time] || SKY.day;
    var wrap = h("div", { class: "art-fallback", role: "img", "aria-label": scene(id).title + " (illustration unavailable)" }, [
      h("span", { class: "art-fallback-title", text: scene(id).title })
    ]);
    wrap.style.background = "linear-gradient(180deg," + c[0] + "," + c[1] + " 55%," + c[2] + ")";
    return wrap;
  }

  function renderStage() {
    injectArtCss();
    var id = R.id;
    var html = null;
    try {
      if (window.LumovoArt && typeof window.LumovoArt.render === "function") {
        html = window.LumovoArt.render(id, { time: S.time, state: R.state || null, route: S.route || null });
      }
    } catch (e) {
      html = null;
      if (window.console) console.warn("LumovoArt.render failed for " + id, e);
    }
    if (typeof html === "string" && html.indexOf("<svg") !== -1) {
      stage.innerHTML = html;
    } else {
      stage.innerHTML = "";
      stage.appendChild(placeholder(id));
    }
    updateHot();
  }

  /* Which hotspot ids are live right now? */
  function activeHotspots() {
    var ids = [];
    var sc = scene(R.id);
    if (sc.type === "hall") {
      Object.keys(sc.routes).forEach(function (k) { ids.push(sc.routes[k].hotspot); });
    } else if (sc.type === "timed") {
      if (!R.answered) ids.push(sc.timed.exitHotspot);
    } else if (sc.type === "central") {
      ids.push("lanterns");
    } else if (sc.tasks) {
      var t = sc.tasks[R.taskIdx];
      if (t && !R.answered) {
        t.choices.forEach(function (c, i) { if (!R.wrong || !R.wrong[i]) hsList(c).forEach(function (x) { ids.push(x); }); });
      } else if (R.answered && R.sceneDone && sc.cont && sc.cont.hotspot) {
        ids.push(sc.cont.hotspot);
      }
    }
    return ids;
  }
  function hsList(c) { return !c.hotspot ? [] : (Array.isArray(c.hotspot) ? c.hotspot : [c.hotspot]); }
  function updateHot() {
    var svg = stage && stage.querySelector("svg");
    if (!svg) return;
    var on = activeHotspots().length > 0 && !busy;
    svg.classList.toggle("la-hot--active", on);
    var act = activeHotspots();
    var hs = svg.querySelectorAll("[data-hotspot]");
    for (var i = 0; i < hs.length; i++) {
      hs[i].classList.toggle("game-hot-live", act.indexOf(hs[i].getAttribute("data-hotspot")) !== -1);
    }
  }
  function setState(s) {
    if (s === undefined || s === R.state) return;
    R.state = s;
    renderStage();
  }

  /* ---------------- HUD ---------------- */
  function routeGroupScenes(g) {
    if (g.scenes) return g.scenes;
    return (S.route && g.routes[S.route]) || [];
  }
  function updateHud() {
    // map
    var map = $("map");
    map.innerHTML = "";
    J.map.forEach(function (g) {
      var scenes = routeGroupScenes(g);
      var icon = g.icon === "route" ? (S.route ? g.routeIcons[S.route] : g.fallbackIcon) : g.icon;
      var done = scenes.length > 0 && scenes.every(function (s) { return S.done[s]; });
      var current = scenes.indexOf(R.id) !== -1;
      var firstDone = null;
      for (var i = 0; i < scenes.length; i++) if (S.done[scenes[i]]) { firstDone = scenes[i]; break; }
      var cls = "map-dot" + (done ? " is-done" : "") + (current ? " is-current" : "") + (!done && !current ? " is-locked" : "");
      var canGo = !!firstDone && !current && R.id !== "start";
      var b = h("button", {
        type: "button", class: cls, title: g.label + (done ? " (done)" : ""),
        "aria-label": g.label + (done ? ", done" : current ? ", current" : ", locked"),
        "aria-current": current ? "step" : false,
        disabled: !canGo
      }, [h("span", { "aria-hidden": "true", text: icon })]);
      if (canGo) b.addEventListener("click", function () { revisit(firstDone); });
      map.appendChild(h("li", {}, [b]));
    });
    $("xp").textContent = S.xp + " XP";
    var shown = Math.max(0, cardCount() - pendingFly);
    $("deck-count").textContent = String(shown);
    $("deck-btn").setAttribute("aria-label", "Word deck, " + shown + " of " + totalCards() + " words");
    var hb = $("hard-btn");
    hb.setAttribute("aria-pressed", S.hard ? "true" : "false");
    document.body.classList.toggle("hard", !!S.hard);
    $("xp-pill").classList.toggle("is-hard", !!S.hard);
  }

  /* ---------------- effects ---------------- */
  function rectOf(anchor) {
    if (!anchor) { var r0 = stage.getBoundingClientRect(); return { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 }; }
    if (anchor.nodeType === 1) { var r = anchor.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return anchor;
  }
  function floatText(text, anchor) {
    if (reduced) return;
    var p = rectOf(anchor);
    var f = h("div", { class: "xp-float", "aria-hidden": "true", text: text });
    f.style.left = p.x + "px"; f.style.top = p.y + "px";
    document.body.appendChild(f);
    later(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
  }
  function confetti() {
    if (reduced) return;
    var box = h("div", { class: "confetti", "aria-hidden": "true" });
    for (var i = 0; i < 40; i++) {
      var s = h("i", {});
      s.style.left = Math.round(Math.random() * 100) + "%";
      s.style.background = PALETTE[i % PALETTE.length];
      s.style.animationDelay = Math.round(Math.random() * 300) + "ms";
      s.style.setProperty("--dx", Math.round(Math.random() * 120 - 60) + "px");
      s.style.setProperty("--rot", Math.round(Math.random() * 720 - 360) + "deg");
      box.appendChild(s);
    }
    document.body.appendChild(box);
    later(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2100);
  }
  function announce(msg) {
    var a = $("announce");
    a.textContent = "";
    later(function () { a.textContent = msg; }, 30);
  }

  function award(base, anchor) {
    if (R.practice || !base) return 0;
    var amt = base * (S.hard && !R.peeked ? 2 : 1);
    S.xp += amt;
    updateHud();
    floatText("+" + amt, anchor);
    save();
    return amt;
  }
  function xpTier() { return [10, 5, 2][Math.min(R.attempts || 0, 2)]; }

  function fireStamp(id) {
    if (R.practice || S.stamps[id]) return;
    S.stamps[id] = true;
    var st = J.stamps[id];
    save();
    var pop = h("div", { class: "stamp-pop", role: "status" }, [
      h("div", { class: "stamp-ring" }, [
        h("span", { class: "stamp-icon", "aria-hidden": "true", text: st.icon }),
        h("strong", { class: "stamp-fi", lang: "fi", text: st.fi }),
        h("span", { class: "stamp-en", text: st.en })
      ])
    ]);
    document.body.appendChild(pop);
    confetti();
    later(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, reduced ? 2200 : 2600);
  }

  function awardCards(ids) {
    if (R.practice) return;
    var list = [];
    (ids || []).forEach(function (raw) {
      if (raw === "{greeting.cards}") list = list.concat(greeting().cards);
      else list.push(raw);
    });
    var fresh = list.filter(function (id) { return J.cards[id] && !S.cards[id]; });
    fresh.forEach(function (id) { S.cards[id] = true; });
    if (!fresh.length) return;
    save();
    var src = rectOf(panel);
    var dst = $("deck-btn").getBoundingClientRect();
    fresh.forEach(function (id, i) {
      if (reduced || !panel.getBoundingClientRect().width || !Element.prototype.animate) { updateHud(); return; }
      pendingFly++;
      var c = h("div", { class: "card-fly", "aria-hidden": "true", text: J.cards[id].fi });
      c.style.left = (src.x - 50) + "px"; c.style.top = (src.y - 20) + "px";
      document.body.appendChild(c);
      var dx = dst.left + dst.width / 2 - src.x, dy = dst.top + dst.height / 2 - src.y;
      var done = function () {
        if (c.parentNode) c.parentNode.removeChild(c);
        pendingFly = Math.max(0, pendingFly - 1);
        updateHud();
        var b = $("deck-btn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      };
      try {
        var an = c.animate([
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: "translate(" + dx + "px," + dy + "px) scale(.25)", opacity: .6 }
        ], { duration: 600, delay: i * 160, easing: "cubic-bezier(.5,0,.8,.4)", fill: "both" });
        an.onfinish = done;
        later(function () { if (c.parentNode) done(); }, 600 + i * 160 + 250);
      } catch (e) { done(); }
    });
    updateHud();
  }

  /* ---------------- door transitions ---------------- */
  function go(sceneId, style, opts) {
    if (busy) return;
    busy = true;
    var tClose = reduced ? 150 : 300, tOpen = reduced ? 150 : 400;
    doorsEl.className = "doors doors--" + (style || "glass");
    doorsEl.style.setProperty("--t-close", tClose + "ms");
    doorsEl.style.setProperty("--t-open", tOpen + "ms");
    doorsEl.hidden = false;
    void doorsEl.offsetWidth;
    doorsEl.classList.add("is-closed");
    later(function () {
      enterScene(sceneId, opts || {});
      doorsEl.classList.remove("is-closed");
      later(function () {
        doorsEl.hidden = true;
        busy = false;
        updateHot();
        afterEnter();
      }, tOpen);
    }, tClose);
  }

  /* ---------------- scene lifecycle ---------------- */
  function enterScene(id, opts) {
    if (R.timer) clearTimeout(R.timer);
    var sc = scene(id);
    var practice = !!(opts && opts.practice);
    R = {
      id: id, taskIdx: 0, attempts: 0, misses: 0, state: sc.initState || null,
      npc: sc.npc || null, practice: practice, answered: false, sceneDone: false,
      wrong: {}, feedback: null, tip: null, peeked: false, info: null
    };
    if (sc.timed) R.state = sc.timed.states[0];
    if (!practice) { S.scene = id; save(); }
    mainEl.setAttribute("data-kind", sc.type || "tasks");
    mainEl.setAttribute("data-scene", id);
    if (sc.tasks) beginTask();
    renderStage();
    renderPanel();
    updateHud();
    try { panel.scrollTop = 0; } catch (e) {}
  }
  function afterEnter() {
    var sc = scene(R.id);
    if (sc.type === "timed") startTimed();
    if (sc.type === "central") {
      completeScene();
      if (sc.onEnter && sc.onEnter.stamp) fireStamp(sc.onEnter.stamp);
      renderPanel();
    }
    if (sc.type === "postcard") { S.done.postcard = true; save(); }
    focusPanel();
  }
  function focusPanel() {
    try { panel.focus({ preventScroll: true }); } catch (e) {}
  }

  function beginTask() {
    var sc = scene(R.id);
    var t = sc.tasks[R.taskIdx];
    R.answered = false; R.wrong = {}; R.feedback = null; R.tip = null; R.peeked = false; R.attempts = 0; R.info = null;
    if (t.npcBefore) R.npc = t.npcBefore;
    var idx = t.choices.map(function (c, i) { return i; });
    if (idx.length > 1) shuffle(idx);
    R.order = idx;
  }

  function nextOf(sc) {
    if (sc.branch) return sc.branch[S.route];
    return sc.next;
  }
  function leaveScene() {
    if (busy) return;
    var sc = scene(R.id);
    if (R.practice) { go(S.scene, "glass"); return; }
    var next = nextOf(sc);
    if (!next) return;
    go(next, sc.door || "glass");
  }
  function revisit(sceneId) {
    if (busy) return;
    if (sceneId === R.id) return;
    go(sceneId, "glass", { practice: sceneId !== S.scene });
  }

  function completeScene() {
    if (R.sceneDone) return;
    R.sceneDone = true;
    var sc = scene(R.id);
    if (R.practice) return;
    S.done[R.id] = true;
    var stars = R.misses === 0 ? 3 : (R.misses === 1 ? 2 : 1);
    S.stars[R.id] = Math.max(S.stars[R.id] || 0, stars);
    save();
    awardCards(sc.cards);
    updateHud();
  }

  /* ---------------- choosing ---------------- */
  function pick(idx, anchor, btn) {
    if (busy || R.answered) return;
    var sc = scene(R.id);
    var t = sc.tasks[R.taskIdx];
    var c = t.choices[idx];
    if (!c || R.wrong[idx]) return;
    R.info = null;
    if (!c.correct) {
      R.wrong[idx] = true; R.attempts++; R.misses++;
      R.feedback = { text: T(c.feedback) || "Not quite. Try again.", kind: "bad" };
      if (btn) {
        btn.classList.add("is-wrong"); btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake");
        btn.setAttribute("aria-disabled", "true");
      } else {
        var b2 = panelBody.querySelector('[data-ci="' + idx + '"]');
        if (b2) { b2.classList.add("is-wrong", "shake"); b2.setAttribute("aria-disabled", "true"); }
      }
      setFeedback();
      updateHot();
      return;
    }
    R.answered = true; R.picked = idx;
    if (!t.tap) award(xpTier(), anchor || btn);
    R.feedback = c.feedback ? { text: T(c.feedback), kind: "good" } : null;
    if (c.setState !== undefined) setState(c.setState);
    var after = t.after || {};
    if (after.setState !== undefined) setState(after.setState);
    var night = (after.night && S.time === "night") ? after.night : null;
    var npc = (night && night.npc) || after.npc;
    if (npc) R.npc = npc;
    var tip = (night && night.tip) || after.tip;
    if (tip) R.tip = tip;
    if (after.stamp) fireStamp(after.stamp);
    if (R.taskIdx >= sc.tasks.length - 1) completeScene();
    renderPanel();
    focusAction();
  }
  function focusAction() {
    var b = panelBody.querySelector(".btn-primary");
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
  }
  function nextTask() {
    if (busy) return;
    R.taskIdx++;
    beginTask();
    renderPanel();
    updateHot();
    try { panel.scrollTop = 0; } catch (e) {}
  }

  function onHotspot(id, ev) {
    if (busy) return;
    var sc = scene(R.id);
    var anchor = ev ? { x: ev.clientX, y: ev.clientY } : null;
    if (sc.type === "hall") {
      Object.keys(sc.routes).forEach(function (k) { if (sc.routes[k].hotspot === id) selectRoute(k); });
      return;
    }
    if (sc.type === "timed") {
      if (sc.timed.exitHotspot === id) pressExit(anchor);
      return;
    }
    if (sc.type === "central") {
      if (id === "lanterns") tapLanterns(anchor);
      return;
    }
    if (!sc.tasks) return;
    var t = sc.tasks[R.taskIdx];
    if (!R.answered && t) {
      for (var i = 0; i < t.choices.length; i++) {
        if (hsList(t.choices[i]).indexOf(id) !== -1 && !R.wrong[i]) { pick(i, anchor); return; }
      }
    }
    if (R.answered && R.sceneDone && sc.cont && sc.cont.hotspot === id) { leaveScene(); return; }
    if (sc.hotspotInfo && sc.hotspotInfo[id]) {
      R.info = sc.hotspotInfo[id];
      setFeedback();
    }
  }

  /* ---------------- timed scenes ---------------- */
  function startTimed() {
    var tm = scene(R.id).timed;
    R.tIdx = 0; R.state = tm.states[0];
    renderStage(); refreshTimed();
    R.timer = later(advanceTimed, tm.ms);
  }
  function advanceTimed() {
    var tm = scene(R.id).timed;
    if (R.tIdx >= tm.states.length - 1) return;
    R.tIdx++; R.state = tm.states[R.tIdx];
    renderStage(); refreshTimed();
    announce(T(tm.status[R.state]));
    if (R.tIdx < tm.states.length - 1) R.timer = later(advanceTimed, tm.ms);
  }
  function refreshTimed() {
    var tm = scene(R.id).timed;
    var d = panelBody.querySelector(".display-text");
    if (d) d.textContent = tm.status[R.state] || tm.status[tm.states[0]];
    var chk = panelBody.querySelector(".display .check-badge");
    if (chk) chk.hidden = !(tm.statusCheck && tm.statusCheck[R.state]);
    var stay = panelBody.querySelector('[data-role="stay"]');
    if (stay) { var off = R.state === tm.correctState || R.answered; stay.disabled = off; }
  }
  function pressExit(anchor) {
    var sc = scene(R.id), tm = sc.timed;
    if (R.answered) return;
    R.info = null;
    if (R.state === tm.correctState) {
      R.answered = true;
      award(xpTier(), anchor || panelBody.querySelector('[data-role="exit"]'));
      R.feedback = { text: tm.successFeedback, kind: "good" };
      if (R.timer) clearTimeout(R.timer);
      completeScene();
      renderPanel();
      renderStage();
      focusAction();
    } else {
      R.attempts++; R.misses++;
      R.feedback = { text: tm.early, kind: "bad" };
      var b = panelBody.querySelector('[data-role="exit"]');
      if (b) { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }
      setFeedback();
    }
  }
  function pressStay() {
    var tm = scene(R.id).timed;
    if (R.answered || R.state === tm.correctState) return;
    R.feedback = { text: tm.stayFeedback, kind: "info" };
    setFeedback();
  }

  /* ---------------- hall ---------------- */
  function selectRoute(k) {
    R.selRoute = k;
    renderPanel();
    var go1 = panelBody.querySelector(".btn-primary");
    if (go1) { try { go1.focus({ preventScroll: true }); } catch (e) {} }
    updateHot();
  }
  function goRoute() {
    if (busy || !R.selRoute) return;
    var sc = scene(R.id);
    if (!R.practice) {
      S.route = R.selRoute;
      award(10, panelBody.querySelector(".btn-primary"));
    }
    completeScene();
    var next = R.practice ? S.scene : sc.branch[R.selRoute];
    updateHud();
    go(next, "glass");
  }

  /* ---------------- central ---------------- */
  function tapLanterns(anchor) {
    var sc = scene(R.id);
    setState("lanterns");
    var first = !S.lantern;
    R.info = sc.lanterns.line;
    if (first && !R.practice) {
      S.lantern = true; save();
      award(sc.lanterns.xp, anchor || panelBody.querySelector('[data-role="lanterns"]'));
    }
    setFeedback();
  }

  /* ---------------- start ---------------- */
  var savedGame = null;
  function startJourney() {
    if (busy) return;
    S.scene = "gate"; S.route = null;
    save();
    if (reduced) { go("gate", "glass"); return; }
    busy = true;
    R.state = "landing";
    renderStage();
    panelBody.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    later(function () { busy = false; go("gate", "glass"); }, 2000);
  }
  function continueJourney() {
    if (!savedGame) return;
    S = savedGame; savedGame = null;
    var target = S.scene;
    go(target, "glass");
  }
  function newJourney() {
    var t = S.time;
    clearSave();
    S = freshState(); S.time = t;
    savedGame = null;
    pendingFly = 0;
    enterScene("start", {});
  }
  function tryAnotherRoute() {
    ["hall", "ticket", "platform", "train-ride", "bus-stop", "bus-ride", "taxi-rank", "taxi-ride", "central", "kiosk", "checkout", "postcard"].forEach(function (s) { delete S.done[s]; });
    S.route = null; S.scene = "hall"; save();
    go("hall", "glass");
  }
  function landDifferent() {
    S.done = {}; S.route = null; S.scene = "start"; save();
    go("start", "glass");
  }

  /* ---------------- panel rendering ---------------- */
  function npcBlock(npc) {
    if (!npc) return null;
    var chip = h("span", { class: "npc-chip", "aria-hidden": "true" });
    chip.style.background = NPC_COLORS[npc.color] || "#1b4fbf";
    var kids = [h("div", { class: "npc-tag" }, [chip, h("span", { class: "npc-name", text: npc.name })])];
    var fi = h("p", { class: "line-fi", lang: "fi" }, [T(npc.lineFi)]);
    if (npc.check) fi.appendChild(checkBadge());
    kids.push(fi);
    if (!S.hard || R.peeked) kids.push(h("p", { class: "line-en", text: T(npc.lineEn) }));
    return h("div", { class: "npc" }, kids);
  }

  function peekButton() {
    if (!S.hard || R.peeked) return null;
    return h("button", { type: "button", class: "peek", "aria-label": "Show English (loses the hard-mode bonus for this task)", title: "Show English (costs the bonus)",
      text: "?", onclick: function () { R.peeked = true; renderPanel(); } });
  }

  function feedbackEl() {
    var f = h("p", { class: "feedback", role: "status", "aria-live": "polite" });
    fillFeedback(f);
    return f;
  }
  function fillFeedback(f) {
    var msg = R.feedback ? R.feedback.text : (R.info || "");
    f.className = "feedback" + (R.feedback ? " is-" + R.feedback.kind : (R.info ? " is-info" : "")) + (msg ? "" : " is-empty");
    f.textContent = msg;
  }
  function setFeedback() {
    var f = panelBody.querySelector(".feedback");
    if (f) fillFeedback(f);
  }

  function actionButton(label, fn, extraClass) {
    return h("button", { type: "button", class: "btn btn-primary" + (extraClass ? " " + extraClass : ""), text: label, onclick: fn });
  }

  function renderPanel() {
    var sc = scene(R.id);
    panelBody.innerHTML = "";
    var kids = [];
    var type = sc.type || "tasks";
    if (type === "start") kids = renderStart(sc);
    else if (type === "hall") kids = renderHall(sc);
    else if (type === "timed") kids = renderTimedPanel(sc);
    else if (type === "central") kids = renderCentral(sc);
    else if (type === "postcard") kids = renderPostcard(sc);
    else kids = renderTasks(sc);
    kids.forEach(function (k) { if (k) panelBody.appendChild(k); });
    if (type === "timed") refreshTimed();
    updateHud();
    updateHot();
  }

  function sceneHeader(sc) {
    var top = [h("p", { class: "scene-title", text: sc.title })];
    if (R.practice) top.push(h("span", { class: "practice-chip", text: "Practice" }));
    var pk = peekButton();
    if (pk) top.push(pk);
    return h("div", { class: "panel-top" }, top);
  }

  function renderTasks(sc) {
    var t = sc.tasks[R.taskIdx];
    var out = [sceneHeader(sc)];
    out.push(npcBlock(R.npc));
    if (sc.introText && R.taskIdx === 0) out.push(h("p", { class: "intro", text: sc.introText }));
    var pr = h("p", { class: "prompt" }, [T(t.prompt)]);
    if (t.check) pr.appendChild(checkBadge());
    out.push(pr);
    var list = h("div", { class: "choices", role: "group", "aria-label": "Choices" });
    R.order.forEach(function (ci) {
      var c = t.choices[ci];
      var cls = "choice";
      if (R.answered && R.picked === ci) cls += " is-correct";
      if (R.answered && R.picked !== ci && c.correct) cls += " is-also";
      if (R.wrong[ci]) cls += " is-wrong";
      var inner = [];
      if (c.fi) {
        inner.push(h("span", { class: "c-fi", lang: "fi", text: T(c.fi) }));
        if (c.en && (!S.hard || R.peeked)) inner.push(h("span", { class: "c-en", text: T(c.en) }));
      } else {
        inner.push(h("span", { class: "c-act", text: T(c.en) }));
      }
      var b = h("button", { type: "button", class: cls, "data-ci": String(ci), "aria-disabled": (R.answered || R.wrong[ci]) ? "true" : false }, inner);
      b.addEventListener("click", function () { if (R.answered) return; pick(ci, null, b); });
      list.appendChild(b);
    });
    out.push(list);
    out.push(feedbackEl());
    if (R.tip) out.push(h("div", { class: "tip-box" }, [R.tip, (sc.tasks[R.taskIdx].after.night && S.time === "night" && sc.tasks[R.taskIdx].after.night.check) ? checkBadge() : null]));
    if (R.answered) {
      if (R.taskIdx < sc.tasks.length - 1) out.push(h("div", { class: "actions" }, [actionButton("Next →", nextTask)]));
      else if (nextOf(sc) || R.practice) out.push(h("div", { class: "actions" }, [actionButton(R.practice ? "Back to your journey →" : (sc.cont ? sc.cont.label : "Continue →"), leaveScene)]));
    }
    return out;
  }

  function renderTimedPanel(sc) {
    var tm = sc.timed;
    var out = [sceneHeader(sc)];
    out.push(h("p", { class: "prompt", text: sc.prompt }));
    out.push(h("div", { class: "display", role: "status", "aria-live": "off" }, [
      h("span", { class: "display-text", lang: "fi", text: tm.status[R.state] || tm.status[tm.states[0]] }), checkBadge()
    ]));
    var row = h("div", { class: "choices choices--row" });
    var ex = h("button", { type: "button", class: "choice choice--exit" + (R.answered ? " is-correct" : ""), "data-role": "exit",
      "aria-disabled": R.answered ? "true" : false, onclick: function () { pressExit(null); } }, [h("span", { class: "c-act", text: tm.exitLabel })]);
    row.appendChild(ex);
    if (tm.stayLabel) {
      row.appendChild(h("button", { type: "button", class: "choice", "data-role": "stay", onclick: pressStay }, [h("span", { class: "c-act", text: tm.stayLabel })]));
    }
    out.push(row);
    out.push(feedbackEl());
    if (R.answered) out.push(h("div", { class: "actions" }, [actionButton(R.practice ? "Back to your journey →" : "Get off →", leaveScene)]));
    return out;
  }

  function renderCentral(sc) {
    var out = [sceneHeader(sc)];
    out.push(h("p", { class: "central-text", html: sc.textHtml }));
    out.push(h("button", { type: "button", class: "btn btn-ghost", "data-role": "lanterns", text: sc.lanterns.button, onclick: function () { tapLanterns(null); } }));
    out.push(feedbackEl());
    out.push(h("div", { class: "actions" }, [actionButton(R.practice ? "Back to your journey →" : sc.cont.label, leaveScene)]));
    return out;
  }

  function renderHall(sc) {
    var out = [sceneHeader(sc)];
    out.push(h("p", { class: "intro", html: sc.introHtml }));
    var row = h("div", { class: "choices choices--routes", role: "group", "aria-label": "Routes" });
    ["train", "bus", "taxi"].forEach(function (k) {
      var r = sc.routes[k];
      row.appendChild(h("button", { type: "button", class: "choice choice--route" + (R.selRoute === k ? " is-selected" : ""), "aria-pressed": R.selRoute === k ? "true" : "false",
        onclick: function () { selectRoute(k); } }, [
        h("span", { class: "c-icon", "aria-hidden": "true", text: r.icon }),
        h("span", { class: "c-fi", lang: "fi", text: r.fi }),
        (!S.hard || R.peeked) ? h("span", { class: "c-en", text: r.en }) : null
      ]));
    });
    out.push(row);
    if (R.selRoute) {
      var r2 = sc.routes[R.selRoute];
      var dl = h("dl", { class: "route-info" }, [
        h("div", {}, [h("dt", { text: "Time" }), h("dd", {}, [r2.time, r2.timeCheck ? checkBadge() : null])]),
        h("div", {}, [h("dt", { text: "Price" }), h("dd", {}, [r2.price, r2.priceCheck ? checkBadge() : null])])
      ]);
      out.push(h("div", { class: "route-card" }, [
        h("p", { class: "route-head" }, [r2.fi + " (" + r2.en + ")", r2.recommended ? h("span", { class: "ribbon", text: "Recommended ⭐" }) : null]),
        dl,
        h("p", { class: "route-note", text: r2.note })
      ]));
      out.push(h("div", { class: "actions" }, [actionButton(sc.goLabel, goRoute)]));
    } else {
      out.push(h("p", { class: "feedback is-info", text: "Tap a sign to see the details." }));
    }
    return out;
  }

  function renderStart(sc) {
    var st = J.start;
    var out = [];
    out.push(h("h1", { class: "title", text: st.title }));
    out.push(h("p", { class: "subtitle", text: st.subtitle }));
    out.push(h("p", { class: "question", id: "q-time", text: st.question }));
    var sw = h("div", { class: "swatches", role: "radiogroup", "aria-labelledby": "q-time" });
    J.times.forEach(function (tm) {
      var on = S.time === tm.id;
      var b = h("button", { type: "button", class: "swatch swatch--" + tm.id + (on ? " is-on" : ""), role: "radio", "aria-checked": on ? "true" : "false", "data-time": tm.id,
        onclick: function () { if (busy) return; S.time = tm.id; save(); renderStage(); renderPanel(); var nb = panelBody.querySelector('[data-time="' + tm.id + '"]'); if (nb) nb.focus({ preventScroll: true }); } }, [
        h("span", { class: "sw-icon", "aria-hidden": "true", text: tm.icon }),
        h("span", { class: "sw-label", text: tm.label })
      ]);
      sw.appendChild(b);
    });
    out.push(sw);
    var acts = h("div", { class: "actions actions--start" });
    if (savedGame) {
      acts.appendChild(actionButton(st.continueLabel, continueJourney, "js-continue"));
      acts.appendChild(h("button", { type: "button", class: "btn btn-secondary js-new", text: st.newLabel, onclick: newJourney }));
    } else {
      acts.appendChild(actionButton(st.startLabel, startJourney, "js-start"));
    }
    out.push(acts);
    out.push(h("p", { class: "start-links" }, [h("a", { class: "text-link", href: "guide.html", text: st.guideLabel })]));
    out.push(h("p", { class: "footnote", text: st.footer }));
    return out;
  }

  function starStr(n) { return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n); }

  function renderPostcard(sc) {
    var out = [];
    out.push(h("h2", { class: "title title--sm", text: sc.noteFi }, []));
    var order = ["gate", "exit", "hall"].concat((S.route && J.map[3].routes[S.route]) || []).concat(["central", "kiosk", "checkout"]);
    var rows = [];
    order.forEach(function (id) {
      if (S.stars[id] === undefined) return;
      rows.push(h("li", {}, [h("span", { text: scene(id).mapIcon + " " + scene(id).title }), h("span", { class: "stars", "aria-label": S.stars[id] + " of 3 stars", text: starStr(S.stars[id]) })]));
    });
    var rt = S.route ? ({ train: "🚆 Train", bus: "🚌 Bus", taxi: "🚕 Taxi" })[S.route] : "—";
    out.push(h("div", { class: "pc-stats" }, [
      h("p", { class: "pc-xp" }, ["⭐ " + S.xp + " XP"]),
      h("p", { class: "pc-route", text: "Route: " + rt }),
      h("p", { class: "pc-words", text: "Words: " + cardCount() + " / " + totalCards() })
    ]));
    out.push(h("ul", { class: "pc-stars" }, rows));
    var stamps = h("div", { class: "pc-stamps" });
    Object.keys(J.stamps).forEach(function (k) {
      stamps.appendChild(h("span", { class: "pc-stamp" + (S.stamps[k] ? " is-got" : "") }, [(S.stamps[k] ? "🛂 " : "· ") + J.stamps[k].fi]));
    });
    out.push(stamps);
    var grid = h("div", { class: "pc-grid" });
    Object.keys(J.cards).forEach(function (id) {
      if (S.cards[id]) grid.appendChild(h("span", { class: "pc-card", lang: "fi", text: J.cards[id].fi }));
    });
    out.push(grid);
    var b = sc.buttons;
    out.push(h("div", { class: "actions actions--stack" }, [
      actionButton(b.route, tryAnotherRoute),
      h("button", { type: "button", class: "btn btn-secondary", text: b.time, onclick: landDifferent }),
      h("a", { class: "btn btn-secondary", href: "guide.html", text: b.guide }),
      h("button", { type: "button", class: "btn btn-secondary", disabled: true, "aria-describedby": "soon" }, [b.next]),
      h("span", { id: "soon", class: "soon", text: b.nextNote })
    ]));
    return out;
  }

  /* ---------------- deck drawer ---------------- */
  function renderDeck() {
    var g = $("deck-grid");
    g.innerHTML = "";
    $("deck-title-count").textContent = cardCount() + " / " + totalCards();
    var ids = Object.keys(J.cards).filter(function (id) { return S.cards[id]; });
    if (!ids.length) g.appendChild(h("p", { class: "deck-empty", text: "No words yet. Solve a task to collect your first card." }));
    ids.forEach(function (id) {
      var c = J.cards[id];
      g.appendChild(h("li", { class: "wcard" }, [
        h("p", { class: "wc-fi", lang: "fi" }, [c.fi, c.check ? checkBadge() : null]),
        h("p", { class: "wc-en", text: c.en }),
        c.say ? h("p", { class: "wc-say" }, [h("span", { class: "wc-say-l", text: "say it " }), c.say]) : null
      ]));
    });
  }
  function openDeck() {
    renderDeck();
    lastFocusBeforeDeck = document.activeElement;
    $("deck").hidden = false; $("deck-backdrop").hidden = false;
    $("deck-btn").setAttribute("aria-expanded", "true");
    void $("deck").offsetWidth;
    $("deck").classList.add("is-open"); $("deck-backdrop").classList.add("is-open");
    $("deck-close").focus();
  }
  function closeDeck() {
    if ($("deck").hidden) return;
    $("deck").classList.remove("is-open"); $("deck-backdrop").classList.remove("is-open");
    $("deck-btn").setAttribute("aria-expanded", "false");
    later(function () { $("deck").hidden = true; $("deck-backdrop").hidden = true; }, reduced ? 0 : 220);
    try { (lastFocusBeforeDeck || $("deck-btn")).focus(); } catch (e) {}
  }

  /* ---------------- init ---------------- */
  function init() {
    stage = $("stage"); panel = $("panel"); panelBody = $("panel-body"); fx = $("fx");
    doorsEl = $("doors"); mainEl = $("play");

    stage.addEventListener("click", function (e) {
      var t = e.target;
      var hs = t.closest ? t.closest("[data-hotspot]") : null;
      if (hs) onHotspot(hs.getAttribute("data-hotspot"), e);
    });
    $("deck-btn").addEventListener("click", function () { $("deck").hidden ? openDeck() : closeDeck(); });
    $("deck-close").addEventListener("click", closeDeck);
    $("deck-backdrop").addEventListener("click", closeDeck);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDeck(); });
    $("hard-btn").addEventListener("click", function () {
      S.hard = !S.hard; save(); renderPanel();
      announce(S.hard ? "Hard mode on: English hidden, double XP." : "Hard mode off.");
    });

    var sv = loadSave();
    if (sv) {
      if (sv.scene !== "start") savedGame = sv;     // offer Continue / New journey
      else S = sv;                                    // keep deck and XP, back at start
    }
    if (savedGame) S.time = savedGame.time;
    enterScene("start", {});
    focusPanel();
  }

  window.LumovoGame = {
    state: function () { return S; },
    run: function () { return R; },
    journey: J,
    resetForTest: function () { clearSave(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
