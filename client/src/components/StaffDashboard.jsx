import React, { useState, useEffect } from 'react';
import { getStaffDashboard } from '../api/dashboard';
import { getAllBookings } from '../api/bookings';
import { updateBookingStatus } from '../api/bookings';
import { updateRoomStatus } from '../api/rooms';
import { formatDate } from './BookingModal';
import { formatINR } from '../utils/formatCurrency';
import RefundModal from './RefundModal';

const PAY_BADGE = {
  paid:               'bg-success-subtle text-success border border-success-subtle',
  partially_refunded: 'bg-info-subtle text-info border border-info-subtle',
  refunded:           'bg-danger-subtle text-danger border border-danger-subtle',
  pending:            'bg-warning-subtle text-warning border border-warning-subtle'
};

const StaffDashboard = ({ isOpen, onClose, userRole }) => {
  const [tab, setTab] = useState('ops'); // 'ops' | 'refunds'

  // ── Operations tab state ───────────────────────────────────────────────────
  const [data, setData] = useState({ arrivals: [], departures: [], checkedIn: [], cleaning: [], counts: {} });
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError]   = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [cleaningRoomId, setCleaningRoomId] = useState(null);
  const [actionError, setActionError] = useState('');

  // ── Refund tab state ───────────────────────────────────────────────────────
  const [refundBookings, setRefundBookings] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsError,  setRefundsError]   = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadOps = () => {
    setOpsLoading(true);
    setOpsError('');
    getStaffDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setOpsError(e.response?.data?.error || 'Failed to load staff dashboard.'))
      .finally(() => setOpsLoading(false));
  };

  const loadRefundBookings = () => {
    setRefundsLoading(true);
    setRefundsError('');
    // Fetch bookings that have a captured payment (paid or partially refunded)
    getAllBookings()
      .then((r) => {
        const eligible = (r.data.bookings || []).filter(
          (b) => ['paid', 'partially_refunded'].includes(b.paymentStatus)
        );
        setRefundBookings(eligible);
      })
      .catch((e) => setRefundsError(e.response?.data?.error || 'Failed to load bookings.'))
      .finally(() => setRefundsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadOps();
      loadRefundBookings();
    }
  }, [isOpen]);

  // Reload refund list after refund modal closes (status may have changed)
  const handleRefundModalClose = () => {
    setRefundModalOpen(false);
    setSelectedBooking(null);
    loadRefundBookings();
  };

  const openRefundModal = (booking) => {
    setSelectedBooking(booking);
    setRefundModalOpen(true);
  };

  if (!isOpen) return null;

  // ── Operations handlers ────────────────────────────────────────────────────
  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    setActionError('');
    try {
      await updateBookingStatus(bookingId, newStatus);
      loadOps();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Status update failed.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoomCleaned = async (roomId) => {
    setCleaningRoomId(roomId);
    setActionError('');
    try {
      await updateRoomStatus(roomId, 'available');
      loadOps();
    } catch (e) {
      setActionError(e.response?.data?.error || 'Failed to mark room as cleaned.');
    } finally {
      setCleaningRoomId(null);
    }
  };

  // ── BookingRow (ops table) ─────────────────────────────────────────────────
  const BookingRow = ({ b, actions }) => (
    <tr>
      <td>
        <div className="fw-semibold small">{b.user?.name || '—'}</div>
        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{b.user?.email}</div>
      </td>
      <td>
        <div className="fw-semibold small">{b.room?.title}</div>
        <div className="text-muted" style={{ fontSize: '0.72rem' }}>No. {b.room?.roomNumber}</div>
      </td>
      <td className="small">{formatDate(b.checkIn)}</td>
      <td className="small">{formatDate(b.checkOut)}</td>
      <td>
        <div className="d-flex gap-1 flex-wrap">
          {actions.map(({ label, status, icon, cls }) => (
            <button
              key={status}
              className={`btn btn-sm py-1 px-2 ${cls}`}
              style={{ fontSize: '0.72rem' }}
              onClick={() => handleStatusUpdate(b._id, status)}
              disabled={updatingId === b._id}
            >
              {updatingId === b._id
                ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                : <><i className={`bi ${icon} me-1`}></i>{label}</>
              }
            </button>
          ))}
        </div>
      </td>
    </tr>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

            {/* Header */}
            <div className="modal-header bg-dark text-white border-0 px-4 py-3">
              <div>
                <h5 className="modal-title font-serif fw-bold mb-0">
                  <i className="bi bi-clipboard2-check brand-accent me-2"></i>Staff Dashboard
                </h5>
                <p className="text-white-50 small mb-0">Daily operations, arrivals, departures &amp; refund management</p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <button
                  onClick={() => { loadOps(); loadRefundBookings(); }}
                  className="btn btn-outline-light btn-sm px-2 py-1"
                  title="Refresh"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
                <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-dark border-bottom border-secondary px-4 pt-0">
              <ul className="nav nav-tabs border-0" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 px-3 py-2 small fw-semibold ${tab === 'ops' ? 'active text-dark bg-light rounded-top' : 'text-white-50'}`}
                    onClick={() => setTab('ops')}
                    role="tab"
                  >
                    <i className="bi bi-calendar2-check me-1"></i>Operations
                    {(data.counts.arrivals > 0 || data.counts.departures > 0) && (
                      <span className="badge bg-success ms-1" style={{ fontSize: '0.6rem' }}>
                        {(data.counts.arrivals || 0) + (data.counts.departures || 0)}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 px-3 py-2 small fw-semibold ${tab === 'refunds' ? 'active text-dark bg-light rounded-top' : 'text-white-50'}`}
                    onClick={() => setTab('refunds')}
                    role="tab"
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>Refunds
                    {refundBookings.length > 0 && (
                      <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.6rem' }}>
                        {refundBookings.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div className="modal-body p-4 bg-light">

              {/* ══ OPERATIONS TAB ══ */}
              {tab === 'ops' && (
                <>
                  {opsLoading && (
                    <div className="text-center py-5">
                      <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <span className="visually-hidden">Loading…</span>
                      </div>
                    </div>
                  )}
                  {!opsLoading && opsError && (
                    <div className="alert alert-danger small py-2 px-3">{opsError}</div>
                  )}
                  {actionError && (
                    <div className="alert alert-warning small py-2 px-3 mb-3">{actionError}</div>
                  )}
                  {!opsLoading && !opsError && (
                    <div className="d-flex flex-column gap-4">
                      {/* Summary Cards */}
                      <div className="row g-3">
                        {[
                          { label: 'Arrivals Today',       count: data.counts.arrivals  || 0, icon: 'bi-box-arrow-in-right', color: 'success' },
                          { label: 'Departures Today',     count: data.counts.departures|| 0, icon: 'bi-box-arrow-right',    color: 'warning' },
                          { label: 'Currently Checked In', count: data.counts.checkedIn || 0, icon: 'bi-door-open',          color: 'info'    },
                          { label: 'Rooms Cleaning',       count: data.counts.cleaning  || 0, icon: 'bi-stars',              color: 'secondary'}
                        ].map(({ label, count, icon, color }) => (
                          <div key={label} className="col-12 col-sm-6 col-md-3">
                            <div className="bg-white rounded-3 p-3 shadow-sm d-flex align-items-center gap-3">
                              <div className={`d-flex align-items-center justify-content-center rounded-3 bg-${color}-subtle text-${color}`}
                                style={{ width: 44, height: 44, fontSize: '1.3rem' }}>
                                <i className={`bi ${icon}`}></i>
                              </div>
                              <div>
                                <div className="fw-bold fs-4 lh-1">{count}</div>
                                <div className="text-muted small">{label}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Arrivals */}
                      {data.arrivals.length > 0 && (
                        <div className="bg-white rounded-3 p-4 shadow-sm">
                          <h6 className="font-serif fw-bold mb-3 text-success">
                            <i className="bi bi-box-arrow-in-right me-2"></i>Today's Arrivals
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-hover align-middle small mb-0">
                              <thead className="table-light">
                                <tr><th>Guest</th><th>Room</th><th>Check-In</th><th>Check-Out</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {data.arrivals.map((b) => (
                                  <BookingRow key={b._id} b={b} actions={[
                                    { label: 'Check In', status: 'checked-in', icon: 'bi-box-arrow-in-right', cls: 'btn-success' }
                                  ]} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Departures */}
                      {data.departures.length > 0 && (
                        <div className="bg-white rounded-3 p-4 shadow-sm">
                          <h6 className="font-serif fw-bold mb-3 text-warning">
                            <i className="bi bi-box-arrow-right me-2"></i>Today's Departures
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-hover align-middle small mb-0">
                              <thead className="table-light">
                                <tr><th>Guest</th><th>Room</th><th>Check-In</th><th>Check-Out</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {data.departures.map((b) => (
                                  <BookingRow key={b._id} b={b} actions={[
                                    { label: 'Check Out', status: 'checked-out', icon: 'bi-box-arrow-right', cls: 'btn-warning' }
                                  ]} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Checked-In */}
                      {data.checkedIn.length > 0 && (
                        <div className="bg-white rounded-3 p-4 shadow-sm">
                          <h6 className="font-serif fw-bold mb-3 text-info">
                            <i className="bi bi-door-open me-2"></i>Currently Checked-In Guests
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-hover align-middle small mb-0">
                              <thead className="table-light">
                                <tr><th>Guest</th><th>Room</th><th>Check-In</th><th>Check-Out</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {data.checkedIn.map((b) => (
                                  <BookingRow key={b._id} b={b} actions={[
                                    { label: 'Check Out', status: 'checked-out', icon: 'bi-box-arrow-right', cls: 'btn-warning' }
                                  ]} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Cleaning Queue */}
                      {data.cleaning && data.cleaning.length > 0 && (
                        <div className="bg-white rounded-3 p-4 shadow-sm">
                          <h6 className="font-serif fw-bold mb-3 text-secondary">
                            <i className="bi bi-stars me-2 text-warning"></i>Housekeeping &amp; Room Turnover Queue
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-hover align-middle small mb-0">
                              <thead className="table-light">
                                <tr><th>Room Number</th><th>Suite Title</th><th>Category</th><th>Current State</th><th>Action</th></tr>
                              </thead>
                              <tbody>
                                {data.cleaning.map((r) => (
                                  <tr key={r._id}>
                                    <td className="fw-bold">No. {r.roomNumber}</td>
                                    <td>{r.title}</td>
                                    <td><span className="badge bg-secondary-subtle text-secondary">{r.category}</span></td>
                                    <td><span className="badge bg-warning-subtle text-warning">Cleaning in progress</span></td>
                                    <td>
                                      <button
                                        className="btn btn-sm btn-outline-success py-1 px-2"
                                        style={{ fontSize: '0.72rem' }}
                                        onClick={() => handleRoomCleaned(r._id)}
                                        disabled={cleaningRoomId === r._id}
                                      >
                                        {cleaningRoomId === r._id
                                          ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                          : <><i className="bi bi-check2-circle me-1"></i>Mark Cleaned &amp; Available</>
                                        }
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {data.arrivals.length === 0 && data.departures.length === 0 && data.checkedIn.length === 0 && (!data.cleaning || data.cleaning.length === 0) && (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-calendar-check fs-1 d-block mb-2"></i>
                          <p className="small">No pending operations or arrivals today.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ══ REFUNDS TAB ══ */}
              {tab === 'refunds' && (
                <>
                  {refundsLoading && (
                    <div className="text-center py-5">
                      <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                        <span className="visually-hidden">Loading…</span>
                      </div>
                    </div>
                  )}
                  {!refundsLoading && refundsError && (
                    <div className="alert alert-danger small py-2 px-3">{refundsError}</div>
                  )}
                  {!refundsLoading && !refundsError && (
                    <div className="bg-white rounded-3 p-4 shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="font-serif fw-bold mb-0">
                          <i className="bi bi-arrow-counterclockwise brand-accent me-2"></i>
                          Paid Bookings Eligible for Refund
                        </h6>
                        <button
                          className="btn btn-outline-secondary btn-sm py-1 px-2"
                          style={{ fontSize: '0.72rem' }}
                          onClick={loadRefundBookings}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                        </button>
                      </div>

                      {refundBookings.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <i className="bi bi-check2-circle fs-1 d-block mb-2 text-success"></i>
                          <p className="small">No bookings with a refundable payment balance.</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle small mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Guest</th>
                                <th>Room</th>
                                <th>Dates</th>
                                <th>Amount</th>
                                <th>Payment</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {refundBookings.map((b) => (
                                <tr key={b._id}>
                                  <td>
                                    <div className="fw-semibold">{b.user?.name || '—'}</div>
                                    <div className="text-muted" style={{ fontSize: '0.68rem' }}>{b.user?.email}</div>
                                  </td>
                                  <td>
                                    <div>{b.room?.title}</div>
                                    <div className="text-muted" style={{ fontSize: '0.68rem' }}>No. {b.room?.roomNumber}</div>
                                  </td>
                                  <td className="text-nowrap">
                                    <div>{formatDate(b.checkIn)}</div>
                                    <div className="text-muted" style={{ fontSize: '0.68rem' }}>→ {formatDate(b.checkOut)}</div>
                                  </td>
                                  <td className="fw-semibold">{formatINR(b.totalAmount)}</td>
                                  <td>
                                    <span className={`badge ${PAY_BADGE[b.paymentStatus] || 'bg-secondary-subtle text-secondary'}`}>
                                      {b.paymentStatus?.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-warning py-1 px-2 d-flex align-items-center gap-1"
                                      style={{ fontSize: '0.72rem' }}
                                      onClick={() => openRefundModal(b)}
                                    >
                                      <i className="bi bi-arrow-counterclockwise"></i>
                                      Refund
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal (rendered outside main modal to avoid z-index stacking) */}
      <RefundModal
        booking={selectedBooking}
        isOpen={refundModalOpen}
        onClose={handleRefundModalClose}
        userRole={userRole}
      />
    </>
  );
};

export default StaffDashboard;
