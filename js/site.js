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

  const top = document.getElementById('quick-top');
  top && top.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
