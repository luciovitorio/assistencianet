# Caderno de Testes: Módulo Financeiro - Contas a Receber

O objetivo deste documento é certificar que o painel de Contas a Receber apresente, de forma consistente, passiva e analítica, as Ordens de Serviço (OSs) atreladas à receita que está engatilhada ou em aberto no sistema financeiro.

Importante frisar que no fluxo atual de produto d'AssistenciaNet, a injeção do "Contas a Receber" não é manual (ao contrário do Contas a Pagar). **A lista é orgânica e extrai 100% dos dados das Ordens de Serviço cujos orçamentos aprovados criaram lastro financeiro**.

---

## 1. Segurança e Restrição (RBAC)

**Cenário 1.1: Bloqueio absoluto para Atendentes / Técnicos**  
- **Ação:** Autenticar no sistema com usuário de permissão padrão (Atendente). Tentar bater na rota `/dashboard/financeiro/contas-a-receber` forçando pela URL.
- **Esperado:** O front-end bloqueia o acesso via *server request* exigindo nível `isAdmin: true` no contexto de hierarquia, derrubando a navegação para o sub-dashboard vazio. Apenas contas administradoras gerenciam as contas a receber.

**Cenário 1.2: Visão Unificada mas Isolada da Empresa**  
- **Ação:** Logar num Master Admin de SaaS de uma locatária X (Acessórios.com) vs locatária Y (MundoTech).
- **Esperado:** Os dados devem espelhar 100% do filtro da constraint `company_id`.

---

## 2. Injeção de "Prontas para Retirada"

Ordens de Serviço em que o técnico inseriu o status como "Pronto" e o cliente ainda não veio buscar (receita represada no balcão).

**Cenário 2.1: Agrupamento correto na Categoria Pronto**  
- **Ação:** No painel de OS, aprovar um orçamento de R$ 300,00. Trabalhar na OS e mudar o status para **"Pronto"**. Imediatamente, ir para aba de Contas a Receber.
- **Esperado:** Essa OS específica deve figurar ativamente na tabela com o rótulo azul claro de `"Aguardando retirada"`. 

**Cenário 2.2: Sincronia Rígida de Valores (Amount)**  
- **Ação:** A mesma OS "Pronta" citada acima de R$ 300,00 sofra uma renegociação/ajuste por parte do técnico lá na página de OSs, mudando o orçamento Aprovado para R$ 150,00 de desconto final. Voltar em Contas a Receber.
- **Esperado:** A lista de Contas a Receber deve exibir na coluna `Valor` o dígito R$ 150,00. Nada se mantém em cache. A extração avalia o total do estimate onde status estivar 'Aprovado'. (Se uma OS ficar `Pronto` mas não houver orçamento aprovado sistêmico a mesma aparecerá cotada a `—` R$ 0,00).

---

## 3. Injeção de "Entregues Não Pagas (Fiado)"

Ordens de Segurança em que o atendente finalizou entregando ao cliente (`Finalizado`), porém marcou que não recebeu o pagamento formal (`Pendente`).

**Cenário 3.1: Captura e mudança de quadrante**  
- **Ação:** Na mesma OS descrita no cenário 2.1, prosseguir no Stepper para *Retirada/Entrega*. Dar andamento escolhendo "Finalizar OS sem Pagamento/Pagamento para depois", cujo status final vire `Finalizado` porém `payment_status = Pendente`.
- **Esperado:** A OS deverá continuar orbitando em `Contas a Receber`, mas transita instantaneamente para o Grupo (Fiado) com rótulo vermelho `"Entregue · não pago"`. 

**Cenário 3.2: Contagem dos dias de "Fiado"**  
- **Ação:** Alterar intencionalmente via banco a data do campo `delivered_at` da OS dessa entrega sem pagamento para uma quinzena atrás.
- **Esperado:** A coluna temporal no Contas a Receber deve calcular (Data de Hoje - Data do Delivered At) exibindo vermelho de 15 dias de atraso. O cartão deve apontar perfeitamente para qual métrica usar ao alertar o cobrador financeiro.

---

## 4. Remoção Definitiva da Listagem (Recebimento Efetivo)

**Cenário 4.1: Retirada via checkout (Pagamento na Loja)**  
- **Ação:** Assumir uma das inúmeras pendências do Contas A Receber, acessar a própria aba da Ordem de Serviço, fazer a Baixa preenchendo valor completo através da tela de Retirada (marcando "Pago" com método de dinheiro/cartão/PIX). Voltar ao dashboard financeiro.
- **Esperado:** A respectiva conta precisa sumir imediatamente da tabela, zerando todos os rastros pendentes, refletindo na decupagem dos Cards numéricos (o valor desaparece do top card e do count do grupo "Fiado" e/ou "Pronto").

---

## 5. Dashboard, Tabelas e Filtros

**Cenário 5.1: Dinâmica Matemática nos Cards e na Data Table**  
- **Ação:** Efetuar simulações da Tabela selecionando a barra de buscas buscando por `João`, o filtro customizado agrupado focando só em `Prontas para Retirada`, e filtro exclusivo na `Filial A`.
- **Esperado:**
  - Apenas as informações cruzadas deverão brilhar na lista.
  - A paginação deverá respeitar tetos numéricos exatos de 15 linhas processadas. 
  - (Obs: Lembre-se que os totais financeiros exibidos no painel do topo, são globais antes dos filtros reativos de baixo, calculados por `summary`).
