
/* nCrypt - Javascript cryptography made simple
 * Copyright (C) 2015 photophobia
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */

module.exports = (function(ncrypt){

var SecureExec = ncrypt.dep.SecureExec;
var sjcl_blockcipher = require('./sym.sjcl.js');
    sjcl_blockcipher = sjcl_blockcipher(ncrypt);
var titaniumcore_blockcipher = require('./sym.titaniumcore.js');
    titaniumcore_blockcipher = titaniumcore_blockcipher(ncrypt);

/**
 * @namespace nCrypt.sym
 * */
var sym = {};
var _sym = {};
var _inner = {};

/* ########################################################################## */
/* #-_sym.available---------------------------------------------------------# */
/* ########################################################################## */

_sym.available = [
    "aes",
    "twofish",
    "serpent",
    "rijndael"
];

/**
 * Prints a simple array listing the supported algorithms of
 * `nCrypt.sym`. Print this array to see which algorithms are available for 
 * symmetric encryption.
 * @name getAvailable
 * @memberof nCrypt.sym
 * @function
 * @returns {string[]}
 * */
sym.getAvailable = function(){
    return JSON.parse(JSON.stringify(_sym.available));
};

/**
 * @namespace nCrypt.sym.config
 * */
sym.config = {};
_sym.config = {};
_inner.config = {};

_sym.config.getConfig = function(_opts, _defaults, _available){
    var runf = _inner.config.getConfig.run;
    return SecureExec.sync.apply(runf, [_opts, _defaults, _available]);
};
_inner.config.getConfig = {};
_inner.config.getConfig.run = function(_opts, _defaults, _available){
    var opts = JSON.parse(JSON.stringify(_opts));
    var defaults = JSON.parse(JSON.stringify(_defaults));
    var available = JSON.parse(JSON.stringify(_available));
    for(var k in opts){
        if((typeof defaults[k])==="undefined"){
            throw new ncrypt.exception.sym.noSuchParameter(
                "No such parameter: "+k+"."
            );
        }
    }
    for(var d in defaults){
        if((typeof opts[d])==="undefined"){
            opts[d] = defaults[d];
        }
    }
    for(var v in opts){
        var val = opts[v];
        var av  = available[v];
        var valid = false;
        if((typeof av)==="string"){
            // av is string
            if((typeof val)===av){
                valid = true;
            }
        }else{
            // av is array
            if(av.indexOf(val)>=0){
                valid = true;
            }
        }
        if(valid===false){
            throw new ncrypt.exception.sym.invalidParameterValue();
        }
    }
    if((typeof opts.iter) !== "undefined"){
        if(opts.iter <= 100){
            throw new ncrypt.exception.sym.invalidParameterValue();
        }
    }
    return opts;
};

/**
 * @namespace nCrypt.sym.config.blockcipher
 * */
sym.config.blockcipher = {};

/**
 * This object contains the available configuration options for blockcipher
 * operations in `nCrypt.sym`.
 * <br />
 * If there are certain defined values to choose from, they'll be described
 * as an array of these values, otherwise, as a string saying of which type 
 * the value needs to be.
 * <br />
 * Settings in `nCrypt.sym.config.blockcipher` are suitable for use with all
 * algorithms used in `nCrypt.sym` but AES. This is because all the other 
 * blockcipher algorithms are provided by titaniumcore, while AES is provided
 * by SJCL, which offers different settings. 
 * <br />
 * @see {@link nCrypt.sym.config.blockcipher.aes} for AES configuration.
 * @name available
 * @memberof nCrypt.sym.config.blockcipher
 * @member
 * */
sym.config.blockcipher.available = {
    /**
     * The keysize (ks) is often referred to as the encryption strength. 
     * "256 bit encryption" means some data was encrypted using a cryptographic
     * key which is 256 bit long, i.e. represents 256 bit of data.
     * "256 bit encryption" means that something was encrypted with a key
     * The longer the key is, the harder it is for an attacker to guess which 
     * key was used.
     * <br />
     * For symmetrical encryption, 256 bit is today's standard for highly 
     * secure encryption, and usually so performant there's not much reason to
     * choose a smaller keysize. 
     * @name ks
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    ks: [ 256 ],
    /**
     * When encrypting some data using a password, the password usually is not
     * a cryptographically random string representing the number of bits the
     * keysize requires.
     * <br />
     * To retrieve relatively secure cryptographic keys from user passwords,
     * PBKDF2 (Password Based Key Derivation Function) is used. PBKDF2 uses
     * a hash function and random salt to generate a key in usually a lot of 
     * iterations.
     * <br />
     * PBKDF2 is what may makes symmetrical encryption appear slow, as the 
     * actual encryption usually is very fast. The higher the number of 
     * iterations is, the more secure is PBKDF2. However, 1000 iterations might
     * take 400-500ms on an average low end processor. While this is still
     * okay for nearly any application, and 1000 iterations are absolutely
     * needed (!) when dealing with user passwords, going over 2000 probably
     * doesn't make much sense.
     * <br />
     * `nCrypt` uses SJCL for PBKDF2, which offers caching. This means that for
     * one and the same password, PBKDF2 will only be slow when using it for
     * the first time (during runtime).
     * <br />
     * When generating a password which actually resembles a cryptographic key
     * from bit strength and randomness (like a cryptographically random hex
     * string of 64 chars length), consider lowering iteration counts to 101
     * if (the lowest SJCL accepts for AES, and therefore the lowest nCrypt
     * accepts). __Providing lower iteration counts than 101 will result in the
     * iteration count being automatically raised by `nCrypt`. (For security and
     * compatibility with SJCL.)__
     * <br />
     * If unsure, the default (1000) usually is sensible. 
     * @name iter
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    iter: "number",
    /**
     * Block cipher mode of operation. Please note that the only working, rather
     * secure mode supported by **titaniumcore** is CBC. 
     * <br />
     * SJCL, which is used for AES in `nCrypt` 
     * (@see {@link nCrypt.sym.config.blockcipher.aes.available.mode})
     * supports more modes, of which `nCrypt` choses the most suitable. 
     * <br />
     * So at the moment, there's only one option for mode of operation for
     * algorithms provided by titaniumcore (Twofish, Serpent, Rijndael) - CBC.
     * @name mode
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    mode: [ "cbc" ]
};

/**
 * This property is the default configuration object for blockcipher operations
 * in `nCrypt.sym`.
 * <br />
 * This object will be used if no configuration object is provided for 
 * encryption, or it's properties will fill the missing properties in the 
 * provided object.
 * @name defaults
 * @memberof nCrypt.sym.config.blockcipher
 * @function
 * @returns {object} Default parameters.
 * */
sym.config.blockcipher.defaults = function(){
    var defaults = {
        "ks": 256,
        "iter": 1000,
        "mode": "cbc"
    };
    return defaults;
};

/**
 * Input an options-object to receive a full and validated options object.
 * To see an example of a full options object, print 
 * `nCrypt.sym.config.blockcipher.defaults()` on console, and print
 * `nCrypt.sym.config.blockcipher.available` to see available options for
 * each property.
 * <br />
 * For example, if you provide {"iter":1200}, you'll get back {"iter":1200,
 * "ks": 256, "mode": "cbc" }.
 * @param {object} opts - Options object containing the options which should 
 * differ from the default options. 
 * @returns {object|SecureExec.exception.Exception} Full configuration object 
 * which can be passed to an encryption function.
 * @name getConfig
 * @memberof nCrypt.sym.config.blockcipher
 * @function
 * */
sym.config.blockcipher.getConfig = function(opts){
    var runf = function(opts){
        var defaults = sym.config.blockcipher.defaults();
        var available = JSON.parse(JSON.stringify(
                                sym.config.blockcipher.available));
        if(typeof opts === "undefined"){
            return defaults;
        }
        return _sym.config.getConfig(opts, defaults, available);
    };
    return SecureExec.sync.apply(runf, [opts]);
};

/**
 * @namespace nCrypt.sym.config.blockcipher.aes
 * */
sym.config.blockcipher.aes = {};
/**
 * This property is the default configuration object for AES operations
 * in `nCrypt.sym`.
 * <br />
 * This object will be used if no configuration object is provided for 
 * encryption, or it's properties will fill the missing properties in the 
 * provided object.
 * @name defaults
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @function
 * @returns {object} Default parameters.
 * */
sym.config.blockcipher.aes.defaults = function(){
    var defaults = {
        "iter": 1000,
        "ks": 256,
        "ts": 128,
        "mode": "gcm"
    };
    return defaults;
};
/**
 * This object contains the available configuration options for AES
 * options used in nCrypt.sym.
 * <br />
 * If there are certain definite values to choose from, they'll be described
 * as an array, otherwise as a string saying which type the value needs to be.
 * @name available
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @member
 * */
sym.config.blockcipher.aes.available = {
    /**
     * Keysize for AES encryption. 
     * @see {@link nCrypt.sym.config.blockcipher.available.ks} for further
     * information on keysize.
     * @name ks
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    ks: [ 128, 192, 256 ],
    /**
     * The authentication strength. The authentication of a message avoids
     * this message being changed after encryption without the receiver 
     * noticing at decryption time. 
     * <br />
     * A high authentication strength doesn't even affect performance in a way
     * enough to be noticed in nearly all use cases, so there's no reason not 
     * to simply use the highest authentication strength.
     * @name ts
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    ts: [ 64, 96, 128 ],
    /**
     * The block cipher mode of operation. While the only rather secure mode
     * titaniumcore has implemented at the moment is CBC, SJCL, which is 
     * used for AES, offers several more, of which chosen, most suitable ones
     * have been included in `nCrypt`.
     * <br />
     * @see {@link nCrypt.sym.config.blockcipher.aes.available.mode} for more
     * information on block cipher mode.
     * <br />
     * To choose a block cipher mode, read more about what each mode provides,
     * like @see {@link https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation|Wikipedia}
     * or @see {@link https://stackoverflow.com/questions/1220751/how-to-choose-an-aes-encryption-mode-cbc-ecb-ctr-ocb-cfb|This 
     * Stackoverflow discussion}.
     * <br />
     * GCM seems to be a safe choice concerning both security and
     * performance. `nCrypt` uses GCM as a default, so simply stay with that if
     * you are unsure - it seems to be a rather safe bet. If there's any reason
     * to use another mode (for example for compatiblity with another library)
     * use CCM, a secure and more widely implemented mode. 
     * @name mode
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    mode: ["ccm", "gcm"],
    /**
     * Iteration count used to get keys for AES encryption from a password. 
     * @see {@link nCrypt.sym.config.blockcipher.available.iter} for further
     * information on iteration count.
     * @name iter
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    iter: "number"
};

/**
 * Input an options-object to receive a full and validated options object.
 * To see an example of a full options object, print 
 * `nCrypt.sym.config.blockcipher.aes.defaults()` on console, and print
 * `nCrypt.sym.config.blockcipher.aes.available` to see available options for
 * each property.
 * @param {object} opts - Options object containing the options which should 
 * differ from the default options. 
 * @returns {object|SecureExec.exception.Exception} Full configuration object 
 * which can be passed to an encryption function.
 * @throws ncrypt.exception.sym.noSuchParameter
 * @throws ncrypt.exception.sym.invalidParameterValue
 * @name getConfig
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @function
 * */
sym.config.blockcipher.aes.getConfig = function(opts){
    var runf = function(opts){
        var defaults = sym.config.blockcipher.aes.defaults();
        var available = JSON.parse(JSON.stringify(
                        sym.config.blockcipher.aes.available));
        if(typeof opts === "undefined"){
            return defaults;
        }
        return _sym.config.getConfig(opts, defaults, available);
    };
    return SecureExec.sync.apply(runf, [opts]);
};

/**
 * Get the algorithm and options a text was encrypted using, for example to 
 * reuse the options.
 * @param {string} encrypted - The encrypted text to analyse.
 * @returns {string|SecureExec.exception.Exception} Options object
 * like { "cipher": [string] algorithm, "opts": [object] opts }
 * @memberof nCrypt.sym.config
 * @name getOptionsOfEncrypted
 * @function
 * */
sym.config.getOptionsOfEncrypted = function(encrypted){
    var runf = _inner.config.getOptionsOfEncrypted.run;
    return SecureExec.sync.apply(runf, [encrypted]);
};
_inner.config.getOptionsOfEncrypted = {};
_inner.config.getOptionsOfEncrypted.run = function(encrypted){
    try{
        var obj = JSON.parse(encrypted);
        if(Array.isArray(obj.e)){
            // this was encrypted using sym.async
            if(typeof obj.c!=="undefined"){
                obj = obj.c;
            }else{
                obj = obj.e[0];
            }
        }
        var cipher = obj.cipher.toLowerCase();
        var defaults;
        if(cipher==="aes"){
            defaults = sym.config.blockcipher.aes.defaults();
        }else{
            defaults = sym.config.blockcipher.defaults();
        }
        var opts = {};
        for(var k in defaults){
            opts[k] = obj[k];
        }
        return { "cipher": cipher, "opts": opts };
    }catch(e){
        throw new ncrypt.exception.sym.malformedMessage();
    }
};

/**
 * @namespace nCrypt.sym.sync
 * */
sym.sync = {};
_sym.sync = {};
_inner.sync = {};

/**
 * Encrypt @data using @pass. Use @algorithm as encryption algorithm.
 * @param   {string}   data      -   Data string to encrypt
 * @param   {string}   pass      -   Password to use for encryption
 * @param   {string}   algorithm -   Algorithm to use for encryption.  Call 
 * `nCrypt.sym.getAvailable()` to see which algorithms are supported.
 * @param   {object}   [opts]    -  Options to configure how `nCrypt` 
 * uses @algorithm. Usually, defaults are fine, so you can omit this parameter. 
 * Check `nCrypt.sym.config.blockcipher.available`/ 
 * `nCrypt.sym.config.blockcipher.default` (or, for AES, the same for 
 * `nCrypt.sym.config.blockcipher.aes`) to find out which options you can use, 
 * and generate an options object 
 * using `nCrypt.sym.config.blockcipher.getConfig` /
 * `nCrypt.sym.config.blockcipher.aes.getConfig`.
 * @returns  {string|SecureExec.exception.Exception} Simple JSON string. [If 
 * encrypting multiple @data strings in bulk, with the same @pass and @opts, 
 * you might find some values staying the same each time. By only storing
 * the changing values multiple times and the values which stay the same only 
 * once, you might save bandwidth.]
 * @name encrypt
 * @memberof nCrypt.sym.sync
 * @function
 * */
sym.sync.encrypt = function(data, pass, algorithm, opts){
    var runf = _inner.sync.encrypt.run;
    return SecureExec.sync.apply(runf, [data, pass, algorithm, opts]);
};
_inner.sync.encrypt = {};
_inner.sync.encrypt.run = function(data, pass, algorithm, opts){
    if(typeof opts==='undefined' || (typeof opts==='object' && opts===null)){
        opts = {};
    }
    algorithm = algorithm.toLowerCase();
    if(_sym.available.indexOf(algorithm)<0){
        throw new ncrypt.exception.sym.invalidAlgorithm();
    }
    if(algorithm==="aes"){
        opts = sym.config.blockcipher.aes.getConfig(opts);
        try{
            var enc = sjcl_blockcipher.aes.exec.encrypt(data, pass, opts);
            return enc;
        }catch(e){
            throw new ncrypt.exception.sym.encryptError();
        }
    }else{
        opts = sym.config.blockcipher.getConfig(opts);
        try{
            var enc = titaniumcore_blockcipher.encrypt(
                        algorithm, data, pass, opts);
            return enc;
        }catch(e){
            throw new ncrypt.exception.sym.encryptError();
        }
    }
};

/**
 * Decrypt a string that was encrypted using `nCrypt.sym.sync.encrypt`. 
 * (Recognizes encryption algorithm and other params automatically.)
 * @param   {string}   data  - Ciphertext to decrypt.
 * @param   {string}   pass  - Password to use for decryption.
 * @returns  {string|SecureExec.exception.Exception} - Decrypted data, i.e. 
 * plaintext.
 * @name decrypt
 * @memberof nCrypt.sym.sync
 * @function
 * */
sym.sync.decrypt = function(data, pass){
    var runf = _inner.sync.decrypt.run;
    return SecureExec.sync.apply(runf, [data, pass]);
};
_inner.sync.decrypt = {};
_inner.sync.decrypt.run = function(data, pass){
    var algorithm = JSON.parse(data).cipher;
    if(algorithm==="aes"){
        try{
            var dec = sjcl_blockcipher.aes.exec.decrypt(data, pass);
            return dec;
        }catch(e){
            throw new ncrypt.exception.sym.decryptError(
                "Error decrypting message (Algorithm: "+algorithm+"). "+
                "Suspected reason: Wrong password, or malformed message."
            );
        }
    }else{
        try{
            var dec = titaniumcore_blockcipher.decrypt(data, pass);
            return dec;
        }catch(e){
            throw new ncrypt.exception.sym.decryptError(
                    "Error decrypting message (Algorithm: "+algorithm+"). "+
                    "Suspected reason: Wrong password, or malformed message."
                );
        }
    }
};

/**
 * Change an encrypted text, i.e. change password and/or algorithm and options.
 * If you want to change the password only, only supply @encrypted, @old_pass
 * and @new_pass. The options will exactly be the ones found in @encrypted.
 * <br />
 * If you want to change not only the password, but the algorithm and
 * options, pass @algorithm. This allows changing the algorithm a text is 
 * encrypted using, and the options if passed.
 * <br />
 * To leave the password the same, simply pass the same password for 
 * both @old_pass and @new_pass.
 * <br />
 * This function assumes @encrypted was encrypted 
 * using `nCrypt.sym.sync.encrypt`.
 * @param {string} encrypted - Encrypted text.
 * @param {string} old_pass - Password @encrypted was encrypted with.
 * @param {string} new_pass - New password @encrypted should be encrypted with.
 * @param {string} [algorithm] - New algorithm to use for encryption. If not
 * specified, the one already used in @encrypted is used.
 * @param {object} [opts] - Encryption options. If @algorithm is not specified
 * and this is omitted, options will be exactly like found in @encrypted. 
 * If @algorithm is specified and this is omitted, defaults for this algorithm 
 * will be used.
 * @returns {string|SecureExec.exception.Exception}
 * @memberof nCrypt.sym.sync
 * @name change
 * @function
 * */
sym.sync.change = function(encrypted, old_pass, new_pass, algorithm, opts){
    var runf = _inner.sync.change.run;
    return SecureExec.sync.apply(runf, [encrypted, old_pass, new_pass, 
                                        algorithm, opts]);
};
_inner.sync.change = {};
_inner.sync.change.run = function(encrypted, old_pass, new_pass, 
                                  algorithm, opts){
    if(typeof encrypted!=="string" || typeof old_pass!=="string" ||
       typeof new_pass!=="string"){
           throw new ncrypt.exception.global.unexpectedType();
    }
    var dec = sym.sync.decrypt(encrypted, old_pass);
    if(SecureExec.tools.proto.inst.isException(dec)){
        return dec;
    }
    if(typeof algorithm === 'undefined'){
        var options = sym.config.getOptionsOfEncrypted(encrypted);
        var cipher = options.cipher;
        options = options.opts;
    }else{
        var options = opts;
        var cipher = algorithm;
    }
    var enc = sym.sync.encrypt(dec, new_pass, cipher, options);
    return enc;
};

/**
 * @namespace nCrypt.sym.async
 * */
sym.async = {};
_sym.async = {};
_inner.async = {};

/**
 * Encrypt data asynchronously using @pass and @algorithm. This function 
 * internally uses `nCrypt.sym.sync.encrypt` but splits the @data into multiple
 * parts and encrypts them step by step.
 * <br />
 * This is suitable for encrypting extremely long @data-strings which cause
 * slowness-warnings and browser freezing trying to encrypt them.
 * <br />
 * @param {string} data - Data to encrypt.
 * @param {string} pass - Password to use for encryption.
 * @param {string} algorithm - Algorithm to use for encryption.
 * @param {function} callback - This function will be called with the result
 * when encryption is done, like callback({string} encrypted_data, {object} 
 * carry). So your @callback function should take two parameters, where the 
 * first is the encrypted data, and the second the data passed to carry.
 * (If an error occurs, an instance of `SecureExec.exception.Exception` will be 
 * passed instead of the encrypted data.)
 * @param {object} [carry] - If some data should be available in the
 * callback-function, pass it as a @carry-object which will be passed for 
 * the @carry parameter of the callback function. If there's nothing to pass 
 * for @carry, simply omit or pass null.
 * @param {opts}   [opts]      - Options to use for encryption with @algorithm.
 * @name encrypt
 * @memberof nCrypt.sym.async
 * @function
 * @throws ncrypt.exception.sym.invalidAlgorithm
 * @throws ncrypt.exception.sym.encryptError
 * */
sym.async.encrypt = function(data, pass, algorithm, callback, carry, opts){
    var donef = function(args){
        callback(args, carry);
    };
    var fns = [
        _inner.async.encrypt.start,
        {
            "repeat": true,
            "func": _inner.async.encrypt.rep
        },
        _inner.async.encrypt.done
    ];
    SecureExec.async.waterfallUntil(fns, donef, data, pass, algorithm, opts);
};
_inner.async.encrypt = {};
_inner.async.encrypt.start = function(data, pass, algorithm, opts){
    data = ncrypt.tools.proto.str.chunk(data, 3000);
    var res = [];
    var len = data.length;
    var i = 0;
    var args = {
        "data": {
            "data": data,
            "pass": pass,
            "len": len,
            "i": i
        },
        "res": {
            "res": res
        },
        "opts": {
            "algorithm": algorithm,
            "opts": opts
        }
    };
    return args;
};
_inner.async.encrypt.rep = function(args){
    var data = args.data.data;
    var pass = args.data.pass;
    var len = args.data.len;
    var i = args.data.i;
    var opts = args.opts.opts;
    var algorithm = args.opts.algorithm;
    var res = args.res.res;
    //var c = args.c;
    
    if(Array.isArray(res)){
        var enc = sym.sync.encrypt(data[i], pass, algorithm, opts);
        if(SecureExec.tools.proto.inst.isException(enc)){
            res = enc;
            args.complete = true;
        }else{
            res.push(JSON.parse(enc));
        }
    }
    i += 1;
    args = {
        "data": {
            "data": data,
            "pass": pass,
            "len": len,
            "i": i
        },
        "res": {
            "res": res
        },
        "opts": {
            "algorithm": algorithm,
            "opts": opts
        }
    };
    if(i===len){
        args.complete = true;
    }
    return args;
};
_inner.async.encrypt.done = function(args){
    var data = args.data.data;
    var pass = args.data.pass;
    var len = args.data.len;
    var i = args.data.i;
    var opts = args.opts.opts;
    var algorithm = args.opts.algorithm;
    var res = args.res.res;
    
    if(SecureExec.tools.proto.inst.isException(res)===false){
        var identical = ncrypt.tools.proto.jsonobj.identical(res);
        var identical_keys = ncrypt.tools.proto.jsonobj.keys(identical);
        for ( var k in res ){
            res[k] = ncrypt.tools.proto.jsonobj.remove(res[k], identical_keys);
        }
        var res_obj = {
            "c": identical,
            "e": res
        };
        res_obj = JSON.stringify(res_obj);
        res = res_obj;
    }
    return res;
};

/**
 * @param {string} data - Data to decrypt.
 * @param {string} pass - Password to use for decryption.
 * @param {function} callback - This function will be called with the result
 * when encryption is done, like callback({string} decrypted_data, {object} 
 * carry). So your @callback function should take two parameters, where the 
 * first is the encrypted data, and the second the data passed to carry along.
 * If an error occurs, the result data will be an instance of 
 * `SecureExec.exception.Exception`. 
 * Please note that "wrong password" is the most
 * common reason for undecryptable data, so if you receive a decrypt error, 
 * display a possibly wrong password reason to users. (If decryption fails 
 * multiple times / with correct password, a bug or malformed message is 
 * likely.)
 * @param {object} [carry] - If some data should be available in the
 * callback-function, pass it as a @carry-object which will be passed for 
 * the @carry parameter of the callback function. If there's nothing to pass 
 * for @carry, simply omit or pass null.
 * @name decrypt
 * @memberof nCrypt.sym.async
 * @function
 * */
sym.async.decrypt = function(data, pass, callback, carry){
    var donef = function(args){
        callback(args, carry);
    };
    var fns = [
        _inner.async.decrypt.start,
        {
            "repeat": true,
            "func": _inner.async.decrypt.rep
        },
        _inner.async.decrypt.done
    ];
    SecureExec.async.waterfallUntil(fns, donef, data, pass);
};
_inner.async.decrypt = {};
_inner.async.decrypt.start = function(data, pass){
    data = JSON.parse(data);
    var res = "";
    var args = {
        "data": data,
        "pass": pass,
        "res": res,
        "i": 0
    };
    return args;
};
_inner.async.decrypt.rep = function(args){
    var data = args.data;
    var enc = data.e;
    var identical = data.c;
    var i = args.i;
    var enc_i = ncrypt.tools.proto.jsonobj.merge([enc[i], identical]);
        enc_i = JSON.stringify(enc_i);
        enc_i = sym.sync.decrypt(enc_i, args.pass);
        if(SecureExec.tools.proto.inst.isException(enc_i)){
            args.res = enc_i;
            args.complete = true; 
            return args;
        }
        args.res += enc_i;
    args.i += 1;
    if(args.i === enc.length){
        args.complete = true;
    }
    return args;
};
_inner.async.decrypt.done = function(args){
    return args.res;
};

/**
 * Change an encrypted text, i.e. change password and/or algorithm and options.
 * If you want to change the password only, only supply @encrypted, @old_pass
 * and @new_pass. The options will exactly be the ones found in @encrypted.
 * <br />
 * If you want to change not only the password (to leave the password the same,
 * simple pass the same for @old_pass and @new_pass), but the algorithm and
 * options, pass @algorithm. This allows changing the algorithm a text is 
 * encrypted using, and the options.
 * <br />
 * This function assumes @encrypted was encrypted using nCrypt.sym.sync.
 * @param {string} encrypted - Encrypted text.
 * @param {string} old_pass - Password @encrypted was encrypted with.
 * @param {string} new_pass - New password @encrypted should be encrypted with.
 * @param {function} callback - function({string} enc, {object} carry), 
 * with @enc being an instance of SecureExec.exception.Exception if an error
 * occurs.
 * @param {object} [carry] - Object to carry along.
 * @param {string} [algorithm] - New algorithm to use for encryption. If not
 * specified, the one already used in @encrypted is used.
 * @param {object} [opts] - Encryption options. If @algorithm is not specified
 * and this is omitted, options will be exactly like found in @encrypted. 
 * If @algorithm is specified and this is omitted, defaults for this algorithm 
 * will be used.
 * @memberof nCrypt.sym.async
 * @name change
 * @function
 * */
sym.async.change = function(encrypted, old_pass, new_pass, 
                                    callback, carry,
                                    algorithm, opts){
    var check = function(encrypted, old_pass, new_pass, 
                                    callback, carry,
                                    algorithm, opts){
        var wrong_type = (typeof encrypted!=="string") ||
                         (typeof old_pass!=="string") ||
                         (typeof new_pass!=="string") ||
                         (typeof callback!=="function") ||
                         (typeof algorithm!=="undefined" &&
                              typeof algorithm!=="string") ||
                         (typeof opts!=="undefined" &&
                              typeof opts!=="object");
        if(wrong_type){
            throw new ncrypt.exception.global.unexpectedType();
        }else{
            return true;
        }
    };
    var checked = SecureExec.sync.apply(check, [encrypted, old_pass, new_pass, 
                                    callback, carry, algorithm, opts]);
    var get_opts = _inner.async.change.getOptions;
    var opts = SecureExec.sync.apply(get_opts, [
                    encrypted, algorithm, opts
               ]);
    if(SecureExec.tools.proto.inst.isException(opts)){
        callback(opts, carry);
        return;
    }
    var dec_d = function(dec, c){
        sym.async.encrypt(dec, new_pass, c.opts.cipher, 
                          c.encf, c, 
                          opts.opts);
    };
    var enc_d = function(enc, c){
        c.cb(enc, c.ca);
    };
    sym.async.decrypt(encrypted, old_pass, dec_d, {
        "encf": enc_d,
        "opts": opts,
        "cb": callback,
        "ca": carry
    });
};
_inner.async.change = {};
_inner.async.change.getOptions = function(encrypted, algorithm, opts){
    var options;
    if(typeof algorithm==="string"){
        options = {
            "cipher": algorithm,
            "opts": opts
        };
    }else{
        options = sym.config.getOptionsOfEncrypted(encrypted);
    }
    opts = options;
    return opts;
};

return sym; });
