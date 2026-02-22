// src/lib/constants.js
export const ROLE_LABELS = {
  administrator:    "Administrator",
  office_employee:  "Pracownik Biura",
  editor:           "Redaktor",
  quality_control:  "Kontrola Jakości",
  illustrator:      "Ilustrator",
  graphic_designer: "Grafik",
  printer:          "Drukarz",
};

export const ROLE_COLORS = {
  administrator:    "#6366f1",
  office_employee:  "#0ea5e9",
  editor:           "#f59e0b",
  quality_control:  "#10b981",
  illustrator:      "#ec4899",
  graphic_designer: "#8b5cf6",
  printer:          "#14b8a6",
};

export const STATUS_LABELS = {
  created:                "Nowe",
  office_processing:      "W trakcie – Biuro",
  editor_pool:            "Pula Redaktorów",
  editor_processing:      "W trakcie – Redakcja",
  qc_editor_review:       "QC – po Redakcji",
  illustrator_pool:       "Pula Ilustratorów",
  illustrator_processing: "W trakcie – Ilustracja",
  qc_illustrator_review:  "QC – po Ilustracji",
  designer_pool:          "Pula Grafików",
  designer_processing:    "W trakcie – Projekt",
  qc_designer_review:     "QC – po Projekcie",
  printer_pool:           "Pula Drukarzy",
  printer_processing:     "W trakcie – Druk",
  completed:              "Zakończone",
  cancelled:              "Anulowane",
};

export const STATUS_COLORS = {
  created:                "#64748b",
  office_processing:      "#0ea5e9",
  editor_pool:            "#f59e0b",
  editor_processing:      "#f59e0b",
  qc_editor_review:       "#10b981",
  illustrator_pool:       "#ec4899",
  illustrator_processing: "#ec4899",
  qc_illustrator_review:  "#10b981",
  designer_pool:          "#8b5cf6",
  designer_processing:    "#8b5cf6",
  qc_designer_review:     "#10b981",
  printer_pool:           "#14b8a6",
  printer_processing:     "#14b8a6",
  completed:              "#22c55e",
  cancelled:              "#ef4444",
};

export const POOL_FOR_ROLE = {
  editor:           "editor_pool",
  illustrator:      "illustrator_pool",
  graphic_designer: "designer_pool",
  printer:          "printer_pool",
};

export const PROCESSING_FOR_ROLE = {
  editor:           "editor_processing",
  illustrator:      "illustrator_processing",
  graphic_designer: "designer_processing",
  printer:          "printer_processing",
};

export const QC_STATES = ["qc_editor_review", "qc_illustrator_review", "qc_designer_review"];

export const ROLES_WITH_PII = ["administrator", "office_employee", "quality_control"];

export const TIMEOUT_SECONDS = 2 * 60 * 60;

export const FILE_ICONS = {
  "application/pdf": "📄",
  "image/png": "🖼",
  "image/jpeg": "🖼",
  "image/svg+xml": "🎨",
  "application/zip": "📦",
  default: "📎",
};
