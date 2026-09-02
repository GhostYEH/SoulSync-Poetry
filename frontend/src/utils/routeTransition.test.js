import test from 'node:test'
import assert from 'node:assert/strict'

import { clearRouteTransitionStyles } from './routeTransition.js'

test('route transition cleanup releases fixed descendants back to the viewport', () => {
  const styles = new Map([
    ['transform', 'translate3d(0, 0, 0) scale(1)'],
    ['opacity', '1'],
    ['visibility', 'inherit']
  ])
  const element = {
    style: {
      removeProperty(property) {
        styles.delete(property)
      }
    }
  }

  clearRouteTransitionStyles(element)

  assert.equal(styles.has('transform'), false)
  assert.equal(styles.has('opacity'), false)
  assert.equal(styles.has('visibility'), false)
})
