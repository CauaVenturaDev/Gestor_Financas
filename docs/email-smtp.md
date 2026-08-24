# E-mail de recuperação de senha: SMTP dedicado

O Supabase já envia os e-mails de confirmação e de recuperação sem nenhuma
configuração, mas esse remetente embutido serve só para teste:

- o limite de envio é baixo (poucos e-mails por hora no plano free) e, ao
  estourar, o envio simplesmente falha;
- o remetente é um domínio compartilhado do Supabase, então uma parte das
  mensagens cai em spam;
- não há relatório de entrega, então um e-mail que não chegou some sem aviso.

Para um app de finanças isso é um problema concreto: **e-mail de recuperação que
não chega deixa a pessoa presa fora da própria conta**, sem outro caminho de
volta. Este guia configura um remetente dedicado.

Escolha um dos dois caminhos abaixo. Os dois terminam na mesma tela do Supabase.

---

## Caminho A — Resend (recomendado, exige um domínio próprio)

Entrega melhor, tem painel de bounce e escala sem susto. O plano gratuito cobre
3.000 e-mails por mês, muito acima do que este app precisa.

1. Crie a conta em <https://resend.com>.
2. **Domains → Add Domain** e informe seu domínio (ex.: `seudominio.com.br`).
3. O Resend mostra os registros DNS a criar (SPF, DKIM e, opcionalmente, DMARC).
   Cadastre-os no painel de DNS de onde o domínio está registrado e clique em
   **Verify**. A propagação costuma levar de minutos a algumas horas.
4. **API Keys → Create API Key**, permissão *Sending access*. Copie a chave
   (`re_...`) — ela só aparece uma vez.
5. Os dados de SMTP do Resend são fixos:

   | Campo | Valor |
   |---|---|
   | Host | `smtp.resend.com` |
   | Porta | `465` |
   | Usuário | `resend` |
   | Senha | a API key `re_...` do passo 4 |

> **Sem domínio próprio?** O Resend deixa usar `onboarding@resend.dev` como
> remetente de teste, mas ele só entrega para o e-mail dono da conta. Para um app
> com mais de uma pessoa, isso não serve — use o Caminho B.

---

## Caminho B — Gmail (sem domínio, bom para uso pessoal)

Se o app é só seu, o SMTP do Gmail resolve e não precisa de domínio nenhum.
O limite é de cerca de 500 mensagens por dia, folgado para recuperação de senha.

1. Na Conta Google, ative a **verificação em duas etapas** (obrigatório para o
   passo seguinte): <https://myaccount.google.com/security>.
2. Gere uma **senha de app** em <https://myaccount.google.com/apppasswords>.
   Escolha "Outro" e dê um nome como `Gestor Financeiro`. Copie os 16 caracteres.
3. Use estes dados:

   | Campo | Valor |
   |---|---|
   | Host | `smtp.gmail.com` |
   | Porta | `465` |
   | Usuário | seu endereço `@gmail.com` completo |
   | Senha | a senha de app de 16 caracteres (não a senha da conta) |

O remetente precisa ser o mesmo endereço do usuário — o Gmail recusa enviar em
nome de outro.

---

## Configurar no Supabase

1. No painel do projeto, vá em **Project Settings → Authentication → SMTP Settings**.
2. Ligue **Enable Custom SMTP**.
3. Preencha:
   - **Sender email**: `nao-responda@seudominio.com.br` (Caminho A) ou seu
     endereço do Gmail (Caminho B).
   - **Sender name**: `Gestor Financeiro`.
   - **Host**, **Port**, **Username** e **Password**: os valores da tabela do
     caminho escolhido.
4. **Save**.
5. Vá em **Authentication → Rate Limits** e suba o limite de e-mails por hora.
   Com o remetente embutido ele fica travado baixo; com SMTP próprio dá para
   usar algo como 30 por hora, que já é bastante para este app.

## Conferir os templates

Em **Authentication → Email Templates**, confira que os templates de
**Confirm signup** e **Reset password** usam `{{ .ConfirmationURL }}`. É o padrão
e é o que o app espera: a rota `/auth/callback` troca o código do link por uma
sessão em cookie httpOnly.

O app também aceita o formato alternativo, com `{{ .TokenHash }}` e `{{ .Type }}`
na query string, caso você prefira montar o link à mão:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
```

## Pré-requisito que costuma passar batido

Em **Authentication → URL Configuration**, o **Site URL** precisa ser o domínio
de produção e as **Redirect URLs** precisam conter `/auth/callback` desse mesmo
domínio. Se ficar apontando para `localhost`, o e-mail chega, mas o link leva a
lugar nenhum:

- Site URL: `https://gestor-financas-pi.vercel.app`
- Redirect URLs: `https://gestor-financas-pi.vercel.app/auth/callback`
  (mantenha também `http://localhost:3000/auth/callback` para desenvolvimento)

## Testar

1. Abra `/recuperar-senha` no app em produção.
2. Informe o e-mail de uma conta existente e envie.
3. O e-mail deve chegar em segundos, com o remetente que você configurou.
4. Abra o link: ele leva para `/redefinir-senha` já com a sessão ativa.
5. Troque a senha. As outras sessões abertas caem — é o comportamento esperado.

Se não chegar, olhe nesta ordem:

- **Resend → Logs** ou a caixa de enviados do Gmail: se o envio nem aparece, o
  problema é a configuração de SMTP no Supabase.
- **Authentication → Logs** no Supabase: mostra erro de autenticação de SMTP.
- Spam do destinatário: no Caminho A, indica DNS ainda não propagado ou faltando
  DMARC.

## Monitorar bounce

No Resend, **Webhooks** permite receber `email.bounced` e `email.complained`.
Não é necessário para o MVP, mas é o que evita descobrir tarde demais que um
endereço parou de receber.
