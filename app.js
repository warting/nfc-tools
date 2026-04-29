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

      const cards = this.homey.settings.get('cards') || [];
      const card = cards.find(c => c.uid === uid);

      if (card) {
        try {
          await this.play(card);
        } catch (err) {
          this.error(err);
        }
        card.blips++;
        card.lastUsed = Date.now();
        cards.sort((a, b) => b.blips - a.blips);
      } else {
        cards.push({
          uid,
          value: '',
          title: '',
          blips: 0,
          lastUsed: 0,
        });
      }

      this.homey.settings.set('cards', cards);
      this.homey.api.realtime('cards', cards).catch(this.error);
    });
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
