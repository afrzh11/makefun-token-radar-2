// Token Radar, second entry: a peer-multiple model with a fitted scale factor.
//
// The board ranks every protocol that records no token and is not a wrapped, staked or
// bridged product of a token that already trades. The watchlist is the floor, never the
// ceiling: the board covers all 40 of its slugs and adds every other protocol that passes
// the same exclusion rule the watchlist itself uses, whatever its TVL.
//
// Implied value is a comparables model, computed only from the snapshot's own figures.
// It differs from a plain peer-multiple board in three stated ways, each of which the
// dashboard shows with its numbers:
//
//   peer     = the median market-cap/TVL of the token-bearing protocols in the same
//              category, after each peer's ratio is capped at the 90th percentile of all
//              ratios, blended with the global median by peer count: a category with
//              few peers is mostly the global median, one with many is mostly its own.
//              Clamped to [0.05, 2.50]. A lone peer worth 400x its TVL cannot set its
//              whole category: on this snapshot the only traded prediction-market peer
//              is worth 400x its TVL, and the cap keeps it from putting every
//              prediction market at the top on one unrepresentative ratio.
//   scale    = a size factor fitted from the snapshot itself: the log-log slope of
//              market-cap/TVL against TVL over the token-bearing protocols (about
//              -0.48 here), applied as (TVL / median peer TVL) ^ slope and clamped to
//              [0.25, 2.00]. Big protocols' tokens trade at a smaller multiple of TVL
//              than small ones'; the factor is fitted, not asserted, and the dashboard
//              prints the slope it fitted.
//   growth   = the 7-day TVL change, clamped to -60%..+120%. Downside counts at half
//              weight (0.5) and upside at 0.35: TVL that leaves is a stronger signal
//              than TVL that arrives, which is often mercenary.
//   age      = a hump, not a ramp: under 90 days the protocol has not proven it lasts
//              (0.80); it rises to 1.15 at three years; past three years it decays,
//              because a protocol that has run that long with no token is less likely
//              to launch one soon. Unknown age counts as 365 days.
//   implied  = round(tvl_usd x peer x scale x growth x age), at least $1
//
// No protocol name is ever special-cased: the same function scores every row, and the
// dashboard shows the five factors for every row so a reader can check the arithmetic.
// The implied value is the entry's own claim, never a price and never a promise of a
// token. The fitted figures (the slope, the reference TVL, the percentile cap, the
// global median and every category median) are computed from the snapshot at run time,
// never written in by hand.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
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
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  shrink_peers: number;
  winsor_pct: number;
  peer_clamp_low: number;
  peer_clamp_high: number;
  scale_clamp_low: number;
  scale_clamp_high: number;
  growth_down_weight: number;
  growth_up_weight: number;
  growth_floor: number;
  growth_cap: number;
  age_young_days: number;
  age_young_factor: number;
  age_peak_days: number;
  age_peak_factor: number;
  age_decay_base: number;
  age_decay_floor: number;
  unknown_age_days: number;
}

export const MODEL: ModelConstants = {
  shrink_peers: 5,
  winsor_pct: 0.9,
  peer_clamp_low: 0.05,
  peer_clamp_high: 2.5,
  scale_clamp_low: 0.25,
  scale_clamp_high: 2.0,
  growth_down_weight: 0.5,
  growth_up_weight: 0.35,
  growth_floor: -60,
  growth_cap: 120,
  age_young_days: 90,
  age_young_factor: 0.8,
  age_peak_days: 1095,
  age_peak_factor: 1.15,
  age_decay_base: 0.95,
  age_decay_floor: 0.85,
  unknown_age_days: 365,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-peer-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
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
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    peer_multiple: number;
    peer_peers: number;
    peer_basis: 'category' | 'global';
    scale_factor: number;
    growth_pct: number;
    growth_multiplier: number;
    age_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** One peer-multiple table entry: a category's multiple, how many peers set it, and whether the global median did most of the work. */
export interface PeerEntry {
  multiple: number;
  peers: number;
  basis: 'category' | 'global';
}

/** The fitted figures the model read off the snapshot: the slope, the reference TVL, the percentile cap and the global median. */
export interface ModelFit {
  scale_slope: number;
  scale_ref_tvl_usd: number;
  winsor_cap: number;
  global_multiple: number;
  peer_protocols: number;
}

/** The dashboard's compact view of one row: positional, see dataScript's column note. */
export type RadarRow = [
  rank: number,
  slug: string,
  name: string,
  category: string | null,
  chains: string[],
  tvl_usd: number,
  change_7d: number | null,
  age_days: number | null,
  peer_multiple: number,
  peer_peers: number,
  peer_basis: 'category' | 'global',
  scale_factor: number,
  growth_multiplier: number,
  age_factor: number,
  implied_value_usd: number,
  on_watchlist: boolean,
];

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export type LiveRow = [
  slug: string,
  name: string,
  category: string | null,
  chains: string[],
  tvl_usd: number,
  mcap_usd: number | null,
  change_7d: number | null,
];

/** Everything the dashboard needs: the board, the live set, the peer table, the fit and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  fit: ModelFit;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  excluded_pre_token: number;
  total_implied_usd: number;
  global_peer_multiple: number;
  peers: Record<string, PeerEntry>;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The quantile of a sorted list, nearest-rank. */
function quantileSorted(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

/**
 * The fitted scale relation and the peer-multiple table, both read off the snapshot's
 * token-bearing protocols: the log-log slope of market-cap/TVL against TVL (and the
 * median peer TVL it is measured from), the 90th percentile every peer ratio is capped
 * at, the global median multiple, and one multiple per category, winsorized and then
 * shrunk toward the global median by peer count.
 */
export function peerTable(
  protocols: SnapshotProtocol[],
  model: ModelConstants = MODEL,
): { peers: Record<string, PeerEntry>; fit: ModelFit } {
  const ratios: number[] = [];
  const tvls: number[] = [];
  const byCategory = new Map<string, number[]>();
  for (const p of protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    ratios.push(ratio);
    tvls.push(p.tvl_usd);
    const cat = p.category ?? 'Uncategorised';
    const list = byCategory.get(cat) ?? [];
    list.push(ratio);
    byCategory.set(cat, list);
  }
  const sortedRatios = [...ratios].sort((a, b) => a - b);
  const winsorCap = quantileSorted(sortedRatios, model.winsor_pct);
  const global = clamp(median(ratios), model.peer_clamp_low, model.peer_clamp_high);
  // Log-log slope of mcap/TVL against TVL: ordinary least squares on the logs.
  const xs = tvls.map((t) => Math.log(t));
  const ys = ratios.map((r) => Math.log(r));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const fit: ModelFit = {
    scale_slope: round4(slope),
    scale_ref_tvl_usd: Math.round(Math.exp(mx)),
    winsor_cap: round4(winsorCap),
    global_multiple: round4(global),
    peer_protocols: n,
  };
  const peers: Record<string, PeerEntry> = {};
  for (const [cat, list] of [...byCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const capped = list.map((r) => Math.min(r, winsorCap));
    const catMedian = median(capped);
    const multiple = clamp((list.length * catMedian + model.shrink_peers * global) / (list.length + model.shrink_peers), model.peer_clamp_low, model.peer_clamp_high);
    peers[cat] = {
      multiple: round4(multiple),
      peers: list.length,
      basis: list.length >= model.shrink_peers ? 'category' : 'global',
    };
  }
  return { peers, fit };
}

/** The peer multiple one protocol gets: its category's table entry, else the global median. */
function peerFor(p: SnapshotProtocol, peers: Record<string, PeerEntry>, global: number): PeerEntry {
  const entry = peers[p.category ?? 'Uncategorised'];
  return entry !== undefined ? entry : { multiple: global, peers: 0, basis: 'global' };
}

/** The size factor: (TVL / reference TVL) ^ fitted slope, clamped so it adjusts, never decides. */
export function scaleFactor(tvlUsd: number, fit: ModelFit, model: ModelConstants = MODEL): number {
  return clamp(Math.pow(tvlUsd / fit.scale_ref_tvl_usd, fit.scale_slope), model.scale_clamp_low, model.scale_clamp_high);
}

/** The growth multiplier: downside at half weight (0.5), upside at the lower weight (0.35). */
export function growthMultiplier(change7d: number | null, model: ModelConstants = MODEL): { pct: number; mult: number } {
  const pct = clamp(finite(change7d, 0), model.growth_floor, model.growth_cap);
  const mult = 1 + (model.growth_down_weight * Math.min(pct, 0)) / 100 + (model.growth_up_weight * Math.max(pct, 0)) / 100;
  return { pct: round4(pct), mult };
}

/**
 * The age factor: a hump. Under 90 days the protocol has not proven it lasts; it rises
 * to the peak at three years; past three years it decays, because a protocol that has
 * run that long with no token is less likely to launch one soon.
 */
export function ageFactor(age: number | null, model: ModelConstants = MODEL): number {
  const a = age ?? model.unknown_age_days;
  if (a < model.age_young_days) return model.age_young_factor;
  if (a <= model.age_peak_days) {
    return model.age_young_factor + ((a - model.age_young_days) / (model.age_peak_days - model.age_young_days)) * (model.age_peak_factor - model.age_young_factor);
  }
  const yearsPast = (a - model.age_peak_days) / 365;
  return Math.max(model.age_decay_floor, model.age_peak_factor * Math.pow(model.age_decay_base, yearsPast));
}

/** The five factors and the implied value one protocol gets. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  peers: Record<string, PeerEntry>,
  fit: ModelFit,
  model: ModelConstants = MODEL,
): {
  implied: number;
  peer: PeerEntry;
  scale: number;
  growthPct: number;
  growthMult: number;
  ageMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const peer = peerFor(protocol, peers, fit.global_multiple);
  const scale = scaleFactor(protocol.tvl_usd, fit, model);
  const { pct: growthPct, mult: growthMult } = growthMultiplier(protocol.change_7d, model);
  const ageMult = ageFactor(age, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * peer.multiple * scale * growthMult * ageMult));
  return { implied, peer, scale, growthPct, growthMult, ageMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** An exchange's name at the start of a protocol's name. */
const EXCHANGE = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * A wrapped, staked or bridged product's name: a whole word `wrapped`, `staked`, `staking`,
 * `restaking` or `restaked`. Restaking is a staked product of a token that already trades, so the
 * word belongs in the list even though the watchlist's own rule names only the first three.
 */
const WRAPPED = /\b(wrapped|staked|staking|restaking|restaked)\b/i;

/**
 * The categories the watchlist's rule excludes: bridges, liquid staking and exchanges.
 * 'Cross Chain Bridge' is DefiLlama's other bridge category: a bridge product by name, and the
 * house's watchlist keeps Circle Gateway (Circle's bridge product) out of it — via the parent
 * protocol, a field the snapshot does not carry — so the category, not the name, is excluded.
 * Without this, one bridge product would rank near the top and its farm plan would be
 * "bridge USDC", which is not farming a token launch.
 */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and passing the same exclusion rule the
 * watchlist itself uses — not a bridge, liquid-staking or exchange product, not a versioned pool,
 * not an exchange's name, and no wrapped/staked word in its name.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !EXCHANGE.test(p.name) &&
    !WRAPPED.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n and strictly falling values. */
export function buildBoard(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; peers: Record<string, PeerEntry>; fit: ModelFit; excludedPreToken: number } {
  const { peers, fit } = peerTable(snapshot.protocols, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other protocol that passes the same exclusion rule, whatever its TVL.
  // A protocol above the floor that passes the rule would already be on the watchlist, so the
  // early rows are all below the floor by construction.
  let excludedPreToken = 0;
  for (const p of snapshot.protocols) {
    if (isPreToken(p) && !isRankable(p)) excludedPreToken++;
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, peers, fit, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // Ranks must be a strict order: equal implied values fall by a dollar, in rank order.
  for (let i = 1; i < scored.length; i++) {
    if (scored[i]!.implied >= scored[i - 1]!.implied) scored[i]!.implied = Math.max(1, scored[i - 1]!.implied - 1);
  }
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      // Full precision, unrounded where the dashboard recomputes: the factors must multiply
      // to the board value exactly (up to the strict-order adjustment below). Display rounds
      // them; the record does not.
      peer_multiple: s.peer.multiple,
      peer_peers: s.peer.peers,
      peer_basis: s.peer.basis,
      scale_factor: s.scale,
      growth_pct: s.growthPct,
      growth_multiplier: s.growthMult,
      age_factor: s.ageMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age, i + 1).map(stepText),
  }));
  return { board, peers, fit, excludedPreToken };
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => [p.slug, p.name, p.category, p.chains, p.tvl_usd, p.mcap_usd, p.change_7d] as LiveRow);
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, onWatchlist: boolean): RadarRow {
  return [
    row.rank,
    row.slug,
    row.name,
    row.category,
    row.chains,
    row.tvl_usd,
    row.change_7d,
    row.age_days,
    row.model.peer_multiple,
    row.model.peer_peers,
    row.model.peer_basis,
    row.model.scale_factor,
    row.model.growth_multiplier,
    row.model.age_factor,
    row.implied_value_usd,
    onWatchlist,
  ];
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const { board, peers, fit, excludedPreToken } = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlist.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    fit,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    excluded_pre_token: excludedPreToken,
    total_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    global_peer_multiple: fit.global_multiple,
    peers,
    rows: board.map((r) => radarRow(r, watchlist.has(r.slug))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100) return `the board has ${board.length} rows, under the 100-row floor`;
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd >= board[i - 1]!.implied_value_usd) return `row ${i + 1} does not fall below row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_value_usd > 100_000_000_000_000) return `${r.slug} has implied value over the $100T cap`;
  }
  return null;
}

/**
 * A compact data.js: the dashboard's whole dataset as one script, no fetch and no network.
 * Rows are positional arrays; the column order is fixed here and in dashboard/app.js:
 * [rank, slug, name, category, chains, tvl_usd, change_7d, age_days,
 *  peer_multiple, peer_peers, peer_basis, scale_factor, growth_multiplier, age_factor,
 *  implied_value_usd, on_watchlist]
 * Live rows: [slug, name, category, chains, tvl_usd, mcap_usd, change_7d].
 */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

// ---------------------------------------------------------------- farm plans
// The plan templates live in dashboard/plans.js, the one source of truth the page also loads.
// main.ts imports them here so board.json's farm steps and the page's plans can never drift apart.

import Plans from '../dashboard/plans.js';

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export function farmSteps(p: SnapshotProtocol, age: number | null, rank: number): FarmStep[] {
  return Plans.farmSteps(p, age, rank);
}

export function stepText(step: FarmStep): string {
  return Plans.stepText(step);
}
