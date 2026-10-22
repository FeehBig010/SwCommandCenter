# SPD de combate e cenários anti-corte

O otimizador, a prévia equipada/otimizada e a checagem de favoritos usam `src/core/speedTuner.js`. É um modelo explícito de SPD/barra e primeira rotação, com eventos de luta já resolvidos. Não é uma réplica completa do servidor de combate: não escolhe habilidades pela IA, calcula probabilidades de resistência, resolve dano automaticamente ou sorteia Violent/Antares. As hipóteses ficam visíveis no painel e procs/efeitos não cobertos produzem avisos condicionais.

## Uso

- A Sidebar abre por hover/foco e começa com ícones. Em celular, o botão de menu abre a gaveta. Arena usa uma composição de quatro slots, preservando os times Siege em outra seção. Sem conta, importe pelo bloco inicial ou Dados SWEX. Após a importação, a tela principal guarda só o indicador SWEX na Sidebar; reimportação e privacidade ficam em Dados SWEX.
- O nome do time acompanha as unidades e sua ordem até a primeira renomeação manual. Reordenar mantém a identidade do líder e remapeia as referências dos eventos.
- Marque **👑 Líder** no card para consultar o catálogo. O bônus é aplicado somente no modo/elemento correto. HP/ATK/DEF usam a base; CR/RES/ACC somam pontos percentuais (teto 100). A ficha permanece separada dos atributos de combate, exibidos no painel de ordem. O campo manual de líder SPD desmarca a habilidade inferida ao sobrescrevê-la.
- As oito metas de ficha têm campo numérico e barra sempre visíveis, sincronizados no mesmo estado enviado ao otimizador. Os presets gerais foram retirados da interface. Main stats continuam nos slots 2/4/6. As três caixas de sets permitem 4+2 ou três conjuntos de duas peças, incluindo repetições; todas livres removem exigências de sets.
- O Tick Alvo preenche uma exigência de **SPD de combate** separada da meta SPD da ficha. Com barra inicial 0, `SPD mínima = ceil(10000 / (tick × 7))`. O incremento natural de barra é uma constante interna do modelo; não é uma unidade de tempo configurável. Por exemplo, Tick 10 exige 143 SPD; Tick 1 exige 1429, frequentemente inviável. É o limiar natural de preenchimento, não uma posição garantida na fila. O objetivo participa da seleção de runas, Strict Mode e relatório de déficits. O campo “agir até Tick” dos counters é um prazo real de ação verificado na rotação.

Planos salvos com `speedTick` e o campo SQL legado `default_speed_tick` continuam legíveis, mas não alteram a duração do tick. Counters importados normalizam esse valor legado; o motor usa sempre o incremento fixo. As explicações do painel Speed Tune ficam no ícone informativo (hover, foco ou toque); alertas concretos de corte permanecem visíveis.

## Fórmula versionada do modelo

A base estática recompõe a fração de Swift antes do arredondamento:

```
S = SPD_ficha - ceil(SPD_base × Swift/100)
    + SPD_base × (Swift + Glória + Guilda_aplicável + Líder_aplicável)/100
D = 1 + BuffSPD × 0,30 × (1 + ArtefatoBuffSPD/100)
      - Slow × 0,30 + PassivaSPD
A = 1 + ArtefatoSPDporHPperdido × fração_HP_perdido/100
      + Incapacitado × ArtefatoSPDincapacitado/100
SPD_combate = max(1, ceil(S × D × A))
```

Swift é 25% por conjunto completo. O totem de guilda só entra em Siege/WGB; o totem de Glória e o líder são informados separadamente. A convenção desta versão soma buff/slow/passiva em `D`, separando o fator de artefatos `A`. Os coeficientes e as regras de empilhamento são hipóteses explícitas e versionáveis do modelo local, não validação de todas as particularidades/patches do servidor. A simulação de gems/grinds continua opcional, com uma troca por runa, sem alterar o inventário.

Miles recebe 5% por buff global, até 100%; Masha montada recebe 10% por stack, até cinco; desmontada usa −15%. O usuário informa o total global de buffs e o estado inicial de stacks/HP/incapacidade. **Sonia não recebe bônus inventado de SPD**: sua reação de barra depende de glancing resolvido. Oblivion desliga as passivas de unidade; não desliga os sets de runas.

## Eventos e interrupções

Abra **Cenário anti-corte** abaixo dos cards. Informe unidades inimigas e SPD estática de combate (base/runas/totens/líder já considerados, antes dos buffs/passivas dinâmicos). Escolha a origem, o número de seu turno, o efeito e os alvos. Eventos são executados em ordem de cadastro depois da ação indicada. Cada evento de dano é um hit por alvo, expresso em % do HP máximo, já descontado pelas reduções da luta. Crítico e glancing são mutuamente exclusivos. O motor não gera esses resultados sozinho.

| Mecânica | Regra de SPD/barra modelada |
|---|---|
| Nemesis | 4% de barra por cada bloco completo de 7% do HP máximo perdido, por set; retém o restante entre hits. Barra de runa/natural não é reduzida por Tian Lang nesta versão. |
| Tian Lang | Reduz ganhos de barra de habilidades em 50%, com exceção de portadores da mesma passiva e bosses. Ganha 15% ao uso de um boost de habilidade inimigo, uma vez por ativação (inclusive de passivas de barra), não por destinatário do boost. |
| Ragdoll | Um hit crítico resolvido contra um aliado aumenta em 10% a barra dos aliados sobreviventes; os ganhos de habilidade respeitam Tian Lang. Reflexão de dano precisa ser descrita como dano resolvido adicional, não é calculada automaticamente. |
| Abellio | Forma druida ganha 100% de barra e remove incapacidade/slow quando um aliado chega a 40% HP ou menos por dano inimigo. Forma fera ganha 15% quando atacada. Cura, transformação e recargas da habilidade precisam de condições/eventos externos; não são inferidas. |
| Sonia | Ganha 50% de barra ao receber um hit glancing informado. Chance de glancing e bônus de dano não são sorteados/calculados pela simulação de barra. |
| Masha | Reduz em 50% a perda de barra por inimigo e ganha stacks quando barra aliada realmente diminui por habilidade inimiga. Aplicações/remoções de buffs (incluindo imunidade) devem atualizar o total de buffs explicitamente. |
| Miles | Recalcula a SPD quando um evento muda a quantidade global de buffs. Seu dano adicional é outro cálculo, fora deste simulador de barra. |
| Leo | Abre a rotação e limita o ganho natural de barra das outras unidades à sua SPD; outros Leos e bosses são exceções. O evento de ataque Leo aplica redução de 15% como resultado já resolvido. |
| Tablo | O evento S3 zera as barras, concede buff SPD aos outros aliados e faz Tablo perder seu próximo turno por stun. |
| Antares | Sempre exibe risco de RNG. O evento de proc força o ramo de turno extra após um inimigo; nunca transforma uma chance em garantia. |

Também existem eventos genéricos de boost, redução de barra, dano, cura resolvida (% HP máximo), buff SPD, slow, remoção de incapacidade/slow e nova contagem global de buffs. Condições sem duração explícita permanecem durante o cenário; o stun criado por Tablo consome um turno. Turnos incapacitados ficam marcados como sem ação e não satisfazem vínculos/prazos de ataque. Calcular a quantidade de cura/reviver, controlar resfriamentos, aplicar/refletir dano, determinar glancing/resistência, imunidades e todas as demais regras de uma luta real não são automatizados por este motor de primeira rotação.

A ordem usa ticks globais inteiros, **uma ação por tick**, como o contrato anterior do projeto. Empates são conservadores para o inimigo e depois usam a ordem dos cards. Ganhos de barra não são limitados em 100%: o overflow determina prioridade. Leo e o ramo forçado de Antares têm prioridade própria. “Sem corte neste cenário” considera as condições cadastradas; não é previsão de vitória.

Há um snapshot de 259 entradas públicas de passivas que mencionam SPD/barra em `passive-notices.json`. Unidades com essas mecânicas ainda não implementadas geram aviso, em vez de um resultado incondicional. Defesas conhecidas copiadas dos counters também pedem o contexto inimigo quando faltam SPD/eventos. A prontidão de equipamento do favorito é separada desse aviso de defesa incompleta. As reações da guilda e a taxa de vitória continuam relatos humanos independentes do simulador.

## Persistência, dados e permissões

Condições, líder, requisitos de SPD e eventos são preservados nos planos, templates e cópias para a conta. Eventos referenciam posições `ally:0`/`enemy:0`, não IDs privados do SWEX. O nome manual não é sobrescrito por presets. Favoritos usam os próprios totens de Glória/Guilda do usuário. A interface de counters mantém confronto 3v3, badges de sets, líderes de qualquer atributo e feedback; no desktop, os lados permanecem paralelos.

O catálogo de líderes e as descrições usadas para validar as regras/avisos vêm de `https://raw.githubusercontent.com/swarfarm/swarfarm/master/bestiary/fixtures/bestiary_data.json`, snapshot consultado em 2026-10-22, SHA-256 `70dac6866b23c45bd9bf431918d599e6d5ad29c4ef72a0f6a80ef38e271a7438`. Mudanças de balanceamento exigem revisão das regras e dos testes; texto de habilidade não prova todos os detalhes de empilhamento.

A identidade visual e o RBAC existentes permanecem fixos. As três migrations e o bootstrap administrativo documentados em `SUPABASE.md` continuam sendo o caminho de ativação futura; o proprietário ainda não criou o projeto Supabase. O modo local funciona sem variáveis de nuvem e nunca concede administração por fallback.
