// usage: node capture.js <outdir> <seconds> [stillTimes...]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = __dirname, OUT = process.argv[2], SEC = parseFloat(process.argv[3]), FPS = 30;
const stills = process.argv.slice(4).map(Number);
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' });
  fs.createReadStream(p).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 216, height: 384 } });
  page.on('console', m => console.log('page:', m.text()));
  await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || "scene.html"}`);
  await page.waitForFunction(() => window.ready === true);
  if (process.env.TIMES) await page.evaluate(x => { window.T = JSON.parse(x); }, process.env.TIMES);
  const times = stills.length ? stills : [...Array(Math.round(SEC * FPS)).keys()].map(i => i / FPS);
  const meta = [];
  for (let i = 0; i < times.length; i++) {
    const r = await page.evaluate(t => window.renderAt(t), times[i]);
    fs.writeFileSync(path.join(OUT, `f${String(i).padStart(4, '0')}.png`), Buffer.from(r.img.split(',')[1], 'base64'));
    const { img, ...rest } = r; meta.push({ t: times[i], ...rest });
  }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
  await b.close(); server.close();
  console.log('frames', times.length);
});
