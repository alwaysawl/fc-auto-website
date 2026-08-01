-- =============================================================================
-- Allow custom car sourcing analytics events (additive CHECK update only).
-- Safe: drops and recreates name allowlist with two new values; no data deleted.
-- =============================================================================

alter table public.analytics_events
  drop constraint if exists analytics_events_name_allowed;

alter table public.analytics_events
  add constraint analytics_events_name_allowed check (
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
      'language_change',
      'custom_sourcing_page_view',
      'custom_sourcing_submit'
    )
  );
