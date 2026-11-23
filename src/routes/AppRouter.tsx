import { BrowserRouter, Routes, Route } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProfessionalLayout from '../layouts/ProfessionalLayout';

import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { PROFESSIONAL_ROLES } from '../services/professionalService';

import HomePage from '../pages/public/HomePage';
import BookingPage from '../pages/public/BookingPage';
import PatientDataPage from '../pages/public/PatientDataPage';
import ConfirmBookingPage from '../pages/public/ConfirmBookingPage';
import BookingSuccessPage from '../pages/public/BookingSuccessPage';
import ConsultAppointmentsPage from '../pages/public/ConsultAppointmentsPage';
import MyAppointmentsPage from '../pages/public/MyAppointmentsPage';

import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from '../pages/auth/UpdatePasswordPage';

import AdminDashboardPage from '../pages/admin/DashboardPage';
import AdminBranchesPage from '../pages/admin/BranchesPage';
import AdminTeamPage from '../pages/admin/TeamPage';
import AdminAgendaPage from '../pages/admin/AgendaPage';
import AdminAppointmentsPage from '../pages/admin/AppointmentsPage';
import AdminPatientsPage from '../pages/admin/PatientsPage';
import AdminProfessionalsPage from '../pages/admin/ProfessionalsPage';
import AdminSpecialtiesPage from '../pages/admin/SpecialtiesPage';
import AdminServicesPage from '../pages/admin/ServicesPage';
import AdminOfferOverviewPage from '../pages/admin/OfferOverviewPage';
import AdminSettingsPage from '../pages/admin/SettingsPage';

import ProfessionalHomePage from '../pages/professional/HomePage';
import ProfessionalMyAgendaPage from '../pages/professional/MyAgendaPage';
import ProfessionalMyPatientsPage from '../pages/professional/MyPatientsPage';
import ProfessionalMyAppointmentsPage from '../pages/professional/MyAppointmentsPage';

import AgendaReportPage from '../pages/reports/AgendaReportPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route path="/reservar" element={<BookingPage />} />
          <Route path="/reservar/datos" element={<PatientDataPage />} />
          <Route path="/reservar/confirmar" element={<ConfirmBookingPage />} />
          <Route path="/reservar/exito" element={<BookingSuccessPage />} />

          <Route path="/consultar-citas" element={<ConsultAppointmentsPage />} />
          <Route path="/mis-citas" element={<MyAppointmentsPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/recuperar" element={<ForgotPasswordPage />} />
          <Route path="/actualizar-contrasena" element={<UpdatePasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={['admin_global', 'admin_sede']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="sedes" element={<AdminBranchesPage />} />
              <Route path="equipo" element={<AdminTeamPage />} />
              <Route path="agenda" element={<AdminAgendaPage />} />
              <Route path="citas" element={<AdminAppointmentsPage />} />
              <Route path="pacientes" element={<AdminPatientsPage />} />
              <Route path="profesionales" element={<AdminProfessionalsPage />} />
              <Route path="especialidades" element={<AdminSpecialtiesPage />} />
              <Route path="servicios" element={<AdminServicesPage />} />
              {/* Supervisión de la oferta de todas las sedes: solo admin_global. */}
              <Route element={<RoleRoute allowedRoles={['admin_global']} />}>
                <Route path="oferta" element={<AdminOfferOverviewPage />} />
              </Route>
              <Route path="configuracion" element={<AdminSettingsPage />} />
              <Route path="reportes/agenda" element={<AgendaReportPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={['especialista', 'odontologa_general', 'tecnica']} />}>
            <Route path="/profesional" element={<ProfessionalLayout />}>
              <Route index element={<ProfessionalHomePage />} />
              {/* La técnica solo tiene "Citas de hoy": si entra aquí, vuelve a /profesional. */}
              <Route element={<RoleRoute allowedRoles={PROFESSIONAL_ROLES} />}>
                <Route path="agenda" element={<ProfessionalMyAgendaPage />} />
                <Route path="pacientes" element={<ProfessionalMyPatientsPage />} />
                <Route path="citas" element={<ProfessionalMyAppointmentsPage />} />
              </Route>
              {/* La agenda imprimible es solo de la técnica: la especialista no la ve. */}
              <Route element={<RoleRoute allowedRoles={['tecnica']} />}>
                <Route path="reportes/agenda" element={<AgendaReportPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
