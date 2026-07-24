# VIDARIX — Descubra, escolha e compartilhe o que assistir

A **VIDARIX** é uma plataforma brasileira de descoberta de filmes e séries criada para resolver um problema simples e recorrente: passar mais tempo escolhendo o que assistir do que aproveitando o conteúdo.

O projeto reúne catálogo, disponibilidade nos streamings brasileiros, listas pessoais, recomendações, roleta cinematográfica e uma camada social voltada para amizades, grupos e conversas sobre cada título.

---

## Por que a VIDARIX foi criada

A quantidade de filmes, séries e serviços de streaming cresceu, mas a experiência de escolha continua fragmentada. Normalmente o usuário precisa alternar entre vários aplicativos, pesquisar onde o título está disponível, comparar avaliações, consultar amigos e ainda decidir o que combina com o momento.

A VIDARIX foi criada para centralizar essa jornada em uma experiência única, visual e personalizada. A proposta não é reproduzir conteúdo, mas ajudar o usuário a **descobrir, decidir, organizar e compartilhar** o que pretende assistir.

---

## O problema

A experiência tradicional de descoberta apresenta alguns obstáculos:

- excesso de opções e dificuldade de decisão;
- catálogos separados em diferentes plataformas;
- falta de uma visão clara sobre onde assistir no Brasil;
- listas pessoais espalhadas entre aplicativos;
- recomendações genéricas, sem considerar preferências e streamings assinados;
- conversas sobre filmes e séries desconectadas do próprio título;
- risco de spoilers em comentários e grupos;
- dificuldade para combinar uma sessão com amigos.

---

## A solução

A VIDARIX concentra as principais etapas da descoberta audiovisual:

1. apresenta títulos e tendências usando dados do TMDB;
2. mostra provedores disponíveis no Brasil;
3. permite salvar, avaliar e marcar títulos como assistidos;
4. utiliza preferências pessoais na descoberta;
5. oferece uma roleta para reduzir a indecisão;
6. conecta amigos para recomendações e conversas;
7. cria comunidades ligadas a filmes, séries e interesses;
8. protege comentários marcados como spoiler;
9. organiza notificações sociais em um único painel.

---

## Funcionalidades principais

### Catálogo e descoberta

- filmes e séries em alta;
- títulos populares e mais bem avaliados;
- pesquisa global;
- filtros por tipo, gênero, nota e plataforma;
- detalhes completos, sinopse, elenco, trailer e classificação;
- disponibilidade no Brasil para assinatura, aluguel e compra.

### Roleta VIDARIX

- sorteio por gênero;
- sorteio por streaming;
- sorteio entre títulos escolhidos;
- modo surpresa baseado no perfil;
- exclusão de títulos já assistidos;
- histórico dos resultados;
- modal cinematográfico com o título vencedor.


### Criação de conta e personalização inicial

Ao criar uma conta, o usuário passa por uma experiência guiada de quatro etapas:

1. criação da conta com nome, usuário, e-mail e senha;
2. seleção dos serviços de streaming utilizados;
3. escolha dos gêneros favoritos;
4. definição da preferência entre filmes e séries, estilo de descoberta e privacidade do perfil.

Essas respostas alimentam catálogo, roleta, perfil e recomendações. A aplicação continua acessível como visitante, mas login e cadastro permitem sincronizar os dados pelo Supabase.

As rotas de autenticação disponíveis são:

```text
/entrar
/criar-conta
/recuperar-senha
/redefinir-senha
```

O frontend utiliza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Segredos e chaves administrativas nunca devem receber o prefixo `VITE_`.

### Perfil e preferências

- foto, nome de exibição, usuário e biografia;
- streamings assinados;
- gêneros favoritos e gêneros a evitar;
- preferência entre filmes e séries;
- nota mínima e duração máxima;
- controles de privacidade;
- listas, histórico e estatísticas pessoais.

### Minha Lista

- Quero Assistir;
- Já Assisti;
- Favoritos;
- avaliações e anotações pessoais.

---

## Comunidade VIDARIX

A atualização social transforma a plataforma em uma rede de descoberta cinematográfica.

### Amigos

- pedidos de amizade;
- aceitar ou recusar solicitações;
- encontrar novos usuários;
- visualizar amigos online;
- remover conexões;
- acesso rápido às conversas privadas.

### Recomendações

Em qualquer filme ou série, o usuário pode selecionar amigos ou grupos, escrever uma mensagem e enviar uma recomendação. A área de recomendações mostra:

- indicações recebidas;
- recomendações enviadas;
- status da recomendação;
- ação para abrir ou adicionar o título à lista.

### Conversas privadas

- chat individual entre amigos;
- compartilhamento de títulos dentro da conversa;
- histórico local das mensagens;
- indicação de presença online.

### Grupos

- grupos públicos ou privados;
- criação de grupos;
- participação e saída de grupos;
- chat coletivo;
- lista coletiva de títulos;
- base preparada para roletas exclusivas dos grupos.

### Comunidade de cada título

Cada filme ou série possui uma área própria com:

- comentários;
- chat do título;
- teorias;
- avaliações de 1 a 10;
- curtidas;
- marcação e ocultação de spoilers.

### Feed e notificações

- atividade dos amigos;
- pedidos de amizade;
- recomendações;
- mensagens e participação em grupos;
- sino com contador de notificações não lidas;
- opção para marcar todas como lidas.

---

## Funcionamento dos dados sociais

A interface social funciona em modo local para permitir demonstração e desenvolvimento sem depender imediatamente de um backend. Os dados ficam armazenados no navegador.

O banco inicial do Supabase está versionado em:

```text
supabase/migrations/20260724130800_vidarix_initial_schema.sql
```

Essa migration cria perfis, preferências, streamings, gêneros, listas, avaliações, histórico da roleta, políticas RLS e o bucket de avatares. Amizades, grupos e mensagens reais devem ser adicionados em migrations posteriores.

---

## Tecnologias

- React 19;
- TypeScript;
- Tailwind CSS 4;
- Vite;
- Express;
- Supabase;
- TMDB API;
- JustWatch via TMDB;
- Lucide React;
- Canvas Confetti;
- Web Audio API;
- PWA com Service Worker.

---

## Estrutura social adicionada

```text
src/pages/CommunityPage.tsx
src/components/NotificationPanel.tsx
src/components/RecommendModal.tsx
src/components/TitleCommunity.tsx
src/services/socialService.ts
src/vidarix-social.css
supabase/migrations/20260724130800_vidarix_initial_schema.sql
```

---

## Privacidade, segurança e moderação

A evolução da área social deve manter:

- bloqueio de usuários;
- denúncia de comentários e mensagens;
- grupos privados com aprovação;
- controle de visibilidade do perfil;
- marcação obrigatória de spoilers;
- políticas RLS no Supabase;
- acesso às conversas somente pelos participantes;
- ferramentas de administração de grupos.

---

## Avisos legais e atribuição

- A VIDARIX é uma plataforma independente de descoberta cinematográfica.
- A plataforma não hospeda, transmite ou disponibiliza obras audiovisuais.
- Dados de filmes e séries são fornecidos pelo TMDB.
- Informações de disponibilidade em streaming são fornecidas pelo JustWatch através do TMDB.
