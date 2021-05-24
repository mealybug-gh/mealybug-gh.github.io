
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
