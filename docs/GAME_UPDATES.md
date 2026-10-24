# Atualizações oficiais do jogo

Rota pública: `#/updates`. Não exige login ou um inventário SWEX.

O conteúdo vem exclusivamente das listagens oficiais de Summoners War: Sky Arena
(jogo Hive **313**), em inglês:

- https://www.withhive.com/notice/game/313
- https://www.withhive.com/event/game/313

Não pressupomos a existência de um RSS não documentado da Hive. O coletor converte
as listagens oficiais em um feed JSON. As estruturas `#notice_list_ul li.row`,
`li.event` e o identificador `goDetailUrlView` também estão documentadas no
[coletor comunitário summoners-bot](https://github.com/rodolphe-moriana/summoners-bot).
O navegador do coletor aguarda o preenchimento das listagens por JavaScript.
Não são necessários cookies de usuário, senha, chave de API ou SWEX.

## Atualização automática e hospedagem estática

O workflow `.github/workflows/game-news.yml` executa ao publicar alterações do
coletor, a cada hora (minuto 17, UTC) e por `workflow_dispatch`. Ele instala o
Chromium do Playwright, roda `npm run news:update` e publica **somente** o arquivo
gerado `public/game-updates.json` na `main`. A permissão `contents: write` permite
esse commit automático. O workflow não depende do deploy de migrações Supabase.

O primeiro preenchimento acontece quando o workflow conclui a coleta inicial;
não há notícias fictícias embutidas. O snapshot é incluído no próximo deploy
estático. Um site exclusivamente estático precisa de deploy automático desse
snapshot ou de uma API Node publicada para receber novas notícias entre builds.
O repositório é privado: o navegador não consulta arquivos privados do GitHub.

## Servidor Node e desenvolvimento

### Vercel (deploy atual)

`api/game-updates.js` publica a API no mesmo domínio do frontend. O executável
serverless de `@sparticuz/chromium` é incluído nas dependências e descompactado em
armazenamento temporário. Não exige instalar Chrome no host ou configurar
segredos. `vercel.json` reserva até 60 segundos para a primeira coleta; instâncias
ativas reutilizam o cache por 5 minutos. A função importa o navegador somente ao
coletar; ele não entra no bundle do frontend. O snapshot agendado é uma alternativa
para indisponibilidades da API e para builds puramente estáticos.

### Node persistente e Vite

Instale o navegador do coletor no host Node (não na máquina de cada jogador):

```sh
npm ci
npx playwright install --with-deps chromium
npm run build
npm start
```

O workflow já instala o Chromium automaticamente. Se o host usa uma instalação
própria de Chromium, configure `NEWS_BROWSER_PATH` com o caminho do executável.

`npm start` e Vite dev/preview expõem `/api/game-updates`, na origem do site.
O serviço consulta diretamente a Hive usando um navegador headless, necessário
para aguardar as listagens preenchidas por JavaScript; deduplica consultas
simultâneas e mantém cache por 5 minutos. A coleta limita a navegação a 30 segundos
e a espera das listagens a mais 20 segundos. Uma falha preserva o último feed válido
em memória ou no snapshot e registra detalhes no console. A rota não aceita URLs
de destino, credenciais ou parâmetros de proxy.

Para um frontend estático com API Node em outro domínio, configure
`VITE_GAME_UPDATES_API_URL=https://seu-backend/api/game-updates` no build e
`NEWS_ALLOWED_ORIGIN=https://seu-site` no servidor. A resposta CORS permite apenas
a origem configurada; nenhuma credencial ou chave administrativa é enviada ao
navegador. A configuração padrão usa a mesma origem, sem necessidade de CORS.

O frontend tenta a API e, se ela falhar, o snapshot `/game-updates.json` do build.
O navegador também mantém a última resposta válida em cache local. Falhas não
apagam notícias já carregadas; a interface identifica conteúdo desatualizado
(mais de 6 horas), fontes parcialmente indisponíveis e estados sem dados.
A página verifica atualizações a cada 5 minutos enquanto estiver visível, além
do botão Atualizar. A coleta acontece automaticamente nas consultas da API, sem
inserção manual de notícias ou acesso ao inventário do usuário.

## Conteúdo e validação

Somente links HTTPS de artigos oficiais Hive são aceitos. Títulos são texto,
nunca HTML executável. Categorias derivam da listagem e do título original;
datas ausentes não são inventadas. Miniaturas HTTPS são opcionais, com fallback
local para a marca tipográfica de Summoners War (`summoners-war-news.svg`).
Notícias e imagens remotas pertencem à Com2uS e aos respectivos titulares.

Se uma listagem falhar, o coletor conserva os artigos anteriores e marca a coleta
como parcial. Se ambas falharem ou mudarem de estrutura, ele termina com erro
sem sobrescrever o arquivo anterior. Consulte os logs de **Sync official
Summoners War news** no GitHub Actions para investigar bloqueios da Hive ou
mudanças de seletores.
