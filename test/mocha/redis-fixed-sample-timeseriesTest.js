(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisFixedSampleTimeSeries = typeof require === 'function' ? require('../../rarefied-redis.js').RedisFixedSampleTimeSeries : window.RedisFixedSampleTimeSeries;
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
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(15))).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            ts
                .write(t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return redisClient.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(16);
                    var split = reply.split('|');
                    expect(split[1]).to.equal(v);
                    expect(parseInt(split[0], 10)).to.equal(t);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should write time-value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(15))).toPromiseStyle(Q.defer);
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
                    return redisClient.get(k);
                })
                .then(function (reply) {
                    expect(reply.length).to.equal(16*tvs.length/2);
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
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(15))).toPromiseStyle(Q.defer);
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
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(15))).toPromiseStyle(Q.defer);
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
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(15))).toPromiseStyle(Q.defer);
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
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.strcodec(16))).toPromiseStyle(Q.defer);
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

    describe('bincodec', function () {
        xit('should return an error for a key that is not time series');
        it('should write/read a time-value pair', function (done) {
            var k = randkey();
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.bincodec(4, 1))).toPromiseStyle(Q.defer);
            var t = Math.floor(new Date().getTime()/1000);
            var v = 15;
            ts
                .write(t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return ts.read(new Date(t*1000 - 1000).getTime()/1000, (new Date(t*1000 + 1000)).getTime()/1000);
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
        it('should write/read time-value pairs', function (done) {
            var k = randkey();
            var ts = (new RedisFixedSampleTimeSeries(redisClient, k, RedisFixedSampleTimeSeries.bincodec(4, 4))).toPromiseStyle(Q.defer);
            var now = new Date();
            var then = new Date();
            then.setHours(now.getHours() - 1);
            var tvs = [];
            for (var idx = 1; idx < 59; idx += 1) {
                tvs.push(Math.floor(then.setMinutes(then.getMinutes() + 1)/1000));
                tvs.push(idx.toString());
            }
            then.setHours(now.getHours() - 1);
            then.setMinutes(now.getMinutes());
            ts
                .write
                .apply(ts, tvs)
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return ts.read(then.getTime()/1000, now.getTime()/1000);
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
                            expect(t.getTime()).to.be.above(then.getTime()/1000);
                            expect(t.getTime()).to.be.below(now.getTime()/1000);
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
