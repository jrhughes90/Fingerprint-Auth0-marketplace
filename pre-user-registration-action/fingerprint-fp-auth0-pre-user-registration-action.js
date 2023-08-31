/**
* Handler that will be called during the execution of a PreUserRegistration flow.
*
* @param {Event} event - Details about the context and user that is attempting to register.
* @param {PreUserRegistrationAPI} api - Interface whose methods can be used to change the behavior of the signup.
*/
exports.onExecutePreUserRegistration = async (event, api) => {
    //get fingerprint value passed in from sign-up request
    //in this example a value of signup_fingerprint is sent as part of the app_metadata
    const fingerprint = event.user.app_metadata?.signup_fingerprint;
    if (!fingerprint) {
        return;
    }
    var array = fingerprint.split(" ");
    const visitorId = array[0]
    const requestId = array[1]
    console.log("VisitorId is:" + visitorId);
    console.log("RequestId is:" + requestId);

    //spin up fingerpint client 
    const { FingerprintJsServerApiClient, Region } = require('@fingerprintjs/fingerprintjs-pro-server-api');
    // Init client with the given region and the secret api_key
    const client = new FingerprintJsServerApiClient({ region: Region.EU, apiKey: event.secrets.api_key });
    client.getEvent(requestId).then((event) => {
        var visIdCheck = event.products.identification.data.visitorId;
        console.log("Visitor Id tampering check: " + visIdCheck + " Visitor Id sent in request: " + visitorId)
        if (visIdCheck !== visitorId) {
            api.access.deny("tampering_detected", 'Sign-ups from this device cannot be accepted');
        }
        //optional - check smart signals here
        console.log("Bot Detected : " + event.products.botd.data.bot.result);
        if (event.products.botd.data.bot.result === "bad") {
            api.access.deny('bot_detected', 'Bot detected');
        }
        // console.log("Known to IP Blocklists : " + event.products.ipBlocklist.data.result);
        // console.log("Virtual Machine Detected : " + event.products.virtualMachine.data.result);
        // console.log("Tor Network Detected : " + event.products.tor.data.result);

    }).catch(function (err) {
        console.log(err)
    });
    //query existing users for same fingerprint
    //this could be using Auth0 app_metadata (not recommended for production) as shown below 
    //or using your own user store / API backend (recommended)

    //load Auth0 management client
    const ManagementClient = require('auth0').ManagementClient;
    const management = new ManagementClient({
        domain: event.secrets.domain,
        clientId: event.secrets.clientId,
        clientSecret: event.secrets.clientSecret,
    });
    var params = {
        search_engine: 'v3',
        q: 'app_metadata.visitorIds: ' + visitorId + '',
        per_page: 10,
        page: 0
    };
    try {
        const res = await management.getUsers(params)
        console.log("Count of users with same FP: " + res.length);
        // determine number of allowed accounts per device to allow
        if (res.length > 0) {
            api.access.deny("max_device_limit", 'Further Sign-ups from this device cannot be accepted');
        } else {
            api.user.setAppMetadata("visitorIds", [visitorId]);
        }
    } catch (e) {
        console.log(e)
        // Handle error - fail silently - don't block signup
    }

};