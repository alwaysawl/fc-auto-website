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
      // no file — already remote
    }))
  );
}

export default function VehicleImageUploader({
  initial,
  onChange,
}: Props) {
  const [items, setItems] = useState<LocalImageItem[]>(() => initialToItems(initial));
  const [lastError, setLastError] = useState("");
  const hydrated = useRef(false);

  // Sync list to parent (includes remote URLs + new File objects)
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

  // Load initial remote images once if they arrive after mount (edit page)
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedFiles = Array.from(event.currentTarget.files ?? []);

      setItems((previous) => {
        const availableSlots = Math.max(0, 30 - previous.length);

        const acceptedFiles = selectedFiles
          .filter((file) =>
            ["image/jpeg", "image/png", "image/webp"].includes(file.type)
          )
          .filter((file) => file.size <= 10 * 1024 * 1024)
          .slice(0, availableSlots);

        const newItems = acceptedFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          isMain: false,
        }));

        return withCoverOnFirst([...previous, ...newItems]);
      });

      setLastError("");
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
      return withCoverOnFirst(previous.filter((item) => item.id !== id));
    });
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
      />

      <p className="mt-3 text-sm text-slate-600">
        已选择 {items.length} / 30 张
      </p>
      <p className="mt-1 text-xs text-slate-400">
        支持 JPG、PNG、WebP，单张最大 10MB。可多次选择，新图片会追加到列表。已保存的图片可保留、排序或删除。
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
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  item.isMain ? "border-yellow-400 ring-1 ring-yellow-300" : "border-gray-200"
                }`}
              >
                <div className="relative overflow-hidden rounded-lg bg-slate-100">
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
