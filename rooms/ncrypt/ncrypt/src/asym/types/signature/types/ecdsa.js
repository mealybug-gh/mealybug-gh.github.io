
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
 * @namespace nCrypt.asym.types.signature.ecdsa
 * */
var  ecdsa = {};
var _ecdsa = {};

_ecdsa.sig = {};
_ecdsa.sig.sign = function(cleartext, keypair){
    var runf = function(ctxt, kp){
        var hmsg = ncrypt.hash.hash(ctxt, "sha256", "bytes");
        var s; 
        try { 
            s = kp.getEllipticKeypair().sign(hmsg); // 'elliptic' 'Signature' }
            s = _ecdsa.serialize.serialize(s); // 'base64url' like string
        }catch(e){
            throw new ncrypt.exception.types.signature.ecdsa.signingFailed();
        }
        return s;
    };
    return SecureExec.sync.apply(runf, [cleartext, keypair]);
};
_ecdsa.sig.verify = function(cleartext, keypair, s){
    var runf = function(ctxt, kp, s){
        var hmsg = ncrypt.hash.hash(ctxt, "sha256", "bytes");
            s = _ecdsa.serialize.deserialize(s);
        var ver = false;
        try{
            var tver = kp.getEllipticKeypair().verify(hmsg, s);
            if(typeof tver==="boolean" && tver===true) ver = true;
        }catch(e){ }
        return ver;
    };
    return SecureExec.sync.apply(runf, [cleartext, keypair, s]);
};

_ecdsa.serialize = {};
_ecdsa.serialize.serialize = function(s){
    var runf = function(s){
        if(typeof s==="object" && !Array.isArray(s) && 
           typeof s.toDER==="function"){
            try { s = s.toDER(); }catch(e){
                throw new 
                ncrypt.exception.types.signature.ecdsa.
                signatureSerializeFailed();
            }
        }
        if(!Array.isArray(s)){
            throw new 
                ncrypt.exception.types.signature.ecdsa.
                signatureSerializeFailed();
        }
        s = ncrypt.enc.transform(s, "bytes", "base64url");
        if(typeof s==="string" && s.length>0) return s;
        if(_isExp(s)) return s;
        throw new ncrypt.exception.types.signature.ecdsa.
        signatureSerializeFailed();
    };
    return SecureExec.sync.apply(runf, [s]);
};
_ecdsa.serialize.deserialize = function(s){
    var runf = function(s){
        s = ncrypt.enc.transform(s, "base64url", "bytes");
        if(_isExp(s)) return s;
        if(Array.isArray(s) && s.length>0) return s;
        throw new 
            ncrypt.exception.types.signature.ecdsa.signatureDeserializeFailed();
    };
    return SecureExec.sync.apply(runf, [s]);
};

/**
 * Create a signature object. This can be used to sign a message (by passing
 * the message and signer's keypair), or to verify a signature (by passing
 * the message, the signer's - usually public only - keypair, and the signature
 * string).
 * @param {string} cleartext - The message to sign or to verify a signature for.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} keypair - For signing: 
 * The signer's keypair. For verification: The signer's/ sender's keypair, a 
 * public key is enough here.
 * @param {string} [sig] - For verification: The signature, as a string. Can be
 * derived after signing like my_signature_obj.getSignature(). For signing, 
 * pass nothing here.
 * @class
 * @name Signature
 * @memberof nCrypt.asym.types.signature.ecdsa
 * */
var Signature = function(cleartext, keypair, sig){
    var _kp; var _cleartext; var _sig; var _sig_bytes; var _ver;
    
    var check_args = function(cleartext, keypair, sig){
        if(typeof cleartext!=="string"){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument();
        }
        var kp = new tkeypair.Keypair(keypair);
        if(_isExp(kp)) return kp;
        if(kp.getType()==='mont'){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument(
                "The keypair passed is a 'mont'-type one. Signing doesn't "+
                "work with Montgomery type curves!");
        }
        if(typeof sig!=="string" && typeof sig!=="undefined"){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument();
        }
        return { "kp": kp, "cleartext": cleartext, "sig": sig };
    };
    
    var args_valid = SecureExec.sync.apply(check_args, 
                     [cleartext, keypair, sig]); 
    if(_isExp(args_valid)) return args_valid;
    
    _kp = args_valid.kp;
    _cleartext = args_valid.cleartext;
    var sigstr = args_valid.sig;
    if(typeof sigstr==="string"){
        _sig = _ecdsa.serialize.deserialize(sigstr);
        if(_isExp(_sig)) return _sig;
        _sig_bytes = _sig;
        _sig = _ecdsa.serialize.serialize(_sig);
        if(_isExp(_sig)) return _sig;
        _ver = _ecdsa.sig.verify(_cleartext, _kp, _sig);
        if(_isExp(_ver)) return _ver;
    }else{
        _sig = _ecdsa.sig.sign(_cleartext, _kp);
        if(_isExp(_sig)) return _sig;
        _sig_bytes = _ecdsa.serialize.deserialize(_sig);
        if(_isExp(_sig_bytes)) return _sig_bytes;
        _ver = true;
    }
    
    /**
     * Get the string representation of a signature. (This is passed along with
     * the message and passed to the constructor as the signature argument.)
     * @returns {string}
     * @name getSignature
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getSignature = function(){
        return _sig+"";
    };
    /**
     * Get an array representation of the signature.
     * @name getSignatureBytes
     * @returns {int[]}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getSignatureBytes = function(){
        return _sig_bytes.slice(0);
    };
    /**
     * Check whether the signature was verified. If this object was generated
     * signing, the result will always be true. For verification, it will be 
     * true if the signature passed was verified and false if not.
     * @name getVerified
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getVerified = function(){
        return (_ver===true);
    };
    /**
     * Get the keypair this signature was generated or verified using.
     * @name getKeypair
     * @returns {}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getKeypair = function(){
        return _kp.clone();
    };
    /**
     * Get the message cleartext signed / the message cleartext a given 
     * signature was verified for.
     * @name getCleartext
     * @returns {}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getCleartext = function(){
        return _cleartext+"";
    };
};
ecdsa.Signature = Signature;

return ecdsa; });
