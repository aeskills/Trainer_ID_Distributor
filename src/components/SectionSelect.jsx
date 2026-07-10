import React from 'react';
import SessionLog from './SessionLog';

export default function SectionSelect({
  stats, isDataLoaded, sessionLog, onSelectSection, onClearLog
}) {
  const kgbv = stats?.KGBV || { total: 0, shared: 0, notShared: 0 };
  const pmshri = stats?.PMShri || { total: 0, shared: 0, notShared: 0 };
  const loading = !isDataLoaded;

  return (
    <section className="section-select">
      <h2 className="section-title" style={{ marginTop: '12px' }}>Select Section</h2>
      <p className="section-subtitle">Choose which school chain to work with</p>
      <div className="section-cards">
        {/* KGBV Card */}
        <div
          className={`section-card kgbv card ${loading ? 'disabled' : ''}`}
          id="cardKGBV"
          onClick={() => !loading && onSelectSection('KGBV')}
        >
          <h2>KGBV</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
            Kasturba Gandhi Balika Vidyalaya
          </p>
          <div className="section-stats">
            <div className="section-stat">
              <span className={`val ${loading ? 'pulsing-skeleton' : ''}`}>
                {loading ? '...' : kgbv.total}
              </span>
              <span className="lbl">Total IDs</span>
            </div>
            <div className="section-stat">
              <span
                className={`val ${loading ? 'pulsing-skeleton' : ''}`}
                style={{ color: 'var(--success)' }}
              >
                {loading ? '...' : kgbv.notShared}
              </span>
              <span className="lbl">Available</span>
            </div>
            <div className="section-stat">
              <span
                className={`val ${loading ? 'pulsing-skeleton' : ''}`}
                style={{ color: 'var(--warning)' }}
              >
                {loading ? '...' : kgbv.shared}
              </span>
              <span className="lbl">Shared</span>
            </div>
          </div>
        </div>

        {/* PM Shri Card */}
        <div
          className={`section-card pmshri card ${loading ? 'disabled' : ''}`}
          id="cardPMShri"
          onClick={() => !loading && onSelectSection('PMShri')}
        >
          <h2>PM Shri</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
            PM Schools for Rising India
          </p>
          <div className="section-stats">
            <div className="section-stat">
              <span className={`val ${loading ? 'pulsing-skeleton' : ''}`}>
                {loading ? '...' : pmshri.total}
              </span>
              <span className="lbl">Total IDs</span>
            </div>
            <div className="section-stat">
              <span
                className={`val ${loading ? 'pulsing-skeleton' : ''}`}
                style={{ color: 'var(--success)' }}
              >
                {loading ? '...' : pmshri.notShared}
              </span>
              <span className="lbl">Available</span>
            </div>
            <div className="section-stat">
              <span
                className={`val ${loading ? 'pulsing-skeleton' : ''}`}
                style={{ color: 'var(--warning)' }}
              >
                {loading ? '...' : pmshri.shared}
              </span>
              <span className="lbl">Shared</span>
            </div>
          </div>
        </div>
      </div>

      {/* Session Log */}
      <SessionLog sessionLog={sessionLog} onClearLog={onClearLog} />
    </section>
  );
}
