"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminLoginFormProps {
  configured: boolean;
  adminPasswordConfigured: boolean;
  sessionSecretConfigured: boolean;
}

type Diagnostics = {
  adminPasswordConfigured: boolean;
  sessionSecretConfigured: boolean;
  configured: boolean;
};

export default function AdminLoginForm({
  configured: configuredProp,
  adminPasswordConfigured: passwordProp,
  sessionSecretConfigured: sessionProp,
}: AdminLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    configured: configuredProp,
    adminPasswordConfigured: passwordProp,
    sessionSecretConfigured: sessionProp,
  });

  // Re-check at runtime via Node route handler (same env reads as login API).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || typeof data !== "object" || data === null) return;
        setDiagnostics({
          configured: Boolean(data.configured),
          adminPasswordConfigured: Boolean(data.adminPasswordConfigured),
          sessionSecretConfigured: Boolean(data.sessionSecretConfigured),
        });
      })
      .catch(() => {
        /* keep server-rendered props */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!diagnostics.configured || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "登录失败");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#1E293B]">管理员登录</h1>
        <p className="mt-2 text-sm text-slate-500">
          车辆管理与含 VIN 的数据仅在登录后可用。
        </p>

        {!diagnostics.configured ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
            <p>服务器尚未完成管理员鉴权配置（仅显示是否已配置，不包含密钥内容）：</p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
              <li>
                ADMIN_PASSWORD:{" "}
                {diagnostics.adminPasswordConfigured ? "configured" : "missing"}
              </li>
              <li>
                session signing key (ADMIN_SESSION_SECRET / SUPABASE_SECRET_KEY):{" "}
                {diagnostics.sessionSecretConfigured ? "configured" : "missing"}
              </li>
            </ul>
            <p className="text-amber-800/90">
              请确认变量名完全一致（区分大小写）、已勾选 Production、并重新部署。不要使用
              NEXT_PUBLIC_ 前缀。
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1">
                管理密码
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-[#FACC15] text-[#1E293B] text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? "登录中…" : "登录"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
