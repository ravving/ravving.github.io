/*
 * ravving's webpage: the UI icons (B29 in notes/brand/design-system.md).
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The pages write the device's keys and the app's symbols as characters (▶ ■ ● ✱ ▲ ▼ ◀ ↶ → …), so
 * they read without scripting and their translations keep plain text. This swaps each for one of
 * ravving's own pixel icons, as the app's Interaction.withIcons() does: the set site.css's
 * --icon-set names (theme/tokens.json icons.default), from assets/icons/<set>/<name>.svg, drawn as
 * a mask over the text colour (.i) at the largest whole scale of the set's grid that fits 16 px.
 * Text added later (a screenshot's caption) is swapped as it arrives. Code, preformatted text
 * and form fields keep their characters; html.icons tells site.css the icons are on.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var script = document.currentScript;
  var base = script ? script.src.replace(/icons\.js(\?.*)?$/, "icons/") : "assets/icons/";
  var GRIDS = { candy: 16, block: 8, hairline: 12 };
  var BOX = 16;

  /* The characters and the icons they become; ▶ is the PLAY key beside ■ or ●, an arrow key otherwise. */
  var KEYS = {
    "▲": "caret-up", "▼": "caret-down", "◀": "caret-left", "▶": "caret-right", "▸": "caret-right",
    "▾": "caret-down", "■": "stop", "●": "record", "✱": "key-star", "★": "favourite", "♩": "metronome",
    "♪": "note", "↶": "undo", "↷": "redo", "→": "arrow-right", "←": "arrow-left", "↑": "arrow-up",
    "↓": "arrow-down", "✓": "check", "✕": "close", "⚠": "alert", "⇄": "loop"
  };
  var PATTERN = new RegExp("[" + Object.keys(KEYS).join("") + "]︎?", "g");
  var SKIP = "code, pre, script, style, textarea, input, select, svg, title, .i, .no-icons";

  function start() {
    var set = getComputedStyle(root).getPropertyValue("--icon-set").trim() || "candy";
    var grid = GRIDS[set] || 16;
    var url = function (name) { return 'url("' + base + set + "/" + name + '.svg")'; };
    root.style.setProperty("--icon-art", grid * Math.max(1, Math.floor(BOX / grid)) + "px");
    root.style.setProperty("--i-arrow-right", url("arrow-right"));
    root.classList.add("icons");

    function swap(node) {
      var text = node.nodeValue;
      PATTERN.lastIndex = 0;
      if (!PATTERN.test(text)) return;
      var parent = node.parentElement;
      if (!parent || parent.closest(SKIP)) return;
      var transport = /[■●]/.test(text) || !!parent.closest(".c-play");
      var out = document.createDocumentFragment();
      var at = 0;
      text.replace(PATTERN, function (found, offset) {
        var key = found.charAt(0);
        var name = key === "▶" && transport ? "play" : KEYS[key];
        if (offset > at) out.appendChild(document.createTextNode(text.slice(at, offset)));
        var icon = document.createElement("span");
        icon.className = "i";
        icon.setAttribute("role", "img");
        icon.setAttribute("aria-label", key);
        icon.style.setProperty("--i", url(name));
        out.appendChild(icon);
        at = offset + found.length;
        return found;
      });
      if (at < text.length) out.appendChild(document.createTextNode(text.slice(at)));
      node.parentNode.replaceChild(out, node);
    }

    function walk(top) {
      if (top.nodeType === 3) { swap(top); return; }
      if (top.nodeType !== 1 || (top.closest && top.closest(SKIP))) return;
      var walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
      var found = [];
      while (walker.nextNode()) found.push(walker.currentNode);
      found.forEach(swap);
    }

    walk(document.body);
    if (window.MutationObserver) {
      new MutationObserver(function (changes) {
        changes.forEach(function (change) {
          if (change.type === "characterData") walk(change.target);
          else change.addedNodes.forEach(walk);
        });
      }).observe(document.body, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}());
