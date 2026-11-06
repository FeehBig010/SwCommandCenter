# Rune Intelligence · MVP v1

## Acesso e arquitetura

Abra **Rune Intelligence** no menu, ou `#/rune-intelligence`. Usa React/Vite,
`AccountContext`, a conta SWEX ativa e o contexto existente de bloqueios/builds.
Convidados com inventário local usam as mesmas regras da Oficina; sem conta,
a autorização existente oferece login, e usuários autenticados veem o estado vazio.
O módulo é lazy-loaded; a análise roda em `rune-intelligence.worker.js`, localmente.
Não há fetch de inventário, OCR, API do jogo, alteração de runas ou migração SQL.

## Dados e compatibilidade

`normalizeAccountSteps` continua lendo `raw.runes` e `unit_list[].runes`, incluindo
unidades no armazenamento presentes em `unit_list`. O Map por `rune_id` evita
contagem duplicada; equipamento da unidade tem precedência sobre a cópia raiz.
Não se inventam unidades ausentes nem se combinam exportações de contas diferentes.
O seletor Conta identifica a conta ativa; trocar a conta continua em Dados SWEX.

Os campos existentes são conservados: `class % 10` = estrelas, `class > 10` =
Ancient, `set_id`, `slot_no`, `upgrade_curr`, `pri_eff`, `prefix_eff` e
`sec_eff = [stat, valor SEM grind, flag de encantamento, grind]`.
**SPD base é o segundo campo do secundário SPD; não subtrai o grind novamente.**
SPD da propriedade principal ou innate não conta como SPD secundário na análise.

O parser acrescenta opcionalmente `originalQuality` a partir de `extra` e
`quality` a partir de `rank`; aceita 1–5 e 11–15 (qualidades Ancient), normalizando
por `% 10`. O mapeamento 1 Common / 2 Magic / 3 Rare / 4 Hero / 5 Legend e a
codificação Ancient constam no mapping público do SWEX (`app/mapping.js`).
`extra` conserva a qualidade original, enquanto `rank` representa a atual.
Na ausência de `extra`, **não** se infere Legend a partir de quatro secundários
ou de `rank=5` em +12. Backups privados existentes mantêm o campo opcional na
whitelist de `accountSnapshot`; dados legados continuam válidos, como desconhecidos.
A reimportação é necessária para recuperar informação anteriormente descartada.
Arquivos JSON originais não são modificados.

## Elegibilidade e classificação

Critérios conservadores: 6★, originalmente Legend, conjunto conhecido que não seja
Intangible, pool principal, +12 a +15, quatro secundários distintos e suportados,
SPD secundário base **menor** que 20 (configurável). Abaixo de +12: REVISAR,
pois os atributos ainda não estão revelados; não se recomenda gastar reapp às cegas.
Innates prioritárias: ACC 6–8, TC 5–6, DC 7, RES 8; outras podem ser habilitadas.
Filtros de inelegibilidade são explicados individualmente.

A classificação respeita esta precedência:

1. **PROTEGER**: bloqueios do jogo/locais, reservas, builds, presets e atribuições
   RTA; ou equipada quando a proteção padrão está ativa.
2. **PROTEGER**: índice atual ≥75 ou SPD base ≥meta. Runa lenta pode ser excelente.
3. **GEMAR/GRINDAR**: pedra compatível existente oferece melhoria válida.
4. **REAPP**: elegível e prioridade ≥20.
5. **REVISAR**: demais casos, incerteza ou custo de oportunidade elevado.

Runas vinculadas continuam protegidas mesmo desativando a proteção de equipadas.
Todos os resultados de builds salvos da conta, mesmo não travados, são protegidos.
Planos locais só valem com `accountStamp` correspondente; referências explícitas
a outras contas são ignoradas. O inventário de outra conta não entra na análise.

## Fórmula própria e transparente

Versão 1: soma determinística, truncada a [0,100], com desempate por ID crescente.
**A pontuação não é probabilidade de sucesso nem promessa de build/vitória.**

O índice Q de atributos atuais é `min(100, Σ min(5, subBase / referência) / 8 × 100)`.
Referências de roll normal 6★: HP flat 375, HP% 8, ATK flat 20, ATK% 8,
DEF flat 20, DEF% 8, SPD 6, TC 6, DC 7, RES 8, ACC 8.
Exclui grinds e innate. Para Ancient, são apenas unidades de comparação próprias,
**não** eficiência oficial nem tetos de roll Ancient. As categorias são separadas.

Fatores da prioridade, expostos na ficha da runa:

- Innate prioritária: +20; outra habilitada no avançado: +8.
- Lacuna da categoria: `round(20 × max(0,metaQuantidade - rápidas)/metaQuantidade)`.
- Set prioritário: +10. Slot prioritário: +5. Ambos configuráveis.
- Oportunidade de recuperar rolls: `round((100 - Q) × 0,30)`.
- Custo dos atributos atuais: `-round(Q × 0,35)`.
- SPD já existente: `-round(SPDbase × 1,2)`.
- Sinergia preservável: -3 por par, limitado a -12. Pares: HP%/DEF%, ATK%/TC,
  ATK%/DC, TC/DC, SPD/HP%, SPD/ATK%, SPD/ACC, incluindo a propriedade principal.
- Protegida/vinculada: -100. Equipada sem proteção padrão: -20.

Potencial de build é um proxy por set, principal, pares e lacuna. Não executa o
otimizador conjunto nem promete que uma runa após reapp completará uma build.

## Gemas/grinds, lacunas e planejamento

Propostas usam `compatibleCrafts` e `simulateRuneCraft` existentes: mesmo set,
mesmo status Ancient, estoque positivo, grade/teto suportado, seis estrelas,
um slot encantado, sem repetir principal/innate/secundários e restrições dos
slots 1 e 3. Gemas precisam aumentar Q sem diminuir SPD base. Grinds aumentam
atributo suportado sem perder SPD/Q. Mostra até três alternativas independentes
por runa. São **tetos de rolls aleatórios**, sem consumo ou reserva de estoque;
não são um plano de aplicação simultânea. Tetos Ancient não validados permanecem
indisponíveis. Equipadas/protegidas não recebem proposta automática.

Lacunas agrupam tipo (normal/Ancient), set, slot e tipo de principal. Mostram
quantidade, quantidade acima da meta SPD (20 por padrão), máximo, média, déficit
para a quantidade desejada (3 por padrão), distribuição e média dos secundários
base. Categorias com SPD na principal não recebem uma meta impossível de SPD secundário
nem pontos de escassez por velocidade; a tabela identifica “Não se aplica”.
As contagens referem-se ao inventário completo da categoria, não a estimativas
externas G3. Esta versão mostra categorias presentes; uma categoria inteiramente
ausente não é inferida como requisito da conta.

Saldo inicial **planejado manualmente**: 800 normais e 200 Ancient; não é lido dos
consumíveis do jogo. Aloca **uma tentativa inicial por candidata** por ordem do
ranking, em etapas de 10 configuráveis, respeitando os dois saldos. Não estima
quantas tentativas terão sucesso. Reavaliar no jogo e reimportar entre etapas.
A shortlist pessoal, critérios e saldos ficam somente no localStorage, por ID da
conta. Não alteram o ranking/plano completo nem os snapshots históricos.

## Limitações e verificação

Apenas uma conta ativa de cada vez, conforme a arquitetura atual. Reimporte
exportações antigas (aviso após 7 dias); data é de importação, não garantia da
hora de captura. A referência funcional SWLens não pôde ser acessada neste
ambiente (proxy HTTP 403); nenhum código, API privada ou fórmula de lá foi usado.
O módulo não oferece venda, equipamento ou alteração automática dentro do jogo.

`node --test tests/rune-intelligence.test.mjs` cobre parser/backup, deduplicação,
contas, raridade, Ancient, innate/substats/grinds, elegibilidade, qualidade,
proteções, ranking, lacunas, orçamento, estado vazio e antiguidade.
`node tests/browser/rune-intelligence.mjs` usa conta fictícia e IndexedDB isolado:
Worker real, filtros, detalhes, shortlist, planejamento, integridade, desktop/mobile.
`npm test` e `npm run build` continuam os comandos principais; não há script lint.

## Arquivos desta entrega

- `src/core/rune-intelligence.js`: elegibilidade, utilidade, ranking, proteções,
  lacunas, sugestões legais e planejamento por pool.
- `src/core/rune-intelligence.worker.js`: fronteira local da análise.
- `src/pages/RuneIntelligence.jsx` e `.css`: interface, filtros, saldos e shortlist.
- `src/core/data.js` e `src/core/account-snapshot.js`: preservação opcional das
  raridades original/atual no parser e nos backups privados existentes.
- `src/App.jsx`, `src/components/Sidebar.jsx`, `src/core/navigation-access.js`:
  rota/menu e contexto de builds protegidas, mantendo a autorização existente.
- `tests/rune-intelligence.test.mjs`, `tests/browser/rune-intelligence.mjs`,
  `scripts/run-browser-tests.mjs`: regressões e inclusão na suíte de navegador.
- `README.md` e este documento: acesso, arquitetura, critérios e limitações.

A verificação usa somente fixtures fictícias e armazenamento de navegador isolado.
A inspeção visual foi feita em Chromium local, desktop 1440×900 e mobile
390×844 / 320×844, com movimento reduzido. O runtime do plugin Browser não está
callable nesta sessão; usa-se o fallback Playwright já autorizado neste projeto.
Não se validou uma conta real, hardware mobile físico ou o deploy público.
Uma medição local do motor com 3.000 runas sintéticas levou aproximadamente
289 ms, sem pedras; não é um benchmark de dispositivos móveis.

Validação desta entrega: **550 testes aprovados, 0 falhas** em `npm test`;
**25 testes focados aprovados** (13 novos do módulo e regressões de parser/Oficina);
fluxo de navegador acima aprovado sem erros de execução; `npm run build` aprovado.
O build mantém o aviso já existente de chunks grandes em outros módulos.
O novo Worker tem aproximadamente 15 kB e a página lazy-loaded 16 kB antes de gzip.
