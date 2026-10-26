# Portal de recepção

O início (`/` ou `#/portal`) ocupa a altura da janela, com cenário de castelo,
vidro fosco, névoa, partículas e balão de boas-vindas. O portal não inclui a barra
lateral, o cabeçalho de edição ou o tour. A Calculadora Livre abre diretamente,
sem autenticação ou arquivo. Em telas muito baixas, o conteúdo do card pode rolar
internamente para manter os campos acessíveis; o documento continua sem rolagem.

## Layout e guia

O portal usa três colunas com Ciri, comandos e cupons. A guia é agora um PNG
local com transparência real (`/art/portal-ciri.png`), gerado para esta interface.
A miniatura externa e a configuração `VITE_PORTAL_GUIDE_URL` foram removidas.
A marca e o cenário locais foram preservados. Detalhes de responsividade,
origem da arte e atualização automática dos cupons: [PORTAL.md](PORTAL.md).

## Upload e invocação

Um upload válido iniciado no portal inicia um relógio monotônico de 20.000 ms,
com `setTimeout` encadeado. A barra vai de 0 a 100%; os textos mudam nas etapas de
0, 5, 9, 13 e 17 segundos. O último texto permanece até a conclusão.

O Web Worker continua lendo e normalizando o SWEX, enquanto a preparação dos
presets cede tempo à interface em blocos assíncronos. O inventário completo só
é instalado e o Dashboard aberto depois de **ambas** as condições:

- o relógio visual completou os 20 segundos;
- todos os dados reais e os times da conta estão prontos.

Se o processamento de uma conta muito grande superar 20 segundos, a tela aguarda
os dados, em vez de abrir um Dashboard incompleto. O overlay permanece durante
o commit do React e a primeira pintura da Central. Erros de arquivo encerram a
sequência, preservam os dados anteriores e permitem tentar novamente. Uploads
iniciados nas outras áreas mantêm o progresso real, sem o atraso cinematográfico.

## Login e dados locais

O formulário inline usa `signInWithPassword` e `signUp` do Supabase, mantendo o
usuário no portal. Cadastros que exigem confirmação exibem a orientação por e-mail.
Senhas não são copiadas para o estado global ou para o inventário.

Sem login, o JSON habilita as áreas locais da conta: Siege, Arena, PvE, RTA,
inventário, builds e otimizador. Compartilhamento da guilda e administração
conservam as verificações de autenticação e de cargo existentes no backend.

Com login, novos uploads usam o backup privado normalizado. Se o usuário optar
por entrar na nuvem com um inventário local já aberto, esse inventário é salvo
sem ser sobrescrito por uma restauração mais antiga. Entrar ou restaurar um
backup não força a saída do portal; o usuário escolhe continuar para o Dashboard.
