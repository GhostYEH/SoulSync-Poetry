/**
 * 教师端知识诊断服务层
 * 对应后端 /api/teacher/knowledge/* 接口
 */

import { request as apiRequest } from '../api'

async function request(path, options = {}) {
  return apiRequest(`/teacher/knowledge${path}`, {
    ...options,
    isTeacher: true
  })
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