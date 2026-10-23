# Imagens locais e atualização automática do Summoners War

## Fonte e clone

Fonte pública: https://github.com/swarfarm/swarfarm, branch `master`.
O projeto usa a árvore de arte 2D `herders/static/herders/images`, mantida pela comunidade SWARFARM. A arte do jogo pertence à Com2uS e aos respectivos titulares; o clone conserva o arquivo LICENSE do upstream. A cópia não altera a atribuição dos assets já registrada em `public/game-icons/README.md`.

```sh
npm ci
npm run assets:setup
```

`assets:setup` faz um clone raso com sparse checkout em `public/assets/imagens_sw` quando a pasta não existe. Apenas as imagens, o bestiário público usado para relacionar IDs e os arquivos LICENSE são materializados. O repositório original não executa scripts no projeto.

A pasta é ignorada pelo Git do SwCommandCenter e reconstruída no ambiente de build/servidor. Isso evita versionar novamente centenas de MB e um repositório Git dentro de outro. `predev` e `prebuild` executam a preparação automaticamente; o CI existente continua usando `npm ci` e `npm run build`, sem configuração extra. São necessários Node.js 22+, Git, espaço livre para o clone e acesso HTTPS ao GitHub.

O setup valida diretório, origin e branch antes de qualquer pull. Não usa reset forçado nem descarta alterações locais. Um checkout incompatível interrompe a atualização com erro explícito.

## Retratos e mapeamento dinâmico

As telas usam `src/core/monsters.js` / `MonsterPortrait.jsx`; as exportações compartilham o mesmo resolver. Ícones de habilidades da ficha e do infográfico também priorizam a pasta local de skills. Retratos disponíveis no clone local podem usar:

```text
/assets/imagens_sw/herders/static/herders/images/monsters/<image_filename>
```

Após o setup e cada atualização, o serviço lê o bestiário do clone e gera atomicamente `public/assets/sw-monster-images.json`, com `com2us_id → image_filename`, revisão e data. Só entram nomes de arquivo seguros que existam na pasta local. Esse clone é uma alternativa local; sua fixture pode ficar atrás do bestiário vivo.

O resolver consulta em paralelo o manifesto local e um índice comunitário de imagens SWARFARM, compartilhando as duas requisições entre todos os cards. O índice remoto tem prioridade sobre mapas locais antigos, inclusive para monstros clássicos. Os resultados são revalidados após 15 minutos em novas resoluções; falhas temporárias podem ser tentadas novamente depois de dez segundos. Um ID não presente nos índices é consultado na API SWARFARM por `com2us_id` exato. Somente nomes de arquivo seguros são aceitos. Não se calcula `unit_icon_*` por aritmética nem se substitui um ID desconhecido por outra família.

Fonte dinâmica: [índice comunitário SWARFARM](https://cdn.jsdelivr.net/gh/Millet0217/summonerswar-tool@main/work/icon_map.json), mantido em [Millet0217/summonerswar-tool](https://github.com/Millet0217/summonerswar-tool). Retratos desse índice usam o CDN jsDelivr `.../icons/<image_filename>`; há alternativas SWARFARM e locais. Arquivos novos encontrados somente pela API usam diretamente `https://swarfarm.com/static/herders/images/monsters/<image_filename>`. A disponibilidade e a atualização dos serviços externos continuam necessárias para lançamentos posteriores ao snapshot; o código não assume que uma fixture Git contém todos os arquivos.

O snapshot embarcado foi atualizado de 2.295 para 3.070 IDs a partir do índice público, incluindo 775 IDs adicionais e três correções de nomes de arquivo. Referência da cópia pública dos dados: commit `bcc84f785d316f929f76ad31e0758191291af9dd`, publicado em 10/07/2026. Nenhum atributo, habilidade ou nome exibido foi copiado dessa fonte: a atualização contém somente `ID → arquivo de imagem`. Para atualizar o snapshot completo novamente, execute `npm run images:update`; download incompleto/falho preserva o arquivo anterior. O runtime não depende desse comando para consultar o índice dinâmico. Em ambientes Node atrás de proxy, use o suporte de proxy do runtime (Node 24: `NODE_USE_ENV_PROXY=1 npm run images:update`).

O `onError` de `MonsterPortrait` permanece intacto: se a imagem escolhida falhar, exibe a silhueta cinza local. Um efeito tenta as URLs alternativas do mesmo retrato, sem repetir uma URL que já falhou naquela instância. Se todas falharem, a silhueta permanece. A rejeição de uma URL é preservada quando o índice assíncrono termina de carregar, evitando reintroduzir a fonte com erro. Trocar de monstro/elemento reinicia as tentativas.

`src/core/collab-mapping.js` define `collabMapping`: overrides por nome ou ID são aplicados antes do cache, manifesto e API, para exibir o equivalente original do Summoners War. Os pares conhecidos preservam o elemento (por exemplo Pure Vanilla de Água → Adriana, e de Fogo → Lucia); há também o override explícito Magic Order Swordsinger (Água) → Mage (Água). Apenas a identidade do retrato muda, sem alterar os IDs do inventário, atributos ou habilidades. Para novas exceções, acrescente o nome/ID e o nome/ID de destino nesse dicionário.

A família Ciri tem lookup explícito: `29301–29305` e `29311–29315` usam respectivamente `29711–29715` (Rigna, Reyka, Tirsa, Birgitta e Fiona), arquivos `unit_icon_0151_1_<elemento>.png`. The Witcher e Street Fighter também normalizam os dois formatos de ID para a forma desperta original. O importador já distingue `unit_id` (instância privada da conta) de `unit_master_id` (espécie): avatares usam somente o segundo; trocar o retrato não muda a identidade nem os atributos do monstro no plano.

Antes do slugify, os sufixos Água/Fogo/Vento/Luz/Escuridão/Trevas entre parênteses viram water/fire/wind/light/dark. Espaços e pontuação são normalizados para sublinhados: `Hellhound (Água)` gera `hellhound_water.png`. Quando o manifesto conhece o nome/elemento, usa o `image_filename` real da mesma unidade (normalmente `unit_icon_*.png`). Se a imagem original escolhida falhar, `MonsterPortrait.onError` exibe a silhueta cinza local, sem voltar ao retrato da colaboração.

## Serviço Node e cron

```sh
npm run build
npm start
```

`npm start` inicia `server/index.js`, que serve `dist` e monta a árvore viva de imagens do clone. O agendamento usa **node-cron**:

- Expressão: `59 23 * * 2`.
- Fuso: `America/Sao_Paulo` (terça-feira às 23:59 em São Paulo, independentemente do fuso do host).
- Comando: `git pull --ff-only origin master`, com o diretório de trabalho definido para o clone das imagens.
- `noOverlap` e uma trava de execução evitam pulls simultâneos no mesmo processo.
- Sucesso registra revisão, total de retratos, duração e saída do Git. Falhas registram código e detalhes de rede/Git; o índice anterior é preservado e o próximo agendamento continua ativo.

O servidor usa `PORT=3000` e `HOST=0.0.0.0` por padrão. Para alterar:

```sh
PORT=8080 HOST=127.0.0.1 npm start
```

O processo deve permanecer ativo em uma hospedagem Node com armazenamento gravável/persistente, usando o gerenciador de processos da hospedagem ou systemd. Execute uma única instância do atualizador por checkout. O serviço não acessa o JSON SWEX nem as credenciais de usuários.

**Hospedagem puramente estática não executa node-cron.** O build estático inclui uma cópia das imagens e do manifesto do momento do build; para receber alterações nesse tipo de hospedagem, é necessário gerar/publicar outro build. Para atualização semanal sem rebuild, o tráfego das imagens e do manifesto deve chegar ao serviço Node persistente. O checkout deve ficar em um volume persistente se a plataforma recriar containers.

## Atualização manual e verificação

```sh
npm run assets:update
npm test
npm run build
```

`assets:update` executa imediatamente o mesmo pull e regenera o índice. O scheduler é iniciado apenas pelo backend, nunca pelo browser ou pelo build. A primeira inicialização cria o clone, mas não adiciona um pull fora da agenda quando ele já existe.

Vite e o backend bloqueiam acesso ao `.git` e aos outros arquivos do clone. O build copia somente a árvore de imagens dessa pasta; o bestiário e os metadados Git não entram em `dist`. O manifesto usa `Cache-Control: no-store` no backend; as imagens usam revalidação com ETag para permitir atualizações no mesmo nome de arquivo.

Os testes verificam o horário real do cron, falhas de DNS, recuperação, exclusão de metadados no build, atualização de arquivos servidos sem rebuild, resolução de IDs e caminhos inválidos. A verificação visual usa Chromium/Playwright com o build servido pelo backend Node, incluindo retratos locais, fallback e download do infográfico.
