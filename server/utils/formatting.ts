export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRUT(rut: string): string {
  // Remove any existing formatting
  const cleanRUT = rut.replace(/[^0-9kK]/g, '');
  
  if (cleanRUT.length < 2) return rut;
  
  // Separate body and verifier
  const body = cleanRUT.slice(0, -1);
  const verifier = cleanRUT.slice(-1);
  
  // Add thousands separators
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedBody}-${verifier}`;
}

export function cleanRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toLowerCase();
}

export function validateRUT(rut: string): boolean {
  const cleanedRUT = cleanRUT(rut);
  
  if (cleanedRUT.length < 2) return false;
  
  const body = cleanedRUT.slice(0, -1);
  const verifier = cleanedRUT.slice(-1);
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const calculatedVerifier = remainder < 2 ? remainder.toString() : (11 - remainder === 10 ? 'k' : (11 - remainder).toString());
  
  return calculatedVerifier === verifier;
}

export function formatAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Al día';
  if (daysOverdue <= 30) return '1-30 días';
  if (daysOverdue <= 60) return '31-60 días';
  if (daysOverdue <= 90) return '61-90 días';
  return 'Más de 90 días';
}

export function getAgingColor(daysOverdue: number): string {
  if (daysOverdue <= 0) return '🟢';
  if (daysOverdue <= 30) return '🟡';
  if (daysOverdue <= 60) return '🟠';
  if (daysOverdue <= 90) return '🔴';
  return '⚫';
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}