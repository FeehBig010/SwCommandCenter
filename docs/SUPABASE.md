# Ativar a nuvem

O repositório funciona sem Supabase. **Não há projeto configurado ou banco remoto criado nesta entrega**: o proprietário informou que ainda não tem projeto. A migration, cliente, autenticação e sincronização estão prontos para conectar. Testes locais de PostgreSQL/RLS e testes de contrato do SDK não substituem validação no seu projeto.

## 1. Projeto e configuração pública

1. Crie um projeto Supabase na sua organização. Copie Project URL e a chave **anon/publicável**.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Configure as mesmas variáveis no serviço que compila o frontend e faça novo build. Variáveis Vite são públicas e incorporadas no build.
3. **Nunca use `service_role`, chaves secretas, senha do banco ou access token em variáveis `VITE_*`.** `.env.local` está ignorado pelo Git. Configuração ausente/inválida mantém o aplicativo no modo local.

## 2. Criar as tabelas

Aplique uma vez `supabase/migrations/202610220001_guild_cloud.sql` no SQL Editor do projeto, ou use o CLI autenticado:

```sh
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

A migration cria `guilds`, `guild_members`, `guild_invites` e `guild_teams`, índices, RLS e RPCs com permissões restritas. Ela pressupõe o schema `auth` e os papéis padrão do Supabase. Não apague tabelas existentes para reaplicar: mantenha o histórico de migrations. Se usar o SQL Editor, registre a migration como aplicada no CLI antes de ativar deploy automático.

## 3. Login por e-mail e Discord

- Habilite e-mail/senha no Supabase Auth; configure SMTP/confirmations de acordo com o ambiente. “Criar conta” informa quando é necessário confirmar o e-mail. O aplicativo não armazena senhas.
- Em Auth → URL Configuration, defina **Site URL** como a URL real do aplicativo e adicione as URLs exatas de redirecionamento de produção e desenvolvimento (por exemplo `http://localhost:5173`). O retorno usa a origem e o pathname atuais, sem query string.
- Crie uma aplicação no Discord Developer Portal, habilite o provedor Discord no Supabase e informe Client ID/Client Secret **no Supabase, nunca no frontend**. Registre no Discord o callback `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`. O botão solicita `identify email`; PKCE é tratado pelo SDK.
- Teste cadastro/confirmacão, login, retorno OAuth, atualização de sessão e logout no domínio final. Esses testes reais dependem do projeto e do provedor configurados.

## 4. Guildas e composições

- O primeiro líder cria uma guilda no Hub. Isso não reivindica uma guilda existente pelo nome do SWEX.
- A liderança gera um convite aleatório de membro, válido por sete dias. Compartilhe o código só com membros; qualquer conta autenticada com o código poderá entrar. Para revogar antes do prazo, a administração pode excluir o convite no banco.
- Associar/promover/remover líderes de uma guilda existente é uma ação administrativa no banco. O cliente não pode alterar `guild_members.role` nem se promover via metadados de login.
- “Salvar na nuvem” sincroniza a composição selecionada. Escolha privada (somente dono) ou compartilhada (somente membros da guilda ativa). Apenas líderes podem marcar “Sugestão da liderança”. Confrontos preservam ofensa, defesa inimiga e resultado observado.
- Para editar uma composição publicada, copie para o otimizador, altere, selecione o time atualizado em “Composição para sincronizar” e use “Atualizar com a composição selecionada” na composição de destino. A atualização verifica `updated_at`; conflitos pedem recarregamento, sem sobrescrever silenciosamente outro dispositivo.
- A biblioteca atualiza ao voltar à janela e a cada 30 segundos; “Atualizar nuvem” força uma consulta. Não depende de habilitar Realtime/publications.
- “Copiar para o Meu Hub” cria um time local independente, selecionando cópias distintas do seu JSON pelo master ID exato. Não substitui unidades ausentes. “Validar só este time” permite conferir a cópia sem incluir outros rascunhos; o botão principal continua distribuindo runas conjuntamente entre todos os times ativos.
- Somente composições/metas/cenários/confrontos são enviados. Não enviamos o SWEX, inventário, tokens do jogo, IDs de instância dos monstros ou resultados privados de outras contas. Copiar uma sugestão não publica o inventário do membro.
- O inventário e os rascunhos do navegador continuam locais e não são apagados ao sair. Em dispositivo compartilhado, encerre a sessão e use “Apagar dados locais” antes de entregá-lo a outra pessoa. As listas privadas da nuvem são descartadas da interface ao sair ou trocar de sessão.

## 5. CI e migrations automáticas

O workflow `.github/workflows/verify.yml` executa `npm ci`, `npm test` e `npm run build` em PRs e pushes da `main`, e guarda `dist` como artefato. Publicar o site depende do provedor de hospedagem existente; este workflow não torna o site público nem substitui sua identidade de hospedagem.

Depois de criar/configurar o projeto, no GitHub:

- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (somente chave pública), `SUPABASE_PROJECT_REF` e `ENABLE_SUPABASE_DEPLOY=true`.
- Secrets no ambiente `supabase-production`: `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.
- Configure as proteções desse ambiente de acordo com seu processo.

Somente com a flag habilitada e o projeto definido, após os testes passarem, o job `migrate-supabase` executa `supabase db push`. Enquanto não houver projeto, o job de banco fica desativado. Não existe deploy remoto verificado nesta entrega.
