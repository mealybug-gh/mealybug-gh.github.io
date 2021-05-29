<template>
  <div class="content">
    <form novalidate class="md-layout" @submit.prevent="validateFormInput">
      <md-card class="md-layout-item md-size-50 md-small-size-100">
        <md-card-content>
          <!--<div class="md-layout md-gutter">-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('server')">
                <label for="server">XMPP Server</label>
                <md-input name="server" id="server" autocomplete="off" v-model="form.server" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.server.required">The server URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.server.minlength">Invalid server URL.</span>
              </md-field>
            <!--</div>-->

            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('httpBind')">
                <label for="http-bind">HTTP-Bind</label>
                <md-input name="http-bind" id="http-bind" autocomplete="off" v-model="form.httpBind" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.httpBind.required">The HTTP-Bind (BOSH) URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.httpBind.minlength">Invalid HTTP-Bind (BOSH) URL.</span>
              </md-field>
            <!--</div>-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('room')">
                <label for="http-bind">Rooms (optional)</label>
                <md-input name="room" id="room" autocomplete="off" v-model="form.room" :disabled="isRedirecting" placeholder="myroom1@muc.server.com, myroom2@muc.server.com" />
                <span class="md-helper-text">Comma seperated list of room JIDs.</span>
              </md-field>
            <!--</div>-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('register')">
                <label for="register">Sign-Up URL (optional)</label>
                <md-input name="register" id="register" autocomplete="family-name" v-model="form.register" :disabled="isRedirecting" />
                <span class="md-helper-text">For servers not supporting in-band registration. Adds an annoying popup.</span>
              </md-field>
            <!--</div>-->
          <!--</div>-->

        </md-card-content>

        <md-progress-bar md-mode="indeterminate" v-if="isRedirecting" />

        <md-card-actions>
          <md-button type="submit" class="md-primary" :disabled="isRedirecting">Make URL</md-button>
        </md-card-actions>

        <md-card-content>
          <md-field>
            <label>Copy URL:</label>
            <md-input v-model="resUrl" readonly></md-input>
          </md-field>
        </md-card-content>
      </md-card>
    </form>
  </div>
</template>

<script>
import { validationMixin } from 'vuelidate'
import {
  required
} from 'vuelidate/lib/validators'
import {ServerConfigConverse} from '../model/ServerConfig.model'
export default {
  name: 'RoomMaker',
  mixins: [validationMixin],
  data: () => ({
    form: {
      httpBind: '',
      server: '',
      room: '',
      register: ''
    },
    isRedirecting: false,
    resUrl: ''
  }),
  validations: {
    form: {
      httpBind: {
        required
      },
      server: {
        required
      },
      room: {
        required
      },
      register: {
      }
    }
  },
  methods: {
    getValidationClass (fieldName) {
      const field = this.$v.form[fieldName]
      if (field) {
        return {
          'md-invalid': field.$invalid && field.$dirty
        }
      }
    },
    clearForm () {
      this.$v.$reset()
      this.form.httpBind = ''
      this.form.server = ''
      this.form.room = ''
      this.form.register = ''
      this.resUrl = ''
    },
    goToConverse () {
      this.isRedirecting = true
      // eslint-disable-next-line
      var serverConfigConverse = new ServerConfigConverse(this.form.httpBind, this.form.server, this.form.room, this.form.register)
      this.resUrl = serverConfigConverse.getConverseURL()
      this.isRedirecting = false
      // go to new url ...
      // window.location.href = serverConfigConverse.getConverseURL()
    },
    validateFormInput () {
      this.$v.$touch()
      if (!this.$v.$invalid) {
        this.goToConverse()
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
