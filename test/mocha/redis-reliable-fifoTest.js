(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableFifo = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableFifo : window.RedisReliableFifo;
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
    /*
    describe('produce', function () {
        it('should reliably produce one element', function (done) {
            var k = randkey();
            var v = 'v';
            var fifo = (new RedisReliableFifo(rc, k, 10)).toPromiseStyle(Q.defer);
            fifo
                .produce(v)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lindex(k, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably produce multiple elements', function (done) {
            var k = randkey();
            var vs = [];
            var fifo = (new RedisReliableFifo(rc, k, 10)).toPromiseStyle(Q.defer);
            for (var idx = 0; idx < 10; idx += 1) {
                vs.push(idx.toString())
            }
            fifo
                .produce
                .apply(fifo, vs)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(vs.length);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(vs.length);
                    reply.forEach(function (v) {
                        expect(vs.indexOf(v)).to.be.above(-1);
                    });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should limit the fifo length', function (done) {
            var k = randkey();
            var vs = [];
            var fifo = (new RedisReliableFifo(rc, k, 10)).toPromiseStyle(Q.defer);
            for (var idx = 0; idx < 20; idx += 1) {
                vs.push(idx.toString())
            }
            fifo
                .produce
                .apply(fifo, vs)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(10);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(10);
                    reply.forEach(function (v) {
                        expect(vs.indexOf(v)).to.be.above(-1);
                    });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should be aliased by push', function (done) {
            var k = randkey();
            var vs = [];
            var fifo = (new RedisReliableFifo(rc, k, 10)).toPromiseStyle(Q.defer);
            for (var idx = 0; idx < 20; idx += 1) {
                vs.push(idx.toString())
            }
            fifo
                .push
                .apply(fifo, vs)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(10);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(10);
                    reply.forEach(function (v) {
                        expect(vs.indexOf(v)).to.be.above(-1);
                    });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('consume', function () {
        it('should reliably consume & ack an element', function (done) {
            var k = randkey();
            var vs = [];
            var fifo = (new RedisReliableFifo(rc, k, 10)).toPromiseStyle(Q.defer);
            for (var idx = 0; idx < 10; idx += 1) {
                vs.push(idx.toString())
            }
            fifo
                .push
                .apply(fifo, vs)
                .then(function () {
                    return fifo.consume();
                })
                .then(function (reply) {
                    expect(reply).to.equal('0');
                    return fifo.ack(reply);
                })
                .then(function (reply) {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(vs.length - 1);
                    return rc.llen(k + '-in-process');
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably consume & fail an element', function (done) {
        });
        xit('should be aliased by pop');
    });
    */
}).call(this);