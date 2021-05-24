
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

module.exports = (function(ncrypt) {
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

var sym = {};
var _sym = {};

var sjcl = ncrypt.dep.sjcl;

/* ########################################################################## */
/* #---sym.rand-------------------------------------------------------------# */
/* ########################################################################## */

sym.rand = {};
_sym.rand = {};
_sym.rand.words = {};
sym.rand.words = {};

sym.rand.words.gen = function(n){
    var words = sjcl.random.randomWords(n,10); 
    return words;
};

/* ########################################################################## */
/* #---sym.aes--------------------------------------------------------------# */
/* ########################################################################## */

sym.aes = {};
_sym.aes = {};

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +---sym.aes.rand---------------------------------------------------------+ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

_sym.aes.rand = {};

_sym.aes.rand.salt = function(){
    var salt = sym.rand.words.gen(2);
    return salt;
};
_sym.aes.rand.iv = function(){
    var iv = sym.rand.words.gen(4);
    return iv;
};

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +---sym.aes.rand---------------------------------------------------------+ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

sym.aes.exec = {};
sym.aes.exec.encrypt = function(data, pass, options){
    if(typeof options==="undefined" || 
       (typeof options==='object' && options===null) ){
        options = {};
    }
    var opts = JSON.parse(JSON.stringify(options));
    opts.salt = _sym.aes.rand.salt();
    opts.iv = _sym.aes.rand.iv();
    var enc = sjcl.encrypt(pass, data, opts);
    if(typeof enc!=='string'){
        throw new ncrypt.exception.sym.decryptError(
                "Error while decrypting checking (AES) encryption output: "+
                "Bug or browser incompatibility or invalid input.");
    }
    var dec = null;
    try{
        dec = sjcl.decrypt(pass, enc);
    }catch(e){
        dec = null;
    }
    if(typeof dec!=='string' || dec!==data){
        enc = sjcl.encrypt(pass, data, opts);
        dec = sjcl.decrypt(pass, enc);
        if(typeof dec!=='string' || dec!==data){
            enc = sjcl.encrypt(pass, data, opts);
            dec = sjcl.decrypt(pass, enc);
            if(typeof dec!=='string' || dec!==data){
                throw new ncrypt.exception.sym.decryptError(
                "Error while decrypting checking (AES) encryption output: "+
                "Bug or browser incompatibility or invalid input.");
            }
        }
    }
    enc = JSON.parse(enc);
    enc.salt = ncrypt.enc.transform(enc.salt, "base64", "base64url");
    enc.iv = ncrypt.enc.transform(enc.iv, "base64", "base64url");
    enc.ct = ncrypt.enc.transform(enc.ct, "base64", "base64url");
    enc = JSON.stringify(enc);
    return enc;
};
sym.aes.exec.decrypt = function(data, pass){
    data = JSON.parse(data);
    data.salt = ncrypt.enc.transform(data.salt, "base64url", "base64");
    data.iv = ncrypt.enc.transform(data.iv, "base64url", "base64");
    data.ct = ncrypt.enc.transform(data.ct, "base64url", "base64");
    data = JSON.stringify(data);
    var dec;
    try{
        dec = sjcl.decrypt(pass, data);
    }catch(e1){
        try{
            dec = sjcl.decrypt(pass, data);
        }catch(e2){
            try{
                dec = sjcl.decrypt(pass, data);
            }catch(e3){
                try{
                    dec = sjcl.decrypt(pass, data);
                }catch(e4){
                    throw new ncrypt.exception.sym.decryptError(
                    "Error while decrypting (Algorithm: AES). "+
                    "Suspected reason: Wrong password.");
                }
            }
        }
    }
    if(dec.length<data.length){
        try{
            dec = sjcl.decrypt(pass, data);
        }catch(e1){
            try{
                dec = sjcl.decrypt(pass, data);
            }catch(e2){
                try{
                    dec = sjcl.decrypt(pass, data);
                }catch(e3){
                    dec = sjcl.decrypt(pass, data);
                }
            }
        }
    }
    return dec;
};

return sym;

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
});
