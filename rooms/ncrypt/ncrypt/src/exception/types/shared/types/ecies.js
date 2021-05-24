
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
