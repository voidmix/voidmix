import { definePlugin } from 'nitro'
import { closeServices, getServices } from '../services'
export default definePlugin((nitro) => {
  getServices()
  nitro.hooks.hook('close', closeServices)
})
