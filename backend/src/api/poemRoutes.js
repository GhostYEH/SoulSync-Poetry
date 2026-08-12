// 诗词相关的API路由
const express = require('express');
const router = express.Router();

// 诗词数据（在主服务器文件中加载）
let poems = [];

// 设置诗词数据
function setPoems(data) {
  poems = data;
}

// 获取诗词列表
router.get('/poems', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 30;
  const isRandom = req.query.random === 'true';
  const dynasty = req.query.dynasty || '';
  const author = req.query.author || '';
  
  let filteredPoems = [...poems];
  
  if (dynasty) {
    filteredPoems = filteredPoems.filter(p => p.dynasty === dynasty);
  }
  
  if (author) {
    filteredPoems = filteredPoems.filter(p => p.author === author);
  }
  
  if (isRandom) {
    const randomPoems = [];
    const tempPoems = [...filteredPoems];
    
    if (pageSize >= tempPoems.length) {
      for (let i = tempPoems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempPoems[i], tempPoems[j]] = [tempPoems[j], tempPoems[i]];
      }
      return res.json(tempPoems);
    }
    
    const indices = new Set();
    while (indices.size < pageSize && indices.size < filteredPoems.length) {
      const index = Math.floor(Math.random() * filteredPoems.length);
      indices.add(index);
    }
    
    for (const index of indices) {
      randomPoems.push(filteredPoems[index]);
    }
    
    return res.json(randomPoems);
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  const paginatedPoems = filteredPoems.slice(startIndex, endIndex);
  
  res.json(paginatedPoems);
});

// 获取诗词详情
router.get('/poems/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const poem = poems.find(p => p.id === id);
  if (poem) {
    res.json(poem);
  } else {
    res.status(404).json({ message: '诗词未找到' });
  }
});

// 获取每日一诗
router.get('/daily-poem', (req, res) => {
  if (poems.length === 0) {
    return res.status(503).json({ message: '数据加载中' });
  }
  

  const index = Math.floor(Math.random() * poems.length);
  const dailyPoem = poems[index];
  
  res.json(dailyPoem);
});

module.exports = {
  router,
  setPoems
};
