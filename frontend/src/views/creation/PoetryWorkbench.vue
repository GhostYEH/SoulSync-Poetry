<template>
  <div class="poetry-workbench">
    <div class="ink-background">
      <div class="ink-blob" v-for="i in 6" :key="i" :class="`blob-${i}`"></div>
    </div>

    <!-- 新的创作入口：场景先建立情绪，工作区再承接流程。 -->
    <section class="workbench-intro">
      <div class="workbench-intro-copy">
        <span class="workbench-eyebrow">CREATION STUDIO / 诗意工作室</span>
        <h1>让灵感，<em>慢慢成诗</em></h1>
        <p>把一个念头交给 AI，先看见它的情绪与骨架，再把最后一句留给自己。</p>
        <div class="intro-signature">
          <span class="signature-seal">灵</span>
          <span><strong>今日创作</strong><small>从一处意象开始</small></span>
        </div>
      </div>
      <figure class="workbench-scene">
        <div class="scene-marquee" aria-hidden="true">
          <img :src="sceneArt" alt="" />
          <img :src="sceneArt" alt="" />
          <img :src="sceneArt" alt="" />
        </div>
        <div class="scene-wash"></div>
        <figcaption><span>一境入诗</span><small>山水会替你保留第一缕情绪</small></figcaption>
      </figure>
    </section>

    <section class="mode-selector" aria-label="选择创作方式">
      <div class="mode-selector-heading">
        <span class="workbench-eyebrow">CHOOSE A RHYTHM</span>
        <strong>你想怎样开始？</strong>
        <small>流程不变，入口换成更像创作的选择</small>
      </div>
      <div class="mode-track">
        <button
        v-for="mode in modes"
        :key="mode.id"
        :class="['mode-card', { active: currentMode === mode.id }]"
        @click="switchMode(mode.id)"
        :aria-pressed="currentMode === mode.id"
      >
          <span class="mode-index">{{ String(modes.indexOf(mode) + 1).padStart(2, '0') }}</span>
          <span class="mode-icon">{{ mode.icon }}</span>
          <span class="mode-info"><strong>{{ mode.title }}</strong><small>{{ mode.desc }}</small></span>
          <span class="mode-badge" v-if="mode.badge">{{ mode.badge }}</span>
          <span class="mode-active-mark" aria-hidden="true">↗</span>
        </button>
      </div>
    </section>

    <section class="creative-stage">
      <aside class="stage-rail">
        <div class="stage-rail-heading"><span>THE MAKING</span><strong>创作进度</strong></div>
        <ol v-if="currentMode === 'guided'" class="step-indicator">
          <li
            v-for="(step, index) in steps"
            :key="index"
            :class="['step', { active: currentStep === index + 1, completed: currentStep > index + 1 }]"
          >
            <span class="step-number">{{ index + 1 }}</span>
            <span class="step-label"><strong>{{ step.label }}</strong><small>{{ index === 0 ? '先说出想写的事' : index === 1 ? '让情绪找到骨架' : '把句子写成作品' }}</small></span>
          </li>
        </ol>
        <div v-else class="alternate-rail">
          <span class="alternate-rail-icon">{{ activeMode?.icon }}</span>
          <strong>{{ activeMode?.title }}</strong>
          <p>{{ activeMode?.desc }}</p>
          <span class="alternate-rail-line"></span>
          <small>完成这一场创作后，可随时切回引导流程继续完善。</small>
        </div>
        <div class="stage-note">
          <span>此刻</span>
          <strong>{{ currentStepCopy }}</strong>
        </div>
        <div class="stage-rail-foot"><span class="status-pulse"></span> AI 灵感引擎在线</div>
      </aside>

      <div class="workspace">
        <div class="workspace-topline">
          <div><span class="workbench-eyebrow">NOW CREATING</span><strong>{{ activeMode?.title }}</strong></div>
          <span class="workspace-status">{{ currentMode === 'guided' ? `步骤 ${currentStep} / 3` : activeMode?.flow }}</span>
        </div>
        <div class="workflow-brief">
          <div class="workflow-brief-copy">
            <span>当前任务</span>
            <strong>{{ modeGuide.title }}</strong>
            <p>{{ modeGuide.description }}</p>
          </div>
          <div class="workflow-brief-pills" aria-label="本环节支持的 AI 能力">
            <span v-for="item in modeGuide.tools" :key="item">{{ item }}</span>
          </div>
        </div>

        <transition name="slide-fade" mode="out-in">
          <div v-if="currentMode === 'guided'" class="guided-workspace" key="guided">
            <div class="step-content">
              <InspirationPanel
                v-if="currentStep === 1"
                ref="inspirationPanel"
                :theme="poemDraft.theme"
                :genre="poemDraft.genre"
                :is-loading="isLoading"
                @update:theme="poemDraft.theme = $event"
                @update:genre="poemDraft.genre = $event"
                @generate="handleGenerateInspiration"
                @next="handleInspirationNext"
              />

              <StructureGuide
                v-else-if="currentStep === 2"
                :genre="poemDraft.genre"
                :theme="poemDraft.theme"
                :keywords="poemDraft.keywords"
                :mood="poemDraft.mood"
                @back="currentStep = 1"
                @start="currentStep = 3"
              />

              <PoemEditor
                v-else-if="currentStep === 3"
                ref="poemEditor"
                :title="poemDraft.title"
                :lines="poemDraft.lines"
                :genre="poemDraft.genre"
                :theme="poemDraft.theme"
                :keywords="poemDraft.keywords"
                :is-generating="isGenerating"
                :is-polishing="isPolishing"
                @update:title="poemDraft.title = $event"
                @update:lines="poemDraft.lines = $event"
                @recommend="handleRecommend"
                @generate="handleGeneratePoem"
                @polish="handlePolish"
                @score="handleScore"
                @save="handleSave"
                @back="currentStep = 2"
              />
            </div>
          </div>

          <div v-else-if="currentMode === 'feihua'" class="mode-workspace" key="feihua">
            <FeihuaMode
              ref="feihuaMode"
              :is-loading="isLoading"
              :score="currentScore"
              :keyword="feihuaDraft.keyword"
              :keyword-info="feihuaKeywordInfo"
              :is-polishing="isPolishing"
              :polish-result="polishResult"
              @update:title="feihuaDraft.title = $event"
              @update:content="feihuaDraft.content = $event"
              @score="handleFeihuaScore"
              @request-keyword="handleFeihuaKeyword"
              @change:keyword="feihuaDraft.keyword = $event"
              @polish="handleFeihuaPolish"
              @apply="handleFeihuaApplyPolish"
            />
          </div>

          <div v-else-if="currentMode === 'chain'" class="mode-workspace" key="chain">
            <ChainMode
              ref="chainMode"
              :is-loading="isLoading"
              @start="handleChainStart"
              @submit="handleChainSubmit"
              @end="handleChainEnd"
            />
          </div>
        </transition>
      </div>
    </section>

    <!-- 评分弹窗 -->
    <transition name="fade">
      <div class="score-overlay" v-if="showScorePanel" @click.self="showScorePanel = false">
        <div class="score-modal">
          <PoemScorer
            :score="currentScore"
            :show-polish="true"
            :is-polishing="isPolishing"
            :polish-result="polishResult"
            @close="showScorePanel = false"
            @save="handleSave"
            @polish="handlePolish"
            @apply="handleApplyPolish"
          />
        </div>
      </div>
    </transition>

    <!-- 打字机效果 -->
    <transition name="fade">
      <div class="typewriter-overlay" v-if="showTypewriter">
        <div class="typewriter-content">
          <div class="typewriter-icon">🖌️</div>
          <div class="typewriter-text">{{ typewriterText }}</div>
          <div class="typewriter-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import InspirationPanel from './components/InspirationPanel.vue';
import StructureGuide from './components/StructureGuide.vue';
import PoemEditor from './components/PoemEditor.vue';
import PoemScorer from './components/PoemScorer.vue';
import FeihuaMode from './components/FeihuaMode.vue';
import ChainMode from './components/ChainMode.vue';
import { api } from '../../services/api.js';
import { notify } from '../../services/appFeedback.js';
import sceneArt from '../../assets/poetry-workbench-loop.png';

export default {
  name: 'PoetryWorkbench',
  components: {
    InspirationPanel,
    StructureGuide,
    PoemEditor,
    PoemScorer,
    FeihuaMode,
    ChainMode
  },
  setup() {
    const router = useRouter();

    // 创作模式
    const currentMode = ref('guided');
    const modes = [
      {
        id: 'guided',
        title: '引导创作',
        desc: '从主题到成诗，一步步写出自己的作品',
        icon: '📜',
        badge: '推荐',
        flow: '灵感 · 结构 · 落笔'
      },
      {
        id: 'feihua',
        title: '飞花令创作',
        desc: 'AI 出题，以一字写出你的诗意',
        icon: '🌸',
        flow: '抽题 · 创作 · 评审'
      },
      {
        id: 'chain',
        title: '接龙创作',
        desc: '与 AI 一人一句，把意境接下去',
        icon: '🔗',
        flow: '定题 · 轮写 · 成篇'
      }
    ];

    // 步骤
    const currentStep = ref(1);
    const steps = [
      { label: '灵感生成' },
      { label: '结构引导' },
      { label: '生成编辑' }
    ];

    const activeMode = computed(() => modes.find(mode => mode.id === currentMode.value));
    const currentStepCopy = computed(() => {
      if (currentMode.value !== 'guided') return activeMode.value?.desc || '用另一种方式写下心中所想';
      return ['先把想写的事说清楚', '让意象和情绪彼此照应', '把灵感落成可以保存的句子'][currentStep.value - 1];
    });
    const modeGuide = computed(() => {
      if (currentMode.value === 'feihua') {
        return { title: '以一字起意', description: '抽取关键字后自然入诗，完成后获得关键字、意境与韵律评审。', tools: ['AI 抽题', '意象联想', '多维评审'] };
      }
      if (currentMode.value === 'chain') {
        return { title: '与 AI 对写', description: '设定主题和体裁后轮流落句，系统会持续守住字数、节奏与上下句衔接。', tools: ['AI 续句', '字数校验', '进度留存'] };
      }
      const guides = [
        { title: '先找到这一首诗的心意', description: '告诉 AI 想写的场景或情绪，获得可选择的意象与起笔方向。', tools: ['灵感发散', '关键词', '情绪基调'] },
        { title: '让句子有清晰的去处', description: '用起承转合组织画面和情感，落笔前先知道每一句该承担什么。', tools: ['结构引导', '韵律提示', '避坑建议'] },
        { title: '把灵感写成自己的作品', description: '逐句写作、随时请求续写，再用 AI 润色与评分完成最后打磨。', tools: ['续写建议', '润色', '作品评分'] }
      ];
      return guides[currentStep.value - 1];
    });

    // 诗词草稿数据
    const poemDraft = reactive({
      title: '',
      theme: '',
      genre: '五言绝句',
      lines: ['', '', '', ''],
      keywords: [],
      mood: '',
      suggestions: []
    });

    // 飞花令数据
    const feihuaDraft = reactive({
      keyword: '',
      title: '',
      content: ''
    });
    const feihuaKeywordInfo = ref(null);

    // 状态
    const isLoading = ref(false);
    const isGenerating = ref(false);
    const isPolishing = ref(false);
    const showTypewriter = ref(false);
    const typewriterText = ref('');
    const showScorePanel = ref(false);
    const currentScore = ref(null);
    const polishResult = ref(null);

    // 组件引用
    const inspirationPanel = ref(null);
    const poemEditor = ref(null);
    const feihuaMode = ref(null);
    const chainMode = ref(null);

    // 切换模式
    const switchMode = (mode) => {
      currentMode.value = mode;
      currentStep.value = 1;
      resetDraft();
    };

    // 重置草稿
    const resetDraft = () => {
      poemDraft.title = '';
      poemDraft.theme = '';
      poemDraft.genre = '五言绝句';
      poemDraft.lines = ['', '', '', ''];
      poemDraft.keywords = [];
      poemDraft.mood = '';
      poemDraft.suggestions = [];
      feihuaDraft.keyword = '';
      feihuaDraft.title = '';
      feihuaDraft.content = '';
      feihuaKeywordInfo.value = null;
      currentScore.value = null;
      polishResult.value = null;
    };

    // 显示打字机效果
    const showTypewriterEffect = (text) => {
      typewriterText.value = text;
      showTypewriter.value = true;
    };

    // 隐藏打字机效果
    const hideTypewriterEffect = () => {
      showTypewriter.value = false;
    };

    // 步骤1：生成灵感
    const handleGenerateInspiration = async ({ theme, genre }) => {
      isLoading.value = true;

      try {
        const response = await api.creationWorkbench.generateInspiration(theme, genre);
        const result = response.data || response;

        if (result && inspirationPanel.value) {
          inspirationPanel.value.setResult(result);
          poemDraft.keywords = result.keywords || [];
          poemDraft.mood = result.mood || '';
          poemDraft.suggestions = result.suggestions || [];
        }
      } catch (error) {
        console.error('生成灵感失败:', error);
        // 即使接口完全失败，也基于用户主题生成相关 fallback
        if (inspirationPanel.value) {
          const t = theme || '一般主题';
          const fallbacks = {
            '思乡': { keywords: ['明月', '孤灯', '归雁', '故园', '白发', '江湖', '烟波', '旧路'], theme: `围绕「${t}」主题，可从故乡景物（炊烟、老树、旧居）或旅途所见（孤舟、斜阳、霜鬓）切入，在空间对比中写出距离感与归心`, mood: '沉郁', suggestions: ['用故乡具体景物代替直接说「想家」', '以空间距离（千里）强化归心之切', '转句可宕入归期想象或梦境', '结尾以景结情，留白回味'] },
            '离别': { keywords: ['长亭', '古道', '杨柳', '孤帆', '浊酒', '泪眼', '斜阳', '歧路'], theme: `围绕「${t}」主题，可从送别场景（渡口、长亭、暮色）或别后想象切入，以景托情，不言别而别情自现`, mood: '怅惘', suggestions: ['以具体动作（执手、折柳）代替空洞悲叹', '转句宕开写别后，不局限于当下', '用「浊酒」「斜阳」等浊重意象托出离愁', '结尾以景结情，不说再见'] },
            '春日': { keywords: ['柳絮', '桃花', '燕归', '新芽', '微雨', '暖风', '蜂蝶', '纸鸢'], theme: `围绕「${t}」主题，可从一花一草的细微变化切入，写出春日独有的生机或春光易逝的感慨`, mood: '清新', suggestions: ['写春不写春字，借「柳绿」「桃红」让春意自己显现', '动静结合：蜂蝶忙而人静，意境更活', '转句引入「春将尽」或人事，增加层次', '结尾宕入人事，写春日里的思念或孩童'] },
            '山水': { keywords: ['空山', '幽径', '飞鸟', '流泉', '松风', '白云', '独坐', '樵归'], theme: `围绕「${t}」主题，以山水为媒介写出诗人的精神世界，境随心转，山水即心境`, mood: '宁静', suggestions: ['以动写静：「鸟鸣山更幽」比直接说山很静更有张力', '远近层次：近处奇石细草，远处飞鸟孤云', '转句引入「人」：山中行人、渔樵问答，以人衬静', '结尾留白：「独坐」「忘言」比说完更耐读'] },
            '怀古': { keywords: ['残碑', '故垒', '夕阳', '西风', '英雄', '往事', '成败', '兴亡'], theme: `围绕「${t}」主题，借历史遗迹或古人事迹发感慨，在「变与不变」中找立意，借古讽今或借古抒怀`, mood: '苍凉', suggestions: ['以小见大：选一个细节、一个决定，而非全面评价', '古今对比：打通古人处境与当下，在比较中找立意', '转句宕开议论，点明主旨', '结尾用反问或假设，增加思辨力量'] },
            '闺怨': { keywords: ['高楼', '明月', '妆奁', '落花', '春雨', '孤灯', '秋风', '雁过'], theme: `围绕「${t}」主题，借女子之口写人间别情，通过妆扮变化、时令更替暗示思念，不言怨而怨自深`, mood: '婉约', suggestions: ['通过妆扮变化（懒梳头、眉不画）暗示思念', '转句宕入对方视角：他此刻在做什么？', '善用「梦」意象：梦里相聚、梦醒更孤', '结尾以物结情：落花、孤灯，以景写情胜于直说'] }
          };
          let mockResult = fallbacks['春日'];
          for (const key of Object.keys(fallbacks)) {
            if (theme.includes(key)) { mockResult = fallbacks[key]; break; }
          }
          inspirationPanel.value.setResult(mockResult);
          poemDraft.keywords = mockResult.keywords;
          poemDraft.mood = mockResult.mood;
          poemDraft.suggestions = mockResult.suggestions;
        }
      } finally {
        isLoading.value = false;
      }
    };

    // 灵感生成后下一步
    const handleInspirationNext = (data) => {
      poemDraft.theme = data.theme;
      poemDraft.genre = data.genre;
      poemDraft.keywords = data.keywords;
      poemDraft.mood = data.mood;
      currentStep.value = 2;
    };

    // 获取行推荐
    const handleRecommend = async ({ currentLines, genre, theme, lineNumber, maxLength }) => {
      if (poemEditor.value) {
        try {
          const response = await api.creationWorkbench.recommendNextLine({
            currentLines,
            genre,
            theme,
            maxLength
          });
          const result = response.data || response;

          if (result && result.suggestions) {
          const recs = result.suggestions.map((item, i) => ({
              line: typeof item === 'string' ? item : item?.line,
              reason: typeof item === 'string' ? (result.reasons?.[i] || 'AI推荐') : (item?.reason || 'AI推荐')
            }));
            poemEditor.value.setRecommendations(recs);
          }
        } catch (error) {
          // 模拟推荐数据
          if (poemEditor.value) {
            const mockRecs = [
              { line: '春风又绿江南岸', reason: '与上句形成对仗' },
              { line: '明月何时照我还', reason: '意境呼应' }
            ];
            poemEditor.value.setRecommendations(mockRecs);
          }
        }
      }
    };

    // AI生成完整诗词
    const handleGeneratePoem = async ({ theme, genre, keywords, existingLines }) => {
      isGenerating.value = true;
      showTypewriterEffect('AI正在创作中...');

      try {
        const response = await api.creationWorkbench.generatePoem({
          theme,
          genre,
          keywords,
          structure: '',
          existingLines: existingLines?.filter(line => line?.trim()) || []
        });
        const result = response.data || response;

        if (result && result.poem) {
          const newLines = result.poem.split('\n').filter(l => l.trim());
          if (poemEditor.value) {
            poemEditor.value.setLines(newLines);
          }
          if (result.title) {
            poemDraft.title = result.title;
            if (poemEditor.value) {
              poemEditor.value.setTitle(result.title);
            }
          }
        }
      } catch (error) {
        console.error('生成诗词失败:', error);
        // 模拟生成数据
        const mockPoem = '春风拂面柳丝长\n桃花映日笑春光\n燕子归来寻旧垒\n碧水青山入梦乡';
        if (poemEditor.value) {
          poemEditor.value.setLines(mockPoem.split('\n'));
        }
      } finally {
        isGenerating.value = false;
        hideTypewriterEffect();
      }
    };

    // AI润色
    const handlePolish = async (type) => {
      isPolishing.value = true;
      showTypewriterEffect('AI正在润色中...');

      try {
        const poemContent = poemDraft.lines.filter(l => l.trim()).join('\n');
        const response = await api.creationWorkbench.polishPoem({
          poem: poemContent,
          genre: poemDraft.genre,
          theme: poemDraft.theme,
          type: type || 'optimize'
        });
        const result = response.data || response;

        if (result && result.poem && result.poem.trim()) {
          polishResult.value = {
            poem: result.poem,
            original: result.original || poemContent,
            explanation: result.explanation || '已优化用词，增强韵律美感',
            changes: result.changes || []
          };
        } else {
          polishResult.value = {
            poem: poemContent,
            original: poemContent,
            explanation: '原诗已经很优秀，无需润色',
            changes: []
          };
        }
        showScorePanel.value = true;
      } catch (error) {
        console.error('润色失败:', error);
        polishResult.value = {
          poem: poemDraft.lines.filter(l => l.trim()).join('\n'),
          original: poemDraft.lines.filter(l => l.trim()).join('\n'),
          explanation: '润色失败，请检查网络连接后重试',
          changes: []
        };
        showScorePanel.value = true;
      } finally {
        isPolishing.value = false;
        hideTypewriterEffect();
      }
    };

    // 应用润色结果
    const handleApplyPolish = (result) => {
      if (result && result.poem) {
        poemDraft.lines = result.poem.split('\n').filter(l => l.trim());
        if (poemEditor.value) {
          poemEditor.value.setLines(poemDraft.lines);
        }
      }
      polishResult.value = null;
    };

    // 评分
    const handleScore = async () => {
      showTypewriterEffect('正在分析作品...');

      try {
        const poemContent = poemDraft.lines.filter(l => l.trim()).join('\n');
        const response = await api.creationWorkbench.scorePoem({
          poem: poemContent,
          title: poemDraft.title,
          genre: poemDraft.genre,
          theme: poemDraft.theme
        });
        const result = response.data || response;

        currentScore.value = result;
        showScorePanel.value = true;
      } catch (error) {
        console.error('评分失败:', error);
        // 模拟评分数据
        currentScore.value = {
          total: 85,
          dimensions: {
            content: 88,
            rhythm: 82,
            mood: 85,
            language: 80,
            creativity: 75
          },
          analysis: {
            rhyme: '押韵良好，平仄协调',
            rhymeOk: true,
            structure: '起承转合分明，结构完整',
            structureOk: true,
            meaning: '意境清晰，情景交融',
            meaningOk: true,
            language: '语言流畅，用词恰当',
            languageOk: true
          },
          suggestions: '整体作品优秀，第三句可再斟酌，增加情感深度'
        };
        showScorePanel.value = true;
      }

      hideTypewriterEffect();
    };

    // 飞花令关键字由后端生成，同时返回与该字匹配的意象，避免前端与 AI 结果脱节。
    const handleFeihuaKeyword = async (difficulty) => {
      isLoading.value = true;
      try {
        const response = await api.creationWorkbench.getFeihuaKeyword(difficulty);
        const result = response.data || response;
        if (!result?.keyword) throw new Error('未获取到关键字');
        feihuaKeywordInfo.value = result;
        feihuaDraft.keyword = result.keyword;
      } catch (error) {
        console.error('获取飞花令关键字失败:', error);
        // 保持可继续创作；失败提示和兜底仅用于网络不可用时。
        const fallback = { keyword: '月', relatedWords: ['清辉', '孤舟', '归雁', '寒江', '乡关'] };
        feihuaKeywordInfo.value = fallback;
        feihuaDraft.keyword = fallback.keyword;
      } finally {
        isLoading.value = false;
      }
    };

    // 飞花令评分
    const handleFeihuaScore = async () => {
      if (!feihuaDraft.content) return;

      isLoading.value = true;
      showTypewriterEffect('正在评分...');

      try {
        const response = await api.creationWorkbench.scoreFeihuaPoem({
          poem: feihuaDraft.content,
          keyword: feihuaDraft.keyword,
          genre: '五言绝句'
        });
        const result = response.data || response;

        currentScore.value = result;
        showScorePanel.value = false;
      } catch (error) {
        console.error('飞花令评分失败:', error);
        // 模拟评分
        currentScore.value = {
          total: 78,
          dimensions: {
            content: 80,
            rhythm: 75,
            mood: 78,
            language: 72,
            creativity: 70,
            keyword: 95
          },
          analysis: {
            rhyme: '关键字使用恰当',
            rhymeOk: true,
            structure: '结构基本完整',
            structureOk: true,
            meaning: '意境表达尚可',
            meaningOk: true
          },
          suggestions: '关键字使用出色，可进一步提升韵律美感'
        };
        showScorePanel.value = false;
      }

      isLoading.value = false;
      hideTypewriterEffect();
    };

    // 飞花令润色
    const handleFeihuaPolish = async (type) => {
      if (!feihuaDraft.content) return;

      isPolishing.value = true;
      showTypewriterEffect('AI正在润色中...');

      try {
        const response = await api.creationWorkbench.polishPoem({
          poem: feihuaDraft.content,
          genre: '五言绝句',
          theme: `飞花令 - ${feihuaDraft.keyword}`,
          type: type || 'optimize'
        });
        const result = response.data || response;

        if (result && result.poem && result.poem.trim()) {
          polishResult.value = {
            poem: result.poem,
            original: result.original || feihuaDraft.content,
            explanation: result.explanation || '已优化用词，增强韵律美感',
            changes: result.changes || []
          };
        } else {
          polishResult.value = {
            poem: feihuaDraft.content,
            original: feihuaDraft.content,
            explanation: '原诗已经很优秀，无需润色',
            changes: []
          };
        }
      } catch (error) {
        console.error('飞花令润色失败:', error);
        polishResult.value = {
          poem: feihuaDraft.content,
          original: feihuaDraft.content,
          explanation: '润色失败，请检查网络连接后重试',
          changes: []
        };
      } finally {
        isPolishing.value = false;
        hideTypewriterEffect();
      }
    };

    // 飞花令应用润色结果
    const handleFeihuaApplyPolish = (result) => {
      if (result && result.poem) {
        feihuaDraft.content = result.poem;
        if (feihuaMode.value) {
          feihuaMode.value.localContent = result.poem;
        }
      }
      polishResult.value = null;
    };

    // 接龙开始
    const handleChainStart = ({ theme, genre, startMode }) => {
      poemDraft.theme = theme;
      poemDraft.genre = genre;
    };

    // 接龙提交
    const handleChainSubmit = async ({ userLine, allLines, genre, theme, lineNumber }) => {
      isLoading.value = true;

      try {
    if (lineNumber === 1) {
      const response = await api.creationWorkbench.startChainPoem(genre, theme);
      const result = response.data || response;
      if (chainMode.value) {
        chainMode.value.setAILine(result?.aiLine);
      }
    } else {
      const response = await api.creationWorkbench.getChainNextLine({
        userLine: userLine || undefined,
        allLines: (allLines && allLines.length > 0) ? allLines : undefined,
        genre,
        theme,
        lineNumber
      });
      const result = response.data || response;
      if (chainMode.value) {
        chainMode.value.setAILine(result?.aiLine);
      }
    }
  } catch (error) {
    console.error('接龙失败:', error);
    // 根据错误类型决定是否使用兜底
    const g = genre || '五言绝句';
    const n = g.includes('七') ? 7 : 5;
    const themeMap = {
      '思乡': '故园东望路漫漫', '离别': '孤帆远影碧空尽',
      '山水': '青山隐隐水迢迢', '自然': '春风得意马蹄疾',
      'default': '落花时节又逢君'
    };
    const raw = Object.entries(themeMap).find(([k]) => (theme || '').includes(k))?.[1] || themeMap.default;
    const norm = (raw || '').replace(/[，。？！、；：""''（）【】\s]/g, '');
    const mock = norm.slice(0, n) || (n === 7 ? '春风送暖入屠苏' : '春风拂面柳丝轻');
    if (chainMode.value) {
      chainMode.value.setAILine(mock);
    }
  }

      isLoading.value = false;
    };

    // 接龙结束
    const handleChainEnd = ({ lines, title, genre, theme, goToEdit }) => {
      if (lines && lines.length > 0) {
        poemDraft.lines = lines;
        poemDraft.title = title;
        poemDraft.genre = genre;
        poemDraft.theme = theme;

        if (goToEdit) {
          currentMode.value = 'guided';
          currentStep.value = 3;
        }
      }
    };

    // 保存作品
    const handleSave = async () => {
      try {
        const workData = {
          title: poemDraft.title || feihuaDraft.title || '无题',
          content: poemDraft.lines.filter(l => l.trim()).join('\n') || feihuaDraft.content,
          genre: poemDraft.genre || '五言绝句',
          theme: poemDraft.theme || `飞花令 - ${feihuaDraft.keyword}`,
          creation_mode: currentMode.value,
          score_data: JSON.stringify(currentScore.value || {}),
          modification_suggestions: currentScore.value?.suggestions || ''
        };

        await api.creationWorkbench.saveWork(workData);

        showScorePanel.value = false;
        notify('作品保存成功！', 'success');

        // 重置状态
        resetDraft();
        currentStep.value = 1;

        // 跳转到记录页
        router.push('/creation/records');
      } catch (error) {
        console.error('保存失败:', error);
        notify('保存失败，请重试', 'error');
      }
    };

    return {
      // 模式
      currentMode,
      modes,
      currentStep,
      steps,
      activeMode,
      currentStepCopy,
      modeGuide,
      sceneArt,

      // 数据
      poemDraft,
      feihuaDraft,
      feihuaKeywordInfo,

      // 状态
      isLoading,
      isGenerating,
      isPolishing,
      showTypewriter,
      typewriterText,
      showScorePanel,
      currentScore,
      polishResult,

      // 组件引用
      inspirationPanel,
      poemEditor,
      feihuaMode,
      chainMode,

      // 方法
      switchMode,
      handleGenerateInspiration,
      handleInspirationNext,
      handleRecommend,
      handleGeneratePoem,
      handlePolish,
      handleApplyPolish,
      handleScore,
      handleFeihuaScore,
      handleFeihuaKeyword,
      handleFeihuaPolish,
      handleFeihuaApplyPolish,
      handleChainStart,
      handleChainSubmit,
      handleChainEnd,
      handleSave
    };
  }
};
</script>

<style scoped>
/* 基础布局 */
.poetry-workbench {
  min-height: 100vh;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #fdf6e3 0%, #fef9f3 50%, #f5efe6 100%);
}

/* 水墨背景 */
.ink-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.ink-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  animation: float 25s ease-in-out infinite;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #8b7355 0%, transparent 70%);
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #a0522d 0%, transparent 70%);
  bottom: 5%;
  left: -80px;
  animation-delay: -6s;
}

.blob-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #d2b48c 0%, transparent 70%);
  top: 40%;
  right: 15%;
  animation-delay: -12s;
}

.blob-4 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, #bc8f8f 0%, transparent 70%);
  bottom: 35%;
  right: 35%;
  animation-delay: -18s;
}

.blob-5 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #deb887 0%, transparent 70%);
  top: 15%;
  left: 20%;
  animation-delay: -8s;
}

.blob-6 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #c4a882 0%, transparent 70%);
  top: 60%;
  left: 60%;
  animation-delay: -15s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -40px) scale(1.05); }
  50% { transform: translate(-15px, 25px) scale(0.95); }
  75% { transform: translate(40px, 15px) scale(1.02); }
}

/* 标题区域 */
.title-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.brush-stroke {
  width: 120px;
  height: 6px;
  background: linear-gradient(90deg, transparent, #8b7355, transparent);
  border-radius: 3px;
  animation: brushFade 2s ease-out;
}

.brush-stroke.left {
  animation: brushFadeLeft 2s ease-out;
}

.brush-stroke.right {
  animation: brushFadeRight 2s ease-out;
}

@keyframes brushFadeLeft {
  from { transform: translateX(-60px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes brushFadeRight {
  from { transform: translateX(60px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.main-title {
  font-size: 38px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #5d4e37;
  text-shadow: 2px 2px 4px rgba(93, 78, 55, 0.1);
  letter-spacing: 6px;
  position: relative;
  display: flex;
}

.title-char {
  display: inline-block;
  animation: charFadeIn 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes charFadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

/* 模式选择器 */
.mode-selector {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.mode-card {
  width: 220px;
  padding: 28px 24px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 115, 85, 0.2);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.mode-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #8b7355, #d4a574);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.mode-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 25px 50px rgba(139, 115, 85, 0.18);
}

.mode-card:hover::before {
  transform: scaleX(1);
}

.mode-card.active {
  background: rgba(255, 255, 255, 0.92);
  border-color: #8b7355;
  box-shadow: 0 20px 45px rgba(139, 115, 85, 0.22);
}

.mode-card.active::before {
  transform: scaleX(1);
}

.mode-icon {
  font-size: 40px;
  margin-bottom: 14px;
}

.mode-info h3 {
  font-size: 18px;
  color: #5d4e37;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', serif;
}

.mode-info p {
  font-size: 13px;
  color: #8b7355;
  line-height: 1.4;
}

.mode-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 5px 12px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  font-size: 11px;
  border-radius: 20px;
}

/* 工作区 */
.workspace {
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.workspace-topline {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin: 0 4px 14px;
}

.workspace-topline > div {
  display: grid;
  gap: 5px;
}

.workspace-topline strong {
  color: #473b2b;
  font: 700 24px/1.1 'Noto Serif SC', serif;
}

.workspace-status {
  padding: 7px 12px;
  border: 1px solid rgba(92, 126, 111, 0.22);
  border-radius: 999px;
  background: rgba(245, 251, 247, 0.9);
  color: #477463;
  font-size: 12px;
  letter-spacing: 0.06em;
}

.workflow-brief {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 0 16px;
  padding: 16px 20px;
  border: 1px solid rgba(152, 123, 82, 0.16);
  border-left: 3px solid #b58a52;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255, 250, 241, 0.92), rgba(247, 252, 249, 0.76));
}

.workflow-brief-copy { display: grid; gap: 4px; }
.workflow-brief-copy > span { color: #a17b4b; font-size: 11px; letter-spacing: 0.14em; }
.workflow-brief-copy strong { color: #503f2c; font: 700 17px/1.25 'Noto Serif SC', serif; }
.workflow-brief-copy p { margin: 0; color: #806f5c; font-size: 13px; line-height: 1.65; }
.workflow-brief-pills { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.workflow-brief-pills span { padding: 6px 9px; border-radius: 999px; background: rgba(82, 128, 108, 0.11); color: #477463; font-size: 12px; white-space: nowrap; }

/* 引导工作区 */
.guided-workspace {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 115, 85, 0.15);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(139, 115, 85, 0.1);
}

.mode-workspace {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 115, 85, 0.15);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(139, 115, 85, 0.1);
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 28px 20px;
  background: rgba(245, 239, 230, 0.5);
  border-bottom: 1px solid rgba(139, 115, 85, 0.1);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step-number {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #d4c4b0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
  color: #8b7355;
  transition: all 0.4s ease;
  z-index: 2;
}

.step.active .step-number {
  background: linear-gradient(135deg, #8b7355, #d4a574);
  color: white;
  border-color: #8b7355;
  transform: scale(1.12);
  box-shadow: 0 10px 25px rgba(139, 115, 85, 0.35);
}

.step.completed .step-number {
  background: #d4a574;
  color: white;
  border-color: #d4a574;
}

.step-label {
  margin-top: 12px;
  font-size: 14px;
  color: #8b7355;
  font-family: 'Noto Serif SC', serif;
  transition: all 0.3s ease;
}

.step.active .step-label {
  color: #5d4e37;
  font-weight: bold;
}

.step-connector {
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, #d4c4b0, #d4c4b0);
  margin: 0 20px;
  margin-bottom: 30px;
  position: relative;
  overflow: hidden;
}

.step-connector::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0;
  background: #d4a574;
  transition: width 0.5s ease;
}

.step.completed + .step .step-connector::after,
.step.completed .step-connector::after {
  width: 100%;
}

/* 步骤内容 */
.step-content {
  padding: 8px;
}

/* 评分弹窗 */
.score-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.score-modal {
  max-width: 600px;
  width: 100%;
  animation: modalSlideIn 0.4s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 打字机效果 */
.typewriter-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.96);
  padding: 36px 56px;
  border-radius: 20px;
  box-shadow: 0 25px 70px rgba(139, 115, 85, 0.3);
  z-index: 1000;
  animation: typewriterFade 0.3s ease-out;
}

.typewriter-content {
  text-align: center;
}

.typewriter-icon {
  font-size: 44px;
  margin-bottom: 18px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.typewriter-text {
  font-size: 18px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  margin-bottom: 18px;
}

.typewriter-dots {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.typewriter-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d4a574;
  animation: typing 1.4s ease-in-out infinite;
}

.typewriter-dots span:nth-child(2) { animation-delay: 0.2s; }
.typewriter-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 动画 */
.slide-fade-enter-active {
  transition: all 0.5s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(60px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-60px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 900px) {
  .poetry-workbench {
    padding: 24px 16px;
  }

  .main-title {
    font-size: 28px;
    letter-spacing: 4px;
  }

  .brush-stroke {
    display: none;
  }

  .mode-selector {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .mode-card {
    width: 100%;
    max-width: 320px;
  }

  .step-indicator {
    padding: 20px 16px;
    gap: 0;
  }

  .step-connector {
    width: 60px;
    margin: 0 8px;
    margin-bottom: 28px;
  }

  .workflow-brief { align-items: flex-start; flex-direction: column; }
  .workflow-brief-pills { justify-content: flex-start; }
}

@media (max-width: 600px) {
  .workspace-topline { align-items: flex-start; flex-direction: column; }
  .workflow-brief { padding: 14px 15px; }
  .workspace-topline strong { font-size: 21px; }
  .title-section {
    margin-bottom: 28px;
  }

  .main-title {
    font-size: 24px;
    letter-spacing: 2px;
  }

  .step-number {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .step-label {
    font-size: 12px;
  }

  .step-connector {
    width: 40px;
  }

  .typewriter-overlay {
    padding: 28px 36px;
  }

  .typewriter-text {
    font-size: 16px;
  }
}
</style>
