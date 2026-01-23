import '@tabler/core/dist/css/tabler.min.css'
import '@tabler/core/dist/css/tabler-themes.min.css'
import '@tabler/core/dist/js/tabler.min.js'
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

// Expose e2eApi for E2E tests (only in test mode)
if (import.meta.env.VITE_MODE === 'test') {
  import('./lib/e2eApi').then(({ e2eApi }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).e2eApi = e2eApi
    console.log('[E2E] API exposed on window.e2eApi')
  })
}

export default app
