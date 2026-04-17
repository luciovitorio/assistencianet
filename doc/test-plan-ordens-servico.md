# Caderno de Testes — Módulo: Ordens de Serviço (OS)

**Caminho:** `/dashboard/ordens-de-servico`
**Data de criação:** 2026-04-17
**Objetivo:** Verificar o funcionamento completo do módulo de gestão de Ordens de Serviço, cobrindo abertura, edição, acompanhamento, orçamentos, finalização/retirada, cancelamento e controles de acesso.

---

## 1. Controle de Acesso (RBAC) e Isolamento (Multi-tenant)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 1.1 | Visualização por Empresa | Cadastrar OS na Empresa A, logar na Empresa B | Empresa B não pode ver ou acessar a OS da Empresa A. |
| 1.2 | Permissão Admin/Owner p/ Filial | Logar como Admin → abrir Nova OS | O campo "Filial" (Branch) está habilitado e permite selecionar qualquer filial. |
| 1.3 | Permissão Atendente p/ Filial | Logar como Atendente → abrir Nova OS | O campo "Filial" fica desabilitado (readonly) exibindo a filial atual do usuário. |
| 1.4 | Edição de OS por status | Tentar editar a OS que está com status "finalizado" ou "cancelado" | Botão de "Editar OS" deve estar oculto/desabilitado. Edição não deve ser permitida. |

---

## 2. Listagem de Ordens de Serviço

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 2.1 | Exibição inicial | Acessar `/dashboard/ordens-de-servico` | Tabela ou lista renderizada com as OS abertas, ordenadas da mais recente para a mais antiga. |
| 2.2 | Informações da Listagem | Verificar os cards/linhas na listagem | Exibem: Número da OS, Cliente, Equipamento, Status atual, Técnico e Data de Criação. |
| 2.3 | Filtro por Status | Aplicar filtro de status (Ex: "Aguardando", "Em Análise") | Lista reflete exatamente as OS no status correspondente. |
| 2.4 | Filtro por Filial (Admin) | Logado como admin, trocar o filtro de filial | Lista reflete somente as OS correspondentes à filial selecionada. |
| 2.5 | Estado vazio | Listagem sem nenhuma OS | Exibe mensagem adequada indicando a falta de registros e botão convidativo para "Nova OS". |

---

## 3. Abertura de Serviço (Nova OS)

**Caminho:** `/dashboard/ordens-de-servico/nova`

### 3.1 Busca e Criação Rápida de Cliente
| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.1.1 | Cliente obrigatório | Tentar submeter sem cliente | Erro: "Cliente é obrigatório". |
| 3.1.2 | Busca inteligente | Digitar parte do nome de um cliente existente | Dropdown preenche com opções relevantes (busca via nome, doc ou telefone). |
| 3.1.3 | Cadastro Inline (Quick Create) | Buscar por "João Teste" não existente, clicar em "Cadastrar novo cliente" | Abre modal de cliente. Ao salvar, o cliente já é pré-selecionado na OS. |

### 3.2 Detalhes do Equipamento
| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.2.1 | Tipo de Equip. obrigatório | Tentar submeter sem Tipo | Erro: "Tipo de equipamento é obrigatório". |
| 3.2.2 | Campos opcionais | Preencher apenas Tipo, deixar Marca/Modelo/Série/Condição em branco | A transação passa com sucesso (são tratadas como `null` via `normalizeOptional`). |
| 3.2.3 | Limite de Caracteres | Inserir mais de 100 caracteres na Marca ou 500 na Condição | Erros de validação do Zod alertando sobre limites máximos. |

### 3.3 Descrição e Técnico
| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 3.3.1 | Problema relatado (Obrigatório) | Deixar vazio ou inserir < 5 caracteres | Erro de validação: mínimo 5 caracteres. |
| 3.3.2 | Atribuição de Técnico | Selecionar "Sem técnico atribuído" | OS salva normalmente com `technician_id = null`. |
| 3.3.3 | Envio bem sucedido | Preencher os dados obrigatórios e Salvar | Redireciona para `/dashboard/ordens-de-servico/[id]`, toast mostra "OS #XXXX-XXXX aberta". |

---

## 4. Edição de Ordem de Serviço

**Caminho:** `/dashboard/ordens-de-servico/[id]/editar`

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 4.1 | Proteção do Cliente na Edição | Tentar alterar o cliente na tela de edição | Campo de cliente aparece desabilitado (opção omitida pelo `editServiceOrderSchema`). |
| 4.2 | Edição do Equipamento | Alterar a condição de entrada ou número de série e Salvar | Alterações salvas, redireciona para OS e exibe timeline atualizada. |
| 4.3 | Edição do Técnico | Trocar o técnico atribuído da OS e Salvar | Sucesso, muda o responsável e registra alteração. |

---

## 5. Visualização e Stepper (Detalhes da OS)

**Caminho:** `/dashboard/ordens-de-servico/[id]`

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 5.1 | Atualização do Status Stepper | Iniciar uma OS (Aguardando) | O Step 1 brilha e está ativo. |
| 5.2 | Visualização da Timeline | Visualizar aba lateral (ou inferior em mobile) na OS | A linha do tempo lista todos os logs: Abertura. |
| 5.3 | Terceirização (Se aplicável) | Observar OS com status "Enviado p/ Terceiro" | Um Card exato, na cor indigo, é renderizado informando a empresa terceirizada e a data prevista de retorno. Se vencido, a data fica em vermelho (`text-rose-600`). |

---

## 6. Fluxo de Orçamentos (Estimates)

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 6.1 | Criar Orçamento (Botão) | Clicar em "Criar Orçamento" na Details Page | Modal abre com a formatação para inserir peças/serviços e descontos. |
| 6.2 | Adição de Peças/Serviços | Selecionar peças/serviços existentes | Linhas são inseridas. Estoque físico base mostra restrições ou alertas se saldo menor que necessitado. |
| 6.3 | Aprovação do Orçamento | Aprovar o orçamento | Status da OS transita p/ "aprovado" (ou "aguardando_peca"), Stepper avança. Timeline registra. |
| 6.4 | Rejeição do Orçamento | Em um orçamento Rascunho ou Enviado, clicar p/ reprovar | Status da OS transita p/ "reprovado". |

---

## 7. Retirada e Finalização de OS

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 7.1 | Invocar Retirada | Na OS com status `pronto`, clicar em "Entregar Equipamento" | Abre dialog de Retirada (PickupSchema). |
| 7.2 | Metódos de Pagamento | Selecionar pagamento | Aparecem: Dinheiro, Pix, Cartão Crédito/Débito, Transf., Isento. |
| 7.3 | Pagamento via Dinheiro - Restrição | Selecionar "Dinheiro", deixar campo de valor pago vazio | Erro: "Informe o valor recebido em dinheiro". |
| 7.4 | Pagamento Isento | Escolher "Isento" | O Status final da OS fica "finalizado" e o payment_status transita para `isento`. |
| 7.5 | Aplicação de Desconto | Inserir um desconto maior que o valor total | Erro validado pelo frontend / backend impedindo submissões ilógicas. |
| 7.6 | Submissão com Sucesso | Preencher corretamento -> Confirmar Retirada | OS vira "Finalizado". Botão de "Editar OS" some da página. Ação registrada no fluxo e no caixa (Cash Entries). |

---

## 8. Cancelamento de OS

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 8.1 | Abrir Cancelamento | Em OS em andamento, clicar na ação "Cancelar OS" | Dialog abre exigindo Motivo. |
| 8.2 | Motivo "Outros" sem detalhes | Selecionar motivo "Outro", deixar campo "Detalhes" vazio e Salvar | Erro: ZodIssue "Descreva o motivo do cancelamento". |
| 8.3 | Sucesso no Cancelamento | Escolher "Cliente desistiu" e confirmar | OS transita p/ status "cancelado". Stepper exibe faixa vermelha "OS Cancelada". |

---

## 9. Casos de Borda e Erros Frequentes

| # | Cenário | Passos | Resultado Esperado |
|---|---------|--------|--------------------|
| 9.1 | Duplo clique no submit | Ao gerar ou salvar uma OS, clicar freneticamente no botão | Estado de `isBusy`/`isPending` previne N requisições concorrentes. |
| 9.2 | Acesso a ID inexistente | Acessar `/dashboard/ordens-de-servico/um-id-falso` | Redirecionamento amigável para listagem / tela de 404 (NotFound). |
| 9.3 | Baixa de Peças Inválida | Tentar aprovar um orçamento com peças em quantidade superior ao estoque | O sistema avisa conformando RN de negócio (pode barrar se configurado ou transitar para `aguardando_peca`). |
| 9.4 | Data de Nascimento/Data Inválida | No campo data de recolha/previsão, inserir data formatada incorretamente (HTML bypass) | Backend bloqueia erro de parser por ISO timestamp rígido. |

---

## Sumário
| Seção | Casos |
|-------|-------|
| 1. RBAC | 4 |
| 2. Listagem | 5 |
| 3. Nova OS | 9 |
| 4. Edição | 3 |
| 5. Detalhes | 3 |
| 6. Orçamentos | 4 |
| 7. Retirada / Finish | 6 |
| 8. Cancelamento | 3 |
| 9. Casos de Borda | 4 |
| **Total** | **41** |
