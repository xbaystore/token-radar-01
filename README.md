# Token Radar

The best token launch radar: a program that reads a sealed snapshot of every protocol
DefiLlama tracks, ranks the ones that record no token by what their launch would be
worth, and hands in a web dashboard with the board, a detail view for each protocol and
the steps to farm it.

Entry for make.fun competition `token-radar-01` (deadline 2026-12-14T10:00Z).

## The model (`radar-empirical-1`)

Implied value follows only from the snapshot's own figures — no protocol name is ever
special-cased:

```
category ratio   = median(market cap / TVL) over the snapshot's traded protocols in the
                   same category (global median when fewer than 3 traded peers)
growth           = 1 + clamp(7-day TVL change, -50%, +100%) × 0.5
maturity         = 0.7 + min(age in days, 1095) / 1095 × 0.5
implied FDV      = TVL × category ratio × growth × maturity
implied value    = implied FDV × 10%  (the community's share at launch)
```

The board covers the snapshot's whole 40-protocol watchlist (the floor) plus every other
rankable pre-token protocol below the floor — 198 rows in this snapshot. Protocols whose
token already trades are shown apart in the dashboard's Live view, at the market's own
market cap, never mixed into the ranked board.

A protocol is listed when its record shows **no token** — never as proof it has none.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

Requires Node.js 22.18 or later. The program is deterministic: run it twice and the
output bytes are identical. It writes `out/board.json`, `out/data.js`, `out/dashboard/`,
`out/screenshots/` and `out/dossier.json`.

## Layout

- `main.ts` — the entrypoint: reads the snapshot, writes the board, data and dossier.
- `lib/model.ts` — the ranking model, the farm plans and the board's self-checks.
- `vendor/makefun-board.ts` — the kit's dossier library, byte for byte.
- `dashboard/` — the static page (index.html, app.css, app.js); no network, no framework.
- `screenshots/` — the board, a detail view and a filtered view, rendered in headless Chromium.

## License

MIT — see `LICENSE`.
