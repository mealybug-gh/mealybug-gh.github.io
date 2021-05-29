
/* nCrypt - Javascript cryptography made simple
 * Copyright (C) 2015 photophobia
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */

module.exports = (function(ncrypt, deptypes){

var tpoint = deptypes.basic.point;
var tbn = deptypes.basic.bn;
var tsecret = deptypes.basic.secret;
var tid = deptypes.basic.id;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.key.keypair
 * */
var  keypair = {};
var _keypair = {};

_keypair.source = {
    "GENERATE": 0,
    "DESERIALIZE": 1
};
keypair.source = (function(){
    return JSON.parse(JSON.stringify(_keypair.source));
})();

_keypair.elliptic = {};
_keypair.elliptic.generate = {};
_keypair.elliptic.generateKeypair = function(curvename, existing_kp){
    var get_keypair = function(curvename, ec, ekp){
        try{
            var kp;
            if(typeof ekp==="object" && ekp!==null){ 
                var pub = ekp.pub; var priv = ekp.priv;
                if(typeof pub!=='undefined' && pub!==null){
                    pub = new tpoint.Point(pub, curvename);
                    if(_isExp(pub)) return pub;
                    pub = pub.getEllipticPoint();
                    if(_isExp(pub)) return pub;
                }
                if(typeof priv!=='undefined' && priv!==null){
                    priv = new tbn.BigNumber(priv);
                    if(_isExp(priv)) return priv;
                    priv = priv.getDeserialized();
                    if(_isExp(priv)) return priv;
                }
                try{ kp = ec.keyFromPublic({}); }
                    catch(e){ kp = ec.genKeyPair(); }
                if(typeof priv!=="undefined" && 
                   !(typeof priv==="object" && priv===null)){
                    kp.priv = priv;
                }
                if(typeof pub!=="undefined" && 
                   !(typeof pub==="object" && pub===null)){
                    kp.pub = pub;
                }
            }else{ 
                kp = ec.genKeyPair(); 
            }
            kp.pub = kp.getPublic();
            return kp;
        }catch(e){ 
        throw new ncrypt.exception.types.key.keypair.cannotGenerateKeypair(); }
    };
    var ec = tpoint.ec.getEC(curvename);
    if(_isExp(ec)) return ec;
    var args = [ curvename, ec ];
    if(typeof existing_kp!=="undefined") args.push(existing_kp);
    var kp = SecureExec.sync.apply(get_keypair, args);
    if(_isExp(kp)) return kp;
    return kp;
};

_keypair.serialize = {};
_keypair.serialize.serialize = function(priv, pub){
    var runf = function(priv, pub){
        if(typeof priv!=="object" || priv!==null){
            priv = new tbn.BigNumber(priv); if(_isExp(priv)) return priv;
            priv = priv.getSerialized(); if(_isExp(priv)) return priv;
        }
        pub = new tpoint.Point(pub); if(_isExp(pub)) return pub;
        pub = pub.getSerialized(); if(_isExp(pub)) return pub;
        var obj;
        try{
            obj = { "priv": priv, "pub": JSON.parse(pub) };
            obj = JSON.stringify(obj);
        }catch(e){ throw new 
            ncrypt.exception.types.key.keypair.serializationFailed(); }
        return obj;
    };
    return SecureExec.sync.apply(runf, [ priv, pub ]);
};
_keypair.serialize.deserialize = function(kpstr){
    var get_keypair = function(kpstr){
        var obj = SecureExec.sync.apply(JSON.parse, [kpstr]);
        if(_isExp(obj)) return obj;
        var priv = null;
        if(typeof obj.priv!=="object" || obj.priv!==null){
            priv = new tbn.BigNumber(obj.priv); if(_isExp(priv)) return priv;
            priv = priv.getDeserialized(); if(_isExp(priv)) return priv;
        }
        var pub = new tpoint.Point(JSON.stringify(obj.pub)); 
                                        if(_isExp(pub)) return pub;
        var curve = pub.getCurveName(); if(_isExp(curve)) return curve;
            pub = pub.getEllipticPoint(); if(_isExp(pub)) return pub;
        var ec = tpoint.ec.getEC(curve);
        if(_isExp(ec)) return ec;
        try{
            var kp;
            try{ kp = ec.keyFromPublic({}); }catch(e){ kp = ec.genKeyPair(); }
            if(typeof priv!=="undefined" && 
               !(typeof priv==="object" && priv===null)){
                kp.priv = priv;
            }
            if(typeof pub!=="undefined" && 
               !(typeof pub==="object" && pub===null)){
                kp.pub = pub;
            }
            return { "kp": kp, "curve": curve };
        }catch(e){ throw new 
            ncrypt.exception.types.key.keypair.deserializationFailed(); }
    };
    var obj = SecureExec.sync.apply(get_keypair, [ kpstr ]);
    if(_isExp(obj)) return obj;
    return new Keypair(obj.kp, obj.curve);
};

/**
 * Create an instance of a `Keypair` object. This object can be created from
 * 
 * - a string (representing a serialized `Keypair` object retrieved using
 * `(my_keypair_obj).getSerialized()`), 
 * - an instance of an `elliptic` `Keypair` and a @curvename, or 
 * - an instance of this class itself.
 * 
 * To generate a new keypair, pass null for @obj and a curvename.
 * <br />
 * *Please note the serialized keypair is _NOT safe for storage_. Use the 
 * appropriate functions to encrypt it's private parts, and the functions to
 * decrypt it's private parts to use the string as a serialized keypair again.*
 * @param {string|object} obj - A serialized `Keypair`, an `elliptic` `KeyPair`
 * object (requires a curvename passed), an instance of this class. To generate
 * a new `Keypair`, pass @obj=null.
 * @param {string} curvename - To generate a new keypair or recover one from 
 * an `elliptic` key pair object, pass the curve name. 
 * @class
 * @name Keypair
 * @memberof nCrypt.asym.types.key.keypair
 * */
var Keypair = function(obj, curvename){
    var _priv = null; // instance of tbn.BN
    var _pub = null; // instance of tpoint.Point
    var _curve = null; // curvename
    var _eckp = null; // `elliptic` keypair
    var _json = null;
    
    /* If @obj is null and a @curvename is passed, assume a keypair should be
     * generated. */
    if( (typeof obj==="object" && obj===null) && typeof curvename==="string" ){
        var kp = _keypair.elliptic.generateKeypair(curvename);
        //if(_isExp(kp)) return kp;
        if( _isExp(kp) ){ return kp; }
        _eckp = kp;
    }
    /* If an object is passed and no curvename, assume it's an instance of 
     * this class and a clone is wanted. */
    if(typeof obj==="object" && typeof curvename==="undefined"){
        var isInstSelf = SecureExec.tools.proto.inst.isInstanceOf(obj, Keypair);
        if(isInstSelf===true){
            return obj.clone();
        }
    }
    /* If an object is passed and a curvename, assume it's an instance of 
     * `elliptic` `KeyPair` class. */
    if((typeof obj==="object" && obj!==null) && typeof curvename==="string"){
        var isInstSelf = SecureExec.tools.proto.inst.isInstanceOf(obj, Keypair);
        if(isInstSelf===true){
            return obj.clone();
        }
        var kp = _keypair.elliptic.generateKeypair(curvename, obj);
        if(_isExp(kp)) return kp;
        _eckp = kp;
    }
    /* If a string is passed and no curvename, assume it's a serialized 
     * keypair. */
    if(typeof obj==="string" && typeof curvename!=="string"){
        return _keypair.serialize.deserialize(obj);
    }
    
    /* None of the above matched. Arguments cannot have been valid, or there's
     * an undetected bug. */
    if(typeof _eckp==="object" && _eckp===null){
        var e = ncrypt.exception.Create(
            ncrypt.exception.types.key.keypair.invalidArgument
        );
        var exp = new SecureExec.exception.Exception(null,null,e);
        return exp;
    }
    
    /* Process the `elliptic` key pair properties to properties of this 
     * class. */
    _priv = null;
    if(typeof _eckp.priv!=="object" || _eckp.priv!==null){ 
        _priv = new tbn.BigNumber(_eckp.priv); 
    }
    if(_isExp(_priv)) return _priv;
    _pub = new tpoint.Point(_eckp.pub, curvename);
    if(_isExp(_pub)) return _pub;
    _curve = curvename;
    _json = _keypair.serialize.serialize(_priv, _pub);
    
    var _json_public;
    try{ _json_public = JSON.parse(_json+'');
         _json_public.priv = null;
         _json_public = JSON.stringify(_json_public);
    }catch(e){ var exp = new SecureExec.exception.Exception(null, null, e);
        return exp; }
    
    var _is_public_only;
    try{ _is_public_only = JSON.parse(_json+"");
         _is_public_only = (_is_public_only.priv===null);
    }catch(e){ var exp = new SecureExec.exception.Exception(null, null, e);
        return exp; }
    
    /* Calculate public keypair IDs */
    var _id_pub_str;
    try{ _id_pub_str = JSON.parse(_json_public+'');
         _id_pub_str = _id_pub_str.pub;
         _id_pub_str = JSON.stringify(_id_pub_str);
    }catch(e){ var exp = new SecureExec.exception.Exception(null, null, e);
        return exp; }
    var _id = {};
    _id.txt = {}; // IDs which should be represented as a text
    _id.col = {}; // IDs which are easily represented as a color, arrays of strs
    // Normal length ID which can easily be represented as text
    _id.txt.normal = new tid.ID(_id_pub_str, 'sha256', 'base64url');
    if(_isExp(_id.txt.normal)) return _id.txt.normal;
    _id.txt.normal = _id.txt.normal.getIdValue()
    // Shorter ID which can easily be represented as text
    _id.txt.short  = new tid.ID(_id_pub_str, 'sha1', 'base64url');
    if(_isExp(_id.txt.short)) return _id.txt.short;
    _id.txt.short = _id.txt.short.getIdValue()
    // Normal length ID which can easily be represented as colors (array of 
    // hex-strings, each of them 6 chars long)
    _id.col.normal = new tid.ID(_id_pub_str, 'sha256', 'hex', 6);
    if(_isExp(_id.col.normal)) return _id.col.normal;
    _id.col.normal = _id.col.normal.getIdSplit();
    // Shorter ID which can easily be represented as colors.
    _id.col.short = new tid.ID(_id_pub_str, 'sha1', 'hex', 6);
    if(_isExp(_id.col.short)) return _id.col.short;
    _id.col.short = _id.col.short.getIdSplit();
    
    /**
     * Get the serialized version of this keypair. Please note this is NOT a 
     * string safe for storage as it contains the private key information in
     * plaintext.
     * <br />
     * To store the keypair, use the appropriate functions to encrypt it's
     * private parts.
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getSerialized = function(){
        return _json+"";
    };
    /**
     * Get the curve name for this keypair.
     * @returns {string}
     * @name getCurveName
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getCurveName = function(){
        return _curve+"";
    };
    /**
     * Get the curve type for this keypair.
     * @returns {string}
     * @name getType
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getType = function(){
        return _pub.getCurveType();
    };
    /**
     * Get the underlying `elliptic` `KeyPair` object.
     * @returns {object}
     * @name getEllipticKeypair
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getEllipticKeypair = function(){
        var kp = _keypair.elliptic.generateKeypair(_curve, _eckp);
        return kp;
    };
    /**
     * Get the public part of the keypair.
     * @returns {nCrypt.asym.types.basic.point.Point}
     * @name getPublic
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getPublic = function(){
        return _pub.clone();
    };
    /**
     * Get the private part of the keypair.
     * @returns {nCrypt.asym.types.basic.bn.BigNumber}
     * @name getPrivate
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getPrivate = function(){
        return _priv.clone()
    };
    /**
     * Check whether this is a full keypair or whether it only is the public
     * part of the keypair.
     * @returns {boolean|SecureExec.exception.Exception}
     * @name isPublicOnly
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.isPublicOnly = function(){
        /*try{ var obj = JSON.parse(_json+"");
             return (obj.priv===null);
        }catch(e){ var exp = new SecureExec.exception.Exception(null, null, e);
            return exp; }*/
        return _is_public_only;
    };
    /**
     * Get the public key from this keypair. A public key CAN be used to 
     * generate a new `Keypair` object (instance of this class) again, which
     * simply will only contain public key information.
     * <br />
     * Use this function (not `getPublic()` - this is to access the public key
     * point directly) to get a public key which can be sent over to 
     * recipients. It only contains public information and is serialized 
     * already, which makes it suitable to be sent over the network.
     * @returns {string|SecureExec.exception.Exception}
     * @name getPublicKeypair
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getPublicKeypair = function(){
        /*try{ var obj = JSON.parse(_json+"");
             obj.priv = null;
             return JSON.stringify(obj);
        }catch(e){ var exp = new SecureExec.exception.Exception(null, null, e);
            return exp; }*/
        return _json_public;
    };
    /**
     * Get an object with public key IDs. The object returned is an object 
     * like {'txt': { 'normal': [string](normal length id to be represented as 
     * text), 'short': [string](shorter length id to be represented as text) },
     * 'col': { 'normal': [string[]](normal length id to be represented as 
     * colors - array of hex-strings), [string[]](shorter length id to be 
     * represented as colors - array of hex strings) }}.
     * @returns {object}
     * @name getPublicKeyIDs
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.getPublicKeyIDs = function(){
        try{
            return JSON.parse(JSON.stringify(_id));
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    };
    /**
     * Get a clone of this object.
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.key.keypair.Keypair#
     * */
    this.clone = function(){
        var kp = _keypair.elliptic.generateKeypair(_curve, _eckp);
        return new Keypair(kp, _curve);
    };
};
keypair.Keypair = Keypair;

/**
 * @namespace nCrypt.asym.types.key.keypair.store
 * */
keypair.store = {};
/**
 * @namespace nCrypt.asym.types.key.keypair.store.encrypt
 * */
keypair.store.encrypt = {};
/**
 * A serialized instance of `Keypair` is NOT save to store (let alone sent over
 * the network).
 * <br />
 * To store the `Keypair` (preferably only locally, i.e. on disk), encrypt it
 * before.
 * <br />
 * This functions can be used to encrypt a serialized instance of `Keypair`. 
 * Please use this functions instead of using symmetric decryption functions
 * directly on the string, as it would encrypt the public part of the keypair
 * just as well.
 * @param {string} serialized_keypair - Serialized `Keypair`.
 * @param {string} pass - Password to use for encryption. Usually, you ask the
 * user for a password for their keypair.
 * @param {string} sym_alg - Symmetric algorithm, see {@link nCrypt.sym.sync}.
 * @param {object} [sym_opts] - Options, see {@link nCrypt.sym.sync}.
 * @returns {string|SecureExec.exception.Exception} - Serialized keypair with 
 * it's private part encrypted.
 * Decrypt before creating an instance of `Keypair` from this again.
 * @function
 * @name encrypt
 * @memberof nCrypt.asym.types.key.keypair.store.encrypt
 * */
keypair.store.encrypt.encrypt = function(serialized_keypair,
                                         pass, sym_alg, sym_opts){
    var encf = function(skp, pass, alg, opts){
        if((typeof skp!=="string" || skp.length<1) ||
           (typeof pass!=="string" || pass.length<1) ||
           (typeof alg!=="string" || alg.length<1)){
            throw new ncrypt.exception.types.key.keypair.invalidArgument();
        }
        try{ var skpo = JSON.parse(skp);
        }catch(e){
            throw new ncrypt.exception.types.key.keypair.invalidArgument(); }
        //var priv = JSON.stringify(skpo.priv);
        var priv = skpo.priv;
        priv = ncrypt.sym.sync.encrypt(priv, pass, alg, opts);
        if(_isExp(priv) || typeof priv!=='string') return priv;
        priv = JSON.parse(priv);
        skpo.priv = priv;
        return JSON.stringify(skpo);
    };
    var enc = SecureExec.sync.apply(encf, 
            [ serialized_keypair, pass, sym_alg, sym_opts ]);
    return enc;
};
/**
 * Decrypt an encrypted serialized `Keypair`. (The result, if not an 
 * exception, can be used to create a `Keypair` instance again.)
 * @param {string} encrypted_keypair_string
 * @param {string} pass
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name decrypt
 * @memberof nCrypt.asym.types.key.keypair.store.encrypt
 * */
keypair.store.encrypt.decrypt = function(encrypted_keypair_string, pass){
    var decf = function(eks, pass){
        if( (typeof eks!=="string" || eks.length<1) ||
            (typeof pass!=="string" || pass.length<1) ){
            throw new ncrypt.exception.types.key.keypair.invalidArgument();
        }
        var ekso; try{ ekso = JSON.parse(eks); }catch(e){
            throw new ncrypt.exception.types.key.keypair.invalidArgument(); }
        var priv = ekso.priv;
        try{ priv = JSON.stringify(priv); }catch(e){
            throw new ncrypt.exception.types.key.keypair.invalidArgument(); }
        priv = ncrypt.sym.sync.decrypt(priv, pass);
        if(_isExp(priv) || typeof priv!=='string') return priv;
        ekso.priv = priv;
        return JSON.stringify(ekso);
    };
    var dec = SecureExec.sync.apply(decf, 
              [ encrypted_keypair_string, pass ]);
    return dec;
};
/**
 * Change the password and/or encryption options for the private part of the 
 * key. 
 * <br />
 * To change the password (without changing the encryption options) only
 * pass @oldpass and @newpass. 
 * <br />
 * To change the options but not the password, pass the same for @oldpass 
 * and @newpass and the algorithm to be used (@sym_alg) as well as the 
 * options (@sym_opts).
 * <br />
 * To change both, pass a @newpass and the algorithm / options.
 * @param {string} encrypted_keypair_string
 * @param {string} oldpass
 * @param {string} newpass
 * @param {string} [sym_alg]
 * @param {object} [sym_opts]
 * */
keypair.store.encrypt.change = function(encrypted_keypair_string, 
                                        oldpass, newpass, sym_alg, sym_opts){
    var get_opts = function(e){
        e = JSON.stringify(JSON.parse(encrypted_keypair_string).priv);
        var opts = nCrypt.sym.config.getOptionsOfEncrypted(e);
        return opts;
    };
    var dec = keypair.store.encrypt.decrypt(encrypted_keypair_string, oldpass);
    if(_isExp(dec)) return dec;
    var opts = SecureExec.sync.apply(get_opts, [ encrypted_keypair_string ]);
    if(_isExp(opts)) return opts;
    var dsym_alg = opts.cipher;
    var dsym_opts = opts.opts;
    if( typeof sym_alg !== "undefined" && typeof sym_opts === "undefined" ){
        sym_opts = {};
    }
    if(typeof sym_alg === "undefined") sym_alg = dsym_alg;
    if(typeof sym_opts === "undefined") sym_opts = dsym_opts;
    var enc = keypair.store.encrypt.encrypt(dec, newpass, sym_alg, sym_opts);
    return enc;
};

keypair.store.pub = {};
/**
 * Extract a public only keypair from a keypair. This function just removes the
 * private key information from the keypair, whether it was existent, encrypted
 * or not present at all.
 * <br />
 * The result of this function is a serialized public only keypair, which can
 * be passed to the `Keypair` constructor.
 * @param {string} serialized_keypair
 * @returns {string}
 * */
keypair.store.pub.toPublicOnly = function(kp){
    var get_pk = function(kp){
        kp = JSON.parse(kp);
        kp.priv = null;
        return JSON.stringify(kp);
    };
    return SecureExec.sync.apply(get_pk, [ kp ]);
};

return keypair; });
