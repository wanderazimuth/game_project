# Game Arcade

A home arcade of browser games, served by a small Python server that also
keeps a shared high-score board. Anyone on the home network can open the
arcade in a browser — on a computer, phone, or tablet — and play.

No build step and no dependencies: each game is a single `index.html`, and the
server uses only the Python standard library.

## Games

| Game | Description | Controls |
|---|---|---|
| **Galaga** | Classic space shooter | Arrow keys / A D to move, Space to fire |
| **Brick Runner** | Fast-paced brick game — collect the stars. **2-player co-op** | Arrow keys / WASD to move, Space to jump, R to restart |
| **Lava Drop** | Dodge asteroids raining from the sky | Arrow keys / A D to move |
| **Magma Runner** | Jump across magma platforms above the lava. **2-player co-op** | Arrow keys / WASD to move, Space to jump, R to restart |
| **Space Salvager** | Collect crystals for fuel through 20 waves of enemies | Arrow keys / WASD to move, Space to fire, E for epic weapon |
| **Prairie King** | Cowboy vs zombies — survive 10 waves on the prairie | WASD to move, arrow keys to shoot |
| **Jungle Party** | Run through the jungle to invite 3 monkeys to a birthday party | Arrow keys / WASD to run, Space to jump |
| **Avalanche** | Ski down the mountain — don't let the avalanche catch you | Arrow keys / A D to steer |
| **Dungeon Runner** | Grab the key and escape all 10 rooms before time runs out — dodge skeletons, bats and spike traps, then defeat the Bone King in the final room | Arrow keys / WASD to move, Space to dash |
| **TD** | Tower defense — build and upgrade arrow, cannon, frost and storm towers to stop 20 waves of monsters. After wave 9 the land freezes and the monsters take a new path. **2-player co-op** | Pick a tower, then tap/click grass to build; tap a tower to upgrade or sell. Keys 1–4, Space for next wave, U/S |
| **Fish Off** | 2 players, 2 phones — catch the most fish in 90 seconds. Keep the line tension in the green or it snaps | Drag in the water (or arrow keys / WASD) to move the hook; hold (or Space) to reel |

Every game also has on-screen touch controls for phones and tablets, and
posts to the shared high-score board when a game ends.

## Running it

Requires Python 3.

```bash
python3 game-server/server.py
```

The server prints its address, for example:

```
Game Arcade running on http://192.168.0.125:8080
```

Open that address from any device on the same network.

The server listens on port 8080. To use another port, set `ARCADE_PORT`,
e.g. `ARCADE_PORT=8082 python3 game-server/server.py`.

### Run it automatically (Linux, systemd)

To start the arcade at login and restart it if it crashes, create
`~/.config/systemd/user/game-arcade.service`:

```ini
[Unit]
Description=Game Arcade Web Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /path/to/game_project/game-server/server.py
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
```

Then enable it:

```bash
systemctl --user daemon-reload
systemctl --user enable --now game-arcade
```

After editing `server.py`, apply the change with
`systemctl --user restart game-arcade`. Edits to a game's `index.html` show
up on the next page load — no restart needed.

## Pages

| URL | What it is |
|---|---|
| `/` | Arcade landing page with every game |
| `/<game>/` | A game, e.g. `/galaga/` |
| `/scores` | High scores for all games |

## High scores

Scores are saved to `game-server/scores.json`, keeping the top 10 per game.
The file is created automatically on the first score and is not tracked in
git, so each install keeps its own board.

The games talk to the server through a small JSON API:

- `GET /scores/<game>` — the top 10 scores, highest first
- `POST /scores/<game>` with `{"name": "ROY", "score": 7100}` — adds a score
  and returns the updated top 10. Names are cut to 16 characters.

## Two-player co-op

Brick Runner, Magma Runner, Fish Off and TD support two players on different
devices. Both players open the same game, and the server relays game state
between them over a WebSocket (`/ws/brick-runner`, `/ws/magma-runner`,
`/ws/fish-off`, `/ws/td`). Each game has a single room: the first player to
connect is player 1, the second is player 2, and anyone else is told the room
is full.

In TD co-op, player 1's device runs the game and streams it to player 2,
whose taps (build, upgrade, sell, next wave, speed) are sent back as actions.
The players share gold and lives, each tower is outlined in its builder's
color, and player 1 saves the team score.

## Project layout

```
game_project/
├── game-server/
│   └── server.py        # web server, landing page, scores, co-op relay
├── avalanche/index.html
├── brick-runner/index.html
├── dungeon-runner/index.html
├── fish-off/index.html
├── galaga/index.html
├── jungle-party/index.html
├── lava-drop/index.html
├── magma-runner/index.html
├── prairie-king/index.html
├── salvager/index.html
└── td/index.html
```

## Adding a game

1. Create a folder with an `index.html`, e.g. `my-game/index.html`.
2. Add it to the `GAMES` registry at the top of `game-server/server.py`:

   ```python
   "my-game": ("my-game", "My Game", "One-line description"),
   ```

3. Restart the server. The game appears on the landing page.

To use the high-score board, have the game `POST` to `/scores/my-game` when
a round ends.
