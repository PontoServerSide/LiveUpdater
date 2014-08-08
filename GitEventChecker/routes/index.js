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

var updateServer = function (backend, frontend, callback) {

	var stopServer = function (cb) {
			var sock = net.createConnection(socketPath);

			var now = new Date();
			winston.info('['+now.toLocaleTimeString()+'] Send command to '+backend+'/'+frontend);

			if (!sock.write('disable server '+backend+'/'+frontend+'\r\n')) {
				// if something wrong to write through socket
				return cb(new Error('Can not send command to HAProxy'));
			}

			// when the response arrived
			sock.on('data', function (data) {
				var strData = data.toString();
				// sock.end();

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

			sock.on('end', function () {
				winston.info('command socket end');
				return cb(null);
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

			winston.info('no matched server');
return cb(new Error('No matched server'));
		},
		waitResponse = function (host, cb) {
			var client = new net.Socket();

			client.connect(1818, host, function () {
				winston.info('connected with server %s',host);
				client.write('update');
			});

			client.on('data', function (data) {
				winston.info(data);
				if (data.toString() === 'success') {
					client.destroy();
					return cb(null);
				}else if (data.toString() === 'fail') {
					client.destroy();
					return cb(new Error(host+':1818 update failed'));
				}
			});

			client.on('close', function () {
				winston.info('connection closed');	
			});

			/*
			var server = net.createServer(function (connection) {
				if(!connection.write('update')) {
					return cb(new Error('can not send command to %s', host));
				}else {
					winston.info('send update command to %s',host);
				}

				connection.on('data', function (data) {
					winston.debug(data);

					if (data.toString() === 'success') {
						server.close();
						return cb(null);
					}else if (data.toString() === 'fail') {
						server.close();
						return cb(new Error(host+':1818 update failed'));
					}
				});

				server.on('close', function () {
					var now = new Date();
					winston.info('['+now.toLocaleTimeString()+'] Connection with '+host+':1818 ended');
					return cb(null);
				});

				connection.on('error', function (error) {
					return cb(error);
				});
			});

			*/
		},
		restartServer = function (cb) {
			var sock = net.createConnection(socketPath);

			if (!sock.write('enable server '+backend+'/'+frontend+'\r\n')) {
				// if something wrong to write through socket
				return cb(new Error('Can not send command to HAProxy'));
			}

			// when the response arrived
			sock.on('data', function (data) {
				sock.end();
				var strData = data.toString();

				if (strData.match(/\n/)) {
					var now = new Date();
					winston.info('['+now.toLocaleTimeString()+'] '+backend+'/'+frontend+' started');
					return cb(null);
				}else {
					return cb(new Error('Disable server failed'));
				}
			});

			sock.on('error', function (error) {
				winston.error(error.toString());
				return cb(error);
			});

			sock.on('end', function () {
				winston.info('enable command socket end');
				return cb(null);
			});
		};

	async.waterfall([
		stopServer,
		findServerInfo,
		waitResponse,
		restartServer
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
		winston.info(global.haproxyStat.length);
		try{
			asyncLoop(global.haproxyStat.length, function(loop) {
				var idx = loop.iteration();
				var server = global.haproxyStat[idx];

				winston.info('check is ok to stop %s',server);

				// check the server status
				if(isFineToStop(server)) {
					updateServer(server['# pxname'],server['svname'],function(error) {
							if (error) {
								throw error;
							}
							loop.next();
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
		}
	}else {
		winston.warn('No valid HAProxy status');
	}

	return res.send('complete');
});

module.exports = router;
