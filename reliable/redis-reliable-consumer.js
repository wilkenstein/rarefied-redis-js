/* jshint undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, require:true */

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
    var RedisReliableMover = typeof require === 'function' ? require('../reliable/redis-reliable-mover.js') : root.RedisReliableMover;
    var RedisReliableDeleter = typeof require === 'function' ? require('../reliable/redis-reliable-deleter.js') : root.RedisReliableDeleter;

    function RedisReliableConsumer(client, mover, deleter) {
        this.client = client;
        this.mover = mover;
        this.deleter = deleter;
        return this;
    }

    RedisReliableConsumer.prototype.consume = function (key, inprocesskey, element, callback) {
        this
            .mover
            .move
            .apply(this.mover, arguments);
        return this;
    };

    RedisReliableConsumer.prototype.ack = function (key, inprocesskey, element, callback) {
        var g = gather(this.ack).apply(null, arguments);
        callback = function (err) {
            if (err) {
                return g.callback(err);
            }
            g.callback(null, element);
        };
        this
            .deleter
            .del
            .apply(this.deleter, [inprocesskey].concat(g.list).concat([callback]));
        return this;
    };

    RedisReliableConsumer.prototype.fail = function (key, inprocesskey, element, callback) {
        var args = [inprocesskey, key].concat(Array.prototype.slice.call(arguments).slice(3));
        this
            .mover
            .move
            .apply(this.mover, args);
        return this;
    };

    var consumers = [
        ['strconsumer', 'strmover', 'strdeleter'],
        ['lconsumer', 'lmover', 'ldeleter'],
        ['sconsumer', 'smover', 'sdeleter'],
        ['zconsumer', 'zmover', 'zdeleter'],
        ['hconsumer', 'hmover', 'hdeleter']
    ];
    consumers.forEach(function (consumer) {
        RedisReliableConsumer[consumer[0]] = function (client) {
            return new RedisReliableConsumer(client, RedisReliableMover[consumer[1]](client), RedisReliableDeleter[consumer[2]](client));
        };
    });

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisReliableConsumer;
        }
        exports.RedisReliableConsumer = RedisReliableConsumer;
    } 
    else {
        root.RedisReliableConsumer = RedisReliableConsumer;
    }

}).call(this);
