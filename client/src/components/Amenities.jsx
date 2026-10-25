import React from 'react';
import { mockAmenities } from '../data/mockRooms';

const Amenities = () => {
  return (
    <section id="amenities" className="py-5 bg-white border-top border-bottom">
      <div className="container py-lg-4">
        <div className="text-center mb-5">
          <span className="badge bg-secondary-subtle text-secondary-emphasis px-3 py-2 rounded-pill fw-semibold text-uppercase mb-2">
            World-Class Experience
          </span>
          <h2 className="display-5 fw-bold text-dark font-serif mt-2">
            Curated Resort Amenities
          </h2>
          <p className="text-muted mx-auto" style={{ maxWidth: '640px' }}>
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
                <h5 className="fw-bold font-serif mb-2">{item.title}</h5>
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
            <div className="p-4 p-md-5 rounded-4 text-white d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
              <div>
                <h3 className="h3 font-serif fw-bold text-white mb-2">Private Events & Bespoke Stays</h3>
                <p className="text-light opacity-75 mb-0" style={{ maxWidth: '600px' }}>
                  Planning an intimate gathering, executive summit, or destination celebration? Our event specialists handle every detail.
                </p>
              </div>
              <a href="#contact" className="btn btn-hotelpro-gold px-4 py-3 text-nowrap">
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
