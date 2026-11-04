// 세방고딕 되돌리기 — 피그마 데스크톱 앱에서 개발용 플러그인으로 한 번 실행합니다.
//
// 왜: 피그마 MCP(Claude가 쓰는 연결)는 피그마 서버 글꼴만 보여서 세방고딕을 불러오지 못합니다(2026-11-04).
//     그래서 모바일 메인 작업의 세방 글자를 Noto Sans KR로 임시 제작하고 레이어 이름 앞에
//     `[세방 Bold]` · `[세방 Regular]` 표시를 붙였습니다. 데스크톱 앱 안의 플러그인은 맥에 설치된
//     세방고딕을 쓸 수 있으므로, 이 플러그인이 표시된 텍스트를 세방으로 되돌립니다.
//
// 하는 일 (파일의 모든 페이지):
//   1. 이름이 `[세방 …]`으로 시작하는 텍스트에서 Noto Sans KR 부분을 세방고딕으로(Bold→Bold, 그 외→Regular)
//   2. 컴포넌트 · 일반 레이어(인스턴스 안이 아닌 것)는 크기 · 굵기가 같은 Brand/* 텍스트 스타일을 붙임
//   3. 이름 앞의 `[세방 …]` 표시를 지움
// 세방이 없으면 아무것도 바꾸지 않고 알려 줍니다.

const FAMILY = 'SEBANG Gothic OTF';
const TAG = /^\[세방[^\]]*\]\s*/;

async function run() {
  try {
    await figma.loadFontAsync({ family: FAMILY, style: 'Bold' });
    await figma.loadFontAsync({ family: FAMILY, style: 'Regular' });
  } catch (e) {
    return '세방고딕(SEBANG Gothic OTF)을 찾지 못했습니다. 맥에 설치된 상태에서 피그마 데스크톱 앱으로 실행해 주세요. 아무것도 바꾸지 않았습니다.';
  }
  for (const style of ['Regular', 'Medium', 'Bold', 'Light']) {
    try { await figma.loadFontAsync({ family: 'Noto Sans KR', style }); } catch (e) { /* 없는 굵기는 건너뜀 */ }
  }
  const brand = (await figma.getLocalTextStylesAsync()).filter((s) => s.name.startsWith('Brand/'));

  let swapped = 0, styled = 0, failed = 0;
  for (const page of figma.root.children) {
    await page.loadAsync();
    const texts = page.findAllWithCriteria({ types: ['TEXT'] }).filter((t) => TAG.test(t.name));
    for (const t of texts) {
      try {
        for (const seg of t.getStyledTextSegments(['fontName'])) {
          if (seg.fontName.family !== 'Noto Sans KR') continue;
          t.setRangeFontName(seg.start, seg.end, { family: FAMILY, style: seg.fontName.style === 'Bold' ? 'Bold' : 'Regular' });
        }
        swapped++;
        let p = t.parent, inInstance = false;
        while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') { inInstance = true; break; } p = p.parent; }
        if (!inInstance && t.fontName !== figma.mixed && t.fontSize !== figma.mixed) {
          const st = brand.find((s) => s.fontSize === t.fontSize && s.fontName.style === t.fontName.style);
          if (st) { await t.setTextStyleIdAsync(st.id); styled++; }
        }
        t.name = t.name.replace(TAG, '');
      } catch (e) {
        failed++;
      }
    }
  }
  return `세방고딕으로 ${swapped}개 되돌림 · Brand 스타일 ${styled}개 적용` + (failed ? ` · 실패 ${failed}개(이름의 [세방] 표시 남음)` : '');
}

run().then((msg) => figma.closePlugin(msg)).catch((e) => figma.closePlugin('오류: ' + (e && e.message ? e.message : e)));
