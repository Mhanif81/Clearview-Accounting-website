// Usage: node screenshot.mjs <url> [label] [width] [height]
// Saves shots to "./temporary screenshots/screenshot-N[-label].png" (never overwrites).
// Uses Edge's built-in headless --screenshot mode (Puppeteer can't hold a session with this Edge install).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BROWSER = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [url = 'http://localhost:3000', label, width = '1440', height = '7000'] = process.argv.slice(2);

const dir = join(process.cwd(), 'temporary screenshots');
if (!existsSync(dir)) mkdirSync(dir);
const n = Math.max(0, ...readdirSync(dir).map(f => +(f.match(/^screenshot-(\d+)/)?.[1] ?? 0))) + 1;
const file = join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`);

spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--user-data-dir=${join(tmpdir(), 'clearview-edge-shot')}`,
  '--virtual-time-budget=4000', `--window-size=${width},${height}`,
  `--screenshot=${file}`, url,
], { stdio: 'ignore' });

// The launcher can exit before the shot is written, so wait for the file to settle.
const start = Date.now();
while (Date.now() - start < 60000) {
  await new Promise(r => setTimeout(r, 500));
  if (existsSync(file) && statSync(file).size > 0) {
    await new Promise(r => setTimeout(r, 500));
    console.log(file);
    process.exit(0);
  }
}
console.error('Timed out waiting for screenshot');
process.exit(1);
