import React, { useState, useEffect } from 'react';

export default function AddTrainerModal({
  visible,
  allDistrictsList,
  onClose,
  onSave
}) {
  const [name, setName] = useState('');
  const [hasDistrict, setHasDistrict] = useState(false);
  const [selectedDistricts, setSelectedDistricts] = useState(new Set());
  const [districtSearch, setDistrictSearch] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setHasDistrict(false);
      setSelectedDistricts(new Set());
      setDistrictSearch('');
    }
  }, [visible]);

  if (!visible) return null;

  const filteredDistricts = allDistrictsList.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase().trim())
  );

  function toggleDistrict(district, checked) {
    setSelectedDistricts(prev => {
      const next = new Set(prev);
      if (checked) next.add(district);
      else next.delete(district);
      return next;
    });
  }

  function removeDistrict(district) {
    setSelectedDistricts(prev => {
      const next = new Set(prev);
      next.delete(district);
      return next;
    });
  }

  function handleSave() {
    onSave(name.trim(), hasDistrict ? Array.from(selectedDistricts) : []);
  }

  return (
    <div className="loading-overlay" style={{ display: 'flex' }}>
      <div className="loading-card" style={{
        maxWidth: '440px', textAlign: 'left', alignItems: 'stretch', gap: '16px'
      }}>
        <h3 style={{
          fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-primary)'
        }}>
          👤 Add New Trainer
        </h3>

        <div>
          <label style={{
            display: 'block', fontSize: '0.75rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--text-muted)', marginBottom: '6px'
          }}>
            Trainer Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none',
              transition: 'var(--transition)'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(name.trim(), [])}>Add Trainer</button>
        </div>
      </div>
    </div>
  );
}
