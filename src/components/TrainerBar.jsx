import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_TRAINERS, getSavedCustomTrainers, getRemovedTrainers } from '../utils/helpers';

export default function TrainerBar({
  trainers,
  selectedTrainer,
  assignDate,
  onTrainerChange,
  onDateChange,
  onOpenAddTrainer,
  onRemoveTrainer
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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
    t.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  function selectTrainer(name) {
    onTrainerChange(name);
    setIsOpen(false);
    setSearch('');
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
          <div className="custom-dropdown" ref={dropdownRef}>
            <div
              className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className={selectedTrainer ? 'selected-value' : 'placeholder-value'}>
                {selectedTrainer || '— Select Trainer —'}
              </span>
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▾</span>
            </div>

            {isOpen && (
              <div className="custom-dropdown-menu">
                {/* Search */}
                <div className="dropdown-search-wrapper">
                  <span className="dropdown-search-icon">🔍</span>
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                    setIsOpen(false);
                    setSearch('');
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
