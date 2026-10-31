/*
 * ravving on MIKO: the hardware shortcuts site.
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Six small interactions, nothing else: a shortcut card opens and closes on its heading (a
 * link to it, from the map, opens it), a shortcut row shows its screenshot in the card's
 * figure (with a frame around what to look at), hovering or focusing a card's rows lights the matching
 * region on the device artwork, a feature row slides in as it scrolls into view, a feature
 * group opens and closes on its heading, and the mixtape's tracks play a snippet on a tap. The
 * page reads fine with JavaScript off: the figures are then empty, the cards and their rows all
 * shown, the groups all open, the tracks hidden (html.no-js).
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
    "mods": { caption: "MODS を押したまま：ALL MODS" },
    "playing": { caption: "PLAY：ロック オン、再生位置が進行" },
    "song": { caption: "ソングページ" }
  };

  /* Frames over a screenshot, in percent of its width and height: [x, y, w, h, label].
     Several frames may share a name; the rest of the picture is dimmed. */
  var MARKS = {
    "bigknob-fader": [[15, 21.5, 5.2, 8.5, "音量 に大ノブのバッジ"]],
    "master": [[94, 6.3, 5.5, 10, "マスター"]],
    "header-group": [[1, 6.3, 10.5, 10, "フォーカス中のグループ"]],
    "fx-sends": [[44.7, 6.5, 13.5, 10, "FX センド 1 2 3"]],
    "note-readout": [[67, 40, 31, 5.5, "長さ · ベロシティ · ナッジ"], [5.8, 77.5, 11.8, 5, "選択中"]],
    "strip": [[10.5, 21.5, 10, 9.5, "ノブ 1 と 2 で パン · 音量"]],
    "mixer-strip": [[13.8, 21.5, 11.9, 77.5, "選んだストリップ"]],
    "menu-sliders": [[1.2, 69, 43, 20, "出力 2 · 明るさ 1"]],
    "recorder-gain": [[2.3, 29.4, 65.3, 12.5, "ゲイン"]],
    "mods-group": [[16.2, 32, 40.6, 14.2, "点灯したグループのノブ 1 2 3"]],
    "menu-drawer": [[0, 0, 45, 100, "コントロールセンター"]],
    "nameplate": [[2, 22.5, 7.8, 7.5, "ネームプレート"]],
    "mixer": [[0.6, 19, 98.8, 80, "ミキサー"]],
    "mode-lamp": [[69.8, 22, 14.6, 6.5, "ステップ · ライブ"]],
    "header-deck": [[12, 6.5, 32, 9.5, "セクションキー"]],
    "recorder-tabs": [[5.4, 8.3, 24.6, 4.4, "入力"], [1.9, 15, 66, 37.5, "パネル"]],
    "grid": [[1.5, 39.5, 97, 57, "グリッド"]],
    "livefx": [[12, 6.5, 32, 9.5, "LIVE FX 1–8"], [58.6, 6.5, 35.2, 10, "9–16"]],
    "sections": [[12, 6.5, 32, 9.5, "セクション"]],
    "pads": [[2.5, 33, 24.5, 49.5, "パッド"]],
    "cursor": [[69.8, 22, 6.8, 6.5, "ステップ"], [5.9, 38.5, 5.9, 54, "ステップ"]],
    "transport": [[36.5, 1.5, 28.5, 5.5, "プレート：再生中は LOOP"]],
    "playing": [[58.8, 1.5, 3.4, 5.5, "LOOP"], [3.2, 32.5, 3.2, 5, "ロック"], [17.6, 38.5, 5.9, 54, "再生位置"]],
    "strip-rec": [[20.5, 22, 3.2, 6.5, "ストリップの ●"]],
    "header-rec": [[36.5, 1.5, 28.5, 5.5, "ここに ● REC と経過時間"]],
    "video-card": [[33.2, 15.5, 11, 9.5, "LIVE REC"]],
    "メトロノーム": [[62.5, 1.5, 2.3, 5.5, "メトロノーム"]],
    "recorder-rec": [[1.2, 1, 3.3, 4, "● REC"], [69.5, 17, 29, 40, "録音"]],
    "walk": [[1.2, 21.5, 97.6, 8, "ストリップ"], [1.2, 38.5, 97.6, 54, "エディター"]],
    "side-keys": [[50, 33, 13.3, 5, "‹ 小節ページ ›"]],
    "undo": [[70.4, 1.5, 6.6, 5, "プロジェクトの ↶ ↷"], [83.4, 33, 6.6, 5, "マシンの ↶ ↷"]],
    "選択中": [[5.8, 77.5, 11.8, 5, "選択中"], [34.5, 33, 7.6, 5, "選択"]],
    "fx-bar": [[37, 23.5, 14.5, 5.8, "MODS · FXs"]],
    "song": [[3.4, 41, 58.5, 16.5, "セクションキー"], [3.6, 70.5, 93, 8.5, "ソングのブロック"]],
    "picker": [[2, 22.5, 7.8, 7.5, "ネームプレートで選択画面を開く"]],
    "strip-solo": [[90.2, 22, 3.6, 6.5, "S"]],
    "select-btn": [[34.5, 33, 7.6, 5, "選択"]],
    "plate": [[36.5, 1.5, 28.5, 5.5, "プロジェクトのプレート"]],
    "auto": [[76.4, 33, 6.6, 5, "オートメ"]]
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

  /* ---- shortcuts: a card is folded to its heading, which opens and closes it; a link to the
     card (a region of the map) opens it too; without JavaScript every card is open ---- */
  function setCardOpen(card, on) {
    card.classList.toggle("open", on);
    var btn = card.querySelector(".card-btn");
    if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
  }
  document.querySelectorAll(".card").forEach(function (card) {
    var title = card.querySelector(".card-head h3");
    var rowsList = card.querySelector(".rows");
    if (!title || !rowsList) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-btn";
    btn.setAttribute("aria-expanded", "false");
    rowsList.id = rowsList.id || "rows-" + card.id;
    btn.setAttribute("aria-controls", rowsList.id);
    while (title.firstChild) btn.appendChild(title.firstChild);
    title.appendChild(btn);
    var chev = document.createElement("span");
    chev.className = "chev";
    chev.setAttribute("aria-hidden", "true");
    card.querySelector(".card-head").appendChild(chev);
    btn.addEventListener("click", function () { setCardOpen(card, !card.classList.contains("open")); });
  });

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
      // the keyboard's way in: a focused row lights its region too
      card.addEventListener("focusin", function () { light(region, true); });
      card.addEventListener("focusout", function (e) { if (!card.contains(e.relatedTarget)) light(region, false); });
    }
  });

  /* ---- features: a picture not taken yet says so, as a card's figure does ---- */
  document.querySelectorAll(".screen img").forEach(function (img) {
    var pending = function () {
      var figure = img.parentNode;
      if (figure.querySelector(".missing")) return;
      img.style.visibility = "hidden";
      var note = document.createElement("div");
      note.className = "missing";
      note.textContent = "スクリーンショット準備中：" + img.getAttribute("src").replace(/^.*\//, "").replace(/\.[a-z]+$/, "");
      figure.appendChild(note);
    };
    img.addEventListener("error", pending);
    if (img.complete && !img.naturalWidth && img.getAttribute("src")) pending();
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
  function openId(id) {
    var target = id && document.getElementById(id);
    if (!target) return;
    var group = target.closest(".group");
    if (group && group.querySelector(".group-btn")) setOpen(group, true);
    var card = target.closest(".card");
    if (card) setCardOpen(card, true);
  }
  function openTarget() { openId(location.hash.slice(1)); }
  window.addEventListener("hashchange", openTarget);
  // a link to where the page already is fires no hashchange: open its target all the same
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='#']");
    if (a) openId(a.getAttribute("href").slice(1));
  });
  openTarget();

  /* ---- the mixtape's tracks: a tap plays a track's snippet, a second tap pauses it, another
     track takes over; nothing loads before the first tap ---- */
  var tracks = document.querySelectorAll(".track");
  if (tracks.length) {
    var player = new Audio();
    player.preload = "none";
    var playing = null;
    function setPlaying(btn) {
      if (playing && playing !== btn) {
        playing.setAttribute("aria-pressed", "false");
        playing.style.removeProperty("--p");
      }
      playing = btn;
      if (btn) btn.setAttribute("aria-pressed", "true");
    }
    tracks.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (playing === btn && !player.paused) {
          player.pause();
          btn.setAttribute("aria-pressed", "false");
          return;
        }
        if (playing !== btn) player.src = btn.dataset.src;
        setPlaying(btn);
        player.play().catch(function () { setPlaying(null); btn.setAttribute("aria-pressed", "false"); });
      });
    });
    player.addEventListener("timeupdate", function () {
      if (playing && player.duration) playing.style.setProperty("--p", player.currentTime / player.duration);
    });
    player.addEventListener("ended", function () {
      if (!playing) return;
      playing.setAttribute("aria-pressed", "false");
      playing.style.removeProperty("--p");
      playing = null;
    });
  }
})();
