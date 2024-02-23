const handleTextFieldSubmit = async (inputField) => {
    const trimmedText = inputField.value.trim();
    if (trimmedText !== '') {
        try {
            const newCartData = JSON.parse(trimmedText);
            const {cartId, bonusInfo, percentOfBonusInfo } = await addToCartRequest(newCartData.items, newCartData.cartInfo.type, newCartData.cartInfo.locationId);
            console.log('Yes all super');
            return { cartId, bonusInfo, percentOfBonusInfo };
        } catch (error) {
            console.error('Error parsing JSON:', error);
            alert('Ошибка ввода корзины');
            throw error;
        }
    }
};

async function sendTelegramMessage(message) {
    const telegramBotToken = '6409007829:AAH-IgR14WYWgr7tg8a_YYk4u7eTcdDvoJA';
    // const chatId = '5038035009';
    const chatId = 627967659
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
        //return responseData;
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
};

// const cartId = await addToCartRequest(items, cartType, locationId);
// console.log("Cart ID:", cartId);

// async function getDateForCheckout(cartId) {
//     const url = 'https://megamarket.ru/api/mobile/v2/checkoutService/checkout/calculate'
//     const requestBody = {
//         "identification":{"id":cartId},
//         "isSelectedCartItemGroupsOnly":true,
//         "deliveryType":"COURIER",
//         "address":{"addressFull":"г Москва, ул Перерва, д 43",
//         "addressId":"6955b1c8-bfdc-4b09-ab58-6c1e1c3a6aa2#43#"},
//         "auth":{"locationId":"50","appPlatform":"WEB","appVersion":1707393661}
//     }

//     try {
//         const response = await fetch(url, {
//             method: "POST",
//             body: JSON.stringify(requestBody)
//         });
//         if (!response.ok) {
//             throw new Error("Network response was not ok");
//         }

//         const deliveryDate = await response.json();

//         // if responseData.
//         console.log("Response:", deliveryDate.AONEItem.variants[0].arrival.id);
//         console.log(deliveryDate)
//         return deliveryDate;
//     } catch (error) {
//         console.error("Error:", error.message);
//         throw error;
//     }
// }

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


async function checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo, price, quantity) {
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
        // "deliveries": [{ "id": "067ea15c4ee7a06cd387f5f7038bad18", "shipmentType": 0, "date": "2024-02-14", "timeSlot": { "from": "08:00", "to": "23:00" } }],
        "deliveries": [{ "id": variantId, "shipmentType": 0, "date": date, "timeSlot": { "from": timeSlotFrom, "to": timeSlotTo } }],
        "flags": ["GOA_AGREEMENT"],
        "isSelectedCartItemGroupsOnly": true,
        "discounts": [{ "type": "PROMO_CODE", "voucher": "Сельдь" }], // ПОЧИНИТЬ
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
    value: '{"items":[{"offer":{"merchantId":40440},"goods":{"goodsId":"100040565857"},"quantity":1}],"cartInfo":{"type":"CART_TYPE_DEFAULT","locationId":""}}'
};

// handleTextFieldSubmit(inputField)

async function start() {
    try {
        const { cartId, bonusInfo, percentOfBonusInfo } = await handleTextFieldSubmit(inputField);
        const { variantId, date, timeSlotFrom, timeSlotTo, price, quantity } = await getDateForCheckout(cartId);
        const responseData = await checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo, price, quantity);

        if (responseData.success == true) {
            sendTelegramMessage(`✅✅✅Новый заказ МегаМаркет✅✅✅\n\nСумма: ${price}\nКоличество: ${quantity}\nКоличество бонусов: ${bonusInfo}\nПроценты: ${percentOfBonusInfo}`);
        } else {
            // console.log("Response:", responseData.errors);
            sendTelegramMessage(`Ошибка: ${responseData.errors}`);
        }
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
}

start();

