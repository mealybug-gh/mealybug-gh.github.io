var pos = function(dep){

var pos = {};
var evt = dep.evt;

var _handler = null;
var _get_handler = function(recv){
    var fn = function(e){
        var p = { 'x' : null, 'y' : null };
        if(e.type == 'touchstart' || 
           e.type == 'touchmove' || 
           e.type == 'touchend' || 
           e.type == 'touchcancel'){
            var touch = e.originalEvent.changedTouches[0] || 
                        e.originalEvent.touches[0];
            p.x = touch.clientX || touch.pageX;
            p.y = touch.clientY || touch.pageY;
        }else if (e.type == 'mousedown' || 
                   e.type == 'mouseup' || 
                   e.type == 'mousemove' || 
                   e.type == 'mouseover'|| 
                   e.type=='mouseout' || 
                   e.type=='mouseenter' || 
                   e.type=='mouseleave') {
            p.x = e.clientX || e.pageX;
            p.y = e.clientY || e.pageY;
        }else {};
        recv(p);
        e.preventDefault();
    };
    return fn;
};

pos.listen = {};
pos.listen.start = function(handler){
    if(!(typeof _handler==='object' && _handler===null)) return false;
    var ctxt = self;
    if(typeof self.document!=='undefined') ctxt = self.document;
    var h = _get_handler(handler);
    var e_touch = evt.listener.add('touchmove', h, ctxt);
    var e_mouse = evt.listener.add('mousemove', h, ctxt);
    if(typeof e_touch!=='boolean' && typeof e_mouse!=='boolean'){
        return false;
    }
    _handler = h;
    return true;
};

pos.listen.stop = function(){
    if(typeof _handler==='object' && _handler===null) return true;
    var ctxt = self;
    if(typeof self.document!=='undefined') ctxt = self.document;
    var e_touch = evt.listener.remove('touchmove', _handler, ctxt);
    var e_mouse = evt.listener.remove('mousemove', _handler, ctxt);
    if(typeof e_touch!=='boolean' && typeof e_mouse!=='boolean'){
        return false;
    }
    _handler = null;
    return true;
};


return pos;
};
module.exports = pos;
