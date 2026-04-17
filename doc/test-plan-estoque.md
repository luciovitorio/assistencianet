# Caderno de Testes: Módulo de Estoque e Movimentações

O objetivo deste documento é mapear todos os cenários de uso do módulo de **Estoque**, garantindo que o controle físico das peças (Entradas, Ajustes, Transferências e Exibição do Histórico) funcione perfeitamente com separação por filial e controle de peças reservadas.

Este documento foca exclusivamente na **movimentação e controle quantitativo** de itens. (O cadastro base do catálogo das peças é testado no módulo `Peças`).

---

## 1. Listagem e Visão Geral do Estoque

**Cenário 1.1: Visualização correta dos dados por filial**  
- **Ação:** Acessar a página de Estoque.
- **Esperado:** A listagem deve exibir as peças e suas respectivas quantidades, separados por categorias. Os valores apresentados devem demonstrar a seguinte fórmula matemática por peça:
  - **Físico:** Total real dentro da empresa.
  - **Reservado:** Peças que já estão alocadas em Orçamentos (Estimates) aprovados em Ordens de Serviço aguardando finalização.
  - **Disponível:** Físico - Reservado.
  - O seletor superior de "Filial" deve filtrar e recalcular instantaneamente os números exibidos na tabela para refletir apenas a filial escolhida (se não estiver em visão global).

**Cenário 1.2: Alertas de estoque mínimo**  
- **Ação:** Visualizar a listagem de uma peça na qual o saldo `Físico` esteja abaixo do limite configurado de `Estoque Mínimo`.
- **Esperado:** O sistema deve destacar ou sinalizar a peça alertando a necessidade de reposição (nível crítico).

---

## 2. Nova Entrada de Estoque (Recebimento)

**Cenário 2.1: Bloqueio de submissão com dados rasos**  
- **Ação:** Abrir o modal de "Nova Entrada", deixar os campos vazios e tentar "Registrar Entrada".
- **Esperado:** O formulário deve bloquear a ação e indicar falhas nas propriedades: `Peça` (obrigatória), `Filial` (obrigatória), e `Data de Entrada` (obrigatória).

**Cenário 2.2: Validação da Quantidade e campos numéricos**  
- **Ação:** Preencher a Nova Entrada, porém no campo "Quantidade a entrar" digitar um valor texto, valor nulo, `0` ou `-5`.
- **Esperado:** O *Zod Resolver* deve interceptar imediatamente apontando que "A quantidade deve ser maior que zero" e proibir entradas regressivas.

**Cenário 2.3: Associação de fornecedor padrão**  
- **Ação:** Iniciar uma Entrada. Selecionar uma Peça `X` e um Fornecedor `Y`. Marcar o checkbox "Definir como fornecedor padrão da peça". Preencher quantidade e salvar.
- **Esperado:** A entrada deve ser confirmada. Ao retornar no módulo base de `Peças` e checar os detalhes da peça `X`, o fornecedor principal deve estar atrelado à `Y`. Se não foi selecionado fornecedor no modal de entrada, a caixa de seleção de fornecedor padrão deve estar **desabilitada** (cursor-not-allowed).

**Cenário 2.4: Mascaramento do custo unitário**  
- **Ação:** Preencher "Custo unitário" com um valor decimal como `150,5` no modal de entrada.
- **Esperado:** O campo da máscara deve tratar formatando para visual `R$ 150,50` e repassar exclusivamente numérico `150.50` para o backend sem estourar quebra de tipagem.

---

## 3. Ajuste de Inventário (Balanço)

**Cenário 3.1: Comportamento responsivo do formulário por filial**  
- **Ação:** Clicar para "Ajustar Inventário" de uma peça de um produto. Dentro do modal, trocar a `Filial` no input select.
- **Esperado:** O componente (React Hook Form) deve atualizar em tempo real o texto na interface exibindo "Saldo atual nesta filial: X peças", e refletir o total X no campo de nova quantidade para a filial selecionada recém trocada. 

**Cenário 3.2: Reação de cálculo do DELTA de ajuste**  
- **Ação:** Supondo que a Peça possui 10 itens na prateleira (Físico real). Digitar o número `15` em "Nova quantidade real". Depois testar o número `8`.
- **Esperado:** 
  - Ao digitar 15: O helper do input deve apresentar textualmente uma variação positiva (+5).
  - Ao digitar 8: A interface deve alertar no helper uma variação (-2).
  - Caso digite 10 (exatamente o que já tem), o botão de Submit "Confirmar Ajuste" deve ficar bloqueado (disabled).

**Cenário 3.3: Bloqueio de input negativo**  
- **Ação:** Digitar um saldo ajustado final negativo como `-2`.
- **Esperado:** Validação deve acusar "Quantidade não pode ser negativa", forçando que o valor mais baixo possível de uma prateleira vazia seja sempre `0`.

---

## 4. Transferências (Multi-Filial)

**Cenário 4.1: Retenção de peças reservadas na origem**  
- **Ação:** Verificar uma peça que possui 10 unidades físicas na `Filial A`, mas **4** estão reservadas em OSs em andamento, gerando `6` disponíveis para movimentação. Tentar transferir 7 unidades da `Filial A` pra base da `Filial B`.
- **Esperado:** O campo de quantidade máxima (max-value input) vai proibir ir acima de 6, pois itens sob reserva orçada são blindados contra transferência. O botão "Confirmar" é bloqueado exibindo alerta se disponível estiver `0`.

**Cenário 4.2: Conflitos de Origem/Destino IDênticos**  
- **Ação:** Abrir o modal de transferência. Marcar a origem como `Centro` e o destino propositalmente como `Centro`.
- **Esperado:** 
  - O select de "Filial de destino" deve remover automaticamente a originadora das opções, ou limpar o formulário se manipulado, com erro apontando "A filial de destino deve ser diferente da origem".

**Cenário 4.3: Garantia da Atomatização de Transferência (Double-record)**  
- **Ação:** Efetuar a transferência de 5 peças da filial X para filial Y. 
- **Esperado:** O saldo físico da filial X deve cair 5 e da filial Y aumentar 5. Acessando o "Histórico", os logs devem apontar dois novos registros de espelho (um como `transferencia_saida` na origem, e o outro acoplado como `transferencia_entrada` no destino, datados simultaneamente).

---

## 5. Histórico de Movimentações (Timeline)

**Cenário 5.1: Auditoria em cascata e carregamento de logs**  
- **Ação:** Clicar no botão "Ver Histórico" (Sheet menu) relativo à uma peça que recebeu inúmeras entradas e ajustes.
- **Esperado:** A *Side Sheet* lateral correta deve ser deslizada. Deve haver uma timeline legível para o usuário comum detalhando, de cima para baixo: "Data e Hora, Tipo (Entrada, Saída de Venda OS, Descarte/Ajuste), Quantidade impactada e quem foi o responsável (Atendente)".
- **Detalhes Técnicos:** O histórico deve respeitar a filial que está sendo focada, ou apresentar o rótulo de onde ocorreu o evento caso a visualização seja por `Todas as Filiais`.
