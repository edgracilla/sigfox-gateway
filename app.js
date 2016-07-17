'use strict';

var async    = require('async'),
	platform = require('./platform'),
	isEmpty  = require('lodash.isempty'),
	server;

platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		server.close(() => {
			server.removeAllListeners();
			platform.notifyClose();
			d.exit();
		});
	});
});

platform.once('ready', function (options) {
	let hpp        = require('hpp'),
		helmet     = require('helmet'),
		config     = require('./config.json'),
		express    = require('express'),
		bodyParser = require('body-parser');

	if (isEmpty(options.data_path))
		options.data_path = config.data_path.default;

	var app = express();

	app.use(bodyParser.json());
	
	app.disable('x-powered-by');
	app.use(helmet.xssFilter({setOnOldIE: true}));
	app.use(helmet.frameguard('deny'));
	app.use(helmet.ieNoOpen());
	app.use(helmet.noSniff());
	app.use(hpp());

	if (!isEmpty(options.username)) {
		let basicAuth = require('basic-auth');

		app.use((req, res, next) => {
			let unauthorized = (res) => {
				res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
				return res.sendStatus(401);
			};

			let user = basicAuth(req);

			if (isEmpty(user))
				return unauthorized(res);
			if (user.name === options.username && isEmpty(options.password))
				return next();
			if (user.name === options.username && user.pass === options.password)
				return next();
			else
				return unauthorized(res);
		});
	}

	app.post((options.data_path.startsWith('/')) ? options.data_path : `/${options.data_path}`, (req, res) => {
		let data = req.body;

		res.set('Content-Type', 'text/plain');

		res.status(200).send(`Data Received. Device ID: ${data.device}. Data: ${JSON.stringify(data)}\n`);

		if (isEmpty(data) || isEmpty(data.device))
			platform.handleException(new Error('Invalid data sent. Data must be a valid JSON String with at least a "device" field which corresponds to a registered Device ID.'));

		platform.requestDeviceInfo(data.device, (error, requestId) => {
			platform.once(requestId, (deviceInfo) => {
				if (isEmpty(deviceInfo)) {
					platform.log(JSON.stringify({
						title: 'SIGFOX Gateway - Access Denied. Unauthorized Device',
						device: data.device
					}));
				}

				platform.processData(data.device, JSON.stringify(data));

				platform.log(JSON.stringify({
					title: 'SIGFOX Data Received.',
					device: data.device,
					data: data
				}));
			});
		});
	});

	app.use((error, req, res, next) => {
		platform.handleException(error);

		res.set('Content-Type', 'text/plain');

		res.status(500).send('An unexpected error has occurred. Please contact support.\n');
	});

	app.use((req, res) => {
		res.set('Content-Type', 'text/plain');

		res.status(404).send(`Invalid Path. ${req.originalUrl} Not Found\n`);
	});

	server = require('http').Server(app);

	server.once('error', function (error) {
		console.error('SIGFOX Gateway Error', error);
		platform.handleException(error);

		setTimeout(() => {
			server.close(() => {
				server.removeAllListeners();
				process.exit();
			});
		}, 5000);
	});

	server.once('close', () => {
		platform.log(`SIGFOX Gateway closed on port ${options.port}`);
	});

	server.listen(options.port, () => {
		platform.notifyReady();
		platform.log(`SIGFOX Gateway has been initialized on port ${options.port}`);
	});
});