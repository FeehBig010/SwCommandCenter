# Guild Intelligence — Siege

## Arquitetura auditada

O site é React 19/Vite. A sessão continua sendo a de Supabase Auth (`useAuth`), com perfil validado em `useProfile`. Guildas e cargos vêm de `guilds`, `guild_members` e `profiles`; o nome encontrado no SWEX não concede associação. `useGuildCloud` permanece responsável pela guilda ativa e pelos convites. O catálogo `MONSTER_CATALOG`, o seletor virtualizado `MonsterSearch`, `MonsterPortrait`, os presets locais/SWEX e o payload portátil de `hub.js` são reutilizados.

Os counters continuam em **`guild_teams`**, e podem ser vistos também na Central de Siege existente. As políticas gerais que restringem escrita em templates/planos à liderança foram preservadas. O novo RPC `gi_save_counter` permite ao membro publicar/editar somente um counter compartilhado de Siege válido. Não libera INSERT/UPDATE genérico nessa tabela e não compartilha inventário, IDs das cópias, runas ou snapshots SWEX. Uma referência SHA-256 identifica o preset de origem sem publicar o identificador local; o nome e a composição portátil ficam salvos no counter. O preset original não é alterado. O vínculo é uma referência/snapshot da composição portátil; apagar ou modificar o preset local depois não reescreve o counter compartilhado.

## Migração

Aplicar **`supabase/migrations/202610270001_guild_intelligence.sql`** depois das migrations existentes, pelo workflow ou `supabase db push` no projeto correto. A migration:

- Cria `siege_defense_catalog`, privado por guilda, com três IDs reais, líder, chave canônica, categoria/faixa opcionais, origem, proveniência da própria guilda ou externa, data e autorização de importação.
- Acrescenta metadados `gi_*` aos counters em `guild_teams`, com FKs e índices de duplicação/idempotência.
- Cria `guild_counter_battles`, com uma linha por combate autorrelatado, autor, data, observação e idempotência. FK composta impede associar um combate à guilda errada.
- Cria uma allowlist de IDs/nomes públicos derivada do catálogo já embarcado, para validar os IDs também no backend. Ela não contém dados da conta. Novos IDs adicionados ao catálogo precisam ser incluídos por migration nessa allowlist para uso no módulo.
- Habilita RLS nas novas tabelas, concede somente leitura autorizada e expõe operações de escrita via RPCs com `search_path` fixo e associação/cargo verificados no banco.
- Inclui no catálogo as defesas dos counters legados aprovados/portáteis. Um trigger mantém essa compatibilidade com futuras publicações pelo módulo antigo.

Não converte `payload.outcome`, votos, reações nem `counter_feedback` em combates: essas fontes não comprovam eventos individuais. O histórico novo começa vazio mesmo quando o counter legado tem uma declaração de vitória.

Não há conexão administrativa com o Supabase de produção neste ambiente. Os testes executam as migrations reais em PostgreSQL/PGlite local. Para disponibilizar a persistência no site publicado é necessário aplicar a migration no Supabase real; um erro de RPC ausente exibe essa orientação na UI.

## Permissões e integridade

Todos os acessos exigem autenticação e associação à guilda ativa, inclusive para administradores. Membros cadastram counters e resultados; podem editar/excluir seus próprios counters e corrigir/excluir seus resultados. Líderes da própria guilda administram defesas/importações, moderam counters e podem remover resultados. Um líder não edita o relato de outro jogador; pode removê-lo. Autores e datas de criação são definidos pelo banco, não por campos editáveis da interface.

A chave da defesa preserva o ID do líder e ordena apenas os outros dois IDs. Offenses preservam a ordem dos três IDs e o índice do líder. A mesma composição por autores diferentes é válida. O mesmo autor/defesa/offense/líder/preset gera conflito de duplicação; uma repetição da mesma solicitação retorna o registro existente. Edições de counters e resultados usam `updated_at` para impedir sobrescritas silenciosas. Composição, líder e vínculo de preset não podem mudar depois de haver combates, para não reaproveitar estatísticas de outro time.

## Fluxo

**Guild Center → Guild Intelligence → Defesa → Adicionar Counter → Preset próprio ou três monstros → Estratégia opcional → Salvar e compartilhar.** Não exige SWEX, status, runas, velocidade nem batalha anterior. Quem não carregou inventário pode selecionar monstros pelo catálogo existente.

O catálogo é administrado pela liderança. Membros sem uma defesa cadastrada podem pedir seu cadastro à liderança; a interface informa isso no estado vazio. Os indicadores de categoria e G1/G2/G3 são informados pela origem, não inferidos de uma composição.

O contador de batalhas e a taxa observada usam exclusivamente os registros de `guild_counter_battles`. Zero combates: **Não testado**, sem taxa. Um a quatro: **Testado · Amostra insuficiente**. Cinco ou mais: **Testado**. Não há promessa de taxa representativa nem verificação automática. Os indicadores da guilda contam todas as linhas elegíveis no banco, independentemente da paginação da UI. Consultas de catálogo, counters e histórico usam páginas de 50 registros.

## Importação administrativa

Até 500 KB e 200 defesas por lote. O arquivo inteiro é validado no cliente e no banco; falha em qualquer registro desfaz o lote. Duplicatas equivalentes não sobrescrevem a origem já cadastrada. A confirmação exige nome da fonte, identificação de proveniência (arquivo da própria guilda ou fonte externa) e uma declaração de autorização/licença. Os rótulos dessas duas origens são distintos na UI.

JSON:

```json
{"version":1,"defenses":[{"monster_ids":[18913,13413,19614],"leader_index":0,"observed_at":"2026-10-27","tier":"G1"}]}
```

CSV UTF-8, com suporte a aspas escapadas, vírgulas em campos, BOM e CRLF:

```csv
monster_1,monster_2,monster_3,leader_index,category,tier,observed_at
18913,13413,19614,0,,G1,2026-10-27
```

Os exemplos demonstram somente o formato; não são uma afirmação de popularidade ou recomendação competitiva. `leader_index` usa 0–2. Categoria e faixa podem ficar ausentes. JSON pode conter `popularity` somente em uma importação autorizada: `{ "count": 10, "unit": "defenses", "period": "período real da fonte" }`; seu rótulo é **Uso na fonte**, separado das estatísticas da guilda.

## Fontes externas investigadas

| Fonte solicitada | Integração neste MVP | Situação de termos/licença/API |
| --- | --- | --- |
| SWGT Defense Trending | Nenhuma coleta automática | Não foi possível confirmar um meio oficial e autorização de reutilização nesta sessão. |
| SWLens Trending Siege Teams | Nenhuma coleta automática | Não foi possível confirmar um meio oficial e autorização de reutilização nesta sessão. |
| Rosa Midman Siege Trending | Nenhuma coleta automática | Não foi possível confirmar um meio oficial e autorização de reutilização nesta sessão. |

A ferramenta de pesquisa disponível retornou erro e a política de rede do ambiente não libera esses destinos. Isso não demonstra que uma integração não exista nem que o uso esteja permitido. Não foram copiadas bases, rankings, composições populares nem números desses serviços. Uma integração futura deve confirmar a licença/termos e usar um endpoint documentado/autorizado, entregando o mesmo DTO validado de importação com origem e data. O envio manual de um arquivo de terceiro continua dependendo de autorização real; a declaração registrada não substitui essa autorização.

## Verificação

- `tests/guild-intelligence.test.mjs`: identidade com líder, IDs reais, JSON/CSV, proveniência, duplicações, presets imutáveis e estatísticas sem vitórias implícitas.
- `tests/guild-intelligence-cloud.test.mjs`: contrato dos RPCs, escopo, paginação, referência opaca de preset e erros PT-BR.
- `tests/guild-intelligence-rls.test.mjs`: migrations reais, permissões de membros/líderes, isolamento de duas guildas, cadastro sem batalha, idempotência, resultados e correções, exclusão, FKs e integração dos counters legados.
- `tests/browser/guild-intelligence.mjs`: fluxo no site real com sessão de teste e RPCs executados no PostgreSQL local; desktop/mobile e persistência após recarregar.
- `npm test`, `npm run test:browser`, `npm run build`. O projeto não oferece script de lint.

## Arquivos do módulo

- Navegação: `src/App.jsx`, `src/components/Sidebar.jsx`, `src/core/navigation-access.js`.
- Interface: `GuildCenter.jsx`, `GuildIntelligence.jsx`, `GuildIntelligenceForms.jsx`, `GuildCounterHistory.jsx`, `IntelligenceLineup.jsx` e `GuildIntelligence.css`, em `src/components/`.
- Modelo/integração: `src/core/guild-intelligence.js`, `src/lib/guild-intelligence.js`, `src/hooks/useGuildIntelligence.js`.
- Banco: migration `202610270001_guild_intelligence.sql`.
- Validação: os quatro arquivos de testes Guild Intelligence citados acima, `scripts/run-browser-tests.mjs` e a ordem cronológica de migrations em `tests/privacy-hardening-rls.test.mjs`.
