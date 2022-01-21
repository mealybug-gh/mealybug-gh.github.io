var CandyMessageLimit = (function(self, Candy, $) {
	self.events.candy.onMessageFormInputAdded = function(e, args) {
		window.console.log('setting max length for message form input');
		$('input[name="message"]').attr('maxlength', '250');
	};
	self.init = function() {
    	$(Candy).bind('candy:view.room.after-add', self.events.candy.onMessageFormInputAdded);
		$(Candy).bind('candy:view.room.after-show', self.events.candy.onMessageFormInputAdded);
    };
	return self;
}(CandyMessageLimit || {}, Candy, jQuery));
