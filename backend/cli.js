import dotenv from "dotenv";
import { question } from "./cli-questioner.js";
import { parseVariations } from "./csv-parser.js";

dotenv.config();

const VARIATIONS_CSV_FILEPATH = process.env.VARIATIONS_CSV_FILEPATH;

const domain = "http://localhost:3000";

async function fetchWithTokenRefresh(url, options = {}) {
    let response = await fetch(url, options);

    if (response.status === 401) {
        console.log("Access token has expired, attempting to refresh tokens...");
        const refresh_response = await fetch(`${domain}/api/refresh-token`);
        const refresh_data = await refresh_response.json();

        if (!refresh_data.error) {
            response = await fetch(url, options);
        } else {
            throw Error(JSON.stringify(refresh_data));
        }
    }

    return response;
}

async function getUserInfo() {
    const response = await fetchWithTokenRefresh(`${domain}/api/user`);
    const data = await response.json();

    if (response.status === 200) {
        const user_id = data.user_id;
        const shop_id = data.shop_id;

        const user_response = await fetchWithTokenRefresh(`${domain}/api/user/${encodeURIComponent(user_id)}`);
        const user_data = await user_response.json();

        if (user_response.status === 200) {
            const user_email = user_data.primary_email;
            const user_name = user_data.first_name;

            const shop_response = await fetchWithTokenRefresh(`${domain}/api/shops/${encodeURIComponent(shop_id)}`);
            const shop_data = await shop_response.json();

            if (shop_response.status === 200) {
                const shop_name = shop_data.shop_name;
                const shop_url = shop_data.url;

                return { user_id, user_email, user_name, shop_id, shop_name, shop_url };
            } else {
                throw Error(JSON.stringify(shop_data));
            }
        } else {
            throw Error(JSON.stringify(user_data));
        }
    } else {
        throw Error(JSON.stringify(data));
    }
}

async function addVariations(shop_id) {
    const variations = parseVariations(VARIATIONS_CSV_FILEPATH);

    // Get existing variations for listings
    for (const [listing_id, rows] of Object.entries(variations)) {
        console.log(`Attempting to add ${rows.length} variations to listing ${listing_id}`);
        const response = await fetchWithTokenRefresh(`${domain}/api/listings/${encodeURIComponent(listing_id)}/inventory`);
        const data = await response.json();

        if (response.status === 200) {
            const cleaned_existing_variations = data.products.map(({ sku, offerings, property_values }) => ({
                sku,
                offerings: offerings.map(({ price, quantity, is_enabled, readiness_state_id }) => ({
                    price: price.amount / price.divisor,
                    quantity,
                    is_enabled,
                    readiness_state_id
                })),
                property_values: property_values.map(({ property_id, property_name, value_ids, values }) => ({
                    property_id,
                    property_name,
                    value_ids,
                    values
                }))
            }));           

            const new_variations = rows.map(variation => ({
                sku: variation.sku,
                offerings: [
                    {
                        price: variation.price,
                        quantity: variation.quantity,
                        is_enabled: variation.is_enabled,
                        readiness_state_id: variation.readiness_state_id
                    }
                ],
                property_values: [
                    {
                        property_id: 513,
                        property_name: variation.variation_property_name_1,
                        values: [variation.variation_property_value_1]
                    },
                    variation.variation_property_name_2 ? {
                        property_id: 514,
                        property_name: variation.variation_property_name_2,
                        values: [variation.variation_property_value_2]
                    } : null
                ].filter(Boolean)
            }));
            
            const updated_variations = [...cleaned_existing_variations, ...new_variations];

            const response = await fetchWithTokenRefresh(`${domain}/api/listings/${encodeURIComponent(listing_id)}/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    products: updated_variations,
                    price_on_property: data.price_on_property,
                    quantity_on_property: data.quantity_on_property,
                    sku_on_property: data.sku_on_property,
                    readiness_state_on_property: data.readiness_state_on_property
                })
            });

            const update_inventory_data = await response.json();

            if (response.status === 200) {
                console.log(`Successfully added ${rows.length} variations to listing ${listing_id}\n`);
            } else if (response.status === 400 || response.status === 404) {
                console.log(`Failed to add ${rows.length} variations to listing ${listing_id}`);
                console.error(update_inventory_data);
                console.log("To view field specification and formatting, see https://developers.etsy.com/documentation/reference/#operation/updateListingInventory\n");
            } else {
                throw Error(JSON.stringify(data));
            }             
        } else {
            throw Error(JSON.stringify(data));
        }
    }
}

async function getShippingProfiles(shop_id) {
    const response = await fetchWithTokenRefresh(`${domain}/api/shops/${encodeURIComponent(shop_id)}/shipping-profiles`);
    const data = await response.json();

    if (response.status === 200) {
        console.log(data);
    } else {
        throw Error(JSON.stringify(data));
    }
}

async function getProcessingProfiles(shop_id) {
    const response = await fetchWithTokenRefresh(`${domain}/api/shops/${encodeURIComponent(shop_id)}/processing-profiles`);
    const data = await response.json();

    if (response.status === 200) {
        console.log(data);
    } else {
        throw Error(JSON.stringify(data));
    }
}

async function getTaxonomies() {
    const response = await fetchWithTokenRefresh(`${domain}/api/taxonomy`);
    const data = await response.json();

    if (response.status === 200) {
        console.log(data);
    } else {
        throw Error(JSON.stringify(data));
    }
}

export async function initialiseCLI() {
    const { user_id, user_email, user_name, shop_id, shop_name, shop_url } = await getUserInfo();
    console.log(`You are currently authenticated as ${user_name} - ${user_email}`);
    console.log(`You are currently accessing shop ${shop_name} - ${shop_url}`);

    let choice;
    while (choice !== "0") {
        console.log();
        console.log("Welcome to the Etsy Listing Uploader Command Line Interface\n");
        console.log("─".repeat(40));
        console.log("1. Create variations using CSV");
        console.log("2. View your shipping profiles");
        console.log("3. View your processing profiles (readiness states)");
        console.log("4. View Taxonomy categories");
        console.log("5. Exit");
        console.log("─".repeat(40));

        choice = await question("\nChoose an option:");

        if (choice === "1") {
            await addVariations(shop_id);
        }
        else if (choice === "2") {
            await getShippingProfiles(shop_id);
        }
        else if (choice === "3") {
            await getProcessingProfiles(shop_id);
        }
        else if (choice === "4") {
            await getTaxonomies();
        }
        else if (choice === "5") {
            process.exit(1);
        }
    }
}