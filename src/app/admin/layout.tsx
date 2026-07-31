import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminSidebarToggle from "@/components/admin/AdminSidebarToggle";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import {
  isAdminAuthConfigured,
  isAdminSessionActive,
} from "@/lib/admin/auth";

export const metadata = {
  title: "Admin | FC Auto Export",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isAdminAuthConfigured();
  const authenticated = configured ? await isAdminSessionActive() : false;

  if (!authenticated) {
    return <AdminLoginForm configured={configured} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <AdminSidebarToggle />
          <div className="flex-1" />
          <span className="hidden sm:block text-sm text-slate-500">
            {new Date().toLocaleDateString("zh-CN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <AdminLogoutButton />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-bold text-xs">A</span>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-[#1E293B] leading-tight">Admin</p>
              <p className="text-xs text-slate-500 leading-tight">已登录</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
