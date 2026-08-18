/**
 * 飞花令诗词数据库
 * 每个关键字对应含有该字的经典诗句
 * 数据格式: { poem: 诗句, author: 作者, dynasty: 朝代, title: 诗题 }
 */

export const feihuaPoems = {
  '春': [
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
    { poem: '春城无处不飞花，寒食东风御柳斜', author: '韩翃', dynasty: '唐', title: '寒食' },
    { poem: '春潮带雨晚来急，野渡无人舟自横', author: '韦应物', dynasty: '唐', title: '滁州西涧' },
    { poem: '春蚕到死丝方尽，蜡炬成灰泪始干', author: '李商隐', dynasty: '唐', title: '无题' },
    { poem: '春风得意马蹄疾，一日看尽长安花', author: '孟郊', dynasty: '唐', title: '登科后' },
    { poem: '春色满园关不住，一枝红杏出墙来', author: '叶绍翁', dynasty: '宋', title: '游园不值' },
    { poem: '草长莺飞二月天，拂堤杨柳醉春烟', author: '高鼎', dynasty: '清', title: '村居' },
    { poem: '日出江花红胜火，春来江水绿如蓝', author: '白居易', dynasty: '唐', title: '忆江南' },
    { poem: '几处早莺争暖树，谁家新燕啄春泥', author: '白居易', dynasty: '唐', title: '钱塘湖春行' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '等闲识得东风面，万紫千红总是春', author: '朱熹', dynasty: '宋', title: '春日' },
    { poem: '羌笛何须怨杨柳，春风不度玉门关', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '爆竹声中一岁除，春风送暖入屠苏', author: '王安石', dynasty: '宋', title: '元日' },
    { poem: '野火烧不尽，春风吹又生', author: '白居易', dynasty: '唐', title: '赋得古原草送别' },
    { poem: '迟日江山丽，春风花草香', author: '杜甫', dynasty: '唐', title: '绝句' },
    { poem: '月出惊山鸟，时鸣春涧中', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '人闲桂花落，夜静春山空', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '今夜偏知春气暖，虫声新透绿窗纱', author: '刘方平', dynasty: '唐', title: '月夜' },
  ],

  '月': [
    { poem: '床前明月光，疑是地上霜', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '举头望明月，低头思故乡', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '海上生明月，天涯共此时', author: '张九龄', dynasty: '唐', title: '望月怀远' },
    { poem: '明月几时有，把酒问青天', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '人有悲欢离合，月有阴晴圆缺', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '但愿人长久，千里共婵娟', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '江畔何人初见月，江月何年初照人', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '人生代代无穷已，江月年年望相似', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '明月松间照，清泉石上流', author: '王维', dynasty: '唐', title: '山居秋暝' },
    { poem: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', dynasty: '唐', title: '枫桥夜泊' },
    { poem: '露从今夜白，月是故乡明', author: '杜甫', dynasty: '唐', title: '月夜忆舍弟' },
    { poem: '举杯邀明月，对影成三人', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '月下飞天镜，云生结海楼', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '明月出天山，苍茫云海间', author: '李白', dynasty: '唐', title: '关山月' },
    { poem: '秦时明月汉时关，万里长征人未还', author: '王昌龄', dynasty: '唐', title: '出塞' },
    { poem: '今夜月明人尽望，不知秋思落谁家', author: '王建', dynasty: '唐', title: '十五夜望月' },
    { poem: '人有悲欢离合，月有阴晴圆缺', author: '苏轼', dynasty: '唐', title: '水调歌头' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
    { poem: '近水楼台先得月，向阳花木易为春', author: '苏麟', dynasty: '宋', title: '断句' },
    { poem: '鸟宿池边树，僧敲月下门', author: '贾岛', dynasty: '唐', title: '题李凝幽居' },
    { poem: '二十四桥明月夜，玉人何处教吹箫', author: '杜牧', dynasty: '唐', title: '寄扬州韩绑判官' },
  ],

  '花': [
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '夜来风雨声，花落知多少', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '花间一壶酒，独酌无相亲', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '桃花潭水深千尺，不及汪伦送我情', author: '李白', dynasty: '唐', title: '赠汪伦' },
    { poem: '人间四月芳菲尽，山寺桃花始盛开', author: '白居易', dynasty: '唐', title: '大林寺桃花' },
    { poem: '借问酒家何处有，牧童遥指杏花村', author: '杜牧', dynasty: '唐', title: '清明' },
    { poem: '迟日江山丽，春风花草香', author: '杜甫', dynasty: '唐', title: '绝句' },
    { poem: '黄四娘家花满蹊，千朵万朵压枝低', author: '杜甫', dynasty: '唐', title: '江畔独步寻花' },
    { poem: '晓看红湿处，花重锦官城', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '无可奈何花落去，似曾相识燕归来', author: '晏殊', dynasty: '宋', title: '浣溪沙' },
    { poem: '落红不是无情物，化作春泥更护花', author: '龚自珍', dynasty: '清', title: '己亥杂诗' },
    { poem: '西塞山前白鹭飞，桃花流水鳜鱼肥', author: '张志和', dynasty: '唐', title: '渔歌子' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '待到重阳日，还来就菊花', author: '孟浩然', dynasty: '唐', title: '过故人庄' },
    { poem: '不是花中偏爱菊，此花开尽更无花', author: '元稹', dynasty: '唐', title: '菊花' },
    { poem: '儿童急走追黄蝶，飞入菜花无处寻', author: '杨万里', dynasty: '宋', title: '宿新市徐公店' },
    { poem: '接天莲叶无穷碧，映日荷花别样红', author: '杨万里', dynasty: '宋', title: '晓出净慈寺送林子方' },
    { poem: '日出江花红胜火，春来江水绿如蓝', author: '白居易', dynasty: '唐', title: '忆江南' },
    { poem: '人闲桂花落，夜静春山空', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '忽如一夜春风来，千树万树梨花开', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '停车坐爱枫林晚，霜叶红于二月花', author: '杜牧', dynasty: '唐', title: '山行' },
  ],

  '山': [
    { poem: '白日依山尽，黄河入海流', author: '王之涣', dynasty: '唐', title: '登鹳雀楼' },
    { poem: '欲穷千里目，更上一层楼', author: '王之涣', dynasty: '唐', title: '登鹳雀楼' },
    { poem: '会当凌绝顶，一览众山小', author: '杜甫', dynasty: '唐', title: '望岳' },
    { poem: '不识庐山真面目，只缘身在此山中', author: '苏轼', dynasty: '宋', title: '题西林壁' },
    { poem: '横看成岭侧成峰，远近高低各不同', author: '苏轼', dynasty: '宋', title: '题西林壁' },
    { poem: '山重水复疑无路，柳暗花明又一村', author: '陆游', dynasty: '宋', title: '游山西村' },
    { poem: '青山遮不住，毕竟东流去', author: '辛弃疾', dynasty: '宋', title: '菩萨蛮·书江西造口壁' },
    { poem: '千山鸟飞绝，万径人踪灭', author: '柳宗元', dynasty: '唐', title: '江雪' },
    { poem: '空山新雨后，天气晚来秋', author: '王维', dynasty: '唐', title: '山居秋暝' },
    { poem: '明月松间照，清泉石上流', author: '王维', dynasty: '唐', title: '山居秋暝' },
    { poem: '山不在高，有仙则名', author: '刘禹锡', dynasty: '唐', title: '陋室铭' },
    { poem: '人间四月芳菲尽，山寺桃花始盛开', author: '白居易', dynasty: '唐', title: '大林寺桃花' },
    { poem: '西塞山前白鹭飞，桃花流水鳜鱼肥', author: '张志和', dynasty: '唐', title: '渔歌子' },
    { poem: '两岸猿声啼不住，轻舟已过万重山', author: '李白', dynasty: '唐', title: '早发白帝城' },
    { poem: '相看两不厌，只有敬亭山', author: '李白', dynasty: '唐', title: '独坐敬亭山' },
    { poem: '种豆南山下，草盛豆苗稀', author: '陶渊明', dynasty: '东晋', title: '归园田居' },
    { poem: '青山横北郭，白水绕东城', author: '李白', dynasty: '唐', title: '送友人' },
    { poem: '客路青山外，行舟绿水前', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '远上寒山石径斜，白云生处有人家', author: '杜牧', dynasty: '唐', title: '山行' },
    { poem: '京口瓜洲一水间，钟山只隔数重山', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
  ],

  '水': [
    { poem: '水光潋滟晴方好，山色空蒙雨亦奇', author: '苏轼', dynasty: '宋', title: '饮湖上初晴后雨' },
    { poem: '山重水复疑无路，柳暗花明又一村', author: '陆游', dynasty: '宋', title: '游山西村' },
    { poem: '桃花潭水深千尺，不及汪伦送我情', author: '李白', dynasty: '唐', title: '赠汪伦' },
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '日出江花红胜火，春来江水绿如蓝', author: '白居易', dynasty: '唐', title: '忆江南' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '孤山寺北贾亭西，水面初平云脚低', author: '白居易', dynasty: '唐', title: '钱塘湖春行' },
    { poem: '客路青山外，行舟绿水前', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '仍怜故乡水，万里送行舟', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '天门中断楚江开，碧水东流至此回', author: '李白', dynasty: '唐', title: '望天门山' },
    { poem: '至于夏水襄陵，沿溯阻绝', author: '郦道元', dynasty: '北魏', title: '三峡' },
    { poem: '水落石出', author: '苏轼', dynasty: '宋', title: '后赤壁赋' },
    { poem: '问渠那得清如许，为有源头活水来', author: '朱熹', dynasty: '宋', title: '观书有感' },
    { poem: '落霞与孤鹜齐飞，秋水共长天一色', author: '王勃', dynasty: '唐', title: '滕王阁序' },
    { poem: '山随平野尽，江入大荒流', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '遥望洞庭山水翠，白银盘里一青螺', author: '刘禹锡', dynasty: '唐', title: '望洞庭' },
    { poem: '君不见黄河之水天上来，奔流到海不复回', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '抽刀断水水更流，举杯消愁愁更愁', author: '李白', dynasty: '唐', title: '宣州谢朓楼饯别校书叔云' },
    { poem: '一道残阳铺水中，半江瑟瑟半江红', author: '白居易', dynasty: '唐', title: '暮江吟' },
    { poem: '泉眼无声惜细流，树阴照水爱晴柔', author: '杨万里', dynasty: '宋', title: '小池' },
  ],

  '风': [
    { poem: '随风潜入夜，润物细无声', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
    { poem: '春风得意马蹄疾，一日看尽长安花', author: '孟郊', dynasty: '唐', title: '登科后' },
    { poem: '春风不度玉门关', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '羌笛何须怨杨柳，春风不度玉门关', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '忽如一夜春风来，千树万树梨花开', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '不知细叶谁裁出，二月春风似剪刀', author: '贺知章', dynasty: '唐', title: '咏柳' },
    { poem: '春风十里扬州路，卷上珠帘总不如', author: '杜牧', dynasty: '唐', title: '赠别' },
    { poem: '长风破浪会有时，直挂云帆济沧海', author: '李白', dynasty: '唐', title: '行路难' },
    { poem: '随风潜入夜，润物细无声', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '风急天高猿啸哀，渚清沙白鸟飞回', author: '杜甫', dynasty: '唐', title: '登高' },
    { poem: '潮平两岸阔，风正一帆悬', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '溪云初起日沉阁，山雨欲来风满楼', author: '许浑', dynasty: '唐', title: '咸阳城东楼' },
    { poem: '大鹏一日同风起，扶摇直上九万里', author: '李白', dynasty: '唐', title: '上李邕' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
    { poem: '等闲识得东风面，万紫千红总是春', author: '朱熹', dynasty: '宋', title: '春日' },
    { poem: '相见时难别亦难，东风无力百花残', author: '李商隐', dynasty: '唐', title: '无题' },
    { poem: '夜来风雨声，花落知多少', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '正是江南好风景，落花时节又逢君', author: '杜甫', dynasty: '唐', title: '江南逢李龟年' },
    { poem: '千里莺啼绿映红，水村山郭酒旗风', author: '杜牧', dynasty: '唐', title: '江南春' },
  ],

  '雪': [
    { poem: '千山鸟飞绝，万径人踪灭', author: '柳宗元', dynasty: '唐', title: '江雪' },
    { poem: '孤舟蓑笠翁，独钓寒江雪', author: '柳宗元', dynasty: '唐', title: '江雪' },
    { poem: '忽如一夜春风来，千树万树梨花开', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '北风卷地白草折，胡天八月即飞雪', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '纷纷暮雪下辕门，风掣红旗冻不翻', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '轮台东门送君去，去时雪满天山路', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '山回路转不见君，雪上空留马行处', author: '岑参', dynasty: '唐', title: '白雪歌送武判官归京' },
    { poem: '梅须逊雪三分白，雪却输梅一段香', author: '卢梅坡', dynasty: '宋', title: '雪梅' },
    { poem: '遥知不是雪，为有暗香来', author: '王安石', dynasty: '宋', title: '梅花' },
    { poem: '墙角数枝梅，凌寒独自开', author: '王安石', dynasty: '宋', title: '梅花' },
    { poem: '晚来天欲雪，能饮一杯无', author: '白居易', dynasty: '唐', title: '问刘十九' },
    { poem: '柴门闻犬吠，风雪夜归人', author: '刘长卿', dynasty: '唐', title: '逢雪宿芙蓉山主人' },
    { poem: '青海长云暗雪山，孤城遥望玉门关', author: '王昌龄', dynasty: '唐', title: '从军行' },
    { poem: '窗含西岭千秋雪，门泊东吴万里船', author: '杜甫', dynasty: '唐', title: '绝句' },
    { poem: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', dynasty: '唐', title: '枫桥夜泊' },
    { poem: '欲渡黄河冰塞川，将登太行雪满山', author: '李白', dynasty: '唐', title: '行路难' },
    { poem: '白雪却嫌春色晚，故穿庭树作飞花', author: '韩愈', dynasty: '唐', title: '春雪' },
    { poem: '夜深知雪重，时闻折竹声', author: '白居易', dynasty: '唐', title: '夜雪' },
  ],

  '云': [
    { poem: '黄河远上白云间，一片孤城万仞山', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '不畏浮云遮望眼，只缘身在最高层', author: '王安石', dynasty: '宋', title: '登飞来峰' },
    { poem: '浮云游子意，落日故人情', author: '李白', dynasty: '唐', title: '送友人' },
    { poem: '月下飞天镜，云生结海楼', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '明月出天山，苍茫云海间', author: '李白', dynasty: '唐', title: '关山月' },
    { poem: '众鸟高飞尽，孤云独去闲', author: '李白', dynasty: '唐', title: '独坐敬亭山' },
    { poem: '朝辞白帝彩云间，千里江陵一日还', author: '李白', dynasty: '唐', title: '早发白帝城' },
    { poem: '千里黄云白日曛，北风吹雁雪纷纷', author: '高适', dynasty: '唐', title: '别董大' },
    { poem: '远上寒山石径斜，白云生处有人家', author: '杜牧', dynasty: '唐', title: '山行' },
    { poem: '晴空一鹤排云上，便引诗情到碧霄', author: '刘禹锡', dynasty: '唐', title: '秋词' },
    { poem: '黑云压城城欲摧，甲光向日金鳞开', author: '李贺', dynasty: '唐', title: '雁门太守行' },
    { poem: '云想衣裳花想容，春风拂槛露华浓', author: '李白', dynasty: '唐', title: '清平调' },
    { poem: '曾经沧海难为水，除却巫山不是云', author: '元稹', dynasty: '唐', title: '离思' },
    { poem: '只在此山中，云深不知处', author: '贾岛', dynasty: '唐', title: '寻隐者不遇' },
    { poem: '松下问童子，言师采药去', author: '贾岛', dynasty: '唐', title: '寻隐者不遇' },
    { poem: '半亩方塘一鉴开，天光云影共徘徊', author: '朱熹', dynasty: '宋', title: '观书有感' },
    { poem: '锦城丝管日纷纷，半入江风半入云', author: '杜甫', dynasty: '唐', title: '赠花卿' },
    { poem: '天平山上白云泉，云自无心水自闲', author: '白居易', dynasty: '唐', title: '白云泉' },
  ],

  '酒': [
    { poem: '花间一壶酒，独酌无相亲', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '举杯邀明月，对影成三人', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '人生得意须尽欢，莫使金樽空对月', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '天生我材必有用，千金散尽还复来', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '烹羊宰牛且为乐，会须一饮三百杯', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '岑夫子，丹丘生，将进酒，杯莫停', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '与君歌一曲，请君为我倾耳听', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '古来圣贤皆寂寞，惟有饮者留其名', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '陈王昔时宴平乐，斗酒十千恣欢谑', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '主人何为言少钱，径须沽取对君酌', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '五花马，千金裘，呼儿将出换美酒', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '劝君更尽一杯酒，西出阳关无故人', author: '王维', dynasty: '唐', title: '送元二使安西' },
    { poem: '葡萄美酒夜光杯，欲饮琵琶马上催', author: '王翰', dynasty: '唐', title: '凉州词' },
    { poem: '醉卧沙场君莫笑，古来征战几人回', author: '王翰', dynasty: '唐', title: '凉州词' },
    { poem: '借问酒家何处有，牧童遥指杏花村', author: '杜牧', dynasty: '唐', title: '清明' },
    { poem: '今朝有酒今朝醉，明日愁来明日愁', author: '罗隐', dynasty: '唐', title: '自遣' },
    { poem: '明月几时有，把酒问青天', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '一曲新词酒一杯，去年天气旧亭台', author: '晏殊', dynasty: '宋', title: '浣溪沙' },
    { poem: '莫笑农家腊酒浑，丰年留客足鸡豚', author: '陆游', dynasty: '宋', title: '游山西村' },
    { poem: '昨夜雨疏风骤，浓睡不消残酒', author: '李清照', dynasty: '宋', title: '如梦令' },
    { poem: '常记溪亭日暮，沉醉不知归路', author: '李清照', dynasty: '宋', title: '如梦令' },
    { poem: '对酒当歌，人生几何', author: '曹操', dynasty: '东汉', title: '短歌行' },
  ],

  '愁': [
    { poem: '抽刀断水水更流，举杯消愁愁更愁', author: '李白', dynasty: '唐', title: '宣州谢朓楼饯别校书叔云' },
    { poem: '白发三千丈，缘愁似个长', author: '李白', dynasty: '唐', title: '秋浦歌' },
    { poem: '飞流直下三千尺，疑是银河落九天', author: '李白', dynasty: '唐', title: '望庐山瀑布' },
    { poem: '问君能有几多愁，恰似一江春水向东流', author: '李煜', dynasty: '南唐', title: '虞美人' },
    { poem: '剪不断，理还乱，是离愁', author: '李煜', dynasty: '南唐', title: '相见欢' },
    { poem: '别是一般滋味在心头', author: '李煜', dynasty: '南唐', title: '相见欢' },
    { poem: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', dynasty: '唐', title: '枫桥夜泊' },
    { poem: '移舟泊烟渚，日暮客愁新', author: '孟浩然', dynasty: '唐', title: '宿建德江' },
    { poem: '烽火连三月，家书抵万金', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '白头搔更短，浑欲不胜簪', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '春花秋月何时了，往事知多少', author: '李煜', dynasty: '南唐', title: '虞美人' },
    { poem: '雁过也，正伤心，却是旧时相识', author: '李清照', dynasty: '宋', title: '声声慢' },
    { poem: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚', author: '李清照', dynasty: '宋', title: '声声慢' },
    { poem: '这次第，怎一个愁字了得', author: '李清照', dynasty: '宋', title: '声声慢' },
    { poem: '薄雾浓云愁永昼，瑞脑销金兽', author: '李清照', dynasty: '宋', title: '醉花阴' },
    { poem: '莫愁前路无知己，天下谁人不识君', author: '高适', dynasty: '唐', title: '别董大' },
    { poem: '商女不知亡国恨，隔江犹唱后庭花', author: '杜牧', dynasty: '唐', title: '泊秦淮' },
    { poem: '日暮乡关何处是，烟波江上使人愁', author: '崔颢', dynasty: '唐', title: '黄鹤楼' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
    { poem: '只恐双溪舴艋舟，载不动许多愁', author: '李清照', dynasty: '宋', title: '武陵春' },
  ],

  '江': [
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '江畔何人初见月，江月何年初照人', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '人生代代无穷已，江月年年望相似', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '不知江月待何人，但见长江送流水', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '江水流春去欲尽，江潭落月复西斜', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '斜月沉沉藏海雾，碣石潇湘无限路', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '不知乘月几人归，落月摇情满江树', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '野旷天低树，江清月近人', author: '孟浩然', dynasty: '唐', title: '宿建德江' },
    { poem: '天门中断楚江开，碧水东流至此回', author: '李白', dynasty: '唐', title: '望天门山' },
    { poem: '两岸猿声啼不住，轻舟已过万重山', author: '李白', dynasty: '唐', title: '早发白帝城' },
    { poem: '朝辞白帝彩云间，千里江陵一日还', author: '李白', dynasty: '唐', title: '早发白帝城' },
    { poem: '孤帆远影碧空尽，唯见长江天际流', author: '李白', dynasty: '唐', title: '黄鹤楼送孟浩然之广陵' },
    { poem: '山随平野尽，江入大荒流', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '仍怜故乡水，万里送行舟', author: '李白', dynasty: '唐', title: '渡荆门送别' },
    { poem: '大江东去，浪淘尽，千古风流人物', author: '苏轼', dynasty: '宋', title: '念奴娇·赤壁怀古' },
    { poem: '遥望洞庭山水翠，白银盘里一青螺', author: '刘禹锡', dynasty: '唐', title: '望洞庭' },
    { poem: '日日思君不见君，共饮长江水', author: '李之仪', dynasty: '宋', title: '卜算子' },
    { poem: '郁孤台下清江水，中间多少行人泪', author: '辛弃疾', dynasty: '宋', title: '菩萨蛮·书江西造口壁' },
    { poem: '江雨霏霏江草齐，六朝如梦鸟空啼', author: '韦庄', dynasty: '唐', title: '台城' },
    { poem: '春风又绿江南岸，明月何时照我还', author: '王安石', dynasty: '宋', title: '泊船瓜洲' },
  ],

  '河': [
    { poem: '白日依山尽，黄河入海流', author: '王之涣', dynasty: '唐', title: '登鹳雀楼' },
    { poem: '欲穷千里目，更上一层楼', author: '王之涣', dynasty: '唐', title: '登鹳雀楼' },
    { poem: '黄河远上白云间，一片孤城万仞山', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '黄河之水天上来，奔流到海不复回', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '君不见黄河之水天上来，奔流到海不复回', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '大漠孤烟直，长河落日圆', author: '王维', dynasty: '唐', title: '使至塞上' },
    { poem: '白日登山望烽火，黄昏饮马傍交河', author: '李颀', dynasty: '唐', title: '古从军行' },
    { poem: '三万里河东入海，五千仞岳上摩天', author: '陆游', dynasty: '宋', title: '秋夜将晓出篱门迎凉有感' },
    { poem: '欲渡黄河冰塞川，将登太行雪满山', author: '李白', dynasty: '唐', title: '行路难' },
    { poem: '派出昆仑五色流，一支黄浊贯中州', author: '苏轼', dynasty: '宋', title: '黄河' },
  ],

  '日': [
    { poem: '白日依山尽，黄河入海流', author: '王之涣', dynasty: '唐', title: '登鹳雀楼' },
    { poem: '日出江花红胜火，春来江水绿如蓝', author: '白居易', dynasty: '唐', title: '忆江南' },
    { poem: '大漠孤烟直，长河落日圆', author: '王维', dynasty: '唐', title: '使至塞上' },
    { poem: '海日生残夜，江春入旧年', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '白日登山望烽火，黄昏饮马傍交河', author: '李颀', dynasty: '唐', title: '古从军行' },
    { poem: '明日复明日，明日何其多', author: '钱福', dynasty: '明', title: '明日歌' },
    { poem: '我生待明日，万事成蹉跎', author: '钱福', dynasty: '明', title: '明日歌' },
    { poem: '百年明日能几何，请君听我明日歌', author: '钱福', dynasty: '明', title: '明日歌' },
    { poem: '清晨入古寺，初日照高林', author: '常建', dynasty: '唐', title: '题破山寺后禅院' },
    { poem: '日出东南隅，照我秦氏楼', author: '汉乐府', dynasty: '汉', title: '陌上桑' },
    { poem: '锄禾日当午，汗滴禾下土', author: '李绅', dynasty: '唐', title: '悯农' },
    { poem: '接天莲叶无穷碧，映日荷花别样红', author: '杨万里', dynasty: '宋', title: '晓出净慈寺送林子方' },
    { poem: '两岸青山相对出，孤帆一片日边来', author: '李白', dynasty: '唐', title: '望天门山' },
    { poem: '日暮苍山远，天寒白屋贫', author: '刘长卿', dynasty: '唐', title: '逢雪宿芙蓉山主人' },
    { poem: '日暮汉宫传蜡烛，轻烟散入五侯家', author: '韩翃', dynasty: '唐', title: '寒食' },
  ],

  '夜': [
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '夜来风雨声，花落知多少', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '随风潜入夜，润物细无声', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', dynasty: '唐', title: '枫桥夜泊' },
    { poem: '海日生残夜，江春入旧年', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '今夜偏知春气暖，虫声新透绿窗纱', author: '刘方平', dynasty: '唐', title: '月夜' },
    { poem: '今夜月明人尽望，不知秋思落谁家', author: '王建', dynasty: '唐', title: '十五夜望月' },
    { poem: '床前明月光，疑是地上霜', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '举头望明月，低头思故乡', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '夜来风雨声，花落知多少', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '嫦娥应悔偷灵药，碧海青天夜夜心', author: '李商隐', dynasty: '唐', title: '嫦娥' },
    { poem: '何当共剪西窗烛，却话巴山夜雨时', author: '李商隐', dynasty: '唐', title: '夜雨寄北' },
    { poem: '君问归期未有期，巴山夜雨涨秋池', author: '李商隐', dynasty: '唐', title: '夜雨寄北' },
    { poem: '昨夜雨疏风骤，浓睡不消残酒', author: '李清照', dynasty: '宋', title: '如梦令' },
    { poem: '从今若许闲乘月，拄杖无时夜叩门', author: '陆游', dynasty: '宋', title: '游山西村' },
    { poem: '夜阑卧听风吹雨，铁马冰河入梦来', author: '陆游', dynasty: '宋', title: '十一月四日风雨大作' },
    { poem: '天阶夜色凉如水，卧看牵牛织女星', author: '杜牧', dynasty: '唐', title: '秋夕' },
    { poem: '烟笼寒水月笼沙，夜泊秦淮近酒家', author: '杜牧', dynasty: '唐', title: '泊秦淮' },
    { poem: '可怜九月初三夜，露似真珠月似弓', author: '白居易', dynasty: '唐', title: '暮江吟' },
    { poem: '露从今夜白，月是故乡明', author: '杜甫', dynasty: '唐', title: '月夜忆舍弟' },
  ],

  '心': [
    { poem: '浮云游子意，落日故人情', author: '李白', dynasty: '唐', title: '送友人' },
    { poem: '人生得意须尽欢，莫使金樽空对月', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '烽火连三月，家书抵万金', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '白头搔更短，浑欲不胜簪', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '但使龙城飞将在，不教胡马度阴山', author: '王昌龄', dynasty: '唐', title: '出塞' },
    { poem: '洛阳亲友如相问，一片冰心在玉壶', author: '王昌龄', dynasty: '唐', title: '芙蓉楼送辛渐' },
    { poem: '愿得一心人，白头不相离', author: '卓文君', dynasty: '汉', title: '白头吟' },
    { poem: '问渠那得清如许，为有源头活水来', author: '朱熹', dynasty: '宋', title: '观书有感' },
    { poem: '人生自古谁无死，留取丹心照汗青', author: '文天祥', dynasty: '宋', title: '过零丁洋' },
    { poem: '臣心一片磁针石，不指南方不肯休', author: '文天祥', dynasty: '宋', title: '扬子江' },
    { poem: '身无彩凤双飞翼，心有灵犀一点通', author: '李商隐', dynasty: '唐', title: '无题' },
    { poem: '春心莫共花争发，一寸相思一寸灰', author: '李商隐', dynasty: '唐', title: '无题' },
    { poem: '嫦娥应悔偷灵药，碧海青天夜夜心', author: '李商隐', dynasty: '唐', title: '嫦娥' },
    { poem: '感时花溅泪，恨别鸟惊心', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '临行密密缝，意恐迟迟归', author: '孟郊', dynasty: '唐', title: '游子吟' },
    { poem: '谁言寸草心，报得三春晖', author: '孟郊', dynasty: '唐', title: '游子吟' },
  ],

  '人': [
    { poem: '人生得意须尽欢，莫使金樽空对月', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '天生我材必有用，千金散尽还复来', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '古来圣贤皆寂寞，惟有饮者留其名', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '人生代代无穷已，江月年年望相似', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '不知江月待何人，但见长江送流水', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '千山鸟飞绝，万径人踪灭', author: '柳宗元', dynasty: '唐', title: '江雪' },
    { poem: '独在异乡为异客，每逢佳节倍思亲', author: '王维', dynasty: '唐', title: '九月九日忆山东兄弟' },
    { poem: '故人西辞黄鹤楼，烟花三月下扬州', author: '李白', dynasty: '唐', title: '黄鹤楼送孟浩然之广陵' },
    { poem: '孤帆远影碧空尽，唯见长江天际流', author: '李白', dynasty: '唐', title: '黄鹤楼送孟浩然之广陵' },
    { poem: '峨嵋山月半轮秋，影入平羌江水流', author: '李白', dynasty: '唐', title: '峨嵋山月歌' },
    { poem: '举杯邀明月，对影成三人', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '人闲桂花落，夜静春山空', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '劝君更尽一杯酒，西出阳关无故人', author: '王维', dynasty: '唐', title: '送元二使安西' },
    { poem: '莫愁前路无知己，天下谁人不识君', author: '高适', dynasty: '唐', title: '别董大' },
    { poem: '同是天涯沦落人，相逢何必曾相识', author: '白居易', dynasty: '唐', title: '琵琶行' },
    { poem: '人生自古谁无死，留取丹心照汗青', author: '文天祥', dynasty: '宋', title: '过零丁洋' },
    { poem: '人有悲欢离合，月有阴晴圆缺', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '但愿人长久，千里共婵娟', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '但愿人长久，千里共婵娟', author: '苏轼', dynasty: '宋', title: '水调歌头' },
    { poem: '落红不是无情物，化作春泥更护花', author: '龚自珍', dynasty: '清', title: '己亥杂诗' },
  ],

  '天': [
    { poem: '黄河之水天上来，奔流到海不复回', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '君不见黄河之水天上来，奔流到海不复回', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '君不见高堂明镜悲白发，朝如青丝暮成雪', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '飞流直下三千尺，疑是银河落九天', author: '李白', dynasty: '唐', title: '望庐山瀑布' },
    { poem: '两岸猿声啼不住，轻舟已过万重山', author: '李白', dynasty: '唐', title: '早发白帝城' },
    { poem: '天门中断楚江开，碧水东流至此回', author: '李白', dynasty: '唐', title: '望天门山' },
    { poem: '明月出天山，苍茫云海间', author: '李白', dynasty: '唐', title: '关山月' },
    { poem: '长风破浪会有时，直挂云帆济沧海', author: '李白', dynasty: '唐', title: '行路难' },
    { poem: '人生得意须尽欢，莫使金樽空对月', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '天生我材必有用，千金散尽还复来', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '待到重阳日，还来就菊花', author: '孟浩然', dynasty: '唐', title: '过故人庄' },
    { poem: '海内存知己，天涯若比邻', author: '王勃', dynasty: '唐', title: '送杜少府之任蜀州' },
    { poem: '海日生残夜，江春入旧年', author: '王湾', dynasty: '唐', title: '次北固山下' },
    { poem: '不敢高声语，恐惊天上人', author: '李白', dynasty: '唐', title: '夜宿山寺' },
    { poem: '危楼高百尺，手可摘星辰', author: '李白', dynasty: '唐', title: '夜宿山寺' },
    { poem: '嫦娥应悔偷灵药，碧海青天夜夜心', author: '李商隐', dynasty: '唐', title: '嫦娥' },
    { poem: '同是天涯沦落人，相逢何必曾相识', author: '白居易', dynasty: '唐', title: '琵琶行' },
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '念天地之悠悠，独怆然而涕下', author: '陈子昂', dynasty: '唐', title: '登幽州台歌' },
  ],

  '鸟': [
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '千山鸟飞绝，万径人踪灭', author: '柳宗元', dynasty: '唐', title: '江雪' },
    { poem: '春去花还在，人来鸟不惊', author: '王维', dynasty: '唐', title: '画' },
    { poem: '月出惊山鸟，时鸣春涧中', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '人闲桂花落，夜静春山空', author: '王维', dynasty: '唐', title: '鸟鸣涧' },
    { poem: '两个黄鹂鸣翠柳，一行白鹭上青天', author: '杜甫', dynasty: '唐', title: '绝句' },
    { poem: '西塞山前白鹭飞，桃花流水鳜鱼肥', author: '张志和', dynasty: '唐', title: '渔歌子' },
    { poem: '故人西辞黄鹤楼，烟花三月下扬州', author: '李白', dynasty: '唐', title: '黄鹤楼送孟浩然之广陵' },
    { poem: '黄鹤一去不复返，白云千载空悠悠', author: '崔颢', dynasty: '唐', title: '黄鹤楼' },
    { poem: '晴空一鹤排云上，便引诗情到碧霄', author: '刘禹锡', dynasty: '唐', title: '秋词' },
    { poem: '自来自去梁上燕，相亲相近水中鸥', author: '杜甫', dynasty: '唐', title: '江村' },
    { poem: '几处早莺争暖树，谁家新燕啄春泥', author: '白居易', dynasty: '唐', title: '钱塘湖春行' },
    { poem: '感时花溅泪，恨别鸟惊心', author: '杜甫', dynasty: '唐', title: '春望' },
    { poem: '春城无处不飞花，寒食东风御柳斜', author: '韩翃', dynasty: '唐', title: '寒食' },
    { poem: '千里黄云白日曛，北风吹雁雪纷纷', author: '高适', dynasty: '唐', title: '别董大' },
    { poem: '风急天高猿啸哀，渚清沙白鸟飞回', author: '杜甫', dynasty: '唐', title: '登高' },
    { poem: '荡胸生层云，决眦入归鸟', author: '杜甫', dynasty: '唐', title: '望岳' },
  ],

  '雨': [
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '夜来风雨声，花落知多少', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '随风潜入夜，润物细无声', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '晓看红湿处，花重锦官城', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '好雨知时节，当春乃发生', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '清明时节雨纷纷，路上行人欲断魂', author: '杜牧', dynasty: '唐', title: '清明' },
    { poem: '天街小雨润如酥，草色遥看近却无', author: '韩愈', dynasty: '唐', title: '早春呈水部张十八员外' },
    { poem: '水光潋滟晴方好，山色空蒙雨亦奇', author: '苏轼', dynasty: '宋', title: '饮湖上初晴后雨' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '春潮带雨晚来急，野渡无人舟自横', author: '韦应物', dynasty: '唐', title: '滁州西涧' },
    { poem: '黄梅时节家家雨，青草池塘处处蛙', author: '赵师秀', dynasty: '宋', title: '约客' },
    { poem: '何当共剪西窗烛，却话巴山夜雨时', author: '李商隐', dynasty: '唐', title: '夜雨寄北' },
    { poem: '君问归期未有期，巴山夜雨涨秋池', author: '李商隐', dynasty: '唐', title: '夜雨寄北' },
    { poem: '夜阑卧听风吹雨，铁马冰河入梦来', author: '陆游', dynasty: '宋', title: '十一月四日风雨大作' },
    { poem: '山河破碎风飘絮，身世浮沉雨打萍', author: '文天祥', dynasty: '宋', title: '过零丁洋' },
    { poem: '南朝四百八十寺，多少楼台烟雨中', author: '杜牧', dynasty: '唐', title: '江南春' },
    { poem: '大弦嘈嘈如急雨，小弦切切如私语', author: '白居易', dynasty: '唐', title: '琵琶行' },
  ],

  '秋': [
    { poem: '自古逢秋悲寂寥，我言秋日胜春朝', author: '刘禹锡', dynasty: '唐', title: '秋词' },
    { poem: '晴空一鹤排云上，便引诗情到碧霄', author: '刘禹锡', dynasty: '唐', title: '秋词' },
    { poem: '银烛秋光冷画屏，轻罗小扇扑流萤', author: '杜牧', dynasty: '唐', title: '秋夕' },
    { poem: '天阶夜色凉如水，卧看牵牛织女星', author: '杜牧', dynasty: '唐', title: '秋夕' },
    { poem: '秋风萧瑟，洪波涌起', author: '曹操', dynasty: '东汉', title: '观沧海' },
    { poem: '日月之行，若出其中', author: '曹操', dynasty: '东汉', title: '观沧海' },
    { poem: '星河灿烂，若出其里', author: '曹操', dynasty: '东汉', title: '观沧海' },
    { poem: '君问归期未有期，巴山夜雨涨秋池', author: '李商隐', dynasty: '唐', title: '夜雨寄北' },
    { poem: '常恐秋节至，焜黄华叶衰', author: '汉乐府', dynasty: '汉', title: '长歌行' },
    { poem: '湖光秋月两相和，潭面无风镜未磨', author: '刘禹锡', dynasty: '唐', title: '望洞庭' },
    { poem: '遥望洞庭山水翠，白银盘里一青螺', author: '刘禹锡', dynasty: '唐', title: '望洞庭' },
    { poem: '银烛秋光冷画屏，轻罗小扇扑流萤', author: '杜牧', dynasty: '唐', title: '秋夕' },
    { poem: '中秋谁与共孤光，把盏凄然北望', author: '苏轼', dynasty: '宋', title: '西江月' },
    { poem: '今夜月明人尽望，不知秋思落谁家', author: '王建', dynasty: '唐', title: '十五夜望月' },
    { poem: '峨眉山月半轮秋，影入平羌江水流', author: '李白', dynasty: '唐', title: '峨眉山月歌' },
    { poem: '万里悲秋常作客，百年多病独登台', author: '杜甫', dynasty: '唐', title: '登高' },
    { poem: '停车坐爱枫林晚，霜叶红于二月花', author: '杜牧', dynasty: '唐', title: '山行' },
    { poem: '枯藤老树昏鸦，小桥流水人家', author: '马致远', dynasty: '元', title: '天净沙·秋思' },
  ],

  '酒': [
    { poem: '花间一壶酒，独酌无相亲', author: '李白', dynasty: '唐', title: '月下独酌' },
    { poem: '劝君更尽一杯酒，西出阳关无故人', author: '王维', dynasty: '唐', title: '送元二使安西' },
    { poem: '葡萄美酒夜光杯，欲饮琵琶马上催', author: '王翰', dynasty: '唐', title: '凉州词' },
    { poem: '金樽清酒斗十千，玉盘珍羞直万钱', author: '李白', dynasty: '唐', title: '行路难' },
    { poem: '将进酒，杯莫停', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '人生得意须尽欢，莫使金樽空对月', author: '李白', dynasty: '唐', title: '将进酒' },
    { poem: '对酒当歌，人生几何', author: '曹操', dynasty: '东汉', title: '短歌行' },
    { poem: '何以解忧，唯有杜康', author: '曹操', dynasty: '东汉', title: '短歌行' },
    { poem: '今日听君歌一曲，暂凭杯酒长精神', author: '刘禹锡', dynasty: '唐', title: '酬乐天扬州初逢席上见赠' },
    { poem: '白日放歌须纵酒，青春作伴好还乡', author: '杜甫', dynasty: '唐', title: '闻官军收河南河北' },
    { poem: '今朝有酒今朝醉，明日愁来明日愁', author: '罗隐', dynasty: '唐', title: '自遣' },
    { poem: '今宵酒醒何处，杨柳岸，晓风残月', author: '柳永', dynasty: '宋', title: '雨霖铃' },
    { poem: '明月几时有，把酒问青天', author: '苏轼', dynasty: '宋', title: '水调歌头' },
  ],

  '梅': [
    { poem: '墙角数枝梅，凌寒独自开', author: '王安石', dynasty: '宋', title: '梅花' },
    { poem: '遥知不是雪，为有暗香来', author: '王安石', dynasty: '宋', title: '梅花' },
    { poem: '梅须逊雪三分白，雪却输梅一段香', author: '卢梅坡', dynasty: '宋', title: '雪梅' },
    { poem: '有梅无雪不精神，有雪无诗俗了人', author: '卢梅坡', dynasty: '宋', title: '雪梅' },
    { poem: '日暮诗成天又雪，与梅并作十分春', author: '卢梅坡', dynasty: '宋', title: '雪梅' },
    { poem: '梅子黄时日日晴，小溪泛尽却山行', author: '曾几', dynasty: '宋', title: '三衢道中' },
    { poem: '黄梅时节家家雨，青草池塘处处蛙', author: '赵师秀', dynasty: '宋', title: '约客' },
    { poem: '何方可化身千亿，一树梅前一放翁', author: '陆游', dynasty: '宋', title: '梅花绝句' },
    { poem: '零落成泥碾作尘，只有香如故', author: '陆游', dynasty: '宋', title: '卜算子·咏梅' },
    { poem: '驿外断桥边，寂寞开无主', author: '陆游', dynasty: '宋', title: '卜算子·咏梅' },
    { poem: '已是黄昏独自愁，更著风和雨', author: '陆游', dynasty: '宋', title: '卜算子·咏梅' },
    { poem: '无意苦争春，一任群芳妒', author: '陆游', dynasty: '宋', title: '卜算子·咏梅' },
    { poem: '待到山花烂漫时，她在丛中笑', author: '毛泽东', dynasty: '现代', title: '卜算子·咏梅' },
    { poem: '梅雪争春未肯降，骚人阁笔费评章', author: '卢梅坡', dynasty: '宋', title: '雪梅' },
  ],

  '柳': [
    { poem: '两个黄鹂鸣翠柳，一行白鹭上青天', author: '杜甫', dynasty: '唐', title: '绝句' },
    { poem: '羌笛何须怨杨柳，春风不度玉门关', author: '王之涣', dynasty: '唐', title: '凉州词' },
    { poem: '杨柳青青江水平，闻郎江上唱歌声', author: '刘禹锡', dynasty: '唐', title: '竹枝词' },
    { poem: '杨柳岸，晓风残月', author: '柳永', dynasty: '宋', title: '雨霖铃' },
    { poem: '今宵酒醒何处，杨柳岸，晓风残月', author: '柳永', dynasty: '宋', title: '雨霖铃' },
    { poem: '渭城朝雨浥轻尘，客舍青青柳色新', author: '王维', dynasty: '唐', title: '送元二使安西' },
    { poem: '山重水复疑无路，柳暗花明又一村', author: '陆游', dynasty: '宋', title: '游山西村' },
    { poem: '草长莺飞二月天，拂堤杨柳醉春烟', author: '高鼎', dynasty: '清', title: '村居' },
    { poem: '春城无处不飞花，寒食东风御柳斜', author: '韩翃', dynasty: '唐', title: '寒食' },
    { poem: '沾衣欲湿杏花雨，吹面不寒杨柳风', author: '志南', dynasty: '宋', title: '绝句' },
    { poem: '最是一年春好处，绝胜烟柳满皇都', author: '韩愈', dynasty: '唐', title: '早春呈水部张十八员外' },
    { poem: '此夜曲中闻折柳，何人不起故园情', author: '李白', dynasty: '唐', title: '春夜洛城闻笛' },
  ],

  '松': [
    { poem: '明月松间照，清泉石上流', author: '王维', dynasty: '唐', title: '山居秋暝' },
    { poem: '咬定青山不放松，立根原在破岩中', author: '郑燮', dynasty: '清', title: '竹石' },
    { poem: '亭亭山上松，瑟瑟谷中风', author: '刘桢', dynasty: '东汉', title: '赠从弟' },
    { poem: '风声一何盛，松枝一何劲', author: '刘桢', dynasty: '东汉', title: '赠从弟' },
    { poem: '冰霜正惨凄，终岁常端正', author: '刘桢', dynasty: '东汉', title: '赠从弟' },
    { poem: '岂不罹凝寒，松柏有本性', author: '刘桢', dynasty: '东汉', title: '赠从弟' },
    { poem: '松柏后凋', author: '孔子', dynasty: '春秋', title: '论语' },
    { poem: '要知松高洁，待到雪化时', author: '陈毅', dynasty: '现代', title: '青松' },
    { poem: '大雪压青松，青松挺且直', author: '陈毅', dynasty: '现代', title: '青松' },
  ],

  '竹': [
    { poem: '咬定青山不放松，立根原在破岩中', author: '郑燮', dynasty: '清', title: '竹石' },
    { poem: '千磨万击还坚劲，任尔东西南北风', author: '郑燮', dynasty: '清', title: '竹石' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '宁可食无肉，不可居无竹', author: '苏轼', dynasty: '宋', title: '於潜僧绿筠轩' },
    { poem: '无肉令人瘦，无竹令人俗', author: '苏轼', dynasty: '宋', title: '於潜僧绿筠轩' },
    { poem: '人瘦尚可肥，士俗不可医', author: '苏轼', dynasty: '宋', title: '於潜僧绿筠轩' },
    { poem: '新竹高于旧竹枝，全凭老干为扶持', author: '郑燮', dynasty: '清', title: '新竹' },
    { poem: '衙斋卧听萧萧竹，疑是民间疾苦声', author: '郑燮', dynasty: '清', title: '潍县署中画竹呈年伯包大中丞括' },
    { poem: '些小吾曹州县吏，一枝一叶总关情', author: '郑燮', dynasty: '清', title: '潍县署中画竹呈年伯包大中丞括' },
    { poem: '过江千尺浪，入竹万竿斜', author: '李峤', dynasty: '唐', title: '风' },
  ],

  '桃': [
    { poem: '桃花潭水深千尺，不及汪伦送我情', author: '李白', dynasty: '唐', title: '赠汪伦' },
    { poem: '人间四月芳菲尽，山寺桃花始盛开', author: '白居易', dynasty: '唐', title: '大林寺桃花' },
    { poem: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', dynasty: '宋', title: '惠崇春江晚景' },
    { poem: '西塞山前白鹭飞，桃花流水鳜鱼肥', author: '张志和', dynasty: '唐', title: '渔歌子' },
    { poem: '桃花一簇开无主，可爱深红爱浅红', author: '杜甫', dynasty: '唐', title: '江畔独步寻花' },
    { poem: '黄师塔前江水东，春光懒困倚微风', author: '杜甫', dynasty: '唐', title: '江畔独步寻花' },
    { poem: '桃红复含宿雨，柳绿更带朝烟', author: '王维', dynasty: '唐', title: '田园乐' },
    { poem: '去年今日此门中，人面桃花相映红', author: '崔护', dynasty: '唐', title: '题都城南庄' },
    { poem: '人面不知何处去，桃花依旧笑春风', author: '崔护', dynasty: '唐', title: '题都城南庄' },
    { poem: '桃之夭夭，灼灼其华', author: '诗经', dynasty: '周', title: '桃夭' },
  ],

  '光': [
    { poem: '床前明月光，疑是地上霜', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '举头望明月，低头思故乡', author: '李白', dynasty: '唐', title: '静夜思' },
    { poem: '海上生明月，天涯共此时', author: '张九龄', dynasty: '唐', title: '望月怀远' },
    { poem: '明月松间照，清泉石上流', author: '王维', dynasty: '唐', title: '山居秋暝' },
    { poem: '春江潮水连海平，海上明月共潮生', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '今人不见古时月，今月曾经照古人', author: '李白', dynasty: '唐', title: '把酒问月' },
    { poem: '不知乘月几人归，落月摇情满江树', author: '张若虚', dynasty: '唐', title: '春江花月夜' },
    { poem: '半亩方塘一鉴开，天光云影共徘徊', author: '朱熹', dynasty: '宋', title: '观书有感' },
  ],

  '秋': [
    { poem: '自古逢秋悲寂寥，我言秋日胜春朝', author: '刘禹锡', dynasty: '唐', title: '秋词' },
    { poem: '银烛秋光冷画屏，轻罗小扇扑流萤', author: '杜牧', dynasty: '唐', title: '秋夕' },
    { poem: '万里悲秋常作客，百年多病独登台', author: '杜甫', dynasty: '唐', title: '登高' },
    { poem: '秋风萧瑟，洪波涌起', author: '曹操', dynasty: '东汉', title: '观沧海' },
    { poem: '银烛秋光冷画屏，轻罗小扇扑流萤', author: '杜牧', dynasty: '唐', title: '秋夕' },
  ],

  '夜': [
    { poem: '随风潜入夜，润物细无声', author: '杜甫', dynasty: '唐', title: '春夜喜雨' },
    { poem: '春眠不觉晓，处处闻啼鸟', author: '孟浩然', dynasty: '唐', title: '春晓' },
    { poem: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', dynasty: '唐', title: '枫桥夜泊' },
    { poem: '今夜偏知春气暖，虫声新透绿窗纱', author: '刘方平', dynasty: '唐', title: '月夜' },
  ]
}

// 获取所有可用的关键字
export const getAvailableKeywords = () => {
  return Object.keys(feihuaPoems).filter(k => feihuaPoems[k] && feihuaPoems[k].length > 0)
}

// 根据关键字获取诗句列表（排除已使用的）
export const getPoemsForKeyword = (keyword, usedPoems = []) => {
  const poems = feihuaPoems[keyword] || []
  return poems.filter(p => !usedPoems.includes(p.poem))
}

// 验证诗句是否有效（包含关键字且在数据库中）
export const validatePoem = (input, keyword, usedPoems = []) => {
  const normalized = input.replace(/[，。！？；：、""''（）【】]/g, '').trim()
  
  if (!normalized) {
    return { valid: false, message: '请输入诗句', type: 'empty' }
  }
  
  if (!normalized.includes(keyword)) {
    return { valid: false, message: `诗句中必须包含"${keyword}"字`, type: 'keyword' }
  }
  
  if (normalized.length < 4) {
    return { valid: false, message: '诗句长度至少4个字', type: 'length' }
  }
  
  if (normalized.length > 50) {
    return { valid: false, message: '诗句长度不能超过50个字', type: 'length' }
  }
  
  // 在数据库中查找
  const poems = feihuaPoems[keyword] || []
  const found = poems.find(p => {
    const pNorm = p.poem.replace(/[，。！？；：、""''（）【】]/g, '')
    return pNorm === normalized || pNorm.includes(normalized) || normalized.includes(pNorm)
  })
  
  if (!found) {
    // 数据库中没有找到，返回特殊状态让前端调用AI验证
    return { valid: false, message: 'NOT_IN_DATABASE', type: 'notfound', needsAIValidation: true }
  }
  
  if (usedPoems.includes(found.poem)) {
    return { valid: false, message: '这句诗已经在本局中使用过', type: 'duplicate' }
  }
  
  return { valid: true, poem: found }
}

// 带AI验证的完整验证函数（用于需要AI验证的场景）
export const validatePoemWithAI = async (input, keyword, usedPoems = []) => {
  // 先尝试本地验证
  const localResult = validatePoem(input, keyword, usedPoems)
  
  if (localResult.valid) {
    return localResult
  }
  
  // 如果需要AI验证
  if (localResult.needsAIValidation) {
    const aiResult = await validatePoemByAI(input, keyword)
    
    if (aiResult.valid && aiResult.poem) {
      // AI验证通过，返回匹配的诗句信息
      return {
        valid: true,
        poem: aiResult.poem,
        fromAI: true
      }
    } else {
      // AI验证也失败
      return {
        valid: false,
        message: aiResult.message || '诗句不在我们的诗词库中，请换一首试试',
        type: 'notfound'
      }
    }
  }
  
  return localResult
}

// 获取关键字对应的诗句数量
export const getKeywordCount = (keyword) => {
  return feihuaPoems[keyword]?.length || 0
}

// 调用后端AI验证诗句（当本地数据库没有时使用）
export const validatePoemByAI = async (input, keyword) => {
  try {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    
    const response = await fetch(`${baseUrl}/ai/feihua-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        poem: input,
        keyword: keyword
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        valid: data.valid,
        message: data.message || (data.valid ? '验证通过' : '诗句不正确'),
        poem: data.poem || null,
        analysis: data.analysis || null
      };
    } else {
      return {
        valid: false,
        message: 'AI验证服务暂时不可用',
        poem: null,
        analysis: null
      };
    }
  } catch (error) {
    console.error('AI验证请求失败:', error);
    return {
      valid: false,
      message: '网络连接失败，请检查网络后重试',
      poem: null,
      analysis: null
    };
  }
}
