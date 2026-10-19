window.CPRHero = window.CPRHero || {};

CPRHero.leaderboard = {
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  render(entries, listEl) {
    if (!entries || entries.length === 0) {
      listEl.innerHTML = '<li><span>No scores yet. Be the first hero!</span><span></span></li>';
      return;
    }

    listEl.innerHTML = entries.map((entry, index) =>
      `<li><span>#${index + 1} ${this.escapeHtml(entry.name)}</span><span>${entry.score} pts</span></li>`
    ).join('');
  },

  async fetch() {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to load leaderboard');
    }
    return response.json();
  },

  async submit(name, score) {
    const response = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save score');
    }

    return response.json();
  }
};
