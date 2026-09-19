import { ExternalLink, MapPin, Phone } from 'lucide-react';
import AnimatedSection, { RevealItem } from '../common/AnimatedSection';
import SectionTitle from '../common/SectionTitle';
import BranchStatusBadge from '../common/BranchStatusBadge';
import BranchMap from './BranchMap';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useBranches } from '../../hooks/useBranches';

function ContactSection() {
  const { branches, isLoading } = useBranches();

  return (
    <AnimatedSection id="contacto" className="bg-white py-24">
      <div className="mx-auto max-w-[1240px] px-5">
        <SectionTitle
          eyebrow="Contacto"
          title="Dónde estamos"
          subtitle="Encuentra la sede más cercana y reserva tu cita en la sucursal que prefieras."
          align="left"
        />

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Spinner size={28} />
          </div>
        ) : branches.length === 0 ? (
          <div className="mt-10">
            <EmptyState icon={MapPin} title="No hay sedes registradas" description="Aún no se han publicado sedes disponibles." />
          </div>
        ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {branches.map((branch, index) => (
            <RevealItem key={branch.id} index={index} className="min-w-0">
              <div className="overflow-hidden rounded-2xl border border-border bg-white">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <MapPin size={18} />
                      </span>
                      <h3 className="text-lg font-semibold text-brand-900">{branch.name}</h3>
                    </div>
                    <BranchStatusBadge branchId={branch.id} />
                  </div>

                  <p className="mt-3 text-sm text-ink-secondary">{branch.address}</p>
                  {branch.region && <p className="text-sm text-ink-secondary">{branch.region}</p>}

                  {branch.phone && (
                    <a
                      href={`tel:+51${branch.phone.replace(/\s+/g, '')}`}
                      className="mt-2 flex w-fit items-center gap-1.5 text-sm font-medium text-brand-900 hover:text-brand-700"
                    >
                      <Phone size={14} />
                      {branch.phone}
                    </a>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.googleMapsAddress ?? branch.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
                  >
                    Ver en Google Maps
                    <ExternalLink size={14} />
                  </a>
                </div>

                {branch.lat !== null && branch.lng !== null ? (
                  <BranchMap
                    name={branch.name}
                    visibleAddress={`${branch.address}${branch.region ? `, ${branch.region}` : ''}`}
                    lat={branch.lat}
                    lng={branch.lng}
                  />
                ) : (
                  <div className="flex h-[220px] w-full items-center justify-center bg-surface-alt text-sm text-ink-tertiary">
                    Ubicación en el mapa pendiente de configurar
                  </div>
                )}
              </div>
            </RevealItem>
          ))}
        </div>
        )}
      </div>
    </AnimatedSection>
  );
}

export default ContactSection;
