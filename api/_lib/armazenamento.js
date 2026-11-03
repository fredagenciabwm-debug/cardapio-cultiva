// Guarda o cardápio no Upstash Redis (integração do Vercel em Storage → Upstash/Redis).
// Sem as variáveis do Redis e fora do Vercel (desenvolvimento local), usa um arquivo local.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const CHAVE = 'cultiva:cardapio';
const HISTORICO = 'cultiva:cardapio:historico';
const MAX_HISTORICO = 30;

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_REDIS = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(comandos) {
  const r = await fetch(`${URL_REDIS}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_REDIS}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Redis respondeu ${r.status}`);
  const res = await r.json();
  const erro = res.find(x => x.error);
  if (erro) throw new Error(`Redis: ${erro.error}`);
  return res.map(x => x.result);
}

const ARQUIVO_LOCAL = path.join(process.env.CULTIVA_DADOS_DIR || '.dados-local', 'cardapio.json');

export function armazenamentoConfigurado() {
  return Boolean(URL_REDIS && TOKEN_REDIS) || !process.env.VERCEL;
}

export async function lerCardapio() {
  if (URL_REDIS && TOKEN_REDIS) {
    const [valor] = await redis([['GET', CHAVE]]);
    return valor ? JSON.parse(valor) : null;
  }
  if (process.env.VERCEL) return null;
  try { return JSON.parse(await readFile(ARQUIVO_LOCAL, 'utf8')); } catch { return null; }
}

export async function salvarCardapio(dados) {
  const json = JSON.stringify(dados);
  if (URL_REDIS && TOKEN_REDIS) {
    // guarda também as últimas versões, para poder voltar atrás se algo der errado
    await redis([['SET', CHAVE, json], ['LPUSH', HISTORICO, json], ['LTRIM', HISTORICO, 0, MAX_HISTORICO - 1]]);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error('Banco de dados não configurado. Conecte o Upstash Redis ao projeto no painel do Vercel (Storage).');
  }
  await mkdir(path.dirname(ARQUIVO_LOCAL), { recursive: true });
  await writeFile(ARQUIVO_LOCAL, json);
}

export async function listarHistorico(qtd = 10) {
  if (!(URL_REDIS && TOKEN_REDIS)) return [];
  const [itens] = await redis([['LRANGE', HISTORICO, 0, qtd - 1]]);
  return (itens || []).map(s => JSON.parse(s));
}
