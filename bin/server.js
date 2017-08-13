var express = require('express');
var app = express();
var blink;

let lightblue = require('bean-sdk/src/lightblue');
let common = require('bean-sdk/src/cli/commands/common');
let sdk = lightblue.sdk();
const sleep = require('sleep.async');
const child_process = require('child_process');
let feeder_device = null;


// reply to request with "Hello World!"
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/_connect', function (req, res) {
  common.connectToDevice(sdk, 'PetTutor Feeder', process.env.BEAN_ADDRESS, connected_device => {
    feeder_device = connected_device;
    res.send('Connected');
  }, (err) => {
    res.send(err);
  } );
});

app.get('/_disconnect', function (req, res) {
  if (feeder_device && feeder_device.isConnected()) {
    feeder_device.disconnect((err) => {
      if (err) {
        res.send(err)
      } else {
        res.send('Disconnected');
      }
    });
  }
});

app.get('/status', function (req, res) {
  if (!feeder_device) {
    res.send({'status': 'Not connected'});
  } else if (feeder_device.isConnected()) {
    res.send(feeder_device.serialize());
  } else if (feeder_device.isConnectedorConnecting()) {
    res.send({'status': 'Not connected'});
  }
});


app.get('/_spawn', function(req, res) {
  var child = child_process.spawn('node',
        ['-r', 'babel-polyfill', './build/bin/run.js', '--min=10', 
        '--max=20', 
        '--cycles=100' ],
        { cwd: process.cwd, detached: true, stdio: 'inherit' });
  child.unref();
  res.send();
});

console.log(process.env.PORT);
var server = app.listen(process.env.PORT, function () {
  var port = server.address().port;
  console.log('Listening on port ', port);
});