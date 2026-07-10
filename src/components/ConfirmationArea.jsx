import React from 'react';
import { COL_KEYS, COL_HEADERS } from '../utils/helpers';

export default function ConfirmationArea({
  visible,
  trainer,
  section,
  school,
  date,
  assignedRows,
  visibleCols,
  onDownloadTrainer,
  onContinue
}) {
  if (!visible) return null;

  const visColKeys = COL_KEYS.filter(k => visibleCols.has(k));
  const sectionDisplay = section === 'PMShri' ? 'PM Shri' : section;

  return (
    <div className="confirmation-section">
      <hr className="divider" />
      <h3 className="section-title">✅ Assignment Confirmed</h3>
      <div className="confirmation-header">
        <span className="confirm-tag"><strong>{trainer}</strong></span>
        <span className="confirm-tag">{sectionDisplay}</span>
        <span className="confirm-tag">{school}</span>
        <span className="confirm-tag">{date}</span>
        <span className="confirm-tag"><strong>{assignedRows.length}</strong> IDs</span>
      </div>
      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {visColKeys.map(k => (
                  <th key={k}>{COL_HEADERS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignedRows.map((r, i) => (
                <tr key={i} className="selected-row">
                  {visColKeys.map(k => {
                    const style = (k === 'AdobeID' || k === 'Password')
                      ? { fontFamily: 'monospace', fontSize: '0.78rem' }
                      : {};
                    return <td key={k} style={style}>{String(r[k])}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onDownloadTrainer}>
          ⬇ Download for Trainer
        </button>
        <button className="btn btn-secondary" onClick={onContinue}>
          Continue Assigning
        </button>
      </div>
    </div>
  );
}
