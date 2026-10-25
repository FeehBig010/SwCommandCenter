# Portal de recepção

O início (`/` ou `#/portal`) ocupa a altura da janela, com cenário de castelo,
vidro fosco, névoa, partículas e balão de boas-vindas. O portal não inclui a barra
lateral, o cabeçalho de edição ou o tour. A Calculadora Livre abre diretamente,
sem autenticação ou arquivo. Em telas muito baixas, o conteúdo do card pode rolar
internamente para manter os campos acessíveis; o documento continua sem rolagem.

## Imagem escolhida

A guia usa o endereço fornecido pelo usuário:

`https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtpF2QVfUo70CMtAanBrwQUlsOgO1Fn_vm4JUCEoBT8-cJWMCsZi5lePQ&s=10`

O arquivo é carregado diretamente pelo navegador, sem enviar o inventário ao
servidor de imagens. `VITE_PORTAL_GUIDE_URL` permite substituí-lo por um arquivo
local em `public/` ou outra URL de imagem durante o build. Se a imagem falhar,
o emblema local da guilda mantém a composição sem imagem quebrada. A aparência da
miniatura remota não pôde ser inspecionada no ambiente de desenvolvimento, cuja
política de rede bloqueia esse domínio.

## Upload e invocação

Um upload válido iniciado no portal inicia um relógio monotônico de 15.000 ms,
com `setTimeout` encadeado. A barra vai de 1 a 100%; os textos mudam nas etapas de
0, 3, 6 e 9 segundos. O último texto permanece até a conclusão.

O Web Worker continua lendo e normalizando o SWEX, enquanto a preparação dos
presets cede tempo à interface em blocos assíncronos. O inventário completo só
é instalado e o Dashboard aberto depois de **ambas** as condições:

- o relógio visual completou os 15 segundos;
- todos os dados reais e os times da conta estão prontos.

Se o processamento de uma conta muito grande superar 15 segundos, a tela aguarda
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
