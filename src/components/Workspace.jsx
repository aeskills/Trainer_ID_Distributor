import React from 'react';
import TrainerBar from './TrainerBar';
import SchoolSelector from './SchoolSelector';
import AssignmentArea from './AssignmentArea';
import ConfirmationArea from './ConfirmationArea';

export default function Workspace({
  currentSection,
  selectedTrainer,
  assignDate,
  districtAssignments,
  schools,
  currentSchool,
  notSharedRows,
  selectedCheckboxes,
  visibleCols,
  trainerWarning,
  showAssignment,
  showConfirmation,
  confirmationData,
  sessionLog,
  onGoBack,
  onTrainerChange,
  onDateChange,
  onOpenAddTrainer,
  onRemoveTrainer,
  onPickSchool,
  onToggleRow,
  onQtyChange,
  onResetSelection,
  onAssign,
  onToggleColumn,
  onDownloadTrainer,
  onContinue
}) {
  const tagClass = currentSection === 'KGBV' ? 'kgbv' : 'pmshri';
  const tagText = currentSection === 'PMShri' ? 'PM Shri' : currentSection;

  return (
    <section className="workspace">
      <div className="workspace-header">
        <button className="back-link" onClick={onGoBack}>← Back to sections</button>
        <span className={`section-tag ${tagClass}`}>{tagText}</span>
      </div>

      {/* Trainer + Date */}
      <TrainerBar
        selectedTrainer={selectedTrainer}
        assignDate={assignDate}
        onTrainerChange={onTrainerChange}
        onDateChange={onDateChange}
        onOpenAddTrainer={onOpenAddTrainer}
        onRemoveTrainer={onRemoveTrainer}
      />

      {/* Trainer warning */}
      {trainerWarning && (
        <div className="warning-banner">
          ⚠️ <span>{trainerWarning}</span>
        </div>
      )}

      {/* School search */}
      <SchoolSelector
        visible={!!selectedTrainer}
        schools={schools}
        selectedTrainer={selectedTrainer}
        onPickSchool={onPickSchool}
      />

      {/* Assignment area */}
      <AssignmentArea
        visible={showAssignment}
        notSharedRows={notSharedRows}
        selectedCheckboxes={selectedCheckboxes}
        visibleCols={visibleCols}
        selectedTrainer={selectedTrainer}
        onToggleRow={onToggleRow}
        onQtyChange={onQtyChange}
        onResetSelection={onResetSelection}
        onAssign={onAssign}
        onToggleColumn={onToggleColumn}
      />

      {/* Confirmation area */}
      {confirmationData && (
        <ConfirmationArea
          visible={showConfirmation}
          trainer={confirmationData.trainer}
          section={currentSection}
          school={confirmationData.school}
          date={confirmationData.date}
          assignedRows={confirmationData.assignedRows}
          visibleCols={visibleCols}
          onDownloadTrainer={onDownloadTrainer}
          onContinue={onContinue}
        />
      )}
    </section>
  );
}
