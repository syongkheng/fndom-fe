export const ApiRoute = {
  AUTHENTICATE: {
    PREFLIGHT: `/api/auth/preflight`,
    REGISTER: `/api/auth/register`,
    LOGIN: `/api/auth/login`,
    TOKEN_VERIFICATION: `/api/auth/verification`,
  },
  PROFILE: {
    GET_COUNTRY: `/api/pfp/user/country`,
    UPDATE_COUNTRY: `/api/pfp/user/country`,
    UPLOAD_PHOTO: `/api/pfp/user/photo`,
    GET_PHOTO: `/api/pfp/user/photo`,
    VALIDATE_PASSWORD: `/api/auth/password/validate`,
    UPDATE_PASSWORD: `/api/auth/password/update`,
  },
  PPHS: {
    GET_PPHS_DATA: `/api/hdb/pphs`,
    UPDATE_PPHS_COORDINATES: `/api/hdb/pphs/update`,
    GET_NEAREST_BUSSTOPS: `/api/hdb/pphs/busstops`,
    GET_NEAREST_MRT_STATIONS: `/api/hdb/pphs/mrt`,
  },
  LTA: {
    GET_BUS_SVC_BY_BUSSTOP_CODE: `/api/lta/bus/services`,
  },
  ITINERARY: {
    RETRIEVE_BY_ID: (sessionId: string | undefined) => `/api/itinerary/${sessionId}`,
    CREATE: `/api/itinerary`,
    MODIFY: `/api/itinerary/edit`,
    CHECK_PERMISSION: `/api/itinerary/challenge`,
    ADD_COLLABORATOR: `/api/itinerary/add-collaborator`,
  },
  FILE: {
    CREATE: `/api/file`,
    DELETE: `/api/file/delete`,
  },
}
