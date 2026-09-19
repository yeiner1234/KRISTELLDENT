import { useState, type FormEvent } from 'react';
import { Building2, Clock, Pencil, Phone, Plus } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import { useAdminBranches } from '../../hooks/useAdminBranches';
import {
  createBranch,
  setBranchActive,
  updateBranch,
  type BranchInput,
  type BranchRecord,
} from '../../services/adminBranchService';
import {
  getBranchScheduleForAdmin,
  setBranchSchedule,
  type BranchScheduleEntry,
} from '../../services/branchScheduleService';

const emptyForm: BranchInput = {
  name: '',
  address: '',
  region: '',
  googleMapsAddress: '',
  phone: '',
  lat: null,
  lng: null,
};

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface DayFormState {
  open: boolean;
  openTime: string;
  closeTime: string;
}

function emptyScheduleForm(): DayFormState[] {
  return DAY_LABELS.map(() => ({ open: false, openTime: '09:00', closeTime: '18:00' }));
}

function BranchesPage() {
  const { branches, isLoading, error, refetch } = useAdminBranches();
  const [editing, setEditing] = useState<BranchRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<BranchInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [scheduleBranch, setScheduleBranch] = useState<BranchRecord | null>(null);
  const [scheduleForm, setScheduleForm] = useState<DayFormState[]>(emptyScheduleForm());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: BranchRecord) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      address: branch.address,
      region: branch.region ?? '',
      googleMapsAddress: branch.googleMapsAddress ?? '',
      phone: branch.phone ?? '',
      lat: branch.lat,
      lng: branch.lng,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const input: BranchInput = {
      name: form.name.trim(),
      address: form.address.trim(),
      region: form.region?.trim() ? form.region.trim() : null,
      googleMapsAddress: form.googleMapsAddress?.trim() ? form.googleMapsAddress.trim() : null,
      phone: form.phone?.trim() ? form.phone.trim() : null,
      lat: form.lat,
      lng: form.lng,
    };

    try {
      if (editing) {
        await updateBranch(editing.id, input);
      } else {
        await createBranch(input);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la sede.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (branch: BranchRecord) => {
    setTogglingId(branch.id);
    try {
      await setBranchActive(branch.id, !branch.active);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const openScheduleModal = (branch: BranchRecord) => {
    setScheduleBranch(branch);
    setScheduleError(null);
    setIsLoadingSchedule(true);
    getBranchScheduleForAdmin(branch.id)
      .then((entries) => {
        const next = emptyScheduleForm();
        for (const entry of entries) {
          next[entry.dayOfWeek] = { open: true, openTime: entry.openTime, closeTime: entry.closeTime };
        }
        setScheduleForm(next);
      })
      .catch((err) => setScheduleError(err instanceof Error ? err.message : 'No se pudo cargar el horario.'))
      .finally(() => setIsLoadingSchedule(false));
  };

  const handleSaveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleBranch) return;
    setScheduleError(null);
    setIsSavingSchedule(true);

    const entries: BranchScheduleEntry[] = scheduleForm
      .map((day, dayOfWeek) => ({ day, dayOfWeek }))
      .filter(({ day }) => day.open)
      .map(({ day, dayOfWeek }) => ({ dayOfWeek, openTime: day.openTime, closeTime: day.closeTime }));

    try {
      await setBranchSchedule(scheduleBranch.id, entries);
      setScheduleBranch(null);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'No se pudo guardar el horario.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Sedes" align="left" />
        <Button type="button" variant="admin-solid" size="sm" icon={<Plus size={16} />} onClick={openCreateModal}>
          Nueva sede
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState icon={Building2} title="No se pudieron cargar las sedes" description={error} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay sedes registradas"
          description="Crea la primera sede para empezar a asignar personal y operar desde el panel."
        />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-col gap-3.5 rounded-[14px] border border-adm-line-card bg-white p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-adm-accent-soft text-adm-accent-deep">
                    <Building2 size={20} />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-[15.5px] font-semibold text-adm-ink-700">{branch.name}</p>
                    <p className="truncate text-[13px] text-adm-ink-400">{branch.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {branch.phone && (
                  <span className="flex items-center gap-1.5 text-[13px] text-adm-ink-400">
                    <Phone size={14} strokeWidth={1.75} />
                    {branch.phone}
                  </span>
                )}
                <StatusBadge
                  label={branch.active ? 'Activa' : 'Inactiva'}
                  tone={branch.active ? 'adm-active' : 'adm-inactive'}
                />
              </div>

              <div className="flex gap-2 border-t border-adm-line-div pt-3.5">
                <Button
                  type="button"
                  variant="admin-outline"
                  size="xs"
                  className="flex-1"
                  icon={<Pencil size={14} />}
                  onClick={() => openEditModal(branch)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="admin-outline"
                  size="xs"
                  className="flex-1"
                  icon={<Clock size={14} />}
                  onClick={() => openScheduleModal(branch)}
                >
                  Horario
                </Button>
              </div>
              <Button
                type="button"
                variant={branch.active ? 'admin-danger' : 'admin-outline'}
                size="xs"
                disabled={togglingId === branch.id}
                onClick={() => handleToggleActive(branch)}
              >
                {togglingId === branch.id ? 'Guardando…' : branch.active ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar sede' : 'Nueva sede'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {formError && (
            <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
              {formError}
            </p>
          )}

          <Input
            label="Nombre de la sede"
            name="name"
            variant="admin"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Input
            label="Dirección"
            name="address"
            variant="admin"
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            required
          />
          <Input
            label="Región / ciudad (opcional)"
            name="region"
            variant="admin"
            value={form.region ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
          />
          <Input
            label="Teléfono (opcional)"
            name="phone"
            variant="admin"
            value={form.phone ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            label="Dirección para Google Maps (opcional)"
            name="googleMapsAddress"
            variant="admin"
            value={form.googleMapsAddress ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, googleMapsAddress: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitud (opcional)"
              name="lat"
              type="number"
              step="any"
              variant="admin"
              value={form.lat ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, lat: event.target.value === '' ? null : Number(event.target.value) }))
              }
            />
            <Input
              label="Longitud (opcional)"
              name="lng"
              type="number"
              step="any"
              variant="admin"
              value={form.lng ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, lng: event.target.value === '' ? null : Number(event.target.value) }))
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="admin-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="admin-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={scheduleBranch !== null}
        onClose={() => setScheduleBranch(null)}
        title={scheduleBranch ? `Horario — ${scheduleBranch.name}` : 'Horario'}
      >
        {isLoadingSchedule ? (
          <div className="flex justify-center py-8">
            <Spinner size={26} />
          </div>
        ) : (
          <form onSubmit={handleSaveSchedule} className="flex flex-col gap-4 py-2">
            {scheduleError && (
              <p className="rounded-[10px] border border-adm-status-cancelled-border bg-adm-status-cancelled-bg px-3.5 py-2.5 text-sm font-medium text-adm-danger-text">
                {scheduleError}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {DAY_LABELS.map((label, index) => {
                const day = scheduleForm[index];
                return (
                  <div key={label} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-adm-line-field p-2.5">
                    <label className="flex w-[110px] items-center gap-2 text-sm font-medium text-adm-ink-700">
                      <input
                        type="checkbox"
                        className="h-[15px] w-[15px] accent-brand-600"
                        checked={day.open}
                        onChange={() =>
                          setScheduleForm((current) =>
                            current.map((item, i) => (i === index ? { ...item, open: !item.open } : item)),
                          )
                        }
                      />
                      {label}
                    </label>
                    {day.open && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(event) =>
                            setScheduleForm((current) =>
                              current.map((item, i) => (i === index ? { ...item, openTime: event.target.value } : item)),
                            )
                          }
                          className="h-9 rounded-[8px] border border-adm-line-field bg-adm-surface-input px-2 text-sm text-adm-ink-700 outline-none focus:border-brand-600"
                        />
                        <span className="text-sm text-adm-ink-400">a</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(event) =>
                            setScheduleForm((current) =>
                              current.map((item, i) => (i === index ? { ...item, closeTime: event.target.value } : item)),
                            )
                          }
                          className="h-9 rounded-[8px] border border-adm-line-field bg-adm-surface-input px-2 text-sm text-adm-ink-700 outline-none focus:border-brand-600"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="admin-outline" onClick={() => setScheduleBranch(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="admin-solid" disabled={isSavingSchedule}>
                {isSavingSchedule ? 'Guardando…' : 'Guardar horario'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default BranchesPage;
