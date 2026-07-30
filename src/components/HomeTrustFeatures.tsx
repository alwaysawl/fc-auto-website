import { Translations } from "@/lib/translations";

interface HomeTrustFeaturesProps {
  t: Translations;
  variant?: "bar" | "section";
}

const icons = [
  (
    <svg key="inspection" className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  (
    <svg key="export" className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  (
    <svg key="shipping" className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  (
    <svg key="support" className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
];

export default function HomeTrustFeatures({ t, variant = "bar" }: HomeTrustFeaturesProps) {
  if (variant === "section") {
    return (
      <section className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-10 md:py-14 border-t border-slate-100">
        <div className="container-max">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {t.trustFeatures.items.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center px-2 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-soft flex items-center justify-center mb-4">
                  {icons[index]}
                </div>
                <h3 className="text-sm font-semibold text-brand-slate mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="container-max">
      <div className="bg-[#1a2332] rounded-xl shadow-lg border border-white/5 px-3 sm:px-6 py-5 sm:py-8 md:py-9">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-8">
          {t.trustFeatures.items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 sm:gap-4 min-w-0 py-1">
              <div className="flex-shrink-0 mt-1">{icons[index]}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white leading-tight mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-snug">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
