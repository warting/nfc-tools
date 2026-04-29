'use strict';

module.exports = {
  async play({ homey, body }) {
    return homey.app.play(body);
  },
};
