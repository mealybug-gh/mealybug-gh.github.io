<template>
  <div class="page-container">
    <md-app md-mode="reveal">
      <md-app-toolbar class="md-primary">
        <!--<md-button class="md-icon-button" @click="menuVisible = !menuVisible">
          <md-icon>menu</md-icon>
        </md-button>-->
        <span class="md-title">{{ name }}</span>
      </md-app-toolbar>

      <!--<md-app-drawer :md-active.sync="menuVisible">
        <md-toolbar class="md-transparent" md-elevation="0">Navigation</md-toolbar>
        <md-list>
          <router-link to="/">
            <md-list-item>
              <md-icon>send</md-icon>
              <span class="md-list-item-text">Login</span>
            </md-list-item>
          </router-link>
          <router-link to="/url-maker/">
            <md-list-item>
              <md-icon>send</md-icon>
              <span class="md-list-item-text">URL Maker</span>
            </md-list-item>
          </router-link>
        </md-list>
      </md-app-drawer>-->

      <md-app-content>
        <router-view/>
      </md-app-content>
    </md-app>
  </div>
</template>

<script>
export default {
  name: 'UrlMakerApp',
  data: () => ({
    name: 'Room URL Maker',
    menuVisible: false
  })
}
</script>

<style>
  .md-app {
    min-height: 100vh;
  }
</style>
