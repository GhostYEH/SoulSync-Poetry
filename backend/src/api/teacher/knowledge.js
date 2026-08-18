/**
 * 教师路由 — 知识诊断
 */

const express = require('express');
const router = express.Router();
const knowledgeStateService = require('../../services/knowledgeStateService');
const teacherAuthz = require('../../services/teacherAuthorizationService');
const { authenticateTeacher } = require('./shared');
const { parsePagination } = require('../../utils/validation');

router.get('/dimensions', authenticateTeacher, async (req, res) => {
  try {
    res.json({ data: knowledgeStateService.KNOWLEDGE_DIMENSIONS });
  } catch (err) {
    res.status(500).json({ error: '获取知识维度失败' });
  }
});

router.get('/overview', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const data = await knowledgeStateService.getClassKnowledgeOverview(classId);
    res.json({ data, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('班级知识概览失败:', err);
    res.status(500).json({ error: '获取班级知识概览失败' });
  }
});

router.get('/heatmap', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const { limit } = parsePagination(req, 50);
    const data = await knowledgeStateService.getClassKnowledgeHeatmap(classId, limit);
    res.json({ data, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('知识热力图失败:', err);
    res.status(500).json({ error: '获取知识热力图失败' });
  }
});

router.get('/weak-points', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const topN = req.query.topN ? parseInt(req.query.topN) : 10;
    const data = await knowledgeStateService.getWeakPoints(classId, topN);
    const suggestion = knowledgeStateService.generateTeachingSuggestion(data.dimensionSummary);
    res.json({ data, suggestion, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('薄弱知识点失败:', err);
    res.status(500).json({ error: '获取薄弱知识点失败' });
  }
});

router.get('/student/:id/profile', authenticateTeacher, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await teacherAuthz.assertTeacherCanAccessStudent(req.teacher.id, userId);
    const cognitiveDiagnosis = require('../../services/cognitiveDiagnosisService');
    const masteryEngine = require('../../services/masteryUpdateEngine');

    const states = await masteryEngine.getAllStates(userId);
    const diag = await cognitiveDiagnosis.diagnoseStudent(userId);
    const dimMap = {};
    diag.points.forEach(p => { dimMap[p.code] = p; });

    const dimensions = diag.dimensionSummary.map(d => ({
      key: d.code,
      label: d.name,
      icon: '',
      mastery: d.avgMastery,
      confidence: d.avgConfidence,
      count: d.coveredPoints,
      evidenceCount: d.coveredPoints,
      level: (dimMap[d.code] || {}).level,
    }));

    res.json({
      data: {
        userId,
        dimensions,
        weakDimensions: diag.highConfidenceWeak.map(w => ({
          key: w.code, label: w.name, mastery: w.mastery, confidence: w.confidence,
          evidenceCount: w.attemptCount, errorCount: w.errorCount,
        })),
        lowEvidence: diag.lowEvidence,
        stats: {
          learnedPoems: 0,
          totalWrongQuestions: diag.points.reduce((a, p) => a + p.errorCount, 0),
          totalPoints: diag.totalPoints,
        },
        source: 'student_knowledge_states',
        algorithmVersion: masteryEngine.MASTERY_ALGORITHM_VERSION,
        hasData: states.length > 0,
      },
    });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message, code: err.code });
    console.error('学生知识画像失败:', err);
    res.status(500).json({ error: '获取学生知识画像失败' });
  }
});

module.exports = router;