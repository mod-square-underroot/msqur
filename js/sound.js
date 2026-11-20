/* Sound engine: one switch for the whole site.
   - Remembers on/off in the visitor's browser.
   - Browsers only allow audio after a click/tap, so "on" waits for the first one.
   - Tracks: "tune:retro" (homepage), "synth:<mood>" (built-in moods),
     or a path to your own audio file. */
(function () {
  const KEY = "msur.sound";
  const subs = new Set();
  let ctx = null, out = null, current = null, wanted = null, hiddenSuspend = false;
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) {}

  /* ---------- context ---------- */
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.85;
      out.connect(ctx.destination);
      ctx.onstatechange = () => { notify(); if (ctx.state === "running") start(); };
    }
    if (ctx.state === "suspended" && !hiddenSuspend) ctx.resume().catch(() => {});
    return ctx;
  }
  const running = () => ctx && ctx.state === "running";
  function state() { return !enabled ? "off" : running() ? "on" : "waiting"; }
  function notify() { const s = state(); subs.forEach(f => f(s)); }

  /* ---------- small helpers ---------- */
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function gain(v, dest) { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  function osc(type, freq) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; }
  function filter(type, freq, q) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; return f; }

  function noiseBuffer(seconds, kind) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else if (kind === "crackle") {
        d[i] = w * 0.012;
        if (Math.random() < 0.00035) { const a = (Math.random() * 2 - 1) * 0.7; for (let k = 0; k < 24 && i + k < len; k++) d[i + k] += a * Math.exp(-k / 3); }
      } else d[i] = w;
    }
    return buf;
  }
  function loop(buf, dest) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(); return s; }

  function reverb(seconds, decay, wet, dest) {
    const c = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    c.buffer = buf;
    c.connect(gain(wet, dest));
    return c;
  }

  /* An old-radio chain: band-limited, a little saturated, with tape wobble. */
  function radio(dest, nodes) {
    const hp = filter("highpass", 170), lp = filter("lowpass", 3000, 0.4);
    const sh = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    sh.curve = curve;
    const dl = ctx.createDelay(0.05); dl.delayTime.value = 0.007;
    const wow = osc("sine", 0.55), wowG = gain(0.0016); wow.connect(wowG).connect(dl.delayTime);
    const flut = osc("sine", 6.5), flutG = gain(0.00015); flut.connect(flutG).connect(dl.delayTime);
    wow.start(); flut.start(); nodes.push(wow, flut);
    hp.connect(sh).connect(lp).connect(dl).connect(dest);
    return hp;
  }

  /* ---------- instruments ---------- */
  function epiano(dest, t, m, dur, v) {
    const f = mtof(m), g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    const a = osc("sine", f), b = osc("triangle", f * 2), tine = osc("sine", f * 7.02);
    const bg = gain(0.18), tg = ctx.createGain();
    tg.gain.setValueAtTime(0.06, t); tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
    a.connect(g); b.connect(bg).connect(g); tine.connect(tg).connect(g); g.connect(dest);
    [a, b, tine].forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
  }
  function bell(dest, t, m, dur, v) {
    const f = mtof(m), g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    const a = osc("sine", f), b = osc("sine", f * 4.01), c = osc("sine", f * 2.98);
    const bg = gain(0.12), cg = gain(0.06);
    const trem = osc("sine", 5.2), tremG = gain(v * 0.25); trem.connect(tremG).connect(g.gain);
    a.connect(g); b.connect(bg).connect(g); c.connect(cg).connect(g); g.connect(dest);
    [a, b, c, trem].forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
  }
  function bass(dest, t, m, dur, v) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    const a = osc("sine", mtof(m)), b = osc("triangle", mtof(m)), bg = gain(0.3);
    a.connect(g); b.connect(bg).connect(g); g.connect(dest);
    [a, b].forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
  }
  function pad(dest, t, notes, dur, v) {
    const lp = filter("lowpass", 850, 0.6); lp.connect(dest);
    const g = ctx.createGain(); g.connect(lp);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + dur * 0.35);
    g.gain.setValueAtTime(v, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    notes.forEach(m => [-7, 7].forEach(cents => {
      const o = osc("sawtooth", mtof(m)); o.detune.value = cents; o.connect(g);
      o.start(t); o.stop(t + dur + 0.1);
    }));
  }

  /* ---------- tracks ---------- */
  function scheduler(fn) { const id = setInterval(fn, 40); fn(); return () => clearInterval(id); }

  function makeTrack(desc) {
    const nodes = [], stops = [];
    const master = gain(0, out);
    let fileEl = null;

    function fadeIn(to, s) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + s); }

    if (desc === "tune:retro") {
      // A slow 12/8 doo-wop lullaby, I–vi–IV–V, coming out of a little TV speaker.
      const bus = gain(1);
      bus.connect(radio(master, nodes));
      bus.connect(reverb(2.4, 3, 0.22, master));
      nodes.push(loop(noiseBuffer(3, "crackle"), (() => { const f = filter("highpass", 900); f.connect(gain(0.5, master)); return f; })()));
      const chords = [
        [48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]],
        [41, [57, 60, 64, 65]], [43, [55, 59, 62, 65]]
      ];
      const pat = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1];
      const mel = [
        [[76, 0, 5], [74, 5, 1], [72, 6, 3], [71, 9, 3]],
        [[72, 0, 6], [69, 6, 3], [72, 9, 3]],
        [[77, 0, 5], [76, 5, 1], [74, 6, 3], [72, 9, 3]],
        [[74, 0, 9], [71, 9, 3]],
        [[76, 0, 5], [79, 5, 1], [81, 6, 6]],
        [[79, 0, 6], [76, 6, 3], [72, 9, 3]],
        [[77, 0, 3], [76, 3, 3], [74, 6, 3], [72, 9, 3]],
        [[74, 0, 6], [71, 6, 3], [67, 9, 3]]
      ];
      const e = 60 / 54 / 3;
      let step = 0, next = ctx.currentTime + 0.15;
      stops.push(scheduler(() => {
        while (next < ctx.currentTime + 0.3) {
          const bar = Math.floor(step / 12) % 8, i = step % 12, ch = chords[bar % 4];
          epiano(bus, next, ch[1][pat[i]] - 12, e * 2.6, i % 3 === 0 ? 0.075 : 0.05);
          if (i === 0 || i === 6) bass(bus, next, ch[0] - 12, e * 5.5, 0.2);
          mel[bar].forEach(([m, s, l]) => { if (s === i) bell(bus, next, m, Math.max(0.6, l * e * 1.25), 0.11); });
          next += e; step++;
        }
      }));
      fadeIn(1.1, 1.2);
    }

    else if (desc && desc.startsWith("synth:")) {
      const mood = desc.slice(6);
      const bus = gain(1);
      bus.connect(gain(1, master));
      bus.connect(reverb(mood === "musicbox" ? 4 : 3, 2.5, 0.45, master));
      const crackle = filter("highpass", 1200); crackle.connect(gain(mood === "rain" ? 0.15 : 0.35, master));
      nodes.push(loop(noiseBuffer(3, "crackle"), crackle));

      const progression = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 55, 59, 64], [52, 55, 59, 62]];
      const padLevel = mood === "candlelight" ? 0.05 : 0.02;
      const chordLen = 8;
      let ci = 0, nextChord = ctx.currentTime + 0.1;

      if (mood === "rain") {
        const rlp = filter("lowpass", 1100); rlp.connect(gain(0.5, master));
        nodes.push(loop(noiseBuffer(4, "brown"), rlp));
        const hiss = filter("bandpass", 5200, 0.8); hiss.connect(gain(0.035, master));
        nodes.push(loop(noiseBuffer(2), hiss));
      }
      let nextDrop = ctx.currentTime + 0.5, nextBox = ctx.currentTime + 1, walk = 3;
      const scale = [67, 69, 72, 74, 76, 79, 81, 84, 86, 88];

      stops.push(scheduler(() => {
        const now = ctx.currentTime;
        while (nextChord < now + 0.3) {
          pad(bus, nextChord, progression[ci % progression.length], chordLen + 2, padLevel);
          ci++; nextChord += chordLen;
        }
        if (mood === "rain") while (nextDrop < now + 0.3) {
          bell(bus, nextDrop, 84 + Math.floor(Math.random() * 14), 0.08, 0.012);
          nextDrop += 0.08 + Math.random() * 0.35;
        }
        if (mood === "musicbox") while (nextBox < now + 0.3) {
          if (Math.random() < 0.7) {
            walk = Math.max(0, Math.min(scale.length - 1, walk + Math.floor(Math.random() * 5) - 2));
            bell(bus, nextBox, scale[walk], 2.2, 0.1);
          }
          nextBox += 0.42 * (Math.random() < 0.2 ? 2 : 1);
        }
      }));
      fadeIn(0.9, 3);
    }

    else if (desc) {
      // Your own audio file. Volume fades by hand so it also works when opened from disk.
      fileEl = new Audio(desc);
      fileEl.loop = true; fileEl.volume = 0;
      let failed = false;
      const fallback = () => {
        if (failed) return; failed = true;
        console.warn("[sound] couldn't play", desc, "- using a built-in mood instead.");
        if (current && current.desc === desc) { current.stop(0.2); current = makeTrack("synth:candlelight"); current.desc = desc; }
      };
      fileEl.addEventListener("error", fallback);
      fileEl.play().catch(fallback);
      let v = 0;
      const id = setInterval(() => { v = Math.min(0.85, v + 0.03); fileEl.volume = v; if (v >= 0.85) clearInterval(id); }, 60);
      stops.push(() => clearInterval(id));
    }

    return {
      desc,
      stop(fade = 0.8) {
        stops.forEach(f => f());
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0, t + fade);
        setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); master.disconnect(); }, fade * 1000 + 100);
        if (fileEl) {
          const el = fileEl, step = el.volume / Math.max(1, fade * 16);
          const id = setInterval(() => { el.volume = Math.max(0, el.volume - step); if (el.volume <= 0.001) { el.pause(); clearInterval(id); } }, 60);
        }
      }
    };
  }

  function start() {
    if (!enabled || !wanted || !running()) return;
    if (current && current.desc === wanted) return;
    if (current) current.stop();
    current = makeTrack(wanted);
  }
  function stopCurrent(fade) { if (current) { current.stop(fade); current = null; } }

  /* ---------- little interface sounds ---------- */
  function blip(kind) {
    if (!enabled || !running()) return;
    const t = ctx.currentTime;
    if (kind === "click") {
      const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.05);
      const f = filter("bandpass", 2400, 2), g = gain(0, out);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      s.connect(f).connect(g); s.start(t);
      bass(out, t, 40, 0.12, 0.25);
    } else if (kind === "off") {
      const o = osc("sine", 1400), g = gain(0, out);
      o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.45);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); o.start(t); o.stop(t + 0.55);
      const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.4);
      const ng = gain(0, out); ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      s.connect(filter("highpass", 800)).connect(ng); s.start(t);
    }
  }

  /* ---------- public ---------- */
  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
    if (on) { ensure(); start(); } else stopCurrent(0.5);
    notify();
  }
  function toggle() {
    if (state() === "waiting") { ensure(); start(); notify(); return; }
    setEnabled(!enabled);
  }

  // Wake audio on the first click/tap/key anywhere (except elements marked data-no-wake).
  function wake(e) {
    if (e.target && e.target.closest && e.target.closest("[data-no-wake]")) return;
    ["pointerdown", "keydown", "touchstart"].forEach(t => removeEventListener(t, wake, true));
    if (enabled) { ensure(); start(); }
  }
  ["pointerdown", "keydown", "touchstart"].forEach(t => addEventListener(t, wake, true));

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden && ctx.state === "running") { hiddenSuspend = true; ctx.suspend(); }
    else if (!document.hidden && hiddenSuspend) { hiddenSuspend = false; ctx.resume(); }
  });

  function bindToggles(root = document) {
    root.querySelectorAll("[data-sound-toggle]").forEach(btn => {
      if (btn._bound) return; btn._bound = true;
      btn.setAttribute("data-no-wake", "");
      btn.addEventListener("click", () => { toggle(); blip("click"); });
    });
  }
  subs.add(s => {
    document.querySelectorAll("[data-sound-toggle]").forEach(btn => {
      btn.dataset.state = s;
      btn.setAttribute("aria-pressed", s === "on" ? "true" : "false");
      const label = btn.querySelector(".sound-label");
      if (label) label.textContent = s === "on" ? "Sound on" : s === "off" ? "Sound off" : "Play sound";
    });
    document.documentElement.dataset.sound = s;
  });

  window.Sound = {
    play(desc) { wanted = desc; if (enabled) ensure(); start(); notify(); },
    stop(fade) { wanted = null; stopCurrent(fade); },
    toggle, setEnabled, blip, bindToggles,
    get state() { return state(); },
    subscribe(fn) { subs.add(fn); fn(state()); return () => subs.delete(fn); }
  };
  document.addEventListener("DOMContentLoaded", () => { bindToggles(); notify(); });
})();
