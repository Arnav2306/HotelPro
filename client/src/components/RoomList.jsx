import React from 'react';
import RoomCard from './RoomCard';

const RoomList = ({
  rooms = [],
  onSelectRoom,
  activeCategoryFilter = 'all',
  onCategorySelect,
  loading = false,
  error = null,
  isUsingMockData = false
}) => {
  const categories = ['all', 'Luxury Suite', 'Villa', 'Executive', 'Superior', 'Family Suite', 'Penthouse'];

  const filteredRooms = activeCategoryFilter === 'all'
    ? rooms
    : rooms.filter(
        (room) =>
          room.category &&
          room.category.toLowerCase() === activeCategoryFilter.toLowerCase()
      );

  return (
    <section id="rooms" className="py-5 my-4">
      <div className="container">
        <div className="text-center mb-5">
          <span
            className="badge px-3 py-2 rounded-pill fw-semibold text-uppercase mb-2"
            style={{ backgroundColor: 'var(--hp-accent-subtle)', color: 'var(--hp-accent)', border: '1px solid rgba(32, 199, 181, 0.25)', letterSpacing: '0.06em' }}
          >
            Accommodations
          </span>
          <h2 className="display-5 fw-bold font-serif mt-2" style={{ color: 'var(--hp-text)' }}>
            Signature Suites &amp; Private Sanctuaries
          </h2>
          <p className="mx-auto fs-6" style={{ maxWidth: '640px', color: 'var(--hp-text-secondary)' }}>
            Every suite is meticulously designed with contemporary elegance, tactile natural materials, and tailor-made amenities for supreme relaxation.
          </p>

          {isUsingMockData && (
            <div
              className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill border small mt-2 shadow-xs"
              style={{ backgroundColor: 'var(--hp-surface)', borderColor: 'var(--hp-border)', color: 'var(--hp-text-secondary)' }}
            >
              <i className="bi bi-info-circle text-success"></i>
              <span>Displaying curated accommodations from boutique collection</span>
            </div>
          )}

          {error && !isUsingMockData && (
            <div className="alert alert-warning d-inline-block py-2 px-3 small mt-3" role="alert">
              <i className="bi bi-exclamation-triangle me-1"></i> {error}
            </div>
          )}

          {/* Filter Pills */}
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            {categories.map((cat) => {
              const isActive = activeCategoryFilter.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => onCategorySelect && onCategorySelect(cat)}
                  className={`btn btn-sm px-3 py-2 rounded-pill transition-all ${
                    isActive
                      ? 'btn-hotelpro-primary shadow-sm'
                      : 'border'
                  }`}
                  style={!isActive ? { backgroundColor: 'var(--hp-surface-elevated)', borderColor: 'var(--hp-border)', color: 'var(--hp-text-secondary)' } : {}}
                >
                  {cat === 'all' ? 'All Accommodations' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeleton Grid */}
        {loading ? (
          <div className="row g-4" aria-busy="true" aria-label="Loading accommodations">
            {[1, 2, 3].map((n) => (
              <div key={n} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hp-skeleton-card overflow-hidden">
                  <div className="hp-skeleton" style={{ height: '230px', width: '100%' }}></div>
                  <div className="card-body p-4 d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="hp-skeleton rounded" style={{ height: '18px', width: '45%' }}></div>
                      <div className="hp-skeleton rounded-pill" style={{ height: '20px', width: '25%' }}></div>
                    </div>
                    <div className="hp-skeleton rounded" style={{ height: '24px', width: '70%' }}></div>
                    <div className="hp-skeleton rounded" style={{ height: '14px', width: '90%' }}></div>
                    <div className="hp-skeleton rounded" style={{ height: '14px', width: '60%' }}></div>
                    <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                      <div className="hp-skeleton rounded" style={{ height: '22px', width: '35%' }}></div>
                      <div className="hp-skeleton rounded-pill" style={{ height: '36px', width: '35%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Rooms Grid */
          <div className="row g-4">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room._id || room.id || room.roomNumber}
                room={room}
                onSelectRoom={onSelectRoom}
              />
            ))}

            {filteredRooms.length === 0 && (
              <div className="col-12 text-center py-5">
                <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
                <h5 className="text-secondary fw-semibold">No suites currently match your search criteria.</h5>
                <p className="text-muted small">
                  Try broadening your dates, adjusting guest count, or selecting "All Accommodations".
                </p>
                <button
                  onClick={() => onCategorySelect && onCategorySelect('all')}
                  className="btn btn-hotelpro-outline mt-2 btn-sm px-4 py-2 rounded-pill"
                >
                  View All Accommodations
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default RoomList;
