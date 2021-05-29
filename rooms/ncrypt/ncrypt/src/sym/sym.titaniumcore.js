
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

/*
 * Abstracts titaniumcore functionality. 
 * */
module.exports = (function(ncrypt){

/* public */
var block = {};
var _block = {};

var sjcl = ncrypt.dep.sjcl;
var titaniumcore = ncrypt.dep.titaniumcore;

_block.available= {
    algorithm:  {
        "SERPENT": "SERPENT", "TWOFISH": "TWOFISH", "RIJNDAEL": "RIJNDAEL"
    },
    blockmode: {
        "ECB": "ECB", "CBC": "CBC"
    },
    paddings: {
        "PKCS7": "PKCS7", "RFC1321": "RFC1321", "ANSIX923": "ANSIX923", "ISO10126": "ISO10126", "NO_PADDING": "NO_PADDING"
    },
    defaults: {
        "ks": 256,
        "iter": 1000,
        "mode": "cbc"
    }
};
block.encrypt = function(algorithm, data, pass, opts){
    
    if( (typeof opts).toLowerCase()==="undefined" ){
        opts = _block.available.defaults;
    }else{
        opts = opts;
    }
    
    var algorithm_upper = algorithm.toUpperCase();
    
    var ks = opts.ks;
    var iter = opts.iter;
    var mode = opts.mode.toUpperCase();
    var salt = sjcl.random.randomWords(2,10); 
    var tmp = sjcl.misc.cachedPbkdf2(pass, {"iter": iter, "salt": salt});
    var key = tmp.key.slice(0, ks/32);
        salt = tmp.salt;
    var b64key = sjcl.codec.base64.fromBits(key);
    var b64Salt = sjcl.codec.base64url.fromBits(salt);
    
    var algorithm = _block.available.algorithm[algorithm_upper];
    var mode = _block.available.blockmode[mode];
    var padding = _block.available.paddings["PKCS7"];
    var direction = "ENCRYPT";
    var cipher = titaniumcore.Cipher.create(algorithm, direction, mode, padding);
    
    var cleartext = titaniumcore.binary.str2utf8(data);
    key = titaniumcore.binary.base64_decode( _block.helpers.pack(b64key) );
    var ciphertext = cipher.execute( key.concat(), cleartext.concat() );
    var result = titaniumcore.binary.base64_encode( ciphertext );
        result = ncrypt.enc.transform(result, "base64", "base64url");
    
    var signature = _block.hmac.sign(b64key, result);

    signature = ncrypt.enc.transform(signature, "base64", "base64url");
    result = {"cipher": algorithm.toLowerCase(), 
              "salt": b64Salt, "iter": iter, "ks": ks, 
              "ct": result, "sig": signature, "mode": mode.toLowerCase() };
    result = JSON.stringify(result);
    
    return result;
};

block.decrypt = function(data, pass){
    
    /*
     * titaniumcore offers CBC mode for encryption. To use this mode securely,
     * each message needs
     * a) a new, random, unpredictable iv (titaniumcore generates them)
     * b) the resulting iv and ciphertext must be authenticated with HMAC
     * Good explanation on CBC / HMAC : https://defuse.ca/cbcmodeiv.htm
     * (It IS important to use encrypt than MAC, not the other way round.)
     * */
    
    data = JSON.parse(data);
    
    var algorithm = data.cipher;
    var algorithm_upper = algorithm.toUpperCase();
    
    var b64Salt = data.salt;
    var salt = sjcl.codec.base64url.toBits(b64Salt);
    var iter = data.iter;
    var ks = data.ks;
    var m = data.mode;
    var ciphertext = data.ct;
    
    var tmp = sjcl.misc.cachedPbkdf2(pass, {"iter": iter, "salt": salt});
    var key = tmp.key.slice(0, ks/32);
    var b64key = sjcl.codec.base64.fromBits(key);
    
    var algorithm = _block.available.algorithm[algorithm_upper];
    var mode = _block.available.blockmode[m.toUpperCase()];
    var padding = _block.available.paddings["PKCS7"];
    var direction = "DECRYPT";
    var cipher = titaniumcore.Cipher.create(algorithm, direction, mode, padding);
    
    var signature = _block.hmac.sign(b64key, ciphertext);
    var sig = ncrypt.enc.transform(data.sig, "base64url", "base64");
    if(signature!=sig){
        throw new ncrypt.exception.sym.decryptError(
        "Error while decrypting (Algorithm: "+algorithm+
        "). Suspected reason: Wrong password, or malformed message.");
    }
    ciphertext = ncrypt.enc.transform(ciphertext, "base64url", "base64");
    
    ciphertext = titaniumcore.binary.base64_decode(ciphertext);
    
    key = titaniumcore.binary.base64_decode( _block.helpers.pack( b64key ) );
    var cleartext = cipher.execute( key.concat(), ciphertext.concat() );
    var result = titaniumcore.binary.utf82str( cleartext );
    return result;
};

_block.hmac = {};
_block.hmac.sign = function(key, str){
    var hmac_key = ncrypt.hash.hash(key, "sha512", "hex");
    hmac_key = ncrypt.hash.hash(hmac_key, "sha256", "none");
    str = ncrypt.hash.hash(str, "sha256", "hex");
    var hmac = new sjcl.misc.hmac(hmac_key, sjcl.hash.sha256);
    var signature = hmac.encrypt(str);
    signature = sjcl.codec.base64.fromBits(signature);
    return signature;
};

_block.helpers = {};
_block.helpers.pack = function(s) {
    var result = "";
    for ( var i=0; i<s.length; i++ ) {
        var c = s.charAt( i );
        if ( c==" " || c=="\t" || c=="\r" || c=="\n" ) {
        } else {
            result += c;
        }
    }
    return result;
};

return block;

});
