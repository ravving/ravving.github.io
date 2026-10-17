/*
 * ravving on MIKO: the hardware shortcuts site.
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Four small interactions, nothing else: a shortcut row shows its screenshot in the card's
 * figure (with a frame around what to look at), hovering a card's rows lights the matching
 * region on the device artwork, a feature row slides in as it scrolls into view, and a
 * feature group opens and closes on its heading. The page reads fine with JavaScript off:
 * the figures are then empty, the rows all shown, the groups all open (html.no-js).
 */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* The screenshots (shots/NAME.png, 1280 × 800) and what each one shows. */
  var SHOTS = {
    "page1": { caption: "ページ 1：DRUMS 1（909 キット）" },
    "page1-drums2": { caption: "もう一度 1：DRUMS 2（808 キット）" },
    "page2": { caption: "ページ 2、コード" },
    "page3": { caption: "ページ 3、ベース" },
    "page4": { caption: "ページ 4、リード" },
    "page5": { caption: "ページ 5、SLOT SAMPLER" },
    "page5-pads": { caption: "もう一度ページ 5：PAD SAMPLER" },
    "mixer": { caption: "✱：ミキサー" },
    "mixer-strip": { caption: "ストリップを選んだミキサー（▶）" },
    "menu": { caption: "MENU：コントロールセンター" },
    "alt-held": { caption: "ALT を押している間：パッドにキー番号を表示" },
    "alt-mode": { caption: "ALT + MODE：ヘッダーにセクションキー" },
    "mode-live": { caption: "MODE：ライブ オン、ステップキーがパッドに" },
    "header-focus": { caption: "ALT + ▲：ヘッダーにフォーカス" },
    "bass-select": { caption: "ベースで 選択 オン：ノートの値表示" },
    "strip-knobs": { caption: "ストリップをタップ：ノブ 1 と 2 で パン と 音量" },
    "recorder": { caption: "MENU → レコーダー" },
    "再生中": { caption: "PLAY：ロック オン、再生位置が進行" },
    "song": { caption: "ソングページ" }
  };

  /* Frames over a screenshot, in percent of its width and height: [x, y, w, h, label].
     Several frames may share a name; the rest of the picture is dimmed. */
  var MARKS = {
    "bigknob-fader": [[15.2, 20.5, 21.8, 6.5, "音量 に大ノブのバッジ"]],
    "master": [[94, 6.3, 5.5, 10, "マスター"]],
    "header-group": [[1, 6.3, 10.5, 10, "フォーカス中のグループ"]],
    "fx-sends": [[44.7, 6.5, 12.3, 9.5, "FX センド 1 2 3"]],
    "note-readout": [[75.8, 35.5, 22, 5.5, "長さ · ベロシティ · ナッジ"], [5.6, 79, 6, 4.2, "選択中"]],
    "strip": [[10, 20, 27, 7.5, "ノブ 1 と 2 で パン · 音量"]],
    "mixer-strip": [[0.6, 19, 98.8, 10, "選んだストリップ"]],
    "menu-sliders": [[1.4, 70.5, 42.5, 16.5, "出力 2 · 明るさ 1"]],
    "recorder-gain": [[1.5, 28.5, 50, 5.5, "ゲイン"]],
    "menu-drawer": [[0, 0, 45, 100, "コントロールセンター"]],
    "nameplate": [[2, 20, 7.5, 7.5, "ネームプレート"]],
    "mixer": [[0.6, 19, 98.8, 80, "ミキサー"]],
    "mode-lamp": [[76.5, 20.5, 13, 6, "ステップ · ライブ"]],
    "header-deck": [[12, 6.5, 32, 9.5, "セクションキー"]],
    "recorder-tabs": [[4.8, 6.7, 24, 4, "入力"], [1.5, 15, 66, 40, "パネル"]],
    "grid": [[1.5, 35.5, 97, 57, "グリッド"]],
    "livefx": [[12, 6.5, 32, 9.5, "番号付きの LIVE FX"]],
    "sections": [[12, 6.5, 32, 9.5, "セクション"]],
    "pads": [[1.9, 29.5, 24.6, 43, "パッド"]],
    "cursor": [[76.5, 20.5, 5.5, 6, "ステップ"], [5.6, 35.5, 6, 57, "ステップ"]],
    "transport": [[0.8, 0.9, 16, 4.2, "● ▶ メトロノーム ■"]],
    "再生中": [[0.8, 0.9, 8, 4.2, "再生中"], [2.2, 29, 6.5, 4.6, "ロック"], [32, 35.5, 5, 57, "再生位置"]],
    "strip-rec": [[37.5, 20.5, 4.5, 6, "ストリップの ●"]],
    "header-rec": [[9, 0.9, 3.6, 4.2, "ヘッダーの ●"]],
    "video-card": [[30, 16, 13.8, 9, "ビデオを録画"]],
    "メトロノーム": [[13, 0.9, 3.8, 4.2, "メトロノーム"]],
    "recorder-rec": [[1.2, 1, 3.3, 4, "● REC"], [69.5, 17, 29, 40, "録音"]],
    "walk": [[1.5, 19.3, 97, 9, "ストリップ"], [1.5, 35.5, 97, 57, "エディター"]],
    "side-keys": [[2.3, 34.5, 24, 4.5, "ビュー"]],
    "undo": [[63.4, 1, 6.5, 4.2, "プロジェクトの ↶ ↷"], [83.3, 29, 8, 4.8, "マシンの ↶ ↷"]],
    "選択中": [[5.6, 79, 6, 4.2, "選択中"], [38.3, 29, 7, 4.8, "選択"]],
    "fx-bar": [[1, 93.5, 98, 5, "サウンドエフェクト"]],
    "song": [[1.9, 31, 49, 15, "セクションキー"], [2, 59, 47, 8.5, "ソングのブロック"]],
    "picker": [[2, 20, 7.5, 7.5, "ネームプレートで選択画面を開く"]],
    "strip-solo": [[89.5, 20.5, 4, 6, "S"]],
    "select-btn": [[38.3, 29, 7, 4.8, "選択"]],
    "plate": [[43, 1, 19, 4.2, "プロジェクトのプレート"]],
    "auto": [[76.8, 29, 6, 4.8, "オートメ"]]
  };

  var SVG = "http://www.w3.org/2000/svg";

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  /* Draws NAME's frames over the figure: a dimmed picture with the frames cut out, each
     frame stroked in the card's colour with its label on a tab. */
  function overlay(figure, name) {
    var old = figure.querySelector("svg");
    if (old) old.remove();
    var marks = MARKS[name];
    if (!marks) return;
    var svg = el("svg", { viewBox: "0 0 160 100", preserveAspectRatio: "none", "aria-hidden": "true" });
    var id = "m" + Math.random().toString(36).slice(2, 8);
    var defs = el("defs", {}, svg);
    var mask = el("mask", { id: id }, defs);
    el("rect", { x: 0, y: 0, width: 160, height: 100, fill: "#fff" }, mask);
    marks.forEach(function (m) {
      el("rect", { x: m[0] * 1.6, y: m[1], width: m[2] * 1.6, height: m[3], fill: "#000", rx: 1.2 }, mask);
    });
    el("rect", { "class": "dim", x: 0, y: 0, width: 160, height: 100, mask: "url(#" + id + ")" }, svg);
    marks.forEach(function (m) {
      el("rect", { "class": "mark", x: m[0] * 1.6, y: m[1], width: m[2] * 1.6, height: m[3] }, svg);
      if (m[4]) {
        var x = m[0] * 1.6, y = m[1], w = m[2] * 1.6;
        var below = y + m[3] + 6 < 100;
        var ty = below ? y + m[3] + 1.2 : y - 5.2;
        var tw = Math.min(m[4].length * 2.25 + 3, 160 - x);
        var tx = Math.min(x, 160 - tw);
        var g = el("g", {}, svg);
        el("rect", { "class": "tagbg", x: tx, y: ty, width: tw, height: 4.4 }, g);
        var t = el("text", { "class": "tag", x: tx + 1.4, y: ty + 3.3, textLength: tw - 2.8, lengthAdjust: "spacingAndGlyphs" }, g);
        t.textContent = m[4];
      }
    });
    figure.appendChild(svg);
  }

  function show(card, row) {
    var figure = card.querySelector("[data-figure]");
    if (!figure) return;
    var name = row.getAttribute("data-shot");
    var shot = SHOTS[name] || { caption: name };
    var img = figure.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", function () {
        img.style.visibility = "hidden";
        var note = figure.querySelector(".missing") || document.createElement("div");
        note.className = "missing";
        note.textContent = "スクリーンショット準備中：" + img.getAttribute("data-name");
        figure.appendChild(note);
      });
      img.addEventListener("load", function () {
        img.style.visibility = "";
        var note = figure.querySelector(".missing");
        if (note) note.remove();
      });
      figure.appendChild(img);
    }
    if (img.getAttribute("data-name") !== name) {
      img.setAttribute("data-name", name);
      img.src = "shots/" + name + ".png";
      img.alt = shot.caption;
    }
    overlay(figure, row.getAttribute("data-marks"));
    var cap = card.querySelector(".shot-cap");
    if (!cap) {
      cap = document.createElement("figcaption");
      cap.className = "shot-cap";
      cap.innerHTML = "<span></span><small></small>";
      figure.after(cap);
    }
    cap.querySelector("span").textContent = shot.caption;
    cap.querySelector("small").textContent = row.querySelector(".what b") ? row.querySelector(".what b").textContent : "";
    card.querySelectorAll(".row.on").forEach(function (r) { r.classList.remove("on"); });
    row.classList.add("on");
  }

  function light(region, on) {
    document.querySelectorAll(".region[data-region='" + region + "']").forEach(function (r) {
      r.classList.toggle("lit", on);
    });
  }

  document.querySelectorAll(".card").forEach(function (card) {
    var rows = card.querySelectorAll(".row[data-shot]");
    if (!rows.length) return;
    rows.forEach(function (row) {
      row.tabIndex = 0;
      var pick = function () { show(card, row); };
      row.addEventListener("mouseenter", pick);
      row.addEventListener("focus", pick);
      row.addEventListener("click", pick);
      row.addEventListener("touchstart", pick, { passive: true });
    });
    show(card, rows[0]);
    var region = card.getAttribute("data-region");
    if (region) {
      card.addEventListener("mouseenter", function () { light(region, true); });
      card.addEventListener("mouseleave", function () { light(region, false); });
    }
  });

  /* ---- features: a row slides in once as it scrolls into view ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        seen.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach(function (r) { seen.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("is-in"); });
  }

  /* ---- features: the groups open and close on their heading; a link to a group (#f-song)
     opens it, and so does a link to anything inside one ---- */
  function setOpen(group, on) {
    group.classList.toggle("open", on);
    var btn = group.querySelector(".group-btn");
    if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
  }
  document.querySelectorAll(".group").forEach(function (group) {
    var btn = group.querySelector(".group-btn");
    if (!btn) return;
    btn.addEventListener("click", function () { setOpen(group, !group.classList.contains("open")); });
  });
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    var group = target && target.closest(".group");
    if (group) setOpen(group, true);
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();
})();
