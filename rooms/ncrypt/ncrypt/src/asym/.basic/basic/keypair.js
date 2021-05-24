module.exports = (function(ncrypt, dep){

/**
 * @namespace nCrypt.asym.basic.keypair
 * */
var  keypair = {};
var _keypair = {};
    
var tpoint = dep.types.basic.point;
var tbn = dep.types.basic.bn;
var tsecret = dep.types.basic.secret;
var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.basic.keypair.gen
 * */
 keypair.gen = {};
_keypair.gen = {};
/**
 * @namespace nCrypt.asym.basic.keypair.gen.sym
 * */
 keypair.gen.sym = {};
_keypair.gen.sym = {};
/**
 * @namespace nCrypt.asym.basic.keypair.gen.sym.conf
 * */
_keypair.gen.sym.conf = {};
 keypair.gen.sym.conf = {};
_keypair.gen.sym.conf.defaults = (function(){
    var sjcl_defaults = ncrypt.sym.config.blockcipher.aes.defaults();
        sjcl_defaults = JSON.parse(JSON.stringify(sjcl_defaults));
    var titaniumcore_defaults = ncrypt.sym.config.blockcipher.defaults();
        titaniumcore_defaults = 
                        JSON.parse(JSON.stringify(titaniumcore_defaults));
    var opts = {
        'cipher': 'twofish',
        'opts': {
            'sjcl': sjcl_defaults,
            'titaniumcore': titaniumcore_defaults
        }
    };
    return opts;
})();
/**
 * Get the symmetric encryption defaults for private keypair parts.
 * @returns {object} - Object like { 'cipher': <defaultcipher>, 
 * 'opts': { 'sjcl': <default opts for sjcl/aes>, 
 * 'titaniumcore': <default titaniumcore opts> }
 * @function
 * @name defaults
 * @memberof nCrypt.asym.basic.keypair.gen.sym.conf
 * */
keypair.gen.sym.conf.defaults = function(){
    return JSON.parse(JSON.stringify(_keypair.gen.sym.conf.defaults));
};

/**
 * Generate a keypair, encrypting it's private parts.
 * @param {string} curve - Curve the elliptic curve points of this key will be
 * located on. Examples: 'curve25519' or 'ed25519'. 
 * <br />
 * See {@link nCrypt.asym.types.basic.point} for names of available curves. The
 * curve determines the keypair's key strength.
 * <br />
 * Please note users need to remember their passwords, or their keys will be
 * inaccessible. Passwords should be strong, rather random, hard to guess but 
 * easy to remember - the usual requirements for a good password.
 * @param {string} curve
 * @param {string} password
 * @param {string} [sym_alg]
 * @param {string} [sym_opts]
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name generate
 * @memberof nCrypt.asym.basic.keypair.gen
 * */
keypair.gen.generate = function(curve, password, sym_alg, sym_opts){
    var runf = function(curve, password, sym_alg, sym_opts){
        if(typeof sym_alg!=='string' || sym_alg.length<1){
            sym_alg = _keypair.gen.sym.conf.defaults.cipher;
        }
        if(typeof sym_opts!=='object' || sym_opts===null || sym_opts==={}){
            if(sym_alg.toLowerCase()==='aes'){ 
                sym_opts = _keypair.gen.sym.conf.defaults.opts.sjcl;
            }else{ 
                sym_opts = _keypair.gen.sym.conf.defaults.opts.titaniumcore; }
        }
        var kp = new tkeypair.Keypair(null, curve);
        if(_isExp(kp)) return kp;
        kp = kp.getSerialized();
        if(_isExp(kp)) return kp;
        kp = tkeypair.store.encrypt.encrypt(kp, password, sym_alg, sym_opts);
        return kp;
    };
    return SecureExec.sync.apply(runf, [curve, password, sym_alg, sym_opts]);
};

_keypair.pub = {};
/**
 * @namespace nCrypt.asym.basic.keypair.pub
 * */
 keypair.pub = {};
/**
 * Get the public key from a keypair.
 * <br />
 * This is the public key to send over the network and give to contacts.
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name getPublic
 * @memberof nCrypt.asym.basic.keypair.pub
 * */
keypair.pub.getPublic = function(kp){
    var runf = function(kp){
        return tkeypair.store.pub.toPublicOnly(kp);
    };
    return SecureExec.sync.apply(runf, [ kp ]);
};
/**
 * @namespace nCrypt.asym.basic.keypair.pub.id
 * */
keypair.pub.id = {};
/**
 * Get the ID of an keypair. (The ID is only for the public key, i.e. can and
 * should be published as an easy identifier for the public key.)
 * @param {string} kp - Full keypair or public key. Full or public keyset. The 
 * created hash is unique to the public key.
 * @param {string} hash - Hash algorithm, see {@link nCrypt.hash}
 * @param {string} enc - Encoding, see {@link nCrypt.enc}, with the restriction
 * only encodings which result in a string and are not 'utf8' are allowed.
 * @param {number} [mod] - If the hash length should be divisible by a certain 
 * number (so it can be split into equal pieces of a certain length), @mod 
 * should be specified.
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id
 * @name getID
 * */
keypair.pub.id.getID = function(kp, hash, enc, mod){
    var runf = function(kp, hash, enc, mod){
        kp = keypair.pub.getPublic(kp);
        if(_isExp(kp)) return kp;
        var id = new tid.ID(kp, hash, enc, mod);
        return id;
    };
    return SecureExec.sync.apply(runf, [ kp, hash, enc, mod ]);
};
/**
 * @namespace nCrypt.asym.basic.keypair.pub.id.text
 * */
keypair.pub.id.text = {};
/**
 * Get an ID for the public key with 'sha256' as a hash algorithm and 
 * 'base64url' for encoding.
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.text
 * @name getLongID
 * */
keypair.pub.id.text.getLongID = function(kp){
    return keypair.pub.id.getID(kp, 'sha256', 'base64url');
};
/**
 * Get an ID for the public key with 'sha1' as a hash algorithm and 
 * 'base64url' for encoding.
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.text
 * @name getShortID
 * */
keypair.pub.id.text.getShortID = function(kp){
    return keypair.pub.id.getID(kp, 'sha1', 'base64url');
};
/**
 * Get an ID for the public key with 'md5' as a hash algorithm and 
 * 'base64url' for encoding.
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.text
 * @name getMiniID
 * */
keypair.pub.id.text.getMiniID = function(kp){
    return keypair.pub.id.getID(kp, 'md5', 'base64url');
};
/**
 * @namespace nCrypt.asym.basic.keypair.pub.id.pub
 * */
keypair.pub.id.color = {};
/**
 * Get an ID for the public key with 'sha256' as a hash algorithm and 
 * 'hex' for encoding.
 * <br />
 * This color ID can be split into parts of 6 hex chars, which represent one
 * color.
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.color
 * @name getLongID
 * */
keypair.pub.id.color.getLongID = function(kp){
    return keypair.pub.id.getID(kp, 'sha256', 'hex', 6);
};
/**
 * Get an ID for the public key with 'sha1' as a hash algorithm and 
 * 'hex' for encoding.
 * <br />
 * This color ID can be split into parts of 3 hex chars, which represent one
 * color. 
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.color
 * @name getShortID
 * */
keypair.pub.id.color.getShortID = function(kp){
    return keypair.pub.id.getID(kp, 'sha1', 'hex', 3);
};
/**
 * Get an ID for the public key with 'md5' as a hash algorithm and 
 * 'hex' for encoding.
 * <br />
 * This color ID can be split into parts of 3 hex chars, which represent one
 * color.
 * @param {string} kp
 * @returns {nCrypt.asym.types.basic.id.ID|SecureExec.exception.Exception}
 * @function
 * @memberof nCrypt.asym.basic.keypair.pub.id.color
 * @name getShortID
 * */
keypair.pub.id.color.getMiniID = function(kp){
    return keypair.pub.id.getID(kp, 'md5', 'hex', 3);
};

/**
 * @namespace nCrypt.asym.basic.keypair.priv
 * */
_keypair.priv = {};
 keypair.priv = {};
/**
 * Change the password for an existing keypair. This will reencrypt the private
 * part of the keypair. The encryption options (algorithm and options) can be
 * changed as well. (To change the options only, pass the same for @old_pass
 * and @new_pass.)
 * @param {string} kp
 * @param {string} old_pass
 * @param {string} new_pass
 * @param {string} [sym_alg]
 * @param {object} [sym_opts]
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name change
 * @memberof nCrypt.asym.basic.keypair.pub.id.priv
 * */
keypair.priv.change = function(kp, old_pass, new_pass, sym_alg, sym_opts){
    var runf = function(kp, old_pass, new_pass, sym_alg, sym_opts){
        return tkeypair.store.encrypt.change(kp, old_pass, new_pass, 
                                           sym_alg, sym_opts);
    };
    return SecureExec.sync.apply(runf, [ kp, old_pass, new_pass, 
                                       sym_alg, sym_opts ]);
};

return keypair; });
