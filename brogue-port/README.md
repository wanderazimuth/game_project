# Brogue for the arcade

The arcade's `brogue/` game is [Brogue: Community Edition](https://github.com/tmewett/BrogueCE)
1.15.1, compiled to WebAssembly with Emscripten. Brogue was written by Brian Walker; Brogue CE
is maintained by its community. Both are licensed under the GNU Affero General Public License
v3 (`brogue/LICENSE.txt`), and so is this port.

## Source

The complete source of what the arcade serves:

- Brogue CE's code, unchanged, at tag [v1.15.1](https://github.com/tmewett/BrogueCE/tree/v1.15.1).
- `wasm-platform.c` here: the platform layer that connects the game to the page. It replaces
  Brogue's SDL and terminal front ends: it draws by handing characters to the page, and waits
  for input with `emscripten_sleep` (Asyncify) so the browser keeps running meanwhile.
- `build.py` here: the exact compiler flags.
- `brogue/index.html`: the page. It draws the 100×34 character screen on a canvas, turns taps,
  clicks and keys into Brogue's mouse and key events, keeps saves and high scores in IndexedDB,
  and posts finished games to the arcade's high scores.

## Building

1. Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html)
   (`emsdk install latest`, `emsdk activate latest`) and run `emsdk_env` in the shell.
2. Get Brogue CE: `git clone --branch v1.15.1 https://github.com/tmewett/BrogueCE.git`
3. `python brogue-port/build.py path/to/BrogueCE`

This writes `brogue/brogue.js` and `brogue/brogue.wasm`, which are committed so the Pi only
serves files. The committed build was made with Emscripten 7.0.0.
