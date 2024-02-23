const puppeteer = require('puppeteer');
let previousPrice = null;
let previousBonusPercent = null;
let previousBonusQuantity = null;
let voucher = ""

async function buyGoodOnMegaMarket(goodId, merchantId, voucher) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://megamarket.ru/', { waitUntil: 'domcontentloaded' });

    await page.evaluate((goodId, merchantId, voucher) => {

        // const token = input()

        document.cookie = 'sbermegamarket_token=942fb5d1-4367-449e-afda-189581daa2f8';
        document.cookie = 'ecom_token=942fb5d1-4367-449e-afda-189581daa2f8';

        // const goodData = await parseGoods(goodId, merchant);

        //JS script for checkout
        const handleTextFieldSubmit = async (inputField) => {
            const trimmedText = inputField.value.trim();
            if (trimmedText !== '') {
                try {
                    const newCartData = JSON.parse(trimmedText);
                    const { cartId, bonusInfo, percentOfBonusInfo } = await addToCartRequest(newCartData.items, newCartData.cartInfo.type, newCartData.cartInfo.locationId);
                    console.log('Yes all super');
                    return { cartId, bonusInfo, percentOfBonusInfo };
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    console.log(inputField)
                    alert('Ошибка ввода корзины');
                    throw error;
                }
            }
        };

        async function sendTelegramMessage(message) {
            const telegramBotToken = '6409007829:AAH-IgR14WYWgr7tg8a_YYk4u7eTcdDvoJA';
            // const chatId = '5038035009';
            const chatId = '627967659'
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

        const addToCartRequest = async (items, cartType, locationId) => {
            const url = "https://megamarket.ru/api/mobile/v2/cartService/offers/add";
            const requestBody = {
                "identification": {
                    "id": null
                },
                "items": items,
                "cartType": cartType,
                "clientAddress": {
                    "address": "foo",
                    "addressId": "bar",
                    "geo": {
                        "lat": "0",
                        "lon": "0"
                    }
                },
                "locationId": locationId
            };

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Cookie": 'sbermegamarket_token=942fb5d1-4367-449e-afda-189581daa2f8; ecom_token=942fb5d1-4367-449e-afda-189581daa2f8',
                        "Sec-Fetch-Mode": "cors",
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const responseData = await response.json();
                console.log("Cart Data:", responseData);

                // Сохраняем и возвращаем id из ответа
                const cartId = responseData.identification.id;
                const bonusInfo = responseData.itemGroups[0].cashBonusInfo.chargedBonus
                const percentOfBonusInfo = responseData.itemGroups[0].cashBonusInfo.chargedBonusPercent
                return { cartId, bonusInfo, percentOfBonusInfo };

            } catch (error) {
                console.error("Error:", error.message);
                throw error;
            }
        };

        async function getDateForCheckout(cartId) {
            const url = 'https://megamarket.ru/api/mobile/v2/checkoutService/checkout/calculate';
            const requestBody = {
                "identification": {
                    "id": cartId
                },
                "isSelectedCartItemGroupsOnly": true,
                "deliveryType": "COURIER",
                "address": {
                    "addressFull": "г Москва, ул Перерва, д 43",
                    "addressId": "6955b1c8-bfdc-4b09-ab58-6c1e1c3a6aa2#43#"
                },
                "auth": {
                    "locationId": "50",
                    "appPlatform": "WEB",
                    "appVersion": 1707393661
                }
            };

            try {
                const response = await fetch(url, {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const responseData = await response.json();
                const variantId = responseData.AONEItem.variants[0].id; // Получаем значение variants.id первого элемента
                const date = responseData.AONEItem.variants[0].arrival.date
                const timeSlotFrom = responseData.AONEItem.variants[0].arrival.timeSlots[0].from
                const timeSlotTo = responseData.AONEItem.variants[0].arrival.timeSlots[0].to
                const price = responseData.AONEItem.cartItems[0].price;
                const quantity = responseData.AONEItem.cartItems[0].quantity;

                console.log("Variant ID:", variantId, date, timeSlotFrom, timeSlotTo, price, quantity);
                return { variantId, date, timeSlotFrom, timeSlotTo, price, quantity };
            } catch (error) {
                console.error("Error:", error.message);
                throw error;
            }
        }

        async function checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo) {
            const url = 'https://megamarket.ru/api/mobile/v1/checkoutService/order/create'
            const requestBody = {
                "identification": { "id": cartId },
                "deliveryType": "COURIER",
                "paymentType": "CARD_ONLINE",
                "customer": { "notMe": false, "thirdName": "", "comment": "", "firstName": "Антон", "lastName": "Могилев", "email": "anton228mogila@icloud.com", "phone": "79777088079", "phoneMisc": "", "restored": false },
                "address": {
                    "addressId": "6955b1c8-bfdc-4b09-ab58-6c1e1c3a6aa2#43#",
                    "full": "г Москва, ул Перерва, д 43",
                    "entrance": "", "intercom": "",
                    "floor": "13",
                    "flat": "110",
                    "addToMyAddresses": false
                },
                "deliveries": [{ "id": variantId, "shipmentType": 0, "date": date, "timeSlot": { "from": timeSlotFrom, "to": timeSlotTo } }],
                "flags": ["GOA_AGREEMENT"],
                "isSelectedCartItemGroupsOnly": true,
                "discounts": [{ "type": "PROMO_CODE", "voucher": voucher }], // ввод промокода
                "paymentTypeOptions": [],
                // "additionalData":{"adspire":{"type":"desktop","atmMarketing":"","atmRemarketing":"","atmCloser":""},
                // "digitalDataUserAnonymousId":"12f14bf0-9de1-11ee-85a3-8fa92af9be58","yandexCid":"1702930050368470521","googleAnalyticsClientId":"307229753.1702930051"},
                // "orderOptions":[],"auth":{"locationId":"50","appPlatform":"WEB","appVersion":1707393661}
            }

            try {
                const response = await fetch(url, {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const responseData = await response.json();
                // console.log("Response:", responseData.errors);
                // console.log("Response:", responseData);
                return responseData;
            } catch (error) {
                console.error("Error:", error.message);
                throw error;
            }

        }

        const inputField = {
            value: `{"items":[{"offer":{"merchantId": "${merchantId}" },"goods":{"goodsId": "${goodId}" },"quantity":1}],"cartInfo":{"type":"CART_TYPE_DEFAULT","locationId":""}}`
            // {"items":[{"offer":{"merchantId":${merchantId}},"goods":{"goodsId":${goodId}},"quantity":1}],"cartInfo":{"type":"CART_TYPE_DEFAULT","locationId":""}}
        };

        // Вызываем функцию start
        async function start() {
            try {
                // const token = '942fb5d1-4367-449e-afda-189581daa2f8'
                // setCookie(token)
                const { cartId, bonusInfo, percentOfBonusInfo } = await handleTextFieldSubmit(inputField);
                const { variantId, date, timeSlotFrom, timeSlotTo, price, quantity } = await getDateForCheckout(cartId);
                const responseData = await checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo, price, quantity);
                if (responseData.success == true) {
                    sendTelegramMessage(`✅✅✅Новый заказ МегаМаркет✅✅✅\n\nСумма: ${price}\nКоличество: ${quantity}\nКоличество бонусов: ${bonusInfo}\nПроценты: ${percentOfBonusInfo}`);
                } else {
                    sendTelegramMessage(`Ошибка: ${JSON.stringify(responseData.errors[0].detail)}`);
                }
            } catch (error) {
                console.error("Error:", error.message);
                throw error;
            }
        }

        return start();
    }, goodId, merchantId, voucher);
    await browser.close();
};

async function parseGoods(goodId, merchantId) {
    const url = `https://megamarket.ru/promo-page/details/#?slug=${goodId}&merchantId=${merchantId}`;
    const browser = await puppeteer.launch({ headless: false, args: ['--incognito'] });
    const page = await browser.newPage();
    page.setViewport({ width: 1501, height: 1980 });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        //title
        const goodsTitleElement = await page.waitForSelector('.pdp-header__title');
        const goodsTitle = await goodsTitleElement.evaluate(element => element.textContent);
        //price
        const priceElement = await page.waitForSelector('.sales-block-offer-price__price-final');
        const price = await priceElement.evaluate(element => element.textContent);
        //percent of bonus
        const percentOfBonusesElement = await page.waitForSelector('.bonus-percent');
        const percentOfBonuses = await percentOfBonusesElement.evaluate(element => element.textContent);
        //bonus quantity
        const quantityOfBonusesElement = await page.waitForSelector('.bonus-amount');
        const quantityOfBonuses = await quantityOfBonusesElement.evaluate(element => element.textContent);

        if ((previousPrice !== null && price !== previousPrice) || (previousBonusPercent !== null && percentOfBonuses !== previousBonusPercent) || (previousBonusQuantity !== null && quantityOfBonuses !== previousBonusQuantity)) {
            sendTelegramMessage(`🚨 Информация о товаре:\n\n${goodsTitle}\n${url}\nЦена:\nСтарая цена - ${previousPrice}\nЦена сейчас - ${price} ₽\nБонусы:\nСтарый бонус - ${previousBonusQuantity}\nБонус сейчас - ${quantityOfBonuses}\nСтарые проценты: ${previousBonusPercent}\nПроценты сейчас: ${percentOfBonuses}`);

            const goodData = { goodId, merchantId }
            return goodData
        } else {
            console.log(`🚨 Информация о товаре:\n\n${goodsTitle}\n${url}\nЦена:\n\nСтарая цена - ${previousPrice}\nЦена сейчас - ${price} ₽\nБонусы:\n\nСтарый бонус - ${previousBonusQuantity}\nБонус сейчас - ${quantityOfBonuses}\nСтарые проценты: ${previousBonusPercent}\nПроценты сейчас: ${percentOfBonuses}`)
        }

        previousPrice = price;
        previousBonusPercent = percentOfBonuses;
        previousBonusQuantity = quantityOfBonuses;

        // const goodData = { goodId, merchantId }
        // // console.log("DANNIE: ", goodId, merchantId)
        // return goodData

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
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


const goodId = 100063054457
const merchantId = 90492
// parseGoods(goodId, merchant)

async function parseGoodsContinuously(goodId, merchantId) {
    // Ваш бесконечный цикл
    while (true) {
        try {
            // Вызываем вашу функцию parseGoods
            await parseGoods(goodId, merchantId);
        } catch (error) {
            console.error('An error occurred:', error);
        }

        // Задержка перед следующим вызовом, чтобы избежать блокировки браузера
        await new Promise(resolve => setTimeout(resolve, 3600000)); // Например, задержка в 10 секунд
    }

}

// Запускаем функцию parseGoodsContinuously с вашими параметрами
// parseGoodsContinuously(goodId, merchant);

// if (parseGoodsContinuously != null) {
//     buyGoodOnMegaMarket(goodId, merchantId);
// }

// parseGoods(goodId, merchantId)
//     .then(() => {
//         // Once goods are parsed, initiate the buying process
//         buyGoodOnMegaMarket(goodId, merchantId);
//     })
//     .catch(error => {
//         console.error('An error occurred while parsing goods:', error);
//     });


async function startMonitor() {
    const parsedData = await parseGoodsContinuously(goodId, merchantId);

    // Check if parsedData is not empty
    if (parsedData) {
        // If parsedData is not empty, call buyGoodOnMegaMarket function
        await buyGoodOnMegaMarket(goodId, merchantId);
    } else {
        // If parsedData is empty, log a message
        console.log('parseGoodsContinuously returned empty data. Skipping buyGoodOnMegaMarket call.');
    }
}

startMonitor()