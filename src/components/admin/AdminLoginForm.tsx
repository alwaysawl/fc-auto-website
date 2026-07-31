"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminLoginFormProps {
  configured: boolean;
}

export default function AdminLoginForm({ configured }: AdminLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!configured || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

        {!configured ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            服务器尚未配置 <code className="font-mono">ADMIN_PASSWORD</code>
            。请在环境变量中设置管理员密码后重试（会话签名可使用现有
            SUPABASE_SECRET_KEY）。
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
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
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
