import { ArrowRight, Smile } from 'lucide-react';
import AnimatedSection, { RevealItem } from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useSpecialties } from '../../hooks/useProfessionals';
import { specialtyIcons } from '../booking/specialtyIcons';

function SpecialtiesSection() {
  const { specialties, isLoading } = useSpecialties();

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
        ) : specialties.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Smile}
              title="No hay especialidades registradas"
              description="Aún no se han publicado especialidades disponibles."
            />
          </div>
        ) : (
        <div className="mt-10 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {specialties.map((specialty, index) => {
            const Icon = specialtyIcons[specialty.id] ?? Smile;

            return (
              <RevealItem key={specialty.id} index={index} className="group min-w-0">
                <a
                  href="#especialidades"
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border p-6 transition-all duration-200 hover:-translate-y-[5px] hover:border-brand-600/30"
                  style={{ boxShadow: 'var(--shadow-soft)' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.boxShadow = 'var(--shadow-soft-hover)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                  }}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-tint text-brand-600 transition-transform duration-200 group-hover:scale-105">
                    <Icon size={22} />
                  </span>
                  <h3 className="text-lg font-semibold text-brand-900">{specialty.name}</h3>
                  <p className="text-[14.5px] leading-relaxed text-ink-secondary">{specialty.description}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-brand-700">
                    Conocer más
                    <ArrowRight size={15} />
                  </span>
                </a>
              </RevealItem>
            );
          })}
        </div>
        )}
      </div>
    </AnimatedSection>
  );
}

export default SpecialtiesSection;
