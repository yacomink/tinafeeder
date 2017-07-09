var express = require('express');
var app = express();
var blink;

const Blink = require('node-blink-security');
let lightblue = require('bean-sdk/src/lightblue');
let common = require('bean-sdk/src/cli/commands/common');
let sdk = lightblue.sdk();
const sleep = require('sleep.async');

function cameraAction(res, fn) {
    if (!blink) {
        var fresh_blink = new Blink(process.env.BLINK_EMAIL, process.env.BLINK_PASSWORD);
        fresh_blink.setupSystem(process.env.BLINK_SYSTEM)
          .then(() => {
            blink = fresh_blink;
            fn(res);
          }, (error) => {
            console.log(error);
          });
    } else {
        fn(res);
    }
}
function serveSnap(res) {
    var starting_thumb = blink.cameras.study.thumbnail;
    blink.cameras.study
        .imageRefresh()
        .then(() => { return blink.cameras.study.fetchImageData(); })
        .then((body) => {
            res.writeHead(200, {'Content-Type': 'image/jpeg' });
            res.end(body, 'binary');      
        });
}
function takeSnap(res) {
    blink.cameras.study.snapPicture().then((body) => {
        res.send(body);      
    });
}

async function takeAndServeSnap(res) {
    var starting_thumb = await blink.cameras.study.imageRefresh();
    await blink.cameras.study.snapPicture();
    while (starting_thumb === await blink.cameras.study.imageRefresh()) {
      await sleep(1000);
    }
    serveSnap(res);
}

// reply to request with "Hello World!"
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/latest-snap', function (req, res) {
    cameraAction(res, serveSnap);
});

app.get('/snap', function (req, res) {
    res.sendfile('./html/index.html');
});

app.get('/_snap', function (req, res) {
    cameraAction(res, takeAndServeSnap);
});

var server = app.listen(process.env.PORT, function () {

  var port = server.address().port;
  console.log('Listening on port ', port);

});