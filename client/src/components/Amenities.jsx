import React from 'react';
import { mockAmenities } from '../data/mockRooms';

const Amenities = () => {
  return (
    <section id="amenities" className="py-5 border-top border-bottom" style={{ backgroundColor: 'var(--hp-bg)' }}>
      <div className="container py-lg-4">
        <div className="text-center mb-5">
          <span
            className="badge px-3 py-2 rounded-pill fw-semibold text-uppercase mb-2"
            style={{ backgroundColor: 'var(--hp-accent-subtle)', color: 'var(--hp-accent)', border: '1px solid rgba(32, 199, 181, 0.25)', letterSpacing: '0.06em' }}
          >
            World-Class Experience
          </span>
          <h2 className="display-5 fw-bold font-serif mt-2" style={{ color: 'var(--hp-text)' }}>
            Curated Resort Amenities
          </h2>
          <p className="mx-auto fs-6" style={{ maxWidth: '640px', color: 'var(--hp-text-secondary)' }}>
            Immerse yourself in exceptional leisure, wellness, and personalized services designed to exceed every expectation.
          </p>
        </div>

        <div className="row g-4">
          {mockAmenities.map((item, index) => (
            <div key={index} className="col-12 col-md-6 col-lg-4 d-flex">
              <div className="amenity-card w-100">
                <div className="amenity-icon-box">
                  <i className={`bi ${item.icon}`}></i>
                </div>
                <h5 className="fw-bold font-serif mb-2" style={{ color: 'var(--hp-text)' }}>{item.title}</h5>
                <p className="text-muted small mb-0 lh-base">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Banner */}
        <div className="row mt-5">
          <div className="col-12">
            <div
              className="p-4 p-md-5 rounded-4 text-white d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4"
              style={{
                background: 'linear-gradient(135deg, #1B2528 0%, #243135 100%)',
                border: '1px solid var(--hp-border)',
                boxShadow: 'var(--hp-shadow-lg)'
              }}
            >
              <div>
                <h3 className="h3 font-serif fw-bold text-white mb-2">Private Events &amp; Bespoke Stays</h3>
                <p className="text-light opacity-90 mb-0" style={{ maxWidth: '600px' }}>
                  Planning an intimate gathering, executive retreat, or destination celebration? Our hospitality specialists curate every detail with precision.
                </p>
              </div>
              <a href="#contact" className="btn btn-hotelpro-accent px-4 py-3 text-nowrap">
                Inquire with Concierge
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Amenities;
