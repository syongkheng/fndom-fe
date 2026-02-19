import { reactive } from 'vue'
import { defineStore } from 'pinia'

export const useLayoutStateStore = defineStore('layoutStateStore', () => {
  const loadingDialog = reactive({
    isVisible: false,
    setTrue: () => (loadingDialog.isVisible = true),
    setFalse: () => (loadingDialog.isVisible = false),
    toggle: () => (loadingDialog.isVisible = !loadingDialog.isVisible),
  })

  const sideNav = reactive({
    isExpanded: true,
    setTrue: () => (sideNav.isExpanded = true),
    setFalse: () => (sideNav.isExpanded = false),
    toggle: () => (sideNav.isExpanded = !sideNav.isExpanded),
  })

  const loginDialog = reactive({
    isVisible: false,
    setTrue: () => (loginDialog.isVisible = true),
    setFalse: () => (loginDialog.isVisible = false),
    toggle: () => (loginDialog.isVisible = !loginDialog.isVisible),
  })

  const collabDialog = reactive({
    isVisible: false,
    setTrue: () => (collabDialog.isVisible = true),
    setFalse: () => (collabDialog.isVisible = false),
    toggle: () => (collabDialog.isVisible = !collabDialog.isVisible),
  })

  const fndManageNoticeDialog = reactive({
    isVisible: false,
    setTrue: () => (fndManageNoticeDialog.isVisible = true),
    setFalse: () => (fndManageNoticeDialog.isVisible = false),
    toggle: () => (fndManageNoticeDialog.isVisible = !fndManageNoticeDialog.isVisible),
  })

  const fndViewNoticeDialog = reactive({
    isVisible: false,
    setTrue: () => (fndViewNoticeDialog.isVisible = true),
    setFalse: () => (fndViewNoticeDialog.isVisible = false),
    toggle: () => (fndViewNoticeDialog.isVisible = !fndViewNoticeDialog.isVisible),
  })

  const fndEventDialog = reactive({
    isVisible: false,
    setTrue: () => (fndEventDialog.isVisible = true),
    setFalse: () => (fndEventDialog.isVisible = false),
    toggle: () => (fndEventDialog.isVisible = !fndEventDialog.isVisible),
  })

  const hdbManagePphsDialog = reactive({
    isVisible: false,
    setTrue: () => (hdbManagePphsDialog.isVisible = true),
    setFalse: () => (hdbManagePphsDialog.isVisible = false),
    toggle: () => (hdbManagePphsDialog.isVisible = !hdbManagePphsDialog.isVisible),
  })

  const mobileNavMenu = reactive({
    isVisible: false,
    setTrue: () => (mobileNavMenu.isVisible = true),
    setFalse: () => (mobileNavMenu.isVisible = false),
    toggle: () => (mobileNavMenu.isVisible = !mobileNavMenu.isVisible),
  })

  const travelPlanningInitialDialog = reactive({
    isVisible: false,
    setTrue: () => (travelPlanningInitialDialog.isVisible = true),
    setFalse: () => (travelPlanningInitialDialog.isVisible = false),
    toggle: () => (travelPlanningInitialDialog.isVisible = !travelPlanningInitialDialog.isVisible),
  })

  return {
    loadingDialog,
    mobileNavMenu,
    travelPlanningInitialDialog,
    fndViewNoticeDialog,
    fndManageNoticeDialog,
    fndEventDialog,
    hdbManagePphsDialog,
    collabDialog,
    loginDialog,
    sideNav,
  }
})
