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
import { useMemo, useState, useTransition } from "react";
import type { Vehicle } from "@/lib/types";
import { HOMEPAGE_SHOWCASE_LIMIT } from "@/lib/homepage-rank";

interface Props {
  initialVehicles: Vehicle[];
}

function coverSrc(v: Vehicle): string {
  return (
    v.mainImageUrl?.trim() ||
    v.photos?.[0] ||
    "/images/rav4.jpg"
  );
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

export default function HomepageFeaturedManager({ initialVehicles }: Props) {
  const [items, setItems] = useState<Vehicle[]>(initialVehicles);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

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
        body: JSON.stringify({ orderedIds: next.map((v) => v.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "保存排序失败");
      }
      if (Array.isArray(data.vehicles)) {
        setItems(data.vehicles as Vehicle[]);
      }
      setSuccessMsg(
        data.message || "Homepage rankings have been updated."
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "保存失败，请重试。");
      // Reload from server to restore consistent ranks
      try {
        const reload = await fetch("/api/admin/homepage-featured", {
          credentials: "include",
        });
        const data = await reload.json();
        if (Array.isArray(data.vehicles)) setItems(data.vehicles);
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
        setItems(data.vehicles as Vehicle[]);
      } else {
        setItems((prev) => prev.filter((v) => v.id !== id));
      }
      setSuccessMsg(
        data.message || "Homepage rankings have been updated."
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "移除失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {items.length > HOMEPAGE_SHOWCASE_LIMIT && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only the first four featured vehicles will appear on the homepage.
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[#1E293B]">
              拖拽调整首页顺序
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              第 1–4 位将显示在首页 Popular Models · 松开后自动保存
            </p>
          </div>
          {(saving || isPending) && (
            <span className="text-xs font-medium text-slate-500 animate-pulse">
              Saving…
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">
            暂无首页推荐车辆。请在车辆列表中点击「⭐ Feature on Homepage」。
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
            <DragOverlay dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}>
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
  const onHomepage = index < HOMEPAGE_SHOWCASE_LIMIT;

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 ${
        dragging
          ? "rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
          : "hover:bg-slate-50/80"
      }`}
    >
      <button
        type="button"
        className="flex-shrink-0 w-9 h-9 rounded-lg text-slate-400 hover:text-[#1E293B] hover:bg-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        disabled={disabled}
        {...dragHandleProps}
      >
        <span className="text-lg leading-none select-none">☰</span>
      </button>

      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center ${
          onHomepage
            ? "bg-[#FACC15] text-[#1E293B]"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {index + 1}
      </div>

      <div className="relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
        <Image
          src={coverSrc(vehicle)}
          alt={vehicleTitle(vehicle)}
          fill
          className="object-cover"
          sizes="64px"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1E293B] truncate">
          {vehicleTitle(vehicle)}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {vehicle.year} · {vehicle.brand} · {formatPrice(vehicle)}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 flex-shrink-0">
        <span className="w-12 text-center">{vehicle.year}</span>
        <span className="w-24 truncate">{vehicle.brand}</span>
        <span className="w-24 text-right font-medium text-[#1E293B]">
          {formatPrice(vehicle)}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-50"
        >
          ✖ Remove
        </button>
      )}
    </div>
  );
}
