# Perfect Crossing

A mobile-first, one-thumb traffic crossing game built for portrait phones.

## Current foundation

- Deterministic procedural levels from the level number.
- Difficulty scales across 5,000+ levels without storing individual level files.
- Local progression for level, cash, gems, completion count and streak.
- Cash rewards on completion and gem rewards for clean crossings/tasks.
- PWA manifest and offline service worker.
- GitHub Actions validation on Node 24.

## Gameplay

Tap **TAP TO MOVE** (or the road on touch devices) to advance one lane. Avoid traffic and reach the far side.

The generator uses the level number as its seed, so the same level produces the same traffic layout.

## Next milestones

1. Make collision/solvability simulation authoritative rather than heuristic.
2. Add proper task UI and cosmetic shop.
3. Add stronger traffic patterns, vehicle types and visual feedback.
4. Add automated gameplay tests for generated levels.
5. Polish mobile/PWA behaviour.
6. Validate TikTok Mini Game packaging and monetisation requirements before integrating ads.
