
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
