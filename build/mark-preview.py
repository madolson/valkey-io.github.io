#!/usr/bin/env python3
"""Marks a built site as a pull request preview.

    build/mark-preview.py public <pr number> <head commit> <pr url>

Each page gets a noindex robots tag in place of the site's own, and a banner
naming the pull request and commit. The deploy adds X-Robots-Tag: noindex and
a disallow-all robots.txt itself, so this is for readers, not crawlers.

It also removes the analytics, tracking, and consent tags, so previews never
count as valkey.io traffic, and fails if any of those hosts is left anywhere.
"""
import html
import pathlib
import re
import sys

ROBOTS = re.compile(r'<meta\b[^>]*\bname=["\']?robots\b[^>]*>\s*', re.I)
HEAD = re.compile(r'<head\b[^>]*>', re.I)
BODY = re.compile(r'<body\b[^>]*>', re.I)
NOINDEX = '<meta name="robots" content="noindex, nofollow">'
# Google Tag Manager (Google Analytics), the Scarf pixel, and the Transcend consent manager.
TRACKERS = ('googletagmanager.com', 'static.scarf.sh', 'transcend-cdn.com')
ELEMENT = re.compile(r'<(script|noscript|iframe)\b[^>]*>.*?</\1\s*>|<img\b[^>]*>', re.I | re.S)


def untrack(text):
    return ELEMENT.sub(lambda m: '' if any(t in m.group(0) for t in TRACKERS) else m.group(0), text)


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
    tracked = []
    for path in sorted(pathlib.Path(site).rglob('*')):
        if path.suffix not in ('.html', '.js', '.css') or not path.is_file():
            continue
        text = path.read_text(encoding='utf-8', errors='surrogateescape')
        if path.suffix == '.html':
            pages += 1
            text = untrack(text)
            text, _ = HEAD.subn(lambda m: m.group(0) + NOINDEX, ROBOTS.sub('', text), count=1)
            text, found = BODY.subn(lambda m: m.group(0) + banner, text, count=1)
            marked += found
            path.write_text(text, encoding='utf-8', errors='surrogateescape')
        tracked += [f'{path}: {t}' for t in TRACKERS if t in text]
    print(f'Added the preview banner to {marked} of {pages} pages.')
    if not marked:
        sys.exit('No page has a <body> tag, so the banner went nowhere.')
    if tracked:
        sys.exit('Tracking hosts are left in the preview:\n' + '\n'.join(tracked))


if __name__ == '__main__':
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
