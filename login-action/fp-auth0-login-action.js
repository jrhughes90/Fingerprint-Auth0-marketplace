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
        apiKey: "YOUR_FINGERPRINT_SECRET_API_KEY"
    });
    const identificationEvent = await client.getEvent(requestId);
    console.log("event", JSON.stringify(identificationEvent, null, 2));
    var visIdCheck = identificationEvent.products.identification.data.visitorId;
    //check visitorId was not tampered with
    console.log("visCheck: " + visIdCheck + " visitorId sent in authorization Param: " + visitorId)
    if (visIdCheck !== visitorId) {
        api.access.deny('Tampering detected');
    }
    //optional - check smart signals if module is licensed
    //console.log("Bot Detected : " + identificationEvent.products.botd.data.bot.result);
    //console.log("Known to IP Blocklists : " + identificationEvent.products.ipBlocklist.data.result);
    //console.log("Virtual Machine Detected : " + identificationEvent.products.virtualMachine.data.result);
    //console.log("Tor Network Detected : " + identificationEvent.products.tor.data.result);
    const metadata = event.user.app_metadata;
    //optional - force MFA for new visitorIds
    if (!metadata.visitorIds || !metadata.visitorIds.includes(visitorId)) {
        api.multifactor.enable('any');
    }
    // You can store the visitorId or use it in your authorization logic
    // For example, you can add visitorId to user app metadata 
    // to keep track of all of user's browsers and devices  
    if (!metadata.visitorIds) {
        api.user.setAppMetadata("visitorIds", [visitorId]);
    } else if (!metadata.visitorIds.includes(visitorId)) {
        api.user.setAppMetadata("visitorIds", [visitorId, ...metadata.visitorIds]);
    }
};