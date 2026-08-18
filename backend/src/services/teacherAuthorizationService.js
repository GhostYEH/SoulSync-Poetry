/**
 * 教师授权服务
 *
 * 统一处理教师-班级-学生权限关系，避免各路由重复 SQL。
 *
 * 授权链路：
 *   Teacher → teacher_classes → class_id → users.class_id → Student
 *
 * 兼容旧的 classes.teacher_id 关系（migration 已回填到 teacher_classes）。
 */
const db = require('../utils/db');

/**
 * 获取教师拥有的所有班级 ID
 */
async function getTeacherClassIds(teacherId) {
  const rows = await db.all(
    'SELECT class_id FROM teacher_classes WHERE teacher_id = $1',
    [teacherId]
  );
  return rows.map(r => r.class_id);
}

/**
 * 教师是否有权访问某班级
 */
async function canTeacherAccessClass(teacherId, classId) {
  const row = await db.get(
    'SELECT 1 FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2',
    [teacherId, classId]
  );
  return !!row;
}

/**
 * 教师是否有权访问某学生
 * 通过 student.class_id → teacher_classes 关系判断
 */
async function canTeacherAccessStudent(teacherId, studentId) {
  const row = await db.get(
    `SELECT 1 FROM users u
     JOIN teacher_classes tc ON u.class_id = tc.class_id
     WHERE u.id = $1 AND tc.teacher_id = $2`,
    [studentId, teacherId]
  );
  return !!row;
}

/**
 * 验证教师对学生有访问权，否则抛出 403 错误
 * @returns {Promise<void>}
 * @throws {Object} { status: 403, code: 'TEACHER_NO_ACCESS', message: '无权访问该学生' }
 */
async function assertTeacherCanAccessStudent(teacherId, studentId) {
  const ok = await canTeacherAccessStudent(teacherId, studentId);
  if (!ok) {
    const err = new Error('无权访问该学生');
    err.status = 403;
    err.code = 'TEACHER_NO_ACCESS';
    throw err;
  }
}

/**
 * 验证教师对班级有访问权，否则抛出 403 错误
 */
async function assertTeacherCanAccessClass(teacherId, classId) {
  const ok = await canTeacherAccessClass(teacherId, classId);
  if (!ok) {
    const err = new Error('无权访问该班级');
    err.status = 403;
    err.code = 'TEACHER_NO_ACCESS';
    throw err;
  }
}

/**
 * 获取教师所有学生的 ID 列表
 */
async function getTeacherStudentIds(teacherId) {
  const rows = await db.all(
    `SELECT u.id FROM users u
     JOIN teacher_classes tc ON u.class_id = tc.class_id
     WHERE tc.teacher_id = $1
     ORDER BY u.id`,
    [teacherId]
  );
  return rows.map(r => r.id);
}

/**
 * 为教师分配班级（幂等）
 */
async function assignClassToTeacher(teacherId, classId) {
  await db.run(
    `INSERT INTO teacher_classes (teacher_id, class_id)
     VALUES ($1, $2)
     ON CONFLICT (teacher_id, class_id) DO NOTHING`,
    [teacherId, classId]
  );
}

module.exports = {
  getTeacherClassIds,
  canTeacherAccessClass,
  canTeacherAccessStudent,
  assertTeacherCanAccessStudent,
  assertTeacherCanAccessClass,
  getTeacherStudentIds,
  assignClassToTeacher,
};