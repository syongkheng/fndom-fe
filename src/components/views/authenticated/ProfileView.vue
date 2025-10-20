<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElInput, ElButton, ElSelect, ElOption, ElCard, ElTag, ElIcon } from 'element-plus'
import { Location, User, Lock, Check } from '@element-plus/icons-vue'
import { useAuthenticationStore } from '@/stores/authentication'
import { CountryList } from '@/constants/Country'
import useProfileManager from '@/hooks/useProfileManager'
import { FileUtils } from '@/utilities/FileUtils'

// Store setup
const { userProfile } = useAuthenticationStore()
const { getUserCountry, updateUserCountry, getUserProfilePhoto, updateUserPhoto, validatePassword, updatePassword } = useProfileManager()

// Profile data
const profile = ref({
  country: '',
  avatar: '',
})

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Password validation state
const isPasswordValidated = ref(false)
const isValidating = ref(false)

// File selection
const selectedFile = ref<File | null>(null)

// Handle file selection
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] as File
  if (!file) return
  selectedFile.value = file
  profile.value.avatar = URL.createObjectURL(file)
  uploadProfilePhoto(file)
}

// Upload photo manually
const uploadProfilePhoto = async (file: File) => {
  const blobString = await FileUtils.convertFileToBase64(file)
  const mimeType = file.type
  const sizeInBytes = file.size
  const fileName = file.name
  if (!selectedFile.value) {
    ElMessage.error('Please select a photo first.')
    return
  }

  try {
    const response = await updateUserPhoto({ blobString, mimeType, sizeInBytes, fileName })
    ElMessage.success('Profile photo uploaded successfully!')
    console.log('Upload response:', response.data)
  } catch (error) {
    console.error('Upload failed:', error)
    ElMessage.error('Failed to upload photo.')
  }
}

// Validate current password
const handleValidatePassword = async () => {
  if (!passwordForm.value.currentPassword) {
    ElMessage.error('Please enter your current password.')
    return
  }

  try {
    isValidating.value = true
    const valid = await validatePassword(passwordForm.value.currentPassword)
    if (valid) {
      isPasswordValidated.value = true
      ElMessage.success('Current password validated successfully!')
    } else {
      ElMessage.error('Invalid current password.')
      isPasswordValidated.value = false
    }
  } catch (error) {
    console.error('Validation error:', error)
    ElMessage.error('Failed to validate password.')
  } finally {
    isValidating.value = false
  }
}

// Change password handler
const handleChangePassword = async () => {
  if (
    !passwordForm.value.newPassword ||
    passwordForm.value.newPassword !== passwordForm.value.confirmPassword
  ) {
    ElMessage.error('Passwords do not match!')
    return
  }
  const result = await updatePassword(passwordForm.value.newPassword)
  if (result) {
    passwordForm.value.currentPassword = ''
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
    isPasswordValidated.value = false
    ElMessage.success('Password changed successfully!')
    return
  }
  ElMessage.error('Failed to change password.')

}

// Update country handler
const handleUpdateCountry = async () => {
  const result = await updateUserCountry(profile.value.country)
  if (result) {
    ElMessage.success(`Country updated to ${profile.value.country}`)
  } else {
    ElMessage.error('Failed to update country.')
  }
}

// Load initial data
onMounted(async () => {
  const country = await getUserCountry()
  const profilePhoto = await getUserProfilePhoto()
  profile.value.country = country ?? ''
  profile.value.avatar = profilePhoto ?? ''
})
</script>


<template>
  <main class="profile-view">
    <header class="profile-header">
      <h1 class="profile-title">My Profile</h1>
      <p class="profile-subtitle">Manage your personal information and security settings</p>
    </header>

    <section class="profile-content">
      <!-- LEFT SIDE -->
      <el-card class="profile-section avatar-section">
        <h2 class="section-title">Personal Info</h2>

        <!-- Avatar Upload -->
        <div class="avatar-upload-container">
          <label class="avatar-upload-label">
            <input type="file" accept="image/*" class="avatar-input" @change="handleFileChange" />
            <div class="avatar-circle">
              <img v-if="profile.avatar" :src="profile.avatar" alt="Avatar" class="avatar-image" />
              <div v-else class="avatar-placeholder">
                <el-icon size="40">
                  <User />
                </el-icon>
              </div>
              <div class="avatar-overlay">Upload DP</div>
            </div>
          </label>
        </div>

        <!-- Username -->
        <div class="profile-details">
          <p><strong>Username:</strong> {{ userProfile.username }}</p>
        </div>

        <!-- Role -->
        <div class="roles-container">
          <strong>Role:</strong>
          <div class="roles">
            <el-tag type="info" class="role-tag">{{ userProfile.role }}</el-tag>
          </div>
        </div>

        <!-- Country Selection -->
        <div class="country-container">
          <el-icon>
            <Location />
          </el-icon>
          <span class="country-select">
            <el-select v-model="profile.country" placeholder="Select Country" filterable>
              <el-option v-for="country in CountryList" :key="country" :label="country" :value="country" />
            </el-select>
            <el-button type="primary" style="margin-left: 0.5rem;" @click="handleUpdateCountry">
              Update
            </el-button>
          </span>
        </div>
      </el-card>

      <!-- RIGHT SIDE -->
      <el-card class="profile-section password-section">
        <h2 class="section-title">Change Password</h2>

        <!-- Current password + validate -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
          <el-input v-model="passwordForm.currentPassword" placeholder="Current Password" show-password
            :prefix-icon="Lock" />
          <el-button type="success" :loading="isValidating" :disabled="isPasswordValidated"
            @click="handleValidatePassword">
            <template v-if="isPasswordValidated">
              <el-icon>
                <Check />
              </el-icon> Validated
            </template>
            <template v-else>Validate</template>
          </el-button>
        </div>

        <!-- New passwords -->
        <el-input v-model="passwordForm.newPassword" placeholder="New Password" show-password :prefix-icon="Lock" />
        <el-input v-model="passwordForm.confirmPassword" placeholder="Confirm New Password" show-password
          :prefix-icon="Lock" />

        <!-- Final update button -->
        <el-button type="primary" :disabled="!isPasswordValidated" @click="handleChangePassword"
          style="width: 100%; margin-top: 1rem">
          Update Password
        </el-button>
      </el-card>
    </section>
  </main>
</template>

<style scoped>
.profile-view {
  background-color: #f8f9fb;
  min-height: 100vh;
  padding: 2rem 1.5rem;
}

.profile-header {
  margin-bottom: 1.5rem;
}

.profile-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2937;
}

.profile-subtitle {
  font-size: 1rem;
  color: #6b7280;
}

.profile-content {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.profile-section {
  flex: 1;
  min-width: 300px;
  border-radius: 1rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
}

/* Avatar upload section */
.avatar-upload-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.avatar-upload-label {
  position: relative;
  cursor: pointer;
}

.avatar-input {
  display: none;
}

.avatar-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  background-color: #f3f4f6;
  border: 3px solid #e5e7eb;
  transition: transform 0.2s ease;
}

.avatar-circle:hover {
  transform: scale(1.05);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #9ca3af;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-weight: 500;
  font-size: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.avatar-circle:hover .avatar-overlay {
  opacity: 1;
}

.roles-container {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.country-container {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.country-select {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
}

.password-section .el-input {
  margin-bottom: 0.75rem;
}

@media (max-width: 900px) {
  .profile-content {
    flex-direction: column;
  }
}
</style>
