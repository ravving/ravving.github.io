/*
 * ravving on MIKO: the landing's jam (strategy.md S6), a LIVE REC take over the drawn screen.
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * It plays muted and looping while on screen (a still with reduced motion, until SOUND ON);
 * SOUND ON plays it with its sound, SOUND OFF mutes it again. The drawing's PLAY key plays and
 * pauses it and STOP stops it at the start with the screen dark; once paused by hand it stays paused
 * when scrolled back. While it isn't playing, the page keys 1–5 and ✱ show that page on the screen.
 * Without JavaScript the poster stays and the SOUND key stays hidden.
 */
(function () {
  "use strict";
  var jam = document.querySelector(".bp-video");
  var sound = document.querySelector(".bp-sound");
  if (!jam || !sound) return;

  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var held = false;   // paused or stopped with the drawing's keys
  var stage = jam.closest(".landing-stage");
  var play = function () { var p = jam.play(); if (p && p.catch) p.catch(function () {}); };
  jam.addEventListener("play", function () { stage.classList.add("is-playing"); stage.classList.remove("is-stopped"); });
  jam.addEventListener("pause", function () { stage.classList.remove("is-playing"); });

  // the drawing's step keys follow the jam while it plays with its sound: 58 BPM, sixteen steps a
  // bar, the clip cut on the first beat
  var STEP = 60 / 58 / 4;
  var steps = stage.querySelectorAll(".bp .step");
  var lit = -1, ticking = false;
  var light = function (n) {
    if (n === lit) return;
    if (lit >= 0 && steps[lit]) steps[lit].classList.remove("on");
    if (n >= 0 && steps[n]) steps[n].classList.add("on");
    lit = n;
  };
  var tick = function () {
    if (jam.paused || jam.muted) { light(-1); ticking = false; return; }
    light(Math.floor(jam.currentTime / STEP) % 16);
    requestAnimationFrame(tick);
  };
  var follow = function () {
    if (!jam.paused && !jam.muted && !ticking) { ticking = true; requestAnimationFrame(tick); }
    if (jam.paused || jam.muted) light(-1);
  };
  ["play", "pause", "volumechange", "seeked"].forEach(function (name) { jam.addEventListener(name, follow); });

  var playKey = stage.querySelector(".bp-play");
  var stopKey = stage.querySelector(".bp-stop");
  if (playKey) playKey.addEventListener("click", function () {
    held = !jam.paused;
    if (held) jam.pause(); else play();
  });
  if (stopKey) stopKey.addEventListener("click", function () {
    held = true;
    jam.pause();
    jam.currentTime = 0;
    stage.classList.add("is-stopped");   // the screen goes dark, as when the MIKO stops
    hidePage();
  });

  sound.hidden = false;
  sound.addEventListener("click", function () {
    var on = jam.muted;
    jam.muted = !on;
    sound.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) { held = false; play(); }
    else if (still) jam.pause();
  });

  // HEAR A DEMO in the hero: the jam from the start, with its sound, brought into view
  var hear = document.querySelector(".landing-hear");
  if (hear) {
    hear.hidden = false;
    hear.addEventListener("click", function () {
      held = false;
      jam.currentTime = 0;
      jam.muted = false;
      sound.setAttribute("aria-pressed", "true");
      play();
      jam.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    });
  }

  // the page keys (1–5, ✱): while the jam isn't playing, the screen shows that page; pressed
  // again, 1 and 5 show their second machine, as on the MIKO. PLAY puts the jam back.
  var shown = stage.querySelector(".bp-page");
  var base = (document.documentElement.getAttribute("lang") || "en") === "en" ? "" : "../";
  var hidePage = function () { if (shown) { shown.hidden = true; shown.removeAttribute("data-shot"); } };
  stage.querySelectorAll(".bp-page-key").forEach(function (key) {
    key.addEventListener("click", function () {
      if (!shown || !jam.paused) return;
      var pages = key.getAttribute("data-pages").split(" ");
      var at = pages.indexOf(shown.getAttribute("data-shot"));
      var next = pages[(at + 1) % pages.length];
      shown.src = base + "media/pages/" + next + ".webp";
      shown.alt = key.getAttribute("aria-label");
      shown.setAttribute("data-shot", next);
      shown.hidden = false;
      stage.classList.remove("is-stopped");
    });
  });
  jam.addEventListener("play", hidePage);

  // the glass catches the light as the pointer moves over the MIKO, as if it were tilted
  var glass = stage.querySelector(".bp-glass");
  if (glass && !still) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      glass.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 0.6 + 0.05).toFixed(3));
      glass.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 0.5 + 0.05).toFixed(3));
    });
    stage.addEventListener("pointerleave", function () {
      glass.style.removeProperty("--gx");
      glass.style.removeProperty("--gy");
    });
  }

  if (!still) play();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) jam.pause();
      else if (!held && (!still || !jam.muted)) play();
    }, { threshold: 0.25 }).observe(jam);
  }
})();
