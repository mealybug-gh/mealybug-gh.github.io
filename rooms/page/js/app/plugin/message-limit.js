var CandyMessageLimit = (function(self, Candy, $) {
	self.onMessageFormInputAdded = function(e, args) {
		window.console.log('setting max length for message form input');
		$('input[name="message"]').attr('maxlength', '250');
	};
	self.init = function() {
    	$(Candy).bind('candy:view.room.after-add', self.onMessageFormInputAdded);
		$(Candy).bind('candy:view.room.after-show', self.onMessageFormInputAdded);
    };
	return self;
}(CandyMessageLimit || {}, Candy, jQuery));
