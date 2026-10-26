# Portal de recepção

`EntryPortal` mantém os callbacks da calculadora, login inline, seletor/drop de
SWEX e continuação da conta. O relógio e a hidratação da importação continuam no
App: esta mudança não altera os 15 segundos nem a autorização do backup privado.

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

O componente `CouponModule` consulta o JSON público de histórico mantido pela
comunidade YunaMyst:
https://github.com/yunamystcodes/yunamystcodes/blob/main/data/code_history.json

A consulta não envia inventário, sessão ou credenciais. Somente registros ativos,
observados nas últimas 72 horas e referenciados por SWGT/SWQuery são exibidos.
Validade explícita, códigos mensais de outro mês, desaparecimentos e estados
expirados excluem o cupom. O calendário exibido usa America/Sao_Paulo. A lista é
atualizada ao abrir o portal, a cada 15 minutos e pelo botão de atualização.
Uma checagem local por minuto também remove cupons que envelhecerem na tela.

O snapshot local contém apenas os cupons verificados durante o desenvolvimento;
ele obedece às mesmas regras de validade, inclusive quando a rede falha. Sem
confirmação recente, o módulo mostra um estado vazio e mantém o acesso aos eventos
oficiais. Não transforma ausência de conexão em confirmação de validade.

Recompensas vêm da descrição da fonte; tipos ou quantidades desconhecidos não são
inventados. O ícone do Pergaminho de Vento é o asset público de jogo distribuído em
`yunamystcodes/yunamystcodes/assets/rewards/wind.png`, consultado em 26/10/2026.
Outros tipos conhecidos usam ícones vetoriais. As artes de Summoners War pertencem
aos seus respectivos titulares.

“Copiar Código” aguarda `navigator.clipboard.writeText` antes de informar sucesso.
Se a permissão falhar, seleciona o campo para cópia manual. “Resgatar no Jogo”
abre https://withhive.com/ em nova aba; nenhuma tentativa de resgate é feita pelo
site. O rodapé também leva aos eventos oficiais da Com2uS.
