# Diagnóstico e re-runagem de ataques por trade-off

O card do ataque selecionado, na Central de Siege e no Otimizador/Arena, oferece **⚡ Buscar Alternativas (Trade-offs)**. O botão aciona uma instância sob demanda de `optimizer.worker.js`, com `mode: tradeoff`; ataques não disparam o diagnóstico conservador automático antigo. As preferências opcionais oferecem prioridades SPD, EHP e Dano e um limite de sacrifício de 0% a 50% por atributo, inicialmente 20%.

## Referência e objetivo

A referência é o equipamento original salvo no preset selecionado do SWEX (`accountPresets.equipment`), incluindo seus artefatos. Sem snapshot do preset, usa-se `unit.runeIds`; referências principais incompletas podem ser recuperadas de seis runas com ownership compatível no inventário. A origem aparece no relatório. O contexto de combate é o do time. Metas digitadas ou preenchidas automaticamente e planos locais anteriores não viram a ficha de referência. O diagnóstico permite perdas declaradas em metas de status; elas não são travas nessa busca. O otimizador de metas existente permanece separado.

A primeira passada usa os atributos atuais como pisos para procurar alternativas sem perdas. Uma segunda passada permite trade-offs dentro do limite escolhido. Se a distribuição conjunta encontrar alguma melhoria sem sacrifício, apenas essas são apresentadas. Caso contrário, o conjunto precisa melhorar o foco em termos relativos e cada perda é mostrada por monstro. Não se impõem todas as metas da guilda a esta comparação; `target_goals` permanece intacto.

HP, ATK, DEF, TC, DC, RES e ACC da tabela representam a ficha real, incluindo valores acima dos caps. SPD é explicitamente **SPD de combate**. EHP usa HP e DEF de combate, pela fórmula já adotada no motor: `HP × (1140 + 3,5 × DEF) / 1000`. Dano usa o estimador existente quando há cenário habilitado. Sem esse cenário, a comparação é chamada **potencial de dano**, com ATK × (1 + TC limitada a 100% × DC); não promete dano real por habilidade nem vitória. Variações em TC/DC/RES/ACC são pontos percentuais.

## Restrições eliminatórias

- Cada distribuição contém seis slots por unidade e nenhuma runa repetida entre os membros.
- Todos os conjuntos completos equipados e todos os selecionados são obrigatórios simultaneamente neste diagnóstico. Requisitos incompatíveis com seis slots geram uma mensagem explícita. A comparação é explícita no tooltip, independentemente da preferência flexível do otimizador antigo.
- Os atributos principais escolhidos e as reservas explícitas são respeitados. Planos de defesas/GvG também protegem suas runas. Times ativos marcados como prioritários também protegem suas runas. Outros ataques sem prioridade continuam compartilhando o pool global.
- A opção de usar runas equipadas é respeitada. Bloqueios locais sempre valem; bloqueios do jogo seguem “Respeitar bloqueios”. Runas vindas de outra unidade são identificadas no relatório para reequipamento.
- Pool RTA é isolada. Intangible e conjuntos desconhecidos não são simulados: nesses casos, a build atual é mantida com uma mensagem.
- A ordem factual da primeira rotação do SWEX é preservada. A prontidão e a primeira ação de cada membro não podem atrasar. Prazos de Tick explícitos também são obrigatórios. Se o cenário possui inimigos, não aumenta a quantidade de ações inimigas antes de cada aliado.
- Boosts, buffs, passivas e artefatos seguem o motor de combate existente. Os Ticks apresentados são inteiros, com avatares prontos no mesmo Tick agrupados.

## Resultados abaixo dos monstros

O relatório abre uma sanfona abaixo da grade de monstros. Cada opção mostra um chip **Otimização Perfeita** (sem perdas), **Sacrifício Calculado** (perdas explícitas), e o botão **Aplicar**. A ficha comparativa e a timeline ficam em detalhes expansíveis, montados apenas quando abertos. Sem opções, aparece **Limite Atingido**, com aviso de que nada foi encontrado dentro dos limites desta busca; não se afirma que o estoque atingiu um ótimo global. O painel permite teclado, respeita movimento reduzido e mantém alvos de toque de 44 px.

## Busca limitada e aplicação

A geração usa os feixes existentes do otimizador, mais trocas vizinhas de uma runa. Retém até 32 alternativas por monstro, até 96 distribuições parciais e no máximo 5.000 verificações finais de timing. Mostra até três sugestões. Não enumera todas as permutações do inventário nem comprova ótimo global. “Nenhuma alternativa” significa que nada foi encontrado nesses limites e filtros.

A aplicação dispara uma nova validação no Worker com o estado atual: confere assinatura do inventário/time/reservas, IDs, ownership/bloqueios, slots, conjuntos, sacrifícios e timing. As estatísticas recebidas do relatório não são confiadas. O resultado vira somente `team.plannedRunes`, com `source: 'attack-tradeoff'`; não modifica monstros, runas, artefatos ou o JSON da conta e não envia dados à nuvem. “Voltar às runas do SWEX” restaura o snapshot original do preset selecionado; sem snapshot, remove a proposta e usa o equipamento principal.

Mudança de time, conta, prioridade, limite ou reservas invalida resultados anteriores e encerra o Worker. A busca tem cancelamento. Não são projetados gems/grinds ou upgrades de nível que a conta ainda não possui.

## Verificação

`npm test` cobre a referência real do JSON, Pareto e trade-offs, foco EHP/dano, conjunto obrigatório, mains, unicidade, reservas/bloqueios, boosts automáticos, Ticks, validade e revalidação de planos, inclusive ataques nativos de quatro slots.

`npm run test:browser` executa também `tests/browser/attack-tradeoffs.mjs` sobre a aplicação real: botão único, Worker sob demanda, sanfona posicionada abaixo dos monstros, chips, relatório, agrupamento de ticks, aplicação/desfazer, preservação do SWEX, invalidação de relatório e cancelamento. Inclui uma medição com **1.518 runas sintéticas**, informando tempo do motor, tempo total e intervalos da thread principal. Essa medição não representa um benchmark de hardware mobile real.
