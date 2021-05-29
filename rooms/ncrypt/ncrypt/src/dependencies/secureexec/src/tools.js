var dep = {};
dep.exception = require('./exception.js');

/**
 * @namespace SecureExec.tools
 * */
var  tools = {};
var _tools = {};
var _inner = {};

/**
 * @namespace SecureExec.tools.proto
 * */
tools.proto = {};
_tools.proto = {};
_inner.proto = {};

/**
 * @namespace SecureExec.tools.proto.inst
 * */
tools.proto.inst = {};
_tools.proto.inst = {};
_inner.proto.inst = {};

/**
 * This function is a convenience wrapper for `instanceof`. It checks whether an
 * object is an instance of a class, but doesn't throw exceptions if for 
 * example the instance argument is undefined.
 * <br />
 * This function will return `true` if @obj is an instance of @inst, and `false`
 * if not so, or if an error occurs.
 * @param {object} obj - Object to check if it is an instance of @inst.
 * @param {function} inst - Class to check whether @inst is an instance of.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isInstanceOf
 * */
tools.proto.inst.isInstanceOf = function(obj, inst){
    return _inner.proto.inst.isInstanceOf.callFunction(obj, inst);
};
_inner.proto.inst.isInstanceOf = {};
_inner.proto.inst.isInstanceOf.callFunction = function(obj, inst){
    try{
        return _inner.proto.inst.isInstanceOf.runFunction(obj, inst);
    }catch(e){
        return false;
    }
};
_inner.proto.inst.isInstanceOf.runFunction = function(obj, inst){
    if(typeof obj==='undefined' || typeof inst==='undefined'){
        return false;
    }
    if(obj instanceof inst){
        return true;
    }
    return false;
};

/**
 * Checks whether an object is an instance of the `SecureExec` custom exception
 * type {@link SecureExec.exception.Exception}.
 * <br />
 * Please note this function will not return `true` on plain Javascript errors /
 * exceptions but is for checking for an instance of 
 * {@link SecureExec.exception.Exception}.
 * @param {object} e - Object to check whether is a {@link SecureExec.exception.Exception}.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isException
 * */
tools.proto.inst.isException = function(e){
    return tools.proto.inst.isInstanceOf(e, dep.exception.Exception);
};

/**
 * This function checks whether @e is an instance of Error, i.e. whether @e
 * is a normal Javascript error.
 * @param {object} e - Object to check whether this is a Javascript error.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isError
 * */
tools.proto.inst.isError = function(e){
    return tools.proto.inst.isInstanceOf(e, Error);
};

/**
 * @namespace SecureExec.tools.proto.func
 * */
tools.proto.func = {};
_tools.proto.func = {};
_inner.proto.func = {};

/**
 * Converts the arguments object from a function into a simple array of the 
 * parameters.
 * @param {object} - Arguments object from a function.
 * @returns {Array} - Array of parameters.
 * @memberof SecureExec.tools.proto.func
 * @function
 * @name arrayFromArgumentsObject
 * */
tools.proto.func.arrayFromArgumentsObject = function(arg){
    return _inner.proto.func.argumentsArrayFromObject.callFunction(arg);
};
_inner.proto.func.argumentsArrayFromObject = {};
_inner.proto.func.argumentsArrayFromObject.callFunction = function(arg){
    try{
        return _inner.proto.func.argumentsArrayFromObject.runFunction(arg);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.func.argumentsArrayFromObject.runFunction = function(arg){
    var i=0; var arr = [];
    while(typeof arg[i]!=='undefined'){
        arr.push(arg[i]);
        i+=1;
    }
    return arr;
};

/**
 * Apply a function securely, i.e. without throwing actual Javascript errors if
 * anything breaks. 
 * <br />
 * This calls a function synchronously and either returns the functions return 
 * value, or an instance of {@link SecureExec.exception.Exception} if an error 
 * occurs. 
 * @param {function} - Function to apply.
 * @param {Array|Object} - Array of function parameters. This can be the 
 * arguments object from another function, or a simple array of function 
 * parameters.
 * @returns {*|SecureExec.exception.Exception}
 * @memberof SecureExec.tools.proto.func
 * @function
 * @name apply
 * */
tools.proto.func.apply = function(fn, args){
    return _inner.proto.func.apply.callFunction(fn, args);
};
_inner.proto.func.apply = {};
_inner.proto.func.apply.callFunction = function(fn, args){
    try{
        return _inner.proto.func.apply.runFunction(fn, args);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.func.apply.runFunction = function(fn, args){
    var apply_args = args;
        apply_args = tools.proto.func.arrayFromArgumentsObject(apply_args);
    if(tools.proto.inst.isException(apply_args)){
        return apply_args;
    }
    if(typeof fn!=='function'){
        // exception, need a function here
        throw new Error('fn must be a function to apply!');
    }
    if(tools.proto.arr.isArray(apply_args)!==true){
        // exception, need an array here
        throw new Error('args must be an array!');
    }
    return fn.apply(null, apply_args);
};

/**
 * @namespace SecureExec.tools.proto.arr
 * */
tools.proto.arr = {};
_tools.proto.arr = {};
_inner.proto.arr = {};

/**
 * Check whether @arg is an array.
 * @param {*} arg - Check if @arg is an array.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.arr
 * @function
 * @name isArray
 * */
tools.proto.arr.isArray = function(arg){
    return _inner.proto.arr.isArray.callFunction(arg);
};
_inner.proto.arr.isArray = {};
_inner.proto.arr.isArray.callFunction = function(arg){
    try{
        return _inner.proto.arr.isArray.runFunction(arg);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.arr.isArray.runFunction = function(arg){
    var is_array = Array.isArray || function(arg) {
        return Object.prototype.toString.callFunction(arg) === '[object Array]';
    };
    return is_array(arg);
};

/**
 * Get the unique elements in an array, i.e. remove duplicates.
 * @param {Array} - Array to get unique elements in.
 * @returns {Array|Object} Returns an array with duplicates removed, or an 
 * instance of {@link SecureExec.exception.Exception}.
 * @memberof SecureExec.tools.proto.arr
 * @function
 * @name isArray
 * */
tools.proto.arr.uniq = function(arr){
    return _inner.proto.arr.uniq.callFunction(arr);
};
_inner.proto.arr.uniq = {};
_inner.proto.arr.uniq.callFunction = function(arr){
    try{
        return _inner.proto.arr.uniq.runFunction(arr);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.arr.uniq.runFunction = function(arr){
    /* From: 
     * https://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array 
     * */
    var prims = {'boolean':{}, 'number':{}, 'string':{}}, objs = [];

    return a.filter(function(item) {
        var type = typeof item;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : 
                                                    (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
};

/**
 * @namespace SecureExec.tools.log
 * */
tools.log = {};
_tools.log = {};
_inner.log = {};

/**
 * Log a string to Javascript console if one is available.
 * @param {*} to_log - Object to log.
 * @memberof SecureExec.tools.log
 * @function
 * @name consoleLog
 * */
tools.log.consoleLog = function(to_log){
    if(typeof console!=='undefined' && typeof console.log==='function'){
        try{
            console.log(to_log);
        }catch(e){}
    }
};

module.exports = tools;
