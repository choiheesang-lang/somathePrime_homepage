/* ─────────────────────────────────────────────────────────────
   goo.js — 4색 슬라임(브랜드 소개 상단 비주얼 · 홈 장면 10). `[data-goo]` 요소 안의 <canvas>마다 하나씩 돕니다.
   레퍼런스 cellinteractive.jp 첫 화면(bundle.js의 QT · lA 클래스)과 같은 구조를 라이브러리 없이 옮겼습니다.

   1) 물리(레퍼런스는 cannon-es, 중력 0) — 공 4개. 질량 .4, 선형 감쇠 .9(밀리면 금방 멈춤),
      충돌 반지름은 보이는 반지름의 .65배라 서로 겹치지 못하고 밀어냅니다. 매 스텝 크기 16의 복원력이
      "중심에서 사인 곡선으로 조금 흔들리는 목표점"을 향해 걸려 뭉친 채 천천히 자리를 바꿉니다.
      커서는 반폭 1.25R의 보이지 않는 상자(KINEMATIC) — 겹친 공을 밀어내서 지나가면 공들이 사방으로
      튕겨나간 뒤 복원력 + 감쇠로 다시 뭉칩니다. 좌표계: 판 높이 = 11.55 유닛(fov 60 · z 10 카메라).
      접촉은 cannon의 스프링 풀이처럼 스텝당 25%만 밀어내고, 복원력은 목표점 가까이(0.6u)에서 0으로
      줄여 뭉친 뒤 서로 밀어대며 떠는 일이 없게 했습니다. 공은 판 바깥에서 차례로 날아들어 뭉칩니다.
   2) 렌더 — 공을 캔버스 1/2 해상도에 안티앨리어싱 · premultiplied로 그린 뒤(A) 그 텍스처를 작은 버퍼(폭 6%)에
      가우스 블러(가로 · 세로) → 출력에서 alpha = a×80 − 15 로 다시 또렷하게.
      색은 따로 작은 반경으로만 흐려(D · E) 공마다 제 색이 남고 경계만 부드럽게 넘어갑니다.
   3) 색 — 네 브랜드 코어 컬러(css/tokens.css --pal-brand-*)의 선명 버전(색상 유지 · 채도 ×1.3 · 명도 −4%)
      하나씩 = 공 4개. 파스텔 원색은 블러로 섞이면 탁해져서 슬라임에서만 올립니다.
      넷이 모두 뭉치면(중심에서 가장 먼 공 ≤ 2.6·RB) 약 1초에 걸쳐 검정 잉크(--primary-normal)로 물들고,
      커서로 흩어지면 각자 제 색으로 돌아옵니다.
   화면 밖이면 멈추고, 동작 감소면 뭉친 상태 한 프레임만 그립니다. WebGL이 없으면 .is-flat(CSS 정적 덩어리).
   ───────────────────────────────────────────────────────────── */
(function () {
  document.querySelectorAll('[data-goo]').forEach(goo);
  function goo(box) {
  const cv = box.querySelector('canvas');
  if (!cv) return;
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) { box.classList.add('is-flat'); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── 색 — 토큰 → 선명 버전 ── */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const vivid = ([r, g, b], sat, dl) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
    }
    s = Math.min(1, s * sat); l = Math.max(0, Math.min(1, l + dl));
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  };
  const FALLBACK = ['#F2A48C', '#F6D98A', '#98B8E3', '#B7CFA3'];
  const BRAND = ['--pal-brand-coral', '--pal-brand-yellow', '--pal-brand-dusty-blue', '--pal-brand-sage-green']
    .map((n, i) => vivid(hex(css(n) || FALLBACK[i]), 1.3, -0.04));
  const COLORS = [0, 1, 2, 3].map((i) => BRAND[i]);                // 코랄 · 노랑 · 파랑 · 녹색 — 브랜드 하나에 공 하나
  const N = COLORS.length;
  const INK = hex(css('--primary-normal') || '#2C2A29');            // 넷이 모두 뭉치면 이 잉크(홈 검은 슬라임 = 소마더프라임)로

  /* ── 셰이더 ── */
  const K = 32;                                                     // 블러 탭 수
  const VS_BALL = 'attribute vec2 q; uniform vec2 uC; uniform vec2 uS; varying vec2 vP; void main(){ vP = q; gl_Position = vec4(uC + q * uS, 0.0, 1.0); }';
  // 가장자리 안티앨리어싱(uEdge = 1.5px / 반지름px) + 밝은 쪽만 살짝 하이라이트(어둡게 하지 않음)
  const FS_BALL = `precision highp float; varying vec2 vP; uniform vec3 uColor; uniform vec3 uInkColor; uniform float uInk; uniform vec3 uL; uniform float uEdge;
    void main(){ float r = length(vP); float a = 1.0 - smoothstep(1.0 - uEdge, 1.0, r); if (a <= 0.0) discard;
      vec3 n = vec3(vP, sqrt(max(0.0, 1.0 - r * r))); float d = clamp(dot(n, uL), 0.1, 1.0);
      vec3 c = mix(uColor, uInkColor, uInk);
      gl_FragColor = vec4(min(vec3(1.0), c + (d - 0.5) * 0.10) * a, a); }`;   // premultiplied — 가장자리가 검정과 섞여 어두운 테두리가 생기지 않게
  const VS_QUAD = 'attribute vec2 q; varying vec2 vUv; void main(){ vUv = q * 0.5 + 0.5; gl_Position = vec4(q, 0.0, 1.0); }';
  // 블러 — premultiplied 텍스처라 네 채널을 그대로 가중 평균하면 레퍼런스의 "알파 가중 색 평균"과 같습니다
  const FS_BLUR = `precision highp float; varying vec2 vUv; uniform sampler2D uT; uniform vec2 uDir; uniform float uW[${K}];
    void main(){ vec4 sc = vec4(0.0); float w;
      for (int i = 0; i < ${K} - 1; i++) { w = uW[i]; vec2 o = float(i) * uDir;
        sc += texture2D(uT, vUv - o) * w; sc += texture2D(uT, vUv + o) * w; }
      sc += texture2D(uT, vUv) * w;
      gl_FragColor = sc; }`;
  // 알파(모양)는 넓게 흐린 C, 색은 좁게 흐린 E(un-premultiply) — 색이 없는 틈은 C의 섞인 색으로
  const FS_OUT = `precision highp float; varying vec2 vUv; uniform sampler2D uA; uniform sampler2D uCol; uniform float uContrast; uniform float uSubtract;
    void main(){ vec4 c = texture2D(uA, vUv); vec4 k = texture2D(uCol, vUv);
      float a = clamp(c.a * uContrast - uSubtract, 0.0, 1.0);
      vec3 rgb = mix(c.rgb / max(c.a, 1e-4), k.rgb / max(k.a, 1e-4), smoothstep(0.0, 0.3, k.a));
      gl_FragColor = vec4(rgb * a, a); }`;
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
  gl.uniform3fv(u(P_BALL, 'uInkColor'), INK);
  gl.useProgram(P_OUT);
  gl.uniform1f(u(P_OUT, 'uContrast'), 80);
  gl.uniform1f(u(P_OUT, 'uSubtract'), 15);
  gl.uniform1i(u(P_OUT, 'uA'), 0);
  gl.uniform1i(u(P_OUT, 'uCol'), 1);
  // 가우스 가중치 — 레퍼런스 calcGaussWeight 그대로(σ = 탭 수라 거의 평평한 상자 블러)
  const weights = (() => { let s = 0; const w = []; for (let i = 0; i < K; i++) { const r = 1 + 2 * i; let g = Math.exp(r * r * -0.5 / (K * K)); w.push(g); if (i > 0) g *= 2; s += g; } return new Float32Array(w.map((x) => x / s)); })();
  gl.useProgram(P_BLUR);
  gl.uniform1fv(u(P_BLUR, 'uW'), weights);

  /* ── 버퍼 — A: 공(캔버스 1/2), B·C: 모양 블러, D·E: 색 블러(작은 버퍼) ── */
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
  for (let i = 0; i < N; i++) balls.push({ x: 0, y: 0, vx: 0, vy: 0, ang: (i * 360 / N + 45 + rnd(-20, 20)) * Math.PI / 180 });
  const spawnOutside = () => {                                      // 판 바깥 원 위에 같은 간격으로
    const rad = Math.max(W, H) / unit * 0.75 + R;
    balls.forEach((b) => { b.x = Math.cos(b.ang) * rad; b.y = Math.sin(b.ang) * rad; b.vx = b.vy = 0; });
  };
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = box.clientWidth; H = box.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    unit = H / 11.55;
    const narrow = W < 768;
    R = narrow ? 1.25 : 1.7; RB = R * (narrow ? 1.0 : 0.65); PB = 1.25 * R; CY = narrow ? 0.5 : 0;   // 넷이라 조금 크게
    const sw = Math.max(64, Math.round(W * 0.06)), shh = Math.max(32, Math.round(sw * H / W));
    if (F) Object.values(F).forEach((o) => { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); });
    F = { a: fbo(Math.round(cv.width / 2), Math.round(cv.height / 2)), b: fbo(sw, shh), c: fbo(sw, shh), d: fbo(sw, shh), e: fbo(sw, shh) };
  };

  /* ── 커서 상자 — window 전체에서 받아 판 좌표(유닛)로. 없으면 멀리 ── */
  const ptr = { tx: 1e3, ty: 1e3, x: 1e3, y: 1e3, seen: false };
  if (hover && !reduce) {
    window.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left - r.width / 2) / unit;
      ptr.ty = -(e.clientY - r.top - r.height / 2) / unit;
      if (!ptr.seen) { ptr.seen = true; ptr.x = ptr.tx; ptr.y = ptr.ty; }   // 첫 이벤트는 바로 그 자리에서 시작
    }, { passive: true });
  }

  /* ── 물리 스텝(1/60) — 레퍼런스 QT.update 식 + 부드러운 접촉 ── */
  const DT = 1 / 60, DAMP = Math.pow(1 - 0.9, DT), FORCE = 16 / 0.4, SOFT = 0.25, NEAR = 0.6, STAGGER = 0.07;
  let elapsed = 0, ink = 0;
  const INK_EASE = 1 - Math.pow(0.1, DT);                           // 약 1초에 90%
  const step = () => {
    elapsed += DT;
    const e = elapsed;
    // 합쳐짐 — 중심에서 가장 먼 공까지 거리. 2×2로 붙으면 ≈1.41·RB → 잉크 1, 흩어지면 0
    let mx = 0, my = 0; for (let i = 0; i < N; i++) { mx += balls[i].x; my += balls[i].y; } mx /= N; my /= N;
    let dmax = 0; for (let i = 0; i < N; i++) dmax = Math.max(dmax, Math.hypot(balls[i].x - mx, balls[i].y - my));
    const inkT = Math.max(0, Math.min(1, (2.6 * RB - dmax) / (0.6 * RB)));
    ink += (inkT - ink) * INK_EASE;
    ptr.x += (ptr.tx - ptr.x) * 0.1; ptr.y += (ptr.ty - ptr.y) * 0.1;
    for (let i = 0; i < N; i++) {
      if (e < i * STAGGER) continue;                                 // 등장 — 공마다 70ms씩 늦게 출발
      const b = balls[i], sgn = i % 2 === 0 ? 1 : -1;
      const wx = 0.27 * Math.sin(i + 1.26 * e * (1.03 + 0.5 * Math.cos(0.21 * i))) * 2.7 * sgn;
      const wy = 0.77 * Math.abs(Math.cos(i + 1.12 * e * Math.cos(1.22 + 0.1424 * i))) - CY;
      let dx = b.x + wx, dy = b.y + wy;
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const f = FORCE * Math.min(1, L / NEAR);                      // 목표점 가까이에서는 힘을 줄여 떨지 않게
      b.vx -= f * dx * DT; b.vy -= f * dy * DT;
      b.vx *= DAMP; b.vy *= DAMP;
      b.x += b.vx * DT; b.y += b.vy * DT;
    }
    // 공끼리 — 반발 0: 겹침의 25%만 밀어내고(스프링처럼) 접근 속도의 법선 성분 제거
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = balls[i], b = balls[j];
      let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-4, pen = 2 * RB - d;
      if (pen <= 0) continue;
      dx /= d; dy /= d;
      const push = pen * SOFT / 2;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
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
      b.x += nx * pen * SOFT; b.y += ny * pen * SOFT;
      const vn = b.vx * nx + b.vy * ny, want = pen * 24;
      if (vn < want) { b.vx += nx * (want - vn); b.vy += ny * (want - vn); }
    }
  };

  /* ── 그리기 ── */
  const blur = (src, dst, dx, dy) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f); gl.viewport(0, 0, dst.w, dst.h); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform2f(u(P_BLUR, 'uDir'), dx, dy); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const draw = () => {
    if (!F) return;
    gl.activeTexture(gl.TEXTURE0);
    // 1) 공 → A (캔버스 1/2, 안티앨리어싱, straight 알파 블렌딩)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.a.f); gl.viewport(0, 0, F.a.w, F.a.h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);          // premultiplied over
    gl.useProgram(P_BALL); gl.bindBuffer(gl.ARRAY_BUFFER, quad); bindQuad(P_BALL);
    const sx = 2 * unit / W, sy = 2 * unit / H;                       // 유닛 → 클립 공간
    gl.uniform1f(u(P_BALL, 'uEdge'), 1.5 / (R * unit * dpr / 2));
    gl.uniform1f(u(P_BALL, 'uInk'), ink);
    for (let i = 0; i < N; i++) {
      const b = balls[i];
      gl.uniform2f(u(P_BALL, 'uC'), b.x * sx, b.y * sy);
      gl.uniform2f(u(P_BALL, 'uS'), R * sx, R * sy);
      gl.uniform3fv(u(P_BALL, 'uColor'), COLORS[i]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disable(gl.BLEND);
    // 2) 블러 — 모양은 반지름 1.1R(레퍼런스 128px / 반지름 117px), 색은 0.35R. 간격은 UV 기준
    gl.useProgram(P_BLUR); bindQuad(P_BLUR);
    const bx = 1.1 * R * unit / W / (K - 1), by = 1.1 * R * unit / H / (K - 1);
    blur(F.a, F.b, bx, 0); blur(F.b, F.c, 0, by);
    blur(F.a, F.d, bx * 0.32, 0); blur(F.d, F.e, 0, by * 0.32);
    // 3) 출력 — 알파 대비로 다시 또렷하게, 캔버스는 premultiplied
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P_OUT); bindQuad(P_OUT);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, F.e.t);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, F.c.t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  size(); spawnOutside();
  new ResizeObserver(() => { size(); draw(); }).observe(box);
  if (reduce) { for (let i = 0; i < 240; i++) step(); draw(); return; }   // 동작 감소 — 뭉친 상태 한 프레임

  let raf = 0, last = 0, acc = 0, begun = false;
  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : DT; last = now; acc += dt;
    let n = 0; while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  // 처음 화면에 보일 때 바깥에서 날아들며 시작(그 전엔 멈춰 있어 등장을 놓치지 않음)
  new IntersectionObserver((e) => { if (e[0].isIntersecting) { begun = true; start(); } else if (begun) stop(); }).observe(box);
  }
})();
