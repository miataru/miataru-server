var spawn = require('child_process').spawn;
var path = require('path');

var pathToServer = path.join(__dirname, '../../server');

var serverProcess;

before(function (done) {
    console.log('\nStarting server...');
    serverProcess = spawn('node', [pathToServer]);

    setTimeout(done, 1500);
});

after(function () {
    console.error('\nStopping server...');
    serverProcess.kill('SIGKILL');
});