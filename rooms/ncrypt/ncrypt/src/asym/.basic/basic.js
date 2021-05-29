module.exports = (function(ncrypt, dep){

/**
 * @namespace nCrypt.asym.basic
 * */
var  basic = {};
var _basic = {};

basic.keypair = require('./basic/keypair.js');
basic.keypair = basic.keypair(ncrypt, { 'types': dep.types });
basic.secret = require('./basic/secret.js');
basic.secret = basic.secret(ncrypt, { 'types': dep.types });
basic.signature = require('./basic/signature.js');
basic.signature = basic.signature(ncrypt, { 'types': dep.types });

return basic; });
