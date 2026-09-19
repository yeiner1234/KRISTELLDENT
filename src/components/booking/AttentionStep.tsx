import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Smile, Sparkles, Stethoscope } from 'lucide-react';
import OptionCard from './OptionCard';
import StepHeader from './StepHeader';
import StepTransition from './StepTransition';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useSpecialties } from '../../hooks/useProfessionals';
import { specialtyIcons } from './specialtyIcons';
import { attentionMotives } from './attentionMotives';

type View = 'choice' | 'specialty' | 'motive' | 'recommendation';

interface AttentionStepProps {
  specialtyId: string | null;
  motiveLabel: string | null;
  onChange: (specialtyId: string, motiveLabel: string | null) => void;
  onContinue: () => void;
}

function AttentionStep({ specialtyId, motiveLabel, onChange, onContinue }: AttentionStepProps) {
  const { specialties, isLoading } = useSpecialties();
  const [view, setView] = useState<View>(specialtyId ? 'specialty' : 'choice');
  const [pendingMotiveId, setPendingMotiveId] = useState<string | null>(
    motiveLabel ? (attentionMotives.find((motive) => motive.label === motiveLabel)?.id ?? null) : null,
  );

  const pendingMotive = attentionMotives.find((motive) => motive.id === pendingMotiveId) ?? null;
  const recommendedSpecialty = pendingMotive
    ? specialties.find((specialty) => specialty.id === pendingMotive.recommendedSpecialtyId)
    : null;

  const handlePickMotive = (motiveId: string) => {
    setPendingMotiveId(motiveId);
    setView('recommendation');
  };

  const handleConfirmRecommendation = () => {
    if (recommendedSpecialty && pendingMotive) {
      onChange(recommendedSpecialty.id, pendingMotive.label);
      onContinue();
    }
  };

  return (
    <div>
      {view === 'choice' && (
        <StepTransition transitionKey="choice">
          <StepHeader
            icon={Sparkles}
            title="¿Qué necesitas para tu cita?"
            subtitle="Puedes elegir una especialidad o contarnos qué necesitas y te orientaremos."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              icon={Stethoscope}
              title="Sé qué especialidad necesito"
              description="Quiero elegir directamente el tipo de atención."
              selected={false}
              onClick={() => setView('specialty')}
            />
            <OptionCard
              icon={Sparkles}
              title="Ayúdame a elegir"
              description="No estoy seguro de qué especialidad corresponde."
              selected={false}
              onClick={() => setView('motive')}
            />
          </div>
        </StepTransition>
      )}

      {view === 'specialty' && (
        <StepTransition transitionKey="specialty">
          <button
            type="button"
            onClick={() => setView('choice')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-tertiary hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            Cambiar opción
          </button>
          <StepHeader
            icon={Stethoscope}
            title="Elige una especialidad"
            subtitle="Selecciona el tipo de atención que necesitas."
          />
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={26} />
            </div>
          ) : specialties.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No hay especialidades registradas"
              description="Aún no hay especialidades disponibles para reservar."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {specialties.map((specialty) => {
                const Icon = specialtyIcons[specialty.id] ?? Smile;
                const isSelected = specialty.id === specialtyId;

                return (
                  <button
                    key={specialty.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onChange(specialty.id, null)}
                    className="rounded-2xl p-4 text-left transition-colors"
                    style={{
                      border: isSelected ? '1.5px solid #0f7b86' : '1px solid #e1e8ec',
                      background: isSelected ? '#f5fafb' : '#ffffff',
                      boxShadow: isSelected ? '0 0 0 3px #e6f3f5' : 'none',
                    }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon size={18} />
                    </span>
                    <p className="mt-2.5 text-sm font-semibold text-brand-900">{specialty.name}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-tertiary">{specialty.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </StepTransition>
      )}

      {view === 'motive' && (
        <StepTransition transitionKey="motive">
          <button
            type="button"
            onClick={() => setView('choice')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-tertiary hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            Cambiar opción
          </button>
          <StepHeader
            icon={Sparkles}
            title="¿Cuál es el motivo de tu consulta?"
            subtitle="Elige la opción que mejor describa lo que necesitas."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {attentionMotives.map((motive) => {
              const Icon = motive.icon;

              return (
                <button
                  key={motive.id}
                  type="button"
                  onClick={() => handlePickMotive(motive.id)}
                  className="flex items-center gap-3 rounded-2xl p-4 text-left transition-colors"
                  style={{ border: '1px solid #e1e8ec', background: '#ffffff' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = '#b8d7dc';
                    event.currentTarget.style.background = '#fbfdfd';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = '#e1e8ec';
                    event.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={18} />
                  </span>
                  <p className="text-sm font-medium text-brand-900">{motive.label}</p>
                </button>
              );
            })}
          </div>
        </StepTransition>
      )}

      {view === 'recommendation' && pendingMotive && !recommendedSpecialty && (
        <StepTransition transitionKey="recommendation-empty">
          <button
            type="button"
            onClick={() => setView('motive')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-tertiary hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            Cambiar opción
          </button>
          <EmptyState
            icon={Stethoscope}
            title="No hay una especialidad recomendada disponible"
            description="Elige directamente una especialidad para continuar."
          />
          <div className="mt-4">
            <Button onClick={() => setView('specialty')} size="sm">
              Ver especialidades
            </Button>
          </div>
        </StepTransition>
      )}

      {view === 'recommendation' && recommendedSpecialty && pendingMotive && (
        <StepTransition transitionKey="recommendation">
          <button
            type="button"
            onClick={() => setView('motive')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-tertiary hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            Cambiar opción
          </button>

          <div className="rounded-2xl p-5" style={{ background: '#f5fafb', border: '1px solid #e3eff1' }}>
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--color-confirm-bg)', color: 'var(--color-confirm)' }}
              >
                <CheckCircle2 size={18} />
              </span>
              <div>
                <p className="text-sm text-ink-secondary">Te recomendamos comenzar con</p>
                <p className="mt-0.5 text-lg font-semibold text-brand-900">{recommendedSpecialty.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-tertiary">
                  El profesional realizará una evaluación y podrá orientarte a otra especialidad si fuera necesario.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button onClick={handleConfirmRecommendation} size="sm">
                Continuar
              </Button>
              <button
                type="button"
                onClick={() => setView('specialty')}
                className="text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                Ver especialidades
              </button>
            </div>
          </div>
        </StepTransition>
      )}
    </div>
  );
}

export default AttentionStep;
