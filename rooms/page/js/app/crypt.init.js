MobileCandyInit.tasks.push(function(opts, next){

var print_progress = function(msg){
    if(typeof msg!=='number') msg = 0;
    $('span.init.progress').text(msg+'%');
};
var print_message = function(msg){
    $('span.init.message').text(msg);
};
var init_done = function(){
    var generate_keys = function(cb){
        var keyopts = {};
        var locpass = nCrypt.random.str.generate(256, 'base64url', true);
        var genkeys = nCrypt.asym.simple.keyset.gen.generateAsync;
        genkeys('curve25519', null, locpass, 'twofish', {}, function(ks){
            if(typeof ks!=='string'){
                print_message('Failed to generate keys!'); return false;
            }
            keyopts['asym'] = {
                'priv': {
                    'pass': locpass,
                    'ks': ks
                },
                'pub': nCrypt.asym.simple.keyset.pub.getPublic(ks)
            };
            keyopts['sym'] = { 'cipher': 'twofish' };
            keyopts['proto'] = { 'wait': 15 };
            cb(keyopts);
        });
    };
    $('span.init.progress').text('');
    print_message('Please wait a few seconds - keys are being generated.');
    generate_keys(function(keyopts){
        opts['crypto'] = keyopts;
        print_message('Done!');
        setTimeout(function(){ next(opts); }, 0);
    });
};

// Trust the browser RNG? Then, if a browser 
// environment is found, prefer collecting random data from browser. Otherwise,
// prefer collecting random data from mouse- or touchmoves.
var trust_browser_random = true;

// Check whether there is a built-in random number generator. In NodeJS, there
// should be.
var can_collect_from_machine = nCrypt.dep.randomCollector.random.check.
                                    hasBuiltInRNG();

// Check whether random values can be collected from mouse- or touchmoves, i.e.
// if we run in a browser and there is a mouse or touchpad.
var can_collect_from_moves = nCrypt.dep.randomCollector.random.check.
                                hasMouseOrTouchSupport();

if(can_collect_from_machine===false && can_collect_from_moves===false){
    throw new Error('No source for random data available!');
}

var _random_source = nCrypt.dep.randomCollector.random.source.MACHINE;
if((trust_browser_random===false && can_collect_from_moves===true) ||
   (can_collect_from_machine===false && can_collect_from_moves===true)){
    _random_source = nCrypt.dep.randomCollector.random.source.USER;
}

var callback_random_data_collected = function(buf){
    // Called when random data has been collected. 
    // @buf is an instance of Uint32Array
    // nCrypt can be initialised here.
    var ncrypt_initialised = nCrypt.init.init(buf);
    if(typeof ncrypt_initialised==='boolean'){
        if(ncrypt_initialised){
            // nCrypt is initialised. You can use it now :).
            print_progress(100);
            init_done();
        }else{
            // Initialising has failed for some reason. 
            // Check parameters, try once more if they are correct? 
            // If parameters are correct and simply using more random data
            // (longer array) doesn't work, there's a bug.
            print_message(
                'Failed to start cryptography module! (Unknown error.');
        }
    }else{
        var _isExp = nCrypt.dep.SecureExec.tools.proto.inst.isException;
        if(_isExp(ncrypt_initialised)){
            // The function returned a `SecureExec.exception.Exception` object,
            // i.e. caught an exception internally. 
            // Check your parameters - are they correct?
            print_message(
                'Failed to start cryptography module!'); // print err here
        }else{
            // Unexpected output. Bug here?
            print_message(
                'Failed to start cryptography module! (Unknown error.)');
        }
    }
};
var callback_collection_progress = function(prg){
    // @prg is a value between 0 and 100, showing the progress of 
    // data collection from user input in percent. Will only be called
    // if collecting data from user input (mouse-/ touchmoves). 
    // As collecting takes some time, show users a progress bar etc.
    print_progress(prg);
};

// Generate 4096 bit of random data to be sure there's enough to initialise 
// **nCrypt**. 4096 bit of random data are equal to 4096/8=512 byte, with an 
// Int32 representing 4 byte of data.
var tmp_ab = new Uint32Array(((4096/8)/4));

$('body>div').hide();
$('#init').show();
print_message(
    'Please move your cursor as randomly as possible in this window.');

nCrypt.dep.randomCollector.random.collect(
    _random_source,
    tmp_ab,
    callback_random_data_collected,
    callback_collection_progress
);

});
