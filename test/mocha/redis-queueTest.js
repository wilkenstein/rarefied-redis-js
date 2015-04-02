(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisQueue = typeof require === 'function' ? require('../../rarefied-redis.js').RedisQueue : window.RedisQueue;
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

    before(function (done) {
        redisClient.flushdb(function (err) {
            done(err);
        });
    });

    describe('head', function () {
        it('should return nothing for an empty queue', function (done) {
            var q = (new RedisQueue(redisClient, randkey())).toPromiseStyle(Q.defer);
            q
                .head()
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    expect(err).to.not.exist;
                    done(err);
                })
                .done();
        });
        it('should return the head of the queue', function (done) {
            var q = (new RedisQueue(redisClient, randkey())).toPromiseStyle(Q.defer);
            q
                .push('1')
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.head();
                })
                .then(function (reply) {
                    expect(reply).to.equal('1');
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal('1');
                    return q.head();
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return [q.push('2'), q.push('3'), q.push('4')].reduce(Q.when, Q());
                })
                .then(function () {
                    return q.head();
                })
                .then(function (reply) {
                    expect(reply).to.equal('2');
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

    describe('push', function () {
        it('should push onto a queue', function (done) {
            var q = (new RedisQueue(redisClient, randkey())).toPromiseStyle(Q.defer);
            q
                .push('1')
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.push('2');
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return q.push('3');
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal('1');
                    return q.push('4');
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

    describe('pop', function () {
        it('should return nothing for an empty queue', function (done) {
            var q = (new RedisQueue(redisClient, randkey())).toPromiseStyle(Q.defer);
            q
                .pop()
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    expect(err).to.not.exist;
                    done(err);
                })
                .done();
        });
        it('should pop an element from the queue', function (done) {
            var q = (new RedisQueue(redisClient, randkey())).toPromiseStyle(Q.defer);
            q
                .push('1')
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal('1');
                    return q.head();
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    return [q.push('2'), q.push('3'), q.push('4')].reduce(Q.when, Q());
                })
                .then(function () {
                    return Q.all([q.pop(), q.pop()]);
                })
                .spread(function (pop1, pop2) {
                    expect(['2', '3'].indexOf(pop1)).to.be.above(-1);
                    expect(['2', '3'].indexOf(pop2)).to.be.above(-1);
                    return q.pop();
                })
                .then(function (reply) {
                    expect(reply).to.equal('4');
                    return q.head();
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

}).call(this);