var CandyRosterToggle = (function(self, Candy, $) {
	self.init = function() {
    $('#chat-usercount').click(function() {
      if ( $(window).innerWidth() > 600 ) {
        if ( $('#chat').hasClass('show-mobile-roster') ) {
          $('#chat').removeClass('show-mobile-roster')
        }
      } else {
        if ( $('#chat').hasClass('show-mobile-roster') ) {
          $('#chat').removeClass('show-mobile-roster')
        } else {
          $('#chat').addClass('show-mobile-roster');
        }
      }
    });
  };
	return self;
}(CandyRosterToggle || {}, Candy, jQuery));
