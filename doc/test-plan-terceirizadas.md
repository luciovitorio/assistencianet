# Caderno de Testes Manuais — Módulo Terceirizadas

**Versão:** 1.0
**Data:** 2026-04-17
**Responsável:** _________________

## 1. Escopo

Cobertura de testes manuais do módulo de terceirizadas em `/dashboard/terceiros`, incluindo:

- Listagem ordenada alfabeticamente (sem prioridade por filial)
- Busca e filtros (Tipo, Status) e paginação
- Diálogo de cadastro e edição (tipo obrigatório, CPF/CNPJ e telefone opcionais, prazo padrão de retorno)
- Soft delete com arquivamento condicional do CPF/CNPJ
- Unicidade de documento (CPF/CNPJ) entre terceirizadas ativas
- Controle de acesso (`getAdminContext` em todas as actions)
- Isolamento multi-tenant

> **Diferenças importantes em relação a Clientes/Fornecedores:**
> - Sem filial de origem/cadastro → sem prioridade visual e sem pill informativa
> - CPF/CNPJ e telefone são **opcionais** (porém validados se preenchidos)
> - Campo exclusivo: **Prazo padrão de retorno** (`default_return_days`, 1–365 dias)
> - Sem endereço (sem CEP, rua, cidade, estado, ViaCEP)
> - Tipo obrigatório: Fabricante, Técnico especializado, Outro
> - Documento arquivado apenas se não for nulo ao excluir
> - Status exibido no feminino: "Ativa"/"Inativa"

## 2. Pré-requisitos

| # | Item |
|---|------|
| 1 | Empresa A com onboarding concluído |
| 2 | Empresa B (para testes multi-tenant) |
| 3 | Usuário OWNER e ADMIN da empresa A |
| 4 | Usuário ATENDENTE e TÉCNICO da empresa A |
| 5 | Pelo menos 1 terceirizada com `active = false` |
| 6 | Terceirizadas dos 3 tipos cadastradas (fabricante, técnico especializado, outro) |
| 7 | CPF e CNPJ válidos (fictícios) para os testes |
| 8 | CNPJ já cadastrado em terceirizada ativa (para teste de duplicidade) |
| 9 | Acesso ao banco para auditar `audit_log`, `third_parties.deleted_at` e `third_parties.document` |

## 3. Convenção de Status

- ✅ Passou ❌ Falhou ⚠️ Passou com observação ⏭️ Não executado

---

## 4. Casos de Teste

### 4.1 Acesso e Autorização

#### TC-TERC-001 — Acesso negado para usuário não autenticado
**Passos:** Acessar `/dashboard/terceiros` sem login.
**Esperado:** Redirecionamento para `/login`.
**Status:** ☐

---

#### TC-TERC-002 — Acesso negado para papel ATENDENTE
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-TERC-003 — Acesso negado para papel TÉCNICO
**Esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-TERC-004 — Acesso permitido para OWNER e ADMIN
**Esperado:** Página carrega; toolbar, botão "Nova Terceirizada" e tabela visíveis.
**Status:** ☐

---

### 4.2 Listagem e Ordenação

#### TC-TERC-005 — Empresa sem terceirizadas
**Esperado:** Mensagem "Nenhuma terceirizada cadastrada"; busca e filtros desabilitados.
**Status:** ☐

---

#### TC-TERC-006 — Ordenação alfabética por nome
**Pré-condições:** 5+ terceirizadas cadastradas.
**Esperado:** Listagem em ordem A→Z pelo nome (sem qualquer prioridade por filial).
**Status:** ☐

---

#### TC-TERC-007 — Sem pill de prioridade de filial
**Esperado:** Não há pill informativa de filial no cabeçalho (diferente de Clientes/Fornecedores).
**Status:** ☐

---

#### TC-TERC-008 — Colunas responsivas
**Esperado:**
- Sempre visíveis: **Terceirizada**, **Contato**, **Status**, **Ações**.
- ≥ md: surge **Tipo**.
- ≥ lg: surge **Prazo padrão**.
- Não há coluna de Documento ou Endereço.
**Status:** ☐

---

#### TC-TERC-009 — Ícone Building2 ao lado do nome
**Esperado:** Ícone de prédio aparece à esquerda do nome em toda linha.
**Status:** ☐

---

#### TC-TERC-010 — Coluna Tipo exibe rótulo legível
**Esperado:**
- `fabricante` → "Fabricante"
- `tecnico_especializado` → "Técnico especializado"
- `outro` → "Outro"
**Status:** ☐

---

#### TC-TERC-011 — Coluna Prazo padrão com ícone Clock
**Pré-condições:** Terceirizada com `default_return_days` preenchido.
**Esperado:** Exibe "X dias" precedido do ícone Clock.
**Status:** ☐

---

#### TC-TERC-012 — Coluna Prazo padrão vazia exibe `—`
**Esperado:** Terceirizada sem prazo definido exibe `—`.
**Status:** ☐

---

#### TC-TERC-013 — Coluna Status: "Ativa" / "Inativa" (feminino)
**Esperado:** Badge verde ("Ativa") ou cinza ("Inativa") — feminino, diferente dos outros módulos.
**Status:** ☐

---

#### TC-TERC-014 — Observações aparecem abaixo do nome (truncadas, indentadas)
**Pré-condições:** Terceirizada com `notes` preenchido.
**Esperado:** Texto em fonte menor, truncado, abaixo do nome, com `ml-6` (alinhado com o nome, após o ícone).
**Status:** ☐

---

#### TC-TERC-015 — Terceirizadas soft-deleted não aparecem
**Esperado:** Após reload, terceirizada excluída não é exibida.
**Status:** ☐

---

### 4.3 Busca e Filtros

#### TC-TERC-016 — Busca por nome
**Esperado:** Filtra por substring case-insensitive.
**Status:** ☐

---

#### TC-TERC-017 — Busca por documento (CPF/CNPJ)
**Esperado:** Encontra pela string formatada ou pelos dígitos.
**Status:** ☐

---

#### TC-TERC-018 — Busca por telefone e e-mail
**Esperado:** Filtra corretamente por qualquer campo de contato.
**Status:** ☐

---

#### TC-TERC-019 — Busca por observações
**Esperado:** Texto em `notes` é pesquisável.
**Status:** ☐

---

#### TC-TERC-020 — Busca NÃO filtra por tipo (rótulo)
**Passos:** Buscar por "Fabricante" ou "Técnico".
**Esperado:** Nenhum resultado encontrado (o tipo não está na lista de campos buscáveis).
**Status:** ☐

---

#### TC-TERC-021 — Filtro por Tipo (multi-seleção)
**Esperado:** Lista exibe apenas terceirizadas dos tipos marcados; contagem correta.
**Status:** ☐

---

#### TC-TERC-022 — Filtro por Status (Ativas / Inativas)
**Esperado:**
- "Ativas": apenas `active = true`.
- "Inativas": apenas `active = false`.
- Ambos: todos.
**Status:** ☐

---

#### TC-TERC-023 — Contagens nos filtros são corretas
**Esperado:** Badge de contagem corresponde ao número real de terceirizadas em cada grupo.
**Status:** ☐

---

#### TC-TERC-024 — Combinação de busca + filtros
**Esperado:** Resultado é interseção (AND) entre busca e filtros.
**Status:** ☐

---

#### TC-TERC-025 — Botão "Limpar filtros"
**Esperado:** Aparece apenas com filtros ativos; ao clicar, zera tudo.
**Status:** ☐

---

#### TC-TERC-026 — "Nenhum resultado" com botão interno de limpar
**Esperado:** Mensagem específica + botão "Limpar filtros" dentro do card.
**Status:** ☐

---

### 4.4 Paginação

#### TC-TERC-027 — Paginação com >10 terceirizadas
**Esperado:** Controles exibidos; padrão 10 por página; rótulo "terceirizada" no plural correto.
**Status:** ☐

---

#### TC-TERC-028 — Trocar quantidade de linhas por página
**Esperado:** Lista atualiza; volta para página 1.
**Status:** ☐

---

#### TC-TERC-029 — Filtrar reseta para página 1
**Pré-condições:** Estar na página 2+.
**Esperado:** Qualquer mudança de filtro retorna à página 1.
**Status:** ☐

---

### 4.5 Cadastro

#### TC-TERC-030 — Abertura do diálogo
**Esperado:**
- Título "Nova Terceirizada".
- Tipo padrão "Fabricante".
- Ativo marcado por padrão.
- Campos CPF/CNPJ, telefone e prazo em branco (todos opcionais).
- Sem campos de endereço.
**Status:** ☐

---

#### TC-TERC-031 — Validação: nome obrigatório
**Esperado:** Erro "Nome é obrigatório".
**Status:** ☐

---

#### TC-TERC-032 — Validação: nome < 3 caracteres
**Esperado:** Erro "O nome deve ter no mínimo 3 caracteres".
**Status:** ☐

---

#### TC-TERC-033 — Validação: nome > 120 caracteres
**Esperado:** Erro "O nome deve ter no máximo 120 caracteres".
**Status:** ☐

---

#### TC-TERC-034 — Select Tipo: 3 opções
**Esperado:** Dropdown lista exatamente Fabricante, Técnico especializado, Outro.
**Status:** ☐

---

#### TC-TERC-035 — CPF/CNPJ opcional aceito vazio
**Esperado:** Cadastro realizado sem documento; coluna não tem campo próprio para exibir.
**Status:** ☐

---

#### TC-TERC-036 — CPF/CNPJ preenchido: 11 dígitos aceito (CPF)
**Esperado:** Máscara `000.000.000-00`; sem erro.
**Status:** ☐

---

#### TC-TERC-037 — CPF/CNPJ preenchido: 14 dígitos aceito (CNPJ)
**Esperado:** Máscara `00.000.000/0000-00`; sem erro.
**Status:** ☐

---

#### TC-TERC-038 — CPF/CNPJ preenchido: dígitos inválidos (ex. 10 dígitos)
**Esperado:** Erro "Informe um CPF/CNPJ válido".
**Status:** ☐

---

#### TC-TERC-039 — Telefone opcional aceito vazio
**Esperado:** Cadastro realizado sem telefone; coluna Contato exibe `—`.
**Status:** ☐

---

#### TC-TERC-040 — Telefone preenchido: fixo (10 dígitos) aceito
**Esperado:** Máscara `(00) 0000-0000`; sem erro.
**Status:** ☐

---

#### TC-TERC-041 — Telefone preenchido: celular (11 dígitos) aceito
**Esperado:** Máscara `(00) 00000-0000`; sem erro.
**Status:** ☐

---

#### TC-TERC-042 — Telefone preenchido: 9 dígitos inválido
**Esperado:** Erro "Informe um telefone válido".
**Status:** ☐

---

#### TC-TERC-043 — E-mail opcional aceito vazio
**Esperado:** Cadastro sem e-mail realizado normalmente.
**Status:** ☐

---

#### TC-TERC-044 — E-mail inválido
**Passos:** Digitar `nao-e-email`.
**Esperado:** Erro "E-mail inválido".
**Status:** ☐

---

#### TC-TERC-045 — Prazo padrão: campo vazio aceito (opcional)
**Esperado:** Sem prazo definido; coluna exibe `—`.
**Status:** ☐

---

#### TC-TERC-046 — Prazo padrão: valor 1 (mínimo aceito)
**Esperado:** Salvo com `default_return_days = 1`; coluna exibe "1 dias".
**Status:** ☐

---

#### TC-TERC-047 — Prazo padrão: valor 365 (máximo aceito)
**Esperado:** Salvo sem erro; coluna exibe "365 dias".
**Status:** ☐

---

#### TC-TERC-048 — Prazo padrão: valor 0 inválido
**Esperado:** Erro "O prazo deve ser de pelo menos 1 dia".
**Status:** ☐

---

#### TC-TERC-049 — Prazo padrão: valor 366 inválido
**Esperado:** Erro "O prazo não pode ultrapassar 365 dias".
**Status:** ☐

---

#### TC-TERC-050 — Prazo padrão: valor decimal inválido
**Passos:** Digitar `15.5`.
**Esperado:** Erro "O prazo deve ser em dias inteiros".
**Status:** ☐

---

#### TC-TERC-051 — Prazo padrão: input numérico limitado pelo HTML (min=1, max=365)
**Esperado:** Controles nativos do input type=number respeitam os limites visualmente.
**Status:** ☐

---

#### TC-TERC-052 — Observações: limite de 500 caracteres
**Passos:** Colar 501 caracteres.
**Esperado:** Erro "As observações devem ter no máximo 500 caracteres".
**Status:** ☐

---

#### TC-TERC-053 — Observações: placeholder específico
**Esperado:** Placeholder "Contato de referência, condições de envio, prazo real, etc."
**Status:** ☐

---

#### TC-TERC-054 — Cadastro com sucesso (só nome e tipo)
**Passos:** Preencher apenas nome; manter tipo padrão; salvar.
**Esperado:** Toast "Terceirizada cadastrada com sucesso."; modal fecha; aparece na listagem; audit_log `create`.
**Status:** ☐

---

#### TC-TERC-055 — Cadastro com sucesso (todos os campos)
**Esperado:** Todos os dados salvos; coluna Prazo exibe os dias com ícone Clock; coluna Tipo exibe rótulo correto.
**Status:** ☐

---

#### TC-TERC-056 — Botões desabilitados durante envio
**Esperado:** "Salvar Terceirizada" em loading; "Cancelar" desabilitado.
**Status:** ☐

---

#### TC-TERC-057 — Cancelar / fechar pelo X
**Esperado:** Modal fecha sem salvar.
**Status:** ☐

---

### 4.6 Unicidade de Documento (CPF/CNPJ)

#### TC-TERC-058 — Cadastro com CNPJ já em uso por terceirizada ativa
**Esperado:** Toast "Já existe uma terceirizada ativa com este CPF/CNPJ."; nada gravado.
**Status:** ☐

---

#### TC-TERC-059 — Cadastro com CPF já em uso
**Esperado:** Mesma mensagem de duplicidade.
**Status:** ☐

---

#### TC-TERC-060 — Dois cadastros sem documento: ambos aceitos
**Esperado:** O índice único é condicional ao documento; duas terceirizadas sem CPF/CNPJ coexistem normalmente.
**Status:** ☐

---

#### TC-TERC-061 — Cadastro com CNPJ de terceirizada excluída libera o documento
**Pré-condições:** Excluir terceirizada com CNPJ X; campo `document` arquivado.
**Esperado:** Novo cadastro com CNPJ X é aceito.
**Status:** ☐

---

#### TC-TERC-062 — Excluir terceirizada sem documento: `document` permanece null
**Pré-condições:** Terceirizada sem CPF/CNPJ cadastrado.
**Esperado:** Soft delete funciona; campo `document` no banco permanece `null` (sem sufixo `[deleted:...]`).
**Status:** ☐

---

#### TC-TERC-063 — Edição mantendo o próprio documento
**Esperado:** Não gera erro de duplicidade.
**Status:** ☐

---

#### TC-TERC-064 — Edição alterando para documento de outra terceirizada ativa
**Esperado:** Toast "Já existe uma terceirizada ativa com este CPF/CNPJ.".
**Status:** ☐

---

### 4.7 Edição

#### TC-TERC-065 — Abertura do diálogo de edição
**Esperado:** Todos os campos pré-preenchidos; título "Editar Terceirizada".
**Status:** ☐

---

#### TC-TERC-066 — Edição com sucesso
**Passos:** Alterar nome e prazo.
**Esperado:** Toast "Terceirizada atualizada com sucesso."; listagem reflete mudança; audit_log `update`.
**Status:** ☐

---

#### TC-TERC-067 — Alterar tipo
**Passos:** Mudar de "Fabricante" para "Outro".
**Esperado:** Coluna Tipo atualizada na listagem.
**Status:** ☐

---

#### TC-TERC-068 — Remover prazo padrão (limpar campo)
**Passos:** Apagar o valor do campo Prazo, salvar.
**Esperado:** `default_return_days = null` no banco; coluna volta a exibir `—`.
**Status:** ☐

---

#### TC-TERC-069 — Inativar terceirizada
**Passos:** Desmarcar "Terceirizada ativa", salvar.
**Esperado:** Badge "Inativa" na coluna Status.
**Status:** ☐

---

#### TC-TERC-070 — Reativar terceirizada
**Passos:** Marcar "Terceirizada ativa", salvar.
**Esperado:** Badge "Ativa" retorna.
**Status:** ☐

---

#### TC-TERC-071 — Edição não altera terceirizada de outra empresa (multi-tenant)
**Passos:** Forçar `updateThirdParty` com ID da empresa B.
**Esperado:** Erro "Terceirizada não encontrada.".
**Status:** ☐

---

#### TC-TERC-072 — Reabrir diálogo para outra terceirizada não mistura dados
**Passos:** Editar terceirizada X, fechar; editar terceirizada Y.
**Esperado:** Modal exibe dados de Y sem resíduo de X.
**Status:** ☐

---

### 4.8 Exclusão (Soft Delete)

#### TC-TERC-073 — Abertura do diálogo de exclusão
**Esperado:** Modal com nome em negrito e aviso de histórico preservado.
**Status:** ☐

---

#### TC-TERC-074 — Cancelar exclusão
**Esperado:** Modal fecha; terceirizada permanece.
**Status:** ☐

---

#### TC-TERC-075 — Exclusão com sucesso (com documento)
**Esperado:**
- Toast `"X" removida da listagem com sucesso.` (sem prefixo "Terceirizada", apenas o nome entre aspas).
- Linha desaparece imediatamente.
- Banco: `deleted_at`, `deleted_by`, `active=false`.
- Campo `document` arquivado: `<doc> [deleted:<timestamp>:<id>]`.
- audit_log `soft_delete`.
**Status:** ☐

---

#### TC-TERC-076 — Exclusão de terceirizada sem documento
**Esperado:**
- Mesmos campos definidos (`deleted_at`, `deleted_by`, `active=false`).
- Campo `document` permanece `null` (sem tentar arquivar).
**Status:** ☐

---

#### TC-TERC-077 — Botão "Excluir da Listagem" desabilitado durante envio
**Esperado:** Texto muda para "Excluindo..." e botão fica desabilitado.
**Status:** ☐

---

#### TC-TERC-078 — Persistência após reload
**Esperado:** Terceirizada excluída não retorna após F5.
**Status:** ☐

---

#### TC-TERC-079 — Edição bloqueada para terceirizada já excluída (chamada forçada)
**Passos:** Forçar `updateThirdParty` com ID de registro com `deleted_at` preenchido.
**Esperado:** Erro "Terceirizada não encontrada.".
**Status:** ☐

---

### 4.9 Responsividade e Acessibilidade

#### TC-TERC-080 — Layout mobile (375px)
**Esperado:** Colunas Tipo e Prazo padrão ocultas; conteúdo legível com scroll horizontal se necessário.
**Status:** ☐

---

#### TC-TERC-081 — Diálogo com scroll em tela baixa
**Esperado:** Modal respeita `max-h-[90vh]` e permite scroll interno.
**Status:** ☐

---

#### TC-TERC-082 — Diálogo em 2 colunas (≥ sm)
**Esperado:** Grid `sm:grid-cols-2`; campos Tipo e Prazo lado a lado; campos Nome, E-mail e Observações ocupam as 2 colunas.
**Status:** ☐

---

#### TC-TERC-083 — Navegação por teclado
**Esperado:** Tab percorre campos na ordem lógica; Esc fecha; Enter no botão salva.
**Status:** ☐

---

### 4.10 Integração com OS (referência para o módulo de OS)

> Os casos abaixo impactam o módulo de Terceirizadas indiretamente, mas devem ser anotados aqui para rastreabilidade.

#### TC-TERC-084 — Terceirizada inativa não aparece no modal de envio de OS
**Pré-condições:** Inativar uma terceirizada; abrir o modal de envio para terceirizada em uma OS.
**Esperado:** Terceirizada inativa não consta no select de seleção.
**Status:** ☐

---

#### TC-TERC-085 — Prazo padrão preenche sugestão de data na OS
**Pré-condições:** Terceirizada com `default_return_days = 30`.
**Passos:** No modal de envio de OS, selecionar essa terceirizada.
**Esperado:** Campo "Data prevista de retorno" pré-preenchido com hoje + 30 dias.
**Status:** ☐

---

### 4.11 Casos de Borda

#### TC-TERC-086 — Nome com caracteres especiais
**Passos:** Cadastrar `LG Eletrônicos — Assistência São Paulo / Zona Norte`.
**Esperado:** Salvo e exibido corretamente.
**Status:** ☐

---

#### TC-TERC-087 — Tentativa de XSS no nome
**Passos:** Cadastrar `<script>alert(1)</script>`.
**Esperado:** Texto renderizado como string; nenhum script executado.
**Status:** ☐

---

#### TC-TERC-088 — Edição concorrente em duas abas
**Esperado:** Última gravação prevalece sem erro. (Documentar comportamento.)
**Status:** ☐

---

#### TC-TERC-089 — Excluir terceirizada já excluída em outra aba
**Esperado:** Toast "Terceirizada não encontrada.".
**Status:** ☐

---

#### TC-TERC-090 — Duplo clique em "Salvar Terceirizada"
**Esperado:** Apenas uma requisição enviada; não duplica no banco.
**Status:** ☐

---

#### TC-TERC-091 — Sessão expira durante o uso
**Esperado:** Próxima action retorna erro de autenticação ou redireciona para `/login`.
**Status:** ☐

---

## 5. Resumo da Execução

| Métrica | Valor |
|---|---|
| Total de casos | 91 |
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
