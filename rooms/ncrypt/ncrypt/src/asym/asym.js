module.exports = (function(ncrypt){

/**
 * @namespace nCrypt.asym
 * */
var  asym = {};
var _asym = {};

asym.types = require('./types/types.js');
asym.types = asym.types(ncrypt);

/*asym.basic = require('./.basic/basic.js');
asym.basic = asym.basic(ncrypt, { 'types': asym.types });*/

asym.simple = require('./simple/simple.js');
asym.simple = asym.simple(ncrypt, { 'types': asym.types });

return asym; });
