-- Tabela de avaliações de atendimento humano no WhatsApp.
-- Persiste mesmo após exclusão da conversa, para relatórios.
CREATE TABLE IF NOT EXISTS public.whatsapp_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  contact_name text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wapp_ratings_company_created
  ON public.whatsapp_ratings (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapp_ratings_company_branch
  ON public.whatsapp_ratings (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_wapp_ratings_assigned_to
  ON public.whatsapp_ratings (assigned_to);

ALTER TABLE public.whatsapp_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_view_ratings" ON public.whatsapp_ratings
  FOR SELECT USING (public.fn_is_company_member(company_id));

GRANT ALL ON TABLE public.whatsapp_ratings TO anon;
GRANT ALL ON TABLE public.whatsapp_ratings TO authenticated;
GRANT ALL ON TABLE public.whatsapp_ratings TO service_role;
