// // 5038035009
// // 6137197627:AAFv8H2MsVKcnqMum7PoyqwK5ltishItAzE
const puppeteer = require('puppeteer');

// const goodId = prompt("Введите айди товара: ")
// const merchantId = prompt("Введите айди товара: ")

const goodsAndMerchants = [
    // { goodId: goodId, merchantId: merchantId},
    // { goodId: 100060825475, merchantId: 99804 },
    // { goodId: 100061779892, merchantId: 99804 },
    // { goodId: 100060825477, merchantId: 99804 },
    // { goodId: 100060825468, merchantId: 99804 },
    // { goodId: 100060825480, merchantId: 99804 },
    // { goodId: 100061818497, merchantId: 40440 },
    {goodId: 100060825481, merchantId: 40440},
    // { goodId: 100062422172, merchantId: 9110},
];

// объекты для хранения предыдущих значений для каждого товара
const previousData = {};
goodsAndMerchants.forEach(({ goodId, merchantId }) => {
    previousData[`${goodId}_${merchantId}`] = {
        previousPrice: null,
        previousBonusPercent: null,
        previousBonusQuantity: null
    };
});

async function getProductInfo(page, goodId, merchantId) {
    const url = `https://megamarket.ru/promo-page/details/#?slug=${goodId}&merchantId=${merchantId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Получаем название товара
    // await page.waitForSelector('your selector')
    const goodsTitleElement = await page.waitForSelector('.pdp-header__title');
    const goodsTitle = await goodsTitleElement.evaluate(element => element.textContent);

    // Получаем цену товара
    const priceElement = await page.waitForSelector('.sales-block-offer-price__price-final');
    const price = await priceElement.evaluate(element => element.textContent);

    // Получаем проценты бонусов
    const percentOfBonusesElement = await page.waitForSelector('.bonus-percent');
    const percentOfBonuses = await percentOfBonusesElement.evaluate(element => element.textContent);

    // Получаем количество бонусов
    const quantityOfBonusesElement = await page.waitForSelector('.bonus-amount');
    const quantityOfBonuses = await quantityOfBonusesElement.evaluate(element => element.textContent);

    const key = `${goodId}_${merchantId}`;
    const { previousPrice, previousBonusPercent, previousBonusQuantity } = previousData[key];

    // Сравниваем текущую цену с предыдущей
    if (previousPrice !== null && price !== previousPrice || previousBonusPercent !== null && percentOfBonuses !== previousBonusPercent || previousBonusQuantity !== null && quantityOfBonuses !== previousBonusQuantity) {
        // Цена изменилась, выполняем действие (например, отправка сообщения)
        sendTelegramMessage(`🚨 Информация о товаре:\n\n${goodsTitle}\n${url}\nЦена:\nСтарая цена - ${previousPrice}\nЦена сейчас - ${price} ₽\nБонусы:\nСтарый бонус - ${previousBonusQuantity}\nБонус сейчас - ${quantityOfBonuses}\nСтарые проценты: ${previousBonusPercent}\nПроценты сейчас: ${percentOfBonuses}`);
        
        // Возвращаем информацию после отправки сообщения
        return {
            goodsTitle,
            url,
            previousPrice,
            price,
            previousBonusQuantity,
            quantityOfBonuses,
            previousBonusPercent,
            percentOfBonuses
        };
    }

    // Обновляем данные
    previousData[key] = {
        previousPrice: price,
        previousBonusPercent: percentOfBonuses,
        previousBonusQuantity: quantityOfBonuses
    };
}

async function sendTelegramMessage(message) {
    const telegramBotToken = '6409007829:AAH-IgR14WYWgr7tg8a_YYk4u7eTcdDvoJA';
    // const chatId = '5038035009';
    const chatId = '627967659';
    const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const requestBody = {
        chat_id: chatId,
        text: message
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// // Отправляем сообщение в телеграм
// if (favoriteOffer.bonusAmount !== bonusAmount) {
//     sendTelegramMessage(`🚨 Информация о товаре:\n\n${goods.title}\n${goods.webUrl}\nЦена:\nСтарая цена - ${priceFrom}\nЦена сейчас - ${price} ₽\nБонусы:\nСтарый бонус - ${favoriteOffer.bonusAmount}\nБонус сейчас - ${bonusAmount}`);
// } else {
//     console.log('Изменений в цене или бонусах не обнаружено.');
// }

// Запускаем функцию каждую секунду
async function startParser() {
    // Запускаем цикл по всем товарам и торговцам
    for (const { goodId, merchantId } of goodsAndMerchants) {
        // Запускаем новый экземпляр браузера для каждой ссылки
        const browser = await puppeteer.launch({ headless: false, args: ['--incognito'] });
        const page = await browser.newPage();
        page.setViewport({ width: 1501, height: 1980 });

        // Устанавливаем интервал для каждой страницы
        setInterval(async () => {
            await page.reload({ waitUntil: "domcontentloaded" });
            const productInfo = await getProductInfo(page, goodId, merchantId);
            if (productInfo) {
                // Используйте информацию о товаре здесь, если нужно
                console.log('Product Info:', productInfo);
                return productInfo
            }
        }, 10000); // Перезагрузка каждые 10 секунд (можно изменить по необходимости)
    }
};

// startParser();

module.exports = {
    getProductInfo,
    sendTelegramMessage,
    startParser,
    previousData
};
