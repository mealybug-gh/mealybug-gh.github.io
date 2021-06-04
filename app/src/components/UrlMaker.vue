<template>
  <div class="content">
    <form novalidate class="md-layout" @submit.prevent="validateFormInput">
      <md-card class="md-layout-item md-size-50 md-small-size-100">
        <md-card-content>
          <!--<div class="md-layout md-gutter">-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('host')">
                <label for="host">XMPP Server</label>
                <md-input name="host" id="host" autocomplete="off" v-model="form.host" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.host.required">The host URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.host.minlength">Invalid host URL.</span>
              </md-field>
            <!--</div>-->

            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('transport')">
                <label for="http-bind">HTTP-Bind</label>
                <md-input name="http-bind" id="http-bind" autocomplete="off" v-model="form.transport" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.transport.required">The HTTP-Bind (BOSH) URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.transport.minlength">Invalid HTTP-Bind (BOSH) URL.</span>
              </md-field>
            <!--</div>-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('muc')">
                <label for="http-bind">Multi-User Chat</label>
                <md-input name="muc" id="muc" autocomplete="off" v-model="form.muc" :disabled="isRedirecting" placeholder="conference.server.com" />
                <span class="md-helper-text">MUC domain.</span>
              </md-field>
            <!--</div>-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('room')">
                <label for="http-bind">Rooms</label>
                <md-input name="room" id="room" autocomplete="off" v-model="form.room" :disabled="isRedirecting" placeholder="myroom1,myroom2" />
                <span class="md-helper-text">Comma seperated list of room names.</span>
              </md-field>
            <!--</div>-->
            <!--<div class="md-layout-item md-small-size-100">-->
              <md-field :class="getValidationClass('register')">
                <label for="register">Sign-Up URL (optional)</label>
                <md-input name="register" id="register" autocomplete="family-name" v-model="form.register" :disabled="isRedirecting" />
                <span class="md-helper-text">For hosts not supporting in-band registration.</span>
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
import {ServerConfigRooms} from '../model/ServerConfig.model'
export default {
  name: 'RoomMaker',
  mixins: [validationMixin],
  data: () => ({
    form: {
      transport: '',
      host: '',
      muc: '',
      room: '',
      register: ''
    },
    isRedirecting: false,
    resUrl: ''
  }),
  validations: {
    form: {
      transport: {
        required
      },
      host: {
        required
      },
      muc: {
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
      this.form.transport = ''
      this.form.host = ''
      this.form.room = ''
      this.form.register = ''
      this.resUrl = ''
    },
    goToConverse () {
      this.isRedirecting = true
      // eslint-disable-next-line
      var hostConfigConverse = new ServerConfigRooms(this.form.transport, this.form.host, this.form.muc, this.form.room, this.form.register)
      this.resUrl = hostConfigConverse.getConverseURL()
      this.isRedirecting = false
      // go to new url ...
      // window.location.href = hostConfigConverse.getConverseURL()
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
