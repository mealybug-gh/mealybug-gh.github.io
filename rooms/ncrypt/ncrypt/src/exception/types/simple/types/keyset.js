
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
