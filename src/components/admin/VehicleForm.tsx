"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { DRIVE_TYPE_ADMIN_OPTIONS } from "@/lib/drive-type";
import VehicleImageUploader, { type UploadedImage } from "./VehicleImageUploader";
import {
  uploadVehicleImageFiles,
  VehicleUploadError,
} from "@/lib/admin/upload-vehicle-images";

interface VehicleFormProps {
  initial?: Partial<Vehicle>;
  mode: "new" | "edit";
}

const STATUS_OPTIONS: VehicleStatus[] = ["在售", "草稿", "已售", "已下架"];
const FUEL_OPTIONS = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "CVT", "Semi-Automatic"];
const STEERING_OPTIONS = ["Left Hand Drive", "Right Hand Drive"];
const BODY_OPTIONS = ["SUV", "Sedan", "Pickup", "Minivan", "Hatchback", "Wagon", "Coupe", "Truck", "Bus"];
const CURRENCY_OPTIONS = ["USD", "CNY", "EUR", "GBP"];
const PORT_OPTIONS = ["Guangzhou", "Shanghai", "Tianjin", "Ningbo", "Qingdao", "Xiamen"];

function slugify(brand: string, model: string, year: string | number): string {
  return `${brand}-${model}-${year}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildAutoTitle(
  year: number | undefined,
  brand: string | undefined,
  model: string | undefined,
  displacement: string | undefined,
  transmission: string | undefined,
  steering: string | undefined
): string {
  const parts: string[] = [];
  if (year) parts.push(String(year));
  if (brand) parts.push(brand.trim());
  if (model) parts.push(model.trim());
  if (displacement) parts.push(displacement.trim());
  if (transmission) parts.push(transmission);
  // Derive drive type label from steering
  if (steering === "Right Hand Drive") parts.push("RHD");
  return parts.join(" ");
}

function isRemoteUrl(url: string | undefined): boolean {
  return !!url && !url.startsWith("blob:");
}

const fieldCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-transparent";

const labelCls = "block text-sm font-medium text-[#1E293B] mb-1";
const sectionCls = "bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6";
const sectionTitleCls = "text-base font-semibold text-[#1E293B] mb-4 pb-3 border-b border-slate-100";

// Build initial UploadedImage array from a Vehicle's stored image fields
function buildInitialImages(v: Partial<Vehicle>): UploadedImage[] {
  const mainUrl = v.mainImageUrl;
  const galleryUrls: string[] = v.galleryImageUrls ?? [];

  if (!mainUrl && galleryUrls.length === 0) {
    // Fall back to legacy photos array
    return (v.photos ?? []).map((url, i) => ({
      publicUrl: url,
      storagePath: url, // treat as opaque path for legacy URLs
      isMain: i === 0,
    }));
  }

  const result: UploadedImage[] = [];
  if (mainUrl) {
    result.push({ publicUrl: mainUrl, storagePath: mainUrl, isMain: true });
  }
  for (const url of galleryUrls) {
    if (url !== mainUrl) {
      result.push({ publicUrl: url, storagePath: url, isMain: false });
    }
  }
  return result;
}

export default function VehicleForm({ initial = {}, mode }: VehicleFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"draft" | "publish">("draft");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const publishingLock = useRef(false);
  const imagesHydrated = useRef(false);

  // Track whether the user has manually edited the title
  const titleManuallyEdited = useRef(!!initial.titleEn);

  // Form state
  const [form, setForm] = useState<Partial<Vehicle>>({
    id: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    fobPrice: 0,
    currency: "USD",
    mileage: 0,
    fuel: "Petrol",
    transmission: "Automatic",
    steering: "Left Hand Drive",
    bodyType: "SUV",
    driveType: "",
    displacement: "",
    color: "",
    seats: 5,
    exportPort: "Guangzhou",
    location: "",
    vin: "",
    status: "草稿",
    featured: false,
    titleEn: "",
    descriptionEn: "",
    features: "",
    notes: "",
    photos: [],
    shippingTiers: [],
    ...initial,
  });

  // Image state from uploader (includes File objects for newly selected images)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(
    () => buildInitialImages(initial)
  );

  // ── Auto-generate stock ID on new vehicles ────────────────────────────────
  useEffect(() => {
    if (mode === "new" && form.brand && form.model && form.year) {
      const autoId = slugify(form.brand, form.model, form.year);
      setForm((prev) => ({ ...prev, id: autoId }));
    }
  }, [form.brand, form.model, form.year, mode]);

  // ── Auto-generate title when relevant fields change ───────────────────────
  useEffect(() => {
    if (titleManuallyEdited.current) return;
    const autoTitle = buildAutoTitle(
      form.year,
      form.brand,
      form.model,
      form.displacement,
      form.transmission,
      form.steering
    );
    setForm((prev) => ({ ...prev, titleEn: autoTitle }));
  }, [form.year, form.brand, form.model, form.displacement, form.transmission, form.steering]);

  const regenerateTitle = () => {
    titleManuallyEdited.current = false;
    const autoTitle = buildAutoTitle(
      form.year,
      form.brand,
      form.model,
      form.displacement,
      form.transmission,
      form.steering
    );
    setForm((prev) => ({ ...prev, titleEn: autoTitle }));
    setIsDirty(true);
  };

  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleTitleChange = (val: string) => {
    titleManuallyEdited.current = true;
    set("titleEn", val as Vehicle["titleEn"]);
  };

  const handleImagesChange = useCallback(
    (imgs: UploadedImage[]) => {
      setUploadedImages(imgs);
      // Ignore first sync from uploader hydrate (edit mode) so form isn't dirty immediately
      if (!imagesHydrated.current) {
        imagesHydrated.current = true;
        return;
      }
      setIsDirty(true);
    },
    []
  );

  const handleSubmit = async (targetStatus: VehicleStatus) => {
    if (publishingLock.current || saving) return;
    publishingLock.current = true;
    setSaving(true);
    setServerError(null);
    setSuccessMsg(null);
    setStatusMsg(null);

    try {
      if (!form.id?.trim()) throw new Error("库存编号不能为空。");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(form.id.trim())) {
        throw new Error("库存编号仅允许字母、数字和连字符。");
      }
      if (!form.brand?.trim()) throw new Error("品牌不能为空。");
      if (!form.model?.trim()) throw new Error("车型不能为空。");
      if (!form.year || Number.isNaN(Number(form.year)) || form.year < 1980 || form.year > 2030) {
        throw new Error("年份无效，请输入 1980–2030 之间的年份。");
      }
      if (form.mileage == null || Number.isNaN(Number(form.mileage)) || form.mileage < 0) {
        throw new Error("里程必须为大于或等于 0 的数字。");
      }
      if (form.fobPrice == null || Number.isNaN(Number(form.fobPrice)) || form.fobPrice < 0) {
        throw new Error("FOB 价格必须为大于或等于 0 的数字。");
      }

      if (targetStatus === "已售") {
        const name = form.titleEn?.trim() || `${form.brand} ${form.model}`;
        const ok = window.confirm(
          `确认将「${name}」标记为已售？\n库存编号：${form.id}\n\n已售车辆将从前台库存中隐藏。`
        );
        if (!ok) {
          publishingLock.current = false;
          setSaving(false);
          return;
        }
      }

      // Preserve final order: keep remote URLs, upload only new File objects
      const ordered = uploadedImages;
      const newFileCount = ordered.filter((img) => img.file instanceof File).length;
      let uploadedSoFar = 0;
      const imageUrls: string[] = [];

      for (const img of ordered) {
        if (img.file instanceof File) {
          uploadedSoFar += 1;
          setStatusMsg(`正在上传图片（${uploadedSoFar}/${newFileCount}）……`);
          const [url] = await uploadVehicleImageFiles(
            [img.file],
            form.id.trim()
          );
          if (!isRemoteUrl(url)) {
            throw new Error("上传返回了无效地址，已中止保存。");
          }
          imageUrls.push(url);
        } else if (isRemoteUrl(img.publicUrl)) {
          imageUrls.push(img.publicUrl);
        }
      }

      if (targetStatus === "在售" && imageUrls.length === 0) {
        throw new Error("发布前请至少上传一张图片。");
      }

      const mainImageUrl = imageUrls[0];
      const galleryImageUrls = imageUrls;

      const payload: Vehicle = {
        ...(form as Vehicle),
        status: targetStatus,
        mainImageUrl: mainImageUrl || undefined,
        galleryImageUrls,
        photos: imageUrls,
        shippingTiers: form.shippingTiers ?? [],
      };

      setStatusMsg(mode === "edit" ? "正在保存车辆……" : "正在保存车辆……");

      const res = await fetch("/api/vehicles", {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data.error || data.message || "保存失败，请重试。";
        const code = data.code ? ` [code: ${data.code}]` : "";
        throw new Error(`保存失败：${detail}${code}`);
      }

      setIsDirty(false);
      setStatusMsg(null);
      if (mode === "edit") {
        setSuccessMsg(
          targetStatus === "草稿" ? "草稿已保存。" : "车辆已更新。"
        );
        // Refresh parent uploaded image state with saved remote URLs
        setUploadedImages(
          imageUrls.map((url, i) => ({
            publicUrl: url,
            storagePath: url,
            isMain: i === 0,
          }))
        );
      } else {
        setSuccessMsg(targetStatus === "草稿" ? "已保存为草稿。" : "发布成功");
        if (targetStatus === "在售") {
          setTimeout(() => router.push("/admin/vehicles"), 800);
        } else {
          router.push("/admin/vehicles");
        }
      }
    } catch (err) {
      setStatusMsg(null);
      if (err instanceof VehicleUploadError) {
        setServerError(err.message);
      } else {
        const message = err instanceof Error ? err.message : "保存失败，请重试。";
        setServerError(message);
      }
    } finally {
      publishingLock.current = false;
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Unsaved changes warning */}
      {isDirty && !successMsg && !statusMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          有未保存的更改
        </div>
      )}

      {statusMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {statusMsg}
        </div>
      )}

      {serverError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {serverError}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* ── Section: 基本信息 ── */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>基本信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Stock ID */}
          <div>
            <label className={labelCls}>
              库存编号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`${fieldCls} ${mode === "edit" ? "bg-slate-50 text-slate-500" : ""}`}
              value={form.id ?? ""}
              onChange={(e) => mode === "new" && set("id", e.target.value.trim())}
              placeholder="例：toyota-rav4-2021"
              readOnly={mode === "edit"}
            />
            {mode === "edit" && (
              <p className="mt-1 text-xs text-slate-400">编辑模式下库存编号不可修改</p>
            )}
          </div>

          {/* Brand */}
          <div>
            <label className={labelCls}>品牌 <span className="text-red-500">*</span></label>
            <input type="text" className={fieldCls} value={form.brand ?? ""}
              onChange={(e) => set("brand", e.target.value)} placeholder="例：Toyota" />
          </div>

          {/* Model */}
          <div>
            <label className={labelCls}>车型 <span className="text-red-500">*</span></label>
            <input type="text" className={fieldCls} value={form.model ?? ""}
              onChange={(e) => set("model", e.target.value)} placeholder="例：RAV4" />
          </div>

          {/* Year */}
          <div>
            <label className={labelCls}>年份 <span className="text-red-500">*</span></label>
            <input type="number" className={fieldCls} value={form.year ?? ""}
              onChange={(e) => set("year", parseInt(e.target.value) || 0)} min={1980} max={2030} required />
          </div>

          {/* Body type */}
          <div>
            <label className={labelCls}>车身类型</label>
            <select className={fieldCls} value={form.bodyType ?? "SUV"}
              onChange={(e) => set("bodyType", e.target.value)}>
              {BODY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Fuel */}
          <div>
            <label className={labelCls}>燃油类型</label>
            <select className={fieldCls} value={form.fuel ?? "Petrol"}
              onChange={(e) => set("fuel", e.target.value)}>
              {FUEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Transmission */}
          <div>
            <label className={labelCls}>变速箱</label>
            <select className={fieldCls} value={form.transmission ?? "Automatic"}
              onChange={(e) => set("transmission", e.target.value)}>
              {TRANSMISSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Drive type */}
          <div>
            <label className={labelCls}>驱动方式</label>
            <select
              className={fieldCls}
              value={form.driveType ?? ""}
              onChange={(e) => set("driveType", e.target.value)}
            >
              <option value="">—</option>
              {DRIVE_TYPE_ADMIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Steering */}
          <div>
            <label className={labelCls}>方向盘位置</label>
            <select className={fieldCls} value={form.steering ?? "Left Hand Drive"}
              onChange={(e) => set("steering", e.target.value)}>
              {STEERING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Displacement */}
          <div>
            <label className={labelCls}>排量</label>
            <input type="text" className={fieldCls} value={form.displacement ?? ""}
              onChange={(e) => set("displacement", e.target.value)} placeholder="例：2.0L" />
          </div>

          {/* Mileage */}
          <div>
            <label className={labelCls}>里程 (km) <span className="text-red-500">*</span></label>
            <input type="number" className={fieldCls} value={form.mileage ?? ""}
              onChange={(e) => set("mileage", parseInt(e.target.value) || 0)} min={0} required />
          </div>

          {/* Color */}
          <div>
            <label className={labelCls}>颜色</label>
            <input type="text" className={fieldCls} value={form.color ?? ""}
              onChange={(e) => set("color", e.target.value)} placeholder="例：白色" />
          </div>

          {/* Seats */}
          <div>
            <label className={labelCls}>座位数</label>
            <input type="number" className={fieldCls} value={form.seats ?? ""}
              onChange={(e) => set("seats", parseInt(e.target.value) || 5)} min={1} max={60} />
          </div>
        </div>
      </div>

      {/* ── Section: 出口与价格信息 ── */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>出口与价格信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>FOB 价格 <span className="text-red-500">*</span></label>
            <input type="number" className={fieldCls} value={form.fobPrice ?? ""}
              onChange={(e) => set("fobPrice", parseFloat(e.target.value) || 0)} min={0} required />
          </div>
          <div>
            <label className={labelCls}>货币</label>
            <select className={fieldCls} value={form.currency ?? "USD"}
              onChange={(e) => set("currency", e.target.value)}>
              {CURRENCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>出口港口</label>
            <select className={fieldCls} value={form.exportPort ?? "Guangzhou"}
              onChange={(e) => set("exportPort", e.target.value)}>
              {PORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>车辆所在地</label>
            <input type="text" className={fieldCls} value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)} placeholder="例：广州" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>VIN / 车架号（仅后台可见）</label>
            <input type="text" className={`${fieldCls} font-mono`} value={form.vin ?? ""}
              onChange={(e) => set("vin", e.target.value.toUpperCase())}
              placeholder="例：JTMRFREV8MD123456" maxLength={17} />
            <p className="mt-1 text-xs text-slate-400">
              VIN 仅供内部管理，不会显示在前台网站或客户 WhatsApp 询价中。
            </p>
          </div>
        </div>
      </div>

      {/* ── Section: 状态与推荐 ── */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>状态与推荐</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>状态</label>
            <select className={fieldCls} value={form.status ?? "草稿"}
              onChange={(e) => set("status", e.target.value as VehicleStatus)}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <input type="checkbox" id="featured" checked={form.featured ?? false}
              onChange={(e) => set("featured", e.target.checked)}
              className="w-4 h-4 rounded accent-[#FACC15]" />
            <label htmlFor="featured" className="text-sm font-medium text-[#1E293B]">
              设为推荐车辆（显示在首页）
            </label>
          </div>
        </div>
      </div>

      {/* ── Section: 内容信息 ── */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>内容信息</h2>
        <div className="space-y-4">
          {/* English title with auto-generate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + " mb-0"}>英文标题</label>
              <button
                type="button"
                onClick={regenerateTitle}
                className="text-xs text-slate-500 hover:text-[#1E293B] transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新生成标题
              </button>
            </div>
            <input
              type="text"
              className={fieldCls}
              value={form.titleEn ?? ""}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="例：2021 Toyota RAV4 2.0L Automatic"
            />
            <p className="mt-1 text-xs text-slate-400">
              根据品牌、车型、年份等字段自动生成，可手动修改
            </p>
          </div>

          <div>
            <label className={labelCls}>英文简介</label>
            <textarea rows={3} className={fieldCls} value={form.descriptionEn ?? ""}
              onChange={(e) => set("descriptionEn", e.target.value)}
              placeholder="英文描述，将显示在前台车辆详情页" />
          </div>
          <div>
            <label className={labelCls}>主要配置（每行一项）</label>
            <textarea rows={4} className={fieldCls} value={form.features ?? ""}
              onChange={(e) => set("features", e.target.value)}
              placeholder={"例：\nLeather seats\nSunroof\nBackup camera"} />
          </div>
          <div>
            <label className={labelCls}>备注（仅内部可见）</label>
            <textarea rows={2} className={fieldCls} value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="内部备注，不显示给客户" />
          </div>
        </div>
      </div>

      {/* ── Section: 车辆图片 ── */}
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>车辆图片</h2>
        <VehicleImageUploader
          vehicleId={form.id || undefined}
          initial={uploadedImages}
          onChange={handleImagesChange}
        />
        {uploadedImages.length === 0 && (
          <p className="mt-3 text-xs text-amber-600">
            草稿可不上传图片；发布上架前需至少上传一张图片。
          </p>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => { setSaveMode("draft"); handleSubmit("草稿"); }}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {saving && saveMode === "draft" ? "保存中…" : "保存草稿"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => {
              setSaveMode("publish");
              handleSubmit((form.status as VehicleStatus) || "在售");
            }}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-[#1E293B] hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving && saveMode === "publish" && form.status !== "在售"
              ? (statusMsg || "保存中…")
              : "保存更改"}
          </button>
        )}
        <button
          type="button"
          onClick={() => { setSaveMode("publish"); handleSubmit("在售"); }}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#FACC15] text-[#1E293B] hover:bg-yellow-300 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving && saveMode === "publish" && (mode === "new" || form.status === "在售")
            ? (statusMsg || "保存中…")
            : mode === "edit"
            ? "保存并上架"
            : "发布车辆"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/vehicles")}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
