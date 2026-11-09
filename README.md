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
| **Brick Runner** | Fast-paced brick game — collect the stars and stomp the slimes and bats. **2-player co-op** | Arrow keys / WASD to move, Space to jump, R to restart |
| **Lava Drop** | Dodge asteroids raining from the sky | Arrow keys / A D to move |
| **Magma Runner** | Jump across magma platforms above the lava. **2-player co-op** | Arrow keys / WASD to move, Space to jump, R to restart |
| **Space Salvager** | Collect crystals for fuel through 20 waves of enemies | Arrow keys / WASD to move, Space to fire, E for epic weapon |
| **Prairie King** | Cowboy vs zombies — survive 10 waves on the prairie | WASD to move, arrow keys to shoot |
| **Jungle Party** | Run through the jungle to invite 3 monkeys to a birthday party | Arrow keys / WASD to run, Space to jump |
| **Avalanche** | Ski down the mountain — don't let the avalanche catch you | Arrow keys / A D to steer |
| **Dungeon Runner** | Grab the key and escape all 10 rooms before time runs out — dodge skeletons, bats and spike traps, then defeat the Bone King in the final room | Arrow keys / WASD to move, Space to dash |
| **TD** | Tower defense — build and upgrade arrow, cannon, frost, storm, ballista, venom and gold mine towers to stop 20 waves of monsters. After wave 9 the land freezes and the monsters take a new path. **2-player co-op** | Pick a tower, then tap/click grass to build; tap a tower to upgrade or sell. Keys 1–7, Space for next wave, U/S |
| **Fish Off** | 2 players, 2 phones — catch the most fish in 90 seconds. Keep the line tension in the green or it snaps | Drag in the water (or arrow keys / WASD) to move the hook; hold (or Space) to reel |
| **Cookie Rampage** | Grandma ate all the cookies! Run through an endless house smashing furniture for points (smash in a row for a combo). Eat cookies to keep her sugar meter up — at zero she falls asleep. Jump over the cat and Grandpa's calming cup of tea; grab a cake for a MEGA RAMPAGE | Space / ↑ / W or tap to jump, twice for a double jump |
| **Turbo Karts** | Top-down kart race: 3 laps against Grandma, Captain Max and Dr. Lily. Drive through ? boxes for a 🚀 boost, 🍌 banana peel or ⭐ star, grab coins, and stay off the grass. Score: 1000 / 700 / 500 / 300 for your place, plus 10 per coin | Your kart drives itself; ◀ ▶ / A D to steer, Space (or 🎁) to use your item |
| **Verity** | A friendly smiley ball in a blocky world gives you jobs (apples, flowers, feed the pig, find the kitten, light torches, mine stone, gather eggs) and a present for each one — every third job (or finding the lost kitten) it's a pet instead, up to 3, who follow you around and point the way to the sorry hearts. Be nice: bump it, kick it or let its jobs run out and… uh-oh. It turns red and chases you in the dark while everyone hides — find the 3 sorry hearts 💛 before it catches you and kicks you out | Arrow keys / WASD (or hold your finger where you want to go) to walk, K or 🦶 to kick |
| **Castle Siege** | Build a castle out of as many glass, wood, stone and metal blocks as you like (metal is the toughest) to keep your King 👑 safe — or tap Auto castle. Then take turns with the enemy flinging boulders, bombs, fire pots (wood burns!) and triple shots from your catapults. Blocks crack, smash and topple; bonk the enemy king 3 times to win, then make your castle stronger for the next, bigger enemy castle. **2 Players:** share one device and pass it back and forth — or **2 Devices:** one player hosts and gets a room code, the other joins with it, and you each build and fire from your own screen. Score (1 player): 100 × level for each castle you beat, plus 50 per crown you have left and a bonus for using few shots; it's saved when you lose or tap Save score | **Build:** pick a block and tap (or drag) to stack it, 👑 to move the king, 🧽 to remove. **Battle:** drag back from anywhere and let go to fling; pick your ammo at the bottom |
| **Zombie Apocalypse** | Zombies invade the town at night! Run around the streets and shoot them in waves — runners, big brutes, and Big Bob the giant every 5 waves, who stomps right over houses. Zombies drop coins: walk into the 🔫 SHOP door to buy better guns (shotgun, SMG, assault rifle, sniper, minigun, rocket launcher, Rainbow Ray) and gear (medkits, grenades, armor, speed boots, a coin magnet and a Robot Buddy who shoots for you). **2 Players (2 devices):** one player hosts and gets a room code, the other joins with it, and you fight the zombies together — each with your own coins and guns. If you get knocked out, you come back when the wave is cleared. Score: points for every zombie plus 100 × the wave number for each wave you clear | WASD / arrows to move, mouse to aim, click to shoot, R reload, Q / 1–8 / wheel to switch guns, G grenade. On phones: left thumb moves, right thumb aims and shoots |
| **Rogue** | The 1980 classic, ported from the original Rogue 5.4.4 source (BSD license, see `rogue/LICENSE.TXT`). Explore the Dungeons of Doom one level at a time — monsters are the letters A–Z — find the Amulet of Yendor on level 26 and climb back out. Unknown potions, scrolls, rings and wands, hidden doors, traps, hunger and permadeath, just like the original. Your final gold goes on the high-score board, just like the original (a win counts all your loot); the game saves itself after every move | Arrow keys or the original h j k l y u b n keys (Shift to run) and the classic letter commands (? for help). On phones: tap the map to walk there, tap next to you to step or attack, or use the pad and command buttons |
| **Rogue+** | The very same Rogue game (it runs `rogue/rogue.js`, so every rule is identical) with hand-drawn pixel art: stone floors, brick walls, a sprite for each of the 26 monsters, and unknown potions, rings and wands shown in their real colours. Places you remember but can't see are dimmed. Its own save and its own high-score board. After you die, 🎒 See what you had on the gravestone shows your pack with everything identified (Roguish too). Kept true to the original, for comparison with Roguish | Tap to walk or attack, flick to run, pinch to zoom, drag to look around (◎ or double tap to come back), hold anything to see what it is. The big button does what fits (Go down / Pick up / Search; hold to rest). A 6-slot quick bar for food, potions, scrolls and wands (drag items onto it in the pack to pin them); tap toward a target to aim. Keyboard works too. ☰ Menu has every command and a classic-letters view |
| **Roguish** | A copy of Rogue+ to change the game in: it has its own `roguish/rogue.js`, so new rules there leave Rogue and Rogue+ true to the original for comparison. So far: a squarer 42×40 dungeon (instead of 80×22) that suits a phone screen, and a high-score board ranked by the deepest level reached (gold breaks ties; a win beats any depth); secret doors and hidden passages next to you get noticed on their own (1 turn in 4), though traps still need searching; each square you stand on for the first time on a level heals a little (a full heal every 150 new squares), so exploring beats resting; and a potion or scroll is named once you use it. Its own save | The same controls as Rogue+, kept in sync: a control change goes into both `index.html` files, unless it's only for a rule Roguish changed |
| **Seaside Village** | Your ship crashed on an island! Place farmland (it's free), plant crops (carrot seeds are free too) and put what you grow in the shipping bin for coins. Spend them on houses (a villager moves in for each one), a bakery (3 🌾 → 🍞) and a creamery (2 🥛 → 🧀), a fish pond, a pig pen (pigs dig up 🌰 truffles), a greenhouse that grows fruit by itself, bridges to walk across water, hedges, free trees, a campfire, picnic table, statue, playground and windmill, fences and gates (people walk through a gate, but hens and cows can't — fence them in a pen), chicken coops, beehives, a barn, a fishing dock, wells, a market stall, fountains, lamp posts and more. Walk around to explore the island hidden in the fog: chop trees, mine rocks (sometimes there's a gem), pick up seashells, mushrooms and flowers, and find 10 treasure chests with coins and rare seeds (strawberry, melon, pineapple). Villagers with a ❗ want something and pay well for it. Build **Your House** (free, one per island) and tap it to go inside: walk around and decorate the room with 21 things to buy — beds, sofas, rugs, a TV, piano, fireplace, bathtub, fishbowl, windows, paintings, a clock and more — plus wallpapers and floors. A 🧰 Chest keeps things from your bag safe (they won't get shipped, and they stay on that island). Move, remove or recolor what you've placed (🎨 Decorate), and sleep in the bed in the evening to skip to the next morning. Adopt pets in 🎨 Decorate (hamster, bunny, turtle, cat, dog, parrot, frog, mouse, hedgehog, duck, penguin, fox, owl and a 🦄 unicorn — up to 10): they wander around your house, get hungry every day (each eats a crop or an egg or fish you can grow, so tap them to feed them for ❤️ hearts — a happy pet sometimes finds coins), and you can pet them, rename them or find them a new home. An 🥣 Auto Feeder (in 🎨 Decorate) feeds every hungry pet by itself — no filling needed, even while you're away. A 🐾 on Your House means a pet is hungry. Tap a villager's house to go inside and visit them: every villager's home is furnished their own way (some have a pet), and you can talk to them and help with their ❗ request there — but only Your House can be decorated. Villagers come to visit Your House too: tap 📨 Invite inside it, or they drop by on their own some days (🔔). Up to 3 at a time walk around, chat about your furniture and pets, and can be talked to there — and when they go home they leave a 🎁 coin gift if your house is decorated (once per villager per day). A 👋 on Your House means someone is visiting. Walk out the door to go back outside. Goals at the top show what to do next, and once they're all done there are endless jobs (harvest, plant, earn at the bin, collect eggs/milk/honey, fish, chop, mine, find shells, build decorations, help or invite villagers, feed pets, explore) — a new one every time you finish one, slowly getting bigger and paying more (tap the job to swap it for a different one); fix the shipwreck in 3 steps — then tap the ship to sail: discover brand-new islands (each with its own shape, forests, lakes and treasure) and give them names, sail back and forth between them, and rename them any time. Your coins, bag, seeds and goals come with you; each island keeps its own village, house and pets. The ship can also take you to 🌋 Volcano Island: no trees, just black sand, ash and lots of rocks, surrounded by a bubbling sea of lava instead of water (no docks there!), and a volcano that erupts every 17 seconds (watch the countdown!) — lava bombs fly out, knock you over if they hit you, and leave 🌋 lava rocks to pick up once they cool. Scorpions there chase you and steal things from your bag (or coins); catch the thief and tap it to bonk it and get your stuff back. Fences and hedges keep them out. Watch out for 🔥 fire flowers there too: step on one and it burns something in your bag (tapping somewhere to walk goes around them). Everything you build on Volcano Island comes in its own volcano version — Ash Farmland, Obsidian Paths, Basalt Fences, Fire Trees and Fire Flowers, Lava Lamps, a Lava Fountain and Lava Pond, a Basalt House, a Fire Beacon and so on (and the furniture inside Your House there too). Or sail to 🧊 Ice Island: snow falling on snowy pine forests, frozen lakes you slide across (step on and whoosh all the way over), penguins that trade a 🐟 fish for an 🧊 Ice Crystal, and polar bears that roar, knock you back and gobble a fish from your bag if they catch you — feed one a fish yourself and it gives you coins and a crystal and naps. Houses there are igloos (Your Igloo too), and everything you build comes in an icy version. Or sail to 🌴 Jungle Island: thick jungle with banana trees, a waterfall pouring into a pool, 🦜 parrots that squawk hints, 🐒 monkeys that swipe your 🍌 bananas (catch and tap the thief to get them back, or hand one a banana for coins), and an old temple deep in the jungle — find the 3 🗝️ Temple Keys hidden in treasure chests to open it for 🪙1000 and a 🗿 Golden Idol. Everything you build there comes in a bamboo-and-thatch jungle version. Build the lighthouse to see the whole island. A day lasts 5 minutes, with lamps and windows lighting up at night. Crops and animals keep working while you're away. Each device keeps its own island. **2 Players (2 devices):** build a free 🛖 Cabin, tap 👥 → Invite to get a room code, and a friend taps 👥 → Join and types it in to visit your island (no cabin, no visitors — the friend stays in the cabin). You share the coins and the bag and build together; when the friend goes home, their own island is just as they left it | **Play:** tap to walk and use things (tapping a field harvests or plants all of it with the seeds picked below), hold/drag to walk, or arrow keys / WASD and Space. **Build:** pick something, then tap or drag to place it; ✋ to move the map, ↔️ to move something you built (tap it, then tap or drag it to its new spot — free, and crops stay planted), 🧹 to remove (half the coins back); + / − or pinch to zoom |
| **Dream House** | Make your player, then build and decorate a dollhouse: furniture, pets, wall paint and floors on up to 3 floors, plus a backyard out the back door with a swing set, slide, pool, BBQ, campfire, and a greenhouse for relaxed farming (plant, water, harvest). Past the driveway there's a front yard too, with a mailbox (a postcard from a neighbor each day) and lamp posts. The seasons change every 3 days — blossoms, summer sun, falling leaves, snow — and each crop only grows in its seasons (pumpkins in fall). In winter, build a snowman (⛄): roll three snowballs, then pick its hat, nose, scarf, arms and buttons. On fall nights, put on a costume and go trick-or-treating (🎃) with your kids. Christmas is the middle day of winter: heavy snow, roof lights, Santa's sleigh and presents to open. A time machine in the backyard takes you to dinosaur times, knights and castles, or the far future (tap the yellow flying car there to fly off to Space Salvager). Get a robo puppy at the city pet shop or bring one home from the future. Then live in it with a daily to-do list — breakfast, drive to work for a tapping game (chef, doctor, firefighter, vet, builder or astronaut), then evening chores and bed. Work earns coins for special items (like a treehouse, and a rocket ship that flies you to the moon) and new cars. Visit made-up neighbors or the houses your family built on their own phones, or invite them over (🏘️ Neighbors) — family who visit your house show up at yours too. Some days Grandma drops by, eats a whole jar of cookies and rampages through the house, up and down the stairs, knocking furniture over — tap her to calm her down with tea, a hug or knitting (🪙5). Go out instead and she'll have trashed the place by the time you get back, and still be at it. Or press 👵 Rampage! in Build → House and she'll go wild 5 seconds after you press Play. Make friends with the made-up neighbors (❤️ hearts) and marry one (once someone in the family marries a neighbor, nobody else can); a crib lets you have babies who grow into kids. Drive to the city for ice cream, pizza, the movies, a ferris wheel and a pet shop (watch Space Puppies and you can send your own puppies to space). Drive to the beach to go swimming (push the beach ball, spot a dolphin, and tap a fish to go play Fish-Off), build a sandcastle, collect seashells and sunbathe under the umbrella. Or drive to the mine: fight slimes, bats and spiders with your pickaxe and mine rocks for coins — 12 hits and you wake up in bed. Each phone keeps its own house | **Build:** pick something (Backyard and Front yard tabs for outdoor things), tap the house to place it, drag to move, tap it for color/flip/remove; + / − to zoom. **Play:** tap to walk and use things, or arrow keys / WASD, Up/Down on the stairs, Space to use |

Every game also has on-screen touch controls for phones and tablets, and
posts to the shared high-score board when a game ends (except Dream House and
Seaside Village, which have no score).

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

- `GET /houses` — every shared house: `[{"id", "name", "day", "updated", "spouse"}]` (`spouse` is the
  made-up neighbor that player married, so no one else in the family can marry them too)
- `GET /houses/<id>` — one house (rooms, furniture, and its owner's look)
- `POST /houses/<id>` with `{"name", "day", "spouse", "house": {...}}` — shares or updates a
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
├── castle-siege/index.html
├── cookie-rampage/index.html
├── dream-house/index.html
├── dungeon-runner/index.html
├── fish-off/index.html
├── galaga/index.html
├── jungle-party/index.html
├── lava-drop/index.html
├── magma-runner/index.html
├── prairie-king/index.html
├── rogue/              # index.html, rogue.js (the port) and LICENSE.TXT
├── rogue-deluxe/       # index.html (pixel-art screen and touch controls) and sprites.js; runs ../rogue/rogue.js
├── roguish/            # a copy of Rogue+ with its own rogue.js, sprites.js and LICENSE.TXT, for changing the game
├── salvager/index.html
├── seaside-village/index.html
├── td/index.html
├── turbo-karts/index.html
├── verity/index.html
└── zombie-apocalypse/index.html
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
