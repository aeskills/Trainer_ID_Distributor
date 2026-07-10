import React from 'react';

export default function Header({ isLoading, canDownload, onDownloadMaster }) {
  return (
    <header className="app-header" id="appHeader">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h1>Trainer ID Distribution</h1>
        <span className="header-badge">UP State</span>
        {isLoading && <div className="spinner-small"></div>}
      </div>
      <div className="header-actions">
        <button
          className="btn btn-success btn-sm"
          id="btnDownloadMaster"
          disabled={!canDownload}
          onClick={onDownloadMaster}
        >
          ⬇ Download Updated Master
        </button>
      </div>
    </header>
  );
}
