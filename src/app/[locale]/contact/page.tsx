import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import ContactForm from "@/components/ContactForm";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const t = getTranslations(localeParam as Locale);
  return {
    title: t.seo.contactTitle,
    description: t.seo.contactDescription,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);

  return (
    <>
      <section className="bg-charcoal-deeper text-white section-padding border-b border-white/5">
        <div className="container-max text-center">
          <h1 className="heading-display mb-4">{t.contact.title}</h1>
          <div className="gold-divider mb-6" />
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t.contact.subtitle}</p>
        </div>
      </section>

      <section className="section-padding section-dark">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="card-premium p-5 sm:p-6 flex gap-4 sm:gap-5 min-w-0">
                <div className="w-12 h-12 bg-[#25D366]/10 border border-[#25D366]/20 rounded-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white mb-2">{t.contact.whatsapp}</h3>
                  <p className="text-gray-400 text-sm mb-4">{t.contact.whatsappDesc}</p>
                  <WhatsAppAssignLink
                    sourcePage="contact"
                    className="btn-whatsapp text-sm inline-flex !px-4 sm:!px-7 min-h-11"
                  >
                    {t.contact.chatNow}
                  </WhatsAppAssignLink>
                </div>
              </div>

              <div className="card-premium p-5 sm:p-6 flex gap-4 sm:gap-5 min-w-0">
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white mb-2">{t.contact.location}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line break-words">
                    {t.contact.locationDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium p-5 sm:p-8">
              <ContactForm t={t} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
