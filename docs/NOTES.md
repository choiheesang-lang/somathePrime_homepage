# 구현 노트

## 1단계 — 공통 틀 + 홈 (2026-10-27)

### 기획서에서 읽은 홈의 순서

기획서 3p는 「모션 종료 후 기존 메인 페이지로 연결 > 5p」라 메인 비주얼(4p)의 자리가 두 가지로 읽혔고, 확인 결과 **인트로 → 메인 비주얼 → 5p → 6p → 7p → 오시는 길**입니다. 인트로는 페이지의 한 섹션이 아니라 화면을 덮는 오프닝입니다.

### 랜딩에서 그대로 가져온 것

| 무엇 | 어디서 | 바꾼 것 |
|---|---|---|
| 인트로(슬라임이 모여 로고가 되는 모션) | `js/hero.js`, `css/hero.css`, 스테이지 마크업 | `autoplay(speed)` 추가 — START를 기다리지 않고 1.6배속. 커서 디스크·고정 컨트롤은 CSS로 감추고 건너뛰기 버튼 하나 |
| 장면 10(Insight · Impact · Growth 카드) | `sections.css`, `scroll.js`의 카드·마퀴 코드 | 슬로건을 「배움의 영역을 넓히고 / 성장의 깊이를 더하다.」로. sticky 해제(장면 11이 없으므로) |
| 장면 12(더 넓-어-진 소마를 경험할 차례) | 같은 곳 | 배경을 새 인테리어 시안(플레이팩토 · 마이온 · 리딩오션 교실)으로, 관심고객 등록 버튼 추가 |
| 관심고객 등록 팝업 | `lead.js`, 마크업 | 여는 문을 `data-lead-open` 위임으로(퀵메뉴 · 메인 비주얼 · 배너 · 장면 12) |
| 로고 스프라이트 · 토큰 · 푸터 | | 푸터에 주소 줄 |

### 인트로가 오버레이가 된 방식

랜딩에서 스테이지는 `main` 뒤(z 0)의 고정 판이고 `#s-spacer`가 그걸 들여다보는 창이었습니다. 홈에서는 `body.intro-on` 동안만 GNB 바로 아래(z 40)로 올라와 화면을 덮고, 끝나면 0.9초 페이드 후 `visibility: hidden` + `hero.setActive(false)`로 전면 블러 네 겹을 멈춥니다. 같은 탭에서는 한 번만(sessionStorage). `intro-on`은 첫 페인트 전에 인라인 스크립트가 붙여 메인이 한 프레임 비치는 깜박임을 막습니다.

### 조립 방식

페이지가 여러 개가 되면서 GNB · 푸터 · 팝업 · 스프라이트(48KB)를 페이지마다 복사할 수 없어 `tools/build.py`가 `src/`에서 조립합니다. 결과물도 커밋해 배포는 정적 파일 그대로입니다.

### 사진

인테리어 시안 35장(4K, 장당 3~4 MB) 중 표지와 가로 파노라마 2장을 빼고 34장을 `cwebp -q 78 -resize 2560`으로 변환 — 합계 약 3 MB. 썸네일(480)은 2단계 갤러리용.

| 묶음 | 장수 | 비고 |
|---|---|---|
| entrance | 9 | 입구 · 복도 · 엘리베이터 홀 |
| class | 12 | 01–04 소마(분홍) · 05–08 플레이팩토(노랑·보라) · 09 마이온 · 10 리딩오션 · 11–12 컴퓨터실 |
| lounge | 11 | 라운지 · 독서 공간 · 안내 데스크 |

## 피그마로 옮기기 + 디자인 시스템 (2026-10-28)

피그마 `soma_thePrime_web` 페이지의 web 섹션(18113:6445) 안에 코드 홈을 옮기고 파운데이션·컴포넌트를 정의했습니다.

| 무엇 | 어디 | 내용 |
|---|---|---|
| 홈 | `main` 18113:6447 | GNB/login → 상단 배너 → 메인 비주얼 → 장면 10 → 교육 프로그램 → 장면 12 → 오시는 길 → footer/web, 오른쪽 퀵메뉴 |
| 인트로 | `intro · 오프닝` 18127:7197 | 오프닝은 페이지 위에 덮이므로 main 옆에 따로 |
| 컴포넌트 | `Components` 18122:6351 | Icon 16 · Button/Solid · Button/Line(크기 4 × 상태 4) · Input · Select · Checkbox · Logo 4 · Section head · Program card · Top banner · Carousel control · Quick menu · Visit card · footer/web |
| 파운데이션 | `Foundations` 18128:7618 | Typography · Text 색 · Spacing · Radius · Shadow 견본 |

- 텍스트 스타일: 쓰이지 않던 54개(Pretendard JP)를 지우고 **Brand 12 + System 18**. 폰트는 `Typography` 컬렉션의 `font/brand` · `font/system` 변수에 바인딩
- **세방고딕은 피그마 자동화 환경에서 불러올 수 없어**(로컬 글꼴이 보이지 않음) `font/brand` 값을 임시로 Noto Sans KR로 두었습니다. 데스크톱 앱에서 이 변수 값만 `SEBANG Gothic OTF`로 바꾸면 Brand 스타일 전체가 바뀝니다
- Text 색 8개(`Semantic/Text/*`, Stone Gray alias) · Spacing(8의 배수, layout 1240 = 1160 + gutter 40) · Radius(4의 배수 ~ pill) · Shadow sm/md/lg. 쓰이지 않던 `shape` 컬렉션과 그림자 3개는 삭제, 티저가 쓰는 `Shadow/Normal`은 유지
- 표 · 페이지네이션 · 통합검색은 사이트에 없어 만들지 않음
- 코드에 남은 일: GNB를 `GNB/login` 구성으로, 레이아웃 1240/40, CSS 토큰 이름을 피그마와 맞추기
