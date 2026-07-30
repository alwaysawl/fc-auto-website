import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminSidebarToggle from "@/components/admin/AdminSidebarToggle";

export const metadata = {
  title: "Admin | FC Auto Export",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          {/* Mobile toggle */}
          <AdminSidebarToggle />

          {/* Page title slot filled by children via layout trick – use a static placeholder */}
          <div className="flex-1" />

          {/* Current date */}
          <span className="hidden sm:block text-sm text-slate-500">
            {new Date().toLocaleDateString("zh-CN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>

          {/* Search */}
          <div className="relative hidden md:block">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="搜索…"
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-transparent w-48"
            />
          </div>

          {/* Notification icon */}
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" aria-label="通知">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>

          {/* Admin profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-bold text-xs">S</span>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-[#1E293B] leading-tight">Shawn</p>
              <p className="text-xs text-slate-500 leading-tight">管理员</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
