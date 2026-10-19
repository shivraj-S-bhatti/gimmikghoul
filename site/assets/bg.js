// Procedural halftone wallpaper: drawn for the current window, so it never tiles or seams.
// Bright spots sit at fixed fractions of the window; dot size and opacity follow the nearest spot.
(() => {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  // 100lvh covers the area behind a phone's collapsing address bar.
  c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none';
  document.body.prepend(c);
  const peaks = [[.86, .14, .34, 1], [.1, .8, .3, .85], [.55, .58, .2, .45], [.26, .06, .18, .6], [.96, .9, .24, .7]];
  const stars = [[.83, .13, 40], [.93, .32, 22], [.12, .74, 30], [.24, .92, 14], [.58, .55, 16], [.3, .08, 18], [.95, .88, 22]];
  // Deterministic per-dot noise so rings land in the same place every redraw.
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#2a5bd7'; g.fillRect(0, 0, W, H);
    // Dots and stars shrink on narrow screens so the pattern keeps its density on a phone.
    const k = Math.max(.5, Math.min(1, W / 900)), step = 34 * k, aspect = W / H;
    for (let j = 0, y = step / 2; y < H + step; j++, y += step) {
      for (let i = 0, x = (j % 2 ? step / 2 : 0); x < W + step; i++, x += step) {
        let t = 0;
        for (const [px, py, s, a] of peaks) {
          const dx = (x / W - px) * aspect, dy = y / H - py;
          t = Math.max(t, a * Math.exp(-(dx * dx + dy * dy) / (2 * s * s)));
        }
        const r = (1 + t * 13) * k;
        if (r < 1.7 * k) continue;
        const alpha = .08 + t * .42;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
        if (r > 7 * k && hash(i, j) < .06) {
          g.strokeStyle = `rgba(255,255,255,${alpha})`; g.lineWidth = 1.5; g.stroke();
          g.beginPath(); g.arc(x, y, r * .55, 0, Math.PI * 2); g.strokeStyle = `rgba(255,255,255,${alpha * .8})`; g.lineWidth = 1.1; g.stroke();
        } else { g.fillStyle = `rgba(255,255,255,${alpha})`; g.fill(); }
      }
    }
    for (const [fx, fy, s0] of stars) {
      const x = fx * W, y = fy * H, s = s0 * k;
      g.beginPath(); g.moveTo(x, y - s);
      g.quadraticCurveTo(x + s * .12, y - s * .12, x + s, y); g.quadraticCurveTo(x + s * .12, y + s * .12, x, y + s);
      g.quadraticCurveTo(x - s * .12, y + s * .12, x - s, y); g.quadraticCurveTo(x - s * .12, y - s * .12, x, y - s);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
    }
  }
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  draw();
})();
