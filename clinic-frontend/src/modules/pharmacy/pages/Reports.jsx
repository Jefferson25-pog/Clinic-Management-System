import React, { useState, useEffect } from 'react';
import { Button, Alert, Badge, Form, Row, Col } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const Reports = () => {
  const [reportType, setReportType] = useState('stock');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Inline ReportChart component
  const ReportChart = ({ data, type }) => (
    <div className="text-center py-4 border rounded bg-light">
      <i className="bi bi-bar-chart display-6 text-primary mb-3"></i>
      <h5>{type} Chart</h5>
      <p className="text-muted">Chart visualization would appear here</p>
    </div>
  );

  const reportTypes = [
    { value: 'stock', label: 'Stock Report', icon: 'bi-box-seam', color: 'primary' },
    { value: 'dispensing', label: 'Dispensing Report', icon: 'bi-cart-check', color: 'success' },
    { value: 'expiry', label: 'Expiry Report', icon: 'bi-clock-history', color: 'warning' },
    { value: 'sales', label: 'Sales Report', icon: 'bi-graph-up', color: 'info' },
    { value: 'supplier', label: 'Supplier Report', icon: 'bi-building', color: 'secondary' },
    { value: 'low-stock', label: 'Low Stock Alert', icon: 'bi-exclamation-triangle', color: 'danger' }
  ];

  // CORRECTED fetchReport function
  const fetchReport = async () => {
    try {
      setLoading(true);
      setAlert({ show: false, type: '', message: '' });

      let response;
      
      try {
        switch (reportType) {
          case 'stock':
            response = await pharmacyApi.getStockReport(); // CHANGED
            break;
          case 'dispensing':
            response = await pharmacyApi.getDispensingReport(dateRange); // CHANGED
            break;
          case 'expiry':
            response = await pharmacyApi.getExpiryReport(); // CHANGED
            break;
          case 'sales':
            response = await pharmacyApi.getSalesReport(dateRange); // CHANGED
            break;
          case 'supplier':
            response = await pharmacyApi.getSupplierReport(); // CHANGED
            break;
          case 'low-stock':
            response = await pharmacyApi.getLowStockReport(); // CHANGED
            break;
          default:
            response = await pharmacyApi.getStockReport(); // CHANGED
        }

        // Check if response has data
        if (response && response.data) {
          setReportData(response.data);
        } else {
          throw new Error('No data returned from server');
        }
        
      } catch (apiError) {
        console.log(`API endpoint for ${reportType} not available, using fallback data`);
        
        // Generate fallback data when API endpoints don't exist
        const fallbackData = generateFallbackReportData(reportType, dateRange);
        setReportData(fallbackData);
        
        // Show info message
        setAlert({ 
          show: true, 
          type: 'info', 
          message: `Using sample data for ${reportType.replace('-', ' ')} report` 
        });
      }
      
    } catch (error) {
      console.error('Error in fetchReport:', error);
      setAlert({ 
        show: true, 
        type: 'danger', 
        message: 'Unable to generate report. Please try again.' 
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate fallback data
  const generateFallbackReportData = (type, dateRange) => {
    const baseData = {
      summary: {
        total_records: Math.floor(Math.random() * 200) + 50,
        total_value: (Math.random() * 10000 + 5000).toFixed(2),
        average_value: (Math.random() * 100 + 50).toFixed(2),
      },
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [65, 59, 80, 81, 56, 55]
      },
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        item_name: `${type.replace('-', ' ')} Item ${i + 1}`,
        quantity: Math.floor(Math.random() * 100) + 10,
        value: (Math.random() * 1000 + 100).toFixed(2),
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      }))
    };

    // Add type-specific summary fields
    switch (type) {
      case 'stock':
        baseData.summary.most_popular = 'Paracetamol';
        baseData.summary.low_stock_items = 7;
        break;
      case 'dispensing':
        baseData.summary.most_dispensed = 'Amoxicillin';
        baseData.summary.total_transactions = baseData.summary.total_records;
        break;
      case 'expiry':
        baseData.summary.expiring_soon = 5;
        break;
      case 'sales':
        baseData.summary.total_sales = baseData.summary.total_value;
        break;
      case 'supplier':
        baseData.summary.active_suppliers = 8;
        break;
      case 'low-stock':
        baseData.summary.critical_items = 3;
        break;
    }

    return baseData;
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleGenerateReport = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleExport = async (format) => {
    try {
      setLoading(true);
      
      // Show message that export is not available yet
      setAlert({ 
        show: true, 
        type: 'info', 
        message: `Export to ${format.toUpperCase()} feature is under development` 
      });
      
    } catch (error) {
      console.error('Export error:', error);
      showAlert('danger', 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const getCurrentReport = reportTypes.find(r => r.value === reportType);

  return (
    <div>
      {/* Header - EXACT Admin Pattern */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Pharmacy Reports</h3>
          <p className="text-muted mb-0">
            Generate and analyze pharmacy performance reports.
          </p>
        </div>
        <div className="text-end d-flex flex-wrap gap-2 align-items-center">
          <div>
            <small className="text-muted d-block">
              <i className="bi bi-calendar-check me-1"></i>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </small>
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchReport}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* Alert Display */}
      {alert.show && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className={`bi ${alert.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          <strong>{alert.type === 'success' ? 'Success:' : 'Error:'}</strong> {alert.message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setAlert({ show: false, type: '', message: '' })}
          ></button>
        </div>
      )}

      {/* Add Admin-style Quick Stats Cards */}
      <div className="row g-3 mb-4">
        {/* Total Reports */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Report Types</h6>
                  <h3 className="mb-0">{reportTypes.length}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-file-text me-1"></i>
                      Available reports
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-graph-up fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Formats */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Export Formats</h6>
                  <h3 className="mb-0">3</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-download me-1"></i>
                      PDF, Excel, CSV
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-download fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Date Range</h6>
                  <h3 className="mb-0">
                    {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'short' })} 
                    - {new Date(dateRange.endDate).toLocaleDateString('en-US', { day: 'numeric' })}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar me-1"></i>
                      Custom period
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-calendar fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Current Report</h6>
                  <h3 className="mb-0">
                    {getCurrentReport ? getCurrentReport.label : 'None'}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-eye me-1"></i>
                      {reportData ? 'Data loaded' : 'Select report'}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-eye fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <button 
                className="btn btn-outline-warning btn-sm w-100"
                onClick={fetchReport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Status Bar */}
      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Report Status: 
              <span className={`ms-2 badge ${loading ? 'bg-warning' : reportData ? 'bg-success' : 'bg-secondary'}`}>
                {loading ? 'Generating...' : reportData ? 'Ready' : 'No Data'}
              </span>
              {getCurrentReport && (
                <span className={`ms-2 badge bg-${getCurrentReport.color}`}>
                  <i className={`bi ${getCurrentReport.icon} me-1`}></i>
                  {getCurrentReport.label}
                </span>
              )}
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Generated: {reportData ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Not generated'}
            </small>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-transparent border-0">
          <h5 className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            Select Report Type
          </h5>
          <p className="text-muted mb-0 small">Choose the type of report to generate</p>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {reportTypes.map((report) => (
              <div key={report.value} className="col-12 col-md-6 col-lg-4">
                <div 
                  className={`card border-0 cursor-pointer transition-all ${reportType === report.value ? 'border-primary border-2' : 'border'}`}
                  onClick={() => setReportType(report.value)}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className={`bg-${report.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                        <i className={`bi ${report.icon} fs-4 text-${report.color}`}></i>
                      </div>
                      <div>
                        <h6 className="card-title mb-1 fw-semibold">{report.label}</h6>
                        <small className="text-muted">Click to select</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-transparent border-0">
          <h5 className="mb-0">
            <i className="bi bi-filter me-2"></i>
            Report Filters
          </h5>
          <p className="text-muted mb-0 small">Customize report parameters</p>
        </div>
        <div className="card-body">
          <Form onSubmit={handleGenerateReport}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-between">
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-circle me-2"></i>
                    Generate Report
                  </>
                )}
              </Button>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-danger"
                  onClick={() => handleExport('pdf')}
                  disabled={!reportData || loading}
                >
                  <i className="bi bi-file-pdf me-2"></i>
                  Export PDF
                </Button>
                <Button 
                  variant="outline-success"
                  onClick={() => handleExport('excel')}
                  disabled={!reportData || loading}
                >
                  <i className="bi bi-file-excel me-2"></i>
                  Export Excel
                </Button>
                <Button 
                  variant="outline-info"
                  onClick={() => handleExport('csv')}
                  disabled={!reportData || loading}
                >
                  <i className="bi bi-file-text me-2"></i>
                  Export CSV
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>

      {/* Report Content */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className={`bi ${getCurrentReport?.icon || 'bi-graph-up'} me-2`}></i>
              {getCurrentReport?.label || 'Report'}
            </h5>
            <p className="text-muted mb-0 small">
              {dateRange.startDate} to {dateRange.endDate}
            </p>
          </div>
          <Badge bg="primary">
            {reportData?.summary?.total_records || reportData?.summary?.totalRecords || 0} Records
          </Badge>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Generating report...</p>
            </div>
          ) : !reportData ? (
            <div className="text-center py-5">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-3 text-muted">No report data available</p>
              <p className="text-muted small">Select a report type and generate the report</p>
            </div>
          ) : (
            <>
              {/* Report Summary */}
              {reportData.summary && (
                <div className="row g-3 mb-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="col-6 col-md-3">
                      <div className="card border-0 bg-light">
                        <div className="card-body text-center">
                          <h6 className="text-muted mb-1">{key.replace(/_/g, ' ')}</h6>
                          <h3 className="mb-0 text-primary">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Report Chart */}
              {reportData.chartData && (
                <div className="mb-4">
                  <ReportChart data={reportData.chartData} type={reportType} />
                </div>
              )}

              {/* Report Table */}
              {reportData.data && Array.isArray(reportData.data) && reportData.data.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="bg-light">
                      <tr>
                        {Object.keys(reportData.data[0]).map((key) => (
                          <th key={key} className="border-0">{key.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, idx) => (
                            <td key={idx}>{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Report generated on {new Date().toLocaleDateString()}
            </small>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={fetchReport}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;