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

As telas usam `src/core/monsters.js` / `MonsterPortrait.jsx`; as exportações compartilham o mesmo resolver. Ícones de habilidades da ficha e do infográfico também priorizam a pasta local de skills. A primeira opção de cada retrato é:

```text
/assets/imagens_sw/herders/static/herders/images/monsters/<image_filename>
```

Após o setup e cada atualização, o serviço lê o bestiário do clone e gera atomicamente `public/assets/sw-monster-images.json`, com `com2us_id → image_filename`, revisão e data. Só entram nomes de arquivo seguros que existam na pasta local. O frontend consulta esse manifesto uma vez por carregamento da página, incluindo para IDs recentes ou nomes de arquivo alterados. Ele não precisa de um novo bundle para usar o índice atualizado no servidor Node.

O mapa embarcado, o cache local anterior, os hosts públicos do SWARFARM e a silhueta padrão continuam como alternativas. Nenhum erro de imagem deixa o ícone quebrado no layout. Uma página já aberta consulta o novo índice ao ser recarregada.

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
