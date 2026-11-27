# AI Orchestration Standard — SW Command Center

**Versão:** 1.0 — 23/11/2026  
**Status:** proposta versionada para revisão; nenhuma mudança de código ou produção é autorizada por este documento.

## Objetivo e fonte de verdade
Estabelecer um único fluxo previsível para ChatGPT, Codex e OpenCode, sem fazer três agentes reescreverem as mesmas partes do projeto. O GitHub registra código, documentação, decisões e PRs; cada agente recebe um escopo explícito e entrega evidências, não apenas um relato.

Ordem de referência para decisões: pedido atual do usuário → regras de segurança e publicação → `AGENTS.md` → código e contratos verificados → documentos específicos e plano aprovado. Documentação desatualizada nunca substitui o comportamento comprovado. `GEMINI.md` deve apenas apontar para as regras canônicas, não mantê-las duplicadas.

## Estado técnico inspecionado
- Repositório: `FeehBig010/SwCommandCenter`, branch padrão `main`.
- Frontend: React 19, Vite 6, JavaScript/JSX e CSS; Node.js >=22; npm e `package-lock.json`.
- Persistência local: IndexedDB; integrações de nuvem/Supabase e políticas RLS sob escopo protegido.
- Cálculo: `src/core` contém parser SWEX, optimizer, simulações, Speed Tuner, artefatos, telemetria e Workers. Reutilizar interfaces e cálculos existentes.
- Suítes presentes: `npm test`, `npm run test:browser` e `npm run build`; workflow `.github/workflows/verify.yml`.
- Em 23/11/2026: PR #4 (`refactor/architecture-foundation-20261122`) está em draft e contém `docs/ARCHITECTURE.md`, ausente da `main`. A branch `feat/siege-3v3-validation` também está divergente. Nenhuma deve ser mesclada ou recriada como parte da padronização.

## Papéis e exclusividade

| Ferramenta | Responsabilidade padrão | Limite |
| --- | --- | --- |
| ChatGPT | Traduz objetivo em escopo, prioriza, inspeciona GitHub, decide critérios de aceite, riscos e revisão final | Não presume possuir ambiente local nem aprova deploy em nome do usuário |
| Codex | Executor preferencial de mudanças de código, testes e commits na branch designada | Não modifica `main` ou dados de produção sem autorização; não trabalha simultaneamente no mesmo worktree que OpenCode |
| OpenCode | Executor **alternativo**, exploração local ou revisor de diff em modo somente leitura | Se implementar, assume exclusividade da branch; não repete o trabalho do Codex |
| GitHub/CI | Histórico e provas: issues, branches, PRs, checks e diffs | CI verde não equivale a autorização de merge/deploy |

Se apenas uma ferramenta estiver disponível, ela pode executar mais de um papel sequencialmente, mantendo as mesmas verificações. Não é necessário usar três agentes em toda tarefa.

## Roteamento de Skills (use somente as realmente disponíveis em cada ferramenta)

| Tipo de tarefa | Skills de processo | Skills técnicas / uso |
| --- | --- | --- |
| Nova funcionalidade ou arquitetura | `superpowers/brainstorming` → `writing-plans` | `react-best-practices` se tocar React; leitura de `docs/ARCHITECTURE.md` quando integrada |
| Bug ou regressão | `systematic-debugging` → `test-driven-development` | testes específicos do módulo; `frontend-testing-debugging` quando envolver navegador |
| UI/UX | análise visual e revisão | `design-intelligence/design-audit`; `visual-direction` apenas se houver redesign autorizado |
| SWEX, runas, Siege, velocidade | investigação de contratos e testes de domínio | `sw-os-builds` é **consultiva e read-only** para dados de conta; nunca substitui `src/core/optimizer.js`, `src/core/speedTuner.js` e Workers |
| Supabase, autenticação, RLS | modelagem de risco + testes | `supabase-postgres-best-practices` quando disponível; proibir migração implícita |
| Integração/release | `requesting-code-review` e `verification-before-completion` | CI, diff, smoke test, revisão humana, autorização expressa de merge e deploy |

**Não pressupor sincronização de Skills:** as 133 Skills disponíveis no ChatGPT não são automaticamente instaladas no Codex ou OpenCode. O `AGENTS.md` fornece regras comuns; Skills só se aplicam quando disponíveis no ambiente ativo. Para uma rotina recorrente específica, considere futuramente `.agents/skills/<nome>/SKILL.md`, sem copiar todo o catálogo.

## Protocolo de execução — sete gates

1. **Intake:** objetivo em uma frase, ação esperada, não objetivos e critério de aceite.
2. **Baseline:** branch/commit atual, `git status`, PRs concorrentes, dados e fluxos críticos relacionados. Nunca limpar alterações não reconhecidas.
3. **Mapa de impacto:** componentes, módulos, integrações, contratos e testes. Informar risco e rollback antes de editar.
4. **Implementação isolada:** branch curta (`feat/`, `fix/`, `refactor/` ou `docs/`), um único editor por worktree, mínimo diff possível.
5. **Verificação:** testar a falha antes/depois (quando corrigir bug), executar conjunto relevante, build, navegador quando houver UI e revisar console. Nenhuma alegação sem saída verificável.
6. **Review:** diff e segurança, contas/guildas, persistência, compatibilidade SWEX, UX e rollback. Criar PR em draft; não declarar solução pronta com checks parciais.
7. **Entrega controlada:** usuário decide se merge/deploy será executado; nunca acoplar migração de produção à publicação de UI.

## Comandos de referência
`npm ci` — preparar ambiente reprodutível quando necessário.  
`npm test` — contratos e regressões automatizadas.  
`npm run test:browser` — fluxo real no navegador; relatar ausência de dependências/ambiente se houver.  
`npm run build` — verificar empacotamento.  
`git status --short` e `git diff --check` — verificar alterações locais e integridade do diff.

Use os scripts existentes; não substitua o runner nem adicione bibliotecas só para executar o fluxo. Para uma alteração exclusivamente documental, verifique links, caminhos, diff e integridade dos arquivos; não alegue que a suíte do aplicativo foi executada sem rodá-la.

## Checklist mínimo de preservação
- SWEX, IDs físicos de monstros/runas/artefatos, múltiplas contas e contexto de presets.
- Optimizer, Speed Tuner, combate, ordem de turnos, Workers e resultados.
- Dados locais, snapshots, backup/restore e ações explícitas de salvamento.
- Isolamento, políticas RLS e segurança de perfis/guildas.
- Siege, Arena, RTA, PvE, Rune Intelligence, calculadoras, Códigos & Eventos e navegação.
- UI existente, responsividade, erros, tooltips e acessibilidade nos fluxos afetados.

A lista é uma orientação de risco; o executor deve identificar e testar os fluxos efetivamente tocados.

## Modelo único de handoff (ChatGPT ↔ Codex ↔ OpenCode)

```text
TAREFA: [objetivo e resultado esperado]
BASE: [repo / branch / commit]
DONO DA EDIÇÃO: [Codex | OpenCode | ChatGPT]
ESCOPO: [arquivos/áreas permitidos]
PRESERVAR: [contratos e fluxos existentes]
NÃO FAZER: [migração, deploy, refatoração adjacente etc.]
CRITÉRIOS DE ACEITE: [comportamentos demonstráveis]
TESTES: [antes/depois, comandos e ambiente]
RISCO / ROLLBACK: [possível efeito e como reverter]
ENTREGA: [commit, PR draft, resumo, testes reais e pendências]
```

## PR template simples
Descrição: problema → mudança mínima → por que não quebra contratos.  
Evidências: testes executados e respectivas saídas, checks CI, screenshots se houver UI.  
Segurança: dados/persistência/permissões/migrações impactados ou “não alterados”.  
Riscos: conhecidos, pendentes e plano de reversão.  
Estado: **draft até aprovação explícita**. Não realizar merge, deploy ou operações de banco automaticamente.

## Primeiro uso prático
1. Revisar este padrão como documentação, sem alterar código.
2. Aplicar estas regras à próxima tarefa real, elegendo **Codex ou OpenCode**, não ambos, como executor.
3. Antes de qualquer avanço na arquitetura, revisar o PR #4 e resolver sua divergência da `main` sem merge automático.
4. Avaliar `feat/siege-3v3-validation` em fluxo separado, preservando seus commits e sem misturar seu escopo com a fundação arquitetural.
