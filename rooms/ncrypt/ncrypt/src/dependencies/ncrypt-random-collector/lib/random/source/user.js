var user = function(dep){

var pos = dep.pos;
var user = {};

var _array_shuffle = function(a){
    var input = [];
    for(var j=0; j<a.length; j++){ input[j] = a[j]; }
    for (var i = input.length-1; i >=0; i--) {
        var randomIndex = Math.floor(Math.random()*(i+1));
        var itemAtIndex = input[randomIndex];
        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
};
var _byte_from_pos = function(p){
    if(typeof p.x!=='number' && typeof p.y!=='number') return null;
    var x = p.x; if(typeof x!=='number') x = 0;
    var y = p.y; if(typeof y!=='number') y = 0;
    if(x===0 && y===0) return null;
    var n;
    if(x===0){
        n = y;
    }else if(y===0){
        n = x;
    }else{
        var r = Math.floor(Math.random() * (2 - 0)) + 0;
        if(r===0){ n = x; }else{ n = y; }
    }
    if(n>255){
        var s = n.toString()+'';
            s = s.split('');
            s = _array_shuffle(s);
        if(s.length<3){ n = s; }else{ n = [ s[0], s[1], s[2] ] }
        n = n.join('');
        n = parseInt(n);
    }
    return n;
};

// Uint8Array which will be filled with random values. It's buffer will be used
// for the output arrays.
var _buffer_source = null;

// Output array, will be filled with values from @_buffer_source.
var _out_array = null;
var _int_len = null;
var _buf_len = null;
var _fill_count = 0;
// Callbacks
var _callback_progress = null;
var _callback_done = null;

var _collect_handler = function(p){
    var rbyte = _byte_from_pos(p);
    if(typeof rbyte==='number'){
        _buffer_source[_fill_count] = rbyte;
        _fill_count += 1;
    }
    if(typeof _callback_progress==='function'){
        var prg = Math.round((_fill_count/_buf_len)*100);
        _callback_progress(prg);
    }
    if(_fill_count === _buffer_source.length){
        _stop();
    }
};

var _start = function(uintarr){
    if(!(typeof _buffer_source==='object' && _buffer_source===null)){
        return false; // collect is still running, can't start
    }
    // Get the required typed array type and buffer length
    if(typeof uintarr!=='object' || uintarr===null) return false;
    if(uintarr instanceof Uint8Array){
        _int_len = 8;
        _buf_len = uintarr.length;
    }else if(uintarr instanceof Uint16Array){
        _int_len = 16;
        _buf_len = uintarr.length*2;
    }else if(uintarr instanceof Uint32Array){
        _int_len = 32;
        _buf_len = uintarr.length*4;
    }else{ return false; }
    // Create buffer source
    _fill_count = 0;
    _buffer_source = new Uint8Array(_buf_len);
    // Start collecting values from user interaction
    return pos.listen.start(_collect_handler);
};
var _stop = function(){
    var ab;
    if(_int_len===8){
        ab = new Uint8Array(_buffer_source.buffer);
    }else if(_int_len===16){
        ab = new Uint16Array(_buffer_source.buffer);
    }else{
        ab = new Uint32Array(_buffer_source.buffer);
    }
    /* Reset values */
    _buffer_source = null;
    _out_array = null;
    _int_len = null;
    _buf_len = null;
    _fill_count = 0;
    _callback_progress = null;
    /* Callback */
    _callback_done(ab);
    _callback_done = null;
    return pos.listen.stop();
};

user.collect = function(uintarr, cb_done, cb_progress){
    if(typeof uintarr!=='object' ||
       typeof cb_done!=='function' ||
       (typeof cb_progress!=='undefined' && typeof cb_progress!=='function'))
    { return false; }
    if(!(uintarr instanceof Uint8Array ||
         uintarr instanceof Uint16Array ||
         uintarr instanceof Uint32Array ))
    { return false; }
    _callback_done = cb_done;
    if(typeof cb_progress==='function'){ _callback_progress = cb_progress; }
    return _start(uintarr);
};

return user;
};
module.exports = user;
