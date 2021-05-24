/**
 * @namespace randomCollector.random
 * */
var rand = function(dep){
var rand = {};

var _sources = dep.source;

var _source = {
    'USER': 'user',
    'MACHINE': 'machine'
};
rand.source = (function(){ return JSON.parse(JSON.stringify(_source)); })();

/**
 * @namespace randomCollector.random.check
 * */
rand.check = {};
/**
 * Check whether a built-in random generator is available. If so, random
 * values can be collected using `randomCollector.random.source.MACHINE` as
 * a source.
 * @returns {boolean}
 * @name hasBuiltInRNG
 * @function
 * @memberof randomCollector.random.check
 * */
rand.check.hasBuiltInRNG = function(){
    return (_sources.machine.isSupported()===true);
};

/**
 * Check whether mouse or touch support is available. If so, random values 
 * can be collected from user interaction using 
 * `randomCollector.random.source.USER` as a source. (Mouse or touch support
 * usually is available when running in a browser.)
 * @returns {boolean}
 * @name hasMouseOrTouchSupport
 * @function
 * @memberof randomCollector.random.check
 * */
rand.check.hasMouseOrTouchSupport = function(){
    if(typeof self!=='object' || self===null) return false;
    if(typeof self.document!=='object' || self.document===null) return false;
    if(('onmousemove' in self.document)===true) return true;
    if(('ontouchmove' in self.document)===true) return true;
    return false;
};

/**
 * Collect random values either from user interaction (i.e. mousemoves or 
 * touchmoves) or from built-in random number generators.
 * @param {string} collector_source - Collector source, i.e. 'machine' or 
 * 'user'. A value found in {@link randomCollector.random.source}.
 * @param {object} uintarr - A typed array of a certain length. Only unsigned
 * integer arrays (`Uint8Array`, `Uint16Array`, `Uint32Array`) are supported.
 * To generate an empty `Uint8Array` with 256 elements for example, 
 * call `var ab = new Uint8Array(256);`. Please note the array passed will stay
 * unchanged, the random values array will be passed to the callback.
 * @param {function} cb_done - function([TypedArray] random_values). Will be 
 * called as a final callback, the types array filled with random values passed
 * as an argument.
 * @param {function} cb_progress - Progress callback. Will only be called at all
 * if collecting random values from user interaction. function([int] 
 * progress_in_percent).
 * @returns {boolean} - True, if collecting values could be started, false 
 * otherwise. (For example in case of invalid arguments.)
 * @name collect
 * @function
 * @memberof randomCollector.random
 * */
rand.collect = function(collector_source, uintarr, cb_done, cb_progress){
    /* Validate */
    if(typeof collector_source!=='string' || typeof cb_done!=='function')
    { return false; }
    var source_valid = false;
    for(var k in _source){
        var s = _source[k];
        if(s===collector_source) source_valid = true;
    }
    if(!source_valid) return false;
    /* Get source */
    var cs = _sources[collector_source];
    return cs.collect(uintarr, cb_done, cb_progress);
};

return rand;
};
module.exports = rand;
