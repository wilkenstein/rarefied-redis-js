/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    var redis_util = {};

    /**
     * Check that a function is actually a function. If it is not, return a function that
     * does nothing.
     *
     * @memberof! RarefiedRedis.Util
     * @param {Function} f The function to check
     */
    redis_util.checkFunction = function (f) {
        if (!f || typeof f !== 'function') {
            return function () {};
        }
        return f;
    };

    /**
     * Does the given variable exist? Existence here means that the variable is not
     * undefined and does not equal null.
     *
     * @memberof! RarefiedRedis.Util
     * @param {any} e Variable to check
     */
    redis_util.exists = function (e) {
        return typeof e !== 'undefined' && e !== null;
    };

    /**
     * Gather a function's arguments into a list of arguments and a callback.
     * It is assumed that the callback is the last parameter to the function.
     *
     * @memberof! RarefiedRedis.Util
     */
    redis_util.gather = function (f, e) {
        var end = f.length;
        if (e) {
            end = e;
        }
        return function () {
            var idx, len = arguments.length;
            var callback;
            var list = [];
            if (len >= end) {
                for (idx = len - 1; idx >= end - 1; idx -= 1) {
                    if (typeof arguments[idx] === "function" && !callback) {
                        callback = arguments[idx];
                    }
                    else if (redis_util.exists(arguments[idx])) {
                        list.unshift(arguments[idx]);
                    }
                }
            }
            if ((end - 2) >= 0) {
                list.unshift(arguments[end - 2]);
            }
            return {
                callback: redis_util.checkFunction(callback),
                list: list
            };
        };
    };

    /**
     * Apply forEach on the array to a function that takes a callback as 
     * a 2nd paramter. Very similar to async's each.
     *
     * @memberof! RarefiedRedis.Util
     * @param {Array} arr The array to apply forEach to.
     * @param {Function} f Function that takes in (element, callback), and calls callback with (err).
     * @param {Function} done What to call when we're done. Called with (err).
     */
    redis_util.asyncForEach = function (arr, f, done) {
        var processed = 0;
        var length = arr.length;
        if (length === 0) {
            return done(null);
        }
        arr.forEach(function (elem) {
            f(elem, function (err) {
                if (err) {
                    return done(err);
                }
                processed += 1;
                if (processed === length) {
                    return done(null);
                }
            });
        });
    };

    redis_util.to2sComplement = function (number, length) {
        var tc, positive;
        if (typeof number !== 'number') {
            number = parseInt(number, 10);
        }
        if (isNaN(number)) {
            return null;
        }
        if (number < 0) {
            tc = (~Math.abs(number) + 1 >>> 0).toString(2);
        }
        else {
            tc = '0' + (number >>> 0).toString(2);
        }
        if (length) {
            positive = tc.charAt(0) === '0';
            while (tc.length < length) {
                if (positive) {
                    tc = '0' + tc;
                }
                else {
                    tc = '1' + tc;
                }
            }
            while (tc.length > length) {
                if (positive && tc.charAt(1) === '0') {
                    tc = tc.substr(1);
                }
                else if (positive && tc.charAt(1) !== '0') {
                    break;
                }
                else if (!positive && tc.charAt(1) === '1') {
                    tc = tc.substr(1);
                }
                else if (!positive && tc.charAt(1) !== '1') {
                    break;
                }
            }
            if (tc.length !== length) {
                return null;
            }
        }
        return tc;
    };

    redis_util.to2sComplementAsBytes = function (number, length) {
        var tc = redis_util.to2sComplement(number, length);
        var string = '', b = '';
        var idx, len;
        if (tc === null) {
            return null;
        }
        len = tc.length;
        for (idx = len - 1; idx >= 0; idx -= 1) {
            b = tc.charAt(idx) + b;
            if (b.length === 8) {
                string += String.fromCharCode(parseInt(b, 2));
                b = '';
            }
        }
        if (b.length > 0) {
            string += String.fromCharCode(parseInt(b, 2));
        }
        return string;
    };

    redis_util.from2sComplement = function (string) {
        var positive;
        if (typeof string !== 'string') {
            return null;
        }
        positive = string.charAt(0) === '0';
        if (positive) {
            return parseInt(string, 2);
        }
        return parseInt(string, 2) << 0;
    };

    redis_util.from2sComplementAsBytes = function (string) {
        var tc, idx, len, bin;
        if (typeof string !== 'string') {
            return null;
        }
        tc = '';
        len = string.length;
        for (idx = len - 1; idx >= 0; idx -= 1) {
            bin = string.charCodeAt(idx).toString(2);
            if (idx < len - 1) {
                while (bin.length < 8) {
                    bin = '0' + bin;
                }
            }
            tc += bin;
        }
        return redis_util.from2sComplement(tc);
    };

    // Export the uuid object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = redis_util;
        }
        exports.redis_util = redis_util;
    } 
    else {
        root.redis_util = redis_util;
    }


}).call(this);
