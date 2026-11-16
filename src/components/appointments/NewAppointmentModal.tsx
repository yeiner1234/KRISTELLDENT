import { useMemo, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import AppointmentCodeBox from '../common/AppointmentCodeBox';
import AdminSlotPicker from './AdminSlotPicker';
import { createPublicAppointment } from '../../services/appointmentService';
import { isValidDni, isValidEmail, isValidPhone } from '../../utils/validation';
import type { Branch } from '../../types/Branch';
import type { Professional } from '../../types/Professional';
import type { Service } from '../../types/Service';
import type { Patient } from '../../types/Patient';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  branches: Branch[];
  professionals: Professional[];
  services: Service[];
  patients: Patient[];
}

interface PatientFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const emptyPatientFields: PatientFields = { firstName: '', lastName: '', phone: '', email: '' };

function NewAppointmentModal({
  isOpen,
  onClose,
  onCreated,
  branches,
  professionals,
  services,
  patients,
}: NewAppointmentModalProps) {
  const [branchId, setBranchId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dni, setDni] = useState('');
  const [matchedPatient, setMatchedPatient] = useState<Patient | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [patientFields, setPatientFields] = useState<PatientFields>(emptyPatientFields);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const activeBranches = useMemo(() => branches.filter((branch) => branch.active), [branches]);
  const branchProfessionals = useMemo(
    () => professionals.filter((professional) => professional.active && professional.branchIds.includes(branchId)),
    [professionals, branchId],
  );
  const professional = professionals.find((item) => item.id === professionalId);
  const professionalServices = useMemo(
    () => services.filter((service) => service.active && professional?.serviceIds.includes(service.id)),
    [services, professional],
  );

  // El servidor no sobrescribe los datos de un DNI ya registrado (solo
  // completa los vacíos): esos campos se muestran bloqueados.
  const lockedFields = {
    firstName: (matchedPatient?.firstName.trim().length ?? 0) >= 2,
    lastName: (matchedPatient?.lastName.trim().length ?? 0) >= 2,
    phone: matchedPatient ? isValidPhone(matchedPatient.phone ?? '') : false,
    email: matchedPatient ? isValidEmail(matchedPatient.email ?? '') : false,
  };
  const hasLockedFields = Object.values(lockedFields).some(Boolean);

  const reset = () => {
    setBranchId('');
    setProfessionalId('');
    setServiceId('');
    setDni('');
    setMatchedPatient(null);
    setSearchAttempted(false);
    setPatientFields(emptyPatientFields);
    setDate(null);
    setTime(null);
    setReason('');
    setError(null);
    setCreatedCode(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSearchPatient = () => {
    setSearchAttempted(true);
    const found = patients.find((patient) => patient.dni === dni.trim()) ?? null;
    setMatchedPatient(found);
    if (found) {
      setPatientFields({
        firstName: found.firstName,
        lastName: found.lastName,
        phone: found.phone ?? '',
        email: found.email ?? '',
      });
    } else {
      setPatientFields(emptyPatientFields);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!branchId || !professionalId || !serviceId || !date || !time) {
      setError('Completa sede, profesional, servicio y horario.');
      return;
    }

    if (!isValidDni(dni)) {
      setError('El DNI debe tener 8 dígitos.');
      return;
    }

    if (patientFields.firstName.trim().length < 2 || patientFields.lastName.trim().length < 2) {
      setError('Nombres y apellidos deben tener al menos 2 caracteres.');
      return;
    }

    if (!isValidPhone(patientFields.phone)) {
      setError('El teléfono debe tener 9 dígitos.');
      return;
    }

    if (!isValidEmail(patientFields.email)) {
      setError('Ingresa un correo válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      // La hora de fin la calcula el servidor con la duración del servicio.
      const appointment = await createPublicAppointment({
        dni: dni.trim(),
        firstName: patientFields.firstName.trim(),
        lastName: patientFields.lastName.trim(),
        email: patientFields.email.trim(),
        phone: patientFields.phone.trim(),
        professionalId,
        branchId,
        serviceId,
        date,
        startTime: time,
        reason: reason.trim(),
      });
      setCreatedCode(appointment.code);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nueva cita"
      maxWidth="max-w-[640px]"
      footer={
        createdCode ? (
          <Button type="button" variant="admin-solid" onClick={handleClose}>
            Listo
          </Button>
        ) : (
          <>
            <Button type="button" variant="admin-outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" form="nueva-cita-form" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Crear cita'}
            </Button>
          </>
        )
      }
    >
      {createdCode ? (
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm font-medium text-adm-ink-700">Cita creada. Entrega este código al paciente:</p>
          <AppointmentCodeBox
            code={createdCode}
            label="Código de la cita"
            variant="admin"
            hint="Con su DNI y este código puede reprogramar o cancelar su cita."
          />
        </div>
      ) : (
        <form id="nueva-cita-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {error && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Sede"
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setProfessionalId('');
                setServiceId('');
                setDate(null);
                setTime(null);
              }}
              options={[{ value: '', label: 'Selecciona una sede' }, ...activeBranches.map((b) => ({ value: b.id, label: b.name }))]}
            />
            <Select
              label="Profesional"
              value={professionalId}
              onChange={(event) => {
                setProfessionalId(event.target.value);
                setServiceId('');
                setDate(null);
                setTime(null);
              }}
              options={[
                { value: '', label: branchId ? 'Selecciona un profesional' : 'Elige una sede primero' },
                ...branchProfessionals.map((p) => ({ value: p.id, label: p.fullName })),
              ]}
            />
          </div>

          <Select
            label="Servicio"
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              setDate(null);
              setTime(null);
            }}
            options={[
              { value: '', label: professionalId ? 'Selecciona un servicio' : 'Elige un profesional primero' },
              ...professionalServices.map((s) => ({ value: s.id, label: `${s.name} (${s.duration} min)` })),
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-adm-ink-700">Paciente</span>
            <div className="flex gap-2">
              <Input
                label="DNI"
                name="dni"
                variant="admin"
                inputMode="numeric"
                maxLength={8}
                value={dni}
                onChange={(event) => {
                  setDni(event.target.value);
                  setSearchAttempted(false);
                  // Los datos del paciente anterior no deben quedar en el nuevo DNI.
                  if (matchedPatient) {
                    setMatchedPatient(null);
                    setPatientFields(emptyPatientFields);
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="admin-outline" icon={<Search size={14} />} onClick={handleSearchPatient} className="mt-[22px] h-[42px]">
                Buscar
              </Button>
            </div>
            {searchAttempted && (
              <p className="text-xs text-adm-ink-400">
                {matchedPatient ? 'Paciente encontrado — datos precargados.' : 'No existe ese paciente aún, se registrará como nuevo.'}
              </p>
            )}
            {hasLockedFields && (
              <p className="text-xs text-adm-ink-400">
                Los datos ya registrados del paciente no se cambian al crear una cita; solo se completan los vacíos.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="firstName"
              variant="admin"
              value={patientFields.firstName}
              readOnly={lockedFields.firstName}
              onChange={(event) => setPatientFields((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
            <Input
              label="Apellidos"
              name="lastName"
              variant="admin"
              value={patientFields.lastName}
              readOnly={lockedFields.lastName}
              onChange={(event) => setPatientFields((current) => ({ ...current, lastName: event.target.value }))}
              required
            />
            <Input
              label="Teléfono"
              name="phone"
              variant="admin"
              inputMode="numeric"
              maxLength={9}
              value={patientFields.phone}
              readOnly={lockedFields.phone}
              onChange={(event) => setPatientFields((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <Input
              label="Correo"
              name="email"
              type="email"
              variant="admin"
              value={patientFields.email}
              readOnly={lockedFields.email}
              onChange={(event) => setPatientFields((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>

          {branchId && professionalId && serviceId && (
            <AdminSlotPicker
              professionalId={professionalId}
              branchId={branchId}
              serviceId={serviceId}
              date={date}
              time={time}
              onSelectDate={(value) => {
                setDate(value);
                setTime(null);
              }}
              onSelectTime={setTime}
            />
          )}

          <Input
            label="Motivo (opcional)"
            name="reason"
            variant="admin"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </form>
      )}
    </Modal>
  );
}

export default NewAppointmentModal;
