/**
 * ArthCz Arena — configuração central
 * ---------------------------------------------------------------------------
 * Todo o conteúdo editável do site vive neste arquivo.
 *
 *  1. site      → identidade e metadados
 *  2. navLinks  → itens da navegação
 *  3. twitch    → canal, links e embeds oficiais
 *  4. youtube   → canal
 *  5. discord   → convite do servidor
 *  6. games     → fighting games + o que é fixo de cada jogo
 *  7. community → roteiro da comunidade
 *  8. socials   → canais exibidos no rodapé
 *
 * Dados que mudam sozinhos ficam em arquivos separados, atualizados pelo
 * comando `npm run sync`:
 *  - src/data/ranks.json → ranks, pontuação e partidas de cada personagem
 *  - src/data/feeds.json → clipes da Twitch e shorts do YouTube
 */

export const site = {
  name: 'ArthCz Arena',
  short: 'ArthCz',
  tagline: 'Central oficial de ArthCz na Twitch, no YouTube e no Discord.',
  description:
    'ArthCz Arena é a central oficial das lives de ArthCz na Twitch, no YouTube e no Discord: fighting games, clipes recentes e a comunidade da arena.',
  // Endereço público do site (usado em <link rel="canonical">).
  url: 'https://arthcz.github.io',
};

export const navLinks = [
  { label: 'Início', href: '#inicio' },
  { label: 'Transmissões', href: '#transmissoes' },
  { label: 'Fighting games', href: '#fighting-games' },
  { label: 'Jogos', href: '#jogos' },
  { label: 'Comunidade', href: '#comunidade' },
];

export const twitch = {
  channel: 'arthcz',
  label: 'ArthCz',
  url: 'https://www.twitch.tv/arthcz',
  clipsUrl: 'https://www.twitch.tv/arthcz/clips',
  chatUrl: 'https://www.twitch.tv/arthcz/chat?popout=',
  // Domínios autorizados a exibir o player e o chat da Twitch (a própria
  // Twitch exige o parâmetro `parent`). O primeiro é o site publicado; os
  // outros dois servem para testar na sua máquina.
  parents: ['arthcz.github.io', 'localhost', '127.0.0.1'],
  playerEmbed: true,
  chatEmbed: true,
};

export const youtube = {
  handle: '@arthczlives6592',
  label: 'ArthCz',
  url: 'https://www.youtube.com/@arthczlives6592',
  shortsUrl: 'https://www.youtube.com/@arthczlives6592/shorts',
  channelId: 'UCQ9dfAa7RFuQHL-f81RoNqg',
};

export const discord = {
  label: 'Discord',
  handle: 'discord.gg/zwPJ5HH6S',
  url: 'https://discord.gg/zwPJ5HH6S',
  title: 'Discord da arena',
  text: 'Combine partidas, treine sets, tire dúvidas de personagem e acompanhe os avisos das lives com quem joga junto.',
  cta: 'Entrar no servidor',
};

/**
 * Fighting games
 * ---------------------------------------------------------------------------
 * Cada jogo aponta para o perfil público de onde os números vêm. O elenco
 * mostrado no menu de seleção de personagens sai de src/data/ranks.json:
 *
 *  - `roster` VAZIO  → o site usa o elenco gerado pelo `npm run sync`
 *                      (é o caso do Street Fighter 6: todos os personagens
 *                      com partidas registradas no perfil, com o rank atual).
 *  - `roster` com itens → o site usa exatamente esta lista, enriquecida pelos
 *                      números do sync. Use quando algum dado não puder ser
 *                      lido automaticamente (é o caso do Tekken 8).
 *
 * Campos de cada personagem:
 *  - name      → nome exibido (precisa bater com o nome do perfil)
 *  - image     → retrato em public/roster/<jogo>/
 *  - rank      → rank atual (vem do perfil)
 *  - rankImage → selo oficial do rank (imagem)
 *  - score     → a pontuação junto do rank (MR, LP, Prowess…)
 *  - games     → partidas registradas
 *  - rate      → aproveitamento (opcional)
 *  - rating    → rating da comunidade, quando existir (opcional)
 *  - main      → true deixa o personagem já selecionado no menu
 *
 * No Street Fighter 6 o elenco inteiro vem do perfil, e o perfil erra o
 * "principal" com frequência: por isso ele é declarado abaixo.
 *  - mainCharacter → personagem que leva o selo "Principal" no menu
 *
 * Perfis públicos que o sync lê:
 *  - Street Fighter 6 → https://sfstats.app/players/arthcz-3640020287
 *  - Tekken 8         → https://wank.wavu.wiki/player/33jE68FB8bFd
 */
export const games = [
  {
    slug: 'street-fighter-6',
    index: '01',
    name: 'Street Fighter 6',
    meta: '2D Fighter · Capcom',
    cover: '/games/street-fighter-6.jpg',
    links: {
      official: 'https://www.streetfighter.com/6/',
      profile: 'https://sfstats.app/players/arthcz-3640020287',
    },
    mainCharacter: 'Cammy',
    // Elenco, ranks e selos são gerados pelo `npm run sync` a partir do perfil.
    roster: [],
  },
  {
    slug: 'tekken-8',
    index: '02',
    name: 'Tekken 8',
    meta: '3D Fighter · Bandai Namco',
    cover: '/games/tekken-8.jpg',
    links: {
      official: 'https://www.tekken.com/',
      profile: 'https://ewgf.gg/player/33jE68FB8bFd',
    },
    // O rank do jogo e o Tekken Prowess existem apenas no perfil (ewgf.gg),
    // que bloqueia leitura automática — por isso ficam escritos à mão aqui.
    // Partidas, aproveitamento e rating chegam pelo `npm run sync`.
    roster: [
      {
        name: 'Bryan Fury',
        image: '/roster/t8/bryan-fury.webp',
        rank: 'Garyu',
        rankImage: '/roster/t8/rank-garyu.webp',
        score: '115.268 de Prowess',
        main: true,
      },
    ],
  },
  // Para acrescentar um jogo, copie um dos blocos acima, ajuste os dados,
  // coloque a capa em public/games/ e os retratos em public/roster/<slug>/.
  // O card é gerado sozinho, na ordem desta lista.
];

export const community = {
  eyebrow: 'Comunidade',
  title: 'A arena também é do chat',
  lead: 'Entre no servidor do Discord, converse no chat da Twitch e acompanhe os canais da arena.',
};

export const socials = [
  { label: 'Twitch', handle: 'arthcz', url: twitch.url, enabled: true },
  { label: 'YouTube', handle: youtube.handle, url: youtube.url, enabled: true },
  { label: 'Discord', handle: discord.handle, url: discord.url, enabled: true },
  { label: 'X / Twitter', handle: '@arthcz', url: 'https://x.com/arthcz', enabled: true },
  { label: 'Instagram', handle: '@arthcalazans', url: 'https://www.instagram.com/arthcalazans', enabled: true },
];
