
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

module.exports = (function(ncrypt, types){

// bn: types.basic.bn
var SecureExec = ncrypt.dep.SecureExec;

/**
 * @namespace nCrypt.asym.types.basic.secret
 * */
var  secret = {};
var _secret = {};

_secret.source = {
    "BN": 0,
    "STRING": 1,
    "SECRET": 2
};

/**
 * @const 
 * @name source
 * @memberof nCrypt.asym.types.basic.secret
 * */
secret.source = (function(){
    return JSON.parse(JSON.stringify(_secret.source));
})();

_secret.valid = {};
_secret.valid.isValidSecretString = function(str){
    if(typeof str!=="string" || str.length<1) return false;
    var length_and_encoding_match = function(s){
        try {
            var bytes = ncrypt.enc.transform(s, "base64url", "bytes");
            if(bytes.length === 32){ return true; }
        }catch(e){}
        return false;
    };
    return length_and_encoding_match(str);
};
_secret.valid.isValidSecretObject = function(obj){
    var inst = false;
    try{ inst = obj instanceof Secret; }catch(e){ return false; }
    if(inst){
        var val = false;
        try{ val = obj.getSecretValue(); }catch(e){}
        if(typeof val!=="string") return false;
        return _secret.valid.isValidSecretString(val);
    }
    return false;
};
_secret.valid.validSource = function(source){
    if(typeof source!=="number") return false;
    if(source<0) return false;
    for(var k in _secret.source){
        if(_secret.source[k]===source) return true;
    }
    return false;
};

/**
 * Constructor for a `Secret` object. A `Secret` internally represents a key
 * which can be used for encryption and decryption, providing 256 bit of key
 * data. 
 * <br />
 * A `Secret` can be derived from a big number (`source.BN`), a string 
 * (`source.STRING`) or a `Secret` (`source.SECRET`). 
 * <br />
 * If choosing source type 
 * `STRING`, the string will be simply hashed to get a hash of 256 bit of key
 * data. This is NOT a way to turn passwords into a `Secret`, as these usually
 * are weak as cryptographic keys and require PBKDF2 with additional salt. 
 * <br />
 * If choosing `source.SECRET`, you might pass an instance of `Secret` just as 
 * well as a valid secret string, i.e. a serialized representation of a `Secret`
 * (easily retrieved via `(my_secret_obj).getSecretValue()`).
 * <br />
 * Retrieving secrets from big numbers is especially convenient when converting
 * `elliptic` shared secrets (which usually are big numbers) to instances of 
 * `Secret`.
 * @param {int} source - Source constant 
 * from `nCrypt.asym.types.basic.secret.source`.
 * @param {string|object} val - String, `Secret` object / `Secret` string value,
 * big number.
 * @returns {object}
 * @memberof nCrypt.asym.types.basic.secret
 * @class
 * @name Secret
 * */
var Secret = function(source, val){
    var sec_str = null;
    
    var secret_from_secret_str = function(val){
        if(_secret.valid.isValidSecretString(val)){
            sec_str = val;
        }else{
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        return true;
    };
    var secret_from_secret_obj = function(val){
        var is_secret = function(){
            try{ return obj instanceof secret.Secret; }catch(e){ return false; }
        }();
        if(is_secret){
            sec_str = val.getSecretValue();
        }else{
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        return true;
    };
    var secret_from_string = function(val){
        if(typeof val!=="string" || val.length<1){
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        var sec = ncrypt.hash.hash(val, "sha256", "base64url");
        var res = SecureExec.sync.apply(secret_from_secret_str, [sec]);
        if(typeof res!=="boolean") return res;
        return true;
    };
    var secret_from_bn = function(val){
        var bn_obj = new types.basic.bn.BigNumber(val);
        if(SecureExec.tools.proto.inst.isException(bn_obj)){
            return bn_obj;
        }
        var str = bn_obj.getSerialized();
        var res = SecureExec.sync.apply(secret_from_string, [str]);
        if(typeof res!=="boolean") return res;
        return true;
    };
    
    if(!_secret.valid.validSource(source)){
        var err = ncrypt.exception.Create(
        ncrypt.exception.types.basic.secret.invalidSourceType);
        var exp = new SecureExec.exception.Exception(null,null,err);
        return exp;
    }
    var res = null;
    if(source===_secret.source.BN){
        res = SecureExec.sync.apply(secret_from_bn, [val]);
    }else if(source===_secret.source.STRING){
        res = SecureExec.sync.apply(secret_from_string, [val]);
    }else {
        if(typeof val==="string"){
            res = SecureExec.sync.apply(secret_from_secret_str, [val]);
        }else{
            res = SecureExec.sync.apply(secret_from_secret_obj, [val]);
        }
    }
    if(typeof res!=="boolean"){
        if(SecureExec.tools.proto.inst.isException(res)){
            return res;
        }else{
            var exp = ncrypt.exception.Create(
                        ncrypt.exception.types.basic.secret.invalidValue);
            exp = new SecureExec.exception.Exception(null, null, exp);
            return exp;
        }
    }
    if(!_secret.valid.isValidSecretString(sec_str)){
        var exp = ncrypt.exception.Create(
                        ncrypt.exception.types.basic.secret.invalidValue);
            exp = new SecureExec.exception.Exception(null, null, exp);
            return exp;
    }
    
    /**
     * Get the string value representing the `Secret`.
     * @returns {string}
     * @name getSecretValue
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.secret.Secret#
     * */
    this.getSecretValue = function(){
        return sec_str+"";
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.secret.Secret#
     * */
    this.clone = function(){
        var source = _secret.source.SECRET;
        var sec = new Secret(source, sec_str);
        return sec;
    };
};
secret.Secret = Secret;

return secret; });
