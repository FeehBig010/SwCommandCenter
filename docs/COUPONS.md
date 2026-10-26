# Cupons: Supabase e fonte comunitária

`src/lib/coupons.js` exporta `fetchActiveCoupons({client,signal})`. O portal fornece
o cliente Supabase público já configurado no aplicativo. A consulta usa somente
as colunas promocionais de `public.coupons`, sem ler ou publicar dados do SWEX.

1. Cupons ativos recentes da tabela têm prioridade. A busca filtra a validade no
   servidor e repete a validação no cliente. Datas vencidas ou inválidas são
   descartadas, inclusive no instante exato de expiração.
2. Tabela vazia, ausente, indisponível ou com observações anteriores a seis horas
   aciona o endpoint JSON público da comunidade YunaMyst (índices SWGT/SWQuery).
   Cupons manualmente curados ainda válidos são preservados. Revogações explícitas
   da comunidade removem as respectivas cópias de origem comunitária.
3. Sem conexão, apenas registros da nuvem ainda válidos ou o snapshot recentemente
   observado podem permanecer. Ausência de validade explícita exige confirmação
   nas últimas 72 horas; não se inventa uma data de expiração oficial.

O timer de validade remove os cupons ao vencerem, sem aguardar o próximo fetch.
Há atualização da lista a cada 15 minutos e por botão, além da verificação ao
retomar a janela. O frontend não escreve na tabela compartilhada. Atualizações
do backend/admin devem manter `checked_at` como o instante real de verificação.

## Tabela

Migration: `supabase/migrations/202610260001_public_game_coupons.sql`.

- `code`: código único, em maiúsculas, alfanumérico.
- `rewards`: JSON com objetos `{ "type": "mana", "amount": 300000 }`. Tipos:
  `mana`, `energy`, `crystal`, `mystical`, `wind`, `water`, `fire`, `light_dark`,
  `legendary`. Textos externos são convertidos no cliente para os tipos conhecidos.
- `expires_at`: validade confirmada; `NULL` significa validade desconhecida.
- `checked_at`: data da última confirmação, obrigatória.
- `status`: `active` ou `expired`.
- `source`: `manual` ou `community`.

RLS permite leitura pública somente de registros ativos ainda válidos. Visitantes
e membros não podem inserir, editar ou excluir. Gravações exigem backend confiável
com role administrativa/service role; essa credencial nunca entra no frontend.

O deploy já existente executa `supabase db push` após os testes/build. O ambiente
GitHub Actions `supabase-production` precisa dos secrets `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD` e da variable `SUPABASE_PROJECT_REF` (ou URL pública válida
para derivá-la). O último deploy inspecionado estava sem essa configuração; por
isso, a aplicação da migration não foi confirmada no banco remoto. Até configurá-la,
o portal usa automaticamente a fonte comunitária. Não é necessário cadastrar
cupons manualmente para o módulo funcionar.

## Interface e verificação

Recompensas usam PNGs oficiais de itens distribuídos pelo repositório SWARFARM,
mantidos em `/game-icons/rewards/`. `CouponReward` utiliza um mapa fechado de tipos
e um ícone neutro de fallback, sem carregar URLs arbitrárias da tabela.

O botão de cópia aguarda `navigator.clipboard.writeText` e mantém “Copiado! ✓”
por 2.000 ms. Falha de permissão seleciona o código para cópia manual. O link
`https://event.withhive.com/ci/smon/evt_coupon` abre o formulário oficial de
resgate em nova aba, com proteção contra `window.opener`. O destino é fixo, sem
injetar o código em parâmetros não documentados; use “Copiar Código” para colá-lo
no formulário.

`tests/coupons.test.mjs` valida prioridade/fallback, validade e cancelamento,
clipboard, markup real dos ícones e permissões PostgreSQL/RLS. Os testes de
integração de navegador usam dados sintéticos, sem resgates ou escritas reais.
