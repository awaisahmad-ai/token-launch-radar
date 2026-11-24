import { farmPlan } from './plan.ts';

type Protocol = {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
};

type Snapshot = {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
};

const excluded = new Set([
  'CEX', 'Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC',
]);
const wrapper = /\b(?:wrapped|staked|staking|coinbase|binance|kraken|bitget|bybit|bitfinex|okx|gemini)\b|\s(?:v\d+(?:\.\d+)?|\d+\.\d+)$/i;
const dayMs = 86_400_000;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const cash = (dollars: number) => Math.max(1, Math.min(100_000_000_000_000, Math.round(dollars)));

function percentile(items: number[], fraction: number): number {
  const position = (items.length - 1) * fraction;
  const index = Math.floor(position);
  const rest = position - index;
  return items[index] * (1 - rest) + items[Math.ceil(position)] * rest;
}

function bands(items: number[]) {
  return [0.25, 0.5, 0.75].map(fraction => percentile(items, fraction));
}

function hasTokenRecord(protocol: Protocol): boolean {
  return Boolean(protocol.gecko_id || protocol.symbol || (protocol.mcap_usd ?? 0) > 0);
}

function ageDays(protocol: Protocol, asOf: string): number | null {
  if (!protocol.listed_at) return null;
  const days = Math.floor((Date.parse(asOf) - Date.parse(protocol.listed_at)) / dayMs);
  return Number.isFinite(days) && days >= 0 ? days : null;
}

export const methodology = [
  'Comparable multiples are circulating market cap divided by TVL for tracked tokens with both figures. We cap extremes at the universe’s 5th and 95th percentiles.',
  'The low, base and high cases use the 25th, 50th and 75th percentile multiples. Category comparables are blended with the broad market using n ÷ (n + 8), where n is the category peer count.',
  'Value equals TVL × blended multiple × (1 + 0.35 × clipped 7-day TVL change) × (0.65 + 0.35 × capped tracked age ÷ 730). Growth is clipped to −50% and +75%. Missing growth uses 0% and missing age uses 180 days.',
  'The range shows peer dispersion. It is a circulating-value scenario, with no estimate for launch odds, token supply, fully diluted value or rewards.',
];

export function buildRadar(snapshot: Snapshot) {
  const markets = snapshot.protocols.filter(hasTokenRecord);
  const ratios = markets
    .filter(protocol => (protocol.mcap_usd ?? 0) > 0 && protocol.tvl_usd > 0 && !excluded.has(protocol.category ?? ''))
    .map(protocol => ({ category: protocol.category, ratio: protocol.mcap_usd! / protocol.tvl_usd }))
    .sort((left, right) => left.ratio - right.ratio);
  if (ratios.length < 4) throw new Error('The snapshot has too few token comparables');

  const universe = ratios.map(peer => peer.ratio);
  const lower = percentile(universe, 0.05);
  const upper = percentile(universe, 0.95);
  const broad = bands(universe.map(ratio => clamp(ratio, lower, upper)));
  const groups = new Map<string | null, number[]>();
  for (const { category, ratio } of ratios) {
    const bucket = groups.get(category) ?? [];
    bucket.push(clamp(ratio, lower, upper));
    groups.set(category, bucket);
  }

  const watchlist = new Set(snapshot.watchlist);
  const candidate = snapshot.protocols.filter(protocol =>
    watchlist.has(protocol.slug) ||
    (!hasTokenRecord(protocol) && !excluded.has(protocol.category ?? '') && !wrapper.test(protocol.name)));
  const rows = candidate.map(protocol => {
    const peers = protocol.category ? groups.get(protocol.category) ?? [] : [];
    const weight = peers.length / (peers.length + 8);
    const multiples = peers.length
      ? bands(peers).map((multiple, index) => weight * multiple + (1 - weight) * broad[index])
      : broad;
    const age = ageDays(protocol, snapshot.as_of);
    const growth = 1 + 0.35 * clamp((protocol.change_7d ?? 0) / 100, -0.5, 0.75);
    const maturity = 0.65 + 0.35 * Math.min(age ?? 180, 730) / 730;
    const values = multiples.map(multiple => cash(protocol.tvl_usd * multiple * growth * maturity));
    const flags = [
      ...(!peers.length ? ['Broad-market comparables'] : peers.length < 8 ? ['Thin peer group'] : []),
      ...(age === null ? ['Tracking date missing'] : []),
      ...(protocol.change_7d === null ? ['7-day TVL change missing'] : []),
      ...(hasTokenRecord(protocol) ? ['Token indicators present'] : []),
    ];
    const plan = farmPlan(protocol.name, protocol.category, protocol.chains[0]);
    return {
      ...protocol,
      rank: 0,
      watch: watchlist.has(protocol.slug),
      age_days: age,
      implied_value_usd: values[1],
      range: [values[0], values[2]],
      drivers: { multiple: multiples[1], growth, maturity, peers: peers.length },
      flags,
      plan,
      farm_steps: plan.map(step => `${step.action} ${step.detail} Budget: ${step.cost}. Time: ${step.time}.`),
    };
  }).sort((left, right) => right.implied_value_usd - left.implied_value_usd ||
    (left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0));
  rows.forEach((row, index) => { row.rank = index + 1; });

  if (rows.length < 100 || rows.length > 4_000 || rows.filter(row => row.watch).length !== watchlist.size) {
    throw new Error('The ranked board does not cover the snapshot watchlist and row minimum');
  }
  if (rows.some(row => row.farm_steps.some(step => step.length < 20 || step.length > 600))) {
    throw new Error('A farm plan exceeds the required length bounds');
  }

  return {
    rows,
    markets: markets.sort((left, right) => (right.mcap_usd ?? 0) - (left.mcap_usd ?? 0)),
    comparableCount: ratios.length,
    watchlistCount: watchlist.size,
    source: snapshot.source,
    date: snapshot.as_of,
    methodology,
  };
}
