var Homey;
var app;

function onHomeyReady(HomeyInstance) {
  Homey = HomeyInstance;

  app = new Vue({
    el: '#content',
    data: {
      cards: []
    },
    mounted() {
      Homey.get('cards', (err, cards) => {
        if (err) return Homey.alert(err);
        this.cards = cards;
      });

      Homey.on('cards', (cards) => {
        console.log('cards changed', cards)
        this.cards = cards;
      });
    },
    methods: {
      updateValue() {
        Homey.set('cards', this.cards, () => {});
      },
      play(card) {
        Homey.api('POST', '/play', card, function(err, result) {
          if (err) return Homey.alert(err);
        });
      },
      remove(card) {
        const idx = this.cards.indexOf(card);
        this.cards.splice(idx, 1);
        Homey.set('cards', this.cards, () => {});
      }
    }
  });

  Homey.ready();
}
