/* =========================================================
   Softra: achievements

   Progress lives in localStorage:
     neutype:ach    { achievementId: unlockedTimestamp }
     neutype:stats  { tests, langs:{}, vs:{played,wins,teamWins} }
   app.js calls onTest() after every solo test, multiplayer.js calls
   onVersus() after a Versus race, and cards.js calls onShare().
   ========================================================= */
(() => {
  'use strict';
  const N = window.NEUTYPE;
  if (!N) return;

  const $ = s => document.querySelector(s);
  const esc = N.esc;

  /* 24x24 line icons, shared with the share cards (cards.js) */
  const ICONS = {
    keyboard: 'M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM6 10.5h.01M10 10.5h.01M14 10.5h.01M18 10.5h.01M7.5 14h9',
    bolt: 'M13 2L5 13.5h6L10 22l8-11.5h-6z',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.3.8 2 1.6 2.4C10.2 8.4 10.6 5.6 12 3z',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2',
    book: 'M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5V19c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5zM12 6v13.5',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21M12 3C9.5 5.5 8.2 8.5 8.2 12S9.5 18.5 12 21',
    users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.3 3.3 0 0 1 0 6.3M17.5 14c2.5.6 4 2.6 4 6',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20h7M10 17h4',
    crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
    share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13'
  };
  N.ICONS = ICONS;

  const iconSVG = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  /* ---------------------------------------------------------
     Storage
  --------------------------------------------------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('neutype:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('neutype:' + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  function getStats() {
    const s = store.get('stats', {}) || {};
    s.tests = +s.tests || 0;
    s.langs = s.langs && typeof s.langs === 'object' ? s.langs : {};
    s.vs = s.vs && typeof s.vs === 'object' ? s.vs : {};
    s.vs.played = +s.vs.played || 0; s.vs.wins = +s.vs.wins || 0; s.vs.teamWins = +s.vs.teamWins || 0;
    return s;
  }

  /* ---------------------------------------------------------
     Definitions
     kind: 'test' (after a solo test), 'vs' (after a race), 'share'
  --------------------------------------------------------- */
  const solid = r => r.acc >= 90 && r.duration >= 10;       // counts for speed badges
  const PRACTICE_OK = new Set(['first_test', 'tests_10', 'tests_50', 'tests_100', 'streak_3', 'streak_7', 'streak_30', 'daily_goal', 'weak_keys', 'poly_3', 'poly_10']);
  const is = w => x => x.what === w;
  const DEFS = [
    { id: 'first_test', kind: 'test', icon: 'keyboard', name: 'First Steps', desc: 'Finish your first typing test.', test: x => x.s.tests >= 1 },
    { id: 'tests_10', kind: 'test', icon: 'flame', name: 'Getting Warm', desc: 'Finish 10 tests.', test: x => x.s.tests >= 10 },
    { id: 'tests_50', kind: 'test', icon: 'clock', name: 'Dedicated', desc: 'Finish 50 tests.', test: x => x.s.tests >= 50 },
    { id: 'tests_100', kind: 'test', icon: 'crown', name: 'Centurion', desc: 'Finish 100 tests.', test: x => x.s.tests >= 100 },

    { id: 'wpm_30', kind: 'test', icon: 'bolt', name: 'Warming Up', desc: 'Reach 30 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 30 },
    { id: 'wpm_50', kind: 'test', icon: 'bolt', name: 'Steady Hands', desc: 'Reach 50 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 50 },
    { id: 'wpm_70', kind: 'test', icon: 'bolt', name: 'Fast Fingers', desc: 'Reach 70 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 70 },
    { id: 'wpm_90', kind: 'test', icon: 'bolt', name: 'Speedster', desc: 'Reach 90 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 90 },
    { id: 'wpm_110', kind: 'test', icon: 'bolt', name: 'Lightning', desc: 'Reach 110 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 110 },
    { id: 'wpm_130', kind: 'test', icon: 'crown', name: 'Typing Legend', desc: 'Reach 130 WPM with 90%+ accuracy.', test: x => solid(x.r) && x.r.wpm >= 130 },

    { id: 'perfect', kind: 'test', icon: 'shield', name: 'Flawless', desc: 'Finish a test with 100% accuracy (at least 15 seconds).', test: x => x.r.acc === 100 && x.r.duration >= 15 && x.r.total >= 40 },
    { id: 'sharp', kind: 'test', icon: 'target', name: 'Sharpshooter', desc: 'Get 98%+ accuracy at 40+ WPM.', test: x => x.r.acc >= 98 && x.r.wpm >= 40 && x.r.duration >= 10 },
    { id: 'marathon', kind: 'test', icon: 'clock', name: 'Marathon', desc: 'Finish a 120 second test.', test: x => x.r.type === 'time' && x.r.value >= 120 && x.r.duration >= 119 },
    { id: 'wordsmith', kind: 'test', icon: 'book', name: 'Wordsmith', desc: 'Finish a 100-word test.', test: x => x.r.type === 'words' && x.r.value >= 100 },
    { id: 'hard', kind: 'test', icon: 'flame', name: 'Hard Mode', desc: 'Reach 40 WPM on Hard difficulty.', test: x => x.r.difficulty === 'hard' && solid(x.r) && x.r.wpm >= 40 },
    { id: 'expert', kind: 'test', icon: 'shield', name: 'Expert Typist', desc: 'Reach 40 WPM on Expert difficulty.', test: x => x.r.difficulty === 'expert' && solid(x.r) && x.r.wpm >= 40 },
    { id: 'master', kind: 'test', icon: 'crown', name: 'Grandmaster', desc: 'Reach 40 WPM on Master difficulty.', test: x => x.r.difficulty === 'master' && solid(x.r) && x.r.wpm >= 40 },
    { id: 'symbols', kind: 'test', icon: 'star', name: 'Symbol Master', desc: 'Reach 40 WPM with punctuation and numbers both on.', test: x => x.r.punctuation && x.r.numbers && solid(x.r) && x.r.wpm >= 40 },

    { id: 'streak_3', kind: 'test', icon: 'flame', name: 'On a Roll', desc: 'Keep a 3-day streak.', test: x => x.c.streak >= 3 },
    { id: 'streak_7', kind: 'test', icon: 'star', name: 'Weekly Habit', desc: 'Keep a 7-day streak.', test: x => x.c.streak >= 7 },
    { id: 'streak_30', kind: 'test', icon: 'crown', name: 'Unstoppable', desc: 'Keep a 30-day streak.', test: x => x.c.streak >= 30 },
    { id: 'daily_goal', kind: 'test', icon: 'target', name: 'Goal Getter', desc: 'Reach your daily goal.', test: x => x.c.goal > 0 && x.c.today >= x.c.goal },
    { id: 'weak_keys', kind: 'test', icon: 'keyboard', name: 'Key Doctor', desc: 'Finish a Weak keys practice test.', test: x => x.c.source === 'keys' },

    { id: 'poly_3', kind: 'test', icon: 'globe', name: 'Polyglot', desc: 'Finish tests in 3 different languages.', test: x => Object.keys(x.s.langs).length >= 3 },
    { id: 'poly_10', kind: 'test', icon: 'globe', name: 'World Typist', desc: 'Finish tests in 10 different languages.', test: x => Object.keys(x.s.langs).length >= 10 },

    { id: 'vs_first', kind: 'vs', icon: 'users', name: 'Challenger', desc: 'Finish a Versus race.', test: x => x.s.vs.played >= 1 },
    { id: 'vs_win', kind: 'vs', icon: 'trophy', name: 'Victor', desc: 'Win a Versus race.', test: x => x.s.vs.wins >= 1 },
    { id: 'vs_team', kind: 'vs', icon: 'users', name: 'Team Player', desc: 'Win a team Versus race.', test: x => x.s.vs.teamWins >= 1 },
    { id: 'vs_5', kind: 'vs', icon: 'trophy', name: 'Champion', desc: 'Win 5 Versus races.', test: x => x.s.vs.wins >= 5 },

    /* lessons */
    { id: 'lesson_first', kind: 'practice', icon: 'book', name: 'Student', desc: 'Pass your first lesson.', test: x => x.what === 'lesson' && x.passedCount >= 1 },
    { id: 'tier_beginner', kind: 'practice', icon: 'keyboard', name: 'Beginner Graduate', desc: 'Pass every Beginner lesson.', test: x => x.what === 'lesson' && x.tiers.beginner.passed === x.tiers.beginner.total },
    { id: 'tier_intermediate', kind: 'practice', icon: 'bolt', name: 'Intermediate Graduate', desc: 'Pass every Intermediate lesson.', test: x => x.what === 'lesson' && x.tiers.intermediate.passed === x.tiers.intermediate.total },
    { id: 'tier_pro', kind: 'practice', icon: 'crown', name: 'Pro Graduate', desc: 'Pass every Pro lesson.', test: x => x.what === 'lesson' && x.tiers.pro.passed === x.tiers.pro.total },
    { id: 'gold_beginner', kind: 'practice', icon: 'star', name: 'Gold Beginner', desc: 'Earn 3 stars on every Beginner lesson.', test: x => x.what === 'lesson' && x.tiers.beginner.gold === x.tiers.beginner.total },
    { id: 'gold_intermediate', kind: 'practice', icon: 'star', name: 'Gold Intermediate', desc: 'Earn 3 stars on every Intermediate lesson.', test: x => x.what === 'lesson' && x.tiers.intermediate.gold === x.tiers.intermediate.total },
    { id: 'gold_pro', kind: 'practice', icon: 'trophy', name: 'Gold Pro', desc: 'Earn 3 stars on every Pro lesson.', test: x => x.what === 'lesson' && x.tiers.pro.gold === x.tiers.pro.total },
    { id: 'scholar', kind: 'practice', icon: 'globe', name: 'Typing Scholar', desc: 'Pass all 18 lessons.', test: x => x.what === 'lesson' && x.passedCount >= x.total },
    /* training */
    { id: 'daily_first', kind: 'practice', icon: 'clock', name: 'Daily Dedication', desc: 'Finish a daily challenge.', test: is('daily') },
    { id: 'daily_7', kind: 'practice', icon: 'flame', name: 'Challenger Week', desc: 'Finish 7 daily challenges.', test: x => x.what === 'daily' && x.days >= 7 },
    { id: 'ladder_3', kind: 'practice', icon: 'bolt', name: 'Climbing', desc: 'Clear 3 levels of the speed ladder.', test: x => x.what === 'ladder' && x.cleared >= 3 },
    { id: 'ladder_max', kind: 'practice', icon: 'crown', name: 'Top of the Ladder', desc: 'Clear every speed ladder level.', test: x => x.what === 'ladder' && x.cleared >= 11 },
    { id: 'finger_drill', kind: 'practice', icon: 'keyboard', name: 'Nimble Fingers', desc: 'Finish a finger drill with 95%+ accuracy.', test: x => x.what === 'finger' && x.acc >= 95 && x.wpm >= 20 },
    { id: 'pair_drill', kind: 'practice', icon: 'target', name: 'Pair Perfect', desc: 'Finish a letter pair drill with 95%+ accuracy.', test: x => x.what === 'pairs' && x.acc >= 95 && x.wpm >= 20 },
    { id: 'zen_50', kind: 'practice', icon: 'shield', name: 'Zen Typist', desc: 'Type 50 words in Zen mode.', test: x => x.what === 'zen' && x.words >= 50 },
    { id: 'blind_90', kind: 'practice', icon: 'target', name: 'Eyes Closed', desc: 'Finish Blind mode with 90%+ accuracy at 25+ WPM.', test: x => x.what === 'blind' && x.acc >= 90 && x.wpm >= 25 },
    { id: 'bookworm', kind: 'practice', icon: 'book', name: 'Bookworm', desc: 'Finish a page in the Book reader.', test: is('book') },
    { id: 'book_done', kind: 'practice', icon: 'trophy', name: 'Cover to Cover', desc: 'Finish a whole text in the Book reader.', test: x => x.what === 'book' && x.done },

    { id: 'shared', kind: 'share', icon: 'share', name: 'Show Off', desc: 'Download or share a card.', test: () => true }
  ];
  const byId = Object.fromEntries(DEFS.map(d => [d.id, d]));

  /* ---------------------------------------------------------
     Unlocking
  --------------------------------------------------------- */
  function unlock(kind, ctx) {
    const have = store.get('ach', {}) || {};
    const fresh = [];
    DEFS.forEach(d => {
      if (d.kind !== kind || have[d.id]) return;
      if (kind === 'test' && ctx.r && ctx.r.practice && !PRACTICE_OK.has(d.id)) return;   // lessons and drills do not count as real speed runs
      let ok = false;
      try { ok = !!d.test(ctx); } catch { ok = false; }
      if (ok) { have[d.id] = Date.now(); fresh.push(d); }
    });
    if (fresh.length) store.set('ach', have);
    return fresh;
  }

  /* res: the finished test; c: { streak, today, goal, source, langUsed } */
  function onTest(res, c) {
    const s = getStats();
    s.tests++;
    s.langs[c.langUsed || 'english'] = 1;
    store.set('stats', s);
    return unlock('test', { r: res, s, c: c || {} });
  }

  /* o: { finished, won, teamWin } */
  function onVersus(o) {
    if (!o || !o.finished) return [];
    const s = getStats();
    s.vs.played++;
    if (o.won) s.vs.wins++;
    if (o.teamWin) s.vs.teamWins++;
    store.set('stats', s);
    const fresh = unlock('vs', { s });
    showNew(fresh, true);
    return fresh;
  }

  function onPractice(what, payload) {
    return unlock('practice', Object.assign({ what }, payload || {}));
  }

  function onShare() {
    const fresh = unlock('share', {});
    showNew(fresh, true);
    return fresh;
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  function showNew(list, toastOnly) {
    list = list || [];
    list.forEach(d => N.toast(`Achievement unlocked: ${d.name}`));
    if (toastOnly) return;
    const box = $('#achNew');
    if (!box) return;
    box.hidden = !list.length;
    box.innerHTML = list.length
      ? `<h3>${list.length === 1 ? 'Achievement unlocked' : 'Achievements unlocked'}</h3><div class="ach-new-list">` +
        list.map(d => `<button class="ach-chip" type="button" data-ach="${d.id}">${iconSVG(d.icon)}<span><strong>${esc(d.name)}</strong><small>${esc(d.desc)}</small></span></button>`).join('') + '</div>'
      : '';
  }

  function render() {
    const grid = $('#achGrid');
    if (!grid) return;
    const have = store.get('ach', {}) || {};
    const done = DEFS.filter(d => have[d.id]).length;
    $('#achCount').textContent = `${done} / ${DEFS.length}`;
    $('#achFill').style.width = Math.round(100 * done / DEFS.length) + '%';
    $('#achBar').setAttribute('aria-valuenow', Math.round(100 * done / DEFS.length));
    grid.innerHTML = DEFS.map(d => {
      const at = have[d.id];
      const when = at ? 'Unlocked ' + new Date(at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Locked';
      return `<button class="ach-card${at ? ' unlocked' : ''}" type="button" data-ach="${d.id}"${at ? '' : ' disabled'} aria-label="${esc(d.name)}. ${esc(d.desc)} ${when}.">
        <span class="ach-icon">${iconSVG(d.icon)}</span>
        <span class="ach-text"><strong>${esc(d.name)}</strong><small>${esc(d.desc)}</small><em>${when}</em></span></button>`;
    }).join('');
  }

  function openCardFor(id) {
    const d = byId[id];
    const at = (store.get('ach', {}) || {})[id];
    if (!d || !at || !N.cards) return;
    N.cards.open('achievement', { def: d, at, done: Object.keys(store.get('ach', {}) || {}).length, total: DEFS.length });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ach]');
    if (b && !b.disabled) openCardFor(b.dataset.ach);
  });

  const lb = $('#view-leaderboard');
  setTimeout(() => { if (lb && !lb.hidden) render(); }, 0);   // opened straight on #leaderboard

  N.ach = { DEFS, onTest, onVersus, onShare, onPractice, showNew, render, count: () => Object.keys(store.get('ach', {}) || {}).length };
})();
