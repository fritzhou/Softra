/* =========================================================
   Softra: Practice
     - Lessons (Beginner, Intermediate, Pro) with stars
     - Daily challenge, Speed ladder
     - Finger drills, Letter pairs (bigrams and trigrams)
     - Zen mode, Blind mode, Book reader (resume later)

   Each one starts a "session" in the typing engine (app.js):
     { kind, label, mode, gen(n), zen, blind, onFinish(res) }
   Sessions never set personal bests. Progress is kept in localStorage.
   ========================================================= */
(() => {
  'use strict';
  const N = window.NEUTYPE;
  if (!N) return;

  const $ = s => document.querySelector(s);
  const esc = N.esc;
  const WORDS = (window.SOFTRA_WORDS && window.SOFTRA_WORDS.length ? window.SOFTRA_WORDS : 'the and for are but not you all can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use'.split(' '));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('neutype:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('neutype:' + k, JSON.stringify(v)); return true; } catch { return false; } }
  };
  const rand = n => Math.floor(Math.random() * n);
  const pick = a => a[rand(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------------------------------------------------------
     Word makers
  --------------------------------------------------------- */
  const HOME_WORDS = 'ask asks add adds all alas dad dads fad fall falls flag flags flask flash gas gash glad glass had hall halls half has hash lad lads lag lags lash sad sag salad shall slash gals hag haha jaga shad'.split(' ').filter(w => w !== 'jaga' && w !== 'haha');
  const inSet = (w, set) => { for (const ch of w) if (!set.includes(ch)) return false; return true; };
  const hasAny = (w, keys) => { for (const ch of w) if (keys.includes(ch)) return true; return false; };

  /* pseudo-words built from some letters, each with at least one of the "must" letters */
  function synth(allowed, must, n) {
    const out = [];
    const a = allowed.split(''), m = (must || allowed).split('');
    while (out.length < n) {
      const len = 2 + rand(4);
      let w = '';
      for (let i = 0; i < len; i++) w += pick(Math.random() < 0.55 ? m : a);
      if (hasAny(w, m.join(''))) out.push(w);
    }
    return out;
  }
  /* n words that only use `allowed` letters and include a `must` letter */
  function lettersWords(allowed, must, n) {
    must = must || allowed;
    let pool = [...new Set([...HOME_WORDS, ...WORDS.slice(0, 3000)])].filter(w => w.length >= 2 && inSet(w, allowed) && hasAny(w, must));
    let out = [];
    if (pool.length >= 30) {
      while (out.length < n) out = out.concat(shuffle(pool));
      out = out.slice(0, n);
    } else {
      const real = pool.length ? shuffle(pool) : [];
      const fake = synth(allowed, must, n);
      for (let i = 0; i < n; i++) out.push(i % 2 === 0 && real.length ? real[(i / 2) % real.length | 0] : fake[i]);
    }
    return out;
  }
  const topWords = (count, min = 2, max = 12) => WORDS.slice(0, count).filter(w => w.length >= min && w.length <= max);
  function draw(list, n) { let out = []; while (out.length < n) out = out.concat(shuffle(list)); return out.slice(0, n); }

  function withCapsAndPunct(list, capRate = 0.35, puncRate = 0.25) {
    let cap = true;
    return list.map(w => {
      if (cap || Math.random() < capRate) w = w[0].toUpperCase() + w.slice(1);
      cap = false;
      if (Math.random() < puncRate) {
        const p = pick([',', ',', '.', '.', '?', '!', ';']);
        w += p;
        if (p === '.' || p === '?' || p === '!') cap = true;
      }
      return w;
    });
  }
  function numberWords(n) {
    const short = topWords(200, 2, 5);
    const out = [];
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.65) {
        const len = 1 + rand(4);
        let t = String(1 + rand(9)); for (let k = 1; k < len; k++) t += rand(10);
        if (Math.random() < 0.12) t = t + '.' + rand(10) + rand(10);
        if (Math.random() < 0.08) t = t + '%';
        out.push(t);
      } else out.push(pick(short));
    }
    return out;
  }
  function symbolWords(n) {
    const w = () => pick(topWords(300, 2, 6));
    const make = [
      () => `(${w()})`, () => `[${w()}]`, () => `{${w()}}`, () => `"${w()}"`, () => `'${w()}'`,
      () => `${w()}_${w()}`, () => `${w()}-${w()}`, () => `#${w()}`, () => `@${w()}`, () => `${w()}=${w()}`,
      () => `${w()}+${w()}`, () => `${w()}/${w()}`, () => `$${1 + rand(99)}`, () => `${w()}&${w()}`, () => `${w()}*`, () => `${w()}:`, () => `<${w()}>`
    ];
    return Array.from({ length: n }, () => pick(make)());
  }

  /* ---------------------------------------------------------
     Lessons
  --------------------------------------------------------- */
  const HOME = 'asdfghjkl';
  const TIERS = {
    beginner: { name: 'Beginner', blurb: 'Meet the home row, one pair of keys at a time.', acc: [90, 95, 98], wpm: [8, 8, 8], count: 20 },
    intermediate: { name: 'Intermediate', blurb: 'Top row and bottom row. Every letter, up to speed.', acc: [92, 96, 98], wpm: [18, 24, 30], count: 25 },
    pro: { name: 'Pro', blurb: 'Capitals, numbers, symbols and speed.', acc: [94, 97, 98], wpm: [28, 38, 48], count: 30 }
  };
  const L = (id, tier, title, keys, make, extra) => ({ id, tier, title, keys, make, extra: extra || 0 });
  const LESSONS = [
    L('b1', 'beginner', 'F and J', 'fj', n => synthFor('fj', n)),
    L('b2', 'beginner', 'D and K', 'dk', n => synthFor('fjdk', n, 'dk')),
    L('b3', 'beginner', 'S and L', 'sl', n => synthFor('fjdksl', n, 'sl')),
    L('b4', 'beginner', 'A, G and H', 'agh', n => lettersWords(HOME, 'agh', n)),
    L('b5', 'beginner', 'Home row words', HOME, n => lettersWords(HOME, HOME, n)),
    L('b6', 'beginner', 'Short words', 'abc', n => draw(topWords(400, 2, 4), n)),

    L('i1', 'intermediate', 'E and I', 'ei', n => lettersWords(HOME + 'ei', 'ei', n)),
    L('i2', 'intermediate', 'R and U', 'ru', n => lettersWords(HOME + 'eiru', 'ru', n)),
    L('i3', 'intermediate', 'T, Y and O', 'tyo', n => lettersWords(HOME + 'eirutyo', 'tyo', n)),
    L('i4', 'intermediate', 'W, P and Q', 'wpq', n => lettersWords(HOME + 'eirutyowpq', 'wpq', n)),
    L('i5', 'intermediate', 'V, N, C and M', 'vncm', n => lettersWords(HOME + 'eirutyowpqvncm', 'vncm', n)),
    L('i6', 'intermediate', 'X, B, Z and all letters', 'xbz', n => mixed(n, 'xbz')),

    L('p1', 'pro', 'Capitals and punctuation', 'Aa.,', n => withCapsAndPunct(draw(topWords(400, 2, 8), n))),
    L('p2', 'pro', 'Number row', '0-9', n => numberWords(n)),
    L('p3', 'pro', 'Symbols', '()[]#@', n => symbolWords(n)),
    L('p4', 'pro', 'Long words', '8+', n => draw(WORDS.filter(w => w.length >= 8), n)),
    L('p5', 'pro', 'Speed round', 'wpm', n => draw(topWords(200, 2, 6), n), 10),
    L('p6', 'pro', 'Final exam', 'all', n => withCapsAndPunct(numberSprinkle(draw(topWords(800, 2, 9), n))), 12)
  ];
  function synthFor(allowed, n, must) {
    must = must || allowed;
    const tokens = [];
    const base = lettersWords(allowed, must, n);
    base.forEach(t => tokens.push(t));
    return tokens;
  }
  function mixed(n, must) {
    const pool = WORDS.slice(0, 3000).filter(w => hasAny(w, must));
    const a = pool.length >= 10 ? draw(pool, Math.ceil(n / 2)) : [];
    return shuffle(a.concat(draw(topWords(1500, 3, 8), n - a.length)));
  }
  function numberSprinkle(list) { return list.map(w => (Math.random() < 0.12 ? String(1 + rand(999)) : w)); }

  const lessonOf = id => LESSONS.find(l => l.id === id);
  const inTier = t => LESSONS.filter(l => l.tier === t);
  const progress = () => store.get('lessons', {}) || {};
  const allUnlocked = () => !!store.get('lessons_open', false);

  function rule(l, star) {
    const t = TIERS[l.tier];
    return { acc: t.acc[star], wpm: t.wpm[star] + (star === 0 ? Math.round(l.extra / 2) : l.extra) };
  }
  function starsFor(l, res) {
    let s = 0;
    for (let i = 0; i < 3; i++) { const r = rule(l, i); if (res.acc >= r.acc && res.wpm >= r.wpm) s = i + 1; else break; }
    return s;
  }
  function isUnlocked(i) {
    if (allUnlocked() || i === 0) return true;
    const p = progress()[LESSONS[i - 1].id];
    return !!(p && p.stars >= 1);
  }
  function tierStats(p) {
    const out = {};
    Object.keys(TIERS).forEach(t => {
      const ls = inTier(t);
      out[t] = { total: ls.length, passed: ls.filter(l => p[l.id] && p[l.id].stars >= 1).length, gold: ls.filter(l => p[l.id] && p[l.id].stars >= 3).length };
    });
    return out;
  }

  function startLesson(id) {
    const l = lessonOf(id);
    if (!l) return;
    const t = TIERS[l.tier];
    N.startSession({
      kind: 'lesson', label: `${t.name} lesson: ${l.title}`,
      mode: { type: 'words', value: t.count },
      gen: n => l.make(n),
      onFinish: res => finishLesson(l, res)
    });
  }
  function finishLesson(l, res) {
    const p = progress();
    const stars = starsFor(l, res);
    const prev = p[l.id] || { stars: 0, tries: 0, wpm: 0, acc: 0 };
    const rec = { stars: Math.max(prev.stars, stars), tries: prev.tries + 1, wpm: Math.max(prev.wpm, res.wpm), acc: Math.max(prev.acc, res.acc), at: Date.now() };
    p[l.id] = rec;
    store.set('lessons', p);
    const ts = tierStats(p);
    const total = LESSONS.length;
    const passedCount = LESSONS.filter(x => p[x.id] && p[x.id].stars >= 1).length;
    let ach = [];
    if (stars >= 1 && N.ach) ach = N.ach.onPractice('lesson', { passedCount, total, tiers: ts });
    const idx = LESSONS.indexOf(l), nextL = LESSONS[idx + 1];
    const need = rule(l, 0);
    if (stars === 0) {
      return {
        status: 'fail', title: 'Not yet, try again',
        note: `You need ${need.acc}% accuracy${need.wpm > 8 ? ' and ' + need.wpm + ' WPM' : ''} to pass. You got ${res.acc}%${need.wpm > 8 ? ' and ' + res.wpm + ' WPM' : ''}. Slow down a little and aim for clean keystrokes.`,
        achievements: ach
      };
    }
    const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const more = stars < 3 ? ` For ${stars + 1} stars: ${rule(l, stars).acc}% accuracy and ${rule(l, stars).wpm} WPM.` : ' Perfect, that is the top rating.';
    return {
      status: 'pass', title: `Lesson passed ${starText}`, note: `${l.title}: ${res.acc}% accuracy, ${res.wpm} WPM.${more}`,
      next: nextL ? () => startLesson(nextL.id) : null, nextLabel: nextL ? 'Next lesson' : '', achievements: ach
    };
  }

  /* ---------------------------------------------------------
     Daily challenge
  --------------------------------------------------------- */
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function seeded(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function dailyWords(key) {
    const r = seeded('softra-' + key);
    const pool = topWords(1500, 3, 8);
    const out = [];
    for (let i = 0; i < 30; i++) out.push(pool[Math.floor(r() * pool.length)]);
    return out;
  }
  function startDaily() {
    const key = dayKey();
    const words = dailyWords(key);
    N.startSession({
      kind: 'daily', label: 'Daily challenge ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
      mode: { type: 'words', value: 30 }, gen: () => words.slice(),
      onFinish: res => {
        const d = store.get('daily_ch', {}) || {};
        const prev = d[key];
        const better = !prev || res.wpm > prev.wpm;
        if (better) d[key] = { wpm: res.wpm, acc: res.acc, at: Date.now() };
        store.set('daily_ch', d);
        const days = Object.keys(d).length;
        const ach = N.ach ? N.ach.onPractice('daily', { days }) : [];
        return {
          status: 'pass', title: better ? 'Best of the day' : 'Daily challenge done',
          note: `${res.wpm} WPM, ${res.acc}% accuracy. ${prev && !better ? `Your best today is ${prev.wpm} WPM. ` : ''}You have finished ${days} daily ${days === 1 ? 'challenge' : 'challenges'}. A new text arrives tomorrow.`,
          achievements: ach
        };
      }
    });
  }

  /* ---------------------------------------------------------
     Speed ladder
  --------------------------------------------------------- */
  const LADDER = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  const ladderLevel = () => Math.min(LADDER.length, Math.max(1, (store.get('ladder', { level: 1 }) || {}).level || 1));
  function startLadder(level) {
    level = level || ladderLevel();
    const target = LADDER[level - 1];
    N.startSession({
      kind: 'ladder', label: `Speed ladder, level ${level}: ${target} WPM`,
      mode: { type: 'words', value: 25 },
      gen: n => draw(topWords(1200, 2, 8), n),
      onFinish: res => {
        const st = store.get('ladder', { level: 1, cleared: 0 }) || {};
        const cur = ladderLevel();
        const passed = res.wpm >= target && res.acc >= 95;
        let cleared = st.cleared || 0;
        if (passed) {
          cleared = Math.max(cleared, level);
          store.set('ladder', { level: level === cur ? Math.min(LADDER.length, cur + 1) : cur, cleared });
        }
        const ach = N.ach ? N.ach.onPractice('ladder', { cleared }) : [];
        if (!passed) return { status: 'fail', title: `Level ${level} not cleared`, note: `Target: ${target} WPM with 95% accuracy. You got ${res.wpm} WPM and ${res.acc}%. Try again.`, achievements: ach };
        const nextLevel = level + 1;
        return {
          status: 'pass', title: `Level ${level} cleared`,
          note: `${res.wpm} WPM at ${res.acc}% accuracy.${nextLevel <= LADDER.length ? ` Next target: ${LADDER[nextLevel - 1]} WPM.` : ' You reached the top of the ladder!'}`,
          next: nextLevel <= LADDER.length ? () => startLadder(nextLevel) : null, nextLabel: `Level ${nextLevel}`, achievements: ach
        };
      }
    });
  }

  /* ---------------------------------------------------------
     Zen and Blind
  --------------------------------------------------------- */
  function startZen() {
    N.startSession({
      kind: 'zen', label: 'Zen mode', zen: true, mode: { type: 'time', value: 3600 },
      gen: n => draw(topWords(1500, 3, 8), Math.max(n, 80)),
      onFinish: o => {
        if (N.ach && o && o.words >= 50) N.ach.showNew(N.ach.onPractice('zen', { words: o.words }), true);
      }
    });
  }
  function startBlind() {
    N.startSession({
      kind: 'blind', label: 'Blind mode', blind: true,
      onFinish: res => {
        const ach = N.ach ? N.ach.onPractice('blind', { acc: res.acc, wpm: res.wpm }) : [];
        return { status: 'info', title: 'Colors are back on', note: `You finished blind with ${res.acc}% accuracy at ${res.wpm} WPM. Look at the red letters in the chart below to see where you slipped.`, achievements: ach };
      }
    });
  }

  /* ---------------------------------------------------------
     Finger drills
  --------------------------------------------------------- */
  const FINGERS = [
    ['l5', 'Left pinky', 'qaz'], ['l4', 'Left ring', 'wsx'], ['l3', 'Left middle', 'edc'], ['l2', 'Left index', 'rfvtgb'],
    ['r2', 'Right index', 'yhnujm'], ['r3', 'Right middle', 'ik'], ['r4', 'Right ring', 'ol'], ['r5', 'Right pinky', 'p']
  ];
  const fingerSel = new Set(['l2', 'r2']);
  function startFingers() {
    if (!fingerSel.size) { N.toast('Pick at least one finger'); return; }
    const picked = FINGERS.filter(f => fingerSel.has(f[0]));
    const letters = picked.map(f => f[2]).join('');
    const label = picked.length === 8 ? 'Finger drill: all fingers' : 'Finger drill: ' + picked.map(f => f[1].toLowerCase()).join(', ');
    N.startSession({
      kind: 'finger', label, mode: { type: 'words', value: 25 },
      gen: n => lettersWords(letters, letters, n),
      onFinish: res => {
        const ach = N.ach ? N.ach.onPractice('finger', { acc: res.acc, wpm: res.wpm }) : [];
        return { status: res.acc >= 95 ? 'pass' : 'info', title: 'Drill finished', note: `${res.acc}% accuracy, ${res.wpm} WPM. ${res.acc >= 95 ? 'Clean work.' : 'Aim for 95% accuracy before you speed up.'}`, achievements: ach };
      }
    });
  }

  /* ---------------------------------------------------------
     Letter pairs and triplets
  --------------------------------------------------------- */
  const COMMON_PAIRS = 'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur'.split(' ');
  const COMMON_TRIPLES = 'the and ing ion tio ent ati for her ter hat tha ere ate his con res ver all ons nce men ith ted ers pro thi wit are ess not ive was ect rea com eve per int est sta cti ica ist ear ain one our iti rat'.split(' ');
  function weakPairs() {
    const all = store.get('pairstats', {}) || {};
    return Object.entries(all).filter(([, s]) => s.t >= 4 && s.m > 0).map(([k, s]) => ({ k, rate: s.m / s.t, m: s.m, t: s.t }))
      .sort((a, b) => b.rate - a.rate || b.m - a.m).slice(0, 10);
  }
  const wordCache = {};
  function wordsWith(t) {
    if (!wordCache[t]) wordCache[t] = WORDS.filter(w => w.includes(t)).slice(0, 120);
    return wordCache[t];
  }
  function pairWords(targets, n) {
    const out = [];
    let i = 0;
    while (out.length < n) {
      const t = targets[i++ % targets.length];
      const pool = wordsWith(t);
      out.push(pool.length && Math.random() < 0.85 ? pick(pool) : t + t + t[0]);
    }
    return shuffle(out);
  }
  function startPairs(kind) {
    let targets, label;
    if (kind === 'weak') { targets = weakPairs().map(p => p.k); label = 'Letter pairs: your weak pairs'; }
    else if (kind === 'triples') { targets = shuffle(COMMON_TRIPLES).slice(0, 12); label = 'Letter pairs: common triplets'; }
    else { targets = shuffle(COMMON_PAIRS).slice(0, 12); label = 'Letter pairs: common pairs'; }
    if (!targets.length) { N.toast('Finish a few tests first so I can find your weak pairs'); return; }
    N.startSession({
      kind: 'pairs', label, mode: { type: 'words', value: 25 },
      gen: n => pairWords(targets, n),
      onFinish: res => {
        const ach = N.ach ? N.ach.onPractice('pairs', { acc: res.acc, wpm: res.wpm }) : [];
        return { status: res.acc >= 95 ? 'pass' : 'info', title: 'Drill finished', note: `${res.acc}% accuracy, ${res.wpm} WPM. Focus pairs: ${targets.slice(0, 8).join(', ')}.`, achievements: ach };
      }
    });
  }

  /* ---------------------------------------------------------
     Book reader
  --------------------------------------------------------- */
  const PAGE = 40;
  const books = () => store.get('books', []) || [];
  const saveBooks = b => store.set('books', b);
  function clean(text) {
    return String(text)
      .replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[   ]/g, ' ')
      .replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim();
  }
  function addBook(title, text) {
    text = clean(text);
    if (text.split(' ').length < 20) { N.toast('Add at least 20 words'); return false; }
    if (text.length > 150000) { N.toast('That is too long. Keep it under 150,000 characters.'); return false; }
    const list = books();
    if (list.length >= 8) { N.toast('You can keep 8 books. Delete one first.'); return false; }
    list.push({ id: Date.now().toString(36), title: (title || 'Untitled').trim().slice(0, 40) || 'Untitled', text, pos: 0, done: false });
    if (!saveBooks(list)) { N.toast('Not enough room in this browser to save that text'); return false; }
    return true;
  }
  function startBook(id) {
    const b = books().find(x => x.id === id);
    if (!b) return;
    const words = b.text.split(' ');
    if (b.pos >= words.length) b.pos = 0;
    const page = words.slice(b.pos, b.pos + PAGE);
    const pages = Math.ceil(words.length / PAGE), no = Math.floor(b.pos / PAGE) + 1;
    N.startSession({
      kind: 'book', label: `${b.title}, page ${no} of ${pages}`, mode: { type: 'words', value: page.length },
      gen: () => page.slice(),
      onFinish: res => {
        const list = books(), me = list.find(x => x.id === id);
        if (!me) return null;
        me.pos += page.length;
        const done = me.pos >= words.length;
        if (done) { me.done = true; me.pos = 0; }
        saveBooks(list);
        const ach = N.ach ? N.ach.onPractice('book', { done }) : [];
        return {
          status: 'pass', title: done ? `You finished ${me.title}` : `Page ${no} of ${pages} done`,
          note: `${res.wpm} WPM, ${res.acc}% accuracy. ${done ? 'It will start over from page 1 if you open it again.' : 'Your place is saved, so you can continue any time.'}`,
          next: done ? null : () => startBook(id), nextLabel: 'Next page', achievements: ach
        };
      }
    });
  }

  /* ---------------------------------------------------------
     Rendering
  --------------------------------------------------------- */
  function renderLessons() {
    const box = $('#lessonTiers');
    if (!box) return;
    const p = progress(), ts = tierStats(p);
    const passed = LESSONS.filter(l => p[l.id] && p[l.id].stars >= 1).length;
    $('#lessonCount').textContent = `${passed} / ${LESSONS.length} passed`;
    let nextIdx = LESSONS.findIndex((l, i) => isUnlocked(i) && !(p[l.id] && p[l.id].stars >= 1));
    box.innerHTML = Object.keys(TIERS).map(t => {
      const T = TIERS[t], s = ts[t];
      return `<div class="neu panel lesson-tier">
        <div class="lesson-head"><div><h3>${T.name}</h3><p>${T.blurb}</p></div>
          <span class="lesson-prog">${s.passed} / ${s.total}${s.gold ? ` · ${s.gold} gold` : ''}</span></div>
        <div class="ach-bar neu-inset" aria-hidden="true"><span style="width:${Math.round(100 * s.passed / s.total)}%"></span></div>
        <div class="lesson-grid">${inTier(t).map(l => {
          const i = LESSONS.indexOf(l), rec = p[l.id], open = isUnlocked(i), st = rec ? rec.stars : 0, r0 = rule(l, 0);
          return `<button type="button" class="lesson-card${st ? ' done' : ''}${i === nextIdx ? ' next' : ''}" data-lesson="${l.id}"${open ? '' : ' disabled'} aria-label="${esc(l.title)}${open ? '' : ', locked'}">
            <span class="lesson-no">${l.id.toUpperCase()}</span>
            <strong>${esc(l.title)}</strong>
            <span class="lesson-keys">${esc(l.keys.length > 12 ? l.keys.slice(0, 12) : l.keys.split('').join(' '))}</span>
            <span class="lesson-stars" aria-label="${st} of 3 stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
            <small>${open ? `${r0.acc}%${r0.wpm > 8 ? ' · ' + r0.wpm + ' WPM' : ''} to pass` : 'Locked'}</small></button>`;
        }).join('')}</div></div>`;
    }).join('') + `<p class="hint lesson-open">${allUnlocked() ? 'All lessons are open.' : 'Lessons unlock one after another. Already know the keys?'} <button class="link-btn" type="button" id="lessonOpenAll">${allUnlocked() ? 'Lock again' : 'Open all lessons'}</button></p>`;
  }

  function renderStatus() {
    const d = (store.get('daily_ch', {}) || {})[dayKey()];
    const ds = $('#dailyStatus');
    if (ds) ds.textContent = d ? `Done today: ${d.wpm} WPM, ${d.acc}%. Beat it?` : 'Same text for everyone today.';
    const ls = $('#ladderStatus');
    if (ls) { const lv = ladderLevel(); ls.textContent = `Level ${lv} of ${LADDER.length}: reach ${LADDER[lv - 1]} WPM.`; }
  }

  let panel = '';
  function renderPanel() {
    const box = $('#trainPanel');
    if (!box) return;
    box.hidden = !panel;
    $$all('[data-train]').forEach(b => b.setAttribute('aria-pressed', b.dataset.train === panel));
    if (panel === 'fingers') {
      box.innerHTML = `<h3>Finger drills</h3><p class="hint">Pick the fingers to train. Words are built only from the letters those fingers press (standard QWERTY positions).</p>
        <div class="finger-grid" role="group" aria-label="Fingers">${FINGERS.map(f => `<button class="btn" type="button" data-finger="${f[0]}" aria-pressed="${fingerSel.has(f[0])}"><span>${f[1]}</span><kbd>${f[2].toUpperCase().split('').join(' ')}</kbd></button>`).join('')}</div>
        <div class="train-actions"><button class="btn" type="button" data-finger-set="left">Left hand</button><button class="btn" type="button" data-finger-set="right">Right hand</button><button class="btn" type="button" data-finger-set="all">Both hands</button><button class="btn primary" type="button" id="fingerStart">Start drill</button></div>`;
    } else if (panel === 'pairs') {
      const wp = weakPairs();
      box.innerHTML = `<h3>Letter pairs</h3><p class="hint">Words that are full of the letter combinations you want to smooth out.</p>
        <div class="weak-list">${wp.length ? wp.map(w => `<span class="weak-chip"><kbd>${esc(w.k)}</kbd>${Math.round(w.rate * 100)}% missed</span>`).join('') : '<span class="hint">No weak pairs yet. Finish a few tests and they will show up here.</span>'}</div>
        <div class="train-actions"><button class="btn primary" type="button" data-pairs="weak"${wp.length ? '' : ' disabled'}>Drill my weak pairs</button><button class="btn" type="button" data-pairs="common">Common pairs</button><button class="btn" type="button" data-pairs="triples">Common triplets</button></div>`;
    } else if (panel === 'book') {
      const list = books();
      box.innerHTML = `<h3>Book reader</h3><p class="hint">Paste a chapter, a story or your class notes. You type ${PAGE} words per page and Softra remembers where you stopped. Text stays on this device.</p>
        <div class="book-list">${list.length ? list.map(b => { const total = Math.ceil(b.text.split(' ').length / PAGE), pg = Math.floor(b.pos / PAGE); return `<div class="book-row neu-inset"><div><strong>${esc(b.title)}</strong><small>${b.done && !b.pos ? 'Finished. ' : ''}Page ${pg + 1} of ${total}</small></div><div class="book-actions"><button class="btn primary" type="button" data-book-go="${b.id}">${b.pos ? 'Continue' : 'Start'}</button><button class="btn" type="button" data-book-del="${b.id}" aria-label="Delete ${esc(b.title)}">Delete</button></div></div>`; }).join('') : '<p class="hint">No texts yet. Add one below.</p>'}</div>
        <label class="field-label" for="bookTitle">Title</label><input id="bookTitle" class="field neu-inset" maxlength="40" placeholder="Chapter 1">
        <label class="field-label" for="bookText">Text</label><textarea id="bookText" class="field neu-inset" rows="5" placeholder="Paste your text here..."></textarea>
        <div class="train-actions"><label class="btn" for="bookFile">Load .txt file</label><input id="bookFile" type="file" accept=".txt,text/plain" hidden><button class="btn primary" type="button" id="bookAdd">Save text</button></div>`;
    } else box.innerHTML = '';
  }
  const $$all = s => [...document.querySelectorAll(s)];

  function render() { renderLessons(); renderStatus(); renderPanel(); }

  /* ---------------------------------------------------------
     Events
  --------------------------------------------------------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const lesson = t.closest('[data-lesson]');
    if (lesson && !lesson.disabled) { startLesson(lesson.dataset.lesson); return; }
    if (t.closest('#lessonOpenAll')) { store.set('lessons_open', !allUnlocked()); renderLessons(); return; }

    const train = t.closest('[data-train]');
    if (train) {
      const k = train.dataset.train;
      if (k === 'daily') startDaily();
      else if (k === 'ladder') startLadder();
      else if (k === 'zen') startZen();
      else if (k === 'blind') startBlind();
      else { panel = panel === k ? '' : k; renderPanel(); if (panel) $('#trainPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      return;
    }
    const fb = t.closest('[data-finger]');
    if (fb) { const k = fb.dataset.finger; fingerSel.has(k) ? fingerSel.delete(k) : fingerSel.add(k); renderPanel(); return; }
    const fs = t.closest('[data-finger-set]');
    if (fs) {
      fingerSel.clear();
      FINGERS.forEach(f => { if (fs.dataset.fingerSet === 'all' || f[0].startsWith(fs.dataset.fingerSet === 'left' ? 'l' : 'r')) fingerSel.add(f[0]); });
      renderPanel(); return;
    }
    if (t.closest('#fingerStart')) { startFingers(); return; }
    const pr = t.closest('[data-pairs]');
    if (pr && !pr.disabled) { startPairs(pr.dataset.pairs); return; }
    const go = t.closest('[data-book-go]');
    if (go) { startBook(go.dataset.bookGo); return; }
    const del = t.closest('[data-book-del]');
    if (del) { if (confirm('Delete this text and your place in it?')) { saveBooks(books().filter(b => b.id !== del.dataset.bookDel)); renderPanel(); } return; }
    if (t.closest('#bookAdd')) {
      if (addBook($('#bookTitle').value, $('#bookText').value)) { N.toast('Saved'); renderPanel(); }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id !== 'bookFile') return;
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 400000) { N.toast('That file is too big'); return; }
    const r = new FileReader();
    r.onload = () => { $('#bookText').value = String(r.result || ''); if (!$('#bookTitle').value) $('#bookTitle').value = f.name.replace(/\.txt$/i, '').slice(0, 40); };
    r.readAsText(f);
  });

  N.practice = { render, LESSONS, TIERS, LADDER };
  const pv = $('#view-practice');
  if (pv && !pv.hidden) render();          // page opened straight on #practice
})();
