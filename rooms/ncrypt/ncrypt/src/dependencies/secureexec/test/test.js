const SecureExec = require('../src/secureexec.js');

var SecureExecTest = (function(){

var  test = {};
var _test = {};

 test.sync = {};
_test.sync = {};
test.sync.runTest = function(args){
    for(var i=0; i<args.length; i++){
        var passed = _test.sync.run[args[i]]();
        if(passed===true){
            SecureExec.tools.log.consoleLog("Passed test for sync: "+args[i]);
        }else{
            SecureExec.tools.log.consoleLog("DID NOT PASS test for sync: "+
                                            args[i]);
        }
    }
};
_test.sync.run = {};
_test.sync.run.apply = function(){
    var fn = function(a,b,c,d){
        return a+b+c+d;
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    var res = SecureExec.sync.apply(fn, [a,b,c,d]);
    if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
        return true;
    }else{
        return false;
    }
};
_test.sync.run.call = function(){
    var fn = function(a,b,c,d){
        return a+b+c+d;
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    var res = SecureExec.sync.apply(fn, [a,b,c,d]);
    if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
        return true;
    }else{
        return false;
    }
};
_test.sync.run.throws = function(){
    var fn = function(a,b,c,d){
        throw new Error();
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    var res = SecureExec.sync.apply(fn, [a,b,c,d]);
    if(SecureExec.tools.proto.inst.isException(res)===true){
        return true;
    }else{
        return false;
    }
};

 test.async = {};
_test.async = {};

test.async.runTest = function(args){
    if(Array.isArray(args)){
        args = { 'i': 0, 'tasks': args };
    }
    var i = args.i;
    var tasks = args.tasks;
    var t = tasks[i];
    _test.async.run[t](function(passed, fname){
        if(passed===true){
            SecureExec.tools.log.consoleLog("Passed test for async: "+
                                            fname);
            if(i<(tasks.length-1)){
                args.i += 1;
                test.async.runTest(args);
            }
        }else{
            SecureExec.tools.log.consoleLog("DID NOT PASS test for async: "+
                                            fname);
            if(i<(tasks.length-1)){
                args.i += 1;
                test.async.runTest(args);
            }
        }
    });
};
_test.async.run = {};
_test.async.run.apply = function(final_callback){
    var fn = function(a,b,c,d){
        return a+b+c+d;
    };
    var done = function(res){
        if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
            final_callback(true, 'apply');
        }else{
            final_callback(false, 'apply');
        }
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    SecureExec.async.apply(fn, done, [a,b,c,d]);
};
_test.async.run.call = function(final_callback){
    var fn = function(a,b,c,d){
        return a+b+c+d;
    };
    var done = function(res){
        if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
            final_callback(true, 'call');
        }else{
            final_callback(false, 'call');
        }
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    SecureExec.async.call(fn, done, a, b, c, d);
};
_test.async.run.until = function(final_callback){
    var fn = function(args){
        if(typeof args.count!=='number'){
            args.count = 0;
        }
        args.count += 1;
        if(args.count===10){
            args.complete = true;
        }
        return args;
    };
    var done = function(args){
        if(typeof args.count==='number' && args.count===10){
            final_callback(true, 'until');
        }else{
            final_callback(false, 'until');
        }
    };
    SecureExec.async.until(fn, done, {});
};
_test.async.run.waterfallUntil = function(final_callback){
    var f1 = function(a,b,c){
        return a+b+c;
    };
    var f2 = function(a){
        return a+"d";
    };
    var f3 = function(a){
        return a+"e";
    };
    var f4 = function(a){
        return a+"f";
    };
    var fn = function(args){
        if(typeof args==='string'){
            var str = args;
            args = {};
            args.str = str;
        }
        if(typeof args.count!=='number'){
            args.count = 0;
        }
        args.count += 1;
        if(args.count===10){
            args.complete = true;
        }
        return args;
    };
    var f5 = function(a){
        return a;
    };
    var done = function(args){
        if(args.str==="abcdef" && args.count===10){
            final_callback(true, 'waterfallUntil');
        }else{
            final_callback(false, 'waterfallUntil');
        }
    };
    SecureExec.async.waterfallUntil([f1,f2,f3,f4,
                            {'repeat': true, 'func': fn}, f5],
                            done, "a","b","c");
};
_test.async.run.waterfall = function(final_callback){
    var f1 = function(a,b,c){
        return a+b+c;
    };
    var f2 = function(a){
        return a+"d";
    };
    var f3 = function(a){
        return a+"e";
    };
    var f4 = function(a){
        return a+"f";
    };
    var done = function(args){
        if(args==="abcdef"){
            final_callback(true, 'waterfall');
        }else{
            final_callback(false, 'waterfall');
        }
    };
    SecureExec.async.waterfall([f1,f2,f3,f4], done, "a","b","c");
};
_test.async.run.throws = function(final_callback){
    var fn = function(a,b,c,d){
        throw new Error();
    };
    var done = function(res){
        if(SecureExec.tools.proto.inst.isException(res)===true){
            final_callback(true, 'throws');
        }else{
            final_callback(false, 'throws');
        }
    };
    var a="a"; var b="b"; var c="c"; var d="d";
    SecureExec.async.apply(fn, done, [a,b,c,d]);
};
_test.async.run.insecureSeries = function(final_callback){
    var f1 = function(auto_args, args){
        args.str = args.str+"a";
        setTimeout(function () {
            f1_a(auto_args, args);
        }, 0);
    };
    var f1_a = function(auto_args, args){
        args.str = args.str+"b";
        auto_args.callback(auto_args, args);
    };
    var f2 = function(auto_args, args){
        args.str = args.str+"c";
        setTimeout(function () {
            f2_a(auto_args, args);
        }, 0);
    };
    var f2_a = function(auto_args, args){
        args.str = args.str+"d";
        auto_args.callback(auto_args, args);
    };
    var done = function(args){
        if(typeof args.str==='string' && args.str==="abcd"){
            final_callback(true, 'insecureSeries');
        }else{
            // if an error in arguments occured (not in the functions)
            // @args will be a SecureExec exception, and the second argument
            // will be actual @args.
            final_callback(false, 'insecureSeries');
        }
    };
    var tasks = [ f1, f2 ];
    var call_args = {
        'final_callback': done,
        'count': 0,
        'tasks': tasks
    };
    var args = { 'str': "" };
    SecureExec.async.insecureSeries(call_args, args);
};

return test;
}());

/* Test sync */
SecureExecTest.sync.runTest(['apply','call','throws']);
/* Test async */
SecureExecTest.async.runTest(['apply', 'call', 'until','waterfall',
                              'waterfallUntil', 'throws', 'insecureSeries']);
