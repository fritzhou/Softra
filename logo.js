/* =========================================================
   Softra: theme-aware logo

   One vector definition, three uses:
     - the header badge (re-coloured whenever the theme or accent changes)
     - the browser-tab favicon (a fresh SVG data URL on every change)
     - the share cards (drawn on a canvas with the card's own palette)
   Colors are worked out from the active theme: tile = theme background
   blended with the accent, letter = near white, shadows = darker accent.
   ========================================================= */
(() => {
  'use strict';
  const N = window.NEUTYPE || (window.NEUTYPE = {});

  /* drawing coordinates: 100 x 100 tile */
  const S_PATH = 'M78 26C68 18 36 17 36 34C36 49 69 44 69 59C69 75 38 74 26 64';
  const LINES = [[10, 36, 25, 36], [7, 49, 25, 49], [14, 62, 29, 62]];
  const KB = { x: 30, y: 78, w: 54, h: 13, r: 6 };

  const parse = c => {
    c = String(c).trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, x => x + x); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    return [124, 131, 253];
  };
  const mix = (a, b, t) => { const x = parse(a), y = parse(b); return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join(''); };

  /* colors for a given background + accent */
  function colors(bg, accent) {
    return {
      top: mix(bg, accent, 0.5),
      bottom: mix(bg, accent, 0.95),
      face: mix('#ffffff', accent, 0.06),
      edge: mix(accent, '#000000', 0.38),
      line: mix('#ffffff', accent, 0.3),
      key: mix(accent, '#000000', 0.12),
      shine: '#ffffff'
    };
  }

  /* SVG markup (no <svg> wrapper) */
  function inner(c, id = 'lg') {
    return `<defs><linearGradient id="${id}-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.bottom}"/></linearGradient></defs>
<rect x="2" y="2" width="96" height="96" rx="27" fill="url(#${id}-t)"/>
<rect x="3.5" y="3.5" width="93" height="93" rx="25.5" fill="none" stroke="${c.shine}" stroke-opacity=".35" stroke-width="2"/>
<g stroke="${c.line}" stroke-width="5.5" stroke-linecap="round" opacity=".92">${LINES.map(l => `<path d="M${l[0]} ${l[1]}H${l[2]}"/>`).join('')}</g>
<path d="${S_PATH}" transform="translate(0 3.5)" fill="none" stroke="${c.edge}" stroke-width="12.5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
<path d="${S_PATH}" fill="none" stroke="${c.face}" stroke-width="12.5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${KB.x}" y="${KB.y}" width="${KB.w}" height="${KB.h}" rx="${KB.r}" fill="${c.face}"/>
<g fill="${c.key}">${[0, 1, 2, 3, 4].map(i => `<rect x="${34 + i * 9.6}" y="${81}" width="6.4" height="3.2" rx="1.2"/>`).join('')}${[0, 1, 2, 3].map(i => `<rect x="${38.5 + i * 9.6}" y="${86}" width="6.4" height="2.6" rx="1.1"/>`).join('')}</g>`;
  }
  const svg = (c, size = 64, id = 'f') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${inner(c, id)}</svg>`;

  /* canvas drawing (for share cards) */
  function draw(ctx, x, y, size, bg, accent) {
    const c = colors(bg, accent), k = size / 100;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    const rr = (a, b, w, h, r) => { ctx.beginPath(); ctx.moveTo(a + r, b); ctx.arcTo(a + w, b, a + w, b + h, r); ctx.arcTo(a + w, b + h, a, b + h, r); ctx.arcTo(a, b + h, a, b, r); ctx.arcTo(a, b, a + w, b, r); ctx.closePath(); };
    const g = ctx.createLinearGradient(2, 2, 98, 98); g.addColorStop(0, c.top); g.addColorStop(1, c.bottom);
    rr(2, 2, 96, 96, 27); ctx.fillStyle = g; ctx.fill();
    rr(3.5, 3.5, 93, 93, 25.5); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = .92; ctx.strokeStyle = c.line; ctx.lineWidth = 5.5;
    LINES.forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); });
    ctx.globalAlpha = 1;
    const p = new Path2D(S_PATH);
    ctx.save(); ctx.translate(0, 3.5); ctx.globalAlpha = .85; ctx.strokeStyle = c.edge; ctx.lineWidth = 12.5; ctx.stroke(p); ctx.restore();
    ctx.strokeStyle = c.face; ctx.lineWidth = 12.5; ctx.stroke(p);
    rr(KB.x, KB.y, KB.w, KB.h, KB.r); ctx.fillStyle = c.face; ctx.fill();
    ctx.fillStyle = c.key;
    for (let i = 0; i < 5; i++) { rr(34 + i * 9.6, 81, 6.4, 3.2, 1.2); ctx.fill(); }
    for (let i = 0; i < 4; i++) { rr(38.5 + i * 9.6, 86, 6.4, 2.6, 1.1); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- apply to the page ---------- */
  let raf = 0;
  function apply() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const bg = cs.getPropertyValue('--bg').trim() || '#E8EAF0', accent = cs.getPropertyValue('--accent').trim() || '#7C83FD';
      const c = colors(bg, accent);
      document.querySelectorAll('.logo-mark').forEach(el => { el.innerHTML = inner(c, 'hd'); });
      let link = document.querySelector('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link); }
      link.type = 'image/svg+xml';
      link.href = 'data:image/svg+xml,' + encodeURIComponent(svg(c, 64));
    });
  }
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'data-tone'] });
  document.addEventListener('DOMContentLoaded', apply);
  apply();
  setTimeout(apply, 400);       // after the theme fade has settled

  N.logo = { draw, colors, svg, apply };
})();
