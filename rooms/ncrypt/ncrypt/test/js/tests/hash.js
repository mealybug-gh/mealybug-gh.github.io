var nCryptTestHash = (function(){
var hash = {};

hash.iter = 10;

var nCrypt;
var sampleData = null; // sampleData.text.[short|medium|long]
var eventDone = null; // function to call after tests have run
var debugMode = false; // log more details

var log = {
    "lines": [],
    "passed": true
};

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---hash.tests-----------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

hash.tests = {};
hash.tests.tools = {};
hash.tests.tools.isStr = function(obj){
    return typeof obj === "string";
};
hash.tests.tools.isArrayOfNumbers = function(obj){
    if(!Array.isArray(obj)) return false;
    for(var i=0; i<obj.length; i++){
        if(typeof obj[i]!=="number") return false;
    }
    return true;
};
hash.tests.conf = {
    "encodings": [null, "bytes", "hex", "base32", "base64", "base64url" ],
    "hash": [ "md5", "sha1", "ripemd160", "sha256", "sha512" ],
    "data": ""
};
hash.tests.run = function(){
    hash.tests.conf.data = sampleData.text.medium;
    var runf = function(args){
        if(typeof args.enc!=="number") args.enc = 0;
        if(typeof args.hash!=="number") args.hash = 0;
        if(typeof args.count!=="number") args.count = 0;
        /* ------------------------------------------------------------------ */
        var t_hash = hash.tests.conf.hash[args.hash];
        var t_enc = hash.tests.conf.encodings[args.enc];
        var t_data = hash.tests.conf.data;
        hash.tests.testHash(t_data, t_hash, t_enc);
        /* ------------------------------------------------------------------ */
        if(log.passed!==true){
            args.complete = true;
            return args;
        }
        /* ------------------------------------------------------------------ */
        args.enc += 1;
        if(args.enc >= hash.tests.conf.encodings.length){
            args.enc = 0;
            args.hash += 1;
        }
        if(args.hash >= hash.tests.conf.hash.length){
            args.hash = 0;
            args.count += 1;
        }
        if(args.count >= args.max){
            args.complete = true;
            return args;
        }
        /* ------------------------------------------------------------------ */
        return args;
    };
    var donef = function(args){
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(args)){
            var msg = "Error: Error occured while running test (in test "+
                           "application code)!";
            hash.onerror(msg);
        }
        hash.done();
    };
    var args = { "max": hash.iter };
    nCrypt.dep.SecureExec.async.until(runf, donef, args);
};
hash.tests.testHash = function(data, alg, enc){
    var tsthash = nCrypt.hash.hash(data,alg,enc);
    if(nCrypt.dep.SecureExec.tools.proto.inst.isException(tsthash)){
        var msg = "Error: Error occured while trying to apply hash "+alg+
                       "encoded using encoding "+enc+"!";
        hash.onerror(msg);
        return;
    }
    if(!hash.tests.tools.isStr(tsthash) &&
       !hash.tests.tools.isArrayOfNumbers(tsthash)){
        var msg = "Error: Unexpected output while trying to apply hash "+
                        alg+"encoded using encoding "+enc+"!";
        hash.onerror(msg);
        return;
    }
    hash.log(" ");
    hash.log("Applying hash "+alg+" for data using "+enc+" for encoding");
    hash.log(tsthash.toString());
    hash.log(" ");
};

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---/-hash.tests----------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

hash.onerror = function(msg, logobj){
    log.lines.push(msg);
    log.passed = false;
    hash.log(" ");
    hash.log(msg);
    hash.log(logobj);
    hash.log(" ");
};

hash.runTest = function(ncrypt, sample, evt_done, debug){
    nCrypt = ncrypt;
    sampleData = sample;
    eventDone = evt_done;
    if(typeof debug === "boolean") debugMode = debug;
    hash.start();
};

hash.start = function(){
    hash.tests.run();
};
hash.done = function(){
    eventDone(log);
};
hash.log = function(obj){
    if(debugMode===true) console.log(obj);
};

return hash;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nCryptTestHash;
    }
    exports.nCryptTestHash = nCryptTestHash;
}else if (typeof define === 'function' && define.amd) {
    define([], nCryptTestHash);
}else if(typeof window!=="undefined"){
    window.nCryptTestHash = nCryptTestHash;
}
else {}

