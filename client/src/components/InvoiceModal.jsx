import React, { useRef } from 'react';
import { formatINR } from '../utils/formatCurrency';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const InvoiceModal = ({ isOpen, onClose, booking, payment, guestName }) => {
  const printRef = useRef(null);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>HotelPro Invoice #${booking._id?.slice(-8).toUpperCase()}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Inter',sans-serif; color:#101719; padding:40px; font-size:14px; background:#FFFFFF; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #E2E8F0; }
          .brand { font-size:24px; font-weight:700; color:#101719; }
          .brand span { color:#20C7B5; }
          .meta { text-align:right; color:#727873; font-size:13px; }
          .section { margin-bottom:24px; }
          h4 { font-family:'Playfair Display',serif; color:#101719; margin-bottom:12px; font-size:16px; }
          table { width:100%; border-collapse:collapse; }
          th { background:#F4F7F7; text-align:left; padding:10px 12px; font-size:12px; text-transform:uppercase; color:#727873; border-bottom:1px solid #E2E8F0; }
          td { padding:10px 12px; border-bottom:1px solid #EFECE5; }
          .total-row td { font-weight:700; font-size:16px; background:#F0FDF4; color:#101719; }
          .badge { display:inline-block; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; }
          .paid { background:#EDF7F2; color:#287A55; }
          .pending { background:#FBF4E8; color:#B7791F; }
          .footer { margin-top:40px; padding-top:20px; border-top:1px solid #E2E8F0; text-align:center; color:#727873; font-size:12px; }
          @media print { body { padding:20px; } }
        </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const room = booking.room || {};
  const nights = booking.nights || 0;
  const nightlyPrice = booking.nightlyPrice || 0;
  const totalAmount = booking.totalAmount || 0;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(16, 23, 25, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1060 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-dark text-white border-0 px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 className="modal-title font-serif fw-bold mb-0">
              <i className="bi bi-receipt me-2 brand-accent"></i>Invoice
            </h5>
            <div className="d-flex gap-2">
              <button onClick={handlePrint} className="btn btn-hotelpro-accent btn-sm px-3">
                <i className="bi bi-printer me-1"></i>Print
              </button>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          <div className="modal-body p-4" style={{ backgroundColor: 'var(--hp-bg)' }}>
            <div ref={printRef} className="rounded-3 p-4 shadow-sm border" style={{ backgroundColor: 'var(--hp-surface)', borderColor: 'var(--hp-border)' }}>
              {/* Header */}
              <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--hp-border)' }}>
                <div>
                  <div className="fw-bold fs-4" style={{ color: 'var(--hp-text)' }}>
                    Hotel<span className="brand-accent">Pro</span>
                  </div>
                  <div className="text-muted small mt-1">742 Evergreen Ocean Promenade, Coastal Bay, CA 90210</div>
                  <div className="text-muted small">reservations@hotelpro.luxury</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold fs-5 font-serif" style={{ color: 'var(--hp-text)' }}>INVOICE</div>
                  <div className="text-muted small mt-1">
                    #{booking._id?.slice(-8).toUpperCase() || 'N/A'}
                  </div>
                  <div className="text-muted small">
                    Issued: {formatDate(booking.createdAt)}
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Bill To</div>
                  <div className="fw-semibold">{guestName || 'Guest'}</div>
                </div>
                <div className="col-12 col-sm-6 text-sm-end">
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Stay Details</div>
                  <div className="small">
                    <div><i className="bi bi-calendar-event me-1 text-dark"></i>Check-In: {formatDate(booking.checkIn)}</div>
                    <div><i className="bi bi-calendar-check me-1 text-dark"></i>Check-Out: {formatDate(booking.checkOut)}</div>
                    <div><i className="bi bi-people me-1 text-dark"></i>Guests: {booking.guests}</div>
                  </div>
                </div>
              </div>

              {/* Room Info */}
              <div className="mb-4 p-3 rounded-3" style={{ background: 'var(--hp-surface-elevated)', border: '1px solid var(--hp-border)' }}>
                <div className="fw-semibold small text-uppercase text-muted mb-1">Room</div>
                <div className="fw-bold" style={{ color: 'var(--hp-brand)' }}>{room.title || 'Suite'}</div>
                <div className="text-muted small">{room.category} · Room No. {room.roomNumber || '—'}</div>
              </div>

              {/* Line Items */}
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr className="bg-light">
                      <th>Description</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Nightly Rate — {room.title || 'Suite'}</td>
                      <td className="text-end">{nights} night{nights !== 1 ? 's' : ''}</td>
                      <td className="text-end">{formatINR(nightlyPrice, true)}</td>
                      <td className="text-end">{formatINR(nightlyPrice * nights, true)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="text-end fw-bold">Total</td>
                      <td className="text-end fw-bold fs-5" style={{ color: 'var(--hp-brand)' }}>{formatINR(totalAmount, true)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Info */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Payment Status</div>
                    <span className={`badge rounded-pill px-3 py-2 fw-semibold ${
                      booking.paymentStatus === 'paid'
                        ? 'bg-success-subtle text-success border border-success-subtle'
                        : booking.paymentStatus === 'partially_refunded'
                        ? 'bg-info-subtle text-info border border-info-subtle'
                        : booking.paymentStatus === 'refunded'
                        ? 'bg-danger-subtle text-danger border border-danger-subtle'
                        : 'bg-warning-subtle text-warning border border-warning-subtle'
                    }`}>
                      {booking.paymentStatus?.replace('_', ' ').toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  {payment?.transactionId && (
                    <div className="text-end">
                      <div className="text-muted small fw-semibold text-uppercase mb-1">Transaction ID</div>
                      <code className="small bg-light px-2 py-1 rounded">{payment.transactionId}</code>
                    </div>
                  )}
                </div>
                {payment?.amountRefunded > 0 && (
                  <div className="alert alert-info py-2 px-3 small mt-3 mb-1 d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-arrow-counterclockwise me-1"></i>
                      <span>Amount Refunded: <strong>{formatINR(payment.amountRefunded, true)}</strong></span>
                    </div>
                    <div>
                      <span>Net Settled: <strong>{formatINR(Math.max(0, (payment.amount || booking.totalAmount) - payment.amountRefunded), true)}</strong></span>
                    </div>
                  </div>
                )}
                {payment?.paidAt && (
                  <div className="text-muted small mt-2">
                    <i className="bi bi-check-circle-fill text-success me-1"></i>
                    Paid on {formatDate(payment.paidAt)}
                    {payment.provider === 'demo' ? (
                      <span className="badge bg-secondary-subtle text-secondary border ms-2 fw-normal" style={{ fontSize: '0.7rem' }}>
                        DEMO PAYMENT
                      </span>
                    ) : (
                      <span className="badge bg-info-subtle text-info border border-info-subtle ms-2 fw-normal" style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-shield-check me-1"></i>RAZORPAY VERIFIED
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-top text-center text-muted small">
                <p className="mb-0">Thank you for choosing HotelPro. We look forward to your next stay.</p>
                <p className="mb-0">Questions? Contact us at reservations@hotelpro.luxury</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
