# Dano Real estimado: contrato do modelo

A expressão “Dano Real” identifica uma **estimativa configurável**, não a reprodução completa do combate do jogo. Ative o cenário no card e informe os multiplicadores reais, número de golpes, S1/S2/S3/S4, DEF/elemento/HP do inimigo, HP próprio, buffs, torre e líder. O app não deduz uma habilidade arbitrária pelo nome do monstro. Sem cenário ativo, a otimização conserva o objetivo legado de dano médio por ATK.

O cálculo usa uma build otimizada vigente ou seis runas equipadas e os artefatos equipados considerados pelos toggles global/individual. Não busca novas combinações de artefatos. Os valores da ficha permanecem separados dos efeitos condicionais de combate.

## Parser

IDs/percentuais vêm do [mapeamento público SWEX](https://github.com/Xzandro/sw-exporter/blob/master/app/mapping.js), consultado em 2026-10-22. `sec_eff` tem precedência quando preenchido; o formato alternativo `artifact_substats` aceita pares numéricos, objetos `{id/type/effect_id, value}` ou um mapa numérico/nomeado. O valor percentual é o valor exportado; índices de roll/conversão não são somados novamente. Artefatos embutidos no monstro prevalecem sobre duplicatas da lista global. IDs desconhecidos válidos são preservados e identificados como não modelados.

| Efeitos | Tratamento |
| --- | --- |
| 218–221 | Dano adicional por HP, ATK, DEF, SPD; soma por golpe |
| 222/223 | DC com HP inimigo alto/baixo; interpolação linear do HP inicial informado |
| 400–403, 410, 411 | DC por habilidade, S3/S4 e primeiro ataque |
| 224 | DC de alvo único, somente no próprio turno configurado |
| 200–202 | ATK/DEF/SPD proporcional ao HP próprio perdido, sem alterar a ficha |
| 204–207, 226 | Efeito dos buffs ATK/DEF/SPD/TC selecionados |
| 300–309 | Dano em elemento e redução do dano configurado recebido desse elemento |
| 404–409 | Cura e ACC da habilidade selecionada; ACC não é somada à ficha |
| 208/209/225 | Bônus quando o cenário é contra-ataque/ataque conjunto |
| 213/214 | Reduções condicionais do dano de entrada informado |
| Outros conhecidos | Preservados e mostrados; bombas, reflexão, revive, roubo de vida etc. não são simulados |

**HP perdido:** os códigos nativos 200/201/202 não são DC; são modificadores de ATK/DEF/SPD. Um campo alternativo explicitamente nomeado `critLostHp` é aceito, sem atribuir um ID nativo fictício a ele. Valores antigos do navegador sem secundários não podem ser reconstruídos: reimporte o SWEX.

## Aritmética

1. ATK de combate parte de ATK da ficha mais ATK base × (torre + líder)%. Depois aplica o modificador por HP perdido e o buff selecionado. Buff ATK tem base 50%, DEF 70%, SPD 30%, TC 30%, ajustados pelos respectivos bônus de efeito dos artefatos.
2. A habilidade usa `ATK × mult_ATK + HP × mult_HP + DEF × mult_DEF + SPD × mult_SPD`. `1` significa 100% daquele atributo. Aplica skill-ups, o fator crítico configurado, `1000 / (1140 + 3,5 × DEF inimiga)`, variação conservadora de 90% e os bônus condicionais suportados. Ignorar DEF usa DEF efetiva zero.
3. DC de habilidade/HP/alvo é condicionado ao cenário, não um bônus permanente de ficha. O modo médio pondera pela TC efetiva; os modos sem crítico/assumir crítico são explícitos. Desvantagem elemental usa o cenário conservador de glancing 0,7 e sem crítico.
4. Adicional por golpe: `floor(HP × adicionalHP% + ATK × adicionalATK% + DEF × adicionalDEF% + SPD × adicionalSPD%)`. Essa parcela não recebe crítico, multiplicador/skill-ups de habilidade nem mitigação por DEF. As parcelas são somadas após seus arredondamentos, depois multiplicadas pelo número de golpes.
5. Cura de entrada recebe o bônus da habilidade configurada. O dano recebido informado é uma base antes das reduções de artefatos; reduções elementais, críticas e por incapacidade são aplicadas multiplicativamente e limitadas a 100%. Isso é um cenário separado, não a DEF de outro jogador inferida do JSON.

HP condicional é avaliado no início da habilidade e não recalculado após cada golpe. O modelo linear de HP, as reduções e o tratamento da parcela adicional são aproximações explícitas; não foram calibrados contra logs de combate independentes. Não inclui passivas, IA, procs, escudos, imunidades, debuffs não selecionados ou garantia de vitória. Resultados de dano e metas atendidas não provam que uma ofensa vence uma defesa.

No Cairos, Lushen/Julie mantêm os coeficientes conhecidos e a verificação conservadora de crítico. O cálculo considera os artefatos presentes no resultado e mostra a parcela adicional por inimigo. A habilidade precisa ser marcada como disponível nas duas waves; dano suficiente sozinho não comprova a rotação/clear.
