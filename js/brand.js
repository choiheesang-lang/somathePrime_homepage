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
  const settle = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener('load', settle, { once: true });
})();
