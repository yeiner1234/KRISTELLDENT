import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import OptionCard from './OptionCard';
import StepHeader from './StepHeader';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { ANY_PROFESSIONAL } from './ProfessionalStep';
import { formatCurrency } from '../../utils/format';

interface ServiceStepProps {
  specialtyId: string;
  professionalId: string;
  serviceId: string | null;
  onChange: (serviceId: string) => void;
}

function ServiceStep({ specialtyId, professionalId, serviceId, onChange }: ServiceStepProps) {
  const { professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { services, isLoading: isLoadingServices } = useServices();
  const isLoading = isLoadingProfessionals || isLoadingServices;

  const candidateProfessionals = useMemo(
    () =>
      professionalId === ANY_PROFESSIONAL
        ? professionals.filter((professional) => professional.specialtyIds.includes(specialtyId))
        : professionals.filter((professional) => professional.id === professionalId),
    [professionals, professionalId, specialtyId],
  );

  // Solo se ofrecen servicios que el/los profesional(es) candidato(s)
  // realmente tienen asignados — nunca un servicio que nadie puede atender.
  const availableServices = useMemo(() => {
    const offeredServiceIds = new Set(candidateProfessionals.flatMap((professional) => professional.serviceIds));
    return services.filter((service) => service.specialtyId === specialtyId && offeredServiceIds.has(service.id));
  }, [services, candidateProfessionals, specialtyId]);

  return (
    <div>
      <StepHeader
        icon={ClipboardList}
        title="Elige el servicio"
        subtitle="La duración de tu cita depende del servicio que elijas."
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size={26} />
        </div>
      ) : availableServices.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay servicios disponibles"
          description="Todavía no hay servicios configurados para esta especialidad y profesional."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {availableServices.map((service) => (
            <OptionCard
              key={service.id}
              icon={ClipboardList}
              title={service.name}
              description={formatCurrency(service.price)}
              tag={`${service.duration} min`}
              selected={service.id === serviceId}
              onClick={() => onChange(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceStep;
