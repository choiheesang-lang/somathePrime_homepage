/* ─────────────────────────────────────────────
   hero.js — 인트로 오프닝 모션 (피그마 hero_section_motion, viewBox 1920×960)
   쓰는 곳: src/pages/index.html(홈)  ·  의존: gsap, #stage 마크업(src/partials/stage.html)
   공개 API: window.STP.hero = { init, arm, play, autoplay, finish, fastForward, replay,
             render, setActive, setDiscScale, discPx } — 호출은 js/home.js
   단계: armed(대기, 커서를 따라다니는 슬라임 마스크) → 1-2 슬라임 확대·막 걷힘 → 3-6 블롭 넷이
         유리 패널에 결합 → 7-8 빛 폭발·흡수 → 9 로고 등장. GSAP이 상태 객체를 트윈하고
         gsap.ticker의 render()가 매 프레임 <path d>와 transform을 씁니다.
   ───────────────────────────────────────────── */
window.STP = window.STP || {};

STP.hero = (function () {
  const VB = { w: 1920, h: 960 };
  const C = { x: 960, y: 480 };
  // hMobile: 피그마 모바일 카드는 더 긴 상자입니다(375 프레임에서 234×257 → 패널 단위 464×510)
  const PANEL = { w: 464, h: 342, hMobile: 510 };
  const R_BASE = 80;
  const R_SLIME = 208;                 // 슬라임의 기준 크기 — 이 값 주위로 숨만 쉽니다
  const R_FULL = 1150;                 // 1920×960 대각선(≈1073)을 덮습니다
  const R_BURST_END = 1000;            // 장면 9: 빛이 모서리까지 닿지 않아 구석에는 흐린 사진이 남습니다

  /* 색은 css/tokens.css에서 읽습니다 — 팔레트의 단일 출처 */
  const token = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  let WHITE = '#FFFFFF';
  let STRONG = '#4F4D4C';              // 대기 화면의 로고 색. 블롭이 결합하면 WHITE로 바뀝니다

  // 순서 = .b-sat / .lg의 DOM 순서: 0 소마(위) 1 플레이팩토(오른쪽) 2 myON(아래) 3 리딩오션(왼쪽)
  const SATS = [
    { i: 0, side: 'top',    token: '--primary-lamp-coral',      color: '#F2A48C' },
    { i: 1, side: 'right',  token: '--primary-lamp-yellow',     color: '#F6D98A' },
    { i: 2, side: 'bottom', token: '--primary-lamp-dusty-blue', color: '#98B8E3' },
    { i: 3, side: 'left',   token: '--primary-lamp-sage-green', color: '#B7CFA3' },
  ];
  const DOCK_ORDER = [0, 1, 2, 3];
  const DOCK_T = [1.1, 1.9, 2.6, 3.3];

  let els, tl, armTl = null, rect, k = 1, R = R_BASE, P = null, hooks = {}, hdrVB = 76, panelH = PANEL.h, sPx = 1;
  let reduce = false, active = false, mobile = false, armed = false;
  let pRect = null;                                   // 카드의 화면 박스 — 테두리 스포트라이트용
  const SPOT_FADE = 320;                              // 그 스포트라이트가 사라지는 거리(px)
  /* 장면 9 로고의 데스크톱 기본 치수 (피그마 로고(17683:3280) — 432x160, 1920 중앙 정렬 x 744,
     윗변 y 408). src/partials/stage.html의 중첩 <svg class="mark-art"> 속성과 같아야 합니다. */
  const MARK_W = 432, MARK_H = 160, MARK_X = 744, MARK_Y = 408;
  /* 모바일 로고 폭(뷰포트 대비). 로고가 세로로 두툼해 비율을 더 키우면 390 폭에서 너무
     큽니다. 모바일 사양이 아직 없어 임의로 정한 값입니다 — 바꿀 일이 있으면 이 한 줄만
     고치면 됩니다. */
  const MARK_MOBILE_VW = 0.62;

  const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let N = 28, HARM = 3;
  const blobs = [];
  let sats = [], burst, slime;
  const wiggle = { amp: 1 };

  /* ── 기하 ─────────────────────────────────────────────── */
  function visibleRect() {
    let vw = 0, vh = 0;
    if (els && els.stage) { const b = els.stage.getBoundingClientRect(); vw = b.width; vh = b.height; }
    if (!vw || !vh) { vw = window.innerWidth; vh = window.innerHeight; }
    if (!vw || !vh) { vw = VB.w; vh = VB.h; }
    const ratio = vw / vh, vbRatio = VB.w / VB.h;
    let w, h;
    if (ratio > vbRatio) { w = VB.w; h = VB.w / ratio; }
    else { h = VB.h; w = VB.h * ratio; }
    return { w, h, x: (VB.w - w) / 2, y: (VB.h - h) / 2, vw, vh };
  }

  function measure() {
    rect = visibleRect();
    sPx = rect.vw / rect.w;                             // viewBox 단위당 px
    hdrVB = (els && els.header ? els.header.getBoundingClientRect().height : 76) / sPx;
    mobile = rect.w < 800;
    // 모바일 카드 CSS는 미디어 쿼리가 아니라 이 클래스를 봅니다 — 뷰포트 px 기준 분기점은
    // viewBox 단위로 재는 `mobile`과 어긋납니다
    if (els && els.body) els.body.classList.toggle('hero-narrow', mobile);
    k = gsap.utils.clamp(0.5, 1, rect.w / 1100);
    R = R_BASE * k;
    N = mobile ? 20 : 28;
    HARM = mobile ? 2 : 3;
    // 피그마 모바일: 카드 = 뷰포트 폭의 62 %, 블롭 지름 = 28 %
    const pw = mobile ? rect.w * 0.62 : Math.min(PANEL.w, rect.w * 0.86);
    if (mobile) R = rect.w * 0.14;
    panelH = mobile ? PANEL.hMobile : PANEL.h;
    P = { w: pw, h: pw * panelH / PANEL.w, k: pw / PANEL.w };
    P.x = C.x - P.w / 2; P.y = C.y - P.h / 2;
  }

  /* HTML 레이어를 SVG 좌표계에 맞춥니다. 패널은 현재(트윈 중인) 높이 기준으로 가운데 맞춤 */
  function layout() {
    const s = rect.vw / rect.w;                         // viewBox 단위당 px
    const ox = -rect.x * s, oy = -rect.y * s;
    const ph = panelH * P.k;
    els.stage.style.setProperty('--s', s);
    els.stage.style.setProperty('--k', k);
    els.stage.style.setProperty('--ox', ox + 'px');
    els.stage.style.setProperty('--oy', oy + 'px');
    els.panel.style.setProperty('--s', s * P.k);
    els.panel.style.setProperty('--ph', panelH);
    els.panel.style.left = (ox + P.x * s) + 'px';
    els.panel.style.top = (oy + (C.y - ph / 2) * s) + 'px';
    // 컨트롤은 CSS가 우하단(right 16 · bottom 32)에 고정합니다 — 피그마 장면 9 모바일의
    // playbutton 자리. 인라인 left/top이 남아 있으면 CSS를 이기므로 비워 둡니다.
    if (els.ctl) { els.ctl.style.left = ''; els.ctl.style.top = ''; }

    /* 장면 9 로고. 1920x960 viewBox가 `slice`라 좁은 화면에서는 높이 기준으로 확대되어
       좌우가 잘려 나갑니다. 좁을 때만 치수를 다시 씁니다.
       **transform이 아니라 속성**으로 씁니다 — #hero-mark의 y/opacity는 GSAP(reset()과
       타임라인)이 잡고 있어 transform을 얹으면 GSAP이 쓰는 이동값과 겹쳐 어긋납니다.
       중첩 <svg>는 x·y·width·height 속성을 받으므로 이 방식이면 충분합니다. */
    const markUse = els.mark && els.mark.firstElementChild;
    if (markUse) {
      if (mobile) {
        const w = (MARK_MOBILE_VW * rect.vw) / s;       // 렌더 폭이 뷰포트의 62%가 되는 viewBox 폭
        const h = w * (MARK_H / MARK_W);
        markUse.setAttribute('width', w.toFixed(2));
        markUse.setAttribute('height', h.toFixed(2));
        markUse.setAttribute('x', (C.x - w / 2).toFixed(2));
        // 피그마 354/814 = 43.5 % 지점에 윗변
        markUse.setAttribute('y', (rect.y + 0.435 * rect.vh / s).toFixed(2));
      } else {
        markUse.setAttribute('width', MARK_W);
        markUse.setAttribute('height', MARK_H);
        markUse.setAttribute('x', MARK_X);
        markUse.setAttribute('y', MARK_Y);
      }
    }
    pRect = null;                                       // 스포트라이트가 다음 이동 때 다시 읽습니다
  }

  function clientToVB(cx, cy) {
    const b = els.stage.getBoundingClientRect();
    return { x: rect.x + (cx - b.left) * rect.w / b.width, y: rect.y + (cy - b.top) * rect.h / b.height };
  }

  const inset = () => (mobile ? 0.08 : 0.28);   // 좌우 블롭이 화면 가장자리 밖으로 얼마나 걸치는지

  /* 슬라임이 지금 어디 있든 보이는 영역을 덮는 반지름. R_FULL은 가운데 기준 값이라
     구석에서 시작하면 대각선 전체가 필요합니다. 1.15 여유는 막이 걷히는 t = 1.05 시점에
     power2.in이 반지름의 89.7 %밖에 못 가 있기 때문입니다. */
  function coverR() {
    const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
    const d = Math.max(Math.hypot(slime.x - x0, slime.y - y0), Math.hypot(slime.x - x1, slime.y - y0),
                       Math.hypot(slime.x - x0, slime.y - y1), Math.hypot(slime.x - x1, slime.y - y1));
    return Math.max(R_FULL, d * 1.15);
  }
  // 재생 디스크 지름(viewBox 단위) — 피그마 playbutton(17811:4078)은 160 블롭에 96으로 그립니다.
  // 아주 작거나 큰 창에서도 읽히도록 화면 px로 clamp합니다
  const discVB = () => gsap.utils.clamp(52, 120, 96 * k * sPx) / sPx;
  const hideCuts = () => { els.pbCuts.forEach(g => { g.style.display = 'none'; }); els.pbHoles.forEach(g => { g.style.display = 'none'; }); };
  // 로고는 전역 배율이 아니라 블롭을 따릅니다: 모바일에서는 R이 뷰포트 폭으로 정해지므로
  // k로 키우면 원 안의 로고가 너무 작아집니다.
  const lgK = () => R / R_BASE;

  function startPos(side) {
    switch (side) {
      // 데스크톱: 위 블롭을 CSS 40px 올려 반투명 GNB에 살짝 겹칩니다.
      // 모바일은 피그마 모바일(17811:4081)대로 — 일부러 바를 피해 둡니다.
      // topFlush(홈): GNB가 없는 인트로라 아래 블롭과 거울처럼 — 화면 위 끝에 살짝 걸쳐 붙습니다.
      case 'top':    if (hooks.topFlush) return { x: C.x, y: mobile ? rect.y + rect.h * (1 - 0.817) : rect.y + R * 0.69 };
                     return { x: C.x, y: mobile ? rect.y + rect.h * 0.224 : rect.y + hdrVB + R * 1.2 - 40 / sPx };
      case 'bottom': return { x: C.x, y: mobile ? rect.y + rect.h * 0.817 : rect.y + rect.h - R * 0.69 };
      case 'left':   return { x: rect.x + R * inset(), y: C.y };
      default:       return { x: rect.x + rect.w - R * inset(), y: C.y };
    }
  }
  function dockPos(side) {
    const ov = 24 * k;                                  // 블롭이 유리 안으로 파고드는 깊이
    switch (side) {
      case 'top':    return { x: C.x, y: P.y - R + ov };
      case 'bottom': return { x: C.x, y: P.y + P.h + R - ov };
      case 'left':   return { x: P.x - R + ov, y: C.y };
      default:       return { x: P.x + P.w + R - ov, y: C.y };
    }
  }
  function squash(side) {
    return (side === 'top' || side === 'bottom') ? { sx: 1.14, sy: 0.86 } : { sx: 0.86, sy: 1.14 };
  }

  function query() {
    const q = (s) => document.querySelector(s);
    els = {
      body: document.body,
      stage: q('#stage'),
      header: q('#site-header'),
      svg: q('#hero'),
      veilSolid: q('#veil-solid'),
      slimeEl: q('#slime'),
      photoBlur: q('#photo-blur-sd'),
      photo: q('#hero-photo'),
      playCursor: q('#play-btn'),      // 커서를 따라다니는 디스크(SVG, #hero-top 안)
      pbBodies: Array.from(document.querySelectorAll('.pb-body')),
      pbCuts: SATS.map(sa => q(`.pb-cut[data-i="${sa.i}"]`)),
      pbHoles: SATS.map(sa => q(`#pb-knock .m-sat[data-i="${sa.i}"]`)),
      pbCutFills: SATS.map(sa => q(`.pb-cut[data-i="${sa.i}"] circle`)),
      blur: q('#goo-blur'),
      glowBlur: q('#glow-blur'),
      burstEl: q('#burst'),
      halo: q('#burst-halo'),
      burstGlow: q('#burst-glow'),
      bgLight: q('#bg-light'),
      s9Glow: q('#s9-glow'),          // 장면 9 색 덩어리 (피그마 circle_animation)
      mark: q('#hero-mark'),
      // 장면 9 로고의 세 겹(선 · 채움 · 빛)과 카드 로고 채움
      markLines: Array.from(document.querySelectorAll('#hero-mark .mark-line path')),
      markLineG: q('#hero-mark .mark-line'),
      markReveal: q('#hero-mark .mark-reveal'),
      markShine: q('#hero-mark .mark-shine'),
      cardFill: q('.panel__soma-fill'),
      panel: q('#panel'),
      panelContent: q('#panel-content'),
      panelItems: Array.from(document.querySelectorAll('.panel__item')),
      ctl: q('#hero-ctl'),             // 고정 표현 (터치·키보드). 커서 디스크와 같은 컨트롤
      ctlIco: q('#hero-ctl use'),
      ctlLabel: q('#hero-ctl .hero-ctl__label'),
      pbIcons: Array.from(document.querySelectorAll('#play-btn .pb-icon')),
      pbLabels: Array.from(document.querySelectorAll('#play-btn .pb-label')),
      glows: { top: q('.glow--top'), right: q('.glow--right'), bottom: q('.glow--bottom'), left: q('.glow--left') },
      logos: SATS.map(s => q(`.lg[data-i="${s.i}"]`)),
    };
  }

  /* ── 블롭 상태 · 패스 생성 ─────────────────────────────── */
  function makeBlob(vis, twin, seed, kind) {
    const rnd = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return {
      x: C.x, y: C.y, r: 0, rot: 0, sx: 1, sy: 1, m: 1, tt: 0,
      om: [0.9 + rnd(1) * 0.5, -(1.1 + rnd(2) * 0.5), 0.6 + rnd(3) * 0.4, 0.45 + rnd(7) * 0.3],
      ph: [rnd(4) * 6.283, rnd(5) * 6.283, rnd(6) * 6.283, rnd(8) * 6.283],
      vis, twin, hidden: true, lastD: '', lastT: '', kind: kind || 'sat', freeze: false, frozen: false,
    };
  }

  /* 패널 사각형의 극좌표 반지름 (유리에서 빛이 번져 나오는 모핑에 씁니다) */
  function rectR(th) {
    const hw = P.w / 2, hh = P.h / 2;
    const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    return Math.min(c > 1e-4 ? hw / c : 1e9, s > 1e-4 ? hh / s : 1e9);
  }

  /* (0,0) 중심의 닫힌 구불구불한 패스: Catmull-Rom → 큐빅 베지어 */
  function blobPath(b, t, ampScale, ox, oy) {
    const A = ampScale === undefined ? 1 : ampScale;
    ox = ox || 0; oy = oy || 0;
    const n = b.kind === 'burst' ? 48 : N;
    let px = new Array(n), py = new Array(n);
    if (b.kind === 'burst') {
      // 패널 근처에서는 불꽃 같은 돌기(22%), 커질수록 매끈하게(7%)
      const grow = gsap.utils.clamp(0, 1, (b.r - 240 * P.k) / (900 * P.k));
      const ampF = A * wiggle.amp * (0.22 - 0.15 * grow);
      const drift = t * 0.25;
      for (let i = 0; i < n; i++) {
        const th = i / n * 6.283185307;
        const base = (1 - b.m) * rectR(th) + b.m * b.r;
        const mod = 0.35 * Math.sin(2 * th + b.om[0] * t + b.ph[0] + drift)
                  + 0.30 * Math.sin(3 * th - b.om[1] * t + b.ph[1])
                  + 0.20 * Math.sin(5 * th + b.om[2] * t + b.ph[2] - drift)
                  + 0.15 * Math.sin(7 * th + b.om[3] * t + b.ph[3]);
        const rr = base * (1 + ampF * mod * b.m);
        px[i] = rr * Math.cos(th); py[i] = rr * Math.sin(th);
      }
    } else {
      // 위성 4 % · 슬라임 7 %(더 살아 있는 생물), 큰 반지름에서는 상한을 둡니다.
      // 커서가 가까우면 b.ampK / b.spdK가 올라가 건드린 블롭이 눈에 띄게 들썩입니다.
      const rel = b.kind === 'slime' ? 0.07 : 0.04 * (b.ampK || 1);
      const tt = b.tt;                                // render()에서 누적합니다 — 절대 t * spdK가 아닙니다
      const amp = A * wiggle.amp * rel * Math.min(b.r, 260 * k);
      for (let i = 0; i < n; i++) {
        const th = i / n * 6.283185307;
        let mod = 0.55 * Math.sin(2 * th + b.om[0] * tt + b.ph[0]) + 0.30 * Math.sin(3 * th + b.om[1] * tt + b.ph[1]);
        if (HARM > 2) mod += 0.15 * Math.sin(5 * th + b.om[2] * tt + b.ph[2]);
        const rr = b.r + amp * mod;
        px[i] = rr * Math.cos(th); py[i] = rr * Math.sin(th);
      }
    }
    if (ox || oy) for (let i = 0; i < n; i++) { px[i] += ox; py[i] += oy; }
    let d = 'M' + px[0].toFixed(1) + ' ' + py[0].toFixed(1);
    for (let i = 0; i < n; i++) {
      const i0 = (i + n - 1) % n, i1 = (i + 1) % n, i2 = (i + 2) % n;
      d += 'C' + (px[i] + (px[i1] - px[i0]) / 6).toFixed(1) + ' ' + (py[i] + (py[i1] - py[i0]) / 6).toFixed(1)
         + ' ' + (px[i1] - (px[i2] - px[i]) / 6).toFixed(1) + ' ' + (py[i1] - (py[i2] - py[i]) / 6).toFixed(1)
         + ' ' + px[i1].toFixed(1) + ' ' + py[i1].toFixed(1);
    }
    return d + 'Z';
  }

  function write(b, d, tr) {
    if (d !== b.lastD) {
      b.vis.setAttribute('d', d);
      if (b.twin) b.twin.setAttribute('d', d);
      if (b.clips) for (const c of b.clips) c.setAttribute('d', d);   // #hero-top 클립 + 녹아웃 마스크
      b.lastD = d;
    }
    if (tr !== b.lastT) {
      b.vis.setAttribute('transform', tr);
      if (b.twin) b.twin.setAttribute('transform', tr);
      if (b.clips) for (const c of b.clips) c.setAttribute('transform', tr);
      b.lastT = tr;
    }
  }

  /* 흔들림 위상은 블롭마다 **누적**합니다 — 절대 `t * spdK`가 아닙니다. 절대 틱커 시각에
     attract()가 매 프레임 바꾸는 계수를 곱하면 t에 비례한 위상 점프가 생깁니다 — 탭을 오래
     열어 둘수록 커서가 블롭에 처음 다가갈 때 더 크게 튀고, 콜드 로드(attract의 dt가 0.1s
     상한에 걸린 상태)에서는 그 점프가 다시 약 5배 커집니다.
     누적하면 spdK는 그 시점부터의 속도만 바꾸고 다른 영향이 없습니다.
     dt 상한은 400ms짜리 끊긴 프레임이 모양을 한 번에 건너뛰는 것도 막습니다. */
  function render(time, dtMs) {
    const t = time === undefined ? gsap.ticker.time : time;
    const dt = Math.min(0.05, (dtMs || 0) / 1000);
    for (const b of blobs) {
      b.tt += dt * (b.spdK || 1);
      if (b.frozen) continue;
      if (b.r < 0.5) { if (!b.hidden) { write(b, '', ''); b.hidden = true; } continue; }
      b.hidden = false;
      const tr = `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot.toFixed(1)}) scale(${b.sx.toFixed(3)} ${b.sy.toFixed(3)})`;
      if (b.freeze) {                                   // 흔들림 없이 마지막으로 한 번 쓰고 더는 건드리지 않습니다
        write(b, blobPath(b, t, 0), tr);
        b.frozen = true;
        continue;
      }
      if (b.kind === 'slime') {
        // userSpaceOnUse 패턴은 요소 자신의 transform을 따라가므로 슬라임은 transform=""을
        // 유지하고 위치를 패스에 직접 굽습니다 — 사진이 #hero-photo에 고정된 채로 남습니다.
        if (b.r >= R_FULL) {                            // 이만큼 크면 흔들림을 버리고 그냥 원으로
          const y = b.y.toFixed(1);                     // 매 프레임 씁니다 — 아직 커지는 중일 수 있습니다
          write(b, `M${(b.x - b.r).toFixed(1)} ${y}a${b.r} ${b.r} 0 1 0 ${2 * b.r} 0a${b.r} ${b.r} 0 1 0 ${-2 * b.r} 0Z`, '');
          b.staticFull = true;
          continue;
        }
        b.staticFull = false;
        write(b, blobPath(b, t, undefined, b.x, b.y), '');
        continue;
      }
      write(b, blobPath(b, t), tr);
    }
    syncCuts();
    syncPhotoFilter();
  }

  /* #photo-blur는 σ가 16으로 오르는 마지막 0.8초(T9)에만 실제로 무언가를 합니다.
     그 전 — 대기 화면과 인트로의 거의 전부 — 동안 σ는 0.5로, 390 폭에서 0.44 CSS px입니다.
     화면에는 한 픽셀도 차이가 없는데(대조 결과 0/1,316,640), 1758x914 CSS px = dpr 3에서
     1450만 픽셀짜리 전면 필터 패스를 매 프레임 물게 합니다. START를 기다리는 대기 화면에
     사람들이 오래 머무를수록 그만큼 더 아깝습니다. σ가 의미를 가질 때만
     붙입니다. */
  function syncPhotoFilter() {
    if (!els.photo || !els.photoBlur) return;
    const want = parseFloat(els.photoBlur.getAttribute('stdDeviation')) > 1;
    if (want === els.photo.hasAttribute('filter')) return;
    if (want) els.photo.setAttribute('filter', 'url(#photo-blur)');
    else els.photo.removeAttribute('filter');
  }

  /* render와 breathe를 함께 붙이고 함께 거둡니다. breathe를 틱커에 남겨 두면 !armed라
     즉시 리턴하더라도 인트로가 끝난 뒤 페이지가 유휴 상태에 못 들어가는 원인이 됩니다
     (home.js의 finishIntro가 setActive(false)로 거둡니다). */
  function setActive(on) {
    if (on === active) return;
    active = on;
    if (on) { gsap.ticker.add(render); gsap.ticker.add(breathe); }
    else    { gsap.ticker.remove(render); gsap.ticker.remove(breathe); }
  }

  /* ── 인트로 컨트롤: 하나의 버튼, 세 상태 ──────────────────────
     대기 → START, 재생 중 → SKIP, 끝난 뒤 → RESTART. 커서를 따라다니는 SVG 디스크와
     화면에 고정된 <button>이 같은 상태를 나눠 갖습니다(커서가 없는 환경에서는 후자만 보임).
     reduced motion에서는 인트로가 재생되지 않으므로 상태를 아예 붙이지 않습니다 —
     `body[data-ctl]`이 CSS의 표시 조건이자 커서 숨김 조건입니다. */
  /* box = 글리프 박스 한 변. 피그마는 행을 잉크가 아니라 **박스**로 가운데 맞춥니다 —
     SKIP 변형이 x 19 / width 58로 (96−58)/2 에 정확히 앉고, RESTART는 16 박스라
     x 6 / width 84입니다(피그마 playbutton 변형(17937:4996)). */
  const CTL = {
    start:   { ico: '#ico-start',   label: 'START',   aria: '인트로 재생',      box: 20 },
    skip:    { ico: '#ico-skip',    label: 'SKIP',    aria: '인트로 건너뛰기',  box: 20 },
    restart: { ico: '#ico-restart', label: 'RESTART', aria: '인트로 다시 재생', box: 16 },
  };
  let ctlState = null;

  /* 라벨 폭이 상태마다 달라지므로 행을 매번 다시 잽니다. 고정 오프셋(-36)은 START 전용
     값이라 SKIP/RESTART에서는 행이 디스크 안에서 치우칩니다.
     다섯 벌(.pb-base + .pb-cut 4)을 **함께** 씁니다 — 위성 블롭 위에서 베이스와 클립 사본이
     1px이라도 어긋나면 겹치는 자리에 테두리가 보입니다. */
  function layoutCtlRow(box) {
    const t = els.pbLabels[0];
    if (!t || !t.getComputedTextLength) return;
    const w = t.getComputedTextLength();
    const x = -(box + 4 + w) / 2;                 // 행 = [박스] gap 4 [라벨], 96 디스크 안에서 대칭
    els.pbIcons.forEach(u => {
      u.setAttribute('x', x.toFixed(2));
      u.setAttribute('y', (-box / 2).toFixed(2));
      u.setAttribute('width', box);
      u.setAttribute('height', box);
    });
    els.pbLabels.forEach(l => { l.setAttribute('x', (x + box + 4 + w / 2).toFixed(2)); });
  }

  function setCtl(state) {
    if (reduce || ctlState === state) return;
    const c = CTL[state];
    if (!c) return;
    ctlState = state;
    els.body.dataset.ctl = state;
    els.pbIcons.forEach(u => u.setAttribute('href', c.ico));
    els.pbLabels.forEach(l => { l.textContent = c.label; });
    layoutCtlRow(c.box);
    if (els.ctl) {
      els.ctlIco.setAttribute('href', c.ico);
      els.ctlLabel.textContent = c.label;
      els.ctl.setAttribute('aria-label', c.aria);
    }
  }

  /* 컨트롤이 눌린 것을 알리는 것은 컨트롤 자신이어야 합니다. .pb-body는 프레임마다
     위치·배율을 덮어쓰므로 누름 축소는 부모 그룹(#play-btn)의 CSS 클래스로 겁니다. */
  const pressOn  = () => { if (ctlState && ptr.has) els.playCursor.classList.add('is-press'); };
  const pressOff = () => els.playCursor.classList.remove('is-press');

  /* 컨트롤·스테이지 클릭이 상태에 따라 갈라지는 한 곳 */
  function activate() {
    if (reduce) return;
    if (armed) play();
    else if (els.body.classList.contains('is-intro')) fastForward();
    else if (ctlState === 'restart') hooks.onRestart && hooks.onRestart();
  }

  /* ── 포인터 → 슬라임 (대기 상태 전용) ─────────────────── */
  const ptr = { has: false };
  let lastClient = null;               // ctlState가 붙기 전에 본 마지막 포인터 좌표
  const slimeSize = { base: 0 };       // popSlime()이 0 → R_SLIME*k로 키우고, breathe()가 이 값에서 slime.r을 만듭니다
  let slimeX, slimeY, slimePop = null, slimePopT = 0, slimePopped = false;

  /* 슬라임은 커서 자리에 나타나므로 등장은 첫 포인터 이동을 기다립니다.
     마우스가 끝내 움직이지 않으면 1.5초 뒤 가운데로 폴백합니다. */
  function popSlime() {
    clearTimeout(slimePopT); slimePopT = 0;
    if (slimePopped || !armed || reduce) return;
    slimePopped = true;
    slimePop = gsap.to(slimeSize, { base: R_SLIME * k, duration: 0.7, ease: 'back.out(1.4)' });
  }
  function clearPop() {
    clearTimeout(slimePopT); slimePopT = 0;
    if (slimePop) { slimePop.kill(); slimePop = null; }
    slimePopped = false;
  }

  /* 디스크를 viewBox 좌표 v에 놓습니다. 위치를 쓰는 곳이 두 군데(포인터 이동, arm의
     폴백)라 한 함수로 모읍니다. */
  /* 홈: SKIP에 가까워질수록 디스크를 줄입니다(home.js). 1 = 원래 크기 */
  let discK = 1;
  function setDiscScale(kk) {
    discK = kk;
    if (ptr.v && els) placeDisc(ptr.v);
  }
  const discPx = () => discVB() * sPx;                 // 배율 1일 때 화면 지름(px)
  function placeDisc(v) {
    const tr = `translate(${v.x.toFixed(1)} ${v.y.toFixed(1)}) scale(${(discVB() / 96 * discK).toFixed(4)})`;
    for (const g of els.pbBodies) g.setAttribute('transform', tr);
  }

  function onPointerMove(e) {
    if (reduce) return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
      /* 홈(touchMask): 대기 화면에서는 손가락으로도 마스크를 끌어 봅니다. 디스크 · OS 커서 ·
         카드 스포트라이트는 마우스 전용이라 건드리지 않습니다. */
      if (hooks.touchMask && armed && slimeX) {
        const v = clientToVB(e.clientX, e.clientY);
        slimeX(v.x); slimeY(v.y);
      }
      return;
    }
    /* 좌표는 **ctlState 이전에도** 기억합니다. arm 전에 움직인 마우스를 여기서 버리면
       arm 시점에 showDisc()가 커서 위치를 몰라 디스크가 원점에 opacity 0으로 남고,
       START가 화면 어디에도 없게 됩니다. */
    lastClient = { x: e.clientX, y: e.clientY };
    if (!ctlState) return;                                  // 디스크는 세 상태 모두 커서를 따라갑니다
    const v = clientToVB(e.clientX, e.clientY);
    ptr.v = v;
    if (!ptr.has) {
      ptr.has = true;
      els.body.classList.add('ptr-on');                     // 커서 위치를 아는 동안만 OS 커서를 숨깁니다
      if (armed && !slimePopped) { slime.x = v.x; slime.y = v.y; }   // 아직 숨어 있으니 커서 바로 아래에서 나타납니다
      gsap.set(els.playCursor, { opacity: 1 });             // 처음은 set으로 즉시 켭니다 — 미끄러져 들어오지 않게
      popSlime();
    }
    // 베이스와 클립 사본 넷이 transform 하나를 나눠 씁니다. 클립 자체는 transform 없는
    // .pb-cut 부모에 있어 viewBox 좌표에 머물고, 그래서 블롭과 정확히 맞습니다
    placeDisc(v);
    if (!armed) return;                                     // 슬라임과 카드 스포트라이트는 대기 상태에만 있습니다
    slimeX(v.x); slimeY(v.y);
    spotlight(e.clientX, e.clientY);
  }
  /* ── 카드 테두리의 커서 스포트라이트 ───────────────────
     .panel에 커스텀 프로퍼티 둘을 씁니다. 링 자체는 css/hero.css(.panel::before)에 있습니다.
     pRect는 카드 박스 캐시 — pointermove마다 돌므로 캐시하고, layout()이 비웁니다. */
  function spotlight(cx, cy) {
    if (!pRect) pRect = els.panel.getBoundingClientRect();
    const r = pRect;
    els.panel.style.setProperty('--spot-x', (cx - r.left).toFixed(1) + 'px');
    els.panel.style.setProperty('--spot-y', (cy - r.top).toFixed(1) + 'px');
    // 카드 사각형까지의 거리: 카드 위면 0, 밖에서는 SPOT_FADE에 걸쳐 사라집니다
    const dx = Math.max(r.left - cx, 0, cx - r.right);
    const dy = Math.max(r.top - cy, 0, cy - r.bottom);
    const a = 1 - Math.hypot(dx, dy) / SPOT_FADE;
    els.panel.style.setProperty('--spot-a', (a > 0 ? (a > 1 ? 1 : a) : 0).toFixed(3));
  }
  function spotOff() {
    if (els && els.panel) els.panel.style.setProperty('--spot-a', '0');
  }

  function onPointerLeave(e) {
    if (!ctlState) return;
    if (hooks.touchMask && e && e.pointerType === 'touch') return;   // 손가락을 떼도 마스크는 그 자리에
    ptr.has = false;                                    // 다시 들어오면 「첫 이동」 분기를 다시 탑니다
    ptr.v = null;
    lastClient = null;                                  // 창을 벗어났으니 「거기 있다」는 보장이 끝납니다
    els.body.classList.remove('ptr-on');                // OS 커서를 돌려줍니다
    gsap.set(els.playCursor, { opacity: 0 });
    pressOff();
    hideCuts();
    if (!armed) return;
    slimeX(C.x); slimeY(C.y);
    spotOff();
  }

  /* 크기는 하나, 늘 숨 쉽니다 — 슬라임은 포인터에 따라 커지거나 작아지지 않습니다 */
  function breathe(time, dtMs) {
    if (!armed || reduce) return;
    slime.r = slimeSize.base * (1 + 0.05 * Math.sin(time * 1.8));   // 생물은 늘 숨을 쉽니다
    attract(Math.min(0.1, dtMs / 1000));
  }

  /* 커서 중력(정밀 포인터 전용): 커서가 다가간 위성은 1.2×로 부풀고 큰 슬라임 쪽으로
     끌려가며 더 세게 흔들립니다. 멀어지면 전부 스스로 제자리로 돌아갑니다. */
  const PULL_RANGE = 420, PULL_MAX = 0.28, GROW_MAX = 0.20;   // GROW_MAX 0.20 = 1.2× 상한
  function attract(dt) {
    if (armTl && armTl.isActive()) return;              // 등장 팝이 먼저 끝나게 둡니다
    const ease = 1 - Math.exp(-dt * 6);
    const v = ptr.has ? ptr.v : null;
    for (let i = 0; i < sats.length; i++) {
      const b = sats[i];
      if (!b.home) continue;
      let target = 0;
      if (v) {
        const d = Math.hypot(v.x - b.home.x, v.y - b.home.y);
        target = gsap.utils.clamp(0, 1, 1 - (d - R) / (PULL_RANGE * k));
      }
      const was = b.f;
      b.f += (target - b.f) * ease;
      if (b.f < 0.002 && target === 0) b.f = 0;
      if (b.f === 0 && was === 0) continue;             // 쉬는 중: 쓸 게 없습니다
      const pull = PULL_MAX * b.f;
      b.x = b.home.x + ((v ? v.x : b.home.x) - b.home.x) * pull;
      b.y = b.home.y + ((v ? v.y : b.home.y) - b.home.y) * pull;
      b.r = R * (1 + GROW_MAX * b.f);
      b.ampK = 1 + 1.2 * b.f;
      b.spdK = 1 + 0.2 * b.f;
      gsap.set(els.logos[i], { x: b.x, y: b.y, scale: lgK() * (1 + GROW_MAX * b.f) });
    }
  }

  /* 디스크가 어느 위성 블롭과 겹치는지. 겹치는 사본만 켜고 나머지는 끕니다.
     판정은 render()에서 부릅니다 — attract()(대기 상태 전용) 안에 두면 SKIP 상태
     (인트로 재생 중)에 반전이 죽습니다. 클립 지오메트리는 write()가 이미
     매 프레임 vis·twin과 함께 미러링하므로 따로 할 일이 없고, 블롭 좌표는 인트로 중에는
     타임라인이 쓰므로 그대로 따라갑니다. 폭발(T8)에서 r → 0이 되면 저절로 꺼집니다. */
  function syncCuts() {
    if (!sats.length || !els.pbCuts) return;
    const v = (ctlState && ptr.has) ? ptr.v : null;
    const dr = discVB() / 2;                            // 재생 디스크 반지름, 겹침 판정용
    for (let i = 0; i < sats.length; i++) {
      const b = sats[i], cut = els.pbCuts[i], hole = els.pbHoles[i];
      if (!cut) continue;
      // ''로 두면 인라인 값이 빠져 `.pb-cut { display: none }` 규칙으로 떨어집니다
      const want = (v && b.r > 0.5 && Math.hypot(v.x - b.x, v.y - b.y) < b.r + dr) ? 'inline' : 'none';
      if (cut.style.display !== want) { cut.style.display = want; hole.style.display = want; }
      // 장면 8에서 블롭이 흰색으로 바랬다가 사라집니다 — 사본이 브랜드 색으로 남으면 어긋납니다
      if (want === 'inline' && els.pbCutFills[i]) {
        const f = b.vis.getAttribute('fill');
        if (f && els.pbCutFills[i].style.fill !== f) els.pbCutFills[i].style.fill = f;
      }
    }
  }

  /* ── 대기 화면(장면 1) 모습으로 되돌리기 ───────────────── */
  function reset() {
    measure();
    layout();
    if (!blobs.length) {
      sats = SATS.map((s, i) => {
        const b = makeBlob(document.querySelector(`.b-sat[data-i="${s.i}"]`), document.querySelector(`.c-sat[data-i="${s.i}"]`), 10 + i, 'sat');
        // 여기서 붙여야 write()의 diff 캐시가 첫 프레임부터 맞습니다.
        // 이 클립·마스크는 커서 디스크(#hero-top)가 위성 위를 지날 때 잉크를 뒤집는
        // 용도뿐인데, 터치에서는 #hero-top이 display:none입니다(hero.css의 (pointer:coarse)).
        // 그런데도 붙여 두면 write()가 프레임마다 위성 4개 × 2요소 × 2속성 = 16회를 그리지도
        // 않는 노드에 쓰고, 그 쓰기가 전부 #goo 필터 서브트리를 더럽혀 전면 가우시안을
        // 다시 돌게 합니다. 커서가 있을 때만 붙입니다.
        if (finePointer()) {
          b.clips = [document.querySelector(`#sat-clip-${s.i} .k-sat`), document.querySelector(`#pb-knock .m-sat[data-i="${s.i}"]`)];
        }
        return b;
      });
      blobs.push(...sats);
      burst = makeBlob(els.burstEl, els.halo, 77, 'burst');
      slime = makeBlob(els.slimeEl, document.getElementById('slime-crisp'), 5, 'slime');
      blobs.push(burst, slime);
    }
    // play()가 이 트윈들을 죽이는데, 죽은 quickTo 세터는 되살아나지 않습니다 —
    // 그래서 한 번이 아니라 reset()마다 다시 만듭니다(아니면 replay 뒤 포인터 추적이 끊깁니다).
    slimeX = gsap.quickTo(slime, 'x', { duration: 0.45, ease: 'power3' });
    slimeY = gsap.quickTo(slime, 'y', { duration: 0.45, ease: 'power3' });
    if (armTl) { armTl.kill(); armTl = null; }
    if (tl) tl.kill();

    gsap.set(els.photoBlur, { attr: { stdDeviation: 0.5 } });
    gsap.set(els.veilSolid, { opacity: 1 });
    gsap.set(els.blur, { attr: { stdDeviation: 9 * k } });        // 대기: 슬라임이 블롭에 녹아들도록 goo를 세게
    gsap.set(els.glowBlur, { attr: { stdDeviation: 28 } });
    gsap.set(els.burstEl, { opacity: 0 });
    gsap.set(els.burstGlow, { opacity: 0 });
    gsap.set([els.bgLight, els.mark, els.s9Glow], { opacity: 0, y: 0 });
    // 장면 9 로고 — 선 안 그려짐 · 채움 0 · 빛 왼쪽 밖 / 카드 로고 채움 0단계.
    // replay()가 build() → reset()으로 여기를 지나 처음 상태로 돌아옵니다.
    gsap.set(els.markLines, { strokeDashoffset: 100 });
    gsap.set(els.markLineG, { opacity: 1 });
    gsap.set(els.markReveal, { attr: { width: 0 } });
    gsap.set(els.markShine, { attr: { x: -200 } });
    gsap.set(els.cardFill, { attr: { 'fill-opacity': 0 } });
    gsap.set(els.panel, { opacity: 1, scale: 1, transformOrigin: '50% 50%',
      borderColor: 'rgba(221,221,221,0.2)', backgroundColor: 'rgba(255,255,255,0.01)' });
    gsap.set(els.panelContent, { opacity: 1, scale: 1 });
    gsap.set(els.panelItems, { opacity: 1, y: 0 });
    gsap.set(Object.values(els.glows), { opacity: 0 });

    Object.assign(burst, { x: C.x, y: C.y, r: 0, m: 0, sx: 1, sy: 1, rot: 0, lastD: '', lastT: '', freeze: false, frozen: false });
    Object.assign(slime, { x: C.x, y: C.y, r: 0, sx: 1, sy: 1, rot: 0, lastD: '', lastT: '', staticFull: false });
    ptr.has = false; ptr.v = null;
    clearPop();
    slimeSize.base = R_SLIME * k;
    gsap.set(els.playCursor, { opacity: 0 });
    hideCuts();
    spotOff();                                          // 다시 재생할 때 이전 테두리 불빛이 남으면 안 됩니다
    placeSats();
    render();
  }

  /* 블롭 넷(과 로고)을 현재 보이는 가장자리에 세웁니다.
     keepR이면 반지름은 건드리지 않습니다 — armTl이 아직 등장 팝을 트윈 중일 수 있습니다. */
  function placeSats(keepR) {
    SATS.forEach((s, idx) => {
      const p = startPos(s.side);
      const r = keepR ? sats[idx].r : R;
      Object.assign(sats[idx], { x: p.x, y: p.y, r, rot: 0, sx: 1, sy: 1, lastD: '', lastT: '', home: p, f: 0, ampK: 1, spdK: 1 });
      sats[idx].vis.setAttribute('fill', s.color);
      sats[idx].twin.setAttribute('fill', s.color);
      els.pbCutFills[idx].style.fill = s.color;      // 인라인으로: 프레젠테이션 속성은 .pb-body circle 규칙에 집니다
      gsap.set(els.logos[idx], { x: p.x, y: p.y, opacity: 1, scale: lgK(), color: STRONG, transformOrigin: '50% 50%' });
    });
  }

  /* ── 인트로 타임라인 (START에서 재생) ──────────────────── */
  function build() {
    reset();
    buildTimeline();
  }

  /* 인트로 타임라인은 dockPos()/R을 값으로 굽기 때문에 기하가 바뀔 때마다 다시 만들어야 합니다 */
  function buildTimeline() {
    if (tl) tl.kill();
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

    /* 장면 1 → 2 : 슬라임이 화면 전체로 부풀고 막이 걷힙니다 */
    tl.add(() => hooks.onToDark && hooks.onToDark(), 0)
      .to(els.blur, { attr: { stdDeviation: 3 * k }, duration: 0.8, ease: 'power1.inOut' }, 0.3)
      .to(slime, { r: () => coverR(), duration: 0.95, ease: 'power2.in' }, 0.15)
      .set(els.veilSolid, { opacity: 0.07 }, 1.05)
      .set(slime, { r: 0 }, 1.12);

    /* 장면 3 → 6 : 블롭이 한 변씩 패널에 결합합니다 */
    DOCK_ORDER.forEach((idx, n) => {
      const s = SATS[idx], b = sats[idx], t = DOCK_T[n];
      const d = dockPos(s.side), sq = squash(s.side);
      tl.to(b, { x: d.x, y: d.y, duration: 0.75, ease: 'power2.inOut' }, t)
        .to(els.logos[idx], { x: d.x, y: d.y, duration: 0.75, ease: 'power2.inOut' }, t)
        .to(b, { sx: sq.sx, sy: sq.sy, duration: 0.22, ease: 'power2.out' }, t + 0.6)
        .to(b, { sx: 1 + (sq.sx - 1) * 0.55, sy: 1 + (sq.sy - 1) * 0.55, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, t + 0.82)
        .to(els.logos[idx], { color: WHITE, duration: 0.3, ease: 'power1.out' }, t + 0.62)
        .to(els.glows[s.side], { opacity: 1, duration: 0.4, ease: 'power2.out' }, t + 0.62)
        .to(els.panel, {
          borderColor: `rgba(255,255,255,${(0.2 + 0.14 * (n + 1)).toFixed(2)})`,
          backgroundColor: `rgba(255,255,255,${(0.01 + 0.035 * (n + 1)).toFixed(3)})`,
          duration: 0.5, ease: 'power1.out',
        }, t + 0.62)
        /* 카드 로고가 부딪힐 때마다 한 단계씩 차오릅니다(피그마 카드 로고(18019:6577), 0 → 0.4).
           바로 위 테두리·배경과 같은 시점·같은 `n + 1` 규칙 — 카드 전체가 한 박자로 밝아집니다.
           4단계(3.92s) 직후 4.1s에 카드가 빛으로 바뀌지만 power3.in이라 약 0.4초는 보입니다. */
        .to(els.cardFill, { attr: { 'fill-opacity': (0.1 * (n + 1)).toFixed(2) }, duration: 0.5, ease: 'power1.out' }, t + 0.62);
    });

    /* 장면 7 : 패널이 빛에 자리를 내줍니다 */
    const T7 = 4.1;
    tl.to(els.panelContent, { scale: 0.25, opacity: 0, duration: 0.6, ease: 'power3.in', transformOrigin: '50% 50%' }, T7)
      .to(els.panel, { scale: 0.25, opacity: 0, duration: 0.85, ease: 'power3.in' }, T7 + 0.1)
      .set(burst, { r: Math.max(P.w, P.h) / 2, m: 0 }, T7 + 0.05)
      .to(els.burstEl, { opacity: 1, duration: 0.35, ease: 'power1.out' }, T7 + 0.05)
      .to(els.burstGlow, { opacity: 0.72, duration: 0.5, ease: 'power1.out' }, T7 + 0.1)
      .to(burst, { m: 1, duration: 0.7, ease: 'power2.inOut' }, T7 + 0.1)
      .to(burst, { r: 310 * P.k, duration: 0.85, ease: 'power2.out' }, T7 + 0.1)
      .to(els.blur, { attr: { stdDeviation: 14 * k }, duration: 0.5, ease: 'power1.inOut' }, T7 + 0.3);

    /* 장면 8 : 빛이 커지고 블롭이 끌려 들어가 흡수됩니다 */
    const T8 = T7 + 0.95;
    tl.to(burst, { r: 480 * P.k, duration: 1.1, ease: 'power1.inOut' }, T8)
      .to(els.glowBlur, { attr: { stdDeviation: 48 }, duration: 1.1, ease: 'none' }, T8);
    SATS.forEach((s, idx) => {
      const b = sats[idx], d = dockPos(s.side);
      const to = { x: d.x + (C.x - d.x) * 0.55, y: d.y + (C.y - d.y) * 0.55 };
      const t = T8 + 0.05 + idx * 0.08;
      tl.to(b, { x: to.x, y: to.y, sx: 1, sy: 1, duration: 0.9, ease: 'power2.in' }, t)
        .to(els.logos[idx], { x: to.x, y: to.y, duration: 0.9, ease: 'power2.in' }, t)
        .to(els.logos[idx], { opacity: 0, scale: 0.6 * lgK(), duration: 0.3, ease: 'power2.in' }, t + 0.4)
        .to([b.vis, b.twin], { attr: { fill: WHITE }, duration: 0.35, ease: 'power1.in' }, t + 0.45)
        .to(b, { r: 0, duration: 0.5, ease: 'power3.in' }, t + 0.65);
    });

    /* 장면 9 : 빛이 화면을 거의 채우고(구석엔 흐린 사진이 남음), 글로우 + 외곽선 로고 */
    const T9 = T8 + 1.15;
    tl.to(burst, { r: R_BURST_END * P.k, duration: 1.05, ease: 'power2.in' }, T9)
      .to(els.glowBlur, { attr: { stdDeviation: 70 }, duration: 0.8, ease: 'none' }, T9)
      .to(els.photoBlur, { attr: { stdDeviation: 16 }, duration: 0.8, ease: 'power1.in' }, T9)
      .to(els.blur, { attr: { stdDeviation: 0 }, duration: 0.4 }, T9 + 0.6)
      .to([els.bgLight, els.s9Glow], { opacity: 1, duration: 0.8, ease: 'power1.out' }, T9 + 0.7)
      .add(() => hooks.onToLight && hooks.onToLight(), T9 + 0.85)
      .add(() => { burst.freeze = true; }, T9 + 1.15);

    /* 장면 9 로고 (피그마 로고(18009:5379)) — T9+1.0에서 시작해 약 2.5초.
       외곽선 1.0 → 채움 0.8 → 빛 0.7. 전부 **그룹 안쪽** 요소에 겁니다(그룹 자체의
       opacity·y는 reset()과 타임라인이 GSAP으로 씁니다). 끝값이 곧 최종 화면이라 finish()의
       progress(1) 점프도 같은 그림에 떨어집니다 — 콜백에서 CSS 애니메이션을 켜지 않는 이유입니다. */
    const TM = T9 + 1.0;
    tl.set(els.mark, { opacity: 1 }, TM)                // 선이 dashoffset 100이라 켜도 아직 안 보입니다
      .fromTo(els.markLines, { strokeDashoffset: 100 },
        { strokeDashoffset: 0, duration: 0.7, ease: 'power1.inOut', stagger: 0.022 }, TM)   // 14획, 마지막이 1.0에 끝남
      .to(els.markReveal, { attr: { width: MARK_W }, duration: 0.8, ease: 'power2.inOut' }, TM + 1.0)
      // 채움이 다 덮으면 선을 걷습니다 — 남겨 두면 가장자리에 0.6 두께가 더해져 글자가 굵어집니다
      .to(els.markLineG, { opacity: 0, duration: 0.3, ease: 'none' }, TM + 1.6)
      .fromTo(els.markShine, { attr: { x: -200 } },
        { attr: { x: MARK_W + 200 }, duration: 0.7, ease: 'power1.inOut' }, TM + 1.8);

    // 로고가 다 그려진 뒤에 마무리 — RESTART 전환(noRestart면 컨트롤 제거) · onComplete 훅
    tl.add(() => finishState(), TM + 2.5);
    return tl;
  }

  function finishState() {
    armed = false;
    /* 홈의 인트로는 처음 한 번만 보여 주는 오프닝이라 RESTART가 없습니다(noRestart) —
       상태를 떼면 data-ctl이 사라져 디스크 · 고정 버튼이 함께 숨고 커서도 돌아옵니다. */
    if (hooks.noRestart) { ctlState = null; delete els.body.dataset.ctl; }
    else setCtl('restart');
    els.body.classList.remove('is-intro', 'is-armed');
    render();
    hooks.onComplete && hooks.onComplete();
  }

  /* ── 공개 API ───────────────────────────────────────────── */
  function init(options) {
    hooks = options || {};
    reduce = !!hooks.reduce;
    wiggle.amp = reduce ? 0 : 1;
    WHITE = token('--static-white', WHITE);
    STRONG = token('--primary-strong', STRONG);
    SATS.forEach(s => { s.color = token(s.token, s.color); });
    query();
    build();
    setActive(true);                                   // render + breathe 둘 다
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    // 디스크가 커서 위에 있으므로 히어로 전체가 그 버튼입니다. 단 RESTART는 포인터에
    // 디스크가 실제로 붙어 있을 때만 — 터치에서는 #hero-top이 display:none이라
    // 장면 9의 아무 탭이나 8초를 되감아 버립니다.
    els.stage.addEventListener('click', () => {
      if (!armed && !els.body.classList.contains('is-intro') && !ptr.has) return;
      activate();
    });
    els.stage.addEventListener('pointerdown', pressOn);
    window.addEventListener('pointerup', pressOff);
    window.addEventListener('pointercancel', pressOff);
    els.ctl.addEventListener('click', (e) => { e.stopPropagation(); activate(); });
    let resizeT;
    window.addEventListener('resize', () => {
      if (!rect) return;
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        measure();
        layout();
        if (armed) { placeSats(midArm()); slimeSize.base = R_SLIME * k; buildTimeline(); }
      }, 120);
    });

    /* measure()는 파싱 시점에 돌아 hdrVB를 Pretendard가 적용되기 **전**의 헤더에서 읽습니다.
       arm()은 스테이지 박스가 바뀔 때만 다시 재는데, 폰트 교체는 고정 전체 화면 스테이지를
       움직이지 않습니다 — 여기서 다시 재지 않으면 콜드 로드에서 위 블롭이 엉뚱한 y에 섭니다. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!rect) return;
        measure();                                     // 실제로 바뀌는 건 hdrVB뿐, 스테이지 박스는 그대로
        layout();
        if (armed) placeSats(midArm());                // 인트로 중에는 타임라인이 블롭의 주인
      });
    }
    return api;
  }

  const midArm = () => !!(armTl && armTl.isActive());

  /* 대기 화면: 블롭과 슬라임이 튀어나오고 포인터가 넘겨받습니다 */
  function arm() {
    const r0 = visibleRect();
    if (!rect || Math.abs(r0.w - rect.w) > 1 || Math.abs(r0.h - rect.h) > 1) build();
    armed = true;
    els.body.classList.add('is-armed');
    els.body.classList.remove('is-intro');
    ctlState = null; setCtl('start');
    hooks.onToDark && hooks.onToDark();
    hooks.onArm && hooks.onArm();                       // init() hooks — 대기 화면에 들어갔음을 알립니다(홈은 쓰지 않음)
    if (reduce) return;
    if (armTl) armTl.kill();
    armTl = gsap.timeline();
    SATS.forEach((s, idx) => {
      sats[idx].r = 0;
      armTl.to(sats[idx], { r: R, duration: 0.55, ease: 'back.out(1.6)' }, 0.1 + idx * 0.08);
    });
    slime.r = 0; slimeSize.base = 0;
    clearPop();
    if (ptr.has || !finePointer()) popSlime();          // 포인터를 알거나 커서가 아예 없으면(터치)
    else slimePopT = setTimeout(popSlime, 1500);        // 커서는 있는데 안 움직임 → 가운데 폴백
    showDisc();
  }

  /* 디스크에도 슬라임과 같은 폴백을 둡니다. 디스크의 가시성이 onPointerMove의 첫 진입
     한 줄에만 매달려 있으면(CSS 기본이 opacity 0) arm 이후 마우스를 한 번도 움직이지
     않을 때 START가 화면에 아예 존재하지 않습니다 — 마우스를 두고 기다리는 흔한 경우가
     여기 걸립니다. 슬라임의 1.5초 중앙 폴백과 짝을 이룹니다.
     아는 좌표가 있으면 거기에, 없으면 스테이지 가운데에 놓고 띄웁니다. */
  function showDisc() {
    if (reduce || !finePointer() || ptr.has) return;
    const v = lastClient ? clientToVB(lastClient.x, lastClient.y)
                         : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    ptr.v = v;
    placeDisc(v);
    gsap.set(els.playCursor, { opacity: 1 });
    /* 좌표를 실제로 아는 경우(arm 전에 움직였다)에만 OS 커서를 숨깁니다 — 디스크가
       커서 위에 정확히 놓였으니까요. 가운데 폴백일 때는 커서가 어디 있는지 모르므로
       보통 커서를 남겨 둡니다. */
    if (lastClient) els.body.classList.add('ptr-on');
    // ptr.has는 세우지 않습니다 — 아직 「커서가 저기 있다」고 확신할 수 없고,
    // 그래야 첫 pointermove가 정상 경로(슬라임 팝·스포트라이트)를 밟습니다.
  }

  function play() {
    if (!armed) return;
    armed = false;
    if (armTl) { armTl.kill(); armTl = null; }        // 등장 트윈만. 인트로 타임라인은 따로 있습니다
    clearPop();
    setCtl('skip');                                   // 디스크는 사라지지 않고 역할만 바꿉니다
    sats.forEach((b, i) => {                            // 커서 끌림을 버립니다. 이제 x/y는 인트로의 것
      if (!b.home) return;
      Object.assign(b, { f: 0, ampK: 1, spdK: 1, x: b.home.x, y: b.home.y, r: R });
      gsap.set(els.logos[i], { x: b.home.x, y: b.home.y, scale: lgK() });
    });
    if (slimeX && slimeX.tween) slimeX.tween.kill();   // 포인터 추적 트윈을 멈춰 타임라인이 x/y를 갖게 합니다
    if (slimeY && slimeY.tween) slimeY.tween.kill();
    els.body.classList.remove('is-armed');
    els.body.classList.add('is-intro');
    tl.invalidate();                                  // 이 시작 위치로 coverR()을 다시 계산합니다
    tl.timeScale(hooks.speed || 1).play(0);          // 배속은 init() hooks의 speed(홈은 1.6), 없으면 1
  }

  /* 클릭 없이 자동 재생. START 대기 화면(arm)을 그대로 거치되 커서를 기다리지 않습니다 —
     블롭이 튀어나오고 가운데에 슬라임이 생기는 짧은 등장만 보여 준 뒤 같은 play() 경로로
     들어가, 타임라인을 speed배로 돌립니다. (홈은 현재 arm() 뒤 START 클릭을 기다리므로
     이 경로를 쓰지 않습니다.) */
  function autoplay(speed, delay) {
    arm();
    if (reduce) { finish(); return; }
    clearPop();
    popSlime();                                       // 포인터와 무관하게 지금 가운데에서
    setTimeout(() => { play(); tl.timeScale(speed || 1); }, (delay == null ? 0.9 : delay) * 1000);
  }

  function fastForward() {
    if (!tl || !els.body.classList.contains('is-intro') || tl.progress() === 1) return;
    gsap.to(tl, { timeScale: 5, duration: 0.3, ease: 'power1.in', overwrite: true });
  }

  function finish() { armed = false; tl.progress(1); }

  function replay() {
    tl.pause(0);
    /* #stage의 visibility·opacity는 여기서 직접 쓰지 않습니다 — home.js가 body 클래스
       (intro-on · intro-leaving)로 관리하고 css/home.css가 그립니다. 홈은 noRestart라
       이 함수를 부르지 않습니다. */
    setActive(true);
    build();
    arm();
  }

  const api = {
    init, arm, play, autoplay, finish, fastForward, replay, render, setActive, setDiscScale, discPx,
    get ctlState() { return ctlState; },
    get timeline() { return tl; }, get k() { return k; }, get rect() { return rect; }, get armed() { return armed; }, blobs,
  };
  return api;
})();
