export default function VehicleDetailLoading() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container-max px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
          <div className="aspect-[4/3] bg-slate-100 rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 w-1/2 bg-slate-100 rounded animate-pulse" />
            <div className="h-24 w-full bg-slate-50 rounded animate-pulse" />
          </div>
        </div>
        <p className="mt-8 text-sm text-slate-500">Loading vehicle…</p>
      </div>
    </div>
  );
}
