/**
 * 为 Studentdemo 账号填充演示数据（2026年4月版）
 * node backend/src/utils/createDemoAccount.js
 */
const db = require('./db');
const bcrypt = require('bcrypt');

const ALL_POEMS = [
  /* 唐 */
  { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', tags: '思乡,月亮' },
  { title: '春晓', author: '孟浩然', dynasty: '唐', content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', tags: '春天,自然' },
  { title: '望庐山瀑布', author: '李白', dynasty: '唐', content: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。', tags: '山水,壮观' },
  { title: '黄鹤楼送孟浩然之广陵', author: '李白', dynasty: '唐', content: '故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。', tags: '送别,友情' },
  { title: '江雪', author: '柳宗元', dynasty: '唐', content: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。', tags: '山水,孤独' },
  { title: '望岳', author: '杜甫', dynasty: '唐', content: '岱宗夫如何？齐鲁青未了。造化钟神秀，阴阳割昏晓。荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。', tags: '山水,励志' },
  { title: '春望', author: '杜甫', dynasty: '唐', content: '国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。', tags: '爱国,忧伤' },
  { title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', tags: '山水,励志' },
  { title: '清明', author: '杜牧', dynasty: '唐', content: '清明时节雨纷纷，路上行人欲断魂。借问酒家何处有？牧童遥指杏花村。', tags: '清明,思乡' },
  { title: '山行', author: '杜牧', dynasty: '唐', content: '远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。', tags: '山水,秋天' },
  { title: '泊秦淮', author: '杜牧', dynasty: '唐', content: '烟笼寒水月笼沙，夜泊秦淮近酒家。商女不知亡国恨，隔江犹唱后庭花。', tags: '爱国,忧伤' },
  { title: '夜雨寄北', author: '李商隐', dynasty: '唐', content: '君问归期未有期，巴山夜雨涨秋池。何当共剪西窗烛，却话巴山夜雨时。', tags: '思乡,爱情' },
  { title: '送元二使安西', author: '王维', dynasty: '唐', content: '渭城朝雨浥轻尘，客舍青青柳色新。劝君更尽一杯酒，西出阳关无故人。', tags: '送别,友情' },
  { title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐', content: '独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。', tags: '思乡,亲情' },
  { title: '山居秋暝', author: '王维', dynasty: '唐', content: '空山新雨后，天气晚来秋。明月松间照，清泉石上流。竹喧归浣女，莲动下渔舟。随意春芳歇，王孙自可留。', tags: '山水,秋天' },
  { title: '鹿柴', author: '王维', dynasty: '唐', content: '空山不见人，但闻人语响。返景入深林，复照青苔上。', tags: '山水,幽静' },
  { title: '相思', author: '王维', dynasty: '唐', content: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。', tags: '爱情,相思' },
  { title: '望天门山', author: '李白', dynasty: '唐', content: '天门中断楚江开，碧水东流至此回。两岸青山相对出，孤帆一片日边来。', tags: '山水,壮观' },
  { title: '早发白帝城', author: '李白', dynasty: '唐', content: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。', tags: '山水,轻快' },
  { title: '独坐敬亭山', author: '李白', dynasty: '唐', content: '众鸟高飞尽，孤云独去闲。相看两不厌，只有敬亭山。', tags: '山水,孤独' },
  { title: '别董大', author: '高适', dynasty: '唐', content: '千里黄云白日曛，北风吹雁雪纷纷。莫愁前路无知己，天下谁人不识君？', tags: '送别,友情' },
  { title: '望洞庭', author: '刘禹锡', dynasty: '唐', content: '湖光秋月两相和，潭面无风镜未磨。遥望洞庭山水翠，白银盘里一青螺。', tags: '山水,秋天' },
  { title: '乌衣巷', author: '刘禹锡', dynasty: '唐', content: '朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。', tags: '怀旧,感慨' },
  { title: '芙蓉楼送辛渐', author: '王昌龄', dynasty: '唐', content: '寒雨连江夜入吴，平明送客楚山孤。洛阳亲友如相问，一片冰心在玉壶。', tags: '送别,友情' },
  /* 宋 */
  { title: '水调歌头', author: '苏轼', dynasty: '宋', content: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年？我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间？转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。', tags: '中秋,思亲' },
  { title: '念奴娇赤壁怀古', author: '苏轼', dynasty: '宋', content: '大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。乱石穿空，惊涛拍岸，卷起千堆雪。江山如画，一时多少豪杰。遥想公瑾当年，小乔初嫁了，雄姿英发。羽扇纶巾，谈笑间，樯橹灰飞烟灭。故国神游，多情应笑我，早生华发。人生如梦，一尊还酹江月。', tags: '怀古,豪放' },
  { title: '声声慢', author: '李清照', dynasty: '宋', content: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。三杯两盏淡酒，怎敌他晚来风急！雁过也，正伤心，却是旧时相识。满地黄花堆积，憔悴损，如今有谁堪摘？守着窗儿，独自怎生得黑！梧桐更兼细雨，到黄昏点点滴滴。这次第，怎一个愁字了得！', tags: '闺怨,忧伤' },
  { title: '如梦令', author: '李清照', dynasty: '宋', content: '常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。争渡，争渡，惊起一滩鸥鹭。', tags: '婉约,回忆' },
  { title: '满江红', author: '岳飞', dynasty: '宋', content: '怒发冲冠，凭栏处潇潇雨歇。抬望眼仰天长啸，壮怀激烈。三十功名尘与土，八千里路云和月。莫等闲白了少年头，空悲切！靖康耻，犹未雪。臣子恨，何时灭？驾长车，踏破贺兰山缺。壮志饥餐胡虏肉，笑谈渴饮匈奴血。待从头收拾旧山河，朝天阙。', tags: '爱国,壮志' },
  { title: '西江月夜行黄沙道中', author: '辛弃疾', dynasty: '宋', content: '明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。七八个星天外，两三点雨山前。旧时茅店社林边，路转溪桥忽见。', tags: '田园,夏夜' },
  { title: '青玉案元夕', author: '辛弃疾', dynasty: '宋', content: '东风夜放花千树，更吹落星如雨。宝马雕车香满路。凤箫声动，玉壶光转，一夜鱼龙舞。蛾儿雪柳黄金缕，笑语盈盈暗香去。众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。', tags: '元宵,爱情' },
  { title: '游山西村', author: '陆游', dynasty: '宋', content: '莫笑农家腊酒浑，丰年留客足鸡豚。山重水复疑无路，柳暗花明又一村。箫鼓追随春社近，衣冠简朴古风存。从今若许闲乘月，拄杖无时夜叩门。', tags: '田园,哲理' },
  { title: '题西林壁', author: '苏轼', dynasty: '宋', content: '横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。', tags: '哲理,山水' },
  { title: '观书有感', author: '朱熹', dynasty: '宋', content: '半亩方塘一鉴开，天光云影共徘徊。问渠那得清如许？为有源头活水来。', tags: '哲理,读书' },
  /* 清 */
  { title: '己亥杂诗', author: '龚自珍', dynasty: '清', content: '九州生气恃风雷，万马齐喑究可哀。我劝天公重抖擞，不拘一格降人才。', tags: '爱国,改革' },
  { title: '苔', author: '袁枚', dynasty: '清', content: '白日不到处，青春恰自来。苔花如米小，也学牡丹开。', tags: '励志,自然' },
  { title: '村居', author: '高鼎', dynasty: '清', content: '草长莺飞二月天，拂堤杨柳醉春烟。儿童散学归来早，忙趁东风放纸鸢。', tags: '田园,儿童' },
  { title: '所见', author: '袁枚', dynasty: '清', content: '牧童骑黄牛，歌声振林樾。意欲捕鸣蝉，忽然闭口立。', tags: '田园,儿童' },
  { title: '竹石', author: '郑燮', dynasty: '清', content: '咬定青山不放松，立根原在破岩中。千磨万击还坚劲，任尔东西南北风。', tags: '励志,品格' },
  /* 近代 */
  { title: '沁园春雪', author: '毛泽东', dynasty: '近代', content: '北国风光，千里冰封，万里雪飘。望长城内外，惟余莽莽；大河上下，顿失滔滔。山舞银蛇，原驰蜡象，欲与天公试比高。须晴日，看红装素裹，分外妖娆。江山如此多娇，引无数英雄竞折腰。惜秦皇汉武，略输文采；唐宗宋祖，稍逊风骚。一代天骄，成吉思汗，只识弯弓射大雕。俱往矣，数风流人物，还看今朝。', tags: '咏雪,壮志' },
  { title: '七律长征', author: '毛泽东', dynasty: '近代', content: '红军不怕远征难，万水千山只等闲。五岭逶迤腾细浪，乌蒙磅礴走泥丸。金沙水拍云崖暖，大渡桥横铁索寒。更喜岷山千里雪，三军过后尽开颜。', tags: '长征,壮志' },
  { title: '采桑子重阳', author: '毛泽东', dynasty: '近代', content: '人生易老天难老，岁岁重阳。今又重阳，战地黄花分外香。一年一度秋风劲，不似春光。胜似春光，廖廓江天万里霜。', tags: '重阳,秋光' },
];

const QUESTIONS = [
  { q: '床前明月光，疑是地上霜。举头望明月，______。', a: '低头思故乡', title: '静夜思', author: '李白' },
  { q: '春眠不觉晓，______闻啼鸟。', a: '处处', title: '春晓', author: '孟浩然' },
  { q: '飞流直下三千尺，疑是______落九天。', a: '银河', title: '望庐山瀑布', author: '李白' },
  { q: '孤帆远影碧空尽，唯见______天际流。', a: '长江', title: '黄鹤楼送孟浩然之广陵', author: '李白' },
  { q: '千山鸟飞绝，______人踪灭。', a: '万径', title: '江雪', author: '柳宗元' },
  { q: '会当凌绝顶，______众山小。', a: '一览', title: '望岳', author: '杜甫' },
  { q: '国破山河在，城春______。', a: '草木深', title: '春望', author: '杜甫' },
  { q: '欲穷千里目，______。', a: '更上一层楼', title: '登鹳雀楼', author: '王之涣' },
  { q: '清明时节雨纷纷，路上行人______。', a: '欲断魂', title: '清明', author: '杜牧' },
  { q: '停车坐爱枫林晚，霜叶______二月花。', a: '红于', title: '山行', author: '杜牧' },
  { q: '商女不知亡国恨，______犹唱后庭花。', a: '隔江', title: '泊秦淮', author: '杜牧' },
  { q: '劝君更尽一杯酒，西出阳关______。', a: '无故人', title: '送元二使安西', author: '王维' },
  { q: '独在异乡为异客，每逢佳节______。', a: '倍思亲', title: '九月九日忆山东兄弟', author: '王维' },
  { q: '红豆生南国，春来发______。', a: '几枝', title: '相思', author: '王维' },
  { q: '两岸青山相对出，______日边来。', a: '孤帆一片', title: '望天门山', author: '李白' },
  { q: '两岸猿声啼不住，______已过万重山。', a: '轻舟', title: '早发白帝城', author: '李白' },
  { q: '莫笑农家腊酒浑，______。', a: '丰年留客足鸡豚', title: '游山西村', author: '陆游' },
  { q: '山重水复疑无路，______。', a: '柳暗花明又一村', title: '游山西村', author: '陆游' },
  { q: '明月几时有？把酒问青天。______，今夕是何年？', a: '不知天上宫阙', title: '水调歌头', author: '苏轼' },
  { q: '大江东去，浪淘尽，______。', a: '千古风流人物', title: '念奴娇赤壁怀古', author: '苏轼' },
  { q: '寻寻觅觅，冷冷清清，______。', a: '凄凄惨惨戚戚', title: '声声慢', author: '李清照' },
  { q: '怒发冲冠，凭栏处______。', a: '潇潇雨歇', title: '满江红', author: '岳飞' },
  { q: '北国风光，千里冰封，______。', a: '万里雪飘', title: '沁园春雪', author: '毛泽东' },
  { q: '红军不怕远征难，______。', a: '万水千山只等闲', title: '七律长征', author: '毛泽东' },
  { q: '九州生气恃风雷，______。', a: '万马齐喑究可哀', title: '己亥杂诗', author: '龚自珍' },
  { q: '白日不到处，______。', a: '青春恰自来', title: '苔', author: '袁枚' },
  { q: '咬定青山不放松，______。', a: '立根原在破岩中', title: '竹石', author: '郑燮' },
  { q: '半亩方塘一鉴开，______。', a: '天光云影共徘徊', title: '观书有感', author: '朱熹' },
  { q: '问渠那得清如许？______。', a: '为有源头活水来', title: '观书有感', author: '朱熹' },
];

const CREATIONS = [
  { title: '春日偶成', genre: '七言绝句', theme: '春日', content: '春风拂柳绿丝长，桃花映日斗芬芳。\n燕子归来寻旧垒，碧水青山入梦乡。', score: 86, rh: 84, em: 88, sug: '押韵工稳，意境清朗；第二联对仗可再精炼。' },
  { title: '秋夜书怀', genre: '五言律诗', theme: '秋思', content: '西风卷落叶，夜雨打窗声。孤灯照古卷，明月照归程。\n鸿雁南飞去，秋虫不住鸣。何时归故里，共赏菊花清。', score: 91, rh: 90, em: 92, sug: '情感真挚，对仗工整，"孤灯"句尤为出彩。建议精简颈联。' },
  { title: '山水情韵', genre: '五言绝句', theme: '山水', content: '青山看不厌，流水去无还。\n林深不知处，云深锁碧山。', score: 79, rh: 78, em: 80, sug: '意境悠远，平仄稍有瑕疵，建议调整第三句平仄。' },
  { title: '送别吟', genre: '七言绝句', theme: '送别', content: '长亭古道柳依依，落日余晖映酒旗。\n此去经年山水远，故人何日是归期。', score: 88, rh: 87, em: 90, sug: '情景交融，柳意象用得贴切；末句情感稍弱，可深化。' },
  { title: '端午怀古', genre: '七言律诗', theme: '怀古', content: '五月端阳艾草香，龙舟竞渡汨罗江。\n三闾忠魂千载在，楚辞风骨万年长。\n粽香飘入寻常巷，屈子精神永不忘。', score: 84, rh: 82, em: 86, sug: '主题明确，押韵较好；第三联"不忘"与前文稍显直白，可含蓄些。' },
  { title: '夏日闲情', genre: '五言绝句', theme: '田园', content: '蝉鸣夏日长，荷风送清香。\n小儿溪边戏，垂柳拂池塘。', score: 82, rh: 80, em: 83, sug: '画面生动，清新自然；"小儿"二字口语化，可改为"童稚"。' },
  { title: '月下独酌', genre: '七言绝句', theme: '抒情', content: '举杯邀月月无眠，清风徐来拂琴弦。\n独酌花间诗百首，不知今夕是何年。', score: 93, rh: 92, em: 95, sug: '意境空灵浪漫，化用李白诗意浑然天成，达到优秀水平！' },
  { title: '咏竹', genre: '五言绝句', theme: '咏物', content: '竹节生来直，狂风不折腰。\n虚心成大器，何必艳桃夭。', score: 77, rh: 76, em: 78, sug: '托物言志清晰，但"艳桃夭"典故出处不明，建议替换。' },
];

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

const WRONG_POOL = ['春风得意','明月几时有','独在异乡','夜泊秦淮','千里之外','万水千山','不知归路','春眠不觉','更上一层楼','长江依旧'];
function wrong(c) {
  const f = WRONG_POOL.filter(w => w !== c);
  return f.length ? rand(f) : '错误答案';
}

function recentTime(maxDays) {
  const w = maxDays <= 2 ? 4 : maxDays <= 5 ? 2 : 1;
  let pick = 0;
  for (let i = 0; i < w; i++) pick = ri(0, maxDays);
  const d = new Date();
  d.setDate(d.getDate() - pick);
  d.setHours(ri(8, 21), ri(0, 59), ri(0, 59));
  return d.toISOString();
}

async function main() {
  const client = await db.pool.connect();
  try {
    console.log('开始为 Studentdemo 填充高质量演示数据...\n');
    await client.query('BEGIN');
    const pwdHash = await bcrypt.hash('123456', 10);
    const now = new Date();

    await client.query('INSERT INTO classes (id,class_name) VALUES ($1,$2) ON CONFLICT DO NOTHING', [1,'一年级一班']);
    console.log('+ 班级 OK');

    const { rows: [existing] } = await client.query('SELECT id FROM users WHERE username=$1', ['Studentdemo']);
    let uid;
    if (existing) {
      uid = existing.id;
      await client.query('UPDATE users SET email=$1,password_hash=$2,class_id=$3,updated_at=$4 WHERE id=$5', ['s@s.com',pwdHash,1,now.toISOString(),uid]);
      console.log('+ 账号 Studentdemo (ID:' + uid + ') 已存在，已清空旧数据');
      for (const t of ['learning_records','collections','wrong_questions','user_challenge_progress','user_challenge_records','user_error_book','daily_checkin','activity_logs','user_creations','feihua_battles','feihua_high_records','ability_assessments','learning_paths','review_schedules','poetry_challenges'])
        await client.query('DELETE FROM ' + t + ' WHERE user_id=$1', [uid]);
    } else {
      const result = await client.query('INSERT INTO users (username,email,password_hash,class_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', ['Studentdemo','s@s.com',pwdHash,1,now.toISOString(),now.toISOString()]);
      uid = result.rows[0].id;
      console.log('+ 新建 Studentdemo (ID:' + uid + ')');
    }

    /* 插入多朝代诗词（逐条查重） */
    let added = 0;
    for (const p of ALL_POEMS) {
      const { rows: [ex] } = await client.query('SELECT id FROM poems WHERE title=$1 AND dynasty=$2', [p.title, p.dynasty]);
      if (!ex) { await client.query('INSERT INTO poems (title,author,dynasty,content,tags) VALUES ($1,$2,$3,$4,$5)', [p.title,p.author,p.dynasty,p.content,p.tags]); added++; }
    }
    console.log('+ 诗词数据: 新增' + added + '首 (部分已存在则跳过)');

    /* 按朝代选取学习诗词 */
    const { rows: allP } = await client.query('SELECT id,title,dynasty,author FROM poems');
    const tang   = allP.filter(p=>p.dynasty==='唐').slice(0,6);
    const song   = allP.filter(p=>p.dynasty==='宋').slice(0,5);
    const qing   = allP.filter(p=>p.dynasty==='清').slice(0,3);
    const modern = allP.filter(p=>p.dynasty==='近代').slice(0,2);
    const learnP = [...tang,...song,...qing,...modern];
    console.log('+ 朝代分布: 唐' + tang.length + ' 宋' + song.length + ' 清' + qing.length + ' 近代' + modern.length);

    /* 学习记录 */
    for (const p of learnP) {
      await client.query(
        'INSERT INTO learning_records (user_id,poem_id,view_count,ai_explain_count,recite_attempts,best_score,total_score,study_time,last_view_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [uid,p.id,ri(4,18),ri(0,6),ri(2,10),ri(65,100),ri(65,100)*ri(2,10),ri(150,900),recentTime(ri(0,8))]);
    }
    console.log('+ 学习记录 ' + learnP.length + ' 首');

    /* 收藏 */
    for (const p of learnP.slice(0,10))
      await client.query('INSERT INTO collections (user_id,poem_id,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [uid,p.id,recentTime(ri(1,10))]);
    console.log('+ 收藏 10 首');

    /* 闯关进度 */
    const topLvl = ri(60,110);
    await client.query('INSERT INTO user_challenge_progress (user_id,highest_level,current_challenge_level,last_challenge_time,total_ai_help_used,total_errors) VALUES ($1,$2,$3,$4,$5,$6)', [uid,topLvl,Math.min(topLvl+1,200),recentTime(ri(0,3)),ri(5,25),ri(8,40)]);
    console.log('+ 闯关进度 最高' + topLvl);

    /* 答题记录 */
    for (let i=0;i<ri(100,160);i++) {
      const x=rand(QUESTIONS);
      const ok=Math.random()>0.32;
      await client.query('INSERT INTO user_challenge_records (user_id,level, question_content, user_answer, correct_answer, is_correct, used_ai_help, answered_at, poem_title, poem_author) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [uid,ri(1,topLvl),x.q,ok?x.a:wrong(x.a),x.a,ok?1:0,Math.random()>0.7?1:0,recentTime(ri(0,9)),x.title,x.author]);
    }
    console.log('+ 答题记录 ~' + (ri(100,160)) + ' 条');

    /* 错题本 */
    const wp=QUESTIONS.slice(5);
    for (let i=0;i<10;i++) {
      const x=wp[i%wp.length];
      await client.query('INSERT INTO wrong_questions (user_id,question,answer,user_answer,level,full_poem,author,title,wrong_count,last_wrong_time,mastered) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [uid.toString(),x.q,x.a,wrong(x.a),ri(10,topLvl),'(全诗略)',x.author,x.title,ri(1,5),recentTime(ri(0,8)),i<4?1:0]);
    }
    console.log('+ 错题 10 条');

    /* 每日打卡 3月28~4月3日 */
    const start=new Date('2026-03-28');
    const end=new Date('2026-04-03');
    for (let d=new Date(start);d<=end;d.setDate(d.getDate()+1)) {
      const ds=d.toISOString().split('T')[0];
      const dt=new Date(d); dt.setHours(ri(8,20),ri(0,59),ri(0,59));
      await client.query('INSERT INTO daily_checkin (user_id,date,checked_in_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[uid,ds,dt.toISOString()]);
    }
    console.log('+ 每日打卡 7 天 (3月28-4月3日)');

    /* 活动日志 */
    const acts=['view','recite','challenge','feihua','ai_explain','checkin','creation','wrong_review'];
    for (let i=0;i<60;i++)
      await client.query('INSERT INTO activity_logs (user_id,activity_type,duration_seconds,created_at) VALUES ($1,$2,$3,$4)',[uid,rand(acts),ri(30,900),recentTime(ri(0,9))]);
    console.log('+ 活动日志 60 条');

    /* 诗词创作 */
    for (const c of CREATIONS) {
      const refAuth=rand(['李白','杜甫','苏轼','王维']);
      await client.query(
        'INSERT INTO user_creations (user_id,title,content,genre,theme,creation_mode,ai_reference,score_data,modification_suggestions,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [uid,c.title,c.content,c.genre,c.theme,'ai_assisted','参考了'+refAuth+'的风格',
         JSON.stringify({content:c.score,rhythm:c.rh,emotion:c.em}),c.sug,
         recentTime(ri(1,15)),recentTime(ri(1,15))]);
    }
    console.log('+ 诗词创作 ' + CREATIONS.length + ' 首');

    /* creation_stats */
    const { rows: crows } = await client.query('SELECT score_data FROM user_creations WHERE user_id=$1',[uid]);
    const scScores=crows.map(r=>{try{const d=JSON.parse(r.score_data);return d&&d.content;}catch{return null;}});
    const sc=scScores.filter(s=>s!=null&&s>0);
    const total=sc.length;
    const avgSc=total?Math.round(sc.reduce((a,b)=>a+b,0)/total):0;
    const hiSc=total?Math.round(sc.reduce((a,b)=>a>b?a:b)):0;
    const qual=sc.filter(s=>s>=60).length;
    await client.query('INSERT INTO creation_stats (user_id,total_creations,qualified_works,average_score,highest_score,last_creation_time) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET total_creations=$2,qualified_works=$3,average_score=$4,highest_score=$5,last_creation_time=$6',[uid,total,qual,avgSc,hiSc,now.toISOString()]);
    console.log('+ creation_stats: 总'+total+'篇 均分'+avgSc+' 最高'+hiSc);

    /* 能力评估 */
    const { rows: lrRows } = await client.query('SELECT lr.*,p.dynasty FROM learning_records lr JOIN poems p ON lr.poem_id=p.id WHERE lr.user_id=$1',[uid]);
    const recited=lrRows.filter(r=>r.recite_attempts>0);
    const mem=recited.length?Math.round(recited.reduce((s,r)=>s+r.best_score,0)/recited.length):60;
    const under=Math.min(100,Math.round(mem*0.88+ri(-5,8)));
    const app=Math.min(100,Math.round(100-(lrRows.filter(r=>r.best_score<80).length/Math.max(lrRows.length,1))*40));
    await client.query('INSERT INTO ability_assessments (user_id,memory_score,understanding_score,application_score,creativity_score,last_updated) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET memory_score=$2,understanding_score=$3,application_score=$4,creativity_score=$5,last_updated=$6',[uid,mem,under,app,Math.min(100,avgSc||60),now.toISOString()]);
    console.log('+ 能力评估: 记忆'+mem+' 理解'+under+' 应用'+app+' 创作'+Math.min(100,avgSc||60));

    /* 学习路径 */
    await client.query('INSERT INTO learning_paths (user_id,level,recommendations,current_focus,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET level=$2,recommendations=$3,current_focus=$4,updated_at=$6',[uid,'中级',JSON.stringify(['深化宋词鉴赏','加强背诵流利度','拓展近代诗词视野','提升创作评分']),'七言律诗与豪放词',now.toISOString(),now.toISOString()]);
    console.log('+ 学习路径');

    /* 飞花令对战 */
    const { rows: oppIdRows } = await client.query('SELECT id FROM users WHERE id!=$1 LIMIT 10', [uid]);
    const oppIds = oppIdRows.map(r => r.id);
    const kw=['月','花','春','风','山','水','云','雨','雪','柳','鸟','江','夜','秋','日'];
    for (let i=0;i<20;i++) {
      if (!oppIds.length) break;
      const opp=rand(oppIds);
      const win=Math.random()>0.42;
      const rnd=ri(5,22);
      const st=recentTime(ri(0,8));
      await client.query('INSERT INTO feihua_battles (player1_id,player2_id,keyword,winner_id,loser_id,total_rounds,player1_throw_count,player2_throw_count,started_at,ended_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid,opp,rand(kw),win?uid:opp,win?opp:uid,rnd,ri(2,rnd),ri(2,rnd),st,new Date(new Date(st).getTime()+ri(60000,600000)).toISOString()]);
    }
    console.log('+ 飞花令对战 20 场');

    /* 飞花令最高记录 */
    for (const k of ['月','花','春','风','山','水']) {
      const mr=ri(10,28),tb=ri(8,25);
      await client.query('INSERT INTO feihua_high_records (user_id,keyword,max_rounds,total_battles,wins,losses,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,keyword) DO UPDATE SET max_rounds=$3,total_battles=$4,wins=$5,losses=$6,updated_at=$7',[uid,k,mr,tb,ri(3,tb),tb-ri(3,tb),now.toISOString()]);
    }
    console.log('+ 飞花令最高记录 6 关键字');

    /* 闯关对战 */
    for (let i=0;i<15;i++) {
      if (!oppIds.length) break;
      const opp=rand(oppIds);
      const win=Math.random()>0.4;
      const tot=ri(5,10);
      const st=recentTime(ri(0,8));
      await client.query('INSERT INTO challenge_battles (player1_id,player2_id,winner_id,loser_id,total_questions,player1_correct,player2_correct,total_rounds,started_at,ended_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[uid,opp,win?uid:opp,win?opp:uid,tot,win?ri(4,tot):ri(1,tot-1),win?ri(1,tot-1):ri(4,tot),tot,st,new Date(new Date(st).getTime()+ri(120000,300000)).toISOString()]);
    }
    console.log('+ 闯关对战 15 场');

    /* 诗词创作挑战 */
    const themes=['春天','送别','山水','思乡','咏物'];
    for (let i=0;i<3;i++) {
      const kw2=themes[i]==='春天'?'花':themes[i]==='送别'?'柳':null;
      await client.query('INSERT INTO poetry_challenges (user_id,theme,keyword,generated_poem,user_score,ai_score,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[uid,themes[i],kw2,'清风拂面柳丝长，明月照我还家乡。\n春光无限人陶醉，不知今夕在何方。',ri(72,92),ri(82,96),'completed',recentTime(ri(3,12))]);
    }
    console.log('+ 诗词创作挑战 3 次');

    await client.query('COMMIT');
    console.log('\n========================================');
    console.log('  Studentdemo 演示数据填充完成！');
    console.log('  账号: Studentdemo  密码: 123456');
    console.log('========================================');
    console.log('  学习诗词: ' + learnP.length + '首 (唐'+tang.length+'/宋'+song.length+'/清'+qing.length+'/近代'+modern.length+')');
    console.log('  闯关最高: ' + topLvl + ' 关');
    console.log('  每日打卡: 7天（3月28-4月3日）');
    console.log('  诗词创作: ' + CREATIONS.length + '首 (均分' + avgSc + ' 最高' + hiSc + ')');
    console.log('  能力评估: 记忆/理解/应用/创作 四维');
    console.log('========================================');
  } catch(err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
