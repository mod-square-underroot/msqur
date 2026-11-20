(function () {
  const site = window.SITE || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Name + blurb from data/works.js
  const nameEl = document.querySelector("[data-site-name]");
  if (nameEl && site.name) nameEl.textContent = site.name;
  const blurbEl = document.querySelector("[data-site-blurb]");
  if (blurbEl && site.blurb) blurbEl.textContent = site.blurb;
  const bigWord = document.querySelector(".backdrop-word");
  if (bigWord && (site.mark || site.name)) bigWord.textContent = site.mark || site.name;

  // Snow on the tube
  const canvas = document.getElementById("static");
  const c2d = canvas.getContext("2d");
  const img = c2d.createImageData(canvas.width, canvas.height);
  let last = 0;
  function snow(t) {
    if (t - last > 42) {
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255 | 0;
        d[i] = v; d[i + 1] = v; d[i + 2] = v + 12; d[i + 3] = 255;
      }
      c2d.putImageData(img, 0, 0);
    }
    if (!reduced) requestAnimationFrame(snow);
  }
  requestAnimationFrame(snow);

  // The tune
  Sound.play("tune:retro");

  // Channel knob: a burst of static, then the words write themselves again
  const tv = document.getElementById("tv");
  const channel = document.getElementById("channel");
  let turn = -40;
  channel.addEventListener("click", () => {
    turn += 33;
    channel.style.setProperty("--turn", turn + "deg");
    Sound.blip("click");
    tv.classList.add("tuning");
    setTimeout(() => {
      tv.classList.remove("tuning");
      document.querySelectorAll(".screen-text span").forEach((s, i) => {
        s.style.animation = "none"; void s.offsetWidth;
        s.style.animation = ""; s.style.animationDelay = (0.1 + i * 1.2) + "s";
      });
    }, 650);
  });

  // Click the screen: switch the set off, then step through
  const screen = document.getElementById("screen");
  screen.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (tv.classList.contains("off")) return;
    tv.classList.add("off");
    Sound.blip("off");
    Sound.stop(0.6);
    setTimeout(() => { location.href = screen.getAttribute("href"); }, reduced ? 150 : 1150);
  });
  // Coming back with the browser's back button: turn the set on again
  addEventListener("pageshow", e => { if (e.persisted) { tv.classList.remove("off"); Sound.play("tune:retro"); } });
})();
