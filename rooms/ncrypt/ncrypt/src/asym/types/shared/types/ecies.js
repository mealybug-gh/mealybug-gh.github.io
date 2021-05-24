
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
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.shared.ecies
 * */
var  ecies = {};
var _ecies = {};

_ecies.secret = {};
_ecies.secret.generateSecret = function(kp){
    var gen_secret = function(kp){
        /* Get the curve @kp is on */
        var curve = kp.getCurveName();
        /* Generate a random keypair */
        var random_keypair = new tkeypair.Keypair(null, curve);
        if(_isExp(random_keypair)) return random_keypair;
        /* Derive a shared secret between these two keypairs. */
        var shared_secret_bn; var shared_secret;
        try{
            var rkpe = random_keypair.getEllipticKeypair();
            var kpep = kp.getPublic().getEllipticPoint();
            shared_secret_bn = rkpe.derive(kpep);
            var source = tsecret.source.BN;
            shared_secret = new tsecret.Secret(source, shared_secret_bn);
        }catch(e){
            throw new ncrypt.exception.types.shared.ecies.derivationFailed();
        }
        /* Store the random public key as a tag */
        var tag = random_keypair.getPublic();
        return { "tag": tag, "secret": shared_secret };
    };
    return SecureExec.sync.apply(gen_secret, [ kp ]);
};
_ecies.secret.restoreSecret = function(kp, tag){
    var restore_sec = function(kp, tag){
        var shared_secret_bn; var shared_secret;
        try{
            tag = tag.getEllipticPoint();
            shared_secret_bn = kp.getEllipticKeypair().derive(tag);
            var source = tsecret.source.BN;
            shared_secret = new tsecret.Secret(source, shared_secret_bn);
        }catch(e){
            throw new ncrypt.exception.types.shared.ecies.restoreFailed();
        }
        return shared_secret;
    };
    return SecureExec.sync.apply(restore_sec, [ kp, tag ]);
};

/**
 * Create a (temporary) shared secret using ECIES like key derivation.
 * <br />
 * To generate a secret, pass the receiver's (public) keypair. As a result,
 * there will be a **tag** and a **secret**. The secret is never sent anywhere, 
 * and can be used to encrypt a message. The tag needs to be sent along with the
 * message so the owner of the public key will be able to restore the secret.
 * <br />
 * The restore a secret, pass the local (full) keypair and the tag received
 * with the message. If you are the receiver of the message, i.e. the message
 * was encrypted for you, the secret can be used to decrypt a potential message.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} keypair - To derive,
 * the receiver's (public part only) keypair, to restore, your local keypair.
 * To restore an instance of this class from a serialized instance, pass the 
 * string or JSON object instead of @keypair as the only parameter.
 * @param {string|nCrypt.asym.types.basic.point.Point} [tag] - Do not pass to
 * derive, to restore, pass the tag.
 * @param {string} [cloning_secret] - Usually NOT passed. Used when cloning an
 * ECIES object, i.e. new SecretECIES(keypair, tag, cloning_secret), with 
 * the @cloning_secret being a serialized instance 
 * of {@link nCrypt.asym.types.basic.secret.Secret}, for example derived 
 * calling `getSecretValue()` from the original object. To clone an instance
 * from this object, do not use this, as there are no further checks performed,
 * simply call `clone()`.
 * @class
 * @name SecretECIES
 * @memberof nCrypt.asym.types.shared.ecies
 * */
var SecretECIES = function(keypair, tag, cloning_secret){
    
    var is_empty = function(o){
        return (typeof o==='undefined' || (typeof o==='object' && o===null));
    };
    
    var get_from_json = function(obj){
        if(typeof obj==='string'){
            try{ obj = JSON.parse(obj); }catch(e){
                throw new ncrypt.exception.types.shared.dh.invalidArgument(); }
        }
        if(typeof obj!=='object' || obj===null || obj==={}){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        var t = obj.t; 
        if(is_empty(t)){ t = null; }else{
            try{ t = JSON.stringify(t); }catch(e){ t=null; }
        }
        var k = obj.k; try{ k = JSON.stringify(k); }catch(e){ k=null; }
        var s = obj.s;
        if(typeof t!=='string' || typeof k!=='string' || typeof s!=='string'){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        return { 't': t, 'k': k, 's': s };
    };
    if((typeof keypair==='string' || typeof keypair==='object') &&
       typeof tag==='undefined' && 
       typeof cloning_secret==='undefined'){
        try{
            keypair = JSON.parse(keypair);
            if(typeof keypair.t!=='undefined' && 
               typeof keypair.k!=='undefined' &&
               typeof keypair.s!=='undefined'){
                var serialized = 
                    SecureExec.sync.apply(get_from_json, [keypair]);
                if(_isExp(serialized)) return serialized;
                keypair = serialized.k;
                tag = serialized.t;
                cloning_secret = serialized.s;
            }else{ keypair = JSON.stringify(keypair); }
        }catch(e){}
    }
    
    var _secret; var _tag; var _kp;
    var _is_derived; var _is_restored;
    
    var kp = new tkeypair.Keypair(keypair);
    if(_isExp(kp)) return kp;
    _kp = kp;
    if( typeof tag!=='undefined' ){
        if(typeof tag==='object'){
            try{ if(!(tag instanceof tpoint.Point)) 
                 tag = JSON.stringify(tag); 
            }catch(e){}
        }
        var tagp = new tpoint.Point(tag);
        if(_isExp(tagp)) return tagp;
    }
    if( typeof tag==='undefined' ){
        // derive a secret
        _is_derived = true;
        _is_restored = false;
        var res = _ecies.secret.generateSecret(kp);
        if(_isExp(res)) return res;
        _secret = res.secret;
        _tag = res.tag;
    }else{
        // restore a secret
        _is_derived = false;
        _is_restored = true;
        var sec;
        if(typeof cloning_secret === 'string'){
            // use the existing secret
            sec = new tsecret.Secret(tsecret.source.SECRET, cloning_secret);
            if(typeof tagp!=='undefined'){
                _tag = tagp;
            }else{ _tag = null; }
        }else{
            // restore the secret
            sec = _ecies.secret.restoreSecret(kp, tagp);
            _tag = tagp;
        }
        if(_isExp(sec)) return sec;
        _secret = sec;
    }
    
    try{
        var _json = {};
        if(is_empty(_tag)){ _json.t = null; }
        else{ _json.t = JSON.parse(_tag.clone().getSerialized()); }
        _json.k = JSON.parse(_kp.clone().getPublicKeypair());
        _json.s = _secret.getSecretValue()+'';
        var _json_str = JSON.stringify(_json)+'';
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of the secret object. (Please note: This is 
     * NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.ecies.SecretECIES}.)
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Get the serialized version of the secret object as parsed JSON. (Please 
     * note: This is NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.ecies.SecretECIES}.) 
     * @private
     * @returns {object}
     * @name getJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getJSON = function(){
        return JSON.parse(_json_str);
    };
    
    /**
     * Get the shared secret as an instance of `Secret`. The shared secret is
     * never sent anywhere and can be used to encrypt messages.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name getSecret
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSecret = function(){
        return _secret.clone();
    };
    /**
     * Get the secret value as a string.
     * @name getSecretValue
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSecretValue = function(){
        return _secret.getSecretValue();
    };
    /**
     * Get the tag, which either needs to be sent along with an encrypted 
     * message for the receiver to restore the secret, or was used by the
     * receiver to restore the secret in case of restore.
     * @name getTag
     * @returns {object|nCrypt.asym.types.basic.point.Point}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getTag = function(){
        if(!is_empty(_tag)) return _tag.clone();
        return null;
    };
    
    /**
     * Get the keypair used to derive or restore the secret.
     * @name getKeypair
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getKeypair = function(){
        return _kp.clone();
    };
    
    /**
     * Return a clone of this object.
     * @returns {nCrypt.asym.types.shared.ecies.SecretECIES}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.clone = function(){
        if(!is_empty(_tag)){ var _cloning_tag = _tag.clone(); }
        else{ _cloning_tag = null; }
        var _cloning_key = _kp.clone();
        var _cloning_sec = _secret.getSecretValue()+'';
        return new ecies.SecretECIES(_cloning_key, _cloning_tag, _cloning_sec);
    };
};
ecies.SecretECIES = SecretECIES;

return ecies; });
