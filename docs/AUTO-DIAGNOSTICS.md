# Decks SWEX, diagnóstico local e validação por área

## Importação automática

`core/decks.js` conserva somente nome, IDs das unidades da conta, referências ausentes e área/masmorra reconhecida. Aceita `monster_ids`, `unit_id_list` e `unit_ids`, inclusive estruturas agrupadas por área. Nomes como GB12/DB12/NB12/GBAH/DBAH/NBAH/SF10/PC10 e os IDs públicos de masmorra são reconhecidos. Os IDs foram conferidos em `Xzandro/sw-exporter`, commit `eb7f8c09b976d7b76c51ebb30765bfdf381c3888`, `app/mapping.js` (dungeon): 8001/8011 Gigante/Boss Abissal, 9001/9011 Dragão, 6001/6011 Necro, 9501 SF10, 9502 PC10. Tipos numéricos opacos não são tratados como IDs de masmorra. Cinco slots sem metadados não identificam um chefe; ficam disponíveis para seleção manual na aba desejada. Defesa Arena e defesas Siege nativas também complementam `deck_list`, sem duplicar composições equivalentes.

`account-teams.js` preenche Siege (3), Arena (4) e planos Cairos (5) com as cópias exatas e os equipamentos atuais. Nunca substitui uma unidade ausente por outra cópia silenciosamente. Reimportação da mesma conta atualiza os decks reconhecidos, preserva metas das unidades ainda presentes e nomes renomeados, descarta planos de runas antigos e mantém times manuais. Uma conta diferente não herda planos anteriores. IDs de decks explícitos permanecem estáveis quando outros decks são inseridos. A primeira composição por masmorra é selecionada; o seletor oferece as alternativas. Planos Cairos e edições são persistidos em IndexedDB em `cairosPlans`.

## Diagnóstico e aplicação

`useTeamDiagnostics` agenda após 450 ms um único worker que analisa os times da área sequencialmente. Mudanças nas metas/conta/opções/reservas cancelam a tarefa anterior e invalidam os relatórios; desmontar a área encerra seu worker. O processamento não bloqueia a interface e não exige clicar em Test/Otimizar.

A comparação usa somente runas **do próprio time** e **desequipadas**, valores atuais (sem gems/grinds hipotéticos), respeitando filtros de bloqueio e reservas. Propostas mantêm os atributos de ficha, a SPD de combate atual e os conjuntos completos atuais ou requisitos explícitos. A aplicação valida novamente assinatura, propriedade das runas, slots, unicidade e reservas. Não rouba equipamentos de outros monstros. Planos já aplicados em outras composições reservam suas runas; times inativos não reservam. A busca manual respeita planos locais fora do grupo pesquisado.

O botão **⚡ Aplicar Otimização** altera somente o plano local `plannedRunes`. Os cards/ticks/checklists passam a usar essas runas; seus IDs aparecem nos detalhes do diagnóstico. **Voltar ao SWEX** descarta esse plano. O inventário importado não é modificado e nenhuma ação equipa runas no servidor do jogo. Reimportar invalida o plano pelo carimbo de conta/importação.

As badges distinguem melhoria, falha, metas atendidas na busca e análise pendente/indisponível. As propostas exibem ganhos reais de SPD/atributos ou dano quando existe um cenário de dano configurado. Busca por beam/candidatos é limitada: “nenhuma melhoria encontrada” não prova eficiência global de 100%. Sem SPD inimiga, o relatório declara que corte não foi validado. Falhas por área (Arena/Nemesis, caps/ordem/sobrevivência Cairos) entram nos avisos, além das metas e passivas suportadas.

## Fila e distribuição

Não há limite artificial de dez times nem cinquenta monstros. Composições podem ser ativadas/desativadas; todos os integrantes ativos ainda precisam ser cópias distintas da conta e disputar uma única distribuição sem repetir runas. O worker pode ser cancelado; grandes filas continuam limitadas pela memória/CPU e pela busca heurística.

A comparação de distribuições é lexicográfica: primeiro o grupo **👑 Prioridade**, depois os demais. Em cada grupo, minimiza o maior déficit médio normalizado por time, depois o total; com metas comparáveis, reduz a maior perda relativa de qualidade em relação aos melhores candidatos individuais. A distribuição padrão procura evitar concentrar todas as boas runas num time e deixar outro para trás. Isso não garante o ótimo global; restrições e inventário podem impedir que todas as composições atinjam suas metas. Cargos Supabase e prioridade local de runas são conceitos separados.

## Líder, Arena e Cairos

`leaderImpact` compara os atributos de combate com e sem o líder, depois dos arredondamentos, passivas, buffs e tetos. HP/ATK/DEF incidem sobre a base; líderes de SPD seguem a fórmula compartilhada; CR/RES/ACC respeitam 100. Os cards mostram o delta efetivo e avisam quando o líder não se aplica ao modo/elemento. `utils/speedTuner.js` re-exporta a única implementação de `core/speedTuner.js`.

Arena recebe SPD base, +SPD de runas sem Swift, presença de Swift, torre e líder inimigos. Usa a mesma simulação discreta, com desempates conservadores para o inimigo. “1º Turno Garantido no cenário informado” é condicionado aos dados inseridos; passivas não cobertas geram avisos. Nemesis usa dano já resolvido em % de HP após um atacante escolhido, quantidade de sets e SPD do curandeiro. Não presume o dano nem uma defesa desconhecida.

Cairos valida a sequência dos cinco slots e os ticks naturais. Com SPD do chefe fornecida, compara o primeiro turno do chefe com os cinco aliados. ACC de planejamento começa em 45% e sobe quando o perfil exige mais; TC alvo é 100%, com toggles por unidade para dispensar suportes de exigências desnecessárias. O EHP usa `HP × (1140 + 3,5 × DEF efetiva) / 1000`, incluindo reduções elementais/críticas de artefatos suportadas; DEF break usa 30% da DEF, e ignorar DEF usa zero. Dano bruto informado já deve somar golpes, multiplicadores e crítico; dano final é arredondado para baixo e sobreviver exige HP estritamente maior que o dano. SPD/dano não informados ficam pendentes. Não resolve mecânicas especiais, IA, probabilidades, recargas ou uma luta completa.

Os perfis B12 têm checklist próprio e **não reutilizam os dados de waves Abissais**. O snapshot de waves 1/3 existente continua disponível somente em GBAH/DBAH/NBAH/SF10/PC10. Não foram inventados valores de chefe para B12.

Supabase continua opcional em desenvolvimento, com autenticação, `profiles`, RBAC e RLS existentes. Sem as variáveis/projeto configurados, inventário, planos e diagnósticos permanecem locais; nenhuma sincronização real foi validada.
