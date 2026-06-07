import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";
import { generateChallenge } from "./pkce-challenge.js";
import { initialiseCLI } from "./cli.js";

dotenv.config();

const ETSY_API_KEY_STRING = process.env.ETSY_API_KEY_STRING;
const ETSY_API_SHARED_SECRET = process.env.ETSY_API_SHARED_SECRET;
const ETSY_API_KEY = `${ETSY_API_KEY_STRING}:${ETSY_API_SHARED_SECRET}`;

let ETSY_ACCESS_TOKEN = null;
let ETSY_REFRESH_TOKEN = null;

const app = express();
const port = 3000

function initialiseServer() {
    app.use(express.json());

    const { state, challenge, verifier } = generateChallenge();
    const oauthUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=http://localhost:3000/oauth/redirect&scope=listings_w%20shops_r%20email_r&client_id=${ETSY_API_KEY_STRING}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

    app.get("/api/authenticate", (req, res) => {
        res.redirect(oauthUrl);
    });

    // OAuth redirect
    app.get("/oauth/redirect", async (req, res) => {
        const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
            method: "POST",
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: ETSY_API_KEY_STRING,
                redirect_uri: "http://localhost:3000/oauth/redirect",
                code: req.query.code,
                code_verifier: verifier
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json()

        if (response.ok) {
            res.status(response.status).send("Authentication successful! You can now close this page");
            console.log("Authentication successful\n");
            
            ETSY_ACCESS_TOKEN = data.access_token;
            ETSY_REFRESH_TOKEN = data.refresh_token;

            initialiseCLI();
        } else {
            res.status(response.status).send(data);
            console.log("Authentication unsuccessful\n");
            console.log(data);
        }

    });

    // RefreshToken
    app.get("/api/refresh-token", async (req, res) => {
        const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
            method: "POST",
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: ETSY_API_KEY_STRING,
                refresh_token: ETSY_REFRESH_TOKEN
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (response.ok) {
            ETSY_ACCESS_TOKEN = data.access_token;
            ETSY_REFRESH_TOKEN = data.refresh_token;
            console.log("Successfully refreshed tokens\n");
        } else {
            console.log("Failed to refresh tokens");
            console.log(data);
        }

        res.status(response.status).send(data);
    })

    // GetMe - Returns basic info for the user making the request
    app.get("/api/user", async (req, res) => {
        const response = await fetch(`https://api.etsy.com/v3/application/users/me`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });    

    // GetUser - Retrieves a user profile based on a unique user ID
    app.get("/api/user/:userId", async (req, res) => {
        const user_id = req.params.userId;

        const response = await fetch(`https://api.etsy.com/v3/application/users/${user_id}`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });

    // GetShop - Retrieves the shop identified by a specific shop ID
    app.get("/api/shops/:shopId", async (req, res) => {
        const shop_id = req.params.shopId;

        const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });

    // GetShopShippingProfiles - Retrieves a list of shipping profiles available in the specific Etsy shop identified by its shop ID
    app.get("/api/shops/:shopId/shipping-profiles", async (req, res) => {
        const shop_id = req.params.shopId;

        const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/shipping-profiles`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });

    // GetShopReadinessStateDefinitions - Retrieves a list of ProcessingProfiles available in the specific Etsy shop identified by its shop ID
    app.get("/api/shops/:shopId/processing-profiles", async (req, res) => {
        const shop_id = req.params.shopId;

        const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/readiness-state-definitions`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });

    // GetSellerTaxonomyNodes - Retrieves the full hierarchy tree of seller taxonomy nodes
    app.get("/api/taxonomy", async (req, res) => {
        const shop_id = req.params.shopId;

        const response = await fetch(`https://api.etsy.com/v3/application/seller-taxonomy/nodes`, {
            method: "GET",
            headers: {
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    });    

    // CreateDraftListing - Creates a physical draft listing product in a shop on the Etsy channel
    app.post("/api/shops/:shopId/list", async (req, res) => {
        const shop_id = req.params.shopId;
        const listing = req.body;

        const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/listings`, {
            method: "POST",
            body: JSON.stringify(listing),
            headers: {
                "Content-Type": "application/json",
                "x-api-key": ETSY_API_KEY,
                "Authorization": `Bearer ${ETSY_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();
        res.status(response.status).send(data);
    })

    app.listen(port, () => {
        console.log(`Server initialised at http://localhost:${port}\n`);
        console.log("Please follow the link below to authenticate");
        console.log(`${oauthUrl}\n`);
    });

}

initialiseServer();