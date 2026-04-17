<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

- Follow `../../AGENTS.md` for product, domain, and monorepo context.
- This file adds web-app-specific rules only.

## Data Tables

- New tables in the web app should reuse the shared components from `src/components/ui/data-table.tsx`.
- Prefer `DataTableToolbar`, `DataTableSearch`, `DataTableFilterPopover`, `DataTableCard`, and `DataTablePagination` instead of creating custom table layouts from scratch.
- When a screen needs table filters, pagination, and top actions, follow the same structure used by the employees module first and only diverge if the feature has a concrete requirement that the shared pattern cannot cover.

## UI Conventions

- Current UI language is PT-BR only.
- Current product direction is light mode first. Do not introduce dark-mode-specific behavior or styling unless the task explicitly requires it.
- Prefer desktop-first layouts with solid responsive behavior for smaller screens. Mobile support is required, but most usage is expected on desktop.
- Reuse the shared UI components in `src/components/ui/` before creating one-off patterns in feature folders.
- When building list, form, or management screens, keep visual structure consistent with the existing dashboard patterns already implemented in `src/app/dashboard/`.
- Favor design-token-friendly styling and existing theme variables over hardcoded colors whenever the current component set already supports the desired visual treatment.
- Sempre que uma mudança depender de migration Supabase, aplicar a migration no projeto remoto via MCP/Management API antes de encerrar a tarefa.
- Evitar manter código de compatibilidade para schema antigo só porque a migration remota não foi aplicada, salvo instrução explícita do usuário.
- Durante a fase de desenvolvimento, usar o Supabase remoto como baseline operacional para reconciliar drift; depois de reconciliado, Git + migrations aplicadas são a fonte de verdade.
- Não editar migrations já aplicadas; corrigir com nova migration ou, quando autorizado em dev, recriar/arquivar migrations para alinhar local e remoto.
