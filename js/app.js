(function () {
  "use strict";

  var FILMS = window.FILMS;
  var QUESTIONS = window.QUESTIONS;
  var PER_REEL = 4;
  var RANK_LABELS = ["Feature Presentation", "Second Feature", "The Midnight Show", "Late, Late Show", "Bonus Reel"];
  var GENRE_COLORS = [
    ["vampire", "#5b0a14"], ["werewolf", "#3d2a14"], ["zombie", "#2f3a1a"], ["ghost", "#1f2c3a"],
    ["slasher", "#4a0d0d"], ["occult", "#3a0f2e"], ["scifi", "#0f2f33"], ["creature", "#13321f"],
    ["classicmonster", "#262b1a"], ["folk", "#3a2f12"], ["giallo", "#4d0a2a"], ["comedy", "#3d2a05"],
    ["psych", "#22223a"]
  ];

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var answers = [];
  var current = 0;

  var $ = function (sel) { return document.querySelector(sel); };
  var screens = { title: $("#screen-title"), leader: $("#screen-leader"), quiz: $("#screen-quiz"), results: $("#screen-results") };

  /* ---------- Scoring ---------- */

  function eraOf(y) {
    if (y < 1930) return "era:silent";
    if (y < 1950) return "era:golden";
    if (y < 1960) return "era:atomic";
    if (y < 1970) return "era:sixties";
    if (y < 1980) return "era:seventies";
    return "era:eighties";
  }

  function tagSet(f) {
    var s = {};
    f.tags.split(/\s+/).forEach(function (t) { s[t] = true; });
    s[eraOf(f.y)] = true;
    s[f.bw ? "bw" : "color"] = true;
    if (f.lang === "silent") s.silent = true;
    if (f.lang === "subs") s.subs = true;
    s["gore" + f.g] = true;
    s["int" + f.i] = true;
    s[f.r < 90 ? "short" : f.r <= 115 ? "mid" : "long"] = true;
    s[f.cult ? "deepcut" : "canon"] = true;
    return s;
  }

  FILMS.forEach(function (f) { f.tagSet = tagSet(f); });

  function scoreFilm(f) {
    var total = 0;
    var reasons = [];
    QUESTIONS.forEach(function (q, qi) {
      var opt = q.o[answers[qi]];
      if (!opt) return;
      var plus = 0;
      Object.keys(opt.w).forEach(function (tag) {
        if (f.tagSet[tag]) {
          total += opt.w[tag];
          if (opt.w[tag] > 0) plus += opt.w[tag];
        }
      });
      if (plus > 0 && opt.why) reasons.push({ why: opt.why, pts: plus });
    });
    reasons.sort(function (a, b) { return b.pts - a.pts; });
    return { film: f, score: total, reasons: reasons.slice(0, 3).map(function (r) { return r.why; }) };
  }

  // The most any film could earn: the best single weight of every chosen option.
  function bestPossible() {
    return QUESTIONS.reduce(function (sum, q, qi) {
      var w = q.o[answers[qi]].w;
      var best = Object.keys(w).reduce(function (m, k) { return Math.max(m, w[k]); }, 0);
      return sum + best;
    }, 0);
  }

  function recommend() {
    var ranked = FILMS.map(scoreFilm).sort(function (a, b) {
      return b.score - a.score || a.film.y - b.film.y;
    });
    var picks = [];
    var groups = {};
    for (var i = 0; i < ranked.length && picks.length < 5; i++) {
      var r = ranked[i];
      if (r.film.grp && groups[r.film.grp]) continue;
      // Always fill three slots; the fourth and fifth must be close contenders.
      if (picks.length >= 3 && r.score < picks[0].score * 0.8) break;
      if (r.film.grp) groups[r.film.grp] = true;
      picks.push(r);
    }
    var max = Math.max(bestPossible(), 1);
    picks.forEach(function (p) {
      var pct = Math.round(100 * Math.sqrt(Math.max(p.score, 0) / max));
      p.match = Math.max(13, Math.min(99, pct));
    });
    return picks;
  }

  /* ---------- Screens ---------- */

  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    window.scrollTo(0, 0);
  }

  function startShow() {
    answers = [];
    current = 0;
    history.replaceState(null, "", location.pathname + location.search);
    if (reduceMotion) { renderQuestion(); show("quiz"); return; }
    runLeader(function () { renderQuestion(); show("quiz"); });
  }

  // Academy-style countdown leader
  var leaderTimer = null;
  function runLeader(done) {
    show("leader");
    var num = $("#leader-num");
    var sweep = $("#leader-sweep");
    var n = 3;
    var start = performance.now();
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(leaderTimer);
      screens.leader.removeEventListener("click", finish);
      done();
    }
    screens.leader.addEventListener("click", finish);
    function tick(now) {
      var t = (now - start) / 800;
      var count = n - Math.floor(t);
      if (count < 1) { finish(); return; }
      num.textContent = count;
      sweep.style.setProperty("--sweep", ((t % 1) * 360).toFixed(1) + "deg");
      leaderTimer = requestAnimationFrame(tick);
    }
    leaderTimer = requestAnimationFrame(tick);
    projector.blip();
  }

  function renderStrip() {
    var strip = $("#filmstrip");
    strip.innerHTML = "";
    QUESTIONS.forEach(function (_, i) {
      var cell = document.createElement("span");
      cell.className = "frame" + (answers[i] !== undefined ? " exposed" : "") + (i === current ? " current" : "");
      strip.appendChild(cell);
    });
    strip.setAttribute("aria-valuenow", String(answers.filter(function (a) { return a !== undefined; }).length));
  }

  function renderQuestion() {
    var q = QUESTIONS[current];
    var card = $("#intertitle");
    $("#reel-label").textContent = "Reel " + (Math.floor(current / PER_REEL) + 1) + " of " + Math.ceil(QUESTIONS.length / PER_REEL);
    $("#q-count").textContent = "Intertitle No. " + (current + 1) + " / " + QUESTIONS.length;
    $("#q-text").textContent = q.q;
    $("#host-quip").textContent = (window.HOST_LINES || [])[current] || "";
    // The zombie surfaces every few cards, never on two in a row
    $(".zombie-card").classList.toggle("up", current % 3 === 2);

    var list = $("#options");
    list.innerHTML = "";
    q.o.forEach(function (opt, oi) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option" + (answers[current] === oi ? " chosen" : "");
      btn.innerHTML = '<span class="key">' + (oi + 1) + '</span><span class="label"></span>';
      btn.querySelector(".label").textContent = opt.l;
      btn.addEventListener("click", function () { choose(oi); });
      list.appendChild(btn);
    });

    $("#btn-back").disabled = current === 0;
    renderStrip();

    if (!reduceMotion) {
      card.classList.remove("splice");
      void card.offsetWidth;
      card.classList.add("splice");
    }
    var first = list.querySelector(".chosen") || list.querySelector(".option");
    if (first) first.focus({ preventScroll: true });
  }

  function choose(oi) {
    answers[current] = oi;
    projector.blip();
    if (current < QUESTIONS.length - 1) {
      current++;
      renderQuestion();
    } else {
      finishSurvey();
    }
  }

  function back() {
    if (current > 0) { current--; renderQuestion(); }
  }

  function finishSurvey() {
    history.replaceState(null, "", "#bill=" + encodeAnswers());
    renderResults();
    show("results");
  }

  function encodeAnswers() { return answers.map(function (a) { return a.toString(36); }).join(""); }

  function decodeAnswers(str) {
    if (!str || str.length !== QUESTIONS.length) return null;
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var v = parseInt(str[i], 36);
      if (isNaN(v) || v >= QUESTIONS[i].o.length) return null;
      out.push(v);
    }
    return out;
  }

  function genreColor(f) {
    for (var i = 0; i < GENRE_COLORS.length; i++) {
      if (f.tagSet[GENRE_COLORS[i][0]]) return GENRE_COLORS[i][1];
    }
    return "#2a1a10";
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderResults() {
    var picks = recommend();
    var list = $("#bill");
    list.innerHTML = "";
    $("#bill-count").textContent = ["", "", "", "Triple", "Quadruple", "Quintuple"][picks.length] + " Feature";

    picks.forEach(function (p, i) {
      var f = p.film;
      var card = el("li", "poster");
      card.style.setProperty("--tint", genreColor(f));
      card.style.setProperty("--delay", (i * 0.15) + "s");

      card.appendChild(el("p", "billing", RANK_LABELS[i]));
      card.appendChild(el("h3", "poster-title", f.t));
      card.appendChild(el("p", "credits", "Directed by " + f.d));

      var facts = el("p", "facts");
      [String(f.y), f.c, f.r + " min", f.bw ? "Black & White" : "Colour",
        f.lang === "silent" ? "Silent" : f.lang === "subs" ? "Subtitled" : null]
        .filter(Boolean).forEach(function (txt) { facts.appendChild(el("span", null, txt)); });
      card.appendChild(facts);

      card.appendChild(el("p", "blurb", f.b));

      var meter = el("div", "meter");
      meter.setAttribute("role", "img");
      meter.setAttribute("aria-label", "Fright match " + p.match + " percent");
      var fill = el("span", "meter-fill");
      fill.style.setProperty("--pct", p.match + "%");
      meter.appendChild(fill);
      var meterRow = el("div", "meter-row");
      meterRow.appendChild(el("span", "meter-label", "Fright match"));
      meterRow.appendChild(meter);
      meterRow.appendChild(el("span", "meter-pct", p.match + "%"));
      card.appendChild(meterRow);

      if (p.reasons.length) {
        card.appendChild(el("p", "why-head", "Why it's on your bill"));
        var ul = el("ul", "why");
        p.reasons.forEach(function (r) { ul.appendChild(el("li", null, r)); });
        card.appendChild(ul);
      }

      var links = el("p", "links");
      var q = encodeURIComponent(f.t + " " + f.y);
      [["Letterboxd", "https://letterboxd.com/search/films/" + q + "/"],
        ["Wikipedia", "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(f.t + " " + f.y + " film")],
        ["Where to watch", "https://www.justwatch.com/us/search?q=" + encodeURIComponent(f.t)]]
        .forEach(function (l) {
          var a = el("a", null, l[0]);
          a.href = l[1];
          a.target = "_blank";
          a.rel = "noopener";
          links.appendChild(a);
        });
      card.appendChild(links);

      list.appendChild(card);
    });

    $("#btn-share").dataset.text = "My Midnight Matinee Halloween bill:\n" +
      picks.map(function (p, i) { return (i + 1) + ". " + p.film.t + " (" + p.film.y + ")"; }).join("\n");
  }

  function share() {
    var btn = $("#btn-share");
    var text = btn.dataset.text + "\n" + location.href;
    var done = function () { btn.textContent = "Copied to clipboard!"; setTimeout(function () { btn.textContent = "Share my bill"; }, 2200); };
    if (navigator.share) {
      navigator.share({ title: "Midnight Matinee", text: btn.dataset.text, url: location.href }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy your bill:", text); });
    } else {
      window.prompt("Copy your bill:", text);
    }
  }

  /* ---------- Projector sound (optional, off by default) ---------- */

  var projector = (function () {
    var ctx = null, gain = null, on = false;
    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      var band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1400;
      band.Q.value = 0.8;
      // A 24 fps flutter: the shutter clatter of a film projector
      var flutter = ctx.createGain();
      flutter.gain.value = 0.5;
      var lfo = ctx.createOscillator();
      lfo.type = "square";
      lfo.frequency.value = 24;
      var depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(flutter.gain);
      gain = ctx.createGain();
      gain.gain.value = 0;
      noise.connect(band).connect(flutter).connect(gain).connect(ctx.destination);
      noise.start();
      lfo.start();
    }
    return {
      toggle: function () {
        if (!ctx) build();
        on = !on;
        if (ctx.state === "suspended") ctx.resume();
        gain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.15);
        return on;
      },
      blip: function () {
        if (!on || !ctx) return;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.frequency.value = 1000;
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.13);
      }
    };
  })();

  /* ---------- Wiring ---------- */

  $("#btn-start").addEventListener("click", startShow);
  $("#btn-back").addEventListener("click", back);
  $("#btn-restart").addEventListener("click", startShow);
  $("#btn-share").addEventListener("click", share);
  $("#btn-sound").addEventListener("click", function () {
    var on = projector.toggle();
    this.setAttribute("aria-pressed", String(on));
    this.querySelector(".sound-state").textContent = on ? "On" : "Off";
  });

  document.addEventListener("keydown", function (e) {
    if (screens.quiz.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= QUESTIONS[current].o.length) { e.preventDefault(); choose(n - 1); }
    else if (e.key === "Backspace" || e.key === "ArrowLeft") { e.preventDefault(); back(); }
  });

  // A shared link (#bill=...) opens straight onto that bill
  var m = location.hash.match(/^#bill=([0-9a-z]+)$/i);
  var shared = m && decodeAnswers(m[1].toLowerCase());
  if (shared) {
    answers = shared;
    renderResults();
    show("results");
  } else {
    show("title");
  }
})();
