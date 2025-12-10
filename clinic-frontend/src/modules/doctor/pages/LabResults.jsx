// components/doctor/LabResults.jsx
import React, { useState, useEffect } from 'react';
import doctorApi from '../services/doctorApi';
import { FileEarmarkText, Person, Calendar, Download } from 'react-bootstrap-icons';

const LabResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new'); // new, old, all
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const response = await doctorApi.getRecentLabResults();
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Error fetching lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (resultId) => {
    // Implement mark as read functionality
    setResults(prev => prev.map(result => 
      result.id === resultId ? { ...result, isNew: false } : result
    ));
  };

  const downloadResult = async (resultId, fileName) => {
    try {
      // Implement PDF download
      alert(`Downloading ${fileName}...`);
    } catch (error) {
      console.error('Error downloading result:', error);
    }
  };

  const getFilteredResults = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return results.filter(result => {
      // New/Old filter
      const resultDate = new Date(result.Result_Date);
      if (filter === 'new' && resultDate < sevenDaysAgo) {
        return false;
      }
      if (filter === 'old' && resultDate >= sevenDaysAgo) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && result.LAB_REQUEST?.Priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredResults = getFilteredResults();

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading lab results...</p>
      </div>
    );
  }

  return (
    <div className="lab-results">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FileEarmarkText className="me-2" />
            Lab Test Results
          </h5>
          <div className="filters">
            <select 
              className="form-select form-select-sm me-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="new">New (Last 7 days)</option>
              <option value="old">Older</option>
              <option value="all">All Results</option>
            </select>
            
            <select 
              className="form-select form-select-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="stat">Urgent</option>
              <option value="priority">High</option>
              <option value="routine">Normal</option>
            </select>
          </div>
        </div>
        
        <div className="card-body">
          {filteredResults.length === 0 ? (
            <div className="text-center py-5">
              <FileEarmarkText size={48} className="text-muted mb-3" />
              <h5>No lab results found</h5>
              <p className="text-muted">
                {filter !== 'all' ? 'Try changing your filters' : 'No lab test results available'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="30"></th>
                    <th>Patient</th>
                    <th>Test Name</th>
                    <th>Result Date</th>
                    <th>Status</th>
                    <th>Technician</th>
                    <th>Result Summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map(result => {
                    const isNew = result.isNew !== false;
                    const resultDate = new Date(result.Result_Date);
                    const isUrgent = result.LAB_REQUEST?.Priority === 'stat';
                    
                    return (
                      <tr key={result.id} className={isUrgent ? 'table-danger' : ''}>
                        <td>
                          {isNew && (
                            <span className="badge bg-danger" title="New Result">
                              New
                            </span>
                          )}
                          {isUrgent && !isNew && (
                            <span className="badge bg-warning" title="Urgent">
                              Urgent
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Person className="me-2 text-primary" />
                            <div>
                              <div>{result.patient_name}</div>
                              <small className="text-muted">
                                {result.patient_id ? `PAT-${result.patient_id.toString().padStart(6, '0')}` : 'N/A'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{result.test_name}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Calendar className="me-2 text-muted" />
                            <div>
                              <div>{resultDate.toLocaleDateString()}</div>
                              <small className="text-muted">
                                {resultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            result.Result_Status === 'Normal' ? 'bg-success' :
                            result.Result_Status === 'Abnormal' ? 'bg-danger' :
                            result.Result_Status === 'Critical' ? 'bg-warning' : 'bg-secondary'
                          }`}>
                            {result.Result_Status || 'Pending'}
                          </span>
                        </td>
                        <td>{result.technician_name || 'N/A'}</td>
                        <td>
                          <small>
                            {result.Result_Summary || 'No summary available'}
                            {result.Comments && (
                              <>
                                <br />
                                <span className="text-muted">{result.Comments}</span>
                              </>
                            )}
                          </small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => markAsRead(result.id)}
                              disabled={!isNew}
                            >
                              Mark Read
                            </button>
                            <button 
                              className="btn btn-outline-success"
                              onClick={() => downloadResult(result.id, `${result.test_name}_result.pdf`)}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabResults;