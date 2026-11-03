// Guarda o cardápio num banco Redis conectado ao projeto no Vercel (Storage).
// Funciona com os dois tipos oferecidos pelo Vercel:
//   • Redis (Redis Cloud)  → variável REDIS_URL
//   • Upstash Redis        → variáveis KV_REST_API_URL / KV_REST_API_TOKEN
// Sem nenhum banco e fora do Vercel (desenvolvimento local), usa um arquivo local.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const CHAVE = 'cultiva:cardapio';
const HISTORICO = 'cultiva:cardapio:historico';
const MAX_HISTORICO = 30;

const URL_REST = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_REST = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const URL_REDIS = process.env.REDIS_URL || process.env.KV_URL;

const temRest = Boolean(URL_REST && TOKEN_REST);
const temRedis = !temRest && Boolean(URL_REDIS);

// ---- Upstash (HTTP) ----
async function rest(comandos) {
  const r = await fetch(`${URL_REST}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_REST}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Banco respondeu ${r.status}`);
  const res = await r.json();
  const erro = res.find(x => x.error);
  if (erro) throw new Error(`Banco: ${erro.error}`);
  return res.map(x => x.result);
}

// ---- Redis Cloud (conexão direta), reaproveitada entre chamadas ----
let clientePromise;
async function cliente() {
  if (!clientePromise) {
    clientePromise = (async () => {
      const { createClient } = await import('redis');
      const c = createClient({ url: URL_REDIS, socket: { connectTimeout: 8000, reconnectStrategy: n => (n > 3 ? false : 300) } });
      c.on('error', e => console.error('Redis:', e.message));
      await c.connect();
      return c;
    })().catch(e => { clientePromise = undefined; throw e; });
  }
  return clientePromise;
}
async function redis(comandos) {
  const c = await cliente();
  const m = c.multi();
  for (const cmd of comandos) m.addCommand(cmd.map(String));
  return m.exec();
}

const executar = cmds => (temRest ? rest(cmds) : redis(cmds));

// ---- desenvolvimento local ----
const ARQUIVO_LOCAL = path.join(process.env.CULTIVA_DADOS_DIR || '.dados-local', 'cardapio.json');

export function armazenamentoConfigurado() {
  return temRest || temRedis || !process.env.VERCEL;
}

export async function lerCardapio() {
  if (temRest || temRedis) {
    const [valor] = await executar([['GET', CHAVE]]);
    return valor ? JSON.parse(valor) : null;
  }
  if (process.env.VERCEL) return null;
  try { return JSON.parse(await readFile(ARQUIVO_LOCAL, 'utf8')); } catch { return null; }
}

export async function salvarCardapio(dados) {
  const json = JSON.stringify(dados);
  if (temRest || temRedis) {
    // guarda também as últimas versões, para poder voltar atrás se algo der errado
    await executar([['SET', CHAVE, json], ['LPUSH', HISTORICO, json], ['LTRIM', HISTORICO, 0, MAX_HISTORICO - 1]]);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error('Banco de dados não configurado. Conecte um banco Redis ao projeto no painel do Vercel (Storage).');
  }
  await mkdir(path.dirname(ARQUIVO_LOCAL), { recursive: true });
  await writeFile(ARQUIVO_LOCAL, json);
}

export async function listarHistorico(qtd = 10) {
  if (!(temRest || temRedis)) return [];
  const [itens] = await executar([['LRANGE', HISTORICO, 0, qtd - 1]]);
  return (itens || []).map(s => JSON.parse(s));
}
