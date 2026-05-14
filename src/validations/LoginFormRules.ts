import type { FormRules } from 'element-plus'

export function getLoginFormRules(t: (key: string) => string): FormRules {
  return {
    password: [
      { required: true, message: t('auth.validation.password_required'), trigger: 'blur' },
    ],
    identity: [
      { required: true, message: t('auth.validation.identity_required'), trigger: 'blur' },
      { min: 3, message: t('auth.validation.identity_min'), trigger: 'blur' },
    ],
    terms: [
      { required: true, message: t('auth.validation.terms_required') },
      {
        validator: (_, value, callback) => {
          if (!value) {
            callback(new Error(t('auth.validation.terms_required')))
          }
        },
        trigger: 'change',
      },
    ],
  }
}
