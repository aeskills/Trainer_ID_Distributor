// Web Worker for Trainer ID Distribution Tool
// Handles all heavy Excel reading, parsing, filtering, and writing in a background thread

self.importScripts('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');

// State
let workbook = null;
let originalFileName = '';
let sheetDataMap = {}; // sheetName -> rows
let DISTRICT_ASSIGNMENTS = {}; // districtName (lowercase) -> array of trainerNames (lowercase)

const COL_KEYS = [
  'StudentName', 'AdobeID', 'Password', 'GradeSection',
  'SchoolName', 'UDISE', 'District', 'TrainerAssigned',
  'Status', 'Trainer', 'Date'
];
const COL_HEADERS = {
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
const COL_MAP = {};
COL_KEYS.forEach((k, i) => COL_MAP[k] = i);

const SHEET_NAMES = { 'KGBV': 'KGBV IDs', 'PMShri': 'PM Shri IDs' };
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

// Helper to get cell reference quickly
function getCellRef(r, c) {
  return COL_LETTERS[c] + (r + 1);
}

// Helper to convert Excel date serial number to DD-MM-YYYY string
function formatExcelDate(serial) {
  if (typeof serial !== 'number') return serial;
  let days = serial;
  if (days < 1) return '';
  if (days === 60) return '29-02-1900';
  if (days > 60) days--; // Adjust for Excel 1900 leap year bug
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const dateObj = new Date((days - 25568) * msPerDay);
  
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const y = dateObj.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

self.onerror = function(message, source, lineno, colno, error) {
  self.postMessage({
    type: 'error',
    message: `Worker runtime error: ${message} at ${source}:${lineno}:${colno}`
  });
};

// ─── MESSAGES LISTENER ───
self.onmessage = async function(e) {
  const data = e.data;
  const action = data.action;

  try {
    if (action === 'load') {
      await handleLoad(data);
    } else if (action === 'getSchools') {
      handleGetSchools(data.section, data.trainer);
    } else if (action === 'getNotSharedRows') {
      handleGetNotSharedRows(data.section, data.school, data.trainer);
    } else if (action === 'doAssign') {
      handleDoAssign(data.section, data.trainer, data.school, data.selectedLocalIndices, data.assignDate);
    } else if (action === 'addCustomTrainer') {
      handleAddCustomTrainer(data.name, data.districts);
    } else if (action === 'downloadMaster') {
      handleDownloadMaster(data.sessionLog);
    } else if (action === 'downloadTrainerSheet') {
      handleDownloadTrainerSheet(data.section, data.assignedLocalIndices, data.visibleColsList);
    } else if (action === 'clearSessionAssignments') {
      handleClearSessionAssignments();
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};

// ─── LOAD WORKBOOK & INITIALIZE ───
async function handleLoad(data) {
  let loadedBuffer = null;
  let loadedFname = '';
  const sessionLog = data.sessionLog;

  if (data.buffer) {
    loadedBuffer = data.buffer;
    loadedFname = data.fileName || 'Master Sheet.xlsx';
  } else if (data.urlCandidates) {
    const candidates = data.urlCandidates;
    for (let i = 0; i < candidates.length; i++) {
      const fname = candidates[i];
      self.postMessage({ type: 'loadingProgress', message: `Checking for "${fname}"…` });
      try {
        const res = await fetch(fname);
        if (res.ok) {
          loadedBuffer = await res.arrayBuffer();
          loadedFname = fname;
          break;
        }
      } catch (e) {
        // Continue trying candidates
      }
    }
  }

  if (!loadedBuffer) {
    self.postMessage({ type: 'loadFailed', message: 'Automatic load failed. Ensure master file is in folder.' });
    return;
  }

  self.postMessage({ type: 'loadingProgress', message: 'Parsing workbook file (this might take a few seconds)…' });

  // Read workbook
  workbook = XLSX.read(loadedBuffer, {
    type: 'array',
    cellHTML: false,
    cellText: false,
    cellFormula: false,
    cellNF: false,
    cellStyles: false
  });

  let baseName = loadedFname.replace(/\.xlsx?$/i, '');
  originalFileName = baseName.replace(/_\d{2}-\d{2}-\d{4}$/, '');

  self.postMessage({ type: 'loadingProgress', message: 'Processing mapping sheets…' });
  parseDistrictMappingSheet();

  // Explicitly allocate Shubham to Meerut, Hapur, and Ghaziabad
  const shubhamDistricts = ['Meerut', 'Hapur', 'Ghaziabad'];
  shubhamDistricts.forEach(district => {
    const distKey = district.toLowerCase();
    DISTRICT_ASSIGNMENTS[distKey] = DISTRICT_ASSIGNMENTS[distKey] || [];
    if (!DISTRICT_ASSIGNMENTS[distKey].includes('shubham')) {
      DISTRICT_ASSIGNMENTS[distKey].push('shubham');
    }
    updateDistrictMappingInSheet(district, 'Shubham');
  });

  // Apply custom trainer district mappings from localStorage
  if (data.customTrainerDistricts) {
    Object.entries(data.customTrainerDistricts).forEach(([trainer, districts]) => {
      const trainerLower = trainer.toLowerCase();
      districts.forEach(district => {
        const distKey = district.toLowerCase();
        DISTRICT_ASSIGNMENTS[distKey] = DISTRICT_ASSIGNMENTS[distKey] || [];
        if (!DISTRICT_ASSIGNMENTS[distKey].includes(trainerLower)) {
          DISTRICT_ASSIGNMENTS[distKey].push(trainerLower);
        }
        updateDistrictMappingInSheet(district, trainer);
      });
    });
  }

  // Reapply assignments
  if (sessionLog && sessionLog.length) {
    self.postMessage({ type: 'loadingProgress', message: 'Re-applying session assignments…' });
    reapplySavedAssignments(sessionLog);
  }

  self.postMessage({ type: 'loadingProgress', message: 'Compiling stats…' });
  // Parse all sheet data and compute stats
  parseAndBuildStats();

  // Return success message
  self.postMessage({
    type: 'loadSuccess',
    fileName: loadedFname,
    originalFileName: originalFileName,
    districtAssignments: DISTRICT_ASSIGNMENTS,
    sheetStats: getCompiledStats(),
    districtsList: getAllDistricts()
  });
}

// ─── REAPPLY SAVED ASSIGNMENTS ───
function reapplySavedAssignments(log) {
  try {
    log.forEach(l => {
      if (!l.assignedIds || !l.assignedIds.length) return;
      const sheetName = SHEET_NAMES[l.section];
      const ws = workbook.Sheets[sheetName];
      if (!ws) return;

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const adobeIdCol = COL_MAP.AdobeID;
      const adobeIdMap = new Set(l.assignedIds.map(id => String(id).trim().toLowerCase()));

      for (let ri = range.s.r + 1; ri <= range.e.r; ri++) {
        const ref = getCellRef(ri, adobeIdCol);
        const cell = ws[ref];
        if (cell && cell.v !== undefined && adobeIdMap.has(String(cell.v).trim().toLowerCase())) {
          ws[getCellRef(ri, COL_MAP.Status)] = { t: 's', v: 'Shared' };
          ws[getCellRef(ri, COL_MAP.Trainer)] = { t: 's', v: l.trainer };
          ws[getCellRef(ri, COL_MAP.Date)] = { t: 's', v: l.date };
        }
      }
    });
  } catch (e) {
    console.error("Failed to reapply saved assignments in worker:", e);
  }
}

// ─── PARSE SHEET DATA ───
function parseSheet(sheetName) {
  if (sheetDataMap[sheetName]) return sheetDataMap[sheetName];
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    sheetDataMap[sheetName] = [];
    return [];
  }

  const rowsAOA = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
  const rows = [];

  for (let ri = 1; ri < rowsAOA.length; ri++) {
    const rowArr = rowsAOA[ri];
    if (!rowArr || rowArr.length === 0) continue;

    const obj = {};
    let hasData = false;

    for (let ci = 0; ci < COL_KEYS.length; ci++) {
      let val = rowArr[ci] !== undefined ? rowArr[ci] : '';
      if (COL_KEYS[ci] === 'Date' && typeof val === 'number') {
        val = formatExcelDate(val);
      }
      obj[COL_KEYS[ci]] = val;
      if (val !== '') hasData = true;
    }

    if (!hasData) continue;
    obj._origIdx = ri; // store actual 0-based excel row index
    rows.push(obj);
  }

  sheetDataMap[sheetName] = rows;
  return rows;
}

function parseAndBuildStats() {
  sheetDataMap = {};
  Object.values(SHEET_NAMES).forEach(name => {
    parseSheet(name);
  });
}

// ─── DISTRICT MAPPING PARSING ───
function parseDistrictMappingSheet() {
  const sheetName = 'District Mapping';
  const ws = workbook.Sheets[sheetName];
  DISTRICT_ASSIGNMENTS = {};
  if (!ws) return;

  const rowsAOA = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});

  for (let ri = 1; ri < rowsAOA.length; ri++) {
    const rowArr = rowsAOA[ri];
    if (!rowArr || rowArr.length === 0) continue;

    const distVal = rowArr[0];
    const trainerVal = rowArr[1];

    if (distVal !== undefined && distVal !== '') {
      const districtName = String(distVal).trim().toLowerCase();
      if (trainerVal !== undefined && trainerVal !== '' && String(trainerVal).trim() !== '0') {
        const trainersVal = String(trainerVal).trim();
        const trainers = trainersVal.split(/\s+and\s+|\s*&\s*|\s*,\s*/i)
          .map(t => t.trim().toLowerCase())
          .filter(t => t);
        DISTRICT_ASSIGNMENTS[districtName] = trainers;
      }
    }
  }
}

function updateDistrictMappingInSheet(districtName, trainerName) {
  const sheetName = 'District Mapping';
  const ws = workbook.Sheets[sheetName];
  if (!ws) return;

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const distSearch = String(districtName).trim().toLowerCase();

  for (let ri = range.s.r + 1; ri <= range.e.r; ri++) {
    const distRef = getCellRef(ri, 0);
    const distCell = ws[distRef];
    if (distCell && distCell.v !== undefined && String(distCell.v).trim().toLowerCase() === distSearch) {
      const trainerRef = getCellRef(ri, 1);
      const trainerCell = ws[trainerRef];
      let existingVal = (trainerCell && trainerCell.v !== undefined) ? String(trainerCell.v).trim() : '';

      let newVal = '';
      if (existingVal === '' || existingVal === '0') {
        newVal = trainerName;
      } else {
        const trainers = existingVal.split(/\s+and\s+|\s*&\s*|\s*,\s*/i).map(t => t.trim());
        if (!trainers.some(t => t.toLowerCase() === trainerName.toLowerCase())) {
          trainers.push(trainerName);
        }
        newVal = trainers.join(' And ');
      }

      ws[trainerRef] = { t: 's', v: newVal };
      break;
    }
  }
}

function getAllDistricts() {
  const ws = workbook.Sheets['District Mapping'];
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const districts = [];
  for (let ri = range.s.r + 1; ri <= range.e.r; ri++) {
    const cell = ws[getCellRef(ri, 0)];
    if (cell && cell.v !== undefined && cell.v !== '') {
      districts.push(String(cell.v).trim());
    }
  }
  return districts.sort((a, b) => a.localeCompare(b));
}

// ─── TRAINER VISIBILITY FILTER ───
function trainerHasAssignments(trainerName) {
  const trainer = String(trainerName).trim().toLowerCase();
  return Object.values(DISTRICT_ASSIGNMENTS).some(allowed => allowed.includes(trainer));
}

function isRowVisibleForTrainer(row, selectedTrainer) {
  return !!selectedTrainer;
}

// ─── SCHOOLS LIST ───
function handleGetSchools(section, trainer) {
  const sheetName = SHEET_NAMES[section];
  const data = sheetDataMap[sheetName] || [];
  const map = {};

  data.forEach(r => {
    if (!isRowVisibleForTrainer(r, trainer)) return;
    const school = String(r.SchoolName).trim();
    if (!school) return;
    if (!map[school]) {
      map[school] = { 
        total: 0, 
        notShared: 0, 
        district: String(r.District || '').trim() 
      };
    }
    map[school].total++;
    if (String(r.Status).toLowerCase().trim() !== 'shared') map[school].notShared++;
  });

  const schools = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  self.postMessage({ type: 'schoolsData', schools });
}

// ─── NOT SHARED ROWS ───
function handleGetNotSharedRows(section, school, trainer) {
  const sheetName = SHEET_NAMES[section];
  const data = sheetDataMap[sheetName] || [];

  // Filter rows and preserve their indices in the local array
  const filtered = [];
  data.forEach((r, idx) => {
    if (String(r.SchoolName).trim() === school &&
        String(r.Status).toLowerCase().trim() !== 'shared' &&
        isRowVisibleForTrainer(r, trainer)) {
      filtered.push({
        row: r,
        localIdx: idx // index inside sheetDataMap[sheetName]
      });
    }
  });

  self.postMessage({ type: 'notSharedRowsData', rows: filtered });
}

// ─── ADD CUSTOM TRAINER ───
function handleAddCustomTrainer(name, districts) {
  const nameLower = name.toLowerCase();
  if (districts && districts.length) {
    districts.forEach(district => {
      const distKey = district.toLowerCase();
      DISTRICT_ASSIGNMENTS[distKey] = DISTRICT_ASSIGNMENTS[distKey] || [];
      if (!DISTRICT_ASSIGNMENTS[distKey].includes(nameLower)) {
        DISTRICT_ASSIGNMENTS[distKey].push(nameLower);
      }
      updateDistrictMappingInSheet(district, name);
    });
  }

  self.postMessage({
    type: 'customTrainerAdded',
    districtAssignments: DISTRICT_ASSIGNMENTS,
    districtsList: getAllDistricts()
  });
}

// ─── DO ASSIGNMENT ───
function handleDoAssign(section, trainer, school, selectedLocalIndices, assignDate) {
  const sheetName = SHEET_NAMES[section];
  const allData = sheetDataMap[sheetName] || [];
  const ws = workbook.Sheets[sheetName];

  const assignedRows = [];
  const assignedIds = [];

  const [y, m, d] = assignDate.split('-');
  const formattedDate = `${d}-${m}-${y}`;

  selectedLocalIndices.forEach(idx => {
    const r = allData[idx];
    r.Status = 'Shared';
    r.Trainer = trainer;
    r.Date = formattedDate;

    // Write directly back to the worksheet
    const excelRow = r._origIdx;
    ws[getCellRef(excelRow, COL_MAP.Status)] = { t: 's', v: 'Shared' };
    ws[getCellRef(excelRow, COL_MAP.Trainer)] = { t: 's', v: trainer };
    ws[getCellRef(excelRow, COL_MAP.Date)] = { t: 's', v: formattedDate };

    assignedRows.push(r);
    assignedIds.push(r.AdobeID);
  });

  self.postMessage({
    type: 'assignmentDone',
    assignedRows: assignedRows,
    assignedIds: assignedIds,
    sheetStats: getCompiledStats()
  });
}

// ─── CLEAR SESSION ASSIGNMENTS ───
function handleClearSessionAssignments() {
  self.postMessage({ type: 'clearedSuccess' });
}

// ─── DOWNLOAD UPDATED MASTER FILE ───
function handleDownloadMaster(sessionLog) {
  // Re-apply all assignments from log just in case
  reapplySavedAssignments(sessionLog);

  // Append session log to "IDs shared" sheet
  appendToIdsSharedSheet(sessionLog);

  // Write workbook to array buffer
  const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });

  self.postMessage({
    type: 'masterFileGenerated',
    buffer: outBuffer
  }, [outBuffer]);
}

function appendToIdsSharedSheet(log) {
  const sheetName = 'IDs shared';
  if (!workbook.SheetNames.includes(sheetName)) return;
  const ws = workbook.Sheets[sheetName];
  const existing = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  log.forEach(l => {
    existing.push([l.trainer, l.section, l.school, l.count, l.date]);
  });

  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(existing);
}

// ─── DOWNLOAD TRAINER SHEET ───
function handleDownloadTrainerSheet(section, assignedLocalIndices, visibleColsList) {
  const sheetName = SHEET_NAMES[section];
  const allData = sheetDataMap[sheetName] || [];

  const rows = assignedLocalIndices.map(idx => allData[idx]);

  // Build sheet data with selected columns
  const wsData = [visibleColsList.map(k => COL_HEADERS[k])]; // Header row
  rows.forEach(r => {
    wsData.push(visibleColsList.map(k => r[k]));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = visibleColsList.map(k => ({
    wch: k === 'AdobeID' ? 28 : k === 'SchoolName' ? 24 : k === 'GradeSection' ? 26 : 16
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assigned IDs');

  const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });

  self.postMessage({
    type: 'trainerSheetGenerated',
    buffer: outBuffer
  }, [outBuffer]);
}

function getCompiledStats() {
  const stats = {};
  Object.entries(SHEET_NAMES).forEach(([sec, name]) => {
    const data = sheetDataMap[name] || [];
    const total = data.length;
    const shared = data.filter(r => String(r.Status).toLowerCase().trim() === 'shared').length;
    stats[sec] = { total, shared, notShared: total - shared };
  });
  return stats;
}
