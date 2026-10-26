#!/usr/bin/env python3
"""Inspect the actual Chromium-generated print PDF with PyMuPDF.

This checks a bounded, synthetic demo certificate. It does not certify PDF/A,
accessible PDF, exact pagination quality, or any VCP cryptographic evidence.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import fitz

OUT = Path("ui-evidence")
PDF = OUT / "certificate-print.pdf"
REPORT = OUT / "pdf-review.json"


def main() -> int:
    checks = []
    if not PDF.is_file():
        print("Missing Chromium PDF artifact", file=sys.stderr)
        return 1
    raw = PDF.read_bytes()
    checks.append(("pdf_signature", raw.startswith(b"%PDF-")))
    checks.append(("pdf_minimum_size", len(raw) > 5000))

    doc = fitz.open(stream=raw, filetype="pdf")
    checks.append(("pdf_page_count", 1 <= len(doc) <= 5))
    all_text = []
    pages = []
    for index, page in enumerate(doc):
        text = page.get_text("text", sort=True)
        all_text.append(text)
        bbox = page.rect
        a4 = abs(bbox.width - 595.276) <= 2 and abs(bbox.height - 841.89) <= 2
        enough_text = len(text.strip()) >= 20
        checks.append((f"page_{index + 1}_a4", a4))
        checks.append((f"page_{index + 1}_not_blank", enough_text))
        pix = page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False)
        name = f"pdf-page-{index + 1}.png"
        pix.save(str(OUT / name))
        pages.append({
            "page": index + 1,
            "page_width_pt": round(bbox.width, 3),
            "page_height_pt": round(bbox.height, 3),
            "text_characters": len(text),
            "render": name,
            "text_start": text[:220],
        })
    text = re.sub(r"\s+", " ", " ".join(all_text)).lower()
    checks.append(("certificate_heading", "vcp event certificate" in text))
    checks.append(("explicit_demo_warning", "demo data" in text and "not verified" in text))
    checks.append(("not_a_certification", "not a certification" in text))
    checks.append(("not_a_compliance_finding", "not a compliance finding" in text))
    report = {
        "status": "passed" if all(ok for _, ok in checks) else "failed",
        "pdf_sha256": hashlib.sha256(raw).hexdigest(),
        "pdf_bytes": len(raw),
        "page_count": len(doc),
        "pages": pages,
        "checks": {k: v for k, v in checks},
        "limits": "Chromium-generated first-party mock data, A4 media/page content check only. Not screen-reader, PDF/A, full pagination, or public deployment review.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "pages": pages, "checks": report["checks"]}, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
