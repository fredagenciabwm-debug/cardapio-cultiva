// POST /api/logout
import { cookieSaida, json } from './_lib/sessao.js';

export async function POST() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSaida() });
}
