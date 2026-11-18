# Speed Tuning Calculator 2.0

Implementação na calculadora existente: `#/quick` → menu **Calculadora de Velocidade**. A versão clássica permanece disponível e compartilha o mesmo estado. Revisão original: `feature/speed-tuning-calculator-2`. Em18/11/2026 o usuário autorizou integrar na main e publicar; veja [registro de integração](releases/2026-11-18-speed-tuning-2.md). Base Premium Tactical com importação SWEX, presets, handoff e engines existentes; nenhuma nova dependência ou migração.

## Operação

- **Todos os monstros:** catálogo completo com busca/ícones, informações de posse e atributos base. Não escolhe uma cópia nem importa equipamentos implicitamente.
- **Meus monstros:** seleção explícita por cópia. Carrega ficha, conjuntos, artefatos e níveis conhecidos do contexto SWEX; não modifica o inventário. RTA sem assignment fica sem equipamento, com aviso, em vez de herdar o equipamento principal.
- Presets explícitos mantêm equipamentos próprios; simular sincronia é uma ação separada. Uma visita comum abre vazia. Trocar/reimportar conta invalida simulações associadas às cópias anteriores.
- Cards mostram retrato real, elemento, base/ficha/runas/Swift/combate, mínimo, habilidade inicial, liderança, passivas e limitações. A contribuição das runas exclui Swift; a ficha o inclui uma única vez.
- Slider **SPD de runas** e **Pronto por tick** são opções diretas. Metas de prontidão são diferentes do momento de ação na fila.
- Ordem desejada e posição física são independentes: setas/abridor alteram a ordem desejada, enquanto posição no jogo define desempates aliados. Reordenação remapeia eventos por identidade.
- Remover afeta só o slot; limpar pede confirmação. Cancelar mantém os valores.
- **Sincronia:** calcula o subconjunto selecionado, com estado parcial; não inventa os slots vazios.
- **Inimigo:** contexto explícito, líder/Swift/runas e copiar SPD do abridor. A cópia atualiza os parâmetros visíveis, sem total oculto inconsistente. Eventos avançados/globais usam o editor existente.
- **Ticks:** primeira rotação, barras antes/depois, SPD runtime e eventos resolvidos. Captura de UI até120ticks, motor limita captura em300 e execução em10000; truncamento/modelagem incompleta não vira garantia universal.
- Compartilhar gera URL por ação explícita. Link contém só parâmetros sanitizados da simulação; sem account IDs, cópias, rune IDs, credenciais, nomes privados de times ou inventário. Validações por whitelist, limite32KB, máximo20eventos/5inimigos, novas chaves locais e nomes canônicos. Ao abrir, verifica os valores compartilhados sem retunar silenciosamente; automação pode ser reativada pelo usuário.
- Handoff **Verificar Sincronia** permanece: retorno explícito de metas SPD rejeita mudança de conta, composição, equipamentos ou premissas de habilidade. Não equipa runas.

## Matemática e comparação das capturas

Entradas das capturas06–08: Bernard base111, sem Swift, torre0, +100/+101, efeito de melhoria de buff SPD12%; Tiana base96, Swift24, S3 com30%ATB. O adicional da referência inclui Swift: +48 = +24 runas +24 Swift; +49 =25+24; +57 =33+24.

| Caso | Ficha Bernard | Boost | Ficha mínima Tiana | Adicional incluindo Swift | Apenas runas |
|---|---:|---:|---:|---:|---:|
| Captura06, perfil comparativo2A explícito nível3 |211|34,5%|144|48|24|
| Captura07, mesmo perfil |212|34,5%|145|49|25|
| Captura08, nível base |212|30%|153|57|33|

Os três casos usam referência `abridor −0,000001 SPD`, uma política de quase empate, e resultam Bernard tick7, Tiana8, referência9. Reduzir1SPD da ficha da Tiana provoca corte nos testes. Planos legados sem `referencePolicy` mantêm a política anterior abridor−1.

**Diferença importante:** o Bernard normal não ganha34,5% por skill-up: níveis reduzem cooldown. Segundo despertar tem30/31,5/34,5%. Ambas as formas têm base111, portanto a captura é compatível com o Bernard2A. Se o usuário escolher a forma normal, a UI só permite aplicar a curva2A por um perfil **comparativo explicitamente hipotético**, rotulado como diferente da habilidade real dessa forma. Selecionar Bernard2A utiliza diretamente sua base111 e curva real. Não se aplica +15pontos nem multiplicador universal às outras unidades.

Fonte pública: [SWARFARM bestiary fixtures](https://raw.githubusercontent.com/swarfarm/swarfarm/master/bestiary/fixtures/bestiary_data.json), com2us_id2513 e2563 consultados em18/11/2026. Não há join por IDs entre datasets incompatíveis.

Base111+100=211 ficha; torre15% arredonda uma vez16,65→17, resultando228 combate. Artefato12% de melhoria do buff não é SPD plana e só influencia quando o buff estiver ativo. Ajustes planos legados ficam avançados e explicitamente hipotéticos.

Os sites00Peanuts e swcalc.cz retornaram403 no proxy deste ambiente. As comparações funcionais usam as17capturas fornecidas e testes reproduzíveis; não foi copiado código privado nem utilizada API privada.

## Cobertura e limites

O catálogo mostra habilidades e separa passivas de ações selecionáveis. O motor aplica somente o whitelist existente de openers/efeitos conhecidos; habilidades comuns de dano não viram efeitos de velocidade inventados. Níveis reais do SWEX são preservados por cópia, presets/handoff e backup compacto. Ausência de níveis permanece desconhecida, sem presumir full skill.

Leo, Miles, Masha, Tian Lang, Ragdoll, Abellio, Sonia, Tablo, Nemesis e ramo explícito de Antares usam as regras/eventos já modelados. Chilling é identificado corretamente como20711; sua passiva continua **não modelada automaticamente**, com aviso condicional e eventos manuais, nunca bônus fixo universal. A opção Will não afeta Stella19911.

Não há simulação automática de dano, resistência, procs aleatórios, seleção de habilidades de IA, cooldowns completos nem durações universais de buffs/debuffs. Efeitos aplicados têm o estado/evento explicitamente informado; a primeira rotação não é validação de batalhas longas. RTA usa4slots/tick1,5% e permanece experimental: sem alegação de validação matemática completa. PvE e demais modos existentes foram preservados.

Backup compacto continua sem inventar artefatos/assignments que seu formato não contém; reimporte SWEX para recuperar dados ausentes. Não foram alterados JSONs originais nem históricos.

## Arquivos principais

UI: `QuickCalculator.jsx`, `QuickCalculatorV2.css`, `QuickSkillPanel.jsx`, `TurnTimeline.jsx`.
Core: `quick-account-selection.js`, `quick-skill-effects.js`, `calculator-share.js`, `quick-calculator.js`, `speedTuner.js`, `team-balance.js`, `tick-timeline.js`, `calculator-scenario-status.js`.
Integrações: `quick-presets.js`, `quick-optimizer-plan.js`, `clean-account-payload.js`.
Testes: `quick-account-selection`, `quick-skill-effects`, `speed-tuning-2-math`, `calculator-share`, status/timeline/presets existentes e Playwright `speed-tuning-2` + regressões de calculadora.

## Revisão independente

Foram corrigidos com RED→GREEN: perda de torre/guilda ao compartilhar snapshots; herança indevida de artefatos main em preset RTA sem assignment explícito; retorno SPD sem checar novos níveis/perfis de habilidade. Regressões de navegador também cobrem metas por tick em time parcial de um único monstro, confirmação de limpeza e hit targets sem sobreposição.

## Capturas e execução

- Suíte completa: `node --test --test-concurrency=1 tests/*.test.mjs`: **642/642**, zero falhas, skips ou cancelamentos (93,6s). O runner usa o mesmo glob de `npm test`; execução serial evita competição com o PostgreSQL de teste.
- `npm run build`: produção aprovada. Permanece o aviso de chunks maiores que500KB; nenhuma dependência foi atualizada.
- Playwright: `speed-tuning-2`, `calculator-v2`, `quick-tick-proposals`, `quick-tick-targets`, `quick-auto-sync`, `quick-presets`, `quick-density`, `team-balance`, `premium-motion` passaram. O conjunto anterior Premium Tactical também passou nos27scripts, em retomadas documentadas no relatório próprio.
- Os novos testes usam Chromium e fixtures isoladas. Cobrem seleção vazia/catálogo/SWEX, cópias/presets/contas, resultados +48/+49/+57, primeira rotação, efeito de artefato, limpar/cancelar/remover, link sanitizado inclusive query da URL, inimigo/copiar abridor, Office/War,1440/1920/390 e regressões320px, versão clássica, e handoff verificar/cancelar/devolver metas sem equipamentos automáticos.
- Benchmark real do Worker:1578runas sintéticas,61combinações,1465ms de motor, maior intervalo de UI91ms. Sem relaxar os limites de desempenho.
- Registros de RED→GREEN: revisão de contexto, compartilhamento, meta de tick com um único slot e hits de controles clássicos. Uma expectativa antiga de teste RTA que usava artefatos main foi corrigida para refletir equipamento contextual desconhecido; todas as demais verificações permaneceram.
- Capturas foram abertas para revisão visual: cards, contraste, hierarquia, layout móvel, controles alcançáveis e estado parcial sem garantia de segurança.
- A revisão original foi entregue sem merge/deploy; a autorização posterior está registrada em AGENTS.md. `vercel.json` mantém as branches de implementação sem deploy e habilita explicitamente a `main`. O trabalho remoto divergente da branch Premium de nome original foi preservado; essa entrega anterior está em `feature/swcc-premium-tactical-v1-review`.

Os documentos `SW_OS_ORCHESTRATOR_MASTER.md`, `SW_RUNES_SYSTEM_REVISADO.md` e `SW_COMMAND_CENTER_2_0_DOCUMENTACAO_CONSOLIDADA.md` não foram encontrados na busca do workspace. Foram usados AGENTS.md, a especificação entregue e a documentação existente de parser, calculadora, ticks e optimizer.

Capturas reais com fixtures fictícias:

- [Desktop1440](screenshots/speed-tuning-2/desktop-1440.png) e [1920](screenshots/speed-tuning-2/desktop-1920.png).
- [Mobile390](screenshots/speed-tuning-2/mobile-390.png).
- [Ticks](screenshots/speed-tuning-2/ticks-1440.png).
- [Office](screenshots/speed-tuning-2/office-1440.png) e [inimigo no Office](screenshots/speed-tuning-2/enemy-office-1440.png).

## Relação de arquivos alterados

Diff completo contra a base28f5492 (inclui correção de tablet da entrega Premium):

```text
README.md
docs/SPEED_TUNING_2.md
docs/reviews/2026-11-18-premium-tactical-v1.md
docs/reviews/assets/premium-tactical-v1/optimizer-1440.png
docs/reviews/assets/premium-tactical-v1/rune-intelligence-1440.png
docs/screenshots/speed-tuning-2/desktop-1440.png
docs/screenshots/speed-tuning-2/desktop-1920.png
docs/screenshots/speed-tuning-2/enemy-office-1440.png
docs/screenshots/speed-tuning-2/mobile-390.png
docs/screenshots/speed-tuning-2/office-1440.png
docs/screenshots/speed-tuning-2/ticks-1440.png
docs/superpowers/plans/2026-11-18-speed-tuning-2.md
docs/superpowers/specs/2026-11-18-speed-tuning-2.md
scripts/run-browser-tests.mjs
src/components/PremiumTactical.css
src/components/QuickCalculator.jsx
src/components/QuickCalculatorV2.css
src/components/QuickSkillPanel.jsx
src/components/TurnTimeline.jsx
src/core/calculator-scenario-status.js
src/core/calculator-share.js
src/core/clean-account-payload.js
src/core/quick-account-selection.js
src/core/quick-calculator.js
src/core/quick-optimizer-plan.js
src/core/quick-presets.js
src/core/quick-skill-effects.js
src/core/speedTuner.js
src/core/team-balance.js
src/core/tick-timeline.js
tests/browser/quick-auto-sync.mjs
tests/browser/quick-density.mjs
tests/browser/quick-presets.mjs
tests/browser/quick-tick-targets.mjs
tests/browser/speed-tuning-2.mjs
tests/browser/team-balance.mjs
tests/calculator-scenario-status.test.mjs
tests/calculator-share.test.mjs
tests/quick-account-selection.test.mjs
tests/quick-presets.test.mjs
tests/quick-skill-effects.test.mjs
tests/speed-tuning-2-math.test.mjs
tests/tick-timeline.test.mjs
vercel.json
```

Build final confirmado após os últimos ajustes de apresentação: `npm run build`,12,27s. Revisão e commits nesta branch; sem publicação do site.
