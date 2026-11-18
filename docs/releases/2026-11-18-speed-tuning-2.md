# Integração e publicação — 18/11/2026

Autorização posterior do usuário: “Sempre faça o merge e o deploy”. Registrada como padrão no AGENTS.md, com exceção para instruções explícitas em contrário.

- Main atual consultada:3078c4a. Atualizações oficiais de notícias preservadas.
- Entregas integradas: Speed Tuning2 (`4f804f5`) e Premium Tactical revisão (`d6c087b`). A branch remota divergente de nome antigo não foi sobrescrita.
- Integração preparada na branch local `release/calculator-2-integration`, sem mudar outras worktrees ou seus arquivos locais.
- Único conflito: mapa de deploy de `vercel.json`. Preservadas as entradas das branches de revisão; `main:true`, integração/feature branches:false.
- Verificação do resultado integrado:642/642testes, zero falhas/skips, execução serial101s; build de produção17,82s, apenas aviso conhecido de chunks >500KB.
- Playwright integrado: `premium-navigation`, `premium-siege`, `calculator-v2`, `speed-tuning-2` passaram, incluindo desktop1440/1920, mobile390, Office/War, presets/SWEX e retorno explícito SPD ao otimizador sem equipamentos automáticos.
- Publicação pelo Git integrado do Vercel ao receber a main. O status Vercel do commit de entrega é a evidência do resultado de deploy; não se presume sucesso apenas pelo push.
- Acesso HTTP direto ao domínio publicado bloqueado pelo proxy deste ambiente (403); verificação visual realizada no build local integrado. O conector de internet também não abriu o domínio. Status remoto deve ser consultado pelo GitHub/Vercel.
- Nenhuma migration de produção ou alteração de dados foi executada. O workflow mantém migrations separadas, com disparo explícito opcional; o push na main não as executa.

Uso/limites matemáticos e screenshots: [Speed Tuning2](../SPEED_TUNING_2.md), [Premium Tactical](../reviews/2026-11-18-premium-tactical-v1.md).
