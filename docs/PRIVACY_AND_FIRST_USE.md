# Privacidade, primeiro uso e recuperação de senha

A migração `202610260002_private_data_hardening.sql` acrescenta `user_inventory` e `swex_data` e reconstrói as políticas de inventário, incluindo `account_snapshots`: SELECT/INSERT/UPDATE/DELETE usam `auth.uid() = user_id`. Cargos de aplicação de líder e administrador não concedem acesso ao inventário de outra pessoa. Credenciais administrativas do banco continuam sendo uma fronteira confiável de backend e nunca devem ser expostas por `VITE_*`.

`profiles` permite leitura direta apenas do próprio perfil; alterações de nome/onboarding continuam nos RPCs limitados ao usuário atual. Alteração de cargo permanece apenas na administração confiável existente. O painel administrativo recebe metadados autorizados por RPC, sem acesso a inventários.

Em `guild_teams`, membros leem composições portáveis publicadas na própria guilda; counters pendentes continuam sujeitos à moderação. Escrita de composições na nuvem requer `super_admin` ou `guild_leader` com liderança na guilda de destino. Times locais continuam editáveis. Votos e resultados continuam nos RPCs restritos existentes. Troca de proprietário é proibida. O servidor rejeita árvores SWEX, identificadores de instâncias/equipamentos e campos privados nos payloads compartilháveis. Registros antigos incompatíveis ficam visíveis só ao proprietário: o deploy não apaga nem publica dados antigos. O RPC de favoritos aplica a mesma validação.

## Aplicação no projeto real

O workflow `.github/workflows/verify.yml` executa testes, navegador, build e depois `supabase db push`, no ambiente **supabase-production**. Configure nesse ambiente do GitHub:

- Secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.
- Variable `SUPABASE_PROJECT_REF` (ou `VITE_SUPABASE_URL`, da qual o workflow extrai a referência).

Configuração: https://github.com/FeehBig010/SwCommandCenter/settings/environments

Não é possível comprovar a proteção do banco publicado somente pelo build ou pela existência do arquivo SQL. A migração precisa concluir com sucesso no ambiente de produção. Sem as credenciais administrativas, o job falha explicitamente; os testes locais usam PostgreSQL/PGlite isolado.

## Autenticação e onboarding

Configure a Site URL e os Redirect URLs permitidos do Supabase Auth para o domínio real da aplicação, incluindo o retorno de recuperação `/?auth=recovery`. O SDK acrescenta o identificador PKCE ao redirect. O formulário usa `resetPasswordForEmail` com feedback que não revela se a conta existe. O retorno autenticado abre a criação de nova senha; o inventário privado só é restaurado após concluir esse fluxo. Cancelar encerra a sessão local de recuperação. Erros de autenticação são traduzidos sem exibir mensagens cruas do servidor.

A Dashboard sem conta oferece upload, demo e calculadora livre. A demo é local, identificada como fictícia e não inicia o tour. Um upload SWEX concluído marca o tour como elegível. Conclusão ou dispensa grava `has_completed_onboarding=true` localmente e chama `complete_my_onboarding` quando autenticado. Se a conclusão ocorreu como convidado ou a rede falhou, o estado local é reconciliado ao entrar/recuperar foco. Não se transmite o JSON bruto nesse processo.

## Desempenho e testes

Leitura do arquivo, `JSON.parse` e normalização rodam em Worker. Slots vazios e artefatos `null` são tolerados; JSON inválido produz mensagem amigável. Avatares adiam inclusive a resolução dinâmica de CDN até se aproximarem da viewport; ícones usam `loading=lazy` e `decoding=async`. Fundos de atalhos fora da viewport são adiados. O fundo principal visível é mantido imediato para preservar o LCP. As galerias de Siege montam lotes de 24, mantendo o selecionado disponível; os detalhes/counters seguem a sanfona existente.

A fórmula vigente de SPD é `ficha + ceil(base × (torre + líder aplicável + totem aplicável) / 100)`, antes de buffs e condições de artefatos. Swift já está incluído na ficha. Ticks permanecem inteiros; líderes por área/elemento mantêm suas restrições.

- `npm test`: testes unitários e integração de PostgreSQL/RLS, Worker, parser, speed e autenticação.
- `npm run test:browser`: inicia Vite com configuração pública fictícia, intercepta APIs e executa os fluxos mobile no Chromium, sem enviar e-mails nem acessar contas reais. Use `npx playwright install chromium` se não houver Chromium instalado.
- `npm run build`: compilação de produção.

A CI executa os três comandos. `E2E_ARTIFACT_DIR` pode definir onde salvar as capturas do navegador.
