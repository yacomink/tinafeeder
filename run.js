let lightblue = require('../src/lightblue')
let common = require('../src/cli/commands/common')
const buffer = require('buffer')
var moment = require('moment');

let sdk = lightblue.sdk();

let data = 'CMD-FEED';

let interval = 5000;
let feed_length = 2000;
let cycles = 10;

var max_seconds = 60;
var min_seconds = 5;

// Ascii
let buf = new buffer.Buffer(data, 'ascii')
let device = null;
var ran = 0;
var errors = [];

async function feed_cycles() {
  var elapsed = 0;
  for (var i = 0; i < cycles; i++) {
    interval = Math.round((i / cycles) * (max_seconds-min_seconds) * 1000);
    interval -= Math.round(interval * Math.random() * 0.25);
    interval += min_seconds * 1000;
    elapsed += interval;
    await new Promise((resolve, reject) => {
      console.log("Sleeping for " + interval);
      setTimeout( () => {
        console.log("Feeding");
        device.sendSerial(buf, (err) => {
          if (err) {
            console.log(err);
            errors.push(err);
          }
          resolve();
        });
        if (i == cycles-1) {
            commandComplete(null,i+1,elapsed);
        }
      }, interval );
    });
  }
}

var feed = function(device) {
  feed_cycles();
  // device.sendSerial(buf, (err) => feed_cycles());
}

function commandComplete(error,cycles,elapsed) {
  console.log('')
  if (error) {
    console.log(`Command completed with error(s): ${error}`)
    quit(1)
  } else {
    console.log('Fed ' + cycles + ' cycles in ' + moment.duration(Math.round(elapsed/1000), 'seconds').humanize() + " with " + errors.length + " errors");
    quit(0)
  }
}


function quit(rc) {
  console.log('')
  console.log('Quitting gracefully...')
  lightblue.sdk().quitGracefully((err)=> {
    console.log("Done.")
    process.exit(rc)
  })
}

common.connectToDevice(sdk,
                null,
                '05d4ed5403d84995a17d69a480733be1',
                (connected_device) => {device = connected_device; feed_cycles();},
                commandComplete);
// feed_cycles();
