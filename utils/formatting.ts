export const formatCurrency = (amount: number, currency: string = 'AUD'): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
   // Ensure date is treated as local timezone by adding time component if not present
  if (dateString.length === 10) { // YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatMonthYear = (monthYearString: string): string => { // e.g., "2023-07"
  const [year, month] = monthYearString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
  });
};

// Helper to generate unique IDs
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Format numbers for chart axes (without currency symbol, but with locale-specific formatting)
export const formatNumberForAxis = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};