// Token Radar dashboard: renders window.RADAR with no network.
//
// Rows are positional arrays; the column order is fixed in lib/model.ts dataScript:
// [rank, slug, name, category, chains, tvl_usd, change_7d, age_days,
//  peer_multiple, peer_peers, peer_basis, scale_factor, growth_multiplier,
//  age_factor, implied_value_usd, on_watchlist]
// Live rows: [slug, name, category, chains, tvl_usd, mcap_usd, change_7d].

(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) return;

  function $(id) { return document.getElementById(id); }
  function fmtMoney(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtMoneyFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function fmtPct(x) {
    if (x === null || x === undefined) return '—';
    return (x > 0 ? '+' : '') + x.toFixed(1) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return '—';
    if (d < 365) return d + 'd';
    return (d / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- header facts and methodology numbers ----
  $('meta-date').textContent = 'Snapshot ' + R.as_of;
  $('meta-count').textContent = R.rows.length + ' ranked · ' + R.live_size + ' live';
  $('meta-floor').textContent = 'Watchlist floor ' + fmtMoney(R.floor_usd);
  $('fact-rows').textContent = R.board_size;
  $('fact-watchlist').textContent = R.watchlist_size;
  $('fact-early').textContent = R.early_size;
  $('fact-total').textContent = fmtMoney(R.total_implied_usd);
  $('fact-slope').textContent = String(R.fit.scale_slope);
  $('fact-top').textContent = R.rows.length ? R.rows[0][2] : '—';
  $('source').textContent = 'Source: ' + R.source + '. Snapshot ' + R.as_of + ', floor ' + fmtMoney(R.floor_usd) + '.';
  $('model-winsor').textContent = R.fit.winsor_cap + '×';
  $('model-global').textContent = R.fit.global_multiple + '×';
  $('model-peers').textContent = R.fit.peer_protocols;
  $('model-slope').textContent = R.fit.scale_slope;
  $('model-ref').textContent = fmtMoney(R.fit.scale_ref_tvl_usd);
  $('model-excluded').textContent = R.excluded_pre_token;

  // ---- peer table: every category, highest multiple first ----
  var peerRows = Object.keys(R.peers).map(function (c) {
    return { cat: c, mult: R.peers[c].multiple, n: R.peers[c].peers, basis: R.peers[c].basis };
  }).sort(function (a, b) { return b.mult - a.mult || (a.cat < b.cat ? -1 : 1); });
  $('peer-body').innerHTML = peerRows.map(function (p) {
    return '<tr><td>' + esc(p.cat) + '</td><td class="num">' + p.mult.toFixed(3) + '×</td><td class="num">' + p.n + '</td><td>' + p.basis + '</td></tr>';
  }).join('');

  // ---- filter controls ----
  var cats = {};
  var chains = {};
  R.rows.forEach(function (r) { if (r[3]) cats[r[3]] = 1; (r[4] || []).forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; $('category').appendChild(o);
  });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o);
  });

  var state = { tab: 'board', q: '', cat: '', chain: '', minTvl: 0, sort: 'implied', dir: -1 };
  var maxImplied = R.rows.length ? R.rows[0][14] : 1;

  function visibleRows() {
    var q = state.q.trim().toLowerCase();
    var rows = R.rows.filter(function (r) {
      if (state.tab === 'watchlist' && !r[15]) return false;
      if (state.tab === 'early' && r[15]) return false;
      if (state.cat && r[3] !== state.cat) return false;
      if (state.chain && (r[4] || []).indexOf(state.chain) === -1) return false;
      if (r[5] < state.minTvl) return false;
      if (q && r[2].toLowerCase().indexOf(q) === -1 && r[1].toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var key = { implied: 14, tvl: 5, growth: 6, age: 7, peer: 8, rank: 0 }[state.sort] || 14;
    var dir = state.dir;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      if (av !== bv) return (bv - av) * (dir === -1 ? 1 : -1) * (state.sort === 'rank' ? -1 : 1);
      return a[0] - b[0];
    });
    if (state.sort === 'rank') rows.sort(function (a, b) { return (a[0] - b[0]) * (dir === -1 ? 1 : -1); });
    return rows;
  }

  function render() {
    var rows = visibleRows();
    var body = $('board-body');
    var html = rows.map(function (r) {
      var pct = fmtPct(r[6]);
      var cls = r[6] === null ? '' : (r[6] >= 0 ? 'up' : 'down');
      var bar = Math.max(2, Math.round((r[14] / maxImplied) * 100));
      return '<tr data-slug="' + esc(r[1]) + '">' +
        '<td class="num">' + r[0] + '</td>' +
        '<td><strong>' + esc(r[2]) + '</strong>' + (r[15] ? '<span class="badge">W</span>' : '') +
          '<span class="sub">' + esc(r[3] || 'Uncategorised') + ' · ' + esc((r[4] || []).slice(0, 2).join(', ')) + '</span></td>' +
        '<td class="num">' + fmtMoney(r[5]) + '</td>' +
        '<td class="num ' + cls + '">' + pct + '</td>' +
        '<td class="num">' + fmtAge(r[7]) + '</td>' +
        '<td class="num">' + r[8].toFixed(2) + '×<span class="peer-n"> · ' + r[9] + ' peers</span></td>' +
        '<td class="num"><strong>' + fmtMoney(r[14]) + '</strong><span class="bar"><i style="width:' + bar + '%"></i></span></td>' +
        '</tr>';
    }).join('');
    body.innerHTML = html;
    $('empty').hidden = rows.length > 0;
    $('count').textContent = rows.length === R.rows.length
      ? R.rows.length + ' protocols ranked'
      : 'Showing ' + rows.length + ' of ' + R.rows.length + ' protocols';
    var live = R.live.map(function (r) {
      return '<tr><td><strong>' + esc(r[1]) + '</strong><span class="sub">' + esc(r[2] || 'Uncategorised') + '</span></td>' +
        '<td class="num">' + fmtMoney(r[4]) + '</td>' +
        '<td class="num">' + (r[5] === null ? '—' : fmtMoney(r[5])) + '</td>' +
        '<td class="num ' + (r[6] === null ? '' : (r[6] >= 0 ? 'up' : 'down')) + '">' + fmtPct(r[6]) + '</td>' +
        '<td class="num">' + (r[5] === null ? '—' : (r[5] / r[4]).toFixed(3) + '×') + '</td></tr>';
    }).join('');
    $('live-body').innerHTML = live;
  }

  function setTab(tab) {
    state.tab = tab;
    ['board', 'watchlist', 'early', 'live'].forEach(function (t) {
      $('tab-' + t).setAttribute('aria-pressed', t === tab ? 'true' : 'false');
    });
    $('board').hidden = tab === 'live';
    $('live-panel').hidden = tab !== 'live';
    render();
  }
  ['board', 'watchlist', 'early', 'live'].forEach(function (t) {
    $('tab-' + t).addEventListener('click', function () { setTab(t); });
  });
  $('search').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('category').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  $('min-tvl').addEventListener('change', function (e) { state.minTvl = Number(e.target.value); render(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; state.dir = -1; markSorted(); render(); });
  $('reset-filters').addEventListener('click', function () {
    state.q = ''; state.cat = ''; state.chain = ''; state.minTvl = 0; state.sort = 'implied'; state.dir = -1;
    $('search').value = ''; $('category').value = ''; $('chain').value = ''; $('min-tvl').value = '0'; $('sort').value = 'implied';
    setTab('board'); markSorted();
  });
  function markSorted() {
    document.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === state.sort);
    });
  }
  document.querySelectorAll('th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var s = th.getAttribute('data-sort');
      if (state.sort === s) state.dir = -state.dir;
      else { state.sort = s; state.dir = s === 'rank' ? 1 : -1; }
      $('sort').value = ['implied', 'tvl', 'growth', 'age', 'peer'].indexOf(s) !== -1 ? s : state.sort;
      markSorted(); render();
    });
  });

  // ---- detail view ----
  var dlg = $('detail');
  function whySentence(r) {
    var parts = [];
    if (r[11] <= 0.30) parts.push('its size factor (' + r[11].toFixed(2) + '×) cuts a ' + fmtMoney(r[5]) + ' TVL down hard: the board\u2019s biggest protocols are discounted, because their tokens trade at a smaller multiple of TVL');
    if (r[8] >= 0.6) parts.push('its peer multiple (' + r[8].toFixed(3) + '× from ' + r[9] + ' traded peer' + (r[9] === 1 ? '' : 's') + ') is among the highest on the board');
    if (r[6] !== null && r[6] <= -20) parts.push('its 7-day TVL fell ' + Math.abs(r[6]).toFixed(1) + '%, which the growth factor punishes at half weight (0.5×)');
    if (r[7] !== null && r[7] < 90) parts.push('it has run only ' + r[7] + ' days, so the age factor holds it at 0.80× until it proves it lasts');
    if (r[7] !== null && r[7] > 1095) parts.push('it has run over three years with no token, so the age factor has started to decay');
    if (parts.length === 0) parts.push('its ' + fmtMoney(r[5]) + ' TVL at a ' + r[8].toFixed(3) + '× peer multiple is what puts it here');
    return 'Ranked #' + r[0] + ' because ' + parts.join('; ') + '.';
  }
  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i][1] === slug) { r = R.rows[i]; break; }
    if (!r) return;
    var proto = { slug: r[1], name: r[2], category: r[3], chains: r[4], tvl_usd: r[5], change_7d: r[6] };
    $('detail-rank').textContent = 'Rank #' + r[0] + (r[15] ? ' · on the watchlist' : ' · early find');
    $('detail-title').textContent = r[2];
    $('detail-sub').textContent = (r[3] || 'Uncategorised') + ' · ' + (r[4] || []).join(', ') + ' · ' + fmtAge(r[7]) + ' old';
    var product = Math.round(r[5] * r[8] * r[11] * r[12] * r[13]);
    $('detail-equation').textContent =
      fmtMoneyFull(r[5]) + ' TVL\n× ' + r[8].toFixed(3) + ' peer multiple\n× ' + r[11].toFixed(3) + ' size factor\n× ' + r[12].toFixed(3) + ' growth multiplier\n× ' + r[13].toFixed(3) + ' age factor\n= ' + fmtMoneyFull(product);
    var catMedian = r[9] > 0 ? ((r[8] * (r[9] + 5) - 5 * R.fit.global_multiple) / r[9]) : null;
    $('detail-peer-note').textContent = r[10] === 'category'
      ? 'Peer multiple ' + r[8].toFixed(3) + '×: the median of ' + r[9] + ' traded ' + (r[3] || 'Uncategorised') + ' peers (each ratio capped at ' + R.fit.winsor_cap + '×), blended with the global median ' + R.fit.global_multiple + '×.'
      : 'Peer multiple ' + r[8].toFixed(3) + '×: only ' + r[9] + ' traded ' + (r[3] || 'Uncategorised') + ' peer' + (r[9] === 1 ? '' : 's') + ' exist' + (catMedian !== null ? ' (category median ' + catMedian.toFixed(3) + '×)' : '') + ', so the multiple is mostly the global median ' + R.fit.global_multiple + '× — thin evidence, stated, not hidden.';
    $('detail-why').textContent = whySentence(r);
    var steps = window.Plans.farmSteps(proto, r[7], r[0]);
    $('detail-steps').innerHTML = steps.map(function (s) {
      return '<li>' + esc(s.text) + '<span class="cost">Cost: ' + esc(s.cost) + ' · Time: ' + esc(s.time) + '</span></li>';
    }).join('');
    var est = window.Plans.estimateFor(proto, r[7]);
    $('detail-cost').textContent = 'Estimated cost to farm: $' + est.capital + ' of capital plus about $' + est.gasLow + '–$' + est.gasHigh + ' of gas over ' + est.hold + ' days (' + est.txs + ' transactions on ' + est.chain + ').';
    var listed = r[7] === null ? '—' : new Date(Date.parse(R.as_of + 'T00:00:00Z') - r[7] * 86400000).toISOString().slice(0, 10);
    $('detail-record').innerHTML =
      '<dt>Slug</dt><dd>' + esc(r[1]) + '</dd>' +
      '<dt>TVL</dt><dd>' + fmtMoneyFull(r[5]) + '</dd>' +
      '<dt>7-day change</dt><dd>' + fmtPct(r[6]) + '</dd>' +
      '<dt>First tracked</dt><dd>' + listed + '</dd>' +
      '<dt>Token recorded</dt><dd>No — none of market cap, CoinGecko id or symbol</dd>' +
      '<dt>Implied value</dt><dd>' + fmtMoneyFull(r[14]) + '</dd>';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  $('board-body').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });
  $('detail-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  // ---- hash routing (also how the screenshots pick their view) ----
  function route() {
    var h = window.location.hash || '';
    if (h.indexOf('#detail=') === 0) { openDetail(decodeURIComponent(h.slice(8))); return; }
    if (h.indexOf('#filter=') === 0) {
      var c = decodeURIComponent(h.slice(8));
      if (cats[c]) { state.cat = c; $('category').value = c; }
    }
    if (h === '#watchlist') setTab('watchlist');
    else if (h === '#early') setTab('early');
    else render();
  }

  markSorted();
  render();
  route();
})();
