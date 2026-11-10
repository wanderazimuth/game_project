/*
 * Brogue CE in the browser: a platform layer for Emscripten (WebAssembly).
 *
 * Copyright (C) 2026 the arcade's authors. Part of the arcade's Brogue port.
 * Brogue: Community Edition is licensed under the GNU Affero General Public License v3,
 * and so is this file. See ../brogue/LICENSE.txt.
 *
 * Brogue's own C code is compiled unchanged. It draws through plotChar and waits for input
 * in nextKeyOrMouseEvent; here both hand off to the page (brogue/index.html) through its
 * BrogueUI object. Waiting uses emscripten_sleep, which with -sASYNCIFY returns to the
 * browser until the time is up, so the page keeps drawing and taking taps while the game
 * "blocks" -- the same trick the arcade's Rogue port does with async functions.
 *
 * Built with BROGUE_WEB defined so main.c picks this file's webConsole. Brogue's own
 * web-platform.c (a socket bridge for web-brogue servers) isn't compiled in.
 */

#include <emscripten.h>
#include "platform.h"

#define POLL_MS 30  // how often to look for input while waiting (SDL's build uses 36)

// Event types and special keys as the page sends them, so the page needn't know Brogue's values.
enum { UI_KEY, UI_DOWN, UI_UP, UI_MOVE, UI_RDOWN, UI_RUP };
enum { UI_ESCAPE = -1, UI_RETURN = -2, UI_DELETE = -3, UI_TAB = -4,
       UI_LEFT = -5, UI_RIGHT = -6, UI_UPARROW = -7, UI_DOWNARROW = -8 };

EM_JS(void, ui_plot, (int x, int y, int ch, int fr, int fg, int fb, int br, int bg, int bb), {
    BrogueUI.plot(x, y, ch, fr, fg, fb, br, bg, bb);
});

// Fills out[0..4] with type, param1, param2, ctrl, shift; returns 1 if there was an event.
EM_JS(int, ui_next, (int *out), {
    const e = BrogueUI.next();
    if (!e) return 0;
    for (let i = 0; i < 5; i++) HEAP32[(out >> 2) + i] = e[i] | 0;
    return 1;
});

EM_JS(int, ui_modifier, (int which), { return BrogueUI.modifier(which) ? 1 : 0; });

EM_JS(void, ui_gameover, (int kind, int score, int depth, const char *description), {
    BrogueUI.gameOver(kind, score, depth, UTF8ToString(description));
});

EM_JS(void, ui_exit, (int status), { BrogueUI.exit(status); });

static rogueEvent lastEvent;

static long brogueKey(long key) {
    switch (key) {
        case UI_ESCAPE: return ESCAPE_KEY;
        case UI_RETURN: return RETURN_KEY;
        case UI_DELETE: return DELETE_KEY;
        case UI_TAB: return TAB_KEY;
        case UI_LEFT: return LEFT_ARROW;
        case UI_RIGHT: return RIGHT_ARROW;
        case UI_UPARROW: return UP_ARROW;
        case UI_DOWNARROW: return DOWN_ARROW;
        default: return key;
    }
}

static boolean poll(rogueEvent *event) {
    static const enum eventTypes types[] = { KEYSTROKE, MOUSE_DOWN, MOUSE_UP, MOUSE_ENTERED_CELL,
                                             RIGHT_MOUSE_DOWN, RIGHT_MOUSE_UP };
    int e[5];
    event->eventType = EVENT_ERROR;
    if (!ui_next(e) || e[0] < 0 || e[0] > UI_RUP) return false;
    event->eventType = types[e[0]];
    event->param1 = e[0] == UI_KEY ? brogueKey(e[1]) : e[1];
    event->param2 = e[2];
    event->controlKey = e[3];
    event->shiftKey = e[4];
    return true;
}

static void web_gameLoop(void) {
    lastEvent.eventType = EVENT_ERROR;
    ui_exit(rogueMain());
}

static boolean web_pauseForMilliseconds(short ms, PauseBehavior behavior) {
    emscripten_sleep(ms > 0 ? ms : 0);
    if (lastEvent.eventType != EVENT_ERROR
        && (lastEvent.eventType != MOUSE_ENTERED_CELL || behavior.interuptForMouseMove)) {
        return true;  // already holding an interrupting event
    }
    // Like the SDL build, a waiting mouse move is replaced by whatever comes next.
    return poll(&lastEvent)
        && (lastEvent.eventType != MOUSE_ENTERED_CELL || behavior.interuptForMouseMove);
}

static void web_nextKeyOrMouseEvent(rogueEvent *returnEvent, boolean textInput, boolean colorsDance) {
    if (lastEvent.eventType != EVENT_ERROR) {
        *returnEvent = lastEvent;
        lastEvent.eventType = EVENT_ERROR;
        return;
    }
    while (!poll(returnEvent)) {
        if (colorsDance) {  // shimmering water and lava, as in the SDL build
            shuffleTerrainColors(3, true);
            commitDraws();
        }
        emscripten_sleep(POLL_MS);
    }
}

static void web_plotChar(enum displayGlyph glyph, short x, short y,
                     short foreRed, short foreGreen, short foreBlue,
                     short backRed, short backGreen, short backBlue) {
    ui_plot(x, y, glyphToUnicode(glyph), foreRed, foreGreen, foreBlue, backRed, backGreen, backBlue);
}

static void web_remap(const char *from, const char *to) {
    // keymap.txt isn't used in the browser
}

static boolean web_modifierHeld(int modifier) {
    return ui_modifier(modifier);
}

static void web_notifyEvent(short eventId, int data1, int data2, const char *str1, const char *str2) {
    if (eventId == GAMEOVER_DEATH || eventId == GAMEOVER_QUIT
        || eventId == GAMEOVER_VICTORY || eventId == GAMEOVER_SUPERVICTORY) {
        ui_gameover(eventId, data1, rogue.deepestLevel, str1 ? str1 : "");
    }
}

struct brogueConsole webConsole = {
    web_gameLoop,
    web_pauseForMilliseconds,
    web_nextKeyOrMouseEvent,
    web_plotChar,
    web_remap,
    web_modifierHeld,
    web_notifyEvent,
    NULL,  // takeScreenshot
    NULL,  // setGraphicsMode: text only for now
};
