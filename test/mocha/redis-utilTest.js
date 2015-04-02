(function() {
    var redis_util = typeof require === 'function' ? require('../../rarefied-redis.js').redis_util : window.redis_util;
    var chai = typeof require === 'function' ? require('chai') : window.chai;
    chai.config.includeStack = true;
    var expect = chai.expect;

    describe('checkFunction', function () {
        it('should return the function if it is a function', function (done) {
            var f = function (err) {
                expect(err).to.not.exist;
                done();
            };
            redis_util.checkFunction(f)(null);
        });
        it('should return a function that does nothing if it is not a function', function (done) {
            var str = 'string!';
            var f = redis_util.checkFunction(str);
            expect(typeof f).to.equal('function');
            expect(f()).to.be.undefined;
            done();
        });
    });

    describe('exists', function () {
        it('should return true if the variable exists', function () {
            var v = 'v';
            var f = function () {};
            var o = {};
            var l = [];
            expect(redis_util.exists(v)).to.be.true;
            expect(redis_util.exists(f)).to.be.true;
            expect(redis_util.exists(o)).to.be.true;
            expect(redis_util.exists(l)).to.be.true;
        });
        it('should return false if the variable does not exist', function () {
            var v;
            var n = null;
            expect(redis_util.exists(v)).to.be.false;
            expect(redis_util.exists(undefined)).to.be.false;
            expect(redis_util.exists(n)).to.be.false;
            expect(redis_util.exists(null)).to.be.false;
        });
    });

    describe('gather', function () {
        it('should gather the arguments into a list and a callback', function (done) {
            var f = function (v1, cb) {};
            var v1 = 'v1';
            var v2 = function () {};
            var v3 = [];
            var g = redis_util.gather(f)(v1, v2, v3, function () {
                done();
            });
            expect(g.list).to.have.lengthOf(3);
            expect(g.list[0]).to.equal(v1);
            expect(g.list[1]).to.equal(v2);
            expect(g.list[2]).to.equal(v3);
            expect(g.callback).to.exist;
            g.callback();
        });
        it('should create a callback if none is passed', function () {
            var f = function (v1, cb) {};
            var v1 = 'v1', v2 = [], v3 = {};
            var g = redis_util.gather(f)(v1, v2, v3);
            expect(g.list).to.have.lengthOf(3);
            expect(g.callback).to.exist;
            expect(g.callback()).to.be.undefined;
        });
    });

    describe('asyncForEach', function () {
        it('should process each element and call done at the end', function (done) {
            var arr = [1, 2, 3];
            var once = false;
            redis_util.asyncForEach(arr, function (elem, cb) {
                expect(arr.indexOf(elem)).to.be.above(-1);
                setTimeout(function () { cb(null); }, 0);
            }, function (err) {
                expect(once).to.be.false;
                expect(err).to.not.exist;
                once = true;
                setTimeout(done, 100); // Make sure done isn't called twice.
            });
        });
        it('should return an error if the function calls back with an err', function (done) {
            var arr = [1, 2, 3];
            var once = false;
            redis_util.asyncForEach(arr, function (elem, cb) {
                if (elem === 2) {
                    return setTimeout(function () { cb(new Error('ERR')) }, 0);
                }
                return setTimeout(function () { cb(null) }, 0);
            }, function (err) {
                expect(once).to.be.false;
                expect(err).to.exist;
                expect(err.message).to.equal('ERR');
                once = true;
                setTimeout(done, 100); // Make sure done isn't called twice.
            });
        });
    });

}).call(this);