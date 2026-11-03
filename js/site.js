/* ─────────────────────────────────────────────────────────────
   site.js — 모든 페이지 공통: 전체 메뉴(모바일) · GNB 숨김 · 퀵메뉴 TOP
   ───────────────────────────────────────────────────────────── */
(function () {
  const header = document.getElementById('site-header');

  /* 전체 메뉴 — 열면 첫 링크로, 닫으면 햄버거로 포커스를 돌려 놓습니다 */
  const mnav = document.getElementById('mnav');
  const openBtn = document.getElementById('mnav-open');
  const closeBtn = document.getElementById('mnav-close');
  const setMenu = (open) => {
    if (!mnav) return;
    mnav.hidden = !open;
    document.body.classList.toggle('mnav-open', open);
    openBtn && openBtn.setAttribute('aria-expanded', String(open));
    if (open) { const f = mnav.querySelector('.mnav__top'); f && f.focus(); }
    else openBtn && openBtn.focus();
  };
  openBtn && openBtn.addEventListener('click', () => setMenu(true));
  closeBtn && closeBtn.addEventListener('click', () => setMenu(false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mnav && !mnav.hidden) setMenu(false); });
  // 같은 페이지 안의 앵커(소식 > 공지사항 등)로 가면 메뉴를 닫습니다
  mnav && mnav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  /* 내리면 GNB를 숨기고 올리면 다시 — 랜딩과 같은 규칙(6px 이하 흔들림은 무시).
     인트로가 화면을 덮고 있는 동안에는 건드리지 않습니다. */
  let lastY = window.scrollY;
  const DEAD = 6;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!header || document.body.classList.contains('intro-on')) { lastY = y; return; }
    if (y < 120) header.classList.remove('is-hidden');
    else if (y - lastY > DEAD) header.classList.add('is-hidden');
    else if (lastY - y > DEAD) header.classList.remove('is-hidden');
    if (Math.abs(y - lastY) > DEAD) lastY = y;
  }, { passive: true });
  header && header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* 투명 GNB(.gnb2--main, 메인)는 사진 칸을 지나면 흰색(.is-solid)이 됩니다 — 꺾임 위 가장자리(아래 끝 − --fold-depth)가
     헤더 아래선에 닿는 순간부터. 되돌아오면 다시 투명. 기준 요소가 없으면 80px. */
  if (header && header.classList.contains('gnb2--main')) {
    const after = document.querySelector('[data-gnb-solid-after]');
    const px = (n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
    const solid = () => {
      if (!after) return window.scrollY > 80;
      const r = after.getBoundingClientRect();
      return r.bottom - px('--fold-depth') <= px('--header-h');
    };
    const mark = () => header.classList.toggle('is-solid', solid());
    window.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('resize', mark);
    mark();
  }

  /* 유틸 바 드롭다운(홍길동 · 교육기관) — 누르면 열고, 바깥을 누르거나 Esc면 닫습니다.
     키보드로 안에서 빠져나가도 닫힙니다. */
  const dds = [...document.querySelectorAll('.gnb2__dd')];
  const setDD = (dd, open) => {
    dd.classList.toggle('is-open', open);
    dd.querySelector('.gnb2__dd-btn').setAttribute('aria-expanded', String(open));
  };
  dds.forEach((dd) => {
    dd.querySelector('.gnb2__dd-btn').addEventListener('click', () => {
      const open = !dd.classList.contains('is-open');
      dds.forEach((o) => setDD(o, false));
      setDD(dd, open);
    });
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) setDD(dd, false); });
  });
  document.addEventListener('click', (e) => { dds.forEach((dd) => { if (!dd.contains(e.target)) setDD(dd, false); }); });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = dds.find((dd) => dd.classList.contains('is-open'));
    if (open) { setDD(open, false); open.querySelector('.gnb2__dd-btn').focus(); }
  });

  const top = document.getElementById('quick-top');
  top && top.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
