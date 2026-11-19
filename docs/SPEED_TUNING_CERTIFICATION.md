# Speed Tuning 2.0 — certificação por cenário

Escopo aprovado em19/11/2026: preservar identidade física, contextos SWEX, equipamentos, modos War/Office e os motores existentes; separar comprovação matemática, margem escolhida e comparação externa. Nenhum estado implica vitória G3.

## Estados

- **VALIDADO:** evidência suficiente para a afirmação e o cenário delimitados. Validação interna não significa paridade externa.
- **PARCIAL:** dados ou cobertura insuficientes; não prometer ausência de corte.
- **BLOCKED:** cenário inválido, divergência crítica, referência externa ausente ou falta de prova necessária.

A simulação continua em `speedTuner.js`; `tuning-certification.js` interpreta sua telemetria e `tuning-minimum.js` reutiliza o mesmo simulador para busca limitada. `tuning-parity.js` compara registros, sem calcular SPD ou ATB.

## Matriz de aceitação incremental

| Grupo | Evidência exigida | Gate |
|---|---|---|
| Identidade e importação | IDs de cópia/runas, duplicatas, skills, artefatos, contexto RTA, snapshot antes/depois | Sem mutação ou empréstimo silencioso de equipamento |
| Montagem | Siege3, Arena/RTA4, reordenação, posição física, liderança e eventos por identidade | Reordenar cards não altera posição física ou inventário |
| SPD e ticks | Base, runas, Swift, torre/líder, buffs e artefatos; pronta versus ação | Resultados reproduzíveis no simulador existente |
| Mínimo | Enumeração inteira no intervalo declarado, demais parâmetros fixos, falha abaixo do mínimo | Não alegar ótimo conjunto/global a partir de minimização individual |
| Margem | Mínimo e margem separados; alvo somado reavaliado | Não presumir que aumentar SPD preserve ordem |
| Habilidades/passivas | Mecânica reconhecida e condições explícitas | Ausência de cobertura reduz certificação |
| SWCALC | Registro externo versionado com entradas idênticas e medições completas | Sem referência externa, BLOCKED |
| UI | War/Office,1440/1920 e mobile, teclado, essenciais diretos e avançados expansíveis | Sem overflow ou controles sobrepostos |
| Optimizer | Gate técnico aprovado antes de ampliar retorno/aplicação | Equipamentos não são aplicados pela certificação |

## Contrato da comparação externa v1

`compareTuningEvidence(local,reference)` recebe dois registros:

- `schemaVersion:1`.
- `inputs`: `gameMode` (siege/arena/rta), `tickRate`, `towerSpd`, `guildSpd`, `leader` (objeto ou null), `gamePlacement` (chaves aliadas), `allies`, `enemies`, `events`, `referencePolicy`.
- Cada ator: `key`, `master`, `baseSpd`, `runeSpd` (sem Swift), `swift`, `combat`, `skill` (slot/level ou null). Condições dinâmicas devem ser registradas em `combat`; os defaults omitidos têm de coincidir nos dois registros. Não incluir IDs privados de conta/equipamentos.
- `measurements`: `actors` com `key`, `combatSpd`, `readyTick`, `actionTick`; `order` contendo cada ator uma vez; `cut` booleano.
- Só a referência adiciona `source`: `name:'SWCALC'`, `url` HTTPS no domínio swcalc.cz, `version`, `capturedAt`, `evidenceUrl` HTTPS e `synthetic` booleano. A proveniência declarada precisa de revisão humana; o comparador não autentica screenshots ou a origem remota.

`tuningInputFingerprint(inputs)` é JSON canônico com chaves de objetos ordenadas. Não é hash criptográfico nem certificado de origem. A ordem de arrays é significativa. Todos os parâmetros devem representar o mesmo cenário; não há tolerância numérica implícita. Valores não finitos e registros incompletos são bloqueados. Uma tolerância futura exige contrato versionado e justificativa, não arredondamento silencioso.

O resultado inclui `status`, `code`, `detail`, `differences`, `fixtureOnly`, `scope:'Somente o cenário comparado'` e `globalParity:false`. Fixtures sintéticas testam o comparador e recebem rotulagem explícita; não são observações do SWCALC. Mesmo um registro externo correspondente não certifica todos os cenários ou versões do site.

## Registro externo atual

`SWCALC_REFERENCE_REGISTRY` permanece **BLOCKED**, sem cenários externos certificados. As capturas anteriores do00Peanuts não são convertidas em evidência SWCALC. O mecanismo de comparação está disponível para incorporar observações públicas reproduzíveis quando acessíveis; nenhuma API privada, OCR ou captura automatizada do jogo faz parte desta entrega.

## Limites de mecânicas

O catálogo de skills não equivale a execução automática de todos os efeitos. A cobertura conhecida usa a seleção explícita do primeiro turno e condições/eventos resolvidos. Passivas modeladas são condicionais; Antares tem RNG. Chilling automático, IA, dano automático, resistência/procs gerais, cooldowns completos e duração geral de efeitos não são certificados. RTA permanece experimental até validação específica, mesmo com quatro slots e taxa de tick configurada.

As provas individuais de mínimo têm intervalo finito e os demais atores fixos. Metas por tick podem estar prontas antes de agir; adversários ou desempates podem cortar uma composição pronta. Não transformar referência automática quase empatada, coeficiente conservador legado ou margem do usuário em prova universal.

## Testes

`tests/tuning-parity.test.mjs` usa somente fixtures sintéticas rotuladas. Exercita referência ausente, fingerprint determinístico, igualdade estrita, divergências de entradas/SPD/prontidão/ação/ordem/corte, proveniência incompleta, valores não finitos e ordens incompletas. Registro vazio é uma afirmação deliberada de ausência de evidência externa, não um teste ignorado.
