
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
