
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
