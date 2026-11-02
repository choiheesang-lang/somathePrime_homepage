/* ─────────────────────────────────────────────────────────────
   program.js — 교육 프로그램 (기획서 14 · 15p)
   1) 머리 앵커 탭 스크롤 스파이(네 개의 프로그램 · 관찰평가 시스템).
   2) 가로 아코디언: 호버 · 클릭 · 키보드로 활성, 4.5초 자동 순환(홈 쿼드 판과 같은 리듬 — 화면 밖 · 호버 중 멈춤),
      성장 트랙의 행과 동기화.
   3) 관찰평가: 스크롤 등장 때 BEFORE 점수 막대가 차오르고(0 → 72), AFTER 레이더가 축 → 격자 → 다각형 순서로 펼쳐지며
      꼭짓점이 튐. BEFORE/AFTER 토글이면 같은 다각형이 「점수 하나(한 축만 남은 가시)」와 「다섯 면」 사이를 변형.
   섹션 글의 등장(data-step)은 brand.js의 reveal(). 동작 감소면 전환 즉시 · 자동 없음 · 완성 상태.
   ───────────────────────────────────────────────────────────── */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ── 1) 앵커 탭 스파이 ── */
  const tabs = [...document.querySelectorAll('.bp-tabs a[href^="#"]')];
  if (tabs.length) {
    const secs = tabs.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const mark = () => {
      const y = window.scrollY + window.innerHeight * 0.4;
      let cur = -1; secs.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
      tabs.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    };
    window.addEventListener('scroll', mark, { passive: true }); window.addEventListener('resize', mark); mark();
    tabs.forEach((a) => a.addEventListener('click', (e) => {
      const t = document.querySelector(a.getAttribute('href')); if (!t) return;
      e.preventDefault(); const head = document.querySelector('.bp-head'); const off = (head ? head.offsetHeight : 0) + 76;
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
    }));
  }

  /* ── 2) 아코디언 + 트랙 ── */
  const acc = document.querySelector('.pg-acc');
  if (acc) {
    const panels = [...acc.querySelectorAll('.pg-panel')], rows = [...document.querySelectorAll('.pg-track__row')];
    let cur = 0, timer = null, onScreen = false, hovering = false;
    const show = (i) => {
      cur = (i + panels.length) % panels.length;
      panels.forEach((p, k) => { const on = k === cur; p.classList.toggle('is-on', on); p.setAttribute('aria-selected', on); p.tabIndex = on ? 0 : -1; });
      rows.forEach((r, k) => r.classList.toggle('is-on', k === cur));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const restart = () => { stop(); if (!reduce && onScreen && !hovering) timer = setInterval(() => show(cur + 1), 4500); };
    panels.forEach((p, i) => {
      p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; hovering = true; stop(); show(i); });
      p.addEventListener('click', (e) => { if (e.target.closest('a')) return; show(i); restart(); });
      p.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1); panels[cur].focus(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1); panels[cur].focus(); }
      });
    });
    acc.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; hovering = false; restart(); });
    rows.forEach((r, i) => r.addEventListener('click', () => { show(i); restart(); }));
    new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; restart(); }, { threshold: 0.3 }).observe(acc);
    show(0);
  }

  /* ── 3) 관찰평가 — 점수 막대 · 레이더 · 토글 ── */
  const radar = document.querySelector('.pg-radar');
  if (radar) {
    const NS = 'http://www.w3.org/2000/svg', CX = 170, CY = 160, R = 118;
    const vals = radar.dataset.values.split(',').map(Number), labels = radar.dataset.labels.split(',');
    const n = vals.length, ang = (i) => (-90 + i * 360 / n) * Math.PI / 180;
    const pt = (i, r) => [CX + Math.cos(ang(i)) * r, CY + Math.sin(ang(i)) * r];
    const pts = (scale, only) => vals.map((v, i) => pt(i, R * (only === undefined ? v * scale : (i === only ? v * scale : 0.04)))).map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ');
    const g = (sel) => radar.querySelector(sel);
    const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };
    // 격자 3겹 · 축 5개 · 꼭짓점 · 라벨
    [0.33, 0.66, 1].forEach((s) => mk('polygon', { points: vals.map((_, i) => pt(i, R * s).map((x) => x.toFixed(1)).join(',')).join(' ') }, g('.pg-radar__grid')));
    vals.forEach((_, i) => { const [x, y] = pt(i, R); mk('line', { x1: CX, y1: CY, x2: x.toFixed(1), y2: y.toFixed(1) }, g('.pg-radar__axes')); });
    const dots = vals.map((v, i) => { const [x, y] = pt(i, R * v); return mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 4.5 }, g('.pg-radar__dots')); });
    labels.forEach((t, i) => { const [x, y] = pt(i, R + 24); const el = mk('text', { x: x.toFixed(1), y: y.toFixed(1) }, g('.pg-radar__labels')); el.textContent = t; });
    const shape = g('.pg-radar__shape');
    const fill = document.querySelector('.pg-score__fill'), num = document.querySelector('.pg-score__n');
    const stage = document.querySelector('.pg-stage'), modeBtns = [...document.querySelectorAll('.pg-mode__btn')];
    const dotsTo = (only) => dots.forEach((d, i) => { const r = R * (only === undefined ? vals[i] : (i === only ? vals[i] : 0.04)); const [x, y] = pt(i, r); if (hasGsap && !reduce) gsap.to(d, { attr: { cx: x, cy: y }, duration: 0.6, ease: 'power3.out' }); else { d.setAttribute('cx', x); d.setAttribute('cy', y); } });

    const finish = () => { shape.setAttribute('points', pts(1)); fill.style.width = '72%'; num.textContent = '72'; };
    if (!hasGsap || reduce) finish();
    else {
      shape.setAttribute('points', pts(0)); dots.forEach((d) => d.setAttribute('r', 0));
      gsap.set([g('.pg-radar__grid'), g('.pg-radar__axes'), g('.pg-radar__labels')], { opacity: 0 });
      const counter = { v: 0 };
      const tl = gsap.timeline({ paused: true })
        .to(fill, { width: '72%', duration: 0.9, ease: 'power3.out' })
        .to(counter, { v: 72, duration: 0.9, ease: 'power3.out', onUpdate: () => { num.textContent = Math.round(counter.v); } }, 0)
        .fromTo('.pg-arrow svg', { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.15 }, 0.5)
        .to(g('.pg-radar__axes'), { opacity: 1, duration: 0.4 }, 0.7)
        .to(g('.pg-radar__grid'), { opacity: 1, duration: 0.5 }, 0.9)
        .to(shape, { attr: { points: pts(1) }, duration: 0.9, ease: 'back.out(1.4)' }, 1.0)
        .to(dots, { attr: { r: 4.5 }, duration: 0.35, ease: 'back.out(3)', stagger: 0.07 }, 1.4)
        .to(g('.pg-radar__labels'), { opacity: 1, duration: 0.4 }, 1.5);
      ScrollTrigger.create({ trigger: stage, start: 'top 72%', once: true, onEnter: () => tl.play() });
    }
    // 토글 — BEFORE: 한 축(행동)만 남긴 가시 · 막대 강조 / AFTER: 다섯 면
    modeBtns.forEach((b) => b.addEventListener('click', () => {
      const before = b.dataset.mode === 'before';
      modeBtns.forEach((x) => { const on = x === b; x.setAttribute('aria-pressed', on); x.classList.toggle('btn2--fill', on); x.classList.toggle('btn2--ghost', !on); });
      stage.classList.toggle('is-before', before); stage.classList.toggle('is-after', !before);
      const target = before ? pts(1, 0) : pts(1);
      if (hasGsap && !reduce) gsap.to(shape, { attr: { points: target }, duration: 0.7, ease: before ? 'power3.inOut' : 'back.out(1.4)' }); else shape.setAttribute('points', target);
      dotsTo(before ? 0 : undefined);
    }));
  }
})();
