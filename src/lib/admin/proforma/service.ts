import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_COMPANY_SNAPSHOT,
  DEFAULT_PAYMENT_ACCOUNT,
  DEFAULT_TERMS,
} from "@/lib/admin/proforma/constants";
import {
  isProformaStatus,
  type CompanySnapshot,
  type PaymentAccountSnapshot,
  type ProformaActivity,
  type ProformaActivityType,
  type ProformaCharge,
  type ProformaDetail,
  type ProformaItem,
  type ProformaListItem,
  type ProformaListResult,
  type ProformaSettings,
  type ProformaSort,
  type ProformaStatus,
  type TermSnapshot,
} from "@/lib/admin/proforma/types";
import {
  validateProformaWrite,
  type ProformaWriteInput,
  type ValidatedProformaWrite,
} from "@/lib/admin/proforma/validate";

const PAGE_SIZE_DEFAULT = 20;

type DbInvoiceRow = {
  id: string;
  invoice_number: string;
  contract_number: string | null;
  status: string;
  customer_name: string;
  customer_company: string | null;
  customer_country: string | null;
  customer_address: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  offer_date: string;
  validity_text: string | null;
  destination_country: string | null;
  destination_port: string | null;
  salesperson_name: string;
  salesperson_phone: string;
  salesperson_email: string;
  company_snapshot: CompanySnapshot | Record<string, unknown> | null;
  payment_snapshot: PaymentAccountSnapshot | Record<string, unknown> | null;
  vehicle_subtotal_usd: number | string;
  charges_total_usd: number | string;
  total_usd: number | string;
  deposit_usd: number | string;
  balance_usd: number | string;
  terms_snapshot: TermSnapshot[] | null;
  notes: string | null;
  internal_notes: string | null;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
  issued_at: string | null;
  archived_at: string | null;
};

type DbItemRow = {
  id: string;
  invoice_id: string;
  display_order: number;
  vehicle_id: string | null;
  brand: string;
  model: string;
  year: string | null;
  colour: string | null;
  vin: string | null;
  unit_price_usd: number | string;
  quantity: number;
  total_usd: number | string;
  note: string | null;
};

type DbChargeRow = {
  id: string;
  invoice_id: string;
  display_order: number;
  name_zh: string;
  name_en: string;
  amount_usd: number | string;
  note: string | null;
};

function logSafe(scope: string, err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);
  console.error(`[proforma.${scope}]`, message.slice(0, 200));
}

function isMissingTable(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : "";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.toLowerCase().includes("does not exist") ||
    msg.toLowerCase().includes("schema cache") ||
    msg.toLowerCase().includes("could not find the table")
  );
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asCompany(raw: unknown): CompanySnapshot {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COMPANY_SNAPSHOT };
  const o = raw as Record<string, unknown>;
  return {
    companyName:
      typeof o.companyName === "string"
        ? o.companyName
        : DEFAULT_COMPANY_SNAPSHOT.companyName,
    companyAddress:
      typeof o.companyAddress === "string"
        ? o.companyAddress
        : DEFAULT_COMPANY_SNAPSHOT.companyAddress,
    companyWebsite:
      typeof o.companyWebsite === "string"
        ? o.companyWebsite
        : DEFAULT_COMPANY_SNAPSHOT.companyWebsite,
  };
}

function asPayment(raw: unknown): PaymentAccountSnapshot {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PAYMENT_ACCOUNT };
  const o = raw as Record<string, unknown>;
  return {
    id: typeof o.id === "string" ? o.id : undefined,
    label: typeof o.label === "string" ? o.label : undefined,
    fullName: typeof o.fullName === "string" ? o.fullName : "",
    bankName: typeof o.bankName === "string" ? o.bankName : "",
    accountNumber: typeof o.accountNumber === "string" ? o.accountNumber : "",
    swift: typeof o.swift === "string" ? o.swift : "",
    bankAddress: typeof o.bankAddress === "string" ? o.bankAddress : "",
    paymentNote:
      typeof o.paymentNote === "string"
        ? o.paymentNote
        : DEFAULT_PAYMENT_ACCOUNT.paymentNote,
  };
}

function asTerms(raw: unknown): TermSnapshot[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_TERMS.map((t) => ({ ...t }));
  }
  return raw
    .filter((t): t is TermSnapshot => Boolean(t && typeof t === "object"))
    .map((t) => ({
      id: String(t.id ?? ""),
      enabled: t.enabled !== false,
      textZh: String(t.textZh ?? ""),
      textEn: String(t.textEn ?? ""),
    }));
}

function mapItem(row: DbItemRow): ProformaItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    displayOrder: row.display_order,
    vehicleId: row.vehicle_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    colour: row.colour,
    vin: row.vin,
    unitPriceUsd: num(row.unit_price_usd),
    quantity: row.quantity,
    totalUsd: num(row.total_usd),
    note: row.note,
  };
}

function mapCharge(row: DbChargeRow): ProformaCharge {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    displayOrder: row.display_order,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    amountUsd: num(row.amount_usd),
    note: row.note,
  };
}

function mapListItem(
  row: DbInvoiceRow,
  vehicleCount: number
): ProformaListItem {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    contractNumber: row.contract_number,
    customerName: row.customer_name,
    customerCountry: row.customer_country,
    destinationCountry: row.destination_country,
    destinationPort: row.destination_port,
    vehicleCount,
    totalUsd: num(row.total_usd),
    salespersonName: row.salesperson_name,
    status: (isProformaStatus(row.status) ? row.status : "draft") as ProformaStatus,
    offerDate: row.offer_date,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapDetail(
  row: DbInvoiceRow,
  items: DbItemRow[],
  charges: DbChargeRow[]
): ProformaDetail {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    contractNumber: row.contract_number,
    status: (isProformaStatus(row.status) ? row.status : "draft") as ProformaStatus,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    customerCountry: row.customer_country,
    customerAddress: row.customer_address,
    customerWhatsapp: row.customer_whatsapp,
    customerEmail: row.customer_email,
    offerDate: row.offer_date,
    validityText: row.validity_text,
    destinationCountry: row.destination_country,
    destinationPort: row.destination_port,
    salespersonName: row.salesperson_name,
    salespersonPhone: row.salesperson_phone,
    salespersonEmail: row.salesperson_email,
    companySnapshot: asCompany(row.company_snapshot),
    paymentSnapshot: asPayment(row.payment_snapshot),
    vehicleSubtotalUsd: num(row.vehicle_subtotal_usd),
    chargesTotalUsd: num(row.charges_total_usd),
    totalUsd: num(row.total_usd),
    depositUsd: num(row.deposit_usd),
    balanceUsd: num(row.balance_usd),
    termsSnapshot: asTerms(row.terms_snapshot),
    notes: row.notes,
    internalNotes: row.internal_notes,
    pdfStoragePath: row.pdf_storage_path,
    pdfGeneratedAt: row.pdf_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issuedAt: row.issued_at,
    archivedAt: row.archived_at,
    items: items
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map(mapItem),
    charges: charges
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map(mapCharge),
  };
}

async function allocateInvoiceNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("next_proforma_invoice_number");
  if (error || typeof data !== "string" || !data) {
    throw error ?? new Error("invoice number allocation failed");
  }
  return data;
}

async function recordActivity(
  invoiceId: string,
  activityType: ProformaActivityType,
  opts?: {
    note?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    actorName?: string | null;
  }
) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("proforma_invoice_activities").insert({
      invoice_id: invoiceId,
      activity_type: activityType,
      note: opts?.note ?? null,
      old_value: opts?.oldValue ?? null,
      new_value: opts?.newValue ?? null,
      actor_name: opts?.actorName ?? "admin",
    });
  } catch (err) {
    logSafe("recordActivity", err);
  }
}

async function replaceItemsAndCharges(
  invoiceId: string,
  data: ValidatedProformaWrite
) {
  const supabase = getSupabaseAdmin();
  const { error: delItemsErr } = await supabase
    .from("proforma_invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delItemsErr) throw delItemsErr;

  const { error: delChargesErr } = await supabase
    .from("proforma_invoice_charges")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delChargesErr) throw delChargesErr;

  if (data.items.length) {
    const { error } = await supabase.from("proforma_invoice_items").insert(
      data.items.map((item, index) => ({
        invoice_id: invoiceId,
        display_order: index,
        vehicle_id: item.vehicle_id,
        brand: item.brand,
        model: item.model,
        year: item.year,
        colour: item.colour,
        vin: item.vin,
        unit_price_usd: item.unit_price_usd,
        quantity: item.quantity,
        total_usd: item.total_usd,
        note: item.note,
      }))
    );
    if (error) throw error;
  }

  if (data.charges.length) {
    const { error } = await supabase.from("proforma_invoice_charges").insert(
      data.charges.map((charge, index) => ({
        invoice_id: invoiceId,
        display_order: index,
        name_zh: charge.name_zh,
        name_en: charge.name_en,
        amount_usd: charge.amount_usd,
        note: charge.note,
      }))
    );
    if (error) throw error;
  }
}

function invoiceHeaderPayload(
  data: ValidatedProformaWrite,
  extras?: Record<string, unknown>
) {
  return {
    contract_number: data.contract_number,
    status: data.status,
    customer_name: data.customer_name,
    customer_company: data.customer_company,
    customer_country: data.customer_country,
    customer_address: data.customer_address,
    customer_whatsapp: data.customer_whatsapp,
    customer_email: data.customer_email,
    offer_date: data.offer_date,
    validity_text: data.validity_text,
    destination_country: data.destination_country,
    destination_port: data.destination_port,
    salesperson_name: data.salesperson_name,
    salesperson_phone: data.salesperson_phone,
    salesperson_email: data.salesperson_email,
    company_snapshot: data.company_snapshot,
    payment_snapshot: data.payment_snapshot,
    vehicle_subtotal_usd: data.vehicle_subtotal_usd,
    charges_total_usd: data.charges_total_usd,
    total_usd: data.total_usd,
    deposit_usd: data.deposit_usd,
    balance_usd: data.balance_usd,
    terms_snapshot: data.terms_snapshot,
    notes: data.notes,
    internal_notes: data.internal_notes,
    ...extras,
  };
}

export async function getProformaSettings(): Promise<ProformaSettings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("proforma_invoice_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return {
          ...DEFAULT_COMPANY_SNAPSHOT,
          paymentAccounts: [{ ...DEFAULT_PAYMENT_ACCOUNT }],
          defaultTerms: DEFAULT_TERMS.map((t) => ({ ...t })),
          updatedAt: null,
        };
      }
      throw error;
    }

    if (!data) {
      return {
        ...DEFAULT_COMPANY_SNAPSHOT,
        paymentAccounts: [{ ...DEFAULT_PAYMENT_ACCOUNT }],
        defaultTerms: DEFAULT_TERMS.map((t) => ({ ...t })),
        updatedAt: null,
      };
    }

    const accounts = Array.isArray(data.payment_accounts)
      ? (data.payment_accounts as PaymentAccountSnapshot[])
      : [{ ...DEFAULT_PAYMENT_ACCOUNT }];

    return {
      companyName: data.company_name || DEFAULT_COMPANY_SNAPSHOT.companyName,
      companyAddress:
        data.company_address || DEFAULT_COMPANY_SNAPSHOT.companyAddress,
      companyWebsite:
        data.company_website || DEFAULT_COMPANY_SNAPSHOT.companyWebsite,
      paymentAccounts: accounts.length
        ? accounts.map(asPayment)
        : [{ ...DEFAULT_PAYMENT_ACCOUNT }],
      defaultTerms: asTerms(data.default_terms),
      updatedAt: data.updated_at ?? null,
    };
  } catch (err) {
    logSafe("getProformaSettings", err);
    return {
      ...DEFAULT_COMPANY_SNAPSHOT,
      paymentAccounts: [{ ...DEFAULT_PAYMENT_ACCOUNT }],
      defaultTerms: DEFAULT_TERMS.map((t) => ({ ...t })),
      updatedAt: null,
    };
  }
}

export async function updateProformaSettings(input: {
  companyName?: string;
  companyAddress?: string;
  companyWebsite?: string;
  paymentAccounts?: PaymentAccountSnapshot[];
  defaultTerms?: TermSnapshot[];
}): Promise<{ ok: true; settings: ProformaSettings } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const current = await getProformaSettings();
    const payload = {
      id: "default",
      company_name: (input.companyName ?? current.companyName).slice(0, 200),
      company_address: (input.companyAddress ?? current.companyAddress).slice(
        0,
        500
      ),
      company_website: (input.companyWebsite ?? current.companyWebsite).slice(
        0,
        120
      ),
      payment_accounts: (input.paymentAccounts ?? current.paymentAccounts).slice(
        0,
        10
      ),
      default_terms: (input.defaultTerms ?? current.defaultTerms).slice(0, 20),
    };

    const { error } = await supabase
      .from("proforma_invoice_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      if (isMissingTable(error)) {
        return {
          ok: false,
          error: "形式发票数据表尚未创建，请先在 Supabase 执行迁移 SQL",
        };
      }
      throw error;
    }

    const settings = await getProformaSettings();
    return { ok: true, settings };
  } catch (err) {
    logSafe("updateProformaSettings", err);
    return { ok: false, error: "设置保存失败，请稍后重试" };
  }
}

export async function listProformaInvoices(opts: {
  q?: string | null;
  status?: string | null;
  salesperson?: string | null;
  destinationCountry?: string | null;
  destinationPort?: string | null;
  offerFrom?: string | null;
  offerTo?: string | null;
  archived?: boolean;
  sort?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<ProformaListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? PAGE_SIZE_DEFAULT));
  const empty: ProformaListResult = {
    items: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("proforma_invoices")
      .select(
        "id, invoice_number, contract_number, status, customer_name, customer_country, destination_country, destination_port, total_usd, salesperson_name, offer_date, updated_at, archived_at",
        { count: "exact" }
      );

    if (opts.archived) {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
    }

    if (opts.status && isProformaStatus(opts.status)) {
      query = query.eq("status", opts.status);
    }
    if (opts.salesperson) {
      query = query.eq("salesperson_name", opts.salesperson);
    }
    if (opts.destinationCountry) {
      query = query.ilike("destination_country", `%${opts.destinationCountry}%`);
    }
    if (opts.destinationPort) {
      query = query.ilike("destination_port", `%${opts.destinationPort}%`);
    }
    if (opts.offerFrom) {
      query = query.gte("offer_date", opts.offerFrom);
    }
    if (opts.offerTo) {
      query = query.lte("offer_date", opts.offerTo);
    }

    const q = (opts.q ?? "").trim();
    let matchedInvoiceIds: string[] | null = null;
    if (q) {
      const like = `%${q}%`;
      const { data: itemMatches } = await supabase
        .from("proforma_invoice_items")
        .select("invoice_id")
        .or(`brand.ilike.${like},model.ilike.${like},vin.ilike.${like}`);
      matchedInvoiceIds = Array.from(
        new Set(
          (itemMatches ?? []).map((r) =>
            String((r as { invoice_id: string }).invoice_id)
          )
        )
      );

      if (matchedInvoiceIds.length) {
        query = query.or(
          [
            `invoice_number.ilike.${like}`,
            `contract_number.ilike.${like}`,
            `customer_name.ilike.${like}`,
            `salesperson_name.ilike.${like}`,
            `id.in.(${matchedInvoiceIds.join(",")})`,
          ].join(",")
        );
      } else {
        query = query.or(
          [
            `invoice_number.ilike.${like}`,
            `contract_number.ilike.${like}`,
            `customer_name.ilike.${like}`,
            `salesperson_name.ilike.${like}`,
          ].join(",")
        );
      }
    }

    const sort = (opts.sort ?? "newest") as ProformaSort;
    if (sort === "oldest") {
      query = query.order("offer_date", { ascending: true });
    } else if (sort === "highest_total") {
      query = query.order("total_usd", { ascending: false });
    } else if (sort === "latest_updated") {
      query = query.order("updated_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      if (isMissingTable(error)) {
        return {
          ...empty,
          error: "形式发票数据表尚未创建，请先在 Supabase 执行迁移 SQL",
        };
      }
      throw error;
    }

    const rows = (data ?? []) as DbInvoiceRow[];
    const ids = rows.map((r) => r.id);
    const countMap = new Map<string, number>();

    if (ids.length) {
      const { data: itemRows } = await supabase
        .from("proforma_invoice_items")
        .select("invoice_id")
        .in("invoice_id", ids);
      for (const item of itemRows ?? []) {
        const id = String((item as { invoice_id: string }).invoice_id);
        countMap.set(id, (countMap.get(id) ?? 0) + 1);
      }
    }

    return {
      items: rows.map((r) => mapListItem(r, countMap.get(r.id) ?? 0)),
      total: count ?? rows.length,
      page,
      pageSize,
      error: null,
    };
  } catch (err) {
    logSafe("listProformaInvoices", err);
    return { ...empty, error: "形式发票列表加载失败，请稍后重试" };
  }
}

export async function getProformaInvoice(
  id: string
): Promise<
  | { ok: true; invoice: ProformaDetail; activities: ProformaActivity[] }
  | { ok: false; error: string }
> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("proforma_invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return {
          ok: false,
          error: "形式发票数据表尚未创建，请先在 Supabase 执行迁移 SQL",
        };
      }
      throw error;
    }
    if (!data) return { ok: false, error: "发票不存在" };

    const [{ data: items }, { data: charges }, { data: activities }] =
      await Promise.all([
        supabase
          .from("proforma_invoice_items")
          .select("*")
          .eq("invoice_id", id)
          .order("display_order", { ascending: true }),
        supabase
          .from("proforma_invoice_charges")
          .select("*")
          .eq("invoice_id", id)
          .order("display_order", { ascending: true }),
        supabase
          .from("proforma_invoice_activities")
          .select("*")
          .eq("invoice_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    return {
      ok: true,
      invoice: mapDetail(
        data as DbInvoiceRow,
        (items ?? []) as DbItemRow[],
        (charges ?? []) as DbChargeRow[]
      ),
      activities: ((activities ?? []) as Array<{
        id: string;
        invoice_id: string;
        activity_type: string;
        note: string | null;
        old_value: string | null;
        new_value: string | null;
        actor_name: string | null;
        created_at: string;
      }>).map((a) => ({
        id: a.id,
        invoiceId: a.invoice_id,
        activityType: a.activity_type as ProformaActivityType,
        note: a.note,
        oldValue: a.old_value,
        newValue: a.new_value,
        actorName: a.actor_name,
        createdAt: a.created_at,
      })),
    };
  } catch (err) {
    logSafe("getProformaInvoice", err);
    return { ok: false, error: "发票加载失败，请稍后重试" };
  }
}

export async function createProformaInvoice(
  input: ProformaWriteInput
): Promise<
  | {
      ok: true;
      id: string;
      invoiceNumber: string;
      depositExceedsTotal: boolean;
    }
  | { ok: false; error: string; depositExceedsTotal?: boolean }
> {
  const validated = validateProformaWrite(input);
  if (!validated.ok) return validated;
  const data = validated.data;

  try {
    const settings = await getProformaSettings();
    if (
      !input.companySnapshot &&
      data.company_snapshot.companyName === DEFAULT_COMPANY_SNAPSHOT.companyName
    ) {
      data.company_snapshot = {
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyWebsite: settings.companyWebsite,
      };
    }
    if (
      !input.paymentSnapshot &&
      !data.payment_snapshot.accountNumber &&
      settings.paymentAccounts[0]
    ) {
      data.payment_snapshot = { ...settings.paymentAccounts[0] };
    }
    if (!input.termsSnapshot) {
      data.terms_snapshot = settings.defaultTerms.map((t) => ({ ...t }));
    }

    const invoiceNumber = await allocateInvoiceNumber();
    const contractNumber = data.contract_number || invoiceNumber;

    const extras: Record<string, unknown> = {
      invoice_number: invoiceNumber,
      contract_number: contractNumber,
    };
    if (data.markIssued || data.status === "issued") {
      extras.status = "issued";
      extras.issued_at = new Date().toISOString();
    }

    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("proforma_invoices")
      .insert(invoiceHeaderPayload(data, extras))
      .select("id, invoice_number")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return {
          ok: false,
          error: "形式发票数据表尚未创建，请先在 Supabase 执行迁移 SQL",
        };
      }
      throw error;
    }

    await replaceItemsAndCharges(inserted.id, data);
    await recordActivity(inserted.id, "created", {
      note: `创建形式发票 ${inserted.invoice_number}`,
    });
    if (extras.status === "issued") {
      await recordActivity(inserted.id, "status_changed", {
        oldValue: "draft",
        newValue: "issued",
      });
    }

    return {
      ok: true,
      id: inserted.id,
      invoiceNumber: inserted.invoice_number,
      depositExceedsTotal: data.depositExceedsTotal,
    };
  } catch (err) {
    logSafe("createProformaInvoice", err);
    return { ok: false, error: "形式发票保存失败，请稍后重试" };
  }
}

export async function updateProformaInvoice(
  id: string,
  input: ProformaWriteInput
): Promise<
  | {
      ok: true;
      id: string;
      invoiceNumber: string;
      depositExceedsTotal: boolean;
    }
  | { ok: false; error: string; depositExceedsTotal?: boolean }
> {
  const existing = await getProformaInvoice(id);
  if (!existing.ok) return existing;

  const validated = validateProformaWrite(input, {
    existingStatus: existing.invoice.status,
  });
  if (!validated.ok) return validated;
  const data = validated.data;

  // Preserve historical contract number unless explicitly provided
  if (!data.contract_number) {
    data.contract_number = existing.invoice.contractNumber;
  }

  try {
    const extras: Record<string, unknown> = {};
    if (
      data.markIssued &&
      existing.invoice.status === "draft" &&
      data.status === "issued"
    ) {
      extras.issued_at = new Date().toISOString();
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("proforma_invoices")
      .update(invoiceHeaderPayload(data, extras))
      .eq("id", id);

    if (error) throw error;

    await replaceItemsAndCharges(id, data);
    await recordActivity(id, "edited");
    if (data.status !== existing.invoice.status) {
      await recordActivity(id, "status_changed", {
        oldValue: existing.invoice.status,
        newValue: data.status,
      });
    }

    return {
      ok: true,
      id,
      invoiceNumber: existing.invoice.invoiceNumber,
      depositExceedsTotal: data.depositExceedsTotal,
    };
  } catch (err) {
    logSafe("updateProformaInvoice", err);
    return { ok: false, error: "形式发票更新失败，请稍后重试" };
  }
}

export async function updateProformaStatus(
  id: string,
  status: ProformaStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isProformaStatus(status)) {
    return { ok: false, error: "状态无效" };
  }
  try {
    const existing = await getProformaInvoice(id);
    if (!existing.ok) return existing;

    const patch: Record<string, unknown> = { status };
    if (status === "issued" && !existing.invoice.issuedAt) {
      patch.issued_at = new Date().toISOString();
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("proforma_invoices")
      .update(patch)
      .eq("id", id);
    if (error) throw error;

    await recordActivity(id, "status_changed", {
      oldValue: existing.invoice.status,
      newValue: status,
    });
    return { ok: true };
  } catch (err) {
    logSafe("updateProformaStatus", err);
    return { ok: false, error: "状态更新失败，请稍后重试" };
  }
}

export async function archiveProformaInvoice(
  id: string,
  archive = true
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("proforma_invoices")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw error;
    await recordActivity(id, archive ? "archived" : "unarchived");
    return { ok: true };
  } catch (err) {
    logSafe("archiveProformaInvoice", err);
    return { ok: false, error: "归档操作失败，请稍后重试" };
  }
}

export async function duplicateProformaInvoice(
  id: string
): Promise<
  | { ok: true; id: string; invoiceNumber: string }
  | { ok: false; error: string }
> {
  const existing = await getProformaInvoice(id);
  if (!existing.ok) return existing;
  const inv = existing.invoice;

  const result = await createProformaInvoice({
    contractNumber: null,
    status: "draft",
    customerName: inv.customerName,
    customerCompany: inv.customerCompany,
    customerCountry: inv.customerCountry,
    customerAddress: inv.customerAddress,
    customerWhatsapp: inv.customerWhatsapp,
    customerEmail: inv.customerEmail,
    offerDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    validityText: inv.validityText,
    destinationCountry: inv.destinationCountry,
    destinationPort: inv.destinationPort,
    salespersonName: inv.salespersonName,
    salespersonPhone: inv.salespersonPhone,
    salespersonEmail: inv.salespersonEmail,
    overrideContact: true,
    companySnapshot: inv.companySnapshot,
    paymentSnapshot: inv.paymentSnapshot,
    depositUsd: inv.depositUsd,
    termsSnapshot: inv.termsSnapshot,
    notes: inv.notes,
    internalNotes: inv.internalNotes,
    items: inv.items.map((item) => ({
      vehicleId: item.vehicleId,
      brand: item.brand,
      model: item.model,
      year: item.year,
      colour: item.colour,
      vin: item.vin,
      unitPriceUsd: item.unitPriceUsd,
      quantity: item.quantity,
      note: item.note,
    })),
    charges: inv.charges.map((c) => ({
      nameZh: c.nameZh,
      nameEn: c.nameEn,
      amountUsd: c.amountUsd,
      note: c.note,
    })),
  });

  if (!result.ok) return result;

  await recordActivity(result.id, "duplicated", {
    note: `复制自 ${inv.invoiceNumber}`,
  });
  await recordActivity(id, "duplicated", {
    note: `已复制为 ${result.invoiceNumber}`,
  });

  return {
    ok: true,
    id: result.id,
    invoiceNumber: result.invoiceNumber,
  };
}

export async function markProformaPdfGenerated(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("proforma_invoices")
      .update({ pdf_generated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await recordActivity(id, "pdf_generated");
    return { ok: true };
  } catch (err) {
    logSafe("markProformaPdfGenerated", err);
    return { ok: false, error: "PDF 记录更新失败" };
  }
}
