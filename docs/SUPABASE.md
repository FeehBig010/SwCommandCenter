# Ativar a nuvem

O repositório funciona sem Supabase. **Não há projeto configurado ou banco remoto criado nesta entrega**: o proprietário informou que ainda não tem projeto. A migration, cliente, autenticação e sincronização estão prontos para conectar. Testes locais de PostgreSQL/RLS e testes de contrato do SDK não substituem validação no seu projeto.

## 1. Projeto e configuração pública

1. Crie um projeto Supabase na sua organização. Copie Project URL e a chave **anon/publicável**.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Configure as mesmas variáveis no serviço que compila o frontend e faça novo build. Variáveis Vite são públicas e incorporadas no build.
3. **Nunca use `service_role`, chaves secretas, senha do banco ou access token em variáveis `VITE_*`.** `.env.local` está ignorado pelo Git. Configuração ausente/inválida mantém o aplicativo no modo local.

## 2. Criar as tabelas

Aplique uma vez, em ordem, `supabase/migrations/202610220001_guild_cloud.sql`, `supabase/migrations/202610220002_siege_counters.sql`, `supabase/migrations/202610220003_admin_rbac.sql` e `supabase/migrations/202610220004_account_snapshots.sql` no SQL Editor do projeto, ou use o CLI autenticado:

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

- Depois do bootstrap e da atribuição de cargos, um Super Admin ou Guild Leader cria uma guilda no Hub. Membros entram por convite e não podem criar uma guilda para se promover. O nome da guilda no SWEX não concede acesso.
- A liderança gera um convite aleatório de membro, válido por sete dias. Compartilhe o código só com membros; qualquer conta autenticada com o código poderá entrar. Para revogar antes do prazo, a administração pode excluir o convite no banco.
- O Super Admin promove/rebaixa pelo painel Administração. Escolher uma guilda ao promover atribui liderança nessa guilda; rebaixar para Member remove as atribuições de liderança da conta. O cliente não altera `profiles.role` ou `guild_members.role` diretamente e metadados de login nunca concedem cargos.
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


## 6. Banco de Counters de Siege

- Acesse **Siege · Counters** na Sidebar ou pelo atalho no Hub do Clã. Cadastre três monstros de defesa e três de ofensa, sets, main stats, metas, habilidade de líder, SPD de combate mínimo, prazo em ticks e dica de execução. A busca aceita uma defesa parcial, em qualquer ordem, respeitando unidades repetidas.
- Sem nuvem, os cadastros ficam no armazenamento local existente; favoritos, torre SPD e votos são separados pela sessão autenticada (ou pelo dispositivo sem login). “Apagar dados locais” também limpa esses dados. Eles não são uma contagem coletiva da guilda.
- “Copiar para Mim” salva um snapshot em **Meus Teams Favoritos** e confere as unidades exatas e suas runas equipadas no SWEX local. Não envia o inventário ao servidor. Informe sua própria torre SPD; não presumimos que você possui a torre do autor. A checagem respeita cópias distintas, sets, main stats, metas de ficha, SPD de combate, ordem, prazo em ticks e corte por um inimigo de SPD conhecido. Sem equipamento completo ou meta de velocidade, nunca mostra pronto.
- O badge verde indica cumprimento das metas desse modelo; não simula uma batalha completa ou garante vitória. Os ticks seguem o motor existente: instantes globais inteiros, uma ação por tick, empate inimigo conservador. Buffs, passivas e procs não são simulados. Todos os tipos/escopos de líder são exibidos; apenas SPD aplicável entra no cálculo de SPD. Metas de outros atributos usam a ficha.
- Com sessão e guilda ativa, marque **Compartilhar com a guilda ativa** no cadastro. A segunda migration cria `counter_feedback` e `counter_favorites`, RLS e RPCs. Um membro tem uma reação e um resultado por counter e pode alterá-los ou removê-los. A taxa de vitória usa apenas relatos explícitos de vitória/derrota, nunca votos “Free Win”. O autor é obtido da conta autenticada; nomes informados no payload não substituem a autoria na nuvem.
- Favoritos na nuvem são privados e guardam o snapshot real do counter visível. Excluir o original preserva o favorito e remove os votos do original. Membros de outras guildas e usuários anônimos não podem votar, consultar a contagem ou copiar counters sem acesso.
- A migration adiciona `counter_feedback` à publicação `supabase_realtime` quando ela já existe. Confirme no painel **Database → Replication** que essa tabela está habilitada. O cliente assina Postgres Changes, consulta os agregados após eventos/mutações e mantém atualização a cada 30 segundos e ao voltar à janela. Em projetos sem publicação, configure Realtime antes de afirmar atualização instantânea entre dispositivos.
- Ainda **não existe projeto Supabase do proprietário**. SQL/RLS e contratos foram validados localmente; autenticação, notificações Realtime entre dispositivos e aplicação das migrations no servidor continuam pendentes da ativação do projeto.


## 7. Administração, cargos e primeiro Super Admin

1. Aplique as três migrations em ordem. A terceira cria `profiles` e seus triggers, cargos, RLS, auditoria, eventos de uso, parâmetros do motor e moderação. Contas existentes recebem perfil e líderes de guildas já registrados são preservados como `guild_leader`; novos cadastros recebem **sempre `member`**, ignorando qualquer cargo em metadados do usuário.
2. Cadastre a conta **felipe.amaral.matos@gmail.com** no site e confirme o e-mail. No **SQL Editor**, como proprietário do projeto, execute `supabase/bootstrap_admin.sql`. Ele chama `bootstrap_super_admin` para essa conta confirmada. Não execute antes do cadastro/confirmacão: a função exige uma única conta confirmada e não substitui outro Super Admin. A função não tem permissão de execução para usuários `anon` ou `authenticated`; não há promoção por e-mail no JavaScript, localStorage, JWT do cliente ou `VITE_*`.
3. Entre novamente ou use o foco da janela para atualizar o perfil. O ícone **Administração** aparece somente após verificar o cargo no banco. A rota `/#/admin` (e `/admin` em um host com fallback SPA) usa a mesma proteção. Ausência de sessão, cargo desconhecido, erro de verificação ou sessão trocada bloqueiam o painel. O perfil é revisto a cada 30 segundos e ao voltar à janela; o banco verifica cada leitura e operação imediatamente.
4. Super Admin vê os membros de todo o site e as abas **Gestão da Guilda** / **Permissões & Sistema**. Guild Leader vê somente os membros/counters das guildas em que tem a atribuição `guild_members.role='leader'`, além de `profiles.role='guild_leader'`. Um líder em outra guilda não recebe acesso. Listagens são limitadas a 500 membros e 500 sugestões no escopo selecionado.
5. O Super Admin só pode atribuir `guild_leader` ou `member` pelo seletor. A própria conta Super Admin não pode ser rebaixada por esse RPC. Promover sem guilda permite criar uma nova guilda; com guilda selecionada, também registra a liderança nela. Alterações de cargo, parâmetros e moderação ficam na auditoria, exclusiva do Super Admin.

### Revisão de counters

Counters compartilhados entram como **pending**. Antes da aprovação, são visíveis ao autor e aos administradores com escopo; outros membros não podem lê-los, votar ou copiá-los da nuvem. Um administrador pode aprovar, editar ou excluir a sugestão compartilhada; composições privadas ficam fora da moderação. Editar o conteúdo (pelo autor ou pelo moderador) devolve a sugestão à revisão. Escritas diretas de um cliente autenticado não conseguem aprovar a própria sugestão. A moderação verifica `updated_at` para rejeitar alterações concorrentes; atualize o painel antes de tentar novamente. Os favoritos privados já salvos continuam preservados como snapshots.

### Status SWEX, métricas, erros e parâmetros

- O status SWEX é a data da última importação bem-sucedida **enquanto autenticado**, registrada pelo relógio do servidor. Não representa upload/armazenamento do arquivo na nuvem, nem prova de equipamento atual em outro dispositivo. Importações offline não são retroativamente marcadas como feitas hoje. Sem importação registrada, mostra **Pendente**.
- Eventos autenticados registram apenas códigos permitidos (`swex_imported`, `swex_failed`, `optimizer_completed`, `optimizer_failed`) e horário/ID do usuário, com limite de 60 registros por minuto por conta. Não aceitam mensagens de erro livres, tokens ou conteúdo SWEX. Métricas mostram contagens reais desde a ativação, com janela de sete dias para atividade/importações/otimizações/erros; não contam uso offline.
- O controle editável do motor principal é `maintenance_mode`, exclusivo do Super Admin. `default_speed_tick` e `max_teams` permanecem no contrato SQL legado para compatibilidade; não mudam os ticks fixos nem limitam a fila local. O painel não oferece edição desses campos. A fila e a busca local não têm os antigos limites de dez times/cinquenta monstros; continuam exigindo cópias e runas distintas entre os times ativos, e dependem dos recursos do dispositivo. A manutenção pausa novas buscas manuais do otimizador principal. Clientes conectados verificam os parâmetros a cada 30 segundos. Isso não é um serviço de computação remoto.
- A seção **Chaves do sistema** informa a configuração pública e leva ao console Supabase. Chaves privadas/service-role, senhas e segredos de deploy **não são armazenados em tabelas acessíveis ao navegador, retornados por RPC ou editados pelo frontend**. Gerencie-os nos segredos do Supabase/GitHub/provedor de hospedagem.
- O tema é fixo e global: madeira, dourado `#d4af37`, emblema e `/Fundo`. A tela Identidade e os seletores de cor/emblema/nome foram removidos; personalizações antigas no armazenamento local são ignoradas. As ações de privacidade/apagar dados locais ficam em **Dados SWEX**.

Sem `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, o app funciona localmente, sem chamadas ao Supabase e sem painel administrativo. As migrations e o bootstrap ficam preparados para execução posterior. Configuração inválida também mantém o modo local. Com um projeto configurado mas migrations ausentes, o app mostra erro de verificação e não concede cargos por fallback. Nenhuma conta real foi promovida ou banco remoto alterado nesta entrega: o projeto ainda não existe.

## Backup privado opcional da conta

O Portal permite calculadora sem arquivo ou importação completa do SWEX. Depois do login, “Salvar backup privado” envia apenas o inventário normalizado e validado, nunca o JSON bruto, credenciais ou dados sociais. “Carregar minha conta da nuvem” revalida o backup antes de instalar. A tabela `account_snapshots` mantém um snapshot por usuário; RLS permite acesso exclusivamente ao dono, inclusive excluindo líderes e administradores de outras contas. Não há upload automático. Sem variáveis ou login, os fluxos locais continuam funcionando.

A quarta migration deve ser aplicada antes desses botões serem utilizados no projeto real. Os testes executam essa política em PostgreSQL/PGlite; o fluxo do SDK também foi exercitado com HTTP simulado. Cadastro, login e armazenamento no serviço real ainda dependem da configuração do projeto.

## Progressão semanal e pedras de melhoria

Aplique também `supabase/migrations/202610220005_progression_and_crafts.sql`, depois da 004. Ela permite a lista normalizada `crafts` no backup e cria `account_progression`, com PK `(user_id, account_id, week)` e RLS exclusiva do dono. O histórico registra métricas agregadas, não cópias extras do inventário; a semana começa segunda-feira em UTC. Importações e o botão de registro atualizam o snapshot local da semana. Salvar/carregar progressão na nuvem exige ação explícita e login; o backup de inventário continua separado. Apagar dados locais limpa o histórico local, sem excluir registros remotos.

## Equipamento principal e RTA

Aplique `supabase/migrations/202610220006_equipment_pool_backup.sql` após a 005 para permitir `equipmentPools` no backup normalizado. RLS continua exclusiva do proprietário. Os itens físicos de runa são compartilhados pelo jogo, mas as atribuições de equipamento RTA reconhecidas no SWEX ficam separadas em `equipmentPools.rta`; não sobrescrevem `unit.runeIds` principal. Os builders atuais recusam uma busca RTA, em vez de reaproveitar silenciosamente a configuração principal. Travas locais ficam por conta neste dispositivo e não são publicadas nos links/QRs.
