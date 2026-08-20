import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  breaks: true,
  gfm: true
})

export function renderMarkdown(value = '') {
  const source = String(value).trim()
  // 模型偶尔会把整段 Markdown 错包在代码围栏中；这里做展示层兜底，
  // 避免流式内容在前端被渲染成一整块代码。
  const markdown = source
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
  return DOMPurify.sanitize(marked.parse(markdown))
}

export default renderMarkdown
