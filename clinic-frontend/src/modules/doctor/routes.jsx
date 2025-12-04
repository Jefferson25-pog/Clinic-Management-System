import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DoctorDashboard from './pages/DoctorDashboard';
import Appointments from './pages/Appointments';
import ConsultationForm from './pages/ConsultationForm';
import ConsultationHistory from './pages/ConsultationHistory';
import LabRequests from './pages/LabRequests';
import LabResults from './pages/LabResults';

const DoctorRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<DoctorDashboard />} />
      <Route path="appointments" element={<Appointments />} />
      <Route path="consultation/:appointmentId" element={<ConsultationForm />} />
      <Route path="consultation-history" element={<ConsultationHistory />} />
      <Route path="lab-requests" element={<LabRequests />} />
      <Route path="lab-results" element={<LabResults />} />
    </Routes>
  );
};

export default DoctorRoutes;