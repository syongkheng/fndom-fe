export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRequirement {
  key: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special'
  met: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'length', met: password.length >= PASSWORD_MIN_LENGTH },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'number', met: /\d/.test(password) },
    { key: 'special', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.met)
}
