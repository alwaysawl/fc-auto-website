import type { Translations } from "@/lib/translations";

interface HomeWhyChooseTrustProps {
  t: Translations;
}

const ICONS = [
  // Strict Vehicle Inspection
  <svg key="inspect" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>,
  // Third-Party Inspection Supported
  <svg key="third" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>,
  // Transparent China Pricing
  <svg key="price" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Professional Export Experience
  <svg key="export" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Secure Container Loading
  <svg key="container" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>,
  // Dedicated WhatsApp Support
  <svg key="whatsapp" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>,
];

export default function HomeWhyChooseTrust({ t }: HomeWhyChooseTrustProps) {
  const section = t.whyChooseTrust;

  return (
    <section className="px-3 min-[360px]:px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-20 bg-brand-slate">
      <div className="container-max">
        <div className="text-center mb-8 sm:mb-12 max-w-2xl mx-auto px-1">
          <h2 className="text-xl min-[360px]:text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3 break-words">
            {section.title}
          </h2>
          <p className="text-white/65 text-sm sm:text-base leading-relaxed break-words">
            {section.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 min-[360px]:gap-3 sm:gap-5 md:gap-6">
          {section.items.map((item, index) => (
            <article
              key={item.title}
              className="min-w-0 rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.06] p-3 min-[360px]:p-4 sm:p-6 transition-all duration-300 md:hover:-translate-y-1 md:hover:border-accent-yellow/40 md:hover:bg-white/[0.1] md:hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
            >
              <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-accent-yellow text-brand-slate shadow-soft">
                {ICONS[index]}
              </div>
              <h3 className="text-[13px] min-[360px]:text-sm sm:text-base font-semibold text-white mb-1.5 sm:mb-2 leading-snug break-words">
                {item.title}
              </h3>
              <p className="text-[11px] min-[360px]:text-xs sm:text-sm text-white/60 leading-relaxed break-words">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
