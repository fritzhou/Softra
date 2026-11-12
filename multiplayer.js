/* =========================================================
   Softra: Versus (online multiplayer)

   How it works
   - Players are guests. One person creates a room (random 5-letter code),
     everyone else types the same code to join.
   - Transport is a Supabase Realtime channel named after the room code.
     No tables or database are used.
   - Lobby state (players, teams, ready, host settings) lives in Realtime
     "presence". The race itself uses short "broadcast" messages.
   - The host generates the text once and sends the SAME words to everyone.
   - Every browser reports its own final score, so a determined cheater
     could fake one. That is fine for friends and classmates.
   ========================================================= */
(() => {
  'use strict';
  const N = window.NEUTYPE;
  if (!N) return;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = N.esc;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cfg = window.NEUTYPE_CONFIG || {};

  /* ---------------------------------------------------------
     Constants
  --------------------------------------------------------- */
  const FORMATS = {
    '1v1':     { teams: 2, size: 1, ffa: true },
    '1v1v1':   { teams: 3, size: 1, ffa: true },
    '1v1v1v1': { teams: 4, size: 1, ffa: true },
    '2v2':     { teams: 2, size: 2 },
    '2v2v2':   { teams: 3, size: 2 },
    '3v3v3':   { teams: 3, size: 3 }
  };
  const TEAM_NAMES = ['Team A', 'Team B', 'Team C'];
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I
  const TIME_OPTS = [15, 30, 60, 120], WORD_OPTS = [10, 25, 50, 100];
  const SOURCES = { random: 'Random words', common: 'Common words', quotes: 'English quotes', code: 'Programming' };
  const DIFFS = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
  const DEFAULT_SETTINGS = { format: '1v1', type: 'time', value: 30, difficulty: 'medium', source: 'random', punctuation: false, numbers: false, language: 'english' };
  const REACTIONS = [['👏', 'Clap'], ['🔥', 'Fire'], ['😮', 'Wow'], ['😂', 'Haha'], ['💪', 'Strong'], ['GG', 'Good game']];
  const langName = id => { const l = N.languages().find(x => x.id === id); return l ? l.name : 'English'; };

  const maxPlayers = f => FORMATS[f].teams * FORMATS[f].size;
  const isTeamFormat = f => !FORMATS[f].ffa;

  /* ---------------------------------------------------------
     State
  --------------------------------------------------------- */
  const S = {
    client: null, channel: null, code: '', myId: '', name: '',
    isHost: false, joinedAt: 0, team: 0, ready: false,
    hostPhase: 'lobby', settings: { ...DEFAULT_SETTINGS },
    players: [], host: null,
    phase: 'entry',            // entry | lobby | countdown | racing | results
    race: null, timers: {}, hostGoneTimer: 0, busy: false
  };

  const el = {
    setup: $('#vsSetup'), setupMsg: $('#vsSetupMsg'), entry: $('#vsEntry'), lobby: $('#vsLobby'), results: $('#vsResults'),
    name: $('#vsName'), codeIn: $('#vsCodeIn'), status: $('#vsStatus'), code: $('#vsCode'), count: $('#vsCount'),
    players: $('#vsPlayers'), settings: $('#vsSettings'), actions: $('#vsActions'), resultBody: $('#vsResultBody'),
    raceTitle: $('#raceTitle'), raceNote: $('#raceNote'), raceRows: $('#raceRows'),
    cd: $('#raceCountdown'), cdNum: $('#cdNum')
  };

  /* ---------------------------------------------------------
     Small helpers
  --------------------------------------------------------- */
  const store = {
    get(k) { try { return localStorage.getItem('neutype:' + k) || ''; } catch { return ''; } },
    set(k, v) { try { localStorage.setItem('neutype:' + k, v); } catch { /* ignore */ } }
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
  const randomCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  const cleanName = s => String(s || '').replace(/[^\w .\-]/g, '').trim().slice(0, 14);
  const num = (v, d = 0) => Number.isFinite(+v) ? +v : d;
  const setStatus = (msg, bad) => { el.status.textContent = msg || ''; el.status.classList.toggle('bad', !!bad); };
  const teamLabel = i => TEAM_NAMES[i] || 'Team ' + (i + 1);
  const modeText = s => (s.type === 'time' ? s.value + 's' : s.value + ' words');

  function clearTimers() {
    Object.values(S.timers).flat().forEach(t => { clearInterval(t); clearTimeout(t); });
    S.timers = {};
    clearTimeout(S.hostGoneTimer);
  }

  /* ---------------------------------------------------------
     Connecting
  --------------------------------------------------------- */
  function decodeRole(key) {
    try { return JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return ''; }
  }

  function configProblem() {
    const key = String(cfg.SUPABASE_KEY || '').trim();
    if (!cfg.SUPABASE_URL) return 'Open config.js and set SUPABASE_URL.';
    if (!key) return 'Open config.js and paste your Supabase publishable key (sb_publishable_...) into SUPABASE_KEY.';
    if (/^sb_secret_/i.test(key) || decodeRole(key) === 'service_role') return 'That is a SECRET key. Remove it from config.js right away and use the publishable (anon) key instead. Secret keys must never be in a website.';
    if (!window.supabase || !window.supabase.createClient) return 'The Supabase library could not load. Check your internet connection and reload.';
    return '';
  }

  function getClient() {
    if (S.client) return S.client;
    S.client = window.supabase.createClient(cfg.SUPABASE_URL, String(cfg.SUPABASE_KEY).trim(), {
      realtime: { params: { eventsPerSecond: 20 } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return S.client;
  }

  function subscribe(ch) {
    return new Promise((resolve, reject) => {
      let settled = false;
      ch.subscribe(status => {
        if (settled) return;
        if (status === 'SUBSCRIBED') { settled = true; resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { settled = true; reject(new Error(status)); }
      });
      setTimeout(() => { if (!settled) { settled = true; reject(new Error('TIMED_OUT')); } }, 12000);
    });
  }

  /* ---------------------------------------------------------
     Roster over broadcast messages.
     Supabase Presence is not reliable on every project, so the room
     list is kept with plain broadcast messages instead:
       meta  = "here is who I am" (sent on change and every 2s)
       hello = "who is here?" (everyone answers with meta)
       bye   = "I left"
     A player not heard from for 7s is dropped.
  --------------------------------------------------------- */
  const STALE_MS = 7000;
  S.roster = new Map();
  const presentMetas = () => {
    const now = Date.now();
    return [...S.roster.values()].filter(m => m.id === S.myId || now - m.seen < STALE_MS).map(m => { const c = { ...m }; delete c.seen; return c; });
  };
  const sendMeta = () => { if (S.channel && S.me) { try { S.channel.send({ type: 'broadcast', event: 'meta', payload: S.me }); } catch { /* ignore */ } } };
  function onMeta(m) {
    if (!m || typeof m.id !== 'string' || m.id === S.myId || !S.channel) return;
    const old = S.roster.get(m.id);
    const changed = !old || JSON.stringify({ ...old, seen: 0 }) !== JSON.stringify({ ...m, seen: 0 });
    S.roster.set(m.id, { ...m, seen: Date.now() });
    if (changed && S.phase !== 'entry') onSync();      // heartbeats alone must not redraw the lobby
  }
  function onBye(m) {
    if (!m || !S.roster.has(m.id) || m.id === S.myId) return;
    S.roster.delete(m.id);
    if (S.phase !== 'entry') onSync();
  }
  function startHeartbeat() {
    clearInterval(S.hb);
    S.hb = setInterval(() => {
      if (!S.channel) return;
      sendMeta();
      const before = S.roster.size, now = Date.now();
      S.roster.forEach((m, id) => { if (id !== S.myId && now - m.seen >= STALE_MS) S.roster.delete(id); });
      if (S.roster.size !== before && S.phase !== 'entry') onSync();
    }, 2000);
  }
  function sayBye() {
    if (S.channel && S.myId) { try { S.channel.send({ type: 'broadcast', event: 'bye', payload: { id: S.myId } }); } catch { /* ignore */ } }
  }

  async function dropChannel() {
    const ch = S.channel; S.channel = null;
    if (!ch) return;
    clearInterval(S.hb);
    try { await ch.send({ type: 'broadcast', event: 'bye', payload: { id: S.myId } }); } catch { /* ignore */ }
    S.me = null; S.roster.clear();
    try { S.client.removeChannel(ch); } catch { try { ch.unsubscribe(); } catch { /* ignore */ } }
  }

  /* Create or join a room. Returns true on success. */
  async function enter(code, asHost) {
    const client = getClient();
    S.code = code; S.myId = uid(); S.isHost = asHost; S.joinedAt = Date.now();
    S.ready = false; S.hostPhase = 'lobby'; S.team = 0;

    const ch = client.channel('neutype-room-' + code, { config: { broadcast: { self: false }, presence: { key: S.myId } } });
    S.channel = ch;
    S.roster.clear(); S.me = null;
    ch.on('broadcast', { event: 'meta' }, m => onMeta(m.payload));
    ch.on('broadcast', { event: 'bye' }, m => onBye(m.payload));
    ch.on('broadcast', { event: 'hello' }, () => { if (S.me && S.channel === ch) setTimeout(sendMeta, Math.random() * 300); });
    ch.on('broadcast', { event: 'start' }, m => onStart(m.payload));
    ch.on('broadcast', { event: 'prog' }, m => onProg(m.payload));
    ch.on('broadcast', { event: 'done' }, m => onDone(m.payload));
    ch.on('broadcast', { event: 'react' }, m => onReact(m.payload));

    try { await subscribe(ch); }
    catch (e) { await dropChannel(); throw new Error('connect'); }

    try { ch.send({ type: 'broadcast', event: 'hello', payload: {} }); } catch { /* ignore */ }
    await sleep(900);                                   // let existing players answer
    // Real networks can be slow: a joiner keeps looking for the host for up to 7 seconds
    for (let waited = 0; !asHost && waited < 6000 && !presentMetas().some(m => m.host); waited += 250) {
      if (waited % 1500 === 0) ch.send({ type: 'broadcast', event: 'hello', payload: {} });
      await sleep(250);
    }
    S.diag = `v7 · people seen: ${S.roster.size}`;
    const metas = presentMetas();
    const existingHost = metas.find(m => m.host);

    if (asHost && existingHost) { await dropChannel(); return 'taken'; }
    if (!asHost) {
      if (!existingHost) { await dropChannel(); return 'missing'; }
      if (existingHost.phase !== 'lobby') { await dropChannel(); return 'started'; }
      const hs = sanitizeSettings(existingHost.settings);
      if (metas.length >= maxPlayers(hs.format)) { await dropChannel(); return 'full'; }
      S.settings = hs;
    }
    S.players = metas;
    S.team = pickTeam();
    await publish();
    startHeartbeat();
    S.phase = 'lobby';
    return 'ok';
  }

  function publish() {
    if (!S.channel) return Promise.resolve();
    const me = { id: S.myId, name: S.name, host: S.isHost, team: S.team, ready: S.ready, joinedAt: S.joinedAt };
    if (S.isHost) { me.phase = S.hostPhase; me.settings = S.settings; }
    S.me = me;
    S.roster.set(me.id, { ...me, seen: Date.now() });
    sendMeta();
    if (S.phase !== 'entry') onSync();
    return Promise.resolve();
  }

  function sanitizeSettings(s) {
    s = s || {};
    const format = FORMATS[s.format] ? s.format : '1v1';
    const type = s.type === 'words' ? 'words' : 'time';
    const opts = type === 'time' ? TIME_OPTS : WORD_OPTS;
    return {
      format, type, value: opts.includes(+s.value) ? +s.value : opts[1],
      difficulty: DIFFS.includes(s.difficulty) ? s.difficulty : 'medium',
      source: SOURCES[s.source] ? s.source : 'random',
      punctuation: !!s.punctuation, numbers: !!s.numbers,
      language: N.languages().some(l => l.id === s.language) ? s.language : 'english'
    };
  }

  /* ---------------------------------------------------------
     Presence sync (players, teams, host)
  --------------------------------------------------------- */
  function normalizePlayers(metas) {
    return metas.map(m => ({
      id: String(m.id || ''), name: cleanName(m.name) || 'Guest', host: !!m.host,
      team: clamp(num(m.team), 0, 3), ready: !!m.ready, joinedAt: num(m.joinedAt),
      phase: m.phase, settings: m.settings
    })).filter(p => p.id).sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  }

  /* Team with the most free room (fewest players) */
  function pickTeam() {
    const f = FORMATS[S.settings.format];
    if (f.ffa) return 0;
    const counts = Array(f.teams).fill(0);
    S.players.filter(p => p.id !== S.myId).forEach(p => { if (p.team < f.teams) counts[p.team]++; });
    let best = 0;
    counts.forEach((c, i) => { if (c < counts[best]) best = i; });
    return best;
  }

  /* If my team is invalid or full (host changed format), move myself */
  function fixMyTeam() {
    const f = FORMATS[S.settings.format];
    if (f.ffa) { if (S.team !== 0) { S.team = 0; return true; } return false; }
    const inTeam = t => S.players.filter(p => p.team === t && p.id !== S.myId && p.joinedAt <= S.joinedAt).length;
    if (S.team < f.teams && inTeam(S.team) < f.size) return false;
    for (let t = 0; t < f.teams; t++) if (inTeam(t) < f.size) { S.team = t; return true; }
    return false;
  }

  function onSync() {
    if (!S.channel) return;
    S.players = normalizePlayers(presentMetas());
    S.host = S.players.find(p => p.host) || null;

    if (!S.isHost && S.host) S.settings = sanitizeSettings(S.host.settings);

    // Host gone: give a short grace period, then close the room for everyone else
    clearTimeout(S.hostGoneTimer);
    if (!S.isHost && !S.host && S.phase !== 'entry') {
      S.hostGoneTimer = setTimeout(() => {
        if (!S.host) leave('The host left, so the room was closed.');
      }, 3500);
    }

    if (S.phase === 'lobby' || S.phase === 'results') {
      // room over capacity: latest joiners leave
      if (!S.isHost) {
        const idx = S.players.findIndex(p => p.id === S.myId);
        if (idx >= maxPlayers(S.settings.format) && S.phase === 'lobby') { leave('The room is full.'); return; }
      }
      if (S.phase === 'lobby' && fixMyTeam()) publish();
    }

    if (S.race) { renderRace(); checkEnd(); }
    render();
  }

  /* ---------------------------------------------------------
     Rendering: lobby
  --------------------------------------------------------- */
  function showSub() {
    const problem = configProblem();
    el.setup.hidden = !problem;
    el.setupMsg.textContent = problem;
    const inRoom = S.phase !== 'entry';
    el.entry.hidden = !!problem || inRoom;
    el.lobby.hidden = !(S.phase === 'lobby' || S.phase === 'countdown' || S.phase === 'racing');
    el.results.hidden = S.phase !== 'results';
    if (!el.entry.hidden && !el.name.value) el.name.value = store.get('vsname');
    if (typeof updateDock === 'function') updateDock();
  }

  const youTag = p => (p.id === S.myId ? ' <span class="tag you">you</span>' : '');
  const hostTag = p => (p.host ? ' <span class="tag host">host</span>' : '');
  const readyTag = p => (p.host ? '' : p.ready ? ' <span class="tag ok">ready</span>' : ' <span class="tag">not ready</span>');

  function playerRow(p) {
    return `<div class="vs-player"><span class="avatar sm">${esc(p.name[0].toUpperCase())}</span><span class="vs-pname">${esc(p.name)}${youTag(p)}${hostTag(p)}</span>${readyTag(p)}</div>`;
  }
  const emptySlot = () => '<div class="vs-player empty">Waiting for a player…</div>';

  function renderPlayers() {
    const st = S.settings, f = FORMATS[st.format], max = maxPlayers(st.format);
    el.count.textContent = `${S.players.length} / ${max}`;
    if (f.ffa) {
      const rows = S.players.map(playerRow);
      while (rows.length < max) rows.push(emptySlot());
      el.players.innerHTML = rows.join('');
      return;
    }
    let out = '<div class="vs-teams">';
    for (let t = 0; t < f.teams; t++) {
      const members = S.players.filter(p => p.team === t);
      const rows = members.map(playerRow);
      while (rows.length < f.size) rows.push(emptySlot());
      const mine = S.team === t;
      const canJoin = !mine && members.length < f.size;
      out += `<div class="vs-team${mine ? ' mine' : ''}"><div class="vs-team-head"><strong>${teamLabel(t)}</strong>` +
        (canJoin ? `<button class="btn small" type="button" data-team="${t}">Join</button>` : '') + `</div>${rows.join('')}</div>`;
    }
    el.players.innerHTML = out + '</div>';
  }

  function seg(attr, value, options, label) {
    return `<div class="vs-set"><span class="tool-label">${label}</span><div class="seg" role="group" aria-label="${label}">` +
      options.map(([v, text]) => `<button class="btn" type="button" data-set="${attr}" data-v="${v}" aria-pressed="${String(value) === String(v)}">${text}</button>`).join('') +
      '</div></div>';
  }

  function renderSettings() {
    const st = S.settings;
    if (!S.isHost) {
      const extras = [st.punctuation && 'Punctuation', st.numbers && 'Numbers'].filter(Boolean).join(', ') || 'None';
      el.settings.innerHTML = `<dl class="vs-summary">
        <div><dt>Format</dt><dd>${st.format}</dd></div>
        <div><dt>Length</dt><dd>${modeText(st)}</dd></div>
        <div><dt>Difficulty</dt><dd>${st.difficulty[0].toUpperCase() + st.difficulty.slice(1)}</dd></div>
        <div><dt>Text</dt><dd>${SOURCES[st.source]}</dd></div>
        <div><dt>Language</dt><dd>${esc(langName(st.language))}</dd></div>
        <div><dt>Extras</dt><dd>${extras}</dd></div></dl>
        <p class="hint">Only the host can change these.</p>`;
      return;
    }
    const lockedBy = S.players.length;
    const formats = Object.keys(FORMATS).map(k => [k, k]);
    const opts = (st.type === 'time' ? TIME_OPTS : WORD_OPTS).map(v => [v, st.type === 'time' ? v + 's' : v]);
    el.settings.innerHTML =
      seg('format', st.format, formats, 'Format') +
      seg('type', st.type, [['time', 'Time'], ['words', 'Words']], 'Length type') +
      seg('value', st.value, opts, st.type === 'time' ? 'Seconds' : 'Words') +
      seg('difficulty', st.difficulty, DIFFS.map(d => [d, d[0].toUpperCase() + d.slice(1)]), 'Difficulty') +
      seg('source', st.source, Object.entries(SOURCES), 'Text') +
      `<div class="vs-set"><label class="tool-label" for="vsLang">Language</label><select class="select neu-inset" id="vsLang">${N.languages().map(l => `<option value="${l.id}"${l.id === st.language ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>` +
      `<div class="vs-set"><span class="tool-label">Extras</span><div class="seg" role="group" aria-label="Extras">
        <button class="btn" type="button" data-set="punctuation" data-v="${!st.punctuation}" aria-pressed="${st.punctuation}">Punctuation</button>
        <button class="btn" type="button" data-set="numbers" data-v="${!st.numbers}" aria-pressed="${st.numbers}">Numbers</button></div></div>` +
      (lockedBy > 2 ? '<p class="hint">Formats smaller than the number of players in the room are not available.</p>' : '');
  }

  /* Can the host start? Returns { ok, why } */
  function startCheck() {
    const st = S.settings, f = FORMATS[st.format];
    if (S.players.length < 2) return { ok: false, why: 'Waiting for at least one more player.' };
    const notReady = S.players.filter(p => !p.host && !p.ready);
    if (notReady.length) return { ok: false, why: `Waiting for ${notReady.map(p => esc(p.name)).join(', ')} to get ready.` };
    if (!f.ffa) {
      const filled = Array.from({ length: f.teams }, (_, t) => S.players.filter(p => p.team === t).length);
      if (filled.filter(c => c > 0).length < 2) return { ok: false, why: 'At least two teams need a player.' };
      if (new Set(filled.filter(c => c > 0)).size > 1) return { ok: true, why: 'Teams are uneven, but team average WPM keeps it fair.' };
    }
    return { ok: true, why: '' };
  }

  function renderActions() {
    if (S.phase !== 'lobby') {
      el.actions.innerHTML = `<p class="hint">${S.phase === 'countdown' ? 'Get ready…' : 'Race in progress'}</p>`;
      return;
    }
    if (S.isHost) {
      const c = startCheck();
      el.actions.innerHTML = `<div class="vs-btns"><button class="btn primary" id="vsStart" type="button"${c.ok ? '' : ' disabled'}>Start race</button></div><p class="hint">${c.why || 'Everyone is ready.'}</p>`;
    } else {
      el.actions.innerHTML = `<div class="vs-btns"><button class="btn${S.ready ? '' : ' primary'}" id="vsReady" type="button" aria-pressed="${S.ready}">${S.ready ? 'Not ready' : "I'm ready"}</button></div><p class="hint">${S.ready ? 'Waiting for the host to start…' : 'Press ready when you want to race.'}</p>`;
    }
  }

  function render() {
    showSub();
    if (S.phase === 'entry') return;
    el.code.textContent = S.code;
    if (S.phase === 'lobby' || S.phase === 'countdown' || S.phase === 'racing') { renderPlayers(); renderSettings(); renderActions(); }
  }

  /* ---------------------------------------------------------
     Lobby actions
  --------------------------------------------------------- */
  async function startRoom(asHost) {
    if (S.busy) return;
    const problem = configProblem();
    if (problem) { showSub(); return; }
    S.name = cleanName(el.name.value) || 'Guest' + (100 + Math.floor(Math.random() * 900));
    store.set('vsname', S.name);
    el.name.value = S.name;

    let code = '';
    if (!asHost) {
      code = el.codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 5) { setStatus('Enter the 5-character room code.', true); el.codeIn.focus(); return; }
    }
    S.busy = true;
    $('#vsCreate').disabled = true; $('#vsJoin').disabled = true;
    try {
      setStatus(asHost ? 'Creating room…' : 'Joining room…');
      let result = 'taken', tries = 0;
      if (asHost) S.settings = { ...DEFAULT_SETTINGS };
      while (asHost && result === 'taken' && tries++ < 4) { code = randomCode(); result = await enter(code, true); }
      if (!asHost) result = await enter(code, false);

      if (result === 'ok') {
        setStatus('');
        render();
        N.toast(asHost ? `Room ${code} created. Share the code.` : `Joined room ${code}`);
      } else {
        setStatus({
          missing: 'No room with that code. Check the code and try again.' + (S.diag ? ' (' + S.diag + ')' : ''),
          started: 'That race has already started. Ask the host for a new round.',
          full: 'That room is full.',
          taken: 'Could not create a room. Please try again.'
        }[result] || 'Could not connect.', true);
      }
    } catch (e) {
      S.phase = 'entry';
      setStatus('Could not connect to the server. Check your internet, your Supabase URL and key, and that Realtime is enabled for the project.', true);
    } finally {
      S.busy = false;
      $('#vsCreate').disabled = false; $('#vsJoin').disabled = false;
      showSub();
    }
  }

  async function leave(message) {
    clearTimers();
    const racing = N.isRacing();
    S.race = null;
    el.cd.hidden = true;
    await dropChannel();
    S.phase = 'entry'; S.players = []; S.host = null; S.code = ''; S.isHost = false; S.ready = false;
    if (racing) N.endRace('versus'); else if (location.hash !== '#versus') location.hash = '#versus';
    setStatus(message || '', !!message);
    if (message) N.toast(message);
    el.codeIn.value = '';
    showSub();
  }

  function changeSetting(key, raw) {
    if (!S.isHost || S.phase !== 'lobby') return;
    const st = { ...S.settings };
    if (key === 'format') {
      if (maxPlayers(raw) < S.players.length) { N.toast('Too many players in the room for that format.'); return; }
      st.format = raw;
    } else if (key === 'type') {
      st.type = raw === 'words' ? 'words' : 'time';
      st.value = st.type === 'time' ? 30 : 25;
    } else if (key === 'value') st.value = +raw;
    else if (key === 'difficulty') st.difficulty = raw;
    else if (key === 'source') st.source = raw;
    else if (key === 'language') st.language = raw;
    else if (key === 'punctuation' || key === 'numbers') st[key] = raw === 'true';
    S.settings = sanitizeSettings(st);
    S.ready = false;
    publish();
    onSync();
  }

  /* ---------------------------------------------------------
     Starting a race
  --------------------------------------------------------- */
  async function hostStart() {
    if (!S.isHost || S.phase !== 'lobby') return;
    const c = startCheck();
    if (!c.ok) { N.toast(c.why.replace(/<[^>]+>/g, '')); return; }
    const st = S.settings;
    const words = N.generateRaceWords({ type: st.type, value: st.value, difficulty: st.difficulty, source: st.source, punctuation: st.punctuation, numbers: st.numbers, language: st.language });
    const payload = {
      roundId: Date.now(), words, type: st.type, value: st.value, format: st.format,
      players: S.players.map(p => ({ id: p.id, name: p.name, team: p.team }))
    };
    S.hostPhase = 'racing';
    await publish();
    S.channel.send({ type: 'broadcast', event: 'start', payload });
    onStart(payload);
  }

  function onStart(p) {
    if (!p || (S.phase !== 'lobby' && S.phase !== 'results')) return;
    const type = p.type === 'words' ? 'words' : 'time';
    const value = clamp(num(p.value, 30), 5, 600);
    const words = Array.isArray(p.words) ? p.words.slice(0, 600).map(w => String(w).slice(0, 40)).filter(Boolean) : [];
    const format = FORMATS[p.format] ? p.format : '1v1';
    const players = Array.isArray(p.players) ? p.players.slice(0, 9).map(x => ({ id: String(x.id), name: cleanName(x.name) || 'Guest', team: clamp(num(x.team), 0, 3) })) : [];
    if (words.length < 5 || !players.some(x => x.id === S.myId)) return;   // not part of this round

    S.race = { roundId: num(p.roundId), words, mode: { type, value }, format, players, done: {}, prog: {}, goAt: 0, firstDoneAt: 0 };
    S.phase = 'countdown';
    N.beginRace({ words, type, value, onFinish: myFinish });
    el.raceTitle.textContent = `${format} · ${modeText(S.race.mode)}`;
    el.raceNote.textContent = 'Get ready…';
    renderRace();
    countdown();
  }

  function countdown() {
    const show = t => { el.cd.hidden = false; el.cdNum.textContent = t; el.cdNum.classList.remove('pop'); void el.cdNum.offsetWidth; el.cdNum.classList.add('pop'); };
    show('3');
    S.timers.cd = [
      setTimeout(() => show('2'), 1000),
      setTimeout(() => show('1'), 2000),
      setTimeout(() => {
        show('GO!');
        S.phase = 'racing';
        S.race.goAt = Date.now();
        N.go();
        el.raceNote.textContent = 'Type!';
        startRaceTimers();
      }, 3000),
      setTimeout(() => { el.cd.hidden = true; }, 3700)
    ];
  }

  function startRaceTimers() {
    S.timers.prog = setInterval(() => {
      const snap = N.snapshot();
      if (!snap || !S.race) return;
      S.race.prog[S.myId] = snap;
      renderRace();
      if (!snap.done) S.channel.send({ type: 'broadcast', event: 'prog', payload: { roundId: S.race.roundId, id: S.myId, p: snap.p, wpm: snap.wpm, acc: snap.acc } });
    }, 300);
    S.timers.tick = setInterval(checkEnd, 500);
  }

  /* ---------------------------------------------------------
     During the race
  --------------------------------------------------------- */
  function onProg(m) {
    if (!S.race || !m || m.roundId !== S.race.roundId) return;
    S.race.prog[String(m.id)] = { p: clamp(num(m.p), 0, 1), wpm: clamp(num(m.wpm), 0, 999), acc: clamp(num(m.acc), 0, 100) };
  }

  function sendDone() {
    const d = S.race && S.race.done[S.myId];
    if (d) S.channel.send({ type: 'broadcast', event: 'done', payload: { roundId: S.race.roundId, id: S.myId, wpm: d.wpm, raw: d.raw, acc: d.acc, errors: d.errors } });
  }

  function myFinish(res) {
    if (!S.race) return;
    S.race.done[S.myId] = { wpm: res.wpm, raw: res.raw, acc: res.acc, errors: res.errors };
    S.race.prog[S.myId] = { p: 1, wpm: res.wpm, acc: res.acc, done: true };
    if (!S.race.firstDoneAt) S.race.firstDoneAt = Date.now();
    sendDone();
    // re-send a few times in case a message was dropped
    S.timers.resend = [setTimeout(sendDone, 800), setTimeout(sendDone, 2000), setTimeout(sendDone, 4500)];
    el.raceNote.textContent = 'You finished! Waiting for the others…';
    renderRace();
    checkEnd();
  }

  function onDone(m) {
    if (!S.race || !m || m.roundId !== S.race.roundId) return;
    S.race.done[String(m.id)] = { wpm: clamp(num(m.wpm), 0, 999), raw: clamp(num(m.raw), 0, 999), acc: clamp(num(m.acc), 0, 100), errors: clamp(num(m.errors), 0, 9999) };
    S.race.prog[String(m.id)] = { p: 1, wpm: clamp(num(m.wpm), 0, 999), acc: clamp(num(m.acc), 0, 100), done: true };
    if (!S.race.firstDoneAt) S.race.firstDoneAt = Date.now();
    renderRace();
    checkEnd();
  }

  function renderRace() {
    const r = S.race;
    if (!r) return;
    const teamFmt = isTeamFormat(r.format);
    const present = new Set(S.players.map(p => p.id));
    el.raceRows.innerHTML = r.players.map(p => {
      const pr = r.prog[p.id] || { p: 0, wpm: 0 };
      const d = r.done[p.id];
      const left = !present.has(p.id) && !d && p.id !== S.myId;
      return `<div class="race-row${p.id === S.myId ? ' me' : ''}${left ? ' left' : ''}">
        <span class="race-name">${esc(p.name)}${teamFmt ? ` <span class="tag t${p.team}">${teamLabel(p.team)}</span>` : ''}</span>
        <span class="race-track" role="progressbar" aria-label="${esc(p.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr.p * 100)}"><span class="race-fill t${p.team}" style="width:${Math.round(pr.p * 100)}%"></span></span>
        <span class="race-wpm">${left ? 'left' : (d ? 'done · ' : '') + pr.wpm + ' wpm'}</span></div>`;
    }).join('');
  }

  function checkEnd() {
    const r = S.race;
    if (!r || S.phase !== 'racing') return;
    const present = new Set(S.players.map(p => p.id));
    present.add(S.myId);
    const waiting = r.players.filter(p => !r.done[p.id] && present.has(p.id));
    if (!waiting.length) { finishRace(); return; }
    const now = Date.now();
    if (r.mode.type === 'time' && r.goAt && now > r.goAt + r.mode.value * 1000 + 8000) { finishRace(); return; }
    if (r.firstDoneAt && now > r.firstDoneAt + 45000) finishRace();
  }

  /* ---------------------------------------------------------
     Results
  --------------------------------------------------------- */
  function buildResults() {
    const r = S.race;
    const present = new Set(S.players.map(p => p.id));
    present.add(S.myId);
    const rows = r.players.map(p => {
      const d = r.done[p.id], pr = r.prog[p.id];
      const left = !present.has(p.id) && !d;
      return { ...p, finished: !!d, left, wpm: d ? d.wpm : (pr ? pr.wpm : 0), acc: d ? d.acc : (pr ? pr.acc : 0), errors: d ? d.errors : 0 };
    });
    rows.sort((a, b) => (b.finished - a.finished) || (b.wpm - a.wpm) || (b.acc - a.acc));

    let teams = null;
    if (isTeamFormat(r.format)) {
      const f = FORMATS[r.format];
      teams = Array.from({ length: f.teams }, (_, t) => {
        const members = rows.filter(x => x.team === t);
        const counted = members.filter(x => !x.left);
        const avg = counted.length ? counted.reduce((s, x) => s + x.wpm, 0) / counted.length : 0;
        const acc = counted.length ? counted.reduce((s, x) => s + x.acc, 0) / counted.length : 0;
        return { team: t, members, avg: Math.round(avg * 10) / 10, acc: Math.round(acc), n: members.length };
      }).filter(t => t.n > 0).sort((a, b) => b.avg - a.avg);
    }
    return { rows, teams };
  }

  function finishRace() {
    if (!S.race || S.phase === 'results') return;
    const res = buildResults();
    S.phase = 'results';
    clearTimers();
    el.cd.hidden = true;
    S.lastRace = { format: S.race.format, mode: S.race.mode, language: S.settings.language, ...res };
    awardVersus(S.lastRace);
    S.race = null;
    if (S.isHost) { S.hostPhase = 'results'; publish(); }
    renderResults();
    N.endRace('versus');
    showSub();
  }

  /* Did I finish, did I win? Feeds the achievements. */
  function awardVersus(R) {
    if (!N.ach) return;
    const me = R.rows.find(x => x.id === S.myId);
    if (!me) return;
    let won = false;
    if (R.teams) {
      const [a, b] = R.teams;
      won = a.team === me.team && !(b && b.avg === a.avg) && R.teams.length > 1;
    } else {
      const [a, b] = R.rows;
      won = a.id === me.id && me.finished && !(b && b.wpm === a.wpm && b.acc === a.acc) && R.rows.length > 1;
    }
    R.won = won;
    N.ach.onVersus({ finished: me.finished, won, teamWin: !!R.teams && won });
  }

  function renderResults() {
    const R = S.lastRace;
    if (!R) return;
    let head = '';
    if (R.teams) {
      const [a, b] = R.teams;
      const tie = b && a.avg === b.avg;
      head = tie ? `<h2 class="vs-win">It's a tie</h2>` : `<h2 class="vs-win">${teamLabel(a.team)} wins</h2>`;
      head += '<div class="vs-team-results">' + R.teams.map((t, i) =>
        `<div class="neu-inset vs-tr${i === 0 && !tie ? ' first' : ''}"><span class="tag t${t.team}">${teamLabel(t.team)}</span><strong>${t.avg}</strong><span class="hint">avg WPM · ${t.acc}% acc</span></div>`).join('') + '</div>';
    } else if (R.rows.length) {
      const top = R.rows[0], second = R.rows[1];
      head = (second && top.wpm === second.wpm && top.acc === second.acc) ? `<h2 class="vs-win">It's a tie</h2>` : `<h2 class="vs-win">${esc(top.name)} wins</h2>`;
    }
    const table = `<table class="vs-table"><thead><tr><th>#</th><th>Player</th>${R.teams ? '<th>Team</th>' : ''}<th>WPM</th><th>Accuracy</th><th>Status</th></tr></thead><tbody>` +
      R.rows.map((p, i) => `<tr class="${p.id === S.myId ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}${p.id === S.myId ? ' (you)' : ''}</td>${R.teams ? `<td><span class="tag t${p.team}">${teamLabel(p.team)}</span></td>` : ''}<td class="wpm">${p.wpm}</td><td>${p.acc}%</td><td>${p.left ? 'Left' : p.finished ? 'Finished' : "Didn't finish"}</td></tr>`).join('') +
      '</tbody></table>';
    el.resultBody.innerHTML = `<p class="hint">${R.format} · ${modeText(R.mode)}</p>${head}<div class="table-wrap">${table}</div>`;
  }

  async function backToLobby() {
    if (!S.channel) { leave(); return; }
    if (!S.isHost && !S.host) { leave('The host left, so the room was closed.'); return; }
    S.phase = 'lobby'; S.ready = false;
    if (S.isHost) S.hostPhase = 'lobby';
    S.team = pickTeam();
    await publish();
    onSync();
  }

  /* ---------------------------------------------------------
     Reactions (broadcast, shown as floating bubbles)
  --------------------------------------------------------- */
  const dock = $('#reactDock'), layer = $('#reactLayer');
  let lastReact = 0;
  dock.innerHTML = REACTIONS.map(([e, label], i) => `<button type="button" data-react="${i}" aria-label="${label}" title="${label} (Alt + ${i + 1} in a race)">${e}<small>${i + 1}</small></button>`).join('');

  function updateDock() {
    const inRoom = S.phase !== 'entry' && !!S.channel;
    const visible = inRoom && ((location.hash === '#versus') || N.isRacing());
    dock.hidden = !visible;
  }
  function bubble(name, emoji) {
    const b = document.createElement('div');
    b.className = 'react-bubble';
    b.style.left = (12 + Math.random() * 70) + '%';
    b.innerHTML = `<b>${esc(emoji)}</b><span>${esc(name)}</span>`;
    layer.append(b);
    setTimeout(() => b.remove(), 2500);
    while (layer.children.length > 14) layer.firstChild.remove();
  }
  function sendReaction(i) {
    const r = REACTIONS[i];
    if (!r || !S.channel || S.phase === 'entry') return false;
    const now = Date.now();
    if (now - lastReact < 900) return true;
    lastReact = now;
    bubble('You', r[0]);
    S.channel.send({ type: 'broadcast', event: 'react', payload: { id: S.myId, name: S.name, i } });
    return true;
  }
  function onReact(m) {
    if (!m || S.phase === 'entry' || String(m.id) === S.myId) return;
    const r = REACTIONS[num(m.i, -1)];
    if (!r) return;
    const t = Date.now();
    S.reactAt = S.reactAt || {};
    if (t - (S.reactAt[m.id] || 0) < 500) return;       // ignore floods
    S.reactAt[m.id] = t;
    bubble(cleanName(m.name) || 'Guest', r[0]);
  }
  dock.addEventListener('click', e => {
    const b = e.target.closest('[data-react]');
    if (b) { sendReaction(+b.dataset.react); if (N.isRacing()) N.focus(); }
  });
  N.onReactKey = code => {
    const m = /^Digit([1-6])$/.exec(code);
    return m ? sendReaction(+m[1] - 1) : false;
  };
  window.addEventListener('hashchange', updateDock);

  /* ---------------------------------------------------------
     Wiring
  --------------------------------------------------------- */
  $('#vsCreate').addEventListener('click', () => startRoom(true));
  $('#vsJoinForm').addEventListener('submit', e => { e.preventDefault(); startRoom(false); });
  el.codeIn.addEventListener('input', () => { el.codeIn.value = el.codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('#vsLeave').addEventListener('click', () => leave());
  $('#vsLeave2').addEventListener('click', () => leave());
  $('#vsAgain').addEventListener('click', backToLobby);

  $('#vsCopy').addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(S.code);
      else { const t = document.createElement('textarea'); t.value = S.code; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
      N.toast('Room code copied');
    } catch { N.toast('Room code: ' + S.code); }
  });

  el.settings.addEventListener('click', e => {
    const b = e.target.closest('[data-set]');
    if (b) changeSetting(b.dataset.set, b.dataset.v);
  });
  el.settings.addEventListener('change', e => {
    if (e.target.id === 'vsLang') changeSetting('language', e.target.value);
  });
  el.players.addEventListener('click', e => {
    const b = e.target.closest('[data-team]');
    if (!b || S.phase !== 'lobby') return;
    const t = +b.dataset.team, f = FORMATS[S.settings.format];
    if (S.players.filter(p => p.team === t && p.id !== S.myId).length >= f.size) { N.toast('That team is full.'); return; }
    S.team = t; S.ready = false; publish(); onSync();
  });
  el.actions.addEventListener('click', e => {
    if (e.target.closest('#vsStart')) hostStart();
    if (e.target.closest('#vsReady')) { S.ready = !S.ready; publish(); onSync(); }
  });

  window.addEventListener('pagehide', sayBye);

  /* Share card from the results screen */
  $('#vsCard').addEventListener('click', () => {
    const R = S.lastRace; if (!R || !N.cards) return;
    const me = R.rows.find(x => x.id === S.myId);
    N.cards.open('versus', { R, me, name: S.name, langName: langName(R.language), modeText: modeText(R.mode) });
  });

  N.onVersusOpen = () => { showSub(); if (S.phase === 'results') renderResults(); render(); };
  showSub();

  /* Test hook: lets automated tests read internal state. Harmless in normal use. */
  window.__vs = { S, FORMATS };
})();
