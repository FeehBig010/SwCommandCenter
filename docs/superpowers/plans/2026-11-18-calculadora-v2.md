# Calculadora V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Integrar a experiência Premium Tactical na calculadora real e verificar sincronia a partir do otimizador.
**Architecture:** Evolução do QuickCalculator existente com tema V2 isolado e alternância clássica sem remontar estado. Transferência transitória por conta e time; motores e persistência reutilizados.
**Tech Stack:** React 19, CSS, motores JavaScript existentes, node:test, Playwright. Sem novas dependências.
**Spec:** solicitação autorizada em 18/11/2026, resumida abaixo.

## Global Constraints
- Branch feature/calculadora-v2; sem merge na main e sem deploy.
- Preservar dados, equipamentos, parser SWEX, rotas e permissões.
- Não adicionar resultados matemáticos RTA; mostrar limite experimental existente.
- Design Lab não encontrado no workspace nem na árvore remota atual; usar componentes reais, sem criar laboratório.
- V2 e clássica compartilham estado, sem duplicar lógica matemática.

## Review Focus
- Conta reimportada ou time alterado durante a ida e volta: rejeitar metas obsoletas.
- Cópias distintas do mesmo monstro: preservar IDs e vincular metas por chave.
- Alterar preset ou composição: impedir aplicação ao time de origem incorreto.
- Habilidades não modeladas: informar limites; não tratar bônus de nível arbitrário como validado.
- Troca de visual e viewport: preservar valores, teclado, sliders e ações sem overflow.

### Task 1: Integração segura do otimizador
**Files:** src/core/quick-optimizer-plan.js, src/App.jsx, src/components/TeamEditor.jsx, src/components/OptimizerTeamRow.jsx, testes do bridge.
**Interfaces:** optimizerSyncHandoff(team,account,options,builds); applyQuickSyncGoals(existingTeam,quick,handoff,account). QuickCalculator recebe handoff,onReturnSync,onCancelSync.
- [x] Escrever e observar falha dos testes de snapshot real, seleção de build, retorno por chave, preservação de equipamento e rejeição de origem obsoleta.
- [x] Implementar helpers puros e ação Verificar Sincronia por time.
- [x] Rodar testes direcionados e revisar diff.

### Task 2: Calculadora Premium Tactical
**Files:** src/components/QuickCalculator.jsx, novo QuickCalculatorV2.css, testes browser/calculator-v2.mjs.
- [x] Criar teste browser para visual V2 padrão, alternância clássica sem perda, dois botões diretos SPD/tick, dados e habilidades reais.
- [x] Observar falha antes da implementação.
- [x] Aplicar hierarquia compacta, métricas e seleção direta, preservando controles e versão clássica.
- [x] Integrar props do bridge com retorno explícito e cancelamento.
- [x] Informar limites de habilidades e RTA; manter ajustes avançados manuais disponíveis.
- [x] Validar preset/SWEX, habilidade conhecida, slider, tick, retorno e teclado.

### Task 3: Verificação e entrega
**Files:** docs/CALCULADORA_V2.md, README.md, vercel.json, scripts/run-browser-tests.mjs.
- [x] Desabilitar deployments da branch em vercel.json antes do push.
- [x] Executar suíte completa, navegador, build e review independente. Resultados: 590 unitários, build aprovado; 21 scripts browser na rodada ampla e 2 scripts finais validados separadamente após correção de expectativa legada (ver relatório).
- [x] Inspecionar screenshots 1440/1920 e mobile com fixtures fictícias.
- [x] Registrar limitações, comandos e evidências; commits coerentes.
- [ ] Enviar somente feature/calculadora-v2 e verificar arquivos remotos.
