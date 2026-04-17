# Caderno de Testes Manuais — Módulo Funcionários

**Versão:** 1.0
**Data:** 2026-04-17
**Responsável:** _________________

## 1. Escopo

Cobertura de testes manuais do módulo de funcionários em `/dashboard/funcionarios`, incluindo:

- Listagem (DataTable: busca, filtros, paginação)
- Diálogo de criação e edição (3 cargos, vínculo de filial, mão de obra do técnico)
- Exclusão (soft delete) com revogação de acesso vinculada
- Convite por e-mail (Supabase Auth invite)
- Acesso direto com senha provisória (force_password_change)
- Revogação de acesso
- Regras de unicidade de e-mail (no banco e no Auth)
- Controle de acesso por papel e isolamento multi-tenant

## 2. Pré-requisitos

| # | Item |
|---|------|
| 1 | Empresa A com onboarding concluído e ao menos 2 filiais ativas |
| 2 | Empresa B com onboarding concluído (para teste multi-tenant) |
| 3 | Usuário OWNER da empresa A |
| 4 | Usuário ADMIN da empresa A |
| 5 | Usuário ATENDENTE e TÉCNICO da empresa A (para testar bloqueios) |
| 6 | E-mail válido sob seu controle para receber convite real |
| 7 | E-mail já existente em outro funcionário ativo (para teste de duplicidade) |
| 8 | Acesso ao Supabase Auth para verificar app_metadata e usuários criados |
| 9 | Acesso ao banco para auditar `audit_log`, `employees.deleted_at` e `user_id` |
| 10 | Conexão estável de internet |

## 3. Convenção de Status

- ✅ Passou ❌ Falhou ⚠️ Passou com observação ⏭️ Não executado

---

## 4. Casos de Teste

### 4.1 Acesso e Autorização

#### TC-FUNC-001 — Acesso negado para usuário não autenticado
**Passos:** Acessar `/dashboard/funcionarios` deslogado.
**Esperado:** Redirecionamento para `/login`.
**Status:** ☐

---

#### TC-FUNC-002 — Acesso negado para papel ATENDENTE
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-FUNC-003 — Acesso negado para papel TÉCNICO
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-FUNC-004 — Acesso permitido para OWNER e ADMIN
**Esperado:** Página carrega; toolbar e botão "Novo Funcionário" visíveis.
**Status:** ☐

---

### 4.2 Listagem

#### TC-FUNC-005 — Empresa sem funcionários
**Esperado:** Mensagem "Nenhum funcionário cadastrado"; busca e filtros desabilitados.
**Status:** ☐

---

#### TC-FUNC-006 — Listagem ordenada por nome
**Pré-condições:** 5+ funcionários cadastrados com nomes diversos.
**Esperado:** Ordem alfabética ascendente por `name`.
**Status:** ☐

---

#### TC-FUNC-007 — Funcionários soft-deleted não aparecem
**Pré-condições:** Excluir um funcionário previamente.
**Passos:** Recarregar a listagem.
**Esperado:** Funcionário com `deleted_at` não é exibido.
**Status:** ☐

---

#### TC-FUNC-008 — Colunas responsivas
**Esperado:**
- Mobile: aparecem **Nome**, **Cargo** e **Acesso**.
- ≥ md: surge **Filial**.
- ≥ lg: surge **Contato**.
- ≥ xl: surge **Mão de obra**.
**Status:** ☐

---

#### TC-FUNC-009 — Badge "Inativo" abaixo do nome
**Pré-condições:** Funcionário com `active = false`.
**Esperado:** Texto "Inativo" em vermelho abaixo do nome.
**Status:** ☐

---

#### TC-FUNC-010 — Cores das tags de cargo
**Esperado:** Admin = azul, Atendente = verde, Técnico = âmbar (cor amarelada).
**Status:** ☐

---

#### TC-FUNC-011 — Coluna "Mão de obra" preenchida só para Técnico
**Esperado:**
- Técnico com `labor_rate` preenchido: `R$ X,XX / OS`.
- Outros cargos: `—`.
**Status:** ☐

---

#### TC-FUNC-012 — Coluna "Acesso" — três estados visuais
**Esperado:**
- Com `user_id`: "Ativo" verde com ShieldCheck.
- Sem `user_id` mas com e-mail: "Sem acesso" cinza com ShieldOff.
- Sem `user_id` e sem e-mail: "Sem e-mail" amarelo claro com AlertCircle.
**Status:** ☐

---

#### TC-FUNC-013 — Botões de ação por estado
**Esperado:**
- Sempre visíveis: Editar e Excluir.
- Apenas se sem acesso e com e-mail: ícone Convite (Mail).
- Apenas se sem acesso: ícone Senha (KeyRound).
- Apenas se com acesso: ícone Revogar (ShieldOff).
**Status:** ☐

---

### 4.3 Busca e Filtros

#### TC-FUNC-014 — Busca por nome
**Esperado:** Filtra resultados por substring case-insensitive.
**Status:** ☐

---

#### TC-FUNC-015 — Busca por e-mail, telefone e CPF
**Esperado:** Cada campo é pesquisável.
**Status:** ☐

---

#### TC-FUNC-016 — Busca por cargo (rótulo PT-BR)
**Passos:** Buscar por "Atendente", "Técnico", "Administrador".
**Esperado:** Filtra pelos rótulos legíveis em português.
**Status:** ☐

---

#### TC-FUNC-017 — Busca por nome de filial
**Esperado:** Funcionários da filial digitada são exibidos.
**Status:** ☐

---

#### TC-FUNC-018 — Filtro por Cargo (multi-seleção)
**Esperado:**
- Marcar "Atendente" e "Técnico" mostra ambos.
- Contagem ao lado de cada opção corresponde ao total real.
**Status:** ☐

---

#### TC-FUNC-019 — Filtro por Filial
**Esperado:** Lista exibe apenas funcionários das filiais marcadas.
**Status:** ☐

---

#### TC-FUNC-020 — Filtro por Acesso (3 opções, multi-seleção)
**Esperado:**
- "Com acesso": apenas com `user_id`.
- "Sem acesso": apenas sem `user_id`.
- "Sem e-mail": apenas sem `email`.
- Selecionar múltiplas faz união (OR).
**Status:** ☐

---

#### TC-FUNC-021 — Botão "Limpar filtros"
**Esperado:** Aparece somente quando há filtros ou busca; ao clicar, zera tudo.
**Status:** ☐

---

#### TC-FUNC-022 — Mensagem "Nenhum resultado encontrado"
**Pré-condições:** Empresa com funcionários, mas filtros sem match.
**Esperado:** Mensagem específica + botão "Limpar filtros" interno.
**Status:** ☐

---

#### TC-FUNC-023 — Combinação de busca + filtros
**Esperado:** Resultado é a interseção (AND) entre busca e cada grupo de filtro.
**Status:** ☐

---

### 4.4 Paginação

#### TC-FUNC-024 — Paginação aparece com >10 funcionários
**Esperado:** Controles `DataTablePagination` exibidos com 10 por página por padrão.
**Status:** ☐

---

#### TC-FUNC-025 — Trocar quantidade de linhas por página
**Esperado:** Lista atualiza imediatamente para o novo tamanho; volta para a página 1.
**Status:** ☐

---

#### TC-FUNC-026 — Reset para página 1 ao filtrar
**Pré-condições:** Estar na página 3.
**Passos:** Aplicar um filtro qualquer.
**Esperado:** Página corrente volta para 1.
**Status:** ☐

---

#### TC-FUNC-027 — Página atual ajusta quando reduz total
**Pré-condições:** Estar na última página com poucos itens.
**Passos:** Excluir todos os itens visíveis.
**Esperado:** Página corrente recua para a última válida sem ficar vazia.
**Status:** ☐

---

### 4.5 Cadastro

#### TC-FUNC-028 — Abertura do diálogo
**Esperado:** Modal "Novo Funcionário"; cargo padrão "Atendente"; ativo marcado.
**Status:** ☐

---

#### TC-FUNC-029 — Validação: nome obrigatório
**Esperado:** Erro "Nome é obrigatório".
**Status:** ☐

---

#### TC-FUNC-030 — Validação: nome com menos de 3 caracteres
**Esperado:** Erro "O nome deve ter no mínimo 3 caracteres".
**Status:** ☐

---

#### TC-FUNC-031 — Validação: nome com mais de 100 caracteres
**Esperado:** Erro "O nome deve ter no máximo 100 caracteres".
**Status:** ☐

---

#### TC-FUNC-032 — Validação: filial obrigatória
**Esperado:** Erro "Filial é obrigatória" abaixo do select.
**Status:** ☐

---

#### TC-FUNC-033 — Select de Filial mostra somente filiais ativas
**Pré-condições:** Existir 1 filial inativa e 1 deletada.
**Esperado:** Apenas filiais com `active=true` e sem `deleted_at` aparecem.
**Status:** ☐

---

#### TC-FUNC-034 — Select de Cargo lista apenas as 3 opções
**Esperado:** Administrador, Atendente, Técnico (sem outras).
**Status:** ☐

---

#### TC-FUNC-035 — Validação: e-mail inválido
**Passos:** Digitar `abc`.
**Esperado:** Erro "E-mail inválido".
**Status:** ☐

---

#### TC-FUNC-036 — E-mail vazio é aceito
**Esperado:** Cadastro segue normalmente sem e-mail; coluna Acesso = "Sem e-mail".
**Status:** ☐

---

#### TC-FUNC-037 — Máscara de telefone
**Passos:** Digitar `11987654321`.
**Esperado:** `(11) 98765-4321`.
**Status:** ☐

---

#### TC-FUNC-038 — Máscara de CPF
**Passos:** Digitar `12345678901`.
**Esperado:** `123.456.789-01`.
**Status:** ☐

---

#### TC-FUNC-039 — Campo "Mão de obra" só aparece para Técnico
**Passos:** Trocar cargo entre opções.
**Esperado:** Campo `labor_rate` aparece somente quando cargo = Técnico.
**Status:** ☐

---

#### TC-FUNC-040 — Mão de obra: valor negativo
**Passos:** Cargo Técnico, digitar `-10`, salvar.
**Esperado:** Erro "O valor deve ser maior ou igual a zero".
**Status:** ☐

---

#### TC-FUNC-041 — Mão de obra: vazio para técnico
**Esperado:** Cadastro permitido (campo é opcional); coluna mostra `—`.
**Status:** ☐

---

#### TC-FUNC-042 — Mão de obra: valor decimal aceito
**Passos:** Digitar `49.90`.
**Esperado:** Salva e exibe `R$ 49,90 / OS`.
**Status:** ☐

---

#### TC-FUNC-043 — Cadastro com sucesso (mínimo)
**Passos:** Preencher só nome, cargo e filial.
**Esperado:** Toast "Funcionário cadastrado com sucesso."; modal fecha; aparece na lista; audit_log `create`.
**Status:** ☐

---

#### TC-FUNC-044 — Cadastro com sucesso (todos os campos)
**Esperado:** Salva normalmente; todos os campos refletidos na linha da tabela.
**Status:** ☐

---

#### TC-FUNC-045 — Botão "Salvar" desabilitado durante envio
**Esperado:** Loading no botão; "Cancelar" também desabilitado.
**Status:** ☐

---

#### TC-FUNC-046 — Cancelar / fechar pelo X
**Esperado:** Modal fecha; nada salvo.
**Status:** ☐

---

#### TC-FUNC-047 — Reabrir após troca de funcionário restaura dados corretos
**Passos:** Editar funcionário X, fechar; editar funcionário Y.
**Esperado:** Modal mostra dados de Y, sem resíduo de X.
**Status:** ☐

---

### 4.6 Unicidade de E-mail

#### TC-FUNC-048 — Cadastro com e-mail já usado por outro funcionário ativo
**Esperado:** Toast "Este e-mail já está cadastrado no sistema."; nada gravado.
**Status:** ☐

---

#### TC-FUNC-049 — Cadastro com e-mail já existente no Supabase Auth (mas não em employees)
**Pré-condições:** Existir um usuário no Auth com e-mail X que não esteja vinculado a nenhum funcionário desta empresa.
**Esperado:** Mesma mensagem de duplicidade.
**Status:** ☐

---

#### TC-FUNC-050 — E-mail é normalizado (trim + lowercase)
**Passos:** Digitar `  Teste@Email.COM  `.
**Esperado:** Persistido como `teste@email.com`.
**Status:** ☐

---

#### TC-FUNC-051 — Edição mantendo o próprio e-mail
**Esperado:** Permitida; sem erro de duplicidade.
**Status:** ☐

---

#### TC-FUNC-052 — Edição alterando para e-mail de outro funcionário
**Esperado:** Bloqueada com a mensagem de duplicidade.
**Status:** ☐

---

### 4.7 Edição

#### TC-FUNC-053 — Edição básica
**Passos:** Alterar telefone e cargo de um funcionário.
**Esperado:** Toast "Funcionário atualizado com sucesso."; mudança refletida na lista; audit `update`.
**Status:** ☐

---

#### TC-FUNC-054 — Edição de funcionário com acesso: app_metadata.role atualiza
**Pré-condições:** Funcionário com `user_id` definido.
**Passos:** Mudar cargo de Atendente para Admin.
**Esperado:** No Supabase Auth, `app_metadata.role` desse usuário muda para `admin`.
**Status:** ☐

---

#### TC-FUNC-055 — Desativar funcionário com acesso revoga login
**Pré-condições:** Funcionário ativo com `user_id`.
**Passos:** Desmarcar "Funcionário Ativo" e salvar.
**Esperado:**
- Banco: `active=false`, `user_id=null`.
- Auth: usuário removido (deleteUser).
- Audit: `access_revoked: true` no metadata.
- Coluna Acesso volta para "Sem acesso" ou "Sem e-mail".
**Status:** ☐

---

#### TC-FUNC-056 — Reativar funcionário não recria acesso automaticamente
**Pré-condições:** Funcionário inativo sem `user_id`.
**Passos:** Marcar ativo e salvar.
**Esperado:** Funcionário fica ativo; acesso continua "Sem acesso" (precisa novo convite ou senha provisória).
**Status:** ☐

---

#### TC-FUNC-057 — Edição não altera funcionário de outra empresa (multi-tenant)
**Passos:** Forçar `updateEmployee` com ID da empresa B via DevTools.
**Esperado:** Erro "Funcionário não encontrado.".
**Status:** ☐

---

### 4.8 Convite por E-mail

#### TC-FUNC-058 — Botão de convite só aparece se há e-mail e não há acesso
**Esperado:** Para cada estado da coluna Acesso, ícone Mail aparece apenas para "Sem acesso" + tem e-mail.
**Status:** ☐

---

#### TC-FUNC-059 — Convite com sucesso (e-mail novo)
**Passos:** Confirmar envio.
**Esperado:**
- Toast "Convite enviado para X.".
- Coluna Acesso muda para "Ativo".
- E-mail real chega à caixa de entrada com link de redefinição.
- `employees.user_id` preenchido; `app_metadata.role` e `company_id` definidos.
- Audit `send_invite`.
**Status:** ☐

---

#### TC-FUNC-060 — Convite para e-mail já registrado no Auth
**Pré-condições:** Outro usuário no Auth com mesmo e-mail.
**Esperado:** Toast: "Este e-mail já possui uma conta no sistema. Use \"Definir acesso\" para vincular manualmente.".
**Status:** ☐

---

#### TC-FUNC-061 — Convite quando funcionário já tem acesso (chamada forçada)
**Passos:** Disparar `inviteEmployee` para alguém com `user_id` via DevTools.
**Esperado:** Toast "Este funcionário já possui acesso ao sistema.".
**Status:** ☐

---

#### TC-FUNC-062 — Convite quando funcionário não tem e-mail
**Esperado:** Botão de convite ausente; chamada forçada retorna "O funcionário não tem e-mail cadastrado.".
**Status:** ☐

---

#### TC-FUNC-063 — Aceitar convite vai para o sistema
**Passos:** No e-mail recebido, clicar no link, definir senha, fazer login.
**Esperado:** Login bem-sucedido; usuário cai no dashboard com permissões do cargo cadastrado.
**Status:** ☐

---

### 4.9 Acesso Direto (senha provisória)

#### TC-FUNC-064 — Abertura do diálogo
**Esperado:**
- Quando há e-mail no funcionário: campo e-mail pré-preenchido e desabilitado.
- Sem e-mail: campo editável.
**Status:** ☐

---

#### TC-FUNC-065 — Validação: e-mail inválido
**Esperado:** Erro "E-mail inválido".
**Status:** ☐

---

#### TC-FUNC-066 — Validação: senha curta
**Passos:** Digitar 5 caracteres.
**Esperado:** Erro "A senha deve ter pelo menos 8 caracteres".
**Status:** ☐

---

#### TC-FUNC-067 — Senha provisória aceita pelo Supabase
**Passos:** Senha forte (ex.: `Senha@123`).
**Esperado:**
- Toast "Acesso criado para X. Informe a senha provisória ao funcionário.".
- Coluna Acesso = "Ativo".
- Auth: usuário criado com `email_confirm: true`, `app_metadata.force_password_change: true`.
- Audit `set_password`.
**Status:** ☐

---

#### TC-FUNC-068 — Senha rejeitada pela política do Supabase
**Passos:** Senha de tamanho ok, mas reconhecida como fraca (ex.: `12345678`).
**Esperado:** Toast "Senha provisória muito fraca...".
**Status:** ☐

---

#### TC-FUNC-069 — E-mail informado já existe no Auth
**Esperado:** Toast "Este e-mail já possui uma conta no sistema.".
**Status:** ☐

---

#### TC-FUNC-070 — E-mail conflita com outro funcionário ativo
**Esperado:** Toast "Este e-mail já está cadastrado no sistema.".
**Status:** ☐

---

#### TC-FUNC-071 — Primeiro login obriga troca de senha
**Pré-condições:** Acesso direto criado com `force_password_change: true`.
**Passos:** Logar com a senha provisória.
**Esperado:** Sistema redireciona para fluxo de definição de nova senha.
**Status:** ☐

---

### 4.10 Revogar Acesso

#### TC-FUNC-072 — Botão revogar só para funcionário com acesso
**Esperado:** Aparece somente para coluna Acesso = "Ativo".
**Status:** ☐

---

#### TC-FUNC-073 — Revogação com sucesso
**Esperado:**
- Toast "Acesso de X revogado.".
- `employees.user_id` = null.
- Usuário removido do Auth.
- Audit `revoke_access`.
- Coluna Acesso passa a "Sem acesso" (cadastro permanece).
**Status:** ☐

---

#### TC-FUNC-074 — Revogação preserva o cadastro
**Esperado:** Funcionário continua na lista com mesmos dados; apenas o login some.
**Status:** ☐

---

#### TC-FUNC-075 — Sessão do funcionário revogado
**Pré-condições:** Funcionário com sessão ativa em outra aba/dispositivo.
**Passos:** Revogar e tentar usar a sessão dele.
**Esperado:** Próxima ação retorna 401/redireciona para login.
**Status:** ☐

---

### 4.11 Exclusão (Soft Delete)

#### TC-FUNC-076 — Exclusão de funcionário sem acesso
**Esperado:**
- Toast "Funcionário \"X\" removido da listagem com sucesso.".
- Linha desaparece imediatamente.
- Banco: `deleted_at`, `deleted_by`, `active=false`, `user_id=null`.
- Audit `soft_delete` com `had_access: false`.
**Status:** ☐

---

#### TC-FUNC-077 — Exclusão de funcionário com acesso revoga e remove auth
**Esperado:**
- Mesma resposta acima.
- Usuário removido do Supabase Auth.
- Audit metadata: `had_access: true`, `access_revoked: true`.
**Status:** ☐

---

#### TC-FUNC-078 — Rollback de soft delete se falhar a remoção do Auth
**Pré-condições:** Simular falha na remoção do Auth (se possível em ambiente de teste).
**Esperado:** `deleted_at`, `deleted_by` e `user_id` voltam ao estado anterior; toast com mensagem do erro.
**Status:** ☐

---

#### TC-FUNC-079 — Funcionário excluído libera vínculo da filial
**Pré-condições:** Filial X com 1 único funcionário.
**Passos:** Excluir esse funcionário.
**Esperado:** Filial X passa a poder ser excluída no módulo Filiais.
**Status:** ☐

---

#### TC-FUNC-080 — Cancelar exclusão
**Esperado:** Modal fecha; funcionário permanece.
**Status:** ☐

---

#### TC-FUNC-081 — Persistência da exclusão após reload
**Esperado:** Funcionário não retorna após F5.
**Status:** ☐

---

### 4.12 Concorrência e Casos de Borda

#### TC-FUNC-082 — Edição concorrente em duas abas
**Esperado:** Última gravação prevalece sem erro de aplicação. (Documentar comportamento.)
**Status:** ☐

---

#### TC-FUNC-083 — Excluir funcionário já excluído em outra aba
**Esperado:** Toast "Funcionário não encontrado.".
**Status:** ☐

---

#### TC-FUNC-084 — Convidar duas vezes em sequência (duplo clique)
**Esperado:** Apenas uma chamada efetiva; não cria dois usuários no Auth.
**Status:** ☐

---

#### TC-FUNC-085 — Caracteres especiais no nome
**Passos:** Cadastrar `José D'Ávila Júnior`.
**Esperado:** Salva sem erro; exibido corretamente.
**Status:** ☐

---

#### TC-FUNC-086 — Tentativa de XSS no nome
**Passos:** Cadastrar `<img src=x onerror=alert(1)>`.
**Esperado:** Texto exibido como string; nenhum script executado.
**Status:** ☐

---

#### TC-FUNC-087 — Sessão expira durante o uso
**Esperado:** Próxima ação retorna erro de autenticação ou redirect para `/login`.
**Status:** ☐

---

#### TC-FUNC-088 — Filial vinculada inativada após cadastro
**Pré-condições:** Funcionário vinculado à filial Y; depois inativar Y.
**Esperado:**
- Listagem ainda mostra o vínculo (nome da filial pode aparecer ou não — documentar).
- Ao editar o funcionário, o select de filial **não** lista a Y (filtra ativas), portanto será necessário escolher outra para salvar. Documentar UX observada.
**Status:** ☐

---

## 5. Resumo da Execução

| Métrica | Valor |
|---|---|
| Total de casos | 88 |
| Passou | ___ |
| Falhou | ___ |
| Com observação | ___ |
| Não executado | ___ |

## 6. Bugs Encontrados

| ID | TC | Severidade | Descrição | Status |
|----|----|----|-----------|--------|
| | | | | |

## 7. Observações Gerais

_Espaço para anotações do testador._
