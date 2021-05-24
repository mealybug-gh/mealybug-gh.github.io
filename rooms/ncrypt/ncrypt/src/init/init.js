
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

module.exports = (function(ncrypt){

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.init
 * */
/* public */
var init = {};
/* private */
var _init = {};

/**
 * `nCrypt` needs to be initialized with a set of random data before it can be
 * used.
 * <br />
 * If `nCrypt` seems to be more than buggy, not working at all, throwing 
 * exceptions at nearly any function, check if it was initialized. (If it was
 * and still barely anything works, it probably runs in an outdated or 
 * incompatible environment, like an incompatible browser.)
 * <br />
 * Using `nCrypt` and it's dependencies without initialising with random data
 * is - if it "works" - anything but secure! Cryptographic security often
 * depends on good random values.
 * <br />
 * There are several ways to **obtain random data for `nCrypt`**. However, they
 * tend not to be the same for all browsers and NodeJS. To abstract generating
 * random data, `nCrypt` uses `randomCollector` as a  dependency. 
 * <br />
 * `randomCollector` supports collecting random data both in browser
 * and NodeJs, from built-in random generators or (in browser) from user 
 * interaction (i.e. mouse or touchmove). 
 * <br />
 * `randomCollector` is available from `nCrypt.dep.randomCollector`. To use
 * `randomCollector` without `nCrypt`, use the package 
 * `ncrypt-random-collector`.
 * @param {Uint32Array} buf - An instance of `Uint32Array` filled with
 * cryptographically random data. `nCrypt` needs at least 1024 bit of random
 * data, but usually, initialising with 4096 bit makes sure everything works
 * smoothly. 4096 bit of random data equals an array length of 128 items, each
 * containing a random unsigned `Int32` integer number. (4096 bit / 8 = 512 
 * byte, each `Int32` can represent 4 bytes, 512/4 = 128.)
 * @returns {boolean|SecureExec.exception.Exception} - Returns `true` if 
 * `nCrypt` was initialised properly, and `false` if it wasn't. (If `false` is
 * returned, check arguments and try again with an `Uint32Array` containing 
 * enough random data.)
 * @name init
 * @function
 * @memberof nCrypt.init.init
 * */
init.init = function(buf){
    var seed_rng = function(buf){
        if(typeof buf!=='object' || !(buf instanceof Uint32Array)){
            throw (new ncrypt.exception.init.unexpectedType());
        }
        var len = ((buf.length*4)*8);
        if(len<1024){
            throw (new ncrypt.exception.init.notEnoughEntropy());
        }
        ncrypt.dep.sjcl.random.addEntropy(buf, len, "crypto.getRandomValues");
        var prg;
        try{ prg = ncrypt.dep.sjcl.random.getProgress(10); }catch(e){
            try{ prg = ncrypt.dep.sjcl.random.getProgress(10); }catch(e){
                try{ prg = ncrypt.dep.sjcl.random.getProgress(10); }catch(e){
                    try{ prg = ncrypt.dep.sjcl.random.getProgress(10); }
                    catch(e){ return false; } } } }
        if(!(typeof prg==='undefined' || prg===1)) return false;
        return true;
    };
    var seeded = SecureExec.sync.apply(seed_rng, [ buf ]);
    if(_isExp(seeded) || (typeof seeded==='boolean' && seeded===false))
        return seeded;
    // SJCL's random generator is seeded now
    // nCrypt can run, and elliptic can use random values from SJCL
    if( (typeof ncrypt.dep.elliptic)!=='undefined' ){
        ncrypt.dep.elliptic.rand = function(n){
            var arr = new Uint8Array(n);
            ncrypt.random.crypto.int8.fill(arr);
            return arr;
        };
    }
    return true;
};

return init; });
