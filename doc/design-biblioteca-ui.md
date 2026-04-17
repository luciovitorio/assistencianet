# Design — Biblioteca de Componentes UI (AssistênciaNet)

**Data:** 2026-04-01  
**Status:** Validado — pronto para implementação

---

## Entendimento

### O que está sendo construído
Uma biblioteca de componentes UI como ponto de partida de um SaaS de gestão para assistências técnicas.

### Por que existe
- Garantir consistência visual antes de construir os módulos do sistema
- Facilitar escala futura — o produto será vendido para múltiplas assistências técnicas

### Para quem é
- **Imediato:** ORQUÍDIA ASSISTÊNCIA TÉCNICA (3 filiais, 5 funcionários, 301–500 OS/mês)
- **Futuro:** qualquer assistência técnica que contratar o SaaS

### Stack
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **UI:** shadcn/ui
- **Banco:** Supabase
- **Estrutura:** Monorepo Turborepo
- **Design de telas:** Stitch

### Não-objetivos (agora)
- Implementar lógica de negócio
- Configurar Supabase
- Criar páginas ou rotas

### Assumptions
- Dark mode: não previsto — light mode apenas por ora
- Responsividade básica necessária (uso predominante em desktop)
- PT-BR apenas
- Nome e cores são temporários, fáceis de trocar via CSS tokens

---

## Estrutura do Monorepo

```
assistencia-saas/
├── apps/
│   ├── web/          ← app principal (Next.js)
│   └── landing/      ← site de vendas (futuro)
└── packages/
    └── ui/           ← biblioteca de componentes compartilhada
        ├── src/
        │   ├── styles/
        │   │   └── tokens.css
        │   ├── base/
        │   ├── domain/
        │   └── layouts/
        └── package.json
```

---

## Seção 1 — Design Tokens (`packages/ui/src/styles/tokens.css`)

```css
:root {
  /* Cor primária temporária — azul-slate */
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;

  /* Superfícies */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;

  /* Status de OS */
  --status-new: 221 83% 53%;        /* azul — cadastro */
  --status-budget: 38 92% 50%;      /* amarelo — orçamento */
  --status-approved: 262 83% 58%;   /* roxo — aprovado */
  --status-execution: 24 95% 53%;   /* laranja — execução */
  --status-done: 142 71% 45%;       /* verde — pronto */
  --status-delivered: 215 16% 47%;  /* cinza — entregue */

  /* Tipografia */
  --font-sans: 'Inter', sans-serif;
  --radius: 0.5rem;
}
```

---

## Seção 2 — Componentes Base (`packages/ui/src/base/`)

### Componentes shadcn a instalar
```
button, input, label, select, textarea,
table, badge, card, dialog, drawer,
dropdown-menu, popover, tooltip,
tabs, separator, skeleton, avatar,
form, calendar, date-picker,
sidebar, breadcrumb, pagination,
sonner, alert, progress
```

### Customizações
- **Badge** — variantes de status de OS via tokens
- **Button** — prop `loading` para estados de submit
- **DataTable** — wrapper de Table com `emptyMessage` padrão

### Fora do escopo agora
- Charts (Recharts — entra no módulo de Relatórios)
- Rich text editor
- Upload de arquivos

---

## Seção 3 — Componentes de Domínio (`packages/ui/src/domain/`)

### `OSCard`
Card de Ordem de Serviço para listagens, dashboard e busca.
```tsx
<OSCard
  number="OS-2024"
  client="João Silva"
  equipment="Chapinha XYZ"
  status="execution"
  branch="Filial Centro"
  technician="Carlos"
  entryDate="2026-03-20"
/>
```

### `OSStatusBadge`
Badge com cores mapeadas nos tokens. Fluxo:
`Cadastro → Orçamento → Aprovado → Execução → Pronto → Entregue`
```tsx
<OSStatusBadge status="execution" />
```

### `OSTimeline`
Histórico visual de mudanças de status de uma OS.
```tsx
<OSTimeline events={os.statusHistory} />
```

### `BranchSelector`
Troca de filial ativa — aparece na TopBar.
```tsx
<BranchSelector branches={branches} current={activeBranch} />
```

### `KPICard`
Cards do dashboard: OS abertas, faturamento, despesas, entregas.
```tsx
<KPICard label="OS Abertas" value={47} trend="+12%" />
```

### `ClientHistoryPanel`
Histórico completo de OS de um cliente em uma única tela.
```tsx
<ClientHistoryPanel clientId={id} />
```

> Novos componentes de domínio são adicionados conforme os módulos forem construídos.

---

## Seção 4 — Layouts (`packages/ui/src/layouts/`)

### `AppShell`
Wrapper principal — compõe Sidebar + conteúdo.
```tsx
<AppShell sidebar={<AppSidebar />}>
  <PageShell title="Ordens de Serviço">
    {children}
  </PageShell>
</AppShell>
```

### `AppSidebar`
Navegação lateral com agrupamento semântico:
```
Dashboard
Ordens de Serviço
Orçamentos
─────────────────
Cadastro
  ├── Clientes
  ├── Peças
  ├── Funcionários
  └── Fornecedores
─────────────────
Estoque
Financeiro
Relatórios
Configurações
```

### `PageShell`
Cabeçalho de página com título, breadcrumb e slot para ações.
```tsx
<PageShell
  title="Ordens de Serviço"
  breadcrumb={["Dashboard", "OS"]}
  actions={<Button>Nova OS</Button>}
/>
```

### `TopBar`
Barra superior com: `BranchSelector` | data e hora atual | notificações | avatar do usuário.

### `AuthShell`
Layout separado para login/registro — sem sidebar.

---

## Decision Log

| # | Decisão | Alternativas | Motivo |
|---|---------|-------------|--------|
| 1 | Next.js App Router | Pages Router | Padrão atual, melhor suporte a Server Components e Supabase Auth |
| 2 | TypeScript | JavaScript | SaaS com múltiplos módulos — tipos evitam bugs em produção |
| 3 | Monorepo Turborepo | App único | Produto será vendido para múltiplos clientes, precisa de `packages/ui` compartilhado |
| 4 | Dois níveis: base + domínio | Flat, Feature-based | Separação clara sem complexidade prematura |
| 5 | CSS custom properties para tema | Tailwind config | shadcn nativo, troca de cores em um único arquivo |
| 6 | Status de OS nos design tokens | Inline ou por módulo | Aparecem em badges, cards, timelines e relatórios — precisam ser consistentes |
| 7 | Stitch para design de telas | Figma, direto no código | Permite validar layouts antes de implementar |
| 8 | Nome/cores temporários (AssistênciaNet + slate-blue) | Aguardar identidade final | Não bloqueia desenvolvimento, fácil de trocar depois |
