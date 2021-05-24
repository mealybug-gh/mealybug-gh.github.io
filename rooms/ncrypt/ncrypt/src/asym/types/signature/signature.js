
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

module.exports = (function(ncrypt, deptypes){

var tbasic = deptypes.basic;
var tkey = deptypes.key;

/**
 * @namespace nCrypt.asym.types.signature
 * */
var  signature = {};
var _signature = {};

signature.ecdsa = require('./types/ecdsa.js');
signature.ecdsa = signature.ecdsa(ncrypt, { 'basic': tbasic, 'key': tkey });

return signature; });
