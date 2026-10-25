#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Camilo Higuita <milo.h@aol.com>
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Makes and checks ravving icon packs (docs/icon-packs.md): one JSON file whose icons are filled
# paths in straight lines on a square grid, drawn by SETTINGS → LOOK → ICONS like the built-in
# sets. Python 3, nothing to install; the page offers it as a download.
#
#   make-pack.py start FOLDER [--from PACK.json]    a folder to draw in (names.txt, and the
#                                                   starting pack's SVGs when given)
#   make-pack.py build FOLDER -o PACK.json --name NAME [--about TEXT] [--author WHO]
#                                                   FOLDER/<name>.svg or <name>.png → a pack
#   make-pack.py check PACK.json…                   what ravving would leave out, and why
#   make-pack.py sheet PACK.json -o SHEET.html      every icon at 16, 24 and 48 px, light and dark
#   make-pack.py unpack PACK.json FOLDER            a pack back into SVG files
#
# An SVG: viewBox="0 0 G G" (G the grid, 4 to 16), <path d> and <rect> elements in straight lines
# (M L H V Z), no transforms. A PNG: square, G pixels a side; every pixel more than half opaque
# is ink. Exits 1 when a pack has a problem.
import argparse
import html
import json
import os
import re
import struct
import sys
import zlib

# Every icon ravving draws, and where it shows (the built-in candy set has them all; ctest
# icons-current keeps this list equal to it). A pack may leave any out: candy's is drawn instead.
NAMES = {
    # transport and editing
    "play": "PLAY, on the header and the players",
    "pause": "PAUSE, while playing",
    "stop": "STOP, and the ■ key in hints",
    "record": "RECORD, LIVE REC, the RECORDER, the ● key in hints",
    "skip-back": "the music player's previous track",
    "skip-next": "the music player's next track",
    "metronome": "the metronome, its tick",
    "metronome-tock": "the metronome, its tock (drawn in turn with metronome)",
    "loop": "a loop, the ⟲ mark in hints",
    "follow": "follow the playhead, the ↻ mark in hints",
    "undo": "UNDO",
    "redo": "REDO",
    "plus": "add, one more, octave up, the ＋ mark",
    "minus": "one less, octave down",
    "close": "the ✕ that closes a dialog or a page",
    "clear": "a text field's clear button",
    "check": "done, picked, the ✓ mark in notices",
    "refresh": "read again (a list, a scan)",
    "more": "a menu of more actions (⋯)",
    "favourite": "a favourite, the ★ mark",
    "dot": "a small mark beside a name",
    "radio": "the picked entry of a drop-down list",
    "alert": "a warning, an issue, the ⚠ mark",
    # arrows and carets
    "chevron-left": "back, the previous page of a list",
    "chevron-right": "forward, the next page of a list",
    "caret-up": "the ▲ key in hints",
    "caret-down": "the ▼ key in hints, a drop-down button's caret",
    "caret-left": "the ◀ key in hints",
    "caret-right": "the ▶ key in hints, the ▸ mark",
    "dropdown": "the ▾ mark of a button that opens a list",
    "arrow-up": "↑ in hints",
    "arrow-down": "↓ in hints",
    "arrow-left": "← in hints",
    "arrow-right": "→ in hints, a step to the next screen",
    # the device's keys and the notes
    "key-star": "the device's ✱ key in hints",
    "note": "a note, the ♪ mark",
    "note-on": "a note that sounds, the ♩ mark",
    # the waves (a synth's oscillator)
    "wave-saw": "a saw wave",
    "wave-square": "a square wave",
    "wave-triangle": "a triangle wave",
    "wave-sine": "a sine wave",
    # busy, drawn in turn
    "busy-1": "busy, frame 1 of 4",
    "busy-2": "busy, frame 2 of 4",
    "busy-3": "busy, frame 3 of 4",
    "busy-4": "busy, frame 4 of 4",
    # the system
    "wifi": "Wi-Fi",
    "bluetooth": "Bluetooth",
    "brightness": "the screen's brightness",
    "volume": "the volume, the master",
    "mixer": "the mixer",
    "midi": "MIDI",
    "cpu": "the CPU's load",
    "lock": "locked",
    "unlock": "unlocked",
    "eye": "the LOOK settings, show a password",
    "usb": "a USB stick",
    "get-more": "GET MORE, free things to download",
    "settings": "SETTINGS",
    "video": "LIVE REC's video",
    "folder": "a folder, FILES",
    "computer": "a computer (the computer link, Bluetooth)",
    "power": "power off, restart",
    "info": "ABOUT, more about something",
    "fx": "the LIVE FX",
    "mic": "a microphone, the input",
    "keys": "a keyboard, the KEYS settings",
    "profile": "the PROFILE settings, who uses the device",
    "phone": "a phone (the phone share, Bluetooth)",
    "headphones": "headphones, the output",
    # actions
    "delete": "DELETE",
    "save": "SAVE",
    "rename": "RENAME",
    "send": "SEND to a phone or a computer",
    "import": "take in, from a stick or a download",
    "export": "EXPORT a track or a project",
    # the pages
    "drums": "the DRUMS pages",
    "chords": "the CHORDS page",
    "bass": "the BASS page",
    "lead": "the LEAD page",
    "sampler": "the samplers' page",
    "song": "the SONG page",
    "player": "the music player",
    # other marks
    "sun": "light, day",
    "moon": "dark, night",
    "menu": "MENU",
    "globe": "the language, the internet",
    "heart": "a like, thanks",
}

SMALLEST_GRID, LARGEST_GRID, LONGEST_PATH = 4, 16, 8192
STRAIGHT_LINES = re.compile(r"^[MmLlHhVvZz0-9 .,\-]+$")
KEY = re.compile(r"[^a-z0-9]+")


def key_of(name):
    """The file name ravving gives a pack called name ("Night Bus" → night-bus)."""
    return KEY.sub("-", name.strip().lower()).strip("-") or "icons"


# --- reading drawings ---------------------------------------------------------------------

def read_png(path):
    """The PNG at path as rows of booleans (ink where a pixel is more than half opaque)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, chunks, idat = 8, {}, b""
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IDAT":
            idat += body
        else:
            chunks.setdefault(kind, body)
    width, height, depth, colour, _, _, interlace = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    if interlace:
        raise ValueError("an interlaced PNG: save it without interlacing")
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colour]
    if depth not in (1, 2, 4, 8) or (depth < 8 and colour not in (0, 3)):
        raise ValueError("a %d-bit PNG: save it with 8 bits a channel" % depth)
    bits = channels * depth
    stride = (width * bits + 7) // 8
    step = max(1, bits // 8)
    raw = zlib.decompress(idat)
    rows, previous = [], bytearray(stride)
    for y in range(height):
        kind, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            left = line[i - step] if i >= step else 0
            up, corner = previous[i], previous[i - step] if i >= step else 0
            if kind == 1:
                line[i] = (line[i] + left) & 255
            elif kind == 2:
                line[i] = (line[i] + up) & 255
            elif kind == 3:
                line[i] = (line[i] + (left + up) // 2) & 255
            elif kind == 4:
                p = left + up - corner
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - corner)
                line[i] = (line[i] + (left if pa <= pb and pa <= pc else up if pb <= pc else corner)) & 255
        previous = line
        values = []
        for x in range(width):
            if depth < 8:
                byte = line[x * depth // 8]
                shift = 8 - depth - (x * depth) % 8
                values.append([(byte >> shift) & ((1 << depth) - 1)])
            else:
                values.append(list(line[x * channels:(x + 1) * channels]))
        rows.append(values)
    palette = chunks.get(b"PLTE", b"")
    alpha = chunks.get(b"tRNS", b"")

    if colour == 3 and not palette:
        raise ValueError("a palette PNG without its palette")

    def opacity(v):
        if colour == 6:
            return v[3]
        if colour == 4:
            return v[1]
        if colour == 3:
            return alpha[v[0]] if v[0] < len(alpha) else 255
        return 255

    def level(v):
        if colour == 3:
            r, g, b = palette[v[0] * 3:v[0] * 3 + 3] if v[0] * 3 + 3 <= len(palette) else (0, 0, 0)
            return (r + g + b) // 3
        if colour in (0, 4):
            return v[0] * 255 // ((1 << depth) - 1)
        return sum(v[:3]) // 3

    # with transparency, every pixel more than half opaque is ink; without any (a drawing saved
    # opaque, black on white), every dark pixel is
    transparent = any(opacity(v) < 128 for row in rows for v in row)
    if transparent:
        return [[opacity(v) > 127 for v in row] for row in rows]
    return [[level(v) < 128 for v in row] for row in rows]


def bitmap_path(bitmap):
    """A path of horizontal runs, one rectangle each (what make-icons.py writes)."""
    d = []
    for y, row in enumerate(bitmap):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                d.append("M%d %dh%dv1h-%dz" % (start, y, x - start, x - start))
            else:
                x += 1
    return "".join(d)


def number(text):
    value = float(text)
    return str(int(value)) if value == int(value) else repr(value)


def read_svg(path):
    """(grid, path) of the SVG at path: its <path d> and <rect> elements joined."""
    text = open(path, encoding="utf-8").read()
    box = re.search(r'viewBox="\s*0[ ,]+0[ ,]+([0-9.]+)[ ,]+([0-9.]+)\s*"', text)
    if not box or box.group(1) != box.group(2):
        raise ValueError('needs a square viewBox="0 0 G G"')
    if re.search(r"\btransform\s*=", text):
        raise ValueError("has a transform: apply it to the paths first")
    for tag in ("circle", "ellipse", "polygon", "polyline", "line", "text", "image", "use"):
        if re.search(r"<%s\b" % tag, text):
            raise ValueError("has a <%s>: convert it to a path in straight lines" % tag)
    parts = [m.group(1) for m in re.finditer(r'<path\b[^>]*?\sd="([^"]*)"', text)]
    for m in re.finditer(r"<rect\b([^>]*)>", text):
        attrs = dict(re.findall(r'([a-z]+)="([^"]*)"', m.group(1)))
        x, y = number(attrs.get("x", "0")), number(attrs.get("y", "0"))
        w, h = number(attrs["width"]), number(attrs["height"])
        if attrs.get("fill", "").lower() in ("none", "white", "#fff", "#ffffff", "transparent"):
            continue  # a background, not ink
        parts.append("M%s %sh%sv%sh-%sz" % (x, y, w, h, w))
    return int(float(box.group(1))), " ".join(p.strip() for p in parts)


# --- packs --------------------------------------------------------------------------------

def check_pack(document):
    """The problems ravving would find in a pack document, and how many icons it keeps."""
    problems = []
    if document.get("ravving") != "preset" or document.get("type") != "icons":
        return ['not an icon pack: it needs "ravving": "preset" and "type": "icons"'], 0
    pack = document.get("pack") or {}
    grid = pack.get("grid")
    if not isinstance(grid, int) or not SMALLEST_GRID <= grid <= LARGEST_GRID:
        return ["grid must be a whole number from %d to %d" % (SMALLEST_GRID, LARGEST_GRID)], 0
    if not str(pack.get("name", "")).strip():
        problems.append("no name: SETTINGS shows the file's name instead")
    kept = 0
    for name, d in sorted((pack.get("icons") or {}).items()):
        d = str(d).strip()
        if name not in NAMES:
            problems.append("%s: ravving has no icon of that name (left out)" % name)
        elif not d or len(d) > LONGEST_PATH or not STRAIGHT_LINES.match(d):
            problems.append("%s: only straight lines (M L H V Z) are drawn (left out)" % name)
        else:
            numbers = re.findall(r"-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", d)
            outside = [n for n in numbers if float(n) > grid]
            if outside and re.fullmatch(r"[MLHVZ0-9 .,\-]+", d):
                problems.append("%s: goes past the %d-cell grid" % (name, grid))
            kept += 1
    if not kept:
        problems.append("no icon ravving can draw: the pack is not offered")
    return problems, kept


def load(path):
    with open(path, encoding="utf-8") as file:
        return json.load(file)


def cmd_start(args):
    os.makedirs(args.folder, exist_ok=True)
    with open(os.path.join(args.folder, "names.txt"), "w", encoding="utf-8") as file:
        for name, use in NAMES.items():
            file.write("%-15s %s\n" % (name, use))
    if args.source:
        cmd_unpack(argparse.Namespace(pack=args.source, folder=args.folder))
    print("draw <name>.svg or <name>.png files in %s (names.txt lists them), then run build" % args.folder)
    return 0


def cmd_build(args):
    icons, grids, failed = {}, set(), False
    for file in sorted(os.listdir(args.folder)):
        name, suffix = os.path.splitext(file)
        if suffix.lower() not in (".svg", ".png"):
            continue
        if name not in NAMES:
            print("%s: ravving has no icon of that name, skipped" % file)
            continue
        try:
            if suffix.lower() == ".png":
                bitmap = read_png(os.path.join(args.folder, file))
                if len(bitmap) != len(bitmap[0]):
                    raise ValueError("is not square")
                grid, d = len(bitmap), bitmap_path(bitmap)
            else:
                grid, d = read_svg(os.path.join(args.folder, file))
        except (ValueError, KeyError, OSError, zlib.error) as error:
            print("%s: %s" % (file, error))
            failed = True
            continue
        grids.add(grid)
        icons[name] = d
    if len(grids) > 1:
        print("every icon must be on one grid; found %s" % ", ".join(map(str, sorted(grids))))
        return 1
    if not icons:
        print("no icon in %s" % args.folder)
        return 1
    pack = {"name": args.name, "about": args.about or "", "grid": grids.pop(), "icons": icons}
    if args.author:
        pack["author"] = args.author
    document = {"ravving": "preset", "type": "icons", "pack": pack}
    output = args.output or key_of(args.name) + ".json"
    with open(output, "w", encoding="utf-8") as file:
        json.dump(document, file, indent=2, ensure_ascii=False)
        file.write("\n")
    problems, kept = check_pack(document)
    for problem in problems:
        print(problem)
    missing = len(NAMES) - kept
    print("%s: %d icons on a %d-cell grid%s" % (output, kept, pack["grid"], ", %d drawn from candy" % missing if missing else ""))
    return 1 if failed or problems else 0


def cmd_check(args):
    status = 0
    for path in args.packs:
        try:
            problems, kept = check_pack(load(path))
        except (OSError, ValueError) as error:
            problems, kept = [str(error)], 0
        for problem in problems:
            print("%s: %s" % (path, problem))
        if problems:
            status = 1
        else:
            missing = len(NAMES) - kept
            print("%s: ok, %d icons%s" % (path, kept, " (%d drawn from candy)" % missing if missing else ""))
    return status


def cmd_unpack(args):
    pack = load(args.pack)["pack"]
    os.makedirs(args.folder, exist_ok=True)
    grid = pack["grid"]
    for name, d in pack["icons"].items():
        with open(os.path.join(args.folder, name + ".svg"), "w", encoding="utf-8") as file:
            file.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" shape-rendering="crispEdges">'
                       '<path fill="currentColor" d="%s"/></svg>\n' % (grid, grid, grid, grid, d))
    print("%d icons in %s" % (len(pack["icons"]), args.folder))
    return 0


def cmd_sheet(args):
    document = load(args.pack)
    pack = document["pack"]
    grid = pack["grid"]
    cells = []
    for name, use in NAMES.items():
        d = pack["icons"].get(name)
        icon = ('<svg viewBox="0 0 %d %d" width="{s}" height="{s}" shape-rendering="crispEdges"><path fill="currentColor" d="%s"/></svg>'
                % (grid, grid, html.escape(d)) if d else "")
        sizes = "".join(icon.replace("{s}", str(s)) for s in (16, 24, 48)) if d else "<i>candy's</i>"
        cells.append('<figure title="%s">%s<figcaption>%s</figcaption></figure>' % (html.escape(use), sizes, html.escape(name)))
    page = """<!doctype html><meta charset="utf-8"><title>%s</title>
<style>
body{margin:0;font:13px system-ui,sans-serif}
section{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:16px}
.dark{background:#101012;color:#ece8df}.light{background:#f4f1ea;color:#1c1b1f}
figure{margin:0;padding:8px;border:1px solid #8884;border-radius:6px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
figcaption{width:100%%;opacity:.7}svg{image-rendering:pixelated}
</style>
<h1 style="padding:0 16px">%s · %d-cell grid</h1>
<section class="dark">%s</section><section class="light">%s</section>
""" % (html.escape(pack.get("name", "")), html.escape(pack.get("name", "")), grid, "".join(cells), "".join(cells))
    with open(args.output, "w", encoding="utf-8") as file:
        file.write(page)
    print(args.output)
    return 0


def main():
    parser = argparse.ArgumentParser(description="Make and check ravving icon packs (docs/icon-packs.md).")
    commands = parser.add_subparsers(dest="command", required=True)
    start = commands.add_parser("start", help="a folder to draw a pack in")
    start.add_argument("folder")
    start.add_argument("--from", dest="source", help="a pack to start from (candy.json, block.json, hairline.json…)")
    build = commands.add_parser("build", help="a folder of SVG or PNG icons into a pack")
    build.add_argument("folder")
    build.add_argument("-o", "--output")
    build.add_argument("--name", required=True)
    build.add_argument("--about")
    build.add_argument("--author")
    check = commands.add_parser("check", help="what ravving would leave out of packs")
    check.add_argument("packs", nargs="+")
    sheet = commands.add_parser("sheet", help="an HTML page of a pack's icons")
    sheet.add_argument("pack")
    sheet.add_argument("-o", "--output", required=True)
    unpack = commands.add_parser("unpack", help="a pack into SVG files")
    unpack.add_argument("pack")
    unpack.add_argument("folder")
    args = parser.parse_args()
    return {"start": cmd_start, "build": cmd_build, "check": cmd_check, "sheet": cmd_sheet, "unpack": cmd_unpack}[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
