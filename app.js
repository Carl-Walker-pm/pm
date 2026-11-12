(function () {
  'use strict';

  const url = window.__PRAW_SUPABASE_URL__;
  const anon = window.__PRAW_SUPABASE_ANON_KEY__;
  const $ = (s) => document.querySelector(s);
  const authPanel = $('#auth-panel');
  const appPanel = $('#app-panel');
  const statusEl = $('#status');
  const authStatus = $('#auth-status');

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || '';
    el.dataset.kind = kind || '';
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (!url || !anon || !window.supabase) {
    setStatus(authStatus, 'Missing Supabase config', 'error');
    authPanel.hidden = false;
    return;
  }

  const sb = window.supabase.createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let me = null;
  let threads = [];
  let active = null;
  let people = [];
  let selectedPerson = null;
  let profileById = {};
  let rt = null;
  let loaded = [];
  let seen = new Set();

  function labelFor(userId) {
    const p = profileById[userId];
    if (p?.display_name) return p.display_name;
    if (p?.handle) return '@' + p.handle;
    return 'Member';
  }

  async function loadProfiles(ids) {
    const missing = [...new Set(ids)].filter((id) => id && !profileById[id]);
    if (!missing.length) return;
    const { data } = await sb
      .from('profiles')
      .select('user_id, handle, display_name')
      .in('user_id', missing);
    (data || []).forEach((p) => {
      profileById[p.user_id] = p;
    });
  }

  async function refreshPeople(q) {
    const raw = String(q || '').trim().toLowerCase();
    const query = raw.replace(/[%_,.()\\]/g, '');
    let req = sb
      .from('profiles')
      .select('user_id, handle, display_name')
      .neq('user_id', me.id)
      .order('display_name', { ascending: true, nullsFirst: false })
      .limit(40);
    if (query) {
      req = sb
        .from('profiles')
        .select('user_id, handle, display_name')
        .neq('user_id', me.id)
        .or('display_name.ilike.%' + query + '%,handle.ilike.%' + query + '%')
        .limit(40);
    }
    const { data, error } = await req;
    if (error) {
      setStatus(statusEl, error.message, 'error');
      return;
    }
    people = data || [];
    people.forEach((p) => { profileById[p.user_id] = p; });
    renderPeople();
  }

  function renderPeople() {
    const box = $('#people');
    if (!people.length) {
      box.classList.remove('open');
      box.innerHTML = '';
      return;
    }
    box.classList.add('open');
    box.innerHTML = people
      .map((p) => {
        const name = esc(p.display_name || p.handle || 'Member');
        const handle = p.handle ? '<div class="handle">@' + esc(p.handle) + '</div>' : '';
        const activeCls = selectedPerson && selectedPerson.user_id === p.user_id ? ' active' : '';
        return (
          '<button type="button" class="person' + activeCls + '" data-id="' + esc(p.user_id) + '" role="option">' +
          '<div>' + name + '</div>' + handle +
          '</button>'
        );
      })
      .join('');
  }

  async function loadThreads() {
    const { data: parts, error } = await sb
      .from('pm_participants')
      .select('thread_id, last_read_at')
      .eq('user_id', me.id);
    if (error) throw error;
    const ids = (parts || []).map((p) => p.thread_id);
    const readMap = Object.fromEntries((parts || []).map((p) => [p.thread_id, p.last_read_at]));
    if (!ids.length) {
      threads = [];
      renderThreadList();
      return;
    }

    const { data: threadRows, error: tErr } = await sb
      .from('pm_threads')
      .select('id, kind, subject, updated_at, created_at')
      .in('id', ids)
      .order('updated_at', { ascending: false });
    if (tErr) throw tErr;

    const { data: members, error: mErr } = await sb
      .from('pm_participants')
      .select('thread_id, user_id')
      .in('thread_id', ids);
    if (mErr) throw mErr;

    await loadProfiles((members || []).map((m) => m.user_id));

    const previewByThread = {};
    await Promise.all(
      (threadRows || []).map(async (t) => {
        const { data: msgs } = await sb
          .from('pm_messages')
          .select('body, created_at, author_id')
          .eq('thread_id', t.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (msgs && msgs[0]) previewByThread[t.id] = msgs[0];
      })
    );

    threads = (threadRows || []).map((t) => {
      const others = (members || [])
        .filter((m) => m.thread_id === t.id && m.user_id !== me.id)
        .map((m) => m.user_id);
      const title =
        t.subject ||
        (others.length ? others.map(labelFor).join(', ') : 'Conversation');
      const preview = previewByThread[t.id];
      const lastRead = readMap[t.id] ? new Date(readMap[t.id]).getTime() : 0;
      const lastAt = preview?.created_at ? new Date(preview.created_at).getTime() : 0;
      const unread = !!(preview && preview.author_id !== me.id && lastAt > lastRead);
      return {
        ...t,
        title,
        others,
        preview: preview?.body || 'No messages yet',
        previewAt: preview?.created_at || t.updated_at,
        unread,
      };
    });

    renderThreadList();
  }

  function renderThreadList() {
    const list = $('#thread-list');
    if (!threads.length) {
      list.innerHTML = '<div class="empty">No private messages yet. Search for someone below to start.</div>';
      return;
    }
    list.innerHTML = threads
      .map((t) => {
        const activeCls = active && active.id === t.id ? ' active' : '';
        const unreadCls = t.unread ? ' unread' : '';
        return (
          '<button type="button" class="thread-item' + activeCls + unreadCls + '" data-id="' + esc(t.id) + '">' +
          '<div class="title">' + esc(t.title) + '</div>' +
          '<div class="preview">' + esc(t.preview) + '</div>' +
          '<div class="when">' + esc(fmtWhen(t.previewAt)) + '</div>' +
          '</button>'
        );
      })
      .join('');
  }

  function msgHtml(m) {
    const mine = m.author_id === me.id;
    return (
      '<div class="msg' + (mine ? ' mine' : '') + '" data-id="' + esc(m.id) + '">' +
      '<div class="meta">' + esc(mine ? 'You' : labelFor(m.author_id)) + ' · ' + esc(fmtWhen(m.created_at)) + '</div>' +
      '<div class="body">' + esc(m.body) + '</div>' +
      '</div>'
    );
  }

  function subscribe(threadId) {
    try {
      if (rt) sb.removeChannel(rt);
      rt = sb
        .channel('pm_messages:' + threadId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pm_messages', filter: 'thread_id=eq.' + threadId },
          (payload) => {
            if (active && active.id === threadId && payload.new) appendMessages([payload.new]);
          }
        )
        .subscribe();
    } catch (_) {
      rt = null;
    }
  }

  async function appendMessages(rows) {
    rows = rows.filter((m) => !seen.has(m.id));
    if (!rows.length) return;
    await loadProfiles(rows.map((m) => m.author_id));
    const box = $('#messages');
    const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
    rows
      .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
      .forEach((m) => {
        seen.add(m.id);
        loaded.push(m);
        box.insertAdjacentHTML('beforeend', msgHtml(m));
      });
    if (stick) box.scrollTop = box.scrollHeight;
    await sb.rpc('mark_pm_read', { p_thread_id: active.id });
  }

  async function openThread(thread) {
    active = thread;
    loaded = [];
    seen = new Set();
    appPanel.classList.add('thread-open');
    $('#thread-head').hidden = false;
    $('#composer').hidden = false;
    $('#empty-thread')?.remove();
    $('#thread-title').textContent = thread.title;
    renderThreadList();

    const { data, error } = await sb
      .from('pm_messages')
      .select('id, author_id, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      setStatus(statusEl, error.message, 'error');
      return;
    }
    await loadProfiles((data || []).map((m) => m.author_id));
    const box = $('#messages');
    box.innerHTML = (data || []).map(msgHtml).join('') ||
      '<div class="placeholder"><strong>No messages yet</strong>Say hello.</div>';
    (data || []).forEach((m) => {
      seen.add(m.id);
      loaded.push(m);
    });
    box.scrollTop = box.scrollHeight;
    await sb.rpc('mark_pm_read', { p_thread_id: thread.id });
    thread.unread = false;
    renderThreadList();
    subscribe(thread.id);
    setStatus(statusEl, '');
  }

  async function startDm() {
    if (!selectedPerson) return;
    const body = String($('#first-body').value || '').trim();
    const { data, error } = await sb.rpc('open_pm_dm', {
      p_other: selectedPerson.user_id,
      p_body: body || null,
    });
    if (error) {
      setStatus(statusEl, error.message, 'error');
      return;
    }
    $('#first-body').value = '';
    $('#people-search').value = '';
    $('#people').classList.remove('open');
    selectedPerson = null;
    $('#start-dm').disabled = true;
    await loadThreads();
    const t = threads.find((x) => x.id === data);
    if (t) openThread(t);
  }

  function showSignedIn(session) {
    me = session.user;
    authPanel.hidden = true;
    appPanel.hidden = false;
    $('#signout-btn').hidden = false;
    $('#user-label').textContent = me.email || 'Signed in';
    loadThreads().catch((err) => setStatus(statusEl, err.message || String(err), 'error'));
    refreshPeople('');
  }

  function showSignedOut() {
    me = null;
    active = null;
    appPanel.hidden = true;
    authPanel.hidden = false;
    $('#signout-btn').hidden = true;
    $('#user-label').textContent = '';
    appPanel.classList.remove('thread-open');
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(authStatus, 'Signing in…');
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(authStatus, error.message, 'error');
      return;
    }
    setStatus(authStatus, '');
  });

  $('#signout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
  });

  $('#thread-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.thread-item');
    if (!btn) return;
    const t = threads.find((x) => x.id === btn.dataset.id);
    if (t) openThread(t);
  });

  $('#back-btn').addEventListener('click', () => {
    appPanel.classList.remove('thread-open');
  });

  $('#people').addEventListener('click', (e) => {
    const btn = e.target.closest('.person');
    if (!btn) return;
    selectedPerson = people.find((p) => p.user_id === btn.dataset.id) || null;
    $('#start-dm').disabled = !selectedPerson;
    if (selectedPerson) {
      $('#people-search').value = selectedPerson.display_name || selectedPerson.handle || '';
    }
    renderPeople();
  });

  let searchTimer = null;
  $('#people-search').addEventListener('input', (e) => {
    selectedPerson = null;
    $('#start-dm').disabled = true;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => refreshPeople(e.target.value), 180);
  });

  $('#start-dm').addEventListener('click', startDm);

  $('#composer').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!active) return;
    const body = String($('#compose-input').value || '').trim();
    if (!body) return;
    const { error } = await sb.from('pm_messages').insert({
      thread_id: active.id,
      author_id: me.id,
      body,
    });
    if (error) {
      setStatus(statusEl, error.message, 'error');
      return;
    }
    $('#compose-input').value = '';
    const { data } = await sb
      .from('pm_messages')
      .select('id, author_id, body, created_at')
      .eq('thread_id', active.id)
      .order('created_at', { ascending: false })
      .limit(5);
    await appendMessages((data || []).reverse());
    await loadThreads();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) showSignedIn(session);
    else showSignedOut();
  });
})();
