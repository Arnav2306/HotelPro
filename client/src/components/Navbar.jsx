import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ serverHealth, onOpenAuth, onOpenMyBookings, onOpenDashboard }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = () => setIsOpen((prev) => !prev);
  const closeNav = () => setIsOpen(false);

  const handleAction = (callback) => {
    closeNav();
    if (callback) callback();
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'staff': return 'bg-info-subtle text-info border border-info-subtle';
      default: return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    }
  };

  const dashboardIcon = user?.role === 'admin'
    ? 'bi-bar-chart-fill'
    : user?.role === 'staff'
    ? 'bi-clipboard2-check'
    : 'bi-speedometer2';

  const dashboardLabel = user?.role === 'admin'
    ? 'Admin Panel'
    : user?.role === 'staff'
    ? 'Staff Panel'
    : 'My Dashboard';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-hotelpro sticky-top py-3">
      <div className="container">
        <a className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4" href="#home" onClick={closeNav}>
          <i className="bi bi-buildings brand-accent fs-3"></i>
          <span>Hotel<span className="brand-accent">Pro</span></span>
        </a>

        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={toggleNav}
          aria-controls="navbarContent"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
            <li className="nav-item">
              <a className="nav-link active text-white" href="#home" onClick={closeNav}>Home</a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-white-50" href="#rooms" onClick={closeNav}>Rooms & Suites</a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-white-50" href="#amenities" onClick={closeNav}>Amenities</a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-white-50" href="#about" onClick={closeNav}>About</a>
            </li>
            <li className="nav-item">
              <a className="nav-link text-white-50" href="#contact" onClick={closeNav}>Contact</a>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <button
                    className="nav-link text-white-50 btn btn-link border-0 p-0 text-start"
                    onClick={() => handleAction(onOpenMyBookings)}
                  >
                    <i className="bi bi-calendar2-check me-1"></i>My Stays
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link text-white-50 btn btn-link border-0 p-0 text-start"
                    onClick={() => handleAction(onOpenDashboard)}
                  >
                    <i className={`bi ${dashboardIcon} me-1`}></i>{dashboardLabel}
                  </button>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {serverHealth && (
              <span
                className={`badge d-none d-xl-inline-flex align-items-center gap-1 ${
                  serverHealth === 'OK'
                    ? 'bg-success-subtle text-success border border-success-subtle'
                    : 'bg-warning-subtle text-warning'
                } py-2 px-3 rounded-pill`}
                title="Backend API Status"
              >
                <i className="bi bi-circle-fill" style={{ fontSize: '7px' }}></i>
                API: {serverHealth}
              </span>
            )}

            {user ? (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary border-opacity-50 text-white">
                  <i className="bi bi-person-circle fs-5 brand-accent"></i>
                  <div className="d-flex flex-column text-start">
                    <span className="fw-semibold small text-white lh-1 text-truncate" style={{ maxWidth: '120px' }}>
                      {user.name}
                    </span>
                    <span className={`badge ${getRoleBadgeClass(user.role)} mt-1 py-0 px-1`} style={{ fontSize: '0.65rem' }}>
                      {user.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleAction(logout)}
                  className="btn btn-outline-light btn-sm px-3 py-2 rounded-pill"
                  title="Sign out"
                >
                  <i className="bi bi-box-arrow-right me-1"></i>Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAction(() => onOpenAuth('login'))}
                className="btn btn-outline-light btn-sm px-3 py-2 rounded-pill"
              >
                <i className="bi bi-person me-1"></i>Sign In
              </button>
            )}

            <a href="#search" onClick={closeNav} className="btn btn-hotelpro-gold btn-sm px-3 py-2">
              <i className="bi bi-calendar2-check me-1"></i>Book Now
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
