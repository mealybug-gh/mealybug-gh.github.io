
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

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.basic.id
 * */
var  id = {};
var _id = {};

_id.create = {};
_id.create.from = {};
_id.create.from.str = function(str, hash, enc, mod){
    var gen_hash = function(str, hash, enc){
        if(typeof str!=='string' || 
           typeof hash!=='string' || 
           typeof enc!=='string'){
            throw new ncrypt.exception.types.basic.id.invalidArgument();
        }
        var encs = [ 'hex', 'base32', 'base64', 'base64url' ];
        if(encs.indexOf(enc)<0){
            throw new ncrypt.exception.types.basic.id.invalidEncoding();
        }
        var h = ncrypt.hash.hash(str, hash, enc);
        return h;
    };
    var mod_len = function(h, mod){
        if(typeof mod!=='number' && typeof mod!=='undefined'){
            throw new ncrypt.exception.types.basic.id.invalidArgument();
        }
        if(typeof mod==='undefined' || mod===0) return h;
        while( (h.length % mod) !== 0){
            h += '0';
        }
        return h;
    };
    var h = SecureExec.sync.apply(gen_hash, [ str, hash, enc ]);
    if(_isExp(h)) return h;
        h = SecureExec.sync.apply(mod_len, [ h, mod ]);
    return h;
};

/**
 * Create an object representing the ID of a string value. An ID is essentially 
 * a hash (which is represented as a string). The hash function and output 
 * encoding are required (only string encodings, i.e. encodings which result
 * in a string, and are not 'utf8', will work).
 * <br />
 * If the hash length should be divisible by a certain number (so it can be
 * split into equal pieces of a certain length), @mod should be specified. 
 * @param {string} val - Original text to get an ID for.
 * @param {string} hash - Hash algorithm, see {@link nCrypt.hash}
 * @param {string} enc - Encoding, see {@link nCrypt.enc}, with the restriction
 * only encodings which result in a string and are not 'utf8' are allowed.
 * @param {number} [mod]
 * @class
 * @name ID
 * @memberof nCrypt.asym.types.basic.id
 * */
var ID = function(val, hash, enc, mod){
    var _ids; var _hash; var _enc; var _mod; var _str;
    
    if(typeof mod==='number' && mod < 0) mod = 0;
    if(typeof val==='string'){
        _ids = _id.create.from.str(val, hash, enc, mod);
        if(_isExp(_ids)) return _ids;
        _hash = hash;
        _enc = enc;
        _str = val;
        if ( typeof mod==='number' ){
            _mod = mod;
        }else{
            _mod = 0;
        }
    }else if(SecureExec.tools.proto.inst.isInstanceOf(val, ID)===true){
        return val.clone();
    }else{
        var e = ncrypt.exception.Create(
                ncrypt.exception.types.basic.id.invalidArgument);
        var exp = new SecureExec.exception.Exception(null, null, e);
        return exp;
    }
    
    /**
     * @name getMod
     * @returns {number}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getMod = function(){
        return (_mod+0);
    };
    /**
     * @name getEnc
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getEnc = function(){
        return _enc+'';
    };
    /**
     * @name getHash
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getHash = function(){
        return _hash+'';
    };
    /**
     * @name getOriginalString
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getOriginalString = function(){
        return _str+'';
    };
    /**
     * @name getIdValue
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getIdValue = function(){
        return _ids+'';
    };
    /**
     * @name getIdSplit
     * @returns {string[]}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getIdSplit = function(){
        var mod = _mod+0;
        if(mod===0) return _ids+'';
        var str = _ids+'';
        var res = [];
        while(str.length > 0){
            var r = str.slice(0, mod);
            str = str.replace(r, '');
            res.push(r);
        }
        return res;
    };
    /**
     * @name clone
     * @returns {nCrypt.asym.types.basic.id.ID}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.clone = function(){
        return new ID(_str, _hash, _enc, _mod);
    };
};
id.ID = ID;

return id; });
