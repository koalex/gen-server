const path = require('path');
require('dotenv').config({ path: process.env.ENV_PATH || path.resolve(process.cwd(), '.env') });

const config = require('config');
let secure = false;
if (config.protocol == 'https' || config.protocol == 'http2' || config.protocol == 'http/2') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    secure = true;
}
const assert        = require('assert');
const fs			= require('fs');
const uuid          = require('uuid/v4');
const server        = require(__dirname + '/../bin/server.js');
const request       = require('supertest')(server);
const io            = require('socket.io-client');

const addToStaticAsync = require(__dirname + '/../utils/copyToStatic');
const removeFromStatic = require(__dirname + '/../utils/removeFromStatic');

const ioOptions = {
    path: '',
    secure,
    rejectUnauthorized: false,
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    transportOptions: {
        websocket: {
            extraHeaders: {
                'origin': 'test'
            }
        }
    }
};

let sender, receiver;

describe('GEN SERVER', () => {
    before(done => {
        server.listen({port: config.port}, done);
    });

	after(done => {
		// db close...
		server.close(done); // TODO: why not work ?
	});

    beforeEach(done => {
        sender   = io(`${config.protocol == 'http' ? 'http' : 'https'}://localhost:${config.port}`, ioOptions);
        receiver = io(`${config.protocol == 'http' ? 'http' : 'https'}://localhost:${config.port}`, ioOptions);
        done();

    });

    afterEach(done => {
        sender.disconnect();
        receiver.disconnect();
        done();
    });

	describe('SMOKE test #server startup', () => {
		it('should return the bound address, the address family name, and port of the server as reported by the operating system if listening on an IP socket', done => {
			let address = server.address();

			if (!['address', 'family', 'port'].every(key => key in address)) {
				return done(new Error('server does not start'));
			}

			done();
		});
	});

    describe('SMOKE test #static server', () => {
        it('should return status 200 for request /robots.txt', function (done) {
            this.slow(200);
            request
                .get('/robots.txt')
                .expect(200)
                .end(done);
        });
    });

    describe('SMOKE test #SOCKET.io', () => {
        it('Clients should receive a message when the `message` event is emited.', function (done) {
            const testMessage = 'Hello World';
            sender.emit('__TEST__', testMessage);
            receiver.on('__TEST__', message => {
                assert.strictEqual(message, testMessage);
                done();
            });
        });
    });

    describe('LOGGING #log client error', () => {
        it('should return status 200 for request /log', function (done) {
            this.slow(200);
            request
                .post('/log')
                .send({message: 'client test error', name: 'Test Error', line: 99})
                .set('Content-Type', 'application/json')
                .expect(200)
                .end(done);
        });
    });

    describe('Outdated browser', () => {
        before(done => {
            addToStaticAsync(`${__dirname}/../fixtures/__test_outdated_browser__.html`).then(() => {
                done();
            }).catch(done);
        });

        after(done => {
            try {
                removeFromStatic('__test_outdated_browser__.html');
                done();
            } catch (err) {
                done(err);
            }
        });

        it('should render RU "Not Supported Browser" page with Accept-Language header', function (done) {
            this.slow(1000); // render w/o cache
            request
                .get('/__test_outdated_browser__.html')
                .set('Accept-Language', 'ru-RU,ru;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,zh-CN;q=0.5')
                .set('User-Agent', 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect(response => {
                    assert.strictEqual(true, response.text.includes("браузер не поддерживается"));
                })
                .end(done);
        });

        it('should render RU "Not Supported Browser" page with ?locale=ru param', done => {
            request
                .get('/__test_outdated_browser__.html?locale=ru')
                .expect('Content-Type', /html/)
                .set('User-Agent', 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)')
                .expect(200)
                .expect(response => {
                    assert.strictEqual(true, response.text.includes("браузер не поддерживается"));
                })
                .end(done);
        });

        it('should render EN "Not Supported Browser" page with Accept-Language header', function (done) {
            this.slow(1000); // render w/o cache
            request
                .get('/__test_outdated_browser__.html')
                .set('Accept-Language', 'en-US,en;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,zh-CN;q=0.5')
                .set('User-Agent', 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect(response => {
                    assert.strictEqual(true, response.text.includes("browser is not supported"));
                })
                .end(done);
        });

        it('should render EN "Not Supported Browser" page with ?locale=en param', done => {
            request
                .get('/__test_outdated_browser__.html?locale=en')
                .expect('Content-Type', /html/)
                .set('User-Agent', 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)')
                .expect(200)
                .expect(response => {
                    assert.strictEqual(true, response.text.includes("browser is not supported"));
                })
                .end(done);
        });
    });

    describe('UTILS #copy files to static dir', () => {
        it('File should be copied to static directory.', function (done) {
            let filename = uuid();
            let src  = path.join(__dirname, '../temp', filename);
            let dest = path.join(__dirname, '../static', filename);
            try {
                fs.writeFileSync(src, 'temp file for unit test');
            } catch (err) {
                return done(err);
            }
            addToStaticAsync(src).then(() => {
                try {
                    fs.unlinkSync(src);
                    fs.unlinkSync(dest);
                    return done();
                } catch (err) {
                    return done(err);
                }
            }, done);
        });

        it('Array of files should be copied to static directory.', function (done) {
            let filename1 = uuid();
            let filename2 = uuid();
            let src1  = path.join(__dirname, '../temp', filename1);
            let src2  = path.join(__dirname, '../temp', filename2);
            let dest1 = path.join(__dirname, '../static', filename1);
            let dest2 = path.join(__dirname, '../static', filename2);
            try {
                fs.writeFileSync(src1, 'temp file for unit test');
                fs.writeFileSync(src2, 'temp file for unit test');
            } catch (err) {
                return done(err);
            }
            addToStaticAsync([src1, src2]).then(() => {
                try {
                    fs.unlinkSync(src1);
                    fs.unlinkSync(src2);
                    fs.unlinkSync(dest1);
                    fs.unlinkSync(dest2);
                    done()
                } catch (err) {
                    return done(err);
                }
            }, done);
        });
    });
});
