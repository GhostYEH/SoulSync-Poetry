import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import LiquidGlass from './components/LiquidGlass.vue'
import router from './router'
import './assets/style.css'
import './assets/game-suite.css'
import './assets/liquid-glass.css'
import './assets/motion-system.css'
import { installCustomCursor } from './utils/customCursor'
import { installLiquidGlass } from './utils/liquidGlass'

installCustomCursor(router)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.component('LiquidGlass', LiquidGlass)
app.mount('#app')
installLiquidGlass(router)
