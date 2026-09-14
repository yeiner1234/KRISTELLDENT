import AnimatedSection, { RevealItem } from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import Button from '../common/Button';
import ProfessionalCard from '../professionals/ProfessionalCard';
import { professionals, specialties } from '../../data/mockData';

function ProfessionalsSection() {
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

        <div className="mt-10 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))' }}>
          {professionals.map((professional, index) => {
            const specialty = specialties.find((item) => item.id === professional.specialtyId);

            return (
              <RevealItem key={professional.id} index={index} className="min-w-0">
                <ProfessionalCard
                  professional={professional}
                  specialtyName={specialty?.name}
                  meta={`${professional.experienceYears} años`}
                />
              </RevealItem>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}

export default ProfessionalsSection;
