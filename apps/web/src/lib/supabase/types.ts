import type { Tables } from './database.types'

// Row types derivados do schema real do banco
export type Profile = Tables<'profiles'>
export type Company = Tables<'companies'>
export type Branch = Tables<'branches'>
export type Client = Tables<'clients'>
export type Supplier = Tables<'suppliers'>
export type ThirdParty = Tables<'third_parties'>
export type Part = Tables<'parts'>
export type BusinessHour = Tables<'business_hours'>
export type AuditLog = Tables<'audit_logs'>
export type ServiceOrder = Tables<'service_orders'>
export type ServiceOrderEstimate = Tables<'service_order_estimates'>
export type ServiceOrderEstimateItem = Tables<'service_order_estimate_items'>

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
