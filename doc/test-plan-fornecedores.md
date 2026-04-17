# Caderno de Testes Manuais — Módulo Fornecedores

**Versão:** 1.0
**Data:** 2026-04-17
**Responsável:** _________________

## 1. Escopo

Cobertura de testes manuais do módulo de fornecedores em `/dashboard/fornecedores`, incluindo:

- Listagem com ordenação por prioridade de filial de cadastro
- Busca, filtros (filial de cadastro, status) e paginação
- Diálogo de cadastro e edição (validações, máscaras, ViaCEP, UF via Select)
- Soft delete com arquivamento do CPF/CNPJ
- Unicidade de documento (CPF/CNPJ) entre fornecedores ativos
- Controle de acesso (todas as actions usam `getAdminContext` — RBAC mais restrito que Clientes)
- Isolamento multi-tenant

> **Diferenças em relação ao módulo Clientes:** Fornecedores não possui sistema de classificação. A action `createSupplier` usa `getAdminContext` (somente admin/owner), enquanto `createClient` usa `getCompanyContext`. O filtro de classificação não existe aqui. O campo chama-se "Filial de cadastro" (não "Filial de origem").

## 2. Pré-requisitos

| # | Item |
|---|------|
| 1 | Empresa A com 2+ filiais ativas |
| 2 | Empresa B (para testes multi-tenant) |
| 3 | Usuário OWNER e ADMIN da empresa A |
| 4 | Usuário ATENDENTE e TÉCNICO da empresa A |
| 5 | Pelo menos 1 fornecedor com `active = false` |
| 6 | 2 fornecedores cadastrados em filiais diferentes |
| 7 | CPF e CNPJ válidos (fictícios) para os testes |
| 8 | CPF já cadastrado em fornecedor ativo (para teste de duplicidade) |
| 9 | Acesso ao banco para auditar `audit_log`, `suppliers.deleted_at` e `suppliers.document` |

## 3. Convenção de Status

- ✅ Passou ❌ Falhou ⚠️ Passou com observação ⏭️ Não executado

---

## 4. Casos de Teste

### 4.1 Acesso e Autorização

#### TC-FORN-001 — Acesso negado para usuário não autenticado
**Passos:** Acessar `/dashboard/fornecedores` sem login.
**Esperado:** Redirecionamento para `/login`.
**Status:** ☐

---

#### TC-FORN-002 — Acesso negado para papel ATENDENTE
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-FORN-003 — Acesso negado para papel TÉCNICO
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-FORN-004 — Acesso permitido para OWNER e ADMIN
**Esperado:** Página carrega; toolbar, botão "Novo Fornecedor" e tabela visíveis.
**Status:** ☐

---

#### TC-FORN-005 — Action `createSupplier` bloqueada para não-admin (chamada forçada)
**Passos:** Logado como atendente, chamar `createSupplier` via DevTools.
**Esperado:** Retorna erro de autorização; nenhum fornecedor criado.
**Status:** ☐

---

### 4.2 Listagem e Ordenação

#### TC-FORN-006 — Empresa sem fornecedores
**Esperado:** Mensagem "Nenhum fornecedor cadastrado"; busca e filtros desabilitados.
**Status:** ☐

---

#### TC-FORN-007 — Prioridade visual: filial do usuário logado aparece primeiro
**Pré-condições:** Fornecedores cadastrados em filiais A e B; usuário logado na filial A.
**Esperado:**
- Fornecedores com `origin_branch_id = filial A` no topo.
- Dentro de cada grupo, ordenados alfabeticamente pelo nome (localeCompare pt-BR).
- Badge "Prioridade" na coluna Filial de cadastro para esses fornecedores.
**Status:** ☐

---

#### TC-FORN-008 — Badge "Prioridade" ausente para fornecedores de outras filiais
**Esperado:** Fornecedores de outras filiais não exibem o badge.
**Status:** ☐

---

#### TC-FORN-009 — Pill informativa no cabeçalho
**Esperado:** Pill "Fornecedores cadastrados pela filial X aparecem primeiro nesta listagem." visível quando `currentBranchId` está definido.
**Status:** ☐

---

#### TC-FORN-010 — Colunas responsivas
**Esperado:**
- Sempre visíveis: **Fornecedor**, **Contato**, **Status**, **Ações**.
- ≥ md: surge **Documento**.
- ≥ lg: surge **Filial de cadastro**.
- ≥ xl: surge **Endereço**.
**Status:** ☐

---

#### TC-FORN-011 — Ícone Truck ao lado do nome
**Esperado:** Ícone de caminhão (Truck) aparece à esquerda do nome em toda linha.
**Status:** ☐

---

#### TC-FORN-012 — Coluna Endereço exibe `buildAddress`
**Pré-condições:** Fornecedor com rua, número, complemento, cidade, estado e CEP.
**Esperado:** Formato `Rua, Número | Complemento | Cidade - UF | CEP`.
**Status:** ☐

---

#### TC-FORN-013 — Coluna Endereço mostra `—` quando vazio
**Esperado:** Fornecedor sem endereço exibe `—` na coluna.
**Status:** ☐

---

#### TC-FORN-014 — Coluna Status: badge único Ativo/Inativo
**Esperado:** Verde ("Ativo") ou cinza ("Inativo") — apenas 1 badge, sem classificação.
**Status:** ☐

---

#### TC-FORN-015 — Observações aparecem abaixo do nome (truncadas)
**Pré-condições:** Fornecedor com `notes` preenchido.
**Esperado:** Texto de observações em fonte menor, truncado, abaixo do nome.
**Status:** ☐

---

#### TC-FORN-016 — Fornecedores soft-deleted não aparecem
**Esperado:** Após reload, fornecedor excluído (com `deleted_at`) não é exibido.
**Status:** ☐

---

### 4.3 Busca e Filtros

#### TC-FORN-017 — Busca por nome
**Esperado:** Filtra por substring case-insensitive.
**Status:** ☐

---

#### TC-FORN-018 — Busca por documento (CPF/CNPJ)
**Esperado:** Encontra pela string formatada ou pelos dígitos.
**Status:** ☐

---

#### TC-FORN-019 — Busca por telefone e e-mail
**Esperado:** Filtra corretamente por qualquer um dos campos.
**Status:** ☐

---

#### TC-FORN-020 — Busca por endereço (campo `address`)
**Esperado:** Texto do endereço consolidado é pesquisável.
**Status:** ☐

---

#### TC-FORN-021 — Busca por observações
**Esperado:** Texto em `notes` é pesquisável.
**Status:** ☐

---

#### TC-FORN-022 — Busca por nome de filial de cadastro
**Esperado:** Fornecedores da filial digitada aparecem.
**Status:** ☐

---

#### TC-FORN-023 — Filtro por Filial de cadastro (multi-seleção)
**Esperado:** Lista exibe apenas fornecedores das filiais marcadas; contagem correta.
**Status:** ☐

---

#### TC-FORN-024 — Filtro por Status (Ativo / Inativo)
**Esperado:**
- "Ativos": apenas `active = true`.
- "Inativos": apenas `active = false`.
- Ambos marcados: todos.
**Status:** ☐

---

#### TC-FORN-025 — Contagens nos filtros são corretas
**Esperado:** Badge de contagem em cada opção corresponde ao número real.
**Status:** ☐

---

#### TC-FORN-026 — Não há filtro de Classificação
**Esperado:** Toolbar exibe apenas Busca, Filial de cadastro e Status — sem filtro de classificação.
**Status:** ☐

---

#### TC-FORN-027 — Combinação de busca + filtros
**Esperado:** Resultado é interseção (AND) entre busca e filtros.
**Status:** ☐

---

#### TC-FORN-028 — Botão "Limpar filtros"
**Esperado:** Aparece apenas com filtros ativos; ao clicar, zera tudo.
**Status:** ☐

---

#### TC-FORN-029 — "Nenhum resultado" com botão interno de limpar
**Esperado:** Mensagem específica + botão "Limpar filtros" dentro do card.
**Status:** ☐

---

### 4.4 Paginação

#### TC-FORN-030 — Paginação com >10 fornecedores
**Esperado:** Controles exibidos; padrão 10 por página.
**Status:** ☐

---

#### TC-FORN-031 — Trocar quantidade de linhas por página
**Esperado:** Lista atualiza; volta para página 1.
**Status:** ☐

---

#### TC-FORN-032 — Filtrar reseta para página 1
**Pré-condições:** Estar na página 3.
**Esperado:** Qualquer mudança de filtro leva de volta à página 1.
**Status:** ☐

---

### 4.5 Cadastro

#### TC-FORN-033 — Abertura do diálogo
**Esperado:**
- Título "Novo Fornecedor".
- Filial de cadastro pré-selecionada com a filial do usuário (ou matriz, ou primeira filial).
- Ativo marcado por padrão.
- Sem seção de classificação.
**Status:** ☐

---

#### TC-FORN-034 — Validação: nome obrigatório
**Esperado:** Erro "Nome é obrigatório".
**Status:** ☐

---

#### TC-FORN-035 — Validação: nome < 3 caracteres
**Esperado:** Erro "O nome deve ter no mínimo 3 caracteres".
**Status:** ☐

---

#### TC-FORN-036 — Validação: nome > 120 caracteres
**Esperado:** Erro "O nome deve ter no máximo 120 caracteres".
**Status:** ☐

---

#### TC-FORN-037 — Validação: CPF/CNPJ obrigatório
**Esperado:** Erro "CPF/CNPJ é obrigatório".
**Status:** ☐

---

#### TC-FORN-038 — Validação: CPF (11 dígitos) aceito
**Esperado:** Máscara `000.000.000-00`; sem erro.
**Status:** ☐

---

#### TC-FORN-039 — Validação: CNPJ (14 dígitos) aceito
**Esperado:** Máscara `00.000.000/0000-00`; sem erro.
**Status:** ☐

---

#### TC-FORN-040 — Validação: dígitos entre 12 e 13 inválidos
**Passos:** Digitar 12 ou 13 dígitos.
**Esperado:** Erro "Informe um CPF/CNPJ válido".
**Status:** ☐

---

#### TC-FORN-041 — Validação: telefone obrigatório
**Esperado:** Erro "Telefone é obrigatório".
**Status:** ☐

---

#### TC-FORN-042 — Validação: telefone fixo (10 dígitos) aceito
**Esperado:** Máscara `(00) 0000-0000`; sem erro.
**Status:** ☐

---

#### TC-FORN-043 — Validação: celular (11 dígitos) aceito
**Esperado:** Máscara `(00) 00000-0000`; sem erro.
**Status:** ☐

---

#### TC-FORN-044 — Validação: telefone com 9 dígitos inválido
**Esperado:** Erro "Informe um telefone válido".
**Status:** ☐

---

#### TC-FORN-045 — Validação: filial de cadastro obrigatória
**Esperado:** Erro "Filial de cadastro é obrigatória".
**Status:** ☐

---

#### TC-FORN-046 — E-mail opcional aceito vazio
**Esperado:** Cadastro realizado sem e-mail; coluna Contato mostra apenas telefone.
**Status:** ☐

---

#### TC-FORN-047 — Validação: e-mail inválido
**Passos:** Digitar `nao-e-email`.
**Esperado:** Erro "E-mail inválido".
**Status:** ☐

---

#### TC-FORN-048 — CEP: auto-preenchimento via ViaCEP
**Passos:** Digitar `01310-100`.
**Esperado:** Spinner no campo CEP; Rua, Cidade e Estado preenchidos automaticamente.
**Status:** ☐

---

#### TC-FORN-049 — CEP: ViaCEP não bloqueia com CEP inexistente
**Esperado:** Campos permanecem vazios; formulário continua utilizável.
**Status:** ☐

---

#### TC-FORN-050 — CEP: sem internet
**Pré-condições:** Desligar a conexão antes de digitar o CEP.
**Esperado:** Falha silenciosa; formulário continua funcionando para preenchimento manual.
**Status:** ☐

---

#### TC-FORN-051 — Estado: Select com 27 estados
**Esperado:** Dropdown lista todos os estados com nome e sigla; permite selecionar qualquer um.
**Status:** ☐

---

#### TC-FORN-052 — ViaCEP preenche corretamente o Select de estado
**Passos:** Usar ViaCEP com CEP de SP.
**Esperado:** Select mostra "São Paulo (SP)" selecionado.
**Status:** ☐

---

#### TC-FORN-053 — Observações: limite de 500 caracteres
**Passos:** Colar 501 caracteres no campo.
**Esperado:** Erro "As observações devem ter no máximo 500 caracteres".
**Status:** ☐

---

#### TC-FORN-054 — Observações: placeholder específico
**Esperado:** Placeholder "Condições comerciais, prazo de entrega ou observações úteis."
**Status:** ☐

---

#### TC-FORN-055 — Cadastro com sucesso (campos mínimos)
**Passos:** Preencher nome, CPF/CNPJ, telefone e filial de cadastro.
**Esperado:** Toast "Fornecedor cadastrado com sucesso."; modal fecha; aparece na listagem; audit_log `create`.
**Status:** ☐

---

#### TC-FORN-056 — Cadastro com sucesso (todos os campos)
**Esperado:** Todos os dados salvos; endereço consolidado visível na coluna Endereço; estado em maiúsculas no banco.
**Status:** ☐

---

#### TC-FORN-057 — Estado salvo em maiúsculas no banco
**Esperado:** Campo `state` gravado como sigla maiúscula (`SP`, `RJ`, etc.) independente da fonte (ViaCEP ou select).
**Status:** ☐

---

#### TC-FORN-058 — Botões desabilitados durante envio
**Esperado:** "Salvar Fornecedor" em loading; "Cancelar" desabilitado.
**Status:** ☐

---

#### TC-FORN-059 — Cancelar / fechar pelo X
**Esperado:** Modal fecha sem salvar nada.
**Status:** ☐

---

### 4.6 Unicidade de Documento (CPF/CNPJ)

#### TC-FORN-060 — Cadastro com CPF já em uso por fornecedor ativo
**Esperado:** Toast "Já existe um fornecedor ativo com este CPF/CNPJ."; nada gravado.
**Status:** ☐

---

#### TC-FORN-061 — Cadastro com CNPJ já em uso
**Esperado:** Mesma mensagem de duplicidade.
**Status:** ☐

---

#### TC-FORN-062 — Cadastro com CPF de fornecedor excluído libera o documento
**Pré-condições:** Excluir fornecedor com CPF X; `document` foi arquivado com sufixo `[deleted:...]`.
**Esperado:** Novo cadastro com CPF X é aceito.
**Status:** ☐

---

#### TC-FORN-063 — Edição mantendo o próprio documento
**Esperado:** Atualizar outros campos sem mudar o CPF/CNPJ não gera erro de duplicidade.
**Status:** ☐

---

#### TC-FORN-064 — Edição alterando para documento de outro fornecedor ativo
**Esperado:** Toast "Já existe um fornecedor ativo com este CPF/CNPJ.".
**Status:** ☐

---

### 4.7 Edição

#### TC-FORN-065 — Abertura do diálogo de edição
**Esperado:** Todos os campos pré-preenchidos; título "Editar Fornecedor".
**Status:** ☐

---

#### TC-FORN-066 — Edição com sucesso
**Passos:** Alterar telefone e cidade.
**Esperado:** Toast "Fornecedor atualizado com sucesso."; listagem reflete a mudança; audit_log `update`.
**Status:** ☐

---

#### TC-FORN-067 — Edição recalcula `address` consolidado
**Passos:** Alterar rua ou número.
**Esperado:** Campo `address` no banco reflete o novo valor composto.
**Status:** ☐

---

#### TC-FORN-068 — Inativar fornecedor
**Passos:** Desmarcar "Fornecedor ativo", salvar.
**Esperado:** Badge "Inativo" na coluna Status; filtro "Inativos" passa a incluir o fornecedor.
**Status:** ☐

---

#### TC-FORN-069 — Reativar fornecedor
**Passos:** Marcar "Fornecedor ativo" novamente, salvar.
**Esperado:** Badge "Ativo" retorna.
**Status:** ☐

---

#### TC-FORN-070 — Edição não altera fornecedor de outra empresa (multi-tenant)
**Passos:** Forçar `updateSupplier` com ID da empresa B via DevTools.
**Esperado:** Erro "Fornecedor não encontrado.".
**Status:** ☐

---

#### TC-FORN-071 — Reabrir diálogo para outro fornecedor não mistura dados
**Passos:** Editar fornecedor X, fechar; editar fornecedor Y.
**Esperado:** Modal exibe dados de Y sem resíduo de X.
**Status:** ☐

---

### 4.8 Exclusão (Soft Delete com Arquivamento de Documento)

#### TC-FORN-072 — Abertura do diálogo de exclusão
**Esperado:** Modal com nome em negrito e aviso de histórico preservado para auditoria.
**Status:** ☐

---

#### TC-FORN-073 — Cancelar exclusão
**Esperado:** Modal fecha; fornecedor permanece na listagem.
**Status:** ☐

---

#### TC-FORN-074 — Exclusão com sucesso
**Esperado:**
- Toast `Fornecedor "X" removido da listagem com sucesso.`
- Linha desaparece imediatamente.
- Banco: `deleted_at`, `deleted_by`, `active=false`.
- Campo `document` arquivado: `<doc_original> [deleted:<timestamp>:<id>]`.
- audit_log `soft_delete` com `original_document`.
**Status:** ☐

---

#### TC-FORN-075 — Exclusão libera CPF/CNPJ para reutilização
**Passos:** Excluir fornecedor com CNPJ X; cadastrar novo com mesmo CNPJ X.
**Esperado:** Novo cadastro aceito normalmente.
**Status:** ☐

---

#### TC-FORN-076 — Botão "Excluir da Listagem" desabilitado durante envio
**Esperado:** Texto muda para "Excluindo..." e fica desabilitado.
**Status:** ☐

---

#### TC-FORN-077 — Persistência após reload
**Esperado:** Fornecedor excluído não retorna após F5.
**Status:** ☐

---

#### TC-FORN-078 — Edição bloqueada para fornecedor já excluído (chamada forçada)
**Passos:** Forçar `updateSupplier` com ID que tem `deleted_at` preenchido.
**Esperado:** Erro "Fornecedor não encontrado.".
**Status:** ☐

---

### 4.9 Responsividade e Acessibilidade

#### TC-FORN-079 — Layout mobile (375px)
**Esperado:** Tabela com scroll horizontal; colunas Documento, Filial e Endereço ocultas; conteúdo legível.
**Status:** ☐

---

#### TC-FORN-080 — Diálogo com scroll em tela baixa
**Esperado:** Modal respeita `max-h-[90vh]` e permite scroll interno.
**Status:** ☐

---

#### TC-FORN-081 — Grid 3 colunas no diálogo (≥ xl)
**Esperado:** Em viewport largo (≥ 1280px), campos em 3 colunas.
**Status:** ☐

---

#### TC-FORN-082 — Navegação por teclado
**Esperado:** Tab percorre campos na ordem lógica; Esc fecha; Enter no botão salva.
**Status:** ☐

---

### 4.10 Casos de Borda

#### TC-FORN-083 — Nome com caracteres especiais
**Passos:** Cadastrar `Distribuidora Irmãos D'Ávila & Filhos Ltda`.
**Esperado:** Salvo e exibido corretamente.
**Status:** ☐

---

#### TC-FORN-084 — Tentativa de XSS no nome
**Passos:** Cadastrar `<script>alert(1)</script>`.
**Esperado:** Texto renderizado como string; nenhum script executado.
**Status:** ☐

---

#### TC-FORN-085 — Edição concorrente em duas abas
**Esperado:** Última gravação prevalece sem erro de aplicação. (Documentar comportamento.)
**Status:** ☐

---

#### TC-FORN-086 — Excluir fornecedor já excluído em outra aba
**Esperado:** Toast "Fornecedor não encontrado.".
**Status:** ☐

---

#### TC-FORN-087 — Duplo clique em "Salvar Fornecedor"
**Esperado:** Apenas uma requisição enviada; fornecedor não duplicado.
**Status:** ☐

---

#### TC-FORN-088 — Sessão expira durante o uso
**Esperado:** Próxima action retorna erro de autenticação ou redireciona para `/login`.
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
