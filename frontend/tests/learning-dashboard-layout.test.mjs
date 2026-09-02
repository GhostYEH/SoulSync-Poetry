import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const dashboardSource = await readFile(
  new URL('../src/views/LearningDashboard.vue', import.meta.url),
  'utf8'
)

function ruleBody(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = dashboardSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))
  assert.ok(match, `Expected to find the ${selector} CSS rule`)
  return match[1]
}

function blockFrom(marker) {
  const start = dashboardSource.indexOf(marker)
  assert.notEqual(start, -1, `Expected to find ${marker}`)
  const openingBrace = dashboardSource.indexOf('{', start)
  let depth = 0

  for (let index = openingBrace; index < dashboardSource.length; index += 1) {
    if (dashboardSource[index] === '{') depth += 1
    if (dashboardSource[index] === '}') depth -= 1
    if (depth === 0) return dashboardSource.slice(openingBrace + 1, index)
  }

  assert.fail(`Expected ${marker} to have a closing brace`)
}

test('dashboard content uses the shared full-width page boundary', () => {
  const dashboardRule = ruleBody('.learning-dashboard')
  const contentRule = ruleBody('.journal-hero, .journal-body, .journal-footer')

  assert.match(dashboardRule, /padding:\s*52px\s+clamp\(28px,\s*4vw,\s*72px\)\s+26px/)
  assert.match(contentRule, /width:\s*100%/)
  assert.match(contentRule, /max-width:\s*none/)
})

test('dashboard keeps the same content boundary on small screens', () => {
  const mobileBlock = blockFrom('@media (max-width: 760px)')
  assert.match(mobileBlock, /\.learning-dashboard\s*\{[^}]*padding:\s*30px\s+14px\s+20px/)
})

test('edge metric labels keep breathing room from both sides', () => {
  const metricRule = ruleBody('.metric-item')
  assert.match(metricRule, /padding:\s*22px\s+20px\s+18px\s*;/)
})
