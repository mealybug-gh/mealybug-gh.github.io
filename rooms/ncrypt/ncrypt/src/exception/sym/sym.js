
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
