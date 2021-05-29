
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
