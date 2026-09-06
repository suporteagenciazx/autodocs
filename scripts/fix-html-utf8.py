# -*- coding: utf-8 -*-
"""Fix HTML encoding (cp1252 -> UTF-8) and ensure local Inter font links."""
from __future__ import annotations

import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]

GOOGLE_INTER = re.compile(
    r"\s*<link rel=\"preconnect\" href=\"https://fonts\.googleapis\.com\">\s*"
    r"<link rel=\"preconnect\" href=\"https://fonts\.gstatic\.com\" crossorigin>\s*"
    r"<link rel=\"stylesheet\" href=\"https://fonts\.googleapis\.com/css2\?family=Inter:wght@400;500;600;700&display=swap\">\s*",
    re.I,
)
GOOGLE_MATERIAL = re.compile(
    r"\s*<link rel=\"stylesheet\" href=\"https://fonts\.googleapis\.com/css2\?family=Material\+Symbols[^>]*>\s*",
    re.I,
)
INTER_LINK = re.compile(r"fontes/inter\.css", re.I)
LATIN1_MARKERS = (
    "Usuários".encode("cp1252"),
    "Documentações".encode("cp1252"),
    "Função".encode("cp1252"),
    "não".encode("cp1252"),
    "página".encode("cp1252"),
)


def inter_href(rel_posix: str) -> str:
    depth = rel_posix.count("/")
    if depth == 0:
        return "./estilos/fontes/inter.css"
    return "../" * depth + "estilos/fontes/inter.css"


def load_text(path: pathlib.Path) -> tuple[str, str]:
    raw = path.read_bytes()
    if any(m in raw for m in LATIN1_MARKERS):
        return raw.decode("cp1252"), "cp1252"
    try:
        return raw.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return raw.decode("cp1252"), "cp1252"


def maybe_restore_from_git(path: pathlib.Path, text: str) -> str:
    if not re.search(r"Usu\?rios|Documenta\?\?|fun\?\?o|n\?o |p\?gina", text):
        return text
    rel = path.relative_to(ROOT).as_posix()
    data = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=ROOT)
    print("RESTORED", rel)
    return data.decode("utf-8")


def ensure_inter(text: str, href: str) -> str:
    text = GOOGLE_INTER.sub("\n", text)
    text = GOOGLE_MATERIAL.sub("\n", text)
    if INTER_LINK.search(text):
        text = re.sub(
            r'<link rel="stylesheet" href="[^"]*fontes/inter\.css">',
            f'<link rel="stylesheet" href="{href}">',
            text,
        )
        return text
    link = f'    <link rel="stylesheet" href="{href}">'
    m = re.search(r'(<link[^>]*rel="icon"[^>]*>)', text, re.I)
    if m:
        return text[: m.end()] + "\n" + link + text[m.end() :]
    return text.replace("</head>", link + "\n</head>", 1)


def main() -> None:
    html_files = [
        p
        for p in ROOT.rglob("*.html")
        if "docs" not in p.parts and ".git" not in p.parts
    ]
    fixed = 0
    for path in html_files:
        raw = path.read_bytes()
        text, enc = load_text(path)
        text = maybe_restore_from_git(path, text)
        rel = path.relative_to(ROOT).as_posix()
        href = inter_href(rel)
        text2 = ensure_inter(text, href)
        text2 = re.sub(r"\n{3,}", "\n\n", text2)
        out = text2.encode("utf-8")
        if out != raw:
            path.write_bytes(out)
            fixed += 1
            print(f"WROTE ({enc}) {rel}")
    print("fixed_files", fixed)

    usuarios = (ROOT / "usuarios" / "index.html").read_bytes()
    assert "Usuários".encode("utf-8") in usuarios, "usuarios title not UTF-8"
    docs = (ROOT / "documentacoes" / "index.html").read_bytes()
    assert "Documentações".encode("utf-8") in docs, "documentacoes title not UTF-8"
    print("VERIFY OK")


if __name__ == "__main__":
    main()
