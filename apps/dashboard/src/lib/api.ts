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
    const body = await res.json().catch(() => ({ error: "Network error" }));
    const code = body.code ? `[${body.code}]` : `[HTTP_${res.status}]`;
    const rawError = body.error;
    const msg = typeof rawError === "string" ? rawError
      : rawError ? JSON.stringify(rawError)
      : `HTTP ${res.status}`;
    throw new Error(`${code} ${msg}`);
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
  updateMe: (data: { name?: string; email?: string; avatar?: string }) =>
    api.patch<{ data: any }>("/auth/account/update", data),
  sessions: () => api.get<{ data: any[] }>("/auth/sessions"),
  deleteSession: (id: string) => api.delete(`/auth/sessions/${id}`),
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
  linkAddon:   (id: string, data: any) => api.post(`/services/${id}/addons`, data),
  unlinkAddon: (id: string, addonId: string) => api.delete(`/services/${id}/addons/${addonId}`),
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
  // Staff assignment
  listStaff:    (id: string) => api.get<{ data: any[] }>(`/services/${id}/staff`),
  addStaff:     (id: string, data: any) => api.post<{ data: any }>(`/services/${id}/staff`, data),
  updateStaff:  (id: string, userId: string, data: any) => api.put<{ data: any }>(`/services/${id}/staff/${userId}`, data),
  removeStaff:  (id: string, userId: string) => api.delete(`/services/${id}/staff/${userId}`),
  // Barcode
  lookupByBarcode: (barcode: string) => api.get<{ data: any }>(`/services/lookup/barcode/${encodeURIComponent(barcode)}`),
  generateBarcode: (id: string) => api.post<{ data: { id: string; barcode: string } }>(`/services/${id}/generate-barcode`),
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
  reschedule: (id: string, data: { eventDate: string; eventEndDate?: string; assignedUserId?: string | null; reason?: string; notes?: string }) =>
    api.patch<{ data: any }>(`/bookings/${id}/reschedule`, data),
  addPayment: (id: string, data: any) => api.post(`/bookings/${id}/payments`, data),
  calendar: (from: string, to: string) => api.get<{ data: any[] }>(`/bookings/calendar/events?from=${from}&to=${to}`),
  stats: (period?: string) => api.get<{ data: any }>(`/bookings/stats/summary?period=${period || "month"}`),
  trend: (months?: number) => api.get<{ data: any[] }>(`/bookings/stats/trend?months=${months || 6}`),
  growth: (period?: string) => api.get<{ data: any }>(`/bookings/stats/growth?period=${period || "month"}`),
  events: (id: string) => api.get<{ data: any[] }>(`/bookings/${id}/events`),
  createPaymentLink: (id: string) => api.post<{ data: { transactionUrl: string | null; paymentId: string } }>(`/billing/booking-payment`, { bookingId: id }),
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
  messageLogs: (phone: string) => api.get<{ data: any[] }>(`/messaging/logs?phone=${encodeURIComponent(phone)}&limit=50`),
};

// --- Finance ---
export const financeApi = {
  invoices: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; pagination: any }>(`/finance/invoices${qs}`); },
  getInvoice: (id: string) => api.get<{ data: any }>(`/finance/invoices/${id}`),
  createInvoice: (data: any) => api.post<{ data: any }>("/finance/invoices", data),
  updateInvoiceStatus: (id: string, status: string) => api.patch<{ data: any }>(`/finance/invoices/${id}/status`, { status }),
  invoiceStats: () => api.get<{ data: any }>("/finance/invoices/stats"),
  importBooking: (bookingId: string) => api.get<{ data: any }>(`/finance/invoices/import-booking/${bookingId}`),
  invoicePayments: (id: string) => api.get<{ data: any[] }>(`/finance/invoices/${id}/payments`),
  addInvoicePayment: (id: string, data: any) => api.post<{ data: any }>(`/finance/invoices/${id}/payments`, data),
  sendInvoice: (id: string) => api.post<{ data: { email: boolean; whatsapp: boolean } }>(`/finance/invoices/${id}/send`, {}),
  expenses: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/finance/expenses${qs}`); },
  createExpense: (data: any) => api.post<{ data: any }>("/finance/expenses", data),
  updateExpense: (id: string, data: any) => api.put<{ data: any }>(`/finance/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/finance/expenses/${id}`),
  pnl: (period?: string) => api.get<{ data: any }>(`/finance/reports/pnl?period=${period || "month"}`),
  cashflow: () => api.get<{ data: any }>("/finance/reports/cashflow"),
  commissionSummary: (year: number, month: number) => api.get<{ data: any[] }>(`/finance/commission-summary?year=${year}&month=${month}`),
  salesReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/sales${qs}`); },
  paymentsReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/payments${qs}`); },
  expensesReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/expenses${qs}`); },
  collectionReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/collection${qs}`); },
  bookingSalesReport:  (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/booking-sales${qs}`); },
  commissionsReport:   (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/commissions${qs}`); },
  refundsReport:       (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/refunds${qs}`); },
  subscriptionsReport: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/subscriptions${qs}`); },
  peakTimesReport:     (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/peak-times${qs}`); },
  providersReport:     (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/providers${qs}`); },
  cashCloseReport:     (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/cash-close${qs}`); },
  attendanceReport:    (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/attendance${qs}`); },
  visitorsReport:      (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any }>(`/finance/reports/visitors${qs}`); },
  // Payment gateways
  gateways:            () => api.get<{ data: any[] }>("/finance/gateways"),
  createGateway:       (data: any) => api.post<{ data: any }>("/finance/gateways", data),
  updateGateway:       (id: string, data: any) => api.put<{ data: any }>(`/finance/gateways/${id}`, data),
  gatewayCredentials:  (id: string) => api.get<{ data: any }>(`/finance/gateways/${id}/credentials`),
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
  initChartOfAccounts: () => api.post<{ success: boolean; message: string }>("/accounting/init-chart-of-accounts", {}),
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
  list: (params?: { resource?: string; resourceId?: string; search?: string; action?: string; page?: string; limit?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.resource)   q.set("resource",   params.resource);
    if (params?.resourceId) q.set("resourceId", params.resourceId);
    if (params?.search)     q.set("search",     params.search);
    if (params?.action)     q.set("action",     params.action);
    if (params?.page)       q.set("page",       params.page);
    if (params?.limit)      q.set("limit",      params.limit);
    if (params?.from)       q.set("from",       params.from);
    if (params?.to)         q.set("to",         params.to);
    return api.get<{ data: any[]; pagination: any }>(`/audit-log?${q}`);
  },
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
  sell: (bundleId: string, data: { customerId: string; startDate?: string }) =>
    api.post<{ data: any[]; count: number }>(`/bundles/${bundleId}/sell`, data),
  subscriptions: (params?: { status?: string; customerId?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return api.get<{ data: any[] }>(`/bundles/subscriptions${qs}`);
  },
  updateSubscriptionStatus: (id: string, status: string) =>
    api.patch<{ data: any }>(`/bundles/subscriptions/${id}/status`, { status }),
};

// --- Media Library (DAM) ---
export const mediaApi = {
  list:       (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[]; total: number; page: number; pages: number }>(`/media${qs}`); },
  get:        (id: string)   => api.get<{ data: any }>(`/media/${id}`),
  categories: ()             => api.get<{ data: string[] }>("/media/categories"),
  tags:       ()             => api.get<{ data: string[] }>("/media/tags"),
  stats:      () => api.get<{ data: any }>("/media/stats"),
  presigned:  (data: { filename: string; contentType: string; category?: string }) =>
    api.post<{ data: any }>("/media/presigned", data),
  confirm:    (data: any)    => api.post<{ data: any }>("/media/confirm", data),
  update:     (id: string, data: any) => api.patch<{ data: any }>(`/media/${id}`, data),
  delete:     (id: string)   => api.delete<{ data: any }>(`/media/${id}`),
  bulkDelete: (ids: string[]) => api.post<{ data: any }>("/media/bulk-delete", { ids }),
  replace:    (id: string, data: any) => api.post<{ data: any }>(`/media/${id}/replace`, data),
  confirmReplace: (id: string, data: any) => api.post<{ data: any }>(`/media/${id}/confirm-replace`, data),
  upload: (formData: FormData, onProgress?: (pct: number) => void): Promise<{ data: any }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/v1/media/upload`);
      const token  = localStorage.getItem("nasaq_token");
      const orgId  = localStorage.getItem("nasaq_org_id");
      const userId = localStorage.getItem("nasaq_user_id");
      if (token)  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      if (orgId)  xhr.setRequestHeader("X-Org-Id", orgId);
      if (userId) xhr.setRequestHeader("X-User-Id", userId);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status < 300) { resolve(JSON.parse(xhr.responseText)); return; }
        try { const e = JSON.parse(xhr.responseText); reject(new Error(e.error || `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    }),
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
  moveAsset: (id: string, data: any) => api.post<{ data: any }>(`/inventory/assets/${id}/move`, data),
  returnAsset: (id: string, data?: any) => api.post<{ data: any }>(`/inventory/assets/${id}/return`, data ?? {}),
  assetMovements: (id: string) => api.get<{ data: any[]; total: number }>(`/inventory/assets/${id}/movements`),
  addMaintenance: (data: any) => api.post<{ data: any }>("/inventory/maintenance", data),
  availability: (date: string, typeId?: string) => api.get<{ data: any }>(`/inventory/availability?date=${date}${typeId ? "&typeId=" + typeId : ""}`),
  report: () => api.get<{ data: any }>("/inventory/reports/summary"),
  // Inventory products (consumables)
  products: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/inventory/products${qs}`); },
  createProduct: (data: any) => api.post<{ data: any }>("/inventory/products", data),
  updateProduct: (id: string, data: any) => api.put<{ data: any }>(`/inventory/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/inventory/products/${id}`),
  adjustStock: (id: string, data: any) => api.post<{ data: any }>(`/inventory/products/${id}/adjust`, data),
  stockMovements: (productId?: string) => api.get<{ data: any[] }>(`/inventory/products/movements${productId ? "?productId=" + productId : ""}`),
};

// --- Fulfillments (warehouse lifecycle) ---
export const fulfillmentsApi = {
  list: (params?: Record<string, string>) => { const qs = params ? "?" + new URLSearchParams(params).toString() : ""; return api.get<{ data: any[] }>(`/fulfillments${qs}`); },
  get: (id: string) => api.get<{ data: any }>(`/fulfillments/${id}`),
  create: (data: any) => api.post<{ data: any }>("/fulfillments", data),
  advanceStage: (id: string, data?: any) => api.patch<{ data: any }>(`/fulfillments/${id}/stage`, data ?? {}),
  addAllocation: (id: string, data: any) => api.post<{ data: any }>(`/fulfillments/${id}/allocations`, data),
  removeAllocation: (id: string, allocId: string) => api.delete(`/fulfillments/${id}/allocations/${allocId}`),
  updateAllocation: (id: string, allocId: string, data: any) => api.patch<{ data: any }>(`/fulfillments/${id}/allocations/${allocId}`, data),
  stats: () => api.get<{ data: any[] }>("/fulfillments/stats/summary"),
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
  // WhatsApp Templates
  whatsappTemplates: () => api.get<{ data: any[] }>("/automation/whatsapp-templates"),
  createWhatsappTemplate: (data: any) => api.post<{ data: any }>("/automation/whatsapp-templates", data),
  updateWhatsappTemplate: (id: string, data: any) => api.put<{ data: any }>(`/automation/whatsapp-templates/${id}`, data),
  deleteWhatsappTemplate: (id: string) => api.delete<{ data: any }>(`/automation/whatsapp-templates/${id}`),
  testWhatsappTemplate: (id: string, phone: string) => api.post<{ data: any }>(`/automation/whatsapp-templates/${id}/test`, { phone }),
  // WhatsApp Connection
  whatsappConnection: () => api.get<{ data: any }>("/automation/whatsapp-connection"),
  saveApiConnection: (data: { phoneId: string; accessToken: string; webhookVerify?: string }) =>
    api.post<{ data: any }>("/automation/whatsapp-connection/api", data),
  startQrSession: () => api.post<{ data: any }>("/automation/whatsapp-connection/qr/start", {}),
  disconnectWhatsapp: () => api.delete<{ data: any }>("/automation/whatsapp-connection"),
  testSendWhatsapp: (phone: string, message?: string) =>
    api.post<{ data: any }>("/automation/whatsapp-connection/test-send", { phone, message }),
};

// --- Marketing ---
export const marketingApi = {
  // Campaigns
  campaigns: () => api.get<{ data: any[] }>("/marketing/campaigns"),
  createCampaign: (data: any) => api.post<{ data: any }>("/marketing/campaigns", data),
  updateCampaign: (id: string, data: any) => api.patch<{ data: any }>(`/marketing/campaigns/${id}`, data),
  deleteCampaign: (id: string) => api.delete(`/marketing/campaigns/${id}`),
  sendCampaign: (id: string) => api.patch<{ data: any }>(`/marketing/campaigns/${id}/send`, {}),
  // Coupons
  coupons: () => api.get<{ data: any[] }>("/marketing/coupons/all"),
  createCoupon: (data: any) => api.post<{ data: any }>("/marketing/coupons", data),
  updateCoupon: (id: string, data: any) => api.patch<{ data: any }>(`/marketing/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/marketing/coupons/${id}`),
  // Reviews
  reviews: (status?: string) => api.get<{ data: any[] }>(`/marketing/reviews${status ? "?status=" + status : ""}`),
  reviewStats: () => api.get<{ data: any }>("/marketing/reviews/stats"),
  respondReview: (id: string, text: string) => api.patch<{ data: any }>(`/marketing/reviews/${id}/respond`, { responseText: text }),
  toggleReviewVisibility: (id: string) => api.patch<{ data: any }>(`/marketing/reviews/${id}/visibility`, {}),
  updateReviewStatus: (id: string, status: string) => api.patch<{ data: any }>(`/marketing/reviews/${id}/status`, { status }),
  deleteReview: (id: string) => api.delete(`/marketing/reviews/${id}`),
  requestReview: (data: { phone: string; customerName?: string; bookingId?: string }) => api.post<{ data: any }>("/marketing/reviews/request", data),
  roi: () => api.get<{ data: any }>("/marketing/reports/roi"),
  // Segments
  segments: () => api.get<{ data: any[] }>("/marketing/segments"),
  createSegment: (data: any) => api.post<{ data: any }>("/marketing/segments", data),
  updateSegment: (id: string, data: any) => api.patch<{ data: any }>(`/marketing/segments/${id}`, data),
  deleteSegment: (id: string) => api.delete(`/marketing/segments/${id}`),
  segmentPreview: (id: string) => api.get<{ data: { count: number; sample: any[] } }>(`/marketing/segments/${id}/preview`),
  // Abandoned Carts
  abandonedCarts: () => api.get<{ data: any }>("/marketing/abandoned-carts/stats"),
  abandonedCartsStats: () => api.get<{ data: any }>("/marketing/abandoned-carts/stats"),
  abandonedCartsList: (status?: string) => api.get<{ data: any[] }>(`/marketing/abandoned-carts${status ? "?status=" + status : ""}`),
  updateAbandonedCartStatus: (id: string, status: string) => api.patch<{ data: any }>(`/marketing/abandoned-carts/${id}/status`, { status }),
};

// --- Roles (legacy) ---
export const rolesApi = {
  list: () => api.get<{ data: any[] }>("/team/roles"),
  create: (data: any) => api.post<{ data: any }>("/team/roles", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/team/roles/${id}`, data),
  updatePermissions: (id: string, permissions: string[]) => api.put<{ data: any }>(`/team/roles/${id}/permissions`, { permissions }),
  delete: (id: string) => api.delete(`/team/roles/${id}`),
};

// --- Job Titles (RBAC v2) ---
export const jobTitlesApi = {
  list: () => api.get<{ data: any[] }>("/job-titles"),
  get: (id: string) => api.get<{ data: any }>(`/job-titles/${id}`),
  create: (data: any) => api.post<{ data: any }>("/job-titles", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/job-titles/${id}`, data),
  delete: (id: string) => api.delete(`/job-titles/${id}`),
  reorder: (items: Array<{ id: string; sortOrder: number }>) => api.post("/job-titles/reorder", { items }),
  getPermissions: (id: string) => api.get<{ data: any }>(`/job-titles/${id}/permissions`),
  savePermissions: (id: string, permissions: string[]) => api.put(`/job-titles/${id}/permissions`, { permissions }),
};

// --- Org Members (RBAC v2) ---
export const membersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[]; total: number }>(`/members${qs}`);
  },
  get: (id: string) => api.get<{ data: any }>(`/members/${id}`),
  create: (data: any) => api.post<{ data: any }>("/members", data),
  update: (id: string, data: any) => api.put<{ data: any }>(`/members/${id}`, data),
  changeStatus: (id: string, status: string) => api.patch(`/members/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/members/${id}`),
  available: () => api.get<{ data: any[] }>("/members/available"),
};

// --- Delivery (RBAC v2) ---
export const deliveryApi = {
  partners: (showInactive?: boolean) => api.get<{ data: any[] }>(`/delivery/partners${showInactive ? "?showInactive=true" : ""}`),
  createPartner: (data: any) => api.post<{ data: any }>("/delivery/partners", data),
  updatePartner: (id: string, data: any) => api.put<{ data: any }>(`/delivery/partners/${id}`, data),
  deletePartner: (id: string) => api.delete(`/delivery/partners/${id}`),
  drivers: () => api.get<{ data: any }>("/delivery/drivers"),
  assignments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ data: any[] }>(`/delivery/assignments${qs}`);
  },
  createAssignment: (data: any) => api.post<{ data: any }>("/delivery/assignments", data),
  updateStatus: (id: string, status: string, extra?: any) =>
    api.patch(`/delivery/assignments/${id}/status`, { status, ...extra }),
  stats: () => api.get<{ data: any }>("/delivery/stats"),
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


export const posApi = {
  transactions: (params?: { date?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.type) q.set("type", params.type);
    return api.get<{ data: any[] }>(`/pos/transactions?${q}`);
  },
  today: () => api.get<{ data: any[] }>("/pos/today"),
  sale: (data: any) => api.post<{ data: { transaction: any; invoice: any } }>("/pos/sale", data),
  splitSale: (data: any) => api.post<{ data: any }>("/pos/sale/split", data),
  refund: (id: string, reason?: string) => api.post<{ data: any }>(`/pos/sale/${id}/refund`, { reason }),
  settings: () => api.get<{ data: any }>("/pos/settings"),
  updateSettings: (data: any) => api.put<{ data: any }>("/pos/settings", data),
  quickItems: () => api.get<{ data: any[] }>("/pos/quick-items"),
  createQuickItem: (data: any) => api.post<{ data: any }>("/pos/quick-items", data),
  deleteQuickItem: (id: string) => api.delete(`/pos/quick-items/${id}`),
  stats: (date?: string) => api.get<{ data: any }>(`/pos/stats${date ? `?date=${date}` : ""}`),
  lookupByBarcode: (barcode: string) => api.get<{ data: any }>(`/pos/barcode/${encodeURIComponent(barcode)}`),
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
    return api.get<{ data: any[]; total: number }>(`/approvals/audit-log?${q}`);
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
  context: () => api.get<{ data: any }>("/settings/context"),
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
  // Onboarding
  updateOnboardingStep: (step: string) => api.patch<{ data: any }>("/settings/onboarding-step", { step }),
  seedDemo: () => api.post<{ data: any }>("/settings/seed-demo"),
  clearDemo: () => api.delete("/settings/demo-data"),
};

// --- Organization Subscription & Stats ---
export const orgSubscriptionApi = {
  get:            ()                              => api.get<{ data: any }>("/organization/subscription"),
  addons:         ()                              => api.get<{ data: any[] }>("/organization/subscription/addons"),
  history:        ()                              => api.get<{ data: any[] }>("/organization/subscription/history"),
  orders:         ()                              => api.get<{ data: any[] }>("/organization/subscription/orders"),
  requestAddon:   (addonKey: string)              => api.post<{ data: any }>("/organization/subscription/request-addon", { addonKey }),
  upgrade:        (planKey: string)               => api.post<{ data: any }>("/organization/subscription/upgrade", { planKey }),
  renew:          ()                              => api.post<{ data: any }>("/organization/subscription/renew", {}),
  purchaseAddon:  (addonKey: string)              => api.post<{ data: any }>("/organization/subscription/addons/purchase", { addonKey }),
  confirmPayment: (orderId: string, paymentRef?: string) => api.post<{ data: any }>("/organization/subscription/confirm-payment", { orderId, paymentRef }),
};

export const orgStatsApi = {
  summary: ()                     => api.get<{ data: any }>("/organization/stats/summary"),
  sales:   (period?: "today"|"week") => api.get<{ data: any[] }>(`/organization/stats/sales?period=${period ?? "week"}`),
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
  templates: () => api.get<{ data: any[] }>("/website/templates"),
  publish: () => api.post("/website/publish", {}),
  unpublish: () => api.post("/website/unpublish", {}),
  analytics: () => api.get<{ data: any }>("/website/analytics"),
  // Public (no auth)
  publicSite: (orgSlug: string) => fetch(`/api/v1/website/public/${orgSlug}`).then(r => r.json()),
  publicPage: (orgSlug: string, pageSlug: string) => fetch(`/api/v1/website/public/${orgSlug}/page/${pageSlug}`).then(r => r.json()),
  publicBook: (orgSlug: string, data: any) => fetch(`/api/v1/website/public/${orgSlug}/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
};

// --- Public tracking (no auth) ---
export const publicApi = {
  track: (token: string) => fetch(`/api/v1/bookings/track/${token}`).then(r => r.json()),
  createPaymentLink: (token: string) =>
    fetch(`/api/v1/bookings/track/${token}/payment`, { method: "POST", headers: { "Content-Type": "application/json" } }).then(r => r.json()),
};

// --- Marketplace (سوق نسق) ---
export const marketplaceApi = {
  // Public (no auth)
  browse: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => !!v)).toString() : "";
    return fetch(`/api/v1/marketplace${qs}`).then(r => r.json()) as Promise<{ data: any[]; total: number }>;
  },
  categories: () => fetch("/api/v1/marketplace/categories").then(r => r.json()) as Promise<{ data: string[] }>,
  submitRfp: (data: any) =>
    fetch("/api/v1/marketplace/rfp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  // Authenticated
  myListings:    ()           => api.get<{ data: any[] }>("/marketplace/my-listings"),
  addListing:    (data: any)  => api.post<{ data: any }>("/marketplace/listings", data),
  removeListing: (id: string) => api.delete(`/marketplace/listings/${id}`),
  // RFP
  listRfp:       (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<{ data: any[]; limit: number; offset: number }>(`/marketplace/rfp${params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : ""}`),
  propose:       (rfpId: string, data: any) => api.post<{ data: any }>(`/marketplace/rfp/${rfpId}/propose`, data),
  myProposals:   ()           => api.get<{ data: any[] }>("/marketplace/rfp/my-proposals"),
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
  intelligence: () => api.get<{ data: any }>("/flower-master/reports/intelligence"),
};

// --- Rental ---
export const rentalApi = {
  // Contracts
  contracts: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    return api.get<{ data: any[] }>(`/rental/contracts?${q}`);
  },
  getContract: (id: string) => api.get<{ data: any }>(`/rental/contracts/${id}`),
  createContract: (data: any) => api.post<{ data: any }>("/rental/contracts", data),
  updateContract: (id: string, data: any) => api.patch<{ data: any }>(`/rental/contracts/${id}`, data),
  deleteContract: (id: string) => api.delete(`/rental/contracts/${id}`),
  contractStats: () => api.get<{ data: any }>("/rental/contracts/stats"),

  // Contract assets
  addContractAsset: (contractId: string, data: any) =>
    api.post<{ data: any }>(`/rental/contracts/${contractId}/assets`, data),
  removeContractAsset: (contractId: string, assetRowId: string) =>
    api.delete(`/rental/contracts/${contractId}/assets/${assetRowId}`),

  // Inspections
  inspections: (params?: { contractId?: string; damageOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.contractId) q.set("contractId", params.contractId);
    if (params?.damageOnly) q.set("damageOnly", "true");
    return api.get<{ data: any[] }>(`/rental/inspections?${q}`);
  },
  createInspection: (data: any) => api.post<{ data: any }>("/rental/inspections", data),
  recoverDamage: (id: string) => api.patch<{ data: any }>(`/rental/inspections/${id}/recover`, {}),

  // Analytics
  analytics: () => api.get<{ data: any }>("/rental/analytics"),
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

  // Gen 2: registry-based integrations
  available: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return api.get<{ data: any[] }>(`/integrations/available${qs}`);
  },
  connected: () => api.get<{ data: any[] }>("/integrations/connected"),
  connect: (data: { provider: string; credentials: Record<string, string>; config?: Record<string, unknown> }) =>
    api.post<{ data: any }>("/integrations/connect", data),
  test: (id: string) => api.post<{ ok: boolean; message?: string }>(`/integrations/${id}/test`, {}),
  disconnect: (id: string) => api.delete<{ success: boolean }>(`/integrations/${id}`),
  logs: (id: string, params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit)  q.set("limit",  String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return api.get<{ data: any[]; total: number }>(`/integrations/${id}/logs?${q}`);
  },
};

// --- Restaurant Intelligence ---
export const restaurantApi = {
  // Tables
  tables: () => api.get<{ data: any[] }>("/restaurant/tables"),
  createTable: (data: any) => api.post<{ data: any }>("/restaurant/tables", data),
  updateTable: (id: string, data: any) => api.put<{ data: any }>(`/restaurant/tables/${id}`, data),
  deleteTable: (id: string) => api.delete(`/restaurant/tables/${id}`),
  setTableStatus: (id: string, status: string) => api.patch<{ data: any }>(`/restaurant/tables/${id}/status`, { status }),
  seatGuests: (tableId: string, data: any) => api.post<{ data: any }>(`/restaurant/tables/${tableId}/seat`, data),
  closeSession: (sessionId: string) => api.patch<{ data: any }>(`/restaurant/sessions/${sessionId}/close`, {}),

  // Menu 86 toggle
  toggleAvailability: (itemId: string) => api.patch<{ data: any }>(`/restaurant/menu-items/${itemId}/toggle-availability`, {}),

  // Loyalty
  loyalty: (search?: string) => api.get<{ data: any[] }>(`/restaurant/loyalty${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getLoyalty: (customerId: string) => api.get<{ data: any }>(`/restaurant/loyalty/${customerId}`),
  addStamp: (customerId: string, count?: number, stampsGoal?: number) =>
    api.post<{ data: any }>(`/restaurant/loyalty/${customerId}/stamp`, { count: count || 1, stampsGoal }),
  redeemReward: (customerId: string) => api.post<{ data: any }>(`/restaurant/loyalty/${customerId}/redeem`, {}),

  // Ingredients / cost cards
  ingredients: (itemId: string) => api.get<{ data: any[] }>(`/restaurant/ingredients/${itemId}`),
  addIngredient: (itemId: string, data: any) => api.post<{ data: any }>(`/restaurant/ingredients/${itemId}`, data),
  deleteIngredient: (id: string) => api.delete(`/restaurant/ingredients/${id}`),

  // Analytics
  analytics: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to)   q.set("to", to);
    return api.get<{ data: any }>(`/restaurant/analytics?${q}`);
  },

  // Booking settings
  bookingSettings: () => api.get<{ data: { sections: any[]; config: any } }>("/restaurant/booking-settings"),
  updateBookingSettings: (data: any) => api.put<{ data: any }>("/restaurant/booking-settings", data),
  createSection: (data: any) => api.post<{ data: any }>("/restaurant/sections", data),
  updateSection: (id: string, data: any) => api.put<{ data: any }>(`/restaurant/sections/${id}`, data),
  toggleSection: (id: string) => api.patch<{ data: any }>(`/restaurant/sections/${id}/toggle`, {}),
  deleteSection: (id: string) => api.delete(`/restaurant/sections/${id}`),
};

// --- Salon Intelligence ---
export const salonApi = {
  // Supplies
  supplies: (params?: { category?: string; lowStock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.lowStock) q.set("lowStock", "true");
    return api.get<{ data: any[] }>(`/salon/supplies?${q}`);
  },
  lowStock: () => api.get<{ data: any[]; count: number }>("/salon/supplies/low-stock"),
  getSupply: (id: string) => api.get<{ data: any }>(`/salon/supplies/${id}`),
  createSupply: (data: any) => api.post<{ data: any }>("/salon/supplies", data),
  updateSupply: (id: string, data: any) => api.patch<{ data: any }>(`/salon/supplies/${id}`, data),
  deleteSupply: (id: string) => api.delete(`/salon/supplies/${id}`),
  adjust: (id: string, delta: string, reason: string, notes?: string) =>
    api.post<{ data: any }>(`/salon/supplies/${id}/adjust`, { delta, reason, notes }),

  // Service Recipes
  recipes: (serviceId?: string) =>
    api.get<{ data: any[] }>(`/salon/recipes${serviceId ? `?serviceId=${serviceId}` : ""}`),
  addRecipe: (data: { serviceId: string; supplyId: string; quantity: string; notes?: string }) =>
    api.post<{ data: any }>("/salon/recipes", data),
  deleteRecipe: (id: string) => api.delete(`/salon/recipes/${id}`),

  // Client Beauty Profile
  beautyProfile: (customerId: string) =>
    api.get<{ data: { profile: any; recentVisits: any[] } }>(`/salon/beauty-profile/${customerId}`),
  saveBeautyProfile: (customerId: string, data: any) =>
    api.put<{ data: any }>(`/salon/beauty-profile/${customerId}`, data),

  // Visit Notes
  visitNotes: (bookingId: string) =>
    api.get<{ data: any[] }>(`/salon/visit-notes/${bookingId}`),
  saveVisitNote: (bookingId: string, data: any) =>
    api.post<{ data: any }>(`/salon/visit-notes/${bookingId}`, data),

  // Staff Performance
  staffPerformance: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to)   q.set("to", to);
    return api.get<{ data: any[] }>(`/salon/staff-performance?${q}`);
  },

  // Recall Engine
  recall: (serviceInterval?: number) =>
    api.get<{ data: any[]; weeks: number }>(`/salon/recall${serviceInterval ? `?serviceInterval=${serviceInterval}` : ""}`),
};

// --- Super Admin ---
export const adminApi = {
  stats: () => api.get<{ data: any }>("/admin/stats"),
  orgs: (params?: { q?: string; status?: string; plan?: string; businessType?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.status) q.set("status", params.status);
    if (params?.plan) q.set("plan", params.plan);
    if (params?.businessType) q.set("businessType", params.businessType);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return api.get<{ data: any[]; pagination: any }>(`/admin/orgs?${q}`);
  },
  getOrg: (id: string) => api.get<{ data: any }>(`/admin/orgs/${id}`),
  updateOrg: (id: string, data: any) => api.patch<{ data: any }>(`/admin/orgs/${id}`, data),
  verifyOrg: (id: string) => api.post<{ data: any }>(`/admin/orgs/${id}/verify`),
  suspendOrg: (id: string, reason?: string) => api.post<{ data: any }>(`/admin/orgs/${id}/suspend`, { reason }),
  unsuspendOrg: (id: string) => api.post<{ data: any }>(`/admin/orgs/${id}/unsuspend`),

  users: (params?: { q?: string; orgId?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.orgId) q.set("orgId", params.orgId);
    if (params?.page) q.set("page", String(params.page));
    return api.get<{ data: any[]; pagination: any }>(`/admin/users?${q}`);
  },
  makeSuperAdmin: (id: string) => api.post<{ data: any }>(`/admin/users/${id}/make-super-admin`),
  revokeSuperAdmin: (id: string) => api.post<{ data: any }>(`/admin/users/${id}/revoke-super-admin`),

  impersonate: (orgId: string) => api.post<{ data: any }>(`/admin/impersonate/${orgId}`),

  documents: (params?: { status?: string; orgId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.orgId) q.set("orgId", params.orgId);
    return api.get<{ data: any[] }>(`/admin/documents?${q}`);
  },
  createDocument: (data: any) => api.post<{ data: any }>("/admin/documents", data),
  updateDocument: (id: string, data: any) => api.patch<{ data: any }>(`/admin/documents/${id}`, data),

  tickets: (params?: { status?: string; priority?: string; orgId?: string; category?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status)   q.set("status",   params.status);
    if (params?.priority) q.set("priority", params.priority);
    if (params?.orgId)    q.set("orgId",    params.orgId);
    if (params?.category) q.set("category", params.category);
    if (params?.page)     q.set("page",     String(params.page));
    return api.get<{ data: any[]; stats: Record<string, number>; pagination: any }>(`/admin/tickets?${q}`);
  },
  getTicket:    (id: string)         => api.get<{ data: any }>(`/admin/tickets/${id}`),
  createTicket: (data: any)          => api.post<{ data: any }>("/admin/tickets", data),
  updateTicket: (id: string, data: any) => api.patch<{ data: any }>(`/admin/tickets/${id}`, data),
  replyTicket:  (id: string, message: string) => api.post<{ data: any }>(`/admin/tickets/${id}/reply`, { message }),

  announcements: () => api.get<{ data: any[] }>("/admin/announcements"),
  createAnnouncement: (data: any) => api.post<{ data: any }>("/admin/announcements", data),
  updateAnnouncement: (id: string, data: any) => api.patch<{ data: any }>(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/admin/announcements/${id}`),

  auditLog: (params?: { page?: number; action?: string; targetType?: string; adminId?: string; fromDate?: string; toDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.action) q.set("action", params.action);
    if (params?.targetType) q.set("targetType", params.targetType);
    if (params?.adminId) q.set("adminId", params.adminId);
    if (params?.fromDate) q.set("fromDate", params.fromDate);
    if (params?.toDate) q.set("toDate", params.toDate);
    return api.get<{ data: any[]; pagination: any }>(`/admin/audit-log?${q}`);
  },
  debugOtp: (phone?: string) => api.get<{ data: any[]; smsEnabled: boolean }>(`/admin/debug/otp${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`),
  system: () => api.get<{ data: any }>("/admin/system"),
  systemErrors: (limit = 50) => api.get<{ data: any[] }>(`/admin/system/errors?limit=${limit}`),
  diagnostics: () => api.get<{ data: any }>("/admin/system/diagnostics"),

  // Plans
  plans: () => api.get<{ data: any[] }>("/admin/plans"),
  updatePlan: (id: string, data: any) => api.put<{ data: any }>(`/admin/plans/${id}`, data),

  // Capabilities
  getOrgCapabilities: (orgId: string) => api.get<{ data: any }>(`/admin/orgs/${orgId}/capabilities`),
  setOrgCapabilities: (orgId: string, capabilities: string[]) => api.put<{ data: any }>(`/admin/orgs/${orgId}/capabilities`, { capabilities }),

  // Subscription
  changePlan: (orgId: string, data: { plan?: string; subscriptionStatus?: string; trialEndsAt?: string; subscriptionEndsAt?: string }) =>
    api.post<{ data: any }>(`/admin/orgs/${orgId}/change-plan`, data),

  // Subscription Orders (platform-wide)
  subscriptionOrders:        (status?: string)                       => api.get<{ data: any[] }>(`/admin/subscription-orders${status ? `?status=${status}` : ""}`),
  confirmSubscriptionOrder:  (orderId: string, paymentRef?: string)  => api.post<{ data: any }>(`/admin/subscription-orders/${orderId}/confirm`, { paymentRef }),
  cancelSubscriptionOrder:   (orderId: string)                       => api.post<{ data: any }>(`/admin/subscription-orders/${orderId}/cancel`, {}),

  // Create org
  createOrg: (data: any) => api.post<{ data: any }>("/admin/orgs", data),
  resetOrgPassword: (id: string, data: { password: string }) =>
    api.patch<{ ok: boolean }>(`/admin/orgs/${id}/reset-password`, data),

  // Addons
  getOrgAddons:    (orgId: string)                              => api.get<{ data: any[] }>(`/admin/orgs/${orgId}/addons`),
  addOrgAddon:     (orgId: string, data: any)                   => api.post<{ data: any }>(`/admin/orgs/${orgId}/addons`, data),
  removeOrgAddon:  (orgId: string, addonId: string)             => api.delete(`/admin/orgs/${orgId}/addons/${addonId}`),

  // Org users
  getOrgUsers: (orgId: string) => api.get<{ data: any[] }>(`/admin/orgs/${orgId}/users`),

  // Account manager
  setOrgManager: (orgId: string, managerId: string | null) =>
    api.put<{ data: any }>(`/admin/orgs/${orgId}/manager`, { managerId }),

  // Nasaq staff
  staff: () => api.get<{ data: any[] }>("/admin/staff"),
  setStaffRole: (userId: string, role: string | null) =>
    api.patch<{ data: any }>(`/admin/staff/${userId}/role`, { role }),
  createStaff: (data: any) => api.post<{ data: any }>("/admin/staff", data),
  removeStaff: (userId: string) => api.delete(`/admin/staff/${userId}`),

  // Account manager portfolio
  clients: (managerId?: string) => {
    const q = managerId ? `?managerId=${managerId}` : "";
    return api.get<{ data: any[] }>(`/admin/clients${q}`);
  },

  // Reminders management (admin-level: all orgs)
  allReminders:          (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(params) : ""; return api.get<{ data: any[] }>(`/admin/reminders${q}`); },
  reminderCategories:    ()                    => api.get<{ data: any[] }>("/admin/reminder-categories"),
  createReminderCat:     (d: any)              => api.post<{ data: any }>("/admin/reminder-categories", d),
  reminderTemplates:     ()                    => api.get<{ data: any[] }>("/admin/reminder-templates"),
  createReminderTpl:     (d: any)              => api.post<{ data: any }>("/admin/reminder-templates", d),
  updateReminderTpl:     (id: string, d: any)  => api.patch<{ data: any }>(`/admin/reminder-templates/${id}`, d),
  deleteReminderTpl:     (id: string)          => api.delete(`/admin/reminder-templates/${id}`),
};

// --- Commercial Engine (admin only) ---
export const commercialApi = {
  // Features
  features:           ()                    => api.get<{ data: any[] }>("/admin/features"),
  createFeature:      (d: any)              => api.post<{ data: any }>("/admin/features", d),
  updateFeature:      (id: string, d: any)  => api.patch<{ data: any }>(`/admin/features/${id}`, d),
  featureGroups:      ()                    => api.get<{ data: any[] }>("/admin/feature-groups"),
  createGroup:        (d: any)              => api.post<{ data: any }>("/admin/feature-groups", d),
  // Quotas
  quotas:             ()                    => api.get<{ data: any[] }>("/admin/quotas"),
  createQuota:        (d: any)              => api.post<{ data: any }>("/admin/quotas", d),
  updateQuota:        (id: string, d: any)  => api.patch<{ data: any }>(`/admin/quotas/${id}`, d),
  // Plan features/quotas
  planFeatures:       (planId: string)      => api.get<{ data: any[] }>(`/admin/plans/${planId}/features`),
  setPlanFeatures:    (planId: string, d: any) => api.put<{ data: any }>(`/admin/plans/${planId}/features`, d),
  planQuotas:         (planId: string)      => api.get<{ data: any[] }>(`/admin/plans/${planId}/quotas`),
  setPlanQuotas:      (planId: string, d: any) => api.put<{ data: any }>(`/admin/plans/${planId}/quotas`, d),
  // Addons
  addons:             ()                    => api.get<{ data: any[] }>("/admin/addons"),
  createAddon:        (d: any)              => api.post<{ data: any }>("/admin/addons", d),
  updateAddon:        (id: string, d: any)  => api.patch<{ data: any }>(`/admin/addons/${id}`, d),
  orgAddons:          (orgId: string)       => api.get<{ data: any[] }>(`/admin/orgs/${orgId}/addons`),
  grantOrgAddon:      (orgId: string, d: any) => api.post<{ data: any }>(`/admin/orgs/${orgId}/addons`, d),
  // Discounts
  discounts:          ()                    => api.get<{ data: any[] }>("/admin/discounts"),
  createDiscount:     (d: any)              => api.post<{ data: any }>("/admin/discounts", d),
  updateDiscount:     (id: string, d: any)  => api.patch<{ data: any }>(`/admin/discounts/${id}`, d),
  deleteDiscount:     (id: string)          => api.delete(`/admin/discounts/${id}`),
  // Promotions
  promotions:         ()                    => api.get<{ data: any[] }>("/admin/promotions"),
  createPromotion:    (d: any)              => api.post<{ data: any }>("/admin/promotions", d),
  updatePromotion:    (id: string, d: any)  => api.patch<{ data: any }>(`/admin/promotions/${id}`, d),
  applyPromotion:     (id: string, orgId: string) => api.post<{ data: any }>(`/admin/promotions/${id}/apply/${orgId}`),
  // Org entitlements
  orgEntitlements:    (orgId: string)       => api.get<{ data: any }>(`/admin/orgs/${orgId}/entitlements`),
  orgFeatureOverride: (orgId: string, fId: string, d: any) => api.put<{ data: any }>(`/admin/orgs/${orgId}/feature-overrides/${fId}`, d),
  orgGrants:          (orgId: string)       => api.get<{ data: any[] }>(`/admin/orgs/${orgId}/grants`),
  addOrgGrant:        (orgId: string, d: any) => api.post<{ data: any }>(`/admin/orgs/${orgId}/grants`, d),
  deleteOrgGrant:     (orgId: string, id: string) => api.delete(`/admin/orgs/${orgId}/grants/${id}`),
  // Quota overrides per org
  orgQuotaOverrides:     (orgId: string)                       => api.get<{ data: any[] }>(`/admin/orgs/${orgId}/quota-overrides`),
  setOrgQuotaOverride:   (orgId: string, quotaId: string, d: any) => api.put<{ data: any }>(`/admin/orgs/${orgId}/quota-overrides/${quotaId}`, d),
  // Billing override
  billingOverride:    (orgId: string)       => api.get<{ data: any }>(`/admin/orgs/${orgId}/billing-override`),
  setBillingOverride: (orgId: string, d: any) => api.put<{ data: any }>(`/admin/orgs/${orgId}/billing-override`, d),
  // Rules
  rules:        ()              => api.get<{ data: any[] }>("/admin/rules"),
  createRule:   (d: any)        => api.post<{ data: any }>("/admin/rules", d),
  updateRule:   (id: string, d: any) => api.patch<{ data: any }>(`/admin/rules/${id}`, d),
  // Org addon revoke
  revokeOrgAddon: (orgId: string, id: string) => api.delete(`/admin/orgs/${orgId}/addons/${id}`),
  // Pricing
  orgPricing: (orgId: string) => api.get<{ data: any }>(`/admin/orgs/${orgId}/pricing`),
};

// --- Reminders ---
export const remindersApi = {
  list:         (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(params) : ""; return api.get<{ data: any[] }>(`/reminders${q}`); },
  upcoming:     (days = 30) => api.get<{ data: any[] }>(`/reminders/upcoming?days=${days}`),
  categories:   () => api.get<{ data: any[] }>("/reminders/categories"),
  templates:    () => api.get<{ data: any[] }>("/reminders/templates"),
  create:       (data: any) => api.post<{ data: any }>("/reminders", data),
  fromTemplate: (templateId: string, dueDate: string) => api.post<{ data: any }>("/reminders/from-template", { templateId, dueDate }),
  update:       (id: string, data: any) => api.patch<{ data: any }>(`/reminders/${id}`, data),
  complete:     (id: string) => api.post<{ data: any }>(`/reminders/${id}/complete`),
  snooze:       (id: string, until: string) => api.post<{ data: any }>(`/reminders/${id}/snooze`, { until }),
  delete:       (id: string) => api.delete(`/reminders/${id}`),
};

// --- Events & Tickets ---
export const eventsApi = {
  list:            (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => !!v)) : ""; return api.get<{ data: any[]; pagination: { total: number } }>(`/events${q}`); },
  get:             (id: string)                      => api.get<{ data: any & { ticketTypes: any[]; sections: any[] } }>(`/events/${id}`),
  create:          (data: any)                       => api.post<{ data: any }>("/events", data),
  update:          (id: string, data: any)           => api.put<{ data: any }>(`/events/${id}`, data),
  updateStatus:    (id: string, status: string)      => api.patch<{ data: any }>(`/events/${id}/status`, { status }),
  stats:           (id: string)                      => api.get<{ occupancyRate: number; revenueByType: any[]; checkedIn: number; total: number }>(`/events/${id}/stats`),
  // Ticket types
  createTicketType: (eventId: string, data: any)    => api.post<{ ticketType: any }>(`/events/${eventId}/ticket-types`, data),
  updateTicketType: (eventId: string, ttId: string, data: any) => api.patch<{ ticketType: any }>(`/events/${eventId}/ticket-types/${ttId}`, data),
  // Seat sections
  seatSections:     (eventId: string)                => api.get<{ sections: any[] }>(`/events/${eventId}/seat-sections`),
  createSeatSection:(eventId: string, data: any)     => api.post<{ section: any }>(`/events/${eventId}/seat-sections`, data),
  // Issuances
  issue:           (eventId: string, data: any)      => api.post<{ tickets: any[] }>(`/events/${eventId}/issue`, data),
  issuances:       (eventId: string, params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => !!v)) : ""; return api.get<{ tickets: any[]; total: number }>(`/events/${eventId}/issuances${q}`); },
  checkIn:         (eventId: string, ticketId: string) => api.post<{ ticket: any }>(`/events/${eventId}/issuances/${ticketId}/check-in`),
  scanQr:          (eventId: string, qrCode: string) => api.get<{ ticket: any }>(`/events/${eventId}/issuances/scan/${qrCode}`),
};

// --- Procurement (Suppliers / PO / GR / Invoices) ---
export const procurementApi = {
  // Suppliers
  suppliers:       (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => !!v)) : ""; return api.get<{ suppliers: any[]; total: number }>(`/procurement/suppliers${q}`); },
  supplier:        (id: string)                      => api.get<{ supplier: any }>(`/procurement/suppliers/${id}`),
  createSupplier:  (data: any)                       => api.post<{ supplier: any }>("/procurement/suppliers", data),
  updateSupplier:  (id: string, data: any)           => api.patch<{ supplier: any }>(`/procurement/suppliers/${id}`, data),
  deleteSupplier:  (id: string)                      => api.delete(`/procurement/suppliers/${id}`),
  // Purchase Orders
  orders:          (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => !!v)) : ""; return api.get<{ orders: any[]; total: number }>(`/procurement/orders${q}`); },
  order:           (id: string)                      => api.get<{ order: any; items: any[]; supplier: any }>(`/procurement/orders/${id}`),
  createOrder:     (data: any)                       => api.post<{ order: any }>("/procurement/orders", data),
  updateOrder:     (id: string, data: any)           => api.patch<{ order: any }>(`/procurement/orders/${id}`, data),
  orderReceipts:   (poId: string)                    => api.get<{ receipts: any[] }>(`/procurement/orders/${poId}/receipts`),
  // Goods Receipts
  receipt:         (id: string)                      => api.get<{ receipt: any; items: any[] }>(`/procurement/receipts/${id}`),
  createReceipt:   (data: any)                       => api.post<{ receipt: any }>("/procurement/receipts", data),
  approveReceipt:  (id: string, data: { status: "approved" | "rejected"; notes?: string }) => api.patch<{ receipt: any }>(`/procurement/receipts/${id}/approve`, data),
  // Supplier Invoices
  invoices:        (params?: Record<string, string>) => { const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([,v]) => !!v)) : ""; return api.get<{ invoices: any[]; total: number }>(`/procurement/invoices${q}`); },
  invoice:         (id: string)                      => api.get<{ invoice: any }>(`/procurement/invoices/${id}`),
  createInvoice:   (data: any)                       => api.post<{ invoice: any }>("/procurement/invoices", data),
  advanceInvoice:  (id: string, data: any)           => api.patch<{ invoice: any }>(`/procurement/invoices/${id}/status`, data),
  // Stats
  stats:           ()                                => api.get<{ orders: any; invoices: any; pendingReceipts: any[]; topSuppliers: any[] }>("/procurement/stats"),
};

// --- In-App Alerts ---
export const alertsApi = {
  list:    (limit = 20)   => api.get<{ data: any[]; unread: number }>(`/alerts?limit=${limit}`),
  markRead:(id: string)   => api.patch<{ data: any }>(`/alerts/${id}/read`),
  readAll: ()             => api.post<{ ok: boolean }>("/alerts/read-all"),
};

// --- Merchant Support Portal ---
export const supportApi = {
  list:   (params?: { status?: string; category?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status)   q.set("status",   params.status);
    if (params?.category) q.set("category", params.category);
    if (params?.page)     q.set("page",     String(params.page));
    return api.get<{ data: any[]; stats: Record<string, number>; pagination: any }>(`/support/tickets?${q}`);
  },
  get:    (id: string)              => api.get<{ data: any }>(`/support/tickets/${id}`),
  create: (data: { subject: string; body: string; category: string; priority: string }) =>
    api.post<{ data: any }>("/support/tickets", data),
  reply:  (id: string, message: string) => api.post<{ data: any }>(`/support/tickets/${id}/reply`, { message }),
  close:  (id: string)              => api.patch<{ data: any }>(`/support/tickets/${id}/close`),
};


// --- Maintenance & Cleaning Tasks ---
export const maintenanceApi = {
  list:   (params?: { status?: string; type?: string; serviceId?: string; bookingId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status)    q.set("status",    params.status);
    if (params?.type)      q.set("type",      params.type);
    if (params?.serviceId) q.set("serviceId", params.serviceId);
    if (params?.bookingId) q.set("bookingId", params.bookingId);
    return api.get<{ data: any[] }>(`/maintenance?${q}`);
  },
  stats:  () => api.get<{ data: any }>("/maintenance/stats"),
  create: (data: any) => api.post<{ data: any }>("/maintenance", data),
  update: (id: string, data: any) => api.patch<{ data: any }>(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/maintenance/${id}`),
};
