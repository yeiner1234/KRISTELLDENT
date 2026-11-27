import type { PatientHistoryEntry } from '../../services/reportService';
import type { Patient } from '../../types/Patient';
import { daysBetween } from './period';

// Lógica del reporte "Historia de paciente". Las citas llegan de la RPC
// patient_history (la base decide cuáles puede ver quien consulta).

// Un tratamiento sin próxima sesión se da por abandonado si pasaron más de
// estos días desde su última sesión atendida.
export const TREATMENT_ABANDON_DAYS = 60;

export function formatHistoryNumber(historyNumber: number | null | undefined): string {
  return historyNumber ? `HC-${String(historyNumber).padStart(5, '0')}` : '—';
}

// HIS-HC00245-2026-1014 (fecha de emisión).
export function historyDocumentCode(historyNumber: number | null | undefined, today: string): string {
  const [year, month, day] = today.split('-');
  const number = historyNumber ? `HC${String(historyNumber).padStart(5, '0')}` : 'HC';
  return `HIS-${number}-${year}-${month}${day}`;
}

export function ageFromBirthDate(birthDate: string | null | undefined, today: string): number | null {
  if (!birthDate) return null;
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [year, month, day] = today.split('-').map(Number);
  const hadBirthday = month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (hadBirthday ? 0 : 1);
}

// "2 años y 7 meses como paciente" desde su primera cita.
export function patientSinceLabel(firstDate: string, today: string): string {
  const [fromYear, fromMonth, fromDay] = firstDate.split('-').map(Number);
  const [year, month, day] = today.split('-').map(Number);
  const totalMonths = (year - fromYear) * 12 + (month - fromMonth) - (day < fromDay ? 1 : 0);
  if (totalMonths < 1) return 'Menos de un mes como paciente';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearsText = years === 1 ? '1 año' : `${years} años`;
  const monthsText = months === 1 ? '1 mes' : `${months} meses`;
  if (years === 0) return `${monthsText} como paciente`;
  if (months === 0) return `${yearsText} como paciente`;
  return `${yearsText} y ${monthsText} como paciente`;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Búsqueda del selector: DNI, nombre y apellidos (sin tildes) o N.º de historia.
export function matchesPatientSearch(
  patient: Pick<Patient, 'dni' | 'firstName' | 'lastName' | 'historyNumber'>,
  query: string,
): boolean {
  const text = normalize(query);
  if (!text) return true;
  const historyDigits = text.replace(/^hc-?/, '').replace(/^0+/, '');
  if (/^\d+$/.test(historyDigits) && patient.historyNumber && String(patient.historyNumber).includes(historyDigits)) {
    return true;
  }
  if (/^\d+$/.test(text)) return patient.dni.includes(text);
  const name = normalize(`${patient.lastName} ${patient.firstName}`);
  return text.split(/\s+/).every((word) => name.includes(word));
}

function isUpcoming(entry: PatientHistoryEntry, today: string, nowTime: string): boolean {
  return (
    (entry.status === 'pending' || entry.status === 'confirmed') &&
    (entry.date > today || (entry.date === today && entry.startTime >= nowTime))
  );
}

function byDateAsc(a: PatientHistoryEntry, b: PatientHistoryEntry): number {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

export interface HistorySummary {
  completed: number;
  cancelled: number;
  firstDate: string | null;
  lastAttention: string | null;
  // Sede de su cita más reciente.
  branchName: string | null;
}

export function summarizeHistory(entries: PatientHistoryEntry[]): HistorySummary {
  const sorted = [...entries].sort(byDateAsc);
  const completed = sorted.filter((entry) => entry.status === 'completed');
  return {
    completed: completed.length,
    cancelled: sorted.filter((entry) => entry.status === 'cancelled').length,
    firstDate: sorted[0]?.date ?? null,
    lastAttention: completed[completed.length - 1]?.date ?? null,
    branchName: sorted[sorted.length - 1]?.branchName ?? null,
  };
}

export function findNextAppointment(entries: PatientHistoryEntry[], today: string, nowTime: string): PatientHistoryEntry | null {
  return [...entries].sort(byDateAsc).find((entry) => isUpcoming(entry, today, nowTime)) ?? null;
}

// Citas de la más reciente a la más antigua.
export function sortHistoryDesc(entries: PatientHistoryEntry[]): PatientHistoryEntry[] {
  return [...entries].sort((a, b) => byDateAsc(b, a));
}

export type TreatmentStatus = 'in_treatment' | 'cancelled';

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  in_treatment: 'En tratamiento',
  cancelled: 'Cancelado',
};

export interface Treatment {
  key: string;
  serviceName: string;
  startDate: string;
  completedSessions: number;
  totalSessions: number;
  doctorName: string;
  nextSession: string | null;
  status: TreatmentStatus;
}

// Servicios de más de una sesión. Las sesiones atendidas forman ciclos del
// tamaño del servicio: un ciclo completo ya terminó y no se lista; el ciclo en
// curso se muestra con solo dos estados (pedido de la doctora):
// - En tratamiento: tiene próxima sesión o volvió hace poco.
// - Cancelado: sin próxima sesión, y su última cita se canceló o pasaron más
//   de TREATMENT_ABANDON_DAYS desde la última sesión atendida.
export function buildTreatments(entries: PatientHistoryEntry[], today: string, nowTime: string): Treatment[] {
  const groups = new Map<string, PatientHistoryEntry[]>();
  for (const entry of entries) {
    if (entry.serviceSessions <= 1) continue;
    const key = entry.serviceId ?? entry.serviceName ?? '';
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const treatments: Treatment[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort(byDateAsc);
    const totalSessions = sorted[sorted.length - 1].serviceSessions;
    let cycle: PatientHistoryEntry[] = [];
    let completed = 0;

    for (const entry of sorted) {
      if (entry.status === 'completed') {
        cycle.push(entry);
        completed += 1;
        if (completed >= totalSessions) {
          cycle = [];
          completed = 0;
        }
      } else if (entry.status === 'cancelled' || entry.status === 'in_room' || isUpcoming(entry, today, nowTime)) {
        // Una cancelación antes de la primera sesión no abre un tratamiento.
        if (cycle.length > 0 || entry.status !== 'cancelled') cycle.push(entry);
      }
    }

    const next = cycle.find((entry) => entry.status === 'in_room' || isUpcoming(entry, today, nowTime));
    if (completed === 0 && !next) continue;

    const attended = cycle.filter((entry) => entry.status === 'completed');
    const lastPast = [...cycle].reverse().find((entry) => entry.status === 'completed' || entry.status === 'cancelled');
    const lastAttended = attended[attended.length - 1];
    const abandoned =
      !next &&
      (lastPast?.status === 'cancelled' || !lastAttended || daysBetween(lastAttended.date, today) > TREATMENT_ABANDON_DAYS);
    const latest = cycle[cycle.length - 1];

    treatments.push({
      key,
      serviceName: latest.serviceName ?? '—',
      startDate: cycle[0].date,
      completedSessions: completed,
      totalSessions,
      doctorName: latest.professionalName ?? '—',
      nextSession: next?.date ?? null,
      status: abandoned ? 'cancelled' : 'in_treatment',
    });
  }

  // En tratamiento primero; dentro de cada estado, el más reciente arriba.
  return treatments.sort(
    (a, b) =>
      (a.status === 'in_treatment' ? 0 : 1) - (b.status === 'in_treatment' ? 0 : 1) || b.startDate.localeCompare(a.startDate),
  );
}
