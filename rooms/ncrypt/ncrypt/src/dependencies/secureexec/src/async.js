var dep = {};
dep.tools = require('./tools.js');
dep.exception = require('./exception.js');
dep.sync = require('./sync.js');

/**
 * @namespace SecureExec.async
 * */
var  async = {};
var _async = {};
var _inner = {};

/**
 * Call a function @fn asynchronously, and pass the return value as an argument
 * to @callback.
 * <br />
 * If an error occurs, this return value will be an instance 
 * of {@link SecureExec.exception.Exception}.
 * <br />
 * All parameters after @fn and @callback will be passed as arguments to @fn.
 * @param {function} fn - Function to call.
 * @param {function} callback - Callback to call with the return value of @fn
 * as an argument (or an instance of {@link SecureExec.exception.Exception}).
 * @returns {boolean} Returns false if @fn or @callback are not valid 
 * functions. Otherwise, returns true.
 * @memberof SecureExec.async
 * @function
 * @name call
 * */
async.call = function(fn, callback){
    if(typeof fn!=='function' || typeof callback!=='function'){
        return false;
    }
    var args = dep.tools.proto.func.arrayFromArgumentsObject(arguments);
    args.shift(); // remove fn
    args.shift(); // remove callback
    setTimeout(function(){
        var res = dep.tools.proto.func.apply(fn, args);
        setTimeout(function(){
            callback(res);
        }, 0);
    }, 0);
    return true;
};

/**
 * Call a function @fn asynchronously, and pass the return value as an argument
 * to @callback.
 * <br />
 * If an error occurs, this return value will be an instance 
 * of {@link SecureExec.exception.Exception}.
 * <br />
 * The @args object must be a function's arguments object, or an array. 
 * @param {function} fn - Function to call.
 * @param {function} callback - Callback to call with the return value of @fn
 * as an argument (or an instance of {@link SecureExec.exception.Exception}).
 * @param {object|Array} args - Will be passed to @fn as an array of arguments.
 * @returns {boolean} Returns false if @fn or @callback are not valid 
 * functions, or if @args isn't an arguments object or array. Otherwise, 
 * returns true.
 * @memberof SecureExec.async
 * @function
 * @name apply
 * */
async.apply = function(fn, callback, args){
    if(typeof fn!=='function' || typeof callback!=='function'){
        return false;
    }
    if(typeof args==='undefined'){ return false; }
    if(typeof args==='object'){
        try{
            args=dep.tools.proto.func.arrayFromArgumentsObject(args);
        }catch(e){ return false; }
    }
    if(dep.tools.proto.arr.isArray(args)!==true){ return false; }
    setTimeout(function(){
        var res = dep.tools.proto.func.apply(fn, args);
        setTimeout(function(){
            callback(res);
        }, 0);
    }, 0);
    return true;
};

/**
 * Repeatedly call @task with @args as an argument, until its 
 * property `args.complete` is `true`.
 * <br />
 * Calls @final_callback when `args.complete` is `true`, or if an error occurs.
 * <br />
 * The @task needs to take one object as an argument ( @args ) which has 
 * parameters for the @task function, and return such an object so it can be 
 * passed to the next run of @task.
 * <br />
 * When @task shouldn't be repeated anymore, set the 
 * property `(args).complete=true` before returning the object. 
 * <br />
 * If an error occurs, the @final_callback will be called with the 
 * exception object immediately (see {@link SecureExec.exception.Exception}).
 * @param {function} task - Task to repeat.
 * @param {function} final_callback - Function to call after repetition is done.
 * Needs to take one object as an argument, which either is the arguments 
 * object last returned, or an instance 
 * of {@link SecureExec.exception.Exception} if an error occurs.
 * @param {object} args - Object which provides arguments for @task as 
 * properties. Please note this function uses a property 
 * from @args, `(args).complete`, internally. If @task returns an object with 
 * a property `complete===true`, the task will not be
 * called any longer and @final_callback will be called with this 
 * returned object as an argument.
 * @memberof SecureExec.async
 * @function
 * @name until
 * */
async.until = function(task, final_callback, args){
    if(typeof task!=='function' || typeof final_callback!=='function'){
        var e = new dep.exception.Exception("InvalidType", "task"+
                        "and final_callback must be functions for "+
                        "async.until!");
        setTimeout(function(){
            final_callback(e);
        }, 0);
        return;
    }
    if(typeof args!=='object'){
        var e = new dep.exception.Exception("InvalidType", "args"+
                        "must be an object for "+
                        "async.until!");
        setTimeout(function(){
            final_callback(e);
        }, 0);
        return;
    }
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    if(typeof args.complete!=='undefined' && args.complete === true){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    setTimeout(function(){
        args = [ args ];
        args = dep.tools.proto.func.apply(task, args);
        setTimeout(function(){
            async.until(task, final_callback, args);
        }, 0);
    }, 0);
};

/**
 * This function works similarly to {@link SecureExec.async.waterfall}, but
 * allows including functions which should be repeated like 
 * in {@link SecureExec.async.until}.
 * <br />
 * Tasks which should be called like other tasks 
 * in {@link SecureExec.async.waterfall} need to be passed in @tasks just as 
 * functions.
 * <br />
 * Tasks which should be repeated like in {@link SecureExec.async.until} need 
 * to be objects like `{ 'func': {function} fn, 'repeat': {boolean} true }`.
 * <br />
 * When repetition is done, the next item in @tasks will be called with the
 * return value of the last iteration, like the final callback 
 * of {@link SecureExec.async.until} would be.
 * @param {Array} tasks
 * @param {function} final_callback
 * @memberof SecureExec.async
 * @function
 * @name waterfallUntil
 * */
async.waterfallUntil = function(tasks, final_callback){
    _inner.waterfallUntil.callFunction.apply(null, arguments);
};
_inner.waterfallUntil = {};
_inner.waterfallUntil.callFunction = function(tasks, final_callback){
    var get_args = function(tasks, final_callback){
        if(typeof final_callback!=='function'){
            throw new Error("final_callback must be a function for "+
                            "async.waterfallUntil.");
        }
        if(dep.tools.proto.arr.isArray(tasks)!==true){
            throw new Error("tasks must be an array for "+
                            "async.waterfallUntil.");
        }
        var tmp = dep.tools.proto.func.arrayFromArgumentsObject(
                                                                arguments);
            tmp = tmp.slice(2);
        var args = [ tasks, final_callback, 0 ].concat(tmp);
        return args;
    };
    var args = dep.tools.proto.func.apply(get_args, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    var res = dep.tools.proto.func.apply(
                _inner.waterfallUntil.runFunction, args);
    if(dep.tools.proto.inst.isException(res)){
        setTimeout(function(){
            final_callback(res);
        }, 0);
        return;
    }
};
_inner.waterfallUntil.runFunction = function(tasks, final_callback, count){
    var get_args = function(tasks, final_callback, count){
        if(typeof count!=='number'){
            throw new Error(
            "Internal error in async.waterfallUntil: "+
            "count is not a number.");
        }
        if(typeof final_callback!=='function'){
            throw new Error("final_callback must be a function for "+
                            "async.waterfallUntil.");
        }
        var task = tasks[count];
        var task_obj = ( typeof task==='object' &&
                         ( typeof task.repeat==='boolean' &&
                           typeof task.func==='function'
                         )
                       );
        var task_func = (typeof task==='function');
        var task_not_valid = !(task_obj || task_func);
        if(task_not_valid && count<tasks.length){
            throw new Error("All tasks must be a function for "+
                            "async.waterfallUntil, task "+count+
                            " does not seem to be one.");
        }
        var args = dep.tools.proto.func.arrayFromArgumentsObject(
                        arguments);
        if(dep.tools.proto.inst.isException(args)){
            return args;
        }
        args = args.slice(3);
        return args;
    };
    var args = dep.tools.proto.func.apply(get_args, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    if(count >= tasks.length){
        setTimeout(function(){
            dep.tools.proto.func.apply(final_callback, args);
        }, 0);
        return;
    }
    var task = tasks[count];
    setTimeout(function(){
        if(typeof task==='object'){
            task = task.func;
            if(typeof args[0]==='object' &&
               typeof args[0].complete==='boolean' && args[0].complete===true){
                count+=1;
            }else{
                args = dep.tools.proto.func.apply(task, args);
                if(dep.tools.proto.inst.isException(args)){
                    setTimeout(function(){
                        final_callback(args);
                    }, 0);
                    return;
                }
            }
        }else{
            count+=1;
            args = dep.tools.proto.func.apply(task, args);
                    if(dep.tools.proto.inst.isException(args)){
                setTimeout(function(){
                    final_callback(args);
                }, 0);
                return;
            }
        }
        setTimeout(function(){
            args = [ tasks, final_callback, count ].concat(args);
            //_async.waterfallUntil.apply(null,args);
            dep.tools.proto.func.apply(
                                    _inner.waterfallUntil.runFunction, args);
        }, 0);
    }, 0);
};

/**
 * Runs the @tasks array of functions in series, each passing their results to 
 * the next in the array. However, if any of the tasks returns an exception
 * (instance of {@link SecureExec.exception.Exception}), the next function is 
 * not executed, and the @final_callback is immediately called with an
 * instance of {@link SecureExec.exception.Exception} as an argument.
 * <br />
 * Parameters after @tasks and @final_callback will be used as parameters for
 * the first function (@tasks[0]).
 * @param {function[]} tasks - Array of functions.
 * @param {function} final_callback - Final callback.
 * @memberof SecureExec.async
 * @function
 * @name waterfall
 * */
async.waterfall = function(tasks, final_callback){
    //_inner.waterfall.callFunction.apply(null, arguments);
    var check_tasks = function(tasks){
        if(!dep.tools.proto.arr.isArray(tasks)){
            throw new Error("tasks must be an array for "+
                            "async.waterfall!");
        }
        for(var i=0; i<tasks.length; i++){
            if(typeof tasks[i]!=='function'){
                throw new Error("Each task must be a function!"+
                                "async.waterfall!");
            }
        }
        return true;
    };
    var tasks_val = dep.sync.apply(check_tasks, [tasks]);
    if(dep.tools.proto.inst.isException(tasks_val)){
            final_callback(tasks_val);
        return;
    }
    async.waterfallUntil.apply(null,arguments);
};

/**
 * Call a series of asynchronous function calls.
 * <br />
 * This is intended to wrap up several asynchronous calls, i.e. functions 
 * which will call a callback.
 * <br />
 * Functions in the series will NOT be executed securely, if they throw 
 * exceptions, these won't be caught. 
 * <br />
 * Therefore, this function makes most sense to combine functions which are 
 * asynchronous function calls via `SecureExec.async` (i.e., wrap a `waterfall` 
 * or `until` call) or functions which are not likely to throw exceptions.
 * <br />
 * Each function in the array of tasks needs to take two arguments,
 * like `function(auto_args, args)`. The `args` object is intended to carry 
 * function arguments, while the `auto_args` argument shouldn't be changed 
 * manually.
 * <br />
 * Instead of returning the arguments object `args`, a task should 
 * call `auto_args.callback(args)`.
 * <br /> 
 * The final callback will be called after all tasks are completed, with
 * like `final_callback(args)`. 
 * <br />
 * If invalid arguments are found, it will be called 
 * like `final_callback({SecureExec.Exception} exp, {\*} args)`.
 * <br />
 * To call the final callback earlier (for example, after an exception was 
 * detected manually), 
 * call `(auto_args).final_callback({SecureExec.Exception} exp, {\*} args)`.
 * @param {object} call_args - Object like `{'tasks': {function[] 
 * array_of_functions, 'final_callback': {function} final_callback}`.
 * @param {*} args - Passed as an actual argument to the first function in
 * the array. Each function in array must take arguments like `function({object}
 * auto_args, {\*} args)`, where `auto_args` should not be changed manually.
 * @function
 * @name insecureSeries
 * @memberof SecureExec.async
 * */
async.insecureSeries = function(call_args, args){
    var callback = async.insecureSeries;
    _inner.insecureSeries.callFunction(call_args, callback, args);
};
_inner.insecureSeries = {};
_inner.insecureSeries.callFunction = function(call_args, callback, args){
    var check = function(call_args, callback, args){
        var tasks = call_args.tasks;
        var count = call_args.count;
        var final_callback = call_args.final_callback;
        var msg = "Invalid argument for async.insecureSeries: ";
        if(typeof tasks==='undefined' || 
           dep.tools.proto.arr.isArray(tasks)!==true){
               throw new Error(msg+"@tasks is not an array!");
        }
        if(typeof count!=='number'){
            throw new Error(msg+"@count is not a number!");
        }
        if(typeof final_callback!=='function'){
            throw new Error(msg+"@final_callback is not a function!");
        }
        if(count>tasks.length && typeof tasks[count]==='undefined'){
            throw new Error(msg+"@tasks["+count+"] is not defined!");
        }
        if(count>tasks.length && typeof tasks[count]!=='function'){
            throw new Error(msg+"@tasks["+count+"] is not a function!");
        }
        /*if(typeof tasks[count].fn!=="function"){
            throw new Error(msg+"@tasks["+count+"].fn is not a function!");
        }
        if(typeof tasks[count].callback!=="function"){
            throw new Error(msg+
            *   "@tasks["+count+"].callback is not a function!");
        }*/
        if(count>0 && typeof callback!=='function'){
            throw new Error(msg+"@callback is not a function!");
        }
        if(typeof args==='undefined'){
            args = {};
        }
        return [call_args, callback, args];
    };
    var fn_args = dep.tools.proto.func.apply(check, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            call_args.final_callback(args);
        }, 0);
        return;
    }
    if(dep.tools.proto.inst.isException(fn_args)){
        setTimeout(function(){
            call_args.final_callback(fn_args);
        }, 0);
        return;
    }
    _inner.insecureSeries.runFunction.apply(null, fn_args);
};
_inner.insecureSeries.runFunction = function(call_args, callback, args){
    var tasks = call_args.tasks;
    var count = call_args.count;
    var final_callback = call_args.final_callback;
    if(typeof tasks[count]==='function'){
        var task = tasks[count];
        call_args.count += 1;
        call_args.callback = callback;
        setTimeout(function(){
            task(call_args, args);
        }, 0);
    }else{
        setTimeout(function(){
            final_callback(args);
        }, 0);
    }
};

module.exports = async;
