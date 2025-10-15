import type { FormRules } from 'element-plus'

export function getLoginFormRules(): FormRules {
  return {
    password: [
      { required: true, message: 'Please input password', trigger: 'blur' },
      { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' },
    ],
    identity: [
      { required: true, message: 'Please input username or email', trigger: 'blur' },
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
