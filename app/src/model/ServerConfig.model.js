export class ServerConfig {
  constructor (httpBind, server) {
    this.httpBind = httpBind && httpBind.length > 1 ? httpBind : 'https://jabber.hot-chilli.net/http-bind'
    this.server = server && server.length > 1 ? server : ''
  }
}

export class ServerConfigConverse {
  constructor (httpBind, server, room, register) {
    var _base = new ServerConfig(httpBind, server)
    this.httpBind = _base.httpBind
    this.server = _base.server
    this.room = room && room.length > 1 ? room : ''
    this.register = register && register.length > 1 ? register : ''
  }

  getConverseURL () {
    return window.location.origin + '/converse.html#?' +
    '&httpBind=' + encodeURIComponent(this.httpBind) +
    '&server=' + encodeURIComponent(this.server) +
    '&room=' + encodeURIComponent(this.room) +
    '&register=' + encodeURIComponent(this.register)
  }
}

export class URLMaker {
  paramsToJSON (str) {
    try {
      if (typeof str !== 'string' || str.length < 1 || str.indexOf('=') < 0) return {}
      var pairs = str.slice(0).split('&')
      var result = {}
      pairs.forEach(function (pair) {
        pair = pair.split('=')
        result[pair[0]] = decodeURIComponent(pair[1] || '')
      })
      return JSON.parse(JSON.stringify(result))
    } catch (e) {
      return {}
    }
  }
  paramsFromHash (hash, loginValues) {
    hash = hash && hash.length ? hash : window.location.hash
    if (hash.indexOf('#') >= 0) {
      hash = hash.split('#', 2)
      hash = hash.length > 1 ? hash[1] : hash[0]
    }
    if (typeof hash !== 'string' || hash.length < 1) return false
    hash = hash.split('?')
    if (hash.length < 1) return false
    hash = hash[1]
    if (typeof hash !== 'string' || hash.length < 1) return false

    var vals = this.paramsToJSON(hash)
    for (var k in loginValues) { // loginValues is a ServerConfig
      if (typeof vals[k] === 'string') loginValues[k] = vals[k]
    }
    return loginValues
  }
}
