/*
 * ravving's API reference: the theme switch, the sidebar and the search.
 * Copyright (C) 2026 Camilo Higuita <milo.h@aol.com>
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Copied into site/api/ by tools/build-api-docs.py, with nav.js (window.ravNav: the sidebar's
 * sections and pages) and search.js (window.ravSearch: [title, href, kind, brief] for every
 * class, page and member), both written from QDoc's index file. Without scripting the pages
 * still read: the class lists are on the landing and group pages.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var file = location.pathname.split("/").pop() || "index.html";

  // ---- light / dark: the choice is kept per browser; the default follows the system
  var toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ravving-api-theme", next); } catch (e) {}
    });
  }

  // ---- the sidebar: a section per area, the current page marked, its headings folded under it
  function buildNav() {
    var nav = document.getElementById("api-nav");
    if (!nav || !window.ravNav) return;
    var owner = file.replace(/-members[.]html$/, ".html");
    var current = null;
    window.ravNav.forEach(function (section) {
      var details = document.createElement("details");
      details.className = "nav-section";
      var summary = document.createElement("summary");
      summary.className = "mono";
      summary.textContent = section.label;
      details.appendChild(summary);
      var list = document.createElement("ul");
      var open = section.label === "Overview" || section.href === file;
      section.pages.forEach(function (page) {
        var item = document.createElement("li");
        var link = document.createElement("a");
        link.href = page.href;
        link.textContent = page.title;
        if (page.href === file || page.href === owner) {
          link.setAttribute("aria-current", "page");
          item.className = "on";
          current = link;
          open = true;
        }
        item.appendChild(link);
        list.appendChild(item);
      });
      details.open = open;
      details.appendChild(list);
      nav.appendChild(details);
    });
    // the page's own table of contents goes under its entry
    var panel = document.querySelector(".api-doc .sidebar");
    var contents = panel && panel.querySelector(".toc > ul");
    if (current && contents) {
      contents.className = "nav-toc";
      current.parentNode.appendChild(contents);
      panel.parentNode.removeChild(panel);
    }
    if (current) {
      var side = document.getElementById("api-side");
      if (side && current.offsetTop > side.clientHeight - 80) side.scrollTop = current.offsetTop - side.clientHeight / 3;
    }
  }

  // ---- the search: over search.js, ranked by where the words match
  function wireSearch() {
    var box = document.getElementById("api-search");
    var list = document.getElementById("api-results");
    if (!box || !list) return;
    if (!window.ravSearch) { box.parentNode.style.display = "none"; return; }
    var active = -1;
    function escapeHtml(t) { return t.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function mark(text, needle) {
      var at = text.toLowerCase().indexOf(needle);
      if (at < 0) return escapeHtml(text);
      return escapeHtml(text.slice(0, at)) + "<mark>" + escapeHtml(text.slice(at, at + needle.length)) + "</mark>" + escapeHtml(text.slice(at + needle.length));
    }
    function rank(entry, needle) {
      var title = entry[0].toLowerCase(), at = title.indexOf(needle);
      if (at < 0) return entry[3] && entry[3].toLowerCase().indexOf(needle) >= 0 ? 1 : 0;
      var score = 100 - at;
      if (at === 0) score += 100;
      var sep = title.lastIndexOf("::");
      if (sep >= 0 && at === sep + 2) score += 80;
      if (title === needle || title.slice(sep + 2) === needle) score += 120;
      if (entry[2] === "class" || entry[2] === "page") score += 40;
      return score - title.length / 5;
    }
    function close() { list.hidden = true; list.innerHTML = ""; active = -1; }
    function run() {
      var needle = box.value.trim().toLowerCase();
      if (needle.length < 2) return close();
      var hits = [];
      window.ravSearch.forEach(function (entry) { var s = rank(entry, needle); if (s > 0) hits.push([s, entry]); });
      hits.sort(function (a, b) { return b[0] - a[0]; });
      list.hidden = false;
      active = -1;
      if (!hits.length) { list.innerHTML = '<li class="none">nothing for “' + escapeHtml(box.value.trim()) + '”</li>'; return; }
      list.innerHTML = hits.slice(0, 24).map(function (h) {
        var e = h[1];
        return '<li><a href="' + e[1] + '"><span class="kind mono">' + e[2] + "</span><b>" + mark(e[0], needle) + "</b>" +
               (e[3] ? "<em>" + escapeHtml(e[3]) + "</em>" : "") + "</a></li>";
      }).join("");
    }
    function highlight(next) {
      var rows = list.querySelectorAll("a");
      if (!rows.length) return;
      if (active >= 0) rows[active].classList.remove("active");
      active = (next + rows.length) % rows.length;
      rows[active].classList.add("active");
      rows[active].scrollIntoView({ block: "nearest" });
    }
    box.addEventListener("input", run);
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
      else if (e.key === "Enter") {
        var rows = list.querySelectorAll("a"), pick = rows[active >= 0 ? active : 0];
        if (pick) { e.preventDefault(); location.href = pick.href; }
      } else if (e.key === "Escape") { box.value = ""; close(); box.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === "/" && !typing) || (e.key === "k" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); box.focus(); box.select(); }
    });
  }

  // ---- below the breakpoint the sidebar is a drawer
  function wireDrawer() {
    var opener = document.querySelector(".nav-toggle"), scrim = document.querySelector(".scrim");
    function drawer(open) { root.setAttribute("data-drawer", open ? "open" : "closed"); }
    if (opener) opener.addEventListener("click", function () { drawer(root.getAttribute("data-drawer") !== "open"); });
    if (scrim) scrim.addEventListener("click", function () { drawer(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") drawer(false); });
  }

  buildNav();
  wireSearch();
  wireDrawer();
})();
