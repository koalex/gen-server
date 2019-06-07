require('dotenv').config();

const config = require('config');
let secure = false;
if (config.protocol == 'https' || config.protocol == 'http2' || config.protocol == 'http/2') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    secure = true
}
const assert        = require('assert');
const fs			= require('fs');
const path          = require('path');
const uuid          = require('uuid/v4');
const genServerPath = path.join(__dirname, '../node_modules/@gen-server');
const symlinks = {
    [path.join(__dirname, '../bin')]: path.join(genServerPath, 'bin'), // for tests
    [path.join(__dirname, '../package.json')]: path.join(genServerPath, 'package.json'), // for tests
    [path.join(__dirname, '../modules')]: path.join(genServerPath, 'modules'),
    [path.join(__dirname, '../lib')]: path.join(genServerPath, 'lib'),
    [path.join(__dirname, '../middlewares')]: path.join(genServerPath, 'middlewares'),
    [path.join(__dirname, '../utils')]: path.join(genServerPath, 'utils'),
    [path.join(__dirname, '../static')]: path.join(genServerPath, 'static'),
    [path.join(__dirname, '../logs')]: path.join(genServerPath, 'logs')
};
if (!fs.existsSync(genServerPath)) fs.mkdirSync(genServerPath);
for(let target in symlinks) {
    if (!fs.existsSync(symlinks[target])) fs.symlinkSync(target, symlinks[target]);
}

const server    = require('@gen-server/bin/server.js');
const request   = require('supertest')(server);
const io        = require('socket.io-client');
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
            })
        });
    });

    describe('UTILS #copy files to static dir', () => {
        it('File should be copied to static directory.', function (done) {
            const addToStaticAsync = require('@gen-server/utils/copyToStatic');
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
            const addToStaticAsync = require('@gen-server/utils/copyToStatic');
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
