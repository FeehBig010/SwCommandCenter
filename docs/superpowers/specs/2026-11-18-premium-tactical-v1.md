# SW COMMAND CENTER — REDESIGN PREMIUM TACTICAL V1

## MISSÃO

Autorizo uma evolução completa de UX/UI do SW Command Center existente.

Quero transformar o sistema em uma aplicação moderna, organizada, visualmente premium e integrada, preservando todas as funcionalidades que já funcionam.

**Não quero reconstruir o projeto do zero, criar outro laboratório, trocar a stack ou perder funcionalidades.**

Quero executar essa evolução em uma única tarefa do Codex, dividida internamente em incrementos seguros e verificáveis.

## 1. INSPEÇÃO OBRIGATÓRIA

Antes de modificar o código:

1. Leia as instruções do repositório e a documentação relevante em `docs/`.
2. Inspecione os componentes, páginas, estilos, rotas e motores atuais.
3. Verifique branch, alterações locais e estado do Git.
4. Identifique funcionalidades existentes e dependências entre módulos.
5. Verifique se já existe alguma implementação da Calculadora V2 ou do Design Lab.
6. Preserve decisões e implementações anteriores que continuem válidas.

Não sobrescreva trabalho não commitado.

Crie uma branch de trabalho chamada `feature/swcc-premium-tactical-v1`, ou use uma branch equivalente existente sem destruir alterações.

## 2. NOVA NAVEGAÇÃO

Reduza a navegação principal a cinco destinos:

1. **Início**
2. **Siege Center**
3. **Rune Optimizer**
4. **Rune Intelligence**
5. **Calculadora de Velocidade**

As demais funcionalidades devem permanecer acessíveis em grupos secundários:

- Outras ferramentas.
- Outros modos de jogo.
- Conta e dados.
- Administração, quando autorizada.

Preserve todas as rotas existentes ou forneça redirecionamentos compatíveis.

### Sidebar

- Expandida por padrão no desktop.
- Nomes e ícones sempre identificáveis.
- Botão para recolher.
- Persistência da preferência do usuário.
- Não sobrepor o conteúdo ao expandir.
- Estado ativo claramente identificado.
- Navegação Voltar/Avançar funcionando corretamente.

## 3. DESIGN SYSTEM — PREMIUM TACTICAL

Aplique uma identidade visual consistente em todo o aplicativo.

### Referências

- Linear: organização e clareza.
- Apple: refinamento e usabilidade.
- Summoners War: identidade, monstros, elementos, runas e habilidades.
- Modo Office atual: referência de legibilidade.
- Modo War atual: referência temática, com uso moderado.

### Direção

- Dark mode profissional.
- Fundo grafite e azul-petróleo.
- Dourado discreto para identidade e destaques importantes.
- Tipografia legível.
- Cards e tabelas consistentes.
- Espaçamento padronizado.
- Hierarquia clara dos dados.
- Estados de erro, sucesso, alerta e carregamento.
- Controles avançados disponíveis por expansão.
- Priorizar desktop em 1440 e 1920 px.

Evite excesso de gradientes, brilhos, bordas decorativas, animações e cards desnecessários.

Crie fundamentos reutilizáveis de design sem substituir indiscriminadamente CSS compartilhado.

## 4. INÍCIO

Reorganize a Home para apresentar:

- Resumo e estado da conta.
- Continuidade do trabalho.
- Acesso rápido aos módulos principais.
- Último SWEX importado e identificação do snapshot.
- **CÓDIGOS & EVENTOS ATIVOS**, preservando integralmente a funcionalidade existente.

Não remova consultas, links, atualização ou cópia de códigos.

## 5. SIEGE CENTER

Simplifique profundamente a experiência principal.

O usuário deve conseguir:

1. Selecionar ou cadastrar uma defesa inimiga.
2. Selecionar o time ou preset utilizado no ataque.
3. Informar vitória ou derrota.
4. Adicionar observações opcionais.
5. Consultar histórico de confrontos.

Priorize rapidez e simplicidade.

Não coloque votação, planejamento de guilda, recomendações complexas ou estatísticas excessivas no fluxo principal.

Preserve os dados e as funcionalidades históricas existentes, mantendo recursos avançados em áreas secundárias quando necessário.

Não transforme feedback antigo de counters em partidas reais.

## 6. RUNE OPTIMIZER

Preserve e melhore a interface atual.

Requisitos:

- Lista compacta de equipes.
- Retratos, nomes e elementos dos monstros.
- Presets e builds.
- Ordem de turno.
- SPD e contexto de combate.
- Restrições e prioridades.
- Otimização conjunta.
- Comparação antes/depois.
- Equipamentos e movimentações necessárias.
- Proteções, reservas e travas.
- Resultados e salvamento explícito.

Preserve as regras de compartilhamento de runas entre presets independentes e exclusividade dentro de equipes simultâneas.

Não altere o motor de otimização sem evidências e testes.

Adicione a ação contextual **Verificar Sincronia**.

## 7. CALCULADORA DE VELOCIDADE V2

Integre a experiência visual e funcional documentada do 00Peanuts à Calculadora Livre existente.

Não dependa de sites externos para utilizar a ferramenta.

### Interface

- Monstros com retratos e nomes reais.
- Elementos.
- SPD base e adicional.
- SPD de ficha e SPD de combate.
- Liderança e torre.
- Habilidades selecionáveis para o primeiro turno.
- Buffs, ATB e efeitos conhecidos.
- Swift e artefatos.
- Velocidade mínima dos seguidores.
- Referência inimiga.
- Abas Sincronia, Inimigo e Ticks.
- Timeline detalhada de eventos.

Reutilize `MonsterPortrait`, `MonsterSearch`, o catálogo existente e o motor de velocidade atual.

### Integração

Ao abrir a calculadora pelo Rune Optimizer:

- Carregue a composição selecionada.
- Preserve as identidades das cópias físicas.
- Transfira velocidades, liderança e contexto de combate.
- Permita retornar ao otimizador sem perder informações.
- Permita devolver metas de SPD mediante ação explícita.

Não aplique runas automaticamente.

### Segurança matemática

Preserve o motor existente.

Teste mudanças de fórmulas antes de aplicá-las.

Não apresente resultados RTA novos ou não validados como cálculos confiáveis.

Diferencie claramente ordem inválida, corte observado, cenário parcial e ausência de referência.

## 8. RUNE INTELLIGENCE

Mantenha integralmente:

- Reapps.
- Filtros.
- Classificação de runas.
- Shortlists.
- Lacunas.
- Planejamento.
- Preferências persistidas.
- Integração com a Oficina de Runas.

Atualize apenas a apresentação, navegação e componentes visuais necessários.

## 9. OUTRAS FERRAMENTAS

Preserve:

- Arena e RTA.
- Cairos e PvE.
- Fenda e Raid.
- Inventário.
- Oficina de Runas.
- Builds salvas.
- Dados SWEX.
- Autenticação e backup.
- Exportações e compartilhamentos.
- Configurações e permissões administrativas.

Reorganize seus acessos e aplique gradualmente a identidade visual comum, sem reescrever funcionalidades fora do escopo.

## 10. ESTRATÉGIA DE EXECUÇÃO

Execute uma única tarefa, organizada internamente nesta ordem:

**Incremento A — Navegação e fundamentos visuais**

Implemente menu simplificado, sidebar, layout principal e Design System básico.

**Incremento B — Home e Siege Center**

Simplifique os dois módulos preservando funcionalidades e dados.

**Incremento C — Calculadora V2**

Integre a nova experiência à Calculadora Livre existente.

**Incremento D — Rune Optimizer**

Melhore a interface e conecte seus fluxos à calculadora.

**Incremento E — Rune Intelligence e consistência global**

Aplique os componentes visuais e corrija inconsistências entre módulos.

Após cada incremento, execute os testes relevantes antes de avançar.

Não interrompa a tarefa para solicitar aprovação de cada arquivo ou decisão técnica menor.

Em caso de risco de perda de dados, mudança de comportamento matemático sem validação ou impossibilidade de preservar uma funcionalidade, mantenha o comportamento atual e registre a pendência.

## 11. VALIDAÇÃO

Ao finalizar:

1. Execute os testes relevantes e a suíte completa.
2. Execute o build de produção.
3. Teste os fluxos principais com Playwright.
4. Valide navegação e compatibilidade das rotas.
5. Confirme acesso às ferramentas secundárias.
6. Teste importação SWEX e presets.
7. Teste Calculadora e Rune Optimizer integrados.
8. Verifique que as funcionalidades antigas continuam disponíveis.
9. Capture screenshots reais das telas principais.
10. Registre falhas e limitações não resolvidas.

Não reduza a cobertura dos testes para obter aprovação artificial.

## 12. ENTREGA E GITHUB

Ao concluir:

- Faça commits organizados na branch de trabalho.
- Envie a branch ao GitHub.
- Verifique que os arquivos estão no remoto.
- Informe o link da branch ou Pull Request.
- Liste as principais alterações.
- Apresente resultados dos testes.
- Mostre screenshots reais.
- Informe pendências ou diferenças em relação ao escopo.

**Não faça merge na main e não faça deploy sem minha autorização.**

## RESULTADO ESPERADO

Quero o SW Command Center renovado, com:

- Cinco áreas principais.
- Navegação intuitiva.
- Interface Premium Tactical consistente.
- Calculadora integrada.
- Rune Optimizer conectado à calculadora.
- Siege Center simplificado.
- Rune Intelligence preservado.
- Todas as demais funcionalidades acessíveis.
- Código testado e versionado.

Não crie outra aplicação. Evolua o produto que já existe.