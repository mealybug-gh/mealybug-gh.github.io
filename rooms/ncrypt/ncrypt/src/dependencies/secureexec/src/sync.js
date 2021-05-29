var dep = {};
dep.tools = require('./tools.js');
dep.exception = require('./exception.js');

/**
 * @namespace SecureExec.sync
 * */
var  sync = {};
var _sync = {};

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
 * @returns {*|SecureExec.exception.Exception} Return value of the function, 
 * or (in case of an exception) instance 
 * of {@link SecureExec.exception.Exception} 
 * @memberof SecureExec.sync
 * @function
 * @name apply
 * */
sync.apply = function (fn, args) {
    return dep.tools.proto.func.apply(fn, args);
};

/**
 * Call a function @fn synchronously.
 * <br />
 * Returns the return value of @fn. 
 * <br />
 * If an error occurs, this return value will be an instance of 
 * {@link SecureExec.exception.Exception}.
 * <br />
 * All parameters after @fn will be passed as arguments to @fn.
 * @param {function} fn - Function to call.
 * @returns {*|SecureExec.exception.Exception} Return value of the function, 
 * or an instance of {@link SecureExec.exception.Exception}.
 * @memberof SecureExec.sync
 * @function
 * @name call
 * */
sync.call = function(fn){
    var args = dep.tools.proto.func.arrayFromArgumentsObject(arguments);
    args.shift(); // remove fn
    return dep.tools.proto.func.apply(fn, args);
};

module.exports = sync;
