
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

module.exports = (function(ncrypt){

/**
 * @namespace nCrypt.asym.types
 * */
var  types = {};
var _types = {};

types.basic = require('./basic/basic.js');
types.basic = types.basic(ncrypt);

types.key = require('./key/key.js');
types.key = types.key(ncrypt, { 'basic': types.basic });

types.shared = require('./shared/shared.js');
types.shared = types.shared(ncrypt, { 'basic': types.basic, 'key': types.key });

types.signature = require('./signature/signature.js');
types.signature = types.signature(ncrypt, 
                            { 'basic': types.basic, 'key': types.key });

types.simple = require('./simple/simple.js');
types.simple = types.simple(ncrypt, { 
    'basic': types.basic, 
    'key': types.key,
    'shared': types.shared
});

return types; });
