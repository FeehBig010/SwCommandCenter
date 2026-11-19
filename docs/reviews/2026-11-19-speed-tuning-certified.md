# Speed Tuning 2.0 — implementação certificável

## Estado

Entrega técnica incremental na Calculadora Livre. **Paridade externa SWCALC: BLOCKED**. Nenhuma comparação externa foi fabricada, nenhuma garantia G3 e nenhuma nova mudança no Rune Optimizer. Registro externo vazio em tuning-parity.js. RTA continua experimental.

## Alterações

- `tuning-certification.js`: classificação interna VALIDADO/PARCIAL/BLOCKED, razões, cobertura de habilidades/passivas, equipamentos ausentes, hipóteses, truncamento e adversários selecionados sem SPD. Certificar uma sequência não certifica mínimo global.
- `tuning-minimum.js`: busca exaustiva inteira limitada de uma contribuição de SPD de runas usando quickPreview/simulateCombat existentes, mantendo os outros atores fixos. Evidência do mínimo e candidato inferior; mínimo zero tratado. Referência automática, dados incompletos, níveis relevantes desconhecidos e mecânicas não cobertas são parciais. Intervalo esgotado não é impossibilidade global.
- Margem de segurança independente, reavaliada pelo mesmo simulador; pode destruir ordem. Limite é da busca, não da proposta hipotética com margem; não representa equipamento disponível.
- `tuning-parity.js`: contrato versionado e comparação estrita de entradas, SPD, prontidão, ação, ordem e corte. Proveniência declarada requer revisão humana. Fixtures sintéticas não são certificação externa.
- `TuningCertification.jsx`/CSS e worker: provas explícitas, canceláveis, sem aplicar velocidades/equipamentos; contexto alterado invalida resultado imediatamente e encerra worker. Campos avançados expansíveis e temas existentes mantidos.
- `tuning-visual-order.js` e QuickCalculator: setas/arrastar organizam apenas os cards. Ordem desejada, líder, posição física, eventos e equipamentos preservados; ações semânticas existentes continuam explícitas.

## Validação

- TDD nos quatro módulos novos, com falhas antes da implementação.
- Suíte completa: **677/677**, sem falhas, cancelamentos ou skips,143,9s; mesmo glob de npm test com concorrência serial.
- Build de produção aprovado; aviso existente de chunks acima de500KB permanece.
- Revisão independente reproduziu falso VALIDADO com inimigo Leo SPD0. Corrigido por regra compartilhada entre certificação e prova; placeholders vazios continuam ignorados; revisão final sem bloqueios no escopo revisado.
- Browser dedicado: worker, margem separada, prova somente leitura, invalidação, cancelamento, identidade semântica ao mover cards,1440/1920/390/320 e Office. Regressões adicionais registradas ao final desta entrega.
- Primeiras execuções de regressão coincidiram com HMR de módulos em desenvolvimento; falhas de navegação foram repetidas após congelar o código. Novo teste usa30s para inicialização do app em vez de5s; critérios funcionais não foram removidos.

## Evidências

- [Prova e margem](speed-tuning-certification/proof-1440.png)
- [Mobile390](speed-tuning-certification/mobile-390.png)
- [Office1440](speed-tuning-certification/office-1440.png)

## Bloqueios externos e limites

SWCALC foi novamente solicitado por HTTPS nesta rodada: proxy devolveu403 CONNECT. As imagens anteriores de00Peanuts não viraram evidência SWCALC. Sem observações externas reproduzíveis/revisadas, a condição final de paridade segue aberta. Catálogo de skills não significa execução de todas as mecânicas; condições e eventos ausentes não são inventados. Prova individual não é ótimo conjunto, não elimina RNG nem prevê vitória.

Dados originais, histórico, inventário, dependências, autenticação, banco de dados e esquemas SWEX não foram alterados. Nenhuma migração. A integração já existente com Optimizer foi apenas testada; novas alterações continuam atrás do gate técnico.

## Regressão final

Passaram7 fluxos Playwright: tuning-certification, calculator-v2, speed-tuning-2, quick-presets, quick-tick-targets, quick-auto-sync e quick-density. O teste dedicado também capturou Office e confirmou a prova somente leitura. Busca por monstros nos testes foi limitada a `.combobox-popover [role=option]`: o seletor de monstro da prova possui opções homônimas e seletores globais anteriores tentavam clicar em `<option>` nativo fora da busca. Nenhuma verificação de comportamento foi removida. A suíte browser inteira não foi repetida localmente nesta rodada.
