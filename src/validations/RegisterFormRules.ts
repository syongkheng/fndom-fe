// import type { RegisterForm } from '@/interfaces/RegisterForm'
import type { FormRules } from 'element-plus'
import type { RegisterForm } from '@/interfaces/forms/RegisterForm.model'

export function getRegisterFormRules(form: RegisterForm): FormRules {
  return {
    email: [
      { required: true, message: 'Please input email address', trigger: 'blur' },
      {
        validator: (_, value, callback) => {
          const emailRegex =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          if (value && !emailRegex.test(value)) {
            callback(new Error('Please input correct email address'))
          } else {
            callback()
          }
        },
        trigger: ['blur', 'change'],
      },
    ],
    password: [
      { required: true, message: 'Please input password', trigger: 'blur' },
      { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: 'Please confirm password', trigger: 'blur' },
      {
        validator: (_, value, callback) => {
          if (value !== form.password) {
            console.error('Password mismatch')
            callback(new Error('Password Mismatch'))
          }
        },
        trigger: ['blur', 'change'],
      },
    ],
    username: [
      { required: true, message: 'Please input username', trigger: 'blur' },
      { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' },
    ],
    terms: [
      { required: true, message: 'You must agree with the terms and conditions!' },
      {
        validator: (_, value, callback) => {
          if (!value) {
            console.error('Must agree to T&C')
            callback(new Error('You must agree with the terms and conditions!'))
          }
        },
        trigger: 'change',
      },
    ],
  }
}
