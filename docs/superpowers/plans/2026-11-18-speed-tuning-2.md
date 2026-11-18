# Speed Tuning 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development task-by-task. Steps use checkbox syntax.

**Goal:** Integrar seleção explícita SWEX/catálogo, habilidades suportadas e SYNC/ENEMY/TICKS verificáveis à calculadora real.
**Architecture:** Reutilizar quick-calculator/speedTuner, presets/handoff e retratos; helpers puros para seleção, compartilhamento e cobertura. Modelo de ficha inclui Swift uma vez; entrada Runas exclui Swift. Não substituir optimizer nem engines existentes.
**Tech Stack:** React19/Vite/CSS/node:test/Playwright, sem dependências novas.
**Spec:** docs/superpowers/specs/2026-11-18-speed-tuning-2.md

## Global Constraints
- Branch feature/speed-tuning-calculator-2 a partir da Premium Tactical; sem merge main/deploy.
- Não modificar inventário/presets originais. Meus monstros é ação explícita; catálogo base-only.
- Office/War, slider e tick como opções diretas, versão clássica e handoff preservados.
- RTA permanece experimental; habilidades não modeladas explicitamente limitadas.
- Os três documentos nomeados na especificação não existem em /workspace (busca realizada); usar AGENTS, docs e especificação entregue.

## Review Focus
- Snapshot ausente/desatualizado e cópias: nunca substituir unidade por outra cópia silenciosamente.
- Compartilhamento não contém account/unit/rune IDs, nomes privados de equipes, credenciais ou inventário; payload limitado e validado.
- Formações parciais preservam índices de eventos ally:N e não garantem sincronia de slots ausentes.
- Nenhum bônus Swift/artefato/skillup duplicado; ajuste de buff de artefato não é SPD plana.
- Ações de reordenação não devem reescrever contexto privado ou equipar runas.

### A — contexto real e habilidades do snapshot
Files: quick-selection.js novo; quick-presets.js, optimizer-sync-handoff.js e account-cloud.js conforme necessidade; testes selection/cloud/presets.
Interface: selectOwnedQuickMonster(team,key,unitId,account) -> nova cópia do plano, snapshot por unidade específica; skillLevels normalizados em configs e backup sanitizado.
- [x] Testar RED duas cópias/contexto RTA/sem unidade, sem mutação do account, skilllevels e roundtrip.
- [x] Implementar reutilizando quickTeamFromPreset e parser atuais; nenhuma migração.
- [x] Executar testes focados GREEN; entregar contrato para UI.

### B — matemática e habilidades suportadas
Files: quick-calculator.js, speedTuner.js, helper skill-effect novo se necessário; testes unitários.
Interface: quickPreview aceita includePartial:true preservando disabled slots; autoTuneQuickTeam ajusta subset ativo; objeto preview identifica partial. Nível Bernard suporta exclusivamente curva explicitamente validada, legado manual preservado.
- [x] RED: Bernard111+100/+101, torres0/15, Tiana96Swift, base/full30/34.5, artefatoSPDUP12; caso partial2/3, Leo/Miles/Chilling, empates e adversário.
- [x] Implementar suporte estrito e documentar diferenças da referência; sem inferir skillups genéricos.
- [x] Ticks: capturar velocidade runtime verdadeira e horizonte limitado; primeira rotação explícita, sem prometer efeitos/cooldowns além do modelo.
- [x] Rodar regressões matemáticas GREEN e explicar entradas completas necessárias a+48/+49/+57.

### C — configuração portátil e UX
Files: calculator-share.js, QuickCalculator.jsx, QuickCalculatorV2.css, novos componentes pequenos se necessário, testes share/browser.
Interfaces: encodeCalculatorShare(team)->payload URL seguro; decodeCalculatorShare(payload)->plano manual novo sem identidades privadas; consume somente por ação/URL explícita.
- [x] RED validação por whitelist, roundtrip e payload malformado/limites; implementar helper.
- [x] Seletores Meus monstros/Todos com cópias específicas; remover por slot; confirmar limpar, cancelar preserva estado.
- [x] Ordem desejada separada de posição física; starter explícito; ações diretas e acessíveis.
- [x] Card exibe identidade/ficha/runaSwift/combate/mínimo; artefato buff separado do ajuste hipotético legado; habilidades ativas/passivas e suporte claros, controles por nível.
- [x] SYNC/ENEMY/TICKS mostram conteúdo relevante, inimigo copiarStarter e efeitos manuais/globais via editor existente; alterações em tempo real, nenhuma aplicação de equipamentos.
- [x] Compartilhar por ação explícita, importar link sanitizado, snapshots isolados por conta.

### D — validação e entrega
- [x] Playwright desktop1440/1920/mobile, War/Office, parcial/catalogo/SWEX/preset/handoff/URL/clear e screenshots reais.
- [x] Suíte completa/build, regressões atuais sem remover testes; investigar falhas.
- [x] Revisão independente, corrigir achados, documentação da cobertura/matemática/limitações.
- [x] Commit/push branch com deploy desativado e verificar SHA remoto. Sem main merge/deploy.

## Evidências e limites
Relatório docs/SPEED_TUNING_2.md;642testes unitários/integração, nove scripts Playwright relevantes e build. Revisão independente corrigida com RED→GREEN. RTA, Chilling e durações não modeladas explicitamente limitados; nenhum suporte universal foi declarado.
