/* ─────────────────────────────────────────────────────────────
   brand-goo.js — 브랜드 소개 상단 비주얼의 4색 슬라임 (레퍼런스: cellinteractive.jp 첫 화면)
   레퍼런스는 Three.js로 색 공들을 그린 뒤 가우스 블러 → 알파 대비로 한 덩어리로 붙입니다.
   여기서는 라이브러리 없이 같은 결과를 메타볼 필드 셰이더 한 장으로 냅니다:
     필드 f = Σ rᵢ²/dᵢ²  →  알파 = smoothstep(경계)   (블러 + 대비 두 패스를 한 번에)
     색   = Σ wᵢ·cᵢ / Σ wᵢ, wᵢ = (rᵢ²/dᵢ²)³         (공마다 색이 안에서 번지듯 섞임)
   공 8개(네 브랜드 색 × 2)가 서로 다른 주기의 리사주 궤도로 천천히 떠돌며 붙었다 떨어지고,
   커서를 올리면 가장 가까운 공이 스프링으로 따라와 덩어리가 그쪽으로 늘어납니다.
   화면 밖이면 멈추고, 동작 감소면 한 프레임만 그립니다. WebGL이 없으면 .is-flat(CSS 정적 덩어리).
   ───────────────────────────────────────────────────────────── */
(function () {
  const box = document.querySelector('.bp-kv__photo');
  const cv = box && box.querySelector('.bp-kv__goo');
  if (!cv) return;
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) { box.classList.add('is-flat'); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const N = 8;

  // 네 브랜드 코어 컬러 — css/tokens.css --pal-brand-*
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const BRAND = ['--pal-brand-coral', '--pal-brand-yellow', '--pal-brand-dusty-blue', '--pal-brand-sage-green']
    .map((n, i) => rgb(css(n) || ['#F2A48C', '#F6D98A', '#98B8E3', '#B7CFA3'][i]));

  // 공 — 집(중심 기준 오프셋, S 단위) · 반지름 · 궤도 진폭/주기/위상. S = 덩어리 기준 크기(판 높이)
  const BALLS = [
    { c: 0, hx: -0.099, hy: -0.062, r: 0.116, ax: 0.075, ay: 0.060, tx: 19, ty: 23, p: 0.0 },
    { c: 1, hx: 0.087, hy: 0.074, r: 0.122, ax: 0.068, ay: 0.075, tx: 23, ty: 17, p: 1.3 },
    { c: 2, hx: 0.099, hy: -0.074, r: 0.110, ax: 0.083, ay: 0.053, tx: 17, ty: 26, p: 2.6 },
    { c: 3, hx: -0.074, hy: 0.087, r: 0.116, ax: 0.060, ay: 0.075, tx: 26, ty: 20, p: 3.9 },
    { c: 0, hx: 0.031, hy: 0.124, r: 0.087, ax: 0.090, ay: 0.045, tx: 15, ty: 21, p: 5.1 },
    { c: 1, hx: -0.136, hy: 0.012, r: 0.081, ax: 0.053, ay: 0.083, tx: 21, ty: 14, p: 0.7 },
    { c: 2, hx: -0.012, hy: -0.136, r: 0.087, ax: 0.075, ay: 0.060, tx: 25, ty: 18, p: 2.0 },
    { c: 3, hx: 0.149, hy: 0.000, r: 0.081, ax: 0.045, ay: 0.090, tx: 18, ty: 24, p: 4.4 },
  ].map((b) => ({ ...b, ox: 0, oy: 0, vx: 0, vy: 0 }));

  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = `precision highp float;
    uniform vec2 uRes;
    uniform vec3 uBall[${N}];
    uniform vec3 uCol[${N}];
    uniform float uEdge;
    void main(){
      vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
      float f = 0.0, ws = 0.0; vec3 col = vec3(0.0);
      for (int i = 0; i < ${N}; i++) {
        vec2 d = p - uBall[i].xy;
        float k = uBall[i].z * uBall[i].z / max(dot(d, d), 1.0);
        f += k;
        float w = k * k * k;
        col += uCol[i] * w; ws += w;
      }
      col /= max(ws, 1e-5);
      float a = smoothstep(1.0 - uEdge, 1.0 + uEdge, f);
      gl_FragColor = vec4(col * a, a);
    }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { box.classList.add('is-flat'); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = { res: gl.getUniformLocation(prog, 'uRes'), ball: gl.getUniformLocation(prog, 'uBall'), col: gl.getUniformLocation(prog, 'uCol'), edge: gl.getUniformLocation(prog, 'uEdge') };
  gl.uniform3fv(U.col, new Float32Array(BALLS.flatMap((b) => BRAND[b.c])));
  gl.clearColor(0, 0, 0, 0);

  let W = 0, H = 0, dpr = 1, S = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.edge, 0.035);
    S = Math.min(H, W * 0.8);                                   // 덩어리 기준 — 판 높이(좁은 화면은 폭)
  };

  // 커서 — 판 안에서만. 들어오면 가장 가까운 공을 잡아 스프링으로 끌고, 나머지는 살짝 같이 기웁니다
  const m = { on: false, x: 0, y: 0, grab: -1 };
  const CX = () => W / 2, CY = () => H * 0.46;
  if (fine && !reduce) {
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      m.x = e.clientX - r.left; m.y = e.clientY - r.top;
      if (!m.on) {
        m.on = true; let best = 1e9;
        BALLS.forEach((b, i) => { const d = Math.hypot(b.px - m.x, b.py - m.y); if (d < best) { best = d; m.grab = i; } });
      }
    });
    box.addEventListener('pointerleave', () => { m.on = false; m.grab = -1; });
  }

  const data = new Float32Array(N * 3);
  const frame = (t, dt) => {
    const cx = CX(), cy = CY();
    BALLS.forEach((b, i) => {
      const s = t / 1000;
      const bx = cx + (b.hx + b.ax * Math.sin(s * 6.2832 / b.tx + b.p)) * S;
      const by = cy + (b.hy + b.ay * Math.sin(s * 6.2832 / b.ty + b.p * 1.7)) * S;
      // 커서 쪽 목표 오프셋 — 잡힌 공은 커서까지(최대 0.34S), 나머지는 8%만
      let gx = 0, gy = 0;
      if (m.on) {
        let dx = m.x - bx, dy = m.y - by;
        const lim = i === m.grab ? 0.34 * S : 0.05 * S, k = i === m.grab ? 1 : 0.08;
        dx *= k; dy *= k;
        const L = Math.hypot(dx, dy); if (L > lim) { dx *= lim / L; dy *= lim / L; }
        gx = dx; gy = dy;
      }
      const st = Math.min(dt, 50) / 1000;
      b.vx += ((gx - b.ox) * 38 - b.vx * 9) * st; b.vy += ((gy - b.oy) * 38 - b.vy * 9) * st;
      b.ox += b.vx * st; b.oy += b.vy * st;
      b.px = bx + b.ox; b.py = by + b.oy;
      data[i * 3] = b.px * dpr; data[i * 3 + 1] = b.py * dpr; data[i * 3 + 2] = b.r * S * dpr;
    });
    gl.uniform3fv(U.ball, data);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  size();
  let raf = 0, last = 0, clock = 0;
  const loop = (now) => { const dt = last ? now - last : 16; last = now; clock += dt; frame(clock, dt); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new ResizeObserver(() => { size(); frame(clock, 0); }).observe(box);
  frame(0, 0);
  if (reduce) return;
  new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop())).observe(box);
})();
