
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
 * @namespace nCrypt.exception.enc
 * */
var enc = {};

enc.transformFailed = function(message){
    this.name = "nCrypt.exception.enc.transformFailed";
    this.message = message || "Transform failed.";
};
enc.transformFailed.prototype = new Error();
enc.transformFailed.prototype.constructor = enc.transformFailed;

enc.invalidEncoding = function(message){
    this.name = "nCrypt.exception.enc.invalidEncoding";
    this.message = message || "Invalid encoding.";
};
enc.invalidEncoding.prototype = new Error();
enc.invalidEncoding.prototype.constructor = enc.invalidEncoding;

module.exports = enc;
