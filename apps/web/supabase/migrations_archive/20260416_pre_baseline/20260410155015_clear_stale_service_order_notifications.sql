-- Clear stale client notification metadata for service orders that already
-- returned to analysis after a rejected estimate.
update public.service_orders
set
  client_notified_at = null,
  client_notified_via = null
where deleted_at is null
  and status = 'em_analise'
  and client_notified_at is not null
  and client_notified_via is not null;
