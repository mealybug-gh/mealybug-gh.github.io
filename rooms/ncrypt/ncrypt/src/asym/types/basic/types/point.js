
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

// bn: types.basic.bn.BigNumber
var SecureExec = ncrypt.dep.SecureExec;
var elliptic = ncrypt.dep.elliptic;
var bnjs = ncrypt.dep.bn;

/**
 * @namespace nCrypt.asym.types.basic.point
 * */
var point = {};
var _point = {};

var _cache = {}; // cache for ec objects

_point.elliptic = {};
_point.elliptic.available = {};
_point.elliptic.available.curves = {
    "secp256k1": { "name": "secp256k1", "type": "short" },
    "curve25519": { "name": "curve25519", "type": "mont" },
    "ed25519": { "name": "ed25519", "type": "edwards" }
};
_point.elliptic.available.types = {
    "mont": { "bn": [ "x", "z" ] },
    "edwards": { "bn": [ "x", "y", "z", "t" ] },
    "short": { "bn": [ "x", "y" ] }
};
_point.elliptic.available.curveNameIsValid = function(curve){
    if(typeof curve!=="string" || curve.length<1) return false;
    if(curve==="__proto__") return false;
    if(typeof _point.elliptic.available.curves[curve] === "undefined"){
        return false;
    }
    if(typeof _point.elliptic.available.curves[curve].name!=="string" ||
       typeof _point.elliptic.available.curves[curve].type!=="string"){
        return false;
    }
    return true;
};
_point.elliptic.construct = {};
_point.elliptic.construct.point = {};
_point.elliptic.construct.point.bnArgsFromPoint = function(obj, curve){
    if(typeof obj!=="object" || obj===null){
        throw new ncrypt.exception.types.basic.point.invalidArgument();
    }
    var bns = { "x": null, "y": null, "z": null, "t": null };
    var bn_json = {};
    for(var k in bns){
        if(typeof obj[k]!=="undefined"){
            var _bn = new types.basic.bn.BigNumber(obj[k]);
            if(SecureExec.tools.proto.inst.isException(_bn)) return _bn;
            _bn = _bn.getSerialized();
            bn_json[k] = _bn;
        }
    }
    return bn_json;
};
_point.elliptic.construct.point.bnArgsGenPoint = function(bns, curve){
    var t = _point.elliptic.available.curves[curve].type;
    var rbn = _point.elliptic.available.types[t].bn;
    var bn_args = {};
    for(var i=0; i<rbn.length; i++){
        var bnk = rbn[i];
        var _bn = bns[bnk];
        if(typeof _bn==="undefined"){
            throw new ncrypt.exception.types.basic.point.invalidArgument();
        }
        _bn = new types.basic.bn.BigNumber(bns[bnk]);
        if(SecureExec.tools.proto.inst.isException(_bn)) return _bn;
        _bn = _bn.getDeserialized();
        bn_args[bnk] = (_bn);
    }
    return bn_args;
};
_point.elliptic.construct.point.getEC = function(curve){
    try{
        var ec;
        if(typeof _cache[curve]==="undefined"){
            ec = new ncrypt.dep.elliptic.ec(curve);
        }else{ ec = _cache[curve]; }
        return ec;
    }catch(e){ throw new ncrypt.exception.types.basic.point.cannotDeriveEC(); }
};
_point.elliptic.construct.point.generate = function(bns, curve){
    if(!_point.elliptic.available.curveNameIsValid(curve)){
        throw new ncrypt.exception.types.basic.point.invalidCurve();
    }
    var ec = SecureExec.sync.apply(_point.elliptic.construct.point.getEC, 
                [curve]);
    if(SecureExec.tools.proto.inst.isException(ec)) return ec;
    var gen_args = SecureExec.sync.apply(
                _point.elliptic.construct.point.bnArgsGenPoint,
                [bns, curve]);
    if(SecureExec.tools.proto.inst.isException(gen_args)) return gen_args;
    var pt;
    try{
        var t = ec.curve.type;
        var pt_gen_args = [];
        if(t==="mont"){
            pt_gen_args = [ gen_args.x, gen_args.z ];
        }else if(t==="short"){
            pt_gen_args = [ gen_args.x, gen_args.y ];
        }else if(t==="edwards"){
            pt_gen_args = [ gen_args.x, gen_args.y, gen_args.z, gen_args.t ];
        }else{
            throw new ncrypt.exception.types.basic.point.unsupportedCurveType();
        }
        pt = ec.curve.point.apply(ec.curve, pt_gen_args);
    }catch(e){
        pt = new SecureExec.exception.Exception(null,null,e);
    }
    if(SecureExec.tools.proto.inst.isException(pt)){
        throw new ncrypt.exception.types.basic.point.generatingPointFailed();
    }
    return pt;
};

_point.serialize = {};
_point.serialize.serialize = function(elliptic_point, curve){
    var bn_args = SecureExec.sync.apply(
        _point.elliptic.construct.point.bnArgsFromPoint, 
            [elliptic_point, curve]
    );
    if(SecureExec.tools.proto.inst.isException(bn_args)) return bn_args;
    if(!_point.elliptic.available.curveNameIsValid(curve)){
        throw new ncrypt.exception.types.basic.point.invalidCurve();
    }
    var json_str = JSON.stringify({ "b": bn_args, "c": curve });
    return json_str;
};
_point.serialize.deserialize = function(point_str){
    var point_obj = null;
    if(typeof point_str!=="string" || point_str.length<1){
        throw new ncrypt.exception.types.basic.point.deserializationFailed();
    }
    try{
        point_obj = JSON.parse(point_str);
    }catch(e){
        throw new ncrypt.exception.types.basic.point.deserializationFailed();
    }
    var p = _point.elliptic.construct.point.generate(point_obj.b, point_obj.c);
    if(SecureExec.tools.proto.inst.isException(p)) return p;
    var p_obj = {
        "c": point_obj.c,
        "p": p
    };
    return p_obj;
};

/**
 * Create an instance of `Point`, representing a point on a curve as used 
 * in `elliptic`. 
 * @param {object|string} obj - This can be either an instance of this class, 
 * a point instance from `elliptic`, or a string. In case of a string, this 
 * string must represent a serialized version of an instance of `Point`,  
 * retrieved from an existing point using `(my_point_inst).getSerialized()`.
 * @param {string} [curve] - If @obj is not a serialized version of an instance
 * of this class, specify the curvename of the curve the point is located on.
 * @returns {object}
 * @class
 * @name Point
 * @memberof nCrypt.asym.types.basic.point
 * */
var Point = function(obj, curve){
    var _pt_serialized = null;
    var _pt_deserialized = null;
    var _pt_curve = null;
    var _pt_type = null;
    
    var isPointInst = SecureExec.tools.proto.inst.isInstanceOf(obj, Point);
    if(isPointInst){
        return obj.clone();
    }
    if(typeof obj==="string" && typeof curve==="undefined"){
        _pt_deserialized = _point.serialize.deserialize(obj);
        if(SecureExec.tools.proto.inst.isException(_pt_deserialized)){
            return _pt_deserialized;
        }
        _pt_serialized = _point.serialize.serialize(_pt_deserialized.p,
                                                    _pt_deserialized.c);
        if(SecureExec.tools.proto.inst.isException(_pt_serialized)){
            return _pt_serialized;
        }
        _pt_curve = _pt_deserialized.c;
        _pt_type = _point.elliptic.available.curves[_pt_curve].type;
    }
    else if(typeof obj==="object" && typeof curve==="string"){
        _pt_serialized = _point.serialize.serialize(obj, curve);
        if(SecureExec.tools.proto.inst.isException(_pt_serialized)){
            return _pt_serialized;
        }
        _pt_deserialized = _point.serialize.deserialize(_pt_serialized);
        if(SecureExec.tools.proto.inst.isException(_pt_deserialized)){
            return _pt_deserialized;
        }
        _pt_curve = _pt_deserialized.c;
        _pt_type = _point.elliptic.available.curves[_pt_curve].type;
    }else{
        var exp = new ncrypt.exception.Create(
                        ncrypt.exception.types.basic.point.invalidArgument);
        return new SecureExec.exception.Exception(null, null, exp);
    }
    
    /**
     * Return a serialized version of the point represented (JSON string 
     * containing all required point information).
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getSerialized = function(){
        return _pt_serialized+"";
    };
    /**
     * Return an object containing the `elliptic`-point and other properties
     * representing a point. (You'll most often use `getEllipticPoint`, but this
     * gives back an object with point and curve information, with the point
     * being `(my_returned_obj).p` and the curve information 
     * `(my_returned_obj).c`.)
     * @returns {object}
     * @name getDeserialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getDeserialized = function(){
        return _pt_deserialized;
    };
    /**
     * Get the `elliptic`-point object. 
     * @returns {object}
     * @name getEllipticPoint
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getEllipticPoint = function(){
        return _pt_deserialized.p;
    };
    /**
     * Get the curve name of the curve the point is located on.
     * @returns {string}
     * @name getCurveName
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getCurveName = function(){
        return _pt_curve+"";
    };
    /**
     * Get the curve type of the curve the point is located on.
     * @returns {string}
     * @name getCurveType
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getCurveType = function(){
        return _pt_type+"";
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.point.Point}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.clone = function(){
        return new Point(_pt_serialized+"");
    };
};
point.Point = Point;

/**
 * @namespace nCrypt.asym.types.basic.point.curves
 * */
point.curves = {};
/**
 * @namespace nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available = {};
/**
 * Get an array of strings containing the names of all currently supported 
 * curves.
 * @returns {string[]}
 * @function
 * @name getAvailableCurveNames
 * @memberof nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available.getAvailableCurveNames = function(){
    var c = _point.elliptic.available.curves;
    var cns = [];
    for(var k in c){ cns.push(k); }
    return cns;
};
/**
 * Get an object representing all the available curves with their names and
 * types.
 * @returns {object}
 * @function
 * @name getAvailableCurves
 * @memberof nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available.getAvailableCurves = function(){
    var c = _point.elliptic.available.curves;
    return JSON.parse(JSON.stringify(c));
};
/**
 * @namespace nCrypt.asym.types.basic.point.curves.validate
 * */
point.curves.validate = {};
/**
 * Check whether a certain curve (identified by name) is supported.
 * @param {string} cname - Curvename.
 * @returns {bool}
 * @function
 * @name isSupportedCurve
 * @memberof nCrypt.asym.types.basic.point.curves.validate
 * */
point.curves.validate.isSupportedCurve = function(cname){
    if(typeof cname!=="string" || cname.length<1 || cname==="__proto__"){
        return false;
    }
    var c = _point.elliptic.available.curves;
    var cs = JSON.parse(JSON.stringify(c));
    return (typeof cs[cname]==="object");
};

/**
 * @namespace nCrypt.asym.types.basic.point.cache
 * */
point.cache = {};
/**
 * Loading the `ellipticjs.ec` objects for certain curves can be a pretty time
 * consuming operation.
 * <br />
 * This is why it makes sense to pre-cache these objects before starting the
 * actual application. As a result, elliptic curve calculation / generating 
 * keys etc. will go much smoother. 
 * <br />
 * Pass an array of all curve names of the curves the application is going to
 * use.
 * @param {string[]} curves - Curvenames for the curves EC-object should be 
 * pre-cached for. 
 * @param {function} callback - Callback 
 * function([bool|SecureExec.exception.Exception] res, [*] carry)
 * @param {*} [carry]
 * @function
 * @name preloadCache
 * @memberof nCrypt.asym.types.basic.point.cache
 * */
point.cache.preloadCache = function(curves, callback, carry){
    if(typeof callback!=="function") return false;
    var donef = function(res){ /* res is an instance of 
                                * SecureExec.exception.Exception or a bool
                                * value (true) for success. 
                                * */
        setTimeout(function(){
            callback(res, carry);
        }, 0);
    };
    var check_args = function(){
        if(!Array.isArray(curves)){
            throw new ncrypt.exception.types.basic.point.invalidArgument();
        }
        for(var i=0; i<curves.length; i++){
            var c = curves[i];
            if(!_point.elliptic.available.curveNameIsValid(c)){
                throw new ncrypt.exception.types.basic.point.invalidCurve();
            }
        }
        return true;
    };
    var args_valid = SecureExec.sync.apply(check_args, []);
    if(typeof args_valid!=="boolean"){ donef(args_valid); return; }
    
    var iterate_curves = function(_curves){
        if(_curves.length<1){ donef(true); return; }
        var c = _curves.shift();
        var ecf = _point.elliptic.construct.point.getEC;
        var ec = SecureExec.sync.apply(ecf, [ c ]);
        if(SecureExec.tools.proto.inst.isException(ec)){
            donef(ec); return;
        }
        iterate_curves(_curves);
    };
    iterate_curves(curves.slice(0));
    
    return true;
};

/**
 * @namespace nCrypt.asym.types.basic.point.ec
 * */
point.ec = {};
/**
 * Get an `ellipticjs.ec` object for a certain curve. This usually is equivalent 
 * to calling `new ellipticjs.ec("curvename")`, but will use the internal cache
 * for EC objects of this namespace.
 * @param {string} curvename
 * @returns {object|SecureExec.exception.Exception}
 * @function
 * @name getEC
 * @memberof nCrypt.asym.types.basic.point.ec
 * */
point.ec.getEC = function(curve){
    var check_args = function(){
        if(!_point.elliptic.available.curveNameIsValid(curve)){
            throw new ncrypt.exception.types.basic.point.invalidCurve();
        }
        return true;
    };
    var args_valid = SecureExec.sync.apply(check_args, [ curve ]);
    if(typeof args_valid!=="boolean" || args_valid!==true) return args_valid;
    var ecf = _point.elliptic.construct.point.getEC;
    var ec = SecureExec.sync.apply(ecf, [ curve ]);
    return ec;
};

return point; });
