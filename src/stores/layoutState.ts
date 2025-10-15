import { reactive } from 'vue'
import { defineStore } from 'pinia'

export const useLayoutStateStore = defineStore('layoutStateStore', () => {
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

  return { collabDialog, loginDialog, sideNav }
})
