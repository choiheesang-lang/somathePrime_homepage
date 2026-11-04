# 소마 더 프라임 홈페이지

소마 더 프라임(목동 캠퍼스) 정식 홈페이지의 프론트엔드입니다. 프레임워크 없는 정적 사이트로,
`tools/build.py`(Python 표준 라이브러리만)가 페이지 소스에 공통 조각을 끼워 `dist/`에 완성본을 씁니다.
피그마 원본: `soma_thePrime` (`zdJrSOqkvIRsrPZmK4QT4L`).

- 모양 · 토큰 · 컴포넌트 · 페이지별 규칙 → [docs/DESIGN.md](docs/DESIGN.md)
- 날짜별 결정 기록(왜 이렇게 했나) → [docs/NOTES.md](docs/NOTES.md)

## 폴더 구조

```
src/pages/        페이지 소스 10개 (머리말 + 본문). 여기를 고칩니다
src/partials/     공통 조각 — head · gnb · footer · quick · lead(팝업) · sprite(SVG 심볼) · 홈 전용 조각
css/              스타일. tokens(피그마 변수) → base → sections(공통 장면 · 팝업) → site(GNB · 메뉴 · 버튼) + 페이지별
js/               동작. site(공통) · lead(팝업) + 페이지별. 홈: hero(인트로) · home · goo(슬라임)
img/ font/ svg/   정적 자산. 사진은 webp, 세방고딕은 woff2(+otf 예비)
tools/build.py    조립기.  tools/figma/  피그마 작업용 플러그인(사이트와 무관)
dist/             빌드 결과 = 배포 루트. 직접 고치지 마세요 — 소스를 고치고 다시 빌드합니다
docs/             DESIGN.md · NOTES.md
```

`dist/`는 **생성물이지만 커밋합니다.** Vercel에 빌드 단계가 없어서, 커밋된 `dist/`가 그대로 서비스됩니다.

## 로컬에서 보기

```bash
python3 tools/build.py
```

```bash
python3 -m http.server 8766 --directory dist
```

<http://localhost:8766> 으로 봅니다. 모든 경로가 `/css/…`처럼 루트 절대 경로라 파일을 더블클릭해서 열면 깨집니다 — 꼭 서버로 보세요.

- 홈 인트로: `/?intro=1` 강제 재생, `/?intro=0` 끔. 기본은 「새로고침 또는 사이트 밖에서 들어왔을 때 재생, 사이트 안에서 메인으로 돌아오면 생략」(`src/pages/index.html` 인라인 스크립트).
- 동작 줄이기(prefers-reduced-motion)면 인트로 · 자동 넘김 · 슬라임 등 움직임이 꺼집니다.

## 페이지 고치기 · 추가하기

1. `src/pages/<이름>.html`을 고칩니다(새 페이지는 기존 파일을 복사).
2. `python3 tools/build.py`
3. `dist/`까지 함께 커밋합니다.

페이지 파일은 머리말(`--- … ---`)과 본문으로 되어 있습니다.

```
---
title: 캠퍼스 안내 | 소마 더 프라임
desc: 메타 설명
path: /brand/campus.html        # 출력 경로. "/brand/" 처럼 끝이 / 면 index.html
menu: brand                     # 활성 1depth (tools/build.py MENU 의 키)
menu-sub: 캠퍼스 안내            # 활성 2depth 라벨
crumb: 브랜드 > 캠퍼스 안내      # 브레드크럼
body: sub brand-page            # <body class>
css: brand campus               # 추가 css (css/<이름>.css)
js: brand campus                # 추가 js (js/<이름>.js)
---
```

| 키 | 뜻 |
|---|---|
| `title` `desc` `path` `body` | 필수. `body`는 `home` / `sub` / `sub brand-page` |
| `menu` `menu-sub` | 활성 메뉴. `menu`를 비우면 아무 메뉴도 활성화되지 않음(수강료 납부 등) |
| `crumb` | `A > B` 형식 브레드크럼, 마지막이 현재 페이지 |
| `head-tabs` | 2depth가 없는 메뉴의 페이지 안 앵커 탭 `라벨=#앵커\|라벨=#앵커`. `none`이면 탭 없음 |
| `gnb` | `main`이면 투명 GNB(메인 비주얼 위). 생략하면 흰 바탕 |
| `css` `js` | 공백으로 구분, 확장자 없이 |
| `preload` | 먼저 받을 이미지 경로 |

본문의 `{{sprite}}` `{{gnb}}` `{{crumb}}` `{{bphead}}` `{{lead}}` `{{quick}}` `{{footer}}` 는 `src/partials/<이름>.html`로 바뀝니다.
상단 메뉴 항목은 `tools/build.py`의 `MENU` 한 곳에서 데스크톱 GNB · 모바일 전체 메뉴 · 머리 탭을 모두 만듭니다.

## 페이지와 담당 파일

| 경로 | 내용 | css | js |
|---|---|---|---|
| `/` | 홈 — 인트로 · 메인 비주얼 · 장면 10 · 교육 프로그램 · 장면 12 · 오시는 길 | hero home | hero home goo |
| `/brand/` | 브랜드 소개 | brand | brand goo |
| `/brand/campus.html` | 캠퍼스 안내 — 아치 카드 · 커버플로우 | brand campus | brand campus |
| `/brand/location.html` | 오시는 길 — 지도 카드 | brand location | brand location |
| `/program.html` | 교육 프로그램 — 아코디언 · 관찰평가 | brand program | brand program |
| `/news.html` | 소식(공지사항) — 목록은 예시 글 | brand news | — |
| `/center.html` `/teacher.html` `/mypage.html` `/tuition.html` | 자리만 — 기존 소마 홈페이지 연동 예정 | — | — |

모든 페이지가 공통으로 싣는 것: `css/tokens · base · sections · site`, `js/lead · site`, gsap + ScrollTrigger.

## 외부 의존

- **gsap 3.13.0 · ScrollTrigger** — cdnjs, `src/partials/scripts.html`. 모든 모션의 기반.
- **Noto Sans KR** 400/500/700 — Google Fonts(본문).
- **세방고딕** — `font/`에 자체 호스팅(제목 · 메뉴 · 버튼). `woff2`를 먼저, 못 읽는 브라우저는 `otf`.
  폰트 파일의 웹 사용 라이선스는 소마 쪽 확인 사항입니다.

## 배포 (Vercel)

`vercel.json`의 `outputDirectory`가 `dist`입니다. `main`에 푸시하면 그대로 올라갑니다(빌드 없음).
현재 주소: <https://somatheprime-homepage.vercel.app>

**정식 오픈 전 체크리스트**
- [ ] `vercel.json`의 `X-Robots-Tag: noindex, nofollow` 제거 — 지금은 시안 단계라 검색 색인을 막아 두었습니다.
- [ ] `tools/build.py`의 `SITE`(og:url 절대 주소)를 실제 도메인으로.
- [ ] `img/location/map.webp`는 지도 서비스 화면을 캡처한 사진입니다 — 사용 권한 확인(또는 카카오맵 API로 교체).
- [ ] 전화번호(오시는 길 · 푸터 「추후 안내」) 입력.

## 알려진 미완성 · 연동 자리

- **센터 찾기 · 선생님 · 마이페이지 · 수강료 납부** — 안내 문구만 있는 자리 페이지. 기존 소마 홈페이지 기능과 연동 예정.
- **소식** — 게시판 목록이 피그마 예시 글(13행). 기존 게시판 연동 시 링크 · 페이지 번호 · 검색을 붙입니다.
- **관심고객 등록 팝업**(`src/partials/lead.html`, `js/lead.js`) — 폼은 시각 전용이라 보내는 코드가 없습니다.
- **홈의 「오시는 길」 카드** — 구 디자인입니다. `/brand/location.html`의 새 카드(`Location / Card`)로 교체 가능.
- **GNB 유틸 바의 「홍길동 · 교육기관」** — 로그인 상태 견본 글자. 회원 연동 때 실제 값으로.

## tools/figma

`tools/figma/`는 피그마 파일에서 세방고딕 글자를 되돌리는 **피그마 개발용 플러그인**입니다(피그마 MCP가 세방고딕을
불러오지 못해 Noto로 임시 작업한 뒤 되돌릴 때 씀). 사이트 빌드와는 관계없습니다.
