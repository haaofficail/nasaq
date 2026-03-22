const API_BASE = "/api/v1";

// In dev: these come from localStorage after login
// In production: from auth context
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  const token = localStorage.getItem("nasaq_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Dev mode fallback
  const orgId = localStorage.getItem("nasaq_org_id");
  const userId = localStorage.getItem("nasaq_user_id");
  if (orgId) headers["X-Org-Id"] = orgId;
  if (userId) headers["X-User-Id"] = userId;

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers as Record<string, string> },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: any) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data?: any) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: any) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ============================================================
// API FUNCTIONS — organized by module
// ============================================================

// --- Auth ---
export const authApi = {
  requestOtp: (phone: string) => api.post("/auth/otp/request", { phone }),
  verifyOtp: (phone: string, code: string) => api.post<{ token: string; user: any }>("/auth/otp/verify", { phone, code }),
  loginWithEmail: (email: string, password: string) => api.post<{ token: string; user: any }>("/auth/login", { email, password }),
  registerWithEmail: (businessName: string, email: string, password: string, businessType?: string) =>
    api.post<{ token: string; user: any }>("/auth/register", { businessName, email, password, businessType }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/password/change", { currentPassword, newPassword }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<{ data: any }>("/auth/me"),
  sessions: () => api.get<{ data: any[] }>("/auth/sessions"),
};

// --- Categories ---
export const categoriesApi = {
  list: (flat?: boolean) => api.get<{ data: any[]; total: number }>(`/categories${flat ? "?flat=true" : ""}`),
  get: (id: string) => api.get<{ data: any }>(`/categories/${id}`),
  create: (data: any) => api.post<{ data: any }>("/categories", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  reorder: (items: any[]) => api.post("/categories/reorder", { items }),
};

// --- Services ---
export const servicesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; pagination: any }>(`/services${qs}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/services/${id}`),
  create: (data: any) => api.post<{ data: any }>("/services", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
  duplicate: (id: string) => api.post<{ data: any }>(`/services/${id}/duplicate`),
  addMedia: (id: string, data: any) => api.post(`/services/${id}/media`, data),
  removeMedia: (id: string, mediaId: string) => api.delete(`/services/${id}/media/${mediaId}`),
  linkAddon: (id: string, data: any) => api.post(`/services/${id}/addons`, data),
  // Components
  getComponents: (id: string) => api.get<{ data: any[]; totalCost: number }>(`/services/${id}/components`),
  addComponent: (id: string, data: any) => api.post<{ data: any }>(`/services/${id}/components`, data),
  updateComponent: (id: string, compId: string, data: any) => api.put<{ data: any }>(`/services/${id}/components/${compId}`, data),
  deleteComponent: (id: string, compId: string) => api.delete(`/services/${id}/components/${compId}`),
  // Costs
  getCosts: (id: string) => api.get<{ data: any }>(`/services/${id}/costs`),
  updateCosts: (id: string, data: any) => api.put<{ data: any }>(`/services/${id}/costs`, data),
  // Requirements
  getRequirements: (id: string) => api.get<{ data: any[] }>(`/services/${id}/requirements`),
  addRequirement: (id: string, data: any) => api.post<{ data: any }>(`/services/${id}/requirements`, data),
  updateRequirement: (id: string, reqId: string, data: any) => api.put<{ data: any }>(`/services/${id}/requirements/${reqId}`, data),
  deleteRequirement: (id: string, reqId: string) => api.delete(`/services/${id}/requirements/${reqId}`),
};

// --- Addons ---
export const addonsApi = {
  list: () => api.get<{ data: any[] }>("/addons"),
  create: (data: any) => api.post<{ data: any }>("/addons", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/addons/${id}`, data),
  delete: (id: string) => api.delete(`/addons/${id}`),
};

// --- Bookings ---
export const bookingsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; pagination: any }>(`/bookings${qs}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/bookings/${id}`),
  create: (data: any) => api.post<{ data: any }>("/bookings", data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/bookings/${id}/status`, { status, reason }),
  addPayment: (id: string, data: any) => api.post(`/bookings/${id}/payments`, data),
  calendar: (from: string, to: string) => api.get<{ data: any[] }>(`/bookings/calendar/events?from=${from}&to=${to}`),
  stats: (period?: string) => api.get<{ data: any }>(`/bookings/stats/summary?period=${period || "month"}`),
};

// --- Customers ---
export const customersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; pagination: any }>(`/customers${qs}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/customers/${id}`),
  create: (data: any) => api.post<{ data: any }>("/customers", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/customers/${id}`, data),
  addInteraction: (id: string, data: any) => api.post(`/customers/${id}/interactions`, data),
  stats: () => api.get<{ data: any }>("/customers/stats/summary"),
};

// --- Finance ---
export const financeApi = {
  invoices: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/finance/invoices${qs}`); },
  getInvoice: (id: string) => api.get<{ data: any }>(`/finance/invoices/${id}`),
  createInvoice: (data: any) => api.post<{ data: any }>("/finance/invoices", data),
  updateInvoiceStatus: (id: string, status: string) => api.patch<{ data: any }>(`/finance/invoices/${id}/status`, { status }),
  expenses: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/finance/expenses${qs}`); },
  createExpense: (data: any) => api.post<{ data: any }>("/finance/expenses", data),
  updateExpense: (id: string, data: any) => api.put<{ data: any }>(`/finance/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/finance/expenses/${id}`),
  pnl: (period?: string) => api.get<{ data: any }>(`/finance/reports/pnl?period=${period || "month"}`),
  cashflow: () => api.get<{ data: any }>("/finance/reports/cashflow"),
};

// --- Treasury ---
export const treasuryApi = {
  accounts: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/treasury/accounts${qs}`); },
  getAccount: (id: string) => api.get<{ data: any }>(`/treasury/accounts/${id}`),
  createAccount: (data: any) => api.post<{ data: any }>("/treasury/accounts", data),
  updateAccount: (id: string, data: any) => api.patch<{ data: any }>(`/treasury/accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/treasury/accounts/${id}`),
  summary: () => api.get<{ data: any }>("/treasury/accounts/summary"),
  transactions: (accountId: string, params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/treasury/accounts/${accountId}/transactions${qs}`); },
  receipt: (data: any) => api.post<{ data: any; voucherNumber: string }>("/treasury/receipt", data),
  payment: (data: any) => api.post<{ data: any; voucherNumber: string }>("/treasury/payment", data),
  transfer: (data: any) => api.post<{ data: any }>("/treasury/transfer", data),
  transfers: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/treasury/transfers${qs}`); },
  shifts: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/treasury/shifts${qs}`); },
  openShift: (data: any) => api.post<{ data: any }>("/treasury/shifts/open", data),
  closeShift: (id: string, data: any) => api.post<{ data: any }>(`/treasury/shifts/${id}/close`, data),
  dailyReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/treasury/reports/daily${qs}`); },
  cashflow: (months?: number) => api.get<{ data: any[] }>(`/treasury/reports/cashflow?months=${months || 6}`),
};

// --- Accounting ---
export const accountingApi = {
  coa: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/accounting/chart-of-accounts${qs}`); },
  getAccount: (id: string) => api.get<{ data: any }>(`/accounting/chart-of-accounts/${id}`),
  createAccount: (data: any) => api.post<{ data: any }>("/accounting/chart-of-accounts", data),
  updateAccount: (id: string, data: any) => api.patch<{ data: any }>(`/accounting/chart-of-accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/accounting/chart-of-accounts/${id}`),
  periods: () => api.get<{ data: any[] }>("/accounting/periods"),
  createPeriod: (data: any) => api.post<{ data: any }>("/accounting/periods", data),
  closePeriod: (id: string) => api.post<{ data: any }>(`/accounting/periods/${id}/close`, {}),
  lockPeriod: (id: string) => api.post<{ data: any }>(`/accounting/periods/${id}/lock`, {}),
  entries: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/accounting/journal-entries${qs}`); },
  getEntry: (id: string) => api.get<{ data: any }>(`/accounting/journal-entries/${id}`),
  createEntry: (data: any) => api.post<{ data: any }>("/accounting/journal-entries", data),
  postEntry: (id: string) => api.post<{ data: any }>(`/accounting/journal-entries/${id}/post`, {}),
  reverseEntry: (id: string, reason?: string) => api.post<{ data: any }>(`/accounting/journal-entries/${id}/reverse`, { reason }),
  trialBalance: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/trial-balance${qs}`); },
  ledger: (accountId: string, params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/ledger/${accountId}${qs}`); },
  incomeStatement: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/income-statement${qs}`); },
  balanceSheet: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/balance-sheet${qs}`); },
  arAging: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/ar-aging${qs}`); },
  apAging: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/ap-aging${qs}`); },
  cashFlow: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/accounting/reports/cash-flow${qs}`); },
  generateClosingEntries: (periodId: string) => api.post<{ data: any }>(`/accounting/periods/${periodId}/closing-entries`, {}),
};

// --- Reconciliation ---
export const reconciliationApi = {
  list: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/reconciliation${qs}`); },
  get: (id: string) => api.get<{ data: any }>(`/reconciliation/${id}`),
  create: (data: any) => api.post<{ data: any }>("/reconciliation", data),
  update: (id: string, data: any) => api.patch<{ data: any }>(`/reconciliation/${id}`, data),
  delete: (id: string) => api.delete(`/reconciliation/${id}`),
  addItem: (statementId: string, data: any) => api.post<{ data: any }>(`/reconciliation/${statementId}/items`, data),
  updateItem: (statementId: string, itemId: string, data: any) => api.patch<{ data: any }>(`/reconciliation/${statementId}/items/${itemId}`, data),
  deleteItem: (statementId: string, itemId: string) => api.delete(`/reconciliation/${statementId}/items/${itemId}`),
  complete: (id: string) => api.post<{ data: any }>(`/reconciliation/${id}/complete`, {}),
};

// --- Audit Log ---
export const auditLogApi = {
  list: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/audit-log${qs}`); },
  get: (id: string) => api.get<{ data: any }>(`/audit-log/${id}`),
};

export const bundlesApi = {
  list: () => api.get<{ data: any[]; total: number }>("/bundles"),
  get: (id: string) => api.get<{ data: any }>(`/bundles/${id}`),
  create: (data: any) => api.post<{ data: any }>("/bundles", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
  addItem: (bundleId: string, data: any) => api.post<{ data: any }>(`/bundles/${bundleId}/items`, data),
  removeItem: (bundleId: string, itemId: string) => api.delete(`/bundles/${bundleId}/items/${itemId}`),
};

// --- Inventory ---
export const inventoryApi = {
  assetTypes: () => api.get<{ data: any[] }>("/inventory/types"),
  createAssetType: (data: any) => api.post<{ data: any }>("/inventory/types", data),
  updateAssetType: (id: string, data: any) => api.put<{ data: any }>(`/inventory/types/${id}`, data),
  deleteAssetType: (id: string) => api.delete(`/inventory/types/${id}`),
  assets: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/inventory/assets${qs}`); },
  getAsset: (id: string) => api.get<{ data: any }>(`/inventory/assets/${id}`),
  createAsset: (data: any) => api.post<{ data: any }>("/inventory/assets", data),
  updateAsset: (id: string, data: any) => api.put<{ data: any }>(`/inventory/assets/${id}`, data),
  deleteAsset: (id: string) => api.delete(`/inventory/assets/${id}`),
  updateStatus: (id: string, status: string) => api.patch<{ data: any }>(`/inventory/assets/${id}/status`, { status }),
  addMaintenance: (data: any) => api.post<{ data: any }>("/inventory/maintenance", data),
  availability: (date: string, typeId?: string) => api.get<{ data: any }>(`/inventory/availability?date=${date}${typeId ? "&typeId=" + typeId : ""}`),
  report: () => api.get<{ data: any }>("/inventory/reports/summary"),
};

// --- Team ---
export const teamApi = {
  members: () => api.get<{ data: any[] }>("/team/members"),
  tasks: (date?: string) => api.get<{ data: any[] }>(`/team/tasks${date ? "?date=" + date : ""}`),
  updateTask: (id: string, data: any) => api.patch<{ data: any }>(`/team/tasks/${id}`, data),
  shifts: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/team/shifts${qs}`); },
  createShift: (data: any) => api.post<{ data: any }>("/team/shifts", data),
  availability: (date: string) => api.get<{ data: any[] }>(`/team/availability?date=${date}`),
};

// --- Automation ---
export const automationApi = {
  rules: () => api.get<{ data: any[] }>("/automation/rules"),
  createRule: (data: any) => api.post<{ data: any }>("/automation/rules", data),
  updateRule: (id: string, data: any) => api.put<{ data: any }>(`/automation/rules/${id}`, data),
  templates: () => api.get<{ data: any[] }>("/automation/templates"),
  createTemplate: (data: any) => api.post<{ data: any }>("/automation/templates", data),
  logs: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/automation/logs${qs}`); },
};

// --- Marketing ---
export const marketingApi = {
  campaigns: () => api.get<{ data: any[] }>("/marketing/campaigns"),
  createCampaign: (data: any) => api.post<{ data: any }>("/marketing/campaigns", data),
  coupons: () => api.get<{ data: any[] }>("/marketing/coupons"),
  createCoupon: (data: any) => api.post<{ data: any }>("/marketing/coupons", data),
  reviews: (status?: string) => api.get<{ data: any[] }>(`/marketing/reviews${status ? "?status=" + status : ""}`),
  respondReview: (id: string, text: string) => api.patch<{ data: any }>(`/marketing/reviews/${id}/respond`, { responseText: text }),
  roi: () => api.get<{ data: any }>("/marketing/reports/roi"),
  abandonedCarts: () => api.get<{ data: any }>("/marketing/abandoned-carts/stats"),
};

// --- Roles ---
export const rolesApi = {
  list: () => api.get<{ data: any[] }>("/team/roles"),
  create: (data: any) => api.post<{ data: any }>("/team/roles", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/team/roles/${id}`, data),
  updatePermissions: (id: string, permissions: string[]) => api.put<{ data: any }>(`/team/roles/${id}/permissions`, { permissions }),
  delete: (id: string) => api.delete(`/team/roles/${id}`),
};

// --- Attendance (legacy, kept for backwards compat) ---
export const attendanceApi = {
  list: (params?: { date?: string; userId?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.userId) q.set("userId", params.userId);
    return api.get<{ data: any[] }>(`/team/attendance?${q}`);
  },
  summary: (date?: string) => api.get<{ data: any }>(`/team/attendance/summary${date ? "?date=" + date : ""}`),
  checkIn: (data: { userId: string; shiftId?: string; notes?: string }) => api.post<{ data: any }>("/team/attendance/checkin", data),
  checkOut: (id: string) => api.patch<{ data: any }>(`/team/attendance/${id}/checkout`, {}),
};

// --- Attendance Engine v2 ---
export const attendanceEngineApi = {
  daily: (date?: string) => api.get<{ data: any[] }>(`/attendance/daily${date ? "?date=" + date : ""}`),
  summary: (date?: string) => api.get<{ data: any }>(`/attendance/summary${date ? "?date=" + date : ""}`),
  checkIn: (data: { userId?: string; shiftId?: string; source?: string; notes?: string }) =>
    api.post<{ data: any }>("/attendance/checkin", data),
  checkout: (shiftId: string, data?: { source?: string; notes?: string }) =>
    api.patch<{ data: any }>(`/attendance/${shiftId}/checkout`, data || {}),
  manual: (data: { userId: string; date: string; checkIn?: string; checkOut?: string; notes?: string }) =>
    api.post<{ data: any }>("/attendance/manual", data),
  // Schedules
  schedules: () => api.get<{ data: any[] }>("/attendance/schedules"),
  createSchedule: (data: any) => api.post<{ data: any }>("/attendance/schedules", data),
  updateSchedule: (id: string, data: any) => api.put<{ data: any }>(`/attendance/schedules/${id}`, data),
  deleteSchedule: (id: string) => api.delete(`/attendance/schedules/${id}`),
  assignSchedule: (scheduleId: string, data: { userIds: string[]; effectiveFrom?: string }) =>
    api.post<{ data: any }>(`/attendance/schedules/${scheduleId}/assign`, data),
  assignments: () => api.get<{ data: any[] }>("/attendance/assignments"),
  // Policies
  policy: () => api.get<{ data: any }>("/attendance/policies"),
  updatePolicy: (data: any) => api.put<{ data: any }>("/attendance/policies", data),
  // Adjustments
  adjustments: (status?: string) =>
    api.get<{ data: any[] }>(`/attendance/adjustments${status ? "?status=" + status : ""}`),
  createAdjustment: (data: any) => api.post<{ data: any }>("/attendance/adjustments", data),
  approveAdjustment: (id: string, note?: string) =>
    api.patch<{ data: any }>(`/attendance/adjustments/${id}/approve`, { note }),
  rejectAdjustment: (id: string, note?: string) =>
    api.patch<{ data: any }>(`/attendance/adjustments/${id}/reject`, { note }),
  // Reports
  reportDaily: (date?: string) =>
    api.get<{ data: any }>(`/attendance/reports/daily${date ? "?date=" + date : ""}`),
  reportMonthly: (year: number, month: number, userId?: string) =>
    api.get<{ data: any }>(`/attendance/reports/monthly?year=${year}&month=${month}${userId ? "&userId=" + userId : ""}`),
  reportEmployee: (userId: string, from?: string, to?: string) =>
    api.get<{ data: any[] }>(`/attendance/reports/employee?userId=${userId}${from ? "&from=" + from : ""}${to ? "&to=" + to : ""}`),
};

// --- Service Providers ---
export const providersApi = {
  list: () => api.get<{ data: any[] }>("/team/vendors"),
  get: (id: string) => api.get<{ data: any }>(`/team/vendors/${id}`),
  create: (data: any) => api.post<{ data: any }>("/team/vendors", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/team/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/team/vendors/${id}`),
  availability: (id: string, date: string) => api.get<{ data: any }>(`/team/vendors/${id}/availability?date=${date}`),
};

export const questionsApi = {
  list: (serviceId: string) => api.get<{ data: any[] }>(`/services/${serviceId}/questions`),
  create: (serviceId: string, data: any) => api.post<{ data: any }>(`/services/${serviceId}/questions`, data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/services/questions/${id}`, data),
  delete: (id: string) => api.delete(`/services/questions/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) => api.put<{ success: boolean }>("/services/questions/reorder", { items }),
};

export const staffApi = {
  list: () => api.get<{ data: any[] }>("/team/members"),
  get: (id: string) => api.get<{ data: any }>(`/team/members/${id}`),
  create: (data: any) => api.post<{ data: any }>("/team/members", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/team/members/${id}`, data),
  remove: (id: string) => api.delete(`/team/members/${id}`),
};

export const suppliersApi = {
  list: (params?: { category?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    return api.get<{ data: any[] }>(`/suppliers?${q}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/suppliers/${id}`),
  create: (data: any) => api.post<{ data: any }>("/suppliers", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/suppliers/${id}`, data),
  remove: (id: string) => api.delete(`/suppliers/${id}`),
  stats: () => api.get<{ data: any }>("/suppliers/stats"),
  orders: (params?: { supplierId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.supplierId) q.set("supplierId", params.supplierId);
    if (params?.status) q.set("status", params.status);
    return api.get<{ data: any[] }>(`/suppliers/orders?${q}`);
  },
  createOrder: (data: any) => api.post<{ data: any }>("/suppliers/orders", data),
  updateOrder: (id: string, data: any) => api.patch<{ data: any }>(`/suppliers/orders/${id}`, data),
};

export const posApi = {
  transactions: (params?: { date?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.type) q.set("type", params.type);
    return api.get<{ data: any[] }>(`/pos/transactions?${q}`);
  },
  sale: (data: any) => api.post<{ data: any }>("/pos/sale", data),
  refund: (id: string) => api.post<{ data: any }>(`/pos/refund/${id}`, {}),
  settings: () => api.get<{ data: any }>("/pos/settings"),
  updateSettings: (data: any) => api.put<{ data: any }>("/pos/settings", data),
  quickItems: () => api.get<{ data: any[] }>("/pos/quick-items"),
  createQuickItem: (data: any) => api.post<{ data: any }>("/pos/quick-items", data),
  deleteQuickItem: (id: string) => api.delete(`/pos/quick-items/${id}`),
  stats: (date?: string) => api.get<{ data: any }>(`/pos/stats${date ? `?date=${date}` : ""}`),
};

export const onlineOrdersApi = {
  list: (params?: { status?: string; limit?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", params.limit);
    return api.get<{ data: any[] }>(`/online-orders?${q}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/online-orders/${id}`),
  create: (data: any) => api.post<{ data: any }>("/online-orders", data),
  updateStatus: (id: string, status: string) => api.patch<{ data: any }>(`/online-orders/${id}/status`, { status }),
  cancel: (id: string) => api.delete(`/online-orders/${id}`),
  stats: () => api.get<{ data: any }>("/online-orders/stats"),
};

export const auditApi = {
  list: (params?: { resource?: string; search?: string; page?: string; limit?: string }) => {
    const q = new URLSearchParams();
    if (params?.resource) q.set("resource", params.resource);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", params.page);
    if (params?.limit) q.set("limit", params.limit);
    return api.get<{ data: any[] }>(`/approvals/audit-log?${q}`);
  },
};

// --- Flower Builder ---
export const flowerBuilderApi = {
  // Catalog (packaging / gifts / cards / delivery)
  catalog: () => api.get<{ data: { packaging: any[]; gift: any[]; card: any[]; delivery: any[] } }>("/flower-builder/catalog"),
  createItem: (data: any) => api.post<{ data: any }>("/flower-builder/catalog", data),
  updateItem: (id: string, data: any) => api.put<{ data: any }>(`/flower-builder/catalog/${id}`, data),
  deleteItem: (id: string) => api.delete(`/flower-builder/catalog/${id}`),
  // Inventory (available flowers for builder)
  inventory: () => api.get<{ data: any[] }>("/flower-builder/inventory"),
  // Orders
  orders: (params?: { status?: string; page?: string; limit?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", params.page);
    if (params?.limit) q.set("limit", params.limit);
    return api.get<{ data: any[] }>(`/flower-builder/orders?${q}`);
  },
  orderStats: () => api.get<{ data: any }>("/flower-builder/orders/stats"),
  createOrder: (data: any) => api.post<{ data: any }>("/flower-builder/orders", data),
  updateOrderStatus: (id: string, status: string) => api.patch<{ data: any }>(`/flower-builder/orders/${id}/status`, { status }),
  // Page config (authenticated dashboard)
  pageConfig: () => api.get<{ data: any }>("/flower-builder/page-config"),
  updatePageConfig: (config: any) => api.put<{ data: any }>("/flower-builder/page-config", config),
  // Public (no auth — for customers)
  publicCatalog: (slug: string) => fetch(`/api/v1/flower-builder/public/${slug}`).then(r => r.json()),
  publicOrder: (slug: string, data: any) => fetch(`/api/v1/flower-builder/public/${slug}/order`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }).then(r => r.json()),
};

// --- Menu (Restaurant) ---
export const menuApi = {
  categories: () => api.get<{ data: any[] }>("/menu/categories"),
  createCategory: (data: any) => api.post<{ data: any }>("/menu/categories", data),
  updateCategory: (id: string, data: any) => api.put<{ data: any }>(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
  items: (categoryId?: string) => api.get<{ data: any[] }>(`/menu/items${categoryId ? `?categoryId=${categoryId}` : ""}`),
  createItem: (data: any) => api.post<{ data: any }>("/menu/items", data),
  updateItem: (id: string, data: any) => api.put<{ data: any }>(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),
};

// --- Arrangements (Flower Packages) ---
export const arrangementsApi = {
  list: (category?: string) => api.get<{ data: any[] }>(`/arrangements${category ? `?category=${category}` : ""}`),
  stats: () => api.get<{ data: any }>("/arrangements/stats"),
  create: (data: any) => api.post<{ data: any }>("/arrangements", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/arrangements/${id}`, data),
  toggle: (id: string) => api.patch<{ data: any }>(`/arrangements/${id}/toggle`, {}),
  delete: (id: string) => api.delete(`/arrangements/${id}`),
};

// --- Settings ---
export const settingsApi = {
  profile: () => api.get<{ data: any }>("/settings/profile"),
  updateProfile: (data: any) => api.put<{ data: any }>("/settings/profile", data),
  branches: () => api.get<{ data: any[] }>("/settings/locations"),
  createBranch: (data: any) => api.post<{ data: any }>("/settings/locations", data),
  updateBranch: (id: string, data: any) => api.put<{ data: any }>(`/settings/locations/${id}`, data),
  deleteBranch: (id: string) => api.delete(`/settings/locations/${id}`),
  // backward-compat aliases
  locations: () => api.get<{ data: any[] }>("/settings/locations"),
  createLocation: (data: any) => api.post<{ data: any }>("/settings/locations", data),
  updateLocation: (id: string, data: any) => api.put<{ data: any }>(`/settings/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/settings/locations/${id}`),
  subscription: () => api.get<{ data: any }>("/settings/subscription"),
  customLists: () => api.get<{ data: any }>("/settings/custom-lists"),
  updateCustomList: (key: string, values: string[]) => api.put<{ data: any }>("/settings/custom-lists", { key, values }),
  bookingSettings: () => api.get<{ data: any }>("/settings/booking"),
  updateBookingSettings: (data: any) => api.put<{ data: any }>("/settings/booking", data),
};

// --- Website ---
export const websiteApi = {
  pages: () => api.get<{ data: any[] }>("/website/pages"),
  getPage: (slug: string) => api.get<{ data: any }>(`/website/pages/${slug}`),
  createPage: (data: any) => api.post<{ data: any }>("/website/pages", data),
  updatePage: (id: string, data: any) => api.put<{ data: any }>(`/website/pages/${id}`, data),
  deletePage: (id: string) => api.delete(`/website/pages/${id}`),
  config: () => api.get<{ data: any }>("/website/config"),
  updateConfig: (data: any) => api.put<{ data: any }>("/website/config", data),
  blog: () => api.get<{ data: any[] }>("/website/blog"),
  createPost: (data: any) => api.post<{ data: any }>("/website/blog", data),
  updatePost: (id: string, data: any) => api.put<{ data: any }>(`/website/blog/${id}`, data),
  deletePost: (id: string) => api.delete(`/website/blog/${id}`),
  contacts: () => api.get<{ data: any[] }>("/website/contacts"),
  markContactRead: (id: string) => api.patch(`/website/contacts/${id}/read`, {}),
  // Public (no auth)
  publicSite: (orgSlug: string) => fetch(`/api/v1/website/public/${orgSlug}`).then(r => r.json()),
  publicPage: (orgSlug: string, pageSlug: string) => fetch(`/api/v1/website/public/${orgSlug}/page/${pageSlug}`).then(r => r.json()),
  publicBook: (orgSlug: string, data: any) => fetch(`/api/v1/website/public/${orgSlug}/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
};

// --- Public tracking (no auth) ---
export const publicApi = {
  track: (token: string) => fetch(`/api/v1/bookings/track/${token}`).then(r => r.json()),
};

// --- Platform ---
export const platformApi = {
  apiKeys: () => api.get<{ data: any[] }>("/platform/api-keys"),
  createApiKey: (data: any) => api.post<{ data: any }>("/platform/api-keys", data),
  deleteApiKey: (id: string) => api.delete(`/platform/api-keys/${id}`),
  webhooks: () => api.get<{ data: any[] }>("/platform/webhooks"),
  createWebhook: (data: any) => api.post<{ data: any }>("/platform/webhooks", data),
  apps: () => api.get<{ data: any[] }>("/platform/apps"),
  installedApps: () => api.get<{ data: any[] }>("/platform/apps/installed"),
  installApp: (id: string, config?: any) => api.post<{ data: any }>(`/platform/apps/${id}/install`, { config }),
  uninstallApp: (id: string) => api.delete(`/platform/apps/${id}/uninstall`),
};

// --- Messaging (WhatsApp) ---
export const messagingApi = {
  status: () => api.get<{ data: any }>("/messaging/status"),
  connect: () => fetch(`${(api as any).baseUrl || "/api/v1"}/messaging/connect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("nasaq_token")}` },
  }),
  disconnect: () => api.post("/messaging/disconnect"),
  test: (phone: string, message: string) => api.post<{ success: boolean }>("/messaging/test", { phone, message }),
  templates: () => api.get<{ data: Record<string, any[]>; total: number }>("/messaging/templates"),
  updateTemplate: (id: string, data: any) => api.put(`/messaging/templates/${id}`, data),
  resetTemplate: (eventType: string) => api.post(`/messaging/templates/reset/${eventType}`),
  settings: () => api.get<{ data: any }>("/messaging/settings"),
  updateSettings: (data: any) => api.put("/messaging/settings", data),
  logs: (params?: { status?: string; category?: string; date?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.category) q.set("category", params.category);
    if (params?.date) q.set("date", params.date);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return api.get<{ data: any[]; total: number }>(`/messaging/logs?${q}`);
  },
  stats: () => api.get<{ data: any }>("/messaging/stats"),
  variables: () => api.get<{ data: { standard: any[]; custom: any[] } }>("/messaging/variables"),
  addVariable: (data: any) => api.post<{ data: any }>("/messaging/variables", data),
  deleteVariable: (id: string) => api.delete(`/messaging/variables/${id}`),
  sendBulk: (phones: string[], message: string, category?: string) =>
    api.post<{ data: any }>("/messaging/send-bulk", { phones, message, category }),
  schedule: (phone: string, message: string, scheduledAt: string) =>
    api.post<{ data: any }>("/messaging/schedule", { phone, message, scheduledAt }),
};

// --- Hotel ---
export const hotelApi = {
  // Room types
  roomTypes: () => api.get<{ data: any[] }>("/hotel/room-types"),
  createRoomType: (data: any) => api.post<{ data: any }>("/hotel/room-types", data),
  updateRoomType: (id: string, data: any) => api.put<{ data: any }>(`/hotel/room-types/${id}`, data),
  deleteRoomType: (id: string) => api.delete(`/hotel/room-types/${id}`),

  // Room units
  rooms: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[] }>(`/hotel/rooms${qs}`);
  },
  getRoom: (id: string) => api.get<{ data: any }>(`/hotel/rooms/${id}`),
  createRoom: (data: any) => api.post<{ data: any }>("/hotel/rooms", data),
  updateRoom: (id: string, data: any) => api.put<{ data: any }>(`/hotel/rooms/${id}`, data),
  updateRoomStatus: (id: string, data: any) => api.patch<{ data: any }>(`/hotel/rooms/${id}/status`, data),
  deleteRoom: (id: string) => api.delete(`/hotel/rooms/${id}`),

  // Availability
  availability: (checkIn: string, checkOut: string, roomTypeId?: string) => {
    const qs = new URLSearchParams({ checkIn, checkOut });
    if (roomTypeId) qs.set("roomTypeId", roomTypeId);
    return api.get<{ data: any[] }>(`/hotel/availability?${qs}`);
  },

  // Reservations
  reservations: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/hotel/reservations${qs}`);
  },
  getReservation: (id: string) => api.get<{ data: any }>(`/hotel/reservations/${id}`),
  createReservation: (data: any) => api.post<{ data: any }>("/hotel/reservations", data),
  updateReservation: (id: string, data: any) => api.put<{ data: any }>(`/hotel/reservations/${id}`, data),
  checkIn: (id: string) => api.patch<{ data: any }>(`/hotel/reservations/${id}/checkin`, {}),
  checkOut: (id: string, data?: any) => api.patch<{ data: any }>(`/hotel/reservations/${id}/checkout`, data ?? {}),
  cancelReservation: (id: string, reason?: string) => api.patch<{ data: any }>(`/hotel/reservations/${id}/cancel`, { reason }),

  // Housekeeping
  housekeeping: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[] }>(`/hotel/housekeeping${qs}`);
  },
  createHousekeeping: (data: any) => api.post<{ data: any }>("/hotel/housekeeping", data),
  updateHousekeepingStatus: (id: string, data: any) => api.patch<{ data: any }>(`/hotel/housekeeping/${id}/status`, data),

  // Seasonal pricing
  seasonalPricing: () => api.get<{ data: any[] }>("/hotel/seasonal-pricing"),
  createSeasonalPricing: (data: any) => api.post<{ data: any }>("/hotel/seasonal-pricing", data),
  updateSeasonalPricing: (id: string, data: any) => api.put<{ data: any }>(`/hotel/seasonal-pricing/${id}`, data),
  deleteSeasonalPricing: (id: string) => api.delete(`/hotel/seasonal-pricing/${id}`),

  // Stats
  dashboardStats: () => api.get<{ data: any }>("/hotel/dashboard-stats"),
};

// --- Car Rental ---
export const carRentalApi = {
  // Categories
  categories: () => api.get<{ data: any[] }>("/car-rental/categories"),
  createCategory: (data: any) => api.post<{ data: any }>("/car-rental/categories", data),
  updateCategory: (id: string, data: any) => api.put<{ data: any }>(`/car-rental/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/car-rental/categories/${id}`),

  // Vehicles (fleet)
  vehicles: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[] }>(`/car-rental/vehicles${qs}`);
  },
  getVehicle: (id: string) => api.get<{ data: any }>(`/car-rental/vehicles/${id}`),
  createVehicle: (data: any) => api.post<{ data: any }>("/car-rental/vehicles", data),
  updateVehicle: (id: string, data: any) => api.put<{ data: any }>(`/car-rental/vehicles/${id}`, data),
  updateVehicleStatus: (id: string, data: any) => api.patch<{ data: any }>(`/car-rental/vehicles/${id}/status`, data),
  deleteVehicle: (id: string) => api.delete(`/car-rental/vehicles/${id}`),

  // Availability
  availability: (pickupDate: string, returnDate: string, categoryId?: string) => {
    const qs = new URLSearchParams({ pickupDate, returnDate });
    if (categoryId) qs.set("categoryId", categoryId);
    return api.get<{ data: any[] }>(`/car-rental/availability?${qs}`);
  },

  // Reservations
  reservations: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/car-rental/reservations${qs}`);
  },
  getReservation: (id: string) => api.get<{ data: any }>(`/car-rental/reservations/${id}`),
  createReservation: (data: any) => api.post<{ data: any }>("/car-rental/reservations", data),
  updateReservation: (id: string, data: any) => api.put<{ data: any }>(`/car-rental/reservations/${id}`, data),
  pickup: (id: string) => api.patch<{ data: any }>(`/car-rental/reservations/${id}/pickup`, {}),
  return: (id: string, data?: any) => api.patch<{ data: any }>(`/car-rental/reservations/${id}/return`, data ?? {}),
  cancelReservation: (id: string, reason?: string) => api.patch<{ data: any }>(`/car-rental/reservations/${id}/cancel`, { reason }),

  // Inspections
  inspections: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[] }>(`/car-rental/inspections${qs}`);
  },
  createInspection: (data: any) => api.post<{ data: any }>("/car-rental/inspections", data),
  updateInspection: (id: string, data: any) => api.put<{ data: any }>(`/car-rental/inspections/${id}`, data),

  // Stats
  dashboardStats: () => api.get<{ data: any }>("/car-rental/dashboard-stats"),
};

// --- Flower Master Data ---
export const flowerMasterApi = {
  // Variants
  variants: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/flower-master/variants${qs}`);
  },
  getVariant: (id: string, mode?: string) => {
    const qs = mode ? `?mode=${mode}` : "";
    return api.get<{ data: any }>(`/flower-master/variants/${id}${qs}`);
  },
  createVariant: (data: any) => api.post<{ data: any }>("/flower-master/variants", data),
  updateVariant: (id: string, data: any) => api.put<{ data: any }>(`/flower-master/variants/${id}`, data),
  toggleVariant: (id: string) => api.patch<{ data: any }>(`/flower-master/variants/${id}/toggle`, {}),

  // Enums (for dropdowns)
  enums: () => api.get<{ data: any }>("/flower-master/enums"),

  // Batches
  batches: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/flower-master/batches${qs}`);
  },
  expiringBatches: (days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return api.get<{ data: any[] }>(`/flower-master/batches/expiring${qs}`);
  },
  batchesExpiring: (days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return api.get<{ data: any[] }>(`/flower-master/batches/expiring${qs}`);
  },
  fefoBatches: (variantId: string) =>
    api.get<{ data: any[] }>(`/flower-master/batches/fefo/${variantId}`),
  receiveBatch: (data: any) => api.post<{ data: any }>("/flower-master/batches", data),
  updateBatch: (id: string, data: any) => api.patch<{ data: any }>(`/flower-master/batches/${id}`, data),
  consumeBatch: (data: { variantId: string; quantity: number; reason?: string }) =>
    api.post<{ data: any }>("/flower-master/batches/consume", data),

  // Pricing
  pricing: (variantId?: string) => {
    const qs = variantId ? `?variantId=${variantId}` : "";
    return api.get<{ data: any[] }>(`/flower-master/pricing${qs}`);
  },
  setPrice: (data: any) => api.post<{ data: any }>("/flower-master/pricing", data),
  deletePrice: (id: string) => api.delete(`/flower-master/pricing/${id}`),

  // Substitutions
  substitutions: (variantId?: string) => {
    const qs = variantId ? `?variantId=${variantId}` : "";
    return api.get<{ data: any[] }>(`/flower-master/substitutions${qs}`);
  },
  createSubstitution: (data: any) => api.post<{ data: any }>("/flower-master/substitutions", data),
  deleteSubstitution: (id: string) => api.delete(`/flower-master/substitutions/${id}`),

  // Recipes
  recipes: (serviceId?: string) => {
    const qs = serviceId ? `?serviceId=${serviceId}` : "";
    return api.get<{ data: any[] }>(`/flower-master/recipes${qs}`);
  },
  createRecipe: (data: any) => api.post<{ data: any }>("/flower-master/recipes", data),
  deleteRecipe: (id: string) => api.delete(`/flower-master/recipes/${id}`),

  // Reports
  stockReport: () => api.get<{ data: any[] }>("/flower-master/reports/stock"),
  originsReport: () => api.get<{ data: any[] }>("/flower-master/reports/origins"),
  gradesReport: () => api.get<{ data: any[] }>("/flower-master/reports/grades"),
  consumptionReport: () => api.get<{ data: any[] }>("/flower-master/reports/consumption"),
  reportStock: () => api.get<{ data: any[] }>("/flower-master/reports/stock"),
  reportOrigins: () => api.get<{ data: any[] }>("/flower-master/reports/origins"),
  reportGrades: () => api.get<{ data: any[] }>("/flower-master/reports/grades"),
};

// --- Integrations ---
export const integrationsApi = {
  // Provider registry (static)
  providers: (type?: string) => {
    const qs = type ? `?type=${type}` : "";
    return api.get<{ data: any[] }>(`/integrations/providers${qs}`);
  },

  // Configs
  configs: () => api.get<{ data: any[] }>("/integrations/configs"),
  getConfig: (id: string) => api.get<{ data: any }>(`/integrations/configs/${id}`),
  createConfig: (data: any) => api.post<{ data: any }>("/integrations/configs", data),
  updateConfig: (id: string, data: any) => api.put<{ data: any }>(`/integrations/configs/${id}`, data),
  updateConfigStatus: (id: string, status: string) => api.patch<{ data: any }>(`/integrations/configs/${id}/status`, { status }),
  deleteConfig: (id: string) => api.delete(`/integrations/configs/${id}`),

  // Webhook logs
  webhookLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/integrations/webhook-logs${qs}`);
  },

  // Sync jobs
  syncJobs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/integrations/sync-jobs${qs}`);
  },
  triggerSync: (data: any) => api.post<{ data: any }>("/integrations/sync-jobs", data),
};
