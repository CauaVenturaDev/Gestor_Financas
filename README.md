# Gestor Financeiro Pessoal

Controle de receitas, despesas, investimentos e faturas de cartão, mobile first,
instalável como PWA. Implementa o planejamento técnico do projeto: Next.js
(App Router) + TypeScript + Supabase (Postgres, Auth, RLS), hospedado na Vercel.

## Stack

| Camada | Escolha |
|---|---|
| Front e servidor | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 3, tokens em CSS variables, modo escuro por `prefers-color-scheme` |
| Banco, Auth e RLS | Supabase (Postgres 15+) |
| Escrita de dados | Server Actions sobre o client do Supabase, validadas com zod |
| Hospedagem | Vercel |

## Como o projeto está organizado

```
supabase/
  migrations/      0001..0006, aplicadas em ordem
  tests/           isolamento A x B e critérios de aceite, em SQL
scripts/db-test.sh sobe um Postgres descartável e roda os dois testes
src/
  app/             rotas (App Router)
  components/      UI (bottom sheet, campo de moeda, listas, formulários)
  lib/             dinheiro em centavos, datas em fuso de São Paulo, validação
  server/
    queries.ts     leitura, chamada pelos Server Components
    actions/       escrita, uma Server Action por operação do contrato
```

Decisões que valem conhecer antes de mexer no código:

- **Dinheiro é sempre centavos inteiros (`bigint`).** Nenhum cálculo em float,
  em lugar nenhum. A formatação BRL acontece só na borda da UI.
- **Datas são `date` puro**, sem hora e sem fuso. "Hoje" vem de `today_brt()` no
  servidor e do equivalente no client, para o lançamento não pular de dia à noite.
- **Nenhum saldo é armazenado.** Todos os totais derivam das transações na
  leitura, o que elimina bug de sincronização.
- **Soft delete em tudo**, com trilha em `audit_log` gravada por trigger. A única
  exceção é a exclusão de conta, que apaga fisicamente por LGPD.
- **A RLS é a última barreira, nunca a única.** Toda entrada passa por zod antes.

---

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com/dashboard> e clique em **New project**.
2. Preencha:
   - **Name**: `gestor-financas`
   - **Database Password**: gere uma senha forte e **guarde num gerenciador de
     senhas** — ela não é exibida de novo.
   - **Region**: `South America (São Paulo)` — `sa-east-1`.
3. Aguarde o provisionamento (leva uns dois minutos).

## 2. Aplicar as migrações

No painel do projeto, abra **SQL Editor** e rode os arquivos **na ordem**,
um de cada vez (cole o conteúdo e clique em *Run*):

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `supabase/migrations/0001_schema.sql` | tipos, tabelas e índices |
| 2 | `supabase/migrations/0002_triggers_views.sql` | triggers, auditoria, seed do novo usuário e views |
| 3 | `supabase/migrations/0003_rls.sql` | RLS e policies em todas as tabelas |
| 4 | `supabase/migrations/0004_engines.sql` | motores de recorrência e parcelamento |
| 5 | `supabase/migrations/0005_reports.sql` | agregações dos relatórios |
| 6 | `supabase/migrations/0006_cron.sql` | job diário (opcional, veja o passo 5) |

Rodar a mesma migração duas vezes não quebra nada: todas são idempotentes.

**Se preferir a CLI**, com o [Supabase CLI](https://supabase.com/docs/guides/cli)
instalado:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## 3. Configurar a autenticação

Em **Authentication > Providers > Email**:

- **Enable Email provider**: ligado.
- **Confirm email**: sua escolha.
  - **Desligado** → a pessoa entra direto ao criar a conta (melhor para uso pessoal).
  - **Ligado** → recebe um link de confirmação antes de entrar. O app trata os
    dois casos.
- **Minimum password length**: `8`.

Em **Authentication > URL Configuration**:

- **Site URL**: a URL do app (`http://localhost:3000` em desenvolvimento; depois
  do deploy, o domínio da Vercel).
- **Redirect URLs**: adicione as duas linhas abaixo, uma por vez:
  - `http://localhost:3000/auth/callback`
  - `https://SEU-APP.vercel.app/auth/callback`

> O remetente padrão do Supabase serve só para teste: limite baixo de envio e
> boa chance de cair em spam. Como e-mail de recuperação que não chega deixa a
> pessoa presa fora da conta, configure um remetente dedicado seguindo
> [`docs/email-smtp.md`](docs/email-smtp.md) — tem o caminho com domínio próprio
> (Resend) e o caminho sem domínio (Gmail).

## 4. Pegar as chaves

O caminho curto é o botão **Connect**, no topo do painel: aba **App Frameworks
> Next.js** mostra o bloco pronto para copiar, com os dois valores já nomeados.

Pelo menu, os dois ficam em lugares diferentes:

- **Settings > Data API** → **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Settings > API Keys** → **Publishable key** (`sb_publishable_...`) →
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Projetos mais antigos mostram, no lugar da publishable key, a **anon public**
(um JWT começando com `eyJ`). O app aceita os dois formatos na mesma variável.

A **Secret key** (`sb_secret_...`, ou a antiga `service_role`) **não é usada
pelo app**. Ela ignora a RLS e dá acesso aos dados de todos os usuários, então
nunca deve entrar numa variável `NEXT_PUBLIC_` nem ser publicada.

## 5. Ligar o job diário (opcional, mas recomendado)

O job efetiva os lançamentos previstos que venceram e materializa as ocorrências
recorrentes do mês, mesmo sem ninguém abrir o app.

1. **Database > Extensions** → habilite **`pg_cron`**.
2. Rode `supabase/migrations/0006_cron.sql` de novo no SQL Editor.

Sem o cron o app continua correto: a geração e a efetivação também acontecem sob
demanda, toda vez que um mês é aberto. O cron só cobre quem fica dias sem abrir.

## 6. Rodar localmente

```bash
npm install
cp .env.example .env.local     # preencha com a URL e a anon key do passo 4
npm run dev                    # http://localhost:3000
```

## 7. Publicar na Vercel

1. Entre em <https://vercel.com/new> e importe o repositório
   `CauaVenturaDev/Gestor_Financas`.
2. Framework Preset: **Next.js** (detectado sozinho). Não mude build nem output.
3. Em **Environment Variables**, adicione para *Production*, *Preview* e *Development*:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | a Project URL do passo 4 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a anon public key do passo 4 |

4. **Deploy**.
5. Com o domínio em mãos, volte ao Supabase e ajuste **Site URL** e
   **Redirect URLs** (passo 3) para o endereço da Vercel. Sem isso, o link de
   confirmação e o de recuperação de senha voltam para `localhost`.

Se você usar um domínio próprio, defina também `NEXT_PUBLIC_SITE_URL` com ele.
Sem essa variável o app usa o domínio de produção da Vercel automaticamente.

## Instalar no iPhone

Abra o app no Safari, toque em **Compartilhar** e depois em **Adicionar à Tela de
Início**. Ele abre sem barra de endereço, com ícone e cor de tema próprios. O app
mostra essa dica uma vez e ela pode ser dispensada.

## Testes

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm run build          # build de produção
./scripts/db-test.sh   # Postgres descartável: isolamento A x B + critérios de aceite
```

O `db-test.sh` sobe um Postgres 16 local com um shim mínimo do Supabase
(`supabase/tests/_local_shim.sql`), aplica todas as migrações e roda:

- **`rls_isolation.sql`** — logado como A, tenta ler, inserir, atualizar e
  excluir dados de B em toda tabela. Nada pode passar.
- **`acceptance.sql`** — reproduz o exemplo completo do planejamento com a data
  congelada em 25/03/2026: os oito indicadores de março, o Projetado, a quebra
  do patrimônio, o arredondamento de 2.800,00 em 12x, a fatura, a projeção, a
  quitação antecipada, a importação de compra em andamento, a idempotência da
  recorrência, a reatribuição de categoria, a auditoria e a exclusão de conta.

Os dois rodam dentro de `begin`/`rollback` e não deixam resíduo.

## Aparência

Em **⋮ > Aparência** o app deixa escolher quatro coisas, todas guardadas em
cookie e aplicadas já no servidor — a página nasce com a cor certa em vez de
piscar antes de trocar. O preço é que a escolha vale por aparelho.

| O quê | Opções |
|---|---|
| **Tema** | Sistema, dois claros (Claro e Cinza) e quatro escuros (Escuro, Grafite, Preto puro e Índigo) |
| **Cor** | 11 cores de destaque, cada uma com um par claro/escuro para continuar legível nos dois fundos |
| **Fundo** | Chapado, gradiente, brilho, pontos, linhas e grão — todos usam a cor escolhida |
| **Ícone** | 12 combinações prontas, ou monte com 10 marcas × 4 tratamentos de fundo |

Um tema é só um conjunto de tokens em `src/app/globals.css`; todo componente lê
os tokens, nunca uma cor literal. A cor de destaque não vira CSS: o servidor a
injeta como `--brand-l` e `--brand-d` no `<html>`, e cada tema decide qual das
duas usar. Assim `src/lib/aparencia.ts` é a única fonte da verdade.

### O ícone é gerado, não é arquivo

Guardar um PNG para cada combinação de marca, tratamento e cor seriam centenas
de arquivos. Em vez disso, `/api/icone` desenha o PNG na hora a partir da
geometria em `src/lib/icone-formas.ts` — a mesma que a pré-visualização em SVG
usa, então o que você vê na tela é o que é instalado. A resposta é imutável e
cacheada para sempre, já que a URL descreve a imagem inteira. O manifesto do PWA
também é dinâmico, com as escolhas na query.

**Limite do iOS:** o ícone da tela de início é gravado no momento em que o app é
adicionado. Trocar depois não atualiza o atalho existente — é preciso remover e
adicionar de novo. Na aba do navegador a troca aparece ao recarregar.

## Próximos passos

- [`docs/plano-a-pagar-a-receber.md`](docs/plano-a-pagar-a-receber.md) — plano
  técnico da agenda de compromissos, com lembrete por e-mail e adiamento.

## O que está fora do MVP

Multi-moeda, múltiplas contas bancárias, importação OFX/CSV, rendimento de
investimentos, metas e orçamento, notificações, anexos, recorrência semanal ou
anual, aporte recorrente, edição offline, e o espelhamento automático da fatura
do cartão como despesa na Aba 1 — esse último está previsto como ação opcional
para a fase 2.
