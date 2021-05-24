
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

module.exports = (function(ncrypt, deptypes){

/* basic types */
var tbn = deptypes.basic.bn;
var tpoint = deptypes.basic.point;
var tsecret = deptypes.basic.secret;
var tid = deptypes.basic.id;
/* key types */
var tkeypair = deptypes.key.keypair;
var tkeyset = deptypes.keyset;
/* shared secret types */
var tshared = deptypes.shared;
var tecies = tshared.ecies;
var tdh = tshared.dh;

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.simple.message.symkey
 * */
var  symkey = {};
var _symkey = {};

/**
 * Messages are (potentially / often) encrypted for more than one receiver. This
 * is why it makes sense to encrypt the symmetric key the message is encrypted
 * with using the shared secrets, instead of encrypting the whole message 
 * (possibly) many times. (The message is usually longer than the symmetric key,
 * which would result in unnecessarily long messages and long calculation time.)
 * <br />
 * An array of encrypted symmetric keys should be appended to the encrypted 
 * message, so a receiver can try to decrypt a symmetric key using a shared 
 * secret between sender and receiver.
 * <br />
 * This encrypted symmetric key objects should contain the actual encrypted 
 * symmetric key, the receiver's public key ID (so the receiver can find out
 * which symmetric key in the array to decrypt without trial and error), the
 * type of shared secret ('ecies' or 'dh'), and in case of ECIES, the tag 
 * required to restore the shared secret.
 * <br />
 * This class creates such an object from an instance of a shared secret class
 * ({@link nCrypt.asym.types.shared.dh.SecretDH} 
 * or {@link nCrypt.asym.types.shared.ecies.SecretECIES}), a symmetric key 
 * and symmetric encryption options. Using the symmetric encryption options,
 * the @symkey will be encrypted using the shared secret.
 * <br />
 * The serialized version (available as JSON string or parsed JSON) should be
 * appended to an array of encrypted symkey objects and passed to the receiver
 * along with the encrypted message.
 * <br />
 * Please note: If passing an instance of this class as the first argument, a
 * clone will be returned.
 * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} obj - The
 * shared secret, i.e. an instance of one of the shared secret classes. A 
 * serialized instance (string) will work as well.
 * @param {nCrypt.asym.types.basic.Secret|string} skey - The symmetric key. 
 * This can either be a secret (easily created from a string), or a string. In
 * case of a string, an instance of {@link nCrypt.asym.types.basic.Secret} will
 * be created, using the string as a value and assuming a serialized instance
 * of {@link nCrypt.asym.types.basic.Secret} as a source.
 * @param {string} sym_alg - Symmetric algorithm, for example 'aes', 'twofish'
 * or 'serpent'. Needs to be supported in {@link nCrypt.sym}.
 * @param {object} [sym_opts] - Symmetric encryption options. 
 * @class
 * @name EncSymkeySender 
 * @memberof nCrypt.asym.types.simple.message.symkey.sender
 * */
var EncSymkeySender = function(obj, skey, sym_alg, sym_opts){
    
    var get_from_serialized = function(obj){
        if(typeof obj==='string'){
            try { obj = JSON.parse(obj); }catch(e){
                throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
            }
        }
        try{ var o = JSON.stringify(obj.o); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
            invalidSharedSecretObject());
        }
        var s = obj.s;
        var a = obj.a;
        var c = obj.c || {};
        return { 'o': o, 's': s, 'a': a, 'c': c };
    };
    if((typeof obj==='object' || typeof obj==='string') &&
       typeof skey==='undefined' &&
       typeof sym_alg==='undefined' &&
       typeof sym_opts==='undefined'){
        var serialized = SecureExec.sync.apply(get_from_serialized, [obj]);
        obj = serialized.o;
        skey = serialized.s;
        sym_alg = serialized.a;
        sym_opts = serialized.c;
    }
    
    if(typeof obj==='object'){
    try{
        if(obj instanceof symkey.sender.EncSymkeySender){
            return obj.clone();
        }
    }catch(e){} }
    
    var get_exp = function(exp){
        try{
            var e = ncrypt.exception.Create(exp);
            return (new SecureExec.exception.Exception(null,null,e));
        }catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    };
    
    /* Validate @obj */
    var shared_secret_from_serialized = function(obj){
        try{ var s = JSON.parse(obj); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        if(typeof s.t!=='undefined' && typeof s.k!=='undefined'){
            s = new tecies.SecretECIES(obj);
        }else{
            s = new tdh.SecretDH(obj);
        }
        if(_isExp(s)){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        return s;
    };
    var is_shared_secret_obj = function(obj){
        if(typeof obj!=='object' || obj===null) return false;
        var is_dh_sec = false; var is_ecies_sec = false;
        try{ is_dh_sec = (obj instanceof tdh.SecretDH); }
            catch(e){is_dh_sec = false; }
        if(is_dh_sec!==true){
            try{ is_ecies_sec = (obj instanceof tecies.SecretECIES); }
                catch(e){is_ecies_sec = false; }
        }
        return (is_dh_sec || is_ecies_sec);
    };
    if(typeof obj==='string'){
        obj = SecureExec.sync.apply(shared_secret_from_serialized, [obj]);
        if(_isExp(obj)) return obj;
    }
    var obj_valid = SecureExec.sync.apply(is_shared_secret_obj, [obj]);
    if(_isExp(obj_valid)) return obj_valid;
    if(!(typeof obj_valid==='boolean' && obj_valid===true)){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidSharedSecretObject);
    }
    
    /* Validate @skey */
    var secret_from_string = function(str){
        var runf = function(str){
            var s = tsecret.source.SECRET;
            var sec = new tsecret.Secret(s, str);
            return sec;
        };
        return SecureExec.sync.apply(runf, [ str ]);
    };
    var validate_skey = function(sk){
        var runf = function(sk){
            if(typeof sk!=='object' || sk===null) return false;
            var is_sec = false;
            try{ is_sec = (sk instanceof tsecret.Secret); }
                catch(e){ return false; }
            return is_sec;
        };
        return SecureExec.sync.apply(runf, [ sk ]);
    };
    if(typeof skey==='string'){ skey = secret_from_string(skey);
        if(_isExp(skey)) return skey; }
    var skey_valid = SecureExec.sync.apply(validate_skey, [skey]);
    if(_isExp(skey_valid)) return skey_valid;
    if(!(typeof skey_valid==='boolean' && skey_valid===true)){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidSymkeySecret);
    }
    
    /* (Pre-)validate @sym_alg and @sym_opts */
    if( (typeof sym_alg!=='string' || sym_alg.length<1) ||
        ncrypt.sym.getAvailable().indexOf(sym_alg)<0){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidArgument);
    }
    /* (Pre-)validate @sym_opts */
    if(typeof sym_opts!=='undefined'){
        if(!(typeof sym_opts==='object')){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
        try{ if(sym_opts!==null){
                sym_opts = JSON.parse(JSON.stringify(sym_opts));
        } }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
        if(sym_opts===null) sym_opts = {};
    }
    
    // arguments for cloning
    var _args = {}; 
    _args.obj = obj.clone();
    _args.skey = skey.clone();
    _args.sym_alg = sym_alg+''; 
    try{ _args.sym_opts = JSON.parse(JSON.stringify(sym_opts));
    }catch(e){ _args.sym_opts = {}; }
    
    // arguments for json
    try{
        var _json = {};
        _json.o = JSON.parse(obj.getSerialized());
        _json.s = skey.getSecretValue()+'';
        _json.a = sym_alg+''; 
        try{ _json.c = JSON.parse(JSON.stringify(sym_opts));
        }catch(e){ _json.c = {}; }
        var _json_str = JSON.stringify(_json);
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /* internal object properties */
    var _prop = {};
    
    /* - shared secret */
    _prop.shared = {};
    _prop.shared.secstr = obj.getSecretValue();
    
    /* - symmetric key */
    _prop.sym = {};
    _prop.sym.clear = skey.getSecretValue();
    _prop.sym.enc   = ncrypt.sym.sync.encrypt(_prop.sym.clear+'',
                                              _prop.shared.secstr+'',
                                              sym_alg, sym_opts);
    if(_isExp(_prop.sym.enc)) return _prop.sym.enc;
    try{ _prop.sym.enc_json = JSON.parse(_prop.sym.enc); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /* - shared secret type */
    _prop.stype = 'dh';
    if(obj instanceof tecies.SecretECIES) _prop.stype = 'ecies';
    
    /* - receiver key */
    _prop.receiver = {};
    if(_prop.stype==='dh'){
        _prop.receiver.key = obj.getKeypairPublic().clone(); //dh
    }else{
        _prop.receiver.key = obj.getKeypair().clone(); // ecies
        _prop.receiver.tag = obj.getTag().getSerialized(); // get ecies tag
    }
    _prop.receiver.id = _prop.receiver.key.getPublicKeyIDs().txt.normal;
    
    /* - json object to pass to the receiver */
    _prop.json = {};
    _prop.json.obj = {
        't': _prop.stype,
        'i': _prop.receiver.id,
        'k': _prop.sym.enc_json
    };
    if(_prop.stype==='ecies'){
        try{ _prop.json.obj.tag = JSON.parse(_prop.receiver.tag); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    }
    try{ _prop.json.str = JSON.stringify(_prop.json.obj); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of this instance.
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Parsed JSON symmetric key object to append to a message in an encrypted
     * symmetric key array. (Not parsed, use the parsed to avoid JSON string
     * escaping if constructing the array.)
     * @returns {string}
     * @name getSymkeyObjectString
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSymkeyObjectString = function(){
        return _prop.json.str+'';
    };
    /**
     * Parsed JSON symmetric key object to append to a message in an encrypted
     * symmetric key array. (Parsed already to avoid JSON string escaping.)
     * @returns {object}
     * @name getSymkeyObjectJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSymkeyObjectJSON = function(){
        return JSON.parse(_prop.json.str+'');
    };
    /**
     * Get the type of the underlying shared secret ('dh' or 'ecies').
     * @returns {string}
     * @name getSharedType
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSharedType = function(){
        return _prop.stype+'';
    };
    /**
     * Returns the receiver's keypair's ID. (A normal-length text ID.)
     * @returns {string}
     * @name getReceiverID
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getReceiverID = function(){
        return _prop.receiver.id+'';
    };
    /**
     * Returns the receiver's keypair (public key used to derive the DH or
     * ECIES secret).
     * @returns {nCrypt.asym.types.key.keypair}
     * @name getReceiverKey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getReceiverKey = function(){
        return _prop.receiver.key.clone();
    };
    /**
     * Get the ECIES tag required to restore the secret. If the source of this
     * encrypted symkey object was a DH shared secret, return `null`.
     * @returns {string}
     * @name getTag
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getTag = function(){
        if(_prop.stype==='dh') return null;
        return _prop.receiver.tag+'';
    };
    
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.simple.message.symkey.EncSymkeySender}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.clone = function(){
        return new symkey.sender.EncSymkeySender(
            _args.obj, _args.skey, _args.sym_alg, _args.sym_opts);
    };
};

/**
 * As a receiver, retrieve data from a received encrypted symmetric key object.
 * <br />
 * You might pass an optional decryption key to decrypt the symmetric key in
 * the constructor, or omit it to decrypt later.
 * <br />
 * Please note: If passing an instance of this class as the first argument, a
 * clone will be returned.
 * @param {string|object} skey - Encrypted symmetric key object, either parsed
 * JSON or JSON string.
 * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} [deckey] -
 * The decryption key argument can be a string (which will be used directly
 * as a decryption key), or a shared secret object (the shared secret will
 * be used as a decryption key). A serialized shared secret object (JSON
 * string) will be recognized as well.
 * @class
 * @name EncSymkeyReceiver
 * @memberof nCrypt.asym.types.simple.message.symkey.receiver
 * */
var EncSymkeyReceiver = function(skey, deckey){
    
    if(typeof skey==='object'){
    try{
        if(skey instanceof symkey.receiver.EncSymkeyReceiver){
            return skey.clone();
        }
    }catch(e){} }
    
    var get_exp = function(exp){
        try{
            var e = ncrypt.exception.Create(exp);
            return (new SecureExec.exception.Exception(null,null,e));
        }catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    };
    
    /* Validate symmetric key type */
    if( (typeof skey!=='string' && typeof skey!=='object') ||
        (typeof skey==='string' && skey.length<1) ||
        (typeof skey==='object' && (skey===null || skey==={}))
    ){
        return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
    }
    /* Parse string or check object is JSON */
    if(typeof skey==='object'){
        // check whether this is valid JSON
        try{ JSON.stringify(skey); }catch(e){ 
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
    }
    if(typeof skey==='string'){
        try{ skey = JSON.parse(skey); }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
    }
    
    /* Check whether we have a decryption shared secret */
    var shared_secret_from_serialized = function(obj){
        try{ var s = JSON.parse(obj); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        if(typeof s.t!=='undefined' && typeof s.k!=='undefined'){
            s = new tecies.SecretECIES(obj);
        }else{
            s = new tdh.SecretDH(obj);
        }
        if(_isExp(s)){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        return s;
    };
    if(typeof deckey!=='undefined'){
        if(typeof deckey==='string' && deckey.length<1){
            if(deckey.indexOf('{')>=0){ // json, not a serialized secret
                deckey = SecureExec.sync.apply(
                    shared_secret_from_serialized, [deckey]);
                if(_isExp(deckey)) return deckey;
            }
        }
        if(typeof deckey==='object'){
            var is_sec_dh = (function(){
                try{
                    return (deckey instanceof tdh.SecretDH);
                }catch(e){ return false; }
            })();
            var is_sec_ecies = (function(){
                try{
                    return (deckey instanceof tecies.SecretECIES);
                }catch(e){ return false; }
            })();
            if(is_sec_dh || is_sec_ecies){
                deckey = deckey.getSecretValue();
            }else{
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }else{
            if(typeof deckey!=='string' || deckey.length<1){
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }
    }
    
    var _args = {};
    _args.skey = JSON.stringify(skey); _args.deckey = deckey;
    
    var _prop = {};
    
    /* Get shared secret type */
    _prop.stype = skey.t
    if(typeof _prop.stype!=='string' || 
       (_prop.stype!=='dh' && _prop.stype!=='ecies') 
    ){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.malformedInput);
    }
    
    /* Get tag in case of ecies */
    if(_prop.stype === 'ecies'){
        try{ _prop.tag = JSON.stringify(skey.tag); }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.malformedInput);
        }
        _prop.tag = new tpoint.Point(_prop.tag);
        if(_isExp(_prop.tag)) return _prop.tag;
    }else{ _prop.tag = null; }
    
    /* Get the ID */
    _prop.id = skey.i;
    if(typeof _prop.id!=='string' || _prop.id.length<1 || _prop.id==='null'){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.malformedInput);
    }
    
    /* Get the encrypted symmetric key */
    _prop.skey = {};
    _prop.skey.enc = skey.k;
    try{ _prop.skey.enc = JSON.stringify(_prop.skey.enc); }
    catch(e){ return get_exp(
            ncrypt.exception.types.simple.message.symkey.malformedInput); }
    if(typeof deckey === 'string'){
        try{
            _prop.skey.clear = ncrypt.sym.sync.decrypt(_prop.skey.enc, deckey);
            if(_isExp(_prop.skey.clear)){
                _prop.skey.clear = false;
            }
        }catch(e){ _prop.skey.clear = false; }
    }
    
    /**
     * Decrypt the symmetric key. Please note this function does NOT return the
     * decrypted symmetric key. It returns a boolean telling whether it could
     * decrypt or not.
     * <br />
     * The decryption key argument can be a string (which will be used directly
     * as a decryption key), or a shared secret object (the shared secret will
     * be used as a decryption key). A serialized shared secret object (JSON
     * string) will be recognized as well.
     * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} deckey
     * @returns {boolean}
     * @name decryptSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.decryptSymkey = function(deckey){
        if(typeof deckey==='string' && deckey.length<1){
            if(deckey.indexOf('{')>=0){ // json, not a serialized secret
                deckey = SecureExec.sync.apply(
                    shared_secret_from_serialized, [deckey]);
                if(_isExp(deckey)) return deckey;
            }
        }
        if(typeof deckey==='object'){
            var is_sec_dh = (function(){
                try{
                    return (deckey instanceof tdh.SecretDH);
                }catch(e){ return false; }
            })();
            var is_sec_ecies = (function(){
                try{
                    return (deckey instanceof tecies.SecretECIES);
                }catch(e){ return false; }
            })();
            if(is_sec_dh || is_sec_ecies){
                deckey = deckey.getSecretValue();
            }else{
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }else{
            if(typeof deckey!=='string' || deckey.length<1){
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }
        try{
        _prop.skey.clear = ncrypt.sym.sync.decrypt(_prop.skey.enc, deckey);
            if(_isExp(_prop.skey.clear)){
                _prop.skey.clear = false;
            }
        }catch(e){ _prop.skey.clear = false; }
        if(typeof _prop.skey.clear==='string'){
            _args.deckey = deckey+'';
        }
        // should be a string after successful decryption
        return (typeof _prop.skey.clear!=='boolean'); 
    }; 
    
    /**
     * Get the decrypted symmetric key. If the symmetric key wasn't decrypted
     * successfully yet, returns false.
     * @returns {string|boolean}
     * @name getDecryptedSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getDecryptedSymkey = function(){
        if(typeof _prop.skey.clear!=='string') return false;
        return _prop.skey.clear+'';
    };
    
    /**
     * Get the encrypted symmetric key.
     * @returns {string}
     * @name getEncryptedSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getEncryptedSymkey = function(){
        return _prop.skey.enc+'';
    };
    
    /**
     * Get the tag required to restore the secret if the shared secret the 
     * symmetric key was encrypted using was derived using ECIES. Otherwise,
     * return `null`.
     * @returns {nCrypt.asym.types.basic.point.Point}
     * @name getTag
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getTag = function(){
        if(_prop.tag!==null) return _prop.tag.clone();
        return null;
    };
    
    /**
     * Get the receiver's public key ID.
     * @returns {string}
     * @name getID
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getID = function(){
        return _prop.id+'';
    };
    
    /**
     * Shared secret type of the shared secret which was used to encrypt the
     * symmetric key, i.e. 'dh' or 'ecies'.
     * @returns {string}
     * @name getSharedSecretType
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getSharedSecretType = function(){
        return _prop.stype+'';
    };
    
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.simple.message.symkey.EncSymkeyReceiver}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.clone = function(){
        return new symkey.receiver.EncSymkeyReceiver(_args.skey, _args.deckey);
    };
};

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.sender
 * */
symkey.sender = {};
symkey.sender.EncSymkeySender = EncSymkeySender; // class

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr = {};

var create_basic_enc_symkey_array = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    var donef = function(arr){
        setTimeout(function(){ callback(arr, carry); }, 0); return;
    };
    var enc_symkey_from_arg = function(arg, fnargs){
        var skey = fnargs.skey;
        var sym_alg = fnargs.sym_alg;
        var sym_opts = fnargs.sym_opts;
        var runf = function(arg){
            try{
                if(arg instanceof symkey.sender.EncSymkeySender){
                    try{
                        return arg.clone();
                    }catch(e){
                        return new SecureExec.exception.Exception(null,null,e);
                    }
                }
            }catch(e){}
            if(typeof arg.shared_secret_object === 'object' ||
               typeof arg.shared_secret_object === 'string'){
                return new symkey.sender.EncSymkeySender(
                    arg.shared_secret_object, 
                    skey, sym_alg, sym_opts);
            }
            if(typeof arg.public_keyset === 'string'){
                if(typeof arg.local_keyset === 'string'){
                    // construct dh shared secret object
                    var ks_loc = arg.local_keyset;
                    if(typeof arg.local_keyset_pass === 'string'){
                        try{
                            var loc = JSON.parse(ks_loc);
                            if(typeof loc.enc==='object' && 
                               typeof loc.enc.priv==='object'){
                                ks_loc = tkeyset.store.encrypt.decrypt(
                                    ks_loc, arg.local_keyset_pass);
                            }
                        }catch(e){}
                    }
                    if(_isExp(ks_loc)) return ks_loc;
                    ks_loc = new tkeyset.Keyset(ks_loc);
                    if(_isExp(ks_loc)) return ks_loc;
                    
                    var ks_pub = tkeyset.pub.getPublicKeyset(arg.public_keyset);
                        if(_isExp(ks_pub)) return ks_pub;
                        ks_pub = new tkeyset.Keyset(ks_pub);
                        if(_isExp(ks_pub)) return ks_pub;
                    
                    if(!ks_pub.hasEncryptionKeypair() || 
                       !ks_loc.hasEncryptionKeypair() ){
                        var e = ncrypt.exception.Create(
                            ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair);
                        return (new 
                            SecureExec.exception.Exception(null,null,e));
                    }
                    
                    var kp_loc = ks_loc.getKeypairEncryption();
                    var kp_pub = ks_pub.getKeypairEncryption();
                    
                    var sec = new tdh.SecretDH(kp_loc, kp_pub);
                    if(_isExp(sec)) return sec;
                    return new symkey.sender.EncSymkeySender(
                        sec, skey, sym_alg, sym_opts);
                }else{
                    // construct ecies shared secret object
                    var ks_pub = tkeyset.pub.getPublicKeyset(arg.public_keyset);
                        if(_isExp(ks_pub)) return ks_pub;
                        ks_pub = new tkeyset.Keyset(ks_pub);
                        if(_isExp(ks_pub)) return ks_pub;
                    if(!ks_pub.hasEncryptionKeypair()){
                        var e = ncrypt.exception.Create(
                            ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair);
                        return (new 
                            SecureExec.exception.Exception(null,null,e));
                    }
                    var kp_pub = ks_pub.getKeypairEncryption();
                    var sec = new tecies.SecretECIES(kp_pub);
                    if(_isExp(sec)) return sec;
                    return new symkey.sender.EncSymkeySender(
                        sec, skey, sym_alg, sym_opts);
                }
            }
            throw new 
                ncrypt.exception.types.simple.message.symkey.invalidArgument();
        };
        return SecureExec.sync.apply(runf, [arg]);
    };
    var iterate_args_done = function(res){
        var res_a;
        if( !(_isExp(res)) ){  
            res_a = [];
            for(var k in res){
                var r = res[k];
                res_a.push(r);
            }
        }else{ res_a = res; }
        setTimeout(function(){ donef(res_a); }, 0); return;
    };
    var iterate_args = function(a, fnargs, res){
        if(typeof res==='undefined'){ res = {}; }
        if(a.length<1){ iterate_args_done(res); return; }
        var arg = a.shift();
        arg = enc_symkey_from_arg(arg, fnargs);
        if(_isExp(arg)){ iterate_args_done(arg); return; }
        var id = arg.getReceiverID();
        res['id_'+id] = arg;
        setTimeout(function(){ iterate_args(a, fnargs, res); }, 0); return;
    };
    var valid_args = function(a){
        if(typeof a!=='object' || !Array.isArray(a)){
            throw (new 
            ncrypt.exception.types.simple.message.symkey.invalidArgument());
        }
        return true;
    };
    var fargs = {
        'skey': skey, 
        'sym_alg': sym_alg, 
        'sym_opts': sym_opts
    };
    var val_args = SecureExec.sync.apply(valid_args, [args]);
    if(_isExp(val_args)){ donef(val_args); return; }
    iterate_args(args.slice(0), fargs);
};

/**
 * Create an array of encrypted symmetric key objects.
 * <br />
 * Argument @args is an array of argument objects, each providing arguments
 * to create an encrypted symmetric key array.
 * <br />
 * An object in @args can be nothing but an instance 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender}.
 * <br />
 * Another option is to construct an object containing a shared secret object.
 * The argument is something like { 'shared_secret_object': shared_sec_obj },
 * with `shared_sec_obj` an instance 
 * of {@link nCrypt.asym.types.shared.dh.SecretDH}
 * or {@link nCrypt.asym.types.shared.ecies.SecretECIES} (a serialized instance
 * i.e. a string is possible as well).
 * <br />
 * To construct the shared secret in this function, pass the keysets.
 * <br />
 * For an ECIES like shared secret, simply pass the public keyset (string /
 * serialized). The argument would be { 'public_keyset': public_keyset_str }.
 * <br />
 * For a DH shared secret, additionally pass the local keyset, 
 * i.e. { 'public_keyset': public_keyset_str, 'local_keyset': loc_ks_str }, or
 * if `loc_ks_str` is still encrypted, { 'public_keyset': public_keyset_str, 
 * 'local_keyset': loc_ks_str, 'local_keyset_pass': loc_ks_pass }.
 * <br />
 * The function callback is called with either an array of instances 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender} or
 * a `SecureExec` exception.
 * @param {object[]} args
 * @param {string} skey - Symmetric key the message will be encrypted using.
 * @param {string} sym_alg - Algorithm to use for symmetric encryption.
 * @param {object} [sym_opts]
 * @param {function} callback - Function like 
 * function([nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender[]|
 * SecureExec.exception.Exception] res, [*] carry)
 * @param {*} carry
 * @name createEncryptedSymkeyArray
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.createEncryptedSymkeyArray = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    create_basic_enc_symkey_array(
        args, skey, sym_alg, sym_opts, callback, carry
    );
};

/**
 * This function is about the same 
 * as {@link nCrypt.asym.types.simple.message.symkey.sender.arr.createEncryptedSymkeyArray},
 * but it results in a JSON object array right away instead of an array of 
 * instances of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender}.
 * @param {object[]} args
 * @param {string} skey - Symmetric key the message will be encrypted using.
 * @param {string} sym_alg - Algorithm to use for symmetric encryption.
 * @param {object} [sym_opts]
 * @param {function} callback - Function like 
 * function([object[]|SecureExec.exception.Exception] res, [*] carry)
 * @param {*} carry
 * @name createEncryptedSymkeyArrayJSON
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.createEncryptedSymkeyArrayJSON = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    create_basic_enc_symkey_array(
        args, skey, sym_alg, sym_opts, function(r,c){
            if(_isExp(r)){
                callback(r, c); return;
            }
            r = symkey.sender.arr.symkeyArrayJSON(r);
            callback(r, c); return;
        }, carry
    );
};

/**
 * From an array of instances 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender},
 * create an array of simple JSON objects. These can be stringified easily and
 * sent over the network in a message.
 * @param {nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender[]} arr
 * @returns {object[]|SecureExec.exception.Exception} 
 * @name symkeyArrayJSON
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.symkeyArrayJSON = function(arr){
    var runf = function(arr){
        var res = [];
        if(typeof arr!=='object' || !Array.isArray(arr)){
            throw (new 
            ncrypt.exception.types.simple.message.symkey.invalidArgument());
        }
        for(var i=0; i<arr.length; i++){
            var a = arr[i];
            var r = a.getSymkeyObjectJSON();
            res.push(r);
        }
        return res;
    };
    return SecureExec.sync.apply(runf, [arr]);
};

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.receiver
 * */
symkey.receiver = {};
symkey.receiver.EncSymkeyReceiver = EncSymkeyReceiver; // class

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.receiver.arr
 * */
symkey.receiver.arr = {};

/**
 * From a received encrypted symmetric key array (array of JSON objects), 
 * extract the one containing a symmetric key encrypted for a certain 
 * keyset (usually your local keyset). Returns null if no matching JSON
 * object is found.
 * @param {object[]} arr
 * @param {string} local_keyset
 * @returns {object}
 * @name extractItem
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.receiver.arr
 * */
symkey.receiver.arr.extractItem = 
function(arr, local_keyset) {
    var ks = (function(local_keyset){
        var _ks;
        try{
            _ks = tkeyset.pub.getPublicKeyset(local_keyset);
            _ks = new tkeyset.Keyset(_ks);
            if(_isExp(_ks)) return _ks;
            if(!_ks.hasEncryptionKeypair()){
                throw (new ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair());
            }
            return _ks;
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    })(local_keyset);
    if(_isExp(ks)) return ks;
    var ks_id = ks.getKeypairEncryption().getPublicKeyIDs().txt.normal;
    var a = (function(){
        var runf = function(arr){
            if(typeof arr!=='object' || !Array.isArray(arr)){
                throw (new 
                ncrypt.exception.types.simple.message.symkey.invalidArgument());
            }
            return arr.slice(0);
        };
        return SecureExec.sync.apply(runf, [arr]);
    })(); if(_isExp(a)) return a;
    
    var itm = null;
    for(var i=0; i<a.length; i++){
        var sk = a[i];
        var id = (function(){
            try{
                var s = JSON.parse(JSON.stringify(sk));
                if(typeof s.i==='string'){
                    return s.i+'';
                }else{
                    throw (new 
                    ncrypt.exception.types.simple.message.symkey.
                    invalidArgument());
                }
            }catch(e){ 
                return (new SecureExec.exception.Exception(null,null,e)); }
        })();
        if(_isExp(id)) return id;
        if(id===ks_id){
            itm = a[i]; break;
        }
    }
    return itm;
};

return symkey; });
