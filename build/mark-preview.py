#!/usr/bin/env python3
"""Marks a built site as a pull request preview.

    build/mark-preview.py public <pr number> <head commit> <pr url>

Each page gets a noindex robots tag in place of the site's own, and a banner
naming the pull request and commit. The deploy adds X-Robots-Tag: noindex and
a disallow-all robots.txt itself, so this is for readers, not crawlers.
"""
import html
import pathlib
import re
import sys

ROBOTS = re.compile(r'<meta\b[^>]*\bname=["\']?robots\b[^>]*>\s*', re.I)
HEAD = re.compile(r'<head\b[^>]*>', re.I)
BODY = re.compile(r'<body\b[^>]*>', re.I)
NOINDEX = '<meta name="robots" content="noindex, nofollow">'


def main(site, pr, sha, pr_url):
    if not pr.isdigit() or not re.fullmatch(r'[0-9a-f]{40}', sha):
        sys.exit(__doc__)
    banner = (
        '<div id="pr-preview-banner" style="background:#fff4ce;color:#3b2f00;'
        'border-bottom:1px solid #e0b100;padding:8px 16px;'
        'font:15px/1.4 sans-serif;text-align:center">'
        f'Preview of <a href="{html.escape(pr_url)}">pull request #{pr}</a> '
        f'at commit <code>{sha[:10]}</code>. This is not the real site: '
        '<a href="https://valkey.io/">go to valkey.io</a>.</div>'
    )
    pages = marked = 0
    for path in pathlib.Path(site).rglob('*.html'):
        pages += 1
        text = path.read_text(encoding='utf-8', errors='surrogateescape')
        text, _ = HEAD.subn(lambda m: m.group(0) + NOINDEX, ROBOTS.sub('', text), count=1)
        text, found = BODY.subn(lambda m: m.group(0) + banner, text, count=1)
        marked += found
        path.write_text(text, encoding='utf-8', errors='surrogateescape')
    print(f'Added the preview banner to {marked} of {pages} pages.')
    if not marked:
        sys.exit('No page has a <body> tag, so the banner went nowhere.')


if __name__ == '__main__':
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
