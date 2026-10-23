# Central de Siege

A rota `#/siege` concentra o acervo pessoal e os modelos da guilda em um layout master/detail. Links antigos `#/guild` redirecionam para a Central. A navegação principal apresenta uma única entrada.

## Meu Espaço

Ataques e defesas Siege/WGB de três slots continuam em `App.teams` / `AccountContext`, com persistência no IndexedDB. O importador mantém todos os presets e slots vazios. Selecionar uma linha abre apenas aquele time no `TeamEditor` (`singleDetail`), incluindo metas, Speed Tune, diagnóstico, otimização e exportação. A ferramenta de defesas simultâneas permanece acessível no rodapé da lista.

`src/core/siege-central.js` compara as runas dos slots incluídos de todo o acervo Siege. A prioridade é: resultado vigente do otimizador, plano com `accountStamp` atual, equipamento do SWEX. O alerta identifica as runas e os times que compartilham cada uma; não altera o equipamento no jogo. Planos de outro inventário são ignorados. Ao mudar a instância de um slot, o plano daquela posição é descartado.

## Espaço da Guilda

Modelos e counters compartilhados são filtrados pela guilda ativa e por três slots. Templates locais importados e snapshots favoritos permanecem identificados como locais/pessoais. O detalhe apresenta metas, sets, atributos principais, estratégia e cenário, sem controles de edição para membros comuns.

Líderes verificados podem editar a biblioteca local e seus próprios registros na nuvem. A interface não concede permissão para alterar registros de outro autor; o backend continua aplicando ownership, RLS e concorrência por `updated_at`. Trocar a guilda ou o usuário cancela o editor aberto. Não há alteração de schema Supabase nesta refatoração.

Convites e publicação ficam em “Guilda e compartilhamento”. Somente composições portáveis são enviadas; o SWEX e IDs de inventário não entram nesse payload. As funções de feedback, favoritos e exportação continuam disponíveis.

## Cópia e sincronização

O botão principal cria um novo time pessoal e o seleciona imediatamente. A sincronização usa o `masterId` exato, resolve cópias distintas por nível e mantém metas/scenario/defesa inimiga como dados independentes. IDs e runas do autor do template não são reaproveitados. Totens vêm da conta do jogador. A ficha e o equipamento reais são calculados a partir da instância encontrada no inventário global.

Ausência de SWEX impede a sincronização. Se uma instância faltar, o clone é criado com aquele slot pendente e mantém a identidade esperada para seleção manual. O usuário recebe o nome faltante; a otimização fica indisponível até completar ou excluir o slot da busca. Alterar ou excluir o clone não modifica o modelo original.

## Validação

- `npm test`: regressões da aplicação e casos específicos em `tests/siege-central.test.mjs`.
- `npm run build`: rotas, lazy imports e JSX/CSS.
- Playwright/Chromium local: master/detail, permissões de membro/líder, cópia com dados reais de fixture SWEX, conflitos, counters, estados vazios, slots ausentes e layout desktop/mobile. Nuvem simulada, sem gravações em produção.
