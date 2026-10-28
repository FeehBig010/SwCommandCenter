# Home cinematográfica

## Arquitetura e escopo

O aplicativo usa React 19, Vite 6 e navegação por hash em `src/App.jsx`. A home continua no destino `portal`; nenhuma rota ou verificação de autorização foi criada ou substituída. Não há biblioteca de animação instalada: os efeitos usam CSS, e o carrossel usa rolagem nativa.

| Cartão | Destino existente |
| --- | --- |
| Minha Conta | `#/dashboard` |
| Build Lab | `#/optimizer` |
| Guild Center | `#/guild-center` |

Os destinos mantêm seus estados vazios, requisitos de sessão e comportamento de refresh. O clique na imagem **seleciona** o cartão; a ação **Entrar** navega usando a função já existente de `App`. A Calculadora Livre continua acessível diretamente por `#/quick` e pelo atalho na home.

O mesmo carrossel também contém os cartões **Calculadora Livre**, **Sincronizar Conta Completa** e **Códigos & Eventos**. Eles exibem os controles originais dentro do cartão selecionado, sem criar rotas ou uma segunda seção de entrada. Os cartões de ferramentas se expandem em largura e altura para acomodar conteúdo legível; Ciri, o balão e o formulário não são miniaturizados. No celular, conteúdo maior usa rolagem interna.

## Componentes

- `CinematicHome.jsx`: composição, cenário e acesso aos serviços anteriores.
- `HomeModuleCards.jsx`: cartões, teclado, controles e carrossel de toque.
- `CinematicHome.css`: estilos isolados pela classe da home.
- `src/core/home-modules.js`: os três destinos originais e os três cartões de ferramentas no array `HOME_CARDS`, além do mapeamento de teclado.
- `EntryPortal.jsx`: exporta os componentes de apresentação reutilizados `AccountEntry`, `CalculatorEntry` e `WelcomeGuide`. A home os monta uma única vez dentro do carrossel, preservando callbacks de upload/login/conta e o estado do formulário.
- `App.jsx`: conecta a nova home à mesma navegação e mantém menu/cabeçalho disponíveis nela.

Nenhum módulo interno, política de acesso, tabela ou fluxo de importação foi alterado. A sanfona/login existente permanece montada durante a seleção de cartões, preservando os valores digitados.

## Movimento e imagens

O primeiro cartão começa selecionado. A entrada usa opacidade e deslocamentos curtos, com defasagem de 85 ms entre cartões, sem bloquear cliques. No desktop, transformações de escala e deslocamento, sombras e `z-index` criam a expansão e a sobreposição. Hover apenas destaca; não muda a seleção.

O cenário anterior permanece visível até a próxima imagem terminar de carregar e decodificar. As camadas fazem uma transição de opacidade de 700 ms. Só o próximo cenário é pré-carregado; existem três imagens fixas. Uma falha conserva o cenário anterior ou o fundo escuro. As artes são WebP derivadas dos assets locais existentes, com procedência em `public/art/home/README.md`; os originais foram preservados. O conjunto novo ocupa menos de 1 MB.

Em telas de até 760 px, os cartões usam carrossel horizontal com snap nativo. Swipe, setas e indicadores atualizam o cartão central; a ação de acesso fica visível no cartão selecionado. O documento não ganha rolagem horizontal.

Os seletores são botões semânticos com `aria-pressed`, foco visível, setas de teclado, Home e End. Enter/Espaço mantêm a interação nativa. Controles de navegação têm 44 px. `prefers-reduced-motion` desativa animações e transições na home e usa rolagem instantânea.

## Validação automatizada

- `tests/home-cinematic.test.mjs`: teclado, caminhos locais, formato/tamanho das imagens e preservação dos originais.
- `tests/browser/home-cinematic.mjs`: seis cartões no mesmo carrossel, ausência da seção inferior, dimensões legíveis da personagem/formulário, seleção, destinos e autorização existentes, refresh, teclado, swipe real via eventos de toque, centralização mobile, tablet, desktop amplo, movimento reduzido, falha de imagens, retenção do formulário de login, importação acionada uma única vez, clipboard e links de resgate.
- O teste de navegador usa endpoints públicos simulados e nenhuma conta real; ele faz parte de `npm run test:browser`.
- Comandos do projeto: `npm test`, `npm run test:browser` e `npm run build`. O projeto não define comando de lint.

As verificações de navegador cobrem Chromium em 390×667, 390×844, 1024×768, 1440×960 e 2560×1440. Não equivalem a testes em hardware móvel real ou Safari. Os módulos internos não receberam refatoração visual.

### Resultado da entrega — 27/10/2026

- `npm test`: 468 testes aprovados, sem falhas ou testes ignorados.
- `npm run test:browser`: os quatro roteiros passaram (privacidade/onboarding, Trade-offs, Guild Intelligence e home cinematográfica), sem erros de execução no navegador.
- `npm run build`: compilação aprovada. Permanece o aviso existente de bundle principal acima de 500 kB; não houve mudança de infraestrutura ou divisão dos módulos internos.
- `git diff --check`: aprovado. Não existe script de lint no projeto.
- A primeira tentativa da suíte unitária, sem acesso a rede, impediu os testes que abrem um servidor HTTP local; a execução completa com acesso permitido passou sem alterar esses testes ou os serviços.
