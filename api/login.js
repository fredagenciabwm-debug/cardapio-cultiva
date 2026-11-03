// POST /api/login  { usuario, senha }
import { credenciaisValidas, criarCookie, loginConfigurado, json, mesmaOrigem } from './_lib/sessao.js';

const espera = ms => new Promise(r => setTimeout(r, ms));

export async function POST(req) {
  if (!mesmaOrigem(req)) return json({ erro: 'Origem não permitida.' }, 403);
  if (!loginConfigurado()) {
    return json({ erro: 'Login ainda não configurado: defina ADMIN_USUARIO e ADMIN_SENHA no Vercel.' }, 500);
  }
  let corpo = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  if (!credenciaisValidas(corpo.usuario, corpo.senha)) {
    await espera(800); // atrasa tentativas de adivinhar a senha
    return json({ erro: 'Usuário ou senha incorretos.' }, 401);
  }
  const usuario = String(corpo.usuario).trim();
  return json({ ok: true, usuario }, 200, { 'Set-Cookie': criarCookie(usuario) });
}
