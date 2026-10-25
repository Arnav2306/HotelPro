import api from './axios';

export const getPaymentConfig = () =>
  api.get('/payments/config');

export const createRazorpayOrder = (bookingId) =>
  api.post(`/payments/create-order/${bookingId}`);

export const verifyRazorpayPayment = (data) =>
  api.post('/payments/verify', data);

export const processDemoPayment = (bookingId) =>
  api.post(`/payments/demo/${bookingId}`);

export const getPaymentForBooking = (bookingId) =>
  api.get(`/payments/booking/${bookingId}`);

export const createRefund = (bookingId, data, idempotencyKey) => {
  // idempotencyKey must be a stable UUID generated once per user refund action.
  // The server requires this header in production to prevent concurrent over-refunds.
  const key = idempotencyKey || crypto.randomUUID();
  return api.post(`/payments/refund/${bookingId}`, data, {
    headers: { 'X-Idempotency-Key': key }
  });
};

export const getRefundsForBooking = (bookingId) =>
  api.get(`/payments/refunds/${bookingId}`);

export const reconcilePayment = (bookingId) =>
  api.get(`/payments/reconcile/${bookingId}`);
