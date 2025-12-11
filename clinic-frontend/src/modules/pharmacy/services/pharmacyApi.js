import axiosInstance from "../../../api/axiosInstance";

// src/api/pharmacyApi.js - UPDATED WITH /api/ PREFIX
const pharmacyApi = {
  // ============= DASHBOARD ENDPOINTS =============
  getDashboardStats: () => axiosInstance.get('/api/pharmacy/dashboard/stats/'),
  
  // ============= MEDICINES =============
  getAllMedicines: () => axiosInstance.get('/api/pharmacy/medicine/'),
  
  getMedicineById: (id) => axiosInstance.get(`/api/pharmacy/medicine/${id}/`),
  
  createMedicine: (data) => axiosInstance.post('/api/pharmacy/medicine/', data),
  
  updateMedicine: (id, data) => axiosInstance.put(`/api/pharmacy/medicine/${id}/`, data),
  
  deleteMedicine: (id) => axiosInstance.delete(`/api/pharmacy/medicine/${id}/`),
  
  searchMedicines: (query) => axiosInstance.get(`/api/pharmacy/medicine/?search=${query}`),

  // ============= SUPPLIERS =============
  getAllSuppliers: () => axiosInstance.get('/api/pharmacy/supplier/'),
  
  getSupplierById: (id) => axiosInstance.get(`/api/pharmacy/supplier/${id}/`),
  
  createSupplier: (data) => axiosInstance.post('/api/pharmacy/supplier/', data),
  
  updateSupplier: (id, data) => axiosInstance.put(`/api/pharmacy/supplier/${id}/`, data),
  
  deleteSupplier: (id) => axiosInstance.delete(`/api/pharmacy/supplier/${id}/`),

  // ============= STOCK =============
  getAllStock: () => axiosInstance.get('/api/pharmacy/stock/'),
  
  getLowStock: () => axiosInstance.get('/api/pharmacy/stock/low_stock/'),
  
  getStockById: (id) => axiosInstance.get(`/api/pharmacy/stock/${id}/`),
  
  updateStock: (id, data) => axiosInstance.put(`/api/pharmacy/stock/${id}/`, data),
  
  updateMinimumStock: (id, minLevel) => 
    axiosInstance.patch(`/api/pharmacy/stock/${id}/`, { Minimum_Stock_Level: minLevel }),

  // ============= STOCK ORDERS =============
  getAllOrders: () => axiosInstance.get('/api/pharmacy/stock-order/'),
  
  getOrderById: (id) => axiosInstance.get(`/api/pharmacy/stock-order/${id}/`),
  
  createOrder: (data) => {
    const formattedData = {
      SUPPLIER_ID: data.SUPPLIER_ID,
      MED_ID: data.MED_ID,
      Qty_Supplied: data.Qty_Supplied,
      Date_of_Supply: data.Date_of_Supply,
      Supply_Cost: data.Supply_Cost,
      Expiry_Date: data.Expiry_Date,
      Batch_Number: data.Batch_Number || ''
    };
    
    console.log('📤 Sending to Django:', formattedData);
    return axiosInstance.post('/api/pharmacy/stock-order/', formattedData);
  },
  
  updateOrder: (id, data) => {
    const formattedData = {
      SUPPLIER_ID: data.SUPPLIER_ID,
      MED_ID: data.MED_ID,
      Qty_Supplied: data.Qty_Supplied,
      Date_of_Supply: data.Date_of_Supply,
      Supply_Cost: data.Supply_Cost,
      Expiry_Date: data.Expiry_Date,
      Batch_Number: data.Batch_Number
    };
    
    return axiosInstance.put(`/api/pharmacy/stock-order/${id}/`, formattedData);
  },
  
  deleteOrder: (id) => axiosInstance.delete(`/api/pharmacy/stock-order/${id}/`),

  // ============= DISPENSING =============
  getAllDispensing: () => axiosInstance.get('/api/pharmacy/dispensing/'),
  
  getTodayDispensing: () => axiosInstance.get('/api/pharmacy/dispensing/today_dispensing/'),
  
  getDispensingById: (id) => axiosInstance.get(`/api/pharmacy/dispensing/${id}/`),
  
  createDispensing: (data) => axiosInstance.post('/api/pharmacy/dispensing/', data),
  
  updateDispensing: (id, data) => axiosInstance.put(`/api/pharmacy/dispensing/${id}/`, data),
  
  deleteDispensing: (id) => axiosInstance.delete(`/api/pharmacy/dispensing/${id}/`),

  // ============= SMART PHARMACY =============
  getExpiryAlerts: () => axiosInstance.get('/api/pharmacy/smart-pharmacy/expiry_alerts/'),
  
  getReorderSuggestions: () => 
    axiosInstance.get('/api/pharmacy/smart-pharmacy/auto_reorder_suggestions/'),
  
  // ============= TEST & UTILITY =============
  testConnection: () => axiosInstance.get('/api/pharmacy/medicine/').then(() => true).catch(() => false),
};

export default pharmacyApi;