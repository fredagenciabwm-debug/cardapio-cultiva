// GET /api/sessao → diz se há alguém logado (usado pelo painel ao abrir)
import { usuarioDaSessao, loginConfigurado, json } from './_lib/sessao.js';
import { armazenamentoConfigurado } from './_lib/armazenamento.js';

export async function GET(req) {
  return json({
    usuario: usuarioDaSessao(req),
    loginConfigurado: loginConfigurado(),
    bancoConfigurado: armazenamentoConfigurado(),
  });
}
