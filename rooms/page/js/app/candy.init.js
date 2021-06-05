MobileCandyInit.tasks.push(function(opts, next){

$('body>div').hide();
$('#chat').show();

Candy.init(opts['candy']['transport'], {
    core: {
        // only set this to true if developing / debugging errors
        debug: false,
        autojoin: [ opts['candy']['room'] ],
        resource: opts['candy']['resource']
    },
    view: { 
        assets: '../res/' 
    }
});

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
CandyRosterToggle.init();

CandyShop.Colors.init(12);
// CandyShop.SlashCommands.init();
// CandyShop.MeDoes.init();
CandyShop.ModifyRole.init();

MobileCandyCrypto.RoomEncryption.init(opts['crypto']);
if(typeof opts['candy']['pass'].length<1 && opts['candy']['anon'].length>0){
    Candy.Core.connect(opts['candy']['anon'], null, opts['candy']['jid']);
}else{
    // "JID" isn't a JID here, just the nickname 
    Candy.Core.connect(opts['candy']['jid'], opts['candy']['pass']);
}

});
