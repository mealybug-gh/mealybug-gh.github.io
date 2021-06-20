var CandyEnforceFreshSession = (function(self, Candy, $) {
	self.init = function() {
    var clearJavascriptCookies = function() {
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
          var cookie = cookies[i];
          var eqPos = cookie.indexOf("=");
          var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    };
    var onDisconnectOrFail = function() {
      clearJavascriptCookies();
      window.location.reload();
      return false;
    };
    var logStatus = function(status) {
      window.console.debug('logStatus');
      window.console.debug(status);
    };
    $(Candy).on('candy:view.connection.status-0', onDisconnectOrFail);
    $(Candy).on('candy:view.connection.status-2', onDisconnectOrFail);
    $(Candy).on('candy:view.connection.status-4', onDisconnectOrFail);
    $(Candy).on('candy:view.connection.status-6', onDisconnectOrFail);
    window.addEventListener('hashchange', onDisconnectOrFail);
    $(Candy).on('candy:view.connection.status-1', function(){ logStatus(1) });
    $(Candy).on('candy:view.connection.status-3', function(){ logStatus(3) });
    $(Candy).on('candy:view.connection.status-5', function(){ logStatus(5) });
    $(Candy).on('candy:view.connection.status-7', function(){ logStatus(7) });
    $(Candy).on('candy:view.connection.status-8', function(){ logStatus(8) });
  };
	return self;
}(CandyEnforceFreshSession || {}, Candy, jQuery));
