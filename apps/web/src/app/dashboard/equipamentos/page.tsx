import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { EquipmentList } from './_components/equipment-list'

export default async function EquipamentosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('equipamentos')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: equipments } = await supabase
    .from('equipment_models')
    .select('id, type, manufacturer, model, voltage, notes, active')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('type', { ascending: true })
    .order('manufacturer', { ascending: true })
    .order('model', { ascending: true })

  return <EquipmentList initialEquipments={equipments || []} />
}
