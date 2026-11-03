// Confere e limpa o cardápio enviado pelo painel antes de salvar.
const SECOES = ['chopes', 'porcoes', 'pit', 'bebidas'];
const LIM = { nome: 120, desc: 1200, opc: 300, rotulo: 40, valor: 20, titulo: 120, nota: 1500, aviso: 200, secao: 30 };

const txt = (v, max, multilinha = false) => {
  let s = typeof v === 'string' ? v : v == null ? '' : String(v);
  s = s.replace(/\r\n?/g, '\n');
  s = multilinha ? s.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')
    : s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
};

export function validarCardapio(entrada) {
  const erros = [];
  if (!entrada || !Array.isArray(entrada.secoes)) return { erros: ['Formato inválido.'] };
  const secoes = [];
  for (const s of entrada.secoes) {
    if (!SECOES.includes(s?.id) || secoes.some(x => x.id === s.id)) continue;
    const sec = {
      id: s.id,
      nome: txt(s.nome, LIM.secao) || s.id,
      oculta: Boolean(s.oculta),
      nota: txt(s.nota, LIM.nota, true),
      aviso: txt(s.aviso, LIM.aviso),
      blocos: [],
    };
    for (const b of (Array.isArray(s.blocos) ? s.blocos : []).slice(0, 10)) {
      const tipo = b?.tipo === 'lista' ? 'lista' : 'itens';
      const bloco = { tipo, titulo: txt(b.titulo, LIM.titulo), itens: [] };
      for (const it of (Array.isArray(b.itens) ? b.itens : []).slice(0, 80)) {
        const item = {
          nome: txt(it?.nome, LIM.nome),
          precos: (Array.isArray(it?.precos) ? it.precos : []).slice(0, 4).map(p => ({
            rotulo: tipo === 'lista' ? '' : txt(p?.rotulo, LIM.rotulo),
            valor: txt(p?.valor, LIM.valor).replace(/^r\$\s*/i, ''),
          })).filter(p => p.valor || p.rotulo),
        };
        if (tipo === 'itens') {
          item.desc = txt(it?.desc, LIM.desc, true);
          item.opc = txt(it?.opc, LIM.opc);
        }
        if (it?.oculto) item.oculto = true;
        if (!item.nome) { erros.push(`Há um item sem nome em "${sec.nome}".`); continue; }
        bloco.itens.push(item);
      }
      sec.blocos.push(bloco);
    }
    secoes.push(sec);
  }
  if (!secoes.length) erros.push('Nenhuma seção válida.');
  return { erros, dados: { secoes } };
}
