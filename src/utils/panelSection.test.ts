import { describe, expect, it } from 'vitest';
import { getPanelSectionTitle } from './panelSection';

describe('getPanelSectionTitle', () => {
  it('nombra las secciones del panel admin', () => {
    expect(getPanelSectionTitle('/admin', 'admin_global')).toBe('Dashboard');
    expect(getPanelSectionTitle('/admin/citas', 'admin_sede')).toBe('Citas');
    expect(getPanelSectionTitle('/admin/servicios', 'admin_sede')).toBe('Servicios de la sede');
    expect(getPanelSectionTitle('/admin/reportes/agenda', 'admin_global')).toBe('Agenda de citas');
    expect(getPanelSectionTitle('/admin/reportes/citas', 'admin_sede')).toBe('Reporte de citas');
    expect(getPanelSectionTitle('/admin/reportes/ingresos', 'admin_global')).toBe('Reporte de ingresos');
  });

  it('ignora la barra final', () => {
    expect(getPanelSectionTitle('/admin/sedes/', 'admin_global')).toBe('Sedes');
  });

  it('el inicio del panel profesional depende del rol', () => {
    expect(getPanelSectionTitle('/profesional', 'especialista')).toBe('Dashboard');
    expect(getPanelSectionTitle('/profesional', 'tecnica')).toBe('Citas');
  });

  it('nombra las secciones de la profesional y de la técnica', () => {
    expect(getPanelSectionTitle('/profesional/agenda', 'odontologa_general')).toBe('Mi agenda');
    expect(getPanelSectionTitle('/profesional/agenda-sede', 'tecnica')).toBe('Agenda');
    expect(getPanelSectionTitle('/profesional/pacientes-sede', 'tecnica')).toBe('Pacientes');
  });

  it('nombra los imprimibles del Sprint 4', () => {
    expect(getPanelSectionTitle('/profesional/reportes/mis-citas', 'especialista')).toBe('Reporte de mis citas');
    expect(getPanelSectionTitle('/profesional/reportes/mis-pacientes', 'odontologa_general')).toBe('Reporte de mis pacientes');
    expect(getPanelSectionTitle('/profesional/reportes/historia', 'tecnica')).toBe('Historia de paciente');
  });

  it('una ruta desconocida no tiene título', () => {
    expect(getPanelSectionTitle('/admin/otra', 'admin_global')).toBeNull();
    expect(getPanelSectionTitle('/admin', undefined)).toBe('Dashboard');
  });
});
