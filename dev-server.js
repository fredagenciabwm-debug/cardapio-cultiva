// Servidor para testar no computador, sem Vercel:  npm run dev
// Usa as mesmas funções de /api e salva os dados em .dados-local/
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.env.ADMIN_USUARIO ||= 'cultiva';
process.env.ADMIN_SENHA ||= 'teste123';
const PORTA = Number(process.env.PORT || 3000);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const nome = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
      const mod = await import(pathToFileURL(path.join(raiz, 'api', nome + '.js')).href);
      const fn = mod[req.method];
      if (!fn) { res.writeHead(405).end(); return; }
      const corpo = await new Promise(r => { const b = []; req.on('data', c => b.push(c)); req.on('end', () => r(Buffer.concat(b))); });
      const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : corpo }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let arq = path.normalize(path.join(raiz, decodeURIComponent(url.pathname)));
    if (!arq.startsWith(raiz) || /[\\/](api|\.dados-local)[\\/]/.test(arq.slice(raiz.length))) { res.writeHead(404).end(); return; }
    let st = await stat(arq).catch(() => null);
    if (st?.isDirectory()) { arq = path.join(arq, 'index.html'); st = await stat(arq).catch(() => null); }
    if (!st && !path.extname(arq)) { arq += '.html'; st = await stat(arq).catch(() => null); }
    if (!st) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(await readFile(arq));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end(String(e));
  }
}).listen(PORTA, () => console.log(`Cardápio: http://localhost:${PORTA}   Painel: http://localhost:${PORTA}/admin  (cultiva / teste123)`));
