
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
 * @namespace nCrypt.exception.types.shared.dh
 * */
var dh = {};

dh.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.shared.dh.invalidArgument";
    this.message = message || "Invalid argument.";
};
dh.invalidArgument.prototype = new Error();
dh.invalidArgument.prototype.constructor = dh.invalidArgument;

dh.nonmatchingCurves = function(message){
    this.name = "nCrypt.exception.types.shared.dh.nonmatchingCurves";
    this.message = message || "Curves don't match. "
                              "(To derive a shared secret using DH, both "+
                              "keypairs must use the same curve.)";
};
dh.nonmatchingCurves.prototype = new Error();
dh.nonmatchingCurves.prototype.constructor = dh.nonmatchingCurves;

dh.derivationFailed = function(message){
    this.name = "nCrypt.exception.types.shared.dh.derivationFailed";
    this.message = message || "Derivation of shared secret failed.";
};
dh.derivationFailed.prototype = new Error();
dh.derivationFailed.prototype.constructor = dh.derivationFailed;

module.exports = dh;
