#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Camilo Higuita <milo.h@aol.com>
# SPDX-License-Identifier: GPL-3.0-or-later
"""Checks the skin files (data/skins/*.json, or the files given) against what each colour is drawn
on, WCAG 2.x contrast:

  dark        `dark` matches the case: the chassis' mean is dark by Rave.isDarkColour()
  ink         >= 7:1 on chassisTop and chassisBottom, >= 4.5:1 on cap and capShade (and groupCap,
              groupCapShade) where the machine draws key caps: the step grids' (drums, both
              samplers) and the chords' keys; the bass and lead draw none
  well ink    what the views on the well write in (Rave.onWell: the skin's ink when the well is
              as dark as the case, a near white or near black otherwise) >= 4.5:1 on the well,
              and their quiet labels (WellColours.label: #a0a0a8 on a dark well, the ink at 70 %
              on a light one) >= 4.5:1 too
  glow        >= 3:1 on the caps it lights (as above) and on the well: a lit key's LED, a lit
              step, a note or a chord in a roll
  accent      >= 3:1 on the chassis or on the well (where it is drawn: lit chips and knob arcs
              on the case, lit chips and custom chords in the well; never on a key cap)
  header      glow >= 3:1 on the header's instrument chip (#0f0f12: its light) and plateColor
              >= 4.5:1 on the nameplate (#1b1b20: its name in neon)
  apart       every two machines' glows differ by at least 20 (CIE76 Lab Delta E), so the
              header's lights tell them apart

  tools/check-skins.py [--quiet] [FILE.json ...]
  tools/check-skins.py --similar [LIMIT]

Prints each set's failures (or "ok") and exits 1 when any file given (or any shipped one) fails.
--similar lists the pairs of sets (the shipped files and ravving's own, Rave.ownSkins) closest
to each other: the mean, over the eight machines, of the Delta E between the same machine's
case (chassisTop, chassisBottom), keys (cap, groupCap), well and lights (accent, glow) in the
two sets: what a look at the two sets on the device compares. LIMIT pairs (default 20).
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MACHINES = ['drums1', 'drums2', 'drums3', 'chords', 'bass', 'lead', 'sampler', 'pads']
DARK_LABEL = '#a0a0a8'  # WellColours.label on a dark well
# who draws key caps (KeyCap): the step grids (drums, both samplers, with the alternate
# groupCap every other four steps) and the chords' chord keys; the bass and lead draw none
CAPS = {'drums1': ['cap', 'groupCap'], 'drums2': ['cap', 'groupCap'], 'drums3': ['cap', 'groupCap'],
        'sampler': ['cap', 'groupCap'], 'pads': ['cap', 'groupCap'], 'chords': ['cap']}
HEADER_CHIP = '#0f0f12'
NAMEPLATE = '#1b1b20'
KEYS = ['chassisTop', 'chassisBottom', 'ink', 'accent', 'glow', 'plateColor', 'cap', 'capShade',
        'capBorder', 'groupCap', 'groupCapShade', 'well', 'rail']


def channels(colour):
    return [int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def luminance(colour):
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels(colour)]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(a, b):
    high, low = sorted((luminance(a), luminance(b)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def is_dark(colour):
    """Rave.isDarkColour(): Rec. 709 weights on the encoded channels, under the mid grey."""
    r, g, b = channels(colour)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5


def mix(a, b):
    return '#' + ''.join(f'{round((x + y) / 2 * 255):02x}' for x, y in zip(channels(a), channels(b)))


def lab(colour):
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels(colour)]
    r, g, b = linear
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = [t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116 for t in (x, y, z)]
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])


def blend(colour, alpha, ground):
    """`colour` at `alpha` over `ground`, as drawn."""
    return '#' + ''.join(f'{round((c * alpha + g * (1 - alpha)) * 255):02x}'
                         for c, g in zip(channels(colour), channels(ground)))


def on_well(s):
    """Rave.onWell(): (dark, ink) of what the views on the well write in."""
    dark = is_dark(s['well'])
    if dark == bool(s.get('dark', True)):
        return dark, s['ink']
    return dark, '#f4f4f6' if dark else '#16161a'


def delta_e(a, b):
    return math.dist(lab(a), lab(b))


def check_machine(name, s):
    problems = []
    missing = [k for k in KEYS + ['dark'] if k not in s]
    if missing:
        return [f'{name}: missing {", ".join(missing)}']

    def least(key, faces, minimum, what):
        ratio, face = min((contrast(s[key], s.get(f, f)), f) for f in faces)
        if ratio < minimum:
            problems.append(f'{name}: {what} {ratio:.1f}:1 on {face}, under {minimum}:1')

    case_dark = is_dark(mix(s['chassisTop'], s['chassisBottom']))
    if bool(s['dark']) != case_dark:
        problems.append(f'{name}: "dark": {str(s["dark"]).lower()} on a {"dark" if case_dark else "light"} case')
    least('ink', ['chassisTop', 'chassisBottom'], 7.0, 'ink')
    caps = CAPS.get(name, [])
    if caps:
        least('ink', caps + [c + 'Shade' for c in caps], 4.5, 'ink')
    well_dark, well_ink = on_well(s)
    label = DARK_LABEL if well_dark else blend(well_ink, 0.7, s['well'])
    for what, colour in (('the well\'s ink', well_ink), ('the well\'s labels', label)):
        if contrast(colour, s['well']) < 4.5:
            problems.append(f'{name}: {what} {colour} {contrast(colour, s["well"]):.1f}:1 on the well, under 4.5:1')
    least('glow', caps + ['well'], 3.0, 'glow')
    on_case = min(contrast(s['accent'], s[f]) for f in ('chassisTop', 'chassisBottom'))
    in_well = contrast(s['accent'], s['well'])
    if max(on_case, in_well) < 3.0:
        problems.append(f'{name}: accent {on_case:.1f}:1 on the chassis and {in_well:.1f}:1 on the well, under 3.0:1')
    least('glow', [HEADER_CHIP], 3.0, 'glow (header light)')
    least('plateColor', [NAMEPLATE], 4.5, 'plateColor (nameplate)')
    return problems


def check_file(path):
    data = json.loads(path.read_text())
    skin = data.get('skin', {})
    machines = skin.get('machines', {})
    problems = []
    if not skin.get('name') or not skin.get('about'):
        problems.append('no name or about')
    for name in MACHINES:
        if name not in machines:
            problems.append(f'{name}: missing (falls back to ravving\'s own)')
            continue
        problems += check_machine(name, machines[name])
    glows = [(n, machines[n]['glow']) for n in MACHINES if 'glow' in machines.get(n, {})]
    for i, (a, ga) in enumerate(glows):
        for b, gb in glows[i + 1:]:
            if delta_e(ga, gb) < 20:
                problems.append(f'{a}/{b}: glows {ga} and {gb} too alike in the header (Delta E {delta_e(ga, gb):.0f}, under 20)')
    return problems


SIMILAR_KEYS = ['chassisTop', 'chassisBottom', 'cap', 'groupCap', 'well', 'accent', 'glow']


def own_skins():
    """ravving's own set (Rave.qml's ownSkins), by machine."""
    text = (ROOT / 'qml' / 'components' / 'Rave.qml').read_text()
    block = text[text.index('readonly property var ownSkins'):]
    block = block[:block.index('})')]
    skins = {}
    for match in re.finditer(r'"(\w+)":\s*\{([^{}]*)\}', block):
        skins[match.group(1)] = dict(re.findall(r'(\w+)\s*:\s*"(#[0-9a-fA-F]{6})"', match.group(2)))
    return skins


def similar(limit):
    sets = {'ravving': own_skins()}
    for path in sorted((ROOT / 'data' / 'skins').glob('*.json')):
        machines = json.loads(path.read_text())['skin']['machines']
        sets[path.stem] = {m: {**sets['ravving'][m], **machines.get(m, {})} for m in MACHINES}
    names = list(sets)
    pairs = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            distances = [delta_e(sets[a][m][k], sets[b][m][k]) for m in MACHINES for k in SIMILAR_KEYS]
            pairs.append((sum(distances) / len(distances), a, b))
    for distance, a, b in sorted(pairs)[:limit]:
        print(f'{distance:6.1f}  {a} / {b}')


def main(argv):
    if '--similar' in argv:
        rest = [a for a in argv if a != '--similar']
        similar(int(rest[0]) if rest else 20)
        return 0
    quiet = '--quiet' in argv
    files = [Path(a) for a in argv if not a.startswith('--')] or sorted((ROOT / 'data' / 'skins').glob('*.json'))
    failed = 0
    for path in files:
        problems = check_file(path)
        failed += bool(problems)
        print(f'{path.stem}: {"ok" if not problems else f"{len(problems)} problem(s)"}')
        if not quiet:
            for p in problems:
                print(f'  {p}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
