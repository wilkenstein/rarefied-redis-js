(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisTimeSeriesDb = typeof require === 'function' ? require('../../rarefied-redis.js').RedisTimeSeriesDb : window.RedisTimeSeriesDb;
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
        it('should return an error for a key that is not a time series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            redisClient
                .set(s, v)
                .then(function (reply) {
                    return db.write(s, t, v);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should return an error for a key that is not a time series db', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            redisClient
                .set(k, v)
                .then(function (reply) {
                    return db.write(s, t, v);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should write a time-value in a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .write(s, t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return redisClient.smembers(k);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(1);
                    expect(reply[0]).to.equal(s);
                    return redisClient.zrange(s, 0, -1, 'withscores');
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0].split(':').slice(1).join()).to.equal(v);
                    expect(parseInt(reply[1], 10)).to.equal(t);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should write time-value pairs in a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
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
            db
                .write
                .apply(db, [s].concat(tvs))
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return redisClient.smembers(k);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(1);
                    expect(reply[0]).to.equal(s);
                    return redisClient.zrange(s, 0, -1, 'withscores');
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
                            expect(parseInt(v.split(':').slice(1).join(), 10)).to.equal(index + 1);
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
        it('should write time-value pairs into series', function (done) {
            var k = randkey(), s1 = randkey(), s2 = randkey(), s3 = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
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
            db
                .write
                .apply(db, [s1].concat(tvs))
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return db
                        .write
                        .apply(db, [s2].concat(tvs));
                })
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return db
                        .write
                        .apply(db, [s3].concat(tvs));
                })
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return redisClient.scard(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return redisClient.smembers(k);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    return redisClient.zrange(s1, 0, -1, 'withscores');
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
                            expect(parseInt(v.split(':').slice(1).join(), 10)).to.equal(index + 1);
                            expect(t.getTime()).to.be.above(then.getTime());
                            expect(t.getTime()).to.be.below(now.getTime());
                        });
                    return redisClient.zrange(s2, 0, -1, 'withscores');
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
                            expect(parseInt(v.split(':').slice(1).join(), 10)).to.equal(index + 1);
                            expect(t.getTime()).to.be.above(then.getTime());
                            expect(t.getTime()).to.be.below(now.getTime());
                        });
                    return redisClient.zrange(s3, 0, -1, 'withscores');
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
                            expect(parseInt(v.split(':').slice(1).join(), 10)).to.equal(index + 1);
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
        it('should return an error for a key that is not a time series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .write(s, t, v)
                .then(function (reply) {
                    return redisClient.del(s);
                })
                .then(function (reply) {
                    return redisClient.set(s, v);
                })
                .then(function (reply) {
                    return db.read(s, t, t);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should return an error for a key that is not a time series db', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            redisClient
                .set(k, v)
                .then(function (reply) {
                    return db.read(s, t, t);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should return an error for a series that is not part of the db', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .read(s, v)
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should read a time-value pair from a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .write(s, t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return db.read(s, new Date(t - 1).getTime(), (new Date(t + 1)).getTime());
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
        it('should read time-value pairs from a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
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
            db
                .write
                .apply(db, [s].concat(tvs))
                .then(function (reply) {
                    expect(reply).to.equal(tvs.length/2);
                    return db.read(s, then.getTime(), now.getTime());
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
        it('should return an error for a key that is not a time series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .write(s, t, v)
                .then(function (reply) {
                    return redisClient.del(s);
                })
                .then(function (reply) {
                    return redisClient.set(s, v);
                })
                .then(function (reply) {
                    return db.readAsObject(s, t, t);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should return an error for a key that is not a time series db', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            redisClient
                .set(k, v)
                .then(function (reply) {
                    return db.readAsObject(s, t, t);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should return an error for a series that is not part of the db', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .readAsObject(s, v)
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should read a time-value pair from a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';
            db
                .write(s, t, v)
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return db.readAsObject(s, new Date(t - 1).getTime(), (new Date(t + 1)).getTime());
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
        it('should read time-value pairs from a series', function (done) {
            var k = randkey(), s = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
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
            db
                .write
                .apply(db, [s].concat(tvs))
                .then(function (reply) {
                    return db.readAsObject(s, then.getTime(), now.getTime());
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

    describe('series', function () {
        xit('should return an error for a key that is not a time series db');
        xit('should return the series in the time series db', function (done) {
            var k = randkey(), s1 = randkey(), s2 = randkey(), s3 = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';            
            db
                .write(s1, t, v)
                .then(function () {
                    return db.write(s2, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    return db.write(s3, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    return db.del(s2);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('numSeries', function () {
        xit('should return an error for a key that is not a time series db');
        it('should return the number of series in the time series db', function (done) {
            var k = randkey(), s1 = randkey(), s2 = randkey(), s3 = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';            
            db
                .write(s1, t, v)
                .then(function () {
                    return db.write(s2, t, v);
                })
                .then(function () {
                    return db.numSeries();
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return db.write(s3, t, v);
                })
                .then(function () {
                    return db.numSeries();
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return db.del(s2);
                })
                .then(function () {
                    return db.numSeries();
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
    });

    describe('del', function () {
        xit('should return an error for a key that is not a time series db');
        xit('should delete a series from the db', function (done) {
            var k = randkey(), s1 = randkey(), s2 = randkey(), s3 = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';            
            db
                .write(s1, t, v)
                .then(function () {
                    return db.write(s2, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    return db.write(s3, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    return db.del(s2);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should delete multiple series from the db', function (done) {
            var k = randkey(), s1 = randkey(), s2 = randkey(), s3 = randkey();
            var db = (new RedisTimeSeriesDb(redisClient, k, RedisTimeSeriesDb.timeSeriesFactory())).toPromiseStyle(Q.defer);
            var t = new Date().getTime();
            var v = '15';            
            db
                .write(s1, t, v)
                .then(function () {
                    return db.write(s2, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    return db.write(s3, t, v);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    expect(reply.indexOf(s2)).to.be.above(-1);
                    expect(reply.indexOf(s3)).to.be.above(-1);
                    return db.del(s3, s2);
                })
                .then(function () {
                    return db.series();
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(1);
                    expect(reply.indexOf(s1)).to.be.above(-1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

}).call(this);
