<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <form novalidate class="md-layout" @submit.prevent="validateFormInput">
      <md-card class="md-layout-item md-size-50 md-small-size-100">
        <md-card-header>
          <div class="md-title">Login</div>
        </md-card-header>

        <md-card-content>
          <div class="md-layout md-gutter">
            <div class="md-layout-item md-small-size-100">
              <md-field :class="getValidationClass('server')">
                <label for="server">XMPP Server</label>
                <md-input name="server" id="server" autocomplete="family-name" v-model="form.server" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.server.required">The server URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.server.minlength">Invalid server URL.</span>
              </md-field>
            </div>

            <div class="md-layout-item md-small-size-100">
              <md-field :class="getValidationClass('httpBind')">
                <label for="http-bind">HTTP-Bind</label>
                <md-input name="http-bind" id="http-bind" autocomplete="given-name" v-model="form.httpBind" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.httpBind.required">The HTTP-Bind (BOSH) URL is required.</span>
                <span class="md-error" v-else-if="!$v.form.httpBind.minlength">Invalid HTTP-Bind (BOSH) URL.</span>
              </md-field>
            </div>

            <div class="md-layout-item md-small-size-100">
              <md-field :class="getValidationClass('muc')">
                <label for="http-bind">muc</label>
                <md-input name="muc" id="muc" autocomplete="given-name" v-model="form.muc" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.muc.required">Please enter a muc you want users to join.</span>
                <span class="md-error" v-else-if="!$v.form.muc.minlength">Invalid muc name.</span>
              </md-field>
            </div>

            <div class="md-layout-item md-small-size-100">
              <md-field :class="getValidationClass('anon')">
                <label for="anon">Anonymous use URL</label>
                <md-input name="server" id="anon" autocomplete="family-name" v-model="form.anon" :disabled="isRedirecting" />
              </md-field>
            </div>

            <div class="md-layout-item md-small-size-100">
              <md-field :class="getValidationClass('room')">
                <label for="http-bind">Room</label>
                <md-input name="room" id="room" autocomplete="given-name" v-model="form.room" :disabled="isRedirecting" />
                <span class="md-error" v-if="!$v.form.room.required">Please enter a room you want users to join.</span>
                <span class="md-error" v-else-if="!$v.form.room.minlength">Invalid room name.</span>
              </md-field>
            </div>
          </div>

        </md-card-content>

        <md-progress-bar md-mode="indeterminate" v-if="isRedirecting" />

        <md-card-actions>
          <md-button type="submit" class="md-primary" :disabled="isRedirecting">Make URL</md-button>
        </md-card-actions>

        <md-card-content>
          <md-field>
            <label>Copy this URL to use the room configured:</label>
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
import {ServerConfigCandy} from '../model/MealwormBasement.model'
export default {
  name: 'RoomMaker',
  mixins: [validationMixin],
  data: () => ({
    msg: 'XMPP Webchat-Rooms',
    form: {
      httpBind: '',
      server: '',
      muc: '',
      anon: '',
      room: ''
    },
    isRedirecting: false,
    resUrl: false
  }),
  validations: {
    form: {
      httpBind: {
        required
      },
      server: {
        required
      },
      muc: {
        required
      },
      anon: {
      },
      room: {
        required
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
      this.form.muc = ''
      this.form.anon = ''
      this.form.room = ''
      this.resUrl = false
    },
    goToCandy () {
      this.isRedirecting = true
      // eslint-disable-next-line
      var serverConfigCandy = new ServerConfigCandy(this.form.httpBind, this.form.server, this.form.muc, this.form.anon, this.form.room)
      this.resUrl = serverConfigCandy.getCandyURL()
      this.isRedirecting = false
      // go to new url ...
      // window.location.href = serverConfigConverse.getConverseURL()
    },
    validateFormInput () {
      this.$v.$touch()
      if (!this.$v.$invalid) {
        this.goToCandy()
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
