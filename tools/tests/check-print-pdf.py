#!/usr/bin/env python3
"""Bounded mock-certificate PDF checks; not PDF/UA or screen-reader validation."""
import hashlib
import json
import re
import sys
from pathlib import Path

import fitz


def normalize(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def content_checks(page_texts, expected):
    """Check complete identifiers and connected claims, not isolated words."""
    uuid_pattern = r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}"
    for key in ("event_id", "trace_id"):
        if not isinstance(expected.get(key), str) or not re.fullmatch(uuid_pattern, expected[key], re.I):
            raise ValueError("Missing/invalid independent " + key)
    hashes = expected.get("proof_hashes")
    if not isinstance(hashes, list) or not 1 <= len(hashes) <= 16:
        raise ValueError("A nonempty bounded proof fixture is required")
    if not all(isinstance(h, str) and re.fullmatch(r"[0-9a-f]{64}", h, re.I) for h in hashes):
        raise ValueError("Expected proof hashes must be complete")
    normal_pages = [normalize(text) for text in page_texts]
    compact_pages = [re.sub(r"\s+", "", text).lower() for text in page_texts]
    combined = " ".join(normal_pages)
    proof_pages = [index + 1 for index, (plain, compact) in enumerate(zip(normal_pages, compact_pages))
                   if "merkle inclusion proof (rfc 6962)" in plain
                   and all(h.lower() in compact for h in hashes)]
    checks = {
        "certificate_heading": "vcp event certificate" in combined,
        "explicit_demo_warning": "demo data — not verified" in combined,
        "combined_noncertification_disclaimer":
            "this view is not a certification or a compliance finding;" in combined,
        "full_event_identifier": any(expected["event_id"].lower() in t for t in compact_pages),
        "full_trace_identifier": any(expected["trace_id"].lower() in t for t in compact_pages),
        "bounded_merkle_section_kept_together": bool(proof_pages),
    }
    return checks, proof_pages


def main():
    out = Path(sys.argv[1]) if len(sys.argv) == 2 else Path("ui-evidence")
    out.mkdir(parents=True, exist_ok=True)
    report = {"status": "failed", "scope": "Bounded first-party mock certificate content and page layout", "accessibility_status": "NOT_ASSESSED"}
    try:
        raw = (out / "certificate-print.pdf").read_bytes()
        expected = json.loads((out / "pdf-expectations.json").read_text(encoding="utf-8"))
        with fitz.open(stream=raw, filetype="pdf") as doc:
            checks = {"pdf_signature": raw.startswith(b"%PDF-"), "pdf_minimum_size": len(raw) > 5000,
                      "pdf_page_count": 1 <= len(doc) <= 5}
            texts, pages = [], []
            for index, page in enumerate(doc):
                text = page.get_text("text", sort=False)
                texts.append(text)
                box = page.rect
                checks[f"page_{index+1}_a4"] = abs(box.width - 595.276) <= 2 and abs(box.height - 841.89) <= 2
                checks[f"page_{index+1}_not_blank"] = len(text.strip()) >= 20
                image_name = f"pdf-page-{index+1}.png"
                page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False).save(str(out / image_name))
                pages.append({"page": index+1, "width_pt": round(box.width, 3), "height_pt": round(box.height, 3),
                              "text_characters": len(text), "render": image_name, "text_start": text[:220]})
            content, proof_pages = content_checks(texts, expected)
            checks.update(content)
            catalog = doc.pdf_catalog()
            structure_type, structure_value = doc.xref_get_key(catalog, "StructTreeRoot")
            language_type, language_value = doc.xref_get_key(catalog, "Lang")
            report.update({"status": "passed" if all(checks.values()) else "failed", "checks": checks,
                           "pdf_sha256": hashlib.sha256(raw).hexdigest(), "pdf_bytes": len(raw),
                           "page_count": len(doc), "pages": pages, "bounded_proof_pages": proof_pages,
                           "tagging_observation": {"structure_tree_present": structure_type != "null",
                                                   "structure_tree": structure_value, "language_type": language_type,
                                                   "language": language_value},
                           "limits": "Tag presence and reading order are not certified. Browser print settings vary; no PDF/UA, PDF/A, assistive-technology, all-input pagination, cryptographic or deployment claim."})
            (out / "pdf-text.txt").write_text("\n\n=== PAGE ===\n\n".join(texts), encoding="utf-8")
    except Exception as exc:
        report["error"] = type(exc).__name__ + ": " + str(exc)
    (out / "pdf-review.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
