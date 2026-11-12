/* =========================================================
   Softra: share cards

   Draws neumorphic PNG cards on a canvas (no libraries):
     N.cards.open('result' | 'versus' | 'achievement', data)
   Everything is drawn at real pixel size (1200x675 "wide" or
   1080x1350 "tall"), so the download is sharp. Shadows are not
   scaled by canvas transforms, so no ctx.scale() is used.
   ========================================================= */
(() => {
  'use strict';
  const N = window.NEUTYPE;
  if (!N) return;
  const $ = s => document.querySelector(s);

  const dlg = $('#cardDialog'), cv = $('#cardCanvas'), ctx = cv.getContext('2d');
  const FONT = 'Poppins, Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  const SIZES = { wide: [1200, 675], tall: [1080, 1350] };

  /* ---------------------------------------------------------
     Colors
  --------------------------------------------------------- */
  const PRESETS = {
    light:  { name: 'Soft light', bg: '#E8EAF0', sl: 'rgba(255,255,255,.95)', sd: 'rgba(163,170,198,.65)', text: '#303442', text2: '#8a8fa3', accent: '#7C83FD', accent2: '#4fc3dc', dark: false },
    dark:   { name: 'Soft dark', bg: '#262830', sl: 'rgba(255,255,255,.065)', sd: 'rgba(0,0,0,.6)', text: '#E4E6EF', text2: '#8a8fa0', accent: '#9097ff', accent2: '#62d6c4', dark: true },
    aurora: { name: 'Aurora', bg: '#1c2036', sl: 'rgba(140,155,255,.10)', sd: 'rgba(0,0,12,.68)', text: '#eef0ff', text2: '#8f96bd', accent: '#8b7bff', accent2: '#3fe0c5', dark: true },
    sunset: { name: 'Sunset', bg: '#efe5e0', sl: 'rgba(255,255,255,.92)', sd: 'rgba(197,168,158,.62)', text: '#3b2f35', text2: '#9d8b91', accent: '#ff7a6b', accent2: '#ffb347', dark: false }
  };

  function parse(c) {
    c = String(c).trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, x => x + x); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; }
    return [128, 128, 128, 1];
  }
  const rgba = (c, a) => { const p = parse(c); return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a})`; };
  const mix = (a, b, t) => { const x = parse(a), y = parse(b); return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`; };

  function themePalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const bg = g('--bg', '#E8EAF0'), accent = g('--accent', '#7C83FD');
    const dark = document.documentElement.dataset.tone === 'dark';
    return { name: 'My theme', bg, sl: g('--sl', 'rgba(255,255,255,.9)'), sd: g('--sd', 'rgba(0,0,0,.4)'), text: g('--text', '#303442'), text2: g('--text2', '#8a8fa3'), accent, accent2: mix(accent, '#4fe0d0', .55), dark };
  }
  const paletteFor = id => id === 'theme' ? themePalette() : (PRESETS[id] || PRESETS.light);

  /* ---------------------------------------------------------
     Drawing helpers
  --------------------------------------------------------- */
  let P = PRESETS.light;

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shadowFill(fill, ox, oy, blur, color) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }
  /* Raised soft plate: dark shadow bottom-right, light shadow top-left, gentle convex gradient */
  function raised(x, y, w, h, r, o = 12, b = 26, tone = 0) {
    rr(x, y, w, h, r);
    shadowFill(P.bg, o, o, b, P.sd);
    shadowFill(P.bg, -o, -o, b, P.sl);
    rr(x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, mix(P.bg, '#ffffff', P.dark ? .045 + tone : .35 + tone));
    g.addColorStop(1, mix(P.bg, '#000000', P.dark ? .10 : .045));
    ctx.fillStyle = g; ctx.fill();
  }
  /* Pressed-in well: clip, then cast the shadows of a frame inwards */
  function inset(x, y, w, h, r, o = 7, b = 15) {
    ctx.save();
    rr(x, y, w, h, r); ctx.clip();
    ctx.fillStyle = mix(P.bg, '#000000', P.dark ? .10 : .025); ctx.fillRect(x, y, w, h);
    const pad = 300;
    ctx.beginPath();
    ctx.rect(x - pad, y - pad, w + pad * 2, h + pad * 2);
    const r2 = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r2, y);
    ctx.arcTo(x, y, x, y + h, r2); ctx.arcTo(x, y + h, x + w, y + h, r2); ctx.arcTo(x + w, y + h, x + w, y, r2); ctx.arcTo(x + w, y, x, y, r2);
    ctx.closePath();
    ctx.shadowColor = P.sd; ctx.shadowBlur = b; ctx.shadowOffsetX = o; ctx.shadowOffsetY = o;
    ctx.fillStyle = P.bg; ctx.fill('evenodd');
    ctx.shadowColor = P.sl; ctx.shadowOffsetX = -o; ctx.shadowOffsetY = -o;
    ctx.fill('evenodd');
    ctx.restore();
  }
  function circlePath(cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); }
  function raisedCircle(cx, cy, r, o = 12, b = 26) {
    circlePath(cx, cy, r); shadowFill(P.bg, o, o, b, P.sd);
    circlePath(cx, cy, r); shadowFill(P.bg, -o, -o, b, P.sl);
    circlePath(cx, cy, r);
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, mix(P.bg, '#ffffff', P.dark ? .06 : .4)); g.addColorStop(1, mix(P.bg, '#000000', P.dark ? .12 : .06));
    ctx.fillStyle = g; ctx.fill();
  }
  function insetCircle(cx, cy, r, o = 8, b = 16) {
    ctx.save();
    circlePath(cx, cy, r); ctx.clip();
    ctx.fillStyle = mix(P.bg, '#000000', P.dark ? .10 : .03); ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.beginPath(); ctx.rect(cx - r - 300, cy - r - 300, r * 2 + 600, r * 2 + 600);
    ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.closePath();
    ctx.shadowColor = P.sd; ctx.shadowBlur = b; ctx.shadowOffsetX = o; ctx.shadowOffsetY = o; ctx.fillStyle = P.bg; ctx.fill('evenodd');
    ctx.shadowColor = P.sl; ctx.shadowOffsetX = -o; ctx.shadowOffsetY = -o; ctx.fill('evenodd');
    ctx.restore();
  }
  const accentGrad = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, P.accent); g.addColorStop(1, P.accent2); return g; };

  function text(str, x, y, o = {}) {
    ctx.save();
    ctx.font = `${o.weight || 500} ${o.size || 24}px ${FONT}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
    ctx.fillStyle = o.fill || P.text;
    let s = String(str);
    if (o.maxW) {                                   // shrink to fit, then ellipsis as a last resort
      let size = o.size || 24;
      while (size > (o.min || 12) && ctx.measureText(s).width > o.maxW) { size -= 1; ctx.font = `${o.weight || 500} ${size}px ${FONT}`; }
      while (s.length > 2 && ctx.measureText(s).width > o.maxW) s = s.slice(0, -2) + '…';
    }
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  const measure = (str, size, weight = 500, spacing = 0) => {
    ctx.save(); ctx.font = `${weight} ${size}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    const w = ctx.measureText(String(str)).width; ctx.restore(); return w;
  };
  function wrap(str, size, weight, maxW) {
    const words = String(str).split(/\s+/), lines = [];
    let line = '';
    words.forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (measure(t, size, weight) > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  /* Small inset pill with text; returns its width */
  function pill(str, x, y, o = {}) {
    const size = o.size || 20, padX = 22, h = size + 24;
    const w = measure(str, size, 600, 0.5) + padX * 2;
    const left = o.align === 'center' ? x - w / 2 : x;
    inset(left, y, w, h, h / 2, 4, 9);
    text(str, left + w / 2, y + h / 2 + 1, { size, weight: 600, align: 'center', base: 'middle', fill: o.fill || P.text2, spacing: 0.5 });
    return w;
  }
  function icon(name, cx, cy, size, color, lw = 1.8) {
    const path = N.ICONS && N.ICONS[name];
    if (!path) return;
    const k = size / 24;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(k, k);
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.stroke(new Path2D(path));
    ctx.restore();
  }

  /* Background, ambient glows, outer plate, header and footer */
  function frame(W, H, rightText, footerLeft, footerRight) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.88, H * 0.06, 0, W * 0.88, H * 0.06, Math.max(W, H) * 0.7);
    g.addColorStop(0, rgba(P.accent, P.dark ? .20 : .16)); g.addColorStop(1, rgba(P.accent, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W * 0.06, H * 0.98, 0, W * 0.06, H * 0.98, Math.max(W, H) * 0.6);
    g.addColorStop(0, rgba(P.accent2, P.dark ? .14 : .12)); g.addColorStop(1, rgba(P.accent2, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const m = 36;
    raised(m, m, W - m * 2, H - m * 2, 56, 14, 32, 0.02);
    // thin edge highlight, makes the plate feel machined
    ctx.save(); rr(m + 1, m + 1, W - m * 2 - 2, H - m * 2 - 2, 55); ctx.lineWidth = 2; ctx.strokeStyle = P.dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.8)'; ctx.stroke(); ctx.restore();
    // diagonal sheen
    ctx.save(); rr(m, m, W - m * 2, H - m * 2, 56); ctx.clip();
    g = ctx.createLinearGradient(m, m, m + (W - m * 2) * 0.7, m + (H - m * 2) * 0.9);
    g.addColorStop(0, `rgba(255,255,255,${P.dark ? .045 : .22})`); g.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(m, m, W - m * 2, H - m * 2); ctx.restore();

    const px = m + 60;
    // header
    ctx.save(); rr(px, m + 34, 60, 60, 17); ctx.shadowColor = P.sd; ctx.shadowBlur = 14; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5; ctx.fillStyle = P.bg; ctx.fill(); ctx.restore();
    if (N.logo) N.logo.draw(ctx, px, m + 34, 60, P.bg, P.accent);
    text('SOFTRA', px + 78, m + 64, { size: 26, weight: 700, spacing: 7, base: 'middle', fill: P.text });
    if (rightText) text(rightText, W - px, m + 64, { size: 22, weight: 500, align: 'right', base: 'middle', fill: P.text2, maxW: W * 0.4 });
    // hairline
    g = ctx.createLinearGradient(px, 0, W - px, 0);
    g.addColorStop(0, rgba(P.accent, .85)); g.addColorStop(1, rgba(P.accent2, .0));
    ctx.fillStyle = g; ctx.fillRect(px, m + 118, W - px * 2, 3);
    // footer
    text(footerLeft || 'softra · soft typing practice', px, H - m - 38, { size: 18, fill: P.text2, spacing: 0.5 });
    text(footerRight || new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }), W - px, H - m - 38, { size: 18, fill: P.text2, align: 'right' });
    return { px, top: m + 150, bottom: H - m - 70, left: px, right: W - px };
  }

  /* Smooth sparkline inside a well */
  function spark(vals, x, y, w, h, label) {
    inset(x, y, w, h, 28, 6, 14);
    const pad = 28;
    const ix = x + pad, iy = y + pad + 34, iw = w - pad * 2, ih = h - pad * 2 - 46;
    text(label || 'SPEED OVER TIME', x + pad, y + pad + 4, { size: 15, weight: 600, spacing: 2.5, fill: P.text2, base: 'middle' });
    if (!vals || vals.length < 2) { text('Not enough data for a chart', x + w / 2, y + h / 2 + 10, { size: 20, align: 'center', fill: P.text2 }); return; }
    const max = Math.max(...vals, 10), min = 0;
    const px = i => ix + iw * i / (vals.length - 1), py = v => iy + ih - ih * (v - min) / (max - min);
    ctx.save();
    ctx.strokeStyle = rgba(P.text2, .22); ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]);
    for (let i = 0; i <= 3; i++) { const yy = iy + ih * i / 3; ctx.beginPath(); ctx.moveTo(ix, yy); ctx.lineTo(ix + iw, yy); ctx.stroke(); }
    ctx.setLineDash([]);
    const curve = () => {
      ctx.beginPath(); ctx.moveTo(px(0), py(vals[0]));
      for (let i = 1; i < vals.length; i++) { const mx = (px(i - 1) + px(i)) / 2; ctx.bezierCurveTo(mx, py(vals[i - 1]), mx, py(vals[i]), px(i), py(vals[i])); }
    };
    curve(); ctx.lineTo(px(vals.length - 1), iy + ih); ctx.lineTo(px(0), iy + ih); ctx.closePath();
    const ag = ctx.createLinearGradient(0, iy, 0, iy + ih); ag.addColorStop(0, rgba(P.accent, .34)); ag.addColorStop(1, rgba(P.accent, 0));
    ctx.fillStyle = ag; ctx.fill();
    curve(); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = accentGrad(ix, 0, ix + iw, 0);
    ctx.shadowColor = rgba(P.accent, .45); ctx.shadowBlur = 14; ctx.stroke();
    ctx.shadowBlur = 0;
    const lx = px(vals.length - 1), ly = py(vals[vals.length - 1]);
    circlePath(lx, ly, 9); ctx.fillStyle = P.bg; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = P.accent2; ctx.stroke();
    ctx.restore();
    text(String(Math.round(max)), x + w - pad, y + pad + 4, { size: 15, weight: 600, fill: P.text2, align: 'right', base: 'middle' });
  }

  /* A stat tile: small caps label over a big value */
  function tile(x, y, w, h, label, value, o = {}) {
    inset(x, y, w, h, 24, 5, 12);
    text(label, x + w / 2, y + h * 0.3, { size: 15, weight: 600, spacing: 2.5, align: 'center', fill: P.text2, base: 'middle' });
    text(value, x + w / 2, y + h * 0.66, { size: o.size || 42, weight: 700, align: 'center', base: 'middle', fill: o.fill || P.text, maxW: w - 24 });
    if (o.bar !== undefined) {
      const bw = w - 56, bx = x + 28, by = y + h - 24;
      rr(bx, by, bw, 8, 4); ctx.fillStyle = rgba(P.text2, .22); ctx.fill();
      rr(bx, by, Math.max(8, bw * o.bar / 100), 8, 4); ctx.fillStyle = accentGrad(bx, 0, bx + bw, 0); ctx.fill();
    }
  }

  /* ---------------------------------------------------------
     Card: solo result
  --------------------------------------------------------- */
  function drawResult(d, fmt) {
    const [W, H] = SIZES[fmt];
    const r = d.res;
    const f = frame(W, H, d.user || 'Guest');
    const chips = [d.modeText, r.difficulty[0].toUpperCase() + r.difficulty.slice(1), d.langName].filter(Boolean);
    const spd = d.samples || [];
    const tall = fmt === 'tall';
    const acc = Math.max(0, Math.min(100, r.acc));

    if (!tall) {
      text('WORDS PER MINUTE', f.left, f.top + 24, { size: 20, weight: 600, spacing: 4, fill: P.text2 });
      text(String(r.wpm), f.left - 6, f.top + 226, { size: 210, weight: 700, fill: accentGrad(f.left, f.top, f.left + 380, f.top + 240), maxW: 440, min: 90 });
      let cx = f.left, cy = f.top + 268;
      chips.forEach(c => { if (cx + measure(c, 20, 600) + 44 < f.left + 470) cx += pill(c, cx, cy) + 12; });
      if (r.pb) {
        const bw = measure('NEW PERSONAL BEST', 18, 700, 2) + 56;
        rr(f.left, cy + 62, bw, 48, 24); ctx.fillStyle = accentGrad(f.left, 0, f.left + bw, 0); ctx.fill();
        text('NEW PERSONAL BEST', f.left + bw / 2, cy + 87, { size: 18, weight: 700, spacing: 2, align: 'center', base: 'middle', fill: '#ffffff' });
      }
      const rx = f.left + 520, rw = f.right - rx;
      spark(spd, rx, f.top, rw, 226);
      const tw = (rw - 40) / 3, ty = f.top + 252, th = 126;
      tile(rx, ty, tw, th, 'ACCURACY', acc + '%', { bar: acc });
      tile(rx + tw + 20, ty, tw, th, 'RAW', String(r.raw));
      tile(rx + (tw + 20) * 2, ty, tw, th, 'TIME', (Math.round(r.duration * 10) / 10) + 's');
    } else {
      text('WORDS PER MINUTE', W / 2, f.top + 30, { size: 24, weight: 600, spacing: 5, fill: P.text2, align: 'center' });
      text(String(r.wpm), W / 2, f.top + 330, { size: 330, weight: 700, align: 'center', fill: accentGrad(W / 2 - 300, f.top, W / 2 + 300, f.top + 320), maxW: 760, min: 140 });
      let total = 0; const ws = chips.map(c => measure(c, 22, 600, 0.5) + 44 + 12); total = ws.reduce((a, b) => a + b, 0) - 12;
      let cx = W / 2 - total / 2; chips.forEach((c, i) => { pill(c, cx, f.top + 372, { size: 22 }); cx += ws[i]; });
      if (r.pb) {
        const bw = measure('NEW PERSONAL BEST', 20, 700, 2) + 64;
        rr(W / 2 - bw / 2, f.top + 452, bw, 54, 27); ctx.fillStyle = accentGrad(W / 2 - bw / 2, 0, W / 2 + bw / 2, 0); ctx.fill();
        text('NEW PERSONAL BEST', W / 2, f.top + 480, { size: 20, weight: 700, spacing: 2, align: 'center', base: 'middle', fill: '#ffffff' });
      }
      const cw = f.right - f.left;
      spark(spd, f.left, f.top + 540, cw, 280);
      const tw = (cw - 40) / 3, ty = f.top + 850, th = 150;
      tile(f.left, ty, tw, th, 'ACCURACY', acc + '%', { bar: acc });
      tile(f.left + tw + 20, ty, tw, th, 'RAW', String(r.raw));
      tile(f.left + (tw + 20) * 2, ty, tw, th, 'TIME', (Math.round(r.duration * 10) / 10) + 's');
    }
  }

  /* ---------------------------------------------------------
     Card: Versus
  --------------------------------------------------------- */
  function drawVersus(d, fmt) {
    const [W, H] = SIZES[fmt];
    const R = d.R, tall = fmt === 'tall';
    const f = frame(W, H, d.name || '');
    const won = !!R.won;
    const head = R.teams ? (R.teams[1] && R.teams[0].avg === R.teams[1].avg ? 'DRAW' : (won ? 'VICTORY' : 'RACE RESULT')) : (won ? 'VICTORY' : 'RACE RESULT');
    const sub = [R.format, d.modeText, d.langName].filter(Boolean).join('  ·  ');
    const tsize = tall ? 120 : 84;
    text(head, f.left, f.top + (tall ? 100 : 64), { size: tsize, weight: 700, spacing: tall ? 6 : 4, fill: won ? accentGrad(f.left, 0, f.left + 560, 0) : P.text, maxW: f.right - f.left });
    text(sub, f.left, f.top + (tall ? 160 : 108), { size: tall ? 26 : 22, fill: P.text2, spacing: 0.5 });

    let y = f.top + (tall ? 210 : 140);
    if (tall && !R.teams && R.rows.length) {              // hero plate with the top speed
      const top = R.rows[0], hh = 330;
      raised(f.left, y, f.right - f.left, hh, 40, 10, 22);
      text(won ? 'YOUR TOP SPEED' : 'WINNING SPEED', W / 2, y + 52, { size: 20, weight: 600, spacing: 5, align: 'center', fill: P.text2 });
      const hv = won && d.me ? d.me.wpm : top.wpm;
      text(String(hv), W / 2, y + 205, { size: 170, weight: 700, align: 'center', fill: accentGrad(W / 2 - 220, y, W / 2 + 220, y + 200), maxW: 560, min: 80 });
      text(won ? 'WPM' : top.name + ' · WPM', W / 2, y + 268, { size: 26, weight: 600, spacing: 4, align: 'center', fill: P.text2, maxW: f.right - f.left - 80 });
      y += hh + 32;
    }
    if (R.teams) {
      const n = R.teams.length, gap = 18, tw = (f.right - f.left - gap * (n - 1)) / n, th = tall ? 190 : 96;
      R.teams.forEach((t, i) => {
        const x = f.left + i * (tw + gap);
        raised(x, y, tw, th, 26, 7, 16);
        const tag = ['Team A', 'Team B', 'Team C', 'Team D'][t.team] || 'Team';
        text(tag.toUpperCase(), x + 26, y + th * (tall ? 0.28 : 0.3), { size: tall ? 18 : 15, weight: 600, spacing: 2.5, fill: P.text2, base: 'middle' });
        text(String(t.avg), x + 26, y + th * (tall ? 0.68 : 0.7), { size: tall ? 84 : 44, weight: 700, base: 'middle', fill: i === 0 ? accentGrad(x, 0, x + 140, 0) : P.text });
        text('avg WPM', x + tw - 26, y + th * (tall ? 0.68 : 0.7), { size: tall ? 20 : 16, align: 'right', base: 'middle', fill: P.text2 });
      });
      y += th + 28;
    }
    const avail = f.bottom - y;
    let rows = R.rows.slice();
    const rowGap = 12;
    let rowH = Math.min(tall ? 88 : 62, (avail - rowGap * (rows.length - 1)) / rows.length);
    let hidden = 0;
    if (rowH < (tall ? 56 : 44)) {
      rowH = tall ? 56 : 44;
      const fit = Math.max(1, Math.floor((avail + rowGap) / (rowH + rowGap)) - 1);
      hidden = rows.length - fit; rows = rows.slice(0, fit);
      if (d.me && !rows.some(r => r.id === d.me.id)) { rows[rows.length - 1] = d.me; }
    }
    rows.forEach((p, i) => {
      const yy = y + i * (rowH + rowGap), me = d.me && p.id === d.me.id;
      if (me) { raised(f.left, yy, f.right - f.left, rowH, rowH / 2.4, 6, 14); ctx.save(); rr(f.left, yy, f.right - f.left, rowH, rowH / 2.4); ctx.lineWidth = 3; ctx.strokeStyle = accentGrad(f.left, 0, f.right, 0); ctx.stroke(); ctx.restore(); }
      else inset(f.left, yy, f.right - f.left, rowH, rowH / 2.4, 4, 10);
      const rank = R.rows.indexOf(p) + 1, rc = f.left + rowH / 2 + 8;
      if (rank === 1) { circlePath(rc, yy + rowH / 2, rowH * 0.32); ctx.fillStyle = accentGrad(rc - 20, yy, rc + 20, yy + rowH); ctx.fill(); }
      text(String(rank), rc, yy + rowH / 2 + 1, { size: rowH * 0.38, weight: 700, align: 'center', base: 'middle', fill: rank === 1 ? '#fff' : P.text2 });
      const nx = f.left + rowH + 30;
      text(p.name + (me ? '  (you)' : ''), nx, yy + rowH / 2 + 1, { size: rowH * 0.4, weight: 600, base: 'middle', maxW: (f.right - nx) * 0.5 });
      const wt = p.wpm + ' WPM', wsz = rowH * 0.42, ww = measure(wt, wsz, 700);
      text(wt, f.right - 30, yy + rowH / 2 + 1, { size: wsz, weight: 700, align: 'right', base: 'middle', fill: me ? P.accent : P.text });
      text(p.left ? 'left' : p.finished ? p.acc + '% acc' : "didn't finish", f.right - 30 - ww - 24, yy + rowH / 2 + 1, { size: rowH * 0.3, align: 'right', base: 'middle', fill: P.text2 });
    });
    if (hidden > 0) text(`+${hidden} more`, W / 2, y + rows.length * (rowH + rowGap) + 8, { size: 20, align: 'center', fill: P.text2 });
  }

  /* ---------------------------------------------------------
     Card: achievement
  --------------------------------------------------------- */
  function drawAchievement(d, fmt) {
    const [W, H] = SIZES[fmt];
    const def = d.def, tall = fmt === 'tall';
    const f = frame(W, H, 'Achievement', null, new Date(d.at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }));
    const R = tall ? 210 : 112;
    const cx = tall ? W / 2 : f.left + 170, cy = tall ? f.top + 290 : f.top + 150;
    // outer glow ring
    ctx.save(); circlePath(cx, cy, R + 34); ctx.strokeStyle = rgba(P.accent, .18); ctx.lineWidth = 3; ctx.stroke(); circlePath(cx, cy, R + 62); ctx.strokeStyle = rgba(P.accent2, .10); ctx.stroke(); ctx.restore();
    raisedCircle(cx, cy, R, 16, 34);
    insetCircle(cx, cy, R - 30, 9, 18);
    ctx.save(); circlePath(cx, cy, R - 12); ctx.lineWidth = 7; ctx.strokeStyle = accentGrad(cx - R, cy - R, cx + R, cy + R); ctx.shadowColor = rgba(P.accent, .5); ctx.shadowBlur = 18; ctx.stroke(); ctx.restore();
    icon(def.icon, cx, cy, R * 0.82, P.accent, 1.5);

    const tx = tall ? W / 2 : cx + R + 100, al = tall ? 'center' : 'left', ty = tall ? cy + R + 110 : f.top + 50;
    const maxW = tall ? f.right - f.left : f.right - tx;
    text('ACHIEVEMENT UNLOCKED', tx, ty, { size: tall ? 24 : 19, weight: 700, spacing: 5, fill: P.accent, align: al });
    text(def.name, tx, ty + (tall ? 100 : 78), { size: tall ? 96 : 68, weight: 700, align: al, maxW, min: 36 });
    const lines = wrap(def.desc, tall ? 32 : 26, 500, maxW);
    lines.slice(0, 3).forEach((l, i) => text(l, tx, ty + (tall ? 170 : 130) + i * (tall ? 46 : 38), { size: tall ? 32 : 26, fill: P.text2, align: al }));

    // collection progress
    const by = tall ? f.bottom - 70 : f.bottom - 50, bw = tall ? f.right - f.left : f.right - f.left;
    text(`${d.done} of ${d.total} achievements`, f.left, by - 18, { size: 20, weight: 600, fill: P.text2 });
    inset(f.left, by, bw, 18, 9, 3, 7);
    const pw = Math.max(18, bw * d.done / d.total);
    rr(f.left, by, pw, 18, 9); ctx.fillStyle = accentGrad(f.left, 0, f.left + bw, 0); ctx.fill();
  }

  /* ---------------------------------------------------------
     Dialog: styles, format, download / copy / share
  --------------------------------------------------------- */
  const store = {
    get: k => { try { return localStorage.getItem('neutype:' + k) || ''; } catch { return ''; } },
    set: (k, v) => { try { localStorage.setItem('neutype:' + k, v); } catch { /* ignore */ } }
  };
  const cur = { kind: '', data: null, style: store.get('cardstyle') || 'theme', fmt: '' };
  const DEFAULT_FMT = { result: 'wide', versus: 'tall', achievement: 'wide' };
  const TITLES = { result: 'Result card', versus: 'Race card', achievement: 'Achievement card' };

  function render() {
    const [W, H] = SIZES[cur.fmt];
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    P = paletteFor(cur.style);
    try {
      if (cur.kind === 'result') drawResult(cur.data, cur.fmt);
      else if (cur.kind === 'versus') drawVersus(cur.data, cur.fmt);
      else drawAchievement(cur.data, cur.fmt);
    } catch (err) { console.error('card draw failed', err); }
    cv.setAttribute('aria-label', TITLES[cur.kind] + ' preview');
    cv.style.aspectRatio = W + ' / ' + H;
    document.documentElement.dataset.cardReady = cur.kind + ':' + cur.fmt + ':' + cur.style;
  }

  function buildControls() {
    const box = $('#cardThemes');
    const styles = [['theme', 'My theme'], ...Object.entries(PRESETS).map(([k, v]) => [k, v.name])];
    box.innerHTML = styles.map(([k, n]) => `<button class="btn" type="button" data-cstyle="${k}" aria-pressed="${cur.style === k}">${n}</button>`).join('') +
      '<span class="card-sep" aria-hidden="true"></span>' +
      ['wide', 'tall'].map(k => `<button class="btn" type="button" data-cfmt="${k}" aria-pressed="${cur.fmt === k}">${k === 'wide' ? 'Wide' : 'Tall'}</button>`).join('');
  }

  $('#cardThemes').addEventListener('click', e => {
    const s = e.target.closest('[data-cstyle]'), f = e.target.closest('[data-cfmt]');
    if (s) { cur.style = s.dataset.cstyle; store.set('cardstyle', cur.style); }
    else if (f) cur.fmt = f.dataset.cfmt;
    else return;
    buildControls(); render();
  });

  const toBlob = () => new Promise(res => cv.toBlob(res, 'image/png'));
  const fileName = () => `softra-${cur.kind}-${Date.now().toString(36)}.png`;

  $('#cardDownload').addEventListener('click', async () => {
    const blob = await toBlob();
    if (!blob) { N.toast('Could not create the image'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName(); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    N.toast('Card saved');
    if (N.ach) N.ach.onShare();
  });
  $('#cardCopy').addEventListener('click', async () => {
    try {
      const blob = await toBlob();
      if (!navigator.clipboard || !window.ClipboardItem || !window.isSecureContext) throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      N.toast('Card copied. Paste it anywhere.');
      if (N.ach) N.ach.onShare();
    } catch { N.toast('Copying images is not supported here. Use Download instead.'); }
  });
  $('#cardShare').addEventListener('click', async () => {
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName(), { type: 'image/png' });
      await navigator.share({ files: [file], title: 'Softra', text: 'My Softra card' });
      if (N.ach) N.ach.onShare();
    } catch (err) { if (!err || err.name !== 'AbortError') N.toast('Sharing is not available. Use Download instead.'); }
  });
  $('#cardClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { if (N.focus) N.focus(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  async function open(kind, data) {
    cur.kind = kind; cur.data = data; cur.fmt = DEFAULT_FMT[kind] || 'wide';
    if (kind === 'result' && !data.samples) data.samples = (N.samples ? N.samples() : []);
    $('#cardTitle').textContent = TITLES[kind] || 'Share card';
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 20px Poppins'), document.fonts.load('600 20px Poppins')]); } catch { /* fall back to system fonts */ }
    buildControls(); render();
    try {
      const probe = new File([''], 'x.png', { type: 'image/png' });
      $('#cardShare').hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
    } catch { $('#cardShare').hidden = true; }
    if (!dlg.open) dlg.showModal();
  }

  N.cards = { open, PRESETS };
})();
