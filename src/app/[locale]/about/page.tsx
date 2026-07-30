import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";

export default async function AboutPage({
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
          <h1 className="heading-display mb-4">{t.about.title}</h1>
          <div className="gold-divider mb-6" />
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t.about.subtitle}</p>
        </div>
      </section>

      <section className="section-padding section-dark">
        <div className="container-max max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            {t.about.mission.title}
          </h2>
          <div className="gold-divider-left mb-6" />
          <p className="text-gray-400 leading-relaxed mb-16">{t.about.mission.description}</p>

          <h2 className="font-display text-2xl font-bold text-white mb-4">
            {t.about.story.title}
          </h2>
          <div className="gold-divider-left mb-6" />
          <p className="text-gray-400 leading-relaxed">{t.about.story.description}</p>
        </div>
      </section>

      <section className="section-padding section-surface border-y border-white/5">
        <div className="container-max">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {t.about.stats.map((stat, index) => (
              <div key={index} className="text-center card-premium p-8">
                <p className="text-4xl font-display font-bold text-gold mb-2">{stat.value}</p>
                <p className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="text-center mb-16">
            <h2 className="heading-display mb-4">{t.about.values.title}</h2>
            <div className="gold-divider" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.about.values.items.map((item, index) => (
              <div
                key={index}
                className="card-premium p-8 text-center group"
              >
                <div className="w-10 h-10 bg-gold/10 border border-gold/20 rounded-sm flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/20 transition-colors">
                  <span className="text-gold font-display font-bold">{index + 1}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
