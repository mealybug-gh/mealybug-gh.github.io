
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
 * @namespace nCrypt.enc
 * */
var encoding = {};
var _encoding = {};

_encoding.available = 
        [ "hex", "base64", "base64url", "base32", "utf8", "bytes" ];

/**
 * Available encodings in `nCrypt.enc`. All of these are string encodings 
 * except of 'bytes', which results in a byte array.
 * @name getAvailable
 * @memberof nCrypt.enc
 * @function
 * @returns {string[]}
 * */
encoding.getAvailable = function(){
    return JSON.parse(JSON.stringify(_encoding.available));
};

_encoding.encodings = {
    "bytes": {
        "enc": "bytes",
        "sjcl":  "bytes"
    },
    "hex": {
        "enc": "hex",
        "sjcl":  "hex"
    },
    "base64": {
        "enc": "base64",
        "sjcl":  "base64"
    },
    "base64url": {
        "enc": "base64url",
        "sjcl":  "base64url"
    },
    "base32": {
        "enc": "base32",
        "sjcl":  "base32"
    },
    "utf8": {
        "enc": "utf8",
        "sjcl":  "utf8String"
    }
};

/*
 * `nCrypt` supported data encodings. All encodings except of 'bytes' 
 * are string encodings, while 'bytes' means a byte array.
 * @name getEncodings
 * @memberof nCrypt.enc
 * @function
 * @private
 * */
encoding.getEncodings = function(){
    return JSON.parse(JSON.stringify(_encoding.encodings));
};

/**
 * Change the encoding of some data (string, byte array, or raw bit array).
 * <br />
 * (Using `null` instead of an encoding refers to a raw bit array like SJCL uses
 * internally.)
 * @name transform
 * @memberof nCrypt.enc
 * @function
 * @param {string|number[]} data - Data to transform encoding of.
 * @param {string} curEnc - Encoding of @data, `null` if @data is a raw bit 
 * array.
 * @param {string} newEnc - Result encoding, `null` to receive a raw bit array.
 * @returns {string|number[]|SecureExec.exception.Exception}
 * */
encoding.transform = function(data, curEnc, newEnc){
    var fn = _encoding.transform.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, curEnc, newEnc]);
};
_encoding.transform = {};
_encoding.transform.run = function(data, curEnc, newEnc){
    var doTransform = function(data, curEnc, newEnc){
        var bitArray = null;
        if(curEnc != null ){
            bitArray = encoding.toBits(data, curEnc);
        }else{
            bitArray = data;
        }
        var encoded = null;
        if(newEnc != null){
            encoded = encoding.fromBits(bitArray, newEnc);
        }else{
            encoded = bitArray;
        }
        return encoded;
    };
    var compare_results = function(t1, t2){
        if( (typeof t1)==="string" && (typeof t2)==="string" ){
            return (t1===t2);
        }else{
            return (t1.join(",")===t2.join(","));
        }
    };
    var _t1; var _t2;
    _t1 = doTransform(data, curEnc, newEnc);
    _t2 = doTransform(data, curEnc, newEnc);
    if( !(compare_results(_t1,_t2)) ){
        _t1 = doTransform(data, curEnc, newEnc);
        _t2 = doTransform(data, curEnc, newEnc);
        if( !(compare_results(_t1,_t2)) ){
            _t1 = doTransform(data, curEnc, newEnc);
            _t2 = doTransform(data, curEnc, newEnc);
            if( !(compare_results(_t1,_t2)) ){
                throw new ncrypt.exception.enc.transformFailed();
            }
        }
    }
    return _t1;
};

/**
 * Transforms a bit array to a string or byte array (if encoding is 'bytes') 
 * of a certain encoding. 
 * @private
 * @name fromBits
 * @memberof nCrypt.enc
 * @function
 * @param {number[]} data  - bitArray to transform to a string.
 * @param {string} enc - encoding of @data.
 * @returns {string|number[]|SecureExec.exception.Exception}
 * */
encoding.fromBits = function(data, enc){
    var fn = _encoding.fromBits.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, enc]);
};
_encoding.fromBits = {};
_encoding.fromBits.run = function(data, enc){
    enc = enc.toLowerCase();
    if((typeof _encoding.encodings[enc]).toLowerCase() == "undefined" ){
        throw new ncrypt.exception.enc.invalidEncoding(
                        "Invalid Encoding: "+enc+": No such encoding.");
    }
    if((typeof _encoding.encodings[enc].enc).toLowerCase() != "string"){
        throw new ncrypt.exception.enc.invalidEncoding();
    }
    var f = ncrypt.dep.sjcl.codec[_encoding.encodings[enc].sjcl];
    var encoded;
    try{
        encoded = f.fromBits(data);
    }catch(e){
        try{
            encoded = f.fromBits(data);
        }catch(e){
            try{
                encoded = f.fromBits(data);
            }catch(e){
                try{
                    encoded = f.fromBits(data);
                }catch(e){
                    try{
                    }catch(e){
                        //encoded = null;
                    }
                }
            }
        }
    }
    return encoded;
};

/**
 * Transforms a string of a certain encoding to a bit array. 
 * @private
 * @name toBits
 * @memberof nCrypt.enc
 * @function
 * @param {string|byte[]} data  - string to transform to a bitArray.
 * @param {String} enc  -  encoding of @data.
 * @returns  {number[]|SecureExec.exception.Exception} Bit array encoded data.
 * */
encoding.toBits = function(data, enc){
    var fn = _encoding.toBits.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, enc]);
};
_encoding.toBits = {};
_encoding.toBits.run = function(data, enc){
    enc = enc.toLowerCase();
    if((typeof _encoding.encodings[enc]).toLowerCase() == "undefined" ){
        throw new ncrypt.exception.enc.invalidEncoding(
                    "Invalid Encoding: "+enc+": No such encoding.");
    }
    if((typeof _encoding.encodings[enc].enc).toLowerCase() != "string"){
        throw new ncrypt.exception.enc.invalidEncoding();
    }
    var f = ncrypt.dep.sjcl.codec[_encoding.encodings[enc].sjcl];
    //console.log(data);
    var decoded;
    try{
        decoded = f.toBits(data);
    }catch(e){
        //console.log(e);
        try{
            decoded = f.toBits(data);
        }catch(e){
            try{
                decoded = f.toBits(data);
            }catch(e){
                try{
                    decoded = f.toBits(data);
                }catch(e){
                    try{
                    }catch(e){
                        decoded;
                    }
                }
            }
        }
    }
    return decoded;
};

return encoding; });
