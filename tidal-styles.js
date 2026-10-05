/* =========================================================================
   TIDAL MANDALA: tidal-styles.js
   The four drawing recipes: Islamic, Celtic, Spiral Rose, Medallion.
   tidal-app.js calls TidalStyles.draw(context, width, height, settings).
   This file only draws the pattern. The app paints the background first.
   ========================================================================= */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* ---------- small helpers ---------- */
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function int(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function hash(str) {
    var h = 2166136261 >>> 0;
    str = String(str || "tidal");
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(h) {
    h = String(h || "#000000").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2);
    }).join("");
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + clamp(a, 0, 1) + ")";
  }
  function mixTwo(h1, h2, f) {
    var a = hexToRgb(h1), b = hexToRgb(h2);
    return toHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
  }
  /* blend along a list of colours, t from 0 to 1 */
  function mixList(cols, t) {
    t = clamp(t, 0, 1);
    var seg = t * (cols.length - 1);
    var i = Math.min(cols.length - 2, Math.floor(seg));
    return mixTwo(cols[i], cols[i + 1], seg - i);
  }

  function starPath(c, x, y, pts, outer, inner, rot) {
    c.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var a = rot + i * Math.PI / pts;
      var r = i % 2 === 0 ? outer : inner;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  /* paints the shape already in the path: outline, filled, or both */
  function paintShape(c, mode, col, lw) {
    if (mode === "filled") {
      c.fillStyle = rgba(col, 0.9); c.fill();
    } else if (mode === "both") {
      c.fillStyle = rgba(col, 0.35); c.fill();
      c.strokeStyle = rgba(col, 1); c.lineWidth = lw; c.stroke();
    } else {
      c.strokeStyle = rgba(col, 1); c.lineWidth = lw; c.stroke();
    }
  }

  function circle(c, x, y, r, col, lw, alpha) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.strokeStyle = rgba(col, alpha == null ? 1 : alpha);
    c.lineWidth = lw; c.stroke();
  }

  /* =======================================================================
     ISLAMIC GEOMETRY
     Rings of stars around a central star. Each ring has Symmetry x ring
     number stars, so spacing stays even. Linking lines are drawn first.
     ======================================================================= */
  function islamic(S) {
    var c = S.c, p = S.p, cols = S.cols, rng = S.rng;
    var rings = int(p.ringCount), pts = int(p.starPoints), sym = int(p.symmetry);
    var dens = num(p.density) / 100;
    var fill = p.starFill, cmode = p.ringColour, lw = S.lw;
    var gap = S.R * 0.68 / rings;
    c.lineJoin = "round"; c.lineCap = "round";

    var ringsData = [];
    for (var r = 1; r <= rings; r++) {
      var rad = S.R * (0.22 + 0.68 * r / rings);
      var n = sym * r;
      var spacing = TAU * rad / n;
      var baseSize = Math.min(spacing, gap * 1.2) * 0.5 * (0.75 + dens * 0.85);
      baseSize = Math.min(baseSize, S.R * 0.3);
      var stagger = (r % 2 === 0) ? 0.5 : 0;
      var list = [];
      for (var i = 0; i < n; i++) {
        var a = S.rot + (i + stagger) / n * TAU;
        list.push({
          x: S.cx + Math.cos(a) * rad,
          y: S.cy + Math.sin(a) * rad,
          a: a,
          size: baseSize * (0.92 + rng() * 0.16)
        });
      }
      ringsData.push({ rad: rad, list: list });
    }

    /* linking lines */
    if (p.tracery !== "off") {
      c.strokeStyle = rgba(cols[1], 0.5);
      c.lineWidth = Math.max(1, lw * 0.4);
      ringsData.forEach(function (rd, idx) {
        c.beginPath(); c.arc(S.cx, S.cy, rd.rad, 0, TAU); c.stroke();
        var prev = idx > 0 ? ringsData[idx - 1].list : null;
        var n = rd.list.length;
        c.beginPath();
        rd.list.forEach(function (st, i) {
          var nx = rd.list[(i + 1) % n];
          c.moveTo(st.x, st.y); c.lineTo(nx.x, nx.y);
          if (prev) {
            var j = Math.round(i * prev.length / n) % prev.length;
            c.moveTo(st.x, st.y); c.lineTo(prev[j].x, prev[j].y);
          } else {
            c.moveTo(st.x, st.y); c.lineTo(S.cx, S.cy);
          }
        });
        c.stroke();
      });
    }

    /* stars, outer rings first so inner ones sit on top */
    for (var ri = ringsData.length - 1; ri >= 0; ri--) {
      var rd2 = ringsData[ri];
      rd2.list.forEach(function (st, i) {
        var col;
        if (cmode === "alternate") col = cols[(ri + (i % 2)) % 4];
        else if (cmode === "random") col = cols[Math.floor(rng() * 4) % 4];
        else col = cols[ri % 4];
        starPath(c, st.x, st.y, pts, st.size, st.size * 0.5, st.a);
        paintShape(c, fill, col, lw);
      });
    }

    /* centre: two layered stars */
    var cs = Math.min(S.R * 0.17, gap * 0.9);
    starPath(c, S.cx, S.cy, pts, cs, cs * 0.5, S.rot);
    paintShape(c, fill, cols[0], lw * 1.3);
    starPath(c, S.cx, S.cy, pts, cs * 0.55, cs * 0.28, S.rot + Math.PI / pts);
    paintShape(c, fill, cols[3], lw);
  }

  /* =======================================================================
     CELTIC KNOTWORK
     Two strands swing in and out around a circle and cross 2 x lobes times.
     Each crossing alternates over and under. Each ribbon has a dark edge.
     ======================================================================= */
  function braid(S, R0, half, L, phase, colA, colB, over) {
    var c = S.c;
    var o = Math.max(1.5, S.k * 2.2);
    var w = Math.min(S.ribbon, half * 0.9, R0 * Math.PI / L * 0.7);
    w = Math.max(w, 3);
    var A = Math.max(w * 0.55, half - w * 0.5 - o);
    c.lineCap = "butt"; c.lineJoin = "round";

    function pt(s, th) {
      var r = R0 + s * A * Math.sin(L * (th - phase));
      var a = th + S.rot;
      return [S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r];
    }
    function path(s, t0, t1, n, close) {
      c.beginPath();
      var last = close ? n - 1 : n;
      for (var i = 0; i <= last; i++) {
        var th = t0 + (t1 - t0) * i / n;
        var q = pt(s, th);
        if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]);
      }
      if (close) c.closePath();
    }
    function strand(s, col, t0, t1, n, close) {
      if (over) {
        path(s, t0, t1, n, close);
        c.lineWidth = w + 2 * o; c.strokeStyle = S.outline; c.stroke();
      }
      path(s, t0, t1, n, close);
      c.lineWidth = w; c.strokeStyle = rgba(col, 1); c.stroke();
      if (over) {
        path(s, t0, t1, n, close);
        c.lineWidth = Math.max(1, w * 0.2);
        c.strokeStyle = "rgba(255,255,255,0.16)"; c.stroke();
      }
    }

    var N = L * 72;
    strand(1, colA, 0, TAU, N, true);
    strand(-1, colB, 0, TAU, N, true);

    if (over) {
      var phi = 2 * Math.atan(A * L / R0);
      var sinPhi = Math.max(Math.sin(phi), 0.25);
      var delta = ((w + 2 * o) / (2 * sinPhi) + o * 2) / R0;
      delta = Math.min(delta, 0.42 * Math.PI / L);
      for (var k = 0; k < 2 * L; k += 2) {
        var th = phase + k * Math.PI / L;
        strand(1, colA, th - delta, th + delta, 16, false);
      }
    }
  }

  function celtic(S) {
    var p = S.p, cols = S.cols, rng = S.rng;
    var L = int(p.loopCount), n = int(p.celticRings), sym = int(p.symmetry);
    var over = p.weave !== "flat";

    var inner = 0.36, outer = 0.95;
    var band = (outer - inner) * S.R / n;
    for (var j = 0; j < n; j++) {
      var R0 = S.R * inner + (j + 0.5) * band;
      var phase = (j * Math.PI / (2 * L)) + rng() * Math.PI / L;
      braid(S, R0, band / 2 * 0.95, L, phase, cols[(2 * j) % 4], cols[(2 * j + 1) % 4], over);
    }
    /* centre knot: Symmetry sets how many lobes it has */
    var Lc = Math.max(3, Math.round(sym / 2));
    braid(S, S.R * 0.17, S.R * 0.115, Lc, rng() * Math.PI / Lc, cols[2], cols[3], over);
  }

  /* =======================================================================
     SPIRAL ROSE
     Rose: layered petals twisted into a rose. Vortex: log spirals.
     Fern: fronds with leaflets on both sides.
     ======================================================================= */
  function spiral(S) {
    var c = S.c, p = S.p, cols = S.cols, rng = S.rng;
    var arms = int(p.spiralArms);
    var curv = num(p.curvature) / 100;
    var dens = num(p.density) / 100;
    var fade = p.colourStep === "fade";
    var Rm = S.R * 0.95, lw = S.lw;
    c.lineCap = "round"; c.lineJoin = "round";

    function armCol(a, t) { return fade ? mixList(cols, t) : cols[a % 4]; }

    if (p.spiralType === "vortex") {
      var turns = 0.8 + curv * 3.2;
      var r0 = Rm * 0.015;
      var b = Math.log(Rm / r0) / (TAU * turns);
      var strands = 1 + Math.round(dens * 3);
      var N = 240;
      for (var a = 0; a < arms; a++) {
        var armLen = 0.9 + rng() * 0.1;
        for (var s = 0; s < strands; s++) {
          var soff = (s - (strands - 1) / 2) * 0.09;
          var prev = null;
          for (var i = 0; i <= N; i++) {
            var t = i / N;
            var th = t * TAU * turns * armLen;
            var r = r0 * Math.exp(b * th);
            var ang = S.rot + a / arms * TAU + th + soff;
            var x = S.cx + Math.cos(ang) * r, y = S.cy + Math.sin(ang) * r;
            if (prev) {
              c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(x, y);
              c.lineWidth = lw * (0.35 + 1.0 * t);
              c.strokeStyle = rgba(armCol(a, t), 0.95);
              c.stroke();
            }
            prev = [x, y];
          }
        }
      }
    } else if (p.spiralType === "fern") {
      var leaflets = 8 + Math.round(dens * 22);
      var bend = curv * 1.6;
      for (var f = 0; f < arms; f++) {
        var base = S.rot + f / arms * TAU;
        var flen = Rm * (0.92 + rng() * 0.08);
        var sp = function (t) {
          var rr = t * flen, an = base + bend * t * t;
          return [S.cx + Math.cos(an) * rr, S.cy + Math.sin(an) * rr];
        };
        /* spine */
        c.beginPath();
        for (var q = 0; q <= 40; q++) {
          var pp = sp(q / 40);
          if (q === 0) c.moveTo(pp[0], pp[1]); else c.lineTo(pp[0], pp[1]);
        }
        c.strokeStyle = rgba(armCol(f, 0.5), 0.9);
        c.lineWidth = lw * 0.9; c.stroke();
        /* leaflets */
        for (var l = 1; l <= leaflets; l++) {
          var tt = l / (leaflets + 1);
          var p1 = sp(tt), p2 = sp(tt + 0.01);
          var tang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
          var len = Rm * 0.14 * (1 - tt * 0.55) * (0.5 + curv * 0.6);
          var col = armCol(f, tt);
          c.strokeStyle = rgba(col, 0.9);
          c.lineWidth = Math.max(1, lw * 0.6);
          [-1, 1].forEach(function (side) {
            var la = tang + side * 0.85;
            c.beginPath(); c.moveTo(p1[0], p1[1]);
            c.lineTo(p1[0] + Math.cos(la) * len, p1[1] + Math.sin(la) * len);
            c.stroke();
          });
        }
      }
    } else {
      /* rose: layered, twisted petals, biggest layer first */
      var layers = 3 + Math.round(dens * 6);
      var twist = curv * 0.5;
      var halfW = Math.PI / arms * (0.45 + curv * 0.9);
      for (var l2 = layers - 1; l2 >= 0; l2--) {
        var tl = (l2 + 1) / layers;
        for (var a2 = 0; a2 < arms; a2++) {
          var Rs = Rm * tl * (0.94 + rng() * 0.06);
          var baseA = S.rot + a2 / arms * TAU + l2 * twist * 0.5;
          var col2 = fade ? mixList(cols, tl) : cols[a2 % 4];
          c.beginPath();
          for (var k = 0; k <= 28; k++) {
            var u = -halfW + (2 * halfW) * k / 28;
            var rr2 = Rs * Math.pow(Math.max(0, Math.cos(Math.PI * u / (2 * halfW))), 0.85);
            var an2 = baseA + u;
            var px = S.cx + Math.cos(an2) * rr2, py = S.cy + Math.sin(an2) * rr2;
            if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.closePath();
          c.fillStyle = rgba(col2, 0.16); c.fill();
          c.strokeStyle = rgba(col2, 0.95);
          c.lineWidth = lw * (0.6 + 0.4 * tl); c.stroke();
        }
      }
      c.beginPath(); c.arc(S.cx, S.cy, Math.max(2, Rm * 0.025), 0, TAU);
      c.fillStyle = rgba(cols[3], 1); c.fill();
    }
  }

  /* =======================================================================
     MEDALLION
     From the middle out: centre, inner band, outer band, border.
     ======================================================================= */
  function medallion(S) {
    var c = S.c, p = S.p, cols = S.cols, rng = S.rng, R = S.R, lw = S.lw;
    var sym = int(p.symmetry), pts = int(p.medPoints);
    c.lineJoin = "round"; c.lineCap = "round";

    /* band edge rings */
    [0.32, 0.55, 0.59, 0.80].forEach(function (f) {
      circle(c, S.cx, S.cy, R * f, cols[1], Math.max(1, lw * 0.6), 0.85);
    });

    /* ornament band */
    function band(kind, rc, half, n, colA, colB) {
      if (kind === "none") return;
      var spacing = TAU * rc / n;
      for (var i = 0; i < n; i++) {
        var a = S.rot + i / n * TAU;
        var x = S.cx + Math.cos(a) * rc, y = S.cy + Math.sin(a) * rc;
        var col = i % 2 === 0 ? colA : colB;
        var jit = 0.92 + rng() * 0.16;
        if (kind === "petal") {
          var len = half * 1.85 * jit;
          var wid = Math.min(spacing * 0.8, half * 1.3);
          c.save(); c.translate(x, y); c.rotate(a);
          c.beginPath();
          c.moveTo(-len / 2, 0);
          c.quadraticCurveTo(0, -wid, len / 2, 0);
          c.quadraticCurveTo(0, wid, -len / 2, 0);
          c.closePath();
          c.fillStyle = rgba(col, 0.55); c.fill();
          c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, lw * 0.6); c.stroke();
          c.restore();
        } else if (kind === "bead") {
          var br = Math.min(half * 0.6, spacing * 0.38) * jit;
          c.beginPath(); c.arc(x, y, br, 0, TAU);
          c.fillStyle = rgba(col, 0.95); c.fill();
          c.strokeStyle = rgba(cols[1], 0.9); c.lineWidth = Math.max(1, lw * 0.4); c.stroke();
        } else {
          var hl = half * (i % 2 === 0 ? 0.85 : 0.5);
          c.beginPath();
          c.moveTo(S.cx + Math.cos(a) * (rc - hl), S.cy + Math.sin(a) * (rc - hl));
          c.lineTo(S.cx + Math.cos(a) * (rc + hl), S.cy + Math.sin(a) * (rc + hl));
          c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, lw * 0.8); c.stroke();
        }
      }
    }
    band(p.innerBand, R * 0.435, R * 0.115, sym * 2, cols[1], cols[2]);
    band(p.outerBand, R * 0.695, R * 0.105, sym * 3, cols[3], cols[0]);

    /* centre */
    var ct = p.centreType;
    if (ct === "flower") {
      var plen = R * 0.27;
      var pw = Math.min(R * 0.2, plen * Math.sin(Math.PI / pts) * 1.6);
      for (var i = 0; i < pts; i++) {
        c.save(); c.translate(S.cx, S.cy); c.rotate(S.rot + i / pts * TAU);
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(plen * 0.5, -pw * 1.6, plen, 0);
        c.quadraticCurveTo(plen * 0.5, pw * 1.6, 0, 0);
        c.closePath();
        c.fillStyle = rgba(cols[0], 0.8); c.fill();
        c.strokeStyle = rgba(cols[1], 1); c.lineWidth = lw; c.stroke();
        c.restore();
      }
      c.beginPath(); c.arc(S.cx, S.cy, R * 0.06, 0, TAU);
      c.fillStyle = rgba(cols[3], 1); c.fill();
    } else if (ct === "eye") {
      var EL = R * 0.28, EH = R * 0.14;
      c.save(); c.translate(S.cx, S.cy); c.rotate(S.rot + Math.PI / 2);
      c.beginPath(); c.moveTo(-EL, 0);
      c.quadraticCurveTo(0, -EH * 2, EL, 0);
      c.quadraticCurveTo(0, EH * 2, -EL, 0);
      c.closePath();
      c.fillStyle = rgba(cols[0], 0.5); c.fill();
      c.strokeStyle = rgba(cols[0], 1); c.lineWidth = lw * 1.2; c.stroke();
      c.beginPath(); c.arc(0, 0, R * 0.11, 0, TAU);
      c.fillStyle = rgba(cols[1], 1); c.fill();
      c.beginPath(); c.arc(0, 0, R * 0.05, 0, TAU);
      c.fillStyle = rgba(cols[3], 1); c.fill();
      c.restore();
    } else if (ct === "plain") {
      c.beginPath(); c.arc(S.cx, S.cy, R * 0.24, 0, TAU);
      c.fillStyle = rgba(cols[0], 0.85); c.fill();
      circle(c, S.cx, S.cy, R * 0.18, cols[1], lw, 1);
    } else {
      starPath(c, S.cx, S.cy, pts, R * 0.27, R * 0.13, S.rot);
      c.fillStyle = rgba(cols[0], 0.9); c.fill();
      c.strokeStyle = rgba(cols[1], 1); c.lineWidth = lw; c.stroke();
      starPath(c, S.cx, S.cy, pts, R * 0.13, R * 0.07, S.rot + Math.PI / pts);
      c.fillStyle = rgba(cols[3], 1); c.fill();
    }

    /* border */
    var bt = p.borderType;
    if (bt === "none") return;
    var bw = Math.max(1, lw);
    if (bt === "plain") {
      circle(c, S.cx, S.cy, R * 0.86, cols[0], bw, 1);
      circle(c, S.cx, S.cy, R * 0.97, cols[0], bw, 1);
    } else if (bt === "rope") {
      circle(c, S.cx, S.cy, R * 0.86, cols[0], bw, 1);
      circle(c, S.cx, S.cy, R * 0.98, cols[0], bw, 1);
      var rn = sym * 8;
      for (var j = 0; j < rn; j++) {
        var a0 = S.rot + j / rn * TAU, a1 = a0 + TAU / rn * 1.1;
        c.beginPath();
        c.moveTo(S.cx + Math.cos(a0) * R * 0.875, S.cy + Math.sin(a0) * R * 0.875);
        c.lineTo(S.cx + Math.cos(a1) * R * 0.965, S.cy + Math.sin(a1) * R * 0.965);
        c.strokeStyle = rgba(cols[2], 1); c.lineWidth = bw * 1.2; c.stroke();
      }
    } else if (bt === "chain") {
      var cn = sym * 4;
      var cspace = TAU * R * 0.92 / cn;
      for (var m = 0; m < cn; m++) {
        var am = S.rot + m / cn * TAU;
        var mx = S.cx + Math.cos(am) * R * 0.92, my = S.cy + Math.sin(am) * R * 0.92;
        c.beginPath();
        if (m % 2 === 0) c.ellipse(mx, my, cspace * 0.62, R * 0.045, am + Math.PI / 2, 0, TAU);
        else c.ellipse(mx, my, R * 0.05, Math.min(R * 0.03, cspace * 0.3), am, 0, TAU);
        c.strokeStyle = rgba(m % 2 === 0 ? cols[2] : cols[3], 1);
        c.lineWidth = bw * 1.1; c.stroke();
      }
    } else {
      circle(c, S.cx, S.cy, R * 0.92, cols[0], Math.max(1, bw * 0.7), 1);
      var bn = sym * 6;
      var bspace = TAU * R * 0.92 / bn;
      for (var q = 0; q < bn; q++) {
        var aq = S.rot + q / bn * TAU;
        c.beginPath();
        c.arc(S.cx + Math.cos(aq) * R * 0.92, S.cy + Math.sin(aq) * R * 0.92,
              Math.min(R * 0.04, bspace * 0.38), 0, TAU);
        c.fillStyle = rgba(q % 2 === 0 ? cols[2] : cols[3], 1); c.fill();
      }
    }
  }

  /* =======================================================================
     MAIN ENTRY
     Draws the pattern on a spare canvas, then lays it on the real one at
     the chosen opacity. This keeps overlaps clean at any opacity.
     ======================================================================= */
  function draw(target, W, H, p) {
    var off = document.createElement("canvas");
    off.width = W; off.height = H;
    var c = off.getContext("2d");
    var k = Math.min(W, H) / 900;

    var S = {
      c: c, p: p, W: W, H: H,
      cx: W / 2, cy: H / 2,
      R: Math.min(W, H) * 0.46 * (num(p.scale) || 1),
      k: k,
      lw: Math.max(1, num(p.lineWeight) * k),
      ribbon: num(p.ribbonWidth) * k,
      rot: num(p.rotation) * Math.PI / 180 - Math.PI / 2,
      cols: (p.colors || ["#20e3b2", "#38bdf8", "#7cf5ff", "#ffd257"]).slice(0, 4),
      rng: mulberry32(hash(p.seed)),
      outline: mixTwo(p.bg || "#041214", "#000000", 0.6)
    };

    var style = p.style;
    if (style === "celtic") celtic(S);
    else if (style === "spiral") spiral(S);
    else if (style === "medallion") medallion(S);
    else islamic(S);

    target.save();
    target.globalAlpha = clamp(num(p.opacity) || 1, 0, 1);
    target.drawImage(off, 0, 0);
    target.restore();
  }

  window.TidalStyles = { draw: draw };
})();