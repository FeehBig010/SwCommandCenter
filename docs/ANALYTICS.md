# Motores analíticos

O portal, a busca por família completa, os presets isolados, os controles duplos e os cards PvE/PvP são compartilhados com os fluxos anteriores. A identidade permanece Clã Destino; os gradientes automáticos de cenário não são um editor de temas. Cairos mostra somente os oito perfis B12/Abissal/PC10/SF10. Dimensional/Rift/Labirinto são destinos visuais do cenário manual, não novos simuladores completos dessas mecânicas.

## Dano

`src/utils/damageCalculator.js` expõe perfis curados dos modelos de Lushen S3 e Julie S3 já utilizados nas waves. Outros monstros exigem coeficientes manuais: não há banco validado de todas as habilidades. Perfis não inferem skill-ups do JSON. Artefatos são agregados uma vez por cenário pelo motor compartilhado. Quebra de DEF reduz DEF em 70%, Marca aumenta dano em 25%, Glancing impede crítico e reduz a parcela da habilidade em 30%. Dano adicional é por golpe, sem crítico/mitigação por DEF. A RES do alvo afeta a chance do debuff (`ativação × (1 − max(15, RES − ACC)/100)`), nunca dano direto. As caixas de debuff significam “já aplicado”; aplicações, IA, passivas especiais e procs não são sorteados. Dano ainda é uma estimativa condicional.

## Pedras e runas ancestrais

`rune_craft_item_list` conserva apenas ID, tipo, set, atributo, raridade e quantidade. O formato compacto usa `craft_type_id` (set + dois dígitos de atributo + dois de qualidade), conforme o parser público do SWEX (`Xzandro/sw-exporter`, commit `eb7f8c09b976d7b76c51ebb30765bfdf381c3888`, `app/plugins/run-logger.js`, `app/mapping.js`). Tipos 1/2 são gema/grind, 5/6 ancestrais. Itens desconhecidos ficam de fora.

O simulador aplica o teto do roll da pedra disponível, exige compatibilidade entre set/ancestralidade e bloqueia quantidades esgotadas. Gemas exigem +12/quatro secundários, respeitam main/innate, atributos proibidos do slot e no máximo um índice encantado. Reaplicar grind nunca soma sobre o anterior. Nada consome estoque real ou modifica o SWEX; cada runa tem sua simulação isolada. Os limites estendidos suportados são percentuais/SPD e TC/DC/RES/ACC de gemas lendárias ancestrais; flats ancestrais e raridades ancestrais inferiores não têm teto validado neste snapshot e ficam explicitamente indisponíveis. O modo global Max Grind já existente continua usando apenas pedras regulares teóricas, independente do estoque; não confundir com este simulador por inventário.

## Tesouros, lacunas e histórico

A eficiência mostrada é a soma dos secundários/innate divididos pelo maior roll de cada atributo, em nove rolls máximos de seis estrelas. Exclui grinds, não é uma porcentagem universal de qualidade para qualquer build. Ancestrais podem superar 100% em relação a essa referência. Runas livres com SPD secundária ≥18 (incluindo grind) ou índice ≥85% entram na varredura. O processamento roda em Worker com cancelamento na navegação. Sugestões fazem trocas de um slot, preservam todos os atributos atuais, SPD de combate, main exigida e conjuntos completos. Runas equipadas, bloqueadas ou reservadas por planos/salvos são excluídas; sugestões são alternativas, não podem ser todas aplicadas sem revalidar. O clique revalida e grava somente um plano local, nunca equipa no jogo. Não é prova de ótimo global.

O guia de farm cruza metas faltantes e conjuntos desejados com suas fontes; não promete drops. O lembrete dimensional não monitora energia ao vivo. A animação numérica respeita `prefers-reduced-motion`. O histórico usa o último registro de cada semana UTC por conta, com média de eficiência, contagens e runas de SPD alta. Há persistência local e sincronização privada opcional preparada na migration 005. Sem um projeto Supabase configurado, não há autenticação/armazenamento remoto real para validar.
