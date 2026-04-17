# Plano de Testes Manual - Módulo: Relatórios

Este documento detalha os cenários de testes manuais para garantir a integridade, o cálculo correto das métricas e a aplicação do controle de acesso para o módulo de Relatórios (Business Intelligence) do AssistenciaNet.

---

## 1. Controle de Acesso e Permissões (RBAC)
**Objetivo:** Garantir que dados estratégicos estejam acessíveis apenas para usuários autorizados.
- [ ] Tentar acessar a rota `/dashboard/relatorios` com um usuário `atendente`. O sistema deve bloquear o acesso ou redirecionar.
- [ ] Tentar acessar a rota `/dashboard/relatorios` com um usuário `tecnico`. O sistema deve bloquear o acesso ou redirecionar.
- [ ] Acessar `/dashboard/relatorios` com o usuário `admin`. O dashboard deve carregar corretamente.

## 2. Isolamento de Tenant (Multi-Tenant) e Contexto
**Objetivo:** Verificar se empresas distintas não compartilham dados financeiros, de OS ou de estoque nos relatórios.
- [ ] Como `admin` da Empresa A, verificar os relatórios. O cálculo deve refletir apenas as Ordens de Serviço, Movimentações e Contas vinculadas à Empresa A.
- [ ] Como `admin` da Empresa B, verificar se nenhuma movimentação, caixa ou OS da Empresa A distorce os totais, as taxas de recusa ou os lucros.

## 3. Filtros Globlais (Período e Filial)
**Objetivo:** Validar o correto recorte dos dados agregados usando a seleção de data e a seleção de filial.
- [ ] **Filtro de Data:** Escolher focar apenas na `Semana Passada`. Validar que contas a pagar vencidas hoje não aparecem nos relatórios, nem vendas e OS concluídas hoje. (O cálculo de lucro precisa cair ou zerar se não houve movimentação manual).
- [ ] **Filtro de Filial (Todas):** Deixar como "Todas as filiais". Verificar se a aba de "Comparativo de Filiais" lista o resultado de todas.
- [ ] **Filtro de Filial (Específica):** Escolher a Filial X. Verificar métricas como `Faturamento`, `Ordens de Serviço Abertas` e `Despesas` apenas para essa filial. Peças "mais usadas" também devem focar na filial escolhida.

## 4. Agregações e Cálculos: Ordens de Serviço
**Objetivo:** Validar as lógicas estatísticas sobre o volume de atendimento e OSs.
- [ ] **Aberta vs. Concluídas:** Criar 2 OSs e concluir 1 delas que estivesse anteriormente aberta no período. Validar que as novas contagens de criadas e concluídas batem. (Baseado na tabela de `service_orders` com preenchimento da `completed_at`).
- [ ] **Taxa de Recusa:** Criar um orçamento e marcá-lo como "recusado". Aprovar outros dois orçamentos. Validar se a `%` da `Taxa de Recusa` bate corretamente (ex: `1 recusado / 3 total = 33.3%`).
- [ ] **Ranking por Técnico / Aparelhos:** Finalizar ou alocar OSs para diferentes técnicos. Validar que o Top Técnicos ou Top Aparelhos lista corretamente pela quantidade com "Sem técnico" e "Sem tipo" caindo num bloco fallback.

## 5. Agregações e Cálculos: Financeiro
**Objetivo:** Assegurar que os relatórios contábeis de faturamento neto baseiam-se em lógicas estritas de movimentação e orçamentos.
- [ ] **Faturamento e Ticket Médio:** Criar entradas no Fluxo de Caixa vinculadas a uma OS (`cash_entries`). Validar que Faturamento soma devidamente todas as entradas do período e que Ticket Médio equivale a `Faturamento / Qtde Total de cash_entries pagas`.
- [ ] **Contas a Receber (Fiado / Pendente):** Em Contas a Receber, testar se Ordens de Serviço `Finalizado` porém `Pendente` continuam compondo o valor de Contas a Receber no topo do relatório.
- [ ] **Lucro Bruto (Serviços vs. Peças):** Verificar a soma de valores. O lucro bruto de Serviços apenas soma orçamentos com tipo `serviço`. O lucro bruto de Peças leva em conta Venda/Adição de Item `-` (menos) Custo da Peça (calculado via DB em tempo real ou movimentação).
- [ ] **Lucro Líquido:** Deve bater fielmente com a fórmula de `Receita Total (cash) - Despesas Totais (bills)`.
- [ ] **Gastos por Categoria:** Conferir se as despesas cadastradas via "Contas a Pagar" aparecem corretamente listadas por suas categorias definidas (ex. Conta de Luz -> Energia).

## 6. Agregações e Cálculos: Estoque
**Objetivo:** Validar o motor de relatórios em relação à saúde e valuation (valor financeiro) do Inventário da empresa instalada.
- [ ] **Valor em Estoque ($):** Adicionar quantidades variadas de peças x preços de custo diferentes para as filiais. Conferir se `somatório de max(0, estoque_fisico) * custo` confere (isso evita estoques negativos tirarem valor na fórmula teórica principal).
- [ ] **Estoque Crítico (Zeradou ou Baixo):** Definir o Estoque Mínimo (`min_stock`) em 5. Ter em caixa físico apenas 3. Validar se aumenta a contabilização das peças "Abaixo do Mínimo/Zerado" no painel. O mesmo para =0.
- [ ] **Peças Estagnadas:** No banco de dados, o limite hardcoded é de `90 dias`. Como teste, realizar ajustes para forçar `entry_date` além deste escopo (falsificar dados via prisma studio/supabase) e verificar se começam a popar como 'estagnadas' (sem alteração nos ultimos 90 dias).
- [ ] **Custo em Peças por OS:** Utilizar uma peça do Estoque durante a OS. Observar se seu custo (Custo Unitário da época ou Custo do Cadastro X Quantidade Usada) reduz do Custo Total exposto.

## 7. Cenários Extremos (Edge Cases) e Carga
**Objetivo:** Averiguar como a contabilidade analítica sobrevive perante situações adversas.
- [ ] **Filial ou Técnico Excluído:** Seletivamente realizar *Soft-Delete* de um Técnico ou Filial que originou transações. Validar que eles perdem presença seletiva nos combos ou passam a entrar como labels 'Sem técnico' em novas checagens, enquanto transações legadas aguentam a integridade relacional.
- [ ] **Preços e Custos Zerados:** Avaliar o status do Lucro de Peça quando o Custo no cadastro de determinada peça for `0` ou nulo (retorno esperado: considerar lucro de venda de peça como 100%).
- [ ] **Intervalos de Datas Enormes:** Escolher uma Data Inicial há muitos anos para englobar milhares de contas e Ordens - checando se o sistema performa ok ou gera erro de Timeout de Data.
