var nCryptTestMessage = (function(){
var message = {};

var nCrypt;
var sampleData = null; // sampleData.text.[short|medium|long]
var eventDone = null; // function to call after tests have run
var debugMode = false; // log more details

var log = {
    "lines": [],
    "passed": true
};

// -----------------------------------------------------------------------------
var testfn = function(done){
// #############################################################################
var _isExp = nCrypt.dep.SecureExec.tools.proto.inst.isException;
var curves = { 'sig': [ 'ed25519', 'secp256k1' ], 
               'enc': [ 'curve25519', 'ed25519', 'secp256k1' ] };
    curves.rand = function(sig){
        var i = 0;
        if(sig){ i = nCrypt.random.number.integer(0, 2);
        }else{ i = nCrypt.random.number.integer(0, 3); }
        if(sig){ return curves.sig[i]; }else{ return curves.enc[i]; }
    };
var ks = {};
    ks.loc = { 'full': null, 'pub': null, 'pass': 'pass0' };
    ks.rec = [ ];
var sk_args = [];
var msg = {};
    msg.processed = null;
var cleartext = 'test test test test test '+
                'a b c d e f g h i j k l m n o p q r s t u v w y z '+
                '0 1 2 3 4 5 6 7 8 9';
var symo = {
    'key': new nCrypt.asym.types.basic.secret.Secret(
                nCrypt.asym.types.basic.secret.source.STRING, 
                'password12345'
           ),
    'alg': 'aes',
    'opt': { 'iter': 200 }
};

var task_generate_local_keyset = function(cb){
    nCrypt.asym.simple.keyset.gen.generateAsync(
        curves.rand(false), 
        curves.rand(true), 
        ks.loc.pass, 
        'twofish', 
        { 'iter': 200 }, // this is just a test so key derivation is unimportant
        function(k, cb){
            if(_isExp(k)){ 
                message.onerror(k.name, k);
                cb(k); 
                return; 
            }
            ks.loc.full = k+'';
            ks.loc.pub  = nCrypt.asym.simple.keyset.pub.getPublic(k);
            message.log("Generated local keyset: ");
            message.log("- Full: ");
            message.log(ks.loc.full);
            message.log("- Public: ");
            message.log(ks.loc.pub);
            message.log("- Pass: "+ks.loc.pass);
            cb(true);
        }, 
        cb
    );
};
var task_generate_receiver_keysets = function(cb){
    nCrypt.asym.simple.keyset.gen.generateAsync(
        curves.rand(false), 
        curves.rand(true), 
        ('pass'+(ks.rec.length+1)), 
        'aes', 
        { 'iter': 200 }, // this is just a test so key derivation is unimportant
        function(k, cb){
            if(_isExp(k)){ message.onerror(k.name, k); cb(k); return; }
            var obj = {};
                obj.pass = ('pass'+(ks.rec.length+1));
                obj.full = k+'';
                obj.pub  = nCrypt.asym.simple.keyset.pub.getPublic(k);
            message.log("Generated receiver keyset: "+(ks.rec.length+1));
            message.log("- Full: ");
            message.log(obj.full);
            message.log("- Public: ");
            message.log(obj.pub);
            message.log("- Pass: "+obj.pass);
            ks.rec.push(obj);
            if(ks.rec.length>=5){
                cb(true); 
            }else{
                task_generate_receiver_keysets(cb);
            }
            return;
        }, 
        cb
    );
};
var task_generate_symkey_arr_args = function(cb){
    var iterate = function(recvks, cb){
        if(recvks.length<1){ cb(true); return; }
        var get_curve=function(k){
            try{
                return JSON.parse(k).enc.pub.c;
            }catch(e){}
        };
        var rks = recvks.shift();
        var rkp = rks.pub;
        var lkf = ks.loc.full; var lkfp = ks.loc.pass;
        var crks = get_curve(rks);
        var clkf = get_curve(lkf);
        var arg;
        if(typeof crks==='string' && typeof clkf==='string' &
           crks===clkf){
            arg = {
                'public_keyset': rkp+'',
                'local_keyset': lkf+'',
                'local_keyset_pass': lkfp+''
            };
        }else{
            arg = {
                'public_keyset': rkp+''
            };
        }
        message.log("Symmetric key encryption argument item "+
                    (ks.rec.length-recvks.length));
        message.log(arg);
        sk_args.push(arg);
        iterate(recvks, cb);
    };
    iterate(ks.rec.slice(0), cb);
};
var task_process = function(cb){
    nCrypt.asym.simple.message.sender.process.both(
        cleartext,
        sk_args, 
        ks.loc.full,
        ks.loc.pass,
        symo.key, symo.alg, symo.opt,
        function(m, cb){
            message.log("CALLED!");
            if(_isExp(m)){ message.log(m.name, m); cb(m); return; }
            msg.processed = m;
            message.log("Processed message (encrypt and sign): ");
            message.log(m);
            cb(true); return;
        },
        cb
    );
};

var task_deprocess = function(cb){
    var iterate = function(recvks, cb){
        if(recvks.length<1){ cb(true); return; }
        var get_curve=function(k){
            try{
                return JSON.parse(k).enc.pub.c;
            }catch(e){}
        };
        var rks = recvks.shift();
        var rkf = rks.full; var rkfp = rks.pass;
        var m = msg.processed;
        nCrypt.asym.simple.message.receiver.process.both(
            m, 
            rkf, rkfp, 
            ks.loc.pub, null, 
            function(r,cb){
                if(_isExp(r)){ message.onerror(r.name,r); cb(r); return; }
                var ctxt = r.cleartext; var ver = (r.verified===true);
                if(ctxt===cleartext && ver===true){
                    message.log("Decrypted and verified: ");
                    message.log(r);
                }else{
                    message.log("Failed to decrypt and verify: ");
                    message.log(r);
                }
                iterate(recvks, cb);
            }, 
            cb
        );
    };
    iterate(ks.rec.slice(0), cb);
};

var tasks = [
    task_generate_local_keyset,
    task_generate_receiver_keysets,
    task_generate_symkey_arr_args,
    task_process,
    task_deprocess
];
var iterate_tasks = function(tasks){
    if(tasks.length<1){ done(true); return; }
    var t = tasks.shift();
    setTimeout(function(){
        t(function(res){
            if(_isExp(res)){ done(res); return; }
            iterate_tasks(tasks);
        });
    }, 0);
};
iterate_tasks(tasks.slice(0));
// #############################################################################
};
// -----------------------------------------------------------------------------

message.tests = {};
message.tests.run = function(){
    testfn(function(){
        message.log("\nTests done.");
        message.done();
    });
};

message.runTest = function(ncrypt, sample, evt_done, debug){
    nCrypt = ncrypt;
    sampleData = sample;
    eventDone = evt_done;
    if(typeof debug === "boolean") debugMode = debug;
    message.start();
};

message.start = function(){
    message.tests.run();
};
message.done = function(){
    eventDone(log);
};
message.log = function(obj){
    if(debugMode===true) console.log(obj);
};
message.onerror = function(msg, logobj){
    log.lines.push(msg);
    log.passed = false;
    message.log(" ");
    message.log(msg);
    message.log(logobj);
    message.log(" ");
};

return message;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nCryptTestMessage;
    }
    exports.nCryptTestMessage = nCryptTestMessage;
}else if (typeof define === 'function' && define.amd) {
    define([], nCryptTestMessage);
}else if(typeof window!=="undefined"){
    window.nCryptTestMessage = nCryptTestMessage;
}
else {}
