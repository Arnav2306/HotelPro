import api from './axios';

export const createBooking = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my-bookings');
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const cancelBooking = (id) => api.patch(`/bookings/${id}/cancel`);
export const getAllBookings = (params) => api.get('/bookings', { params });
export const updateBookingStatus = (id, status) =>
  api.patch(`/bookings/${id}/status`, { status });
