var dep = {};
dep.stack = require('./stack.js');

/**
 * @namespace SecureExec.exception
 * */
var  exception = {};
var _exception = {};

var _instOf = function(obj, inst){
    try{
        if(typeof obj==='undefined' || typeof inst==='undefined'){
            return false;
        }
        if(obj instanceof inst){
            return true;
        }
    }catch(e){
        return false;
    }
};
var _isArr = function(arg){
    var is_array = Array.isArray || function(arg) {
        return Object.prototype.toString.callFunction(arg) === '[object Array]';
    };
    return is_array(arg);
};

/**
 * Constructor for a custom `SecureExec` exception. Instances of this class will
 * be just objects (instances of `SecureExec.exception.Exception`, not 
 * Javascript errors.
 * <br />
 * If you specify @name and/or @message, these name and error message will 
 * always be used, no matter whether @error is defined or not. 
 * <br />
 * With the optional @error property, an actual Javascript exception can be 
 * passed. If name and/or message aren't specified (i.e. `null` or empty 
 * strings), name and message from @error will be used.
 * <br />
 * A custom @stack array can be passed to set a custom stack trace. This 
 * stack trace will be merged with the stacktrace generated, or if @error is
 * specified, the stacktrace from @error. If @stack is not specified, the
 * stacktrace from @error or the stacktrace generated will be used. (This 
 * should usually be the case, if there's no reason for a custom additional
 * stacktrace.)
 * @typedef {Object} SecureExec.exception.Exception
 * @param {string} [name="Exception"] - Name of the exception.
 * @param {string} [message="Exception occured."] - Exception message.
 * @param {object} [error=null] - Javascript exception to get exception from. 
 * To get the name and message of @error, pass null for @name and @message.
 * @param {string[]} [stack] - Custom stack trace.
 * @returns {SecureExec.exception.Exception} 
 * @memberof SecureExec.exception
 * @class
 * @name Exception
 * */
exception.Exception = function(name, message, error, stack){
    var exp = new _exception.constructException(name, message, error, stack);
    /**
     * @name name
     * @member {string}
     * @memberof SecureExec.exception.Exception#
     * */
    this.name = exp.name;
    /**
     * @name message
     * @member {string}
     * @memberof SecureExec.exception.Exception#
     * */
    this.message = exp.message;
    /**
     * @name error
     * @member {Error}
     * @memberof SecureExec.exception.Exception#
     * */
    this.error = exp.error;
    /**
     * @name stack
     * @member {string[]}
     * @memberof SecureExec.exception.Exception#
     * */
    this.stack = exp.stack;
};

_exception.constructException = function(name, message, error, stack){
    this.name = "Exception";
    this.message = "Exception occured.";
    this.error = null;
    this.stack = [];
    /* Check whether there is a custom stack trace yet. */
    if(_isArr(stack)!==true){
        stack = [];
    }
    /* Get properties from @error if defined. */
    var err_name = null; var err_msg = null;
    if(_instOf(error, Error)){
        err_name = error.name || null;
        err_msg = error.message || null;
        var err_stack = dep.stack.getStackTrace(error);
        stack = stack.concat(err_stack);
    }
    /* Get stacktrace if there's now @error */
    else{
        stack = dep.stack.getStackTrace();
    }
    /* Get the exception name. */
    if(typeof err_name==='string' && err_name.length>0){
        if(typeof name!=='string' || name.length<1){
            name = err_name;
        }
    }
    /* Get the exception message. */
    if(typeof err_msg==='string'){
        if(typeof message!=='string'){
            message = err_msg;
        }
    }
    /* Get the properties */
    if(typeof name==='string' && name.length>0) this.name = name;
    if(typeof message==='string') this.message = message;
    if(_instOf(error, Error)) this.error = error;
    this.stack = stack;
};

module.exports = exception;
