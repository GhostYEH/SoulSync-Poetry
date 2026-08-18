const db = require('../utils/db');

async function getClassAnalytics(classId) {
  const row = await db.get(
    'SELECT * FROM classes WHERE id = $1',
    [classId]
  );

  if (!row) {
    throw new Error('班级不存在');
  }

  const studentCount = await db.get(
    'SELECT COUNT(*) as count FROM class_members WHERE class_id = $1 AND role = $2',
    [classId, 'student']
  );

  const activityStats = await db.get(
    `SELECT
       COUNT(DISTINCT lr.user_id) as active_students,
       COUNT(*) as total_activities,
       AVG(lr.best_score) as avg_score
     FROM learning_records lr
     JOIN class_members cm ON lr.user_id = cm.user_id AND cm.class_id = $1
     WHERE lr.last_view_time >= ${db.dateDaysAgo(7)}`,
    [classId]
  );

  const poemProgress = await db.all(
    `SELECT
       lr.poem_id,
       p.title as poem_title,
       COUNT(DISTINCT lr.user_id) as learned_count,
       AVG(lr.best_score) as avg_score,
       SUM(CASE WHEN lr.best_score >= 100 THEN 1 ELSE 0 END) as mastered_count
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     JOIN class_members cm ON lr.user_id = cm.user_id AND cm.class_id = $1
     WHERE cm.role = $2
     GROUP BY lr.poem_id, p.title
     ORDER BY learned_count DESC
     LIMIT 20`,
    [classId, 'student']
  );

  return {
    classInfo: row,
    studentCount: studentCount?.count || 0,
    activityStats: {
      activeStudents: activityStats?.active_students || 0,
      totalActivities: activityStats?.total_activities || 0,
      averageScore: Math.round(activityStats?.avg_score || 0)
    },
    poemProgress
  };
}

async function getStudentAnalytics(classId, studentId) {
  const learningStats = await db.get(
    `SELECT
       COUNT(*) as learned_poems,
       AVG(best_score) as avg_score,
       SUM(recite_attempts) as total_recites,
       SUM(view_count) as total_views,
       SUM(study_time) as total_study_time
     FROM learning_records
     WHERE user_id = $1`,
    [studentId]
  );

  const weakAreas = await db.all(
    `SELECT lr.*, p.title as poem_title, p.author as poem_author
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     WHERE lr.user_id = $1 AND lr.best_score < 80 AND lr.recite_attempts > 0
     ORDER BY lr.best_score ASC
     LIMIT 10`,
    [studentId]
  );

  const recentActivities = await db.all(
    `SELECT lr.*, p.title as poem_title
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     WHERE lr.user_id = $1 AND lr.last_view_time IS NOT NULL
     ORDER BY lr.last_view_time DESC
     LIMIT 10`,
    [studentId]
  );

  const wrongQuestionCount = await db.get(
    'SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1',
    [studentId]
  );

  return {
    learningStats: {
      learnedPoems: learningStats?.learned_poems || 0,
      averageScore: Math.round(learningStats?.avg_score || 0),
      totalRecites: learningStats?.total_recites || 0,
      totalViews: learningStats?.total_views || 0,
      totalStudyTime: learningStats?.total_study_time || 0
    },
    weakAreas,
    recentActivities,
    wrongQuestionCount: wrongQuestionCount?.count || 0
  };
}

async function getClassRanking(classId, sortBy = 'score') {
  let orderBy;
  switch (sortBy) {
    case 'poems':
      orderBy = 'learned_poems DESC';
      break;
    case 'time':
      orderBy = 'total_study_time DESC';
      break;
    default:
      orderBy = 'avg_score DESC';
  }

  return db.all(
    `SELECT
       u.id as user_id,
       u.username,
       COUNT(DISTINCT lr.poem_id) as learned_poems,
       AVG(lr.best_score) as avg_score,
       SUM(lr.study_time) as total_study_time,
       SUM(lr.recite_attempts) as total_recites
     FROM users u
     JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
     LEFT JOIN learning_records lr ON u.id = lr.user_id
     WHERE cm.role = $2
     GROUP BY u.id, u.username
     ORDER BY ${orderBy}
     LIMIT 50`,
    [classId, 'student']
  );
}

async function getTeacherClasses(teacherId) {
  return db.all(
    'SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC',
    [teacherId]
  );
}

async function createClass(teacherId, className, description) {
  return db.transaction(async (tx) => {
    const result = await tx.run(
      `INSERT INTO classes (teacher_id, name, description, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [teacherId, className, description]
    );

    const classId = result.rows[0].id;

    await tx.run(
      `INSERT INTO class_members (class_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [classId, teacherId, 'teacher']
    );

    const upsertSql = db.isPostgres()
      ? `INSERT INTO teacher_classes (teacher_id, class_id) VALUES ($1, $2) ON CONFLICT (teacher_id, class_id) DO NOTHING`
      : `INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id) VALUES ($1, $2)`;
    await tx.run(upsertSql, [teacherId, classId]);

    return { id: classId, name: className, description };
  });
}

async function getOverallStats(teacherId) {
  const classes = await db.get(
    'SELECT COUNT(*) as count FROM classes WHERE teacher_id = $1',
    [teacherId]
  );

  const totalStudents = await db.get(
    `SELECT COUNT(DISTINCT cm.user_id) as count
     FROM class_members cm
     JOIN classes c ON cm.class_id = c.id
     WHERE c.teacher_id = $1 AND cm.role = $2`,
    [teacherId, 'student']
  );

  const activityThisWeek = await db.get(
    `SELECT COUNT(*) as count
     FROM learning_records lr
     JOIN class_members cm ON lr.user_id = cm.user_id
     JOIN classes c ON cm.class_id = c.id
     WHERE c.teacher_id = $1 AND cm.role = $2
       AND lr.last_view_time >= ${db.dateDaysAgo(7)}`,
    [teacherId, 'student']
  );

  return {
    totalClasses: classes?.count || 0,
    totalStudents: totalStudents?.count || 0,
    activityThisWeek: activityThisWeek?.count || 0
  };
}

module.exports = {
  getClassAnalytics,
  getStudentAnalytics,
  getClassRanking,
  getTeacherClasses,
  createClass,
  getOverallStats
};
