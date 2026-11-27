# SW Command Center — Instruções canônicas para agentes

Estas regras valem para ChatGPT, Codex, OpenCode e demais agentes que atuem neste repositório. Leia primeiro este arquivo e, para tarefas de desenvolvimento, `docs/AI_ORCHESTRATION.md`. Inspecione o código real antes de propor alterações. O repositório e os testes são a referência técnica; a conversa não substitui a inspeção.

## 1. Preservação obrigatória
- Preserve funcionalidades, dados, contratos SWEX, IDs físicos de unidades/runas, presets, contas, permissões, segurança, histórico, IndexedDB e integrações existentes.
- Preserve os motores atuais de otimização, combate, velocidade e seus Workers. Não reescreva ou troque stack, persistência ou framework por conveniência.
- Prefira incrementos pequenos, reversíveis, com mudanças limitadas ao domínio solicitado. Não refatore áreas adjacentes sem justificativa e autorização específicas.
- Toda alteração de comportamento deve ter evidência de testes de regressão. Não invente validações, estatísticas ou resultados do jogo.

## 2. Padrão visual existente
- Mantenha cards independentes, espaços claros, bordas sutis e hierarquia visual legível. Evite interfaces densas e alterações visuais fora do escopo.
- Deixe a ação principal do contexto evidente; use navegação ou controles secundários quando isso simplificar a tela, sem esconder ações essenciais.
- Preserve a identidade visual, responsividade, acessibilidade e interações já validadas. Inspecione o preview e o console antes de declarar qualquer mudança visual concluída.
- Separe regras de cálculo e persistência dos componentes de apresentação.

## 3. Controle de execução e publicação
- Trate `main` e dados de produção como protegidos. Trabalhe em branch específica; não faça push direto na `main`, force-push ou operações destrutivas.
- **Nunca execute merge, deploy de produção, migração de banco, mudança de RLS/permissões ou modificação de dados reais automaticamente.** Cada operação exige autorização explícita para a ação concreta, mesmo depois de testes aprovados.
- Um único agente/editor pode modificar a mesma branch/worktree por vez. ChatGPT planeja e revisa; Codex ou OpenCode executa, conforme o responsável designado. Não execute dois agentes implementadores na mesma árvore de trabalho.
- Alterações externas e trabalho não relacionado encontrados no repositório devem ser preservados, não revertidos.

## 4. Fluxo obrigatório por tarefa
1. Diagnóstico: leia o estado Git, `README.md`, arquivos relevantes, regras e testes existentes. Verifique branches/PRs relacionados.
2. Escopo: descreva objetivo, arquivos afetados, riscos, comportamento a preservar e critérios de aceite. Para trabalho substancial, documente plano antes da implementação.
3. Execução: crie branch por tarefa; use os motores existentes e, para correções, demonstre regressão antes/depois quando viável.
4. Verificação: execute os testes relevantes e `npm test`, `npm run test:browser` e `npm run build` quando o tipo de mudança exigir. Reporte exatamente o que rodou, o que falhou e o que não pôde ser testado.
5. Revisão: inspecione o diff, estados de erro, segurança, isolamento de dados e regressões de UI. Use draft PR para revisão; merge/deploy somente com autorização explícita.

## 5. Áreas protegidas
- `src/core/`: parser SWEX, combate, optimizer, Speed Tuner, runas/artefatos e Workers.
- `src/core/storage.js` e integrações em `src/lib/`: persistência, autenticação e dados privados.
- `supabase/`: schemas, migrações, políticas RLS, isolamento entre contas/guildas.
- `src/App.jsx` e telas: navegação, estado, layouts e workflows do usuário.
- `tests/`: provas de comportamento que não devem ser removidas para "fazer passar".

## 6. Handoff obrigatório
Ao finalizar cada tarefa, forneça: branch/commit/PR, arquivos alterados, comportamento preservado, comandos e resultados verificáveis, pendências/riscos e a próxima ação recomendada. Nunca declare "validado" apenas com base na descrição de um agente.

**Referência operacional:** `docs/AI_ORCHESTRATION.md`.
