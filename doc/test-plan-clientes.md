# Caderno de Testes Manuais — Módulo Clientes

**Versão:** 1.0
**Data:** 2026-04-17
**Responsável:** _________________

## 1. Escopo

Cobertura de testes manuais do módulo de clientes em `/dashboard/clientes`, incluindo:

- Listagem com ordenação por prioridade de filial
- Busca, filtros (filial de origem, status, classificação) e paginação
- Diálogo de cadastro e edição (campos obrigatórios, máscaras, ViaCEP, estado UF via select, classificação)
- Soft delete com arquivamento do CPF/CNPJ (libera o documento para reutilização)
- Unicidade de documento (CPF/CNPJ) entre clientes ativos
- Controle de acesso (a página é admin-only; a action de criação usa `getCompanyContext` e pode ser chamada de outros contextos, como OS)
- Isolamento multi-tenant

> **Nota:** O `ClientDialog` é reutilizado no módulo de OS. Casos específicos de criação de cliente a partir de uma OS devem ser validados naquele módulo separadamente.

## 2. Pré-requisitos

| # | Item |
|---|------|
| 1 | Empresa A com onboarding concluído e 2+ filiais ativas |
| 2 | Empresa B (para testes multi-tenant) |
| 3 | Usuário OWNER e ADMIN da empresa A |
| 4 | Usuário ATENDENTE e TÉCNICO da empresa A |
| 5 | Pelo menos 1 cliente com `active = false` |
| 6 | Pelo menos 1 cliente com cada classificação (novo, recorrente, vip, inadimplente) |
| 7 | 2 clientes com filiais de origem diferentes |
| 8 | CPF e CNPJ válidos para uso nos testes (de preferência fictícios) |
| 9 | CPF já cadastrado em cliente ativo (para teste de duplicidade) |
| 10 | Acesso ao banco para auditar `audit_log`, `clients.deleted_at` e `clients.document` |

## 3. Convenção de Status

- ✅ Passou ❌ Falhou ⚠️ Passou com observação ⏭️ Não executado

---

## 4. Casos de Teste

### 4.1 Acesso e Autorização

#### TC-CLI-001 — Acesso negado para usuário não autenticado
**Passos:** Acessar `/dashboard/clientes` sem login.
**Esperado:** Redirecionamento para `/login`.
**Status:** ☐

---

#### TC-CLI-002 — Acesso negado para papel ATENDENTE
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-CLI-003 — Acesso negado para papel TÉCNICO
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-CLI-004 — Acesso permitido para OWNER e ADMIN
**Esperado:** Página carrega; toolbar, botão "Novo Cliente" e tabela visíveis.
**Status:** ☐

---

### 4.2 Listagem e Ordenação

#### TC-CLI-005 — Empresa sem clientes
**Esperado:** Mensagem "Nenhum cliente cadastrado"; busca e filtros desabilitados.
**Status:** ☐

---

#### TC-CLI-006 — Prioridade visual: clientes da filial atual aparecem primeiro
**Pré-condições:** Usuário logado pertence à filial A. Existem clientes das filiais A e B.
**Esperado:**
- Clientes com `origin_branch_id = filial A` aparecem no topo.
- Dentro de cada grupo, ordenados alfabeticamente por nome.
- Badge "Prioridade" aparece na coluna Filial de origem para esses clientes.
**Status:** ☐

---

#### TC-CLI-007 — Badge "Prioridade" não aparece para outras filiais
**Esperado:** Clientes de outras filiais não têm badge na coluna Filial de origem.
**Status:** ☐

---

#### TC-CLI-008 — Pill de filial atual no cabeçalho
**Esperado:** Quando o usuário tem `currentBranchId`, aparece pill com texto "Clientes da filial X aparecem primeiro nesta listagem."
**Status:** ☐

---

#### TC-CLI-009 — Colunas responsivas
**Esperado:**
- Sempre visíveis: **Cliente** e **Contato** e **Status** e **Ações**.
- ≥ md: aparece **Documento**.
- ≥ lg: aparece **Filial de origem**.
- ≥ xl: aparece **Endereço**.
**Status:** ☐

---

#### TC-CLI-010 — Coluna Endereço exibe `buildAddress`
**Pré-condições:** Cliente com rua, número, complemento, cidade, estado e CEP preenchidos.
**Esperado:** Coluna exibe no formato `Rua, Número | Complemento | Cidade - UF | CEP`.
**Status:** ☐

---

#### TC-CLI-011 — Coluna Endereço mostra `—` quando vazio
**Esperado:** Clientes sem endereço mostram `—` na coluna.
**Status:** ☐

---

#### TC-CLI-012 — Coluna Status: dois badges empilhados
**Esperado:** Ativo/Inativo (verde ou cinza) + Classificação (cor por tipo), um abaixo do outro.
**Status:** ☐

---

#### TC-CLI-013 — Observações aparecem abaixo do nome
**Pré-condições:** Cliente com `notes` preenchido.
**Esperado:** Texto de observações em tamanho menor e truncado abaixo do nome.
**Status:** ☐

---

### 4.3 Busca e Filtros

#### TC-CLI-014 — Busca por nome
**Esperado:** Filtra por substring case-insensitive.
**Status:** ☐

---

#### TC-CLI-015 — Busca por documento (CPF/CNPJ)
**Esperado:** Busca pela string formatada ou apenas pelos dígitos.
**Status:** ☐

---

#### TC-CLI-016 — Busca por telefone e e-mail
**Esperado:** Filtra corretamente.
**Status:** ☐

---

#### TC-CLI-017 — Busca por endereço (campo `address`)
**Esperado:** Filtra pela string consolidada de endereço.
**Status:** ☐

---

#### TC-CLI-018 — Busca por observações
**Esperado:** Texto em `notes` é pesquisável.
**Status:** ☐

---

#### TC-CLI-019 — Busca por nome de filial de origem
**Esperado:** Clientes cuja filial contém o texto buscado aparecem.
**Status:** ☐

---

#### TC-CLI-020 — Filtro por Filial de origem (multi-seleção)
**Esperado:** Lista exibe apenas clientes das filiais marcadas; contagem correta.
**Status:** ☐

---

#### TC-CLI-021 — Filtro por Status (Ativo / Inativo)
**Esperado:**
- "Ativos": apenas `active = true`.
- "Inativos": apenas `active = false`.
- Ambos marcados: todos.
**Status:** ☐

---

#### TC-CLI-022 — Filtro por Classificação (multi-seleção)
**Esperado:** Selecionar "VIP" e "Recorrente" mostra apenas esses dois grupos.
**Status:** ☐

---

#### TC-CLI-023 — Contagens nos filtros são corretas
**Esperado:** Cada badge de contagem no popover corresponde ao número real de clientes naquele grupo.
**Status:** ☐

---

#### TC-CLI-024 — Combinação de busca + múltiplos filtros
**Esperado:** Resultado é interseção (AND) entre busca e cada grupo de filtro.
**Status:** ☐

---

#### TC-CLI-025 — Botão "Limpar filtros"
**Esperado:** Aparece somente com filtros ativos; ao clicar, zera tudo e mostra todos os clientes.
**Status:** ☐

---

#### TC-CLI-026 — "Nenhum resultado" com botão interno de limpar
**Pré-condições:** Empresa tem clientes, mas filtro sem match.
**Esperado:** Mensagem específica + botão "Limpar filtros" interno ao card.
**Status:** ☐

---

### 4.4 Paginação

#### TC-CLI-027 — Paginação com >10 clientes
**Esperado:** Controles de paginação exibidos; padrão 10 por página.
**Status:** ☐

---

#### TC-CLI-028 — Trocar quantidade de linhas por página
**Esperado:** Lista atualiza imediatamente; volta para página 1.
**Status:** ☐

---

#### TC-CLI-029 — Filtrar reseta para página 1
**Pré-condições:** Estar na página 3.
**Esperado:** Qualquer mudança de filtro leva de volta à página 1.
**Status:** ☐

---

### 4.5 Cadastro

#### TC-CLI-030 — Abertura do diálogo
**Esperado:**
- Título "Novo Cliente".
- Filial de origem pré-selecionada com a filial do usuário (ou matriz, ou primeira).
- Ativo marcado; classificação padrão "Novo"; "Definir manualmente" desmarcado.
**Status:** ☐

---

#### TC-CLI-031 — Validação: nome obrigatório
**Esperado:** Erro "Nome é obrigatório".
**Status:** ☐

---

#### TC-CLI-032 — Validação: nome < 3 caracteres
**Esperado:** Erro "O nome deve ter no mínimo 3 caracteres".
**Status:** ☐

---

#### TC-CLI-033 — Validação: nome > 120 caracteres
**Esperado:** Erro "O nome deve ter no máximo 120 caracteres".
**Status:** ☐

---

#### TC-CLI-034 — Validação: CPF/CNPJ obrigatório
**Esperado:** Erro "CPF/CNPJ é obrigatório".
**Status:** ☐

---

#### TC-CLI-035 — Validação: CPF/CNPJ com dígitos insuficientes
**Passos:** Digitar 10 dígitos (< 11).
**Esperado:** Erro "Informe um CPF/CNPJ válido".
**Status:** ☐

---

#### TC-CLI-036 — Validação: CPF (11 dígitos) aceito
**Esperado:** Sem erro de formato; máscara `000.000.000-00`.
**Status:** ☐

---

#### TC-CLI-037 — Validação: CNPJ (14 dígitos) aceito
**Esperado:** Sem erro de formato; máscara `00.000.000/0000-00`.
**Status:** ☐

---

#### TC-CLI-038 — Validação: dígitos entre 12 e 13 inválidos
**Passos:** Digitar 12 ou 13 dígitos.
**Esperado:** Erro "Informe um CPF/CNPJ válido".
**Status:** ☐

---

#### TC-CLI-039 — Validação: telefone obrigatório
**Esperado:** Erro "Telefone é obrigatório".
**Status:** ☐

---

#### TC-CLI-040 — Validação: telefone com 10 dígitos (fixo) aceito
**Esperado:** Máscara `(00) 0000-0000`; sem erro.
**Status:** ☐

---

#### TC-CLI-041 — Validação: telefone com 11 dígitos (celular) aceito
**Esperado:** Máscara `(00) 00000-0000`; sem erro.
**Status:** ☐

---

#### TC-CLI-042 — Validação: telefone com 9 dígitos inválido
**Esperado:** Erro "Informe um telefone válido".
**Status:** ☐

---

#### TC-CLI-043 — Validação: filial de origem obrigatória
**Esperado:** Erro "Filial de origem é obrigatória".
**Status:** ☐

---

#### TC-CLI-044 — E-mail opcional aceito vazio
**Esperado:** Cadastro realizado normalmente sem e-mail.
**Status:** ☐

---

#### TC-CLI-045 — Validação: e-mail inválido
**Passos:** Digitar `abc`.
**Esperado:** Erro "E-mail inválido".
**Status:** ☐

---

#### TC-CLI-046 — CEP: auto-preenchimento via ViaCEP
**Passos:** Digitar CEP `01310-100`.
**Esperado:** Spinner no campo CEP; Rua, Cidade e Estado preenchidos automaticamente.
**Status:** ☐

---

#### TC-CLI-047 — CEP: ViaCEP não bloqueia quando CEP inexistente
**Esperado:** Campos ficam vazios; formulário continua usável.
**Status:** ☐

---

#### TC-CLI-048 — Estado: seletor com 27 estados
**Esperado:** Dropdown lista todos os estados brasileiros com nome e sigla; permite selecionar qualquer um.
**Status:** ☐

---

#### TC-CLI-049 — Estado preenchido pelo ViaCEP seleciona corretamente no Select
**Passos:** Usar ViaCEP com CEP de SP.
**Esperado:** Select mostra "São Paulo (SP)" selecionado automaticamente.
**Status:** ☐

---

#### TC-CLI-050 — Classificação: botões desabilitados por padrão
**Esperado:** Pills de classificação não clicáveis enquanto "Definir manualmente" estiver desmarcado.
**Status:** ☐

---

#### TC-CLI-051 — Classificação: habilitar modo manual
**Passos:** Marcar "Definir manualmente".
**Esperado:** Pills ficam clicáveis; clicar em qualquer um seleciona e destaca a cor correspondente.
**Status:** ☐

---

#### TC-CLI-052 — Classificação: cores por tipo
**Esperado:**
- Novo: cinza/slate.
- Recorrente: azul.
- VIP: amarelo.
- Inadimplente: vermelho.
**Status:** ☐

---

#### TC-CLI-053 — Observações: limite de 500 caracteres
**Passos:** Colar 501 caracteres.
**Esperado:** Erro "As observações devem ter no máximo 500 caracteres".
**Status:** ☐

---

#### TC-CLI-054 — Cadastro com sucesso (campos mínimos)
**Passos:** Preencher nome, CPF, telefone e filial de origem.
**Esperado:** Toast "Cliente cadastrado com sucesso."; modal fecha; cliente aparece na listagem; audit_log `create`.
**Status:** ☐

---

#### TC-CLI-055 — Cadastro com sucesso (todos os campos)
**Esperado:** Todos os dados salvos; endereço consolidado na coluna Endereço; classificação correta.
**Status:** ☐

---

#### TC-CLI-056 — Estado salvo em maiúsculas
**Passos:** Independente da seleção (ViaCEP ou manual), verificar no banco.
**Esperado:** Campo `state` gravado como sigla em maiúsculas (`SP`, `RJ`, etc.).
**Status:** ☐

---

#### TC-CLI-057 — Botões desabilitados durante envio
**Esperado:** "Salvar Cliente" em loading; "Cancelar" desabilitado.
**Status:** ☐

---

#### TC-CLI-058 — Cancelar / fechar pelo X
**Esperado:** Modal fecha sem salvar.
**Status:** ☐

---

### 4.6 Unicidade de Documento (CPF/CNPJ)

#### TC-CLI-059 — Cadastro com CPF já em uso por cliente ativo
**Esperado:** Toast "Já existe um cliente ativo com este CPF/CNPJ."; nada gravado.
**Status:** ☐

---

#### TC-CLI-060 — Cadastro com CNPJ já em uso
**Esperado:** Mesma mensagem de duplicidade.
**Status:** ☐

---

#### TC-CLI-061 — Cadastro com CPF de cliente excluído (soft deleted)
**Pré-condições:** Excluir cliente com CPF X; o campo `document` foi arquivado com sufixo `[deleted:...]`.
**Esperado:** Novo cadastro com o mesmo CPF X é aceito normalmente.
**Status:** ☐

---

#### TC-CLI-062 — Edição mantendo o próprio documento
**Esperado:** Atualizar outros campos sem alterar o CPF não gera erro de duplicidade.
**Status:** ☐

---

#### TC-CLI-063 — Edição alterando para documento de outro cliente ativo
**Esperado:** Toast "Já existe um cliente ativo com este CPF/CNPJ.".
**Status:** ☐

---

### 4.7 Edição

#### TC-CLI-064 — Abertura do diálogo de edição
**Esperado:** Todos os campos pré-preenchidos; título "Editar Cliente".
**Status:** ☐

---

#### TC-CLI-065 — Edição com sucesso
**Passos:** Alterar nome e telefone.
**Esperado:** Toast "Cliente atualizado com sucesso."; listagem reflete mudança; audit_log `update`.
**Status:** ☐

---

#### TC-CLI-066 — Edição: recalcular `address` consolidado
**Passos:** Alterar rua ou número.
**Esperado:** Campo `address` no banco reflete o novo valor composto.
**Status:** ☐

---

#### TC-CLI-067 — Edição de classificação com modo manual
**Passos:** Marcar "Definir manualmente", escolher "VIP", salvar.
**Esperado:** Badge de classificação muda para VIP na listagem.
**Status:** ☐

---

#### TC-CLI-068 — Desmarcar modo manual mantém última classificação
**Passos:** Salvar com `classification_manual = false`.
**Esperado:** `classification_manual` = false no banco; classificação atual preservada até próximo recálculo automático.
**Status:** ☐

---

#### TC-CLI-069 — Inativar cliente
**Passos:** Desmarcar "Cliente ativo", salvar.
**Esperado:** Badge "Inativo" na coluna Status; filtro "Inativos" passa a incluir o cliente.
**Status:** ☐

---

#### TC-CLI-070 — Edição não altera cliente de outra empresa (multi-tenant)
**Passos:** Forçar `updateClient` com ID da empresa B via DevTools.
**Esperado:** Erro "Cliente não encontrado.".
**Status:** ☐

---

#### TC-CLI-071 — Reabrir diálogo para outro cliente não mistura dados
**Passos:** Editar cliente X, fechar; editar cliente Y.
**Esperado:** Modal exibe dados de Y sem resíduo de X.
**Status:** ☐

---

### 4.8 Exclusão (Soft Delete com Arquivamento de Documento)

#### TC-CLI-072 — Abertura do diálogo de exclusão
**Esperado:** Modal de confirmação com nome em negrito e aviso sobre preservação do histórico.
**Status:** ☐

---

#### TC-CLI-073 — Cancelar exclusão
**Esperado:** Modal fecha; cliente permanece na listagem.
**Status:** ☐

---

#### TC-CLI-074 — Exclusão com sucesso
**Esperado:**
- Toast `Cliente "X" removido da listagem com sucesso.`
- Cliente desaparece imediatamente da grid.
- Banco: `deleted_at`, `deleted_by`, `active=false`.
- Campo `document` arquivado: `<CPF_original> [deleted:<timestamp>:<id>]`.
- audit_log `soft_delete` com `original_document`.
**Status:** ☐

---

#### TC-CLI-075 — Exclusão libera CPF/CNPJ para reutilização
**Passos:** Após excluir cliente com CPF X, cadastrar novo com o mesmo CPF X.
**Esperado:** Novo cadastro aceito normalmente; o cliente excluído não aparece na listagem.
**Status:** ☐

---

#### TC-CLI-076 — Botão "Excluir da Listagem" desabilitado durante envio
**Esperado:** Texto muda para "Excluindo..." e botão fica desabilitado.
**Status:** ☐

---

#### TC-CLI-077 — Persistência após reload
**Esperado:** Cliente não retorna após F5.
**Status:** ☐

---

#### TC-CLI-078 — Não é possível editar cliente já excluído (chamada forçada)
**Passos:** Forçar `updateClient` com ID de cliente com `deleted_at` preenchido.
**Esperado:** Erro "Cliente não encontrado.".
**Status:** ☐

---

### 4.9 Responsividade e Acessibilidade

#### TC-CLI-079 — Layout mobile (375px)
**Esperado:** Tabela com scroll horizontal; colunas Documento, Filial e Endereço ocultas; layout legível.
**Status:** ☐

---

#### TC-CLI-080 — Diálogo com scroll em tela baixa
**Esperado:** Modal respeita `max-h-[90vh]` e permite scroll interno para formulário longo.
**Status:** ☐

---

#### TC-CLI-081 — Grid 3 colunas no diálogo (≥ xl)
**Esperado:** Em viewport largo (≥ 1280px), os campos se organizam em 3 colunas.
**Status:** ☐

---

#### TC-CLI-082 — Navegação por teclado no diálogo
**Esperado:** Tab percorre campos na ordem lógica; Esc fecha o modal; Enter no botão salva.
**Status:** ☐

---

### 4.10 Casos de Borda

#### TC-CLI-083 — Nome com caracteres especiais
**Passos:** Cadastrar `José D'Ávila & Cia Ltda`.
**Esperado:** Salvo e exibido corretamente.
**Status:** ☐

---

#### TC-CLI-084 — Tentativa de XSS no nome
**Passos:** Cadastrar `<script>alert(1)</script>`.
**Esperado:** Texto renderizado como string; nenhum script executado.
**Status:** ☐

---

#### TC-CLI-085 — Edição concorrente em duas abas
**Esperado:** Última gravação prevalece sem erro de aplicação. (Documentar comportamento.)
**Status:** ☐

---

#### TC-CLI-086 — Excluir cliente já excluído em outra aba
**Esperado:** Toast "Cliente não encontrado.".
**Status:** ☐

---

#### TC-CLI-087 — Sessão expira durante o uso
**Esperado:** Próxima action retorna erro de autenticação ou redirect para `/login`.
**Status:** ☐

---

#### TC-CLI-088 — Filial de origem inativada após cadastro do cliente
**Pré-condições:** Cliente vinculado à filial Y; depois desativar Y.
**Esperado:**
- Listagem ainda mostra o vínculo com Y.
- Ao editar, o select de filial de origem inclui **todas** as filiais (não filtra ativas — confirmar comportamento real e documentar).
**Status:** ☐

---

#### TC-CLI-089 — Duplo clique em "Salvar Cliente"
**Esperado:** Apenas uma requisição enviada; não duplica o cliente no banco.
**Status:** ☐

---

## 5. Resumo da Execução

| Métrica | Valor |
|---|---|
| Total de casos | 89 |
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
