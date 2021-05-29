(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.nCrypt = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (module, exports) {
  'use strict';

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    Buffer = require('buffer').Buffer;
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
    }

    if (base === 16) {
      this._parseHex(number, start);
    } else {
      this._parseBase(number, base, start);
    }

    if (number[0] === '-') {
      this.negative = 1;
    }

    this.strip();

    if (endian !== 'le') return;

    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [ number & 0x3ffffff ];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [ 0 ];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this.strip();
  };

  function parseHex (str, start, end) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r <<= 4;

      // 'a' - 'f'
      if (c >= 49 && c <= 54) {
        r |= c - 49 + 0xa;

      // 'A' - 'F'
      } else if (c >= 17 && c <= 22) {
        r |= c - 17 + 0xa;

      // '0' - '9'
      } else {
        r |= c & 0xf;
      }
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    // Scan 24-bit chunks and add them to the number
    var off = 0;
    for (i = number.length - 6, j = 0; i >= start; i -= 6) {
      w = parseHex(number, i, i + 6);
      this.words[j] |= (w << off) & 0x3ffffff;
      // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb
      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
    if (i + 6 !== start) {
      w = parseHex(number, start, i + 6);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    }
    this.strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        r += c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        r += c - 17 + 0xa;

      // '0' - '9'
      } else {
        r += c;
      }
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [ 0 ];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype.strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  BN.prototype.inspect = function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  };

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16);
  };

  BN.prototype.toBuffer = function toBuffer (endian, length) {
    assert(typeof Buffer !== 'undefined');
    return this.toArrayLike(Buffer, endian, length);
  };

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    this.strip();
    var littleEndian = endian === 'le';
    var res = new ArrayType(reqLength);

    var b, i;
    var q = this.clone();
    if (!littleEndian) {
      // Assume big-endian
      for (i = 0; i < reqLength - byteLength; i++) {
        res[i] = 0;
      }

      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[reqLength - i - 1] = b;
      }
    } else {
      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[i] = b;
      }

      for (; i < reqLength; i++) {
        res[i] = 0;
      }
    }

    return res;
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this.strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this.strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this.strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this.strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this.strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this.strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out.strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out.strip();
  }

  function jumboMulTo (self, num, out) {
    var fftm = new FFTM();
    return fftm.mulp(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Cooley-Tukey algorithm for FFT
  // slightly revisited to rely on looping instead of recursion

  function FFTM (x, y) {
    this.x = x;
    this.y = y;
  }

  FFTM.prototype.makeRBT = function makeRBT (N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for (var i = 0; i < N; i++) {
      t[i] = this.revBin(i, l, N);
    }

    return t;
  };

  // Returns binary-reversed representation of `x`
  FFTM.prototype.revBin = function revBin (x, l, N) {
    if (x === 0 || x === N - 1) return x;

    var rb = 0;
    for (var i = 0; i < l; i++) {
      rb |= (x & 1) << (l - i - 1);
      x >>= 1;
    }

    return rb;
  };

  // Performs "tweedling" phase, therefore 'emulating'
  // behaviour of the recursive algorithm
  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
    for (var i = 0; i < N; i++) {
      rtws[i] = rws[rbt[i]];
      itws[i] = iws[rbt[i]];
    }
  };

  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);

    for (var s = 1; s < N; s <<= 1) {
      var l = s << 1;

      var rtwdf = Math.cos(2 * Math.PI / l);
      var itwdf = Math.sin(2 * Math.PI / l);

      for (var p = 0; p < N; p += l) {
        var rtwdf_ = rtwdf;
        var itwdf_ = itwdf;

        for (var j = 0; j < s; j++) {
          var re = rtws[p + j];
          var ie = itws[p + j];

          var ro = rtws[p + j + s];
          var io = itws[p + j + s];

          var rx = rtwdf_ * ro - itwdf_ * io;

          io = rtwdf_ * io + itwdf_ * ro;
          ro = rx;

          rtws[p + j] = re + ro;
          itws[p + j] = ie + io;

          rtws[p + j + s] = re - ro;
          itws[p + j + s] = ie - io;

          /* jshint maxdepth : false */
          if (j !== l) {
            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
            rtwdf_ = rx;
          }
        }
      }
    }
  };

  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for (N = N / 2 | 0; N; N = N >>> 1) {
      i++;
    }

    return 1 << i + 1 + odd;
  };

  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
    if (N <= 1) return;

    for (var i = 0; i < N / 2; i++) {
      var t = rws[i];

      rws[i] = rws[N - i - 1];
      rws[N - i - 1] = t;

      t = iws[i];

      iws[i] = -iws[N - i - 1];
      iws[N - i - 1] = -t;
    }
  };

  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
    var carry = 0;
    for (var i = 0; i < N / 2; i++) {
      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
        Math.round(ws[2 * i] / N) +
        carry;

      ws[i] = w & 0x3ffffff;

      if (w < 0x4000000) {
        carry = 0;
      } else {
        carry = w / 0x4000000 | 0;
      }
    }

    return ws;
  };

  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
    var carry = 0;
    for (var i = 0; i < len; i++) {
      carry = carry + (ws[i] | 0);

      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
    }

    // Pad with zeroes
    for (i = 2 * len; i < N; ++i) {
      rws[i] = 0;
    }

    assert(carry === 0);
    assert((carry & ~0x1fff) === 0);
  };

  FFTM.prototype.stub = function stub (N) {
    var ph = new Array(N);
    for (var i = 0; i < N; i++) {
      ph[i] = 0;
    }

    return ph;
  };

  FFTM.prototype.mulp = function mulp (x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);

    var rbt = this.makeRBT(N);

    var _ = this.stub(N);

    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);

    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);

    var rmws = out.words;
    rmws.length = N;

    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);

    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);

    for (var i = 0; i < N; i++) {
      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
      rwst[i] = rx;
    }

    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);

    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out.strip();
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this.strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) {
      // No-op, we should not move anything at all
    } else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this.strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this.strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) < num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this.strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this.strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this.strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q.strip();
    }
    a.strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modn = function modn (num) {
    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return acc;
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    return this.strip();
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this.strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      r.strip();
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
    return a.umod(this.m)._forceRed(this);
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(typeof module === 'undefined' || module, this);

},{"buffer":3}],2:[function(require,module,exports){
var r;

module.exports = function rand(len) {
  if (!r)
    r = new Rand(null);

  return r.generate(len);
};

function Rand(rand) {
  this.rand = rand;
}
module.exports.Rand = Rand;

Rand.prototype.generate = function generate(len) {
  return this._rand(len);
};

// Emulate crypto API using randy
Rand.prototype._rand = function _rand(n) {
  if (this.rand.getBytes)
    return this.rand.getBytes(n);

  var res = new Uint8Array(n);
  for (var i = 0; i < res.length; i++)
    res[i] = this.rand.getByte();
  return res;
};

if (typeof self === 'object') {
  if (self.crypto && self.crypto.getRandomValues) {
    // Modern browsers
    Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.crypto.getRandomValues(arr);
      return arr;
    };
  } else if (self.msCrypto && self.msCrypto.getRandomValues) {
    // IE
    Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.msCrypto.getRandomValues(arr);
      return arr;
    };

  // Safari's WebWorkers do not have `crypto`
  } else if (typeof window === 'object') {
    // Old junk
    Rand.prototype._rand = function() {
      throw new Error('Not implemented yet');
    };
  }
} else {
  // Node.js or Web worker with no crypto support
  try {
    var crypto = require('crypto');
    if (typeof crypto.randomBytes !== 'function')
      throw new Error('Not supported');

    Rand.prototype._rand = function _rand(n) {
      return crypto.randomBytes(n);
    };
  } catch (e) {
  }
}

},{"crypto":3}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
'use strict';

var elliptic = exports;

elliptic.version = require('../package.json').version;
elliptic.utils = require('./elliptic/utils');
elliptic.rand = require('brorand');
elliptic.curve = require('./elliptic/curve');
elliptic.curves = require('./elliptic/curves');

// Protocols
elliptic.ec = require('./elliptic/ec');
elliptic.eddsa = require('./elliptic/eddsa');

},{"../package.json":19,"./elliptic/curve":7,"./elliptic/curves":10,"./elliptic/ec":11,"./elliptic/eddsa":14,"./elliptic/utils":18,"brorand":2}],5:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var getNAF = utils.getNAF;
var getJSF = utils.getJSF;
var assert = utils.assert;

function BaseCurve(type, conf) {
  this.type = type;
  this.p = new BN(conf.p, 16);

  // Use Montgomery, when there is no fast reduction for the prime
  this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);

  // Useful for many curves
  this.zero = new BN(0).toRed(this.red);
  this.one = new BN(1).toRed(this.red);
  this.two = new BN(2).toRed(this.red);

  // Curve configuration, optional
  this.n = conf.n && new BN(conf.n, 16);
  this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);

  // Temporary arrays
  this._wnafT1 = new Array(4);
  this._wnafT2 = new Array(4);
  this._wnafT3 = new Array(4);
  this._wnafT4 = new Array(4);

  // Generalized Greg Maxwell's trick
  var adjustCount = this.n && this.p.div(this.n);
  if (!adjustCount || adjustCount.cmpn(100) > 0) {
    this.redN = null;
  } else {
    this._maxwellTrick = true;
    this.redN = this.n.toRed(this.red);
  }
}
module.exports = BaseCurve;

BaseCurve.prototype.point = function point() {
  throw new Error('Not implemented');
};

BaseCurve.prototype.validate = function validate() {
  throw new Error('Not implemented');
};

BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
  assert(p.precomputed);
  var doubles = p._getDoubles();

  var naf = getNAF(k, 1);
  var I = (1 << (doubles.step + 1)) - (doubles.step % 2 === 0 ? 2 : 1);
  I /= 3;

  // Translate into more windowed form
  var repr = [];
  for (var j = 0; j < naf.length; j += doubles.step) {
    var nafW = 0;
    for (var k = j + doubles.step - 1; k >= j; k--)
      nafW = (nafW << 1) + naf[k];
    repr.push(nafW);
  }

  var a = this.jpoint(null, null, null);
  var b = this.jpoint(null, null, null);
  for (var i = I; i > 0; i--) {
    for (var j = 0; j < repr.length; j++) {
      var nafW = repr[j];
      if (nafW === i)
        b = b.mixedAdd(doubles.points[j]);
      else if (nafW === -i)
        b = b.mixedAdd(doubles.points[j].neg());
    }
    a = a.add(b);
  }
  return a.toP();
};

BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
  var w = 4;

  // Precompute window
  var nafPoints = p._getNAFPoints(w);
  w = nafPoints.wnd;
  var wnd = nafPoints.points;

  // Get NAF form
  var naf = getNAF(k, w);

  // Add `this`*(N+1) for every w-NAF index
  var acc = this.jpoint(null, null, null);
  for (var i = naf.length - 1; i >= 0; i--) {
    // Count zeroes
    for (var k = 0; i >= 0 && naf[i] === 0; i--)
      k++;
    if (i >= 0)
      k++;
    acc = acc.dblp(k);

    if (i < 0)
      break;
    var z = naf[i];
    assert(z !== 0);
    if (p.type === 'affine') {
      // J +- P
      if (z > 0)
        acc = acc.mixedAdd(wnd[(z - 1) >> 1]);
      else
        acc = acc.mixedAdd(wnd[(-z - 1) >> 1].neg());
    } else {
      // J +- J
      if (z > 0)
        acc = acc.add(wnd[(z - 1) >> 1]);
      else
        acc = acc.add(wnd[(-z - 1) >> 1].neg());
    }
  }
  return p.type === 'affine' ? acc.toP() : acc;
};

BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW,
                                                       points,
                                                       coeffs,
                                                       len,
                                                       jacobianResult) {
  var wndWidth = this._wnafT1;
  var wnd = this._wnafT2;
  var naf = this._wnafT3;

  // Fill all arrays
  var max = 0;
  for (var i = 0; i < len; i++) {
    var p = points[i];
    var nafPoints = p._getNAFPoints(defW);
    wndWidth[i] = nafPoints.wnd;
    wnd[i] = nafPoints.points;
  }

  // Comb small window NAFs
  for (var i = len - 1; i >= 1; i -= 2) {
    var a = i - 1;
    var b = i;
    if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
      naf[a] = getNAF(coeffs[a], wndWidth[a]);
      naf[b] = getNAF(coeffs[b], wndWidth[b]);
      max = Math.max(naf[a].length, max);
      max = Math.max(naf[b].length, max);
      continue;
    }

    var comb = [
      points[a], /* 1 */
      null, /* 3 */
      null, /* 5 */
      points[b] /* 7 */
    ];

    // Try to avoid Projective points, if possible
    if (points[a].y.cmp(points[b].y) === 0) {
      comb[1] = points[a].add(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].add(points[b].neg());
    } else {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    }

    var index = [
      -3, /* -1 -1 */
      -1, /* -1 0 */
      -5, /* -1 1 */
      -7, /* 0 -1 */
      0, /* 0 0 */
      7, /* 0 1 */
      5, /* 1 -1 */
      1, /* 1 0 */
      3  /* 1 1 */
    ];

    var jsf = getJSF(coeffs[a], coeffs[b]);
    max = Math.max(jsf[0].length, max);
    naf[a] = new Array(max);
    naf[b] = new Array(max);
    for (var j = 0; j < max; j++) {
      var ja = jsf[0][j] | 0;
      var jb = jsf[1][j] | 0;

      naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
      naf[b][j] = 0;
      wnd[a] = comb;
    }
  }

  var acc = this.jpoint(null, null, null);
  var tmp = this._wnafT4;
  for (var i = max; i >= 0; i--) {
    var k = 0;

    while (i >= 0) {
      var zero = true;
      for (var j = 0; j < len; j++) {
        tmp[j] = naf[j][i] | 0;
        if (tmp[j] !== 0)
          zero = false;
      }
      if (!zero)
        break;
      k++;
      i--;
    }
    if (i >= 0)
      k++;
    acc = acc.dblp(k);
    if (i < 0)
      break;

    for (var j = 0; j < len; j++) {
      var z = tmp[j];
      var p;
      if (z === 0)
        continue;
      else if (z > 0)
        p = wnd[j][(z - 1) >> 1];
      else if (z < 0)
        p = wnd[j][(-z - 1) >> 1].neg();

      if (p.type === 'affine')
        acc = acc.mixedAdd(p);
      else
        acc = acc.add(p);
    }
  }
  // Zeroify references
  for (var i = 0; i < len; i++)
    wnd[i] = null;

  if (jacobianResult)
    return acc;
  else
    return acc.toP();
};

function BasePoint(curve, type) {
  this.curve = curve;
  this.type = type;
  this.precomputed = null;
}
BaseCurve.BasePoint = BasePoint;

BasePoint.prototype.eq = function eq(/*other*/) {
  throw new Error('Not implemented');
};

BasePoint.prototype.validate = function validate() {
  return this.curve.validate(this);
};

BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
  bytes = utils.toArray(bytes, enc);

  var len = this.p.byteLength();

  // uncompressed, hybrid-odd, hybrid-even
  if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) &&
      bytes.length - 1 === 2 * len) {
    if (bytes[0] === 0x06)
      assert(bytes[bytes.length - 1] % 2 === 0);
    else if (bytes[0] === 0x07)
      assert(bytes[bytes.length - 1] % 2 === 1);

    var res =  this.point(bytes.slice(1, 1 + len),
                          bytes.slice(1 + len, 1 + 2 * len));

    return res;
  } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) &&
              bytes.length - 1 === len) {
    return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
  }
  throw new Error('Unknown point format');
};

BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
  return this.encode(enc, true);
};

BasePoint.prototype._encode = function _encode(compact) {
  var len = this.curve.p.byteLength();
  var x = this.getX().toArray('be', len);

  if (compact)
    return [ this.getY().isEven() ? 0x02 : 0x03 ].concat(x);

  return [ 0x04 ].concat(x, this.getY().toArray('be', len)) ;
};

BasePoint.prototype.encode = function encode(enc, compact) {
  return utils.encode(this._encode(compact), enc);
};

BasePoint.prototype.precompute = function precompute(power) {
  if (this.precomputed)
    return this;

  var precomputed = {
    doubles: null,
    naf: null,
    beta: null
  };
  precomputed.naf = this._getNAFPoints(8);
  precomputed.doubles = this._getDoubles(4, power);
  precomputed.beta = this._getBeta();
  this.precomputed = precomputed;

  return this;
};

BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
  if (!this.precomputed)
    return false;

  var doubles = this.precomputed.doubles;
  if (!doubles)
    return false;

  return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
};

BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
  if (this.precomputed && this.precomputed.doubles)
    return this.precomputed.doubles;

  var doubles = [ this ];
  var acc = this;
  for (var i = 0; i < power; i += step) {
    for (var j = 0; j < step; j++)
      acc = acc.dbl();
    doubles.push(acc);
  }
  return {
    step: step,
    points: doubles
  };
};

BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
  if (this.precomputed && this.precomputed.naf)
    return this.precomputed.naf;

  var res = [ this ];
  var max = (1 << wnd) - 1;
  var dbl = max === 1 ? null : this.dbl();
  for (var i = 1; i < max; i++)
    res[i] = res[i - 1].add(dbl);
  return {
    wnd: wnd,
    points: res
  };
};

BasePoint.prototype._getBeta = function _getBeta() {
  return null;
};

BasePoint.prototype.dblp = function dblp(k) {
  var r = this;
  for (var i = 0; i < k; i++)
    r = r.dbl();
  return r;
};

},{"../../elliptic":4,"bn.js":1}],6:[function(require,module,exports){
'use strict';

var curve = require('../curve');
var elliptic = require('../../elliptic');
var BN = require('bn.js');
var inherits = require('inherits');
var Base = curve.base;

var assert = elliptic.utils.assert;

function EdwardsCurve(conf) {
  // NOTE: Important as we are creating point in Base.call()
  this.twisted = (conf.a | 0) !== 1;
  this.mOneA = this.twisted && (conf.a | 0) === -1;
  this.extended = this.mOneA;

  Base.call(this, 'edwards', conf);

  this.a = new BN(conf.a, 16).umod(this.red.m);
  this.a = this.a.toRed(this.red);
  this.c = new BN(conf.c, 16).toRed(this.red);
  this.c2 = this.c.redSqr();
  this.d = new BN(conf.d, 16).toRed(this.red);
  this.dd = this.d.redAdd(this.d);

  assert(!this.twisted || this.c.fromRed().cmpn(1) === 0);
  this.oneC = (conf.c | 0) === 1;
}
inherits(EdwardsCurve, Base);
module.exports = EdwardsCurve;

EdwardsCurve.prototype._mulA = function _mulA(num) {
  if (this.mOneA)
    return num.redNeg();
  else
    return this.a.redMul(num);
};

EdwardsCurve.prototype._mulC = function _mulC(num) {
  if (this.oneC)
    return num;
  else
    return this.c.redMul(num);
};

// Just for compatibility with Short curve
EdwardsCurve.prototype.jpoint = function jpoint(x, y, z, t) {
  return this.point(x, y, z, t);
};

EdwardsCurve.prototype.pointFromX = function pointFromX(x, odd) {
  x = new BN(x, 16);
  if (!x.red)
    x = x.toRed(this.red);

  var x2 = x.redSqr();
  var rhs = this.c2.redSub(this.a.redMul(x2));
  var lhs = this.one.redSub(this.c2.redMul(this.d).redMul(x2));

  var y2 = rhs.redMul(lhs.redInvm());
  var y = y2.redSqrt();
  if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  var isOdd = y.fromRed().isOdd();
  if (odd && !isOdd || !odd && isOdd)
    y = y.redNeg();

  return this.point(x, y);
};

EdwardsCurve.prototype.pointFromY = function pointFromY(y, odd) {
  y = new BN(y, 16);
  if (!y.red)
    y = y.toRed(this.red);

  // x^2 = (y^2 - c^2) / (c^2 d y^2 - a)
  var y2 = y.redSqr();
  var lhs = y2.redSub(this.c2);
  var rhs = y2.redMul(this.d).redMul(this.c2).redSub(this.a);
  var x2 = lhs.redMul(rhs.redInvm());

  if (x2.cmp(this.zero) === 0) {
    if (odd)
      throw new Error('invalid point');
    else
      return this.point(this.zero, y);
  }

  var x = x2.redSqrt();
  if (x.redSqr().redSub(x2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  if (x.fromRed().isOdd() !== odd)
    x = x.redNeg();

  return this.point(x, y);
};

EdwardsCurve.prototype.validate = function validate(point) {
  if (point.isInfinity())
    return true;

  // Curve: A * X^2 + Y^2 = C^2 * (1 + D * X^2 * Y^2)
  point.normalize();

  var x2 = point.x.redSqr();
  var y2 = point.y.redSqr();
  var lhs = x2.redMul(this.a).redAdd(y2);
  var rhs = this.c2.redMul(this.one.redAdd(this.d.redMul(x2).redMul(y2)));

  return lhs.cmp(rhs) === 0;
};

function Point(curve, x, y, z, t) {
  Base.BasePoint.call(this, curve, 'projective');
  if (x === null && y === null && z === null) {
    this.x = this.curve.zero;
    this.y = this.curve.one;
    this.z = this.curve.one;
    this.t = this.curve.zero;
    this.zOne = true;
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    this.z = z ? new BN(z, 16) : this.curve.one;
    this.t = t && new BN(t, 16);
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    if (!this.z.red)
      this.z = this.z.toRed(this.curve.red);
    if (this.t && !this.t.red)
      this.t = this.t.toRed(this.curve.red);
    this.zOne = this.z === this.curve.one;

    // Use extended coordinates
    if (this.curve.extended && !this.t) {
      this.t = this.x.redMul(this.y);
      if (!this.zOne)
        this.t = this.t.redMul(this.z.redInvm());
    }
  }
}
inherits(Point, Base.BasePoint);

EdwardsCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
  return Point.fromJSON(this, obj);
};

EdwardsCurve.prototype.point = function point(x, y, z, t) {
  return new Point(this, x, y, z, t);
};

Point.fromJSON = function fromJSON(curve, obj) {
  return new Point(curve, obj[0], obj[1], obj[2]);
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' y: ' + this.y.fromRed().toString(16, 2) +
      ' z: ' + this.z.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.x.cmpn(0) === 0 &&
    (this.y.cmp(this.z) === 0 ||
    (this.zOne && this.y.cmp(this.curve.c) === 0));
};

Point.prototype._extDbl = function _extDbl() {
  // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
  //     #doubling-dbl-2008-hwcd
  // 4M + 4S

  // A = X1^2
  var a = this.x.redSqr();
  // B = Y1^2
  var b = this.y.redSqr();
  // C = 2 * Z1^2
  var c = this.z.redSqr();
  c = c.redIAdd(c);
  // D = a * A
  var d = this.curve._mulA(a);
  // E = (X1 + Y1)^2 - A - B
  var e = this.x.redAdd(this.y).redSqr().redISub(a).redISub(b);
  // G = D + B
  var g = d.redAdd(b);
  // F = G - C
  var f = g.redSub(c);
  // H = D - B
  var h = d.redSub(b);
  // X3 = E * F
  var nx = e.redMul(f);
  // Y3 = G * H
  var ny = g.redMul(h);
  // T3 = E * H
  var nt = e.redMul(h);
  // Z3 = F * G
  var nz = f.redMul(g);
  return this.curve.point(nx, ny, nz, nt);
};

Point.prototype._projDbl = function _projDbl() {
  // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
  //     #doubling-dbl-2008-bbjlp
  //     #doubling-dbl-2007-bl
  // and others
  // Generally 3M + 4S or 2M + 4S

  // B = (X1 + Y1)^2
  var b = this.x.redAdd(this.y).redSqr();
  // C = X1^2
  var c = this.x.redSqr();
  // D = Y1^2
  var d = this.y.redSqr();

  var nx;
  var ny;
  var nz;
  if (this.curve.twisted) {
    // E = a * C
    var e = this.curve._mulA(c);
    // F = E + D
    var f = e.redAdd(d);
    if (this.zOne) {
      // X3 = (B - C - D) * (F - 2)
      nx = b.redSub(c).redSub(d).redMul(f.redSub(this.curve.two));
      // Y3 = F * (E - D)
      ny = f.redMul(e.redSub(d));
      // Z3 = F^2 - 2 * F
      nz = f.redSqr().redSub(f).redSub(f);
    } else {
      // H = Z1^2
      var h = this.z.redSqr();
      // J = F - 2 * H
      var j = f.redSub(h).redISub(h);
      // X3 = (B-C-D)*J
      nx = b.redSub(c).redISub(d).redMul(j);
      // Y3 = F * (E - D)
      ny = f.redMul(e.redSub(d));
      // Z3 = F * J
      nz = f.redMul(j);
    }
  } else {
    // E = C + D
    var e = c.redAdd(d);
    // H = (c * Z1)^2
    var h = this.curve._mulC(this.z).redSqr();
    // J = E - 2 * H
    var j = e.redSub(h).redSub(h);
    // X3 = c * (B - E) * J
    nx = this.curve._mulC(b.redISub(e)).redMul(j);
    // Y3 = c * E * (C - D)
    ny = this.curve._mulC(e).redMul(c.redISub(d));
    // Z3 = E * J
    nz = e.redMul(j);
  }
  return this.curve.point(nx, ny, nz);
};

Point.prototype.dbl = function dbl() {
  if (this.isInfinity())
    return this;

  // Double in extended coordinates
  if (this.curve.extended)
    return this._extDbl();
  else
    return this._projDbl();
};

Point.prototype._extAdd = function _extAdd(p) {
  // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
  //     #addition-add-2008-hwcd-3
  // 8M

  // A = (Y1 - X1) * (Y2 - X2)
  var a = this.y.redSub(this.x).redMul(p.y.redSub(p.x));
  // B = (Y1 + X1) * (Y2 + X2)
  var b = this.y.redAdd(this.x).redMul(p.y.redAdd(p.x));
  // C = T1 * k * T2
  var c = this.t.redMul(this.curve.dd).redMul(p.t);
  // D = Z1 * 2 * Z2
  var d = this.z.redMul(p.z.redAdd(p.z));
  // E = B - A
  var e = b.redSub(a);
  // F = D - C
  var f = d.redSub(c);
  // G = D + C
  var g = d.redAdd(c);
  // H = B + A
  var h = b.redAdd(a);
  // X3 = E * F
  var nx = e.redMul(f);
  // Y3 = G * H
  var ny = g.redMul(h);
  // T3 = E * H
  var nt = e.redMul(h);
  // Z3 = F * G
  var nz = f.redMul(g);
  return this.curve.point(nx, ny, nz, nt);
};

Point.prototype._projAdd = function _projAdd(p) {
  // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
  //     #addition-add-2008-bbjlp
  //     #addition-add-2007-bl
  // 10M + 1S

  // A = Z1 * Z2
  var a = this.z.redMul(p.z);
  // B = A^2
  var b = a.redSqr();
  // C = X1 * X2
  var c = this.x.redMul(p.x);
  // D = Y1 * Y2
  var d = this.y.redMul(p.y);
  // E = d * C * D
  var e = this.curve.d.redMul(c).redMul(d);
  // F = B - E
  var f = b.redSub(e);
  // G = B + E
  var g = b.redAdd(e);
  // X3 = A * F * ((X1 + Y1) * (X2 + Y2) - C - D)
  var tmp = this.x.redAdd(this.y).redMul(p.x.redAdd(p.y)).redISub(c).redISub(d);
  var nx = a.redMul(f).redMul(tmp);
  var ny;
  var nz;
  if (this.curve.twisted) {
    // Y3 = A * G * (D - a * C)
    ny = a.redMul(g).redMul(d.redSub(this.curve._mulA(c)));
    // Z3 = F * G
    nz = f.redMul(g);
  } else {
    // Y3 = A * G * (D - C)
    ny = a.redMul(g).redMul(d.redSub(c));
    // Z3 = c * F * G
    nz = this.curve._mulC(f).redMul(g);
  }
  return this.curve.point(nx, ny, nz);
};

Point.prototype.add = function add(p) {
  if (this.isInfinity())
    return p;
  if (p.isInfinity())
    return this;

  if (this.curve.extended)
    return this._extAdd(p);
  else
    return this._projAdd(p);
};

Point.prototype.mul = function mul(k) {
  if (this._hasDoubles(k))
    return this.curve._fixedNafMul(this, k);
  else
    return this.curve._wnafMul(this, k);
};

Point.prototype.mulAdd = function mulAdd(k1, p, k2) {
  return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, false);
};

Point.prototype.jmulAdd = function jmulAdd(k1, p, k2) {
  return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, true);
};

Point.prototype.normalize = function normalize() {
  if (this.zOne)
    return this;

  // Normalize coordinates
  var zi = this.z.redInvm();
  this.x = this.x.redMul(zi);
  this.y = this.y.redMul(zi);
  if (this.t)
    this.t = this.t.redMul(zi);
  this.z = this.curve.one;
  this.zOne = true;
  return this;
};

Point.prototype.neg = function neg() {
  return this.curve.point(this.x.redNeg(),
                          this.y,
                          this.z,
                          this.t && this.t.redNeg());
};

Point.prototype.getX = function getX() {
  this.normalize();
  return this.x.fromRed();
};

Point.prototype.getY = function getY() {
  this.normalize();
  return this.y.fromRed();
};

Point.prototype.eq = function eq(other) {
  return this === other ||
         this.getX().cmp(other.getX()) === 0 &&
         this.getY().cmp(other.getY()) === 0;
};

Point.prototype.eqXToP = function eqXToP(x) {
  var rx = x.toRed(this.curve.red).redMul(this.z);
  if (this.x.cmp(rx) === 0)
    return true;

  var xc = x.clone();
  var t = this.curve.redN.redMul(this.z);
  for (;;) {
    xc.iadd(this.curve.n);
    if (xc.cmp(this.curve.p) >= 0)
      return false;

    rx.redIAdd(t);
    if (this.x.cmp(rx) === 0)
      return true;
  }
};

// Compatibility with BaseCurve
Point.prototype.toP = Point.prototype.normalize;
Point.prototype.mixedAdd = Point.prototype.add;

},{"../../elliptic":4,"../curve":7,"bn.js":1,"inherits":33}],7:[function(require,module,exports){
'use strict';

var curve = exports;

curve.base = require('./base');
curve.short = require('./short');
curve.mont = require('./mont');
curve.edwards = require('./edwards');

},{"./base":5,"./edwards":6,"./mont":8,"./short":9}],8:[function(require,module,exports){
'use strict';

var curve = require('../curve');
var BN = require('bn.js');
var inherits = require('inherits');
var Base = curve.base;

var elliptic = require('../../elliptic');
var utils = elliptic.utils;

function MontCurve(conf) {
  Base.call(this, 'mont', conf);

  this.a = new BN(conf.a, 16).toRed(this.red);
  this.b = new BN(conf.b, 16).toRed(this.red);
  this.i4 = new BN(4).toRed(this.red).redInvm();
  this.two = new BN(2).toRed(this.red);
  this.a24 = this.i4.redMul(this.a.redAdd(this.two));
}
inherits(MontCurve, Base);
module.exports = MontCurve;

MontCurve.prototype.validate = function validate(point) {
  var x = point.normalize().x;
  var x2 = x.redSqr();
  var rhs = x2.redMul(x).redAdd(x2.redMul(this.a)).redAdd(x);
  var y = rhs.redSqrt();

  return y.redSqr().cmp(rhs) === 0;
};

function Point(curve, x, z) {
  Base.BasePoint.call(this, curve, 'projective');
  if (x === null && z === null) {
    this.x = this.curve.one;
    this.z = this.curve.zero;
  } else {
    this.x = new BN(x, 16);
    this.z = new BN(z, 16);
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.z.red)
      this.z = this.z.toRed(this.curve.red);
  }
}
inherits(Point, Base.BasePoint);

MontCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
  return this.point(utils.toArray(bytes, enc), 1);
};

MontCurve.prototype.point = function point(x, z) {
  return new Point(this, x, z);
};

MontCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
  return Point.fromJSON(this, obj);
};

Point.prototype.precompute = function precompute() {
  // No-op
};

Point.prototype._encode = function _encode() {
  return this.getX().toArray('be', this.curve.p.byteLength());
};

Point.fromJSON = function fromJSON(curve, obj) {
  return new Point(curve, obj[0], obj[1] || curve.one);
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' z: ' + this.z.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.z.cmpn(0) === 0;
};

Point.prototype.dbl = function dbl() {
  // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#doubling-dbl-1987-m-3
  // 2M + 2S + 4A

  // A = X1 + Z1
  var a = this.x.redAdd(this.z);
  // AA = A^2
  var aa = a.redSqr();
  // B = X1 - Z1
  var b = this.x.redSub(this.z);
  // BB = B^2
  var bb = b.redSqr();
  // C = AA - BB
  var c = aa.redSub(bb);
  // X3 = AA * BB
  var nx = aa.redMul(bb);
  // Z3 = C * (BB + A24 * C)
  var nz = c.redMul(bb.redAdd(this.curve.a24.redMul(c)));
  return this.curve.point(nx, nz);
};

Point.prototype.add = function add() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.diffAdd = function diffAdd(p, diff) {
  // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#diffadd-dadd-1987-m-3
  // 4M + 2S + 6A

  // A = X2 + Z2
  var a = this.x.redAdd(this.z);
  // B = X2 - Z2
  var b = this.x.redSub(this.z);
  // C = X3 + Z3
  var c = p.x.redAdd(p.z);
  // D = X3 - Z3
  var d = p.x.redSub(p.z);
  // DA = D * A
  var da = d.redMul(a);
  // CB = C * B
  var cb = c.redMul(b);
  // X5 = Z1 * (DA + CB)^2
  var nx = diff.z.redMul(da.redAdd(cb).redSqr());
  // Z5 = X1 * (DA - CB)^2
  var nz = diff.x.redMul(da.redISub(cb).redSqr());
  return this.curve.point(nx, nz);
};

Point.prototype.mul = function mul(k) {
  var t = k.clone();
  var a = this; // (N / 2) * Q + Q
  var b = this.curve.point(null, null); // (N / 2) * Q
  var c = this; // Q

  for (var bits = []; t.cmpn(0) !== 0; t.iushrn(1))
    bits.push(t.andln(1));

  for (var i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === 0) {
      // N * Q + Q = ((N / 2) * Q + Q)) + (N / 2) * Q
      a = a.diffAdd(b, c);
      // N * Q = 2 * ((N / 2) * Q + Q))
      b = b.dbl();
    } else {
      // N * Q = ((N / 2) * Q + Q) + ((N / 2) * Q)
      b = a.diffAdd(b, c);
      // N * Q + Q = 2 * ((N / 2) * Q + Q)
      a = a.dbl();
    }
  }
  return b;
};

Point.prototype.mulAdd = function mulAdd() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.jumlAdd = function jumlAdd() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.eq = function eq(other) {
  return this.getX().cmp(other.getX()) === 0;
};

Point.prototype.normalize = function normalize() {
  this.x = this.x.redMul(this.z.redInvm());
  this.z = this.curve.one;
  return this;
};

Point.prototype.getX = function getX() {
  // Normalize coordinates
  this.normalize();

  return this.x.fromRed();
};

},{"../../elliptic":4,"../curve":7,"bn.js":1,"inherits":33}],9:[function(require,module,exports){
'use strict';

var curve = require('../curve');
var elliptic = require('../../elliptic');
var BN = require('bn.js');
var inherits = require('inherits');
var Base = curve.base;

var assert = elliptic.utils.assert;

function ShortCurve(conf) {
  Base.call(this, 'short', conf);

  this.a = new BN(conf.a, 16).toRed(this.red);
  this.b = new BN(conf.b, 16).toRed(this.red);
  this.tinv = this.two.redInvm();

  this.zeroA = this.a.fromRed().cmpn(0) === 0;
  this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;

  // If the curve is endomorphic, precalculate beta and lambda
  this.endo = this._getEndomorphism(conf);
  this._endoWnafT1 = new Array(4);
  this._endoWnafT2 = new Array(4);
}
inherits(ShortCurve, Base);
module.exports = ShortCurve;

ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
  // No efficient endomorphism
  if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1)
    return;

  // Compute beta and lambda, that lambda * P = (beta * Px; Py)
  var beta;
  var lambda;
  if (conf.beta) {
    beta = new BN(conf.beta, 16).toRed(this.red);
  } else {
    var betas = this._getEndoRoots(this.p);
    // Choose the smallest beta
    beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
    beta = beta.toRed(this.red);
  }
  if (conf.lambda) {
    lambda = new BN(conf.lambda, 16);
  } else {
    // Choose the lambda that is matching selected beta
    var lambdas = this._getEndoRoots(this.n);
    if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
      lambda = lambdas[0];
    } else {
      lambda = lambdas[1];
      assert(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
    }
  }

  // Get basis vectors, used for balanced length-two representation
  var basis;
  if (conf.basis) {
    basis = conf.basis.map(function(vec) {
      return {
        a: new BN(vec.a, 16),
        b: new BN(vec.b, 16)
      };
    });
  } else {
    basis = this._getEndoBasis(lambda);
  }

  return {
    beta: beta,
    lambda: lambda,
    basis: basis
  };
};

ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
  // Find roots of for x^2 + x + 1 in F
  // Root = (-1 +- Sqrt(-3)) / 2
  //
  var red = num === this.p ? this.red : BN.mont(num);
  var tinv = new BN(2).toRed(red).redInvm();
  var ntinv = tinv.redNeg();

  var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);

  var l1 = ntinv.redAdd(s).fromRed();
  var l2 = ntinv.redSub(s).fromRed();
  return [ l1, l2 ];
};

ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
  // aprxSqrt >= sqrt(this.n)
  var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));

  // 3.74
  // Run EGCD, until r(L + 1) < aprxSqrt
  var u = lambda;
  var v = this.n.clone();
  var x1 = new BN(1);
  var y1 = new BN(0);
  var x2 = new BN(0);
  var y2 = new BN(1);

  // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)
  var a0;
  var b0;
  // First vector
  var a1;
  var b1;
  // Second vector
  var a2;
  var b2;

  var prevR;
  var i = 0;
  var r;
  var x;
  while (u.cmpn(0) !== 0) {
    var q = v.div(u);
    r = v.sub(q.mul(u));
    x = x2.sub(q.mul(x1));
    var y = y2.sub(q.mul(y1));

    if (!a1 && r.cmp(aprxSqrt) < 0) {
      a0 = prevR.neg();
      b0 = x1;
      a1 = r.neg();
      b1 = x;
    } else if (a1 && ++i === 2) {
      break;
    }
    prevR = r;

    v = u;
    u = r;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  a2 = r.neg();
  b2 = x;

  var len1 = a1.sqr().add(b1.sqr());
  var len2 = a2.sqr().add(b2.sqr());
  if (len2.cmp(len1) >= 0) {
    a2 = a0;
    b2 = b0;
  }

  // Normalize signs
  if (a1.negative) {
    a1 = a1.neg();
    b1 = b1.neg();
  }
  if (a2.negative) {
    a2 = a2.neg();
    b2 = b2.neg();
  }

  return [
    { a: a1, b: b1 },
    { a: a2, b: b2 }
  ];
};

ShortCurve.prototype._endoSplit = function _endoSplit(k) {
  var basis = this.endo.basis;
  var v1 = basis[0];
  var v2 = basis[1];

  var c1 = v2.b.mul(k).divRound(this.n);
  var c2 = v1.b.neg().mul(k).divRound(this.n);

  var p1 = c1.mul(v1.a);
  var p2 = c2.mul(v2.a);
  var q1 = c1.mul(v1.b);
  var q2 = c2.mul(v2.b);

  // Calculate answer
  var k1 = k.sub(p1).sub(p2);
  var k2 = q1.add(q2).neg();
  return { k1: k1, k2: k2 };
};

ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
  x = new BN(x, 16);
  if (!x.red)
    x = x.toRed(this.red);

  var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
  var y = y2.redSqrt();
  if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  // XXX Is there any way to tell if the number is odd without converting it
  // to non-red form?
  var isOdd = y.fromRed().isOdd();
  if (odd && !isOdd || !odd && isOdd)
    y = y.redNeg();

  return this.point(x, y);
};

ShortCurve.prototype.validate = function validate(point) {
  if (point.inf)
    return true;

  var x = point.x;
  var y = point.y;

  var ax = this.a.redMul(x);
  var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
  return y.redSqr().redISub(rhs).cmpn(0) === 0;
};

ShortCurve.prototype._endoWnafMulAdd =
    function _endoWnafMulAdd(points, coeffs, jacobianResult) {
  var npoints = this._endoWnafT1;
  var ncoeffs = this._endoWnafT2;
  for (var i = 0; i < points.length; i++) {
    var split = this._endoSplit(coeffs[i]);
    var p = points[i];
    var beta = p._getBeta();

    if (split.k1.negative) {
      split.k1.ineg();
      p = p.neg(true);
    }
    if (split.k2.negative) {
      split.k2.ineg();
      beta = beta.neg(true);
    }

    npoints[i * 2] = p;
    npoints[i * 2 + 1] = beta;
    ncoeffs[i * 2] = split.k1;
    ncoeffs[i * 2 + 1] = split.k2;
  }
  var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);

  // Clean-up references to points and coefficients
  for (var j = 0; j < i * 2; j++) {
    npoints[j] = null;
    ncoeffs[j] = null;
  }
  return res;
};

function Point(curve, x, y, isRed) {
  Base.BasePoint.call(this, curve, 'affine');
  if (x === null && y === null) {
    this.x = null;
    this.y = null;
    this.inf = true;
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    // Force redgomery representation when loading from JSON
    if (isRed) {
      this.x.forceRed(this.curve.red);
      this.y.forceRed(this.curve.red);
    }
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    this.inf = false;
  }
}
inherits(Point, Base.BasePoint);

ShortCurve.prototype.point = function point(x, y, isRed) {
  return new Point(this, x, y, isRed);
};

ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
  return Point.fromJSON(this, obj, red);
};

Point.prototype._getBeta = function _getBeta() {
  if (!this.curve.endo)
    return;

  var pre = this.precomputed;
  if (pre && pre.beta)
    return pre.beta;

  var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
  if (pre) {
    var curve = this.curve;
    var endoMul = function(p) {
      return curve.point(p.x.redMul(curve.endo.beta), p.y);
    };
    pre.beta = beta;
    beta.precomputed = {
      beta: null,
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(endoMul)
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(endoMul)
      }
    };
  }
  return beta;
};

Point.prototype.toJSON = function toJSON() {
  if (!this.precomputed)
    return [ this.x, this.y ];

  return [ this.x, this.y, this.precomputed && {
    doubles: this.precomputed.doubles && {
      step: this.precomputed.doubles.step,
      points: this.precomputed.doubles.points.slice(1)
    },
    naf: this.precomputed.naf && {
      wnd: this.precomputed.naf.wnd,
      points: this.precomputed.naf.points.slice(1)
    }
  } ];
};

Point.fromJSON = function fromJSON(curve, obj, red) {
  if (typeof obj === 'string')
    obj = JSON.parse(obj);
  var res = curve.point(obj[0], obj[1], red);
  if (!obj[2])
    return res;

  function obj2point(obj) {
    return curve.point(obj[0], obj[1], red);
  }

  var pre = obj[2];
  res.precomputed = {
    beta: null,
    doubles: pre.doubles && {
      step: pre.doubles.step,
      points: [ res ].concat(pre.doubles.points.map(obj2point))
    },
    naf: pre.naf && {
      wnd: pre.naf.wnd,
      points: [ res ].concat(pre.naf.points.map(obj2point))
    }
  };
  return res;
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' y: ' + this.y.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  return this.inf;
};

Point.prototype.add = function add(p) {
  // O + P = P
  if (this.inf)
    return p;

  // P + O = P
  if (p.inf)
    return this;

  // P + P = 2P
  if (this.eq(p))
    return this.dbl();

  // P + (-P) = O
  if (this.neg().eq(p))
    return this.curve.point(null, null);

  // P + Q = O
  if (this.x.cmp(p.x) === 0)
    return this.curve.point(null, null);

  var c = this.y.redSub(p.y);
  if (c.cmpn(0) !== 0)
    c = c.redMul(this.x.redSub(p.x).redInvm());
  var nx = c.redSqr().redISub(this.x).redISub(p.x);
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.dbl = function dbl() {
  if (this.inf)
    return this;

  // 2P = O
  var ys1 = this.y.redAdd(this.y);
  if (ys1.cmpn(0) === 0)
    return this.curve.point(null, null);

  var a = this.curve.a;

  var x2 = this.x.redSqr();
  var dyinv = ys1.redInvm();
  var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);

  var nx = c.redSqr().redISub(this.x.redAdd(this.x));
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.getX = function getX() {
  return this.x.fromRed();
};

Point.prototype.getY = function getY() {
  return this.y.fromRed();
};

Point.prototype.mul = function mul(k) {
  k = new BN(k, 16);

  if (this._hasDoubles(k))
    return this.curve._fixedNafMul(this, k);
  else if (this.curve.endo)
    return this.curve._endoWnafMulAdd([ this ], [ k ]);
  else
    return this.curve._wnafMul(this, k);
};

Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2);
};

Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs, true);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
};

Point.prototype.eq = function eq(p) {
  return this === p ||
         this.inf === p.inf &&
             (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
};

Point.prototype.neg = function neg(_precompute) {
  if (this.inf)
    return this;

  var res = this.curve.point(this.x, this.y.redNeg());
  if (_precompute && this.precomputed) {
    var pre = this.precomputed;
    var negate = function(p) {
      return p.neg();
    };
    res.precomputed = {
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(negate)
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(negate)
      }
    };
  }
  return res;
};

Point.prototype.toJ = function toJ() {
  if (this.inf)
    return this.curve.jpoint(null, null, null);

  var res = this.curve.jpoint(this.x, this.y, this.curve.one);
  return res;
};

function JPoint(curve, x, y, z) {
  Base.BasePoint.call(this, curve, 'jacobian');
  if (x === null && y === null && z === null) {
    this.x = this.curve.one;
    this.y = this.curve.one;
    this.z = new BN(0);
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    this.z = new BN(z, 16);
  }
  if (!this.x.red)
    this.x = this.x.toRed(this.curve.red);
  if (!this.y.red)
    this.y = this.y.toRed(this.curve.red);
  if (!this.z.red)
    this.z = this.z.toRed(this.curve.red);

  this.zOne = this.z === this.curve.one;
}
inherits(JPoint, Base.BasePoint);

ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
  return new JPoint(this, x, y, z);
};

JPoint.prototype.toP = function toP() {
  if (this.isInfinity())
    return this.curve.point(null, null);

  var zinv = this.z.redInvm();
  var zinv2 = zinv.redSqr();
  var ax = this.x.redMul(zinv2);
  var ay = this.y.redMul(zinv2).redMul(zinv);

  return this.curve.point(ax, ay);
};

JPoint.prototype.neg = function neg() {
  return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
};

JPoint.prototype.add = function add(p) {
  // O + P = P
  if (this.isInfinity())
    return p;

  // P + O = P
  if (p.isInfinity())
    return this;

  // 12M + 4S + 7A
  var pz2 = p.z.redSqr();
  var z2 = this.z.redSqr();
  var u1 = this.x.redMul(pz2);
  var u2 = p.x.redMul(z2);
  var s1 = this.y.redMul(pz2.redMul(p.z));
  var s2 = p.y.redMul(z2.redMul(this.z));

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(p.z).redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mixedAdd = function mixedAdd(p) {
  // O + P = P
  if (this.isInfinity())
    return p.toJ();

  // P + O = P
  if (p.isInfinity())
    return this;

  // 8M + 3S + 7A
  var z2 = this.z.redSqr();
  var u1 = this.x;
  var u2 = p.x.redMul(z2);
  var s1 = this.y;
  var s2 = p.y.redMul(z2).redMul(this.z);

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.dblp = function dblp(pow) {
  if (pow === 0)
    return this;
  if (this.isInfinity())
    return this;
  if (!pow)
    return this.dbl();

  if (this.curve.zeroA || this.curve.threeA) {
    var r = this;
    for (var i = 0; i < pow; i++)
      r = r.dbl();
    return r;
  }

  // 1M + 2S + 1A + N * (4S + 5M + 8A)
  // N = 1 => 6M + 6S + 9A
  var a = this.curve.a;
  var tinv = this.curve.tinv;

  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  // Reuse results
  var jyd = jy.redAdd(jy);
  for (var i = 0; i < pow; i++) {
    var jx2 = jx.redSqr();
    var jyd2 = jyd.redSqr();
    var jyd4 = jyd2.redSqr();
    var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

    var t1 = jx.redMul(jyd2);
    var nx = c.redSqr().redISub(t1.redAdd(t1));
    var t2 = t1.redISub(nx);
    var dny = c.redMul(t2);
    dny = dny.redIAdd(dny).redISub(jyd4);
    var nz = jyd.redMul(jz);
    if (i + 1 < pow)
      jz4 = jz4.redMul(jyd4);

    jx = nx;
    jz = nz;
    jyd = dny;
  }

  return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
};

JPoint.prototype.dbl = function dbl() {
  if (this.isInfinity())
    return this;

  if (this.curve.zeroA)
    return this._zeroDbl();
  else if (this.curve.threeA)
    return this._threeDbl();
  else
    return this._dbl();
};

JPoint.prototype._zeroDbl = function _zeroDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 14A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a; a = 0
    var m = xx.redAdd(xx).redIAdd(xx);
    // T = M ^ 2 - 2*S
    var t = m.redSqr().redISub(s).redISub(s);

    // 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);

    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2*Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-dbl-2009-l
    // 2M + 5S + 13A

    // A = X1^2
    var a = this.x.redSqr();
    // B = Y1^2
    var b = this.y.redSqr();
    // C = B^2
    var c = b.redSqr();
    // D = 2 * ((X1 + B)^2 - A - C)
    var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
    d = d.redIAdd(d);
    // E = 3 * A
    var e = a.redAdd(a).redIAdd(a);
    // F = E^2
    var f = e.redSqr();

    // 8 * C
    var c8 = c.redIAdd(c);
    c8 = c8.redIAdd(c8);
    c8 = c8.redIAdd(c8);

    // X3 = F - 2 * D
    nx = f.redISub(d).redISub(d);
    // Y3 = E * (D - X3) - 8 * C
    ny = e.redMul(d.redISub(nx)).redISub(c8);
    // Z3 = 2 * Y1 * Z1
    nz = this.y.redMul(this.z);
    nz = nz.redIAdd(nz);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._threeDbl = function _threeDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 15A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a
    var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
    // T = M^2 - 2 * S
    var t = m.redSqr().redISub(s).redISub(s);
    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2 * Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
    // 3M + 5S

    // delta = Z1^2
    var delta = this.z.redSqr();
    // gamma = Y1^2
    var gamma = this.y.redSqr();
    // beta = X1 * gamma
    var beta = this.x.redMul(gamma);
    // alpha = 3 * (X1 - delta) * (X1 + delta)
    var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
    alpha = alpha.redAdd(alpha).redIAdd(alpha);
    // X3 = alpha^2 - 8 * beta
    var beta4 = beta.redIAdd(beta);
    beta4 = beta4.redIAdd(beta4);
    var beta8 = beta4.redAdd(beta4);
    nx = alpha.redSqr().redISub(beta8);
    // Z3 = (Y1 + Z1)^2 - gamma - delta
    nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
    // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2
    var ggamma8 = gamma.redSqr();
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._dbl = function _dbl() {
  var a = this.curve.a;

  // 4M + 6S + 10A
  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  var jx2 = jx.redSqr();
  var jy2 = jy.redSqr();

  var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

  var jxd4 = jx.redAdd(jx);
  jxd4 = jxd4.redIAdd(jxd4);
  var t1 = jxd4.redMul(jy2);
  var nx = c.redSqr().redISub(t1.redAdd(t1));
  var t2 = t1.redISub(nx);

  var jyd8 = jy2.redSqr();
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  var ny = c.redMul(t2).redISub(jyd8);
  var nz = jy.redAdd(jy).redMul(jz);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.trpl = function trpl() {
  if (!this.curve.zeroA)
    return this.dbl().add(this);

  // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
  // 5M + 10S + ...

  // XX = X1^2
  var xx = this.x.redSqr();
  // YY = Y1^2
  var yy = this.y.redSqr();
  // ZZ = Z1^2
  var zz = this.z.redSqr();
  // YYYY = YY^2
  var yyyy = yy.redSqr();
  // M = 3 * XX + a * ZZ2; a = 0
  var m = xx.redAdd(xx).redIAdd(xx);
  // MM = M^2
  var mm = m.redSqr();
  // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM
  var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
  e = e.redIAdd(e);
  e = e.redAdd(e).redIAdd(e);
  e = e.redISub(mm);
  // EE = E^2
  var ee = e.redSqr();
  // T = 16*YYYY
  var t = yyyy.redIAdd(yyyy);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  // U = (M + E)^2 - MM - EE - T
  var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
  // X3 = 4 * (X1 * EE - 4 * YY * U)
  var yyu4 = yy.redMul(u);
  yyu4 = yyu4.redIAdd(yyu4);
  yyu4 = yyu4.redIAdd(yyu4);
  var nx = this.x.redMul(ee).redISub(yyu4);
  nx = nx.redIAdd(nx);
  nx = nx.redIAdd(nx);
  // Y3 = 8 * Y1 * (U * (T - U) - E * EE)
  var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  // Z3 = (Z1 + E)^2 - ZZ - EE
  var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mul = function mul(k, kbase) {
  k = new BN(k, kbase);

  return this.curve._wnafMul(this, k);
};

JPoint.prototype.eq = function eq(p) {
  if (p.type === 'affine')
    return this.eq(p.toJ());

  if (this === p)
    return true;

  // x1 * z2^2 == x2 * z1^2
  var z2 = this.z.redSqr();
  var pz2 = p.z.redSqr();
  if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0)
    return false;

  // y1 * z2^3 == y2 * z1^3
  var z3 = z2.redMul(this.z);
  var pz3 = pz2.redMul(p.z);
  return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
};

JPoint.prototype.eqXToP = function eqXToP(x) {
  var zs = this.z.redSqr();
  var rx = x.toRed(this.curve.red).redMul(zs);
  if (this.x.cmp(rx) === 0)
    return true;

  var xc = x.clone();
  var t = this.curve.redN.redMul(zs);
  for (;;) {
    xc.iadd(this.curve.n);
    if (xc.cmp(this.curve.p) >= 0)
      return false;

    rx.redIAdd(t);
    if (this.x.cmp(rx) === 0)
      return true;
  }
};

JPoint.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC JPoint Infinity>';
  return '<EC JPoint x: ' + this.x.toString(16, 2) +
      ' y: ' + this.y.toString(16, 2) +
      ' z: ' + this.z.toString(16, 2) + '>';
};

JPoint.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.z.cmpn(0) === 0;
};

},{"../../elliptic":4,"../curve":7,"bn.js":1,"inherits":33}],10:[function(require,module,exports){
'use strict';

var curves = exports;

var hash = require('hash.js');
var elliptic = require('../elliptic');

var assert = elliptic.utils.assert;

function PresetCurve(options) {
  if (options.type === 'short')
    this.curve = new elliptic.curve.short(options);
  else if (options.type === 'edwards')
    this.curve = new elliptic.curve.edwards(options);
  else
    this.curve = new elliptic.curve.mont(options);
  this.g = this.curve.g;
  this.n = this.curve.n;
  this.hash = options.hash;

  assert(this.g.validate(), 'Invalid curve');
  assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
}
curves.PresetCurve = PresetCurve;

function defineCurve(name, options) {
  Object.defineProperty(curves, name, {
    configurable: true,
    enumerable: true,
    get: function() {
      var curve = new PresetCurve(options);
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        value: curve
      });
      return curve;
    }
  });
}

defineCurve('p192', {
  type: 'short',
  prime: 'p192',
  p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
  b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
  n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
  hash: hash.sha256,
  gRed: false,
  g: [
    '188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012',
    '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811'
  ]
});

defineCurve('p224', {
  type: 'short',
  prime: 'p224',
  p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
  b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
  n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
  hash: hash.sha256,
  gRed: false,
  g: [
    'b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21',
    'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34'
  ]
});

defineCurve('p256', {
  type: 'short',
  prime: null,
  p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
  a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
  b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
  n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
  hash: hash.sha256,
  gRed: false,
  g: [
    '6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296',
    '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5'
  ]
});

defineCurve('p384', {
  type: 'short',
  prime: null,
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 ffffffff',
  a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 fffffffc',
  b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' +
     '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
  n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' +
     'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
  hash: hash.sha384,
  gRed: false,
  g: [
    'aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' +
    '5502f25d bf55296c 3a545e38 72760ab7',
    '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' +
    '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f'
  ]
});

defineCurve('p521', {
  type: 'short',
  prime: null,
  p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff',
  a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff fffffffc',
  b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' +
     '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' +
     '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
  n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' +
     'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
  hash: hash.sha512,
  gRed: false,
  g: [
    '000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' +
    '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' +
    'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66',
    '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' +
    '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' +
    '3fad0761 353c7086 a272c240 88be9476 9fd16650'
  ]
});

defineCurve('curve25519', {
  type: 'mont',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '76d06',
  b: '1',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '9'
  ]
});

defineCurve('ed25519', {
  type: 'edwards',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '-1',
  c: '1',
  // -121665 * (121666^(-1)) (mod P)
  d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a',

    // 4/5
    '6666666666666666666666666666666666666666666666666666666666666658'
  ]
});

var pre;
try {
  pre = require('./precomputed/secp256k1');
} catch (e) {
  pre = undefined;
}

defineCurve('secp256k1', {
  type: 'short',
  prime: 'k256',
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
  a: '0',
  b: '7',
  n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
  h: '1',
  hash: hash.sha256,

  // Precomputed endomorphism
  beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
  lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
  basis: [
    {
      a: '3086d221a7d46bcde86c90e49284eb15',
      b: '-e4437ed6010e88286f547fa90abfe4c3'
    },
    {
      a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
      b: '3086d221a7d46bcde86c90e49284eb15'
    }
  ],

  gRed: false,
  g: [
    '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    pre
  ]
});

},{"../elliptic":4,"./precomputed/secp256k1":17,"hash.js":20}],11:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var HmacDRBG = require('hmac-drbg');
var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;

var KeyPair = require('./key');
var Signature = require('./signature');

function EC(options) {
  if (!(this instanceof EC))
    return new EC(options);

  // Shortcut `elliptic.ec(curve-name)`
  if (typeof options === 'string') {
    assert(elliptic.curves.hasOwnProperty(options), 'Unknown curve ' + options);

    options = elliptic.curves[options];
  }

  // Shortcut for `elliptic.ec(elliptic.curves.curveName)`
  if (options instanceof elliptic.curves.PresetCurve)
    options = { curve: options };

  this.curve = options.curve.curve;
  this.n = this.curve.n;
  this.nh = this.n.ushrn(1);
  this.g = this.curve.g;

  // Point on curve
  this.g = options.curve.g;
  this.g.precompute(options.curve.n.bitLength() + 1);

  // Hash for function for DRBG
  this.hash = options.hash || options.curve.hash;
}
module.exports = EC;

EC.prototype.keyPair = function keyPair(options) {
  return new KeyPair(this, options);
};

EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
  return KeyPair.fromPrivate(this, priv, enc);
};

EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
  return KeyPair.fromPublic(this, pub, enc);
};

EC.prototype.genKeyPair = function genKeyPair(options) {
  if (!options)
    options = {};

  // Instantiate Hmac_DRBG
  var drbg = new HmacDRBG({
    hash: this.hash,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8',
    entropy: options.entropy || elliptic.rand(this.hash.hmacStrength),
    entropyEnc: options.entropy && options.entropyEnc || 'utf8',
    nonce: this.n.toArray()
  });

  var bytes = this.n.byteLength();
  var ns2 = this.n.sub(new BN(2));
  do {
    var priv = new BN(drbg.generate(bytes));
    if (priv.cmp(ns2) > 0)
      continue;

    priv.iaddn(1);
    return this.keyFromPrivate(priv);
  } while (true);
};

EC.prototype._truncateToN = function truncateToN(msg, truncOnly) {
  var delta = msg.byteLength() * 8 - this.n.bitLength();
  if (delta > 0)
    msg = msg.ushrn(delta);
  if (!truncOnly && msg.cmp(this.n) >= 0)
    return msg.sub(this.n);
  else
    return msg;
};

EC.prototype.sign = function sign(msg, key, enc, options) {
  if (typeof enc === 'object') {
    options = enc;
    enc = null;
  }
  if (!options)
    options = {};

  key = this.keyFromPrivate(key, enc);
  msg = this._truncateToN(new BN(msg, 16));

  // Zero-extend key to provide enough entropy
  var bytes = this.n.byteLength();
  var bkey = key.getPrivate().toArray('be', bytes);

  // Zero-extend nonce to have the same byte size as N
  var nonce = msg.toArray('be', bytes);

  // Instantiate Hmac_DRBG
  var drbg = new HmacDRBG({
    hash: this.hash,
    entropy: bkey,
    nonce: nonce,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8'
  });

  // Number of bytes to generate
  var ns1 = this.n.sub(new BN(1));

  for (var iter = 0; true; iter++) {
    var k = options.k ?
        options.k(iter) :
        new BN(drbg.generate(this.n.byteLength()));
    k = this._truncateToN(k, true);
    if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0)
      continue;

    var kp = this.g.mul(k);
    if (kp.isInfinity())
      continue;

    var kpX = kp.getX();
    var r = kpX.umod(this.n);
    if (r.cmpn(0) === 0)
      continue;

    var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
    s = s.umod(this.n);
    if (s.cmpn(0) === 0)
      continue;

    var recoveryParam = (kp.getY().isOdd() ? 1 : 0) |
                        (kpX.cmp(r) !== 0 ? 2 : 0);

    // Use complement of `s`, if it is > `n / 2`
    if (options.canonical && s.cmp(this.nh) > 0) {
      s = this.n.sub(s);
      recoveryParam ^= 1;
    }

    return new Signature({ r: r, s: s, recoveryParam: recoveryParam });
  }
};

EC.prototype.verify = function verify(msg, signature, key, enc) {
  msg = this._truncateToN(new BN(msg, 16));
  key = this.keyFromPublic(key, enc);
  signature = new Signature(signature, 'hex');

  // Perform primitive values validation
  var r = signature.r;
  var s = signature.s;
  if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0)
    return false;
  if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0)
    return false;

  // Validate signature
  var sinv = s.invm(this.n);
  var u1 = sinv.mul(msg).umod(this.n);
  var u2 = sinv.mul(r).umod(this.n);

  if (!this.curve._maxwellTrick) {
    var p = this.g.mulAdd(u1, key.getPublic(), u2);
    if (p.isInfinity())
      return false;

    return p.getX().umod(this.n).cmp(r) === 0;
  }

  // NOTE: Greg Maxwell's trick, inspired by:
  // https://git.io/vad3K

  var p = this.g.jmulAdd(u1, key.getPublic(), u2);
  if (p.isInfinity())
    return false;

  // Compare `p.x` of Jacobian point with `r`,
  // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
  // inverse of `p.z^2`
  return p.eqXToP(r);
};

EC.prototype.recoverPubKey = function(msg, signature, j, enc) {
  assert((3 & j) === j, 'The recovery param is more than two bits');
  signature = new Signature(signature, enc);

  var n = this.n;
  var e = new BN(msg);
  var r = signature.r;
  var s = signature.s;

  // A set LSB signifies that the y-coordinate is odd
  var isYOdd = j & 1;
  var isSecondKey = j >> 1;
  if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey)
    throw new Error('Unable to find sencond key candinate');

  // 1.1. Let x = r + jn.
  if (isSecondKey)
    r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);
  else
    r = this.curve.pointFromX(r, isYOdd);

  var rInv = signature.r.invm(n);
  var s1 = n.sub(e).mul(rInv).umod(n);
  var s2 = s.mul(rInv).umod(n);

  // 1.6.1 Compute Q = r^-1 (sR -  eG)
  //               Q = r^-1 (sR + -eG)
  return this.g.mulAdd(s1, r, s2);
};

EC.prototype.getKeyRecoveryParam = function(e, signature, Q, enc) {
  signature = new Signature(signature, enc);
  if (signature.recoveryParam !== null)
    return signature.recoveryParam;

  for (var i = 0; i < 4; i++) {
    var Qprime;
    try {
      Qprime = this.recoverPubKey(e, signature, i);
    } catch (e) {
      continue;
    }

    if (Qprime.eq(Q))
      return i;
  }
  throw new Error('Unable to find valid recovery factor');
};

},{"../../elliptic":4,"./key":12,"./signature":13,"bn.js":1,"hmac-drbg":32}],12:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;

function KeyPair(ec, options) {
  this.ec = ec;
  this.priv = null;
  this.pub = null;

  // KeyPair(ec, { priv: ..., pub: ... })
  if (options.priv)
    this._importPrivate(options.priv, options.privEnc);
  if (options.pub)
    this._importPublic(options.pub, options.pubEnc);
}
module.exports = KeyPair;

KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
  if (pub instanceof KeyPair)
    return pub;

  return new KeyPair(ec, {
    pub: pub,
    pubEnc: enc
  });
};

KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
  if (priv instanceof KeyPair)
    return priv;

  return new KeyPair(ec, {
    priv: priv,
    privEnc: enc
  });
};

KeyPair.prototype.validate = function validate() {
  var pub = this.getPublic();

  if (pub.isInfinity())
    return { result: false, reason: 'Invalid public key' };
  if (!pub.validate())
    return { result: false, reason: 'Public key is not a point' };
  if (!pub.mul(this.ec.curve.n).isInfinity())
    return { result: false, reason: 'Public key * N != O' };

  return { result: true, reason: null };
};

KeyPair.prototype.getPublic = function getPublic(compact, enc) {
  // compact is optional argument
  if (typeof compact === 'string') {
    enc = compact;
    compact = null;
  }

  if (!this.pub)
    this.pub = this.ec.g.mul(this.priv);

  if (!enc)
    return this.pub;

  return this.pub.encode(enc, compact);
};

KeyPair.prototype.getPrivate = function getPrivate(enc) {
  if (enc === 'hex')
    return this.priv.toString(16, 2);
  else
    return this.priv;
};

KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
  this.priv = new BN(key, enc || 16);

  // Ensure that the priv won't be bigger than n, otherwise we may fail
  // in fixed multiplication method
  this.priv = this.priv.umod(this.ec.curve.n);
};

KeyPair.prototype._importPublic = function _importPublic(key, enc) {
  if (key.x || key.y) {
    // Montgomery points only have an `x` coordinate.
    // Weierstrass/Edwards points on the other hand have both `x` and
    // `y` coordinates.
    if (this.ec.curve.type === 'mont') {
      assert(key.x, 'Need x coordinate');
    } else if (this.ec.curve.type === 'short' ||
               this.ec.curve.type === 'edwards') {
      assert(key.x && key.y, 'Need both x and y coordinate');
    }
    this.pub = this.ec.curve.point(key.x, key.y);
    return;
  }
  this.pub = this.ec.curve.decodePoint(key, enc);
};

// ECDH
KeyPair.prototype.derive = function derive(pub) {
  return pub.mul(this.priv).getX();
};

// ECDSA
KeyPair.prototype.sign = function sign(msg, enc, options) {
  return this.ec.sign(msg, this, enc, options);
};

KeyPair.prototype.verify = function verify(msg, signature) {
  return this.ec.verify(msg, signature, this);
};

KeyPair.prototype.inspect = function inspect() {
  return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) +
         ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
};

},{"../../elliptic":4,"bn.js":1}],13:[function(require,module,exports){
'use strict';

var BN = require('bn.js');

var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;

function Signature(options, enc) {
  if (options instanceof Signature)
    return options;

  if (this._importDER(options, enc))
    return;

  assert(options.r && options.s, 'Signature without r or s');
  this.r = new BN(options.r, 16);
  this.s = new BN(options.s, 16);
  if (options.recoveryParam === undefined)
    this.recoveryParam = null;
  else
    this.recoveryParam = options.recoveryParam;
}
module.exports = Signature;

function Position() {
  this.place = 0;
}

function getLength(buf, p) {
  var initial = buf[p.place++];
  if (!(initial & 0x80)) {
    return initial;
  }
  var octetLen = initial & 0xf;
  var val = 0;
  for (var i = 0, off = p.place; i < octetLen; i++, off++) {
    val <<= 8;
    val |= buf[off];
  }
  p.place = off;
  return val;
}

function rmPadding(buf) {
  var i = 0;
  var len = buf.length - 1;
  while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
    i++;
  }
  if (i === 0) {
    return buf;
  }
  return buf.slice(i);
}

Signature.prototype._importDER = function _importDER(data, enc) {
  data = utils.toArray(data, enc);
  var p = new Position();
  if (data[p.place++] !== 0x30) {
    return false;
  }
  var len = getLength(data, p);
  if ((len + p.place) !== data.length) {
    return false;
  }
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var rlen = getLength(data, p);
  var r = data.slice(p.place, rlen + p.place);
  p.place += rlen;
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var slen = getLength(data, p);
  if (data.length !== slen + p.place) {
    return false;
  }
  var s = data.slice(p.place, slen + p.place);
  if (r[0] === 0 && (r[1] & 0x80)) {
    r = r.slice(1);
  }
  if (s[0] === 0 && (s[1] & 0x80)) {
    s = s.slice(1);
  }

  this.r = new BN(r);
  this.s = new BN(s);
  this.recoveryParam = null;

  return true;
};

function constructLength(arr, len) {
  if (len < 0x80) {
    arr.push(len);
    return;
  }
  var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
  arr.push(octets | 0x80);
  while (--octets) {
    arr.push((len >>> (octets << 3)) & 0xff);
  }
  arr.push(len);
}

Signature.prototype.toDER = function toDER(enc) {
  var r = this.r.toArray();
  var s = this.s.toArray();

  // Pad values
  if (r[0] & 0x80)
    r = [ 0 ].concat(r);
  // Pad values
  if (s[0] & 0x80)
    s = [ 0 ].concat(s);

  r = rmPadding(r);
  s = rmPadding(s);

  while (!s[0] && !(s[1] & 0x80)) {
    s = s.slice(1);
  }
  var arr = [ 0x02 ];
  constructLength(arr, r.length);
  arr = arr.concat(r);
  arr.push(0x02);
  constructLength(arr, s.length);
  var backHalf = arr.concat(s);
  var res = [ 0x30 ];
  constructLength(res, backHalf.length);
  res = res.concat(backHalf);
  return utils.encode(res, enc);
};

},{"../../elliptic":4,"bn.js":1}],14:[function(require,module,exports){
'use strict';

var hash = require('hash.js');
var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;
var parseBytes = utils.parseBytes;
var KeyPair = require('./key');
var Signature = require('./signature');

function EDDSA(curve) {
  assert(curve === 'ed25519', 'only tested with ed25519 so far');

  if (!(this instanceof EDDSA))
    return new EDDSA(curve);

  var curve = elliptic.curves[curve].curve;
  this.curve = curve;
  this.g = curve.g;
  this.g.precompute(curve.n.bitLength() + 1);

  this.pointClass = curve.point().constructor;
  this.encodingLength = Math.ceil(curve.n.bitLength() / 8);
  this.hash = hash.sha512;
}

module.exports = EDDSA;

/**
* @param {Array|String} message - message bytes
* @param {Array|String|KeyPair} secret - secret bytes or a keypair
* @returns {Signature} - signature
*/
EDDSA.prototype.sign = function sign(message, secret) {
  message = parseBytes(message);
  var key = this.keyFromSecret(secret);
  var r = this.hashInt(key.messagePrefix(), message);
  var R = this.g.mul(r);
  var Rencoded = this.encodePoint(R);
  var s_ = this.hashInt(Rencoded, key.pubBytes(), message)
               .mul(key.priv());
  var S = r.add(s_).umod(this.curve.n);
  return this.makeSignature({ R: R, S: S, Rencoded: Rencoded });
};

/**
* @param {Array} message - message bytes
* @param {Array|String|Signature} sig - sig bytes
* @param {Array|String|Point|KeyPair} pub - public key
* @returns {Boolean} - true if public key matches sig of message
*/
EDDSA.prototype.verify = function verify(message, sig, pub) {
  message = parseBytes(message);
  sig = this.makeSignature(sig);
  var key = this.keyFromPublic(pub);
  var h = this.hashInt(sig.Rencoded(), key.pubBytes(), message);
  var SG = this.g.mul(sig.S());
  var RplusAh = sig.R().add(key.pub().mul(h));
  return RplusAh.eq(SG);
};

EDDSA.prototype.hashInt = function hashInt() {
  var hash = this.hash();
  for (var i = 0; i < arguments.length; i++)
    hash.update(arguments[i]);
  return utils.intFromLE(hash.digest()).umod(this.curve.n);
};

EDDSA.prototype.keyFromPublic = function keyFromPublic(pub) {
  return KeyPair.fromPublic(this, pub);
};

EDDSA.prototype.keyFromSecret = function keyFromSecret(secret) {
  return KeyPair.fromSecret(this, secret);
};

EDDSA.prototype.makeSignature = function makeSignature(sig) {
  if (sig instanceof Signature)
    return sig;
  return new Signature(this, sig);
};

/**
* * https://tools.ietf.org/html/draft-josefsson-eddsa-ed25519-03#section-5.2
*
* EDDSA defines methods for encoding and decoding points and integers. These are
* helper convenience methods, that pass along to utility functions implied
* parameters.
*
*/
EDDSA.prototype.encodePoint = function encodePoint(point) {
  var enc = point.getY().toArray('le', this.encodingLength);
  enc[this.encodingLength - 1] |= point.getX().isOdd() ? 0x80 : 0;
  return enc;
};

EDDSA.prototype.decodePoint = function decodePoint(bytes) {
  bytes = utils.parseBytes(bytes);

  var lastIx = bytes.length - 1;
  var normed = bytes.slice(0, lastIx).concat(bytes[lastIx] & ~0x80);
  var xIsOdd = (bytes[lastIx] & 0x80) !== 0;

  var y = utils.intFromLE(normed);
  return this.curve.pointFromY(y, xIsOdd);
};

EDDSA.prototype.encodeInt = function encodeInt(num) {
  return num.toArray('le', this.encodingLength);
};

EDDSA.prototype.decodeInt = function decodeInt(bytes) {
  return utils.intFromLE(bytes);
};

EDDSA.prototype.isPoint = function isPoint(val) {
  return val instanceof this.pointClass;
};

},{"../../elliptic":4,"./key":15,"./signature":16,"hash.js":20}],15:[function(require,module,exports){
'use strict';

var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;
var parseBytes = utils.parseBytes;
var cachedProperty = utils.cachedProperty;

/**
* @param {EDDSA} eddsa - instance
* @param {Object} params - public/private key parameters
*
* @param {Array<Byte>} [params.secret] - secret seed bytes
* @param {Point} [params.pub] - public key point (aka `A` in eddsa terms)
* @param {Array<Byte>} [params.pub] - public key point encoded as bytes
*
*/
function KeyPair(eddsa, params) {
  this.eddsa = eddsa;
  this._secret = parseBytes(params.secret);
  if (eddsa.isPoint(params.pub))
    this._pub = params.pub;
  else
    this._pubBytes = parseBytes(params.pub);
}

KeyPair.fromPublic = function fromPublic(eddsa, pub) {
  if (pub instanceof KeyPair)
    return pub;
  return new KeyPair(eddsa, { pub: pub });
};

KeyPair.fromSecret = function fromSecret(eddsa, secret) {
  if (secret instanceof KeyPair)
    return secret;
  return new KeyPair(eddsa, { secret: secret });
};

KeyPair.prototype.secret = function secret() {
  return this._secret;
};

cachedProperty(KeyPair, 'pubBytes', function pubBytes() {
  return this.eddsa.encodePoint(this.pub());
});

cachedProperty(KeyPair, 'pub', function pub() {
  if (this._pubBytes)
    return this.eddsa.decodePoint(this._pubBytes);
  return this.eddsa.g.mul(this.priv());
});

cachedProperty(KeyPair, 'privBytes', function privBytes() {
  var eddsa = this.eddsa;
  var hash = this.hash();
  var lastIx = eddsa.encodingLength - 1;

  var a = hash.slice(0, eddsa.encodingLength);
  a[0] &= 248;
  a[lastIx] &= 127;
  a[lastIx] |= 64;

  return a;
});

cachedProperty(KeyPair, 'priv', function priv() {
  return this.eddsa.decodeInt(this.privBytes());
});

cachedProperty(KeyPair, 'hash', function hash() {
  return this.eddsa.hash().update(this.secret()).digest();
});

cachedProperty(KeyPair, 'messagePrefix', function messagePrefix() {
  return this.hash().slice(this.eddsa.encodingLength);
});

KeyPair.prototype.sign = function sign(message) {
  assert(this._secret, 'KeyPair can only verify');
  return this.eddsa.sign(message, this);
};

KeyPair.prototype.verify = function verify(message, sig) {
  return this.eddsa.verify(message, sig, this);
};

KeyPair.prototype.getSecret = function getSecret(enc) {
  assert(this._secret, 'KeyPair is public only');
  return utils.encode(this.secret(), enc);
};

KeyPair.prototype.getPublic = function getPublic(enc) {
  return utils.encode(this.pubBytes(), enc);
};

module.exports = KeyPair;

},{"../../elliptic":4}],16:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var elliptic = require('../../elliptic');
var utils = elliptic.utils;
var assert = utils.assert;
var cachedProperty = utils.cachedProperty;
var parseBytes = utils.parseBytes;

/**
* @param {EDDSA} eddsa - eddsa instance
* @param {Array<Bytes>|Object} sig -
* @param {Array<Bytes>|Point} [sig.R] - R point as Point or bytes
* @param {Array<Bytes>|bn} [sig.S] - S scalar as bn or bytes
* @param {Array<Bytes>} [sig.Rencoded] - R point encoded
* @param {Array<Bytes>} [sig.Sencoded] - S scalar encoded
*/
function Signature(eddsa, sig) {
  this.eddsa = eddsa;

  if (typeof sig !== 'object')
    sig = parseBytes(sig);

  if (Array.isArray(sig)) {
    sig = {
      R: sig.slice(0, eddsa.encodingLength),
      S: sig.slice(eddsa.encodingLength)
    };
  }

  assert(sig.R && sig.S, 'Signature without R or S');

  if (eddsa.isPoint(sig.R))
    this._R = sig.R;
  if (sig.S instanceof BN)
    this._S = sig.S;

  this._Rencoded = Array.isArray(sig.R) ? sig.R : sig.Rencoded;
  this._Sencoded = Array.isArray(sig.S) ? sig.S : sig.Sencoded;
}

cachedProperty(Signature, 'S', function S() {
  return this.eddsa.decodeInt(this.Sencoded());
});

cachedProperty(Signature, 'R', function R() {
  return this.eddsa.decodePoint(this.Rencoded());
});

cachedProperty(Signature, 'Rencoded', function Rencoded() {
  return this.eddsa.encodePoint(this.R());
});

cachedProperty(Signature, 'Sencoded', function Sencoded() {
  return this.eddsa.encodeInt(this.S());
});

Signature.prototype.toBytes = function toBytes() {
  return this.Rencoded().concat(this.Sencoded());
};

Signature.prototype.toHex = function toHex() {
  return utils.encode(this.toBytes(), 'hex').toUpperCase();
};

module.exports = Signature;

},{"../../elliptic":4,"bn.js":1}],17:[function(require,module,exports){
module.exports = {
  doubles: {
    step: 4,
    points: [
      [
        'e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a',
        'f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821'
      ],
      [
        '8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508',
        '11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf'
      ],
      [
        '175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739',
        'd3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695'
      ],
      [
        '363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640',
        '4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9'
      ],
      [
        '8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c',
        '4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36'
      ],
      [
        '723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda',
        '96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f'
      ],
      [
        'eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa',
        '5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999'
      ],
      [
        '100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0',
        'cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09'
      ],
      [
        'e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d',
        '9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d'
      ],
      [
        'feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d',
        'e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088'
      ],
      [
        'da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1',
        '9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d'
      ],
      [
        '53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0',
        '5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8'
      ],
      [
        '8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047',
        '10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a'
      ],
      [
        '385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862',
        '283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453'
      ],
      [
        '6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7',
        '7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160'
      ],
      [
        '3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd',
        '56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0'
      ],
      [
        '85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83',
        '7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6'
      ],
      [
        '948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a',
        '53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589'
      ],
      [
        '6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8',
        'bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17'
      ],
      [
        'e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d',
        '4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda'
      ],
      [
        'e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725',
        '7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd'
      ],
      [
        '213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754',
        '4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2'
      ],
      [
        '4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c',
        '17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6'
      ],
      [
        'fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6',
        '6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f'
      ],
      [
        '76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39',
        'c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01'
      ],
      [
        'c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891',
        '893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3'
      ],
      [
        'd895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b',
        'febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f'
      ],
      [
        'b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03',
        '2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7'
      ],
      [
        'e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d',
        'eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78'
      ],
      [
        'a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070',
        '7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1'
      ],
      [
        '90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4',
        'e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150'
      ],
      [
        '8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da',
        '662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82'
      ],
      [
        'e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11',
        '1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc'
      ],
      [
        '8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e',
        'efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b'
      ],
      [
        'e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41',
        '2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51'
      ],
      [
        'b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef',
        '67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45'
      ],
      [
        'd68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8',
        'db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120'
      ],
      [
        '324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d',
        '648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84'
      ],
      [
        '4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96',
        '35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d'
      ],
      [
        '9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd',
        'ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d'
      ],
      [
        '6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5',
        '9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8'
      ],
      [
        'a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266',
        '40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8'
      ],
      [
        '7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71',
        '34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac'
      ],
      [
        '928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac',
        'c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f'
      ],
      [
        '85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751',
        '1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962'
      ],
      [
        'ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e',
        '493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907'
      ],
      [
        '827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241',
        'c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec'
      ],
      [
        'eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3',
        'be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d'
      ],
      [
        'e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f',
        '4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414'
      ],
      [
        '1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19',
        'aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd'
      ],
      [
        '146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be',
        'b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0'
      ],
      [
        'fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9',
        '6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811'
      ],
      [
        'da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2',
        '8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1'
      ],
      [
        'a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13',
        '7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c'
      ],
      [
        '174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c',
        'ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73'
      ],
      [
        '959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba',
        '2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd'
      ],
      [
        'd2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151',
        'e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405'
      ],
      [
        '64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073',
        'd99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589'
      ],
      [
        '8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458',
        '38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e'
      ],
      [
        '13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b',
        '69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27'
      ],
      [
        'bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366',
        'd3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1'
      ],
      [
        '8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa',
        '40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482'
      ],
      [
        '8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0',
        '620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945'
      ],
      [
        'dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787',
        '7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573'
      ],
      [
        'f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e',
        'ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82'
      ]
    ]
  },
  naf: {
    wnd: 7,
    points: [
      [
        'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
        '388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672'
      ],
      [
        '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
        'd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6'
      ],
      [
        '5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc',
        '6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da'
      ],
      [
        'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe',
        'cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37'
      ],
      [
        '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
        'd984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b'
      ],
      [
        'f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8',
        'ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81'
      ],
      [
        'd7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e',
        '581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58'
      ],
      [
        'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
        '4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77'
      ],
      [
        '2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c',
        '85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a'
      ],
      [
        '352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5',
        '321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c'
      ],
      [
        '2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f',
        '2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67'
      ],
      [
        '9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714',
        '73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402'
      ],
      [
        'daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729',
        'a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55'
      ],
      [
        'c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db',
        '2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482'
      ],
      [
        '6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4',
        'e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82'
      ],
      [
        '1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5',
        'b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396'
      ],
      [
        '605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479',
        '2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49'
      ],
      [
        '62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d',
        '80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf'
      ],
      [
        '80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f',
        '1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a'
      ],
      [
        '7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb',
        'd0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7'
      ],
      [
        'd528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9',
        'eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933'
      ],
      [
        '49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963',
        '758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a'
      ],
      [
        '77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74',
        '958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6'
      ],
      [
        'f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530',
        'e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37'
      ],
      [
        '463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b',
        '5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e'
      ],
      [
        'f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247',
        'cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6'
      ],
      [
        'caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1',
        'cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476'
      ],
      [
        '2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120',
        '4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40'
      ],
      [
        '7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435',
        '91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61'
      ],
      [
        '754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18',
        '673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683'
      ],
      [
        'e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8',
        '59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5'
      ],
      [
        '186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb',
        '3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b'
      ],
      [
        'df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f',
        '55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417'
      ],
      [
        '5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143',
        'efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868'
      ],
      [
        '290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba',
        'e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a'
      ],
      [
        'af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45',
        'f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6'
      ],
      [
        '766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a',
        '744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996'
      ],
      [
        '59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e',
        'c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e'
      ],
      [
        'f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8',
        'e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d'
      ],
      [
        '7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c',
        '30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2'
      ],
      [
        '948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519',
        'e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e'
      ],
      [
        '7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab',
        '100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437'
      ],
      [
        '3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca',
        'ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311'
      ],
      [
        'd3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf',
        '8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4'
      ],
      [
        '1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610',
        '68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575'
      ],
      [
        '733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4',
        'f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d'
      ],
      [
        '15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c',
        'd56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d'
      ],
      [
        'a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940',
        'edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629'
      ],
      [
        'e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980',
        'a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06'
      ],
      [
        '311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3',
        '66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374'
      ],
      [
        '34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf',
        '9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee'
      ],
      [
        'f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63',
        '4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1'
      ],
      [
        'd7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448',
        'fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b'
      ],
      [
        '32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf',
        '5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661'
      ],
      [
        '7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5',
        '8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6'
      ],
      [
        'ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6',
        '8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e'
      ],
      [
        '16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5',
        '5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d'
      ],
      [
        'eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99',
        'f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc'
      ],
      [
        '78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51',
        'f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4'
      ],
      [
        '494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5',
        '42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c'
      ],
      [
        'a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5',
        '204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b'
      ],
      [
        'c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997',
        '4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913'
      ],
      [
        '841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881',
        '73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154'
      ],
      [
        '5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5',
        '39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865'
      ],
      [
        '36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66',
        'd2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc'
      ],
      [
        '336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726',
        'ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224'
      ],
      [
        '8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede',
        '6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e'
      ],
      [
        '1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94',
        '60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6'
      ],
      [
        '85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31',
        '3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511'
      ],
      [
        '29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51',
        'b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b'
      ],
      [
        'a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252',
        'ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2'
      ],
      [
        '4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5',
        'cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c'
      ],
      [
        'd24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b',
        '6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3'
      ],
      [
        'ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4',
        '322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d'
      ],
      [
        'af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f',
        '6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700'
      ],
      [
        'e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889',
        '2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4'
      ],
      [
        '591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246',
        'b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196'
      ],
      [
        '11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984',
        '998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4'
      ],
      [
        '3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a',
        'b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257'
      ],
      [
        'cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030',
        'bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13'
      ],
      [
        'c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197',
        '6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096'
      ],
      [
        'c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593',
        'c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38'
      ],
      [
        'a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef',
        '21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f'
      ],
      [
        '347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38',
        '60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448'
      ],
      [
        'da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a',
        '49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a'
      ],
      [
        'c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111',
        '5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4'
      ],
      [
        '4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502',
        '7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437'
      ],
      [
        '3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea',
        'be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7'
      ],
      [
        'cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26',
        '8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d'
      ],
      [
        'b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986',
        '39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a'
      ],
      [
        'd4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e',
        '62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54'
      ],
      [
        '48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4',
        '25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77'
      ],
      [
        'dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda',
        'ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517'
      ],
      [
        '6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859',
        'cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10'
      ],
      [
        'e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f',
        'f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125'
      ],
      [
        'eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c',
        '6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e'
      ],
      [
        '13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942',
        'fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1'
      ],
      [
        'ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a',
        '1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2'
      ],
      [
        'b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80',
        '5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423'
      ],
      [
        'ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d',
        '438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8'
      ],
      [
        '8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1',
        'cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758'
      ],
      [
        '52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63',
        'c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375'
      ],
      [
        'e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352',
        '6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d'
      ],
      [
        '7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193',
        'ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec'
      ],
      [
        '5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00',
        '9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0'
      ],
      [
        '32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58',
        'ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c'
      ],
      [
        'e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7',
        'd3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4'
      ],
      [
        '8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8',
        'c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f'
      ],
      [
        '4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e',
        '67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649'
      ],
      [
        '3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d',
        'cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826'
      ],
      [
        '674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b',
        '299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5'
      ],
      [
        'd32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f',
        'f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87'
      ],
      [
        '30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6',
        '462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b'
      ],
      [
        'be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297',
        '62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc'
      ],
      [
        '93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a',
        '7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c'
      ],
      [
        'b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c',
        'ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f'
      ],
      [
        'd5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52',
        '4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a'
      ],
      [
        'd3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb',
        'bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46'
      ],
      [
        '463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065',
        'bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f'
      ],
      [
        '7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917',
        '603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03'
      ],
      [
        '74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9',
        'cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08'
      ],
      [
        '30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3',
        '553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8'
      ],
      [
        '9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57',
        '712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373'
      ],
      [
        '176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66',
        'ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3'
      ],
      [
        '75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8',
        '9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8'
      ],
      [
        '809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721',
        '9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1'
      ],
      [
        '1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180',
        '4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9'
      ]
    ]
  }
};

},{}],18:[function(require,module,exports){
'use strict';

var utils = exports;
var BN = require('bn.js');
var minAssert = require('minimalistic-assert');
var minUtils = require('minimalistic-crypto-utils');

utils.assert = minAssert;
utils.toArray = minUtils.toArray;
utils.zero2 = minUtils.zero2;
utils.toHex = minUtils.toHex;
utils.encode = minUtils.encode;

// Represent num in a w-NAF form
function getNAF(num, w) {
  var naf = [];
  var ws = 1 << (w + 1);
  var k = num.clone();
  while (k.cmpn(1) >= 0) {
    var z;
    if (k.isOdd()) {
      var mod = k.andln(ws - 1);
      if (mod > (ws >> 1) - 1)
        z = (ws >> 1) - mod;
      else
        z = mod;
      k.isubn(z);
    } else {
      z = 0;
    }
    naf.push(z);

    // Optimization, shift by word if possible
    var shift = (k.cmpn(0) !== 0 && k.andln(ws - 1) === 0) ? (w + 1) : 1;
    for (var i = 1; i < shift; i++)
      naf.push(0);
    k.iushrn(shift);
  }

  return naf;
}
utils.getNAF = getNAF;

// Represent k1, k2 in a Joint Sparse Form
function getJSF(k1, k2) {
  var jsf = [
    [],
    []
  ];

  k1 = k1.clone();
  k2 = k2.clone();
  var d1 = 0;
  var d2 = 0;
  while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {

    // First phase
    var m14 = (k1.andln(3) + d1) & 3;
    var m24 = (k2.andln(3) + d2) & 3;
    if (m14 === 3)
      m14 = -1;
    if (m24 === 3)
      m24 = -1;
    var u1;
    if ((m14 & 1) === 0) {
      u1 = 0;
    } else {
      var m8 = (k1.andln(7) + d1) & 7;
      if ((m8 === 3 || m8 === 5) && m24 === 2)
        u1 = -m14;
      else
        u1 = m14;
    }
    jsf[0].push(u1);

    var u2;
    if ((m24 & 1) === 0) {
      u2 = 0;
    } else {
      var m8 = (k2.andln(7) + d2) & 7;
      if ((m8 === 3 || m8 === 5) && m14 === 2)
        u2 = -m24;
      else
        u2 = m24;
    }
    jsf[1].push(u2);

    // Second phase
    if (2 * d1 === u1 + 1)
      d1 = 1 - d1;
    if (2 * d2 === u2 + 1)
      d2 = 1 - d2;
    k1.iushrn(1);
    k2.iushrn(1);
  }

  return jsf;
}
utils.getJSF = getJSF;

function cachedProperty(obj, name, computer) {
  var key = '_' + name;
  obj.prototype[name] = function cachedProperty() {
    return this[key] !== undefined ? this[key] :
           this[key] = computer.call(this);
  };
}
utils.cachedProperty = cachedProperty;

function parseBytes(bytes) {
  return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') :
                                     bytes;
}
utils.parseBytes = parseBytes;

function intFromLE(bytes) {
  return new BN(bytes, 'hex', 'le');
}
utils.intFromLE = intFromLE;


},{"bn.js":1,"minimalistic-assert":34,"minimalistic-crypto-utils":35}],19:[function(require,module,exports){
module.exports={
  "_from": "elliptic@6.4.1",
  "_id": "elliptic@6.4.1",
  "_inBundle": false,
  "_integrity": "sha512-BsXLz5sqX8OHcsh7CqBMztyXARmGQ3LWPtGjJi6DiJHq5C/qvi9P3OqgswKSDftbu8+IoI/QDTAm2fFnQ9SZSQ==",
  "_location": "/elliptic",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "elliptic@6.4.1",
    "name": "elliptic",
    "escapedName": "elliptic",
    "rawSpec": "6.4.1",
    "saveSpec": null,
    "fetchSpec": "6.4.1"
  },
  "_requiredBy": [
    "#USER",
    "/",
    "/browserify-sign",
    "/create-ecdh"
  ],
  "_resolved": "https://registry.npmjs.org/elliptic/-/elliptic-6.4.1.tgz",
  "_shasum": "c2d0b7776911b86722c632c3c06c60f2f819939a",
  "_spec": "elliptic@6.4.1",
  "_where": "/home/osboxes/Projects/ncrypt/ncrypt",
  "author": {
    "name": "Fedor Indutny",
    "email": "fedor@indutny.com"
  },
  "bugs": {
    "url": "https://github.com/indutny/elliptic/issues"
  },
  "bundleDependencies": false,
  "dependencies": {
    "bn.js": "^4.4.0",
    "brorand": "^1.0.1",
    "hash.js": "^1.0.0",
    "hmac-drbg": "^1.0.0",
    "inherits": "^2.0.1",
    "minimalistic-assert": "^1.0.0",
    "minimalistic-crypto-utils": "^1.0.0"
  },
  "deprecated": false,
  "description": "EC cryptography",
  "devDependencies": {
    "brfs": "^1.4.3",
    "coveralls": "^2.11.3",
    "grunt": "^0.4.5",
    "grunt-browserify": "^5.0.0",
    "grunt-cli": "^1.2.0",
    "grunt-contrib-connect": "^1.0.0",
    "grunt-contrib-copy": "^1.0.0",
    "grunt-contrib-uglify": "^1.0.1",
    "grunt-mocha-istanbul": "^3.0.1",
    "grunt-saucelabs": "^8.6.2",
    "istanbul": "^0.4.2",
    "jscs": "^2.9.0",
    "jshint": "^2.6.0",
    "mocha": "^2.1.0"
  },
  "files": [
    "lib"
  ],
  "homepage": "https://github.com/indutny/elliptic",
  "keywords": [
    "EC",
    "Elliptic",
    "curve",
    "Cryptography"
  ],
  "license": "MIT",
  "main": "lib/elliptic.js",
  "name": "elliptic",
  "repository": {
    "type": "git",
    "url": "git+ssh://git@github.com/indutny/elliptic.git"
  },
  "scripts": {
    "jscs": "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
    "jshint": "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
    "lint": "npm run jscs && npm run jshint",
    "test": "npm run lint && npm run unit",
    "unit": "istanbul test _mocha --reporter=spec test/index.js",
    "version": "grunt dist && git add dist/"
  },
  "version": "6.4.1"
}

},{}],20:[function(require,module,exports){
var hash = exports;

hash.utils = require('./hash/utils');
hash.common = require('./hash/common');
hash.sha = require('./hash/sha');
hash.ripemd = require('./hash/ripemd');
hash.hmac = require('./hash/hmac');

// Proxy hash functions to the main object
hash.sha1 = hash.sha.sha1;
hash.sha256 = hash.sha.sha256;
hash.sha224 = hash.sha.sha224;
hash.sha384 = hash.sha.sha384;
hash.sha512 = hash.sha.sha512;
hash.ripemd160 = hash.ripemd.ripemd160;

},{"./hash/common":21,"./hash/hmac":22,"./hash/ripemd":23,"./hash/sha":24,"./hash/utils":31}],21:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var assert = require('minimalistic-assert');

function BlockHash() {
  this.pending = null;
  this.pendingTotal = 0;
  this.blockSize = this.constructor.blockSize;
  this.outSize = this.constructor.outSize;
  this.hmacStrength = this.constructor.hmacStrength;
  this.padLength = this.constructor.padLength / 8;
  this.endian = 'big';

  this._delta8 = this.blockSize / 8;
  this._delta32 = this.blockSize / 32;
}
exports.BlockHash = BlockHash;

BlockHash.prototype.update = function update(msg, enc) {
  // Convert message to array, pad it, and join into 32bit blocks
  msg = utils.toArray(msg, enc);
  if (!this.pending)
    this.pending = msg;
  else
    this.pending = this.pending.concat(msg);
  this.pendingTotal += msg.length;

  // Enough data, try updating
  if (this.pending.length >= this._delta8) {
    msg = this.pending;

    // Process pending data in blocks
    var r = msg.length % this._delta8;
    this.pending = msg.slice(msg.length - r, msg.length);
    if (this.pending.length === 0)
      this.pending = null;

    msg = utils.join32(msg, 0, msg.length - r, this.endian);
    for (var i = 0; i < msg.length; i += this._delta32)
      this._update(msg, i, i + this._delta32);
  }

  return this;
};

BlockHash.prototype.digest = function digest(enc) {
  this.update(this._pad());
  assert(this.pending === null);

  return this._digest(enc);
};

BlockHash.prototype._pad = function pad() {
  var len = this.pendingTotal;
  var bytes = this._delta8;
  var k = bytes - ((len + this.padLength) % bytes);
  var res = new Array(k + this.padLength);
  res[0] = 0x80;
  for (var i = 1; i < k; i++)
    res[i] = 0;

  // Append length
  len <<= 3;
  if (this.endian === 'big') {
    for (var t = 8; t < this.padLength; t++)
      res[i++] = 0;

    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = len & 0xff;
  } else {
    res[i++] = len & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;

    for (t = 8; t < this.padLength; t++)
      res[i++] = 0;
  }

  return res;
};

},{"./utils":31,"minimalistic-assert":34}],22:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var assert = require('minimalistic-assert');

function Hmac(hash, key, enc) {
  if (!(this instanceof Hmac))
    return new Hmac(hash, key, enc);
  this.Hash = hash;
  this.blockSize = hash.blockSize / 8;
  this.outSize = hash.outSize / 8;
  this.inner = null;
  this.outer = null;

  this._init(utils.toArray(key, enc));
}
module.exports = Hmac;

Hmac.prototype._init = function init(key) {
  // Shorten key, if needed
  if (key.length > this.blockSize)
    key = new this.Hash().update(key).digest();
  assert(key.length <= this.blockSize);

  // Add padding to key
  for (var i = key.length; i < this.blockSize; i++)
    key.push(0);

  for (i = 0; i < key.length; i++)
    key[i] ^= 0x36;
  this.inner = new this.Hash().update(key);

  // 0x36 ^ 0x5c = 0x6a
  for (i = 0; i < key.length; i++)
    key[i] ^= 0x6a;
  this.outer = new this.Hash().update(key);
};

Hmac.prototype.update = function update(msg, enc) {
  this.inner.update(msg, enc);
  return this;
};

Hmac.prototype.digest = function digest(enc) {
  this.outer.update(this.inner.digest());
  return this.outer.digest(enc);
};

},{"./utils":31,"minimalistic-assert":34}],23:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var common = require('./common');

var rotl32 = utils.rotl32;
var sum32 = utils.sum32;
var sum32_3 = utils.sum32_3;
var sum32_4 = utils.sum32_4;
var BlockHash = common.BlockHash;

function RIPEMD160() {
  if (!(this instanceof RIPEMD160))
    return new RIPEMD160();

  BlockHash.call(this);

  this.h = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
  this.endian = 'little';
}
utils.inherits(RIPEMD160, BlockHash);
exports.ripemd160 = RIPEMD160;

RIPEMD160.blockSize = 512;
RIPEMD160.outSize = 160;
RIPEMD160.hmacStrength = 192;
RIPEMD160.padLength = 64;

RIPEMD160.prototype._update = function update(msg, start) {
  var A = this.h[0];
  var B = this.h[1];
  var C = this.h[2];
  var D = this.h[3];
  var E = this.h[4];
  var Ah = A;
  var Bh = B;
  var Ch = C;
  var Dh = D;
  var Eh = E;
  for (var j = 0; j < 80; j++) {
    var T = sum32(
      rotl32(
        sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)),
        s[j]),
      E);
    A = E;
    E = D;
    D = rotl32(C, 10);
    C = B;
    B = T;
    T = sum32(
      rotl32(
        sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
        sh[j]),
      Eh);
    Ah = Eh;
    Eh = Dh;
    Dh = rotl32(Ch, 10);
    Ch = Bh;
    Bh = T;
  }
  T = sum32_3(this.h[1], C, Dh);
  this.h[1] = sum32_3(this.h[2], D, Eh);
  this.h[2] = sum32_3(this.h[3], E, Ah);
  this.h[3] = sum32_3(this.h[4], A, Bh);
  this.h[4] = sum32_3(this.h[0], B, Ch);
  this.h[0] = T;
};

RIPEMD160.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'little');
  else
    return utils.split32(this.h, 'little');
};

function f(j, x, y, z) {
  if (j <= 15)
    return x ^ y ^ z;
  else if (j <= 31)
    return (x & y) | ((~x) & z);
  else if (j <= 47)
    return (x | (~y)) ^ z;
  else if (j <= 63)
    return (x & z) | (y & (~z));
  else
    return x ^ (y | (~z));
}

function K(j) {
  if (j <= 15)
    return 0x00000000;
  else if (j <= 31)
    return 0x5a827999;
  else if (j <= 47)
    return 0x6ed9eba1;
  else if (j <= 63)
    return 0x8f1bbcdc;
  else
    return 0xa953fd4e;
}

function Kh(j) {
  if (j <= 15)
    return 0x50a28be6;
  else if (j <= 31)
    return 0x5c4dd124;
  else if (j <= 47)
    return 0x6d703ef3;
  else if (j <= 63)
    return 0x7a6d76e9;
  else
    return 0x00000000;
}

var r = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];

var rh = [
  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];

var s = [
  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];

var sh = [
  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];

},{"./common":21,"./utils":31}],24:[function(require,module,exports){
'use strict';

exports.sha1 = require('./sha/1');
exports.sha224 = require('./sha/224');
exports.sha256 = require('./sha/256');
exports.sha384 = require('./sha/384');
exports.sha512 = require('./sha/512');

},{"./sha/1":25,"./sha/224":26,"./sha/256":27,"./sha/384":28,"./sha/512":29}],25:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var shaCommon = require('./common');

var rotl32 = utils.rotl32;
var sum32 = utils.sum32;
var sum32_5 = utils.sum32_5;
var ft_1 = shaCommon.ft_1;
var BlockHash = common.BlockHash;

var sha1_K = [
  0x5A827999, 0x6ED9EBA1,
  0x8F1BBCDC, 0xCA62C1D6
];

function SHA1() {
  if (!(this instanceof SHA1))
    return new SHA1();

  BlockHash.call(this);
  this.h = [
    0x67452301, 0xefcdab89, 0x98badcfe,
    0x10325476, 0xc3d2e1f0 ];
  this.W = new Array(80);
}

utils.inherits(SHA1, BlockHash);
module.exports = SHA1;

SHA1.blockSize = 512;
SHA1.outSize = 160;
SHA1.hmacStrength = 80;
SHA1.padLength = 64;

SHA1.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];

  for(; i < W.length; i++)
    W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];

  for (i = 0; i < W.length; i++) {
    var s = ~~(i / 20);
    var t = sum32_5(rotl32(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
    e = d;
    d = c;
    c = rotl32(b, 30);
    b = a;
    a = t;
  }

  this.h[0] = sum32(this.h[0], a);
  this.h[1] = sum32(this.h[1], b);
  this.h[2] = sum32(this.h[2], c);
  this.h[3] = sum32(this.h[3], d);
  this.h[4] = sum32(this.h[4], e);
};

SHA1.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

},{"../common":21,"../utils":31,"./common":30}],26:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var SHA256 = require('./256');

function SHA224() {
  if (!(this instanceof SHA224))
    return new SHA224();

  SHA256.call(this);
  this.h = [
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4 ];
}
utils.inherits(SHA224, SHA256);
module.exports = SHA224;

SHA224.blockSize = 512;
SHA224.outSize = 224;
SHA224.hmacStrength = 192;
SHA224.padLength = 64;

SHA224.prototype._digest = function digest(enc) {
  // Just truncate output
  if (enc === 'hex')
    return utils.toHex32(this.h.slice(0, 7), 'big');
  else
    return utils.split32(this.h.slice(0, 7), 'big');
};


},{"../utils":31,"./256":27}],27:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var shaCommon = require('./common');
var assert = require('minimalistic-assert');

var sum32 = utils.sum32;
var sum32_4 = utils.sum32_4;
var sum32_5 = utils.sum32_5;
var ch32 = shaCommon.ch32;
var maj32 = shaCommon.maj32;
var s0_256 = shaCommon.s0_256;
var s1_256 = shaCommon.s1_256;
var g0_256 = shaCommon.g0_256;
var g1_256 = shaCommon.g1_256;

var BlockHash = common.BlockHash;

var sha256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function SHA256() {
  if (!(this instanceof SHA256))
    return new SHA256();

  BlockHash.call(this);
  this.h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  this.k = sha256_K;
  this.W = new Array(64);
}
utils.inherits(SHA256, BlockHash);
module.exports = SHA256;

SHA256.blockSize = 512;
SHA256.outSize = 256;
SHA256.hmacStrength = 192;
SHA256.padLength = 64;

SHA256.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i++)
    W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];
  var f = this.h[5];
  var g = this.h[6];
  var h = this.h[7];

  assert(this.k.length === W.length);
  for (i = 0; i < W.length; i++) {
    var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
    var T2 = sum32(s0_256(a), maj32(a, b, c));
    h = g;
    g = f;
    f = e;
    e = sum32(d, T1);
    d = c;
    c = b;
    b = a;
    a = sum32(T1, T2);
  }

  this.h[0] = sum32(this.h[0], a);
  this.h[1] = sum32(this.h[1], b);
  this.h[2] = sum32(this.h[2], c);
  this.h[3] = sum32(this.h[3], d);
  this.h[4] = sum32(this.h[4], e);
  this.h[5] = sum32(this.h[5], f);
  this.h[6] = sum32(this.h[6], g);
  this.h[7] = sum32(this.h[7], h);
};

SHA256.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

},{"../common":21,"../utils":31,"./common":30,"minimalistic-assert":34}],28:[function(require,module,exports){
'use strict';

var utils = require('../utils');

var SHA512 = require('./512');

function SHA384() {
  if (!(this instanceof SHA384))
    return new SHA384();

  SHA512.call(this);
  this.h = [
    0xcbbb9d5d, 0xc1059ed8,
    0x629a292a, 0x367cd507,
    0x9159015a, 0x3070dd17,
    0x152fecd8, 0xf70e5939,
    0x67332667, 0xffc00b31,
    0x8eb44a87, 0x68581511,
    0xdb0c2e0d, 0x64f98fa7,
    0x47b5481d, 0xbefa4fa4 ];
}
utils.inherits(SHA384, SHA512);
module.exports = SHA384;

SHA384.blockSize = 1024;
SHA384.outSize = 384;
SHA384.hmacStrength = 192;
SHA384.padLength = 128;

SHA384.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h.slice(0, 12), 'big');
  else
    return utils.split32(this.h.slice(0, 12), 'big');
};

},{"../utils":31,"./512":29}],29:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var assert = require('minimalistic-assert');

var rotr64_hi = utils.rotr64_hi;
var rotr64_lo = utils.rotr64_lo;
var shr64_hi = utils.shr64_hi;
var shr64_lo = utils.shr64_lo;
var sum64 = utils.sum64;
var sum64_hi = utils.sum64_hi;
var sum64_lo = utils.sum64_lo;
var sum64_4_hi = utils.sum64_4_hi;
var sum64_4_lo = utils.sum64_4_lo;
var sum64_5_hi = utils.sum64_5_hi;
var sum64_5_lo = utils.sum64_5_lo;

var BlockHash = common.BlockHash;

var sha512_K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function SHA512() {
  if (!(this instanceof SHA512))
    return new SHA512();

  BlockHash.call(this);
  this.h = [
    0x6a09e667, 0xf3bcc908,
    0xbb67ae85, 0x84caa73b,
    0x3c6ef372, 0xfe94f82b,
    0xa54ff53a, 0x5f1d36f1,
    0x510e527f, 0xade682d1,
    0x9b05688c, 0x2b3e6c1f,
    0x1f83d9ab, 0xfb41bd6b,
    0x5be0cd19, 0x137e2179 ];
  this.k = sha512_K;
  this.W = new Array(160);
}
utils.inherits(SHA512, BlockHash);
module.exports = SHA512;

SHA512.blockSize = 1024;
SHA512.outSize = 512;
SHA512.hmacStrength = 192;
SHA512.padLength = 128;

SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
  var W = this.W;

  // 32 x 32bit words
  for (var i = 0; i < 32; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i += 2) {
    var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);  // i - 2
    var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
    var c1_hi = W[i - 14];  // i - 7
    var c1_lo = W[i - 13];
    var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);  // i - 15
    var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
    var c3_hi = W[i - 32];  // i - 16
    var c3_lo = W[i - 31];

    W[i] = sum64_4_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
    W[i + 1] = sum64_4_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
  }
};

SHA512.prototype._update = function _update(msg, start) {
  this._prepareBlock(msg, start);

  var W = this.W;

  var ah = this.h[0];
  var al = this.h[1];
  var bh = this.h[2];
  var bl = this.h[3];
  var ch = this.h[4];
  var cl = this.h[5];
  var dh = this.h[6];
  var dl = this.h[7];
  var eh = this.h[8];
  var el = this.h[9];
  var fh = this.h[10];
  var fl = this.h[11];
  var gh = this.h[12];
  var gl = this.h[13];
  var hh = this.h[14];
  var hl = this.h[15];

  assert(this.k.length === W.length);
  for (var i = 0; i < W.length; i += 2) {
    var c0_hi = hh;
    var c0_lo = hl;
    var c1_hi = s1_512_hi(eh, el);
    var c1_lo = s1_512_lo(eh, el);
    var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
    var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
    var c3_hi = this.k[i];
    var c3_lo = this.k[i + 1];
    var c4_hi = W[i];
    var c4_lo = W[i + 1];

    var T1_hi = sum64_5_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);
    var T1_lo = sum64_5_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);

    c0_hi = s0_512_hi(ah, al);
    c0_lo = s0_512_lo(ah, al);
    c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
    c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);

    var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
    var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);

    hh = gh;
    hl = gl;

    gh = fh;
    gl = fl;

    fh = eh;
    fl = el;

    eh = sum64_hi(dh, dl, T1_hi, T1_lo);
    el = sum64_lo(dl, dl, T1_hi, T1_lo);

    dh = ch;
    dl = cl;

    ch = bh;
    cl = bl;

    bh = ah;
    bl = al;

    ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
    al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
  }

  sum64(this.h, 0, ah, al);
  sum64(this.h, 2, bh, bl);
  sum64(this.h, 4, ch, cl);
  sum64(this.h, 6, dh, dl);
  sum64(this.h, 8, eh, el);
  sum64(this.h, 10, fh, fl);
  sum64(this.h, 12, gh, gl);
  sum64(this.h, 14, hh, hl);
};

SHA512.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

function ch64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ ((~xh) & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function ch64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ ((~xl) & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ (xh & zh) ^ (yh & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ (xl & zl) ^ (yl & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 28);
  var c1_hi = rotr64_hi(xl, xh, 2);  // 34
  var c2_hi = rotr64_hi(xl, xh, 7);  // 39

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 28);
  var c1_lo = rotr64_lo(xl, xh, 2);  // 34
  var c2_lo = rotr64_lo(xl, xh, 7);  // 39

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 14);
  var c1_hi = rotr64_hi(xh, xl, 18);
  var c2_hi = rotr64_hi(xl, xh, 9);  // 41

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 14);
  var c1_lo = rotr64_lo(xh, xl, 18);
  var c2_lo = rotr64_lo(xl, xh, 9);  // 41

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 1);
  var c1_hi = rotr64_hi(xh, xl, 8);
  var c2_hi = shr64_hi(xh, xl, 7);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 1);
  var c1_lo = rotr64_lo(xh, xl, 8);
  var c2_lo = shr64_lo(xh, xl, 7);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 19);
  var c1_hi = rotr64_hi(xl, xh, 29);  // 61
  var c2_hi = shr64_hi(xh, xl, 6);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 19);
  var c1_lo = rotr64_lo(xl, xh, 29);  // 61
  var c2_lo = shr64_lo(xh, xl, 6);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

},{"../common":21,"../utils":31,"minimalistic-assert":34}],30:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var rotr32 = utils.rotr32;

function ft_1(s, x, y, z) {
  if (s === 0)
    return ch32(x, y, z);
  if (s === 1 || s === 3)
    return p32(x, y, z);
  if (s === 2)
    return maj32(x, y, z);
}
exports.ft_1 = ft_1;

function ch32(x, y, z) {
  return (x & y) ^ ((~x) & z);
}
exports.ch32 = ch32;

function maj32(x, y, z) {
  return (x & y) ^ (x & z) ^ (y & z);
}
exports.maj32 = maj32;

function p32(x, y, z) {
  return x ^ y ^ z;
}
exports.p32 = p32;

function s0_256(x) {
  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}
exports.s0_256 = s0_256;

function s1_256(x) {
  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}
exports.s1_256 = s1_256;

function g0_256(x) {
  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
}
exports.g0_256 = g0_256;

function g1_256(x) {
  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
}
exports.g1_256 = g1_256;

},{"../utils":31}],31:[function(require,module,exports){
'use strict';

var assert = require('minimalistic-assert');
var inherits = require('inherits');

exports.inherits = inherits;

function isSurrogatePair(msg, i) {
  if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
    return false;
  }
  if (i < 0 || i + 1 >= msg.length) {
    return false;
  }
  return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
}

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg === 'string') {
    if (!enc) {
      // Inspired by stringToUtf8ByteArray() in closure-library by Google
      // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
      // Apache License 2.0
      // https://github.com/google/closure-library/blob/master/LICENSE
      var p = 0;
      for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        if (c < 128) {
          res[p++] = c;
        } else if (c < 2048) {
          res[p++] = (c >> 6) | 192;
          res[p++] = (c & 63) | 128;
        } else if (isSurrogatePair(msg, i)) {
          c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
          res[p++] = (c >> 18) | 240;
          res[p++] = ((c >> 12) & 63) | 128;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        } else {
          res[p++] = (c >> 12) | 224;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        }
      }
    } else if (enc === 'hex') {
      msg = msg.replace(/[^a-z0-9]+/ig, '');
      if (msg.length % 2 !== 0)
        msg = '0' + msg;
      for (i = 0; i < msg.length; i += 2)
        res.push(parseInt(msg[i] + msg[i + 1], 16));
    }
  } else {
    for (i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
  }
  return res;
}
exports.toArray = toArray;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
exports.toHex = toHex;

function htonl(w) {
  var res = (w >>> 24) |
            ((w >>> 8) & 0xff00) |
            ((w << 8) & 0xff0000) |
            ((w & 0xff) << 24);
  return res >>> 0;
}
exports.htonl = htonl;

function toHex32(msg, endian) {
  var res = '';
  for (var i = 0; i < msg.length; i++) {
    var w = msg[i];
    if (endian === 'little')
      w = htonl(w);
    res += zero8(w.toString(16));
  }
  return res;
}
exports.toHex32 = toHex32;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
exports.zero2 = zero2;

function zero8(word) {
  if (word.length === 7)
    return '0' + word;
  else if (word.length === 6)
    return '00' + word;
  else if (word.length === 5)
    return '000' + word;
  else if (word.length === 4)
    return '0000' + word;
  else if (word.length === 3)
    return '00000' + word;
  else if (word.length === 2)
    return '000000' + word;
  else if (word.length === 1)
    return '0000000' + word;
  else
    return word;
}
exports.zero8 = zero8;

function join32(msg, start, end, endian) {
  var len = end - start;
  assert(len % 4 === 0);
  var res = new Array(len / 4);
  for (var i = 0, k = start; i < res.length; i++, k += 4) {
    var w;
    if (endian === 'big')
      w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
    else
      w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
    res[i] = w >>> 0;
  }
  return res;
}
exports.join32 = join32;

function split32(msg, endian) {
  var res = new Array(msg.length * 4);
  for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
    var m = msg[i];
    if (endian === 'big') {
      res[k] = m >>> 24;
      res[k + 1] = (m >>> 16) & 0xff;
      res[k + 2] = (m >>> 8) & 0xff;
      res[k + 3] = m & 0xff;
    } else {
      res[k + 3] = m >>> 24;
      res[k + 2] = (m >>> 16) & 0xff;
      res[k + 1] = (m >>> 8) & 0xff;
      res[k] = m & 0xff;
    }
  }
  return res;
}
exports.split32 = split32;

function rotr32(w, b) {
  return (w >>> b) | (w << (32 - b));
}
exports.rotr32 = rotr32;

function rotl32(w, b) {
  return (w << b) | (w >>> (32 - b));
}
exports.rotl32 = rotl32;

function sum32(a, b) {
  return (a + b) >>> 0;
}
exports.sum32 = sum32;

function sum32_3(a, b, c) {
  return (a + b + c) >>> 0;
}
exports.sum32_3 = sum32_3;

function sum32_4(a, b, c, d) {
  return (a + b + c + d) >>> 0;
}
exports.sum32_4 = sum32_4;

function sum32_5(a, b, c, d, e) {
  return (a + b + c + d + e) >>> 0;
}
exports.sum32_5 = sum32_5;

function sum64(buf, pos, ah, al) {
  var bh = buf[pos];
  var bl = buf[pos + 1];

  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  buf[pos] = hi >>> 0;
  buf[pos + 1] = lo;
}
exports.sum64 = sum64;

function sum64_hi(ah, al, bh, bl) {
  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  return hi >>> 0;
}
exports.sum64_hi = sum64_hi;

function sum64_lo(ah, al, bh, bl) {
  var lo = al + bl;
  return lo >>> 0;
}
exports.sum64_lo = sum64_lo;

function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;

  var hi = ah + bh + ch + dh + carry;
  return hi >>> 0;
}
exports.sum64_4_hi = sum64_4_hi;

function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
  var lo = al + bl + cl + dl;
  return lo >>> 0;
}
exports.sum64_4_lo = sum64_4_lo;

function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;
  lo = (lo + el) >>> 0;
  carry += lo < el ? 1 : 0;

  var hi = ah + bh + ch + dh + eh + carry;
  return hi >>> 0;
}
exports.sum64_5_hi = sum64_5_hi;

function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var lo = al + bl + cl + dl + el;

  return lo >>> 0;
}
exports.sum64_5_lo = sum64_5_lo;

function rotr64_hi(ah, al, num) {
  var r = (al << (32 - num)) | (ah >>> num);
  return r >>> 0;
}
exports.rotr64_hi = rotr64_hi;

function rotr64_lo(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
exports.rotr64_lo = rotr64_lo;

function shr64_hi(ah, al, num) {
  return ah >>> num;
}
exports.shr64_hi = shr64_hi;

function shr64_lo(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
exports.shr64_lo = shr64_lo;

},{"inherits":33,"minimalistic-assert":34}],32:[function(require,module,exports){
'use strict';

var hash = require('hash.js');
var utils = require('minimalistic-crypto-utils');
var assert = require('minimalistic-assert');

function HmacDRBG(options) {
  if (!(this instanceof HmacDRBG))
    return new HmacDRBG(options);
  this.hash = options.hash;
  this.predResist = !!options.predResist;

  this.outLen = this.hash.outSize;
  this.minEntropy = options.minEntropy || this.hash.hmacStrength;

  this._reseed = null;
  this.reseedInterval = null;
  this.K = null;
  this.V = null;

  var entropy = utils.toArray(options.entropy, options.entropyEnc || 'hex');
  var nonce = utils.toArray(options.nonce, options.nonceEnc || 'hex');
  var pers = utils.toArray(options.pers, options.persEnc || 'hex');
  assert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');
  this._init(entropy, nonce, pers);
}
module.exports = HmacDRBG;

HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
  var seed = entropy.concat(nonce).concat(pers);

  this.K = new Array(this.outLen / 8);
  this.V = new Array(this.outLen / 8);
  for (var i = 0; i < this.V.length; i++) {
    this.K[i] = 0x00;
    this.V[i] = 0x01;
  }

  this._update(seed);
  this._reseed = 1;
  this.reseedInterval = 0x1000000000000;  // 2^48
};

HmacDRBG.prototype._hmac = function hmac() {
  return new hash.hmac(this.hash, this.K);
};

HmacDRBG.prototype._update = function update(seed) {
  var kmac = this._hmac()
                 .update(this.V)
                 .update([ 0x00 ]);
  if (seed)
    kmac = kmac.update(seed);
  this.K = kmac.digest();
  this.V = this._hmac().update(this.V).digest();
  if (!seed)
    return;

  this.K = this._hmac()
               .update(this.V)
               .update([ 0x01 ])
               .update(seed)
               .digest();
  this.V = this._hmac().update(this.V).digest();
};

HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
  // Optional entropy enc
  if (typeof entropyEnc !== 'string') {
    addEnc = add;
    add = entropyEnc;
    entropyEnc = null;
  }

  entropy = utils.toArray(entropy, entropyEnc);
  add = utils.toArray(add, addEnc);

  assert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

  this._update(entropy.concat(add || []));
  this._reseed = 1;
};

HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
  if (this._reseed > this.reseedInterval)
    throw new Error('Reseed is required');

  // Optional encoding
  if (typeof enc !== 'string') {
    addEnc = add;
    add = enc;
    enc = null;
  }

  // Optional additional data
  if (add) {
    add = utils.toArray(add, addEnc || 'hex');
    this._update(add);
  }

  var temp = [];
  while (temp.length < len) {
    this.V = this._hmac().update(this.V).digest();
    temp = temp.concat(this.V);
  }

  var res = temp.slice(0, len);
  this._update(add);
  this._reseed++;
  return utils.encode(res, enc);
};

},{"hash.js":20,"minimalistic-assert":34,"minimalistic-crypto-utils":35}],33:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],34:[function(require,module,exports){
module.exports = assert;

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

assert.equal = function assertEqual(l, r, msg) {
  if (l != r)
    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
};

},{}],35:[function(require,module,exports){
'use strict';

var utils = exports;

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg !== 'string') {
    for (var i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
    return res;
  }
  if (enc === 'hex') {
    msg = msg.replace(/[^a-z0-9]+/ig, '');
    if (msg.length % 2 !== 0)
      msg = '0' + msg;
    for (var i = 0; i < msg.length; i += 2)
      res.push(parseInt(msg[i] + msg[i + 1], 16));
  } else {
    for (var i = 0; i < msg.length; i++) {
      var c = msg.charCodeAt(i);
      var hi = c >> 8;
      var lo = c & 0xff;
      if (hi)
        res.push(hi, lo);
      else
        res.push(lo);
    }
  }
  return res;
}
utils.toArray = toArray;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
utils.zero2 = zero2;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
utils.toHex = toHex;

utils.encode = function encode(arr, enc) {
  if (enc === 'hex')
    return toHex(arr);
  else
    return arr;
};

},{}],36:[function(require,module,exports){
(function (factory) {
    if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals (with support for web workers)
        var glob;

        try {
            glob = window;
        } catch (e) {
            glob = self;
        }

        glob.SparkMD5 = factory();
    }
}(function (undefined) {

    'use strict';

    /*
     * Fastest md5 implementation around (JKM md5).
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var add32 = function (a, b) {
        return (a + b) & 0xFFFFFFFF;
    },
        hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];


    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;

        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;

        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;

        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b  = (b << 21 | b >>> 11) + c | 0;

        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
    }

    function md5blk(s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function md5blk_array(a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    }

    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    }

    function md51_array(a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    }

    function rhex(n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }

    function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    }

    // In some cases the fast add32 function cannot be used..
    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
        add32 = function (x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        };
    }

    // ---------------------------------------------------

    /**
     * ArrayBuffer slice polyfill.
     *
     * @see https://github.com/ttaubert/node-arraybuffer-slice
     */

    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
        (function () {
            function clamp(val, length) {
                val = (val | 0) || 0;

                if (val < 0) {
                    return Math.max(val + length, 0);
                }

                return Math.min(val, length);
            }

            ArrayBuffer.prototype.slice = function (from, to) {
                var length = this.byteLength,
                    begin = clamp(from, length),
                    end = length,
                    num,
                    target,
                    targetArray,
                    sourceArray;

                if (to !== undefined) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);

                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            };
        })();
    }

    // ---------------------------------------------------

    /**
     * Helpers.
     */

    function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        return str;
    }

    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length,
           buff = new ArrayBuffer(length),
           arr = new Uint8Array(buff),
           i;

        for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
        }

        return returnUInt8Array ? arr : buff;
    }

    function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
    }

    function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);

        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);

        return returnUInt8Array ? result : result.buffer;
    }

    function hexToBinaryString(hex) {
        var bytes = [],
            length = hex.length,
            x;

        for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
        }

        return String.fromCharCode.apply(String, bytes);
    }

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */

    function SparkMD5() {
        // call reset to init the instance
        this.reset();
    }

    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // Converts the string to utf8 bytes if necessary
        // Then append as binary
        this.appendBinary(toUtf8(str));

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substring(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = '';
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.prototype.getState = function () {
        return {
            buff: this._buff,
            length: this._length,
            hash: this._hash
        };
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.setState = function (state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other additional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._hash;
        delete this._buff;
        delete this._length;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
    };

    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hash = function (str, raw) {
        // Converts the string to utf8 bytes if necessary
        // Then compute it using the binary function
        return SparkMD5.hashBinary(toUtf8(str), raw);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} raw     True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }

        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.ArrayBuffer.prototype.getState = function () {
        var state = SparkMD5.prototype.getState.call(this);

        // Convert buffer to a string
        state.buff = arrayBuffer2Utf8Str(state.buff);

        return state;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
        // Convert string to buffer
        state.buff = utf8Str2ArrayBuffer(state.buff, true);

        return SparkMD5.prototype.setState.call(this, state);
    };

    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     raw True to get the raw string, false to get the hex one
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr)),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    return SparkMD5;
}));

},{}],37:[function(require,module,exports){
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

},{"./simple/simple.js":38,"./types/types.js":59}],38:[function(require,module,exports){
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

},{"./simple/keyset.js":39,"./simple/message.js":40,"./simple/secret.js":41,"./simple/signature.js":42}],39:[function(require,module,exports){

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

},{}],40:[function(require,module,exports){

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
 * @namespace nCrypt.asym.simple.message
 * */
var  message = {};
var _message = {};

var tsecret = dep.types.basic.secret;
var tid = dep.types.basic.id;
var tdh = dep.types.shared.dh;
var tecies = dep.types.shared.ecies;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var tsign = dep.types.signature.ecdsa; // tsign.Signature
var tsymkey = dep.types.simple.message.symkey;

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

_message.typesArray = [ 1, 2, 3 ];
_message.types = {
    "ENCRYPT": 1,
    "SIGN": 2,
    "BOTH": 3
};

/**
 * @namespace nCrypt.asym.simple.message.types
 * */
message.types = {};

/**
 * Get the possible types a message might have. These types can be seen as 
 * constants and are found in the message JSON.
 * @returns {object}
 * @function
 * @name getTypes
 * @memberof nCrypt.asym.simple.message.types
 * */
message.types.getTypes = function(){
    return JSON.parse(JSON.stringify(_message.types));
};

_message.sender = {};

_message.sender.process = {};
_message.sender.process.encrypt = 
function(cleartext, enc_symkey_args, sender_ks, 
         symkey_secret, sym_alg, sym_opts, callback, carry)
{
    var task_precheck_esk = function(cb, args){
        var esk = args.enc_symkey_args;
        if(typeof esk!=='object' || !Array.isArray(esk)){
            cb(args); return; // will result in invalid receiver array in check
        }
        var esk_is_json_arr = true;
        for(var i=0; i<esk.length; i++){
            var o = esk[i];
            if(typeof o!=='object' ||
               typeof o.t!=='string' ||
               typeof o.i!=='string' ||
               typeof o.k!=='object' ||
               ((typeof o.t==='string' && o.t==='ecies') && 
                (typeof o.tag!=='object' || o.tag===null || o.tag==={})) )
            {
                esk_is_json_arr = false; break;
            }
        }
        if(esk_is_json_arr!==true){
            tsymkey.sender.arr.createEncryptedSymkeyArray(
                esk.slice(0), args.symkey_secret, args.sym_alg, args.sym_opts,
                function(arr, c){
                    var args = c.a;
                    var cb = c.c;
                    if(_isExp(arr)){ cb(arr); return; }
                    arr = tsymkey.sender.arr.symkeyArrayJSON(arr);
                    if(_isExp(arr)){ cb(arr); return; }
                    args.enc_symkey_args = arr.slice(0);
                    cb(args); return;
                }, 
                { 'a': args, 'c': cb }
            );
        }else{ cb(args); return; }
    };
    var task_check_args = function(cb, args){
        var runf = function(args){
            /* Validate cleartext */
            if(typeof args.cleartext!=='string' || args.cleartext.length<1){
                throw (new ncrypt.exception.types.simple.message.
                        message.invalidArgument());
            }
            
            /* Validate symmetric keys object */
            var clone_enc_symkey_args_json = [];
            if(typeof args.enc_symkey_args !=='object' || 
               !Array.isArray(args.enc_symkey_args)){
                throw (new ncrypt.exception.types.simple.message.message.
                    invalidReceiverArray());
            }
            for(var i=0; i<args.enc_symkey_args.length; i++){
                var o = args.enc_symkey_args[i];
                if(typeof o!=='object' ||
                   typeof o.t!=='string' ||
                   typeof o.i!=='string' ||
                   typeof o.k!=='object' ||
                   ((typeof o.t==='string' && o.t==='ecies') && 
                    (typeof o.tag!=='object' || o.tag===null || o.tag==={})) )
                {
                    throw (new ncrypt.exception.types.simple.message.message.
                    invalidReceiverArray());
                }
                try{
                    // clone_enc_symkey_args_json
                    o = JSON.parse(JSON.stringify(o));
                    clone_enc_symkey_args_json.push(o);
                }catch(e){
                    throw (new ncrypt.exception.types.simple.message.message.
                    invalidReceiverArray());
                }
            }
            args.enc_symkey_args = clone_enc_symkey_args_json; 
            
            /* Validate sender keyset */
            if(typeof args.sender_ks==='object'){
                try{
                    args.sender_ks = args.sender_ks.clone();
                    if(_isExp(args.sender_ks)) return args.sender_ks;
                }catch(e){ throw (new ncrypt.exception.types.simple.message.
                        message.invalidArgument());
                }
            }else if(typeof args.sender_ks==='string'){
                args.sender_ks = tkeyset.pub.getPublicKeyset(args.sender_ks);
                args.sender_ks = new tkeyset.Keyset(args.sender_ks);
                if(_isExp(args.sender_ks)) return args.sender_ks;
            }else{
                throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
            }
            
            /* Validate symmetric key */
            if(typeof args.symkey_secret==='object'){
                try{
                    args.symkey_secret = args.symkey_secret.getSecretValue();
                }catch(e){}
            }
            args.symkey_secret = new tsecret.Secret(tsecret.source.SECRET,
                                    args.symkey_secret);
            if(_isExp(args.symkey_secret)) return args.symkey_secret;
            
            /* Validate @sym_alg */
            if(typeof args.sym_alg !=='string' || args.sym_alg.length<1 ||
               ncrypt.sym.getAvailable().indexOf(args.sym_alg)<0){
                throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
            }
            
            /* Validate @sym_opts */
            if(typeof args.sym_opts!=='undefined'){
                if(typeof args.sym_opts!=='object'){
                    throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
                }
                if(args.sym_opts === null) args.sym_opts = {};
            }
            return args;
        };
        args = SecureExec.sync.apply(runf, [args]);
        cb(args);
    };//var check_args
    var task_encrypt_cleartext = function(cb, args){
        var salg = args.sym_alg;
        var sopts = args.sym_opts;
        var cleartext = args.cleartext;
        var pass = args.symkey_secret.getSecretValue();
        ncrypt.sym.async.encrypt(cleartext, pass, salg, function(ct, a){
            var args = a.a;
            var cb = a.c;
            if(_isExp(ct)){ cb(ct); return; }
            args.ciphertext = ct;
            try{
                args.ciphertext = JSON.parse(args.ciphertext);
            }catch(e){
                cb(new SecureExec.exception.Exception(null,null,e));
                return;
            }
            cb(args);
        }, {'a': args, 'c': cb }, sopts);
    };
    var task_get_sender_id = function(cb, args){
        args.sender_id = args.sender_ks.getPublicKeyIDs().txt.normal+'';
        cb(args);
    };
    var task_assemble_msg = function(cb, args){
        try{
            var ct = JSON.parse(JSON.stringify(args.ciphertext));
        }catch(e){ 
            var exp = new SecureExec.exception.Exception(null,null,e);
            cb(exp); return;
        }
        args.msg = {
            't': (_message.types.ENCRYPT+0),
            'i': (args.sender_id+''),
            'c': ct,
            'k': args.enc_symkey_args.slice(0)
        };
        cb(args.msg);
    };
    var args = {
        'cleartext': cleartext,
        'enc_symkey_args': enc_symkey_args,
        'sender_ks': sender_ks,
        'symkey_secret': symkey_secret,
        'sym_alg': sym_alg,
        'sym_opts': sym_opts
    };
    var tasks = [ 
            task_precheck_esk,
            task_check_args,
            task_encrypt_cleartext,
            task_get_sender_id,
            task_assemble_msg 
    ];
    var donef = function(msg){
        if(!_isExp(msg) && typeof msg==='object' && msg!==null){
            try{ msg = JSON.stringify(msg); }catch(e){}
        }
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};//function(enc_symkey_args_json, sender_ks, symkey_secret, sym_alg, sym_opts)

_message.sender.process.sign = 
function(cleartext, sender_ks, sender_ks_pass, callback, carry)
{
    var args = {
        'cleartext': cleartext,
        'sender_ks': sender_ks,
        'sender_ks_pass': sender_ks_pass
    };
    var task_check_args = function(cb, args){
        var runf = function(args){
            /* Validate cleartext */
            if(typeof args.cleartext!=='string' || args.cleartext.length<1){
                throw (new ncrypt.exception.types.simple.message.
                        message.invalidArgument());
            }
            /* Validate sender keyset */
            var ks;
            if(typeof args.sender_ks==='string'){
                if(typeof args.sender_ks_pass==='string' && 
                   args.sender_ks_pass.length>0){
                    ks = tkeyset.store.encrypt.decrypt(args.sender_ks, 
                                                       args.sender_ks_pass);
                    if(_isExp(ks)) return ks;
                }
            }else{ ks = args.sender_ks; }
            ks = new tkeyset.Keyset(ks);
            if(_isExp(ks)) return ks;
            args.sender_ks = ks;
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_sign_cleartext = function(cb, args){
        var runf = function(args){
            var ctxt = args.cleartext; // the text to sign
            var ks = args.sender_ks; // a 'Keyset' after validation
            var kp = ks.getKeypairSigning();
            var sig = new tsign.Signature(ctxt, kp);
            if(_isExp(sig)) return sig;
            args.signature = sig.getSignature();
            if(_isExp(args.signature)) return args.signature;
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_get_sender_id = function(cb, args){
        args.sender_id = args.sender_ks.getPublicKeyIDs().txt.normal+'';
        cb(args);
    };
    var task_assemble_msg = function(cb, args){
        args.msg = {
            't': _message.types.SIGN,
            'i': args.sender_id,
            'c': args.cleartext,
            's': args.signature
        };
        cb(args.msg);
    };
    var tasks = [
        task_check_args,
        task_sign_cleartext,
        task_get_sender_id,
        task_assemble_msg
    ];
    var donef = function(msg){
        if(!_isExp(msg) && typeof msg==='object' && msg!==null){
            try{ msg = JSON.stringify(msg); }catch(e){}
        }
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};
_message.sender.process.both = 
function(cleartext, enc_symkey_args, sender_ks, sender_ks_pass, 
         symkey_secret, sym_alg, sym_opts, callback, carry)
{
    var args = {
        'cleartext': cleartext,
        'enc_symkey_args': enc_symkey_args,
        'sender_ks': sender_ks,
        'sender_ks_pass': sender_ks_pass,
        'symkey_secret': symkey_secret,
        'sym_alg': sym_alg,
        'sym_opts': sym_opts
    };
    var task_encrypt_cleartext = function(cb, args){
        _message.sender.process.encrypt(
            args.cleartext, 
            args.enc_symkey_args, 
            args.sender_ks, 
            args.symkey_secret, 
            args.sym_alg, 
            args.sym_opts, 
            function(msg, c){
                if(_isExp(msg)){ cb(msg); return; }
                var args = c;
                args.msg_encrypted = msg;
                cb(args); return;
            }, 
            args
        );
    };
    var task_sign_ciphertext = function(cb, args){
        try{
            var m;
            if(typeof args.msg_encrypted === 'string'){
                m = JSON.parse(args.msg_encrypted);
            }else{ m = args.msg_encrypted; }
            var ctxt = m.c;
                ctxt = JSON.stringify(ctxt); // sign the ciphertext if the 
                                             // message is encrypted
        }catch(e){
            var exp = new SecureExec.exception.Exception(null,null,e);
            cb(exp); return;
        }
        _message.sender.process.sign(
            ctxt, 
            args.sender_ks, 
            args.sender_ks_pass, 
            function(msg, c){
                if(_isExp(msg)) return msg;
                var m_e;
                if(typeof args.msg_encrypted === 'string'){
                    m_e = JSON.parse(args.msg_encrypted);
                }else{ m_e = args.msg_encrypted; }
                if(typeof msg==='string'){
                    try{ msg = JSON.parse(msg); }catch(e){}
                }
                msg.k = m_e.k;
                msg.c = m_e.c;
                msg.t = _message.types.BOTH;
                msg = JSON.stringify(msg);
                cb(msg); return;
            }, 
            args
        );
    };
    var tasks = [
        task_encrypt_cleartext,
        task_sign_ciphertext
    ];
    var donef = function(msg){
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};

/**
 * @namespace nCrypt.asym.simple.message.sender
 * */
message.sender = {};
/**
 * @namespace nCrypt.asym.simple.message.sender.process
 * */
message.sender.process = {};

/**
 * Encrypt a message for one or more receivers.
 * @param {string} cleartext - Cleartext to encrypt. (Must be a *non-empty*
 * string.)
 * @param {object[]} enc_symkey_args - Array of objects. Either an array of 
 * arguments 
 * for {@link nCrypt.asym.types.simple.message.symkey.sender.arr.createEncryptedSymkeyArray},
 * an array resulting from this function, or a JSON object array like returned
 * from {@link nCrypt.asym.types.simple.message.symkey.sender.arr.symkeyArrayJSON}.
 * The most simple arguments array would be an array of objects 
 * like { 'public_keyset': receiver_public_keyset }, resulting in ECIES shared
 * secrets being calculated for each receiver.
 * @param {string} sender_ks - Sender keyset, i.e. your local keyset. (No 
 * password is required even if @sender_ks is encrypted, as only the public
 * key will be used to attach it's ID to the message.)
 * @param {string|nCrypt.asym.types.basic.secret.Secret} skey - `Secret` or 
 * serialized secret. The serialized value will be used to encrypt the actual 
 * message. Do not pass a password here, if using a password, create a `Secret` 
 * using the password as a string value.
 * @param {string} sym_alg - Symmetric algorithm to use for encryption.
 * @param {object} [sym_opts] - Symmetric encryption options, `null` or `{}` 
 * for defaults.
 * @param {function} callback - function([object|SecureExec.exception.exception]
 * msg, [*] carry). `msg` is a JSON string, stringify to send over the network.
 * @param {*} carry
 * @name encrypt
 * @function
 * @memberof nCrypt.asym.simple.message.sender.process
 * */
message.sender.process.encrypt = 
function(cleartext, enc_symkey_args, sender_ks, 
         symkey_secret, sym_alg, sym_opts, callback, carry)
{
    _message.sender.process.encrypt(cleartext, enc_symkey_args, sender_ks, 
         symkey_secret, sym_alg, sym_opts, callback, carry);
    return;
};

/**
 * Sign a message. (The message will NOT be encrypted, only signed.)
 * @param {string} cleartext
 * @param {string} sender_ks - Sender keyset, usually your local keyset. 
 * Private parts are required for signing.
 * @param {string} sender_ks_pass - If @sender_ks is encrypted, pass the 
 * password along. Otherwise, pass `null`.
 * @param {function} callback - function([object|SecureExec.exception.exception]
 * msg, [*] carry). `msg` is a JSON string, stringify to send over the network.
 * @param {*} carry
 * @name sign
 * @function
 * @memberof nCrypt.asym.simple.message.sender.process
 * */
message.sender.process.sign = 
function(cleartext, sender_ks, sender_ks_pass, callback, carry)
{
    _message.sender.process.sign(cleartext, sender_ks, sender_ks_pass, callback, carry);
    return;
};
/**
 * Encrypt and sign a message. (The signature will be created for the 
 * ciphertext, not for the cleartext.)
 * @param {string} cleartext - Cleartext to encrypt. (Must be a *non-empty*
 * string.)
 * @param {object[]} enc_symkey_args - Array of objects. Either an array of 
 * arguments 
 * for {@link nCrypt.asym.types.simple.message.symkey.sender.arr.createEncryptedSymkeyArray},
 * an array resulting from this function, or a JSON object array like returned
 * from {@link nCrypt.asym.types.simple.message.symkey.sender.arr.symkeyArrayJSON}.
 * The most simple arguments array would be an array of objects 
 * like { 'public_keyset': receiver_public_keyset }, resulting in ECIES shared
 * secrets being calculated for each receiver.
 * @param {string} sender_ks - Sender keyset, i.e. your local keyset. (Private
 * parts are required for signing.)
 * @param {string} sender_ks_pass - If @sender_ks is encrypted, pass the 
 * decryption password, otherwise pass `null`.
 * @param {string|nCrypt.asym.types.basic.secret.Secret} skey - Secret or 
 * serialized secret. The serialized value will be used to encrypt the actual 
 * message. Do not pass a password here, if using a password, create a `Secret` 
 * using the password as a string value.
 * @param {string} sym_alg - Symmetric algorithm to use for encryption.
 * @param {object} [sym_opts] - Symmetric encryption options, `null` or `{}` 
 * for defaults.
 * @param {function} callback - function([object|SecureExec.exception.exception]
 * msg, [*] carry). `msg` is a JSON string, stringify to send over the network.
 * @param {*} carry
 * @name both
 * @function
 * @memberof nCrypt.asym.simple.message.sender.process
 * */
message.sender.process.both = 
function(cleartext, enc_symkey_args, sender_ks, sender_ks_pass, 
         symkey_secret, sym_alg, sym_opts, callback, carry)
{
    _message.sender.process.both(cleartext, enc_symkey_args, 
                         sender_ks, sender_ks_pass, 
                         symkey_secret, sym_alg, sym_opts, 
                         callback, carry);
    return;
};

_message.receiver = {};
_message.receiver.info = {};
_message.receiver.info.getType = function(msg){
    var runf = function(){
        if(typeof msg==='string'){
            try{ msg = JSON.parse(msg); }
            catch(e){ msg = null; }
        }
        if(typeof msg!=='object' || msg===null || msg==={}){
            throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
        }
        var t = msg.t;
        if(typeof t!=='number' || _message.typesArray.indexOf(t)<0 ){
            throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
        }
        return t;
    };
    return SecureExec.sync.apply(runf, [msg]);
};
_message.receiver.info.getSenderID = function(msg){
    var runf = function(){
        if(typeof msg==='string'){
            try{ msg = JSON.parse(msg); }
            catch(e){ msg = null; }
        }
        if(typeof msg!=='object' || msg===null || msg==={}){
            throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
        }
        var i = msg.i;
        if(typeof i!=='string' || i.length<1 ){
            throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
        }
        return i;
    };
    return SecureExec.sync.apply(runf, [msg]);
};
_message.receiver.info.isEncrypted = function(msg){
    var t = _message.receiver.info.getType(msg);
    if(_isExp(t)) return t;
    if(t!==_message.types.SIGN){
        return true;
    }
    return false;
};
_message.receiver.info.getEncryptedSymkey = 
function(msg, local_keyset /*, local_keyset_pass*/ ){
    var runf = function(msg, local_keyset /*, local_keyset_pass*/){
        /* Get local keyset */
        /*var ks; var lks;
        if(typeof local_keyset==='string' && 
           typeof local_keyset_pass==='string'){
            lks = tkeyset.store.encrypt.decrypt(local_keyset, 
                                                local_keyset_pass);
            if(is_Exp(lks)) return lks;
        }else{ lks = local_keyset; }
        ks = new tkeyset.Keyset(lks);
        if(_isExp(ks)) return ks;*/
        
        /* Get encrypted symkey array */
        var t = _message.receiver.info.getType(msg);
        if(_isExp(t)) return t;
        if(t===_message.types.SIGN){
            throw (new ncrypt.exception.types.simple.message.message.
                messageIsNotEncrypted());
        }
        if(typeof msg==='string'){
            try{ msg = JSON.parse(msg); }
            catch(e){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
        }
        var sks = msg.k;
        if(typeof sks!=='object' || !Array.isArray(sks)){
            throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
        }
        
        /* Get the symmetric key object for own keyset */
        var esk = tsymkey.receiver.arr.extractItem(sks, local_keyset);
        return esk;
    };
    return SecureExec.sync.apply(runf, 
        [msg, local_keyset/*, local_keyset_pass*/]);
};

/**
 * @namespace nCrypt.asym.simple.message.receiver
 * */
message.receiver = {};
/**
 * @namespace nCrypt.asym.simple.message.receiver.info
 * */
message.receiver.info = {};

/**
 * Get the message type, which is an integer, representing encrypted, signed,
 * or both.
 * @returns {number|SecureExec.exception.exception}
 * @function
 * @name getType
 * @memberof nCrypt.asym.simple.message.receiver.info
 * */
message.receiver.info.getType = function(msg){
    return _message.receiver.info.getType(msg);
};
/**
 * Return the sender keyset's ID. The ID is a text ID of normal length, i.e.
 * retrieved using (keyset).getPublicKeyIDs.txt.normal.
 * @returns {string|SecureExec.exception.exception}
 * @function
 * @name getSenderID
 * @memberof nCrypt.asym.simple.message.receiver.info
 * */
message.receiver.info.getSenderID = function(msg){
    return _message.receiver.info.getSenderID(msg);
};
/**
 * Check whether a message is encrypted.
 * @param {string} msg
 * @returns {boolean|SecureExec.exception.exception}
 * @name isEncrypted 
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.info
 * */
message.receiver.info.isEncrypted = function(msg){
    return _message.receiver.info.isEncrypted(msg);
};
/**
 * From an encrypted message, get the encrypted symmetric key object (JSON
 * object) for a certain keyset. If the message wasn't encrypted for this 
 * keyset, `null` is returned.
 * @param {string} msg
 * @param {string} local_keyset
 * @returns {object|SecureExec.exception.exception}
 * @name getEncryptedSymkey
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.info
 * */
message.receiver.info.getEncryptedSymkey = function(msg, local_keyset){
    return _message.receiver.info.getEncryptedSymkey(msg, local_keyset);
};

_message.receiver.process = {};
_message.receiver.process.decrypt = 
function(
    msg, 
    local_keyset, local_keyset_pass, 
    sender_ks, shared_secret, 
    callback, carry)
{
    var args = {
        'msg': msg,
        'local_keyset': local_keyset,
        'local_keyset_pass': local_keyset_pass,
        'sender_ks': sender_ks,
        'shared_secret': shared_secret
    };
    var task_check_args = function(cb, args){
        var runf = function(args){
            /* Check args.msg */
            var t = _message.receiver.info.getType(msg);
            if(_isExp(t)) return t;
            if(t===_message.types.SIGN){
                throw (new ncrypt.exception.types.simple.message.message.
                    messageIsNotEncrypted());
            }
            if(typeof args.msg==='string'){
                try{
                    args.msg = JSON.parse(args.msg);
                }catch(e){
                    throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
                }
            }
            /* Check args.local_keyset */
            if(typeof args.local_keyset==='string' &&
               typeof args.local_keyset_pass==='string'){
                   args.local_keyset = 
                    tkeyset.store.encrypt.decrypt(args.local_keyset,
                                                  args.local_keyset_pass);
            }
            args.lks = new tkeyset.Keyset(args.local_keyset);
            if(_isExp(args.lks)) return args.lks;
            /* Check args.sender_ks */
            if(typeof args.sender_ks!=='undefined' &&
               !(typeof args.sender_ks==='object' && args.sender_ks===null)){
                if(typeof args.sender_ks==='string'){
                    args.sender_ks = tkeyset.pub.getPublicKeyset(
                        args.sender_ks);
                }
                args.sks = new tkeyset.Keyset(args.sender_ks);
                if(_isExp(args.sks)) return args.sks;
            }else{ args.sks = null; }
            /* Check args.shared_secret */
            if(typeof args.shared_secret!=='undefined' &&
               !(typeof args.shared_secret==='object' && 
                 args.shared_secret===null)){
                if(typeof args.shared_secret!=='object'){
                    throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
                }
                if(args.shared_secret instanceof tsecret.Secret ||
                   args.shared_secret instanceof tdh.SecretDH ||
                   args.shared_secret instanceof tecies.SecretECIES){
                    args.shared_secret = args.shared_secret.getSecretValue();
                }else{
                    throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
                }
                if(typeof args.shared_secret!=='string'){
                    throw (new ncrypt.exception.types.simple.message.message.
                        invalidArgument());
                }
                args.shared_secret = new tsecret.Secret(tsecret.source.SECRET,
                                        args.shared_secret);
                if(_isExp(args.shared_secret)) return args.shared_secret;
                args.shared_secret = args.shared_secret.getSecretValue();
            }else{ args.shared_secret=null; }
            return args;
        };
        // args.lks (instance of 'Keyset'), args.sks (instance of 'Keyset'),
        // args.shared_secret (serialized 'Secret', string)
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_get_encrypted_symkey = function(cb, args){
        var runf = function(args){
            var ks = args.lks.getSerialized();
            args.encsk = 
                _message.receiver.info.getEncryptedSymkey(args.msg, ks);
            if(_isExp(args.encsk)){ return args.encsk; }
            if(typeof args.encsk==='object' && args.encsk===null) return null;
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_restore_shared_secret = function(cb, args){
        var runf = function(args){
            if(typeof args.shared_secret === 'string'){
                return args;
            }
            var stype; try{ stype = args.encsk.t; }catch(e){ stype = null; }
            if(typeof stype!=='string'){
                throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
            }
            if(stype === 'dh'){
                if(args.sks === null){
                    throw (new ncrypt.exception.types.simple.message.
                        message.missingSenderKeyset());
                }
                if(!args.sks.hasEncryptionKeypair() || 
                   !args.lks.hasEncryptionKeypair()){
                    throw (new ncrypt.exception.types.simple.message.
                        message.missingEncryptionKeypair());
                }
                var kp_loc = args.lks.getKeypairEncryption();
                var kp_pub = args.sks.getKeypairEncryption();
                args.shared_secret = new tdh.SecretDH(kp_loc, kp_pub);
            }else if(stype === 'ecies'){
                var tag; try{ tag = args.encsk.tag; }catch(e){ tag = null; }
                if(typeof tag!=='object'){
                    throw (new ncrypt.exception.types.simple.message.
                        message.malformedMessage());
                }
                try{
                    tag = JSON.stringify(tag);
                }catch(e){
                    throw (new ncrypt.exception.types.simple.message.
                        message.malformedMessage());
                }
                var kp = args.lks.getKeypairEncryption();
                if(kp===null){ 
                    throw (new ncrypt.exception.types.simple.message.
                        message.missingEncryptionKeypair());
                }
                args.shared_secret = new tecies.SecretECIES(kp, tag);
            }else{
                throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
            }
            if(_isExp(args.shared_secret)) return args.shared_secret;
            args.shared_secret = args.shared_secret.getSecretValue();
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_decrypt_symkey = function(cb, args){
        var runf = function(args){
            var esk = args.encsk;
            var sec = args.shared_secret;
            var skey = new tsymkey.receiver.EncSymkeyReceiver(esk, sec);
            if(_isExp(skey)) return skey;
            var sym_key = skey.getDecryptedSymkey();
            if(typeof sym_key!=='string' || sym_key.length<1){
                throw (new nCrypt.exception.types.simple.message.message.
                    cannotDecryptSymkey());
            }
            args.skey = sym_key+'';
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_decrypt_message = function(cb, args){
        var ciphertext = args.msg.c;
        if(typeof ciphertext === 'object'){
            try{
                ciphertext = JSON.stringify(ciphertext);
            }catch(e){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
        }
        ncrypt.sym.async.decrypt(ciphertext, args.skey, function(res, c){
            var args = c.a; var cb = c.c;
            if(_isExp(res)){ cb(res); return; }
            cb(res); return; 
        }, { 'a': args, 'c': cb });
    };
    var tasks = [
        task_check_args,
        task_get_encrypted_symkey,
        task_restore_shared_secret,
        task_decrypt_symkey,
        task_decrypt_message
    ];
    var donef = function(msg){
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                if(typeof res==='object' && res===null){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};
_message.receiver.process.verify = 
function(msg, sender_ks, callback, carry)
{
    var args = {
        'msg': msg,
        'sender_ks': sender_ks
    };
    var task_check_args = function(cb, args){
        var runf = function(args){
            /* Check args.msg */
            var t = _message.receiver.info.getType(msg);
            if(_isExp(t)) return t;
            if(t===_message.types.ENCRYPT){
                throw (new ncrypt.exception.types.simple.message.message.
                    messageIsNotSigned());
            }
            if(typeof args.msg==='string'){
                try{
                    args.msg = JSON.parse(args.msg);
                }catch(e){
                    throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
                }
            }
            /* Check args.sender_ks */
            if(typeof args.sender_ks==='string'){
                args.sender_ks = tkeyset.pub.getPublicKeyset(
                    args.sender_ks);
            }
            args.sks = new tkeyset.Keyset(args.sender_ks);
            if(_isExp(args.sks)) return args.sks;
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_check_cleartext = function(cb, args){
        var runf = function(args){
            args.cleartext = args.msg.c;
            if(typeof args.cleartext==='object'){
                try{
                    args.cleartext = JSON.stringify(args.cleartext)+'';
                }catch(e){
                    throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
                }
            }
            if(typeof args.cleartext!=='string' || args.cleartext.length<1){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
            return args;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var task_verify = function(cb, args){
        var runf = function(args){
            var sks = args.sks;
            var ctxt = args.cleartext;
            var sig = args.msg.s;
            if(typeof sig!=='string' || sig.length<1){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
            if(!sks.hasSigningKeypair()){
                throw (new nCrypt.exception.types.simple.message.
                        message.missingSigningKeypair());
            }
            var kp = sks.getKeypairSigning();
            var s = new tsign.Signature(ctxt, kp, sig);
            if(_isExp(s)) return s;
            args.verified = s.getVerified();
            return args.verified;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var tasks = [
        task_check_args,
        task_check_cleartext,
        task_verify
    ];
    var donef = function(msg){
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};
_message.receiver.process.both = 
function(
    msg, 
    local_keyset, local_keyset_pass, 
    sender_ks, shared_secret, 
    callback, carry)
{
    var args_decrypt = {
        'msg': msg,
        'local_keyset': local_keyset,
        'local_keyset_pass': local_keyset_pass,
        'sender_ks': sender_ks,
        'shared_secret': shared_secret
    };
    var args_verify = {
        'msg': msg,
        'sender_ks': sender_ks
    };
    try{
        if(typeof args_verify.msg==='object'){
            args_verify.msg=JSON.stringify(args_verify.msg)+'';
        }
        if(typeof args.sender_ks==='object'){
            if(args.sender_ks instanceof tkeyset.Keyset){
                args.sender_ks = args.sender_ks.getPublicKeyset()+'';
            }
        }}
    catch(e){}
    var args = { 'decrypt': args_decrypt, 'verify': args_verify, 'res': {} };
    var task_decrypt = function(cb, args){
        _message.receiver.process.decrypt(
            args.decrypt.msg,
            args.decrypt.local_keyset,
            args.decrypt.local_keyset_pass,
            args.decrypt.sender_ks,
            args.decrypt.shared_secret,
            function(res, c){
                var args = c.a; var cb = c.c;
                if(_isExp(res)){ cb(res); return; }
                args.res.cleartext = res;
                cb(args); return;
            },
            { 'a': args, 'c': cb }
        );
    };
    var task_verify = function(cb, args){
        _message.receiver.process.verify(
            args.verify.msg,
            args.verify.sender_ks,
            function(ver, c){
                var args = c.a; var cb = c.c;
                //if(_isExp(ver)){ cb(ver); return; }
                args.res.verified = ver;
                cb(args); return;
            },
            { 'a': args, 'c': cb }
        );
    };
    var task_result = function(cb, args){
        var runf = function(args){
            var res = {};
            res.cleartext = args.res.cleartext;
            res.verified = args.res.verified;
            return res;
        };
        args = SecureExec.sync.apply(runf, [ args ]);
        cb(args);
    };
    var tasks = [ task_decrypt, task_verify, task_result ];
    var donef = function(msg){
        callback(msg, carry);
    };
    var iterate_tasks = function(tasks, args){
        if(tasks.length<1){ donef(args); return; }
        var t = tasks.shift();
        setTimeout(function(){
            t(function(res){
                if(_isExp(res)){ donef(res); return; }
                iterate_tasks(tasks.slice(0), res); return;
            }, args);
        }, 0);
    };
    iterate_tasks(tasks.slice(0), args);
};

_message.receiver.process.knownKey = {};
_message.receiver.process.knownKey.decrypt = 
function(msg, skey, callback, carry){
    var get_ciphertext = function(msg){
        var t = _message.receiver.info.getType(msg);
        if(_isExp(t)) return t;
        if(t===_message.types.SIGN){
            throw (new ncrypt.exception.types.simple.message.message.
                messageIsNotEncrypted());
        }
        if(typeof msg==='string'){
            try{ msg = JSON.parse(msg); }catch(e){ msg = null; }
            if(typeof msg==='undefined' || msg===null){
                throw (new ncrypt.exception.types.simple.message.message.
                    malformedMessage());
            }
        }
        var ciphertext = msg.c;
        if(typeof ciphertext!=='object'){
            throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
        }
        try{
            ciphertext = JSON.stringify(ciphertext);
        }catch(e){
            throw (new ncrypt.exception.types.simple.message.message.
                malformedMessage());
        }
        return ciphertext;
    };
    var get_skey = function(skey){
        if(typeof skey!=='string'){
            if(typeof skey!=='object' || skey===null ||
               typeof skey.getSecretValue!=='function'){
                throw (new ncrypt.exception.types.simple.message.
                        message.invalidArgument());
            }
            skey = skey.getSecretValue();
        }
        return skey;
    };
    var _ciphertext = SecureExec.sync.apply(get_ciphertext, [ msg ]);
    if(_isExp(_ciphertext)) return _ciphertext;
    var _skey = SecureExec.sync.apply(get_skey, [ skey ]);
    if(_isExp(_skey)) return _skey;
    ncrypt.sym.async.decrypt(_ciphertext, _skey, function(dec, c){
        c.c(dec, c.ca); return;
    }, { 'c': callback, 'ca': carry });
};
_message.receiver.process.knownKey.both = 
function(msg, skey, sender_ks, callback, carry)
{
    var args = {
        'msg': msg, 'skey': skey, 'sender_ks': sender_ks,
        'cb': callback, 'ca': carry
    };
    _message.receiver.process.knownKey.decrypt(args.msg, args.skey,
    function(dec,c){
        args.res = {}; args.res.cleartext = dec;
        _message.receiver.process.verify(args.msg, args.sender_ks,
        function(ver, c){
            var res = {};
            res.cleartext = args.res.cleartext;
            res.verified = ver;
            args.cb(res, args.ca);
        }, args);
    }, args);
};

/**
 * @namespace nCrypt.asym.simple.message.receiver.process
 * */
message.receiver.process = {};

/**
 * Decrypt an encrypted message.
 * @param {string} msg - Message to decrypt.
 * @param {string} local_keyset - Local keyset, private information is required.
 * @param {string} local_keyset_pass - If @local_keyset is encrypted, pass 
 * the decryption password here, otherwise `null`.
 * @param {string} sender_ks - Pass the sender's (public) keyset here. If not
 * available, pass `null`. The @sender_ks is required if a shared secret of a
 * DH type needs to be recovered.
 * @param {string|nCrypt.asym.types.basic.secret.Secret|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} shared_secret - Known 
 * shared secret (will be derived from sender keyset and local keyset if 
 * none passed).
 * @param {function} - function([string|SecureExec.exception.Exception] 
 * cleartext, [*] carry)
 * @param {*} carry
 * @name decrypt
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.process
 * */
message.receiver.process.decrypt = 
function(
    msg, 
    local_keyset, local_keyset_pass, 
    sender_ks, shared_secret, 
    callback, carry)
{
    _message.receiver.process.decrypt(
        msg, 
        local_keyset, local_keyset_pass, 
        sender_ks, shared_secret, 
        callback, carry
    );
};

/**
 * Verify a signature's message.
 * @param {string} msg - Message to verify signature of.
 * @param {string} sender_ks - Sender's (public) keyset.
 * @param {function} - function([boolean] verified, [*] carry)
 * @param {*} carry
 * @name verify
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.process
 * */
message.receiver.process.verify = 
function(msg, sender_ks, callback, carry)
{
    _message.receiver.process.verify(msg, sender_ks, callback, carry);
};

/**
 * Decrypt an encrypted message and verify it's signature.
 * @param {string} msg - Message to decrypt.
 * @param {string} local_keyset - Local keyset, private information is required.
 * @param {string} local_keyset_pass - If @local_keyset is encrypted, pass 
 * the decryption password here, otherwise `null`.
 * @param {string} sender_ks - Sender's (public) keyset. (Required
 * for signature verification.)
 * @param {string|nCrypt.asym.types.basic.secret.Secret|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} shared_secret - Known 
 * shared secret (will be derived from sender keyset and local keyset if not passed).
 * @param {function} - function([string|SecureExec.exception.Exception] 
 * obj, [*] carry), with `obj` being an object like { 'cleartext': [string] 
 * cleartext, 'verified': [boolean] verified }.
 * @param {*} carry
 * @name both
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.process
 * */
message.receiver.process.both = 
function(
    msg, 
    local_keyset, local_keyset_pass, 
    sender_ks, shared_secret, 
    callback, carry)
{
    _message.receiver.process.both(
        msg, 
        local_keyset, local_keyset_pass, 
        sender_ks, shared_secret, 
        callback, carry
    );
};

/**
 * @namespace nCrypt.asym.simple.message.receiver.process.knownKey
 * */
message.receiver.process.knownKey = {};
/**
 * Decrypt a message when the symmetric key is known.
 * @param {string} msg - Message to decrypt. (The message, not the ciphertext
 * only.)
 * @param {string|nCrypt.asym.types.basic.secret.Secret} skey - Known symmetric 
 * key. If passing a string, it is treated as a serialized `Secret`. If you 
 * have a password etc., (i.e. not a serialized `Secret`), create secret (in
 * case of a password, from a string source), before passing it.
 * @param {function} callback - function([string|SecureExec.exception.Exception]
 * cleartext, [*] carry)
 * @param {*} carry
 * @name decrypt
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.process.knownKey
 * */
message.receiver.process.knownKey.decrypt = 
function(msg, skey, callback, carry)
{
    _message.receiver.process.knownKey.decrypt(msg, skey, callback, carry);
};
/**
 * Decrypt and verify message when the symmetric key is known.
 * @param {string} msg - Message to decrypt and verify. 
 * @param {string|nCrypt.asym.types.basic.secret.Secret} skey - Known symmetric 
 * key. If passing a string, it is treated as a serialized `Secret`. If you 
 * have a password etc., (i.e. not a serialized `Secret`), create secret (in
 * case of a password, from a string source), before passing it.
 * @param {string} sender_ks - Sender's keyset to verify the signature.
 * @param {function} - function([string|SecureExec.exception.Exception] 
 * obj, [*] carry), with `obj` being an object like { 'cleartext': [string] 
 * cleartext, 'verified': [boolean] verified }.
 * @param {*} carry
 * @name decrypt
 * @function
 * @memberof nCrypt.asym.simple.message.receiver.process.knownKey
 * */
message.receiver.process.knownKey.both = 
function(msg, skey, sender_ks, callback, carry)
{
    _message.receiver.process.knownKey.both(
        msg, skey, sender_ks, callback, carry);
};

return message });

},{}],41:[function(require,module,exports){

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
 * @namespace nCrypt.asym.simple.secret
 * */
var  secret = {};
var _secret = {};

var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var tsecret = dep.types.basic.secret;
var tdh = dep.types.shared.dh;
var tecies = dep.types.shared.ecies;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.simple.secret.dh
 * */
 secret.dh = {};
_secret.dh = {};

/**
 * Derive a shared secret for two keysets (these keysets need to support 
 * encryption, i.e. not be signing-only keysets).
 * <br />
 * Please note: DH shared secret derivation only works if both local and public
 * key are on the same curve. I.e., public keyset and local keyset must use
 * the same curve for encryption purposes.
 * <br />
 * This function returns the shared secret as a string. (The shared secret is a
 * serialized instance of {@link nCrypt.asym.types.basic.secret.Secret}.)
 * @param {string} public_keyset 
 * @param {string} local_keyset
 * @param {string} local_keyset_pass - Password to decrypt @local_keyset's 
 * private parts.
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name derive
 * @memberof nCrypt.asym.simple.secret.dh
 * */
secret.dh.derive = function(public_keyset, local_keyset, local_keyset_pass){

    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairEncryption();

    var local_keypair = local_keyset.getKeypairEncryption();
    
    var sec = new tdh.SecretDH(local_keypair, public_keypair);
    if(_isExp(sec)) return sec;
    /*try{ sec = sec.getSerialized(); sec = JSON.parse(sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }*/
    try{ sec = sec.getSecretValue(); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    return sec;
};

/**
 * @namespace nCrypt.asym.simple.secret.ecies
 * */
secret.ecies = {};

/**
 * Derive a shared secret for a public keyset. The result will be a **shared 
 * secret** as well as a **tag**. 
 * <br />
 * The *shared secret* can be used to encrypt a message etc.
 * <br /> 
 * The *tag* needs to be sent to the receiver / owner of the public keyset.
 * Using the tag and their local keyset (private parts), they are able to 
 * recover the shared secret. 
 * <br />
 * The shared secret itself is never sent anywhere!
 * The owner of the private keyset parts belonging to the public keyset will
 * recover it using the tag, so only the receiver will be able to decrypt the
 * message.
 * <br />
 * This function returns a simple JSON object, 
 * like { 'tag': [object] tag_as_simple_json, 'sec': [string] secret }. The 
 * tag can be stringified (`JSON.stringify`) and sent along with a message to
 * the receiver.
 * @param {string} public_keyset
 * @returns {object|SecureExec.exception.Exception}
 * @name derive
 * @function
 * @memberof nCrypt.asym.simple.secret.ecies
 * */
secret.ecies.derive = function(public_keyset){
    
    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairEncryption();
    
    var ecies_sec = new tecies.SecretECIES(public_keypair);
    if(_isExp(ecies_sec)) return ecies_sec;
    /*try{ ecies_sec = ecies_sec.getSerialized(); 
         ecies_sec = JSON.parse(ecies_sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    return ecies_sec;*/
    var tag = JSON.parse(ecies_sec.getTag().getSerialized());
    var sec = ecies_sec.getSecretValue();
    var res = { 'tag': tag, 'sec': sec };
    return res;
};

/**
 * To recover a shared secret from a tag with ECIES like key derivation, pass
 * the tag received and your local keyset.
 * <br />
 * This function returns the shared secret as a string. (The shared secret is a
 * serialized instance of {@link nCrypt.asym.types.basic.secret.Secret}.)
 * @param {string} tag
 * @param {string} local_keyset
 * @param {string} local_keyset_pass
 * @returns {string|SecureExec.exception.Exception}
 * @name restore
 * @function
 * @memberof nCrypt.asym.simple.secret.ecies
 * */
secret.ecies.restore = function(tag, local_keyset, local_keyset_pass){
    
    if(typeof tag!=='string' || tag.length<1){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.eciesTagIsNotAString);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasEncryptionKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.secret.missingEncryptionKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var local_keypair = local_keyset.getKeypairEncryption();
    
    var ecies_sec = new tecies.SecretECIES(local_keypair, tag);
    if(_isExp(ecies_sec)) return ecies_sec;
    /*try{ ecies_sec = ecies_sec.getSerialized(); 
         ecies_sec = JSON.parse(ecies_sec); }
    catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }*/
    return ecies_sec.getSecretValue();
};

return secret; });

},{}],42:[function(require,module,exports){

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
 * @namespace nCrypt.asym.simple.signature
 * */
var  signature = {};
var _signature = {};
    
var tid = dep.types.basic.id;
var tkeypair = dep.types.key.keypair;
var tkeyset = dep.types.simple.keyset;
var tsign = dep.types.signature.ecdsa; // tsign.Signature
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * Sign a message using your local keyset. Returns the signature string to 
 * send along with the message to a receiver can verify the message was signed
 * using your keyset.
 * @param {string} cleartext - Cleartext to sign.
 * @param {string} local_keyset - Keyset to use for signing.
 * @param {string} local_keyset_pass - Password for @local_keyset
 * @returns {string|SecureExec.exception.Exception}
 * @function
 * @name sign
 * @memberof nCrypt.asym.simple.signature
 * */
signature.sign = function(cleartext, local_keyset, local_keyset_pass){
    
    local_keyset = tkeyset.store.encrypt.decrypt(local_keyset, 
        local_keyset_pass);
    if(_isExp(local_keyset)) return local_keyset;
    
    local_keyset = new tkeyset.Keyset(local_keyset);
    if(_isExp(local_keyset)) return local_keyset;
    if(!local_keyset.hasSigningKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.signature.missingSigningKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var local_keypair = local_keyset.getKeypairSigning();
    
    var sig = new tsign.Signature(cleartext, local_keypair);
    if(_isExp(sig)) return sig;
    sig = sig.getSignature();
    return sig;
};

/**
 * Verify a signed message, using the message cleartext, the sender's public
 * keyset and the signature.
 * @param {string} cleartext
 * @param {string} public_keyset
 * @param {string} sig
 * @returns {boolean|SecureExec.exception.Exception}
 * @function
 * @name verify
 * @memberof nCrypt.asym.simple.signature
 * */
signature.verify = function(cleartext, public_keyset, sig){
    if(typeof sig!=='string' || sig.length<1){
        var e = ncrypt.exception.Create(
            nCrypt.exception.asym.simple.signature.signatureNotAString);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    public_keyset = tkeyset.pub.getPublicKeyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    
    public_keyset = new tkeyset.Keyset(public_keyset);
    if(_isExp(public_keyset)) return public_keyset;
    if(!public_keyset.hasSigningKeypair()){
        var e = ncrypt.exception.Create(
            ncrypt.exception.asym.simple.signature.missingSigningKeypair);
        return (new SecureExec.exception.Exception(null,null,e));
    }
    
    var public_keypair = public_keyset.getKeypairSigning();
    
    var sig_ver = new tsign.Signature(cleartext, public_keypair, sig);
    if(_isExp(sig_ver)) return sig_ver;
    
    return sig_ver.getVerified();
};

return signature });

},{}],43:[function(require,module,exports){

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
 * @namespace nCrypt.asym.types.basic
 * */
var  basic = {};
var _basic = {};

basic.bn = require('./types/bn.js');
basic.bn = basic.bn(ncrypt, {});
basic.secret = require('./types/secret.js');
basic.secret = basic.secret(ncrypt, { "basic": { "bn": basic.bn } });
basic.point = require('./types/point.js');
basic.point = basic.point(ncrypt, { "basic": { "bn": basic.bn } });
basic.id = require('./types/id.js');
basic.id = basic.id(ncrypt, { });

return basic; });

},{"./types/bn.js":44,"./types/id.js":45,"./types/point.js":46,"./types/secret.js":47}],44:[function(require,module,exports){

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

module.exports = (function(ncrypt, types){

var SecureExec = ncrypt.dep.SecureExec;
var bnjs = ncrypt.dep.bnjs;

/**
 * @namespace nCrypt.asym.types.basic.bn
 * */
var  bn= {};
var _bn = {};

_bn.create = {};
_bn.create.bnObject = function(bn, base){
    var bnf = bnjs.BN;
    var runf = function(bn, base){
        if(typeof base==="undefined"){
            return new bnf(bn);
        }else{
            return new bnf(bn, base);
        }
    };
    return SecureExec.sync.apply(runf, [bn, base]);
};

_bn.validate = {};
_bn.validate.isBnObject = function(obj){
    var check = function(obj){
        if(typeof obj!=="object" || obj===null) return false;
        if(typeof obj.words==="undefined" || Array.isArray(obj.words)!==true){
            return false;
        }
        try{
            var str1 = obj.toString(32);
            var str2 = new bnjs.BN(obj, 32).toString(32);
            if((typeof str1==="string" && typeof str2==="string") &&
               (str1.length>0 && str2.length>0) &&
               (str1===str2)){
                return true;
            }
        }catch(e){ return false; }
    };
    try{ return check(obj); }catch(e){ return false; }
};

_bn.serialize = {};
_bn.serialize.serialize = function(bn_obj){
    var check_is_bn = function(bn_obj){
        return _bn.validate.isBnObject(bn_obj);
    };
    var to_string = function(bn_obj){
        var str = bn_obj.toString(32);
        return str;
    };
    var run_bn_check = function(bn_obj){
        if(check_is_bn(bn_obj)!==true){
            throw new ncrypt.exception.types.basic.bn.noBigNumberObject();
        }
        return true;
    };
    var bn_valid = SecureExec.sync.apply(run_bn_check, [bn_obj]);
    if(ncrypt.dep.SecureExec.tools.proto.inst.isException(bn_valid)){
        return bn_valid;
    }
    var str = SecureExec.sync.apply(to_string, [bn_obj]);
    return str;
};
_bn.serialize.deserialize = function(bn_str){
    var check_str = function(bn_str){
        if(typeof bn_str!=="string" || bn_str.length<1){
            throw new nCrypt.exception.types.basic.bn.noBigNumberString();
        }
        return true;
    };
    var str_valid = SecureExec.sync.apply(check_str, [bn_str]);
    if(typeof str_valid!=="boolean" || str_valid!==true) return str_valid;
    
    var to_bn = function(str){
        var bn_obj = _bn.create.bnObject(str, 32);
        return bn_obj;
    };
    var bn_obj = SecureExec.sync.apply(to_bn, [bn_str]);
    if(ncrypt.dep.SecureExec.tools.proto.inst.isException(bn_obj)){
        bn_obj = ncrypt.exception.Create(
                    ncrypt.exception.types.basic.bn.noBigNumberString);
    }
    return bn_obj;
};

/**
 * Create an instance of {@link nCrypt.asym.types.basic.bn.BigNumber}. 
 * This function either creates a `BigNumber` object from an instance of 
 * `nCrypt.dep.bnjs.BN`, from a string representing an instance of `bnjs.BN`, 
 * from an instance of `BigNumber`, or from parameters for `bnjs.BN`.
 * @param {object|string|number} bn - If @base is not passed, @bn must either
 * be an instance of `bnjs.BN`, or an instance of this class, or a string 
 * representing an instance of `nCrypt.dep.bnjs.BN`. If @base is passed, @bn 
 * must either be a string or number to create an instance of `bnjs.BN` as 
 * in `nCrypt.dep.bnjs.BN(@bn, @base)`.
 * @param {number} [base] - If @bn is a string or number to create a new 
 * instance of `nCrypt.dep.bnjs.BN` from, this is the @base to use for the 
 * resulting number. For example, @base is 10 for decimal numbers or 16 for 
 * hexadecimal.
 * @class
 * @name BigNumber
 * @memberof nCrypt.asym.types.basic.bn
 * */
var BigNumber = function(bn, base){
    var _bn_str = {};
    var _bn_obj = {};
    /* Get _bn_str and _bn_obj if @bn is an instance of this class */
    
    var isBnInst = SecureExec.tools.proto.inst.isInstanceOf(bn, BigNumber);
    if(isBnInst===true){
        //if(bn instanceof BigNumber){
        _bn_obj = bn.getDeserialized();
        _bn_str = bn.getSerialized();
    }
    /* Get _bn_str and _bn_obj if @bn is a BN representation */
    else if(typeof base==="undefined" && !isBnInst){
        if(typeof bn==="string"){
            _bn_obj = _bn.serialize.deserialize(bn);
            if(SecureExec.tools.proto.inst.isException(_bn_obj)){
                return _bn_obj;
            }
            _bn_str = bn;
        }else if(typeof bn==="object"){
            _bn_str = _bn.serialize.serialize(bn);
            if(SecureExec.tools.proto.inst.isException(_bn_str)){
                return _bn_str;
            }
            _bn_obj = bn;
        }else{
            var err = ncrypt.exception.Create(
                            ncrypt.exception.types.basic.bn.invalidArgument);
            var exp = new SecureExec.exception.Exception(null, null, err);
            return exp;
        }
    }
    /* Get _bn_str and _bn_obj if @bn is an argument to create a bnjs.BN from */
    else{
        _bn_obj = _bn.create.bnObject(bn, base);
        if(SecureExec.tools.proto.inst.isException(_bn_obj)){
            return _bn_obj;
        }
        _bn_str = _bn.serialize.serialize(_bn_obj);
        if(SecureExec.tools.proto.inst.isException(_bn_str)){
            return _bn_str;
        }
    }
    
    /**
     * Get the serialized representation of the instance of nCrypt.dep.bnjs.BN 
     * internally stored.
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.getSerialized = function(){
        var bn = _bn_str+"";
        return bn;
    };
    /**
     * Get the instance of nCrypt.dep.bnjs.BN internally stored. (This 
     * function returns a clone of the BN instance, so changing the returned 
     * instance of BN will not affect the stored one.)
     * @returns {object}
     * @name getDeserialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.getDeserialized = function(){
        var bn = new bnjs.BN(_bn_obj);
        return bn;
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.bn.BigNumber}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.bn.BigNumber#
     * */
    this.clone = function(){
        var inst = new BigNumber(_bn_str);
        return inst;
    };
};
bn.BigNumber = BigNumber;

return bn; });

},{}],45:[function(require,module,exports){

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

module.exports = (function(ncrypt, types){

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.basic.id
 * */
var  id = {};
var _id = {};

_id.create = {};
_id.create.from = {};
_id.create.from.str = function(str, hash, enc, mod){
    var gen_hash = function(str, hash, enc){
        if(typeof str!=='string' || 
           typeof hash!=='string' || 
           typeof enc!=='string'){
            throw new ncrypt.exception.types.basic.id.invalidArgument();
        }
        var encs = [ 'hex', 'base32', 'base64', 'base64url' ];
        if(encs.indexOf(enc)<0){
            throw new ncrypt.exception.types.basic.id.invalidEncoding();
        }
        var h = ncrypt.hash.hash(str, hash, enc);
        return h;
    };
    var mod_len = function(h, mod){
        if(typeof mod!=='number' && typeof mod!=='undefined'){
            throw new ncrypt.exception.types.basic.id.invalidArgument();
        }
        if(typeof mod==='undefined' || mod===0) return h;
        while( (h.length % mod) !== 0){
            h += '0';
        }
        return h;
    };
    var h = SecureExec.sync.apply(gen_hash, [ str, hash, enc ]);
    if(_isExp(h)) return h;
        h = SecureExec.sync.apply(mod_len, [ h, mod ]);
    return h;
};

/**
 * Create an object representing the ID of a string value. An ID is essentially 
 * a hash (which is represented as a string). The hash function and output 
 * encoding are required (only string encodings, i.e. encodings which result
 * in a string, and are not 'utf8', will work).
 * <br />
 * If the hash length should be divisible by a certain number (so it can be
 * split into equal pieces of a certain length), @mod should be specified. 
 * @param {string} val - Original text to get an ID for.
 * @param {string} hash - Hash algorithm, see {@link nCrypt.hash}
 * @param {string} enc - Encoding, see {@link nCrypt.enc}, with the restriction
 * only encodings which result in a string and are not 'utf8' are allowed.
 * @param {number} [mod]
 * @class
 * @name ID
 * @memberof nCrypt.asym.types.basic.id
 * */
var ID = function(val, hash, enc, mod){
    var _ids; var _hash; var _enc; var _mod; var _str;
    
    if(typeof mod==='number' && mod < 0) mod = 0;
    if(typeof val==='string'){
        _ids = _id.create.from.str(val, hash, enc, mod);
        if(_isExp(_ids)) return _ids;
        _hash = hash;
        _enc = enc;
        _str = val;
        if ( typeof mod==='number' ){
            _mod = mod;
        }else{
            _mod = 0;
        }
    }else if(SecureExec.tools.proto.inst.isInstanceOf(val, ID)===true){
        return val.clone();
    }else{
        var e = ncrypt.exception.Create(
                ncrypt.exception.types.basic.id.invalidArgument);
        var exp = new SecureExec.exception.Exception(null, null, e);
        return exp;
    }
    
    /**
     * @name getMod
     * @returns {number}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getMod = function(){
        return (_mod+0);
    };
    /**
     * @name getEnc
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getEnc = function(){
        return _enc+'';
    };
    /**
     * @name getHash
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getHash = function(){
        return _hash+'';
    };
    /**
     * @name getOriginalString
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getOriginalString = function(){
        return _str+'';
    };
    /**
     * @name getIdValue
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getIdValue = function(){
        return _ids+'';
    };
    /**
     * @name getIdSplit
     * @returns {string[]}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.getIdSplit = function(){
        var mod = _mod+0;
        if(mod===0) return _ids+'';
        var str = _ids+'';
        var res = [];
        while(str.length > 0){
            var r = str.slice(0, mod);
            str = str.replace(r, '');
            res.push(r);
        }
        return res;
    };
    /**
     * @name clone
     * @returns {nCrypt.asym.types.basic.id.ID}
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.id.ID#
     * */
    this.clone = function(){
        return new ID(_str, _hash, _enc, _mod);
    };
};
id.ID = ID;

return id; });

},{}],46:[function(require,module,exports){

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

module.exports = (function(ncrypt, types){

// bn: types.basic.bn.BigNumber
var SecureExec = ncrypt.dep.SecureExec;
var elliptic = ncrypt.dep.elliptic;
var bnjs = ncrypt.dep.bn;

/**
 * @namespace nCrypt.asym.types.basic.point
 * */
var point = {};
var _point = {};

var _cache = {}; // cache for ec objects

_point.elliptic = {};
_point.elliptic.available = {};
_point.elliptic.available.curves = {
    "secp256k1": { "name": "secp256k1", "type": "short" },
    "curve25519": { "name": "curve25519", "type": "mont" },
    "ed25519": { "name": "ed25519", "type": "edwards" }
};
_point.elliptic.available.types = {
    "mont": { "bn": [ "x", "z" ] },
    "edwards": { "bn": [ "x", "y", "z", "t" ] },
    "short": { "bn": [ "x", "y" ] }
};
_point.elliptic.available.curveNameIsValid = function(curve){
    if(typeof curve!=="string" || curve.length<1) return false;
    if(curve==="__proto__") return false;
    if(typeof _point.elliptic.available.curves[curve] === "undefined"){
        return false;
    }
    if(typeof _point.elliptic.available.curves[curve].name!=="string" ||
       typeof _point.elliptic.available.curves[curve].type!=="string"){
        return false;
    }
    return true;
};
_point.elliptic.construct = {};
_point.elliptic.construct.point = {};
_point.elliptic.construct.point.bnArgsFromPoint = function(obj, curve){
    if(typeof obj!=="object" || obj===null){
        throw new ncrypt.exception.types.basic.point.invalidArgument();
    }
    var bns = { "x": null, "y": null, "z": null, "t": null };
    var bn_json = {};
    for(var k in bns){
        if(typeof obj[k]!=="undefined"){
            var _bn = new types.basic.bn.BigNumber(obj[k]);
            if(SecureExec.tools.proto.inst.isException(_bn)) return _bn;
            _bn = _bn.getSerialized();
            bn_json[k] = _bn;
        }
    }
    return bn_json;
};
_point.elliptic.construct.point.bnArgsGenPoint = function(bns, curve){
    var t = _point.elliptic.available.curves[curve].type;
    var rbn = _point.elliptic.available.types[t].bn;
    var bn_args = {};
    for(var i=0; i<rbn.length; i++){
        var bnk = rbn[i];
        var _bn = bns[bnk];
        if(typeof _bn==="undefined"){
            throw new ncrypt.exception.types.basic.point.invalidArgument();
        }
        _bn = new types.basic.bn.BigNumber(bns[bnk]);
        if(SecureExec.tools.proto.inst.isException(_bn)) return _bn;
        _bn = _bn.getDeserialized();
        bn_args[bnk] = (_bn);
    }
    return bn_args;
};
_point.elliptic.construct.point.getEC = function(curve){
    try{
        var ec;
        if(typeof _cache[curve]==="undefined"){
            ec = new ncrypt.dep.elliptic.ec(curve);
        }else{ ec = _cache[curve]; }
        return ec;
    }catch(e){ throw new ncrypt.exception.types.basic.point.cannotDeriveEC(); }
};
_point.elliptic.construct.point.generate = function(bns, curve){
    if(!_point.elliptic.available.curveNameIsValid(curve)){
        throw new ncrypt.exception.types.basic.point.invalidCurve();
    }
    var ec = SecureExec.sync.apply(_point.elliptic.construct.point.getEC, 
                [curve]);
    if(SecureExec.tools.proto.inst.isException(ec)) return ec;
    var gen_args = SecureExec.sync.apply(
                _point.elliptic.construct.point.bnArgsGenPoint,
                [bns, curve]);
    if(SecureExec.tools.proto.inst.isException(gen_args)) return gen_args;
    var pt;
    try{
        var t = ec.curve.type;
        var pt_gen_args = [];
        if(t==="mont"){
            pt_gen_args = [ gen_args.x, gen_args.z ];
        }else if(t==="short"){
            pt_gen_args = [ gen_args.x, gen_args.y ];
        }else if(t==="edwards"){
            pt_gen_args = [ gen_args.x, gen_args.y, gen_args.z, gen_args.t ];
        }else{
            throw new ncrypt.exception.types.basic.point.unsupportedCurveType();
        }
        pt = ec.curve.point.apply(ec.curve, pt_gen_args);
    }catch(e){
        pt = new SecureExec.exception.Exception(null,null,e);
    }
    if(SecureExec.tools.proto.inst.isException(pt)){
        throw new ncrypt.exception.types.basic.point.generatingPointFailed();
    }
    return pt;
};

_point.serialize = {};
_point.serialize.serialize = function(elliptic_point, curve){
    var bn_args = SecureExec.sync.apply(
        _point.elliptic.construct.point.bnArgsFromPoint, 
            [elliptic_point, curve]
    );
    if(SecureExec.tools.proto.inst.isException(bn_args)) return bn_args;
    if(!_point.elliptic.available.curveNameIsValid(curve)){
        throw new ncrypt.exception.types.basic.point.invalidCurve();
    }
    var json_str = JSON.stringify({ "b": bn_args, "c": curve });
    return json_str;
};
_point.serialize.deserialize = function(point_str){
    var point_obj = null;
    if(typeof point_str!=="string" || point_str.length<1){
        throw new ncrypt.exception.types.basic.point.deserializationFailed();
    }
    try{
        point_obj = JSON.parse(point_str);
    }catch(e){
        throw new ncrypt.exception.types.basic.point.deserializationFailed();
    }
    var p = _point.elliptic.construct.point.generate(point_obj.b, point_obj.c);
    if(SecureExec.tools.proto.inst.isException(p)) return p;
    var p_obj = {
        "c": point_obj.c,
        "p": p
    };
    return p_obj;
};

/**
 * Create an instance of `Point`, representing a point on a curve as used 
 * in `elliptic`. 
 * @param {object|string} obj - This can be either an instance of this class, 
 * a point instance from `elliptic`, or a string. In case of a string, this 
 * string must represent a serialized version of an instance of `Point`,  
 * retrieved from an existing point using `(my_point_inst).getSerialized()`.
 * @param {string} [curve] - If @obj is not a serialized version of an instance
 * of this class, specify the curvename of the curve the point is located on.
 * @returns {object}
 * @class
 * @name Point
 * @memberof nCrypt.asym.types.basic.point
 * */
var Point = function(obj, curve){
    var _pt_serialized = null;
    var _pt_deserialized = null;
    var _pt_curve = null;
    var _pt_type = null;
    
    var isPointInst = SecureExec.tools.proto.inst.isInstanceOf(obj, Point);
    if(isPointInst){
        return obj.clone();
    }
    if(typeof obj==="string" && typeof curve==="undefined"){
        _pt_deserialized = _point.serialize.deserialize(obj);
        if(SecureExec.tools.proto.inst.isException(_pt_deserialized)){
            return _pt_deserialized;
        }
        _pt_serialized = _point.serialize.serialize(_pt_deserialized.p,
                                                    _pt_deserialized.c);
        if(SecureExec.tools.proto.inst.isException(_pt_serialized)){
            return _pt_serialized;
        }
        _pt_curve = _pt_deserialized.c;
        _pt_type = _point.elliptic.available.curves[_pt_curve].type;
    }
    else if(typeof obj==="object" && typeof curve==="string"){
        _pt_serialized = _point.serialize.serialize(obj, curve);
        if(SecureExec.tools.proto.inst.isException(_pt_serialized)){
            return _pt_serialized;
        }
        _pt_deserialized = _point.serialize.deserialize(_pt_serialized);
        if(SecureExec.tools.proto.inst.isException(_pt_deserialized)){
            return _pt_deserialized;
        }
        _pt_curve = _pt_deserialized.c;
        _pt_type = _point.elliptic.available.curves[_pt_curve].type;
    }else{
        var exp = new ncrypt.exception.Create(
                        ncrypt.exception.types.basic.point.invalidArgument);
        return new SecureExec.exception.Exception(null, null, exp);
    }
    
    /**
     * Return a serialized version of the point represented (JSON string 
     * containing all required point information).
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getSerialized = function(){
        return _pt_serialized+"";
    };
    /**
     * Return an object containing the `elliptic`-point and other properties
     * representing a point. (You'll most often use `getEllipticPoint`, but this
     * gives back an object with point and curve information, with the point
     * being `(my_returned_obj).p` and the curve information 
     * `(my_returned_obj).c`.)
     * @returns {object}
     * @name getDeserialized
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getDeserialized = function(){
        return _pt_deserialized;
    };
    /**
     * Get the `elliptic`-point object. 
     * @returns {object}
     * @name getEllipticPoint
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getEllipticPoint = function(){
        return _pt_deserialized.p;
    };
    /**
     * Get the curve name of the curve the point is located on.
     * @returns {string}
     * @name getCurveName
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getCurveName = function(){
        return _pt_curve+"";
    };
    /**
     * Get the curve type of the curve the point is located on.
     * @returns {string}
     * @name getCurveType
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.getCurveType = function(){
        return _pt_type+"";
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.point.Point}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.point.Point#
     * */
    this.clone = function(){
        return new Point(_pt_serialized+"");
    };
};
point.Point = Point;

/**
 * @namespace nCrypt.asym.types.basic.point.curves
 * */
point.curves = {};
/**
 * @namespace nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available = {};
/**
 * Get an array of strings containing the names of all currently supported 
 * curves.
 * @returns {string[]}
 * @function
 * @name getAvailableCurveNames
 * @memberof nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available.getAvailableCurveNames = function(){
    var c = _point.elliptic.available.curves;
    var cns = [];
    for(var k in c){ cns.push(k); }
    return cns;
};
/**
 * Get an object representing all the available curves with their names and
 * types.
 * @returns {object}
 * @function
 * @name getAvailableCurves
 * @memberof nCrypt.asym.types.basic.point.curves.available
 * */
point.curves.available.getAvailableCurves = function(){
    var c = _point.elliptic.available.curves;
    return JSON.parse(JSON.stringify(c));
};
/**
 * @namespace nCrypt.asym.types.basic.point.curves.validate
 * */
point.curves.validate = {};
/**
 * Check whether a certain curve (identified by name) is supported.
 * @param {string} cname - Curvename.
 * @returns {bool}
 * @function
 * @name isSupportedCurve
 * @memberof nCrypt.asym.types.basic.point.curves.validate
 * */
point.curves.validate.isSupportedCurve = function(cname){
    if(typeof cname!=="string" || cname.length<1 || cname==="__proto__"){
        return false;
    }
    var c = _point.elliptic.available.curves;
    var cs = JSON.parse(JSON.stringify(c));
    return (typeof cs[cname]==="object");
};

/**
 * @namespace nCrypt.asym.types.basic.point.cache
 * */
point.cache = {};
/**
 * Loading the `ellipticjs.ec` objects for certain curves can be a pretty time
 * consuming operation.
 * <br />
 * This is why it makes sense to pre-cache these objects before starting the
 * actual application. As a result, elliptic curve calculation / generating 
 * keys etc. will go much smoother. 
 * <br />
 * Pass an array of all curve names of the curves the application is going to
 * use.
 * @param {string[]} curves - Curvenames for the curves EC-object should be 
 * pre-cached for. 
 * @param {function} callback - Callback 
 * function([bool|SecureExec.exception.Exception] res, [*] carry)
 * @param {*} [carry]
 * @function
 * @name preloadCache
 * @memberof nCrypt.asym.types.basic.point.cache
 * */
point.cache.preloadCache = function(curves, callback, carry){
    if(typeof callback!=="function") return false;
    var donef = function(res){ /* res is an instance of 
                                * SecureExec.exception.Exception or a bool
                                * value (true) for success. 
                                * */
        setTimeout(function(){
            callback(res, carry);
        }, 0);
    };
    var check_args = function(){
        if(!Array.isArray(curves)){
            throw new ncrypt.exception.types.basic.point.invalidArgument();
        }
        for(var i=0; i<curves.length; i++){
            var c = curves[i];
            if(!_point.elliptic.available.curveNameIsValid(c)){
                throw new ncrypt.exception.types.basic.point.invalidCurve();
            }
        }
        return true;
    };
    var args_valid = SecureExec.sync.apply(check_args, []);
    if(typeof args_valid!=="boolean"){ donef(args_valid); return; }
    
    var iterate_curves = function(_curves){
        if(_curves.length<1){ donef(true); return; }
        var c = _curves.shift();
        var ecf = _point.elliptic.construct.point.getEC;
        var ec = SecureExec.sync.apply(ecf, [ c ]);
        if(SecureExec.tools.proto.inst.isException(ec)){
            donef(ec); return;
        }
        iterate_curves(_curves);
    };
    iterate_curves(curves.slice(0));
    
    return true;
};

/**
 * @namespace nCrypt.asym.types.basic.point.ec
 * */
point.ec = {};
/**
 * Get an `ellipticjs.ec` object for a certain curve. This usually is equivalent 
 * to calling `new ellipticjs.ec("curvename")`, but will use the internal cache
 * for EC objects of this namespace.
 * @param {string} curvename
 * @returns {object|SecureExec.exception.Exception}
 * @function
 * @name getEC
 * @memberof nCrypt.asym.types.basic.point.ec
 * */
point.ec.getEC = function(curve){
    var check_args = function(){
        if(!_point.elliptic.available.curveNameIsValid(curve)){
            throw new ncrypt.exception.types.basic.point.invalidCurve();
        }
        return true;
    };
    var args_valid = SecureExec.sync.apply(check_args, [ curve ]);
    if(typeof args_valid!=="boolean" || args_valid!==true) return args_valid;
    var ecf = _point.elliptic.construct.point.getEC;
    var ec = SecureExec.sync.apply(ecf, [ curve ]);
    return ec;
};

return point; });

},{}],47:[function(require,module,exports){

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

module.exports = (function(ncrypt, types){

// bn: types.basic.bn
var SecureExec = ncrypt.dep.SecureExec;

/**
 * @namespace nCrypt.asym.types.basic.secret
 * */
var  secret = {};
var _secret = {};

_secret.source = {
    "BN": 0,
    "STRING": 1,
    "SECRET": 2
};

/**
 * @const 
 * @name source
 * @memberof nCrypt.asym.types.basic.secret
 * */
secret.source = (function(){
    return JSON.parse(JSON.stringify(_secret.source));
})();

_secret.valid = {};
_secret.valid.isValidSecretString = function(str){
    if(typeof str!=="string" || str.length<1) return false;
    var length_and_encoding_match = function(s){
        try {
            var bytes = ncrypt.enc.transform(s, "base64url", "bytes");
            if(bytes.length === 32){ return true; }
        }catch(e){}
        return false;
    };
    return length_and_encoding_match(str);
};
_secret.valid.isValidSecretObject = function(obj){
    var inst = false;
    try{ inst = obj instanceof Secret; }catch(e){ return false; }
    if(inst){
        var val = false;
        try{ val = obj.getSecretValue(); }catch(e){}
        if(typeof val!=="string") return false;
        return _secret.valid.isValidSecretString(val);
    }
    return false;
};
_secret.valid.validSource = function(source){
    if(typeof source!=="number") return false;
    if(source<0) return false;
    for(var k in _secret.source){
        if(_secret.source[k]===source) return true;
    }
    return false;
};

/**
 * Constructor for a `Secret` object. A `Secret` internally represents a key
 * which can be used for encryption and decryption, providing 256 bit of key
 * data. 
 * <br />
 * A `Secret` can be derived from a big number (`source.BN`), a string 
 * (`source.STRING`) or a `Secret` (`source.SECRET`). 
 * <br />
 * If choosing source type 
 * `STRING`, the string will be simply hashed to get a hash of 256 bit of key
 * data. This is NOT a way to turn passwords into a `Secret`, as these usually
 * are weak as cryptographic keys and require PBKDF2 with additional salt. 
 * <br />
 * If choosing `source.SECRET`, you might pass an instance of `Secret` just as 
 * well as a valid secret string, i.e. a serialized representation of a `Secret`
 * (easily retrieved via `(my_secret_obj).getSecretValue()`).
 * <br />
 * Retrieving secrets from big numbers is especially convenient when converting
 * `elliptic` shared secrets (which usually are big numbers) to instances of 
 * `Secret`.
 * @param {int} source - Source constant 
 * from `nCrypt.asym.types.basic.secret.source`.
 * @param {string|object} val - String, `Secret` object / `Secret` string value,
 * big number.
 * @returns {object}
 * @memberof nCrypt.asym.types.basic.secret
 * @class
 * @name Secret
 * */
var Secret = function(source, val){
    var sec_str = null;
    
    var secret_from_secret_str = function(val){
        if(_secret.valid.isValidSecretString(val)){
            sec_str = val;
        }else{
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        return true;
    };
    var secret_from_secret_obj = function(val){
        var is_secret = function(){
            try{ return obj instanceof secret.Secret; }catch(e){ return false; }
        }();
        if(is_secret){
            sec_str = val.getSecretValue();
        }else{
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        return true;
    };
    var secret_from_string = function(val){
        if(typeof val!=="string" || val.length<1){
            throw new ncrypt.exception.types.basic.secret.invalidValue();
        }
        var sec = ncrypt.hash.hash(val, "sha256", "base64url");
        var res = SecureExec.sync.apply(secret_from_secret_str, [sec]);
        if(typeof res!=="boolean") return res;
        return true;
    };
    var secret_from_bn = function(val){
        var bn_obj = new types.basic.bn.BigNumber(val);
        if(SecureExec.tools.proto.inst.isException(bn_obj)){
            return bn_obj;
        }
        var str = bn_obj.getSerialized();
        var res = SecureExec.sync.apply(secret_from_string, [str]);
        if(typeof res!=="boolean") return res;
        return true;
    };
    
    if(!_secret.valid.validSource(source)){
        var err = ncrypt.exception.Create(
        ncrypt.exception.types.basic.secret.invalidSourceType);
        var exp = new SecureExec.exception.Exception(null,null,err);
        return exp;
    }
    var res = null;
    if(source===_secret.source.BN){
        res = SecureExec.sync.apply(secret_from_bn, [val]);
    }else if(source===_secret.source.STRING){
        res = SecureExec.sync.apply(secret_from_string, [val]);
    }else {
        if(typeof val==="string"){
            res = SecureExec.sync.apply(secret_from_secret_str, [val]);
        }else{
            res = SecureExec.sync.apply(secret_from_secret_obj, [val]);
        }
    }
    if(typeof res!=="boolean"){
        if(SecureExec.tools.proto.inst.isException(res)){
            return res;
        }else{
            var exp = ncrypt.exception.Create(
                        ncrypt.exception.types.basic.secret.invalidValue);
            exp = new SecureExec.exception.Exception(null, null, exp);
            return exp;
        }
    }
    if(!_secret.valid.isValidSecretString(sec_str)){
        var exp = ncrypt.exception.Create(
                        ncrypt.exception.types.basic.secret.invalidValue);
            exp = new SecureExec.exception.Exception(null, null, exp);
            return exp;
    }
    
    /**
     * Get the string value representing the `Secret`.
     * @returns {string}
     * @name getSecretValue
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.secret.Secret#
     * */
    this.getSecretValue = function(){
        return sec_str+"";
    };
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.basic.secret.Secret#
     * */
    this.clone = function(){
        var source = _secret.source.SECRET;
        var sec = new Secret(source, sec_str);
        return sec;
    };
};
secret.Secret = Secret;

return secret; });

},{}],48:[function(require,module,exports){

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

var tbasic = deptypes.basic;

/**
 * @namespace nCrypt.asym.types.key
 * */
var  key = {};
var _key = {};

key.keypair = require('./types/keypair.js');
key.keypair = key.keypair(ncrypt, { "basic": tbasic });

return key; });

},{"./types/keypair.js":49}],49:[function(require,module,exports){

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

},{}],50:[function(require,module,exports){

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

var tbasic = deptypes.basic;
var tkey = deptypes.key;

/**
 * @namespace nCrypt.asym.types.shared
 * */
var  shared = {};
var _shared = {};

shared.dh = require('./types/dh.js');
shared.dh = shared.dh(ncrypt, { 'basic': tbasic, 'key': tkey });

shared.ecies = require('./types/ecies.js');
shared.ecies = shared.ecies(ncrypt, { 'basic': tbasic, 'key': tkey });

return shared; });

},{"./types/dh.js":51,"./types/ecies.js":52}],51:[function(require,module,exports){

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
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.shared.dh
 * */
var  dh = {};
var _dh = {};

_dh.secret = {};
_dh.secret.derive = function(kp1, kp2){
    var check_curves_match = function(kp1, kp2){
        var c1 = kp1.getCurveName(); var c2 = kp2.getCurveName();
        if(c1!==c2){
            throw new ncrypt.exception.types.shared.dh.nonmatchingCurves();
        } return true;
    };
    var run_dh = function(kp1, kp2){
        var shared_secret_bn;
        try{
            var ekp1 = kp1.getEllipticKeypair();
            var ekp2p = kp2.getPublic().getEllipticPoint();
            shared_secret_bn = ekp1.derive(ekp2p);
        }catch(e){
            throw new ncrypt.exception.types.shared.dh.derivationFailed();
        }
        var source = tsecret.source.BN;
        var secret = new tsecret.Secret(source, shared_secret_bn);
        return secret;
    };
    var cmatch = SecureExec.sync.apply(check_curves_match, [kp1, kp2]);
    if(_isExp(cmatch)) return cmatch;
    return SecureExec.sync.apply(run_dh, [kp1, kp2]);
};

/**
 * Create a shared secret between two keypairs using DH for shared secret
 * derivation.
 * <br />
 * Please note: Both keypairs must use the same curve for DH.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} local_keypair - Keypair
 * to derive a shared secret with @public_keypair using DH. To restore an
 * instance of this class from a serialized instance, pass the string or JSON
 * object instead of @local_keypair as the only parameter.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} public_keypair - 
 * Keypair to derive a shared secret with @keypair1 using DH. For this keypair, 
 * a public only keypair is enough. (You'll usually pass the remote public 
 * keypair as this argument.)
 * @class
 * @name SecretDH
 * @memberof nCrypt.asym.types.shared.dh
 * */
var SecretDH = function(local_keypair, public_keypair, existing_secret){
    
    var get_from_json = function(obj){
        if(typeof obj==='string'){
            try{ obj = JSON.parse(obj); }catch(e){
                throw new ncrypt.exception.types.shared.dh.invalidArgument(); }
        }
        if(typeof obj!=='object' || obj===null || obj==={}){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        var l = obj.l; try{ l = JSON.stringify(l); }catch(e){ l=null; }
        var p = obj.p; try{ p = JSON.stringify(l); }catch(e){ p=null; }
        var s = obj.s;
        if(typeof l!=='string' || typeof p!=='string' || typeof s!=='string'){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        return { 'l': l, 'p': p, 's': s };
    };
    if((typeof local_keypair==='string' || typeof local_keypair==='object') &&
       typeof public_keypair==='undefined' && 
       typeof existing_secret==='undefined'){
        var serialized = SecureExec.sync.apply(get_from_json, [local_keypair]);
        if(_isExp(serialized)) return serialized;
        local_keypair = serialized.l;
        public_keypair = serialized.p;
        existing_secret = serialized.s;
    }
    
    var _secret = null;
    var _kp1 = null; var _kp2 = null;
    
    var kp1 = new tkeypair.Keypair(local_keypair); if(_isExp(kp1)) return kp1;
    var kp2 = new tkeypair.Keypair(public_keypair); if(_isExp(kp2)) return kp2;
    
    if(typeof existing_secret==="string"){
        _secret = new tsecret.Secret(tsecret.source.SECRET, existing_secret);
    }else{
        _secret = _dh.secret.derive(kp1, kp2);
    }
    if(_isExp(_secret)) return _secret;
    _kp1 = kp1; _kp2 = kp2;
    
    try{
        var _json = {};
            _json.l = JSON.parse(kp1.getSerialized());
            _json.p = JSON.parse(kp2.getPublicKeypair());
            _json.s = _secret.getSecretValue();
        var _json_str = JSON.stringify(_json);
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of the secret object. (Please note: This is 
     * NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.dh.SecretDH}.)
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Get the serialized version of the secret object as parsed JSON. (Please 
     * note: This is NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.dh.SecretDH}.) 
     * @private
     * @returns {object}
     * @name getJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getJSON = function(){
        return JSON.parse(_json_str);
    };
    
    /**
     * Get the local keypair (it's private parts are used for shared secret
     * derivation).
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name getKeypairLocal
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getKeypairLocal = function(){
        return _kp1.clone();
    };
    
    /**
     * Get the public keypair (it's public parts are used to derive the 
     * shared secret with the local keypair).
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name getKeypairPublic
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getKeypairPublic = function(){
        return _kp2.clone();
    };
    
    /**
     * Return the instance of `Secret` representing the derived shared DH 
     * secret of the two keypairs.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name getSecret
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSecret = function(){
        return _secret.clone();
    };
    
    /**
     * Get the serialized value of the `Secret` instance representing the 
     * shared secret. This function is a shorthand for 
     * `(my_secret_dh_inst).getSecret().getSecretValue()`.
     * @returns {string}
     * @name getSecretValue
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.getSecretValue = function(){
        return _secret.getSecretValue();
    };
    /**
     * Return a clone of this object.
     * @returns {nCrypt.asym.types.shared.dh.SecretDH}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.dh.SecretDH#
     * */
    this.clone = function(){
        return new SecretDH(_kp1.getSerialized(), _kp2.getSerialized(), 
                            _secret.getSecretValue());
    };
};
dh.SecretDH = SecretDH;

return dh; });

},{}],52:[function(require,module,exports){

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
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.shared.ecies
 * */
var  ecies = {};
var _ecies = {};

_ecies.secret = {};
_ecies.secret.generateSecret = function(kp){
    var gen_secret = function(kp){
        /* Get the curve @kp is on */
        var curve = kp.getCurveName();
        /* Generate a random keypair */
        var random_keypair = new tkeypair.Keypair(null, curve);
        if(_isExp(random_keypair)) return random_keypair;
        /* Derive a shared secret between these two keypairs. */
        var shared_secret_bn; var shared_secret;
        try{
            var rkpe = random_keypair.getEllipticKeypair();
            var kpep = kp.getPublic().getEllipticPoint();
            shared_secret_bn = rkpe.derive(kpep);
            var source = tsecret.source.BN;
            shared_secret = new tsecret.Secret(source, shared_secret_bn);
        }catch(e){
            throw new ncrypt.exception.types.shared.ecies.derivationFailed();
        }
        /* Store the random public key as a tag */
        var tag = random_keypair.getPublic();
        return { "tag": tag, "secret": shared_secret };
    };
    return SecureExec.sync.apply(gen_secret, [ kp ]);
};
_ecies.secret.restoreSecret = function(kp, tag){
    var restore_sec = function(kp, tag){
        var shared_secret_bn; var shared_secret;
        try{
            tag = tag.getEllipticPoint();
            shared_secret_bn = kp.getEllipticKeypair().derive(tag);
            var source = tsecret.source.BN;
            shared_secret = new tsecret.Secret(source, shared_secret_bn);
        }catch(e){
            throw new ncrypt.exception.types.shared.ecies.restoreFailed();
        }
        return shared_secret;
    };
    return SecureExec.sync.apply(restore_sec, [ kp, tag ]);
};

/**
 * Create a (temporary) shared secret using ECIES like key derivation.
 * <br />
 * To generate a secret, pass the receiver's (public) keypair. As a result,
 * there will be a **tag** and a **secret**. The secret is never sent anywhere, 
 * and can be used to encrypt a message. The tag needs to be sent along with the
 * message so the owner of the public key will be able to restore the secret.
 * <br />
 * The restore a secret, pass the local (full) keypair and the tag received
 * with the message. If you are the receiver of the message, i.e. the message
 * was encrypted for you, the secret can be used to decrypt a potential message.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} keypair - To derive,
 * the receiver's (public part only) keypair, to restore, your local keypair.
 * To restore an instance of this class from a serialized instance, pass the 
 * string or JSON object instead of @keypair as the only parameter.
 * @param {string|nCrypt.asym.types.basic.point.Point} [tag] - Do not pass to
 * derive, to restore, pass the tag.
 * @param {string} [cloning_secret] - Usually NOT passed. Used when cloning an
 * ECIES object, i.e. new SecretECIES(keypair, tag, cloning_secret), with 
 * the @cloning_secret being a serialized instance 
 * of {@link nCrypt.asym.types.basic.secret.Secret}, for example derived 
 * calling `getSecretValue()` from the original object. To clone an instance
 * from this object, do not use this, as there are no further checks performed,
 * simply call `clone()`.
 * @class
 * @name SecretECIES
 * @memberof nCrypt.asym.types.shared.ecies
 * */
var SecretECIES = function(keypair, tag, cloning_secret){
    
    var is_empty = function(o){
        return (typeof o==='undefined' || (typeof o==='object' && o===null));
    };
    
    var get_from_json = function(obj){
        if(typeof obj==='string'){
            try{ obj = JSON.parse(obj); }catch(e){
                throw new ncrypt.exception.types.shared.dh.invalidArgument(); }
        }
        if(typeof obj!=='object' || obj===null || obj==={}){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        var t = obj.t; 
        if(is_empty(t)){ t = null; }else{
            try{ t = JSON.stringify(t); }catch(e){ t=null; }
        }
        var k = obj.k; try{ k = JSON.stringify(k); }catch(e){ k=null; }
        var s = obj.s;
        if(typeof t!=='string' || typeof k!=='string' || typeof s!=='string'){
            throw new ncrypt.exception.types.shared.dh.invalidArgument();
        }
        return { 't': t, 'k': k, 's': s };
    };
    if((typeof keypair==='string' || typeof keypair==='object') &&
       typeof tag==='undefined' && 
       typeof cloning_secret==='undefined'){
        try{
            keypair = JSON.parse(keypair);
            if(typeof keypair.t!=='undefined' && 
               typeof keypair.k!=='undefined' &&
               typeof keypair.s!=='undefined'){
                var serialized = 
                    SecureExec.sync.apply(get_from_json, [keypair]);
                if(_isExp(serialized)) return serialized;
                keypair = serialized.k;
                tag = serialized.t;
                cloning_secret = serialized.s;
            }else{ keypair = JSON.stringify(keypair); }
        }catch(e){}
    }
    
    var _secret; var _tag; var _kp;
    var _is_derived; var _is_restored;
    
    var kp = new tkeypair.Keypair(keypair);
    if(_isExp(kp)) return kp;
    _kp = kp;
    if( typeof tag!=='undefined' ){
        if(typeof tag==='object'){
            try{ if(!(tag instanceof tpoint.Point)) 
                 tag = JSON.stringify(tag); 
            }catch(e){}
        }
        var tagp = new tpoint.Point(tag);
        if(_isExp(tagp)) return tagp;
    }
    if( typeof tag==='undefined' ){
        // derive a secret
        _is_derived = true;
        _is_restored = false;
        var res = _ecies.secret.generateSecret(kp);
        if(_isExp(res)) return res;
        _secret = res.secret;
        _tag = res.tag;
    }else{
        // restore a secret
        _is_derived = false;
        _is_restored = true;
        var sec;
        if(typeof cloning_secret === 'string'){
            // use the existing secret
            sec = new tsecret.Secret(tsecret.source.SECRET, cloning_secret);
            if(typeof tagp!=='undefined'){
                _tag = tagp;
            }else{ _tag = null; }
        }else{
            // restore the secret
            sec = _ecies.secret.restoreSecret(kp, tagp);
            _tag = tagp;
        }
        if(_isExp(sec)) return sec;
        _secret = sec;
    }
    
    try{
        var _json = {};
        if(is_empty(_tag)){ _json.t = null; }
        else{ _json.t = JSON.parse(_tag.clone().getSerialized()); }
        _json.k = JSON.parse(_kp.clone().getPublicKeypair());
        _json.s = _secret.getSecretValue()+'';
        var _json_str = JSON.stringify(_json)+'';
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of the secret object. (Please note: This is 
     * NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.ecies.SecretECIES}.)
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Get the serialized version of the secret object as parsed JSON. (Please 
     * note: This is NOT the shared secret, but a serialized version of the 
     * instance of {nCrypt.asym.types.shared.ecies.SecretECIES}.) 
     * @private
     * @returns {object}
     * @name getJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getJSON = function(){
        return JSON.parse(_json_str);
    };
    
    /**
     * Get the shared secret as an instance of `Secret`. The shared secret is
     * never sent anywhere and can be used to encrypt messages.
     * @returns {nCrypt.asym.types.basic.secret.Secret}
     * @name getSecret
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSecret = function(){
        return _secret.clone();
    };
    /**
     * Get the secret value as a string.
     * @name getSecretValue
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getSecretValue = function(){
        return _secret.getSecretValue();
    };
    /**
     * Get the tag, which either needs to be sent along with an encrypted 
     * message for the receiver to restore the secret, or was used by the
     * receiver to restore the secret in case of restore.
     * @name getTag
     * @returns {object|nCrypt.asym.types.basic.point.Point}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getTag = function(){
        if(!is_empty(_tag)) return _tag.clone();
        return null;
    };
    
    /**
     * Get the keypair used to derive or restore the secret.
     * @name getKeypair
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.getKeypair = function(){
        return _kp.clone();
    };
    
    /**
     * Return a clone of this object.
     * @returns {nCrypt.asym.types.shared.ecies.SecretECIES}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.shared.ecies.SecretECIES#
     * */
    this.clone = function(){
        if(!is_empty(_tag)){ var _cloning_tag = _tag.clone(); }
        else{ _cloning_tag = null; }
        var _cloning_key = _kp.clone();
        var _cloning_sec = _secret.getSecretValue()+'';
        return new ecies.SecretECIES(_cloning_key, _cloning_tag, _cloning_sec);
    };
};
ecies.SecretECIES = SecretECIES;

return ecies; });

},{}],53:[function(require,module,exports){

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

var tbasic = deptypes.basic;
var tkey = deptypes.key;

/**
 * @namespace nCrypt.asym.types.signature
 * */
var  signature = {};
var _signature = {};

signature.ecdsa = require('./types/ecdsa.js');
signature.ecdsa = signature.ecdsa(ncrypt, { 'basic': tbasic, 'key': tkey });

return signature; });

},{"./types/ecdsa.js":54}],54:[function(require,module,exports){

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
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.signature.ecdsa
 * */
var  ecdsa = {};
var _ecdsa = {};

_ecdsa.sig = {};
_ecdsa.sig.sign = function(cleartext, keypair){
    var runf = function(ctxt, kp){
        var hmsg = ncrypt.hash.hash(ctxt, "sha256", "bytes");
        var s; 
        try { 
            s = kp.getEllipticKeypair().sign(hmsg); // 'elliptic' 'Signature' }
            s = _ecdsa.serialize.serialize(s); // 'base64url' like string
        }catch(e){
            throw new ncrypt.exception.types.signature.ecdsa.signingFailed();
        }
        return s;
    };
    return SecureExec.sync.apply(runf, [cleartext, keypair]);
};
_ecdsa.sig.verify = function(cleartext, keypair, s){
    var runf = function(ctxt, kp, s){
        var hmsg = ncrypt.hash.hash(ctxt, "sha256", "bytes");
            s = _ecdsa.serialize.deserialize(s);
        var ver = false;
        try{
            var tver = kp.getEllipticKeypair().verify(hmsg, s);
            if(typeof tver==="boolean" && tver===true) ver = true;
        }catch(e){ }
        return ver;
    };
    return SecureExec.sync.apply(runf, [cleartext, keypair, s]);
};

_ecdsa.serialize = {};
_ecdsa.serialize.serialize = function(s){
    var runf = function(s){
        if(typeof s==="object" && !Array.isArray(s) && 
           typeof s.toDER==="function"){
            try { s = s.toDER(); }catch(e){
                throw new 
                ncrypt.exception.types.signature.ecdsa.
                signatureSerializeFailed();
            }
        }
        if(!Array.isArray(s)){
            throw new 
                ncrypt.exception.types.signature.ecdsa.
                signatureSerializeFailed();
        }
        s = ncrypt.enc.transform(s, "bytes", "base64url");
        if(typeof s==="string" && s.length>0) return s;
        if(_isExp(s)) return s;
        throw new ncrypt.exception.types.signature.ecdsa.
        signatureSerializeFailed();
    };
    return SecureExec.sync.apply(runf, [s]);
};
_ecdsa.serialize.deserialize = function(s){
    var runf = function(s){
        s = ncrypt.enc.transform(s, "base64url", "bytes");
        if(_isExp(s)) return s;
        if(Array.isArray(s) && s.length>0) return s;
        throw new 
            ncrypt.exception.types.signature.ecdsa.signatureDeserializeFailed();
    };
    return SecureExec.sync.apply(runf, [s]);
};

/**
 * Create a signature object. This can be used to sign a message (by passing
 * the message and signer's keypair), or to verify a signature (by passing
 * the message, the signer's - usually public only - keypair, and the signature
 * string).
 * @param {string} cleartext - The message to sign or to verify a signature for.
 * @param {string|nCrypt.asym.types.key.keypair.Keypair} keypair - For signing: 
 * The signer's keypair. For verification: The signer's/ sender's keypair, a 
 * public key is enough here.
 * @param {string} [sig] - For verification: The signature, as a string. Can be
 * derived after signing like my_signature_obj.getSignature(). For signing, 
 * pass nothing here.
 * @class
 * @name Signature
 * @memberof nCrypt.asym.types.signature.ecdsa
 * */
var Signature = function(cleartext, keypair, sig){
    var _kp; var _cleartext; var _sig; var _sig_bytes; var _ver;
    
    var check_args = function(cleartext, keypair, sig){
        if(typeof cleartext!=="string"){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument();
        }
        var kp = new tkeypair.Keypair(keypair);
        if(_isExp(kp)) return kp;
        if(kp.getType()==='mont'){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument(
                "The keypair passed is a 'mont'-type one. Signing doesn't "+
                "work with Montgomery type curves!");
        }
        if(typeof sig!=="string" && typeof sig!=="undefined"){
            throw new ncrypt.exception.types.signature.ecdsa.invalidArgument();
        }
        return { "kp": kp, "cleartext": cleartext, "sig": sig };
    };
    
    var args_valid = SecureExec.sync.apply(check_args, 
                     [cleartext, keypair, sig]); 
    if(_isExp(args_valid)) return args_valid;
    
    _kp = args_valid.kp;
    _cleartext = args_valid.cleartext;
    var sigstr = args_valid.sig;
    if(typeof sigstr==="string"){
        _sig = _ecdsa.serialize.deserialize(sigstr);
        if(_isExp(_sig)) return _sig;
        _sig_bytes = _sig;
        _sig = _ecdsa.serialize.serialize(_sig);
        if(_isExp(_sig)) return _sig;
        _ver = _ecdsa.sig.verify(_cleartext, _kp, _sig);
        if(_isExp(_ver)) return _ver;
    }else{
        _sig = _ecdsa.sig.sign(_cleartext, _kp);
        if(_isExp(_sig)) return _sig;
        _sig_bytes = _ecdsa.serialize.deserialize(_sig);
        if(_isExp(_sig_bytes)) return _sig_bytes;
        _ver = true;
    }
    
    /**
     * Get the string representation of a signature. (This is passed along with
     * the message and passed to the constructor as the signature argument.)
     * @returns {string}
     * @name getSignature
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getSignature = function(){
        return _sig+"";
    };
    /**
     * Get an array representation of the signature.
     * @name getSignatureBytes
     * @returns {int[]}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getSignatureBytes = function(){
        return _sig_bytes.slice(0);
    };
    /**
     * Check whether the signature was verified. If this object was generated
     * signing, the result will always be true. For verification, it will be 
     * true if the signature passed was verified and false if not.
     * @name getVerified
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getVerified = function(){
        return (_ver===true);
    };
    /**
     * Get the keypair this signature was generated or verified using.
     * @name getKeypair
     * @returns {}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getKeypair = function(){
        return _kp.clone();
    };
    /**
     * Get the message cleartext signed / the message cleartext a given 
     * signature was verified for.
     * @name getCleartext
     * @returns {}
     * @member {Function}
     * @memberof nCrypt.asym.types.signature.ecdsa.Signature#
     * */
    this.getCleartext = function(){
        return _cleartext+"";
    };
};
ecdsa.Signature = Signature;

return ecdsa; });

},{}],55:[function(require,module,exports){

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

var tbasic = deptypes.basic;
var tkey = deptypes.key;
var tshared = deptypes.shared;
var tkeyset = deptypes.keyset;

/**
 * @namespace nCrypt.asym.types.simple.message
 * */
var  message = {};
var _message = {};

message.symkey = require('./types/symkey.js');
message.symkey = message.symkey(
    ncrypt, {
        'basic': tbasic,
        'key': tkey,
        'keyset': tkeyset,
        'shared': tshared
    }
);

/*message.message = require('./types/message.js');
message.message = message.message(
    ncrypt, {
        'basic': tbasic,
        'key': tkey,
        'keyset': tkeyset,
        'shared': tshared,
        'symkey': message.symkey
    }
);*/

return message; });

},{"./types/symkey.js":56}],56:[function(require,module,exports){

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

var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.simple.message.symkey
 * */
var  symkey = {};
var _symkey = {};

/**
 * Messages are (potentially / often) encrypted for more than one receiver. This
 * is why it makes sense to encrypt the symmetric key the message is encrypted
 * with using the shared secrets, instead of encrypting the whole message 
 * (possibly) many times. (The message is usually longer than the symmetric key,
 * which would result in unnecessarily long messages and long calculation time.)
 * <br />
 * An array of encrypted symmetric keys should be appended to the encrypted 
 * message, so a receiver can try to decrypt a symmetric key using a shared 
 * secret between sender and receiver.
 * <br />
 * This encrypted symmetric key objects should contain the actual encrypted 
 * symmetric key, the receiver's public key ID (so the receiver can find out
 * which symmetric key in the array to decrypt without trial and error), the
 * type of shared secret ('ecies' or 'dh'), and in case of ECIES, the tag 
 * required to restore the shared secret.
 * <br />
 * This class creates such an object from an instance of a shared secret class
 * ({@link nCrypt.asym.types.shared.dh.SecretDH} 
 * or {@link nCrypt.asym.types.shared.ecies.SecretECIES}), a symmetric key 
 * and symmetric encryption options. Using the symmetric encryption options,
 * the @symkey will be encrypted using the shared secret.
 * <br />
 * The serialized version (available as JSON string or parsed JSON) should be
 * appended to an array of encrypted symkey objects and passed to the receiver
 * along with the encrypted message.
 * <br />
 * Please note: If passing an instance of this class as the first argument, a
 * clone will be returned.
 * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} obj - The
 * shared secret, i.e. an instance of one of the shared secret classes. A 
 * serialized instance (string) will work as well.
 * @param {nCrypt.asym.types.basic.Secret|string} skey - The symmetric key. 
 * This can either be a secret (easily created from a string), or a string. In
 * case of a string, an instance of {@link nCrypt.asym.types.basic.Secret} will
 * be created, using the string as a value and assuming a serialized instance
 * of {@link nCrypt.asym.types.basic.Secret} as a source.
 * @param {string} sym_alg - Symmetric algorithm, for example 'aes', 'twofish'
 * or 'serpent'. Needs to be supported in {@link nCrypt.sym}.
 * @param {object} [sym_opts] - Symmetric encryption options. 
 * @class
 * @name EncSymkeySender 
 * @memberof nCrypt.asym.types.simple.message.symkey.sender
 * */
var EncSymkeySender = function(obj, skey, sym_alg, sym_opts){
    
    var get_from_serialized = function(obj){
        if(typeof obj==='string'){
            try { obj = JSON.parse(obj); }catch(e){
                throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
            }
        }
        try{ var o = JSON.stringify(obj.o); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
            invalidSharedSecretObject());
        }
        var s = obj.s;
        var a = obj.a;
        var c = obj.c || {};
        return { 'o': o, 's': s, 'a': a, 'c': c };
    };
    if((typeof obj==='object' || typeof obj==='string') &&
       typeof skey==='undefined' &&
       typeof sym_alg==='undefined' &&
       typeof sym_opts==='undefined'){
        var serialized = SecureExec.sync.apply(get_from_serialized, [obj]);
        obj = serialized.o;
        skey = serialized.s;
        sym_alg = serialized.a;
        sym_opts = serialized.c;
    }
    
    if(typeof obj==='object'){
    try{
        if(obj instanceof symkey.sender.EncSymkeySender){
            return obj.clone();
        }
    }catch(e){} }
    
    var get_exp = function(exp){
        try{
            var e = ncrypt.exception.Create(exp);
            return (new SecureExec.exception.Exception(null,null,e));
        }catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    };
    
    /* Validate @obj */
    var shared_secret_from_serialized = function(obj){
        try{ var s = JSON.parse(obj); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        if(typeof s.t!=='undefined' && typeof s.k!=='undefined'){
            s = new tecies.SecretECIES(obj);
        }else{
            s = new tdh.SecretDH(obj);
        }
        if(_isExp(s)){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        return s;
    };
    var is_shared_secret_obj = function(obj){
        if(typeof obj!=='object' || obj===null) return false;
        var is_dh_sec = false; var is_ecies_sec = false;
        try{ is_dh_sec = (obj instanceof tdh.SecretDH); }
            catch(e){is_dh_sec = false; }
        if(is_dh_sec!==true){
            try{ is_ecies_sec = (obj instanceof tecies.SecretECIES); }
                catch(e){is_ecies_sec = false; }
        }
        return (is_dh_sec || is_ecies_sec);
    };
    if(typeof obj==='string'){
        obj = SecureExec.sync.apply(shared_secret_from_serialized, [obj]);
        if(_isExp(obj)) return obj;
    }
    var obj_valid = SecureExec.sync.apply(is_shared_secret_obj, [obj]);
    if(_isExp(obj_valid)) return obj_valid;
    if(!(typeof obj_valid==='boolean' && obj_valid===true)){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidSharedSecretObject);
    }
    
    /* Validate @skey */
    var secret_from_string = function(str){
        var runf = function(str){
            var s = tsecret.source.SECRET;
            var sec = new tsecret.Secret(s, str);
            return sec;
        };
        return SecureExec.sync.apply(runf, [ str ]);
    };
    var validate_skey = function(sk){
        var runf = function(sk){
            if(typeof sk!=='object' || sk===null) return false;
            var is_sec = false;
            try{ is_sec = (sk instanceof tsecret.Secret); }
                catch(e){ return false; }
            return is_sec;
        };
        return SecureExec.sync.apply(runf, [ sk ]);
    };
    if(typeof skey==='string'){ skey = secret_from_string(skey);
        if(_isExp(skey)) return skey; }
    var skey_valid = SecureExec.sync.apply(validate_skey, [skey]);
    if(_isExp(skey_valid)) return skey_valid;
    if(!(typeof skey_valid==='boolean' && skey_valid===true)){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidSymkeySecret);
    }
    
    /* (Pre-)validate @sym_alg and @sym_opts */
    if( (typeof sym_alg!=='string' || sym_alg.length<1) ||
        ncrypt.sym.getAvailable().indexOf(sym_alg)<0){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.invalidArgument);
    }
    /* (Pre-)validate @sym_opts */
    if(typeof sym_opts!=='undefined'){
        if(!(typeof sym_opts==='object')){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
        try{ if(sym_opts!==null){
                sym_opts = JSON.parse(JSON.stringify(sym_opts));
        } }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
        if(sym_opts===null) sym_opts = {};
    }
    
    // arguments for cloning
    var _args = {}; 
    _args.obj = obj.clone();
    _args.skey = skey.clone();
    _args.sym_alg = sym_alg+''; 
    try{ _args.sym_opts = JSON.parse(JSON.stringify(sym_opts));
    }catch(e){ _args.sym_opts = {}; }
    
    // arguments for json
    try{
        var _json = {};
        _json.o = JSON.parse(obj.getSerialized());
        _json.s = skey.getSecretValue()+'';
        _json.a = sym_alg+''; 
        try{ _json.c = JSON.parse(JSON.stringify(sym_opts));
        }catch(e){ _json.c = {}; }
        var _json_str = JSON.stringify(_json);
    }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /* internal object properties */
    var _prop = {};
    
    /* - shared secret */
    _prop.shared = {};
    _prop.shared.secstr = obj.getSecretValue();
    
    /* - symmetric key */
    _prop.sym = {};
    _prop.sym.clear = skey.getSecretValue();
    _prop.sym.enc   = ncrypt.sym.sync.encrypt(_prop.sym.clear+'',
                                              _prop.shared.secstr+'',
                                              sym_alg, sym_opts);
    if(_isExp(_prop.sym.enc)) return _prop.sym.enc;
    try{ _prop.sym.enc_json = JSON.parse(_prop.sym.enc); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /* - shared secret type */
    _prop.stype = 'dh';
    if(obj instanceof tecies.SecretECIES) _prop.stype = 'ecies';
    
    /* - receiver key */
    _prop.receiver = {};
    if(_prop.stype==='dh'){
        _prop.receiver.key = obj.getKeypairPublic().clone(); //dh
    }else{
        _prop.receiver.key = obj.getKeypair().clone(); // ecies
        _prop.receiver.tag = obj.getTag().getSerialized(); // get ecies tag
    }
    _prop.receiver.id = _prop.receiver.key.getPublicKeyIDs().txt.normal;
    
    /* - json object to pass to the receiver */
    _prop.json = {};
    _prop.json.obj = {
        't': _prop.stype,
        'i': _prop.receiver.id,
        'k': _prop.sym.enc_json
    };
    if(_prop.stype==='ecies'){
        try{ _prop.json.obj.tag = JSON.parse(_prop.receiver.tag); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    }
    try{ _prop.json.str = JSON.stringify(_prop.json.obj); }
        catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    
    /**
     * Get the serialized version of this instance.
     * @returns {string}
     * @name getSerialized
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSerialized = function(){
        return _json_str+'';
    };
    
    /**
     * Parsed JSON symmetric key object to append to a message in an encrypted
     * symmetric key array. (Not parsed, use the parsed to avoid JSON string
     * escaping if constructing the array.)
     * @returns {string}
     * @name getSymkeyObjectString
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSymkeyObjectString = function(){
        return _prop.json.str+'';
    };
    /**
     * Parsed JSON symmetric key object to append to a message in an encrypted
     * symmetric key array. (Parsed already to avoid JSON string escaping.)
     * @returns {object}
     * @name getSymkeyObjectJSON
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSymkeyObjectJSON = function(){
        return JSON.parse(_prop.json.str+'');
    };
    /**
     * Get the type of the underlying shared secret ('dh' or 'ecies').
     * @returns {string}
     * @name getSharedType
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getSharedType = function(){
        return _prop.stype+'';
    };
    /**
     * Returns the receiver's keypair's ID. (A normal-length text ID.)
     * @returns {string}
     * @name getReceiverID
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getReceiverID = function(){
        return _prop.receiver.id+'';
    };
    /**
     * Returns the receiver's keypair (public key used to derive the DH or
     * ECIES secret).
     * @returns {nCrypt.asym.types.key.keypair}
     * @name getReceiverKey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getReceiverKey = function(){
        return _prop.receiver.key.clone();
    };
    /**
     * Get the ECIES tag required to restore the secret. If the source of this
     * encrypted symkey object was a DH shared secret, return `null`.
     * @returns {string}
     * @name getTag
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.getTag = function(){
        if(_prop.stype==='dh') return null;
        return _prop.receiver.tag+'';
    };
    
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.simple.message.symkey.EncSymkeySender}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender#
     * */
    this.clone = function(){
        return new symkey.sender.EncSymkeySender(
            _args.obj, _args.skey, _args.sym_alg, _args.sym_opts);
    };
};

/**
 * As a receiver, retrieve data from a received encrypted symmetric key object.
 * <br />
 * You might pass an optional decryption key to decrypt the symmetric key in
 * the constructor, or omit it to decrypt later.
 * <br />
 * Please note: If passing an instance of this class as the first argument, a
 * clone will be returned.
 * @param {string|object} skey - Encrypted symmetric key object, either parsed
 * JSON or JSON string.
 * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} [deckey] -
 * The decryption key argument can be a string (which will be used directly
 * as a decryption key), or a shared secret object (the shared secret will
 * be used as a decryption key). A serialized shared secret object (JSON
 * string) will be recognized as well.
 * @class
 * @name EncSymkeyReceiver
 * @memberof nCrypt.asym.types.simple.message.symkey.receiver
 * */
var EncSymkeyReceiver = function(skey, deckey){
    
    if(typeof skey==='object'){
    try{
        if(skey instanceof symkey.receiver.EncSymkeyReceiver){
            return skey.clone();
        }
    }catch(e){} }
    
    var get_exp = function(exp){
        try{
            var e = ncrypt.exception.Create(exp);
            return (new SecureExec.exception.Exception(null,null,e));
        }catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    };
    
    /* Validate symmetric key type */
    if( (typeof skey!=='string' && typeof skey!=='object') ||
        (typeof skey==='string' && skey.length<1) ||
        (typeof skey==='object' && (skey===null || skey==={}))
    ){
        return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
    }
    /* Parse string or check object is JSON */
    if(typeof skey==='object'){
        // check whether this is valid JSON
        try{ JSON.stringify(skey); }catch(e){ 
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
    }
    if(typeof skey==='string'){
        try{ skey = JSON.parse(skey); }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.invalidArgument);
        }
    }
    
    /* Check whether we have a decryption shared secret */
    var shared_secret_from_serialized = function(obj){
        try{ var s = JSON.parse(obj); }catch(e){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        if(typeof s.t!=='undefined' && typeof s.k!=='undefined'){
            s = new tecies.SecretECIES(obj);
        }else{
            s = new tdh.SecretDH(obj);
        }
        if(_isExp(s)){
            throw (new ncrypt.exception.types.simple.message.symkey.
                invalidSharedSecretObject());
        }
        return s;
    };
    if(typeof deckey!=='undefined'){
        if(typeof deckey==='string' && deckey.length<1){
            if(deckey.indexOf('{')>=0){ // json, not a serialized secret
                deckey = SecureExec.sync.apply(
                    shared_secret_from_serialized, [deckey]);
                if(_isExp(deckey)) return deckey;
            }
        }
        if(typeof deckey==='object'){
            var is_sec_dh = (function(){
                try{
                    return (deckey instanceof tdh.SecretDH);
                }catch(e){ return false; }
            })();
            var is_sec_ecies = (function(){
                try{
                    return (deckey instanceof tecies.SecretECIES);
                }catch(e){ return false; }
            })();
            if(is_sec_dh || is_sec_ecies){
                deckey = deckey.getSecretValue();
            }else{
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }else{
            if(typeof deckey!=='string' || deckey.length<1){
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }
    }
    
    var _args = {};
    _args.skey = JSON.stringify(skey); _args.deckey = deckey;
    
    var _prop = {};
    
    /* Get shared secret type */
    _prop.stype = skey.t
    if(typeof _prop.stype!=='string' || 
       (_prop.stype!=='dh' && _prop.stype!=='ecies') 
    ){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.malformedInput);
    }
    
    /* Get tag in case of ecies */
    if(_prop.stype === 'ecies'){
        try{ _prop.tag = JSON.stringify(skey.tag); }catch(e){
            return get_exp(
            ncrypt.exception.types.simple.message.symkey.malformedInput);
        }
        _prop.tag = new tpoint.Point(_prop.tag);
        if(_isExp(_prop.tag)) return _prop.tag;
    }else{ _prop.tag = null; }
    
    /* Get the ID */
    _prop.id = skey.i;
    if(typeof _prop.id!=='string' || _prop.id.length<1 || _prop.id==='null'){
        return get_exp(
        ncrypt.exception.types.simple.message.symkey.malformedInput);
    }
    
    /* Get the encrypted symmetric key */
    _prop.skey = {};
    _prop.skey.enc = skey.k;
    try{ _prop.skey.enc = JSON.stringify(_prop.skey.enc); }
    catch(e){ return get_exp(
            ncrypt.exception.types.simple.message.symkey.malformedInput); }
    if(typeof deckey === 'string'){
        try{
            _prop.skey.clear = ncrypt.sym.sync.decrypt(_prop.skey.enc, deckey);
            if(_isExp(_prop.skey.clear)){
                _prop.skey.clear = false;
            }
        }catch(e){ _prop.skey.clear = false; }
    }
    
    /**
     * Decrypt the symmetric key. Please note this function does NOT return the
     * decrypted symmetric key. It returns a boolean telling whether it could
     * decrypt or not.
     * <br />
     * The decryption key argument can be a string (which will be used directly
     * as a decryption key), or a shared secret object (the shared secret will
     * be used as a decryption key). A serialized shared secret object (JSON
     * string) will be recognized as well.
     * @param {string|nCrypt.asym.types.shared.dh.SecretDH|nCrypt.asym.types.shared.ecies.SecretECIES} deckey
     * @returns {boolean}
     * @name decryptSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.decryptSymkey = function(deckey){
        if(typeof deckey==='string' && deckey.length<1){
            if(deckey.indexOf('{')>=0){ // json, not a serialized secret
                deckey = SecureExec.sync.apply(
                    shared_secret_from_serialized, [deckey]);
                if(_isExp(deckey)) return deckey;
            }
        }
        if(typeof deckey==='object'){
            var is_sec_dh = (function(){
                try{
                    return (deckey instanceof tdh.SecretDH);
                }catch(e){ return false; }
            })();
            var is_sec_ecies = (function(){
                try{
                    return (deckey instanceof tecies.SecretECIES);
                }catch(e){ return false; }
            })();
            if(is_sec_dh || is_sec_ecies){
                deckey = deckey.getSecretValue();
            }else{
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }else{
            if(typeof deckey!=='string' || deckey.length<1){
                return get_exp(
                ncrypt.exception.types.simple.message.symkey.invalidArgument);
            }
        }
        try{
        _prop.skey.clear = ncrypt.sym.sync.decrypt(_prop.skey.enc, deckey);
            if(_isExp(_prop.skey.clear)){
                _prop.skey.clear = false;
            }
        }catch(e){ _prop.skey.clear = false; }
        if(typeof _prop.skey.clear==='string'){
            _args.deckey = deckey+'';
        }
        // should be a string after successful decryption
        return (typeof _prop.skey.clear!=='boolean'); 
    }; 
    
    /**
     * Get the decrypted symmetric key. If the symmetric key wasn't decrypted
     * successfully yet, returns false.
     * @returns {string|boolean}
     * @name getDecryptedSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getDecryptedSymkey = function(){
        if(typeof _prop.skey.clear!=='string') return false;
        return _prop.skey.clear+'';
    };
    
    /**
     * Get the encrypted symmetric key.
     * @returns {string}
     * @name getEncryptedSymkey
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getEncryptedSymkey = function(){
        return _prop.skey.enc+'';
    };
    
    /**
     * Get the tag required to restore the secret if the shared secret the 
     * symmetric key was encrypted using was derived using ECIES. Otherwise,
     * return `null`.
     * @returns {nCrypt.asym.types.basic.point.Point}
     * @name getTag
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getTag = function(){
        if(_prop.tag!==null) return _prop.tag.clone();
        return null;
    };
    
    /**
     * Get the receiver's public key ID.
     * @returns {string}
     * @name getID
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getID = function(){
        return _prop.id+'';
    };
    
    /**
     * Shared secret type of the shared secret which was used to encrypt the
     * symmetric key, i.e. 'dh' or 'ecies'.
     * @returns {string}
     * @name getSharedSecretType
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.getSharedSecretType = function(){
        return _prop.stype+'';
    };
    
    /**
     * Clone this object.
     * @returns {nCrypt.asym.types.simple.message.symkey.EncSymkeyReceiver}
     * @name clone
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.message.symkey.receiver.EncSymkeyReceiver#
     * */
    this.clone = function(){
        return new symkey.receiver.EncSymkeyReceiver(_args.skey, _args.deckey);
    };
};

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.sender
 * */
symkey.sender = {};
symkey.sender.EncSymkeySender = EncSymkeySender; // class

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr = {};

var create_basic_enc_symkey_array = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    var donef = function(arr){
        setTimeout(function(){ callback(arr, carry); }, 0); return;
    };
    var enc_symkey_from_arg = function(arg, fnargs){
        var skey = fnargs.skey;
        var sym_alg = fnargs.sym_alg;
        var sym_opts = fnargs.sym_opts;
        var runf = function(arg){
            try{
                if(arg instanceof symkey.sender.EncSymkeySender){
                    try{
                        return arg.clone();
                    }catch(e){
                        return new SecureExec.exception.Exception(null,null,e);
                    }
                }
            }catch(e){}
            if(typeof arg.shared_secret_object === 'object' ||
               typeof arg.shared_secret_object === 'string'){
                return new symkey.sender.EncSymkeySender(
                    arg.shared_secret_object, 
                    skey, sym_alg, sym_opts);
            }
            if(typeof arg.public_keyset === 'string'){
                if(typeof arg.local_keyset === 'string'){
                    // construct dh shared secret object
                    var ks_loc = arg.local_keyset;
                    if(typeof arg.local_keyset_pass === 'string'){
                        try{
                            var loc = JSON.parse(ks_loc);
                            if(typeof loc.enc==='object' && 
                               typeof loc.enc.priv==='object'){
                                ks_loc = tkeyset.store.encrypt.decrypt(
                                    ks_loc, arg.local_keyset_pass);
                            }
                        }catch(e){}
                    }
                    if(_isExp(ks_loc)) return ks_loc;
                    ks_loc = new tkeyset.Keyset(ks_loc);
                    if(_isExp(ks_loc)) return ks_loc;
                    
                    var ks_pub = tkeyset.pub.getPublicKeyset(arg.public_keyset);
                        if(_isExp(ks_pub)) return ks_pub;
                        ks_pub = new tkeyset.Keyset(ks_pub);
                        if(_isExp(ks_pub)) return ks_pub;
                    
                    if(!ks_pub.hasEncryptionKeypair() || 
                       !ks_loc.hasEncryptionKeypair() ){
                        var e = ncrypt.exception.Create(
                            ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair);
                        return (new 
                            SecureExec.exception.Exception(null,null,e));
                    }
                    
                    var kp_loc = ks_loc.getKeypairEncryption();
                    var kp_pub = ks_pub.getKeypairEncryption();
                    
                    var sec = new tdh.SecretDH(kp_loc, kp_pub);
                    if(_isExp(sec)) return sec;
                    return new symkey.sender.EncSymkeySender(
                        sec, skey, sym_alg, sym_opts);
                }else{
                    // construct ecies shared secret object
                    var ks_pub = tkeyset.pub.getPublicKeyset(arg.public_keyset);
                        if(_isExp(ks_pub)) return ks_pub;
                        ks_pub = new tkeyset.Keyset(ks_pub);
                        if(_isExp(ks_pub)) return ks_pub;
                    if(!ks_pub.hasEncryptionKeypair()){
                        var e = ncrypt.exception.Create(
                            ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair);
                        return (new 
                            SecureExec.exception.Exception(null,null,e));
                    }
                    var kp_pub = ks_pub.getKeypairEncryption();
                    var sec = new tecies.SecretECIES(kp_pub);
                    if(_isExp(sec)) return sec;
                    return new symkey.sender.EncSymkeySender(
                        sec, skey, sym_alg, sym_opts);
                }
            }
            throw new 
                ncrypt.exception.types.simple.message.symkey.invalidArgument();
        };
        return SecureExec.sync.apply(runf, [arg]);
    };
    var iterate_args_done = function(res){
        var res_a;
        if( !(_isExp(res)) ){  
            res_a = [];
            for(var k in res){
                var r = res[k];
                res_a.push(r);
            }
        }else{ res_a = res; }
        setTimeout(function(){ donef(res_a); }, 0); return;
    };
    var iterate_args = function(a, fnargs, res){
        if(typeof res==='undefined'){ res = {}; }
        if(a.length<1){ iterate_args_done(res); return; }
        var arg = a.shift();
        arg = enc_symkey_from_arg(arg, fnargs);
        if(_isExp(arg)){ iterate_args_done(arg); return; }
        var id = arg.getReceiverID();
        res['id_'+id] = arg;
        setTimeout(function(){ iterate_args(a, fnargs, res); }, 0); return;
    };
    var valid_args = function(a){
        if(typeof a!=='object' || !Array.isArray(a)){
            throw (new 
            ncrypt.exception.types.simple.message.symkey.invalidArgument());
        }
        return true;
    };
    var fargs = {
        'skey': skey, 
        'sym_alg': sym_alg, 
        'sym_opts': sym_opts
    };
    var val_args = SecureExec.sync.apply(valid_args, [args]);
    if(_isExp(val_args)){ donef(val_args); return; }
    iterate_args(args.slice(0), fargs);
};

/**
 * Create an array of encrypted symmetric key objects.
 * <br />
 * Argument @args is an array of argument objects, each providing arguments
 * to create an encrypted symmetric key array.
 * <br />
 * An object in @args can be nothing but an instance 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender}.
 * <br />
 * Another option is to construct an object containing a shared secret object.
 * The argument is something like { 'shared_secret_object': shared_sec_obj },
 * with `shared_sec_obj` an instance 
 * of {@link nCrypt.asym.types.shared.dh.SecretDH}
 * or {@link nCrypt.asym.types.shared.ecies.SecretECIES} (a serialized instance
 * i.e. a string is possible as well).
 * <br />
 * To construct the shared secret in this function, pass the keysets.
 * <br />
 * For an ECIES like shared secret, simply pass the public keyset (string /
 * serialized). The argument would be { 'public_keyset': public_keyset_str }.
 * <br />
 * For a DH shared secret, additionally pass the local keyset, 
 * i.e. { 'public_keyset': public_keyset_str, 'local_keyset': loc_ks_str }, or
 * if `loc_ks_str` is still encrypted, { 'public_keyset': public_keyset_str, 
 * 'local_keyset': loc_ks_str, 'local_keyset_pass': loc_ks_pass }.
 * <br />
 * The function callback is called with either an array of instances 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender} or
 * a `SecureExec` exception.
 * @param {object[]} args
 * @param {string} skey - Symmetric key the message will be encrypted using.
 * @param {string} sym_alg - Algorithm to use for symmetric encryption.
 * @param {object} [sym_opts]
 * @param {function} callback - Function like 
 * function([nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender[]|
 * SecureExec.exception.Exception] res, [*] carry)
 * @param {*} carry
 * @name createEncryptedSymkeyArray
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.createEncryptedSymkeyArray = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    create_basic_enc_symkey_array(
        args, skey, sym_alg, sym_opts, callback, carry
    );
};

/**
 * This function is about the same 
 * as {@link nCrypt.asym.types.simple.message.symkey.sender.arr.createEncryptedSymkeyArray},
 * but it results in a JSON object array right away instead of an array of 
 * instances of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender}.
 * @param {object[]} args
 * @param {string} skey - Symmetric key the message will be encrypted using.
 * @param {string} sym_alg - Algorithm to use for symmetric encryption.
 * @param {object} [sym_opts]
 * @param {function} callback - Function like 
 * function([object[]|SecureExec.exception.Exception] res, [*] carry)
 * @param {*} carry
 * @name createEncryptedSymkeyArrayJSON
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.createEncryptedSymkeyArrayJSON = 
function(args, skey, sym_alg, sym_opts, callback, carry){
    create_basic_enc_symkey_array(
        args, skey, sym_alg, sym_opts, function(r,c){
            if(_isExp(r)){
                callback(r, c); return;
            }
            r = symkey.sender.arr.symkeyArrayJSON(r);
            callback(r, c); return;
        }, carry
    );
};

/**
 * From an array of instances 
 * of {@link nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender},
 * create an array of simple JSON objects. These can be stringified easily and
 * sent over the network in a message.
 * @param {nCrypt.asym.types.simple.message.symkey.sender.EncSymkeySender[]} arr
 * @returns {object[]|SecureExec.exception.Exception} 
 * @name symkeyArrayJSON
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.sender.arr
 * */
symkey.sender.arr.symkeyArrayJSON = function(arr){
    var runf = function(arr){
        var res = [];
        if(typeof arr!=='object' || !Array.isArray(arr)){
            throw (new 
            ncrypt.exception.types.simple.message.symkey.invalidArgument());
        }
        for(var i=0; i<arr.length; i++){
            var a = arr[i];
            var r = a.getSymkeyObjectJSON();
            res.push(r);
        }
        return res;
    };
    return SecureExec.sync.apply(runf, [arr]);
};

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.receiver
 * */
symkey.receiver = {};
symkey.receiver.EncSymkeyReceiver = EncSymkeyReceiver; // class

/**
 * @namespace nCrypt.asym.types.simple.message.symkey.receiver.arr
 * */
symkey.receiver.arr = {};

/**
 * From a received encrypted symmetric key array (array of JSON objects), 
 * extract the one containing a symmetric key encrypted for a certain 
 * keyset (usually your local keyset). Returns null if no matching JSON
 * object is found.
 * @param {object[]} arr
 * @param {string} local_keyset
 * @returns {object}
 * @name extractItem
 * @function
 * @memberof nCrypt.asym.types.simple.message.symkey.receiver.arr
 * */
symkey.receiver.arr.extractItem = 
function(arr, local_keyset) {
    var ks = (function(local_keyset){
        var _ks;
        try{
            _ks = tkeyset.pub.getPublicKeyset(local_keyset);
            _ks = new tkeyset.Keyset(_ks);
            if(_isExp(_ks)) return _ks;
            if(!_ks.hasEncryptionKeypair()){
                throw (new ncrypt.exception.asym.simple.secret.
                                missingEncryptionKeypair());
            }
            return _ks;
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    })(local_keyset);
    if(_isExp(ks)) return ks;
    var ks_id = ks.getKeypairEncryption().getPublicKeyIDs().txt.normal;
    var a = (function(){
        var runf = function(arr){
            if(typeof arr!=='object' || !Array.isArray(arr)){
                throw (new 
                ncrypt.exception.types.simple.message.symkey.invalidArgument());
            }
            return arr.slice(0);
        };
        return SecureExec.sync.apply(runf, [arr]);
    })(); if(_isExp(a)) return a;
    
    var itm = null;
    for(var i=0; i<a.length; i++){
        var sk = a[i];
        var id = (function(){
            try{
                var s = JSON.parse(JSON.stringify(sk));
                if(typeof s.i==='string'){
                    return s.i+'';
                }else{
                    throw (new 
                    ncrypt.exception.types.simple.message.symkey.
                    invalidArgument());
                }
            }catch(e){ 
                return (new SecureExec.exception.Exception(null,null,e)); }
        })();
        if(_isExp(id)) return id;
        if(id===ks_id){
            itm = a[i]; break;
        }
    }
    return itm;
};

return symkey; });

},{}],57:[function(require,module,exports){

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

var tbasic = deptypes.basic;
var tkey = deptypes.key;
var tshared = deptypes.shared;

/**
 * @namespace nCrypt.asym.types.simple
 * */
var  simple = {};
var _simple = {};

simple.keyset = require('./types/keyset.js');
simple.keyset = simple.keyset(ncrypt, { 'basic': tbasic, 'key': tkey });

simple.message = require('./message/message.js');
simple.message = simple.message(ncrypt, { 
    'basic': tbasic, 
    'key': tkey,
    'shared': tshared,
    'keyset': simple.keyset
});

return simple; });

},{"./message/message.js":55,"./types/keyset.js":58}],58:[function(require,module,exports){

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
var tkeypair = deptypes.key.keypair;
var SecureExec = ncrypt.dep.SecureExec;
var _isExp = SecureExec.tools.proto.inst.isException;

/**
 * @namespace nCrypt.asym.types.simple.keyset
 * */
var  keyset = {};
var _keyset = {};

/** 
 * Get a new keyset from two keypairs or an existing keyset (serialized or 
 * instance of this class).
 * <br />
 * Please note that a `Keyset` (or it's serialized version) 
 * contains **UNENCRYPTED PRIVATE KEY INFORMATION**. If storing a keyset 
 * (which is not a public only keyset, retrieved 
 * using {@link nCrypt.asym.types.simple.keyset.Keyset#getPublicKeyset}),
 * ALWAYS encrypt using the appropriate 
 * functions in {@link nCrypt.asym.types.simple.keyset.store}. Sending a keyset
 * containing private key information over the network is not recommended, even
 * if it is encrypted, as security then is reduced to the security of the 
 * password!
 * <br />
 * A `Keyset` cannot be restored from an encrypted serialized keyset. Please
 * decrypt (see functions in  {@link nCrypt.asym.types.simple.keyset.store}) 
 * before passing the string to this function.
 * <br />
 * Do not encrypt/decrypt directly using functions in {@link nCrypt.sym}. The
 * functions in {@link nCrypt.asym.types.simple.keyset.store} encrypt only the 
 * private parts of the keyset, saving space and keeping the public parts 
 * available.
 * <br />
 * To get the serialized public keyset from a serialized keyset, whether it 
 * already is public-only or not, whether it is encrypted or not, use 
 * the functions in {@link nCrypt.asym.types.simple.keyset.pub}.
 * @param {string|nCrypt.asym.types.simple.keyset.Keyset} keyp_enc - Either the
 * encryption keypair for the keyset to create, or an existing keyset 
 * (serialized, i.e. string, or object). To omit the encryption keypair, pass
 * null (for a signing only key).
 * @param {string} keyp_sig - Signing keypair for the keyset to create. To omit
 * the signing keypair, pass null (for an encryption only key). Please note:
 * Don't pass nothing here, but actually null, if @keyp_sig is undefined, it 
 * will be assumed @keyp_enc represents a serialized keyset, not a keypair.
 * @name Keyset
 * @class
 * @memberof nCrypt.asym.types.simple.keyset
 * */
var Keyset = function(keyp_enc, keyp_sig){
    var _kp_obj_enc; var _kp_obj_sig;
    var _public_only = false;
    
    if( (typeof keyp_enc==='object' && keyp_enc===null) &&
        (typeof keyp_sig==='object' && keyp_sig===null) ){
        var exp = ncrypt.exception.Create(
            ncrypt.exception.types.simple.keyset.invalidArgument);
        return (new SecureExec.exception.Exception(null,null,exp));
    }
    
    /* If this is an instance of Keyset, return the clone. */
    try{
        if(typeof keyp_enc==='object' && (keyp_enc instanceof Keyset)){
            return keyp_enc.clone();
        }
    }catch(e){}
    
    /* If this is a serialized Keyset, extract the key information. */
    if(typeof keyp_enc==='string' && typeof keyp_sig==='undefined'){
        var ks_str = keyp_enc;
        try{ ks_str = JSON.parse(keyp_enc);
             if(!(typeof ks_str.enc==='object' && ks_str.enc===null)){
                 keyp_enc = JSON.stringify(ks_str.enc);
             }else{ keyp_enc = null; }
             if(!(typeof ks_str.sig==='object' && ks_str.sig===null)){
                 keyp_sig = JSON.stringify(ks_str.sig);
             }else{ keyp_sig = null; }
        }catch(e){
            var exp = ncrypt.exception.Create(
                ncrypt.exception.types.simple.keyset.invalidArgument);
            return (new SecureExec.exception.Exception(null,null,exp));
        }
    }
    
    /* Get the encryption keypair if there should be one. */
    var kp_enc = null;
    if(!(typeof keyp_enc==='object' && keyp_enc===null)){
        kp_enc = new tkeypair.Keypair(keyp_enc);
        if(_isExp(kp_enc)) return kp_enc; 
        if(kp_enc.isPublicOnly()===true) _public_only = true;
    }
    
    /* Get the signing keypair if there should be one. */
    var kp_sig = null;
    if(!(typeof keyp_sig==='object' && keyp_sig===null)){
        kp_sig = new tkeypair.Keypair(keyp_sig);
        if(_isExp(kp_sig)) return kp_sig;
        if(kp_sig.isPublicOnly()===true) _public_only = true;
        /* Montgomery type curves do not support signing, verification will
         * always fail. */
        if(kp_sig.getType()==='mont'){
            var exp = ncrypt.exception.Create(
                ncrypt.exception.types.simple.keyset.invalidCurveTypeSigning);
            return (new SecureExec.exception.Exception(null,null,exp));
        }
    }
    
    /* If one of the keysets is public only, the keyset is public only. */
    if(_public_only){
        if( (kp_sig!==null && kp_sig.isPublicOnly()===true) && 
            (kp_enc!==null && kp_enc.isPublicOnly()!==true)){
                kp_enc = new tkeypair.Keypair(kp_enc.getPublicKeypair());
                if(_isExp(kp_enc)) return kp_enc; 
        }else if( (kp_enc!==null && kp_enc.isPublicOnly()===true) && 
                  (kp_sig!==null && kp_sig.isPublicOnly()!==true)){
                kp_sig = new tkeypair.Keypair(kp_sig.getPublicKeypair());
                if(_isExp(kp_sig)) return kp_sig; 
        }else{}
    }
    
    /* Get the serialized version of the encryption keyset. */
    if(kp_enc!==null){
        _kp_obj_enc = kp_enc;
        kp_enc = kp_enc.getSerialized();
        try{ kp_enc = JSON.parse(kp_enc); }
        catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    }else{ _kp_obj_enc = null; }
    
    /* Get the serialized version of the signing keyset. */
    if(kp_sig!==null){
        _kp_obj_sig = kp_sig;
        kp_sig = kp_sig.getSerialized();
        try{ kp_sig = JSON.parse(kp_sig); }
        catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    }else{ _kp_obj_sig = null; }
    
    /* Parse the keypairs to make sure no space is wasted by JSON escaping. */
    var _kp_enc = kp_enc;
    var _kp_sig = kp_sig;
    var _json_obj = { 'enc': _kp_enc, 'sig': _kp_sig };
    var _json_str = '';
    try{ _json_str = JSON.stringify(_json_obj); }
    catch(e){ return new SecureExec.exception.Exception(null,null,e); }
    
    /* Define a public only keyset (serialized and parsed JSON). */
    var _public_keyset_obj = JSON.parse(_json_str);
    if(_public_keyset_obj.enc!==null) _public_keyset_obj.enc.priv = null; 
    if(_public_keyset_obj.sig!==null) _public_keyset_obj.sig.priv = null;
    var _public_keyset_str = JSON.stringify(_public_keyset_obj);
    
    /* Calculate public keyset IDs */
    var _id_pub_str = '';
    if(_kp_obj_sig!==null) _id_pub_str += 
        _kp_obj_sig.getPublic().getSerialized();
    if(_kp_obj_enc!==null) _id_pub_str += 
        _kp_obj_enc.getPublic().getSerialized();
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
     * Get the serialized version of this keyset. Please note: This 
     * contains **unencrypted private key information**. Encrypt before storing
     * it anywhere.
     * @name getSerialized
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getSerialized = function(){
        if(_public_only){ return _public_keyset_str+''; }
        return _json_str+'';
    };
    /**
     * Get the signing keypair.
     * @name getKeypairSigning
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getKeypairSigning = function(){
        if(_kp_obj_sig!==null) return _kp_obj_sig.clone();
        return null;
    };
    /**
     * Check whether this keyset supports signing (has a signing keypair.)
     * @name hasSigningKeypair
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.hasSigningKeypair = function(){
        return (_kp_obj_sig!==null);
    };
    /**
     * Get the encryption keypair.
     * @name getKeypairEncryption
     * @returns {nCrypt.asym.types.key.keypair.Keypair}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getKeypairEncryption = function(){
        if(_kp_obj_enc!==null) return _kp_obj_enc.clone();
        return null;
    };
    /**
     * Check whether this keyset supports encryption (has an encryption 
     * keypair).
     * @name hasEncryptionKeypair
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.hasEncryptionKeypair = function(){
        return (_kp_obj_enc!==null);
    };
    
    /**
     * Get the public keyset from this keyset. This is the public key you
     * send over the network and give to contacts.
     * @name getPublicKeyset
     * @returns {string}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getPublicKeyset = function(){
        return _public_keyset_str+'';
    };
    
    /**
     * Check whether this keyset contains public key information only, i.e. no
     * private key information.
     * @returns {boolean}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.isPublicKeyset = function(){
        return _public_only;
    };
    
    /**
     * Get an object with public keyset IDs. The object returned is an object 
     * like {'txt': { 'normal': [string](normal length id to be represented as 
     * text), 'short': [string](shorter length id to be represented as text) },
     * 'col': { 'normal': [string[]](normal length id to be represented as 
     * colors - array of hex-strings), [string[]](shorter length id to be 
     * represented as colors - array of hex strings) }}.
     * <br />
     * Please note: The IDs are simply hashes for BOTH signing and encryption
     * public key if both are present, i.e. the ID represents the keyset. To 
     * get the ID for the encryption keypair or signing keypair, use the 
     * functions to get these keypairs and call their 'getPublicKeyIDs' 
     * functions.
     * @returns {object}
     * @name getPublicKeyIDs
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.getPublicKeyIDs = function(){
        try{
            return JSON.parse(JSON.stringify(_id));
        }catch(e){ return (new SecureExec.exception.Exception(null,null,e)); }
    };
    
    /**
     * @name clone
     * @returns {nCrypt.asym.types.simple.keyset.Keyset}
     * @member {Function}
     * @memberof nCrypt.asym.types.simple.keyset.Keyset#
     * */
    this.clone = function(){
        return new Keyset(_json_str+'');
    };
};
keyset.Keyset = Keyset;

/**
 * @namespace nCrypt.asym.types.simple.keyset.store
 * */
keyset.store = {};

/**
 * @namespace nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt = {};

/**
 * Encrypt a (serialized) keyset. This function only encrypts the private key
 * information contained in the secret, leaving the public key information 
 * intact. 
 * <br />
 * A keyset can / should not be encrypted twice, so if this is encrypted 
 * already, decrypt.
 * @param {string} ks - Serialized keyset. 
 * @param {string} pass - Password to use for encryption.
 * @param {string} [sym_alg] - Symmetric algorithm.
 * @param {object} [sym_opts]
 * @returns {string} 
 * @name encrypt
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.encrypt = function(ks, pass, sym_alg, sym_opts){
    var runf = function(ks, pass, sym_alg, sym_opts){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.encrypt(
                                kp_enc, pass, sym_alg, sym_opts);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.encrypt(
                                kp_sig, pass, sym_alg, sym_opts);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, [ks, pass, sym_alg, sym_opts]);
};
/**
 * Decrypt a keyset with encrypted private key information.
 * @param {string} ks - (Serialized) keyset with encrypted private key 
 * information.
 * @param {string} pass
 * @returns {string} 
 * @name decrypt
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.decrypt = function(ks, pass){
    var runf = function(ks, pass){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.decrypt(kp_enc, pass);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.decrypt(kp_sig, pass);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, [ks, pass]);
};
/**
 * Change the encryption options of a keypair. Change the password (to keep
 * it the same, simply pass the same string for old and new pass), and/or
 * the encryption options and algorithm. If algorithm and options are omitted,
 * existing options are used.
 * @param {string} ks - Serialized keyset. 
 * @param {string} old_pass
 * @param {string} new_pass
 * @param {string} [sym_alg] - Symmetric algorithm.
 * @param {object} [sym_opts]
 * @name change
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.store.encrypt
 * */
keyset.store.encrypt.change = function(ks, 
                                       old_pass, new_pass, 
                                       sym_alg, sym_opts){
    var runf = function(ks, old_pass, new_pass, sym_alg, sym_opts){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        var kp_enc = ks.enc;
        if(kp_enc!==null) kp_enc = JSON.stringify(kp_enc);
        var kp_sig = ks.sig;
        if(kp_sig!==null) kp_sig = JSON.stringify(kp_sig);
        if(kp_enc!==null){
            kp_enc = tkeypair.store.encrypt.change(
                                kp_enc, old_pass, new_pass, sym_alg, sym_opts);
            if(_isExp(kp_enc)) return kp_enc;
            kp_enc = JSON.parse(kp_enc);
        }
        if(kp_sig!==null){
            kp_sig = tkeypair.store.encrypt.change(
                                kp_sig, old_pass, new_pass, sym_alg, sym_opts);
            if(_isExp(kp_sig)) return kp_sig;
            kp_sig = JSON.parse(kp_sig);
        }
        var res = { 'enc': kp_enc, 'sig': kp_sig };
        return JSON.stringify(res);
    };
    return SecureExec.sync.apply(runf, 
            [ks, old_pass, new_pass, sym_alg, sym_opts]);
};

/**
 * @namespace nCrypt.asym.types.simple.keyset.pub
 * */
keyset.pub = {};

/**
 * Get a public keyset from a (serialized) keyset. It doesn't matter if this
 * is a public keyset already, or if it contains encrypted or unencrypted 
 * private key information.
 * @param {string} ks - (Serialized) keyset.
 * @returns {string}
 * @name getPublicKeyset
 * @function
 * @memberof nCrypt.asym.types.simple.keyset.pub
 * */
keyset.pub.getPublicKeyset = function(ks){
    var runf = function(){
        try{ ks = JSON.parse(ks); }catch(e){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset(); }
        if(typeof ks.enc==='undefined' || typeof ks.sig==='undefined'){
            throw new nCrypt.exception.types.simple.keyset.malformedKeyset();
        }
        if(ks.enc!==null) ks.enc.priv = null;
        if(ks.sig!==null) ks.sig.priv = null;
        return JSON.stringify(ks);
    };
    return SecureExec.sync.apply(runf, [ ks ]);
};

return keyset; });

},{}],59:[function(require,module,exports){

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
 * @namespace nCrypt.asym.types
 * */
var  types = {};
var _types = {};

types.basic = require('./basic/basic.js');
types.basic = types.basic(ncrypt);

types.key = require('./key/key.js');
types.key = types.key(ncrypt, { 'basic': types.basic });

types.shared = require('./shared/shared.js');
types.shared = types.shared(ncrypt, { 'basic': types.basic, 'key': types.key });

types.signature = require('./signature/signature.js');
types.signature = types.signature(ncrypt, 
                            { 'basic': types.basic, 'key': types.key });

types.simple = require('./simple/simple.js');
types.simple = types.simple(ncrypt, { 
    'basic': types.basic, 
    'key': types.key,
    'shared': types.shared
});

return types; });

},{"./basic/basic.js":43,"./key/key.js":48,"./shared/shared.js":50,"./signature/signature.js":53,"./simple/simple.js":57}],60:[function(require,module,exports){

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

var dep = {};
dep.randomCollector = require('./dependencies/ncrypt-random-collector');
dep.SecureExec = require('./dependencies/secureexec');
dep.sjcl = require('./dependencies/ncrypt-sjcl');
dep.SparkMD5 = require('spark-md5');
dep.titaniumcore = require('./dependencies/ncrypt-titaniumcore');
dep.bnjs = require('bn.js');
dep.elliptic = require('elliptic');

module.exports = dep;

},{"./dependencies/ncrypt-random-collector":62,"./dependencies/ncrypt-sjcl":68,"./dependencies/ncrypt-titaniumcore":70,"./dependencies/secureexec":86,"bn.js":1,"elliptic":4,"spark-md5":36}],61:[function(require,module,exports){
var evt = {};

_listeners = {};

evt.listener = {};
evt.listener.add = function(name, listener, ctx){
    if(typeof ctx==='undefined' || 
       (typeof ctx==='object' && ctx===null)){
        if(typeof self.document!=='undefined'){
            ctx = self.document;
        }else{
            ctx = self;
        }
    }
    try{
        ctx.addEventListener(name, listener, false);
    }catch(e){ return e; }
    
    if(typeof _listeners[name]!=='object'){
        _listeners[name] = [];
    }
    _listeners[name].push(listener);
    return true;
};

evt.listener.remove = function(name, listener, ctx){
    if(typeof ctx==='undefined' || 
       (typeof ctx==='object' && ctx===null)){
        if(typeof self.document!=='undefined'){
            ctx = self.document;
        }else{
            ctx = self;
        }
    }
    if(typeof listener==='undefined' ||
       (typeof listener==='object' && listener===null)){
           try{
               var lst = _listeners[name];
               if(typeof lst!=='object' || lst===null) return true;
               for(var i=0; i<lst.length; i++){
                    var l = lst[i];
                    ctx.removeEventListener(name, l, false);
               }
           }catch(e){ return e; }
    }else{
        try{
            ctx.removeEventListener(name, listener, false);
        }catch(e){ return e; }
    }
    return true;
};

module.exports = evt;

},{}],62:[function(require,module,exports){
/**
 * @namespace randomCollector
 * */
var collector = {};

var _evt = require('./event/event.js');
var _pos = require('./position/position.js');
    _pos = _pos({ 'evt': _evt });

var _source = {};
    _source.user = require('./random/source/user.js');
    _source.user = _source.user({ 'pos': _pos });
    _source.machine = require('./random/source/machine.js');
    _source.machine = _source.machine({});

collector.random = require('./random/random.js');
collector.random = collector.random({'source': _source});

module.exports = collector;

},{"./event/event.js":61,"./position/position.js":63,"./random/random.js":64,"./random/source/machine.js":65,"./random/source/user.js":66}],63:[function(require,module,exports){
var pos = function(dep){

var pos = {};
var evt = dep.evt;

var _handler = null;
var _get_handler = function(recv){
    var fn = function(e){
        var p = { 'x' : null, 'y' : null };
        if(e.type == 'touchstart' || 
           e.type == 'touchmove' || 
           e.type == 'touchend' || 
           e.type == 'touchcancel'){
            var touch = e.originalEvent.changedTouches[0] || 
                        e.originalEvent.touches[0];
            p.x = touch.clientX || touch.pageX;
            p.y = touch.clientY || touch.pageY;
        }else if (e.type == 'mousedown' || 
                   e.type == 'mouseup' || 
                   e.type == 'mousemove' || 
                   e.type == 'mouseover'|| 
                   e.type=='mouseout' || 
                   e.type=='mouseenter' || 
                   e.type=='mouseleave') {
            p.x = e.clientX || e.pageX;
            p.y = e.clientY || e.pageY;
        }else {};
        recv(p);
        e.preventDefault();
    };
    return fn;
};

pos.listen = {};
pos.listen.start = function(handler){
    if(!(typeof _handler==='object' && _handler===null)) return false;
    var ctxt = self;
    if(typeof self.document!=='undefined') ctxt = self.document;
    var h = _get_handler(handler);
    var e_touch = evt.listener.add('touchmove', h, ctxt);
    var e_mouse = evt.listener.add('mousemove', h, ctxt);
    if(typeof e_touch!=='boolean' && typeof e_mouse!=='boolean'){
        return false;
    }
    _handler = h;
    return true;
};

pos.listen.stop = function(){
    if(typeof _handler==='object' && _handler===null) return true;
    var ctxt = self;
    if(typeof self.document!=='undefined') ctxt = self.document;
    var e_touch = evt.listener.remove('touchmove', _handler, ctxt);
    var e_mouse = evt.listener.remove('mousemove', _handler, ctxt);
    if(typeof e_touch!=='boolean' && typeof e_mouse!=='boolean'){
        return false;
    }
    _handler = null;
    return true;
};


return pos;
};
module.exports = pos;

},{}],64:[function(require,module,exports){
/**
 * @namespace randomCollector.random
 * */
var rand = function(dep){
var rand = {};

var _sources = dep.source;

var _source = {
    'USER': 'user',
    'MACHINE': 'machine'
};
rand.source = (function(){ return JSON.parse(JSON.stringify(_source)); })();

/**
 * @namespace randomCollector.random.check
 * */
rand.check = {};
/**
 * Check whether a built-in random generator is available. If so, random
 * values can be collected using `randomCollector.random.source.MACHINE` as
 * a source.
 * @returns {boolean}
 * @name hasBuiltInRNG
 * @function
 * @memberof randomCollector.random.check
 * */
rand.check.hasBuiltInRNG = function(){
    return (_sources.machine.isSupported()===true);
};

/**
 * Check whether mouse or touch support is available. If so, random values 
 * can be collected from user interaction using 
 * `randomCollector.random.source.USER` as a source. (Mouse or touch support
 * usually is available when running in a browser.)
 * @returns {boolean}
 * @name hasMouseOrTouchSupport
 * @function
 * @memberof randomCollector.random.check
 * */
rand.check.hasMouseOrTouchSupport = function(){
    if(typeof self!=='object' || self===null) return false;
    if(typeof self.document!=='object' || self.document===null) return false;
    if(('onmousemove' in self.document)===true) return true;
    if(('ontouchmove' in self.document)===true) return true;
    return false;
};

/**
 * Collect random values either from user interaction (i.e. mousemoves or 
 * touchmoves) or from built-in random number generators.
 * @param {string} collector_source - Collector source, i.e. 'machine' or 
 * 'user'. A value found in {@link randomCollector.random.source}.
 * @param {object} uintarr - A typed array of a certain length. Only unsigned
 * integer arrays (`Uint8Array`, `Uint16Array`, `Uint32Array`) are supported.
 * To generate an empty `Uint8Array` with 256 elements for example, 
 * call `var ab = new Uint8Array(256);`. Please note the array passed will stay
 * unchanged, the random values array will be passed to the callback.
 * @param {function} cb_done - function([TypedArray] random_values). Will be 
 * called as a final callback, the types array filled with random values passed
 * as an argument.
 * @param {function} cb_progress - Progress callback. Will only be called at all
 * if collecting random values from user interaction. function([int] 
 * progress_in_percent).
 * @returns {boolean} - True, if collecting values could be started, false 
 * otherwise. (For example in case of invalid arguments.)
 * @name collect
 * @function
 * @memberof randomCollector.random
 * */
rand.collect = function(collector_source, uintarr, cb_done, cb_progress){
    /* Validate */
    if(typeof collector_source!=='string' || typeof cb_done!=='function')
    { return false; }
    var source_valid = false;
    for(var k in _source){
        var s = _source[k];
        if(s===collector_source) source_valid = true;
    }
    if(!source_valid) return false;
    /* Get source */
    var cs = _sources[collector_source];
    return cs.collect(uintarr, cb_done, cb_progress);
};

return rand;
};
module.exports = rand;

},{}],65:[function(require,module,exports){
var machine = function(dep){

if(typeof require==='function' && typeof crypto==='undefined'){
    // make browserify not browserify the crypto module... any way to 
    // obfuscate
    try{
        var cr = [ 'c', 'r', 'y', 'p', 't', 'o' ];
            cr = cr.join('');
        crypto = require(cr);
    }catch(e){}
}

var _is_supported = function(){
    if((typeof crypto!=='object' || crypto===null) &&
       (typeof msCrypto!=='object' || msCrypto===null)) return false;
    if(typeof crypto==='object' && 
       crypto!==null && 
       typeof crypto.getRandomValues==='function') return true;
    if(typeof msCrypto==='object' && 
       msCrypto!==null && 
       typeof msCrypto.getRandomValues==='function') return true;
    if(typeof crypto==='object' && 
       crypto!==null && 
       typeof crypto.randomBytes==='function') return true;
    return false;
};

var _get_buffer = function(len){
    if(typeof len!=='number') return false;
    try{ len = parseInt(len); }catch(e){ return false; }
    var ab = null;
    if(typeof crypto!=='undefined' && crypto!==null && 
       typeof crypto.randomBytes==='function'){
        try{
            var a = crypto.randomBytes(len);
            ab = new Uint8Array(a);
        }catch(e){ return false; }
    }else if(typeof crypto!=='undefined' && crypto!==null && 
       typeof crypto.getRandomValues==='function'){
           ab = new Uint8Array(len);
           try{ crypto.getRandomValues(ab); }catch(e){ return false; }
    }else if(typeof msCrypto!=='undefined' && msCrypto!==null && 
       typeof msCrypto.getRandomValues==='function'){
           ab = new Uint8Array(len);
           try{ msCrypto.getRandomValues(ab); }catch(e){ return false; }
    }else{ return false; }
    if(ab===null) return false;
    return ab;
};

var _fill = function(uintarr){
    // Get the required typed array type and buffer length
    var _int_len = null; var _buf_len = null;
    if(typeof uintarr!=='object' || uintarr===null) return false;
    if(uintarr instanceof Uint8Array){
        _int_len = 8;
        _buf_len = uintarr.length;
    }else if(uintarr instanceof Uint16Array){
        _int_len = 16;
        _buf_len = uintarr.length*2;
    }else if(uintarr instanceof Uint32Array){
        _int_len = 32;
        _buf_len = uintarr.length*4;
    }else{ return false; }
    // Fill the buffer source
    var _buffer_source = _get_buffer(_buf_len);
    // Create the result array
    var ab;
    if(uintarr instanceof Uint8Array){
        ab = new Uint8Array(_buffer_source.buffer);
    }else if(uintarr instanceof Uint16Array){
        ab = new Uint16Array(_buffer_source.buffer);
    }else if(uintarr instanceof Uint32Array){
        ab = new Uint32Array(_buffer_source.buffer);
    }else{ return false; }
    return ab;
};

machine.isSupported = function(){
    return (_is_supported()===true);
};
machine.collect = function(uintarr, cb_done){
    if(!_is_supported()) return false;
    if(typeof cb_done!=='function'){ return false; }
    var ab = _fill(uintarr);
    if(typeof ab==='boolean') return false;
    setTimeout(function(){
        cb_done(ab);
    }, 0);
    return true;
};

return machine;
};
module.exports = machine;

},{}],66:[function(require,module,exports){
var user = function(dep){

var pos = dep.pos;
var user = {};

var _array_shuffle = function(a){
    var input = [];
    for(var j=0; j<a.length; j++){ input[j] = a[j]; }
    for (var i = input.length-1; i >=0; i--) {
        var randomIndex = Math.floor(Math.random()*(i+1));
        var itemAtIndex = input[randomIndex];
        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
};
var _byte_from_pos = function(p){
    if(typeof p.x!=='number' && typeof p.y!=='number') return null;
    var x = p.x; if(typeof x!=='number') x = 0;
    var y = p.y; if(typeof y!=='number') y = 0;
    if(x===0 && y===0) return null;
    var n;
    if(x===0){
        n = y;
    }else if(y===0){
        n = x;
    }else{
        var r = Math.floor(Math.random() * (2 - 0)) + 0;
        if(r===0){ n = x; }else{ n = y; }
    }
    if(n>255){
        var s = n.toString()+'';
            s = s.split('');
            s = _array_shuffle(s);
        if(s.length<3){ n = s; }else{ n = [ s[0], s[1], s[2] ] }
        n = n.join('');
        n = parseInt(n);
    }
    return n;
};

// Uint8Array which will be filled with random values. It's buffer will be used
// for the output arrays.
var _buffer_source = null;

// Output array, will be filled with values from @_buffer_source.
var _out_array = null;
var _int_len = null;
var _buf_len = null;
var _fill_count = 0;
// Callbacks
var _callback_progress = null;
var _callback_done = null;

var _collect_handler = function(p){
    var rbyte = _byte_from_pos(p);
    if(typeof rbyte==='number'){
        _buffer_source[_fill_count] = rbyte;
        _fill_count += 1;
    }
    if(typeof _callback_progress==='function'){
        var prg = Math.round((_fill_count/_buf_len)*100);
        _callback_progress(prg);
    }
    if(_fill_count === _buffer_source.length){
        _stop();
    }
};

var _start = function(uintarr){
    if(!(typeof _buffer_source==='object' && _buffer_source===null)){
        return false; // collect is still running, can't start
    }
    // Get the required typed array type and buffer length
    if(typeof uintarr!=='object' || uintarr===null) return false;
    if(uintarr instanceof Uint8Array){
        _int_len = 8;
        _buf_len = uintarr.length;
    }else if(uintarr instanceof Uint16Array){
        _int_len = 16;
        _buf_len = uintarr.length*2;
    }else if(uintarr instanceof Uint32Array){
        _int_len = 32;
        _buf_len = uintarr.length*4;
    }else{ return false; }
    // Create buffer source
    _fill_count = 0;
    _buffer_source = new Uint8Array(_buf_len);
    // Start collecting values from user interaction
    return pos.listen.start(_collect_handler);
};
var _stop = function(){
    var ab;
    if(_int_len===8){
        ab = new Uint8Array(_buffer_source.buffer);
    }else if(_int_len===16){
        ab = new Uint16Array(_buffer_source.buffer);
    }else{
        ab = new Uint32Array(_buffer_source.buffer);
    }
    /* Reset values */
    _buffer_source = null;
    _out_array = null;
    _int_len = null;
    _buf_len = null;
    _fill_count = 0;
    _callback_progress = null;
    /* Callback */
    _callback_done(ab);
    _callback_done = null;
    return pos.listen.stop();
};

user.collect = function(uintarr, cb_done, cb_progress){
    if(typeof uintarr!=='object' ||
       typeof cb_done!=='function' ||
       (typeof cb_progress!=='undefined' && typeof cb_progress!=='function'))
    { return false; }
    if(!(uintarr instanceof Uint8Array ||
         uintarr instanceof Uint16Array ||
         uintarr instanceof Uint32Array ))
    { return false; }
    _callback_done = cb_done;
    if(typeof cb_progress==='function'){ _callback_progress = cb_progress; }
    return _start(uintarr);
};

return user;
};
module.exports = user;

},{}],67:[function(require,module,exports){
/** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

"use strict";
/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
/*global document, window, escape, unescape, module, require, Uint32Array */

/** @namespace The Stanford Javascript Crypto Library, top-level namespace. */
var sjcl = {
  /** @namespace Symmetric ciphers. */
  cipher: {},

  /** @namespace Hash functions.  Right now only SHA256 is implemented. */
  hash: {},

  /** @namespace Key exchange functions.  Right now only SRP is implemented. */
  keyexchange: {},
  
  /** @namespace Block cipher modes of operation. */
  mode: {},

  /** @namespace Miscellaneous.  HMAC and PBKDF2. */
  misc: {},
  
  /**
   * @namespace Bit array encoders and decoders.
   *
   * @description
   * The members of this namespace are functions which translate between
   * SJCL's bitArrays and other objects (usually strings).  Because it
   * isn't always clear which direction is encoding and which is decoding,
   * the method names are "fromBits" and "toBits".
   */
  codec: {},
  
  /** @namespace Exceptions. */
  exception: {
    /** @constructor Ciphertext is corrupt. */
    corrupt: function(message) {
      this.toString = function() { return "CORRUPT: "+this.message; };
      this.message = message;
    },
    
    /** @constructor Invalid parameter. */
    invalid: function(message) {
      this.toString = function() { return "INVALID: "+this.message; };
      this.message = message;
    },
    
    /** @constructor Bug or missing feature in SJCL. @constructor */
    bug: function(message) {
      this.toString = function() { return "BUG: "+this.message; };
      this.message = message;
    },

    /** @constructor Something isn't ready. */
    notReady: function(message) {
      this.toString = function() { return "NOT READY: "+this.message; };
      this.message = message;
    }
  }
};

if(typeof module !== 'undefined' && module.exports){
  module.exports = sjcl;
}
if (typeof define === "function") {
    define([], function () {
        return sjcl;
    });
}

/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 *
 * @class Advanced Encryption Standard (low-level interface)
 */
sjcl.cipher.aes = function (key) {
  if (!this._tables[0][0][0]) {
    this._precompute();
  }
  
  var i, j, tmp,
    encKey, decKey,
    sbox = this._tables[0][4], decTable = this._tables[1],
    keyLen = key.length, rcon = 1;
  
  if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
    throw new sjcl.exception.invalid("invalid aes key size");
  }
  
  this._key = [encKey = key.slice(0), decKey = []];
  
  // schedule encryption keys
  for (i = keyLen; i < 4 * keyLen + 28; i++) {
    tmp = encKey[i-1];
    
    // apply sbox
    if (i%keyLen === 0 || (keyLen === 8 && i%keyLen === 4)) {
      tmp = sbox[tmp>>>24]<<24 ^ sbox[tmp>>16&255]<<16 ^ sbox[tmp>>8&255]<<8 ^ sbox[tmp&255];
      
      // shift rows and add rcon
      if (i%keyLen === 0) {
        tmp = tmp<<8 ^ tmp>>>24 ^ rcon<<24;
        rcon = rcon<<1 ^ (rcon>>7)*283;
      }
    }
    
    encKey[i] = encKey[i-keyLen] ^ tmp;
  }
  
  // schedule decryption keys
  for (j = 0; i; j++, i--) {
    tmp = encKey[j&3 ? i : i - 4];
    if (i<=4 || j<4) {
      decKey[j] = tmp;
    } else {
      decKey[j] = decTable[0][sbox[tmp>>>24      ]] ^
                  decTable[1][sbox[tmp>>16  & 255]] ^
                  decTable[2][sbox[tmp>>8   & 255]] ^
                  decTable[3][sbox[tmp      & 255]];
    }
  }
};

sjcl.cipher.aes.prototype = {
  // public
  /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */
  
  /**
   * Encrypt an array of 4 big-endian words.
   * @param {Array} data The plaintext.
   * @return {Array} The ciphertext.
   */
  encrypt:function (data) { return this._crypt(data,0); },
  
  /**
   * Decrypt an array of 4 big-endian words.
   * @param {Array} data The ciphertext.
   * @return {Array} The plaintext.
   */
  decrypt:function (data) { return this._crypt(data,1); },
  
  /**
   * The expanded S-box and inverse S-box tables.  These will be computed
   * on the client so that we don't have to send them down the wire.
   *
   * There are two tables, _tables[0] is for encryption and
   * _tables[1] is for decryption.
   *
   * The first 4 sub-tables are the expanded S-box with MixColumns.  The
   * last (_tables[01][4]) is the S-box itself.
   *
   * @private
   */
  _tables: [[[],[],[],[],[]],[[],[],[],[],[]]],

  /**
   * Expand the S-box tables.
   *
   * @private
   */
  _precompute: function () {
   var encTable = this._tables[0], decTable = this._tables[1],
       sbox = encTable[4], sboxInv = decTable[4],
       i, x, xInv, d=[], th=[], x2, x4, x8, s, tEnc, tDec;

    // Compute double and third tables
   for (i = 0; i < 256; i++) {
     th[( d[i] = i<<1 ^ (i>>7)*283 )^i]=i;
   }
   
   for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
     // Compute sbox
     s = xInv ^ xInv<<1 ^ xInv<<2 ^ xInv<<3 ^ xInv<<4;
     s = s>>8 ^ s&255 ^ 99;
     sbox[x] = s;
     sboxInv[s] = x;
     
     // Compute MixColumns
     x8 = d[x4 = d[x2 = d[x]]];
     tDec = x8*0x1010101 ^ x4*0x10001 ^ x2*0x101 ^ x*0x1010100;
     tEnc = d[s]*0x101 ^ s*0x1010100;
     
     for (i = 0; i < 4; i++) {
       encTable[i][x] = tEnc = tEnc<<24 ^ tEnc>>>8;
       decTable[i][s] = tDec = tDec<<24 ^ tDec>>>8;
     }
   }
   
   // Compactify.  Considerable speedup on Firefox.
   for (i = 0; i < 5; i++) {
     encTable[i] = encTable[i].slice(0);
     decTable[i] = decTable[i].slice(0);
   }
  },
  
  /**
   * Encryption and decryption core.
   * @param {Array} input Four words to be encrypted or decrypted.
   * @param dir The direction, 0 for encrypt and 1 for decrypt.
   * @return {Array} The four encrypted or decrypted words.
   * @private
   */
  _crypt:function (input, dir) {
    if (input.length !== 4) {
      throw new sjcl.exception.invalid("invalid aes block size");
    }
    
    var key = this._key[dir],
        // state variables a,b,c,d are loaded with pre-whitened data
        a = input[0]           ^ key[0],
        b = input[dir ? 3 : 1] ^ key[1],
        c = input[2]           ^ key[2],
        d = input[dir ? 1 : 3] ^ key[3],
        a2, b2, c2,
        
        nInnerRounds = key.length/4 - 2,
        i,
        kIndex = 4,
        out = [0,0,0,0],
        table = this._tables[dir],
        
        // load up the tables
        t0    = table[0],
        t1    = table[1],
        t2    = table[2],
        t3    = table[3],
        sbox  = table[4];
 
    // Inner rounds.  Cribbed from OpenSSL.
    for (i = 0; i < nInnerRounds; i++) {
      a2 = t0[a>>>24] ^ t1[b>>16 & 255] ^ t2[c>>8 & 255] ^ t3[d & 255] ^ key[kIndex];
      b2 = t0[b>>>24] ^ t1[c>>16 & 255] ^ t2[d>>8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
      c2 = t0[c>>>24] ^ t1[d>>16 & 255] ^ t2[a>>8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
      d  = t0[d>>>24] ^ t1[a>>16 & 255] ^ t2[b>>8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
      kIndex += 4;
      a=a2; b=b2; c=c2;
    }
        
    // Last round.
    for (i = 0; i < 4; i++) {
      out[dir ? 3&-i : i] =
        sbox[a>>>24      ]<<24 ^ 
        sbox[b>>16  & 255]<<16 ^
        sbox[c>>8   & 255]<<8  ^
        sbox[d      & 255]     ^
        key[kIndex++];
      a2=a; a=b; b=c; c=d; d=a2;
    }
    
    return out;
  }
};


/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Arrays of bits, encoded as arrays of Numbers.
 *
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
  /**
   * Array slices in units of bits.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
   * slice until the end of the array.
   * @return {bitArray} The requested slice.
   */
  bitSlice: function (a, bstart, bend) {
    a = sjcl.bitArray._shiftRight(a.slice(bstart/32), 32 - (bstart & 31)).slice(1);
    return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend-bstart);
  },

  /**
   * Extract a number packed into a bit array.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} length The length of the number to extract.
   * @return {Number} The requested slice.
   */
  extract: function(a, bstart, blength) {
    // FIXME: this Math.floor is not necessary at all, but for some reason
    // seems to suppress a bug in the Chromium JIT.
    var x, sh = Math.floor((-bstart-blength) & 31);
    if ((bstart + blength - 1 ^ bstart) & -32) {
      // it crosses a boundary
      x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
      // within a single word
      x = a[bstart/32|0] >>> sh;
    }
    return x & ((1<<blength) - 1);
  },

  /**
   * Concatenate two bit arrays.
   * @param {bitArray} a1 The first array.
   * @param {bitArray} a2 The second array.
   * @return {bitArray} The concatenation of a1 and a2.
   */
  concat: function (a1, a2) {
    if (a1.length === 0 || a2.length === 0) {
      return a1.concat(a2);
    }
    
    var last = a1[a1.length-1], shift = sjcl.bitArray.getPartial(last);
    if (shift === 32) {
      return a1.concat(a2);
    } else {
      return sjcl.bitArray._shiftRight(a2, shift, last|0, a1.slice(0,a1.length-1));
    }
  },

  /**
   * Find the length of an array of bits.
   * @param {bitArray} a The array.
   * @return {Number} The length of a, in bits.
   */
  bitLength: function (a) {
    var l = a.length, x;
    if (l === 0) { return 0; }
    x = a[l - 1];
    return (l-1) * 32 + sjcl.bitArray.getPartial(x);
  },

  /**
   * Truncate an array.
   * @param {bitArray} a The array.
   * @param {Number} len The length to truncate to, in bits.
   * @return {bitArray} A new array, truncated to len bits.
   */
  clamp: function (a, len) {
    if (a.length * 32 < len) { return a; }
    a = a.slice(0, Math.ceil(len / 32));
    var l = a.length;
    len = len & 31;
    if (l > 0 && len) {
      a[l-1] = sjcl.bitArray.partial(len, a[l-1] & 0x80000000 >> (len-1), 1);
    }
    return a;
  },

  /**
   * Make a partial word for a bit array.
   * @param {Number} len The number of bits in the word.
   * @param {Number} x The bits.
   * @param {Number} [0] _end Pass 1 if x has already been shifted to the high side.
   * @return {Number} The partial word.
   */
  partial: function (len, x, _end) {
    if (len === 32) { return x; }
    return (_end ? x|0 : x << (32-len)) + len * 0x10000000000;
  },

  /**
   * Get the number of bits used by a partial word.
   * @param {Number} x The partial word.
   * @return {Number} The number of bits used by the partial word.
   */
  getPartial: function (x) {
    return Math.round(x/0x10000000000) || 32;
  },

  /**
   * Compare two arrays for equality in a predictable amount of time.
   * @param {bitArray} a The first array.
   * @param {bitArray} b The second array.
   * @return {boolean} true if a == b; false otherwise.
   */
  equal: function (a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
      return false;
    }
    var x = 0, i;
    for (i=0; i<a.length; i++) {
      x |= a[i]^b[i];
    }
    return (x === 0);
  },

  /** Shift an array right.
   * @param {bitArray} a The array to shift.
   * @param {Number} shift The number of bits to shift.
   * @param {Number} [carry=0] A byte to carry in
   * @param {bitArray} [out=[]] An array to prepend to the output.
   * @private
   */
  _shiftRight: function (a, shift, carry, out) {
    var i, last2=0, shift2;
    if (out === undefined) { out = []; }
    
    for (; shift >= 32; shift -= 32) {
      out.push(carry);
      carry = 0;
    }
    if (shift === 0) {
      return out.concat(a);
    }
    
    for (i=0; i<a.length; i++) {
      out.push(carry | a[i]>>>shift);
      carry = a[i] << (32-shift);
    }
    last2 = a.length ? a[a.length-1] : 0;
    shift2 = sjcl.bitArray.getPartial(last2);
    out.push(sjcl.bitArray.partial(shift+shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(),1));
    return out;
  },
  
  /** xor a block of 4 words together.
   * @private
   */
  _xor4: function(x,y) {
    return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
  },

  /** byteswap a word array inplace.
   * (does not handle partial words)
   * @param {sjcl.bitArray} a word array
   * @return {sjcl.bitArray} byteswapped array
   */
  byteswapM: function(a) {
    var i, v, m = 0xff00;
    for (i = 0; i < a.length; ++i) {
      v = a[i];
      a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
    }
    return a;
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
 
/** @namespace UTF-8 strings */
sjcl.codec.utf8String = {
  /** Convert from a bitArray to a UTF-8 string. */
  fromBits: function (arr) {
    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i=0; i<bl/8; i++) {
      if ((i&3) === 0) {
        tmp = arr[i/4];
      }
      out += String.fromCharCode(tmp >>> 24);
      tmp <<= 8;
    }
    return decodeURIComponent(escape(out));
  },
  
  /** Convert from a UTF-8 string to a bitArray. */
  toBits: function (str) {
    str = unescape(encodeURIComponent(str));
    var out = [], i, tmp=0;
    for (i=0; i<str.length; i++) {
      tmp = tmp << 8 | str.charCodeAt(i);
      if ((i&3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i&3) {
      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Hexadecimal */
sjcl.codec.hex = {
  /** Convert from a bitArray to a hex string. */
  fromBits: function (arr) {
    var out = "", i;
    for (i=0; i<arr.length; i++) {
      out += ((arr[i]|0)+0xF00000000000).toString(16).substr(4);
    }
    return out.substr(0, sjcl.bitArray.bitLength(arr)/4);//.replace(/(.{8})/g, "$1 ");
  },
  /** Convert from a hex string to a bitArray. */
  toBits: function (str) {
    var i, out=[], len;
    str = str.replace(/\s|0x/g, "");
    len = str.length;
    str = str + "00000000";
    for (i=0; i<str.length; i+=8) {
      out.push(parseInt(str.substr(i,8),16)^0);
    }
    return sjcl.bitArray.clamp(out, len*4);
  }
};


/** @fileOverview Bit array codec implementations.
 *
 * @author Nils Kenneweg
 */

/** @namespace Base32 encoding/decoding */
sjcl.codec.base32 = {
  /** The base32 alphabet.
   * @private
   */
  _chars: "0123456789abcdefghjkmnpqrstvwxyz",

  /* bits in an array */
  BITS: 32,
  /* base to encode at (2^x) */
  BASE: 5,
  /* bits - base */
  REMAINING: 27,
  
  /** Convert from a bitArray to a base32 string. */
  fromBits: function (arr, _noEquals) {
    var BITS = sjcl.codec.base32.BITS, BASE = sjcl.codec.base32.BASE, REMAINING = sjcl.codec.base32.REMAINING;
    var out = "", i, bits=0, c = sjcl.codec.base32._chars, ta=0, bl = sjcl.bitArray.bitLength(arr);

    for (i=0; out.length * BASE <= bl; ) {
      out += c.charAt((ta ^ arr[i]>>>bits) >>> REMAINING);
      if (bits < BASE) {
        ta = arr[i] << (BASE-bits);
        bits += REMAINING;
        i++;
      } else {
        ta <<= BASE;
        bits -= BASE;
      }
    }

    return out;
  },
  
  /** Convert from a base32 string to a bitArray */
  toBits: function(str) {
    var BITS = sjcl.codec.base32.BITS, BASE = sjcl.codec.base32.BASE, REMAINING = sjcl.codec.base32.REMAINING;
    var out = [], i, bits=0, c = sjcl.codec.base32._chars, ta=0, x;

    for (i=0; i<str.length; i++) {
      x = c.indexOf(str.charAt(i));
      if (x < 0) {
        throw new sjcl.exception.invalid("this isn't base32!");
      }
      if (bits > REMAINING) {
        bits -= REMAINING;
        out.push(ta ^ x>>>bits);
        ta  = x << (BITS-bits);
      } else {
        bits += BASE;
        ta ^= x << (BITS-bits);
      }
    }
    if (bits&56) {
      out.push(sjcl.bitArray.partial(bits&56, ta, 1));
    }
    return out;
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Base64 encoding/decoding */
sjcl.codec.base64 = {
  /** The base64 alphabet.
   * @private
   */
  _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  
  /** Convert from a bitArray to a base64 string. */
  fromBits: function (arr, _noEquals, _url) {
    var out = "", i, bits=0, c = sjcl.codec.base64._chars, ta=0, bl = sjcl.bitArray.bitLength(arr);
    if (_url) {
      c = c.substr(0,62) + '-_';
    }
    for (i=0; out.length * 6 < bl; ) {
      out += c.charAt((ta ^ arr[i]>>>bits) >>> 26);
      if (bits < 6) {
        ta = arr[i] << (6-bits);
        bits += 26;
        i++;
      } else {
        ta <<= 6;
        bits -= 6;
      }
    }
    while ((out.length & 3) && !_noEquals) { out += "="; }
    return out;
  },
  
  /** Convert from a base64 string to a bitArray */
  toBits: function(str, _url) {
    str = str.replace(/\s|=/g,'');
    var out = [], i, bits=0, c = sjcl.codec.base64._chars, ta=0, x;
    if (_url) {
      c = c.substr(0,62) + '-_';
    }
    for (i=0; i<str.length; i++) {
      x = c.indexOf(str.charAt(i));
      if (x < 0) {
        throw new sjcl.exception.invalid("this isn't base64!");
      }
      if (bits > 26) {
        bits -= 26;
        out.push(ta ^ x>>>bits);
        ta  = x << (32-bits);
      } else {
        bits += 6;
        ta ^= x << (32-bits);
      }
    }
    if (bits&56) {
      out.push(sjcl.bitArray.partial(bits&56, ta, 1));
    }
    return out;
  }
};

sjcl.codec.base64url = {
  fromBits: function (arr) { return sjcl.codec.base64.fromBits(arr,1,1); },
  toBits: function (str) { return sjcl.codec.base64.toBits(str,1); }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Arrays of bytes */
sjcl.codec.bytes = {
  /** Convert from a bitArray to an array of bytes. */
  fromBits: function (arr) {
    var out = [], bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i=0; i<bl/8; i++) {
      if ((i&3) === 0) {
        tmp = arr[i/4];
      }
      out.push(tmp >>> 24);
      tmp <<= 8;
    }
    return out;
  },
  /** Convert from an array of bytes to a bitArray. */
  toBits: function (bytes) {
    var out = [], i, tmp=0;
    for (i=0; i<bytes.length; i++) {
      tmp = tmp << 8 | bytes[i];
      if ((i&3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i&3) {
      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
  }
};

/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 * @class Secure Hash Algorithm, 256 bits.
 */
sjcl.hash.sha256 = function (hash) {
  if (!this._key[0]) { this._precompute(); }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
  return (new sjcl.hash.sha256()).update(data).finalize();
};

sjcl.hash.sha256.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    for (i = 512+ol & -512; i <= nl; i+= 512) {
      this._block(b.splice(0,16));
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 8 big-endian words.
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
    
    // Round out the buffer to a multiple of 16 words, less the 2 length words.
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }
    
    // append the length
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,16));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-256 initialization vector, to be precomputed.
   * @private
   */
  _init:[],
  /*
  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
  */
  
  /**
   * The SHA-256 hash key, to be precomputed.
   * @private
   */
  _key:[],
  /*
  _key:
    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
  */


  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function () {
    var i = 0, prime = 2, factor;

    function frac(x) { return (x-Math.floor(x)) * 0x100000000 | 0; }

    outer: for (; i<64; prime++) {
      for (factor=2; factor*factor <= prime; factor++) {
        if (prime % factor === 0) {
          // not a prime
          continue outer;
        }
      }
      
      if (i<8) {
        this._init[i] = frac(Math.pow(prime, 1/2));
      }
      this._key[i] = frac(Math.pow(prime, 1/3));
      i++;
    }
  },
  
  /**
   * Perform one cycle of SHA-256.
   * @param {bitArray} words one block of words.
   * @private
   */
  _block:function (words) {  
    var i, tmp, a, b,
      w = words.slice(0),
      h = this._h,
      k = this._key,
      h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
      h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

    /* Rationale for placement of |0 :
     * If a value can overflow is original 32 bits by a factor of more than a few
     * million (2^23 ish), there is a possibility that it might overflow the
     * 53-bit mantissa and lose precision.
     *
     * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
     * propagates around the loop, and on the hash state h[].  I don't believe
     * that the clamps on h4 and on h0 are strictly necessary, but it's close
     * (for h4 anyway), and better safe than sorry.
     *
     * The clamps on h[] are necessary for the output to be correct even in the
     * common case and for short inputs.
     */
    for (i=0; i<64; i++) {
      // load up the input word for this round
      if (i<16) {
        tmp = w[i];
      } else {
        a   = w[(i+1 ) & 15];
        b   = w[(i+14) & 15];
        tmp = w[i&15] = ((a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
                         (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
                         w[i&15] + w[(i+9) & 15]) | 0;
      }
      
      tmp = (tmp + h7 + (h4>>>6 ^ h4>>>11 ^ h4>>>25 ^ h4<<26 ^ h4<<21 ^ h4<<7) +  (h6 ^ h4&(h5^h6)) + k[i]); // | 0;
      
      // shift register
      h7 = h6; h6 = h5; h5 = h4;
      h4 = h3 + tmp | 0;
      h3 = h2; h2 = h1; h1 = h0;

      h0 = (tmp +  ((h1&h2) ^ (h3&(h1^h2))) + (h1>>>2 ^ h1>>>13 ^ h1>>>22 ^ h1<<30 ^ h1<<19 ^ h1<<10)) | 0;
    }

    h[0] = h[0]+h0 | 0;
    h[1] = h[1]+h1 | 0;
    h[2] = h[2]+h2 | 0;
    h[3] = h[3]+h3 | 0;
    h[4] = h[4]+h4 | 0;
    h[5] = h[5]+h5 | 0;
    h[6] = h[6]+h6 | 0;
    h[7] = h[7]+h7 | 0;
  }
};



/** @fileOverview Javascript SHA-512 implementation.
 *
 * This implementation was written for CryptoJS by Jeff Mott and adapted for
 * SJCL by Stefan Thomas.
 *
 * CryptoJS (c) 2009–2012 by Jeff Mott. All rights reserved.
 * Released with New BSD License
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 * @author Jeff Mott
 * @author Stefan Thomas
 */

/**
 * Context for a SHA-512 operation in progress.
 * @constructor
 * @class Secure Hash Algorithm, 512 bits.
 */
sjcl.hash.sha512 = function (hash) {
  if (!this._key[0]) { this._precompute(); }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha512.hash = function (data) {
  return (new sjcl.hash.sha512()).update(data).finalize();
};

sjcl.hash.sha512.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 1024,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    for (i = 1024+ol & -1024; i <= nl; i+= 1024) {
      this._block(b.splice(0,32));
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 16 big-endian words.
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);

    // Round out the buffer to a multiple of 32 words, less the 4 length words.
    for (i = b.length + 4; i & 31; i++) {
      b.push(0);
    }

    // append the length
    b.push(0);
    b.push(0);
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,32));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-512 initialization vector, to be precomputed.
   * @private
   */
  _init:[],

  /**
   * Least significant 24 bits of SHA512 initialization values.
   *
   * Javascript only has 53 bits of precision, so we compute the 40 most
   * significant bits and add the remaining 24 bits as constants.
   *
   * @private
   */
  _initr: [ 0xbcc908, 0xcaa73b, 0x94f82b, 0x1d36f1, 0xe682d1, 0x3e6c1f, 0x41bd6b, 0x7e2179 ],

  /*
  _init:
  [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
   0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179],
  */

  /**
   * The SHA-512 hash key, to be precomputed.
   * @private
   */
  _key:[],

  /**
   * Least significant 24 bits of SHA512 key values.
   * @private
   */
  _keyr:
  [0x28ae22, 0xef65cd, 0x4d3b2f, 0x89dbbc, 0x48b538, 0x05d019, 0x194f9b, 0x6d8118,
   0x030242, 0x706fbe, 0xe4b28c, 0xffb4e2, 0x7b896f, 0x1696b1, 0xc71235, 0x692694,
   0xf14ad2, 0x4f25e3, 0x8cd5b5, 0xac9c65, 0x2b0275, 0xa6e483, 0x41fbd4, 0x1153b5,
   0x66dfab, 0xb43210, 0xfb213f, 0xef0ee4, 0xa88fc2, 0x0aa725, 0x03826f, 0x0e6e70,
   0xd22ffc, 0x26c926, 0xc42aed, 0x95b3df, 0xaf63de, 0x77b2a8, 0xedaee6, 0x82353b,
   0xf10364, 0x423001, 0xf89791, 0x54be30, 0xef5218, 0x65a910, 0x71202a, 0xbbd1b8,
   0xd2d0c8, 0x41ab53, 0x8eeb99, 0x9b48a8, 0xc95a63, 0x418acb, 0x63e373, 0xb2b8a3,
   0xefb2fc, 0x172f60, 0xf0ab72, 0x6439ec, 0x631e28, 0x82bde9, 0xc67915, 0x72532b,
   0x26619c, 0xc0c207, 0xe0eb1e, 0x6ed178, 0x176fba, 0xc898a6, 0xf90dae, 0x1c471b,
   0x047d84, 0xc72493, 0xc9bebc, 0x100d4c, 0x3e42b6, 0x657e2a, 0xd6faec, 0x475817],

  /*
  _key:
  [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
   0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
   0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
   0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
   0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
   0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
   0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
   0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
   0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
   0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
   0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
   0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
   0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
   0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
   0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
   0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
   0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
   0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
   0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
   0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817],
  */

  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function () {
    // XXX: This code is for precomputing the SHA256 constants, change for
    //      SHA512 and re-enable.
    var i = 0, prime = 2, factor;

    function frac(x)  { return (x-Math.floor(x)) * 0x100000000 | 0; }
    function frac2(x) { return (x-Math.floor(x)) * 0x10000000000 & 0xff; }

    outer: for (; i<80; prime++) {
      for (factor=2; factor*factor <= prime; factor++) {
        if (prime % factor === 0) {
          // not a prime
          continue outer;
        }
      }

      if (i<8) {
        this._init[i*2] = frac(Math.pow(prime, 1/2));
        this._init[i*2+1] = (frac2(Math.pow(prime, 1/2)) << 24) | this._initr[i];
      }
      this._key[i*2] = frac(Math.pow(prime, 1/3));
      this._key[i*2+1] = (frac2(Math.pow(prime, 1/3)) << 24) | this._keyr[i];
      i++;
    }
  },

  /**
   * Perform one cycle of SHA-512.
   * @param {bitArray} words one block of words.
   * @private
   */
  _block:function (words) {
    var i, wrh, wrl,
        w = words.slice(0),
        h = this._h,
        k = this._key,
        h0h = h[ 0], h0l = h[ 1], h1h = h[ 2], h1l = h[ 3],
        h2h = h[ 4], h2l = h[ 5], h3h = h[ 6], h3l = h[ 7],
        h4h = h[ 8], h4l = h[ 9], h5h = h[10], h5l = h[11],
        h6h = h[12], h6l = h[13], h7h = h[14], h7l = h[15];

    // Working variables
    var ah = h0h, al = h0l, bh = h1h, bl = h1l,
        ch = h2h, cl = h2l, dh = h3h, dl = h3l,
        eh = h4h, el = h4l, fh = h5h, fl = h5l,
        gh = h6h, gl = h6l, hh = h7h, hl = h7l;

    for (i=0; i<80; i++) {
      // load up the input word for this round
      if (i<16) {
        wrh = w[i * 2];
        wrl = w[i * 2 + 1];
      } else {
        // Gamma0
        var gamma0xh = w[(i-15) * 2];
        var gamma0xl = w[(i-15) * 2 + 1];
        var gamma0h =
          ((gamma0xl << 31) | (gamma0xh >>> 1)) ^
          ((gamma0xl << 24) | (gamma0xh >>> 8)) ^
           (gamma0xh >>> 7);
        var gamma0l =
          ((gamma0xh << 31) | (gamma0xl >>> 1)) ^
          ((gamma0xh << 24) | (gamma0xl >>> 8)) ^
          ((gamma0xh << 25) | (gamma0xl >>> 7));

        // Gamma1
        var gamma1xh = w[(i-2) * 2];
        var gamma1xl = w[(i-2) * 2 + 1];
        var gamma1h =
          ((gamma1xl << 13) | (gamma1xh >>> 19)) ^
          ((gamma1xh << 3)  | (gamma1xl >>> 29)) ^
           (gamma1xh >>> 6);
        var gamma1l =
          ((gamma1xh << 13) | (gamma1xl >>> 19)) ^
          ((gamma1xl << 3)  | (gamma1xh >>> 29)) ^
          ((gamma1xh << 26) | (gamma1xl >>> 6));

        // Shortcuts
        var wr7h = w[(i-7) * 2];
        var wr7l = w[(i-7) * 2 + 1];

        var wr16h = w[(i-16) * 2];
        var wr16l = w[(i-16) * 2 + 1];

        // W(round) = gamma0 + W(round - 7) + gamma1 + W(round - 16)
        wrl = gamma0l + wr7l;
        wrh = gamma0h + wr7h + ((wrl >>> 0) < (gamma0l >>> 0) ? 1 : 0);
        wrl += gamma1l;
        wrh += gamma1h + ((wrl >>> 0) < (gamma1l >>> 0) ? 1 : 0);
        wrl += wr16l;
        wrh += wr16h + ((wrl >>> 0) < (wr16l >>> 0) ? 1 : 0);
      }

      w[i*2]     = wrh |= 0;
      w[i*2 + 1] = wrl |= 0;

      // Ch
      var chh = (eh & fh) ^ (~eh & gh);
      var chl = (el & fl) ^ (~el & gl);

      // Maj
      var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
      var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

      // Sigma0
      var sigma0h = ((al << 4) | (ah >>> 28)) ^ ((ah << 30) | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
      var sigma0l = ((ah << 4) | (al >>> 28)) ^ ((al << 30) | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));

      // Sigma1
      var sigma1h = ((el << 18) | (eh >>> 14)) ^ ((el << 14) | (eh >>> 18)) ^ ((eh << 23) | (el >>> 9));
      var sigma1l = ((eh << 18) | (el >>> 14)) ^ ((eh << 14) | (el >>> 18)) ^ ((el << 23) | (eh >>> 9));

      // K(round)
      var krh = k[i*2];
      var krl = k[i*2+1];

      // t1 = h + sigma1 + ch + K(round) + W(round)
      var t1l = hl + sigma1l;
      var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
      t1l += chl;
      t1h += chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
      t1l += krl;
      t1h += krh + ((t1l >>> 0) < (krl >>> 0) ? 1 : 0);
      t1l = t1l + wrl|0;   // FF32..FF34 perf issue https://bugzilla.mozilla.org/show_bug.cgi?id=1054972
      t1h += wrh + ((t1l >>> 0) < (wrl >>> 0) ? 1 : 0);

      // t2 = sigma0 + maj
      var t2l = sigma0l + majl;
      var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

      // Update working variables
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      el = (dl + t1l) | 0;
      eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      al = (t1l + t2l) | 0;
      ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
    }

    // Intermediate hash
    h0l = h[1] = (h0l + al) | 0;
    h[0] = (h0h + ah + ((h0l >>> 0) < (al >>> 0) ? 1 : 0)) | 0;
    h1l = h[3] = (h1l + bl) | 0;
    h[2] = (h1h + bh + ((h1l >>> 0) < (bl >>> 0) ? 1 : 0)) | 0;
    h2l = h[5] = (h2l + cl) | 0;
    h[4] = (h2h + ch + ((h2l >>> 0) < (cl >>> 0) ? 1 : 0)) | 0;
    h3l = h[7] = (h3l + dl) | 0;
    h[6] = (h3h + dh + ((h3l >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
    h4l = h[9] = (h4l + el) | 0;
    h[8] = (h4h + eh + ((h4l >>> 0) < (el >>> 0) ? 1 : 0)) | 0;
    h5l = h[11] = (h5l + fl) | 0;
    h[10] = (h5h + fh + ((h5l >>> 0) < (fl >>> 0) ? 1 : 0)) | 0;
    h6l = h[13] = (h6l + gl) | 0;
    h[12] = (h6h + gh + ((h6l >>> 0) < (gl >>> 0) ? 1 : 0)) | 0;
    h7l = h[15] = (h7l + hl) | 0;
    h[14] = (h7h + hh + ((h7l >>> 0) < (hl >>> 0) ? 1 : 0)) | 0;
  }
};



/** @fileOverview Javascript SHA-1 implementation.
 *
 * Based on the implementation in RFC 3174, method 1, and on the SJCL
 * SHA-256 implementation.
 *
 * @author Quinn Slack
 */

/**
 * Context for a SHA-1 operation in progress.
 * @constructor
 * @class Secure Hash Algorithm, 160 bits.
 */
sjcl.hash.sha1 = function (hash) {
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 5 big-endian words.
 */
sjcl.hash.sha1.hash = function (data) {
  return (new sjcl.hash.sha1()).update(data).finalize();
};

sjcl.hash.sha1.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    for (i = this.blockSize+ol & -this.blockSize; i <= nl;
         i+= this.blockSize) {
      this._block(b.splice(0,16));
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 5 big-endian words. TODO
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
    // Round out the buffer to a multiple of 16 words, less the 2 length words.
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }

    // append the length
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,16));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-1 initialization vector.
   * @private
   */
  _init:[0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0],

  /**
   * The SHA-1 hash key.
   * @private
   */
  _key:[0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6],

  /**
   * The SHA-1 logical functions f(0), f(1), ..., f(79).
   * @private
   */
  _f:function(t, b, c, d) {
    if (t <= 19) {
      return (b & c) | (~b & d);
    } else if (t <= 39) {
      return b ^ c ^ d;
    } else if (t <= 59) {
      return (b & c) | (b & d) | (c & d);
    } else if (t <= 79) {
      return b ^ c ^ d;
    }
  },

  /**
   * Circular left-shift operator.
   * @private
   */
  _S:function(n, x) {
    return (x << n) | (x >>> 32-n);
  },
  
  /**
   * Perform one cycle of SHA-1.
   * @param {bitArray} words one block of words.
   * @private
   */
  _block:function (words) {  
    var t, tmp, a, b, c, d, e,
    w = words.slice(0),
    h = this._h;
   
    a = h[0]; b = h[1]; c = h[2]; d = h[3]; e = h[4]; 

    for (t=0; t<=79; t++) {
      if (t >= 16) {
        w[t] = this._S(1, w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16]);
      }
      tmp = (this._S(5, a) + this._f(t, b, c, d) + e + w[t] +
             this._key[Math.floor(t/20)]) | 0;
      e = d;
      d = c;
      c = this._S(30, b);
      b = a;
      a = tmp;
   }

   h[0] = (h[0]+a) |0;
   h[1] = (h[1]+b) |0;
   h[2] = (h[2]+c) |0;
   h[3] = (h[3]+d) |0;
   h[4] = (h[4]+e) |0;
  }
};

/** @fileOverview Javascript RIPEMD-160 implementation.
 *
 * @author Artem S Vybornov <vybornov@gmail.com>
 */
(function() {

/**
 * Context for a RIPEMD-160 operation in progress.
 * @constructor
 * @class RIPEMD, 160 bits.
 */
sjcl.hash.ripemd160 = function (hash) {
    if (hash) {
        this._h = hash._h.slice(0);
        this._buffer = hash._buffer.slice(0);
        this._length = hash._length;
    } else {
        this.reset();
    }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 5 big-endian words.
 */
sjcl.hash.ripemd160.hash = function (data) {
  return (new sjcl.hash.ripemd160()).update(data).finalize();
};

sjcl.hash.ripemd160.prototype = {
    /**
     * Reset the hash state.
     * @return this
     */
    reset: function () {
        this._h = _h0.slice(0);
        this._buffer = [];
        this._length = 0;
        return this;
    },

    /**
     * Reset the hash state.
     * @param {bitArray|String} data the data to hash.
     * @return this
     */
    update: function (data) {
        if ( typeof data === "string" )
            data = sjcl.codec.utf8String.toBits(data);

        var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
            ol = this._length,
            nl = this._length = ol + sjcl.bitArray.bitLength(data);
        for (i = 512+ol & -512; i <= nl; i+= 512) {
            var words = b.splice(0,16);
            for ( var w = 0; w < 16; ++w )
                words[w] = _cvt(words[w]);

            _block.call( this, words );
        }

        return this;
    },

    /**
     * Complete hashing and output the hash value.
     * @return {bitArray} The hash value, an array of 5 big-endian words.
     */
    finalize: function () {
        var b = sjcl.bitArray.concat( this._buffer, [ sjcl.bitArray.partial(1,1) ] ),
            l = ( this._length + 1 ) % 512,
            z = ( l > 448 ? 512 : 448 ) - l % 448,
            zp = z % 32;

        if ( zp > 0 )
            b = sjcl.bitArray.concat( b, [ sjcl.bitArray.partial(zp,0) ] )
        for ( ; z >= 32; z -= 32 )
            b.push(0);

        b.push( _cvt( this._length | 0 ) );
        b.push( _cvt( Math.floor(this._length / 0x100000000) ) );

        while ( b.length ) {
            var words = b.splice(0,16);
            for ( var w = 0; w < 16; ++w )
                words[w] = _cvt(words[w]);

            _block.call( this, words );
        }

        var h = this._h;
        this.reset();

        for ( var w = 0; w < 5; ++w )
            h[w] = _cvt(h[w]);

        return h;
    }
};

var _h0 = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];

var _k1 = [ 0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e ];
var _k2 = [ 0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000 ];
for ( var i = 4; i >= 0; --i ) {
    for ( var j = 1; j < 16; ++j ) {
        _k1.splice(i,0,_k1[i]);
        _k2.splice(i,0,_k2[i]);
    }
}

var _r1 = [  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
             7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
             3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
             1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
             4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13 ];
var _r2 = [  5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
             6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
            15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
             8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
            12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11 ];

var _s1 = [ 11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
             7,  6,  8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
            11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
            11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
             9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
var _s2 = [  8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
             9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
             9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
            15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
             8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

function _f0(x,y,z) {
    return x ^ y ^ z;
};

function _f1(x,y,z) {
    return (x & y) | (~x & z);
};

function _f2(x,y,z) {
    return (x | ~y) ^ z;
};

function _f3(x,y,z) {
    return (x & z) | (y & ~z);
};

function _f4(x,y,z) {
    return x ^ (y | ~z);
};

function _rol(n,l) {
    return (n << l) | (n >>> (32-l));
}

function _cvt(n) {
    return ( (n & 0xff <<  0) <<  24 )
         | ( (n & 0xff <<  8) <<   8 )
         | ( (n & 0xff << 16) >>>  8 )
         | ( (n & 0xff << 24) >>> 24 );
}

function _block(X) {
    var A1 = this._h[0], B1 = this._h[1], C1 = this._h[2], D1 = this._h[3], E1 = this._h[4],
        A2 = this._h[0], B2 = this._h[1], C2 = this._h[2], D2 = this._h[3], E2 = this._h[4];

    var j = 0, T;

    for ( ; j < 16; ++j ) {
        T = _rol( A1 + _f0(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f4(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 32; ++j ) {
        T = _rol( A1 + _f1(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f3(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 48; ++j ) {
        T = _rol( A1 + _f2(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f2(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 64; ++j ) {
        T = _rol( A1 + _f3(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f1(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 80; ++j ) {
        T = _rol( A1 + _f4(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f0(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }

    T = this._h[1] + C1 + D2;
    this._h[1] = this._h[2] + D1 + E2;
    this._h[2] = this._h[3] + E1 + A2;
    this._h[3] = this._h[4] + A1 + B2;
    this._h[4] = this._h[0] + B1 + C2;
    this._h[0] = T;
}

})();

/** @fileOverview CCM mode implementation.
 *
 * Special thanks to Roy Nicholson for pointing out a bug in our
 * implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace CTR mode with CBC MAC. */
sjcl.mode.ccm = {
  /** The name of the mode.
   * @constant
   */
  name: "ccm",
  
  /** Encrypt in CCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} plaintext The plaintext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [adata=[]] The authenticated data.
   * @param {Number} [tlen=64] the desired tag length, in bits.
   * @return {bitArray} The encrypted data, an array of bytes.
   */
  encrypt: function(prf, plaintext, iv, adata, tlen) {
    var L, out = plaintext.slice(0), tag, w=sjcl.bitArray, ivl = w.bitLength(iv) / 8, ol = w.bitLength(out) / 8;
    tlen = tlen || 64;
    adata = adata || [];
    
    if (ivl < 7) {
      throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
    }
    
    // compute the length of the length
    for (L=2; L<4 && ol >>> 8*L; L++) {}
    if (L < 15 - ivl) { L = 15-ivl; }
    iv = w.clamp(iv,8*(15-L));
    
    // compute the tag
    tag = sjcl.mode.ccm._computeTag(prf, plaintext, iv, adata, tlen, L);
    
    // encrypt
    out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);
    
    return w.concat(out.data, out.tag);
  },
  
  /** Decrypt in CCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} ciphertext The ciphertext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [[]] adata The authenticated data.
   * @param {Number} [64] tlen the desired tag length, in bits.
   * @return {bitArray} The decrypted data.
   */
  decrypt: function(prf, ciphertext, iv, adata, tlen) {
    tlen = tlen || 64;
    adata = adata || [];
    var L,
        w=sjcl.bitArray,
        ivl = w.bitLength(iv) / 8,
        ol = w.bitLength(ciphertext), 
        out = w.clamp(ciphertext, ol - tlen),
        tag = w.bitSlice(ciphertext, ol - tlen), tag2;
    

    ol = (ol - tlen) / 8;
        
    if (ivl < 7) {
      throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
    }
    
    // compute the length of the length
    for (L=2; L<4 && ol >>> 8*L; L++) {}
    if (L < 15 - ivl) { L = 15-ivl; }
    iv = w.clamp(iv,8*(15-L));
    
    // decrypt
    out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);
    
    // check the tag
    tag2 = sjcl.mode.ccm._computeTag(prf, out.data, iv, adata, tlen, L);
    if (!w.equal(out.tag, tag2)) {
      throw new sjcl.exception.corrupt("ccm: tag doesn't match");
    }
    
    return out.data;
  },

  /* Compute the (unencrypted) authentication tag, according to the CCM specification
   * @param {Object} prf The pseudorandom function.
   * @param {bitArray} plaintext The plaintext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} adata The authenticated data.
   * @param {Number} tlen the desired tag length, in bits.
   * @return {bitArray} The tag, but not yet encrypted.
   * @private
   */
  _computeTag: function(prf, plaintext, iv, adata, tlen, L) {
    // compute B[0]
    var mac, tmp, i, macData = [], w=sjcl.bitArray, xor = w._xor4;

    tlen /= 8;
  
    // check tag length and message length
    if (tlen % 2 || tlen < 4 || tlen > 16) {
      throw new sjcl.exception.invalid("ccm: invalid tag length");
    }
  
    if (adata.length > 0xFFFFFFFF || plaintext.length > 0xFFFFFFFF) {
      // I don't want to deal with extracting high words from doubles.
      throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");
    }

    // mac the flags
    mac = [w.partial(8, (adata.length ? 1<<6 : 0) | (tlen-2) << 2 | L-1)];

    // mac the iv and length
    mac = w.concat(mac, iv);
    mac[3] |= w.bitLength(plaintext)/8;
    mac = prf.encrypt(mac);
    
  
    if (adata.length) {
      // mac the associated data.  start with its length...
      tmp = w.bitLength(adata)/8;
      if (tmp <= 0xFEFF) {
        macData = [w.partial(16, tmp)];
      } else if (tmp <= 0xFFFFFFFF) {
        macData = w.concat([w.partial(16,0xFFFE)], [tmp]);
      } // else ...
    
      // mac the data itself
      macData = w.concat(macData, adata);
      for (i=0; i<macData.length; i += 4) {
        mac = prf.encrypt(xor(mac, macData.slice(i,i+4).concat([0,0,0])));
      }
    }
  
    // mac the plaintext
    for (i=0; i<plaintext.length; i+=4) {
      mac = prf.encrypt(xor(mac, plaintext.slice(i,i+4).concat([0,0,0])));
    }

    return w.clamp(mac, tlen * 8);
  },

  /** CCM CTR mode.
   * Encrypt or decrypt data and tag with the prf in CCM-style CTR mode.
   * May mutate its arguments.
   * @param {Object} prf The PRF.
   * @param {bitArray} data The data to be encrypted or decrypted.
   * @param {bitArray} iv The initialization vector.
   * @param {bitArray} tag The authentication tag.
   * @param {Number} tlen The length of th etag, in bits.
   * @param {Number} L The CCM L value.
   * @return {Object} An object with data and tag, the en/decryption of data and tag values.
   * @private
   */
  _ctrMode: function(prf, data, iv, tag, tlen, L) {
    var enc, i, w=sjcl.bitArray, xor = w._xor4, ctr, l = data.length, bl=w.bitLength(data);

    // start the ctr
    ctr = w.concat([w.partial(8,L-1)],iv).concat([0,0,0]).slice(0,4);
    
    // en/decrypt the tag
    tag = w.bitSlice(xor(tag,prf.encrypt(ctr)), 0, tlen);
  
    // en/decrypt the data
    if (!l) { return {tag:tag, data:[]}; }
    
    for (i=0; i<l; i+=4) {
      ctr[3]++;
      enc = prf.encrypt(ctr);
      data[i]   ^= enc[0];
      data[i+1] ^= enc[1];
      data[i+2] ^= enc[2];
      data[i+3] ^= enc[3];
    }
    return { tag:tag, data:w.clamp(data,bl) };
  }
};

/** @fileOverview GCM mode implementation.
 *
 * @author Juho Vähä-Herttua
 */

/** @namespace Galois/Counter mode. */
sjcl.mode.gcm = {
  /** The name of the mode.
   * @constant
   */
  name: "gcm",
  
  /** Encrypt in GCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} plaintext The plaintext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [adata=[]] The authenticated data.
   * @param {Number} [tlen=128] The desired tag length, in bits.
   * @return {bitArray} The encrypted data, an array of bytes.
   */
  encrypt: function (prf, plaintext, iv, adata, tlen) {
    var out, data = plaintext.slice(0), w=sjcl.bitArray;
    tlen = tlen || 128;
    adata = adata || [];

    // encrypt and tag
    out = sjcl.mode.gcm._ctrMode(true, prf, data, adata, iv, tlen);

    return w.concat(out.data, out.tag);
  },
  
  /** Decrypt in GCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} ciphertext The ciphertext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [adata=[]] The authenticated data.
   * @param {Number} [tlen=128] The desired tag length, in bits.
   * @return {bitArray} The decrypted data.
   */
  decrypt: function (prf, ciphertext, iv, adata, tlen) {
    var out, data = ciphertext.slice(0), tag, w=sjcl.bitArray, l=w.bitLength(data);
    tlen = tlen || 128;
    adata = adata || [];

    // Slice tag out of data
    if (tlen <= l) {
      tag = w.bitSlice(data, l-tlen);
      data = w.bitSlice(data, 0, l-tlen);
    } else {
      tag = data;
      data = [];
    }

    // decrypt and tag
    out = sjcl.mode.gcm._ctrMode(false, prf, data, adata, iv, tlen);

    if (!w.equal(out.tag, tag)) {
      throw new sjcl.exception.corrupt("gcm: tag doesn't match");
    }
    return out.data;
  },

  /* Compute the galois multiplication of X and Y
   * @private
   */
  _galoisMultiply: function (x, y) {
    var i, j, xi, Zi, Vi, lsb_Vi, w=sjcl.bitArray, xor=w._xor4;

    Zi = [0,0,0,0];
    Vi = y.slice(0);

    // Block size is 128 bits, run 128 times to get Z_128
    for (i=0; i<128; i++) {
      xi = (x[Math.floor(i/32)] & (1 << (31-i%32))) !== 0;
      if (xi) {
        // Z_i+1 = Z_i ^ V_i
        Zi = xor(Zi, Vi);
      }

      // Store the value of LSB(V_i)
      lsb_Vi = (Vi[3] & 1) !== 0;

      // V_i+1 = V_i >> 1
      for (j=3; j>0; j--) {
        Vi[j] = (Vi[j] >>> 1) | ((Vi[j-1]&1) << 31);
      }
      Vi[0] = Vi[0] >>> 1;

      // If LSB(V_i) is 1, V_i+1 = (V_i >> 1) ^ R
      if (lsb_Vi) {
        Vi[0] = Vi[0] ^ (0xe1 << 24);
      }
    }
    return Zi;
  },

  _ghash: function(H, Y0, data) {
    var Yi, i, l = data.length;

    Yi = Y0.slice(0);
    for (i=0; i<l; i+=4) {
      Yi[0] ^= 0xffffffff&data[i];
      Yi[1] ^= 0xffffffff&data[i+1];
      Yi[2] ^= 0xffffffff&data[i+2];
      Yi[3] ^= 0xffffffff&data[i+3];
      Yi = sjcl.mode.gcm._galoisMultiply(Yi, H);
    }
    return Yi;
  },

  /** GCM CTR mode.
   * Encrypt or decrypt data and tag with the prf in GCM-style CTR mode.
   * @param {Boolean} encrypt True if encrypt, false if decrypt.
   * @param {Object} prf The PRF.
   * @param {bitArray} data The data to be encrypted or decrypted.
   * @param {bitArray} iv The initialization vector.
   * @param {bitArray} adata The associated data to be tagged.
   * @param {Number} tlen The length of the tag, in bits.
   */
  _ctrMode: function(encrypt, prf, data, adata, iv, tlen) {
    var H, J0, S0, enc, i, ctr, tag, last, l, bl, abl, ivbl, w=sjcl.bitArray;

    // Calculate data lengths
    l = data.length;
    bl = w.bitLength(data);
    abl = w.bitLength(adata);
    ivbl = w.bitLength(iv);

    // Calculate the parameters
    H = prf.encrypt([0,0,0,0]);
    if (ivbl === 96) {
      J0 = iv.slice(0);
      J0 = w.concat(J0, [1]);
    } else {
      J0 = sjcl.mode.gcm._ghash(H, [0,0,0,0], iv);
      J0 = sjcl.mode.gcm._ghash(H, J0, [0,0,Math.floor(ivbl/0x100000000),ivbl&0xffffffff]);
    }
    S0 = sjcl.mode.gcm._ghash(H, [0,0,0,0], adata);

    // Initialize ctr and tag
    ctr = J0.slice(0);
    tag = S0.slice(0);

    // If decrypting, calculate hash
    if (!encrypt) {
      tag = sjcl.mode.gcm._ghash(H, S0, data);
    }

    // Encrypt all the data
    for (i=0; i<l; i+=4) {
       ctr[3]++;
       enc = prf.encrypt(ctr);
       data[i]   ^= enc[0];
       data[i+1] ^= enc[1];
       data[i+2] ^= enc[2];
       data[i+3] ^= enc[3];
    }
    data = w.clamp(data, bl);

    // If encrypting, calculate hash
    if (encrypt) {
      tag = sjcl.mode.gcm._ghash(H, S0, data);
    }

    // Calculate last block from bit lengths, ugly because bitwise operations are 32-bit
    last = [
      Math.floor(abl/0x100000000), abl&0xffffffff,
      Math.floor(bl/0x100000000), bl&0xffffffff
    ];

    // Calculate the final tag block
    tag = sjcl.mode.gcm._ghash(H, tag, last);
    enc = prf.encrypt(J0);
    tag[0] ^= enc[0];
    tag[1] ^= enc[1];
    tag[2] ^= enc[2];
    tag[3] ^= enc[3];

    return { tag:w.bitSlice(tag, 0, tlen), data:data };
  }
};

/** @fileOverview HMAC implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** HMAC with the specified hash function.
 * @constructor
 * @param {bitArray} key the key for HMAC.
 * @param {Object} [hash=sjcl.hash.sha256] The hash function to use.
 */
sjcl.misc.hmac = function (key, Hash) {
  this._hash = Hash = Hash || sjcl.hash.sha256;
  var exKey = [[],[]], i,
      bs = Hash.prototype.blockSize / 32;
  this._baseHash = [new Hash(), new Hash()];

  if (key.length > bs) {
    key = Hash.hash(key);
  }
  
  for (i=0; i<bs; i++) {
    exKey[0][i] = key[i]^0x36363636;
    exKey[1][i] = key[i]^0x5C5C5C5C;
  }
  
  this._baseHash[0].update(exKey[0]);
  this._baseHash[1].update(exKey[1]);
  this._resultHash = new Hash(this._baseHash[0]);
};

/** HMAC with the specified hash function.  Also called encrypt since it's a prf.
 * @param {bitArray|String} data The data to mac.
 */
sjcl.misc.hmac.prototype.encrypt = sjcl.misc.hmac.prototype.mac = function (data) {
  if (!this._updated) {
    this.update(data);
    return this.digest(data);
  } else {
    throw new sjcl.exception.invalid("encrypt on already updated hmac called!");
  }
};

sjcl.misc.hmac.prototype.reset = function () {
  this._resultHash = new this._hash(this._baseHash[0]);
  this._updated = false;
};

sjcl.misc.hmac.prototype.update = function (data) {
  this._updated = true;
  this._resultHash.update(data);
};

sjcl.misc.hmac.prototype.digest = function () {
  var w = this._resultHash.finalize(), result = new (this._hash)(this._baseHash[1]).update(w).finalize();

  this.reset();

  return result;
};
/** @fileOverview Password-based key-derivation function, version 2.0.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** Password-Based Key-Derivation Function, version 2.0.
 *
 * Generate keys from passwords using PBKDF2-HMAC-SHA256.
 *
 * This is the method specified by RSA's PKCS #5 standard.
 *
 * @param {bitArray|String} password  The password.
 * @param {bitArray|String} salt The salt.  Should have lots of entropy.
 * @param {Number} [count=1000] The number of iterations.  Higher numbers make the function slower but more secure.
 * @param {Number} [length] The length of the derived key.  Defaults to the
                            output size of the hash function.
 * @param {Object} [Prff=sjcl.misc.hmac] The pseudorandom function family.
 * @return {bitArray} the derived key.
 */
sjcl.misc.pbkdf2 = function (password, salt, count, length, Prff) {
  count = count || 1000;
  
  if (length < 0 || count < 0) {
    throw sjcl.exception.invalid("invalid params to pbkdf2");
  }
  
  if (typeof password === "string") {
    password = sjcl.codec.utf8String.toBits(password);
  }
  
  if (typeof salt === "string") {
    salt = sjcl.codec.utf8String.toBits(salt);
  }
  
  Prff = Prff || sjcl.misc.hmac;
  
  var prf = new Prff(password),
      u, ui, i, j, k, out = [], b = sjcl.bitArray;

  for (k = 1; 32 * out.length < (length || 1); k++) {
    u = ui = prf.encrypt(b.concat(salt,[k]));
    
    for (i=1; i<count; i++) {
      ui = prf.encrypt(ui);
      for (j=0; j<ui.length; j++) {
        u[j] ^= ui[j];
      }
    }
    
    out = out.concat(u);
  }

  if (length) { out = b.clamp(out, length); }

  return out;
};

/** @fileOverview Random number generator.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 * @author Michael Brooks
 */

/** @constructor
 * @class Random number generator
 * @description
 * <b>Use sjcl.random as a singleton for this class!</b>
 * <p>
 * This random number generator is a derivative of Ferguson and Schneier's
 * generator Fortuna.  It collects entropy from various events into several
 * pools, implemented by streaming SHA-256 instances.  It differs from
 * ordinary Fortuna in a few ways, though.
 * </p>
 *
 * <p>
 * Most importantly, it has an entropy estimator.  This is present because
 * there is a strong conflict here between making the generator available
 * as soon as possible, and making sure that it doesn't "run on empty".
 * In Fortuna, there is a saved state file, and the system is likely to have
 * time to warm up.
 * </p>
 *
 * <p>
 * Second, because users are unlikely to stay on the page for very long,
 * and to speed startup time, the number of pools increases logarithmically:
 * a new pool is created when the previous one is actually used for a reseed.
 * This gives the same asymptotic guarantees as Fortuna, but gives more
 * entropy to early reseeds.
 * </p>
 *
 * <p>
 * The entire mechanism here feels pretty klunky.  Furthermore, there are
 * several improvements that should be made, including support for
 * dedicated cryptographic functions that may be present in some browsers;
 * state files in local storage; cookies containing randomness; etc.  So
 * look for improvements in future versions.
 * </p>
 */
sjcl.prng = function(defaultParanoia) {
  
  /* private */
  this._pools                   = [new sjcl.hash.sha256()];
  this._poolEntropy             = [0];
  this._reseedCount             = 0;
  this._robins                  = {};
  this._eventId                 = 0;
  
  this._collectorIds            = {};
  this._collectorIdNext         = 0;
  
  this._strength                = 0;
  this._poolStrength            = 0;
  this._nextReseed              = 0;
  this._key                     = [0,0,0,0,0,0,0,0];
  this._counter                 = [0,0,0,0];
  this._cipher                  = undefined;
  this._defaultParanoia         = defaultParanoia;
  
  /* event listener stuff */
  this._collectorsStarted       = false;
  this._callbacks               = {progress: {}, seeded: {}};
  this._callbackI               = 0;
  
  /* constants */
  this._NOT_READY               = 0;
  this._READY                   = 1;
  this._REQUIRES_RESEED         = 2;

  this._MAX_WORDS_PER_BURST     = 65536;
  this._PARANOIA_LEVELS         = [0,48,64,96,128,192,256,384,512,768,1024];
  this._MILLISECONDS_PER_RESEED = 30000;
  this._BITS_PER_RESEED         = 80;
};
 
sjcl.prng.prototype = {
  /** Generate several random words, and return them in an array.
   * A word consists of 32 bits (4 bytes)
   * @param {Number} nwords The number of words to generate.
   */
  randomWords: function (nwords, paranoia) {
    var out = [], i, readiness = this.isReady(paranoia), g;
  
    if (readiness === this._NOT_READY) {
      throw new sjcl.exception.notReady("generator isn't seeded");
    } else if (readiness & this._REQUIRES_RESEED) {
      this._reseedFromPools(!(readiness & this._READY));
    }
  
    for (i=0; i<nwords; i+= 4) {
      if ((i+1) % this._MAX_WORDS_PER_BURST === 0) {
        this._gate();
      }
   
      g = this._gen4words();
      out.push(g[0],g[1],g[2],g[3]);
    }
    this._gate();
  
    return out.slice(0,nwords);
  },
  
  setDefaultParanoia: function (paranoia, allowZeroParanoia) {
    if (paranoia === 0 && allowZeroParanoia !== "Setting paranoia=0 will ruin your security; use it only for testing") {
      throw "Setting paranoia=0 will ruin your security; use it only for testing";
    }

    this._defaultParanoia = paranoia;
  },
  
  /**
   * Add entropy to the pools.
   * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
   * @param {Number} estimatedEntropy The estimated entropy of data, in bits
   * @param {String} source The source of the entropy, eg "mouse"
   */
  addEntropy: function (data, estimatedEntropy, source) {
    source = source || "user";
  
    var id,
      i, tmp,
      t = (new Date()).valueOf(),
      robin = this._robins[source],
      oldReady = this.isReady(), err = 0, objName;
      
    id = this._collectorIds[source];
    if (id === undefined) { id = this._collectorIds[source] = this._collectorIdNext ++; }
      
    if (robin === undefined) { robin = this._robins[source] = 0; }
    this._robins[source] = ( this._robins[source] + 1 ) % this._pools.length;
  
    switch(typeof(data)) {
      
    case "number":
      if (estimatedEntropy === undefined) {
        estimatedEntropy = 1;
      }
      this._pools[robin].update([id,this._eventId++,1,estimatedEntropy,t,1,data|0]);
      break;
      
    case "object":
      objName = Object.prototype.toString.call(data);
      if (objName === "[object Uint32Array]") {
        tmp = [];
        for (i = 0; i < data.length; i++) {
          tmp.push(data[i]);
        }
        data = tmp;
      } else {
        if (objName !== "[object Array]") {
          err = 1;
        }
        for (i=0; i<data.length && !err; i++) {
          if (typeof(data[i]) !== "number") {
            err = 1;
          }
        }
      }
      if (!err) {
        if (estimatedEntropy === undefined) {
          /* horrible entropy estimator */
          estimatedEntropy = 0;
          for (i=0; i<data.length; i++) {
            tmp= data[i];
            while (tmp>0) {
              estimatedEntropy++;
              tmp = tmp >>> 1;
            }
          }
        }
        this._pools[robin].update([id,this._eventId++,2,estimatedEntropy,t,data.length].concat(data));
      }
      break;
      
    case "string":
      if (estimatedEntropy === undefined) {
       /* English text has just over 1 bit per character of entropy.
        * But this might be HTML or something, and have far less
        * entropy than English...  Oh well, let's just say one bit.
        */
       estimatedEntropy = data.length;
      }
      this._pools[robin].update([id,this._eventId++,3,estimatedEntropy,t,data.length]);
      this._pools[robin].update(data);
      break;
      
    default:
      err=1;
    }
    if (err) {
      throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
    }
  
    /* record the new strength */
    this._poolEntropy[robin] += estimatedEntropy;
    this._poolStrength += estimatedEntropy;
  
    /* fire off events */
    if (oldReady === this._NOT_READY) {
      if (this.isReady() !== this._NOT_READY) {
        this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
      }
      this._fireEvent("progress", this.getProgress());
    }
  },
  
  /** Is the generator ready? */
  isReady: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ (paranoia !== undefined) ? paranoia : this._defaultParanoia ];
  
    if (this._strength && this._strength >= entropyRequired) {
      return (this._poolEntropy[0] > this._BITS_PER_RESEED && (new Date()).valueOf() > this._nextReseed) ?
        this._REQUIRES_RESEED | this._READY :
        this._READY;
    } else {
      return (this._poolStrength >= entropyRequired) ?
        this._REQUIRES_RESEED | this._NOT_READY :
        this._NOT_READY;
    }
  },
  
  /** Get the generator's progress toward readiness, as a fraction */
  getProgress: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ paranoia ? paranoia : this._defaultParanoia ];
  
    if (this._strength >= entropyRequired) {
      return 1.0;
    } else {
      return (this._poolStrength > entropyRequired) ?
        1.0 :
        this._poolStrength / entropyRequired;
    }
  },
  
  /** start the built-in entropy collectors */
  startCollectors: function () {
    if (this._collectorsStarted) { return; }
  
    this._eventListener = {
      loadTimeCollector: this._bind(this._loadTimeCollector),
      mouseCollector: this._bind(this._mouseCollector),
      keyboardCollector: this._bind(this._keyboardCollector),
      accelerometerCollector: this._bind(this._accelerometerCollector),
      touchCollector: this._bind(this._touchCollector)
    };

    if (window.addEventListener) {
      window.addEventListener("load", this._eventListener.loadTimeCollector, false);
      window.addEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.addEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.addEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.addEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.attachEvent) {
      document.attachEvent("onload", this._eventListener.loadTimeCollector);
      document.attachEvent("onmousemove", this._eventListener.mouseCollector);
      document.attachEvent("keypress", this._eventListener.keyboardCollector);
    } else {
      throw new sjcl.exception.bug("can't attach event");
    }
  
    this._collectorsStarted = true;
  },
  
  /** stop the built-in entropy collectors */
  stopCollectors: function () {
    if (!this._collectorsStarted) { return; }
  
    if (window.removeEventListener) {
      window.removeEventListener("load", this._eventListener.loadTimeCollector, false);
      window.removeEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.removeEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.removeEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.removeEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.detachEvent) {
      document.detachEvent("onload", this._eventListener.loadTimeCollector);
      document.detachEvent("onmousemove", this._eventListener.mouseCollector);
      document.detachEvent("keypress", this._eventListener.keyboardCollector);
    }

    this._collectorsStarted = false;
  },
  
  /* use a cookie to store entropy.
  useCookie: function (all_cookies) {
      throw new sjcl.exception.bug("random: useCookie is unimplemented");
  },*/
  
  /** add an event listener for progress or seeded-ness. */
  addEventListener: function (name, callback) {
    this._callbacks[name][this._callbackI++] = callback;
  },
  
  /** remove an event listener for progress or seeded-ness */
  removeEventListener: function (name, cb) {
    var i, j, cbs=this._callbacks[name], jsTemp=[];

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */

    for (j in cbs) {
      if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
        jsTemp.push(j);
      }
    }

    for (i=0; i<jsTemp.length; i++) {
      j = jsTemp[i];
      delete cbs[j];
    }
  },
  
  _bind: function (func) {
    var that = this;
    return function () {
      func.apply(that, arguments);
    };
  },

  /** Generate 4 random words, no reseed, no gate.
   * @private
   */
  _gen4words: function () {
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
    return this._cipher.encrypt(this._counter);
  },
  
  /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
   * @private
   */
  _gate: function () {
    this._key = this._gen4words().concat(this._gen4words());
    this._cipher = new sjcl.cipher.aes(this._key);
  },
  
  /** Reseed the generator with the given words
   * @private
   */
  _reseed: function (seedWords) {
    this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
    this._cipher = new sjcl.cipher.aes(this._key);
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
  },
  
  /** reseed the data from the entropy pools
   * @param full If set, use all the entropy pools in the reseed.
   */
  _reseedFromPools: function (full) {
    var reseedData = [], strength = 0, i;
  
    this._nextReseed = reseedData[0] =
      (new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;
    
    for (i=0; i<16; i++) {
      /* On some browsers, this is cryptographically random.  So we might
       * as well toss it in the pot and stir...
       */
      reseedData.push(Math.random()*0x100000000|0);
    }
    
    for (i=0; i<this._pools.length; i++) {
     reseedData = reseedData.concat(this._pools[i].finalize());
     strength += this._poolEntropy[i];
     this._poolEntropy[i] = 0;
   
     if (!full && (this._reseedCount & (1<<i))) { break; }
    }
  
    /* if we used the last pool, push a new one onto the stack */
    if (this._reseedCount >= 1 << this._pools.length) {
     this._pools.push(new sjcl.hash.sha256());
     this._poolEntropy.push(0);
    }
  
    /* how strong was this reseed? */
    this._poolStrength -= strength;
    if (strength > this._strength) {
      this._strength = strength;
    }
  
    this._reseedCount ++;
    this._reseed(reseedData);
  },
  
  _keyboardCollector: function () {
    this._addCurrentTimeToEntropy(1);
  },
  
  _mouseCollector: function (ev) {
    var x, y;

    try {
      x = ev.x || ev.clientX || ev.offsetX || 0;
      y = ev.y || ev.clientY || ev.offsetY || 0;
    } catch (err) {
      // Event originated from a secure element. No mouse position available.
      x = 0;
      y = 0;
    }

    if (x != 0 && y!= 0) {
      sjcl.random.addEntropy([x,y], 2, "mouse");
    }

    this._addCurrentTimeToEntropy(0);
  },

  _touchCollector: function(ev) {
    var touch = ev.touches[0] || ev.changedTouches[0];
    var x = touch.pageX || touch.clientX,
        y = touch.pageY || touch.clientY;

    sjcl.random.addEntropy([x,y],1,"touch");

    this._addCurrentTimeToEntropy(0);
  },
  
  _loadTimeCollector: function () {
    this._addCurrentTimeToEntropy(2);
  },

  _addCurrentTimeToEntropy: function (estimatedEntropy) {
    if (typeof window !== 'undefined' && window.performance && typeof window.performance.now === "function") {
      //how much entropy do we want to add here?
      sjcl.random.addEntropy(window.performance.now(), estimatedEntropy, "loadtime");
    } else {
      sjcl.random.addEntropy((new Date()).valueOf(), estimatedEntropy, "loadtime");
    }
  },
  _accelerometerCollector: function (ev) {
    var ac = ev.accelerationIncludingGravity.x||ev.accelerationIncludingGravity.y||ev.accelerationIncludingGravity.z;
    if(window.orientation){
      var or = window.orientation;
      if (typeof or === "number") {
        sjcl.random.addEntropy(or, 1, "accelerometer");
      }
    }
    if (ac) {
      sjcl.random.addEntropy(ac, 2, "accelerometer");
    }
    this._addCurrentTimeToEntropy(0);
  },

  _fireEvent: function (name, arg) {
    var j, cbs=sjcl.random._callbacks[name], cbsTemp=[];
    /* TODO: there is a race condition between removing collectors and firing them */

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */

    for (j in cbs) {
      if (cbs.hasOwnProperty(j)) {
        cbsTemp.push(cbs[j]);
      }
    }

    for (j=0; j<cbsTemp.length; j++) {
      cbsTemp[j](arg);
    }
  }
};

/** an instance for the prng.
* @see sjcl.prng
*/
sjcl.random = new sjcl.prng(6); /* CHANGE (MODIFICATION - NOT FROM SJCL) for use in 'nCrypt': Removed automatically initialising random generator! */ 
/** @fileOverview Convenince functions centered around JSON encapsulation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

 /** @namespace JSON encapsulation */
 sjcl.json = {
  /** Default values for encryption */
  defaults: { v:1, iter:1000, ks:128, ts:64, mode:"ccm", adata:"", cipher:"aes" },

  /** Simple encryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} plaintext The data to encrypt.
   * @param {Object} [params] The parameters including tag, iv and salt.
   * @param {Object} [rp] A returned version with filled-in parameters.
   * @return {Object} The cipher raw data.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   */
  _encrypt: function (password, plaintext, params, rp) {
    params = params || {};
    rp = rp || {};

    var j = sjcl.json, p = j._add({ iv: sjcl.random.randomWords(4,0) },
                                  j.defaults), tmp, prp, adata;
    j._add(p, params);
    adata = p.adata;
    if (typeof p.salt === "string") {
      p.salt = sjcl.codec.base64.toBits(p.salt);
    }
    if (typeof p.iv === "string") {
      p.iv = sjcl.codec.base64.toBits(p.iv);
    }

    if (!sjcl.mode[p.mode] ||
        !sjcl.cipher[p.cipher] ||
        (typeof password === "string" && p.iter <= 100) ||
        (p.ts !== 64 && p.ts !== 96 && p.ts !== 128) ||
        (p.ks !== 128 && p.ks !== 192 && p.ks !== 256) ||
        (p.iv.length < 2 || p.iv.length > 4)) {
      throw new sjcl.exception.invalid("json encrypt: invalid parameters");
    }

    if (typeof password === "string") {
      tmp = sjcl.misc.cachedPbkdf2(password, p);
      password = tmp.key.slice(0,p.ks/32);
      p.salt = tmp.salt;
    } else if (sjcl.ecc && password instanceof sjcl.ecc.elGamal.publicKey) {
      tmp = password.kem();
      p.kemtag = tmp.tag;
      password = tmp.key.slice(0,p.ks/32);
    }
    if (typeof plaintext === "string") {
      plaintext = sjcl.codec.utf8String.toBits(plaintext);
    }
    if (typeof adata === "string") {
      p.adata = adata = sjcl.codec.utf8String.toBits(adata);
    }
    prp = new sjcl.cipher[p.cipher](password);

    /* return the json data */
    j._add(rp, p);
    rp.key = password;

    /* do the encryption */
    p.ct = sjcl.mode[p.mode].encrypt(prp, plaintext, p.iv, adata, p.ts);

    //return j.encode(j._subtract(p, j.defaults));
    return p;
  },

  /** Simple encryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} plaintext The data to encrypt.
   * @param {Object} [params] The parameters including tag, iv and salt.
   * @param {Object} [rp] A returned version with filled-in parameters.
   * @return {String} The ciphertext serialized data.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   */
  encrypt: function (password, plaintext, params, rp) {
    var j = sjcl.json, p = j._encrypt.apply(j, arguments);
    return j.encode(p);
  },

  /** Simple decryption function.
   * @param {String|bitArray} password The password or key.
   * @param {Object} ciphertext The cipher raw data to decrypt.
   * @param {Object} [params] Additional non-default parameters.
   * @param {Object} [rp] A returned object with filled parameters.
   * @return {String} The plaintext.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   * @throws {sjcl.exception.corrupt} if the ciphertext is corrupt.
   */
  _decrypt: function (password, ciphertext, params, rp) {
    params = params || {};
    rp = rp || {};

    var j = sjcl.json, p = j._add(j._add(j._add({},j.defaults),ciphertext), params, true), ct, tmp, prp, adata=p.adata;
    if (typeof p.salt === "string") {
      p.salt = sjcl.codec.base64.toBits(p.salt);
    }
    if (typeof p.iv === "string") {
      p.iv = sjcl.codec.base64.toBits(p.iv);
    }

    if (!sjcl.mode[p.mode] ||
        !sjcl.cipher[p.cipher] ||
        (typeof password === "string" && p.iter <= 100) ||
        (p.ts !== 64 && p.ts !== 96 && p.ts !== 128) ||
        (p.ks !== 128 && p.ks !== 192 && p.ks !== 256) ||
        (!p.iv) ||
        (p.iv.length < 2 || p.iv.length > 4)) {
      throw new sjcl.exception.invalid("json decrypt: invalid parameters");
    }

    if (typeof password === "string") {
      tmp = sjcl.misc.cachedPbkdf2(password, p);
      password = tmp.key.slice(0,p.ks/32);
      p.salt  = tmp.salt;
    } else if (sjcl.ecc && password instanceof sjcl.ecc.elGamal.secretKey) {
      password = password.unkem(sjcl.codec.base64.toBits(p.kemtag)).slice(0,p.ks/32);
    }
    if (typeof adata === "string") {
      adata = sjcl.codec.utf8String.toBits(adata);
    }
    prp = new sjcl.cipher[p.cipher](password);

    /* do the decryption */
    ct = sjcl.mode[p.mode].decrypt(prp, p.ct, p.iv, adata, p.ts);

    /* return the json data */
    j._add(rp, p);
    rp.key = password;

    if (params.raw === 1) {
      return ct;
    } else {
      return sjcl.codec.utf8String.fromBits(ct);
    }
  },

  /** Simple decryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} ciphertext The ciphertext to decrypt.
   * @param {Object} [params] Additional non-default parameters.
   * @param {Object} [rp] A returned object with filled parameters.
   * @return {String} The plaintext.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   * @throws {sjcl.exception.corrupt} if the ciphertext is corrupt.
   */
  decrypt: function (password, ciphertext, params, rp) {
    var j = sjcl.json;
    return j._decrypt(password, j.decode(ciphertext), params, rp);
  },

  /** Encode a flat structure into a JSON string.
   * @param {Object} obj The structure to encode.
   * @return {String} A JSON string.
   * @throws {sjcl.exception.invalid} if obj has a non-alphanumeric property.
   * @throws {sjcl.exception.bug} if a parameter has an unsupported type.
   */
  encode: function (obj) {
    var i, out='{', comma='';
    for (i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (!i.match(/^[a-z0-9]+$/i)) {
          throw new sjcl.exception.invalid("json encode: invalid property name");
        }
        out += comma + '"' + i + '":';
        comma = ',';

        switch (typeof obj[i]) {
          case 'number':
          case 'boolean':
            out += obj[i];
            break;

          case 'string':
            out += '"' + escape(obj[i]) + '"';
            break;

          case 'object':
            out += '"' + sjcl.codec.base64.fromBits(obj[i],0) + '"';
            break;

          default:
            throw new sjcl.exception.bug("json encode: unsupported type");
        }
      }
    }
    return out+'}';
  },

  /** Decode a simple (flat) JSON string into a structure.  The ciphertext,
   * adata, salt and iv will be base64-decoded.
   * @param {String} str The string.
   * @return {Object} The decoded structure.
   * @throws {sjcl.exception.invalid} if str isn't (simple) JSON.
   */
  decode: function (str) {
    str = str.replace(/\s/g,'');
    if (!str.match(/^\{.*\}$/)) {
      throw new sjcl.exception.invalid("json decode: this isn't json!");
    }
    var a = str.replace(/^\{|\}$/g, '').split(/,/), out={}, i, m;
    for (i=0; i<a.length; i++) {
      if (!(m=a[i].match(/^\s*(?:(["']?)([a-z][a-z0-9]*)\1)\s*:\s*(?:(-?\d+)|"([a-z0-9+\/%*_.@=\-]*)"|(true|false))$/i))) {
        throw new sjcl.exception.invalid("json decode: this isn't json!");
      }
      if (m[3]) {
        out[m[2]] = parseInt(m[3],10);
      } else if (m[4]) {
        out[m[2]] = m[2].match(/^(ct|adata|salt|iv)$/) ? sjcl.codec.base64.toBits(m[4]) : unescape(m[4]);
      } else if (m[5]) {
        out[m[2]] = m[5] === 'true';
      }
    }
    return out;
  },

  /** Insert all elements of src into target, modifying and returning target.
   * @param {Object} target The object to be modified.
   * @param {Object} src The object to pull data from.
   * @param {boolean} [requireSame=false] If true, throw an exception if any field of target differs from corresponding field of src.
   * @return {Object} target.
   * @private
   */
  _add: function (target, src, requireSame) {
    if (target === undefined) { target = {}; }
    if (src === undefined) { return target; }
    var i;
    for (i in src) {
      if (src.hasOwnProperty(i)) {
        if (requireSame && target[i] !== undefined && target[i] !== src[i]) {
          throw new sjcl.exception.invalid("required parameter overridden");
        }
        target[i] = src[i];
      }
    }
    return target;
  },

  /** Remove all elements of minus from plus.  Does not modify plus.
   * @private
   */
  _subtract: function (plus, minus) {
    var out = {}, i;

    for (i in plus) {
      if (plus.hasOwnProperty(i) && plus[i] !== minus[i]) {
        out[i] = plus[i];
      }
    }

    return out;
  },

  /** Return only the specified elements of src.
   * @private
   */
  _filter: function (src, filter) {
    var out = {}, i;
    for (i=0; i<filter.length; i++) {
      if (src[filter[i]] !== undefined) {
        out[filter[i]] = src[filter[i]];
      }
    }
    return out;
  }
};

/** Simple encryption function; convenient shorthand for sjcl.json.encrypt.
 * @param {String|bitArray} password The password or key.
 * @param {String} plaintext The data to encrypt.
 * @param {Object} [params] The parameters including tag, iv and salt.
 * @param {Object} [rp] A returned version with filled-in parameters.
 * @return {String} The ciphertext.
 */
sjcl.encrypt = sjcl.json.encrypt;

/** Simple decryption function; convenient shorthand for sjcl.json.decrypt.
 * @param {String|bitArray} password The password or key.
 * @param {String} ciphertext The ciphertext to decrypt.
 * @param {Object} [params] Additional non-default parameters.
 * @param {Object} [rp] A returned object with filled parameters.
 * @return {String} The plaintext.
 */
sjcl.decrypt = sjcl.json.decrypt;

/** The cache for cachedPbkdf2.
 * @private
 */
sjcl.misc._pbkdf2Cache = {};

/** Cached PBKDF2 key derivation.
 * @param {String} password The password.
 * @param {Object} [obj] The derivation params (iteration count and optional salt).
 * @return {Object} The derived data in key, the salt in salt.
 */
sjcl.misc.cachedPbkdf2 = function (password, obj) {
  var cache = sjcl.misc._pbkdf2Cache, c, cp, str, salt, iter;

  obj = obj || {};
  iter = obj.iter || 1000;

  /* open the cache for this password and iteration count */
  cp = cache[password] = cache[password] || {};
  c = cp[iter] = cp[iter] || { firstSalt: (obj.salt && obj.salt.length) ?
                     obj.salt.slice(0) : sjcl.random.randomWords(2,0) };

  salt = (obj.salt === undefined) ? c.firstSalt : obj.salt;

  c[salt] = c[salt] || sjcl.misc.pbkdf2(password, salt, obj.iter);
  return { key: c[salt].slice(0), salt:salt.slice(0) };
};

},{}],68:[function(require,module,exports){

module.exports = require('../bin/sjcl.js');

},{"../bin/sjcl.js":67}],69:[function(require,module,exports){
/*
 * Cipher.js
 * A block-cipher algorithm implementation on JavaScript
 * See Cipher.readme.txt for further information.
 *
 * Copyright(c) 2009 Atsushi Oka [ http://oka.nu/ ]
 * This script file is distributed under the LGPL
 *
 * ACKNOWLEDGMENT
 *
 *     The main subroutines are written by Michiel van Everdingen.
 * 
 *     Michiel van Everdingen
 *     http://home.versatel.nl/MAvanEverdingen/index.html
 * 
 *     All rights for these routines are reserved to Michiel van Everdingen.
 *
 */

/* 
 * CHANGED by photophobia, to avoid cluttering the global namespace and export
 * a convenient module.
 * */
module.exports = (function () {
/*
function initBlockCipher( packageRoot ) {
    __unit( "Cipher.js" );
    __uses( "packages.js" );
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Math
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var MAXINT = 0xFFFFFFFF;

function rotb(b,n){ return ( b<<n | b>>>( 8-n) ) & 0xFF; }
function rotw(w,n){ return ( w<<n | w>>>(32-n) ) & MAXINT; }
function getW(a,i){ return a[i]|a[i+1]<<8|a[i+2]<<16|a[i+3]<<24; }
function setW(a,i,w){ a.splice(i,4,w&0xFF,(w>>>8)&0xFF,(w>>>16)&0xFF,(w>>>24)&0xFF); }
function setWInv(a,i,w){ a.splice(i,4,(w>>>24)&0xFF,(w>>>16)&0xFF,(w>>>8)&0xFF,w&0xFF); }
function getB(x,n){ return (x>>>(n*8))&0xFF; }

function getNrBits(i){ var n=0; while (i>0){ n++; i>>>=1; } return n; }
function getMask(n){ return (1<<n)-1; }

// added 2008/11/13 XXX MUST USE ONE-WAY HASH FUNCTION FOR SECURITY REASON
function randByte() {
    /**
     * CHANGE:
     * nCrypt change 2014/10/22:
     * Try better sources for a random byte than Math.random before falling back
     * to this.
     * */
    
    var random_values_byte = function(){
        if(typeof Uint8Array==="undefined"){
            return null;
        }
        if(typeof window!=="undefined"){
            if(typeof window.crypto!=="undefined"){
                if(typeof window.crypto.getRandomValues!=="undefined"){
                    var ab=new Uint8Array(1);
                    window.crypto.getRandomValues(ab);
                    return ab[0];
                }
            }
            if(typeof window.msCrypto!=="undefined"){
                if(typeof window.msCrypto.getRandomValues!=="undefined"){
                    var ab=new Uint8Array(1);
                    window.msCrypto.getRandomValues(ab);
                    return ab[0];
                }
            }
        }
        return null;
    };
    var sjcl_secure_byte = function(){
        if(typeof sjcl !== "undefined"){
            if(typeof sjcl.random !== "undefined"){
                var ready = sjcl.random.isReady(10);
                if(ready===1||ready===true){
                    var words=sjcl.random.randomWords(1,10);
                    var bytes=sjcl.codec.bytes.fromBits(words);
                    return bytes[0];
                }
            }
        }
        return null;
    };
    var sjcl_insecure_byte = function(){
        if(typeof sjcl !== "undefined"){
            if(typeof sjcl.random !== "undefined"){
                var words=sjcl.random.randomWords(1,10);
                var bytes=sjcl.codec.bytes.fromBits(words);
                return bytes[0];
            }
        }
        return null;
    };
    
    var ssb=sjcl_secure_byte();
    if(typeof ssb==="number"){ return ssb; };
    var rvb=random_values_byte();
    if(typeof rvb==="number"){ return rvb; };
    var sib=sjcl_insecure_byte();
    if(typeof sib==="number"){ return sib; };
    /* Use Math.random only if all else fails. */
    //console.log("Having to use Math.random!!!");
    return Math.floor( Math.random() * 256 );
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ciphers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var ALGORITHMS = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AES
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createRijndael() {
    //
	var keyBytes      = null;
	var dataBytes     = null;
	var dataOffset    = -1;
	// var dataLength    = -1;
	var algorithmName = null;
	//var idx2          = -1;
    //

    algorithmName = "rijndael"

    var aesNk;
    var aesNr;

    var aesPows;
    var aesLogs;
    var aesSBox;
    var aesSBoxInv;
    var aesRco;
    var aesFtable;
    var aesRtable;
    var aesFi;
    var aesRi;
    var aesFkey;
    var aesRkey;

    function aesMult(x, y){ return (x&&y) ? aesPows[(aesLogs[x]+aesLogs[y])%255]:0; }

    function aesPackBlock() {
      return [ getW(dataBytes,dataOffset), getW(dataBytes,dataOffset+4), getW(dataBytes,dataOffset+8), getW(dataBytes,dataOffset+12) ];
    }

    function aesUnpackBlock(packed){
      for ( var j=0; j<4; j++,dataOffset+=4) setW( dataBytes, dataOffset, packed[j] );
    }

    function aesXTime(p){
      p <<= 1;
      return p&0x100 ? p^0x11B : p;
    }

    function aesSubByte(w){
      return aesSBox[getB(w,0)] | aesSBox[getB(w,1)]<<8 | aesSBox[getB(w,2)]<<16 | aesSBox[getB(w,3)]<<24;
    }

    function aesProduct(w1,w2){
      return aesMult(getB(w1,0),getB(w2,0)) ^ aesMult(getB(w1,1),getB(w2,1))
	   ^ aesMult(getB(w1,2),getB(w2,2)) ^ aesMult(getB(w1,3),getB(w2,3));
    }

    function aesInvMixCol(x){
      return aesProduct(0x090d0b0e,x)     | aesProduct(0x0d0b0e09,x)<<8 |
	     aesProduct(0x0b0e090d,x)<<16 | aesProduct(0x0e090d0b,x)<<24;
    }

    function aesByteSub(x){
      var y=aesPows[255-aesLogs[x]];
      x=y;  x=rotb(x,1);
      y^=x; x=rotb(x,1);
      y^=x; x=rotb(x,1);
      y^=x; x=rotb(x,1);
      return x^y^0x63;
    }

    function aesGenTables(){
      var i,y;
      aesPows = [ 1,3 ];
      aesLogs = [ 0,0,null,1 ];
      aesSBox = new Array(256);
      aesSBoxInv = new Array(256);
      aesFtable = new Array(256);
      aesRtable = new Array(256);
      aesRco = new Array(30);

      for ( i=2; i<256; i++){
	aesPows[i]=aesPows[i-1]^aesXTime( aesPows[i-1] );
	aesLogs[aesPows[i]]=i;
      }

      aesSBox[0]=0x63;
      aesSBoxInv[0x63]=0;
      for ( i=1; i<256; i++){
	y=aesByteSub(i);
	aesSBox[i]=y; aesSBoxInv[y]=i;
      }

      for (i=0,y=1; i<30; i++){ aesRco[i]=y; y=aesXTime(y); }

      for ( i=0; i<256; i++){
	y = aesSBox[i];
	aesFtable[i] = aesXTime(y) | y<<8 | y<<16 | (y^aesXTime(y))<<24;
	y = aesSBoxInv[i];
	aesRtable[i]= aesMult(14,y) | aesMult(9,y)<<8 |
		      aesMult(13,y)<<16 | aesMult(11,y)<<24;
      }
    }

    function aesInit( key ){
      keyBytes = key;
      keyBytes=keyBytes.slice(0,32);
      var i,k,m;
      var j = 0;
      var l = keyBytes.length;

      while ( l!=16 && l!=24 && l!=32 ) keyBytes[l++]=keyBytes[j++];
      aesGenTables();

      aesNk = keyBytes.length >>> 2;
      aesNr = 6 + aesNk;

      var N=4*(aesNr+1);

      aesFi = new Array(12);
      aesRi = new Array(12);
      aesFkey = new Array(N);
      aesRkey = new Array(N);

      for (m=j=0;j<4;j++,m+=3){
	aesFi[m]=(j+1)%4;
	aesFi[m+1]=(j+2)%4;
	aesFi[m+2]=(j+3)%4;
	aesRi[m]=(4+j-1)%4;
	aesRi[m+1]=(4+j-2)%4;
	aesRi[m+2]=(4+j-3)%4;
      }

      for (i=j=0;i<aesNk;i++,j+=4) aesFkey[i]=getW(keyBytes,j);

      for (k=0,j=aesNk;j<N;j+=aesNk,k++){
	aesFkey[j]=aesFkey[j-aesNk]^aesSubByte(rotw(aesFkey[j-1], 24))^aesRco[k];
	if (aesNk<=6)
	  for (i=1;i<aesNk && (i+j)<N;i++) aesFkey[i+j]=aesFkey[i+j-aesNk]^aesFkey[i+j-1];
	else{
	  for (i=1;i<4 &&(i+j)<N;i++) aesFkey[i+j]=aesFkey[i+j-aesNk]^aesFkey[i+j-1];
	  if ((j+4)<N) aesFkey[j+4]=aesFkey[j+4-aesNk]^aesSubByte(aesFkey[j+3]);
	  for (i=5;i<aesNk && (i+j)<N;i++) aesFkey[i+j]=aesFkey[i+j-aesNk]^aesFkey[i+j-1];
	}
      }

      for (j=0;j<4;j++) aesRkey[j+N-4]=aesFkey[j];
      for (i=4;i<N-4;i+=4){
	k=N-4-i;
	for (j=0;j<4;j++) aesRkey[k+j]=aesInvMixCol(aesFkey[i+j]);
      }
      for (j=N-4;j<N;j++) aesRkey[j-N+4]=aesFkey[j];
    }

    function aesClose(){
      aesPows=aesLogs=aesSBox=aesSBoxInv=aesRco=null;
      aesFtable=aesRtable=aesFi=aesRi=aesFkey=aesRkey=null;
    }

    function aesRounds( block, key, table, inc, box ){
      var tmp = new Array( 4 );
      var i,j,m,r;

      for ( r=0; r<4; r++ ) block[r]^=key[r];
      for ( i=1; i<aesNr; i++ ){
	for (j=m=0;j<4;j++,m+=3){
	  tmp[j]=key[r++]^table[block[j]&0xFF]^
		 rotw(table[(block[inc[m]]>>>8)&0xFF], 8)^
		 rotw(table[(block[inc[m+1]]>>>16)&0xFF], 16)^
		 rotw(table[(block[inc[m+2]]>>>24)&0xFF], 24);
	}
	var t=block; block=tmp; tmp=t;
      }

      for (j=m=0;j<4;j++,m+=3)
	tmp[j]=key[r++]^box[block[j]&0xFF]^
	       rotw(box[(block[inc[m  ]]>>> 8)&0xFF], 8)^
	       rotw(box[(block[inc[m+1]]>>>16)&0xFF],16)^
	       rotw(box[(block[inc[m+2]]>>>24)&0xFF],24);
      return tmp;
    }

    function aesEncrypt( data,offset ){
      dataBytes = data;
      dataOffset = offset;
      aesUnpackBlock( aesRounds( aesPackBlock(), aesFkey, aesFtable, aesFi, aesSBox ) );
    }

    function aesDecrypt( data,offset){
      dataBytes = data;
      dataOffset = offset;
      aesUnpackBlock( aesRounds(aesPackBlock(), aesRkey, aesRtable, aesRi, aesSBoxInv ) );
    }

    return {
	name    : "rijndael",
	blocksize : 128/8,
	open    : aesInit,
	close   : aesClose,
	encrypt : aesEncrypt,
	decrypt : aesDecrypt
    };
}
ALGORITHMS.RIJNDAEL = {
    create : createRijndael
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Serpent
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function createSerpent() {
    //
	var keyBytes      = null;
	var dataBytes     = null;
	var dataOffset    = -1;
	//var dataLength    = -1;
	var algorithmName = null;
	// var idx2          = -1;
    //

    algorithmName = "serpent";

    var srpKey=[];

    function srpK(r,a,b,c,d,i){
      r[a]^=srpKey[4*i]; r[b]^=srpKey[4*i+1]; r[c]^=srpKey[4*i+2]; r[d]^=srpKey[4*i+3];
    }

    function srpLK(r,a,b,c,d,e,i){
      r[a]=rotw(r[a],13);r[c]=rotw(r[c],3);r[b]^=r[a];r[e]=(r[a]<<3)&MAXINT;
      r[d]^=r[c];r[b]^=r[c];r[b]=rotw(r[b],1);r[d]^=r[e];r[d]=rotw(r[d],7);r[e]=r[b];
      r[a]^=r[b];r[e]=(r[e]<<7)&MAXINT;r[c]^=r[d];r[a]^=r[d];r[c]^=r[e];r[d]^=srpKey[4*i+3];
      r[b]^=srpKey[4*i+1];r[a]=rotw(r[a],5);r[c]=rotw(r[c],22);r[a]^=srpKey[4*i+0];r[c]^=srpKey[4*i+2];
    }

    function srpKL(r,a,b,c,d,e,i){
      r[a]^=srpKey[4*i+0];r[b]^=srpKey[4*i+1];r[c]^=srpKey[4*i+2];r[d]^=srpKey[4*i+3];
      r[a]=rotw(r[a],27);r[c]=rotw(r[c],10);r[e]=r[b];r[c]^=r[d];r[a]^=r[d];r[e]=(r[e]<<7)&MAXINT;
      r[a]^=r[b];r[b]=rotw(r[b],31);r[c]^=r[e];r[d]=rotw(r[d],25);r[e]=(r[a]<<3)&MAXINT;
      r[b]^=r[a];r[d]^=r[e];r[a]=rotw(r[a],19);r[b]^=r[c];r[d]^=r[c];r[c]=rotw(r[c],29);
    }

    var srpS=[
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x3];r[x3]|=r[x0];r[x0]^=r[x4];r[x4]^=r[x2];r[x4]=~r[x4];r[x3]^=r[x1];
      r[x1]&=r[x0];r[x1]^=r[x4];r[x2]^=r[x0];r[x0]^=r[x3];r[x4]|=r[x0];r[x0]^=r[x2];
      r[x2]&=r[x1];r[x3]^=r[x2];r[x1]=~r[x1];r[x2]^=r[x4];r[x1]^=r[x2];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x1];r[x1]^=r[x0];r[x0]^=r[x3];r[x3]=~r[x3];r[x4]&=r[x1];r[x0]|=r[x1];
      r[x3]^=r[x2];r[x0]^=r[x3];r[x1]^=r[x3];r[x3]^=r[x4];r[x1]|=r[x4];r[x4]^=r[x2];
      r[x2]&=r[x0];r[x2]^=r[x1];r[x1]|=r[x0];r[x0]=~r[x0];r[x0]^=r[x2];r[x4]^=r[x1];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x3]=~r[x3];r[x1]^=r[x0];r[x4]=r[x0];r[x0]&=r[x2];r[x0]^=r[x3];r[x3]|=r[x4];
      r[x2]^=r[x1];r[x3]^=r[x1];r[x1]&=r[x0];r[x0]^=r[x2];r[x2]&=r[x3];r[x3]|=r[x1];
      r[x0]=~r[x0];r[x3]^=r[x0];r[x4]^=r[x0];r[x0]^=r[x2];r[x1]|=r[x2];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x1];r[x1]^=r[x3];r[x3]|=r[x0];r[x4]&=r[x0];r[x0]^=r[x2];r[x2]^=r[x1];r[x1]&=r[x3];
      r[x2]^=r[x3];r[x0]|=r[x4];r[x4]^=r[x3];r[x1]^=r[x0];r[x0]&=r[x3];r[x3]&=r[x4];
      r[x3]^=r[x2];r[x4]|=r[x1];r[x2]&=r[x1];r[x4]^=r[x3];r[x0]^=r[x3];r[x3]^=r[x2];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x3];r[x3]&=r[x0];r[x0]^=r[x4];r[x3]^=r[x2];r[x2]|=r[x4];r[x0]^=r[x1];
      r[x4]^=r[x3];r[x2]|=r[x0];r[x2]^=r[x1];r[x1]&=r[x0];r[x1]^=r[x4];r[x4]&=r[x2];
      r[x2]^=r[x3];r[x4]^=r[x0];r[x3]|=r[x1];r[x1]=~r[x1];r[x3]^=r[x0];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x1];r[x1]|=r[x0];r[x2]^=r[x1];r[x3]=~r[x3];r[x4]^=r[x0];r[x0]^=r[x2];
      r[x1]&=r[x4];r[x4]|=r[x3];r[x4]^=r[x0];r[x0]&=r[x3];r[x1]^=r[x3];r[x3]^=r[x2];
      r[x0]^=r[x1];r[x2]&=r[x4];r[x1]^=r[x2];r[x2]&=r[x0];r[x3]^=r[x2];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x1];r[x3]^=r[x0];r[x1]^=r[x2];r[x2]^=r[x0];r[x0]&=r[x3];r[x1]|=r[x3];
      r[x4]=~r[x4];r[x0]^=r[x1];r[x1]^=r[x2];r[x3]^=r[x4];r[x4]^=r[x0];r[x2]&=r[x0];
      r[x4]^=r[x1];r[x2]^=r[x3];r[x3]&=r[x1];r[x3]^=r[x0];r[x1]^=r[x2];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x1]=~r[x1];r[x4]=r[x1];r[x0]=~r[x0];r[x1]&=r[x2];r[x1]^=r[x3];r[x3]|=r[x4];r[x4]^=r[x2];
      r[x2]^=r[x3];r[x3]^=r[x0];r[x0]|=r[x1];r[x2]&=r[x0];r[x0]^=r[x4];r[x4]^=r[x3];
      r[x3]&=r[x0];r[x4]^=r[x1];r[x2]^=r[x4];r[x3]^=r[x1];r[x4]|=r[x0];r[x4]^=r[x1];
    }];

    var srpSI=[
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x3];r[x1]^=r[x0];r[x3]|=r[x1];r[x4]^=r[x1];r[x0]=~r[x0];r[x2]^=r[x3];
      r[x3]^=r[x0];r[x0]&=r[x1];r[x0]^=r[x2];r[x2]&=r[x3];r[x3]^=r[x4];r[x2]^=r[x3];
      r[x1]^=r[x3];r[x3]&=r[x0];r[x1]^=r[x0];r[x0]^=r[x2];r[x4]^=r[x3];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x1]^=r[x3];r[x4]=r[x0];r[x0]^=r[x2];r[x2]=~r[x2];r[x4]|=r[x1];r[x4]^=r[x3];
      r[x3]&=r[x1];r[x1]^=r[x2];r[x2]&=r[x4];r[x4]^=r[x1];r[x1]|=r[x3];r[x3]^=r[x0];
      r[x2]^=r[x0];r[x0]|=r[x4];r[x2]^=r[x4];r[x1]^=r[x0];r[x4]^=r[x1];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x2]^=r[x1];r[x4]=r[x3];r[x3]=~r[x3];r[x3]|=r[x2];r[x2]^=r[x4];r[x4]^=r[x0];
      r[x3]^=r[x1];r[x1]|=r[x2];r[x2]^=r[x0];r[x1]^=r[x4];r[x4]|=r[x3];r[x2]^=r[x3];
      r[x4]^=r[x2];r[x2]&=r[x1];r[x2]^=r[x3];r[x3]^=r[x4];r[x4]^=r[x0];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x2]^=r[x1];r[x4]=r[x1];r[x1]&=r[x2];r[x1]^=r[x0];r[x0]|=r[x4];r[x4]^=r[x3];
      r[x0]^=r[x3];r[x3]|=r[x1];r[x1]^=r[x2];r[x1]^=r[x3];r[x0]^=r[x2];r[x2]^=r[x3];
      r[x3]&=r[x1];r[x1]^=r[x0];r[x0]&=r[x2];r[x4]^=r[x3];r[x3]^=r[x0];r[x0]^=r[x1];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x2]^=r[x3];r[x4]=r[x0];r[x0]&=r[x1];r[x0]^=r[x2];r[x2]|=r[x3];r[x4]=~r[x4];
      r[x1]^=r[x0];r[x0]^=r[x2];r[x2]&=r[x4];r[x2]^=r[x0];r[x0]|=r[x4];r[x0]^=r[x3];
      r[x3]&=r[x2];r[x4]^=r[x3];r[x3]^=r[x1];r[x1]&=r[x0];r[x4]^=r[x1];r[x0]^=r[x3];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x1];r[x1]|=r[x2];r[x2]^=r[x4];r[x1]^=r[x3];r[x3]&=r[x4];r[x2]^=r[x3];r[x3]|=r[x0];
      r[x0]=~r[x0];r[x3]^=r[x2];r[x2]|=r[x0];r[x4]^=r[x1];r[x2]^=r[x4];r[x4]&=r[x0];r[x0]^=r[x1];
      r[x1]^=r[x3];r[x0]&=r[x2];r[x2]^=r[x3];r[x0]^=r[x2];r[x2]^=r[x4];r[x4]^=r[x3];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x0]^=r[x2];r[x4]=r[x0];r[x0]&=r[x3];r[x2]^=r[x3];r[x0]^=r[x2];r[x3]^=r[x1];
      r[x2]|=r[x4];r[x2]^=r[x3];r[x3]&=r[x0];r[x0]=~r[x0];r[x3]^=r[x1];r[x1]&=r[x2];
      r[x4]^=r[x0];r[x3]^=r[x4];r[x4]^=r[x2];r[x0]^=r[x1];r[x2]^=r[x0];
    },
    function(r,x0,x1,x2,x3,x4){
      r[x4]=r[x3];r[x3]&=r[x0];r[x0]^=r[x2];r[x2]|=r[x4];r[x4]^=r[x1];r[x0]=~r[x0];r[x1]|=r[x3];
      r[x4]^=r[x0];r[x0]&=r[x2];r[x0]^=r[x1];r[x1]&=r[x2];r[x3]^=r[x2];r[x4]^=r[x3];
      r[x2]&=r[x3];r[x3]|=r[x0];r[x1]^=r[x4];r[x3]^=r[x4];r[x4]&=r[x0];r[x4]^=r[x2];
    }];

    var srpKc=[7788,63716,84032,7891,78949,25146,28835,67288,84032,40055,7361,1940,77639,27525,24193,75702,
      7361,35413,83150,82383,58619,48468,18242,66861,83150,69667,7788,31552,40054,23222,52496,57565,7788,63716];
    var srpEc=[44255,61867,45034,52496,73087,56255,43827,41448,18242,1939,18581,56255,64584,31097,26469,
      77728,77639,4216,64585,31097,66861,78949,58006,59943,49676,78950,5512,78949,27525,52496,18670,76143];
    var srpDc=[44255,60896,28835,1837,1057,4216,18242,77301,47399,53992,1939,1940,66420,39172,78950,
      45917,82383,7450,67288,26469,83149,57565,66419,47400,58006,44254,18581,18228,33048,45034,66508,7449];

    function srpInit(key)
    {
      keyBytes = key;
      var i,j,m,n;
      function keyIt(a,b,c,d,i){ srpKey[i]=r[b]=rotw(srpKey[a]^r[b]^r[c]^r[d]^0x9e3779b9^i,11); }
      function keyLoad(a,b,c,d,i){ r[a]=srpKey[i]; r[b]=srpKey[i+1]; r[c]=srpKey[i+2]; r[d]=srpKey[i+3]; }
      function keyStore(a,b,c,d,i){ srpKey[i]=r[a]; srpKey[i+1]=r[b]; srpKey[i+2]=r[c]; srpKey[i+3]=r[d]; }

      keyBytes.reverse();
      keyBytes[keyBytes.length]=1; while (keyBytes.length<32) keyBytes[keyBytes.length]=0;
      for (i=0; i<8; i++){
	srpKey[i] = (keyBytes[4*i+0] & 0xff)       | (keyBytes[4*i+1] & 0xff) <<  8 |
	(keyBytes[4*i+2] & 0xff) << 16 | (keyBytes[4*i+3] & 0xff) << 24;
      }

      var r = [srpKey[3],srpKey[4],srpKey[5],srpKey[6],srpKey[7]];

      i=0; j=0;
      while (keyIt(j++,0,4,2,i++),keyIt(j++,1,0,3,i++),i<132){
	keyIt(j++,2,1,4,i++); if (i==8){j=0;}
	keyIt(j++,3,2,0,i++); keyIt(j++,4,3,1,i++);
      }

      i=128; j=3; n=0;
      while(m=srpKc[n++],srpS[j++%8](r,m%5,m%7,m%11,m%13,m%17),m=srpKc[n],keyStore(m%5,m%7,m%11,m%13,i),i>0){
	i-=4; keyLoad(m%5,m%7,m%11,m%13,i);
      }
    }

    function srpClose(){
      srpKey=[];
    }

    function srpEncrypt( data,offset)
    {
      dataBytes = data;
      dataOffset = offset;
      var blk = dataBytes.slice(dataOffset,dataOffset+16); blk.reverse();
      var r=[getW(blk,0),getW(blk,4),getW(blk,8),getW(blk,12)];

      srpK(r,0,1,2,3,0);
      var n=0, m=srpEc[n];
      while (srpS[n%8](r,m%5,m%7,m%11,m%13,m%17),n<31){ m=srpEc[++n]; srpLK(r,m%5,m%7,m%11,m%13,m%17,n); }
      srpK(r,0,1,2,3,32);

      for (var j=3; j>=0; j--,dataOffset+=4) setWInv(dataBytes,dataOffset,r[j]);
    }

    function srpDecrypt(data,offset)
    {
      dataBytes = data;
      dataOffset = offset;
      var blk = dataBytes.slice(dataOffset,dataOffset+16); blk.reverse();
      var r=[getW(blk,0),getW(blk,4),getW(blk,8),getW(blk,12)];

      srpK(r,0,1,2,3,32);
      var n=0, m=srpDc[n];
      while (srpSI[7-n%8](r,m%5,m%7,m%11,m%13,m%17),n<31){ m=srpDc[++n]; srpKL(r,m%5,m%7,m%11,m%13,m%17,32-n); }
      srpK(r,2,3,1,4,0);

      setWInv(dataBytes,dataOffset,r[4]); setWInv(dataBytes,dataOffset+4,r[1]); setWInv(dataBytes,dataOffset+8,r[3]); setWInv(dataBytes,dataOffset+12,r[2]);
      dataOffset+=16;
    }

    return {
	name    : "serpent",
	blocksize : 128/8,
	open    : srpInit,
	close   : srpClose,
	encrypt : srpEncrypt,
	decrypt : srpDecrypt
    };
}
ALGORITHMS.SERPENT = {
    create : createSerpent
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Twofish
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createTwofish() {
    //
	var keyBytes      = null;
	var dataBytes     = null;
	var dataOffset    = -1;
	// var dataLength    = -1;
	var algorithmName = null;
	// var idx2          = -1;
    //

    algorithmName = "twofish";

    var tfsKey=[];
    var tfsM=[[],[],[],[]];

    function tfsInit(key)
    {
      keyBytes = key;
      var  i, a, b, c, d, meKey=[], moKey=[], inKey=[];
      var kLen;
      var sKey=[];
      var  f01, f5b, fef;

      var q0=[[8,1,7,13,6,15,3,2,0,11,5,9,14,12,10,4],[2,8,11,13,15,7,6,14,3,1,9,4,0,10,12,5]];
      var q1=[[14,12,11,8,1,2,3,5,15,4,10,6,7,0,9,13],[1,14,2,11,4,12,3,7,6,13,10,5,15,9,0,8]];
      var q2=[[11,10,5,14,6,13,9,0,12,8,15,3,2,4,7,1],[4,12,7,5,1,6,9,10,0,14,13,8,2,11,3,15]];
      var q3=[[13,7,15,4,1,2,6,14,9,11,3,0,8,5,12,10],[11,9,5,1,12,3,13,14,6,4,7,15,2,0,8,10]];
      var ror4=[0,8,1,9,2,10,3,11,4,12,5,13,6,14,7,15];
      var ashx=[0,9,2,11,4,13,6,15,8,1,10,3,12,5,14,7];
      var q=[[],[]];
      var m=[[],[],[],[]];

      function ffm5b(x){ return x^(x>>2)^[0,90,180,238][x&3]; }
      function ffmEf(x){ return x^(x>>1)^(x>>2)^[0,238,180,90][x&3]; }

      function mdsRem(p,q){
	var i,t,u;
	for(i=0; i<8; i++){
	  t = q>>>24;
	  q = ((q<<8)&MAXINT) | p>>>24;
	  p = (p<<8)&MAXINT;
	  u = t<<1; if (t&128){ u^=333; }
	  q ^= t^(u<<16);
	  u ^= t>>>1; if (t&1){ u^=166; }
	  q ^= u<<24 | u<<8;
	}
	return q;
      }

      function qp(n,x){
	var a,b,c,d;
	a=x>>4; b=x&15;
	c=q0[n][a^b]; d=q1[n][ror4[b]^ashx[a]];
	return q3[n][ror4[d]^ashx[c]]<<4 | q2[n][c^d];
      }

      function hFun(x,key){
	var a=getB(x,0), b=getB(x,1), c=getB(x,2), d=getB(x,3);
	switch(kLen){
	case 4:
	  a = q[1][a]^getB(key[3],0);
	  b = q[0][b]^getB(key[3],1);
	  c = q[0][c]^getB(key[3],2);
	  d = q[1][d]^getB(key[3],3);
	case 3:
	  a = q[1][a]^getB(key[2],0);
	  b = q[1][b]^getB(key[2],1);
	  c = q[0][c]^getB(key[2],2);
	  d = q[0][d]^getB(key[2],3);
	case 2:
	  a = q[0][q[0][a]^getB(key[1],0)]^getB(key[0],0);
	  b = q[0][q[1][b]^getB(key[1],1)]^getB(key[0],1);
	  c = q[1][q[0][c]^getB(key[1],2)]^getB(key[0],2);
	  d = q[1][q[1][d]^getB(key[1],3)]^getB(key[0],3);
	}
	return m[0][a]^m[1][b]^m[2][c]^m[3][d];
      }

      keyBytes=keyBytes.slice(0,32); i=keyBytes.length;
      while ( i!=16 && i!=24 && i!=32 ) keyBytes[i++]=0;

      for (i=0; i<keyBytes.length; i+=4){ inKey[i>>2]=getW(keyBytes,i); }
      for (i=0; i<256; i++){ q[0][i]=qp(0,i); q[1][i]=qp(1,i); }
      for (i=0; i<256; i++){
	f01 = q[1][i]; f5b = ffm5b(f01); fef = ffmEf(f01);
	m[0][i] = f01 + (f5b<<8) + (fef<<16) + (fef<<24);
	m[2][i] = f5b + (fef<<8) + (f01<<16) + (fef<<24);
	f01 = q[0][i]; f5b = ffm5b(f01); fef = ffmEf(f01);
	m[1][i] = fef + (fef<<8) + (f5b<<16) + (f01<<24);
	m[3][i] = f5b + (f01<<8) + (fef<<16) + (f5b<<24);
      }

      kLen = inKey.length/2;
      for (i=0; i<kLen; i++){
	a = inKey[i+i];   meKey[i] = a;
	b = inKey[i+i+1]; moKey[i] = b;
	sKey[kLen-i-1] = mdsRem(a,b);
      }
      for (i=0; i<40; i+=2){
	a=0x1010101*i; b=a+0x1010101;
	a=hFun(a,meKey);
	b=rotw(hFun(b,moKey),8);
	tfsKey[i]=(a+b)&MAXINT;
	tfsKey[i+1]=rotw(a+2*b,9);
      }
      for (i=0; i<256; i++){
	a=b=c=d=i;
	switch(kLen){
	case 4:
	  a = q[1][a]^getB(sKey[3],0);
	  b = q[0][b]^getB(sKey[3],1);
	  c = q[0][c]^getB(sKey[3],2);
	  d = q[1][d]^getB(sKey[3],3);
	case 3:
	  a = q[1][a]^getB(sKey[2],0);
	  b = q[1][b]^getB(sKey[2],1);
	  c = q[0][c]^getB(sKey[2],2);
	  d = q[0][d]^getB(sKey[2],3);
	case 2:
	  tfsM[0][i] = m[0][q[0][q[0][a]^getB(sKey[1],0)]^getB(sKey[0],0)];
	  tfsM[1][i] = m[1][q[0][q[1][b]^getB(sKey[1],1)]^getB(sKey[0],1)];
	  tfsM[2][i] = m[2][q[1][q[0][c]^getB(sKey[1],2)]^getB(sKey[0],2)];
	  tfsM[3][i] = m[3][q[1][q[1][d]^getB(sKey[1],3)]^getB(sKey[0],3)];
	}
      }
    }

    function tfsG0(x){ return tfsM[0][getB(x,0)]^tfsM[1][getB(x,1)]^tfsM[2][getB(x,2)]^tfsM[3][getB(x,3)]; }
    function tfsG1(x){ return tfsM[0][getB(x,3)]^tfsM[1][getB(x,0)]^tfsM[2][getB(x,1)]^tfsM[3][getB(x,2)]; }

    function tfsFrnd(r,blk){
      var a=tfsG0(blk[0]); var b=tfsG1(blk[1]);
      blk[2] = rotw( blk[2]^(a+b+tfsKey[4*r+8])&MAXINT, 31 );
      blk[3] = rotw(blk[3],1) ^ (a+2*b+tfsKey[4*r+9])&MAXINT;
      a=tfsG0(blk[2]); b=tfsG1(blk[3]);
      blk[0] = rotw( blk[0]^(a+b+tfsKey[4*r+10])&MAXINT, 31 );
      blk[1] = rotw(blk[1],1) ^ (a+2*b+tfsKey[4*r+11])&MAXINT;
    }

    function tfsIrnd(i,blk){
      var a=tfsG0(blk[0]); var b=tfsG1(blk[1]);
      blk[2] = rotw(blk[2],1) ^ (a+b+tfsKey[4*i+10])&MAXINT;
      blk[3] = rotw( blk[3]^(a+2*b+tfsKey[4*i+11])&MAXINT, 31 );
      a=tfsG0(blk[2]); b=tfsG1(blk[3]);
      blk[0] = rotw(blk[0],1) ^ (a+b+tfsKey[4*i+8])&MAXINT;
      blk[1] = rotw( blk[1]^(a+2*b+tfsKey[4*i+9])&MAXINT, 31 );
    }

    function tfsClose(){
      tfsKey=[];
      tfsM=[[],[],[],[]];
    }

    function tfsEncrypt( data,offset){
      dataBytes = data;
      dataOffset = offset;
      var blk=[getW(dataBytes,dataOffset)^tfsKey[0], getW(dataBytes,dataOffset+4)^tfsKey[1], getW(dataBytes,dataOffset+8)^tfsKey[2], getW(dataBytes,dataOffset+12)^tfsKey[3]];
      for (var j=0;j<8;j++){ tfsFrnd(j,blk); }
      setW(dataBytes,dataOffset   ,blk[2]^tfsKey[4]);
      setW(dataBytes,dataOffset+ 4,blk[3]^tfsKey[5]);
      setW(dataBytes,dataOffset+ 8,blk[0]^tfsKey[6]);
      setW(dataBytes,dataOffset+12,blk[1]^tfsKey[7]);
      dataOffset+=16;
    }

    function tfsDecrypt(data,offset){
      dataBytes = data;
      dataOffset = offset;
      var blk=[getW(dataBytes,dataOffset)^tfsKey[4], getW(dataBytes,dataOffset+4)^tfsKey[5], getW(dataBytes,dataOffset+8)^tfsKey[6], getW(dataBytes,dataOffset+12)^tfsKey[7]];
      for (var j=7;j>=0;j--){ tfsIrnd(j,blk); }
      setW(dataBytes,dataOffset   ,blk[2]^tfsKey[0]);
      setW(dataBytes,dataOffset+ 4,blk[3]^tfsKey[1]);
      setW(dataBytes,dataOffset+ 8,blk[0]^tfsKey[2]);
      setW(dataBytes,dataOffset+12,blk[1]^tfsKey[3]);
      dataOffset+=16;
    }

    return {
	name    : "twofish",
	blocksize : 128/8,
	open    : tfsInit,
	close   : tfsClose,
	encrypt : tfsEncrypt,
	decrypt : tfsDecrypt
    };
}
ALGORITHMS.TWOFISH  = {
    create : createTwofish
};




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BLOCK CIPHER MODES
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var MODES = {};

function createECB() {
    function encryptOpenECB() {
	this.algorithm.open( this.keyBytes );
	this.dataLength = this.dataBytes.length;
	this.dataOffset=0;
	// idx2=0;
	return;
    }

    function encryptCloseECB() {
	this.algorithm.close();
    }
    function encryptProcECB(){
	this.algorithm.encrypt( this.dataBytes, this.dataOffset );
	this.dataOffset += this.algorithm.blocksize;
	if (this.dataLength<=this.dataOffset) {
	    return 0;
	} else {
	    return this.dataLength-this.dataOffset;
	}
    }
    function decryptOpenECB() {
	this.algorithm.open( this.keyBytes );
	// this.dataLength = dataBytes.length;
	this.dataLength = this.dataBytes.length;
	this.dataOffset=0;
	// idx2=0;
	return;
    }

    function decryptProcECB(){
	this.algorithm.decrypt( this.dataBytes, this.dataOffset );
	this.dataOffset += this.algorithm.blocksize;
	if ( this.dataLength<=this.dataOffset ){
	    return 0;
	} else {
	    return this.dataLength-this.dataOffset;
	}
    }
    function decryptCloseECB() {
	this.algorithm.close();

	// ???
	while( this.dataBytes[this.dataBytes.length-1] ==0 )
	    this.dataBytes.pop();
	// while( dataBytes[dataBytes.length-1] ==0 )
	//     dataBytes.pop();
    }

    return {
	encrypt : {
	    open  : encryptOpenECB,
	    exec  : encryptProcECB, 
	    close : encryptCloseECB
	},
	decrypt : {
	    open  : decryptOpenECB,
	    exec  : decryptProcECB,
	    close : decryptCloseECB 
	}
    };
}
MODES.ECB = createECB();


function createCBC() {
    function encryptOpenCBC() {
	this.algorithm.open( this.keyBytes );
	this.dataBytes.unshift(
	    randByte(),randByte(),randByte(),randByte(),   randByte(),randByte(),randByte(),randByte(), 
	    randByte(),randByte(),randByte(),randByte(),   randByte(),randByte(),randByte(),randByte()
	);
	this.dataLength = this.dataBytes.length;
	this.dataOffset=16;
	// idx2=0;
	return;
    }
    function encryptProcCBC(){
	for (var idx2=this.dataOffset; idx2<this.dataOffset+16; idx2++)
	    this.dataBytes[idx2] ^= this.dataBytes[idx2-16];
	this.algorithm.encrypt( this.dataBytes, this.dataOffset );
	this.dataOffset += this.algorithm.blocksize;

	if (this.dataLength<=this.dataOffset) {
	    return 0;
	} else {
	    return this.dataLength-this.dataOffset;
	}
    }
    function encryptCloseCBC() {
	this.algorithm.close();
    }

    function decryptOpenCBC() {
	this.algorithm.open( this.keyBytes );
	this.dataLength = this.dataBytes.length;

	// notice it start from dataOffset:16
	this.dataOffset=16;

	// added 2008/12/31
	// 1. Create a new field for initialization vector.
	// 2. Get initialized vector and store it on the new field. 
	this.iv = this.dataBytes.slice(0,16);

	// idx2=0;
	return;
    }

    // function decryptProcCBC(){
    //     this.dataOffset=this.dataLength-this.dataOffset;
    //
    //     this.algorithm.decrypt( this.dataBytes, this.dataOffset );
    //     this.dataOffset += this.algorithm.blocksize;
    //
    //     for (var idx2=this.dataOffset-16; idx2<this.dataOffset; idx2++)
    //         this.dataBytes[idx2] ^= this.dataBytes[idx2-16];
    //
    //     this.dataOffset = this.dataLength+32-this.dataOffset;
    //
    //     if ( this.dataLength<=this.dataOffset ){
    //         return 0;
    //     } else {
    //         return this.dataLength-this.dataOffset;
    //     }
    // }

    function decryptProcCBC(){
	// copy cipher text for later use of initialization vector.
	var iv2 = this.dataBytes.slice( this.dataOffset, this.dataOffset + 16 );
	// decryption
	this.algorithm.decrypt( this.dataBytes, this.dataOffset );
	// xor with the current initialization vector. 
	for ( var ii=0; ii<16; ii++ )
	    this.dataBytes[this.dataOffset+ii] ^= this.iv[ii];

	// advance the index counter.
	this.dataOffset += this.algorithm.blocksize;
	// set the copied previous cipher text as the current initialization vector.
	this.iv = iv2;

	if ( this.dataLength<=this.dataOffset ){
	    return 0;
	} else {
	    return this.dataLength-this.dataOffset;
	}
    }
    function decryptCloseCBC() {
	this.algorithm.close();
	// trace( "splice.before:"+base16( this.dataBytes ) );
	this.dataBytes.splice(0,16);
	// trace( "splice.after:"+base16( this.dataBytes ) );

	// ???
	while( this.dataBytes[this.dataBytes.length-1] ==0 )
	    this.dataBytes.pop();
    }

    return {
	encrypt : {
	    open  : encryptOpenCBC,
	    exec  : encryptProcCBC, 
	    close : encryptCloseCBC
	},
	decrypt : {
	    open  : decryptOpenCBC,
	    exec  : decryptProcCBC,
	    close : decryptCloseCBC 
	}
    };
}
MODES.CBC = createCBC();

function createCFB() {
    function encryptOpenCFB() {
	throw "not implemented!";
    }
    function encryptProcCFB(){
	throw "not implemented!";
    }
    function encryptCloseCFB() {
	throw "not implemented!";
    }
    function decryptOpenCFB() {
	throw "not implemented!";
    }
    function decryptProcCFB(){
	throw "not implemented!";
    }
    function decryptCloseCFB() {
	throw "not implemented!";
    }

    return {
	encrypt : {
	    open  : encryptOpenCFB,
	    exec  : encryptProcCFB, 
	    close : encryptCloseCFB
	},
	decrypt : {
	    open  : decryptOpenCFB,
	    exec  : decryptProcCFB,
	    close : decryptCloseCFB 
	}
    };
}
MODES.CFB = createCFB();

function createOFB(){
    function encryptOpenOFB() {
	throw "not implemented!";
    }
    function encryptProcOFB(){
	throw "not implemented!";
    }
    function encryptCloseOFB() {
	throw "not implemented!";
    }
    function decryptOpenOFB() {
	throw "not implemented!";
    }
    function decryptProcOFB(){
	throw "not implemented!";
    }
    function decryptCloseOFB() {
	throw "not implemented!";
    }

    return {
	encrypt : {
	    open  : encryptOpenOFB,
	    exec  : encryptProcOFB, 
	    close : encryptCloseOFB
	},
	decrypt : {
	    open  : decryptOpenOFB,
	    exec  : decryptProcOFB,
	    close : decryptCloseOFB 
	}
    };
}
MODES.OFB = createOFB();

function createCTR() {
    function encryptOpenCTR() {
	throw "not implemented!";
    }
    function encryptProcCTR(){
	throw "not implemented!";
    }
    function encryptCloseCTR() {
	throw "not implemented!";
    }
    function decryptOpenCTR() {
	throw "not implemented!";
    }
    function decryptProcCTR(){
	throw "not implemented!";
    }
    function decryptCloseCTR() {
	throw "not implemented!";
    }

    return {
	encrypt : {
	    open  : encryptOpenCTR,
	    exec  : encryptProcCTR, 
	    close : encryptCloseCTR
	},
	decrypt : {
	    open  : decryptOpenCTR,
	    exec  : decryptProcCTR,
	    close : decryptCloseCTR 
	}
    };
}
MODES.CTR = createCTR();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PADDING ALGORITHMS
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var PADDINGS = {};

/*
 * | DD DD DD DD DD DD DD DD | DD DD DD 80 00 00 00 00 |
 */
function createRFC1321() {
    function appendPaddingRFC1321(data) {
	var len = 16 - ( data.length % 16 );
	data.push( 0x80 );
	for ( var i=1;i<len;i++ ) {
	    data.push( 0x00 );
	}
	return data;
    }
    // trace( "appendPaddingRFC1321:" + base16( appendPaddingRFC1321( [0,1,2,3,4,5,6,7,8] ) ) );

    function removePaddingRFC1321(data) {
	for ( var i=data.length-1; 0<=i; i-- ) {
	    var val = data[i];
	    if ( val == 0x80 ) {
		data.splice( i );
		break;
	    } else if ( val != 0x00 ) {
		break;
	    }
	}
	return data;
    }
    // trace( "removePaddingRFC1321:" + base16( removePaddingRFC1321( [0,1,2,3,4,5,6,7,8,9,0x80,00,00,00,00] ) ) );
    return {
	append : appendPaddingRFC1321,
	remove : removePaddingRFC1321 
    };
};
PADDINGS.RFC1321 = createRFC1321();

/*
 * ... | DD DD DD DD DD DD DD DD | DD DD DD DD 00 00 00 04 |
 */
function createANSIX923() {
    function appendPaddingANSIX923(data) {
	var len = 16 - ( data.length % 16 );
	for ( var i=0; i<len-1; i++ ) {
	    data.push( 0x00 );
	}
	data.push( len );
	return data;
    }
    // trace( "appendPaddingANSIX923:" + base16( appendPaddingANSIX923( [0,1,2,3,4,5,6,7,8,9 ] ) ) );

    function removePaddingANSIX923(data) {
	var len = data.pop();
	if ( 16 < len ) len = 16;
	for ( var i=1; i<len; i++ ) {
	    data.pop();
	}
	return data;
    }
    // trace( "removePaddingANSIX923:" + base16( removePaddingANSIX923( [0,1,2,3,4,5,6,7,8,9,0x00,00,00,00,0x05] ) ) );
    return {
	append : appendPaddingANSIX923,
	remove : removePaddingANSIX923 
    };
}
PADDINGS.ANSIX923 = createANSIX923();

/*
 * ... | DD DD DD DD DD DD DD DD | DD DD DD DD 81 A6 23 04 |
 */
function createISO10126() {

    function appendPaddingISO10126(data) {
	var len = 16 - ( data.length % 16 );
	for ( var i=0; i<len-1; i++ ) {
	    data.push( randByte() );
	}
	data.push( len );
	return data;
    }
    // trace( "appendPaddingISO10126:" + base16( appendPaddingISO10126( [0,1,2,3,4,5,6,7,8,9 ] ) ) );
    function removePaddingISO10126(data) {
	var len = data.pop();
	if ( 16 < len ) len = 16;
	for ( var i=1; i<len; i++ ) {
	    data.pop();
	}
	return data;
    }
    // trace( "removePaddingISO10126:" + base16( removePaddingISO10126( [0,1,2,3,4,5,6,7,8,9,0x00,00,00,00,0x05] ) ) );
    return {
	append : appendPaddingISO10126,
	remove : removePaddingISO10126
    };
}
PADDINGS.ISO10126 = createISO10126();


/*
 * 01
 * 02 02
 * 03 03 03
 * 04 04 04 04
 * 05 05 05 05 05
 * etc.
 */
function createPKCS7() {
    function appendPaddingPKCS7(data) {
	// trace( "appendPaddingPKCS7");
	// alert( "appendPaddingPKCS7");
	var len = 16 - ( data.length % 16 );
	for ( var i=0; i<len; i++ ) {
	    data.push( len );
	}
	// trace( "data:"+base16(data) );
	// trace( "data.length:"+data.length );
	return data;
    }
    // trace( "appendPaddingPKCS7:" + base16( appendPaddingPKCS7( [0,1,2,3,4,5,6,7,8,9 ] ) ) );
    function removePaddingPKCS7(data) {
	var len = data.pop();
	if ( 16 < len ) len = 0;
	for ( var i=1; i<len; i++ ) {
	    data.pop();
	}
	return data;
    }
    // trace( "removePaddingPKCS7:" + base16( removePaddingPKCS7( [0,1,2,3,4,5,6,7,8,9,0x00,04,04,04,0x04] ) ) );
    return {
	append : appendPaddingPKCS7,
	remove : removePaddingPKCS7 
    };
}
PADDINGS.PKCS7 = createPKCS7();

/*
 * NO PADDINGS
 */
function createNoPadding() {
    function appendPaddingNone(data) {
	return data;
    }
    // trace( "appendPaddingPKCS7:" + base16( appendPaddingPKCS7( [0,1,2,3,4,5,6,7,8,9 ] ) ) );
    function removePaddingNone(data) {
	return data;
    }
    // trace( "removePaddingPKCS7:" + base16( removePaddingPKCS7( [0,1,2,3,4,5,6,7,8,9,0x00,04,04,04,0x04] ) ) );
    return {
	append : appendPaddingNone,
	remove : removePaddingNone 
    };
}
PADDINGS.NO_PADDING = createNoPadding();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ENCRYPT/DECRYPT
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var DIRECTIONS = {
    ENCRYPT : "encrypt",
    DECRYPT : "decrypt"
};



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// INTERFACE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Cipher( algorithm, direction, mode, padding ) {
    this.algorithm = algorithm;
    this.direction = direction;
    this.mode = mode;
    this.padding = padding;

    this.modeOpen  = mode[ direction ].open;
    this.modeExec  = mode[ direction ].exec;
    this.modeClose = mode[ direction ].close;

    // NOTE : values below are reffered by MODE functions via "this" parameter.
    this.keyBytes  = null;
    this.dataBytes = null;
    this.dataOffset = -1;
    this.dataLength = -1;

}

Cipher.prototype = new Object();
Cipher.prototype.inherit = Cipher;

function open( keyBytes, dataBytes ) {
    if ( keyBytes == null ) throw "keyBytes is null";
    if ( dataBytes == null ) throw "dataBytes is null";

    // BE CAREFUL : THE KEY GENERATING ALGORITHM OF SERPENT HAS SIDE-EFFECT
    // TO MODIFY THE KEY ARRAY.  IT IS NECESSARY TO DUPLICATE IT BEFORE
    // PROCESS THE CIPHER TEXT. 
    this.keyBytes = keyBytes.concat();

    // DATA BUFFER IS USUALLY LARGE. DON'T DUPLICATE IT FOR PERFORMANCE REASON.
    this.dataBytes = dataBytes/*.concat()*/;

    this.dataOffset = 0;
    this.dataLength = dataBytes.length;

    //if ( this.direction == Cipher.ENCRYPT ) // fixed 2008/12/31
    if ( this.direction == DIRECTIONS.ENCRYPT ) {
	this.padding.append( this.dataBytes );
    }

    this.modeOpen();
}

function operate() {
    return this.modeExec();
}

function close() {
    this.modeClose();
    // if ( this.direction == Cipher.DECRYPT ) // fixed 2008/12/31
    if ( this.direction == DIRECTIONS.DECRYPT ) {
	this.padding.remove( this.dataBytes );
    }
    return this.dataBytes;
}

function execute( keyBytes, dataBytes ) {
    this.open( keyBytes, dataBytes );
    for(;;) {
	var size = this.operate();
	if ( 0<size ) {
	    // trace( size );
	    //alert( size );
	    continue;
	} else {
	    break;
	}
    }
    return this.close();
}

Cipher.prototype.open = open;
Cipher.prototype.close = close;
Cipher.prototype.operate = operate;
Cipher.prototype.execute = execute;

////////////////////////////////////////////////////////////////////////

// this.updateMode = function() {
//     this.modeProcs = this.mode[ this.direction ];
// };


////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


Cipher.ENCRYPT  = "ENCRYPT";
Cipher.DECRYPT  = "DECRYPT";

Cipher.RIJNDAEL = "RIJNDAEL";
Cipher.SERPENT  = "SERPENT";
Cipher.TWOFISH  = "TWOFISH";

Cipher.ECB      = "ECB";
Cipher.CBC      = "CBC";
Cipher.CFB      = "CFB";
Cipher.OFB      = "OFB";
Cipher.CTR      = "CTR";

Cipher.RFC1321    = "RFC1321";
Cipher.ANSIX923   = "ANSIX923";
Cipher.ISO10126   = "ISO10126";
Cipher.PKCS7      = "PKCS7";
Cipher.NO_PADDING = "NO_PADDING";

Cipher.create = function( algorithmName, directionName, modeName, paddingName ) {

    if ( algorithmName == null ) algorithmName = Cipher.RIJNDAEL;
    if ( directionName == null ) directionName = Cipher.ENCRYPT;
    if ( modeName      == null ) modeName      = Cipher.CBC;
    if ( paddingName   == null ) paddingName   = Cipher.PKCS7;

    var algorithm  = ALGORITHMS[ algorithmName ];
    var direction  = DIRECTIONS[ directionName ];
    var mode       = MODES[ modeName ];
    var padding    = PADDINGS[ paddingName ];

    if ( algorithm  == null ) throw "Invalid algorithm name '" + algorithmName + "'.";
    if ( direction  == null ) throw "Invalid direction name '" + directionName + "'.";
    if ( mode       == null ) throw "Invalid mode name '"      + modeName      + "'.";
    if ( padding    == null ) throw "Invalid padding name '"   + paddingName   + "'.";

    return new Cipher( algorithm.create(), direction, mode, padding );
};

Cipher.algorithm = function( algorithmName ) {
    if ( algorithmName == null ) throw "Null Pointer Exception ( algorithmName )";
    var algorithm  = ALGORITHMS[ algorithmName ];
    if ( algorithm  == null ) throw "Invalid algorithm name '" + algorithmName + "'.";
    // trace( "ss" );
    // trace( algorithm );
    return algorithm.create();
};

  return Cipher;


///////////////////////////////////
// export
///////////////////////////////////
/*
__export( packageRoot, "titaniumcore.crypto.Cipher", Cipher );

} // the end of initBlockCipher();


initBlockCipher( this );
*/


// vim:ts=8 sw=4:noexpandtab:
}());

},{}],70:[function(require,module,exports){
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

},{"./Cipher.js":69,"./tools/binary.js":71}],71:[function(require,module,exports){
/*
 * binary.js
 * Tools for creating, modifying binary data
 * including base64-encoding, base64-decoding , utf8-encoding and utf8-decoding
 * See binary.readme.txt for further information.
 *
 * Copyright(c) 2009 Atsushi Oka [ http://oka.nu/ ]
 * This script file is distributed under the LGPL
 */

/**
 * CHANGE:
 * nCrypt change 2014/10/22:
 * Do not initialise binary as a global object.
 * */

module.exports = (function () {
/*
function initBinary( packageRoot ) {
    if ( packageRoot.__PACKAGE_ENABLED ) {
	__unit( "binary.js" );
    }
*/

var i2a  = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'
];

function base64_encode( s ) {
    var length = s.length;
    var groupCount = Math.floor( length / 3 );
    var remaining = length - 3 * groupCount;
    var result = "";

    var idx = 0;
    for (var i=0; i<groupCount; i++) {
	var b0 = s[idx++] & 0xff;
	var b1 = s[idx++] & 0xff;
	var b2 = s[idx++] & 0xff;
	result += (i2a[ b0 >> 2]);
	result += (i2a[(b0 << 4) &0x3f | (b1 >> 4)]);
	result += (i2a[(b1 << 2) &0x3f | (b2 >> 6)]);
	result += (i2a[ b2 & 0x3f]);
    }

    if ( remaining == 0 ) {
    } else if ( remaining == 1 ) {
	var b0 = s[idx++] & 0xff;
	result += ( i2a[ b0 >> 2 ] );
	result += ( i2a[ (b0 << 4) & 0x3f] );
	result += ( "==" );
    } else if ( remaining == 2 ) {
	var b0 = s[idx++] & 0xff;
	var b1 = s[idx++] & 0xff;
	result += ( i2a[ b0 >> 2 ] );
	result += ( i2a[(b0 << 4) & 0x3f | (b1 >> 4)]);
	result += ( i2a[(b1 << 2) & 0x3f ] );
	result += ('=');
    } else {
	throw "never happen";
    }
    return result;
}

var a2i = [
    -1,   -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1, -1,
    -1,   -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1, -1,
    -1,   -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  62,  -1,  -1,  -1, 63,
    52,   53,  54,  55,  56,  57,  58,  59,  60,  61,  -1,  -1,  -1,  -1,  -1, -1,
    -1,    0,   1,   2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12,  13, 14,
    15,   16,  17,  18,  19,  20,  21,  22,  23,  24,  25,  -1,  -1,  -1,  -1, -1,
    -1,   26,  27,  28,  29,  30,  31,  32,  33,  34,  35,  36,  37,  38,  39, 40,
    41,   42,  43,  44,  45,  46,  47,  48,  49,  50,  51
];

function get_a2i( c ) {
    var result = (0<=c) && (c<a2i.length) ? a2i[ c ] : -1;
    if (result < 0) throw "Illegal character " + c;
    return result;
}

function base64_decode(s) {
    var length = s.length;
    var groupCount = Math.floor( length/4 );
    if ( 4 * groupCount != length )
	throw "String length must be a multiple of four.";

    var missing = 0;
    if (length != 0) {
	if ( s.charAt( length - 1 ) == '=' ) {
	    missing++;
	    groupCount--;
	}
	if ( s.charAt( length - 2 ) == '=' )
	    missing++;
    }

    var len = ( 3 * groupCount - missing );
    if ( len < 0 ) {
	len=0;
    }
    var result = new Array( len );
    // var result = new Array( 3 * groupCount - missing );
    // var result = new Array( 3 * ( groupCount +1 ) - missing );
    var idx_in = 0;
    var idx_out = 0;
    for ( var i=0; i<groupCount; i++ ) {
	var c0 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c1 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c2 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c3 = get_a2i( s.charCodeAt( idx_in++ ) );
	result[ idx_out++ ] = 0xFF & ( (c0 << 2) | (c1 >> 4) );
	result[ idx_out++ ] = 0xFF & ( (c1 << 4) | (c2 >> 2) );
	result[ idx_out++ ] = 0xFF & ( (c2 << 6) | c3 );
    }

    if ( missing == 0 ) {
    } else if ( missing == 1 ) {
	var c0 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c1 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c2 = get_a2i( s.charCodeAt( idx_in++ ) );
	result[ idx_out++ ] = 0xFF & ( (c0 << 2) | (c1 >> 4) );
	result[ idx_out++ ] = 0xFF & ( (c1 << 4) | (c2 >> 2) );

    } else if ( missing == 2 ) {
	var c0 = get_a2i( s.charCodeAt( idx_in++ ) );
	var c1 = get_a2i( s.charCodeAt( idx_in++ ) );
	result[ idx_out++ ] = 0xFF & ( ( c0 << 2 ) | ( c1 >> 4 ) );
    } else {
	throw "never happen";
    }
    return result;
}

function base64x_encode( s ) {
    return base64x_pre_encode( base64_encode(s)  );
}
function base64x_decode( s ) {
    return base64_decode( base64x_pre_decode(s) );
}

var base64x_pre_encode_map = {};
base64x_pre_encode_map["x"] = "xx";
base64x_pre_encode_map["+"] = "xa";
base64x_pre_encode_map["/"] = "xb";
base64x_pre_encode_map["="] = "";


function base64x_pre_encode( s ) {
    var ss = "";
    for ( var i=0; i<s.length; i++ ) {
	var c = s.charAt(i);
	var cc = base64x_pre_encode_map[ c ]; 
	if ( cc != null ) {
	    ss = ss + cc;
	} else {
	    ss = ss + c;
	}
    }
    return ss;
}

var base64x_pre_decode_map = {};
base64x_pre_decode_map['x'] = 'x';
base64x_pre_decode_map['a'] = '+';
base64x_pre_decode_map['b'] = '/';

function base64x_pre_decode( s ) {
    var ss = "";
    for ( var i=0; i<s.length; i++ ) {
	var c = s.charAt(i);
	if ( c == 'x' ) {
	    c = s.charAt(++i);
	    var cc = base64x_pre_decode_map[ c ];
	    if ( cc != null ) {
		ss = ss + cc;
		// ss = ss + '/';
	    } else {
		// throw "invalid character was found. ("+cc+")"; // ignore.
	    }
	} else {
	    ss = ss + c;
	}
    }
    while ( ss.length % 4 != 0 ) {
	ss += "=";
    }
    return ss;
}

function equals( a, b ){
    if ( a.length != b.length )
	return false;
    var size=a.length;
    for ( var i=0;i<size;i++ ){
	// trace( a[i] + "/" + b[i] );
	if ( a[i] != b[i] )
	    return false;
    }
    return true;
}


function hex( i ){
    if ( i == null ) 
	return "??";
    //if ( i < 0 ) i+=256;
    i&=0xff;
    var result = i.toString(16);
    return ( result.length<2 ) ? "0" +result : result;
}

function base16( data, columns, delim ) {
    return base16_encode( data,columns,delim );
}
function base16_encode( data, columns, delim ) {
    if ( delim == null ){
	delim="";
    }
    if ( columns == null ) {
	columns = 256;
    }
    var result ="";
    for ( var i=0; i<data.length; i++ ) {
	if ( ( i % columns == 0 ) && ( 0<i ) )
	    result += "\n";
	result += hex( data[i] ) + delim;
    }
    return result.toUpperCase();
}

var amap = {};
 amap['0'] =   0; amap['1'] =   1; amap['2'] =   2; amap['3'] =   3;
 amap['4'] =   4; amap['5'] =   5; amap['6'] =   6; amap['7'] =   7;
 amap['8'] =   8; amap['9'] =   9; amap['A'] =  10; amap['B'] =  11;
 amap['C'] =  12; amap['D'] =  13; amap['E'] =  14; amap['F'] =  15;
                                   amap['a'] =  10; amap['b'] =  11; 
 amap['c'] =  12; amap['d'] =  13; amap['e'] =  14; amap['f'] =  15;

function get_amap( c ) {
    var cc = amap[c];
    //trace(c + "=>" + cc );
    if ( cc == null ) 
	throw "found an invalid character.";
    return cc;
}

function base16_decode( data ) {
    var ca = [];
    for ( var i=0,j=0; i<data.length; i++ ) {
	var c = data.charAt( i );
	if ( c == "\s" ) {
	    continue;
	} else {
	    ca[j++] = c;
	}
    }
    if ( ca.length % 2 != 0 ) {
	throw "data must be a multiple of two.";
    }

    var result = new Array( ca.length >> 1 );
    for ( var i=0; i<ca.length; i+=2 ) {
	var v = 0xff & ( ( get_amap( ca[i] ) <<4 ) | ( get_amap( ca[i+1] ) ) )  ;
	result[i>>1] = v;
	// trace(  get_amap( ca[i+1] ) )
	// result[i>>1] =  get_amap( ca[i+1] );
    }
    return result;
}
// trace( base16_encode([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,128,255 ] ) );
// trace( base16_encode( base16_decode("000102030405060708090A0B0C0D0E0F1080FF") ) );
// trace( base16_encode( base16_decode( "000102030405060708090A0B0C0D0E0F102030405060708090A0B0C0D0E0F0FF" ) ) );
//                                       000102030405060708090A0B0C0D0E0F102030405060708090A0B0C0D0E0F0FF


/////////////////////////////////////////////////////////////////////////////////////////////

var B10000000 = 0x80;
var B11000000 = 0xC0;
var B11100000 = 0xE0;
var B11110000 = 0xF0;
var B11111000 = 0xF8;
var B11111100 = 0xFC;
var B11111110 = 0xFE;
var B01111111 = 0x7F;
var B00111111 = 0x3F;
var B00011111 = 0x1F;
var B00001111 = 0x0F;
var B00000111 = 0x07;
var B00000011 = 0x03;
var B00000001 = 0x01;

function str2utf8( str ){
    var result = [];
    var length = str.length;
    var idx=0;
    for ( var i=0; i<length; i++ ){
	var c = str.charCodeAt( i );
	if ( c <= 0x7f ) {
	    result[idx++] = c;
	} else if ( c <= 0x7ff ) {
	    result[idx++] = B11000000 | ( B00011111 & ( c >>>  6 ) );
	    result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) );
	} else if ( c <= 0xffff ) {
	    result[idx++] = B11100000 | ( B00001111 & ( c >>> 12 ) ) ;
	    result[idx++] = B10000000 | ( B00111111 & ( c >>>  6 ) ) ;
	    result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) ) ;
	} else if ( c <= 0x10ffff ) {
	    result[idx++] = B11110000 | ( B00000111 & ( c >>> 18 ) ) ;
	    result[idx++] = B10000000 | ( B00111111 & ( c >>> 12 ) ) ;
	    result[idx++] = B10000000 | ( B00111111 & ( c >>>  6 ) ) ;
	    result[idx++] = B10000000 | ( B00111111 & ( c >>>  0 ) ) ;
	} else {
	    throw "error";
	}
    }
    return result;
}

function utf82str( data ) {
    var result = "";
    var length = data.length;

    for ( var i=0; i<length; ){
	var c = data[i++];
	if ( c < 0x80 ) {
	    result += String.fromCharCode( c );
	} else if ( ( c < B11100000 ) ) {
	    result += String.fromCharCode(
		( ( B00011111 & c         ) <<  6 ) |
		( ( B00111111 & data[i++] ) <<  0 )
	    );
	} else if ( ( c < B11110000 ) ) {
	    result += String.fromCharCode(
		( ( B00001111 & c         ) << 12 ) |
		( ( B00111111 & data[i++] ) <<  6 ) |
		( ( B00111111 & data[i++] ) <<  0 )
	    );
	} else if ( ( c < B11111000 ) ) {
	    result += String.fromCharCode(
		( ( B00000111 & c         ) << 18 ) |
		( ( B00111111 & data[i++] ) << 12 ) |
		( ( B00111111 & data[i++] ) <<  6 ) |
		( ( B00111111 & data[i++] ) <<  0 )
	    );
	} else if ( ( c < B11111100 ) ) {
	    result += String.fromCharCode(
		( ( B00000011 & c         ) << 24 ) |
		( ( B00111111 & data[i++] ) << 18 ) |
		( ( B00111111 & data[i++] ) << 12 ) |
		( ( B00111111 & data[i++] ) <<  6 ) |
		( ( B00111111 & data[i++] ) <<  0 )
	    );
	} else if ( ( c < B11111110 ) ) {
	    result += String.fromCharCode(
		( ( B00000001 & c         ) << 30 ) |
		( ( B00111111 & data[i++] ) << 24 ) |
		( ( B00111111 & data[i++] ) << 18 ) |
		( ( B00111111 & data[i++] ) << 12 ) |
		( ( B00111111 & data[i++] ) <<  6 ) |
		( ( B00111111 & data[i++] ) <<  0 )
	    );
	}
    }
    return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////

// convert unicode character array to string
function char2str( ca ) {
    var result = "";
    for ( var i=0; i<ca.length; i++ ) {
	result += String.fromCharCode( ca[i] );
    }
    return result;
}

// convert string to unicode character array
function str2char( str ) {
    var result = new Array( str.length );
    for ( var i=0; i<str.length; i++ ) {
	result[i] = str.charCodeAt( i );
    }
    return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////

// byte expressions (big endian)
function i2ba_be(i) {
    return [
	0xff & (i>>24),
	0xff & (i>>16),
	0xff & (i>> 8),
	0xff & (i>> 0)
    ];
}
function ba2i_be(bs) {
    return (
	  ( bs[0]<<24 )
	| ( bs[1]<<16 )
	| ( bs[2]<< 8 )
	| ( bs[3]<< 0 )
    );
}
function s2ba_be(i) {
    return [
	0xff & (i>> 8),
	0xff & (i>> 0)
    ];
}
function ba2s_be(bs) {
    return (
	0
	| ( bs[0]<< 8 )
	| ( bs[1]<< 0 )
    );
}

// byte expressions (little endian)
function i2ba_le(i) {
    return [
	0xff & (i>> 0),
	0xff & (i>> 8),
	0xff & (i>>16),
	0xff & (i>>24)
    ];
}
function ba2i_le(bs) {
    return (
	0
	| ( bs[3]<< 0 )
	| ( bs[2]<< 8 )
	| ( bs[1]<<16 )
	| ( bs[0]<<24 )
    );
}
function s2ba_le(i) {
    return [
	0xff & (i>> 0),
	0xff & (i>> 8)
    ];
}
function ba2s_le(bs) {
    return (
	0
	| ( bs[1]<< 0 )
	| ( bs[0]<< 8 )
    );
}

function ia2ba_be( ia ) {
    var length = ia.length <<2;
    var ba = new Array( length );
    for(var ii=0,bi=0;ii<ia.length&&bi<ba.length; ){
        ba[bi++] = 0xff & ( ia[ii] >> 24 );
        ba[bi++] = 0xff & ( ia[ii] >> 16 );
        ba[bi++] = 0xff & ( ia[ii] >>  8 );
        ba[bi++] = 0xff & ( ia[ii] >>  0 );
        ii++;
    }
    return ba;
}
function ba2ia_be( ba ) {
    var length = (ba.length+3)>>2;
    var ia = new Array( length );;
    for(var ii=0,bi=0; ii<ia.length && bi<ba.length; ){
        ia[ii++] = 
            ( bi < ba.length ? (ba[bi++]  << 24 ) : 0 ) |
            ( bi < ba.length ? (ba[bi++]  << 16 ) : 0 ) |
            ( bi < ba.length ? (ba[bi++]  <<  8 ) : 0 ) |
            ( bi < ba.length ? (ba[bi++]/*<< 0*/) : 0 ) ;
    }
    return ia;
}

function ia2ba_le( ia ) {
    var length = ia.length <<2;
    var ba = new Array( length );
    for(var ii=0,bi=0;ii<ia.length&&bi<ba.length; ){
        ba[bi++] = 0xff & ( ia[ii] >>  0 );
        ba[bi++] = 0xff & ( ia[ii] >>  8 );
        ba[bi++] = 0xff & ( ia[ii] >> 16 );
        ba[bi++] = 0xff & ( ia[ii] >> 24 );
        ii++;
    }
    return ba;
}
function ba2ia_le( ba ) {
    var length = (ba.length+3)>>2;
    var ia = new Array( length );;
    for(var ii=0,bi=0; ii<ia.length && bi<ba.length; ){
        ia[ii++] = 
            ( bi < ba.length ? (ba[bi++]/*<< 0*/) : 0 ) |
            ( bi < ba.length ? (ba[bi++]  <<  8 ) : 0 ) |
            ( bi < ba.length ? (ba[bi++]  << 16 ) : 0 ) |
            ( bi < ba.length ? (ba[bi++]  << 24 ) : 0 ) ;
    }
    return ia;
}

/////////////////////////////////////////////////////////////////////////////////////////////

function trim( s ){
    var result = "";
    for ( var idx=0; idx<s.length; idx++ ){
	var c = s.charAt( idx );
	if ( c == "\s" || c == "\t" || c == "\r" || c == "\n" ) {
	} else {
	    result += c;
	}
    }
    return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////

function mktst( encode, decode ) {
    return function ( trial,from,to ) {
	var flg=true;
	for (var i=0; i<trial; i++) {
	    for (var j=from; j<to; j++) {
		var arr = new Array(j);
		for (var k=0; k<j; k++)
		    arr[k] = Math.floor( Math.random() * 256 );

		var s = encode(arr);
		var b = decode(s);

		// trace( "in:"+arr.length);
		// trace( "base64:"+s.length);
		// trace( "out:"+b.length);
		// trace( "in:"+arr);
		// trace( "base64:"+s );
		// trace( "out:"+b );
		trace( "in :"+arr.length + ":"+ base16_encode(arr) );
		trace( "b64:"+s.length+":"+s);
		trace( "out:"+b.length + ":"+ base16_encode(arr) );
		if ( equals( arr, b ) ) {
		    trace( "OK! ( " + i + "," + j + ")" );
		} else {
		    trace( "ERR ( " + i + "," + j + ")" );
		    flg=false;
		}
		trace( "-----------");
	    }
	}
	if ( flg ) {
	    trace( "ALL OK! " );
	} else {
	    trace( "FOUND ERROR!" );
	}
    };
}


//////////////////////added bumblehead
var packageRoot = {};


// export

// base64
packageRoot.base64_encode = base64_encode;
packageRoot.base64_decode = base64_decode;
packageRoot.base64_test   = mktst( base64_encode, base64_decode );

// base64ex
packageRoot.base64x_encode = base64x_encode;
packageRoot.base64x_decode = base64x_decode;
packageRoot.base64x_test   = mktst( base64x_encode, base64x_decode );

packageRoot.base64x_pre_encode = base64x_pre_encode;
packageRoot.base64x_pre_decode = base64x_pre_decode;

// base16
packageRoot.base16_encode = base16_encode;
packageRoot.base16_decode = base16_decode;
packageRoot.base16        = base16;
packageRoot.hex           = base16;

// utf8
packageRoot.utf82str      = utf82str;
packageRoot.str2utf8      = str2utf8;
packageRoot.str2char      = str2char;
packageRoot.char2str      = char2str;

// byte expressions
packageRoot.i2ba    = i2ba_be;
packageRoot.ba2i    = ba2i_be;
packageRoot.i2ba_be = i2ba_be;
packageRoot.ba2i_be = ba2i_be;
packageRoot.i2ba_le = i2ba_le;
packageRoot.ba2i_le = ba2i_le;

packageRoot.s2ba    = s2ba_be;
packageRoot.ba2s    = ba2s_be;
packageRoot.s2ba_be = s2ba_be;
packageRoot.ba2s_be = ba2s_be;
packageRoot.s2ba_le = s2ba_le;
packageRoot.ba2s_le = ba2s_le;

packageRoot.ba2ia    = ba2ia_be;
packageRoot.ia2ba    = ia2ba_be;
packageRoot.ia2ba_be = ia2ba_be;
packageRoot.ba2ia_be = ba2ia_be;
packageRoot.ia2ba_le = ia2ba_le;
packageRoot.ba2ia_le = ba2ia_le;


// arrays
packageRoot.cmparr        = equals;

return packageRoot;
/*
}

initBinary(this);
*/

}());

},{}],72:[function(require,module,exports){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('error-stack-parser', ['stackframe'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('stackframe'));
    } else {
        root.ErrorStackParser = factory(root.StackFrame);
    }
}(this, function ErrorStackParser(StackFrame) {
    'use strict';

    var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/;
    var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m;
    var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;

    return {
        /**
         * Given an Error object, extract the most information from it.
         *
         * @param {Error} error object
         * @return {Array} of StackFrames
         */
        parse: function ErrorStackParser$$parse(error) {
            if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
                return this.parseOpera(error);
            } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
                return this.parseV8OrIE(error);
            } else if (error.stack) {
                return this.parseFFOrSafari(error);
            } else {
                throw new Error('Cannot parse given Error object');
            }
        },

        // Separate line and column numbers from a string of the form: (URI:Line:Column)
        extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
            // Fail-fast but return locations like "(native)"
            if (urlLike.indexOf(':') === -1) {
                return [urlLike];
            }

            var regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/;
            var parts = regExp.exec(urlLike.replace(/[\(\)]/g, ''));
            return [parts[1], parts[2] || undefined, parts[3] || undefined];
        },

        parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
            var filtered = error.stack.split('\n').filter(function(line) {
                return !!line.match(CHROME_IE_STACK_REGEXP);
            }, this);

            return filtered.map(function(line) {
                if (line.indexOf('(eval ') > -1) {
                    // Throw away eval information until we implement stacktrace.js/stackframe#8
                    line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, '');
                }
                var tokens = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').split(/\s+/).slice(1);
                var locationParts = this.extractLocation(tokens.pop());
                var functionName = tokens.join(' ') || undefined;
                var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];

                return new StackFrame({
                    functionName: functionName,
                    fileName: fileName,
                    lineNumber: locationParts[1],
                    columnNumber: locationParts[2],
                    source: line
                });
            }, this);
        },

        parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
            var filtered = error.stack.split('\n').filter(function(line) {
                return !line.match(SAFARI_NATIVE_CODE_REGEXP);
            }, this);

            return filtered.map(function(line) {
                // Throw away eval information until we implement stacktrace.js/stackframe#8
                if (line.indexOf(' > eval') > -1) {
                    line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g, ':$1');
                }

                if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
                    // Safari eval frames only have function names and nothing else
                    return new StackFrame({
                        functionName: line
                    });
                } else {
                    var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
                    var matches = line.match(functionNameRegex);
                    var functionName = matches && matches[1] ? matches[1] : undefined;
                    var locationParts = this.extractLocation(line.replace(functionNameRegex, ''));

                    return new StackFrame({
                        functionName: functionName,
                        fileName: locationParts[0],
                        lineNumber: locationParts[1],
                        columnNumber: locationParts[2],
                        source: line
                    });
                }
            }, this);
        },

        parseOpera: function ErrorStackParser$$parseOpera(e) {
            if (!e.stacktrace || (e.message.indexOf('\n') > -1 &&
                e.message.split('\n').length > e.stacktrace.split('\n').length)) {
                return this.parseOpera9(e);
            } else if (!e.stack) {
                return this.parseOpera10(e);
            } else {
                return this.parseOpera11(e);
            }
        },

        parseOpera9: function ErrorStackParser$$parseOpera9(e) {
            var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
            var lines = e.message.split('\n');
            var result = [];

            for (var i = 2, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    result.push(new StackFrame({
                        fileName: match[2],
                        lineNumber: match[1],
                        source: lines[i]
                    }));
                }
            }

            return result;
        },

        parseOpera10: function ErrorStackParser$$parseOpera10(e) {
            var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
            var lines = e.stacktrace.split('\n');
            var result = [];

            for (var i = 0, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    result.push(
                        new StackFrame({
                            functionName: match[3] || undefined,
                            fileName: match[2],
                            lineNumber: match[1],
                            source: lines[i]
                        })
                    );
                }
            }

            return result;
        },

        // Opera 10.65+ Error.stack very similar to FF/Safari
        parseOpera11: function ErrorStackParser$$parseOpera11(error) {
            var filtered = error.stack.split('\n').filter(function(line) {
                return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
            }, this);

            return filtered.map(function(line) {
                var tokens = line.split('@');
                var locationParts = this.extractLocation(tokens.pop());
                var functionCall = (tokens.shift() || '');
                var functionName = functionCall
                        .replace(/<anonymous function(: (\w+))?>/, '$2')
                        .replace(/\([^\)]*\)/g, '') || undefined;
                var argsRaw;
                if (functionCall.match(/\(([^\)]*)\)/)) {
                    argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, '$1');
                }
                var args = (argsRaw === undefined || argsRaw === '[arguments not available]') ?
                    undefined : argsRaw.split(',');

                return new StackFrame({
                    functionName: functionName,
                    args: args,
                    fileName: locationParts[0],
                    lineNumber: locationParts[1],
                    columnNumber: locationParts[2],
                    source: line
                });
            }, this);
        }
    };
}));

},{"stackframe":81}],73:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var has = Object.prototype.hasOwnProperty;

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = util.toSetString(aStr);
  var isDuplicate = has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    this._set[sStr] = idx;
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  var sStr = util.toSetString(aStr);
  return has.call(this._set, sStr);
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  var sStr = util.toSetString(aStr);
  if (has.call(this._set, sStr)) {
    return this._set[sStr];
  }
  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;

},{"./util":79}],74:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = require('./base64');

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

},{"./base64":75}],75:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

},{}],76:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};

},{}],77:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
exports.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

},{}],78:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var binarySearch = require('./binary-search');
var ArraySet = require('./array-set').ArraySet;
var base64VLQ = require('./base64-vlq');
var quickSort = require('./quick-sort').quickSort;

function SourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap)
    : new BasicSourceMapConsumer(sourceMap);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      if (source != null && sourceRoot != null) {
        source = util.join(sourceRoot, source);
      }
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: Optional. the column number in the original source.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    if (this.sourceRoot != null) {
      needle.source = util.relative(this.sourceRoot, needle.source);
    }
    if (!this._sources.has(needle.source)) {
      return [];
    }
    needle.source = this._sources.indexOf(needle.source);

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

exports.SourceMapConsumer = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The only parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._sources.toArray().map(function (s) {
      return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
    }, this);
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          if (this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    if (this.sourceRoot != null) {
      aSource = util.relative(this.sourceRoot, aSource);
    }

    if (this._sources.has(aSource)) {
      return this.sourcesContent[this._sources.indexOf(aSource)];
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + aSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + aSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    if (this.sourceRoot != null) {
      source = util.relative(this.sourceRoot, source);
    }
    if (!this._sources.has(source)) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }
    source = this._sources.indexOf(source);

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The only parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'))
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        if (section.consumer.sourceRoot !== null) {
          source = util.join(section.consumer.sourceRoot, source);
        }
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = section.consumer._names.at(mapping.name);
        this._names.add(name);
        name = this._names.indexOf(name);

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util.compareByOriginalPositions);
  };

exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

},{"./array-set":73,"./base64-vlq":74,"./binary-search":76,"./quick-sort":77,"./util":79}],79:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || !!aPath.match(urlRegexp);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

},{}],80:[function(require,module,exports){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stack-generator', ['stackframe'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('stackframe'));
    } else {
        root.StackGenerator = factory(root.StackFrame);
    }
}(this, function(StackFrame) {
    return {
        backtrace: function StackGenerator$$backtrace(opts) {
            var stack = [];
            var maxStackSize = 10;

            if (typeof opts === 'object' && typeof opts.maxStackSize === 'number') {
                maxStackSize = opts.maxStackSize;
            }

            var curr = arguments.callee;
            while (curr && stack.length < maxStackSize && curr['arguments']) {
                // Allow V8 optimizations
                var args = new Array(curr['arguments'].length);
                for (var i = 0; i < args.length; ++i) {
                    args[i] = curr['arguments'][i];
                }
                if (/function(?:\s+([\w$]+))+\s*\(/.test(curr.toString())) {
                    stack.push(new StackFrame({functionName: RegExp.$1 || undefined, args: args}));
                } else {
                    stack.push(new StackFrame({args: args}));
                }

                try {
                    curr = curr.caller;
                } catch (e) {
                    break;
                }
            }
            return stack;
        }
    };
}));

},{"stackframe":81}],81:[function(require,module,exports){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stackframe', [], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.StackFrame = factory();
    }
}(this, function() {
    'use strict';
    function _isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
    }

    function _getter(p) {
        return function() {
            return this[p];
        };
    }

    var booleanProps = ['isConstructor', 'isEval', 'isNative', 'isToplevel'];
    var numericProps = ['columnNumber', 'lineNumber'];
    var stringProps = ['fileName', 'functionName', 'source'];
    var arrayProps = ['args'];

    var props = booleanProps.concat(numericProps, stringProps, arrayProps);

    function StackFrame(obj) {
        if (obj instanceof Object) {
            for (var i = 0; i < props.length; i++) {
                if (obj.hasOwnProperty(props[i]) && obj[props[i]] !== undefined) {
                    this['set' + _capitalize(props[i])](obj[props[i]]);
                }
            }
        }
    }

    StackFrame.prototype = {
        getArgs: function() {
            return this.args;
        },
        setArgs: function(v) {
            if (Object.prototype.toString.call(v) !== '[object Array]') {
                throw new TypeError('Args must be an Array');
            }
            this.args = v;
        },

        getEvalOrigin: function() {
            return this.evalOrigin;
        },
        setEvalOrigin: function(v) {
            if (v instanceof StackFrame) {
                this.evalOrigin = v;
            } else if (v instanceof Object) {
                this.evalOrigin = new StackFrame(v);
            } else {
                throw new TypeError('Eval Origin must be an Object or StackFrame');
            }
        },

        toString: function() {
            var functionName = this.getFunctionName() || '{anonymous}';
            var args = '(' + (this.getArgs() || []).join(',') + ')';
            var fileName = this.getFileName() ? ('@' + this.getFileName()) : '';
            var lineNumber = _isNumber(this.getLineNumber()) ? (':' + this.getLineNumber()) : '';
            var columnNumber = _isNumber(this.getColumnNumber()) ? (':' + this.getColumnNumber()) : '';
            return functionName + args + fileName + lineNumber + columnNumber;
        }
    };

    for (var i = 0; i < booleanProps.length; i++) {
        StackFrame.prototype['get' + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
        StackFrame.prototype['set' + _capitalize(booleanProps[i])] = (function(p) {
            return function(v) {
                this[p] = Boolean(v);
            };
        })(booleanProps[i]);
    }

    for (var j = 0; j < numericProps.length; j++) {
        StackFrame.prototype['get' + _capitalize(numericProps[j])] = _getter(numericProps[j]);
        StackFrame.prototype['set' + _capitalize(numericProps[j])] = (function(p) {
            return function(v) {
                if (!_isNumber(v)) {
                    throw new TypeError(p + ' must be a Number');
                }
                this[p] = Number(v);
            };
        })(numericProps[j]);
    }

    for (var k = 0; k < stringProps.length; k++) {
        StackFrame.prototype['get' + _capitalize(stringProps[k])] = _getter(stringProps[k]);
        StackFrame.prototype['set' + _capitalize(stringProps[k])] = (function(p) {
            return function(v) {
                this[p] = String(v);
            };
        })(stringProps[k]);
    }

    return StackFrame;
}));

},{}],82:[function(require,module,exports){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stacktrace-gps', ['source-map', 'stackframe'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('source-map/lib/source-map-consumer'), require('stackframe'));
    } else {
        root.StackTraceGPS = factory(root.SourceMap || root.sourceMap, root.StackFrame);
    }
}(this, function(SourceMap, StackFrame) {
    'use strict';

    /**
     * Make a X-Domain request to url and callback.
     *
     * @param {String} url
     * @returns {Promise} with response text if fulfilled
     */
    function _xdr(url) {
        return new Promise(function(resolve, reject) {
            var req = new XMLHttpRequest();
            req.open('get', url);
            req.onerror = reject;
            req.onreadystatechange = function onreadystatechange() {
                if (req.readyState === 4) {
                    if ((req.status >= 200 && req.status < 300) ||
                        (url.substr(0, 7) === 'file://' && req.responseText)) {
                        resolve(req.responseText);
                    } else {
                        reject(new Error('HTTP status: ' + req.status + ' retrieving ' + url));
                    }
                }
            };
            req.send();
        });

    }

    /**
     * Convert a Base64-encoded string into its original representation.
     * Used for inline sourcemaps.
     *
     * @param {String} b64str Base-64 encoded string
     * @returns {String} original representation of the base64-encoded string.
     */
    function _atob(b64str) {
        if (typeof window !== 'undefined' && window.atob) {
            return window.atob(b64str);
        } else {
            throw new Error('You must supply a polyfill for window.atob in this environment');
        }
    }

    function _parseJson(string) {
        if (typeof JSON !== 'undefined' && JSON.parse) {
            return JSON.parse(string);
        } else {
            throw new Error('You must supply a polyfill for JSON.parse in this environment');
        }
    }

    function _findFunctionName(source, lineNumber/*, columnNumber*/) {
        var syntaxes = [
            // {name} = function ({args}) TODO args capture
            /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/,
            // function {name}({args}) m[1]=name m[2]=args
            /function\s+([^('"`]*?)\s*\(([^)]*)\)/,
            // {name} = eval()
            /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/,
            // fn_name() {
            /\b(?!(?:if|for|switch|while|with|catch)\b)(?:(?:static)\s+)?(\S+)\s*\(.*?\)\s*\{/,
            // {name} = () => {
            /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*\(.*?\)\s*=>/
        ];
        var lines = source.split('\n');

        // Walk backwards in the source lines until we find the line which matches one of the patterns above
        var code = '';
        var maxLines = Math.min(lineNumber, 20);
        for (var i = 0; i < maxLines; ++i) {
            // lineNo is 1-based, source[] is 0-based
            var line = lines[lineNumber - i - 1];
            var commentPos = line.indexOf('//');
            if (commentPos >= 0) {
                line = line.substr(0, commentPos);
            }

            if (line) {
                code = line + code;
                var len = syntaxes.length;
                for (var index = 0; index < len; index++) {
                    var m = syntaxes[index].exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                }
            }
        }
        return undefined;
    }

    function _ensureSupportedEnvironment() {
        if (typeof Object.defineProperty !== 'function' || typeof Object.create !== 'function') {
            throw new Error('Unable to consume source maps in older browsers');
        }
    }

    function _ensureStackFrameIsLegit(stackframe) {
        if (typeof stackframe !== 'object') {
            throw new TypeError('Given StackFrame is not an object');
        } else if (typeof stackframe.fileName !== 'string') {
            throw new TypeError('Given file name is not a String');
        } else if (typeof stackframe.lineNumber !== 'number' ||
            stackframe.lineNumber % 1 !== 0 ||
            stackframe.lineNumber < 1) {
            throw new TypeError('Given line number must be a positive integer');
        } else if (typeof stackframe.columnNumber !== 'number' ||
            stackframe.columnNumber % 1 !== 0 ||
            stackframe.columnNumber < 0) {
            throw new TypeError('Given column number must be a non-negative integer');
        }
        return true;
    }

    function _findSourceMappingURL(source) {
        var sourceMappingUrlRegExp = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/mg;
        var lastSourceMappingUrl;
        var matchSourceMappingUrl;
        while (matchSourceMappingUrl = sourceMappingUrlRegExp.exec(source)) { // jshint ignore:line
            lastSourceMappingUrl = matchSourceMappingUrl[1];
        }
        if (lastSourceMappingUrl) {
            return lastSourceMappingUrl;
        } else {
            throw new Error('sourceMappingURL not found');
        }
    }

    function _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache) {
        return new Promise(function(resolve, reject) {
            var loc = sourceMapConsumer.originalPositionFor({
                line: stackframe.lineNumber,
                column: stackframe.columnNumber
            });

            if (loc.source) {
                // cache mapped sources
                var mappedSource = sourceMapConsumer.sourceContentFor(loc.source);
                if (mappedSource) {
                    sourceCache[loc.source] = mappedSource;
                }

                resolve(
                    // given stackframe and source location, update stackframe
                    new StackFrame({
                        functionName: loc.name || stackframe.functionName,
                        args: stackframe.args,
                        fileName: loc.source,
                        lineNumber: loc.line,
                        columnNumber: loc.column
                    }));
            } else {
                reject(new Error('Could not get original source for given stackframe and source map'));
            }
        });
    }

    /**
     * @constructor
     * @param {Object} opts
     *      opts.sourceCache = {url: "Source String"} => preload source cache
     *      opts.sourceMapConsumerCache = {/path/file.js.map: SourceMapConsumer}
     *      opts.offline = True to prevent network requests.
     *              Best effort without sources or source maps.
     *      opts.ajax = Promise returning function to make X-Domain requests
     */
    return function StackTraceGPS(opts) {
        if (!(this instanceof StackTraceGPS)) {
            return new StackTraceGPS(opts);
        }
        opts = opts || {};

        this.sourceCache = opts.sourceCache || {};
        this.sourceMapConsumerCache = opts.sourceMapConsumerCache || {};

        this.ajax = opts.ajax || _xdr;

        this._atob = opts.atob || _atob;

        this._get = function _get(location) {
            return new Promise(function(resolve, reject) {
                var isDataUrl = location.substr(0, 5) === 'data:';
                if (this.sourceCache[location]) {
                    resolve(this.sourceCache[location]);
                } else if (opts.offline && !isDataUrl) {
                    reject(new Error('Cannot make network requests in offline mode'));
                } else {
                    if (isDataUrl) {
                        // data URLs can have parameters.
                        // see http://tools.ietf.org/html/rfc2397
                        var supportedEncodingRegexp =
                            /^data:application\/json;([\w=:"-]+;)*base64,/;
                        var match = location.match(supportedEncodingRegexp);
                        if (match) {
                            var sourceMapStart = match[0].length;
                            var encodedSource = location.substr(sourceMapStart);
                            var source = this._atob(encodedSource);
                            this.sourceCache[location] = source;
                            resolve(source);
                        } else {
                            reject(new Error('The encoding of the inline sourcemap is not supported'));
                        }
                    } else {
                        var xhrPromise = this.ajax(location, {method: 'get'});
                        // Cache the Promise to prevent duplicate in-flight requests
                        this.sourceCache[location] = xhrPromise;
                        xhrPromise.then(resolve, reject);
                    }
                }
            }.bind(this));
        };

        /**
         * Creating SourceMapConsumers is expensive, so this wraps the creation of a
         * SourceMapConsumer in a per-instance cache.
         *
         * @param {String} sourceMappingURL = URL to fetch source map from
         * @param {String} defaultSourceRoot = Default source root for source map if undefined
         * @returns {Promise} that resolves a SourceMapConsumer
         */
        this._getSourceMapConsumer = function _getSourceMapConsumer(sourceMappingURL, defaultSourceRoot) {
            return new Promise(function(resolve, reject) {
                if (this.sourceMapConsumerCache[sourceMappingURL]) {
                    resolve(this.sourceMapConsumerCache[sourceMappingURL]);
                } else {
                    var sourceMapConsumerPromise = new Promise(function(resolve, reject) {
                        return this._get(sourceMappingURL).then(function(sourceMapSource) {
                            if (typeof sourceMapSource === 'string') {
                                sourceMapSource = _parseJson(sourceMapSource.replace(/^\)\]\}'/, ''));
                            }
                            if (typeof sourceMapSource.sourceRoot === 'undefined') {
                                sourceMapSource.sourceRoot = defaultSourceRoot;
                            }

                            resolve(new SourceMap.SourceMapConsumer(sourceMapSource));
                        }, reject);
                    }.bind(this));
                    this.sourceMapConsumerCache[sourceMappingURL] = sourceMapConsumerPromise;
                    resolve(sourceMapConsumerPromise);
                }
            }.bind(this));
        };

        /**
         * Given a StackFrame, enhance function name and use source maps for a
         * better StackFrame.
         *
         * @param {StackFrame} stackframe object
         * @returns {Promise} that resolves with with source-mapped StackFrame
         */
        this.pinpoint = function StackTraceGPS$$pinpoint(stackframe) {
            return new Promise(function(resolve, reject) {
                this.getMappedLocation(stackframe).then(function(mappedStackFrame) {
                    function resolveMappedStackFrame() {
                        resolve(mappedStackFrame);
                    }

                    this.findFunctionName(mappedStackFrame)
                        .then(resolve, resolveMappedStackFrame)
                        ['catch'](resolveMappedStackFrame);
                }.bind(this), reject);
            }.bind(this));
        };

        /**
         * Given a StackFrame, guess function name from location information.
         *
         * @param {StackFrame} stackframe
         * @returns {Promise} that resolves with enhanced StackFrame.
         */
        this.findFunctionName = function StackTraceGPS$$findFunctionName(stackframe) {
            return new Promise(function(resolve, reject) {
                _ensureStackFrameIsLegit(stackframe);
                this._get(stackframe.fileName).then(function getSourceCallback(source) {
                    var lineNumber = stackframe.lineNumber;
                    var columnNumber = stackframe.columnNumber;
                    var guessedFunctionName = _findFunctionName(source, lineNumber, columnNumber);
                    // Only replace functionName if we found something
                    if (guessedFunctionName) {
                        resolve(new StackFrame({
                            functionName: guessedFunctionName,
                            args: stackframe.args,
                            fileName: stackframe.fileName,
                            lineNumber: lineNumber,
                            columnNumber: columnNumber
                        }));
                    } else {
                        resolve(stackframe);
                    }
                }, reject)['catch'](reject);
            }.bind(this));
        };

        /**
         * Given a StackFrame, seek source-mapped location and return new enhanced StackFrame.
         *
         * @param {StackFrame} stackframe
         * @returns {Promise} that resolves with enhanced StackFrame.
         */
        this.getMappedLocation = function StackTraceGPS$$getMappedLocation(stackframe) {
            return new Promise(function(resolve, reject) {
                _ensureSupportedEnvironment();
                _ensureStackFrameIsLegit(stackframe);

                var sourceCache = this.sourceCache;
                var fileName = stackframe.fileName;
                this._get(fileName).then(function(source) {
                    var sourceMappingURL = _findSourceMappingURL(source);
                    var isDataUrl = sourceMappingURL.substr(0, 5) === 'data:';
                    var defaultSourceRoot = fileName.substring(0, fileName.lastIndexOf('/') + 1);

                    if (sourceMappingURL[0] !== '/' && !isDataUrl && !(/^https?:\/\/|^\/\//i).test(sourceMappingURL)) {
                        sourceMappingURL = defaultSourceRoot + sourceMappingURL;
                    }

                    return this._getSourceMapConsumer(sourceMappingURL, defaultSourceRoot)
                        .then(function(sourceMapConsumer) {
                            return _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache)
                                .then(resolve)['catch'](function() {
                                resolve(stackframe);
                            });
                        });
                }.bind(this), reject)['catch'](reject);
            }.bind(this));
        };
    };
}));

},{"source-map/lib/source-map-consumer":78,"stackframe":81}],83:[function(require,module,exports){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stacktrace', ['error-stack-parser', 'stack-generator', 'stacktrace-gps'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('error-stack-parser'), require('stack-generator'), require('stacktrace-gps'));
    } else {
        root.StackTrace = factory(root.ErrorStackParser, root.StackGenerator, root.StackTraceGPS);
    }
}(this, function StackTrace(ErrorStackParser, StackGenerator, StackTraceGPS) {
    var _options = {
        filter: function(stackframe) {
            // Filter out stackframes for this library by default
            return (stackframe.functionName || '').indexOf('StackTrace$$') === -1 &&
                (stackframe.functionName || '').indexOf('ErrorStackParser$$') === -1 &&
                (stackframe.functionName || '').indexOf('StackTraceGPS$$') === -1 &&
                (stackframe.functionName || '').indexOf('StackGenerator$$') === -1;
        },
        sourceCache: {}
    };

    var _generateError = function StackTrace$$GenerateError() {
        try {
            // Error must be thrown to get stack in IE
            throw new Error();
        } catch (err) {
            return err;
        }
    };

    /**
     * Merge 2 given Objects. If a conflict occurs the second object wins.
     * Does not do deep merges.
     *
     * @param {Object} first base object
     * @param {Object} second overrides
     * @returns {Object} merged first and second
     * @private
     */
    function _merge(first, second) {
        var target = {};

        [first, second].forEach(function(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    target[prop] = obj[prop];
                }
            }
            return target;
        });

        return target;
    }

    function _isShapedLikeParsableError(err) {
        return err.stack || err['opera#sourceloc'];
    }

    function _filtered(stackframes, filter) {
        if (typeof filter === 'function') {
            return stackframes.filter(filter);
        }
        return stackframes;
    }

    return {
        /**
         * Get a backtrace from invocation point.
         *
         * @param {Object} opts
         * @returns {Array} of StackFrame
         */
        get: function StackTrace$$get(opts) {
            var err = _generateError();
            return _isShapedLikeParsableError(err) ? this.fromError(err, opts) : this.generateArtificially(opts);
        },

        /**
         * Get a backtrace from invocation point.
         * IMPORTANT: Does not handle source maps or guess function names!
         *
         * @param {Object} opts
         * @returns {Array} of StackFrame
         */
        getSync: function StackTrace$$getSync(opts) {
            opts = _merge(_options, opts);
            var err = _generateError();
            var stack = _isShapedLikeParsableError(err) ? ErrorStackParser.parse(err) : StackGenerator.backtrace(opts);
            return _filtered(stack, opts.filter);
        },

        /**
         * Given an error object, parse it.
         *
         * @param {Error} error object
         * @param {Object} opts
         * @returns {Promise} for Array[StackFrame}
         */
        fromError: function StackTrace$$fromError(error, opts) {
            opts = _merge(_options, opts);
            var gps = new StackTraceGPS(opts);
            return new Promise(function(resolve) {
                var stackframes = _filtered(ErrorStackParser.parse(error), opts.filter);
                resolve(Promise.all(stackframes.map(function(sf) {
                    return new Promise(function(resolve) {
                        function resolveOriginal() {
                            resolve(sf);
                        }

                        gps.pinpoint(sf).then(resolve, resolveOriginal)['catch'](resolveOriginal);
                    });
                })));
            }.bind(this));
        },

        /**
         * Use StackGenerator to generate a backtrace.
         *
         * @param {Object} opts
         * @returns {Promise} of Array[StackFrame]
         */
        generateArtificially: function StackTrace$$generateArtificially(opts) {
            opts = _merge(_options, opts);
            var stackFrames = StackGenerator.backtrace(opts);
            if (typeof opts.filter === 'function') {
                stackFrames = stackFrames.filter(opts.filter);
            }
            return Promise.resolve(stackFrames);
        },

        /**
         * Given a function, wrap it such that invocations trigger a callback that
         * is called with a stack trace.
         *
         * @param {Function} fn to be instrumented
         * @param {Function} callback function to call with a stack trace on invocation
         * @param {Function} errback optional function to call with error if unable to get stack trace.
         * @param {Object} thisArg optional context object (e.g. window)
         */
        instrument: function StackTrace$$instrument(fn, callback, errback, thisArg) {
            if (typeof fn !== 'function') {
                throw new Error('Cannot instrument non-function object');
            } else if (typeof fn.__stacktraceOriginalFn === 'function') {
                // Already instrumented, return given Function
                return fn;
            }

            var instrumented = function StackTrace$$instrumented() {
                try {
                    this.get().then(callback, errback)['catch'](errback);
                    return fn.apply(thisArg || this, arguments);
                } catch (e) {
                    if (_isShapedLikeParsableError(e)) {
                        this.fromError(e).then(callback, errback)['catch'](errback);
                    }
                    throw e;
                }
            }.bind(this);
            instrumented.__stacktraceOriginalFn = fn;

            return instrumented;
        },

        /**
         * Given a function that has been instrumented,
         * revert the function to it's original (non-instrumented) state.
         *
         * @param {Function} fn to de-instrument
         */
        deinstrument: function StackTrace$$deinstrument(fn) {
            if (typeof fn !== 'function') {
                throw new Error('Cannot de-instrument non-function object');
            } else if (typeof fn.__stacktraceOriginalFn === 'function') {
                return fn.__stacktraceOriginalFn;
            } else {
                // Function not instrumented, return original
                return fn;
            }
        },

        /**
         * Given an error message and Array of StackFrames, serialize and POST to given URL.
         *
         * @param {Array} stackframes
         * @param {String} url
         * @param {String} errorMsg
         * @param {Object} requestOptions
         */
        report: function StackTrace$$report(stackframes, url, errorMsg, requestOptions) {
            return new Promise(function(resolve, reject) {
                var req = new XMLHttpRequest();
                req.onerror = reject;
                req.onreadystatechange = function onreadystatechange() {
                    if (req.readyState === 4) {
                        if (req.status >= 200 && req.status < 400) {
                            resolve(req.responseText);
                        } else {
                            reject(new Error('POST to ' + url + ' failed with status: ' + req.status));
                        }
                    }
                };
                req.open('post', url);

                // Set request headers
                req.setRequestHeader('Content-Type', 'application/json');
                if (requestOptions && typeof requestOptions.headers === 'object') {
                    var headers = requestOptions.headers;
                    for (var header in headers) {
                        if (headers.hasOwnProperty(header)) {
                            req.setRequestHeader(header, headers[header]);
                        }
                    }
                }

                var reportPayload = {stack: stackframes};
                if (errorMsg !== undefined && errorMsg !== null) {
                    reportPayload.message = errorMsg;
                }

                req.send(JSON.stringify(reportPayload));
            });
        }
    };
}));

},{"error-stack-parser":72,"stack-generator":80,"stacktrace-gps":82}],84:[function(require,module,exports){
var dep = {};
dep.tools = require('./tools.js');
dep.exception = require('./exception.js');
dep.sync = require('./sync.js');

/**
 * @namespace SecureExec.async
 * */
var  async = {};
var _async = {};
var _inner = {};

/**
 * Call a function @fn asynchronously, and pass the return value as an argument
 * to @callback.
 * <br />
 * If an error occurs, this return value will be an instance 
 * of {@link SecureExec.exception.Exception}.
 * <br />
 * All parameters after @fn and @callback will be passed as arguments to @fn.
 * @param {function} fn - Function to call.
 * @param {function} callback - Callback to call with the return value of @fn
 * as an argument (or an instance of {@link SecureExec.exception.Exception}).
 * @returns {boolean} Returns false if @fn or @callback are not valid 
 * functions. Otherwise, returns true.
 * @memberof SecureExec.async
 * @function
 * @name call
 * */
async.call = function(fn, callback){
    if(typeof fn!=='function' || typeof callback!=='function'){
        return false;
    }
    var args = dep.tools.proto.func.arrayFromArgumentsObject(arguments);
    args.shift(); // remove fn
    args.shift(); // remove callback
    setTimeout(function(){
        var res = dep.tools.proto.func.apply(fn, args);
        setTimeout(function(){
            callback(res);
        }, 0);
    }, 0);
    return true;
};

/**
 * Call a function @fn asynchronously, and pass the return value as an argument
 * to @callback.
 * <br />
 * If an error occurs, this return value will be an instance 
 * of {@link SecureExec.exception.Exception}.
 * <br />
 * The @args object must be a function's arguments object, or an array. 
 * @param {function} fn - Function to call.
 * @param {function} callback - Callback to call with the return value of @fn
 * as an argument (or an instance of {@link SecureExec.exception.Exception}).
 * @param {object|Array} args - Will be passed to @fn as an array of arguments.
 * @returns {boolean} Returns false if @fn or @callback are not valid 
 * functions, or if @args isn't an arguments object or array. Otherwise, 
 * returns true.
 * @memberof SecureExec.async
 * @function
 * @name apply
 * */
async.apply = function(fn, callback, args){
    if(typeof fn!=='function' || typeof callback!=='function'){
        return false;
    }
    if(typeof args==='undefined'){ return false; }
    if(typeof args==='object'){
        try{
            args=dep.tools.proto.func.arrayFromArgumentsObject(args);
        }catch(e){ return false; }
    }
    if(dep.tools.proto.arr.isArray(args)!==true){ return false; }
    setTimeout(function(){
        var res = dep.tools.proto.func.apply(fn, args);
        setTimeout(function(){
            callback(res);
        }, 0);
    }, 0);
    return true;
};

/**
 * Repeatedly call @task with @args as an argument, until its 
 * property `args.complete` is `true`.
 * <br />
 * Calls @final_callback when `args.complete` is `true`, or if an error occurs.
 * <br />
 * The @task needs to take one object as an argument ( @args ) which has 
 * parameters for the @task function, and return such an object so it can be 
 * passed to the next run of @task.
 * <br />
 * When @task shouldn't be repeated anymore, set the 
 * property `(args).complete=true` before returning the object. 
 * <br />
 * If an error occurs, the @final_callback will be called with the 
 * exception object immediately (see {@link SecureExec.exception.Exception}).
 * @param {function} task - Task to repeat.
 * @param {function} final_callback - Function to call after repetition is done.
 * Needs to take one object as an argument, which either is the arguments 
 * object last returned, or an instance 
 * of {@link SecureExec.exception.Exception} if an error occurs.
 * @param {object} args - Object which provides arguments for @task as 
 * properties. Please note this function uses a property 
 * from @args, `(args).complete`, internally. If @task returns an object with 
 * a property `complete===true`, the task will not be
 * called any longer and @final_callback will be called with this 
 * returned object as an argument.
 * @memberof SecureExec.async
 * @function
 * @name until
 * */
async.until = function(task, final_callback, args){
    if(typeof task!=='function' || typeof final_callback!=='function'){
        var e = new dep.exception.Exception("InvalidType", "task"+
                        "and final_callback must be functions for "+
                        "async.until!");
        setTimeout(function(){
            final_callback(e);
        }, 0);
        return;
    }
    if(typeof args!=='object'){
        var e = new dep.exception.Exception("InvalidType", "args"+
                        "must be an object for "+
                        "async.until!");
        setTimeout(function(){
            final_callback(e);
        }, 0);
        return;
    }
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    if(typeof args.complete!=='undefined' && args.complete === true){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    setTimeout(function(){
        args = [ args ];
        args = dep.tools.proto.func.apply(task, args);
        setTimeout(function(){
            async.until(task, final_callback, args);
        }, 0);
    }, 0);
};

/**
 * This function works similarly to {@link SecureExec.async.waterfall}, but
 * allows including functions which should be repeated like 
 * in {@link SecureExec.async.until}.
 * <br />
 * Tasks which should be called like other tasks 
 * in {@link SecureExec.async.waterfall} need to be passed in @tasks just as 
 * functions.
 * <br />
 * Tasks which should be repeated like in {@link SecureExec.async.until} need 
 * to be objects like `{ 'func': {function} fn, 'repeat': {boolean} true }`.
 * <br />
 * When repetition is done, the next item in @tasks will be called with the
 * return value of the last iteration, like the final callback 
 * of {@link SecureExec.async.until} would be.
 * @param {Array} tasks
 * @param {function} final_callback
 * @memberof SecureExec.async
 * @function
 * @name waterfallUntil
 * */
async.waterfallUntil = function(tasks, final_callback){
    _inner.waterfallUntil.callFunction.apply(null, arguments);
};
_inner.waterfallUntil = {};
_inner.waterfallUntil.callFunction = function(tasks, final_callback){
    var get_args = function(tasks, final_callback){
        if(typeof final_callback!=='function'){
            throw new Error("final_callback must be a function for "+
                            "async.waterfallUntil.");
        }
        if(dep.tools.proto.arr.isArray(tasks)!==true){
            throw new Error("tasks must be an array for "+
                            "async.waterfallUntil.");
        }
        var tmp = dep.tools.proto.func.arrayFromArgumentsObject(
                                                                arguments);
            tmp = tmp.slice(2);
        var args = [ tasks, final_callback, 0 ].concat(tmp);
        return args;
    };
    var args = dep.tools.proto.func.apply(get_args, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    var res = dep.tools.proto.func.apply(
                _inner.waterfallUntil.runFunction, args);
    if(dep.tools.proto.inst.isException(res)){
        setTimeout(function(){
            final_callback(res);
        }, 0);
        return;
    }
};
_inner.waterfallUntil.runFunction = function(tasks, final_callback, count){
    var get_args = function(tasks, final_callback, count){
        if(typeof count!=='number'){
            throw new Error(
            "Internal error in async.waterfallUntil: "+
            "count is not a number.");
        }
        if(typeof final_callback!=='function'){
            throw new Error("final_callback must be a function for "+
                            "async.waterfallUntil.");
        }
        var task = tasks[count];
        var task_obj = ( typeof task==='object' &&
                         ( typeof task.repeat==='boolean' &&
                           typeof task.func==='function'
                         )
                       );
        var task_func = (typeof task==='function');
        var task_not_valid = !(task_obj || task_func);
        if(task_not_valid && count<tasks.length){
            throw new Error("All tasks must be a function for "+
                            "async.waterfallUntil, task "+count+
                            " does not seem to be one.");
        }
        var args = dep.tools.proto.func.arrayFromArgumentsObject(
                        arguments);
        if(dep.tools.proto.inst.isException(args)){
            return args;
        }
        args = args.slice(3);
        return args;
    };
    var args = dep.tools.proto.func.apply(get_args, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            final_callback(args);
        }, 0);
        return;
    }
    if(count >= tasks.length){
        setTimeout(function(){
            dep.tools.proto.func.apply(final_callback, args);
        }, 0);
        return;
    }
    var task = tasks[count];
    setTimeout(function(){
        if(typeof task==='object'){
            task = task.func;
            if(typeof args[0]==='object' &&
               typeof args[0].complete==='boolean' && args[0].complete===true){
                count+=1;
            }else{
                args = dep.tools.proto.func.apply(task, args);
                if(dep.tools.proto.inst.isException(args)){
                    setTimeout(function(){
                        final_callback(args);
                    }, 0);
                    return;
                }
            }
        }else{
            count+=1;
            args = dep.tools.proto.func.apply(task, args);
                    if(dep.tools.proto.inst.isException(args)){
                setTimeout(function(){
                    final_callback(args);
                }, 0);
                return;
            }
        }
        setTimeout(function(){
            args = [ tasks, final_callback, count ].concat(args);
            //_async.waterfallUntil.apply(null,args);
            dep.tools.proto.func.apply(
                                    _inner.waterfallUntil.runFunction, args);
        }, 0);
    }, 0);
};

/**
 * Runs the @tasks array of functions in series, each passing their results to 
 * the next in the array. However, if any of the tasks returns an exception
 * (instance of {@link SecureExec.exception.Exception}), the next function is 
 * not executed, and the @final_callback is immediately called with an
 * instance of {@link SecureExec.exception.Exception} as an argument.
 * <br />
 * Parameters after @tasks and @final_callback will be used as parameters for
 * the first function (@tasks[0]).
 * @param {function[]} tasks - Array of functions.
 * @param {function} final_callback - Final callback.
 * @memberof SecureExec.async
 * @function
 * @name waterfall
 * */
async.waterfall = function(tasks, final_callback){
    //_inner.waterfall.callFunction.apply(null, arguments);
    var check_tasks = function(tasks){
        if(!dep.tools.proto.arr.isArray(tasks)){
            throw new Error("tasks must be an array for "+
                            "async.waterfall!");
        }
        for(var i=0; i<tasks.length; i++){
            if(typeof tasks[i]!=='function'){
                throw new Error("Each task must be a function!"+
                                "async.waterfall!");
            }
        }
        return true;
    };
    var tasks_val = dep.sync.apply(check_tasks, [tasks]);
    if(dep.tools.proto.inst.isException(tasks_val)){
            final_callback(tasks_val);
        return;
    }
    async.waterfallUntil.apply(null,arguments);
};

/**
 * Call a series of asynchronous function calls.
 * <br />
 * This is intended to wrap up several asynchronous calls, i.e. functions 
 * which will call a callback.
 * <br />
 * Functions in the series will NOT be executed securely, if they throw 
 * exceptions, these won't be caught. 
 * <br />
 * Therefore, this function makes most sense to combine functions which are 
 * asynchronous function calls via `SecureExec.async` (i.e., wrap a `waterfall` 
 * or `until` call) or functions which are not likely to throw exceptions.
 * <br />
 * Each function in the array of tasks needs to take two arguments,
 * like `function(auto_args, args)`. The `args` object is intended to carry 
 * function arguments, while the `auto_args` argument shouldn't be changed 
 * manually.
 * <br />
 * Instead of returning the arguments object `args`, a task should 
 * call `auto_args.callback(args)`.
 * <br /> 
 * The final callback will be called after all tasks are completed, with
 * like `final_callback(args)`. 
 * <br />
 * If invalid arguments are found, it will be called 
 * like `final_callback({SecureExec.Exception} exp, {\*} args)`.
 * <br />
 * To call the final callback earlier (for example, after an exception was 
 * detected manually), 
 * call `(auto_args).final_callback({SecureExec.Exception} exp, {\*} args)`.
 * @param {object} call_args - Object like `{'tasks': {function[] 
 * array_of_functions, 'final_callback': {function} final_callback}`.
 * @param {*} args - Passed as an actual argument to the first function in
 * the array. Each function in array must take arguments like `function({object}
 * auto_args, {\*} args)`, where `auto_args` should not be changed manually.
 * @function
 * @name insecureSeries
 * @memberof SecureExec.async
 * */
async.insecureSeries = function(call_args, args){
    var callback = async.insecureSeries;
    _inner.insecureSeries.callFunction(call_args, callback, args);
};
_inner.insecureSeries = {};
_inner.insecureSeries.callFunction = function(call_args, callback, args){
    var check = function(call_args, callback, args){
        var tasks = call_args.tasks;
        var count = call_args.count;
        var final_callback = call_args.final_callback;
        var msg = "Invalid argument for async.insecureSeries: ";
        if(typeof tasks==='undefined' || 
           dep.tools.proto.arr.isArray(tasks)!==true){
               throw new Error(msg+"@tasks is not an array!");
        }
        if(typeof count!=='number'){
            throw new Error(msg+"@count is not a number!");
        }
        if(typeof final_callback!=='function'){
            throw new Error(msg+"@final_callback is not a function!");
        }
        if(count>tasks.length && typeof tasks[count]==='undefined'){
            throw new Error(msg+"@tasks["+count+"] is not defined!");
        }
        if(count>tasks.length && typeof tasks[count]!=='function'){
            throw new Error(msg+"@tasks["+count+"] is not a function!");
        }
        /*if(typeof tasks[count].fn!=="function"){
            throw new Error(msg+"@tasks["+count+"].fn is not a function!");
        }
        if(typeof tasks[count].callback!=="function"){
            throw new Error(msg+
            *   "@tasks["+count+"].callback is not a function!");
        }*/
        if(count>0 && typeof callback!=='function'){
            throw new Error(msg+"@callback is not a function!");
        }
        if(typeof args==='undefined'){
            args = {};
        }
        return [call_args, callback, args];
    };
    var fn_args = dep.tools.proto.func.apply(check, arguments);
    if(dep.tools.proto.inst.isException(args)){
        setTimeout(function(){
            call_args.final_callback(args);
        }, 0);
        return;
    }
    if(dep.tools.proto.inst.isException(fn_args)){
        setTimeout(function(){
            call_args.final_callback(fn_args);
        }, 0);
        return;
    }
    _inner.insecureSeries.runFunction.apply(null, fn_args);
};
_inner.insecureSeries.runFunction = function(call_args, callback, args){
    var tasks = call_args.tasks;
    var count = call_args.count;
    var final_callback = call_args.final_callback;
    if(typeof tasks[count]==='function'){
        var task = tasks[count];
        call_args.count += 1;
        call_args.callback = callback;
        setTimeout(function(){
            task(call_args, args);
        }, 0);
    }else{
        setTimeout(function(){
            final_callback(args);
        }, 0);
    }
};

module.exports = async;

},{"./exception.js":85,"./sync.js":88,"./tools.js":89}],85:[function(require,module,exports){
var dep = {};
dep.stack = require('./stack.js');

/**
 * @namespace SecureExec.exception
 * */
var  exception = {};
var _exception = {};

var _instOf = function(obj, inst){
    try{
        if(typeof obj==='undefined' || typeof inst==='undefined'){
            return false;
        }
        if(obj instanceof inst){
            return true;
        }
    }catch(e){
        return false;
    }
};
var _isArr = function(arg){
    var is_array = Array.isArray || function(arg) {
        return Object.prototype.toString.callFunction(arg) === '[object Array]';
    };
    return is_array(arg);
};

/**
 * Constructor for a custom `SecureExec` exception. Instances of this class will
 * be just objects (instances of `SecureExec.exception.Exception`, not 
 * Javascript errors.
 * <br />
 * If you specify @name and/or @message, these name and error message will 
 * always be used, no matter whether @error is defined or not. 
 * <br />
 * With the optional @error property, an actual Javascript exception can be 
 * passed. If name and/or message aren't specified (i.e. `null` or empty 
 * strings), name and message from @error will be used.
 * <br />
 * A custom @stack array can be passed to set a custom stack trace. This 
 * stack trace will be merged with the stacktrace generated, or if @error is
 * specified, the stacktrace from @error. If @stack is not specified, the
 * stacktrace from @error or the stacktrace generated will be used. (This 
 * should usually be the case, if there's no reason for a custom additional
 * stacktrace.)
 * @typedef {Object} SecureExec.exception.Exception
 * @param {string} [name="Exception"] - Name of the exception.
 * @param {string} [message="Exception occured."] - Exception message.
 * @param {object} [error=null] - Javascript exception to get exception from. 
 * To get the name and message of @error, pass null for @name and @message.
 * @param {string[]} [stack] - Custom stack trace.
 * @returns {SecureExec.exception.Exception} 
 * @memberof SecureExec.exception
 * @class
 * @name Exception
 * */
exception.Exception = function(name, message, error, stack){
    var exp = new _exception.constructException(name, message, error, stack);
    /**
     * @name name
     * @member {string}
     * @memberof SecureExec.exception.Exception#
     * */
    this.name = exp.name;
    /**
     * @name message
     * @member {string}
     * @memberof SecureExec.exception.Exception#
     * */
    this.message = exp.message;
    /**
     * @name error
     * @member {Error}
     * @memberof SecureExec.exception.Exception#
     * */
    this.error = exp.error;
    /**
     * @name stack
     * @member {string[]}
     * @memberof SecureExec.exception.Exception#
     * */
    this.stack = exp.stack;
};

_exception.constructException = function(name, message, error, stack){
    this.name = "Exception";
    this.message = "Exception occured.";
    this.error = null;
    this.stack = [];
    /* Check whether there is a custom stack trace yet. */
    if(_isArr(stack)!==true){
        stack = [];
    }
    /* Get properties from @error if defined. */
    var err_name = null; var err_msg = null;
    if(_instOf(error, Error)){
        err_name = error.name || null;
        err_msg = error.message || null;
        var err_stack = dep.stack.getStackTrace(error);
        stack = stack.concat(err_stack);
    }
    /* Get stacktrace if there's now @error */
    else{
        stack = dep.stack.getStackTrace();
    }
    /* Get the exception name. */
    if(typeof err_name==='string' && err_name.length>0){
        if(typeof name!=='string' || name.length<1){
            name = err_name;
        }
    }
    /* Get the exception message. */
    if(typeof err_msg==='string'){
        if(typeof message!=='string'){
            message = err_msg;
        }
    }
    /* Get the properties */
    if(typeof name==='string' && name.length>0) this.name = name;
    if(typeof message==='string') this.message = message;
    if(_instOf(error, Error)) this.error = error;
    this.stack = stack;
};

module.exports = exception;

},{"./stack.js":87}],86:[function(require,module,exports){
/**
 * @namespace SecureExec
 * */
var SecureExec = {};
SecureExec.stack = require('./stack.js');
SecureExec.exception = require('./exception.js');
SecureExec.tools = require('./tools.js');
SecureExec.sync = require('./sync.js');
SecureExec.async = require('./async.js');

module.exports = SecureExec;

},{"./async.js":84,"./exception.js":85,"./stack.js":87,"./sync.js":88,"./tools.js":89}],87:[function(require,module,exports){
var stacktraceJS = require('stacktrace-js');

/**
 * @namespace SecureExec.stack
 * */
var stack = {};
var _stack = {};
var _inner = {};

/**
 * Get a stack trace for a custom exception, or a generate one at the point
 * where this function is called.
 * <br />
 * The stack trace will be an array of strings, which is empty if any exception
 * occurs creating the stacktrace.
 * @param {Error} [e] - Optional Javascript error object. If this is passed,
 * the stacktrace will be generated from the stack trace information found in
 * this object.
 * @returns {string[]}
 * @memberof SecureExec.stack
 * @function
 * @name getStackTrace
 * */
stack.getStackTrace = function(e){
    return _inner.getStackTrace.call(e);
};
_inner.getStackTrace = {};
_inner.getStackTrace.call = function(e){
    try{
        return _inner.getStackTrace.run(e);
    }catch(e){
        SecureExec.tools.log.consoleLog("Exception occured in "+
                                        "SecureExec.stack.getStackTrace: ");
        SecureExec.tools.log.consoleLog(e);
        return [];
    }
};
_inner.getStackTrace.run = function(e){
    var stack = [];
    var getStackFromE = false;
    try{ getStackFromE = ((typeof e==='object') && (e instanceof Error));
    }catch(e){}
    if(getStackFromE===true){
        stack = stacktraceJS.getSync({'e': e});
    }else{
        stack = stacktraceJS.getSync();
    }
    return stack;
};

module.exports = stack;

},{"stacktrace-js":83}],88:[function(require,module,exports){
var dep = {};
dep.tools = require('./tools.js');
dep.exception = require('./exception.js');

/**
 * @namespace SecureExec.sync
 * */
var  sync = {};
var _sync = {};

/**
 * Apply a function securely, i.e. without throwing actual Javascript errors if
 * anything breaks. 
 * <br />
 * This calls a function synchronously and either returns the functions return 
 * value, or an instance of {@link SecureExec.exception.Exception} if an error 
 * occurs. 
 * @param {function} - Function to apply.
 * @param {Array|Object} - Array of function parameters. This can be the 
 * arguments object from another function, or a simple array of function 
 * parameters.
 * @returns {*|SecureExec.exception.Exception} Return value of the function, 
 * or (in case of an exception) instance 
 * of {@link SecureExec.exception.Exception} 
 * @memberof SecureExec.sync
 * @function
 * @name apply
 * */
sync.apply = function (fn, args) {
    return dep.tools.proto.func.apply(fn, args);
};

/**
 * Call a function @fn synchronously.
 * <br />
 * Returns the return value of @fn. 
 * <br />
 * If an error occurs, this return value will be an instance of 
 * {@link SecureExec.exception.Exception}.
 * <br />
 * All parameters after @fn will be passed as arguments to @fn.
 * @param {function} fn - Function to call.
 * @returns {*|SecureExec.exception.Exception} Return value of the function, 
 * or an instance of {@link SecureExec.exception.Exception}.
 * @memberof SecureExec.sync
 * @function
 * @name call
 * */
sync.call = function(fn){
    var args = dep.tools.proto.func.arrayFromArgumentsObject(arguments);
    args.shift(); // remove fn
    return dep.tools.proto.func.apply(fn, args);
};

module.exports = sync;

},{"./exception.js":85,"./tools.js":89}],89:[function(require,module,exports){
var dep = {};
dep.exception = require('./exception.js');

/**
 * @namespace SecureExec.tools
 * */
var  tools = {};
var _tools = {};
var _inner = {};

/**
 * @namespace SecureExec.tools.proto
 * */
tools.proto = {};
_tools.proto = {};
_inner.proto = {};

/**
 * @namespace SecureExec.tools.proto.inst
 * */
tools.proto.inst = {};
_tools.proto.inst = {};
_inner.proto.inst = {};

/**
 * This function is a convenience wrapper for `instanceof`. It checks whether an
 * object is an instance of a class, but doesn't throw exceptions if for 
 * example the instance argument is undefined.
 * <br />
 * This function will return `true` if @obj is an instance of @inst, and `false`
 * if not so, or if an error occurs.
 * @param {object} obj - Object to check if it is an instance of @inst.
 * @param {function} inst - Class to check whether @inst is an instance of.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isInstanceOf
 * */
tools.proto.inst.isInstanceOf = function(obj, inst){
    return _inner.proto.inst.isInstanceOf.callFunction(obj, inst);
};
_inner.proto.inst.isInstanceOf = {};
_inner.proto.inst.isInstanceOf.callFunction = function(obj, inst){
    try{
        return _inner.proto.inst.isInstanceOf.runFunction(obj, inst);
    }catch(e){
        return false;
    }
};
_inner.proto.inst.isInstanceOf.runFunction = function(obj, inst){
    if(typeof obj==='undefined' || typeof inst==='undefined'){
        return false;
    }
    if(obj instanceof inst){
        return true;
    }
    return false;
};

/**
 * Checks whether an object is an instance of the `SecureExec` custom exception
 * type {@link SecureExec.exception.Exception}.
 * <br />
 * Please note this function will not return `true` on plain Javascript errors /
 * exceptions but is for checking for an instance of 
 * {@link SecureExec.exception.Exception}.
 * @param {object} e - Object to check whether is a {@link SecureExec.exception.Exception}.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isException
 * */
tools.proto.inst.isException = function(e){
    return tools.proto.inst.isInstanceOf(e, dep.exception.Exception);
};

/**
 * This function checks whether @e is an instance of Error, i.e. whether @e
 * is a normal Javascript error.
 * @param {object} e - Object to check whether this is a Javascript error.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.inst
 * @function
 * @name isError
 * */
tools.proto.inst.isError = function(e){
    return tools.proto.inst.isInstanceOf(e, Error);
};

/**
 * @namespace SecureExec.tools.proto.func
 * */
tools.proto.func = {};
_tools.proto.func = {};
_inner.proto.func = {};

/**
 * Converts the arguments object from a function into a simple array of the 
 * parameters.
 * @param {object} - Arguments object from a function.
 * @returns {Array} - Array of parameters.
 * @memberof SecureExec.tools.proto.func
 * @function
 * @name arrayFromArgumentsObject
 * */
tools.proto.func.arrayFromArgumentsObject = function(arg){
    return _inner.proto.func.argumentsArrayFromObject.callFunction(arg);
};
_inner.proto.func.argumentsArrayFromObject = {};
_inner.proto.func.argumentsArrayFromObject.callFunction = function(arg){
    try{
        return _inner.proto.func.argumentsArrayFromObject.runFunction(arg);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.func.argumentsArrayFromObject.runFunction = function(arg){
    var i=0; var arr = [];
    while(typeof arg[i]!=='undefined'){
        arr.push(arg[i]);
        i+=1;
    }
    return arr;
};

/**
 * Apply a function securely, i.e. without throwing actual Javascript errors if
 * anything breaks. 
 * <br />
 * This calls a function synchronously and either returns the functions return 
 * value, or an instance of {@link SecureExec.exception.Exception} if an error 
 * occurs. 
 * @param {function} - Function to apply.
 * @param {Array|Object} - Array of function parameters. This can be the 
 * arguments object from another function, or a simple array of function 
 * parameters.
 * @returns {*|SecureExec.exception.Exception}
 * @memberof SecureExec.tools.proto.func
 * @function
 * @name apply
 * */
tools.proto.func.apply = function(fn, args){
    return _inner.proto.func.apply.callFunction(fn, args);
};
_inner.proto.func.apply = {};
_inner.proto.func.apply.callFunction = function(fn, args){
    try{
        return _inner.proto.func.apply.runFunction(fn, args);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.func.apply.runFunction = function(fn, args){
    var apply_args = args;
        apply_args = tools.proto.func.arrayFromArgumentsObject(apply_args);
    if(tools.proto.inst.isException(apply_args)){
        return apply_args;
    }
    if(typeof fn!=='function'){
        // exception, need a function here
        throw new Error('fn must be a function to apply!');
    }
    if(tools.proto.arr.isArray(apply_args)!==true){
        // exception, need an array here
        throw new Error('args must be an array!');
    }
    return fn.apply(null, apply_args);
};

/**
 * @namespace SecureExec.tools.proto.arr
 * */
tools.proto.arr = {};
_tools.proto.arr = {};
_inner.proto.arr = {};

/**
 * Check whether @arg is an array.
 * @param {*} arg - Check if @arg is an array.
 * @returns {boolean}
 * @memberof SecureExec.tools.proto.arr
 * @function
 * @name isArray
 * */
tools.proto.arr.isArray = function(arg){
    return _inner.proto.arr.isArray.callFunction(arg);
};
_inner.proto.arr.isArray = {};
_inner.proto.arr.isArray.callFunction = function(arg){
    try{
        return _inner.proto.arr.isArray.runFunction(arg);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.arr.isArray.runFunction = function(arg){
    var is_array = Array.isArray || function(arg) {
        return Object.prototype.toString.callFunction(arg) === '[object Array]';
    };
    return is_array(arg);
};

/**
 * Get the unique elements in an array, i.e. remove duplicates.
 * @param {Array} - Array to get unique elements in.
 * @returns {Array|Object} Returns an array with duplicates removed, or an 
 * instance of {@link SecureExec.exception.Exception}.
 * @memberof SecureExec.tools.proto.arr
 * @function
 * @name isArray
 * */
tools.proto.arr.uniq = function(arr){
    return _inner.proto.arr.uniq.callFunction(arr);
};
_inner.proto.arr.uniq = {};
_inner.proto.arr.uniq.callFunction = function(arr){
    try{
        return _inner.proto.arr.uniq.runFunction(arr);
    }catch(e){
        var exp = new dep.exception.Exception(null,null,e);
        return exp;
    }
};
_inner.proto.arr.uniq.runFunction = function(arr){
    /* From: 
     * https://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array 
     * */
    var prims = {'boolean':{}, 'number':{}, 'string':{}}, objs = [];

    return a.filter(function(item) {
        var type = typeof item;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : 
                                                    (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
};

/**
 * @namespace SecureExec.tools.log
 * */
tools.log = {};
_tools.log = {};
_inner.log = {};

/**
 * Log a string to Javascript console if one is available.
 * @param {*} to_log - Object to log.
 * @memberof SecureExec.tools.log
 * @function
 * @name consoleLog
 * */
tools.log.consoleLog = function(to_log){
    if(typeof console!=='undefined' && typeof console.log==='function'){
        try{
            console.log(to_log);
        }catch(e){}
    }
};

module.exports = tools;

},{"./exception.js":85}],90:[function(require,module,exports){

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
 * @namespace nCrypt.enc
 * */
var encoding = {};
var _encoding = {};

_encoding.available = 
        [ "hex", "base64", "base64url", "base32", "utf8", "bytes" ];

/**
 * Available encodings in `nCrypt.enc`. All of these are string encodings 
 * except of 'bytes', which results in a byte array.
 * @name getAvailable
 * @memberof nCrypt.enc
 * @function
 * @returns {string[]}
 * */
encoding.getAvailable = function(){
    return JSON.parse(JSON.stringify(_encoding.available));
};

_encoding.encodings = {
    "bytes": {
        "enc": "bytes",
        "sjcl":  "bytes"
    },
    "hex": {
        "enc": "hex",
        "sjcl":  "hex"
    },
    "base64": {
        "enc": "base64",
        "sjcl":  "base64"
    },
    "base64url": {
        "enc": "base64url",
        "sjcl":  "base64url"
    },
    "base32": {
        "enc": "base32",
        "sjcl":  "base32"
    },
    "utf8": {
        "enc": "utf8",
        "sjcl":  "utf8String"
    }
};

/*
 * `nCrypt` supported data encodings. All encodings except of 'bytes' 
 * are string encodings, while 'bytes' means a byte array.
 * @name getEncodings
 * @memberof nCrypt.enc
 * @function
 * @private
 * */
encoding.getEncodings = function(){
    return JSON.parse(JSON.stringify(_encoding.encodings));
};

/**
 * Change the encoding of some data (string, byte array, or raw bit array).
 * <br />
 * (Using `null` instead of an encoding refers to a raw bit array like SJCL uses
 * internally.)
 * @name transform
 * @memberof nCrypt.enc
 * @function
 * @param {string|number[]} data - Data to transform encoding of.
 * @param {string} curEnc - Encoding of @data, `null` if @data is a raw bit 
 * array.
 * @param {string} newEnc - Result encoding, `null` to receive a raw bit array.
 * @returns {string|number[]|SecureExec.exception.Exception}
 * */
encoding.transform = function(data, curEnc, newEnc){
    var fn = _encoding.transform.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, curEnc, newEnc]);
};
_encoding.transform = {};
_encoding.transform.run = function(data, curEnc, newEnc){
    var doTransform = function(data, curEnc, newEnc){
        var bitArray = null;
        if(curEnc != null ){
            bitArray = encoding.toBits(data, curEnc);
        }else{
            bitArray = data;
        }
        var encoded = null;
        if(newEnc != null){
            encoded = encoding.fromBits(bitArray, newEnc);
        }else{
            encoded = bitArray;
        }
        return encoded;
    };
    var compare_results = function(t1, t2){
        if( (typeof t1)==="string" && (typeof t2)==="string" ){
            return (t1===t2);
        }else{
            return (t1.join(",")===t2.join(","));
        }
    };
    var _t1; var _t2;
    _t1 = doTransform(data, curEnc, newEnc);
    _t2 = doTransform(data, curEnc, newEnc);
    if( !(compare_results(_t1,_t2)) ){
        _t1 = doTransform(data, curEnc, newEnc);
        _t2 = doTransform(data, curEnc, newEnc);
        if( !(compare_results(_t1,_t2)) ){
            _t1 = doTransform(data, curEnc, newEnc);
            _t2 = doTransform(data, curEnc, newEnc);
            if( !(compare_results(_t1,_t2)) ){
                throw new ncrypt.exception.enc.transformFailed();
            }
        }
    }
    return _t1;
};

/**
 * Transforms a bit array to a string or byte array (if encoding is 'bytes') 
 * of a certain encoding. 
 * @private
 * @name fromBits
 * @memberof nCrypt.enc
 * @function
 * @param {number[]} data  - bitArray to transform to a string.
 * @param {string} enc - encoding of @data.
 * @returns {string|number[]|SecureExec.exception.Exception}
 * */
encoding.fromBits = function(data, enc){
    var fn = _encoding.fromBits.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, enc]);
};
_encoding.fromBits = {};
_encoding.fromBits.run = function(data, enc){
    enc = enc.toLowerCase();
    if((typeof _encoding.encodings[enc]).toLowerCase() == "undefined" ){
        throw new ncrypt.exception.enc.invalidEncoding(
                        "Invalid Encoding: "+enc+": No such encoding.");
    }
    if((typeof _encoding.encodings[enc].enc).toLowerCase() != "string"){
        throw new ncrypt.exception.enc.invalidEncoding();
    }
    var f = ncrypt.dep.sjcl.codec[_encoding.encodings[enc].sjcl];
    var encoded;
    try{
        encoded = f.fromBits(data);
    }catch(e){
        try{
            encoded = f.fromBits(data);
        }catch(e){
            try{
                encoded = f.fromBits(data);
            }catch(e){
                try{
                    encoded = f.fromBits(data);
                }catch(e){
                    try{
                    }catch(e){
                        //encoded = null;
                    }
                }
            }
        }
    }
    return encoded;
};

/**
 * Transforms a string of a certain encoding to a bit array. 
 * @private
 * @name toBits
 * @memberof nCrypt.enc
 * @function
 * @param {string|byte[]} data  - string to transform to a bitArray.
 * @param {String} enc  -  encoding of @data.
 * @returns  {number[]|SecureExec.exception.Exception} Bit array encoded data.
 * */
encoding.toBits = function(data, enc){
    var fn = _encoding.toBits.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, enc]);
};
_encoding.toBits = {};
_encoding.toBits.run = function(data, enc){
    enc = enc.toLowerCase();
    if((typeof _encoding.encodings[enc]).toLowerCase() == "undefined" ){
        throw new ncrypt.exception.enc.invalidEncoding(
                    "Invalid Encoding: "+enc+": No such encoding.");
    }
    if((typeof _encoding.encodings[enc].enc).toLowerCase() != "string"){
        throw new ncrypt.exception.enc.invalidEncoding();
    }
    var f = ncrypt.dep.sjcl.codec[_encoding.encodings[enc].sjcl];
    //console.log(data);
    var decoded;
    try{
        decoded = f.toBits(data);
    }catch(e){
        //console.log(e);
        try{
            decoded = f.toBits(data);
        }catch(e){
            try{
                decoded = f.toBits(data);
            }catch(e){
                try{
                    decoded = f.toBits(data);
                }catch(e){
                    try{
                    }catch(e){
                        decoded;
                    }
                }
            }
        }
    }
    return decoded;
};

return encoding; });

},{}],91:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.asym
 * */
var asym = {};

asym.simple = require('./simple/simple.js');

module.exports = asym;

},{"./simple/simple.js":92}],92:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.asym.simple
 * */
var simple = {};

simple.secret = require('./simple/secret.js');
simple.signature = require('./simple/signature.js');

module.exports = simple;

},{"./simple/secret.js":93,"./simple/signature.js":94}],93:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.asym.simple.secret
 * */
var secret = {};

secret.missingEncryptionKeypair = function(message){
    this.name = "nCrypt.exception.asym.simple.secret.missingEncryptionKeypair";
    this.message = message || 
                "The keyset passed doesn't support encryption.";
};
secret.missingEncryptionKeypair.prototype = new Error();
secret.missingEncryptionKeypair.prototype.constructor = 
    secret.missingEncryptionKeypair;

secret.eciesTagIsNotAString = function(message){
    this.name = "nCrypt.exception.asym.simple.secret.eciesTagIsNotAString";
    this.message = message || 
                "The tag passed doesn't seem to be a string - you need to "+
                "pass the tag along to restore the secret.";
};
secret.eciesTagIsNotAString.prototype = new Error();
secret.eciesTagIsNotAString.prototype.constructor = secret.eciesTagIsNotAString;

module.exports = secret;

},{}],94:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.asym.simple.signature
 * */
var signature = {};

signature.missingSigningKeypair = function(message){
    this.name = "nCrypt.exception.asym.simple.signature.missingSigningKeypair";
    this.message = message || 
                "The keyset passed doesn't support signing.";
};
signature.missingSigningKeypair.prototype = new Error();
signature.missingSigningKeypair.prototype.constructor = 
    signature.missingSigningKeypair;

signature.signatureNotAString = function(message){
    this.name = "nCrypt.exception.asym.simple.signature.signatureNotAString";
    this.message = message || 
                "The signature passed doesn't seem to be a string, or is "
                "empty.";
};
signature.signatureNotAString.prototype = new Error();
signature.signatureNotAString.prototype.constructor = 
    signature.signatureNotAString;

module.exports = signature;


},{}],95:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.enc
 * */
var enc = {};

enc.transformFailed = function(message){
    this.name = "nCrypt.exception.enc.transformFailed";
    this.message = message || "Transform failed.";
};
enc.transformFailed.prototype = new Error();
enc.transformFailed.prototype.constructor = enc.transformFailed;

enc.invalidEncoding = function(message){
    this.name = "nCrypt.exception.enc.invalidEncoding";
    this.message = message || "Invalid encoding.";
};
enc.invalidEncoding.prototype = new Error();
enc.invalidEncoding.prototype.constructor = enc.invalidEncoding;

module.exports = enc;

},{}],96:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception
 * */
var exception = {};

exception.Create = function(exp, name, msg){
    if(!name) name = null;
    if(!msg) msg = null;
    try{
        throw new exp(name, msg);
    }catch(e){ return e; }
};

exception.global = require('./global/global.js');
exception.init = require('./init/init.js');
exception.enc = require('./encoding/encoding.js');
exception.hash = require('./hash/hash.js');
exception.sym = require('./sym/sym.js');
exception.types = require('./types/types.js');
exception.asym = require('./asym/asym.js');

module.exports = exception;

},{"./asym/asym.js":91,"./encoding/encoding.js":95,"./global/global.js":97,"./hash/hash.js":98,"./init/init.js":99,"./sym/sym.js":100,"./types/types.js":118}],97:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.global
 * */
var global = {};

global.unexpectedType = function(message){
    this.name = "nCrypt.exception.global.unexpectedType";
    this.message = message || "Unexpected type.";
};
global.unexpectedType.prototype = new Error();
global.unexpectedType.prototype.constructor = global.unexpectedType;

module.exports = global;

},{}],98:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.hash
 * */
var hash = {};

hash.invalidAlgorithm = function(message){
    this.name = "nCrypt.exception.hash.invalidAlgorithm";
    this.message = message || "Invalid algorithm.";
};
hash.invalidAlgorithm.prototype = new Error();
hash.invalidAlgorithm.prototype.constructor = hash.invalidAlgorithm;

module.exports = hash;

},{}],99:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.init
 * */
var init = {};

init.unexpectedType = function(message){
    this.name = "nCrypt.exception.init.unexpectedType";
    this.message = message || "Unexpected type.";
};
init.unexpectedType.prototype = new Error();
init.unexpectedType.prototype.constructor = init.unexpectedType;

init.notEnoughEntropy = function(message){
    this.name = "nCrypt.exception.init.notEnoughEntropy";
    this.message = message || "Unexpected type.";
};
init.notEnoughEntropy.prototype = new Error();
init.notEnoughEntropy.prototype.constructor = init.notEnoughEntropy;

module.exports = init;

},{}],100:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.sym
 * */
var sym = {};

sym.noSuchParameter = function(message){
    this.name = "nCrypt.exception.sym.noSuchParameter";
    this.message = message || "No such parameter.";
};
sym.noSuchParameter.prototype = new Error();
sym.noSuchParameter.prototype.constructor = sym.noSuchParameter;

sym.invalidParameterValue = function(message){
    this.name = "nCrypt.exception.sym.invalidParameterValue";
    this.message = message || "Invalid parameter value.";
};
sym.invalidParameterValue.prototype = new Error();
sym.invalidParameterValue.prototype.constructor = sym.invalidParameterValue;

sym.malformedMessage = function(message){
    this.name = "nCrypt.exception.sym.malformedMessage";
    this.message = message || "Malformed message.";
};
sym.malformedMessage.prototype = new Error();
sym.malformedMessage.prototype.constructor = sym.malformedMessage;

sym.invalidAlgorithm = function(message){
    this.name = "nCrypt.exception.sym.invalidAlgorithm";
    this.message = message || "Invalid algorithm.";
};
sym.invalidAlgorithm.prototype = new Error();
sym.invalidAlgorithm.prototype.constructor = sym.invalidAlgorithm;

sym.encryptError = function(message){
    this.name = "nCrypt.exception.sym.encryptError";
    this.message = message || "Error while encrypting.";
};
sym.encryptError.prototype = new Error();
sym.encryptError.prototype.constructor = sym.encryptError;

sym.decryptError = function(message){
    this.name = "nCrypt.exception.sym.decryptError";
    this.message = message || "Error while decrypting.";
};
sym.decryptError.prototype = new Error();
sym.decryptError.prototype.constructor = sym.decryptError;

module.exports = sym;

},{}],101:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.basic
 * */

var basic = {};

basic.bn = require('./types/bn.js');
basic.secret = require('./types/secret.js');
basic.point = require('./types/point.js');
basic.id = require('./types/id.js');

module.exports = basic;

},{"./types/bn.js":102,"./types/id.js":103,"./types/point.js":104,"./types/secret.js":105}],102:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.basic.bn
 * */
var bn = {};

bn.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.basic.bn.invalidArgument";
    this.message = message || "Invalid argument.";
};
bn.invalidArgument.prototype = new Error();
bn.invalidArgument.prototype.constructor = bn.invalidArgument;

bn.noBigNumberObject = function(message){
    this.name = "nCrypt.exception.types.basic.bn.noBigNumberObject";
    this.message = message || "The argument passed as as an instance of "+
                              "bnjs.BN is none.";
};
bn.noBigNumberObject.prototype = new Error();
bn.noBigNumberObject.prototype.constructor = bn.noBigNumberObject;

bn.noBigNumberString = function(message){
    this.name = "nCrypt.exception.types.basic.bn.noBigNumberString";
    this.message = message || "The argument passed as as a serialized "+
                              " instance of bnjs.BN (string) is none.";
};
bn.noBigNumberString.prototype = new Error();
bn.noBigNumberString.prototype.constructor = bn.noBigNumberString;

module.exports = bn;

},{}],103:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.basic.id
 * */
var id = {};

id.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.basic.id.invalidArgument";
    this.message = message || "Invalid argument.";
};
id.invalidArgument.prototype = new Error();
id.invalidArgument.prototype.constructor = id.invalidArgument;

id.invalidEncoding = function(message){
    this.name = "nCrypt.exception.types.basic.id.invalidEncoding";
    this.message = message || "Invalid encoding. "+
                              "(Must be a valid string encoding != 'utf8'.)";
};
id.invalidEncoding.prototype = new Error();
id.invalidEncoding.prototype.constructor = id.invalidEncoding;

module.exports = id;

},{}],104:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.basic.point
 * */
var point = {};

point.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.basic.point.invalidArgument";
    this.message = message || "Invalid argument.";
};
point.invalidArgument.prototype = new Error();
point.invalidArgument.prototype.constructor = point.invalidArgument;

point.invalidCurve = function(message){
    this.name = "nCrypt.exception.types.basic.point.invalidCurve";
    this.message = message || "Invalid curve.";
};
point.invalidCurve.prototype = new Error();
point.invalidCurve.prototype.constructor = point.invalidCurve;

point.unsupportedCurveType = function(message){
    this.name = "nCrypt.exception.types.basic.point.unsupportedCurveType";
    this.message = message || "Unsupported curve type.";
};
point.unsupportedCurveType.prototype = new Error();
point.unsupportedCurveType.prototype.constructor = point.unsupportedCurveType;

point.cannotDeriveEC = function(message){
    this.name = "nCrypt.exception.types.basic.point.cannotDeriveEC";
    this.message = message || "Cannot derive new elliptic.ec instance - "+
                              "bug or invalid parameters.";
};
point.cannotDeriveEC.prototype = new Error();
point.cannotDeriveEC.prototype.constructor = point.cannotDeriveEC;

point.generatingPointFailed = function(message){
    this.name = "nCrypt.exception.types.basic.point.generatingPointFailed";
    this.message = message || "Generating point failed - most likely due to "
                              "invalid arguments.";
};
point.generatingPointFailed.prototype = new Error();
point.generatingPointFailed.prototype.constructor = point.generatingPointFailed;

point.deserializationFailed = function(message){
    this.name = "nCrypt.exception.types.basic.point.deserializationFailed";
    this.message = message || "Deserialization of point failed - input "
                              "probably wasn't a serialized point.";
};
point.deserializationFailed.prototype = new Error();
point.deserializationFailed.prototype.constructor = point.deserializationFailed;

module.exports = point;

},{}],105:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.basic.secret
 * */
var secret = {};

secret.invalidSourceType = function(message){
    this.name = "nCrypt.exception.types.basic.secret.invalidSourceType";
    this.message = message || ("Invalid source type (valid types: "+
                               "secret.source.BN, secret.source.STRING, "+
                               "secret.source.SECRET).");
};
secret.invalidSourceType.prototype = new Error();
secret.invalidSourceType.prototype.constructor = secret.invalidSourceType;

secret.invalidValue = function(message){
    this.name = "nCrypt.exception.types.basic.secret.invalidValue";
    this.message = message || ("Invalid value for chosen source type: Cannot "+
                               "create a valid secret instance from this.");
};
secret.invalidValue.prototype = new Error();
secret.invalidValue.prototype.constructor = secret.invalidValue;

module.exports = secret;

},{}],106:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.key
 * */

var key = {};

key.keypair = require('./types/keypair.js');

module.exports = key;

},{"./types/keypair.js":107}],107:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.key.keypair
 * */
var keypair = {};

keypair.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.key.keypair.invalidArgument";
    this.message = message || "Invalid argument.";
};
keypair.invalidArgument.prototype = new Error();
keypair.invalidArgument.prototype.constructor = keypair.invalidArgument;

keypair.invalidCurve = function(message){
    this.name = "nCrypt.exception.types.key.keypair.invalidCurve";
    this.message = message || "Invalid curve.";
};
keypair.invalidCurve.prototype = new Error();
keypair.invalidCurve.prototype.constructor = keypair.invalidCurve;

keypair.unsupportedCurveType = function(message){
    this.name = "nCrypt.exception.types.key.keypair.unsupportedCurveType";
    this.message = message || "Unsupported curve type.";
};
keypair.unsupportedCurveType.prototype = new Error();
keypair.unsupportedCurveType.prototype.constructor = keypair.unsupportedCurveType;

keypair.cannotGenerateKeypair = function(message){
    this.name = "nCrypt.exception.types.key.keypair.cannotGenerateKeypair";
    this.message = message || "Failed to generate new 'elliptic' keypair.";
};
keypair.cannotGenerateKeypair.prototype = new Error();
keypair.cannotGenerateKeypair.prototype.constructor = keypair.cannotGenerateKeypair;

keypair.serializationFailed = function(message){
    this.name = "nCrypt.exception.types.key.keypair.serializationFailed";
    this.message = message || "Serialization of keypair failed.";
};
keypair.serializationFailed.prototype = new Error();
keypair.serializationFailed.prototype.constructor = keypair.serializationFailed;

keypair.deserializationFailed = function(message){
    this.name = "nCrypt.exception.types.key.keypair.deserializationFailed";
    this.message = message || "Deserialization of keypair failed - input "
                              "probably wasn't a serialized keypair.";
};
keypair.deserializationFailed.prototype = new Error();
keypair.deserializationFailed.prototype.constructor = keypair.deserializationFailed;

module.exports = keypair;

},{}],108:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.shared
 * */

var shared = {};

shared.dh = require('./types/dh.js');
shared.ecies = require('./types/ecies.js');

module.exports = shared;

},{"./types/dh.js":109,"./types/ecies.js":110}],109:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.shared.dh
 * */
var dh = {};

dh.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.shared.dh.invalidArgument";
    this.message = message || "Invalid argument.";
};
dh.invalidArgument.prototype = new Error();
dh.invalidArgument.prototype.constructor = dh.invalidArgument;

dh.nonmatchingCurves = function(message){
    this.name = "nCrypt.exception.types.shared.dh.nonmatchingCurves";
    this.message = message || "Curves don't match. "
                              "(To derive a shared secret using DH, both "+
                              "keypairs must use the same curve.)";
};
dh.nonmatchingCurves.prototype = new Error();
dh.nonmatchingCurves.prototype.constructor = dh.nonmatchingCurves;

dh.derivationFailed = function(message){
    this.name = "nCrypt.exception.types.shared.dh.derivationFailed";
    this.message = message || "Derivation of shared secret failed.";
};
dh.derivationFailed.prototype = new Error();
dh.derivationFailed.prototype.constructor = dh.derivationFailed;

module.exports = dh;

},{}],110:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.shared.ecies
 * */
var ecies = {};

ecies.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.shared.ecies.invalidArgument";
    this.message = message || "Invalid argument.";
};
ecies.invalidArgument.prototype = new Error();
ecies.invalidArgument.prototype.constructor = ecies.invalidArgument;

ecies.derivationFailed = function(message){
    this.name = "nCrypt.exception.types.shared.ecies.derivationFailed";
    this.message = message || "Derivation of shared secret failed.";
};
ecies.derivationFailed.prototype = new Error();
ecies.derivationFailed.prototype.constructor = ecies.derivationFailed;

ecies.restoreFailed = function(message){
    this.name = "nCrypt.exception.types.shared.ecies.restoreFailed";
    this.message = message || "Restoring of shared secret failed.";
};
ecies.restoreFailed.prototype = new Error();
ecies.restoreFailed.prototype.constructor = ecies.restoreFailed;

module.exports = ecies;

},{}],111:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.signature
 * */

var signature = {};

signature.ecdsa = require('./types/ecdsa.js');

module.exports = signature;

},{"./types/ecdsa.js":112}],112:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.signature.ecdsa
 * */
var ecdsa = {};

ecdsa.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.signature.ecdsa.invalidArgument";
    this.message = message || "Invalid argument.";
};
ecdsa.invalidArgument.prototype = new Error();
ecdsa.invalidArgument.prototype.constructor = ecdsa.invalidArgument;

ecdsa.signatureSerializeFailed = function(message){
    this.name = "nCrypt.exception.types.signature.ecdsa.signatureSerializeFailed";
    this.message = message || "Serializing signature failed.";
};
ecdsa.signatureSerializeFailed.prototype = new Error();
ecdsa.signatureSerializeFailed.prototype.constructor = 
                                            ecdsa.signatureSerializeFailed;

ecdsa.signatureDeserializeFailed = function(message){
    this.name = 
            "nCrypt.exception.types.signature.ecdsa.signatureDeserializeFailed";
    this.message = message || "Deserializing signature failed.";
};
ecdsa.signatureDeserializeFailed.prototype = new Error();
ecdsa.signatureDeserializeFailed.prototype.constructor = 
                                            ecdsa.signatureDeserializeFailed;

ecdsa.signingFailed = function(message){
    this.name = "nCrypt.exception.types.signature.ecdsa.signingFailed";
    this.message = message || "Signing failed.";
};
ecdsa.signingFailed.prototype = new Error();
ecdsa.signingFailed.prototype.constructor = ecdsa.signingFailed;

module.exports = ecdsa;

},{}],113:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.simple.message
 * */

var message = {};

message.symkey = require('./types/symkey.js');
message.message = require('./types/message.js');

module.exports = message;

},{"./types/message.js":114,"./types/symkey.js":115}],114:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.simple.message.message
 * */
var message = {};

message.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.simple.message.message.invalidArgument";
    this.message = message || "Invalid argument.";
};
message.invalidArgument.prototype = new Error();
message.invalidArgument.prototype.constructor = message.invalidArgument;

message.malformedInput = function(message){
    this.name = "nCrypt.exception.types.simple.message.message.malformedInput";
    this.message = message || "Malformed input.";
};
message.malformedInput.prototype = new Error();
message.malformedInput.prototype.constructor = message.malformedInput;

message.invalidMessageType = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidMessageType";
    this.message = message || "Invalid message type.";
};
message.invalidMessageType.prototype = new Error();
message.invalidMessageType.prototype.constructor = message.invalidMessageType;

message.invalidMessageContent = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidMessageContent";
    this.message = message || "Invalid message content.";
};
message.invalidMessageContent.prototype = new Error();
message.invalidMessageContent.prototype.constructor = 
    message.invalidMessageContent;
    
message.invalidReceiverArray = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidReceiverArray";
    this.message = message || "Invalid message receiver symkey array.";
};
message.invalidReceiverArray.prototype = new Error();
message.invalidReceiverArray.prototype.constructor = 
    message.invalidReceiverArray;

message.malformedMessage = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.malformedMessage";
    this.message = message || "Malformed input.";
};
message.malformedMessage.prototype = new Error();
message.malformedMessage.prototype.constructor = message.malformedMessage;

message.messageIsNotEncrypted = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.messageIsNotEncrypted";
    this.message = message || "Message is not encrypted.";
};
message.messageIsNotEncrypted.prototype = new Error();
message.messageIsNotEncrypted.prototype.constructor = message.
    messageIsNotEncrypted;

message.messageIsNotSigned = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.messageIsNotSigned";
    this.message = message || "Message is not signed.";
};
message.messageIsNotSigned.prototype = new Error();
message.messageIsNotSigned.prototype.constructor = message.
    messageIsNotSigned;

message.missingSenderKeyset = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.missingSenderKeyset";
    this.message = message || "Missing sender keyset. (Required for "
                              "DH like shared secret derivation and "+
                              "signature validation.";
};
message.missingSenderKeyset.prototype = new Error();
message.missingSenderKeyset.prototype.constructor = message.missingSenderKeyset;

message.missingEncryptionKeypair = function(message){
    this.name = 
    "nCrypt.exception.types.simple.message.message.missingEncryptionKeypair";
    this.message = message || "Missing encryption keypair in keyset.";
};
message.missingEncryptionKeypair.prototype = new Error();
message.missingEncryptionKeypair.prototype.constructor = 
    message.missingEncryptionKeypair;

message.missingSigningKeypair = function(message){
    this.name = 
    "nCrypt.exception.types.simple.message.message.missingSigningKeypair";
    this.message = message || "Missing signing keypair in keyset.";
};
message.missingSigningKeypair.prototype = new Error();
message.missingSigningKeypair.prototype.constructor = 
    message.missingSigningKeypair;

message.cannotDecryptSymkey = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.cannotDecryptSymkey";
    this.message = message || "Cannot decrypt symmetric key using "
                              "shared secret.";
};
message.cannotDecryptSymkey.prototype = new Error();
message.cannotDecryptSymkey.prototype.constructor = message.cannotDecryptSymkey;

module.exports = message;

},{}],115:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.simple.message.symkey
 * */
var symkey = {};

symkey.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.simple.message.symkey.invalidArgument";
    this.message = message || "Invalid argument.";
};
symkey.invalidArgument.prototype = new Error();
symkey.invalidArgument.prototype.constructor = symkey.invalidArgument;

symkey.malformedInput = function(message){
    this.name = "nCrypt.exception.types.simple.message.symkey.malformedInput";
    this.message = message || "Malformed input.";
};
symkey.malformedInput.prototype = new Error();
symkey.malformedInput.prototype.constructor = symkey.malformedInput;

symkey.invalidSymkeySecret = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.symkey.invalidSymkeySecret";
    this.message = message || "Invalid symmetric key secret.";
};
symkey.invalidSymkeySecret.prototype = new Error();
symkey.invalidSymkeySecret.prototype.constructor = symkey.invalidSymkeySecret;

symkey.invalidSharedSecretObject = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.symkey."+
        "invalidSharedSecretObject";
    this.message = message || "Invalid shared secret object.";
};
symkey.invalidSharedSecretObject.prototype = new Error();
symkey.invalidSharedSecretObject.prototype.constructor = 
    symkey.invalidSharedSecretObject;

symkey.missingEncryptionPartInKeyset = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.symkey."+
        "missingEncryptionPartInKeyset";
    this.message = message || "Encryption part in keyset missing.";
};
symkey.missingEncryptionPartInKeyset.prototype = new Error();
symkey.missingEncryptionPartInKeyset.prototype.constructor = 
    symkey.missingEncryptionPartInKeyset;

symkey.missingPublicKeyset = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.symkey.missingPublicKeyset";
    this.message = message || "Missing public keyset.";
};
symkey.missingPublicKeyset.prototype = new Error();
symkey.missingPublicKeyset.prototype.constructor = 
    symkey.missingPublicKeyset;

module.exports = symkey;

},{}],116:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.simple
 * */

var simple = {};

simple.keyset = require('./types/keyset.js');
simple.message = require('./message/message.js');

module.exports = simple;

},{"./message/message.js":113,"./types/keyset.js":117}],117:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types.simple.keyset
 * */
var keyset = {};

keyset.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.invalidArgument";
    this.message = message || "Invalid argument.";
};
keyset.invalidArgument.prototype = new Error();
keyset.invalidArgument.prototype.constructor = keyset.invalidArgument;

keyset.invalidCurve = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.invalidCurve";
    this.message = message || "Invalid curve.";
};
keyset.invalidCurve.prototype = new Error();
keyset.invalidCurve.prototype.constructor = keyset.invalidCurve;

keyset.invalidCurveTypeSigning = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.invalidCurveTypeSigning";
    this.message = message || "Invalid curve type for signing: Signing "+
                              "is not supported for this curve type.";
};
keyset.invalidCurveTypeSigning.prototype = new Error();
keyset.invalidCurveTypeSigning.prototype.constructor = 
        keyset.invalidCurveTypeSigning;

keyset.serializationFailed = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.serializationFailed";
    this.message = message || "Serialization of keyset failed.";
};
keyset.serializationFailed.prototype = new Error();
keyset.serializationFailed.prototype.constructor = keyset.serializationFailed;

keyset.deserializationFailed = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.deserializationFailed";
    this.message = message || "Deserialization of keypair failed - input "+
                              "probably wasn't a serialized keyset.";
};
keyset.deserializationFailed.prototype = new Error();
keyset.deserializationFailed.prototype.constructor = keyset.deserializationFailed;

keyset.malformedKeyset = function(message){
    this.name = "nCrypt.exception.types.simple.keyset.malformedKeyset";
    this.message = message || "Keyset is malformed or this isn't a keyset.";
};
keyset.malformedKeyset.prototype = new Error();
keyset.malformedKeyset.prototype.constructor = keyset.malformedKeyset;

module.exports = keyset;

},{}],118:[function(require,module,exports){

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

/**
 * @namespace nCrypt.exception.types
 * */
var types = {};

types.basic = require('./basic/basic.js');
types.key = require('./key/key.js');
types.shared = require('./shared/shared.js');
types.signature = require('./signature/signature.js');
types.simple = require('./simple/simple.js');

module.exports = types;

},{"./basic/basic.js":101,"./key/key.js":106,"./shared/shared.js":108,"./signature/signature.js":111,"./simple/simple.js":116}],119:[function(require,module,exports){

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
 * @namespace nCrypt.hash
 * */
/* public */
var hash = {};
/* private */
var _hash = {};

_hash.available = [ "md5", "sha1", "ripemd160", "sha256", "sha512" ];

_hash.hashes = { "md5": "md5", "sha1": "sha1", "ripemd160": "ripemd160", 
                 "sha256": "sha256", "sha512": "sha512" };

/**
 * Returns an array of strings representing the available hash functions, 
 * such as "sha256".
 * @name getAvailable
 * @memberof nCrypt.hash
 * @member
 * @returns {string[]}
 * */
hash.getAvailable = function(){
    return JSON.parse(JSON.stringify(_hash.available));
};

/**
 * Hash an @data string using @algorithm as a hash algorithm and @enc as
 * encoding. ({@link nCrypt.enc} encodings work except of "utf8".)
 * @param {string} @data - Data to hash
 * @param {string} @algorithm - Algorithm to use for hashing
 * @param {string} @enc - Encoding of the resulting hash
 * @returns {string|number[]|SecureExec.exception.Exception} - The hash as a 
 * string, or a byte array, depending on @enc.
 * @name hash
 * @memberof nCrypt.hash
 * */
hash.hash = function(data, algorithm, enc){
    var fn = _hash.hash.run;
    return ncrypt.dep.SecureExec.sync.apply(fn, [data, algorithm, enc]);
};
_hash.hash = {};
_hash.hash.run = function(data, algorithm, enc){
    var applyHash = function(data, algorithm, enc){
        var hash_alg = _hash.hashes[algorithm];
        if( (typeof hash_alg).toLowerCase() == "undefined" ){
            throw new ncrypt.exception.hash.invalidAlgorithm(
                "Invalid Algorithm: "+algorithm+": Not a supported algorithm.");
            return null;
        }
        
        var hash_val = null;
        if( (typeof ncrypt.dep.sjcl.hash[hash_alg]).toLowerCase() 
                !== "undefined" ){
            hash_val = ncrypt.dep.sjcl.hash[hash_alg].hash(data);
        }else{
            if(hash_alg=="md5"){
                hash_val = ncrypt.dep.SparkMD5.hash(data, true);
            }else{
                throw new ncrypt.exception.hash.invalidAlgorithm(
                    "Invalid Algorithm: "+
                    algorithm+
                    ": Not a supported algorithm! - Not implemented?");
            }
        }
        
        if( (typeof enc).toLowerCase()==="undefined" || enc==null 
                || enc==="none" ){
            return hash_val;
        }else{
            if((typeof ncrypt.enc.getEncodings()[enc]).toLowerCase() 
                    === "undefined" || enc==="utf8" ){
                throw new ncrypt.exception.enc.invalidEncoding(
                "Invalid Encoding: "+enc+": No such encoding.");
            }
            hash_val = ncrypt.enc.fromBits(hash_val, enc);
            return hash_val;
        }
    };
    var hasher = function(data, algorithm, enc){
        var hash_val;
        try{
            hash_val = applyHash(data, algorithm, enc);
        }catch(e1){
            try{
                hash_val = applyHash(data, algorithm, enc);
            }catch(e2){
                try{
                    hash_val = applyHash(data, algorithm, enc);
                }catch(e3){
                    hash_val = applyHash(data, algorithm, enc);
                }
            }
        }
        return hash_val;
    };
    var compare_hashed = function(h1, h2){
        var hash1, hash2;
        if(typeof h1==="string" && typeof h2==="string"){
            hash1 = h1+"";
            hash2 = h2+"";
        }else if( (Array.isArray(h1)&&Array.isArray(h2)) &&
                  (typeof h1[0]==="number" && typeof h2==="number") ){
            hash1 = h1.join(",");
            hash2 = h2.join(",");
        }else{
        }
        if(hash1===hash2) return true;
        return false;
    };
    if( (typeof enc).toLowerCase()=="string" && enc!="none"){
        var hash_val1 = hasher(data, algorithm, enc);
        var hash_val2 = hasher(data, algorithm, enc);
        if(compare_hashed(hash_val1,hash_val2)===true){
            return hash_val1;
        }else{
            hash_val1 = hasher(data, algorithm, enc);
            hash_val2 = hasher(data, algorithm, enc);
            if(compare_hashed(hash_val1,hash_val2)===true){
                return hash_val1;
            }else{
                return null;
            }
        }
    }else{
        var hash_val1 = hasher(data, algorithm, enc);
        var hash_val2 = hasher(data, algorithm, enc);
        var equal = true;
        var len = hash_val1.length; var i=0;
        for(i=0; i<len; i++){
            if(hash_val1[i]!==hash_val2[i]) equal = false;
        }
        if(equal){
            return hash_val1;
        }else{
            hash_val1 = hasher(data, algorithm, enc);
            hash_val2 = hasher(data, algorithm, enc);
            equal = true;
            len = hash_val1.length; i=0;
            for(i=0; i<len; i++){
                if(hash_val1[i]!==hash_val2[i]) equal = false;
            }
            if(equal){
                return hash_val1;
            }else{
                return null;
            }
        }
    }
};

return hash; });

},{}],120:[function(require,module,exports){

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

},{}],121:[function(require,module,exports){

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

/**
 * @namespace nCrypt
 * */

var dep = require('./dep.js');
var exception = require('./exception/exception.js');
var tools = require('./tools/tools.js');
    tools = tools({ "dep": dep });
var random = require('./random/random.js');
    random = random({ "dep": dep,
                      "exception": exception });
var init = require('./init/init.js');
    init = init({ "dep": dep,
                  "exception": exception,
                  "random": random });
var enc = require('./encoding/encoding.js');
    enc = enc({ "dep": dep,
          "exception": exception });
var hash = require('./hash/hash.js');
    hash = hash({ "dep": dep,
          "exception": exception,
          "enc": enc });
var sym = require('./sym/sym.js');
    sym = sym({ "dep": dep,
          "exception": exception,
          "tools": tools,
          "random": random,
          "enc": enc,
          "hash": hash });
var asym = require('./asym/asym.js');
    asym = asym({ "dep": dep,
           "exception": exception,
           "tools": tools,
           "random": random,
           "enc": enc,
           "hash": hash,
           "sym": sym });

var nCrypt = {};
nCrypt.dep = dep;
nCrypt.exception = exception;
nCrypt.tools = tools;
nCrypt.random = random;
nCrypt.init = init;
nCrypt.enc = enc;
nCrypt.hash = hash;
nCrypt.sym = sym;
nCrypt.asym = asym;

module.exports = nCrypt;

},{"./asym/asym.js":37,"./dep.js":60,"./encoding/encoding.js":90,"./exception/exception.js":96,"./hash/hash.js":119,"./init/init.js":120,"./random/random.js":122,"./sym/sym.js":123,"./tools/tools.js":126}],122:[function(require,module,exports){

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

},{}],123:[function(require,module,exports){

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
var sjcl_blockcipher = require('./sym.sjcl.js');
    sjcl_blockcipher = sjcl_blockcipher(ncrypt);
var titaniumcore_blockcipher = require('./sym.titaniumcore.js');
    titaniumcore_blockcipher = titaniumcore_blockcipher(ncrypt);

/**
 * @namespace nCrypt.sym
 * */
var sym = {};
var _sym = {};
var _inner = {};

/* ########################################################################## */
/* #-_sym.available---------------------------------------------------------# */
/* ########################################################################## */

_sym.available = [
    "aes",
    "twofish",
    "serpent",
    "rijndael"
];

/**
 * Prints a simple array listing the supported algorithms of
 * `nCrypt.sym`. Print this array to see which algorithms are available for 
 * symmetric encryption.
 * @name getAvailable
 * @memberof nCrypt.sym
 * @function
 * @returns {string[]}
 * */
sym.getAvailable = function(){
    return JSON.parse(JSON.stringify(_sym.available));
};

/**
 * @namespace nCrypt.sym.config
 * */
sym.config = {};
_sym.config = {};
_inner.config = {};

_sym.config.getConfig = function(_opts, _defaults, _available){
    var runf = _inner.config.getConfig.run;
    return SecureExec.sync.apply(runf, [_opts, _defaults, _available]);
};
_inner.config.getConfig = {};
_inner.config.getConfig.run = function(_opts, _defaults, _available){
    var opts = JSON.parse(JSON.stringify(_opts));
    var defaults = JSON.parse(JSON.stringify(_defaults));
    var available = JSON.parse(JSON.stringify(_available));
    for(var k in opts){
        if((typeof defaults[k])==="undefined"){
            throw new ncrypt.exception.sym.noSuchParameter(
                "No such parameter: "+k+"."
            );
        }
    }
    for(var d in defaults){
        if((typeof opts[d])==="undefined"){
            opts[d] = defaults[d];
        }
    }
    for(var v in opts){
        var val = opts[v];
        var av  = available[v];
        var valid = false;
        if((typeof av)==="string"){
            // av is string
            if((typeof val)===av){
                valid = true;
            }
        }else{
            // av is array
            if(av.indexOf(val)>=0){
                valid = true;
            }
        }
        if(valid===false){
            throw new ncrypt.exception.sym.invalidParameterValue();
        }
    }
    if((typeof opts.iter) !== "undefined"){
        if(opts.iter <= 100){
            throw new ncrypt.exception.sym.invalidParameterValue();
        }
    }
    return opts;
};

/**
 * @namespace nCrypt.sym.config.blockcipher
 * */
sym.config.blockcipher = {};

/**
 * This object contains the available configuration options for blockcipher
 * operations in `nCrypt.sym`.
 * <br />
 * If there are certain defined values to choose from, they'll be described
 * as an array of these values, otherwise, as a string saying of which type 
 * the value needs to be.
 * <br />
 * Settings in `nCrypt.sym.config.blockcipher` are suitable for use with all
 * algorithms used in `nCrypt.sym` but AES. This is because all the other 
 * blockcipher algorithms are provided by titaniumcore, while AES is provided
 * by SJCL, which offers different settings. 
 * <br />
 * @see {@link nCrypt.sym.config.blockcipher.aes} for AES configuration.
 * @name available
 * @memberof nCrypt.sym.config.blockcipher
 * @member
 * */
sym.config.blockcipher.available = {
    /**
     * The keysize (ks) is often referred to as the encryption strength. 
     * "256 bit encryption" means some data was encrypted using a cryptographic
     * key which is 256 bit long, i.e. represents 256 bit of data.
     * "256 bit encryption" means that something was encrypted with a key
     * The longer the key is, the harder it is for an attacker to guess which 
     * key was used.
     * <br />
     * For symmetrical encryption, 256 bit is today's standard for highly 
     * secure encryption, and usually so performant there's not much reason to
     * choose a smaller keysize. 
     * @name ks
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    ks: [ 256 ],
    /**
     * When encrypting some data using a password, the password usually is not
     * a cryptographically random string representing the number of bits the
     * keysize requires.
     * <br />
     * To retrieve relatively secure cryptographic keys from user passwords,
     * PBKDF2 (Password Based Key Derivation Function) is used. PBKDF2 uses
     * a hash function and random salt to generate a key in usually a lot of 
     * iterations.
     * <br />
     * PBKDF2 is what may makes symmetrical encryption appear slow, as the 
     * actual encryption usually is very fast. The higher the number of 
     * iterations is, the more secure is PBKDF2. However, 1000 iterations might
     * take 400-500ms on an average low end processor. While this is still
     * okay for nearly any application, and 1000 iterations are absolutely
     * needed (!) when dealing with user passwords, going over 2000 probably
     * doesn't make much sense.
     * <br />
     * `nCrypt` uses SJCL for PBKDF2, which offers caching. This means that for
     * one and the same password, PBKDF2 will only be slow when using it for
     * the first time (during runtime).
     * <br />
     * When generating a password which actually resembles a cryptographic key
     * from bit strength and randomness (like a cryptographically random hex
     * string of 64 chars length), consider lowering iteration counts to 101
     * if (the lowest SJCL accepts for AES, and therefore the lowest nCrypt
     * accepts). __Providing lower iteration counts than 101 will result in the
     * iteration count being automatically raised by `nCrypt`. (For security and
     * compatibility with SJCL.)__
     * <br />
     * If unsure, the default (1000) usually is sensible. 
     * @name iter
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    iter: "number",
    /**
     * Block cipher mode of operation. Please note that the only working, rather
     * secure mode supported by **titaniumcore** is CBC. 
     * <br />
     * SJCL, which is used for AES in `nCrypt` 
     * (@see {@link nCrypt.sym.config.blockcipher.aes.available.mode})
     * supports more modes, of which `nCrypt` choses the most suitable. 
     * <br />
     * So at the moment, there's only one option for mode of operation for
     * algorithms provided by titaniumcore (Twofish, Serpent, Rijndael) - CBC.
     * @name mode
     * @memberof nCrypt.sym.config.blockcipher.available
     * @member
     * */
    mode: [ "cbc" ]
};

/**
 * This property is the default configuration object for blockcipher operations
 * in `nCrypt.sym`.
 * <br />
 * This object will be used if no configuration object is provided for 
 * encryption, or it's properties will fill the missing properties in the 
 * provided object.
 * @name defaults
 * @memberof nCrypt.sym.config.blockcipher
 * @function
 * @returns {object} Default parameters.
 * */
sym.config.blockcipher.defaults = function(){
    var defaults = {
        "ks": 256,
        "iter": 1000,
        "mode": "cbc"
    };
    return defaults;
};

/**
 * Input an options-object to receive a full and validated options object.
 * To see an example of a full options object, print 
 * `nCrypt.sym.config.blockcipher.defaults()` on console, and print
 * `nCrypt.sym.config.blockcipher.available` to see available options for
 * each property.
 * <br />
 * For example, if you provide {"iter":1200}, you'll get back {"iter":1200,
 * "ks": 256, "mode": "cbc" }.
 * @param {object} opts - Options object containing the options which should 
 * differ from the default options. 
 * @returns {object|SecureExec.exception.Exception} Full configuration object 
 * which can be passed to an encryption function.
 * @name getConfig
 * @memberof nCrypt.sym.config.blockcipher
 * @function
 * */
sym.config.blockcipher.getConfig = function(opts){
    var runf = function(opts){
        var defaults = sym.config.blockcipher.defaults();
        var available = JSON.parse(JSON.stringify(
                                sym.config.blockcipher.available));
        if(typeof opts === "undefined"){
            return defaults;
        }
        return _sym.config.getConfig(opts, defaults, available);
    };
    return SecureExec.sync.apply(runf, [opts]);
};

/**
 * @namespace nCrypt.sym.config.blockcipher.aes
 * */
sym.config.blockcipher.aes = {};
/**
 * This property is the default configuration object for AES operations
 * in `nCrypt.sym`.
 * <br />
 * This object will be used if no configuration object is provided for 
 * encryption, or it's properties will fill the missing properties in the 
 * provided object.
 * @name defaults
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @function
 * @returns {object} Default parameters.
 * */
sym.config.blockcipher.aes.defaults = function(){
    var defaults = {
        "iter": 1000,
        "ks": 256,
        "ts": 128,
        "mode": "gcm"
    };
    return defaults;
};
/**
 * This object contains the available configuration options for AES
 * options used in nCrypt.sym.
 * <br />
 * If there are certain definite values to choose from, they'll be described
 * as an array, otherwise as a string saying which type the value needs to be.
 * @name available
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @member
 * */
sym.config.blockcipher.aes.available = {
    /**
     * Keysize for AES encryption. 
     * @see {@link nCrypt.sym.config.blockcipher.available.ks} for further
     * information on keysize.
     * @name ks
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    ks: [ 128, 192, 256 ],
    /**
     * The authentication strength. The authentication of a message avoids
     * this message being changed after encryption without the receiver 
     * noticing at decryption time. 
     * <br />
     * A high authentication strength doesn't even affect performance in a way
     * enough to be noticed in nearly all use cases, so there's no reason not 
     * to simply use the highest authentication strength.
     * @name ts
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    ts: [ 64, 96, 128 ],
    /**
     * The block cipher mode of operation. While the only rather secure mode
     * titaniumcore has implemented at the moment is CBC, SJCL, which is 
     * used for AES, offers several more, of which chosen, most suitable ones
     * have been included in `nCrypt`.
     * <br />
     * @see {@link nCrypt.sym.config.blockcipher.aes.available.mode} for more
     * information on block cipher mode.
     * <br />
     * To choose a block cipher mode, read more about what each mode provides,
     * like @see {@link https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation|Wikipedia}
     * or @see {@link https://stackoverflow.com/questions/1220751/how-to-choose-an-aes-encryption-mode-cbc-ecb-ctr-ocb-cfb|This 
     * Stackoverflow discussion}.
     * <br />
     * GCM seems to be a safe choice concerning both security and
     * performance. `nCrypt` uses GCM as a default, so simply stay with that if
     * you are unsure - it seems to be a rather safe bet. If there's any reason
     * to use another mode (for example for compatiblity with another library)
     * use CCM, a secure and more widely implemented mode. 
     * @name mode
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    mode: ["ccm", "gcm"],
    /**
     * Iteration count used to get keys for AES encryption from a password. 
     * @see {@link nCrypt.sym.config.blockcipher.available.iter} for further
     * information on iteration count.
     * @name iter
     * @memberof nCrypt.sym.config.blockcipher.aes.available
     * @member
     * */
    iter: "number"
};

/**
 * Input an options-object to receive a full and validated options object.
 * To see an example of a full options object, print 
 * `nCrypt.sym.config.blockcipher.aes.defaults()` on console, and print
 * `nCrypt.sym.config.blockcipher.aes.available` to see available options for
 * each property.
 * @param {object} opts - Options object containing the options which should 
 * differ from the default options. 
 * @returns {object|SecureExec.exception.Exception} Full configuration object 
 * which can be passed to an encryption function.
 * @throws ncrypt.exception.sym.noSuchParameter
 * @throws ncrypt.exception.sym.invalidParameterValue
 * @name getConfig
 * @memberof nCrypt.sym.config.blockcipher.aes
 * @function
 * */
sym.config.blockcipher.aes.getConfig = function(opts){
    var runf = function(opts){
        var defaults = sym.config.blockcipher.aes.defaults();
        var available = JSON.parse(JSON.stringify(
                        sym.config.blockcipher.aes.available));
        if(typeof opts === "undefined"){
            return defaults;
        }
        return _sym.config.getConfig(opts, defaults, available);
    };
    return SecureExec.sync.apply(runf, [opts]);
};

/**
 * Get the algorithm and options a text was encrypted using, for example to 
 * reuse the options.
 * @param {string} encrypted - The encrypted text to analyse.
 * @returns {string|SecureExec.exception.Exception} Options object
 * like { "cipher": [string] algorithm, "opts": [object] opts }
 * @memberof nCrypt.sym.config
 * @name getOptionsOfEncrypted
 * @function
 * */
sym.config.getOptionsOfEncrypted = function(encrypted){
    var runf = _inner.config.getOptionsOfEncrypted.run;
    return SecureExec.sync.apply(runf, [encrypted]);
};
_inner.config.getOptionsOfEncrypted = {};
_inner.config.getOptionsOfEncrypted.run = function(encrypted){
    try{
        var obj = JSON.parse(encrypted);
        if(Array.isArray(obj.e)){
            // this was encrypted using sym.async
            if(typeof obj.c!=="undefined"){
                obj = obj.c;
            }else{
                obj = obj.e[0];
            }
        }
        var cipher = obj.cipher.toLowerCase();
        var defaults;
        if(cipher==="aes"){
            defaults = sym.config.blockcipher.aes.defaults();
        }else{
            defaults = sym.config.blockcipher.defaults();
        }
        var opts = {};
        for(var k in defaults){
            opts[k] = obj[k];
        }
        return { "cipher": cipher, "opts": opts };
    }catch(e){
        throw new ncrypt.exception.sym.malformedMessage();
    }
};

/**
 * @namespace nCrypt.sym.sync
 * */
sym.sync = {};
_sym.sync = {};
_inner.sync = {};

/**
 * Encrypt @data using @pass. Use @algorithm as encryption algorithm.
 * @param   {string}   data      -   Data string to encrypt
 * @param   {string}   pass      -   Password to use for encryption
 * @param   {string}   algorithm -   Algorithm to use for encryption.  Call 
 * `nCrypt.sym.getAvailable()` to see which algorithms are supported.
 * @param   {object}   [opts]    -  Options to configure how `nCrypt` 
 * uses @algorithm. Usually, defaults are fine, so you can omit this parameter. 
 * Check `nCrypt.sym.config.blockcipher.available`/ 
 * `nCrypt.sym.config.blockcipher.default` (or, for AES, the same for 
 * `nCrypt.sym.config.blockcipher.aes`) to find out which options you can use, 
 * and generate an options object 
 * using `nCrypt.sym.config.blockcipher.getConfig` /
 * `nCrypt.sym.config.blockcipher.aes.getConfig`.
 * @returns  {string|SecureExec.exception.Exception} Simple JSON string. [If 
 * encrypting multiple @data strings in bulk, with the same @pass and @opts, 
 * you might find some values staying the same each time. By only storing
 * the changing values multiple times and the values which stay the same only 
 * once, you might save bandwidth.]
 * @name encrypt
 * @memberof nCrypt.sym.sync
 * @function
 * */
sym.sync.encrypt = function(data, pass, algorithm, opts){
    var runf = _inner.sync.encrypt.run;
    return SecureExec.sync.apply(runf, [data, pass, algorithm, opts]);
};
_inner.sync.encrypt = {};
_inner.sync.encrypt.run = function(data, pass, algorithm, opts){
    if(typeof opts==='undefined' || (typeof opts==='object' && opts===null)){
        opts = {};
    }
    algorithm = algorithm.toLowerCase();
    if(_sym.available.indexOf(algorithm)<0){
        throw new ncrypt.exception.sym.invalidAlgorithm();
    }
    if(algorithm==="aes"){
        opts = sym.config.blockcipher.aes.getConfig(opts);
        try{
            var enc = sjcl_blockcipher.aes.exec.encrypt(data, pass, opts);
            return enc;
        }catch(e){
            throw new ncrypt.exception.sym.encryptError();
        }
    }else{
        opts = sym.config.blockcipher.getConfig(opts);
        try{
            var enc = titaniumcore_blockcipher.encrypt(
                        algorithm, data, pass, opts);
            return enc;
        }catch(e){
            throw new ncrypt.exception.sym.encryptError();
        }
    }
};

/**
 * Decrypt a string that was encrypted using `nCrypt.sym.sync.encrypt`. 
 * (Recognizes encryption algorithm and other params automatically.)
 * @param   {string}   data  - Ciphertext to decrypt.
 * @param   {string}   pass  - Password to use for decryption.
 * @returns  {string|SecureExec.exception.Exception} - Decrypted data, i.e. 
 * plaintext.
 * @name decrypt
 * @memberof nCrypt.sym.sync
 * @function
 * */
sym.sync.decrypt = function(data, pass){
    var runf = _inner.sync.decrypt.run;
    return SecureExec.sync.apply(runf, [data, pass]);
};
_inner.sync.decrypt = {};
_inner.sync.decrypt.run = function(data, pass){
    var algorithm = JSON.parse(data).cipher;
    if(algorithm==="aes"){
        try{
            var dec = sjcl_blockcipher.aes.exec.decrypt(data, pass);
            return dec;
        }catch(e){
            throw new ncrypt.exception.sym.decryptError(
                "Error decrypting message (Algorithm: "+algorithm+"). "+
                "Suspected reason: Wrong password, or malformed message."
            );
        }
    }else{
        try{
            var dec = titaniumcore_blockcipher.decrypt(data, pass);
            return dec;
        }catch(e){
            throw new ncrypt.exception.sym.decryptError(
                    "Error decrypting message (Algorithm: "+algorithm+"). "+
                    "Suspected reason: Wrong password, or malformed message."
                );
        }
    }
};

/**
 * Change an encrypted text, i.e. change password and/or algorithm and options.
 * If you want to change the password only, only supply @encrypted, @old_pass
 * and @new_pass. The options will exactly be the ones found in @encrypted.
 * <br />
 * If you want to change not only the password, but the algorithm and
 * options, pass @algorithm. This allows changing the algorithm a text is 
 * encrypted using, and the options if passed.
 * <br />
 * To leave the password the same, simply pass the same password for 
 * both @old_pass and @new_pass.
 * <br />
 * This function assumes @encrypted was encrypted 
 * using `nCrypt.sym.sync.encrypt`.
 * @param {string} encrypted - Encrypted text.
 * @param {string} old_pass - Password @encrypted was encrypted with.
 * @param {string} new_pass - New password @encrypted should be encrypted with.
 * @param {string} [algorithm] - New algorithm to use for encryption. If not
 * specified, the one already used in @encrypted is used.
 * @param {object} [opts] - Encryption options. If @algorithm is not specified
 * and this is omitted, options will be exactly like found in @encrypted. 
 * If @algorithm is specified and this is omitted, defaults for this algorithm 
 * will be used.
 * @returns {string|SecureExec.exception.Exception}
 * @memberof nCrypt.sym.sync
 * @name change
 * @function
 * */
sym.sync.change = function(encrypted, old_pass, new_pass, algorithm, opts){
    var runf = _inner.sync.change.run;
    return SecureExec.sync.apply(runf, [encrypted, old_pass, new_pass, 
                                        algorithm, opts]);
};
_inner.sync.change = {};
_inner.sync.change.run = function(encrypted, old_pass, new_pass, 
                                  algorithm, opts){
    if(typeof encrypted!=="string" || typeof old_pass!=="string" ||
       typeof new_pass!=="string"){
           throw new ncrypt.exception.global.unexpectedType();
    }
    var dec = sym.sync.decrypt(encrypted, old_pass);
    if(SecureExec.tools.proto.inst.isException(dec)){
        return dec;
    }
    if(typeof algorithm === 'undefined'){
        var options = sym.config.getOptionsOfEncrypted(encrypted);
        var cipher = options.cipher;
        options = options.opts;
    }else{
        var options = opts;
        var cipher = algorithm;
    }
    var enc = sym.sync.encrypt(dec, new_pass, cipher, options);
    return enc;
};

/**
 * @namespace nCrypt.sym.async
 * */
sym.async = {};
_sym.async = {};
_inner.async = {};

/**
 * Encrypt data asynchronously using @pass and @algorithm. This function 
 * internally uses `nCrypt.sym.sync.encrypt` but splits the @data into multiple
 * parts and encrypts them step by step.
 * <br />
 * This is suitable for encrypting extremely long @data-strings which cause
 * slowness-warnings and browser freezing trying to encrypt them.
 * <br />
 * @param {string} data - Data to encrypt.
 * @param {string} pass - Password to use for encryption.
 * @param {string} algorithm - Algorithm to use for encryption.
 * @param {function} callback - This function will be called with the result
 * when encryption is done, like callback({string} encrypted_data, {object} 
 * carry). So your @callback function should take two parameters, where the 
 * first is the encrypted data, and the second the data passed to carry.
 * (If an error occurs, an instance of `SecureExec.exception.Exception` will be 
 * passed instead of the encrypted data.)
 * @param {object} [carry] - If some data should be available in the
 * callback-function, pass it as a @carry-object which will be passed for 
 * the @carry parameter of the callback function. If there's nothing to pass 
 * for @carry, simply omit or pass null.
 * @param {opts}   [opts]      - Options to use for encryption with @algorithm.
 * @name encrypt
 * @memberof nCrypt.sym.async
 * @function
 * @throws ncrypt.exception.sym.invalidAlgorithm
 * @throws ncrypt.exception.sym.encryptError
 * */
sym.async.encrypt = function(data, pass, algorithm, callback, carry, opts){
    var donef = function(args){
        callback(args, carry);
    };
    var fns = [
        _inner.async.encrypt.start,
        {
            "repeat": true,
            "func": _inner.async.encrypt.rep
        },
        _inner.async.encrypt.done
    ];
    SecureExec.async.waterfallUntil(fns, donef, data, pass, algorithm, opts);
};
_inner.async.encrypt = {};
_inner.async.encrypt.start = function(data, pass, algorithm, opts){
    data = ncrypt.tools.proto.str.chunk(data, 3000);
    var res = [];
    var len = data.length;
    var i = 0;
    var args = {
        "data": {
            "data": data,
            "pass": pass,
            "len": len,
            "i": i
        },
        "res": {
            "res": res
        },
        "opts": {
            "algorithm": algorithm,
            "opts": opts
        }
    };
    return args;
};
_inner.async.encrypt.rep = function(args){
    var data = args.data.data;
    var pass = args.data.pass;
    var len = args.data.len;
    var i = args.data.i;
    var opts = args.opts.opts;
    var algorithm = args.opts.algorithm;
    var res = args.res.res;
    //var c = args.c;
    
    if(Array.isArray(res)){
        var enc = sym.sync.encrypt(data[i], pass, algorithm, opts);
        if(SecureExec.tools.proto.inst.isException(enc)){
            res = enc;
            args.complete = true;
        }else{
            res.push(JSON.parse(enc));
        }
    }
    i += 1;
    args = {
        "data": {
            "data": data,
            "pass": pass,
            "len": len,
            "i": i
        },
        "res": {
            "res": res
        },
        "opts": {
            "algorithm": algorithm,
            "opts": opts
        }
    };
    if(i===len){
        args.complete = true;
    }
    return args;
};
_inner.async.encrypt.done = function(args){
    var data = args.data.data;
    var pass = args.data.pass;
    var len = args.data.len;
    var i = args.data.i;
    var opts = args.opts.opts;
    var algorithm = args.opts.algorithm;
    var res = args.res.res;
    
    if(SecureExec.tools.proto.inst.isException(res)===false){
        var identical = ncrypt.tools.proto.jsonobj.identical(res);
        var identical_keys = ncrypt.tools.proto.jsonobj.keys(identical);
        for ( var k in res ){
            res[k] = ncrypt.tools.proto.jsonobj.remove(res[k], identical_keys);
        }
        var res_obj = {
            "c": identical,
            "e": res
        };
        res_obj = JSON.stringify(res_obj);
        res = res_obj;
    }
    return res;
};

/**
 * @param {string} data - Data to decrypt.
 * @param {string} pass - Password to use for decryption.
 * @param {function} callback - This function will be called with the result
 * when encryption is done, like callback({string} decrypted_data, {object} 
 * carry). So your @callback function should take two parameters, where the 
 * first is the encrypted data, and the second the data passed to carry along.
 * If an error occurs, the result data will be an instance of 
 * `SecureExec.exception.Exception`. 
 * Please note that "wrong password" is the most
 * common reason for undecryptable data, so if you receive a decrypt error, 
 * display a possibly wrong password reason to users. (If decryption fails 
 * multiple times / with correct password, a bug or malformed message is 
 * likely.)
 * @param {object} [carry] - If some data should be available in the
 * callback-function, pass it as a @carry-object which will be passed for 
 * the @carry parameter of the callback function. If there's nothing to pass 
 * for @carry, simply omit or pass null.
 * @name decrypt
 * @memberof nCrypt.sym.async
 * @function
 * */
sym.async.decrypt = function(data, pass, callback, carry){
    var donef = function(args){
        callback(args, carry);
    };
    var fns = [
        _inner.async.decrypt.start,
        {
            "repeat": true,
            "func": _inner.async.decrypt.rep
        },
        _inner.async.decrypt.done
    ];
    SecureExec.async.waterfallUntil(fns, donef, data, pass);
};
_inner.async.decrypt = {};
_inner.async.decrypt.start = function(data, pass){
    data = JSON.parse(data);
    var res = "";
    var args = {
        "data": data,
        "pass": pass,
        "res": res,
        "i": 0
    };
    return args;
};
_inner.async.decrypt.rep = function(args){
    var data = args.data;
    var enc = data.e;
    var identical = data.c;
    var i = args.i;
    var enc_i = ncrypt.tools.proto.jsonobj.merge([enc[i], identical]);
        enc_i = JSON.stringify(enc_i);
        enc_i = sym.sync.decrypt(enc_i, args.pass);
        if(SecureExec.tools.proto.inst.isException(enc_i)){
            args.res = enc_i;
            args.complete = true; 
            return args;
        }
        args.res += enc_i;
    args.i += 1;
    if(args.i === enc.length){
        args.complete = true;
    }
    return args;
};
_inner.async.decrypt.done = function(args){
    return args.res;
};

/**
 * Change an encrypted text, i.e. change password and/or algorithm and options.
 * If you want to change the password only, only supply @encrypted, @old_pass
 * and @new_pass. The options will exactly be the ones found in @encrypted.
 * <br />
 * If you want to change not only the password (to leave the password the same,
 * simple pass the same for @old_pass and @new_pass), but the algorithm and
 * options, pass @algorithm. This allows changing the algorithm a text is 
 * encrypted using, and the options.
 * <br />
 * This function assumes @encrypted was encrypted using nCrypt.sym.sync.
 * @param {string} encrypted - Encrypted text.
 * @param {string} old_pass - Password @encrypted was encrypted with.
 * @param {string} new_pass - New password @encrypted should be encrypted with.
 * @param {function} callback - function({string} enc, {object} carry), 
 * with @enc being an instance of SecureExec.exception.Exception if an error
 * occurs.
 * @param {object} [carry] - Object to carry along.
 * @param {string} [algorithm] - New algorithm to use for encryption. If not
 * specified, the one already used in @encrypted is used.
 * @param {object} [opts] - Encryption options. If @algorithm is not specified
 * and this is omitted, options will be exactly like found in @encrypted. 
 * If @algorithm is specified and this is omitted, defaults for this algorithm 
 * will be used.
 * @memberof nCrypt.sym.async
 * @name change
 * @function
 * */
sym.async.change = function(encrypted, old_pass, new_pass, 
                                    callback, carry,
                                    algorithm, opts){
    var check = function(encrypted, old_pass, new_pass, 
                                    callback, carry,
                                    algorithm, opts){
        var wrong_type = (typeof encrypted!=="string") ||
                         (typeof old_pass!=="string") ||
                         (typeof new_pass!=="string") ||
                         (typeof callback!=="function") ||
                         (typeof algorithm!=="undefined" &&
                              typeof algorithm!=="string") ||
                         (typeof opts!=="undefined" &&
                              typeof opts!=="object");
        if(wrong_type){
            throw new ncrypt.exception.global.unexpectedType();
        }else{
            return true;
        }
    };
    var checked = SecureExec.sync.apply(check, [encrypted, old_pass, new_pass, 
                                    callback, carry, algorithm, opts]);
    var get_opts = _inner.async.change.getOptions;
    var opts = SecureExec.sync.apply(get_opts, [
                    encrypted, algorithm, opts
               ]);
    if(SecureExec.tools.proto.inst.isException(opts)){
        callback(opts, carry);
        return;
    }
    var dec_d = function(dec, c){
        sym.async.encrypt(dec, new_pass, c.opts.cipher, 
                          c.encf, c, 
                          opts.opts);
    };
    var enc_d = function(enc, c){
        c.cb(enc, c.ca);
    };
    sym.async.decrypt(encrypted, old_pass, dec_d, {
        "encf": enc_d,
        "opts": opts,
        "cb": callback,
        "ca": carry
    });
};
_inner.async.change = {};
_inner.async.change.getOptions = function(encrypted, algorithm, opts){
    var options;
    if(typeof algorithm==="string"){
        options = {
            "cipher": algorithm,
            "opts": opts
        };
    }else{
        options = sym.config.getOptionsOfEncrypted(encrypted);
    }
    opts = options;
    return opts;
};

return sym; });

},{"./sym.sjcl.js":124,"./sym.titaniumcore.js":125}],124:[function(require,module,exports){

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

module.exports = (function(ncrypt) {
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

var sym = {};
var _sym = {};

var sjcl = ncrypt.dep.sjcl;

/* ########################################################################## */
/* #---sym.rand-------------------------------------------------------------# */
/* ########################################################################## */

sym.rand = {};
_sym.rand = {};
_sym.rand.words = {};
sym.rand.words = {};

sym.rand.words.gen = function(n){
    var words = sjcl.random.randomWords(n,10); 
    return words;
};

/* ########################################################################## */
/* #---sym.aes--------------------------------------------------------------# */
/* ########################################################################## */

sym.aes = {};
_sym.aes = {};

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +---sym.aes.rand---------------------------------------------------------+ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

_sym.aes.rand = {};

_sym.aes.rand.salt = function(){
    var salt = sym.rand.words.gen(2);
    return salt;
};
_sym.aes.rand.iv = function(){
    var iv = sym.rand.words.gen(4);
    return iv;
};

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* +---sym.aes.rand---------------------------------------------------------+ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

sym.aes.exec = {};
sym.aes.exec.encrypt = function(data, pass, options){
    if(typeof options==="undefined" || 
       (typeof options==='object' && options===null) ){
        options = {};
    }
    var opts = JSON.parse(JSON.stringify(options));
    opts.salt = _sym.aes.rand.salt();
    opts.iv = _sym.aes.rand.iv();
    var enc = sjcl.encrypt(pass, data, opts);
    if(typeof enc!=='string'){
        throw new ncrypt.exception.sym.decryptError(
                "Error while decrypting checking (AES) encryption output: "+
                "Bug or browser incompatibility or invalid input.");
    }
    var dec = null;
    try{
        dec = sjcl.decrypt(pass, enc);
    }catch(e){
        dec = null;
    }
    if(typeof dec!=='string' || dec!==data){
        enc = sjcl.encrypt(pass, data, opts);
        dec = sjcl.decrypt(pass, enc);
        if(typeof dec!=='string' || dec!==data){
            enc = sjcl.encrypt(pass, data, opts);
            dec = sjcl.decrypt(pass, enc);
            if(typeof dec!=='string' || dec!==data){
                throw new ncrypt.exception.sym.decryptError(
                "Error while decrypting checking (AES) encryption output: "+
                "Bug or browser incompatibility or invalid input.");
            }
        }
    }
    enc = JSON.parse(enc);
    enc.salt = ncrypt.enc.transform(enc.salt, "base64", "base64url");
    enc.iv = ncrypt.enc.transform(enc.iv, "base64", "base64url");
    enc.ct = ncrypt.enc.transform(enc.ct, "base64", "base64url");
    enc = JSON.stringify(enc);
    return enc;
};
sym.aes.exec.decrypt = function(data, pass){
    data = JSON.parse(data);
    data.salt = ncrypt.enc.transform(data.salt, "base64url", "base64");
    data.iv = ncrypt.enc.transform(data.iv, "base64url", "base64");
    data.ct = ncrypt.enc.transform(data.ct, "base64url", "base64");
    data = JSON.stringify(data);
    var dec;
    try{
        dec = sjcl.decrypt(pass, data);
    }catch(e1){
        try{
            dec = sjcl.decrypt(pass, data);
        }catch(e2){
            try{
                dec = sjcl.decrypt(pass, data);
            }catch(e3){
                try{
                    dec = sjcl.decrypt(pass, data);
                }catch(e4){
                    throw new ncrypt.exception.sym.decryptError(
                    "Error while decrypting (Algorithm: AES). "+
                    "Suspected reason: Wrong password.");
                }
            }
        }
    }
    if(dec.length<data.length){
        try{
            dec = sjcl.decrypt(pass, data);
        }catch(e1){
            try{
                dec = sjcl.decrypt(pass, data);
            }catch(e2){
                try{
                    dec = sjcl.decrypt(pass, data);
                }catch(e3){
                    dec = sjcl.decrypt(pass, data);
                }
            }
        }
    }
    return dec;
};

return sym;

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
});

},{}],125:[function(require,module,exports){

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

/*
 * Abstracts titaniumcore functionality. 
 * */
module.exports = (function(ncrypt){

/* public */
var block = {};
var _block = {};

var sjcl = ncrypt.dep.sjcl;
var titaniumcore = ncrypt.dep.titaniumcore;

_block.available= {
    algorithm:  {
        "SERPENT": "SERPENT", "TWOFISH": "TWOFISH", "RIJNDAEL": "RIJNDAEL"
    },
    blockmode: {
        "ECB": "ECB", "CBC": "CBC"
    },
    paddings: {
        "PKCS7": "PKCS7", "RFC1321": "RFC1321", "ANSIX923": "ANSIX923", "ISO10126": "ISO10126", "NO_PADDING": "NO_PADDING"
    },
    defaults: {
        "ks": 256,
        "iter": 1000,
        "mode": "cbc"
    }
};
block.encrypt = function(algorithm, data, pass, opts){
    
    if( (typeof opts).toLowerCase()==="undefined" ){
        opts = _block.available.defaults;
    }else{
        opts = opts;
    }
    
    var algorithm_upper = algorithm.toUpperCase();
    
    var ks = opts.ks;
    var iter = opts.iter;
    var mode = opts.mode.toUpperCase();
    var salt = sjcl.random.randomWords(2,10); 
    var tmp = sjcl.misc.cachedPbkdf2(pass, {"iter": iter, "salt": salt});
    var key = tmp.key.slice(0, ks/32);
        salt = tmp.salt;
    var b64key = sjcl.codec.base64.fromBits(key);
    var b64Salt = sjcl.codec.base64url.fromBits(salt);
    
    var algorithm = _block.available.algorithm[algorithm_upper];
    var mode = _block.available.blockmode[mode];
    var padding = _block.available.paddings["PKCS7"];
    var direction = "ENCRYPT";
    var cipher = titaniumcore.Cipher.create(algorithm, direction, mode, padding);
    
    var cleartext = titaniumcore.binary.str2utf8(data);
    key = titaniumcore.binary.base64_decode( _block.helpers.pack(b64key) );
    var ciphertext = cipher.execute( key.concat(), cleartext.concat() );
    var result = titaniumcore.binary.base64_encode( ciphertext );
        result = ncrypt.enc.transform(result, "base64", "base64url");
    
    var signature = _block.hmac.sign(b64key, result);

    signature = ncrypt.enc.transform(signature, "base64", "base64url");
    result = {"cipher": algorithm.toLowerCase(), 
              "salt": b64Salt, "iter": iter, "ks": ks, 
              "ct": result, "sig": signature, "mode": mode.toLowerCase() };
    result = JSON.stringify(result);
    
    return result;
};

block.decrypt = function(data, pass){
    
    /*
     * titaniumcore offers CBC mode for encryption. To use this mode securely,
     * each message needs
     * a) a new, random, unpredictable iv (titaniumcore generates them)
     * b) the resulting iv and ciphertext must be authenticated with HMAC
     * Good explanation on CBC / HMAC : https://defuse.ca/cbcmodeiv.htm
     * (It IS important to use encrypt than MAC, not the other way round.)
     * */
    
    data = JSON.parse(data);
    
    var algorithm = data.cipher;
    var algorithm_upper = algorithm.toUpperCase();
    
    var b64Salt = data.salt;
    var salt = sjcl.codec.base64url.toBits(b64Salt);
    var iter = data.iter;
    var ks = data.ks;
    var m = data.mode;
    var ciphertext = data.ct;
    
    var tmp = sjcl.misc.cachedPbkdf2(pass, {"iter": iter, "salt": salt});
    var key = tmp.key.slice(0, ks/32);
    var b64key = sjcl.codec.base64.fromBits(key);
    
    var algorithm = _block.available.algorithm[algorithm_upper];
    var mode = _block.available.blockmode[m.toUpperCase()];
    var padding = _block.available.paddings["PKCS7"];
    var direction = "DECRYPT";
    var cipher = titaniumcore.Cipher.create(algorithm, direction, mode, padding);
    
    var signature = _block.hmac.sign(b64key, ciphertext);
    var sig = ncrypt.enc.transform(data.sig, "base64url", "base64");
    if(signature!=sig){
        throw new ncrypt.exception.sym.decryptError(
        "Error while decrypting (Algorithm: "+algorithm+
        "). Suspected reason: Wrong password, or malformed message.");
    }
    ciphertext = ncrypt.enc.transform(ciphertext, "base64url", "base64");
    
    ciphertext = titaniumcore.binary.base64_decode(ciphertext);
    
    key = titaniumcore.binary.base64_decode( _block.helpers.pack( b64key ) );
    var cleartext = cipher.execute( key.concat(), ciphertext.concat() );
    var result = titaniumcore.binary.utf82str( cleartext );
    return result;
};

_block.hmac = {};
_block.hmac.sign = function(key, str){
    var hmac_key = ncrypt.hash.hash(key, "sha512", "hex");
    hmac_key = ncrypt.hash.hash(hmac_key, "sha256", "none");
    str = ncrypt.hash.hash(str, "sha256", "hex");
    var hmac = new sjcl.misc.hmac(hmac_key, sjcl.hash.sha256);
    var signature = hmac.encrypt(str);
    signature = sjcl.codec.base64.fromBits(signature);
    return signature;
};

_block.helpers = {};
_block.helpers.pack = function(s) {
    var result = "";
    for ( var i=0; i<s.length; i++ ) {
        var c = s.charAt( i );
        if ( c==" " || c=="\t" || c=="\r" || c=="\n" ) {
        } else {
            result += c;
        }
    }
    return result;
};

return block;

});

},{}],126:[function(require,module,exports){

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
 * @namespace nCrypt.tools
 * */
var  tools = {};
var _tools = {};

/**
 * @namespace nCrypt.tools.proto
 * */
tools.proto = {};
_tools.proto = {};

/**
 * @namespace nCrypt.tools.proto.jsonobj
 * */
tools.proto.jsonobj = {};
_tools.proto.jsonobj = {};

/**
 * For several objects, get the key-value-pairs which are identical for each
 * of these objects.
 * @name identical
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object[]} objects - Array of simple JSON objects.
 * @returns {object} Simple object containing the identical key value pairs.
 * */
tools.proto.jsonobj.identical = function(objects){
    var args = {
        "objects": objects
    };
    return _tools.proto.jsonobj.identical.process(args);
};
_tools.proto.jsonobj.identical = {};
_tools.proto.jsonobj.identical.process = function(args){
    var result = {};
    try{
        result = _tools.proto.jsonobj.identical.run(args);
    }catch(e){}
    return result;
};
_tools.proto.jsonobj.identical.run = function(args){
    var objects = args.objects;
    var res = {};
    var common_keys = tools.proto.jsonobj.common(objects);
    for(var i=0; i<common_keys.length; i++){
        var key = common_keys[i];
        var key_val = objects[0][key];
        var key_val_common = true;
        if( (typeof key_val).toLowerCase()!=="undefined" ){
            for(var j=0; j<objects.length; j++){
                var obj=objects[j];
                var obj_key_val = obj[key];
                if( (typeof obj_key_val).toLowerCase()==="undefined" ||
                    obj_key_val!==key_val ){
                    key_val_common = false;
                    break;
                }
            }
        }else{ key_val_common = false; }
        if(key_val_common===true){
            res[key] = key_val;
        }
    }
    return res;
};

/**
 * For several objects, get the keys which are present in all of the objects.
 * @name common
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object[]} objects - Array of simple JSON objects.
 * @returns {string[]} Array of all common keys.
 * */
tools.proto.jsonobj.common = function(objects){
    var keys = [];
    for(var i=0; i<objects.length; i++){
        var obj = objects[i];
        var obj_keys = tools.proto.jsonobj.keys(obj);
        keys.push(obj_keys);
    }
    return tools.proto.arr.common(keys);
};

/**
 * Get all the keys in an object.
 * @name keys
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object} obj - Simple object to get the keys of.
 * @returns {string[]} Array of the keys of this object.
 * */
tools.proto.jsonobj.keys = function(obj){
    var res=[];
    for(var k in obj){
        if(res.indexOf(k) < 0){
            res.push(k);
        }
    }
    return res;
};

/**
 * Merge several JSON objects into one. Please note that if a property has been
 * defined by one of the objects, it won't be overwritten anymore. If you want
 * values to be overwritten, pass @overwrite true.
 * @name merge
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param  {object[]} objects - Array of simple JSON objects.
 * @param  {boolean} overwrite - Overwrite existing values.
 * @returns {object}
 * */
tools.proto.jsonobj.merge = function(objects, overwrite){
    var res = {};
    for(var i=0; i<objects.length; i++){
        var obj = objects[i];
        for(var k in obj){
            if( (typeof res[k]).toLowerCase() === "undefined" || 
                overwrite===true ){
                res[k] = obj[k];
            }
        }
    }
    return res;
};

/**
 * Remove properties from an object. This function will not affect the original
 * object but rather clone the object without the specified keys. (To affect 
 * the original object, use delete like delete object.key.)
 * @name remove
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param  {object} obj - Object to remove keys from.
 * @param  {string[]} keys - Array of keys to remove.
 * @returns {object} Cloned object without the removed keys.
 * */
tools.proto.jsonobj.remove = function(obj, keys){
    var res = {};
    for(var k in obj){
        if(keys.indexOf(k)<0){
            res[k] = obj[k];
        }
    }
    return res;
};

/**
 * @namespace nCrypt.tools.proto.arr
 * */
tools.proto.arr = {};

/**
 * Get the common elements of several arrays, and return them in one array.
 * @name common
 * @function
 * @memberof nCrypt.tools.proto.arr
 * @param  {object[]} arrays - Array of arrays to get the common elements 
 *                              between all arrays from.
 * @returns {object[]} Array of all common elements.
 * */
tools.proto.arr.common = function(arrays){
    
    /*
     * functions adapted from
     * https://stackoverflow.com/questions/11076067/finding-matches-between-multiple-javascript-arrays
     * */
    
    if( (typeof Array.prototype.reduce).toLowerCase() === "function" ){
        var result = arrays.shift().reduce(function(res, v) {
            if (res.indexOf(v) === -1 && arrays.every(function(a) {
                return a.indexOf(v) !== -1;
            })) res.push(v);
            return res;
        }, []);
        return result;
    }
    
    var i, common,
    L= arrays.length, min= Infinity;
    while(L){
        if(arrays[--L].length<min){
            min= arrays[L].length;
            i= L;
        }
    }
    common= arrays.splice(i, 1)[0];
    return common.filter(function(itm, indx){
        if(common.indexOf(itm)== indx){
            return arrays.every(function(arr){
                return arr.indexOf(itm)!= -1;
            });
        }
    });
};

/**
 * @namespace nCrypt.tools.proto.str
 * */
tools.proto.str = {};

/**
 * Replaces all occurences of @find with @replace.
 * @name replaceAll
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param   {string}   str     -  Original string.
 * @param   {string}   find    -  String to replace.
 * @param   {string}   replace -  String to replace @find with.
 * @returns  {string}
 * */
tools.proto.str.replaceAll = function(str, find, replace){
    return str.replace(new RegExp(find, 'g'), replace);
};

/**
 * Checks if a string starts with another.
 * @name startsWith
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str     -  Original string.
 * @param  {string} start   -  String to check if @str starts with.
 * @returns {string}
 * */
tools.proto.str.startsWith = function (str, start){
    return str.indexOf(start) == 0;
};

/**
 * Trim a given String, i.e. remove whitespaces at the beginning and end.
 * @name trim
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str   -  Original string.
 * @returns {string}
 * */
tools.proto.str.trim = function (str){
    str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
    while (ws.test(str.charAt(--i)));
    str = str.slice(0, i + 1);
    str = str.replace(/^\s+|\s+$/g, '');
    return str;
};

/**
 * Trim and remove multiple whitespaces from a string.
 * @name allTrim
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str     -  Original string.
 * @returns {string}
 * */
tools.proto.str.allTrim = function(str){
    var str = str.replace(/\s+/g,' ');
    str = str.replace(/^\s+|\s+$/,'');
    str = str.replace(/^\s+|\s+$/g, '');
    return str;
};

/**
 * Remove whitespace characters from string.
 * @name removeWhitespace
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeWhitespace = function(str){
    return str.replace(/\s+/g, '');
};

/**
 * Remove linebreak characters from string.
 * @name removeLinebreaks
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeLinebreaks = function(str){
    return str.replace(/(\r\n|\n|\r)/gm,"");
};

/**
 * Remove whitespace and linebreak characters from string.
 * @name removeWhitespaceAndLinebreaks
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeWhitespaceAndLinebreaks = function(str){
    var str = str.replace(/\s+/g, ' ');
    str = str.replace(/(\r\n|\n|\r)/gm,"");
    return str;
};

/**
 * Returns a string between two strings. Checks for the first 
 * occurence of @start an the next occurence of @end
 * after this.
 * @name between
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param   {string} str     -  Original string.
 * @param   {string} start
 * @param   {string} end
 * @returns  {string}
 * */
tools.proto.str.between = function(str, start, end){
    var pos1 = str.indexOf(start);
    var used = str.substr(pos1);
    var pos2 = used.indexOf(end);
    pos2 = pos1+pos2;
    if(pos1!=-1 && pos2!=-1){
        pos1 = pos1 + start.length;
        var pos3 = str.length - (str.length-pos2) - pos1;
        return str.substr(pos1, pos3);
    }
    return null;
};

/**
 * Chunk a string in pieces of the specified length.
 * @name chunk
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @param  {number}        length -  (Max.) length of the chunks.
 * @returns {string[]}
 * */
tools.proto.str.chunk = function(str, len) {
    var start = 0; 
    var end = len;
    var toceil = str.length/len;
    var upto = Math.ceil(toceil);
    var res = [];
    for(var i=0; i<upto; i++){
        var cur_str = str.slice(start, end);
        res.push(cur_str);
        start = start+len;
        end = end+len;
    }
    return res;
};

/**
 * Reverse a given string.
 * @name reverse
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @returns {string}
 * */
tools.proto.str.reverse = function(str){
    var s = str;
    /* should be the most performant string reverse,
     * see
     * http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
     * */
    var o = '';
    for (var i = s.length - 1; i >= 0; i--)
    o += s[i];
    return o;
};

/**
 * Shuffle a string randomly. Please note: This is not cryptographically random.
 * Do not use if security depends on the string really being randomly shuffled.
 * @name shuffle
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @returns {string}
 * */
tools.proto.str.shuffle = function(str){
    
    /*
     * str_shuffle like in PHP, from
     * http://phpjs.org/functions/str_shuffle/
     * */
    if (str == null || str.length==0) {
        return '';
    }
    str += '';
    var newStr = '',
    rand, i = str.length;
    while (i) {
        rand = Math.floor(Math.random() * i);
        newStr += str.charAt(rand);
        str = str.substring(0, rand) + str.substr(rand + 1);
        i--;
    }
    return newStr;
};

return tools; });

},{}]},{},[121])(121)
});
