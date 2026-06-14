import dotenv from "dotenv";
import { question } from "./cli-questioner.js";
import { parseListings, parseVariations } from "./csv-parser.js";

dotenv.config();

const LISTINGS_CSV_FILEPATH = process.env.LISTINGS_CSV_FILEPATH;
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

async function addVariations(listing_id, variations) {
    const response = await fetchWithTokenRefresh(`${domain}/api/listings/${encodeURIComponent(listing_id)}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variations)
    });
    const data = await response.json();

    if (response.status === 200) {
        console.log(data);
    } else {
        throw Error(JSON.stringify(data));
    }
}

async function createListings(shop_id) {
    const listings = parseListings(LISTINGS_CSV_FILEPATH);
    const variations = parseVariations(VARIATIONS_CSV_FILEPATH);
    let row = 1;
    for (const listing of listings) {
        const { variation_ids, ...listing_fields } = listing;
        const response = await fetchWithTokenRefresh(`${domain}/api/shops/${encodeURIComponent(shop_id)}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(listing_fields)
        });

        const data = await response.json();

        if (response.status === 201) {
            const listing_id = data.listing_id;
            console.log(`Successfully created listing for row #${row}! View draft listing at https://www.etsy.com/your/shops/me/listing-editor/edit/${listing_id}\n`);

            // Add variation if variation_ids has been specified in listings csv that corresponds to variation_ids in variations csv
            // Build products json
            if (variation_ids) {
                console.log(`Attempting to add variation(s) ${variation_ids} to listing row #${row} (listing id: ${listing_id})\n`);
                const variation_ids_list = variation_ids.split(",").map(id => id.trim());
                const products = [];
                for (const variation_id of variation_ids_list) {
                    const variation = variations[variation_id];
                    if (variation) {
                        const product = {
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
                                    property_name: variation.variation_property_name,
                                    values: [variation.variation_property_value]
                                }
                            ]
                        }
                        products.push(product);
                    }
                    else {
                        console.error(`variation_id ${variation_id} in listings row #${row} does not exist in ${VARIATIONS_CSV_FILEPATH}. variation_id ${variation_id} was not added to to listing row #${row} (listing id: ${listing_id})\n`);
                    }
                }
                const response = await fetchWithTokenRefresh(`${domain}/api/listings/${encodeURIComponent(listing_id)}/inventory`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        products: products,
                        price_on_property: [513],
                        quantity_on_property: [513],
                        sku_on_property: [513]
                    })
                });

                const data = await response.json();

                if (response.status === 200) {
                    console.log(`Successfully added variation(s) ${variation_ids} to listing row #${row} (listing id: ${listing_id})\n`);
                } else if (response.status === 400 || response.status === 404) {
                    console.log(`Failed to create variation(s) ${variation_ids} in listings row #${row} (listing id: ${listing_id})`);
                    console.error(data);
                    console.log("To view field specification and formatting, see https://developers.etsy.com/documentation/reference/#operation/updateListingInventory\n");
                } else {
                    throw Error(JSON.stringify(data));
                }
            }
        } else if (response.status === 400 || response.status === 404) {
            console.log(`Failed to create listing for row #${row}`);
            console.error(data);
            console.log("To view field specification and formatting, see https://developers.etsy.com/documentation/reference/#operation/createDraftListing\n");
        } else {
            throw Error(JSON.stringify(data));
        }
        row++;
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
        console.log("1. Create listings using CSV");
        console.log("2. View your shipping profiles");
        console.log("3. View your processing profiles (readiness states)");
        console.log("4. View Taxonomy categories");
        console.log("5. Exit");
        console.log("─".repeat(40));

        choice = await question("\nChoose an option:");

        if (choice === "1") {
            await createListings(shop_id);
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