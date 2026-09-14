export function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test(dni.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function isValidPhone(phone: string): boolean {
  return /^\d{9}$/.test(phone.trim());
}
