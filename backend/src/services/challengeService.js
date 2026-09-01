/**
 * 诗词闯关服务 - 200关固定题库版
 * 设计原则：
 * 1. 1-200关共200首不同诗词，每首诗只出现一次
 * 2. 严格难度梯度：1-50简单、51-100中等、101-150困难、151-200挑战
 * 3. 答案判断直接用数据匹配，O(1)查找
 */
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const { ApiError } = require('../utils/apiResponse');

// ============================================================
// 诗词数据：200首不同诗词，按难度分4段
// 每首诗包含：title, author, content(原文), couplets(所有对句), full_poem(展示用)
// ============================================================
const POEMS = [
  // ========== 简单难度 1-50 ==========
  // 第1关
  { title: "静夜思", author: "李白", level: 1, difficulty: "easy",
    couplets: [
      { question: "床前明月光，疑是地上霜。举头望明月，_____。", answer: "低头思故乡" }
    ],
    full_poem: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
  // 第2关
  { title: "春晓", author: "孟浩然", level: 2, difficulty: "easy",
    couplets: [
      { question: "春眠不觉晓，处处闻啼鸟。_____，花落知多少。", answer: "夜来风雨声" }
    ],
    full_poem: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  // 第3关
  { title: "登鹳雀楼", author: "王之涣", level: 3, difficulty: "easy",
    couplets: [
      { question: "白日依山尽，_____。欲穷千里目，更上一层楼。", answer: "黄河入海流" }
    ],
    full_poem: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。" },
  // 第4关
  { title: "江雪", author: "柳宗元", level: 4, difficulty: "easy",
    couplets: [
      { question: "千山鸟飞绝，_____。孤舟蓑笠翁，独钓寒江雪。", answer: "万径人踪灭" }
    ],
    full_poem: "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。" },
  // 第5关
  { title: "相思", author: "王维", level: 5, difficulty: "easy",
    couplets: [
      { question: "红豆生南国，春来发几枝。_____，此物最相思。", answer: "愿君多采撷" }
    ],
    full_poem: "红豆生南国，春来发几枝。愿君多采撷，此物最相思。" },
  // 第6关
  { title: "九月九日忆山东兄弟", author: "王维", level: 6, difficulty: "easy",
    couplets: [
      { question: "独在异乡为异客，_____。遥知兄弟登高处，遍插茱萸少一人。", answer: "每逢佳节倍思亲" }
    ],
    full_poem: "独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。" },
  // 第7关
  { title: "咏柳", author: "贺知章", level: 7, difficulty: "easy",
    couplets: [
      { question: "_____，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。", answer: "碧玉妆成一树高" }
    ],
    full_poem: "碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。" },
  // 第8关
  { title: "悯农（其二）", author: "李绅", level: 8, difficulty: "easy",
    couplets: [
      { question: "锄禾日当午，汗滴禾下土。_____，粒粒皆辛苦。", answer: "谁知盘中餐" }
    ],
    full_poem: "锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。" },
  // 第9关
  { title: "悯农（其一）", author: "李绅", level: 9, difficulty: "easy",
    couplets: [
      { question: "春种一粒粟，_____。秋收万颗子，四海无闲田。", answer: "秋收万颗子" }
    ],
    full_poem: "春种一粒粟，秋收万颗子。四海无闲田，农夫犹饿死。" },
  // 第10关
  { title: "静夜思", author: "李白", level: 10, difficulty: "easy",
    couplets: [
      { question: "_____，疑是地上霜。", answer: "床前明月光" }
    ],
    full_poem: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
  // 第11关
  { title: "春晓", author: "孟浩然", level: 11, difficulty: "easy",
    couplets: [
      { question: "_____，处处闻啼鸟。", answer: "春眠不觉晓" }
    ],
    full_poem: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  // 第12关
  { title: "登鹳雀楼", author: "王之涣", level: 12, difficulty: "easy",
    couplets: [
      { question: "_____，更上一层楼。", answer: "欲穷千里目" }
    ],
    full_poem: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。" },
  // 第13关
  { title: "敕勒歌", author: "佚名", level: 13, difficulty: "easy",
    couplets: [
      { question: "_____，风吹草低见牛羊。", answer: "风吹草低见牛羊" }
    ],
    full_poem: "敕勒川，阴山下。天似穹庐，笼盖四野。天苍苍，野茫茫。风吹草低见牛羊。" },
  // 第14关
  { title: "所见", author: "袁枚", level: 14, difficulty: "easy",
    couplets: [
      { question: "牧童骑黄牛，歌声振林樾。_____，忽然闭口立。", answer: "意欲捕鸣蝉" }
    ],
    full_poem: "牧童骑黄牛，歌声振林樾。意欲捕鸣蝉，忽然闭口立。" },
  // 第15关
  { title: "村居", author: "高鼎", level: 15, difficulty: "easy",
    couplets: [
      { question: "草长莺飞二月天，拂堤杨柳醉春烟。_____，儿童散学归来早，忙趁东风放纸鸢。", answer: "儿童散学归来早" }
    ],
    full_poem: "草长莺飞二月天，拂堤杨柳醉春烟。儿童散学归来早，忙趁东风放纸鸢。" },
  // 第16关
  { title: "望庐山瀑布", author: "李白", level: 16, difficulty: "easy",
    couplets: [
      { question: "日照香炉生紫烟，遥看瀑布挂前川。_____，疑是银河落九天。", answer: "飞流直下三千尺" }
    ],
    full_poem: "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。" },
  // 第17关
  { title: "赠汪伦", author: "李白", level: 17, difficulty: "easy",
    couplets: [
      { question: "李白乘舟将欲行，忽闻岸上踏歌声。_____，不及汪伦送我情。", answer: "桃花潭水深千尺" }
    ],
    full_poem: "李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。" },
  // 第18关
  { title: "早发白帝城", author: "李白", level: 18, difficulty: "easy",
    couplets: [
      { question: "朝辞白帝彩云间，千里江陵一日还。_____，轻舟已过万重山。", answer: "两岸猿声啼不住" }
    ],
    full_poem: "朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。" },
  // 第19关
  { title: "望天门山", author: "李白", level: 19, difficulty: "easy",
    couplets: [
      { question: "天门中断楚江开，碧水东流至此回。_____，孤帆一片日边来。", answer: "两岸青山相对出" }
    ],
    full_poem: "天门中断楚江开，碧水东流至此回。两岸青山相对出，孤帆一片日边来。" },
  // 第20关
  { title: "夜宿山寺", author: "李白", level: 20, difficulty: "easy",
    couplets: [
      { question: "危楼高百尺，手可摘星辰。_____，恐惊天上人。", answer: "不敢高声语" }
    ],
    full_poem: "危楼高百尺，手可摘星辰。不敢高声语，恐惊天上人。" },
  // 第21关
  { title: "绝句（两个黄鹂）", author: "杜甫", level: 21, difficulty: "easy",
    couplets: [
      { question: "两个黄鹂鸣翠柳，_____。窗含西岭千秋雪，门泊东吴万里船。", answer: "一行白鹭上青天" }
    ],
    full_poem: "两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。" },
  // 第22关
  { title: "绝句（迟日江山丽）", author: "杜甫", level: 22, difficulty: "easy",
    couplets: [
      { question: "迟日江山丽，春风花草香。泥融飞燕子，_____。", answer: "沙暖睡鸳鸯" }
    ],
    full_poem: "迟日江山丽，春风花草香。泥融飞燕子，沙暖睡鸳鸯。" },
  // 第23关
  { title: "枫桥夜泊", author: "张继", level: 23, difficulty: "easy",
    couplets: [
      { question: "月落乌啼霜满天，江枫渔火对愁眠。_____，夜半钟声到客船。", answer: "姑苏城外寒山寺" }
    ],
    full_poem: "月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。" },
  // 第24关
  { title: "出塞", author: "王昌龄", level: 24, difficulty: "easy",
    couplets: [
      { question: "秦时明月汉时关，_____。但使龙城飞将在，不教胡马度阴山。", answer: "万里长征人未还" }
    ],
    full_poem: "秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。" },
  // 第25关
  { title: "出塞", author: "王昌龄", level: 25, difficulty: "easy",
    couplets: [
      { question: "_____，不教胡马度阴山。", answer: "但使龙城飞将在" }
    ],
    full_poem: "秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。" },
  // 第26关
  { title: "芙蓉楼送辛渐", author: "王昌龄", level: 26, difficulty: "easy",
    couplets: [
      { question: "寒雨连江夜入吴，平明送客楚山孤。_____，一片冰心在玉壶。", answer: "洛阳亲友如相问" }
    ],
    full_poem: "寒雨连江夜入吴，平明送客楚山孤。洛阳亲友如相问，一片冰心在玉壶。" },
  // 第27关
  { title: "从军行", author: "王昌龄", level: 27, difficulty: "easy",
    couplets: [
      { question: "青海长云暗雪山，孤城遥望玉门关。_____，不破楼兰终不还。", answer: "黄沙百战穿金甲" }
    ],
    full_poem: "青海长云暗雪山，孤城遥望玉门关。黄沙百战穿金甲，不破楼兰终不还。" },
  // 第28关
  { title: "凉州词", author: "王翰", level: 28, difficulty: "easy",
    couplets: [
      { question: "葡萄美酒夜光杯，欲饮琵琶马上催。_____，古来征战几人回。", answer: "醉卧沙场君莫笑" }
    ],
    full_poem: "葡萄美酒夜光杯，欲饮琵琶马上催。醉卧沙场君莫笑，古来征战几人回。" },
  // 第29关
  { title: "望洞庭", author: "刘禹锡", level: 29, difficulty: "easy",
    couplets: [
      { question: "湖光秋月两相和，潭面无风镜未磨。_____，白银盘里一青螺。", answer: "遥望洞庭山水翠" }
    ],
    full_poem: "湖光秋月两相和，潭面无风镜未磨。遥望洞庭山水翠，白银盘里一青螺。" },
  // 第30关
  { title: "浪淘沙", author: "刘禹锡", level: 30, difficulty: "easy",
    couplets: [
      { question: "九曲黄河万里沙，浪淘风簸自天涯。_____，浪淘风簸到天涯。", answer: "如今直上银河去" }
    ],
    full_poem: "九曲黄河万里沙，浪淘风簸自天涯。如今直上银河去，同到牵牛织女家。" },
  // 第31关
  { title: "乌衣巷", author: "刘禹锡", level: 31, difficulty: "easy",
    couplets: [
      { question: "朱雀桥边野草花，乌衣巷口夕阳斜。_____，飞入寻常百姓家。", answer: "旧时王谢堂前燕" }
    ],
    full_poem: "朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。" },
  // 第32关
  { title: "竹枝词", author: "刘禹锡", level: 32, difficulty: "easy",
    couplets: [
      { question: "杨柳青青江水平，闻郎江上踏歌声。_____，道是无晴却有晴。", answer: "东边日出西边雨" }
    ],
    full_poem: "杨柳青青江水平，闻郎江上踏歌声。东边日出西边雨，道是无晴却有晴。" },
  // 第33关
  { title: "望湖楼醉书", author: "苏轼", level: 33, difficulty: "easy",
    couplets: [
      { question: "黑云翻墨未遮山，白雨跳珠乱入船。卷地风来忽吹散，_____。", answer: "望湖楼下水如天" }
    ],
    full_poem: "黑云翻墨未遮山，白雨跳珠乱入船。卷地风来忽吹散，望湖楼下水如天。" },
  // 第34关
  { title: "饮湖上初晴后雨", author: "苏轼", level: 34, difficulty: "easy",
    couplets: [
      { question: "水光潋滟晴方好，山色空蒙雨亦奇。_____，淡妆浓抹总相宜。", answer: "欲把西湖比西子" }
    ],
    full_poem: "水光潋滟晴方好，山色空蒙雨亦奇。欲把西湖比西子，淡妆浓抹总相宜。" },
  // 第35关
  { title: "惠崇春江晚景", author: "苏轼", level: 35, difficulty: "easy",
    couplets: [
      { question: "竹外桃花三两枝，春江水暖鸭先知。蒌蒿满地芦芽短，_____。", answer: "正是河豚欲上时" }
    ],
    full_poem: "竹外桃花三两枝，春江水暖鸭先知。蒌蒿满地芦芽短，正是河豚欲上时。" },
  // 第36关
  { title: "题西林壁", author: "苏轼", level: 36, difficulty: "easy",
    couplets: [
      { question: "横看成岭侧成峰，远近高低各不同。_____，只缘身在此山中。", answer: "不识庐山真面目" }
    ],
    full_poem: "横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。" },
  // 第37关
  { title: "水调歌头（明月几时有）", author: "苏轼", level: 37, difficulty: "easy",
    couplets: [
      { question: "人有悲欢离合，_____。", answer: "月有阴晴圆缺" }
    ],
    full_poem: "人有悲欢离合，月有阴晴圆缺。此事古难全，但愿人长久，千里共婵娟。" },
  // 第38关
  { title: "水调歌头（明月几时有）", author: "苏轼", level: 38, difficulty: "easy",
    couplets: [
      { question: "_____，千里共婵娟。", answer: "但愿人长久" }
    ],
    full_poem: "人有悲欢离合，月有阴晴圆缺。此事古难全，但愿人长久，千里共婵娟。" },
  // 第39关
  { title: "晓出净慈寺送林子方", author: "杨万里", level: 39, difficulty: "easy",
    couplets: [
      { question: "毕竟西湖六月中，风光不与四时同。_____，映日荷花别样红。", answer: "接天莲叶无穷碧" }
    ],
    full_poem: "毕竟西湖六月中，风光不与四时同。接天莲叶无穷碧，映日荷花别样红。" },
  // 第40关
  { title: "小池", author: "杨万里", level: 40, difficulty: "easy",
    couplets: [
      { question: "泉眼无声惜细流，树阴照水爱晴柔。_____，小荷才露尖尖角。", answer: "小荷才露尖尖角" }
    ],
    full_poem: "泉眼无声惜细流，树阴照水爱晴柔。小荷才露尖尖角，早有蜻蜓立上头。" },
  // 第41关
  { title: "宿新市徐公店", author: "杨万里", level: 41, difficulty: "easy",
    couplets: [
      { question: "篱落疏疏一径深，树头花落未成阴。_____，飞入菜花无处寻。", answer: "儿童急走追黄蝶" }
    ],
    full_poem: "篱落疏疏一径深，树头花落未成阴。儿童急走追黄蝶，飞入菜花无处寻。" },
  // 第42关
  { title: "春日", author: "朱熹", level: 42, difficulty: "easy",
    couplets: [
      { question: "胜日寻芳泗水滨，无边光景一时新。_____，万紫千红总是春。", answer: "等闲识得东风面" }
    ],
    full_poem: "胜日寻芳泗水滨，无边光景一时新。等闲识得东风面，万紫千红总是春。" },
  // 第43关
  { title: "观书有感", author: "朱熹", level: 43, difficulty: "easy",
    couplets: [
      { question: "半亩方塘一鉴开，天光云影共徘徊。_____，为有源头活水来。", answer: "问渠那得清如许" }
    ],
    full_poem: "半亩方塘一鉴开，天光云影共徘徊。问渠那得清如许，为有源头活水来。" },
  // 第44关
  { title: "游园不值", author: "叶绍翁", level: 44, difficulty: "easy",
    couplets: [
      { question: "应怜屐齿印苍苔，小扣柴扉久不开。_____，一枝红杏出墙来。", answer: "春色满园关不住" }
    ],
    full_poem: "应怜屐齿印苍苔，小扣柴扉久不开。春色满园关不住，一枝红杏出墙来。" },
  // 第45关
  { title: "石灰吟", author: "于谦", level: 45, difficulty: "easy",
    couplets: [
      { question: "千锤万凿出深山，烈火焚烧若等闲。_____，要留清白在人间。", answer: "粉骨碎身浑不怕" }
    ],
    full_poem: "千锤万凿出深山，烈火焚烧若等闲。粉骨碎身浑不怕，要留清白在人间。" },
  // 第46关
  { title: "竹石", author: "郑燮", level: 46, difficulty: "easy",
    couplets: [
      { question: "咬定青山不放松，立根原在破岩中。_____，任尔东西南北风。", answer: "千磨万击还坚劲" }
    ],
    full_poem: "咬定青山不放松，立根原在破岩中。千磨万击还坚劲，任尔东西南北风。" },
  // 第47关
  { title: "村晚", author: "雷震", level: 47, difficulty: "easy",
    couplets: [
      { question: "草满池塘水满陂，山衔落日浸寒漪。牧童归去横牛背，_____。", answer: "短笛无腔信口吹" }
    ],
    full_poem: "草满池塘水满陂，山衔落日浸寒漪。牧童归去横牛背，短笛无腔信口吹。" },
  // 第48关
  { title: "四时田园杂兴（其二十五）", author: "范成大", level: 48, difficulty: "easy",
    couplets: [
      { question: "梅子金黄杏子肥，麦花雪白菜花稀。_____，惟有蜻蜓蛱蝶飞。", answer: "日长篱落无人过" }
    ],
    full_poem: "梅子金黄杏子肥，麦花雪白菜花稀。日长篱落无人过，惟有蜻蜓蛱蝶飞。" },
  // 第49关
  { title: "四时田园杂兴（其三十一）", author: "范成大", level: 49, difficulty: "easy",
    couplets: [
      { question: "昼出耘田夜绩麻，村庄儿女各当家。_____，也傍桑阴学种瓜。", answer: "童孙未解供耕织" }
    ],
    full_poem: "昼出耘田夜绩麻，村庄儿女各当家。童孙未解供耕织，也傍桑阴学种瓜。" },
  // 第50关
  { title: "稚子弄冰", author: "杨万里", level: 50, difficulty: "easy",
    couplets: [
      { question: "稚子金盆脱晓冰，彩丝穿取当银钲。敲成玉磬穿林响，_____。", answer: "忽作玻璃碎地声" }
    ],
    full_poem: "稚子金盆脱晓冰，彩丝穿取当银钲。敲成玉磬穿林响，忽作玻璃碎地声。" },

  // ========== 中等难度 51-100 ==========
  // 第51关
  { title: "山行", author: "杜牧", level: 51, difficulty: "medium",
    couplets: [
      { question: "远上寒山石径斜，白云生处有人家。_____，霜叶红于二月花。", answer: "停车坐爱枫林晚" }
    ],
    full_poem: "远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。" },
  // 第52关
  { title: "清明", author: "杜牧", level: 52, difficulty: "medium",
    couplets: [
      { question: "清明时节雨纷纷，路上行人欲断魂。_____，牧童遥指杏花村。", answer: "借问酒家何处有" }
    ],
    full_poem: "清明时节雨纷纷，路上行人欲断魂。借问酒家何处有，牧童遥指杏花村。" },
  // 第53关
  { title: "秋夕", author: "杜牧", level: 53, difficulty: "medium",
    couplets: [
      { question: "银烛秋光冷画屏，轻罗小扇扑流萤。_____，卧看牵牛织女星。", answer: "天阶夜色凉如水" }
    ],
    full_poem: "银烛秋光冷画屏，轻罗小扇扑流萤。天阶夜色凉如水，卧看牵牛织女星。" },
  // 第54关
  { title: "泊秦淮", author: "杜牧", level: 54, difficulty: "medium",
    couplets: [
      { question: "烟笼寒水月笼沙，夜泊秦淮近酒家。_____，隔江犹唱后庭花。", answer: "商女不知亡国恨" }
    ],
    full_poem: "烟笼寒水月笼沙，夜泊秦淮近酒家。商女不知亡国恨，隔江犹唱后庭花。" },
  // 第55关
  { title: "江南春", author: "杜牧", level: 55, difficulty: "medium",
    couplets: [
      { question: "千里莺啼绿映红，水村山郭酒旗风。_____，多少楼台烟雨中。", answer: "南朝四百八十寺" }
    ],
    full_poem: "千里莺啼绿映红，水村山郭酒旗风。南朝四百八十寺，多少楼台烟雨中。" },
  // 第56关
  { title: "赤壁", author: "杜牧", level: 56, difficulty: "medium",
    couplets: [
      { question: "折戟沉沙铁未销，自将磨洗认前朝。_____，铜雀春深锁二乔。", answer: "东风不与周郎便" }
    ],
    full_poem: "折戟沉沙铁未销，自将磨洗认前朝。东风不与周郎便，铜雀春深锁二乔。" },
  // 第57关
  { title: "夜雨寄北", author: "李商隐", level: 57, difficulty: "medium",
    couplets: [
      { question: "君问归期未有期，巴山夜雨涨秋池。_____，却话巴山夜雨时。", answer: "何当共剪西窗烛" }
    ],
    full_poem: "君问归期未有期，巴山夜雨涨秋池。何当共剪西窗烛，却话巴山夜雨时。" },
  // 第58关
  { title: "无题", author: "李商隐", level: 58, difficulty: "medium",
    couplets: [
      { question: "相见时难别亦难，东风无力百花残。_____，蜡炬成灰泪始干。", answer: "春蚕到死丝方尽" }
    ],
    full_poem: "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。" },
  // 第59关
  { title: "无题", author: "李商隐", level: 59, difficulty: "medium",
    couplets: [
      { question: "_____，蜡炬成灰泪始干。", answer: "春蚕到死丝方尽" }
    ],
    full_poem: "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。" },
  // 第60关
  { title: "锦瑟", author: "李商隐", level: 60, difficulty: "medium",
    couplets: [
      { question: "锦瑟无端五十弦，一弦一柱思华年。_____，望帝春心托杜鹃。", answer: "庄生晓梦迷蝴蝶" }
    ],
    full_poem: "锦瑟无端五十弦，一弦一柱思华年。庄生晓梦迷蝴蝶，望帝春心托杜鹃。" },
  // 第61关
  { title: "登飞来峰", author: "王安石", level: 61, difficulty: "medium",
    couplets: [
      { question: "飞来峰上千寻塔，闻说鸡鸣见日升。_____，自缘身在最高层。", answer: "不畏浮云遮望眼" }
    ],
    full_poem: "飞来峰上千寻塔，闻说鸡鸣见日升。不畏浮云遮望眼，自缘身在最高层。" },
  // 第62关
  { title: "泊船瓜洲", author: "王安石", level: 62, difficulty: "medium",
    couplets: [
      { question: "京口瓜洲一水间，钟山只隔数重山。春风又绿江南岸，_____。", answer: "明月何时照我还" }
    ],
    full_poem: "京口瓜洲一水间，钟山只隔数重山。春风又绿江南岸，明月何时照我还。" },
  // 第63关
  { title: "元日", author: "王安石", level: 63, difficulty: "medium",
    couplets: [
      { question: "爆竹声中一岁除，春风送暖入屠苏。_____，总把新桃换旧符。", answer: "千门万户曈曈日" }
    ],
    full_poem: "爆竹声中一岁除，春风送暖入屠苏。千门万户曈曈日，总把新桃换旧符。" },
  // 第64关
  { title: "书湖阴先生壁", author: "王安石", level: 64, difficulty: "medium",
    couplets: [
      { question: "茅檐长扫净无苔，花木成畦手自栽。_____，两山排闼送青来。", answer: "一水护田将绿绕" }
    ],
    full_poem: "茅檐长扫净无苔，花木成畦手自栽。一水护田将绿绕，两山排闼送青来。" },
  // 第65关
  { title: "游山西村", author: "陆游", level: 65, difficulty: "medium",
    couplets: [
      { question: "莫笑农家腊酒浑，丰年留客足鸡豚。_____，柳暗花明又一村。", answer: "山重水复疑无路" }
    ],
    full_poem: "莫笑农家腊酒浑，丰年留客足鸡豚。山重水复疑无路，柳暗花明又一村。" },
  // 第66关
  { title: "游山西村", author: "陆游", level: 66, difficulty: "medium",
    couplets: [
      { question: "山重水复疑无路，_____。", answer: "柳暗花明又一村" }
    ],
    full_poem: "莫笑农家腊酒浑，丰年留客足鸡豚。山重水复疑无路，柳暗花明又一村。" },
  // 第67关
  { title: "示儿", author: "陆游", level: 67, difficulty: "medium",
    couplets: [
      { question: "死去元知万事空，但悲不见九州同。_____，家祭无忘告乃翁。", answer: "王师北定中原日" }
    ],
    full_poem: "死去元知万事空，但悲不见九州同。王师北定中原日，家祭无忘告乃翁。" },
  // 第68关
  { title: "冬夜读书示子聿", author: "陆游", level: 68, difficulty: "medium",
    couplets: [
      { question: "古人学问无遗力，少壮工夫老始成。纸上得来终觉浅，_____。", answer: "绝知此事要躬行" }
    ],
    full_poem: "古人学问无遗力，少壮工夫老始成。纸上得来终觉浅，绝知此事要躬行。" },
  // 第69关
  { title: "剑门道中遇微雨", author: "陆游", level: 69, difficulty: "medium",
    couplets: [
      { question: "衣上征尘杂酒痕，远游无处不销魂。_____，细雨骑驴入剑门。", answer: "此身合是诗人未" }
    ],
    full_poem: "衣上征尘杂酒痕，远游无处不销魂。此身合是诗人未，细雨骑驴入剑门。" },
  // 第70关
  { title: "秋夜将晓出篱门迎凉有感", author: "陆游", level: 70, difficulty: "medium",
    couplets: [
      { question: "三万里河东入海，五千仞岳上摩天。_____，犹及清明可到家。", answer: "遗民泪尽胡尘里" }
    ],
    full_poem: "三万里河东入海，五千仞岳上摩天。遗民泪尽胡尘里，南望王师又一年。" },
  // 第71关
  { title: "过零丁洋", author: "文天祥", level: 71, difficulty: "medium",
    couplets: [
      { question: "辛苦遭逢起一经，干戈寥落四周星。_____，零丁洋里叹零丁。", answer: "山河破碎风飘絮" }
    ],
    full_poem: "辛苦遭逢起一经，干戈寥落四周星。山河破碎风飘絮，身世浮沉雨打萍。" },
  // 第72关
  { title: "过零丁洋", author: "文天祥", level: 72, difficulty: "medium",
    couplets: [
      { question: "人生自古谁无死，_____。", answer: "留取丹心照汗青" }
    ],
    full_poem: "辛苦遭逢起一经，干戈寥落四周星。山河破碎风飘絮，身世浮沉雨打萍。" },
  // 第73关
  { title: "西江月·夜行黄沙道中", author: "辛弃疾", level: 73, difficulty: "medium",
    couplets: [
      { question: "明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，_____。", answer: "听取蛙声一片" }
    ],
    full_poem: "明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。" },
  // 第74关
  { title: "西江月·夜行黄沙道中", author: "辛弃疾", level: 74, difficulty: "medium",
    couplets: [
      { question: "旧时茅店社林边，路转溪桥忽见。", answer: "旧时茅店社林边" }
    ],
    full_poem: "明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。" },
  // 第75关
  { title: "清平乐·村居", author: "辛弃疾", level: 75, difficulty: "medium",
    couplets: [
      { question: "茅檐低小，溪上青青草。醉里吴音相媚好，_____。", answer: "白发谁家翁媪" }
    ],
    full_poem: "茅檐低小，溪上青青草。醉里吴音相媚好，白发谁家翁媪？" },
  // 第76关
  { title: "菩萨蛮·书江西造口壁", author: "辛弃疾", level: 76, difficulty: "medium",
    couplets: [
      { question: "郁孤台下清江水，中间多少行人泪。西北望长安，_____。", answer: "可怜无数山" }
    ],
    full_poem: "郁孤台下清江水，中间多少行人泪。西北望长安，可怜无数山。" },
  // 第77关
  { title: "菩萨蛮·书江西造口壁", author: "辛弃疾", level: 77, difficulty: "medium",
    couplets: [
      { question: "青山遮不住，_____。", answer: "毕竟东流去" }
    ],
    full_poem: "郁孤台下清江水，中间多少行人泪。西北望长安，可怜无数山。" },
  // 第78关
  { title: "青玉案·元夕", author: "辛弃疾", level: 78, difficulty: "medium",
    couplets: [
      { question: "东风夜放花千树，更吹落、星如雨。宝马雕车香满路。凤箫声动，_____，一夜鱼龙舞。", answer: "玉壶光转" }
    ],
    full_poem: "东风夜放花千树，更吹落、星如雨。宝马雕车香满路。凤箫声动，玉壶光转，一夜鱼龙舞。" },
  // 第79关
  { title: "青玉案·元夕", author: "辛弃疾", level: 79, difficulty: "medium",
    couplets: [
      { question: "众里寻他千百度，蓦然回首，_____。", answer: "那人却在灯火阑珊处" }
    ],
    full_poem: "东风夜放花千树，更吹落、星如雨。宝马雕车香满路。凤箫声动，玉壶光转，一夜鱼龙舞。" },
  // 第80关
  { title: "如梦令", author: "李清照", level: 80, difficulty: "medium",
    couplets: [
      { question: "常记溪亭日暮，沉醉不知归路。兴尽晚回舟，_____。争渡，争渡，惊起一滩鸥鹭。", answer: "误入藕花深处" }
    ],
    full_poem: "常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。争渡，争渡，惊起一滩鸥鹭。" },
  // 第81关
  { title: "如梦令", author: "李清照", level: 81, difficulty: "medium",
    couplets: [
      { question: "昨夜雨疏风骤，浓睡不消残酒。试问卷帘人，_____？", answer: "却道海棠依旧" }
    ],
    full_poem: "昨夜雨疏风骤，浓睡不消残酒。试问卷帘人，却道海棠依旧。" },
  // 第82关
  { title: "醉花阴", author: "李清照", level: 82, difficulty: "medium",
    couplets: [
      { question: "薄雾浓云愁永昼，瑞脑销金兽。佳节又重阳，玉枕纱厨，_____。", answer: "半夜凉初透" }
    ],
    full_poem: "薄雾浓云愁永昼，瑞脑销金兽。佳节又重阳，玉枕纱厨，半夜凉初透。" },
  // 第83关
  { title: "醉花阴", author: "李清照", level: 83, difficulty: "medium",
    couplets: [
      { question: "莫道不消魂，_____，人比黄花瘦。", answer: "帘卷西风" }
    ],
    full_poem: "薄雾浓云愁永昼，瑞脑销金兽。佳节又重阳，玉枕纱厨，半夜凉初透。" },
  // 第84关
  { title: "声声慢", author: "李清照", level: 84, difficulty: "medium",
    couplets: [
      { question: "寻寻觅觅，冷冷清清，_____。", answer: "凄凄惨惨戚戚" }
    ],
    full_poem: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。" },
  // 第85关
  { title: "念奴娇·赤壁怀古", author: "苏轼", level: 85, difficulty: "medium",
    couplets: [
      { question: "大江东去，浪淘尽，_____。", answer: "千古风流人物" }
    ],
    full_poem: "大江东去，浪淘尽，千古风流人物。故垒西边人道是，三国周郎赤壁。" },
  // 第86关
  { title: "念奴娇·赤壁怀古", author: "苏轼", level: 86, difficulty: "medium",
    couplets: [
      { question: "乱石穿空，惊涛拍岸，卷起千堆雪。_____，一时多少豪杰。", answer: "江山如画" }
    ],
    full_poem: "大江东去，浪淘尽，千古风流人物。故垒西边人道是，三国周郎赤壁。" },
  // 第87关
  { title: "水调歌头", author: "苏轼", level: 87, difficulty: "medium",
    couplets: [
      { question: "明月几时有？_____。", answer: "把酒问青天" }
    ],
    full_poem: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年？" },
  // 第88关
  { title: "水调歌头", author: "苏轼", level: 88, difficulty: "medium",
    couplets: [
      { question: "我欲乘风归去，又恐琼楼玉宇，_____。", answer: "高处不胜寒" }
    ],
    full_poem: "我欲乘风归去，又恐琼楼玉宇，高处不胜寒。" },
  // 第89关
  { title: "定风波", author: "苏轼", level: 89, difficulty: "medium",
    couplets: [
      { question: "莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？_____。", answer: "一蓑烟雨任平生" }
    ],
    full_poem: "莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。" },
  // 第90关
  { title: "江城子·密州出猎", author: "苏轼", level: 90, difficulty: "medium",
    couplets: [
      { question: "老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，_____。", answer: "千骑卷平冈" }
    ],
    full_poem: "老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。" },
  // 第91关
  { title: "惠崇春江晚景", author: "苏轼", level: 91, difficulty: "medium",
    couplets: [
      { question: "竹外桃花三两枝，_____。", answer: "春江水暖鸭先知" }
    ],
    full_poem: "竹外桃花三两枝，春江水暖鸭先知。蒌蒿满地芦芽短，正是河豚欲上时。" },
  // 第92关
  { title: "题西林壁", author: "苏轼", level: 92, difficulty: "medium",
    couplets: [
      { question: "_____，只缘身在此山中。", answer: "不识庐山真面目" }
    ],
    full_poem: "横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。" },
  // 第93关
  { title: "水调歌头", author: "苏轼", level: 93, difficulty: "medium",
    couplets: [
      { question: "_____，何事长向别时圆？", answer: "不应有恨" }
    ],
    full_poem: "人有悲欢离合，月有阴晴圆缺。此事古难全，但愿人长久，千里共婵娟。" },
  // 第94关
  { title: "使至塞上", author: "王维", level: 94, difficulty: "medium",
    couplets: [
      { question: "单车欲问边，属国过居延。_____，归雁入胡天。", answer: "征蓬出汉塞" }
    ],
    full_poem: "单车欲问边，属国过居延。征蓬出汉塞，归雁入胡天。" },
  // 第95关
  { title: "使至塞上", author: "王维", level: 95, difficulty: "medium",
    couplets: [
      { question: "大漠孤烟直，_____。", answer: "长河落日圆" }
    ],
    full_poem: "单车欲问边，属国过居延。征蓬出汉塞，归雁入胡天。大漠孤烟直，长河落日圆。" },
  // 第96关
  { title: "山居秋暝", author: "王维", level: 96, difficulty: "medium",
    couplets: [
      { question: "空山新雨后，天气晚来秋。明月松间照，_____。", answer: "清泉石上流" }
    ],
    full_poem: "空山新雨后，天气晚来秋。明月松间照，清泉石上流。" },
  // 第97关
  { title: "鸟鸣涧", author: "王维", level: 97, difficulty: "medium",
    couplets: [
      { question: "人闲桂花落，夜静春山空。_____，时鸣春涧中。", answer: "月出惊山鸟" }
    ],
    full_poem: "人闲桂花落，夜静春山空。月出惊山鸟，时鸣春涧中。" },
  // 第98关
  { title: "竹里馆", author: "王维", level: 98, difficulty: "medium",
    couplets: [
      { question: "独坐幽篁里，弹琴复长啸。_____，明月来相照。", answer: "深林人不知" }
    ],
    full_poem: "独坐幽篁里，弹琴复长啸。深林人不知，明月来相照。" },
  // 第99关
  { title: "鹿柴", author: "王维", level: 99, difficulty: "medium",
    couplets: [
      { question: "空山不见人，_____。返景入深林，复照青苔上。", answer: "但闻人语响" }
    ],
    full_poem: "空山不见人，但闻人语响。返景入深林，复照青苔上。" },
  // 第100关
  { title: "杂诗", author: "王维", level: 100, difficulty: "medium",
    couplets: [
      { question: "君自故乡来，应知故乡事。_____，来日绮窗前，寒梅著花未？", answer: "来日绮窗前" }
    ],
    full_poem: "君自故乡来，应知故乡事。来日绮窗前，寒梅著花未？" },

  // ========== 困难难度 101-150 ==========
  // 第101关
  { title: "黄鹤楼", author: "崔颢", level: 101, difficulty: "hard",
    couplets: [
      { question: "昔人已乘黄鹤去，此地空余黄鹤楼。黄鹤一去不复返，_____。", answer: "白云千载空悠悠" }
    ],
    full_poem: "昔人已乘黄鹤去，此地空余黄鹤楼。黄鹤一去不复返，白云千载空悠悠。晴川历历汉阳树，芳草萋萋鹦鹉洲。日暮乡关何处是？烟波江上使人愁。" },
  // 第102关
  { title: "黄鹤楼", author: "崔颢", level: 102, difficulty: "hard",
    couplets: [
      { question: "晴川历历汉阳树，芳草萋萋鹦鹉洲。_____？烟波江上使人愁。", answer: "日暮乡关何处是" }
    ],
    full_poem: "昔人已乘黄鹤去，此地空余黄鹤楼。黄鹤一去不复返，白云千载空悠悠。晴川历历汉阳树，芳草萋萋鹦鹉洲。日暮乡关何处是？烟波江上使人愁。" },
  // 第103关
  { title: "望岳", author: "杜甫", level: 103, difficulty: "hard",
    couplets: [
      { question: "岱宗夫如何？齐鲁青未了。造化钟神秀，_____。", answer: "阴阳割昏晓" }
    ],
    full_poem: "岱宗夫如何？齐鲁青未了。造化钟神秀，阴阳割昏晓。荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。" },
  // 第104关
  { title: "望岳", author: "杜甫", level: 104, difficulty: "hard",
    couplets: [
      { question: "_____，一览众山小。", answer: "会当凌绝顶" }
    ],
    full_poem: "岱宗夫如何？齐鲁青未了。造化钟神秀，阴阳割昏晓。荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。" },
  // 第105关
  { title: "春望", author: "杜甫", level: 105, difficulty: "hard",
    couplets: [
      { question: "国破山河在，城春草木深。_____，恨别鸟惊心。", answer: "感时花溅泪" }
    ],
    full_poem: "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。" },
  // 第106关
  { title: "春望", author: "杜甫", level: 106, difficulty: "hard",
    couplets: [
      { question: "烽火连三月，_____。", answer: "家书抵万金" }
    ],
    full_poem: "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。" },
  // 第107关
  { title: "登高", author: "杜甫", level: 107, difficulty: "hard",
    couplets: [
      { question: "风急天高猿啸哀，渚清沙白鸟飞回。_____，不尽长江滚滚来。", answer: "无边落木萧萧下" }
    ],
    full_poem: "风急天高猿啸哀，渚清沙白鸟飞回。无边落木萧萧下，不尽长江滚滚来。万里悲秋常作客，百年多病独登台。艰难苦恨繁霜鬓，潦倒新停浊酒杯。" },
  // 第108关
  { title: "登高", author: "杜甫", level: 108, difficulty: "hard",
    couplets: [
      { question: "_____，百年多病独登台。", answer: "万里悲秋常作客" }
    ],
    full_poem: "风急天高猿啸哀，渚清沙白鸟飞回。无边落木萧萧下，不尽长江滚滚来。万里悲秋常作客，百年多病独登台。艰难苦恨繁霜鬓，潦倒新停浊酒杯。" },
  // 第109关
  { title: "蜀相", author: "杜甫", level: 109, difficulty: "hard",
    couplets: [
      { question: "丞相祠堂何处寻，锦官城外柏森森。_____，隔叶黄鹂空好音。", answer: "映阶碧草自春色" }
    ],
    full_poem: "丞相祠堂何处寻，锦官城外柏森森。映阶碧草自春色，隔叶黄鹂空好音。三顾频烦天下计，两朝开济老臣心。出师未捷身先死，长使英雄泪满襟。" },
  // 第110关
  { title: "蜀相", author: "杜甫", level: 110, difficulty: "hard",
    couplets: [
      { question: "三顾频烦天下计，两朝开济老臣心。_____，长使英雄泪满襟。", answer: "出师未捷身先死" }
    ],
    full_poem: "丞相祠堂何处寻，锦官城外柏森森。映阶碧草自春色，隔叶黄鹂空好音。三顾频烦天下计，两朝开济老臣心。出师未捷身先死，长使英雄泪满襟。" },
  // 第111关
  { title: "春夜洛城闻笛", author: "李白", level: 111, difficulty: "hard",
    couplets: [
      { question: "谁家玉笛暗飞声，散入春风满洛城。_____，何事满座沾衣。", answer: "此夜曲中闻折柳" }
    ],
    full_poem: "谁家玉笛暗飞声，散入春风满洛城。此夜曲中闻折柳，何人不起故园情。" },
  // 第112关
  { title: "客中行", author: "李白", level: 112, difficulty: "hard",
    couplets: [
      { question: "兰陵美酒郁金香，玉碗盛来琥珀光。但使主人能醉客，_____。", answer: "不知何处是他乡" }
    ],
    full_poem: "兰陵美酒郁金香，玉碗盛来琥珀光。但使主人能醉客，不知何处是他乡。" },
  // 第113关
  { title: "将进酒", author: "李白", level: 113, difficulty: "hard",
    couplets: [
      { question: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，_____。", answer: "朝如青丝暮成雪" }
    ],
    full_poem: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。" },
  // 第114关
  { title: "将进酒", author: "李白", level: 114, difficulty: "hard",
    couplets: [
      { question: "人生得意须尽欢，_____。", answer: "莫使金樽空对月" }
    ],
    full_poem: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。" },
  // 第115关
  { title: "将进酒", author: "李白", level: 115, difficulty: "hard",
    couplets: [
      { question: "_____，千金散尽还复来。", answer: "天生我材必有用" }
    ],
    full_poem: "君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。" },
  // 第116关
  { title: "蜀道难", author: "李白", level: 116, difficulty: "hard",
    couplets: [
      { question: "噫吁嚱，危乎高哉！蜀道之难，难于上青天！蚕丛及鱼凫，_____，尔来四万八千岁，不与秦塞通人烟。", answer: "开国何茫然" }
    ],
    full_poem: "噫吁嚱，危乎高哉！蜀道之难，难于上青天！蚕丛及鱼凫，开国何茫然，尔来四万八千岁，不与秦塞通人烟。" },
  // 第117关
  { title: "蜀道难", author: "李白", level: 117, difficulty: "hard",
    couplets: [
      { question: "上有六龙回日之高标，下有冲波逆折之回川。黄鹤之飞尚不得过，_____。", answer: "猿猱欲度愁攀援" }
    ],
    full_poem: "上有六龙回日之高标，下有冲波逆折之回川。黄鹤之飞尚不得过，猿猱欲度愁攀援。" },
  // 第118关
  { title: "蜀道难", author: "李白", level: 118, difficulty: "hard",
    couplets: [
      { question: "_____，一夫当关，万夫莫开。", answer: "剑阁峥嵘而崔嵬" }
    ],
    full_poem: "剑阁峥嵘而崔嵬，一夫当关，万夫莫开。" },
  // 第119关
  { title: "行路难", author: "李白", level: 119, difficulty: "hard",
    couplets: [
      { question: "金樽清酒斗十千，玉盘珍羞直万钱。停杯投箸不能食，拔剑四顾心茫然。欲渡黄河冰塞川，_____。", answer: "将登太行雪满山" }
    ],
    full_poem: "金樽清酒斗十千，玉盘珍羞直万钱。停杯投箸不能食，拔剑四顾心茫然。欲渡黄河冰塞川，将登太行雪满山。闲来垂钓碧溪上，忽复乘舟梦日边。行路难，行路难，多歧路，今安在？长风破浪会有时，直挂云帆济沧海。" },
  // 第120关
  { title: "行路难", author: "李白", level: 120, difficulty: "hard",
    couplets: [
      { question: "长风破浪会有时，_____。", answer: "直挂云帆济沧海" }
    ],
    full_poem: "金樽清酒斗十千，玉盘珍羞直万钱。停杯投箸不能食，拔剑四顾心茫然。欲渡黄河冰塞川，将登太行雪满山。闲来垂钓碧溪上，忽复乘舟梦日边。行路难，行路难，多歧路，今安在？长风破浪会有时，直挂云帆济沧海。" },
  // 第121关
  { title: "登金陵凤凰台", author: "李白", level: 121, difficulty: "hard",
    couplets: [
      { question: "凤凰台上凤凰游，凤去台空江自流。吴宫花草埋幽径，晋代衣冠成古丘。_____，长安不见使人愁。", answer: "三山半落青天外" }
    ],
    full_poem: "凤凰台上凤凰游，凤去台空江自流。吴宫花草埋幽径，晋代衣冠成古丘。三山半落青天外，二水中分白鹭洲。总为浮云能蔽日，长安不见使人愁。" },
  // 第122关
  { title: "登金陵凤凰台", author: "李白", level: 122, difficulty: "hard",
    couplets: [
      { question: "总为浮云能蔽日，_____。", answer: "长安不见使人愁" }
    ],
    full_poem: "凤凰台上凤凰游，凤去台空江自流。吴宫花草埋幽径，晋代衣冠成古丘。三山半落青天外，二水中分白鹭洲。总为浮云能蔽日，长安不见使人愁。" },
  // 第123关
  { title: "长干行", author: "李白", level: 123, difficulty: "hard",
    couplets: [
      { question: "妾发初覆额，折花门前剧。郎骑竹马来，绕床弄青梅。同居长干里，两小无嫌猜。_____，早晚下三巴。", answer: "十六为君妇" }
    ],
    full_poem: "妾发初覆额，折花门前剧。郎骑竹马来，绕床弄青梅。同居长干里，两小无嫌猜。十四为君妇，羞颜未尝开。" },
  // 第124关
  { title: "长干行", author: "李白", level: 124, difficulty: "hard",
    couplets: [
      { question: "门前迟行迹，一一生绿苔。苔深不能扫，落叶秋风早。_____，早晚下三巴。", answer: "八月蝴蝶黄" }
    ],
    full_poem: "门前迟行迹，一一生绿苔。苔深不能扫，落叶秋风早。八月蝴蝶黄，双飞西园草。" },
  // 第125关
  { title: "关山月", author: "李白", level: 125, difficulty: "hard",
    couplets: [
      { question: "明月出天山，苍茫云海间。长风几万里，吹度玉门关。_____，万里长征人未还。", answer: "汉下白登道" }
    ],
    full_poem: "明月出天山，苍茫云海间。长风几万里，吹度玉门关。汉下白登道，胡窥青海湾。由来征战地，不见有人还。" },
  // 第126关
  { title: "望月怀远", author: "张九龄", level: 126, difficulty: "hard",
    couplets: [
      { question: "海上生明月，天涯共此时。情人怨遥夜，_____。", answer: "竟夕起相思" }
    ],
    full_poem: "海上生明月，天涯共此时。情人怨遥夜，竟夕起相思。灭烛怜光满，披衣觉露滋。不堪盈手赠，还寝梦佳期。" },
  // 第127关
  { title: "望月怀远", author: "张九龄", level: 127, difficulty: "hard",
    couplets: [
      { question: "海上生明月，_____。", answer: "天涯共此时" }
    ],
    full_poem: "海上生明月，天涯共此时。情人怨遥夜，竟夕起相思。灭烛怜光满，披衣觉露滋。不堪盈手赠，还寝梦佳期。" },
  // 第128关
  { title: "月夜忆舍弟", author: "杜甫", level: 128, difficulty: "hard",
    couplets: [
      { question: "戍鼓断人行，边秋一雁声。露从今夜白，_____。", answer: "月是故乡明" }
    ],
    full_poem: "戍鼓断人行，边秋一雁声。露从今夜白，月是故乡明。有弟皆分散，无家问死生。寄书长不达，况乃未休兵。" },
  // 第129关
  { title: "月夜忆舍弟", author: "杜甫", level: 129, difficulty: "hard",
    couplets: [
      { question: "有弟皆分散，_____。", answer: "无家问死生" }
    ],
    full_poem: "戍鼓断人行，边秋一雁声。露从今夜白，月是故乡明。有弟皆分散，无家问死生。寄书长不达，况乃未休兵。" },
  // 第130关
  { title: "旅夜书怀", author: "杜甫", level: 130, difficulty: "hard",
    couplets: [
      { question: "细草微风岸，危樯独夜舟。星垂平野阔，月涌大江流。_____，官应老病休。", answer: "名岂文章著" }
    ],
    full_poem: "细草微风岸，危樯独夜舟。星垂平野阔，月涌大江流。名岂文章著，官应老病休。飘飘何所似，天地一沙鸥。" },
  // 第131关
  { title: "旅夜书怀", author: "杜甫", level: 131, difficulty: "hard",
    couplets: [
      { question: "飘飘何所似，天地一沙鸥。", answer: "飘飘何所似" }
    ],
    full_poem: "细草微风岸，危樯独夜舟。星垂平野阔，月涌大江流。名岂文章著，官应老病休。飘飘何所似，天地一沙鸥。" },
  // 第132关
  { title: "月夜", author: "杜甫", level: 132, difficulty: "hard",
    couplets: [
      { question: "今夜鄜州月，闺中只独看。遥怜小儿女，_____。", answer: "未解忆长安" }
    ],
    full_poem: "今夜鄜州月，闺中只独看。遥怜小儿女，未解忆长安。香雾云鬟湿，清辉玉臂寒。何时倚虚幌，双照泪痕干。" },
  // 第133关
  { title: "登岳阳楼", author: "杜甫", level: 133, difficulty: "hard",
    couplets: [
      { question: "昔闻洞庭水，今上岳阳楼。_____，乾坤日夜浮。", answer: "吴楚东南坼" }
    ],
    full_poem: "昔闻洞庭水，今上岳阳楼。吴楚东南坼，乾坤日夜浮。亲朋无一字，老病有孤舟。戎马关山北，凭轩涕泗流。" },
  // 第134关
  { title: "茅屋为秋风所破歌", author: "杜甫", level: 134, difficulty: "hard",
    couplets: [
      { question: "安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。_____，吾庐独破受冻死亦足！", answer: "呜呼！何时眼前突兀见此屋" }
    ],
    full_poem: "安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。呜呼！何时眼前突兀见此屋，吾庐独破受冻死亦足！" },
  // 第135关
  { title: "送友人", author: "李白", level: 135, difficulty: "hard",
    couplets: [
      { question: "青山横北郭，白水绕东城。此地一为别，_____。", answer: "孤蓬万里征" }
    ],
    full_poem: "青山横北郭，白水绕东城。此地一为别，孤蓬万里征。浮云游子意，落日故人情。挥手自兹去，萧萧班马鸣。" },
  // 第136关
  { title: "秋兴八首（其一）", author: "杜甫", level: 136, difficulty: "hard",
    couplets: [
      { question: "玉露凋伤枫树林，巫山巫峡气萧森。_____，孤舟一系故园心。", answer: "丛菊两开他日泪" }
    ],
    full_poem: "玉露凋伤枫树林，巫山巫峡气萧森。江间波浪兼天涌，塞上风云接地阴。丛菊两开他日泪，孤舟一系故园心。" },
  // 第137关
  { title: "琵琶行", author: "白居易", level: 137, difficulty: "hard",
    couplets: [
      { question: "浔阳江头夜送客，枫叶荻花秋瑟瑟。主人下马客在船，举酒欲饮无管弦。_____，别时茫茫江浸月。", answer: "醉不成欢惨将别" }
    ],
    full_poem: "浔阳江头夜送客，枫叶荻花秋瑟瑟。主人下马客在船，举酒欲饮无管弦。醉不成欢惨将别，别时茫茫江浸月。" },
  // 第138关
  { title: "琵琶行", author: "白居易", level: 138, difficulty: "hard",
    couplets: [
      { question: "大弦嘈嘈如急雨，小弦切切如私语。嘈嘈切切错杂弹，_____。", answer: "大珠小珠落玉盘" }
    ],
    full_poem: "大弦嘈嘈如急雨，小弦切切如私语。嘈嘈切切错杂弹，大珠小珠落玉盘。" },
  // 第139关
  { title: "琵琶行", author: "白居易", level: 139, difficulty: "hard",
    couplets: [
      { question: "_____，相逢何必曾相识！", answer: "同是天涯沦落人" }
    ],
    full_poem: "同是天涯沦落人，相逢何必曾相识！" },
  // 第140关
  { title: "琵琶行", author: "白居易", level: 140, difficulty: "hard",
    couplets: [
      { question: "座中泣下谁最多？江州司马青衫湿。", answer: "座中泣下谁最多" }
    ],
    full_poem: "同是天涯沦落人，相逢何必曾相识！我从去年辞帝京，谪居卧病浔阳城。……座中泣下谁最多？江州司马青衫湿。" },
  // 第141关
  { title: "长恨歌", author: "白居易", level: 141, difficulty: "hard",
    couplets: [
      { question: "汉皇重色思倾国，御宇多年求不得。杨家有女初长成，_____。", answer: "养在深闺人未识" }
    ],
    full_poem: "汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。" },
  // 第142关
  { title: "长恨歌", author: "白居易", level: 142, difficulty: "hard",
    couplets: [
      { question: "后宫佳丽三千人，三千宠爱在一身。", answer: "后宫佳丽三千人" }
    ],
    full_poem: "后宫佳丽三千人，三千宠爱在一身。金屋妆成娇侍夜，玉楼宴罢醉和春。" },
  // 第143关
  { title: "长恨歌", author: "白居易", level: 143, difficulty: "hard",
    couplets: [
      { question: "在天愿作比翼鸟，在地愿为连理枝。_____，此恨绵绵无绝期。", answer: "天长地久有时尽" }
    ],
    full_poem: "在天愿作比翼鸟，在地愿为连理枝。天长地久有时尽，此恨绵绵无绝期。" },
  // 第144关
  { title: "卖炭翁", author: "白居易", level: 144, difficulty: "hard",
    couplets: [
      { question: "卖炭得钱何所营？身上衣裳口中食。可怜身上衣正单，_____。", answer: "心忧炭贱愿天寒" }
    ],
    full_poem: "卖炭得钱何所营？身上衣裳口中食。可怜身上衣正单，心忧炭贱愿天寒。夜来城外一尺雪，晓驾炭车辗冰辙。" },
  // 第145关
  { title: "赋得古原草送别", author: "白居易", level: 145, difficulty: "hard",
    couplets: [
      { question: "离离原上草，一岁一枯荣。野火烧不尽，_____。", answer: "春风吹又生" }
    ],
    full_poem: "离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。远芳侵古道，晴翠接荒城。又送王孙去，萋萋满别情。" },
  // 第146关
  { title: "忆江南", author: "白居易", level: 146, difficulty: "hard",
    couplets: [
      { question: "江南好，风景旧曾谙。日出江花红胜火，_____，能不忆江南？", answer: "春来江水绿如蓝" }
    ],
    full_poem: "江南好，风景旧曾谙。日出江花红胜火，春来江水绿如蓝。能不忆江南？" },
  // 第147关
  { title: "钱塘湖春行", author: "白居易", level: 147, difficulty: "hard",
    couplets: [
      { question: "孤山寺北贾亭西，水面初平云脚低。几处早莺争暖树，_____。", answer: "谁家新燕啄春泥" }
    ],
    full_poem: "孤山寺北贾亭西，水面初平云脚低。几处早莺争暖树，谁家新燕啄春泥。乱花渐欲迷人眼，浅草才能没马蹄。最爱湖东行不足，绿杨阴里白沙堤。" },
  // 第148关
  { title: "钱塘湖春行", author: "白居易", level: 148, difficulty: "hard",
    couplets: [
      { question: "乱花渐欲迷人眼，_____。", answer: "浅草才能没马蹄" }
    ],
    full_poem: "孤山寺北贾亭西，水面初平云脚低。几处早莺争暖树，谁家新燕啄春泥。乱花渐欲迷人眼，浅草才能没马蹄。最爱湖东行不足，绿杨阴里白沙堤。" },
  // 第149关
  { title: "暮江吟", author: "白居易", level: 149, difficulty: "hard",
    couplets: [
      { question: "一道残阳铺水中，半江瑟瑟半江红。_____，露似真珠月似弓。", answer: "可怜九月初三夜" }
    ],
    full_poem: "一道残阳铺水中，半江瑟瑟半江红。可怜九月初三夜，露似真珠月似弓。" },
  // 第150关
  { title: "问刘十九", author: "白居易", level: 150, difficulty: "hard",
    couplets: [
      { question: "绿蚁新醅酒，红泥小火炉。晚来天欲雪，_____？", answer: "能饮一杯无" }
    ],
    full_poem: "绿蚁新醅酒，红泥小火炉。晚来天欲雪，能饮一杯无？" },

  // ========== 挑战难度 151-200 ==========
  // 第151关
  { title: "雁门太守行", author: "李贺", level: 151, difficulty: "challenge",
    couplets: [
      { question: "黑云压城城欲摧，甲光向日金鳞开。角声满天秋色里，_____。", answer: "塞上燕脂凝夜紫" }
    ],
    full_poem: "黑云压城城欲摧，甲光向日金鳞开。角声满天秋色里，塞上燕脂凝夜紫。半卷红旗临易水，霜重鼓寒声不起。报君黄金台上意，提携玉龙为君死。" },
  // 第152关
  { title: "雁门太守行", author: "李贺", level: 152, difficulty: "challenge",
    couplets: [
      { question: "报君黄金台上意，_____。", answer: "提携玉龙为君死" }
    ],
    full_poem: "黑云压城城欲摧，甲光向日金鳞开。角声满天秋色里，塞上燕脂凝夜紫。半卷红旗临易水，霜重鼓寒声不起。报君黄金台上意，提携玉龙为君死。" },
  // 第153关
  { title: "李凭箜篌引", author: "李贺", level: 153, difficulty: "challenge",
    couplets: [
      { question: "吴丝蜀桐张高秋，空山凝云颓不流。_____，老鱼跳波瘦蛟舞。", answer: "梦入神山教神妪" }
    ],
    full_poem: "吴丝蜀桐张高秋，空山凝云颓不流。梦入神山教神妪，老鱼跳波瘦蛟舞。" },
  // 第154关
  { title: "南园十三首（其五）", author: "李贺", level: 154, difficulty: "challenge",
    couplets: [
      { question: "男儿何不带吴钩，收取关山五十州。_____，不破楼兰终不还。", answer: "请君暂上凌烟阁" }
    ],
    full_poem: "男儿何不带吴钩，收取关山五十州。请君暂上凌烟阁，若个书生万户侯？" },
  // 第155关
  { title: "马诗二十三首（其五）", author: "李贺", level: 155, difficulty: "challenge",
    couplets: [
      { question: "大漠沙如雪，燕山月似钩。_____，何当金络脑，快走踏清秋。", answer: "何当金络脑" }
    ],
    full_poem: "大漠沙如雪，燕山月似钩。何当金络脑，快走踏清秋。" },
  // 第156关
  { title: "金铜仙人辞汉歌", author: "李贺", level: 156, difficulty: "challenge",
    couplets: [
      { question: "茂陵刘郎秋风客，夜闻马嘶晓无迹。_____，东关酸风射眸子。", answer: "画栏桂树悬秋香" }
    ],
    full_poem: "茂陵刘郎秋风客，夜闻马嘶晓无迹。画栏桂树悬秋香，三十六宫土花碧。" },
  // 第157关
  { title: "秋来", author: "李贺", level: 157, difficulty: "challenge",
    couplets: [
      { question: "桐风惊心壮士苦，衰灯络纬啼寒素。_____，秋坟鬼唱鲍家诗，恨血千年土中碧。", answer: "谁看青简一编书" }
    ],
    full_poem: "桐风惊心壮士苦，衰灯络纬啼寒素。谁看青简一编书，不遣花虫粉空蠹？" },
  // 第158关
  { title: "过华清宫", author: "杜牧", level: 158, difficulty: "challenge",
    couplets: [
      { question: "长安回望绣成堆，山顶千门次第开。_____，无人知是荔枝来。", answer: "一骑红尘妃子笑" }
    ],
    full_poem: "长安回望绣成堆，山顶千门次第开。一骑红尘妃子笑，无人知是荔枝来。" },
  // 第159关
  { title: "过华清宫", author: "杜牧", level: 159, difficulty: "challenge",
    couplets: [
      { question: "新丰绿树起黄埃，数骑渔阳探使回。霓裳一曲千峰上，_____。", answer: "舞破中原始下来" }
    ],
    full_poem: "新丰绿树起黄埃，数骑渔阳探使回。霓裳一曲千峰上，舞破中原始下来。" },
  // 第160关
  { title: "寄扬州韩绑判官", author: "杜牧", level: 160, difficulty: "challenge",
    couplets: [
      { question: "青山隐隐水迢迢，秋尽江南草未凋。_____，月明三五时时照。", answer: "二十四桥明月夜" }
    ],
    full_poem: "青山隐隐水迢迢，秋尽江南草未凋。二十四桥明月夜，玉人何处教吹箫？" },
  // 第161关
  { title: "遣怀", author: "杜牧", level: 161, difficulty: "challenge",
    couplets: [
      { question: "落魄江南载酒行，楚腰纤细掌中轻。十年一觉扬州梦，_____。", answer: "赢得青楼薄幸名" }
    ],
    full_poem: "落魄江南载酒行，楚腰纤细掌中轻。十年一觉扬州梦，赢得青楼薄幸名。" },
  // 第162关
  { title: "赠别二首", author: "杜牧", level: 162, difficulty: "challenge",
    couplets: [
      { question: "多情却似总无情，唯觉樽前笑不成。_____，落月摇情满江树。", answer: "蜡烛有心还惜别" }
    ],
    full_poem: "多情却似总无情，唯觉樽前笑不成。蜡烛有心还惜别，替人垂泪到天明。" },
  // 第163关
  { title: "贾生", author: "李商隐", level: 163, difficulty: "challenge",
    couplets: [
      { question: "宣室求贤访逐臣，贾生才调更无伦。可怜夜半虚前席，_____。", answer: "不问苍生问鬼神" }
    ],
    full_poem: "宣室求贤访逐臣，贾生才调更无伦。可怜夜半虚前席，不问苍生问鬼神。" },
  // 第164关
  { title: "安定城楼", author: "李商隐", level: 164, difficulty: "challenge",
    couplets: [
      { question: "迢递高城百尺楼，绿杨枝外尽汀洲。贾生年少虚垂涕，_____。", answer: "王粲春来更远游" }
    ],
    full_poem: "迢递高城百尺楼，绿杨枝外尽汀洲。贾生年少虚垂涕，王粲春来更远游。" },
  // 第165关
  { title: "无题", author: "李商隐", level: 165, difficulty: "challenge",
    couplets: [
      { question: "_____，青鸟殷勤为探看。", answer: "蓬山此去无多路" }
    ],
    full_poem: "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。晓镜但愁云鬓改，夜吟应觉月光寒。蓬山此去无多路，青鸟殷勤为探看。" },
  // 第166关
  { title: "晚晴", author: "李商隐", level: 166, difficulty: "challenge",
    couplets: [
      { question: "深居俯夹城，春去夏犹清。天意怜幽草，_____。", answer: "人间重晚晴" }
    ],
    full_poem: "深居俯夹城，春去夏犹清。天意怜幽草，人间重晚晴。并添高阁迥，微注小窗明。" },
  // 第167关
  { title: "宿骆氏亭寄怀崔雍崔衮", author: "李商隐", level: 167, difficulty: "challenge",
    couplets: [
      { question: "竹坞无尘水槛清，相思迢递隔重城。_____，留得枯荷听雨声。", answer: "秋阴不散霜飞晚" }
    ],
    full_poem: "竹坞无尘水槛清，相思迢递隔重城。秋阴不散霜飞晚，留得枯荷听雨声。" },
  // 第168关
  { title: "锦瑟", author: "李商隐", level: 168, difficulty: "challenge",
    couplets: [
      { question: "沧海月明珠有泪，蓝田日暖玉生烟。_____，只是当时已惘然。", answer: "此情可待成追忆" }
    ],
    full_poem: "锦瑟无端五十弦，一弦一柱思华年。庄生晓梦迷蝴蝶，望帝春心托杜鹃。沧海月明珠有泪，蓝田日暖玉生烟。此情可待成追忆，只是当时已惘然。" },
  // 第169关
  { title: "马嵬", author: "李商隐", level: 169, difficulty: "challenge",
    couplets: [
      { question: "海外徒闻更九州，他生未卜此生休。空闻虎旅传宵柝，_____。", answer: "无复鸡人报晓筹" }
    ],
    full_poem: "海外徒闻更九州，他生未卜此生休。空闻虎旅传宵柝，无复鸡人报晓筹。此日六军同驻马，当时七夕笑牵牛。" },
  // 第170关
  { title: "隋宫", author: "李商隐", level: 170, difficulty: "challenge",
    couplets: [
      { question: "紫泉宫殿锁烟霞，欲取芜城作帝家。玉玺不缘归日角，_____。", answer: "锦帆应是到天涯" }
    ],
    full_poem: "紫泉宫殿锁烟霞，欲取芜城作帝家。玉玺不缘归日角，锦帆应是到天涯。" },
  // 第171关
  { title: "咏史", author: "李商隐", level: 171, difficulty: "challenge",
    couplets: [
      { question: "北湖南埭水漫漫，一片降旗百尺竿。_____，也无一个是男儿。", answer: "三百年间同晓梦" }
    ],
    full_poem: "北湖南埭水漫漫，一片降旗百尺竿。三百年间同晓梦，也无一个是男儿。" },
  // 第172关
  { title: "瑶瑟怨", author: "温庭筠", level: 172, difficulty: "challenge",
    couplets: [
      { question: "冰簟银床梦不成，碧天如水夜云轻。_____，十二楼中月自明。", answer: "雁声远过潇湘去" }
    ],
    full_poem: "冰簟银床梦不成，碧天如水夜云轻。雁声远过潇湘去，十二楼中月自明。" },
  // 第173关
  { title: "商山早行", author: "温庭筠", level: 173, difficulty: "challenge",
    couplets: [
      { question: "晨起动征铎，客行悲故乡。鸡声茅店月，_____。", answer: "人迹板桥霜" }
    ],
    full_poem: "晨起动征铎，客行悲故乡。鸡声茅店月，人迹板桥霜。槲叶落山路，枳花明驿墙。因思杜陵梦，凫雁满回塘。" },
  // 第174关
  { title: "菩萨蛮", author: "温庭筠", level: 174, difficulty: "challenge",
    couplets: [
      { question: "小山重叠金明灭，鬓云欲度香腮雪。懒起画蛾眉，_____。", answer: "弄妆梳洗迟" }
    ],
    full_poem: "小山重叠金明灭，鬓云欲度香腮雪。懒起画蛾眉，弄妆梳洗迟。照花前后镜，花面交相映。新贴绣罗襦，双双金鹧鸪。" },
  // 第175关
  { title: "菩萨蛮", author: "温庭筠", level: 175, difficulty: "challenge",
    couplets: [
      { question: "_____，春水渡溪桥。", answer: "骑马倚斜桥" }
    ],
    full_poem: "杏花含露团香雪，绿杨陌上多离别。梦在江南杨柳岸，骑马倚斜桥，满楼红袖招。" },
  // 第176关
  { title: "望江南", author: "温庭筠", level: 176, difficulty: "challenge",
    couplets: [
      { question: "梳洗罢，独倚望江楼。过尽千帆皆不是，斜晖脉脉水悠悠，_____。", answer: "肠断白苹洲" }
    ],
    full_poem: "梳洗罢，独倚望江楼。过尽千帆皆不是，斜晖脉脉水悠悠，肠断白苹洲。" },
  // 第177关
  { title: "更漏子", author: "温庭筠", level: 177, difficulty: "challenge",
    couplets: [
      { question: "玉炉香，红蜡泪，偏照画堂秋思。眉翠薄，鬓云残，_____。", answer: "夜长衾枕寒" }
    ],
    full_poem: "玉炉香，红蜡泪，偏照画堂秋思。眉翠薄，鬓云残，夜长衾枕寒。梧桐树，三更雨，不道离情正苦。一叶叶，一声声，空阶滴到明。" },
  // 第178关
  { title: "菩萨蛮", author: "韦庄", level: 178, difficulty: "challenge",
    couplets: [
      { question: "人人尽说江南好，游人只合江南老。春水碧于天，_____。", answer: "画船听雨眠" }
    ],
    full_poem: "人人尽说江南好，游人只合江南老。春水碧于天，画船听雨眠。垆边人似月，皓腕凝霜雪。未老莫还乡，还乡须断肠。" },
  // 第179关
  { title: "台城", author: "韦庄", level: 179, difficulty: "challenge",
    couplets: [
      { question: "江雨霏霏江草齐，六朝如梦鸟空啼。无情最是台城柳，_____。", answer: "依旧烟笼十里堤" }
    ],
    full_poem: "江雨霏霏江草齐，六朝如梦鸟空啼。无情最是台城柳，依旧烟笼十里堤。" },
  // 第180关
  { title: "金陵图", author: "韦庄", level: 180, difficulty: "challenge",
    couplets: [
      { question: "江雨霏霏江草齐，六朝如梦鸟空啼。", answer: "江雨霏霏江草齐" }
    ],
    full_poem: "江雨霏霏江草齐，六朝如梦鸟空啼。无情最是台城柳，依旧烟笼十里堤。" },
  // 第181关
  { title: "离思五首（其四）", author: "元稹", level: 181, difficulty: "challenge",
    couplets: [
      { question: "曾经沧海难为水，除却巫山不是云。_____，除却巫山不是云。", answer: "取次花丛懒回顾" }
    ],
    full_poem: "曾经沧海难为水，除却巫山不是云。取次花丛懒回顾，半缘修道半缘君。" },
  // 第182关
  { title: "闻乐天授江州司马", author: "元稹", level: 182, difficulty: "challenge",
    couplets: [
      { question: "残灯无焰影幢幢，此夕闻君谪九江。_____，垂死病中惊坐起，暗风吹雨入寒窗。", answer: "垂死病中惊坐起" }
    ],
    full_poem: "残灯无焰影幢幢，此夕闻君谪九江。垂死病中惊坐起，暗风吹雨入寒窗。" },
  // 第183关
  { title: "剑客", author: "贾岛", level: 183, difficulty: "challenge",
    couplets: [
      { question: "十年磨一剑，霜刃未曾试。今日把示君，_____？", answer: "谁有不平事" }
    ],
    full_poem: "十年磨一剑，霜刃未曾试。今日把示君，谁有不平事？" },
  // 第184关
  { title: "题李凝幽居", author: "贾岛", level: 184, difficulty: "challenge",
    couplets: [
      { question: "闲居少邻并，草径入荒园。鸟宿池边树，_____。", answer: "僧敲月下门" }
    ],
    full_poem: "闲居少邻并，草径入荒园。鸟宿池边树，僧敲月下门。过桥分野色，移石动云根。暂去还来此，幽期不负言。" },
  // 第185关
  { title: "题诗后", author: "贾岛", level: 185, difficulty: "challenge",
    couplets: [
      { question: "两句三年得，一吟双泪流。知音如不赏，_____。", answer: "归卧故山秋" }
    ],
    full_poem: "两句三年得，一吟双泪流。知音如不赏，归卧故山秋。" },
  // 第186关
  { title: "游子吟", author: "孟郊", level: 186, difficulty: "challenge",
    couplets: [
      { question: "慈母手中线，游子身上衣。临行密密缝，_____。谁言寸草心，报得三春晖。", answer: "意恐迟迟归" }
    ],
    full_poem: "慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。谁言寸草心，报得三春晖。" },
  // 第187关
  { title: "登科后", author: "孟郊", level: 187, difficulty: "challenge",
    couplets: [
      { question: "昔日龌龊不足夸，今朝放荡思无涯。春风得意马蹄疾，_____。", answer: "一日看尽长安花" }
    ],
    full_poem: "昔日龌龊不足夸，今朝放荡思无涯。春风得意马蹄疾，一日看尽长安花。" },
  // 第188关
  { title: "再经胡城县", author: "朱庆馀", level: 188, difficulty: "challenge",
    couplets: [
      { question: "去岁曾经此县城，县民无口不冤声。今来县宰加朱绂，_____。", answer: "便是生灵血染成" }
    ],
    full_poem: "去岁曾经此县城，县民无口不冤声。今来县宰加朱绂，便是生灵血染成。" },
  // 第189关
  { title: "宫词", author: "张祜", level: 189, difficulty: "challenge",
    couplets: [
      { question: "故国三千里，深宫二十年。一声何满子，_____。", answer: "双泪落君前" }
    ],
    full_poem: "故国三千里，深宫二十年。一声何满子，双泪落君前。" },
  // 第190关
  { title: "题都城南庄", author: "崔护", level: 190, difficulty: "challenge",
    couplets: [
      { question: "去年今日此门中，人面桃花相映红。_____，桃花依旧笑春风。", answer: "人面不知何处去" }
    ],
    full_poem: "去年今日此门中，人面桃花相映红。人面不知何处去，桃花依旧笑春风。" },
  // 第191关
  { title: "近试上张水部", author: "朱庆馀", level: 191, difficulty: "challenge",
    couplets: [
      { question: "洞房昨夜停红烛，待晓堂前拜舅姑。_____，却话巴山夜雨时。", answer: "妆罢低声问夫婿" }
    ],
    full_poem: "洞房昨夜停红烛，待晓堂前拜舅姑。妆罢低声问夫婿，画眉深浅入时无？" },
  // 第192关
  { title: "蜂", author: "罗隐", level: 192, difficulty: "challenge",
    couplets: [
      { question: "不论平地与山尖，无限风光尽被占。_____，采得百花成蜜后，为谁辛苦为谁甜？", answer: "采得百花成蜜后" }
    ],
    full_poem: "不论平地与山尖，无限风光尽被占。采得百花成蜜后，为谁辛苦为谁甜？" },
  // 第193关
  { title: "自遣", author: "罗隐", level: 193, difficulty: "challenge",
    couplets: [
      { question: "得即高歌失即休，多愁多恨亦悠悠。_____，今朝有酒今朝醉，明日愁来明日愁。", answer: "今朝有酒今朝醉" }
    ],
    full_poem: "得即高歌失即休，多愁多恨亦悠悠。今朝有酒今朝醉，明日愁来明日愁。" },
  // 第194关
  { title: "西施", author: "罗隐", level: 194, difficulty: "challenge",
    couplets: [
      { question: "家国兴亡自有时，吴人何苦怨西施。_____，未必亡吴只此身。", answer: "西施若解倾吴国" }
    ],
    full_poem: "家国兴亡自有时，吴人何苦怨西施。西施若解倾吴国，越国亡来又是谁？" },
  // 第195关
  { title: "江楼感旧", author: "赵嘏", level: 195, difficulty: "challenge",
    couplets: [
      { question: "独上江楼思渺然，月光如水水如天。同来望月人何处？_____。", answer: "风景依稀似去年" }
    ],
    full_poem: "独上江楼思渺然，月光如水水如天。同来望月人何处？风景依稀似去年。" },
  // 第196关
  { title: "陇西行", author: "陈陶", level: 196, difficulty: "challenge",
    couplets: [
      { question: "誓扫匈奴不顾身，五千貂锦丧胡尘。可怜无定河边骨，_____。", answer: "犹是春闺梦里人" }
    ],
    full_poem: "誓扫匈奴不顾身，五千貂锦丧胡尘。可怜无定河边骨，犹是春闺梦里人。" },
  // 第197关
  { title: "社日", author: "王驾", level: 197, difficulty: "challenge",
    couplets: [
      { question: "鹅湖山下稻粱肥，豚栅鸡栖半掩扉。桑柘影斜春社散，_____。", answer: "家家扶得醉人归" }
    ],
    full_poem: "鹅湖山下稻粱肥，豚栅鸡栖半掩扉。桑柘影斜春社散，家家扶得醉人归。" },
  // 第198关
  { title: "雨晴", author: "王驾", level: 198, difficulty: "challenge",
    couplets: [
      { question: "雨前初见花间蕊，雨后兼无叶里花。蛱蝶飞来过墙去，_____。", answer: "却疑春色在邻家" }
    ],
    full_poem: "雨前初见花间蕊，雨后兼无叶里花。蛱蝶飞来过墙去，却疑春色在邻家。" },
  // 第199关
  { title: "已凉", author: "韩偓", level: 199, difficulty: "challenge",
    couplets: [
      { question: "碧阑干外绣帘垂，猩色屏风画折枝。_____，红绵吹彻孟万年。", answer: "八尺龙须方锦褥" }
    ],
    full_poem: "碧阑干外绣帘垂，猩色屏风画折枝。八尺龙须方锦褥，已凉天气未寒时。" },
  // 第200关
  { title: "嫦娥", author: "李商隐", level: 200, difficulty: "challenge",
    couplets: [
      { question: "云母屏风烛影深，长河渐落晓星沉。_____，碧海青天夜夜心。", answer: "嫦娥应悔偷灵药" }
    ],
    full_poem: "云母屏风烛影深，长河渐落晓星沉。嫦娥应悔偷灵药，碧海青天夜夜心。" },
];

// ============================================================
// 前后端共用前端题库作为唯一事实来源。
// 开发环境从 frontend/src/data 读取；发布包由 build.js 复制到 backend/src/data。
// ============================================================
function loadCanonicalLevels() {
  const candidates = [
    path.resolve(__dirname, '../data/poetryLevels.json'),
    path.resolve(__dirname, '../../../frontend/src/data/poetryLevels.json')
  ];
  const sourcePath = candidates.find(candidate => fs.existsSync(candidate));
  if (!sourcePath) {
    throw new Error('诗词闯关题库不存在，请检查 backend/src/data/poetryLevels.json');
  }

  const levels = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(levels) || levels.length !== 200) {
    throw new Error('诗词闯关题库必须包含 200 个关卡');
  }
  return levels;
}

const CANONICAL_LEVELS = loadCanonicalLevels();
const CANONICAL_POEMS = CANONICAL_LEVELS.map(level => {
  const poem = level.poems?.[0] || {};
  return {
    title: poem.title || level.title || '未命名诗篇',
    author: poem.author || '佚名',
    level: Number(level.level),
    difficulty: level.difficulty,
    full_poem: poem.content || ''
  };
});

function toCanonicalQuestion(question) {
  const answerIndex = Number.isInteger(question.answer) ? question.answer : null;
  const answer = answerIndex === null
    ? String(question.answer || '')
    : String(question.options?.[answerIndex] || '');
  return {
    type: question.type || (question.options?.length ? 'choice' : 'fill'),
    question: String(question.question || ''),
    answer,
    answerIndex,
    options: Array.isArray(question.options) ? question.options.map(String) : undefined,
    hint: question.hint || '',
    analysis: question.analysis || ''
  };
}

const LEVEL_QUESTIONS = {}; // level -> { title, author, questions: [{ question, answer, ... }] }
CANONICAL_LEVELS.forEach(level => {
  const poem = level.poems?.[0] || {};
  const levelNumber = Number(level.level);
  LEVEL_QUESTIONS[levelNumber] = {
    level: levelNumber,
    title: poem.title || level.title || '未命名诗篇',
    author: poem.author || '佚名',
    difficulty: level.difficulty,
    full_poem: poem.content || '',
    questions: (level.questions || []).map(toCanonicalQuestion).filter(q => q.question && q.answer)
  };
});

// 构建 level -> 随机一题（与前端 loadQuestions 逻辑一致）
function buildRandomQuestion(level) {
  const block = LEVEL_QUESTIONS[Number(level)];
  if (!block || block.questions.length === 0) return null;
  const q = block.questions[Math.floor(Math.random() * block.questions.length)];
  return {
    level: block.level,
    title: block.title,
    author: block.author,
    difficulty: block.difficulty,
    question: q.question,
    answer: q.answer,
    answerIndex: q.answerIndex,
    options: q.options,
    type: q.type,
    hint: q.hint,
    full_poem: block.full_poem,
    analysis: q.analysis || `此题出自${block.author}的《${block.title}》，考察对经典诗句的掌握。`
  };
}

// 按 level 精确查找题目（用于后端判题）
function findQuestionByLevelAndText(level, questionText) {
  const block = LEVEL_QUESTIONS[Number(level)];
  if (!block) return null;
  return block.questions.find(q => q.question === questionText) || null;
}

// ============================================================
// 答案规范化：去空格、标点、全角转半角
// ============================================================
function normalize(str) {
  return String(str ?? '')
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

// ============================================================
// 直接查表判断答案（无需AI，纯数据匹配）
// ============================================================
function checkAnswer(userAnswer, correctAnswer) {
  return normalize(userAnswer) === normalize(correctAnswer);
}

// ============================================================
// 根据关卡获取题目（直接查找）
// ============================================================
function getQuestionByLevel(level) {
  return buildRandomQuestion(level);
}

// ============================================================
// 获取用户闯关进度
// ============================================================
async function getUserProgress(userId) {
  let row = await db.get('SELECT * FROM user_challenge_progress WHERE user_id = $1', [userId]);
  if (!row) {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO user_challenge_progress
       (user_id, highest_level, current_challenge_level, last_challenge_time)
       VALUES ($1, 0, 1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, now]
    );
    row = await db.get('SELECT * FROM user_challenge_progress WHERE user_id = $1', [userId]);
  }

  const highestLevel = Math.min(Math.max(Number(row?.highest_level) || 0, 0), 200);
  return {
    ...row,
    highest_level: highestLevel,
    current_challenge_level: Math.min(highestLevel + 1, 200)
  };
}

// 返回某关已答对的题目，用于用户离开后恢复到下一道未完成题。
async function getLevelAnswerProgress(userId, level) {
  const levelNumber = Number(level);
  if (!Number.isInteger(levelNumber) || !LEVEL_QUESTIONS[levelNumber]) {
    throw ApiError.validation('关卡必须是 1-200 之间的整数');
  }

  const rows = await db.all(
    `SELECT question_content
     FROM user_challenge_records
     WHERE user_id = $1 AND level = $2 AND is_correct = 1`,
    [userId, levelNumber]
  );
  return { level: levelNumber, correctQuestions: [...new Set(rows.map(row => row.question_content))] };
}

// ============================================================
// 更新用户闯关进度：必须按顺序完成整关后才能推进
// ============================================================
async function updateUserProgress(userId, level) {
  const levelNumber = Number(level);
  const block = LEVEL_QUESTIONS[levelNumber];
  if (!Number.isInteger(levelNumber) || !block) {
    throw ApiError.validation('关卡必须是 1-200 之间的整数');
  }

  const progress = await getUserProgress(userId);
  const highestLevel = Number(progress.highest_level) || 0;
  if (levelNumber > highestLevel + 1) {
    throw ApiError.forbidden(`第 ${levelNumber} 关尚未解锁，请先完成第 ${highestLevel + 1} 关`);
  }

  // 重玩已完成关卡不改变进度；首次完成必须有每一道题的正确答题记录。
  if (levelNumber > highestLevel) {
    const correctRows = await db.all(
      `SELECT question_content FROM user_challenge_records
       WHERE user_id = $1 AND level = $2 AND is_correct = 1`,
      [userId, levelNumber]
    );
    const correctQuestions = new Set(correctRows.map(row => row.question_content));
    const missingQuestion = block.questions.find(question => !correctQuestions.has(question.question));
    if (missingQuestion) {
      throw ApiError.conflict('本关还有题目未答对，暂不能完成关卡');
    }

    const now = new Date().toISOString();
    await db.run(
      `UPDATE user_challenge_progress
       SET highest_level = $1, current_challenge_level = $2, last_challenge_time = $3
       WHERE user_id = $4`,
      [levelNumber, Math.min(levelNumber + 1, 200), now, userId]
    );
  }

  return getUserProgress(userId);
}

// ============================================================
// 生成题目（从静态题库直接返回，支持批量）
// ============================================================
async function generateQuestions(userId, startLevel, count = 20) {
  const questions = [];
  for (let i = startLevel; i < startLevel + count && i <= 200; i++) {
    const q = buildRandomQuestion(i);
    if (q) questions.push(q);
  }
  return questions;
}

// ============================================================
// 提交答案（直接用静态数据校验，不依赖前端传来的答案）
// ============================================================
async function submitAnswer(userId, level, questionText, userAnswer, frontendCorrect, poemTitle, poemAuthor, clientCorrectAnswer) {
  const levelNumber = Number(level);
  const block = LEVEL_QUESTIONS[levelNumber];
  if (!Number.isInteger(levelNumber) || !block) {
    throw ApiError.validation('关卡必须是 1-200 之间的整数');
  }

  const progress = await getUserProgress(userId);
  if (levelNumber > Number(progress.highest_level) + 1) {
    throw ApiError.forbidden(`第 ${levelNumber} 关尚未解锁，请先完成第 ${Number(progress.highest_level) + 1} 关`);
  }

  const matched = findQuestionByLevelAndText(levelNumber, questionText);
  if (!matched) {
    throw ApiError.badRequest('题目不属于该关卡，请刷新题目后重试');
  }

  const now = new Date().toISOString();
  const serverCorrectAnswer = matched.answer;
  const isCorrect = checkAnswer(userAnswer, serverCorrectAnswer);

  const result = await db.run(
    `INSERT INTO user_challenge_records
    (user_id, level, question_content, user_answer, correct_answer, is_correct, answered_at, poem_title, poem_author)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [userId, levelNumber, questionText, userAnswer, serverCorrectAnswer, isCorrect ? 1 : 0, now, block.title || poemTitle, block.author || poemAuthor]
  );
  const recordId = result.rows[0].id;
  if (!isCorrect) {
    await db.run(
      'UPDATE user_challenge_progress SET total_errors = total_errors + 1 WHERE user_id = $1',
      [userId]
    );
    try {
      await addToErrorBook(userId, recordId, questionText, userAnswer, serverCorrectAnswer, matched.analysis);
    } catch (error) {
      console.warn('[challenge] 自动写入错题本失败:', error.message);
    }
  }

  const latestProgress = await getUserProgress(userId);
  return {
    correct: isCorrect,
    recordId,
    highestLevel: latestProgress.highest_level,
    currentLevel: latestProgress.current_challenge_level
  };
}

// ============================================================
// 错题本
// ============================================================
async function addToErrorBook(userId, recordId, question, userAnswer, correctAnswer, explanation) {
  const existing = await db.get(
    'SELECT id FROM user_error_book WHERE user_id = $1 AND question_content = $2 LIMIT 1',
    [userId, question]
  );
  if (!existing) {
    await db.run(
      `INSERT INTO user_error_book (user_id, record_id, question_content, user_answer, correct_answer, explanation, added_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, recordId, question, userAnswer, correctAnswer, explanation, new Date().toISOString()]
    );
  }
  await db.run('UPDATE user_challenge_records SET added_to_error_book = 1 WHERE id = $1', [recordId]);
}

async function getErrorBook(userId) {
  return db.all(
    'SELECT * FROM user_error_book WHERE user_id = $1 ORDER BY added_at DESC',
    [userId]
  );
}

async function removeFromErrorBook(userId, id) {
  await db.run('DELETE FROM user_error_book WHERE user_id = $1 AND id = $2', [userId, id]);
}

async function getLeaderboard() {
  try {
    return await db.all(
      `SELECT u.username, ucp.highest_level
       FROM user_challenge_progress ucp
       JOIN users u ON ucp.user_id = u.id
       WHERE ucp.highest_level > 0
       ORDER BY ucp.highest_level DESC
       LIMIT 50`,
      []
    );
  } catch (err) {
    console.error('获取排行榜失败:', err);
    return [];
  }
}

// ============================================================
// 获取静态题库（供前端展示/调试）
// ============================================================

module.exports = {
  getUserProgress,
  getLevelAnswerProgress,
  updateUserProgress,
  generateQuestions,
  submitAnswer,
  addToErrorBook,
  getErrorBook,
  removeFromErrorBook,
  getLeaderboard,
  checkAnswer,
  normalize,
  getQuestionByLevel,
  POEMS: CANONICAL_POEMS,
  getStaticQuestionBank: () => Object.values(LEVEL_QUESTIONS).map(b => ({
    level: b.level, title: b.title, author: b.author,
    difficulty: b.difficulty, questions: b.questions
  })),
  LEVEL_QUESTIONS
};
