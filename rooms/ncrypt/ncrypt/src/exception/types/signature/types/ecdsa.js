
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
