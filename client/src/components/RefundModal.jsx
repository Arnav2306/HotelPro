import React, { useState, useEffect, useRef } from 'react';
import {
  getPaymentForBooking,
  getRefundsForBooking,
  createRefund,
  reconcilePayment
} from '../api/payments';
import { formatINR } from '../utils/formatCurrency';
import { formatDate } from './BookingModal';

// Status badge helpers
const REFUND_STATUS_BADGE = {
  processed: 'bg-success-subtle text-success border border-success-subtle',
  pending:   'bg-warning-subtle text-warning border border-warning-subtle',
  failed:    'bg-danger-subtle text-danger border border-danger-subtle'
};

const PAY_STATUS_BADGE = {
  paid:               'bg-success-subtle text-success border border-success-subtle',
  partially_refunded: 'bg-info-subtle text-info border border-info-subtle',
  refunded:           'bg-danger-subtle text-danger border border-danger-subtle',
  pending:            'bg-warning-subtle text-warning border border-warning-subtle'
};

// ─── RefundModal ────────────────────────────────────────────────────────────
const RefundModal = ({ booking, isOpen, onClose, userRole }) => {
  // Data state
  const [payment,   setPayment]   = useState(null);
  const [refunds,   setRefunds]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchErr,  setFetchErr]  = useState('');

  // Form state
  const [step,         setStep]         = useState('form'); // 'form' | 'confirm' | 'done'
  const [amountInput,  setAmountInput]  = useState('');     // empty = full refund
  const [reason,       setReason]       = useState('');
  const [formErr,      setFormErr]      = useState('');

  // Submission state
  const [submitting,   setSubmitting]   = useState(false);
  const [submitErr,    setSubmitErr]    = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  // Reconcile state
  const [reconciling,     setReconciling]     = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [reconcileErr,    setReconcileErr]     = useState('');

  // Stable idempotency key – created once per "form session", reused on retry
  const idempotencyKeyRef = useRef(null);

  const isAdmin = userRole === 'admin';

  // ── Load payment + refund data ─────────────────────────────────────────────
  const loadData = () => {
    if (!booking?._id) return;
    setLoading(true);
    setFetchErr('');
    setReconcileResult(null);

    Promise.all([
      getPaymentForBooking(booking._id),
      getRefundsForBooking(booking._id)
    ])
      .then(([pmtRes, rfdRes]) => {
        setPayment(pmtRes.data.payment);
        setRefunds(rfdRes.data.refunds || []);
      })
      .catch((e) => setFetchErr(e.response?.data?.error || 'Failed to load payment data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setAmountInput('');
      setReason('');
      setFormErr('');
      setSubmitErr('');
      setSubmitResult(null);
      setReconcileResult(null);
      setReconcileErr('');
      idempotencyKeyRef.current = null; // reset key for fresh session
      loadData();
    }
  }, [isOpen, booking?._id]);

  if (!isOpen || !booking) return null;

  // ── Derived amounts ────────────────────────────────────────────────────────
  const paidAmount      = payment?.amount || 0;
  const alreadyRefunded = payment?.amountRefunded || 0;
  const remaining       = Math.max(0, paidAmount - alreadyRefunded);
  const requestedAmount = amountInput === '' ? remaining : Number(amountInput);
  const isFullRefund    = Math.abs(requestedAmount - remaining) < 0.01;

  const isRefundable = payment &&
    ['paid', 'partially_refunded'].includes(payment.status) &&
    remaining > 0;

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleFormNext = (e) => {
    e.preventDefault();
    setFormErr('');

    if (!isRefundable) {
      setFormErr('No refundable balance available for this booking.');
      return;
    }

    if (amountInput !== '') {
      const val = Number(amountInput);
      if (isNaN(val) || val <= 0) {
        setFormErr('Please enter a valid positive amount.');
        return;
      }
      if (val > remaining + 0.001) {
        setFormErr(`Amount exceeds refundable balance of ${formatINR(remaining, true)}.`);
        return;
      }
    }

    // Generate a fresh idempotency key for this attempt (keep same key if retrying)
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    setStep('confirm');
  };

  // ── Submit refund ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSubmitErr('');
    setSubmitting(true);
    try {
      const body = {
        reason: reason.trim() || 'Staff initiated refund'
      };
      // Only include amount for partial refunds; omit for full refund (backend defaults to full balance)
      if (amountInput !== '' && !isFullRefund) {
        body.amount = requestedAmount;
      }

      const res = await createRefund(booking._id, body, idempotencyKeyRef.current);
      setSubmitResult(res.data);
      setStep('done');
      // Refresh data to show updated refund status
      loadData();
    } catch (err) {
      setSubmitErr(err.response?.data?.error || 'Refund request failed. Please try again.');
      // Reset key on hard failure so retry gets a new idempotency slot
      idempotencyKeyRef.current = null;
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reconcile ──────────────────────────────────────────────────────────────
  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileErr('');
    setReconcileResult(null);
    try {
      const res = await reconcilePayment(booking._id);
      setReconcileResult(res.data);
    } catch (err) {
      setReconcileErr(err.response?.data?.error || 'Reconciliation failed.');
    } finally {
      setReconciling(false);
    }
  };

  // ── Close / reset ──────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep('form');
    setAmountInput('');
    setReason('');
    setFormErr('');
    setSubmitErr('');
    setSubmitResult(null);
    setReconcileResult(null);
    idempotencyKeyRef.current = null;
    onClose();
  };

  const handleAnotherRefund = () => {
    setStep('form');
    setAmountInput('');
    setReason('');
    setFormErr('');
    setSubmitErr('');
    setSubmitResult(null);
    idempotencyKeyRef.current = null;
    loadData();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(6px)', zIndex: 1060 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refundModalTitle"
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 540 }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

          {/* Header */}
          <div className="modal-header border-0 px-4 py-3" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)' }}>
            <div>
              <h5 className="modal-title text-white fw-bold font-serif mb-0" id="refundModalTitle">
                <i className="bi bi-arrow-counterclockwise me-2" style={{ color: '#f0a500' }}></i>
                Refund Management
              </h5>
              <p className="text-white-50 small mb-0 mt-1">
                Booking #{booking._id?.slice(-8).toUpperCase()} &middot; {booking.room?.title || '—'}
              </p>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={handleClose} aria-label="Close" />
          </div>

          <div className="modal-body p-0 bg-light">

            {/* ── Loading ── */}
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <span className="visually-hidden">Loading payment info…</span>
                </div>
                <p className="text-muted small mt-3">Loading payment information…</p>
              </div>
            )}

            {/* ── Fetch error ── */}
            {!loading && fetchErr && (
              <div className="p-4">
                <div className="alert alert-danger small py-2 px-3">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>{fetchErr}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={loadData}>
                  <i className="bi bi-arrow-clockwise me-1"></i>Retry
                </button>
              </div>
            )}

            {/* ── Main content ── */}
            {!loading && !fetchErr && (
              <div className="p-4 d-flex flex-column gap-3">

                {/* Booking + Payment Summary */}
                <div className="bg-white rounded-3 p-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-semibold small">{booking.user?.name || '—'}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{booking.user?.email}</div>
                    </div>
                    <span className={`badge ${PAY_STATUS_BADGE[booking.paymentStatus] || 'bg-secondary-subtle text-secondary'}`}>
                      {booking.paymentStatus?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="row g-2 small text-muted mb-2">
                    <div className="col-6">
                      <i className="bi bi-calendar-event me-1"></i>
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </div>
                    <div className="col-6 text-end">
                      <i className="bi bi-moon-stars me-1"></i>{booking.nights} night{booking.nights !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {payment ? (
                    <div className="border-top pt-2 mt-1">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Paid amount</span>
                        <span className="fw-semibold">{formatINR(paidAmount, true)}</span>
                      </div>
                      {alreadyRefunded > 0 && (
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="text-muted">Already refunded</span>
                          <span className="text-info fw-semibold">−{formatINR(alreadyRefunded, true)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between small fw-bold">
                        <span>Refundable balance</span>
                        <span className={remaining > 0 ? 'text-success' : 'text-danger'}>
                          {formatINR(remaining, true)}
                        </span>
                      </div>
                      {payment.provider && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                          <i className="bi bi-credit-card me-1"></i>
                          Provider: {payment.provider.toUpperCase()}
                          {payment.paymentId && ` · ${payment.paymentId}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-top pt-2 mt-1">
                      <p className="text-muted small mb-0">
                        <i className="bi bi-info-circle me-1"></i>
                        No captured payment found for this booking.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── STEP: form ── */}
                {step === 'form' && (
                  <>
                    {!isRefundable && payment && (
                      <div className="alert alert-secondary small py-2 px-3 mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        {remaining <= 0
                          ? 'This booking has been fully refunded.'
                          : 'This payment is not eligible for a refund.'}
                      </div>
                    )}

                    {!payment && (
                      <div className="alert alert-warning small py-2 px-3 mb-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        No payment record found. Only captured payments can be refunded.
                      </div>
                    )}

                    {isRefundable && (
                      <form onSubmit={handleFormNext} className="bg-white rounded-3 p-3 shadow-sm">
                        <h6 className="fw-semibold font-serif mb-3 small text-uppercase text-secondary">
                          <i className="bi bi-arrow-counterclockwise me-1"></i>Initiate Refund
                        </h6>

                        {/* Amount */}
                        <div className="mb-3">
                          <label className="form-label small fw-semibold text-secondary">
                            REFUND AMOUNT
                            <span className="text-muted fw-normal ms-1">(leave blank for full balance)</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text fw-bold">₹</span>
                            <input
                              id="refundAmount"
                              type="number"
                              className="form-control"
                              placeholder={`Max: ${remaining.toFixed(2)}`}
                              min="0.01"
                              max={remaining}
                              step="0.01"
                              value={amountInput}
                              onChange={(e) => { setAmountInput(e.target.value); setFormErr(''); }}
                            />
                            {amountInput !== '' && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm px-2"
                                onClick={() => setAmountInput('')}
                                title="Reset to full balance"
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                          </div>
                          <div className="form-text">
                            Full balance: <strong>{formatINR(remaining, true)}</strong>
                            {amountInput !== '' && Number(amountInput) > 0 && (
                              <> &middot; You entered: <strong>{formatINR(Number(amountInput), true)}</strong></>
                            )}
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="mb-3">
                          <label className="form-label small fw-semibold text-secondary">
                            REASON
                            <span className="text-muted fw-normal ms-1">(optional)</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Guest request, service issue, cancellation"
                            maxLength={200}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </div>

                        {formErr && (
                          <div className="alert alert-danger small py-2 px-3 mb-3">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>{formErr}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn btn-warning w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                        >
                          <i className="bi bi-eye me-1"></i>
                          Review Refund of&nbsp;
                          <strong>
                            {formatINR(amountInput === '' ? remaining : Math.min(Number(amountInput) || remaining, remaining), true)}
                          </strong>
                        </button>
                      </form>
                    )}
                  </>
                )}

                {/* ── STEP: confirm ── */}
                {step === 'confirm' && (
                  <div className="bg-white rounded-3 p-4 shadow-sm text-center">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning-subtle text-warning mb-3"
                      style={{ width: 60, height: 60, fontSize: '1.8rem' }}
                    >
                      <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <h6 className="fw-bold font-serif mb-2">Confirm Refund</h6>
                    <p className="text-muted small mb-3">
                      Are you sure you want to issue a&nbsp;
                      <strong>{isFullRefund ? 'full' : 'partial'} refund</strong> of&nbsp;
                      <strong className="text-success">{formatINR(requestedAmount, true)}</strong>
                      &nbsp;to <strong>{booking.user?.name}</strong>?
                    </p>
                    {reason.trim() && (
                      <p className="text-muted small mb-3 fst-italic">
                        Reason: &ldquo;{reason.trim()}&rdquo;
                      </p>
                    )}
                    <div className="alert alert-warning small py-2 px-3 text-start mb-3">
                      <i className="bi bi-info-circle me-2"></i>
                      This action cannot be undone. The refund will be processed immediately via the payment gateway.
                    </div>

                    {submitErr && (
                      <div className="alert alert-danger small py-2 px-3 text-start mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>{submitErr}
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill"
                        onClick={() => { setStep('form'); setSubmitErr(''); }}
                        disabled={submitting}
                      >
                        <i className="bi bi-arrow-left me-1"></i>Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger flex-fill fw-semibold d-flex align-items-center justify-content-center gap-2"
                        onClick={handleConfirm}
                        disabled={submitting}
                      >
                        {submitting && <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>}
                        <i className={submitting ? '' : 'bi bi-check2-circle me-1'}></i>
                        {submitting ? 'Processing…' : 'Confirm Refund'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP: done ── */}
                {step === 'done' && submitResult && (
                  <div className="bg-white rounded-3 p-4 shadow-sm text-center">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
                      style={{ width: 60, height: 60, fontSize: '1.8rem' }}
                    >
                      <i className="bi bi-check2-circle"></i>
                    </div>
                    <h6 className="fw-bold font-serif mb-2">
                      {submitResult.refund?.status === 'processed' ? 'Refund Processed' : 'Refund Initiated'}
                    </h6>
                    <p className="text-muted small mb-3">{submitResult.message}</p>
                    {submitResult.refund?.refundId && (
                      <div className="bg-light rounded-3 p-3 text-start mb-3 small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Refund ID</span>
                          <code className="small">{submitResult.refund.refundId}</code>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Amount</span>
                          <strong>{formatINR(submitResult.refund.amount, true)}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Status</span>
                          <span className={`badge ${REFUND_STATUS_BADGE[submitResult.refund.status] || 'bg-secondary-subtle text-secondary'}`}>
                            {submitResult.refund.status}
                          </span>
                        </div>
                      </div>
                    )}
                    {submitResult.payment?.amountRefunded > 0 && (
                      <div className="small text-muted mb-3">
                        Total refunded: <strong>{formatINR(submitResult.payment.amountRefunded, true)}</strong>
                        &nbsp;/&nbsp;{formatINR(submitResult.payment.amount, true)}
                      </div>
                    )}
                    <div className="d-flex gap-2">
                      {submitResult.payment?.status !== 'refunded' && (
                        <button
                          type="button"
                          className="btn btn-outline-warning flex-fill btn-sm"
                          onClick={handleAnotherRefund}
                        >
                          <i className="bi bi-plus-circle me-1"></i>Another Refund
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-dark flex-fill btn-sm"
                        onClick={handleClose}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Refund History ── */}
                {refunds.length > 0 && (
                  <div className="bg-white rounded-3 p-3 shadow-sm">
                    <h6 className="fw-semibold small text-uppercase text-secondary mb-2">
                      <i className="bi bi-clock-history me-1"></i>Refund History
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      {refunds.map((r) => (
                        <div
                          key={r._id}
                          className="d-flex justify-content-between align-items-start border rounded-3 px-3 py-2 small"
                        >
                          <div>
                            <div className="fw-semibold">{formatINR(r.amount, true)}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {r.reason}
                            </div>
                            {r.initiatedBy?.name && (
                              <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                By: {r.initiatedBy.name} ({r.initiatedBy.role})
                              </div>
                            )}
                            {r.refundId && (
                              <code style={{ fontSize: '0.65rem' }} className="text-muted">{r.refundId}</code>
                            )}
                            {r.failureReason && (
                              <div className="text-danger" style={{ fontSize: '0.68rem' }}>
                                <i className="bi bi-exclamation-circle me-1"></i>{r.failureReason}
                              </div>
                            )}
                          </div>
                          <div className="d-flex flex-column align-items-end gap-1">
                            <span className={`badge ${REFUND_STATUS_BADGE[r.status] || 'bg-secondary-subtle text-secondary'}`}>
                              {r.status}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Reconciliation (admin only) ── */}
                {isAdmin && payment?.provider === 'razorpay' && payment?.paymentId && (
                  <div className="bg-white rounded-3 p-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-semibold small text-uppercase text-secondary mb-0">
                        <i className="bi bi-arrow-left-right me-1"></i>Gateway Reconciliation
                      </h6>
                      <button
                        className="btn btn-outline-secondary btn-sm py-1 px-2"
                        style={{ fontSize: '0.72rem' }}
                        onClick={handleReconcile}
                        disabled={reconciling}
                      >
                        {reconciling
                          ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                          : <><i className="bi bi-arrow-repeat me-1"></i>Reconcile</>}
                      </button>
                    </div>

                    {reconcileErr && (
                      <div className="alert alert-danger small py-2 px-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>{reconcileErr}
                      </div>
                    )}

                    {reconcileResult && (
                      <div className={`alert small py-2 px-3 mb-0 ${reconcileResult.reconciled ? 'alert-success' : 'alert-warning'}`}>
                        {reconcileResult.reconciled ? (
                          <><i className="bi bi-check2-circle me-2"></i>Local records match gateway — no discrepancies.</>
                        ) : (
                          <>
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <strong>Discrepancies found:</strong>
                            <ul className="mb-0 mt-1 ps-3">
                              {reconcileResult.discrepancies.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {reconcileResult.gateway && (
                          <div className="mt-2 border-top pt-2" style={{ fontSize: '0.7rem' }}>
                            <span className="text-muted">Gateway: </span>
                            <strong>{formatINR(reconcileResult.gateway.amount, true)}</strong> captured,&nbsp;
                            <strong>{formatINR(reconcileResult.gateway.amountRefunded, true)}</strong> refunded
                            &nbsp;· Status: <code>{reconcileResult.gateway.status}</code>
                          </div>
                        )}
                      </div>
                    )}

                    {!reconcileResult && !reconcileErr && (
                      <p className="text-muted small mb-0">
                        Compare local records with Razorpay gateway data to detect discrepancies.
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;
