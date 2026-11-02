/* ─────────────────────────────────────────────────────────────
   brand-goo.js — 브랜드 소개 상단 비주얼의 4색 슬라임
   레퍼런스 cellinteractive.jp 첫 화면(bundle.js의 QT · lA 클래스)과 같은 구조를 라이브러리 없이 옮겼습니다.

   1) 물리(레퍼런스는 cannon-es, 중력 0) — 공 6개. 질량 .4, 선형 감쇠 .9(밀리면 금방 멈춤),
      충돌 반지름은 보이는 반지름의 .65배라 서로 겹치지 못하고 밀어냅니다. 매 스텝 크기 16의 복원력이
      "중심에서 사인 곡선으로 조금 흔들리는 목표점"을 향해 걸려 뭉친 채 천천히 자리를 바꿉니다.
      커서는 반폭 1.25R의 보이지 않는 상자(KINEMATIC) — 겹친 공을 밀어내서 지나가면 공들이 사방으로
      튕겨나간 뒤 복원력 + 감쇠로 다시 뭉칩니다. 좌표계: 판 높이 = 11.55 유닛(fov 60 · z 10 카메라).
   2) 렌더 — 공을 디퓨즈 셰이딩으로 작은 버퍼(폭의 6%)에 그리고 가우스 블러(가로 · 세로, 알파 가중 색 평균)
      → 출력에서 alpha = a×80 − 15 로 다시 또렷하게. 이 블러 + 대비가 끈적하게 붙었다 떨어지는 모양을 만듭니다.
   3) 색 — 네 브랜드 코어 컬러(css/tokens.css --pal-brand-*) + 코랄 · 파랑 반복 = 6개.
   화면 밖이면 멈추고, 동작 감소면 한 프레임만 그립니다. WebGL이 없으면 .is-flat(CSS 정적 덩어리).
   ───────────────────────────────────────────────────────────── */
(function () {
  const box = document.querySelector('.bp-kv__photo');
  const cv = box && box.querySelector('.bp-kv__goo');
  if (!cv) return;
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) { box.classList.add('is-flat'); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── 색 ── */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const FALLBACK = ['#F2A48C', '#F6D98A', '#98B8E3', '#B7CFA3'];
  const BRAND = ['--pal-brand-coral', '--pal-brand-yellow', '--pal-brand-dusty-blue', '--pal-brand-sage-green'].map((n, i) => rgb(css(n) || FALLBACK[i]));
  const COLORS = [0, 1, 2, 3, 0, 2].map((i) => BRAND[i]);          // 코랄 · 노랑 · 파랑 · 녹색 · 코랄 · 파랑
  const N = COLORS.length;

  /* ── 셰이더 ── */
  const K = 32;                                                     // 블러 탭 수(레퍼런스 128탭 / 1440px 의 비율을 버퍼 크기에 맞춰 간격으로 환산)
  const VS_BALL = 'attribute vec2 q; uniform vec2 uC; uniform vec2 uS; varying vec2 vP; void main(){ vP = q; gl_Position = vec4(uC + q * uS, 0.0, 1.0); }';
  const FS_BALL = `precision highp float; varying vec2 vP; uniform vec3 uColor; uniform vec3 uL; uniform vec3 uSun; uniform float uStr; uniform float uTh;
    void main(){ float r2 = dot(vP, vP); if (r2 > 1.0) discard;
      vec3 n = vec3(vP, sqrt(1.0 - r2)); float d = clamp(dot(n, uL), 0.1, 1.0);
      gl_FragColor = vec4(mix(uColor, uColor * (d * uSun + uStr), uTh), 1.0); }`;
  const VS_QUAD = 'attribute vec2 q; varying vec2 vUv; void main(){ vUv = q * 0.5 + 0.5; gl_Position = vec4(q, 0.0, 1.0); }';
  // 레퍼런스 블러 셰이더 그대로 — 알파 가중 색 평균(색은 straight), 알파는 단순 평균
  const FS_BLUR = `precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform vec2 uDir; uniform float uW[${K}];
    void main(){ vec4 c, sc = vec4(0.0); float w, aw, sw = 0.0;
      for (int i = 0; i < ${K} - 1; i++) { w = uW[i]; vec2 o = float(i) * uDir;
        c = texture2D(uT, vUv - o); aw = w * c.a; sc.rgb += c.rgb * aw; sc.a += c.a * w; sw += aw;
        c = texture2D(uT, vUv + o); aw = w * c.a; sc.rgb += c.rgb * aw; sc.a += c.a * w; sw += aw; }
      c = texture2D(uT, vUv); aw = w * c.a; sc.rgb += c.rgb * aw; sc.a += c.a * w; sw += aw;
      gl_FragColor = vec4(sc.rgb / max(sw, 1e-5), sc.a); }`;
  const FS_OUT = `precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform float uContrast; uniform float uSubtract;
    void main(){ vec4 c = texture2D(uT, vUv); float a = clamp(c.a * uContrast - uSubtract, 0.0, 1.0); gl_FragColor = vec4(c.rgb * a, a); }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
  const P_BALL = prog(VS_BALL, FS_BALL), P_BLUR = prog(VS_QUAD, FS_BLUR), P_OUT = prog(VS_QUAD, FS_OUT);
  if (!P_BALL || !P_BLUR || !P_OUT) { box.classList.add('is-flat'); return; }
  const u = (p, n) => gl.getUniformLocation(p, n);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const bindQuad = (p) => { const a = gl.getAttribLocation(p, 'q'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); };
  gl.useProgram(P_BALL);
  gl.uniform3f(u(P_BALL, 'uL'), 0.63 / 1.193, 0.16 / 1.193, 1 / 1.193);   // 레퍼런스 빛 방향 (.63, .16, 1) 정규화
  gl.uniform3f(u(P_BALL, 'uSun'), 1, 0.97, 0.93);
  gl.uniform1f(u(P_BALL, 'uStr'), 0.35);
  gl.uniform1f(u(P_BALL, 'uTh'), 0.3);                                   // 레퍼런스 .45 — 브랜드 파스텔이 탁해지지 않게 음영은 조금 약하게
  gl.useProgram(P_OUT);
  gl.uniform1f(u(P_OUT, 'uContrast'), 80);
  gl.uniform1f(u(P_OUT, 'uSubtract'), 15);
  // 가우스 가중치 — 레퍼런스 calcGaussWeight 그대로(σ = 탭 수라 거의 평평한 상자 블러)
  const weights = (() => { let s = 0; const w = []; for (let i = 0; i < K; i++) { const r = 1 + 2 * i; let g = Math.exp(r * r * -0.5 / (K * K)); w.push(g); if (i > 0) g *= 2; s += g; } return new Float32Array(w.map((x) => x / s)); })();
  gl.useProgram(P_BLUR);
  gl.uniform1fv(u(P_BLUR, 'uW'), weights);

  /* ── 버퍼(작은 해상도 3장) ── */
  const fbo = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { f, t, w, h };
  };
  let F = null;

  /* ── 월드 ── 판 높이 = 11.55 유닛. 좁은 화면은 공을 조금 작게 */
  let W = 0, H = 0, dpr = 1, unit = 1, R = 1.5, RB = 0.975, PB = 1.875, CY = 0;
  const balls = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < N; i++) balls.push({ x: rnd(-2, 2), y: rnd(-2, 2), vx: 0, vy: 0 });
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = box.clientWidth; H = box.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    unit = H / 11.55;
    const narrow = W < 768;
    R = narrow ? 1.1 : 1.5; RB = R * (narrow ? 1.0 : 0.65); PB = 1.25 * R; CY = narrow ? 0.5 : 0;
    const sw = Math.max(64, Math.round(W * 0.06)), shh = Math.max(32, Math.round(sw * H / W));
    if (F) [F.a, F.b, F.c].forEach((o) => { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); });
    F = { a: fbo(sw, shh), b: fbo(sw, shh), c: fbo(sw, shh) };
  };

  /* ── 커서 상자 — window 전체에서 받아 판 좌표(유닛)로. 없으면 멀리 ── */
  const ptr = { tx: 1e3, ty: 1e3, x: 1e3, y: 1e3, seen: false };
  if (hover && !reduce) {
    window.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left - r.width / 2) / unit;
      ptr.ty = -(e.clientY - r.top - r.height / 2) / unit;
      if (!ptr.seen) { ptr.seen = true; ptr.x = ptr.tx; ptr.y = ptr.ty; }   // 첫 이벤트는 바로 그 자리에서 시작(멀리서 1초 넘게 끌려오지 않게)
    }, { passive: true });
  }

  /* ── 물리 스텝(1/60) — 레퍼런스 QT.update 식 ── */
  const DT = 1 / 60, DAMP = Math.pow(1 - 0.9, DT), FORCE = 16 / 0.4;
  let elapsed = 0;
  const step = () => {
    elapsed += DT;
    const e = elapsed;
    ptr.x += (ptr.tx - ptr.x) * 0.1; ptr.y += (ptr.ty - ptr.y) * 0.1;
    for (let i = 0; i < N; i++) {
      const b = balls[i], sgn = i % 2 === 0 ? 1 : -1;
      const wx = 0.27 * Math.sin(i + 1.26 * e * (1.03 + 0.5 * Math.cos(0.21 * i))) * 2.7 * sgn;
      const wy = 0.77 * Math.abs(Math.cos(i + 1.12 * e * Math.cos(1.22 + 0.1424 * i))) - CY;
      let dx = b.x + wx, dy = b.y + wy;
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      b.vx -= FORCE * dx * DT; b.vy -= FORCE * dy * DT;
      b.vx *= DAMP; b.vy *= DAMP;
      b.x += b.vx * DT; b.y += b.vy * DT;
    }
    // 공끼리 — 반발 0: 겹침을 반씩 밀어내고 접근 속도의 법선 성분만 제거
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = balls[i], b = balls[j];
      let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-4, pen = 2 * RB - d;
      if (pen <= 0) continue;
      dx /= d; dy /= d;
      a.x -= dx * pen / 2; a.y -= dy * pen / 2; b.x += dx * pen / 2; b.y += dy * pen / 2;
      const vn = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
      if (vn < 0) { a.vx += dx * vn / 2; a.vy += dy * vn / 2; b.vx -= dx * vn / 2; b.vy -= dy * vn / 2; }
    }
    // 커서 상자(AABB 반폭 PB) — 원을 밀어내고 분리 속도를 깊이에 비례해 보장(접촉 방정식의 밀어내는 힘)
    if (hover) for (let i = 0; i < N; i++) {
      const b = balls[i];
      const cx = Math.max(ptr.x - PB, Math.min(ptr.x + PB, b.x)), cy = Math.max(ptr.y - PB, Math.min(ptr.y + PB, b.y));
      let nx = b.x - cx, ny = b.y - cy, d = Math.hypot(nx, ny), pen;
      if (d > 1e-6) { pen = RB - d; if (pen <= 0) continue; nx /= d; ny /= d; }
      else {                                                        // 중심이 상자 안 — 가장 얕은 축으로
        const ex = PB - Math.abs(b.x - ptr.x), ey = PB - Math.abs(b.y - ptr.y);
        if (ex < ey) { nx = b.x < ptr.x ? -1 : 1; ny = 0; pen = ex + RB; } else { nx = 0; ny = b.y < ptr.y ? -1 : 1; pen = ey + RB; }
      }
      b.x += nx * pen; b.y += ny * pen;
      const vn = b.vx * nx + b.vy * ny, want = pen * 24;
      if (vn < want) { b.vx += nx * (want - vn); b.vy += ny * (want - vn); }
    }
  };

  /* ── 그리기 ── */
  const draw = () => {
    if (!F) return;
    // 1) 공 → F.a (작은 버퍼, 불투명)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.a.f); gl.viewport(0, 0, F.a.w, F.a.h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P_BALL); gl.bindBuffer(gl.ARRAY_BUFFER, quad); bindQuad(P_BALL);
    const sx = 2 * unit / W, sy = 2 * unit / H;                       // 유닛 → 클립 공간
    for (let i = 0; i < N; i++) {
      const b = balls[i];
      gl.uniform2f(u(P_BALL, 'uC'), b.x * sx, b.y * sy);
      gl.uniform2f(u(P_BALL, 'uS'), R * sx, R * sy);
      gl.uniform3fv(u(P_BALL, 'uColor'), COLORS[i]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // 2) 블러 가로 → F.b, 세로 → F.c. 반지름 ≈ 공 반지름의 1.1배(레퍼런스 128px / 반지름 117px)
    const blurPx = 1.1 * R * unit * (F.a.w / W);                      // 작은 버퍼 픽셀
    gl.useProgram(P_BLUR); bindQuad(P_BLUR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.b.f); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, F.a.t); gl.uniform2f(u(P_BLUR, 'uDir'), blurPx / (K - 1) / F.a.w, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.c.f); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, F.b.t); gl.uniform2f(u(P_BLUR, 'uDir'), 0, blurPx / (K - 1) / F.a.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // 3) 출력 — 알파 대비로 다시 또렷하게, 캔버스는 premultiplied
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P_OUT); bindQuad(P_OUT);
    gl.bindTexture(gl.TEXTURE_2D, F.c.t); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  size();
  for (let i = 0; i < 120; i++) step();                              // 뭉친 상태로 시작
  draw();
  new ResizeObserver(() => { size(); draw(); }).observe(box);
  if (reduce) return;

  let raf = 0, last = 0, acc = 0;
  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : DT; last = now; acc += dt;
    let n = 0; while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop())).observe(box);
})();
