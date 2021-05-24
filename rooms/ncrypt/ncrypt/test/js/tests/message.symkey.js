var nCryptTestMessageSymkey = (function(){
var sym = {};

sym.iter = 4;

var nCrypt;
var sampleData = null; // sampleData.text.[short|medium|long]
var eventDone = null; // function to call after tests have run
var debugMode = false; // log more details

var log = {
    "lines": [],
    "passed": true
};

sym.tests = {};
sym.tests.run = function(){
    var sym_algs = [ 'aes', 'twofish', 'serpent', 'rijndael' ];
    var iterate_tests = function(a){
        if(a.length<1){ sym.done(); return; }
        var cipher = a.shift();
        setTimeout(function(){
            encrypted_symkey_test(function(passed){
                if(typeof passed==='boolean' && passed===true){
                    iterate_tests(a);
                }else{
                    sym.onerror("Did not pass encrypted symkey test!");
                    sym.done(); return;
                }
            }, cipher);
        }, 0);
    };
    iterate_tests(sym_algs.slice(0));
};
encrypted_symkey_test = function(fcallback, s_alg){
    
    sym.log(' ');
    sym.log('## Running encrypted symkey test using symmetric algorithm '+
            s_alg+': ');
    sym.log(' ');
    
    var _isExp = nCrypt.dep.SecureExec.tools.proto.inst.isException;
    
    var skey = 'password12345'; 
        skey = new nCrypt.asym.types.basic.secret.Secret(
                nCrypt.asym.types.basic.secret.source.STRING, skey);
        skey = skey.getSecretValue();
    var sym_alg = s_alg; 
    var sym_opts = { 'iter': 750 };
    
    var ks_loc; var ks1; var ks2; var ks3; var ks4; var ks5; var args = [];
    
    var res;
    
    var preload_cache = function(cb){
        nCrypt.asym.types.basic.point.cache.preloadCache
        (
        nCrypt.asym.types.basic.point.curves.available.getAvailableCurveNames(), 
        function(d)   
        { 
            sym.log("Preloaded curves: "); sym.log(d);
            cb();
        });
    };
    var gen_ks_loc = function(cb){
        ks_loc = nCrypt.asym.simple.keyset.gen.generate('curve25519', null, 
            'pass0');
        sym.log("Local keyset: "); sym.log(ks_loc); 
        cb();
    };
    var gen_ks1 = function(cb){
        ks1 = nCrypt.asym.simple.keyset.gen.generate('curve25519', null, 
            'pass1'); 
        ks1 = nCrypt.asym.simple.keyset.pub.getPublic(ks1);
        sym.log("Receiver keyset 1: "); sym.log(ks1);
        cb();
    };
    var gen_ks2 = function(cb){
        ks2 = nCrypt.asym.simple.keyset.gen.generate('curve25519', null, 
            'pass2'); 
        ks2 = nCrypt.asym.simple.keyset.pub.getPublic(ks2);
        sym.log("Receiver keyset 2: "); sym.log(ks2);
        cb();
    };
    var gen_ks3 = function(cb){
        ks3 = nCrypt.asym.simple.keyset.gen.generate('ed25519', null, 
            'pass3'); 
        ks3 = nCrypt.asym.simple.keyset.pub.getPublic(ks3);
        sym.log("Receiver keyset 3: "); sym.log(ks3);
        cb();
    };
    var gen_ks4 = function(cb){
        ks4 = nCrypt.asym.simple.keyset.gen.generate('secp256k1', null, 
            'pass4'); 
        ks4 = nCrypt.asym.simple.keyset.pub.getPublic(ks4);
        sym.log("Receiver keyset 4: "); sym.log(ks4);
        cb();
    };
    var gen_ks5 = function(cb){
        ks5 = nCrypt.asym.simple.keyset.gen.generate('ed25519', null, 
            'pass5'); 
        ks5 = nCrypt.asym.simple.keyset.pub.getPublic(ks5);
        sym.log("Receiver keyset 5: "); sym.log(ks5);
        cb();
    };
    var define_args_ks1 = function(cb){
        var ks_dec = 
        nCrypt.asym.types.simple.keyset.store.encrypt.decrypt(ks_loc, 'pass0');
            ks_dec = new nCrypt.asym.types.simple.keyset.Keyset(ks_dec);
        var kp_loc = ks_dec.getKeypairEncryption();
        var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks1).
                        getKeypairEncryption();
        var sec_dh = new nCrypt.asym.types.shared.dh.SecretDH(kp_loc, kp_pub);
        sym.log("DH shared secret for receiver keyset 1: "); 
        sym.log(sec_dh);
        args.push({ 'shared_secret_object': sec_dh });
        cb();
    };
    var define_args_ks2 = function(cb){
        var arg = {
            'public_keyset': ks2,
            'local_keyset': ks_loc,
            'local_keyset_pass': 'pass0'
        };
        args.push(arg);
        cb();
    };
    var define_args_ks3 = function(cb){
        var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks3).
                        getKeypairEncryption();
        var sec_ecies = new nCrypt.asym.types.shared.ecies.SecretECIES(kp_pub);
        sym.log("ECIES shared secret for receiver keyset 3: "); 
        sym.log(sec_ecies);
        args.push({ 'shared_secret_object': sec_ecies });
        cb();
    };
    var define_args_ks4 = function(cb){
        var arg = {
            'public_keyset': ks4
        };
        args.push(arg);
        cb();
    };
    var define_args_ks5 = function(cb){
        var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks5).
                        getKeypairEncryption();
        var sec_ecies = new nCrypt.asym.types.shared.ecies.SecretECIES(kp_pub);
        var sobj = 
            new nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender(
                       sec_ecies, skey, sym_alg, sym_opts);
        sym.log("Encrypted symkey object for receiver keyset 5: "); 
        sym.log(sobj);
        args.push(sobj);
        cb();
    };
    var calculate_encsym_arr = function(cb){
        nCrypt.asym.types.simple.message.symkey.sender.arr.
            createEncryptedSymkeyArray(
            args,
            skey, sym_alg, sym_opts,
            function(r, c){
                sym.log("Calculated encrypted symkey array for receivers: ");
                sym.log(r);
                sym.log(c);
                res = r;
                cb(r);
            }, 'abc'
        );
    };
    var encsym_arr_json = function(cb){
        var a = nCrypt.asym.types.simple.message.symkey.sender.arr.
            symkeyArrayJSON(res);
        sym.log("Encrypted symmetric key array as simple JSON: ");
        sym.log(a);
        cb();
    };
    var tasks = [
        preload_cache,
        gen_ks_loc,
        gen_ks1,
        gen_ks2,
        gen_ks3,
        gen_ks4,
        gen_ks5,
        define_args_ks1,
        define_args_ks2,
        define_args_ks3,
        define_args_ks4,
        define_args_ks5,
        calculate_encsym_arr,
        encsym_arr_json
    ];
    var iterate_tasks = function(donef, tasks){
        if(tasks.length<1){ donef(true); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(r){
                if(typeof r!=='undefined'){
                    if(_isExp(r)){
                        sym.log("---------------------------");
                        sym.log("EXCEPTION OCCURED IN TASK: ");
                        sym.log(r);
                        sym.log("---------------------------");
                        donef(false); return;
                    }
                }
                iterate_tasks(donef, tasks);
            });
        }, 0);
    };
    iterate_tasks(function(passed){
        fcallback(passed);
    }, tasks.slice(0));
};

/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */
/* &---/-enc.tests----------------------------------------------------------& */
/* &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& */

sym.onerror = function(msg, logobj){
    log.lines.push(msg);
    log.passed = false;
    sym.log(" ");
    sym.log(msg);
    sym.log(logobj);
    sym.log(" ");
};

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

return sym;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = nCryptTestMessageSymkey;
    }
    exports.nCryptTestMessageSymkey = nCryptTestMessageSymkey;
}else if (typeof define === 'function' && define.amd) {
    define([], nCryptTestMessageSymkey);
}else if(typeof window!=="undefined"){
    window.nCryptTestMessageSymkey = nCryptTestMessageSymkey;
}
else {}
