"use client";

import { useEffect, useRef, useState } from "react";

export interface UploadedImage {
  publicUrl: string;
  storagePath: string;
  isMain: boolean;
  /** Present for newly selected local files; absent for already-saved remote images. */
  file?: File;
}

interface Props {
  vehicleId?: string;
  initial?: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}

type LocalImageItem = {
  id: string;
  file?: File;
  previewUrl: string;
  isMain: boolean;
  storagePath?: string;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_COUNT = 30;

/** Option A: first image in the array is always the cover. */
function withCoverOnFirst(list: LocalImageItem[]): LocalImageItem[] {
  return list.map((item, index) => ({
    ...item,
    isMain: index === 0,
  }));
}

function initialToItems(initial?: UploadedImage[]): LocalImageItem[] {
  if (!initial?.length) return [];
  return withCoverOnFirst(
    initial.map((img, index) => ({
      id: img.storagePath || `remote-${index}-${img.publicUrl}`,
      previewUrl: img.publicUrl,
      storagePath: img.storagePath,
      isMain: index === 0,
    }))
  );
}

function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export default function VehicleImageUploader({
  initial,
  onChange,
}: Props) {
  const [items, setItems] = useState<LocalImageItem[]>(() => initialToItems(initial));
  const [lastError, setLastError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const hydrated = useRef(false);
  const seenFingerprints = useRef<Set<string>>(new Set());

  useEffect(() => {
    onChange(
      items.map((item) => ({
        publicUrl: item.previewUrl,
        storagePath: item.storagePath ?? item.id,
        isMain: item.isMain,
        file: item.file,
      }))
    );
  }, [items, onChange]);

  useEffect(() => {
    if (hydrated.current) return;
    if (initial && initial.length > 0 && items.length === 0) {
      setItems(initialToItems(initial));
      hydrated.current = true;
    } else if (items.length > 0 || (initial && initial.length === 0)) {
      hydrated.current = true;
    }
  }, [initial, items.length]);

  useEffect(() => {
    return () => {
      setItems((prev) => {
        prev.forEach((it) => {
          if (it.previewUrl.startsWith("blob:")) URL.revokeObjectURL(it.previewUrl);
        });
        return prev;
      });
    };
  }, []);

  const appendFiles = (selectedFiles: File[]) => {
    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of selectedFiles) {
      if (!ALLOWED.includes(file.type)) {
        rejected.push(`${file.name}（格式不支持，请使用 JPG / PNG / WebP）`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejected.push(`${file.name}（超过 10MB）`);
        continue;
      }
      const fp = fileFingerprint(file);
      if (seenFingerprints.current.has(fp)) {
        rejected.push(`${file.name}（已添加，已跳过重复）`);
        continue;
      }
      accepted.push(file);
      seenFingerprints.current.add(fp);
    }

    setItems((previous) => {
      const availableSlots = Math.max(0, MAX_COUNT - previous.length);
      const toAdd = accepted.slice(0, availableSlots);
      if (accepted.length > availableSlots) {
        rejected.push(`最多 ${MAX_COUNT} 张，已截断多余文件`);
      }
      const newItems = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        isMain: false,
      }));
      return withCoverOnFirst([...previous, ...newItems]);
    });

    setLastError(rejected.length ? rejected.join("；") : "");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      appendFiles(Array.from(event.currentTarget.files ?? []));
      event.currentTarget.value = "";
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "图片读取失败");
    }
  };

  const setMainImage = (id: string) => {
    setItems((previous) => {
      const mainItem = previous.find((item) => item.id === id);
      if (!mainItem) return previous;
      const otherItems = previous.filter((item) => item.id !== id);
      return withCoverOnFirst([mainItem, ...otherItems]);
    });
  };

  const moveImage = (id: string, direction: -1 | 1) => {
    setItems((previous) => {
      const currentIndex = previous.findIndex((item) => item.id === id);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }
      const next = [...previous];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return withCoverOnFirst(next);
    });
  };

  const removeImage = (id: string) => {
    setItems((previous) => {
      const removedItem = previous.find((item) => item.id === id);
      if (removedItem?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removedItem.previewUrl);
      }
      if (removedItem?.file) {
        seenFingerprints.current.delete(fileFingerprint(removedItem.file));
      }
      return withCoverOnFirst(previous.filter((item) => item.id !== id));
    });
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragOverItem = (event: React.DragEvent, overId: string) => {
    event.preventDefault();
    if (!dragId || dragId === overId) return;
    setItems((previous) => {
      const from = previous.findIndex((item) => item.id === dragId);
      const to = previous.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0 || from === to) return previous;
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return withCoverOnFirst(next);
    });
  };
  const onDragEnd = () => setDragId(null);

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
          dragOver
            ? "border-yellow-400 bg-yellow-50"
            : "border-slate-200 bg-slate-50 hover:border-slate-300"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          appendFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <span className="text-sm font-medium text-slate-700">
          点击或拖拽图片到此处上传
        </span>
        <span className="text-xs text-slate-500 text-center">
          支持 JPG、PNG、WebP，单张最大 10MB。保存时会自动压缩过大图片。
        </span>
      </label>

      <p className="mt-3 text-sm text-slate-600">
        已选择 {items.length} / {MAX_COUNT} 张 · 第一张为封面 · 可拖拽卡片排序
      </p>

      {lastError && (
        <p className="mt-2 text-sm font-medium text-red-600">{lastError}</p>
      )}

      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const label = item.file?.name ?? "已保存图片";
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => onDragOverItem(e, item.id)}
                onDragEnd={onDragEnd}
                className={`rounded-xl border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing ${
                  item.isMain ? "border-yellow-400 ring-1 ring-yellow-300" : "border-gray-200"
                } ${dragId === item.id ? "opacity-60" : ""}`}
              >
                <div className="relative overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={label}
                    className="h-40 w-full object-cover"
                  />
                  {item.isMain && (
                    <span className="absolute left-2 top-2 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800 shadow-sm">
                      封面图
                    </span>
                  )}
                  <span className="absolute right-2 top-2 inline-flex rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                    第 {index + 1} 张
                  </span>
                </div>

                <p className="mt-2 truncate text-sm font-medium text-slate-700" title={label}>
                  {label}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!item.isMain && (
                    <button
                      type="button"
                      onClick={() => setMainImage(item.id)}
                      className="rounded-lg border border-yellow-500 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-100"
                    >
                      设为封面
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => moveImage(item.id, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    向前
                  </button>

                  <button
                    type="button"
                    onClick={() => moveImage(item.id, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    向后
                  </button>

                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
