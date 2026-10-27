#!/usr/bin/env python3
"""Game arcade server - serves a landing page and all game directories."""

import base64
import hashlib
import http.server
import json
import os
import re
import socketserver
import struct
import threading
import time

PORT = int(os.environ.get("ARCADE_PORT", 8080))
GAMES_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Game registry: url_path -> (directory, display_name, description)
GAMES = {
    "galaga": ("galaga", "Galaga", "Classic space shooter"),
    "brick-runner": ("brick-runner", "Brick Runner", "Fast-paced brick game"),
    "lava-drop": ("lava-drop", "Lava Drop", "Dodge asteroids raining from the sky"),
    "magma-runner": ("magma-runner", "Magma Runner", "Jump across magma platforms above the lava"),
    "salvager": ("salvager", "Space Salvager", "Collect crystals for fuel through 20 waves of enemies"),
    "prairie-king": ("prairie-king", "Prairie King", "Cowboy vs zombies — survive 10 waves on the prairie"),
    "jungle-party": ("jungle-party", "Jungle Party", "Run through the jungle to invite 3 monkeys to a birthday party"),
    "avalanche": ("avalanche", "Avalanche", "Ski down the mountain — don't let the avalanche catch you"),
    "dungeon-runner": ("dungeon-runner", "Dungeon Runner", "Grab the key and escape each room before time runs out"),
    "td": ("td", "TD", "Tower defense — build towers to stop 20 waves of monsters"),
    "fish-off": ("fish-off", "Fish Off", "2 players, 2 phones — catch the most fish in 90 seconds"),
    "dream-house": ("dream-house", "Dream House", "Make your player, then design and decorate your own house"),
    "cookie-rampage": ("cookie-rampage", "Cookie Rampage", "Grandma ate all the cookies — smash through the house on a sugar rush"),
    "turbo-karts": ("turbo-karts", "Turbo Karts", "Kart race: 3 laps against Grandma, Captain Max and Dr. Lily"),
    "verity": ("verity", "Verity", "A friendly ball gives you jobs and presents — but don't be mean to it…"),
}

# What makes the arcade an installable app: url_path -> (file in app/, content type).
APP_DIR = os.path.join(GAMES_DIR, "app")
APP_FILES = {
    "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json"),
    "/sw.js": ("sw.js", "text/javascript; charset=utf-8"),
    "/icon-192.png": ("icon-192.png", "image/png"),
    "/icon-512.png": ("icon-512.png", "image/png"),
}


def app_file(path):
    name, content_type = APP_FILES[path]
    with open(os.path.join(APP_DIR, name), "rb") as f:
        data = f.read()
    if name == "sw.js":
        # The service worker saves every game for offline play; it gets the list from GAMES.
        data = data.replace(b"/*GAMES*/[]", json.dumps(list(GAMES)).encode())
    return data, content_type

# Games played by two people on separate devices; the All Scores page lists
# them in their own section.
TWO_PLAYER_GAMES = {"brick-runner", "magma-runner", "fish-off", "td"}

# Games with nothing to score; the All Scores page leaves them out.
UNSCORED_GAMES = {"dream-house"}

# ── Score management ──────────────────────────────────────────────────────────
SCORES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scores.json")
SCORES_LOCK = threading.Lock()
_scores_cache = None

def _load_scores():
    global _scores_cache
    if _scores_cache is None:
        try:
            with open(SCORES_FILE) as f:
                _scores_cache = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            _scores_cache = {}
    return _scores_cache

def _save_scores(data):
    global _scores_cache
    _scores_cache = data
    with open(SCORES_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_scores(game):
    with SCORES_LOCK:
        return list(_load_scores().get(game, []))

def add_score(game, name, score):
    with SCORES_LOCK:
        data = _load_scores()
        bucket = data.get(game, [])
        bucket.append({"name": name[:16], "score": int(score)})
        bucket.sort(key=lambda x: x["score"], reverse=True)
        data[game] = bucket[:10]
        _save_scores(data)
        return list(data[game])

# ── Dream House: each device shares its house so the family can visit ─────────
HOUSES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "houses.json")
HOUSES_LOCK = threading.Lock()
HOUSE_MAX_BYTES = 200_000
HOUSE_ID = re.compile(r"[a-z0-9]{8,32}")   # a random id each device makes for itself

def _load_houses():
    try:
        with open(HOUSES_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def list_houses():
    with HOUSES_LOCK:
        return [{"id": k, "name": v["name"], "day": v["day"], "updated": v["updated"], "spouse": v.get("spouse")}
                for k, v in _load_houses().items()]

def get_house(house_id):
    with HOUSES_LOCK:
        entry = _load_houses().get(house_id)
        return entry and entry["house"]

def _save_houses(data):
    tmp = HOUSES_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, HOUSES_FILE)

def save_house(house_id, name, day, house, spouse=None):
    with HOUSES_LOCK:
        data = _load_houses()
        visits = data.get(house_id, {}).get("visits", [])
        data[house_id] = {"name": name, "day": day, "house": house, "updated": int(time.time()), "visits": visits,
                          "spouse": spouse}   # which made-up neighbor they married, so nobody else can
        _save_houses(data)

# When someone visits a family member's house, the owner's game sees it and their character drops by.
def add_visit(house_id, name, look):
    with HOUSES_LOCK:
        data = _load_houses()
        if house_id not in data:
            return False
        visits = data[house_id].setdefault("visits", [])
        visits.append({"name": name, "look": look, "time": int(time.time())})
        del visits[:-20]
        _save_houses(data)
        return True

def get_visits(house_id):
    with HOUSES_LOCK:
        return _load_houses().get(house_id, {}).get("visits", [])

LANDING_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Game Arcade</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0a0a1a">
<link rel="icon" href="/icon-192.png">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #0a0a1a;
  color: #fff;
  font-family: 'Courier New', monospace;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}
h1 {
  font-size: 2.2rem;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 4px;
  text-shadow: 0 0 20px #0ff, 0 0 40px #08f;
}
.subtitle {
  color: #888;
  margin-bottom: 40px;
  font-size: 0.9rem;
}
.games {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
  max-width: 400px;
}
.game-card {
  display: block;
  background: linear-gradient(135deg, #1a1a3a, #0d0d2a);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 24px;
  text-decoration: none;
  color: #fff;
  transition: all 0.2s;
}
.game-card:active, .game-card:hover {
  border-color: #0ff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
  transform: scale(1.02);
}
.game-card h2 {
  font-size: 1.3rem;
  margin-bottom: 6px;
  color: #0ff;
}
.game-card p {
  color: #999;
  font-size: 0.85rem;
  margin-bottom: 0;
}
.score-table { margin-top: 12px; border-top: 1px solid #1a1a3a; padding-top: 8px; }
.score-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 0.75rem; }
.s-rank { color: #334; width: 22px; flex-shrink: 0; }
.s-name { flex: 1; color: #888; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.s-pts  { color: #0ef; flex-shrink: 0; }
.no-scores { color: #334; font-size: 0.73rem; margin-top: 10px; }
</style>
</head>
<body>
<h1>Arcade</h1>
<p class="subtitle">Choose a game</p>
<div class="games">
{cards}</div>
<script>
// Installable app that plays offline. Browsers only allow it over HTTPS (the tailnet name), not http://arcade.lan.
if ("serviceWorker" in navigator && isSecureContext) navigator.serviceWorker.register("/sw.js").catch(() => {});
</script>
</body>
</html>
"""

def build_scores_html(game_key):
    scores = get_scores(game_key)[:3]
    if not scores:
        return '<p class="no-scores">No scores yet</p>'
    rows = "".join(
        f'<div class="score-row">'
        f'<span class="s-rank">#{i+1}</span>'
        f'<span class="s-name">{s["name"]}</span>'
        f'<span class="s-pts">{s["score"]:,}</span>'
        f'</div>'
        for i, s in enumerate(scores)
    )
    return f'<div class="score-table">{rows}</div>'

def build_landing_page():
    cards = "".join(
        f'  <a class="game-card" href="/{key}/">'
        f'<h2>{info[1]}</h2><p>{info[2]}</p>'
        f'{build_scores_html(key)}</a>\n'
        for key, info in GAMES.items()
    )
    page = LANDING_PAGE_TEMPLATE.replace('{cards}', cards)
    page = page.replace(
        '<p class="subtitle">Choose a game</p>',
        '<p class="subtitle">Choose a game &nbsp;·&nbsp; <a href="/scores" style="color:#0ff;text-decoration:none">All Scores</a></p>'
    )
    return page

def build_score_sections(keys):
    sections = ""
    for key in keys:
        info = GAMES[key]
        scores = get_scores(key)
        if scores:
            rows = "".join(
                f'<div class="row">'
                f'<span class="rank">#{i+1}</span>'
                f'<span class="name">{s["name"]}</span>'
                f'<span class="pts">{s["score"]:,}</span>'
                f'</div>'
                for i, s in enumerate(scores)
            )
        else:
            rows = '<div class="empty">No scores yet</div>'
        sections += f'<div class="section"><h2>{info[1]}</h2>{rows}</div>\n'
    return sections

def build_all_scores_page():
    sections = build_score_sections(k for k in GAMES if k not in TWO_PLAYER_GAMES | UNSCORED_GAMES)
    two_player_sections = build_score_sections(k for k in GAMES if k in TWO_PLAYER_GAMES)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>All Scores — Arcade</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
  background: #0a0a1a;
  color: #fff;
  font-family: 'Courier New', monospace;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}}
h1 {{
  font-size: 2rem;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 4px;
  text-shadow: 0 0 20px #0ff, 0 0 40px #08f;
}}
.back {{
  color: #0ff;
  text-decoration: none;
  font-size: 0.85rem;
  margin-bottom: 36px;
  display: block;
}}
.back:hover {{ text-decoration: underline; }}
.grid {{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 900px;
}}
.section {{
  background: linear-gradient(135deg, #1a1a3a, #0d0d2a);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
}}
.section h2 {{
  color: #0ff;
  font-size: 1.1rem;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #222;
}}
.row {{
  display: flex;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #111;
  font-size: 0.8rem;
}}
.rank {{ color: #446; width: 28px; flex-shrink: 0; }}
.name {{ flex: 1; color: #aaa; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }}
.pts  {{ color: #0ef; flex-shrink: 0; }}
.empty {{ color: #333; font-size: 0.75rem; padding: 6px 0; }}
.group-title {{
  width: 100%;
  max-width: 900px;
  margin: 40px 0 16px;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #f0f;
  text-shadow: 0 0 12px #f0f;
}}
</style>
</head>
<body>
<h1>All Scores</h1>
<a class="back" href="/">&#8592; Back to Arcade</a>
<div class="grid">
{sections}</div>
<h2 class="group-title">2-Player Games</h2>
<div class="grid">
{two_player_sections}</div>
</body>
</html>"""


# --- Minimal WebSocket support (no third-party deps available on this box) ---
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def ws_accept_key(key):
    return base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()


def ws_build_frame(opcode, payload):
    first_byte = 0x80 | (opcode & 0x0F)
    length = len(payload)
    if length <= 125:
        header = struct.pack("!BB", first_byte, length)
    elif length <= 0xFFFF:
        header = struct.pack("!BBH", first_byte, 126, length)
    else:
        header = struct.pack("!BBQ", first_byte, 127, length)
    return header + payload


def ws_decode_frame(read_exact):
    head = read_exact(2)
    if head is None:
        return None
    b1, b2 = head[0], head[1]
    opcode = b1 & 0x0F
    masked = bool(b2 & 0x80)
    length = b2 & 0x7F
    if length == 126:
        ext = read_exact(2)
        if ext is None:
            return None
        length = struct.unpack("!H", ext)[0]
    elif length == 127:
        ext = read_exact(8)
        if ext is None:
            return None
        length = struct.unpack("!Q", ext)[0]
    mask_key = read_exact(4) if masked else None
    if masked and mask_key is None:
        return None
    payload = read_exact(length) if length else b""
    if payload is None:
        return None
    if masked:
        payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))
    return opcode, payload


# Single shared co-op "room" for brick-runner: at most player1 + player2.
BR_CLIENTS = {}
BR_LOCK = threading.Lock()

# Same pattern for magma-runner.
MR_CLIENTS = {}
MR_LOCK = threading.Lock()

# Two-player rooms that use the generic relay (handle_relay_ws).
RELAY_ROOMS = {
    "/ws/fish-off": ({}, threading.Lock()),
    "/ws/td": ({}, threading.Lock()),
}


class ArcadeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=GAMES_DIR, **kwargs)

    def end_headers(self):
        # These game files change often during development - tell browsers
        # (especially mobile ones) to always revalidate instead of serving a
        # stale cached copy.
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        if self.path == "/ws/brick-runner":
            self.handle_brick_runner_ws()
            return

        if self.path == "/ws/magma-runner":
            self.handle_magma_runner_ws()
            return

        if self.path in RELAY_ROOMS:
            self.handle_relay_ws(*RELAY_ROOMS[self.path])
            return

        # All-scores page
        if self.path == "/scores":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(build_all_scores_page().encode())
            return

        # Scores API
        if self.path.startswith("/scores/"):
            game = self.path[8:].strip("/")
            data = json.dumps(get_scores(game)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
            return

        # Dream House neighbors: the list, or one house
        if self.path == "/houses":
            self.send_json(list_houses())
            return
        if self.path.startswith("/houses/") and self.path.endswith("/visits"):
            self.send_json(get_visits(self.path[8:-7]))
            return
        if self.path.startswith("/houses/"):
            house = get_house(self.path[8:].strip("/"))
            if house is None:
                self.send_error(404)
            else:
                self.send_json(house)
            return

        if self.path.split("?")[0] in APP_FILES:
            data, content_type = app_file(self.path.split("?")[0])
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # Landing page
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(build_landing_page().encode())
            return

        # Serve game files from their directories
        # Path like /galaga/ -> ~/galaga/index.html
        # Path like /galaga/foo.js -> ~/galaga/foo.js
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/scores/"):
            game = self.path[8:].strip("/")
            length = int(self.headers.get("Content-Length", 0))
            try:
                body = json.loads(self.rfile.read(length))
                name = str(body.get("name", "ANON")).strip()[:16] or "ANON"
                score = int(body.get("score", 0))
                updated = add_score(game, name, score)
                resp = json.dumps(updated).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(resp)
            except (ValueError, KeyError, TypeError):
                self.send_error(400)
            return
        if self.path.startswith("/houses/") and self.path.endswith("/visit"):
            length = int(self.headers.get("Content-Length", 0))
            if length > 20_000:
                self.send_error(413)
                return
            try:
                body = json.loads(self.rfile.read(length))
                look = body.get("look", {})
                if not isinstance(look, dict):
                    raise TypeError
                name = str(body.get("name", "")).strip()[:16] or "Neighbor"
                if add_visit(self.path[8:-6], name, look):
                    self.send_json({"ok": True})
                else:
                    self.send_error(404)
            except (ValueError, KeyError, TypeError):
                self.send_error(400)
            return
        if self.path.startswith("/houses/"):
            house_id = self.path[8:].strip("/")
            length = int(self.headers.get("Content-Length", 0))
            if not HOUSE_ID.fullmatch(house_id):
                self.send_error(400)
                return
            if length > HOUSE_MAX_BYTES:
                self.send_error(413)
                return
            try:
                body = json.loads(self.rfile.read(length))
                house = body["house"]
                if not isinstance(house, dict):
                    raise TypeError
                name = str(body.get("name", "")).strip()[:16] or "Neighbor"
                spouse = body.get("spouse")
                spouse = spouse[:32] if isinstance(spouse, str) and spouse else None
                save_house(house_id, name, int(body.get("day", 1)), house, spouse)
                self.send_json({"ok": True})
            except (ValueError, KeyError, TypeError):
                self.send_error(400)
            return
        self.send_error(404)

    def send_json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass  # Silence request logs

    # --- Brick Runner co-op relay ---
    def handle_brick_runner_ws(self):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            self.send_error(400, "Missing Sec-WebSocket-Key")
            return

        # Browsers (Firefox in particular) reject a WebSocket handshake that
        # answers with HTTP/1.0, which is this server's default.
        self.protocol_version = "HTTP/1.1"
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", ws_accept_key(key))
        self.end_headers()

        client_id = id(self)
        write_lock = threading.Lock()
        role = None

        with BR_LOCK:
            taken = {c["role"] for c in BR_CLIENTS.values()}
            if "player1" not in taken:
                role = "player1"
            elif "player2" not in taken:
                role = "player2"
            if role:
                BR_CLIENTS[client_id] = {"conn": self, "lock": write_lock, "role": role}

        if role is None:
            self.ws_send(write_lock, {"type": "room_full"})
            try:
                self.connection.sendall(ws_build_frame(0x8, b""))
            except OSError:
                pass
            return

        self.ws_send(write_lock, {"type": "role", "role": role})
        self.br_broadcast_peer_status()

        try:
            while True:
                frame = ws_decode_frame(self.ws_recv_exact)
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == 0x8:  # close
                    break
                if opcode == 0x9:  # ping
                    try:
                        self.connection.sendall(ws_build_frame(0xA, payload))
                    except OSError:
                        break
                    continue
                if opcode != 0x1:  # only handle text frames
                    continue
                try:
                    msg = json.loads(payload.decode("utf-8"))
                except (ValueError, UnicodeDecodeError):
                    continue
                self.br_broadcast(client_id, msg)
        except (ConnectionError, OSError):
            pass
        finally:
            with BR_LOCK:
                BR_CLIENTS.pop(client_id, None)
            self.br_broadcast_peer_status()

    def ws_recv_exact(self, n):
        if n == 0:
            return b""
        data = self.rfile.read(n)
        if not data or len(data) < n:
            return None
        return data

    def ws_send(self, lock, msg):
        frame = ws_build_frame(0x1, json.dumps(msg).encode("utf-8"))
        with lock:
            try:
                self.connection.sendall(frame)
            except OSError:
                pass

    def br_broadcast(self, sender_id, msg):
        with BR_LOCK:
            targets = [(c["conn"], c["lock"]) for cid, c in BR_CLIENTS.items() if cid != sender_id]
        for conn, lock in targets:
            conn.ws_send(lock, msg)

    def br_broadcast_peer_status(self):
        with BR_LOCK:
            items = list(BR_CLIENTS.items())
        roles_present = {c["role"] for _, c in items}
        both = "player1" in roles_present and "player2" in roles_present
        for _, c in items:
            c["conn"].ws_send(c["lock"], {"type": "peer_status", "connected": both})

    # --- Magma Runner co-op relay (identical pattern to brick-runner) ---
    def handle_magma_runner_ws(self):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            self.send_error(400, "Missing Sec-WebSocket-Key")
            return

        # Browsers (Firefox in particular) reject a WebSocket handshake that
        # answers with HTTP/1.0, which is this server's default.
        self.protocol_version = "HTTP/1.1"
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", ws_accept_key(key))
        self.end_headers()

        client_id = id(self)
        write_lock = threading.Lock()
        role = None

        with MR_LOCK:
            taken = {c["role"] for c in MR_CLIENTS.values()}
            if "player1" not in taken:
                role = "player1"
            elif "player2" not in taken:
                role = "player2"
            if role:
                MR_CLIENTS[client_id] = {"conn": self, "lock": write_lock, "role": role}

        if role is None:
            self.ws_send(write_lock, {"type": "room_full"})
            try:
                self.connection.sendall(ws_build_frame(0x8, b""))
            except OSError:
                pass
            return

        self.ws_send(write_lock, {"type": "role", "role": role})
        self.mr_broadcast_peer_status()

        try:
            while True:
                frame = ws_decode_frame(self.ws_recv_exact)
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == 0x8:
                    break
                if opcode == 0x9:
                    try:
                        self.connection.sendall(ws_build_frame(0xA, payload))
                    except OSError:
                        break
                    continue
                if opcode != 0x1:
                    continue
                try:
                    msg = json.loads(payload.decode("utf-8"))
                except (ValueError, UnicodeDecodeError):
                    continue
                self.mr_broadcast(client_id, msg)
        except (ConnectionError, OSError):
            pass
        finally:
            with MR_LOCK:
                MR_CLIENTS.pop(client_id, None)
            self.mr_broadcast_peer_status()

    def mr_broadcast(self, sender_id, msg):
        with MR_LOCK:
            targets = [(c["conn"], c["lock"]) for cid, c in MR_CLIENTS.items() if cid != sender_id]
        for conn, lock in targets:
            conn.ws_send(lock, msg)

    def mr_broadcast_peer_status(self):
        with MR_LOCK:
            items = list(MR_CLIENTS.items())
        roles_present = {c["role"] for _, c in items}
        both = "player1" in roles_present and "player2" in roles_present
        for _, c in items:
            c["conn"].ws_send(c["lock"], {"type": "peer_status", "connected": both})


    # --- Generic two-player relay ---
    # Same protocol as the brick-runner room: the first client is player1, the
    # second player2, a third gets room_full, and every JSON message is passed
    # to the other player.
    def handle_relay_ws(self, clients, lock):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            self.send_error(400, "Missing Sec-WebSocket-Key")
            return

        # Browsers (Firefox in particular) reject a WebSocket handshake that
        # answers with HTTP/1.0, which is this server's default.
        self.protocol_version = "HTTP/1.1"
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", ws_accept_key(key))
        self.end_headers()

        client_id = id(self)
        write_lock = threading.Lock()
        role = None

        with lock:
            taken = {c["role"] for c in clients.values()}
            if "player1" not in taken:
                role = "player1"
            elif "player2" not in taken:
                role = "player2"
            if role:
                clients[client_id] = {"conn": self, "lock": write_lock, "role": role}

        if role is None:
            self.ws_send(write_lock, {"type": "room_full"})
            try:
                self.connection.sendall(ws_build_frame(0x8, b""))
            except OSError:
                pass
            return

        self.ws_send(write_lock, {"type": "role", "role": role})
        self.relay_peer_status(clients, lock)

        try:
            while True:
                frame = ws_decode_frame(self.ws_recv_exact)
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == 0x8:
                    break
                if opcode == 0x9:
                    try:
                        self.connection.sendall(ws_build_frame(0xA, payload))
                    except OSError:
                        break
                    continue
                if opcode != 0x1:
                    continue
                try:
                    msg = json.loads(payload.decode("utf-8"))
                except (ValueError, UnicodeDecodeError):
                    continue
                with lock:
                    targets = [(c["conn"], c["lock"]) for cid, c in clients.items() if cid != client_id]
                for conn, peer_lock in targets:
                    conn.ws_send(peer_lock, msg)
        except (ConnectionError, OSError):
            pass
        finally:
            with lock:
                clients.pop(client_id, None)
            self.relay_peer_status(clients, lock)

    def relay_peer_status(self, clients, lock):
        with lock:
            items = list(clients.values())
        roles_present = {c["role"] for c in items}
        both = "player1" in roles_present and "player2" in roles_present
        for c in items:
            c["conn"].ws_send(c["lock"], {"type": "peer_status", "connected": both})


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    with ThreadedServer(("", PORT), ArcadeHandler) as httpd:
        import socket
        ip = socket.gethostbyname(socket.gethostname())
        # Try to get actual LAN IP
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass
        print(f"Game Arcade running on http://{ip}:{PORT}")
        print(f"Games: {', '.join(GAMES.keys())}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
