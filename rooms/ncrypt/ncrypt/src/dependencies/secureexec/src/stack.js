var stacktraceJS = require('stacktrace-js');

/**
 * @namespace SecureExec.stack
 * */
var stack = {};
var _stack = {};
var _inner = {};

/**
 * Get a stack trace for a custom exception, or a generate one at the point
 * where this function is called.
 * <br />
 * The stack trace will be an array of strings, which is empty if any exception
 * occurs creating the stacktrace.
 * @param {Error} [e] - Optional Javascript error object. If this is passed,
 * the stacktrace will be generated from the stack trace information found in
 * this object.
 * @returns {string[]}
 * @memberof SecureExec.stack
 * @function
 * @name getStackTrace
 * */
stack.getStackTrace = function(e){
    return _inner.getStackTrace.call(e);
};
_inner.getStackTrace = {};
_inner.getStackTrace.call = function(e){
    try{
        return _inner.getStackTrace.run(e);
    }catch(e){
        SecureExec.tools.log.consoleLog("Exception occured in "+
                                        "SecureExec.stack.getStackTrace: ");
        SecureExec.tools.log.consoleLog(e);
        return [];
    }
};
_inner.getStackTrace.run = function(e){
    var stack = [];
    var getStackFromE = false;
    try{ getStackFromE = ((typeof e==='object') && (e instanceof Error));
    }catch(e){}
    if(getStackFromE===true){
        stack = stacktraceJS.getSync({'e': e});
    }else{
        stack = stacktraceJS.getSync();
    }
    return stack;
};

module.exports = stack;
