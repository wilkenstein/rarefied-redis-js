(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisGuaranteedMessageQueue = typeof require === 'function' ? require('../../rarefied-redis.js').RedisGuaranteedMessageQueue : window.RedisGuaranteedMessageQueue;
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

    describe('push', function () {
        it('should push into the queue', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.push(msg2, msg3);
                })
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(msg3);
                    expect(reply[1]).to.equal(msg2);
                    expect(reply[2]).to.equal(msg1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably push into the queue', function (done) {
        });
        xit('should return an error if the key is not a list');
    });

    describe('pop', function () {
        it('should not pop anything from an empty queue', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            q
                .pop()
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return q.pop();
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
        it('should pop from the queue in the correct order', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg3);
                    return q.pop();
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
        it('should timeout a popped element and put it back into the queue', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k, 1).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    var deferred = Q.defer();
                    setTimeout(function () {
                        deferred.resolve();
                    }, 1200);
                    return deferred.promise;
                })
                .then(function () {
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2); // NOTE!
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();            
        });
        xit('should reliably pop from the queue');
        xit('should return an error if the key is not a list');
    });

    describe('ack', function () {
        it('should do nothing for an element that is not in process', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.ack(msg2);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return q.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.inprocess();
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
        it('should ack an in process element', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.ack(reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q.queued();
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
        it('should ack in process elements', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.pop();
                })
                .then(function () {
                    return q.pop();
                })
                .then(function () {
                    return q.ack(msg2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.ack(msg1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably ack');
    });

    describe('fail', function () {
        it('should do nothing for an element that is not in process', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.fail(msg2);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return q.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.inprocess();
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
        it('should fail an in process element', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.fail(reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q.queued();
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
        it('should fail in process elements', function (done) {
            var k = randkey();
            var q = new RedisGuaranteedMessageQueue(rc, k).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q
                .push(msg1, msg2, msg3)
                .then(function () {
                    return q.pop();
                })
                .then(function () {
                    return q.pop();
                })
                .then(function () {
                    return q.fail(msg2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.fail(msg1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return q.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q.queued();
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
        xit('should reliably fail');
    });

    describe('start', function () {
        it('should move expired or lost elements back into the queue', function (done) {
            var k = randkey();
            var q1 = new RedisGuaranteedMessageQueue(rc, k, 1).toPromiseStyle(Q.defer);
            var q2 = new RedisGuaranteedMessageQueue(rc, k, 1).toPromiseStyle(Q.defer);
            var msg1 = 'msg1', msg2 = 'msg2', msg3 = 'msg3';
            q2
                .start()
                .then(function () {
                    return q2.push(msg1, msg2);
                })
                .then(function () {
                    return q1.push(msg3);
                })
                .then(function () {
                    return q2.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q1.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q1.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg1);
                    return rc.del(k + '-expire-list'); // Simulate an expiry outside of the normal process.
                })
                .then(function () {
                    return q2.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    var deferred = Q.defer();
                    setTimeout(function () {
                        deferred.resolve();
                    }, 1200);
                    return deferred.promise;
                })
                .then(function () {
                    return q1.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q2.inprocess();
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return q1.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q2.queued();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q2.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2);
                    return q2.ack(msg2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(msg2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('stop', function () {
    });

    describe('queued', function () {
        xit('should return the # of elements in queue');
    });

    describe('inprocess', function () {
        xit('should return the # of elements in process');
    });

}).call(this);