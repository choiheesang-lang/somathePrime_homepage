#!/usr/bin/env python3
"""페이지 조립기 — src/pages/*.html 을 읽어 공통 조각(src/partials)을 끼워 넣고 dist/ 에 씁니다.

    python3 tools/build.py        # dist/ 를 비우고 html 10개 + 정적 자산을 다시 만듭니다

dist/ 가 배포 루트입니다(vercel.json outputDirectory). 빌드 결과도 커밋하므로 Vercel 에는
빌드 단계가 없습니다 — 소스를 고쳤으면 이 스크립트를 돌리고 dist/ 까지 함께 커밋하세요.
외부 의존 없음(표준 라이브러리만).

페이지 머리말(파일 맨 위 --- … ---) 키
    title       <title> 과 og:title                                           (필수)
    desc        meta description · og:description                            (필수)
    path        출력 경로. "/brand/" 처럼 끝이 / 면 index.html 로 씀         (필수)
    body        <body class="…">. home | sub | sub brand-page                (필수)
    menu        활성 1depth 메뉴 키(MENU 의 첫 칸). 없으면 아무것도 활성화 안 함
    menu-sub    활성 2depth 라벨(브랜드 소개 등) — 머리 탭 · 모바일 메뉴의 aria-current
    crumb       브레드크럼. "브랜드 > 오시는 길" 처럼 > 로 구분, 마지막이 현재 페이지
    head-tabs   서브페이지 머리 탭. 2depth 가 없는 메뉴가 페이지 안 앵커 탭을 둘 때
                "라벨=#앵커|라벨=#앵커", "none" 이면 2depth 가 있어도 탭 없음(소식)
    gnb         "main" 이면 투명 GNB(메인 비주얼 위). 기본은 흰 바탕 "sub"
    css / js    추가로 실을 css/<이름>.css · js/<이름>.js (공백 구분, 확장자 없이)
    preload     <link rel=preload as=image> 로 미리 받을 이미지 경로(공백 구분)

본문 자리표시 {{이름}} → src/partials/<이름>.html
    sprite   인라인 SVG 심볼 모음(로고 · 아이콘). 모든 페이지 맨 앞
    gnb      GNB + 모바일 전체 메뉴(gnb() 가 MENU 로 항목을 채움)
    crumb    브레드크럼(crumb())            bphead   서브페이지 머리: 제목 + 탭(bphead())
    lead     관심고객 등록 팝업              quick    오른쪽 퀵메뉴 · TOP
    footer   푸터                           stage · scene10 · scene12 · keywords  홈 · 브랜드 소개 전용 조각
공통 <head> 는 partials/head.html, 공통 <script> 는 partials/scripts.html 이 맨 끝에 붙습니다.
"""
import io
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PARTS = SRC / "partials"
DIST = ROOT / "dist"                          # 배포 루트 — 빌드 때 비우고 다시 채웁니다
ASSETS = ("css", "js", "img", "font", "svg")  # dist/로 그대로 복사되는 정적 자산 폴더
SITE = "https://somatheprime-homepage.vercel.app"   # og:url 절대 주소 — 도메인이 바뀌면 여기만 고칩니다

MENU = [
    ("brand", "브랜드", "/brand/", [("브랜드 소개", "/brand/"), ("캠퍼스 안내", "/brand/campus.html"), ("오시는 길", "/brand/location.html")]),
    ("program", "교육 프로그램", "/program.html", []),
    ("news", "소식", "/news.html", [("시간표", "/news.html#timetable"), ("공지사항", "/news.html#notice"), ("홍보자료", "/news.html#press"), ("FAQ", "/news.html#faq"), ("1:1 문의", "/news.html#qna")]),
    ("center", "센터 찾기", "/center.html", []),
    ("teacher", "선생님", "/teacher.html", []),
    ("mypage", "마이페이지", "/mypage.html", []),
]


def part(name):
    """src/partials/<name>.html 을 읽습니다."""
    return io.open(PARTS / f"{name}.html", encoding="utf-8").read().rstrip()


def gnb(active, kind="sub", active_sub=""):
    """partials/gnb.html 에 MENU 항목을 채웁니다 — 데스크톱 메뉴(gnb2__*)와 모바일 전체 메뉴(mnav__*).
    kind="main" 은 투명 GNB(메인 비주얼 위), 그 외는 흰 바탕. active / active_sub 는 머리말 menu / menu-sub.
    피그마 GNB 세트(18291:11394)."""
    items = []
    for key, label, href, sub in MENU:
        cur = ' aria-current="page"' if key == active else ""
        cls = "gnb2__item" + (" has-sub" if sub else "") + (" is-active" if key == active else "")
        subhtml = ""
        if sub:
            links = "".join(f'<li><a href="{h}" data-label="{t}">{t}</a></li>' for t, h in sub)
            subhtml = f'<ul class="gnb2__sub">{links}</ul>'
        items.append(f'<li class="{cls}"><a class="gnb2__link" href="{href}" data-label="{label}"{cur}>{label}</a>{subhtml}</li>')
    # 모바일 전체 메뉴(피그마 18497:20940) — 1depth 아코디언. 2depth가 있으면 버튼(누르면 회색 판이 열림), 없으면 링크.
    # 지금 있는 메뉴는 처음부터 열고, 지금 페이지(menu-sub)는 aria-current(주황).
    mob = []
    for key, label, href, sub in MENU:
        if sub:
            on = key == active
            subs = "".join(f'<li><a href="{h}"{" aria-current=\"page\"" if on and t == active_sub else ""}>{t}</a></li>' for t, h in sub)
            mob.append(f'<li class="mnav__item has-sub"><button type="button" class="mnav__top" aria-expanded="{"true" if on else "false"}" aria-controls="mnav-{key}">'
                       f'{label}<span class="mnav__chev" aria-hidden="true"></span></button>'
                       f'<ul class="mnav__sub" id="mnav-{key}"{"" if on else " hidden"}>{subs}</ul></li>')
        else:
            cur = ' aria-current="page"' if key == active else ""
            mob.append(f'<li class="mnav__item"><a class="mnav__top" href="{href}"{cur}>{label}</a></li>')
    return (part("gnb").replace("{{kind}}", "gnb2--main" if kind == "main" else "gnb2--sub")
            .replace("{{items}}", "\n          ".join(items)).replace("{{mobile}}", "\n        ".join(mob)))


HOME_ICON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 7.2 8 2.5l5.5 4.7V13a.5.5 0 0 1-.5.5H9.5V10h-3v3.5H3a.5.5 0 0 1-.5-.5V7.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'


def crumb(spec):
    """브레드크럼 — 머리말 crumb: "브랜드 > 브랜드 소개". 링크 없는 표시 전용(피그마 Breadcrumb 컴포넌트)."""
    parts = [p.strip() for p in spec.split(">") if p.strip()]
    items = [f'<li class="crumb__home">{HOME_ICON}<span class="sr-only">홈</span></li>']
    items += [f"<li>{p}</li>" for p in parts[:-1]]
    items.append(f'<li aria-current="page">{parts[-1]}</li>')
    return '<nav class="crumb" aria-label="현재 위치">\n      <ol class="wrap">' + "".join(items) + "</ol>\n    </nav>"


def bphead(meta):
    """서브페이지 머리(src/partials/bphead.html) — 제목은 `menu:`의 1depth 라벨, 탭은 그 메뉴의 2depth.
    2depth가 없는 메뉴(교육 프로그램 등)는 `head-tabs: 라벨=#앵커|라벨=#앵커`로 페이지 안 앵커 탭을 둡니다(현재 표시는 스크롤 스파이).
    `head-tabs: none`이면 2depth가 있어도 탭을 두지 않습니다(소식 — 2depth는 왼쪽 메뉴가 맡음)."""
    item = next(m for m in MENU if m[0] == meta.get("menu"))
    label, sub = item[1], item[3]
    if meta.get("head-tabs") == "none":
        tabs = ""
    elif sub:
        tabs = "".join(f'<li><a href="{h}"{" aria-current=\"page\"" if t == meta.get("menu-sub") else ""}>{t}</a></li>' for t, h in sub)
    elif meta.get("head-tabs"):
        tabs = "".join(f'<li><a href="{h.strip()}">{t.strip()}</a></li>' for t, h in (x.split("=", 1) for x in meta["head-tabs"].split("|")))
    else:
        tabs = ""
    nav = f'<nav class="bp-tabs" aria-label="{label} 하위 메뉴"><ul>{tabs}</ul></nav>' if tabs else ""
    return part("bphead").replace("{{title}}", label).replace("{{nav}}", nav)


def build(page):
    """src/pages/<page> 하나를 조립해 dist/ 에 쓰고, dist 기준 상대 경로를 돌려줍니다."""
    raw = io.open(page, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", raw, re.S)
    meta = dict(l.split(":", 1) for l in m.group(1).splitlines() if ":" in l)
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    body = raw[m.end():]
    css = "".join(f'\n  <link rel="stylesheet" href="/css/{c}.css" />' for c in meta.get("css", "").split() if c)
    js = "".join(f'\n  <script defer src="/js/{j}.js"></script>' for j in meta.get("js", "").split() if j)
    head = (part("head")
            .replace("{{title}}", meta["title"])
            .replace("{{desc}}", meta.get("desc", ""))
            .replace("{{url}}", SITE + meta.get("path", "/"))
            .replace("{{site}}", SITE)
            .replace("{{preload}}", "".join(f'\n  <link rel="preload" as="image" href="{p}" fetchpriority="high" />' for p in meta.get("preload", "").split()))
            .replace("{{css}}", css))
    for name in ("sprite", "lead", "footer", "quick", "stage", "scene10", "scene12", "keywords"):
        if "{{" + name + "}}" in body:
            body = body.replace("{{" + name + "}}", part(name))
    body = body.replace("{{gnb}}", gnb(meta.get("menu", ""), meta.get("gnb", "sub"), meta.get("menu-sub", "")))
    if "{{crumb}}" in body:
        body = body.replace("{{crumb}}", crumb(meta["crumb"]))
    if "{{bphead}}" in body:
        body = body.replace("{{bphead}}", bphead(meta))
    out = head + "\n<body class=\"" + meta.get("body", "") + "\">\n" + body.rstrip() + "\n" + part("scripts") + js + "\n</body>\n</html>\n"
    left = re.findall(r"\{\{\w+\}\}", out)
    assert not left, (page.name, left)
    dest = DIST / meta["path"].lstrip("/")
    if meta["path"].endswith("/"):
        dest = dest / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    io.open(dest, "w", encoding="utf-8").write(out)
    return dest.relative_to(ROOT)


def copy_assets():
    """css · js · img · font · svg 를 dist/ 아래로 복사합니다. 페이지가 모두 루트 절대 경로(/css/…)로
    참조하므로 dist/ 하나가 완결된 배포 루트가 됩니다.
    .gitignore 에 걸리지 않은 파일만 복사합니다(추적 중 + 아직 add 하지 않은 새 파일) — 보정 원본 PNG(img/수정이미지)와
    .ttf 폰트가 배포에 섞여 들어가지 않게 하기 위해서입니다. 새 자산을 넣었으면 add 하지 않아도 빌드에 들어갑니다."""
    import subprocess
    listed = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", *ASSETS],
                            cwd=ROOT, capture_output=True, text=True, check=True).stdout.split("\n")
    for rel in filter(None, listed):
        src = ROOT / rel
        if not src.exists():          # 지웠지만 아직 커밋 전인 파일은 건너뜁니다
            continue
        dest = DIST / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


if __name__ == "__main__":
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for p in sorted((SRC / "pages").glob("*.html")):
        print("built", build(p))
    copy_assets()
    print("copied", ", ".join(ASSETS), "→ dist/")
