
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
 * @namespace nCrypt.asym.simple.secret
 * */
var  secret = {};
var _secret = {};

var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var tsecret = dep.types.basic.secret;
var tdh = dep.types.shared.dh;
var tecies = dep.types.shared.ecies;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.simple.secret.dh
 * */
 secret.dh = {};
_secret.dh = {};

/**
 * Derive a shared secret for two keysets (these keysets need to support 
 * encryption, i.e. not be signing-only keysets).
 * <br />
 * Please note: DH shared secret derivation only works if both local and public
 * key are on the same curve. I.e., public keyset and local keyset must use
 * the same curve for encryption purposes.
 * <br />
 * This function returns the shared secret as a string. (The shared secret is a
 * serialized instance of {@link nCrypt.asym.types.basic.secret.Secret}.)
 * @param {string} public_keyset 
 * @param {string} local_keyset
 * @param {string} local_keyset_pass - Password to decrypt @local_keyset's 
 * private parts.
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name derive
 * @memberof nCrypt.asym.simple.secret.dh
 * */
secret.dh.derive = function(public_keyset, local_keyset, local_keyset_pass){

    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairEncryption();

    var local_keypair = local_keyset.getKeypairEncryption();
    
    var sec = new tdh.SecretDH(local_keypair, public_keypair);
    if(_isExp(sec)) return sec;
    /*try{ sec = sec.getSerialized(); sec = JSON.parse(sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }*/
    try{ sec = sec.getSecretValue(); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    return sec;
};

/**
 * @namespace nCrypt.asym.simple.secret.ecies
 * */
secret.ecies = {};

/**
 * Derive a shared secret for a public keyset. The result will be a **shared 
 * secret** as well as a **tag**. 
 * <br />
 * The *shared secret* can be used to encrypt a message etc.
 * <br /> 
 * The *tag* needs to be sent to the receiver / owner of the public keyset.
 * Using the tag and their local keyset (private parts), they are able to 
 * recover the shared secret. 
 * <br />
 * The shared secret itself is never sent anywhere!
 * The owner of the private keyset parts belonging to the public keyset will
 * recover it using the tag, so only the receiver will be able to decrypt the
 * message.
 * <br />
 * This function returns a simple JSON object, 
 * like { 'tag': [object] tag_as_simple_json, 'sec': [string] secret }. The 
 * tag can be stringified (`JSON.stringify`) and sent along with a message to
 * the receiver.
 * @param {string} public_keyset
 * @returns {object|SecureExec.exception.Exception}
 * @name derive
 * @function
 * @memberof nCrypt.asym.simple.secret.ecies
 * */
secret.ecies.derive = function(public_keyset){
    
    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairEncryption();
    
    var ecies_sec = new tecies.SecretECIES(public_keypair);
    if(_isExp(ecies_sec)) return ecies_sec;
    /*try{ ecies_sec = ecies_sec.getSerialized(); 
         ecies_sec = JSON.parse(ecies_sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    return ecies_sec;*/
    var tag = JSON.parse(ecies_sec.getTag().getSerialized());
    var sec = ecies_sec.getSecretValue();
    var res = { 'tag': tag, 'sec': sec };
    return res;
};

/**
 * To recover a shared secret from a tag with ECIES like key derivation, pass
 * the tag received and your local keyset.
 * <br />
 * This function returns the shared secret as a string. (The shared secret is a
 * serialized instance of {@link nCrypt.asym.types.basic.secret.Secret}.)
 * @param {string} tag
 * @param {string} local_keyset
 * @param {string} local_keyset_pass
 * @returns {string|SecureExec.exception.Exception}
 * @name restore
 * @function
 * @memberof nCrypt.asym.simple.secret.ecies
 * */
secret.ecies.restore = function(tag, local_keyset, local_keyset_pass){
    
    if(typeof tag!=='string' || tag.length<1){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.eciesTagIsNotAString);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var local_keypair = local_keyset.getKeypairEncryption();
    
    var ecies_sec = new tecies.SecretECIES(local_keypair, tag);
    if(_isExp(ecies_sec)) return ecies_sec;
    /*try{ ecies_sec = ecies_sec.getSerialized(); 
         ecies_sec = JSON.parse(ecies_sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }*/
    return ecies_sec.getSecretValue();
};

return secret; });
