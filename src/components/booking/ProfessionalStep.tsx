import { useState } from 'react';
import { ArrowLeft, Shuffle, User } from 'lucide-react';
import OptionCard from './OptionCard';
import StepHeader from './StepHeader';
import StepTransition from './StepTransition';
import EmptyState from '../common/EmptyState';
import { useProfessionals, useSpecialties } from '../../hooks/useProfessionals';
import { getInitials } from '../../utils/format';

type View = 'choice' | 'grid';

export const ANY_PROFESSIONAL = 'any';

interface ProfessionalStepProps {
  specialtyId: string;
  professionalId: string | null;
  onChange: (professionalId: string) => void;
}

function ProfessionalStep({ specialtyId, professionalId, onChange }: ProfessionalStepProps) {
  const [view, setView] = useState<View>(
    professionalId && professionalId !== ANY_PROFESSIONAL ? 'grid' : 'choice',
  );

  const { professionals } = useProfessionals();
  const { specialties } = useSpecialties();
  const specialty = specialties.find((item) => item.id === specialtyId);
  const matchingProfessionals = professionals.filter((professional) => professional.specialtyIds.includes(specialtyId));

  return (
    <div>
      {view === 'choice' && (
        <StepTransition transitionKey="choice">
          <StepHeader
            icon={User}
            title="¿Con quién deseas atenderte?"
            subtitle="Puedes elegir un profesional o reservar según la disponibilidad."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              icon={Shuffle}
              title="Cualquier profesional disponible"
              description="Te mostraremos los horarios disponibles de los profesionales que pueden atenderte."
              tag="Más flexible"
              selected={professionalId === ANY_PROFESSIONAL}
              onClick={() => onChange(ANY_PROFESSIONAL)}
            />
            <OptionCard
              icon={User}
              title="Elegir profesional"
              description="Quiero atenderme con un profesional específico."
              selected={false}
              onClick={() => setView('grid')}
            />
          </div>
        </StepTransition>
      )}

      {view === 'grid' && (
        <StepTransition transitionKey="grid">
          <button
            type="button"
            onClick={() => setView('choice')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-tertiary hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            Cambiar opción
          </button>
          <StepHeader icon={User} title="Elige un profesional" subtitle="Estos profesionales atienden esta especialidad." />

          {matchingProfessionals.length === 0 ? (
            <EmptyState
              icon={User}
              title="No hay profesionales registrados"
              description="No hay profesionales disponibles para esta especialidad."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {matchingProfessionals.map((professional) => {
                const isSelected = professional.id === professionalId;
                const initials = getInitials(professional.fullName);

                return (
                  <button
                    key={professional.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onChange(professional.id)}
                    className="flex items-center gap-3 rounded-2xl p-4 text-left transition-colors"
                    style={{
                      border: isSelected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
                      background: isSelected ? '#f5fafb' : '#ffffff',
                      boxShadow: isSelected ? '0 0 0 3px #e6f3f5' : 'none',
                    }}
                  >
                    <span
                      className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(150deg, #0f7b86, #0a656e)' }}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-brand-900">{professional.fullName}</p>
                      <p className="text-[13px] text-ink-tertiary">{specialty?.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </StepTransition>
      )}
    </div>
  );
}

export default ProfessionalStep;
