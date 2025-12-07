// src/modules/reception/components/TokenGenerator.jsx
import React, { useState, useEffect } from "react";
import { receptionApi } from "../services/receptionApi";

const TokenGenerator = () => {
  const [todayToken, setTodayToken] = useState(1);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayData();
    
    // Refresh every minute
    const interval = setInterval(fetchTodayData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const response = await receptionApi.getTodayAppointments();
      const appointments = response.data || [];
      
      const todayApps = appointments.filter(app => app.Date === today);
      setTodayAppointments(todayApps.length);
      setTodayToken(todayApps.length + 1);
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateTokenNumber = () => {
    return `TOK-${todayToken.toString().padStart(4, '0')}`;
  };

  const generateAppointmentId = () => {
    return `APID-${todayToken.toString().padStart(4, '0')}`;
  };

  const getNextAvailableSlot = () => {
    const now = new Date();
    const nextSlot = new Date(now);
    
    // Add 30 minutes for next available slot
    nextSlot.setMinutes(nextSlot.getMinutes() + 30);
    
    // Round to nearest 30 minutes
    const roundedMinutes = Math.ceil(nextSlot.getMinutes() / 30) * 30;
    nextSlot.setMinutes(roundedMinutes);
    
    return nextSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card border-primary">
      <div className="card-body p-3">
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-3">
            <div className="avatar-lg bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center">
              <i className="bi bi-ticket-perforated fs-2 text-primary"></i>
            </div>
          </div>
          <div className="flex-grow-1">
            <h5 className="mb-1">Token System</h5>
            {loading ? (
              <div className="placeholder-glow">
                <span className="placeholder col-8"></span>
              </div>
            ) : (
              <>
                <div className="d-flex align-items-baseline mb-2">
                  <span className="fs-3 fw-bold text-primary me-2">
                    {generateTokenNumber()}
                  </span>
                  <small className="text-muted">
                    Next available
                  </small>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <small className="text-muted d-block">Today's Appointments</small>
                    <span className="fw-bold">{todayAppointments}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Next Slot</small>
                    <span className="fw-bold">{getNextAvailableSlot()}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Appointment ID: {generateAppointmentId()}
                  </small>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card-footer bg-transparent border-0 py-2">
        <button 
          className="btn btn-sm btn-outline-primary w-100"
          onClick={fetchTodayData}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm me-1"></span>
          ) : (
            <i className="bi bi-arrow-clockwise me-1"></i>
          )}
          Refresh Token Info
        </button>
      </div>
    </div>
  );
};

export default TokenGenerator;