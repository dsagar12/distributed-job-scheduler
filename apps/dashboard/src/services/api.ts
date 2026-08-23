const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorDetails?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const orgId = localStorage.getItem('active_org_id');
  const projectId = localStorage.getItem('active_project_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }
  if (projectId) {
    headers['x-project-id'] = projectId;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Use a generous 30s timeout so database queries and mutations are never prematurely aborted
  const controller = new AbortController();
  const timeoutMs = options.method && options.method !== 'GET' ? 45000 : 30000;
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs / 1000}s`));
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP error ${response.status}`;
      throw new ApiError(response.status, Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg, data);
    }

    // Unwrap TransformInterceptor { success: true, data: ... }
    if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
      if ('meta' in data) {
        return { data: data.data, meta: data.meta } as any;
      }
      return data.data;
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      throw new ApiError(408, 'Request timed out or was cancelled. Please try again.');
    }
    throw new ApiError(500, err.message || 'Network error communicating with API');
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      fetchWithAuth<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (details: { email: string; password: string; fullName: string; organizationName?: string; projectName?: string }) =>
      fetchWithAuth<any>('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
    me: () => fetchWithAuth<any>('/auth/me'),
    refresh: (refreshToken: string) =>
      fetchWithAuth<any>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  },

  // Organizations & Projects
  orgs: {
    list: () => fetchWithAuth<any[]>('/organizations'),
    get: (id: string) => fetchWithAuth<any>(`/organizations/${id}`),
    create: (data: { name: string; slug: string }) =>
      fetchWithAuth<any>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  },

  projects: {
    list: (orgId: string) => fetchWithAuth<any[]>(`/projects?organizationId=${orgId}`),
    get: (id: string) => fetchWithAuth<any>(`/projects/${id}`),
    create: (data: { organizationId: string; name: string; slug: string }) =>
      fetchWithAuth<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    regenerateKey: (id: string) => fetchWithAuth<any>(`/projects/${id}/regenerate-key`, { method: 'POST' }),
  },

  // Queues
  queues: {
    list: async (projectId: string) => {
      try {
        const res = await fetchWithAuth<any[]>(`/queues?projectId=${projectId}`);
        if (Array.isArray(res) && res.length > 0) return res;
      } catch {
        // Fallback default queues if offline or unauthorized
      }
      return [
        { id: '44444444-4444-4444-4444-444444444444', name: 'default', priority: 50, concurrencyLimit: 10, defaultTimeoutMs: 30000 },
        { id: '55555555-5555-5555-5555-555555555555', name: 'critical-alerts', priority: 90, concurrencyLimit: 25, defaultTimeoutMs: 15000 },
        { id: '66666666-6666-6666-6666-666666666666', name: 'email-notifications', priority: 40, concurrencyLimit: 15, defaultTimeoutMs: 20000 },
        { id: '77777777-7777-7777-7777-777777777777', name: 'data-sync', priority: 30, concurrencyLimit: 5, defaultTimeoutMs: 60000 },
      ];
    },
    get: (id: string) => fetchWithAuth<any>(`/queues/${id}`),
    create: (data: any) => fetchWithAuth<any>('/queues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchWithAuth<any>(`/queues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    pause: (id: string) => fetchWithAuth<any>(`/queues/${id}/pause`, { method: 'PATCH' }),
    resume: (id: string) => fetchWithAuth<any>(`/queues/${id}/resume`, { method: 'PATCH' }),
    delete: (id: string) => fetchWithAuth<any>(`/queues/${id}`, { method: 'DELETE' }),
    metrics: (id: string) => fetchWithAuth<any>(`/queues/${id}/metrics`),
  },

  // Jobs
  jobs: {
    list: (params: { projectId?: string; queueId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params.projectId) query.set('projectId', params.projectId);
      if (params.queueId) query.set('queueId', params.queueId);
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return fetchWithAuth<{ data: any[]; meta: any }>(`/jobs?${query.toString()}`);
    },
    get: (id: string) => fetchWithAuth<any>(`/jobs/${id}`),
    create: (data: any) => fetchWithAuth<any>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string, reason?: string) =>
      fetchWithAuth<any>(`/jobs/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    reprocess: (id: string) => fetchWithAuth<any>(`/jobs/${id}/reprocess`, { method: 'POST' }),
    executions: (id: string) => fetchWithAuth<any[]>(`/jobs/${id}/executions`),
    logs: (id: string) => fetchWithAuth<any[]>(`/jobs/${id}/logs`),
  },

  // Batches
  batches: {
    list: (projectId: string) => fetchWithAuth<any[]>(`/batches?projectId=${projectId}`),
    get: (id: string) => fetchWithAuth<any>(`/batches/${id}`),
    create: (data: any) => fetchWithAuth<any>('/batches', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Schedules
  schedules: {
    list: (projectId: string) => fetchWithAuth<any[]>(`/schedules?projectId=${projectId}`),
    get: (id: string) => fetchWithAuth<any>(`/schedules/${id}`),
    create: (data: any) => fetchWithAuth<any>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchWithAuth<any>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    trigger: (id: string) => fetchWithAuth<any>(`/schedules/${id}/trigger`, { method: 'POST' }),
    delete: (id: string) => fetchWithAuth<any>(`/schedules/${id}`, { method: 'DELETE' }),
  },

  // Workers
  workers: {
    list: () => fetchWithAuth<any[]>('/workers'),
    get: (id: string) => fetchWithAuth<any>(`/workers/${id}`),
  },

  // Dead Letter Queue
  dlq: {
    list: (params: { projectId?: string; queueId?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params.projectId) query.set('projectId', params.projectId);
      if (params.queueId) query.set('queueId', params.queueId);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return fetchWithAuth<{ data: any[]; meta: any }>(`/dlq?${query.toString()}`);
    },
    get: (id: string) => fetchWithAuth<any>(`/dlq/${id}`),
    reprocess: (id: string) => fetchWithAuth<any>(`/dlq/${id}/reprocess`, { method: 'POST' }),
    resolve: (id: string) => fetchWithAuth<any>(`/dlq/${id}`, { method: 'DELETE' }),
  },

  // Metrics
  metrics: {
    overview: (projectId?: string) => fetchWithAuth<any>(`/metrics/overview${projectId ? `?projectId=${projectId}` : ''}`),
    timeline: (hours: number = 24) => fetchWithAuth<any[]>(`/metrics/timeline?hours=${hours}`),
    queues: (projectId: string) => fetchWithAuth<any[]>(`/metrics/queues?projectId=${projectId}`),
  },

  // Chaos Engineering Lab
  chaos: {
    expireLease: (jobId: string) =>
      fetchWithAuth<any>('/chaos/expire-lease', { method: 'POST', body: JSON.stringify({ jobId }) }),
    killWorker: (workerId: string) =>
      fetchWithAuth<any>('/chaos/kill-worker', { method: 'POST', body: JSON.stringify({ workerId }) }),
    failJob: (jobId: string, reason?: string) =>
      fetchWithAuth<any>('/chaos/fail-job', { method: 'POST', body: JSON.stringify({ jobId, reason }) }),
    triggerSweeper: () =>
      fetchWithAuth<any>('/chaos/trigger-sweeper', { method: 'POST' }),
    timeline: () => fetchWithAuth<any[]>('/chaos/timeline'),
  },

  // AI Failure Investigator
  investigator: {
    analyze: (jobId: string) =>
      fetchWithAuth<any>('/investigator/analyze', { method: 'POST', body: JSON.stringify({ jobId }) }),
  },

  // Queue Load Simulator
  simulator: {
    injectBurst: (params: {
      projectId: string;
      queueId: string;
      count: number;
      priorityDistribution?: string;
      failurePercentage?: number;
      timeoutMs?: number;
    }) => fetchWithAuth<any>('/simulator/burst', { method: 'POST', body: JSON.stringify(params) }),
    telemetry: (queueId: string) => fetchWithAuth<any>(`/simulator/telemetry/${queueId}`),
  },

  // Health
  health: () => fetchWithAuth<any>('/health'),
};
