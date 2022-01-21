var CandyMessageLimit = (function(self, Candy, $) {
	self.init = function() {
    $('input[name="message"]').attr('maxlength', '250');
    setTimeout(function() {
      $('input[name="message"]').attr('maxlength', '250');
    }, 2000);
  };
	return self;
}(CandyMessageLimit || {}, Candy, jQuery));
