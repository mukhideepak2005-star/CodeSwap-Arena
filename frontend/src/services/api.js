import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codeswap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors cleanly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected network error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  loginOrganizer: (data) => api.post('/auth/organizer/login', data),
  registerOrganizer: (data) => api.post('/auth/organizer/register', data),
  loginParticipant: (data) => api.post('/auth/participant/login', data),
  loginAdmin: (data) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const publicApi = {
  getContests: (params) => api.get('/public/contests', { params }),
  getContest: (id) => api.get(`/public/contests/${id}`),
  joinContest: (id, data) => api.post(`/public/contests/${id}/join`, data),
  verifyPin: (pin) => api.post('/public/verify-pin', { pin }),
};

export const eventApi = {
  getMyEvents: () => api.get('/events'),
  getEvent: (id) => api.get(`/events/${id}`),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.patch(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  archiveEvent: (id) => api.post(`/events/${id}/archive`),
  regeneratePin: (id) => api.post(`/events/${id}/regenerate-pin`),
  getCoOrganizers: (id) => api.get(`/events/${id}/organizers`),
  inviteCoOrganizer: (id, data) => api.post(`/events/${id}/organizers/invite`, data),
  updateCoOrganizer: (id, memberId, data) => api.patch(`/events/${id}/organizers/${memberId}`, data),
  removeCoOrganizer: (id, memberId) => api.delete(`/events/${id}/organizers/${memberId}`),
};

export const participantApi = {
  getParticipants: (eventId) => api.get(`/events/${eventId}/participants`),
  addParticipant: (eventId, data) => api.post(`/events/${eventId}/participants`, data),
  importParticipants: (eventId, participants) => api.post(`/events/${eventId}/participants/import`, { participants }),
  updateParticipant: (id, data) => api.patch(`/participants/${id}`, data),
  deleteParticipant: (id) => api.delete(`/participants/${id}`),
};

export const codeBlockApi = {
  getCodeBlocks: (params) => api.get('/code-blocks', { params }),
  getCodeBlock: (id) => api.get(`/code-blocks/${id}`),
  createCodeBlock: (data) => api.post('/code-blocks', data),
  updateCodeBlock: (id, data) => api.patch(`/code-blocks/${id}`, data),
  deleteCodeBlock: (id) => api.delete(`/code-blocks/${id}`),
};

export const roundApi = {
  getRounds: (eventId) => api.get(`/events/${eventId}/rounds`),
  getRound: (id) => api.get(`/rounds/${id}`),
  createRound: (eventId, data) => api.post(`/events/${eventId}/rounds`, data),
  startRound: (id) => api.post(`/rounds/${id}/start`),
  pauseRound: (id) => api.post(`/rounds/${id}/pause`),
  resumeRound: (id) => api.post(`/rounds/${id}/resume`),
  lockSubmissions: (id) => api.post(`/rounds/${id}/lock`),
  endRound: (id, data) => api.post(`/rounds/${id}/end`, data),
};

export const assignmentApi = {
  getAssignments: (roundId) => api.get(`/rounds/${roundId}/assignments`),
  assignChallenge: (roundId, data) => api.post(`/rounds/${roundId}/assignments`, data),
  bulkAssign: (roundId, assignments) => api.post(`/rounds/${roundId}/assignments/bulk`, { assignments }),
  autoDistribute: (roundId) => api.post(`/rounds/${roundId}/assignments/auto`),
  lockAssignments: (roundId) => api.post(`/rounds/${roundId}/assignments/lock`),
};

export const swapApi = {
  getSwaps: (roundId) => api.get(`/rounds/${roundId}/swaps`),
  generateDraft: (roundId) => api.post(`/rounds/${roundId}/swaps/draft`),
  validateMappings: (roundId, mappings) => api.post(`/rounds/${roundId}/swaps/validate`, { mappings }),
  publishSwaps: (roundId, mappings) => api.post(`/rounds/${roundId}/swaps/publish`, { mappings }),
};

export const studentApi = {
  getMyTask: () => api.get('/student/my-task'),
  submitModifiedCode: (data) => api.post('/submissions/modify', data),
  submitDebuggingSolution: (data) => api.post('/submissions/debug', data),
  getMyResults: () => api.get('/student/my-results'),
};

export const executionApi = {
  runCode: (data) => api.post('/code/run', data),
};

export const evaluationApi = {
  getEvaluations: (eventId, params) => api.get(`/events/${eventId}/evaluations`, { params }),
  getEvaluationDetails: (id) => api.get(`/evaluations/${id}`),
  reviewEvaluation: (id, data) => api.post(`/evaluations/${id}/review`, data),
};

export const leaderboardApi = {
  getRoundLeaderboard: (roundId) => api.get(`/rounds/${roundId}/leaderboard`),
  getEventLeaderboard: (eventId) => api.get(`/events/${eventId}/leaderboard`),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrganizers: () => api.get('/admin/organizers'),
  setOrganizerStatus: (id, data) => api.patch(`/admin/organizers/${id}/status`, data),
  getContests: () => api.get('/admin/contests'),
  getReports: () => api.get('/admin/reports'),
  updateReport: (id, data) => api.patch(`/admin/reports/${id}`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.post('/admin/settings', data),
};

export default api;
