#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "participant-kit"
SOURCE = ROOT / ".participant-package-src"
RAW_DATA = KIT / "프로젝트" / "raw-data"
ARTIFACTS = ROOT / "artifacts"
VERSION = (KIT / "VERSION").read_text(encoding="utf-8").strip()
ARCHIVE_NAME = f"koica-ai-training-starter-{VERSION.replace('.', '-')}.zip"


def find_font() -> str:
    candidates = [
        Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("C:/Windows/Fonts/malgun.ttf"),
        Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise RuntimeError("Korean TrueType font not found.")


def build_pdf() -> Path:
    output = RAW_DATA / "05-현장방문보고서.pdf"
    source = SOURCE / "현장방문보고서.md"
    font_path = find_font()
    pdfmetrics.registerFont(TTFont("Korean", font_path))

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "KoreanTitle",
        parent=styles["Title"],
        fontName="Korean",
        fontSize=20,
        leading=27,
        textColor=colors.HexColor("#10223D"),
        alignment=TA_CENTER,
        spaceAfter=10 * mm,
    )
    heading = ParagraphStyle(
        "KoreanHeading",
        parent=styles["Heading2"],
        fontName="Korean",
        fontSize=12,
        leading=17,
        textColor=colors.HexColor("#1D4ED8"),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    )
    body = ParagraphStyle(
        "KoreanBody",
        parent=styles["BodyText"],
        fontName="Korean",
        fontSize=9.5,
        leading=15,
        textColor=colors.HexColor("#263A54"),
        spaceAfter=2 * mm,
    )
    bullet = ParagraphStyle(
        "KoreanBullet",
        parent=body,
        leftIndent=5 * mm,
        firstLineIndent=-3 * mm,
        bulletIndent=0,
    )
    note = ParagraphStyle(
        "KoreanNote",
        parent=body,
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#6B7C93"),
    )

    story = []
    for raw_line in source.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            story.append(Spacer(1, 1.5 * mm))
        elif line.startswith("# "):
            story.append(Paragraph(html.escape(line[2:]), title))
        elif line.startswith("## "):
            story.append(Paragraph(html.escape(line[3:]), heading))
        elif line.startswith("- "):
            story.append(Paragraph("• " + html.escape(line[2:]), bullet))
        else:
            story.append(Paragraph(html.escape(line), body))

    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "교육용 가상 자료 — 실제 국가·기관·사업·인물을 나타내지 않습니다.",
            note,
        )
    )

    def decorate(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#2563EB"))
        canvas.setLineWidth(1.2)
        canvas.line(20 * mm, 18 * mm, 190 * mm, 18 * mm)
        canvas.setFont("Korean", 7)
        canvas.setFillColor(colors.HexColor("#6B7C93"))
        canvas.drawString(20 * mm, 12 * mm, "KOICA AI·데이터 활용 교육 — 가상 실습자료")
        canvas.drawRightString(190 * mm, 12 * mm, f"{doc.page} / 현장방문 결과")
        canvas.restoreState()

    doc = BaseDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=24 * mm,
        title="가상 현장방문 결과 요약",
        author="KOICA AI·데이터 활용 교육",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
    )
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=decorate)])
    doc.build(story)
    return output


def build_hwpx() -> Path:
    output = RAW_DATA / "06-사업계획서.hwpx"
    source = SOURCE / "사업계획서.md"

    installed = shutil.which("kordoc")
    cached = sorted(
        (Path.home() / ".npm" / "_npx").glob("*/node_modules/.bin/kordoc"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if installed:
        kordoc = [installed]
    elif cached:
        kordoc = [str(cached[0])]
    else:
        kordoc = ["npx", "-y", "kordoc"]

    command = [
        *kordoc,
        "generate",
        str(source),
        "-o",
        str(output),
        "--preset",
        "보고서",
    ]
    subprocess.run(command, cwd=ROOT, check=True)
    subprocess.run(
        [*kordoc, "validate", str(output)],
        cwd=ROOT,
        check=True,
    )
    return output


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest() -> Path:
    manifest = KIT / "PACKAGE-MANIFEST.txt"
    lines = [
        "KOICA AI·데이터 활용 교육 참가자 패키지",
        f"version: {VERSION}",
        "",
        "SHA-256  FILE",
    ]
    for path in sorted(KIT.rglob("*")):
        if not path.is_file() or path == manifest or path.name == ".DS_Store":
            continue
        lines.append(f"{sha256(path)}  {path.relative_to(KIT).as_posix()}")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return manifest


def build_zip() -> Path:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    archive = ARTIFACTS / ARCHIVE_NAME
    if archive.exists():
        archive.unlink()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(KIT.rglob("*")):
            if not path.is_file() or path.name == ".DS_Store":
                continue
            target = Path("koica-ai-training-starter") / path.relative_to(KIT)
            bundle.write(path, target.as_posix())
    checksum_file = ARTIFACTS / "SHA256SUMS.txt"
    checksum_file.write_text(f"{sha256(archive)}  {archive.name}\n", encoding="utf-8")
    return archive


def main() -> int:
    missing = [path for path in [KIT, SOURCE] if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing package sources: {missing}")
    RAW_DATA.mkdir(parents=True, exist_ok=True)
    pdf = build_pdf()
    hwpx = build_hwpx()
    manifest = write_manifest()
    archive = build_zip()
    print(f"PDF: {pdf.relative_to(ROOT)}")
    print(f"HWPX: {hwpx.relative_to(ROOT)}")
    print(f"Manifest: {manifest.relative_to(ROOT)}")
    print(f"Archive: {archive.relative_to(ROOT)}")
    print(f"SHA-256: {sha256(archive)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
