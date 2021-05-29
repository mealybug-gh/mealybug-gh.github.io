
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
 * @namespace nCrypt.exception
 * */
var exception = {};

exception.Create = function(exp, name, msg){
    if(!name) name = null;
    if(!msg) msg = null;
    try{
        throw new exp(name, msg);
    }catch(e){ return e; }
};

exception.global = require('./global/global.js');
exception.init = require('./init/init.js');
exception.enc = require('./encoding/encoding.js');
exception.hash = require('./hash/hash.js');
exception.sym = require('./sym/sym.js');
exception.types = require('./types/types.js');
exception.asym = require('./asym/asym.js');

module.exports = exception;
