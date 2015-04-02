(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisScanner = typeof require === 'function' ? require('../../rarefied-redis.js').RedisScanner : window.RedisScanner;
    var chai = typeof require === 'function' ? require('chai') : window.chai;
    var Q = typeof require === 'function' ? require('q') : window.Q;
    chai.config.includeStack = true;
    var expect = chai.expect;

    function randkey(prefix) {
        if (!prefix) {
            prefix = 'k';
        }
        return prefix + Math.random();
    }

    var rc = redisClient.toPromiseStyle(Q.defer);

    before(function (done) {
        rc
            .flushdb()
            .then(function () {
                done();
            })
            .fail(function (err) {
                done(err);
            })
            .done();
    });

    describe('keyscanner', function () {
        xit('should keyscanner');
    });

    describe('lscanner', function () {
        it('should error for a key that is not a list', function (done) {
            var k = randkey();
            var v = 'v';
            var scanner = RedisScanner.lscanner(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return scanner.scan(k, function (range) {
                        expect(true).to.be.false;
                    });
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should scan through a list', function (done) {
            var k = randkey();
            var vs = [];
            for (var idx = 0; idx < 37; idx += 1) {
                vs.push(idx.toString());
            }
            var scanner = RedisScanner.lscanner(rc).toPromiseStyle(Q.defer);
            var scanned = [];
            rc
                .rpush
                .apply(rc, [k].concat(vs))
                .then(function (reply) {
                    expect(reply).to.equal(vs.length);
                    return scanner.scan(k, function (range) {
                        scanned = scanned.concat(range);
                    })
                })
                .then(function () {
                    expect(scanned).to.have.lengthOf(vs.length);
                    vs.forEach(function (v) {
                        expect(scanned.indexOf(v)).to.equal(parseInt(v, 10));
                    });
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(vs.length);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('sscanner', function () {
        it('should error for a key that is not a set', function (done) {
            var k = randkey();
            var v = 'v';
            var scanner = RedisScanner.sscanner(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return scanner.scan(k, function (range) {
                        expect(true).to.be.false;
                    });
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        xit('should scan through a set', function (done) {
            var k = randkey();
            var vs = [];
            for (var idx = 0; idx < 37; idx += 1) {
                vs.push(idx.toString());
            }
            var scanner = RedisScanner.sscanner(rc).toPromiseStyle(Q.defer);
            var scanned = [];
            rc
                .sadd
                .apply(rc, [k].concat(vs))
                .then(function (reply) {
                    expect(reply).to.equal(vs.length);
                    return scanner.scan(k, function (range) {
                        scanned = scanned.concat(range);
                    })
                })
                .then(function () {
                    expect(scanned).to.have.lengthOf(vs.length);
                    vs.forEach(function (v) {
                        expect(scanned.indexOf(v)).to.equal(parseInt(v, 10));
                    });
                    return rc.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(vs.length);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

}).call(this);
