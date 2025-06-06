import { validateRUT } from './formatting';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateClientIdentifier(identifier: string): ValidationResult {
  const errors: string[] = [];
  
  if (!identifier || identifier.trim().length === 0) {
    errors.push('Identificador no puede estar vacío');
    return { isValid: false, errors };
  }
  
  const trimmed = identifier.trim();
  
  // Check if it looks like a RUT
  if (/^[\d\-kK\.]+$/.test(trimmed)) {
    if (!validateRUT(trimmed)) {
      errors.push('RUT inválido');
    }
  }
  
  // Check minimum length for names
  if (!/^[\d\-kK\.]+$/.test(trimmed) && trimmed.length < 3) {
    errors.push('Nombre debe tener al menos 3 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const required = [
    'TELEGRAM_BOT_TOKEN',
    'DATABASE_URL'
  ];
  
  required.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Variable de entorno ${varName} requerida`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateGoogleSheetsConfig(): ValidationResult {
  const errors: string[] = [];
  const required = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SHEETS_CLIENT_ID',
    'GOOGLE_SHEETS_AGING_ID'
  ];
  
  required.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Variable de Google Sheets ${varName} requerida`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}