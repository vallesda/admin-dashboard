/**
 * Page-number sequence with ellipses for the pagination control.
 *
 * Moved out of `app/lib/utils.ts`, which also held `formatCurrency` (hardcoded
 * to en-US/USD) and `generateYAxis` (for the tutorial's revenue chart). Those
 * died with the invoice code; this is the part worth keeping.
 */
export function generatePagination(currentPage: number, totalPages: number) {
  // Few enough pages to show them all.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the start: first three, then a jump to the end.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // Near the end: mirror image.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // Somewhere in the middle: a window around the current page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
}
