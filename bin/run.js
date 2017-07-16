let lightblue = require('bean-sdk/src/lightblue');
let common = require('bean-sdk/src/cli/commands/common');
let util = require('util');
const buffer = require('buffer');
const sleep = require('sleep.async');
var moment = require('moment');

let sdk = lightblue.sdk();

var opt = require('node-getopt').create([
  ['', 'dry', 'Dry run, do not feed or connect'],

  // Fixed-time run settings
  ['t', 'run_time=ARG', 'How long to run for'],
  ['i', 'interval=ARG', 'What interval length to use'],

  // Fixed-cycle run settings
  ['M', 'max=ARG', 'Max cycle length, default 60'],
  ['m', 'min=ARG', 'Min cycle length, default 5'],
  ['r', 'reset=ARG', 'Reset after x seconds'],
  ['c', 'cycles=ARG', 'Cycles, default 150']
  ]
).bindHelp().parseSystem(); // parse command line

let feed_length = 2000;
const FIXED_TIME = 1;
const FIXED_CYCLES = 2;

let cycles = opt.options.cycles || 150;
let max_seconds = opt.options.max || 60;
let min_seconds = opt.options.min || 5;
let interval = opt.options.interval || 5;
let run_time = opt.options.run_time || 5 * 60;
let start_time = new Date().getTime();

let run_type = opt.options.run_time ? FIXED_TIME : FIXED_CYCLES;

// Ascii
let device = null;
var ran = 0;
var errors = [];
var promises = [];
var elapsed = 0;
var rewind_cycles = 0;

function calculate_fixed_cycles_intervals() {

    var intervals = [];
    for (var i = 0; i < cycles; i++) {
      let interval = Math.round((i - rewind_cycles) / cycles * (max_seconds - min_seconds) * 1000);
      interval += min_seconds * 1000;
      interval -= Math.round(interval * Math.random() * 0.30);
      if (opt.options.reset && rewind_cycles === 0 &&
          (elapsed + interval >= (opt.options.reset * 1000))) {
          // Just crossed the reset boundary, the next cycle will start over at min_seconds
          rewind_cycles = i;
      }
      intervals.push(interval);
      elapsed += interval;
    }
    // console.log(intervals.join("\n"));
    return intervals;

}

function calculate_fixed_time_intervals() {

    var intervals = [];
    var elapsed = 0;
    while (elapsed < opt.options.run_time) {
      intervals.push(opt.options.interval * 1000);
      elapsed += opt.options.interval*1;
    }
    return intervals;

}

async function feed_cycles() {
    var intervals = (run_type == FIXED_TIME) ? 
                    calculate_fixed_time_intervals() :
                    calculate_fixed_cycles_intervals();

    var total_time = intervals.reduce((carry, val) => carry*1 + val*1);

    console.log("Feeding %s cyles in %sh %sm", 
                intervals.length,
                moment.duration(total_time).get('hours'),
                moment.duration(total_time).get('minutes'));

    for (var i = 0; i < intervals.length; i++) {
      await sleep(intervals[i], !opt.options.dry ? feed : null);
      if (!opt.options.dry) {
        feed();        
      }
      console.log('%s Fed iteration %d after %s second delay',
                  moment().format(),
                  i + 1,
                  moment.duration(intervals[i]).seconds());
    }

    commandComplete();
}

var feed = function () {
  let buf = new buffer.Buffer('CMD-FEED', 'ascii');
  device.sendSerial(buf, err => {
    if (err) {
      console.log(err);
      errors.push(err);
    }
  });
};

function commandComplete() {
  console.log("Fed %d cycles in %s with %d errors",
              cycles,
              moment.duration(new Date().getTime() - start_time).humanize(),
              errors.length);
  quit(0);
}

function quit(rc) {
  console.log('');
  console.log('Quitting gracefully...');
  if (opt.options.dry) {
    process.exit(rc);
  }
  lightblue.sdk().quitGracefully(err => {
    console.log("Done.");
    process.exit(rc);
  });
}


if (opt.options.dry) {
  feed_cycles();
} else {
  common.connectToDevice(sdk, null, process.env.BEAN_ADDRESS, connected_device => {
    console.log('Connected to device');
    device = connected_device;
    feed_cycles();
  }, commandComplete);
}

