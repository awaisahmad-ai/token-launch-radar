const data = window.radarData;
const byId = id => document.getElementById(id);
const create = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

const compact = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const money = amount => amount == null ? '—' : compact.format(amount);
const percent = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
const multiple = value => `${value.toFixed(2)}×`;
const controls = Object.fromEntries(
  ['search', 'category', 'chain', 'universe', 'sort'].map(id => [id, byId(id)]),
);
const tabs = [...document.querySelectorAll('[data-tab]')];
const pageSize = 10;
const query = new URLSearchParams(location.search);
const rowsBySlug = new Map(data.rows.map(row => [row.slug, row]));
let view = 'radar';
let page = 1;

function pairs(target, values) {
  target.replaceChildren(...values.map(([label, value]) => {
    const pair = create('div');
    const term = create('dt', label);
    const amount = create('dd', String(value));
    pair.append(term, amount);
    return pair;
  }));
}

function fillSelect(control, values) {
  control.length = 1;
  for (const value of [...new Set(values)].sort((a, b) => a.localeCompare(b))) {
    control.add(new Option(value, value));
  }
}

function activeRows() {
  const market = view === 'market';
  const source = market ? data.markets : data.rows;
  const search = controls.search.value.trim().toLowerCase();
  const category = controls.category.value;
  const chain = controls.chain.value;
  const universe = controls.universe.value;
  const score = market ? 'mcap_usd' : 'implied_value_usd';
  const sort = {
    value: (a, b) => (b[score] ?? -1) - (a[score] ?? -1),
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    growth: (a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity),
    name: (a, b) => a.name.localeCompare(b.name),
  }[controls.sort.value];
  return source.filter(row =>
    (!search || `${row.name} ${row.slug} ${row.symbol ?? ''}`.toLowerCase().includes(search)) &&
    (!category || row.category === category) &&
    (!chain || row.chains.includes(chain)) &&
    (market || !universe || row.watch === (universe === 'watch')),
  ).sort((a, b) => sort(a, b) || a.slug.localeCompare(b.slug));
}

function cell(row, text, className) {
  const element = create('td', text, className);
  row.append(element);
  return element;
}

function renderTable() {
  const market = view === 'market';
  const entries = activeRows();
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  page = Math.min(page, pages);
  const start = (page - 1) * pageSize;
  const headers = [
    market ? 'Symbol' : 'Rank', 'Protocol', 'Category', 'Chains',
    'TVL', '7-day change', market ? 'Market cap' : 'Implied value',
  ];
  byId('columns').replaceChildren(...headers.map((heading, index) => {
    const element = create('th', heading, index >= 4 ? 'num' : '');
    element.scope = 'col';
    return element;
  }));
  const body = byId('rows');
  body.replaceChildren();
  for (const protocol of entries.slice(start, start + pageSize)) {
    const row = create('tr');
    cell(row, market ? protocol.symbol ?? '—' : String(protocol.rank));
    const name = cell(row);
    if (market) {
      name.append(create('strong', protocol.name));
    } else {
      const button = create('button', protocol.name, 'protocol');
      button.type = 'button';
      button.dataset.slug = protocol.slug;
      name.append(button);
      if (protocol.watch) name.append(create('p', 'Watchlist', 'caption'));
    }
    cell(row, protocol.category ?? 'Unclassified');
    const firstChain = controls.chain.value || protocol.chains[0];
    const networks = cell(row, protocol.chains.length > 1 ? `${firstChain} +${protocol.chains.length - 1}` : firstChain ?? '—');
    networks.title = protocol.chains.join(', ');
    cell(row, money(protocol.tvl_usd), 'num');
    const direction = protocol.change_7d > 0 ? 'positive' : protocol.change_7d < 0 ? 'negative' : '';
    cell(row, percent(protocol.change_7d), `num ${direction}`);
    cell(row, money(market ? protocol.mcap_usd : protocol.implied_value_usd), 'num amount');
    body.append(row);
  }
  if (!entries.length) {
    const row = create('tr');
    cell(row, 'No protocols match these filters.').colSpan = headers.length;
    body.append(row);
  }
  byId('count').textContent = entries.length ? `Showing ${start + 1}–${Math.min(start + pageSize, entries.length)} of ${entries.length} protocols` : '0 protocols';
  byId('pageNumber').textContent = `Page ${page} of ${pages}`;
  byId('prev').disabled = page <= 1;
  byId('next').disabled = page >= pages;
}

function setView(nextView) {
  view = nextView;
  page = 1;
  const market = view === 'market';
  byId('detail').hidden = true;
  byId('board').hidden = view === 'method';
  byId('method').hidden = view !== 'method';
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.tab === view));
  if (view === 'method') return;
  const source = market ? data.markets : data.rows;
  const oldCategory = controls.category.value;
  const oldChain = controls.chain.value;
  fillSelect(controls.category, source.map(row => row.category).filter(Boolean));
  fillSelect(controls.chain, source.flatMap(row => row.chains));
  if ([...controls.category.options].some(option => option.value === oldCategory)) controls.category.value = oldCategory;
  if ([...controls.chain.options].some(option => option.value === oldChain)) controls.chain.value = oldChain;
  controls.universe.parentElement.hidden = market;
  controls.sort.options[0].textContent = market ? 'Reported market cap' : 'Implied value';
  byId('boardTitle').textContent = market ? 'Protocols with token records' : 'Ranked protocols';
  byId('boardNote').textContent = market
    ? 'Market caps as reported in the snapshot. Missing values are shown as a dash.'
    : 'Values are model scenarios in USD for protocols with no recorded token.';
  renderTable();
}

function showDetail(protocol, focus = true) {
  view = 'radar';
  tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.tab === view)));
  byId('board').hidden = true;
  byId('method').hidden = true;
  byId('detail').hidden = false;
  byId('protocolType').textContent = protocol.watch ? `WATCHLIST · RANK ${protocol.rank}` : `BEYOND WATCHLIST · RANK ${protocol.rank}`;
  byId('protocolTitle').textContent = protocol.name;
  byId('protocolContext').textContent = [protocol.category ?? 'Unclassified', ...protocol.chains].join(' · ');
  byId('heroValue').textContent = money(protocol.implied_value_usd);
  const [low, high] = protocol.range;
  const marker = create('span');
  const position = high === low ? 50 : 100 * (protocol.implied_value_usd - low) / (high - low);
  marker.style.left = `calc(${position}% - 2px)`;
  const track = create('div', undefined, 'range-track');
  track.setAttribute('aria-hidden', 'true');
  track.append(marker);
  const labels = create('div', undefined, 'range-label');
  labels.append(create('span', `Low ${money(low)}`), create('span', `High ${money(high)}`));
  byId('range').replaceChildren(track, labels);
  pairs(byId('drivers'), [
    ['TVL in snapshot', money(protocol.tvl_usd)],
    ['7-day TVL change', percent(protocol.change_7d)],
    ['Tracked history', protocol.age_days == null ? 'Unreported' : `${protocol.age_days} days`],
    ['Blended base multiple', multiple(protocol.drivers.multiple)],
    ['Growth / maturity factors', `${multiple(protocol.drivers.growth)} / ${multiple(protocol.drivers.maturity)}`],
    ['Category comparables', protocol.drivers.peers],
  ]);
  byId('flags').textContent = protocol.flags.length ? protocol.flags.join(' · ') : 'TVL, weekly change and tracking date reported.';
  byId('plan').replaceChildren(...protocol.plan.map((step, index) => {
    const item = create('li');
    const number = create('span', String(index + 1), 'step-num');
    number.setAttribute('aria-hidden', 'true');
    const copy = create('div');
    copy.append(
      create('strong', step.action),
      create('p', step.detail),
      create('span', `${step.cost} · ${step.time}`, 'budget'),
    );
    item.append(number, copy);
    return item;
  }));
  if (focus) byId('protocolTitle').focus({ preventScroll: true });
}

for (const tab of tabs) tab.addEventListener('click', () => setView(tab.dataset.tab));
for (const [name, control] of Object.entries(controls)) {
  control.addEventListener(name === 'search' ? 'input' : 'change', () => {
    page = 1;
    renderTable();
  });
}
byId('rows').addEventListener('click', event => {
  const button = event.target.closest('button[data-slug]');
  if (button) showDetail(rowsBySlug.get(button.dataset.slug));
});
byId('back').addEventListener('click', () => {
  setView('radar');
  byId('search').focus({ preventScroll: true });
});
byId('reset').addEventListener('click', () => {
  for (const [name, control] of Object.entries(controls)) control.value = name === 'sort' ? 'value' : '';
  page = 1;
  renderTable();
});
byId('prev').addEventListener('click', () => { page--; renderTable(); });
byId('next').addEventListener('click', () => { page++; renderTable(); });

const displayDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
  .format(new Date(`${data.date}T00:00:00Z`));
byId('snapshotDate').textContent = displayDate;
byId('snapshotDate').dateTime = data.date;
byId('source').textContent = `${data.source} · Historical snapshot · Values in USD`;
pairs(byId('summary'), [
  ['Ranked protocols', data.rows.length],
  ['On watchlist', data.watchlistCount],
  ['Valuation peers', data.comparableCount],
]);
byId('methodology').replaceChildren(...data.methodology.map(text => create('li', text)));
setView('radar');
for (const [name, control] of Object.entries(controls)) {
  const value = query.get(name);
  if (value !== null && (name === 'search' || [...control.options].some(option => option.value === value))) {
    control.value = value;
  }
}
renderTable();
const requestedDetail = rowsBySlug.get(query.get('protocol'));
if (requestedDetail) showDetail(requestedDetail, false);
