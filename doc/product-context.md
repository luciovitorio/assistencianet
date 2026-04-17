# Contexto Do Produto

## Posicionamento
- AssistenciaNet e um SaaS para assistencias tecnicas com foco inicial em operacoes multi-filial.
- O cliente piloto Orquidia define o baseline do dominio enquanto o produto amadurece para escalar.

## Prioridades Atuais
- Ordens de servico com fluxo completo e historico confiavel.
- Cadastro de clientes, equipamentos e filiais com visao integrada.
- Controle de funcionarios, acessos e auditoria administrativa.
- Financeiro por filial com foco em faturamento diario, fluxo de caixa e despesas.
- Estoque com transferencia entre filiais, estoque minimo e vinculo com fornecedores.

## Regras De Dominio
- Cliente e equipamento precisam manter historico longitudinal consultavel.
- Uma OS pode conter multiplos servicos.
- Aprovacao de orcamento pode ser formalizada por WhatsApp ou verbalmente.
- Garantia padrao inicial considerada: 90 dias.
- Filiais compartilham historico operacional, mas o financeiro precisa continuar separado.
- Perfis de acesso precisam restringir custos, exclusoes e visibilidade operacional por papel.

## Diretrizes De Produto
- Preferir fluxos simples e operacionais antes de automacoes complexas.
- Evitar exigir dados que a operacao nao usa no dia a dia.
- Toda automacao precisa preservar rastreabilidade e contexto administrativo.
- Ao introduzir soft delete, manter caminhos claros de reativacao, auditoria e consistencia com Auth.

## Sinais Importantes Para UX
- PT-BR apenas.
- Desktop-first com bom comportamento responsivo.
- WhatsApp deve ser tratado como extensao natural do fluxo operacional.
- Dashboards devem destacar OS abertas, OS entregues, faturamento e despesas operacionais.

## Decisoes Ja Assumidas
- Light mode first.
- Data tables e telas administrativas devem reutilizar os componentes compartilhados do dashboard.
- Supabase e a base operacional atual para auth, dados e migrations.
- Logs de sistema e trilha de auditoria fazem parte do produto, nao sao detalhe tecnico.

## Itens A Validar Depois
- Laudo tecnico formal ao fim do servico.
- Grau de obrigatoriedade de fotos do equipamento.
- Estrategia de notificacao para reativacao de clientes inativos.
- Escopo de QR code e codigo de barras no estoque.
