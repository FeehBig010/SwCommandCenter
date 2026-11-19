# Calculadora: clareza, dois times e fluxo do Optimizer

## Entrega

- Cabeçalho compacto nas duas versões, sem sobrepor abas; início dos cards antes de600px no desktop.
- Líder com nome, efeito, escopo, aplicação parcial/inativa e ação textual por card. Abridor e ordem distintos da liderança. Mantida escolha de líderes não-SPD.
- SPD combate destacada; base/ficha/Swift legíveis; entradas SPD de runas e Pronto por tick diretas. Artefatos e formação expansíveis.
- Time inimigo na tela principal V2. SPD de combate informada pelo jogador, sem Swift/Will presumidos. SPD zero não participa da simulação. Cenários com até5 adversários continuam preservados, incluindo índices dos eventos.
- Caminho direto para preparar equipamento no Rune Optimizer. Verificar Sincronia utiliza o handoff existente; cancelar não aplica, retornar envia metas explicitamente, sem equipar runas.
- Busca antiga de inventário secundária, clássico preservado, presets SWEX com carregamento explícito e separação de dados inalterados.
- Compartilhamento admite slots inimigos incompletos e mantém validação e saneamento dos demais campos.

## Evidências e revisão

TDD: helper de liderança e referência, presença do time inimigo e compartilhamento de SPD zero tiveram falhas registradas antes da implementação. Regressão de cabeçalho clássico detectada pelo teste existente quick-tick-targets e corrigida no layout, sem remover verificações. Revisão independente apontou Will presumido, truncamento de adversários extras e prioridade de referência ambígua; corrigidos.

Capturas Playwright com dados fictícios e retratos reais em1440/1920/390/320px e tema Office. Artefatos locais: `/workspace/artifacts/calculator-clarity-20261118`.

## Limites

Referência pública SWCalc consultada como estrutura de fluxo; não foi possível realizar auditoria gráfica interativa do domínio externo neste ambiente. Não afirmar equivalência com algoritmos privados do SWCalc. Matemática existente preservada; RTA continua experimental. Adversários usam SPD de combate informada, sem novo cálculo automático de equipamento, liderança ou habilidades inimigas. Eventos/passivas explicitamente configurados seguem no editor avançado. Equipamento no Optimizer disponível para Siege/Arena. Eventos apontando para ator sem SPD podem exigir revisão antes de uma simulação completa; índices não são apagados silenciosamente.

Build mantém o aviso existente de chunks grandes do Vite. Nenhuma dependência adicionada, migração ou alteração de JSON SWEX/históricos realizada.

## Capturas versionadas

- [Desktop1440](calculator-clarity/desktop-1440.png)
- [Mobile390](calculator-clarity/mobile-390.png)

As composições das capturas são fixtures de QA; o estado de corte/ordem inválida é intencional e não é ocultado para produzir uma imagem favorável.

## Validação local

- Suíte completa:650 testes,650 passados, zero falhas/cancelamentos/skips.
- Build de produção: passou; aviso de chunks grandes documentado acima.
- Playwright: calculator-clarity (incluindo5 adversários, eventos e share parcial), calculator-v2 (handoff/cancelar/retornar), speed-tuning-2, quick-auto-sync, quick-presets, quick-density e quick-tick-targets passaram. A suíte browser inteira do repositório não foi repetida nesta rodada.
- git diff --check sem erros. Revisão independente sem bloqueios remanescentes nos cenários revisados.

- Playwright team-balance também passou: prioridades, sets obrigatórios/opcionais, pin de runa, alternativas/aplicação/cancelamento, diagnóstico, exportação, teclado e1440/1280/1024/390/320px, SWEX intacto. Benchmark sintético:1578 runas,61 combinações avaliadas,694ms no worker; não representa benchmark de contas reais.
