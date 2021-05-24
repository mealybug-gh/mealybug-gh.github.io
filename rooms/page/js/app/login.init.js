MobileCandyInit.tasks.push(function(opts, next){
    var login_values_optional = [ 'pass', 'anon' ];
    var login_values = {
        'user':      '',
        'pass':      '',
        'room':      '',
        'host':      '',
        'transport': '',
        'muc':       '',
        'anon':      ''
    };
    var query_to_json = function(str){
        // str = query string w/o trailing '?'
        try{
        if(typeof str!=='string' || str.length<1 || str.indexOf('=')<0) 
            return {};
        var pairs = str.slice(0).split('&');
        var result = {};
        pairs.forEach(function(pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });
        return JSON.parse(JSON.stringify(result));
        }catch(e){ return {}; }
    };
    var login_vals_from_hash = function(){
        /* Get query string in hash */
        var hash = window.location.hash;
        if(typeof hash!=='string' || hash.length<1) return false;
        hash = hash.split('?'); if(hash.length<1) return false;
        hash = hash[1];
        if(typeof hash!=='string' || hash.length<1) return false;
        /* Get JSON from query */
        var vals = query_to_json(hash);
        for(var k in login_values){
            if(typeof vals[k]==='string') login_values[k] = vals[k];
        }
        return true;
    };
    var hash_vals_to_form = function(){
        login_vals_from_hash();
        for(var k in login_values){
            var id = 'loginfield_'+k;
            var elem = document.getElementById(id);
            if(typeof elem==='object' && elem!==null){
                elem.value = login_values[k]+'';
            }
        }
        return true;
    };
    var login_vals_from_form = function(){
        for(var k in login_values){
            var id = 'loginfield_'+k;
            var elem = document.getElementById(id);
            if(typeof elem==='object' && elem!==null){
                var val = elem.value;
                if(typeof val==='string') login_values[k] = val+'';
            }
        }
        return true;
    };
    
    var missing_values = function(){
        alert("Please complete the login form, filling the required fields!");
        return false;
    };
    var do_login = function(){
        var randstr = function(len){
            var min = 65;  // 'A'
            var max = 122; // 'z'
            var str = '';
            for(var i=0; i<len; i++){
                var charcode = 
                    Math.floor(Math.random() * (max - min + 1)) + min;
                str += String.fromCharCode(charcode);
            } return str;
        };
        for(var k in login_values){
            var val = login_values[k];
            if(typeof val!=='string' || val.length<1){
                if(login_values_optional.indexOf(k)<0){
                    missing_values(); return false;
                }else{ login_values[k] = ''; }
            }
        }
        var user = login_values['user'];
        var pass = login_values['pass'];
        var room = login_values['room'];
        var host = login_values['host'];
        var transport = login_values['transport'];
        var muc = login_values['muc'];
        var anon = login_values['anon'];
        
        var jid;
        if(pass.length>0){
            if(user.indexOf('@')>=1){ jid = user; }else{ 
                jid = user+'@'+host; // random resource
            }
        }else{
            jid = user;
        }
        
        if(room.indexOf('@')<1) room = room+'@'+muc;
        
        if(anon.length<1 && pass.length<1) return missing_values();
        
        opts['candy'] = {
            'jid': jid,
            'pass': pass,
            'host': host,
            'room': room,
            'transport': transport,
            'muc': muc,
            'anon': anon,
            'resource': randstr(16)
        };
        setTimeout(function(){ next(opts); }, 0);
    };
    
    $('body>div').hide();
    $('#loginform').show();
    hash_vals_to_form(); // on load, set form values to hash values if there

    $('#loginfield_login').click(function(){
        login_vals_from_form();
        do_login();
    });
});
