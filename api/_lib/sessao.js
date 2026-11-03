// Login simples por usuário e senha definidos nas variáveis de ambiente do Vercel.
// A sessão é um cookie HttpOnly assinado (HMAC), válido por 7 dias.
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'cultiva_sessao';
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

function segredo() {
  const s = process.env.SESSAO_SEGREDO;
  if (s) return s;
  // sem segredo próprio, deriva da senha (trocar a senha encerra todas as sessões)
  return createHash('sha256').update('cultiva:' + (process.env.ADMIN_SENHA || '')).digest('hex');
}

const assinar = txt => createHmac('sha256', segredo()).update(txt).digest('base64url');

function iguais(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function loginConfigurado() {
  return Boolean(process.env.ADMIN_USUARIO && process.env.ADMIN_SENHA);
}

export function credenciaisValidas(usuario, senha) {
  if (!loginConfigurado()) return false;
  const u = iguais(String(usuario || '').trim().toLowerCase(), process.env.ADMIN_USUARIO.trim().toLowerCase());
  const s = iguais(String(senha || ''), process.env.ADMIN_SENHA);
  return u && s;
}

export function criarCookie(usuario) {
  const exp = Date.now() + DURACAO_MS;
  const payload = `${exp}.${Buffer.from(String(usuario)).toString('base64url')}`;
  const valor = `${payload}.${assinar(payload)}`;
  return `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACAO_MS / 1000}`;
}

export const cookieSaida = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function usuarioDaSessao(req) {
  const cookies = Object.fromEntries((req.headers.get('cookie') || '').split(';')
    .map(c => c.trim().split('=')).filter(p => p.length >= 2).map(([k, ...v]) => [k, v.join('=')]));
  const valor = cookies[COOKIE];
  if (!valor || !loginConfigurado()) return null;
  const partes = valor.split('.');
  if (partes.length !== 3) return null;
  const [exp, u, ass] = partes;
  if (!iguais(ass, assinar(`${exp}.${u}`))) return null;
  if (!(Number(exp) > Date.now())) return null;
  return Buffer.from(u, 'base64url').toString();
}

export function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

// Bloqueia envios vindos de outros sites (além do SameSite do cookie)
export function mesmaOrigem(req) {
  const origem = req.headers.get('origin');
  if (!origem) return true;
  try { return new URL(origem).host === (req.headers.get('x-forwarded-host') || req.headers.get('host')); }
  catch { return false; }
}
