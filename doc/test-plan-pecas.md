# Caderno de Testes — Módulo: Peças

**Caminho:** `/dashboard/pecas`
**Data de criação:** 2026-04-17
**Objetivo:** Verificar o funcionamento completo do módulo de cadastro e gerenciamento de peças, cobrindo RBAC, listagem, cadastro, edição, exclusão e casos de borda.

---

## 1. RBAC — Controle de Acesso por Papel

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.1 | Acesso como **owner** | Logar como owner → acessar `/dashboard/pecas` | Página carrega normalmente com botão "Nova Peça" visível |
| 1.2 | Acesso como **admin** | Logar como admin → acessar `/dashboard/pecas` | Página carrega normalmente com botão "Nova Peça" visível |
| 1.3 | Acesso como **atendente** | Logar como atendente → acessar `/dashboard/pecas` | Redirecionado para `/dashboard` (sem acesso) |
| 1.4 | Acesso como **técnico** | Logar como técnico → acessar `/dashboard/pecas` | Redirecionado para `/dashboard` (sem acesso) |
| 1.5 | Botão "Nova Peça" sem guard | Logar como admin → verificar botão "Nova Peça" | Botão visível sem necessidade de prop `isAdmin` — acesso controlado pela página |
| 1.6 | Server Action — criar como atendente | Tentar invocar `createPart` via atendente (direto ou manipulação de formulário) | Retorna erro de autorização (getAdminContext bloqueia) |
| 1.7 | Server Action — editar como técnico | Tentar invocar `updatePart` via técnico | Retorna erro de autorização |
| 1.8 | Server Action — excluir como atendente | Tentar invocar `deletePart` via atendente | Retorna erro de autorização |

---

## 2. Listagem de Peças

### 2.1 Renderização Geral

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.1.1 | Lista com peças cadastradas | Cadastrar ao menos 2 peças → acessar listagem | Peças exibidas em tabela ordenadas por nome (A→Z) |
| 2.1.2 | Lista vazia | Sem peças cadastradas | Mensagem de estado vazio exibida (sem erros JS) |
| 2.1.3 | Ordenação por nome | Cadastrar peças com nomes "Zebra", "Anel", "Motor" | Exibidas na ordem: Anel, Motor, Zebra |
| 2.1.4 | Peça inativa não exibida | Excluir (soft delete) uma peça → recarregar lista | Peça excluída não aparece na listagem |

### 2.2 Colunas da Tabela

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.2.1 | Coluna Peça — nome | Cadastrar peça "Tela LCD" → verificar listagem | Exibe "Tela LCD" na coluna Peça |
| 2.2.2 | Coluna Peça — SKU em mono font | Cadastrar peça com SKU "TL-001" → verificar listagem | SKU exibido abaixo do nome em fonte monoespaçada |
| 2.2.3 | Coluna Peça — sem SKU | Cadastrar peça sem SKU → verificar listagem | Coluna Peça exibe apenas nome, sem campo SKU |
| 2.2.4 | Badge "Inativa" | Verificar após exclusão (soft delete) | Badge "Inativa" NÃO aparece (registro excluído some da lista) |
| 2.2.5 | Coluna Categoria — badge azul | Cadastrar peça categoria "Peça de Reposição" | Badge azul com texto correto |
| 2.2.6 | Coluna Categoria — badge violeta | Cadastrar peça categoria "Acessório" | Badge violeta com texto correto |
| 2.2.7 | Coluna Categoria — badge slate | Cadastrar peça categoria "Outro" | Badge slate com texto correto |
| 2.2.8 | Coluna Fornecedor padrão (≥md) | Cadastrar peça com fornecedor → visualizar em tela média | Nome do fornecedor exibido na coluna |
| 2.2.9 | Coluna Fornecedor — sem fornecedor | Cadastrar peça sem fornecedor | Coluna exibe "—" ou vazio |
| 2.2.10 | Coluna Custo (≥lg) | Cadastrar peça com custo R$ 25,50 | Exibe "R$ 25,50" alinhado à direita |
| 2.2.11 | Coluna Venda (≥lg) | Cadastrar peça com preço de venda R$ 49,90 | Exibe "R$ 49,90" alinhado à direita |
| 2.2.12 | Colunas de preço sem valor | Cadastrar peça sem preencher custo/venda | Colunas exibem "—" ou R$ 0,00 (verificar comportamento) |
| 2.2.13 | Coluna Est.Mín. — AlertTriangle | Cadastrar peça com min_stock = 5 | Ícone AlertTriangle + número "5" exibido, centralizado (≥md) |
| 2.2.14 | Coluna Est.Mín. — zero | Cadastrar peça com min_stock = 0 | Exibe "—" sem ícone AlertTriangle |
| 2.2.15 | Coluna Ações | Verificar coluna de ações | Ícones/botões de editar e excluir presentes |

### 2.3 Busca

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.3.1 | Busca por nome | Digitar parte do nome de uma peça | Filtra peças cujo nome contém o texto |
| 2.3.2 | Busca por SKU | Digitar o SKU de uma peça | Filtra peça com aquele SKU |
| 2.3.3 | Busca por categoria (label) | Digitar "reposição" | Filtra peças da categoria Peça de Reposição |
| 2.3.4 | Busca por nome do fornecedor | Digitar parte do nome do fornecedor | Filtra peças associadas ao fornecedor |
| 2.3.5 | Busca sem resultado | Digitar texto inexistente | Lista vazia com mensagem de "nenhum resultado" |
| 2.3.6 | Busca case-insensitive | Digitar "TELA" para peça "Tela LCD" | Retorna a peça independente da caixa |
| 2.3.7 | Limpar busca | Apagar texto da busca | Lista retorna ao estado completo |
| 2.3.8 | Debounce da busca | Digitar rapidamente várias letras | Não faz múltiplas requisições por letra — aguarda pausa (useDeferredValue) |

### 2.4 Filtros

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.4.1 | Filtro Categoria — Peça de Reposição | Selecionar filtro "Peça de Reposição" | Lista exibe apenas peças dessa categoria |
| 2.4.2 | Filtro Categoria — Acessório | Selecionar filtro "Acessório" | Lista exibe apenas acessórios |
| 2.4.3 | Filtro Categoria — Outro | Selecionar filtro "Outro" | Lista exibe apenas peças categoria "Outro" |
| 2.4.4 | Filtro Fornecedor — condicional ausente | Sem fornecedores cadastrados no sistema | Filtro "Fornecedor padrão" NÃO é renderizado |
| 2.4.5 | Filtro Fornecedor — presente com fornecedores | Com ao menos um fornecedor ativo | Filtro "Fornecedor padrão" aparece nas opções |
| 2.4.6 | Filtro Fornecedor — selecionar um fornecedor | Selecionar fornecedor específico | Lista exibe apenas peças daquele fornecedor |
| 2.4.7 | Filtro Fornecedor — peças sem fornecedor | Com filtro de fornecedor ativo | Peças sem fornecedor não aparecem |
| 2.4.8 | Combinar filtro Categoria + Fornecedor | Selecionar categoria "Acessório" e fornecedor X | Lista exibe apenas acessórios do fornecedor X |
| 2.4.9 | Sem filtro de status | Verificar opções de filtro disponíveis | NÃO existe filtro de status ativo/inativo (peças inativas somem da lista) |
| 2.4.10 | Limpar filtros | Ativar filtro → clicar em limpar | Filtros removidos, lista retorna completa |

### 2.5 Paginação

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.5.1 | Paginação com muitas peças | Cadastrar mais de 10 peças | Paginação ativada, navegar entre páginas funciona |
| 2.5.2 | Itens por página | Alterar quantidade de itens por página | Lista se ajusta ao novo tamanho |
| 2.5.3 | Paginação com filtro ativo | Filtrar categoria → verificar paginação | Paginação considera apenas resultados filtrados |

---

## 3. Cadastro de Peça (Nova Peça)

### 3.1 Abertura do Dialog

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.1.1 | Abrir dialog | Clicar "Nova Peça" | Dialog abre com formulário em branco |
| 3.1.2 | Título do dialog | Verificar header do dialog | "Nova Peça" |
| 3.1.3 | Largura do dialog | Abrir dialog em tela grande | Dialog com largura `sm:max-w-150` (larga) |
| 3.1.4 | Fechar com X | Clicar no X do dialog | Dialog fecha sem salvar |
| 3.1.5 | Fechar com Cancelar | Clicar em "Cancelar" | Dialog fecha sem salvar |

### 3.2 Validação do Campo Nome

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.2.1 | Nome obrigatório | Submeter com nome vazio | Erro "Nome é obrigatório" |
| 3.2.2 | Nome com 1 caractere | Digitar "A" → submeter | Erro de comprimento mínimo (min 2) |
| 3.2.3 | Nome com 2 caracteres | Digitar "AB" → submeter | Aceito (mínimo é 2) |
| 3.2.4 | Nome com 150 caracteres | Digitar string de 150 chars → submeter | Aceito (máximo é 150) |
| 3.2.5 | Nome com 151 caracteres | Digitar string de 151 chars → submeter | Erro de comprimento máximo |
| 3.2.6 | Nome com espaços nas bordas | Digitar "  Tela LCD  " → submeter | Salva como "Tela LCD" (trim aplicado) |
| 3.2.7 | Nome apenas espaços | Digitar "   " → submeter | Erro "Nome é obrigatório" (trim → vazio) |
| 3.2.8 | Nome ocupa col-span-2 | Verificar layout do formulário | Campo nome ocupa largura total do dialog |

### 3.3 Validação do Campo SKU

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.3.1 | SKU opcional | Salvar peça sem preencher SKU | Salvo sem SKU (null) |
| 3.3.2 | SKU com 50 caracteres | Digitar SKU de 50 chars | Aceito |
| 3.3.3 | SKU com 51 caracteres | Digitar SKU de 51 chars | Erro de comprimento máximo |
| 3.3.4 | SKU com espaços nas bordas | Digitar "  TL-001  " → submeter | Salva como "TL-001" (trim) |
| 3.3.5 | SKU vazio (string vazia) | Limpar campo SKU → submeter | Trata como null (ou(z.literal('')) → nullable) |
| 3.3.6 | SKU duplicado — peça ativa | Cadastrar peça SKU "TL-001" → tentar cadastrar outra com mesmo SKU | Erro "Já existe uma peça ativa com este SKU." |
| 3.3.7 | Dois SKUs vazios | Cadastrar duas peças sem SKU | Ambas salvas com sucesso (índice parcial permite múltiplos null) |
| 3.3.8 | SKU após exclusão — reutilização | Excluir peça com SKU "TL-001" → cadastrar nova com mesmo SKU | Aceito (soft delete NÃO arquiva SKU — sem `[deleted:...]`) |

### 3.4 Validação dos Selects (Categoria e Unidade)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.4.1 | Categoria obrigatória | Submeter sem selecionar categoria | Erro "Categoria é obrigatória" |
| 3.4.2 | Opções de categoria | Abrir select de categoria | 3 opções: Peça de Reposição, Acessório, Outro |
| 3.4.3 | Unidade obrigatória | Submeter sem selecionar unidade | Erro de validação na unidade |
| 3.4.4 | Opções de unidade | Abrir select de unidade | 6 opções: Unidade, Par, Metro, CM, Kit, Rolo |
| 3.4.5 | Selecionar cada categoria | Selecionar cada uma das 3 categorias e salvar | Cada categoria salva corretamente |
| 3.4.6 | Selecionar cada unidade | Selecionar cada uma das 6 unidades e salvar | Cada unidade salva corretamente |

### 3.5 Select de Fornecedor (Opcional)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.5.1 | Opção "Nenhum" | Abrir select fornecedor | Primeira opção é "Nenhum" |
| 3.5.2 | Sem fornecedor selecionado | Salvar com "Nenhum" selecionado | `supplier_id` salvo como null |
| 3.5.3 | Com fornecedor selecionado | Selecionar fornecedor ativo → salvar | `supplier_id` salvo corretamente |
| 3.5.4 | Apenas fornecedores ativos | Verificar lista do select | Fornecedores inativos/excluídos NÃO aparecem |
| 3.5.5 | Hint text abaixo do select | Verificar layout após select fornecedor | Texto de dica visível ocupando col-span-2 |

### 3.6 Validação dos Campos de Preço (Money Mask)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.6.1 | Preço de custo opcional | Salvar sem preencher custo | Aceito (custo null) |
| 3.6.2 | Preço de venda opcional | Salvar sem preencher venda | Aceito (venda null) |
| 3.6.3 | Custo com valor inteiro | Digitar "25" → submeter | Salva como 25.00 |
| 3.6.4 | Custo com centavos | Digitar "25,50" → submeter | Salva como 25.50 |
| 3.6.5 | Custo com separador de milhar | Digitar "1.250,00" → submeter | Salva como 1250.00 (separadores removidos) |
| 3.6.6 | Custo com "R$" | Digitar "R$ 49,90" → submeter | Salva como 49.90 (prefixo R$ removido) |
| 3.6.7 | Custo zero | Digitar "0" ou "0,00" → submeter | Aceito (min ≥ 0) |
| 3.6.8 | Custo negativo | Tentar digitar valor negativo | Erro "Valor deve ser maior ou igual a zero" |
| 3.6.9 | Campo vazio (string vazia) | Limpar campo custo → submeter | Transforma em null (normalized === '') |
| 3.6.10 | Venda menor que custo | Custo 50,00 e venda 30,00 → submeter | Aceito sem erro (sem validação cruzada) |
| 3.6.11 | Mask formata ao digitar | Digitar valor no campo de preço | Máscara monetária aplicada em tempo real |

### 3.7 Validação do Estoque Mínimo

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.7.1 | Valor padrão zero | Abrir dialog | Campo min_stock começa com 0 |
| 3.7.2 | Valor zero aceito | Salvar com min_stock = 0 | Salvo com sucesso |
| 3.7.3 | Valor positivo | Digitar 10 → submeter | Salvo como 10 |
| 3.7.4 | Valor negativo | Digitar -1 → submeter | Erro (min ≥ 0) |
| 3.7.5 | Valor decimal | Digitar 2.5 → submeter | Erro (deve ser inteiro) |
| 3.7.6 | Coerção de string | Campo aceita tipo number | `z.coerce.number()` converte string para número |

### 3.8 Campo Observações

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.8.1 | Observações opcional | Salvar sem preencher notas | Aceito (null) |
| 3.8.2 | Observações com 1000 caracteres | Digitar string de 1000 chars | Aceito (max 1000) |
| 3.8.3 | Observações com 1001 caracteres | Digitar string de 1001 chars | Erro de comprimento máximo |
| 3.8.4 | Trim nas observações | Digitar "  obs  " → submeter | Salva como "obs" |
| 3.8.5 | Campo textarea | Verificar tipo do campo | textarea (não componente Textarea — é HTML nativo) |

### 3.9 Campo Ativo

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.9.1 | Padrão ativo | Abrir dialog nova peça | Checkbox "Ativo" marcado por padrão |
| 3.9.2 | Salvar com ativo=true | Não desmarcar → salvar | Peça salva como ativa, aparece na lista |
| 3.9.3 | Salvar com ativo=false | Desmarcar "Ativo" → salvar | Peça salva como inativa (não aparece na lista — sem filtro de status) |

### 3.10 Submissão e Feedback

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.10.1 | Cadastro com sucesso | Preencher nome, categoria, unidade → salvar | Toast de sucesso, dialog fecha, lista atualiza |
| 3.10.2 | Loading durante submissão | Clicar salvar | Botão desabilitado/spinner durante processamento (useTransition) |
| 3.10.3 | Duplo clique em salvar | Clicar salvar rapidamente duas vezes | Somente uma requisição enviada |
| 3.10.4 | Audit log criado | Cadastrar peça → verificar audit_log | Entrada de criação registrada com company_id correto |
| 3.10.5 | Multi-tenant | Logar em empresa A → cadastrar peça | Peça associada ao company_id da empresa A |

---

## 4. Edição de Peça

### 4.1 Abertura do Dialog de Edição

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.1.1 | Abrir edição | Clicar ícone editar em uma peça | Dialog abre com "Editar Peça" no título |
| 4.1.2 | Campos pré-preenchidos — nome | Verificar campo nome | Nome atual da peça carregado |
| 4.1.3 | Campos pré-preenchidos — SKU | Verificar campo SKU | SKU atual carregado (ou vazio se null) |
| 4.1.4 | Campos pré-preenchidos — categoria | Verificar select categoria | Categoria atual selecionada |
| 4.1.5 | Campos pré-preenchidos — unidade | Verificar select unidade | Unidade atual selecionada |
| 4.1.6 | Campos pré-preenchidos — fornecedor | Verificar select fornecedor | Fornecedor atual selecionado (ou "Nenhum") |
| 4.1.7 | Campos pré-preenchidos — custo | Verificar campo custo | Valor formatado com money mask (`Math.round(cost * 100)` → máscara) |
| 4.1.8 | Campos pré-preenchidos — venda | Verificar campo venda | Valor formatado com money mask |
| 4.1.9 | Campos pré-preenchidos — min_stock | Verificar campo estoque mín | Valor numérico atual |
| 4.1.10 | Campos pré-preenchidos — notas | Verificar campo observações | Texto atual ou vazio |
| 4.1.11 | Campos pré-preenchidos — ativo | Verificar checkbox ativo | Estado atual (marcado/desmarcado) |

### 4.2 Reset de Preços no Dialog

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.2.1 | Reset custo em centavos | Peça com custo 25.50 → abrir edição | Campo custo exibe "2550" para money mask renderizar "R$ 25,50" |
| 4.2.2 | Reset venda em centavos | Peça com venda 49.90 → abrir edição | Campo venda exibe "4990" para money mask renderizar "R$ 49,90" |
| 4.2.3 | Custo null | Peça sem custo → abrir edição | Campo custo vazio |

### 4.3 Edição e Validações

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.3.1 | Alterar nome | Mudar nome → salvar | Nome atualizado na lista |
| 4.3.2 | Remover SKU | Limpar SKU → salvar | SKU removido (salvo como null) |
| 4.3.3 | Adicionar SKU | Peça sem SKU → adicionar SKU → salvar | SKU salvo, exibido na lista |
| 4.3.4 | SKU duplicado na edição | Tentar alterar SKU para SKU de outra peça ativa | Erro "Já existe uma peça ativa com este SKU." |
| 4.3.5 | SKU igual ao próprio | Salvar sem alterar o SKU | Sem erro (mesmo ID, sem conflito) |
| 4.3.6 | Alterar categoria | Mudar de "Peça de Reposição" para "Acessório" → salvar | Categoria atualizada, badge correto na lista |
| 4.3.7 | Desativar peça | Desmarcar "Ativo" → salvar | `active=false`, peça some da lista |
| 4.3.8 | Reativar peça | Peça inativa → marcar "Ativo" → salvar | Peça volta a aparecer na lista |
| 4.3.9 | Audit log na edição | Editar peça → verificar audit_log | Entrada de atualização registrada |

---

## 5. Exclusão (Soft Delete)

### 5.1 Dialog de Exclusão

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 5.1.1 | Abrir dialog exclusão | Clicar ícone excluir | Dialog de confirmação abre |
| 5.1.2 | Mensagem de confirmação | Verificar texto do dialog | Nome da peça exibido na mensagem |
| 5.1.3 | Cancelar exclusão | Clicar "Cancelar" | Dialog fecha, peça permanece na lista |
| 5.1.4 | Confirmar exclusão | Clicar "Confirmar" | Toast: `Peça "${partName}" removida da listagem com sucesso.` |
| 5.1.5 | Peça some da lista | Após exclusão confirmar | Peça não aparece mais na listagem |
| 5.1.6 | Soft delete — campos | Verificar no banco após exclusão | `deleted_at` preenchido, `deleted_by` = user_id, `active = false` |
| 5.1.7 | SKU não arquivado | Excluir peça com SKU "TL-001" → verificar banco | SKU permanece "TL-001" sem sufixo `[deleted:...]` |
| 5.1.8 | SKU reutilizável após exclusão | Excluir peça com SKU → cadastrar nova com mesmo SKU | Aceito (índice parcial só cobre peças ativas) |
| 5.1.9 | Audit log na exclusão | Excluir peça → verificar audit_log | Entrada de exclusão registrada |
| 5.1.10 | Loading durante exclusão | Clicar confirmar | Botão desabilitado durante processamento |

---

## 6. Responsividade

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.1 | Tela grande (≥lg) | Verificar colunas Custo e Venda | Visíveis em tela ≥lg |
| 6.2 | Tela média (≥md) | Verificar colunas Fornecedor e Est.Mín. | Visíveis em tela ≥md |
| 6.3 | Tela pequena (<md) | Verificar tabela | Colunas Fornecedor, Est.Mín., Custo e Venda ocultadas |
| 6.4 | Dialog em mobile | Abrir dialog em tela pequena | Dialog responsivo, campos usáveis |
| 6.5 | Botão Nova Peça em mobile | Verificar botão em tela pequena | Botão acessível e funcional |
| 6.6 | Money mask em mobile | Preencher campo de preço em mobile | Teclado numérico ativado, máscara funciona |

---

## 7. Casos de Borda e Integridade

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 7.1 | Isolamento multi-tenant | Empresa A cadastra peça "Motor" → logar em empresa B | Empresa B NÃO vê as peças da empresa A |
| 7.2 | Fornecedor excluído nas peças | Excluir fornecedor vinculado a uma peça → verificar listagem de peças | Peça ainda existe; coluna fornecedor exibe vazio ou nome anterior |
| 7.3 | Fornecedor excluído no select | Abrir edição de peça com fornecedor excluído | Select de fornecedor mostra apenas ativos; fornecedor excluído não aparece |
| 7.4 | Caracteres especiais no nome | Nome com acentos, hifens, parênteses "Tela LCD (Original)" | Salvo e exibido corretamente |
| 7.5 | Caracteres especiais no SKU | SKU com hifens "TL-001-A" | Aceito e exibido corretamente |
| 7.6 | Preço muito alto | Custo = 99999,99 → salvar | Sem erro (sem limite máximo explícito no schema) |
| 7.7 | Nome duplicado | Cadastrar duas peças com nome idêntico | Permitido (sem restrição de unicidade no nome) |
| 7.8 | Recarregar página após cadastro | Cadastrar peça → F5 | Peça persiste, lista correta |
| 7.9 | Busca com caracteres especiais | Buscar "LCD (Original)" | Sem erro, resultado correto |
| 7.10 | Peça sem fornecedor no filtro | Ativar filtro de fornecedor específico | Peças sem fornecedor não aparecem no filtro |
| 7.11 | Filtro fornecedor + sem fornecedores | Sistema sem fornecedores cadastrados | Filtro de fornecedor NÃO renderizado no toolbar |
| 7.12 | Estoque mínimo = 0 em edição | Editar peça com min_stock > 0 → alterar para 0 | Salvo como 0, AlertTriangle some da listagem |
| 7.13 | Peça na OS | Verificar se exclusão de peça bloqueia quando vinculada a uma OS | (Depende da implementação — verificar se há validação no deletePart) |
| 7.14 | `normalizeOptional` no SKU | Salvar SKU como string vazia `""` | Convertido para null antes de salvar |
| 7.15 | `normalizeOptional` nas notas | Salvar notas como string vazia `""` | Convertido para null antes de salvar |

---

## Sumário

| Seção | Casos |
|-------|-------|
| 1. RBAC | 8 |
| 2. Listagem | 31 |
| 3. Cadastro | 40 |
| 4. Edição | 19 |
| 5. Exclusão | 10 |
| 6. Responsividade | 6 |
| 7. Borda | 15 |
| **Total** | **129** |
