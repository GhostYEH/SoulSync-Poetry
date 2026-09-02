import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style.css'
import './assets/liquid-glass.css'
import './assets/motion-system.css'
import { installCustomCursor } from './utils/customCursor'
import { installLiquidGlass } from './utils/liquidGlass'
import { installMotionActivity } from './utils/motionActivity'

installMotionActivity()
installCustomCursor(router)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
installLiquidGlass(router)
