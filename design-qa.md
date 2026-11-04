# Calculadora Livre — balança de builds

Revisão de 04/11/2026. Escopo: Calculadora Livre e sua exportação; Home,
autenticação, permissões, importação e persistência permanecem nos fluxos existentes.

## Referência e evidências

- Referência selecionada: opção 2, `/workspace/generated_images/exec-7f14db6b-cbf4-41f1-b36f-8e5063c374ce.png`.
- Implementação real: Vite preview do build, `http://127.0.0.1:5295/#/quick`.
- Captura principal: `/workspace/artifacts/team-balance/visual-desktop.png`.
- Preferências abertas: `/workspace/artifacts/team-balance/visual-desktop-popover.png`.
- Comparações conjuntas: `/workspace/artifacts/team-balance/comparison.png`,
  `popover-comparison.png` e `card-comparison.png` na mesma pasta.
- Desktop: fonte e captura com 1586 × 992 pixels, viewport CSS 1586 × 992,
  deviceScaleFactor 1. Sem redimensionamento; 25px de legenda acrescentados
  apenas à prancha comparativa. Recorte de card usado para examinar tipografia,
  ficha e as seis runas, além da comparação global.
- Estado comparável: Siege, Adriana → Rigna → Mihyang, líder Mihyang,
  primeira ligação obrigatória e segunda aproximada. Prioridades HP/SPD no
  abridor e SPD/ATK/DC nos demais. Swift obrigatório; conjuntos secundários
  preferidos. As capturas usam conta fictícia e os valores 377/363/344 de SPD
  são calculados a partir dos equipamentos dessa fixture.
- Dados de base e bônus diferem dos números ilustrativos da referência:
  não se reproduzem fichas inventadas como se fossem dados reais do jogador.
  O catálogo não fornece a base completa de Rigna; somente a fixture visual
  usa uma base fictícia explícita. A aplicação usa a base da unidade do SWEX.
- Mobile/tablet: `visual-1280.png`, `visual-390.png`, `visual-320.png`.
  Fluxo funcional adicional em 1440/1280/1024/390/320px, com capturas em
  `/workspace/artifacts/team-balance/production/`.
- PNG real de uma alternativa: `production/alternative-technical.png`.
- Script visual reproduzível: `/workspace/artifacts/team-balance/visual.mjs`.
  As evidências são locais, fora do Git; não incluem inventários privados.

## Achados e correções

1. **P2 — Popover fora da viewport.** A primeira validação encontrou um painel
   em y=566 com altura 620 numa viewport de 900px. A posição agora é limitada
   ao espaço disponível, com rolagem interna e reposicionamento em resize/scroll.
   Evidência final: capturas de preferências em todos os tamanhos testados.
2. **P2 — Preferências densas demais.** Os oito controles de atributos e todas
   as regras de equipamentos estavam expostos simultaneamente. Agora há uma
   linha de checkboxes; os pesos destacados acompanham os atributos marcados.
   Mínimos dos demais atributos e conjuntos/principais usam expansores próprios.
   Evidência final: comparação dos popovers e captura mobile.
3. **P2 — Foco ao editar mínimos.** Um campo que mudava de grupo ao receber ou
   perder um mínimo podia perder o foco. Os grupos agora dependem da seleção de
   prioridade, mantendo o input no mesmo lugar durante a edição. Escape fecha
   o painel e devolve foco ao acionador. Validado no fluxo automatizado.
4. **P2 — Exportação de equipamento.** O Card Técnico precisava receber a conta
   para representar as peças efetivas de uma alternativa. Agora usa o mesmo
   inventário, as metas explícitas e o cenário de ticks. Preferências não são
   apresentadas como exigências; SPD de combate é identificada. PNG gerado e
   inspecionado, com retratos, seis runas e artefatos reais da fixture.

As capturas iniciais em `/tmp` não sobreviveram ao reinício do ambiente. As
medições acima foram registradas durante a execução; as evidências finais foram
recapturadas do build de produção na pasta persistente indicada.

## Superfícies de fidelidade

- **Fontes:** Cinzel no título existente, Inter/system-ui nos dados e controles;
  números tabulares e SPD destacada. Os avatares de 48px e dados mais densos
  preservam o padrão compacto já usado no aplicativo.
- **Espaçamento:** três cards alinhados, ficha com colunas Base/Bônus e seis slots
  em disposição hexagonal. Sem formulários avançados permanentemente abertos.
  A faixa do preset e as ações reais acrescentam uma linha ao conceito; preservam
  importação, restauração e exportação, sem deslocar funcionalidades para outra rota.
- **Cores:** azul/preto fosco, separadores discretos, ouro velho nas ações;
  verde/âmbar indicam metas acompanhadas por ícones e texto. Não foi introduzido tema.
- **Imagens:** retratos pelo helper existente e IDs reais; formas/glyphs oficiais
  de runas dos assets locais. Artefatos identificados pelos itens efetivos,
  com ícone da biblioteca existente e nível; nenhum artefato ausente é inventado.
  A CDN de Rigna é espelhada com o mesmo arquivo local apenas na fixture visual.
- **Conteúdo:** informações numéricas vêm do motor; alternativas só aparecem
  após uma busca real. O conceito continha abas ilustrativas antes da busca:
  não foram incluídos resultados fictícios para imitar esse estado.

## Interações e preservação

- Abertura vazia, preset de qualquer área com slots nativos, liderança independente.
- Prioridades, mínimos obrigatórios/preferidos, conjuntos e principais 2/4/6.
- Busca/paginação de todas as runas disponíveis; fixação e liberação por ID.
- Sincronia por ligação, com cenário/referência visível e ticks inteiros.
- Atual/alternativas nos mesmos cards; diagnóstico explícito e aplicação revalidada.
- Cancelamento e invalidação após edição; nenhuma alteração no SWEX armazenado.
- Teclado, Escape, foco de retorno, movimento reduzido e ausência de overflow horizontal.
- Upload, login, nuvem, guilda, presets, outros otimizadores e Home exercitados
  na suíte de regressão existente.
- Sem erros JavaScript nos fluxos de navegador. Requisições externas e serviços
  são interceptados nas fixtures; esta validação não certifica disponibilidade
  de terceiros nem substitui testes com todas as contas/dispositivos reais.

## Verificação

- `npm test`: 521 testes aprovados na suíte completa; resultado registrado em
  `/workspace/artifacts/team-balance/unit-tests-final.log`.
- `node --test tests/team-balance.test.mjs tests/export-infographic.test.mjs`:
  29 testes aprovados, incluindo metas exportadas e compatibilidade legada.
- `npm run test:browser`: 11 fluxos concluídos; log `browser-tests.log`.
- Fluxo novo executado também sobre o build de produção, incluindo PNG e Worker
  compilado: `production-browser.log`. Conta fictícia de 1578 runas;
  cálculo ~0,65s, 43 atualizações da tela, maior intervalo ~39ms nessa medição.
- `npm run build`: aprovado; permanece o aviso de chunk acima de 500kB.
- `git diff --check`: sem problemas. O projeto não possui comando de lint.

## Limites e polimento

A busca é heurística e limitada, sem garantia de ótimo global. Sincronia é
avaliada no cenário informado, com referência automática quando necessário;
não garante segurança contra qualquer defesa. Artefatos não são redistribuídos,
nem há upgrades fictícios de grinds/gemas. Os controles manuais e o otimizador
anterior permanecem disponíveis. Não há migração de banco nesta entrega.

P3: refinamentos futuros de tipografia/escala podem aproximar ainda mais a
ilustração, mantendo retratos compactos e todos os controles reais. Não há
P0/P1/P2 visual ou funcional em aberto no escopo validado.

**final result: passed**
