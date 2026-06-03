// content.js - читает данные карточки на Яндекс.Картах

function extractCardData() {
  const data = {
    name: '',
    rating: '',
    reviewCount: '',
    phones: [],
    hasOnlineBooking: false,
    photoCount: 0,
    hasHighlights: false,
    hasNews: false,
    hasProducts: false,
    productsOutdated: false,
    hasWorkingHours: false,
    category: '',
    address: '',
    hasMenu: false
  };

  try {
    // Название организации
    const nameEl = document.querySelector(
      '.card-title-view__title-link, [class*="orgpage-header-view__name"]'
    );
    if (nameEl) data.name = nameEl.innerText.trim();

    // Рейтинг
    const ratingEl = document.querySelector(
      '[class*="business-rating-badge-view__rating"], [class*="rating__value"]'
    );
    if (ratingEl) data.rating = ratingEl.innerText.trim();

    // Количество отзывов
    const reviewEl = document.querySelector(
      '[class*="business-rating-badge-view__count"], [class*="rating__count"]'
    );
    if (reviewEl) data.reviewCount = reviewEl.innerText.replace(/[^0-9]/g, '');

    // Категория
    const categoryEl = document.querySelector(
      '[class*="orgpage-header-view__categories"], [class*="business-card-title-view__categories"]'
    );
    if (categoryEl) data.category = categoryEl.innerText.trim();

    // Адрес
    const addressEl = document.querySelector(
      '[class*="orgpage-header-view__address"], [class*="business-contacts-view__address"]'
    );
    if (addressEl) data.address = addressEl.innerText.trim();

    // Телефоны - собираем все видимые номера
    const phoneEls = document.querySelectorAll(
      '[class*="business-contacts-view__phone"], [href^="tel:"], [class*="phone"]'
    );
    const phones = new Set();
    phoneEls.forEach(el => {
      const href = el.getAttribute('href');
      if (href && href.startsWith('tel:')) {
        phones.add(href.replace('tel:', '').trim());
      } else {
        const text = el.innerText.trim();
        if (text && text.match(/[\d\+\-\(\) ]{7,}/)) {
          phones.add(text);
        }
      }
    });
    data.phones = [...phones];

    // Кнопка онлайн-записи
    data.hasOnlineBooking = !!document.querySelector('.business-card-title-view__call-to-action');

    // Фотографии — берём число из лейбла шапки
    const photoLabelEl = document.querySelector('.card-header-media-view__label');
    if (photoLabelEl) {
      const match = photoLabelEl.innerText.match(/\d+/);
      if (match) data.photoCount = parseInt(match[0]);
    } else {
      const photoEls = document.querySelectorAll(
        '[class*="photo-album"], [class*="business-photo"], [class*="gallery"] img'
      );
      data.photoCount = photoEls.length;
    }

    // Хайлайты (особенности/фичи)
    const highlightEls = document.querySelectorAll(
      '[class*="business-stories-view"]'
    );
    data.hasHighlights = highlightEls.length > 0;

    // Новости
    const newsCardEl = document.querySelector('.business-posts-card-view');
    if (newsCardEl) {
      data.hasNews = true;
    } else {
      const newsTabEls = document.querySelectorAll('[class*="tabs-select-view__title"][class*="_name_posts"]');
      for (const el of newsTabEls) {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const match = ariaLabel.match(/Новости,\s*(\d+)/);
        if (match && parseInt(match[1]) > 0) {
          data.hasNews = true;
          break;
        }
      }
    }

    // Товары и услуги
    const productsEl = document.querySelector('.card-related-products-view, .tabs-select-view__title._name_prices');
    if (productsEl) {
      data.hasProducts = true;
      const rightContent = document.querySelector('.card-related-products-view__right-content');
      if (rightContent && rightContent.innerText.includes('Давно не обновлялось')) {
        data.productsOutdated = true;
      }
    }

    // Меню/прайс
    const menuEls = document.querySelectorAll('[class*="menu"], [class*="price-list"]');
    data.hasMenu = menuEls.length > 0;

    // График работы
    const workingStatusEl = document.querySelector('.business-card-working-status-view');
    data.hasWorkingHours = !!workingStatusEl;

  } catch (e) {
    console.error('Ошибка при парсинге карточки:', e);
  }

  return data;
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractCardData();
    sendResponse(data);
  }
});
