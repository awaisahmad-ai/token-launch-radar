# Launch Radar

[![Make.fun bounty](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Make.fun rank](https://make.fun/badge/token-radar-01/awaisahmad-ai/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![Make.fun reward](https://make.fun/badge/token-radar-01/awaisahmad-ai/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

Launch Radar ranks DeFi protocols using Make.fun's sealed DefiLlama snapshot. It uses circulating market cap to TVL ratios from recorded tokens to estimate a low, base and high valuation scenario for each candidate. The board includes the full watchlist and screens the remaining snapshot for additional candidates.

The dashboard runs offline and offers category, chain and watchlist filters, a separate recorded-token view, valuation details and farming checks. The model estimates circulating value under stated assumptions. Campaign eligibility and costs require verification with the protocol.

## Run locally

Use Node.js 22.18 or later. From this directory, point the entry to the competition kit's snapshot.

```sh
node main.ts --input ../../token-radar-01-kit/input/snapshot.json --output ../../token-radar-preview
```

Open `dashboard/index.html` in the output folder. The grader uses `/input/snapshot.json` and `/output` by default. The Make.fun dossier includes the dashboard source and three browser captures.
