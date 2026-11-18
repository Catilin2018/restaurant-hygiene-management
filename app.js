(function () {
  'use strict';

  var SECTION_META = {
    daily: { title: 'EVERY DAY', hint: 'Complete these every day' },
    weekly: { title: 'Weekly (one time a week)', hint: 'Deep clean once per week' },
    special: { title: 'Special areas', hint: 'As scheduled' }
  };

  var FALLBACK_TASKS = [
    { id: 'd01', section: 'daily', label: 'Wash up Dishes', sort_order: 1, signoff_after: false },
    { id: 'd02', section: 'daily', label: 'Wash up area sinks, shelves...', sort_order: 2, signoff_after: false },
    { id: 'd03', section: 'daily', label: 'Wash up Bain Marle containers', sort_order: 3, signoff_after: false },
    { id: 'd04', section: 'daily', label: 'Wash up and clean wash mach', sort_order: 4, signoff_after: false },
    { id: 'd05', section: 'daily', label: 'Bins (remove bags and clean)', sort_order: 5, signoff_after: false },
    { id: 'd06', section: 'daily', label: 'Cold Room, Broom and Mop', sort_order: 6, signoff_after: false },
    { id: 'd07', section: 'daily', label: 'Broom and mop kitchen', sort_order: 7, signoff_after: false },
    { id: 'd08', section: 'daily', label: 'Broom and mop Stairs', sort_order: 8, signoff_after: false },
    { id: 'd09', section: 'daily', label: 'Clean the shelves Sink area', sort_order: 9, signoff_after: false },
    { id: 'd10', section: 'daily', label: 'Clean the shelves Rice area', sort_order: 10, signoff_after: false },
    { id: 'd11', section: 'daily', label: 'Clean the shelves Fryers area', sort_order: 11, signoff_after: false },
    { id: 'd12', section: 'daily', label: 'Clean the Tables Fryer area', sort_order: 12, signoff_after: false },
    { id: 'd13', section: 'daily', label: 'Clean the Tables Cocking area', sort_order: 13, signoff_after: false },
    { id: 'd14', section: 'daily', label: 'Clean the Toilet floor', sort_order: 14, signoff_after: true },
    { id: 'w01', section: 'weekly', label: 'Deep clean Shelves Rice area', sort_order: 101, signoff_after: false },
    { id: 'w02', section: 'weekly', label: 'Deep clean Shelves Sinks area', sort_order: 102, signoff_after: false },
    { id: 'w03', section: 'weekly', label: 'Deep clean Shelves Fryer area', sort_order: 103, signoff_after: false },
    { id: 'w04', section: 'weekly', label: 'Deep clean Table Fryer area', sort_order: 104, signoff_after: false },
    { id: 'w05', section: 'weekly', label: 'Deep clean Table Cocking area', sort_order: 105, signoff_after: true },
    { id: 's01', section: 'special', label: 'Clean the freezer', sort_order: 201, signoff_after: true },
    { id: 's02', section: 'special', label: 'Scrath around doors and tables legs', sort_order: 202, signoff_after: true },
    { id: 's03', section: 'special', label: 'Clean the walls areas 1, 2, 3 and 4', sort_order: 203, signoff_after: true }
  ];

  var STAFF_NAMES = ['Jack', 'Marin', 'Val', 'Sergio', 'Vitalie', 'Stan'];
  var WEEKS = [
    { index: 1, label: 'W1', start: 1, end: 7 },
    { index: 2, label: 'W2', start: 8, end: 14 },
    { index: 3, label: 'W3', start: 15, end: 21 },
    { index: 4, label: 'W4', start: 22, end: 28 },
    { index: 5, label: 'W5', start: 29, end: 31 }
  ];
  var URL_KEY = 'cleaningLog.supabaseUrl';
  var KEY_KEY = 'cleaningLog.supabaseKey';

  var client = null;
  var connected = false;
  var previewMode = false;
  var toastTimer = null;
  var tasks = [];
  var state = {
    month: '',
    checks: new Map(),
    signoffs: new Map(),
    staff: new Map(),
    staffDate: { 1: '', 2: '' },
    tasksEmpty: false,
    lastSync: null
  };

  function $(id) { return document.getElementById(id); }

  function pad(n) { return String(n).padStart(2, '0'); }

  function localISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function monthKeyFromDate(d) { return localISO(new Date(d.getFullYear(), d.getMonth(), 1)); }

  function parseMonth(key) {
    var parts = String(key).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  }

  function daysInMonth(key) {
    var d = parseMonth(key);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function shiftMonth(key, delta) {
    var d = parseMonth(key);
    d.setMonth(d.getMonth() + delta);
    return monthKeyFromDate(d);
  }

  function dayOfWeek(key, day) {
    var d = parseMonth(key);
    return new Date(d.getFullYear(), d.getMonth(), day).getDay();
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(message, isError) {
    var el = $('toast');
    el.textContent = message;
    el.className = isError ? 'toast error' : 'toast';
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4500);
  }

  function showBanner(message, actionLabel, action) {
    var el = $('statusBanner');
    el.textContent = '';
    var span = document.createElement('span');
    span.textContent = message;
    el.appendChild(span);
    if (actionLabel && action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = actionLabel;
      btn.addEventListener('click', action);
      el.appendChild(btn);
    }
    el.hidden = false;
  }

  function hideBanner() { $('statusBanner').hidden = true; }

  function readConfig() {
    try {
      return {
        url: localStorage.getItem(URL_KEY) || '',
        key: localStorage.getItem(KEY_KEY) || ''
      };
    } catch (e) {
      return { url: '', key: '' };
    }
  }

  function normalizeSupabaseUrl(raw) {
    var value = String(raw || '').trim().replace(/\/+$/, '');
    var dashboard = value.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]+)(?:[/?#].*)?$/i);
    if (dashboard) return 'https://' + dashboard[1].toLowerCase() + '.supabase.co';
    if (!/^https:\/\/[^\s]+$/i.test(value)) {
      throw new Error('Enter a valid Supabase project URL (https://xxxx.supabase.co).');
    }
    return value;
  }

  function writeConfig(url, key) {
    localStorage.setItem(URL_KEY, url);
    localStorage.setItem(KEY_KEY, key);
  }

  async function connect(url, key) {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('The Supabase script did not load. Check the internet connection and reload the page.');
    }
    var apiUrl = normalizeSupabaseUrl(url);
    var testClient = window.supabase.createClient(apiUrl, key.trim(), {
      auth: { persistSession: false }
    });
    var result = await testClient.from('cleaning_tasks').select('id').limit(1);
    if (result.error) {
      var message = result.error.message;
      if (/does not exist|relation/i.test(message)) {
        message += ' - run supabase/schema.sql in the SQL Editor first.';
      }
      throw new Error(message);
    }
    client = testClient;
    connected = true;
    previewMode = false;
  }

  async function loadAll() {
    if (!connected) return;
    var results = await Promise.all([
      client.from('cleaning_tasks').select('id,section,label,sort_order,signoff_after').order('sort_order', { ascending: true }),
      client.from('cleaning_checks').select('id,task_id,day,done').eq('month', state.month),
      client.from('cleaning_signoffs').select('id,scope,week,signed_by').eq('month', state.month)
    ]);
    var error = results[0].error || results[1].error || results[2].error;
    if (error) throw new Error(error.message);
    var loaded = results[0].data || [];
    state.tasksEmpty = loaded.length === 0;
    tasks = state.tasksEmpty ? FALLBACK_TASKS.slice() : loaded;
    tasks.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    state.checks = new Map((results[1].data || []).map(function (r) { return [r.task_id + '|' + r.day, r]; }));
    state.signoffs = new Map((results[2].data || []).map(function (r) { return [r.scope + '|' + r.week, r]; }));
    state.lastSync = new Date();
    await loadStaff();
  }

  async function loadStaff() {
    if (!connected) return;
    var result = await client.from('staff_totals')
      .select('id,block,work_date,name,total')
      .in('block', [1, 2])
      .in('work_date', [state.staffDate[1], state.staffDate[2]]);
    if (result.error) throw new Error(result.error.message);
    state.staff = new Map((result.data || []).map(function (r) {
      return [r.block + '|' + r.work_date + '|' + r.name, r];
    }));
  }

  function scopeFor(task) {
    if (task.section === 'daily') return 'daily';
    if (task.section === 'weekly') return 'weekly';
    return task.id;
  }

  function renderGrid() {
    var days = daysInMonth(state.month);
    var dayNums = [];
    for (var i = 1; i <= days; i++) dayNums.push(i);
    var weekSpans = WEEKS.map(function (w) {
      return {
        index: w.index,
        label: w.label,
        start: w.start,
        end: w.end,
        span: dayNums.filter(function (d) { return d >= w.start && d <= w.end; }).length
      };
    }).filter(function (w) { return w.span > 0; });
    var totalCols = 1 + days;

    function cellClass(day) {
      var dow = dayOfWeek(state.month, day);
      var cls = 'check-cell' + (dow === 0 || dow === 6 ? ' weekend' : '');
      if (WEEKS.some(function (w) { return w.start === day; })) cls += ' week-start';
      return cls;
    }

    var html = '<thead><tr><th class="task-col">Task</th>';
    dayNums.forEach(function (d) {
      var dow = dayOfWeek(state.month, d);
      html += '<th class="head-cell' + (dow === 0 || dow === 6 ? ' weekend' : '') + '">' + d + '</th>';
    });
    html += '</tr><tr><th class="task-col">Week</th>';
    weekSpans.forEach(function (w) {
      html += '<th class="week-cell" colspan="' + w.span + '">' + w.label + ' (' + w.start + '-' + w.end + ')</th>';
    });
    html += '</tr></thead><tbody>';

    var currentSection = null;
    tasks.forEach(function (t) {
      if (t.section !== currentSection) {
        currentSection = t.section;
        var meta = SECTION_META[t.section] || { title: String(t.section).toUpperCase(), hint: '' };
        html += '<tr class="section-row"><td colspan="' + totalCols + '">' + esc(meta.title) +
          '<span class="section-hint">' + esc(meta.hint) + '</span></td></tr>';
      }
      html += '<tr><th class="task-col task-label">' + esc(t.label) + '</th>';
      dayNums.forEach(function (d) {
        var rec = state.checks.get(t.id + '|' + d);
        var done = !!(rec && rec.done);
        html += '<td class="' + cellClass(d) + '"><button type="button" data-task="' + esc(t.id) +
          '" data-day="' + d + '" aria-pressed="' + done + '" aria-label="' + esc(t.label) + ' day ' + d + '">' +
          (done ? '\u2713' : '') + '</button></td>';
      });
      html += '</tr>';

      if (t.signoff_after) {
        var scope = scopeFor(t);
        html += '<tr class="signoff-row"><th class="task-col">Checked by</th>';
        weekSpans.forEach(function (w) {
          var rec2 = state.signoffs.get(scope + '|' + w.index);
          var val = rec2 && rec2.signed_by ? rec2.signed_by : '';
          html += '<td class="signoff-cell' + (w.index > 1 ? ' week-start' : '') + '" colspan="' + w.span +
            '"><input type="text" data-scope="' + esc(scope) + '" data-week="' + w.index +
            '" value="' + esc(val) + '" placeholder="Name" aria-label="Checked by ' + esc(scope) + ' week ' + w.index + '"></td>';
        });
        html += '</tr>';
      }
    });
    html += '</tbody>';
    $('checkTable').innerHTML = html;
  }

  function renderStaff() {
    var html = '';
    [1, 2].forEach(function (block) {
      var date = state.staffDate[block];
      html += '<div class="staff-block"><h3>Block ' + block + '</h3>' +
        '<div class="staff-date"><label for="staffDate' + block + '">Date</label>' +
        '<input id="staffDate' + block + '" type="date" data-block="' + block + '" value="' + esc(date) + '"></div>';
      STAFF_NAMES.forEach(function (name) {
        var rec = state.staff.get(block + '|' + date + '|' + name);
        var val = rec && rec.total !== null && rec.total !== undefined ? rec.total : '';
        var inputId = 'staff-' + block + '-' + name.toLowerCase();
        html += '<div class="staff-row"><label for="' + esc(inputId) + '">' + esc(name) + '</label>' +
          '<input id="' + esc(inputId) + '" type="number" inputmode="decimal" min="0" step="0.25" placeholder="-" ' +
          'data-block="' + block + '" data-name="' + esc(name) + '" value="' + esc(String(val)) + '"></div>';
      });
      html += '</div>';
    });
    $('staffGrid').innerHTML = html;
  }

  function updateStats() {
    var days = daysInMonth(state.month);
    var total = tasks.length * days;
    var done = 0;
    state.checks.forEach(function (rec, key) {
      if (rec.done && Number(key.split('|')[1]) <= days) done++;
    });
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('monthPercent').textContent = pct + '%';
    $('monthBar').style.width = pct + '%';
    $('monthDetail').textContent = done + ' of ' + total + ' checks';

    var isCurrent = state.month === monthKeyFromDate(new Date());
    var today = new Date().getDate();
    var todayDone = isCurrent ? tasks.filter(function (t) {
      var rec = state.checks.get(t.id + '|' + today);
      return !!(rec && rec.done);
    }).length : 0;
    $('todayCount').textContent = isCurrent ? todayDone + ' / ' + tasks.length : '-';
    $('todayDate').textContent = isCurrent ? 'tasks checked on day ' + today : 'switch to this month to see today';

    $('recordState').textContent = connected ? (state.tasksEmpty ? 'Setup needed' : 'Supabase') : (previewMode ? 'Preview' : 'Not connected');
    $('lastSync').textContent = state.lastSync
      ? 'Last synced ' + state.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Connect Supabase in Settings';
    $('footerStatus').textContent = state.month;
  }

  function updateBanner() {
    if (previewMode) {
      showBanner('Preview mode - taps and entries are not saved. Connect Supabase in Settings to start recording.');
    } else if (connected && state.tasksEmpty) {
      showBanner('The tasks table is empty. Run supabase/schema.sql, or load the sample tasks now.', 'Load sample tasks', seedTasks);
    } else {
      hideBanner();
    }
  }

  function renderAll() {
    $('monthLabel').textContent = parseMonth(state.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    renderGrid();
    renderStaff();
    updateStats();
    updateBanner();
  }

  async function seedTasks() {
    if (!connected) { toast('Connect Supabase first.', true); return; }
    var rows = FALLBACK_TASKS.map(function (t) {
      return {
        id: t.id, section: t.section, label: t.label,
        sort_order: t.sort_order, signoff_after: !!t.signoff_after
      };
    });
    var result = await client.from('cleaning_tasks').upsert(rows, { onConflict: 'id' });
    if (result.error) { toast('Could not load tasks: ' + result.error.message, true); return; }
    await loadAll();
    renderAll();
    toast('Sample tasks loaded into Supabase.');
  }

  async function saveCheck(taskId, day, done) {
    if (previewMode) return;
    if (!connected) { toast('Connect Supabase to save changes.', true); return; }
    if (state.tasksEmpty) { toast('Set up the tasks table first.', true); return; }
    var row = { month: state.month, task_id: taskId, day: day, done: done, updated_at: new Date().toISOString() };
    var result = await client.from('cleaning_checks').upsert(row, { onConflict: 'month,task_id,day' });
    if (result.error) {
      toast('Could not save this check: ' + result.error.message, true);
      await loadMonthDataOnly();
      renderAll();
      return;
    }
    state.lastSync = new Date();
    updateStats();
  }

  async function loadMonthDataOnly() {
    var c = await client.from('cleaning_checks').select('id,task_id,day,done').eq('month', state.month);
    if (c.error) return;
    state.checks = new Map((c.data || []).map(function (r) { return [r.task_id + '|' + r.day, r]; }));
  }

  async function saveSignoff(scope, week, name) {
    if (previewMode || !connected || state.tasksEmpty) return;
    var row = {
      month: state.month, scope: scope, week: week,
      signed_by: name || null, signed_at: name ? new Date().toISOString() : null
    };
    var result = await client.from('cleaning_signoffs').upsert(row, { onConflict: 'month,scope,week' });
    if (result.error) { toast('Could not save sign-off: ' + result.error.message, true); }
    else { state.signoffs.set(scope + '|' + week, row); state.lastSync = new Date(); updateStats(); }
  }

  async function saveStaffTotal(block, date, name, value) {
    if (previewMode || !connected || !date) return;
    var row = {
      block: Number(block), work_date: date, name: name,
      total: value === '' ? null : Number(value), updated_at: new Date().toISOString()
    };
    var result = await client.from('staff_totals').upsert(row, { onConflict: 'block,work_date,name' });
    if (result.error) { toast('Could not save total: ' + result.error.message, true); }
    else { state.staff.set(block + '|' + date + '|' + name, row); state.lastSync = new Date(); updateStats(); }
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = cell === null || cell === undefined ? '' : String(cell);
        return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportChecksCsv() {
    var days = daysInMonth(state.month);
    var dayNums = [];
    for (var i = 1; i <= days; i++) dayNums.push(i);
    var rows = [['Section', 'Task'].concat(dayNums.map(function (d) { return 'Day ' + d; }), WEEKS.map(function (w) { return w.label; }))];
    tasks.forEach(function (t) {
      var meta = SECTION_META[t.section] || { title: t.section };
      var row = [meta.title, t.label];
      dayNums.forEach(function (d) {
        var rec = state.checks.get(t.id + '|' + d);
        row.push(rec && rec.done ? 'x' : '');
      });
      var scope = scopeFor(t);
      WEEKS.forEach(function (w) {
        var rec2 = t.signoff_after ? state.signoffs.get(scope + '|' + w.index) : null;
        row.push(rec2 && rec2.signed_by ? rec2.signed_by : '');
      });
      rows.push(row);
    });
    downloadCsv('cleaning-' + state.month.slice(0, 7) + '.csv', rows);
    toast('CSV exported for ' + state.month.slice(0, 7) + '.');
  }

  function exportStaffCsv() {
    var rows = [['Block', 'Date', 'Name', 'Total']];
    [1, 2].forEach(function (block) {
      STAFF_NAMES.forEach(function (name) {
        var rec = state.staff.get(block + '|' + state.staffDate[block] + '|' + name);
        rows.push([block, state.staffDate[block], name, rec && rec.total !== null && rec.total !== undefined ? rec.total : '']);
      });
    });
    downloadCsv('staff-totals-' + state.month.slice(0, 7) + '.csv', rows);
    toast('Staff CSV exported.');
  }

  function openSetup(message) {
    var cfg = readConfig();
    $('supaUrl').value = cfg.url;
    $('supaKey').value = cfg.key;
    $('setupError').textContent = message || '';
    $('setupError').hidden = !message;
    $('setupOverlay').hidden = false;
    $('supaUrl').focus();
  }

  function enterPreview() {
    previewMode = true;
    connected = false;
    client = null;
    tasks = FALLBACK_TASKS.slice();
    state.checks = new Map();
    state.signoffs = new Map();
    state.staff = new Map();
    state.tasksEmpty = false;
    state.lastSync = null;
    $('setupOverlay').hidden = true;
    renderAll();
  }

  function bindUI() {
    $('checkTable').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-task]');
      if (!btn) return;
      var taskId = btn.getAttribute('data-task');
      var day = Number(btn.getAttribute('data-day'));
      var key = taskId + '|' + day;
      var rec = state.checks.get(key);
      var next = !(rec && rec.done);
      state.checks.set(key, { task_id: taskId, day: day, done: next });
      btn.setAttribute('aria-pressed', String(next));
      btn.textContent = next ? '\u2713' : '';
      updateStats();
      saveCheck(taskId, day, next);
    });

    $('checkTable').addEventListener('change', function (e) {
      var input = e.target.closest('input[data-scope]');
      if (!input) return;
      saveSignoff(input.getAttribute('data-scope'), Number(input.getAttribute('data-week')), input.value.trim());
    });

    $('staffGrid').addEventListener('change', async function (e) {
      var target = e.target;
      if (target.matches('input[type="date"][data-block]')) {
        state.staffDate[target.getAttribute('data-block')] = target.value;
        try { await loadStaff(); } catch (err) { toast('Could not load staff records: ' + err.message, true); }
        renderStaff();
        return;
      }
      if (target.matches('input[data-name]')) {
        saveStaffTotal(target.getAttribute('data-block'), state.staffDate[target.getAttribute('data-block')],
          target.getAttribute('data-name'), target.value);
      }
    });

    $('prevMonth').addEventListener('click', async function () {
      state.month = shiftMonth(state.month, -1);
      try { await loadAll(); } catch (err) { toast('Could not load month: ' + err.message, true); }
      renderAll();
    });
    $('nextMonth').addEventListener('click', async function () {
      state.month = shiftMonth(state.month, 1);
      try { await loadAll(); } catch (err) { toast('Could not load month: ' + err.message, true); }
      renderAll();
    });
    $('todayMonth').addEventListener('click', async function () {
      state.month = monthKeyFromDate(new Date());
      try { await loadAll(); } catch (err) { toast('Could not load month: ' + err.message, true); }
      renderAll();
    });

    $('syncBtn').addEventListener('click', async function () {
      if (!connected) { toast('Connect Supabase in Settings first.', true); return; }
      try {
        await loadAll();
        renderAll();
        toast('Synced with Supabase.');
      } catch (err) {
        toast('Sync failed: ' + err.message, true);
      }
    });

    $('exportBtn').addEventListener('click', exportChecksCsv);
    $('exportStaffBtn').addEventListener('click', exportStaffCsv);
    $('settingsBtn').addEventListener('click', function () { openSetup(); });
    $('previewBtn').addEventListener('click', enterPreview);

    $('supaUrl').addEventListener('blur', function () {
      try {
        var normalized = normalizeSupabaseUrl($('supaUrl').value);
        if (normalized !== $('supaUrl').value.trim().replace(/\/+$/, '')) {
          $('supaUrl').value = normalized;
        }
      } catch (e) {
        // Leave the text as typed; Save shows the exact error.
      }
    });

    $('saveConfig').addEventListener('click', async function () {
      var key = $('supaKey').value.trim();
      var url;
      try {
        url = normalizeSupabaseUrl($('supaUrl').value);
      } catch (err) {
        $('setupError').textContent = err.message;
        $('setupError').hidden = false;
        return;
      }
      if (!key) {
        $('setupError').textContent = 'Enter the anon / public key (or the sb_publishable_... key).';
        $('setupError').hidden = false;
        return;
      }
      $('saveConfig').disabled = true;
      try {
        writeConfig(url, key);
        await connect(url, key);
        await loadAll();
        $('setupOverlay').hidden = true;
        renderAll();
        toast('Connected to Supabase.');
      } catch (err) {
        $('setupError').textContent = 'Could not connect: ' + err.message;
        $('setupError').hidden = false;
      } finally {
        $('saveConfig').disabled = false;
      }
    });
  }

  async function init() {
    bindUI();
    var today = localISO(new Date());
    state.month = monthKeyFromDate(new Date());
    state.staffDate[1] = today;
    state.staffDate[2] = today;
    var cfg = readConfig();
    if (cfg.url && cfg.key) {
      try {
        await connect(cfg.url, cfg.key);
        await loadAll();
        renderAll();
        return;
      } catch (err) {
        openSetup('Saved connection failed: ' + err.message);
        return;
      }
    }
    openSetup();
  }

  init();
})();
