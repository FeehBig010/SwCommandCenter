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

## Calculadora reativa, Will e Amduat

O Modo Livre aplica Glória SPD 15% e Guilda SPD 0%. AUTO SELECT preenche apenas slots vazios com uma composição de exemplo e SPD 300 no abridor; não representa equipamento existente. A ordem padrão é travada da esquerda para a direita: slot 1 abridor, slot 2 no menor valor que sustenta a fila completa, slots seguintes com exatamente −1 SPD de combate inicial por posição. A primeira rotação precisa ocupar ticks consecutivos antes do inimigo. A seleção explícita “Avançado / Desordenado” libera os campos de SPD; mudar o abridor nesse modo preserva os valores manuais dos seguidores. Planos antigos sem `orderMode` migram para a trava, mesmo com `perfectTune:false` ou AUTO desativado. Não é uma prova global para ramos condicionais/procs.

Amduat ganha 25% de ATB ao final dos turnos oponentes; Tian Lang reduz esse ganho e reage conforme as regras existentes. O ataque resolvido de Leo reduz 15% de ATB, com piso zero, mas Will protege até o início do primeiro turno do portador. O scanner insere um primeiro ataque de Leo tendo o primeiro aliado como alvo previsto. Resistência, escolha real de alvo e strip não são sorteados. Lucifer continua exigindo ganhos resolvidos de ATB, pois dano/boosts completos não foram modelados. Ragdoll/Abellio também exigem eventos de dano e críticos do ramo analisado.

A SPD inimiga automática é um **preset de planejamento**, calculado com base máxima do catálogo, Swift, +150 SPD de runas e torres no teto. Não é a velocidade real nem o máximo possível de um oponente desconhecido. Avisos de passivas/ordem e linha âmbar mantêm resultados condicionais. Verde significa sincronia no cenário, nunca imunidade universal.

## Verified Tiana opener and strict leader catalog

`monsterDatabase.js` centralizes leader/opener lookup. The manual calculator recognizes Tiana's first-slot S3, adds one first-turn modeled cleanse/strip plus 30% allied ATB action and respects an explicitly configured first-turn boost override. The proportional follower floor is `ceil(raw opener combat SPD × 0.70 − follower base bonuses)`; no premature rounding of raw opener speed. The manual sheet already includes Swift. The equipped-account engine retains its earlier Swift rounding rules. Guild SPD still applies only to Guild/Siege context, not Arena. Adriana / Water Pure Vanilla are explicitly Arena ATK 44%, SPD 0%.

The proportion badge is named `100% Sincronizado · regra 70%` and deliberately scoped to that formula. Integer ticks remain the separate anti-cut check; a proportional pass can coexist with a red cut from a faster defense. Sorting/reordering preserves leader and event identities. Read docs/PVE-UX.md for the numerical and browser-validation scope.

## Calculadora Livre — piso de boost e slider mestre

O piso antigo de 70% foi removido. Para os abridores catalogados Tiana e Kabilla,
`boostedFollowerMinimum` usa o piso conservador solicitado
`ceil(CombatSPD * 8475 / 10000)`: 400 resulta exatamente em 339.
Esse coeficiente é uma política solicitada, não uma implementação comprovada de
um algoritmo SWOP universal: o mínimo exato depende do tick de abertura,
overflow, inimigos e eventos. A simulação discreta existente continua validando
ordem/prazos e pode exigir velocidade maior ou retornar mínimo impossível.
O badge indica somente cumprimento do piso; não garante imunidade a cortes.

A conversão para ficha inverte a mesma fórmula de combate, com torre/líder, buffs, passivas, artefatos e arredondamento inteiro. A ficha já contém base e runas. No modo livre, Guilda SPD é sempre zero. Alterar o slot 1, artefatos ou cenário recalcula a escada completa. A enumeração crescente do slot 2 testa apenas escadas inteiras representáveis (ficha até 1000), mantém o abridor mais rápido e valida a ordem real por ticks; cascatas também exigem barra completa dos DPS após o último puxador. Falhas preservam as fichas anteriores e limpam todas as metas/validações. O algoritmo flexível anterior permanece para planos explicitamente avançados com AUTO; o seletor da UI entra no avançado com todos os seguidores manuais.

Validação: 199 testes; build Vite; Playwright (Browser plugin indisponível),
input numérico e evento de teclado no range mestre atualizando os três pares
input/range, 1440 e 390 px sem overflow ou erros de execução.


## Fórmula automática da Calculadora Livre (atualização)

O modo livre assume **sempre SPD de ficha** (base + runas, incluindo Swift).
`combatSpeedFromSheet` calcula `ficha + base * (torreArena + líderAplicável)/100`;
`runtimeSpeed` aplica buffs/passivas e arredonda a velocidade efetiva para cima.
Não há seletor de tipo de velocidade, nem entrada manual de Combat SPD nessa tela.
Bônus de Guilda persistido de versões antigas é ignorado no modo livre. O motor
normal de equipamento Siege conserva seu bônus de Guilda e arredondamento Swift.
O tick alvo continua sendo uma meta calculada, sem substituir a origem da ficha.

Exemplo de UI: base 100, ficha 320, torre 15%, líder geral 19% → Combat SPD354;
slider para 321 → 355. Líder fora do escopo ou de ATK não acrescenta SPD.
Não somamos Swift novamente quando a entrada já é ficha. O piso do boost e sua
conversão de volta para ficha usam os mesmos bônus, sem desconto duplo.

## Raid R5: três equipes e líderes cruzados

A área R5 mantém três times de seis slots, com configs/IDs independentes e
alocação conjunta pelo worker do otimizador. As três habilidades de líder ativas
são passadas como `raidLeaders` a cada equipe. Líderes gerais aplicam em todos;
elementares só nos elementos correspondentes. Para o mesmo atributo vale o maior
valor, sem somar duplicatas; líderes de Guilda/Arena/Masmorra não se aplicam ao Raid.
Um slot desativado não fornece a habilidade de líder. Esses efeitos não vazam
para Cairos, Arena ou outras áreas Rift.

SPD é aplicada sobre a base antes de runtimeSpeed. HP/ATK/DEF usam percentuais
da base; RES/ACC/CR usam pontos percentuais e os tetos existentes. `leaderImpact`
remove todas as habilidades cruzadas ao comparar com/sem líder, evitando bônus
visuais zerados. Metas do Raid usam combate (ou adicionais sobre a base quando
essa opção é escolhida), incluindo os três líderes. Nenhuma runa/unidade física
pode ser reutilizada entre os 18 slots na otimização conjunta.

Validação: 217 testes, incluindo rodada conjunta de 18 unidades com 108 runas
únicas e metas com líderes; UI Playwright com HTTP simulado confirmou 18 cards,
144 ranges, SPD compartilhada161 nos 18 slots e 18 interações de sliders em cerca
de 1,8 s (inclui automação/foco/rolagem; não é benchmark de hardware universal).
A simulação continua condicionada aos eventos informados; isso não implementa
IA, fases, dano e sobrevivência completos do chefe Raid.


## Cascading ATB e Perfect Tune

As ações automáticas da primeira rotação incluem Bernard (30 ATB e buff SPD),
Megan (20 ATB), Kabilla (30 ATB) e Tiana (30 ATB e remoção de efeitos). Os valores
30/20 são os valores-base declarados; use eventos explícitos para variantes ou
melhorias de habilidade diferentes. Uma ação explícita boost/tiana substitui a
ação automática daquele monstro; não somamos duas vezes. Boosts genéricos agora
têm alvos aliados reais, incluindo o lançador, sem afetar inimigos.

Cascatas deixam de impor o piso proporcional do abridor a todos os DPS. O solver
procura velocidades inteiras no intervalo de ficha base–1000, registra a barra
imediatamente após o último puxador e exige >=100 ATB em todos os DPS, além da
ordem completa sem turno intermediário do inimigo, repetição ou tick vazio.
Buff SPD entra no ganho de barra dos ticks seguintes; boosts somam à barra atual,
sem apagar overflow. Usamos a simulação e os eventos reais (incluindo supressão
por Tian Lang), não apenas uma soma nominal de percentuais.

A busca valida o prefixo dos puxadores, inicializa os DPS em conjunto e reduz as
coordenadas verificando a fila completa. Não pressupõe monotonicidade global do
predicado quando há mudança de tick/overflow. Um resultado inválido não substitui
os inputs por valores de probes falhos. Para cenários exóticos, a ausência de meta
significa ausência de solução na busca/modelo calculados, não prova universal de
impossibilidade de toda estratégia do jogo. Checkpoints são opcionais e não vão
para o armazenamento; atributos inalterados são reutilizados na busca local.

Exemplo determinístico: base100, torre15, sem líder, Bernard com ficha285 (combate300)
e inimigo299. Megan: ficha202 (combate217; 283 após buff). DPS: ficha174 cada
(combate189; 246 após buff). Na primeira rotação:

| Ação | Tick | ATB antes da ação |
| --- | --- | --- |
| Bernard | 5 | 105 |
| Megan | 6 | 125,76 |
| DPS 1 | 7 | 150,59 |
| DPS 2 | 8 | 167,81 |
| Inimigo | 9 | 188,37 |

Após Megan, os dois DPS já têm 133,37 ATB. No Tick8, o inimigo tem 167,44 contra
167,81 do último DPS. Reduzir cada meta em1 falha por corte ou ordem. Com o segundo
boost reduzido a10, a meta de ficha dos DPS sobe para190; sem ele, para240 no modelo
conservador de puxador único. A capacidade de causar procs por dano não é inferida.

Perfect Tune trava os Combat SPD iniciais dos seguidores em S, S-1, S-2. O motor
converte cada alvo para ficha, considerando base, torre e líder de cada monstro,
e exige igualdade inteira exata. Buffs durante ações continuam na timeline.
O piso de S2 é elevado apenas se necessário para sustentar a escada toda; no
exemplo acima, a escada é217→216→215. Um caso Tiana400 versus inimigo399 precisa
340→339→338 para a fila completa; 339→338→337 permite corte. Se um alvo não puder
ser representado por uma ficha inteira ou não houver fila segura, mostramos
aviso em vez de arredondar uma escada falsa. Sliders/inputs de seguidores ficam
bloqueados por padrão e acompanham o abridor em um estado único. A única saída da trava é selecionar “Avançado / Desordenado”; não há switches AUTO por monstro.

Sem inimigo configurado, cascata e Perfect Tune usam um inimigo de referência com
SPD do abridor menos1; a interface informa essa suposição. Isso não garante
segurança contra inimigos mais rápidos, passivas, dano ou procs não modelados.
A garantia é sempre relativa ao cenário resolvido e às regras discretas existentes.


## Ordem travada e artefatos — validação de 2026-10-23

O campo fixo “Artefatos · +SPD” fica diretamente no card. Os bônus condicionais permanecem recolhidos. O valor é aplicado uma vez no motor de ticks e descontado na conversão Runagem. Com Tiana 400 e inimigo 399, a fila Arena é 400 → 340 → 339 → 338; +20 SPD de artefato no terceiro slot reduz a exigência de runas em 20 sem alterar a meta de combate. Cairos estende a mesma regra ao quinto slot. Falta de solução produz “Ordem travada inviável”, com a explicação no tooltip, e nunca o selo de fila validada. A indicação de segurança continua relativa ao cenário informado.

Regressões cobrem migração de planos antigos, tamanhos 3/4/5, mínimo do slot 2, identidade dos slots, trava contra edição de seguidores, troca explícita para avançado, artefatos sem dupla contagem, inimigo rápido, abridor incapacitado, ausência de boost e escadas não representáveis com multiplicadores/arredondamentos. Os testes anteriores de mínimos flexíveis usam explicitamente o modo avançado.
