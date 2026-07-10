import React, { useState, useRef, useEffect } from 'react';
import { COL_KEYS, COL_HEADERS } from '../utils/helpers';

export default function AssignmentArea({
  visible,
  notSharedRows,
  selectedCheckboxes,
  visibleCols,
  selectedTrainer,
  onToggleRow,
  onQtyChange,
  onResetSelection,
  onAssign,
  onToggleColumn
}) {
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colWrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (colWrapRef.current && !colWrapRef.current.contains(e.target)) {
        setColDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!visible) return null;

  const rows = notSharedRows;
  const visColKeys = COL_KEYS.filter(k => visibleCols.has(k));
  const selectedCount = selectedCheckboxes.size;
  const canAssign = selectedTrainer && selectedCount > 0;

  return (
    <div id="assignmentArea">
      <div className="assign-controls">
        <div className="stat-pill">
          Not Shared: <span className="val">{rows.length}</span>
        </div>
        <input
          type="number"
          className="qty-input"
          placeholder="# of IDs"
          min="1"
          max={rows.length}
          value={selectedCount || ''}
          onChange={(e) => {
            let v = parseInt(e.target.value) || 0;
            if (v > rows.length) v = rows.length;
            if (v < 0) v = 0;
            onQtyChange(v);
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!canAssign}
          onClick={onAssign}
        >
          Assign IDs
        </button>
        {selectedCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onResetSelection}
          >
            Reset Selection
          </button>
        )}
      </div>

      {/* Not-shared table */}
      <div className="table-container">
        <div className="table-title">
          <span>📋 Available IDs</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selectedCount > 0 ? `${selectedCount} selected` : ''}
          </span>
          {/* Column toggle */}
          <div className="col-toggle-wrap" ref={colWrapRef}>
            <button
              className="col-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setColDropdownOpen(!colDropdownOpen);
              }}
            >
              ⚙ Columns
            </button>
            <div className={`col-toggle-dropdown ${colDropdownOpen ? 'open' : ''}`}>
              {COL_KEYS.map(key => (
                <label key={key} className="col-toggle-item">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(key)}
                    onChange={(e) => onToggleColumn(key, e.target.checked)}
                  />
                  {COL_HEADERS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                {visColKeys.map(k => (
                  <th key={k}>{COL_HEADERS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, localIdx }) => {
                const isSelected = selectedCheckboxes.has(localIdx);
                return (
                  <tr key={localIdx} className={isSelected ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onToggleRow(localIdx, e.target.checked)}
                      />
                    </td>
                    {visColKeys.map(k => {
                      const val = String(row[k]);
                      const style = (k === 'AdobeID' || k === 'Password')
                        ? { fontFamily: 'monospace', fontSize: '0.78rem' }
                        : {};
                      return <td key={k} style={style}>{val}</td>;
                    })}
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
