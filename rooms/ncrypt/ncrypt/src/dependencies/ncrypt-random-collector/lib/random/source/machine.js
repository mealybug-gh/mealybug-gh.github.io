var machine = function(dep){

if(typeof require==='function' && typeof crypto==='undefined'){
    // make browserify not browserify the crypto module... any way to 
    // obfuscate
    try{
        var cr = [ 'c', 'r', 'y', 'p', 't', 'o' ];
            cr = cr.join('');
        crypto = require(cr);
    }catch(e){}
}

var _is_supported = function(){
    if((typeof crypto!=='object' || crypto===null) &&
       (typeof msCrypto!=='object' || msCrypto===null)) return false;
    if(typeof crypto==='object' && 
       crypto!==null && 
       typeof crypto.getRandomValues==='function') return true;
    if(typeof msCrypto==='object' && 
       msCrypto!==null && 
       typeof msCrypto.getRandomValues==='function') return true;
    if(typeof crypto==='object' && 
       crypto!==null && 
       typeof crypto.randomBytes==='function') return true;
    return false;
};

var _get_buffer = function(len){
    if(typeof len!=='number') return false;
    try{ len = parseInt(len); }catch(e){ return false; }
    var ab = null;
    if(typeof crypto!=='undefined' && crypto!==null && 
       typeof crypto.randomBytes==='function'){
        try{
            var a = crypto.randomBytes(len);
            ab = new Uint8Array(a);
        }catch(e){ return false; }
    }else if(typeof crypto!=='undefined' && crypto!==null && 
       typeof crypto.getRandomValues==='function'){
           ab = new Uint8Array(len);
           try{ crypto.getRandomValues(ab); }catch(e){ return false; }
    }else if(typeof msCrypto!=='undefined' && msCrypto!==null && 
       typeof msCrypto.getRandomValues==='function'){
           ab = new Uint8Array(len);
           try{ msCrypto.getRandomValues(ab); }catch(e){ return false; }
    }else{ return false; }
    if(ab===null) return false;
    return ab;
};

var _fill = function(uintarr){
    // Get the required typed array type and buffer length
    var _int_len = null; var _buf_len = null;
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
    // Fill the buffer source
    var _buffer_source = _get_buffer(_buf_len);
    // Create the result array
    var ab;
    if(uintarr instanceof Uint8Array){
        ab = new Uint8Array(_buffer_source.buffer);
    }else if(uintarr instanceof Uint16Array){
        ab = new Uint16Array(_buffer_source.buffer);
    }else if(uintarr instanceof Uint32Array){
        ab = new Uint32Array(_buffer_source.buffer);
    }else{ return false; }
    return ab;
};

machine.isSupported = function(){
    return (_is_supported()===true);
};
machine.collect = function(uintarr, cb_done){
    if(!_is_supported()) return false;
    if(typeof cb_done!=='function'){ return false; }
    var ab = _fill(uintarr);
    if(typeof ab==='boolean') return false;
    setTimeout(function(){
        cb_done(ab);
    }, 0);
    return true;
};

return machine;
};
module.exports = machine;
