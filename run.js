let lightblue = require('bean-sdk/src/lightblue')
let common = require('bean-sdk/src/cli/commands/common')
let util = require('util');
const buffer = require('buffer')
var moment = require('moment');

let sdk = lightblue.sdk();

opt = require('node-getopt').create([
  [''  , 'dry'                , 'Dry run, do not feed or connect'],
  // ['S' , 'short-with-arg=ARG'  , 'option with argument'],
  ['M' , 'max=ARG'   , 'Max cycle length, default 60'],
  ['m' , 'min=ARG'   , 'Min cycle length, default 5'],
  ['c' , 'cycles=ARG'   , 'Cycles, default 150'],
  // [''  , 'color[=COLOR]'       , 'COLOR is optional'],
  // ['m' , 'multi-with-arg=ARG+' , 'multiple option with argument'],
  // [''  , 'no-comment'],
  // ['h' , 'help'                , 'display this help'],
  // ['v' , 'version'             , 'show version']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

let data = 'CMD-FEED';

let interval = 5000;
let feed_length = 2000;

let cycles = opt.options.cycles || 150;
let max_seconds = opt.options.max || 60;
let min_seconds = opt.options.min || 5;
let start_time = (new Date()).getTime();

// Ascii
let buf = new buffer.Buffer(data, 'ascii')
let device = null;
var ran = 0;
var errors = [];
var promises = [];
var elapsed = 0;

function feed_cycles() {
  for (var i = 0; i < cycles; i++) {
    interval = Math.round((i / cycles) * (max_seconds-min_seconds) * 1000);
    interval -= Math.round(interval * Math.random() * 0.25);
    interval += min_seconds * 1000;
    elapsed += interval;
    promises[i] = new Promise(promise_to_feed);
  }
  console.log(util.format("Feeding %s cyles %s", cycles, moment.duration(elapsed).humanize(true)));
  Promise.all(promises).then(commandComplete);
}

function promise_to_feed(resolve, reject) {
  setTimeout( () => {
    if (opt.options.dry) {
      console.log('RESOLVING AFTER ' + moment.duration((new Date()).getTime() - start_time).seconds());
      resolve();
    } else {
      feed(resolve);
    }
  }, elapsed );
}


var feed = function(resolve) {
  device.sendSerial(buf, (err) => {
    if (err) {
      console.log(err);
      errors.push(err);
    }
    resolve();
  });
}

function commandComplete() {
    console.log('Fed ' + cycles + ' cycles in ' + moment.duration(Math.round(elapsed/1000), 'seconds').humanize() + " with " + errors.length + " errors");
    quit(0)
}


function quit(rc) {
  console.log('')
  console.log('Quitting gracefully...')
  lightblue.sdk().quitGracefully((err)=> {
    console.log("Done.")
    process.exit(rc)
  })
}

if (opt.options.dry) {
  feed_cycles();
} else {
  common.connectToDevice(sdk,
                  null,
                  '05d4ed5403d84995a17d69a480733be1',
                  (connected_device) => {device = connected_device; feed_cycles();},
                  commandComplete);
}
