let lightblue = require('bean-sdk/src/lightblue');
let common = require('bean-sdk/src/cli/commands/common');
let util = require('util');
const buffer = require('buffer');
var moment = require('moment');

let sdk = lightblue.sdk();

var opt = require('node-getopt').create([
  ['', 'dry', 'Dry run, do not feed or connect'],
  ['M', 'max=ARG', 'Max cycle length, default 60'],
  ['m', 'min=ARG', 'Min cycle length, default 5'],
  ['r', 'reset=ARG', 'Reset after x seconds'],
  ['c', 'cycles=ARG', 'Cycles, default 150']]
).bindHelp().parseSystem(); // parse command line

let data = 'CMD-FEED';

let feed_length = 2000;

let cycles = opt.options.cycles || 150;
let max_seconds = opt.options.max || 60;
let min_seconds = opt.options.min || 5;
let start_time = new Date().getTime();

// Ascii
let buf = new buffer.Buffer(data, 'ascii');
let device = null;
var ran = 0;
var errors = [];
var promises = [];
var elapsed = 0;
var rewind_cycles = 0;

async function feed_cycles() {
    var intervals = [];
    for (var i = 0; i < cycles; i++) {
      let interval = Math.round((i - rewind_cycles) / cycles * (max_seconds - min_seconds) * 1000);
      interval -= Math.round(interval * Math.random() * 0.30);
      interval += min_seconds * 1000;
      if (opt.options.reset && rewind_cycles === 0 &&
          (elapsed + interval >= (opt.options.reset * 1000))) {
          // Just crossed the reset boundary, the next cycle will start over at min_seconds
          rewind_cycles = i;
      }
      intervals.push(interval);
      elapsed += interval;
    }
    // console.log(intervals.join("\n"));
    console.log(util.format("Feeding %s cyles in %sh %sm", cycles, moment.duration(elapsed).get('hours'), moment.duration(elapsed).get('minutes')));

    for (var i = 0; i < cycles; i++) {
      await new Promise((resolve, reject) => promise_to_feed(resolve, reject, intervals[i]));
    }

    commandComplete();
}

function promise_to_feed(resolve, reject, interval) {
  setTimeout(() => {
    console.log(moment().format() + ' Feeding after ' + moment.duration(new Date().getTime() - start_time).humanize() + ', Increment: ' + moment.duration(interval).seconds() + ' seconds' );
    if (opt.options.dry) {
      resolve();
    } else {
      feed(resolve);
    }
  }, interval);
}

var feed = function (resolve) {
  device.sendSerial(buf, err => {
    if (err) {
      console.log(err);
      errors.push(err);
    }
    resolve();
  });
};

function commandComplete() {
  console.log('Fed ' + cycles + ' cycles in ' + moment.duration(new Date().getTime() - start_time).humanize() + " with " + errors.length + " errors");
  quit(0);
}

function quit(rc) {
  console.log('');
  console.log('Quitting gracefully...');
  lightblue.sdk().quitGracefully(err => {
    console.log("Done.");
    process.exit(rc);
  });
}


if (opt.options.dry) {
  feed_cycles();
} else {
  common.connectToDevice(sdk, null, process.env.BEAN_ADDRESS, connected_device => {
    device = connected_device;feed_cycles();
  }, commandComplete);
}

