/* ─────────────────────────────────────────────────────────────
   brand.js — 브랜드 > 브랜드 소개: 섹션 등장
   홈의 reveal()(js/home.js)과 같은 규칙 — [data-step] 묶음이 차례로 40px 아래에서 떠오릅니다.
   ───────────────────────────────────────────────────────────── */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const REVEAL = { y: 40, dur: 0.85, ease: 'power3.out', gap: 0.14, sub: 0.07, start: 'top 85%' };
  function reveal(box, reduce) {
    const steps = new Map();
    box.querySelectorAll('[data-step]').forEach((el) => {
      const k = +el.dataset.step || 0;
      if (!steps.has(k)) steps.set(k, []);
      steps.get(k).push(el);
    });
    if (!steps.size) return;
    const order = [...steps.keys()].sort((a, b) => a - b);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: steps.get(order[0])[0], start: REVEAL.start, toggleActions: 'play none none reverse' },
    });
    order.forEach((k, i) => {
      tl.fromTo(steps.get(k),
        { y: reduce ? 0 : REVEAL.y, opacity: 0 },
        { y: 0, opacity: 1, duration: reduce ? 0.3 : REVEAL.dur, ease: REVEAL.ease, stagger: reduce ? 0 : REVEAL.sub },
        i * (reduce ? 0.06 : REVEAL.gap));
    });
  }
  document.body.classList.add('has-reveal');
  gsap.matchMedia().add({ reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    const { reduce } = ctx.conditions;
    document.querySelectorAll('.bp-kv, .bp-intro, .bp-prime, .bp-diff, .bp-space, .bp-end').forEach((box) => reveal(box, reduce));
    return keywords(reduce);
  });

  /* ── 상단 비주얼의 키워드 카드 — 홈 장면 10(js/home.js)의 등장 · 흔들림을 옮겨 적은 것 ──
     카드마다 선이 그려지고(strokeDashoffset) 색 · 점 · 빛이 차오른 뒤, ticker가 카드를 ±15°로
     흔들고 아이콘 색 덩어리를 숨 쉬게 합니다. CSS 애니메이션이 아니라 ticker인 이유는 장면 10과
     같습니다(회전된 카드가 비트맵으로 굳지 않게). 홈은 마퀴와 엉켜 있어 함수로 빼지 않았습니다. */
  function keywords(reduce) {
    const box = document.querySelector('.bp-kv .keywords');
    if (!box) return () => {};
    gsap.utils.toArray(box.querySelectorAll('.kw-slot')).forEach((slot, i) => {
      const q = (sel) => slot.querySelector(sel);
      gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 95%', toggleActions: 'play none none none' } })
        .to({}, { duration: reduce ? 0 : 0.3 + i * 0.18 })
        .fromTo(slot.querySelectorAll('.ic-line path'), { strokeDashoffset: 100 },
          { strokeDashoffset: 0, duration: reduce ? 0.2 : 0.9, ease: 'power1.inOut', stagger: reduce ? 0 : 0.14 })
        .fromTo(q('.ic-color'),
          { opacity: 0, scale: reduce ? 1 : 0.72, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: reduce ? 0.3 : 0.32, ease: 'back.out(1.6)', transformOrigin: '50% 50%', smoothOrigin: false })
        .fromTo([q('.ic-point'), q('.ic-light')],
          { opacity: 0, scale: reduce ? 1 : 0.6, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: reduce ? 0.3 : 0.22, stagger: 0.08, ease: 'back.out(2)', transformOrigin: '50% 50%', smoothOrigin: false });
    });
    if (reduce) return () => {};
    const cards = gsap.utils.toArray(box.querySelectorAll('.kw-card'));
    const glass = gsap.utils.toArray(box.querySelectorAll('.kw-glass'));
    const blobs = gsap.utils.toArray(box.querySelectorAll('.ic-breathe'));
    const tilt = cards.map((c) => parseFloat(getComputedStyle(c).getPropertyValue('--tilt')) || 0);
    const SWAY = [0.967, 0.849, 1.065], BR = [1.745, 1.496, 1.963], PH = [0, 2.1, 4.3], AMP = 15;
    const TPH = tilt.map((d) => Math.asin(gsap.utils.clamp(-1, 1, d / AMP)));
    let onScreen = false;
    const tick = (t) => {
      if (!onScreen) return;
      for (let i = 0; i < cards.length; i++) {
        const tr = 'rotate(' + (AMP * Math.sin(t * SWAY[i] + TPH[i])).toFixed(3) + 'deg)';
        cards[i].style.transform = tr;
        if (glass[i]) glass[i].style.transform = tr;
      }
      for (let i = 0; i < blobs.length; i++) {
        const v = Math.sin(t * BR[i] + PH[i]);
        blobs[i].style.transform = 'scale(' + (1 + 0.035 * v).toFixed(4) + ',' + (1 - 0.03 * v).toFixed(4) + ')';
      }
    };
    gsap.ticker.add(tick);
    const io = new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; }, { threshold: 0 });
    io.observe(box);
    return () => { gsap.ticker.remove(tick); io.disconnect(); cards.concat(glass, blobs).forEach((el) => { el.style.transform = ''; }); };
  }
  /* ── 상단 비주얼의 둥근 V 꺾임 ──
     .is-folded(직선 다각형)와 같은 모양을 꼭짓점마다 둥글린 path()로 바꿉니다. 위 두 모서리 r24,
     아래 좌우 모서리(옆면 → 사선) r24, 가운데 꼭지 r48. 각 꼭짓점에서 양쪽 변을 따라 r만큼 물러난
     두 점을 꼭짓점을 조절점으로 한 곡선(Q)으로 잇습니다. 크기가 바뀌면 다시 그립니다. */
  const kv = document.querySelector('.bp-kv__photo');
  if (kv && window.CSS && CSS.supports('clip-path', 'path("M0 0")')) {
    const round = (pts, rs) => {
      const n = pts.length;
      let d = '';
      for (let i = 0; i < n; i++) {
        const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = rs[i];
        const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
        const s = [p[0] + (a[0] - p[0]) / la * ra, p[1] + (a[1] - p[1]) / la * ra];
        const e = [p[0] + (b[0] - p[0]) / lb * rb, p[1] + (b[1] - p[1]) / lb * rb];
        d += (i ? 'L' : 'M') + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + 'Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
      }
      return d + 'Z';
    };
    const draw = () => {
      const w = kv.clientWidth, h = kv.clientHeight;
      if (!w || !h) return;
      const fold = Math.min(136, Math.max(40, window.innerWidth * 0.07));   // --fold-depth: clamp(40px, 7vw, 136px)과 같은 값
      const R = parseFloat(getComputedStyle(kv).borderTopLeftRadius) || 24;
      const pts = [[0, 0], [w, 0], [w, h - fold], [w / 2, h], [0, h - fold]];
      kv.style.clipPath = `path("${round(pts, [R, R, R, R * 2, R])}")`;
      kv.style.borderRadius = '0';
    };
    draw();
    new ResizeObserver(draw).observe(kv);
    window.addEventListener('resize', draw);
  }

  /* ── 연령 원(9p ④) — 눈금 6개(6~11세). 주황 점이 0.9초마다 한 칸씩 가고, 지나온 호는 진하게 차오르며
     가운데 숫자가 6 → 11로 오른 뒤 처음으로. 화면에 보일 때만 돕니다. 동작 감소면 「6–11」 정지 ── */
  const age = document.querySelector('.bp-age');
  if (age) {
    const NS = 'http://www.w3.org/2000/svg', C = 100, RR = 92, LEN = 2 * Math.PI * RR;
    const ticks = document.getElementById('age-ticks'), arc = document.getElementById('age-arc');
    const dot = document.getElementById('age-dot'), num = document.getElementById('age-n');
    const at = (k) => { const a = (-90 + k * 60) * Math.PI / 180; return [C + RR * Math.cos(a), C + RR * Math.sin(a)]; };
    for (let k = 0; k < 6; k++) { const [x, y] = at(k); const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', '3.5'); ticks.appendChild(c); }
    const show = (k) => {
      const [x, y] = at(k);
      dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
      arc.style.strokeDasharray = (LEN * k / 6).toFixed(1) + ' ' + LEN.toFixed(1);
      num.innerHTML = String(6 + k);
    };
    const still = () => { const [x, y] = at(5); dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1)); arc.style.strokeDasharray = (LEN * 5 / 6).toFixed(1) + ' ' + LEN.toFixed(1); num.innerHTML = '6<em>–</em>11'; };
    let k = 0, timer = null;
    const run = () => { show(k); k = (k + 1) % 6; };
    const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    still();
    new IntersectionObserver((e) => {
      if (reduceMQ.matches) { still(); return; }
      if (e[0].isIntersecting && !timer) { k = 0; run(); timer = setInterval(run, 900); }
      else if (!e[0].isIntersecting && timer) { clearInterval(timer); timer = null; still(); }
    }, { threshold: 0.3 }).observe(age);
  }

  const settle = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener('load', settle, { once: true });
})();
