# Caderno de Testes Manuais — Módulo Filiais

**Versão:** 1.0
**Data:** 2026-04-17
**Responsável:** _________________

## 1. Escopo

Cobertura de testes manuais do módulo de cadastro de filiais, incluindo:

- Listagem em `/dashboard/filiais`
- Diálogo de criação e edição de filial
- Exclusão (soft delete) com regra de bloqueio por vínculo
- Fluxo de onboarding em `/onboarding/filiais`
- Integração com ViaCEP
- Controle de acesso por papel (RBAC) e isolamento multi-tenant

## 2. Pré-requisitos

| # | Item | Descrição |
|---|------|-----------|
| 1 | Empresa A com onboarding concluído | Para testes de dashboard |
| 2 | Empresa B com onboarding concluído | Para testes de isolamento multi-tenant |
| 3 | Usuário OWNER da empresa A | Acesso total |
| 4 | Usuário ADMIN da empresa A | Acesso total ao módulo |
| 5 | Usuário ATENDENTE da empresa A | Sem acesso administrativo |
| 6 | Usuário TÉCNICO da empresa A | Sem acesso administrativo |
| 7 | Pelo menos 1 funcionário ativo vinculado a uma filial específica | Para testar bloqueio de exclusão |
| 8 | Conexão de internet estável | Necessária para ViaCEP |
| 9 | Acesso ao banco (Supabase) para auditoria | Validação de audit_log e soft delete |

## 3. Convenção de Status

- ✅ Passou
- ❌ Falhou (registrar bug)
- ⚠️ Passou com observação
- ⏭️ Não executado

---

## 4. Casos de Teste

### 4.1 Acesso e Autorização

#### TC-FIL-001 — Acesso negado para usuário não autenticado
**Pré-condições:** Sessão deslogada.
**Passos:**
1. Acessar `/dashboard/filiais` diretamente pela URL.

**Resultado esperado:** Redirecionamento para `/login`.
**Status:** ☐

---

#### TC-FIL-002 — Acesso negado para papel ATENDENTE
**Pré-condições:** Login como atendente da empresa A.
**Passos:**
1. Acessar `/dashboard/filiais`.

**Resultado esperado:** Redirecionamento para `/dashboard` (sem acesso ao módulo administrativo).
**Status:** ☐

---

#### TC-FIL-003 — Acesso negado para papel TÉCNICO
**Pré-condições:** Login como técnico da empresa A.
**Passos:**
1. Acessar `/dashboard/filiais`.

**Resultado esperado:** Redirecionamento para `/dashboard`.
**Status:** ☐

---

#### TC-FIL-004 — Acesso permitido para OWNER
**Pré-condições:** Login como owner da empresa A.
**Passos:**
1. Acessar `/dashboard/filiais`.

**Resultado esperado:** Página carrega listagem; botão "Nova Filial" visível.
**Status:** ☐

---

#### TC-FIL-005 — Acesso permitido para ADMIN
**Pré-condições:** Login como admin da empresa A.
**Passos:**
1. Acessar `/dashboard/filiais`.

**Resultado esperado:** Página carrega listagem; botão "Nova Filial" visível; ações de editar/excluir disponíveis.
**Status:** ☐

---

### 4.2 Listagem

#### TC-FIL-006 — Empresa sem filiais
**Pré-condições:** Empresa sem filiais ativas.
**Passos:**
1. Acessar `/dashboard/filiais`.

**Resultado esperado:** Mensagem "Nenhuma filial cadastrada" + texto orientando a usar o botão "Nova Filial".
**Status:** ☐

---

#### TC-FIL-007 — Listagem com múltiplas filiais
**Pré-condições:** Empresa com 3+ filiais.
**Passos:**
1. Acessar a página.

**Resultado esperado:**
- Cards exibidos em grid (1 col mobile / 2 cols tablet / 3 cols desktop).
- Ordem: ascendente por data de criação.
- Filiais com `deleted_at` NÃO aparecem.
**Status:** ☐

---

#### TC-FIL-008 — Card exibe badge "Matriz"
**Pré-condições:** Existe ao menos uma filial com `is_main = true`.
**Passos:**
1. Acessar a listagem.

**Resultado esperado:** Card da filial principal exibe badge "Matriz".
**Status:** ☐

---

#### TC-FIL-009 — Card exibe badge "Inativa"
**Pré-condições:** Editar uma filial e desmarcar "Filial Ativa".
**Passos:**
1. Salvar e voltar para a listagem.

**Resultado esperado:** Card mostra badge "Inativa" em vermelho.
**Status:** ☐

---

#### TC-FIL-010 — Fallback de cidade/telefone
**Pré-condições:** Cadastrar filial preenchendo apenas o nome.
**Passos:**
1. Visualizar card na listagem.

**Resultado esperado:**
- Texto "Endereço não informado" no lugar de cidade/UF.
- Texto "Sem telefone" no campo de telefone.
**Status:** ☐

---

#### TC-FIL-011 — Botões de ação aparecem no hover (desktop)
**Pré-condições:** Resolução desktop (≥ 768px).
**Passos:**
1. Posicionar o cursor sobre um card.

**Resultado esperado:** Ícones de editar e excluir surgem no canto superior direito.
**Status:** ☐

---

#### TC-FIL-012 — Botões de ação sempre visíveis em mobile
**Pré-condições:** Resolução mobile (< 768px).
**Passos:**
1. Acessar a listagem em viewport mobile.

**Resultado esperado:** Ícones de editar e excluir já visíveis sem hover.
**Status:** ☐

---

### 4.3 Cadastro (Criar Filial)

#### TC-FIL-013 — Abertura do diálogo de nova filial
**Passos:**
1. Clicar em "Nova Filial".

**Resultado esperado:** Modal abre com título "Nova Filial", todos os campos vazios e checkbox "Filial Ativa" marcado.
**Status:** ☐

---

#### TC-FIL-014 — Validação: nome obrigatório
**Passos:**
1. Abrir o diálogo.
2. Deixar o nome em branco.
3. Clicar em "Salvar Filial".

**Resultado esperado:** Mensagem de erro "Nome da filial é obrigatório" abaixo do campo; nenhuma requisição enviada.
**Status:** ☐

---

#### TC-FIL-015 — Validação: nome com menos de 3 caracteres
**Passos:**
1. Preencher nome com `AB`.
2. Salvar.

**Resultado esperado:** Erro "O nome deve ter no mínimo 3 caracteres".
**Status:** ☐

---

#### TC-FIL-016 — Validação: nome com mais de 100 caracteres
**Passos:**
1. Colar 101 caracteres no nome.
2. Salvar.

**Resultado esperado:** Erro "O nome deve ter no máximo 100 caracteres".
**Status:** ☐

---

#### TC-FIL-017 — Validação: nome com apenas espaços
**Passos:**
1. Preencher nome com `"   "` (espaços).
2. Salvar.

**Resultado esperado:** Erro de obrigatoriedade ou de mínimo (após `trim`).
**Status:** ☐

---

#### TC-FIL-018 — Máscara de telefone
**Passos:**
1. Digitar `11987654321` no campo Telefone.

**Resultado esperado:** Campo formata como `(11) 98765-4321`.
**Status:** ☐

---

#### TC-FIL-019 — Máscara de CEP
**Passos:**
1. Digitar `01310100` no campo CEP.

**Resultado esperado:** Campo formata como `01310-100`.
**Status:** ☐

---

#### TC-FIL-020 — Auto-preenchimento via ViaCEP (CEP válido)
**Passos:**
1. Preencher o CEP `01310-100`.
2. Aguardar a busca.

**Resultado esperado:**
- Spinner aparece à direita do campo CEP enquanto busca.
- Campos Endereço, Cidade e UF são preenchidos automaticamente.
**Status:** ☐

---

#### TC-FIL-021 — ViaCEP: CEP inexistente
**Passos:**
1. Preencher um CEP válido em formato mas inexistente (ex.: `00000-000`).

**Resultado esperado:** Nenhum campo é preenchido; sem erro travando o formulário.
**Status:** ☐

---

#### TC-FIL-022 — ViaCEP: CEP incompleto
**Passos:**
1. Preencher apenas 5 dígitos no CEP.

**Resultado esperado:** Nenhuma chamada à API; campos permanecem vazios.
**Status:** ☐

---

#### TC-FIL-023 — ViaCEP: sem internet
**Pré-condições:** Desligar a conexão.
**Passos:**
1. Digitar um CEP válido.

**Resultado esperado:** Falha silenciosa, formulário continua utilizável; usuário pode preencher manualmente.
**Status:** ☐

---

#### TC-FIL-024 — UF aceita até 2 caracteres
**Passos:**
1. Tentar digitar `SPP` no campo UF.

**Resultado esperado:** Campo limita a 2 caracteres (`SP`).
**Status:** ☐

---

#### TC-FIL-025 — Cadastro com sucesso (todos os campos)
**Passos:**
1. Preencher todos os campos com dados válidos.
2. Salvar.

**Resultado esperado:**
- Toast verde "Filial cadastrada com sucesso.".
- Modal fecha.
- Card da nova filial aparece na listagem.
- Registro criado em `audit_log` com action `create`.
**Status:** ☐

---

#### TC-FIL-026 — Cadastro com apenas o nome
**Passos:**
1. Preencher só o nome, salvar.

**Resultado esperado:** Cadastro realizado; card mostra fallbacks (sem telefone / endereço).
**Status:** ☐

---

#### TC-FIL-027 — Botão "Salvar" desabilitado durante envio
**Passos:**
1. Salvar e observar o botão.

**Resultado esperado:** Botão fica em estado loading e desabilitado, impedindo duplo clique.
**Status:** ☐

---

#### TC-FIL-028 — Botão "Cancelar" desabilitado durante envio
**Passos:**
1. Salvar e observar o botão Cancelar.

**Resultado esperado:** Botão "Cancelar" também desabilitado durante a transição.
**Status:** ☐

---

#### TC-FIL-029 — Cancelar fecha o diálogo sem salvar
**Passos:**
1. Preencher campos.
2. Clicar em "Cancelar".

**Resultado esperado:** Modal fecha, nenhuma filial criada, listagem inalterada.
**Status:** ☐

---

#### TC-FIL-030 — Fechar pelo X / overlay
**Passos:**
1. Abrir o diálogo, fechar pelo botão X (ou clicando fora).

**Resultado esperado:** Modal fecha sem salvar.
**Status:** ☐

---

#### TC-FIL-031 — Reabrir diálogo limpa o estado
**Passos:**
1. Preencher dados, fechar (sem salvar).
2. Clicar em "Nova Filial" novamente.

**Resultado esperado:** Formulário aparece em branco.
**Status:** ☐

---

### 4.4 Edição

#### TC-FIL-032 — Abertura do diálogo de edição
**Passos:**
1. Clicar no ícone de editar de um card.

**Resultado esperado:** Modal abre com título "Editar Filial" e todos os campos pré-preenchidos.
**Status:** ☐

---

#### TC-FIL-033 — Edição com sucesso
**Passos:**
1. Alterar nome e cidade.
2. Salvar.

**Resultado esperado:**
- Toast verde "Filial atualizada com sucesso.".
- Card reflete as alterações.
- Registro `update` no `audit_log`.
**Status:** ☐

---

#### TC-FIL-034 — Edição: marcar/desmarcar "Filial Ativa"
**Passos:**
1. Editar uma filial, alternar o checkbox Ativa, salvar.

**Resultado esperado:** Badge "Inativa" aparece/desaparece conforme o estado.
**Status:** ☐

---

#### TC-FIL-035 — Edição não altera filial de outra empresa (multi-tenant)
**Pré-condições:** Conhecer o ID de uma filial da empresa B.
**Passos:**
1. Logado como admin da empresa A, tentar editar via DevTools chamando o action com o ID da empresa B.

**Resultado esperado:** Retorna erro "Filial não encontrada."; nada é atualizado.
**Status:** ☐

---

#### TC-FIL-036 — Reabrir edição após troca de filial
**Passos:**
1. Editar filial X, fechar.
2. Editar filial Y.

**Resultado esperado:** Modal mostra os dados de Y, sem resíduos de X.
**Status:** ☐

---

### 4.5 Exclusão (Soft Delete)

#### TC-FIL-037 — Abertura do diálogo de exclusão
**Passos:**
1. Clicar no ícone de lixeira de um card.

**Resultado esperado:** Modal de confirmação exibe nome da filial em negrito e texto sobre histórico para auditoria.
**Status:** ☐

---

#### TC-FIL-038 — Cancelar exclusão
**Passos:**
1. Clicar em "Cancelar" no diálogo de confirmação.

**Resultado esperado:** Modal fecha; filial permanece na listagem.
**Status:** ☐

---

#### TC-FIL-039 — Exclusão de filial sem vínculos
**Pré-condições:** Filial sem funcionários vinculados.
**Passos:**
1. Confirmar exclusão.

**Resultado esperado:**
- Toast "Filial \"X\" removida da listagem com sucesso.".
- Card desaparece imediatamente da grid.
- No banco: `deleted_at`, `deleted_by` e `active=false` definidos.
- Registro `soft_delete` em `audit_log`.
**Status:** ☐

---

#### TC-FIL-040 — Exclusão bloqueada por funcionário vinculado
**Pré-condições:** Filial com 1+ funcionário ativo.
**Passos:**
1. Tentar excluir.

**Resultado esperado:** Toast vermelho "Não é possível excluir uma filial com funcionários vinculados."; filial permanece.
**Status:** ☐

---

#### TC-FIL-041 — Botão "Excluir" desabilitado durante envio
**Passos:**
1. Confirmar e observar o botão.

**Resultado esperado:** Texto muda para "Excluindo..." e fica desabilitado.
**Status:** ☐

---

#### TC-FIL-042 — Filial excluída não retorna após reload
**Passos:**
1. Excluir filial.
2. Recarregar a página (F5).

**Resultado esperado:** Filial não aparece na listagem (filtrada por `deleted_at IS NULL`).
**Status:** ☐

---

#### TC-FIL-043 — Não é possível editar filial já excluída
**Pré-condições:** ID de filial com `deleted_at` preenchido.
**Passos:**
1. Forçar uma chamada de `updateBranch` com esse ID via DevTools/console.

**Resultado esperado:** Erro "Filial não encontrada.".
**Status:** ☐

---

### 4.6 Onboarding `/onboarding/filiais`

#### TC-FIL-044 — Estado inicial
**Pré-condições:** Empresa que acabou de concluir o passo de "empresa".
**Passos:**
1. Acessar a página.

**Resultado esperado:**
- Indicador de progresso no passo 2.
- Uma filial inicial chamada "Filial principal" sem botão Remover.
- Botão "+ Adicionar filial" visível.
**Status:** ☐

---

#### TC-FIL-045 — Validação: nome obrigatório na filial principal
**Passos:**
1. Tentar avançar com o nome vazio.

**Resultado esperado:** Erro de validação no campo Nome.
**Status:** ☐

---

#### TC-FIL-046 — Adicionar nova filial
**Passos:**
1. Clicar em "+ Adicionar filial".

**Resultado esperado:** Aparece bloco "Filial 2" com botão "Remover".
**Status:** ☐

---

#### TC-FIL-047 — Limite máximo de 10 filiais
**Passos:**
1. Adicionar até atingir 10.

**Resultado esperado:** Botão "+ Adicionar filial" desaparece a partir da 10ª.
**Status:** ☐

---

#### TC-FIL-048 — Remover filial adicional
**Passos:**
1. Adicionar 2 filiais extras.
2. Remover a do meio.

**Resultado esperado:** O bloco somem; numeração se reorganiza.
**Status:** ☐

---

#### TC-FIL-049 — UF é convertida para maiúsculas automaticamente
**Passos:**
1. Digitar `sp` no campo UF.

**Resultado esperado:** Campo registra `SP`.
**Status:** ☐

---

#### TC-FIL-050 — ViaCEP funciona em cada filial individualmente
**Passos:**
1. Adicionar 2 filiais e preencher CEPs diferentes em cada uma.

**Resultado esperado:** Cada bloco preenche somente seus próprios campos de endereço.
**Status:** ☐

---

#### TC-FIL-051 — Botão Voltar leva para `/onboarding/empresa`
**Passos:**
1. Clicar em "← Voltar".

**Resultado esperado:** Navegação para o passo anterior, sem perda silenciosa de dados (comportamento esperado por requisito).
**Status:** ☐

---

#### TC-FIL-052 — Avançar com sucesso
**Passos:**
1. Preencher dados válidos.
2. Clicar em "Próximo →".

**Resultado esperado:**
- Loader no botão durante envio.
- Redirecionamento para o próximo passo do onboarding.
- Filiais criadas no banco vinculadas à empresa.
**Status:** ☐

---

#### TC-FIL-053 — Avançar duas vezes (duplo clique)
**Passos:**
1. Clicar rapidamente várias vezes em "Próximo →".

**Resultado esperado:** Apenas uma submissão; sem filiais duplicadas no banco.
**Status:** ☐

---

### 4.7 Responsividade e Acessibilidade

#### TC-FIL-054 — Layout em mobile (375px)
**Passos:**
1. Acessar a listagem em 375px de largura.

**Resultado esperado:** Cards em coluna única; cabeçalho legível; botão Nova Filial não quebra o layout.
**Status:** ☐

---

#### TC-FIL-055 — Layout em tablet (768px)
**Resultado esperado:** Cards em 2 colunas.
**Status:** ☐

---

#### TC-FIL-056 — Layout em desktop (≥ 1024px)
**Resultado esperado:** Cards em 3 colunas.
**Status:** ☐

---

#### TC-FIL-057 — Diálogo com scroll em telas pequenas
**Passos:**
1. Abrir diálogo em viewport baixo (~ 600px de altura).

**Resultado esperado:** Modal limita altura a 90vh e permite scroll interno.
**Status:** ☐

---

#### TC-FIL-058 — Navegação por teclado no diálogo
**Passos:**
1. Abrir o diálogo, navegar com Tab pelos campos.

**Resultado esperado:** Foco percorre na ordem lógica; Enter no botão Salvar dispara submissão; Esc fecha o modal.
**Status:** ☐

---

#### TC-FIL-059 — Aria labels nos botões de ação
**Passos:**
1. Inspecionar botões de editar/excluir nos cards.

**Resultado esperado:** Atributos `aria-label="Editar filial X"` e `aria-label="Excluir filial X"` presentes.
**Status:** ☐

---

### 4.8 Concorrência e Casos de Borda

#### TC-FIL-060 — Edição concorrente
**Passos:**
1. Abrir a mesma filial em duas abas.
2. Editar e salvar em ambas com valores diferentes.

**Resultado esperado:** Última gravação prevalece; não ocorre erro de aplicação. (Documentar comportamento observado.)
**Status:** ☐

---

#### TC-FIL-061 — Exclusão concorrente
**Passos:**
1. Abrir filial em duas abas.
2. Excluir na aba A.
3. Tentar excluir/editar na aba B.

**Resultado esperado:** Aba B exibe toast "Filial não encontrada." sem quebrar a UI.
**Status:** ☐

---

#### TC-FIL-062 — Caracteres especiais no nome
**Passos:**
1. Cadastrar filial com nome `Açaí & Cia – Filial nº 1 / Centro`.

**Resultado esperado:** Salva sem erros; exibido corretamente no card e na auditoria.
**Status:** ☐

---

#### TC-FIL-063 — Tentativa de XSS no nome
**Passos:**
1. Cadastrar com `<script>alert('x')</script>`.

**Resultado esperado:** Texto exibido como string; nenhum script executado.
**Status:** ☐

---

#### TC-FIL-064 — Sessão expira durante o uso
**Passos:**
1. Manter a página aberta até a sessão expirar.
2. Tentar criar uma filial.

**Resultado esperado:** Mensagem de erro de autenticação ou redirecionamento para `/login`; nenhum dado inconsistente persistido.
**Status:** ☐

---

## 5. Resumo da Execução

| Métrica | Valor |
|---|---|
| Total de casos | 64 |
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
