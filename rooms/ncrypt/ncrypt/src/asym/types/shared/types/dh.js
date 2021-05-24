
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
 * @namespace nCrypt.asym.types.shared.dh
 * */
var  dh = {};
var _dh = {};

_dh.secret = {};
_dh.secret.derive = function(kp1, kp2){
    var check_curves_match = function(kp1, kp2){
        var c1 = kp1.getCurveName(); var c2 = kp2.getCurveName();
        if(c1!==c2){
            throw new ncrypt.exception.types.shared.dh.nonmatchingCurves();
        } return true;
    };
    var run_dh = function(kp1, kp2){
        var shared_secret_bn;
        try{
            var ekp1 = kp1.getEllipticKeypair();
            var ekp2p = kp2.getPublic().getEllipticPoint();
            shared_secret_bn = ekp1.derive(ekp2p);
        }catch(e){
            throw new ncrypt.exception.types.shared.dh.derivationFailed();
        }
        var source = tsecret.source.BN;
        var secret = new tsecret.Secret(source, shared_secret_bn);
        return secret;
    };
    var cmatch = SecureExec.sync.apply(check_curves_match, [kp1, kp2]);
    if(_isExp(cmatch)) return cmatch;
    return SecureExec.sync.apply(run_dh, [kp1, kp2]);
};

/**
 * Create a shared secret between two keypairs using DH for shared secret
 * derivation.
 * <br />
 * Please note: Both keypairs must use the same curve for DH.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} local_keypair - Keypair
 * to derive a shared secret with @public_keypair using DH. To restore an
 * instance of this class from a serialized instance, pass the string or JSON
 * object instead of @local_keypair as the only parameter.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} public_keypair - 
 * Keypair to derive a shared secret with @keypair1 using DH. For this keypair, 
 * a public only keypair is enough. (You'll usually pass the remote public 
 * keypair as this argument.)
 * @class
 * @name SecretDH
 * @memberof nCrypt.asym.types.shared.dh
 * */
var SecretDH = function(local_keypair, public_keypair, existing_secret){
    
    var get_from_json = function(obj){
        if(typeof obj==='string'){
            try{ obj = JSON.parse(obj); }catch(e){
                throw new ncrypt.exception.types.shared.dh.invalidArgument(); }
        }
        if(typeof obj!=='object' || obj===null || obj==={}){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        var l = obj.l; try{ l = JSON.stringify(l); }catch(e){ l=null; }
        var p = obj.p; try{ p = JSON.stringify(l); }catch(e){ p=null; }
        var s = obj.s;
        if(typeof l!=='string' || typeof p!=='string' || typeof s!=='string'){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        return { 'l': l, 'p': p, 's': s };
    };
    if((typeof local_keypair==='string' || typeof local_keypair==='object') &&
       typeof public_keypair==='undefined' && 
       typeof existing_secret==='undefined'){
        var serialized = SecureExec.sync.apply(get_from_json, [local_keypair]);
        if(_isExp(serialized)) return serialized;
        local_keypair = serialized.l;
        public_keypair = serialized.p;
        existing_secret = serialized.s;
    }
    
    var _secret = null;
    var _kp1 = null; var _kp2 = null;
    
    var kp1 = new tkeypair.Keypair(local_keypair); if(_isExp(kp1)) return kp1;
    var kp2 = new tkeypair.Keypair(public_keypair); if(_isExp(kp2)) return kp2;
    
    if(typeof existing_secret==="string"){
        _secret = new tsecret.Secret(tsecret.source.SECRET, existing_secret);
    }else{
        _secret = _dh.secret.derive(kp1, kp2);
    }
    if(_isExp(_secret)) return _secret;
    _kp1 = kp1; _kp2 = kp2;
    
    try{
        var _json = {};
            _json.l = JSON.parse(kp1.getSerialized());
            _json.p = JSON.parse(kp2.getPublicKeypair());
            _json.s = _secret.getSecretValue();
        var _json_str = JSON.stringify(_json);
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of the secret object. (Please note: This is 
     * NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.dh.SecretDH}.)
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Get the serialized version of the secret object as parsed JSON. (Please 
     * note: This is NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.dh.SecretDH}.) 
     * @private
     * @returns {object}
     * @name getJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getJSON = function(){
        return JSON.parse(_json_str);
    };
    
    /**
     * Get the local keypair (it's private parts are used for shared secret
     * derivation).
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name getKeypairLocal
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getKeypairLocal = function(){
        return _kp1.clone();
    };
    
    /**
     * Get the public keypair (it's public parts are used to derive the 
     * shared secret with the local keypair).
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name getKeypairPublic
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getKeypairPublic = function(){
        return _kp2.clone();
    };
    
    /**
     * Return the instance of `Secret` representing the derived shared DH 
     * secret of the two keypairs.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name getSecret
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSecret = function(){
        return _secret.clone();
    };
    
    /**
     * Get the serialized value of the `Secret` instance representing the 
     * shared secret. This function is a shorthand for 
     * `(my_secret_dh_inst).getSecret().getSecretValue()`.
     * @returns {string}
     * @name getSecretValue
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSecretValue = function(){
        return _secret.getSecretValue();
    };
    /**
     * Return a clone of this object.
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.clone = function(){
        return new SecretDH(_kp1.getSerialized(), _kp2.getSerialized(), 
                            _secret.getSecretValue());
    };
};
dh.SecretDH = SecretDH;

return dh; });
