'use strict';

const PORT       = 8080,
	  DEVICE_ID1 = '567827489028375',
	  DEVICE_ID2 = '567827489028376';

var cp      = require('child_process'),
	assert  = require('assert'),
	request = require('request'),
	gateway;

describe('HTTP Gateway', function () {
	this.slow(5000);

	after('terminate child process', function (done) {
		this.timeout(5000);

		gateway.send({
			type: 'close'
		});

		setTimeout(function () {
			gateway.kill('SIGKILL');
			done();
		}, 4000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(gateway = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			gateway.on('message', function (message) {
				if (message.type === 'ready')
					done();
				else if (message.type === 'requestdeviceinfo') {
					if (message.data.deviceId === DEVICE_ID1 || message.data.deviceId === DEVICE_ID2) {
						gateway.send({
							type: message.data.requestId,
							data: {
								_id: message.data.deviceId
							}
						});
					}
				}
			});

			gateway.send({
				type: 'ready',
				data: {
					options: {
						port: PORT
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			this.timeout(5000);

			request.post({
				url: `http://localhost:${PORT}/data`,
				body: JSON.stringify({device: '567827489028375', data: 'test data'}),
				headers: {
					'Content-Type': 'application/json'
				}
			}, function (error, response, body) {
				assert.ifError(error);
				assert.equal(200, response.statusCode);
				assert.equal('Data Received', body);
				done();
			});
		});
	});
});