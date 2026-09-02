/**
 * AI诗词创作服务封装
 * 统一管理所有创作相关的AI接口调用
 */

import { request, TIMEOUTS } from './api';

export const aiCreationService = {
  generateInspiration: async (theme, genre) => {
    const result = await request('/creation/inspiration/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, genre }),
      timeout: TIMEOUTS.LONG // AI生成需要约60秒，设置120秒确保足够
    });
    return result.data;
  },

  getStructureGuide: async (genre, theme) => {
    const result = await request('/creation/structure/guide', {
      method: 'POST',
      body: JSON.stringify({ genre, theme }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  generatePoem: async ({ theme, genre, keywords, structure }) => {
    const result = await request('/creation/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, genre, keywords, structure }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  recommendNextLine: async ({ currentLines, genre, theme, maxLength = 7 }) => {
    const result = await request('/creation/recommend/next-line', {
      method: 'POST',
      body: JSON.stringify({ currentLines, genre, theme, maxLength }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  getRealtimeTips: async (partialLine, genre) => {
    const result = await request('/creation/realtime/tips', {
      method: 'POST',
      body: JSON.stringify({ partialLine, genre }),
      timeout: TIMEOUTS.MEDIUM
    });
    return result.data;
  },

  scorePoem: async ({ poem, title, genre, theme }) => {
    const result = await request('/creation/assist/score', {
      method: 'POST',
      body: JSON.stringify({ poem, title, genre, theme }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  generatePromptPoem: async (theme, genre) => {
    const result = await request('/creation/novice/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, genre }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  checkPoem: async (userPoem, referencePoem) => {
    const result = await request('/creation/novice/check', {
      method: 'POST',
      body: JSON.stringify({ userPoem, referencePoem }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  getFeihuaKeyword: async (difficulty = '中等') => {
    const result = await request('/creation/feihua/keyword', {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
      timeout: TIMEOUTS.MEDIUM
    });
    return result.data;
  },

  scoreFeihuaPoem: async ({ poem, keyword, genre }) => {
    const result = await request('/creation/feihua/score', {
      method: 'POST',
      body: JSON.stringify({ poem, keyword, genre }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  getChainNextLine: async ({ userLine, allLines, genre, theme, lineNumber }) => {
    const result = await request('/creation/chain/next', {
      method: 'POST',
      body: JSON.stringify({ userLine, allLines, genre, theme, lineNumber }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  startChainPoem: async (genre, theme) => {
    const result = await request('/creation/chain/start', {
      method: 'POST',
      body: JSON.stringify({ genre, theme }),
      timeout: TIMEOUTS.LONG
    });
    return result.data;
  },

  generateImage: async ({ poem, title }) => {
    const result = await request('/creation/assist/generate-image', {
      method: 'POST',
      body: JSON.stringify({ poem, title }),
      timeout: TIMEOUTS.LONG // 图片生成可能需要更长的时间
    });
    return result.data;
  },

  saveWork: async (workData) => {
    const result = await request('/creation/works/save', {
      method: 'POST',
      body: JSON.stringify(workData)
    });
    return result.data;
  },

  getWorks: async (page = 1, pageSize = 10) => {
    const result = await request(`/creation/works/list?page=${page}&pageSize=${pageSize}`);
    return result.data;
  },

  deleteWork: async (id) => {
    await request(`/creation/works/${id}`, { method: 'DELETE' });
  }
};

export default aiCreationService;
