/* ─────────────────────────────────────────────────────────────
   lead.js — 관심고객 등록 팝업 (23차 · 피그마 17956:6855)
   여는 문·닫는 문·포커스 처리는 「전경 더보기」 모달(js/open.js)과 같은 방식입니다.
   등록 자체는 시각 전용이라 보내는 코드가 없습니다 — 버튼도 <span aria-disabled>입니다.
   ───────────────────────────────────────────────────────────── */
window.STP = window.STP || {};

STP.lead = (function () {
  let modal, card, opener, lastFocus = null;

  const isOpen = () => !!modal && !modal.hidden;

  function open() {
    if (!modal || !modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('lead-open');
    // 첫 입력이 아니라 닫기 버튼에 포커스를 둡니다 — 모바일에서 첫 입력을 잡으면
    // 키보드가 즉시 올라와 팝업의 절반을 덮습니다(전경 더보기 모달과 같은 판단).
    const close = modal.querySelector('.lead__close');
    close && close.focus();
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('lead-open');
    const back = (lastFocus && lastFocus !== document.body) ? lastFocus : opener;
    if (back && back.focus) back.focus();
  }

  /* 열려 있는 동안 Tab이 팝업 밖으로 못 나가게 — open.js의 trap()과 같은 구현 */
  function trap(e) {
    if (e.key !== 'Tab' || !isOpen()) return;
    const f = card.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.prototype.filter.call(f, (el) => !el.disabled && el.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function init() {
    modal = document.getElementById('lead');
    if (!modal) return;
    card = modal.querySelector('.lead__card');
    /* 홈페이지: 여는 문이 여러 개입니다(퀵메뉴 · 메인 비주얼 · 장면 12 · 하단 CTA).
       `data-lead-open`이 붙은 것은 모두 엽니다 — 문서에서 한 번만 위임해 둡니다. */
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lead-open]');
      if (!b) return;
      e.preventDefault();
      opener = b;
      open();
    });
    modal.querySelectorAll('[data-lead-close]').forEach((b) => b.addEventListener('click', close));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
      else trap(e);
    });

    /* 약관 펼치기. 23.2차부터 문구와 화살표가 한 버튼이라 어느 쪽을 눌러도 같습니다 —
       체크박스는 이 버튼 밖에 있으므로 동의는 따로 켜고 끕니다. */
    modal.querySelectorAll('.lead-a__toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const body = document.getElementById(btn.getAttribute('aria-controls'));
        if (!body) return;
        const openNow = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!openNow));
        body.hidden = openNow;
      });
    });

    /* 전화번호 칸은 숫자만, 네 자리가 차면 다음 칸으로. maxlength는 붙여넣기를 막지
       못하므로 값에서도 한 번 걸러 냅니다. */
    const tel = ['lead-tel1', 'lead-tel2'].map((id) => document.getElementById(id));
    tel.forEach((el, i) => {
      if (!el) return;
      el.addEventListener('input', () => {
        const clean = el.value.replace(/\D/g, '').slice(0, 4);
        if (clean !== el.value) el.value = clean;
        if (clean.length === 4 && tel[i + 1]) tel[i + 1].focus();
      });
    });
  }

  return { init, open, close, get isOpen() { return isOpen(); } };
})();

STP.lead.init();
