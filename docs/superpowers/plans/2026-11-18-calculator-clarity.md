# Calculator clarity implementation plan

> Use superpowers:executing-plans, TDD e revisão independente; preservar motores e dados.

**Goal:** tornar informações decisivas reconhecíveis em segundos na calculadora.
**Architecture:** helper puro de apresentação de liderança, pequeno componente de resumo e badges scoped; reutilizar LeaderCrown, MonsterPortrait, quick-calculator e CSS existente.
**Spec:** ../specs/2026-11-18-calculator-clarity.md

- [x] RED: tests/calculator-leadership.test.mjs para sem líder, escopo inválido, elemental parcial, não-SPD, líder sem origem e sem mutação.
- [x] GREEN: src/core/calculator-leadership.js e QuickBattleIdentity.jsx; integrar ações sem alterar engines/estatísticas.
- [x] Cards: líder/abridor/ação claros, velocidades hierarquizadas; artefatos e formação secundários; alternativa clássica preservada.
- [x] Playwright calculator-clarity.mjs: seleção/remoção/reordenação do líder, escopo, teclado, detalhes e1440/1920/390/320; fotografias reais/fixtures.
- [x] Regredir speed-tuning2, calculator-v2 e density, testes completos/build e revisão independente.
- [x] Integrar main atual, verificar resultado, publicar e monitorar status Vercel. Nenhuma migração/alteração de inventários.

## Fluxo de dois times (confirmado)
- [x] Teste browser RED para time inimigo visível, SPD explícita e ausência de busca de runas aberta.
- [x] Reutilizar ThreatScanner no fluxo V2, edição de SPD sem estimativa automática; preservar modo clássico e editor de eventos.
- [x] Reutilizar onBuildTeam/Verificar Sincronia; testar cancelamento, retorno de metas e inventário intacto.
