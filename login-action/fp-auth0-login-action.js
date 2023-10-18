/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
    // Pull visitorId, requestId from the query
    const { visitorId, requestId } = event.request.query;

    if (!visitorId || !requestId) {
        return;
    }
    console.log(`Fingerprint Pro values, visitorId: ${visitorId}, requestId: ${requestId}`);

    // Use Fingerprint Pro Server API SDK to securely 
    // retrieve complete info about that specific identification event
    const { FingerprintJsServerApiClient, Region } = require('@fingerprintjs/fingerprintjs-pro-server-api');
    const client = new FingerprintJsServerApiClient({
        region: Region.Global,
        apiKey: "YOUR_FINGERPRINT_SECRET_API_KEY" //event.secrets.api_key
    });
    const identificationEvent = await client.getEvent(requestId);
    console.log("event", JSON.stringify(identificationEvent, null, 2));


    // Verify that the provided visitor ID matches the one from Fingerprint servers
    var serverApiVisitorId = identificationEvent.products.identification.data.visitorId;
    console.log("Visitor ID from Fingerprint Server API: " + serverApiVisitorId);
    console.log("Received visitor ID: " + visitorId);
    if (serverApiVisitorId !== visitorId) {
        api.access.deny("tampering_detected", 'Sign-ups from this device cannot be accepted.');
    }

    const metadata = event.user.app_metadata;

    // Optional: Force multi-factor authentication for new visitor IDs
    if (!metadata.visitorIds || !metadata.visitorIds.includes(visitorId)) {
        api.multifactor.enable('any');
    }

    // You can store the visitorId or use it in your authorization logic
    // For example, you can add visitorId to user app metadata 
    // to keep track of all of the user's browsers and devices  
    if (!metadata.visitorIds) {
        api.user.setAppMetadata("visitorIds", [visitorId]);
    } else if (!metadata.visitorIds.includes(visitorId)) {
        api.user.setAppMetadata("visitorIds", [visitorId, ...metadata.visitorIds]);
    }
};
