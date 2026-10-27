import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Minimal protected-route wrapper for future dashboards/views.
 * Supports authentication and role-based authorization.
 */
const ProtectedRoute = ({ allowedRoles = [], fallback, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border" role="status" style={{ color: 'var(--hp-brand)' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (fallback) return fallback;
    return (
      <div className="container py-5 text-center">
        <div
          className="card shadow-sm border p-5 mx-auto"
          style={{ maxWidth: '480px', borderRadius: 'var(--hp-radius-lg)', borderColor: 'var(--hp-border)', backgroundColor: 'var(--hp-surface)' }}
        >
          <i className="bi bi-shield-lock brand-accent display-4 mb-3"></i>
          <h4 className="fw-bold font-serif">Authentication Required</h4>
          <p className="text-muted small">Please sign in to access this protected area.</p>
        </div>
      </div>
    );
  }

  // Role authorization check
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (fallback) return fallback;
    return (
      <div className="container py-5 text-center">
        <div
          className="card shadow-sm border p-5 mx-auto"
          style={{ maxWidth: '480px', borderRadius: 'var(--hp-radius-lg)', borderColor: 'var(--hp-border)', backgroundColor: 'var(--hp-surface)' }}
        >
          <i className="bi bi-slash-circle text-danger display-4 mb-3"></i>
          <h4 className="fw-bold font-serif">Access Denied</h4>
          <p className="text-muted small">
            Your role (<strong>{user.role}</strong>) does not have permission to view this section.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
