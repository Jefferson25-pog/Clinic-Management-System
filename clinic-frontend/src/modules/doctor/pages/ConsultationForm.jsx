// src/modules/doctor/pages/ConsultationForm.jsx - COMPLETE VERSION WITH VALIDATIONS
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const ConsultationForm = () => {
  const { id } = useParams();
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
  const [medicalInfo, setMedicalInfo] = useState({
    past_medical_history: "",
    allergies: "",
    chronic_conditions: "",
    current_medications: "",
    family_history: "",
    social_history: "",
    surgical_history: "",
    height: "",
    weight: "",
    blood_pressure: "",
    pulse: "",
    temperature: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    additional_notes: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [selectedLabTest, setSelectedLabTest] = useState("");
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false);
  const [vitalsOnly, setVitalsOnly] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
    prescription: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initializeConsultation = async () => {
      try {
        setLoading(true);
        setInitializationError(null);
        
        if (location.state?.appointment) {
          const appt = location.state.appointment;
          
          const patientData = {
            id: appt.patient_id || appt.PAT_ID,
            name: appt.patient_name || appt.PAT_ID?.Patient_Name || "Patient",
            age: appt.patient_age,
            gender: appt.patient_gender,
            phone: appt.patient_phone
          };
          setPatient(patientData);
          
          // Try to get existing consultation first
          let consultation = null;
          
          // Try by appointment ID
          if (appt.APPOINTMENT_ID || appt.id) {
            try {
                const response = await doctorApi.getConsultationByToken(appt.TOKEN_NO || appt.APPOINTMENT_ID);
                if (response.data.exists) {
                consultation = response.data.consultation;
                setFormData(prev => ({
                  ...prev,
                  ...consultation
                }));
              }
            } catch (error) {
              console.log("No consultation found by appointment ID");
            }
          }
          
          // If no consultation found, try by token
          if (!consultation && appt.TOKEN_NO) {
            try {
              const response = await doctorApi.getConsultationByToken(appt.TOKEN_NO);
              if (response.data.exists) {
                consultation = response.data.consultation;
                setFormData(prev => ({
                  ...prev,
                  ...consultation
                }));
              }
            } catch (error) {
              console.log("No consultation found by token");
            }
          }
          
          // If still no consultation, create a new one
          if (!consultation) {
            try {
              const response = await doctorApi.createConsultationFromAppointment({
                appointment_id: appt.APPOINTMENT_ID || appt.id,
                token_no: appt.TOKEN_NO
              });
              
              if (response.data.consultation) {
                consultation = response.data.consultation;
                setFormData(prev => ({
                  ...prev,
                  ...consultation
                }));
              }
            } catch (error) {
              console.log("Could not create consultation automatically:", error);
              // Continue without consultation - doctor can create it manually
            }
          }
          
          // Fetch patient medical info
          if (patientData.id) {
            await fetchMedicalInfo(patientData.id);
          }
        } else {
          setInitializationError("No appointment selected. Please go back and select an appointment.");
        }
        
        // Fetch medicines and lab tests
        await fetchMedicines();
        await fetchLabTests();
        
      } catch (error) {
        console.error("Initialize error:", error);
        setInitializationError(`Failed to initialize: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    initializeConsultation();
  }, [id, location.state, navigate, staffDetail]);

  // ============================
  // VALIDATION FUNCTIONS (from serializer)
  // ============================

  const validateSymptoms = (symptoms) => {
    const errors = [];
    const cleanedValue = symptoms.trim();
    
    if (cleanedValue.length < 10) {
      errors.push("Symptoms description must be at least 10 characters long");
    }
    
    if (!containsMeaningfulText(cleanedValue)) {
      errors.push("Symptoms must contain descriptive text with proper words, not just numbers or symbols");
    }
    
    if (hasExcessiveNumbers(cleanedValue, 0.3)) {
      errors.push("Symptoms should be descriptive text, not predominantly numbers");
    }
    
    return errors;
  };

  const validateDiagnosis = (diagnosis) => {
    const errors = [];
    const cleanedValue = diagnosis.trim();
    
    if (cleanedValue.length < 5) {
      errors.push("Diagnosis must be at least 5 characters long");
    }
    
    if (!containsMeaningfulText(cleanedValue)) {
      errors.push("Diagnosis must contain descriptive medical terms, not just numbers or symbols");
    }
    
    if (hasExcessiveNumbers(cleanedValue, 0.2)) {
      errors.push("Diagnosis should be medical terminology, not predominantly numbers");
    }
    
    return errors;
  };

  const validateNotes = (notes) => {
    const errors = [];
    if (notes && notes.trim()) {
      if (!containsMeaningfulText(notes.trim())) {
        errors.push("Description should contain meaningful text if provided");
      }
    }
    return errors;
  };

  const validatePrescription = (prescription) => {
    const errors = [];
    
    prescription.forEach((med, index) => {
      const medErrors = {};
      
      // Validate Dosage
      if (!med.dosage || !med.dosage.trim()) {
        medErrors.dosage = "Dosage is required";
      } else if (!/\d/.test(med.dosage)) {
        medErrors.dosage = "Dosage should include numeric values (e.g., 500mg, 10ml)";
      }
      
      // Validate Duration
      if (!med.duration || !med.duration.trim()) {
        medErrors.duration = "Duration is required";
      } else {
        if (!/\d/.test(med.duration)) {
          medErrors.duration = "Duration should include numeric values (e.g., 7 days, 2 weeks)";
        }
        const lowerDuration = med.duration.toLowerCase();
        if (!/(day|week|month|hour|dose)/.test(lowerDuration)) {
          medErrors.duration = "Duration should include time unit (e.g., days, weeks, months, doses)";
        }
      }
      
      // Validate Frequency (from dropdown, should have value)
      if (!med.frequency || !med.frequency.trim()) {
        medErrors.frequency = "Frequency is required";
      }
      
      if (Object.keys(medErrors).length > 0) {
        errors[index] = medErrors;
      }
    });
    
    return errors;
  };

  // Helper validation functions
  const containsMeaningfulText = (text) => {
    const words = text.match(/[a-zA-Z]+/g) || [];
    const meaningfulWords = words.filter(word => word.length >= 3);
    return meaningfulWords.length >= 2;
  };

  const hasExcessiveNumbers = (text, threshold = 0.3) => {
    const totalChars = text.length;
    if (totalChars === 0) return false;
    
    const numCount = (text.match(/\d/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    
    if (letterCount < 5) return true;
    
    const alphanumericCount = numCount + letterCount;
    if (alphanumericCount > 0) {
      return (numCount / alphanumericCount) > threshold;
    }
    
    return false;
  };

  const validateForm = () => {
    const errors = {
      symptoms: validateSymptoms(formData.symptoms),
      diagnosis: validateDiagnosis(formData.diagnosis),
      notes: validateNotes(formData.notes),
      prescription: validatePrescription(formData.prescription)
    };
    
    setValidationErrors({
      symptoms: errors.symptoms.join(" • "),
      diagnosis: errors.diagnosis.join(" • "),
      notes: errors.notes.join(" • "),
      prescription: errors.prescription
    });
    
    const hasErrors = 
      errors.symptoms.length > 0 ||
      errors.diagnosis.length > 0 ||
      errors.notes.length > 0 ||
      errors.prescription.length > 0;
    
    return !hasErrors;
  };

  // ============================
  // API FUNCTIONS
  // ============================

  const fetchMedicalInfo = async (patientId) => {
    try {
      const response = await doctorApi.getPatientMedicalInfo(patientId);
      
      if (response.data) {
        if (response.data.exists === false) {
          console.log("No existing medical info for patient");
        } else {
          setMedicalInfo(prev => ({
            ...prev,
            ...response.data
          }));
        }
      }
    } catch (error) {
      console.warn("Error fetching medical info:", error.message);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await doctorApi.getMedicinesWithStock();
      
      if (response?.data && Array.isArray(response.data)) {
        setMedicines(response.data);
      } else {
        setMedicines([]);
      }
    } catch (error) {
      setMedicines([]);
    }
  };

  const fetchLabTests = async () => {
    try {
      const response = await doctorApi.getLabTests();
      
      if (response?.data && Array.isArray(response.data)) {
        const processedTests = response.data.map(test => {
          return {
            id: test.LAB_TEST_ID || test.id || test.lab_test_id,
            name: test.Lab_Test_Name || test.name || test.lab_test_name || "Unknown Test",
            cost: test.Lab_Test_Cost || test.cost || test.lab_test_cost || 0,
            description: test.Description || test.description || ''
          };
        });
        
        setLabTests(processedTests);
      } else {
        setLabTests([]);
      }
    } catch (error) {
      setLabTests([]);
    }
  };

  const handleSaveMedicalInfo = async () => {
    if (!patient?.id) {
      alert("No patient selected");
      return;
    }
    
    try {
      const patientId = patient.id.startsWith('PAT-') ? patient.id : `PAT-${patient.id.padStart(6, '0')}`;
      
      const cleanMedicalInfo = Object.fromEntries(
        Object.entries(medicalInfo).map(([key, value]) => [
          key, 
          value === "" ? null : value
        ])
      );
      
      let response;
      if (vitalsOnly) {
        const vitalsData = {
          patient_id: patientId,
          height: cleanMedicalInfo.height,
          weight: cleanMedicalInfo.weight,
          blood_pressure: cleanMedicalInfo.blood_pressure,
          pulse: cleanMedicalInfo.pulse,
          temperature: cleanMedicalInfo.temperature,
          respiratory_rate: cleanMedicalInfo.respiratory_rate,
          oxygen_saturation: cleanMedicalInfo.oxygen_saturation
        };
        
        Object.keys(vitalsData).forEach(key => {
          if (vitalsData[key] === null) delete vitalsData[key];
        });
        
        response = await doctorApi.updatePatientVitals(patientId, vitalsData);
      } else {
        const fullData = {
          patient: patientId,
          ...cleanMedicalInfo
        };
        
        response = await doctorApi.savePatientMedicalInfo(patientId, fullData);
      }
      
      setEditingMedicalInfo(false);
      setVitalsOnly(false);
      await fetchMedicalInfo(patient.id);
      
      alert("✅ Medical information saved successfully!");
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.message || 
                          "Unknown error";
      
      alert(`❌ Failed to save medical information: ${errorMessage}`);
    }
  };

  // ============================
  // CONSULTATION SUBMIT FUNCTION (FIXED)
  // ============================

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    alert("Please fix the validation errors before submitting.");
    return;
  }
  
  try {
    setIsSubmitting(true);
    
    // Get appointment ID
    const appointmentId = location.state?.appointment?.APPOINTMENT_ID;
    
    if (!appointmentId) {
      throw new Error("No appointment ID found");
    }
    
    // 1. First, update the appointment status
    console.log("Updating appointment status...");
    await doctorApi.updateAppointmentStatus(appointmentId, "Completed");
    console.log("✅ Appointment status updated");
    
    // 2. Try updating consultation WITHOUT changing Consultation_Status
    // (Let the backend handle status changes)
    console.log("Updating consultation data...");
    const consultationResponse = await doctorApi.updateConsultation(formData.CONSULT_ID, {
      Symptoms: formData.symptoms,
      Diagnosis: formData.diagnosis,
      Description: formData.notes
      // REMOVE Consultation_Status: 'Completed' - let backend handle it
    });
    
    console.log("✅ Consultation updated:", consultationResponse.data);
    
    // 3. OR use the completeConsultation endpoint if you have one
    // try {
    //   await doctorApi.completeConsultation(formData.CONSULT_ID, {
    //     symptoms: formData.symptoms,
    //     diagnosis: formData.diagnosis,
    //     notes: formData.notes
    //   });
    // } catch (error) {
    //   console.log("Trying alternative...");
    // }
    
    // 4. Save prescriptions
    if (formData.prescription && formData.prescription.length > 0) {
      console.log("Saving prescriptions...");
      
      for (const med of formData.prescription) {
        const prescriptionData = {
          CONSULT_ID: formData.CONSULT_ID,
          MED_ID: med.medicine_id,
          Dosage: String(med.dosage || ""),
          Frequency: String(med.frequency || ""),
          Duration: String(med.duration || ""),
          Instructions: String(med.instructions || "")
        };
        
        await doctorApi.createPrescription(prescriptionData);
      }
      console.log("✅ Prescriptions saved");
    }
    
    // 5. Save lab tests
    if (formData.labTests && formData.labTests.length > 0) {
      console.log("Saving lab tests...");
      
      for (const test of formData.labTests) {
        const labTestData = {
          CONSULT_ID: formData.CONSULT_ID,
          LAB_TEST_ID: test.test_id,
          Notes: String(test.instructions || ""),
          Priority: test.priority || 'routine'
        };
        
        await doctorApi.createLabTestRequest(labTestData);
      }
      console.log("✅ Lab tests saved");
    }
    
    alert("✅ Consultation completed successfully!");
    
    // Navigate back
    setTimeout(() => {
      navigate("/doctor/appointments");
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
    // Try to get detailed error
    let errorMessage = "Failed to save consultation.";
    
    if (error.response?.data) {
      // Django REST Framework error format
      if (error.response.data.detail) {
        errorMessage = `Detail: ${error.response.data.detail}`;
      } else if (typeof error.response.data === 'object') {
        const errors = [];
        Object.entries(error.response.data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errors.push(`${field}: ${messages.join(', ')}`);
          } else {
            errors.push(`${field}: ${messages}`);
          }
        });
        errorMessage = `Validation errors:\n${errors.join('\n')}`;
      } else {
        errorMessage = String(error.response.data);
      }
    }
    
    alert(`❌ ${errorMessage}`);
    
    // If it's a status validation error, try a different approach
    if (errorMessage.includes('Consultation_Status') || errorMessage.includes('status')) {
      alert("Note: Consultation status might need to be updated separately. The appointment has been marked as Completed.");
    }
  } finally {
    setIsSubmitting(false);
  }
};

  // ============================
  // FORM FIELD HANDLERS
  // ============================

  const addMedicine = () => {
    if (selectedMedicine) {
      const medicineId = parseInt(selectedMedicine);
      const medicine = medicines.find(m => 
        m.id === medicineId || 
        m.MED_ID === medicineId ||
        (m.id && m.id.toString() === selectedMedicine)
      );
      
      if (medicine) {
        setFormData(prev => ({
          ...prev,
          prescription: [...prev.prescription, {
            medicine_id: medicine.id || medicine.MED_ID,
            name: medicine.name || medicine.Medicine_Name || "Unknown Medicine",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: ""
          }]
        }));
        setSelectedMedicine("");
      }
    }
  };

  const addLabTest = () => {
    if (selectedLabTest) {
      const testId = parseInt(selectedLabTest);
      const test = labTests.find(t => 
        t.id === testId || 
        t.LAB_TEST_ID === testId ||
        (t.id && t.id.toString() === selectedLabTest)
      );
      
      if (test) {
        setFormData(prev => ({
          ...prev,
          labTests: [...prev.labTests, {
            test_id: test.id || test.LAB_TEST_ID,
            name: test.name || "Unknown Test",
            instructions: "",
            priority: "routine"
          }]
        }));
        setSelectedLabTest("");
      }
    }
  };

  const removeMedicine = (index) => {
    setFormData(prev => ({
      ...prev,
      prescription: prev.prescription.filter((_, i) => i !== index)
    }));
  };

  const removeLabTest = (index) => {
    setFormData(prev => ({
      ...prev,
      labTests: prev.labTests.filter((_, i) => i !== index)
    }));
  };

  const updatePrescriptionField = (index, field, value) => {
    const updatedPrescription = [...formData.prescription];
    updatedPrescription[index] = {
      ...updatedPrescription[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      prescription: updatedPrescription
    }));
    
    // Clear validation error for this field
    if (validationErrors.prescription[index] && validationErrors.prescription[index][field]) {
      const newErrors = {...validationErrors.prescription};
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setValidationErrors(prev => ({
        ...prev,
        prescription: newErrors
      }));
    }
  };

  const updateLabTestField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      labTests: prev.labTests.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validate on change and clear errors
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const calculateBMI = () => {
    if (medicalInfo.height && medicalInfo.weight) {
      const heightInMeters = parseFloat(medicalInfo.height) / 100;
      const bmi = parseFloat(medicalInfo.weight) / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const bmiNum = parseFloat(bmi);
    if (bmiNum < 18.5) return "Underweight";
    if (bmiNum < 25) return "Normal";
    if (bmiNum < 30) return "Overweight";
    return "Obese";
  };

  // ============================
  // RENDER COMPONENTS
  // ============================

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Loading Consultation Form...</h5>
          <p className="text-muted">Please wait while we prepare the consultation.</p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="btn btn-outline-secondary btn-sm me-2"
            >
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <h1 className="h2 mb-0 d-inline">Consultation</h1>
          </div>
        </div>
        
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-triangle display-1 text-warning mb-3"></i>
            <h3>Unable to Load Consultation</h3>
            <p className="text-muted mb-4">{initializationError}</p>
            <div>
              <button 
                onClick={() => navigate("/doctor/appointments")}
                className="btn btn-primary me-2"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Back to Appointments
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            onClick={() => navigate("/doctor/appointments")}
            className="btn btn-outline-secondary btn-sm me-2"
          >
            <i className="bi bi-arrow-left"></i> Back to Appointments
          </button>
          <h1 className="h2 mb-0 d-inline">Consultation</h1>
          {patient && (
            <p className="text-muted mb-0 mt-1">Patient: {patient.name}</p>
          )}
        </div>
        <div className="text-end">
          <small className="text-muted">Dr. {staffDetail?.Name}</small>
          {staffDetail?.max_patients_per_day && (
            <small className="text-muted ms-2">• Max patients/day: {staffDetail.max_patients_per_day}</small>
          )}
        </div>
      </div>

      {/* Patient Information Card */}
      {patient ? (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-person-badge me-2"></i>
                Patient Information
              </h5>
              <div>
                <button 
                  className={`btn btn-sm ${showMedicalInfo ? 'btn-light' : 'btn-outline-light'} me-2`}
                  onClick={() => setShowMedicalInfo(!showMedicalInfo)}
                >
                  <i className={`bi ${showMedicalInfo ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                  {showMedicalInfo ? 'Hide Medical Info' : 'Show Medical Info'}
                </button>
                {showMedicalInfo && !editingMedicalInfo && (
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => setEditingMedicalInfo(true)}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Edit Medical Info
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="card-body">
            {/* Basic Patient Info */}
            <div className="row">
              <div className="col-md-3">
                <div className="patient-avatar text-center mb-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                    <i className="bi bi-person-fill text-primary" style={{ fontSize: '2rem' }}></i>
                  </div>
                </div>
              </div>
              <div className="col-md-9">
                <div className="row">
                  <div className="col-md-4">
                    <p className="mb-1"><strong>Name:</strong></p>
                    <p className="text-primary">{patient.name}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-1"><strong>Age:</strong></p>
                    <p>{patient.age || 'N/A'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1"><strong>Gender:</strong></p>
                    <p>{patient.gender || 'N/A'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1"><strong>Phone:</strong></p>
                    <p>{patient.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Info Dropdown Content */}
            {showMedicalInfo && (
              <div className="mt-4 pt-4 border-top">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 text-primary">
                    <i className="bi bi-clipboard2-pulse me-2"></i>
                    Medical Information
                  </h6>
                  {editingMedicalInfo ? (
                    <div>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-success me-2"
                        onClick={handleSaveMedicalInfo}
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        Save
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setEditingMedicalInfo(false);
                          setVitalsOnly(false);
                        }}
                      >
                        <i className="bi bi-x-circle me-1"></i>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex gap-2">
                      <button 
                        type="button"
                        className="btn btn-sm btn-outline-info"
                        onClick={() => {
                          setEditingMedicalInfo(true);
                          setVitalsOnly(true);
                        }}
                      >
                        <i className="bi bi-heart-pulse me-1"></i>
                        Edit Vitals Only
                      </button>
                    </div>
                  )}
                </div>

                {editingMedicalInfo ? (
                  <div className="row g-3">
                    {/* Vitals Section */}
                    <div className="col-12">
                      <h6 className="border-bottom pb-2">Vital Signs</h6>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Height (cm)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={medicalInfo.height}
                        onChange={(e) => setMedicalInfo({...medicalInfo, height: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Weight (kg)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={medicalInfo.weight}
                        onChange={(e) => setMedicalInfo({...medicalInfo, weight: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">BP (mmHg)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="120/80"
                        value={medicalInfo.blood_pressure}
                        onChange={(e) => setMedicalInfo({...medicalInfo, blood_pressure: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Pulse (bpm)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={medicalInfo.pulse}
                        onChange={(e) => setMedicalInfo({...medicalInfo, pulse: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Temp (°C)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        step="0.1"
                        value={medicalInfo.temperature}
                        onChange={(e) => setMedicalInfo({...medicalInfo, temperature: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">SpO₂ (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={medicalInfo.oxygen_saturation}
                        onChange={(e) => setMedicalInfo({...medicalInfo, oxygen_saturation: e.target.value})}
                      />
                    </div>

                    {/* BMI Display */}
                    {bmi && (
                      <div className="col-12 mt-2">
                        <div className="alert alert-light d-inline-flex align-items-center">
                          <strong>BMI:</strong>
                          <span className={`ms-2 badge bg-${
                            bmiCategory === 'Underweight' ? 'info' :
                            bmiCategory === 'Normal' ? 'success' :
                            bmiCategory === 'Overweight' ? 'warning' : 'danger'
                          }`}>
                            {bmi} ({bmiCategory})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Full Medical History */}
                    {!vitalsOnly && (
                      <>
                        <div className="col-12 mt-3">
                          <h6 className="border-bottom pb-2">Medical History</h6>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small">Allergies</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows="2"
                            value={medicalInfo.allergies}
                            onChange={(e) => setMedicalInfo({...medicalInfo, allergies: e.target.value})}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small">Current Medications</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows="2"
                            value={medicalInfo.current_medications}
                            onChange={(e) => setMedicalInfo({...medicalInfo, current_medications: e.target.value})}
                          />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label small">Past Medical History</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows="3"
                            value={medicalInfo.past_medical_history}
                            onChange={(e) => setMedicalInfo({...medicalInfo, past_medical_history: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* View Mode - Display Only */
                  <div className="row g-3">
                    {/* Vitals Display */}
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">Height</p>
                      <p className="fw-medium">{medicalInfo.height || 'N/A'} cm</p>
                    </div>
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">Weight</p>
                      <p className="fw-medium">{medicalInfo.weight || 'N/A'} kg</p>
                    </div>
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">Blood Pressure</p>
                      <p className="fw-medium">{medicalInfo.blood_pressure || 'N/A'}</p>
                    </div>
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">Pulse</p>
                      <p className="fw-medium">{medicalInfo.pulse || 'N/A'} bpm</p>
                    </div>
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">Temperature</p>
                      <p className="fw-medium">{medicalInfo.temperature || 'N/A'} °C</p>
                    </div>
                    <div className="col-md-2">
                      <p className="mb-1 small text-muted">SpO₂</p>
                      <p className="fw-medium">{medicalInfo.oxygen_saturation || 'N/A'} %</p>
                    </div>

                    {/* BMI Display */}
                    {bmi && (
                      <div className="col-12 mt-2">
                        <div className="alert alert-light d-inline-flex align-items-center">
                          <strong>BMI:</strong>
                          <span className={`ms-2 badge bg-${
                            bmiCategory === 'Underweight' ? 'info' :
                            bmiCategory === 'Normal' ? 'success' :
                            bmiCategory === 'Overweight' ? 'warning' : 'danger'
                          }`}>
                            {bmi} ({bmiCategory})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Medical History Display */}
                    <div className="col-md-6">
                      <p className="mb-1 small text-muted">Allergies</p>
                      <p className="fw-medium">{medicalInfo.allergies || 'None recorded'}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1 small text-muted">Current Medications</p>
                      <p className="fw-medium">{medicalInfo.current_medications || 'None recorded'}</p>
                    </div>
                    <div className="col-md-12">
                      <p className="mb-1 small text-muted">Past Medical History</p>
                      <p className="fw-medium">{medicalInfo.past_medical_history || 'None recorded'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No patient information available. Please select a patient.
        </div>
      )}

      {/* Consultation Form */}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="bi bi-clipboard2-heart me-2"></i>
                  Symptoms & Diagnosis
                </h5>
              </div>
              <div className="card-body">
                {/* Symptoms Field with Validation */}
                <div className="mb-3">
                  <label className="form-label">Symptoms *</label>
                  <textarea 
                    className={`form-control ${validationErrors.symptoms ? 'is-invalid' : ''}`}
                    placeholder="Describe patient symptoms in detail..."
                    value={formData.symptoms}
                    onChange={(e) => handleFieldChange('symptoms', e.target.value)}
                    rows={6}
                    required
                  />
                  {validationErrors.symptoms && (
                    <div className="invalid-feedback">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {validationErrors.symptoms}
                    </div>
                  )}
                  <small className="text-muted">Describe onset, duration, severity, and associated symptoms (min. 10 characters)</small>
                </div>
                
                {/* Diagnosis Field with Validation */}
                <div className="mb-3">
                  <label className="form-label">Diagnosis *</label>
                  <textarea 
                    className={`form-control ${validationErrors.diagnosis ? 'is-invalid' : ''}`}
                    placeholder="Enter diagnosis..."
                    value={formData.diagnosis}
                    onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
                    rows={4}
                    required
                  />
                  {validationErrors.diagnosis && (
                    <div className="invalid-feedback">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {validationErrors.diagnosis}
                    </div>
                  )}
                  <small className="text-muted">Medical diagnosis (min. 5 characters)</small>
                </div>
                
                {/* Clinical Notes Field with Validation */}
                <div className="mb-0">
                  <label className="form-label">Clinical Notes</label>
                  <textarea 
                    className={`form-control ${validationErrors.notes ? 'is-invalid' : ''}`}
                    placeholder="Additional clinical notes..."
                    value={formData.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    rows={3}
                  />
                  {validationErrors.notes && (
                    <div className="invalid-feedback">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {validationErrors.notes}
                    </div>
                  )}
                  <small className="text-muted">Optional additional notes</small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="bi bi-capsule me-2"></i>
                  Prescription
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Add Medicine</label>
                  <div className="input-group">
                    <select 
                      className="form-select"
                      value={selectedMedicine}
                      onChange={(e) => setSelectedMedicine(e.target.value)}
                    >
                      <option value="">Select Medicine</option>
                      {medicines && medicines.length > 0 ? (
                        medicines.map(med => {
                          const stockInfo = med.stock || med.available_stock;
                          const stockDisplay = typeof stockInfo === 'object' 
                            ? stockInfo.available || 'N/A'
                            : stockInfo || 'N/A';
                          
                          return (
                            <option key={med.id || med.MED_ID} value={med.id || med.MED_ID}>
                              {med.name || med.Medicine_Name} ({med.dosage || med.Dosage}) - Stock: {stockDisplay}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>No medicines available</option>
                      )}
                    </select>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={addMedicine}
                      disabled={!selectedMedicine}
                    >
                      <i className="bi bi-plus-circle"></i>
                    </button>
                  </div>
                </div>
                
                {formData.prescription && formData.prescription.length > 0 ? (
                  <div className="border rounded p-3">
                    {formData.prescription.map((med, index) => {
                      const medErrors = validationErrors.prescription[index] || {};
                      return (
                        <div key={index} className="border-bottom pb-3 mb-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <strong className="text-primary">{med.name}</strong>
                              <button 
                                type="button"
                                className="btn btn-sm btn-outline-danger ms-2"
                                onClick={() => removeMedicine(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          
                          <div className="row g-2">
                            {/* Dosage Field */}
                            <div className="col-md-4">
                              <label className="form-label small">Dosage *</label>
                              <input 
                                type="text" 
                                className={`form-control form-control-sm ${medErrors.dosage ? 'is-invalid' : ''}`}
                                value={med.dosage}
                                onChange={(e) => updatePrescriptionField(index, 'dosage', e.target.value)}
                                placeholder="e.g., 500mg"
                              />
                              {medErrors.dosage && (
                                <div className="invalid-feedback d-block small">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  {medErrors.dosage}
                                </div>
                              )}
                            </div>
                            
                            {/* Frequency Field */}
                            <div className="col-md-4">
                              <label className="form-label small">Frequency *</label>
                              <select 
                                className={`form-select form-select-sm ${medErrors.frequency ? 'is-invalid' : ''}`}
                                value={med.frequency}
                                onChange={(e) => updatePrescriptionField(index, 'frequency', e.target.value)}
                              >
                                <option value="">Select Frequency...</option>
                                <option value="1-0-1">1-0-1 (Morning-Night)</option>
                                <option value="0-1-1">0-1-1 (Afternoon-Night)</option>
                                <option value="1-0-0">1-0-0 (Morning only)</option>
                                <option value="0-1-0">0-1-0 (Afternoon only)</option>
                                <option value="0-0-1">0-0-1 (Night only)</option>
                                <option value="1-1-0">1-1-0 (Morning-Afternoon)</option>
                                <option value="1-1-1">1-1-1 (Morning-Afternoon-Night)</option>
                              </select>
                              {medErrors.frequency && (
                                <div className="invalid-feedback d-block small">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  {medErrors.frequency}
                                </div>
                              )}
                            </div>
                            
                            {/* Duration Field */}
                            <div className="col-md-4">
                              <label className="form-label small">Duration *</label>
                              <input 
                                type="text" 
                                className={`form-control form-control-sm ${medErrors.duration ? 'is-invalid' : ''}`}
                                value={med.duration}
                                onChange={(e) => updatePrescriptionField(index, 'duration', e.target.value)}
                                placeholder="e.g., 7 days"
                              />
                              {medErrors.duration && (
                                <div className="invalid-feedback d-block small">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  {medErrors.duration}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <label className="form-label small">Instructions</label>
                            <textarea 
                              className="form-control form-control-sm"
                              rows="2"
                              value={med.instructions || ''}
                              onChange={(e) => updatePrescriptionField(index, 'instructions', e.target.value)}
                              placeholder="Special instructions (before/after food, etc.)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 border rounded">
                    <i className="bi bi-capsule display-6 text-muted mb-3"></i>
                    <p className="text-muted mb-0">No medicines added yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="bi bi-vial me-2"></i>
                  Lab Tests
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Request Lab Test</label>
                  <div className="input-group">
                    <select 
                      className="form-select"
                      value={selectedLabTest}
                      onChange={(e) => setSelectedLabTest(e.target.value)}
                    >
                      <option value="">Select Lab Test</option>
                      {labTests && labTests.length > 0 ? (
                        labTests.map(test => (
                          <option key={test.id || test.LAB_TEST_ID} value={test.id || test.LAB_TEST_ID}>
                            {test.name || test.Lab_Test_Name} - ₹{test.cost || test.Cost || 0}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No lab tests available</option>
                      )}
                    </select>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={addLabTest}
                      disabled={!selectedLabTest}
                    >
                      <i className="bi bi-plus-circle"></i>
                    </button>
                  </div>
                </div>
                
                {formData.labTests && formData.labTests.length > 0 ? (
                  <div className="border rounded p-3">
                    {formData.labTests.map((test, index) => (
                      <div key={index} className="border-bottom pb-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <strong className="text-primary">{test.name}</strong>
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-danger ms-2"
                              onClick={() => removeLabTest(index)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          <select 
                            className="form-select form-select-sm w-auto"
                            value={test.priority || 'routine'}
                            onChange={(e) => updateLabTestField(index, 'priority', e.target.value)}
                          >
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="stat">STAT</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="form-label small">Instructions</label>
                          <textarea 
                            className="form-control form-control-sm"
                            rows="2"
                            value={test.instructions || ''}
                            onChange={(e) => updateLabTestField(index, 'instructions', e.target.value)}
                            placeholder="Special instructions for the lab test..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 border rounded">
                    <i className="bi bi-vial display-6 text-muted mb-3"></i>
                    <p className="text-muted mb-0">No lab tests requested yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="bi bi-calendar-check me-2"></i>
                  Follow-up & Instructions
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">Follow-up Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={formData.followUpDate}
                      onChange={(e) => handleFieldChange('followUpDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">Follow-up Notes</label>
                  <textarea 
                    className="form-control"
                    placeholder="Instructions for follow-up..."
                    value={formData.followUpNotes}
                    onChange={(e) => handleFieldChange('followUpNotes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                  <div>
                    <button 
                      type="submit" 
                      className="btn btn-primary me-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-1"></i>
                          Save Consultation
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      disabled={isSubmitting}
                      onClick={() => {
                        // Handle save and print functionality
                        if (validateForm()) {
                          alert("Print functionality would be implemented here");
                        }
                      }}
                    >
                      <i className="bi bi-printer me-1"></i>
                      Save & Print
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="alert alert-info small mb-0">
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Validation Rules:</strong>
                    <ul className="mb-0 mt-1">
                      <li>Symptoms: Minimum 10 characters, descriptive text</li>
                      <li>Diagnosis: Minimum 5 characters, medical terms</li>
                      <li>Prescription: Dosage, Frequency, and Duration are required</li>
                      <li>Dosage must include numbers (e.g., 500mg)</li>
                      <li>Duration must include time unit (e.g., 7 days)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ConsultationForm;