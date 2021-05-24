
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

module.exports = (function(ncrypt, dep){

/**
 * @namespace nCrypt.asym.simple.signature
 * */
var  signature = {};
var _signature = {};
    
var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var tsign = dep.types.signature.ecdsa; // tsign.Signature
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * Sign a message using your local keyset. Returns the signature string to 
 * send along with the message to a receiver can verify the message was signed
 * using your keyset.
 * @param {string} cleartext - Cleartext to sign.
 * @param {string} local_keyset - Keyset to use for signing.
 * @param {string} local_keyset_pass - Password for @local_keyset
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name sign
 * @memberof nCrypt.asym.simple.signature
 * */
signature.sign = function(cleartext, local_keyset, local_keyset_pass){
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasSigningKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.signature.missingSigningKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var local_keypair = local_keyset.getKeypairSigning();
    
    var sig = new tsign.Signature(cleartext, local_keypair);
    if(_isExp(sig)) return sig;
    sig = sig.getSignature();
    return sig;
};

/**
 * Verify a signed message, using the message cleartext, the sender's public
 * keyset and the signature.
 * @param {string} cleartext
 * @param {string} public_keyset
 * @param {string} sig
 * @returns {boolean|SecureExec.exception.Exception}
 * @function
 * @name verify
 * @memberof nCrypt.asym.simple.signature
 * */
signature.verify = function(cleartext, public_keyset, sig){
    if(typeof sig!=='string' || sig.length<1){
        var e = ncrypt.exception.Create(
            nCrypt.exception.asym.simple.signature.signatureNotAString);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasSigningKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.signature.missingSigningKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairSigning();
    
    var sig_ver = new tsign.Signature(cleartext, public_keypair, sig);
    if(_isExp(sig_ver)) return sig_ver;
    
    return sig_ver.getVerified();
};

return signature });
