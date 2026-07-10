import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import SectionSelect from './components/SectionSelect';
import Workspace from './components/Workspace';
import AddTrainerModal from './components/AddTrainerModal';
import LoadingOverlay from './components/LoadingOverlay';
import Toast, { showToast } from './components/Toast';
import { useWorker } from './hooks/useWorker';
import {
  COL_KEYS,
  DEFAULT_VISIBLE_COLS,
  todayISO,
  todayDateStr,
  formatDateForDisplay,
  getCandidateFilenames,
  downloadBlob,
  getSavedSessionLog,
  saveSessionLog,
  saveCustomTrainer,
  removeTrainer,
  getSavedCustomTrainerDistricts
} from './utils/helpers';

export default function App() {
  // ─── STATE ───
  const [currentStep, setCurrentStep] = useState(2); // 2=section, 3=workspace
  const [currentSection, setCurrentSection] = useState(null);
  const [currentSchool, setCurrentSchool] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [assignDate, setAssignDate] = useState(todayISO());
  const [stats, setStats] = useState(null);
  const [sessionLog, setSessionLog] = useState([]);
  const [schools, setSchools] = useState([]);
  const [notSharedRows, setNotSharedRows] = useState([]);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState(new Set());
  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_VISIBLE_COLS));
  const [districtAssignments, setDistrictAssignments] = useState({});
  const [allDistrictsList, setAllDistrictsList] = useState([]);
  const [originalFileName, setOriginalFileName] = useState('');

  const districts = React.useMemo(() => {
    const dSet = new Set();
    schools.forEach(([_, counts]) => {
      if (counts.district) {
        dSet.add(counts.district);
      }
    });
    return Array.from(dSet).sort((a, b) => a.localeCompare(b));
  }, [schools]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('');
  const [loadingSub, setLoadingSub] = useState('');
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [trainerWarning, setTrainerWarning] = useState('');
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const { postMessage, on } = useWorker();
  const sessionLogRef = useRef(sessionLog);

  // Keep ref in sync
  useEffect(() => {
    sessionLogRef.current = sessionLog;
  }, [sessionLog]);

  // ─── WORKER MESSAGE HANDLERS ───
  useEffect(() => {
    on('loadingProgress', (data) => {
      setShowLoadingOverlay(true);
      setLoadingText(data.message);
      setLoadingSub('Please wait...');
    });

    on('loadSuccess', (data) => {
      setOriginalFileName(data.originalFileName);
      setDistrictAssignments(data.districtAssignments);
      setAllDistrictsList(data.districtsList);
      setStats(data.sheetStats);
      setIsDataLoaded(true);
      setIsLoading(false);
      setShowLoadingOverlay(false);
      showToast('Loaded workbook successfully!', 'success');
    });

    on('loadFailed', (data) => {
      setIsLoading(false);
      setShowLoadingOverlay(false);
      showToast(data.message, 'warning');
    });

    on('schoolsData', (data) => {
      setSchools(data.schools);
    });

    on('notSharedRowsData', (data) => {
      setNotSharedRows(data.rows);
    });

    on('assignmentDone', (data) => {
      setStats(data.sheetStats);

      const formattedDate = formatDateForDisplay(
        document.getElementById('assignDate')?.value || todayISO()
      );

      const newLogEntry = {
        trainer: selectedTrainerRef.current,
        section: currentSectionRef.current,
        school: currentSchoolRef.current,
        count: data.assignedRows.length,
        date: formattedDate,
        assignedIds: data.assignedIds,
        assignedLocalIndices: data.assignedRows.map(r => r._origIdx)
      };

      setSessionLog(prev => {
        const updated = [...prev, newLogEntry];
        saveSessionLog(updated);
        return updated;
      });

      setConfirmationData({
        trainer: selectedTrainerRef.current,
        school: currentSchoolRef.current,
        date: formattedDate,
        assignedRows: data.assignedRows
      });
      setShowAssignment(false);
      setShowConfirmation(true);
      setShowLoadingOverlay(false);
      showToast(`${data.assignedRows.length} IDs assigned to ${selectedTrainerRef.current}`, 'success');
    });

    on('customTrainerAdded', (data) => {
      setDistrictAssignments(data.districtAssignments);
      setAllDistrictsList(data.districtsList);
      showToast('Trainer added successfully', 'success');
    });

    on('masterFileGenerated', (data) => {
      downloadBlob(data.buffer, `${originalFileNameRef.current}_${todayDateStr()}.xlsx`);
      setShowLoadingOverlay(false);
    });

    on('trainerSheetGenerated', (data) => {
      const log = sessionLogRef.current;
      const last = log[log.length - 1];
      const sanitize = s => String(s).replace(/[^a-zA-Z0-9]/g, '');
      const fname = `${sanitize(last.trainer)}_${last.date.replace(/\//g, '-')}.xlsx`;
      downloadBlob(data.buffer, fname);
      setShowLoadingOverlay(false);
    });

    on('clearedSuccess', () => {
      setShowLoadingOverlay(false);
    });

    on('error', (data) => {
      setShowLoadingOverlay(false);
      showToast('Error: ' + data.message, 'warning');
    });
  }, [on]);

  // Refs for values needed in worker callbacks
  const selectedTrainerRef = useRef(selectedTrainer);
  const currentSectionRef = useRef(currentSection);
  const currentSchoolRef = useRef(currentSchool);
  const originalFileNameRef = useRef(originalFileName);

  useEffect(() => { selectedTrainerRef.current = selectedTrainer; }, [selectedTrainer]);
  useEffect(() => { currentSectionRef.current = currentSection; }, [currentSection]);
  useEffect(() => { currentSchoolRef.current = currentSchool; }, [currentSchool]);
  useEffect(() => { originalFileNameRef.current = originalFileName; }, [originalFileName]);

  // ─── AUTO-LOAD WORKBOOK ───
  useEffect(() => {
    let savedLog = getSavedSessionLog();
    // Filter out Shubham to clean up any test assignments
    const cleanedLog = savedLog.filter(l => l.trainer.toLowerCase() !== 'shubham');
    if (cleanedLog.length !== savedLog.length) {
      saveSessionLog(cleanedLog);
      savedLog = cleanedLog;
    }
    setSessionLog(savedLog);

    // Small delay to ensure worker is ready
    const timer = setTimeout(() => {
      postMessage({
        action: 'load',
        urlCandidates: getCandidateFilenames(),
        sessionLog: savedLog,
        customTrainerDistricts: getSavedCustomTrainerDistricts()
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [postMessage]);

  // ─── NAVIGATION ───
  const goToStep = useCallback((step) => {
    setCurrentStep(step);
    if (step === 2) {
      // Reset workspace state
    }
    if (step === 3) {
      resetWorkspace();
    }
  }, []);

  function resetWorkspace() {
    setCurrentSchool(null);
    setSelectedDistrict('');
    setSelectedCheckboxes(new Set());
    setShowAssignment(false);
    setShowConfirmation(false);
    setConfirmationData(null);
    setTrainerWarning('');
    setNotSharedRows([]);
    setSchools([]);
  }

  // ─── SECTION SELECT ───
  function handleSelectSection(sec) {
    setCurrentSection(sec);
    setAssignDate(todayISO());
    setSelectedTrainer('');
    setSelectedDistrict('');
    setCurrentStep(3);
    resetWorkspace();
  }

  // ─── TRAINER CHANGE ───
  function handleTrainerChange(trainer) {
    setSelectedTrainer(trainer);
    setSelectedDistrict('');
    setCurrentSchool(null);
    setShowAssignment(false);
    setShowConfirmation(false);
    setConfirmationData(null);
    setNotSharedRows([]);

    if (trainer) {
      postMessage({
        action: 'getSchools',
        section: currentSectionRef.current || currentSection,
        trainer: trainer
      });

      // Check if trainer was already used
      const dup = sessionLog.find(l => l.trainer.toLowerCase() === trainer.toLowerCase());
      if (dup) {
        setTrainerWarning(`"${trainer}" was already used in this session (${dup.school}). You can still proceed.`);
      } else {
        setTrainerWarning('');
      }
    } else {
      setSchools([]);
      setTrainerWarning('');
    }
  }

  // ─── PICK SCHOOL ───
  function handlePickSchool(name) {
    setCurrentSchool(name);
    setShowAssignment(true);
    setShowConfirmation(false);
    setConfirmationData(null);
    setSelectedCheckboxes(new Set());

    postMessage({
      action: 'getNotSharedRows',
      section: currentSection,
      school: name,
      trainer: selectedTrainer
    });
  }

  // ─── ROW SELECTION ───
  function handleToggleRow(localIdx, checked) {
    setSelectedCheckboxes(prev => {
      const next = new Set(prev);
      if (checked) next.add(localIdx);
      else next.delete(localIdx);
      return next;
    });
  }

  function handleQtyChange(qty) {
    const newSet = new Set();
    if (qty > 0) {
      for (let i = 0; i < qty && i < notSharedRows.length; i++) {
        newSet.add(notSharedRows[i].localIdx);
      }
    }
    setSelectedCheckboxes(newSet);
  }

  function handleResetSelection() {
    setSelectedCheckboxes(new Set());
  }

  // ─── COLUMN TOGGLE ───
  function handleToggleColumn(key, checked) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  // ─── ASSIGN ───
  function handleAssign() {
    setShowLoadingOverlay(true);
    setLoadingText(`Assigning IDs to ${selectedTrainer}…`);
    setLoadingSub('Updating workbook in background…');

    postMessage({
      action: 'doAssign',
      section: currentSection,
      trainer: selectedTrainer,
      school: currentSchool,
      selectedLocalIndices: Array.from(selectedCheckboxes),
      assignDate: assignDate
    });
  }

  // ─── DOWNLOAD TRAINER SHEET ───
  function handleDownloadTrainer() {
    setShowLoadingOverlay(true);
    setLoadingText('Generating trainer sheet...');
    setLoadingSub('Please wait...');

    const last = sessionLog[sessionLog.length - 1];
    postMessage({
      action: 'downloadTrainerSheet',
      section: last.section,
      assignedLocalIndices: last.assignedLocalIndices,
      visibleColsList: COL_KEYS.filter(k => visibleCols.has(k))
    });
  }

  // ─── DOWNLOAD MASTER ───
  function handleDownloadMaster() {
    setShowLoadingOverlay(true);
    setLoadingText('Generating updated master file...');
    setLoadingSub('Processing 570k rows...');

    postMessage({
      action: 'downloadMaster',
      sessionLog: sessionLog
    });
  }

  // ─── CLEAR SESSION LOG ───
  function handleClearLog() {
    if (window.confirm('Are you sure you want to clear the Session Assignments log? This cannot be undone.')) {
      setSessionLog([]);
      localStorage.removeItem('distributor_session_log');
      showToast('Session log cleared', 'info');

      // Re-load workbook to reset state
      setIsLoading(true);
      setIsDataLoaded(false);
      postMessage({
        action: 'load',
        urlCandidates: getCandidateFilenames(),
        sessionLog: [],
        customTrainerDistricts: getSavedCustomTrainerDistricts()
      });
    }
  }

  // ─── ADD TRAINER ───
  function handleSaveTrainer(name, districts) {
    if (!name) {
      showToast('Please enter a trainer name', 'warning');
      return;
    }
    if (districts.length > 0) {
      // Check if at least one selected
    } else {
      // No districts required
    }

    saveCustomTrainer(name, districts);
    postMessage({
      action: 'addCustomTrainer',
      name: name,
      districts: districts
    });

    setSelectedTrainer(name);
    setShowAddTrainerModal(false);
  }

  // ─── CONTINUE ASSIGNING ───
  function handleContinue() {
    setCurrentStep(2);
  }

  // ─── REMOVE TRAINER ───
  function handleRemoveTrainer(name) {
    removeTrainer(name);
    if (selectedTrainer === name) {
      setSelectedTrainer('');
    }
    // Force re-render by toggling a dummy state
    setForceUpdate(prev => prev + 1);
    showToast(`${name} removed from trainers`, 'success');
  }

  // ─── RENDER ───
  return (
    <>
      <div className="app-container">
        <Header
          isLoading={isLoading}
          canDownload={isDataLoaded}
          onDownloadMaster={handleDownloadMaster}
        />

        {currentStep === 2 && (
          <SectionSelect
            stats={stats}
            isDataLoaded={isDataLoaded}
            sessionLog={sessionLog}
            onSelectSection={handleSelectSection}
            onClearLog={handleClearLog}
          />
        )}

        {currentStep === 3 && (
          <Workspace
            currentSection={currentSection}
            selectedTrainer={selectedTrainer}
            selectedDistrict={selectedDistrict}
            districts={districts}
            assignDate={assignDate}
            districtAssignments={districtAssignments}
            schools={schools}
            currentSchool={currentSchool}
            notSharedRows={notSharedRows}
            selectedCheckboxes={selectedCheckboxes}
            visibleCols={visibleCols}
            trainerWarning={trainerWarning}
            showAssignment={showAssignment}
            showConfirmation={showConfirmation}
            confirmationData={confirmationData}
            sessionLog={sessionLog}
            onGoBack={() => goToStep(2)}
            onTrainerChange={handleTrainerChange}
            onDistrictChange={setSelectedDistrict}
            onDateChange={setAssignDate}
            onOpenAddTrainer={() => setShowAddTrainerModal(true)}
            onRemoveTrainer={handleRemoveTrainer}
            onPickSchool={handlePickSchool}
            onToggleRow={handleToggleRow}
            onQtyChange={handleQtyChange}
            onResetSelection={handleResetSelection}
            onAssign={handleAssign}
            onToggleColumn={handleToggleColumn}
            onDownloadTrainer={handleDownloadTrainer}
            onContinue={handleContinue}
          />
        )}
      </div>

      {/* Add Trainer Modal */}
      <AddTrainerModal
        visible={showAddTrainerModal}
        allDistrictsList={allDistrictsList}
        onClose={() => setShowAddTrainerModal(false)}
        onSave={handleSaveTrainer}
      />

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <LoadingOverlay text={loadingText} subText={loadingSub} />
      )}

      {/* Toast */}
      <Toast />
    </>
  );
}
