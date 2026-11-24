import { ClipboardList } from 'lucide-react';
import OptionCard from './OptionCard';
import StepHeader from './StepHeader';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useBookableServices } from '../../hooks/useBookingOffer';
import { ANY_PROFESSIONAL } from '../../utils/bookingCandidates';
import { formatCurrency } from '../../utils/format';

interface ServiceStepProps {
  specialtyId: string;
  branchId: string;
  professionalId: string;
  serviceId: string | null;
  onChange: (serviceId: string) => void;
}

// Servicios reservables de la sede elegida (get_bookable_services), con su
// precio y duración en esa sede: de la profesional elegida o, con "cualquier
// profesional", de todas las que atienden esa especialidad ahí.
function ServiceStep({ specialtyId, branchId, professionalId, serviceId, onChange }: ServiceStepProps) {
  const { data: services, isLoading, error } = useBookableServices(
    branchId,
    specialtyId,
    professionalId === ANY_PROFESSIONAL ? null : professionalId,
  );

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
      ) : error ? (
        <EmptyState icon={ClipboardList} title={error} description="Revisa tu conexión y vuelve a intentarlo." />
      ) : services.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay servicios disponibles"
          description="Esta sede no tiene servicios disponibles de esta especialidad con ese profesional. Vuelve atrás y elige otra opción."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
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
