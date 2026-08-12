// 数据加载脚本，将poetry文件夹中的诗词数据加载到数据库中
const fs = require('fs');
const path = require('path');
const db = require('./db');

// 诗词文件夹路径
const POETRY_DIR = path.join(__dirname, '../../../poetry');

// 朝代映射
const DYNASTY_MAP = {
  '全唐诗': '唐',
  '唐诗三百首': '唐',
  '唐诗补录': '唐',
  '宋词': '宋',
  '宋词三百首': '宋',
  '元曲': '元',
  '御定全唐詩': '唐'
};

// 读取JSON文件
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error);
    return null;
  }
}

// 遍历文件夹，读取所有JSON文件
function traverseDirectory(dir, dynasty) {
  const files = fs.readdirSync(dir);
  const poems = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 递归遍历子目录
      const subPoems = traverseDirectory(filePath, dynasty);
      poems.push(...subPoems);
    } else if (file.endsWith('.json')) {
      // 读取JSON文件
      const data = readJsonFile(filePath);
      if (data) {
        // 处理不同格式的数据
        if (Array.isArray(data)) {
          // 数组格式
          data.forEach(item => {
            if (item.title && (item.content || item.paragraphs)) {
              poems.push({
                title: item.title,
                author: item.author || item.author_name || '未知',
                dynasty: dynasty,
                content: item.content || (Array.isArray(item.paragraphs) ? item.paragraphs.join('\n') : item.paragraphs),
                tags: item.tags || []
              });
            }
          });
        } else if (data.poems) {
          // 包含poems字段的格式
          data.poems.forEach(item => {
            if (item.title && (item.content || item.paragraphs)) {
              poems.push({
                title: item.title,
                author: item.author || item.author_name || '未知',
                dynasty: dynasty,
                content: item.content || (Array.isArray(item.paragraphs) ? item.paragraphs.join('\n') : item.paragraphs),
                tags: item.tags || []
              });
            }
          });
        } else if (data.content || data.paragraphs) {
          // 单个诗词格式
          if (data.title && (data.content || data.paragraphs)) {
            poems.push({
              title: data.title,
              author: data.author || data.author_name || '未知',
              dynasty: dynasty,
              content: data.content || (Array.isArray(data.paragraphs) ? data.paragraphs.join('\n') : data.paragraphs),
              tags: data.tags || []
            });
          }
        }
      }
    }
  }

  return poems;
}

// 检查诗词是否已存在
async function checkPoemExists(title, author) {
  const row = await db.get(
    'SELECT id FROM poems WHERE title = $1 AND author = $2',
    [title, author]
  );
  return !!row;
}

// 插入诗词数据
async function insertPoem(poem) {
  const result = await db.run(
    'INSERT INTO poems (title, author, dynasty, content, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [poem.title, poem.author, poem.dynasty, poem.content, JSON.stringify(poem.tags)]
  );
  return result.rows[0].id;
}

// 主函数
async function loadPoetryData() {
  console.log('开始加载诗词数据...');

  try {
    let totalPoems = 0;
    let newPoems = 0;
    let duplicatePoems = 0;

    // 遍历各个朝代的文件夹
    for (const [folderName, dynasty] of Object.entries(DYNASTY_MAP)) {
      const folderPath = path.join(POETRY_DIR, folderName);
      if (fs.existsSync(folderPath)) {
        console.log(`正在处理 ${folderName}...`);
        const poems = traverseDirectory(folderPath, dynasty);

        for (const poem of poems) {
          totalPoems++;

          // 检查是否已存在
          const exists = await checkPoemExists(poem.title, poem.author);
          if (exists) {
            duplicatePoems++;
            console.log(`跳过重复诗词: ${poem.title} - ${poem.author}`);
          } else {
            await insertPoem(poem);
            newPoems++;
            console.log(`新增诗词: ${poem.title} - ${poem.author}`);
          }
        }
      }
    }

    console.log('\n数据加载完成!');
    console.log(`总处理诗词数: ${totalPoems}`);
    console.log(`新增诗词数: ${newPoems}`);
    console.log(`重复诗词数: ${duplicatePoems}`);
  } catch (error) {
    console.error('数据加载失败:', error);
  } finally {
    // 关闭数据库连接
    await db.close();
  }
}

// 执行数据加载
loadPoetryData();
