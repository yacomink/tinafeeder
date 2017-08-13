"use strict";

const buffer = require('buffer');
const sleep = require('sleep.async');
const moment = require('moment');

exports.__esModule = true;

const FIXED_TIME = 1;
const FIXED_CYCLES = 2;

var Feeder = function () {
  function Feeder(device, options) {
    this.device = device;
    this.options = options;
    this.cycles = this.options.cycles || 150;
    this.max_seconds = this.options.max || 60;
    this.min_seconds = this.options.min || 5;
    this.interval = this.options.interval || 5;
    this.run_time = this.options.run_time || 5 * 60;
    this.start_time = new Date().getTime();
    this.run_type = this.options.run_time ? FIXED_TIME : FIXED_CYCLES;

    this.ran = 0;
    this.errors = [];
    this.promises = [];
    this.elapsed = 0;
    this.rewind_cycles = 0;
  }

  Feeder.prototype.feed_cycles = async function() {
      var intervals = (this.run_type == FIXED_TIME) ? 
                      this.calculate_fixed_time_intervals() :
                      this.calculate_fixed_cycles_intervals();

      var total_time = intervals.reduce((carry, val) => carry*1 + val*1);

      console.log("Feeding %s cyles in %sh %sm", 
                  intervals.length,
                  moment.duration(total_time).get('hours'),
                  moment.duration(total_time).get('minutes'));

      for (var i = 0; i < intervals.length; i++) {
        await sleep(intervals[i], !this.options.dry ? feed : null);
        if (!this.options.dry) {
          this._feed();        
        }
        console.log('%s Fed iteration %d after %s second delay',
                    moment().format(),
                    i + 1,
                    moment.duration(intervals[i]).seconds());
      }

      if (this.options.onComplete) {
        this.options.onComplete();
      }
  }


  Feeder.prototype._feed = function () {
    let buf = new buffer.Buffer('CMD-FEED', 'ascii');
    this.device.sendSerial(buf, err => {
      if (err) {
        console.log(err);
        this.errors.push(err);
      }
    });
  };

  Feeder.prototype.calculate_fixed_cycles_intervals = function() {

      var intervals = [];
      var elapsed = 0;
      for (var i = 0; i < this.cycles; i++) {
        let interval = Math.round((i - this.rewind_cycles) / this.cycles * (this.max_seconds - this.min_seconds) * 1000);
        interval += this.min_seconds * 1000;
        let variance = 1 + ((Math.random() * 0.25) - 0.125)
        interval *= variance;
        if (this.options.reset && this.rewind_cycles === 0 &&
            (elapsed + interval >= (this.options.reset * 1000))) {
            // Just crossed the reset boundary, the next cycle will start over at min_seconds
            this.rewind_cycles = i;
        }
        intervals.push(interval);
        elapsed += interval;
      }
      // console.log(intervals.join("\n"));
      return intervals;

  }

  Feeder.prototype.calculate_fixed_time_intervals = function() {

      var intervals = [];
      var elapsed = 0;
      while (elapsed < this.options.run_time) {
        intervals.push(this.options.interval * 1000);
        elapsed += this.options.interval*1;
      }
      return intervals;

  }


  return Feeder;
}();

exports.default = Feeder;
module.exports = exports["default"];