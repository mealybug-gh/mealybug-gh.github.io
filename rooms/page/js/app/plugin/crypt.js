var MobileCandyCrypto = (function(self) 
    { return self; }(MobileCandyCrypto || {}));

MobileCandyCrypto.RoomEncryption = (function(self, Candy, $) {

self.options = {};

var debugLog = function(msg){
    if(console && typeof console.log==='function'){
        console.log(msg);
    }
};
var to_id = function(str){
    var id = 'i'+nCrypt.hash.hash(str, 'sha1', 'base64url')+'i';
    return id;
};

var array_uniq = function(arr){
    /* 
     * Fastest implementation?
     * http://jszen.com/best-way-to-get-unique-values-of-an-array-in-javascript.7.html 
     * */
    var n = {}; var r=[];
    for(var i = 0; i < arr.length; i++) 
    {
        if (!n[arr[i]]) 
        {
            n[arr[i]] = true; 
            r.push(arr[i]); 
        }
    }
    return r;
};
var remove_from_array_uniq = function(arr, itm){
    var array = array_uniq(arr);
    for(var i = array.length-1; i--;){
        if (array[i] === itm) array.splice(i, 1);
    }
    return array;
};

var MessageEncryption = function(opts, room){
    var cipher = opts.sym.cipher;
    var waitSeconds = opts.proto.wait;
    
    var roomJid = room+'';
    
    var keys = {};
    keys.own  = {
        'asym': {
            'priv': {
                'ks': JSON.parse(opts.asym.priv.ks),
                'pass': opts.asym.priv.pass
            },
            'pub': JSON.parse(opts.asym.pub)
        },
        'sym': [ (nCrypt.random.str.generate(256, 'base64url', true)) ]
    };
    keys.from = {
        // keys.from[to_id('jid')] = 
        //              { 'sec': ecsec['sec'], 'tag': ecsec['tag'], 'sks': [] }
    };
    keys.sent = [];
    
    this._keys = keys;
    
    var TYPES = [ 'PK', 'SK' ];
    
    /* canSend to room?*/
    var _cansend = {};
    _cansend.boolCanSend = false;
    _cansend.lastProtocolMessageTime = ((new Date()).getTime());
    this.cansend = {};
    this.cansend.canSend = function(){
        if(_cansend.boolCanSend) return true;
        var nowTime = ((new Date()).getTime());
        var diff = Math.round((nowTime-_cansend.lastProtocolMessageTime)/1000);
        if(diff>waitSeconds) _cansend.boolCanSend = true;
        return (_cansend.boolCanSend===true);
    };
    this.cansend.canSendToUser = function(jid, forPrivateMessage){
        if(typeof jid!=='string' || jid.length<1 || !keys.from[to_id(jid)])
            return false;
        var hasKeys = keys.from[to_id(jid)]['sks'].length>0;
        if(forPrivateMessage) hasKeys = 
                        ((typeof keys.from[to_id(jid)]['sec']==='string') 
                        && (keys.from[to_id(jid)]['sec'].length>1));
        return hasKeys;
    };
    
    this.msg = {};
    this.msg.sender   = {}; // Send request, i.e. key request etc.
    this.msg.receiver = {}; // Answer requests
    this.msg.check = {};    // Detect message type
    this.msg.message  = {}; // Encrypt / decrypt normal messages
    
    var is_json_str = function(str){
        if(typeof str!=='string' || str.length<1) return false;
        if(str.indexOf('{')!==0 || str.lastIndexOf('}')!==(str.length-1))
            return false;
        try{ JSON.stringify(JSON.parse(str)); return true; }
        catch(e){ return false; }
    };
    this.msg.check.isPubkey = function(m){
        if(!is_json_str(m)) return false;
        var o = JSON.parse(m);
        if(typeof o['t']==='number' && typeof TYPES[o['t']]==='string' &&
           TYPES[o['t']]==='PK'){
            var pk = o['c'];
            if(typeof pk!=='object' || pk===null) return false;
            try{ pk = JSON.stringify(pk); }catch(e){ return false; }
            return true;
        }
        return false;
    };
    this.msg.check.isSymkey = function(m){
        /*'t': TYPES.indexOf('SK'),
        'c': {
            's': JSON.parse(enc),
            't': keys.from[to_id(userJid)]['tag']
        }*/
        if(!is_json_str(m)) return false;
        var o = JSON.parse(m);
        if(typeof o['t']==='number' && typeof TYPES[o['t']]==='string' &&
           TYPES[o['t']]==='SK'){
            var c = o['c'];
            if(typeof c!=='object' || c===null) return false;
            var sk = c['s']; var tag = c['t'];
            return ( (typeof sk ==='object' && sk !==null) &&
                     (typeof tag==='object' && tag!==null) );
        }
        return false;
    };
    this.msg.check.isProtocolMessage = function(m){
        if(!is_json_str(m)) return false;
        var o = JSON.parse(m);
        if(typeof o['t']==='number' && typeof TYPES[o['t']]==='string'){
            var c = o['c'];
            //if(typeof c!=='object' || c===null) return false;
            if( (typeof c==='object' && c!==null) ){
                _cansend.lastProtocolMessageTime = ((new Date()).getTime());
                return true;
            }
        }
        return false;
    };
    this.msg.check.isNormalMessage = function(m){
        // normal encrypted text message, whether room or private chat
        // protocol messages are dropped earlier, i.e. this doesn't
        // check for protocol messages
        if(!is_json_str(m)) return false;
        // (string) 'cipher', (string) 'salt', (string) 'ct', 
        // (int) 'iter', (int) 'ks'
        var o = JSON.parse(m);
        if(typeof o['cipher']!=='string' ||
           typeof o['salt']!=='string' ||
           typeof o['ct']!=='string' ||
           typeof o['iter']!=='number' ||
           typeof o['ks']!=='number'){
            return false;
        }
        return true;
    };
    /*this.msg.check.isUnhandledTextMessage = function(m){
        // unhandled message
    };*/
    
    this.msg.sender.publicKey = function(){
        var m = {
            't': TYPES.indexOf('PK'), // in general, this is a request to answer
            'c': keys.own.asym.pub // message content
        };
        m = JSON.stringify(m);
        return m;
    };
    var msg_sender_symkey = function(req, userJid){
        // cleartext
        var sk  = keys.own.sym[keys.own.sym.length-1]; 
        // ecies secret 
        if(typeof keys.from[to_id(userJid)]!=='object' || 
           keys.from[to_id(userJid)]===null){
            // receiver pk
            var pk  = JSON.stringify(JSON.parse(req)['c']); 
            var ecsec = nCrypt.asym.simple.secret.ecies.derive(pk);
            if(nCrypt.dep.SecureExec.tools.proto.inst.isException(ecsec)){
                // DEBUG: Failed to generate secret, probably malformed pubkey
                return;
            };
            keys.from[to_id(userJid)] = {
                'jid': userJid+'',
                'sec': ecsec['sec'], 'tag': ecsec['tag'],
                'sks': [] //, 'pk': pk
            };
        }
        var enckey = keys.from[to_id(userJid)]['sec'];
        var enc = nCrypt.sym.sync.encrypt(sk, enckey, cipher, {});
        if(nCrypt.dep.SecureExec.tools.proto.inst.isException(enc)){
            // DEBUG: Failed to encrypt symmetric key
            return;
        };
        var m = {
            't': TYPES.indexOf('SK'),
            'c': {
                's': JSON.parse(enc),
                't': keys.from[to_id(userJid)]['tag']
            }
        };
        return JSON.stringify(m);
    };
    this.msg.sender.symKey = msg_sender_symkey;
    this.msg.sender.sentSymkey = function(userJid){
        keys.sent.push(to_id(userJid));
        keys.sent = array_uniq(keys.sent);
    };
    this.msg.receiver.symKey = function(userJid, m){
        var o = JSON.parse(m);
        var c = o['c'];
        if(typeof c!=='object' || c===null) return false;
        var sk = c['s']; var tag = c['t'];
        if(typeof keys.from[to_id(userJid)]!=='object' ||
            keys.from[to_id(userJid)]===null){
            var sec = nCrypt.asym.simple.secret.ecies.restore(
                        JSON.stringify(tag),
                        JSON.stringify(keys.own.asym.priv.ks),
                        keys.own.asym.priv.pass);
            if(nCrypt.dep.SecureExec.tools.proto.inst.isException(sec)){
                debugLog('Failed to restore shared secret!');
                // DEBUG: Failed to restore shared secret, malformed or 
                //        false address?
                return;
            };
            keys.from[to_id(userJid)] = {
                'jid': userJid+'',
                'sec': sec, 'tag': tag,
                'sks': [] //, 'pk': pk
            };
        }
        var deckey = keys.from[to_id(userJid)]['sec'];
        var symkey = nCrypt.sym.sync.decrypt(JSON.stringify(sk), deckey);
        if(typeof symkey!=='string'){
            // DEBUG: Decrypting symmetric key failed, malformed or not 
            //        addressed to user.
            return false;
        }
        keys.from[to_id(userJid)]['sks'].push(symkey);
        if(keys.sent.indexOf(to_id(userJid))<0){
            var res = msg_sender_symkey(null, userJid);
            if(typeof res==='string') return res;
        }
        return false;
    };
    
    this.msg.message.encrypt = function(txt, isPrivate, userJidIfPrivate){
        if(typeof txt!=='string' || txt.length<1) return false;
        var skey = keys.own.sym[keys.own.sym.length-1];
        if(isPrivate){
            var userJid = userJidIfPrivate;
            if(keys.from[to_id(userJid)] && 
               typeof keys.from[to_id(userJid)]['sec']==='string'){
                skey = keys.from[to_id(userJid)]['sec'];
                skey = nCrypt.hash.hash(skey, 'sha256', 'base64url');
            }else{
                return false;
            }
        }
        var mtxt = nCrypt.sym.sync.encrypt(txt, skey, cipher);
        if(typeof mtxt!=='string' || mtxt.length<1) return false;
        return mtxt;
    };
    this.msg.message.decrypt = 
        function(txt, userJid, userCurrent, isPrivate, receiverJidPrivate){
        if(userJid!==userCurrent){
            var keyo = keys.from[to_id(userJid)];
            if(typeof keyo!=='object' || keyo===null) 
                return null; // no key from user
            var sks = keyo['sks'];
                if(isPrivate){
                    if(keys.from[to_id(userJid)] && 
                       typeof keys.from[to_id(userJid)]['sec']==='string'){
                        var skey = keys.from[to_id(userJid)]['sec'];
                        skey = nCrypt.hash.hash(skey, 'sha256', 'base64url');
                        sks = [ skey ];
                    }else{
                        return null;
                    }
                }
        }else{
            sks = keys.own.sym;
            if(isPrivate){
                var recvJid = receiverJidPrivate;
                if(keys.from[to_id(recvJid)] && 
                   typeof keys.from[to_id(recvJid)]['sec']==='string'){
                    var skey = keys.from[to_id(recvJid)]['sec'];
                    skey = nCrypt.hash.hash(skey, 'sha256', 'base64url');
                    sks = [ skey ];
                }else{
                    return null;
                }
            }
        }
        
        if(sks.length<1) return null; // no key from user, yet
        if(sks.length>10){
            // only use the last 10 keys
            sks = sks.slice( ((sks.length-1)-9) ); 
        }else{ sks = sks.slice(0); }
        
        var k;
        for(var i=(sks.length-1); i>=0; i--){
            k = sks[i];
            var dec = nCrypt.sym.sync.decrypt(txt, k);
            if(typeof dec==='string') return dec;
        }
        if(isPrivate) return null;
        
        k = sks[sks.length-1];
        for(var i=0; i<2; i++){
            if(typeof k!=='string') break;
            k = nCrypt.hash.hash(k, 'sha256', 'base64url');
            var dec = nCrypt.sym.sync.decrypt(txt, k);
            if(typeof dec==='string'){
                keyo['sks'].push(k);
                return dec;
            }
        }
        
        return null; // failed to decrypt
    };
    
    this.actions = {};
    
    this.actions.events = {};
    
    this.actions.events.users = {};
    this.actions.events.users.onUserJoin = function(userJid){
        var hash_symkeys = function(){
            var last = keys.own.sym[keys.own.sym.length-1];
            var next = nCrypt.hash.hash(last, 'sha256', 'base64url');
            keys.own.sym.push(next);
            for(var k in keys.from){
                if(keys.from[k]){
                    var sks = keys.from[k]['sks'];
                    if(sks.length > 0){
                        var last = sks[sks.length-1];
                        var next = nCrypt.hash.hash(
                            last, 'sha256', 'base64url');
                        sks.push(next);
                    }
                }
            }
        };

        // ROUNDDOOR-FIX: Remove keys from Array as the user in the list might have just rejoined
        // remove user from arrays
        keys.from[to_id(userJid)] = undefined;
        if(keys.sent.indexOf(to_id(userJid))>=0){
            keys.sent = 
                remove_from_array_uniq(keys.sent, to_id(userJid));
        }
        
        hash_symkeys();
    };
    this.actions.events.users.onUserLeave = function(userJid, reason){
        var on_room_left = function(userJid){
            if ( ! keys.from[to_id(userJid)] ) {
              return null;
            }
            // remove user from arrays
            keys.from[to_id(userJid)] = undefined;
            if(keys.sent.indexOf(to_id(userJid))>=0){
                keys.sent = 
                    remove_from_array_uniq(keys.sent, to_id(userJid));
            }
            // generate new message key
            var get_encsk_for_user = function(ujid){
                if(  !keys.from[to_id(ujid)] || 
                     typeof keys.from[to_id(ujid)]['sec']!=='string'){
                    return false;
                }
                var sk = keys.own['sym'][ keys.own['sym'].length-1 ];
                var enckey = keys.from[to_id(ujid)]['sec'];
                var enc = nCrypt.sym.sync.encrypt(sk, enckey, cipher, {});
                if(nCrypt.dep.SecureExec.tools.proto.inst.isException(enc)){
                    // DEBUG: Failed to encrypt symmetric key
                    return false;
                };
                var m = {
                    't': TYPES.indexOf('SK'),
                    'c': {
                        's': JSON.parse(enc),
                        't': keys.from[to_id(ujid)]['tag']
                    }
                };
                return JSON.stringify(m);
            };

            /* !!! WARNING: TEMPORARY - INSECURE !!! */
            /* !!! If a user has access to the server without being in the roster, they'll
             * be able to decrypt messages without the other participants realizing they're
             * still reading !!! */
            // var last = keys.own.sym[keys.own.sym.length-1];
            // var next = nCrypt.hash.hash(last, 'sha256', 'base64url');
            // keys.own['sym'].push(next);
            
            keys.own['sym'].push(
              nCrypt.random.str.generate(256, 'base64url', true) );
            
            // encrypt message key for each user in room
            // shouldn't take long as if we've already sent them another
            // encrypted symkey, cached pbkdf2 has already cached the key
            var newsks = {};
            for(var u in keys.from){
                if(keys.from[u]){
                    var ujids = keys.from[u]['jid'];
                    var encsk = get_encsk_for_user(ujids);
                    if(typeof encsk==='string'){
                        newsks[ujids] = encsk;
                    }
                }
            }
            return newsks;
        };
        return on_room_left(userJid);
    };
    this.actions.events.users.onUserNickChange = function(oldJid, newJid){
        if(keys.from[to_id(oldJid)]){
            keys.from[to_id(newJid)] = keys.from[to_id(oldJid)];
            keys.from[to_id(newJid)]['jid'] = newJid;
            keys.from[to_id(oldJid)] = undefined; // remove
        }
        if(keys.sent.indexOf(to_id(oldJid))>=0){
            keys.sent = 
                remove_from_array_uniq(keys.sent, to_id(oldJid));
            keys.sent.push(to_id(newJid));
            keys.sent = array_uniq(keys.sent);
        }
    };
    
    this.actions.retrieve = {};
    this.actions.retrieve.getSymkey = function(){
        return keys.own.sym[keys.own.sym.length-1];
    };
    this.actions.retrieve.getSharedSecretHash = function(userJid){
        if(!keys.from[to_id(userJid)] || 
           typeof keys.from[to_id(userJid)]['sec']!=='string'){
            return false;
        }
        var sec = keys.from[to_id(userJid)]['sec'];
        var hsec = nCrypt.hash.hash(sec, 'sha256', 'hex');
        while( hsec.length % 6 ){
            hsec = hsec + '0';
        }
        return hsec;
    };
};
MessageEncryption.prototype.parseOptions = function(_opts){
    /* Parse options 
     * {
     *     'proto': { 'wait': <waitseconds> },
     *     'sym': { 'cipher': <cipher> },
     *     'asym': {
     *         'priv': { 'pass': <keyset password>, 'ks': <full keyset> },
     *         'pub' : <public keyset>
     *     }
     * }
     * */
    var isObj = function(o){ return (typeof o==='object' && o!==null); };
    var isObjString = function(s){
        try{ var o = JSON.parse(s); }catch(e){ return false; }
        return isObj(o);
    };
    var isStr = function(s){ return (typeof s==='string'); };
    var copyObj = function(o){ return JSON.parse(JSON.stringify(o)); };
    var defaultOpts = {
        'proto': { 'wait': 15 },
        'sym'  : { 'cipher': 'aes' }
    };
    var res = copyObj(defaultOpts); 
    if(!isObj(_opts)) return false;
    /* Parse _opts['asym'] */
    res['asym'] = {}; res['asym']['priv']={};
    if(!isObj(_opts['asym']) || !isObj(_opts['asym']['priv'])) return false;
    var reqStrs = [ 
        _opts['asym']['priv']['pass'], 
        _opts['asym']['priv']['ks'],
        _opts['asym']['pub']
    ];
    for(var i=0; i<reqStrs.length; i++){
        var s = reqStrs[i]; if(!isStr(s) || s.length<1) return false;
    }
    res['asym']['priv']['pass'] = _opts['asym']['priv']['pass'];
    if(!isObjString(_opts['asym']['priv']['ks'])) return false;
    if(!isObjString(_opts['asym']['pub'])) return false;
    res['asym']['priv']['ks'] = _opts['asym']['priv']['ks'];
    res['asym']['pub'] = _opts['asym']['pub'];
    /* Parse _opts['sym'] */
    if( isObj(_opts['sym']) && isStr(_opts['sym']['cipher']) &&
    _opts['sym']['cipher'].length>0 && 
    nCrypt.sym.getAvailable().
        indexOf(_opts['sym']['cipher'].toLowerCase())>=0 ){
        res['sym']['cipher'] = _opts['sym']['cipher'].toLowerCase();
    }
    /* Parse _opts['proto'] */
    if( isObj(_opts['proto']) && typeof _opts['proto']['wait']==='number' &&
    !isNaN(_opts['proto']['wait']) && _opts['proto']['wait']>5 ){
        res['proto']['wait'] = Math.round(_opts['proto']['wait']);
    }
    /* Done */
    return copyObj(res);
};

var RoomsMessageEncryption = [];

self.events = {};

self.events.action = {};
self.events.action.onRoomJoin  = function(roomJid, userJid){
    debugLog("ACTION: action: join; room: "+roomJid+ "; user: "+userJid);
    // DEBUG: ("ACTION: action: join; room: "+roomJid+ "; user: "+userJid);
    var roomId  = to_id(roomJid);
    if(typeof RoomsMessageEncryption[roomId]!=='object' || 
        RoomsMessageEncryption[roomId]===null){
        RoomsMessageEncryption[roomId] = new 
            MessageEncryption(self.options, roomJid);
    } else {
      // ROLE CHANGE FIX: Do not re-process room after repeated join messages.
      return;
    }
    
    var msgE = RoomsMessageEncryption[roomId];
    
    if(typeof window.msgerooms!=='object')  window.msgerooms = [];
    window.msgerooms.push(msgE);
    
    var txt = msgE.msg.sender.publicKey();
    Candy.Core.Action.Jabber.Room.Message(roomJid, txt, 'groupchat');
    
    var infoMessage = Candy.View.Pane.Chat.infoMessage;
    infoMessage(roomJid, '[CRYPTO | INIT | START]', 
                'Calculating and exchanging initial keys.');
    var intv = setInterval(function(){
        if(msgE){
            if(msgE.cansend.canSend()){
                clearInterval(intv);
                infoMessage(roomJid, '[CRYPTO | INIT | DONE]',
                            'You should be able to send messages now.');
                var room = Candy.Core.getRoom(roomJid); if(!room) return;
                var roster = room.roster.items;
                for(var uJid in roster){
                    var hsec = msgE.actions.retrieve.getSharedSecretHash(uJid);
                    if(hsec){
                        infoMessage(roomJid, '[CRYPTO | KEYS | INFO]',
                        'Key-ID for '+uJid+': '+hsec);
                    }
                }
            }
        }
    }, 1000, 10000);
    
    return;
};
self.events.action.onRoomLeave = function(roomJid){
    debugLog("ACTION: action: leave/kick/ban; room: "+roomJid+
             "; user: "+userJid);
    // DEBUG: ("ACTION: action: leave/kick/ban; room: "+roomJid+ "; user: "+userJid);
    var roomId  = to_id(roomJid);
    if(typeof RoomsMessageEncryption[roomId]!=='object' || 
        RoomsMessageEncryption[roomId]===null){
        RoomsMessageEncryption[roomId] = undefined;
        /* TODO: Are private rooms handled correctly on leave / rejoin? */
    }
};

self.events.receive = {};
self.events.receive.onRoomJoin        = function(roomJid, userJid){
    debugLog("RECEIVE: action: join; room: "+roomJid+"; user: "+userJid);
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return;
    
    //msgE.actions.hashSymkeysOnJoin();
    msgE.actions.events.users.onUserJoin(userJid);
    
    var infoMessage = Candy.View.Pane.Chat.infoMessage;
    infoMessage(roomJid, '[CRYPTO | JOIN | START]', 
        'Exchanging keys with \''+userJid+'\'.');
    var hasKeyId = false;
    var intv = setInterval(function(){
        if(msgE){
            if( !hasKeyId && msgE.cansend.canSendToUser(userJid, true) ){
                var hsec = msgE.actions.retrieve.getSharedSecretHash(userJid);
                if(hsec){
                    hasKeyId = true;
                    infoMessage(roomJid, '[CRYPTO | KEYS | INFO]',
                    'Key-ID for '+userJid+': '+hsec);
                }
            }
            if( msgE.cansend.canSendToUser(userJid, false) ){
                clearInterval(intv);
                infoMessage(roomJid, '[CRYPTO | JOIN | DONE]',
                            'Key exchange with user \''+userJid+'\' complete.');
            }
        }
    }, 1000, 1000);
};
self.events.receive.onRoomLeave       = function(roomJid, userJid){
    debugLog("RECEIVE: action: leave; room: "+roomJid+"; user: "+userJid);
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return;
    var newSks = msgE.actions.events.users.onUserLeave(userJid, 'leave');
    if(! newSks) return;
    for(var ujid in newSks){
        var sks = newSks[ujid];
        try{ 
            Candy.Core.Action.Jabber.Room.Message(ujid, sks, 'chat'); 
            msgE.msg.sender.sentSymkey(ujid);
        }catch(e){}
    }
    var infoMessage = Candy.View.Pane.Chat.infoMessage;
    infoMessage(roomJid, '[CRYPTO | LEAVE | INFO]',
        'Generating and exchanging new keys. (This might result in some '+
        'undecryptable messages in the next few seconds.)');
};
self.events.receive.onRoomRemovedFrom = function(roomJid, userJid){
    debugLog("RECEIVE: action: kick/ban; room: "+roomJid+"; user: "+userJid);
    // DEBUG: ("RECEIVE: action: kick/ban; room: "+roomJid+"; user: "+userJid);
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return;
    var newSks = msgE.actions.events.users.onUserLeave(userJid, 'kick');
    if(! newSks) return;
    for(var ujid in newSks){
        var sks = newSks[ujid];
        try{ 
            Candy.Core.Action.Jabber.Room.Message(ujid, sks, 'chat'); 
            msgE.msg.sender.sentSymkey(ujid);
        }catch(e){}
    }
    var infoMessage = Candy.View.Pane.Chat.infoMessage;
    infoMessage(roomJid, '[CRYPTO | LEAVE | INFO]',
        'Generating and exchanging new keys. (This might result in some '+
        'undecryptable messages in the next few seconds.)');
};
self.events.receive.onMessageReceive = function(roomJid, userJid, m){
    var room = Candy.Core.getRoom(roomJid);
    if(typeof room!=='object' || room===null || 
        typeof room['user']!=='object' || room['user']===null) return;
    var userCurrent  = room.getUser().data.jid;
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return;
    debugLog("RECEIVE: message: groupchat; room: "+roomJid+"; user: "+userJid);
    debugLog(m['body']);
    // DEBUG: ("RECEIVE: message: groupchat; room: "+roomJid+"; user: "+userJid);
    var txt = m['body'];
    if(msgE.msg.check.isPubkey(txt)){
        if(userJid!==userCurrent){

            // ROUNDDOOR-FIX: Call "onRoomJoin" when a public key has been received
            self.events.receive.onRoomJoin(roomJid, userJid);
            
            var m = msgE.msg.sender.symKey(txt, userJid);
            Candy.Core.Action.Jabber.Room.Message(userJid, m, 'chat');
        }
        return false;
    }
    return true;
};
self.events.receive.onMessagePrivateReceive = function(roomJid, userJid, m){
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return;
    var txt = m['body'];
    debugLog("RECEIVE: message: chat; room: "+roomJid+"; user: "+userJid);
    debugLog(txt);
    // DEBUG: ("RECEIVE: message: chat; room: "+roomJid+"; user: "+userJid);
    if(msgE.msg.check.isSymkey(txt)){
        var answer = msgE.msg.receiver.symKey(userJid, txt);
        if(typeof answer==='string'){
            Candy.Core.Action.Jabber.Room.Message(userJid, answer, 'chat');
            msgE.msg.sender.sentSymkey(userJid);
        }
        return false;
    }
    return true;
};

self.events.commands = {};
self.events.commands.onCommandMsg = function(roomJid, txt){
    console.log("Command message from room "+roomJid+": "+txt);
};

self.events.candy = {};
self.events.candy.handleRoomPresence = function(e, args){
    if(typeof args['action']!=='string') return; // roster didn't change
    var action = args['action'];
    var roomJid = args['roomJid'];
    var room = Candy.Core.getRoom(roomJid);
    if(typeof room!=='object' || room===null || 
        typeof room['user']!=='object' || room['user']===null) return;
    var userCurrent  = room.getUser().data.jid;
    var userPresence = args['user'].data.jid;
    if(userPresence===userCurrent){
        // own presence changed
        if(action==='leave' || action==='kick' || action==='ban'){
            self.events.action.onRoomLeave(roomJid, userPresence);
        }else if(action==='join'){
            self.events.action.onRoomJoin(roomJid, userPresence);
        }else{}
    }else{
        // someone else presence changed
        if(action==='leave'){
            self.events.receive.onRoomLeave(roomJid, userPresence);
        }else if(action==='kick' || action==='ban'){
            self.events.receive.onRoomRemovedFrom(roomJid, userPresence);
        }else if(action==='join'){
            // ROUNDDOOR-FIX: Do not handle joining a room as presence.
            //                A user indicates they've actually joined by sending their public key.
            // self.events.receive.onRoomJoin(roomJid, userPresence);
        }else{}
    }
};
self.events.candy.handleNickChange = function(e, args){
    // roomJid, oldNick, newNick, oldJid, newJid
    var roomJid = args['roomJid'].split('/')[0];
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return false;
    msgE.actions.events.users.onUserNickChange(args['oldJid'], args['newJid']);
    return true;
};
self.events.candy.handleTextMessage = function(e, args){
    var msgo = args['message'];
        /* Return when message is not a normal chat/muc message */
        if(typeof msgo['type']!=='string' || msgo['type']==='info') return;
        if(typeof msgo['delay']==='boolean' && msgo['delay']) return;
        if(msgo['type']!=='chat' && msgo['type']!=='groupchat') return;
        /* TODO: handle non-muc messages with an "unencrypted" info etc. */
        if(msgo['isNoConferenceRoomJid']) return;
    var roomJid = args['roomJid'];
    if(msgo['type']==='groupchat'){
        var userJid = msgo['from']+'/'+msgo['name'].split('@')[0];
        self.events.receive.onMessageReceive(roomJid, userJid, msgo);
    }else if(msgo['type']==='chat'){
        var userJid = roomJid;
            roomJid = userJid.split('/')[0];
        self.events.receive.onMessagePrivateReceive(roomJid, userJid, msgo);
    }else{}
};
self.events.candy.onBeforeSendMessage = function(e, args){
    var is_command = function(m){
        if(typeof m!=='string' || m.length<1) return false;
        m = nCrypt.tools.proto.str.trim(m);
        if(m.indexOf('/')===0) return true;
        return false;
    };
    if(is_command(args['message'])){
        // call command handler, no message to send
        self.events.commands.onCommandMsg(roomJid, args['message']);
        return false;
    }
    var isPrivate = ((args['roomJid'].indexOf('/')>=0)===true);
    var roomJid = args['roomJid'].split('/')[0];
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return false;
    var canEncryptMessage = false;
    if(!isPrivate){
        canEncryptMessage = msgE.cansend.canSend();
    }else{
        canEncryptMessage = msgE.cansend.canSendToUser(args['roomJid'], true);
    }
    if(!canEncryptMessage){
        alert('Key exchange in progress - Please retry in a few seconds!');
        return false;
    }
    var txt = args['message'];
        if(isPrivate){
            var userJid = args['roomJid'];
            txt = msgE.msg.message.encrypt(txt, true, userJid);
        }else{
            txt = msgE.msg.message.encrypt(txt, false);
        }
    if(typeof txt!=='string'){
        args.message = '';
        alert('Cannot encrypt message: No key for user, or program exception!');
        return false;
    }else{
        args.message = txt;
    }
    return true;
};
self.events.candy.view = {};
self.events.candy.view.beforeNotice = function(e, args){
    /* Avoid showing a protocol message, or opening a visible private chat
     * room window for a protocol message. */
    var roomJid = args['roomJid'].split('/')[0];
    var txt     = args['message']['body'];
    if(args['message']['delay']) return false;
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return false;
    var isSysMsg = msgE.msg.check.isProtocolMessage(txt);
    return (!isSysMsg);
};
self.events.candy.view.beforeShowMessage = function(e, args){
    /* Edit messages before showing them, i.e. decrypt, add formatting etc. */
    
    var isPrivate = ((args['roomJid'].indexOf('/')>=0)===true);
    
    var roomJid = args['roomJid'].split('/')[0];
    var txt     = args['message'];
    var userJid;
    if(typeof args['stanza']==='object' && args['stanza']!==null){
        userJid = args['stanza'].attr('from');
    }
    if(typeof userJid!=='string') {
        if(roomJid.indexOf('/')>0){ // private message
            userJid = roomJid;
        }else{
            userJid = roomJid+'/'+args['name'].split('@')[0];
        }
    }
    var room = Candy.Core.getRoom(roomJid);
    if(typeof room!=='object' || room===null || 
        typeof room['user']!=='object' || room['user']===null) return;
    var userCurrent  = room.getUser().data.jid;
    
    var onsuccess = function(txt){
        args['message'] = txt;
    };
    var onfail    = function(txt){
        args['message'] = '<strong>[undecryptable message:]</strong> '+txt;
    };
    
    var msgE = RoomsMessageEncryption[to_id(roomJid)];
    if(typeof msgE!=='object' || msgE===null) return false;
    
    if(msgE.msg.check.isNormalMessage(txt)){
        // decrypt this message
        var privateMsgReceiver = '';
        if(isPrivate){
            privateMsgReceiver = args['roomJid'];
        }
        var orig = txt + '';
        txt = msgE.msg.message.decrypt(txt, userJid, userCurrent, isPrivate, 
            privateMsgReceiver);
        if(typeof txt==='string'){ onsuccess(txt); }
        else{ onfail(orig); }
    }else{
        // add unencrypted notice
        onfail(txt);
    }
};

self.init = function(options){
    self.options = MessageEncryption.prototype.parseOptions(options);
    if(!self.options){
        debugLog("Failed to start crypto module: Invalid configuration!");
        return false;
    }
    $(Candy).on('candy:core.presence.room', 
        self.events.candy.handleRoomPresence);
    $(Candy).on('candy:core:roster:nickchange',
        self.events.candy.handleNickChange);
    $(Candy).on('candy:core.message', 
        self.events.candy.handleTextMessage);
    $(Candy).on('candy:view.message.before-show',
        self.events.candy.view.beforeShowMessage);
    $(Candy).on('candy:view.message.before-notice',
        self.events.candy.view.beforeNotice);
    $(Candy).bind('candy:view.message.before-send', 
        self.events.candy.onBeforeSendMessage);
};

return self;
}(MobileCandyCrypto.RoomEncryption || {}, Candy, jQuery));
