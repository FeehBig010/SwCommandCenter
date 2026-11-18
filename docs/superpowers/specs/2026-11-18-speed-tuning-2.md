# SW COMMAND CENTER 2.0
## Implementação — Speed Tuning Calculator
**Referência principal:** https://00peanuts.com.br/apps/sw-speed-tuning-calculator/

**Referência complementar:** https://swcalc.cz/

**Objetivo:** desenvolver uma calculadora de Speed Tuning funcional, matematicamente confiável e integrada ao SW Command Center, utilizando os 17 screenshots enviados como referências de interface e comportamento.

---

## 1. Instruções obrigatórias

Antes de implementar:

1. Inspecione a calculadora atualmente existente no projeto.
2. Identifique os componentes, cálculos e integrações que já funcionam.
3. Consulte `SW_OS_ORCHESTRATOR_MASTER.md`, `SW_RUNES_SYSTEM_REVISADO.md` e `SW_COMMAND_CENTER_2_0_DOCUMENTACAO_CONSOLIDADA.md`.
4. Analise as 17 capturas do 00Peanuts anexadas a esta tarefa.
5. Acesse as calculadoras de referência, quando possível, para validar comportamentos que não estejam claros nas capturas.
6. Reutilize a arquitetura, os serviços e os componentes existentes sempre que forem adequados.

**Não reconstruir o projeto. Não copiar código de terceiros. Não alterar funcionalidades fora do escopo.**

A calculadora deverá funcionar nos dois temas existentes: War Mode e Office Mode.

---

## 2. Modos de jogo

Implementar a seleção:

- Siege / World Guild Battle
- Arena
- RTA

Cada modo deverá utilizar suas regras de combate, velocidade, efeitos e quantidade de unidades.

Nas capturas, Siege utiliza três monstros e RTA apresenta quatro posições. Para Arena e demais particularidades, validar as regras efetivas do jogo.

Permitir configurar os bônus globais aplicáveis:

- SPD Tower.
- Speed Lead.
- Tick / incremento de ATB.
- Efeitos globais pertinentes.

As capturas mostram tick configurado em 7% para Siege/Arena e 1,5% para RTA. Reproduzir esses cenários e validar seus significados e aplicação na versão do jogo suportada.

---

## 3. Seleção de monstros

Permitir selecionar qualquer monstro do catálogo, incluindo unidades não possuídas pelo jogador.

Disponibilizar:

- Busca por nome.
- Retrato.
- Elemento.
- Nome correto.
- SPD base.
- Leader Skill.
- Habilidades ativas.
- Habilidades passivas.

Criar dois modos de seleção:

**Meus monstros**
- Utiliza monstros reais da conta.
- Permite selecionar cópias específicas.
- Carrega as informações disponíveis no snapshot SWEX.
- Carrega runas, velocidade e efeitos de equipamento do contexto selecionado, quando presentes e interpretáveis.

**Todos os monstros**
- Permite testar qualquer unidade.
- Carrega SPD base e habilidades do catálogo.
- Permite editar manualmente os atributos necessários.
- Identifica unidades que o jogador não possui.

Não criar cópias fictícias no inventário.

---

## 4. Montagem da composição

Reproduzir as principais funcionalidades observadas:

- Adicionar e remover monstros.
- Definir o monstro inicial (Starter).
- Definir a ordem desejada de ação.
- Reorganizar unidades.
- Configurar o líder.
- Distinguir posicionamento no jogo de ordem efetiva dos turnos.
- Limpar a calculadora mediante confirmação.
- Compartilhar uma configuração sem expor dados privados da conta.

A seleção e as configurações deverão atualizar os resultados sem exigir recarregar a página.

---

## 5. Configurações por monstro

Cada cartão deverá apresentar:

- Retrato e nome.
- SPD base.
- SPD adicional das runas.
- SPD total exibida.
- Indicador de Swift.
- Bônus de torre/liderança.
- Efeitos de artefatos relevantes.
- Habilidade selecionada para o primeiro turno.
- Skill-ups e modificadores aplicáveis.
- Efeitos ativos.
- Posição na sequência.
- Velocidade mínima exigida pelo tuning.

Diferenciar claramente:

1. Velocidade exibida no jogo.
2. Velocidade efetiva de combate.
3. Modificadores temporários.
4. Bônus e diferenças necessários ao tuning.

Evitar aplicar o mesmo bônus duas vezes.

Usar os exemplos das capturas como casos de referência, incluindo Bernard com SPD base 111 e alterações de velocidade por runas, torre e habilidades.

---

## 6. Habilidades e passivas — requisito obrigatório

Implementar um catálogo de habilidades associado ao motor de simulação.

**Habilidades ativas:**
- Aumento/redução de ATB.
- SPD Buff.
- SPD Debuff.
- Aumento de velocidade condicionado.
- Alterações na ordem de ação.
- Efeitos de primeiro turno.
- Efeitos com duração definida.

**Habilidades passivas:**
- Efeitos aplicados no início da batalha.
- Alterações condicionais de SPD.
- Manipulações automáticas de ATB.
- Efeitos acionados por ações de aliados/inimigos.
- Outras interações relevantes para a ordem de turnos.

Exemplos que devem possuir testes específicos: Leo, Miles, Chilling e unidades com manipulação de ATB.

**Comportamento esperado:**

Ao selecionar um monstro, carregar suas habilidades e aplicar automaticamente os efeitos pertinentes ao cenário configurado, desde que haja dados e implementação validados.

Permitir selecionar a habilidade que será usada e informar condições de ativação quando necessário.

Usar os skill-ups reais do SWEX para unidades possuídas; em simulações manuais, permitir ajustar o nível da habilidade.

Não tratar passivas condicionais como bônus fixos universais.

Se uma mecânica não estiver implementada ou não puder ser verificada, identificar a limitação. Não mostrar a simulação como matematicamente validada.

---

## 7. Motor matemático de Speed Tuning

Criar ou corrigir um motor centralizado, independente da interface.

Ele deverá calcular:

- SPD base e adicional.
- Bônus de Swift.
- Bônus de torre e liderança.
- Efeitos relevantes de artefatos.
- Velocidade efetiva de combate.
- Acúmulo de ATB por tick.
- ATB recebido ou reduzido por habilidades.
- Buffs e debuffs.
- Turnos executados.
- Alterações de velocidade durante o combate.
- Empates e regras de desempate.
- Breakpoints de velocidade.
- Ordem de ação.
- Possibilidade de interrupção da sequência.

Respeitar as regras de arredondamento, aplicação de efeitos e resolução de turnos efetivamente verificadas para cada modo.

Não simplificar a simulação para uma simples ordenação por SPD.

---

## 8. SYNC — Calculadora de velocidade mínima

Reproduzir o comportamento da aba SYNC do 00Peanuts.

Ao configurar o Starter e os demais monstros:

1. Identificar a sequência desejada.
2. Calcular os efeitos das habilidades selecionadas.
3. Determinar as velocidades mínimas necessárias.
4. Atualizar os resultados quando qualquer parâmetro mudar.
5. Mostrar os valores necessários por unidade.
6. Indicar quando a ordem desejada não é cumprida.
7. Considerar o adversário de referência quando configurado.

**Casos das capturas para testes:**

- Bernard com SPD base 111.
- Bernard com +100 e +101 de bônus.
- Torre 15% e 0%.
- Skill 3 com efeito base de 30% de ATB.
- Skill-up mostrando 34,5% de ATB.
- Tiana com SPD base 96.
- Tiana com Swift ativo.
- Resultados de velocidade mínima de +48, +49 e +57 apresentados em diferentes configurações.

Reproduzir as entradas completas de cada screenshot antes de comparar os resultados. Não transformar valores isolados em regras universais.

---

## 9. ENEMY — Referência adversária

Implementar a aba ENEMY observada nas capturas.

Funcionalidades:

- Selecionar monstro adversário.
- Configurar velocidade.
- Configurar liderança e efeitos.
- Adicionar efeitos avançados.
- Aplicar efeitos globais quando pertinente.
- Utilizar adversário como referência da simulação.
- Manter a sincronização mais eficiente sem o adversário, conforme comportamento validado na referência.
- Copiar a velocidade do Starter quando solicitado.

A ausência de dados do adversário deve ser explicitada.

Não declarar que um time é impossível de interromper contra qualquer adversário.

---

## 10. TICKS — Simulação detalhada

Reproduzir a aba TICKS da referência.

Apresentar, tick por tick:

- Percentual de ATB de cada monstro.
- Velocidade e efeitos relevantes.
- Quem recebe o turno.
- Efeitos disparados.
- Boosts e reduções de ATB.
- Aplicação de SPD Buff.
- Eventos de habilidades.
- Turnos do adversário.
- Possíveis interrupções da sequência.

Diferenciar visualmente turnos aliados, inimigos e eventos.

Permitir acompanhar a simulação até o horizonte necessário para validar a sequência configurada, com limites de processamento e comportamento explícitos para casos não suportados.

A indicação de tuning correto deverá corresponder aos dados efetivamente simulados.

---

## 11. Configurações adicionais

Reproduzir os controles observados nas capturas:

- Seleção automática de Swift para Starter e demais unidades.
- Seleção automática de Will em casos aplicáveis, como Chilling.
- Adição manual de efeitos.
- Efeitos globais.
- Ajustes por modo de jogo.
- Limpeza com confirmação.
- Compartilhamento de configuração.

Respeitar alterações manuais do jogador; automatismos não devem sobrescrevê-las silenciosamente.

---

## 12. Integração com o SW Command Center

A calculadora será uma ferramenta autônoma, mas poderá receber dados de:

- Snapshot SWEX.
- Inventário de monstros.
- Runas e artefatos.
- Presets.
- Sync Team.
- Team Builder.

Ao abrir um time salvo, permitir carregar as informações da composição para análise.

Respeitar o contexto de equipamentos: diferentes conteúdos podem utilizar configurações independentes das mesmas runas.

Preservar os dados originais. Alterações feitas na calculadora são simulações, não mudanças confirmadas no jogo.

**Não adicionar nesta entrega:**
- Botão “Corrigir meu Speed Tuning”.
- Motor novo de otimização de runas.
- Aplicação automática de equipamentos.
- Redesign de módulos fora da calculadora.
- Funcionalidades extras não documentadas neste escopo.

O Optimizer e o Smart Upgrade continuarão sendo ferramentas separadas.

---

## 13. Interface e experiência visual

Usar os screenshots do 00Peanuts como referência funcional, não como cópia literal do design.

Aplicar o Design System do SW Command Center 2.0.

Prioridades:

1. Montagem intuitiva dos monstros.
2. Campos de velocidade facilmente editáveis.
3. Resultados de tuning em destaque.
4. Habilidades e passivas organizadas sem poluição visual.
5. Aba de ticks legível.
6. Boa utilização em desktop e celular.
7. Compatibilidade com War Mode e Office Mode.

Manter controles avançados acessíveis sem sobrecarregar a interface principal.

---

## 14. Testes obrigatórios

Criar testes unitários e de integração para:

- SPD base + runas.
- Swift.
- Torre e Leader Skill.
- Arredondamentos.
- Skill-ups.
- ATB Boost.
- SPD Buff e Debuff.
- Efeitos de artefatos relevantes.
- Ordem de turnos.
- Empates.
- Ticks.
- Passivas condicionais.
- Adversário de referência.
- Siege, Arena e RTA.
- Atualizações dinâmicas dos resultados.
- Carregamento correto de unidades possuídas e não possuídas.
- Isolamento entre contas e presets.
- Persistência e compartilhamento sem exposição de informações privadas.

Utilizar os screenshots como casos de regressão e comparar com os resultados da referência quando os dados forem suficientes.

Executar os testes existentes, a build e as regressões do projeto.

---

## 15. Critérios de aceite

A implementação estará concluída quando:

- Os monstros puderem ser selecionados corretamente.
- A SPD base e a SPD configurada forem calculadas corretamente.
- Habilidades e passivas suportadas influenciarem a simulação conforme suas regras.
- A calculadora determinar a SPD mínima necessária.
- A ordem dos turnos for simulada por ticks.
- A aba ENEMY alterar corretamente os cenários.
- As alterações de atributos atualizarem imediatamente os resultados.
- As integrações com dados da conta funcionarem.
- Os modos de jogo apresentarem comportamento consistente com as regras verificadas.
- O layout funcionar em desktop e mobile.
- Nenhum dado original for modificado.
- Os testes matemáticos e as regressões relevantes passarem.

Não declarar suporte completo a todos os efeitos se existirem habilidades ainda não modeladas.

---

## 16. Entrega e relatório

Implemente no projeto existente e apresente:

1. Arquivos modificados.
2. Funcionalidades implementadas.
3. Comparações realizadas com o 00Peanuts.
4. Casos de teste e resultados.
5. Cobertura de habilidades e passivas.
6. Limitações pendentes, se existirem.
7. Resultado da build e dos testes.

**Prioridade absoluta: precisão matemática, comportamento funcional e preservação das funcionalidades atuais.**

Não considerar a tarefa concluída apenas porque a interface ficou visualmente semelhante à referência.