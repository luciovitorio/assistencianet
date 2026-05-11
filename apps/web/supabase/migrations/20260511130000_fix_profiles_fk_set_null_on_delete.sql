-- Corrige FKs de colunas de auditoria (created_by / deleted_by) que referenciam
-- profiles com NO ACTION. Quando o usuário auth é deletado, o CASCADE derruba o
-- profile, e o NO ACTION bloqueava a operação. Alterado para SET NULL pois são
-- colunas de rastreio, não integridade de negócio.

ALTER TABLE branches
  DROP CONSTRAINT branches_deleted_by_fkey,
  ADD CONSTRAINT branches_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE employees
  DROP CONSTRAINT employees_deleted_by_fkey,
  ADD CONSTRAINT employees_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE clients
  DROP CONSTRAINT clients_deleted_by_fkey,
  ADD CONSTRAINT clients_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE suppliers
  DROP CONSTRAINT suppliers_deleted_by_fkey,
  ADD CONSTRAINT suppliers_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE third_parties
  DROP CONSTRAINT third_parties_deleted_by_fkey,
  ADD CONSTRAINT third_parties_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE service_orders
  DROP CONSTRAINT service_orders_created_by_fkey,
  ADD CONSTRAINT service_orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE service_orders
  DROP CONSTRAINT service_orders_deleted_by_fkey,
  ADD CONSTRAINT service_orders_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE service_order_estimates
  DROP CONSTRAINT service_order_estimates_created_by_fkey,
  ADD CONSTRAINT service_order_estimates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE service_order_estimates
  DROP CONSTRAINT service_order_estimates_deleted_by_fkey,
  ADD CONSTRAINT service_order_estimates_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE stock_movements
  DROP CONSTRAINT stock_movements_created_by_fkey,
  ADD CONSTRAINT stock_movements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
