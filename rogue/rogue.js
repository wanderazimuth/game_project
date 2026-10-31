/*
 * Rogue: Exploring the Dungeons of Doom — a JavaScript port for the arcade.
 *
 * Ported from Rogue 5.4.4:
 * Copyright (C) 1980-1983, 1985, 1999 Michael Toy, Ken Arnold and Glenn Wichman
 * All rights reserved.
 * Portions Copyright (C) 1999, 2000, 2005 Nicholas J. Kisseberth,
 * (C) 1994 David Burren, (C) 2018 Fio Cattaneo.
 *
 * See the file LICENSE.TXT for full copyright and licensing information.
 *
 * The game rules follow the original C source closely. The original drew on a
 * curses terminal and read keys in a blocking loop; here the "terminal" is a
 * character grid drawn on a canvas, and every place that waited for a key is an
 * async function that awaits the next key (or tap).
 */
'use strict';

// ── Constants ────────────────────────────────────────────────────────────────
const MAXROOMS = 9, MAXOBJ = 9, MAXPACK = 23, MAXTRAPS = 10, AMULETLEVEL = 26;
const NUMTHINGS = 7, MAXPASS = 13, NUMLINES = 24, NUMCOLS = 80, BORE_LEVEL = 50;

const PASSAGE = '#', DOOR = '+', FLOOR = '.', PLAYER = '@', TRAP = '^', STAIRS = '%';
const GOLD = '*', POTION = '!', SCROLL = '?', MAGIC = '$', FOOD = ':', WEAPON = ')';
const ARMOR = ']', AMULET = ',', RING = '=', STICK = '/';
const CALLABLE = -1, R_OR_S = -2;

const HEALTIME = 30, HUHDURATION = 20, SEEDURATION = 850, HUNGERTIME = 1300;
const MORETIME = 150, STOMACHSIZE = 2000, STARVETIME = 850, ESCAPE = '\x1b';
const LEFT = 0, RIGHT = 1, BOLT_LENGTH = 6, LAMPDIST = 3;
const BEARTIME = () => spread(3), SLEEPTIME = () => spread(5);
const WANDERTIME = () => spread(70);
const BEFORE = 1, AFTER = 2;          // daemon timing (spread(1)/spread(2) in C are just 1 and 2)

const VS_POISON = 0, VS_PARALYZATION = 0, VS_DEATH = 0, VS_BREATH = 2, VS_MAGIC = 3;

// room flags
const ISDARK = 1, ISGONE = 2, ISMAZE = 4;
// object flags
const ISCURSED = 1, ISKNOW = 2, ISMISL = 4, ISMANY = 8, ISPROT = 0o40;
// creature flags
const CANHUH = 0o1, CANSEE = 0o2, ISBLIND = 0o4, ISCANC = 0o10, ISLEVIT = 0o10,
  ISFOUND = 0o20, ISGREED = 0o40, ISHASTE = 0o100, ISTARGET = 0o200, ISHELD = 0o400,
  ISHUH = 0o1000, ISINVIS = 0o2000, ISMEAN = 0o4000, ISHALU = 0o4000, ISREGEN = 0o10000,
  ISRUN = 0o20000, SEEMONST = 0o40000, ISFLY = 0o40000, ISSLOW = 0o100000;
// map flags
const F_PASS = 0x80, F_SEEN = 0x40, F_DROPPED = 0x20, F_LOCKED = 0x20, F_REAL = 0x10,
  F_PNUM = 0x0f, F_TMASK = 0x07;
// traps
const T_DOOR = 0, T_ARROW = 1, T_SLEEP = 2, T_BEAR = 3, T_TELEP = 4, T_DART = 5, T_RUST = 6,
  T_MYST = 7, NTRAPS = 8;
// potions
const P_CONFUSE = 0, P_LSD = 1, P_POISON = 2, P_STRENGTH = 3, P_SEEINVIS = 4, P_HEALING = 5,
  P_MFIND = 6, P_TFIND = 7, P_RAISE = 8, P_XHEAL = 9, P_HASTE = 10, P_RESTORE = 11,
  P_BLIND = 12, P_LEVIT = 13, MAXPOTIONS = 14;
// scrolls
const S_CONFUSE = 0, S_MAP = 1, S_HOLD = 2, S_SLEEP = 3, S_ARMOR = 4, S_ID_POTION = 5,
  S_ID_SCROLL = 6, S_ID_WEAPON = 7, S_ID_ARMOR = 8, S_ID_R_OR_S = 9, S_SCARE = 10,
  S_FDET = 11, S_TELEP = 12, S_ENCH = 13, S_CREATE = 14, S_REMOVE = 15, S_AGGR = 16,
  S_PROTECT = 17, MAXSCROLLS = 18;
// weapons
const MACE = 0, SWORD = 1, BOW = 2, ARROW = 3, DAGGER = 4, TWOSWORD = 5, DART = 6,
  SHIRAKEN = 7, SPEAR = 8, FLAME = 9, MAXWEAPONS = 9;
// armor
const LEATHER = 0, RING_MAIL = 1, STUDDED_LEATHER = 2, SCALE_MAIL = 3, CHAIN_MAIL = 4,
  SPLINT_MAIL = 5, BANDED_MAIL = 6, PLATE_MAIL = 7, MAXARMORS = 8;
// rings
const R_PROTECT = 0, R_ADDSTR = 1, R_SUSTSTR = 2, R_SEARCH = 3, R_SEEINVIS = 4, R_NOP = 5,
  R_AGGR = 6, R_ADDHIT = 7, R_ADDDAM = 8, R_REGEN = 9, R_DIGEST = 10, R_TELEPORT = 11,
  R_STEALTH = 12, R_SUSTARM = 13, MAXRINGS = 14;
// wands and staffs
const WS_LIGHT = 0, WS_INVIS = 1, WS_ELECT = 2, WS_FIRE = 3, WS_COLD = 4, WS_POLYMORPH = 5,
  WS_MISSILE = 6, WS_HASTE_M = 7, WS_SLOW_M = 8, WS_DRAIN = 9, WS_NOP = 10, WS_TELAWAY = 11,
  WS_TELTO = 12, WS_CANCEL = 13, MAXSTICKS = 14;

// ── Random numbers ───────────────────────────────────────────────────────────
const rnd = range => range <= 0 ? 0 : Math.floor(Math.random() * range);
function roll(number, sides) { let t = 0; while (number-- > 0) t += rnd(sides) + 1; return t; }
const idiv = (a, b) => Math.trunc(a / b);             // C integer division
const spread = nm => nm - idiv(nm, 20) + rnd(idiv(nm, 10));
const sign = n => n < 0 ? -1 : n > 0 ? 1 : 0;
const isupper = c => typeof c === 'string' && c.length === 1 && c >= 'A' && c <= 'Z';
const ce = (a, b) => a.x === b.x && a.y === b.y;
const dist = (y1, x1, y2, x2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
const dist_cp = (a, b) => dist(a.y, a.x, b.y, b.x);
const vowelstr = s => 'aeiouAEIOU'.includes(s[0]) ? 'n' : '';

// ── Data tables (from extern.c / init.c / weapons.c) ─────────────────────────
const e_levels = [10, 20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 13000, 26000, 50000,
  100000, 200000, 400000, 800000, 2000000, 4000000, 8000000, 0];
const a_class = [8, 7, 7, 6, 5, 4, 4, 3];
const tr_name = ['a trapdoor', 'an arrow trap', 'a sleeping gas trap', 'a beartrap',
  'a teleport trap', 'a poison dart trap', 'a rust trap', 'a mysterious trap'];

const XX = 10, ___ = 1;
const monsters = [
  ['aquator', 0, ISMEAN, [XX, 20, 5, 2, ___, '0x0/0x0']],
  ['bat', 0, ISFLY, [XX, 1, 1, 3, ___, '1x2']],
  ['centaur', 15, 0, [XX, 17, 4, 4, ___, '1x2/1x5/1x5']],
  ['dragon', 100, ISMEAN, [XX, 5000, 10, -1, ___, '1x8/1x8/3x10']],
  ['emu', 0, ISMEAN, [XX, 2, 1, 7, ___, '1x2']],
  ['venus flytrap', 0, ISMEAN, [XX, 80, 8, 3, ___, '000x0']],
  ['griffin', 20, ISMEAN | ISFLY | ISREGEN, [XX, 2000, 13, 2, ___, '4x3/3x5']],
  ['hobgoblin', 0, ISMEAN, [XX, 3, 1, 5, ___, '1x8']],
  ['ice monster', 0, 0, [XX, 5, 1, 9, ___, '0x0']],
  ['jabberwock', 70, 0, [XX, 3000, 15, 6, ___, '2x12/2x4']],
  ['kestrel', 0, ISMEAN | ISFLY, [XX, 1, 1, 7, ___, '1x4']],
  ['leprechaun', 0, 0, [XX, 10, 3, 8, ___, '1x1']],
  ['medusa', 40, ISMEAN, [XX, 200, 8, 2, ___, '3x4/3x4/2x5']],
  ['nymph', 100, 0, [XX, 37, 3, 9, ___, '0x0']],
  ['orc', 15, ISGREED, [XX, 5, 1, 6, ___, '1x8']],
  ['phantom', 0, ISINVIS, [XX, 120, 8, 3, ___, '4x4']],
  ['quagga', 0, ISMEAN, [XX, 15, 3, 3, ___, '1x5/1x5']],
  ['rattlesnake', 0, ISMEAN, [XX, 9, 2, 3, ___, '1x6']],
  ['snake', 0, ISMEAN, [XX, 2, 1, 5, ___, '1x3']],
  ['troll', 50, ISREGEN | ISMEAN, [XX, 120, 6, 4, ___, '1x8/1x8/2x6']],
  ['black unicorn', 0, ISMEAN, [XX, 190, 7, -2, ___, '1x9/1x9/2x9']],
  ['vampire', 20, ISREGEN | ISMEAN, [XX, 350, 8, 1, ___, '1x10']],
  ['wraith', 0, 0, [XX, 55, 5, 4, ___, '1x6']],
  ['xeroc', 30, 0, [XX, 100, 7, 7, ___, '4x4']],
  ['yeti', 30, 0, [XX, 50, 4, 6, ___, '1x6/1x6']],
  ['zombie', 0, ISMEAN, [XX, 6, 2, 8, ___, '1x8']],
].map(([name, carry, flags, s]) => ({ name, carry, flags,
  stats: { str: s[0], exp: s[1], lvl: s[2], arm: s[3], hpt: s[4], dmg: s[5], maxhp: 0 } }));
const mon = ch => monsters[ch.charCodeAt(0) - 65];

// obj_info: name, prob, worth, guess, know
const info = rows => rows.map(([name, prob, worth]) => ({ name, prob, worth, guess: null, know: false }));
const things = info([[0, 26], [0, 36], [0, 16], [0, 7], [0, 7], [0, 4], [0, 4]]);
const arm_info = info([['leather armor', 20, 20], ['ring mail', 15, 25], ['studded leather armor', 15, 20],
  ['scale mail', 13, 30], ['chain mail', 12, 75], ['splint mail', 10, 80], ['banded mail', 10, 90],
  ['plate mail', 5, 150]]);
const pot_info = info([['confusion', 7, 5], ['hallucination', 8, 5], ['poison', 8, 5],
  ['gain strength', 13, 150], ['see invisible', 3, 100], ['healing', 13, 130],
  ['monster detection', 6, 130], ['magic detection', 6, 105], ['raise level', 2, 250],
  ['extra healing', 5, 200], ['haste self', 5, 190], ['restore strength', 13, 130],
  ['blindness', 5, 5], ['levitation', 6, 75]]);
const ring_info = info([['protection', 9, 400], ['add strength', 9, 400], ['sustain strength', 5, 280],
  ['searching', 10, 420], ['see invisible', 10, 310], ['adornment', 1, 10],
  ['aggravate monster', 10, 10], ['dexterity', 8, 440], ['increase damage', 8, 400],
  ['regeneration', 4, 460], ['slow digestion', 9, 240], ['teleportation', 5, 30],
  ['stealth', 7, 470], ['maintain armor', 5, 380]]);
const scr_info = info([['monster confusion', 7, 140], ['magic mapping', 4, 150], ['hold monster', 2, 180],
  ['sleep', 3, 5], ['enchant armor', 7, 160], ['identify potion', 10, 80], ['identify scroll', 10, 80],
  ['identify weapon', 6, 80], ['identify armor', 7, 100], ['identify ring, wand or staff', 10, 115],
  ['scare monster', 3, 200], ['food detection', 2, 60], ['teleportation', 5, 165],
  ['enchant weapon', 8, 150], ['create monster', 4, 75], ['remove curse', 7, 105],
  ['aggravate monsters', 3, 20], ['protect armor', 2, 250]]);
const weap_info = info([['mace', 11, 8], ['long sword', 11, 15], ['short bow', 12, 15], ['arrow', 12, 1],
  ['dagger', 8, 3], ['two handed sword', 10, 75], ['dart', 12, 2], ['shuriken', 12, 5],
  ['spear', 12, 5], [null, 0, 0]]);
const ws_info = info([['light', 12, 250], ['invisibility', 6, 5], ['lightning', 3, 330], ['fire', 3, 330],
  ['cold', 3, 330], ['polymorph', 15, 310], ['magic missile', 10, 170], ['haste monster', 10, 5],
  ['slow monster', 11, 350], ['drain life', 9, 300], ['nothing', 1, 5], ['teleport away', 6, 340],
  ['teleport to', 6, 50], ['cancellation', 5, 280]]);
const ALL_INFO = { things, arm_info, pot_info, ring_info, scr_info, weap_info, ws_info };

const init_dam = [   // damage wielded, damage thrown, launcher, flags
  ['2x4', '1x3', -1, 0], ['3x4', '1x2', -1, 0], ['1x1', '1x1', -1, 0],
  ['1x1', '2x3', BOW, ISMANY | ISMISL], ['1x6', '1x4', -1, ISMISL], ['4x4', '1x2', -1, 0],
  ['1x1', '1x3', -1, ISMANY | ISMISL], ['1x2', '2x4', -1, ISMANY | ISMISL], ['2x3', '1x6', -1, ISMISL]];

const rainbow = ['amber', 'aquamarine', 'black', 'blue', 'brown', 'clear', 'crimson', 'cyan', 'ecru',
  'gold', 'green', 'grey', 'magenta', 'orange', 'pink', 'plaid', 'purple', 'red', 'silver', 'tan',
  'tangerine', 'topaz', 'turquoise', 'vermilion', 'violet', 'white', 'yellow'];
const sylls = ('a ab ag aks ala an app arg arze ash bek bie bit bjor blu bot bu byt comp con cos cre dalf ' +
  'dan den do e eep el eng er ere erk esh evs fa fid fri fu gan gar glen gop gre ha hyd i ing ip ish it ' +
  'ite iv jo kho kli klis la lech mar me mi mic mik mon mung mur nej nelg nep ner nes nes nih nin o od ' +
  'ood org orn ox oxy pay ple plu po pot prok re rea rhov ri ro rog rok rol sa san sat sef seh shu ski ' +
  'sna sne snik sno so sol sri sta sun ta tab tem ther ti tox trol tue turs u ulk um un uni ur val viv ' +
  'vly vom wah wed werg wex whon wun xo y yot yu zant zeb zim zok zon zum').split(' ');
const stones = [['agate', 25], ['alexandrite', 40], ['amethyst', 50], ['carnelian', 40], ['diamond', 300],
  ['emerald', 300], ['germanium', 225], ['granite', 5], ['garnet', 50], ['jade', 150], ['kryptonite', 300],
  ['lapis lazuli', 50], ['moonstone', 50], ['obsidian', 15], ['onyx', 60], ['opal', 200], ['pearl', 220],
  ['peridot', 63], ['ruby', 350], ['sapphire', 285], ['stibotantalite', 200], ['tiger eye', 50],
  ['topaz', 60], ['turquoise', 70], ['taaffeite', 300], ['zircon', 80]];
const wood = ['avocado wood', 'balsa', 'bamboo', 'banyan', 'birch', 'cedar', 'cherry', 'cinnibar', 'cypress',
  'dogwood', 'driftwood', 'ebony', 'elm', 'eucalyptus', 'fall', 'hemlock', 'holly', 'ironwood',
  'kukui wood', 'mahogany', 'manzanita', 'maple', 'oaken', 'persimmon wood', 'pecan', 'pine', 'poplar',
  'redwood', 'rosewood', 'spruce', 'teak', 'walnut', 'zebrawood'];
const metal = ['aluminum', 'beryllium', 'bone', 'brass', 'bronze', 'copper', 'electrum', 'gold', 'iron',
  'lead', 'magnesium', 'mercury', 'nickel', 'pewter', 'platinum', 'steel', 'silver', 'silicon', 'tin',
  'titanium', 'tungsten', 'zinc'];
const lvl_mons = 'KEBSHIROZLCQANYFTWPXUMVGJD';
const wand_mons = 'KEBSH\0ROZ\0CQA\0Y\0TWP\0UMVGJ\0';
const fruit = 'slime-mold';

// ── Game state ───────────────────────────────────────────────────────────────
// Everything a save needs lives in G (see save/load at the bottom).
let G;
function freshState() {
  return {
    level: 1, max_level: 1, purse: 0, food_left: 0, hungry_state: 0, no_food: 0,
    no_command: 0, no_move: 0, count: 0, quiet: 0, vf_hit: 0, between: 0,
    amulet: false, seenstairs: false, ntraps: 0, inpack: 0, group: 2, max_hit: 0,
    player: { pos: { y: 0, x: 0 }, flags: 0, room: null,
      stats: { str: 16, exp: 0, lvl: 1, arm: 10, hpt: 12, dmg: '1x4', maxhp: 12 } },
    max_stats: { str: 16, exp: 0, lvl: 1, arm: 10, hpt: 12, dmg: '1x4', maxhp: 12 },
    pack: [], pack_used: new Array(26).fill(false),
    cur_armor: null, cur_weapon: null, cur_ring: [null, null],
    lvl_obj: [], mlist: [],
    places: Array.from({ length: NUMLINES * NUMCOLS }, () => ({ ch: ' ', fl: F_REAL, mon: null })),
    rooms: Array.from({ length: MAXROOMS }, newRoom),
    passages: Array.from({ length: MAXPASS }, () => Object.assign(newRoom(), { flags: ISGONE | ISDARK })),
    stairs: { y: 0, x: 0 },
    p_colors: [], s_names: [], r_stones: [], ws_made: [], ws_type: [],
    info: null, d_list: [],
    last_comm: '', last_dir: '', l_last_comm: '', l_last_dir: '', last_pick: null, l_last_pick: null,
    last_delt: { y: 0, x: 0 }, oldpos: { y: 0, x: 0 }, oldrp: null,
    whoami: 'Rogue', turns: 0, ended: false,
  };
}
function newRoom() {
  return { pos: { x: 0, y: 0 }, max: { x: 0, y: 0 }, gold: { x: 0, y: 0 }, goldval: 0, flags: 0, nexits: 0, exit: [] };
}
// shorthands the original had as macros
const P = (y, x) => G.places[y * NUMCOLS + x];
const chat = (y, x) => P(y, x).ch;
const flat = (y, x) => P(y, x).fl;
const moat = (y, x) => P(y, x).mon;
const winat = (y, x) => { const m = moat(y, x); return m ? m.disguise : chat(y, x); };
const on = (t, f) => (t.flags & f) !== 0;
const ISRING = (h, r) => G.cur_ring[h] !== null && G.cur_ring[h].which === r;
const ISWEARING = r => ISRING(LEFT, r) || ISRING(RIGHT, r);
const ISMULT = t => t === POTION || t === SCROLL || t === FOOD;
const GOLDCALC = () => rnd(50 + 10 * G.level) + 2;
let hero, pstats, player;   // aliases into G, refreshed by bindState()
function bindState() { player = G.player; hero = player.pos; pstats = player.stats; }
const proom = () => player.room;

// transient (not saved) flags from extern.c
let after = false, again = false, running = false, runch = '', door_stop = false, firstmove = false,
  to_death = false, kamikaze = false, has_hit = false, move_on = false, take = '', delta = { y: 0, x: 0 },
  dir_ch = '', playing = true, stat_msg = false, n_objs = 0;
const terse = false, jump = false, see_floor = true, passgo = false, inv_describe = true;

// ── The "terminal": a character grid the UI draws ───────────────────────────
// scr holds what is on screen, so the ported code can read it back the way the
// original used curses' inch().
const scr = Array.from({ length: NUMLINES }, () => new Array(NUMCOLS).fill(' '));
const sout = Array.from({ length: NUMLINES }, () => new Array(NUMCOLS).fill(false));   // standout
let cury = 0, curx = 0, standing = false;
function move(y, x) { cury = y; curx = x; }
function addch(ch) {
  if (cury >= 0 && cury < NUMLINES && curx >= 0 && curx < NUMCOLS) { scr[cury][curx] = ch; sout[cury][curx] = standing; }
  curx++;
}
function mvaddch(y, x, ch) { move(y, x); addch(ch); }
const inch = () => (cury >= 0 && cury < NUMLINES && curx >= 0 && curx < NUMCOLS) ? scr[cury][curx] : ' ';
const mvinch = (y, x) => { move(y, x); return inch(); };
const standout = () => { standing = true; }, standend = () => { standing = false; };
function clear() { for (let y = 0; y < NUMLINES; y++) { scr[y].fill(' '); sout[y].fill(false); } }

// ── Messages ─────────────────────────────────────────────────────────────────
// Instead of --More-- prompts, every message goes into a log; the bar shows the
// ones since your last command.
let msgbuf = '', newMsgs = [], msgLog = [], huh = '';
function addmsg(s) { msgbuf += s; }
function endmsg() {
  if (!msgbuf) return;
  let s = msgbuf;
  if (s[0] >= 'a' && s[0] <= 'z' && s[1] !== ')') s = s[0].toUpperCase() + s.slice(1);
  newMsgs.push(s); msgLog.push(s); if (msgLog.length > 200) msgLog.shift();
  huh = s; msgbuf = '';
  UI.messages();
}
function msg(s) {
  if (s === '') { msgbuf = ''; return; }
  addmsg(s); endmsg();
}
function clearMsgs() { newMsgs = []; UI.messages(); }

// ── Daemons and fuses (daemon.c) ─────────────────────────────────────────────
// Timed effects, stored by function name so they can be saved.
const DAEMON = -1;
function start_daemon(fn, arg, type) { G.d_list.push({ type, fn, arg, time: DAEMON }); }
function kill_daemon(fn) { const i = G.d_list.findIndex(d => d.fn === fn); if (i >= 0) G.d_list.splice(i, 1); }
const extinguish = kill_daemon;
function fuse(fn, arg, time, type) { G.d_list.push({ type, fn, arg, time }); }
function lengthen(fn, xtime) { const d = G.d_list.find(d => d.fn === fn); if (d) d.time += xtime; }
function do_daemons(flag) { for (const d of G.d_list.slice()) if (d.type === flag && d.time === DAEMON) DAEMONS[d.fn](d.arg); }
function do_fuses(flag) {
  for (const d of G.d_list.slice())
    if (d.type === flag && d.time > 0 && --d.time === 0) {
      const i = G.d_list.indexOf(d); if (i >= 0) G.d_list.splice(i, 1);
      DAEMONS[d.fn](d.arg);
    }
}

// ── Starting a game (init.c) ─────────────────────────────────────────────────
function new_item() {
  return { type: '', pos: { y: 0, x: 0 }, launch: -1, packch: '', damage: '0x0', hurldmg: '0x0',
    count: 1, which: 0, hplus: 0, dplus: 0, arm: 0, flags: 0, group: 0, label: null };
}
function init_player() {
  G.player.stats = Object.assign({}, G.max_stats); bindState();
  G.food_left = HUNGERTIME;
  let obj = new_item(); obj.type = FOOD; obj.count = 1; add_pack(obj, true);
  obj = new_item(); obj.type = ARMOR; obj.which = RING_MAIL; obj.arm = a_class[RING_MAIL] - 1;
  obj.flags |= ISKNOW; obj.count = 1; G.cur_armor = obj; add_pack(obj, true);
  obj = new_item(); init_weapon(obj, MACE); obj.hplus = 1; obj.dplus = 1; obj.flags |= ISKNOW;
  add_pack(obj, true); G.cur_weapon = obj;
  obj = new_item(); init_weapon(obj, BOW); obj.hplus = 1; obj.flags |= ISKNOW; add_pack(obj, true);
  obj = new_item(); init_weapon(obj, ARROW); obj.count = rnd(15) + 25; obj.flags |= ISKNOW; add_pack(obj, true);
}
function pickUnique(list, n) {
  const used = new Set(), out = [];
  for (let i = 0; i < n; i++) { let j; do j = rnd(list.length); while (used.has(j)); used.add(j); out.push(j); }
  return out;
}
function init_colors() { G.p_colors = pickUnique(rainbow, MAXPOTIONS).map(j => rainbow[j]); }
function init_names() {
  for (let i = 0; i < MAXSCROLLS; i++) {
    let s = '';
    for (let nwords = rnd(3) + 2; nwords > 0; nwords--) {
      for (let nsyl = rnd(3) + 1; nsyl > 0; nsyl--) {
        const sp = sylls[rnd(sylls.length)];
        if (s.length + sp.length > 40) break;
        s += sp;
      }
      s += ' ';
    }
    G.s_names[i] = s.trimEnd();
  }
}
function init_stones() {
  pickUnique(stones, MAXRINGS).forEach((j, i) => { G.r_stones[i] = stones[j][0]; G.info.ring_info[i].worth += stones[j][1]; });
}
function init_materials() {
  const mused = new Set(), wused = new Set();
  for (let i = 0; i < MAXSTICKS; i++) {
    for (;;) {
      if (rnd(2) === 0) { const j = rnd(metal.length); if (!mused.has(j)) { mused.add(j); G.ws_type[i] = 'wand'; G.ws_made[i] = metal[j]; break; } }
      else { const j = rnd(wood.length); if (!wused.has(j)) { wused.add(j); G.ws_type[i] = 'staff'; G.ws_made[i] = wood[j]; break; } }
    }
  }
}
function init_probs() {
  // each game gets its own copy of the item tables (guesses, "known", ring worth change)
  G.info = JSON.parse(JSON.stringify(ALL_INFO));
  for (const k in G.info) { const t = G.info[k]; for (let i = 1; i < t.length; i++) t[i].prob += t[i - 1].prob; }
}
const I = () => G.info;
function pick_one(table, nitems) {
  const i = rnd(100);
  for (let k = 0; k < nitems; k++) if (i < table[k].prob) return k;
  return 0;
}

// ── Rooms (rooms.c) ──────────────────────────────────────────────────────────
function do_rooms() {
  const bszex = idiv(NUMCOLS, 3), bszey = idiv(NUMLINES, 3);
  for (const rp of G.rooms) { rp.goldval = 0; rp.nexits = 0; rp.exit = []; rp.flags = 0; }
  const left_out = rnd(4);
  for (let i = 0; i < left_out; i++) G.rooms[rnd_room()].flags |= ISGONE;
  for (let i = 0; i < MAXROOMS; i++) {
    const rp = G.rooms[i];
    const top = { x: (i % 3) * bszex + 1, y: idiv(i, 3) * bszey };
    if (rp.flags & ISGONE) {
      do {
        rp.pos.x = top.x + rnd(bszex - 2) + 1; rp.pos.y = top.y + rnd(bszey - 2) + 1;
        rp.max.x = -NUMCOLS; rp.max.y = -NUMLINES;
      } while (!(rp.pos.y > 0 && rp.pos.y < NUMLINES - 1));
      continue;
    }
    if (rnd(10) < G.level - 1) { rp.flags |= ISDARK; if (rnd(15) === 0) rp.flags = ISMAZE; }
    if (rp.flags & ISMAZE) {
      rp.max.x = bszex - 1; rp.max.y = bszey - 1;
      if ((rp.pos.x = top.x) === 1) rp.pos.x = 0;
      if ((rp.pos.y = top.y) === 0) { rp.pos.y++; rp.max.y--; }
    } else {
      do {
        rp.max.x = rnd(bszex - 4) + 4; rp.max.y = rnd(bszey - 4) + 4;
        rp.pos.x = top.x + rnd(bszex - rp.max.x); rp.pos.y = top.y + rnd(bszey - rp.max.y);
      } while (rp.pos.y === 0);
    }
    draw_room(rp);
    if (rnd(2) === 0 && (!G.amulet || G.level >= G.max_level)) {
      const gold = new_item();
      gold.arm = rp.goldval = GOLDCALC();
      find_floor(rp, rp.gold, 0, false);
      gold.pos = { y: rp.gold.y, x: rp.gold.x };
      P(rp.gold.y, rp.gold.x).ch = GOLD;
      gold.flags = ISMANY; gold.group = 1; gold.type = GOLD;
      G.lvl_obj.push(gold);
    }
    if (rnd(100) < (rp.goldval > 0 ? 80 : 25)) {
      const tp = {}, mp = { y: 0, x: 0 };
      find_floor(rp, mp, 0, true);
      new_monster(tp, randmonster(false), mp);
      give_pack(tp);
    }
  }
}
function draw_room(rp) {
  if (rp.flags & ISMAZE) { do_maze(rp); return; }
  for (let y = rp.pos.y + 1; y <= rp.max.y + rp.pos.y - 1; y++) { P(y, rp.pos.x).ch = '|'; P(y, rp.pos.x + rp.max.x - 1).ch = '|'; }
  for (let x = rp.pos.x; x <= rp.pos.x + rp.max.x - 1; x++) { P(rp.pos.y, x).ch = '-'; P(rp.pos.y + rp.max.y - 1, x).ch = '-'; }
  for (let y = rp.pos.y + 1; y < rp.pos.y + rp.max.y - 1; y++)
    for (let x = rp.pos.x + 1; x < rp.pos.x + rp.max.x - 1; x++) P(y, x).ch = FLOOR;
}
let Maxy, Maxx, Starty, Startx;
function do_maze(rp) {
  Maxy = rp.max.y; Maxx = rp.max.x; Starty = rp.pos.y; Startx = rp.pos.x;
  const starty = idiv(rnd(rp.max.y), 2) * 2, startx = idiv(rnd(rp.max.x), 2) * 2;
  putpass({ y: starty + Starty, x: startx + Startx });
  dig(starty, startx);
}
function dig(y, x) {
  const del = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  for (;;) {
    let cnt = 0, nexty = 0, nextx = 0;
    for (const [dy, dx] of del) {
      const newy = y + dy, newx = x + dx;
      if (newy < 0 || newy > Maxy || newx < 0 || newx > Maxx) continue;
      if (flat(newy + Starty, newx + Startx) & F_PASS) continue;
      if (rnd(++cnt) === 0) { nexty = newy; nextx = newx; }
    }
    if (cnt === 0) return;
    const pos = {};
    if (nexty === y) { pos.y = y + Starty; pos.x = nextx - x < 0 ? nextx + Startx + 1 : nextx + Startx - 1; }
    else { pos.x = x + Startx; pos.y = nexty - y < 0 ? nexty + Starty + 1 : nexty + Starty - 1; }
    putpass(pos);
    putpass({ y: nexty + Starty, x: nextx + Startx });
    dig(nexty, nextx);
  }
}
function rnd_pos(rp, cp) { cp.x = rp.pos.x + rnd(rp.max.x - 2) + 1; cp.y = rp.pos.y + rnd(rp.max.y - 2) + 1; }
function find_floor(rp, cp, limit, monst) {
  const pickroom = rp === null;
  let compchar = pickroom ? 0 : (rp.flags & ISMAZE) ? PASSAGE : FLOOR, cnt = limit;
  for (;;) {
    if (limit && cnt-- === 0) return false;
    if (pickroom) { rp = G.rooms[rnd_room()]; compchar = (rp.flags & ISMAZE) ? PASSAGE : FLOOR; }
    rnd_pos(rp, cp);
    const pp = P(cp.y, cp.x);
    if (monst) { if (pp.mon === null && step_ok(pp.ch)) return true; }
    else if (pp.ch === compchar) return true;
  }
}
function enter_room(cp) {
  const rp = player.room = roomin(cp);
  door_open(rp);
  if (!(rp.flags & ISDARK) && !on(player, ISBLIND))
    for (let y = rp.pos.y; y < rp.max.y + rp.pos.y; y++) {
      move(y, rp.pos.x);
      for (let x = rp.pos.x; x < rp.max.x + rp.pos.x; x++) {
        const tp = moat(y, x), ch = chat(y, x);
        if (tp === null) { if (inch() !== ch) addch(ch); else move(y, x + 1); }
        else {
          tp.oldch = ch;
          if (!see_monst(tp)) { if (on(player, SEEMONST)) { standout(); addch(tp.disguise); standend(); } else addch(ch); }
          else addch(tp.disguise);
        }
      }
    }
}
function leave_room(cp) {
  const rp = proom();
  if (rp.flags & ISMAZE) return;
  const floor = (rp.flags & ISGONE) ? PASSAGE : (!(rp.flags & ISDARK) || on(player, ISBLIND)) ? FLOOR : ' ';
  player.room = G.passages[flat(cp.y, cp.x) & F_PNUM];
  for (let y = rp.pos.y; y < rp.max.y + rp.pos.y; y++)
    for (let x = rp.pos.x; x < rp.max.x + rp.pos.x; x++) {
      move(y, x);
      const ch = inch();
      if (ch === FLOOR) { if (floor === ' ') addch(' '); }
      else if (isupper(ch)) {
        if (on(player, SEEMONST)) { standout(); addch(ch); standend(); }
        else addch(chat(y, x) === DOOR ? DOOR : floor);
      }
    }
  door_open(rp);
}

// ── Passages (passages.c) ────────────────────────────────────────────────────
const RCONN = [[0,1,0,1,0,0,0,0,0],[1,0,1,0,1,0,0,0,0],[0,1,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0,0],
  [0,1,0,1,0,1,0,1,0],[0,0,1,0,1,0,0,0,1],[0,0,0,1,0,0,0,1,0],[0,0,0,0,1,0,1,0,1],[0,0,0,0,0,1,0,1,0]];
function do_passages() {
  const rdes = RCONN.map(conn => ({ conn, isconn: new Array(MAXROOMS).fill(false), ingraph: false }));
  let roomcount = 1, r1 = rdes[rnd(MAXROOMS)], r2 = null;
  r1.ingraph = true;
  do {
    let j = 0;
    for (let i = 0; i < MAXROOMS; i++) if (r1.conn[i] && !rdes[i].ingraph && rnd(++j) === 0) r2 = rdes[i];
    if (j === 0) { do r1 = rdes[rnd(MAXROOMS)]; while (!r1.ingraph); }
    else {
      r2.ingraph = true;
      const a = rdes.indexOf(r1), b = rdes.indexOf(r2);
      conn(a, b); r1.isconn[b] = true; r2.isconn[a] = true; roomcount++;
    }
  } while (roomcount < MAXROOMS);
  for (roomcount = rnd(5); roomcount > 0; roomcount--) {
    r1 = rdes[rnd(MAXROOMS)];
    let j = 0;
    for (let i = 0; i < MAXROOMS; i++) if (r1.conn[i] && !r1.isconn[i] && rnd(++j) === 0) r2 = rdes[i];
    if (j !== 0) {
      const a = rdes.indexOf(r1), b = rdes.indexOf(r2);
      conn(a, b); r1.isconn[b] = true; r2.isconn[a] = true;
    }
  }
  passnum();
}
function conn(r1, r2) {
  let rm, direc;
  if (r1 < r2) { rm = r1; direc = r1 + 1 === r2 ? 'r' : 'd'; }
  else { rm = r2; direc = r2 + 1 === r1 ? 'r' : 'd'; }
  const rpf = G.rooms[rm];
  let rpt, del, spos, epos, distance, turn_delta, turn_distance;
  if (direc === 'd') {
    rpt = G.rooms[rm + 3]; del = { x: 0, y: 1 };
    spos = { x: rpf.pos.x, y: rpf.pos.y }; epos = { x: rpt.pos.x, y: rpt.pos.y };
    if (!(rpf.flags & ISGONE))
      do { spos.x = rpf.pos.x + rnd(rpf.max.x - 2) + 1; spos.y = rpf.pos.y + rpf.max.y - 1; }
      while ((rpf.flags & ISMAZE) && !(flat(spos.y, spos.x) & F_PASS));
    if (!(rpt.flags & ISGONE))
      do epos.x = rpt.pos.x + rnd(rpt.max.x - 2) + 1;
      while ((rpt.flags & ISMAZE) && !(flat(epos.y, epos.x) & F_PASS));
    distance = Math.abs(spos.y - epos.y) - 1;
    turn_delta = { y: 0, x: spos.x < epos.x ? 1 : -1 };
    turn_distance = Math.abs(spos.x - epos.x);
  } else {
    rpt = G.rooms[rm + 1]; del = { x: 1, y: 0 };
    spos = { x: rpf.pos.x, y: rpf.pos.y }; epos = { x: rpt.pos.x, y: rpt.pos.y };
    if (!(rpf.flags & ISGONE))
      do { spos.x = rpf.pos.x + rpf.max.x - 1; spos.y = rpf.pos.y + rnd(rpf.max.y - 2) + 1; }
      while ((rpf.flags & ISMAZE) && !(flat(spos.y, spos.x) & F_PASS));
    if (!(rpt.flags & ISGONE))
      do epos.y = rpt.pos.y + rnd(rpt.max.y - 2) + 1;
      while ((rpt.flags & ISMAZE) && !(flat(epos.y, epos.x) & F_PASS));
    distance = Math.abs(spos.x - epos.x) - 1;
    turn_delta = { y: spos.y < epos.y ? 1 : -1, x: 0 };
    turn_distance = Math.abs(spos.y - epos.y);
  }
  const turn_spot = rnd(distance - 1) + 1;
  if (!(rpf.flags & ISGONE)) door(rpf, spos); else putpass(spos);
  if (!(rpt.flags & ISGONE)) door(rpt, epos); else putpass(epos);
  const curr = { x: spos.x, y: spos.y };
  while (distance > 0) {
    curr.x += del.x; curr.y += del.y;
    if (distance === turn_spot)
      while (turn_distance--) { putpass(curr); curr.x += turn_delta.x; curr.y += turn_delta.y; }
    putpass(curr);
    distance--;
  }
}
function putpass(cp) {
  const pp = P(cp.y, cp.x);
  pp.fl |= F_PASS;
  if (rnd(10) + 1 < G.level && rnd(40) === 0) pp.fl &= ~F_REAL;
  else pp.ch = PASSAGE;
}
function door(rm, cp) {
  rm.exit[rm.nexits++] = { y: cp.y, x: cp.x };
  if (rm.flags & ISMAZE) return;
  const pp = P(cp.y, cp.x);
  if (rnd(10) + 1 < G.level && rnd(5) === 0) {
    pp.ch = (cp.y === rm.pos.y || cp.y === rm.pos.y + rm.max.y - 1) ? '-' : '|';
    pp.fl &= ~F_REAL;
  } else pp.ch = DOOR;
}
let pnum = 0, newpnum = false;
function passnum() {
  pnum = 0; newpnum = false;
  for (const rp of G.passages) { rp.nexits = 0; rp.exit = []; }
  for (const rp of G.rooms) for (let i = 0; i < rp.nexits; i++) { newpnum = true; numpass(rp.exit[i].y, rp.exit[i].x); }
}
function numpass(y, x) {
  if (x >= NUMCOLS || x < 0 || y >= NUMLINES || y <= 0) return;
  const pp = P(y, x);
  if (pp.fl & F_PNUM) return;
  if (newpnum) { pnum++; newpnum = false; }
  const ch = pp.ch;
  if (ch === DOOR || (!(pp.fl & F_REAL) && (ch === '|' || ch === '-'))) {
    const rp = G.passages[pnum];
    rp.exit[rp.nexits++] = { y, x };
  } else if (!(pp.fl & F_PASS)) return;
  pp.fl |= pnum;
  numpass(y + 1, x); numpass(y - 1, x); numpass(y, x + 1); numpass(y, x - 1);
}

// ── A new level (new_level.c) ────────────────────────────────────────────────
function new_level() {
  player.flags &= ~ISHELD;
  if (G.level > G.max_level) G.max_level = G.level;
  for (const pp of G.places) { pp.ch = ' '; pp.fl = F_REAL; pp.mon = null; }
  clear();
  G.mlist = []; G.lvl_obj = [];
  do_rooms();
  do_passages();
  G.no_food++;
  put_things();
  if (rnd(10) < G.level) {
    G.ntraps = Math.min(MAXTRAPS, rnd(idiv(G.level, 4)) + 1);
    for (let i = G.ntraps; i > 0; i--) {
      do find_floor(null, G.stairs, 0, false); while (chat(G.stairs.y, G.stairs.x) !== FLOOR);
      const pp = P(G.stairs.y, G.stairs.x);
      pp.fl &= ~F_REAL; pp.fl |= rnd(NTRAPS);
    }
  }
  find_floor(null, G.stairs, 0, false);
  P(G.stairs.y, G.stairs.x).ch = STAIRS;
  G.seenstairs = false;
  for (const tp of G.mlist) tp.room = roomin(tp.pos);
  find_floor(null, hero, 0, true);
  enter_room(hero);
  mvaddch(hero.y, hero.x, PLAYER);
  if (on(player, SEEMONST)) turn_see(false);
  if (on(player, ISHALU)) visuals();
}
function rnd_room() { let rm; do rm = rnd(MAXROOMS); while (G.rooms[rm].flags & ISGONE); return rm; }
function put_things() {
  if (G.amulet && G.level < G.max_level) return;
  if (rnd(20) === 0) treas_room();
  for (let i = 0; i < MAXOBJ; i++)
    if (rnd(100) < 36) {
      const obj = new_thing();
      G.lvl_obj.push(obj);
      find_floor(null, obj.pos, 0, false);
      P(obj.pos.y, obj.pos.x).ch = obj.type;
    }
  if (G.level >= AMULETLEVEL && !G.amulet) {
    const obj = new_item();
    G.lvl_obj.push(obj);
    obj.arm = 11; obj.type = AMULET;
    find_floor(null, obj.pos, 0, false);
    P(obj.pos.y, obj.pos.x).ch = AMULET;
  }
}
function treas_room() {
  const MAXTRIES = 10, MAXTREAS = 10, MINTREAS = 2;
  const rp = G.rooms[rnd_room()];
  let spots = Math.min((rp.max.y - 2) * (rp.max.x - 2) - MINTREAS, MAXTREAS - MINTREAS);
  let nm, num_monst = nm = rnd(spots) + MINTREAS;
  const mp = { y: 0, x: 0 };
  while (nm--) {
    find_floor(rp, mp, 2 * MAXTRIES, false);
    const tp = new_thing();
    tp.pos = { y: mp.y, x: mp.x };
    G.lvl_obj.push(tp);
    P(mp.y, mp.x).ch = tp.type;
  }
  if ((nm = rnd(spots) + MINTREAS) < num_monst + 2) nm = num_monst + 2;
  spots = (rp.max.y - 2) * (rp.max.x - 2);
  if (nm > spots) nm = spots;
  G.level++;
  while (nm--) {
    if (find_floor(rp, mp, MAXTRIES, true)) {
      const tp = {};
      new_monster(tp, randmonster(false), { y: mp.y, x: mp.x });
      tp.flags |= ISMEAN;
      give_pack(tp);
    }
  }
  G.level--;
}

// ── Monsters (monsters.c) ────────────────────────────────────────────────────
function randmonster(wander) {
  const mons = wander ? wand_mons : lvl_mons;
  let d;
  do {
    d = G.level + (rnd(10) - 6);
    if (d < 0) d = rnd(5);
    if (d > 25) d = rnd(5) + 21;
  } while (mons[d] === '\0');
  return mons[d];
}
function new_monster(tp, type, cp) {
  const lev_add = Math.max(0, G.level - AMULETLEVEL);
  G.mlist.unshift(tp);
  tp.type = type; tp.disguise = type;
  tp.pos = { y: cp.y, x: cp.x };
  tp.oldch = mvinch(cp.y, cp.x);
  tp.room = roomin(cp);
  P(cp.y, cp.x).mon = tp;
  const mp = mon(type), s = mp.stats;
  tp.stats = { str: s.str, lvl: s.lvl + lev_add, arm: s.arm - lev_add, dmg: s.dmg, exp: 0, hpt: 0, maxhp: 0 };
  tp.stats.maxhp = tp.stats.hpt = roll(tp.stats.lvl, 8);
  tp.stats.exp = s.exp + lev_add * 10 + exp_add(tp);
  tp.flags = mp.flags;
  if (G.level > 29) tp.flags |= ISHASTE;
  tp.turn = true; tp.pack = []; tp.dest = null;
  if (ISWEARING(R_AGGR)) runto(cp);
  if (type === 'X') tp.disguise = rnd_thing();
}
function exp_add(tp) {
  let mod = tp.stats.lvl === 1 ? idiv(tp.stats.maxhp, 8) : idiv(tp.stats.maxhp, 6);
  if (tp.stats.lvl > 9) mod *= 20; else if (tp.stats.lvl > 6) mod *= 4;
  return mod;
}
function wanderer() {
  const tp = {}, cp = { y: 0, x: 0 };
  do find_floor(null, cp, 0, true); while (roomin(cp) === proom());
  new_monster(tp, randmonster(true), cp);
  if (on(player, SEEMONST)) { standout(); addch(on(player, ISHALU) ? String.fromCharCode(rnd(26) + 65) : tp.type); standend(); }
  runto(tp.pos);
}
function wake_monster(y, x) {
  const tp = moat(y, x);
  if (!tp) return null;
  const ch = tp.type;
  if (!on(tp, ISRUN) && rnd(3) !== 0 && on(tp, ISMEAN) && !on(tp, ISHELD) && !ISWEARING(R_STEALTH) && !on(player, ISLEVIT)) {
    tp.dest = hero; tp.flags |= ISRUN;
  }
  if (ch === 'M' && !on(player, ISBLIND) && !on(player, ISHALU) && !on(tp, ISFOUND) && !on(tp, ISCANC) && on(tp, ISRUN)) {
    const rp = proom();
    if ((rp !== null && !(rp.flags & ISDARK)) || dist(y, x, hero.y, hero.x) < LAMPDIST) {
      tp.flags |= ISFOUND;
      if (!save(VS_MAGIC)) {
        if (on(player, ISHUH)) lengthen('unconfuse', spread(HUHDURATION));
        else fuse('unconfuse', 0, spread(HUHDURATION), AFTER);
        player.flags |= ISHUH;
        const mname = set_mname(tp);
        addmsg(mname); if (mname !== 'it') addmsg("'");
        msg('s gaze has confused you');
      }
    }
  }
  if (on(tp, ISGREED) && !on(tp, ISRUN)) {
    tp.flags |= ISRUN;
    tp.dest = proom().goldval ? proom().gold : hero;
  }
  return tp;
}
function give_pack(tp) {
  if (G.level >= G.max_level && rnd(100) < mon(tp.type).carry) tp.pack.push(new_thing());
}
const save_throw = (which, tp) => roll(1, 20) >= 14 + which - idiv(tp.stats.lvl, 2);
function save(which) {
  if (which === VS_MAGIC) {
    if (ISRING(LEFT, R_PROTECT)) which -= G.cur_ring[LEFT].arm;
    if (ISRING(RIGHT, R_PROTECT)) which -= G.cur_ring[RIGHT].arm;
  }
  return save_throw(which, player);
}

// ── Chasing (chase.c) ────────────────────────────────────────────────────────
let ch_ret = { y: 0, x: 0 };
function runners() {
  for (const tp of G.mlist.slice()) {
    if (!G.mlist.includes(tp)) continue;
    if (!on(tp, ISHELD) && on(tp, ISRUN)) {
      const orig = { y: tp.pos.y, x: tp.pos.x }, wastarget = on(tp, ISTARGET);
      if (move_monst(tp) === -1) continue;
      if (on(tp, ISFLY) && dist_cp(hero, tp.pos) >= 3) move_monst(tp);
      if (wastarget && !ce(orig, tp.pos)) { tp.flags &= ~ISTARGET; to_death = false; }
    }
  }
  if (has_hit) { endmsg(); has_hit = false; }
}
function move_monst(tp) {
  if (!on(tp, ISSLOW) || tp.turn) if (do_chase(tp) === -1) return -1;
  if (on(tp, ISHASTE)) if (do_chase(tp) === -1) return -1;
  tp.turn = !tp.turn;
  return 0;
}
function relocate(th, nl) {
  if (!ce(nl, th.pos)) {
    mvaddch(th.pos.y, th.pos.x, th.oldch);
    th.room = roomin(nl);
    set_oldch(th, nl);
    const oroom = th.room;
    P(th.pos.y, th.pos.x).mon = null;
    if (oroom !== th.room) th.dest = find_dest(th);
    th.pos.y = nl.y; th.pos.x = nl.x;
    P(nl.y, nl.x).mon = th;
  }
  move(nl.y, nl.x);
  if (see_monst(th)) addch(th.disguise);
  else if (on(player, SEEMONST)) { standout(); addch(th.type); standend(); }
}
function do_chase(th) {
  let rer = th.room, ree, mindist = 32767, stoprun = false, thisp = { y: 0, x: 0 };
  if (on(th, ISGREED) && rer.goldval === 0) th.dest = hero;
  ree = th.dest === hero ? proom() : roomin(th.dest);
  let isdoor = chat(th.pos.y, th.pos.x) === DOOR;
  for (;;) {
    if (rer !== ree) {
      for (const cp of rer.exit.slice(0, rer.nexits)) {
        const cd = dist_cp(th.dest, cp);
        if (cd < mindist) { thisp = { y: cp.y, x: cp.x }; mindist = cd; }
      }
      if (isdoor) { rer = G.passages[flat(th.pos.y, th.pos.x) & F_PNUM]; isdoor = false; continue; }
    } else {
      thisp = { y: th.dest.y, x: th.dest.x };
      if (th.type === 'D' && (th.pos.y === hero.y || th.pos.x === hero.x || Math.abs(th.pos.y - hero.y) === Math.abs(th.pos.x - hero.x))
        && dist_cp(th.pos, hero) <= BOLT_LENGTH * BOLT_LENGTH && !on(th, ISCANC) && rnd(5) === 0) {
        delta = { y: sign(hero.y - th.pos.y), x: sign(hero.x - th.pos.x) };
        if (has_hit) endmsg();
        fire_bolt(th.pos, delta, 'flame');
        running = false; G.count = 0; G.quiet = 0;
        if (to_death && !on(th, ISTARGET)) { to_death = false; kamikaze = false; }
        return 0;
      }
    }
    break;
  }
  if (!chase(th, thisp)) {
    if (ce(thisp, hero)) return attack(th);
    else if (ce(thisp, th.dest)) {
      for (const obj of G.lvl_obj)
        if (th.dest === obj.pos) {
          G.lvl_obj.splice(G.lvl_obj.indexOf(obj), 1);
          th.pack.push(obj);
          P(obj.pos.y, obj.pos.x).ch = (th.room.flags & ISGONE) ? PASSAGE : FLOOR;
          th.dest = find_dest(th);
          break;
        }
      if (th.type !== 'F') stoprun = true;
    }
  } else if (th.type === 'F') return 0;
  relocate(th, ch_ret);
  if (stoprun && ce(th.pos, th.dest)) th.flags &= ~ISRUN;
  return 0;
}
function set_oldch(tp, cp) {
  if (ce(tp.pos, cp)) return;
  const sch = tp.oldch;
  tp.oldch = mvinch(cp.y, cp.x);
  if (!on(player, ISBLIND)) {
    if ((sch === FLOOR || tp.oldch === FLOOR) && (tp.room.flags & ISDARK)) tp.oldch = ' ';
    else if (dist_cp(cp, hero) <= LAMPDIST && see_floor) tp.oldch = chat(cp.y, cp.x);
  }
}
function see_monst(mp) {
  if (on(player, ISBLIND)) return false;
  if (on(mp, ISINVIS) && !on(player, CANSEE)) return false;
  const y = mp.pos.y, x = mp.pos.x;
  if (dist(y, x, hero.y, hero.x) < LAMPDIST) {
    if (y !== hero.y && x !== hero.x && !step_ok(chat(y, hero.x)) && !step_ok(chat(hero.y, x))) return false;
    return true;
  }
  if (mp.room !== proom()) return false;
  return !(mp.room.flags & ISDARK);
}
function runto(runner) {
  const tp = moat(runner.y, runner.x);
  if (!tp) return;
  tp.flags |= ISRUN; tp.flags &= ~ISHELD;
  tp.dest = find_dest(tp);
}
function chase(tp, ee) {
  const er = tp.pos;
  let curdist, plcnt = 1;
  if ((on(tp, ISHUH) && rnd(5) !== 0) || (tp.type === 'P' && rnd(5) === 0) || (tp.type === 'B' && rnd(2) === 0)) {
    ch_ret = rndmove(tp);
    curdist = dist_cp(ch_ret, ee);
    if (rnd(20) === 0) tp.flags &= ~ISHUH;
  } else {
    curdist = dist_cp(er, ee);
    ch_ret = { y: er.y, x: er.x };
    const ey = Math.min(er.y + 1, NUMLINES - 2), ex = Math.min(er.x + 1, NUMCOLS - 1);
    for (let x = er.x - 1; x <= ex; x++) {
      if (x < 0) continue;
      for (let y = er.y - 1; y <= ey; y++) {
        const tryp = { y, x };
        if (!diag_ok(er, tryp)) continue;
        const ch = winat(y, x);
        if (step_ok(ch)) {
          if (ch === SCROLL) { const obj = find_obj(y, x); if (obj && obj.which === S_SCARE) continue; }
          const m = moat(y, x); if (m && m.type === 'X') continue;
          const thisdist = dist(y, x, ee.y, ee.x);
          if (thisdist < curdist) { plcnt = 1; ch_ret = tryp; curdist = thisdist; }
          else if (thisdist === curdist && rnd(++plcnt) === 0) { ch_ret = tryp; curdist = thisdist; }
        }
      }
    }
  }
  return curdist !== 0 && !ce(ch_ret, hero);
}
function roomin(cp) {
  const fp = flat(cp.y, cp.x);
  if (fp & F_PASS) return G.passages[fp & F_PNUM];
  for (const rp of G.rooms)
    if (cp.x <= rp.pos.x + rp.max.x && rp.pos.x <= cp.x && cp.y <= rp.pos.y + rp.max.y && rp.pos.y <= cp.y) return rp;
  return G.passages[0];   // "in some bizarre place" — shouldn't happen
}
function diag_ok(sp, ep) {
  if (ep.x < 0 || ep.x >= NUMCOLS || ep.y <= 0 || ep.y >= NUMLINES - 1) return false;
  if (ep.x === sp.x || ep.y === sp.y) return true;
  return step_ok(chat(ep.y, sp.x)) && step_ok(chat(sp.y, ep.x));
}
function cansee(y, x) {
  if (on(player, ISBLIND)) return false;
  if (dist(y, x, hero.y, hero.x) < LAMPDIST) {
    if (flat(y, x) & F_PASS)
      if (y !== hero.y && x !== hero.x && !step_ok(chat(y, hero.x)) && !step_ok(chat(hero.y, x))) return false;
    return true;
  }
  const rer = roomin({ y, x });
  return rer === proom() && !(rer.flags & ISDARK);
}
function find_dest(tp) {
  const prob = mon(tp.type).carry;
  if (prob <= 0 || tp.room === proom() || see_monst(tp)) return hero;
  for (const obj of G.lvl_obj) {
    if (obj.type === SCROLL && obj.which === S_SCARE) continue;
    if (roomin(obj.pos) === tp.room && rnd(100) < prob) {
      if (!G.mlist.some(m => m.dest === obj.pos)) return obj.pos;
    }
  }
  return hero;
}

// ── Fighting (fight.c) ───────────────────────────────────────────────────────
const h_names = [' scored an excellent hit on ', ' hit ', ' have injured ', ' swing and hit ',
  ' scored an excellent hit on ', ' hit ', ' has injured ', ' swings and hits '];
const m_names = [' miss', ' swing and miss', ' barely miss', " don't hit",
  ' misses', ' swings and misses', ' barely misses', " doesn't hit"];
const str_plus = [-7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3];
const add_dam = [-7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6];
function fight(mp, weap, thrown) {
  const tp = moat(mp.y, mp.x);
  if (!tp) return false;
  G.count = 0; G.quiet = 0;
  runto(mp);
  if (tp.type === 'X' && tp.disguise !== 'X' && !on(player, ISBLIND)) {
    tp.disguise = 'X';
    if (on(player, ISHALU)) mvaddch(tp.pos.y, tp.pos.x, String.fromCharCode(rnd(26) + 65));
    msg(choose_str("heavy!  That's a nasty critter!", "wait!  That's a xeroc!"));
    if (!thrown) return false;
  }
  const mname = set_mname(tp);
  let did_hit = false;
  has_hit = terse && !to_death;
  if (roll_em(player, tp, weap, thrown)) {
    did_hit = false;
    if (thrown) thunk(weap, mname, terse); else hit(null, mname, terse);
    if (on(player, CANHUH)) {
      did_hit = true;
      tp.flags |= ISHUH; player.flags &= ~CANHUH;
      endmsg(); has_hit = false;
      msg('your hands stop glowing ' + pick_color('red'));
    }
    if (tp.stats.hpt <= 0) killed(tp, true);
    else if (did_hit && !on(player, ISBLIND)) msg(mname + ' appears confused');
    did_hit = true;
  } else if (thrown) bounce(weap, mname, terse);
  else miss(null, mname, terse);
  return did_hit;
}
function attack(mp) {
  running = false; G.count = 0; G.quiet = 0;
  if (to_death && !on(mp, ISTARGET)) { to_death = false; kamikaze = false; }
  if (mp.type === 'X' && mp.disguise !== 'X' && !on(player, ISBLIND)) {
    mp.disguise = 'X';
    if (on(player, ISHALU)) mvaddch(mp.pos.y, mp.pos.x, String.fromCharCode(rnd(26) + 65));
  }
  const mname = set_mname(mp);
  let oldhp = pstats.hpt, gone = false;
  if (roll_em(mp, player, null, false)) {
    if (mp.type !== 'I') { if (has_hit) addmsg('.  '); hit(mname, null, false); }
    else if (has_hit) endmsg();
    has_hit = false;
    if (pstats.hpt <= 0) { death(mp.type); return -1; }
    else if (!kamikaze) {
      oldhp -= pstats.hpt;
      if (oldhp > G.max_hit) G.max_hit = oldhp;
      if (pstats.hpt <= G.max_hit) to_death = false;
    }
    if (!on(mp, ISCANC))
      switch (mp.type) {
        case 'A': rust_armor(G.cur_armor); break;
        case 'I':
          player.flags &= ~ISRUN;
          if (!G.no_command) { addmsg('you are frozen'); if (!terse) addmsg(' by the ' + mname.replace(/^the /, '')); endmsg(); }
          G.no_command += rnd(2) + 2;
          if (G.no_command > BORE_LEVEL) { death('h'); return -1; }
          break;
        case 'R':
          if (!save(VS_POISON)) {
            if (!ISWEARING(R_SUSTSTR)) { chg_str(-1); msg('you feel a bite in your leg and now feel weaker'); }
            else if (!to_death) msg('a bite momentarily weakens you');
          }
          break;
        case 'W': case 'V':
          if (rnd(100) < (mp.type === 'W' ? 15 : 30)) {
            let fewer;
            if (mp.type === 'W') {
              if (pstats.exp === 0) { death('W'); return -1; }
              if (--pstats.lvl === 0) { pstats.exp = 0; pstats.lvl = 1; }
              else pstats.exp = e_levels[pstats.lvl - 1] + 1;
              fewer = roll(1, 10);
            } else fewer = roll(1, 3);
            pstats.hpt -= fewer; pstats.maxhp -= fewer;
            if (pstats.hpt <= 0) pstats.hpt = 1;
            if (pstats.maxhp <= 0) { death(mp.type); return -1; }
            msg('you suddenly feel weaker');
          }
          break;
        case 'F':
          player.flags |= ISHELD;
          mon('F').stats.dmg = (++G.vf_hit) + 'x1';
          if (--pstats.hpt <= 0) { death('F'); return -1; }
          break;
        case 'L': {
          const lastpurse = G.purse;
          G.purse -= GOLDCALC();
          if (!save(VS_MAGIC)) G.purse -= GOLDCALC() + GOLDCALC() + GOLDCALC() + GOLDCALC();
          if (G.purse < 0) G.purse = 0;
          remove_mon(mp.pos, mp, false); gone = true;
          if (G.purse !== lastpurse) msg('your purse feels lighter');
          break;
        }
        case 'N': {
          let steal = null, nobj = 0;
          for (const obj of G.pack)
            if (obj !== G.cur_armor && obj !== G.cur_weapon && obj !== G.cur_ring[LEFT] && obj !== G.cur_ring[RIGHT]
              && is_magic(obj) && rnd(++nobj) === 0) steal = obj;
          if (steal !== null) {
            remove_mon(mp.pos, mp, false); gone = true;
            leave_pack(steal, false, false);
            msg('she stole ' + inv_name(steal, true) + '!');
          }
          break;
        }
      }
  } else if (mp.type !== 'I') {
    if (has_hit) { addmsg('.  '); has_hit = false; }
    if (mp.type === 'F') { pstats.hpt -= G.vf_hit; if (pstats.hpt <= 0) { death(mp.type); return -1; } }
    miss(mname, null, false);
  }
  G.count = 0;
  return gone ? -1 : 0;
}
function set_mname(tp) {
  if (!see_monst(tp) && !on(player, SEEMONST)) return terse ? 'it' : 'something';
  if (on(player, ISHALU)) {
    let ch = mvinch(tp.pos.y, tp.pos.x);
    return 'the ' + monsters[isupper(ch) ? ch.charCodeAt(0) - 65 : rnd(26)].name;
  }
  return 'the ' + mon(tp.type).name;
}
const swing = (at_lvl, op_arm, wplus) => rnd(20) + wplus >= (20 - at_lvl) - op_arm;
function roll_em(thatt, thdef, weap, hurl) {
  const att = thatt.stats, def = thdef.stats;
  let cp, hplus, dplus, did_hit = false;
  if (weap === null) { cp = att.dmg; dplus = 0; hplus = 0; }
  else {
    hplus = weap.hplus; dplus = weap.dplus;
    if (weap === G.cur_weapon) {
      if (ISRING(LEFT, R_ADDDAM)) dplus += G.cur_ring[LEFT].arm;
      else if (ISRING(LEFT, R_ADDHIT)) hplus += G.cur_ring[LEFT].arm;
      if (ISRING(RIGHT, R_ADDDAM)) dplus += G.cur_ring[RIGHT].arm;
      else if (ISRING(RIGHT, R_ADDHIT)) hplus += G.cur_ring[RIGHT].arm;
    }
    cp = weap.damage;
    if (hurl) {
      if ((weap.flags & ISMISL) && G.cur_weapon !== null && G.cur_weapon.which === weap.launch) {
        cp = weap.hurldmg; hplus += G.cur_weapon.hplus; dplus += G.cur_weapon.dplus;
      } else if (weap.launch < 0) cp = weap.hurldmg;
    }
  }
  if (!on(thdef, ISRUN)) hplus += 4;
  let def_arm = def.arm;
  if (thdef === player) {
    if (G.cur_armor !== null) def_arm = G.cur_armor.arm;
    if (ISRING(LEFT, R_PROTECT)) def_arm -= G.cur_ring[LEFT].arm;
    if (ISRING(RIGHT, R_PROTECT)) def_arm -= G.cur_ring[RIGHT].arm;
  }
  const str = Math.max(0, Math.min(31, att.str));
  for (const part of String(cp).split('/')) {
    const m = /^(\d+)x(\d+)/.exec(part);
    if (!m) break;
    const ndice = +m[1], nsides = +m[2];
    if (swing(att.lvl, def_arm, hplus + str_plus[str])) {
      const damage = dplus + roll(ndice, nsides) + add_dam[str];
      def.hpt -= Math.max(0, damage);
      did_hit = true;
    }
  }
  return did_hit;
}
function prname(mname, upper) {
  let s = mname === null ? 'you' : mname;
  if (upper) s = s[0].toUpperCase() + s.slice(1);
  return s;
}
function thunk(weap, mname, noend) {
  if (to_death) return;
  if (weap.type === WEAPON) addmsg('the ' + weap_info[weap.which].name + ' hits ');
  else addmsg('you hit ');
  addmsg(mname);
  if (!noend) endmsg();
}
function hit(er, ee, noend) {
  if (to_death) return;
  addmsg(prname(er, true));
  let i = rnd(4); if (er !== null) i += 4;
  addmsg(h_names[i]);
  addmsg(prname(ee, false));
  if (!noend) endmsg();
}
function miss(er, ee, noend) {
  if (to_death) return;
  addmsg(prname(er, true));
  let i = rnd(4); if (er !== null) i += 4;
  addmsg(m_names[i]);
  addmsg(' ' + prname(ee, false));
  if (!noend) endmsg();
}
function bounce(weap, mname, noend) {
  if (to_death) return;
  if (weap.type === WEAPON) addmsg('the ' + weap_info[weap.which].name + ' misses ');
  else addmsg('you missed ');
  addmsg(mname);
  if (!noend) endmsg();
}
function remove_mon(mp, tp, waskill) {
  for (const obj of tp.pack.slice()) {
    obj.pos = { y: tp.pos.y, x: tp.pos.x };
    if (waskill) fall(obj, false);
  }
  tp.pack = [];
  P(mp.y, mp.x).mon = null;
  mvaddch(mp.y, mp.x, tp.oldch);
  const i = G.mlist.indexOf(tp); if (i >= 0) G.mlist.splice(i, 1);
  if (on(tp, ISTARGET)) { kamikaze = false; to_death = false; }
}
function killed(tp, pr) {
  pstats.exp += tp.stats.exp;
  if (tp.type === 'F') { player.flags &= ~ISHELD; G.vf_hit = 0; mon('F').stats.dmg = '000x0'; }
  else if (tp.type === 'L') {
    const fp = { y: 0, x: 0 };
    if (fallpos(tp.pos, fp) && G.level >= G.max_level) {
      const gold = new_item();
      gold.type = GOLD; gold.arm = GOLDCALC();
      if (save(VS_MAGIC)) gold.arm += GOLDCALC() + GOLDCALC() + GOLDCALC() + GOLDCALC();
      tp.pack.push(gold);
    }
  }
  const mname = set_mname(tp);
  remove_mon(tp.pos, tp, true);
  if (pr) {
    if (has_hit) { addmsg('.  Defeated '); has_hit = false; }
    else addmsg('you have defeated ');
    msg(mname);
  }
  check_level();
}

// ── Moving (move.c) ──────────────────────────────────────────────────────────
function do_run(ch) { running = true; after = false; runch = ch; }
async function do_move(dy, dx) {
  let nh, ch, fl;
  firstmove = false;
  if (G.no_move) { G.no_move--; msg('you are still stuck in the bear trap'); return; }
  if (on(player, ISHUH) && rnd(5) !== 0) {
    nh = rndmove(player);
    if (ce(nh, hero)) { after = false; running = false; to_death = false; return; }
  } else nh = { y: hero.y + dy, x: hero.x + dx };
  for (;;) {
    let bound = nh.x < 0 || nh.x >= NUMCOLS || nh.y <= 0 || nh.y >= NUMLINES - 1;
    if (!bound) {
      if (!diag_ok(hero, nh)) { after = false; running = false; return; }
      if (running && ce(hero, nh)) after = running = false;
      fl = flat(nh.y, nh.x);
      ch = winat(nh.y, nh.x);
      if (!(fl & F_REAL) && ch === FLOOR) {
        if (!on(player, ISLEVIT)) { P(nh.y, nh.x).ch = ch = TRAP; P(nh.y, nh.x).fl |= F_REAL; }
      } else if (on(player, ISHELD) && ch !== 'F') { msg('you are being held'); return; }
    }
    if (bound || ch === ' ' || ch === '|' || ch === '-') {
      if (passgo && running && (proom().flags & ISGONE) && !on(player, ISBLIND)) {
        // (passgo is off, as in the original's default)
      }
      running = false; after = false;
      return;
    }
    break;
  }
  switch (ch) {
    case DOOR:
      running = false;
      if (flat(hero.y, hero.x) & F_PASS) enter_room(nh);
      move_stuff(nh, fl); return;
    case TRAP: {
      const t = be_trapped(nh);
      if (t === T_DOOR || t === T_TELEP) return;
      move_stuff(nh, fl); return;
    }
    case PASSAGE:
      player.room = roomin(hero);
      move_stuff(nh, fl); return;
    case FLOOR:
      if (!(fl & F_REAL)) be_trapped(hero);
      move_stuff(nh, fl); return;
    case STAIRS:
      G.seenstairs = true;
    // fall through
    default:
      running = false;
      if (isupper(ch) || moat(nh.y, nh.x)) fight(nh, G.cur_weapon, false);
      else { if (ch !== STAIRS) take = ch; move_stuff(nh, fl); }
  }
}
function move_stuff(nh, fl) {
  mvaddch(hero.y, hero.x, floor_at());
  if ((fl & F_PASS) && chat(G.oldpos.y, G.oldpos.x) === DOOR) leave_room(nh);
  hero.y = nh.y; hero.x = nh.x;
}
function door_open(rp) {
  if (!(rp.flags & ISGONE))
    for (let y = rp.pos.y; y < rp.pos.y + rp.max.y; y++)
      for (let x = rp.pos.x; x < rp.pos.x + rp.max.x; x++)
        if (isupper(winat(y, x))) wake_monster(y, x);
}
function be_trapped(tc) {
  if (on(player, ISLEVIT)) return T_RUST;
  running = false; G.count = 0;
  const pp = P(tc.y, tc.x);
  pp.ch = TRAP;
  const tr = pp.fl & F_TMASK;
  pp.fl |= F_SEEN;
  switch (tr) {
    case T_DOOR: G.level++; new_level(); msg('you fell into a trap!'); break;
    case T_BEAR: G.no_move += BEARTIME(); msg('you are caught in a bear trap'); break;
    case T_MYST:
      msg(['you are suddenly in a parallel dimension', 'the light in here suddenly seems ' + rainbow[rnd(rainbow.length)],
        'you feel a sting in the side of your neck', 'multi-colored lines swirl around you, then fade',
        'a ' + rainbow[rnd(rainbow.length)] + ' light flashes in your eyes', 'a spike shoots past your ear!',
        rainbow[rnd(rainbow.length)] + ' sparks dance across your armor', 'you suddenly feel very thirsty',
        'you feel time speed up suddenly', 'time now seems to be going slower',
        'your pack turns ' + rainbow[rnd(rainbow.length)] + '!'][rnd(11)]);
      break;
    case T_SLEEP: G.no_command += SLEEPTIME(); player.flags &= ~ISRUN; msg('a strange white mist envelops you and you fall asleep'); break;
    case T_ARROW:
      if (swing(pstats.lvl - 1, pstats.arm, 1)) {
        pstats.hpt -= roll(1, 6);
        if (pstats.hpt <= 0) { msg('an arrow killed you'); death('a'); }
        else msg('oh no! An arrow shot you');
      } else {
        const arrow = new_item(); init_weapon(arrow, ARROW); arrow.count = 1;
        arrow.pos = { y: hero.y, x: hero.x }; fall(arrow, false);
        msg('an arrow shoots past you');
      }
      break;
    case T_TELEP: teleport(); mvaddch(tc.y, tc.x, TRAP); break;
    case T_DART:
      if (!swing(pstats.lvl + 1, pstats.arm, 1)) msg('a small dart whizzes by your ear and vanishes');
      else {
        pstats.hpt -= roll(1, 4);
        if (pstats.hpt <= 0) { msg('a poisoned dart killed you'); death('d'); }
        if (!ISWEARING(R_SUSTSTR) && !save(VS_POISON)) chg_str(-1);
        msg('a small dart just hit you in the shoulder');
      }
      break;
    case T_RUST: msg('a gush of water hits you on the head'); rust_armor(G.cur_armor); break;
  }
  return tr;
}
function rndmove(who) {
  const ret = { y: who.pos.y + rnd(3) - 1, x: who.pos.x + rnd(3) - 1 };
  if (ret.y === who.pos.y && ret.x === who.pos.x) return ret;
  const bad = () => ({ y: who.pos.y, x: who.pos.x });
  if (!diag_ok(who.pos, ret)) return bad();
  const ch = winat(ret.y, ret.x);
  if (!step_ok(ch)) return bad();
  if (ch === SCROLL) { const obj = find_obj(ret.y, ret.x); if (obj && obj.which === S_SCARE) return bad(); }
  return ret;
}
function rust_armor(arm) {
  if (arm === null || arm.type !== ARMOR || arm.which === LEATHER || arm.arm >= 9) return;
  if ((arm.flags & ISPROT) || ISWEARING(R_SUSTARM)) { if (!to_death) msg('the rust vanishes instantly'); }
  else { arm.arm++; msg('your armor appears to be weaker now. Oh my!'); }
}
function step_ok(ch) {
  switch (ch) { case ' ': case '|': case '-': return false; default: return !/^[A-Za-z]$/.test(ch); }
}

// ── Objects (things.c) ───────────────────────────────────────────────────────
function inv_name(obj, drop) {
  const which = obj.which;
  let pb = '';
  switch (obj.type) {
    case POTION: pb = nameit(obj, 'potion', G.p_colors[which], I().pot_info[which], () => ''); break;
    case RING: pb = nameit(obj, 'ring', G.r_stones[which], I().ring_info[which], ring_num); break;
    case STICK: pb = nameit(obj, G.ws_type[which], G.ws_made[which], I().ws_info[which], charge_str); break;
    case SCROLL: {
      pb = obj.count === 1 ? 'A scroll ' : obj.count + ' scrolls ';
      const op = I().scr_info[which];
      if (op.know) pb += 'of ' + op.name;
      else if (op.guess) pb += 'called ' + op.guess;
      else pb += "titled '" + G.s_names[which] + "'";
      break;
    }
    case FOOD:
      if (which === 1) pb = obj.count === 1 ? 'A' + vowelstr(fruit) + ' ' + fruit : obj.count + ' ' + fruit + 's';
      else pb = obj.count === 1 ? 'Some food' : obj.count + ' rations of food';
      break;
    case WEAPON: {
      const sp = weap_info[which].name;
      pb = obj.count > 1 ? obj.count + ' ' : 'A' + vowelstr(sp) + ' ';
      pb += (obj.flags & ISKNOW) ? num(obj.hplus, obj.dplus, WEAPON) + ' ' + sp : sp;
      if (obj.count > 1) pb += 's';
      if (obj.label) pb += ' called ' + obj.label;
      break;
    }
    case ARMOR: {
      const sp = arm_info[which].name;
      pb = (obj.flags & ISKNOW) ? num(a_class[which] - obj.arm, 0, ARMOR) + ' ' + sp + ' [protection ' + (10 - obj.arm) + ']' : sp;
      if (obj.label) pb += ' called ' + obj.label;
      break;
    }
    case AMULET: pb = 'The Amulet of Yendor'; break;
    case GOLD: pb = obj.arm + ' Gold pieces'; break;
  }
  if (inv_describe) {
    if (obj === G.cur_armor) pb += ' (being worn)';
    if (obj === G.cur_weapon) pb += ' (weapon in hand)';
    if (obj === G.cur_ring[LEFT]) pb += ' (on left hand)';
    else if (obj === G.cur_ring[RIGHT]) pb += ' (on right hand)';
  }
  if (drop && pb[0] >= 'A' && pb[0] <= 'Z') pb = pb[0].toLowerCase() + pb.slice(1);
  else if (!drop && pb[0] >= 'a' && pb[0] <= 'z') pb = pb[0].toUpperCase() + pb.slice(1);
  return pb;
}
function nameit(obj, type, which, op, prfunc) {
  if (op.know || op.guess) {
    let s = obj.count === 1 ? 'A ' + type + ' ' : obj.count + ' ' + type + 's ';
    if (op.know) s += 'of ' + op.name + prfunc(obj) + '(' + which + ')';
    else s += 'called ' + op.guess + prfunc(obj) + '(' + which + ')';
    return s;
  }
  return obj.count === 1 ? 'A' + vowelstr(which) + ' ' + which + ' ' + type : obj.count + ' ' + which + ' ' + type + 's';
}
async function drop() {
  const ch = chat(hero.y, hero.x);
  if (ch !== FLOOR && ch !== PASSAGE) { after = false; msg('there is something there already'); return; }
  let obj = await get_item('drop', 0);
  if (obj === null) return;
  if (!dropcheck(obj)) return;
  obj = leave_pack(obj, true, !ISMULT(obj.type));
  G.lvl_obj.push(obj);
  P(hero.y, hero.x).ch = obj.type;
  P(hero.y, hero.x).fl |= F_DROPPED;
  obj.pos = { y: hero.y, x: hero.x };
  if (obj.type === AMULET) G.amulet = false;
  msg('dropped ' + inv_name(obj, true));
}
function dropcheck(obj) {
  if (obj === null) return true;
  if (obj !== G.cur_armor && obj !== G.cur_weapon && obj !== G.cur_ring[LEFT] && obj !== G.cur_ring[RIGHT]) return true;
  if (obj.flags & ISCURSED) { msg("you can't.  It appears to be cursed"); return false; }
  if (obj === G.cur_weapon) G.cur_weapon = null;
  else if (obj === G.cur_armor) { waste_time(); G.cur_armor = null; }
  else {
    G.cur_ring[obj === G.cur_ring[LEFT] ? LEFT : RIGHT] = null;
    if (obj.which === R_ADDSTR) chg_str(-obj.arm);
    else if (obj.which === R_SEEINVIS) { unsee(); extinguish('unsee'); }
  }
  return true;
}
function new_thing() {
  const cur = new_item();
  cur.arm = 11;
  let r;
  switch (G.no_food > 3 ? 2 : pick_one(I().things, NUMTHINGS)) {
    case 0: cur.type = POTION; cur.which = pick_one(I().pot_info, MAXPOTIONS); break;
    case 1: cur.type = SCROLL; cur.which = pick_one(I().scr_info, MAXSCROLLS); break;
    case 2: cur.type = FOOD; G.no_food = 0; cur.which = rnd(10) !== 0 ? 0 : 1; break;
    case 3:
      init_weapon(cur, pick_one(I().weap_info, MAXWEAPONS));
      if ((r = rnd(100)) < 10) { cur.flags |= ISCURSED; cur.hplus -= rnd(3) + 1; }
      else if (r < 15) cur.hplus += rnd(3) + 1;
      break;
    case 4:
      cur.type = ARMOR; cur.which = pick_one(I().arm_info, MAXARMORS); cur.arm = a_class[cur.which];
      if ((r = rnd(100)) < 20) { cur.flags |= ISCURSED; cur.arm += rnd(3) + 1; }
      else if (r < 28) cur.arm -= rnd(3) + 1;
      break;
    case 5:
      cur.type = RING; cur.which = pick_one(I().ring_info, MAXRINGS);
      switch (cur.which) {
        case R_ADDSTR: case R_PROTECT: case R_ADDHIT: case R_ADDDAM:
          if ((cur.arm = rnd(3)) === 0) { cur.arm = -1; cur.flags |= ISCURSED; }
          break;
        case R_AGGR: case R_TELEPORT: cur.flags |= ISCURSED; break;
      }
      break;
    case 6: cur.type = STICK; cur.which = pick_one(I().ws_info, MAXSTICKS); fix_stick(cur); break;
  }
  return cur;
}
const TYPE_INFO = { [POTION]: 'pot_info', [SCROLL]: 'scr_info', [RING]: 'ring_info', [STICK]: 'ws_info' };
function discoveries() {   // the 'D' command, as a list for the UI
  const out = [];
  for (const [t, title] of [[POTION, 'Potions'], [SCROLL, 'Scrolls'], [RING, 'Rings'], [STICK, 'Wands and staffs']]) {
    const tbl = I()[TYPE_INFO[t]], rows = [];
    tbl.forEach((op, which) => { if (op.know || op.guess) rows.push(inv_name({ type: t, which, count: 1, flags: 0 }, false)); });
    out.push([title, rows.length ? rows : ["Haven't discovered anything"]]);
  }
  return out;
}

// ── The pack (pack.c) ────────────────────────────────────────────────────────
function add_pack(obj, silent) {
  let from_floor = false;
  if (obj === null) { obj = find_obj(hero.y, hero.x); if (obj === null) return; from_floor = true; }
  if (obj.type === SCROLL && obj.which === S_SCARE && (obj.flags & ISFOUND)) {
    G.lvl_obj.splice(G.lvl_obj.indexOf(obj), 1);
    mvaddch(hero.y, hero.x, floor_ch());
    P(hero.y, hero.x).ch = (proom().flags & ISGONE) ? PASSAGE : FLOOR;
    msg('the scroll turns to dust as you pick it up');
    return;
  }
  const pack = G.pack;
  if (pack.length === 0) {
    if (from_floor && !pack_room(from_floor, obj)) return;
    if (!from_floor) G.inpack++;
    pack.push(obj); obj.packch = pack_char();
  } else {
    // keep things of the same kind together, and merge stacks (as the linked list did)
    let lp = -1, merged = false;
    for (let i = 0; i < pack.length; i++) {
      let op = pack[i];
      if (op.type !== obj.type) { lp = i; continue; }
      while (op.type === obj.type && op.which !== obj.which) { lp = i; if (i + 1 >= pack.length) break; op = pack[++i]; }
      if (op.type === obj.type && op.which === obj.which) {
        if (ISMULT(op.type)) {
          if (!pack_room(from_floor, obj)) return;
          op.count++; obj = op; merged = true;
        } else if (obj.group) {
          lp = i;
          while (op.type === obj.type && op.which === obj.which && op.group !== obj.group) { lp = i; if (i + 1 >= pack.length) break; op = pack[++i]; }
          if (op.type === obj.type && op.which === obj.which && op.group === obj.group) {
            op.count += obj.count; G.inpack--;
            if (!pack_room(from_floor, obj)) return;
            obj = op; merged = true;
          }
        } else lp = i;
      }
      break;
    }
    if (!merged) {
      if (!pack_room(from_floor, obj)) return;
      obj.packch = pack_char();
      pack.splice(lp + 1, 0, obj);
    }
  }
  obj.flags |= ISFOUND;
  for (const op of G.mlist) if (op.dest === obj.pos) op.dest = hero;
  if (obj.type === AMULET) G.amulet = true;
  if (!silent) { addmsg('you now have '); msg(inv_name(obj, true) + ' (' + obj.packch + ')'); }
}
function pack_room(from_floor, obj) {
  if (++G.inpack > MAXPACK) {
    msg("there's no room in your pack");
    if (from_floor) move_msg(obj);
    G.inpack = MAXPACK;
    return false;
  }
  if (from_floor) {
    G.lvl_obj.splice(G.lvl_obj.indexOf(obj), 1);
    mvaddch(hero.y, hero.x, floor_ch());
    P(hero.y, hero.x).ch = (proom().flags & ISGONE) ? PASSAGE : FLOOR;
  }
  return true;
}
function leave_pack(obj, newobj, all) {
  G.inpack--;
  let nobj = obj;
  if (obj.count > 1 && !all) {
    G.last_pick = obj;
    obj.count--;
    if (obj.group) G.inpack++;
    if (newobj) { nobj = Object.assign({}, obj, { pos: { y: obj.pos.y, x: obj.pos.x } }); nobj.count = 1; }
  } else {
    G.last_pick = null;
    G.pack_used[obj.packch.charCodeAt(0) - 97] = false;
    G.pack.splice(G.pack.indexOf(obj), 1);
  }
  return nobj;
}
function pack_char() {
  let i = 0; while (G.pack_used[i]) i++;
  G.pack_used[i] = true;
  return String.fromCharCode(97 + i);
}
function pick_up(ch) {
  if (on(player, ISLEVIT)) return;
  const obj = find_obj(hero.y, hero.x);
  if (move_on) { if (obj) move_msg(obj); return; }
  if (ch === GOLD) {
    if (obj === null) return;
    money(obj.arm);
    G.lvl_obj.splice(G.lvl_obj.indexOf(obj), 1);
    proom().goldval = 0;
  } else add_pack(null, false);
}
function move_msg(obj) { msg('you moved onto ' + inv_name(obj, true)); }
function money(value) {
  G.purse += value;
  mvaddch(hero.y, hero.x, floor_ch());
  P(hero.y, hero.x).ch = (proom().flags & ISGONE) ? PASSAGE : FLOOR;
  if (value > 0) msg('you found ' + value + ' gold pieces');
}
function floor_ch() { return (proom().flags & ISGONE) ? PASSAGE : show_floor() ? FLOOR : ' '; }
function floor_at() { let ch = chat(hero.y, hero.x); if (ch === FLOOR) ch = floor_ch(); return ch; }
function reset_last() { G.last_comm = G.l_last_comm; G.last_dir = G.l_last_dir; G.last_pick = G.l_last_pick; }
const fits = (obj, type) => !type || type === obj.type || (type === CALLABLE && obj.type !== FOOD && obj.type !== AMULET)
  || (type === R_OR_S && (obj.type === RING || obj.type === STICK));
// "which object do you want to ...?" — the UI shows the pack and you pick a letter
async function get_item(purpose, type) {
  if (G.pack.length === 0) { msg("you aren't carrying anything"); return null; }
  if (again) { if (G.last_pick) return G.last_pick; msg('you ran out'); return null; }
  for (;;) {
    n_objs = G.pack.filter(o => fits(o, type)).length;
    const ch = await UI.pickItem('Which object do you want to ' + purpose + '?', type);
    if (ch === ESCAPE) { reset_last(); after = false; msg(''); return null; }
    const obj = G.pack.find(o => o.packch === ch);
    if (!obj) { msg("'" + ch + "' is not a valid item"); continue; }
    return obj;
  }
}

// ── Weapons (weapons.c) ──────────────────────────────────────────────────────
async function missile(ydelta, xdelta) {
  let obj = await get_item('throw', WEAPON);
  if (obj === null) return;
  if (!dropcheck(obj) || is_current(obj)) return;
  obj = leave_pack(obj, true, false);
  await do_motion(obj, ydelta, xdelta);
  if (moat(obj.pos.y, obj.pos.x) === null || !hit_monster(obj.pos.y, obj.pos.x, obj)) fall(obj, true);
}
async function do_motion(obj, ydelta, xdelta) {
  obj.pos = { y: hero.y, x: hero.x };
  for (;;) {
    if (!ce(obj.pos, hero) && cansee(obj.pos.y, obj.pos.x)) {
      let ch = chat(obj.pos.y, obj.pos.x);
      if (ch === FLOOR && !show_floor()) ch = ' ';
      mvaddch(obj.pos.y, obj.pos.x, ch);
    }
    obj.pos.y += ydelta; obj.pos.x += xdelta;
    const ch = winat(obj.pos.y, obj.pos.x);
    if (step_ok(ch) && ch !== DOOR) {
      if (cansee(obj.pos.y, obj.pos.x)) { mvaddch(obj.pos.y, obj.pos.x, obj.type); await UI.flash(25); }
      continue;
    }
    break;
  }
}
function fall(obj, pr) {
  const fpos = { y: 0, x: 0 };
  if (fallpos(obj.pos, fpos)) {
    const pp = P(fpos.y, fpos.x);
    pp.ch = obj.type;
    obj.pos = fpos;
    if (cansee(fpos.y, fpos.x)) { if (pp.mon !== null) pp.mon.oldch = obj.type; else mvaddch(fpos.y, fpos.x, obj.type); }
    G.lvl_obj.push(obj);
    return;
  }
  if (pr) { if (has_hit) { endmsg(); has_hit = false; } msg('the ' + weap_info[obj.which].name + ' vanishes as it hits the ground'); }
}
function init_weapon(weap, which) {
  const iw = init_dam[which];
  weap.type = WEAPON; weap.which = which;
  weap.damage = iw[0]; weap.hurldmg = iw[1]; weap.launch = iw[2]; weap.flags = iw[3];
  weap.hplus = 0; weap.dplus = 0;
  if (which === DAGGER) { weap.count = rnd(4) + 2; weap.group = G.group++; }
  else if (weap.flags & ISMANY) { weap.count = rnd(8) + 8; weap.group = G.group++; }
  else { weap.count = 1; weap.group = 0; }
}
const hit_monster = (y, x, obj) => fight({ y, x }, obj, true);
function num(n1, n2, type) {
  let s = (n1 < 0 ? '' : '+') + n1;
  if (type === WEAPON) s += ',' + (n2 < 0 ? '' : '+') + n2;
  return s;
}
async function wield() {
  const oweapon = G.cur_weapon;
  if (!dropcheck(G.cur_weapon)) { G.cur_weapon = oweapon; return; }
  G.cur_weapon = oweapon;
  const obj = await get_item('wield', WEAPON);
  if (obj === null) { after = false; return; }
  if (obj.type === ARMOR) { msg("you can't wield armor"); after = false; return; }
  if (is_current(obj)) { after = false; return; }
  const sp = inv_name(obj, true);
  G.cur_weapon = obj;
  msg('you are now wielding ' + sp + ' (' + obj.packch + ')');
}
function fallpos(pos, newpos) {
  let cnt = 0;
  for (let y = pos.y - 1; y <= pos.y + 1; y++)
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      if (y === hero.y && x === hero.x) continue;
      if (y < 0 || y >= NUMLINES || x < 0 || x >= NUMCOLS) continue;
      const ch = chat(y, x);
      if ((ch === FLOOR || ch === PASSAGE) && rnd(++cnt) === 0) { newpos.y = y; newpos.x = x; }
    }
  return cnt !== 0;
}

// ── Armor (armor.c) ──────────────────────────────────────────────────────────
async function wear() {
  const obj = await get_item('wear', ARMOR);
  if (obj === null) return;
  if (G.cur_armor !== null) { msg("you are already wearing some.  You'll have to take it off first"); after = false; return; }
  if (obj.type !== ARMOR) { msg("you can't wear that"); return; }
  waste_time();
  obj.flags |= ISKNOW;
  const sp = inv_name(obj, true);
  G.cur_armor = obj;
  msg('you are now wearing ' + sp);
}
function take_off() {
  const obj = G.cur_armor;
  if (obj === null) { after = false; msg("you aren't wearing any armor"); return; }
  if (!dropcheck(G.cur_armor)) return;
  G.cur_armor = null;
  msg('you used to be wearing ' + obj.packch + ') ' + inv_name(obj, true));
}
function waste_time() { do_daemons(BEFORE); do_fuses(BEFORE); do_daemons(AFTER); do_fuses(AFTER); }

// ── Rings (rings.c) ──────────────────────────────────────────────────────────
async function ring_on() {
  const obj = await get_item('put on', RING);
  if (obj === null) return;
  if (obj.type !== RING) { msg('it would be difficult to wrap that around a finger'); return; }
  if (is_current(obj)) return;
  let ring;
  if (G.cur_ring[LEFT] === null && G.cur_ring[RIGHT] === null) { if ((ring = await gethand()) < 0) return; }
  else if (G.cur_ring[LEFT] === null) ring = LEFT;
  else if (G.cur_ring[RIGHT] === null) ring = RIGHT;
  else { msg('you already have a ring on each hand'); return; }
  G.cur_ring[ring] = obj;
  if (obj.which === R_ADDSTR) chg_str(obj.arm);
  else if (obj.which === R_SEEINVIS) invis_on();
  else if (obj.which === R_AGGR) aggravate();
  msg('you are now wearing ' + inv_name(obj, true) + ' (' + obj.packch + ')');
}
async function ring_off() {
  let ring;
  if (G.cur_ring[LEFT] === null && G.cur_ring[RIGHT] === null) { msg("you aren't wearing any rings"); return; }
  else if (G.cur_ring[LEFT] === null) ring = RIGHT;
  else if (G.cur_ring[RIGHT] === null) ring = LEFT;
  else if ((ring = await gethand()) < 0) return;
  const obj = G.cur_ring[ring];
  if (obj === null) { msg('not wearing such a ring'); return; }
  if (dropcheck(obj)) msg('was wearing ' + inv_name(obj, true) + '(' + obj.packch + ')');
}
async function gethand() {
  const c = await UI.choose('Left hand or right hand?', [['l', 'Left hand'], ['r', 'Right hand']]);
  if (c === ESCAPE) return -1;
  return c === 'l' ? LEFT : RIGHT;
}
function ring_eat(hand) {
  const uses = [1, 1, 1, -3, -5, 0, 0, -3, -3, 2, -2, 0, 1, 1];
  const ring = G.cur_ring[hand];
  if (ring === null) return 0;
  let eat = uses[ring.which];
  if (eat < 0) eat = rnd(-eat) === 0 ? 1 : 0;
  if (ring.which === R_DIGEST) eat = -eat;
  return eat;
}
function ring_num(obj) {
  if (!(obj.flags & ISKNOW)) return '';
  switch (obj.which) { case R_PROTECT: case R_ADDSTR: case R_ADDDAM: case R_ADDHIT: return ' [' + num(obj.arm, 0, RING) + ']'; }
  return '';
}

// ── Potions (potions.c) ──────────────────────────────────────────────────────
const p_actions = {
  [P_CONFUSE]: [ISHUH, 'unconfuse', HUHDURATION, 'what a tripy feeling!', "wait, what's going on here. Huh? What? Who?"],
  [P_LSD]: [ISHALU, 'come_down', SEEDURATION, 'Oh, wow!  Everything seems so cosmic!', 'Oh, wow!  Everything seems so cosmic!'],
  [P_SEEINVIS]: [CANSEE, 'unsee', SEEDURATION, null, null],
  [P_BLIND]: [ISBLIND, 'sight', SEEDURATION, 'oh, bummer!  Everything is dark!  Help!', 'a cloak of darkness falls around you'],
  [P_LEVIT]: [ISLEVIT, 'land', HEALTIME, "oh, wow!  You're floating in the air!", 'you start to float in the air'],
};
async function quaff() {
  const obj = await get_item('quaff', POTION);
  if (obj === null) return;
  if (obj.type !== POTION) { msg('yuk! Why would you want to drink that?'); return; }
  if (obj === G.cur_weapon) G.cur_weapon = null;
  const trip = on(player, ISHALU), pi = I().pot_info;
  leave_pack(obj, false, false);
  switch (obj.which) {
    case P_CONFUSE: do_pot(P_CONFUSE, !trip); break;
    case P_POISON:
      pi[P_POISON].know = true;
      if (ISWEARING(R_SUSTSTR)) msg('you feel momentarily sick');
      else { chg_str(-(rnd(3) + 1)); msg('you feel very sick now'); come_down(); }
      break;
    case P_HEALING:
      pi[P_HEALING].know = true;
      if ((pstats.hpt += roll(pstats.lvl, 4)) > pstats.maxhp) pstats.hpt = ++pstats.maxhp;
      sight(); msg('you begin to feel better');
      break;
    case P_STRENGTH: pi[P_STRENGTH].know = true; chg_str(1); msg('you feel stronger, now.  What bulging muscles!'); break;
    case P_MFIND:
      player.flags |= SEEMONST;
      fuse('turn_see_off', true, HUHDURATION, AFTER);
      if (!turn_see(false)) msg('you have a ' + choose_str('normal', 'strange') + ' feeling for a moment, then it passes');
      break;
    case P_TFIND: {
      const spots = [];
      for (const tp of G.lvl_obj) if (is_magic(tp)) { spots.push([tp.pos.y, tp.pos.x]); pi[P_TFIND].know = true; }
      for (const mp of G.mlist) for (const tp of mp.pack) if (is_magic(tp)) spots.push([mp.pos.y, mp.pos.x]);
      if (spots.length) { pi[P_TFIND].know = true; await show_win(spots, MAGIC, 'You sense the presence of magic on this level.'); }
      else msg('you have a ' + choose_str('normal', 'strange') + ' feeling for a moment, then it passes');
      break;
    }
    case P_LSD:
      if (!trip) { if (on(player, SEEMONST)) turn_see(false); start_daemon('visuals', 0, BEFORE); G.seenstairs = seen_stairs(); }
      do_pot(P_LSD, true);
      break;
    case P_SEEINVIS: {
      const show = on(player, CANSEE);
      do_pot(P_SEEINVIS, false, 'this potion tastes like ' + fruit + ' juice');
      if (!show) invis_on();
      sight();
      break;
    }
    case P_RAISE: pi[P_RAISE].know = true; msg('you suddenly feel much more skillful'); raise_level(); break;
    case P_XHEAL:
      pi[P_XHEAL].know = true;
      if ((pstats.hpt += roll(pstats.lvl, 8)) > pstats.maxhp) {
        if (pstats.hpt > pstats.maxhp + pstats.lvl + 1) ++pstats.maxhp;
        pstats.hpt = ++pstats.maxhp;
      }
      sight(); come_down(); msg('you begin to feel much better');
      break;
    case P_HASTE: pi[P_HASTE].know = true; after = false; if (add_haste(true)) msg('you feel yourself moving much faster'); break;
    case P_RESTORE:
      if (ISRING(LEFT, R_ADDSTR)) pstats.str = add_str(pstats.str, -G.cur_ring[LEFT].arm);
      if (ISRING(RIGHT, R_ADDSTR)) pstats.str = add_str(pstats.str, -G.cur_ring[RIGHT].arm);
      if (pstats.str < G.max_stats.str) pstats.str = G.max_stats.str;
      if (ISRING(LEFT, R_ADDSTR)) pstats.str = add_str(pstats.str, G.cur_ring[LEFT].arm);
      if (ISRING(RIGHT, R_ADDSTR)) pstats.str = add_str(pstats.str, G.cur_ring[RIGHT].arm);
      msg('hey, this tastes great.  It make you feel warm all over');
      break;
    case P_BLIND: do_pot(P_BLIND, true); break;
    case P_LEVIT: do_pot(P_LEVIT, true); break;
  }
  await call_it(pi[obj.which]);
}
function is_magic(obj) {
  switch (obj.type) {
    case ARMOR: return (obj.flags & ISPROT) !== 0 || obj.arm !== a_class[obj.which];
    case WEAPON: return obj.hplus !== 0 || obj.dplus !== 0;
    case POTION: case SCROLL: case STICK: case RING: case AMULET: return true;
  }
  return false;
}
function invis_on() {
  player.flags |= CANSEE;
  for (const mp of G.mlist) if (on(mp, ISINVIS) && see_monst(mp) && !on(player, ISHALU)) mvaddch(mp.pos.y, mp.pos.x, mp.disguise);
}
function turn_see(turn_off) {
  let add_new = false;
  for (const mp of G.mlist) {
    move(mp.pos.y, mp.pos.x);
    const can_see = see_monst(mp);
    if (turn_off) { if (!can_see) addch(mp.oldch); }
    else {
      if (!can_see) standout();
      addch(on(player, ISHALU) ? String.fromCharCode(rnd(26) + 65) : mp.type);
      if (!can_see) { standend(); add_new = true; }
    }
  }
  if (turn_off) player.flags &= ~SEEMONST; else player.flags |= SEEMONST;
  return add_new;
}
function seen_stairs() {
  if (mvinch(G.stairs.y, G.stairs.x) === STAIRS) return true;
  if (ce(hero, G.stairs)) return true;
  const tp = moat(G.stairs.y, G.stairs.x);
  if (tp) {
    if (see_monst(tp) && on(tp, ISRUN)) return true;
    if (on(player, SEEMONST) && tp.oldch === STAIRS) return true;
  }
  return false;
}
function raise_level() { pstats.exp = e_levels[pstats.lvl - 1] + 1; check_level(); }
function do_pot(type, knowit, text) {
  const pp = p_actions[type], op = I().pot_info[type];
  if (!op.know) op.know = knowit;
  const t = spread(pp[2]);
  if (!on(player, pp[0])) { player.flags |= pp[0]; fuse(pp[1], 0, t, AFTER); look(false); }
  else lengthen(pp[1], t);
  msg(text || choose_str(pp[3], pp[4]));
}

// ── Scrolls (scrolls.c) ──────────────────────────────────────────────────────
async function read_scroll() {
  let obj = await get_item('read', SCROLL);
  if (obj === null) return;
  if (obj.type !== SCROLL) { msg('there is nothing on it to read'); return; }
  if (obj === G.cur_weapon) G.cur_weapon = null;
  leave_pack(obj, false, false);
  const orig = obj, si = I().scr_info;
  switch (obj.which) {
    case S_CONFUSE: player.flags |= CANHUH; msg('your hands begin to glow ' + pick_color('red')); break;
    case S_ARMOR:
      if (G.cur_armor !== null) { G.cur_armor.arm--; G.cur_armor.flags &= ~ISCURSED; msg('your armor glows ' + pick_color('silver') + ' for a moment'); }
      break;
    case S_HOLD: {
      let n = 0;
      for (let x = hero.x - 2; x <= hero.x + 2; x++) if (x >= 0 && x < NUMCOLS)
        for (let y = hero.y - 2; y <= hero.y + 2; y++) if (y >= 0 && y <= NUMLINES - 1) {
          const m = moat(y, x);
          if (m && on(m, ISRUN)) { m.flags &= ~ISRUN; m.flags |= ISHELD; n++; }
        }
      if (n) { msg(n > 1 ? 'the monsters around you freeze' : 'the monster freezes'); si[S_HOLD].know = true; }
      else msg('you feel a strange sense of loss');
      break;
    }
    case S_SLEEP: si[S_SLEEP].know = true; G.no_command += rnd(SLEEPTIME()) + 4; player.flags &= ~ISRUN; msg('you fall asleep'); break;
    case S_CREATE: {
      let i = 0; const mp = { y: 0, x: 0 };
      for (let y = hero.y - 1; y <= hero.y + 1; y++)
        for (let x = hero.x - 1; x <= hero.x + 1; x++) {
          if (y === hero.y && x === hero.x) continue;
          const ch = winat(y, x);
          if (step_ok(ch)) {
            if (ch === SCROLL && find_obj(y, x) && find_obj(y, x).which === S_SCARE) continue;
            if (rnd(++i) === 0) { mp.y = y; mp.x = x; }
          }
        }
      if (i === 0) msg('you hear a faint cry of anguish in the distance');
      else new_monster({}, randmonster(false), mp);
      break;
    }
    case S_ID_POTION: case S_ID_SCROLL: case S_ID_WEAPON: case S_ID_ARMOR: case S_ID_R_OR_S: {
      const id_type = { [S_ID_POTION]: POTION, [S_ID_SCROLL]: SCROLL, [S_ID_WEAPON]: WEAPON, [S_ID_ARMOR]: ARMOR, [S_ID_R_OR_S]: R_OR_S };
      si[obj.which].know = true;
      msg('this scroll is an ' + si[obj.which].name + ' scroll');
      await whatis(true, id_type[obj.which]);
      break;
    }
    case S_MAP:
      si[S_MAP].know = true;
      msg('oh, now this scroll has a map on it');
      for (let y = 1; y < NUMLINES - 1; y++)
        for (let x = 0; x < NUMCOLS; x++) {
          const pp = P(y, x);
          let ch = pp.ch, show = true;
          const pass = () => { if (!(pp.fl & F_REAL)) pp.ch = PASSAGE; pp.fl |= F_SEEN | F_REAL; ch = PASSAGE; };
          switch (ch) {
            case DOOR: case STAIRS: break;
            case '-': case '|': if (!(pp.fl & F_REAL)) { ch = pp.ch = DOOR; pp.fl |= F_REAL; } break;
            case ' ':
              if (pp.fl & F_REAL) { if (pp.fl & F_PASS) pass(); else ch = ' '; break; }
              pp.fl |= F_REAL; ch = pp.ch = PASSAGE; pass(); break;
            case PASSAGE: pass(); break;
            case FLOOR:
              if (pp.fl & F_REAL) ch = ' ';
              else { ch = TRAP; pp.ch = TRAP; pp.fl |= F_SEEN | F_REAL; }
              break;
            default: if (pp.fl & F_PASS) pass(); else ch = ' ';
          }
          if (ch !== ' ') {
            const m = pp.mon;
            if (m) m.oldch = ch;
            if (!m || !on(player, SEEMONST)) mvaddch(y, x, ch);
          }
        }
      break;
    case S_FDET: {
      const spots = G.lvl_obj.filter(o => o.type === FOOD).map(o => [o.pos.y, o.pos.x]);
      if (spots.length) { si[S_FDET].know = true; await show_win(spots, FOOD, 'Your nose tingles and you smell food.'); }
      else msg('your nose tingles');
      break;
    }
    case S_TELEP: { const cur = proom(); teleport(); if (cur !== proom()) si[S_TELEP].know = true; break; }
    case S_ENCH:
      if (G.cur_weapon === null || G.cur_weapon.type !== WEAPON) msg('you feel a strange sense of loss');
      else {
        G.cur_weapon.flags &= ~ISCURSED;
        if (rnd(2) === 0) G.cur_weapon.hplus++; else G.cur_weapon.dplus++;
        msg('your ' + weap_info[G.cur_weapon.which].name + ' glows ' + pick_color('blue') + ' for a moment');
      }
      break;
    case S_SCARE: msg('you hear maniacal laughter in the distance'); break;
    case S_REMOVE:
      for (const o of [G.cur_armor, G.cur_weapon, G.cur_ring[LEFT], G.cur_ring[RIGHT]]) if (o) o.flags &= ~ISCURSED;
      msg(choose_str('you feel in touch with the Universal Onenes', 'you feel as if somebody is watching over you'));
      break;
    case S_AGGR: aggravate(); msg('you hear a high pitched humming noise'); break;
    case S_PROTECT:
      if (G.cur_armor !== null) { G.cur_armor.flags |= ISPROT; msg('your armor is covered by a shimmering ' + pick_color('gold') + ' shield'); }
      else msg('you feel a strange sense of loss');
      break;
  }
  obj = orig;
  look(true);
  await call_it(si[obj.which]);
}

// ── Wands and staffs (sticks.c) ──────────────────────────────────────────────
function fix_stick(cur) {
  cur.damage = G.ws_type[cur.which] === 'staff' ? '2x3' : '1x1';
  cur.hurldmg = '1x1';
  cur.arm = cur.which === WS_LIGHT ? rnd(10) + 10 : rnd(5) + 3;
}
async function do_zap() {
  const obj = await get_item('zap with', STICK);
  if (obj === null) return;
  if (obj.type !== STICK) { after = false; msg("you can't zap with that!"); return; }
  if (obj.arm === 0) { msg('nothing happens'); return; }
  const wi = I().ws_info;
  switch (obj.which) {
    case WS_LIGHT:
      wi[WS_LIGHT].know = true;
      if (proom().flags & ISGONE) msg('the corridor glows and then fades');
      else { proom().flags &= ~ISDARK; enter_room(hero); msg('the room is lit by a shimmering ' + pick_color('blue') + ' light'); }
      break;
    case WS_DRAIN:
      if (pstats.hpt < 2) { msg('you are too weak to use it'); return; }
      drain();
      break;
    case WS_INVIS: case WS_POLYMORPH: case WS_TELAWAY: case WS_TELTO: case WS_CANCEL: {
      let y = hero.y, x = hero.x;
      while (step_ok(winat(y, x))) { y += delta.y; x += delta.x; }
      const tp = moat(y, x);
      if (tp) {
        let monster = tp.type;
        if (monster === 'F') player.flags &= ~ISHELD;
        switch (obj.which) {
          case WS_INVIS: tp.flags |= ISINVIS; if (cansee(y, x)) mvaddch(y, x, tp.oldch); break;
          case WS_POLYMORPH: {
            const pk = tp.pack;
            G.mlist.splice(G.mlist.indexOf(tp), 1);
            if (see_monst(tp)) mvaddch(y, x, chat(y, x));
            const oldch = tp.oldch;
            new_monster(tp, monster = String.fromCharCode(rnd(26) + 65), { y, x });
            if (see_monst(tp)) mvaddch(y, x, monster);
            tp.oldch = oldch; tp.pack = pk;
            wi[WS_POLYMORPH].know = wi[WS_POLYMORPH].know || see_monst(tp);
            break;
          }
          case WS_CANCEL:
            tp.flags |= ISCANC; tp.flags &= ~(ISINVIS | CANHUH); tp.disguise = tp.type;
            if (see_monst(tp)) mvaddch(y, x, tp.disguise);
            break;
          case WS_TELAWAY: case WS_TELTO: {
            const np = { y: 0, x: 0 };
            if (obj.which === WS_TELAWAY) { do find_floor(null, np, 0, true); while (ce(np, hero)); }
            else { np.y = hero.y + delta.y; np.x = hero.x + delta.x; }
            tp.dest = hero; tp.flags |= ISRUN;
            relocate(tp, np);
          }
        }
      }
      break;
    }
    case WS_MISSILE: {
      wi[WS_MISSILE].know = true;
      const bolt = new_item();
      bolt.type = '*'; bolt.hurldmg = '1x4'; bolt.hplus = 100; bolt.dplus = 1; bolt.flags = ISMISL;
      if (G.cur_weapon !== null) bolt.launch = G.cur_weapon.which;
      await do_motion(bolt, delta.y, delta.x);
      const tp = moat(bolt.pos.y, bolt.pos.x);
      if (tp && !save_throw(VS_MAGIC, tp)) hit_monster(bolt.pos.y, bolt.pos.x, bolt);
      else msg('the missle vanishes with a puff of smoke');
      break;
    }
    case WS_HASTE_M: case WS_SLOW_M: {
      let y = hero.y, x = hero.x;
      while (step_ok(winat(y, x))) { y += delta.y; x += delta.x; }
      const tp = moat(y, x);
      if (tp) {
        if (obj.which === WS_HASTE_M) { if (on(tp, ISSLOW)) tp.flags &= ~ISSLOW; else tp.flags |= ISHASTE; }
        else { if (on(tp, ISHASTE)) tp.flags &= ~ISHASTE; else tp.flags |= ISSLOW; tp.turn = true; }
        runto({ y, x });
      }
      break;
    }
    case WS_ELECT: case WS_FIRE: case WS_COLD:
      await fire_bolt(hero, delta, obj.which === WS_ELECT ? 'bolt' : obj.which === WS_FIRE ? 'flame' : 'ice');
      wi[obj.which].know = true;
      break;
  }
  obj.arm--;
}
function drain() {
  const corp = chat(hero.y, hero.x) === DOOR ? G.passages[flat(hero.y, hero.x) & F_PNUM] : null;
  const inpass = (proom().flags & ISGONE) !== 0;
  const drainee = G.mlist.filter(mp => mp.room === proom() || mp.room === corp ||
    (inpass && chat(mp.pos.y, mp.pos.x) === DOOR && G.passages[flat(mp.pos.y, mp.pos.x) & F_PNUM] === proom()));
  if (drainee.length === 0) { msg('you have a tingling feeling'); return; }
  pstats.hpt = idiv(pstats.hpt, 2);
  const cnt = idiv(pstats.hpt, drainee.length);
  for (const mp of drainee) {
    if ((mp.stats.hpt -= cnt) <= 0) killed(mp, see_monst(mp));
    else runto(mp.pos);
  }
}
// bolts of lightning, fire and ice (and dragon breath) bounce off walls
async function fire_bolt(start, dir, name) {
  dir = { y: dir.y, x: dir.x };
  const bolt = new_item();
  bolt.type = WEAPON; bolt.which = FLAME; bolt.hurldmg = '6x6'; bolt.hplus = 100; bolt.dplus = 0;
  weap_info[FLAME].name = name;
  const dirch = { 0: '/', 1: dir.y === 0 ? '-' : '|', '-1': dir.y === 0 ? '-' : '|', 2: '\\', '-2': '\\' }[dir.y + dir.x];
  const pos = { y: start.y, x: start.x }, spots = [];
  let hit_hero = start !== hero, used = false, changed = false;
  for (let n = 0; n < BOLT_LENGTH && !used; n++) {
    pos.y += dir.y; pos.x += dir.x;
    const ch = winat(pos.y, pos.x);
    let wall = ch === '|' || ch === '-' || ch === ' ' || (ch === DOOR && !ce(hero, pos));
    if (wall) {
      if (!changed) hit_hero = !hit_hero;
      changed = false;
      dir.y = -dir.y; dir.x = -dir.x;
      n--;
      msg('the ' + name + ' bounces');
      continue;
    }
    const tp = moat(pos.y, pos.x);
    if (!hit_hero && tp) {
      hit_hero = true; changed = !changed;
      tp.oldch = chat(pos.y, pos.x);
      if (!save_throw(VS_MAGIC, tp)) {
        bolt.pos = { y: pos.y, x: pos.x }; used = true;
        if (tp.type === 'D' && name === 'flame') msg('the flame bounces off the dragon');
        else hit_monster(pos.y, pos.x, bolt);
      } else if (ch !== 'M' || tp.disguise === 'M') {
        if (start === hero) runto(pos);
        msg('the ' + name + ' whizzes past ' + set_mname(tp));
      }
    } else if (hit_hero && ce(pos, hero)) {
      hit_hero = false; changed = !changed;
      if (!save(VS_MAGIC)) {
        if ((pstats.hpt -= roll(6, 6)) <= 0) { death(start === hero ? 'b' : (moat(start.y, start.x) || { type: 'D' }).type); return; }
        used = true;
        msg('you are hit by the ' + name);
      } else msg('the ' + name + ' whizzes by you');
    }
    mvaddch(pos.y, pos.x, dirch);
    spots.push({ y: pos.y, x: pos.x });
    await UI.flash(40);
  }
  for (const c of spots) mvaddch(c.y, c.x, chat(c.y, c.x));
}
function charge_str(obj) { return (obj.flags & ISKNOW) ? ' [' + obj.arm + ' charges]' : ''; }

// ── Looking around (misc.c) ──────────────────────────────────────────────────
function look(wakeup) {
  let passcount = 0, sumhero = 0, diffhero = 0;
  const rp = proom();
  if (!ce(G.oldpos, hero)) { erase_lamp(G.oldpos, G.oldrp); G.oldpos = { y: hero.y, x: hero.x }; G.oldrp = rp; }
  const ey = hero.y + 1, ex = hero.x + 1, sx = hero.x - 1, sy = hero.y - 1;
  if (door_stop && !firstmove && running) { sumhero = hero.y + hero.x; diffhero = hero.y - hero.x; }
  const hp = P(hero.y, hero.x), pch = hp.ch, pfl = hp.fl;
  for (let y = sy; y <= ey; y++) {
    if (!(y > 0 && y < NUMLINES - 1)) continue;
    for (let x = sx; x <= ex; x++) {
      if (x < 0 || x >= NUMCOLS) continue;
      if (!on(player, ISBLIND) && y === hero.y && x === hero.x) continue;
      const pp = P(y, x);
      let ch = pp.ch;
      if (ch === ' ') continue;
      const fp = pp.fl;
      if (pch !== DOOR && ch !== DOOR) if ((pfl & F_PASS) !== (fp & F_PASS)) continue;
      if (((fp & F_PASS) || ch === DOOR) && ((pfl & F_PASS) || pch === DOOR)) {
        if (hero.x !== x && hero.y !== y && !step_ok(chat(y, hero.x)) && !step_ok(chat(hero.y, x))) continue;
      }
      const tp = pp.mon;
      if (tp === null) ch = trip_ch(y, x, ch);
      else if (on(player, SEEMONST) && on(tp, ISINVIS)) { if (door_stop && !firstmove) running = false; continue; }
      else {
        if (wakeup) wake_monster(y, x);
        if (see_monst(tp)) ch = on(player, ISHALU) ? String.fromCharCode(rnd(26) + 65) : tp.disguise;
      }
      if (on(player, ISBLIND) && (y !== hero.y || x !== hero.x)) continue;
      move(y, x);
      if ((proom().flags & ISDARK) && !see_floor && ch === FLOOR) ch = ' ';
      if (tp !== null || ch !== inch()) addch(ch);
      if (door_stop && !firstmove && running) {
        let skip = false;
        switch (runch) {
          case 'h': skip = x === ex; break;
          case 'j': skip = y === sy; break;
          case 'k': skip = y === ey; break;
          case 'l': skip = x === sx; break;
          case 'y': skip = (y + x) - sumhero >= 1; break;
          case 'u': skip = (y - x) - diffhero >= 1; break;
          case 'n': skip = (y + x) - sumhero <= -1; break;
          case 'b': skip = (y - x) - diffhero <= -1; break;
        }
        if (skip) continue;
        switch (ch) {
          case DOOR: if (x === hero.x || y === hero.y) running = false; break;
          case PASSAGE: if (x === hero.x || y === hero.y) passcount++; break;
          case FLOOR: case '|': case '-': case ' ': break;
          default: running = false;
        }
      }
    }
  }
  if (door_stop && !firstmove && passcount > 1) running = false;
  mvaddch(hero.y, hero.x, PLAYER);
}
function trip_ch(y, x, ch) {
  if (on(player, ISHALU) && after)
    switch (ch) {
      case FLOOR: case ' ': case PASSAGE: case '-': case '|': case DOOR: case TRAP: break;
      default: if (y !== G.stairs.y || x !== G.stairs.x || !G.seenstairs) ch = rnd_thing();
    }
  return ch;
}
function erase_lamp(pos, rp) {
  if (!rp || !(see_floor && (rp.flags & (ISGONE | ISDARK)) === ISDARK && !on(player, ISBLIND))) return;
  for (let x = pos.x - 1; x <= pos.x + 1; x++)
    for (let y = pos.y - 1; y <= pos.y + 1; y++) {
      if (y === hero.y && x === hero.x) continue;
      move(y, x);
      if (inch() === FLOOR) addch(' ');
    }
}
function show_floor() { return (proom().flags & (ISGONE | ISDARK)) === ISDARK && !on(player, ISBLIND) ? see_floor : true; }
function find_obj(y, x) { return G.lvl_obj.find(o => o.pos.y === y && o.pos.x === x) || null; }
async function eat() {
  const obj = await get_item('eat', FOOD);
  if (obj === null) return;
  if (obj.type !== FOOD) { msg('ugh, you would get ill if you ate that'); return; }
  if (G.food_left < 0) G.food_left = 0;
  if ((G.food_left += HUNGERTIME - 200 + rnd(400)) > STOMACHSIZE) G.food_left = STOMACHSIZE;
  G.hungry_state = 0;
  if (obj === G.cur_weapon) G.cur_weapon = null;
  if (obj.which === 1) msg('my, that was a yummy ' + fruit);
  else if (rnd(100) > 70) { pstats.exp++; msg(choose_str('bummer', 'yuk') + ', this food tastes awful'); check_level(); }
  else msg(choose_str('oh, wow', 'yum') + ', that tasted good');
  leave_pack(obj, false, false);
}
function check_level() {
  let i;
  for (i = 0; e_levels[i] !== 0; i++) if (e_levels[i] > pstats.exp) break;
  i++;
  const olevel = pstats.lvl;
  pstats.lvl = i;
  if (i > olevel) {
    const add = roll(i - olevel, 10);
    pstats.maxhp += add; pstats.hpt += add;
    msg('welcome to level ' + i);
  }
}
function chg_str(amt) {
  if (amt === 0) return;
  pstats.str = add_str(pstats.str, amt);
  let comp = pstats.str;
  if (ISRING(LEFT, R_ADDSTR)) comp = add_str(comp, -G.cur_ring[LEFT].arm);
  if (ISRING(RIGHT, R_ADDSTR)) comp = add_str(comp, -G.cur_ring[RIGHT].arm);
  if (comp > G.max_stats.str) G.max_stats.str = comp;
}
const add_str = (s, amt) => Math.max(3, Math.min(31, s + amt));
function add_haste(potion) {
  if (on(player, ISHASTE)) {
    G.no_command += rnd(8);
    player.flags &= ~(ISRUN | ISHASTE);
    extinguish('nohaste');
    msg('you faint from exhaustion');
    return false;
  }
  player.flags |= ISHASTE;
  if (potion) fuse('nohaste', 0, rnd(4) + 4, AFTER);
  return true;
}
function aggravate() { for (const mp of G.mlist) runto(mp.pos); }
function is_current(obj) {
  if (obj === null) return false;
  if (obj === G.cur_armor || obj === G.cur_weapon || obj === G.cur_ring[LEFT] || obj === G.cur_ring[RIGHT]) {
    msg("That's already in use"); return true;
  }
  return false;
}
const DIRS = { h: [0, -1], j: [1, 0], k: [-1, 0], l: [0, 1], y: [-1, -1], u: [-1, 1], b: [1, -1], n: [1, 1] };
async function get_dir() {
  if (again && G.last_dir) { delta = { y: G.last_delt.y, x: G.last_delt.x }; dir_ch = G.last_dir; }
  else {
    const ch = await UI.direction('Which direction?');
    if (ch === ESCAPE) { G.last_dir = ''; reset_last(); return false; }
    dir_ch = ch.toLowerCase();
    delta = { y: DIRS[dir_ch][0], x: DIRS[dir_ch][1] };
    G.last_dir = dir_ch; G.last_delt = { y: delta.y, x: delta.x };
  }
  if (on(player, ISHUH) && rnd(5) === 0)
    do delta = { y: rnd(3) - 1, x: rnd(3) - 1 }; while (delta.y === 0 && delta.x === 0);
  return true;
}
// after using something unknown you may give it a name, like "called healing?"
async function call_it(op) {
  if (op.know) { op.guess = null; return; }
  if (op.guess) return;
  const s = await UI.ask('What do you want to call it?');
  if (s) op.guess = s;
}
function rnd_thing() {
  const list = [POTION, SCROLL, RING, STICK, FOOD, WEAPON, ARMOR, STAIRS, GOLD, AMULET];
  return list[rnd(G.level >= AMULETLEVEL ? list.length : list.length - 1)];
}
const choose_str = (ts, ns) => on(player, ISHALU) ? ts : ns;
const pick_color = col => on(player, ISHALU) ? rainbow[rnd(rainbow.length)] : col;

// ── Daemons (daemons.c) ──────────────────────────────────────────────────────
function doctor() {
  const lv = pstats.lvl, ohp = pstats.hpt;
  G.quiet++;
  if (lv < 8) { if (G.quiet + (lv << 1) > 20) pstats.hpt++; }
  else if (G.quiet >= 3) pstats.hpt += rnd(lv - 7) + 1;
  if (ISRING(LEFT, R_REGEN)) pstats.hpt++;
  if (ISRING(RIGHT, R_REGEN)) pstats.hpt++;
  if (ohp !== pstats.hpt) { if (pstats.hpt > pstats.maxhp) pstats.hpt = pstats.maxhp; G.quiet = 0; }
}
function swander() { start_daemon('rollwand', 0, BEFORE); }
function rollwand() {
  if (++G.between >= 4) {
    if (roll(1, 6) === 4) { wanderer(); kill_daemon('rollwand'); fuse('swander', 0, WANDERTIME(), BEFORE); }
    G.between = 0;
  }
}
function unconfuse() { player.flags &= ~ISHUH; msg('you feel less ' + choose_str('trippy', 'confused') + ' now'); }
function unsee() {
  for (const th of G.mlist) if (on(th, ISINVIS) && see_monst(th)) mvaddch(th.pos.y, th.pos.x, th.oldch);
  player.flags &= ~CANSEE;
}
function sight() {
  if (on(player, ISBLIND)) {
    extinguish('sight');
    player.flags &= ~ISBLIND;
    if (!(proom().flags & ISGONE)) enter_room(hero);
    msg(choose_str('far out!  Everything is all cosmic again', 'the veil of darkness lifts'));
  }
}
function nohaste() { player.flags &= ~ISHASTE; msg('you feel yourself slowing down'); }
function stomach() {
  const orig_hungry = G.hungry_state;
  if (G.food_left <= 0) {
    if (G.food_left-- < -STARVETIME) { death('s'); return; }
    if (G.no_command || rnd(5) !== 0) return;
    G.no_command += rnd(8) + 4;
    G.hungry_state = 3;
    addmsg(choose_str('the munchies overpower your motor capabilities.  ', 'you feel too weak from lack of food.  '));
    msg(choose_str('You freak out', 'You faint'));
  } else {
    const oldfood = G.food_left;
    G.food_left -= ring_eat(LEFT) + ring_eat(RIGHT) + 1 - (G.amulet ? 1 : 0);
    if (G.food_left < MORETIME && oldfood >= MORETIME) {
      G.hungry_state = 2;
      msg(choose_str('the munchies are interfering with your motor capabilites', 'you are starting to feel weak'));
    } else if (G.food_left < 2 * MORETIME && oldfood >= 2 * MORETIME) {
      G.hungry_state = 1;
      msg(choose_str('you are getting the munchies', 'you are starting to get hungry'));
    }
  }
  if (G.hungry_state !== orig_hungry) { player.flags &= ~ISRUN; running = false; to_death = false; G.count = 0; }
}
function come_down() {
  if (!on(player, ISHALU)) return;
  kill_daemon('visuals');
  player.flags &= ~ISHALU;
  if (on(player, ISBLIND)) return;
  for (const tp of G.lvl_obj) if (cansee(tp.pos.y, tp.pos.x)) mvaddch(tp.pos.y, tp.pos.x, tp.type);
  const seemonst = on(player, SEEMONST);
  for (const tp of G.mlist) {
    move(tp.pos.y, tp.pos.x);
    if (cansee(tp.pos.y, tp.pos.x)) addch(!on(tp, ISINVIS) || on(player, CANSEE) ? tp.disguise : chat(tp.pos.y, tp.pos.x));
    else if (seemonst) { standout(); addch(tp.type); standend(); }
  }
  msg('Everything looks SO boring now.');
}
function visuals() {
  if (!after || (running && jump)) return;
  for (const tp of G.lvl_obj) if (cansee(tp.pos.y, tp.pos.x)) mvaddch(tp.pos.y, tp.pos.x, rnd_thing());
  if (!G.seenstairs && cansee(G.stairs.y, G.stairs.x)) mvaddch(G.stairs.y, G.stairs.x, rnd_thing());
  const seemonst = on(player, SEEMONST);
  for (const tp of G.mlist) {
    move(tp.pos.y, tp.pos.x);
    if (see_monst(tp)) addch(tp.type === 'X' && tp.disguise !== 'X' ? rnd_thing() : String.fromCharCode(rnd(26) + 65));
    else if (seemonst) { standout(); addch(String.fromCharCode(rnd(26) + 65)); standend(); }
  }
}
function land() { player.flags &= ~ISLEVIT; msg(choose_str("bummer!  You've hit the ground", 'you float gently to the ground')); }
const DAEMONS = { runners, doctor, swander, rollwand, unconfuse, unsee, sight, nohaste, stomach, come_down, visuals, land,
  turn_see_off: () => turn_see(true) };

// ── Commands (command.c) ─────────────────────────────────────────────────────
let countch = '', direction = '', newcount = false;
async function command() {
  let ntimes = on(player, ISHASTE) ? 2 : 1;
  do_daemons(BEFORE); do_fuses(BEFORE);
  if (!playing) return;
  while (ntimes-- > 0) {
    again = false;
    if (has_hit) { endmsg(); has_hit = false; }
    look(true);
    if (!running) door_stop = false;
    take = ''; after = true;
    let ch;
    if (!G.no_command) {
      if (running || to_death) { ch = runch; await UI.flash(running ? 18 : 60); }
      else if (G.count) ch = countch;
      else {
        save_game();
        ch = await UI.readchar();
        move_on = false;
        clearMsgs();
      }
    } else { ch = '.'; await UI.flash(30); }
    if (!playing) return;
    if (G.no_command) {
      if (--G.no_command === 0) { player.flags |= ISRUN; msg('you can move again'); }
    } else {
      newcount = false;
      if (/^[0-9]$/.test(ch)) {
        G.count = 0; newcount = true;
        while (/^[0-9]$/.test(ch)) { G.count = Math.min(255, G.count * 10 + +ch); ch = await UI.readchar(); }
        countch = ch;
        if (!'.abhjklmnqrstuyzBCHIJKLNUY'.includes(ch) && !/^\^[hjklyubn]$/.test(ch)) G.count = 0;
      }
      if (G.count && !running) G.count--;
      if (ch !== 'a' && ch !== ESCAPE && !(running || G.count || to_death)) {
        G.l_last_comm = G.last_comm; G.l_last_dir = G.last_dir; G.l_last_pick = G.last_pick;
        G.last_comm = ch; G.last_dir = ''; G.last_pick = null;
      }
      await execute(ch);
      if (!playing) return;
      if (!running) door_stop = false;
    }
    if (take !== '') pick_up(take);
    if (!running) door_stop = false;
    if (!after) ntimes++;
  }
  do_daemons(AFTER); do_fuses(AFTER);
  if (!playing) return;
  for (const h of [LEFT, RIGHT]) {
    if (ISRING(h, R_SEARCH)) search();
    else if (ISRING(h, R_TELEPORT) && rnd(50) === 0) teleport();
  }
  G.turns++;
}
async function execute(ch) {
  for (;;) {
    if (DIRS[ch]) { await do_move(DIRS[ch][0], DIRS[ch][1]); return; }
    if (DIRS[ch.toLowerCase()] && isupper(ch)) { do_run(ch.toLowerCase()); return; }
    if (/^\^[hjklyubn]$/.test(ch)) {          // run until something interesting
      if (!on(player, ISBLIND)) { door_stop = true; firstmove = true; }
      if (G.count && !newcount) ch = direction;
      else { ch = ch[1].toUpperCase(); direction = ch; }
      continue;
    }
    switch (ch) {
      case ',': {
        const obj = find_obj(hero.y, hero.x);
        if (obj) { if (!levit_check()) pick_up(obj.type); }
        else msg('there is nothing here to pick up');
        return;
      }
      case 'F': kamikaze = true;
      // fall through
      case 'f': {
        if (!(await get_dir())) { after = false; return; }
        const d = { y: hero.y + delta.y, x: hero.x + delta.x }, mp = moat(d.y, d.x);
        if (mp === null || (!see_monst(mp) && !on(player, SEEMONST))) { msg('I see no monster there'); after = false; return; }
        if (diag_ok(hero, d)) { to_death = true; G.max_hit = 0; mp.flags |= ISTARGET; runch = ch = dir_ch; continue; }
        return;
      }
      case 't': if (!(await get_dir())) after = false; else await missile(delta.y, delta.x); return;
      case 'a':
        if (G.last_comm === '') { msg("you haven't typed a command yet"); after = false; return; }
        ch = G.last_comm; again = true; continue;
      case 'q': await quaff(); return;
      case 'Q': after = false; if (await UI.confirm('Really quit?')) { death('q'); } return;
      case 'i': after = false; await UI.inventory(); return;
      case 'I': after = false; await UI.inventory(); return;
      case 'd': await drop(); return;
      case 'r': await read_scroll(); return;
      case 'e': await eat(); return;
      case 'w': await wield(); return;
      case 'W': await wear(); return;
      case 'T': take_off(); return;
      case 'P': await ring_on(); return;
      case 'R': await ring_off(); return;
      case 'c': after = false; await call(); return;
      case '>': after = false; d_level(); return;
      case '<': after = false; u_level(); return;
      case '?': after = false; await UI.help(); return;
      case '/': after = false; await identify(); return;
      case 's': search(); return;
      case 'z': if (await get_dir()) await do_zap(); else after = false; return;
      case 'D': after = false; await UI.discoveries(); return;
      case '^P': after = false; await UI.log(); return;
      case 'v': after = false; msg('Rogue version 5.4.4, ported to the arcade'); return;
      case 'S': after = false; save_game(); msg('your game is saved — it also saves itself after every move'); return;
      case '.': return;
      case ' ': after = false; return;
      case '^': {
        after = false;
        if (await get_dir()) {
          const y = hero.y + delta.y, x = hero.x + delta.x;
          addmsg('You have found ');
          if (chat(y, x) !== TRAP) msg('no trap there');
          else if (on(player, ISHALU)) msg(tr_name[rnd(NTRAPS)]);
          else { msg(tr_name[flat(y, x) & F_TMASK]); P(y, x).fl |= F_SEEN; }
        }
        return;
      }
      case ESCAPE: door_stop = false; G.count = 0; after = false; again = false; return;
      case 'm':
        move_on = true;
        if (!(await get_dir())) { after = false; return; }
        ch = countch = dir_ch; continue;
      case ')': current(G.cur_weapon, 'wielding', null); return;
      case ']': current(G.cur_armor, 'wearing', null); return;
      case '=': current(G.cur_ring[LEFT], 'wearing', 'on left hand'); current(G.cur_ring[RIGHT], 'wearing', 'on right hand'); return;
      case '@': after = false; msg(statusText()); return;
      case 'TRAVEL': after = false; return;   // a tap on the map (see UI.travel)
      default: after = false; G.count = 0; msg("illegal command '" + ch + "'"); return;
    }
  }
}
function current(cur, how, where) {
  after = false;
  if (cur !== null) msg(how + ' ' + inv_name(cur, true) + (where ? ' ' + where : ''));
  else msg(how + ' nothing' + (where ? ' ' + where : ''));
}
function search() {
  const probinc = (on(player, ISHALU) ? 3 : 0) + (on(player, ISBLIND) ? 2 : 0);
  let found = false;
  for (let y = hero.y - 1; y <= hero.y + 1; y++)
    for (let x = hero.x - 1; x <= hero.x + 1; x++) {
      if (y === hero.y && x === hero.x) continue;
      if (y < 0 || y >= NUMLINES || x < 0 || x >= NUMCOLS) continue;
      const pp = P(y, x);
      if (pp.fl & F_REAL) continue;
      let hit = false;
      switch (pp.ch) {
        case '|': case '-':
          if (rnd(5 + probinc) !== 0) break;
          pp.ch = DOOR; msg('a secret door'); hit = true; break;
        case FLOOR:
          if (rnd(2 + probinc) !== 0) break;
          pp.ch = TRAP;
          addmsg('you found ');
          if (on(player, ISHALU)) msg(tr_name[rnd(NTRAPS)]);
          else { msg(tr_name[pp.fl & F_TMASK]); pp.fl |= F_SEEN; }
          hit = true; break;
        case ' ':
          if (rnd(3 + probinc) !== 0) break;
          pp.ch = PASSAGE; hit = true; break;
      }
      if (hit) { found = true; pp.fl |= F_REAL; G.count = 0; running = false; }
    }
  if (found) look(false);
}
async function call() {
  const obj = await get_item('call', CALLABLE);
  if (obj === null) return;
  let op = null;
  switch (obj.type) {
    case RING: op = I().ring_info[obj.which]; break;
    case POTION: op = I().pot_info[obj.which]; break;
    case SCROLL: op = I().scr_info[obj.which]; break;
    case STICK: op = I().ws_info[obj.which]; break;
    case FOOD: msg("you can't call that anything"); return;
  }
  if (op && op.know) { msg('that has already been identified'); return; }
  const s = await UI.ask('What do you want to call it?', op ? op.guess || '' : obj.label || '');
  if (!s) return;
  if (op) op.guess = s; else obj.label = s;
}
// '/': what does a symbol mean?
async function identify() {
  const ch = await UI.ask('What do you want identified? (type a symbol)');
  if (!ch) return;
  const c = ch[0], names = { '|': 'wall of a room', '-': 'wall of a room', [GOLD]: 'gold', [STAIRS]: 'a staircase',
    [DOOR]: 'door', [FLOOR]: 'room floor', [PLAYER]: 'you', [PASSAGE]: 'passage', [TRAP]: 'trap', [POTION]: 'potion',
    [SCROLL]: 'scroll', [FOOD]: 'food', [WEAPON]: 'weapon', ' ': 'solid rock', [ARMOR]: 'armor',
    [AMULET]: 'the Amulet of Yendor', [RING]: 'ring', [STICK]: 'wand or staff' };
  const what = isupper(c) ? mon(c).name : names[c] || 'unknown character';
  msg("'" + c + "': " + what);
}
function d_level() {
  if (levit_check()) return;
  if (chat(hero.y, hero.x) !== STAIRS) msg('I see no way down');
  else { G.level++; G.seenstairs = false; new_level(); }
}
function u_level() {
  if (levit_check()) return;
  if (chat(hero.y, hero.x) === STAIRS) {
    if (G.amulet) {
      G.level--;
      if (G.level === 0) { total_winner(); return; }
      new_level();
      msg('you feel a wrenching sensation in your gut');
    } else msg('your way is magically blocked');
  } else msg('I see no way up');
}
function levit_check() {
  if (!on(player, ISLEVIT)) return false;
  msg("You can't.  You're floating off the ground!");
  return true;
}

// ── Wizard odds and ends (wizard.c) ──────────────────────────────────────────
async function whatis(insist, type) {
  if (G.pack.length === 0) { msg("you don't have anything in your pack to identify"); return; }
  let obj;
  for (;;) {
    obj = await get_item('identify', type);
    if (insist) {
      if (n_objs === 0) return;
      if (obj === null) msg('you must identify something');
      else if (type && !fits(obj, type)) msg('you must identify a ' + { [POTION]: 'potion', [SCROLL]: 'scroll', [WEAPON]: 'weapon', [ARMOR]: 'armor', [R_OR_S]: 'ring, wand or staff' }[type]);
      else break;
    } else break;
  }
  if (obj === null) return;
  const set_know = tbl => { tbl[obj.which].know = true; obj.flags |= ISKNOW; tbl[obj.which].guess = null; };
  switch (obj.type) {
    case SCROLL: set_know(I().scr_info); break;
    case POTION: set_know(I().pot_info); break;
    case STICK: set_know(I().ws_info); break;
    case WEAPON: case ARMOR: obj.flags |= ISKNOW; break;
    case RING: set_know(I().ring_info); break;
  }
  msg(inv_name(obj, false));
}
function teleport() {
  mvaddch(hero.y, hero.x, floor_at());
  const c = { y: 0, x: 0 };
  find_floor(null, c, 0, true);
  if (roomin(c) !== proom()) { leave_room(hero); hero.y = c.y; hero.x = c.x; enter_room(hero); }
  else { hero.y = c.y; hero.x = c.x; look(true); }
  mvaddch(hero.y, hero.x, PLAYER);
  if (on(player, ISHELD)) { player.flags &= ~ISHELD; G.vf_hit = 0; mon('F').stats.dmg = '000x0'; }
  G.no_move = 0; G.count = 0; running = false;
}
async function show_win(spots, ch, text) {
  // detection magic: show the marks over the map until you tap or press a key
  await UI.overlay(spots.map(([y, x]) => [y, x, ch]), text);
}

// ── Status line (io.c) ───────────────────────────────────────────────────────
function statusText() {
  const arm = G.cur_armor !== null ? G.cur_armor.arm : pstats.arm;
  return 'Level: ' + G.level + '  Gold: ' + G.purse + '  Hp: ' + pstats.hpt + '(' + pstats.maxhp + ')  Str: ' +
    pstats.str + '(' + G.max_stats.str + ')  Arm: ' + (10 - arm) + '  Exp: ' + pstats.lvl + '/' + pstats.exp +
    ['', '  Hungry', '  Weak', '  Faint'][G.hungry_state];
}

// ── The end (rip.c) ──────────────────────────────────────────────────────────
function killname(monst, doart) {
  let sp, article = true;
  if (isupper(monst)) sp = mon(monst).name;
  else {
    const nl = { a: ['arrow', true], b: ['bolt', true], d: ['dart', true], h: ['hypothermia', false], s: ['starvation', false], q: ['quitting', false] };
    [sp, article] = nl[monst] || ['Wally the Wonder Badger', false];
  }
  return (doart && article ? 'a' + vowelstr(sp) + ' ' : '') + sp;
}
function death(monst) {
  if (!playing) return;
  playing = false;
  G.purse -= idiv(G.purse, 10);
  clear_save();
  UI.gameOver({ won: false, killer: killname(monst, true), gold: G.purse, level: G.level, name: G.whoami,
    quit: monst === 'q' });
}
function total_winner() {
  playing = false;
  const rows = [];
  let total = G.purse;
  for (const obj of G.pack) {
    let worth = 0, op;
    switch (obj.type) {
      case FOOD: worth = 2 * obj.count; break;
      case WEAPON: worth = weap_info[obj.which].worth * (3 * (obj.hplus + obj.dplus) + obj.count); obj.flags |= ISKNOW; break;
      case ARMOR: worth = arm_info[obj.which].worth + (9 - obj.arm) * 100 + 10 * (a_class[obj.which] - obj.arm); obj.flags |= ISKNOW; break;
      case SCROLL: op = I().scr_info[obj.which]; worth = op.worth * obj.count; if (!op.know) worth = idiv(worth, 2); op.know = true; break;
      case POTION: op = I().pot_info[obj.which]; worth = op.worth * obj.count; if (!op.know) worth = idiv(worth, 2); op.know = true; break;
      case RING:
        op = I().ring_info[obj.which]; worth = op.worth;
        if ([R_ADDSTR, R_ADDDAM, R_PROTECT, R_ADDHIT].includes(obj.which)) worth = obj.arm > 0 ? worth + obj.arm * 100 : 10;
        if (!(obj.flags & ISKNOW)) worth = idiv(worth, 2);
        obj.flags |= ISKNOW; op.know = true; break;
      case STICK:
        op = I().ws_info[obj.which]; worth = op.worth + 20 * obj.arm;
        if (!(obj.flags & ISKNOW)) worth = idiv(worth, 2);
        obj.flags |= ISKNOW; op.know = true; break;
      case AMULET: worth = 1000; break;
    }
    worth = Math.max(0, worth);
    rows.push([obj.packch, worth, inv_name(obj, false)]);
    total += worth;
  }
  clear_save();
  UI.gameOver({ won: true, rows, gold: G.purse, total, name: G.whoami });
}

// ── Saving (comfort: the game saves itself before every command) ─────────────
const SAVE_KEY = 'rogue-save-v1';
function serialize() {
  const rooms = G.rooms.concat(G.passages), ri = r => r ? rooms.indexOf(r) : -1, pk = o => o ? G.pack.indexOf(o) : -1;
  const dest = d => {
    if (!d) return null;
    if (d === hero) return { h: 1 };
    const oi = G.lvl_obj.findIndex(o => o.pos === d); if (oi >= 0) return { o: oi };
    const gi = rooms.findIndex(r => r.gold === d); if (gi >= 0) return { g: gi };
    return { y: d.y, x: d.x };
  };
  const S = Object.assign({}, G, {
    places: G.places.map(p => [p.ch, p.fl]),
    player: Object.assign({}, G.player, { room: ri(G.player.room) }),
    cur_armor: pk(G.cur_armor), cur_weapon: pk(G.cur_weapon), cur_ring: G.cur_ring.map(pk),
    last_pick: pk(G.last_pick), l_last_pick: pk(G.l_last_pick), oldrp: ri(G.oldrp),
    mlist: G.mlist.map(m => Object.assign({}, m, { room: ri(m.room), dest: dest(m.dest) })),
  });
  return { G: S, scr: scr.map(r => r.join('')), sout: sout.map(r => r.map(b => b ? 1 : 0).join('')),
    fdmg: mon('F').stats.dmg, log: msgLog.slice(-60) };
}
function save_game() {
  if (!playing) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); } catch (e) { /* private window etc. */ }
}
function clear_save() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function load_game() {
  let D;
  try { D = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!D || !D.G) return false;
  G = D.G;
  const rooms = G.rooms.concat(G.passages), rr = i => i >= 0 ? rooms[i] : null, pk = i => i >= 0 ? G.pack[i] : null;
  G.places = G.places.map(([ch, fl]) => ({ ch, fl, mon: null }));
  bindState();
  player.room = rr(player.room); G.oldrp = rr(G.oldrp);
  G.cur_armor = pk(G.cur_armor); G.cur_weapon = pk(G.cur_weapon); G.cur_ring = G.cur_ring.map(pk);
  G.last_pick = pk(G.last_pick); G.l_last_pick = pk(G.l_last_pick);
  for (const m of G.mlist) {
    m.room = rr(m.room);
    const d = m.dest;
    m.dest = !d ? null : d.h ? hero : d.o !== undefined ? G.lvl_obj[d.o].pos : d.g !== undefined ? rooms[d.g].gold : { y: d.y, x: d.x };
    P(m.pos.y, m.pos.x).mon = m;
  }
  D.scr.forEach((r, y) => { for (let x = 0; x < NUMCOLS; x++) scr[y][x] = r[x] || ' '; });
  D.sout.forEach((r, y) => { for (let x = 0; x < NUMCOLS; x++) sout[y][x] = r[x] === '1'; });
  mon('F').stats.dmg = D.fdmg;
  msgLog = D.log || [];
  return true;
}

// ── Starting up (main.c) ─────────────────────────────────────────────────────
function new_game(name) {
  G = freshState(); bindState();
  G.whoami = name || 'Rogue';
  clear(); msgLog = []; newMsgs = [];
  mon('F').stats.dmg = '000x0';
  init_probs();
  init_player();
  init_names(); init_colors(); init_stones(); init_materials();
  new_level();
  start_daemon('runners', 0, AFTER);
  start_daemon('doctor', 0, AFTER);
  fuse('swander', 0, WANDERTIME(), AFTER);
  start_daemon('stomach', 0, AFTER);
  G.oldpos = { y: hero.y, x: hero.x }; G.oldrp = roomin(hero);
  msg('Hello ' + G.whoami + ', welcome to the Dungeons of Doom');
}
async function playit() {
  playing = true;
  running = false; to_death = false; again = false; G.count = 0;
  while (playing) await command();
}
const Rogue = { new_game, load_game, playit, hasSave: () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  get G() { return G; }, scr, sout, statusText, discoveries, inv_name, monsters, msgLog: () => msgLog, newMsgs: () => newMsgs,
  hero: () => hero, chat, P, NUMLINES, NUMCOLS, isPlaying: () => playing };
