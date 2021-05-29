
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

/**
 * @namespace nCrypt.random
 * */
/* public */
var random = {};
/* private */
var _random = {};

/* ######################################################################### */
/* #-random.number---------------------------------------------------------# */
/* ######################################################################### */

/**
 * @namespace nCrypt.random.number
 * */
random.number = {};
_random.number = {};

/** 
 * Returns a random integer number. 
 * <br />
 * By default, this function will 
 * return unsigned integers only, which results in only positive numbers 
 * being returned. If negative numbers are allowed, signed integers will be
 * returned, which includes positive and negative numbers.
 * @name number
 * @function
 * @memberof nCrypt.random.number
 * @param {boolean} [allowNegative=false] - Return signed integers if set to
 * true.
 * @returns {number}
 * @throws Exception
 * */
_random.number.number = function(allowNegative){
    //var rand = ncrypt.dep.sjcl.random.randomWords(1, 10)[0];
    var rand;
    if( (typeof allowNegative)!=="undefined" &&
        allowNegative===true ){
        rand = ncrypt.dep.sjcl.random.randomWords(1, 10)[0];
        return rand;
    }else{
        /* convert signed to unsigned integer */
        //rand = ( rand >>> 0); 
        rand = new Uint32Array(ncrypt.dep.sjcl.random.randomWords(1, 10))[0];
        return rand;
    }
};

/**
 * Returns random values in the way Math.random does. As it retrieves the random
 * data from SJCL's random number generator instead of actual `Math.random`, it
 * should be more secure.
 * <br />
 * However, `nCrypt.random.number.mathRandom` should *not be used for 
 * applications which require very strong random values*. 
 * Floating point numbers are not 
 * suitable for encryption purposes (as a result of the lack of precision - the 
 * possible values become sparser the larger the number becomes). 
 * <br />
 * As each 
 * random number is generated from 52 bit of randomness, however, it should 
 * still be far better to use than `Math.random` if your application needs 
 * `Math.random`-like numbers, for example for purposes like custom password
 * generators (where, of course, every char should come from a new `mathRandom`
 * number).
 * @name mathRandom
 * @function
 * @memberof nCrypt.random.number
 * @returns {number}
 * @throws Exception
 * */
random.number.mathRandom = function(){
    /*
     * <qoute>
     * Remember that floating point numbers are just a mantissa coefficient, 
     * multiplied by 2 raised to an exponent:
     * 
     * floating_point_value = mantissa * (2 ^ exponent)
     * 
     * With Math.random, you generate floating points that have a 32-bit random 
     * mantissa and always have an exponent of -32, so that the decimal place 
     * is bit shift to the left 32 places, so the mantissa never has any part 
     * to the left of the decimal place.
     * 
     * mantissa =         10011000111100111111101000110001 (some random 32-bit int)
     * mantissa * 2^-32 = 0.10011000111100111111101000110001
     * 
     * Try running Math.random().toString(2) a few times to verify that this 
     * is the case.
     * 
     * Solution: you can just generate a random 32-bit mantissa and multiply 
     * it by Math.pow(2,-32):
     * 
     * var arr = new Uint32Array(1);
     * crypto.getRandomValues(arr);
     * var result = arr[0] * Math.pow(2,-32);
     * // or just   arr[0] * (0xffffffff + 1);
     * 
     * Note that floating points do not have an even distribution (the possible 
     * values become sparser the larger the numbers become, due to a lack of 
     * precision in the mantissa), making them ill-suited for cryptographic 
     * applications or other domains which require very strong random numbers. 
     * For that, you should use the raw integer values provided to you by 
     * crypto.getRandomValues().
     * 
     * EDIT:
     * 
     * The mantissa in JavaScript is 52 bits, so you could get 52 bits of 
     * randomness:
     * 
     * var arr = new Uint32Array(2);
     * crypto.getRandomValues(arr);
     * 
     * // keep all 32 bits of the the first, top 20 of the second for 52 
     * // random bits
     * var mantissa = (arr[0] * Math.pow(2,20)) + (arr[1] >>> 12)
     * 
     * // shift all 52 bits to the right of the decimal point
     * var result = mantissa * Math.pow(2,-52);
     * 
     * So, all in all, no, this isn't ant shorter than your own solution, 
     * but I think it's the best you can hope to do. You must generate 52 
     * random bits, which needs to be built from 32-bit blocks, and then it 
     * need to be shifted back down to below 1.
     * 
     * </qoute>
     * https://stackoverflow.com/questions/13694626/generating-random-numbers-0-to-1-with-crypto-generatevalues
     * */
    var arr = new Uint32Array(ncrypt.dep.sjcl.random.randomWords(2, 10));
    var mantissa = (arr[0] * Math.pow(2,20)) + (arr[1] >>> 12);
    var rand = mantissa * Math.pow(2,-52);
    return rand;
};

/**
 * Returns a random float between @min and @max. Uses 
 * {@link nCrypt.random.number.mathRandom} internally, acting as a 
 * convenience function.
 * @name float
 * @function
 * @memberof nCrypt.random.number
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number}
 * @throws Exception
 * */
random.number.float = function(min, max){
    var rand = random.number.mathRandom();
    return rand * (max - min) + min;
};

/**
 * Return an Integer in a specific range. (Including @min, excluding @max,
 * so min=1 and max=4 will output 1, 2 or 3).
 * <br />
 * Uses {@link nCrypt.random.number.mathRandom} internally, acting as a 
 * convenience function.
 * @name integer
 * @function
 * @memberof nCrypt.random.number
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number}
 * @throws Exception
 * */
random.number.integer = function(min, max){
    var rand = random.number.mathRandom();
    return Math.floor(rand * (max - min)) + min;
};

/**
 * @namespace nCrypt.random.str
 * */
random.str = {};
random.str.encodings = {
    'hex' : {
        "name": "hex",
        "bit": 4
    },
    'base32' : {
        "name": "base32",
        "bit": 6
    },
    'base64': {
        "name": "base64",
        "bit": 6
    },
    'base64url' : {
        "name": "base64url",
        "bit": 6
    }
};

/**
 * Generate a random string of a certain encoding. As this functions generates
 * the strings from cryptographically random numbers, it should be suitable
 * for password and key generators.
 * <br />
 * To generate a random string of @len characters, simply use 
 * `nCrypt.random.str.generate(len, enc)`. To generate a random string of a 
 * certain bit length, for example to get a 256 bit random string, use
 * `nCrypt.random.str.generate(len, enc, true)` - this will make this function
 * interpret @len as the desired bitlength. (A 256 bit string is for example
 * a 64 characters hexadecimal or a 52 characters base32-string.)
 * <br />
 * If the supported encodings are suitable for your application, this should be
 * much better than generating random strings using the mathRandom-replacement
 * (@see {@link nCrypt.random.number.mathRandom}).
 * @param {number} len - By default the desired length of the generated string,
 * with @len_is_bit_length===`true` the desired bit length.
 * @param {string} enc - Encoding of the generated string. "hex", "base32",
 * "base64" and "base64url" are supported. (In most cases,
 * you will want to use "base64url" instead of "base64",
 * as it uses "-_" instead of "+/" and therefore is more suitable to be sent
 * over the network in GET-requests for example.)
 * @param {boolean} [len_is_bit_length=false] - Treat @len as the
 * desired bitlength.
 * @returns {string}
 * @name generate
 * @function
 * @memberof nCrypt.random.str
 * @throws Exception
 * */
random.str.generate = function(len, enc, len_is_bit_length){
    if( (typeof enc)!=="string" ){
        enc="base64url";
    }
    if( (typeof len)!=="number" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    if( (typeof len_is_bit_length)==="undefined" ){
        len_is_bit_length = false;
    }else{
        if( (typeof len_is_bit_length)!=="boolean"){
            throw new ncrypt.exception.global.unexpectedType();
        }
    }
    var encoding = random.str.encodings[enc];
    if( (typeof encoding)==="undefined"){
        throw new exception.global.invalidArgumentValue(
                        "Invalid encoding: "+enc);
    }
    enc = encoding;
    
    var n_bit;
    if(len_is_bit_length===true){
        n_bit = len;
    }else{
        /* n_bit is the number of bit required to show 1 character using the
         * chosen encoding.
         * */
        n_bit = len*enc.bit;
    }
    
    /* n_32_bit is how many 32 bit integers are needed to get at least n_bit.
     * (Math.ceil is required here, as for example if n_bit is 1, we'd need
     * "0" 32 bit integers to get 1 bit - this of course can't be, so we need 1,
     * the next higher number. 
     * */
    var n_32_bit = Math.ceil(n_bit / 32);
    /*
     * Get the required number of 32 bit integers from SJCL's PRNG.
     * */
    var random_words = ncrypt.dep.sjcl.random.randomWords(n_32_bit, 10);
    /*
     * Get a random string in the desired encoding from the random words.
     * (This results in a string of @len characters or a few more.)
     * */
    var random_string = ncrypt.dep.sjcl.codec[enc.name].fromBits(random_words);
    /*
     * Cut of the possible extra characters and return the random string.
     * */
    return random_string.substr(0, len);
};

/**
 * @namespace nCrypt.random.crypto
 * */
random.crypto = {};

/**
 * @namespace nCrypt.random.crypto.int32
 * */
random.crypto.int32 = {};

/**
 * Generate an array of cryptographically random `Int32`. 
 * @name arr
 * @function
 * @memberof nCrypt.random.crypto.int32
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - Whether the output should be signed `Int32`
 * values or unsigned `Int32` values. 
 * @returns {number[]}
 * @throws Exception
 * */
random.crypto.int32.arr = function(n, signed){
    
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var arr = ncrypt.dep.sjcl.random.randomWords(n, 10);
    var typed_arr;
    if(signed===true){
        //typed_arr = new Int32Array(arr);
        return arr;
    }else{
        typed_arr = new Uint32Array(arr);
        arr = [];
        for(var i=0; i<typed_arr.length; i++){
            arr[i] = typed_arr[i];
        }
        return arr;
    }
};

/**
 * Generate a new `Uint32Array` filled with @n random `Int32`.
 * @name gen
 * @function
 * @memberof nCrypt.random.crypto.int32
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - Whether the output should be signed 
 * `Int32` values or unsigned `Int32` values. 
 * @returns {object}
 * @throws Exception
 * */
random.crypto.int32.gen = function(n, signed){
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var arr = ncrypt.dep.sjcl.random.randomWords(n, 10);
    var typed_arr;
    if(signed===true){
        typed_arr = new Int32Array(arr);
    }else{
        typed_arr = new Uint32Array(arr);
    }
    return typed_arr;
};

/**
 * Fill an existing typed array with @n random `Int32` values. Can be used like
 * `crypto.getRandomValues` to fill an `Uint32Array` or `Int32Array`.
 * @name fill
 * @function
 * @memberof nCrypt.random.crypto.int32
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - False if @ab is an `UInt32Array`, and true
 * if @ab is an `Int32Array`. Doesn't need to be passed for `UInt32Array` 
 * (default), but needs to be true if @ab is an `Int32Array`.
 * @throws Exception
 * */
random.crypto.int32.fill = function(ab, signed){
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var arr = random.crypto.int32.arr(ab.length, signed);
    for(var i=0; i<ab.length; i++){
        ab[i] = arr[i];
    }
};

/**
 * @namespace nCrypt.random.crypto.int8
 * */
random.crypto.int8 = {};
/**
 * Generate an array of cryptographically random bytes. 
 * @name arr
 * @function
 * @memberof nCrypt.random.crypto.int8
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - Whether the output should be signed `Int8`
 * values or unsigned `Int8` values.
 * @returns {number[]}
 * @throws Exception
 * */
random.crypto.int8.arr = function(n, signed){
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var l = Math.floor(((n/4)+1));
    var arr = ncrypt.dep.sjcl.random.randomWords(l, 10);
        /* Every 32 bit signed integer in @arr consists of 4 words. */
        arr = ncrypt.dep.sjcl.codec.bytes.fromBits(arr);
    arr = arr.slice(0, n);
    if(signed===true){
        var typed_arr = new Int8Array(arr);
        arr = [];
        for(var i=0; i<typed_arr.length; i++){
            arr[i] = typed_arr[i];
        }
    }
    return arr;
};
/**
 * Generate a new Uint8Array filled with @n random bytes.
 * @name gen
 * @function
 * @memberof nCrypt.random.crypto.int8
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - Whether the output should be signed `Int8`
 * or unsigned `Int8`.
 * unsigned int8.
 * @returns {object}
 * @throws Exception
 * */
random.crypto.int8.gen = function(n, signed){
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var arr = random.crypto.int8.arr(n);
    if(signed === true){
        arr = new Int8Array(arr);
    }else{
        arr = new Uint8Array(arr);
    }
    return arr;
};

/**
 * Fill an existing typed array with @n random `Int8`. Can be used like
 * `crypto.getRandomValues` to fill an `Uint8Array` or `Int8Array`.
 * @name fill
 * @function
 * @memberof nCrypt.random.crypto.int8
 * @param {number} n - Desired length of the array.
 * @param {boolean} [signed=false] - False if @ab is an `UInt8Array`, and true
 * if @ab is an `Int8Array`. Doesn't need to be passed for `UInt8Array` 
 * (default), but needs to be true if @ab is an `Int8Array`.
 * @throws Exception
 * */
random.crypto.int8.fill = function(ab, signed){
    if ( (typeof signed)==="undefined" ){
        signed = false;
    }
    if ( (typeof signed)!=="boolean" ){
        throw new ncrypt.exception.global.unexpectedType();
    }
    
    var arr = random.crypto.int8.arr(ab.length, signed);
    for(var i=0; i<ab.length; i++){
        ab[i] = arr[i];
    }
};

return random; });
