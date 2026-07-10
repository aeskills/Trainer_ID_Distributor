import React from 'react';

export default function LoadingOverlay({ text, subText }) {
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-text">{text || 'Processing…'}</div>
        {subText && <div className="loading-sub">{subText}</div>}
      </div>
    </div>
  );
}
