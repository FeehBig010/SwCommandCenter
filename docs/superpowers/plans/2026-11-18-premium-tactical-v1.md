# Premium Tactical V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development task-by-task. Steps use checkbox syntax.

**Goal:** Cinco destinos principais e UX premium consistente, preservando todo o aplicativo.
**Architecture:** Evolução do shell existente, tokens CSS sem substituir estilos indiscriminadamente, componentes e motores reutilizados. Integração da Calculadora V2 da branch anterior com a main atual. Registros novos de partidas locais ficam em chave separada por conta; relatos antigos não viram partidas.
**Tech Stack:** React 19/Vite, CSS, Lucide, node:test, Playwright; nenhuma dependência nova.
**Spec:** docs/superpowers/specs/2026-11-18-premium-tactical-v1.md e AGENTS.md.

## Global Constraints
- Sem merge na main ou deploy; branch feature/swcc-premium-tactical-v1 com auto-deploy bloqueado.
- Preservar parser, matemática, snapshots, inventários, autenticação, permissões, reservas e rotas.
- Cards independentes, ações claras, detalhes avançados expansíveis; Office/War mantidos.
- Screenshots reais 1440/1920/mobile; fixtures fictícias e contextos isolados.
- Não inventar cálculos RTA, habilidades nem histórico de batalhas.

## Review Focus
- Voltar/Avançar deve percorrer navegações reais, sem criar entradas em rerenders/hash loops.
- Grupos secundários devem manter todos os destinos e respeitar canAdmin/requiresLogin.
- Sidebar expandida não cobre conteúdo; preferência inválida/storage bloqueado falha com default expandido.
- Histórico novo não incorpora feedback legado e fica isolado por conta.
- Home mantém upload, login inline, atualização/cópia/resgate de cupons.

### Incremento A — navegação e fundamentos
**Files:** Sidebar.jsx, App.jsx, lib/auth.js ou helper dedicado navigation.js, PremiumTactical.css, main.jsx; testes de navegação unit/browser.
**Interface:** cinco chaves portal,siege,optimizer,rune-intelligence,quick; rótulos exatos da especificação. Secundários em Outras ferramentas, Outros modos de jogo, Conta e dados; Admin condicionado.
- [x] TDD: preferência expandida por padrão, hash compatível, histórico e cinco destinos sem perda dos demais.
- [x] Sidebar com grupos, recolhimento persistido, foco e layout sem expansão por hover.
- [x] Tokens scoped no shell; preview antes de avançar.

### Incremento B — Home e Siege
**Files:** EntryPortal.jsx/css e helper de resumo; SiegeAttackDesk/SiegeGuildRows/SiegeCentral.css e hook/core de partidas locais; testes correspondentes.
**Interface:** EntryPortal recebe onNavigate(page), lastWorkspace opcional, preserva callbacks existentes; Siege mantém props existentes, persistência nova isolada sem transformar relatos antigos.
- [x] TDD: snapshot real/ausente, atalhos, cupons/upload; registros explícitos e histórico separado por conta.
- [x] Cards independentes; Ciri perto do SWEX, ações e estado reais; detalhes de counters sob demanda e preparar direto.
- [x] Guilda, votos e recursos antigos continuam em áreas secundárias sem mudar permissões.
- [x] Validar fluxos com fixtures, notas, presets e resultados.

### Incremento C — Calculadora V2
**Files:** QuickCalculator.jsx/V2.css, helper existente de handoff, testes browser.
- [x] Recuperar V2 validada e conservar ordem Siege→Cairos da main atual.
- [x] Apresentar SPD de ficha, combate e diagnóstico honesto (parcial/sem referência/ordem/corte).
- [x] Validar slider/tick, habilidades conhecidas, contextos e versão clássica.

### Incremento D — Rune Optimizer
**Files:** OptimizerTeamRow/Workspace.css, App e helper de handoff existentes.
- [x] Ação Verificar Sincronia integrada da V2; retorno explícito preservando equipamento.
- [x] Ajustar espaço dos cards/lista com sidebar expandida e testar entrada/retorno.

### Incremento E — Rune Intelligence e consistência
**Files:** PremiumTactical.css e estilos scoped de workspaces; documentação e testes.
- [x] Harmonizar superfícies, foco, texto, estados e controles sem tocar Worker/ranking/persistência.
- [x] Suíte completa, build, fluxos principais Playwright, screenshots 1440/1920 e mobile.
- [x] Revisão independente, corrigir regressões, registrar limites e resultados reais.
- [x] Commits, push da branch, verificação da árvore remota. Sem merge ou deploy.

## Evidências
Ver docs/reviews/2026-11-18-premium-tactical-v1.md. Revisão independente executada; correções acompanhadas de casos RED→GREEN.
