import React from 'react';

const Hero = () => {
  return (
    <section id="home" className="hero-section text-center text-lg-start">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-8 mx-auto mx-lg-0">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-4 hero-pill-badge">
              <i className="bi bi-stars brand-accent"></i>
              <span className="small text-uppercase tracking-wider text-white fw-medium" style={{ letterSpacing: '0.08em' }}>
                Boutique Hospitality &amp; Residences
              </span>
            </div>

            <h1 className="display-3 fw-bold text-white mb-4">
              Where Elegance Meets Extraordinary Hospitality
            </h1>

            <p className="lead text-light opacity-90 mb-5 pe-lg-5 fs-5 lh-lg">
              Escape to curated sanctuaries with bespoke concierge services, serene panoramic views, and unmatched culinary journeys crafted for the discerning traveler.
            </p>

            <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
              <a href="#rooms" className="btn btn-hotelpro-accent btn-lg px-4 py-3">
                <i className="bi bi-compass me-2"></i>Explore Accommodations
              </a>
              <a href="#amenities" className="btn btn-outline-light btn-lg px-4 py-3 border-2" style={{ borderRadius: 'var(--hp-radius-md)' }}>
                <i className="bi bi-gem me-2 brand-accent"></i>Discover Amenities
              </a>
            </div>

            <div className="row mt-5 pt-3 g-4 border-top border-white border-opacity-15 text-center text-lg-start">
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0 font-serif">4.95</h3>
                <small className="text-white-50">Guest Rating</small>
              </div>
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0 font-serif">120+</h3>
                <small className="text-white-50">Luxury Suites</small>
              </div>
              <div className="col-4">
                <h3 className="h2 text-white fw-bold mb-0 font-serif">24/7</h3>
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
