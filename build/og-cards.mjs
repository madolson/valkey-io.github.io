#!/usr/bin/env node
// Renders each blog post's og card to its og.png. Serves a built site on 127.0.0.1, has
// headless Chrome screenshot /og-cards/#<slug> at 1200x630 for every card on that page,
// shrinks each PNG to 256 colours with pngquant, then deletes /og-cards/ from the build.
// Fails if a post's og:image points at an og.png that is missing, not 1200x630, or 5 MB or
// more.
//
//   node build/og-cards.mjs [site]      # site defaults to public
//
// Needs Node 20 or later, Chrome or Chromium (set CHROME to pick one), and pngquant.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, open, readdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const site = resolve(process.argv[2] ?? 'public');

function find(names) {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    for (const name of names) if (dir && existsSync(join(dir, name))) return join(dir, name);
  }
}
const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = process.env.CHROME ?? find(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) ?? (existsSync(mac) ? mac : undefined);
const pngquant = find(['pngquant']);
if (!chrome) throw new Error('No Chrome or Chromium found; set CHROME to its path.');
if (!pngquant) throw new Error('No pngquant found; install it (apt-get install pngquant, brew install pngquant).');

async function pngSize(file) {
  const f = await open(file).catch(() => undefined);
  if (!f) return undefined;
  try {
    const head = Buffer.alloc(24);
    await f.read(head, 0, 24, 0);
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20), bytes: (await f.stat()).size };
  } finally {
    await f.close();
  }
}

const cardsPage = join(site, 'og-cards', 'index.html');
const cards = existsSync(cardsPage)
  ? [...(await readFile(cardsPage, 'utf8')).matchAll(/<div class="og-card-frame" id="([^"]+)" data-og="([^"]+)">/g)]
  : [];

const types = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    let file = join(site, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file.endsWith(sep)) file = join(file, 'index.html');
    if (!file.startsWith(site + sep)) throw new Error('outside the site');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'og-cards-'));
try {
  for (const [, slug, og] of cards) {
    const out = join(site, og);
    await run(chrome, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
      '--virtual-time-budget=5000', `--user-data-dir=${profile}`, `--screenshot=${out}`, `${origin}/og-cards/#${slug}`], { timeout: 60000 });
    await run(pngquant, ['--force', '--strip', '--speed=1', '--ext=.png', '256', '--', out]);
  }
} finally {
  server.close();
  await rm(profile, { recursive: true, force: true });
}
await rm(join(site, 'og-cards'), { recursive: true, force: true });

// Check every post whose og:image is its own og.png, whether or not this run drew it.
const problems = [];
for (const dir of await readdir(join(site, 'blog'), { withFileTypes: true })) {
  const page = join(site, 'blog', dir.name, 'index.html');
  if (!dir.isDirectory() || !existsSync(page)) continue;
  const og = `/blog/${dir.name}/og.png`;
  const image = /<meta property="og:image" content="([^"]*)"/.exec(await readFile(page, 'utf8'))?.[1];
  if (!image?.endsWith(og)) continue;
  const png = await pngSize(join(site, og));
  if (!png) problems.push(`${og} is missing`);
  else if (png.width !== 1200 || png.height !== 630) problems.push(`${og} is ${png.width}x${png.height}, not 1200x630`);
  else if (png.bytes >= 5 * 1024 * 1024) problems.push(`${og} is ${png.bytes} bytes, 5 MB or more`);
  else console.log(`${og}  ${png.width}x${png.height}  ${Math.round(png.bytes / 1024)} KB`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
