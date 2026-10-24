# Otimização por clonagem de Siege

`copySiegeToPersonal` mantém uma cópia independente do modelo portátil em
`team.target_goals` quando a composição copiada é um ataque. Cada entrada
contém o `key` do slot clonado, `masterId`, metas de ficha/bonus, conjuntos,
SPD de combate, ticks e contexto de combate. A ordem do array é a ordem
obrigatória de ação. Líder, cenário e ativação dos puxadores também são
preservados. Nenhum ID de cópia ou runa estrangeira é incluído nas metas.

A comparação usa as runas realmente equipadas no SWEX. Sugestões aparecem
em uma coluna separada. O time, o snapshot e o inventário não são modificados
pela busca. Os snapshots sobrevivem ao armazenamento local e às builds
salvas. A importação de um plano remapeia as metas aos novos slots; uma reimportação da mesma conta mantém os clones manuais.

O botão envia `matchTargets: true` ao Worker existente. `optimizeClone` prepara
três slots vinculados às metas originais e chama o mesmo alocador conjunto
do Rune Optimizer. Reservas, travas, inventário filtrado e filtros da busca
continuam válidos; cada runa só pode ser usada uma vez. Não há projeção de
pedras máximas neste modo.

Critérios:

1. Ordem e ticks são eliminatórios. Sem eventos, exige-se diferença mínima
   de 1 SPD real entre os membros na ordem original. Com puxadores/eventos,
   a rotação é validada pelo simulador de ticks. Inimigos informados precisam
   agir depois da equipe. Sem cenário inimigo, isso não valida vitória/corte
   contra qualquer defesa.
2. Entre as distribuições válidas, minimiza-se a soma das diferenças absolutas
   normalizadas por meta, acrescida do déficit de peças dos conjuntos. HP não
   domina SPD/ACC só por sua escala. Conjuntos e atributos inalcançáveis são
   exibidos como pendências; nunca se relaxa a ordem para obter aproximação.
3. A busca preserva candidatos com diferentes velocidades para que o limite
   do beam conjunto não retenha apenas runas semelhantes e rápidas demais.

A busca continua heurística e limitada pela profundidade escolhida. O resultado
é a melhor aproximação encontrada, sem comprovação de ótimo global. Quando
nenhuma distribuição preserva os vínculos, não retorna builds fora da ordem.

Verificação principal: `node --test tests/clone-optimization.test.mjs`.
