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
| **TD** | Tower defense — build and upgrade arrow, cannon, frost, storm, ballista, venom and gold mine towers to stop 20 waves of monsters. After wave 9 the land freezes and the monsters take a new path. **2-player co-op** | Pick a tower, then tap/click grass to build; tap a tower to upgrade or sell. Keys 1–7, Space for next wave, U/S |
| **Fish Off** | 2 players, 2 phones — catch the most fish in 90 seconds. Keep the line tension in the green or it snaps | Drag in the water (or arrow keys / WASD) to move the hook; hold (or Space) to reel |
| **Dream House** | Make your player, then build and decorate a dollhouse: furniture, pets, wall paint and floors on up to 3 floors, plus a backyard out the back door with a swing set, slide, pool, BBQ, campfire and more. Then live in it with a daily to-do list — breakfast, drive to work for a tapping game (chef, doctor, firefighter, vet, builder or astronaut), then evening chores and bed. Work earns coins for special items (like a treehouse, and a rocket ship that flies you to the moon) and new cars. Visit made-up neighbors or the houses your family built on their own phones, or invite them over (🏘️ Neighbors) — family who visit your house show up at yours too. Each phone keeps its own house | **Build:** pick something (Backyard tab for outdoor things), tap the house to place it, drag to move, tap it for color/flip/remove; + / − to zoom. **Play:** tap to walk and use things, or arrow keys / WASD, Up/Down on the stairs, Space to use |

Every game also has on-screen touch controls for phones and tablets, and
posts to the shared high-score board when a game ends (except Dream House,
which has no score).

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

## On the phone

Away from home the arcade is reached over Tailscale, which the
[piServer](https://github.com/wanderazimuth/piServer) repo sets up, at
`https://raspberrypi.<tailnet>.ts.net:10000` (your signed-in devices only). Open that in
Chrome and choose **Add to Home screen > Install** to get the arcade as an app.

The app saves every game, so the one-player games work with no connection at all; high scores
and two-player games need the server. Each visit to the arcade page while connected refreshes the
saved games. Installing needs HTTPS, so use the tailnet address, not http://arcade.lan.

## High scores

Scores are saved to `game-server/scores.json`, keeping the top 10 per game.
The file is created automatically on the first score and is not tracked in
git, so each install keeps its own board.

The games talk to the server through a small JSON API:

- `GET /scores/<game>` — the top 10 scores, highest first
- `POST /scores/<game>` with `{"name": "ROY", "score": 7100}` — adds a score
  and returns the updated top 10. Names are cut to 16 characters.

Dream House shares each device's house so the family can visit each other. The
houses are kept in `game-server/houses.json` (not in git):

- `GET /houses` — every shared house: `[{"id", "name", "day", "updated"}]`
- `GET /houses/<id>` — one house (rooms, furniture, and its owner's look)
- `POST /houses/<id>` with `{"name", "day", "house": {...}}` — shares or updates a
  house. The id is a random one each device makes for itself; houses are capped at 200 KB.
- `POST /houses/<id>/visit` with `{"name", "look"}` — records that someone visited that house
- `GET /houses/<id>/visits` — the last 20 visits; the owner's game has each visitor drop by

## Two-player co-op

Brick Runner, Magma Runner, Fish Off and TD support two players on different
devices. Both players open the same game, and the server relays game state
between them over a WebSocket (`/ws/brick-runner`, `/ws/magma-runner`,
`/ws/fish-off`, `/ws/td`). Each game has a single room: the first player to
connect is player 1, the second is player 2, and anyone else is told the room
is full.

In TD co-op, player 1's device runs the game and streams it to player 2,
whose taps (build, upgrade, sell, next wave, speed) are sent back as actions.
The players share lives but each has their own gold: kill gold goes to the
owner of the tower that got the kill, both get the wave-clear bonus, and a
gold mine pays its builder. Each tower is outlined in its builder's color and
only its builder can upgrade or sell it. Player 1 saves the team score.

## Project layout

```
game_project/
├── game-server/
│   └── server.py        # web server, landing page, scores, co-op relay
├── app/                 # the installable app: manifest, icons, offline service worker
├── avalanche/index.html
├── brick-runner/index.html
├── dream-house/index.html
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

3. Restart the server. The game appears on the landing page, and the app saves it for offline
   play (it needs to be a single `index.html` for that).

To use the high-score board, have the game `POST` to `/scores/my-game` when
a round ends.
