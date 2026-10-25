import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login, register, authError, setAuthError } = useAuth();

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    if (authError) setAuthError(null);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setLocalError('');
    if (authError) setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(formData.email, formData.password);
      setSubmitting(false);
      if (res.success) {
        onClose();
      }
    } else {
      // Register validation
      if (formData.name.trim().length < 2) {
        setLocalError('Name must be at least 2 characters.');
        setSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        setSubmitting(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Passwords do not match.');
        setSubmitting(false);
        return;
      }

      const res = await register(formData.name, formData.email, formData.password);
      setSubmitting(false);
      if (res.success) {
        onClose();
      }
    }
  };

  const displayedError = localError || authError;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-dark text-white border-0 px-4 pt-4 pb-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-buildings brand-accent fs-4"></i>
                <h5 className="modal-title font-serif fw-bold mb-0">Hotel<span className="brand-accent">Pro</span></h5>
              </div>
              <p className="text-white-50 small mb-0">
                {activeTab === 'login' ? 'Sign in to access your reservation details' : 'Create an account to begin your luxury stay'}
              </p>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 pt-3 pb-1 border-bottom bg-light">
            <ul className="nav nav-pills nav-fill">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-2 fw-semibold ${activeTab === 'login' ? 'active bg-dark text-white' : 'text-secondary'}`}
                  onClick={() => switchTab('login')}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-2 fw-semibold ${activeTab === 'register' ? 'active bg-dark text-white' : 'text-secondary'}`}
                  onClick={() => switchTab('register')}
                >
                  <i className="bi bi-person-plus me-1"></i> Register
                </button>
              </li>
            </ul>
          </div>

          {/* Form Body */}
          <div className="modal-body p-4">
            {displayedError && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                <div>{displayedError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === 'register' && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Full Name</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-person"></i></span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-envelope"></i></span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-lock"></i></span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {activeTab === 'register' && (
                  <div className="form-text small" style={{ fontSize: '0.75rem' }}>
                    At least 6 characters.
                  </div>
                )}
              </div>

              {activeTab === 'register' && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Confirm Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-shield-check"></i></span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-hotelpro-gold w-100 py-2 mt-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
              >
                {submitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
