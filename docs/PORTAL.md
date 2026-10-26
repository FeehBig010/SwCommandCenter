# Portal de recepção

`EntryPortal` mantém os callbacks da calculadora, login inline, seletor/drop de
SWEX e continuação da conta. O relógio e a hidratação da importação continuam no
App: a animação dura 20 segundos, de 0 a 100%, sem alterar a autorização do backup privado.

A composição usa uma grade com colunas externas iguais e centro mais largo.
Desktop e tablets a partir de 768 px mantêm as três colunas. Em celulares, a guia,
os comandos e os cupons ficam empilhados em uma região rolável dentro dos 100dvh.
Formulários e listas longas continuam alcançáveis em telas baixas. O login não
abre outra página. Fundo do castelo, overlay, partículas e movimento reduzido
seguem a identidade existente.

O conceito visual foi gerado nesta tarefa; a interface mantém o brasão e o cenário
locais. `public/art/portal-ciri.png` é uma ilustração gerada da Ciri, com canal alpha
real e sem texto/fundo, e não uma arte oficial da Com2uS. A origem gerada evita a
antiga miniatura remota retangular, que estava inacessível.

## Cupons

O serviço `fetchActiveCoupons` consulta primeiro `public.coupons` no Supabase.
Sem dados recentes ou com a tabela indisponível, consulta o JSON público da
comunidade YunaMyst:
https://github.com/yunamystcodes/yunamystcodes/blob/main/data/code_history.json

A API comunitária não recebe inventário, sessão ou credenciais. Somente registros ativos,
observados nas últimas 72 horas e referenciados por SWGT/SWQuery são exibidos.
Validade explícita, códigos mensais de outro mês, desaparecimentos e estados
expirados excluem o cupom. O calendário exibido usa America/Sao_Paulo. A lista é
atualizada ao abrir o portal, a cada 15 minutos e pelo botão de atualização.
Uma checagem local por minuto também remove cupons que envelhecerem na tela.

O snapshot local contém apenas os cupons verificados durante o desenvolvimento;
ele obedece às mesmas regras de validade, inclusive quando a rede falha. Sem
confirmação recente, o módulo mostra um estado vazio e mantém o acesso aos eventos
oficiais. Não transforma ausência de conexão em confirmação de validade.

Recompensas vêm dos dados da nuvem ou da descrição da fonte; tipos ou quantidades
desconhecidos não são inventados. Mana, Energia, Cristais e Pergaminhos usam os
PNGs oficiais do jogo distribuídos pela SWARFARM em `herders/images/items`,
copiados para assets locais. As artes pertencem aos seus respectivos titulares.

“Copiar Código” aguarda `navigator.clipboard.writeText` antes de informar sucesso.
Se a permissão falhar, seleciona o campo para cópia manual. “Resgatar no Jogo”
abre `https://event.withhive.com/ci/smon/evt_coupon` em nova aba, o formulário
oficial indicado pelo usuário; nenhuma tentativa de resgate é feita pelo
site. O rodapé também leva aos eventos oficiais da Com2uS.

Supabase, validade, deploy e formato dos registros: [COUPONS.md](COUPONS.md).
