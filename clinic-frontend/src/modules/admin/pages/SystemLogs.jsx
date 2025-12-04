
// src/modules/admin/pages/SystemLogs.jsx
import React, { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState("");
  const [logType, setLogType] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (level) params.level = level;
      if (logType) params.type = logType;
      // backend already returns ordered desc by default, but we can reverse in FE
      const res = await adminApi.getSystemLogs(params);
      let data = res.data.logs || res.data || [];
      if (sortOrder === "asc") {
        data = [...data].reverse();
      }
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch system logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">System Logs</h4>
          <p className="text-muted mb-0">
            View backend system & security logs for auditing.
          </p>
        </div>
      </div>

      <form className="row g-2 mb-3" onSubmit={handleFilter}>
        <div className="col-12 col-md-3">
          <label className="form-label">Level</label>
          <select
            className="form-select"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">All</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
            <option value="SECURITY">SECURITY</option>
          </select>
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={logType}
            onChange={(e) => setLogType(e.target.value)}
          >
            <option value="">All</option>
            <option value="AUTH">AUTH</option>
            <option value="USER">USER</option>
            <option value="DATA">DATA</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="SECURITY">SECURITY</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label">Sort by time</label>
          <select
            className="form-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <div className="col-12 col-md-2 d-grid align-items-end">
          <button className="btn btn-outline-secondary" type="submit">
            Apply Filters
          </button>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>IP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.level}</td>
                      <td>{log.log_type}</td>
                      <td>{log.user || "-"}</td>
                      <td>{log.ip_address || "-"}</td>
                      <td>{log.action}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
