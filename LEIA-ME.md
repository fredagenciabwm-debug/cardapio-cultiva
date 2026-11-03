# Cardápio Cultiva: site + painel de edição

- **/**: cardápio público (mesmo layout de antes, agora lendo os dados do banco)
- **/admin**: painel com login para editar seções, pratos, descrições e preços, e para **baixar o PDF** em A4

## Publicar no Vercel (uma vez só)

1. Suba esta pasta para o repositório do GitHub (substituindo o conteúdo antigo) e importe/atualize o projeto no Vercel.
   Não precisa de build: em *Framework Preset*, deixe **Other**.
2. **Banco de dados**: no projeto do Vercel, vá em **Storage → Create Database** e escolha **Redis** ou **Upstash (Redis)**
   (os dois funcionam; o plano grátis basta) e clique em **Connect** para ligar ao projeto. As variáveis
   (`REDIS_URL` ou `KV_REST_API_URL`/`KV_REST_API_TOKEN`) são criadas automaticamente.
3. **Login**: em **Settings → Environment Variables**, crie:
   | Nome | Valor |
   |---|---|
   | `ADMIN_USUARIO` | o usuário do painel (ex.: `cultiva`) |
   | `ADMIN_SENHA` | uma senha forte |
   | `SESSAO_SEGREDO` | *(opcional)* um texto aleatório longo |
4. Faça um **Redeploy** para as variáveis valerem.
5. Acesse `seu-dominio/admin`, entre e edite. Ao clicar em **Salvar alterações**, o cardápio público atualiza na hora.

Enquanto nada for salvo pelo painel, o site mostra o cardápio original (`dados/cardapio-inicial.json`).
O banco guarda as últimas 30 versões salvas (chave `cultiva:cardapio:historico`), então dá para recuperar uma versão anterior.

## Usando o painel

- Abas = seções (Chopes, Porções, Pit Smoker, Bebidas). O número mostra quantos itens cada uma tem.
- Em cada item: nome, descrição (o Enter vira quebra de linha), opções e preço (ou vários tamanhos, como pint e caneca).
- ↑ ↓ reordenam · 👁 oculta o item temporariamente (ex.: em falta) sem apagar · 🗑 exclui.
- **Baixar PDF** gera o cardápio em A4, uma folha por seção, com o visual do site. Se uma seção crescer além de uma folha,
  ela é reduzida para caber, e o painel avisa.
- Ctrl+S (ou Cmd+S) salva.

## Testar no computador

```
npm run dev
```
Abre em http://localhost:3000 (painel em /admin, usuário `cultiva`, senha `teste123`). Os dados ficam em `.dados-local/`.

## Fonte dos títulos (Milho Cozido)

A fonte veio extraída do PDF original e só tem os caracteres que apareciam nele. Os que faltam
(por exemplo `7 8 9`, `W`, `Y`, `É`, `Ê`, `Â`, `Ô`, `!`) aparecem automaticamente em Montserrat.
Para ter tudo na fonte certa, converta o arquivo completo da Milho Cozido (.ttf/.otf) para woff2 e substitua
`fonts/milho-cozido.woff2`, com o mesmo nome.

## Estrutura

```
index.html            cardápio público
cardapio.css / .js    layout das folhas + montagem a partir dos dados + geração do PDF
admin/index.html      painel
api/                  funções do Vercel (login, sessão, salvar/ler cardápio)
dados/                cardápio inicial
img/ fonts/ vendor/   artes, fontes e bibliotecas do PDF (jsPDF, modern-screenshot)
```
