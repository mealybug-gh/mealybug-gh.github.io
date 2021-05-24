/**
 * titaniumcore for nCrypt uses original titaniumcore's block cipher modules
 * only.
 * It is adapted from iambumblehead's titaniumcore fork. 
 * randByte() in Cipher.js was changed to try out every other source of random
 * values (getRandomValues, SJCL) before falling back to Math.random.
 * The files used are Cipher.js and binary.js, package.js seems not to be
 * needed anymore, so is not included.
 * */

var titaniumcore = {};
titaniumcore.Cipher = require('./Cipher.js');
titaniumcore.binary = require('./tools/binary.js');

module.exports = titaniumcore;
