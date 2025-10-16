export const ApiRoute = {
  AUTHENTICATE: {
    PREFLIGHT: `/api/auth/preflight`,
    REGISTER: `/api/auth/register`,
    LOGIN: `/api/auth/login`,
    TOKEN_VERIFICATION: `/api/auth/verification`,
  },
  NOTICE: {
    RETRIEVE: `/api/fnd/notices`,
    ADD: `/api/fnd/notices/create`,
    UPDATE: `/api/fnd/notices/update`,
    DELETE: `/api/fnd/notices/delete`,
  },
}
