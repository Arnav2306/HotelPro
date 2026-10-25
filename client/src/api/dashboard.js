import api from './axios';

export const getGuestDashboard = () => api.get('/dashboard/guest');
export const getStaffDashboard = () => api.get('/dashboard/staff');
export const getAdminDashboard = () => api.get('/dashboard/admin');
