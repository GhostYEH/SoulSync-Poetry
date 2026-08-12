/**
 * 知识模型服务
 *
 * 维护古诗词知识体系（树形结构），提供题目→知识点推断。
 * 一道题可映射多个知识点，推断基于关键词 + 题型 + 诗句内容。
 *
 * 知识树（一级 8 维度 + 二级细分）：
 *   memorization        原文记忆
 *   author_dynasty      作者朝代
 *     ├ author_identify
 *     └ dynasty_identify
 *   word_meaning        字词理解
 *   imagery             意象
 *     ├ imagery_moon / imagery_willow / imagery_wildgoose
 *     └ imagery_wine / imagery_sunset / imagery_pavilion
 *   emotion_theme       情感主题
 *     ├ emotion_homesick / emotion_farewell / emotion_ambition
 *   rhetoric            修辞
 *     ├ rhetoric_metaphor / rhetoric_personification / rhetoric_antithesis
 *     └ rhetoric_exaggeration / rhetoric_synecdoche / rhetoric_allusion
 *   allusion_background 典故背景
 *   application         迁移应用
 */

const db = require('../utils/db');

// 知识树定义（用于种子化）
const KNOWLEDGE_TREE = [
  { code: 'memorization', name: '原文记忆', category: 'memory', description: '默写、填空、上下句补全', difficulty: 2 },
  { code: 'author_dynasty', name: '作者朝代', category: 'meta', description: '识别作者与所属朝代', difficulty: 2, children: [
    { code: 'author_identify', name: '作者识别', category: 'meta', difficulty: 2 },
    { code: 'dynasty_identify', name: '朝代识别', category: 'meta', difficulty: 2 },
  ]},
  { code: 'word_meaning', name: '字词理解', category: 'language', description: '关键字词含义与注音', difficulty: 3 },
  { code: 'imagery', name: '意象', category: 'imagery', description: '意象识别与象征义', difficulty: 4, children: [
    { code: 'imagery_moon', name: '月', category: 'imagery', description: '思乡、团圆、清冷' },
    { code: 'imagery_willow', name: '柳', category: 'imagery', description: '送别、留恋' },
    { code: 'imagery_wildgoose', name: '雁', category: 'imagery', description: '思乡、传书、孤寂' },
    { code: 'imagery_wine', name: '酒', category: 'imagery', description: '豪情、愁绪、离别' },
    { code: 'imagery_sunset', name: '夕阳', category: 'imagery', description: '迟暮、衰败、苍凉' },
    { code: 'imagery_pavilion', name: '长亭', category: 'imagery', description: '送别、行旅' },
  ]},
  { code: 'emotion_theme', name: '情感主题', category: 'emotion', description: '情感基调与中心主旨', difficulty: 4, children: [
    { code: 'emotion_homesick', name: '思乡', category: 'emotion' },
    { code: 'emotion_farewell', name: '送别', category: 'emotion' },
    { code: 'emotion_ambition', name: '咏志', category: 'emotion' },
  ]},
  { code: 'rhetoric', name: '修辞', category: 'rhetoric', description: '修辞手法识别与赏析', difficulty: 4, children: [
    { code: 'rhetoric_metaphor', name: '比喻', category: 'rhetoric' },
    { code: 'rhetoric_personification', name: '拟人', category: 'rhetoric' },
    { code: 'rhetoric_antithesis', name: '对偶', category: 'rhetoric' },
    { code: 'rhetoric_exaggeration', name: '夸张', category: 'rhetoric' },
    { code: 'rhetoric_synecdoche', name: '借代', category: 'rhetoric' },
    { code: 'rhetoric_allusion', name: '用典', category: 'rhetoric' },
  ]},
  { code: 'allusion_background', name: '典故背景', category: 'context', description: '用典与创作背景', difficulty: 5 },
  { code: 'application', name: '迁移应用', category: 'transfer', description: '跨诗比较与迁移', difficulty: 5 },
];

// 题目文本 → 知识点 code 推断规则（按优先级，可匹配多个）
const INFERENCE_RULES = [
  { points: ['author_identify', 'author_dynasty'], words: ['作者', '谁写', '诗人', '出自.*手', '何人'] },
  { points: ['dynasty_identify', 'author_dynasty'], words: ['朝代', '年代', '哪朝', '生活于'] },
  { points: ['word_meaning'], words: ['意思', '解释', '含义', '加点字', '注音', '读音', '词义', '字义'] },
  { points: ['imagery_moon', 'imagery'], words: ['月', '明月', '月光', '月亮'] },
  { points: ['imagery_willow', 'imagery', 'emotion_farewell'], words: ['柳', '杨柳', '折柳'] },
  { points: ['imagery_wildgoose', 'imagery'], words: ['雁', '孤雁', '归雁'] },
  { points: ['imagery_wine', 'imagery'], words: ['酒', '饮酒', '把酒'] },
  { points: ['imagery_sunset', 'imagery'], words: ['夕阳', '落日', '斜阳'] },
  { points: ['imagery_pavilion', 'imagery', 'emotion_farewell'], words: ['长亭', '短亭', '灞陵'] },
  { points: ['imagery'], words: ['意象', '象征', '代表', '寄托', '物象'] },
  { points: ['emotion_homesick', 'emotion_theme'], words: ['思乡', '乡愁', '故乡', '客居'] },
  { points: ['emotion_farewell', 'emotion_theme'], words: ['送别', '离别', '赠别', '留别'] },
  { points: ['emotion_ambition', 'emotion_theme'], words: ['咏志', '言志', '抱负', '壮志'] },
  { points: ['emotion_theme'], words: ['情感', '感情', '思想', '主题', '中心', '表达了', '抒发'] },
  { points: ['rhetoric_metaphor', 'rhetoric'], words: ['比喻', '喻'] },
  { points: ['rhetoric_personification', 'rhetoric'], words: ['拟人'] },
  { points: ['rhetoric_antithesis', 'rhetoric'], words: ['对偶', '对仗'] },
  { points: ['rhetoric_exaggeration', 'rhetoric'], words: ['夸张'] },
  { points: ['rhetoric_synecdoche', 'rhetoric'], words: ['借代'] },
  { points: ['rhetoric_allusion', 'rhetoric', 'allusion_background'], words: ['用典', '典故'] },
  { points: ['rhetoric'], words: ['修辞'] },
  { points: ['allusion_background'], words: ['背景', '出处', '历史', '写作背景', '创作背景'] },
  { points: ['application'], words: ['类似', '相同', '比较', '迁移', '类比', '共同', '相似', '不同于'] },
  { points: ['memorization'], words: ['默写', '填空', '背诵', '原文', '上句', '下句', '补全', '完整'] },
];

let codeToIdMap = null;

/**
 * 初始化知识树种子数据（幂等）
 */
async function seedKnowledgePoints() {
  for (const node of KNOWLEDGE_TREE) {
    await upsertNode(node, null);
    if (node.children) {
      const parent = await db.get('SELECT id FROM knowledge_points WHERE code = $1', [node.code]);
      for (const child of node.children) {
        await upsertNode(child, parent.id);
      }
    }
  }
  codeToIdMap = null;
}

async function upsertNode(node, parentId) {
  const existing = await db.get('SELECT id FROM knowledge_points WHERE code = $1', [node.code]);
  if (existing) {
    await db.run(
      `UPDATE knowledge_points SET name=$2, category=$3, description=$4, parent_id=$5, difficulty=$6 WHERE code=$1`,
      [node.code, node.name, node.category, node.description || null, parentId, node.difficulty || 3]
    );
    return existing.id;
  }
  const result = await db.run(
    `INSERT INTO knowledge_points (code, name, category, description, parent_id, difficulty)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [node.code, node.name, node.category, node.description || null, parentId, node.difficulty || 3]
  );
  return result.rows[0].id;
}

/**
 * 构建 code → id 映射（带缓存）
 */
async function getCodeToIdMap() {
  if (codeToIdMap) return codeToIdMap;
  const rows = await db.all('SELECT id, code FROM knowledge_points');
  codeToIdMap = {};
  for (const r of rows) codeToIdMap[r.code] = r.id;
  return codeToIdMap;
}

/**
 * 根据题目文本推断知识点 code 列表（可多个）
 *
 * ⚠️ 这是基于关键词的规则推断（source='rule'），不是 AI 自动认知理解。
 *    推断结果写入 question_knowledge_mappings 时 source='rule', confidence=0.8。
 *    优先级：manual > rule > ai > legacy。
 *
 * @param {string} questionText
 * @param {object} [extra] 额外上下文 { poemContent, questionType }
 * @returns {string[]} 知识点 code 数组（去重）
 */
function inferKnowledgePoints(questionText, extra = {}) {
  const text = String(questionText || '');
  const fullText = text + ' ' + (extra.poemContent || '');
  const matched = new Set();

  for (const rule of INFERENCE_RULES) {
    for (const w of rule.words) {
      if (fullText.includes(w)) {
        rule.points.forEach(p => matched.add(p));
        break;
      }
    }
  }

  // 题型辅助判断
  if (extra.questionType) {
    const qt = String(extra.questionType).toLowerCase();
    if (qt.includes('fill') || qt.includes('blank') || qt.includes('默写')) matched.add('memorization');
    if (qt.includes('author') || qt.includes('作者')) { matched.add('author_identify'); matched.add('author_dynasty'); }
    if (qt.includes('dynasty') || qt.includes('朝代')) { matched.add('dynasty_identify'); matched.add('author_dynasty'); }
  }

  // 默认：无法推断则归为原文记忆（最常见题型）
  if (matched.size === 0) matched.add('memorization');

  return Array.from(matched);
}

/**
 * 获取知识点 id 列表（基于 code）
 */
async function getKnowledgePointIds(codes) {
  const map = await getCodeToIdMap();
  return codes.map(c => map[c]).filter(Boolean);
}

/**
 * 获取全部一级知识维度（含子节点）
 */
async function getKnowledgeTree() {
  const rows = await db.all(
    `SELECT id, code, name, category, description, parent_id, difficulty
     FROM knowledge_points ORDER BY id`
  );
  const byId = {};
  rows.forEach(r => { byId[r.id] = { ...r, children: [] }; });
  const roots = [];
  for (const r of rows) {
    if (r.parent_id && byId[r.parent_id]) {
      byId[r.parent_id].children.push(byId[r.id]);
    } else {
      roots.push(byId[r.id]);
    }
  }
  return roots;
}

/**
 * 获取一级维度（parent_id IS NULL）
 */
async function getRootDimensions() {
  return db.all(
    `SELECT id, code, name, category, description, difficulty
     FROM knowledge_points WHERE parent_id IS NULL ORDER BY id`
  );
}

module.exports = {
  KNOWLEDGE_TREE,
  seedKnowledgePoints,
  inferKnowledgePoints,
  getKnowledgePointIds,
  getKnowledgeTree,
  getRootDimensions,
  getCodeToIdMap,
};