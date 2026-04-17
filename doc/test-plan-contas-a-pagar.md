# Caderno de Testes: Módulo Financeiro - Contas a Pagar

O objetivo deste documento é assegurar a integridade total do módulo financeiro em termos de registro de despesas, categorização, identificação automática de vencimentos (inadimplências), controle de relatórios gerenciais na visão de cards, e restrição hierárquica de segurança.

Este módulo foca nas saídas do caixa (contas a pagar).

---

## 1. Segurança e Restrição de Acesso (RBAC)

**Cenário 1.1: Bloqueio absoluto para não administradores**  
- **Ação:** Logar no sistema utilizando um perfil puramente de Atendente (não-admin) e tentar forçar acesso à rota `/dashboard/financeiro/contas-a-pagar`.
- **Esperado:** O aplicativo deve redirecionar o acesso imediatamente de volta à home do `/dashboard`, sem exibir nenhuma rebarba de informações financeiras da interface corporativa. O acesso a essas métricas é exclusividade do administrador/dono da filial.

**Cenário 1.2: Isolamento de dados multi-tenant**  
- **Ação:** Como Admin, cadastrar uma conta a pagar de `R$ 5.000,00` em uma locatária (empresa). Logar no painel SaaS como de outra locatária distinta ou acessar o Supabase diretamente.
- **Esperado:** Apenas contas onde `company_id` corresponda à empresa ativa devem ser injetadas na tabela, prevenindo vazamento de dados do balanço financeiro entre clientes SaaS distintos.

---

## 2. Dashboard Resumo (Métricas de Cards Superiores)

**Cenário 2.1: Cálculo do Total Vencido e Status Derivado**  
- **Ação:** Visualizar os totalizadores no topo da tela e, em seguida, cadastrar uma conta com vencimento para **o dia de ontem**, não dando baixa nela (`pendente`).
- **Esperado:** O sistema deve automaticamente exibir para essa conta o *badge* vermelho `Vencido` (status derivado lógico de "pendente" + data no passado). Além disso, o card do *dashboard* "Total Vencido" deve receber um acréscimo exato no valor numérico somando esta conta.

**Cenário 2.2: Atualização fluída do fechamento de contas**  
- **Ação:** Visualizar e anotar os valores de "Total Pendente" e "Total Pago no Mês". Selecionar uma conta com status `Pendente`. Clicar em "Marcar como Pago".
- **Esperado:** O valor monetário da conta deve ser debitado organicamente do card "Total Pendente", e injetado diretamente no "Total Pago no Mês". Tudo na visualização geral via recarregamento de layout.

---

## 3. Cadastro de Nova Conta (e Recorrências)

**Cenário 3.1: Validações básicas de lançamento**  
- **Ação:** Abrir o modal de criação de "Nova Conta". Selecionar a filial, classificar em categoria `Imposto`, preencher valor em numérico ex: `1200,80` (que será formatado R$ 1.200,80), preencher a `Data de Vencimento`. Deixar sem Fornecedor. Clicar em Salvar.
- **Esperado:** A conta deve ser criada. O sistema não deve exigir fornecedor para esse eixo (exceto se futuramente for travado apenas quando for de categoria Custeio/Fornecimento). O valor monetário deve ter superado a quebra da string visual e virado um float puro (parse >= 0).

**Cenário 3.2: Geração de múltiplas instâncias (Boletos parcelados/Recorrências)**  
- **Ação:** Preencher as bordas usuais. Selecionar que a despesa deve ter "Recorrência = Mensal". Fixar quantidade de instâncias = `12` (sinalizando prestação de parcelamento de seguro anual). Cadastrar.
- **Esperado:** O sistema (via action backend) deve criar `12` registros paralelos separados na listagem. Cada um deve ter o vencimento offseteado por salto mensal lógico a partir do primeiro, mantendo a filial e as descrições. As instâncias não alteram umas as outras num futuro edit. 

**Cenário 3.3: Limitação de teto da repetição**  
- **Ação:** Pedir recorrência `Semanal` com `80` parcelas repetidas no campo input.
- **Esperado:** O Zod vai barrar o submit validando o limite máximo estipulado (ex: `Máximo de 60 parcelas` conforme código fonte).

---

## 4. Edições Curativas e Deleções

**Cenário 4.1: Retificação de valores sem mudança de fluxo**  
- **Ação:** Abrir uma conta atualmente `Pendente` com badget dinâmico de `Vencido` por data estagnada. Editar o Data de Vencimento alterando a data para o final da semana que vem.
- **Esperado:** O lançamento volta para amarelo (`Pendente`), corrigindo a percepção de inadimplência de forma transparente visando cobrir postergamento de faturas repactuadas.

**Cenário 4.2: Bloqueio ou fluxo reverso (Opcional - caso implementado o Undo)**  
- **Ação:** Editar as datas, fornecedor e valores base do descritivo da OS. Deletar a OS.
- **Esperado:** Processo de `soft-delete` assegurado pela policy do banco (deleted_at). A conta some da listagens e do dashboard de métricas globais para prevenir conflitos de fluxo de caixa futuro.

---

## 5. Fluxo de Pagamento / Dar Baixa (Checkout Financeiro)

**Cenário 5.1: Formulário de compensação do debito**  
- **Ação:** Encontrar uma fatura da energia elétrica (Pendente). Escolher "Dar Baixa/Pagamento". Submeter sem selecionar o input `Forma de pagamento` nem a `Data Que Ocorreu O Pagamento`.
- **Esperado:** O sistema exige saber se foi em *Dinheiro, PIX, Cartão, Transferência* ou afins e em que data exata isso saiu do caixa.

**Cenário 5.2: Fim da vida da conta e registro contábil**  
- **Ação:** Selecionar como *Pagamento via "PIX"*, data fixata em d-1, e escrever anotações de comprovantes ("Bco Inter - Aut: 11144"). Finalizar Baixa.
- **Esperado:** O registro não está mais editável e passa a constar com o status `pago` (Verde). O histórico vai eternizar que a sua finalização injetou de qual meio financeiro a parcela foi compensada, para confrontação de contabilidade de ponta.
