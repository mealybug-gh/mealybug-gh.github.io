
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

