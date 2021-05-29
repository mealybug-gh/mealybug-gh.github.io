/**
 * @namespace randomCollector
 * */
var collector = {};

var _evt = require('./event/event.js');
var _pos = require('./position/position.js');
    _pos = _pos({ 'evt': _evt });

var _source = {};
    _source.user = require('./random/source/user.js');
    _source.user = _source.user({ 'pos': _pos });
    _source.machine = require('./random/source/machine.js');
    _source.machine = _source.machine({});

collector.random = require('./random/random.js');
collector.random = collector.random({'source': _source});

module.exports = collector;
