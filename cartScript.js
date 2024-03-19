const CHAT_ID = ''
const TG_BOT_TOKEN = ''
const PROMO = ''
const SBM_TOKEN = ''

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
    const telegramBotToken = TG_BOT_TOKEN;
    const chatId = CHAT_ID
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


async function checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo, price, quantity) {
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
        "discounts": [{ "type": "PROMO_CODE", "voucher": "Сельдь" }], // ПОЧИНИТЬ
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

const inputField = {
    value: '{"items":[{"offer":{"merchantId":40440},"goods":{"goodsId":"100040565857"},"quantity":1}],"cartInfo":{"type":"CART_TYPE_DEFAULT","locationId":""}}'
};

async function start() {
    try {
        const { cartId, bonusInfo, percentOfBonusInfo } = await handleTextFieldSubmit(inputField);
        const { variantId, date, timeSlotFrom, timeSlotTo, price, quantity } = await getDateForCheckout(cartId);
        const responseData = await checkout(cartId, variantId, date, timeSlotFrom, timeSlotTo, price, quantity);

        if (responseData.success == true) {
            sendTelegramMessage(`✅✅✅Новый заказ МегаМаркет✅✅✅\n\nСумма: ${price}\nКоличество: ${quantity}\nКоличество бонусов: ${bonusInfo}\nПроценты: ${percentOfBonusInfo}`);
        } else {
            sendTelegramMessage(`Ошибка: ${responseData.errors}`);
        }
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
}

start();

