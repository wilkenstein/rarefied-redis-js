(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisTimeSeries = typeof require === 'function' ? require('../../rarefied-redis.js').RedisTimeSeries : window.RedisTimeSeries;
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

    redisClient = redisClient.toPromiseStyle(Q.defer);

    before(function (done) {
        redisClient
            .flushdb()
            .then(function () {
                done();
            })
            .fail(function (err) {
                done(err);
            })
            .done();
    });

    describe('write', function () {
        xit('should return an error for a key that is not time series');
        it('should write a time-value', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            ts
                .write(t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return redisClient.zrange(k, 0, -1, 'withscores');
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0].split(':').slice(1).join('')).to.equal(v);
                    expect(parseInt(reply[1], 10)).to.equal(t);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should write time-value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var now = new Date();
            var then = new Date();
            then.setHours(now.getHours() - 1);
            var tvs = [];
            for (var idx = 1; idx < 59; idx += 1) {
                tvs.push(then.setMinutes(then.getMinutes() + 1));
                tvs.push(idx.toString());
            }
            then.setHours(now.getHours() - 1);
            then.setMinutes(now.getMinutes());
            ts
                .write
                .apply(ts, tvs)
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return redisClient.zrange(k, 0, -1, 'withscores');
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(tvs.length);
                    reply
                        .map(function (r, idx) {
                            if (idx % 2 === 0) {
                                return [r, reply[idx + 1]];
                            }
                            return null;
                        })
                        .filter(function (r) {
                            return r !== null;
                        })
                        .forEach(function (vt, index) {
                            var v = vt[0];
                            var t = new Date(parseInt(vt[1], 10));
                            expect(parseInt(v.split(':').slice(1).join(''), 10)).to.equal(index + 1);
                            expect(t.getTime()).to.be.above(then.getTime());
                            expect(t.getTime()).to.be.below(now.getTime());
                        });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should write unique time - same value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var now = new Date();
            var then = new Date();
            then.setHours(now.getHours() - 1);
            var tvs = [];
            for (var idx = 1; idx < 59; idx += 1) {
                tvs.push(then.setMinutes(then.getMinutes() + 1));
                tvs.push('0');
            }
            then.setHours(now.getHours() - 1);
            then.setMinutes(now.getMinutes());
            ts
                .write
                .apply(ts, tvs)
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return redisClient.zrange(k, 0, -1, 'withscores');
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(tvs.length);
                    reply
                        .map(function (r, idx) {
                            if (idx % 2 === 0) {
                                return [r, reply[idx + 1]];
                            }
                            return null;
                        })
                        .filter(function (r) {
                            return r !== null;
                        })
                        .forEach(function (vt, index) {
                            var v = vt[0];
                            var t = new Date(parseInt(vt[1], 10));
                            expect(v.split(':').slice(1).join('')).to.equal('0');
                            expect(t.getTime()).to.be.above(then.getTime());
                            expect(t.getTime()).to.be.below(now.getTime());
                        });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('read', function () {
        xit('should return an error for a key that is not time series');
        it('should read a time-value pair', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            ts
                .write(t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return ts.read(new Date(t - 1).getTime(), (new Date(t + 1)).getTime());
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.equal(t);
                    expect(reply[1]).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should read time-value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var now = new Date();
            var then = new Date();
            then.setHours(now.getHours() - 1);
            var tvs = [];
            for (var idx = 1; idx < 59; idx += 1) {
                tvs.push(then.setMinutes(then.getMinutes() + 1));
                tvs.push(idx.toString());
            }
            then.setHours(now.getHours() - 1);
            then.setMinutes(now.getMinutes());
            ts
                .write
                .apply(ts, tvs)
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return ts.read(then.getTime(), now.getTime());
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(tvs.length);
                    reply
                        .map(function (torv, index) {
                            if (index % 2 === 0) {
                                return [torv, reply[index + 1]];
                            }
                            return null;
                        })
                        .filter(function (tv) {
                            return tv !== null;
                        })
                        .forEach(function (tv, index) {
                            var t = new Date(tv[0]);
                            var v = tv[1];
                            expect(parseInt(v, 10)).to.equal(index + 1);
                            expect(t.getTime()).to.be.above(then.getTime());
                            expect(t.getTime()).to.be.below(now.getTime());
                        });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('readAsObject', function () {
        xit('should return an error for a key that is not time series');
        it('should read a time-value pair', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            ts
                .write(t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return ts.readAsObject(new Date(t - 1).getTime(), (new Date(t + 1)).getTime());
                })
                .then(function (reply) {
                    expect(typeof reply).to.equal('object');
                    expect(t in reply).to.be.true;
                    expect(reply[t]).to.have.lengthOf(1);
                    expect(reply[t][0]).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should read time-value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisTimeSeries(redisClient, k)).toPromiseStyle(Q.defer);
            var now = new Date();
            var then = new Date();
            then.setHours(now.getHours() - 1);
            var tvs = [];
            for (var idx = 1; idx < 59; idx += 1) {
                then.setMinutes(then.getMinutes() + 1);
                tvs.push(then.getTime());
                tvs.push(idx.toString());
                tvs.push(then.getTime());
                tvs.push(('a' + idx).toString());
                tvs.push(then.getTime());
                tvs.push(('b' + idx).toString());
            }
            then.setHours(now.getHours() - 1);
            then.setMinutes(now.getMinutes());
            ts
                .write
                .apply(ts, tvs)
                .then(function (reply) {
                    return ts.readAsObject(then.getTime(), now.getTime());
                })
                .then(function (reply) {
                    var times;
                    expect(typeof reply).to.equal('object');
                    times = Object.keys(reply);
                    expect(times).to.have.lengthOf(58);
                    times.forEach(function (time, index) {
                        expect(time).to.be.above(then);
                        expect(time).to.be.below(now);
                        expect(reply[time]).to.have.lengthOf(3);
                        expect(reply[time].indexOf((index + 1).toString())).to.be.above(-1);
                        expect(reply[time].indexOf(('a' + (index + 1)).toString())).to.be.above(-1);
                        expect(reply[time].indexOf(('b' + (index + 1)).toString())).to.be.above(-1);
                    });
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

}).call(this);
