import { ArrowRight, Smile } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import HorizontalCarousel from '../common/HorizontalCarousel';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useSpecialties } from '../../hooks/useProfessionals';
import { getSpecialtyIcon } from '../booking/specialtyIcons';
import { accentClasses } from '../common/accentClasses';
import { accentToneFor } from '../../utils/accentTone';

function SpecialtiesSection() {
  const { specialties, isLoading, error } = useSpecialties();

  return (
    <AnimatedSection id="especialidades" className="bg-white py-24">
      <div className="mx-auto max-w-[1240px] px-5">
        <SectionTitle
          eyebrow="Tratamientos"
          title="Especialidades odontológicas"
          subtitle="Especialidades cubiertas por especialistas propios, sin derivaciones externas."
          align="left"
        />

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Spinner size={28} />
          </div>
        ) : error ? (
          <div className="mt-10">
            <EmptyState icon={Smile} title={error} description="Revisa tu conexión y vuelve a intentarlo." />
          </div>
        ) : specialties.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Smile}
              title="No hay especialidades registradas"
              description="Aún no se han publicado especialidades disponibles."
            />
          </div>
        ) : (
        <div className="mt-10">
        <HorizontalCarousel ariaLabel="Especialidades">
          {specialties.map((specialty) => {
            const Icon = getSpecialtyIcon(specialty.name);
            // Mismo color por especialidad en toda la app (accentToneFor).
            const accent = accentClasses[accentToneFor(specialty.name)];

            return (
              <div key={specialty.id} className="group h-full min-w-0">
                <a
                  href="#especialidades"
                  className="flex h-full flex-col gap-3 rounded-[22px] border border-border bg-white p-6 transition-colors duration-200 hover:border-brand-600/30"
                  style={{ boxShadow: 'var(--shadow-soft)' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.boxShadow = 'var(--shadow-soft-hover)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                  }}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.soft} ${accent.text}`}>
                    <Icon size={23} />
                  </span>
                  <h3 className="text-[19px] font-semibold text-brand-900">{specialty.name}</h3>
                  <p className="text-[14.5px] leading-relaxed text-ink-secondary">{specialty.description}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-brand-700">
                    Conocer más
                    <ArrowRight size={15} />
                  </span>
                </a>
              </div>
            );
          })}
        </HorizontalCarousel>
        </div>
        )}
      </div>
    </AnimatedSection>
  );
}

export default SpecialtiesSection;
