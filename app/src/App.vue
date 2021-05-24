<template>
  <div class="page-container">
    <md-app md-mode="reveal">
      <md-app-toolbar class="md-primary">
        <md-button class="md-icon-button" @click="menuVisible = !menuVisible">
          <md-icon>menu</md-icon>
        </md-button>
        <span class="md-title">{{ name }}</span>
      </md-app-toolbar>

      <md-app-drawer :md-active.sync="menuVisible">
        <md-toolbar class="md-transparent" md-elevation="0">Navigation</md-toolbar>
        <md-list>
          <router-link to="/home/">
            <md-list-item>
              <md-icon>move_to_inbox</md-icon>
              <span class="md-list-item-text">Home</span>
            </md-list-item>
          </router-link>
          <router-link to="/converse/">
            <md-list-item>
              <md-icon>send</md-icon>
              <span class="md-list-item-text">Converse</span>
            </md-list-item>
          </router-link>
          <router-link to="/make-room/">
            <md-list-item>
              <md-icon>send</md-icon>
              <span class="md-list-item-text">Room Maker</span>
            </md-list-item>
          </router-link>

        </md-list>
      </md-app-drawer>

      <md-app-content>
        <router-view/>
      </md-app-content>
    </md-app>
  </div>
</template>

<script>
export default {
  name: 'MealwormBasement',
  data: () => ({
    name: 'Mealworm Basement',
    menuVisible: false
  })
}
</script>

<style>
  .md-app {
    min-height: 100vh;
  }
</style>
