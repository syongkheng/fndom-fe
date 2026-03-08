interface LoginForm {
  email: string      // used in all steps (preflight, login, register, verify)
  username: string   // display name, only collected during register
  password: string
  verifyCode: string
  terms: boolean
}

export type { LoginForm }
