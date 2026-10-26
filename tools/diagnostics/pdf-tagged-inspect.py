#!/usr/bin/env python3
"""Bounded structure/tag comparison for first-party demo PDFs, not a PDF/UA audit."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

import fitz
from pypdf import PdfReader
from pypdf.generic import IndirectObject

OUT = Path('pdf-tag-study')


def deref(obj):
    return obj.get_object() if isinstance(obj, IndirectObject) else obj


def walk_struct(item, counts, sample, depth=0, visited=None):
    if visited is None:
        visited = set()
    if depth > 32:
        return
    if isinstance(item, IndirectObject):
        k = (item.idnum, item.generation)
        if k in visited:
            return
        visited.add(k)
    item = deref(item)
    if isinstance(item, list):
        for child in item[:10000]:
            walk_struct(child, counts, sample, depth + 1, visited)
    elif isinstance(item, dict):
        role = item.get('/S')
        if role:
            role = str(role)
            counts[role] += 1
            if len(sample) < 80:
                sample.append({'role': role, 'depth': depth,
                               'alt': str(item.get('/Alt'))[:140] if item.get('/Alt') else None})
        if '/K' in item:
            walk_struct(item['/K'], counts, sample, depth + 1, visited)


def inspect(name, fixture):
    p = OUT / name
    raw = p.read_bytes()
    pdf = PdfReader(str(p), strict=False)
    root = deref(pdf.trailer['/Root'])
    tree = deref(root.get('/StructTreeRoot')) if root.get('/StructTreeRoot') else None
    counts, sample = Counter(), []
    if tree:
        walk_struct(tree.get('/K'), counts, sample)
    lang = root.get('/Lang')
    marking = deref(root.get('/MarkInfo')) if root.get('/MarkInfo') else None
    pages, texts = [], []
    with fitz.open(p) as doc:
        for i, page in enumerate(doc):
            text = page.get_text('text', sort=False)
            texts.append(text)
            media = page.rect
            px = page.get_pixmap(matrix=fitz.Matrix(0.8,0.8), alpha=False)
            pages.append({'index':i+1,'width_pt':round(media.width,2),
                          'height_pt':round(media.height,2),
                          'characters':len(text), 'raster_width':px.width,
                          'raster_height':px.height,'raster_sha256':hashlib.sha256(px.samples).hexdigest()})
            if i < 3:
                px.save(str(OUT / (p.stem + '-page-' + str(i+1) + '.png')))
        catalog = doc.pdf_catalog()
        lang_check = doc.xref_get_key(catalog,'Lang')
        tree_check = doc.xref_get_key(catalog,'StructTreeRoot')
    joined = re.sub(r'\s+','', ''.join(texts)).lower()
    must = {
        'event_identifier':fixture['eventId'].replace('-','').lower(),
        'trace_identifier':fixture['traceId'].replace('-','').lower(),
        'explicit_not_verified':'demodata—notverified',
        'not_a_certification':'notacertificationoracompliancefinding',
    }
    checks = {}
    # IDs on pages preserve hyphens; strip '-' separately when comparing.
    compact = re.sub(r'[\s-]+','', ''.join(texts)).lower()
    for key,val in must.items():
        checks[key] = re.sub(r'[-\s]+','',val).lower() in compact
    return {
        'file':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
        'pages':pages,'text':texts,'checks':checks,
        'catalog':{
            'language':str(lang) if lang else None,
            'language_obj':list(lang_check),
            'struct_tree_obj':list(tree_check),
            'struct_tree_present':bool(tree),
            'mark_info_marked':bool(marking and marking.get('/Marked')),
            'struct_roles':dict(counts),'struct_order_sample':sample,
        },
    }


def main():
    fixture=json.loads((OUT / 'fixture.json').read_text('utf-8'))
    plain=inspect('default-browser-style.pdf',fixture)
    tagged=inspect('opt-in-tagged.pdf',fixture)
    same_pages=len(plain['pages'])==len(tagged['pages'])
    texts_equal=plain['text']==tagged['text']
    both_with_content=all(plain['checks'].values()) and all(tagged['checks'].values())
    compare_pages=[]
    for i in range(min(len(plain['pages']),len(tagged['pages']))):
        a=plain['pages'][i]
        b=tagged['pages'][i]
        compare_pages.append({'page':i+1,'dimensions_same':(a['width_pt'],a['height_pt'])==(b['width_pt'],b['height_pt']),
                              'raster_same':a['raster_sha256']==b['raster_sha256']})
    status='OBSERVATION_COMPLETE' if both_with_content and same_pages else 'REVIEW_REQUIRED'
    report={
        'status':status,
        'fixture':fixture,
        'plain':{k:v for k,v in plain.items() if k!='text'},
        'tagged':{k:v for k,v in tagged.items() if k!='text'},
        'comparison':{'same_page_count':same_pages,'same_extracted_text':texts_equal,
                      'page_comparison':compare_pages},
        'interpretation':{
            'native_print_tagging':'NOT_TESTED',
            'tagged_opt_in_is_native_print':'NO',
            'pdf_ua_conformance':'NOT_ASSESSED',
            'screen_reader_reading_order':'NOT_ASSESSED',
            'wcag_pdf_reading_order':'NOT_ASSESSED',
            'limitations':'The two PDFs are generated with Playwright, not the user browser print dialog. Structure tags and tree order are mechanically inventoried, not read/validated through screenreader or PDF/UA conformance tooling. Visible text, A4 pages and checks do not certify accessibility.'
        }
    }
    (OUT / 'analysis.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n','utf-8')
    (OUT / 'default-browser-style.txt').write_text('\n\n===PAGE===\n\n'.join(plain['text']),'utf-8')
    (OUT / 'opt-in-tagged.txt').write_text('\n\n===PAGE===\n\n'.join(tagged['text']),'utf-8')
    print(json.dumps({'status':status,'plain':plain['catalog'],'tagged':tagged['catalog'],
          'comparison':report['comparison'],'content_checks':{'plain':plain['checks'],'tagged':tagged['checks']}},
          indent=2,ensure_ascii=False))
    return 0 if status=='OBSERVATION_COMPLETE' else 1


if __name__=='__main__':
    sys.exit(main())
