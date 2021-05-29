
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
var bnjs = ncrypt.dep.bnjs;

/**
 * @namespace nCrypt.asym.types.basic.bn
 * */
var  bn= {};
var _bn = {};

_bn.create = {};
_bn.create.bnObject = function(bn, base){
    var bnf = bnjs.BN;
    var runf = function(bn, base){
        if(typeof base==="undefined"){
            return new bnf(bn);
        }else{
            return new bnf(bn, base);
        }
    };
    return SecureExec.sync.apply(runf, [bn, base]);
};

_bn.validate = {};
_bn.validate.isBnObject = function(obj){
    var check = function(obj){
        if(typeof obj!=="object" || obj===null) return false;
        if(typeof obj.words==="undefined" || Array.isArray(obj.words)!==true){
            return false;
        }
        try{
            var str1 = obj.toString(32);
            var str2 = new bnjs.BN(obj, 32).toString(32);
            if((typeof str1==="string" && typeof str2==="string") &&
               (str1.length>0 && str2.length>0) &&
               (str1===str2)){
                return true;
            }
        }catch(e){ return false; }
    };
    try{ return check(obj); }catch(e){ return false; }
};

_bn.serialize = {};
_bn.serialize.serialize = function(bn_obj){
    var check_is_bn = function(bn_obj){
        return _bn.validate.isBnObject(bn_obj);
    };
    var to_string = function(bn_obj){
        var str = bn_obj.toString(32);
        return str;
    };
    var run_bn_check = function(bn_obj){
        if(check_is_bn(bn_obj)!==true){
            throw new ncrypt.exception.types.basic.bn.noBigNumberObject();
        }
        return true;
    };
    var bn_valid = SecureExec.sync.apply(run_bn_check, [bn_obj]);
    if(ncrypt.dep.SecureExec.tools.proto.inst.isException(bn_valid)){
        return bn_valid;
    }
    var str = SecureExec.sync.apply(to_string, [bn_obj]);
    return str;
};
_bn.serialize.deserialize = function(bn_str){
    var check_str = function(bn_str){
        if(typeof bn_str!=="string" || bn_str.length<1){
            throw new nCrypt.exception.types.basic.bn.noBigNumberString();
        }
        return true;
    };
    var str_valid = SecureExec.sync.apply(check_str, [bn_str]);
    if(typeof str_valid!=="boolean" || str_valid!==true) return str_valid;
    
    var to_bn = function(str){
        var bn_obj = _bn.create.bnObject(str, 32);
        return bn_obj;
    };
    var bn_obj = SecureExec.sync.apply(to_bn, [bn_str]);
    if(ncrypt.dep.SecureExec.tools.proto.inst.isException(bn_obj)){
        bn_obj = ncrypt.exception.Create(
                    ncrypt.exception.types.basic.bn.noBigNumberString);
    }
    return bn_obj;
};

/**
 * Create an instance of {@link nCrypt.asym.types.basic.bn.BigNumber}. 
 * This function either creates a `BigNumber` object from an instance of 
 * `nCrypt.dep.bnjs.BN`, from a string representing an instance of `bnjs.BN`, 
 * from an instance of `BigNumber`, or from parameters for `bnjs.BN`.
 * @param {object|string|number} bn - If @base is not passed, @bn must either
 * be an instance of `bnjs.BN`, or an instance of this class, or a string 
 * representing an instance of `nCrypt.dep.bnjs.BN`. If @base is passed, @bn 
 * must either be a string or number to create an instance of `bnjs.BN` as 
 * in `nCrypt.dep.bnjs.BN(@bn, @base)`.
 * @param {number} [base] - If @bn is a string or number to create a new 
 * instance of `nCrypt.dep.bnjs.BN` from, this is the @base to use for the 
 * resulting number. For example, @base is 10 for decimal numbers or 16 for 
 * hexadecimal.
 * @class
 * @name BigNumber
 * @memberof nCrypt.asym.types.basic.bn
 * */
var BigNumber = function(bn, base){
    var _bn_str = {};
    var _bn_obj = {};
    /* Get _bn_str and _bn_obj if @bn is an instance of this class */
    
    var isBnInst = SecureExec.tools.proto.inst.isInstanceOf(bn, BigNumber);
    if(isBnInst===true){
        //if(bn instanceof BigNumber){
        _bn_obj = bn.getDeserialized();
        _bn_str = bn.getSerialized();
    }
    /* Get _bn_str and _bn_obj if @bn is a BN representation */
    else if(typeof base==="undefined" && !isBnInst){
        if(typeof bn==="string"){
            _bn_obj = _bn.serialize.deserialize(bn);
            if(SecureExec.tools.proto.inst.isException(_bn_obj)){
                return _bn_obj;
            }
            _bn_str = bn;
        }else if(typeof bn==="object"){
            _bn_str = _bn.serialize.serialize(bn);
            if(SecureExec.tools.proto.inst.isException(_bn_str)){
                return _bn_str;
            }
            _bn_obj = bn;
        }else{
            var err = ncrypt.exception.Create(
                            ncrypt.exception.types.basic.bn.invalidArgument);
            var exp = new SecureExec.exception.Exception(null, null, err);
            return exp;
        }
    }
    /* Get _bn_str and _bn_obj if @bn is an argument to create a bnjs.BN from */
    else{
        _bn_obj = _bn.create.bnObject(bn, base);
        if(SecureExec.tools.proto.inst.isException(_bn_obj)){
            return _bn_obj;
        }
        _bn_str = _bn.serialize.serialize(_bn_obj);
        if(SecureExec.tools.proto.inst.isException(_bn_str)){
            return _bn_str;
        }
    }
    
    /**
     * Get the serialized representation of the instance of nCrypt.dep.bnjs.BN 
     * internally stored.
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.getSerialized = function(){
        var bn = _bn_str+"";
        return bn;
    };
    /**
     * Get the instance of nCrypt.dep.bnjs.BN internally stored. (This 
     * function returns a clone of the BN instance, so changing the returned 
     * instance of BN will not affect the stored one.)
     * @returns {object}
     * @name getDeserialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.getDeserialized = function(){
        var bn = new bnjs.BN(_bn_obj);
        return bn;
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.bn.BigNumber}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.clone = function(){
        var inst = new BigNumber(_bn_str);
        return inst;
    };
};
bn.BigNumber = BigNumber;

return bn; });
