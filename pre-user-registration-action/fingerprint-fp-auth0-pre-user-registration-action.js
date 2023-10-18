/**
 * Handler that will be called during the execution of a PreUserRegistration flow.
 *
 * @param {Event} event - Details about the context and user that is attempting to register.
 * @param {PreUserRegistrationAPI} api - Interface whose methods can be used to change the behavior of the sign-up.
 */
exports.onExecutePreUserRegistration = async (event, api) => {
  // Get Fingerprint data from app_metadata
  const visitorId = event.user.app_metadata?.visitorId;
  const requestId = event.user.app_metadata?.requestId;
  if (!requestId || !visitorId) {
    console.log("No fingerprint data provided.");
    return;
  }

  try {
    // Using the request ID, get the complete identification event from the Fingerprint Server API
    const { FingerprintJsServerApiClient, Region } = require("@fingerprintjs/fingerprintjs-pro-server-api");
    // Use your Fingerprint application's region and Secret API Key
    const client = new FingerprintJsServerApiClient({
      region: Region.EU,
      apiKey: event.secrets.api_key,
    });
    const fingerprintEvent = await client.getEvent(requestId);
    console.log(fingerprintEvent);

    // Verify that the provided visitor ID matches the one from Fingerprint servers
    var serverApiVisitorId = fingerprintEvent.products.identification.data.visitorId;
    console.log("Visitor ID from Fingerprint Server API: " + serverApiVisitorId);
    console.log("Received visitor ID: " + visitorId);
    if (serverApiVisitorId !== visitorId) {
      api.access.deny("tampering_detected", "Sign-ups from this device cannot be accepted.");
    }

    // Optional - examine Fingerprint Smart Signals for additional checks
    if (fingerprintEvent.products.botd.data.bot.result === "bad") {
      api.access.deny("bot_detected", "Bot detected");
    }
    // console.log("Known to IP Blocklists : " + event.products.ipBlocklist.data.result);
    // console.log("Virtual Machine Detected : " + event.products.virtualMachine.data.result);
    // console.log("Tor Network Detected : " + event.products.tor.data.result);
  } catch (err) {
    // In case of error, fail silently - don't block sign-up
    console.log("Fingerprint-related error: ", err);
  }

  try {
    // Search for other users with the same visitor ID using the Auth0 Management API
    // This example uses app_metadata to associate users with visitor IDs,
    // but we recommend using your own user storage in production
    const ManagementClient = require("auth0").ManagementClient;
    const auth0ManagementClient = new ManagementClient({
      domain: event.secrets.domain,
      clientId: event.secrets.clientId,
      clientSecret: event.secrets.clientSecret,
    });

    const userSearchParams = {
      search_engine: "v3",
      q: "app_metadata.visitorIds: " + visitorId + "",
      per_page: 10,
      page: 0,
    };
    const visitorsWithTheSameVisitorId = (await auth0ManagementClient.users.getAll(userSearchParams)).data;
    console.log("Number of users with same Fingerprint visitor ID: " + visitorsWithTheSameVisitorId.length);

    // If there are too many users associated with this browser or device, deny the sign-up request
    if (visitorsWithTheSameVisitorId.length > 0) {
      api.access.deny("max_device_limit", "Too many sign-ups from this device.");
    } else {
      // If not, create the user and initialise their visitorIds array with the provided visitor ID
      api.user.setAppMetadata("visitorIds", [visitorId]);
    }
  } catch (err) {
    // In case of error, fail silently - don't block sign-up
    console.log("Auth0-related error: ", err);
  }
};
