const fetch = require('node-fetch');

// 测试API接口
async function testPoemAPI() {
  try {
    // 测试获取所有诗词
    console.log('测试获取所有诗词...');
    const poemsResponse = await fetch('http://localhost:3000/api/poems?pageSize=1000');
    const poems = await poemsResponse.json();
    console.log(`获取到 ${poems.length} 首诗词`);
    
    // 查找《静夜思》
    console.log('\n查找《静夜思》...');
    const jingYeSi = poems.find(poem => poem.title === '静夜思');
    if (jingYeSi) {
      console.log('找到《静夜思》:');
      console.log('ID:', jingYeSi.id);
      console.log('标题:', jingYeSi.title);
      console.log('作者:', jingYeSi.author);
      console.log('朝代:', jingYeSi.dynasty);
      console.log('内容:', jingYeSi.content);
      console.log('标签:', jingYeSi.tags);
      
      // 检查是否包含"举头望明月"
      if (jingYeSi.content.includes('举头望明月')) {
        console.log('✓ 包含"举头望明月"');
      } else {
        console.log('✗ 不包含"举头望明月"');
      }
    } else {
      console.log('未找到《静夜思》');
      // 打印所有诗词标题，看看是否有类似的
      console.log('\n所有诗词标题:');
      poems.forEach(poem => {
        if (poem.title.includes('夜')) {
          console.log(poem.title);
        }
      });
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
testPoemAPI();
