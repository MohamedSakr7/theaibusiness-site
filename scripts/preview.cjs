const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 4175);
const mockSignups = process.argv.includes('--mock-signups');
const previewRequests = [];
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.xml': 'application/xml' };
http.createServer((req, res) => {
  // Explicit local-only UI testing mode. Production configuration is never edited.
  if (mockSignups && req.url === '/resource-config.js?v=1') {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
    return res.end('window.RESOURCE_SIGNUP_CONFIG={endpoint:"http://127.0.0.1:' + port + '/__preview-signups"};');
  }
  if (mockSignups && req.url === '/__preview-signups') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(previewRequests));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const input = JSON.parse(body);
          previewRequests.push({ type: input.type, source: input.source, resource: input.resource,
            namePresent: !!input.name, emailPresent: !!input.email, channel: input.channel });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, status: input.type === 'signup' ? 'created' : 'updated' }));
        } catch (_) { res.writeHead(400); res.end(); }
      });
      return;
    }
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400); return res.end(); }
  if (pathname.split('/').some(part => part.startsWith('.')) || pathname.startsWith('/apps-script/')) { res.writeHead(404); return res.end(); }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const contents = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'text/plain') + (['.html', '.js', '.css', '.json', '.svg', '.xml'].includes(path.extname(file)) ? ';charset=utf-8' : ''), 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : contents);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log('Local preview: http://127.0.0.1:' + port + '/resources/' + (mockSignups ? ' (signups simulated locally)' : '')));
