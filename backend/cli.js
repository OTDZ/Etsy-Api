import dotenv from "dotenv";
import { question } from "./cli-questioner.js";
import { parseCsv } from "./csv-parser.js";

dotenv.config();

const LISTINGS_CSV_FILEPATH = process.env.LISTINGS_CSV_FILEPATH;

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

async function createListings(shop_id) {
    const listings = parseCsv(LISTINGS_CSV_FILEPATH);
    let row = 1;
    for (const listing of listings) {
        const response = await fetchWithTokenRefresh(`${domain}/api/shops/${encodeURIComponent(shop_id)}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(listing)
        });

        const data = await response.json();

        if (response.status === 201) {
            console.log(`Successfully created listing for row #${row}! View draft listing at https://www.etsy.com/your/shops/me/listing-editor/edit/${data.listing_id}\n`);
        } else if (response.status === 400) {
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

async function getTaxonomyIds() {
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
        console.log("4. View Taxonomy ids");
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
            await getTaxonomyIds();
        }
        else if (choice === "5") {
            process.exit(1);
        }
    }
}