import Link from "next/link";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";

interface FooterProps {
  locale: Locale;
  t: Translations;
}

export default function Footer({ locale, t }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: getLocalizedPath("/", locale), label: t.nav.home },
    { href: getLocalizedPath("/inventory", locale), label: t.nav.inventory },
    { href: getLocalizedPath("/about", locale), label: t.nav.about },
    { href: getLocalizedPath("/contact", locale), label: t.nav.contact },
  ];

  return (
    <footer className="bg-charcoal-deeper text-gray-400 border-t border-white/5">
      <div className="container-max section-padding pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold rounded-sm flex items-center justify-center shadow-gold flex-shrink-0">
                <span className="text-charcoal font-bold text-lg">FC</span>
              </div>
              <div className="min-w-0">
                <span className="text-white font-display font-bold text-xl block truncate">
                  {t.footer.company}
                </span>
                <span className="text-[10px] text-gold/60 uppercase tracking-[0.15em]">
                  International Trading
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500 break-words">{t.footer.tagline}</p>
          </div>

          <div className="min-w-0">
            <h3 className="text-white font-semibold mb-5 uppercase tracking-[0.12em] text-xs">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-gold transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h3 className="text-white font-semibold mb-5 uppercase tracking-[0.12em] text-xs">
              {t.footer.contactInfo}
            </h3>
            <WhatsAppAssignLink
              sourcePage="footer"
              className="inline-flex items-start sm:items-center gap-3 text-sm hover:text-[#25D366] transition-colors duration-200 group min-w-0"
            >
              <span className="w-10 h-10 bg-[#25D366]/10 border border-[#25D366]/20 rounded-sm flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-white group-hover:text-[#25D366] transition-colors">
                  {t.nav.whatsapp}
                </span>
                <span className="text-gray-500 break-all">+86 166 7636 4929</span>
              </span>
            </WhatsAppAssignLink>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 text-center sm:text-left">
          <p className="break-words">
            {t.footer.copyright} {currentYear}.
          </p>
          <div className="h-px w-8 bg-gold/40 hidden sm:block" />
        </div>
      </div>
    </footer>
  );
}
