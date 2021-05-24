module.exports = (function(ncrypt, deptypes){

/* basic types */
var tbn = deptypes.basic.bn;
var tpoint = deptypes.basic.point;
var tsecret = deptypes.basic.secret;
var tid = deptypes.basic.id;
/* key types */
var tkeypair = deptypes.key.keypair;
var tkeyset = deptypes.keyset;
/* shared secret types */
var tshared = deptypes.shared;
var tecies = tshared.ecies;
var tdh = tshared.dh;
/* symkey */
var tsymkey = deptypes.symkey;

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.simple.message.message
 * */
var  message = {};
var _message = {};

_message.types = {
    "ENCRYPT": 0, "SIGN": 1, "BOTH": 2
};
message.types = (function(){
    return JSON.parse(JSON.stringify(_message.types));
})();

/**
 * @namespace nCrypt.asym.types.simple.message.message.sender
 * */
 message.sender = {};
_message.sender = {};

 message.sender.Message = 
function(msg_sender_ks, msg_type, msg_content, msg_sig, msg_recv_arr){
    
    /* Validate message type */
    var msg_type_validate = function(msg_type){
        if(typeof msg_type!=='number'){
            throw (new ncrypt.exception.types.simple.message.message.
                invalidMessageType());
        }
        if(_message.types.indexOf(msg_type) < 0){
            throw (new ncrypt.exception.types.simple.message.message.
                invalidMessageType());
        }
        return true;
    };
    msg_type_valid = SecureExec.sync.apply(msg_type_validate, [msg_type]);
    if(_isExp(msg_type_valid)) return msg_type_valid;
    
    /* Validate message content */
    var msg_content_validate = function(msg_content){
        if(typeof msg_content!=='string'){
            throw (new ncrypt.exception.types.simple.message.message.
                            invalidMessageContent());
        }
        if(msg_type===_message.types.ENCRYPT || msg_type===_message.types.BOTH){
            try{
                var mct = JSON.parse(msg_content);
                if(mct === {} || mct === null){
                    throw (new ncrypt.exception.types.simple.message.message.
                            invalidMessageContent());
                }
            }catch(e){
                throw (new ncrypt.exception.types.simple.message.message.
                            invalidMessageContent());
            }
        }
        return true;
    };
    var msg_content_valid = SecureExec.sync.apply(msg_content_validate, 
        [msg_content]);
    if(_isExp(msg_content_valid)) return msg_content_valid;
    
    /* Validate message signature */
    var msg_signature_validate = function(msg_sig){
        if(msg_type===_message.types.ENCRYPT){
            if((typeof msg_sig==='object' && msg_sig===null) ||
               (typeof msg_sig==='undefined')){
                return true;
            }else{
                throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
            }
        }
        var get_sig = function(s){
            try{
                s = ncrypt.enc.transform(s, "base64url", "bytes");
                if(_isExp(s)) return s;
                if(Array.isArray(s) && s.length>0) return s;
            }catch(e){
                throw (new ncrypt.exception.types.signature.ecdsa.
                    signatureDeserializeFailed());
            }
        };
        var can_deserialize_to_sig = SecureExec.sync.apply(get_sig, [msg_sig]);
        if(_isExp(can_deserialize_to_sig)) return can_deserialize_to_sig;
        return true;
    };
    var msg_signature_valid = SecureExec.sync.apply(msg_signature_validate,
        [msg_sig]);
    if(_isExp(msg_signature_valid)) return msg_signature_valid;
    
    /* Validate array of encrypted receiver symkeys */
    var msg_recv_arr_validate = function(msg_recv_arr){
        if(msg_type===_message.types.SIGN){
            if((typeof msg_recv_arr==='object' && msg_recv_arr===null) ||
               (typeof msg_recv_arr==='undefined')){
                return true;
            }else{
                throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
            }
        }
        var is_skey_obj = function(obj){
            try{
                return (obj instanceof tsymkey.sender.EncSymkeySender);
            }catch(e){ return false; }
        };
        if(typeof msg_recv_arr!=='object' || !Array.isArray(msg_recv_arr)){
            throw (new ncrypt.exception.types.simple.message.message.
            invalidReceiverArray());
        }
        for(var i=0; i<msg_recv_arr.length; i++){
            var m = msg_recv_arr[i];
            if(!typeof m==='object'){
                throw (new ncrypt.exception.types.simple.message.message.
                invalidReceiverArray());
            }
            if(!is_skey_obj(m)){
                throw (new ncrypt.exception.types.simple.message.message.
                invalidReceiverArray());
            }
        }
        return true;
    };
    var msg_recv_arr_valid = SecureExec.sync.apply(msg_recv_arr_validate,
        [msg_recv_arr]);
    if(_isExp(msg_recv_arr_valid)) return msg_recv_arr_valid;
    
    var msg_sender_ks_validate = function(msg_sender_ks){
        if(typeof msg_sender_ks==='string'){
            msg_sender_ks=tkeyset.pub.getPublicKeyset(msg_sender_ks);
        }
        var ks = new tkeyset.Keyset(msg_sender_ks);
        return ks;
    };
    var msg_sender_ks_valid = SecureExec.sync.apply(msg_sender_ks_validate,
        [msg_sender_ks]);
    if(_isExp(msg_sender_ks)) return msg_sender_ks;
    var sender_ks = msg_sender_ks_valid;
    
    var _args = {};
    _args.msg_sender_ks = sender_ks.clone();
    _args.msg_type = msg_type+0;
    _args.msg_content = msg_content+'';
    _args.msg_sig = null;
    if(msg_type!==_message.types.ENCRYPT){
        _args.msg_sig = msg_sig+'';
    }
    _args.msg_recv_arr = null;
    if(msg_type!==_message.types.SIGN){
        _args.msg_recv_arr = [];
        for(var r = 0; r < msg_recv_arr.length; r++){
            try{ var itm = msg_recv_arr[r].clone();
                _args.msg_recv_arr.push(itm);
            }catch(e){
                var e = (new ncrypt.exception.types.simple.message.message.
                invalidReceiverArray());
                return SecureExec.exception.Exception(e);
            }
        }
    }
    
    var _prop = {};
    _prop.content = msg_content+'';
    if(_prop.mtype!==_message.types.SIGN){
        try{
            _prop.content = JSON.parse(_prop.content);
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    }
    _prop.mtype = msg_type;
    if(_prop.mtype!==_message.types.ENCRYPT){
        _prop.sig = msg_sig+'';
    }else{
        _prop.sig = null;
    }
    if(_prop.mtype!==_message.types.SIGN){
        _prop.enc_symkey_arr = tsymkey.sender.arr.symkeyArrayJSON(msg_recv_arr);
        if(_isExp(_prop.enc_symkey_arr)) return _prop.enc_symkey_arr;
    }else{
        _prop.enc_symkey_arr = null;
    }
    _prop.sender = {};
    _prop.sender.keyset = sender_ks;
    _prop.sender.id = sender_ks.getPublicKeyIDs().txt.normal;
    
    _prop.json = {};
    _prop.json.obj = {
        't': _prop.mtype,
        'i': (_prop.sender.id+''),
        'k': (_prop.enc_symkey_arr.slice(0)),
        's': (_prop.sig+''),
        'c': (_prop.content+'')
    };
    try{
        _prop.json.str = JSON.stringify(_prop.json.obj);
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    
    this.getMessage = function(){
        return _prop.json.str+'';
    };
    this.getMessageJSON = function(){
        return JSON.parse(_prop.json.str+'');
    };
    this.clone = function(){
        return new message.sender.Message(_args.msg_sender_ks,
                                            _args.msg_type,
                                            _args.msg_content,
                                            _args.msg_sig,
                                            _args.msg_recv_arr);
    };
};

/**
 * @namespace nCrypt.asym.types.simple.message.message.sender
 * */
 message.receiver = {};
_message.receiver = {};

 message.receiver.Message = function(msg, ks_sender, shared_secret, known_skey){
    
    /* Validate arguments */
    
    /* - Validate @msg */
    var msg_validate = function(msg){
        try{ msg = JSON.parse(msg);
        }catch(e){ throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage()); }
        var m_type = msg.t;
        if(typeof m_type!=='number' || _message.types.indexOf(m_type)<0){
            throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
        }
        var m_sid = msg.i;
        if(typeof m_sid!=='string' || m_sid.length<1 || m_sid==='null'){
            throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
        }
        var m_cont = msg.c;
        if(typeof m_cont!=='string' || m_cont.length<1){
            throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
        }
        var m_keys = msg.k;
        if(m_type!==_message.types.SIGN){
            if(typeof m_keys!=='object' || m_keys===null ||
               !Array.isArray(m_keys)){
                throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
            }
            for(var k=0; k<m_keys.length; k++){
                if(typeof m_keys[k]!=='object' || m_keys[k]===null){
                    throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
                }
            }
        }else{ m_keys = null; }
        var m_sig = msg.s;
        if(m_type!==_message.types.ENCRYPT){
            try{
                var s = ncrypt.enc.transform(m_sig, 'base64url', 'bytes');
                if( _isExp(s) || !Array.isArray(s) || s.length<=0 ){
                    throw (new ncrypt.exception.types.signature.ecdsa.
                    signatureDeserializeFailed());
                }
            }catch(e){
                throw (new ncrypt.exception.types.signature.ecdsa.
                    signatureDeserializeFailed());
            }
        }else{ m_sig = null; }
        
        return true;
    };
    var msg_valid = SecureExec.sync.apply(msg_validate, [msg]);
    if(_isExp(msg_valid)) return msg_valid;
    
    /* - Validate @ks_sender */
    var ks_sender_validate = function(ks_sender){
        if(typeof ks_sender === 'undefined') return true;
        if(typeof ks_sender === 'object' && ks_sender === null) return true;
        var k = tkeyset.pub.getPublicKeyset(ks_sender); if(_isExp(k)) return k;
            k = new tkeyset.Keyset(k); if(_isExp(k)) return k;
        return true;
    };
    var ks_sender_valid = SecureExec.sync.apply(ks_sender_validate, 
        [ks_sender]);
    if(_isExp(ks_sender_valid)) return ks_sender_valid;
    
    /* - Validate @shared_secret */
    var shared_secret_validate = function(shared_secret){
        if(typeof shared_secret==='undefined') return true;
        if(typeof shared_secret==='object' && shared_secret===null) return true;
        if(typeof shared_secret==='string'){
            var s = new tsecret.Secret(tsecret.source.SECRET, s);
            if(!_isExp(s)){ if(s instanceof tsecret.Secret){
                    return true;
            } }
        }
        if(typeof shared_secret==='object'){
            if(shared_secret instanceof tdh.SecretDH){
                return true;
            }
            if(shared_secret instanceof tecies.SecretECIES){
                return true;
            }
        }
        throw (new ncrypt.exception.types.simple.message.message.
                invalidArgument());
    };
    var shared_secret_valid = SecureExec.sync.apply(shared_secret_validate,
        [ shared_secret ]);
    if(_isExp(shared_secret_valid)) return shared_secret_valid;
    
    /* - Validate @known_skey */
    var known_skey_validate = function(known_skey){
        if(typeof known_skey==='undefined') return true;
        if(typeof known_skey==='object' && known_skey===null) return true;
        if(typeof known_skey === 'string' && known_skey.length>0){
            var s = new tsecret.Secret(tsecret.source.SECRET, known_skey);
            if(_isExp(s)) return s;
            return true;
        }else{ var s = known_skey; }
        if(s instanceof tsecret.Secret) return true;
        throw (new ncrypt.exception.types.simple.message.message.
                invalidArgument());
    };
    var known_skey_valid = SecureExec.sync.apply(known_skey_validate,
        [ known_skey ]);
    if(_isExp(known_skey)) return known_skey;
    
    /* - Normalize empty @ks_sender or @shared_secret */
    if(typeof ks_sender==='undefined') ks_sender = null;
    if(typeof shared_secret==='undefined') shared_secret = null;
    if(typeof known_skey==='undefined') known_skey = null;
    if(typeof ks_sender==='string'){
        ks_sender = tkeyset.pub.getPublicKeyset(ks_sender); 
        if(_isExp(ks_sender)) return ks_sender;
        ks_sender = new tkeyset.Keyset(ks_sender); 
        if(_isExp(ks_sender)) return ks_sender;
    }
    if(typeof shared_secret==='string'){
        shared_secret = new tsecret.Secret(tsecret.source.SECRET, 
            shared_secret);
        if(_isExp(shared_secret)) return shared_secret;
    }
    if(typeof known_skey==='string'){
        known_skey = new tsecret.Secret(tsecret.source.SECRET, known_skey);
        if(_isExp(known_skey)) return known_skey;
    }
    
    /* Set arguments */
    
    var _args = {};
    _args.msg = msg+'';
    _args.ks_sender = ks_sender.clone().getSerialized();
    if(_args.ks_sender!==null) _args.ks_sender = _args.ks_sender+'';
    _args.shared_secret = null;
    if(typeof shared_secret==='string') 
        _args.shared_secret = shared_secret+'';
    if(typeof shared_secret==='object' && shared_secret!==null)
        _args.shared_secret = shared_secret.clone();
    
    /* Parse message */
    
    try { msg = JSON.parse(msg); }catch(e){
    return (new SecureExec.exception.Exception(null,null,e)); }
    
    var _msg = {};
    _msg.mtype = msg.t; // _message.types.[ENCRYPT/SIGN/BOTH]
    _msg.ctxt = msg.c;
    if(_msg.mtype !== _message.types.ENCRYPT){
        _msg.ctxt = JSON.stringify(_msg.ctxt);
    }
    _msg.sig = null;
    if(_msg.mtype !== _message.types.ENCRYPT){
        _msg.sig = msg.s+'';
    }
    _msg.symkeys = null;
    if(_msg.mtype !== _message.types.SIGN){
        _msg.symkeys = JSON.parse(msg.k);
        _msg.symkeys = _msg.k.slice(0);
    }
    _msg.sid = _msg.i+'';
    
    /* -- get the symmetric key for a certain receiver's id */
    var internal_get_symkey = function(sid){
        // @sid: receiver id
        var obj = null;
        for(var i=0; i<_msg.symkeys.length; i++){
            var s = _msg.symkeys[i];
            var id = s.id;
            if(typeof id!=='string' || id.length<1 || id==='null'){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
            if(id===sid){
                obj = _msg.symkeys[i];
                try{ obj = JSON.parse(JSON.stringify(obj)); }catch(e){
                    throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
                }
                break;
            }
        }
        return obj;
    };
    /* -- decrypt the shared secret */
    var internal_decrypt_secret_symkey = function(skobj, sec){
        
    };
    /* -- decrypt the ciphertext using a shared secret */
    var internal_decrypt_cipher_text = function(ct, sk, cb){
        var s;
        if(typeof sk==='object'){ s = sk.getSecretValue(); }
        if(typeof sk==='string'){ 
            s = new tsecret.Secret(tsecret.source.SECRET, sk);
            if(_isExp(s)){ cb(s); return; } s = s.getSecretValue(); }
        ncrypt.sym.async.decrypt(ct, s, function(cleartext){
            cb(cleartext);
        });
    };
    
    this.getSenderID = function(){
        return _msg.sid+'';
    };
    
    
};

return message; });
