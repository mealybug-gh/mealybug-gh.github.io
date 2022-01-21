MobileCandyInit.tasks.push(function(opts, next){

$('body>div').hide();
$('#chat').show();

Candy.init(opts['candy']['transport'], {
    core: {
        // only set this to true if developing / debugging errors
        debug: false,
        autojoin: [ opts['candy']['room'] ],
        resource: opts['candy']['resource'],
        crop: { message: { nickname: 15, body: 2000 }, roster: { nickname: 15 } }
    },
    view: { 
        assets: '../res/' 
    }
});

CandyEnforceFreshSession.init();

CandyRosterToggle.init();

CandyMessageLimit.init();

CandyShop.Colors.init(12);

CandyShop.ModifyRole.init();

MobileCandyCrypto.RoomEncryption.init(opts['crypto']);

if(typeof opts['candy']['pass'].length<1 && opts['candy']['anon'].length>0){
    Candy.Core.connect(opts['candy']['anon'], null, opts['candy']['jid']);
}else{
    // "JID" isn't a JID here, just the nickname 
    Candy.Core.connect(opts['candy']['jid'], opts['candy']['pass']);
}

});
