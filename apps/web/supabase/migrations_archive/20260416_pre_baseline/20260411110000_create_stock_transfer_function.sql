-- ============================================================
-- Função atômica para transferência de estoque entre filiais.
-- Ambas as movimentações (saída e entrada) são inseridas em uma
-- única transação, garantindo consistência de saldo em caso de
-- falha parcial.
-- ============================================================

CREATE OR REPLACE FUNCTION create_stock_transfer(
  p_company_id     UUID,
  p_from_branch_id UUID,
  p_to_branch_id   UUID,
  p_part_id        UUID,
  p_quantity       INTEGER,
  p_notes          TEXT,
  p_entry_date     DATE,
  p_created_by     UUID
)
RETURNS TABLE(saida_id UUID, entrada_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id     UUID := gen_random_uuid();
  v_saida_id   UUID;
  v_entrada_id UUID;
BEGIN
  INSERT INTO stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_from_branch_id, p_part_id,
    'transferencia_saida', -p_quantity,
    p_notes, 'transferencia', v_ref_id,
    p_entry_date, p_created_by
  ) RETURNING id INTO v_saida_id;

  INSERT INTO stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_to_branch_id, p_part_id,
    'transferencia_entrada', p_quantity,
    p_notes, 'transferencia', v_ref_id,
    p_entry_date, p_created_by
  ) RETURNING id INTO v_entrada_id;

  RETURN QUERY SELECT v_saida_id, v_entrada_id;
END;
$$;

-- Apenas usuários autenticados podem invocar esta função.
-- A validação de autorização (company_id, branches, estoque)
-- é feita na Server Action antes de chamar o RPC.
REVOKE ALL ON FUNCTION create_stock_transfer(UUID, UUID, UUID, UUID, INTEGER, TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_stock_transfer(UUID, UUID, UUID, UUID, INTEGER, TEXT, DATE, UUID) TO authenticated;
