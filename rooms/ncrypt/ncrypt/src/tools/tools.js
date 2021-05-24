
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
 * @namespace nCrypt.tools
 * */
var  tools = {};
var _tools = {};

/**
 * @namespace nCrypt.tools.proto
 * */
tools.proto = {};
_tools.proto = {};

/**
 * @namespace nCrypt.tools.proto.jsonobj
 * */
tools.proto.jsonobj = {};
_tools.proto.jsonobj = {};

/**
 * For several objects, get the key-value-pairs which are identical for each
 * of these objects.
 * @name identical
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object[]} objects - Array of simple JSON objects.
 * @returns {object} Simple object containing the identical key value pairs.
 * */
tools.proto.jsonobj.identical = function(objects){
    var args = {
        "objects": objects
    };
    return _tools.proto.jsonobj.identical.process(args);
};
_tools.proto.jsonobj.identical = {};
_tools.proto.jsonobj.identical.process = function(args){
    var result = {};
    try{
        result = _tools.proto.jsonobj.identical.run(args);
    }catch(e){}
    return result;
};
_tools.proto.jsonobj.identical.run = function(args){
    var objects = args.objects;
    var res = {};
    var common_keys = tools.proto.jsonobj.common(objects);
    for(var i=0; i<common_keys.length; i++){
        var key = common_keys[i];
        var key_val = objects[0][key];
        var key_val_common = true;
        if( (typeof key_val).toLowerCase()!=="undefined" ){
            for(var j=0; j<objects.length; j++){
                var obj=objects[j];
                var obj_key_val = obj[key];
                if( (typeof obj_key_val).toLowerCase()==="undefined" ||
                    obj_key_val!==key_val ){
                    key_val_common = false;
                    break;
                }
            }
        }else{ key_val_common = false; }
        if(key_val_common===true){
            res[key] = key_val;
        }
    }
    return res;
};

/**
 * For several objects, get the keys which are present in all of the objects.
 * @name common
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object[]} objects - Array of simple JSON objects.
 * @returns {string[]} Array of all common keys.
 * */
tools.proto.jsonobj.common = function(objects){
    var keys = [];
    for(var i=0; i<objects.length; i++){
        var obj = objects[i];
        var obj_keys = tools.proto.jsonobj.keys(obj);
        keys.push(obj_keys);
    }
    return tools.proto.arr.common(keys);
};

/**
 * Get all the keys in an object.
 * @name keys
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param {object} obj - Simple object to get the keys of.
 * @returns {string[]} Array of the keys of this object.
 * */
tools.proto.jsonobj.keys = function(obj){
    var res=[];
    for(var k in obj){
        if(res.indexOf(k) < 0){
            res.push(k);
        }
    }
    return res;
};

/**
 * Merge several JSON objects into one. Please note that if a property has been
 * defined by one of the objects, it won't be overwritten anymore. If you want
 * values to be overwritten, pass @overwrite true.
 * @name merge
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param  {object[]} objects - Array of simple JSON objects.
 * @param  {boolean} overwrite - Overwrite existing values.
 * @returns {object}
 * */
tools.proto.jsonobj.merge = function(objects, overwrite){
    var res = {};
    for(var i=0; i<objects.length; i++){
        var obj = objects[i];
        for(var k in obj){
            if( (typeof res[k]).toLowerCase() === "undefined" || 
                overwrite===true ){
                res[k] = obj[k];
            }
        }
    }
    return res;
};

/**
 * Remove properties from an object. This function will not affect the original
 * object but rather clone the object without the specified keys. (To affect 
 * the original object, use delete like delete object.key.)
 * @name remove
 * @function
 * @memberof nCrypt.tools.proto.jsonobj
 * @param  {object} obj - Object to remove keys from.
 * @param  {string[]} keys - Array of keys to remove.
 * @returns {object} Cloned object without the removed keys.
 * */
tools.proto.jsonobj.remove = function(obj, keys){
    var res = {};
    for(var k in obj){
        if(keys.indexOf(k)<0){
            res[k] = obj[k];
        }
    }
    return res;
};

/**
 * @namespace nCrypt.tools.proto.arr
 * */
tools.proto.arr = {};

/**
 * Get the common elements of several arrays, and return them in one array.
 * @name common
 * @function
 * @memberof nCrypt.tools.proto.arr
 * @param  {object[]} arrays - Array of arrays to get the common elements 
 *                              between all arrays from.
 * @returns {object[]} Array of all common elements.
 * */
tools.proto.arr.common = function(arrays){
    
    /*
     * functions adapted from
     * https://stackoverflow.com/questions/11076067/finding-matches-between-multiple-javascript-arrays
     * */
    
    if( (typeof Array.prototype.reduce).toLowerCase() === "function" ){
        var result = arrays.shift().reduce(function(res, v) {
            if (res.indexOf(v) === -1 && arrays.every(function(a) {
                return a.indexOf(v) !== -1;
            })) res.push(v);
            return res;
        }, []);
        return result;
    }
    
    var i, common,
    L= arrays.length, min= Infinity;
    while(L){
        if(arrays[--L].length<min){
            min= arrays[L].length;
            i= L;
        }
    }
    common= arrays.splice(i, 1)[0];
    return common.filter(function(itm, indx){
        if(common.indexOf(itm)== indx){
            return arrays.every(function(arr){
                return arr.indexOf(itm)!= -1;
            });
        }
    });
};

/**
 * @namespace nCrypt.tools.proto.str
 * */
tools.proto.str = {};

/**
 * Replaces all occurences of @find with @replace.
 * @name replaceAll
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param   {string}   str     -  Original string.
 * @param   {string}   find    -  String to replace.
 * @param   {string}   replace -  String to replace @find with.
 * @returns  {string}
 * */
tools.proto.str.replaceAll = function(str, find, replace){
    return str.replace(new RegExp(find, 'g'), replace);
};

/**
 * Checks if a string starts with another.
 * @name startsWith
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str     -  Original string.
 * @param  {string} start   -  String to check if @str starts with.
 * @returns {string}
 * */
tools.proto.str.startsWith = function (str, start){
    return str.indexOf(start) == 0;
};

/**
 * Trim a given String, i.e. remove whitespaces at the beginning and end.
 * @name trim
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str   -  Original string.
 * @returns {string}
 * */
tools.proto.str.trim = function (str){
    str = str.replace(/^\s\s*/, ''),
    ws = /\s/,
    i = str.length;
    while (ws.test(str.charAt(--i)));
    str = str.slice(0, i + 1);
    str = str.replace(/^\s+|\s+$/g, '');
    return str;
};

/**
 * Trim and remove multiple whitespaces from a string.
 * @name allTrim
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str     -  Original string.
 * @returns {string}
 * */
tools.proto.str.allTrim = function(str){
    var str = str.replace(/\s+/g,' ');
    str = str.replace(/^\s+|\s+$/,'');
    str = str.replace(/^\s+|\s+$/g, '');
    return str;
};

/**
 * Remove whitespace characters from string.
 * @name removeWhitespace
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeWhitespace = function(str){
    return str.replace(/\s+/g, '');
};

/**
 * Remove linebreak characters from string.
 * @name removeLinebreaks
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeLinebreaks = function(str){
    return str.replace(/(\r\n|\n|\r)/gm,"");
};

/**
 * Remove whitespace and linebreak characters from string.
 * @name removeWhitespaceAndLinebreaks
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string} str    -   Original string.
 * @returns {string}
 * */
tools.proto.str.removeWhitespaceAndLinebreaks = function(str){
    var str = str.replace(/\s+/g, ' ');
    str = str.replace(/(\r\n|\n|\r)/gm,"");
    return str;
};

/**
 * Returns a string between two strings. Checks for the first 
 * occurence of @start an the next occurence of @end
 * after this.
 * @name between
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param   {string} str     -  Original string.
 * @param   {string} start
 * @param   {string} end
 * @returns  {string}
 * */
tools.proto.str.between = function(str, start, end){
    var pos1 = str.indexOf(start);
    var used = str.substr(pos1);
    var pos2 = used.indexOf(end);
    pos2 = pos1+pos2;
    if(pos1!=-1 && pos2!=-1){
        pos1 = pos1 + start.length;
        var pos3 = str.length - (str.length-pos2) - pos1;
        return str.substr(pos1, pos3);
    }
    return null;
};

/**
 * Chunk a string in pieces of the specified length.
 * @name chunk
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @param  {number}        length -  (Max.) length of the chunks.
 * @returns {string[]}
 * */
tools.proto.str.chunk = function(str, len) {
    var start = 0; 
    var end = len;
    var toceil = str.length/len;
    var upto = Math.ceil(toceil);
    var res = [];
    for(var i=0; i<upto; i++){
        var cur_str = str.slice(start, end);
        res.push(cur_str);
        start = start+len;
        end = end+len;
    }
    return res;
};

/**
 * Reverse a given string.
 * @name reverse
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @returns {string}
 * */
tools.proto.str.reverse = function(str){
    var s = str;
    /* should be the most performant string reverse,
     * see
     * http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
     * */
    var o = '';
    for (var i = s.length - 1; i >= 0; i--)
    o += s[i];
    return o;
};

/**
 * Shuffle a string randomly. Please note: This is not cryptographically random.
 * Do not use if security depends on the string really being randomly shuffled.
 * @name shuffle
 * @function
 * @memberof nCrypt.tools.proto.str
 * @param  {string}         str   -   Original string.
 * @returns {string}
 * */
tools.proto.str.shuffle = function(str){
    
    /*
     * str_shuffle like in PHP, from
     * http://phpjs.org/functions/str_shuffle/
     * */
    if (str == null || str.length==0) {
        return '';
    }
    str += '';
    var newStr = '',
    rand, i = str.length;
    while (i) {
        rand = Math.floor(Math.random() * i);
        newStr += str.charAt(rand);
        str = str.substring(0, rand) + str.substr(rand + 1);
        i--;
    }
    return newStr;
};

return tools; });
