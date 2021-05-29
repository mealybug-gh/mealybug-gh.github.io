# SecureExec

**SecureExec** is a very small Javascript library which
allows **calling functions without throwing actual Javascript exceptions**.

Applying functions using the **SecureExec** function call methods results in
functions **no longer throwing exceptions**. Instead, a function
will **return a custom SecureExec exception object** if an error occurs inside
the function. Then all you need to do is to check whether the return value is
such an exception object to know whether an error has occured. This works
for **asynchronously called functions** just as well, of course - the callback
will simply be passed the exception object.

In addition, **SecureExec** has some **asynchronous control flow functions**
which allow calling asynchronous functions more conveniently, as well as
functions to **generate stacktraces** and **custom exception objects**.

## Examples

### Calling a function securely

To call a function securely, use `SecureExec.sync.apply`
or `SecureExec.sync.call`. (See the documentation for details. `apply` takes
an array or arguments, while `call` takes an argument list - that's the
difference.)

Calling the function using `SecureExec.sync.apply`:

```
var fn = function(a,b,c,d){
    return a+b+c+d;
};
var a="a"; var b="b"; var c="c"; var d="d";
var res = SecureExec.sync.apply(fn, [a,b,c,d]);
if(SecureExec.tools.proto.inst.isException(res)){
    // an exception has occured here
}
```
Now calling the function using `SecureExec.sync.call`:

```
var fn = function(a,b,c,d){
    return a+b+c+d;
};
var a="a"; var b="b"; var c="c"; var d="d";
var res = SecureExec.sync.call(fn, a, b, c, d);
if(SecureExec.tools.proto.inst.isException(res)){
    // an exception has occured here
}
```
Throw an error inside the example function to take a look at the exception
object.

### Calling a function securely (asynchronously)

To call a function asynchronously, use `SecureExec.async.call`
and `SecureExec.async.apply`. These functions work in a pretty simple way:
The function is called securely asynchronously, and its return value is passed
to the callback.

With `apply`:

```
var fn = function(a,b,c,d){
    // do some stuff
    return a+b+c+d;
};
var done = function(res){
    if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
        // this has worked
    }else{
        // there's been an exception
    }
};
var a="a"; var b="b"; var c="c"; var d="d";
SecureExec.async.apply(fn, done, [a,b,c,d]);
```
... or with `call`:


```
var fn = function(a,b,c,d){
    // do some stuff
    return a+b+c+d;
};
var done = function(res){
    if(SecureExec.tools.proto.inst.isException(res)!==true && res==="abcd"){
        // this has worked
    }else{
        // an exception has occured
    }
};
var a="a"; var b="b"; var c="c"; var d="d";
SecureExec.async.call(fn, done, a, b, c, d);
```

### Asynchronous control flow

**SecureExec** has some functions which simplify asynchronous function calls.
(However, only few, at the moment.)

`until` repeats a function until the object returned has a
property `{boolean} obj.complete === true`.

```
var fn = function(args){
    if(typeof args.count!=="number"){
        args.count = 0;
    }
    args.count += 1;
    if(args.count===10){
        args.complete = true;
    }
    return args;
};
var done = function(res){
    if(SecureExec.tools.proto.inst.isException(res)){
        // an exception has occured
    }
    if(typeof res.count==="number" && res.count===10){
        // it has worked
    }
};
SecureExec.async.until(fn, done, {});
```

`waterfall` calls an array of tasks, with each function being passed the
return value of the function called before. (The first function will be called
with custom arguments.) If an error occurs, the final callback is called
earlier with the exception object. (Arguments are passed like in `call` - the
function arguments for the first function are the additional arguments
for `waterfall`.)

```
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
var done = function(res){
    if(SecureExec.tools.proto.inst.isException(res)){
        // an exception has occured
    }
    if(res!=="abcdef"){
        // everything worked here
    }
};
SecureExec.async.until([f1,f2,f3,f4], done, "a","b","c");
```
## The Exception class

Exception objects in **SecureExec** are instances of
the `SecureExec.exception.Exception` class.

Exception objects try to be easier to handle than plain Javascript errors.

Each exception has a `name`, a `message`, and a `stack`trace (which,
hopefully, is filled in any somewhat decent browser). If an exception was
generated from an actual Javascript error, it's `error` property contains
this error (by default it's `null`).

Exceptions aren't thrown, but simply returned as return values of functions
which originally would have thrown an error.

*__Please note__: This also means that your function should only return a
(customly built) exception if you actually intend this function to return
an exception. (You might do this instead of throwing an error in the
function to control exception name and message more easily. A stacktrace
will still be generated.)*

Working with exception objects instead of classical errors means
you **won't have to handle errors** using `window.onerror` or catch exceptions
in every function as long as you call functions which might throw errors
using the call functions in **SecureExec**. Any exception thrown will be caught in **SecureExec**.

However, after a function returns, **check whether the return value is
a `SecureExec.exception.Exception`**. If so, **handle the exception properly**.

## Stacktraces

For each instance of `SecureExec.exception.Exception`, a stack trace will be
generated.

However, a **stacktrace can be generated at any point of the program** without
an exception object.

To generate a stacktrace manually, use `SecureExec.stack.getStackTrace`. This
function either simply generates a stacktrace at a certain point of the
program, or a stacktrace from a Javascript error object (not a **SecureExec**
exception object).

`SecureExec.stack.getStackTrace` returns the stack trace as
browser-independent and simple as possible, so you should receive an array of
strings which is not the same for every browser, but at least get a filled
stacktrace in any (somewhat modern) browser.

## Building the docs

To build the docs, run `npm run generate-docs`.

## License

**SecureExec** is released under the [MIT License](http://opensource.org/licenses/MIT).
