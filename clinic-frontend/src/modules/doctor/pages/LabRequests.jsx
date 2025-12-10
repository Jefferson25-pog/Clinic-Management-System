// src/modules/doctor/pages/LabRequests.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";

const LabRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, completed, all

  useEffect(() => {
    fetchLabRequests();
  }, [filter]);

  const fetchLabRequests = async () => {
    try {
      setLoading(true);
      const response = await doctorApi.getLabTestRequests();
      const data = Array.isArray(response?.data) ? response.data : [];
      
      if (filter === 'pending') {
        setRequests(data.filter(req => req.status === 'Pending'));
      } else if (filter === 'completed') {
        setRequests(data.filter(req => req.status === 'Completed'));
      } else {
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching lab requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (id) => {
    if (window.confirm("Are you sure you want to cancel this lab request?")) {
      try {
        await doctorApi.cancelLabTestRequest(id);
        fetchLabRequests();
      } catch (error) {
        console.error("Error canceling request:", error);
      }
    }
  };

  // Similar structure with back button and filter tabs
  // ... (implementation similar to Appointments.jsx)
};

export default LabRequests;