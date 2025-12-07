// src/modules/reception/components/PatientSearch.jsx
import React, { useState, useEffect } from "react";
import { receptionApi } from "../services/receptionApi";

const PatientSearch = ({ onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("name"); // name, phone, id, email

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchType]);

  const performSearch = async () => {
    try {
      setLoading(true);
      let response;
      
      switch(searchType) {
        case 'id':
          // Search by exact ID
          response = await receptionApi.getPatientById(searchTerm);
          setSearchResults(response.data ? [response.data] : []);
          break;
        case 'phone':
          // Search by phone (exact match)
          const patientsRes = await receptionApi.getPatients();
          const allPatients = patientsRes.data?.results || patientsRes.data || [];
          const phoneResults = allPatients.filter(p => 
            p.Phone_Number && p.Phone_Number.includes(searchTerm)
          );
          setSearchResults(phoneResults);
          break;
        default:
          // Search by name (contains)
          const searchRes = await receptionApi.getPatients({ search: searchTerm });
          const searchData = searchRes.data?.results || searchRes.data || [];
          setSearchResults(searchData);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setSearchTerm("");
    setSearchResults([]);
  };

  const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-0">
        <h6 className="mb-0">
          <i className="bi bi-search me-2"></i>
          Quick Patient Search
        </h6>
        <p className="text-muted mb-0 small">Find patients quickly for appointments</p>
      </div>
      <div className="card-body">
        {/* Search Type Tabs */}
        <div className="mb-3">
          <div className="btn-group btn-group-sm w-100" role="group">
            <button
              type="button"
              className={`btn ${searchType === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSearchType('name')}
            >
              <i className="bi bi-person me-1"></i> Name
            </button>
            <button
              type="button"
              className={`btn ${searchType === 'phone' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSearchType('phone')}
            >
              <i className="bi bi-phone me-1"></i> Phone
            </button>
            <button
              type="button"
              className={`btn ${searchType === 'id' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSearchType('id')}
            >
              <i className="bi bi-tag me-1"></i> ID
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder={`Search by ${searchType}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="btn btn-primary" 
            type="button"
            onClick={performSearch}
            disabled={loading || searchTerm.length < 2}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : (
              <i className="bi bi-search"></i>
            )}
          </button>
          <button 
            className="btn btn-outline-secondary" 
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSearchResults([]);
            }}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="mt-2">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Start typing (min 2 characters) to search patients
          </small>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 border rounded">
            <div className="p-2 bg-light border-bottom">
              <small className="text-muted">
                Found {searchResults.length} patient(s)
              </small>
            </div>
            <div className="list-group list-group-flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((patient) => (
                <button
                  key={patient.PAT_ID}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onClick={() => handleSelect(patient)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-medium">{patient.Patient_Name}</div>
                      <small className="text-muted">
                        ID: PAT-{patient.PAT_ID} | Age: {calculateAge(patient.DOB)} | 📞 {patient.Phone_Number}
                      </small>
                    </div>
                    <div>
                      <i className="bi bi-arrow-right-circle text-primary"></i>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Patients (when no search) */}
        {searchTerm.length === 0 && searchResults.length === 0 && (
          <div className="mt-4">
            <h6 className="text-muted mb-2">
              <i className="bi bi-clock-history me-1"></i>
              Recent Patients
            </h6>
            <div className="text-center py-3">
              <i className="bi bi-search display-6 text-muted mb-3"></i>
              <p className="text-muted">Start typing to search patients</p>
              <small className="text-muted">
                Search by name, phone number, or patient ID
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientSearch;