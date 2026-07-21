export type BlogBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'template'; title: string; text: string }

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  readingMinutes: number
  tag: string
  keywords: string[]
  blocks: BlogBlock[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'sistema-de-ordem-de-servico-para-assistencia-tecnica',
    title: 'Sistema de ordem de serviço para assistência técnica: o que precisa ter e como escolher',
    description:
      'Guia direto para escolher um sistema de OS para assistência técnica: funcionalidades essenciais, erros comuns na escolha e quanto custa.',
    publishedAt: '2026-07-21',
    readingMinutes: 7,
    tag: 'Gestão',
    keywords: [
      'sistema de ordem de serviço para assistência técnica',
      'sistema de os',
      'software para assistência técnica',
      'programa de ordem de serviço',
    ],
    blocks: [
      {
        type: 'paragraph',
        text: 'Se a sua assistência técnica ainda controla ordens de serviço em caderno, planilha ou em conversas soltas de WhatsApp, você já sentiu na pele: cliente ligando para saber do aparelho, orçamento esquecido, peça que "sumiu" do estoque e garantia sem registro. Um sistema de ordem de serviço resolve exatamente isso — mas nem todo sistema serve para a rotina de uma assistência.',
      },
      {
        type: 'paragraph',
        text: 'Neste guia, mostramos o que um sistema de OS precisa ter para funcionar no balcão de verdade, os erros mais comuns na hora de escolher e o que esperar de preço.',
      },
      { type: 'heading', text: 'O que um sistema de OS para assistência técnica precisa ter' },
      {
        type: 'list',
        items: [
          'Abertura de OS rápida: no balcão, cada minuto conta. Cadastrar cliente, aparelho, defeito relatado e prazo precisa levar menos de dois minutos.',
          'Status claros e personalizáveis: orçamento, aprovado, em reparo, pronto, entregue. Todo mundo na equipe precisa saber em que pé está cada aparelho.',
          'Notificação automática ao cliente: o maior ladrão de tempo da assistência é responder "e aí, ficou pronto?". O sistema deve avisar o cliente sozinho, de preferência pelo WhatsApp.',
          'Orçamento com aprovação registrada: quem aprovou, quando e por qual canal. Isso evita a clássica discussão na hora de cobrar.',
          'Controle de estoque de peças vinculado à OS: quando a peça é usada no reparo, o estoque baixa sozinho — sem controle paralelo em planilha.',
          'Caixa e financeiro integrados: o pagamento da OS entra direto no caixa do dia, com forma de pagamento e histórico.',
          'Garantia com histórico: se o aparelho voltar, você precisa ver na hora o que foi feito, qual peça foi trocada e se ainda está na garantia.',
          'Controle por usuário: o técnico vê o que precisa, o atendente vê o que precisa, e o dono vê tudo — inclusive quem fez o quê.',
        ],
      },
      { type: 'heading', text: 'Erros comuns na hora de escolher' },
      {
        type: 'paragraph',
        text: 'O erro número um é escolher um sistema genérico de "ordem de serviço" feito para qualquer tipo de empresa. Assistência técnica tem particularidades: entrada e saída de aparelho, checklist do estado do equipamento, orçamento com aprovação, peça vinculada ao reparo, garantia. Sistemas genéricos até funcionam no início, mas você acaba voltando para a planilha para cobrir as lacunas.',
      },
      {
        type: 'paragraph',
        text: 'O segundo erro é ignorar a comunicação com o cliente. Um sistema que organiza por dentro mas não avisa o cliente por fora resolve só metade do problema — o telefone continua tocando. Priorize sistemas com notificações automáticas por WhatsApp.',
      },
      {
        type: 'paragraph',
        text: 'O terceiro é escolher pelo preço mais baixo sem testar. Quase todo sistema oferece período de teste grátis. Use o teste com a sua rotina real: abra OS de verdade por alguns dias, envie orçamento, dê baixa em peça. Em uma semana você sabe se o sistema encaixa no seu fluxo.',
      },
      { type: 'heading', text: 'Quanto custa um sistema de OS' },
      {
        type: 'paragraph',
        text: 'No Brasil, sistemas de gestão para assistência técnica custam entre R$ 50 e R$ 300 por mês, dependendo do número de usuários e funcionalidades. Para colocar em perspectiva: se o sistema evitar a perda de duas peças por mês, ou liberar uma hora por dia do atendente que respondia "ficou pronto?" no WhatsApp, ele já se pagou.',
      },
      { type: 'heading', text: 'Experimente com a sua operação real' },
      {
        type: 'paragraph',
        text: 'O SmartConserto foi criado especificamente para assistências técnicas: OS completa com checklist, orçamento com aprovação pelo WhatsApp, notificações automáticas de status, estoque vinculado ao reparo, caixa integrado e controle multi-filial. Você pode testar grátis por 30 dias, sem cartão de crédito — abra suas OS reais e veja a diferença na primeira semana.',
      },
    ],
  },
  {
    slug: 'modelo-de-ordem-de-servico-para-assistencia-tecnica',
    title: 'Modelo de ordem de serviço para assistência técnica (o que não pode faltar)',
    description:
      'Modelo completo de ordem de serviço para assistência técnica: campos obrigatórios, checklist de entrada, termos de garantia e como sair do papel.',
    publishedAt: '2026-07-21',
    readingMinutes: 6,
    tag: 'Modelos',
    keywords: [
      'modelo de ordem de serviço para assistência técnica',
      'modelo de os',
      'ordem de serviço pronta',
      'ordem de serviço conserto de celular',
    ],
    blocks: [
      {
        type: 'paragraph',
        text: 'A ordem de serviço é o documento mais importante da assistência técnica: é ela que protege você e o cliente do momento em que o aparelho entra na bancada até a entrega. Uma OS incompleta gera discussão na entrega, prejuízo em garantia e até problema jurídico. Abaixo está a estrutura completa que uma OS de assistência precisa ter — use como modelo para montar a sua.',
      },
      { type: 'heading', text: '1. Identificação básica' },
      {
        type: 'list',
        items: [
          'Número da OS (sequencial, único)',
          'Data e hora de entrada',
          'Previsão de entrega',
          'Dados da empresa (nome, CNPJ, endereço, telefone)',
          'Dados do cliente (nome, CPF, telefone/WhatsApp)',
        ],
      },
      { type: 'heading', text: '2. Identificação do equipamento' },
      {
        type: 'list',
        items: [
          'Tipo de aparelho, marca e modelo',
          'Número de série / IMEI',
          'Senha ou padrão de desbloqueio (com autorização do cliente)',
          'Acessórios deixados junto (capinha, película, chip, cartão de memória, carregador)',
        ],
      },
      { type: 'heading', text: '3. Checklist do estado de entrada' },
      {
        type: 'paragraph',
        text: 'Esse é o item que mais evita conflito na entrega e que quase todo modelo de OS em papel esquece. Registre o estado do aparelho na entrada, de preferência com fotos:',
      },
      {
        type: 'list',
        items: [
          'Tela: trincada, riscada ou intacta? Liga? Toque funciona?',
          'Carcaça: amassados, riscos, parafusos faltando?',
          'Aparelho liga? Se não liga, deixe registrado que o estado interno não pôde ser verificado.',
          'Sinais de contato com líquido ou de reparo anterior por terceiros.',
        ],
      },
      { type: 'heading', text: '4. Defeito relatado e diagnóstico' },
      {
        type: 'list',
        items: [
          'Defeito relatado pelo cliente (nas palavras dele)',
          'Diagnóstico técnico (preenchido depois da análise)',
          'Serviços a executar e peças necessárias',
        ],
      },
      { type: 'heading', text: '5. Valores e aprovação' },
      {
        type: 'list',
        items: [
          'Valor do orçamento (peças + mão de obra)',
          'Registro da aprovação do cliente: quem aprovou, quando e por qual canal (essencial!)',
          'Forma de pagamento',
        ],
      },
      { type: 'heading', text: '6. Termos e assinatura' },
      {
        type: 'list',
        items: [
          'Prazo de garantia do serviço e o que ela cobre (e o que não cobre)',
          'Prazo para retirada do aparelho e política para aparelhos abandonados',
          'Aviso sobre risco de perda de dados, quando aplicável',
          'Assinatura do cliente na entrada e na retirada',
        ],
      },
      { type: 'heading', text: 'O problema do modelo em papel' },
      {
        type: 'paragraph',
        text: 'O modelo acima funciona em bloco impresso — muitas assistências começam assim. Mas o papel cobra seu preço: não avisa o cliente quando o aparelho fica pronto, não baixa peça do estoque, não soma o caixa do dia, não busca o histórico quando o aparelho volta em garantia, e some quando você mais precisa dele.',
      },
      {
        type: 'paragraph',
        text: 'No SmartConserto, essa mesma OS existe em formato digital: checklist de entrada, aprovação de orçamento pelo WhatsApp com registro automático, notificação de status para o cliente, baixa de estoque e caixa integrados. Você imprime o comprovante para o cliente quando quiser, mas o controle fica no sistema. Teste grátis por 30 dias, sem cartão.',
      },
    ],
  },
  {
    slug: 'como-organizar-assistencia-tecnica-de-celular',
    title: 'Como organizar uma assistência técnica de celular: guia prático em 7 passos',
    description:
      'Passo a passo para organizar sua assistência técnica: fluxo de OS, estoque de peças, caixa, comunicação com cliente e indicadores para acompanhar.',
    publishedAt: '2026-07-21',
    readingMinutes: 8,
    tag: 'Gestão',
    keywords: [
      'como organizar assistência técnica',
      'organizar assistência técnica de celular',
      'gestão de assistência técnica',
      'abrir assistência técnica',
    ],
    blocks: [
      {
        type: 'paragraph',
        text: 'A maioria das assistências técnicas não quebra por falta de serviço — quebra por desorganização. Aparelho sem identificação na bancada, peça comprada duas vezes, orçamento que o cliente "não lembra de ter aprovado", caixa que não fecha. A boa notícia: organizar uma assistência não exige consultoria cara, exige método. Aqui está o passo a passo.',
      },
      { type: 'heading', text: 'Passo 1: toda entrada vira uma OS — sem exceção' },
      {
        type: 'paragraph',
        text: 'A regra número um da assistência organizada: nenhum aparelho entra na bancada sem ordem de serviço. Nem o "consertinho rápido do amigo", nem a "olhadinha de graça". A OS identifica o aparelho, registra o estado de entrada, formaliza o defeito e protege você em caso de conflito. Se hoje você não faz isso, comece por aqui antes de qualquer outra coisa.',
      },
      { type: 'heading', text: 'Passo 2: defina o fluxo de status do reparo' },
      {
        type: 'paragraph',
        text: 'Todo aparelho na sua loja deve estar em um status claro: aguardando análise → orçamento enviado → aprovado → em reparo → pronto → entregue. Com o fluxo definido, qualquer pessoa da equipe responde em segundos onde está cada aparelho — e você enxerga gargalos (muitos aparelhos parados em "orçamento enviado" = problema de follow-up, não de bancada).',
      },
      { type: 'heading', text: 'Passo 3: separe orçamento de execução' },
      {
        type: 'paragraph',
        text: 'Nunca execute sem aprovação registrada. O orçamento deve ser enviado por um canal que deixe rastro (WhatsApp é perfeito) e a aprovação deve ficar registrada na OS: quem aprovou, quando, por onde. Serviço executado sem aprovação registrada é a principal causa de calote em assistência.',
      },
      { type: 'heading', text: 'Passo 4: controle o estoque pelas OS, não por contagem' },
      {
        type: 'paragraph',
        text: 'Estoque de assistência descontrola porque a peça sai da gaveta direto para a bancada sem registro. A solução é vincular a peça à OS: usou a tela no reparo, ela sai do estoque automaticamente naquela OS. Assim você sabe quanto custou cada reparo, quando repor cada peça e onde foi parar cada item comprado.',
      },
      { type: 'heading', text: 'Passo 5: feche o caixa todos os dias' },
      {
        type: 'paragraph',
        text: 'Cada pagamento de OS, cada venda de acessório e cada despesa entram no caixa do dia, com forma de pagamento. No fim do dia, o caixa fecha e qualquer diferença aparece na hora — não no fim do mês, quando já é impossível descobrir o que aconteceu.',
      },
      { type: 'heading', text: 'Passo 6: avise o cliente antes que ele pergunte' },
      {
        type: 'paragraph',
        text: 'Boa parte do tempo do atendente é consumida respondendo "e aí, ficou pronto?". Inverta o jogo: a cada mudança de status (orçamento pronto, reparo concluído, aparelho disponível para retirada), o cliente recebe uma mensagem automática no WhatsApp. Menos interrupção para a equipe, mais confiança para o cliente — e aparelho parado menos tempo na prateleira esperando retirada.',
      },
      { type: 'heading', text: 'Passo 7: acompanhe 4 números toda semana' },
      {
        type: 'list',
        items: [
          'OS abertas x OS entregues na semana (a fila está crescendo ou andando?)',
          'Tempo médio entre entrada e entrega (seu prazo real, não o prometido)',
          'Taxa de aprovação de orçamentos (orçamentos recusados demais = preço ou comunicação)',
          'Faturamento e ticket médio por OS',
        ],
      },
      { type: 'heading', text: 'Do caderno para o sistema' },
      {
        type: 'paragraph',
        text: 'Dá para implementar tudo isso em papel e planilha? Dá — e é melhor que nada. Mas cada passo acima é trabalho manual que um sistema faz sozinho: a OS numera e organiza os status, o orçamento vai pelo WhatsApp com aprovação registrada, a peça baixa do estoque na OS, o caixa soma no dia, o cliente é avisado automaticamente e os indicadores aparecem prontos no painel. O SmartConserto faz exatamente isso, e você testa grátis por 30 dias, sem cartão de crédito.',
      },
    ],
  },
  {
    slug: 'mensagens-prontas-whatsapp-assistencia-tecnica',
    title: 'Mensagens prontas de WhatsApp para assistência técnica (copie e use)',
    description:
      'Templates prontos de mensagens de WhatsApp para assistência técnica: aparelho pronto, orçamento, cobrança e pós-venda. Copie, adapte e use hoje.',
    publishedAt: '2026-07-21',
    readingMinutes: 6,
    tag: 'WhatsApp',
    keywords: [
      'mensagem pronta assistência técnica',
      'mensagem aparelho pronto whatsapp',
      'mensagem de orçamento para cliente',
      'whatsapp assistência técnica',
    ],
    blocks: [
      {
        type: 'paragraph',
        text: 'O WhatsApp é o canal número um entre assistência técnica e cliente no Brasil. Mas escrever a mesma mensagem dezenas de vezes por dia consome tempo e sai diferente a cada vez. Abaixo estão templates prontos para os principais momentos do atendimento — copie, troque os campos entre colchetes e use.',
      },
      { type: 'heading', text: 'Confirmação de entrada do aparelho' },
      {
        type: 'template',
        title: 'Entrada na assistência',
        text: 'Olá, [nome]! Recebemos seu [aparelho] aqui na [nome da loja]. 📋 Sua ordem de serviço é a nº [número]. Vamos analisar e te enviamos o orçamento até [prazo]. Qualquer novidade, avisamos por aqui!',
      },
      { type: 'heading', text: 'Envio de orçamento' },
      {
        type: 'template',
        title: 'Orçamento pronto',
        text: 'Oi, [nome]! Analisamos seu [aparelho] (OS nº [número]). 🔎 Diagnóstico: [defeito encontrado]. O reparo fica em R$ [valor], com garantia de [prazo de garantia]. Posso dar andamento? É só responder SIM aqui que já iniciamos. 👍',
      },
      { type: 'heading', text: 'Lembrete de orçamento sem resposta' },
      {
        type: 'template',
        title: 'Follow-up de orçamento (24–48h depois)',
        text: 'Oi, [nome]! Passando para lembrar do orçamento do seu [aparelho]: R$ [valor], com garantia de [prazo]. Ele fica válido até [data]. Se tiver qualquer dúvida sobre o reparo, me chama por aqui que eu explico! 😊',
      },
      { type: 'heading', text: 'Aparelho pronto para retirada' },
      {
        type: 'template',
        title: 'Reparo concluído',
        text: 'Boa notícia, [nome]! 🎉 Seu [aparelho] está pronto! O reparo de [serviço] foi concluído e testado. Você pode retirar na [nome da loja], [endereço], de [horário de funcionamento]. Total: R$ [valor]. Aceitamos PIX, cartão e dinheiro.',
      },
      { type: 'heading', text: 'Lembrete de retirada' },
      {
        type: 'template',
        title: 'Aparelho aguardando retirada',
        text: 'Oi, [nome]! Seu [aparelho] continua prontinho te esperando aqui na [nome da loja]. 😊 Lembrando que após [X dias] da conclusão não conseguimos mais garantir a guarda do aparelho, conforme os termos da OS. Qualquer coisa, me avisa por aqui!',
      },
      { type: 'heading', text: 'Pós-venda (3 a 7 dias depois da entrega)' },
      {
        type: 'template',
        title: 'Pós-venda',
        text: 'Oi, [nome]! Tudo certo com o seu [aparelho] depois do reparo? Qualquer coisa dentro da garantia de [prazo], é só chamar por aqui. E se puder nos indicar para algum amigo, ajuda demais! 🙏',
      },
      { type: 'heading', text: 'Boas práticas para não virar spam' },
      {
        type: 'list',
        items: [
          'Sempre identifique a loja e o número da OS — o cliente pode ter aparelho em mais de um lugar.',
          'Uma mensagem por evento é suficiente. Follow-up de orçamento: no máximo dois.',
          'Personalize o nome sempre. Mensagem claramente robótica sem nome esfria a relação.',
          'Responda rápido quando o cliente responder — mensagem automática boa abre conversa, não encerra.',
        ],
      },
      { type: 'heading', text: 'E se essas mensagens saíssem sozinhas?' },
      {
        type: 'paragraph',
        text: 'Todos esses templates resolvem — mas alguém ainda precisa lembrar de enviar, um por um, todos os dias. No SmartConserto, essas mensagens saem automaticamente a cada mudança de status da OS: entrada registrada, orçamento enviado com botão de aprovação, aparelho pronto, lembrete de retirada. Sua equipe cuida do reparo; o sistema cuida do aviso. Teste grátis por 30 dias, sem cartão de crédito.',
      },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}
