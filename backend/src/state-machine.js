// src/state-machine.js — Order workflow state machine

const TRANSITIONS = {
  created:                { submit:   "editor_pool" },
  editor_pool:            { claim:   "editor_processing" },
  editor_processing:      { complete: "qc_editor_review",      reject: "editor_pool",     timeout: "editor_pool" },
  qc_editor_review:       { approve: "illustrator_pool",       reject: "editor_rework" },
  editor_rework:          { complete: "qc_editor_review",      timeout: "editor_pool" },
  illustrator_pool:       { claim:   "illustrator_processing" },
  illustrator_processing: { complete: "qc_illustrator_review", reject: "illustrator_pool", timeout: "illustrator_pool" },
  qc_illustrator_review:  { approve: "designer_pool",          reject: "illustrator_rework" },
  illustrator_rework:     { complete: "qc_illustrator_review", timeout: "illustrator_pool" },
  designer_pool:          { claim:   "designer_processing" },
  designer_processing:    { complete: "qc_designer_review",    reject: "designer_pool",    timeout: "designer_pool" },
  qc_designer_review:     { approve: "printer_pool",           reject: "designer_rework" },
  designer_rework:        { complete: "qc_designer_review",    timeout: "designer_pool" },
  printer_pool:           { claim:   "printer_processing" },
  printer_processing:     { complete: "completed",             reject: "printer_pool",     timeout: "printer_pool" },
};

const PROCESSING_STATES = new Set([
  "editor_processing", "illustrator_processing", "designer_processing", "printer_processing"
]);

const REWORK_STATES = new Set([
  "editor_rework", "illustrator_rework", "designer_rework"
]);

const POOL_STATES = new Set([
  "editor_pool", "illustrator_pool", "designer_pool", "printer_pool"
]);

const QC_STATES = new Set([
  "qc_editor_review", "qc_illustrator_review", "qc_designer_review"
]);

const ROLE_POOL = {
  editor:           "editor_pool",
  illustrator:      "illustrator_pool",
  graphic_designer: "designer_pool",
  printer:          "printer_pool",
};

const ROLE_PROCESSING = {
  editor:           "editor_processing",
  illustrator:      "illustrator_processing",
  graphic_designer: "designer_processing",
  printer:          "printer_processing",
};

const ROLE_REWORK = {
  editor:           "editor_rework",
  illustrator:      "illustrator_rework",
  graphic_designer: "designer_rework",
};

// Map from rework state to pool state (for timeout fallback)
const REWORK_TO_POOL = {
  editor_rework:       "editor_pool",
  illustrator_rework:  "illustrator_pool",
  designer_rework:     "designer_pool",
};

// Who is allowed to perform each action (with multi-role support)
const ACTION_ROLES = {
  submit:   ["office_employee", "administrator"],
  claim:    ["editor", "illustrator", "graphic_designer", "printer"],
  complete: ["editor", "illustrator", "graphic_designer", "printer"],
  reject:   ["editor", "illustrator", "graphic_designer", "printer"],
  approve:  ["quality_control", "administrator"],
  cancel:   ["administrator"],
};

function getNextStatus(currentStatus, action) {
  if (action === "cancel") return "cancelled";
  return TRANSITIONS[currentStatus]?.[action] || null;
}

function canPerformAction(userRoles, action) {
  const allowedRoles = ACTION_ROLES[action] || [];
  return userRoles.some(role => allowedRoles.includes(role));
}

function isProcessingState(status) {
  return PROCESSING_STATES.has(status);
}

function isReworkState(status) {
  return REWORK_STATES.has(status);
}

function isPoolState(status) {
  return POOL_STATES.has(status);
}

function isQCState(status) {
  return QC_STATES.has(status);
}

const TIMEOUT_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  TRANSITIONS, ROLE_POOL, ROLE_PROCESSING, ROLE_REWORK, REWORK_TO_POOL,
  getNextStatus, canPerformAction,
  isProcessingState, isReworkState, isPoolState, isQCState,
  TIMEOUT_SECONDS,
};
