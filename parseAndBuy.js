const puppeteer = require('puppeteer');
let previousPrice = null;
let previousBonusPercent = null;
let previousBonusQuantity = null;
const goodId = 100063054457
const merchantId = 90492
const CHAT_ID = ''
const TG_BOT_TOKEN = ''
const PROMO = ''
const SBM_TOKEN = ''

const inputField = {
    value: `{"items":[{"offer":{"merchantId": "${merchantId}" },"goods":{"goodsId": "${goodId}" },"quantity":1}],"cartInfo":{"type":"CART_TYPE_DEFAULT","locationId":""}}`
};

async function buyGoodOnMegaMarket(goodId, merchantId, voucher) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://megamarket.ru/', { waitUntil: 'domcontentloaded' });

    await page.evaluate((goodId, merchantId, voucher) => {

        document.cookie = `sbermegamarket_token=${SBM_TOKEN}`;
        document.cookie = `ecom_token=${SBM_TOKEN}`;

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

            const telegramBotToken = TG_BOT_TOKEN;
            const chatId = CHAT_ID;
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
                        "Cookie": `sbermegamarket_token=${SBM_TOKEN}; ecom_token=${SBM_TOKEN}`,
                        "Sec-Fetch-Mode": "cors",
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const responseData = await response.json();
                console.log("Cart Data:", responseData);

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
                    "addressFull": "",
                    "addressId": ""
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
                "customer": { "notMe": false, "thirdName": "", "comment": "", "firstName": "", "lastName": "", "email": "", "phone": "", "phoneMisc": "", "restored": false },
                "address": {
                    "addressId": "",
                    "full": "",
                    "entrance": "", "intercom": "",
                    "floor": "",
                    "flat": "",
                    "addToMyAddresses": false
                },
                "deliveries": [{ "id": variantId, "shipmentType": 0, "date": date, "timeSlot": { "from": timeSlotFrom, "to": timeSlotTo } }],
                "flags": ["GOA_AGREEMENT"],
                "isSelectedCartItemGroupsOnly": true,
                "discounts": [{ "type": "PROMO_CODE", "voucher": PROMO }], 
                "paymentTypeOptions": [],
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
                return responseData;
            } catch (error) {
                console.error("Error:", error.message);
                throw error;
            }

        }


        async function start() {
            try {
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

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function sendTelegramMessage(message) {
    const telegramBotToken = TG_BOT_TOKEN;
    const chatId = CHAT_ID;
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

async function parseGoodsContinuously(goodId, merchantId) {
    while (true) {
        try {
            await parseGoods(goodId, merchantId);
        } catch (error) {
            console.error('An error occurred:', error);
        }

        // Задержка перед следующим вызовом
        await new Promise(resolve => setTimeout(resolve, 3600000)); // задержка в 10 секунд
    }

}

async function startMonitor() {
    const parsedData = await parseGoodsContinuously(goodId, merchantId);

    if (parsedData) {
        await buyGoodOnMegaMarket(goodId, merchantId);
    } else {
        console.log('parseGoodsContinuously returned empty data. Skipping buyGoodOnMegaMarket call.');
    }
}

startMonitor()