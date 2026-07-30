import { Translations } from "@/lib/translations";

interface HomeStatsProps {
  t: Translations;
}

export default function HomeStats({ t }: HomeStatsProps) {
  return (
    <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16 md:pb-24 pt-8 md:pt-10">
      <div className="container-max">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {t.hero.stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-soft border border-slate-100 text-center hover:shadow-soft-lg transition-shadow duration-300"
            >
              <p className="text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-2">
                {stat.value}
              </p>
              <p className="text-sm md:text-base text-slate-500 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
