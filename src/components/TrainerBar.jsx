import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_TRAINERS, getSavedCustomTrainers, getRemovedTrainers } from '../utils/helpers';

export default function TrainerBar({
  trainers,
  selectedTrainer,
  selectedDistrict = '',
  districts = [],
  assignDate,
  onTrainerChange,
  onDistrictChange,
  onDateChange,
  onOpenAddTrainer,
  onRemoveTrainer
}) {
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);
  const [trainerSearch, setTrainerSearch] = useState('');
  const trainerDropdownRef = useRef(null);
  const trainerSearchRef = useRef(null);

  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const districtDropdownRef = useRef(null);
  const districtSearchRef = useRef(null);

  // Build trainer list from defaults + custom, minus removed
  const trainersSet = new Set(DEFAULT_TRAINERS);
  getSavedCustomTrainers().forEach(t => trainersSet.add(t));
  if (trainers) {
    trainers.forEach(t => trainersSet.add(t));
  }
  trainersSet.delete('Sikly');
  const removedSet = new Set(getRemovedTrainers().map(t => t.toLowerCase()));
  removedSet.forEach(r => {
    for (const t of trainersSet) {
      if (t.toLowerCase() === r) trainersSet.delete(t);
    }
  });

  const sortedTrainers = Array.from(trainersSet).sort((a, b) => a.localeCompare(b));

  const filteredTrainers = sortedTrainers.filter(t =>
    t.toLowerCase().includes(trainerSearch.toLowerCase().trim())
  );

  const filteredDistricts = districts.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase().trim())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (trainerDropdownRef.current && !trainerDropdownRef.current.contains(e.target)) {
        setIsTrainerOpen(false);
        setTrainerSearch('');
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(e.target)) {
        setIsDistrictOpen(false);
        setDistrictSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isTrainerOpen && trainerSearchRef.current) {
      trainerSearchRef.current.focus();
    }
  }, [isTrainerOpen]);

  useEffect(() => {
    if (isDistrictOpen && districtSearchRef.current) {
      districtSearchRef.current.focus();
    }
  }, [isDistrictOpen]);

  function selectTrainer(name) {
    onTrainerChange(name);
    setIsTrainerOpen(false);
    setTrainerSearch('');
  }

  function selectDistrict(name) {
    if (onDistrictChange) {
      onDistrictChange(name);
    }
    setIsDistrictOpen(false);
    setDistrictSearch('');
  }

  function handleRemove(e, name) {
    e.stopPropagation();
    if (onRemoveTrainer) {
      onRemoveTrainer(name);
    }
  }

  return (
    <div className="trainer-bar">
      <div className="kpi-card">
        <label>Trainer Name</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Custom Dropdown */}
          <div className="custom-dropdown" ref={trainerDropdownRef}>
            <div
              className={`custom-dropdown-trigger ${isTrainerOpen ? 'active' : ''}`}
              onClick={() => setIsTrainerOpen(!isTrainerOpen)}
            >
              <span className={selectedTrainer ? 'selected-value' : 'placeholder-value'}>
                {selectedTrainer || '— Select Trainer —'}
              </span>
              <span className={`dropdown-arrow ${isTrainerOpen ? 'open' : ''}`}>▾</span>
            </div>

            {isTrainerOpen && (
              <div className="custom-dropdown-menu">
                {/* Search */}
                <div className="dropdown-search-wrapper">
                  <span className="dropdown-search-icon">🔍</span>
                  <input
                    ref={trainerSearchRef}
                    type="text"
                    value={trainerSearch}
                    onChange={(e) => setTrainerSearch(e.target.value)}
                    placeholder="Search trainers..."
                    className="dropdown-search-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Trainer List */}
                <div className="dropdown-items-list">
                  {filteredTrainers.length === 0 ? (
                    <div className="dropdown-empty">No trainers found</div>
                  ) : (
                    filteredTrainers.map(t => (
                      <div
                        key={t}
                        className={`dropdown-item ${t === selectedTrainer ? 'active' : ''}`}
                        onClick={() => selectTrainer(t)}
                      >
                        <span className="dropdown-item-name">{t}</span>
                        <button
                          className="dropdown-item-remove"
                          onClick={(e) => handleRemove(e, t)}
                          title={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Trainer */}
                <div
                  className="dropdown-add-trainer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTrainerOpen(false);
                    setTrainerSearch('');
                    onOpenAddTrainer();
                  }}
                >
                  <span className="dropdown-add-icon">+</span>
                  <span>Add New Trainer</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTrainer && (
        <div className="kpi-card">
          <label>District Filter</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Custom Dropdown for District */}
            <div className="custom-dropdown" ref={districtDropdownRef}>
              <div
                className={`custom-dropdown-trigger ${isDistrictOpen ? 'active' : ''}`}
                onClick={() => setIsDistrictOpen(!isDistrictOpen)}
              >
                <span className={selectedDistrict ? 'selected-value' : 'placeholder-value'}>
                  {selectedDistrict || `All Districts (${districts.length})`}
                </span>
                <span className={`dropdown-arrow ${isDistrictOpen ? 'open' : ''}`}>▾</span>
              </div>

              {isDistrictOpen && (
                <div className="custom-dropdown-menu">
                  {/* Search */}
                  <div className="dropdown-search-wrapper">
                    <span className="dropdown-search-icon">🔍</span>
                    <input
                      ref={districtSearchRef}
                      type="text"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="Search districts..."
                      className="dropdown-search-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* District List */}
                  <div className="dropdown-items-list">
                    {districtSearch === '' && (
                      <div
                        className={`dropdown-item ${selectedDistrict === '' ? 'active' : ''}`}
                        onClick={() => selectDistrict('')}
                      >
                        <span className="dropdown-item-name">All Districts ({districts.length})</span>
                      </div>
                    )}
                    {filteredDistricts.length === 0 ? (
                      <div className="dropdown-empty">No districts found</div>
                    ) : (
                      filteredDistricts.map(d => (
                        <div
                          key={d}
                          className={`dropdown-item ${d === selectedDistrict ? 'active' : ''}`}
                          onClick={() => selectDistrict(d)}
                        >
                          <span className="dropdown-item-name">{d}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="kpi-card" style={{ maxWidth: '220px' }}>
        <label>Assignment Date</label>
        <input
          type="date"
          id="assignDate"
          value={assignDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
    </div>
  );
}
