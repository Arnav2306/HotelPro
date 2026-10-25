import api from './axios';

export const processDemoPayment = (bookingId) =>
  api.post(`/payments/demo/${bookingId}`);

export const getPaymentForBooking = (bookingId) =>
  api.get(`/payments/booking/${bookingId}`);
