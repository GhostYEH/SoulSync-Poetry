import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request, TIMEOUTS } from '../services/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || null)
  const userInfo = ref(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)
  const userId = computed(() => userInfo.value?.id || null)
  const username = computed(() => userInfo.value?.username || '游客')

  async function initUser() {
    if (initialized.value) return
    
    const savedToken = localStorage.getItem('token')
    if (!savedToken) {
      initialized.value = true
      return
    }

    token.value = savedToken
    loading.value = true

    try {
      const data = await request('/auth/verify', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        },
        timeout: TIMEOUTS.SHORT
      });

      if (data && data.success && data.data?.user) {
        userInfo.value = data.data.user
      } else {
        await logout()
      }
    } catch (error) {
      console.error('验证用户信息失败:', error)
      await logout()
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  function login(tokenValue, user) {
    token.value = tokenValue
    userInfo.value = user
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(user))
  }

  async function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('studentId')
    localStorage.removeItem('userRole')
  }

  function setUserInfo(user) {
    userInfo.value = user
    localStorage.setItem('user', JSON.stringify(user))
  }

  return {
    token,
    userInfo,
    loading,
    initialized,
    isLoggedIn,
    userId,
    username,
    initUser,
    login,
    logout,
    setUserInfo
  }
})
