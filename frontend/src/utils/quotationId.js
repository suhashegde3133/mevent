// Utility to generate quotation IDs in format QT-YYYY-XXXXXX (random 6-digit)
// Example: QT-2025-000347
export function generateQuotationId(
  existingQuotations = [],
  digits = 6,
  maxAttempts = 10
) {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = `QT-${year}-`;

  // build set of existing ids for quick lookup
  const existingIds = new Set();
  if (Array.isArray(existingQuotations)) {
    for (const q of existingQuotations) {
      const id = q && q.id ? String(q.id) : "";
      if (id) existingIds.add(id);
    }
  }

  function randSeq() {
    const max = Math.pow(10, digits);
    const num = Math.floor(Math.random() * max);
    return String(num).padStart(digits, "0");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seq = randSeq();
    const candidate = `${prefix}${seq}`;
    if (!existingIds.has(candidate)) return candidate;
  }

  // fallback: use timestamp-based id to avoid collision
  const fallbackSeq = String(Date.now()).slice(-digits);
  return `${prefix}${fallbackSeq}`;
}

export default generateQuotationId;
