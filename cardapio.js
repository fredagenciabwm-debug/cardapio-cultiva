/* Cardápio Cultiva — monta as folhas a partir dos dados (JSON) e gera o PDF.
   Usado pelo site público (index.html) e pelo painel (/admin, via iframe). */
(() => {
  // Layout fixo de cada folha: arte do topo/rodapé e posição do título.
  // Só o conteúdo (pratos, descrições, preços, avisos) é editável no painel.
  const LAYOUT = {
    chopes: {
      topo: { src: '/img/p1-topo-v2.webp', w: 1780, h: 270 }, h: 90,
      titulo: { x: 232, y: 15, s: 26.7, linhas: ['chopes'] },
      rodape: { src: '/img/p1-rodape.webp', w: 1780, h: 1026, alt: '' },
      taps: true,
    },
    porcoes: {
      topo: { src: '/img/p2-topo-v2.webp', w: 1780, h: 495 }, h: 165,
      titulo: { x: 234, y: 21, s: 26.7, linhas: ['PORÇÕES'] },
      rodape: { src: '/img/p2-rodape.webp', w: 1780, h: 474, alt: '' },
    },
    pit: {
      topo: { src: '/img/p3-topo-v2.webp', w: 1780, h: 270 }, h: 90,
      titulo: { x: 216, y: 13, s: 21.18, linhas: ['PIT SMOKER', 'MAD MAX'] },
      rodape: { src: '/img/p3-rodape.webp', w: 1780, h: 636, alt: 'Mad Max Pit Smoker e Brasa & Tacho' },
    },
    bebidas: {
      topo: { src: '/img/p4-topo-v2.webp', w: 1780, h: 495 }, h: 165,
      titulo: { x: 234, y: 21, s: 26.7, linhas: ['BEBIDAS'] },
      rodape: { src: '/img/p4-rodape.webp', w: 1780, h: 951, alt: 'Cultive os bons momentos!' },
    },
  };
  const TRACO = '-----------------------------';

  const el = (tag, attrs = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.setAttribute('style', v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== '') n.append(f instanceof Node ? f : String(f));
    return n;
  };
  // texto com quebras de linha ("Enter" no painel) vira <br>
  const comQuebras = (txt = '') => txt.split('\n').flatMap((l, i) => (i ? [el('br'), l] : [l]));
  const reais = v => {
    const s = String(v ?? '').trim();
    return !s ? '' : /^r\$/i.test(s) ? s : 'R$ ' + s;
  };
  const visiveis = itens => (itens || []).filter(i => !i.oculto);

  function folha(sec) {
    const L = LAYOUT[sec.id];
    if (!L) return null;
    const t = L.titulo;
    const h2 = el('h2', { style: `--x:${t.x};--y:${t.y};--s:${t.s};--h:${L.h}` },
      t.linhas.length > 1 ? t.linhas.map((l, i) => el('span', i ? { style: 'margin-top:-.08em' } : {}, l)) : t.linhas[0]);
    const topo = el('header', { class: 'topo' },
      el('img', { src: L.topo.src, width: L.topo.w, height: L.topo.h, alt: 'Cerveja Artesanal Cultiva, 2018' }), h2);

    const conteudo = el('div', { class: 'conteudo' + (L.taps ? ' taps' : '') });
    const blocos = (sec.blocos || []).map(b => ({ ...b, itens: visiveis(b.itens) }))
      .filter(b => b.itens.length || (b.tipo === 'lista' && b.titulo));
    const temNota = !!(sec.nota || '').trim();

    blocos.forEach((b, bi) => {
      const ultimoBloco = bi === blocos.length - 1;
      if (b.titulo) {
        const anterior = blocos[bi - 1];
        if (bi === 0) conteudo.append(el('h3', { class: 'sub' }, b.titulo));
        else if (anterior.tipo === 'lista') conteudo.append(el('h3', { class: 'adicionais' }, b.titulo));
        else conteudo.append(el('h3', { class: 'sub', style: 'margin-top:calc(8 * var(--u))' }, b.titulo));
      }
      if (b.tipo === 'lista') {
        const dl = el('dl', { class: 'lista' });
        b.itens.forEach((it, i) => {
          const pos = [i === 0 && 'primeiro', i === b.itens.length - 1 && 'ultimo'].filter(Boolean).join(' ') || null;
          dl.append(el('dt', { class: i === 0 ? 'primeiro' : null }, el('span', {}, it.nome)),
            el('dd', { class: pos }, reais(it.precos?.[0]?.valor)));
        });
        conteudo.append(dl);
        return;
      }
      b.itens.forEach((it, i) => {
        const art = el('article', { class: 'item' }, el('h3', {}, it.nome));
        if (it.desc) art.append(el('p', { class: 'desc' }, comQuebras(it.desc)));
        if (it.opc) art.append(el('p', { class: 'opc' }, it.opc));
        const precos = (it.precos || []).filter(p => String(p.valor ?? '').trim());
        if (precos.some(p => p.rotulo)) {
          art.append(el('div', { class: 'tamanhos' },
            precos.map(p => el('div', {}, el('span', {}, p.rotulo || ''), el('b', { class: 'preco' }, reais(p.valor))))));
        } else if (precos.length) {
          precos.forEach(p => art.append(el('b', { class: 'preco' }, reais(p.valor))));
        }
        const algoDepois = i < b.itens.length - 1 || !ultimoBloco || temNota;
        if (algoDepois) art.append(el('p', { class: 'traco', 'aria-hidden': 'true' }, TRACO));
        conteudo.append(art);
      });
    });
    if (temNota) conteudo.append(el('p', { class: 'nota' }, comQuebras(sec.nota)));

    const s = el('section', { class: 'pagina', id: sec.id, 'aria-label': sec.nome || sec.id }, topo, conteudo);
    if ((sec.aviso || '').trim()) s.append(el('p', { class: 'aviso' }, sec.aviso));
    s.append(el('figure', { class: 'rodape' },
      el('img', { src: L.rodape.src, width: L.rodape.w, height: L.rodape.h, alt: L.rodape.alt, loading: 'lazy' })));
    return s;
  }

  let observador;
  function render(dados, raiz = document) {
    const secoes = (dados?.secoes || []).filter(s => LAYOUT[s.id] && !s.oculta);
    const main = raiz.querySelector('.folhas');
    main.replaceChildren(...secoes.map(folha).filter(Boolean));
    const ul = raiz.querySelector('.nav ul');
    if (ul) {
      ul.replaceChildren(...secoes.map(s => el('li', {}, el('a', { href: '#' + s.id }, s.nome || s.id))));
      const links = [...ul.querySelectorAll('a')];
      const marcar = id => links.forEach(a => a.setAttribute('aria-current', a.hash === '#' + id ? 'true' : 'false'));
      observador?.disconnect();
      observador = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && marcar(e.target.id)),
        { rootMargin: '-45% 0px -50% 0px' });
      main.querySelectorAll('.pagina').forEach(s => observador.observe(s));
    }
  }

  async function carregarDados() {
    for (const url of ['/api/cardapio', '/dados/cardapio-inicial.json']) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch (_) { /* tenta o próximo */ }
    }
    throw new Error('Não foi possível carregar o cardápio.');
  }

  // ---------- PDF ----------
  const carregarScript = src => new Promise((ok, erro) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Falha ao carregar ' + src));
    document.head.append(s);
  });

  async function esperarRecursos() {
    await document.fonts.ready;
    await Promise.all(['500 12px Montserrat', '600 12px Montserrat', 'italic 400 12px Montserrat', '12px MilhoCozido']
      .map(f => document.fonts.load(f).catch(() => {})));
    const imgs = [...document.querySelectorAll('.folhas img')];
    imgs.forEach(i => { i.loading = 'eager'; });
    await Promise.all(imgs.map(i => (i.complete && i.naturalWidth) ? i.decode().catch(() => {})
      : new Promise(r => { i.onload = i.onerror = r; })));
  }

  // Gera o PDF (A4, uma folha por seção) a partir do que está renderizado na página.
  async function gerarPDF({ nomeArquivo, aoProgredir } = {}) {
    await Promise.all([carregarScript('/vendor/modern-screenshot-4.7.0.js'), carregarScript('/vendor/jspdf-4.2.1.umd.min.js')]);
    await esperarRecursos();
    const { domToJpeg } = window.modernScreenshot;
    const { jsPDF } = window.jspdf;
    const folhas = [...document.querySelectorAll('.folhas .pagina')];
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
    const PW = pdf.internal.pageSize.getWidth(), PH = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < folhas.length; i++) {
      aoProgredir?.(i, folhas.length);
      const f = folhas[i];
      const url = await domToJpeg(f, { scale: 2.5, quality: 0.9, backgroundColor: '#F6F0E3' });
      const ratio = f.offsetHeight / f.offsetWidth;
      if (i) pdf.addPage('a4', 'portrait');
      pdf.setFillColor('#F6F0E3'); pdf.rect(0, 0, PW, PH, 'F');
      // largura total do A4; se a seção ficou mais alta que a folha, reduz para caber inteira
      let w = PW, h = PW * ratio;
      if (h > PH) { h = PH; w = PH / ratio; }
      pdf.addImage(url, 'JPEG', (PW - w) / 2, 0, w, h, undefined, 'FAST');
    }
    aoProgredir?.(folhas.length, folhas.length);
    const hoje = new Date().toLocaleDateString('sv-SE');
    const nome = nomeArquivo || `cardapio-cultiva-${hoje}.pdf`;
    return { blob: pdf.output('blob'), nome };
  }

  // Sinaliza quando a seção não cabe numa folha A4 (útil no painel)
  function alturasEmA4() {
    return [...document.querySelectorAll('.folhas .pagina')].map(f => ({
      id: f.id, proporcao: f.offsetHeight / f.offsetWidth, a4: 841.89 / 595.28,
    }));
  }

  window.Cardapio = { render, carregarDados, gerarPDF, esperarRecursos, alturasEmA4 };
})();
