'use strict';

const Homey = require('homey');

module.exports = {
  async play({ homey, body }) {
    return homey.app.play(body);
  },

  async webhook({ homey }) {
    const id = Homey.env.WEBHOOK_ID;
    if (!id) return { configured: false, url: null };
    const homeyId = await homey.cloud.getHomeyId();
    return {
      configured: true,
      url: `https://webhooks.athom.com/webhook/${id}?homey=${homeyId}`,
    };
  },
};
