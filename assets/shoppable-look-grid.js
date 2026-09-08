(function () {
  function findVariant(variants, selectedOptions) {
    if (selectedOptions.indexOf('') !== -1) return null;
    for (var i = 0; i < variants.length; i++) {
      var options = variants[i].options;
      var matches = true;
      for (var j = 0; j < selectedOptions.length; j++) {
        if (options[j] !== selectedOptions[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return variants[i];
    }
    return null;
  }

  function setupDialog(dialog) {
    var variantsScript = dialog.querySelector('[data-quick-view-variants]');
    var variants = variantsScript ? JSON.parse(variantsScript.textContent) : [];
    var swatchGroups = Array.prototype.slice.call(dialog.querySelectorAll('.quick-view-dialog__swatches'));
    var selects = Array.prototype.slice.call(dialog.querySelectorAll('.quick-view-dialog__select'));
    var optionGroups = swatchGroups.concat(selects).sort(function (a, b) {
      return Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex);
    });

    var priceEl = dialog.querySelector('[data-quick-view-price]');
    var addButton = dialog.querySelector('[data-quick-view-add-to-cart]');
    var statusEl = dialog.querySelector('[data-quick-view-status]');
    var addLabel = addButton ? addButton.querySelector('[data-quick-view-add-text]') : null;

    function getSelectedOptions() {
      return optionGroups.map(function (group) {
        if (group.classList.contains('quick-view-dialog__swatches')) {
          var selected = group.querySelector('.is-selected');
          return selected ? selected.dataset.optionValue : '';
        }
        return group.value;
      });
    }

    function refresh() {
      var selectedOptions = getSelectedOptions();
      var variant = findVariant(variants, selectedOptions);
      dialog._currentVariant = variant;

      if (!addButton) return;

      if (!variant) {
        addButton.disabled = false;
        return;
      }

      if (priceEl) priceEl.textContent = variant.price;
      addButton.disabled = !variant.available;
      if (statusEl && !variant.available) {
        statusEl.textContent = 'This variant is sold out.';
      } else if (statusEl) {
        statusEl.textContent = '';
      }
    }

    swatchGroups.forEach(function (group) {
      group.querySelectorAll('.quick-view-dialog__swatch').forEach(function (button) {
        button.addEventListener('click', function () {
          group.querySelectorAll('.quick-view-dialog__swatch').forEach(function (sibling) {
            sibling.classList.remove('is-selected');
            sibling.setAttribute('aria-pressed', 'false');
          });
          button.classList.add('is-selected');
          button.setAttribute('aria-pressed', 'true');
          refresh();
        });
      });
    });

    selects.forEach(function (select) {
      select.addEventListener('change', refresh);
    });

    if (addButton) {
      addButton.addEventListener('click', function () {
        addToCart(dialog, addButton, addLabel, statusEl);
      });
    }

    dialog._resetSelections = function () {
      swatchGroups.forEach(function (group) {
        var buttons = group.querySelectorAll('.quick-view-dialog__swatch');
        buttons.forEach(function (button, index) {
          button.classList.toggle('is-selected', index === 0);
          button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
        });
      });
      selects.forEach(function (select) {
        select.value = '';
      });
      if (statusEl) statusEl.textContent = '';
      if (addButton) addButton.disabled = false;
      refresh();
    };

    refresh();
  }

  function updateCartCountFallback() {
    fetch('/cart.js')
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {
        document.querySelectorAll('[data-cart-count], .cart-count-bubble').forEach(function (el) {
          el.textContent = cart.item_count;
        });
      })
      .catch(function () {});
  }

  function addToCart(dialog, addButton, addLabel, statusEl) {
    var variant = dialog._currentVariant;

    if (!variant) {
      if (statusEl) statusEl.textContent = 'Please select all options before adding to cart.';
      return;
    }

    if (!variant.available) {
      if (statusEl) statusEl.textContent = 'This variant is sold out.';
      return;
    }

    var sectionEl = dialog.closest('.shoppable-grid-section');
    var items = [{ id: variant.id, quantity: 1 }];
    var bundleAdded = false;

    if (sectionEl) {
      var triggerA = (sectionEl.dataset.bundleTriggerA || '').trim().toLowerCase();
      var triggerB = (sectionEl.dataset.bundleTriggerB || '').trim().toLowerCase();
      var bundleAvailable = sectionEl.dataset.bundleAvailable === 'true';
      var bundleVariantId = sectionEl.dataset.bundleVariantId;

      if (triggerA && triggerB && bundleAvailable && bundleVariantId) {
        var selectedValues = variant.options.map(function (value) {
          return (value || '').trim().toLowerCase();
        });
        if (selectedValues.indexOf(triggerA) !== -1 && selectedValues.indexOf(triggerB) !== -1) {
          items.push({ id: Number(bundleVariantId), quantity: 1 });
          bundleAdded = true;
        }
      }
    }

    var originalLabel = addLabel ? addLabel.textContent : '';
    if (addButton) addButton.disabled = true;
    if (addLabel) addLabel.textContent = 'Adding...';
    if (statusEl) statusEl.textContent = '';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ items: items }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error(data.description || 'Unable to add to cart.');
          }
          return data;
        });
      })
      .then(function () {
        var sectionEl2 = dialog.closest('.shoppable-grid-section');
        var message = sectionEl2 ? sectionEl2.dataset.bundleMessage : '';
        if (statusEl) statusEl.textContent = bundleAdded && message ? message : 'Added to cart.';
        document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
        updateCartCountFallback();
        setTimeout(function () {
          dialog.close();
        }, 900);
      })
      .catch(function (error) {
        if (statusEl) statusEl.textContent = error.message || 'Something went wrong. Please try again.';
      })
      .finally(function () {
        if (addButton) addButton.disabled = false;
        if (addLabel) addLabel.textContent = originalLabel;
      });
  }

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

    document.querySelectorAll('[data-quick-view]').forEach(function (dialog) {
      setupDialog(dialog);

      var closeButton = dialog.querySelector('[data-quick-view-close]');
      if (closeButton) {
        closeButton.addEventListener('click', function () {
          dialog.close();
        });
      }

      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) {
          dialog.close();
        }
      });

      dialog.addEventListener('close', function () {
        if (dialog._resetSelections) dialog._resetSelections();
      });
    });
  }

  init();
})();