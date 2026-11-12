/* =========================================================
   NEUTYPE: vanilla JS typing test
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = n => Math.floor(Math.random() * n);
  const pick = a => a[rand(a.length)];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('neutype:' + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('neutype:' + key, JSON.stringify(value)); } catch { /* storage may be blocked */ }
    },
    remove(key) {
      try { localStorage.removeItem('neutype:' + key); } catch { /* ignore */ }
    }
  };

  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /* ---------------------------------------------------------
     Word banks
  --------------------------------------------------------- */
  const COMMON = ('the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us').split(' ');

  const EXTRA = ('world system change number follow become between another against around before should through different important together morning picture question country problem language example season thought little really always better answer simple stream silver forest planet window garden bridge pocket market spirit travel battery journey keyboard practice rhythm velocity accuracy challenge elegant gradient interface knowledge landscape momentum notebook optimize pressure quantum resource software tomorrow universe vibrant wireless workshop yesterday adventure behavior calendar creative detailed discovery efficient fantastic gathering harmony imagine judgment lighthouse minimal overcome patience reliable satisfy telescope umbrella variety wonderful').split(' ');

  const WORDS = [...new Set([...COMMON, ...EXTRA])];

  const CODE = ('function const let var return if else for while break continue class import export default async await try catch throw new this null undefined true false typeof instanceof switch case array object string number boolean promise callback closure scope module package struct enum interface public private static void int float double char main print def lambda yield self super extends implements constructor prototype iterator generator query select insert update delete where join index commit branch merge rebase push pull clone docker server client request response token cache thread stack queue heap pointer buffer socket parse render').split(' ');

  const QUOTES = [
    'Well begun is half done.',
    'Fortune favors the bold.',
    'Knowledge is power.',
    'All that glitters is not gold.',
    'I think, therefore I am.',
    'The unexamined life is not worth living.',
    'A journey of a thousand miles begins with a single step.',
    'Practice makes perfect, but only if you practice with care.',
    'To be, or not to be, that is the question.',
    'The only thing we have to fear is fear itself.',
    'Early to bed and early to rise makes a man healthy, wealthy, and wise.',
    'Do not wait to strike till the iron is hot, but make it hot by striking.',
    'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    'Whatever you are, be a good one, and give every task the best of your attention.',
    'The way to get started is to quit talking and begin doing, one small step after another.',
    'In the middle of every difficulty lies opportunity, waiting patiently for someone to notice it.'
  ];

  const SOURCE_LABELS = { common: 'Common words', quotes: 'English quotes', random: 'Random words', code: 'Programming', keys: 'Weak keys', custom: 'Custom text' };
  const DIFFS = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
  const THEMES = ['light', 'mint', 'rose', 'sand', 'ocean', 'lavender', 'peach', 'lemon', 'sky', 'blush', 'sage', 'coral', 'aqua', 'slate', 'lilac', 'iris', 'honey', 'pearl', 'cherry', 'glacier', 'dark', 'midnight', 'forest', 'mocha', 'charcoal', 'obsidian', 'plum', 'wine', 'deepocean', 'ember', 'pine', 'steel', 'cocoa', 'neon', 'abyss', 'grape', 'rust', 'graphite', 'moss'];
  const DARK_THEMES = ['dark', 'midnight', 'forest', 'mocha', 'charcoal', 'obsidian', 'plum', 'wine', 'deepocean', 'ember', 'pine', 'steel', 'cocoa', 'neon', 'abyss', 'grape', 'rust', 'graphite', 'moss'];
  const ACCENTS = ['theme', 'violet', 'blue', 'teal', 'green', 'pink', 'orange'];
  const isDark = t => DARK_THEMES.includes(t);

  /* ---------------------------------------------------------
     Settings
  --------------------------------------------------------- */
  const DEFAULTS = {
    theme: 'light', accent: 'theme', fontSize: 'md', font: 'jetbrains', caret: 'line',
    showKeyboard: true, layout: 'qwerty',
    mode: { type: 'time', value: 30 }, difficulty: 'medium', source: 'random', customText: '', user: '',
    punctuation: false, numbers: false, stopOnError: false, autoPause: true,
    language: 'english', sound: false, volume: 'med', goal: 3, reducedMotion: false, highContrast: false, weakKeys: []
  };
  const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  if (!settings.mode || !['time', 'words'].includes(settings.mode.type) || !(settings.mode.value > 0)) settings.mode = { ...DEFAULTS.mode };
  if (!SOURCE_LABELS[settings.source]) settings.source = 'random';
  if (!DIFFS.includes(settings.difficulty)) settings.difficulty = 'medium';
  if (!THEMES.includes(settings.theme)) settings.theme = 'light';
  if (!ACCENTS.includes(settings.accent)) settings.accent = 'theme';
  const LANGS = window.NEUTYPE_LANGS || { english: { name: 'English', native: 'English', words: null } };
  if (!LANGS[settings.language]) settings.language = 'english';
  if (!Array.isArray(settings.weakKeys)) settings.weakKeys = [];
  if (settings.source === 'keys' && !settings.weakKeys.length) settings.source = 'random';
  const saveSettings = () => store.set('settings', settings);

  /* ---------------------------------------------------------
     Element references
  --------------------------------------------------------- */
  const el = {
    words: $('#words'), list: $('#wordList'), caret: $('#caret'), viewport: $('#viewport'),
    input: $('#typingInput'), panel: $('#testPanel'),
    testArea: $('#testArea'), results: $('#results'), keyboard: $('#keyboard'),
    sWpm: $('#sWpm'), sRaw: $('#sRaw'), sAcc: $('#sAcc'), sErr: $('#sErr'), sTime: $('#sTime'), sTimeLabel: $('#sTimeLabel'),
    progress: $('#progress'), progFill: $('#progFill'),
    customBtn: $('#customBtn'), sourceChip: $('#sourceChip'), goalChip: $('#goalChip'), toast: $('#toast'),
    chart: $('#chart'), histChart: $('#histChart'),
    customDialog: $('#customDialog'), profileDialog: $('#profileDialog'), helpDialog: $('#helpDialog')
  };

  /* ---------------------------------------------------------
     Test state
  --------------------------------------------------------- */
  const state = {
    view: 'test', words: [], typed: [], cur: 0,
    started: false, finished: false, fixed: false, paused: false, pausedAt: 0, stale: false,
    startTime: 0, timerId: 0, lastSample: 0, errSnapshot: 0,
    keys: { total: 0, correct: 0, wrong: 0 }, keyStats: {}, pairStats: {},
    samples: [], lastResult: null, weakThisTest: [], race: null, session: null
  };
  let lastQuote = '';

  /* ---------------------------------------------------------
     Sound (Web Audio, created on first use)
  --------------------------------------------------------- */
  let audioCtx = null;
  function beep(freq, dur, type, gain) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      const vol = { low: 0.03, med: 0.07, high: 0.14 }[settings.volume] || 0.07;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol * gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* audio not available */ }
  }
  const soundKey = () => beep(640 + rand(120), 0.05, 'triangle', 1);
  const soundSpace = () => beep(460, 0.05, 'triangle', 0.9);
  const soundError = () => beep(170, 0.14, 'sawtooth', 0.7);
  const soundDone = () => { beep(523, 0.14, 'sine', 1); setTimeout(() => beep(784, 0.22, 'sine', 1), 130); };

  /* ---------------------------------------------------------
     Text generation
  --------------------------------------------------------- */
  function filterByLength(list, diff) {
    const f = diff === 'beginner' ? w => w.length <= 3
      : diff === 'easy' ? w => w.length <= 4
      : diff === 'hard' ? w => w.length >= 6
      : diff === 'expert' ? w => w.length >= 8
      : diff === 'master' ? w => w.length >= 9
      : w => w.length >= 3 && w.length <= 7;
    const out = list.filter(f);
    return out.length >= 20 ? out : list;
  }

  /* Adds capitals, punctuation and numbers when those toggles are on */
  function styleWords(list) {
    const P = settings.punctuation, N = settings.numbers;
    if (!P && !N) return list;
    let cap = true;
    return list.map(w => {
      if (N && Math.random() < 0.12) w = String(rand(Math.random() < 0.5 ? 100 : 10000));
      else if (P && cap) w = w[0].toUpperCase() + w.slice(1);
      cap = false;
      if (P) {
        const r = Math.random();
        if (r < 0.10) w += ',';
        else if (r < 0.17) { w += pick(['.', '.', '.', '?', '!']); cap = true; }
        else if (r < 0.20) w += ':';
        else if (r < 0.23) w = `(${w})`;
      }
      return w;
    });
  }

  function quoteWords(n) {
    const d = settings.difficulty;
    let pool = QUOTES.filter(q => d === 'beginner' ? q.length <= 50 : d === 'easy' ? q.length <= 70 : d === 'hard' ? q.length >= 100 : d === 'expert' ? q.length >= 125 : d === 'master' ? q.length >= 150 : q.length > 40 && q.length <= 140);
    if (!pool.length) pool = QUOTES;
    let out = [];
    while (out.length < n) {
      let q;
      do { q = pick(pool); } while (pool.length > 1 && q === lastQuote);
      lastQuote = q;
      out = out.concat(q.split(' '));
    }
    return out;
  }

  function generateChunk(n) {
    if (state.session && state.session.gen && !state.race) return state.session.gen(n);
    const src = settings.source, diff = settings.difficulty;

    if (src === 'custom') {
      const base = settings.customText.trim().split(/\s+/).filter(Boolean);
      if (base.length) {
        if (state.fixed) return base;
        let out = [];
        while (out.length < n) out = out.concat(base);
        return out;
      }
    }
    const lw = LANGS[settings.language] && LANGS[settings.language].words;
    if (src === 'quotes' && !lw) return quoteWords(n);

    let pool;
    if (lw && src !== 'code') {
      if (src === 'common') { pool = lw.slice(0, 60); if (diff === 'easy') pool = filterByLength(pool, 'easy'); }
      else if (src === 'keys' && settings.weakKeys.length) {
        pool = lw.filter(w => settings.weakKeys.some(k => w.includes(k)));
        if (pool.length < 8) pool = lw;
      } else pool = filterByLength(lw, diff);
    } else if (src === 'code') pool = (diff === 'easy' || diff === 'beginner') ? CODE.filter(w => w.length <= 5) : CODE;
    else if (src === 'common') pool = (diff === 'easy' || diff === 'beginner') ? COMMON.filter(w => w.length <= (diff === 'beginner' ? 3 : 4)) : COMMON;
    else if (src === 'keys' && settings.weakKeys.length) {
      pool = WORDS.filter(w => settings.weakKeys.some(k => w.includes(k)));
      if (pool.length < 8) pool = WORDS;
    } else pool = filterByLength(WORDS, diff);

    const out = [];
    let prev = '';
    for (let i = 0; i < n; i++) {
      let w;
      do { w = pick(pool); } while (w === prev && pool.length > 1);
      prev = w;
      if ((diff === 'hard' || diff === 'expert' || diff === 'master') && src === 'code' && Math.random() < 0.45) w += pick(CODE).replace(/^./, c => c.toUpperCase());
      out.push(w);
    }
    if (diff === 'master') return masterize(styleWords(out));
    return styleWords(out);
  }

  /* Master level: capitals and punctuation sneak in even when the toggles are off */
  function masterize(list) {
    return list.map(w => {
      if (!/^[a-z]/.test(w)) return w;
      if (Math.random() < 0.3) w = w[0].toUpperCase() + w.slice(1);
      if (Math.random() < 0.22) w += pick([',', '.', ';', '!', '?']);
      return w;
    });
  }

  /* ---------------------------------------------------------
     Rendering the text
  --------------------------------------------------------- */
  function buildWordEl(i) {
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of state.words[i]) {
      const l = document.createElement('span');
      l.className = 'letter';
      l.textContent = ch;
      w.append(l);
    }
    return w;
  }

  function renderAll() {
    el.list.replaceChildren(...state.words.map((_, i) => buildWordEl(i)));
    el.viewport.scrollTop = 0;
    refreshWord(0);
  }

  function refreshWord(i) {
    const node = el.list.children[i];
    if (!node) return;
    const target = state.words[i], typed = state.typed[i] || '';
    $$('.extra', node).forEach(n => n.remove());
    const letters = $$('.letter', node);
    letters.forEach((l, k) => {
      l.className = 'letter';
      if (k < typed.length) l.classList.add(typed[k] === target[k] ? 'correct' : 'incorrect');
    });
    for (let k = target.length; k < typed.length; k++) {
      const x = document.createElement('span');
      x.className = 'letter extra incorrect';
      x.textContent = typed[k];
      node.append(x);
    }
    node.classList.toggle('current', i === state.cur);
    node.classList.toggle('wrong', i < state.cur && typed !== target);
    if (i === state.cur) updateCaret();
  }

  function updateCaret() {
    const node = el.list.children[state.cur];
    if (!node || !el.viewport.offsetWidth) return;
    const letters = node.children;
    if (!letters.length) return;
    const n = (state.typed[state.cur] || '').length;
    let x, y, w;
    if (n < letters.length) { const l = letters[n]; x = l.offsetLeft; y = l.offsetTop; w = l.offsetWidth; }
    else { const l = letters[letters.length - 1]; x = l.offsetLeft + l.offsetWidth; y = l.offsetTop; w = l.offsetWidth; }
    el.caret.style.setProperty('--cw', w + 'px');
    el.caret.style.transform = `translate(${x}px, ${y}px)`;
    el.caret.classList.toggle('blink', !state.started || state.paused);
  }

  function scrollToCurrent() {
    const node = el.list.children[state.cur];
    if (node) el.viewport.scrollTop = Math.max(0, node.offsetTop - node.offsetHeight);
  }

  function appendWords(n) {
    const more = state.race ? state.race.words.slice(0, n) : generateChunk(n);
    const start = state.words.length;
    state.words.push(...more);
    more.forEach(() => state.typed.push(''));
    for (let i = start; i < state.words.length; i++) el.list.append(buildWordEl(i));
  }

  /* ---------------------------------------------------------
     Statistics
  --------------------------------------------------------- */
  const elapsed = () => (performance.now() - state.startTime) / 1000;

  function computeCounts() {
    let wpmChars = 0, rawChars = 0, correct = 0, incorrect = 0;
    const last = Math.min(state.cur, state.words.length - 1);
    for (let i = 0; i <= last; i++) {
      const tg = state.words[i], ty = state.typed[i] || '';
      const passed = i < state.cur;
      for (let k = 0; k < tg.length; k++) {
        if (k < ty.length) { ty[k] === tg[k] ? correct++ : incorrect++; }
        else if (passed) incorrect++;
      }
      if (ty.length > tg.length) incorrect += ty.length - tg.length;
      rawChars += ty.length;
      if (passed) {
        rawChars++;
        if (ty === tg) { correct++; wpmChars += tg.length + 1; } else incorrect++;
      } else if (tg.startsWith(ty)) {
        wpmChars += ty.length;
      }
    }
    return { wpmChars, rawChars, correct, incorrect };
  }

  const accuracy = () => state.keys.total ? Math.round(100 * state.keys.correct / state.keys.total) : 100;
  const curMode = () => state.race ? state.race.mode : (state.session && state.session.mode) || settings.mode;
  const limit = () => curMode().type === 'time' ? curMode().value : Infinity;

  function progressFraction(e) {
    if (!state.started) return 0;
    if (curMode().type === 'time') return clamp(e / curMode().value, 0, 1);
    const target = state.words[state.cur] || '';
    const part = target.length ? Math.min(1, (state.typed[state.cur] || '').length / target.length) : 0;
    return clamp((state.cur + part) / state.words.length, 0, 1);
  }

  function updateLive(e = state.started ? elapsed() : 0) {
    const c = computeCounts();
    const mins = Math.max(e, 1) / 60;
    const wpm = state.started ? c.wpmChars / 5 / mins : 0;
    const raw = state.started ? c.rawChars / 5 / mins : 0;
    el.sWpm.textContent = Math.round(wpm);
    el.sRaw.textContent = Math.round(raw);
    el.sAcc.textContent = state.keys.total ? accuracy() + '%' : '—';
    el.sErr.textContent = state.keys.wrong;
    el.sTime.textContent = (curMode().type === 'time' ? Math.max(0, Math.ceil(limit() - e)) : Math.floor(e)) + 's';
    const pct = Math.round(progressFraction(e) * 100);
    el.progFill.style.width = pct + '%';
    el.progress.setAttribute('aria-valuenow', pct);
  }

  function pushSample(t) {
    const c = computeCounts();
    const mins = Math.max(t, 0.5) / 60;
    state.samples.push({
      t,
      wpm: c.wpmChars / 5 / mins,
      raw: c.rawChars / 5 / mins,
      err: state.keys.wrong - state.errSnapshot
    });
    state.errSnapshot = state.keys.wrong;
  }

  /* Per-key accuracy, used for the "keys to practice" report */
  function recordKey(expected, ok) {
    if (!expected) return;
    const k = baseKey(expected);
    const s = state.keyStats[k] || (state.keyStats[k] = { t: 0, m: 0 });
    s.t++;
    if (!ok) s.m++;
  }

  /* Letter pairs: how often each two-letter combination is typed wrong */
  function recordPair(target, i, ok) {
    if (i < 1) return;
    const a = target[i - 1], b = target[i];
    if (!a || !b || !/^[a-z]$/i.test(a) || !/^[a-z]$/i.test(b)) return;
    const k = (a + b).toLowerCase();
    const s = state.pairStats[k] || (state.pairStats[k] = { t: 0, m: 0 });
    s.t++;
    if (!ok) s.m++;
  }

  function weakLetters(stats, minAttempts, max) {
    return Object.entries(stats)
      .filter(([k, s]) => /^[a-z]$/.test(k) && s.t >= minAttempts && s.m > 0)
      .map(([k, s]) => ({ key: k, rate: s.m / s.t, t: s.t, m: s.m }))
      .sort((a, b) => b.rate - a.rate || b.m - a.m)
      .slice(0, max);
  }

  /* ---------------------------------------------------------
     Typing engine
  --------------------------------------------------------- */
  function resetRun(keepWords) {
    clearInterval(state.timerId);
    Object.assign(state, {
      cur: 0, started: false, finished: false, paused: false, lastSample: 0, errSnapshot: 0,
      keys: { total: 0, correct: 0, wrong: 0 }, keyStats: {}, pairStats: {}, samples: []
    });
    el.panel.classList.remove('paused');
    state.fixed = curMode().type === 'words';
    if (!keepWords || !state.words.length) {
      state.words = generateChunk(curMode().type === 'words' ? curMode().value : 120);
    }
    state.typed = state.words.map(() => '');
    el.results.hidden = true;
    el.testArea.hidden = false;
    renderAll();
    syncUI();
    updateLive(0);
    clearKeyStates();
    updateNextKey();
    resetInput();
    focusInput();
  }

  const newTest = () => { if (!state.race) resetRun(false); };

  function startTimer() {
    state.started = true;
    state.startTime = performance.now();
    state.timerId = setInterval(tick, 100);
    updateCaret();
  }

  function tick() {
    const e = elapsed();
    if (e >= limit()) { finish(limit()); return; }
    const sec = Math.floor(e);
    if (sec > state.lastSample) { state.lastSample = sec; pushSample(sec); }
    updateLive(e);
  }

  function pause() {
    if (state.race || !state.started || state.finished || state.paused) return;
    state.paused = true;
    state.pausedAt = performance.now();
    clearInterval(state.timerId);
    el.panel.classList.add('paused');
    updateCaret();
  }

  function resume() {
    if (!state.paused) return;
    state.paused = false;
    state.startTime += performance.now() - state.pausedAt;
    state.timerId = setInterval(tick, 100);
    el.panel.classList.remove('paused');
    updateCaret();
  }

  function typeChar(ch) {
    if (state.finished || (state.race && state.race.locked)) return;
    if (state.paused) resume();
    if (ch === ' ') { commitWord(); return; }

    const target = state.words[state.cur];
    const typed = state.typed[state.cur];
    const expected = target[typed.length];
    const ok = expected === ch;

    // Stop on error: wrong keys are counted but never entered
    if (settings.stopOnError && !ok) {
      if (!state.started) startTimer();
      recordKey(expected, false); recordPair(target, typed.length, false);
      state.keys.total++; state.keys.wrong++;
      flashKey(ch, false); soundError(); updateLive();
      return;
    }

    if (!state.started) startTimer();
    if (typed.length >= target.length + 8) return;

    recordKey(expected, ok); recordPair(target, typed.length, ok);
    state.typed[state.cur] = typed + ch;
    state.keys.total++;
    ok ? state.keys.correct++ : state.keys.wrong++;
    ok ? soundKey() : soundError();
    flashKey(ch, ok);
    refreshWord(state.cur);
    updateNextKey();
    updateLive();

    if (state.fixed && state.cur === state.words.length - 1 && state.typed[state.cur].length >= target.length) finish();
  }

  function commitWord() {
    if (!state.started || state.finished || (state.race && state.race.locked)) return;
    const typed = state.typed[state.cur];
    if (!typed) return;
    const ok = typed === state.words[state.cur];
    if (settings.stopOnError && !ok) { soundError(); flashKey(' ', false); return; }
    state.keys.total++;
    ok ? state.keys.correct++ : state.keys.wrong++;
    ok ? soundSpace() : soundError();
    flashKey(' ', ok);

    if (state.fixed && state.cur === state.words.length - 1) { finish(); return; }

    state.cur++;
    refreshWord(state.cur - 1);
    refreshWord(state.cur);
    scrollToCurrent();
    if (!state.fixed && state.cur > state.words.length - 40) appendWords(60);
    updateNextKey();
    updateLive();
  }

  function backspace(wholeWord) {
    if (!state.started || state.finished || (state.race && state.race.locked)) return;
    if (state.paused) resume();
    const i = state.cur;
    if (!state.typed[i]) {
      if (i > 0 && state.typed[i - 1] !== state.words[i - 1]) {
        state.cur--;
        refreshWord(i);
        refreshWord(state.cur);
        scrollToCurrent();
      }
    } else {
      state.typed[i] = wholeWord ? '' : state.typed[i].slice(0, -1);
      refreshWord(i);
    }
    updateNextKey();
    updateLive();
  }

  function finish(forcedDuration) {
    if (state.finished) return;
    state.finished = true;
    clearInterval(state.timerId);

    if (state.session && state.session.zen && !state.race) {      // zen: nothing is scored or saved
      const z = computeCounts();
      const n = state.typed.filter(t => t).length;
      const sess = state.session;
      exitSession();
      toast(`Calm session finished. ${n} ${n === 1 ? 'word' : 'words'} typed, nothing saved.`);
      if (sess.onFinish) sess.onFinish({ words: n, chars: z.correct });
      return;
    }

    const e = forcedDuration !== undefined ? forcedDuration : elapsed();
    const c = computeCounts();
    const mins = Math.max(e, 0.5) / 60;
    const res = {
      wpm: Math.round(c.wpmChars / 5 / mins),
      raw: Math.round(c.rawChars / 5 / mins),
      acc: accuracy(),
      errors: state.keys.wrong,
      correct: c.correct,
      incorrect: c.incorrect,
      total: c.correct + c.incorrect,
      duration: e,
      type: curMode().type,
      value: curMode().value,
      difficulty: settings.difficulty,
      source: settings.source,
      lang: settings.language,
      punctuation: settings.punctuation,
      numbers: settings.numbers
    };
    if (state.session && !state.race) { res.practice = state.session.kind; res.label = state.session.label; }
    if (state.race) {              // versus race: report to the room, don't touch solo records
      state.race.finished = true;
      state.race.result = res;
      soundDone();
      document.documentElement.classList.add('race-done');
      if (state.race.onFinish) state.race.onFinish(res);
      return;
    }
    pushSample(Math.max(e, 0.5));
    res.pb = saveResult(res);
    saveKeyStats();
    state.lastResult = res;
    soundDone();
    showResults(res);
    updateGoalChip();

    const info = streakInfo();
    if (settings.goal && info.today === settings.goal) {
      toast(`Daily goal reached! ${info.streak}-day streak`);
    }
    let extra = [];
    if (state.session && state.session.onFinish) {
      const out = state.session.onFinish(res);
      renderSessionNote(out);
      if (out && out.achievements) extra = out.achievements;
    }
    if (api.ach) {
      const fresh = api.ach.onTest(res, { streak: info.streak, today: info.today, goal: settings.goal, source: res.source, langUsed: res.lang });
      api.ach.showNew(extra.concat(fresh));
    }
  }

  /* ---------------------------------------------------------
     Input capture (hidden input, paste blocked)
  --------------------------------------------------------- */
  const PAD = '​';
  let lastVal = PAD;

  function resetInput() { el.input.value = PAD; lastVal = PAD; }

  function focusInput() {
    if (state.view !== 'test' || (el.results && !el.results.hidden)) return;
    if (document.querySelector('dialog[open]')) return;
    el.input.focus({ preventScroll: true });
  }

  const isPrintable = ch => ch >= ' ' && ch !== PAD && ch !== '\u007f';

  el.input.addEventListener('beforeinput', e => {
    if (/^(insertFromPaste|insertFromDrop|insertFromYank|insertReplacementText)/.test(e.inputType)) e.preventDefault();
  });

  el.input.addEventListener('input', () => {
    const val = el.input.value;
    if (!val.startsWith(PAD)) { resetInput(); backspace(false); return; }
    const rest = val.slice(1), prev = lastVal.slice(1);
    if (rest.startsWith(prev)) {
      for (const ch of rest.slice(prev.length)) {
        const c = ch === ' ' ? ' ' : ch;
        if (isPrintable(c)) typeChar(c);
      }
    } else if (prev.startsWith(rest)) {
      for (let i = 0; i < prev.length - rest.length; i++) backspace(false);
    }
    lastVal = val;
    if (rest.includes(' ') || rest.length > 30) resetInput();
  });

  // On phones, bring the text into view above the keyboard when focused
  el.input.addEventListener('focus', () => {
    if (window.matchMedia('(pointer: coarse)').matches) el.panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  ['paste', 'drop', 'cut'].forEach(type => {
    document.addEventListener(type, e => {
      const t = e.target;
      if (state.view === 'test' && !(t.closest && t.closest('textarea, #customValue, #profileName'))) e.preventDefault();
    });
  });

  const focusFromPanel = e => {
    if (e.cancelable) e.preventDefault();
    if (state.paused) resume();
    el.input.focus({ preventScroll: true });
  };
  el.panel.addEventListener('mousedown', focusFromPanel);
  el.panel.addEventListener('touchend', focusFromPanel);

  /* ---------------------------------------------------------
     Keyboard shortcuts
  --------------------------------------------------------- */
  const TIME_PRESETS = [15, 30, 60, 120], WORD_PRESETS = [10, 25, 50, 100];

  function setMode(type, value) {
    settings.mode = { type, value };
    saveSettings();
    newTest();
  }

  function cycleMode(type, presets) {
    const i = settings.mode.type === type ? presets.indexOf(settings.mode.value) : -1;
    setMode(type, presets[(i + 1) % presets.length]);
  }

  function goTo(view) {
    if (location.hash === '#' + view) route(); else location.hash = '#' + view;
  }

  function toggleSetting(key) {
    settings[key] = !settings[key];
    saveSettings();
    onToggle(key);
  }

  function runShortcut(code) {
    switch (code) {
      case 'Digit1': goTo('test'); break;
      case 'Digit2': goTo('practice'); break;
      case 'Digit3': goTo('leaderboard'); break;
      case 'Digit4': goTo('settings'); break;
      case 'Digit5': goTo('versus'); break;
      case 'KeyT': goTo('test'); cycleMode('time', TIME_PRESETS); break;
      case 'KeyW': goTo('test'); cycleMode('words', WORD_PRESETS); break;
      case 'KeyD':
        settings.difficulty = DIFFS[(DIFFS.indexOf(settings.difficulty) + 1) % DIFFS.length];
        saveSettings(); goTo('test'); newTest(); break;
      case 'KeyP': toggleSetting('punctuation'); break;
      case 'KeyN': toggleSetting('numbers'); break;
      case 'KeyK': toggleSetting('showKeyboard'); break;
      case 'KeyS': toggleSetting('sound'); toast(settings.sound ? 'Sound on' : 'Sound off'); break;
      case 'KeyL':
        settings.theme = isDark(settings.theme) ? 'light' : 'dark';
        saveSettings(); applyAppearance(); renderSettings(); break;
      case 'Slash': openDialog(el.helpDialog); break;
      default: return false;
    }
    return true;
  }

  function openDialog(d) {
    if (!d.open) d.showModal();
  }

  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      if (state.race) { if (api.onReactKey && api.onReactKey(e.code)) e.preventDefault(); return; }
      if (runShortcut(e.code)) e.preventDefault();
      return;
    }

    if (state.view !== 'test') return;

    if (e.key === 'Escape') { e.preventDefault(); if (!state.race) newTest(); return; }
    if (state.race && state.race.finished) return;
    if (!el.results.hidden) return;

    const a = document.activeElement;
    if (!(a === el.input || a === document.body)) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      focusInput();
      backspace(e.ctrlKey || e.altKey || e.metaKey);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (a !== el.input) focusInput();
      pressKey(e.key);
    }
  });

  document.addEventListener('keyup', e => { if (e.key) unpressKey(e.key); });

  // Auto-pause when the person leaves the page
  document.addEventListener('visibilitychange', () => { if (document.hidden && settings.autoPause) pause(); });
  window.addEventListener('blur', () => {
    clearKeyStates();
    if (settings.autoPause && !document.querySelector('dialog[open]')) pause();
  });

  /* ---------------------------------------------------------
     On-screen keyboard
  --------------------------------------------------------- */
  const LAYOUTS = {
    qwerty: ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'],
    dvorak: ['1234567890[]', "',.pyfgcrl/=", 'aoeuidhtns-', ';qjkxbmwvz'],
    colemak: ['1234567890-=', 'qwfpgjluy;[]', "arstdhneio'", 'zxcvbkm,./']
  };
  const SHIFT = { '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' };
  let keyMap = new Map();
  let nextKeyEl = null;

  const baseKey = ch => {
    if (ch === ' ') return 'space';
    if (SHIFT[ch]) return SHIFT[ch];
    const l = ch.toLowerCase();
    const n = l.normalize ? l.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : l;
    return n.length === 1 ? n : l;
  };

  function buildKeyboard() {
    keyMap = new Map();
    el.keyboard.replaceChildren();
    LAYOUTS[settings.layout].forEach(row => {
      const r = document.createElement('div');
      r.className = 'kb-row';
      for (const k of row) {
        const key = document.createElement('div');
        key.className = 'kb-key';
        key.textContent = k;
        keyMap.set(k, key);
        r.append(key);
      }
      el.keyboard.append(r);
    });
    const sr = document.createElement('div');
    sr.className = 'kb-row space';
    const sp = document.createElement('div');
    sp.className = 'kb-key space-key';
    sp.textContent = 'space';
    keyMap.set('space', sp);
    sr.append(sp);
    el.keyboard.append(sr);
    nextKeyEl = null;
    updateNextKey();
  }

  function flashKey(ch, ok) {
    const k = keyMap.get(baseKey(ch));
    if (!k) return;
    k.classList.remove('ok', 'bad');
    k.classList.add(ok ? 'ok' : 'bad');
    clearTimeout(k._t);
    k._t = setTimeout(() => k.classList.remove('ok', 'bad'), 260);
  }

  function pressKey(ch) { const k = keyMap.get(baseKey(ch)); if (k) k.classList.add('pressed'); }
  function unpressKey(ch) { const k = keyMap.get(baseKey(ch)); if (k) k.classList.remove('pressed'); }
  function clearKeyStates() { keyMap.forEach(k => k.classList.remove('pressed', 'ok', 'bad')); }

  function updateNextKey() {
    if (nextKeyEl) nextKeyEl.classList.remove('next');
    nextKeyEl = null;
    if (state.finished || !state.words.length) return;
    const target = state.words[state.cur] || '';
    const typed = state.typed[state.cur] || '';
    const ch = typed.length < target.length ? target[typed.length] : ' ';
    nextKeyEl = keyMap.get(baseKey(ch)) || null;
    if (nextKeyEl) nextKeyEl.classList.add('next');
  }

  /* ---------------------------------------------------------
     Charts (shared canvas line plot)
  --------------------------------------------------------- */
  function plot(canvas, o) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const text2 = css.getPropertyValue('--text2').trim();
    const bad = css.getPropertyValue('--bad').trim();
    const grid = css.getPropertyValue('--grid').trim();

    const pad = { l: 44, r: 16, t: 26, b: 30 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const xmin = o.xmin, xmax = Math.max(o.xmax, xmin + 1);
    const rawMax = Math.max(10, ...o.lines.flatMap(l => l.vals));
    const want = rawMax / 5;
    const step = [10, 20, 25, 50, 100, 200, 500].find(s => s >= want) || 500;
    const maxY = Math.ceil(rawMax / step) * step;
    const X = x => o.xs.length === 1 ? pad.l + pw / 2 : pad.l + ((x - xmin) / (xmax - xmin)) * pw;
    const Y = v => pad.t + ph - (v / maxY) * ph;

    ctx.font = '11px Poppins, system-ui, sans-serif';
    ctx.fillStyle = text2; ctx.strokeStyle = grid; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= maxY; v += step) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
      ctx.fillText(v, pad.l - 8, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    o.ticks.forEach(t => ctx.fillText(t.label, X(t.x), h - pad.b + 8));

    o.lines.forEach(l => {
      const color = css.getPropertyValue(l.color).trim() || l.color;
      ctx.beginPath(); ctx.setLineDash(l.dash || []); ctx.strokeStyle = color; ctx.lineWidth = l.width;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      o.xs.forEach((x, i) => i ? ctx.lineTo(X(x), Y(l.vals[i])) : ctx.moveTo(X(x), Y(l.vals[i])));
      ctx.stroke(); ctx.setLineDash([]);
      if (o.xs.length === 1) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(o.xs[0]), Y(l.vals[0]), 4, 0, 7); ctx.fill(); }
      else if (l.dots) { ctx.fillStyle = color; o.xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(X(x), Y(l.vals[i]), 3, 0, 7); ctx.fill(); }); }
    });

    (o.markers || []).forEach(m => {
      const x = X(m.x), y = Y(m.y);
      ctx.strokeStyle = bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke();
    });

    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    o.legend.reduce((x, [label, color]) => {
      ctx.fillStyle = css.getPropertyValue(color).trim() || color; ctx.fillRect(x, 8, 10, 10);
      ctx.fillStyle = text2; ctx.fillText(label, x + 15, 13);
      return x + 25 + ctx.measureText(label).width + 12;
    }, pad.l);
  }

  function drawResultChart() {
    const s = state.samples;
    if (el.results.hidden || !s.length) return;
    const maxT = Math.max(s[s.length - 1].t, 1);
    const tickStep = Math.max(1, Math.ceil(maxT / 8));
    const ticks = [];
    for (let t = 0; t <= maxT; t += tickStep) ticks.push({ x: t, label: t + 's' });
    plot(el.chart, {
      xs: s.map(p => p.t), xmin: 0, xmax: maxT, ticks,
      lines: [
        { vals: s.map(p => p.raw), color: '--text2', dash: [5, 5], width: 1.5 },
        { vals: s.map(p => p.wpm), color: '--accent', width: 3 }
      ],
      markers: s.filter(p => p.err > 0).map(p => ({ x: p.t, y: p.wpm })),
      legend: [['WPM', '--accent'], ['Raw', '--text2'], ['Errors', '--bad']]
    });
  }

  function drawHistoryChart() {
    const wrap = $('#histWrap');
    if (!wrap || state.view !== 'leaderboard') return;
    const runs = store.get('history', []).slice(0, 30).reverse();
    $('#histEmpty').hidden = runs.length >= 2;
    el.histChart.hidden = runs.length < 2;
    if (runs.length < 2) return;
    const vals = runs.map(r => r.wpm);
    const avg = vals.map((_, i) => { const sl = vals.slice(Math.max(0, i - 4), i + 1); return sl.reduce((a, b) => a + b, 0) / sl.length; });
    const n = runs.length;
    const tickCount = Math.min(n, 6);
    const ticks = [];
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.round(i * (n - 1) / Math.max(tickCount - 1, 1));
      ticks.push({ x: idx, label: new Date(runs[idx].date).toLocaleDateString([], { month: 'short', day: 'numeric' }) });
    }
    plot(el.histChart, {
      xs: runs.map((_, i) => i), xmin: 0, xmax: n - 1, ticks,
      lines: [
        { vals: avg, color: '--text2', dash: [5, 5], width: 1.5 },
        { vals, color: '--accent', width: 2.5, dots: true }
      ],
      legend: [['WPM per test', '--accent'], ['5-test average', '--text2']]
    });
  }

  const redrawCharts = () => { drawResultChart(); drawHistoryChart(); };
  window.addEventListener('resize', () => { redrawCharts(); updateCaret(); });

  /* ---------------------------------------------------------
     Results, records, streaks, weak keys
  --------------------------------------------------------- */
  const langSuffix = l => (l && l !== 'english' && LANGS[l]) ? ' · ' + LANGS[l].name : '';
  const modeLabel = (type, value) => type === 'time' ? value + 's' : value + ' words';
  const prettyDiff = d => d[0].toUpperCase() + d.slice(1);

  function saveResult(res) {
    const history = store.get('history', []);
    history.unshift({
      id: Date.now(), date: Date.now(), user: settings.user || 'Guest',
      wpm: res.wpm, raw: res.raw, acc: res.acc, mode: modeLabel(res.type, res.value),
      type: res.type, value: res.value, difficulty: res.difficulty, source: res.source,
      duration: Math.round(res.duration * 10) / 10, lang: res.lang || 'english', label: res.label || ''
    });
    store.set('history', history.slice(0, 200));

    const daily = store.get('daily', {});
    daily[dayKey()] = (daily[dayKey()] || 0) + 1;
    store.set('daily', daily);

    if (res.wpm <= 0 || res.practice) return false;      // practice sessions never set personal bests
    const bests = store.get('bests', {});
    const key = `${res.type}:${res.value}:${res.difficulty}`;
    const prev = bests[key];
    if (!prev || res.wpm > prev.wpm) {
      bests[key] = { wpm: res.wpm, acc: res.acc, date: Date.now(), type: res.type, value: res.value, difficulty: res.difficulty };
      store.set('bests', bests);
      return true;
    }
    return false;
  }

  function saveKeyStats() {
    const all = store.get('keystats', {});
    Object.entries(state.keyStats).forEach(([k, s]) => {
      const a = all[k] || (all[k] = { t: 0, m: 0 });
      a.t += s.t; a.m += s.m;
    });
    store.set('keystats', all);
    const pairs = store.get('pairstats', {});
    Object.entries(state.pairStats).forEach(([k, s]) => {
      const a = pairs[k] || (pairs[k] = { t: 0, m: 0 });
      a.t += s.t; a.m += s.m;
    });
    const keep = Object.entries(pairs).sort((x, y) => y[1].t - x[1].t).slice(0, 500);
    store.set('pairstats', Object.fromEntries(keep));
  }

  function streakInfo() {
    const daily = store.get('daily', {});
    const d = new Date();
    const today = daily[dayKey(d)] || 0;
    if (!today) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (daily[dayKey(d)] > 0) { streak++; d.setDate(d.getDate() - 1); }
    return { streak, today };
  }

  function updateGoalChip() {
    const { streak, today } = streakInfo();
    const goal = settings.goal || 1;
    el.goalChip.textContent = `Streak ${streak} ${streak === 1 ? 'day' : 'days'} · Today ${today}/${goal}`;
    el.goalChip.classList.toggle('done', today >= goal);
  }

  function weakChipsHTML(list) {
    return list.map(w => `<span class="weak-chip"><kbd>${esc(w.key)}</kbd>${Math.round(w.rate * 100)}% missed</span>`).join('');
  }

  function showResults(res) {
    const an = $('#achNew'); if (an) { an.hidden = true; an.innerHTML = ''; }
    el.testArea.hidden = true;
    el.results.hidden = false;
    $('#pbBadge').hidden = !res.pb;
    $('#rWpm').textContent = res.wpm;
    $('#rAcc').textContent = res.acc + '%';
    $('#rRaw').textContent = res.raw;
    $('#rCorrect').textContent = res.correct;
    $('#rIncorrect').textContent = res.incorrect;
    $('#rTotal').textContent = res.total;
    $('#rErrors').textContent = res.errors;
    $('#rDuration').textContent = (Math.round(res.duration * 10) / 10) + 's';
    $('#rMode').textContent = res.label ? `${res.label} · ${modeLabel(res.type, res.value)}` : `${modeLabel(res.type, res.value)} · ${prettyDiff(res.difficulty)} · ${SOURCE_LABELS[res.source]}${langSuffix(res.lang)}`;
    renderSessionNote(null);
    el.chart.setAttribute('aria-label', `Line chart of words per minute over ${Math.round(res.duration)} seconds. Final speed ${res.wpm} WPM.`);

    state.weakThisTest = weakLetters(state.keyStats, 3, 5);
    $('#weakWrap').hidden = !state.weakThisTest.length;
    $('#weakList').innerHTML = weakChipsHTML(state.weakThisTest);

    drawResultChart();
    $('#retryBtn').focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------
     Toolbar, appearance, profile, toast
  --------------------------------------------------------- */
  function updateToolbar() {
    const m = settings.mode;
    let preset = false;
    $$('[data-mode]').forEach(b => {
      const on = m.type === b.dataset.mode && m.value === +b.dataset.value;
      if (on) preset = true;
      b.setAttribute('aria-pressed', on);
    });
    el.customBtn.setAttribute('aria-pressed', !preset);
    el.customBtn.textContent = preset ? 'Custom' : 'Custom · ' + modeLabel(m.type, m.value);
    $$('[data-difficulty]').forEach(b => b.setAttribute('aria-pressed', b.dataset.difficulty === settings.difficulty));
    el.sourceChip.textContent = SOURCE_LABELS[settings.source] + langSuffix(settings.language);
    $$('[data-lang-select]').forEach(s => { if (s.value !== settings.language) s.value = settings.language; });
    el.sTimeLabel.textContent = m.type === 'time' ? 'Remaining' : 'Elapsed';
    $('#practiceMode').textContent = modeLabel(m.type, m.value);
  }

  function updateToggles() {
    $$('[data-toggle]').forEach(b => {
      const on = !!settings[b.dataset.toggle];
      b.setAttribute(b.getAttribute('role') === 'switch' ? 'aria-checked' : 'aria-pressed', on);
    });
  }

  function syncUI() { updateToolbar(); updateToggles(); updateGoalChip(); }

  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
  }

  function applyAppearance() {
    const r = document.documentElement.dataset;
    r.theme = settings.theme;
    r.tone = isDark(settings.theme) ? 'dark' : 'light';
    r.accent = settings.accent;
    r.fs = settings.fontSize;
    r.font = settings.font;
    r.caret = settings.caret;
    r.contrast = settings.highContrast ? 'high' : 'normal';
    r.motion = settings.reducedMotion ? 'reduced' : 'normal';
    const dark = isDark(settings.theme);
    $('#themeToggle').setAttribute('aria-pressed', dark);
    $('#themeToggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (dark ? '#262830' : '#E8EAF0');
    redrawCharts();
    requestAnimationFrame(updateCaret);
  }

  function applyProfile() {
    const name = settings.user || 'Guest';
    $('#profileLabel').textContent = name;
    const av = $('#profileAvatar');
    if (settings.user) av.textContent = settings.user[0].toUpperCase();
    else av.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-user"/></svg>';
  }

  function applyKeyboardVisibility() { el.keyboard.hidden = !settings.showKeyboard; }

  /* Runs after any on/off setting changes */
  function onToggle(key) {
    updateToggles();
    switch (key) {
      case 'punctuation': case 'numbers': if (state.view === 'test') newTest(); else state.stale = true; break;
      case 'showKeyboard': applyKeyboardVisibility(); break;
      case 'sound': if (settings.sound) beep(700, 0.08, 'triangle', 1); break;
      case 'reducedMotion': case 'highContrast': applyAppearance(); break;
      case 'autoPause': if (!settings.autoPause) resume(); break;
    }
  }

  /* ---------------------------------------------------------
     Practice, leaderboard, settings views
  --------------------------------------------------------- */
  function renderPractice() {
    $$('.source-card').forEach(b => b.setAttribute('aria-pressed', b.dataset.source === settings.source));
    $('#customTextWrap').hidden = settings.source !== 'custom';
    $('#customText').value = settings.customText;
    syncUI();
  }

  function renderLeaderboard() {
    const history = store.get('history', []);
    const bests = store.get('bests', {});
    const avg = (arr, k) => arr.length ? Math.round(arr.reduce((s, x) => s + x[k], 0) / arr.length) : 0;
    const bestWpm = history.reduce((m, h) => Math.max(m, h.wpm), 0);
    const { streak } = streakInfo();

    $('#lbSummary').innerHTML = [
      [history.length, 'Tests completed'], [bestWpm, 'Best WPM'], [avg(history, 'wpm'), 'Average WPM'],
      [history.length ? avg(history, 'acc') + '%' : '—', 'Average accuracy'], [streak, 'Day streak']
    ].map(([v, l]) => `<div class="stat neu-sm"><span class="stat-value">${v}</span><span class="stat-label">${l}</span></div>`).join('');

    const weak = weakLetters(store.get('keystats', {}), 8, 8);
    $('#lbWeak').innerHTML = weak.length ? weakChipsHTML(weak) : '<p class="empty">Finish a few tests and your most-missed letters will show up here.</p>';
    $('#lbWeakBtn').hidden = !weak.length;

    const list = Object.values(bests).sort((a, b) => a.type === b.type ? a.value - b.value : a.type === 'time' ? -1 : 1);
    $('#lbBests').innerHTML = list.length
      ? list.map(b => `<div class="best-card neu-sm"><span class="stat-value">${b.wpm} WPM</span><strong>${modeLabel(b.type, b.value)} · ${prettyDiff(b.difficulty)}</strong><small>${b.acc}% accuracy · ${new Date(b.date).toLocaleDateString()}</small></div>`).join('')
      : '<p class="empty">No personal bests yet. Finish a test to set your first record.</p>';

    const table = rows => `<table><thead><tr><th>#</th><th>Name</th><th>WPM</th><th>Raw</th><th>Acc</th><th>Test</th><th>Source</th><th>Date</th></tr></thead><tbody>${rows.map((h, i) =>
      `<tr><td>${i + 1}</td><td>${esc(h.user)}</td><td class="wpm">${h.wpm}</td><td>${h.raw}</td><td>${h.acc}%</td><td>${esc(h.mode)} · ${prettyDiff(h.difficulty)}</td><td>${esc(h.label || ((SOURCE_LABELS[h.source] || '') + langSuffix(h.lang)))}</td><td>${new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>`).join('')}</tbody></table>`;

    const top = [...history].sort((a, b) => b.wpm - a.wpm).slice(0, 10);
    $('#lbTop').innerHTML = top.length ? table(top) : '<p class="empty">Nothing here yet.</p>';
    const recent = history.slice(0, 20);
    $('#lbHistory').innerHTML = recent.length ? table(recent) : '<p class="empty">Your test history will appear here.</p>';

    if (api.ach) api.ach.render();
    requestAnimationFrame(drawHistoryChart);
  }

  function renderSettings() {
    $$('[data-setting]').forEach(b => b.setAttribute('aria-pressed', String(settings[b.dataset.setting]) === b.dataset.value));
    updateToggles();
  }

  /* ---------------------------------------------------------
     Practice sessions (lessons, drills, zen, book, daily, ladder, blind)
     A session overrides where the words come from and how the run ends.
       { kind, label, mode?, gen?(n), zen?, blind?, onFinish?(res) }
  --------------------------------------------------------- */
  const root = document.documentElement;
  function paintSession() {
    const s = state.session;
    root.classList.toggle('session', !!s);
    root.classList.toggle('session-zen', !!(s && s.zen));
    root.classList.toggle('session-blind', !!(s && s.blind));
    const bar = $('#sessionBar');
    if (bar) {
      bar.hidden = !s;
      $('#sessionLabel').textContent = s ? s.label : '';
      $('#sessionFinish').hidden = !(s && s.zen);
    }
  }
  function clearSession() { state.session = null; paintSession(); }
  function startSession(s) {
    if (state.race || !s) return;
    state.session = s;
    state.stale = false;
    paintSession();
    if (location.hash !== '#test') location.hash = '#test';
    resetRun(false);
  }
  function exitSession() {
    if (!state.session) return;
    clearSession();
    resetRun(false);
  }
  function renderSessionNote(out) {
    const box = $('#sessionNote');
    if (!box) return;
    if (!out || (!out.title && !out.note)) { box.hidden = true; box.innerHTML = ''; box.className = 'session-note neu-inset'; return; }
    box.hidden = false;
    box.className = 'session-note neu-inset ' + (out.status || 'info');
    box.innerHTML = `<div><strong>${esc(out.title || '')}</strong><p>${esc(out.note || '')}</p></div>` +
      (out.next ? `<button class="btn primary" id="sessionNext" type="button">${esc(out.nextLabel || 'Next')}</button>` : '');
    if (out.next) $('#sessionNext').addEventListener('click', () => out.next());
  }
  $('#sessionExit').addEventListener('click', exitSession);
  $('#sessionFinish').addEventListener('click', () => { if (state.session && state.session.zen) finish(); });

  function startWeakKeyPractice(keys) {
    if (!keys.length) { toast('Finish a few tests first so I can find your weak keys'); return; }
    settings.weakKeys = keys;
    settings.source = 'keys';
    saveSettings();
    newTest();
    goTo('test');
  }

  /* ---------------------------------------------------------
     Routing
  --------------------------------------------------------- */
  const VIEWS = ['test', 'practice', 'leaderboard', 'settings', 'versus'];

  function route() {
    const wanted = location.hash.slice(1);
    let view = VIEWS.includes(wanted) ? wanted : 'test';
    if (state.race && view !== 'test') {            // can't leave the test page during a race
      toast('Race in progress. Finish it first.');
      location.hash = '#test';
      view = 'test';
    }
    if (state.view === 'test' && view !== 'test' && state.started && !state.finished && !state.race) resetRun(true);
    state.view = view;
    VIEWS.forEach(v => { $('#view-' + v).hidden = v !== view; });
    $$('.nav-link').forEach(a => a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (view === 'practice') { renderPractice(); if (api.practice) api.practice.render(); }
    if (view === 'leaderboard') renderLeaderboard();
    if (view === 'settings') renderSettings();
    if (view === 'versus' && api.onVersusOpen) api.onVersusOpen();
    if (view === 'test') {
      if (state.stale) { state.stale = false; newTest(); }
      syncUI(); focusInput(); drawResultChart();
      requestAnimationFrame(updateCaret);
    }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);

  /* ---------------------------------------------------------
     Event wiring
  --------------------------------------------------------- */
  // Time / word modes
  $$('[data-mode]').forEach(b => b.addEventListener('click', e => {
    setMode(b.dataset.mode, +b.dataset.value);
    if (e.detail > 0) focusInput();
  }));

  // Difficulty (toolbar + practice)
  $$('[data-difficulty]').forEach(b => b.addEventListener('click', e => {
    settings.difficulty = b.dataset.difficulty;
    saveSettings(); syncUI();
    if (state.view === 'test') { newTest(); if (e.detail > 0) focusInput(); }
    else state.stale = true;
  }));

  // On/off toggles (toolbar buttons and settings switches)
  $$('[data-toggle]').forEach(b => b.addEventListener('click', e => {
    toggleSetting(b.dataset.toggle);
    if (e.detail > 0 && state.view === 'test') focusInput();
  }));

  // Restart, retry, new test
  $('#restartBtn').addEventListener('click', newTest);
  $('#newBtn').addEventListener('click', newTest);
  $('#retryBtn').addEventListener('click', () => resetRun(true));

  // Language selects (toolbar + settings)
  $$('[data-lang-select]').forEach(sel => sel.addEventListener('change', () => {
    if (!LANGS[sel.value]) return;
    settings.language = sel.value; saveSettings(); newTest(); syncUI();
    toast('Language: ' + LANGS[sel.value].name);
  }));

  // Theme
  $('#themeToggle').addEventListener('click', () => {
    settings.theme = isDark(settings.theme) ? 'light' : 'dark';
    saveSettings(); applyAppearance(); renderSettings();
  });

  // Settings view segmented buttons
  $$('[data-setting]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.value;
    settings[b.dataset.setting] = /^\d+$/.test(v) ? +v : v;
    saveSettings(); applyAppearance(); renderSettings(); updateGoalChip();
    if (b.dataset.setting === 'layout') buildKeyboard();
    if (b.dataset.setting === 'volume') beep(700, 0.08, 'triangle', 1);
  }));

  // Custom test dialog
  const customKind = $('#customKind'), customValue = $('#customValue');
  function syncCustomRange() {
    const t = customKind.value === 'time';
    customValue.min = 5; customValue.max = t ? 600 : 500;
    $('#customRange').textContent = t ? '(5 to 600 seconds)' : '(5 to 500 words)';
  }
  customKind.addEventListener('change', syncCustomRange);
  el.customBtn.addEventListener('click', () => {
    customKind.value = settings.mode.type;
    customValue.value = settings.mode.value;
    syncCustomRange();
    openDialog(el.customDialog);
    customValue.select();
  });
  $('#customCancel').addEventListener('click', () => el.customDialog.close());
  let customApplied = false;
  $('#customForm').addEventListener('submit', () => {
    const t = customKind.value;
    const v = clamp(parseInt(customValue.value, 10) || 30, 5, t === 'time' ? 600 : 500);
    settings.mode = { type: t, value: v };
    saveSettings();
    customApplied = true;
  });
  el.customDialog.addEventListener('close', () => {
    if (customApplied) { customApplied = false; newTest(); }
    else focusInput();
  });

  // Profile dialog
  $('#profileBtn').addEventListener('click', () => {
    $('#profileName').value = settings.user;
    openDialog(el.profileDialog);
    $('#profileName').focus();
  });
  $('#profileForm').addEventListener('submit', () => {
    settings.user = $('#profileName').value.trim().slice(0, 20);
    saveSettings(); applyProfile();
  });
  $('#guestBtn').addEventListener('click', () => {
    settings.user = ''; saveSettings(); applyProfile(); el.profileDialog.close();
    toast('Guest mode on');
  });
  el.profileDialog.addEventListener('close', focusInput);

  // Help dialog
  $('#helpBtn').addEventListener('click', () => openDialog(el.helpDialog));
  $('#helpClose').addEventListener('click', () => el.helpDialog.close());
  el.helpDialog.addEventListener('close', focusInput);
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // Practice
  $$('.source-card').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.source === 'keys') {
      const weak = weakLetters(store.get('keystats', {}), 8, 6).map(w => w.key);
      if (!weak.length) { toast('Finish a few tests first so I can find your weak keys'); return; }
      settings.weakKeys = weak;
    }
    settings.source = b.dataset.source; saveSettings(); renderPractice(); state.stale = true;
    if (settings.source === 'custom') $('#customText').focus();
  }));
  $('#customText').addEventListener('input', e => { settings.customText = e.target.value; saveSettings(); });
  $('#startPractice').addEventListener('click', () => {
    if (settings.source === 'custom' && !settings.customText.trim()) { toast('Add some custom text first'); $('#customText').focus(); return; }
    newTest();
    goTo('test');
  });

  // Weak keys
  $('#weakBtn').addEventListener('click', () => startWeakKeyPractice(state.weakThisTest.map(w => w.key)));
  $('#lbWeakBtn').addEventListener('click', () => startWeakKeyPractice(weakLetters(store.get('keystats', {}), 8, 6).map(w => w.key)));

  // Share
  $('#shareBtn').addEventListener('click', async () => {
    const r = state.lastResult;
    if (!r) return;
    if (window.NEUTYPE.cards) { window.NEUTYPE.cards.open('result', { res: r, user: settings.user || 'Guest', langName: (LANGS[r.lang] || {}).name || 'English', modeText: modeLabel(r.type, r.value) }); return; }
    const msg = `I just typed ${r.wpm} WPM with ${r.acc}% accuracy on Softra (${modeLabel(r.type, r.value)}, ${r.difficulty})!`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Softra result', text: msg }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(msg);
      else {
        const ta = document.createElement('textarea');
        ta.value = msg; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      toast('Result copied to clipboard');
    } catch { toast('Could not copy. Select and copy this: ' + msg); }
  });

  // Data management: clear, export, import
  $('#clearData').addEventListener('click', () => {
    if (!confirm('Delete all saved test history, records, streaks and key stats on this device?')) return;
    ['history', 'bests', 'daily', 'keystats', 'ach', 'stats'].forEach(k => store.remove(k));
    renderLeaderboard(); updateGoalChip(); toast('History, records and achievements cleared');
  });

  $('#exportData').addEventListener('click', () => {
    const data = {
      app: 'neutype', exportedAt: new Date().toISOString(), settings,
      history: store.get('history', []), bests: store.get('bests', {}),
      daily: store.get('daily', {}), keystats: store.get('keystats', {}),
      ach: store.get('ach', {}), stats: store.get('stats', {})
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'neutype-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad file');
      const num = v => Number.isFinite(+v) ? +v : 0;

      // history: validate, dedupe by id, newest first
      const history = store.get('history', []);
      const ids = new Set(history.map(h => h.id));
      let added = 0;
      (Array.isArray(data.history) ? data.history : []).forEach(h => {
        if (!h || !Number.isFinite(+h.wpm) || !Number.isFinite(+h.acc) || !Number.isFinite(+h.date)) return;
        const id = num(h.id) || num(h.date);
        if (ids.has(id)) return;
        ids.add(id); added++;
        history.push({
          id, date: num(h.date), user: String(h.user || 'Guest').slice(0, 20),
          wpm: num(h.wpm), raw: num(h.raw), acc: num(h.acc), mode: String(h.mode || '').slice(0, 20),
          type: h.type === 'words' ? 'words' : 'time', value: num(h.value),
          difficulty: DIFFS.includes(h.difficulty) ? h.difficulty : 'medium',
          source: SOURCE_LABELS[h.source] ? h.source : 'random', duration: num(h.duration), lang: LANGS[h.lang] ? h.lang : 'english'
        });
      });
      history.sort((a, b) => b.date - a.date);
      store.set('history', history.slice(0, 200));

      // bests: keep the higher WPM
      const bests = store.get('bests', {});
      Object.values(data.bests && typeof data.bests === 'object' ? data.bests : {}).forEach(b => {
        if (!b || !(b.type === 'time' || b.type === 'words') || !DIFFS.includes(b.difficulty) || !(num(b.wpm) > 0)) return;
        const key = `${b.type}:${num(b.value)}:${b.difficulty}`;
        if (!bests[key] || num(b.wpm) > bests[key].wpm) {
          bests[key] = { wpm: num(b.wpm), acc: num(b.acc), date: num(b.date) || Date.now(), type: b.type, value: num(b.value), difficulty: b.difficulty };
        }
      });
      store.set('bests', bests);

      // daily counts: keep the higher count per day
      const daily = store.get('daily', {});
      Object.entries(data.daily && typeof data.daily === 'object' ? data.daily : {}).forEach(([k, v]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && num(v) > (daily[k] || 0)) daily[k] = num(v);
      });
      store.set('daily', daily);

      // achievements: union, keeping the earliest unlock time
      const ach = store.get('ach', {});
      Object.entries(data.ach && typeof data.ach === 'object' ? data.ach : {}).forEach(([k, v]) => {
        if (/^[a-z0-9_]{1,30}$/.test(k) && num(v) > 0 && (!ach[k] || num(v) < ach[k])) ach[k] = num(v);
      });
      store.set('ach', ach);

      renderLeaderboard(); updateGoalChip();
      toast(added ? `Imported ${added} new ${added === 1 ? 'run' : 'runs'}` : 'Nothing new to import');
    } catch {
      toast('That file is not a valid Softra export');
    }
  });

  /* ---------------------------------------------------------
     Install as an app (PWA)
  --------------------------------------------------------- */
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e;
    $('#installRow').hidden = false;
  });
  window.addEventListener('appinstalled', () => { installEvent = null; $('#installRow').hidden = true; toast('Softra installed'); });
  $('#installBtn').addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    $('#installRow').hidden = true;
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }

  /* ---------------------------------------------------------
     Versus API (used by multiplayer.js)
  --------------------------------------------------------- */
  const api = window.NEUTYPE = {
    toast, esc,
    languages: () => Object.keys(LANGS).map(k => ({ id: k, name: LANGS[k].name, native: LANGS[k].native })),
    focus: focusInput,
    startSession, exitSession, session: () => state.session,
    startTest: () => { resetRun(false); },
    samples: () => state.samples.map(x => Math.round(x.wpm)),
    onReactKey: null,
    settings: () => ({ language: settings.language, difficulty: settings.difficulty, source: settings.source, punctuation: settings.punctuation, numbers: settings.numbers, user: settings.user }),
    saveUser(name) { settings.user = name; saveSettings(); applyProfile(); },

    /* Build a word list for a room using the host's chosen options, without
       changing the host's own saved settings. */
    generateRaceWords(o) {
      const keep = { l: settings.language, d: settings.difficulty, s: settings.source, p: settings.punctuation, n: settings.numbers, f: state.fixed };
      settings.difficulty = o.difficulty; settings.source = o.source;
      settings.language = LANGS[o.language] ? o.language : 'english';
      settings.punctuation = !!o.punctuation; settings.numbers = !!o.numbers;
      state.fixed = o.type === 'words';
      try { return generateChunk(o.type === 'words' ? o.value : 300); }
      finally {
        settings.difficulty = keep.d; settings.source = keep.s; settings.language = keep.l;
        settings.punctuation = keep.p; settings.numbers = keep.n; state.fixed = keep.f;
      }
    },

    /* Put the test panel into a locked race state; call go() to start the clock. */
    beginRace(o) {
      if (state.session) clearSession();
      state.race = { words: o.words, mode: { type: o.type, value: o.value }, locked: true, finished: false, result: null, onFinish: o.onFinish };
      document.documentElement.classList.remove('race-done');
      $('#view-test').classList.add('racing');
      state.words = o.words.slice();
      resetRun(true);
      if (location.hash !== '#test') location.hash = '#test'; else route();
    },
    go() {
      if (!state.race) return;
      state.race.locked = false;
      startTimer();
      focusInput();
    },
    snapshot() {
      if (!state.race) return null;
      const c = computeCounts();
      const e = state.started ? elapsed() : 0;
      const wpm = state.started ? c.wpmChars / 5 / Math.max(e, 1) * 60 : 0;
      return { p: state.race.finished ? 1 : progressFraction(e), wpm: Math.round(wpm), acc: state.keys.total ? accuracy() : 100, done: state.race.finished };
    },
    isRacing: () => !!state.race,
    /* Race over: restore the normal test page and go to the given view */
    endRace(view) {
      clearInterval(state.timerId);
      state.race = null;
      document.documentElement.classList.remove('race-done');
      $('#view-test').classList.remove('racing');
      resetRun(false);
      if (view) location.hash = '#' + view;
    },
    onVersusOpen: null
  };

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  $$('[data-lang-select]').forEach(sel => {
    sel.innerHTML = Object.keys(LANGS).map(k => `<option value="${k}">${esc(LANGS[k].name)}${LANGS[k].native !== LANGS[k].name ? ' (' + esc(LANGS[k].native) + ')' : ''}</option>`).join('');
    sel.value = settings.language;
  });
  applyAppearance();
  applyProfile();
  buildKeyboard();
  applyKeyboardVisibility();
  newTest();
  route();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateCaret);
})();
