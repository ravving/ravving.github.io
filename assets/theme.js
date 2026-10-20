/*
 * ravving's webpage: light or dark.
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Loaded in <head>, before the first paint: html[data-theme] takes the reader's choice, kept
 * under the API reference's own key so the whole site shares it, or else the system's (dark when
 * the system says nothing). The bar's .theme-toggle flips it. site.css's light set reads the
 * attribute; without scripting the page follows prefers-color-scheme and hides the switch.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "ravving-api-theme";
  var theme = null;
  try { theme = localStorage.getItem(KEY); } catch (e) {}
  if (theme !== "light" && theme !== "dark")
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  root.setAttribute("data-theme", theme);
  document.addEventListener("click", function (event) {
    var toggle = event.target.closest && event.target.closest(".theme-toggle");
    if (!toggle) return;
    theme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  });
}());
