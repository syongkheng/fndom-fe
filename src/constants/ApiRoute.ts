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
  EVENT: {
    RETRIEVE: `/api/fnd/events`,
    ADD: `/api/fnd/events/create`,
    UPDATE: `/api/fnd/events/update`,
    DELETE: `/api/fnd/events/delete`,
  },
  PROFILE: {
    GET_COUNTRY: `/api/pfp/user/country`,
    UPDATE_COUNTRY: `/api/pfp/user/country`,
    UPLOAD_PHOTO: `/api/pfp/user/photo`,
    GET_PHOTO: `/api/pfp/user/photo`,
    VALIDATE_PASSWORD: `/api/auth/password/validate`,
    UPDATE_PASSWORD: `/api/auth/password/update`,
  },
}
