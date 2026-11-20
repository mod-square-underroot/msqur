(function () {
  const works = window.WORKS || [], site = window.SITE || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const diary = $("diary"), pageEl = $("page"), progressEl = $("progress"), pauseBtn = $("pause");

  let work = null, mode = "read", seq = [], blockCount = 0, current = 0;
  const ctl = { run: 0, paused: false, skip: false };

  /* ---------- text helpers ---------- */
  const blocks = text => text.replace(/\r/g, "").trim().split(/\n\s*\n/);

  /* ---------- reading view ---------- */
  function renderRead() {
    document.title = `${work.title}${site.name ? " — " + site.name : ""}`;
    $("title").textContent = work.title;
    $("meta").textContent = `${work.form === "poem" ? "Poem" : "Prose"}${work.year ? ", " + work.year : ""}`;
    const body = $("body");
    body.innerHTML = "";
    blocks(work.text).forEach(b => {
      const p = document.createElement("p");
      if (work.form === "poem") b.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
        const line = document.createElement("span"); line.className = "line"; line.textContent = l; p.appendChild(line);
      });
      else p.textContent = b.replace(/\s*\n\s*/g, " ");
      body.appendChild(p);
    });
    $("reading").classList.toggle("poem", work.form === "poem");
  }

  /* ---------- fonts ---------- */
  const fontCache = {};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function loadFont(im) {
    if (im.fontUrl) {
      const name = "WorkFont-" + work.slug;
      fontCache[name] = fontCache[name] || new FontFace(name, `url("${im.fontUrl}")`).load()
        .then(f => document.fonts.add(f)).catch(() => console.warn("[reader] couldn't load", im.fontUrl));
      return Promise.race([fontCache[name], wait(3000)]).then(() => `"${name}"`);
    }
    if (im.font) {
      const fam = im.font;
      if (!fontCache[fam]) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(fam).replace(/%20/g, "+") + "&display=swap";
        document.head.appendChild(link);
        fontCache[fam] = new Promise(r => { link.onload = r; link.onerror = r; })
          .then(() => document.fonts.load(`1em "${fam}"`)).catch(() => {});
      }
      return Promise.race([fontCache[fam], wait(3000)]).then(() => `"${fam}"`);
    }
    return Promise.resolve(null);
  }

  /* ---------- the diary ---------- */
  function sleep(ms, run) {
    return new Promise(res => {
      let left = ms, last = performance.now();
      const id = setInterval(() => {
        const now = performance.now();
        if (!ctl.paused) left -= now - last;
        last = now;
        if (left <= 0 || ctl.skip || run !== ctl.run) { clearInterval(id); res(); }
      }, 20);
    });
  }

  /* Split a line into small phrases of 2–3 words, breaking at punctuation where it falls. */
  const PUNCT = /[,;:.!?…—–]["'”’)]*$/;
  // Split a line into phrases of minWords–maxWords words, breaking at punctuation if asked.
  function phrases(line, o) {
    const min = o.minWords, max = o.maxWords;
    const words = line.split(/\s+/).filter(Boolean), segments = [];
    let seg = [];
    words.forEach(w => { seg.push(w); if (o.breakAtPunctuation && PUNCT.test(w)) { segments.push(seg); seg = []; } });
    if (seg.length) segments.push(seg);
    const out = [];
    segments.forEach(sg => {
      const prev = out[out.length - 1];
      if (sg.length < min && prev && prev.length + sg.length <= max) { prev.push(...sg); return; }
      let i = 0, n = sg.length;
      while (n > 0) {
        const take = n <= max ? n : (n - max < min ? n - min : max);   // never leave a too-short tail
        out.push(sg.slice(i, i + take)); i += take; n -= take;
      }
    });
    return out.map(g => g.join(" "));
  }

  /* The whole piece as one stream of phrases. */
  function buildSequence(w, o) {
    const out = [], bl = blocks(w.text);
    bl.forEach((block, bi) => {
      const lines = w.form === "poem" ? block.split("\n").map(l => l.trim()).filter(Boolean) : [block.replace(/\s+/g, " ")];
      lines.forEach((line, li) => {
        const ps = phrases(line, o);
        ps.forEach((text, pi) => out.push({ text, block: bi, endBlock: li === lines.length - 1 && pi === ps.length - 1 }));
      });
    });
    blockCount = bl.length;
    return out;
  }

  /* Diary settings: built-in defaults < window.DIARY (site-wide, in data/works.js) < the piece's own `immersive` block. */
  const DEFAULTS = {
    minWords: 2, maxWords: 3, breakAtPunctuation: true,
    write: 2.5, gap: 3, breath: 1.5, keep: 3, fade: 1.8, pace: 1
  };
  function diarySettings(w) {
    const o = Object.assign({}, DEFAULTS, window.DIARY || {}, w.immersive || {});
    const num = (k, lo, hi) => { const v = Number(o[k]); o[k] = isFinite(v) ? Math.min(hi, Math.max(lo, v)) : DEFAULTS[k]; };
    num("minWords", 1, 30); num("maxWords", 1, 30); num("write", 0.1, 30); num("gap", 0, 60);
    num("breath", 0, 60); num("keep", 1, 50); num("fade", 0.1, 30); num("pace", 0.1, 10);
    o.minWords = Math.round(o.minWords); o.maxWords = Math.max(o.minWords, Math.round(o.maxWords)); o.keep = Math.round(o.keep);
    o.breakAtPunctuation = o.breakAtPunctuation !== false;
    // pace scales every timing at once
    ["write", "gap", "breath", "fade"].forEach(k => { o[k] *= o.pace; });
    return o;
  }
  let opts = diarySettings({});

  /* Find a free spot on the page that doesn't overlap anything still visible. */
  function place(text, cls) {
    const el = document.createElement("span");
    el.className = "phrase" + (cls ? " " + cls : "");
    el.textContent = text;
    pageEl.appendChild(el);
    const W = pageEl.clientWidth, H = pageEl.clientHeight;
    if (el.offsetWidth > W) { el.style.whiteSpace = "normal"; el.style.width = W + "px"; }
    const w = el.offsetWidth, h = el.offsetHeight, pad = 16;
    const others = [...pageEl.querySelectorAll(".phrase")].filter(o => o !== el).map(o => {
      const x = parseFloat(o.dataset.x), y = parseFloat(o.dataset.y);
      return { x, y, r: x + o.offsetWidth, b: y + o.offsetHeight };
    });
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < 80; t++) {
      const x = Math.random() * Math.max(0, W - w), y = Math.random() * Math.max(0, H - h);
      let overlap = 0, nearest = Infinity;
      others.forEach(o => {
        const ox = Math.max(0, Math.min(x + w + pad, o.r + pad) - Math.max(x - pad, o.x - pad));
        const oy = Math.max(0, Math.min(y + h + pad, o.b + pad) - Math.max(y - pad, o.y - pad));
        overlap += ox * oy;
        nearest = Math.min(nearest, Math.hypot((x + w / 2) - (o.x + o.r) / 2, (y + h / 2) - (o.y + o.b) / 2));
      });
      // no overlap first; among free spots, a little preference for breathing room
      const score = -overlap * 1000 + Math.min(nearest, W / 2) + Math.random() * 80;
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    el.dataset.x = best.x; el.dataset.y = best.y;
    el.style.left = (best.x / W * 100) + "%";
    el.style.top = (best.y / H * 100) + "%";
    return el;
  }

  function sink(el) {
    if (!el || el.classList.contains("sink")) return;
    el.classList.add("sink");
    setTimeout(() => el.remove(), opts.fade * 1000 + 400);
  }

  function drawProgress() {
    progressEl.innerHTML = Array.from({ length: blockCount }, (_, i) =>
      `<i class="${i < current ? "done" : i === current ? "now" : ""}"></i>`).join("");
  }

  async function play(from = 0) {
    const run = ++ctl.run;
    ctl.paused = false; ctl.skip = false; pauseBtn.textContent = "Pause";
    diary.classList.remove("paused");
    pageEl.innerHTML = "";
    diary.style.setProperty("--dur", opts.write.toFixed(2) + "s");
    diary.style.setProperty("--fade", opts.fade.toFixed(2) + "s");
    const shown = [];
    await sleep(800, run);

    for (let i = from; i < seq.length; i++) {
      if (run !== ctl.run) return;
      const item = seq[i];
      current = item.block; drawProgress();

      ctl.skip = false;
      const el = place(item.text);
      el.classList.add("on");
      await sleep(opts.write * 1000, run);           // writing...
      if (run !== ctl.run) return;
      if (ctl.skip) { ctl.skip = false; el.classList.add("fast"); await sleep(350, run); }

      shown.push(el);
      if (shown.length >= opts.keep) sink(shown[shown.length - opts.keep]);
      if (i === seq.length - 1) break;

      ctl.skip = false;
      await sleep((opts.gap + (item.endBlock ? opts.breath : 0)) * 1000, run);
      if (run !== ctl.run) return;
    }

    current = blockCount; drawProgress();
    ctl.skip = false;
    await sleep(opts.gap * 1000, run);
    if (run !== ctl.run) return;
    const fin = place("fin", "fin");
    fin.classList.add("on");
  }

  function applyTheme(im) {
    const set = (k, v) => v && diary.style.setProperty(k, v);
    diary.removeAttribute("style");
    set("--d-paper", im.paper); set("--d-ink", im.ink); set("--d-size", im.size);
    document.body.style.setProperty("--d-ink-bar", im.ink || "");
    document.body.style.setProperty("--d-paper-bar", im.paper || "");
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
    document.body.classList.toggle("is-immersive", m === "immerse");
    const im = work.immersive || {};
    if (m === "immerse") {
      applyTheme(im);
      opts = diarySettings(work);
      seq = buildSequence(work, opts);
      pageEl.innerHTML = "";
      drawProgress();
      Sound.play(im.music || "synth:candlelight");
      const run = ++ctl.run;
      loadFont(im).then(fam => {
        if (run !== ctl.run || mode !== "immerse") return;
        if (fam) diary.style.setProperty("--d-font", `${fam}, var(--script)`);
        play(0);
      });
    } else {
      ctl.run++;
      Sound.stop(1.2);
      document.body.style.removeProperty("--d-ink-bar");
      document.body.style.removeProperty("--d-paper-bar");
    }
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));
  pageEl.addEventListener("click", () => { ctl.skip = true; });
  $("next").addEventListener("click", () => { if (ctl.paused) togglePause(); ctl.skip = true; });
  $("restart").addEventListener("click", () => play(0));
  pauseBtn.addEventListener("click", togglePause);
  function togglePause() {
    ctl.paused = !ctl.paused;
    pauseBtn.textContent = ctl.paused ? "Resume" : "Pause";
    diary.classList.toggle("paused", ctl.paused);
  }
  addEventListener("keydown", e => {
    if (mode !== "immerse" || e.target.closest("button, a")) return;
    if (e.key === " ") { e.preventDefault(); togglePause(); }
    else if (e.key === "ArrowRight" || e.key === "Enter") ctl.skip = true;
    else if (e.key === "Escape") setMode("read");
  });

  function load() {
    const slug = decodeURIComponent(location.hash.slice(1));
    work = works.find(w => w.slug === slug) || works[0];
    if (!work) { $("title").textContent = "Nothing to read yet"; $("body").textContent = "Add a piece in data/works.js."; return; }
    if (mode === "immerse") setMode("read");
    renderRead();
    window.scrollTo(0, 0);
  }
  addEventListener("hashchange", load);
  load();
})();
