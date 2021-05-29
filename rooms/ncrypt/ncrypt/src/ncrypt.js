
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
 * @namespace nCrypt
 * */

var dep = require('./dep.js');
var exception = require('./exception/exception.js');
var tools = require('./tools/tools.js');
    tools = tools({ "dep": dep });
var random = require('./random/random.js');
    random = random({ "dep": dep,
                      "exception": exception });
var init = require('./init/init.js');
    init = init({ "dep": dep,
                  "exception": exception,
                  "random": random });
var enc = require('./encoding/encoding.js');
    enc = enc({ "dep": dep,
          "exception": exception });
var hash = require('./hash/hash.js');
    hash = hash({ "dep": dep,
          "exception": exception,
          "enc": enc });
var sym = require('./sym/sym.js');
    sym = sym({ "dep": dep,
          "exception": exception,
          "tools": tools,
          "random": random,
          "enc": enc,
          "hash": hash });
var asym = require('./asym/asym.js');
    asym = asym({ "dep": dep,
           "exception": exception,
           "tools": tools,
           "random": random,
           "enc": enc,
           "hash": hash,
           "sym": sym });

var nCrypt = {};
nCrypt.dep = dep;
nCrypt.exception = exception;
nCrypt.tools = tools;
nCrypt.random = random;
nCrypt.init = init;
nCrypt.enc = enc;
nCrypt.hash = hash;
nCrypt.sym = sym;
nCrypt.asym = asym;

module.exports = nCrypt;
