// GET  /api/cardapio  → cardápio atual (público)
// PUT  /api/cardapio  → salva o cardápio (exige login)
import { lerCardapio, salvarCardapio } from './_lib/armazenamento.js';
import { usuarioDaSessao, json, mesmaOrigem } from './_lib/sessao.js';
import { validarCardapio } from './_lib/validar.js';
import inicial from './_lib/inicial.js';

export async function GET() {
  try {
    const dados = (await lerCardapio()) || { ...inicial, atualizadoEm: null };
    return json(dados);
  } catch (e) {
    console.error(e);
    return json({ ...inicial, atualizadoEm: null, aviso: 'Usando cardápio padrão (falha ao ler o banco).' });
  }
}

export async function PUT(req) {
  const usuario = usuarioDaSessao(req);
  if (!usuario) return json({ erro: 'Sessão expirada. Entre novamente.' }, 401);
  if (!mesmaOrigem(req)) return json({ erro: 'Origem não permitida.' }, 403);
  const corpo = await req.text();
  if (corpo.length > 300_000) return json({ erro: 'Cardápio grande demais.' }, 413);
  let entrada;
  try { entrada = JSON.parse(corpo); } catch { return json({ erro: 'JSON inválido.' }, 400); }
  const { erros, dados } = validarCardapio(entrada);
  if (erros.length) return json({ erro: erros[0], erros }, 422);
  dados.atualizadoEm = new Date().toISOString();
  dados.atualizadoPor = usuario;
  try {
    await salvarCardapio(dados);
  } catch (e) {
    console.error(e);
    return json({ erro: e.message || 'Falha ao salvar.' }, 500);
  }
  return json(dados);
}
