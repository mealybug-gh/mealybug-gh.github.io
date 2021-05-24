
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

module.exports = (function(ncrypt){
/**
 * @namespace nCrypt.hash
 * */
/* public */
var hash = {};
/* private */
var _hash = {};

_hash.available = [ "md5", "sha1", "ripemd160", "sha256", "sha512" ];

_hash.hashes = { "md5": "md5", "sha1": "sha1", "ripemd160": "ripemd160", 
                 "sha256": "sha256", "sha512": "sha512" };

/**
 * Returns an array of strings representing the available hash functions, 
 * such as "sha256".
 * @name getAvailable
 * @memberof nCrypt.hash
 * @member
 * @returns {string[]}
 * */
hash.getAvailable = function(){
    return JSON.parse(JSON.stringify(_hash.available));
};

/**
 * Hash an @data string using @algorithm as a hash algorithm and @enc as
 * encoding. ({@link nCrypt.enc} encodings work except of "utf8".)
 * @param {string} @data - Data to hash
 * @param {string} @algorithm - Algorithm to use for hashing
 * @param {string} @enc - Encoding of the resulting hash
 * @returns {string|number[]|SecureExec.exception.Exception} - The hash as a 
 * string, or a byte array, depending on @enc.
 * @name hash
 * @memberof nCrypt.hash
 * */
hash.hash = function(data, algorithm, enc){
    var fn = _hash.hash.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, algorithm, enc]);
};
_hash.hash = {};
_hash.hash.run = function(data, algorithm, enc){
    var applyHash = function(data, algorithm, enc){
        var hash_alg = _hash.hashes[algorithm];
        if( (typeof hash_alg).toLowerCase() == "undefined" ){
            throw new ncrypt.exception.hash.invalidAlgorithm(
                "Invalid Algorithm: "+algorithm+": Not a supported algorithm.");
            return null;
        }
        
        var hash_val = null;
        if( (typeof ncrypt.dep.sjcl.hash[hash_alg]).toLowerCase() 
                !== "undefined" ){
            hash_val = ncrypt.dep.sjcl.hash[hash_alg].hash(data);
        }else{
            if(hash_alg=="md5"){
                hash_val = ncrypt.dep.SparkMD5.hash(data, true);
            }else{
                throw new ncrypt.exception.hash.invalidAlgorithm(
                    "Invalid Algorithm: "+
                    algorithm+
                    ": Not a supported algorithm! - Not implemented?");
            }
        }
        
        if( (typeof enc).toLowerCase()==="undefined" || enc==null 
                || enc==="none" ){
            return hash_val;
        }else{
            if((typeof ncrypt.enc.getEncodings()[enc]).toLowerCase() 
                    === "undefined" || enc==="utf8" ){
                throw new ncrypt.exception.enc.invalidEncoding(
                "Invalid Encoding: "+enc+": No such encoding.");
            }
            hash_val = ncrypt.enc.fromBits(hash_val, enc);
            return hash_val;
        }
    };
    var hasher = function(data, algorithm, enc){
        var hash_val;
        try{
            hash_val = applyHash(data, algorithm, enc);
        }catch(e1){
            try{
                hash_val = applyHash(data, algorithm, enc);
            }catch(e2){
                try{
                    hash_val = applyHash(data, algorithm, enc);
                }catch(e3){
                    hash_val = applyHash(data, algorithm, enc);
                }
            }
        }
        return hash_val;
    };
    var compare_hashed = function(h1, h2){
        var hash1, hash2;
        if(typeof h1==="string" && typeof h2==="string"){
            hash1 = h1+"";
            hash2 = h2+"";
        }else if( (Array.isArray(h1)&&Array.isArray(h2)) &&
                  (typeof h1[0]==="number" && typeof h2==="number") ){
            hash1 = h1.join(",");
            hash2 = h2.join(",");
        }else{
        }
        if(hash1===hash2) return true;
        return false;
    };
    if( (typeof enc).toLowerCase()=="string" && enc!="none"){
        var hash_val1 = hasher(data, algorithm, enc);
        var hash_val2 = hasher(data, algorithm, enc);
        if(compare_hashed(hash_val1,hash_val2)===true){
            return hash_val1;
        }else{
            hash_val1 = hasher(data, algorithm, enc);
            hash_val2 = hasher(data, algorithm, enc);
            if(compare_hashed(hash_val1,hash_val2)===true){
                return hash_val1;
            }else{
                return null;
            }
        }
    }else{
        var hash_val1 = hasher(data, algorithm, enc);
        var hash_val2 = hasher(data, algorithm, enc);
        var equal = true;
        var len = hash_val1.length; var i=0;
        for(i=0; i<len; i++){
            if(hash_val1[i]!==hash_val2[i]) equal = false;
        }
        if(equal){
            return hash_val1;
        }else{
            hash_val1 = hasher(data, algorithm, enc);
            hash_val2 = hasher(data, algorithm, enc);
            equal = true;
            len = hash_val1.length; i=0;
            for(i=0; i<len; i++){
                if(hash_val1[i]!==hash_val2[i]) equal = false;
            }
            if(equal){
                return hash_val1;
            }else{
                return null;
            }
        }
    }
};

return hash; });
