# makefun-best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/zxpast/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/zxpast/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Ember Tide — Lantern of the Last Light.** An original 2D canvas arcade game: pilot a lantern-skiff across a night sea, catch the falling embers to keep the light alive, dodge the ash-wisps, and survive all 10 waves until dawn. Between waves, choose one of three blessings — a wider glow, a swifter current, an ember magnet, a sturdier hull, a quicker dash, or an ember ward. Synthesised WebAudio sound, particles, screen shake, gusts of wind, combo scoring, and a best score that persists in the browser.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Play with WASD or arrow keys to sail, SPACE to dash, P to pause, M to mute. Between waves, pick a blessing with keys 1, 2, 3 or a click. Press R to sail again after a win or a loss.

## Layout

- `game/` — the game itself, plain static files, no build step, no network: `index.html` plus `src/` modules (`config`, `random`, `input`, `audio`, `world`, `render`, `shots`, `main`).
- `screenshots/` — four real renders of the game: title, mid-play, blessing choice, victory.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1c6jcmp6&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
