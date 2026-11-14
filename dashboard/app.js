// Token Radar's page: renders window.RADAR (written by main.ts from the same board.json),
// so the page and the board can never disagree. No fetch, no network, no framework.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) { document.getElementById('top-note').textContent = 'No radar data found next to this page.'; return; }

  var bySlug = {};
  R.rows.forEach(function (r) { bySlug[r.slug] = r; });

  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(n) { return n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var maxImplied = R.rows.length ? R.rows[0].implied_value_usd : 1;
  var totalImplied = R.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  document.getElementById('top-note').textContent = 'Snapshot ' + R.as_of + ' · ' + R.rows.length + ' pre-token protocols · floor ' + money(R.floor_usd);
  document.getElementById('stats').innerHTML =
    '<div><dt>Watchlist protocols</dt><dd>' + R.watchlist_size + '</dd></div>' +
    '<div><dt>Early finds below floor</dt><dd>' + R.early_size + '</dd></div>' +
    '<div><dt>Board total implied value</dt><dd>' + money(totalImplied) + '</dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(R.rows[0].implied_value_usd) + '</dd></div>' +
    '<div><dt>Model</dt><dd>' + esc(R.model_version) + '</dd></div>';
  document.getElementById('formula').textContent =
    'implied FDV = TVL × category ratio × growth × maturity\n' +
    'implied value = implied FDV × ' + (R.model.community_share * 100).toFixed(0) + '% (community share at launch)\n' +
    'category ratio = median market-cap / TVL of traded tokens in the category (global median ' + R.global_ratio.toFixed(3) + ' when fewer than ' + R.model.ratio_min_samples + ' traded peers)\n' +
    'growth = 1 + clamp(7-day TVL change, ' + R.model.growth_floor + '%, ' + R.model.growth_cap + '%) × ' + R.model.growth_weight + '\n' +
    'maturity = ' + R.model.maturity_floor + ' + min(age, ' + R.model.maturity_days + 'd) / ' + R.model.maturity_days + 'd × ' + R.model.maturity_range;

  var cats = [];
  R.rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort();
  var catSel = document.getElementById('cat');
  cats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  var chains = [];
  R.rows.forEach(function (r) { r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); }); });
  chains.sort();
  var chainSel = document.getElementById('chain');
  chains.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; chainSel.appendChild(o); });

  var qEl = document.getElementById('q');
  var setEl = document.getElementById('set');
  var sortEl = document.getElementById('sort');
  var countEl = document.getElementById('count');
  var rowsEl = document.getElementById('rows');
  var emptyEl = document.getElementById('empty');
  var tabBoard = document.getElementById('tab-board');
  var tabLive = document.getElementById('tab-live');
  var livePanel = document.getElementById('live-panel');
  var modelPanel = document.getElementById('model');
  var sortKey = 'value';

  function filtered() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var set = setEl.value;
    var list = R.rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (set === 'watchlist' && !r.on_watchlist) return false;
      if (set === 'early' && r.on_watchlist) return false;
      return true;
    });
    var key = sortEl.value;
    list.sort(function (a, b) {
      if (key === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (key === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      if (key === 'age') return (b.age_days || 0) - (a.age_days || 0);
      return a.rank - b.rank;
    });
    return list;
  }

  function rowHtml(r) {
    var g = r.change_7d;
    var cls = g === null ? '' : (g >= 0 ? 'pos' : 'neg');
    var barW = Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100));
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td class="num">' + r.rank + '</td>' +
      '<td><span class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.slice(0, 3).join(', ') || '—') + '</span></span></td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num ' + cls + '">' + pct(g) + '</td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td><span class="value-cell"><span class="num"><b>' + money(r.implied_value_usd) + '</b></span><span class="bar" aria-hidden="true"><i style="width:' + barW + '%"></i></span>' + (r.on_watchlist ? '<span class="tag">Watchlist</span>' : '') + '</span></td>' +
      '<td><button type="button" class="farm-btn" data-farm="' + esc(r.slug) + '">Farm plan</button></td></tr>';
  }

  function render() {
    var list = filtered();
    rowsEl.innerHTML = list.slice(0, 200).map(rowHtml).join('');
    emptyEl.hidden = list.length > 0;
    countEl.textContent = list.length + ' of ' + R.rows.length + ' protocols' + (list.length > 200 ? ' · showing first 200' : '');
  }

  function renderLive() {
    document.getElementById('live-rows').innerHTML = R.live.map(function (p) {
      return '<tr><td><span class="name"><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.category || 'Uncategorised') + ' · ' + esc(p.chains.slice(0, 3).join(', ') || '—') + '</span></span></td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd || 0) + '</td>' +
        '<td class="num ' + (p.change_7d >= 0 ? 'pos' : 'neg') + '">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
  }

  var detail = document.getElementById('detail');
  function openDetail(slug) {
    var r = bySlug[slug];
    if (!r) return;
    var g = r.change_7d;
    detail.innerHTML = '<div class="detail-inner"><div class="detail-head"><div><p class="sub">Rank #' + r.rank + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ') || '—') + '</p>' +
      '<h2 id="detail-title">' + esc(r.name) + '</h2><p class="sub">' + esc(r.slug) + ' · listed ' + esc(r.listed_at || 'unknown') + ' · ' + (r.on_watchlist ? 'on the watchlist' : 'early find below the floor') + '</p></div>' +
      '<button type="button" class="close" id="detail-close">Close ✕</button></div>' +
      '<dl class="kv"><div><dt>TVL</dt><dd>' + moneyFull(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + pct(g) + '</dd></div>' +
      '<div><dt>Age</dt><dd>' + ageText(r.age_days) + '</dd></div>' +
      '<div><dt>Implied value</dt><dd>' + moneyFull(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>Implied FDV</dt><dd>' + moneyFull(r.implied_fdv_usd) + '</dd></div>' +
      '<div><dt>Token recorded</dt><dd>none</dd></div></dl>' +
      '<h3>How the number is built</h3><div class="equation">' +
      '<div><span>TVL × category ratio (' + r.category_ratio.toFixed(3) + ')</span><b>' + moneyFull(r.tvl_usd * r.category_ratio) + '</b></div>' +
      '<div><span>× growth (' + r.growth_multiplier.toFixed(2) + ', 7d ' + pct(g) + ')</span><b>' + moneyFull(r.tvl_usd * r.category_ratio * r.growth_multiplier) + '</b></div>' +
      '<div><span>× maturity (' + r.maturity_multiplier.toFixed(2) + ', ' + ageText(r.age_days) + ' with no token)</span><b>' + moneyFull(r.implied_fdv_usd) + '</b></div>' +
      '<div><span>× community share (' + (R.model.community_share * 100).toFixed(0) + '%)</span><b>' + moneyFull(r.implied_value_usd) + '</b></div></div>' +
      '<h3>Farm plan — six steps</h3><ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="warn" style="margin-top:18px">This protocol records no token. That is the snapshot’s record, not proof it has none — and no step here promises a reward.</p></div>';
    document.getElementById('detail-close').addEventListener('click', function () { detail.close(); });
    if (!detail.open) detail.showModal();
  }

  rowsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-farm]');
    if (btn) { openDetail(btn.getAttribute('data-farm')); return; }
    var tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });
  detail.addEventListener('click', function (e) { if (e.target === detail) detail.close(); });

  function setTab(live) {
    tabBoard.setAttribute('aria-pressed', String(!live));
    tabLive.setAttribute('aria-pressed', String(live));
    livePanel.hidden = !live;
    modelPanel.hidden = live;
    document.querySelector('.panel').style.display = live ? 'none' : '';
    if (live) renderLive();
  }
  tabBoard.addEventListener('click', function () { setTab(false); });
  tabLive.addEventListener('click', function () { setTab(true); });

  document.querySelectorAll('th button[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-sort');
      sortEl.value = k === 'rank' ? 'value' : k;
      render();
    });
  });
  [qEl, catSel, chainSel, setEl, sortEl].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });

  // Deep links for sharing and for screenshots: #detail=<slug>, #set=watchlist|early,
  // #q=<text>, #cat=<category>, #tab=live.
  var hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('q')) qEl.value = hash.get('q');
  if (hash.get('cat')) catSel.value = hash.get('cat');
  if (hash.get('set')) setEl.value = hash.get('set');
  if (hash.get('sort')) sortEl.value = hash.get('sort');
  if (hash.get('tab') === 'live') setTab(true);
  render();
  if (hash.get('detail')) openDetail(hash.get('detail'));
  document.querySelector('main').setAttribute('aria-busy', 'false');
})();
