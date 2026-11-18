# Calculadora de Velocidade V2

Implementação integrada em `#/quick`, com a interface **Premium V2** selecionada por padrão. O botão **Versão clássica** mantém a mesma composição e os mesmos valores em memória; não há uma segunda aplicação ou laboratório.

## Recuperação e preservação

Em 18/11/2026 não foram encontrados `design-lab/` ou `design-lab-v1.zip` nos arquivos locais disponíveis nem na árvore atual do repositório remoto. A implementação partiu dos componentes reais e da `main` em `3a19bb6`, incluindo o trabalho recente enviado pelo usuário nos motores de velocidade, habilidades e ticks. A branch de trabalho é `feature/calculadora-v2`.

As outras worktrees permaneceram intactas. A alteração local anterior em `tests/browser/attack-tradeoffs.mjs` foi preservada também como patch fora do repositório. Nenhuma conta privada foi utilizada nos testes.

## Uso

1. Abra **Calculadora Livre**. A visita comum começa sem monstros e sem carregar equipamentos.
2. Selecione os monstros pelo catálogo ou carregue explicitamente **Presets do JSON**.
3. Em cada card, escolha diretamente **SPD de runas** ou **Pronto por tick**. O slider continua disponível. Prontidão da barra não significa ação no mesmo tick: a fila de turnos é exibida separadamente.
4. Ajuste liderança pela coroa, Swift e SPD de artefatos. Os cards exibem a base, o adicional, a contribuição de Swift e os mínimos calculados quando disponíveis.
5. Escolha a habilidade de primeiro turno. Apenas os efeitos conhecidos no catálogo de puxadores são executados automaticamente. Outros efeitos exigem cenário explícito.
6. Use **Inimigo**, **Defesa inimiga**, **Timeline de Ticks** e **Cenário anti-corte** para detalhar a simulação. A referência automática é uma hipótese de abridor menos 1 SPD, não uma garantia universal.
7. **Builds e runas do JSON** e **Ajustes manuais** preservam inspeção, busca, restrições, prioridades, metas e configurações existentes. Buscar propostas não aplica equipamentos ao jogo.

## Otimizador → Calculadora → Otimizador

Na linha do time no **Otimizador Avançado**, **Verificar Sincronia** abre uma cópia de trabalho do equipamento efetivamente exibido: build selecionada válida, plano local ou equipamento SWEX, usando os mesmos helpers do otimizador. Os IDs das cópias e das runas são preservados. Os membros ativos precisam ter unidades válidas e seis runas distintas por membro. Slots desativados permanecem disponíveis sem bloquear a verificação.

- O modo inicial é verificação (`snapshot`), preservando as velocidades atuais, sem recalcular seguidores antes de solicitação explícita.
- **Voltar sem aplicar** retorna ao otimizador sem alterar metas.
- **Enviar metas SPD ao time de origem** altera somente `goals.spd` desse time, respeitando a base total/adicional de cada configuração. Todas as outras metas, conjuntos, principais, restrições, prioridades e equipamentos são mantidos.
- Reordenar os cards continua vinculando a SPD à chave do monstro correto.
- Se a conta for reimportada, o time de origem mudar, as runas planejadas mudarem, ou a composição/contexto da calculadora mudar, o retorno é rejeitado com mensagem. Reabra a verificação no time de origem. Alterações de líder, buffs, habilidades e torres precisam ser feitas no time de origem antes de uma nova verificação.
- A ação existente **Construir Time (Buscar Runas)** continua disponível para criar um plano novo. É distinta de devolver metas ao time original.

O handoff é transitório, sem novo schema de persistência. Atualizar a página encerra a verificação; não aplica metas implicitamente.

## Limites matemáticos

Não foi criado um motor novo nem adicionada fórmula RTA. O modo RTA herdado está sinalizado como experimental na V2; este trabalho não valida novos resultados de World Arena.

O catálogo de habilidades contém nomes e slots, não uma interpretação completa de todas as skills. Não simulamos automaticamente dano, resistência, IA, cooldowns ou procs aleatórios. A V2 não oferece bônus de skill-up genéricos como se fossem valores oficiais validados. A versão clássica mantém os controles anteriores para comparação; valores manuais de bônus herdados são identificados separadamente na V2 e exigem revisão do jogador. A contribuição de buff SPD não é estimada visualmente por uma multiplicação arbitrária: os resultados vêm do motor existente.

Nenhum equipamento é aplicado, nenhum consumível é gasto e nenhum dado é enviado ao jogo. Importação, autenticação, permissões e datasets não foram alterados.

## Arquivos

- `src/components/QuickCalculator.jsx`: alternância visual, entrada direta, métricas, habilidades e controles de retorno.
- `src/components/QuickCalculatorV2.css`: tema isolado, responsividade, foco e movimento reduzido.
- `src/core/quick-optimizer-plan.js`: snapshot de verificação e retorno validado de SPD.
- `src/App.jsx`: navegação transitória e aplicação explícita ao time original.
- `src/components/TeamEditor.jsx`, `OptimizerTeamRow.jsx`, `OptimizerWorkspace.css`: ação por time e espaço responsivo.
- `tests/quick-optimizer-plan.test.mjs`: regressões do handoff, contexto, dados e metas.
- `tests/browser/calculator-v2.mjs`: teste real da interface e navegação de ida/volta com dados fictícios.
- `tests/browser/quick-tick-targets.mjs`, `quick-tick-proposals.mjs`: mantêm a cobertura clássica selecionando-a explicitamente.
- `tests/browser/app-motion.mjs`: verifica por teclado a aba RTA já existente entre Siege e Cairos, sem acrescentar resultados matemáticos.
- `scripts/run-browser-tests.mjs`: inclui a V2 na suíte disponível.
- `vercel.json`: desabilita auto-deploy somente da branch `feature/calculadora-v2`, preservando a função de notícias.
- `docs/superpowers/plans/2026-11-18-calculadora-v2.md`: plano e critérios.
- `docs/screenshots/calculadora-v2/`: capturas com fixtures fictícias em desktop e mobile.

## Validação

Baseline: **580 testes aprovados** antes de mudanças. Dez novos testes de core cobrem snapshot, build selecionada, retorno por chave/base, origem obsoleta, contexto Arena e equipamento incompleto. O teste browser da V2 foi observado falhar antes da implementação e depois passar.

Comandos de verificação:

```sh
npm test
npm run build
npm run test:browser
```

As capturas em 1440 e 1920 px e mobile 390 px são geradas pelo teste da V2. Os testes usam contextos novos, banco IndexedDB isolado e fixtures fictícias; chamadas externas são interceptadas. O build mantém o aviso preexistente sobre chunks maiores que 500 kB; não houve instalação de dependências.

- `npm test`: **590/590 aprovados**, zero falhas (baseline 580; dez regressões novas).
- `npm run build`: aprovado, 33,79 s na verificação final do código; aviso de tamanho de chunks já existente.
- Playwright V2: aprovado em 1440 e 1920 px, mobile 390 px; alternância clássica sem perda; entrada SPD/tick; habilidade conhecida; divulgação do bônus manual; retratos sem distorção; ida, cancelamento e retorno das metas; conta persistida intacta.
- Presets/SWEX: teste browser aprovado para todas as áreas, tamanhos nativos, slots vazios, liderança, artefatos e RTA herdado; nenhuma mudança no snapshot original.
- Revisão independente: corrigidos contexto da defesa Siege, snapshot obsoleto após troca de conta, slots desativados, invalidação por mudança de plano e identificação de bônus manual. Incluídos testes que reproduziram as falhas antes das correções.
- Navegador: **23 scripts validados**. Na rodada ampla de `npm run test:browser`, os primeiros 21 passaram. O script `app-motion` identificou uma expectativa antiga de que Cairos viria imediatamente depois de Siege, embora a `main` de origem já contivesse RTA entre essas abas. O teste foi atualizado para verificar ambas as etapas por teclado, sem alterar a aplicação. `app-motion` e o último script `premium-motion` foram então executados separadamente e passaram. A execução ampla original terminou com falha nesse teste desatualizado; não foi representada como uma execução única verde. Todos os 23 scripts tiveram seu resultado final validado.

```sh
E2E_BASE_URL=http://127.0.0.1:5305 node tests/browser/app-motion.mjs
E2E_BASE_URL=http://127.0.0.1:5305 node tests/browser/premium-motion.mjs
```
- Não há comando de lint configurado no projeto; `git diff --check` passou.

## Decisões de execução

O laboratório ausente foi substituído somente como referência pelo código real disponível, conforme autorização expressa; não há alegação de fidelidade a componentes do laboratório não recuperados. Uma auditoria matemática e uma auditoria do handoff foram realizadas por subagentes. A integração foi implementada em arquivos separados da camada visual, com revisão independente final e correções reproduzidas por testes. Não houve dependências novas nem migrações de persistência.

## Capturas

As imagens foram produzidas na aplicação real, com dados fictícios e retratos locais:

- [Desktop 1440 px](screenshots/calculadora-v2/desktop-1440.png)
- [Desktop 1920 px](screenshots/calculadora-v2/desktop-1920.png)
- [Mobile 390 px](screenshots/calculadora-v2/mobile-390.png)
- [Retorno ao otimizador](screenshots/calculadora-v2/optimizer-return.png)

## Execução e revisão

```sh
git switch feature/calculadora-v2
npm install
npm run dev
```

Abra `http://localhost:5173/#/quick`. Para testar o fluxo de retorno, importe seu SWEX localmente e abra um time válido no Otimizador Avançado. Nenhum JSON operacional deve ser commitado.

Não houve merge na `main` nem solicitação de deploy. A configuração por branch usa a interface oficial `GitConfig.deploymentEnabled` da Vercel (`vercel/vercel`, `packages/config/src/types.ts`). O bloqueio deve ser revisto apenas quando houver autorização de publicação.

## Salvamento remoto

A branch [feature/calculadora-v2](https://github.com/FeehBig010/SwCommandCenter/tree/feature/calculadora-v2) foi enviada ao GitHub. A árvore remota do checkpoint `a8d0b12` foi conferida pela API GitHub: os 21 arquivos alterados, incluindo código, testes, documentação e quatro screenshots, estão presentes. Esta confirmação foi registrada em um commit documental posterior.

Não houve merge na main nem comando de deploy. O auto-deploy desta branch está desabilitado em `vercel.json`; o status combinado do checkpoint não continha deployments/checks da Vercel. A API de consulta da lista de deployments não está disponível no conector deste ambiente, portanto não alegamos uma inspeção do painel da Vercel.
