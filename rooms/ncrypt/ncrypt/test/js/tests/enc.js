var nCryptTestEnc = (function(){
var enc = {};

enc.iter = 10;

var nCrypt;
var sampleData = null; // sampleData.text.[short|medium|long]
var eventDone = null; // function to call after tests have run
var debugMode = false; // log more details

var log = {
    "lines": [],
    "passed": true
};

/*
 * Please note: This test does NOT test converting data which is not suitable
 * for utf8-conversion to utf8. For example, hashes and raw cipher output (bit
 * array / byte array) can often be converted to hex, base32 etc. very well, but
 * utf8-encoding will fail (though it would shorten the string).
 * When trying to encode an array into a string as short as possible, try
 * before what works well, and what results in exceptions.
 * */

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---enc.tests------------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

enc.tests = {};
enc.tests.tools = {};
enc.tests.tools.isStr = function(obj){
    return typeof obj === "string";
};
enc.tests.tools.isArrayOfNumbers = function(obj){
    if(!Array.isArray(obj)) return false;
    for(var i=0; i<obj.length; i++){
        if(typeof obj[i]!=="number") return false;
    }
    return true;
};
enc.tests.conf = {
    "encodings": [null,"bytes","hex","base32","base64","base64url","utf8"]
};
enc.tests.run = function(){
    var teststr = sampleData.text.medium;
    var encoded_teststrs = [
        [ "none", nCrypt.enc.transform(teststr,"utf8",null) ],
        [ "bytes", nCrypt.enc.transform(teststr,"utf8","bytes") ],
        [ "hex", nCrypt.enc.transform(teststr,"utf8","hex") ],
        [ "base32", nCrypt.enc.transform(teststr,"utf8","base32") ],
        [ "base64", nCrypt.enc.transform(teststr,"utf8","base64") ],
        [ "base64url", nCrypt.enc.transform(teststr,"utf8","base64url") ],
        [ "utf8", teststr ]
    ];
    for(var i=0; i<encoded_teststrs.length; i++){
        var tstenc = encoded_teststrs[i][0];
        var tststr = encoded_teststrs[i][1];
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(tststr)){
            var tststr_err = "Error: Exception occured while: Encoding utf8 "+
                           "data to "+tstenc+"!";
            enc.onerror(tststr_err, tststr);
        }else{
            if(!enc.tests.tools.isStr(tststr) &&
               !enc.tests.tools.isArrayOfNumbers(tststr)){
                var tststr_unexp =
                                "Error: Unexcepted output while: Encoding utf8 "+
                               "data to "+tstenc+"!";
                enc.onerror(tststr_unexp, tststr);
            }
        }
    }
    if(log.passed==="false"){
        enc.done();
        return;
    }
    enc.tests.encodingTo({"max": enc.iter, "data": encoded_teststrs});
};
enc.tests.encodingTo = function(args){
    var runf = function(args){
        if(typeof args.count!=="number") args.count = 0;
        if(typeof args.iter!=="number") args.iter = 0;
        if(typeof args.enc!=="number") args.enc = 0;
        var t_encs = enc.tests.conf.encodings;
        var t_enc = t_encs[args.iter];
        /* ------------------------------------------------------------------ */
        var tstenc = args.data[args.enc][0];
            if(tstenc==="none") tstenc = null;
        var tststr = args.data[args.enc][1];

        var to_enc = nCrypt.enc.transform(tststr, tstenc, t_enc);

        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(to_enc)){
            var to_enc_err = "Error: Exception occured while: Encoding "+tstenc+
                           " data to "+t_enc+"!";
            enc.onerror(to_enc_err, to_enc);
        }else{
            // if this is not a string or array of numbers
            if(!enc.tests.tools.isStr(to_enc) &&
               !enc.tests.tools.isArrayOfNumbers(to_enc)){
                var to_enc_unexp = "Error: Unexcepted output while: Encoding "+
                               tstenc+"data to "+t_enc+"!";
                enc.onerror(to_enc_unexp, to_enc);
            }
        }
        if(log.passed===true){
            var from_enc = nCrypt.enc.transform(to_enc,t_enc,tstenc);
            if(nCrypt.dep.SecureExec.tools.proto.inst.isException(from_enc)){
                var is_exp_err = "Error: Exception occured while: "+
                               "(Re)encoding "+t_enc+
                               "data to "+tstenc+"!";
                enc.onerror(is_exp_err, from_enc);
            }else{
                // if this is not a string or array of numbers
                var is_valid = enc.tests.tools.isStr(from_enc) ||
                               enc.tests.tools.isArrayOfNumbers(from_enc);
                if(is_valid===false){
                    var non_valid = "Error: Unexcepted output while: "+
                                   "(Re)encoding "+t_enc+
                                    "data to "+tstenc+"!";
                    enc.onerror(non_valid, from_enc);
                }
            }
        }
        if(enc.tests.tools.isArrayOfNumbers(from_enc))
            from_enc = from_enc.toString();
        if(enc.tests.tools.isArrayOfNumbers(tststr))
            tststr = tststr.toString();
        if(tststr!==from_enc){
            var from_enc_err="Error: Unexcepted output while: "+
                           "(Re)encoding "+t_enc+
                            "data to "+tstenc+"!";
            enc.onerror(from_enc_err, from_enc);
        }
        if(log.passed===true){
            enc.log(" ");
            enc.log("Encoding "+tstenc+" to "+t_enc+
                    " and the other way round.");
            enc.log("Test data: Encoding: "+tstenc+" ");
            //enc.log(tststr);
            enc.log("Encoded to "+t_enc+".");
            //enc.log(to_enc.toString());
            enc.log("Decoded from "+t_enc+".");
            //enc.log(from_enc.toString());
            enc.log(" ");
        }
        /* ------------------------------------------------------------------ */

        if(args.enc >= (args.data.length-1)){
            args.enc=0;
            if(args.iter >= (t_encs.length-1)){
                args.iter = 0;
                args.count += 1;
            }else{ args.iter += 1; }
        }else{ args.enc += 1; }
        if(args.count === args.max || log.passed===false){
            args.complete = true;
        }
        return args;
    };
    var donef = function(args){
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(args)){
            var msg = "Error: Exception occured during testing, testing "+
                           "function failed.";
            enc.onerror(msg, args);
        }
        enc.done();
    };
    nCrypt.dep.SecureExec.async.until(runf, donef, args);
};
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---/-enc.tests----------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

enc.onerror = function(msg, logobj){
    log.lines.push(msg);
    log.passed = false;
    enc.log(" ");
    enc.log(msg);
    enc.log(logobj);
    enc.log(" ");
};

enc.runTest = function(ncrypt, sample, evt_done, debug){
    nCrypt = ncrypt;
    sampleData = sample;
    eventDone = evt_done;
    if(typeof debug === "boolean") debugMode = debug;
    enc.start();
};

enc.start = function(){
    enc.tests.run();
};
enc.done = function(){
    eventDone(log);
};
enc.log = function(obj){
    if(debugMode===true) console.log(obj);
};

return enc;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nCryptTestEnc;
    }
    exports.nCryptTestEnc = nCryptTestEnc;
}else if (typeof define === 'function' && define.amd) {
    define([], nCryptTestEnc);
}else if(typeof window!=="undefined"){
    window.nCryptTestEnc = nCryptTestEnc;
}
else {}
