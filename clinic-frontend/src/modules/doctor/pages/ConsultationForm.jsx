// src/modules/doctor/pages/ConsultationForm.jsx
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const ConsultationForm = () => {
  const { id } = useParams(); // appointmentId or consultationId
  const location = useLocation();
  const navigate = useNavigate();
  const { staffDetail } = useAuth();
  
  const [formData, setFormData] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
    prescription: [],
    labTests: [],
    followUpDate: "",
    followUpNotes: ""
  });
  
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedLabTest, setSelectedLabTest] = useState("");

  useEffect(() => {
    // Load patient data from location state or fetch from API
    if (location.state?.patient) {
      setPatient(location.state.patient);
    } else if (location.state?.appointment) {
      const appt = location.state.appointment;
      setPatient({
        id: appt.patient_id,
        name: appt.patient_name,
        age: appt.patient_age,
        gender: appt.patient_gender
      });
    }
    
    fetchMedicines();
    fetchLabTests();
    
    if (id) {
      fetchConsultationData();
    } else {
      setLoading(false);
    }
  }, [id, location.state]);

  const fetchMedicines = async () => {
    try {
      const response = await doctorApi.getMedicinesWithStock();
      setMedicines(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching medicines:", error);
    }
  };

  const fetchLabTests = async () => {
    try {
      const response = await doctorApi.getLabTests();
      setLabTests(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching lab tests:", error);
    }
  };

  const fetchConsultationData = async () => {
    try {
      const response = await doctorApi.getConsultation(id);
      if (response.data) {
        setFormData(response.data);
      }
    } catch (error) {
      console.error("Error fetching consultation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        // Update existing consultation
        await doctorApi.updateConsultation(id, formData);
      } else {
        // Create new consultation
        await doctorApi.createConsultation({
          ...formData,
          patient_id: patient?.id,
          doctor_id: staffDetail?.STAFF_ID
        });
      }
      navigate("/doctor/appointments");
    } catch (error) {
      console.error("Error saving consultation:", error);
    }
  };

  const addMedicine = () => {
    if (selectedMedicine) {
      const medicine = medicines.find(m => m.id === parseInt(selectedMedicine));
      if (medicine) {
        setFormData(prev => ({
          ...prev,
          prescription: [...prev.prescription, {
            medicine_id: medicine.id,
            name: medicine.name,
            dosage: "",
            frequency: "",
            duration: ""
          }]
        }));
        setSelectedMedicine("");
      }
    }
  };

  const addLabTest = () => {
    if (selectedLabTest) {
      const test = labTests.find(t => t.id === parseInt(selectedLabTest));
      if (test) {
        setFormData(prev => ({
          ...prev,
          labTests: [...prev.labTests, {
            test_id: test.id,
            name: test.name,
            instructions: ""
          }]
        }));
        setSelectedLabTest("");
      }
    }
  };

  // Render the consultation form page similar to your design
  return (
    <div>
      {/* Header with back button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-sm me-2"
          >
            <i className="bi bi-arrow-left"></i> Back
          </button>
          <h3 className="mb-0 d-inline">Consultation</h3>
        </div>
      </div>

      {/* Patient info card */}
      {patient && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h5>{patient.name}</h5>
                <div className="text-muted">
                  {patient.age && `${patient.age} years`} • {patient.gender}
                  <br />
                  Patient ID: {patient.id}
                </div>
              </div>
              <div className="col-md-6 text-end">
                <div className="text-muted small">
                  Consultation with: Dr. {staffDetail?.Name}
                  <br />
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consultation form */}
      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Symptoms & Diagnosis */}
          <div className="col-md-6">
            <div className="card mb-3">
              <div className="card-header">Symptoms & Diagnosis</div>
              <div className="card-body">
                <textarea 
                  className="form-control mb-3"
                  placeholder="Enter symptoms..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  rows={4}
                />
                <textarea 
                  className="form-control"
                  placeholder="Enter diagnosis..."
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="col-md-6">
            <div className="card mb-3">
              <div className="card-header">Prescription</div>
              <div className="card-body">
                <div className="input-group mb-3">
                  <select 
                    className="form-select"
                    value={selectedMedicine}
                    onChange={(e) => setSelectedMedicine(e.target.value)}
                  >
                    <option value="">Select Medicine</option>
                    {medicines.map(med => (
                      <option key={med.id} value={med.id}>
                        {med.name} - {med.stock} in stock
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={addMedicine}
                  >
                    Add
                  </button>
                </div>
                
                {/* Medicine list */}
                {formData.prescription.map((med, index) => (
                  <div key={index} className="border p-2 mb-2 rounded">
                    <strong>{med.name}</strong>
                    <div className="row mt-2">
                      <div className="col">
                        <input type="text" className="form-control" placeholder="Dosage" />
                      </div>
                      <div className="col">
                        <input type="text" className="form-control" placeholder="Frequency" />
                      </div>
                      <div className="col">
                        <input type="text" className="form-control" placeholder="Duration" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lab Tests */}
          <div className="col-md-6">
            <div className="card mb-3">
              <div className="card-header">Lab Tests</div>
              <div className="card-body">
                <div className="input-group mb-3">
                  <select 
                    className="form-select"
                    value={selectedLabTest}
                    onChange={(e) => setSelectedLabTest(e.target.value)}
                  >
                    <option value="">Select Lab Test</option>
                    {labTests.map(test => (
                      <option key={test.id} value={test.id}>
                        {test.name} - ₹{test.cost}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={addLabTest}
                  >
                    Add
                  </button>
                </div>
                
                {/* Lab test list */}
                {formData.labTests.map((test, index) => (
                  <div key={index} className="border p-2 mb-2 rounded">
                    <strong>{test.name}</strong>
                    <textarea 
                      className="form-control mt-2"
                      placeholder="Instructions..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes & Follow-up */}
          <div className="col-md-6">
            <div className="card mb-3">
              <div className="card-header">Notes & Follow-up</div>
              <div className="card-body">
                <textarea 
                  className="form-control mb-3"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                />
                <div className="row">
                  <div className="col">
                    <label>Follow-up Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                    />
                  </div>
                </div>
                <textarea 
                  className="form-control mt-3"
                  placeholder="Follow-up notes..."
                  value={formData.followUpNotes}
                  onChange={(e) => setFormData({...formData, followUpNotes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <div>
                <button type="submit" className="btn btn-primary me-2">
                  Save & Close
                </button>
                <button type="button" className="btn btn-success">
                  Save & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ConsultationForm;