var CandyMessageLimit = (function(self, Candy, $) {
	self.init = function() {
    $('input[name="message"]').attr('maxlength', '250');
	window.console.debug('setting message maxlength');
    setTimeout(function() {
      $('input[name="message"]').attr('maxlength', '250');
	  window.console.debug('setting message maxlength');
    }, 2000);
  };
	return self;
}(CandyMessageLimit || {}, Candy, jQuery));
