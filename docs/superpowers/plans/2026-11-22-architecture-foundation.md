# Architecture Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Dar o primeiro passo verificável para organizar os módulos do SW Command Center, sem mudar comportamento.

**Architecture:** Extrair a projeção de presets do grande componente `App.jsx` para uma função pura sob `src/core`. Conservar lógica e contratos públicos e fixar a saída por testes de regressão; documentar as dependências atuais.

**Tech Stack:** React 19, Vite 6, Node 22, ESM, node:test.

**Spec:** `docs/superpowers/specs/2026-11-22-architecture-foundation-design.md`

## Global Constraints
- Não alterar contratos de SWEX, cálculos, persistência ou release.
- Não adicionar dependências ou alterar estilos.
- Trabalhar somente na branch de refatoração; não publicar `main`.

## Review Focus
- Contexto de Arena desconhecido não deve entrar nas listas Regular ou Interserver.
- RTA não deve ser confundido com Arena Regular.
- Presets PvE sem dungeon devem ser agrupados como `pve-other`.
- Listas derivadas devem conservar ordem e referências dos presets originais.
- A ausência de presets deve retornar coleções vazias com formato estável.

---

### Task 1: Contrato da projeção de presets
**Files:**
- Create: `tests/account-deck-lists.test.mjs`
- Create: `src/core/account-deck-lists.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `isArenaContext(record, context)` e `isPve(area)`.
- Produces: `buildAccountDeckLists(presets)` com o mesmo objeto antes produzido por `deckLists`.

- [ ] Step 1: Escrever testes para listas vazias, contextos, origem, agrupamentos e referência/ordem.
- [ ] Step 2: Verificar RED (testes falham sem o módulo, quando houver runtime).
- [ ] Step 3: Extrair lógica literalmente sem mudanças de comportamento.
- [ ] Step 4: Rodar testes focalizados e suíte completa, quando houver runtime de repositório.
- [ ] Step 5: Conferir build e browser tests via CI.
- [ ] Step 6: Registrar commit em branch isolada.

### Task 2: Mapa do projeto e continuidade
**Files:**
- Create: `docs/ARCHITECTURE.md`
- Preserve: `AGENTS.md`, `GEMINI.md`, CI e documentação existente.

- [ ] Step 1: Documentar módulos existentes e fluxo de dados.
- [ ] Step 2: Identificar hotspots e sequência de próximos módulos para refatorar.
- [ ] Step 3: Abrir PR de revisão para os dois tasks, sem merge ou deploy.
