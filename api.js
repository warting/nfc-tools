'use strict';

const Homey = require('homey');

module.exports = [{
  method: 'POST',
  path: '/play',
  public: true,
  fn(args, callback) {
    var result = Homey.app.play(args.body);
    callback(null, result);
  }
}]
