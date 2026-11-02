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

## CSS 토큰 = 피그마 토큰 (2026-10-28)

`css/tokens.css`의 변수 이름은 피그마 변수의 code syntax(WEB)와 같습니다.

| 피그마 | CSS | 예전 이름 |
|---|---|---|
| Semantic/Text/* | `--text-strong · normal · neutral · alternative · assistive · disable · inverse · accent` | `--ink` → normal, `--ink-2` → neutral, `--muted` → alternative, `--accent` → accent |
| Palette/Brand/Leaf | `--pal-brand-leaf` | `--accent` 값 |
| Typography font/brand · font/system | `--font-title` · `--font` | (같음) |
| 텍스트 스타일 Brand/* · System/* | `--fs-brand-*` · `--fs-system-*` · `--lh-*` | `--fs-body` · `--fs-tiny` · `--lh-body` |
| space/8 ~ 160 | `--space-8` ~ `--space-160` | `--space-4` → 40, `--space-5` → 64 |
| layout/max-width · content · gutter · header | `--layout-max` 1240 · `--layout-content` 1160 · `--gutter` 40/20 · `--header-h` 128/64 | `--max-w` 1200 |
| radius/0 ~ pill | `--r-0` ~ `--r-32` · `--r-pill` | `--r-sm/md/lg`, 모서리 10 → 8 |
| Shadow/sm · md · lg | `--shadow-sm · md · lg` | (같음) |

- `.wrap`은 `max-width: var(--layout-max)` + 좌우 `--gutter` → 콘텐츠 1160 (1440 화면에서 x 140).
- 모바일(≤768) gutter 20, content는 화면 폭 − 40 (피그마 375 기준 335).
- 15 · 17 · 22px 같은 단계 밖 크기는 숫자로 남겨 두었습니다.

## GNB = 피그마 GNB/login (2026-10-28)

- 위 28px 유틸 바(`--gnb-util-h`, 코드 전용) + 100px 메뉴 바 → `--header-h` 128. 피그마 `layout/header` Desktop도 128로 맞춤.
- 유틸 바: 홍길동 ▾(마이페이지 · 수강료 납부 · 로그아웃) · 교육기관 ▾(소마 더 프라임 목동) · 센터 바로가기 | 알림 3. **로그인 상태 견본** — 회원 연동 때 실제 값으로.
- 메뉴: 브랜드 · 교육 프로그램 · 소식 · 센터 찾기(`/center.html`, 연동 예정 페이지) · 선생님 · 마이페이지. 「수강료 납부」는 메뉴에서 빠지고 홍길동 메뉴 · 퀵메뉴 · 모바일 메뉴 아래 줄에 남음.
- 현재 메뉴는 주황 형광펜(#F08C32 50%, 글자 아래 12px). 다른 메뉴는 호버 때 그어짐.
- 피그마 유틸 바 왼쪽의 「수강료 결제 · 교재구매」는 투명도 0이라 옮기지 않음.
- 모바일(≤1024): 유틸 바 숨김, 전체 메뉴 위에 홍길동 · 기관 · 알림 줄.

## 레이아웃 1240 / 40 — 피그마와 코드 (2026-10-28)

- 코드: `.wrap` 등 내용 상자 = `max-width: var(--layout-max)` + 좌우 `padding: var(--gutter)` → 내용 1160. 1920·1440·1100 화면에서 GNB 로고 · 메인 비주얼 글 · 프로그램 카드 · 장면 12 바 · 오시는 길 · 푸터의 왼쪽 끝이 모두 같은 선(380 · 140 · 40).
- 피그마 `main`: 섹션 좌우 padding = `layout/gutter`, 내용 = FILL + max-width `layout/content`로 가운데(Visit · Program 카드 · 장면 12 바 · footer/web). GNB/login 두 줄은 폭을 `layout/content`에, 높이를 `layout/header`(128)에 묶음.
- `main` · `intro` 프레임에 레이아웃 그리드 두 개(1240 초록 · 1160 주황, 변수에 묶임) — 피그마에서 Ctrl+G(⌃G)로 켜고 끔.
- 메인 비주얼 왼쪽 패널의 380은 코드에서도 계산값(`(100vw − 1160) / 2`)이라 숫자로 둠.

## 인트로 — 마스크 대기 화면 + SKIP (2026-10-28)

- 자동 재생을 걷어냈습니다. 인트로는 랜딩의 START 대기 화면 그대로(`hero.arm()`): 슬라임 마스크가 커서를 따라다니고 START 디스크가 커서에 붙습니다. 저절로 넘어가지 않습니다.
- 마스크(스테이지)를 누르면 오프닝 재생(1.6배속, `hero.init({ speed })`) → 끝나면 홈. 재생 중 다시 누르면 빨리 감기.
- **SKIP**(아래 가운데, 높이 56 pill): 누르면 곧바로 홈. 세로 위치는 `placeSkip()`이 유리 카드와 아래 블롭(myON) 사이 틈 가운데로 잽니다 — 틈이 좁으면 블롭 아래, 그것도 안 되면 화면 맨 아래.
- 모바일: `hero.init({ touchMask: true })` — 손가락으로 마스크를 끌고, 떼도 그 자리에 남습니다. 탭하면 재생. 터치용 START 고정 디스크(`.hero-ctl`)는 오른쪽 아래.
- 랜딩이 `scroll.js`로 붙이던 `body.hero-on`을 홈은 인트로 동안 직접 붙입니다(커서 디스크가 이걸 봄). 인트로 동안 GNB 위에서는 OS 커서를 돌려줍니다.
- 동작 감소 설정이면 대기 화면 없이 곧바로 홈.
- 피그마 `intro · 오프닝 (마스크 대기)` 프레임 설명을 고쳤습니다. SKIP 버튼은 세방고딕이 자동화 환경에서 불러와지지 않아 데스크톱에서 직접 넣어야 합니다.
- **SKIP 연출**: 슬라임 마스크 자리에서 원형 구멍이 1.1초 동안 화면 끝까지 커지며(`#stage`의 radial-gradient mask, `maskOpen()`) 그 안으로 메인이 보입니다. 재생 중 SKIP이면 화면 가운데에서.
- **메인 등장**(두 경로 공통, `finishIntro()` → `body.intro-entering`): GNB 위에서 → 메인 비주얼 글 패널 왼쪽에서(관심고객 버튼 · 제목 · 넘김 컨트롤 순) → 퀵메뉴 오른쪽에서. 걷히는 동안 GNB는 위로 비켜 있다가 내려옵니다.
- 메인 비주얼 사진 넘김은 인트로가 걷힌 뒤(`stp:intro-done`)부터 5초를 셉니다 — 마스크 안 입구 사진이 그대로 첫 장으로 이어지게.
- **START → SKIP 접근 모션**: SKIP 가장자리 120px 안에서 커서 동그라미가 ease-in-out(cubic)으로 32px까지 작아지고(`hero.setDiscScale`), 영역에 들어오는 순간 START 글자가 0.3초에 사라집니다(`body.disc-near`). 버튼 위에서는 점과 겹친 부분만 반전 — 버튼 안 밝은 복제 `.intro-skip__inv`를 `clip-path: circle()`로 점 자리만 보여 줍니다. 점이 커서이므로 버튼 위 손가락은 숨김. (가루 효과 7b46154는 과해서 되돌림)

## 메인 비주얼 개편 · 아이덴티티 (2026-10-29)
- **인트로 사진과 KV 1번**: 새 입구 렌더(`img/수정이미지/entrance-01-1.png`)로 바꿨습니다. `img/hero.webp`는 1920 폭, `img/campus/entrance-hero.webp`는 2400 폭입니다.
- **아이덴티티**: 아래로 꺾인 비주얼(`.is-folded`, `--fold-depth`). 규칙은 [DESIGN.md](DESIGN.md)에 있습니다.
- **KV**: 미래탐구식 패널로, 사진 위에 떠 있는 카드입니다. 슬라이드마다 문구가 바뀌고 컨트롤은 한 줄입니다. 문구 출처는 기획서 4 · 6 · 9p입니다.
- **퀵메뉴**: 미래탐구 side_banner 구성입니다. 위치는 오른쪽 위입니다.

## 보정 사진 · 패널 제거 (2026-10-30)
- **보정 사진**: `img/수정이미지/*_보정.png` 세 장을 KV 1 · 2 · 3번과 인트로(`img/hero.webp`, 85% 합성)에 적용했습니다.
- **메인 비주얼**: 피그마 18181-8344대로 왼쪽 패널을 없애고 사진 위에 흰 글자, 등록 버튼은 화면 가운데로 옮겼습니다.
- DESIGN.md를 「원칙 → 모양 → 토큰 → 공통 컴포넌트 → 둥근 모서리 → 페이지」로 다시 썼습니다.

## 네 개의 브랜드 — 4면 판 + 슬라임 (2026-10-30)
- 교육 프로그램 카드 넷을 미탐존(피그마 18144-9958)식 한 장의 판으로 바꿨습니다. 가운데 슬라임이 면으로 흘러가 흡수되는 인터랙션은 `js/home.js` quad IIFE, 블롭 경로는 `hero.js`의 makeBlob · blobPath를 옮겨 적은 것입니다(hero는 모듈 상태에 묶여 있어 내보내지 않음). 규칙은 [DESIGN.md](DESIGN.md) 6.
- 2차: 방울은 가운데 넓이의 1/4을 검은색 그대로 떼어 보내고 가운데는 3/4가 남았다가 3초에 걸쳐 차오릅니다. 검은 슬라임 뒤에 브랜드 색 슬라임 넷이 떠돌며 살짝 비칩니다.
- 3차: 뒤 슬라임 넷을 별도 svg로 빼 `mix-blend-mode: multiply`, 검은 슬라임 크기에 비례해 같이 줄고 마우스 쪽으로 8px 끌림. 면 그라데이션은 가운데가 짙게.
- 피그마 main 프레임에도 반영(2026-10-30): Program 섹션에 「Quad · 네 개의 브랜드」(1160 × 570, 면 넷 · class-02 사진 · multiply 뒤 넷 · 검은 원 + 흰 로고)를 편집 가능한 레이어로 만들고, 예전 Cards는 숨김. 분야명 글꼴은 세방고딕을 불러올 수 없어 Noto Sans KR로 두었습니다(레이어 이름에 표시). pill 버튼은 컴포넌트가 바뀌어 인스턴스도 함께 바뀜.
- 메모: `hero.js`의 `SATS`는 마이온 = 더스티 블루, 리딩오션 = 세이지로 되어 있어 `tokens.css` 주석(마이온 = 세이지, 리딩오션 = 더스티 블루)과 반대입니다. 이번엔 손대지 않았습니다.

## 버튼 pill 복귀 · 판 1160 · GitHub (2026-10-30)
- 육각형 버튼(Fill · Line · Ghost)과 GNB 2depth 육각 호버를 모두 pill(r999)로 되돌렸습니다. 피그마 세 세트 · 18166-8652도 같이. 브랜드 판 폭은 1400 → 1160.
- 저장소: https://github.com/choiheesang-lang/somathePrime_homepage · 보정 원본 PNG(`img/수정이미지/`)는 .gitignore.

## 인트로 디스크 뒤 슬라임 넷 (2026-11-02)
- `#hero-trail`(multiply svg)에 브랜드 색 원 넷, 그 아래 `#hero-halo`(흰 radial 빛, 디스크 2.2배 · 60%). `hero.js` `TRAIL`의 r · off · drift · stiff · damp · lagMax로 조절합니다. 디스크 opacity와 같이 켜고 끕니다(`discOpacity`).

