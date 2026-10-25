import React, { useState } from 'react';

const SearchForm = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useState({
    checkIn: '',
    checkOut: '',
    guests: '2 Adults',
    roomType: 'all'
  });
  const [notification, setNotification] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchParams);
    }
    setNotification('Searching available rooms for your selected dates...');
    setTimeout(() => setNotification(''), 4000);
  };

  return (
    <div id="search" className="container search-card-wrapper">
      <div className="search-box-card p-4 p-md-5">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="mb-1 fw-bold text-dark font-serif">Check Availability & Best Rates</h4>
            <p className="text-muted small mb-0">Direct booking with guaranteed lowest rate & complimentary breakfast</p>
          </div>
          <span className="badge bg-light text-dark border px-3 py-2 rounded-pill">
            <i className="bi bi-shield-check text-success me-1"></i> Best Price Guarantee
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="checkIn" className="form-label small fw-semibold text-secondary">
                <i className="bi bi-calendar-event me-1"></i> CHECK-IN
              </label>
              <input
                type="date"
                id="checkIn"
                name="checkIn"
                value={searchParams.checkIn}
                onChange={handleChange}
                className="form-control form-control-lg fs-6"
                required
              />
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="checkOut" className="form-label small fw-semibold text-secondary">
                <i className="bi bi-calendar-check me-1"></i> CHECK-OUT
              </label>
              <input
                type="date"
                id="checkOut"
                name="checkOut"
                value={searchParams.checkOut}
                onChange={handleChange}
                className="form-control form-control-lg fs-6"
                required
              />
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="guests" className="form-label small fw-semibold text-secondary">
                <i className="bi bi-people me-1"></i> GUESTS
              </label>
              <select
                id="guests"
                name="guests"
                value={searchParams.guests}
                onChange={handleChange}
                className="form-select form-select-lg fs-6"
              >
                <option value="1 Adult">1 Adult</option>
                <option value="2 Adults">2 Adults</option>
                <option value="3 Adults">3 Adults</option>
                <option value="Family (4+)">Family (4+)</option>
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label htmlFor="roomType" className="form-label small fw-semibold text-secondary">
                <i className="bi bi-door-open me-1"></i> ROOM TYPE
              </label>
              <select
                id="roomType"
                name="roomType"
                value={searchParams.roomType}
                onChange={handleChange}
                className="form-select form-select-lg fs-6"
              >
                <option value="all">All Types</option>
                <option value="Luxury Suite">Luxury Suite</option>
                <option value="Villa">Villa</option>
                <option value="Executive">Executive</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>

            <div className="col-12 col-lg-2">
              <button type="submit" className="btn btn-hotelpro-gold w-100 py-3 d-flex align-items-center justify-content-center gap-2">
                <i className="bi bi-search"></i>
                <span>Search</span>
              </button>
            </div>
          </div>
        </form>

        {notification && (
          <div className="alert alert-info mt-3 py-2 small d-flex align-items-center gap-2 mb-0" role="alert">
            <i className="bi bi-info-circle-fill"></i>
            <span>{notification}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchForm;
