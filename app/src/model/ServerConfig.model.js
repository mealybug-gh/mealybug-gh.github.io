export class ServerConfig {
  constructor (transport, host) {
    this.transport = transport && transport.length > 1 ? transport : 'https://jabber.hot-chilli.net/http-bind'
    this.host = host && host.length > 1 ? host : ''
  }
}

export class ServerConfigRooms {
  constructor (transport, host, muc, room, register) {
    var _base = new ServerConfig(transport, host)
    this.transport = _base.transport
    this.host = _base.host
    this.muc = muc && muc.length > 1 ? muc : ''
    this.room = room && room.length > 1 ? room : ''
    this.register = register && register.length > 1 ? register : ''
  }

  getConverseURL () {
    return window.location.origin + '/rooms/page/index.html#?' +
    '&transport=' + encodeURIComponent(this.transport) +
    '&host=' + encodeURIComponent(this.host) +
    '&muc=' + encodeURIComponent(this.muc) +
    '&room=' + encodeURIComponent(this.room) +
    '&signup=' + encodeURIComponent(this.register)
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
