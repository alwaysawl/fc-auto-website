"use client";

import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import {
  HOMEPAGE_MAX_FEATURED_MESSAGE,
  HOMEPAGE_SHOWCASE_LIMIT,
} from "@/lib/homepage-rank";

interface Props {
  initialVehicles: Vehicle[];
}

function coverSrc(v: Vehicle): string {
  return v.mainImageUrl?.trim() || v.photos?.[0] || "/images/rav4.jpg";
}

function vehicleTitle(v: Vehicle): string {
  return v.titleEn?.trim() || `${v.brand} ${v.model}`;
}

function formatPrice(v: Vehicle): string {
  const currency = v.currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v.fobPrice ?? 0);
}

function statusLabel(status?: VehicleStatus): string {
  switch (status) {
    case "在售":
      return "在售";
    case "已售":
      return "已售";
    case "草稿":
      return "草稿";
    case "已下架":
      return "已下架";
    default:
      return status || "—";
  }
}

export default function HomepageFeaturedManager({ initialVehicles }: Props) {
  const [items, setItems] = useState<Vehicle[]>(
    initialVehicles.slice(0, HOMEPAGE_SHOWCASE_LIMIT)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const atMax = items.length >= HOMEPAGE_SHOWCASE_LIMIT;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = useMemo(() => items.map((v) => v.id), [items]);
  const activeItem = items.find((v) => v.id === activeId) ?? null;

  const persistOrder = async (next: Vehicle[]) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/homepage-featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderedIds: next.map((v) => v.id).slice(0, HOMEPAGE_SHOWCASE_LIMIT),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "保存失败");
      if (Array.isArray(data.vehicles)) {
        setItems((data.vehicles as Vehicle[]).slice(0, HOMEPAGE_SHOWCASE_LIMIT));
      }
      setSuccessMsg(data.message || "保存成功");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "保存失败，请重试。");
      try {
        const reload = await fetch("/api/admin/homepage-featured", {
          credentials: "include",
        });
        const data = await reload.json();
        if (Array.isArray(data.vehicles)) {
          setItems((data.vehicles as Vehicle[]).slice(0, HOMEPAGE_SHOWCASE_LIMIT));
        }
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setSuccessMsg(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((v) => v.id === active.id);
    const newIndex = items.findIndex((v) => v.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex).map((v, i) => ({
      ...v,
      homepageRank: i + 1,
      featured: true,
    }));
    setItems(next);
    startTransition(() => {
      void persistOrder(next);
    });
  };

  const removeFromHomepage = async (id: string) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/homepage-featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, featured: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "移除失败");
      if (Array.isArray(data.vehicles)) {
        setItems((data.vehicles as Vehicle[]).slice(0, HOMEPAGE_SHOWCASE_LIMIT));
      } else {
        setItems((prev) =>
          prev
            .filter((v) => v.id !== id)
            .map((v, i) => ({ ...v, homepageRank: i + 1 }))
        );
      }
      setSuccessMsg(data.message || "保存成功");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "移除失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const addFeatured = async (id: string) => {
    if (atMax) {
      setErrorMsg(HOMEPAGE_MAX_FEATURED_MESSAGE);
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/homepage-featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, featured: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "添加失败");
      if (Array.isArray(data.vehicles)) {
        setItems((data.vehicles as Vehicle[]).slice(0, HOMEPAGE_SHOWCASE_LIMIT));
      }
      setSuccessMsg(data.message || "保存成功");
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "添加失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    if (atMax) {
      setErrorMsg(HOMEPAGE_MAX_FEATURED_MESSAGE);
      return;
    }
    setErrorMsg(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500">
          当前 {items.length}/{HOMEPAGE_SHOWCASE_LIMIT} 台 · 拖拽后自动保存
        </p>
        <div className="flex items-center gap-2">
          {(saving || isPending) && (
            <span className="text-xs font-medium text-slate-500 animate-pulse">
              保存中…
            </span>
          )}
          <button
            type="button"
            onClick={openAddModal}
            disabled={saving || atMax}
            title={atMax ? HOMEPAGE_MAX_FEATURED_MESSAGE : "添加推荐车辆"}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-[#FACC15] text-[#1E293B] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            + 添加推荐车辆
          </button>
        </div>
      </div>

      {atMax && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {HOMEPAGE_MAX_FEATURED_MESSAGE}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">
            暂无首页推荐车辆。点击「添加推荐车辆」开始设置。
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-slate-100">
                {items.map((vehicle, index) => (
                  <SortableFeaturedRow
                    key={vehicle.id}
                    vehicle={vehicle}
                    index={index}
                    disabled={saving}
                    onRemove={() => void removeFromHomepage(vehicle.id)}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
              }}
            >
              {activeItem ? (
                <FeaturedRowContent
                  vehicle={activeItem}
                  index={items.findIndex((v) => v.id === activeItem.id)}
                  dragging
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {modalOpen && (
        <AddFeaturedModal
          disabled={saving}
          onClose={() => setModalOpen(false)}
          onAdd={(id) => void addFeatured(id)}
        />
      )}
    </div>
  );
}

function SortableFeaturedRow({
  vehicle,
  index,
  disabled,
  onRemove,
}: {
  vehicle: Vehicle;
  index: number;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vehicle.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="bg-white">
      <FeaturedRowContent
        vehicle={vehicle}
        index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={onRemove}
        disabled={disabled}
      />
    </li>
  );
}

function FeaturedRowContent({
  vehicle,
  index,
  dragHandleProps,
  onRemove,
  disabled,
  dragging,
}: {
  vehicle: Vehicle;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onRemove?: () => void;
  disabled?: boolean;
  dragging?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 ${
        dragging
          ? "rounded-xl border border-slate-200 bg-white shadow-lg"
          : "hover:bg-slate-50/80"
      }`}
    >
      <button
        type="button"
        className="flex-shrink-0 w-8 h-8 rounded-md text-slate-400 hover:text-[#1E293B] hover:bg-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        aria-label="拖拽排序"
        disabled={disabled}
        {...dragHandleProps}
      >
        <span className="text-base leading-none select-none">☰</span>
      </button>

      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FACC15] text-[#1E293B] text-[11px] font-bold flex items-center justify-center">
        {index + 1}
      </div>

      <div className="relative w-12 h-9 sm:w-14 sm:h-10 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
        <Image
          src={coverSrc(vehicle)}
          alt={vehicleTitle(vehicle)}
          fill
          className="object-cover"
          sizes="56px"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1E293B] truncate">
          {vehicleTitle(vehicle)}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate sm:hidden">
          {vehicle.year} · {vehicle.brand} · {formatPrice(vehicle)}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 flex-shrink-0">
        <span className="w-10 text-center tabular-nums">{vehicle.year}</span>
        <span className="w-20 truncate">{vehicle.brand}</span>
        <span className="w-20 text-right font-medium text-[#1E293B] tabular-nums">
          {formatPrice(vehicle)}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-50 whitespace-nowrap"
        >
          从首页移除
        </button>
      )}
    </div>
  );
}

function AddFeaturedModal({
  disabled,
  onClose,
  onAdd,
}: {
  disabled?: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [candidates, setCandidates] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadCandidates = useCallback(async (q: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/homepage-featured?candidates=1&q=${encodeURIComponent(q)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "加载失败");
      setCandidates(Array.isArray(data.vehicles) ? data.vehicles : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates(debounced);
  }, [debounced, loadCandidates]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-featured-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <h2
            id="add-featured-title"
            className="text-base font-bold text-[#1E293B]"
          >
            添加推荐车辆
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 text-lg leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索品牌、车型、库存编号…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FACC15]/60 focus:border-[#FACC15]"
            autoFocus
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            仅显示「在售」且尚未推荐的车辆
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              加载中…
            </div>
          ) : loadError ? (
            <div className="px-4 py-10 text-center text-sm text-red-600">
              {loadError}
            </div>
          ) : candidates.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              没有可添加的在售车辆
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {candidates.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5"
                >
                  <div className="relative w-12 h-9 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                    <Image
                      src={coverSrc(v)}
                      alt={vehicleTitle(v)}
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1E293B] truncate">
                      {vehicleTitle(v)}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {v.year} · {v.brand} · {statusLabel(v.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled || addingId === v.id}
                    onClick={() => {
                      setAddingId(v.id);
                      onAdd(v.id);
                    }}
                    className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-[#1E293B] text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {addingId === v.id ? "添加中…" : "添加"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
