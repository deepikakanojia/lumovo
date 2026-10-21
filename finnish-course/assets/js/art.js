// Status: DRAFT
/* Lumovo "Arrival" scene illustrations.
   window.LumovoArt = { palette, css, render(sceneId, ctx) -> '<svg ...>' }
   ctx = { time: morning|day|evening|night, state: string|null, route: train|bus|taxi|null }
   Flat vector, no outlines. All ids are prefixed la-<sceneId>-. Animated elements carry class "la-anim". */
(function () {
  'use strict';

  var P = {
    fjord: '#1b4fbf', night: '#0d1838', aurora: '#2fe0a8', aurora2: '#8b6cff',
    cloudberry: '#ffa62b', lingon: '#e5384f', birch: '#f6f1e7', pine: '#1e6b4f',
    snow: '#ffffff', granite: '#b9b3a8', ink: '#141a2e', taxi: '#ffd23f'
  };
  var TIMES = ['morning', 'day', 'evening', 'night'];
  var SKY = {
    morning: ['#ffb88c', '#ffe2b8', '#bfe6ff'],
    day: ['#3e9bff', '#9fd4ff', '#e2f3ff'],
    evening: ['#ff7b54', '#d9487a', '#4a2c7a'],
    night: ['#070f2b', '#14245a']
  };
  var SK = ['#f3d2b3', '#e0a979', '#b9784a', '#8a5530', '#5e3a22'];
  var WARM = '#ffe6a0';

  /* ---------- tiny utils ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function n(v) { return Math.round(v * 10) / 10; }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function h2r(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, t) {
    var x = h2r(a), y = h2r(b), o = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(x[i] + (y[i] - x[i]) * t); o += (v < 16 ? '0' : '') + v.toString(16); }
    return o;
  }
  function shade(h, t) { return t < 0 ? mix(h, '#0d1838', -t) : mix(h, '#ffffff', t); }
  var KX = { morning: ['#ff9a6a', 0.10, 0.05], day: [null, 0, 0], evening: ['#5b2c6f', 0.26, 0.11], night: ['#0d1838', 0.60, 0.32] };
  function mkK(c) {
    return function (col) { var d = KX[c.t]; if (!d[0]) return col; return mix(col, d[0], c.ind ? d[2] : d[1]); };
  }

  function r(x, y, w, h, rx, f, e) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' + (rx ? ' rx="' + rx + '"' : '') + ' fill="' + f + '"' + (e ? ' ' + e : '') + '/>'; }
  function ci(x, y, rad, f, e) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(rad) + '" fill="' + f + '"' + (e ? ' ' + e : '') + '/>'; }
  function el(x, y, rx, ry, f, e) { return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + f + '"' + (e ? ' ' + e : '') + '/>'; }
  function pa(d, f, e) { return '<path d="' + d + '" fill="' + f + '"' + (e ? ' ' + e : '') + '/>'; }
  function po(pts, f, e) { return '<polygon points="' + pts + '" fill="' + f + '"' + (e ? ' ' + e : '') + '/>'; }
  function ln(d, stroke, w, e) { return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (e ? ' ' + e : '') + '/>'; }
  function tx(x, y, t, fs, f, o) {
    o = o || {};
    return '<text class="la-t' + (o.cls ? ' ' + o.cls : '') + '" x="' + n(x) + '" y="' + n(y) + '" font-size="' + n(fs) + '" fill="' + f + '" text-anchor="' + (o.a || 'middle') + '"' + (o.e ? ' ' + o.e : '') + '>' + esc(t) + '</text>';
  }
  function fit(text, avail, max) { return Math.min(max, avail / (text.length * 0.58)); }
  function shadowL(x, y, len, w, op) { return el(x + len / 2, y, len / 2, w / 2, P.night, 'opacity="' + (op || 0.14) + '"'); }
  function gradDef(id, stops, vertical) {
    var s = '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical === false ? 1 : 0) + '" y2="' + (vertical === false ? 0 : 1) + '">';
    for (var i = 0; i < stops.length; i++) s += '<stop offset="' + Math.round(i / (stops.length - 1) * 100) + '%" stop-color="' + stops[i] + '"/>';
    return s + '</linearGradient>';
  }
  function hillsD(y, amp, k, ph, bot) {
    var d = '';
    for (var x = 0; x <= 400; x += 10) {
      var yy = y + amp * Math.sin(6.2832 * k * x / 400 + ph) + amp * 0.45 * Math.sin(6.2832 * (2 * k + 1) * x / 400 + ph * 1.7);
      d += (x ? 'L' : 'M') + x + ',' + n(yy);
    }
    return d + 'L400,' + bot + 'L0,' + bot + 'Z';
  }
  function scroll(dur, tile, delay) {
    return '<g class="la-anim la-scroll" style="animation-duration:' + dur + 's' + (delay ? ';animation-delay:-' + delay + 's' : '') + '"><g>' + tile + '</g><g transform="translate(400,0)">' + tile + '</g></g>';
  }

  /* ---------- scene context ---------- */
  function mkCtx(sid, ctx) {
    var t = TIMES.indexOf(ctx && ctx.time) >= 0 ? ctx.time : 'day';
    var c = { sid: sid, t: t, st: (ctx && ctx.state) || null, route: (ctx && ctx.route) || null, ind: false };
    c.I = function (nm) { return 'la-' + sid + '-' + nm; };
    c.k = mkK(c);
    c.night = t === 'night';
    c.lit = t === 'night' || t === 'evening';
    return c;
  }
  function wrap(c, label, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" class="la-svg la-scene-' + c.sid + ' la-time-' + c.t + '" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label + ' (' + c.t + ')') + '">' + inner + '</svg>';
  }
  function hot(id, label, bx, by, bw, bh, inner, rx) {
    return '<g class="la-hot" data-hotspot="' + id + '" role="button" aria-label="' + esc(label) + '">' + inner +
      '<rect class="la-ring la-anim" x="' + n(bx) + '" y="' + n(by) + '" width="' + n(bw) + '" height="' + n(bh) + '" rx="' + (rx || 12) + '"/>' +
      '<rect x="' + n(bx) + '" y="' + n(by) + '" width="' + n(bw) + '" height="' + n(bh) + '" fill="#fff" fill-opacity="0"/></g>';
  }

  /* ---------- sky ---------- */
  function cloud(x, y, s, op) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" opacity="' + (op || 0.85) + '" fill="#fff"><rect x="-30" y="-8" width="64" height="16" rx="8"/><circle cx="-8" cy="-10" r="12"/><circle cx="10" cy="-13" r="15"/></g>';
  }
  function aurora(c, uid, y0, h, w0) {
    var gid = c.I(uid + '-ag'), fid = c.I(uid + '-af');
    var s = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.aurora + '" stop-opacity="0"/><stop offset=".3" stop-color="' + P.aurora + '" stop-opacity=".8"/><stop offset=".7" stop-color="' + P.aurora2 + '" stop-opacity=".5"/><stop offset="1" stop-color="' + P.aurora2 + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + fid + '" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>';
    var specs = [[0, 0, '12s', '0s', 0.9], [24, 16, '15s', '-5s', 0.65], [-14, 34, '18s', '-9s', 0.5]];
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i], yy = y0 + sp[1], hh = h * (1 - i * 0.18);
      var d = 'M-40,' + (yy + 10) + ' C30,' + (yy - 30) + ' 90,' + (yy + 34) + ' 170,' + (yy - 6) + ' S300,' + (yy - 40) + ' 440,' + (yy + 6) +
        ' L440,' + (yy + hh) + ' C350,' + (yy + hh + 26) + ' 280,' + (yy + hh - 22) + ' 190,' + (yy + hh + 10) + ' S60,' + (yy + hh + 24) + ' -40,' + (yy + hh - 6) + 'Z';
      s += '<g filter="url(#' + fid + ')" opacity="' + sp[4] + '"><path class="la-anim la-aurora" style="animation-duration:' + sp[2] + ';animation-delay:' + sp[3] + '" d="' + d + '" fill="url(#' + gid + ')" transform="translate(' + sp[0] + ',0)"/></g>';
    }
    return s;
  }
  function sky(c, o) {
    o = o || {};
    var x = o.x || 0, y = o.y || 0, w = o.w || 400, h = o.h || 500, u = o.uid || 'sky';
    var gid = c.I(u + '-g'), cid = c.I(u + '-c');
    var s = '<defs>' + gradDef(gid, SKY[c.t]) + '<clipPath id="' + cid + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r || 0) + '"/></clipPath>' +
      '<radialGradient id="' + c.I(u + '-sun') + '"><stop offset="0" stop-color="#fff6d0"/><stop offset=".35" stop-color="#ffe08a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>';
    s += '<g clip-path="url(#' + cid + ')">' + r(x, y, w, h, 0, 'url(#' + gid + ')');
    var sc = Math.min(w, 400) / 400 * Math.max(0.7, h / 500), sun = o.sun;
    if (sun !== false) {
      var sx = sun ? sun.x : x + w * 0.72, sy = sun ? sun.y : y + h * 0.28, sr = sun ? sun.r : 26 * Math.max(sc, 0.6);
      if (c.night) {
        for (var k = 0; k < 2; k++) s += '';
        s += ci(sx, sy, sr * 2.2, 'url(#' + c.I(u + '-sun') + ')', 'opacity=".18"');
        s += pa('M' + n(sx) + ',' + n(sy - sr * 0.7) + ' A' + n(sr * 0.7) + ',' + n(sr * 0.7) + ' 0 1 0 ' + n(sx) + ',' + n(sy + sr * 0.7) + ' A' + n(sr * 1.05) + ',' + n(sr * 1.05) + ' 0 0 1 ' + n(sx) + ',' + n(sy - sr * 0.7) + 'Z', '#f3efe0');
      } else {
        s += ci(sx, sy, sr * 2.6, 'url(#' + c.I(u + '-sun') + ')', 'opacity="' + (c.t === 'day' ? 0.7 : 0.9) + '"');
        s += ci(sx, sy, sr * (c.t === 'day' ? 0.8 : 1), c.t === 'evening' ? '#ffd2a0' : '#fff3c4');
      }
    }
    if (c.night) {
      var rg = rng(7 + x + y), cnt = Math.round(14 + w * h / 2600);
      for (var i = 0; i < cnt; i++) {
        var px = x + rg() * w, py = y + rg() * h * 0.8, pr = 0.5 + rg() * 1.1;
        s += ci(px, py, pr, '#fff', 'opacity="' + n(0.5 + rg() * 0.5) + '"' + (i % 4 === 0 ? ' class="la-anim la-twinkle" style="animation-delay:-' + n(rg() * 4) + 's;animation-duration:' + n(2.5 + rg() * 3) + 's"' : ''));
      }
      if (o.aurora !== false) s += aurora(c, u, y + h * 0.1, Math.max(30, h * 0.26), w);
    } else if (o.clouds !== false) {
      var cop = c.t === 'evening' ? 0.35 : 0.85, ccol = c.t === 'evening' ? '#ffb0a0' : '#fff';
      s += '<g fill="' + ccol + '" class="la-anim la-drift" style="animation-duration:' + (o.drift || 40) + 's">' + cloud(x + w * 0.2, y + h * 0.16, sc * 1.1, cop) + cloud(x + w * 0.62, y + h * 0.42, sc * 0.8, cop * 0.8) + '</g>';
    }
    if (o.inner) s += o.inner;
    return s + '</g>';
  }

  /* ---------- nature ---------- */
  function birch(c, x, y, h, o) {
    o = o || {}; var K = c.k, w = Math.max(3, h * 0.06), rr = h * 0.19, s = '<g>';
    var fol = o.col ? [o.col, o.col, o.col] : [K('#2f8f63'), K('#43a876'), K('#62c08c')];
    var tr = o.col || K(P.birch);
    if (!o.noShadow) s += pa('M' + n(x - w / 2) + ',' + y + ' L' + n(x + w / 2) + ',' + y + ' L' + n(x + h * 0.55) + ',' + (y + 5) + ' L' + n(x + h * 0.5) + ',' + (y + 1) + 'Z', P.night, 'opacity=".12"');
    s += r(x - w / 2, y - h * 0.78, w, h * 0.78, w / 2, tr);
    if (!o.col) for (var i = 0; i < 5; i++) s += r(x - w / 2 + (i % 2) * w * 0.4, y - h * (0.12 + i * 0.14), w * 0.6, Math.max(1.4, h * 0.012), 1, P.ink, 'opacity=".55"');
    s += ln('M' + x + ',' + n(y - h * 0.5) + ' L' + n(x + rr * 0.9) + ',' + n(y - h * 0.68), tr, Math.max(1.6, w * 0.4));
    var fy = y - h * 0.82;
    s += ci(x - rr * 0.75, fy + rr * 0.15, rr * 0.85, fol[0]) + ci(x + rr * 0.8, fy + rr * 0.1, rr * 0.9, fol[1]) + ci(x, fy - rr * 0.55, rr, fol[2]) + ci(x - rr * 0.1, fy + rr * 0.3, rr * 0.8, fol[1]);
    return s + '</g>';
  }
  function pine(c, x, y, h, o) {
    o = o || {}; var K = c.k, base = o.col || K(P.pine), hi = o.col || K('#2a8a66'), w = h * 0.34, s = '<g>';
    if (!o.noShadow) s += pa('M' + n(x - 3) + ',' + y + ' L' + n(x + 3) + ',' + y + ' L' + n(x + h * 0.6) + ',' + (y + 4) + ' L' + n(x + h * 0.5) + ',' + (y + 1) + 'Z', P.night, 'opacity=".12"');
    s += r(x - h * 0.03, y - h * 0.14, h * 0.06, h * 0.14, 1.5, o.col || K('#5b3b2a'));
    for (var i = 0; i < 3; i++) {
      var top = y - h + i * h * 0.2, bot = y - h * 0.12 - (2 - i) * h * 0.2 + 0, hw = w * (0.45 + i * 0.28);
      bot = top + h * 0.42;
      s += '<path d="M' + n(x) + ',' + n(top) + ' L' + n(x + hw) + ',' + n(bot) + ' L' + n(x - hw) + ',' + n(bot) + 'Z" fill="' + (i % 2 ? hi : base) + '" stroke="' + (i % 2 ? hi : base) + '" stroke-width="5" stroke-linejoin="round"/>';
    }
    return s + '</g>';
  }
  function treeLine(c, y, seed, cnt, hMin, hMax, col, kind) {
    var rg = rng(seed), s = '';
    for (var i = 0; i < cnt; i++) {
      var x = 30 + (340 / cnt) * i + rg() * (340 / cnt) * 0.6, h = hMin + rg() * (hMax - hMin);
      var isB = kind === 'birch' || (kind === 'mix' && rg() > 0.5);
      s += isB ? birch(c, x, y, h, { col: col, noShadow: !!col }) : pine(c, x, y, h, { col: col, noShadow: !!col });
    }
    return s;
  }

  /* ---------- people ---------- */
  function person(c, o) {
    var K = c.k, s = o.s || 1, sk = K(o.skin || SK[0]), sh = K(o.shirt || P.fjord), pn = K(o.pants || P.ink), hr = K(o.hair || '#3b2a20'), pose = o.pose || 'stand';
    var g = '<g transform="translate(' + n(o.x) + ',' + n(o.y) + ') scale(' + s + ')">';
    function arm(x1, y1, x2, y2) { return ln('M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2, sh, 8) + ci(x2, y2, 4.4, sk); }
    if (!o.noShadow) g += el(18, 1, 32, 4.5, P.night, 'opacity=".14"');
    if (o.pack) g += r(-19, -70, 13, 34, 6, K(o.pack));
    if (pose !== 'bust') {
      g += r(-10, -28, 8, 28, 4, pn) + r(2, -28, 8, 28, 4, pn) + r(-11, -5, 11, 5.5, 2.7, K('#f6f1e7')) + r(1, -5, 11, 5.5, 2.7, K('#f6f1e7'));
    }
    g += r(-14, -74, 28, 54, 14, sh);
    if (o.apron) g += r(-10, -52, 20, 32, 6, K('#f6f1e7'), 'opacity=".95"');
    g += arm(-12, -64, -18, -40);
    if (pose === 'wave') g += '<g transform="translate(12,-64)"><g class="la-anim la-wave">' + arm(0, 0, 14, -24) + '</g></g>';
    else if (pose === 'point') g += arm(12, -64, 40, -62);
    else if (pose === 'hold') g += arm(12, -64, 22, -50);
    else if (pose === 'rest') g += arm(12, -62, 26, -44);
    else g += arm(12, -64, 18, -40);
    if (o.lanyard) g += ln('M-5,-74 L0,-50 L5,-74', P.cloudberry, 2.6) + r(-4.5, -52, 9, 11, 2, K('#fff'));
    if (o.hairLong) g += r(-14.5, -99, 29, 32, 13, hr);
    g += r(-4, -78, 8, 8, 3, sk) + ci(0, -87, 13, sk);
    if (o.cap) g += pa('M-14,-89 A14,14 0 0 1 14,-89 Z', K(o.cap)) + r(-1, -92, 20, 4, 2, K(o.cap));
    else g += pa('M-13.6,-88 A13.6,13.6 0 0 1 13.6,-88 Q4,-97 -13.6,-88Z', hr);
    g += ci(-4.6, -86.5, 1.7, P.ink) + ci(4.6, -86.5, 1.7, P.ink);
    g += ln(o.big ? 'M-5.5,-81.5 Q0,-75 5.5,-81.5' : 'M-4,-81.5 Q0,-78 4,-81.5', P.ink, 1.7);
    if (o.big) g += ci(-8.4, -82.5, 2, '#ff8a8a', 'opacity=".45"') + ci(8.4, -82.5, 2, '#ff8a8a', 'opacity=".45"');
    return g + '</g>';
  }

  /* ---------- icons, signs ---------- */
  function icon(name, x, y, sz, col, bg) {
    var g = '<g transform="translate(' + n(x) + ',' + n(y) + ') scale(' + n(sz / 24) + ')">';
    bg = bg || P.fjord;
    switch (name) {
      case 'suitcase': g += r(-8, -6, 16, 13, 3, col) + ln('M-3.5,-6 V-9 H3.5 V-6', col, 2) + r(-8, 0, 16, 1.6, 0, bg, 'opacity=".45"'); break;
      case 'exit': g += ln('M-9,0 H4 M-1,-6 L5,0 L-1,6', col, 2.6) + ln('M9,-9 V9', col, 2.6); break;
      case 'plane': g += '<g transform="rotate(-28)">' + r(-11, -2.4, 22, 4.8, 2.4, col) + pa('M-1,-2 L-6,-10 L-2.5,-10 L5,-2Z', col) + pa('M-1,2 L-6,10 L-2.5,10 L5,2Z', col) + pa('M-9,-2 L-12,-7 L-9,-7 L-6,-2Z', col) + '</g>' + ln('M-10,10 H10', col, 1.8); break;
      case 'train': g += r(-8, -10, 16, 17, 4, col) + r(-5, -7, 10, 6, 1.5, bg) + ci(-3.5, 3, 1.4, bg) + ci(3.5, 3, 1.4, bg) + ln('M-6,10 L-3,7 M6,10 L3,7', col, 2); break;
      case 'bus': g += r(-10, -9, 20, 16, 3.5, col) + r(-8, -6.5, 16, 6, 1.5, bg) + ci(-5, 4, 1.5, bg) + ci(5, 4, 1.5, bg) + r(-7, 7, 4, 3, 1, col) + r(3, 7, 4, 3, 1, col); break;
      case 'taxi': g += pa('M-11,4 V0 Q-11,-2 -9,-2 L-6,-2 L-4,-6 H4 L6,-2 H9 Q11,-2 11,0 V4Z', col) + r(-3, -9.5, 6, 3.4, 1, col) + ci(-6, 4.5, 2.7, col) + ci(6, 4.5, 2.7, col) + ci(-6, 4.5, 1, bg) + ci(6, 4.5, 1, bg); break;
      case 'card': g += r(-10, -7, 20, 14, 3, col) + r(-10, -3.5, 20, 3, 0, bg) + r(-7, 2, 6, 2, 1, bg); break;
      case 'contactless': g += ln('M-4,-6 Q3,0 -4,6', col, 2) + ln('M0,-9.5 Q9,0 0,9.5', col, 2) + ln('M4,-13 Q15,0 4,13', col, 2); break;
      case 'check': g += ln('M-8,0 L-2,6 L8,-6', col, 3.4); break;
    }
    return g + '</g>';
  }
  /* sign(c, x, y, w, h, text, icon, {stack, fill, tc, maxfs}) */
  function sign(c, x, y, w, h, text, ic, o) {
    o = o || {}; var K = c.k, f = o.fill || P.fjord, tc = o.tc || '#fff', g = '';
    g += r(x, y, w, h, o.rx || 9, K(f)) + r(x + 3, y + 3, w - 6, h - 6, 7, 'none', 'stroke="#fff" stroke-opacity=".32" stroke-width="1.4"');
    if (o.stack) {
      if (ic) g += icon(ic, x + w / 2, y + h * 0.33, h * 0.42, tc, K(f));
      g += tx(x + w / 2, y + h * 0.84, text, fit(text, w - 10, o.maxfs || 14), tc);
    } else {
      var iw = ic ? h * 0.62 : 0;
      if (ic) g += icon(ic, x + h * 0.48, y + h / 2, h * 0.5, tc, K(f));
      g += tx(x + iw + (w - iw) / 2, y + h / 2 + fit(text, w - iw - 10, o.maxfs || 18) * 0.34, text, fit(text, w - iw - 12, o.maxfs || 18), tc);
    }
    return g;
  }
  function cables(c, xs, y1, y2) {
    var s = ''; for (var i = 0; i < xs.length; i++) s += r(xs[i] - 1, y1, 2, y2 - y1, 0, c.k('#6b7488'));
    return s;
  }

  /* ---------- props ---------- */
  function snacks(c, x, y, w, seed) {
    var rg = rng(seed), K = c.k, cols = [P.lingon, P.cloudberry, P.fjord, P.aurora, P.aurora2, P.taxi, '#ff7fa8', P.pine], s = '', cx = x;
    while (cx < x + w - 14) {
      var t = rg(), col = K(cols[Math.floor(rg() * cols.length)]), bw = 14 + rg() * 12, bh = 16 + rg() * 14;
      if (cx + bw > x + w) break;
      if (t < 0.45) s += r(cx, y - bh, bw, bh, 3, col) + r(cx, y - bh, bw, 3, 1.5, '#fff', 'opacity=".35"') + r(cx + 2, y - bh * 0.62, bw - 4, bh * 0.28, 2, '#fff', 'opacity=".55"');
      else if (t < 0.75) s += r(cx, y - bh * 0.8, bw * 0.7, bh * 0.8, 4, col) + r(cx, y - bh * 0.8, bw * 0.7, 3, 1.5, '#fff', 'opacity=".4"');
      else s += r(cx, y - bh * 0.5, bw, bh * 0.5, 2.5, col) + r(cx + 2, y - bh * 0.35, bw - 4, 2, 1, '#fff', 'opacity=".5"');
      cx += bw + 4 + rg() * 4;
    }
    return s;
  }
  function suitcase(c, x, y, w, h, col, o) {
    var K = c.k; o = o || {};
    return r(x, y - h, w, h, 4, K(col)) + ln('M' + n(x + w * 0.35) + ',' + n(y - h) + ' V' + n(y - h - 5) + ' H' + n(x + w * 0.65) + ' V' + n(y - h), K(col), 2.2) +
      r(x + w * 0.12, y - h * 0.92, w * 0.08, h * 0.84, 2, '#fff', 'opacity=".28"') + (o.tag ? r(x + w * 0.62, y - h * 0.6, w * 0.22, h * 0.26, 2, P.taxi) : '') +
      ci(x + w * 0.22, y + 1.5, 1.8, K(P.ink)) + ci(x + w * 0.78, y + 1.5, 1.8, K(P.ink));
  }
  function bottle(c, kind, x, yb, sc) {
    var K = c.k, liq, lab, cap, uid = c.I('bt-' + kind);
    if (kind === 'sparkling') { liq = '#bfe3ff'; lab = P.fjord; cap = P.fjord; }
    else if (kind === 'still') { liq = '#e6f5ff'; lab = '#7fd1d8'; cap = '#ffffff'; }
    else { liq = P.cloudberry; lab = '#e8741b'; cap = P.pine; }
    var body = 'M-18,-8 Q-18,0 -10,0 H10 Q18,0 18,-8 V-56 Q18,-68 8,-74 V-90 H-8 V-74 Q-18,-68 -18,-56Z';
    var g = '<g transform="translate(' + n(x) + ',' + n(yb) + ') scale(' + sc + ')">';
    g += el(14, 2, 24, 4, P.night, 'opacity=".12"');
    g += pa(body, '#ffffff', 'opacity=".55"');
    g += pa('M-16.5,-8 Q-16.5,-1.5 -10,-1.5 H10 Q16.5,-1.5 16.5,-8 V-54 Q16.5,-64 8,-69 H-8 Q-16.5,-64 -16.5,-54Z', liq, kind === 'still' ? 'opacity=".9"' : '');
    if (kind === 'sparkling') {
      var bs = [[-9, -20, 2.4], [6, -34, 2], [-4, -52, 2.8], [10, -60, 1.8], [-11, -62, 2], [3, -14, 1.8], [11, -42, 2.3]];
      for (var i = 0; i < bs.length; i++) g += ci(bs[i][0], bs[i][1], bs[i][2], '#fff', 'opacity=".85" class="la-anim la-bubble" style="animation-delay:-' + (i * 0.6) + 's;animation-duration:' + (2.6 + i * 0.3) + 's"');
    }
    g += r(-18, -48, 36, 25, 3, K(lab));
    if (kind === 'sparkling') g += ci(0, -35.5, 6.5, '#fff', 'opacity=".9"') + ci(-1.6, -37, 1.4, P.fjord) + ci(2, -33.5, 1.1, P.fjord) + ci(1.6, -38.5, 0.9, P.fjord);
    else if (kind === 'still') g += pa('M0,-43 Q7,-35 0,-29 Q-7,-35 0,-43Z', '#fff', 'opacity=".95"');
    else g += ci(0, -35.5, 7, '#ffd27a') + pa('M0,-42.5 Q5,-48 8,-44 Q4,-43 0,-42.5Z', K(P.pine));
    g += ci(11, -26.5, 4.2, '#fff', 'opacity=".95"') + ln('M9,-27 a2.2,2.2 0 1 1 1.4,2.2', K('#2a8a66'), 1);
    g += r(-12, -64, 4.5, 12, 2.2, '#fff', 'opacity=".4"');
    g += r(-8.5, -97, 17, 8, 2.5, K(cap));
    return g + '</g>';
  }
  function plant(c, x, y, s) {
    var K = c.k, g = '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">';
    g += r(-10, -20, 20, 20, 5, K('#c8714a'));
    var lv = [[-14, -34, -25], [0, -48, 0], [14, -34, 25], [-6, -40, -12], [8, -42, 14]];
    for (var i = 0; i < lv.length; i++) g += '<ellipse cx="' + lv[i][0] + '" cy="' + lv[i][1] + '" rx="6" ry="17" fill="' + K(i % 2 ? '#2f8f63' : '#43a876') + '" transform="rotate(' + lv[i][2] + ' ' + lv[i][0] + ' ' + (lv[i][1] + 14) + ')"/>';
    return g + '</g>';
  }
  function tint(c, k) { return ''; }

  /* ---------- vehicles ---------- */
  function bus(c, x, yb, sc, dest, body, wd) {
    var K = c.k, g = '<g transform="translate(' + n(x) + ',' + n(yb) + ') scale(' + sc + ')">';
    g += el(0, 2, 128, 5, P.night, 'opacity=".16"');
    g += r(-120, -84, 240, 78, 16, K(body)) + r(-120, -26, 240, 20, 0, K(shade(body, -0.22))) + r(-120, -14, 240, 8, 8, K(shade(body, -0.22)));
    g += r(-120, -52, 240, 3, 0, '#fff', 'opacity=".35"');
    var wf = c.lit ? WARM : '#cfe8ff';
    g += r(-84, -76, 196, 34, 8, K('#8fb4e6')) ;
    for (var i = 0; i < 5; i++) g += r(-80 + i * 38, -72, 32, 26, 6, c.lit ? WARM : K('#d6ebff'));
    g += r(-114, -76, 26, 60, 6, K('#7fa4d8')) + r(-112, -72, 22, 52, 5, c.lit ? WARM : K('#cfe5fb'));
    g += r(-118, -46, 18, 22, 4, K('#cfe5fb'), 'opacity="0"');
    g += r(-116, -90, 94, 15, 4, '#0a0f1e') + tx(-69, -79, dest, fit(dest, 88, 10.5), '#ffb347', { cls: 'la-led' });
    g += ci(-114, -24, 4, c.lit ? WARM : '#fff8d6');
    g += ci(-78, -2, 15, K(P.ink)) + ci(-78, -2, 7, K('#9aa3b8')) + ci(70, -2, 15, K(P.ink)) + ci(70, -2, 7, K('#9aa3b8'));
    return g + '</g>';
  }
  function car(c, x, yb, sc, body, driver) {
    var K = c.k, g = '<g transform="translate(' + n(x) + ',' + n(yb) + ') scale(' + sc + ')">';
    g += el(0, 2, 118, 5, P.night, 'opacity=".16"');
    g += pa('M-100,-6 L-100,-24 Q-100,-31 -88,-33 L-62,-36 L-40,-60 Q-36,-64 -30,-64 L52,-64 Q60,-64 64,-58 L80,-36 L94,-32 Q100,-30 100,-22 L100,-6Z', K(body));
    g += pa('M-100,-14 L100,-14 L100,-6 L-100,-6Z', K(shade(body, -0.2)));
    var gl = c.lit ? '#2a3a66' : '#7fb0dc';
    g += pa('M-56,-36 L-37,-58 L-34,-58 L-34,-36Z', K(gl)) + r(-32, -58, 36, 22, 4, K(gl)) + pa('M8,-58 L50,-58 Q56,-58 59,-53 L72,-36 L8,-36Z', K(gl));
    if (driver) {
      g += '<defs><clipPath id="' + c.I('drv-clip') + '"><rect x="-32" y="-58" width="36" height="22" rx="4"/></clipPath></defs>';
      g += '<g clip-path="url(#' + c.I('drv-clip') + ')">' + r(-32, -58, 36, 22, 0, K('#3a4568')) + person(c, { x: -14, y: 2, s: 0.58, skin: SK[1], shirt: P.cloudberry, hair: '#2b2b33', pose: 'bust', big: true, noShadow: true }) + '</g>';
      g += r(-34, -39, 40, 5, 2.5, K(shade(body, -0.1))) + r(-27, -42, 12, 5.5, 2.7, K(SK[1]));
    }
    g += r(-102, -26, 8, 6, 2, c.lit ? WARM : '#fff6c8') + r(94, -28, 6, 8, 2, K(P.lingon));
    g += r(-10, -64, 22, 3, 0, K(P.ink), 'opacity=".25"');
    g += r(-17, -76, 34, 12, 4, P.taxi) + tx(0, -67, 'TAXI', 9.5, P.ink, { cls: 'la-car' }) + (c.lit ? r(-17, -76, 34, 12, 4, '#fff', 'opacity=".25"') : '');
    g += ci(-62, -4, 15, K(P.ink)) + ci(-62, -4, 7, K('#aab2c4')) + ci(62, -4, 15, K(P.ink)) + ci(62, -4, 7, K('#aab2c4'));
    return g + '</g>';
  }
  function trainCar(c, x0, y0, wdt, hgt, doors) {
    var K = c.k, g = '';
    g += r(x0, y0, wdt, hgt, 22, K('#f3f5f9'));
    g += r(x0, y0 + hgt * 0.62, wdt, hgt * 0.15, 0, K(P.lingon));
    g += r(x0, y0 + hgt * 0.78, wdt, hgt * 0.07, 0, K('#cfd5e0'));
    for (var xw = x0 + 14; xw < x0 + wdt - 40; xw += 58) {
      var inDoor = false;
      for (var j = 0; j < doors.length; j++) if (xw + 46 > doors[j] - 4 && xw < doors[j] + 54) inDoor = true;
      if (!inDoor) g += r(xw, y0 + hgt * 0.14, 46, hgt * 0.36, 9, c.lit ? WARM : K('#27375e'));
    }
    for (var d = 0; d < doors.length; d++) {
      g += r(doors[d] - 3, y0 + hgt * 0.06, 56, hgt * 0.94, 8, K(P.lingon)) + r(doors[d] + 3, y0 + hgt * 0.1, 20, hgt * 0.8, 6, K('#b92b40')) + r(doors[d] + 27, y0 + hgt * 0.1, 20, hgt * 0.8, 6, K('#b92b40'));
      g += r(doors[d] + 6, y0 + hgt * 0.14, 14, hgt * 0.34, 5, c.lit ? WARM : K('#bfe0f5')) + r(doors[d] + 30, y0 + hgt * 0.14, 14, hgt * 0.34, 5, c.lit ? WARM : K('#bfe0f5'));
      g += r(doors[d] + 23, y0 + hgt * 0.5, 4, hgt * 0.18, 2, '#fff', 'opacity=".6"');
    }
    return g;
  }

  /* ======================================================================
     SCENES
     ====================================================================== */
  var S = {};

  /* ---- start ---- */
  S.start = function (c) {
    var K = c.k, st = c.st, s = '';
    s += sky(c, { sun: { x: 290, y: 235, r: 30 } });
    s += '<g transform="translate(0,-45)">';
    s += pa(hillsD(352, 9, 1, 0.6, 545), K('#78b79f')) + pa(hillsD(372, 7, 2, 2.2, 545), K('#5aa387'));
    // terminal and tower
    s += r(238, 332, 152, 50, 8, K('#e7ebf1')) + r(238, 332, 152, 8, 4, K(P.fjord));
    for (var i = 0; i < 8; i++) s += r(248 + i * 18, 348, 12, 20, 3, c.lit ? WARM : K('#7fa6d6'));
    s += r(344, 282, 12, 52, 3, K('#cfd6e2')) + r(336, 268, 28, 16, 6, c.lit ? WARM : K('#7fa6d6')) + r(338, 262, 24, 8, 4, K(P.lingon));
    // ground and runway
    s += r(0, 380, 400, 170, 0, K('#4f9a6a')) + pa('M0,392 Q200,382 400,392 V545 H0Z', K('#43905f'));
    s += po('186,386 214,386 340,545 60,545', K('#3b4256')) + po('186,386 190,386 90,545 60,545', K('#2f3548'), 'opacity=".5"');
    var dsh = [[388, 2, 3], [400, 3, 6], [418, 4, 10], [444, 6, 15], [478, 8, 22]];
    for (var d = 0; d < dsh.length; d++) s += r(200 - dsh[d][1] / 2, dsh[d][0], dsh[d][1], dsh[d][2], 1, '#f6f1e7', 'opacity=".9"');
    for (var l = 0; l < 5; l++) { var yy = 390 + l * l * 4.4 + l * 6, off = 14 + l * 26 + l * l * 3; s += ci(200 - off, yy, 1.5 + l * 0.5, c.lit ? WARM : '#ffd27a') + ci(200 + off, yy, 1.5 + l * 0.5, c.lit ? WARM : '#ffd27a'); }
    // tree lines
    var L = [[52, 440, 96, 'p'], [92, 418, 62, 'b'], [126, 404, 44, 'p'], [30, 475, 120, 'b'], [76, 486, 112, 'p'], [150, 396, 30, 'b']];
    var Rr = [[350, 440, 96, 'b'], [308, 420, 64, 'p'], [276, 404, 44, 'b'], [372, 478, 118, 'p'], [330, 488, 110, 'b'], [252, 396, 30, 'p']];
    var all = L.concat(Rr).sort(function (a, b) { return a[1] - b[1]; });
    for (var q = 0; q < all.length; q++) s += all[q][3] === 'p' ? pine(c, all[q][0], all[q][1], all[q][2]) : birch(c, all[q][0], all[q][1], all[q][2]);
    // plane
    var pl = '';
    pl += el(0, 26, 80, 5, P.night, 'opacity="0"');
    pl += pa('M44,-14 L68,-48 L80,-48 L70,-8Z', K(P.fjord)) + pa('M52,-22 L72,-46 L76,-46 L66,-18Z', '#fff', 'opacity=".5"');
    pl += pa('M-8,6 L-44,36 L-24,36 L22,6Z', K('#cdd3de'));
    pl += r(-64, -16, 130, 32, 16, K('#ffffff')) + r(-64, 2, 130, 7, 0, K(P.cloudberry), 'opacity=".95"') + pa('M-64,2 Q-64,-16 -44,-16 L-20,-16 Q-52,-14 -64,2Z', '#fff', 'opacity="0"');
    for (var w = 0; w < 9; w++) pl += ci(-40 + w * 10, -5, 2.4, K('#27375e'));
    pl += pa('M-64,-4 Q-64,-16 -46,-16 L-34,-16 L-38,-4Z', K('#27375e'));
    pl += pa('M-14,10 L-34,34 L-14,34 L14,10Z', K('#aeb6c6'));
    pl += r(-1, 16, 4, 14, 2, K('#888')) + ci(1, 31, 5.5, K(P.ink)) + r(-34, 14, 4, 14, 2, K('#888')) + ci(-32, 29, 5.5, K(P.ink));
    s += el(200, 446, 78, 6, P.night, 'opacity=".22"');
    var pw = '<g transform="translate(200,414)">';
    if (st === 'landing') pw += '<g class="la-anim la-land">' + pl + '</g>';
    else if (st === 'landed') pw += '<g>' + pl + '</g>';
    else pw += '<g transform="translate(115,-232) rotate(-9) scale(.55)"><g class="la-anim la-bob">' + pl + '</g></g>';
    s += pw + '</g></g>';
    return wrap(c, 'A plane descending onto a runway lined with pine and birch trees, Helsinki airport', s);
  };

  /* ---- gate ---- */
  S.gate = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '';
    s += r(0, 0, 400, 500, 0, K('#efe9dc'));
    s += po('0,0 400,0 360,70 40,70', K('#d7d0c0')) + r(60, 26, 280, 8, 4, c.lit ? '#fff7d8' : '#ffffff', 'opacity=".85"');
    s += po('40,420 360,420 400,500 0,500', K('#c8bfae'));
    for (var f = 0; f < 6; f++) s += ln('M' + (40 + f * 64) + ',420 L' + (-20 + f * 88) + ',500', '#b5ab98', 1.4, 'opacity=".5"');
    s += po('0,0 40,70 40,420 0,500', K('#8fa8c4')) + po('400,0 360,70 360,420 400,500', K('#7f98b6'));
    for (var rb = 0; rb < 6; rb++) { s += ln('M0,' + (rb * 80) + ' L40,' + (70 + rb * 58), '#fff', 1.6, 'opacity=".25"'); s += ln('M400,' + (rb * 80) + ' L360,' + (70 + rb * 58), '#fff', 1.6, 'opacity=".2"'); }
    // sign
    s += cables(c, [110, 290], 34, 78);
    s += r(66, 78, 268, 56, 14, K(P.fjord)) + r(66, 78, 268, 56, 14, 'none', 'stroke="#fff" stroke-opacity=".3" stroke-width="2"');
    s += tx(200, 106, 'Tervetuloa Suomeen!', 21, '#fff') + tx(200, 124, 'Welcome to Finland', 11.5, P.taxi);
    // window
    var wi = '<rect x="150" y="300" width="100" height="20" fill="#8a94a8"/>' + r(190, 270, 80, 30, 0, 'none') +
      po('255,300 255,258 262,250 275,250 275,300', '#fff', 'opacity=".95"') + pa('M262,250 L262,236 L286,236 L275,250Z', P.fjord) + r(60, 290, 300, 40, 0, '#7b8596') + r(60, 296, 300, 3, 0, P.taxi, 'opacity=".9"') +
      pa('M230,296 Q210,296 214,288 L214,280 Q214,274 222,274 L282,274 Q290,274 290,282 L290,296Z', '#fff');
    s += sky(c, { x: 186, y: 158, w: 150, h: 168, r: 10, uid: 'win', sun: { x: 300, y: 196, r: 14 }, inner: pa('M-10,330 L400,330 V280 Q330,268 300,284 L-10,284Z', '#7b8596') + r(186, 306, 150, 22, 0, '#8a94a8') + pa('M230,300 Q214,300 218,292 L218,286 Q218,280 226,280 L298,280 Q306,280 306,288 L306,300Z', '#fff') + pa('M284,282 L292,262 L306,262 L302,284Z', K(P.fjord)) + r(222, 288, 76, 3, 0, K(P.cloudberry)) });
    s += r(178, 150, 166, 184, 16, 'none', 'stroke="#fff" stroke-width="9"') + r(258, 158, 5, 168, 0, '#fff') + r(186, 240, 150, 5, 0, '#fff') + r(170, 330, 182, 9, 4, K('#e9e2d2'));
    s += pa('M196,170 L246,170 L196,226Z', '#fff', 'opacity=".16"');
    // floor guide
    s += pa('M230,448 H284 V438 L314,452 L284,466 V456 H230Z', P.aurora, 'opacity=".75"');
    s += plant(c, 62, 440, 1.2);
    // NPC
    var greeted = st === 'greeted';
    s += hot('npc', 'Airport staff member', 52, 262, 112, 170, person(c, { x: 108, y: 428, s: 1.62, skin: SK[2], shirt: P.fjord, pants: '#1f2a4d', hair: '#2a1d16', pose: greeted ? 'point' : 'wave', lanyard: true, big: greeted }));
    return wrap(c, 'Arrival gate at the end of a jet bridge with a Welcome to Finland sign and a friendly airport staff member', s);
  };

  /* ---- exit ---- */
  S.exit = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', open = st === 'open', bag = st === 'bag';
    s += r(0, 0, 400, 500, 0, K('#e6edf5'));
    s += po('0,0 400,0 330,170 70,170', K('#cdd8e6')) + po('0,0 70,170 70,430 0,500', K('#d8e1ec')) + po('400,0 330,170 330,430 400,500', K('#c9d4e2'));
    for (var i = 0; i < 4; i++) s += r(110 + i * 60, 40 + i * 10, 40, 6, 3, c.lit ? '#fff8dc' : '#fff', 'opacity=".9"');
    s += po('70,430 330,430 400,500 0,500', K('#b9c2d0'));
    for (var f = 0; f < 7; f++) s += ln('M' + (70 + f * 43) + ',430 L' + (-40 + f * 80) + ',500', '#fff', 1.6, 'opacity=".35"');
    s += '<g transform="translate(0,30)">';
    // door opening
    s += r(128, 184, 144, 240, 8, K('#f4f7fb'));
    var inner = '';
    if (open) {
      inner = sky(c, { x: 136, y: 196, w: 128, h: 224, uid: 'out', sun: { x: 220, y: 280, r: 22 } }) + '<g clip-path="url(#' + c.I('out-c') + ')">' + pa(hillsD(360, 6, 1, 1, 424), K('#6fb08f')) + birch(c, 160, 420, 130) + pine(c, 244, 420, 90) + birch(c, 212, 420, 80, {}) + '</g>';
      inner += '<radialGradient id="' + c.I('rays') + '"><stop offset="0" stop-color="#fff7d0" stop-opacity=".9"/><stop offset="1" stop-color="#fff7d0" stop-opacity="0"/></radialGradient>' + po('200,300 120,424 280,424', 'url(#' + c.I('rays') + ')', 'opacity=".65"');
    } else inner = r(136, 196, 128, 228, 4, K('#eaf4fb'));
    s += inner;
    s += '<defs><clipPath id="' + c.I('dclip') + '"><rect x="136" y="196" width="128" height="228"/></clipPath></defs>';
    var panel = function (x, cls, off) {
      var p = r(x, 196, 64, 228, 0, 'url(#' + c.I('frost') + ')') + r(x, 276, 64, 28, 0, '#fff', 'opacity=".55"');
      for (var k = 0; k < 10; k++) p += ci(x + 8 + (k % 5) * 12, 284 + Math.floor(k / 5) * 12, 2.2, '#fff', 'opacity=".8"');
      p += r(x + (cls === 'l' ? 56 : 2), 300, 6, 40, 3, K('#8a97ab'));
      return off ? '<g transform="translate(' + off + ',0)"><g class="la-anim la-door-' + cls + '-open">' + p + '</g></g>' : p;
    };
    s += '<defs>' + gradDef(c.I('frost'), ['#e1f0fa', '#bcd9ee', '#d6e9f6']) + '</defs>';
    s += '<g clip-path="url(#' + c.I('dclip') + ')">' + panel(136, 'l', open ? -60 : 0) + panel(200, 'r', open ? 60 : 0) + '</g>';
    s += r(128, 184, 144, 14, 7, K('#59657d')) + r(128, 184, 8, 240, 4, K('#f4f7fb')) + r(264, 184, 8, 240, 4, K('#f4f7fb'));
    s += r(128, 190, 144, 4, 0, '#2fe0a8', c.lit ? '' : 'opacity=".6"');
    s = s.replace(/(<g clip-path="url\(#la-exit-dclip\)">)/, '$1');
    s += hot('doors', 'Frosted sliding doors', 124, 180, 152, 246, '', 10) + '</g>';
    // signs
    s += cables(c, [76, 104, 186, 214, 296, 324], 24, 150);
    s += hot('sign-matkatavarat', 'Matkatavarat sign', 44, 146, 100, 60, sign(c, 44, 146, 100, 60, 'Matkatavarat', 'suitcase', { stack: true, maxfs: 13 }), 10);
    s += hot('sign-uloskaynti', 'Uloskäynti sign', 154, 146, 100, 60, sign(c, 154, 146, 100, 60, 'Uloskäynti', 'exit', { stack: true, maxfs: 14, fill: '#1c7a55' }), 10);
    s += hot('sign-lahtevat', 'Lähtevät sign', 264, 146, 100, 60, sign(c, 264, 146, 100, 60, 'Lähtevät', 'plane', { stack: true, maxfs: 14 }), 10);
    // baggage belt
    s += '<g transform="translate(6,36) scale(.8)">';
    s += po('46,330 150,330 168,400 30,400', K('#2c3447')) + po('46,330 150,330 146,340 50,340', K('#5a647c')) + r(30, 396, 138, 16, 5, K('#7b869c'));
    for (var rl = 0; rl < 5; rl++) s += ln('M' + (50 + rl * 22) + ',344 L' + (40 + rl * 26) + ',394', '#3d465c', 2);
    s += suitcase(c, 54, 358, 26, 22, '#3b8f86') + suitcase(c, 118, 372, 22, 20, '#6b4f8f') + suitcase(c, 84, 385, 24, 18, '#c9a46a');
    if (!open) {
      var mine = suitcase(c, 76, 372, 32, 28, P.cloudberry, { tag: true });
      s += mine;
      if (bag) s += '<g class="la-anim la-glow"><circle cx="92" cy="358" r="30" fill="' + P.cloudberry + '" opacity=".3"/><circle cx="92" cy="358" r="30" fill="none" stroke="' + P.taxi + '" stroke-width="3"/></g>' + '<g class="la-anim la-bob" style="animation-duration:1.2s">' + pa('M92,318 L82,306 H88 V298 H96 V306 H102Z', P.taxi) + '</g>';
    } else s += suitcase(c, 292, 440, 36, 32, P.cloudberry, { tag: true }) + shadowL(328, 442, 40, 6, 0.12);
    s += '</g>' + plant(c, 346, 436, 1.1);
    return wrap(c, 'Corridor with frosted sliding glass doors and overhead signs: Matkatavarat, Uloskäynti, Lähtevät', s);
  };

  /* ---- hall ---- */
  S.hall = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '';
    s += r(0, 0, 400, 500, 0, K('#e9e3d6'));
    // wood slat ceiling
    s += po('0,0 400,0 330,150 70,150', K('#d9a468'));
    for (var i = 0; i <= 14; i++) { var tx0 = i * 400 / 14, bx = 70 + i * 260 / 14; s += ln('M' + n(tx0) + ',0 L' + n(bx) + ',150', K('#b97f45'), 2, 'opacity=".75"'); }
    for (var b = 1; b < 5; b++) { var yy = 150 * (1 - Math.pow(0.62, b)) * 1.18; s += ln('M' + n(yy * 70 / 150) + ',' + n(yy) + ' L' + n(400 - yy * 70 / 150) + ',' + n(yy), K('#a46d38'), 3, 'opacity=".5"'); }
    s += r(70, 144, 260, 8, 0, K('#8b5a2e'));
    s += po('0,0 70,150 70,340 0,500', K('#f2ece0')) + po('400,0 330,150 330,340 400,500', K('#e6dfd1'));
    s += po('70,340 330,340 400,500 0,500', K('#d3ccbe'));
    for (var fl = 0; fl < 9; fl++) s += ln('M' + (70 + fl * 32.5) + ',340 L' + (-60 + fl * 65) + ',500', '#fff', 1.3, 'opacity=".4"');
    // back wall with window band
    s += r(70, 150, 260, 190, 0, K('#f6f1e7'));
    s += sky(c, { x: 78, y: 156, w: 244, h: 62, uid: 'win', sun: { x: 270, y: 190, r: 14 }, inner: pa(hillsD(206, 4, 2, 0.5, 220), K('#6fb08f')) + birch(c, 110, 216, 50) + pine(c, 160, 216, 42) + birch(c, 236, 216, 54) });
    for (var m = 0; m < 4; m++) s += r(78 + m * 81, 156, 4, 62, 0, '#fff');
    s += r(74, 216, 252, 5, 0, K('#d9d2c2'));
    // portals + signs
    var defs = [
      ['route-train', 'Juna', 'train', P.lingon, 120, 'Train route sign'],
      ['route-bus', 'Bussit', 'bus', P.fjord, 200, 'Bus route sign'],
      ['route-taxi', 'Taksit', 'taxi', P.taxi, 280, 'Taxi route sign']
    ];
    var sel = st && String(st).replace('route-', '');
    for (var d = 0; d < 3; d++) {
      var dd = defs[d], cx = dd[4], col = dd[3];
      var inner = r(cx - 30, 226, 60, 114, 6, K(shade(col, -0.05))) + r(cx - 25, 231, 50, 109, 4, c.lit ? '#fff4cf' : K('#fdf8ec'));
      inner += icon(dd[2], cx, 290, 36, col === P.taxi ? '#c99a00' : col, '#fdf8ec');
      inner += cables(c, [cx - 26, cx + 26], 110, 152);
      inner += sign(c, cx - 38, 150, 76, 34, dd[1], dd[2], { fill: col, tc: col === P.taxi ? P.ink : '#fff', maxfs: 14, rx: 9 });
      var ring = sel === dd[2] ? '<rect x="' + (cx - 41) + '" y="144" width="82" height="200" rx="12" fill="none" stroke="' + P.cloudberry + '" stroke-width="3.5"/>' : '';
      s += hot(dd[0], dd[5], cx - 40, 144, 80, 202, inner + ring, 12);
    }
    // guide lines
    var gl = [[120, P.lingon], [200, P.fjord], [280, '#e8b800']];
    for (var g = 0; g < 3; g++) s += ln('M200,492 C200,430 ' + gl[g][0] + ',420 ' + gl[g][0] + ',346', gl[g][1], 8, 'opacity=".9"');
    s += ln('M200,492 C200,430 120,420 120,346', '#fff', 1.4, 'opacity="0"');
    // travellers
    s += person(c, { x: 86, y: 440, s: 1.25, skin: SK[3], shirt: P.cloudberry, pants: '#2b3a67', hair: '#1c1410', pack: P.pine }) + suitcase(c, 112, 436, 22, 28, '#6b4f8f');
    s += person(c, { x: 318, y: 430, s: 1.15, skin: SK[0], shirt: P.aurora2, pants: '#33415f', hair: '#c79a4b', hairLong: true, pose: 'hold' });
    return wrap(c, 'Arrivals hall with a wooden slat ceiling and three signs: Juna, Bussit, Taksit', s);
  };

  /* ---- ticket ---- */
  S.ticket = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', pay = st === 'pay', printed = st === 'printed';
    s += r(0, 0, 400, 500, 0, K('#dfe6ee'));
    for (var gx = 0; gx < 9; gx++) s += r(gx * 46, 0, 1.5, 420, 0, '#fff', 'opacity=".45"');
    for (var gy = 0; gy < 9; gy++) s += r(0, gy * 48, 400, 1.5, 0, '#fff', 'opacity=".45"');
    s += r(0, 0, 400, 38, 0, K('#cfd8e4')) + r(60, 14, 90, 7, 3.5, c.lit ? '#fff7d8' : '#fff') + r(250, 14, 90, 7, 3.5, c.lit ? '#fff7d8' : '#fff');
    s += r(0, 420, 400, 80, 0, K('#b7c0ce'));
    s += pa('M0,420 H400 V432 H0Z', K('#a8b2c2'));
    // map poster
    s += r(296, 150, 68, 96, 8, '#fff') + r(300, 154, 60, 88, 6, K('#e6f2ec'));
    s += ci(330, 214, 30, K('#cfe6ff'), 'opacity=".9"') + ci(330, 214, 20, K('#a8d0ff')) + ci(330, 214, 10, K('#6aa7f2'));
    s += tx(330, 168, 'A B C', 10, K(P.fjord), {});
    s += ln('M300,226 Q320,200 360,210', P.lingon, 2.2) + ci(344, 207, 3, P.lingon);
    s += plant(c, 64, 428, 1.25);
    // machine
    s += '<g transform="translate(0,-40)">';
    s += po('280,420 330,440 330,432 280,410', P.night, 'opacity="0"') + pa('M280,430 L360,452 L320,456 L200,438Z', P.night, 'opacity=".13"');
    s += r(120, 84, 160, 386, 20, K(shade(P.fjord, -0.25))) + r(120, 84, 154, 386, 20, K(P.fjord));
    s += r(120, 84, 160, 44, 20, K(shade(P.fjord, -0.3))) + r(120, 108, 160, 20, 0, K(shade(P.fjord, -0.3)));
    s += tx(200, 114, 'Lippuautomaatti', fit('Lippuautomaatti', 140, 15), '#fff');
    s += r(134, 138, 132, 128, 12, '#0b1230');
    s += r(140, 144, 120, 116, 8, '#13245c');
    var zbtn = function (id, label, x, y, w, h, fs, on, nm) {
      return hot(id, nm, x, y, w, h, r(x, y, w, h, 7, on ? P.cloudberry : '#2d6be0') + tx(x + w / 2, y + h / 2 + fs * 0.36, label, fs, on ? P.ink : '#fff'), 7);
    };
    if (!pay && !printed) {
      s += zbtn('zone-ab', 'AB', 152, 152, 96, 28, 16, false, 'Zone AB ticket') + zbtn('zone-abc', 'ABC', 152, 188, 96, 28, 16, false, 'Zone ABC ticket') + zbtn('zone-abcd', 'ABCD', 152, 224, 96, 28, 16, false, 'Zone ABCD ticket');
    } else {
      if (pay) {
        s += tx(200, 170, 'Maksa kortilla', 15, P.cloudberry) + tx(200, 186, 'Pay by card', 10.5, '#cfe0ff');
        s += '<g class="la-anim la-contact" style="transform-origin:200px 208px">' + icon('contactless', 200, 208, 24, '#fff') + '</g>';
      } else {
        s += ci(200, 176, 18, P.aurora) + icon('check', 200, 176, 26, '#0b3b2c') + tx(200, 214, 'ABC', 16, '#fff');
      }
      s += zbtn('zone-ab', 'AB', 148, 232, 28, 16, 9, false, 'Zone AB ticket') + zbtn('zone-abc', 'ABC', 180, 232, 38, 16, 9, true, 'Zone ABC ticket') + zbtn('zone-abcd', 'ABCD', 222, 232, 34, 16, 8, false, 'Zone ABCD ticket');
    }
    // card reader
    var rd = r(148, 280, 104, 70, 14, K('#eef1f7')) + r(148, 340, 104, 10, 0, K('#cdd3e0')) + icon('contactless', 200, 312, 34, pay ? P.cloudberry : P.fjord, '#eef1f7') + ci(168, 296, 3.2, pay ? P.aurora : '#9aa6bd') + ci(232, 296, 3.2, pay ? P.aurora : '#9aa6bd');
    if (pay) rd = '<g class="la-anim la-contact" style="transform-origin:200px 312px">' + ci(200, 312, 38, P.cloudberry, 'opacity=".18"') + '</g>' + rd;
    s += hot('card-reader', 'Card reader', 142, 274, 116, 84, rd, 16);
    s += r(160, 366, 80, 14, 7, K('#0b1230')) + r(166, 370, 68, 4, 2, '#000', 'opacity=".5"');
    if (printed) s += '<g class="la-anim la-ticket">' + r(170, 374, 60, 58, 3, '#fff') + r(170, 374, 60, 10, 0, P.fjord) + tx(200, 382, 'lippu', 7.5, '#fff') + tx(200, 410, 'ABC', 17, P.ink) + r(178, 418, 44, 2, 1, '#c8cfdc') + r(178, 423, 30, 2, 1, '#c8cfdc') + '</g>';
    s += r(120, 466, 160, 8, 0, K(shade(P.fjord, -0.35))) + '</g>';
    return wrap(c, 'Ticket machine Lippuautomaatti with zone buttons AB, ABC and ABCD and a card reader', s);
  };

  /* ---- platform ---- */
  S.platform = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', tr = st === 'train';
    s += r(0, 0, 400, 500, 0, K('#39456a'));
    for (var v = 0; v < 12; v++) s += r(v * 36, 0, 2, 400, 0, '#fff', 'opacity=".05"');
    s += r(0, 0, 400, 60, 0, K('#2a3252'));
    for (var l = 0; l < 4; l++) s += r(30 + l * 92, 18, 60, 8, 4, '#fff6d6', 'opacity=".95"') + '<rect x="' + (30 + l * 92) + '" y="26" width="60" height="30" fill="#fff6d6" opacity=".07"/>';
    // far tunnel end and rails
    s += r(0, 330, 400, 66, 0, K('#1f2540'));
    s += ln('M0,360 H400', K('#8b94ab'), 2.5) + ln('M0,376 H400', K('#8b94ab'), 2.5);
    for (var sl = 0; sl < 14; sl++) s += r(sl * 30, 382, 18, 4, 1, K('#4a3b33'));
    if (!tr) {
      s += '<g class="la-anim la-glow">' + ci(372, 346, 22, '#fff6d6', 'opacity=".4"') + ci(372, 346, 9, '#ffffff') + '</g>';
    }
    // train
    if (tr) {
      s += '<g class="la-anim la-train-in">' + trainCar(c, -30, 226, 470, 166, [160, 262]) + r(-30, 392, 470, 8, 0, K('#2a3252')) + '</g>';
      s += hot('train-doors', 'Train doors', 150, 230, 70, 162, '', 10) + hot('train-doors', 'Train doors', 252, 230, 70, 162, '', 10);
    } else {
      s += hot('train-doors', 'Train doors', 152, 300, 70, 90, '', 10) + hot('train-doors', 'Train doors', 254, 300, 70, 90, '', 10);
    }
    // platform floor
    s += po('0,394 400,394 400,500 0,500', K('#6d7592')) + r(0, 394, 400, 8, 0, K(P.taxi)) + r(0, 402, 400, 5, 0, K('#8a92ad'));
    for (var t = 0; t < 26; t++) s += ci(8 + t * 15.5, 412, 1.8, K('#4b5373'));
    for (var f = 0; f < 6; f++) s += ln('M' + (f * 80) + ',420 L' + (f * 80 - 30) + ',500', '#fff', 1.2, 'opacity=".12"');
    // pillar
    s += r(342, 60, 40, 440, 0, K('#4a557a')) + r(342, 60, 6, 440, 0, '#fff', 'opacity=".07"');
    // board
    s += '<g transform="translate(0,66)">';
    var bd = cables(c, [120, 280], 50, 76) + r(78, 74, 244, 82, 12, '#080d1e') + r(78, 74, 244, 82, 12, 'none', 'stroke="#4a557a" stroke-width="3"');
    bd += tx(96, 97, 'Lähtevät', 15, P.cloudberry, { a: 'start' });
    bd += ci(300, 90, 3, c.lit ? P.aurora : P.aurora) ;
    var rows = [['I', 'Helsinki', '2 min', P.aurora, 122], ['P', 'Helsinki', '6 min', P.lingon, 144]];
    for (var q = 0; q < 2; q++) {
      var rw = rows[q];
      bd += ci(100, rw[4] - 4, 9, rw[3]) + tx(100, rw[4], rw[0], 13, '#0b1230') + tx(122, rw[4], rw[1], 14, '#fff', { a: 'start', cls: 'la-led' }) + tx(304, rw[4], rw[2], 14, '#ffb347', { a: 'end', cls: 'la-led' });
    }
    s += hot('board', 'Departure board Lähtevät: I Helsinki 2 min, P Helsinki 6 min', 72, 68, 256, 94, bd, 14) + '</g>';
    // passenger
    s += hot('passenger', 'Fellow passenger', 48, 296, 90, 140, person(c, { x: 92, y: 432, s: 1.4, skin: SK[1], shirt: '#2f9e6e', pants: '#243257', hair: '#1c1410', pack: P.cloudberry, hairLong: true, big: true }), 14);
    return wrap(c, 'Underground train platform with a departure board and a red and white commuter train', s);
  };

  /* ---- shared interior bits for rides ---- */
  function windowTrain(c) {
    var K = c.k, I = c.I;
    var far = pa(hillsD(212, 10, 1, 0.4, 330), K('#8cc5a8'));
    var mid = '<g>' + pa(hillsD(250, 6, 2, 1.3, 330), K('#5aa387')) + treeLine(c, 262, 11, 9, 40, 70, null, 'mix') + '</g>';
    var near = '<g>' + r(0, 284, 400, 60, 0, K('#3d8b5c')) + r(0, 300, 400, 6, 0, K('#2f7048')) ;
    for (var p = 0; p < 4; p++) near += r(30 + p * 100, 214, 5, 90, 2, K('#3a2f2b')) + r(14 + p * 100, 220, 37, 4, 2, K('#3a2f2b'));
    near += ln('M0,230 Q50,250 100,230 T200,230 T300,230 T400,230', K('#3a2f2b'), 1.6) + '</g>';
    return scroll(80, far) + scroll(26, mid) + scroll(7, near, 1.5);
  }

  /* ---- train-ride ---- */
  S['train-ride'] = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', hel = st === 'helsinki';
    s += r(0, 0, 400, 500, 0, K('#e3ddd0'));
    s += r(0, 0, 400, 62, 0, K('#cbc4b4')) + r(0, 62, 400, 4, 0, K('#b3ab9a'));
    s += r(0, 400, 400, 100, 0, K('#8a8f9e'));
    for (var p = 0; p < 8; p++) s += r(p * 52, 66, 2, 334, 0, '#fff', 'opacity=".35"');
    // window
    s += r(40, 170, 214, 160, 28, K('#f6f2e8'));
    s += sky(c, { x: 50, y: 180, w: 194, h: 140, r: 20, uid: 'win', sun: { x: 190, y: 200, r: 18 }, inner: windowTrain(c) });
    s += pa('M60,190 L130,190 L70,260Z', '#fff', 'opacity=".13"');
    s += r(40, 322, 214, 14, 7, K('#d8d1c0'));
    // door
    s += r(268, 124, 100, 300, 12, K('#cfc8b8'));
    s += r(274, 130, 44, 290, 6, K(P.lingon)) + r(320, 130, 44, 290, 6, K(P.lingon));
    s += r(280, 140, 32, 130, 6, c.lit ? WARM : K('#bfe0f5')) + r(326, 140, 32, 130, 6, c.lit ? WARM : K('#bfe0f5'));
    s += r(312, 290, 8, 40, 4, '#fff', 'opacity=".7"') + r(274, 352, 90, 6, 0, K('#fff'), 'opacity=".5"');
    s += r(268, 124, 100, 10, 5, K('#b92b40'));
    // exit button (red, glowing)
    var btn = '<g class="la-anim la-glow">' + ci(260, 232, 26, P.lingon, 'opacity=".28"') + '</g>' + r(236, 218, 48, 28, 14, P.lingon) + r(236, 218, 48, 10, 5, '#fff', 'opacity=".18"') + tx(260, 237, 'Exit', 14, '#fff');
    s += r(256, 130, 8, 290, 0, K('#b3ab9a'), 'opacity="0"');
    s += hot('exit-door', 'Exit button by the door', 228, 208, 64, 48, btn, 16);
    // seats foreground
    // display
    s += r(84, 124, 232, 38, 10, '#0a0f1e') + r(84, 124, 232, 38, 10, 'none', 'stroke="#59657d" stroke-width="3"');
    var txt = 'Seuraava asema: ' + (hel ? 'Helsinki' : 'Pasila');
    s += tx(200, 149, txt, fit(txt, 214, 15), '#ffb347', { cls: 'la-led la-anim la-blink' });
    s += r(20, 372, 170, 140, 28, K('#2a4f9a')) + r(210, 372, 170, 140, 28, K('#2a4f9a'));
    for (var d = 0; d < 20; d++) s += ci(40 + (d % 10) * 15, 396 + Math.floor(d / 10) * 30, 2.4, '#fff', 'opacity=".25"') + ci(230 + (d % 10) * 15, 396 + Math.floor(d / 10) * 30, 2.4, '#fff', 'opacity=".25"');
    s += r(20, 372, 170, 18, 9, K('#3a64b8')) + r(210, 372, 170, 18, 9, K('#3a64b8'));
    s += shadowL(60, 372, 120, 10, 0.1);
    return wrap(c, 'Train interior seen from your seat: a window with birches rushing past and a display Seuraava asema', s);
  };

  /* ---- bus-stop ---- */
  S['bus-stop'] = function (c) {
    var K = c.k; c.ind = false; var s = '';
    var hz = 168;
    s += sky(c, { sun: { x: 80, y: 80, r: 20 }, h: hz });
    var rg = rng(5);
    for (var b = 0; b < 9; b++) { var bw = 28 + rg() * 26, bh = 24 + rg() * 40; s += r(b * 46 - 6, hz - bh, bw, bh, 3, K(['#a7b6cd', '#b9a7c7', '#c9b5a2', '#9fb7b0'][b % 4])); }
    s += pa(hillsD(hz, 6, 2, 1, 176), K('#6fb08f'));
    s += treeLine(c, hz + 6, 21, 8, 36, 64, null, 'mix');
    // road across the middle
    s += r(0, hz, 400, 334, 0, K('#4a5164'));
    s += r(0, hz, 400, 8, 0, K('#8b92a5'));
    // bay lines between the three buses
    var seps = [209, 279];
    for (var l = 0; l < 2; l++) s += ln('M20,' + seps[l] + ' H380', '#fff', 2, 'opacity=".3" stroke-dasharray="14 10"');
    // buses, far to near, in perspective (smaller and higher = further away)
    var buses = [
      ['bus-1', '600 Rautatientori', 285, 198, 0.5, 0, 'Bus 600 Rautatientori'],
      ['bus-2', 'Tikkurila', 266, 267.5, 0.58, 0.25, 'Bus Tikkurila'],
      ['bus-3', 'Kerava', 247, 345, 0.66, 0.5, 'Bus Kerava']
    ];
    for (var i = 0; i < 3; i++) {
      var bb = buses[i], sc = bb[4], dest = bb[1];
      // big destination display over the window band, readable at a glance
      var big = '<g transform="translate(' + bb[2] + ',' + bb[3] + ') scale(' + sc + ')">' + r(-84, -78, 196, 36, 8, '#0a0f1e') + tx(14, -52, dest, fit(dest, 184, 25), '#ffb347', { cls: 'la-led' }) + '</g>';
      var inner = '<g class="la-anim la-bus-in" style="animation-delay:' + bb[5] + 's">' + bus(c, bb[2], bb[3], sc, dest, '#2f6fe0') + big + '</g>';
      s += hot(bb[0], bb[6], bb[2] - 124 * sc, bb[3] - 94 * sc, 248 * sc, 108 * sc, inner, 12);
    }
    // sidewalk
    s += r(0, 356, 400, 144, 0, K('#8d93a6')) + r(0, 356, 400, 6, 0, K('#a9aebf'));
    // covered shelter, foreground left
    s += shadowL(40, 354, 100, 8, 0.14);
    s += r(50, 296, 4, 58, 1, K('#59657d')) + r(124, 296, 4, 58, 1, K('#59657d'));
    s += r(54, 304, 70, 44, 2, K('#bcd9ee'), 'opacity=".55"') + r(54, 304, 70, 44, 2, 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="1.5"');
    s += r(60, 336, 58, 6, 2, K('#59657d')) + r(60, 342, 3, 10, 1, K('#59657d')) + r(115, 342, 3, 10, 1, K('#59657d'));
    s += r(40, 282, 100, 14, 5, K(P.fjord)) + r(40, 282, 100, 4, 2, '#fff', 'opacity=".25"') + tx(90, 293, 'pysäkki', 11, '#fff');
    return wrap(c, 'Bus stop outside the terminal: a covered shelter and three blue buses lined up in perspective, 600 Rautatientori, Tikkurila and Kerava', s);
  };

  /* ---- bus-ride ---- */
  function windowBus(c) {
    var K = c.k, rg = rng(3), far = '';
    for (var b = 0; b < 8; b++) { var bw = 30 + rg() * 20, bh = 40 + rg() * 60; far += r(b * 50 + 4, 330 - bh, bw, bh, 3, K(['#a7b6cd', '#b9a7c7', '#c9b5a2', '#9fb7b0'][b % 4])); for (var w = 0; w < 3; w++) far += r(b * 50 + 10, 330 - bh + 8 + w * 14, 8, 6, 1.5, c.lit ? WARM : '#fff', 'opacity=".6"'); }
    var mid = treeLine(c, 300, 14, 8, 46, 78, null, 'mix') + r(0, 296, 400, 40, 0, K('#4a5164')) + r(0, 296, 400, 5, 0, K('#8b92a5'));
    var near = r(0, 312, 400, 30, 0, K('#3b4256'));
    for (var p = 0; p < 4; p++) near += r(40 + p * 100, 200, 5, 112, 2, K('#59657d')) + r(40 + p * 100, 200, 22, 5, 2, K('#59657d')) + ci(62 + p * 100, 210, 5, c.lit ? WARM : '#fff6c8');
    return scroll(70, far) + scroll(24, mid) + scroll(8, near, 2);
  }
  S['bus-ride'] = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '';
    var stopping = st === 'stopping' || st === 'stopped' || st === 'pressed';
    var rt = stopping || st === 'rautatientori' || st === 'helsinki';
    s += r(0, 0, 400, 500, 0, K('#dfe6ee'));
    s += r(0, 0, 400, 60, 0, K('#c4cddb')) + r(0, 400, 400, 100, 0, K('#6b7388'));
    s += r(0, 56, 400, 7, 3, K(P.taxi)) + r(0, 60, 400, 3, 0, '#000', 'opacity=".08"');
    // window
    s += r(34, 176, 270, 154, 20, K('#f4f6fa'));
    s += sky(c, { x: 44, y: 186, w: 250, h: 134, r: 14, uid: 'win', sun: { x: 90, y: 190, r: 16 }, inner: windowBus(c) });
    s += pa('M54,196 L140,196 L66,270Z', '#fff', 'opacity=".13"') + r(34, 322, 270, 14, 7, K('#c8d0de'));
    // display
    s += r(84, 128, 232, 36, 10, '#0a0f1e') + r(84, 128, 232, 36, 10, 'none', 'stroke="#59657d" stroke-width="3"');
    var txt = 'Seuraava pysäkki: ' + (rt ? 'Rautatientori' : 'Kamppi');
    s += tx(200, 151, txt, fit(txt, 214, 14), '#ffb347', { cls: 'la-led la-anim la-blink' });
    if (stopping) s += r(150, 168, 100, 20, 10, P.lingon) + tx(200, 182, 'Pysähtyy', 12, '#fff');
    // pole + button
    s += r(322, 64, 9, 400, 4, K(P.taxi)) + r(324, 64, 2, 400, 1, '#fff', 'opacity=".5"');
    var bt = (stopping ? '<g class="la-anim la-glow">' + ci(326, 270, 34, P.taxi, 'opacity=".45"') + '</g>' : '<g class="la-anim la-glow">' + ci(326, 270, 28, P.lingon, 'opacity=".25"') + '</g>') +
      r(302, 244, 48, 52, 12, K('#2b3347')) + ci(326, 270, 17, stopping ? '#ff7a8c' : P.lingon) + ci(321, 265, 5, '#fff', 'opacity=".4"') + tx(326, 292, 'STOP', 9, '#fff');
    s += hot('stop-button', 'STOP button', 294, 232, 64, 74, bt, 14);
    // handrail + seats
    s += ln('M0,128 H34', K(P.taxi), 5) ;
    s += r(18, 376, 180, 140, 30, K(P.fjord)) + r(212, 376, 120, 140, 30, K(P.fjord));
    s += r(18, 376, 180, 20, 10, K('#3a64b8')) + r(212, 376, 120, 20, 10, K('#3a64b8'));
    for (var d = 0; d < 12; d++) s += ci(40 + (d % 6) * 28, 420 + Math.floor(d / 6) * 30, 3, '#fff', 'opacity=".22"');
    return wrap(c, 'Bus interior with a window onto the city edge and birches, a Seuraava pysäkki display and a red STOP button', s);
  };

  /* ---- taxi-rank ---- */
  S['taxi-rank'] = function (c) {
    var K = c.k; c.ind = false; var s = '';
    s += '<g transform="translate(0,-40)">' + sky(c, { sun: { x: 300, y: 130, r: 22 }, y: -40, h: 340 });
    var rg = rng(9);
    for (var b = 0; b < 8; b++) { var bw = 40 + rg() * 24, bh = 50 + rg() * 60; s += r(b * 52 - 8, 300 - bh, bw, bh, 4, K(['#c9b5a2', '#b9a7c7', '#a7b6cd', '#d7c7a8'][b % 4])); for (var w = 0; w < 4; w++) s += r(b * 52 - 2, 300 - bh + 10 + w * 14, bw - 12, 7, 2, c.lit ? WARM : '#fff', 'opacity=".55"'); }
    s += pa(hillsD(304, 5, 2, 0.4, 320), K('#6fb08f'));
    s += birch(c, 54, 330, 120) + birch(c, 350, 326, 110) + pine(c, 372, 330, 80);
    s += r(0, 316, 400, 230, 0, K('#4a5164')) + r(0, 316, 400, 16, 0, K('#9aa0b3')) + r(0, 330, 400, 3, 0, K('#7b8296'));
    for (var m = 0; m < 6; m++) s += r(10 + m * 70, 366, 38, 3, 1.5, '#fff', 'opacity=".28"');
    s += car(c, 118, 352, 0.5, '#3b4256') + car(c, 250, 372, 0.64, P.fjord) + '</g>';
    s += r(0, 428, 400, 72, 0, K('#8d93a6'));
    var fg = car(c, 204, 414, 1.45, '#f6f1e7', true);
    s += hot('driver', 'Taxi driver', 130, 300, 100, 100, fg, 14);
    return wrap(c, 'Taxi rank: a line of cars with yellow TAXI roof signs and a friendly driver leaning out of the window', s);
  };

  /* ---- taxi-ride ---- */
  S['taxi-ride'] = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', paid = st === 'paid' || st === 'done';
    s += r(0, 0, 400, 500, 0, K('#20263c'));
    // windshield
    var ins = '';
    var far = pa(hillsD(246, 8, 1, 0.8, 340), K('#8cc5a8'));
    var trees = treeLine(c, 262, 31, 10, 30, 58, null, 'mix') + r(0, 258, 400, 20, 0, K('#4c9b70'));
    var tower = '<g class="la-anim la-grow">' + r(228, 188, 10, 48, 1, K('#b9b3a8')) + po('226,188 240,188 233,176', K('#5c8a7b')) + ci(233, 200, 3.4, '#fff') + r(212, 220, 44, 20, 2, K('#b9b3a8')) + r(216, 224, 6, 8, 3, c.lit ? WARM : K('#7a7a78')) + r(248, 224, 6, 8, 3, c.lit ? WARM : K('#7a7a78')) + '</g>';
    var road = po('190,248 210,248 360,340 40,340', K('#4a5164')) + po('190,248 192,248 70,340 40,340', K('#3b4256'), 'opacity=".5"') + ln('M200,248 V340', '#fff', 3, 'opacity=".85" class="la-anim la-road" stroke-dasharray="9 13"') + ln('M190,248 L40,340', '#fff', 2, 'opacity=".4"') + ln('M210,248 L360,340', '#fff', 2, 'opacity=".4"');
    ins = scroll(70, far) + tower + scroll(18, trees) + r(0, 276, 400, 70, 0, K('#4c9b70')) + road;
    s += sky(c, { x: 50, y: 100, w: 300, h: 240, r: 60, uid: 'ws', sun: { x: 120, y: 170, r: 20 }, inner: ins });
    s += pa('M50,340 L50,160 Q50,100 110,100 L110,100 L60,100 Q40,110 38,160 L36,340Z', K('#10142a'), 'opacity="0"');
    s += pa('M0,0 H400 V100 H0Z', K('#181d33')) + pa('M0,100 H62 Q50,106 46,140 L40,350 H0Z', K('#181d33')) + pa('M400,100 H338 Q350,106 354,140 L360,350 H400Z', K('#181d33'));
    s += r(172, 104, 56, 18, 8, K('#2a3150')) + r(176, 108, 48, 10, 5, K('#7d8cb3'), 'opacity=".6"');
    // seats
    s += r(0, 336, 400, 164, 0, K('#10142a'));
    s += r(70, 310, 130, 200, 40, K('#262c47')) + r(214, 310, 130, 200, 40, K('#262c47'));
    s += r(92, 300, 86, 54, 24, K('#303860')) + r(236, 300, 86, 54, 24, K('#303860'));
    s += ci(135, 286, 22, K('#2a2018')) + ci(135, 290, 18, K('#33261c')) + r(113, 292, 44, 12, 6, K('#303860'), 'opacity=".0"');
    s += ci(114, 291, 4, K(SK[1])) ;
    // card terminal
    var term = r(258, 344, 62, 86, 12, K('#e9edf5')) + r(258, 344, 62, 86, 12, 'none', 'stroke="#fff" stroke-opacity=".3" stroke-width="1"') + r(264, 352, 50, 32, 6, paid ? P.aurora : '#13245c');
    if (paid) term += icon('check', 289, 368, 22, '#0b3b2c');
    else term += icon('contactless', 289, 368, 20, '#fff');
    term += r(268, 394, 12, 7, 2, '#a7b0c6') + r(284, 394, 12, 7, 2, '#a7b0c6') + r(300, 394, 12, 7, 2, '#a7b0c6') + r(268, 406, 12, 7, 2, '#a7b0c6') + r(284, 406, 12, 7, 2, '#a7b0c6') + r(300, 406, 12, 7, 2, P.aurora);
    if (!paid) term = '<g class="la-anim la-contact" style="transform-origin:289px 387px">' + ci(289, 387, 48, P.cloudberry, 'opacity=".16"') + '</g>' + term;
    s += '<g transform="translate(0,-46)">' + hot('card-terminal', 'Card terminal on the seat back', 250, 336, 78, 102, term, 14) + '</g>';
    return wrap(c, 'Back seat of a taxi looking forward through the windshield at the road and birches, with the station clock tower ahead and a card terminal on the seat back', s);
  };

  /* ---- central (hero) ---- */
  S.central = function (c) {
    var K = c.k, st = c.st; c.ind = false; var s = '';
    var glow = c.lit || st === 'lanterns' || st === 'glow' || st === 'lit';
    s += sky(c, { sun: { x: 300, y: 120, r: 24 }, h: 420 });
    // distant skyline
    var rg = rng(17);
    for (var b = 0; b < 7; b++) { var bw = 36 + rg() * 20, bh = 20 + rg() * 30; s += r(110 + b * 42, 330 - bh, bw, bh, 3, K(['#a9a39a', '#9aa3b0', '#b3a89a'][b % 3]), 'opacity=".7"'); }
    // tower
    var gr = K(P.granite), grd = K(shade(P.granite, -0.14)), grl = K(shade(P.granite, 0.2));
    s += pa('M52,410 V150 H104 V410Z', gr) + r(88, 150, 16, 260, 0, grd, 'opacity=".55"') + r(48, 144, 60, 10, 3, grl) + r(46, 238, 64, 8, 3, grl);
    s += po('56,144 100,144 78,72', K('#5c8a7b')) + pa('M56,144 Q78,126 100,144Z', K('#4a7568')) + ci(78, 68, 3, K(P.taxi));
    var cx = 78, cy = 188, hrs = { morning: [8, 10], day: [12, 0], evening: [18, 30], night: [22, 5] }[c.t];
    s += ci(cx, cy, 18, K('#f6f1e7')) + ci(cx, cy, 18, 'none', 'stroke="' + K('#59564f') + '" stroke-width="2"');
    for (var tk = 0; tk < 12; tk++) { var a = tk * Math.PI / 6; s += ln('M' + n(cx + Math.sin(a) * 14.5) + ',' + n(cy - Math.cos(a) * 14.5) + ' L' + n(cx + Math.sin(a) * 16.5) + ',' + n(cy - Math.cos(a) * 16.5), K('#59564f'), 1.1); }
    var ha = ((hrs[0] % 12) + hrs[1] / 60) * Math.PI / 6, ma = hrs[1] * Math.PI / 30;
    s += ln('M' + cx + ',' + cy + ' L' + n(cx + Math.sin(ha) * 9) + ',' + n(cy - Math.cos(ha) * 9), K(P.ink), 2.4) + ln('M' + cx + ',' + cy + ' L' + n(cx + Math.sin(ma) * 13) + ',' + n(cy - Math.cos(ma) * 13), K(P.ink), 1.6) + ci(cx, cy, 1.6, K(P.lingon));
    for (var tw = 0; tw < 3; tw++) s += r(68, 262 + tw * 44, 20, 28, 10, glow ? WARM : K('#7fa0c0'));
    // main block
    s += r(104, 192, 296, 218, 0, gr) + r(104, 192, 296, 14, 0, grl) + r(104, 384, 296, 26, 0, grd, 'opacity=".5"');
    for (var ry = 0; ry < 12; ry++) s += r(104, 206 + ry * 15, 296, 1.2, 0, K('#6e6a62'), 'opacity=".12"');
    s += po('96,194 400,194 400,174 108,174', K('#5c8a7b')) + r(96, 192, 304, 5, 0, K('#4a7568'));
    // windows
    var wins = [112, 128, 362, 380];
    for (var w = 0; w < wins.length; w++) {
      s += pa('M' + wins[w] + ',286 V262 A7,7 0 0 1 ' + (wins[w] + 14) + ',262 V286Z', glow ? WARM : K('#7fa0c0'));
      s += r(wins[w], 342, 14, 30, 3, glow ? WARM : K('#7fa0c0'));
    }
    // name plate
    s += r(138, 206, 204, 26, 6, K('#4d4b47')) + tx(240, 224, 'Helsingin päärautatieasema', fit('Helsingin päärautatieasema', 190, 12.5), '#f3ecd6');
    // arch
    s += pa('M180,410 V300 A60,66 0 0 1 300,300 V410Z', grl) + pa('M190,410 V300 A50,56 0 0 1 290,300 V410Z', glow ? '#f6b14e' : K('#3b3a40'));
    s += '<defs><radialGradient id="' + c.I('archg') + '" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#fff2c4"/><stop offset="1" stop-color="#f4a53a"/></radialGradient></defs>';
    s += pa('M190,410 V300 A50,56 0 0 1 290,300 V410Z', 'url(#' + c.I('archg') + ')', 'opacity="' + (glow ? 1 : 0.22) + '"');
    for (var ar = 0; ar < 4; ar++) s += r(206 + ar * 20, 300, 3, 110, 1, K('#6e6a62'), 'opacity=".5"');
    s += r(190, 304, 100, 3, 0, K('#6e6a62'), 'opacity=".4"');
    s += pa('M180,300 A60,66 0 0 1 300,300', 'none', 'stroke="' + grd + '" stroke-width="3"');
    // people in doorway
    s += person(c, { x: 232, y: 408, s: 0.5, skin: SK[2], shirt: P.fjord, noShadow: true }) + person(c, { x: 252, y: 408, s: 0.45, skin: SK[0], shirt: P.lingon, noShadow: true });
    // statues with lanterns
    var stat = '';
    var pos = [148, 170, 310, 332];
    for (var q = 0; q < 4; q++) {
      var px = pos[q];
      stat += r(px - 13, 336, 26, 18, 3, grl) + r(px - 15, 352, 30, 6, 2, grd);
      stat += r(px - 10, 280, 20, 58, 10, K('#8d877c')) + r(px + 3, 284, 6, 52, 3, K('#767068'), 'opacity=".6"') + ci(px, 270, 8.5, K('#9a9488'));
      stat += ln('M' + (px - 8) + ',298 L' + (px - 4) + ',310 M' + (px + 8) + ',298 L' + (px + 4) + ',310', K('#8d877c'), 5);
      if (glow) stat += '<g class="la-anim la-lantern" style="animation-delay:-' + q * 0.7 + 's">' + ci(px, 312, 26, '#ffd27a', 'opacity=".28"') + ci(px, 312, 15, '#ffe9a6', 'opacity=".4"') + '</g>' + ci(px, 312, 8.5, '#fff3c4');
      else stat += ci(px, 312, 8.5, K('#e9e2c9')) + ci(px - 2.5, 309.5, 2.6, '#fff', 'opacity=".7"');
      stat += r(px - 2, 302, 4, 3, 1, K('#6e6a62'));
    }
    s += hot('lanterns', 'The Lantern Carriers statues', 130, 252, 220, 108, stat, 14);
    // square
    s += r(0, 410, 400, 90, 0, K('#a8a399')) + r(0, 410, 400, 8, 0, K('#8d877c'));
    for (var cb = 0; cb < 8; cb++) s += ln('M' + (cb * 56 - 20) + ',500 L' + (cb * 28 + 90) + ',418', '#7e7a70', 1.2, 'opacity=".22"');
    for (var cr = 0; cr < 4; cr++) s += ln('M0,' + (432 + cr * 18) + ' H400', '#7e7a70', 1.2, 'opacity=".2"');
    s += pa('M52,410 L104,410 L260,470 L208,470Z', P.night, 'opacity=".12"');
    s += ln('M0,446 H400', K('#6b6f7b'), 2) + ln('M0,456 H400', K('#6b6f7b'), 2);
    // tram
    var tram = '<g class="la-anim la-tram" style="animation-delay:-7s">';
    tram += el(95, 458, 100, 4, P.night, 'opacity=".2"');
    tram += r(0, 408, 190, 46, 14, K('#f7f9fa')) + r(0, 434, 190, 14, 0, K('#2f9e6e')) + r(0, 446, 190, 8, 4, K('#2f9e6e'));
    for (var tw2 = 0; tw2 < 6; tw2++) tram += r(10 + tw2 * 30, 414, 24, 18, 5, c.lit ? WARM : K('#27375e'));
    tram += r(176, 410, 12, 24, 5, K('#27375e')) + ln('M90,408 L102,394 H130', K('#59657d'), 2.2) + ci(24, 454, 6, K(P.ink)) + ci(160, 454, 6, K(P.ink)) + ci(188, 440, 2.4, c.lit ? WARM : '#fff6c8');
    s += tram + '</g>';
    // people on the square
    s += person(c, { x: 290, y: 492, s: 0.62, skin: SK[3], shirt: P.cloudberry, pack: P.pine }) + person(c, { x: 330, y: 488, s: 0.56, skin: SK[0], shirt: P.aurora2, hairLong: true, hair: '#c79a4b' }) + person(c, { x: 78, y: 492, s: 0.6, skin: SK[1], shirt: '#2f9e6e', hair: '#1c1410' });
    s += birch(c, 34, 436, 130) + birch(c, 372, 440, 110);
    return wrap(c, 'Helsinki Central Station: granite facade, clock tower, arched entrance with stone figures holding lanterns and a green and white tram', s);
  };

  /* ---- kiosk ---- */
  S.kiosk = function (c) {
    var K = c.k; c.ind = true; var s = '';
    s += r(0, 0, 400, 500, 0, K('#f1e6d0'));
    for (var t = 0; t < 8; t++) s += r(t * 52, 0, 26, 436, 0, '#fff', 'opacity=".18"');
    s += r(0, 430, 400, 70, 0, K('#c9bfae'));
    for (var cb = 0; cb < 14; cb++) for (var rr2 = 0; rr2 < 3; rr2++) if ((cb + rr2) % 2) s += r(cb * 30, 436 + rr2 * 22, 30, 22, 0, '#fff', 'opacity=".3"');
    // sign
    s += cables(c, [120, 280], 0, 72) + r(100, 66, 200, 44, 14, K(P.fjord)) + r(104, 70, 192, 36, 11, 'none', 'stroke="' + P.cloudberry + '" stroke-width="3"') + tx(200, 98, 'Kioski', 28, '#fff');
    // shelves of snacks
    s += r(40, 126, 320, 6, 3, K('#a98456')) + r(40, 168, 320, 6, 3, K('#a98456'));
    s += snacks(c, 44, 126, 312, 4) + snacks(c, 44, 168, 312, 8);
    // fridge
    s += r(56, 188, 288, 252, 18, K('#d5dbe6')) + r(62, 196, 276, 236, 12, K('#eaf6fc'));
    s += '<defs>' + gradDef(c.I('fr'), ['#d3ecfa', '#f3fafe']) + '</defs>' + r(62, 196, 276, 236, 12, 'url(#' + c.I('fr') + ')');
    s += r(62, 196, 276, 10, 5, c.lit ? '#ffffff' : '#f3fafe') + r(62, 196, 276, 6, 3, '#fff');
    s += r(62, 336, 276, 8, 0, K('#bcc8d8')) + r(62, 432 - 6, 276, 6, 0, K('#bcc8d8'));
    var cols = [['bottle-sparkling', 'sparkling', 'hiilihapollinen', 112, 'Sparkling water bottle, hiilihapollinen'], ['bottle-still', 'still', 'hiilihapoton', 200, 'Still water bottle, hiilihapoton'], ['bottle-juice', 'juice', 'mehu', 288, 'Juice bottle, mehu']];
    for (var i = 0; i < 3; i++) {
      var cc = cols[i];
      var inner = bottle(c, cc[1], cc[3], 332, 1.12) + r(cc[3] - 40, 344, 80, 24, 6, '#fff') + tx(cc[3], 360, cc[2], fit(cc[2], 74, 13), P.ink);
      s += hot(cc[0], cc[4], cc[3] - 44, 218, 88, 154, inner, 12);
    }
    s += r(62, 196, 276, 236, 12, 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="2"') + ln('M156,198 V430 M244,198 V430', K('#9fb0c6'), 3) + r(148, 280, 4, 50, 2, K('#8b99ae')) + r(160, 280, 4, 50, 2, K('#8b99ae')) + r(236, 280, 4, 50, 2, K('#8b99ae')) + r(248, 280, 4, 50, 2, K('#8b99ae'));
    s += pa('M70,200 L120,200 L70,260Z', '#fff', 'opacity=".28"');
    s += r(56, 436, 288, 8, 4, K('#9aa6b8'));
    return wrap(c, 'Kioski: a fridge with three bottles, hiilihapollinen, hiilihapoton and mehu', s);
  };

  /* ---- checkout ---- */
  S.checkout = function (c) {
    var K = c.k, st = c.st; c.ind = true; var s = '', done = st === 'done';
    s += r(0, 0, 400, 500, 0, K('#ebe3d2'));
    for (var t = 0; t < 8; t++) s += r(t * 52, 0, 26, 346, 0, '#fff', 'opacity=".16"');
    s += r(40, 92, 320, 6, 3, K('#a98456')) + r(40, 146, 320, 6, 3, K('#a98456')) + r(40, 200, 320, 6, 3, K('#a98456'));
    s += snacks(c, 44, 92, 312, 12) + snacks(c, 44, 146, 312, 5) + snacks(c, 44, 200, 312, 15);
    
    // cashier
    s += person(c, { x: 150, y: 414, s: 1.65, skin: SK[1], shirt: P.lingon, hair: '#2b1d16', apron: true, pose: 'bust', big: true, hairLong: true });
    // till
    s += r(256, 292, 90, 62, 10, K('#2b3347')) + r(264, 300, 74, 30, 6, c.lit ? '#bfe3ff' : '#cfe8ff') + r(268, 304, 40, 4, 2, '#7fa6d6') + r(268, 312, 28, 4, 2, '#7fa6d6') + r(288, 336, 50, 6, 3, K('#59657d'));
    // counter
    s += r(20, 346, 360, 22, 8, K('#e2b57a')) + r(20, 346, 360, 6, 3, '#fff', 'opacity=".3"') + r(20, 366, 360, 140, 0, K('#2a4f9a'));
    s += r(20, 366, 360, 8, 0, K('#1f3d7a'));
    for (var p = 0; p < 6; p++) s += r(48 + p * 62, 392, 34, 76, 8, '#fff', 'opacity=".07"');
    // bottle
    s += bottle(c, 'still', 204, 346, 0.82);
    // terminal
    var term = '<g transform="rotate(-8 108 340)">' + r(78, 306, 60, 40, 10, K('#e9edf5')) + r(84, 312, 48, 18, 5, '#13245c') + icon('contactless', 108, 321, 14, '#fff') + r(84, 334, 10, 5, 2, '#a7b0c6') + r(98, 334, 10, 5, 2, '#a7b0c6') + r(112, 334, 10, 5, 2, P.aurora) + '</g>';
    term = '<g class="la-anim la-contact" style="transform-origin:108px 326px">' + ci(108, 326, 46, P.cloudberry, 'opacity=".14"') + '</g>' + term;
    s += hot('card-terminal', 'Card terminal', 64, 296, 90, 62, term, 14);
    if (done) s += '<g class="la-anim la-ticket">' + r(298, 346, 34, 70, 2, '#fff', 'transform="rotate(4 315 380)"') + '</g>' + '<g transform="rotate(4 315 380)">' + r(304, 360, 22, 2, 1, '#c8cfdc') + r(304, 368, 16, 2, 1, '#c8cfdc') + r(304, 376, 20, 2, 1, '#c8cfdc') + r(304, 388, 22, 2, 1, '#c8cfdc') + '</g>';
    return wrap(c, 'Shop till seen from the customer side: a cashier, your water bottle on the counter and a card terminal', s);
  };

  /* ---- postcard ---- */
  S.postcard = function (c) {
    var K = c.k; c.ind = false; var s = '';
    s += '<defs>' + gradDef(c.I('wood'), ['#b57a45', '#9c6636']) + '</defs>' + r(0, 0, 400, 500, 0, 'url(#' + c.I('wood') + ')');
    for (var pl = 0; pl < 9; pl++) s += r(0, pl * 58, 400, 2.5, 0, '#5a361a', 'opacity=".35"') + ln('M' + (pl * 41 % 300) + ',' + (pl * 58 + 20) + ' q60,-8 120,2', '#5a361a', 1.4, 'opacity=".18"');
    s += r(0, 0, 400, 500, 0, P.night, 'opacity="' + (c.t === 'night' ? 0.35 : c.t === 'evening' ? 0.14 : 0) + '"');
    // front card
    var front = '<g transform="rotate(-4 170 150)">' + r(54, 78, 252, 168, 8, '#000', 'opacity=".18" transform="translate(4,6)"') + r(50, 74, 252, 168, 8, '#fffdf6');
    front += sky(c, { x: 58, y: 82, w: 236, h: 152, r: 4, uid: 'card', sun: { x: 250, y: 120, r: 16 }, clouds: false, inner: pa(hillsD(196, 5, 1, 0.3, 240).replace(/L400/g, 'L400'), K('#6fb08f'), 'transform="scale(.6,1) translate(100,0)"') + r(58, 200, 236, 34, 0, K('#4c9b70')) + birch(c, 84, 210, 70) + birch(c, 104, 214, 52) + pine(c, 268, 212, 62) + r(150, 150, 14, 60, 1, K('#b9b3a8')) + po('148,150 166,150 157,134', K('#5c8a7b')) + r(166, 176, 56, 34, 2, K('#b9b3a8')) + pa('M180,210 V196 A8,9 0 0 1 196,196 V210Z', c.lit ? WARM : K('#3b3a40')) + ci(157, 160, 4, '#fff') + '<g transform="translate(220,128) scale(.4)">' + pa('M-30,0 L30,0 L30,-12 Q30,-16 24,-16 L-24,-16 Q-30,-16 -30,-8Z', '#fff') + '</g>' });
    front += r(110, 206, 132, 22, 11, P.cloudberry) + tx(176, 222, 'Helsinki', 14, P.ink);
    front += r(40, 96, 34, 14, 2, P.taxi, 'opacity=".75" transform="rotate(-28 57 103)"') + '</g>';
    s += front;
    // back card
    var back = '<g transform="rotate(3 190 350)">' + r(66, 274, 252, 160, 8, '#000', 'opacity=".2" transform="translate(4,6)"') + r(62, 270, 252, 160, 8, '#fbf3df');
    back += ln('M188,284 V418', '#cdbf9c', 1.5) + tx(78, 308, 'Terveisiä', 23, P.fjord, { a: 'start', cls: 'la-hand', e: 'transform="rotate(-3 78 308)"' }) + tx(78, 336, 'Suomesta!', 23, P.fjord, { a: 'start', cls: 'la-hand', e: 'transform="rotate(-3 78 336)"' });
    back += ln('M80,346 q20,6 50,0 t66,0', P.lingon, 2) ;
    back += r(78, 360, 96, 2, 1, '#cdbf9c') + r(78, 376, 80, 2, 1, '#cdbf9c') + r(78, 392, 90, 2, 1, '#cdbf9c');
    back += r(278, 280, 28, 34, 3, '#fff') + r(281, 283, 22, 28, 2, P.fjord) + pa('M283,308 L292,290 L301,308Z', P.pine);
    back += r(198, 330, 100, 2, 1, '#cdbf9c') + r(198, 346, 100, 2, 1, '#cdbf9c');
    var stm = function (x, y, rot, col, l1, l2, fs) {
      return '<g transform="rotate(' + rot + ' ' + x + ' ' + y + ')" opacity=".9">' + ci(x, y, 24, 'none', 'stroke="' + col + '" stroke-width="2.5"') + ci(x, y, 20, 'none', 'stroke="' + col + '" stroke-width="1"') + tx(x, y - (l2 ? 2 : -3), l1, fs, col) + (l2 ? tx(x, y + 9, l2, fs, col) : '') + '</g>';
    };
    back += stm(222, 392, -10, P.fjord, 'Saavuit', 'Suomeen', 8.5) + stm(262, 372, 8, P.lingon, 'Helsinki', '', 9.5) + stm(290, 404, -6, '#1c7a55', 'Ensimmäinen', 'ostos', 5.8);
    back += '</g>';
    s += back;
    // washi tape
    s += r(158, 66, 56, 16, 2, P.cloudberry, 'opacity=".7" transform="rotate(-6 186 74)"') + r(150, 262, 56, 16, 2, P.aurora, 'opacity=".6" transform="rotate(5 178 270)"');
    // coffee cup
    s += ci(330, 214, 34, '#fffdf6') + ci(330, 214, 34, 'none', 'stroke="#e5dcc4" stroke-width="2"') + ci(330, 214, 23, '#f1ead6') + ci(330, 214, 19, '#6b3f23') + pa('M330,222 Q321,215 324,210 Q327,206 330,210 Q333,206 336,210 Q339,215 330,222Z', '#f5e6c8', 'opacity=".9"') + r(350, 206, 18, 10, 5, '#fffdf6');
    s += '<g class="la-anim la-steam" style="animation-delay:0s">' + ln('M324,188 q-6,-12 0,-24', '#fff', 3, 'opacity=".55"') + '</g><g class="la-anim la-steam" style="animation-delay:-1.4s">' + ln('M336,188 q6,-12 0,-24', '#fff', 3, 'opacity=".5"') + '</g>';
    return wrap(c, 'A postcard on a wooden table: a collage of Helsinki on the front, Terveisiä Suomesta on the back, passport stamps and a coffee cup', s);
  };

  /* ---------- CSS ---------- */
  var CSS = [
    '.la-svg{display:block;width:100%;height:100%;-webkit-user-select:none;user-select:none}',
    '.la-t{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-weight:800;letter-spacing:-.01em;pointer-events:none}',
    '.la-led{font-family:ui-monospace,"Cascadia Mono","SF Mono",Consolas,monospace;font-weight:700;letter-spacing:0}',
    '.la-hand{font-family:"Segoe Script","Bradley Hand","Segoe Print","Comic Sans MS","Brush Script MT",cursive;font-weight:700;letter-spacing:0}',
    '.la-hot{cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none}',
    '.la-ring{fill:none;stroke:#ffa62b;stroke-width:3;opacity:0;pointer-events:none;transition:opacity .2s}',
    '.la-hot:hover .la-ring,.la-hot:focus-visible .la-ring{opacity:.75}',
    '.la-hot--active .la-hot .la-ring,.la-hot.la-hot--active .la-ring{opacity:1;fill:rgba(255,166,43,.14);animation:la-ring 1.3s ease-in-out infinite}',
    '.la-anim{transform-box:fill-box}',
    '@keyframes la-ring{0%,100%{stroke-width:2.5;stroke-opacity:.55}50%{stroke-width:5;stroke-opacity:1}}',
    '@keyframes la-scroll{from{transform:translateX(0)}to{transform:translateX(-400px)}}',
    '.la-scroll{animation:la-scroll linear infinite;transform-box:view-box}',
    '@keyframes la-twinkle{0%,100%{opacity:1}50%{opacity:.2}}',
    '.la-twinkle{animation:la-twinkle 3s ease-in-out infinite}',
    '@keyframes la-aurora{0%{transform:translateX(-18px) scaleY(.88)}50%{transform:translateX(18px) scaleY(1.14)}100%{transform:translateX(-18px) scaleY(.88)}}',
    '.la-aurora{animation:la-aurora 12s ease-in-out infinite;transform-origin:50% 50%}',
    '@keyframes la-drift{from{transform:translateX(-14px)}to{transform:translateX(30px)}}',
    '.la-drift{animation:la-drift 40s ease-in-out infinite alternate;transform-box:view-box}',
    '@keyframes la-wave{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(18deg)}}',
    '.la-wave{animation:la-wave 1.1s ease-in-out infinite;transform-box:view-box;transform-origin:0 0}',
    '@keyframes la-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
    '.la-bob{animation:la-bob 3s ease-in-out infinite;transform-box:view-box}',
    '@keyframes la-land{0%{transform:translate(115px,-232px) rotate(-9deg) scale(.55)}70%{transform:translate(18px,-30px) rotate(-3deg) scale(.95)}100%{transform:translate(0,0) rotate(0) scale(1)}}',
    '.la-land{animation:la-land 2s cubic-bezier(.25,.6,.3,1) forwards;transform-box:view-box;transform-origin:0 0}',
    '@keyframes la-glow{0%,100%{opacity:.5}50%{opacity:1}}',
    '.la-glow{animation:la-glow 1.6s ease-in-out infinite}',
    '@keyframes la-lantern{0%,100%{opacity:.7;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}',
    '.la-lantern{animation:la-lantern 2.6s ease-in-out infinite;transform-origin:50% 50%}',
    '@keyframes la-contact{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.1);opacity:1}}',
    '.la-contact{animation:la-contact 1.4s ease-in-out infinite}',
    '@keyframes la-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}',
    '.la-pulse{animation:la-pulse 1.4s ease-in-out infinite;transform-origin:50% 50%}',
    '@keyframes la-blink{0%,92%,100%{opacity:1}96%{opacity:.55}}',
    '.la-blink{animation:la-blink 4s linear infinite}',
    '@keyframes la-train-in{from{transform:translateX(480px)}to{transform:translateX(0)}}',
    '.la-train-in{animation:la-train-in 1.9s cubic-bezier(.15,.7,.2,1) both;transform-box:view-box}',
    '@keyframes la-bus-in{from{transform:translateX(480px)}to{transform:translateX(0)}}',
    '.la-bus-in{animation:la-bus-in 1.5s cubic-bezier(.2,.7,.25,1) both;transform-box:view-box}',
    '@keyframes la-tram{from{transform:translateX(-300px)}to{transform:translateX(520px)}}',
    '.la-tram{animation:la-tram 18s linear infinite;transform-box:view-box;transform:translate(110px,0)}',
    '@keyframes la-door-l{from{transform:translateX(60px)}to{transform:translateX(0)}}',
    '@keyframes la-door-r{from{transform:translateX(-60px)}to{transform:translateX(0)}}',
    '.la-door-l-open{animation:la-door-l .9s ease-out both;transform-box:view-box}',
    '.la-door-r-open{animation:la-door-r .9s ease-out both;transform-box:view-box}',
    '@keyframes la-ticket{from{transform:translateY(-50px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '.la-ticket{animation:la-ticket .9s ease-out both;transform-box:view-box}',
    '@keyframes la-steam{0%{transform:translateY(8px);opacity:0}40%{opacity:.8}100%{transform:translateY(-16px);opacity:0}}',
    '.la-steam{animation:la-steam 3s ease-out infinite}',
    '@keyframes la-road{to{stroke-dashoffset:-44}}',
    '.la-road{animation:la-road .9s linear infinite}',
    '@keyframes la-grow{from{transform:scale(.45)}to{transform:scale(1.7)}}',
    '.la-grow{animation:la-grow 30s linear forwards;transform-origin:50% 100%}',
    '@keyframes la-bubble{0%{transform:translateY(8px);opacity:0}30%{opacity:.9}100%{transform:translateY(-34px);opacity:0}}',
    '.la-bubble{animation:la-bubble 2.8s ease-in infinite}',
    '@media (prefers-reduced-motion: reduce){.la-anim{animation:none !important}}'
  ].join('\n');

  function placeholder(sid, ctx) {
    var c = mkCtx(sid, ctx);
    return wrap(c, 'Scene ' + sid, sky(c, {}) + tx(200, 260, String(sid), 22, '#fff'));
  }

  window.LumovoArt = {
    palette: P,
    css: CSS,
    render: function (sceneId, ctx) {
      ctx = ctx || {};
      var fn = S[sceneId];
      if (!fn) return placeholder(sceneId, ctx);
      return fn(mkCtx(sceneId, ctx));
    }
  };
})();
