# Pop Party

Pop Party is an original, mobile-first block-popping puzzle game. Tap connected groups of two or more matching blocks, create power-ups, clear level objectives, earn coins, and unlock the next level.

## Play

Live game: https://liamvsc.github.io/temp-game/

No build step, account, backend, or ads are required. Progress and the active puzzle run are saved locally in the browser, including placed boosters and a settled move state that survives app suspension during animations; saves do not sync between devices.

## Rules

- Tap a connected group of 2+ matching blocks to pop it.
- Groups of 4 create rockets, 5–8 create bombs, and 9+ create rainbow clears. One tile remains as the power-up; only tiles actually removed count toward objectives and score.
- Tiles fall under gravity and refill from above. Newly formed groups do not pop automatically: every pop costs a move and is chosen by you.
- Clear both colour objectives before running out of moves.
- First-time level clears award coins; every fifth distinct level cleared grants a 25-coin milestone bonus. Replays can improve best scores but do not repeatedly mint level-clear coins.
- Any unlocked level is playable; future levels stay locked until the previous level is completed.
- Rocket, bomb, and shuffle boosters are available. A local daily challenge rewards 25 coins for popping five groups, and four achievements award extra coins for distinct progression milestones. Progress, daily challenge state, achievements, and best scores are saved locally on this device.

## Development

Requires Node.js 22 or newer. Serve the repository root over HTTP (service workers do not work from `file://`):

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`.

Run the test suite:

```sh
npm test
npm run check
```

## Publishing

GitHub Actions runs the test suite and JavaScript syntax checks on pushes and pull requests to `main`. The Pages workflow deploys the repository root to GitHub Pages.

## Scope

- Deterministic board generation, group detection, gravity, refill, scoring, and progression sanitization.
- Mobile-first PWA with local saves and an offline service-worker cache.
- No ads, accounts, or backend.
