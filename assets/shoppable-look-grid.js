(function () {

  function closeAllTiles(except) {
    document.querySelectorAll('.shoppable-tile.is-open').forEach(function (tile) {
      if (tile !== except) {
        tile.classList.remove('is-open');
        var toggle = tile.querySelector('[data-tile-toggle]');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function setupTile(tile) {
    var toggle = tile.querySelector('[data-tile-toggle]');
    var minicard = tile.querySelector('[data-tile-minicard]');

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        var isOpen = tile.classList.contains('is-open');
        closeAllTiles(tile);
        tile.classList.toggle('is-open', !isOpen);
        toggle.setAttribute('aria-expanded', String(!isOpen));
      });
    }

    if (minicard) {
      minicard.addEventListener('click', function (event) {
        event.stopPropagation();
        var dialog = document.getElementById(minicard.getAttribute('aria-controls'));
        tile.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        if (dialog) dialog.showModal();
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-tile]').forEach(setupTile);

    document.addEventListener('click', function () {
      closeAllTiles();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllTiles();
    });
  }

  init();
})();
