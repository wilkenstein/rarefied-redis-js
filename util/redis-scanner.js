/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, require:false */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    var gather = typeof require === 'function' ? require('../util/redis-util.js').gather : root.redis_util.gather;

    function typeCheck(client, key, type, callback) {
        if (type === null) {
            return callback();
        }
        client.type(key, function (err, t) {
            if (err) {
                return callback(err);
            }
            if (t !== type && t !== 'none') {
                return callback(new Error('WRONGTYPE Operation against a key holding the wrong kind of value'));
            }
            callback();
        });
    }

    function scanGatherer(f) {
        return function () {
            var g = gather(f).apply(null, arguments);
            var options = {};
            g
                .list
                .slice(1)
                .forEach(function (option, index) {
                    if (option === 'count') {
                        options.count = g.list[index + 1];
                    }
                    if (option === 'match') {
                        options.match = g.list[index + 1];
                    }
                });
            options.done = g.callback;
            return options;
        };
    }

    function RedisScanner(client, type, ranger) {
        this.client = client;
        this.type = type;
        this.ranger = ranger;
        return this;
    }

    RedisScanner.prototype.scan = function (key, forEach, done) {
        var client = this.client;
        var ranger = this.ranger;
        var g = gather(this.scan).apply(null, arguments);
        done = g.callback;
        typeCheck(client, key, this.type, function (err) {
            if (err) {
                return done(err);
            }
            ranger.apply(ranger, [client, key, forEach].concat(g.list.slice(1)).concat([done]));
        });
    };

    RedisScanner.keyscanner = function (client) {
        function ranger(client, key, forEach, done) {
            var options = scanGatherer(ranger).apply(null, arguments);
            var scanArgs = [];
            if (options.count) {
                scanArgs.push('count', options.count);
            }
            if (options.match) {
                scanArgs.push('match', options.match);
            }
            done = options.done;
            function scan(cursor) {
                var callback = function (err, reply) {
                    if (err) {
                        return done(err);
                    }
                    if (!reply[1].length) {
                        return done();
                    }
                    forEach(reply[1]);
                    scan(reply[0]);
                };
                client.scan.apply(client, [cursor].concat(scanArgs).concat([callback]));
            }
            scan(0);
        }
        return new RedisScanner(client, null, ranger);
    };

    RedisScanner.lscanner = function (client) {
        function lranger(client, key, forEach, done) {
            var options = scanGatherer(lranger).apply(null, arguments);
            var count = options.count;
            done = options.done;
            if (!count) {
                count = 10;
            }
            function lrange(index) {
                client.lrange(key, index, index + count, function (err, range) {
                    if (err) {
                        return done(err);
                    }
                    if (!range.length) {
                        return done();
                    }
                    forEach(range);
                    lrange(index + range.length);
                });
            }
            lrange(0);
        }
        return new RedisScanner(client, 'list', lranger);
    };

    RedisScanner.sscanner = function (client) {
        function sranger(client, key, forEach, done) {
            var options = scanGatherer(sranger).apply(null, arguments);
            var scanArgs = [];
            if (options.count) {
                scanArgs.push('count', options.count);
            }
            if (options.match) {
                scanArgs.push('match', options.match);
            }
            done = options.done;
            function sscan(cursor) {
                var callback = function (err, reply) {
                    if (err) {
                        return done(err);
                    }
                    if (!reply[1].length) {
                        return done();
                    }
                    forEach(reply[1]);
                    sscan(reply[0]);
                };
                client.sscan.apply(client, [key, cursor].concat(scanArgs).concat([callback]));
            }
            sscan(0);
        }
        return new RedisScanner(client, 'set', sranger);
    };

    // Export the scanner object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `RedisScanner` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisScanner;
        }
        exports.RedisScanner = RedisScanner;
    } 
    else {
        root.RedisScanner = RedisScanner;
    }

}).call(this);
