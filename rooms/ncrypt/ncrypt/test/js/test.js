/* ---stay-compatible-with-nodejs-------------------------------------------- */
var isNodeJS = (function(){
if (typeof module !== "undefined" && module.exports) {
    if(typeof require!=="undefined"){
        if(typeof nCrypt==="undefined"){
            return true;
        }
    }
}
return false;
})();

if(isNodeJS){
    var nCrypt = require("../../bin/ncrypt.js");
}
/* -------------------------------------------------------------------------- */

var nCryptTest = (function(){

var  tst = {};
var _tst = {};
tst.trustBrowserRandom = true;
tst.runMod = "";
tst.verboseMode = false;

/* ########################################################################## */
/* #---nCryptTest.dep-------------------------------------------------------# */
/* ########################################################################## */

tst.dep = {};
tst.dep.getTestsObject = function(){
    var dep = {};
    dep.tests = {};
    if(isNodeJS===true){
        // sample
        dep.sample = require("../data/sampletext.js");
        // tests
        dep.tests.nCryptTestEnc = require("./tests/enc.js");
        dep.tests.nCryptTestHash = require("./tests/hash.js");
        dep.tests.nCryptTestSym = require("./tests/sym.js");
        dep.tests.nCryptTestMessageSymkey =
                                require("./tests/message.symkey.js");
        dep.tests.nCryptTestMessage = require("./tests/message.js");
        //dep.tests.nCryptTestAsym = require("./tests/asym.simple.js");
        //dep.tests.nCryptTestMsg = require("./tests/asym.message.js");
        return dep;
    }else{
        // sample
        dep.sample = nCryptTestSample || window.nCryptTestSample;
        // tests
        dep.tests.nCryptTestEnc = nCryptTestEnc || window.nCryptTestEnc;
        dep.tests.nCryptTestHash = nCryptTestHash || window.nCryptTestHash;
        dep.tests.nCryptTestSym = nCryptTestSym || window.nCryptTestSym;
        dep.tests.nCryptTestMessageSymkey = nCryptTestMessageSymkey ||
                                            window.nCryptTestMessageSymkey;
        dep.tests.nCryptTestMessage = nCryptTestMessage ||
                                      window.nCryptTestMessage;
        //dep.tests.nCryptTestAsym = nCryptTestAsym || window.nCryptTestAsym;
        //dep.tests.nCryptTestMsg = nCryptTestMsg || window.nCryptTestMsg;
    }
    return dep;
};

/* ########################################################################## */
/* #---nCryptTest.enc-------------------------------------------------------# */
/* ########################################################################## */

tst.enc = {};
tst.enc.run = function(finalCallback){
    tst.enc.fc = finalCallback;
    console.log("enc: Running test for module...");
    var tests = tst.dep.getTestsObject();
    tests.tests.nCryptTestEnc.runTest(nCrypt, tests.sample, tst.enc.done,
                                      tst.verboseMode);
};
tst.enc.done = function(log){
    console.log("enc: Test of module done.");
    console.log("Passed?: "+log.passed);
    tst.enc.fc(log.passed);
};

/* ########################################################################## */
/* #---nCryptTest.hash------------------------------------------------------# */
/* ########################################################################## */

tst.hash = {};
tst.hash.run = function(finalCallback){
    tst.hash.fc = finalCallback;
    console.log("hash: Running test for module...");
    var tests = tst.dep.getTestsObject();
    // debugging mode
    tests.tests.nCryptTestHash.runTest(nCrypt, tests.sample, tst.hash.done,
                                       tst.verboseMode);
};
tst.hash.done = function(log){
    console.log("hash: Test of module done.");
    console.log("Passed?: "+log.passed);
    tst.hash.fc(log.passed);
};

/* ########################################################################## */
/* #---nCryptTest.sym-------------------------------------------------------# */
/* ########################################################################## */

tst.sym = {};
tst.sym.run = function(finalCallback){
    tst.sym.fc = finalCallback;
    console.log("sym: Running test for module...");
    var tests = tst.dep.getTestsObject();
    tests.tests.nCryptTestSym.runTest(nCrypt, tests.sample, tst.sym.done,
                                      tst.verboseMode);
};
tst.sym.done = function(log){
    console.log("sym: Test of module done.");
    console.log("Passed?: "+log.passed);
    tst.sym.fc(log.passed);
};

/* ########################################################################## */
/* #---nCryptTest.symkey----------------------------------------------------# */
/* ########################################################################## */

tst.symkey = {};
tst.symkey.run = function(finalCallback){
    tst.symkey.fc = finalCallback;
    console.log("symkey: Running test for module...");
    var tests = tst.dep.getTestsObject();
    console.log(typeof tests.tests.nCryptTestMessageSymkey);
    console.log(typeof tests.tests.nCryptTestMessageSymkey.runTest);
    tests.tests.nCryptTestMessageSymkey.runTest(
                                      nCrypt, tests.sample, tst.symkey.done,
                                      tst.verboseMode);
};
tst.symkey.done = function(log){
    console.log("symkey: Test of module done.");
    console.log("Passed?: "+log.passed);
    tst.symkey.fc(log.passed);
};

/* ########################################################################## */
/* #---nCryptTest.message---------------------------------------------------# */
/* ########################################################################## */

tst.message = {};
tst.message.run = function(finalCallback){
    tst.message.fc = finalCallback;
    console.log("message: Running test for module...");
    var tests = tst.dep.getTestsObject();
    console.log(typeof tests.tests.nCryptTestMessage);
    console.log(typeof tests.tests.nCryptTestMessage.runTest);
    tests.tests.nCryptTestMessage.runTest(
                                      nCrypt, tests.sample, tst.message.done,
                                      tst.verboseMode);
};
tst.message.done = function(log){
    console.log("message: Test of module done.");
    console.log("Passed?: "+log.passed);
    tst.message.fc(log.passed);
};

/* ########################################################################## */
/* #---nCryptTest.init------------------------------------------------------# */
/* ########################################################################## */

tst.init = function(run_mod, verbose, finalCallback){
    if(typeof tst[run_mod]!=="undefined" &&
       typeof tst[run_mod].run==="function"){
        tst.runMod = run_mod;
    }else{
        console.log("No valid module found to test. You passed as run_mod: "+
                    run_mod);
    }
    if(typeof verbose === 'boolean'){ tst.verboseMode = verbose; }

    var _rsource = nCrypt.dep.randomCollector.random.source.MACHINE;
    if(!isNodeJS){
        if(!nCrypt.dep.randomCollector.random.check.hasBuiltInRNG() ||
           !tst.trustBrowserRandom){
            _rsource = nCrypt.dep.randomCollector.random.source.USER;
        }
    }
    var buf = new Uint32Array(((4096/8)/4));
    nCrypt.dep.randomCollector.random.collect(_rsource, buf,
    function(rbuf){
        var i = nCrypt.init.init(rbuf);
        if(typeof i==='boolean' && i===true){
            tst.init.done(finalCallback); return;
        }
        console.log("Initialising failed: "); console.log(i);
    }, tst.init.update);
};
tst.init.update = function(progress){
    console.log("Initialisation progress: "+progress);
};
tst.init.done = function(finalCallback){
    console.log("nCrypt successfully initialised!");
    if(tst.runMod!==""){
        tst[tst.runMod].run(finalCallback);
    }
};

return tst;
}());

var tasks = [
    function(cb){ nCryptTest.init("enc", true, cb); },
    function(cb){ nCryptTest.init("hash", true, cb); },
    function(cb){ nCryptTest.init("sym", true, cb); },
    function(cb){ nCryptTest.init("symkey", true, cb); },
    function(cb){ nCryptTest.init("message", true, cb); },
];
var iterateTasks = function(tasks, cb){
    if(!tasks || !tasks.length) {
        setTimeout(function(){ cb(); }, 0);
        return;
    }
    var task = tasks.shift();
    setTimeout(function(){
        task(function(res){
            if (typeof res !== 'undefined' && res !== true) {
                console.error("Test Run Failed!");
                console.error(res);
            } else {
                iterateTasks(tasks, cb);
            }
        });
    });
};
iterateTasks(tasks, function(res){

});
