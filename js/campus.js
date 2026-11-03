/* ─────────────────────────────────────────────────────────────
   campus.js — 브랜드 > 캠퍼스 안내 (기획서 11 · 12p)
   1) 아치 카드: 스크롤 등장 때 아치 사진이 아래에서 올라오고, 동그란 아이콘이 위에서 떨어져 정점에
      착지하며 눌렸다 펴진 뒤 선 아이콘이 그려집니다. 평소엔 2px 숨 쉬고, 카드 호버면 곡면을 따라
      살짝 굴렀다 돌아옵니다. 동작 감소면 모두 정지 상태.
   2) 커버플로우(elan Campus Introduction): 탭(입구 · 강의실 · 라운지) → 가운데 큰 사진 양옆으로 이전 ·
      다음이 작게 비침, 화살표 · 드래그 · 키보드, 4.5초 자동 넘김(호버 · 포커스 · 화면 밖이면 멈춤).
   섹션 글의 등장(data-step)은 brand.js의 reveal()이 맡습니다.
   ───────────────────────────────────────────────────────────── */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ── 1) 아치 카드 ── */
  const arches = document.querySelectorAll('.cp-arch');
  arches.forEach((card, i) => {
    const pic = card.querySelector('.cp-arch__pic'), orb = card.querySelector('.cp-arch__orb'), ic = card.querySelector('.cp-arch__ic');
    if (!hasGsap || reduce) { pic.style.clipPath = 'none'; ic.style.strokeDashoffset = 0; return; }
    gsap.set(pic, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(orb, { y: -140, opacity: 0 });
    let breathe = null;
    const tl = gsap.timeline({ paused: true, delay: i * 0.12 });
    tl.to(pic, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.out' })
      .to(orb, { opacity: 1, duration: 0.15 }, 0.3)
      .to(orb, { y: 0, duration: 0.5, ease: 'power2.in' }, 0.3)                            // 떨어짐
      .to(orb, { scaleY: 0.84, scaleX: 1.12, duration: 0.1, ease: 'power1.out', transformOrigin: '50% 100%' })   // 착지 — 눌림
      .to(orb, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })      // 펴짐
      .to(ic, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' }, '-=0.55')         // 선 아이콘 그리기
      .call(() => { breathe = gsap.to(orb, { y: -3, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }); });
    ScrollTrigger.create({ trigger: card, start: 'top 80%', once: true, onEnter: () => tl.play() });
    if (fine) {
      // 호버 — 아치 곡면을 따라 살짝 굴렀다 돌아옴(rotation · x만 — y는 숨쉬기가 씀)
      card.addEventListener('pointerenter', () => {
        if (tl.progress() < 1) return;
        gsap.timeline().to(orb, { rotation: 10, x: 6, duration: 0.28, ease: 'sine.inOut' }).to(orb, { rotation: -6, x: -4, duration: 0.3, ease: 'sine.inOut' }).to(orb, { rotation: 0, x: 0, duration: 0.4, ease: 'elastic.out(1, 0.6)' });
      });
    }
  });

  /* ── 2) 커버플로우 ── */
  const flow = document.querySelector('.cp-flow');
  if (!flow) return;
  const SETS = JSON.parse(flow.dataset.sets);
  const track = flow.querySelector('.cp-flow__track');
  const cap = { set: flow.querySelector('.cp-flow__cap-set'), cur: flow.querySelector('.cp-flow__cap-cur'), total: flow.querySelector('.cp-flow__cap-total') };
  const tabs = [...document.querySelectorAll('.cp-tabs [role="tab"]')];
  let set = 'entrance', cur = 0, slides = [], timer = null, onScreen = false, paused = false;
  const N = () => SETS[set].n;

  const place = () => {
    const W = flow.querySelector('.cp-flow__stage').clientWidth;
    const wc = parseFloat(getComputedStyle(flow).getPropertyValue('--wc')) / 100 * W;
    const s = parseFloat(getComputedStyle(flow).getPropertyValue('--side')) || 0.72;
    const x1 = W / 2 - (wc * s) / 2;                         // 옆 사진의 바깥 가장자리가 판 가장자리에 닿게
    slides.forEach((li, i) => {
      let d = i - cur; const n = slides.length;
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;         // 순환 — 가장 가까운 방향
      const a = Math.abs(d);
      const x = a === 0 ? 0 : Math.sign(d) * (a === 1 ? x1 : x1 + wc * 0.25);
      li.style.setProperty('--x', x.toFixed(1) + 'px');
      li.style.setProperty('--s', a === 0 ? 1 : a === 1 ? s : s * 0.8);
      li.style.setProperty('--o', a <= 1 ? 1 : 0);
      li.style.setProperty('--z', a === 0 ? 3 : a === 1 ? 2 : 1);
      li.classList.toggle('is-active', a === 0);
      li.setAttribute('aria-hidden', a === 0 ? 'false' : 'true');
    });
    cap.set.textContent = SETS[set].label; cap.cur.textContent = cur + 1; cap.total.textContent = N();
  };

  const build = () => {
    flow.classList.add('no-anim');
    track.innerHTML = ''; slides = [];
    for (let i = 0; i < N(); i++) {
      const li = document.createElement('li'); li.className = 'cp-flow__slide';
      const img = document.createElement('img');
      img.src = `/img/campus/${set}-${String(i + 1).padStart(2, '0')}.webp`; img.alt = `${SETS[set].label} 사진 ${i + 1}`;
      img.loading = i < 3 ? 'eager' : 'lazy'; img.draggable = false;
      li.appendChild(img); li.addEventListener('click', () => { if (!li.classList.contains('is-active') && !dragged) go(i); });
      track.appendChild(li); slides.push(li);
    }
    cur = 0; place();
    track.getBoundingClientRect();                               // 전환 없이 자리 잡은 뒤 다시 켬
    requestAnimationFrame(() => flow.classList.remove('no-anim'));
  };
  const go = (i) => { cur = ((i % N()) + N()) % N(); place(); restart(); };
  const next = () => go(cur + 1), prev = () => go(cur - 1);

  // 자동 넘김 — 화면에 보이고 멈춤 조건이 없을 때만
  const stop = () => { clearInterval(timer); timer = null; };
  const restart = () => { stop(); if (!reduce && onScreen && !paused) timer = setInterval(next, 4500); };
  new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; restart(); }, { threshold: 0.3 }).observe(flow);
  flow.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { paused = true; stop(); } });
  flow.addEventListener('pointerleave', () => { paused = false; restart(); });
  flow.addEventListener('focusin', () => { paused = true; stop(); });
  flow.addEventListener('focusout', (e) => { if (!flow.contains(e.relatedTarget)) { paused = false; restart(); } });

  flow.querySelector('.cp-flow__btn--prev').addEventListener('click', prev);
  flow.querySelector('.cp-flow__btn--next').addEventListener('click', next);
  flow.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });

  // 드래그 · 스와이프
  let x0 = null, dragged = false;
  track.addEventListener('pointerdown', (e) => { x0 = e.clientX; dragged = false; flow.classList.add('is-dragging'); });
  window.addEventListener('pointermove', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) dragged = true; });
  window.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null; flow.classList.remove('is-dragging');
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    setTimeout(() => { dragged = false; }, 0);
  });

  // 탭 — 묶음 전환(첫 장으로), 좌우 키로 탭 이동
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true); if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length, true); });
  });
  const select = (i, focus) => {
    tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', on); t.classList.toggle('btn2--fill', on); t.classList.toggle('btn2--line', !on); t.tabIndex = on ? 0 : -1; });
    set = tabs[i].dataset.set; build(); restart();
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, k) => { t.tabIndex = k === 0 ? 0 : -1; });

  build();
  window.addEventListener('resize', place);
})();
