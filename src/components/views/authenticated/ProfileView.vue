<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Check, Location, Edit } from '@element-plus/icons-vue'
import { useAuthenticationStore } from '@/stores/authentication'
import { CountryList } from '@/constants/Country'
import useProfileManager from '@/hooks/useProfileManager'
import { FileUtils } from '@/utilities/FileUtils'
import { useNav } from '@/hooks/useNav'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { userProfile } = useAuthenticationStore()
const {
  getUserCountry,
  updateUserCountry,
  getUserProfilePhoto,
  updateUserPhoto,
  validatePassword,
  updatePassword,
  updateUsername
} = useProfileManager()

const navigate = useNav()

const profile = ref({ country: '', avatar: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const isPasswordValidated = ref(false)
const isValidating = ref(false)

// Username
const usernameForm = ref({
  editing: false,
  value: '',
  saving: false,
  error: ''
})

const handleEditUsername = () => {
  usernameForm.value.value = userProfile.username
  usernameForm.value.error = ''
  usernameForm.value.editing = true
}

const handleSaveUsername = async () => {
  const newUsername = usernameForm.value.value.trim()

  if (newUsername.length < 3) {
    usernameForm.value.error = t('profile.username.tooShort')
    return
  }

  if (newUsername === userProfile.username) {
    usernameForm.value.editing = false
    return
  }

  usernameForm.value.saving = true
  usernameForm.value.error = ''

  const result = await updateUsername(newUsername)

  usernameForm.value.saving = false

  if (!result.isSuccess) {
    usernameForm.value.error =
      result.code === 'username_already_taken'
        ? t('profile.username.taken')
        : t('profile.username.failed')
    return
  }

  const authStore = useAuthenticationStore()
  authStore.updateUsernameInStore(result.username, result.token)

  usernameForm.value.editing = false
  ElMessage.success(t('profile.username.updated'))
}

// Avatar
const handleFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  profile.value.avatar = URL.createObjectURL(file)

  const blobString = await FileUtils.convertFileToBase64(file)

  try {
    await updateUserPhoto({
      blobString,
      mimeType: file.type,
      sizeInBytes: file.size,
      fileName: file.name
    })
    ElMessage.success(t('profile.avatar.updated'))
  } catch {
    ElMessage.error(t('profile.avatar.uploadFailed'))
  }
}

// Password
const handleValidatePassword = async () => {
  if (!passwordForm.value.currentPassword) {
    ElMessage.error(t('profile.password.current'))
    return
  }

  try {
    isValidating.value = true
    const valid = await validatePassword(passwordForm.value.currentPassword)

    if (valid) {
      isPasswordValidated.value = true
      ElMessage.success(t('profile.password.verified'))
    } else {
      ElMessage.error(t('profile.password.incorrect'))
      isPasswordValidated.value = false
    }
  } catch {
    ElMessage.error(t('profile.password.verifyFailed'))
  } finally {
    isValidating.value = false
  }
}

const handleChangePassword = async () => {
  if (
    !passwordForm.value.newPassword ||
    passwordForm.value.newPassword !== passwordForm.value.confirmPassword
  ) {
    ElMessage.error(t('profile.password.mismatch'))
    return
  }

  const result = await updatePassword(passwordForm.value.newPassword)

  if (result) {
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    isPasswordValidated.value = false
    ElMessage.success(t('profile.password.updated'))
  } else {
    ElMessage.error(t('profile.password.failed'))
  }
}

// Country
const handleUpdateCountry = async () => {
  const result = await updateUserCountry(profile.value.country)

  if (result) {
    ElMessage.success(t('profile.country.updated'))
  } else {
    ElMessage.error(t('profile.country.failed'))
  }
}

// Logout
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      t('profile.logout.confirm'),
      t('profile.logout.title'),
      {
        confirmButtonText: t('profile.logout.button'),
        cancelButtonText: t('profile.logout.cancel'),
        type: 'warning'
      }
    )

    const authStore = useAuthenticationStore()
    authStore.handleLogout()
    navigate.redirectToLanding()
  } catch { }
}

// Init
onMounted(async () => {
  const [country, photo] = await Promise.all([
    getUserCountry(),
    getUserProfilePhoto()
  ])

  profile.value.country = country ?? ''
  profile.value.avatar = photo ?? ''
})
</script>

<template>
  <div class="profile-root">

    <!-- Header -->
    <div class="profile-heading">
      <h1 class="profile-title">{{ t('profile.title') }}</h1>
      <p class="profile-subtitle">{{ t('profile.subtitle') }}</p>
    </div>

    <div class="profile-grid">

      <!-- LEFT -->
      <div class="profile-card">

        <!-- Avatar -->
        <div class="avatar-wrap">
          <label class="avatar-label">
            <input type="file" accept="image/*" class="avatar-input" @change="handleFileChange" />
            <div class="avatar-circle">
              <img v-if="profile.avatar" :src="profile.avatar" class="avatar-img" />
              <div v-else class="avatar-placeholder">
                <el-icon :size="36">
                  <User />
                </el-icon>
              </div>
              <div class="avatar-overlay">
                {{ t('profile.avatar.change') }}
              </div>
            </div>
          </label>

          <div class="avatar-meta">
            <div v-if="!usernameForm.editing" class="username-display">
              <span class="username">{{ userProfile.username }}</span>
              <el-button text :icon="Edit" size="small" @click="handleEditUsername" />
            </div>

            <div v-else class="username-edit">
              <el-input v-model="usernameForm.value" :placeholder="t('profile.username.placeholder')"
                @keyup.enter="handleSaveUsername" />

              <div class="username-edit-actions">
                <el-button type="primary" @click="handleSaveUsername">
                  {{ t('profile.username.save') }}
                </el-button>
                <el-button text @click="usernameForm.editing = false">
                  {{ t('profile.username.cancel') }}
                </el-button>
              </div>

              <div v-if="usernameForm.error" class="username-error">
                {{ usernameForm.error }}
              </div>
            </div>

            <div class="avatar-hint">{{ t('profile.avatar.hint') }}</div>
          </div>
        </div>

        <div class="card-divider" />

        <!-- Country -->
        <div class="info-block">
          <div class="info-label">
            <el-icon>
              <Location />
            </el-icon>
            {{ t('profile.country.label') }}
          </div>

          <div class="country-row">
            <el-select v-model="profile.country" :placeholder="t('profile.country.select')" filterable>
              <el-option v-for="country in CountryList" :key="country.value" :label="country.label"
                :value="country.value" />
            </el-select>

            <el-button type="primary" @click="handleUpdateCountry">
              {{ t('profile.country.update') }}
            </el-button>
          </div>
        </div>


      </div>

      <!-- RIGHT -->
      <div class="profile-card">

        <div class="card-section-title">
          {{ t('profile.password.title') }}
        </div>

        <p class="card-section-desc">
          {{ t('profile.password.desc') }}
        </p>

        <!-- Step 1 -->
        <div class="pw-step">
          <div class="step-badge" :class="{ done: isPasswordValidated }">1</div>

          <div class="step-body">
            <label>{{ t('profile.password.current') }}</label>

            <div class="pw-row">
              <el-input v-model="passwordForm.currentPassword" show-password :prefix-icon="Lock" />

              <el-button :loading="isValidating" @click="handleValidatePassword">
                {{ isPasswordValidated
                  ? t('profile.password.verified')
                  : t('profile.password.verify')
                }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="pw-step" :class="{ disabled: !isPasswordValidated }">
          <div class="step-badge">2</div>

          <div class="step-body">
            <label>{{ t('profile.password.new') }}</label>
            <el-input v-model="passwordForm.newPassword" show-password
              :placeholder="t('profile.password.requirement')" />

            <label>{{ t('profile.password.confirm') }}</label>
            <el-input v-model="passwordForm.confirmPassword" show-password />

            <el-button type="primary" @click="handleChangePassword">
              {{ t('profile.password.title') }}
            </el-button>
          </div>
        </div>

        <div class="card-divider" />

        <!-- Logout -->
        <div class="danger-zone">
          <div class="danger-label">{{ t('profile.logout.title') }}</div>

          <el-button type="danger" plain @click="handleLogout">
            {{ t('profile.logout.button') }}
          </el-button>
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

/* Username edit */
.username-display {
  display: flex;
  align-items: center;
}

.username-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.username-edit-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.username-error {
  font-size: 0.72rem;
  color: var(--el-color-danger);
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
