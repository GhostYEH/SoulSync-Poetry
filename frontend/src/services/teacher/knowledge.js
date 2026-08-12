/**
 * 教师端知识诊断服务层
 * 对应后端 /api/teacher/knowledge/* 接口
 */

const BASE = 'http://localhost:3000/api/teacher'

function getToken() {
  return localStorage.getItem('teacherToken')
}

async function request(path, options = {}) {
  const token = getToken()
  if (!token) {
    throw new Error('未找到教师认证令牌，请重新登录')
  }
  const resp = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (resp.status === 401) {
    localStorage.removeItem('teacherToken')
    localStorage.removeItem('teacher')
    localStorage.removeItem('teacherInfo')
    throw new Error('认证已过期，请重新登录')
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error || `请求失败: ${resp.status}`)
  }
  return resp.json()
}

/** 知识维度定义 */
export function fetchDimensions() {
  return request('/knowledge/dimensions')
}

/** 班级知识掌握概览 */
export function fetchOverview(classId = null) {
  const q = classId ? `?classId=${classId}` : ''
  return request(`/knowledge/overview${q}`)
}

/** 班级学生×知识维度热力图 */
export function fetchHeatmap(classId = null, limit = 50) {
  const params = new URLSearchParams()
  if (classId) params.set('classId', classId)
  params.set('limit', limit)
  return request(`/knowledge/heatmap?${params}`)
}

/** 高频薄弱知识点 + 教学建议 */
export function fetchWeakPoints(classId = null, topN = 10) {
  const params = new URLSearchParams()
  if (classId) params.set('classId', classId)
  params.set('topN', topN)
  return request(`/knowledge/weak-points?${params}`)
}

/** 学生知识画像（可解释） */
export function fetchStudentProfile(userId) {
  return request(`/knowledge/student/${userId}/profile`)
}