import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'

export default function useProfileManager() {
  async function getUserCountry() {
    return await HttpClient.get(ApiRoute.PROFILE.GET_COUNTRY).then((res) => {
      return res.data.data.country
    })
  }
  async function updateUserCountry(country: string) {
    return await HttpClient.post(ApiRoute.PROFILE.UPDATE_COUNTRY, { country, system: 'fnd' }).then(
      (res) => {
        return res.data.code === 200
      },
    )
  }

  async function getUserProfilePhoto() {
    return await HttpClient.get(ApiRoute.PROFILE.GET_PHOTO).then((res) => {
      return res.data.data.blobString
    })
  }

  async function updateUserPhoto({
    blobString,
    mimeType,
    sizeInBytes,
    fileName,
  }: {
    blobString: string
    mimeType: string
    sizeInBytes: number
    fileName: string
  }) {
    return await HttpClient.post(
      ApiRoute.PROFILE.UPLOAD_PHOTO,
      { blobString, mimeType, sizeInBytes, fileName },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  async function validatePassword(password: string) {
    return await HttpClient.post(ApiRoute.PROFILE.VALIDATE_PASSWORD, { password }).then((res) => {
      return res.data.data.isValid
    })
  }

  async function updatePassword(newPassword: string) {
    return await HttpClient.post(ApiRoute.PROFILE.UPDATE_PASSWORD, { newPassword }).then((res) => {
      return res.data.code === 200
    })
  }

  return {
    updatePassword,
    validatePassword,
    getUserCountry,
    updateUserCountry,
    getUserProfilePhoto,
    updateUserPhoto,
  }
}
