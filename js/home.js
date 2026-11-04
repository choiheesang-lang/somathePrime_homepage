/* ─────────────────────────────────────────────────────────────
   home.js — 홈: 오프닝 인트로 · 메인 비주얼 캐러셀 · 배너 토글 · 섹션 등장(reveal) · 장면 10 카드 ticker · 장면 12 스크럽 · 교육 프로그램 4면 판
   쓰는 곳: 홈(index.html, 머리말 `js: hero home goo`)  ·  의존: gsap + ScrollTrigger · js/hero.js(window.STP.hero) · js/lead.js(data-lead-open) · partial stage / scene10 / scene12 · css/home.css
   인트로 게이트는 index.html의 인라인 <script>가 첫 페인트 전에 정합니다 — `?intro=1`이면 항상, `?intro=0`이면 끔,
   그 밖에는 동작 줄이기가 아니고 (새로고침이거나 referrer가 같은 origin이 아닐 때)만 body.intro-on.
   인트로가 걷히면 finishIntro()가 intro-* 클래스를 떼고 `stp:intro-done` 이벤트를 보냅니다(캐러셀이 그때부터 5초를 셉니다).
   gsap.matchMedia 블록 안의 ticker · IntersectionObserver · resize 핸들러는 cleanup으로 직접 거둡니다 — matchMedia는 자기 트윈만 정리합니다.
   ───────────────────────────────────────────────────────────── */
(function () {
  if (!window.gsap) { document.body.classList.remove('intro-on'); return; }
  gsap.registerPlugin(ScrollTrigger);
  const body = document.body;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 관심고객 등록 팝업은 자동으로 열지 않습니다 — 배너 옆 버튼 · 퀵메뉴 · 장면 12 버튼을 누를 때만(js/lead.js) */

  /* ── 인트로 (기획서 3p) ───────────────────────────────────────────
     START 대기 화면 — 슬라임 마스크가 커서(모바일은 손가락)를 따라다니며 저절로 넘어가지
     않습니다. 화면 아래 가운데 SKIP을 누르면 곧바로 홈, 마스크를 누르면 오프닝을
     1.6배속으로 재생하고 장면 9의 로고를 잠깐 보여 준 뒤 막을 걷습니다. */
  const SPEED = 1.6, HOLD = 900, FADE = 900, MASK_OPEN = 1.1;
  let leaving = false;
  /* 막이 걷힌 뒤: 인트로 클래스를 떼면 CSS가 GNB(위) · 메인 비주얼 글 패널(왼쪽) ·
     퀵메뉴(오른쪽)를 차례로 들여보냅니다(home.css 「인트로 → 메인 등장」). */
  const finishIntro = () => {
    body.classList.add('intro-entering');
    body.classList.remove('intro-on', 'intro-leaving', 'intro-revealing', 'intro-light', 'hero-on');
    const stage = document.getElementById('stage');
    stage.style.webkitMaskImage = stage.style.maskImage = '';
    body.classList.remove('disc-near');
    if (window.STP && STP.hero && STP.hero.setDiscScale) STP.hero.setDiscScale(1);
    if (window.STP && STP.hero) {
      // SKIP으로 걷었으면 히어로가 아직 대기(armed)·재생 중입니다 — 끝 상태로 보내 포인터 추적을 끊고
      if (body.classList.contains('is-armed') || body.classList.contains('is-intro')) STP.hero.finish();
      STP.hero.setActive(false);                                // 전면 블러 네 겹을 멈춥니다
    }
    body.classList.remove('ptr-on', 'intro-light');            // finish()가 장면 9 훅을 부르며 다시 붙입니다
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
    setTimeout(() => body.classList.remove('intro-entering'), 1600);
    window.dispatchEvent(new Event('stp:intro-done'));
  };
  // 오프닝을 끝까지 본 경우: 장면 9의 밝은 화면을 페이드로 걷습니다
  const leave = () => {
    if (leaving) return;
    leaving = true;
    body.classList.add('intro-leaving', 'intro-revealing');
    setTimeout(finishIntro, FADE);
  };
  /* SKIP: 슬라임 마스크가 화면 끝까지 커지며 그 안으로 메인이 보입니다. #stage에 「가운데가
     뚫린」 원형 마스크를 걸고 반지름을 키웁니다 — 마스크 안쪽이 이미 캠퍼스 사진이라 그대로
     메인 비주얼 사진으로 이어집니다. 재생 중이라 슬라임이 없으면 화면 가운데에서. */
  const maskOpen = () => {
    if (leaving) return;
    leaving = true;
    body.classList.add('intro-revealing');
    const stage = document.getElementById('stage');
    const sr = stage.getBoundingClientRect();
    const slime = body.classList.contains('is-armed') && document.getElementById('slime');
    let cx = sr.width / 2, cy = sr.height / 2, r0 = 0;
    if (slime) {
      const b = slime.getBoundingClientRect();
      cx = b.left + b.width / 2 - sr.left; cy = b.top + b.height / 2 - sr.top; r0 = b.width * 0.42;
    }
    const r1 = Math.hypot(Math.max(cx, sr.width - cx), Math.max(cy, sr.height - cy)) + 24;
    const m = { r: r0 };
    const paint = () => {
      const g = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${m.r.toFixed(1)}px, #000 ${(m.r + 1.5).toFixed(1)}px)`;
      stage.style.webkitMaskImage = stage.style.maskImage = g;
    };
    paint();
    gsap.to(m, { r: r1, duration: MASK_OPEN, ease: 'power2.in', onUpdate: paint, onComplete: finishIntro });
  };
  if (body.classList.contains('intro-on')) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    body.classList.add('hero-on');      // 「히어로가 화면의 주인」 — 커서 디스크의 표시 조건(hero.css)
    const hero = STP.hero.init({
      reduce: reduceMQ.matches,
      speed: SPEED,
      touchMask: true,
      noRestart: true,
      topFlush: true,                   // 인트로 동안 GNB는 숨어 있으므로 위 블롭은 아래 블롭처럼 화면 끝에 걸쳐 붙습니다                  // 오프닝은 처음 한 번만 — 끝나도 RESTART를 띄우지 않습니다
      onToLight: () => body.classList.add('intro-light'),
      onComplete: () => setTimeout(leave, leaving ? 0 : HOLD),
    });
    const go = () => {
      if (reduceMQ.matches) { leave(); return; }      // 동작 감소면 대기 화면 없이 곧바로 홈
      hero.arm();
      setTimeout(placeSkip, 800);                     // 블롭이 다 튀어나온 뒤에 잽니다
    };
    /* SKIP은 아래 가운데 — 단 아래 블롭(myON)과 겹치지 않게, 유리 카드와 그 블롭 사이 틈의
       가운데에 둡니다. 틈이 좁으면(세로 태블릿) 블롭 아래, 그것도 안 되면 화면 맨 아래. */
    const skipBtn = document.getElementById('intro-skip');
    const finePtr = window.matchMedia('(hover: hover) and (pointer: fine)');
    const placeSkip = () => {
      if (leaving || !body.classList.contains('is-armed')) return;
      // 터치 화면은 CSS가 좌하단 96 동그라미로 고정합니다(START와 대칭) — 계산값을 지워 둡니다
      if (!finePtr.matches) { skipBtn.style.removeProperty('top'); skipBtn.style.removeProperty('bottom'); skipBtn.style.removeProperty('--dk'); return; }
      skipBtn.style.setProperty('--dk', (hero.discPx() / 96).toFixed(3));   // 글자 · 아이콘을 START 디스크 배율로
      const panel = document.querySelector('#stage .panel');
      const sats = [...document.querySelectorAll('#hero .b-sat')].map((e) => e.getBoundingClientRect());
      if (!panel || !sats.length) return;
      const p = panel.getBoundingClientRect();
      const b = sats.reduce((a, r) => (r.top > a.top ? r : a));   // 가장 아래 블롭
      const H = skipBtn.offsetHeight, M = 12, vh = window.innerHeight;
      let top;
      if (b.top - p.bottom >= H + M * 2) top = (p.bottom + b.top - H) / 2;
      else if (vh - b.bottom >= H + M * 2) top = (b.bottom + vh - H) / 2;
      else top = vh - H - M * 2;
      skipBtn.style.top = Math.round(top) + 'px';
      skipBtn.style.bottom = 'auto';
    };
    /* START 동그라미 → SKIP: 버튼 가장자리 120px 안에서 ease-in-out으로 32px까지 줄이고,
       영역에 들어오면 START 글자를 숨기고(CSS 0.3초), 버튼과 겹친 부분만 반전합니다.
       마우스로 대기 중일 때만 — 터치 · 동작 감소에는 커서 동그라미가 없습니다. */
    const NEAR = 120, DISC_MIN = 32;
    const eio = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
    const discCircle = document.querySelector('#play-btn .pb-base circle');
    const nearSkip = (e) => {
      if (e.pointerType !== 'mouse' || leaving || !body.classList.contains('is-armed')) return;
      const b = skipBtn.getBoundingClientRect();
      const qx = Math.max(b.left - e.clientX, 0, e.clientX - b.right);
      const qy = Math.max(b.top - e.clientY, 0, e.clientY - b.bottom);
      const dist = Math.hypot(qx, qy);
      const p = eio(Math.min(1, Math.max(0, 1 - dist / NEAR)));
      const kMin = Math.min(1, DISC_MIN / hero.discPx());
      hero.setDiscScale(1 - (1 - kMin) * p);
      body.classList.toggle('disc-near', dist < NEAR);
      let r = 0, x = 0, y = 0;
      if (dist < 40 && discCircle) {                 // 겹칠 수 있는 거리에서만 잽니다
        const c = discCircle.getBoundingClientRect();
        r = c.width / 2; x = c.left + r - b.left; y = c.top + r - b.top;
      }
      skipBtn.style.setProperty('--inv-r', r.toFixed(1) + 'px');
      skipBtn.style.setProperty('--inv-x', x.toFixed(1) + 'px');
      skipBtn.style.setProperty('--inv-y', y.toFixed(1) + 'px');
    };
    const resetNear = () => {
      hero.setDiscScale(1);
      body.classList.remove('disc-near');
      skipBtn.style.setProperty('--inv-r', '0px');
    };
    window.addEventListener('pointermove', nearSkip, { passive: true });
    document.getElementById('stage').addEventListener('click', () => { if (!leaving) resetNear(); });   // 재생 시작
    let skipT;
    window.addEventListener('resize', () => { clearTimeout(skipT); skipT = setTimeout(placeSkip, 300); });
    // 히어로 사진이 디코드된 뒤 시작합니다(최대 0.9초 대기) — 슬라임 창에 사진이 바로 보이게
    const photo = new Image(); photo.src = '/img/hero-campus.webp';
    let started = false;
    const start = () => { if (!started) { started = true; go(); } };
    (photo.decode ? photo.decode() : Promise.resolve()).then(start, start);
    setTimeout(start, 900);
    // 휠·터치는 빨리 감기, 건너뛰기는 곧바로 끝
    const ff = () => hero.fastForward();
    window.addEventListener('wheel', ff, { passive: true });
    window.addEventListener('touchstart', ff, { passive: true });
    document.getElementById('intro-skip').addEventListener('click', (e) => {
      e.stopPropagation();
      window.removeEventListener('wheel', ff);
      window.removeEventListener('touchstart', ff);
      maskOpen();                  // 재생 중이던 타임라인은 마스크 뒤에서 그대로 끝나고, leave는 leaving으로 막힙니다
    });
  }

  /* ── 상단 배너 닫기 (세션 동안) ────────────────────────────────── */

  /* ── 메인 비주얼 롤링 (기획서 4p ③) — 텍스트 고정, 사진 3장 ─────────── */
  (function kv() {
    const slides = [...document.querySelectorAll('.kv__slide')];
    const copies = [...document.querySelectorAll('.kv__copy')];   // 사진마다 문구 한 벌
    if (slides.length < 2) return;
    const count = document.querySelector('#kv-count b');
    const toggle = document.getElementById('kv-toggle');
    const bar = document.getElementById('kv-bar');
    const DUR = 5;
    let i = 0, paused = reduceMQ.matches, barTw = null;
    const show = (n) => {
      slides[i].classList.remove('is-on');
      i = (n + slides.length) % slides.length;
      const s = slides[i];
      const img = s.querySelector('img'); if (img.loading === 'lazy') img.loading = 'eager';
      s.classList.add('is-on');
      copies.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.setAttribute('aria-hidden', String(k !== i)); });
      count.textContent = i + 1;
      run();
    };
    const run = () => {
      if (barTw) barTw.kill();
      gsap.set(bar, { scaleX: 0 });
      if (paused || body.classList.contains('intro-on')) return;   // 인트로 동안은 첫 장(입구)에 머뭅니다
      barTw = gsap.to(bar, { scaleX: 1, duration: DUR, ease: 'none', onComplete: () => show(i + 1) });
    };
    const setPaused = (p) => {
      paused = p;
      toggle.setAttribute('aria-pressed', String(p));
      toggle.setAttribute('aria-label', p ? '자동 넘김 재생' : '자동 넘김 멈춤');
      run();
    };
    document.getElementById('kv-prev').addEventListener('click', () => show(i - 1));
    document.getElementById('kv-next').addEventListener('click', () => show(i + 1));
    toggle.addEventListener('click', () => setPaused(!paused));
    // 나머지 두 장은 첫 장이 뜬 뒤에 받아 둡니다
    window.addEventListener('load', () => slides.forEach((s) => { const im = s.querySelector('img'); im.loading = 'eager'; }), { once: true });
    setPaused(paused);
    window.addEventListener('stp:intro-done', run);   // 인트로가 걷히면 그때부터 5초를 셉니다
  })();

  /* ── 메인 비주얼 배너 켜고 끄기 — 배너가 있을 때 · 없을 때를 보는 디자인 확인용 ─────
     판을 누르면 내용이 사라지고, 같은 자리(버튼은 남아 있음)를 다시 누르면 돌아옵니다. 저장하지 않습니다. */
  (function kvBanner() {
    const b = document.getElementById('kv-banner');
    if (!b) return;
    /* 모바일(≤1024)은 토글 없이 항상 보이고, 누르면 관심고객 등록 팝업(js/lead.js의 data-lead-open 위임) */
    const mobile = window.matchMedia('(max-width: 1024px)');
    const label = () => (b.classList.contains('is-off') ? '관심고객 등록 배너 보이기' : '관심고객 등록 배너 숨기기');
    const mode = () => {
      if (mobile.matches) {
        b.setAttribute('data-lead-open', '');
        b.removeAttribute('aria-pressed');
        b.setAttribute('aria-label', '관심고객 등록하기');
      } else {
        b.removeAttribute('data-lead-open');
        b.setAttribute('aria-pressed', String(!b.classList.contains('is-off')));
        b.setAttribute('aria-label', label());
      }
    };
    mode();
    mobile.addEventListener('change', mode);
    b.addEventListener('click', () => {
      if (mobile.matches) return;
      const off = b.classList.toggle('is-off');
      b.setAttribute('aria-pressed', String(!off));
      b.setAttribute('aria-label', label());
    });
  })();

  /* ── 영역 클릭 이동 (5p ③ 브랜드 소개 · 7p ② 캠퍼스 안내) ───────────
     섹션 안의 버튼·링크는 자기 일을 하고, 그 밖의 빈 곳을 누르면 이동합니다. */
  document.querySelectorAll('[data-href]').forEach((sec) => {
    sec.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, label')) return;
      if (window.getSelection && String(window.getSelection())) return;   // 글자 드래그는 이동 아님
      location.href = sec.dataset.href;
    });
  });

  /* ── 섹션 등장 · 장면 10 · 장면 12 ─────────── */
  const REVEAL = { y: 40, dur: 0.85, ease: 'power3.out', gap: 0.14, sub: 0.07, start: 'top 85%' };
  function reveal(contentSel, reduce) {
    const box = document.querySelector(contentSel);
    if (!box) return;
    const steps = new Map();
    box.querySelectorAll('[data-step]').forEach((el) => {
      const k = +el.dataset.step || 0;
      if (!steps.has(k)) steps.set(k, []);
      steps.get(k).push(el);
    });
    if (!steps.size) return;

    const order = [...steps.keys()].sort((a, b) => a - b);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: steps.get(order[0])[0],          // 섹션이 아니라 첫 줄이 트리거
        start: REVEAL.start, toggleActions: 'play none none reverse',
      },
    });
    order.forEach((k, i) => {
      tl.fromTo(steps.get(k),
        { y: reduce ? 0 : REVEAL.y, opacity: 0 },
        { y: 0, opacity: 1,
          duration: reduce ? 0.3 : REVEAL.dur,
          ease: REVEAL.ease,
          stagger: reduce ? 0 : REVEAL.sub },
        i * (reduce ? 0.06 : REVEAL.gap));
    });
  }

  body.classList.add('has-reveal');
  const mm = gsap.matchMedia();
  mm.add({ reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    const { reduce } = ctx.conditions;
    let cleanup = () => {};
    const parked = false;          // 홈에는 장면 10을 덮는 장면이 없어 ticker를 세울 조건이 없습니다

    reveal('#s-intro .intro', reduce);
    reveal('#s-program', reduce);
    reveal('#s-copy-2 .section__inner', reduce);
    reveal('#s-visit', reduce);

    /* ── 네 개의 브랜드 — 4면 판 + 슬라임 흡수 (6p, 피그마 18144-9958 구성) ─────────
       가운데 어두운 슬라임(소마더프라임)이 한 면으로 흘러가 그 면의 브랜드 색으로 물들며 흡수되고,
       사진이 그 자리에서 원형으로 번지며 면이 활성이 됩니다. 그 뒤 가운데서 작은 슬라임이 다시
       부풉니다. 마우스가 없으면 4.5초마다 시계 방향으로 돌고, 면에 올리면 그 면으로 갑니다.
       블롭 경로 생성(makeBlob · blobPath · write)은 js/hero.js의 것을 옮겨 적었습니다 — hero 쪽은
       모듈 상태(N · HARM · k · wiggle)에 묶여 있어 내보내는 대신 복사했습니다. */
    const quadCleanup = (function quad() {
      const root = document.getElementById('quad');
      if (!root) return () => {};
      const faces = [...root.querySelectorAll('.quad__face')];
      const ORDER = [0, 1, 3, 2];                       // DOM(2×2) → 시계 방향: 소마 · 플레이팩토 · 리딩오션 · 마이온
      const W = 1400, H = 688, C = { x: W / 2, y: H / 2 }, R = 110;
      const CYCLE = reduce ? 6 : 4.5;
      const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const INK = css('--primary-normal') || '#2C2A29';
      const q = (id) => document.getElementById(id);
      const mark = q('quad-mark');
      let cur = faces.findIndex((f) => f.classList.contains('is-on'));
      if (cur < 0) cur = 0;
      let timer = null, hovering = false, onScreen = false, busy = null, pending = -1;

      /* ── 블롭 (hero.js:229-305 사본, 상수만 이 판 기준) ── */
      const N = 28, HARM = 3, wiggle = { amp: reduce ? 0 : 1 };
      function makeBlob(vis, twin, seed) {
        const rnd = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        return {
          x: C.x, y: C.y, r: 0, tt: 0,
          om: [0.9 + rnd(1) * 0.5, -(1.1 + rnd(2) * 0.5), 0.6 + rnd(3) * 0.4],
          ph: [rnd(4) * 6.283, rnd(5) * 6.283, rnd(6) * 6.283],
          vis, twin, lastD: '',
        };
      }
      function blobPath(b) {
        const rel = 0.07, amp = wiggle.amp * rel * Math.min(b.r, 260);
        const px = new Array(N), py = new Array(N);
        for (let i = 0; i < N; i++) {
          const th = i / N * 6.283185307;
          let mod = 0.55 * Math.sin(2 * th + b.om[0] * b.tt + b.ph[0]) + 0.30 * Math.sin(3 * th + b.om[1] * b.tt + b.ph[1]);
          if (HARM > 2) mod += 0.15 * Math.sin(5 * th + b.om[2] * b.tt + b.ph[2]);
          const rr = b.r + amp * mod;
          px[i] = b.x + rr * Math.cos(th); py[i] = b.y + rr * Math.sin(th);
        }
        let d = 'M' + px[0].toFixed(1) + ' ' + py[0].toFixed(1);
        for (let i = 0; i < N; i++) {
          const i0 = (i + N - 1) % N, i1 = (i + 1) % N, i2 = (i + 2) % N;
          d += 'C' + (px[i] + (px[i1] - px[i0]) / 6).toFixed(1) + ' ' + (py[i] + (py[i1] - py[i0]) / 6).toFixed(1)
             + ' ' + (px[i1] - (px[i2] - px[i]) / 6).toFixed(1) + ' ' + (py[i1] - (py[i2] - py[i]) / 6).toFixed(1)
             + ' ' + px[i1].toFixed(1) + ' ' + py[i1].toFixed(1);
        }
        return d + 'Z';
      }
      function write(b) {
        const d = b.r < 0.5 ? '' : blobPath(b);
        if (d === b.lastD) return;
        b.vis.setAttribute('d', d); b.twin.setAttribute('d', d); b.lastD = d;
      }
      const main = makeBlob(q('quad-main'), q('quad-main-crisp'), 3);
      const drop = makeBlob(q('quad-drop'), q('quad-drop-crisp'), 7);
      const size = { base: R };                         // main의 현재 반지름 — 방울을 떼어 보내면 줄고, 대기 동안 R로 차오릅니다
      const setFill = (b, c) => { b.vis.style.fill = c; b.twin.style.fill = c; };
      setFill(main, INK); setFill(drop, INK);

      const faceCenter = (i) => ({ x: (i % 2 ? 3 : 1) * W / 4, y: (i < 2 ? 1 : 3) * H / 4 });
      /* 뒤 슬라임 넷 — DOM 면 순서대로 브랜드 색. 반지름 0.92R라 가운데 있으면 검은 슬라임에 다 가려지고,
         자기 면 방향으로 12~32 치우치며 떠돌아 가장자리 밖으로 3~23px만 비칩니다 */
      const BACK_R = R * 0.92;
      const back = ['--pal-brand-coral', '--pal-brand-yellow', '--pal-brand-sage-green', '--pal-brand-dusty-blue'].map((tok, k) => {
        const b = makeBlob(q('quad-back-' + k), q('quad-back-' + k + '-crisp'), 11 + k * 2);
        const fc = faceCenter(k);
        b.ang0 = Math.atan2(fc.y - C.y, fc.x - C.x);
        b.wa = 0.25 + b.om[0] * 0.12; b.wb = 0.3 + b.om[2] * 0.15;   // 0.25~0.45 rad/s, 블롭마다 다르게
        b.r = BACK_R; setFill(b, css(tok));
        return b;
      });
      /* 검은 슬라임 현재 크기 비율(s)만큼 같이 줄고, 마우스가 판 위에 있으면 그쪽으로 8·s 끌립니다(hero attract와 같은 완화) */
      const ptr = { x: 0, y: 0, has: false };
      const pull = { x: 0, y: 0 };
      const placeBack = (t, dt) => {
        const s = reduce ? 1 : size.base / R;
        let tx = 0, ty = 0;
        if (ptr.has && !reduce) { const dx = ptr.x - C.x, dy = ptr.y - C.y, d = Math.hypot(dx, dy) || 1; tx = 8 * s * dx / d; ty = 8 * s * dy / d; }
        const ease = 1 - Math.exp(-(dt || 0.016) * 6);
        pull.x += (tx - pull.x) * ease; pull.y += (ty - pull.y) * ease;
        back.forEach((b) => {
          const off = (reduce ? 22 : 22 + 10 * Math.sin(t * b.wa + b.ph[0])) * s;
          const ang = b.ang0 + (reduce ? 0 : 0.45 * Math.sin(t * b.wb + b.ph[1]));
          b.r = BACK_R * s;
          b.x = C.x + off * Math.cos(ang) + pull.x; b.y = C.y + off * Math.sin(ang) + pull.y;
        });
      };

      /* 매 프레임: main은 5% 호흡(hero breathe), 로고는 main 크기에 비례(절반 크기에서도 0.6배로 남음) */
      let clock = 0;
      const tick = (time, dtMs) => {
        if (!onScreen) return;
        const dt = Math.min(dtMs / 1000, 0.05);
        clock += dt; main.tt += dt; drop.tt += dt * 1.3;
        main.r = size.base * (1 + 0.05 * Math.sin(clock * 1.8));
        placeBack(clock, dt);
        back.forEach((b) => { b.tt += dt * 0.7; write(b); });
        write(main); write(drop);
        const v = gsap.utils.clamp(0, 1, (main.r - R * 0.5) / (R * 0.5));
        mark.style.opacity = (0.6 + 0.4 * v).toFixed(3);
        mark.style.transform = `scale(${(0.6 + 0.4 * v).toFixed(3)})`;
      };
      if (reduce) {                                     // 정지한 원 + 로고, 뒤 넷은 고정 자리
        main.r = R; write(main); mark.style.opacity = '1';
        placeBack(0); back.forEach(write);
      }

      /* 덮개 걷기 — 활성 면을 클릭하면 클릭 지점에서 원(--cr, css mask)이 커지며 덮개만 사라집니다(피그마 Quad overlay State=Clear).
         걷힌 동안은 자동 순환을 멈추고, 다시 클릭하면 원이 닫히며 덮개 복귀 · 다른 면이 활성되면 리셋 */
      let cleared = -1, clearTw = null;
      const setClear = (i, on, cx, cy) => {
        const f = faces[i];
        if (clearTw) clearTw.kill();
        if (on) { f.style.setProperty('--cx', cx + '%'); f.style.setProperty('--cy', cy + '%'); }
        f.classList.toggle('is-clear', on); f.setAttribute('aria-pressed', String(on));
        cleared = on ? i : -1;
        const cr = { v: parseFloat(f.style.getPropertyValue('--cr')) || 0 };
        const put = () => f.style.setProperty('--cr', cr.v.toFixed(1) + '%');
        if (reduce) { cr.v = on ? 150 : 0; put(); return; }
        clearTw = gsap.to(cr, { v: on ? 150 : 0, duration: on ? 0.7 : 0.5, ease: on ? 'power2.out' : 'power2.in', onUpdate: put });
      };
      const resetClear = () => { if (cleared >= 0) { const i = cleared; cleared = -1; faces[i].classList.remove('is-clear'); faces[i].setAttribute('aria-pressed', 'false'); faces[i].style.setProperty('--cr', '0%'); } };

      /* 면 전환 — 사진은 슬라임이 사라진 자리(--rx --ry)에서 원이 커지며 드러납니다 */
      const setOn = (i, revealFrom) => {
        if (cleared >= 0 && cleared !== i) resetClear();
        faces.forEach((f, k) => f.classList.toggle('is-on', k === i));
        cur = i;
        const photo = faces[i].querySelector('.quad__photo');
        if (reduce || !revealFrom) { photo.style.setProperty('--rv', '150%'); return; }
        const rv = { v: 0 };
        gsap.fromTo(rv, { v: 0 }, { v: 150, duration: 0.7, ease: 'power2.out',
          onUpdate: () => photo.style.setProperty('--rv', rv.v.toFixed(1) + '%') });
      };
      function activate(i) {
        if (i === cur && !busy) return;
        if (busy) { pending = i; busy.timeScale(3); return; }   // 진행 중이면 빨리 끝내고 이어서
        stopTimer();
        if (reduce) { setOn(i); schedule(); return; }
        const fc = faceCenter(i), tx = C.x + (fc.x - C.x) * 0.6, ty = C.y + (fc.y - C.y) * 0.6;
        /* 넓이 1/4을 검은 방울로 떼어 냅니다 — 방울 r/2, 남는 것 r·√0.75. 연달아 떼어도 절반 아래로는 안 내려갑니다 */
        if (refillTw) { refillTw.kill(); refillTw = null; }
        const dropR = size.base / 2, keepR = Math.max(size.base * Math.sqrt(0.75), R * 0.5);
        drop.x = C.x; drop.y = C.y; drop.r = dropR; setFill(drop, INK);
        busy = gsap.timeline({ onComplete: () => {
          busy = null;
          refill();
          if (pending >= 0) { const n = pending; pending = -1; activate(n); }
          else schedule();
        } });
        busy.to(size, { base: keepR, duration: 0.45, ease: 'power2.out' }, 0)
          .to(drop, { x: tx, y: ty, duration: 0.9, ease: 'power2.in' }, 0)
          .to(drop, { r: 0, duration: 0.35, ease: 'power3.in' }, 0.55)
          .add(() => setOn(i, true), 0.9);
      }
      /* 보낸 뒤 대기 동안 숨 들이듯 제 크기로 */
      let refillTw = null;
      function refill() { refillTw = gsap.to(size, { base: R, duration: 3, ease: 'sine.inOut', onComplete: () => { refillTw = null; } }); }
      const next = () => activate(ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]);
      function stopTimer() { if (timer) { timer.kill(); timer = null; } }
      function schedule() { stopTimer(); if (onScreen && !hovering && cleared < 0) timer = gsap.delayedCall(CYCLE, next); }

      /* 클릭(탭 · Enter · Space): 비활성 면이면 활성, 활성 면이면 덮개 걷기 ↔ 복귀 */
      const press = (i, cx, cy) => {
        if (i !== cur || busy) { activate(i); return; }
        const on = cleared !== i;
        setClear(i, on, cx, cy);
        if (on) stopTimer(); else schedule();
      };
      faces.forEach((f, i) => {
        f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; hovering = true; stopTimer(); activate(i); });
        f.addEventListener('click', (e) => {
          const r = f.getBoundingClientRect();
          const cx = e.clientX ? (e.clientX - r.left) / r.width * 100 : 50, cy = e.clientY ? (e.clientY - r.top) / r.height * 100 : 50;
          press(i, cx, cy);
        });
        f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(i, 50, 50); } });
      });
      root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; hovering = false; ptr.has = false; if (!busy) schedule(); });
      root.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = root.getBoundingClientRect();                    // 판 좌표 → viewBox 1400×688
        ptr.x = (e.clientX - r.left) / r.width * W; ptr.y = (e.clientY - r.top) / r.height * H; ptr.has = true;
      }, { passive: true });

      const io = new IntersectionObserver((e) => {
        onScreen = e[0].isIntersecting;
        if (onScreen) { if (!reduce) gsap.ticker.add(tick); if (!busy) schedule(); }
        else { gsap.ticker.remove(tick); stopTimer(); }
      }, { threshold: 0.2 });
      io.observe(root);
      return () => { gsap.ticker.remove(tick); io.disconnect(); stopTimer(); if (busy) busy.kill(); if (refillTw) refillTw.kill(); };
    })();

      /* 아이콘 그리기 — 데스크톱은 세 카드가 한 줄이라 줄 하나를 트리거로 한 타임라인에
         생각의 깊이 → 표현의 힘 → 성장가능성을 이어 붙여, 스크롤을 따라 차례로 완성됩니다.
         모바일은 카드가 세로로 쌓여 이미 차례로 지나가므로 카드마다 자기 트리거. */
      const rowMode = !reduce && window.matchMedia('(min-width: 641px)').matches;
      const rowTl = rowMode && gsap.timeline({
        scrollTrigger: { trigger: '#s-intro .keywords', start: 'top 82%', end: 'top 22%', scrub: 0.6 },
      });
      gsap.utils.toArray('#s-intro .kw-slot').forEach((slot, i) => {
        const q = (sel) => slot.querySelector(sel);
        (rowTl || gsap.timeline({
          scrollTrigger: reduce
            ? { trigger: slot, start: 'top 85%', toggleActions: 'play none none reverse' }
            : { trigger: slot, start: 'top 74%', end: 'top 52%', scrub: 0.6 },
        }))
          .to({}, { duration: rowTl && i ? 0.15 : 0 })                 // 카드 사이 짧은 숨
          .fromTo(slot.querySelectorAll('.ic-line path'), { strokeDashoffset: 100 },
            { strokeDashoffset: 0, duration: reduce ? 0.2 : 1, ease: 'none', stagger: reduce ? 0 : 0.14 })
          /* transformOrigin은 **from에도** 있어야 합니다. to에만 두면 GSAP이 트윈
             도중 원점이 바뀐 것으로 보고 smoothOrigin 보정 이동을 끼워 넣는데, 그게 배율이
             1로 돌아온 뒤에도 남습니다 — 실측 insight의 point가 최종 matrix(1,0,0,1,-4.2,-3.9)
             로 끝나 피그마보다 왼쪽 4.2 · 위 3.9만큼 어긋나 있었습니다. 정적 SVG 좌표는
             피그마와 픽셀 단위로 같았으니, 어긋남은 전적으로 이 보정값이었습니다. */
          .fromTo(q('.ic-color'),
            { opacity: 0, scale: reduce ? 1 : 0.72, transformOrigin: '50% 50%' },
            { opacity: 1, scale: 1, duration: reduce ? 0.3 : 0.32, ease: 'back.out(1.6)',
              transformOrigin: '50% 50%', smoothOrigin: false })
          .fromTo([q('.ic-point'), q('.ic-light')],
            { opacity: 0, scale: reduce ? 1 : 0.6, transformOrigin: '50% 50%' },
            { opacity: 1, scale: 1, duration: reduce ? 0.3 : 0.22, stagger: 0.08, ease: 'back.out(2)',
              transformOrigin: '50% 50%', smoothOrigin: false });
      });

      /* ── 끝없는 움직임 — CSS 키프레임이 아니라 ticker가 씁니다 ──────────
         선언적 transform 애니메이션(CSS @keyframes / Web Animations)은 Chrome이 요소를
         컴포지터 레이어로 승격시켜 회전 전 상태로 **한 번만** 래스터하고 그 텍스처를
         돌립니다 — 안의 선과 글자가 전부 리샘플링된 비트맵이 됩니다. 실측 디테일 −30 %이고,
         `backdrop-filter`나 `will-change`도 각각 같은 일을 합니다. JS에서 transform을 쓰면
         카드가 메인 스레드에 남아, 지금 각도 그대로 또렷하게 다시 래스터됩니다. */
      /* 모바일에서는 배경 워드마크의 가로 마퀴 · 세로 패럴랙스를 끕니다(wideBg). 카드
         흔들림과 아이콘 호흡은 모바일에서도 그대로입니다. */
      const wideBg = window.matchMedia('(min-width: 641px)').matches;
      if (!reduce) {
        const cards = gsap.utils.toArray('.kw-card');
        const glass = gsap.utils.toArray('.kw-glass');   // 같은 각도를 같은 패스에서 씁니다
        const tilt  = cards.map(c => parseFloat(getComputedStyle(c).getPropertyValue('--tilt')) || 0);
        const blobs = gsap.utils.toArray('.ic-breathe');
        const SWAY = [0.967, 0.849, 1.065];              // rad/s — 주기 6.5 / 7.4 / 5.9 s
        const BR   = [1.745, 1.496, 1.963];              // 3.6 / 4.2 / 3.2 s
        const PH   = [0, 2.1, 4.3];
        /* 카드는 −15°~+15°를 오갑니다. 시작 각도는 피그마의 −5 / 15 / 5를 그대로 지켜야
           하므로 **위상**으로 풉니다 — asin(각도/15)면 t=0에 정확히 그 각도에서 출발하고,
           주기(SWAY)가 서로 달라 셋이 같이 움직이지 않습니다. 최대 기울기에서 옆 카드와
           스치지 않도록 .keywords의 gap이 24입니다(sections.css). */
        const AMP = 15;
        const TPH = tilt.map((d) => Math.asin(gsap.utils.clamp(-1, 1, d / AMP)));

        /* ── 배경 워드마크 — 옆으로 끝없이 흐릅니다 ──────────────────────
           CSS 마퀴 대신 여기서 모는 이유는 카드와 같습니다: 선언적 transform은 이 레이어를
           승격시키는데, 그 위의 .kw-glass가 backdrop-filter로 이 레이어를 샘플링하므로
           리샘플링된 텍스처가 유리판에 그대로 드러납니다. 트랙은 가운데 정렬이라 t=0에
           한 벌이 이미 피그마 자리에 있고, 오프셋은 0에서 한 벌의 폭까지만 돕니다. */
        const track = document.querySelector('.intro__bg__track');
        const MARQ = 40;                                 // px/s — 1920에서 한 벌에 약 37 s
        let unitW = 0;
        const layout = () => {
          if (!track) return;
          if (!wideBg) {                                 // 모바일: 복제 없이 한 벌만
            while (track.children.length > 1) track.lastElementChild.remove();
            track.style.transform = '';
            unitW = 0;
            return;
          }
          const word = track.firstElementChild;
          if (!word) return;
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          unitW = word.getBoundingClientRect().width + gap;
          if (!unitW) return;
          // +2: 한 주기의 끝에서도, 복제 뒤에도 행이 상자를 다 덮도록
          const want = Math.ceil(track.parentElement.getBoundingClientRect().width / unitW) + 2;
          while (track.children.length > want) track.lastElementChild.remove();
          while (track.children.length < want) track.appendChild(word.cloneNode(true));
        };
        layout();
        // 웹폰트는 보통 이 코드 뒤에 도착하고, 그 서체에서 단어 폭이 달라집니다 — 다시 잽니다
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
        let rz;
        const onResize = () => { clearTimeout(rz); rz = setTimeout(layout, 150); };
        window.addEventListener('resize', onResize);

        let onScreen = false;
        const tick = (t) => {
          if (!onScreen || parked) return;
          if (track && unitW && wideBg) {
            // translate3d가 아니라 translateX: 3D transform은 컴포지터 승격을 강제하는데,
            // 그게 바로 이 ticker가 피하려는 것입니다 — .kw-glass가 이 레이어를 샘플링합니다.
            track.style.transform = 'translateX(' + (-((t * MARQ) % unitW)).toFixed(2) + 'px)';
          }
          for (let i = 0; i < cards.length; i++) {
            const tr = 'rotate(' + (AMP * Math.sin(t * SWAY[i] + TPH[i])).toFixed(3) + 'deg)';
            cards[i].style.transform = tr;
            if (glass[i]) glass[i].style.transform = tr;
          }
          for (let i = 0; i < blobs.length; i++) {
            const v = Math.sin(t * BR[i] + PH[i]);
            blobs[i].style.transform =
              'scale(' + (1 + 0.035 * v).toFixed(4) + ',' + (1 - 0.03 * v).toFixed(4) + ')';
          }
        };
        gsap.ticker.add(tick);
        // 카드 셋을 매 프레임 다시 그리는 일은 화면에 보일 때만 할 가치가 있습니다
        const io = new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; }, { threshold: 0 });
        io.observe(document.getElementById('s-intro'));
        // matchMedia는 자기가 만든 트윈만 정리합니다 — ticker 콜백과 옵저버는 우리가 거둬야
        // 합니다. 안 그러면 사용자가 동작 줄이기를 켜도 계속 돕니다
        cleanup = () => {
          gsap.ticker.remove(tick);
          io.disconnect();
          window.removeEventListener('resize', onResize);
          clearTimeout(rz);
          cards.concat(glass, blobs).forEach((el) => { el.style.transform = ''; });
          // 마퀴를 CSS에 돌려줍니다: 한 벌, 가운데 — JS 없는 페이지와 똑같이
          if (track) {
            track.style.transform = '';
            while (track.children.length > 1) track.lastElementChild.remove();
          }
        };
      }

      /* 옅은 워드마크는 카드보다 느리게 흐릅니다(세로 패럴랙스 — 넓은 화면에서만) */
      if (!reduce && wideBg) {
        gsap.fromTo('.intro__bg', { yPercent: -7 }, {
          yPercent: 7, ease: 'none',
          scrollTrigger: { trigger: '#s-intro', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }

      /* ── 장면 12 시퀀스 (피그마 box_scroll 17918:5667) ──────────────────
         .s12-wrap의 남는 높이(450vh − 100vh = 350vh)가 곧 스크럽 구간입니다. 배지 하나가
         바 안에서 왼쪽 → 가운데 → 오른쪽으로 미끄러지고, 그동안 삼각형 색과 가운데 로고가
         서서히 바뀌며 배경도 따라 넘어갑니다. 이동은 배지 자신의 폭이 아니라 **바 기준
         퍼센트**로 겁니다 — 모바일에서 배지 폭에 64px 바닥값이 걸려 xPercent가 어긋납니다. */
      const s12 = document.getElementById('s-copy-2');
      const s12wrap = s12 && s12.parentElement;
      const badge = document.querySelector('#copy-bar .s12-badge');
      const logos = gsap.utils.toArray('#copy-bar .s12-badge__logo');
      const shots = gsap.utils.toArray('#s-copy-2 .s12-photo img');
      if (s12wrap && badge && logos.length === 3 && shots.length === 3) {
        /* 마디는 넷 — 무배경 → 1 → 2 → 3 → **다시 무배경**. 래퍼 450vh(스크럽 350vh)라
           마디당 .28 × 350vh ≈ 98vh씩 지나갑니다. */
        const IN = 0.10, MID = 0.38, OUT = 0.66, END = 0.88;
        const SCRUB = 350;                               // .s12-wrap(450vh) − 100vh, % 단위
        /* 첫 마디(무배경 → 배경 1)의 타이밍. 세 일이 겹치지 않고 하나씩 떨어져야 합니다:
           배지가 왼쪽 끝에 서서 다 드러나고 → 그때부터 움직이기 시작하며 → 배경 1이
           천천히 차오르고 → 잠시 머문 뒤 → 교대. 겹치면 배지가 떠오르면서 동시에
           움직이고, 배경 1이 배지보다 먼저 나타나며, 온전히 보이는 구간이 없어집니다. */
        const LEAD    = 0.06;   // 배지가 left 0%에 선 채로 0 → 100%가 되는 구간
        const BG_IN   = 0.50;   // 배경이 천천히 차오르는 길이 (마디 대비)
        const SWAP_AT = 0.65;   // 색·로고·배경 교대가 시작되는 지점 (마디 대비)
        const S1 = MID - IN;
        const css = getComputedStyle(document.documentElement);
        const brand = ['--pal-brand-yellow', '--pal-brand-sage-green', '--pal-brand-dusty-blue']
          .map((v) => css.getPropertyValue(v).trim());   // 토큰에서 읽어 하드코딩을 피함
        const tri = badge.querySelector('.s12-badge__tri');

        /* 배지 이동은 left(%)가 아니라 translateX(px)입니다. left는 컴포지터 속성이 아니라
           레이아웃 속성이라, 450vh 스크럽 구간 내내 스크롤 프레임마다 레이아웃 + 페인트 +
           drop-shadow 재계산이 일어납니다. 퍼센트는 부모(#copy-bar) 폭 기준인데 xPercent는
           **자기 폭** 기준이라 바로 못 바꿉니다 — 함수형 값으로 부모 폭을 읽고,
           invalidateOnRefresh로 리사이즈 때 다시 계산합니다. */
        const barW = () => (badge.offsetParent || badge.parentElement).clientWidth;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: s12wrap, start: 'top top', end: 'bottom bottom', scrub: 0.5,
                           invalidateOnRefresh: true },
        });
        // 등장 : 왼쪽 끝에 선 채로 100%까지. IN에 딱 끝나므로, 움직이기 시작할 때는 이미 다 보입니다.
        tl.fromTo(badge, { opacity: 0 }, { opacity: 1, duration: LEAD, ease: 'none' }, IN - LEAD);
        // 왼쪽 → 가운데. 배경 1은 배지가 출발하는 바로 그 지점부터 천천히 차오릅니다.
        tl.fromTo(badge, { x: 0 }, { x: () => barW() * 0.45, duration: S1, ease: 'none' }, IN)
          .fromTo(shots[0], { opacity: 0 }, { opacity: 1, duration: S1 * BG_IN, ease: 'none' }, IN)
          .to(tri, { fill: brand[1], duration: S1 * (1 - SWAP_AT), ease: 'none' }, IN + S1 * SWAP_AT)
          .to(logos[0], { opacity: 0, duration: S1 * (1 - SWAP_AT), ease: 'none' }, IN + S1 * SWAP_AT)
          .to(logos[1], { opacity: 1, duration: S1 * (1 - SWAP_AT), ease: 'none' }, IN + S1 * SWAP_AT)
          .to(shots[0], { opacity: 0, duration: S1 * (1 - SWAP_AT), ease: 'none' }, IN + S1 * SWAP_AT)
          .fromTo(shots[1], { opacity: 0 }, { opacity: 1, duration: S1 * (1 - SWAP_AT), ease: 'none' }, IN + S1 * SWAP_AT);
        // 가운데 → 오른쪽
        tl.to(badge, { x: () => barW() * 0.90, duration: OUT - MID, ease: 'none' }, MID)
          .to(tri, { fill: brand[2], duration: (OUT - MID) * 0.7, ease: 'none' }, MID + (OUT - MID) * 0.2)
          .to(logos[1], { opacity: 0, duration: (OUT - MID) * 0.5, ease: 'none' }, MID + (OUT - MID) * 0.3)
          .to(logos[2], { opacity: 1, duration: (OUT - MID) * 0.5, ease: 'none' }, MID + (OUT - MID) * 0.3)
          .to(shots[1], { opacity: 0, duration: (OUT - MID) * 0.5, ease: 'none' }, MID + (OUT - MID) * 0.3)
          .fromTo(shots[2], { opacity: 0 }, { opacity: 1, duration: (OUT - MID) * 0.5, ease: 'none' }, MID + (OUT - MID) * 0.3);
        // 오른쪽 → 퇴장 : 배경 3과 배지가 함께 빠져 첫 장면과 같은 무배경으로 돌아옵니다
        tl.to(shots[2], { opacity: 0, duration: (END - OUT) * 0.55, ease: 'none' }, END - (END - OUT) * 0.55)
          .to(badge, { opacity: 0, duration: (END - OUT) * 0.45, ease: 'none' }, END - (END - OUT) * 0.45);
        tl.to({}, { duration: 1 - END });                // 무배경 상태를 끝까지 유지

        /* 흰 카피 전환은 클래스로 따로 겁니다 — scrub 타임라인 안에서 콜백을 쓰면 되감을
           때 어긋납니다. 오프셋은 위 IN을 스크럽 구간(350vh)에 얹은 값입니다. */
        ScrollTrigger.create({
          trigger: s12wrap,
          /* 배경이 충분히 깔린 뒤에 카피를 흰색으로 넘깁니다 — IN에 맞춰 두면 배경 1이
             아직 절반도 안 찼을 때 흰 글자가 아이보리 위에 떠 사라집니다. */
          start: 'top top-=' + ((IN + S1 * BG_IN * 0.6) * SCRUB) + '%',
          // 마지막 마디에서 배경이 없어지므로 흰 카피도 그때 어두워져야 합니다
          end: 'top top-=' + (END * SCRUB) + '%',
          onToggle: (self) => { s12.classList.toggle('has-bg', self.isActive); },
        });
      }

      return () => { cleanup(); quadCleanup(); };
  });

  const settle = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener('load', settle, { once: true });
})();
