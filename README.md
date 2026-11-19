# makefun-token-radar-2

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/afrzh11/makefun-token-radar-2/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/afrzh11/makefun-token-radar-2/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Which pre-token protocol is worth farming next — and what to do about it. A second, rebuilt entry for the [make.fun](https://make.fun) bounty **token-radar-01** ("Build the best token launch radar"). It reads a sealed snapshot of every protocol DefiLlama tracks, works out which ones still record no token and are not a wrapped or staked product of one that trades, ranks them by what their launch would be worth, and hands in a web dashboard with the board, a detail view for every protocol, and the steps to farm it.

## What is different here

The model is `radar-peer-2`, a peer-multiple model with three stated improvements over a plain peer board:

- **Peer multiple, winsorized and shrunk.** Each peer ratio is capped at the 90th percentile of all ratios, then the category median is blended with the global median by peer count — a category with few peers is mostly the global median, one with many is mostly its own. A lone peer worth 400× its TVL cannot set its whole category.
- **Size factor, fitted.** The log-log slope of market-cap/TVL against TVL is fitted from the snapshot's own token-bearing protocols (about −0.48 here) and applied as (TVL ÷ median peer TVL) ^ slope, clamped to 0.25–2.00. Big protocols' tokens trade at a smaller multiple of TVL than small ones'; the factor is fitted, not asserted.
- **Age factor, humped.** 0.80 under 90 days, rising to 1.15 at three years, then decaying past three years — a protocol that has run that long with no token is less likely to launch one soon.

Growth counts downside at half weight (0.5) and upside at 0.35. Every farm plan has seven steps, each naming the protocol, its chain and its category, with a cost and a time, and each detail view adds up the estimated cost. No protocol name is ever special-cased.

On the 2026-11-14 snapshot the board has 196 rows (40 watchlist + 156 early finds), total implied value ≈ $3.83B.

## Run it

Node.js 22.18 or later, standard library only — nothing to install.

```sh
# the grader mounts the sealed snapshot at /input
node main.ts

# outside the grader's container:
MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=00whd2w5&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
