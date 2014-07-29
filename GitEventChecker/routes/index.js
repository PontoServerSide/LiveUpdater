var express = require('express'),
	router = express.Router(),
	net = require('net'),
	winston = require('winston'),
	fs = require('fs'),
	async = require('async');

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

var updateServer = function (sock, backend, frontend, callback) {

	var stopServer = function (cb) {
			var now = new Date();
			winston.info('['+now.toLocaleTimeString()+'] Send command to '+backend+'/'+frontend);

			if (!sock.write('disable server '+backend+'/'+frontend+'\r\n')) {
				// if something wrong to write through socket
				return cb(new Error('Can not send command to HAProxy'));
			}

			// when the response arrived
			sock.on('data', function (data) {
				var strData = data.toString();

				if (strData.match(/\n/)) {
					var now = new Date();
					winston.info('['+now.toLocaleTimeString()+'] '+backend+'/'+frontend+' stopped');
					return cb(null);
				}else {
					return cb(new Error('Disable server failed'));
				}
			});

			sock.on('error', function (error) {
				winston.error(error.toString());
				return cb(error);
			});
		},
		findServerInfo = function (cb) {
			var matchFrontend = null;

			for(var i=0; i<global.servers.length; i++) {
				var selectBackend = global.servers[i].backend;

				if(selectBackend.name === backend) {
					for(var j=0; j<global.servers[i].frontend.length; j++) {
						var selectFrontend = global.servers[i].frontend[j];

						if (selectFrontend.name === frontend) {
							matchFrontend = selectFrontend;
							return cb(null, matchFrontend.ip);
						}
					}
				}
			}

			return cb(new Error('No matched server'));
		},
		waitResponse = function (host, cb) {
			var server = net.createServer();

			// wait client response
			server.on('listening', function () {
				winston.info('Waiting client response '+host+':1818');
			});

			server.on('connection', function (socket) {
				winston.info('Connection established with client');

				socket.write('update');
			});

			server.on('data', function (data) {
				if (data === 'success') {
					server.close();
					return cb(null);
				}else if (data === 'fail') {
					server.close();
					return cb(new Error(host+':1818 update failed'));
				}
			});

			server.on('close', function () {
				winston.info('Connection with '+host+':1818 ended');
				return cb(null);
			});

			server.on('error', function (error) {
				return cb(error);
			});

			server.listen(1818, host);
		};

	async.waterfall([
		stopServer,
		findServerInfo,
		waitResponse
	], function (error) {
		if (error) {
			return callback(error);
		}

		return callback(null);
	})
};

var isFineToStop = function (server) {
	return !(server.status === 'MAINT' || 
			 server.svname === 'BACKEND' || 
			 server.svname === 'FRONTEND' || 
			 server.svname === undefined);
};

router.post('/', function(req, res) {
	// console.log(req.body);
	// you can get commit information from request body
	
	var turnoffCnt = 0;

	if (global.haproxyStat.length !== 0) {
		// start stopping servers
		try{
			asyncLoop(global.haproxyStat.length, function(loop) {
				var idx = loop.iteration();
				var server = global.haproxyStat[idx];

				// check the server status
				if(isFineToStop(server)) {
					var client = net.createConnection(socketPath);

					client.on('connect', function () {
						updateServer(client, server['# pxname'],server['svname'],function(error) {
							if (error) {
								throw error;
							}
							client.destroy();
							loop.next();
						});

						client.on('error', function (error) {
							winston.error(error);
						});
					});
				}else {
					loop.next();
				}
			},
			function () {
				// end of loop
			});
		}
		catch(err) {
			// when an error occured, destory connection and show error message
			winston.error(err.toString());
			client.destroy();
		}
	}else {
		winston.warn('No valid HAProxy status');
	}

	return res.send('complete');
});

module.exports = router;
