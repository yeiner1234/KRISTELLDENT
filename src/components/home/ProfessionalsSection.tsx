import { UserRoundX } from 'lucide-react';
import AnimatedSection from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import HorizontalCarousel from '../common/HorizontalCarousel';
import ProfessionalCard from '../professionals/ProfessionalCard';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useProfessionals, useSpecialties } from '../../hooks/useProfessionals';

function ProfessionalsSection() {
  const { professionals, isLoading, error } = useProfessionals();
  const { specialties } = useSpecialties();

  return (
    <AnimatedSection id="profesionales" className="bg-kd-aqua-50 py-24">
      <div className="mx-auto max-w-[1240px] px-5">
        <SectionTitle
          eyebrow="Nuestro equipo"
          title="Quién te va a atender"
          subtitle="Puedes elegir profesional al reservar. Cada uno mantiene su propia agenda y sus horarios publicados."
          align="left"
        />

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Spinner size={28} />
          </div>
        ) : error ? (
          <div className="mt-10">
            <EmptyState icon={UserRoundX} title={error} description="Revisa tu conexión y vuelve a intentarlo." />
          </div>
        ) : professionals.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={UserRoundX}
              title="No hay profesionales registrados"
              description="Aún no se han publicado profesionales disponibles para reserva."
            />
          </div>
        ) : (
          <div className="mt-10">
            <HorizontalCarousel
              ariaLabel="Profesionales"
              itemClassName="w-[80vw] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)]"
            >
            {professionals.map((professional) => {
              const specialtyName = specialties
                .filter((specialty) => professional.specialtyIds.includes(specialty.id))
                .map((specialty) => specialty.name)
                .join(', ');

              return (
                <div key={professional.id} className="h-full min-w-0">
                  <ProfessionalCard professional={professional} specialtyName={specialtyName || undefined} />
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

export default ProfessionalsSection;
