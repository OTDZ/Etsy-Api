import crypto from "crypto";

export function generateChallenge() {

    // The next two functions help us generate the code challenge
    // required by Etsy’s OAuth implementation.
    const base64URLEncode = (str) =>
    str
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest();

    // We’ll use the verifier to generate the challenge.
    // The verifier needs to be saved for a future step in the OAuth flow.
    const verifier = base64URLEncode(crypto.randomBytes(32));

    // With these functions, we can generate
    // the values needed for our OAuth authorization grant.
    const challenge = base64URLEncode(sha256(verifier));
    const state = Math.random().toString(36).substring(7);

    return { state, challenge, verifier }

}