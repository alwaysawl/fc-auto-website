-- =============================================================================
-- Add optional maximum budget for custom car sourcing inquiries.
-- Additive only: no DROP of data; safe to re-run (IF NOT EXISTS).
-- =============================================================================

alter table public.inquiries
  add column if not exists customer_budget_max_usd numeric;

alter table public.inquiries
  drop constraint if exists inquiries_budget_max_nonneg;

alter table public.inquiries
  add constraint inquiries_budget_max_nonneg check (
    customer_budget_max_usd is null or customer_budget_max_usd >= 0
  );

comment on column public.inquiries.customer_budget_usd is
  'Customer minimum / primary budget in USD (custom sourcing + CRM).';

comment on column public.inquiries.customer_budget_max_usd is
  'Optional customer maximum budget in USD (custom car sourcing).';
