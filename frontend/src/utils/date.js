// Utility helpers for consistent date formatting across the app
// Preferred display format: dd-mm-yyyy

export function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Accepts a Date object, ISO string, or falsy value. Returns 'dd-mm-yyyy' or empty string for invalid input
export function formatDateDisplay(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

// Returns YYYY-MM-DD (useful for inputs and filenames where ISO-like ordering is desired)
export function formatDateISO(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

// Returns time as HH:MM (24-hour) for a Date or ISO string
export function formatTimeDisplay(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${hh}:${mm}`;
}

// Combined date + time display: dd-mm-yyyy HH:MM
export function formatDateTimeDisplay(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDateDisplay(date)} ${formatTimeDisplay(date)}`;
}

// Relative date formatter for notifications:
// - If timestamp is today => "Today HH:MM"
// - If timestamp is yesterday => "Yesterday HH:MM"
// - Otherwise => "dd-mm-yyyy HH:MM"
export function formatRelativeDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const targetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (targetDay.getTime() === today.getTime()) {
    return `Today ${formatTimeDisplay(date)}`;
  }

  if (targetDay.getTime() === yesterday.getTime()) {
    return `Yesterday ${formatTimeDisplay(date)}`;
  }

  return `${formatDateDisplay(date)} ${formatTimeDisplay(date)}`;
}

// File-friendly short date (YYYYMMDD)
export function formatDateFile(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${y}${m}${d}`;
}

const dateUtils = {
  formatDateDisplay,
  formatDateISO,
  formatDateFile,
  pad,
};

export default dateUtils;
