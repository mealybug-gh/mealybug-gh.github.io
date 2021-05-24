
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
 * @namespace nCrypt.exception.asym.simple.secret
 * */
var secret = {};

secret.missingEncryptionKeypair = function(message){
    this.name = "nCrypt.exception.asym.simple.secret.missingEncryptionKeypair";
    this.message = message || 
                "The keyset passed doesn't support encryption.";
};
secret.missingEncryptionKeypair.prototype = new Error();
secret.missingEncryptionKeypair.prototype.constructor = 
    secret.missingEncryptionKeypair;

secret.eciesTagIsNotAString = function(message){
    this.name = "nCrypt.exception.asym.simple.secret.eciesTagIsNotAString";
    this.message = message || 
                "The tag passed doesn't seem to be a string - you need to "+
                "pass the tag along to restore the secret.";
};
secret.eciesTagIsNotAString.prototype = new Error();
secret.eciesTagIsNotAString.prototype.constructor = secret.eciesTagIsNotAString;

module.exports = secret;
