# ArthCz Arena

Central oficial de **ArthCz** na Twitch, no YouTube e no Discord — fighting games
em foco, com os ranks do jogador lidos dos perfis públicos.

Site estático, responsivo, sem backend, sem login e sem banco de dados.

---

## Tecnologia

| Escolha | Por quê |
| --- | --- |
| **Astro 5** | Gera páginas estáticas (HTML puro) com componentes reutilizáveis. Só uma dependência de produção. |
| **CSS puro com design system** | Tokens em `:root` (cores, tipografia, espaçamentos) e estilos com escopo por componente. Sem framework de CSS. |
| **JavaScript mínimo** | Dois scripts curtos: o menu do celular e o menu de seleção de personagens. Nada mais roda no navegador. |
| **Integrações oficiais** | Player e chat da Twitch via embed oficial. Clipes, Shorts e os ranks vêm das APIs e perfis públicos dos canais e do próprio jogador. |

Não há framework de UI, biblioteca de animação ou CSS utilitário.

---

## Estrutura de arquivos

```
F:\Projetos\Site
├─ .github\
│  └─ workflows\
│     └─ publicar.yml           ★ publica o site e relê os perfis todo dia
├─ .gitattributes              mantém o .cmd com fim de linha do Windows
├─ Abrir o site.cmd            ★ duplo clique: sobe o servidor e abre o navegador
├─ astro.config.mjs            configuração do Astro
├─ package.json                scripts e dependências
├─ scripts\
│  ├─ sync-ranks.mjs           ★ busca os ranks e a pontuação de cada personagem
│  ├─ sync-feeds.mjs           ★ busca clipes da Twitch e Shorts do YouTube
│  ├─ fetch-covers.mjs         baixa as capas da coleção de jogos
│  └─ fetch-portrait.mjs       baixa o retrato de um personagem novo
├─ public\
│  ├─ favicon.svg              marca da aba do navegador
│  ├─ brand\
│  │  └─ arthcz-avatar.png     ★ logo real do canal na Twitch
│  ├─ covers\*.webp            capas da seção "Jogos que eu já joguei"
│  ├─ games\
│  │  ├─ street-fighter-6.jpg  capa do SF6
│  │  └─ tekken-8.jpg          capa do Tekken 8
│  └─ roster\
│     ├─ sf6\*.webp            18 retratos + os selos de rank do SF6
│     └─ t8\*.webp             retrato e selo de rank do Tekken 8
└─ src\
   ├─ data\
   │  ├─ site.js               ★ TODO O CONTEÚDO EDITÁVEL FICA AQUI
   │  ├─ jogos.js              ★ a lista de jogos que você já jogou
   │  ├─ ranks.json            ★ ranks e partidas (gerado pelo npm run sync)
   │  ├─ feeds.json            ★ clipes e Shorts (gerado pelo npm run sync)
   │  └─ roster.js             junta o elenco fixo com os dados sincronizados
   ├─ layouts\
   │  └─ Base.astro            <head>, SEO, fontes, navegação e rodapé
   ├─ pages\
   │  └─ index.astro           página inicial (compõe as seções)
   ├─ styles\
   │  └─ global.css            design system: tokens, reset, botões, ornamentos
   └─ components\
      ├─ Nav.astro             navegação + menu do celular
      ├─ Hero.astro            primeira tela (medalhão, nome e fita)
      ├─ Streams.astro         transmissões, vídeos e o bloco de clipes
      ├─ Clips.astro           clipes da Twitch + Shorts do YouTube
      ├─ Games.astro           seção de fighting games
      ├─ GameCard.astro        card de um jogo (capa + menu de seleção)
      ├─ CharacterSelect.astro ★ menu de seleção de personagens e ranks
      ├─ Library.astro         seção "Jogos que eu já joguei"
      ├─ LibraryItem.astro     uma capa + o nome do jogo na coleção
      ├─ Community.astro       Discord, roteiro e chat da Twitch
      ├─ Footer.astro          rodapé com os canais
      ├─ SectionHeader.astro   cabeçalho padrão das seções
      ├─ Brand.astro           medalhão com o logo + nome
      ├─ Ornament.astro        os quatro cantos ornamentais
      ├─ Rule.astro            régua ornamental com losango
      └─ Icon.astro            ícones SVG inline
```

Cada seção da página é um componente independente. Para mudar a ordem das
seções, basta reordenar as tags em `src/pages/index.astro`.

---

## Como rodar no Windows

Requisito: **Node.js 18.17 ou superior** (testado no Node 24). Verifique com:

```powershell
node --version
```

### Jeito mais fácil (um duplo clique)

Na raiz do projeto existe o arquivo **`Abrir o site.cmd`**. Dê um duplo clique nele:

- ele instala as dependências na primeira vez, se faltarem;
- sobe o servidor e abre o navegador em `http://localhost:4321`;
- **para encerrar, basta fechar a janela** — o servidor vai junto.

Se ele reclamar que o Node não foi encontrado, instale a versão LTS em
<https://nodejs.org> e abra de novo.

### Passo a passo pelo terminal

#### 1. Instalar as dependências (só na primeira vez)

```powershell
cd F:\Projetos\Site
npm install
```

### 2. Iniciar o site em modo de desenvolvimento

```powershell
npm run dev
```

Abra no navegador: **http://localhost:4321**

O servidor recarrega sozinho quando você salva qualquer arquivo. Para parar,
volte ao terminal e pressione `Ctrl + C`.

### 3. Gerar a versão final (opcional)

```powershell
npm run build      # gera a pasta dist\ com o site pronto
npm run preview    # testa a versão final em http://localhost:4321
```

A pasta `dist\` é o site completo: pode ser publicada em qualquer hospedagem
estática (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Hostinger etc.).

---

## Sincronizar tudo (o único comando extra)

Nada disso é digitado à mão: os ranks e os clipes são buscados das fontes
públicas e gravados em `src/data/`.

```powershell
npm run sync
```

O comando roda dois scripts, nesta ordem:

**1. `sync-ranks.mjs` → `src/data/ranks.json`**

Busca os personagens, o rank, a pontuação e as partidas de cada um:

| Jogo | Onde busca | O que traz |
| --- | --- | --- |
| Street Fighter 6 | API pública do [SF6 Stats](https://sfstats.app/players/arthcz-3640020287) | elenco completo, rank, MR/LP, partidas e aproveitamento |
| Tekken 8 | [Wavu Wank](https://wank.wavu.wiki/player/33jE68FB8bFd) (rating da comunidade) | partidas, vitórias/derrotas, aproveitamento e rating |

Ele também **baixa o que falta**: o retrato de um personagem novo (arte da wiki
do jogo, mesmo estilo dos atuais) e o selo oficial do rank (material da Capcom).
O que já existe em `public/roster/` não é baixado de novo, então depois da
primeira vez o comando é rápido.

**2. `sync-feeds.mjs` → `src/data/feeds.json`**

1. Pega os **6 clipes mais recentes** do canal na Twitch (título, miniatura,
   duração, visualizações, jogo e data).
2. Pega os **Shorts** do canal no YouTube (título, miniatura e link).

**Detalhes importantes**

- **Não existe chave, token ou login.** São dados públicos do próprio jogador e
  do próprio canal.
- Se uma das fontes falhar, o script **avisa e mantém o que já estava salvo** —
  o site nunca fica sem conteúdo nem inventa nada.
- Rode quando quiser atualizar. O site mostra a data da última leitura dos ranks
  no fim da seção de fighting games.
- Para mudar a quantidade de clipes/Shorts, edite `CLIP_COUNT` / `SHORT_COUNT`
  no topo de `scripts\sync-feeds.mjs`.
- Dá para rodar só um dos dois: `npm run sync:ranks` ou `npm run sync:feeds`.

### Baixar as capas da coleção

```powershell
npm run capas
```

O script lê a lista de `src/data/jogos.js` e salva a capa de cada jogo em
`public\covers\<slug>.webp`, sempre recortada no mesmo formato (300×450):

| Ordem | Fonte | Quando |
| --- | --- | --- |
| 1 | Steam (capa vertical oficial da ficha do jogo) | quase todos |
| 2 | Wikipédia (imagem da caixa) | clássicos de console, arcade e jogos fora da Steam |
| 3 | nada | o site mostra as iniciais do nome no lugar — nunca uma capa inventada |

O que já está em `public\covers\` não é baixado de novo. Para refazer tudo use
`npm run capas -- --forcar`, e para um jogo só
`npm run capas -- --so=tekken-8`. No fim ele lista o que ficou sem capa.

### O único dado que não é automático

O **rank do jogo** e o **Tekken Prowess** do Tekken 8 só existem dentro do
perfil do [ewgf.gg](https://ewgf.gg/player/33jE68FB8bFd), e esse site bloqueia
qualquer leitura automática (proteção Cloudflare). Por isso esses dois campos
ficam escritos à mão no `roster` do Tekken 8, em `src/data/site.js` — o resto
(partidas, aproveitamento e rating) continua vindo do sync. No Street Fighter 6
não existe essa limitação: tudo vem do perfil automaticamente.

---

## Como atualizar o conteúdo

Praticamente tudo é editado em **`src/data/site.js`**. Nenhum arquivo de layout
precisa ser tocado.

### Personagens e ranks (menu de seleção)

O menu mostra os personagens com partidas registradas no perfil, com o rank
atual e a pontuação ao lado de cada um. Os dados vêm de `src/data/ranks.json`
(gerado pelo `npm run sync`) e o elenco fixo — quando existe — de `site.js`:

- **`roster` vazio** → o site usa o elenco gerado pelo sync. É o caso do Street
  Fighter 6: personagem novo entra no site sozinho, sem editar nada.
- **`roster` preenchido** → o site usa exatamente essa lista, completada pelos
  números do sync (casados pelo nome). É o caso do Tekken 8, onde o rank e o
  Prowess precisam ser escritos à mão:

```js
{
  name: 'Bryan Fury',                    // nome exibido
  image: '/roster/t8/bryan-fury.webp',   // retrato em public/roster/
  rank: 'Garyu',                         // rank atual
  rankImage: '/roster/t8/rank-garyu.webp', // selo oficial do rank
  score: '115.268 de Prowess',           // a pontuação junto do rank
  main: true,                            // true deixa esse personagem selecionado
}
```

Os campos `games`, `rate` e `rating` chegam pelo sync e não precisam ser
escritos — se você escrever, o que está no `site.js` tem prioridade.

- Se um jogo tiver **um único personagem**, a grade de retratos não aparece e o
  card vira uma vitrine daquele personagem (é o caso do Tekken 8 hoje, com o
  Bryan). Ao adicionar um segundo, a grade entra sozinha.
- **Rank mudou?** Rode `npm run sync` (Street Fighter 6 se atualiza inteiro).
  No Tekken 8, atualize `rank` e `score` à mão — veja a limitação explicada
  acima.

### Adicionar um personagem

Normalmente não precisa fazer nada: um personagem novo com partidas registradas
aparece sozinho no próximo `npm run sync`, com retrato e selo de rank baixados
na hora.

Se quiser trocar o retrato escolhido, baixe o oficial e aponte no `site.js`:

```powershell
node scripts/fetch-portrait.mjs streetfighter "Sagat" roster/sf6/sagat
node scripts/fetch-portrait.mjs tekken "Bryan Fury" roster/t8/bryan-fury
```

O arquivo é salvo em `public/roster/...` e o comando imprime a linha pronta para
colar no `roster`.

### Adicionar um jogo novo

1. Coloque a capa em `public\games\` (retrato, proporção 2:3, ex.: 600×900).
2. Copie um bloco de `games` e ajuste `slug`, `name`, `meta`, `cover`, `links` e
   o `roster`. O card é gerado sozinho, na ordem da lista.

### Adicionar um jogo à coleção

A seção "Jogos que eu já joguei" é alimentada por `src/data/jogos.js`. Para
incluir um jogo, acrescente uma linha:

```js
{ name: 'Nome no site', slug: 'nome-no-slug', steam: 'Nome na loja da Steam', wiki: 'Título na Wikipédia' },
```

- `slug` vira `public\covers\nome-no-slug.webp` — precisa ser único;
- `steam` é o termo de busca na Steam (ou use `steamId: 12345` quando o nome
  sozinho for ambíguo, como "Resident Evil 4", que tem duas versões);
- `wiki` é o plano B, para jogos que não estão na Steam. Em jogos de console é o
  único caminho.

Depois rode `npm run capas` — ele baixa só a capa que falta. A ordem da lista é
a ordem da parede no site; os 20 primeiros aparecem de cara e o resto abre em
"Ver todos os jogos".

### Trocar o convite do Discord

No objeto `discord` (topo de `src/data/site.js`): `url`, `handle` e o texto do
convite. Ele é usado no botão da primeira tela, no bloco da seção Comunidade e
no rodapé.

### Ativar outros canais no rodapé

Em `socials`, preencha `url` e mude `enabled` para `true`:

```js
{ label: 'X / Twitter', handle: 'arthcz', url: 'https://x.com/arthcz', enabled: true },
```

Canais com `enabled: false` aparecem discretos com o texto "a configurar".

### Trocar canal da Twitch, link do YouTube e metadados

No topo de `src/data/site.js`: objetos `site`, `twitch` e `youtube`.

---

## 🌐 Site publicado

No ar em **https://arthcz.github.io** — GitHub Pages, gratuito, sem cartão e sem
mensalidade.

O arquivo `.github/workflows/publicar.yml` cuida de tudo:

- a cada envio para a `main`, gera o site e publica;
- **todo dia às 06:00** (horário de Brasília) relê ranks, pontuações, retratos,
  emblemas e clipes dos perfis públicos e republica — ninguém precisa fazer nada;
- também dá para disparar na mão pela aba **Actions** do repositório.

Se alguma dessas fontes estiver fora do ar na hora, o script mantém os dados
anteriores e **a data mostrada no site não avança** — o site nunca diz "lido
hoje" exibindo número velho.

O endereço `arthcz.github.io` exige que o repositório se chame
`ArthCz.github.io`: é isso que faz o site ocupar a raiz do endereço, sem
subpasta (e por isso nenhum caminho interno precisa de ajuste).

### Se um dia você tiver um domínio próprio

Três lugares apontam para o endereço atual:

1. **`site`** em `astro.config.mjs`;
2. **`site.url`** em `src/data/site.js` — usado no `<link rel="canonical">`;
3. **`twitch.parents`** — a Twitch exige que o player e o chat informem em quais
   domínios podem ser exibidos:

```js
parents: ['arthcz.github.io', 'localhost', '127.0.0.1'],
```

Sem o domínio nessa lista, o player e o chat funcionam no seu computador mas
ficam bloqueados no site publicado. Também é possível desligar os embeds sem
mexer no layout: `twitch.playerEmbed` e `twitch.chatEmbed`.


---

## Direção visual

A identidade parte da arte do próprio canal, não de um template:

- **Base preta** (`#050506`) com texto em prata (`#ece8e1`) — o mesmo par da arte
  de "offline" do canal.
- **Moldura fina com cantos ornamentais geométricos**, régua com losango e **fita
  branca com pontas recortadas** (o componente `Ribbon`) — tirados da mesma arte.
- **Aberração cromática** no nome (deslocamento vermelho/ciano), a assinatura do
  banner do canal, aplicada na classe `.aberrate`.
- **Vermelho carmesim** (`#c8102e`) como único acento, extraído da iluminação do
  logo do canal. Ele aparece só em botões, selos e na seleção do personagem.
- **Tipografia**: Cormorant Garamond (serifada) nos títulos, Inter no texto e
  Pirata One (gótica) na fita — o mesmo contraste da arte do canal.
- O **logo real da Twitch** (`public/brand/arthcz-avatar.png`) é o medalhão da
  primeira tela, do topo e do rodapé.
- No menu de seleção, os retratos ficam **em preto e branco** e ganham cor no
  personagem escolhido — a seleção é o destaque, não a decoração.

Zero neon, zero gradiente decorativo, zero borda grossa, zero biblioteca de
animação. O único movimento é o feedback de hover e foco.

Acessibilidade: HTML semântico, foco visível, link "pular para o conteúdo",
navegação por teclado no menu de seleção (padrão ARIA de abas, com as setas),
contraste alto (Lighthouse 100 em acessibilidade) e respeito a
`prefers-reduced-motion`.

---

## Aviso

Site independente, sem vínculo com Twitch Interactive, Inc., YouTube / Google
LLC, Discord Inc., Capcom ou Bandai Namco Entertainment Inc.

As capas dos jogos, os retratos dos personagens e as marcas citadas pertencem aos
seus respectivos detentores e são usados apenas para identificar os títulos e os
personagens do próprio jogador.
