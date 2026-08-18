# Plano técnico: Agenda de compromissos (A Pagar e A Receber)

Proposta de implementação da aba de compromissos com lembrete por e-mail e
adiamento. Segue a numeração de regras de negócio do planejamento original, que
parou na RN25.

---

## 1. O problema e por que não é o que já existe

O pedido é uma lista de contas fixas que **precisam ser lembradas**, não uma
projeção de caixa. A diferença importa porque o app já tem duas coisas parecidas,
e sem uma fronteira clara os três recursos viram um só, confuso:

| Recurso | O que é | Entra nos totais? |
|---|---|---|
| **Recorrência** (existe) | regra que **gera lançamento** todo mês e se efetiva sozinha quando a data chega | sim, vira dinheiro que saiu |
| **Previsto** (existe) | lançamento com data futura, já registrado | no Projetado, não no Realizado |
| **Compromisso** (novo) | lembrete de algo que **você precisa fazer acontecer** | não, é agenda |

A regra de bolso para o usuário, que vai virar texto na tela:

> Use **recorrência** quando o dinheiro sai sozinho — débito automático, salário
> que cai. Use **A Pagar** quando **você** precisa agir: o boleto que alguém te
> manda, o aluguel que você transfere na mão, a mensalidade que some se você
> esquecer.

Por isso o compromisso **não entra em nenhum total da Aba 1**. Ele aparece lá
como linha informativa, do mesmo jeito que "comprometido no cartão" (RN21).

### Dentro do escopo

- Compromissos de dois tipos: **a pagar** e **a receber**.
- Frequência **única** (uma data) ou **mensal** (dia fixo, com o mesmo clamp de
  fim de mês da RN11).
- Visão de **calendário** do mês, com os dias marcados, mais a lista do dia.
- Marcar como **pago** / **recebido**, e desfazer.
- **Adiar**: escolher quanto tempo depois receber o mesmo aviso de novo.
- **Aviso por e-mail**: com antecedência configurável, no dia do vencimento e a
  cada adiamento.
- Opcional por compromisso: **lançar na Aba 1 ao liquidar**, criando a despesa
  ou receita de verdade, com vínculo para não haver contagem dupla.

### Fora do escopo desta entrega

- Notificação push (o Safari em PWA no iOS não entrega, premissa 4.3) e SMS.
- Anexar boleto ou comprovante.
- Pagamento de verdade, código de barras, Pix, integração bancária.
- Compromisso compartilhado entre usuários.
- Agir direto do e-mail (marcar como pago pelo link). Fica como fase 2 da
  feature, porque exige link assinado com token — detalhe na seção 9.

---

## 2. Modelo de dados

Duas tabelas novas, mais uma de registro de envio. O desenho espelha o par
`recurrences` → `transactions` que já funciona: uma **regra** e as
**ocorrências** que ela materializa, com a mesma trava de idempotência.

```
profiles 1:N commitments 1:N commitment_occurrences 1:N commitment_notifications
commitments N:1 categories        (opcional, mesma FK composta da RN)
commitment_occurrences 0:1 transactions   (só quando o usuário pede o lançamento)
```

### DDL

```sql
create type commitment_kind_t   as enum ('a_pagar', 'a_receber');
create type commitment_freq_t   as enum ('unica', 'mensal');
create type commitment_status_t as enum ('pendente', 'liquidado', 'cancelado');

-- ------------------------------------------------------------------ a regra
create table commitments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references profiles (id) on delete cascade,
  kind               commitment_kind_t not null,
  name               text not null check (char_length(name) between 1 and 120),
  note               text,
  category_id        uuid,
  category_nature    nature_t,
  amount_cents       bigint check (amount_cents is null or amount_cents > 0), -- null = variável
  frequency          commitment_freq_t not null default 'mensal',
  day_of_month       smallint check (day_of_month between 1 and 31),
  start_date         date not null,
  end_date           date check (end_date >= start_date),
  status             rec_status_t not null default 'ativa',   -- reaproveita ativa/pausada/encerrada

  -- aviso
  notify_email       boolean  not null default true,
  notify_days_before smallint not null default 1 check (notify_days_before between 0 and 30),
  notify_time        time     not null default '09:00',

  -- ao liquidar, cria o lançamento correspondente na Aba 1
  creates_transaction boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  foreign key (category_id, category_nature) references categories (id, nature),
  check ((category_id is null) = (category_nature is null)),
  check ((frequency = 'mensal') = (day_of_month is not null)),
  check (category_id is null or category_nature =
         (case kind when 'a_pagar' then 'despesa' else 'receita' end)::nature_t)
);
create index commitments_user on commitments (user_id) where deleted_at is null;

-- ------------------------------------------------------------- as ocorrências
create table commitment_occurrences (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade, -- herdado por trigger
  commitment_id  uuid not null references commitments (id) on delete cascade,
  occurrence_ym  date,                       -- primeiro dia do mês; null quando frequência única
  due_date       date not null,
  amount_cents   bigint check (amount_cents is null or amount_cents > 0),
  status         commitment_status_t not null default 'pendente',
  settled_at     date,                       -- pago ou recebido em
  transaction_id uuid references transactions (id),
  snoozed_until  timestamptz,                -- adiado até (RN31)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((status = 'liquidado') = (settled_at is not null))
);

-- Idempotência da geração, mesma ideia da RN12: sem filtro de deleted_at, para
-- ocorrência excluída continuar ocupando o mês e o motor não a recriar.
create unique index co_occurrence_uniq
  on commitment_occurrences (commitment_id, occurrence_ym)
  where occurrence_ym is not null;

create unique index co_transaction_uniq
  on commitment_occurrences (transaction_id) where transaction_id is not null;

create index co_user_due     on commitment_occurrences (user_id, due_date) where deleted_at is null;
create index co_user_pending on commitment_occurrences (user_id, due_date)
  where status = 'pendente' and deleted_at is null;
-- o notificador varre por esta:
create index co_pending_due  on commitment_occurrences (due_date)
  where status = 'pendente' and deleted_at is null;

-- ------------------------------------------------- registro de envio de e-mail
create table commitment_notifications (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles (id) on delete cascade,
  occurrence_id uuid not null references commitment_occurrences (id) on delete cascade,
  reason        text not null check (reason in ('antecedencia', 'vencimento', 'adiamento')),
  sent_at       timestamptz not null default now(),
  provider_id   text                    -- id da mensagem no provedor, para rastrear bounce
);
-- antecedência e vencimento saem uma única vez por ocorrência; adiamento repete
create unique index cn_once
  on commitment_notifications (occurrence_id, reason)
  where reason in ('antecedencia', 'vencimento');
create index cn_occurrence on commitment_notifications (occurrence_id);
```

### Por que assim

- **Tabelas próprias, não uma coluna em `transactions`.** Compromisso não é
  lançamento: se ele morasse em `transactions`, toda consulta de total passaria a
  precisar de um filtro a mais, e a chance de um dia alguém esquecer o filtro e
  inflar o lucro do usuário é alta demais para o benefício.
- **`user_id` desnormalizado na ocorrência**, igual a `card_installments`, para a
  policy de RLS ficar O(1), sem join.
- **`snoozed_until` como `timestamptz`, não `date`.** Adiar "3 horas" precisa de
  hora; é o único ponto do sistema onde a hora importa, e ela é de agendamento,
  não de competência — a RN23 continua valendo para tudo que é dinheiro.
- **Registro de envio em tabela filha**, não em colunas de flag. Dá a trilha do
  que foi mandado e quando, que é o que se olha quando alguém diz "não recebi".

---

## 3. Isolamento por usuário

Mesmo padrão das outras tabelas, sem exceção: RLS habilitada, `user_id` com
`default auth.uid()`, uma policy por operação, `with check` em insert e update.

`commitment_notifications` é escrita só pelo job de notificação, que roda com a
service role. Para `authenticated`, apenas `select` da própria linha — o usuário
poder conferir "quando você me avisou disso" tem valor e não expõe nada.

O teste de isolamento A x B em `supabase/tests/rls_isolation.sql` ganha as três
tabelas novas na varredura. Sem isso o teste passa a dar uma garantia menor do
que aparenta.

---

## 4. Regras de negócio

**RN26. Compromisso não é dinheiro que se moveu.** Nenhuma ocorrência entra em
receitas, despesas, lucro, saldo do mês, saldo acumulado ou patrimônio. A Aba 1
ganha duas linhas informativas no resumo, fora dos totais, ao lado de
"comprometido no cartão": **a pagar no mês** e **a receber no mês**.

**RN27. Liquidar é registro de agenda, não de caixa.** Marcar como pago ou
recebido move o status para `liquidado` e grava `settled_at`. Por padrão, nada
acontece na Aba 1.

**RN28. Lançamento vinculado, quando pedido.** Se o compromisso tem
`creates_transaction = true`, liquidar cria também o lançamento correspondente
(despesa para *a pagar*, receita para *a receber*), efetivado na data da
liquidação, e guarda o `transaction_id` na ocorrência. Desfazer a liquidação faz
soft delete desse lançamento. O índice único em `transaction_id` garante que uma
ocorrência nunca gere dois lançamentos — é a trava contra contagem dupla.

**RN29. Geração mensal.** Igual à RN11: a ocorrência do mês vence em
`min(day_of_month, último dia do mês)`, entre `start_date` e `end_date`. Regra
pausada não gera. Frequência única cria exatamente uma ocorrência, no cadastro.

**RN30. Idempotência.** Índice único `(commitment_id, occurrence_ym)` mais
`on conflict do nothing`, exatamente como a RN12. Excluir a ocorrência de um mês
não faz o motor recriá-la.

**RN31. Adiamento.** O usuário escolhe um intervalo (3 h, 12 h, 1 dia, 3 dias,
1 semana, ou personalizado em horas ou dias). Isso grava
`snoozed_until = now() + intervalo`. Quando o horário chega, o aviso é reenviado
e `snoozed_until` volta a nulo — o adiamento se consome, então nunca dispara duas
vezes. Adiar **não muda a data de vencimento**: o compromisso continua atrasado
se estiver atrasado. Adiar é sobre o lembrete, não sobre a dívida.

**RN32. Momentos de aviso.** Três, e só três:

| Aviso | Quando | Repete? |
|---|---|---|
| Antecedência | `due_date − notify_days_before`, às `notify_time` | uma vez |
| Vencimento | no dia do vencimento, às `notify_time`, só se `notify_days_before > 0` | uma vez |
| Adiamento | no `snoozed_until` | uma vez por adiamento |

Os dois primeiros são únicos por índice; o terceiro se consome. O objetivo é que
o app **nunca** mande o mesmo aviso duas vezes: e-mail repetido faz o usuário
filtrar o remetente, e aí ele para de receber o que importa.

**RN33. Nada de aviso para o que já passou.** Só ocorrências `pendente` e não
excluídas geram e-mail. Liquidar ou cancelar antes da hora do aviso cancela o
envio. Ocorrência com mais de 90 dias de atraso sai da varredura: se passou disso,
o e-mail não é mais o canal certo.

**RN34. Fuso do aviso.** O horário é o horário do usuário, lido de
`profiles.timezone`. O job roda a cada 15 minutos e compara o momento do alerta,
convertido a partir desse fuso, com o `now()`.

**RN35. Status derivado por data.** Ocorrência pendente com `due_date` no passado
é **atrasada**; no dia, é **vence hoje**; adiante, **em aberto**. Nada é gravado,
nada precisa de job — mesma escolha da RN17 nos cartões.

**RN36. Valor variável.** Compromisso sem valor definido é permitido (conta de
luz, por exemplo). Ele aparece na agenda sem valor, não soma nos totais
informativos, e liquidar pede o valor se `creates_transaction` estiver ligado.

---

## 5. Motores

### 5.1 Geração de ocorrências

Reaproveita a estrutura de `generate_occurrences`, que já é reexecutável:

```
gerar_compromissos(user, M):
  para cada regra ativa c do user, mensal,
      com start_date <= fim(M) e (end_date nulo ou end_date >= inicio(M)):
    venc = data(ano(M), mes(M), min(c.day_of_month, ultimo_dia(M)))
    se venc entre c.start_date e c.end_date:
      insert commitment_occurrences (..., due_date = venc, occurrence_ym = inicio(M))
      on conflict (commitment_id, occurrence_ym) do nothing
```

Dois caminhos, como na recorrência: sob demanda ao abrir um mês na agenda (garante
M e M+1, teto de 12 meses) e no `process_daily()` já existente, que passa a
materializar também os compromissos. Se o cron cair, a tela continua certa.

### 5.2 Notificador

Roda a cada 15 minutos. Fluxo:

```
1. pg_cron dispara.
2. pg_net faz POST em /api/cron/lembretes, com o segredo no header.
3. A rota valida o segredo e busca as pendências (service role).
4. Para cada pendência:
   a. insere a linha em commitment_notifications  -- on conflict do nothing
   b. se inseriu (ninguém tinha mandado ainda), envia o e-mail
   c. grava o provider_id devolvido
   d. se o motivo era adiamento, zera snoozed_until
5. Devolve um resumo: quantos avisos, quantas falhas.
```

O passo 4a **antes** do envio é de propósito: se o processo morrer no meio, o
pior caso é um aviso que não saiu, e não um aviso que saiu duas vezes. Para um
lembrete, silêncio ocasional incomoda menos que repetição.

A consulta de pendências:

```sql
select o.*, c.name, c.kind, c.notify_time, c.notify_days_before,
       p.timezone, u.email
  from commitment_occurrences o
  join commitments c on c.id = o.commitment_id and c.deleted_at is null
  join profiles p    on p.id = o.user_id
  join auth.users u  on u.id = o.user_id
 where o.deleted_at is null
   and o.status = 'pendente'
   and c.notify_email
   and c.status = 'ativa'
   and o.due_date between public.today_brt() - interval '90 days'   -- RN33
                       and public.today_brt() + interval '31 days'
   and (
     -- adiamento vencido
     (o.snoozed_until is not null and o.snoozed_until <= now())
     -- ou o momento do alerta já passou e ainda não houve envio desse motivo
     or (o.snoozed_until is null and momento_do_alerta(o, c, p.timezone) <= now())
   );
```

A janela de 31 dias à frente mais 90 dias atrás mantém a varredura pequena, e o
índice parcial `co_pending_due` cobre o filtro. Na escala da premissa 1 do
planejamento (até 1.000 usuários), isso é irrelevante em custo.

### 5.3 O e-mail

Assunto direto, porque ele é lido na notificação do celular sem abrir:

> **Vence amanhã: Aluguel — R$ 1.800,00**
> **Atrasado há 3 dias: Internet — R$ 120,00**
> **A receber hoje: Freela do site — R$ 2.400,00**

Corpo curto: nome, valor, vencimento, quantos dias faltam ou passaram, e um
botão que abre o app direto no item. Rodapé com um link para desligar o aviso
daquele compromisso.

---

## 6. Telas e navegação

### Estrutura

**Decidido.** A Agenda ganha aba própria na barra inferior, que fica com quatro:
Lançamentos, Relatório, Faturas e **Agenda**. Dentro da Agenda, o alternador
**A Pagar | A Receber**, no mesmo padrão do Realizado/Projetado.

A pilha de quatro abas deixa cada alvo com cerca de 93 px no iPhone SE, acima do
mínimo de 44 pt, mas os rótulos passam a precisar de corte: eles já são truncados
e a fonte da barra está em 11 px. Se um quinto item aparecer um dia, a barra não
comporta e vira um menu.

```
/app/agenda                   (calendário do mês, padrão: A Pagar)
/app/agenda?tipo=a_receber
/app/agenda/novo
/app/agenda/[id]              (detalhe do compromisso e histórico de ocorrências)
```

### Calendário

Grade de 7 colunas com os dias do mês. Cada dia com compromisso ganha um ponto:
vermelho para *a pagar* pendente, âmbar para atrasado, verde para *a receber*,
cinza quando tudo do dia já foi liquidado. Tocar num dia filtra a lista abaixo;
tocar de novo limpa.

Em 375 px cada célula fica com cerca de 48 px, acima do alvo mínimo de 44 pt. O
cabeçalho com o mês e os totais fica `sticky`, como nas outras telas.

### Lista

Abaixo do calendário, os itens do mês (ou do dia selecionado): nome, valor,
vencimento, selo de status. Ação primária direta no item — **Pagar** ou
**Receber** — e menu de três pontos com **Adiar**, **Editar**, **Excluir**.

Adiar abre um painel com as opções de intervalo e uma linha de texto que diz
exatamente o que vai acontecer: *"Você recebe outro e-mail em 3 de setembro às
09:00. A data de vencimento não muda."*

### Formulário

Nome, valor (ou "valor muda todo mês"), tipo (a pagar / a receber — aqui o campo
existe, porque o calendário mostra os dois juntos), frequência única ou mensal,
dia do vencimento, início e fim, categoria opcional, observação.

Bloco de aviso: ligar/desligar e-mail, quantos dias antes, horário.

Bloco opcional, recolhido por padrão: "lançar automaticamente na aba
Movimentações quando eu marcar como pago", com uma frase explicando que sem isso
o compromisso não mexe em nenhum total.

---

## 7. Contrato da camada de dados

```ts
// Mesmas convenções: centavos, ym = "YYYY-MM", datas = "YYYY-MM-DD".

type Compromisso = {
  id: string; kind: 'a_pagar' | 'a_receber'; name: string
  amountCents: number | null; frequency: 'unica' | 'mensal'
  dayOfMonth: number | null; startDate: string; endDate: string | null
  status: 'ativa' | 'pausada' | 'encerrada'
  notifyEmail: boolean; notifyDaysBefore: number; notifyTime: string
  createsTransaction: boolean
}

type Ocorrencia = {
  id: string; commitmentId: string; name: string
  kind: 'a_pagar' | 'a_receber'; dueDate: string
  amountCents: number | null
  status: 'pendente' | 'liquidado' | 'cancelado'
  situacao: 'em_aberto' | 'vence_hoje' | 'atrasada' | 'liquidada'  // derivada (RN35)
  settledAt: string | null; snoozedUntil: string | null
  transactionId: string | null
}

getAgendaMonth({ ym, kind? }):
  { dias: { date: string; aPagar: number; aReceber: number; atrasados: number }[]
    itens: Ocorrencia[]
    totais: { aPagarCents: number; aReceberCents: number; atrasadasCents: number } }

createCommitment({ ... }): { compromisso: Compromisso; geradas: number }
updateCommitment({ id, patch })       // escopo "esta e futuras", igual à RN13
pauseCommitment({ id }) / resumeCommitment({ id }) / deleteCommitment({ id })

settleOccurrence({ id, date, amountCents? }): Ocorrencia   // RN27, RN28
unsettleOccurrence({ id }): Ocorrencia
snoozeOccurrence({ id, horas }): Ocorrencia                // RN31
cancelOccurrence({ id }): void
updateOccurrence({ id, patch })                            // valor ou data desta só

// interno, não exposto ao client
POST /api/cron/lembretes   -> { enviados: number; falhas: number }
```

---

## 8. Infraestrutura de e-mail e agendamento

O app hoje não usa a service role em lugar nenhum. Isso muda **apenas aqui**, e
de um jeito que já estava previsto na seção 3 do planejamento original: *"a
service role fica restrita ao cron e a rotinas de servidor, nunca chega ao
client"*.

| Peça | Escolha | Por quê |
|---|---|---|
| Envio | **Resend**, via API HTTP | o mesmo provedor do SMTP de auth (`docs/email-smtp.md`), então é uma conta só e um domínio só |
| Agendamento | **pg_cron a cada 15 min**, chamando a rota com `pg_net` | a Vercel no plano Hobby só permite cron uma vez por dia, o que não serve para adiamento em horas |
| Segredo | header `x-cron-secret`, guardado no **Supabase Vault** | evita deixar o segredo no texto do agendamento |
| Chave da service role | env var **sem** `NEXT_PUBLIC_` | nunca vai no bundle do navegador |

Variáveis novas na Vercel:

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...     # só no servidor
RESEND_API_KEY=re_...
CRON_SECRET=<string aleatória longa>
```

Alternativa avaliada e descartada: mandar o e-mail direto do Postgres, com
`pg_net` batendo na API do Resend. Elimina a rota e a service role, mas coloca o
template de e-mail dentro de uma função PL/pgSQL, onde ele é ruim de escrever, de
testar e de mudar. Como o e-mail é a parte que mais vai ser ajustada, ele deve
ficar onde é fácil mexer.

---

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| E-mail duplicado | usuário filtra o remetente e perde os avisos que importam | registro de envio gravado antes do envio, único por (ocorrência, motivo); adiamento se consome |
| Cron parado sem ninguém notar | compromisso vence em silêncio | a rota devolve um resumo; a tela da Agenda mostra "último aviso enviado em ..." e alerta se passou de 24 h |
| Hora do aviso no fuso errado | e-mail às 3 da manhã | horário calculado a partir de `profiles.timezone`, com teste na virada do dia |
| Compromisso confundido com recorrência | lançamento em duplicidade | copy explícita nas duas telas; RN26 mantendo compromisso fora de todo total; vínculo único quando gera lançamento |
| Liquidação em duplicidade | despesa contada duas vezes | índice único em `transaction_id` |
| Volume de e-mail acima do plano gratuito | aviso deixa de sair | limite de envio por usuário por dia, e o resumo do job registra o corte em vez de falhar em silêncio |
| Rota de cron exposta | qualquer um dispara o envio | segredo obrigatório no header, resposta 404 sem ele, e o job é idempotente de qualquer forma |
| Ação direta pelo e-mail (fase 2) | link que marca como pago é um link que qualquer um que veja o e-mail aciona | token assinado, de uso único e com validade curta; por isso não está nesta entrega |

---

## 10. Critérios de aceite

**Agenda e calendário**
- Dado um compromisso mensal com dia 10, quando abro a agenda de qualquer mês, então existe exatamente uma ocorrência, vencendo em 10.
- Dado um compromisso com dia 31 em mês de 30 dias, então a ocorrência vence no último dia do mês.
- Dado o motor rodando duas vezes no mesmo dia, então nenhuma ocorrência duplica.
- Dado um dia com compromisso, então o calendário marca esse dia, e tocar nele filtra a lista.
- Dada uma ocorrência com vencimento no passado e ainda pendente, então ela aparece como atrasada, sem nenhuma edição.

**Totais**
- Dado qualquer compromisso pendente ou liquidado, então receitas, despesas, lucro, saldo do mês, saldo acumulado e patrimônio não mudam.
- Dado um compromisso a pagar no mês, então a Aba 1 mostra a linha informativa "a pagar no mês" com o valor, fora dos totais.

**Liquidação**
- Dado marcar como pago um compromisso sem lançamento automático, então nada é criado na Aba 1.
- Dado marcar como pago um compromisso com lançamento automático, então nasce uma despesa efetivada na data informada, vinculada à ocorrência.
- Dado desfazer essa liquidação, então a despesa criada é excluída e os totais voltam ao que eram.
- Dado marcar como pago duas vezes em sequência, então existe no máximo um lançamento vinculado.

**Aviso e adiamento**
- Dado um compromisso com 1 dia de antecedência e horário 09:00, então o e-mail sai uma única vez, na véspera, às 09:00 no fuso do usuário.
- Dado o job rodando quatro vezes na mesma hora, então o e-mail sai uma única vez.
- Dado liquidar antes do horário do aviso, então nenhum e-mail é enviado.
- Dado adiar por 3 horas, então um novo e-mail sai três horas depois, o vencimento não muda e o compromisso segue atrasado se já estava.
- Dado adiar duas vezes, então saem dois e-mails, um por adiamento, e nenhum a mais.
- Dado desligar o aviso do compromisso, então nenhum e-mail sai e o compromisso continua na agenda.

**Isolamento**
- Dado o usuário A logado, quando tenta ler, inserir, atualizar ou excluir compromissos, ocorrências ou registros de envio de B, então nada passa.

---

## 11. Fases

| Fase | Conteúdo | Critério de saída |
|---|---|---|
| **G0** | Migração com as três tabelas, RLS, motor de geração, testes de isolamento e de idempotência | teste A x B verde com as tabelas novas; motor idempotente |
| **G1** | Aba Agenda: calendário, lista, formulário, liquidar, desfazer, editar, excluir | dá para usar a agenda inteira sem e-mail nenhum |
| **G2** | Resend, rota de cron, agendamento, adiamento, tela de "último aviso" | e-mail sai uma vez, adiamento funciona, nada duplica |
| **G3** | Linha informativa na Aba 1, lançamento vinculado ao liquidar, copy de diferenciação com recorrência | critérios de aceite todos verdes |

G1 entrega valor sozinha: mesmo sem e-mail, a agenda já responde "o que eu tenho
que pagar esse mês". Vale subir para produção antes de G2 ficar pronta.

---

## 12. O que preciso de você antes de começar

1. ~~Três abas ou quatro?~~ **Decidido: quatro**, com a Agenda ganhando aba
   própria na barra inferior.
2. **Conta no Resend.** É pré-requisito de G2 e a mesma conta serve para os
   e-mails de recuperação de senha. Se você não tem domínio próprio, o caminho do
   Gmail em `docs/email-smtp.md` funciona para auth, mas **não** para os avisos:
   o envio em volume pela conta pessoal é um bom jeito de ser marcado como spam.
   Nesse caso, vale registrar um domínio barato só para isso.
3. **Lançamento automático ligado ou desligado por padrão?** Minha proposta é
   desligado, porque ligado por engano infla as despesas e o usuário demora a
   entender de onde veio. Ligar é uma caixinha no formulário.
