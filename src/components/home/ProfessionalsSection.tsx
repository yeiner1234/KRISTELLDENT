import { UserRoundX } from 'lucide-react';
import AnimatedSection, { RevealItem } from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import Button from '../common/Button';
import ProfessionalCard from '../professionals/ProfessionalCard';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useProfessionals, useSpecialties } from '../../hooks/useProfessionals';

function ProfessionalsSection() {
  const { professionals, isLoading } = useProfessionals();
  const { specialties } = useSpecialties();

  return (
    <AnimatedSection id="profesionales" className="bg-surface-alt py-24">
      <div className="mx-auto max-w-[1240px] px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle
            eyebrow="Nuestro equipo"
            title="Quién te va a atender"
            subtitle="Puedes elegir profesional al reservar. Cada uno mantiene su propia agenda y sus horarios publicados."
            align="left"
          />
          <Button to="/reservar" variant="secondary">
            Ver profesionales
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Spinner size={28} />
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
          <div className="mt-10 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))' }}>
            {professionals.map((professional, index) => {
              const specialtyName = specialties
                .filter((specialty) => professional.specialtyIds.includes(specialty.id))
                .map((specialty) => specialty.name)
                .join(', ');

              return (
                <RevealItem key={professional.id} index={index} className="min-w-0">
                  <ProfessionalCard professional={professional} specialtyName={specialtyName || undefined} />
                </RevealItem>
              );
            })}
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}

export default ProfessionalsSection;
