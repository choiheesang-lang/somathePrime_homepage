/* ─────────────────────────────────────────────────────────────
   location.js — 브랜드 > 오시는 길 (기획서 13p)
   지도 핀이 위에서 떨어져 꽂히고 라벨이 튀어나오며, 핀 아래로 파동이 번집니다(화면에 보일 때만).
   「복사」 버튼은 주소를 클립보드에 넣습니다. 섹션 글의 등장(data-step)은 brand.js의 reveal().
   ───────────────────────────────────────────────────────────── */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = document.querySelector('.lc-map');

  // 주소 복사
  document.querySelectorAll('.lc-copy').forEach((b) => {
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { return; }
      b.textContent = '복사됨'; b.classList.add('is-done');
      setTimeout(() => { b.textContent = '복사'; b.classList.remove('is-done'); }, 1600);
    });
  });

  if (!map || !window.gsap || !window.ScrollTrigger) return;
  const svg = map.querySelector('svg');
  const groups = svg.querySelectorAll('g[transform^="translate(300"]');     // map.html: [0] 핀, [1] 라벨
  const pin = groups[0], label = groups[1];
  if (!pin || !label) return;
  // 파동 — 핀 발치에 원 두 개(SVG 좌표계, 핀 꼭지 300,162)
  const NS = 'http://www.w3.org/2000/svg';
  const rings = [0, 1].map(() => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', '300'); c.setAttribute('cy', '162'); c.setAttribute('r', '6'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#323333'); c.setAttribute('stroke-width', '1.5'); c.setAttribute('opacity', '0'); svg.insertBefore(c, pin); return c; });
  if (reduce) return;

  // SVG 그룹의 translate(300 128)을 GSAP이 x · y로 읽으므로, 그 기준값에서 떨어뜨립니다(0으로 보내면 128만큼 위에 멈춤)
  const base = (pin.getAttribute('transform').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/) || [0, 300, 128]).slice(1).map(Number);
  gsap.set(pin, { x: base[0], y: base[1] - 80, opacity: 0, transformOrigin: '50% 100%' });
  gsap.set(label, { scale: 0.6, opacity: 0, transformOrigin: '50% 100%' });
  let pulse = null;
  const tl = gsap.timeline({ paused: true })
    .to(pin, { opacity: 1, duration: 0.1 })
    .to(pin, { y: base[1], duration: 0.5, ease: 'power2.in' }, 0)                      // 떨어짐
    .to(pin, { scaleY: 0.88, scaleX: 1.08, duration: 0.08 })                      // 꽂히며 눌림
    .to(pin, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    .to(label, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.4')
    .call(() => {
      pulse = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      rings.forEach((r, i) => pulse.fromTo(r, { attr: { r: 6 }, opacity: 0.5 }, { attr: { r: 34 }, opacity: 0, duration: 1.6, ease: 'power1.out' }, i * 0.5));
    });
  ScrollTrigger.create({ trigger: map, start: 'top 75%', once: true, onEnter: () => tl.play() });
  new IntersectionObserver((e) => { if (!pulse) return; e[0].isIntersecting ? pulse.play() : pulse.pause(); }, { threshold: 0.2 }).observe(map);
})();
