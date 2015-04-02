/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, require:false, clearTimeout:false, setTimeout:false */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    var gather = typeof require === 'function' ? require('./redis-util.js').gather : root.redis_util.gather;
    var each = typeof require === 'function' ? require('./redis-util.js').asyncForEach : root.redis_util.asyncForEach;
    var uuidv4 = typeof require === 'function' ? require('./redis-uuid.js').redis_uuid.v4 : root.redis_uuid.v4;
    var RedisScanner = typeof require === 'function' ? require('./redis-scanner.js').RedisScanner : root.RedisScanner;

    function RedisExpirer(client, listkey, separator) {
        this.client = client;
        this.listkey = listkey;
        this.separator = separator || ';';
        this.expiries = {};
        this.scanner = RedisScanner.lscanner(this.client);
        return this;
    }

    RedisExpirer.prototype.expire = function (onExpired, key, timeout, element, callback) {
        var g = gather(this.expire).apply(null, arguments);
        var that = this;
        callback = g.callback;
        if (!(key in this.expiries)) {
            this.expiries[key] = {};
        }
        each(g.list, function (elem, iter) {
            var id = uuidv4();
            var lelem = id + that.separator + key + that.separator + element;
            if (key in that.expiries && elem in that.expiries[key]) {
                clearTimeout(that.expiries[key][elem]);
            }
            that
                .client
                .multi()
                .setex(id, timeout, element)
                .lpush(that.listkey, lelem)
                .exec(function (err) {
                    if (err) {
                        iter(err);
                    }
                    that.expiries[key][elem] = setTimeout(function () {
                        that.client.exists(id, function (err, exists) {
                            if (err) {
                                return onExpired(err, key, elem);
                            }
                            if (!exists) {
                                that.client.lrem(that.listkey, 1, lelem);
                                delete that.expiries[key][elem];
                                return onExpired(null, key, elem);
                            }
                        });
                    }, timeout*1000 + 50);
                    iter();
                });
        }, callback);
        return this;
    };

    RedisExpirer.prototype.persist = function (key, element, callback) {
        var that = this;
        this.scanner.scan(this.listkey, function (range) {
            range.forEach(function (idkeyelement) {
                var split = idkeyelement.split(that.separator);
                var id = split[0];
                var key = split[1];
                var element = split[2];
                if (key === key && element === element) {
                    that
                        .client
                        .multi()
                        .del(id)
                        .lrem(that.listkey, 1, idkeyelement)
                        .exec();
                    clearTimeout(that.expiries[key][element]);
                    delete that.expiries[key][element];
                }
            });
        }, callback);
        return this;
    };

    RedisExpirer.prototype.exists = function (key, element, callback) {
        var that = this;
        this.scanner.scan(this.listkey, function (range) {
            range.forEach(function (idkeyelement) {
                var split = idkeyelement.split(that.separator);
                var key = split[1];
                var element = split[2];
                if (key === key && element === element) {
                    return callback(null, 1);
                }
            });
        }, function (err) {
            callback(err, 0);
        });
        return this;
    };

    RedisExpirer.prototype.check = function (onExpired, callback) {
        var that = this;
        this.scanner.scan(this.listkey, function (range) {
            range.forEach(function (idkeyelement) {
                var split = idkeyelement.split(that.separator);
                var id = split[0];
                var key = split[1];
                var element = split[2];
                that.client.exists(id, function (err, exists) {
                    if (err) {
                        return onExpired(err, key, element);
                    }
                    if (!exists) {
                        that.client.lrem(that.listkey, 1, idkeyelement);
                        return onExpired(null, key, element);
                    }
                });
            });
        }, callback);
        return this;
    };

    // Export the expirer object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `RedisExpirer` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisExpirer;
        }
        exports.RedisExpirer = RedisExpirer;
    } 
    else {
        root.RedisExpirer = RedisExpirer;
    }

}).call(this);
