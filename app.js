'use strict';

const Homey = require('homey');

class NfcToolsApp extends Homey.App {

  async onInit() {
    this.log('NFC tools app is running');

    this.nfcTouched = this.homey.flow.getTriggerCard('nfc_touched');

    this.homey.nfc.on('tag', async (tag) => {
      const uid = String(tag.uid);

      // Random per-scan UIDs (https://stackoverflow.com/a/9800750)
      if (uid.startsWith('08')) return;

      await this.handleScan({ uid }).catch(this.error);
    });

    await this.registerCloudWebhook();
  }

  async registerCloudWebhook() {
    const id = Homey.env.WEBHOOK_ID;
    const secret = Homey.env.WEBHOOK_SECRET;
    if (!id || !secret) {
      this.log('Cloud webhook disabled: WEBHOOK_ID/WEBHOOK_SECRET not set in env.json');
      return;
    }

    this.cloudWebhook = await this.homey.cloud.createWebhook(id, secret, {});
    this.cloudWebhook.on('message', async ({ query, body }) => {
      const src = (body && typeof body === 'object') ? { ...query, ...body } : { ...query };
      const uid = String(src.uid ?? src.id ?? '').trim();
      const value = String(src.value ?? src.data ?? '').trim();
      const title = String(src.title ?? '').trim();
      if (!uid && !value && !title) {
        this.log('Webhook: ignoring empty payload', { query, body });
        return;
      }
      await this.handleScan({ uid, value, title, viaWebhook: true }).catch(this.error);
    });

    const homeyId = await this.homey.cloud.getHomeyId();
    this.log(`Cloud webhook registered: https://webhooks.athom.com/webhook/${id}?homey=${homeyId}`);
  }

  async handleScan({ uid, value = '', title = '', viaWebhook = false }) {
    const cards = this.homey.settings.get('cards') || [];

    let card = uid ? cards.find(c => c.uid === uid) : null;
    if (!card && viaWebhook && value) card = cards.find(c => c.value === value);
    if (!card && viaWebhook && title) card = cards.find(c => c.title === title);
    const isFirstScan = !card;

    if (isFirstScan) {
      const fakeUid = uid || `phone:${value || title || Date.now()}`;
      card = { uid: fakeUid, value, title, blips: 0, lastUsed: 0 };
      cards.push(card);
    } else if (viaWebhook) {
      if (value && !card.value) card.value = value;
      if (title && !card.title) card.title = title;
    }

    // Hub-antenna first scan = register only (user fills metadata in settings, then later scans fire).
    // Webhook first scan with metadata = fire immediately (URL already carries the user's intent).
    const shouldPlay = !isFirstScan || (viaWebhook && (value || title));

    if (shouldPlay) {
      try {
        await this.play(card);
      } catch (err) {
        this.error(err);
      }
      card.blips++;
      card.lastUsed = Date.now();
      cards.sort((a, b) => b.blips - a.blips);
    }

    this.homey.settings.set('cards', cards);
    this.homey.api.realtime('cards', cards).catch(this.error);
  }

  async play(card) {
    this.log('play', card);
    return this.nfcTouched.trigger({
      data: card.value,
      title: card.title,
      count: card.blips,
      id: card.uid,
    });
  }

}

module.exports = NfcToolsApp;
