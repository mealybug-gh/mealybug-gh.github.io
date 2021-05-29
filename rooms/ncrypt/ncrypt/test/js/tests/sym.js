var nCryptTestSym = (function(){
var sym = {};

sym.iter = 100;

var nCrypt;
var sampleData = null; // sampleData.text.[short|medium|long]
var eventDone = null; // function to call after tests have run
var debugMode = false; // log more details

var log = {
    "lines": [],
    "passed": true
};

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---sym.tests------------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

sym.tests = {};
sym.tests.tools = {};
sym.tests.tools.isStr = function(obj){
    return typeof obj === "string";
};
sym.tests.tools.isArrayOfNumbers = function(obj){
    if(!Array.isArray(obj)) return false;
    for(var i=0; i<obj.length; i++){
        if(typeof obj[i]!=="number") return false;
    }
    return true;
};
sym.tests.tools.getRandomSymOptions = function(){
    var conf = sym.tests.getConf();
    /* Get encryption algorithm */
    var algo = conf.algo[nCrypt.random.number.integer(1,4)];
    /* Get encryption options */
    var opts = {};
    if(algo==="aes"){
        opts.mode = conf.aes.mode[0];
        opts.ts   = conf.aes.ts[nCrypt.random.number.integer(0,3)];
    }else{
        //opts.mode = conf.block.mode[nCrypt.random.number.integer(0,2)];
        opts.mode = conf.block.mode[0];
    }
    opts.iter = nCrypt.random.number.integer(101,1000);
    return { "algo": algo, "opts": opts };
};
sym.tests.getConf = function(){
    var conf = {};
    /* Sample data */
    conf.sample = [
        sampleData.text.short,
        sampleData.text.medium,
        sampleData.text.long
    ];
    /* All algorithms */
    conf.algo = [ "aes", "rijndael", "twofish", "serpent" ];
    /* Config for non-aes blockcipher operations, i.e. the other algorithms */
    conf.block = {};
    conf.block.algo = [ "rijndael", "twofish", "serpent" ];
    conf.block.mode = [ "cbc" ];
    conf.block.keys = [ 128, 192, 256 ];
    /* Config for aes operations */
    conf.aes = {};
    conf.aes.algo = [ "aes" ];
    conf.aes.mode = [ "ccm", "gcm" ];
    conf.aes.keys = [ 128, 192, 256 ];
    conf.aes.ts = [ 64, 96, 128 ];
    return conf;
};
sym.tests.run = function(){
    var donef = function(args){
        sym.done();
    };
    var rsymf = sym.tests.tests.testSymWithRandomOptions;
    var rasymf = sym.tests.tests.testAsymWithRandomOptions;
    var tasks = [ rsymf, rasymf ];
    var call_args = {
        'final_callback': donef,
        'count': 0,
        'tasks': tasks
    };
    var args = { "max": sym.iter };
    nCrypt.dep.SecureExec.async.insecureSeries(call_args, args);
};
sym.tests.tests = {};
sym.tests.tests.testSymWithRandomOptions = function(auto_args, args){
    var encf = function(){
        var c = sym.tests.tools.getRandomSymOptions();
        var algo = c.algo; var opts = c.opts;
        var conf = sym.tests.getConf();
        /* Choose some data which can be encrypted synchronously */
        var data = conf.sample[nCrypt.random.number.integer(0,2)];
        /* Create some random password */
        var pass = nCrypt.random.str.generate(
                       nCrypt.random.number.integer(10,60), "base64url");
        /* Encrypt a string using these options */
        var enc = nCrypt.sym.sync.encrypt(data, pass, algo, opts);
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(enc)){
            sym.onerror("Encryption failed with algorithm "+algo+
                        " and options "+JSON.stringify(opts), enc);
            return false;
        }
        if(typeof enc!=="string"){
            sym.onerror("Unexpected output: "+
                        "Encryption failed with algorithm "+algo+
                        " and options "+JSON.stringify(opts), enc);
            return false;
        }
        /* Decrypt the encrypted string */
        var dec = nCrypt.sym.sync.decrypt(enc, pass);
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(dec)){
            sym.onerror("Decryption failed with algorithm "+algo+
                        " and options "+JSON.stringify(opts), dec);
            return false;
        }
        if(typeof dec!=="string" || dec!==data){
            sym.onerror("Unexpected output: "+
                        "Decryption failed with algorithm "+algo+
                        " and options "+JSON.stringify(opts), dec);
            return false;
        }
        return true;
    };
    var runf = function(arg){
        var passed = encf();
        if(typeof arg.count!=="number") arg.count = 0;
        if(arg.count<arg.max && passed===true){
            arg.count+=1;
            sym.log("nCrypt.sym.sync.encrypt/decrypt: Testrun "+
                     arg.count+" passed.");
        }else{
            arg.complete = true;
        }
        return arg;
    };
    var donef = function(res){
        auto_args.callback(auto_args, args);
    };
    var a = nCrypt.tools.proto.jsonobj.merge([args, {}]); // clone
    nCrypt.dep.SecureExec.async.until(runf, donef, a);
};
sym.tests.tests.testAsymWithRandomOptions = function(auto_args, args){
    var runf = function(arg){
        var get_conf = function(){
            var c = sym.tests.tools.getRandomSymOptions();
            var algo = c.algo; 
            var opts = c.opts;
            var conf = sym.tests.getConf();
            /* Choose some data which can be encrypted asynchronously */
            var data = conf.sample[nCrypt.random.number.integer(1,3)];
            //var data = conf.sample[1];
            /* Create some random password */
            var pass = nCrypt.random.str.generate(
                           nCrypt.random.number.integer(10,60), 
                           "base64url");
            return { "opts": opts, "algo": algo, "data": data, "pass": pass };
        };
        var run_enc = function(){
            var c = get_conf();
            nCrypt.sym.async.encrypt(c.data, c.pass, c.algo, 
                                         done_enc, c, c.opts);
        };
        var done_enc = function(enc,c){
            if(nCrypt.dep.SecureExec.tools.proto.inst.isException(enc)){
                if(typeof c=="object"){
                    var conf = { "algo": c.algo, 
                                 "opts": c.opts, 
                                 "pass": c.pass  };
                }
                var msg;
                if(typeof conf!=="undefined"){
                    msg = "Error: Exception occured while encrypting message "+
                          "using options: "+JSON.stringify(conf)+" !";
                }else{
                    msg = "Error: Exception during encryption!";
                }
                sym.onerror(msg, enc);
                donef();
                return;
            }else if(typeof enc!=="string"){
                if(typeof c=="object"){
                    var conf = { "algo": c.algo, "opts": opts, "pass": pass };
                }
                var msg;
                if(typeof conf!=="undefined"){
                    msg = "Error: Unexpected output while encrypting message "+
                          "using options: "+JSON.stringify(conf)+" !";
                }else{
                    msg = "Error: Unexpected output during encryption!";
                }
                sym.onerror(msg, enc);
                donef();
                return;
            }else{
                run_dec(enc, c.data, c.pass);
            }
        };
        var run_dec = function(enc, data, pass){
            nCrypt.sym.async.decrypt(enc, pass, done_dec, { "data": data, 
                                    "pass": pass });
        };
        var done_dec = function(dec, c){
            if(nCrypt.dep.SecureExec.tools.proto.inst.isException(dec)){
                var msg = "Error: Exception occured while decrypting message "+
                          "using password: "+c.pass+" !";
                sym.onerror(msg, dec);
                donef();
                return;
            }else if(typeof dec!=="string" || dec!==c.data){
                var msg = "Error: Unexpected output while decrypting message "+
                          "using password: "+c.pass+" !";
                sym.onerror(msg, dec);
                donef();
                return;
            }else{
                if(typeof arg.count!=="number") arg.count = 0;
                if(typeof arg.max!=="number"){
                    sym.onerror("args.max is not a number!");
                    donef();
                    return;
                }
                if(arg.count < arg.max){
                    arg.count += 1;
                    sym.log("nCrypt.sym.async.encrypt/decrypt: Testrun "+
                             arg.count+" passed.");
                    runf(arg);
                }else{
                    donef();
                }
            }
        };
        run_enc();
    };
    var donef = function(){
        auto_args.callback(auto_args, args);
    };
    var a = nCrypt.tools.proto.jsonobj.merge([args, {}]); // clone
    runf(a);
};

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---/-sym.tests----------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

sym.runTest = function(ncrypt, sample, evt_done, debug){
    nCrypt = ncrypt;
    sampleData = sample;
    eventDone = evt_done;
    if(typeof debug === "boolean") debugMode = debug;
    sym.start();
};

sym.start = function(){
    sym.tests.run();
};
sym.done = function(){
    eventDone(log);
};
sym.log = function(obj){
    if(debugMode===true) console.log(obj);
};
sym.onerror = function(msg, logobj){
    log.lines.push(msg);
    log.passed = false;
    sym.log(" ");
    sym.log(msg);
    sym.log(logobj);
    sym.log(" ");
};

return sym;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nCryptTestSym;
    }
    exports.nCryptTestSym = nCryptTestSym;
}else if (typeof define === 'function' && define.amd) {
    define([], nCryptTestSym);
}else if(typeof window!=="undefined"){
    window.nCryptTestSym = nCryptTestSym;
}
else {}
