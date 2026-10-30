/* ─────────────────────────────────────────────────────────────
   hero.js — Figma hero_section_motion
   armed  : Start screen. A living slime follows the pointer and is a
            mask that reveals the interior photo through the stone veil.
            Idle → it grows, moving → it shrinks. Start → play().
   1-2    : the slime swells to the whole screen, the veil lifts
   3-6    : four blobs dock onto the glass panel (squash + glow)
   7-8    : light bursts out of the panel and absorbs the blobs
   9      : light fills the screen, bg_light glow + stroke wordmark
   Architecture: GSAP tweens plain state objects; render() on gsap.ticker
   writes wiggly <path d> + transform every frame. viewBox = 1920×960.
   ───────────────────────────────────────────────────────────── */
window.STP = window.STP || {};

STP.hero = (function () {
  const VB = { w: 1920, h: 960 };
  const C = { x: 960, y: 480 };
  // hMobile: the Figma mobile card is a taller box (234×257 on a 375 frame → 464×510 in panel units)
  const PANEL = { w: 464, h: 342, hMobile: 510 };
  const R_BASE = 80;
  const R_SLIME = 208;                 // the slime's one size — it only breathes around this
  const R_FULL = 1150;                 // covers the 1920×960 diagonal (≈1073)
  const R_BURST_END = 1000;            // scene 9: light stops short so the corners keep the blurred photo

  /* colors come from css/tokens.css so the palette has a single source of truth */
  const token = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  let WHITE = '#FFFFFF';
  let STRONG = '#4F4D4C';              // logo colour on the Start screen; turns WHITE when the blob docks

  // order = DOM order of .b-sat / .lg : 0 soma(top) 1 playfacto(right) 2 myON(bottom) 3 reading ocean(left)
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
  let pRect = null;                                   // the card's screen box, for the rim spotlight
  const SPOT_FADE = 320;                              // px over which that spotlight fades out
  /* 장면 9 로고의 데스크톱 기본 치수 (24차 · 피그마 17683:3280 — 432x160, 1920 중앙 정렬 x 744,
     윗변 y 408). index.html의 중첩 <svg class="mark-art"> 속성과 같아야 합니다. */
  const MARK_W = 432, MARK_H = 160, MARK_X = 744, MARK_Y = 408;
  /* 모바일 로고 폭(뷰포트 대비). 옛 가로로 긴 워드마크는 93.3%였는데(18차 피그마), 새 로고는
     세로로 두툼해 같은 비율이면 390에서 364x135로 너무 큽니다. 모바일 사양이 아직 없어
     정한 값입니다(24차 가정) — 이 한 줄만 바꾸면 됩니다. */
  const MARK_MOBILE_VW = 0.62;

  const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let N = 28, HARM = 3;
  const blobs = [];
  let sats = [], burst, slime;
  const wiggle = { amp: 1 };

  /* ── geometry ───────────────────────────────────────────── */
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
    sPx = rect.vw / rect.w;                             // px per viewBox unit
    hdrVB = (els && els.header ? els.header.getBoundingClientRect().height : 76) / sPx;
    mobile = rect.w < 800;
    // the mobile card CSS keys off this class, not a media query — a viewport-px breakpoint
    // would disagree with `mobile`, which is measured in viewBox units
    if (els && els.body) els.body.classList.toggle('hero-narrow', mobile);
    k = gsap.utils.clamp(0.5, 1, rect.w / 1100);
    R = R_BASE * k;
    N = mobile ? 20 : 28;
    HARM = mobile ? 2 : 3;
    // Figma mobile: card = 62 % of the viewport width, blob diameter = 28 %
    const pw = mobile ? rect.w * 0.62 : Math.min(PANEL.w, rect.w * 0.86);
    if (mobile) R = rect.w * 0.14;
    panelH = mobile ? PANEL.hMobile : PANEL.h;
    P = { w: pw, h: pw * panelH / PANEL.w, k: pw / PANEL.w };
    P.x = C.x - P.w / 2; P.y = C.y - P.h / 2;
  }

  /* place HTML layers on the SVG coordinate system; the panel is centered on its current (tweened) height */
  function layout() {
    const s = rect.vw / rect.w;                         // px per viewBox unit
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
    // 18차: 컨트롤은 CSS가 우하단(right 16 · bottom 32)에 고정합니다 — 피그마 장면 9
    // 모바일의 playbutton 자리. 예전 카드 아래 배치용 인라인 좌표는 남아 있으면 이깁니다.
    if (els.ctl) { els.ctl.style.left = ''; els.ctl.style.top = ''; }

    /* 장면 9 로고(18차 → 24차). 1920x960 viewBox가 `slice`라 좁은 화면에서는 높이 기준으로
       확대되어 좌우가 잘려 나갑니다. 좁을 때만 치수를 다시 씁니다.
       **transform이 아니라 속성**입니다 — scroll.js가 #hero-mark의 y/opacity를 GSAP으로
       잡고 있어 transform을 얹으면 17차의 잔여 이동값 함정을 그대로 밟습니다. 24차에 <use>가
       중첩 <svg>로 바뀌었지만 둘 다 x·y·width·height 속성을 받아 이 코드는 그대로입니다. */
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
    pRect = null;                                       // the spotlight re-reads it on the next move
  }

  function clientToVB(cx, cy) {
    const b = els.stage.getBoundingClientRect();
    return { x: rect.x + (cx - b.left) * rect.w / b.width, y: rect.y + (cy - b.top) * rect.h / b.height };
  }

  const inset = () => (mobile ? 0.08 : 0.28);   // how far the side blobs hang off the visible edge

  /* radius that covers the visible area from wherever the slime currently sits. R_FULL is a
     centre-only figure; starting from a corner needs the full diagonal. The 1.15 margin is
     because power2.in is only at 89.7 % of the radius when the veil lifts at t = 1.05. */
  function coverR() {
    const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
    const d = Math.max(Math.hypot(slime.x - x0, slime.y - y0), Math.hypot(slime.x - x1, slime.y - y0),
                       Math.hypot(slime.x - x0, slime.y - y1), Math.hypot(slime.x - x1, slime.y - y1));
    return Math.max(R_FULL, d * 1.15);
  }
  // play disc diameter in viewBox units — Figma 17811:4078 draws it at 96 of a 160 blob,
  // clamped in screen px so it stays legible in very small or very large windows
  const discVB = () => gsap.utils.clamp(52, 120, 96 * k * sPx) / sPx;
  const hideCuts = () => { els.pbCuts.forEach(g => { g.style.display = 'none'; }); els.pbHoles.forEach(g => { g.style.display = 'none'; }); };
  // logos ride the blob, not the global scale: on mobile R is set from the viewport width,
  // so scaling them by k would leave the marks too small inside their circles.
  const lgK = () => R / R_BASE;

  function startPos(side) {
    switch (side) {
      // desktop: the top blob rides 40 css px up so it just laps over the frosted GNB.
      // mobile keeps Figma 17811:4081, which deliberately clears the bar.
      // topFlush(홈): GNB가 없는 인트로라 아래 블롭과 거울처럼 — 화면 위 끝에 살짝 걸쳐 붙습니다.
      case 'top':    if (hooks.topFlush) return { x: C.x, y: mobile ? rect.y + rect.h * (1 - 0.817) : rect.y + R * 0.69 };
                     return { x: C.x, y: mobile ? rect.y + rect.h * 0.224 : rect.y + hdrVB + R * 1.2 - 40 / sPx };
      case 'bottom': return { x: C.x, y: mobile ? rect.y + rect.h * 0.817 : rect.y + rect.h - R * 0.69 };
      case 'left':   return { x: rect.x + R * inset(), y: C.y };
      default:       return { x: rect.x + rect.w - R * inset(), y: C.y };
    }
  }
  function dockPos(side) {
    const ov = 24 * k;                                  // how far the blob presses into the glass
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
      playCursor: q('#play-btn'),      // the disc that rides the pointer (SVG, in #hero-top)
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
      s9Glow: q('#s9-glow'),          // 장면 9 색 덩어리 (Figma circle_animation)
      mark: q('#hero-mark'),
      // 24차 · 장면 9 로고의 세 겹과 카드 로고 채움
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

  /* ── blob state & path generation ───────────────────────── */
  function makeBlob(vis, twin, seed, kind) {
    const rnd = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return {
      x: C.x, y: C.y, r: 0, rot: 0, sx: 1, sy: 1, m: 1, tt: 0,
      om: [0.9 + rnd(1) * 0.5, -(1.1 + rnd(2) * 0.5), 0.6 + rnd(3) * 0.4, 0.45 + rnd(7) * 0.3],
      ph: [rnd(4) * 6.283, rnd(5) * 6.283, rnd(6) * 6.283, rnd(8) * 6.283],
      vis, twin, hidden: true, lastD: '', lastT: '', kind: kind || 'sat', freeze: false, frozen: false,
    };
  }

  /* polar radius of the panel rectangle (used to morph the light out of the glass) */
  function rectR(th) {
    const hw = P.w / 2, hh = P.h / 2;
    const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    return Math.min(c > 1e-4 ? hw / c : 1e9, s > 1e-4 ? hh / s : 1e9);
  }

  /* closed wiggly path centered at (0,0): Catmull-Rom → cubic Bézier */
  function blobPath(b, t, ampScale, ox, oy) {
    const A = ampScale === undefined ? 1 : ampScale;
    ox = ox || 0; oy = oy || 0;
    const n = b.kind === 'burst' ? 48 : N;
    let px = new Array(n), py = new Array(n);
    if (b.kind === 'burst') {
      // flame-like lobes near the panel (22%), smoother as it expands (7%)
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
      // satellites 4 % · slime 7 % (a livelier creature), capped for large radii.
      // b.ampK / b.spdK rise while the cursor is close, so a nudged blob gets visibly restless.
      const rel = b.kind === 'slime' ? 0.07 : 0.04 * (b.ampK || 1);
      const tt = b.tt;                                // accumulated in render(), never t * spdK
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
      if (b.clips) for (const c of b.clips) c.setAttribute('d', d);   // #hero-top clip + knockout mask
      b.lastD = d;
    }
    if (tr !== b.lastT) {
      b.vis.setAttribute('transform', tr);
      if (b.twin) b.twin.setAttribute('transform', tr);
      if (b.clips) for (const c of b.clips) c.setAttribute('transform', tr);
      b.lastT = tr;
    }
  }

  /* Wiggle phase is ACCUMULATED per blob, never `t * spdK`. Multiplying the absolute ticker clock
     by a factor that attract() rewrites every frame injects a phase jump proportional to t — the
     longer the tab has been open, the bigger the lurch the first time the cursor nears a blob, and
     a cold load (where attract's dt sits at its 0.1s clamp) makes the jump ~5x worse again.
     Accumulating means spdK changes the rate from here on and nothing else.
     The dt clamp also keeps a janky 400ms frame from stepping the shape in one go. */
  function render(time, dtMs) {
    const t = time === undefined ? gsap.ticker.time : time;
    const dt = Math.min(0.05, (dtMs || 0) / 1000);
    for (const b of blobs) {
      b.tt += dt * (b.spdK || 1);
      if (b.frozen) continue;
      if (b.r < 0.5) { if (!b.hidden) { write(b, '', ''); b.hidden = true; } continue; }
      b.hidden = false;
      const tr = `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot.toFixed(1)}) scale(${b.sx.toFixed(3)} ${b.sy.toFixed(3)})`;
      if (b.freeze) {                                   // last write without wiggle, then stop touching it
        write(b, blobPath(b, t, 0), tr);
        b.frozen = true;
        continue;
      }
      if (b.kind === 'slime') {
        // A userSpaceOnUse pattern follows the element's own transform, so the slime keeps
        // transform="" and bakes its position into the path — the photo stays pinned to #hero-photo.
        if (b.r >= R_FULL) {                            // this big, drop the wiggle: a plain circle
          const y = b.y.toFixed(1);                     // written every frame — it may still be growing
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

  /* 20차: #photo-blur는 σ가 16으로 오르는 마지막 0.8초(T9)에만 실제로 무언가를 합니다.
     그 전 — 대기 화면과 인트로의 거의 전부 — 동안 σ는 0.5로, 390 폭에서 0.44 CSS px입니다.
     화면에는 한 픽셀도 차이가 없는데(대조 결과 0/1,316,640), 1758x914 CSS px = dpr 3에서
     1450만 픽셀짜리 전면 필터 패스를 매 프레임 물게 합니다. 자동재생을 걷어낸 뒤로는
     사람들이 그 대기 화면에 머무는 시간이 길어졌으니 더 아깝습니다. σ가 의미를 가질 때만
     붙입니다. */
  function syncPhotoFilter() {
    if (!els.photo || !els.photoBlur) return;
    const want = parseFloat(els.photoBlur.getAttribute('stdDeviation')) > 1;
    if (want === els.photo.hasAttribute('filter')) return;
    if (want) els.photo.setAttribute('filter', 'url(#photo-blur)');
    else els.photo.removeAttribute('filter');
  }

  /* 20차: breathe도 여기서 함께 거둡니다. 예전에는 arm()에서 한 번 붙이고 제거하는
     코드가 어디에도 없어, 인트로가 끝나고 장면 13까지 내려가도 틱커에 남아 있었습니다.
     !armed면 즉시 리턴하니 비용은 작지만 페이지가 유휴 상태에 못 들어가는 원인 중 하나입니다. */
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
     x 6 / width 84입니다(17937:4996 · 17937:5005). 15차에 "원래 잉크 기준이었다"고 본 것은
     우연의 일치였습니다: 옛 START의 -36은 박스 기준에 라벨 48을 가정한 값입니다. */
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

  /* ── pointer → slime (armed state only) ───────────────────── */
  const ptr = { has: false };
  let lastClient = null;               // 22차: ctlState 이전에 본 마지막 포인터 좌표
  const slimeSize = { base: 0 };       // popSlime() takes this 0 → R_SLIME*k; breathe() renders slime.r from it
  let slimeX, slimeY, slimePop = null, slimePopT = 0, slimePopped = false;

  /* The slime appears where the cursor is, so the entrance waits for the first pointer move.
     If the mouse never moves we fall back to the centre after 1.5 s. */
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
    /* 22차: 좌표는 **ctlState 이전에도** 기억합니다. 21차에 arm이 「로드 직후」에서
       「히어로에 닿았을 때」로 옮겨가면서, 장면 13에서 움직인 마우스가 전부 여기서
       버려졌습니다 — 그래서 히어로에 도착했을 때 디스크가 원점에 opacity 0으로 남아
       START가 화면 어디에도 없었습니다. */
    lastClient = { x: e.clientX, y: e.clientY };
    if (!ctlState) return;                                  // 디스크는 세 상태 모두 커서를 따라갑니다
    const v = clientToVB(e.clientX, e.clientY);
    ptr.v = v;
    if (!ptr.has) {
      ptr.has = true;
      els.body.classList.add('ptr-on');                     // 커서 위치를 아는 동안만 OS 커서를 숨깁니다
      if (armed && !slimePopped) { slime.x = v.x; slime.y = v.y; }   // still hidden: appear right under the cursor
      gsap.set(els.playCursor, { opacity: 1 });             // otherwise quickTo eases it over, no jump
      popSlime();
    }
    // the base and the four clipped copies share one transform; the clip itself stays in
    // viewBox space (on the untransformed .pb-cut parent) so it lines up with the blobs
    placeDisc(v);
    if (!armed) return;                                     // 슬라임과 카드 스포트라이트는 대기 상태에만 있습니다
    slimeX(v.x); slimeY(v.y);
    spotlight(e.clientX, e.clientY);
  }
  /* ── cursor spotlight on the card rim ────────────────────
     Writes two custom properties on .panel; the ring lives in css/hero.css (.panel::before).
     pRect caches the card's box — this runs on every pointermove, and layout() clears it. */
  function spotlight(cx, cy) {
    if (!pRect) pRect = els.panel.getBoundingClientRect();
    const r = pRect;
    els.panel.style.setProperty('--spot-x', (cx - r.left).toFixed(1) + 'px');
    els.panel.style.setProperty('--spot-y', (cy - r.top).toFixed(1) + 'px');
    // distance to the card rectangle: 0 anywhere on the card, then fading out over SPOT_FADE
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
    ptr.has = false;                                    // re-entry goes through the "first move" branch again
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

  /* one size, always breathing — the slime never grows or shrinks with the pointer */
  function breathe(time, dtMs) {
    if (!armed || reduce) return;
    slime.r = slimeSize.base * (1 + 0.05 * Math.sin(time * 1.8));   // a creature always breathes
    attract(Math.min(0.1, dtMs / 1000));
  }

  /* Cursor gravity (fine pointer only): a satellite the cursor approaches swells to 1.2×,
     drifts toward the big slime and wiggles harder. Everything eases back on its own. */
  const PULL_RANGE = 420, PULL_MAX = 0.28, GROW_MAX = 0.20;   // GROW_MAX 0.20 = the 1.2× cap
  function attract(dt) {
    if (armTl && armTl.isActive()) return;              // let the entrance pop finish first
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
      if (b.f === 0 && was === 0) continue;             // resting: nothing to write
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
     16차: attract() 안(대기 상태 전용)에 있던 판정을 빼내 render()에서 부릅니다 — 그래야
     SKIP 상태(인트로 재생 중)에도 반전이 살아 있습니다. 클립 지오메트리는 write()가 이미
     매 프레임 vis·twin과 함께 미러링하므로 따로 할 일이 없고, 블롭 좌표는 인트로 중에는
     타임라인이 쓰므로 그대로 따라갑니다. 폭발(T8)에서 r → 0이 되면 저절로 꺼집니다. */
  function syncCuts() {
    if (!sats.length || !els.pbCuts) return;
    const v = (ctlState && ptr.has) ? ptr.v : null;
    const dr = discVB() / 2;                            // play disc radius, for the overlap test
    for (let i = 0; i < sats.length; i++) {
      const b = sats[i], cut = els.pbCuts[i], hole = els.pbHoles[i];
      if (!cut) continue;
      // '' would drop the inline value and fall back to the `.pb-cut { display: none }` rule
      const want = (v && b.r > 0.5 && Math.hypot(v.x - b.x, v.y - b.y) < b.r + dr) ? 'inline' : 'none';
      if (cut.style.display !== want) { cut.style.display = want; hole.style.display = want; }
      // 장면 8에서 블롭이 흰색으로 바랬다가 사라집니다 — 사본이 브랜드 색으로 남으면 어긋납니다
      if (want === 'inline' && els.pbCutFills[i]) {
        const f = b.vis.getAttribute('fill');
        if (f && els.pbCutFills[i].style.fill !== f) els.pbCutFills[i].style.fill = f;
      }
    }
  }

  /* ── reset to the armed look (scene 1) ─────────────────── */
  function reset() {
    measure();
    layout();
    if (!blobs.length) {
      sats = SATS.map((s, i) => {
        const b = makeBlob(document.querySelector(`.b-sat[data-i="${s.i}"]`), document.querySelector(`.c-sat[data-i="${s.i}"]`), 10 + i, 'sat');
        // attached now, so write()'s diff cache matches from the first frame.
        // 20차: 이 클립·마스크는 커서 디스크(#hero-top)가 위성 위를 지날 때 잉크를 뒤집는
        // 용도뿐인데, 터치에서는 #hero-top이 display:none입니다(hero.css의 (pointer:coarse)).
        // 그런데도 write()가 프레임마다 위성 4개 × 2요소 × 2속성 = 16회를 그리지도 않는
        // 노드에 쓰고 있었고, 그 쓰기가 전부 #goo 필터 서브트리를 더럽혀 전면 가우시안을
        // 다시 돌게 만들었습니다. 커서가 있을 때만 붙입니다.
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
    // play() kills these tweens, and a killed quickTo setter is dead for good —
    // so they are re-created on every reset(), not once (replay used to lose pointer-follow).
    slimeX = gsap.quickTo(slime, 'x', { duration: 0.45, ease: 'power3' });
    slimeY = gsap.quickTo(slime, 'y', { duration: 0.45, ease: 'power3' });
    if (armTl) { armTl.kill(); armTl = null; }
    if (tl) tl.kill();

    gsap.set(els.photoBlur, { attr: { stdDeviation: 0.5 } });
    gsap.set(els.veilSolid, { opacity: 1 });
    gsap.set(els.blur, { attr: { stdDeviation: 9 * k } });        // armed: strong goo so the slime melts into the blobs
    gsap.set(els.glowBlur, { attr: { stdDeviation: 28 } });
    gsap.set(els.burstEl, { opacity: 0 });
    gsap.set(els.burstGlow, { opacity: 0 });
    gsap.set([els.bgLight, els.mark, els.s9Glow], { opacity: 0, y: 0 });
    // 24차: 장면 9 로고 — 선 안 그려짐 · 채움 0 · 빛 왼쪽 밖 / 카드 로고 채움 0단계.
    // replay()가 build() → reset()으로 여기를 지나 처음 상태로 돌아옵니다.
    gsap.set(els.markLines, { strokeDashoffset: 100 });
    gsap.set(els.markLineG, { opacity: 1 });
    gsap.set(els.markReveal, { attr: { width: 0 } });
    gsap.set(els.markShine, { attr: { x: -200 } });
    gsap.set(els.cardFill, { attr: { 'fill-opacity': 0 } });
    gsap.set(els.panel, { opacity: 1, scale: 1, transformOrigin: '50% 50%',
      '--ring': 'rgba(221,221,221,0.2)', backgroundColor: 'rgba(255,255,255,0.01)' });   // 테두리는 팔각 링(--ring)
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
    spotOff();                                          // a replay must not keep the old rim lit
    placeSats();
    render();
  }

  /* park the four blobs (and their logos) on the current visible edges.
     keepR leaves the radius alone — armTl may still be tweening the entrance pop. */
  function placeSats(keepR) {
    SATS.forEach((s, idx) => {
      const p = startPos(s.side);
      const r = keepR ? sats[idx].r : R;
      Object.assign(sats[idx], { x: p.x, y: p.y, r, rot: 0, sx: 1, sy: 1, lastD: '', lastT: '', home: p, f: 0, ampK: 1, spdK: 1 });
      sats[idx].vis.setAttribute('fill', s.color);
      sats[idx].twin.setAttribute('fill', s.color);
      els.pbCutFills[idx].style.fill = s.color;      // inline: a presentation attribute would lose to .pb-body circle
      gsap.set(els.logos[idx], { x: p.x, y: p.y, opacity: 1, scale: lgK(), color: STRONG, transformOrigin: '50% 50%' });
    });
  }

  /* ── intro timeline (runs from Start) ───────────────────── */
  function build() {
    reset();
    buildTimeline();
  }

  /* the intro timeline bakes dockPos()/R in, so it has to be re-made whenever geometry changes */
  function buildTimeline() {
    if (tl) tl.kill();
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

    /* scene 1 → 2 : the slime swells over the whole screen and the veil lifts */
    tl.add(() => hooks.onToDark && hooks.onToDark(), 0)
      .to(els.blur, { attr: { stdDeviation: 3 * k }, duration: 0.8, ease: 'power1.inOut' }, 0.3)
      .to(slime, { r: () => coverR(), duration: 0.95, ease: 'power2.in' }, 0.15)
      .set(els.veilSolid, { opacity: 0.07 }, 1.05)
      .set(slime, { r: 0 }, 1.12);

    /* scenes 3 → 6 : blobs dock onto the panel, one edge at a time */
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
          '--ring': `rgba(255,255,255,${(0.2 + 0.14 * (n + 1)).toFixed(2)})`,
          backgroundColor: `rgba(255,255,255,${(0.01 + 0.035 * (n + 1)).toFixed(3)})`,
          duration: 0.5, ease: 'power1.out',
        }, t + 0.62)
        /* 24차 · 카드 로고가 부딪힐 때마다 한 단계씩 차오릅니다(피그마 18019:6577, 0 → 0.4).
           바로 위 테두리·배경과 같은 시점·같은 `n + 1` 규칙 — 카드 전체가 한 박자로 밝아집니다.
           4단계(3.92s) 직후 4.1s에 카드가 빛으로 바뀌지만 power3.in이라 약 0.4초는 보입니다. */
        .to(els.cardFill, { attr: { 'fill-opacity': (0.1 * (n + 1)).toFixed(2) }, duration: 0.5, ease: 'power1.out' }, t + 0.62);
    });

    /* scene 7 : the panel gives way to light */
    const T7 = 4.1;
    tl.to(els.panelContent, { scale: 0.25, opacity: 0, duration: 0.6, ease: 'power3.in', transformOrigin: '50% 50%' }, T7)
      .to(els.panel, { scale: 0.25, opacity: 0, duration: 0.85, ease: 'power3.in' }, T7 + 0.1)
      .set(burst, { r: Math.max(P.w, P.h) / 2, m: 0 }, T7 + 0.05)
      .to(els.burstEl, { opacity: 1, duration: 0.35, ease: 'power1.out' }, T7 + 0.05)
      .to(els.burstGlow, { opacity: 0.72, duration: 0.5, ease: 'power1.out' }, T7 + 0.1)
      .to(burst, { m: 1, duration: 0.7, ease: 'power2.inOut' }, T7 + 0.1)
      .to(burst, { r: 310 * P.k, duration: 0.85, ease: 'power2.out' }, T7 + 0.1)
      .to(els.blur, { attr: { stdDeviation: 14 * k }, duration: 0.5, ease: 'power1.inOut' }, T7 + 0.3);

    /* scene 8 : the light grows, the blobs are pulled in and absorbed */
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

    /* scene 9 : light nearly fills the screen (corners keep the blurred photo), glow + stroke wordmark */
    const T9 = T8 + 1.15;
    tl.to(burst, { r: R_BURST_END * P.k, duration: 1.05, ease: 'power2.in' }, T9)
      .to(els.glowBlur, { attr: { stdDeviation: 70 }, duration: 0.8, ease: 'none' }, T9)
      .to(els.photoBlur, { attr: { stdDeviation: 16 }, duration: 0.8, ease: 'power1.in' }, T9)
      .to(els.blur, { attr: { stdDeviation: 0 }, duration: 0.4 }, T9 + 0.6)
      .to([els.bgLight, els.s9Glow], { opacity: 1, duration: 0.8, ease: 'power1.out' }, T9 + 0.7)
      .add(() => hooks.onToLight && hooks.onToLight(), T9 + 0.85)
      .add(() => { burst.freeze = true; }, T9 + 1.15);

    /* 24차 · 장면 9 로고 (피그마 18009:5379) — 옛 워드마크가 페이드로 나타나던 자리(T9+1.0)에서
       시작해 약 2.5초. 외곽선 1.0 → 채움 0.8 → 빛 0.7. 전부 **그룹 안쪽**에 겁니다(그룹
       opacity·y는 scroll.js 핸드오프의 몫). 끝값이 곧 최종 화면이라 ?intro=0의 progress(1)
       점프도 같은 그림에 떨어집니다 — 콜백에서 CSS 애니메이션을 켜지 않는 이유입니다. */
    const TM = T9 + 1.0;
    tl.set(els.mark, { opacity: 1 }, TM)                // 선이 dashoffset 100이라 켜도 아직 안 보입니다
      .fromTo(els.markLines, { strokeDashoffset: 100 },
        { strokeDashoffset: 0, duration: 0.7, ease: 'power1.inOut', stagger: 0.022 }, TM)   // 14획, 마지막이 1.0에 끝남
      .to(els.markReveal, { attr: { width: MARK_W }, duration: 0.8, ease: 'power2.inOut' }, TM + 1.0)
      // 채움이 다 덮으면 선을 걷습니다 — 남겨 두면 가장자리에 0.6 두께가 더해져 글자가 굵어집니다
      .to(els.markLineG, { opacity: 0, duration: 0.3, ease: 'none' }, TM + 1.6)
      .fromTo(els.markShine, { attr: { x: -200 } },
        { attr: { x: MARK_W + 200 }, duration: 0.7, ease: 'power1.inOut' }, TM + 1.8);

    // 로고가 다 그려진 뒤에 RESTART 전환 · 스크롤 핸드오프 재개 · Scroll Down 큐 (예전 T9+1.75)
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

  /* ── public API ─────────────────────────────────────────── */
  function init(options) {
    hooks = options || {};
    reduce = !!hooks.reduce;
    wiggle.amp = reduce ? 0 : 1;
    WHITE = token('--static-white', WHITE);
    STRONG = token('--primary-strong', STRONG);
    SATS.forEach(s => { s.color = token(s.token, s.color); });
    query();
    build();
    setActive(true);                                   // render + breathe 둘 다 (20차)
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

    /* measure() runs at parse time, so hdrVB is read off the header BEFORE Pretendard swaps in.
       arm() only re-measures when the stage box changes, and a font swap never moves a fixed
       full-viewport stage — so on a cold load the top blob stayed parked at the wrong y. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!rect) return;
        measure();                                     // only hdrVB actually moves; the stage box is unchanged
        layout();
        if (armed) placeSats(midArm());                // mid-intro the timeline owns the blobs
      });
    }
    return api;
  }

  const midArm = () => !!(armTl && armTl.isActive());

  /* Start screen: blobs & slime pop in, the pointer takes over */
  function arm() {
    const r0 = visibleRect();
    if (!rect || Math.abs(r0.w - rect.w) > 1 || Math.abs(r0.h - rect.h) > 1) build();
    armed = true;
    els.body.classList.add('is-armed');
    els.body.classList.remove('is-intro');
    ctlState = null; setCtl('start');
    hooks.onToDark && hooks.onToDark();
    hooks.onArm && hooks.onArm();                       // → scroll.js suspends the scene 9→10 handoff
    if (reduce) return;
    if (armTl) armTl.kill();
    armTl = gsap.timeline();
    SATS.forEach((s, idx) => {
      sats[idx].r = 0;
      armTl.to(sats[idx], { r: R, duration: 0.55, ease: 'back.out(1.6)' }, 0.1 + idx * 0.08);
    });
    slime.r = 0; slimeSize.base = 0;
    clearPop();
    if (ptr.has || !finePointer()) popSlime();          // pointer known, or no cursor at all (touch)
    else slimePopT = setTimeout(popSlime, 1500);        // cursor exists but hasn't moved → centre fallback
    showDisc();
  }

  /* 22차: 디스크에도 슬라임과 같은 폴백. 여태 디스크의 가시성은 오직 onPointerMove의
     첫 진입 한 줄에 매달려 있었고(CSS 기본이 opacity 0), arm 이후에 마우스를 한 번도
     움직이지 않으면 START가 화면에 아예 존재하지 않았습니다 — 휠로만 히어로에 내려온
     아주 흔한 경우가 여기 걸립니다. 슬라임은 이미 1.5초 중앙 폴백을 갖고 있었는데
     디스크만 빠져 있었습니다.
     아는 좌표가 있으면 거기에, 없으면 스테이지 가운데에 놓고 띄웁니다. */
  function showDisc() {
    if (reduce || !finePointer() || ptr.has) return;
    const v = lastClient ? clientToVB(lastClient.x, lastClient.y)
                         : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    ptr.v = v;
    placeDisc(v);
    gsap.set(els.playCursor, { opacity: 1 });
    /* 좌표를 실제로 아는 경우(장면 13에서 움직였다)에만 OS 커서를 숨깁니다 — 디스크가
       커서 위에 정확히 놓였으니까요. 가운데 폴백일 때는 커서가 어디 있는지 모르므로
       보통 커서를 남겨 둡니다. */
    if (lastClient) els.body.classList.add('ptr-on');
    // ptr.has는 세우지 않습니다 — 아직 「커서가 저기 있다」고 확신할 수 없고,
    // 그래야 첫 pointermove가 정상 경로(슬라임 팝·스포트라이트)를 밟습니다.
  }

  function play() {
    if (!armed) return;
    armed = false;
    if (armTl) { armTl.kill(); armTl = null; }        // only the entrance tweens; the intro timeline keeps its own
    clearPop();
    setCtl('skip');                                   // 디스크는 사라지지 않고 역할만 바꿉니다
    sats.forEach((b, i) => {                            // drop the cursor pull; the intro owns x/y now
      if (!b.home) return;
      Object.assign(b, { f: 0, ampK: 1, spdK: 1, x: b.home.x, y: b.home.y, r: R });
      gsap.set(els.logos[i], { x: b.home.x, y: b.home.y, scale: lgK() });
    });
    if (slimeX && slimeX.tween) slimeX.tween.kill();   // stop pointer-follow tweens so the centering tween owns x/y
    if (slimeY && slimeY.tween) slimeY.tween.kill();
    els.body.classList.remove('is-armed');
    els.body.classList.add('is-intro');
    tl.invalidate();                                  // re-evaluate coverR() for this start position
    tl.timeScale(hooks.speed || 1).play(0);          // 홈은 1.6배속(init의 speed), 랜딩은 1
  }

  /* 홈페이지 · 클릭 없이 자동 재생 (기획서 3p 「애니메이션 속도를 높여 오프닝으로」).
     랜딩의 START 대기 화면(arm)을 그대로 거치되 커서를 기다리지 않습니다 — 블롭이 튀어나오고
     가운데에 슬라임이 생기는 짧은 등장만 보여 준 뒤 같은 play() 경로로 들어가, 타임라인을
     speed배로 돌립니다. 커서 디스크·고정 컨트롤은 홈페이지 CSS가 감춥니다. */
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
    /* 21차: visibility·opacity를 여기서 직접 쓰지 않습니다. scroll.js의 syncStage()가
       유일한 주인이고, main.js의 restart()가 히어로로 스크롤한 뒤 resync()를 부릅니다.
       예전에는 restart()의 scrollTo(0,0)이 onEnterBack을 유발해 우연히 정리됐는데,
       장면 13이 맨 위로 오면서 그 우연이 사라졌습니다 — 그대로 두면 RESTART 뒤에도
       body.stage-parked가 남아 장면 9 색 덩어리가 paused로 얼어붙습니다. */
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
