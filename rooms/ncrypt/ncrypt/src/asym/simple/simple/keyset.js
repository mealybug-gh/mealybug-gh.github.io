
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

module.exports = (function(ncrypt, dep){

/**
 * @namespace nCrypt.asym.simple.keyset
 * */
var  keyset = {};
var _keyset = {};
    
var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

var symdefaults = (function(){
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
 * @namespace nCrypt.asym.simple.keyset.gen
 * */
 keyset.gen = {};
_keyset.gen = {};

/**
 * Generate a keyset. This keyset can support signing, encryption or both. 
 * @param {string} curve_enc - Curve to use for the encryption keypair. Pass
 * null to omit this for a signing only keypair.
 * @param {string} curve_sig - Curve to use for the signing keypair. Pass null
 * to omit this for an encryption only keypair. Please note: The keypair must
 * be either signing, encryption or both. Neither encryption nor signing 
 * results in an exception returned as this makes no sense.
 * @param {string} pass - The private parts of this keyset will be encrypted
 * using this password.
 * @param {string} [sym_alg='twofish'] - Symmetric algorithm to use for 
 * encryption of the private parts of this keyset.
 * @param {object} [sym_opts]
 * @returns {string|SecureExec.exception.Exception}
 * @name generate
 * @function
 * @memberof nCrypt.asym.simple.keyset.gen
 * */
keyset.gen.generate = function(curve_enc, curve_sig, pass, sym_alg, sym_opts){
    if(typeof sym_alg==='undefined'){
        sym_alg = symdefaults.cipher;
    }
    var runf = function(curve_enc, curve_sig, pass, sym_alg, sym_opts){
        var kp_enc = null; var kp_sig = null;
        /* Generate encryption keypair */
        if(typeof curve_enc==='string'){
            kp_enc = new tkeypair.Keypair(null, curve_enc);
            if(_isExp(kp_enc)) return kp_enc;
        }
        /* Generate signing keypair */
        if(typeof curve_sig==='string'){
            kp_sig = new tkeypair.Keypair(null, curve_sig);
            if(_isExp(kp_sig)) return kp_sig;
        }
        /* Generate keyset */
        var ks = new tkeyset.Keyset(kp_enc, kp_sig);
        if(_isExp(ks)) return ks;
        /* Encrypt keyset */
        ks = tkeyset.store.encrypt.encrypt(
                ks.getSerialized(), 
                pass, sym_alg, sym_opts);
        return ks;
    };
    return SecureExec.sync.apply(runf, 
                [curve_enc, curve_sig, pass, sym_alg, sym_opts]);
};

/**
 * Generate a keyset. This keyset can support signing, encryption or both. 
 * @param {string} curve_enc - Curve to use for the encryption keypair. Pass
 * null to omit this for a signing only keypair.
 * @param {string} curve_sig - Curve to use for the signing keypair. Pass null
 * to omit this for an encryption only keypair. Please note: The keypair must
 * be either signing, encryption or both. Neither encryption nor signing 
 * results in an exception returned as this makes no sense.
 * @param {string} pass - The private parts of this keyset will be encrypted
 * using this password.
 * @param {string} sym_alg - Symmetric algorithm to use for encryption of the 
 * private parts of this keyset.
 * @param {object} sym_opts - Symmetric encryption options. Pass null or {}
 * for defaults.
 * @param {function} callback - function([string|SecureExec.exception.Exception]
 * keyset, [*] carry)
 * @param {*} [carry]
 * @name generateAsync
 * @function
 * @memberof nCrypt.asym.simple.keyset.gen
 * */
keyset.gen.generateAsync = function(curve_enc, curve_sig, 
                                    pass, sym_alg, sym_opts,
                                    callback, carry){
    var gen_enc = function(args){
        args.kp_enc = null;
        /* Generate encryption keypair */
        if(typeof args.curve_enc==='string'){
            args.kp_enc = new tkeypair.Keypair(null, args.curve_enc);
            if(_isExp(args.kp_enc)) return args.kp_enc;
        }
        return args;
    };
    var gen_sig = function(args){
        args.kp_sig = null;
        /* Generate signing keypair */
        if(typeof args.curve_sig==='string'){
            args.kp_sig = new tkeypair.Keypair(null, args.curve_sig);
            if(_isExp(args.kp_sig)) return args.kp_sig;
        }
        return args;
    };
    var gen_ks = function(args){
        /* Generate keyset */
        args.ks = new tkeyset.Keyset(args.kp_enc, args.kp_sig);
        if(_isExp(args.ks)) return args.ks;
        return args;
    };
    var enc_ks = function(args){
        args.ks = tkeyset.store.encrypt.encrypt(
            args.ks.getSerialized(), 
            args.pass, args.sym_alg, args.sym_opts);
        return args;
    };
    var tasks = [ gen_enc, gen_sig, gen_ks, enc_ks ];
    var donef = function(args){
        if(_isExp(args)){
            callback(args, carry); return;
        }
        callback(args.ks, carry); return;
    };
    var args = {
        'curve_enc': curve_enc, 
        'curve_sig': curve_sig, 
        'pass': pass, 
        'sym_alg': sym_alg, 
        'sym_opts': sym_opts
    };
    SecureExec.async.waterfall(tasks, donef, args);
};

/**
 * @namespace nCrypt.asym.simple.keyset.pub
 * */
keyset.pub = {};

/**
 * Get the public keyset from a keyset. This works for keysets with private
 * information as well as for keysets which already are public keysets.
 * <br />
 * This function returns the public keyset to send to contacts.
 * @param {string} ks
 * @returns {string|SecureExec.exception.Exception}
 * @name getPublic
 * @function
 * @memberof nCrypt.asym.simple.keyset.pub
 * */
keyset.pub.getPublic = function(ks){
    return tkeyset.pub.getPublicKeyset(ks);
};

/**
 * Get IDs for a public keyset. Returns an object with IDs useful for color
 * and text representation, with short and normal IDs. 
 * <br />
 * For more details, refer to {@nCrypt.asym.types.simple.keyset.Keyset}.
 * @param {string} ks
 * @returns {object|SecureExec.exception.Exception}
 * @name getPublic
 * @function
 * @memberof nCrypt.asym.simple.keyset.pub
 * */
keyset.pub.getPublicIDs = function(ks){
    var pks = keyset.pub.getPublic(ks); 
    if(typeof pks!=='string') return pks;
    pks = JSON.parse(pks);
    var pk_e = pks.enc; if(pk_e!==null) pk_e = JSON.stringify(pk_e);
    var pk_s = pks.sig; if(pk_s!==null) pk_s = JSON.stringify(pk_s);
    var pk = new tkeyset.Keyset(pk_e, pk_s);
    return pk.getPublicKeyIDs();
};

/**
 * @namespace nCrypt.asym.simple.keyset.priv
 * */
keyset.priv = {};

/**
 * Change the password and/or algorithm and options a keyset's private parts
 * are encrypted with.
 * <br />
 * To change the password, pass the current password for @old_pass and the 
 * new password for @new_pass. To leave the password, simply pass the current
 * password for @new_pass as well.
 * <br />
 * To leave the encryption algorithm and options, omit @sym_alg and @sym_opts.
 * If passing @sym_alg, either @sym_opts or defaults are used.
 * @param {string} ks - Keyset with encrypted private key information.
 * @param {string} old_pass
 * @param {string} new_pass
 * @param {string} [sym_alg]
 * @param {object} [sym_opts]
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name change
 * @memberof nCrypt.asym.simple.keyset.priv
 * */
keyset.priv.change = function(ks, old_pass, new_pass, sym_alg, sym_opts){
    if(typeof sym_opts==='undefined'){ sym_opts = {}; }
    return tkeyset.store.encrypt.change(
        ks, old_pass, new_pass, sym_alg, sym_opts);
};

return keyset; });
