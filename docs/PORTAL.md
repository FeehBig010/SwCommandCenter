# Portal de recepção

`EntryPortal` mantém os callbacks da calculadora, login inline, seletor/drop de
SWEX e continuação da conta. O relógio e a hidratação da importação continuam no
App: a animação dura 20 segundos, de 0 a 100%, sem alterar a autorização do backup privado.

A Home usa cards independentes em uma página com rolagem normal, dentro do shell
compartilhado com a navegação. O resumo mostra o ID, a guilda, as contagens do
inventário e a data real de importação do snapshot carregado; datas ausentes não
são estimadas. Dados demonstrativos recebem identificação explícita. O snapshot
não representa alterações em tempo real no jogo.

Os cinco atalhos principais abrem Início, Siege Center, Rune Optimizer, Rune
Intelligence e Calculadora de Velocidade. A continuidade usa `lastWorkspace`
quando o App fornece um módulo realmente visitado; sem esse registro, a conta
carregada mantém a ação de continuação para o Dashboard. A Calculadora Livre
continua disponível sem conta ou login.

Ciri acompanha o card de importação SWEX, com seleção e drop de arquivo e login
inline preservados. Os cupons mantêm seu componente, atualização e ações de
cópia e resgate. Em telas pequenas os cards se empilham, sem listas presas à
altura da janela. Superfícies em grafite/petróleo, bordas sutis e detalhes em ouro
seguem os tokens compartilhados; cenário, partículas, névoa e tilt foram retirados.

`public/art/portal-ciri.png` é uma ilustração gerada da Ciri, com canal alpha real
e sem texto/fundo, e não uma arte oficial da Com2uS. A interface conserva a arte
local e o fallback para o brasão. A validação específica está em
`tests/browser/premium-home.mjs`, com fixtures fictícias e endpoints isolados.

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
