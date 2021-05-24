
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

var tpoint = deptypes.basic.point;
var tbn = deptypes.basic.bn;
var tsecret = deptypes.basic.secret;
var tid = deptypes.basic.id;
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.simple.keyset
 * */
var  keyset = {};
var _keyset = {};

/** 
 * Get a new keyset from two keypairs or an existing keyset (serialized or 
 * instance of this class).
 * <br />
 * Please note that a `Keyset` (or it's serialized version) 
 * contains **UNENCRYPTED PRIVATE KEY INFORMATION**. If storing a keyset 
 * (which is not a public only keyset, retrieved 
 * using {@link nCrypt.asym.types.simple.keyset.Keyset#getPublicKeyset}),
 * ALWAYS encrypt using the appropriate 
 * functions in {@link nCrypt.asym.types.simple.keyset.store}. Sending a keyset
 * containing private key information over the network is not recommended, even
 * if it is encrypted, as security then is reduced to the security of the 
 * password!
 * <br />
 * A `Keyset` cannot be restored from an encrypted serialized keyset. Please
 * decrypt (see functions in  {@link nCrypt.asym.types.simple.keyset.store}) 
 * before passing the string to this function.
 * <br />
 * Do not encrypt/decrypt directly using functions in {@link nCrypt.sym}. The
 * functions in {@link nCrypt.asym.types.simple.keyset.store} encrypt only the 
 * private parts of the keyset, saving space and keeping the public parts 
 * available.
 * <br />
 * To get the serialized public keyset from a serialized keyset, whether it 
 * already is public-only or not, whether it is encrypted or not, use 
 * the functions in {@link nCrypt.asym.types.simple.keyset.pub}.
 * @param {string|nCrypt.asym.types.simple.keyset.Keyset} keyp_enc - Either the
 * encryption keypair for the keyset to create, or an existing keyset 
 * (serialized, i.e. string, or object). To omit the encryption keypair, pass
 * null (for a signing only key).
 * @param {string} keyp_sig - Signing keypair for the keyset to create. To omit
 * the signing keypair, pass null (for an encryption only key). Please note:
 * Don't pass nothing here, but actually null, if @keyp_sig is undefined, it 
 * will be assumed @keyp_enc represents a serialized keyset, not a keypair.
 * @name Keyset
 * @class
 * @memberof nCrypt.asym.types.simple.keyset
 * */
var Keyset = function(keyp_enc, keyp_sig){
    var _kp_obj_enc; var _kp_obj_sig;
    var _public_only = false;
    
    if( (typeof keyp_enc==='object' && keyp_enc===null) &&
        (typeof keyp_sig==='object' && keyp_sig===null) ){
        var exp = ncrypt.exception.Create(
            ncrypt.exception.types.simple.keyset.invalidArgument);
        return (new SecureExec.exception.Exception(null,null,exp));
    }
    
    /* If this is an instance of Keyset, return the clone. */
    try{
        if(typeof keyp_enc==='object' && (keyp_enc instanceof Keyset)){
            return keyp_enc.clone();
        }
    }catch(e){}
    
    /* If this is a serialized Keyset, extract the key information. */
    if(typeof keyp_enc==='string' && typeof keyp_sig==='undefined'){
        var ks_str = keyp_enc;
        try{ ks_str = JSON.parse(keyp_enc);
             if(!(typeof ks_str.enc==='object' && ks_str.enc===null)){
                 keyp_enc = JSON.stringify(ks_str.enc);
             }else{ keyp_enc = null; }
             if(!(typeof ks_str.sig==='object' && ks_str.sig===null)){
                 keyp_sig = JSON.stringify(ks_str.sig);
             }else{ keyp_sig = null; }
        }catch(e){
            var exp = ncrypt.exception.Create(
                ncrypt.exception.types.simple.keyset.invalidArgument);
            return (new SecureExec.exception.Exception(null,null,exp));
        }
    }
    
    /* Get the encryption keypair if there should be one. */
    var kp_enc = null;
    if(!(typeof keyp_enc==='object' && keyp_enc===null)){
        kp_enc = new tkeypair.Keypair(keyp_enc);
        if(_isExp(kp_enc)) return kp_enc; 
        if(kp_enc.isPublicOnly()===true) _public_only = true;
    }
    
    /* Get the signing keypair if there should be one. */
    var kp_sig = null;
    if(!(typeof keyp_sig==='object' && keyp_sig===null)){
        kp_sig = new tkeypair.Keypair(keyp_sig);
        if(_isExp(kp_sig)) return kp_sig;
        if(kp_sig.isPublicOnly()===true) _public_only = true;
        /* Montgomery type curves do not support signing, verification will
         * always fail. */
        if(kp_sig.getType()==='mont'){
            var exp = ncrypt.exception.Create(
                ncrypt.exception.types.simple.keyset.invalidCurveTypeSigning);
            return (new SecureExec.exception.Exception(null,null,exp));
        }
    }
    
    /* If one of the keysets is public only, the keyset is public only. */
    if(_public_only){
        if( (kp_sig!==null && kp_sig.isPublicOnly()===true) && 
            (kp_enc!==null && kp_enc.isPublicOnly()!==true)){
                kp_enc = new tkeypair.Keypair(kp_enc.getPublicKeypair());
                if(_isExp(kp_enc)) return kp_enc; 
        }else if( (kp_enc!==null && kp_enc.isPublicOnly()===true) && 
                  (kp_sig!==null && kp_sig.isPublicOnly()!==true)){
                kp_sig = new tkeypair.Keypair(kp_sig.getPublicKeypair());
                if(_isExp(kp_sig)) return kp_sig; 
        }else{}
    }
    
    /* Get the serialized version of the encryption keyset. */
    if(kp_enc!==null){
        _kp_obj_enc = kp_enc;
        kp_enc = kp_enc.getSerialized();
        try{ kp_enc = JSON.parse(kp_enc); }
        catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    }else{ _kp_obj_enc = null; }
    
    /* Get the serialized version of the signing keyset. */
    if(kp_sig!==null){
        _kp_obj_sig = kp_sig;
        kp_sig = kp_sig.getSerialized();
        try{ kp_sig = JSON.parse(kp_sig); }
        catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    }else{ _kp_obj_sig = null; }
    
    /* Parse the keypairs to make sure no space is wasted by JSON escaping. */
    var _kp_enc = kp_enc;
    var _kp_sig = kp_sig;
    var _json_obj = { 'enc': _kp_enc, 'sig': _kp_sig };
    var _json_str = '';
    try{ _json_str = JSON.stringify(_json_obj); }
    catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    
    /* Define a public only keyset (serialized and parsed JSON). */
    var _public_keyset_obj = JSON.parse(_json_str);
    if(_public_keyset_obj.enc!==null) _public_keyset_obj.enc.priv = null; 
    if(_public_keyset_obj.sig!==null) _public_keyset_obj.sig.priv = null;
    var _public_keyset_str = JSON.stringify(_public_keyset_obj);
    
    /* Calculate public keyset IDs */
    var _id_pub_str = '';
    if(_kp_obj_sig!==null) _id_pub_str += 
        _kp_obj_sig.getPublic().getSerialized();
    if(_kp_obj_enc!==null) _id_pub_str += 
        _kp_obj_enc.getPublic().getSerialized();
    var _id = {};
    _id.txt = {}; // IDs which should be represented as a text
    _id.col = {}; // IDs which are easily represented as a color, arrays of strs
    // Normal length ID which can easily be represented as text
    _id.txt.normal = new tid.ID(_id_pub_str, 'sha256', 'base64url');
    if(_isExp(_id.txt.normal)) return _id.txt.normal;
    _id.txt.normal = _id.txt.normal.getIdValue()
    // Shorter ID which can easily be represented as text
    _id.txt.short  = new tid.ID(_id_pub_str, 'sha1', 'base64url');
    if(_isExp(_id.txt.short)) return _id.txt.short;
    _id.txt.short = _id.txt.short.getIdValue()
    // Normal length ID which can easily be represented as colors (array of 
    // hex-strings, each of them 6 chars long)
    _id.col.normal = new tid.ID(_id_pub_str, 'sha256', 'hex', 6);
    if(_isExp(_id.col.normal)) return _id.col.normal;
    _id.col.normal = _id.col.normal.getIdSplit();
    // Shorter ID which can easily be represented as colors.
    _id.col.short = new tid.ID(_id_pub_str, 'sha1', 'hex', 6);
    if(_isExp(_id.col.short)) return _id.col.short;
    _id.col.short = _id.col.short.getIdSplit();
    
    /**
     * Get the serialized version of this keyset. Please note: This 
     * contains **unencrypted private key information**. Encrypt before storing
     * it anywhere.
     * @name getSerialized
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getSerialized = function(){
        if(_public_only){ return _public_keyset_str+''; }
        return _json_str+'';
    };
    /**
     * Get the signing keypair.
     * @name getKeypairSigning
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getKeypairSigning = function(){
        if(_kp_obj_sig!==null) return _kp_obj_sig.clone();
        return null;
    };
    /**
     * Check whether this keyset supports signing (has a signing keypair.)
     * @name hasSigningKeypair
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.hasSigningKeypair = function(){
        return (_kp_obj_sig!==null);
    };
    /**
     * Get the encryption keypair.
     * @name getKeypairEncryption
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getKeypairEncryption = function(){
        if(_kp_obj_enc!==null) return _kp_obj_enc.clone();
        return null;
    };
    /**
     * Check whether this keyset supports encryption (has an encryption 
     * keypair).
     * @name hasEncryptionKeypair
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.hasEncryptionKeypair = function(){
        return (_kp_obj_enc!==null);
    };
    
    /**
     * Get the public keyset from this keyset. This is the public key you
     * send over the network and give to contacts.
     * @name getPublicKeyset
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getPublicKeyset = function(){
        return _public_keyset_str+'';
    };
    
    /**
     * Check whether this keyset contains public key information only, i.e. no
     * private key information.
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.isPublicKeyset = function(){
        return _public_only;
    };
    
    /**
     * Get an object with public keyset IDs. The object returned is an object 
     * like {'txt': { 'normal': [string](normal length id to be represented as 
     * text), 'short': [string](shorter length id to be represented as text) },
     * 'col': { 'normal': [string[]](normal length id to be represented as 
     * colors - array of hex-strings), [string[]](shorter length id to be 
     * represented as colors - array of hex strings) }}.
     * <br />
     * Please note: The IDs are simply hashes for BOTH signing and encryption
     * public key if both are present, i.e. the ID represents the keyset. To 
     * get the ID for the encryption keypair or signing keypair, use the 
     * functions to get these keypairs and call their 'getPublicKeyIDs' 
     * functions.
     * @returns {object}
     * @name getPublicKeyIDs
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getPublicKeyIDs = function(){
        try{
            return JSON.parse(JSON.stringify(_id));
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    };
    
    /**
     * @name clone
     * @returns {nCrypt.asym.types.simple.keyset.Keyset}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.clone = function(){
        return new Keyset(_json_str+'');
    };
};
keyset.Keyset = Keyset;

/**
 * @namespace nCrypt.asym.types.simple.keyset.store
 * */
keyset.store = {};

/**
 * @namespace nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt = {};

/**
 * Encrypt a (serialized) keyset. This function only encrypts the private key
 * information contained in the secret, leaving the public key information 
 * intact. 
 * <br />
 * A keyset can / should not be encrypted twice, so if this is encrypted 
 * already, decrypt.
 * @param {string} ks - Serialized keyset. 
 * @param {string} pass - Password to use for encryption.
 * @param {string} [sym_alg] - Symmetric algorithm.
 * @param {object} [sym_opts]
 * @returns {string} 
 * @name encrypt
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.encrypt = function(ks, pass, sym_alg, sym_opts){
    var runf = function(ks, pass, sym_alg, sym_opts){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.encrypt(
                                kp_enc, pass, sym_alg, sym_opts);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.encrypt(
                                kp_sig, pass, sym_alg, sym_opts);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, [ks, pass, sym_alg, sym_opts]);
};
/**
 * Decrypt a keyset with encrypted private key information.
 * @param {string} ks - (Serialized) keyset with encrypted private key 
 * information.
 * @param {string} pass
 * @returns {string} 
 * @name decrypt
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.decrypt = function(ks, pass){
    var runf = function(ks, pass){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.decrypt(kp_enc, pass);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.decrypt(kp_sig, pass);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, [ks, pass]);
};
/**
 * Change the encryption options of a keypair. Change the password (to keep
 * it the same, simply pass the same string for old and new pass), and/or
 * the encryption options and algorithm. If algorithm and options are omitted,
 * existing options are used.
 * @param {string} ks - Serialized keyset. 
 * @param {string} old_pass
 * @param {string} new_pass
 * @param {string} [sym_alg] - Symmetric algorithm.
 * @param {object} [sym_opts]
 * @name change
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.change = function(ks, 
                                       old_pass, new_pass, 
                                       sym_alg, sym_opts){
    var runf = function(ks, old_pass, new_pass, sym_alg, sym_opts){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.change(
                                kp_enc, old_pass, new_pass, sym_alg, sym_opts);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.change(
                                kp_sig, old_pass, new_pass, sym_alg, sym_opts);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, 
            [ks, old_pass, new_pass, sym_alg, sym_opts]);
};

/**
 * @namespace nCrypt.asym.types.simple.keyset.pub
 * */
keyset.pub = {};

/**
 * Get a public keyset from a (serialized) keyset. It doesn't matter if this
 * is a public keyset already, or if it contains encrypted or unencrypted 
 * private key information.
 * @param {string} ks - (Serialized) keyset.
 * @returns {string}
 * @name getPublicKeyset
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.pub
 * */
keyset.pub.getPublicKeyset = function(ks){
    var runf = function(){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        if(ks.enc!==null) ks.enc.priv = null;
        if(ks.sig!==null) ks.sig.priv = null;
        return JSON.stringify(ks);
    };
    return SecureExec.sync.apply(runf, [ ks ]);
};

return keyset; });
