# Arquitetura atual e regras de evolução — SW Command Center

> Documento operacional de arquitetura, iniciado em 22/11/2026. Descreve o estado verificado do repositório, não uma reorganização já concluída.

## Objetivo
Preservar as funcionalidades existentes e tornar as próximas mudanças menores, testáveis e consistentes entre ChatGPT, OpenCode, Codex e outros agentes.

## Panorama técnico confirmado
- **Interface:** React 19, Vite 6, JSX e CSS.
- **Persistência local:** abstração em `src/core/storage.js`; dados de jogo importados via SWEX.
- **Integrações:** `src/lib` e `supabase/` contêm serviços remotos e evolução do banco.
- **Cálculos:** `src/core` concentra otimização de runas, artefatos, simulação de combate e velocidade, importação e normalização; vários motores usam Web Workers.
- **Entrega:** `.github/workflows/verify.yml` executa testes, testes de navegador e build. Migrações de produção são opt-in explícito.
- **Regras de agentes:** `AGENTS.md` e `GEMINI.md` contêm orientações existentes. Em uma tarefa de refatoração, a instrução explícita de preservar `main` e não publicar prevalece sobre a regra genérica de deploy automático.

## Responsabilidades recomendadas
| Local | Responsabilidade |
| --- | --- |
| `src/core` | Regras de domínio e projeções puras; sem renderização React, acesso implícito à rede nem gravação de dados |
| `src/lib` | Clientes, autenticação e transporte de integrações externas |
| `src/hooks` | Coordenação de estado, efeitos e operações React |
| `src/components` | Componentes visuais e interação, preferencialmente sem cálculos do jogo |
| `src/pages` | Composição das telas e seus casos de uso |
| `src/contexts` | Contextos React compartilhados, com contratos explícitos |
| `tests` | Contratos de jogo, persistência, segurança, componentes e regressões |
| `docs` | Decisões, contratos e manuais de funcionamento |

Isso é a direção de evolução, **não** autorização para mover todos os arquivos de uma vez. As fronteiras atuais ainda têm sobreposições.

## Fluxos críticos que não podem mudar silenciosamente
1. SWEX bruto → validação/normalização → unidades e equipamentos por IDs físicos → projeções de leitura → UI.
2. Preset/deck → área e contexto correto (Siege, Arena Regular, Interserver, RTA e PvE).
3. Otimização → Workers e motores existentes → resultados simulados → salvamento ou aplicação por ação explícita.
4. IndexedDB/backup privado → reconciliação e recuperação sem apagar dados de usuário.
5. Migrações Supabase somente com consentimento e processo específico.

## Primeira extração controlada
`src/core/account-deck-lists.js` agora possui a projeção `buildAccountDeckLists(hydratedPresets)`, antes embutida em `src/App.jsx`.

- Mantém a ordem das listas e os objetos originais.
- Preserva a distinção de Arena Regular, Interserver e RTA.
- Preserva as chaves legadas como `deck_list`, `party_deck`, `dungeon_deck` consumidas pela UI.
- Não muda dados gravados nem a lógica dos otimizadores.
- Testes: `tests/account-deck-lists.test.mjs`.

## Próximas auditorias (ainda não implementadas)
1. **Separação gradual do `src/App.jsx`:** distinguir importação/armazenamento de estado, ações de otimização e renderização; extrair por domínio apenas depois de testes comportamentais.
2. **CSS:** mapear `src/styles.css`, a cascata e os overrides antes de dividir; consolidar sem regressão visual.
3. **Builds e Speed Tuner:** mapear dependências de `optimizer.js`, `speedTuner.js` e respectivas interfaces, sem trocar motores comprovados.
4. **Qualidade automatizada:** avaliar ESLint/Prettier, cobertura e testes de componentes, adotando regras incrementalmente em vez de formatar centenas de arquivos na mesma PR.
5. **Documentação e agente:** eliminar contradições entre README, CONTEXT.md, AGENTS.md e GEMINI.md após auditoria; manter fonte de verdade única para decisões.
6. **Privacidade e autenticação:** verificar isolamento Supabase, RLS, snapshots e rotas de proteção com testes de segurança.
7. **UX e performance:** medir bundles, renderizações e fluxos antes de decidir ajustes visuais.

## Processo para qualquer agente
1. Ler `AGENTS.md`, este documento e os arquivos afetados.
2. Formular mudança pequena com risco, critérios de aceitação e testes.
3. Criar branch de trabalho, preservar `main` e alterações externas.
4. Fazer testes de regressão antes e depois da mudança, sem confiar apenas no build.
5. Revisar diffs, segurança, persistência e efeitos sobre a UI.
6. Abrir PR com evidências de testes. Não declarar “validado” sem resultados reais.
7. Para a reorganização atual, **não fazer merge, deploy, migração ou alteração de produção automaticamente**.

## Critério de sucesso
A arquitetura melhora quando uma modificação pontual exige menos arquivos, conserva o comportamento observável e fica mais fácil de testar; número de pastas ou linhas removidas não são métricas suficientes.
