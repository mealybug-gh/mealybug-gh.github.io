var evt = {};

_listeners = {};

evt.listener = {};
evt.listener.add = function(name, listener, ctx){
    if(typeof ctx==='undefined' || 
       (typeof ctx==='object' && ctx===null)){
        if(typeof self.document!=='undefined'){
            ctx = self.document;
        }else{
            ctx = self;
        }
    }
    try{
        ctx.addEventListener(name, listener, false);
    }catch(e){ return e; }
    
    if(typeof _listeners[name]!=='object'){
        _listeners[name] = [];
    }
    _listeners[name].push(listener);
    return true;
};

evt.listener.remove = function(name, listener, ctx){
    if(typeof ctx==='undefined' || 
       (typeof ctx==='object' && ctx===null)){
        if(typeof self.document!=='undefined'){
            ctx = self.document;
        }else{
            ctx = self;
        }
    }
    if(typeof listener==='undefined' ||
       (typeof listener==='object' && listener===null)){
           try{
               var lst = _listeners[name];
               if(typeof lst!=='object' || lst===null) return true;
               for(var i=0; i<lst.length; i++){
                    var l = lst[i];
                    ctx.removeEventListener(name, l, false);
               }
           }catch(e){ return e; }
    }else{
        try{
            ctx.removeEventListener(name, listener, false);
        }catch(e){ return e; }
    }
    return true;
};

module.exports = evt;
