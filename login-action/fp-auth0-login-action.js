/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
    const {
        FingerprintJsServerApiClient,
        Region,
    } = require("@fingerprintjs/fingerprintjs-pro-server-api");

    const client = new FingerprintJsServerApiClient({
        region: Region.Global,
        apiKey: event.secrets.FINGERPRINT_SECRET_API_KEY,
    });

    // Extract the visitorId and requestId from the query parameters
    const { visitorId, requestId } = event.request.query;
    if (!visitorId || !requestId)
        return api.access.deny("Visitor identification not found.");

    // Fetch the identification event using the requestId
    const identificationEvent = await client.getEvent(requestId);
    const eventVisitorId =
        identificationEvent?.products?.identification?.data?.visitorId;

    // Confirm the visitorId is the same as the one in the identification event
    if (!eventVisitorId || visitorId !== eventVisitorId)
        return api.access.deny("Visitor identification error.");

    // Save the visitorId within the app metadata
    api.user.setAppMetadata("currentVisitorId", eventVisitorId);

    // Get bot detection result
    const botDetection = identificationEvent.products?.botd?.data?.bot?.result;

    // If a bot is detected, deny the login
    if (botDetection !== "notDetected") return api.access.deny("Login denied.");

    // If first login, enroll in MFA
    const enrolledMFAs = event?.user?.multifactor?.length;
    if (enrolledMFAs == 0 || event.stats.logins_count == 1)
        return api.authentication.enrollWith({ type: "otp" });

    // Otherwise, check if the visitorId is already associated with the user
    // If not, prompt for MFA
    const appMetadata = event.user.app_metadata || {};
    if (!appMetadata.visitorIds || !appMetadata.visitorIds.includes(visitorId)) {
        // Store the need for MFA verification in the app metadata
        // This will be used in the following action
        api.user.setAppMetadata("mfaNeeded", true);

        // Trigger a MFA challenge, here we are using OTP
        api.authentication.challengeWith({ type: "otp" });
    }
};