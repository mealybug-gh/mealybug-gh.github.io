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
                <span class="md-error" v-if="!$v.form.server.required">The server name is required.</span>
                <span class="md-error" v-else-if="!$v.form.server.minlength">Invalid server name.</span>
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
          </div>

        </md-card-content>

        <md-progress-bar md-mode="indeterminate" v-if="isRedirecting" />

        <md-card-actions>
          <md-button type="submit" class="md-primary" :disabled="isRedirecting">Login</md-button>
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
import {ServerConfigConverse} from '../model/MealwormBasement.model'
export default {
  name: 'Converse',
  mixins: [validationMixin],
  data: () => ({
    msg: 'Converse.js Messenger',
    form: {
      httpBind: '',
      server: ''
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
      this.resUrl = false
    },
    goToConverse () {
      this.isRedirecting = true
      // eslint-disable-next-line
      this.resUrl = new ServerConfigConverse(this.form.httpBind, this.form.server, '', '', '').getConverseURL()
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
