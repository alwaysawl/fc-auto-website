import AdminShippingEditor from "@/components/admin/AdminShippingEditor";

export default function AdminShippingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">运费管理</h1>
      <p className="text-slate-500 text-sm mb-8">
        先选择国家，再查看并编辑该国港口运费。运费与车型无关。
      </p>
      <AdminShippingEditor />
    </div>
  );
}
