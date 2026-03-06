<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Check, Location } from '@element-plus/icons-vue'
import { useAuthenticationStore } from '@/stores/authentication'
import { CountryList } from '@/constants/Country'
import useProfileManager from '@/hooks/useProfileManager'
import { FileUtils } from '@/utilities/FileUtils'
import { useNav } from '@/hooks/useNav'

const { userProfile } = useAuthenticationStore()
const { getUserCountry, updateUserCountry, getUserProfilePhoto, updateUserPhoto, validatePassword, updatePassword } = useProfileManager()
const navigate = useNav()

const profile = ref({ country: '', avatar: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const isPasswordValidated = ref(false)
const isValidating = ref(false)
const selectedFile = ref<File | null>(null)

// ── Role display ──────────────────────────────────────────────────────────────
const roleTagType = (role: string): 'danger' | 'warning' | 'primary' | 'success' | 'info' => {
  if (role.startsWith('SYSTEM')) return 'danger'
  if (role.startsWith('PPHS')) return 'warning'
  if (role.startsWith('KS')) return 'primary'
  if (role.startsWith('TRAVEL')) return 'success'
  return 'info'
}

const displayRoles = computed(() =>
  userProfile.roles?.length ? userProfile.roles : []
)

// ── Avatar ────────────────────────────────────────────────────────────────────
const handleFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  selectedFile.value = file
  profile.value.avatar = URL.createObjectURL(file)
  const blobString = await FileUtils.convertFileToBase64(file)
  try {
    await updateUserPhoto({ blobString, mimeType: file.type, sizeInBytes: file.size, fileName: file.name })
    ElMessage.success('Profile photo updated.')
  } catch {
    ElMessage.error('Failed to upload photo.')
  }
}

// ── Password ──────────────────────────────────────────────────────────────────
const handleValidatePassword = async () => {
  if (!passwordForm.value.currentPassword) {
    ElMessage.error('Enter your current password first.')
    return
  }
  try {
    isValidating.value = true
    const valid = await validatePassword(passwordForm.value.currentPassword)
    if (valid) {
      isPasswordValidated.value = true
      ElMessage.success('Password verified.')
    } else {
      ElMessage.error('Incorrect password.')
      isPasswordValidated.value = false
    }
  } catch {
    ElMessage.error('Could not verify password.')
  } finally {
    isValidating.value = false
  }
}

const handleChangePassword = async () => {
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error('Passwords do not match.')
    return
  }
  const result = await updatePassword(passwordForm.value.newPassword)
  if (result) {
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    isPasswordValidated.value = false
    ElMessage.success('Password changed.')
  } else {
    ElMessage.error('Failed to change password.')
  }
}

// ── Country ───────────────────────────────────────────────────────────────────
const handleUpdateCountry = async () => {
  const result = await updateUserCountry(profile.value.country)
  if (result) {
    ElMessage.success('Country updated.')
  } else {
    ElMessage.error('Failed to update country.')
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('Are you sure you want to log out?', 'Confirm Logout', {
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
    const authStore = useAuthenticationStore()
    authStore.handleLogout()
    navigate.redirectToLanding()
  } catch {
    // cancelled
  }
}

onMounted(async () => {
  const [country, photo] = await Promise.all([getUserCountry(), getUserProfilePhoto()])
  profile.value.country = country ?? ''
  profile.value.avatar = photo ?? ''
})
</script>

<template>
  <div class="profile-root">

    <!-- Page heading -->
    <div class="profile-heading">
      <h1 class="profile-title">My Profile</h1>
      <p class="profile-subtitle">Manage your personal information and account security</p>
    </div>

    <div class="profile-grid">

      <!-- ── Left: Personal info ─────────────────────────────────────── -->
      <div class="profile-card">

        <!-- Avatar -->
        <div class="avatar-wrap">
          <label class="avatar-label">
            <input type="file" accept="image/*" class="avatar-input" @change="handleFileChange" />
            <div class="avatar-circle">
              <img v-if="profile.avatar" :src="profile.avatar" alt="Avatar" class="avatar-img" />
              <div v-else class="avatar-placeholder">
                <el-icon :size="36"><User /></el-icon>
              </div>
              <div class="avatar-overlay">
                <span>Change photo</span>
              </div>
            </div>
          </label>
          <div class="avatar-meta">
            <div class="username">{{ userProfile.username }}</div>
            <div class="avatar-hint">Click photo to upload</div>
          </div>
        </div>

        <div class="card-divider" />

        <!-- Roles -->
        <div class="info-block">
          <div class="info-label">Access Roles</div>
          <div class="roles-list" v-if="displayRoles.length">
            <el-tag
              v-for="role in displayRoles"
              :key="role"
              :type="roleTagType(role)"
              size="small"
              class="role-tag"
            >
              {{ role }}
            </el-tag>
          </div>
          <div v-else class="roles-empty">
            <el-tag type="info" size="small">Member</el-tag>
          </div>
        </div>

        <div class="card-divider" />

        <!-- Country -->
        <div class="info-block">
          <div class="info-label">
            <el-icon style="margin-right: 4px; vertical-align: -2px"><Location /></el-icon>
            Country
          </div>
          <div class="country-row">
            <el-select
              v-model="profile.country"
              placeholder="Select country"
              filterable
              style="flex: 1"
            >
              <el-option
                v-for="country in CountryList"
                :key="country.value"
                :label="country.label"
                :value="country"
              />
            </el-select>
            <el-button type="primary" @click="handleUpdateCountry">Update</el-button>
          </div>
        </div>

      </div>

      <!-- ── Right: Security ────────────────────────────────────────── -->
      <div class="profile-card">

        <div class="card-section-title">Change Password</div>
        <p class="card-section-desc">Verify your current password before setting a new one.</p>

        <!-- Step 1: verify current -->
        <div class="pw-step">
          <div class="step-badge" :class="{ done: isPasswordValidated }">1</div>
          <div class="step-body">
            <div class="info-label">Current Password</div>
            <div class="pw-row">
              <el-input
                v-model="passwordForm.currentPassword"
                placeholder="Enter current password"
                show-password
                :prefix-icon="Lock"
                :disabled="isPasswordValidated"
              />
              <el-button
                :type="isPasswordValidated ? 'success' : 'default'"
                :loading="isValidating"
                :disabled="isPasswordValidated"
                @click="handleValidatePassword"
              >
                <el-icon v-if="isPasswordValidated"><Check /></el-icon>
                {{ isPasswordValidated ? 'Verified' : 'Verify' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- Step 2: new password -->
        <div class="pw-step" :class="{ disabled: !isPasswordValidated }">
          <div class="step-badge" :class="{ done: isPasswordValidated }">2</div>
          <div class="step-body">
            <div class="info-label">New Password</div>
            <el-input
              v-model="passwordForm.newPassword"
              placeholder="Min. 12 chars, upper, number, special"
              show-password
              :prefix-icon="Lock"
              :disabled="!isPasswordValidated"
              style="margin-bottom: 10px"
            />
            <div class="info-label">Confirm Password</div>
            <el-input
              v-model="passwordForm.confirmPassword"
              placeholder="Repeat new password"
              show-password
              :prefix-icon="Lock"
              :disabled="!isPasswordValidated"
            />
            <el-button
              type="primary"
              :disabled="!isPasswordValidated"
              @click="handleChangePassword"
              style="width: 100%; margin-top: 14px"
            >
              Update Password
            </el-button>
          </div>
        </div>

        <div class="card-divider" />

        <!-- Danger zone -->
        <div class="danger-zone">
          <div class="danger-label">Danger Zone</div>
          <el-button type="danger" plain @click="handleLogout">Log out of Aworkbench</el-button>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.profile-root {
  max-width: 900px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

/* Heading */
.profile-heading {
  padding: 24px 0 20px;
}

.profile-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.profile-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

/* Grid */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

/* Card */
.profile-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card-divider {
  height: 1px;
  background: var(--color-border);
  margin: 20px 0;
}

.card-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.card-section-desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0 0 20px;
  line-height: 1.5;
}

/* Avatar */
.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.avatar-label {
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-input {
  display: none;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  background: var(--color-background-mute);
  border: 2px solid var(--color-border);
  transition: border-color 0.15s;
}

.avatar-circle:hover {
  border-color: var(--el-color-primary);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  opacity: 0.35;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  text-align: center;
  padding: 4px;
}

.avatar-circle:hover .avatar-overlay {
  opacity: 1;
}

.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
}

.avatar-hint {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.4;
}

/* Info blocks */
.info-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text);
  opacity: 0.45;
}

/* Roles */
.roles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-tag {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* Country */
.country-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Password steps */
.pw-step {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
  transition: opacity 0.2s;
}

.pw-step.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-background-mute);
  border: 1.5px solid var(--color-border);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: background 0.2s, border-color 0.2s;
}

.step-badge.done {
  background: var(--el-color-success);
  border-color: var(--el-color-success);
  color: #fff;
}

.step-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pw-row {
  display: flex;
  gap: 8px;
}

/* Danger zone */
.danger-zone {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.danger-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-danger);
  opacity: 0.7;
}

/* Mobile */
@media (max-width: 640px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-title {
    font-size: 1.25rem;
  }
}
</style>
