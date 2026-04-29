var Homey;
var app;

function onHomeyReady(HomeyInstance) {
  Homey = HomeyInstance;

  app = new Vue({
    el: '#content',
    data: {
      cards: [],
      webhookUrl: '',
      webhookConfigured: false,
    },
    mounted() {
      Homey.get('cards', (err, cards) => {
        if (err) return Homey.alert(err);
        this.cards = cards || [];
      });

      Homey.on('cards', (cards) => {
        this.cards = cards || [];
      });

      Homey.api('GET', '/webhook', (err, result) => {
        if (err) return; // surface nothing — webhook is optional
        this.webhookConfigured = !!(result && result.configured);
        this.webhookUrl = (result && result.url) || '';
      });
    },
    methods: {
      updateValue() {
        Homey.set('cards', this.cards, () => {});
      },
      play(card) {
        Homey.api('POST', '/play', card, function(err) {
          if (err) return Homey.alert(err);
        });
      },
      remove(card) {
        const idx = this.cards.indexOf(card);
        this.cards.splice(idx, 1);
        Homey.set('cards', this.cards, () => {});
      },
      copyWebhookUrl() {
        const input = this.$refs.webhookUrlInput;
        input.select();
        try {
          document.execCommand('copy');
        } catch (e) {
          Homey.alert('Copy failed — select the URL and copy manually.');
        }
      },
    },
  });

  Homey.ready();
}
