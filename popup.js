// popup.js

let currentCardData = null;
let currentMessage = '';

// ─── SCREENS ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── TOAST ──────────────────────────────────────────────────
function showToast(msg = 'Скопировано!') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── OPEN APP ────────────────────────────────────────────────
function openApp(url) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (u) => { window.open(u, '_blank'); },
      args: [url]
    });
  });
}

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isYandexMaps = tab && tab.url && (
    tab.url.includes('yandex.ru/maps') ||
    tab.url.includes('yandex.com/maps')
  );

  if (isYandexMaps) {
    showScreen('screenReady');
  } else {
    showScreen('screenNotMaps');
  }
});

// ─── SETTINGS ────────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(['apiKey', 'userName'], (result) => {
    if (result.apiKey) document.getElementById('apiKeyInput').value = result.apiKey;
    if (result.userName) document.getElementById('nameInput').value = result.userName;
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  showScreen('screenSettings');
});

document.getElementById('backFromSettings').addEventListener('click', () => {
  if (currentCardData) showScreen('screenData');
  else showScreen('screenReady');
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const userName = document.getElementById('nameInput').value.trim();
  chrome.storage.local.set({ apiKey, userName }, () => {
    showToast('Настройки сохранены!');
    setTimeout(() => {
      if (currentCardData) showScreen('screenData');
      else showScreen('screenReady');
    }, 800);
  });
});

// ─── ANALYZE ─────────────────────────────────────────────────
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  showScreen('screenAnalyzing');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (e) {}

  chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (data) => {
    if (chrome.runtime.lastError || !data) {
      showScreen('screenReady');
      return;
    }
    currentCardData = data;
    renderCardData(data);
    showScreen('screenData');
  });
});

// ─── RENDER CARD DATA ─────────────────────────────────────────
function renderCardData(data) {
  const phonesHtml = data.phones.length > 0
    ? `<div class="phones-section">
        <div class="section-label">Контакты</div>
        ${data.phones.map(phone => {
          const clean = phone.replace(/[^0-9+]/g, '');
          return `<div class="phone-item">
            <span class="phone-number">${phone}</span>
            <div class="phone-actions">
              <button class="phone-btn phone-btn-wa" data-action="wa" data-phone="${clean}">WA</button>
              <button class="phone-btn phone-btn-tg" data-action="tg" data-phone="${clean}">TG</button>
              <button class="phone-btn phone-btn-copy" data-action="copy" data-phone="${phone}">📋</button>
            </div>
          </div>`;
        }).join('')}
      </div>`
    : `<div class="phones-section">
        <div class="section-label">Контакты</div>
        <div style="color:var(--text2);font-size:12px;padding:8px 0;">Нажми "Показать номер" на странице, затем анализируй снова</div>
      </div>`;

  const ratingHtml = data.rating
    ? `<div style="font-size:13px;font-weight:600;color:var(--yellow);white-space:nowrap">⭐ ${data.rating}${data.reviewCount ? ` <span style="color:var(--text2);font-size:11px">(${data.reviewCount})</span>` : ''}</div>`
    : '';

  const photoIcon = data.photoCount >= 30 ? '✅' : data.photoCount >= 15 ? '⚠️' : '❌';
  const photoColor = data.photoCount >= 30 ? 'var(--green)' : data.photoCount >= 15 ? 'var(--yellow)' : 'var(--red)';
  const photoValue = data.photoCount > 0 ? `${data.photoCount} шт` : 'Нет';

  document.getElementById('cardInfo').innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
      <div class="card-name" style="margin-bottom:0">${data.name || 'Без названия'}</div>
      ${ratingHtml}
    </div>
    <div class="card-meta">${data.category || ''} ${data.address ? '· ' + data.address : ''}</div>

    <div class="checks-grid">
      <div class="check-item">
        <span class="check-icon">${data.hasOnlineBooking ? '✅' : '❌'}</span>
        <div>
          <div class="check-label">Онлайн-запись</div>
          <div class="check-value" style="color:${data.hasOnlineBooking ? 'var(--green)' : 'var(--red)'}">
            ${data.hasOnlineBooking ? 'Есть' : 'Нет'}
          </div>
        </div>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.hasHighlights ? '✅' : '❌'}</span>
        <div>
          <div class="check-label">Хайлайты</div>
          <div class="check-value" style="color:${data.hasHighlights ? 'var(--green)' : 'var(--red)'}">
            ${data.hasHighlights ? 'Есть' : 'Нет'}
          </div>
        </div>
      </div>
      <div class="check-item">
        <span class="check-icon">${photoIcon}</span>
        <div>
          <div class="check-label">Фото</div>
          <div class="check-value" style="color:${photoColor}">${photoValue}</div>
        </div>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.hasWorkingHours ? '✅' : '❌'}</span>
        <div>
          <div class="check-label">График работы</div>
          <div class="check-value" style="color:${data.hasWorkingHours ? 'var(--green)' : 'var(--red)'}">
            ${data.hasWorkingHours ? 'Есть' : 'Нет'}
          </div>
        </div>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.hasNews ? '✅' : '❌'}</span>
        <div>
          <div class="check-label">Новости</div>
          <div class="check-value" style="color:${data.hasNews ? 'var(--green)' : 'var(--red)'}">
            ${data.hasNews ? 'Есть' : 'Нет'}
          </div>
        </div>
      </div>
      <div class="check-item">
        <span class="check-icon">${data.hasProducts ? (data.productsOutdated ? '⚠️' : '✅') : '❌'}</span>
        <div>
          <div class="check-label">Товары и услуги</div>
          <div class="check-value" style="color:${data.hasProducts ? (data.productsOutdated ? 'var(--yellow)' : 'var(--green)') : 'var(--red)'}">
            ${data.hasProducts ? (data.productsOutdated ? 'Не обновлялось' : 'Есть') : 'Нет'}
          </div>
        </div>
      </div>
    </div>

    ${phonesHtml}
    <div class="divider"></div>
  `;
}

// ─── GENERATE MESSAGE ─────────────────────────────────────────
document.getElementById('generateBtn').addEventListener('click', () => generateMessage());
document.getElementById('regenerateBtn').addEventListener('click', () => generateMessage());

async function generateMessage() {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);

  if (!apiKey) {
    showScreen('screenSettings');
    return;
  }

  showScreen('screenGenerating');

  try {
    const message = await callClaude(apiKey, currentCardData);
    currentMessage = message;
    renderMessage(message);
    showScreen('screenMessage');
  } catch (e) {
    showScreen('screenData');
    alert('Ошибка при генерации: ' + e.message);
  }
}

// ─── CLAUDE API ───────────────────────────────────────────────
async function callClaude(apiKey, data) {
  const issues = [];
  if (!data.hasOnlineBooking) issues.push('нет кнопки онлайн-записи');
  if (!data.hasHighlights) issues.push('нет хайлайтов');
  if (data.photoCount < 15) issues.push(`очень мало фотографий (${data.photoCount} шт)`);
  else if (data.photoCount < 30) issues.push(`недостаточно фотографий (${data.photoCount} шт, желательно 30+)`);
  if (!data.hasWorkingHours) issues.push('не указан график работы');
  if (!data.hasNews) issues.push('нет раздела новостей');
  if (!data.hasProducts) issues.push('нет раздела товаров и услуг');
  else if (data.productsOutdated) issues.push('раздел товаров и услуг давно не обновлялся');

  const prompt = `Ты копирайтер для холодных сообщений в мессенджерах. Напиши персонализированное холодное сообщение для салона красоты на основе данных их карточки в Яндекс.Картах.

ДАННЫЕ КАРТОЧКИ:
- Название: ${data.name || 'не указано'}
- Рейтинг: ${data.rating || 'не указан'}
- Отзывов: ${data.reviewCount || 'неизвестно'}
- Онлайн-запись: ${data.hasOnlineBooking ? 'есть' : 'НЕТ'}
- Хайлайты: ${data.hasHighlights ? 'есть' : 'НЕТ'}
- Фото: ${data.photoCount > 0 ? data.photoCount + ' шт' : 'нет'}
- Новости: ${data.hasNews ? 'есть' : 'НЕТ - раздел не заполнен'}
- Товары и услуги: ${data.hasProducts ? (data.productsOutdated ? 'есть, но давно не обновлялось' : 'есть') : 'НЕТ - раздел отсутствует'}
- Проблемы: ${issues.length > 0 ? issues.join(', ') : 'карточка хорошо заполнена'}

ПРАВИЛА НАПИСАНИЯ:
- Живой человеческий тон, без канцелярщины
- 4-6 предложений максимум
- Без длинных тире, только дефисы или запятые
- Структура: приветствие + смайлик → что уже хорошо → точки роста (3-4 проблемы максимум, не все) → факт про 70 млн пользователей Яндекс.Карт → предложение до-после → мягкий CTA → p.s.
- 2-4 смайлика на всё сообщение; приветствующий смайлик - 🌸, дополнительно можно использовать: ⚡ 👀 🎯 📊
- Никогда не писать "привет" - только "Добрый день" или "Здравствуйте"
- Никогда не писать "заглянул" - только "посмотрел"
- Никогда не писать "три момента" или "два момента" - только "есть моменты" или "некоторые моменты"
- НЕ упоминать "услуги и цены" как проблему
- ${data.hasOnlineBooking ? 'Онлайн-запись есть - НЕ упоминать её как проблему' : 'Онлайн-записи нет - упомянуть как одну из точек роста'}
- Не обязательно перечислять все проблемы - достаточно упомянуть 3-4 любых из списка
- ${data.photoCount < 15 ? `Фотографий очень мало (${data.photoCount} шт) - ОБЯЗАТЕЛЬНО упомянуть в сообщении, написать что-то вроде: "Сейчас в вашей карточке мало фотографий работ - советую выложить больше, потому что это напрямую влияет на доверие клиентов и конверсию в запись"` : data.photoCount < 30 ? `Фотографий немного (${data.photoCount} шт) - можно упомянуть как одну из точек роста, например: "Я бы рекомендовал опубликовать больше продающих фото работ, интерьера и сотрудников"` : 'Фотографий достаточно (30+) - НЕ упоминать как проблему'}
- ${!data.hasProducts ? 'Раздел "Товары и услуги" отсутствует - обязательно подсветить это как заметную упущенную возможность' : data.productsOutdated ? 'Раздел "Товары и услуги" давно не обновлялся - обязательно отметить это' : 'Раздел "Товары и услуги" в порядке - не упоминать как проблему'}
- ${!data.hasNews ? 'Раздел "Новости" не заполнен - упомянуть это в тексте' : 'Раздел "Новости" есть - НЕ упоминать как проблему'}
- Вместо разговора об описании - упомяни пару слов про грамотную семантическую настройку карточки и SEO-оптимизацию, чтобы карточка лучше находилась по нужным запросам
- Обязательно включить это предложение дословно: "Я могу показать, как конкретно можно усилить вашу карточку - сделаю пример до-после, чтобы вы наглядно увидели разницу. Это бесплатно и без каких-либо обязательств - просто сможете оценить."
- После фразы "Интересно?)" или "Хотите, покажу?)" на отдельной строке добавить: "p.s. А пока высылаю вам один из наших недавних кейсов для понимания того, как это может выглядеть : )"
- Заканчивать фразой "Интересно?)" или "Хотите, покажу?)" - чередовать случайно, ПОСЛЕ неё идёт p.s.
- Один пустой абзац между параграфами

Напиши только само сообщение, без пояснений.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Ошибка API');
  }

  const result = await response.json();
  return result.content[0].text.trim();
}

// ─── RENDER MESSAGE ───────────────────────────────────────────
function renderMessage(message) {
  document.getElementById('messageBox').textContent = message;

  const phones = currentCardData?.phones || [];
  const phonesHtml = phones.length > 0
    ? `<div class="phones-section">
        <div class="section-label">Отправить</div>
        ${phones.map(phone => {
          const clean = phone.replace(/[^0-9+]/g, '');
          return `<div class="phone-item">
            <span class="phone-number">${phone}</span>
            <div class="phone-actions">
              <button class="phone-btn phone-btn-wa" data-action="wa-msg" data-phone="${clean}">WA</button>
              <button class="phone-btn phone-btn-tg" data-action="tg" data-phone="${clean}">TG</button>
            </div>
          </div>`;
        }).join('')}
      </div>`
    : '';

  document.getElementById('phonesBlock').innerHTML = phonesHtml;
}

// ─── COPY ─────────────────────────────────────────────────────
document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(currentMessage).then(() => showToast());
});

// ─── COPY CASE ────────────────────────────────────────────────
document.getElementById('copyCaseBtn').addEventListener('click', async () => {
  try {
    const url = chrome.runtime.getURL('case.png');
    const response = await fetch(url);
    if (!response.ok) throw new Error('not found');
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    showToast('Кейс скопирован — вставьте следующим сообщением');
  } catch (e) {
    showToast('Файл case.png не найден в папке расширения');
  }
});

// ─── BACK ─────────────────────────────────────────────────────
document.getElementById('backToDataBtn').addEventListener('click', () => {
  showScreen('screenData');
});

// ─── ГЛОБАЛЬНЫЙ ОБРАБОТЧИК КНОПОК ────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const phone = btn.dataset.phone;

  if (action === 'wa') {
    openApp(`whatsapp://send?phone=${phone}`);
  }

  if (action === 'wa-msg') {
    openApp(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(currentMessage)}`);
  }

  if (action === 'tg') {
    openApp(`tg://resolve?phone=${phone}`);
  }

  if (action === 'copy') {
    navigator.clipboard.writeText(phone).then(() => showToast('Скопировано!'));
  }
});
