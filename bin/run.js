let lightblue = require('bean-sdk/src/lightblue');
let common = require('bean-sdk/src/cli/commands/common');
let util = require('util');
var moment = require('moment');
let sdk = lightblue.sdk();
let Feeder = require('../lib/feeder');

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
  var feeder = new Feeder(null, opt.options);
  feeder.feed_cycles();
} else {
  common.connectToDevice(sdk, 'PetTutor Feeder', process.env.BEAN_ADDRESS, connected_device => {
    console.log('Connected to device');
    var feeder = new Feeder(connected_device, opt.options);
    feeder.feed_cycles();
  }, commandComplete);
}

