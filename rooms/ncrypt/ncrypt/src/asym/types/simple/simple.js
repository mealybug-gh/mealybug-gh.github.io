
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
var tshared = deptypes.shared;

/**
 * @namespace nCrypt.asym.types.simple
 * */
var  simple = {};
var _simple = {};

simple.keyset = require('./types/keyset.js');
simple.keyset = simple.keyset(ncrypt, { 'basic': tbasic, 'key': tkey });

simple.message = require('./message/message.js');
simple.message = simple.message(ncrypt, { 
    'basic': tbasic, 
    'key': tkey,
    'shared': tshared,
    'keyset': simple.keyset
});

return simple; });
