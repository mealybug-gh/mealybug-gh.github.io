var MobileCandyInit = {
    'tasks': [],
    'opts': {
        'candy': {},
        'crypto': {}
    }
};
$(document).ready(function(){
    var iterate = function(tasks){
        if(tasks.length<1) return;
        var task = tasks.shift();
        setTimeout(function(){
            task(MobileCandyInit.opts, function(opts){
                MobileCandyInit.opts = opts;
                iterate(tasks);
            });
        }, 0);
    };
    iterate(MobileCandyInit.tasks);
});
