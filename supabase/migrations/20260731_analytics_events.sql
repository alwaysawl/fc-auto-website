-- =============================================================================
-- First-party analytics events (anonymous, privacy-safe).
-- Safe to re-run: IF NOT EXISTS / no DROP / no DELETE of existing data.
--
-- Privacy:
-- - No customer phone, email, VIN, full IP, message contents, or secrets
-- - No invasive fingerprinting
-- - Public browsers insert only via Next.js server API (service role)
-- =============================================================================

create table if not exists public.analytics_events (
  id                    uuid primary key default gen_random_uuid(),
  event_name            text not null,
  event_time            timestamptz not null default now(),
  session_id            text,
  anonymous_visitor_id  text,
  locale                text,
  page_path             text,
  referrer_host         text,
  vehicle_id            text,
  country_id            text,
  port_id               text,
  cart_item_count       integer,
  cart_value_usd        numeric,
  metadata              jsonb not null default '{}'::jsonb,
  user_agent_category   text,
  created_at            timestamptz not null default now(),
  constraint analytics_events_name_allowed check (
    event_name in (
      'page_view',
      'whatsapp_click',
      'cart_view',
      'cart_add',
      'cart_remove',
      'cart_checkout_click',
      'quote_download',
      'vehicle_detail_view',
      'cart_clear',
      'language_change'
    )
  ),
  constraint analytics_events_cart_count_nonneg check (
    cart_item_count is null or cart_item_count >= 0
  ),
  constraint analytics_events_cart_value_nonneg check (
    cart_value_usd is null or cart_value_usd >= 0
  )
);

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, event_time desc);

create index if not exists analytics_events_time_idx
  on public.analytics_events (event_time desc);

create index if not exists analytics_events_visitor_time_idx
  on public.analytics_events (anonymous_visitor_id, event_time desc);

create index if not exists analytics_events_session_time_idx
  on public.analytics_events (session_id, event_time desc);

create index if not exists analytics_events_vehicle_name_time_idx
  on public.analytics_events (vehicle_id, event_name, event_time desc);

alter table public.analytics_events enable row level security;

-- No policies for anon/authenticated: public clients cannot select/insert/update/delete.
-- Inserts go through Next.js /api/analytics/events using the service-role / secret key.

comment on table public.analytics_events is
  'First-party anonymous analytics. No phones, emails, VINs, full IPs, or secrets.';
