/*
  Remote PI API
*/

const express = require('express'),
      async = require('async'),
      moment = require('moment'),
      os = require('os'),
      ip = require('ip'),
      sensor = require('node-dht-sensor'),
      gpio = require('rpi-gpio');

const routes = require('./routes'),
      ipFilter = require('./ipfilter');

// Express App
const app = express();

// Volatile Data
const bootData = app.locals.bootData = {
  date:   new Date(),
  ip:     ip.address(),
  load:   os.loadavg(),
  uptime: os.uptime()
}

// GPIO Setup
gpio.setMode(gpio.MODE_BCM);

// PIN Layout
const PINS = {
  RELAY:    4,
  DOOR_TOP: 17,
  DOOR_MID: 27,
  DOOR_BOT: 22,
  TEMP:     11
}

// Attach Sensor & GPIOs to Req
app.use(function(req,res,next) {
  req._gpio = gpio;
  req._PINS = PINS;
  next();
});

// Load API Routes
app.use(ipFilter);
app.use(routes);

// Print Log
console.log(`
###################################
#    Remote Raspberry Pi Server   #
###################################

+    Date: ${moment(bootData.date).format('lll')}
+      IP: ${ip.address()}
+    Load: ${Math.round(bootData.load[0]*100/os.cpus().length)}% / ${Math.round(bootData.load[1]*100/os.cpus().length)}% / ${Math.round(bootData.load[2]*100/os.cpus().length)}%
+  Uptime: ${moment.duration(bootData.uptime, "seconds").humanize()}
-`);

// Boot the API Server!
async.parallel([
    function(callback) {
        console.log(`+  GPIO Setup: Door Top [#${PINS.DOOR_TOP}]`);
        gpio.setup(PINS.DOOR_TOP, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
    },
    function(callback) {
        console.log(`+  GPIO Setup: Door Middle [#${PINS.DOOR_MID}]`);
        gpio.setup(PINS.DOOR_MID, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
    },
    function(callback) {
        console.log(`+  GPIO Setup: Door Bottom [#${PINS.DOOR_BOT}]`);
        gpio.setup(PINS.DOOR_BOT, gpio.DIR_IN, gpio.EDGE_BOTH, callback);
    },
    function(callback) {
        console.log(`+  GPIO Setup: Relay [#${PINS.RELAY}]`);
        gpio.setup(PINS.RELAY, gpio.DIR_LOW, callback);
    },
    function(callback) {
        console.log(`+  Setup Temperature Data`);
        app.locals.temperatureData = [];
        app.locals.temperatureCounter = 0;
        app.locals.temperatureHistory = [];

        console.log(`+  Setup Door Status`);
        app.locals.doorStatus = {
          updated:    new Date(),
          position:   'unknown',
          direction:  'unknown'
        };
        callback();
    }
],
function(err, results) {
    if (err) {
      console.log('*  API Server Failed');
    } else {
      app.listen(3009, function () {
        console.log(`+  API Ready @ ${ip.address()}:3009`);
      });
    }
});


// Timed Service
setInterval(function() {
  // Temperature Data

  const LIMIT_RECENT = 59;
  const LIMIT_HISTORY = 2000;


  if (app.locals.temperatureData.length >= LIMIT_RECENT) {
    app.locals.temperatureData.pop();
  }

  sensor.read(22, PINS.TEMP, function(err, temperature, humidity) {
    if (!err) {
      app.locals.temperatureData.unshift({
        time:     new Date(),
        temp:     temperature.toFixed(1),
        humidity: humidity.toFixed(1)
      });

      // If we've collected 60 samples, add the average to the running history
      if (app.locals.temperatureCounter >= LIMIT_RECENT) {
        app.locals.temperatureCounter = 0;

        // Only collect ~ 3 months of data (assuming averaging each hour)
        if (app.locals.temperatureHistory.length >= LIMIT_HISTORY) {
          app.locals.temperatureHistory.pop();
        }

        app.locals.temperatureHistory.unshift({
          time:     new Date(),
          temp:     app.locals.temperatureData.map(x=>+x.temp).reduce((a,b)=>a+b) / app.locals.temperatureData.length,
          humidity: app.locals.temperatureData.map(x=>+x.humidity).reduce((a,b)=>a+b) / app.locals.temperatureData.length
        });
      }

      app.locals.temperatureCounter++;

    }else{
      console.error(`*  Error reading temperature from GPIO #${PINS.TEMP}`);
    }
  });

}, 2000);


// Event Driven Service
gpio.on('change', function(channel, value) {

  let {position, direction} = app.locals.doorStatus;

  switch(channel) {
    case PINS.DOOR_TOP:

      if (value) {
        position = 'TOP';
        direction = 'STATIONARY';
      }else{
        position = 'MOVING';
        direction = 'DOWN';
      }

    break;
    case PINS.DOOR_MID:

      if (value) {
        position = 'MIDDLE';
      }else{
        position = 'MOVING';
      }

    break;
    case PINS.DOOR_BOT:

      if (value) {
        position = 'BOTTOM';
        direction = 'STATIONARY';
      }else{
        position = 'MOVING';
        direction = 'UP';
      }

    break;
  }

  console.log(`+  Door Status Change: ${position} & ${direction}`);

  app.locals.doorStatus = {
    updated: new Date(),
    position,
    direction
  }

});


// On Shutdown
process.on('SIGINT', function() {
  console.log(`-\n+  Server Shutting Down`);
  gpio.destroy(function() {
       console.log('+  GPIO Pins Released');
       process.exit();
   });
});
