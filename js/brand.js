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
    document.querySelectorAll('.bp-head, .bp-kv, .bp-intro, .bp-prime, .bp-diff, .bp-space, .bp-end').forEach((box) => reveal(box, ctx.conditions.reduce));
  });
  const settle = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener('load', settle, { once: true });
})();
