# Pop Party

Pop Party is an original, mobile-first block-popping puzzle game. Tap connected groups of two or more matching blocks, create power-ups, clear level objectives, earn coins, and unlock the next level.

## Play

Live game: https://liamvsc.github.io/temp-game/

No build step, account, backend, or ads are required. Progress and the active puzzle run are saved locally in the browser, including placed boosters; saves do not sync between devices.

## Rules

- Tap a connected group of 2+ matching blocks to pop it.
- Groups of 4+ create rockets, 5+ create bombs, and 9+ create rainbow clears.
- Tiles fall under gravity and refill from above. New matches formed by gravity do not automatically pop; each move is deliberate.
- Clear both colour objectives before running out of moves.
- Completing a level awards coins and automatically advances to the next level.
- Only the current unlocked level is playable; completed levels cannot be replayed.
- Rocket, bomb, and shuffle boosters are available. Settings include sound and vibration preferences.

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
