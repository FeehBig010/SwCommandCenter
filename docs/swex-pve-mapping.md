# Classificação dos presets PvE do SWEX

A navegação é definida em `pve-stages.js`; o parser usa `pve-lookup.js`.
IDs e tipos estruturais têm prioridade sobre nomes editáveis dos decks.
`sourceMeta` guarda somente os códigos numéricos necessários para futuras
migrações, sem reter o JSON bruto ou dados sociais.

| Origem | Tipo / identificador | Destino |
| --- | --- | --- |
| `deck_list` | 24, centena de `deck_seq` 1–5 | Gigante, Dragão, Necro Abissal, Fortaleza, Cripta |
| `deck_list` | 25, centena 1–5 | Bestas de Gelo, Fogo, Vento, Luz, Trevas |
| `deck_list` | 26, centena 1–6 | Runas de Karzhan, Ellunia, Lumel, Khalderun, Sacréon, Inferath |
| `deck_list` | 3 | Raid R5 |
| `deck_list` | 6 | ToA; sem dificuldade codificada, fica em “ToA · Times salvos” |
| `deck_list` | 27 | ToA Hell |
| `deck_recent_list` | 3, subtipos 8 / 9 / 6 | Gigante / Dragão / Necro B10 |
| `deck_recent_list` | 3, subtipos 1901–2302 conhecidos | Abissais, Fortaleza e Cripta |
| `deck_recent_list` | 4 / 5 / 20 | ToA Normal / Hard / Hell |
| `deck_recent_list` | 8, subtipo 1001–5001 | Cinco Bestas da Fenda |
| `deck_recent_list` | 9 | Raid R5 |
| `deck_recent_list` | 16 | ID dimensional completo |

IDs dimensionais: milhar 1 = Ellunia, 2 = Karzhan, 3 = Lumel,
4 = Khalderun, 5 = Sacréon, 6 = Inferath; centena 1 = Runas,
2 = Despertar Secundário, 3 = Predador. Os IDs completos das famílias
2A permanecem em `sourceMeta`; seus presets não são deduplicados.
Runas/2A têm quatro slots; Predador tem cinco. Não há Predador Inferath
na tabela conhecida.

Os IDs 8001 / 9001 / 6001 representam as masmorras regulares e usam
B10; andar 12 explícito e nomes legados GB12/DB12/NB12 migram para
Abissal, sem criar categorias B12 duplicadas. Os IDs 8011 / 9011 /
6011 identificam os Abissais diretamente.

**Não confundir namespaces:** `deck_list` tipo 5 é Labirinto/Resgate,
e `deck_recent_list` tipo 15 é Labirinto. Não são Buraco Dimensional.
Também não se interpreta Hall of Fire 2001 como Besta de Fogo sem
namespace de Fenda. Conteúdo fora do catálogo solicitado (como Reino
Espiritual), códigos desconhecidos e registros sem identificador ficam
preservados no inventário, com diagnóstico e sem uma aba “Outros”.
Nunca se atribui um destino usando os monstros da composição.

Na migração do navegador, times editados B12 e Abissais que colidirem
são mantidos como presets alternativos. Backups antigos sem os códigos
originais não permitem reconstruir destinos que o parser anterior perdeu;
é necessário reimportar o SWEX original nesse caso.

Referências públicas de IDs e namespaces:

- https://github.com/Xzandro/sw-exporter/blob/master/app/mapping.js
- https://github.com/QuatZo/swstats/blob/master/website/models.py (`Deck`, `DimensionHoleRun`)
- https://github.com/B4tiste/bot-swbox/blob/main/src/commands/best_pve_teams/models.rs (`Dungeon::id`)

As sequências modernas de decks salvos foram conferidas com os metadados
do SWEX fornecido na sessão. O arquivo pessoal não integra o repositório
nem as fixtures; os testes usam contas e composições sintéticas.
