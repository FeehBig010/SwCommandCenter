# Central de Siege

A rota `#/siege` concentra o acervo pessoal e os modelos da guilda em um layout master/detail. Links antigos `#/guild` redirecionam para a Central. A navegação principal apresenta uma única entrada.

## Meu Espaço

Ataques e defesas Siege/WGB de três slots continuam em `App.teams` / `AccountContext`, com persistência no IndexedDB. O importador mantém todos os presets e slots vazios. Selecionar uma linha abre apenas aquele time no `TeamEditor` (`singleDetail`), incluindo metas, Speed Tune, diagnóstico, otimização e exportação. A ferramenta de defesas simultâneas permanece acessível no rodapé da lista.

`src/core/siege-central.js` compara as runas dos slots incluídos de todo o acervo Siege. A prioridade é: resultado vigente do otimizador, plano com `accountStamp` atual, equipamento do SWEX. O alerta identifica as runas e os times que compartilham cada uma; não altera o equipamento no jogo. Planos de outro inventário são ignorados. Ao mudar a instância de um slot, o plano daquela posição é descartado.

## Espaço da Guilda

Modelos e counters compartilhados são filtrados pela guilda ativa e por três slots. Templates locais importados e snapshots favoritos permanecem identificados como locais/pessoais. O detalhe apresenta metas, sets, atributos principais, estratégia e cenário, sem controles de edição para membros comuns.

Líderes verificados podem editar a biblioteca local e seus próprios registros na nuvem. A interface não concede permissão para alterar registros de outro autor; o backend continua aplicando ownership, RLS e concorrência por `updated_at`. Trocar a guilda ou o usuário cancela o editor aberto. Votos e Defesa Alvo usam a migration `202610230001_guild_attack_votes.sql`; veja `docs/SUPABASE.md`.

Convites e publicação ficam em “Guilda e compartilhamento”. Somente composições portáveis são enviadas; o SWEX e IDs de inventário não entram nesse payload. As funções de feedback, favoritos e exportação continuam disponíveis.

## Cópia e sincronização

O botão principal cria um novo time pessoal e o seleciona imediatamente. A sincronização usa o `masterId` exato, resolve cópias distintas por nível e mantém metas/scenario/defesa inimiga como dados independentes. IDs e runas do autor do template não são reaproveitados. Totens vêm da conta do jogador. A ficha e o equipamento reais são calculados a partir da instância encontrada no inventário global.

Ausência de SWEX impede a sincronização. Se uma instância faltar, o clone é criado com aquele slot pendente e mantém a identidade esperada para seleção manual. O usuário recebe o nome faltante; a otimização fica indisponível até completar ou excluir o slot da busca. Alterar ou excluir o clone não modifica o modelo original.

## Validação

- `npm test`: regressões da aplicação e casos específicos em `tests/siege-central.test.mjs`.
- `npm run build`: rotas, lazy imports e JSX/CSS.
- Playwright/Chromium local: master/detail, permissões de membro/líder, cópia com dados reais de fixture SWEX, conflitos, counters, estados vazios, slots ausentes e layout desktop/mobile. Nuvem simulada, sem gravações em produção.

## Seleção, formulários e conjuntos

Selecionar um time pessoal preenche metas numéricas e sliders com a ficha real das runas/artefatos atuais ou do plano aplicado. Metas próprias já preenchidas são preservadas. O preenchimento automático registra sua origem para atualizar somente valores ainda não editados quando o equipamento mudar. Sets completos de quatro peças aparecem primeiro; a ordenação não muda o equipamento. Os formulários compactos mantêm inputs numéricos e ranges sincronizados.

## Recursos das defesas do JSON

“Planejar Defesas Simultâneas” apresenta as defesas nativas e pergunta se o usuário deseja buscar melhorias.

- **Sim:** um Web Worker busca melhorias incrementais usando runas livres e equipadas nessas defesas. Cada troca ou permuta entre dois defensores precisa preservar todos os limites originais de HP, ATK, DEF, SPD, TC, DC, RES, ACC, SPD de combate e conjuntos completos, em todos os contextos em que a unidade aparece. Reservas, travas e atribuições RTA continuam respeitadas. A busca é limitada a quatro passagens/100 mil avaliações; o relatório informa o limite e não promete ótimo global. Loadouts incompletos ou conflitantes exigem correção antes de aplicar.
- **Não:** salva uma política por inventário e cria `AccountContext.filteredInventory`, excluindo todos os IDs das runas das defesas. O Worker principal recebe esse inventário, e diagnósticos/aplicação também respeitam os IDs bloqueados. Nova importação invalida políticas do inventário anterior.

Aplicar melhorias revalida IDs únicos, inventário original, reservas e todos os limites antes de gravar `plannedRunes` no acervo. O SWEX original permanece intacto. Não há alteração automática no jogo.

## Compartilhamento de ataques

O botão “Compartilhar” na lista pessoal pede “Enviar para o Espaço da Guilda? (Sim/Não)”. Sim publica o template na guilda ativa; Não encerra sem POST. No detalhe da guilda, membros votam e somente o autor edita Defesa Alvo. Os testes de UI usam Auth/REST simulados, sem publicar times em produção.
