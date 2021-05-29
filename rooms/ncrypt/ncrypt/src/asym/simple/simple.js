module.exports = (function(ncrypt, dep){

/**
 * @namespace nCrypt.asym.simple
 * */
var  simple = {};
var _simple = {};

simple.keyset = require('./simple/keyset.js');
simple.keyset = simple.keyset(ncrypt, { 'types': dep.types });

simple.secret = require('./simple/secret.js');
simple.secret = simple.secret(ncrypt, { 'types': dep.types });

simple.signature = require('./simple/signature.js');
simple.signature = simple.signature(ncrypt, { 'types': dep.types });

simple.message = require('./simple/message.js');
simple.message = simple.message(ncrypt, { 'types': dep.types });

return simple; });
