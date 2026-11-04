/* ─────────────────────────────────────────────────────────────
   location.js — 브랜드 > 오시는 길 (기획서 13p)
   지도가 화면에 들어오면 핀이 위에서 떨어져 꽂히고(살짝 눌렸다 튐) 말풍선이 튀어나옵니다.
   동작 줄이기면 처음부터 놓인 상태. 섹션 글의 등장(data-step)은 brand.js의 reveal().
   ───────────────────────────────────────────────────────────── */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = document.querySelector('.lc-map');
  if (!map || reduce || !window.gsap || !window.ScrollTrigger) return;
  const pin = map.querySelector('.lc-pin');
  const label = map.querySelector('.lc-label');
  if (!pin || !label) return;

  gsap.set(pin, { y: -80, opacity: 0, transformOrigin: '50% 100%' });
  gsap.set(label, { scale: 0.6, opacity: 0, transformOrigin: '50% 100%' });
  const tl = gsap.timeline({ paused: true })
    .to(pin, { opacity: 1, duration: 0.1 })
    .to(pin, { y: 0, duration: 0.5, ease: 'power2.in' }, 0)                        // 떨어짐
    .to(pin, { scaleY: 0.88, scaleX: 1.08, duration: 0.08 })                      // 꽂히며 눌림
    .to(pin, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    .to(label, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.4');
  ScrollTrigger.create({ trigger: map, start: 'top 75%', once: true, onEnter: () => tl.play() });
})();
