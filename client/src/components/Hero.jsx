import React from 'react';

const Hero = () => {
  return (
    <section id="home" className="hero-section text-center text-lg-start">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-8 mx-auto mx-lg-0">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-4 border border-warning-subtle" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <i className="bi bi-stars brand-accent"></i>
              <span className="small text-uppercase tracking-wider text-light fw-medium">
                The Pinnacle of Modern Luxury
              </span>
            </div>

            <h1 className="display-3 fw-bold text-white mb-4">
              Where Elegance Meets Extraordinary Hospitality
            </h1>

            <p className="lead text-light opacity-75 mb-5 pe-lg-5 fs-5">
              Escape to curated sanctuaries with bespoke concierge services, serene panoramic views, and unmatched culinary journeys crafted for the discerning traveler.
            </p>

            <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
              <a href="#rooms" className="btn btn-hotelpro-gold btn-lg px-4 py-3">
                <i className="bi bi-compass me-2"></i>Explore Rooms
              </a>
              <a href="#amenities" className="btn btn-outline-light btn-lg px-4 py-3 border-2">
                <i className="bi bi-gem me-2"></i>Discover Amenities
              </a>
            </div>

            <div className="row mt-5 pt-3 g-4 border-top border-secondary-subtle border-opacity-25 text-center text-lg-start">
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0">4.95</h3>
                <small className="text-white-50">Guest Rating</small>
              </div>
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0">120+</h3>
                <small className="text-white-50">Luxury Suites</small>
              </div>
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0">24/7</h3>
                <small className="text-white-50">Butler Care</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
