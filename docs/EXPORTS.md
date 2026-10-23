# Infográficos de times

Todos os botões existentes de imagem usam `ExportTemplate.jsx` e o pipeline `exportTeamInfographic` em `quick-card-png.js`. Isso inclui Calculadora Livre, editores Siege/Arena, Cairos, painéis PvE (Dimensional, Rift e ToA), catálogo do clã, planejador de defesas e composições compartilhadas. O compartilhamento por link/QR continua independente.

O template é montado em um host absoluto fora da tela apenas durante a exportação e removido em `finally`. Não usa elementos, inputs, sliders ou navegação do editor como alvo. O layout fixa 1280 pixels CSS e captura em escala 2: PNG com 2560 pixels de largura em desktop ou celular. Três monstros usam um acima e dois abaixo; cinco usam um acima e dois pares abaixo; quatro e seis usam duas colunas. A altura acompanha o conteúdo.

## Conteúdo e origem

- Banner por área, contexto/chefe/counter, nome e descrição fornecidos pelo usuário. Fundo local de castelo, arena ou respectiva área PvE. A referência visual do usuário orientou composição, molduras bronze/douradas, painéis escuros, bônus verdes e estrelas de despertar roxas; artes de fundo e ícones já existentes continuam sendo os assets do projeto.
- HP, ATK, DEF e SPD em Base + Bônus de ficha; TC/DC/RES/ACC totais. SPD de combate fica destacada separadamente, incluindo os efeitos do cenário. Runas +SPD e bônus manual de artefato são discriminados.
- Seis sockets de runas com ícone do conjunto e nível por posição, dois sockets de artefatos, habilidades e nível conhecido, Leader Skill e líder selecionado. Conjuntos desejados/equipados são diferenciados, incluindo conjuntos repetidos e incompletos.
- Na Calculadora Livre, a ficha atual e a prévia de ticks são autoritativas. Nas outras áreas, uma build otimizada válida tem prioridade; depois vem o loadout local/SWEX. Presets com equipamentos salvos usam as referências daquele preset. As opções de artefatos são respeitadas. IDs de conta, unidade e inventário não entram nas props do template.
- Templates de clã/compartilhamentos sem inventário mantêm totais e bônus desconhecidos como `—`, com metas separadamente rotuladas. Bases do catálogo são de planejamento em Lv.40/6★; nível/estrelas do SWEX prevalecem quando conhecidos. Nenhuma runa é inventada para preencher os sockets.
- Ordem por ticks inteiros com nomes, inimigos e ações incapacitadas. A Calculadora Livre exporta a estratégia automática do slot 1: auditoria por boost ou escada exata de 1 SPD sem boost; ambas conferem a ordem efetivamente simulada; outros times são identificados como cenário informado. Segurança não é garantida contra procs e condições não modeladas.

## Imagens e download

O carregador resolve imagens locais/CORS para data URLs, aguarda decode/fontes e só então monta o template. Retratos reutilizam a busca atual e a silhueta local; ícones de habilidade ausentes mantêm a posição S1/S2/S3. O fundo é obrigatório: se falhar, a UI informa o erro e libera o botão sem baixar um poster sem cenário.

`html2canvas` recebe somente a raiz do template, `useCORS:true`, `allowTaint:false`, `backgroundColor:null` e escala 2. O clone reposiciona o host para a origem de captura. O arquivo baixa automaticamente como `sw_infographic_[timestamp].png`. Cancelamento por desmontagem aborta carregamentos e impede download posterior; limpeza do host ocorre tanto no sucesso quanto na falha.

## Verificação

Regressões de dados cobrem ficha versus metas, equipamentos vazios, loadout salvo e artefatos do preset, privacidade, IDs novos, contagens por área, templates sem equipamento e prioridade da build otimizada. QA via Playwright/Chromium (Browser indisponível), em localhost com Auth/REST simulados: downloads reais, 3/4/5/6 membros, nomes e ticks, fundos incorporados, habilidades/runas, host invisível e removido, largura fixa ao exportar no celular, mensagem de erro para fundo ausente e liberação do editor. Assets presentes no cache local foram usados para os exemplos; não foi necessário chamar serviços privados.
