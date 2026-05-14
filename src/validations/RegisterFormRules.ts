import type { FormRules } from 'element-plus'

export function getRegisterFormRules(form: { password: string }, t: (key: string) => string): FormRules {
  return {
    email: [
      { required: true, message: t('auth.validation.email_required'), trigger: 'blur' },
      {
        validator: (_, value, callback) => {
          const emailRegex =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          if (value && !emailRegex.test(value)) {
            callback(new Error(t('auth.validation.email_invalid')))
          } else {
            callback()
          }
        },
        trigger: ['blur', 'change'],
      },
    ],
    password: [
      { required: true, message: t('auth.validation.password_required'), trigger: 'blur' },
      { min: 8, message: t('auth.validation.password_min'), trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: t('auth.validation.confirm_password_required'), trigger: 'blur' },
      {
        validator: (_, value, callback) => {
          if (value !== form.password) {
            callback(new Error(t('auth.validation.confirm_password_mismatch')))
          }
        },
        trigger: ['blur', 'change'],
      },
    ],
    username: [
      { required: true, message: t('auth.validation.username_required'), trigger: 'blur' },
      { min: 3, message: t('auth.validation.username_min'), trigger: 'blur' },
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
