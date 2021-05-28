import Vue from 'vue'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/black-green-dark.css' // This line here
import 'material-design-icons/iconfont/material-icons.css'
import Router from 'vue-router'
import Converse from '@/components/Converse'
import RoomMaker from '@/components/RoomMaker'

Vue.use(Router)

Vue.use(VueMaterial)

Vue.config.errorHandler = (err, vm, info) => {
  // error in VueMaterial https://github.com/vuematerial/vue-material/issues/2285
  if (process.env.NODE_ENV !== 'production') {
    // Show any error but this one
    if (err.message !== "Cannot read property 'badInput' of undefined") {
      console.error(err)
    }
  }
}

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Room Maker',
      component: RoomMaker
    },
    {
      path: '/converse/',
      name: 'Converse',
      component: Converse
    }
  ]
})
