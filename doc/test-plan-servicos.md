# Caderno de Testes — Módulo: Serviços

**Caminho:** `/dashboard/servicos`
**Data de criação:** 2026-04-17
**Objetivo:** Verificar o funcionamento completo do módulo de catálogo de serviços, cobrindo RBAC, listagem, cadastro, edição, exclusão e casos de borda.

---

## 1. RBAC — Controle de Acesso por Papel

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.1 | Acesso como **owner** | Logar como owner → acessar `/dashboard/servicos` | Página carrega normalmente com botão "Novo Serviço" visível |
| 1.2 | Acesso como **admin** | Logar como admin → acessar `/dashboard/servicos` | Página carrega normalmente com botão "Novo Serviço" visível |
| 1.3 | Acesso como **atendente** | Logar como atendente → acessar `/dashboard/servicos` | Redirecionado para `/dashboard` |
| 1.4 | Acesso como **técnico** | Logar como técnico → acessar `/dashboard/servicos` | Redirecionado para `/dashboard` |
| 1.5 | Server Action — criar como atendente | Tentar invocar `createService` via atendente | Retorna erro de autorização (getAdminContext bloqueia) |
| 1.6 | Server Action — editar como técnico | Tentar invocar `updateService` via técnico | Retorna erro de autorização |
| 1.7 | Server Action — excluir como atendente | Tentar invocar `deleteService` via atendente | Retorna erro de autorização |

---

## 2. Listagem de Serviços

### 2.1 Renderização Geral

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.1.1 | Lista com serviços cadastrados | Cadastrar ao menos 2 serviços → acessar listagem | Serviços exibidos em tabela ordenados por nome (A→Z) |
| 2.1.2 | Estado vazio — sem nenhum serviço | Sem serviços cadastrados | Mensagem "Nenhum serviço cadastrado" e instrução para clicar em "Novo Serviço" |
| 2.1.3 | Estado vazio — com filtro ativo | Filtrar por categoria sem resultados | Mensagem "Nenhum resultado encontrado" com botão "Limpar filtros" |
| 2.1.4 | Ordenação por nome | Cadastrar serviços "Troca de Tela", "Diagnóstico Geral", "Limpeza" | Exibidos na ordem: Diagnóstico Geral, Limpeza, Troca de Tela |
| 2.1.5 | Serviço excluído não exibido | Excluir (soft delete) um serviço → recarregar lista | Serviço excluído não aparece na listagem |

### 2.2 Colunas da Tabela

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.2.1 | Coluna Serviço — nome | Cadastrar "Troca de Tela" → verificar listagem | Nome exibido em negrito |
| 2.2.2 | Coluna Serviço — código mono font | Cadastrar com código "SRV-001" | Código exibido abaixo do nome em fonte monoespaçada |
| 2.2.3 | Coluna Serviço — sem código | Cadastrar sem código | Apenas nome exibido, sem código |
| 2.2.4 | Badge "Inativo" em serviço inativo | Salvar serviço com `active=false` → listar | Badge "INATIVO" exibido em vermelho (text-destructive) abaixo do nome |
| 2.2.5 | Badge "Inativo" ausente em ativo | Verificar serviço ativo | Nenhum badge de status exibido |
| 2.2.6 | Coluna Categoria — badge sky | Categoria "Diagnóstico" | Badge azul-céu |
| 2.2.7 | Coluna Categoria — badge blue | Categoria "Reparo" | Badge azul |
| 2.2.8 | Coluna Categoria — badge amber | Categoria "Manutenção" | Badge âmbar |
| 2.2.9 | Coluna Categoria — badge violet | Categoria "Instalação" | Badge violeta |
| 2.2.10 | Coluna Categoria — badge emerald | Categoria "Limpeza / Higienização" | Badge verde-esmeralda |
| 2.2.11 | Coluna Categoria — badge slate | Categoria "Outro" | Badge slate |
| 2.2.12 | Coluna Preço (≥lg) — com valor | Serviço com preço R$ 150,00 | "R$ 150,00" alinhado à direita |
| 2.2.13 | Coluna Preço — sem valor | Serviço sem preço | "—" exibido |
| 2.2.14 | Coluna Duração (≥md) — minutos < 60 | Duração = 45 | Exibe "45 min" com ícone Clock |
| 2.2.15 | Coluna Duração — exatos 60 min | Duração = 60 | Exibe "1h" |
| 2.2.16 | Coluna Duração — horas com minutos | Duração = 90 | Exibe "1h 30min" |
| 2.2.17 | Coluna Duração — múltiplas horas exatas | Duração = 120 | Exibe "2h" |
| 2.2.18 | Coluna Duração — sem valor | Duração não informada (null) | "—" exibido |
| 2.2.19 | Coluna Garantia (≥md) — com dias | Garantia = 90 dias | Ícone ShieldCheck + "90d" em verde-esmeralda |
| 2.2.20 | Coluna Garantia — zero dias | Garantia = 0 | "—" exibido (sem ícone) |
| 2.2.21 | Coluna Ações | Verificar botões na linha | Ícone editar (Edit2) e ícone excluir (Trash2) presentes |

### 2.3 Busca

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.3.1 | Busca por nome | Digitar parte do nome de um serviço | Filtra serviços cujo nome contém o texto |
| 2.3.2 | Busca por código | Digitar o código de um serviço (ex: "SRV-001") | Filtra serviço com aquele código |
| 2.3.3 | Busca por categoria (label) | Digitar "manutenção" | Filtra serviços da categoria Manutenção |
| 2.3.4 | Busca sem resultado | Digitar texto inexistente | Mensagem "Nenhum resultado encontrado" com botão "Limpar filtros" |
| 2.3.5 | Busca case-insensitive | Digitar "TROCA" para serviço "Troca de Tela" | Retorna o serviço |
| 2.3.6 | Limpar busca | Apagar texto da busca | Lista retorna ao estado completo |
| 2.3.7 | Debounce da busca | Digitar rapidamente várias letras | Não reflete letra a letra — usa `useDeferredValue` |
| 2.3.8 | Busca desabilitada sem serviços | Sem nenhum serviço cadastrado | Campo de busca desabilitado |

### 2.4 Filtro de Categoria

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.4.1 | Opções disponíveis | Abrir filtro Categoria | 6 opções: Diagnóstico, Reparo, Manutenção, Instalação, Limpeza / Higienização, Outro |
| 2.4.2 | Contagem por categoria | Abrir filtro | Cada opção exibe a contagem de serviços daquela categoria |
| 2.4.3 | Filtrar por Diagnóstico | Selecionar "Diagnóstico" | Lista exibe apenas serviços dessa categoria |
| 2.4.4 | Filtrar por Reparo | Selecionar "Reparo" | Lista exibe apenas serviços de reparo |
| 2.4.5 | Filtrar por Manutenção | Selecionar "Manutenção" | Lista exibe apenas serviços de manutenção |
| 2.4.6 | Filtrar por Instalação | Selecionar "Instalação" | Lista exibe apenas serviços de instalação |
| 2.4.7 | Filtrar por Limpeza | Selecionar "Limpeza / Higienização" | Lista exibe apenas serviços de limpeza |
| 2.4.8 | Filtrar por Outro | Selecionar "Outro" | Lista exibe apenas serviços categoria "Outro" |
| 2.4.9 | Múltiplas categorias | Selecionar "Reparo" e "Manutenção" | Lista exibe serviços de ambas as categorias |
| 2.4.10 | Combinar busca + filtro | Buscar "tela" + filtro "Reparo" | Lista exibe apenas serviços que contêm "tela" e são da categoria Reparo |
| 2.4.11 | Limpar filtro de categoria | Filtrar → clicar "Limpar" no popover | Filtro removido, lista retorna completa |
| 2.4.12 | Botão "Limpar filtros" global | Filtrar → clicar botão "Limpar filtros" | Busca e categoria zeradas |
| 2.4.13 | Filtro desabilitado sem serviços | Sem serviços cadastrados | Filtro de categoria desabilitado |
| 2.4.14 | Sem filtro de status | Verificar opções de filtro | NÃO existe filtro de status ativo/inativo |

### 2.5 Paginação

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.5.1 | Paginação com muitos serviços | Cadastrar mais de 10 serviços | Paginação ativada, navegar entre páginas funciona |
| 2.5.2 | Itens por página | Alterar quantidade de itens | Lista se ajusta ao novo tamanho |
| 2.5.3 | Paginação com filtro ativo | Filtrar categoria → verificar paginação | Paginação considera apenas resultados filtrados |
| 2.5.4 | Paginação some com resultados ≤ página | Filtrar até restar poucos resultados | Paginação some quando não há múltiplas páginas |

---

## 3. Cadastro de Serviço (Novo Serviço)

### 3.1 Abertura do Dialog

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.1.1 | Abrir dialog | Clicar "Novo Serviço" | Dialog abre com formulário |
| 3.1.2 | Título e ícone | Verificar header | Ícone Wrench + "Novo Serviço" |
| 3.1.3 | Descrição | Verificar subtítulo | "Preencha os dados abaixo para cadastrar um novo serviço no catálogo." |
| 3.1.4 | Categoria padrão | Verificar select de categoria ao abrir | "Reparo" já selecionado (default do formulário) |
| 3.1.5 | Garantia padrão | Verificar campo garantia | Valor "0" preenchido |
| 3.1.6 | Ativo padrão | Verificar checkbox | "Serviço Ativo" marcado por padrão |
| 3.1.7 | Largura do dialog | Abrir em tela grande | Dialog com largura `sm:max-w-150` |
| 3.1.8 | Scroll interno | Dialog em tela pequena | `max-h-[90vh]` com scroll interno |
| 3.1.9 | Fechar com X | Clicar no X | Dialog fecha sem salvar |
| 3.1.10 | Fechar com Cancelar | Clicar "Cancelar" | Dialog fecha sem salvar |

### 3.2 Validação do Campo Nome

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.2.1 | Nome obrigatório | Submeter com nome vazio | Erro "Nome é obrigatório" |
| 3.2.2 | Nome com 1 caractere | Digitar "A" → submeter | Erro de comprimento mínimo (min 2) |
| 3.2.3 | Nome com 2 caracteres | Digitar "AB" → submeter | Aceito |
| 3.2.4 | Nome com 150 caracteres | Digitar string de 150 chars | Aceito (máximo é 150) |
| 3.2.5 | Nome com 151 caracteres | Digitar string de 151 chars | Erro de comprimento máximo |
| 3.2.6 | Nome com espaços nas bordas | Digitar "  Troca de Tela  " → submeter | Salva como "Troca de Tela" (trim) |
| 3.2.7 | Nome apenas espaços | Digitar "   " → submeter | Erro "Nome é obrigatório" (trim → vazio) |
| 3.2.8 | Nome ocupa col-span-2 | Verificar layout | Campo nome ocupa largura total do dialog (col-span-2) |

### 3.3 Validação do Campo Código

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.3.1 | Código opcional | Salvar sem preencher código | Salvo sem código (null) |
| 3.3.2 | Código com 50 caracteres | Digitar 50 chars | Aceito |
| 3.3.3 | Código com 51 caracteres | Digitar 51 chars | Erro de comprimento máximo |
| 3.3.4 | Código com espaços nas bordas | Digitar "  SRV-001  " → submeter | Salva como "SRV-001" (normalizeOptional / trim) |
| 3.3.5 | Código vazio (string vazia) | Limpar campo código → submeter | Trata como null |
| 3.3.6 | Código duplicado — serviço ativo | Cadastrar código "SRV-001" → tentar cadastrar outro com mesmo código | Erro "Já existe um serviço ativo com este código." |
| 3.3.7 | Dois serviços sem código | Cadastrar dois serviços sem código | Ambos salvos com sucesso (índice parcial permite múltiplos null) |
| 3.3.8 | Código após exclusão — reutilização | Excluir serviço com código "SRV-001" → cadastrar novo com mesmo código | Aceito (soft delete NÃO arquiva código) |

### 3.4 Validação do Select de Categoria

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.4.1 | Categoria pré-selecionada | Abrir dialog novo serviço | "Reparo" já selecionado |
| 3.4.2 | 6 opções disponíveis | Abrir select categoria | Diagnóstico, Reparo, Manutenção, Instalação, Limpeza / Higienização, Outro |
| 3.4.3 | Salvar cada categoria | Selecionar e salvar cada uma das 6 | Cada uma salva corretamente com badge correto na lista |

### 3.5 Validação do Campo Preço

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.5.1 | Preço opcional | Salvar sem preencher preço | Aceito (null) |
| 3.5.2 | Preço com valor inteiro | Digitar "150" | Salva como 150.00 |
| 3.5.3 | Preço com centavos | Digitar "150,50" | Salva como 150.50 |
| 3.5.4 | Preço com separador de milhar | Digitar "1.500,00" | Salva como 1500.00 |
| 3.5.5 | Preço com "R$" | Digitar "R$ 89,90" | Salva como 89.90 (prefixo removido) |
| 3.5.6 | Preço zero | Digitar "0" ou "0,00" | Aceito (≥ 0) |
| 3.5.7 | Preço negativo | Tentar digitar negativo | Erro "Valor deve ser maior ou igual a zero" |
| 3.5.8 | Campo vazio | Limpar campo → submeter | Transforma em null |
| 3.5.9 | Mask formata ao digitar | Digitar valor | Máscara monetária aplicada em tempo real |

### 3.6 Validação do Campo Duração Estimada

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.6.1 | Duração opcional | Salvar sem preencher duração | Aceito (null) |
| 3.6.2 | Duração = 0 | Digitar "0" | Aceito (≥ 0) |
| 3.6.3 | Duração = 45 | Digitar "45" → salvar → verificar lista | Exibe "45 min" na coluna |
| 3.6.4 | Duração = 60 | Digitar "60" → salvar → verificar lista | Exibe "1h" |
| 3.6.5 | Duração = 90 | Digitar "90" → salvar → verificar lista | Exibe "1h 30min" |
| 3.6.6 | Duração = 120 | Digitar "120" → salvar → verificar lista | Exibe "2h" |
| 3.6.7 | Duração negativa | Digitar "-30" | Erro (min ≥ 0) |
| 3.6.8 | Duração decimal | Digitar "1.5" | Erro (deve ser inteiro) |
| 3.6.9 | Campo limpo → null | Apagar valor do campo duração | onChange envia null (não 0) |

### 3.7 Validação do Campo Garantia

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.7.1 | Valor padrão zero | Abrir dialog novo serviço | Campo garantia exibe "0" |
| 3.7.2 | Garantia = 0 | Salvar com 0 | Aceito; coluna Garantia exibe "—" |
| 3.7.3 | Garantia = 30 | Digitar "30" → salvar | Coluna Garantia exibe ShieldCheck + "30d" em verde |
| 3.7.4 | Garantia = 365 | Digitar "365" → salvar | Aceito; coluna exibe "365d" |
| 3.7.5 | Garantia negativa | Digitar "-1" | Erro (min ≥ 0) |
| 3.7.6 | Garantia decimal | Digitar "1.5" | Erro (deve ser inteiro) |
| 3.7.7 | Campo vazio | Limpar campo garantia → submeter | `z.coerce.number()` com default 0 — salva como 0 |

### 3.8 Campo Observações

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.8.1 | Observações opcional | Salvar sem preencher | Aceito (null) |
| 3.8.2 | Observações com 1000 chars | Digitar 1000 chars | Aceito |
| 3.8.3 | Observações com 1001 chars | Digitar 1001 chars | Erro de comprimento máximo |
| 3.8.4 | Trim nas observações | Digitar "  obs  " → submeter | Salva como "obs" |
| 3.8.5 | Campo textarea nativo | Verificar tipo | textarea HTML nativo (não componente Textarea) |
| 3.8.6 | Observações ocupa col-span-2 | Verificar layout | Campo ocupa largura total |

### 3.9 Campo Serviço Ativo

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.9.1 | Padrão ativo | Abrir dialog | Checkbox "Serviço Ativo" marcado |
| 3.9.2 | Salvar ativo=true | Não desmarcar → salvar | Serviço ativo, aparece normalmente na lista |
| 3.9.3 | Salvar ativo=false | Desmarcar → salvar | Serviço salvo com `active=false`, badge "INATIVO" exibido |

### 3.10 Submissão e Feedback

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.10.1 | Cadastro com sucesso | Preencher nome + categoria (padrão) → salvar | Toast "Serviço cadastrado com sucesso.", dialog fecha, lista atualiza |
| 3.10.2 | Loading durante submissão | Clicar salvar | Botão "Salvar Serviço" com spinner + desabilitado (isPending) |
| 3.10.3 | Duplo clique em salvar | Clicar salvar rapidamente duas vezes | Somente uma requisição enviada |
| 3.10.4 | Audit log criado | Cadastrar serviço → verificar audit_log | Entrada de criação registrada com company_id correto |
| 3.10.5 | Multi-tenant | Empresa A cadastra serviço → logar em empresa B | Empresa B NÃO vê os serviços da empresa A |

---

## 4. Edição de Serviço

### 4.1 Abertura do Dialog de Edição

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.1.1 | Abrir edição | Clicar ícone editar | Dialog abre com "Editar Serviço" no título e ícone Wrench |
| 4.1.2 | Descrição na edição | Verificar subtítulo | "Atualize os dados do serviço. Clique em salvar ao terminar." |
| 4.1.3 | Nome pré-preenchido | Verificar campo nome | Nome atual carregado |
| 4.1.4 | Código pré-preenchido | Verificar campo código | Código atual (ou vazio se null) |
| 4.1.5 | Categoria pré-selecionada | Verificar select | Categoria atual selecionada |
| 4.1.6 | Preço pré-preenchido | Serviço com preço 150.50 → abrir edição | Campo exibe "15050" → money mask renderiza "R$ 150,50" |
| 4.1.7 | Preço null | Serviço sem preço → abrir edição | Campo preço vazio |
| 4.1.8 | Duração pré-preenchida | Serviço com duração 90 min → abrir edição | Campo exibe "90" |
| 4.1.9 | Duração null | Serviço sem duração → abrir edição | Campo duração vazio |
| 4.1.10 | Garantia pré-preenchida | Serviço com garantia 30 dias → abrir edição | Campo exibe "30" |
| 4.1.11 | Notas pré-preenchidas | Verificar campo observações | Texto atual ou vazio |
| 4.1.12 | Ativo pré-preenchido | Verificar checkbox | Estado atual (marcado/desmarcado) |

### 4.2 Edição e Validações

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.2.1 | Alterar nome | Mudar nome → salvar | Nome atualizado na lista |
| 4.2.2 | Remover código | Limpar código → salvar | Código removido (null); coluna sem código na lista |
| 4.2.3 | Adicionar código | Serviço sem código → adicionar → salvar | Código salvo, exibido na lista |
| 4.2.4 | Código duplicado na edição | Alterar código para código de outro serviço ativo | Erro "Já existe um serviço ativo com este código." |
| 4.2.5 | Código igual ao próprio | Salvar sem alterar código | Sem erro (mesmo ID, sem conflito) |
| 4.2.6 | Alterar categoria | Mudar de "Reparo" para "Manutenção" → salvar | Categoria atualizada, badge âmbar na lista |
| 4.2.7 | Desativar serviço | Desmarcar "Serviço Ativo" → salvar | Badge "INATIVO" aparece na linha |
| 4.2.8 | Reativar serviço | Serviço inativo → marcar "Serviço Ativo" → salvar | Badge "INATIVO" some |
| 4.2.9 | Toast na edição | Editar e salvar | Toast "Serviço atualizado com sucesso." |
| 4.2.10 | Audit log na edição | Editar serviço → verificar audit_log | Entrada de atualização registrada |

---

## 5. Exclusão (Soft Delete)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 5.1 | Abrir dialog exclusão | Clicar ícone excluir (Trash2) | Dialog de confirmação abre com ícone AlertCircle vermelho |
| 5.2 | Título do dialog | Verificar header | "Excluir Serviço" em texto destructive |
| 5.3 | Nome na confirmação | Verificar mensagem | Nome do serviço exibido em negrito |
| 5.4 | Cancelar exclusão | Clicar "Cancelar" | Dialog fecha, serviço permanece na lista |
| 5.5 | Confirmar exclusão | Clicar "Excluir da Listagem" | Toast: `Serviço "${serviceName}" removido da listagem com sucesso.` |
| 5.6 | Serviço some da lista | Após exclusão confirmar | Serviço removido da lista imediatamente (estado local + router.refresh) |
| 5.7 | Soft delete — campos no banco | Verificar banco após exclusão | `deleted_at` preenchido, `deleted_by` = user_id, `active = false` |
| 5.8 | Código não arquivado | Excluir serviço com código "SRV-001" → verificar banco | Código permanece "SRV-001" sem sufixo `[deleted:...]` |
| 5.9 | Código reutilizável após exclusão | Excluir serviço com código → cadastrar novo com mesmo código | Aceito (índice parcial só cobre serviços ativos) |
| 5.10 | Loading durante exclusão | Clicar "Excluir da Listagem" | Botão exibe "Excluindo..." e fica desabilitado |
| 5.11 | Audit log na exclusão | Excluir serviço → verificar audit_log | Entrada de soft_delete registrada |

---

## 6. Responsividade

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.1 | Tela grande (≥lg) | Verificar coluna Preço | Visível em tela ≥lg |
| 6.2 | Tela média (≥md) | Verificar colunas Duração e Garantia | Visíveis em tela ≥md |
| 6.3 | Tela pequena (<md) | Verificar tabela | Colunas Preço, Duração e Garantia ocultadas; Serviço + Categoria + Ações visíveis |
| 6.4 | Dialog em mobile | Abrir dialog em tela pequena | Dialog responsivo com scroll interno, campos usáveis |
| 6.5 | Money mask em mobile | Preencher campo preço em mobile | Teclado numérico, máscara funciona |

---

## 7. Casos de Borda e Integridade

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 7.1 | Isolamento multi-tenant | Empresa A cadastra serviço → logar em empresa B | Empresa B NÃO vê os serviços da empresa A |
| 7.2 | Nome duplicado | Cadastrar dois serviços com mesmo nome | Permitido (sem restrição de unicidade no nome) |
| 7.3 | Caracteres especiais no nome | Nome "Limpeza (Ultrassônica) — Placa-mãe" | Salvo e exibido corretamente |
| 7.4 | Código com hifens e barras | Código "SRV/001-A" | Aceito e exibido corretamente |
| 7.5 | Preço muito alto | Preço = 99999,99 | Aceito (sem limite máximo) |
| 7.6 | Duração muito alta | Duração = 9999 minutos | Aceito; exibe "166h 39min" |
| 7.7 | Garantia muito alta | Garantia = 3650 dias | Aceito; exibe "3650d" |
| 7.8 | Recarregar página após cadastro | F5 após criar serviço | Serviço persiste, lista correta |
| 7.9 | `normalizeOptional` no código | Salvar código como string vazia `""` | Convertido para null antes de salvar |
| 7.10 | `normalizeOptional` nas notas | Salvar notas como string vazia `""` | Convertido para null antes de salvar |
| 7.11 | Serviço usado em OS | Verificar se exclusão de serviço vinculado a OS é bloqueada | (Verificar se há validação no `deleteService` contra vínculos em OS) |
| 7.12 | Duração 0 | Digitar "0" para duração → salvar | Aceito; coluna exibe "0 min" com ícone Clock |
| 7.13 | Busca com acento | Buscar "manutençao" (sem cedilha) para "Manutenção" | Depende da normalização — verificar comportamento |
| 7.14 | Serviço inativo com código | Salvar serviço com `active=false` e código "SRV-INV" → tentar cadastrar ativo com mesmo código | Verificar: índice parcial é só em `active=true` — deve ser permitido |
| 7.15 | Contagem do filtro atualiza | Excluir um serviço de reparo → abrir filtro Categoria | Contagem de "Reparo" decrementada (baseada no estado local) |

---

## Sumário

| Seção | Casos |
|-------|-------|
| 1. RBAC | 7 |
| 2. Listagem | 36 |
| 3. Cadastro | 40 |
| 4. Edição | 19 |
| 5. Exclusão | 11 |
| 6. Responsividade | 5 |
| 7. Borda | 15 |
| **Total** | **133** |
