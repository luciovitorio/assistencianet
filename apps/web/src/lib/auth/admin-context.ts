import type { CompanyContext } from './company-context'
import { getCompanyContext } from './company-context'

type PermissionArea =
  | 'filiais'
  | 'funcionarios'
  | 'clientes'
  | 'equipamentos'
  | 'fornecedores'
  | 'terceiros'
  | 'pecas'
  | 'servicos'
  | 'logs'
  | 'ordens-de-servico'
  | 'configuracoes'
  | 'estoque'
  | 'financeiro'

export type AdminContext = CompanyContext

const AREA_ERROR_MESSAGES: Record<PermissionArea, string> = {
  filiais: 'Você não tem permissão para gerenciar filiais.',
  funcionarios: 'Você não tem permissão para gerenciar funcionários.',
  clientes: 'Você não tem permissão para gerenciar clientes.',
  equipamentos: 'Você não tem permissão para gerenciar equipamentos.',
  fornecedores: 'Você não tem permissão para gerenciar fornecedores.',
  terceiros: 'Você não tem permissão para gerenciar terceirizadas.',
  pecas: 'Você não tem permissão para gerenciar peças.',
  servicos: 'Você não tem permissão para gerenciar serviços.',
  logs: 'Você não tem permissão para acessar os logs do sistema.',
  'ordens-de-servico': 'Você não tem permissão para gerenciar ordens de serviço.',
  configuracoes: 'Você não tem permissão para gerenciar as configurações da empresa.',
  estoque: 'Você não tem permissão para gerenciar o estoque.',
  financeiro: 'Você não tem permissão para acessar o financeiro.',
}

export const getAdminContext = async (area: PermissionArea): Promise<AdminContext> => {
  const context = await getCompanyContext()

  if ((!context.isOwner && !context.isAdmin) || !context.companyId) {
    throw new Error(AREA_ERROR_MESSAGES[area])
  }

  return context
}
