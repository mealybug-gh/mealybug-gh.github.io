var crypto = require('crypto')
console.log(typeof crypto);
console.log(crypto);
console.log(' ');
var nc=require('../../bin/ncrypt.js'); 
var rc = nc.dep.randomCollector; 
var buf=new Uint32Array(128); 
var r = rc.random.collect('machine', buf, 
    function(rbuf){ 
        console.log("CALLED."); 
        console.log(typeof rbuf); 
        console.log(rbuf.length); 
    }
);
console.log(r);
