var _isExp = nCrypt.dep.SecureExec.tools.proto.inst.isException;

var skey = 'password12345'; 
    skey = new nCrypt.asym.types.basic.secret.Secret(
            nCrypt.asym.types.basic.secret.source.STRING, skey);
    skey = skey.getSecretValue();
var sym_alg = 'aes'; 
var sym_opts = { 'iter': 750 };

var ks_loc; 
var ks1; var ks1_pub;
var ks2; var ks2_pub; 
var ks3; var ks3_pub;
var ks4; var ks4_pub;
var ks5; var ks5_pub;
var args = [];

var res;

var preload_cache = function(cb){
    nCrypt.asym.types.basic.point.cache.preloadCache
    (
    nCrypt.asym.types.basic.point.curves.available.getAvailableCurveNames(), 
    function(d)   
    { 
        console.log("Preloaded curves: "); console.log(d);
        cb();
    });
};
var gen_ks_loc = function(cb){
    ks_loc = nCrypt.asym.simple.keyset.gen.generate('curve25519', 'ed25519', 
        'pass0');
    console.log("Local keyset: "); console.log(ks_loc); 
    cb();
};
var gen_ks1 = function(cb){
    ks1 = nCrypt.asym.simple.keyset.gen.generate('curve25519', null, 
        'pass1'); 
    ks1_pub = nCrypt.asym.simple.keyset.pub.getPublic(ks1);
    console.log("Receiver keyset 1: "); console.log(ks1);
    cb();
};
var gen_ks2 = function(cb){
    ks2 = nCrypt.asym.simple.keyset.gen.generate('curve25519', null, 
        'pass2'); 
    ks2_pub = nCrypt.asym.simple.keyset.pub.getPublic(ks2);
    console.log("Receiver keyset 2: "); console.log(ks2);
    cb();
};
var gen_ks3 = function(cb){
    ks3 = nCrypt.asym.simple.keyset.gen.generate('ed25519', null, 
        'pass3'); 
    ks3_pub = nCrypt.asym.simple.keyset.pub.getPublic(ks3);
    console.log("Receiver keyset 3: "); console.log(ks3);
    cb();
};
var gen_ks4 = function(cb){
    ks4 = nCrypt.asym.simple.keyset.gen.generate('secp256k1', null, 
        'pass4'); 
    ks4_pub = nCrypt.asym.simple.keyset.pub.getPublic(ks4);
    console.log("Receiver keyset 4: "); console.log(ks4);
    cb();
};
var gen_ks5 = function(cb){
    ks5 = nCrypt.asym.simple.keyset.gen.generate('ed25519', null, 
        'pass5'); 
    ks5_pub = nCrypt.asym.simple.keyset.pub.getPublic(ks5);
    console.log("Receiver keyset 5: "); console.log(ks5);
    cb();
};
var define_args_ks1 = function(cb){
    var ks_dec = 
    nCrypt.asym.types.simple.keyset.store.encrypt.decrypt(ks_loc, 'pass0');
        ks_dec = new nCrypt.asym.types.simple.keyset.Keyset(ks_dec);
    var kp_loc = ks_dec.getKeypairEncryption();
    var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks1_pub).
                    getKeypairEncryption();
    var sec_dh = new nCrypt.asym.types.shared.dh.SecretDH(kp_loc, kp_pub);
    console.log("DH shared secret for receiver keyset 1: "); 
    console.log(sec_dh);
    args.push({ 'shared_secret_object': sec_dh });
    cb();
};
var define_args_ks2 = function(cb){
    var arg = {
        'public_keyset': ks2_pub,
        'local_keyset': ks_loc,
        'local_keyset_pass': 'pass0'
    };
    args.push(arg);
    cb();
};
var define_args_ks3 = function(cb){
    var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks3_pub).
                    getKeypairEncryption();
    var sec_ecies = new nCrypt.asym.types.shared.ecies.SecretECIES(kp_pub);
    console.log("ECIES shared secret for receiver keyset 3: "); 
    console.log(sec_ecies);
    args.push({ 'shared_secret_object': sec_ecies });
    cb();
};
var define_args_ks4 = function(cb){
    var arg = {
        'public_keyset': ks4_pub
    };
    args.push(arg);
    cb();
};
var define_args_ks5 = function(cb){
    var kp_pub = new nCrypt.asym.types.simple.keyset.Keyset(ks5_pub).
                    getKeypairEncryption();
    var sec_ecies = new nCrypt.asym.types.shared.ecies.SecretECIES(kp_pub);
    var sobj = 
        new nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender(
                   sec_ecies, skey, sym_alg, sym_opts);
    console.log("Encrypted symkey object for receiver keyset 5: "); 
    console.log(sobj);
    args.push(sobj);
    cb();
};
var calculate_encsym_arr = function(cb){
    nCrypt.asym.types.simple.message.symkey.sender.arr.
        createEncryptedSymkeyArray(
        args,
        skey, sym_alg, sym_opts,
        function(r, c){
            console.log("Calculated encrypted symkey array for receivers: ");
            console.log(r);
            console.log(c);
            res = r;
            cb(r);
        }, 'abc'
    );
};
var encsym_arr_json = function(cb){
    var a = nCrypt.asym.types.simple.message.symkey.sender.arr.
        symkeyArrayJSON(res);
    console.log("Encrypted symmetric key array as simple JSON: ");
    console.log(a);
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
                    console.log("---------------------------");
                    console.log("EXCEPTION OCCURED IN TASK: ");
                    console.log(r);
                    console.log("---------------------------");
                    donef(false); return;
                }
            }
            iterate_tasks(donef, tasks);
        });
    }, 0);
};
iterate_tasks(function(passed){
    console.log("Generated encryped symkey arguments.");
}, tasks.slice(0));

var cleartext = 'das ist ein test';
var tsecret = nCrypt.asym.types.basic.secret;
var symkey_sec = new tsecret.Secret(tsecret.source.STRING, 'password12345');
    symkey_sec = symkey_sec.getSecretValue();
