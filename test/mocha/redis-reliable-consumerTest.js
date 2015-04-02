(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableConsumer = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableConsumer : window.RedisReliableConsumer;
    var RedisReliableDeleter = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableDeleter : window.RedisReliableDeleter;
    var RedisReliableMover = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableMover : window.RedisReliableMover;
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
    
    describe('consume', function () {
        it('should do nothing for a non-existent key', function (done) {
            var k = randkey(), ik = randkey();
            var v = 'v';
            var consumer = RedisReliableConsumer.strconsumer(rc).toPromiseStyle(Q.defer);
            consumer
                .consume(k, ik)
                .then(function (consumed) {
                    expect(consumed).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not consume if the shadow structure is not the same type as the original structure', function (done) {
            var k = randkey(), ik = randkey();
            var v = 'v';
            var consumer = RedisReliableConsumer.strconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(ik, v)
                .then(function () {
                    return rc.set(k, v);
                })
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (consumed) {
                    expect(consumed).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should reliably consume a string element', function (done) {
            var k = randkey(), ik = randkey();
            var v = 'v';
            var consumer = RedisReliableConsumer.strconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (consumed) {
                    expect(consumed).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.get(ik);
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
        it('should reliably consume a list index', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.lconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.lindex(ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.consume(k, ik, 0, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.lindex(ik, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume a `random` list element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.lconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.lindex(ik, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.lindex(ik, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume a set element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.sconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.exists(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.scard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(k, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.scard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return consumer.consume(k, ik, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.sismember(ik, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(k, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.scard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume a random set element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.sconsumer(rc).toPromiseStyle(Q.defer);
            var popped;
            rc
                .sadd(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect([v1, v2, v3].indexOf(reply)).to.be.above(-1);
                    popped = reply;
                    return rc.sismember(ik, reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(k, popped);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.scard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect([v1, v2, v3].indexOf(reply)).to.be.above(-1);
                    popped = reply;
                    return rc.sismember(ik, reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(k, popped);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.scard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume a sorted set element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.zconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(k, 1, v1, 2, v2, 2, v3)
                .then(function () {
                    return consumer.consume(k, ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.zscore(ik, v2);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(2);
                    return rc.zscore(k, v2);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.zcard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.zcard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return consumer.consume(k, ik, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.zscore(ik, v1);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(k, v1);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.zcard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.zcard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume a `random` sorted set element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.zconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(k, 1, v1, 2, v2, 2, v3)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.zscore(ik, v1);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(k, v1);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.zcard(k);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(2);
                    return rc.zcard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.zscore(ik, v2);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(2);
                    return rc.zscore(k, v2);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.zcard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.zcard(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably consume a hash element', function (done) {
        });
        xit('should reliably consume a random hash element', function (done) {
        });
    });

    describe('ack', function () {
        it('should reliably consume & ack a string element', function (done) {
            var k = randkey(), ik = randkey();
            var v = 'v';
            var consumer = RedisReliableConsumer.strconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (consumed) {
                    expect(consumed).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.get(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return consumer.ack(k, ik, v);
                })
                .then(function () {
                    return rc.get(ik);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should reliably consume & ack a list index', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.lconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v1, v2, v3)
                .then(function () {
                    return rc.lpush(ik, 'v', 'v', 'v');
                })
                .then(function () {
                    return consumer.consume(k, ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.lindex(ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.consume(k, ik, 0, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.lindex(ik, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return consumer.ack(k, ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return consumer.ack(k, ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v1);
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
        it('should reliably consume & ack a list element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.lconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.lindex(ik, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.consume(k, ik, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.ack(k, ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return consumer.ack(k, ik, v1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v1);
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
        it('should reliably consume & ack a `random` list element', function (done) {
            var k = randkey(), ik = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var consumer = RedisReliableConsumer.lconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v1, v2, v3)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.lindex(ik, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.consume(k, ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return consumer.ack(k, ik, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return consumer.ack(k, ik, v3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.llen(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.lrem(ik, 0, v3);
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
        xit('should reliably consume & ack a set element', function (done) {
        });
        xit('should reliably consume & ack a random set element', function (done) {
        });
        xit('should reliably consume & ack a sorted set element', function (done) {
        });
        xit('should reliably consume & ack a random sorted set element', function (done) {
        });
        xit('should reliably consume & ack a hash element', function (done) {
        });
        xit('should reliably consume & ack a random hash element', function (done) {
        });
    });

    describe('fail', function () {
        it('should reliably consume & fail a string element', function (done) {
            var k = randkey(), ik = randkey();
            var v = 'v';
            var consumer = RedisReliableConsumer.strconsumer(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return consumer.consume(k, ik);
                })
                .then(function (consumed) {
                    expect(consumed).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.get(ik);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return consumer.fail(k, ik, v);
                })
                .then(function () {
                    return rc.get(ik);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return rc.get(k);
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
        xit('should reliably consume & fail a list index', function (done) {
        });
        xit('should reliably consume & fail a random list element', function (done) {
        });
        xit('should reliably consume & fail a set element', function (done) {
        });
        xit('should reliably consume & fail a random set element', function (done) {
        });
        xit('should reliably consume & fail a sorted set element', function (done) {
        });
        xit('should reliably consume & fail a random sorted set element', function (done) {
        });
        xit('should reliably consume & fail a hash element', function (done) {
        });
        xit('should reliably consume & fail a random hash element', function (done) {
        });
    });

    describe('with concurrency', function () {
        xit('should be able to consume an element with optimistic concurrency');
    });

}).call(this);