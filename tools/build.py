#!/usr/bin/env python3
"""페이지 조립기 — src/pages/*.html 을 읽어 공통 조각을 끼워 넣고 사이트 루트에 씁니다.

빌드 결과(루트의 *.html, brand/*.html)는 그대로 커밋합니다. 배포는 정적 파일 그대로라
Vercel에는 빌드 단계가 없습니다. 페이지를 고치면 이 스크립트를 한 번 돌리면 됩니다.

    python3 tools/build.py

페이지 파일 맨 위의 머리말(--- ... ---)이 제목·설명·활성 메뉴·추가 CSS/JS를 정합니다.
본문 안의 {{sprite}} {{lead}} 같은 자리표시는 src/partials/<이름>.html 로 바뀝니다.
"""
import io
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PARTS = SRC / "partials"
SITE = "https://soma-the-prime.vercel.app"   # og 절대 주소(배포 주소가 정해지면 바꿉니다)

MENU = [
    ("brand", "브랜드", "/brand/", [("브랜드 소개", "/brand/"), ("캠퍼스 안내", "/brand/campus.html"), ("오시는 길", "/brand/location.html")]),
    ("program", "교육 프로그램", "/program.html", []),
    ("news", "소식", "/news.html", [("시간표", "/news.html#timetable"), ("공지사항", "/news.html#notice"), ("홍보자료", "/news.html#press"), ("FAQ", "/news.html#faq"), ("1:1 문의", "/news.html#qna")]),
    ("center", "센터 찾기", "/center.html", []),
    ("teacher", "선생님", "/teacher.html", []),
    ("mypage", "마이페이지", "/mypage.html", []),
]


def part(name):
    return io.open(PARTS / f"{name}.html", encoding="utf-8").read().rstrip()


def gnb(active):
    items = []
    for key, label, href, sub in MENU:
        cur = ' aria-current="page"' if key == active else ""
        cls = "gnb2__item" + (" has-sub" if sub else "") + (" is-active" if key == active else "")
        subhtml = ""
        if sub:
            links = "".join(f'<li><a href="{h}" data-label="{t}">{t}</a></li>' for t, h in sub)
            subhtml = f'<ul class="gnb2__sub">{links}</ul>'
        items.append(f'<li class="{cls}"><a class="gnb2__link" href="{href}" data-label="{label}"{cur}>{label}</a>{subhtml}</li>')
    mob = []
    for key, label, href, sub in MENU:
        subs = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in sub)
        mob.append(f'<li><a class="mnav__top" href="{href}">{label}</a>' + (f"<ul>{subs}</ul>" if subs else "") + "</li>")
    return part("gnb").replace("{{items}}", "\n          ".join(items)).replace("{{mobile}}", "\n        ".join(mob))


def build(page):
    raw = io.open(page, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", raw, re.S)
    meta = dict(l.split(":", 1) for l in m.group(1).splitlines() if ":" in l)
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    body = raw[m.end():]
    css = "".join(f'\n  <link rel="stylesheet" href="/css/{c}.css" />' for c in meta.get("css", "").split() if c)
    js = "".join(f'\n  <script src="/js/{j}.js"></script>' for j in meta.get("js", "").split() if j)
    head = (part("head")
            .replace("{{title}}", meta["title"])
            .replace("{{desc}}", meta.get("desc", ""))
            .replace("{{url}}", SITE + meta.get("path", "/"))
            .replace("{{site}}", SITE)
            .replace("{{preload}}", "".join(f'\n  <link rel="preload" as="image" href="{p}" fetchpriority="high" />' for p in meta.get("preload", "").split()))
            .replace("{{css}}", css))
    for name in ("sprite", "lead", "footer", "quick", "stage", "scene10", "scene12"):
        if "{{" + name + "}}" in body:
            body = body.replace("{{" + name + "}}", part(name))
    body = body.replace("{{gnb}}", gnb(meta.get("menu", "")))
    out = head + "\n<body class=\"" + meta.get("body", "") + "\">\n" + body.rstrip() + "\n" + part("scripts") + js + "\n</body>\n</html>\n"
    left = re.findall(r"\{\{\w+\}\}", out)
    assert not left, (page.name, left)
    dest = ROOT / meta["path"].lstrip("/")
    if meta["path"].endswith("/"):
        dest = dest / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    io.open(dest, "w", encoding="utf-8").write(out)
    return dest.relative_to(ROOT)


if __name__ == "__main__":
    for p in sorted((SRC / "pages").glob("*.html")):
        print("built", build(p))
