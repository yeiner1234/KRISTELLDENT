import { BrowserRouter, Routes, Route } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProfessionalLayout from '../layouts/ProfessionalLayout';

import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

import HomePage from '../pages/public/HomePage';
import BookingPage from '../pages/public/BookingPage';
import PatientDataPage from '../pages/public/PatientDataPage';
import VerifyEmailPage from '../pages/public/VerifyEmailPage';
import ConfirmBookingPage from '../pages/public/ConfirmBookingPage';
import BookingSuccessPage from '../pages/public/BookingSuccessPage';
import ConsultAppointmentsPage from '../pages/public/ConsultAppointmentsPage';
import VerifyAppointmentPage from '../pages/public/VerifyAppointmentPage';
import MyAppointmentsPage from '../pages/public/MyAppointmentsPage';

import LoginPage from '../pages/auth/LoginPage';

import AdminDashboardPage from '../pages/admin/DashboardPage';
import AdminAgendaPage from '../pages/admin/AgendaPage';
import AdminAppointmentsPage from '../pages/admin/AppointmentsPage';
import AdminPatientsPage from '../pages/admin/PatientsPage';
import AdminProfessionalsPage from '../pages/admin/ProfessionalsPage';
import AdminSpecialtiesPage from '../pages/admin/SpecialtiesPage';
import AdminServicesPage from '../pages/admin/ServicesPage';
import AdminSettingsPage from '../pages/admin/SettingsPage';

import ProfessionalDashboardPage from '../pages/professional/DashboardPage';
import ProfessionalMyAgendaPage from '../pages/professional/MyAgendaPage';
import ProfessionalMyPatientsPage from '../pages/professional/MyPatientsPage';
import ProfessionalMyAppointmentsPage from '../pages/professional/MyAppointmentsPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route path="/reservar" element={<BookingPage />} />
          <Route path="/reservar/datos" element={<PatientDataPage />} />
          <Route path="/reservar/verificar" element={<VerifyEmailPage />} />
          <Route path="/reservar/confirmar" element={<ConfirmBookingPage />} />
          <Route path="/reservar/exito" element={<BookingSuccessPage />} />

          <Route path="/consultar-citas" element={<ConsultAppointmentsPage />} />
          <Route path="/consultar-citas/verificar" element={<VerifyAppointmentPage />} />
          <Route path="/mis-citas" element={<MyAppointmentsPage />} />

          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="agenda" element={<AdminAgendaPage />} />
              <Route path="citas" element={<AdminAppointmentsPage />} />
              <Route path="pacientes" element={<AdminPatientsPage />} />
              <Route path="profesionales" element={<AdminProfessionalsPage />} />
              <Route path="especialidades" element={<AdminSpecialtiesPage />} />
              <Route path="servicios" element={<AdminServicesPage />} />
              <Route path="configuracion" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={['PROFESSIONAL']} />}>
            <Route path="/profesional" element={<ProfessionalLayout />}>
              <Route index element={<ProfessionalDashboardPage />} />
              <Route path="agenda" element={<ProfessionalMyAgendaPage />} />
              <Route path="pacientes" element={<ProfessionalMyPatientsPage />} />
              <Route path="citas" element={<ProfessionalMyAppointmentsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
