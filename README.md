# WICKWARD — the last flame is your health and your money

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/zxpast/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/zxpast/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A tower-defense survival game for make.fun's **best-game-01** bounty (round 2).

## The one idea

Your **flame is both your health and your money**. Every tower you build burns a
piece of your own flame. Every kill feeds flame back. Spend too much light and
the dark takes you.

## How to play

- Hold the **Last Flame** (left) through **10 nights**. Bosses rise on nights
  **5 (Murk Herald)** and **10 (The Gloam King, 3 phases)**.
- **1–8** pick a tower, **click a plot** to build it (Thorn Walls go on lanes).
  Towers cost flame — the same flame the dark burns when something leaks past.
- **U** upgrade a selected tower (up to Lv 3), **X** sell it back for 60%.
- **SPACE** starts the night. Between nights, pick **1 of 3 boons** (reroll once).
- Survive night 10 to win — then keep going in **endless nights**.
- **3 difficulties**: Ember, Blaze, Inferno. **F** toggles 1×/2× speed, **M** mutes,
  **P** pauses, **R** restarts, **Esc** deselects.
- 8 towers (Ember Spitter, Cinder Sniper, Frost Wisp, Splash Brazier, Thorn
  Wall, Glimmer Moth, Dawn Bell, Moonpetal Cannon), 6 enemy kinds, WebAudio
  synth sound, particles, floating rewards, and a darkness that only your
  light pushes back.

## Run it

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Open `game/index.html` in desktop Chrome. No build step, no network: every
script, image and sound is a file under `game/` or synthesized at runtime.

## Verify it (headless)

```sh
# autopilot plays a full game to win/lose and prints the result
google-chrome --headless=new --dump-dom 'http://localhost:8080/?auto=1&seed=7'
# staged screenshot frames
google-chrome --headless=new --screenshot=1-play.jpg --window-size=1280,720 'http://localhost:8080/?shot=play&seed=7'
```

The autopilot wins on Ember difficulty across seeds 1–12 (see the build notes
in the submission report). Deterministic: the same seed always plays the same
game.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1c6jcmp6&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
