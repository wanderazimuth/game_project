"""Build the arcade's Brogue (brogue/brogue.js and brogue/brogue.wasm) from Brogue CE's source.

Needs Emscripten (emcc on the PATH: run emsdk_env first) and a checkout of Brogue CE at the
tag below:

    git clone --branch v1.15.1 https://github.com/tmewett/BrogueCE.git
    python brogue-port/build.py path/to/BrogueCE

Brogue's C code is compiled unchanged; wasm-platform.c (beside this script) connects it to
the page. The output is committed, so the Pi only serves files and never builds.
"""

from __future__ import annotations

import glob
import os
import shutil
import subprocess
import sys

TAG = "v1.15.1"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "brogue")

FLAGS = [
    "-O2", "-std=c99", "-Wno-parentheses", "-Wno-incompatible-pointer-types-discards-qualifiers",
    "-Wno-macro-redefined",
    "-DDATADIR=.", "-DBROGUE_WEB", '-DBROGUE_EXTRA_VERSION=""',
    # The game's input loop "blocks"; Asyncify lets it hand control back to the browser.
    "-sASYNCIFY", "-sASYNCIFY_STACK_SIZE=262144",
    # Brogue keeps big grids on the stack, as desktop builds with an 8 MB stack can.
    "-sSTACK_SIZE=8388608", "-sALLOW_MEMORY_GROWTH=1",
    # Saves, recordings and high scores are files; the page keeps them in IndexedDB.
    "-sFORCE_FILESYSTEM=1", "-lidbfs.js", "-sEXPORTED_RUNTIME_METHODS=FS,IDBFS,addRunDependency,removeRunDependency",
    "-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$UTF8ToString",
    "-sENVIRONMENT=web", "-sEXIT_RUNTIME=0",
]


def main() -> None:
    src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "BrogueCE"))
    emcc = shutil.which("emcc")
    if not emcc:
        sys.exit("emcc not found: run emsdk_env (emsdk_env.bat on Windows) first")
    try:
        tag = subprocess.run(["git", "-C", src, "describe", "--tags", "--exact-match"],
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        tag = None
    if tag != TAG:
        sys.exit(f"{src} should be Brogue CE at {TAG} (found {tag or 'no tag'})")

    sources = sorted(glob.glob(os.path.join(src, "src", "brogue", "*.c"))
                     + glob.glob(os.path.join(src, "src", "variants", "*.c")))
    sources += [os.path.join(src, "src", "platform", f) for f in ("main.c", "platformdependent.c", "null-platform.c")]
    sources.append(os.path.join(HERE, "wasm-platform.c"))
    includes = [f"-I{os.path.join(src, 'src', d)}" for d in ("brogue", "platform", "variants")]

    cmd = [emcc, *FLAGS, *includes, *sources, "-o", os.path.join(OUT, "brogue.js")]
    print(f"compiling {len(sources)} files...")
    subprocess.run(cmd, check=True)
    for name in ("brogue.js", "brogue.wasm"):
        print(f"{name}: {os.path.getsize(os.path.join(OUT, name)) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
