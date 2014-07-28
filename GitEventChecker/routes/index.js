var express = require('express'),
	router = express.Router(),
	net = require('net'),
	fs = require('fs'),
	socketPath = '/tmp/haproxy';


/* GET home page. */
router.post('/', function(req, res) {
	// console.log(req.body);
	// you can get commit information from request body

	fs.stat(socketPath, function (err) {
		if (!err) {
			fs.unlinkSync(socketPath);
		}

		var unixServer = net.createServer(function (sock) {
			sock.write('show health');

			sock.on('data', function (data) {
				winston.debug('DATA: '+data);
				sock.destroy();
			});

		}).listen(socketPath);
	});

	res.send('complete');
});

module.exports = router;
