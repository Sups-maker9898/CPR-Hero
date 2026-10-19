window.CPRHero = window.CPRHero || {};

CPRHero.trivia = {
  bank: [],
  usedIndices: [],
  currentIndex: -1,
  animating: false,

  setBank(questions) {
    this.bank = questions || [];
    this.reset();
  },

  reset() {
    this.usedIndices = [];
    this.currentIndex = -1;
    this.animating = false;
  },

  nextIndex() {
    const available = this.bank
      .map((_, i) => i)
      .filter((i) => !this.usedIndices.includes(i));

    if (available.length === 0) {
      this.usedIndices = [];
      return Math.floor(Math.random() * this.bank.length);
    }

    const pick = available[Math.floor(Math.random() * available.length)];
    this.usedIndices.push(pick);
    return pick;
  },

  currentQuestion() {
    return this.bank[this.currentIndex];
  }
};
