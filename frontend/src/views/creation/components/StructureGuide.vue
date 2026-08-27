/**
 * 结构引导面板组件
 * Step 2: 结构引导 - 展示诗词结构提示，帮助用户理解写作框架
 * 本地数据驱动，即时加载，根据诗词类型和主题提供精准示例
 */
<template>
  <div class="structure-guide">
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="header-icon">🗺️</div>
      <div class="header-text">
        <h2>结构引导</h2>
        <p>为你定制专属写作框架，深度契合创作主题</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="loading-state" v-if="localLoading">
      <div class="loading-spinner-large"></div>
      <p>正在加载结构引导...</p>
    </div>

    <!-- 结构信息卡片 -->
    <div class="structure-info" v-else-if="structure">
      <div class="structure-header-card">
        <div class="structure-title">
          <h3>{{ structure.name }}</h3>
          <span class="structure-badge" v-if="structure.lines">{{ structure.lines }}句 × {{ structure.charactersPerLine }}字</span>
          <span class="structure-badge ai-badge" v-else>AI智能引导</span>
        </div>
        <p class="structure-intro">{{ structure.introduction }}</p>
      </div>

      <!-- 结构流程图 -->
      <div class="structure-flow">
        <div class="flow-title">
          <span class="flow-icon">📐</span>
          <h3>起承转合 · 结构详解</h3>
        </div>
        <div
          v-for="(item, index) in structure.structure"
          :key="index"
          class="structure-item"
        >
          <div class="structure-node">
            <div class="node-number">{{ index + 1 }}</div>
            <div class="node-content">
              <div class="node-role-badge" :class="`role-${item.role}`">
                {{ item.role }}
              </div>
              <h4 class="node-title">{{ item.position }}</h4>
              <p class="node-desc">{{ item.description }}</p>
              <div class="node-theme-hint" v-if="item.themeHint">
                <span class="hint-icon">💡</span>
                <span class="hint-text">{{ item.themeHint }}</span>
              </div>
              <div class="node-example">
                <span class="example-label">范例：</span>
                <span class="example-text">"{{ item.example }}"</span>
              </div>
            </div>
          </div>
          <div class="structure-connector" v-if="index < structure.structure.length - 1">
            <svg width="24" height="40" viewBox="0 0 24 40">
              <path d="M12 0 L12 35 M6 28 L12 35 L18 28" stroke="#d4c4b0" stroke-width="2" fill="none"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 关键词使用建议 -->
      <div class="keyword-section" v-if="structure.keywordSuggestions && structure.keywordSuggestions.length">
        <div class="section-header">
          <span class="section-icon">🔑</span>
          <h3>关键词运用指南</h3>
        </div>
        <div class="keyword-suggestions">
          <div
            v-for="(kw, index) in structure.keywordSuggestions"
            :key="index"
            class="keyword-item"
          >
            <span class="keyword-tag">{{ kw.keyword }}</span>
            <span class="keyword-usage">{{ kw.usage }}</span>
          </div>
        </div>
      </div>

      <!-- 写作技巧 -->
      <div class="tips-section">
        <div class="section-header">
          <span class="section-icon">✎</span>
          <h3>写作技巧</h3>
        </div>
        <div class="tips-grid">
          <div
            v-for="(tip, index) in structure.tips"
            :key="index"
            class="tip-card"
          >
            <span class="tip-number">{{ index + 1 }}</span>
            <span class="tip-text">{{ tip }}</span>
          </div>
        </div>
      </div>

      <!-- 韵律提示 -->
      <div class="rhyme-section" v-if="structure.rhyme">
        <div class="section-header">
          <span class="section-icon">🎵</span>
          <h3>韵律要求</h3>
        </div>
        <div class="rhyme-content">
          <p>{{ structure.rhyme }}</p>
          <div class="rhyme-examples" v-if="structure.rhymeExamples">
            <span
              v-for="rhyme in structure.rhymeExamples"
              :key="rhyme"
              class="rhyme-tag"
            >
              {{ rhyme }}
            </span>
          </div>
        </div>
      </div>

      <!-- 避免的错误 -->
      <div class="avoid-section" v-if="structure.avoid && structure.avoid.length">
        <div class="section-header">
          <span class="section-icon">⚠️</span>
          <h3>避免踩坑</h3>
        </div>
        <div class="avoid-list">
          <div
            v-for="(item, index) in structure.avoid"
            :key="index"
            class="avoid-item"
          >
            <span class="avoid-icon">✕</span>
            <span class="avoid-text">{{ item }}</span>
          </div>
        </div>
      </div>

      <!-- 进阶技巧 -->
      <div class="advanced-section" v-if="structure.advancedTips && structure.advancedTips.length">
        <div class="section-header">
          <span class="section-icon">🚀</span>
          <h3>进阶技巧</h3>
        </div>
        <div class="advanced-list">
          <div
            v-for="(tip, index) in structure.advancedTips"
            :key="index"
            class="advanced-item"
          >
            <span class="advanced-number">{{ index + 1 }}</span>
            <span class="advanced-text">{{ tip }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="back-btn" @click="$emit('back')">
          <span>←</span>
          <span>返回灵感</span>
        </button>
        <button class="start-btn" @click="$emit('start')">
          <span>开始创作</span>
          <span class="arrow">→</span>
        </button>
      </div>
    </div>

    <!-- 默认状态 - 加载结构 -->
    <div class="load-prompt" v-else>
      <div class="prompt-icon">📖</div>
      <h3>了解诗词结构</h3>
      <p>根据你的主题，生成个性化的写作框架</p>
      <button class="load-btn" @click="loadStructure" :disabled="localLoading">
        <span v-if="localLoading" class="loading-spinner"></span>
        <span v-else>📖</span>
        <span>{{ localLoading ? '加载中...' : '获取结构引导' }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { api } from '../../../services/api.js';

const GENRE_CONFIG = {
  '五言绝句': { lines: 4, charactersPerLine: 5 },
  '七言绝句': { lines: 4, charactersPerLine: 7 },
  '五言律诗': { lines: 8, charactersPerLine: 5 },
  '七言律诗': { lines: 8, charactersPerLine: 7 },
};

const STRUCTURE_EXAMPLES = {
  '五言绝句': {
    思乡: {
      intro: '五言绝句写思乡，以景托情、情景交融。起句从故乡景物或旅途所见切入，承句铺陈离愁，转句宕开写时空之隔，合句以情收束。五字一句，字字精炼。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以月光入笔，营造静谧氛围，暗示夜深人静时的孤独', example: '床前明月光', themeHint: '李白《静夜思》' },
        { position: '第二句（承）', role: '承', description: '承上写月色如霜，暗示寒意与凄清', example: '疑是地上霜', themeHint: '李白《静夜思》' },
        { position: '第三句（转）', role: '转', description: '动作转折，由静转动，打破前两句的静态', example: '举头望明月', themeHint: '李白《静夜思》' },
        { position: '第四句（合）', role: '合', description: '情感收束，点明思乡主题，余韵悠长', example: '低头思故乡', themeHint: '李白《静夜思》' }
      ],
      tips: ['以「乡」字为情感内核，把思乡之情寄托在具体景物上', '用空间对比强化乡愁：此处景物与故乡景物形成落差', '善用听觉意象（杜鹃声、羌笛）触发乡情', '结尾可用「归」字或归期意象收束'],
      rhyme: '思乡诗多押「ang」韵（乡、霜、光等），韵脚洪亮深远',
      rhymeExamples: ['ang韵：乡、霜、光、望、长', 'an韵：山、关、还、寒、难'],
      avoid: ['直呼「想家」等空洞情感词而不借景', '把故乡写成完美仙境失去真实感', '首句就写思念，起得太急']
    },
    离别: {
      intro: '五言绝句写离别，以景写情、含而不露。起句交代送别场景，承句铺陈离愁，转句宕开写别后，合句以景结情。五字一句，节奏稳健。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以送别场景入笔，点明地点与氛围', example: '山中相送罢', themeHint: '王维《送别》' },
        { position: '第二句（承）', role: '承', description: '承接送别，写别后独归的寂寥', example: '日暮掩柴扉', themeHint: '王维《送别》' },
        { position: '第三句（转）', role: '转', description: '转写明年春草，以景寄托思念', example: '春草明年绿', themeHint: '王维《送别》' },
        { position: '第四句（合）', role: '合', description: '以问句收束，含蓄表达期盼重逢', example: '王孙归不归', themeHint: '王维《送别》' }
      ],
      tips: ['离别起点是景——长亭、古道、渡口、杨柳', '用具体动作代替抽象情感：「执手」「回首」', '转句可宕开写别后或天下普遍之别', '合句以「山高水长」等意象收束'],
      rhyme: '送别诗常用「ei/ui」韵（归、扉、违等），韵脚悠长',
      rhymeExamples: ['ei韵：归、扉、违、飞、微', 'i韵：离、期、凄、迷、啼'],
      avoid: ['起句就哭，还没铺垫就抒情', '意象堆砌却无情感落点', '结尾说「再见」等口语']
    },
    春日: {
      intro: '五言绝句写春日，忌空洞赞春。起句从一花一草切入，承句展开春意，转句写春之短暂，合句以情收束。五字一句，字字精炼。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以春眠入笔，写春日慵懒惬意', example: '春眠不觉晓', themeHint: '孟浩然《春晓》' },
        { position: '第二句（承）', role: '承', description: '承接春眠，写清晨鸟鸣的生机', example: '处处闻啼鸟', themeHint: '孟浩然《春晓》' },
        { position: '第三句（转）', role: '转', description: '转写夜雨，打破白日的明朗', example: '夜来风雨声', themeHint: '孟浩然《春晓》' },
        { position: '第四句（合）', role: '合', description: '以落花收束，感叹春光易逝', example: '花落知多少', themeHint: '孟浩然《春晓》' }
      ],
      tips: ['写春不写春字：借「柳绿」「桃红」让春意自现', '动静结合：蜂蝶忙而人静', '转句可引入「春将尽」「落花」', '结尾可宕入人事增加生活气息'],
      rhyme: '咏春常用「ao」韵（晓、鸟、少等），韵脚明快',
      rhymeExamples: ['ao韵：晓、鸟、少、早、好', 'an韵：天、山、烟、寒、斓'],
      avoid: ['开篇就是「春天真美」等空洞感叹', '把所有春日意象全塞进去', '只有景没有情']
    },
    山水: {
      intro: '五言绝句写山水，山高水长、境随心转。起句从具体景观切入，承句移步换景，转句借山水言志，合句留白深远。五字一句，意境空灵。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以空山入笔，营造幽静氛围', example: '空山不见人', themeHint: '王维《鹿柴》' },
        { position: '第二句（承）', role: '承', description: '承接空山，写人语声反衬寂静', example: '但闻人语响', themeHint: '王维《鹿柴》' },
        { position: '第三句（转）', role: '转', description: '转写光影，以动写静', example: '返景入深林', themeHint: '王维《鹿柴》' },
        { position: '第四句（合）', role: '合', description: '以青苔收束，留白深远', example: '复照青苔上', themeHint: '王维《鹿柴》' }
      ],
      tips: ['以动写静：「鸟鸣山更幽」更有张力', '远近层次：近处细草，远处孤云', '转句可引入「人」衬山之静', '结尾留白：「独坐」「忘言」更耐读'],
      rhyme: '山水诗常用「ang」韵（响、上等），韵致幽深',
      rhymeExamples: ['ang韵：响、上、苍、茫、长', 'e韵：色、壑、泽、白、鹤'],
      avoid: ['按游记顺序罗列山名水名', '全诗只有山水没有「我」', '结尾强行升华']
    },
    怀古: {
      intro: '五言绝句写怀古，借古讽今、寄意深远。起句从古迹切入，承句回顾历史，转句宕开感慨，合句以理收束。五字一句，发人深省。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以怀古入笔，点明古迹', example: '此地别燕丹', themeHint: '骆宾王《于易水送人》' },
        { position: '第二句（承）', role: '承', description: '承接古迹，写壮士发冲冠的悲壮', example: '壮士发冲冠', themeHint: '骆宾王《于易水送人》' },
        { position: '第三句（转）', role: '转', description: '转写昔时人已没，以古衬今', example: '昔时人已没', themeHint: '骆宾王《于易水送人》' },
        { position: '第四句（合）', role: '合', description: '以今日水犹寒收束，感慨今昔', example: '今日水犹寒', themeHint: '骆宾王《于易水送人》' }
      ],
      tips: ['选好角度：以小见大', '古今对比：在「变与不变」中找立意', '转句宕开议论，点明主旨', '结尾可用反问增加思辨'],
      rhyme: '怀古常用「an」韵（丹、冠、寒等），声调铿锵',
      rhymeExamples: ['an韵：丹、冠、寒、难、还', 'ia韵：霞、遐、夸、槎'],
      avoid: ['写成历史复述没有感慨', '堆砌古人古事无统一主题', '结尾说教味太重']
    },
    边塞: {
      intro: '五言绝句写边塞，苍凉悲壮、气势雄浑。起句从边关景象切入，承句写戍边艰辛，转句宕开写思乡或壮志，合句以景结情。五字一句，慷慨激昂。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以月黑雁飞入笔，写边塞夜色', example: '月黑雁飞高', themeHint: '卢纶《塞下曲》' },
        { position: '第二句（承）', role: '承', description: '承接夜景，写敌军夜遁的紧张', example: '单于夜遁逃', themeHint: '卢纶《塞下曲》' },
        { position: '第三句（转）', role: '转', description: '转写欲将轻骑逐，以动写静', example: '欲将轻骑逐', themeHint: '卢纶《塞下曲》' },
        { position: '第四句（合）', role: '合', description: '以大雪满弓刀收束，写边塞苦寒', example: '大雪满弓刀', themeHint: '卢纶《塞下曲》' }
      ],
      tips: ['以边关意象入笔：月黑、雁飞、大雪、弓刀', '写戍边艰辛而不失壮志', '转句可写追击或思乡', '合句以景结情，苍凉悲壮'],
      rhyme: '边塞诗常用「ao」韵（高、逃、刀等），声调铿锵',
      rhymeExamples: ['ao韵：高、逃、刀、劳、豪', 'ang韵：苍、茫、长、凉、阳'],
      avoid: ['只写苦寒没有壮志', '堆砌边塞意象无情感', '结尾过于悲观']
    },
    田园: {
      intro: '五言绝句写田园，恬淡自然、闲适悠远。起句从田园生活切入，承句写农事或闲居，转句宕开写心境，合句以景结情。五字一句，清新淡雅。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以田园生活入笔，点明场景', example: '种豆南山下', themeHint: '陶渊明《归园田居》' },
        { position: '第二句（承）', role: '承', description: '承接农事，写劳作的艰辛', example: '草盛豆苗稀', themeHint: '陶渊明《归园田居》' },
        { position: '第三句（转）', role: '转', description: '转写晨兴暮归，以动写静', example: '晨兴理荒秽', themeHint: '陶渊明《归园田居》' },
        { position: '第四句（合）', role: '合', description: '以带月归收束，写田园之乐', example: '带月荷锄归', themeHint: '陶渊明《归园田居》' }
      ],
      tips: ['以田园意象入笔：豆苗、锄头、月光', '写农事艰辛而不失闲适', '转句可写心境或自然', '合句以景结情，恬淡悠远'],
      rhyme: '田园诗常用「i」韵（稀、归等），韵致清新',
      rhymeExamples: ['i韵：稀、归、衣、飞、微', 'ei韵：归、扉、违、飞'],
      avoid: ['只写劳作没有闲适', '堆砌田园意象无情感', '结尾过于沉重']
    },
    咏物: {
      intro: '五言绝句写咏物，托物言志、借物抒情。起句从物象特征切入，承句铺陈描写，转句宕开写寓意，合句点明主旨。五字一句，形神兼备。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以物象特征入笔，点明描写对象', example: '垂緌饮清露', themeHint: '虞世南《蝉》' },
        { position: '第二句（承）', role: '承', description: '承接物象，写其高洁姿态', example: '流响出疏桐', themeHint: '虞世南《蝉》' },
        { position: '第三句（转）', role: '转', description: '转写居高声远，以物喻人', example: '居高声自远', themeHint: '虞世南《蝉》' },
        { position: '第四句（合）', role: '合', description: '以非藉秋风收束，点明品格', example: '非是藉秋风', themeHint: '虞世南《蝉》' }
      ],
      tips: ['以物象特征入笔：形、色、声、态', '写物之形更要传其神', '转句以物喻人，托物言志', '合句点明主旨，借物抒情'],
      rhyme: '咏物诗常用「ong」韵（桐、风等），韵致清越',
      rhymeExamples: ['ong韵：桐、风、空、中、同', 'eng韵：声、清、明、生、情'],
      avoid: ['只写物象没有寓意', '堆砌描写无情感寄托', '结尾过于直白']
    }
  },
  '七言绝句': {
    思乡: {
      intro: '七言绝句写思乡，以景托情、情景交融。起句从故乡景物或旅途所见切入，承句铺陈离愁，转句宕开写时空之隔，合句以情收束。七字一句，意境开阔。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以日暮乡关入笔，营造苍茫氛围', example: '日暮乡关何处是', themeHint: '崔颢《黄鹤楼》' },
        { position: '第二句（承）', role: '承', description: '承接乡关，写烟波江上的愁绪', example: '烟波江上使人愁', themeHint: '崔颢《黄鹤楼》' },
        { position: '第三句（转）', role: '转', description: '转写黄鹤一去，以古衬今', example: '黄鹤一去不复返', themeHint: '崔颢《黄鹤楼》' },
        { position: '第四句（合）', role: '合', description: '以白云千载收束，感慨时空', example: '白云千载空悠悠', themeHint: '崔颢《黄鹤楼》' }
      ],
      tips: ['以「乡」字为情感内核，寄托在具体景物上', '用空间对比强化乡愁', '善用听觉意象触发乡情', '结尾可用「归」字意象收束'],
      rhyme: '思乡诗多押「ou」韵（愁、悠等），韵脚悠长',
      rhymeExamples: ['ou韵：愁、悠、楼、舟、流', 'an韵：山、关、还、寒、难'],
      avoid: ['直呼「想家」等空洞情感词', '把故乡写成完美仙境', '首句就写思念，起得太急']
    },
    离别: {
      intro: '七言绝句写离别，以景写情、含而不露。起句交代送别场景，承句铺陈离愁，转句宕开写别后，合句以景结情。七字一句，情意绵长。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以渭城朝雨入笔，点明送别场景', example: '渭城朝雨浥轻尘', themeHint: '王维《渭城曲》' },
        { position: '第二句（承）', role: '承', description: '承接送别，写客舍青青的清新', example: '客舍青青柳色新', themeHint: '王维《渭城曲》' },
        { position: '第三句（转）', role: '转', description: '转写劝酒，以动作写情', example: '劝君更尽一杯酒', themeHint: '王维《渭城曲》' },
        { position: '第四句（合）', role: '合', description: '以西出阳关收束，感慨别离', example: '西出阳关无故人', themeHint: '王维《渭城曲》' }
      ],
      tips: ['离别起点是景——长亭、古道、渡口', '用具体动作代替抽象情感', '转句可宕开写别后', '合句以景结情，余韵绵长'],
      rhyme: '送别诗常用「en/in」韵（尘、新、人等），韵脚悠长',
      rhymeExamples: ['en韵：尘、人、春、门、痕', 'in韵：新、人、亲、邻、频'],
      avoid: ['起句就哭，还没铺垫就抒情', '意象堆砌却无情感落点', '结尾说「再见」等口语']
    },
    春日: {
      intro: '七言绝句写春日，忌空洞赞春。起句从一花一草切入，承句展开春意，转句写春之短暂，合句以情收束。七字一句，生机盎然。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以两个黄鹂入笔，写春日生机', example: '两个黄鹂鸣翠柳', themeHint: '杜甫《绝句》' },
        { position: '第二句（承）', role: '承', description: '承接春景，写一行白鹭的灵动', example: '一行白鹭上青天', themeHint: '杜甫《绝句》' },
        { position: '第三句（转）', role: '转', description: '转写窗含西岭，以静写动', example: '窗含西岭千秋雪', themeHint: '杜甫《绝句》' },
        { position: '第四句（合）', role: '合', description: '以门泊东吴收束，写春日闲适', example: '门泊东吴万里船', themeHint: '杜甫《绝句》' }
      ],
      tips: ['写春不写春字：借具体意象让春意自现', '动静结合：蜂蝶忙而人静', '转句可引入「春将尽」「落花」', '结尾可宕入人事增加生活气息'],
      rhyme: '咏春常用「an」韵（天、船等），韵脚明快',
      rhymeExamples: ['an韵：天、船、山、烟、寒', 'ang韵：长、香、忙、苍、妆'],
      avoid: ['开篇就是「春天真美」等空洞感叹', '把所有春日意象全塞进去', '只有景没有情']
    },
    山水: {
      intro: '七言绝句写山水，山高水长、境随心转。起句从具体景观切入，承句移步换景，转句借山水言志，合句留白深远。七字一句，气势磅礴。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以朝辞白帝入笔，写清晨启程', example: '朝辞白帝彩云间', themeHint: '李白《早发白帝城》' },
        { position: '第二句（承）', role: '承', description: '承接启程，写千里江陵的迅疾', example: '千里江陵一日还', themeHint: '李白《早发白帝城》' },
        { position: '第三句（转）', role: '转', description: '转写猿声，以声衬景', example: '两岸猿声啼不住', themeHint: '李白《早发白帝城》' },
        { position: '第四句（合）', role: '合', description: '以轻舟过万山收束，写畅快心境', example: '轻舟已过万重山', themeHint: '李白《早发白帝城》' }
      ],
      tips: ['以动写静：「鸟鸣山更幽」更有张力', '远近层次：近处细草，远处孤云', '转句可引入「人」衬山之静', '结尾留白：「独坐」「忘言」更耐读'],
      rhyme: '山水诗常用「an」韵（间、还、山等），韵致幽深',
      rhymeExamples: ['an韵：间、还、山、关、寒', 'ian韵：天、烟、前、边、连'],
      avoid: ['按游记顺序罗列山名水名', '全诗只有山水没有「我」', '结尾强行升华']
    },
    怀古: {
      intro: '七言绝句写怀古，借古讽今、寄意深远。起句从古迹切入，承句回顾历史，转句宕开感慨，合句以理收束。七字一句，发人深省。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以烟笼寒水入笔，点明怀古场景', example: '烟笼寒水月笼沙', themeHint: '杜牧《泊秦淮》' },
        { position: '第二句（承）', role: '承', description: '承接夜景，写夜泊秦淮的寂寥', example: '夜泊秦淮近酒家', themeHint: '杜牧《泊秦淮》' },
        { position: '第三句（转）', role: '转', description: '转写商女，以歌写史', example: '商女不知亡国恨', themeHint: '杜牧《泊秦淮》' },
        { position: '第四句（合）', role: '合', description: '以隔江犹唱收束，感慨今昔', example: '隔江犹唱后庭花', themeHint: '杜牧《泊秦淮》' }
      ],
      tips: ['选好角度：以小见大', '古今对比：在「变与不变」中找立意', '转句宕开议论，点明主旨', '结尾可用反问增加思辨'],
      rhyme: '怀古常用「a」韵（沙、家、花等），声调铿锵',
      rhymeExamples: ['a韵：沙、家、花、斜、嗟', 'ia韵：霞、遐、夸、槎'],
      avoid: ['写成历史复述没有感慨', '堆砌古人古事无统一主题', '结尾说教味太重']
    },
    边塞: {
      intro: '七言绝句写边塞，苍凉悲壮、气势雄浑。起句从边关景象切入，承句写戍边艰辛，转句宕开写思乡或壮志，合句以景结情。七字一句，慷慨激昂。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以秦时明月入笔，写边关苍凉', example: '秦时明月汉时关', themeHint: '王昌龄《出塞》' },
        { position: '第二句（承）', role: '承', description: '承接边塞，写万里长征的艰辛', example: '万里长征人未还', themeHint: '王昌龄《出塞》' },
        { position: '第三句（转）', role: '转', description: '转写龙城飞将，以古衬今', example: '但使龙城飞将在', themeHint: '王昌龄《出塞》' },
        { position: '第四句（合）', role: '合', description: '以不教胡马收束，点明壮志', example: '不教胡马度阴山', themeHint: '王昌龄《出塞》' }
      ],
      tips: ['以边关意象入笔：明月、关山、烽火', '写戍边艰辛而不失壮志', '转句可写思乡或壮志', '合句以景结情，苍凉悲壮'],
      rhyme: '边塞诗常用「an」韵（关、还、山等），声调铿锵',
      rhymeExamples: ['an韵：关、还、山、寒、难', 'ang韵：苍、茫、长、凉、阳'],
      avoid: ['只写苦寒没有壮志', '堆砌边塞意象无情感', '结尾过于悲观']
    },
    田园: {
      intro: '七言绝句写田园，恬淡自然、闲适悠远。起句从田园生活切入，承句写农事或闲居，转句宕开写心境，合句以景结情。七字一句，清新淡雅。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以草长莺飞入笔，写春日田园', example: '草长莺飞二月天', themeHint: '高鼎《村居》' },
        { position: '第二句（承）', role: '承', description: '承接春景，写拂堤杨柳的生机', example: '拂堤杨柳醉春烟', themeHint: '高鼎《村居》' },
        { position: '第三句（转）', role: '转', description: '转写儿童，以人衬景', example: '儿童散学归来早', themeHint: '高鼎《村居》' },
        { position: '第四句（合）', role: '合', description: '以忙趁东风收束，写田园之乐', example: '忙趁东风放纸鸢', themeHint: '高鼎《村居》' }
      ],
      tips: ['以田园意象入笔：草长、莺飞、杨柳', '写农事艰辛而不失闲适', '转句可写心境或自然', '合句以景结情，恬淡悠远'],
      rhyme: '田园诗常用「an」韵（天、烟、鸢等），韵致清新',
      rhymeExamples: ['an韵：天、烟、鸢、山、田', 'ian韵：天、烟、鸢、边、前'],
      avoid: ['只写劳作没有闲适', '堆砌田园意象无情感', '结尾过于沉重']
    },
    咏物: {
      intro: '七言绝句写咏物，托物言志、借物抒情。起句从物象特征切入，承句铺陈描写，转句宕开写寓意，合句点明主旨。七字一句，形神兼备。',
      structure: [
        { position: '第一句（起）', role: '起', description: '以物象特征入笔，点明描写对象', example: '千锤万凿出深山', themeHint: '于谦《石灰吟》' },
        { position: '第二句（承）', role: '承', description: '承接物象，写其坚韧品质', example: '烈火焚烧若等闲', themeHint: '于谦《石灰吟》' },
        { position: '第三句（转）', role: '转', description: '转写粉骨碎身，以物喻人', example: '粉骨碎身浑不怕', themeHint: '于谦《石灰吟》' },
        { position: '第四句（合）', role: '合', description: '以留清白收束，点明品格', example: '要留清白在人间', themeHint: '于谦《石灰吟》' }
      ],
      tips: ['以物象特征入笔：形、色、声、态', '写物之形更要传其神', '转句以物喻人，托物言志', '合句点明主旨，借物抒情'],
      rhyme: '咏物诗常用「an」韵（山、闲、间等），韵致清越',
      rhymeExamples: ['an韵：山、闲、间、颜、艰', 'ian韵：间、颜、艰、山、闲'],
      avoid: ['只写物象没有寓意', '堆砌描写无情感寄托', '结尾过于直白']
    }
  },
  '五言律诗': {
    思乡: {
      intro: '五言律诗写思乡，以景托情、情景交融。八句分四联：首联起笔，颔联承接，颈联转折，尾联收束。五字一句，对仗工整，格律严谨。',
      structure: [
        { position: '首联（起）', role: '起', description: '以国破山河入笔，营造苍凉氛围', example: '国破山河在', themeHint: '杜甫《春望》' },
        { position: '首联（起）', role: '起', description: '承接首句，写城春草木的荒芜', example: '城春草木深', themeHint: '杜甫《春望》' },
        { position: '颔联（承）', role: '承', description: '以感时花溅泪承接，情景交融', example: '感时花溅泪', themeHint: '杜甫《春望》' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写恨别鸟惊心的愁绪', example: '恨别鸟惊心', themeHint: '杜甫《春望》' },
        { position: '颈联（转）', role: '转', description: '转写烽火连三月，以时写情', example: '烽火连三月', themeHint: '杜甫《春望》' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写家书抵万金的珍贵', example: '家书抵万金', themeHint: '杜甫《春望》' },
        { position: '尾联（合）', role: '合', description: '以白头搔更短收束，写愁苦之态', example: '白头搔更短', themeHint: '杜甫《春望》' },
        { position: '尾联（合）', role: '合', description: '以浑欲不胜簪收束，点明思乡之苦', example: '浑欲不胜簪', themeHint: '杜甫《春望》' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '五律押韵在二、四、六、八句末，首句可押可不押',
      rhymeExamples: ['深、心、金、簪（en/in韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    },
    离别: {
      intro: '五言律诗写离别，以景写情、含而不露。八句分四联，首联起笔，颔联承接，颈联转折，尾联收束。五字一句，情意绵长。',
      structure: [
        { position: '首联（起）', role: '起', description: '以相送入笔，点明送别场景', example: '相送情无限', themeHint: '通用离别诗' },
        { position: '首联（起）', role: '起', description: '承接首句，写沾巾的离愁', example: '沾巾此路歧', themeHint: '通用离别诗' },
        { position: '颔联（承）', role: '承', description: '以风尘承接，写旅途艰辛', example: '风尘何处客', themeHint: '通用离别诗' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写江汉的辽远', example: '江汉别离时', themeHint: '通用离别诗' },
        { position: '颈联（转）', role: '转', description: '转写云山，以景写情', example: '云山从此隔', themeHint: '通用离别诗' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写音信的渺茫', example: '音信自难期', themeHint: '通用离别诗' },
        { position: '尾联（合）', role: '合', description: '以相望收束，写别后思念', example: '但令心似水', themeHint: '通用离别诗' },
        { position: '尾联（合）', role: '合', description: '以万里收束，点明情深', example: '万里共清辉', themeHint: '通用离别诗' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '五律押韵在二、四、六、八句末',
      rhymeExamples: ['歧、时、期、辉（i韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    },
    山水: {
      intro: '五言律诗写山水，山高水长、境随心转。八句分四联，首联起笔，颔联承接，颈联转折，尾联收束。五字一句，意境空灵。',
      structure: [
        { position: '首联（起）', role: '起', description: '以空山入笔，营造幽静氛围', example: '空山新雨后', themeHint: '王维《山居秋暝》' },
        { position: '首联（起）', role: '起', description: '承接首句，写天气晚来秋的清凉', example: '天气晚来秋', themeHint: '王维《山居秋暝》' },
        { position: '颔联（承）', role: '承', description: '以明月松间照承接，写山间夜景', example: '明月松间照', themeHint: '王维《山居秋暝》' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写清泉石上流的灵动', example: '清泉石上流', themeHint: '王维《山居秋暝》' },
        { position: '颈联（转）', role: '转', description: '转写竹喧归浣女，以人衬景', example: '竹喧归浣女', themeHint: '王维《山居秋暝》' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写莲动下渔舟的生机', example: '莲动下渔舟', themeHint: '王维《山居秋暝》' },
        { position: '尾联（合）', role: '合', description: '以随意春芳歇收束，写心境', example: '随意春芳歇', themeHint: '王维《山居秋暝》' },
        { position: '尾联（合）', role: '合', description: '以王孙自可留收束，点明归隐', example: '王孙自可留', themeHint: '王维《山居秋暝》' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '五律押韵在二、四、六、八句末',
      rhymeExamples: ['秋、流、舟、留（iu/ou韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    }
  },
  '七言律诗': {
    思乡: {
      intro: '七言律诗写思乡，以景托情、情景交融。八句分四联：首联起笔，颔联承接，颈联转折，尾联收束。七字一句，对仗工整，格律严谨。',
      structure: [
        { position: '首联（起）', role: '起', description: '以风急天高入笔，营造苍凉氛围', example: '风急天高猿啸哀', themeHint: '杜甫《登高》' },
        { position: '首联（起）', role: '起', description: '承接首句，写渚清沙白的寥廓', example: '渚清沙白鸟飞回', themeHint: '杜甫《登高》' },
        { position: '颔联（承）', role: '承', description: '以无边落木承接，写秋景萧瑟', example: '无边落木萧萧下', themeHint: '杜甫《登高》' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写不尽长江的壮阔', example: '不尽长江滚滚来', themeHint: '杜甫《登高》' },
        { position: '颈联（转）', role: '转', description: '转写万里悲秋，以情写景', example: '万里悲秋常作客', themeHint: '杜甫《登高》' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写百年多病的愁苦', example: '百年多病独登台', themeHint: '杜甫《登高》' },
        { position: '尾联（合）', role: '合', description: '以艰难苦恨收束，写人生感慨', example: '艰难苦恨繁霜鬓', themeHint: '杜甫《登高》' },
        { position: '尾联（合）', role: '合', description: '以潦倒新停收束，点明思乡之苦', example: '潦倒新停浊酒杯', themeHint: '杜甫《登高》' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '七律押韵在二、四、六、八句末，首句可押可不押',
      rhymeExamples: ['哀、回、来、台、杯（ai/ei韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    },
    离别: {
      intro: '七言律诗写离别，以景写情、含而不露。八句分四联，首联起笔，颔联承接，颈联转折，尾联收束。七字一句，情意绵长。',
      structure: [
        { position: '首联（起）', role: '起', description: '以城阙辅三秦入笔，点明送别场景', example: '城阙辅三秦', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '首联（起）', role: '起', description: '承接首句，写风烟望五津的辽远', example: '风烟望五津', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '颔联（承）', role: '承', description: '以与君离别意承接，写离情', example: '与君离别意', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写同是宦游人的感慨', example: '同是宦游人', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '颈联（转）', role: '转', description: '转写海内存知己，以理写情', example: '海内存知己', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写天涯若比邻的豁达', example: '天涯若比邻', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '尾联（合）', role: '合', description: '以无为在歧路收束，写别后', example: '无为在歧路', themeHint: '王勃《送杜少府之任蜀州》' },
        { position: '尾联（合）', role: '合', description: '以儿女共沾巾收束，点明洒脱', example: '儿女共沾巾', themeHint: '王勃《送杜少府之任蜀州》' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '七律押韵在二、四、六、八句末',
      rhymeExamples: ['津、人、邻、巾（in/en韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    },
    山水: {
      intro: '七言律诗写山水，山高水长、境随心转。八句分四联，首联起笔，颔联承接，颈联转折，尾联收束。七字一句，气势磅礴。',
      structure: [
        { position: '首联（起）', role: '起', description: '以孤山寺北入笔，点明游览地点', example: '孤山寺北贾亭西', themeHint: '白居易《钱塘湖春行》' },
        { position: '首联（起）', role: '起', description: '承接首句，写水面初平的春景', example: '水面初平云脚低', themeHint: '白居易《钱塘湖春行》' },
        { position: '颔联（承）', role: '承', description: '以几处早莺承接，写春日生机', example: '几处早莺争暖树', themeHint: '白居易《钱塘湖春行》' },
        { position: '颔联（承）', role: '承', description: '承接颔联，写谁家新燕的灵动', example: '谁家新燕啄春泥', themeHint: '白居易《钱塘湖春行》' },
        { position: '颈联（转）', role: '转', description: '转写乱花渐欲，以景写情', example: '乱花渐欲迷人眼', themeHint: '白居易《钱塘湖春行》' },
        { position: '颈联（转）', role: '转', description: '承接颈联，写浅草才能的春意', example: '浅草才能没马蹄', themeHint: '白居易《钱塘湖春行》' },
        { position: '尾联（合）', role: '合', description: '以最爱湖东收束，写游览之乐', example: '最爱湖东行不足', themeHint: '白居易《钱塘湖春行》' },
        { position: '尾联（合）', role: '合', description: '以绿杨阴里收束，点明留恋', example: '绿杨阴里白沙堤', themeHint: '白居易《钱塘湖春行》' }
      ],
      tips: ['首联点题，营造氛围', '颔联承接，对仗工整', '颈联转折，情感深化', '尾联收束，余韵悠长'],
      rhyme: '七律押韵在二、四、六、八句末',
      rhymeExamples: ['西、低、泥、蹄、堤（i韵）', '韵脚要平声，对仗要工整'],
      avoid: ['颔联颈联不对仗', '格律不严谨', '情感没有层次']
    }
  }
};

function buildStructureData(genre, theme, keywords, mood) {
  const config = GENRE_CONFIG[genre] || { lines: 4, charactersPerLine: 5 };
  const t = theme || '';
  const kw = keywords || [];

  let matchedTheme = null;
  const genreExamples = STRUCTURE_EXAMPLES[genre] || STRUCTURE_EXAMPLES['五言绝句'];
  
  const themeKeys = ['思乡', '离别', '春日', '山水', '怀古', '边塞', '田园', '咏物'];
  for (const key of themeKeys) {
    if (t.includes(key) || kw.some(k => k.includes(key))) {
      matchedTheme = key;
      break;
    }
  }
  
  if (!matchedTheme) {
    if (t.includes('秋') || t.includes('月')) matchedTheme = '思乡';
    else if (t.includes('送') || t.includes('别')) matchedTheme = '离别';
    else if (t.includes('春') || t.includes('花')) matchedTheme = '春日';
    else if (t.includes('山') || t.includes('水') || t.includes('江')) matchedTheme = '山水';
    else matchedTheme = '山水';
  }

  const themeData = genreExamples[matchedTheme] || genreExamples['山水'];

  return {
    name: genre,
    lines: config.lines,
    charactersPerLine: config.charactersPerLine,
    rhymeScheme: config.charactersPerLine === 5 ? '二四句押韵' : '二四句押韵',
    introduction: themeData.intro,
    structure: themeData.structure,
    tips: themeData.tips,
    rhyme: themeData.rhyme,
    rhymeExamples: themeData.rhymeExamples,
    keywordSuggestions: kw.slice(0, 3).map(kwItem => ({
      keyword: kwItem,
      usage: `「${kwItem}」适合用在承句或转句中，配合其他意象共同呈现主题`
    })),
    avoid: themeData.avoid || ['直接抒发抽象情感而不借助具体意象', '堆砌意象却没有情感主线', '四句都在一个层面，缺乏起伏'],
    advancedTips: [
      '以动写静手法——用具体动态反衬主题的静谧感',
      '虚实相生——眼前实景与心中虚景交织',
      '对写法——从对方视角写，增强情感张力'
    ]
  };
}

export default {
  name: 'StructureGuide',
  props: {
    genre: {
      type: String,
      required: true
    },
    theme: {
      type: String,
      default: ''
    },
    keywords: {
      type: Array,
      default: () => []
    },
    mood: {
      type: String,
      default: ''
    }
  },
  emits: ['load', 'back', 'start'],
  setup(props, { emit }) {
    const structure = ref(null);
    const localLoading = ref(false);

    const loadStructure = async () => {
      localLoading.value = true;
      try {
        const response = await api.creationWorkbench.getStructureGuide({
          genre: props.genre,
          theme: props.theme,
          keywords: props.keywords,
          mood: props.mood
        });
        const result = response.data || response;
        if (!result?.structure?.length) throw new Error('结构引导数据不完整');
        structure.value = {
          ...buildStructureData(props.genre, props.theme, props.keywords, props.mood),
          ...result,
          // 后端结构字段与本地展示字段兼容，避免 AI 未返回示例时出现空内容。
          structure: result.structure.map((item, index) => ({
            ...item,
            role: item.role || ['起', '承', '转', '合'][index] || '续',
            example: item.example || ''
          }))
        };
      } catch (error) {
        console.warn('获取 AI 结构引导失败，已使用本地结构模板：', error);
        structure.value = buildStructureData(props.genre, props.theme, props.keywords, props.mood);
      } finally {
        localLoading.value = false;
      }
    };

    watch([() => props.genre, () => props.theme], () => {
      if (props.genre && props.theme) {
        loadStructure();
      }
    });

    onMounted(() => {
      if (props.genre && props.theme) {
        loadStructure();
      }
    });

    return {
      structure,
      localLoading,
      loadStructure
    };
  }
};
</script>

<style scoped>
.structure-guide {
  padding: 24px;
}

/* 面板标题 */
.panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(139, 115, 85, 0.1);
}

.header-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(212, 165, 116, 0.15), rgba(139, 115, 85, 0.1));
  border-radius: 16px;
}

.header-text h2 {
  font-size: 22px;
  color: #5d4e37;
  margin: 0 0 4px 0;
  font-family: 'Noto Serif SC', serif;
}

.header-text p {
  font-size: 14px;
  color: #8b7355;
  margin: 0;
}

/* 结构信息 */
.structure-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.structure-header-card {
  background: linear-gradient(135deg, rgba(139, 115, 85, 0.08), rgba(212, 165, 116, 0.12));
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.structure-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.structure-title h3 {
  font-size: 24px;
  color: #5d4e37;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

.structure-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-radius: 20px;
  font-size: 13px;
}

.ai-badge {
  background: linear-gradient(135deg, #7c9eb2, #5a7a8c);
}

.structure-intro {
  font-size: 15px;
  color: #5d4e37;
  line-height: 1.8;
  margin: 0;
}

/* 流程标题 */
.flow-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.1);
}

.flow-icon {
  font-size: 20px;
}

.flow-title h3 {
  font-size: 18px;
  color: #5d4e37;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

/* 结构流程 */
.structure-flow {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 115, 85, 0.12);
}

.structure-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.structure-node {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
  padding: 20px;
  background: rgba(245, 239, 230, 0.5);
  border-radius: 16px;
  border: 1px solid rgba(139, 115, 85, 0.08);
  animation: fadeInUp 0.6s ease-out;
}

.node-number {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.node-content {
  flex: 1;
}

.node-role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.role-起 { background: linear-gradient(135deg, #e6a857, #d4914a); }
.role-承 { background: linear-gradient(135deg, #6b9e78, #5a8a66); }
.role-转 { background: linear-gradient(135deg, #7a9ec7, #6589b5); }
.role-合 { background: linear-gradient(135deg, #c77d8e, #b36b7a); }

.node-title {
  font-size: 16px;
  color: #5d4e37;
  margin: 0 0 6px 0;
  font-family: 'Noto Serif SC', serif;
}

.node-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.node-theme-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(122, 158, 199, 0.1), rgba(101, 137, 181, 0.08));
  border-radius: 10px;
  margin-bottom: 12px;
  border-left: 3px solid #7a9ec7;
}

.hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.hint-text {
  font-size: 13px;
  color: #5d4e37;
  line-height: 1.5;
}

.node-example {
  background: rgba(245, 239, 230, 0.8);
  padding: 12px 16px;
  border-radius: 10px;
  border-left: 3px solid #d4a574;
}

.example-label {
  font-size: 12px;
  color: #b8a88a;
  display: block;
  margin-bottom: 4px;
}

.example-text {
  font-size: 15px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  font-style: italic;
}

.structure-connector {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

/* 通用section样式 */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 20px;
}

.section-header h3 {
  font-size: 16px;
  color: #5d4e37;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

/* 关键词建议 */
.keyword-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 115, 85, 0.12);
}

.keyword-suggestions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keyword-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(212, 165, 116, 0.06);
  border-radius: 12px;
}

.keyword-tag {
  padding: 6px 14px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.keyword-usage {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 写作技巧 */
.tips-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 115, 85, 0.12);
}

.tips-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(212, 165, 116, 0.06);
  border-radius: 12px;
}

.tip-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 韵律提示 */
.rhyme-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 115, 85, 0.12);
}

.rhyme-content p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 14px 0;
}

.rhyme-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.rhyme-tag {
  padding: 8px 14px;
  background: rgba(212, 165, 116, 0.12);
  border-radius: 16px;
  font-size: 13px;
  color: #8b7355;
}

/* 避免的错误 */
.avoid-section {
  background: rgba(255, 245, 245, 0.9);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(199, 125, 142, 0.2);
}

.avoid-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.avoid-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(199, 125, 142, 0.08);
  border-radius: 10px;
}

.avoid-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c77d8e;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.avoid-text {
  font-size: 14px;
  color: #8b5a5a;
  line-height: 1.5;
}

/* 进阶技巧 */
.advanced-section {
  background: linear-gradient(135deg, rgba(122, 158, 199, 0.08), rgba(101, 137, 181, 0.06));
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(122, 158, 199, 0.2);
}

.advanced-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advanced-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
}

.advanced-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7a9ec7, #6589b5);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.advanced-text {
  font-size: 14px;
  color: #4a5a6a;
  line-height: 1.6;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}

.back-btn,
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.back-btn {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(139, 115, 85, 0.2);
  color: #8b7355;
}

.back-btn:hover {
  background: rgba(139, 115, 85, 0.1);
  border-color: #8b7355;
}

.start-btn {
  flex: 1;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  border: none;
  color: white;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(139, 115, 85, 0.3);
}

.arrow {
  transition: transform 0.3s ease;
}

.start-btn:hover .arrow {
  transform: translateX(5px);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
}

.loading-spinner-large {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(139, 115, 85, 0.2);
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 15px;
  color: #8b7355;
}

/* 默认提示 */
.load-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  border: 2px dashed rgba(139, 115, 85, 0.2);
}

.prompt-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.load-prompt h3 {
  font-size: 20px;
  color: #5d4e37;
  margin: 0 0 8px 0;
  font-family: 'Noto Serif SC', serif;
}

.load-prompt p {
  font-size: 14px;
  color: #8b7355;
  margin: 0 0 24px 0;
}

.load-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #8b7355, #a08060);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.load-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(139, 115, 85, 0.3);
}

.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .structure-guide {
    padding: 16px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .back-btn {
    order: 2;
  }

  .start-btn {
    order: 1;
  }
}
</style>
