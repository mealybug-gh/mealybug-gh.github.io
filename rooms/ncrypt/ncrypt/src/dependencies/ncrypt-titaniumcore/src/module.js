/*
 * If the environment seems to be node.js, export the `titaniumcore` object with
 * backwards-compatibility for the old `require()` API.
 * If AMD module support is found, the module will be defined using the AMD
 * loaders.
 * In the browser, and without AMD, define window.titaniumcore.
 * */
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = titaniumcore;
    }
    exports.titaniumcore = titaniumcore;
}else if (typeof define === 'function' && define.amd) {
    //define('titaniumcore', [], titaniumcore);
    define([], titaniumcore);
}else if(typeof window!=="undefined"){
    window.titaniumcore = titaniumcore;
}
else {
    // Hope with titaniumcore defined on top level in files, it will be in the
    // global object
    // (Should not even occur).
}
