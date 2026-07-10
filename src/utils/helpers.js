// Constants
export const COL_KEYS = [
  'StudentName', 'AdobeID', 'Password', 'GradeSection',
  'SchoolName', 'UDISE', 'District', 'TrainerAssigned',
  'Status', 'Trainer', 'Date'
];

export const COL_HEADERS = {
  StudentName:     'Student Name',
  AdobeID:         'Adobe ID',
  Password:        'Password',
  GradeSection:    'Student Grade & Section with year',
  SchoolName:      'School Name',
  UDISE:           'UDISE',
  District:        'District',
  TrainerAssigned: 'Trainer Assigned To the District',
  Status:          'IDs shared status',
  Trainer:         'Trainer',
  Date:            'Date'
};

export const DEFAULT_TRAINERS = [
  'Ujjwal','Pratishta','Silky','Saksham','Tannu','Nischal','Anirudh','Manish','Prakriti','Shubham','Rajiv'
];

export const DEFAULT_VISIBLE_COLS = new Set([
  'StudentName', 'AdobeID', 'Password', 'GradeSection', 'SchoolName', 'District'
]);

// Utility functions
export function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function todayDateStr() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateForDisplay(isoStr) {
  const [y, m, d] = isoStr.split('-');
  return `${d}-${m}-${y}`;
}

export function getCandidateFilenames() {
  const base = import.meta.env.BASE_URL || '/';
  return [`${base}Master Sheet.xlsx`];
}

export function downloadBlob(arrayBuffer, fileName) {
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getSavedSessionLog() {
  try {
    const saved = localStorage.getItem('distributor_session_log');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveSessionLog(log) {
  localStorage.setItem('distributor_session_log', JSON.stringify(log));
}

export function getSavedCustomTrainers() {
  try {
    const saved = localStorage.getItem('distributor_custom_trainers');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function getSavedCustomTrainerDistricts() {
  try {
    const saved = localStorage.getItem('distributor_custom_trainers_districts');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

export function saveCustomTrainer(name, districts = []) {
  try {
    const list = getSavedCustomTrainers();
    if (!list.map(t => t.toLowerCase()).includes(name.toLowerCase())) {
      list.push(name);
      localStorage.setItem('distributor_custom_trainers', JSON.stringify(list));
    }

    if (districts.length > 0) {
      const mappings = getSavedCustomTrainerDistricts();
      mappings[name.toLowerCase()] = districts;
      localStorage.setItem('distributor_custom_trainers_districts', JSON.stringify(mappings));
    }

    // If this trainer was previously removed, un-remove them
    const removed = getRemovedTrainers();
    const filtered = removed.filter(t => t.toLowerCase() !== name.toLowerCase());
    if (filtered.length !== removed.length) {
      localStorage.setItem('distributor_removed_trainers', JSON.stringify(filtered));
    }
  } catch (e) { /* silent */ }
}

export function getRemovedTrainers() {
  try {
    const saved = localStorage.getItem('distributor_removed_trainers');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function removeTrainer(name) {
  try {
    const removed = getRemovedTrainers();
    if (!removed.map(t => t.toLowerCase()).includes(name.toLowerCase())) {
      removed.push(name);
      localStorage.setItem('distributor_removed_trainers', JSON.stringify(removed));
    }
    // Also remove from custom trainers if present
    const custom = getSavedCustomTrainers();
    const filtered = custom.filter(t => t.toLowerCase() !== name.toLowerCase());
    localStorage.setItem('distributor_custom_trainers', JSON.stringify(filtered));
  } catch (e) { /* silent */ }
}
