import React, { useState, useRef, useEffect } from 'react';

export default function SchoolSelector({
  visible,
  schools,
  selectedTrainer,
  selectedDistrict,
  onPickSchool
}) {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset search when trainer changes
  useEffect(() => {
    setSearchValue('');
    setIsOpen(false);
  }, [selectedTrainer]);

  // Reset search when district changes
  useEffect(() => {
    setSearchValue('');
    setIsOpen(false);
  }, [selectedDistrict]);

  if (!visible) return null;

  const q = searchValue.toLowerCase().trim();
  const schoolsInDistrict = selectedDistrict
    ? schools.filter(([_, counts]) => counts.district === selectedDistrict)
    : schools;

  const filteredSchools = schoolsInDistrict.filter(([name]) => name.toLowerCase().includes(q));
  const totalSchools = schoolsInDistrict.length;

  return (
    <div className="school-selector" ref={containerRef} style={{ position: 'relative' }}>
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="school-search-input"
        placeholder="Search for a school…"
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{ paddingRight: '120px' }}
      />
      <span
        style={{
          position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          padding: '3px 8px', borderRadius: '12px', pointerEvents: 'none', zIndex: 5
        }}
      >
        {totalSchools} school{totalSchools === 1 ? '' : 's'}
      </span>
      <div className={`school-dropdown ${isOpen ? 'open' : ''}`}>
        {filteredSchools.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            No schools found for {selectedTrainer}
          </div>
        ) : (
          filteredSchools.map(([name, counts]) => (
            <div
              key={name}
              className="school-option"
              onClick={() => {
                setSearchValue(name);
                setIsOpen(false);
                onPickSchool(name);
              }}
            >
              <span className="name">{name}</span>
              <span className="badges">
                <span className="count-badge total">{counts.total} total</span>
                <span className="count-badge available">{counts.notShared} available</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
