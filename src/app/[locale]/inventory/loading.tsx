export default function InventoryLoading() {
  return (
    <div className="bg-white min-h-screen">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse" />
        </div>
      </section>
      <section className="px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="container-max">
          <p className="text-sm text-slate-500">Loading inventory…</p>
        </div>
      </section>
    </div>
  );
}
