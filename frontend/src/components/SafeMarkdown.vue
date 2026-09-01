<template>
  <div v-html="html"></div>
</template>

<script>
import { renderMarkdown } from '../utils/markdown'

export default {
  name: 'SafeMarkdown',
  props: {
    content: {
      type: [String, Number],
      default: ''
    }
  },
  computed: {
    html() {
      return renderMarkdown(this.content)
    }
  }
}
</script>
