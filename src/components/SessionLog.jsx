import React, { useState } from 'react';

export default function SessionLog({ sessionLog, onClearLog }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (sessionLog.length === 0) return null;

  const filteredLog = sessionLog.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const sectStr = l.section === 'PMShri' ? 'PM Shri' : l.section;
    const text = `${l.trainer} ${sectStr} ${l.school} ${l.count} ${l.date}`.toLowerCase();
    return text.includes(q);
  });

  return (
    <div className="session-log">
      <hr className="divider" />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '14px', flexWrap: 'wrap', gap: '12px'
      }}>
        <h3 style={{ marginBottom: 0 }}>📋 Session Assignments</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <span style={{
              position: 'absolute', left: '10px', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px'
            }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments..."
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '0.82rem', outline: 'none',
                transition: 'var(--transition)'
              }}
            />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClearLog}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Clear Log
          </button>
        </div>
      </div>
      <div className="table-container">
        <div className="table-scroll">
          <table className="log-table">
            <thead>
              <tr>
                <th>Trainer</th><th>Section</th><th>School</th><th>Count</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map((l, i) => {
                const sectStr = l.section === 'PMShri' ? 'PM Shri' : l.section;
                return (
                  <tr key={i}>
                    <td>{l.trainer}</td>
                    <td>{sectStr}</td>
                    <td>{l.school}</td>
                    <td><strong>{l.count}</strong></td>
                    <td>{l.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
