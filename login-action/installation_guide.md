# Auth0 Fingerprint Integration

This integration enhances your Auth0 login flows with Fingerprint's visitor identification. Fingerprint provides a unique identifier for each browser or device, along with actionable insights to help prevent fraud and improve user experiences.

Fingerprint Identification collects over 100 attributes from a user's browser or device to generate stable visitor identifiers that remain consistent even after browser updates or cookie clearance. Fingerprint Smart Signals provide additional details, such as VPN usage, browser tampering, or bot activity. This data strengthens your Auth0 login flows by enabling the detection of suspicious behavior even when the user has the right credentials.

To see a full walkthrough and breakdown of how to use the Action scripts in this guide, check out our [Fingerprint + Auth0 tutorial](https://fingerprint.com/blog/iam-integration-prevent-account-takeover/). 

## Prerequisites

1. An Auth0 account and tenant. [Sign up for free](https://auth0.com/signup).
2. A Fingerprint account. [Sign up for free](https://dashboard.fingerprint.com/signup/).

## 1. Add Fingerprint to your application

To identify your visitors, add the Fingerprint device intelligence client agent to your website or mobile application:

1. Go to the [Fingerprint dashboard](https://dashboard.fingerprint.com/).
2. Navigate to **App Settings** → **[Integrations](https://dashboard.fingerprint.com/integrations)** to explore the available SDKs and find the easiest way to install Fingerprint for your app.
3. You can [load](https://dev.fingerprint.com/docs/install-the-javascript-agent) the client agent directly in vanilla JavaScript or use a type-safe [SDK](https://dev.fingerprint.com/docs/frontend-libraries) for your favorite framework. Here is a [React SDK](https://github.com/fingerprintjs/fingerprintjs-pro-react) example:

```jsx
import {
  FpjsProvider,
  useVisitorData,
} from "@fingerprintjs/fingerprintjs-pro-react";

const App = () => (
  <FpjsProvider
    loadOptions={{
      apiKey: "PUBLIC_API_KEY",
      endpoint: [
        // "https://metrics.yourwebsite.com",
        FingerprintJSPro.defaultEndpoint,
      ],
      scriptUrlPattern: [
        // "https://metrics.yourwebsite.com/web/v<version>/<apiKey>/loader_v<loaderVersion>.js",
        FingerprintJSPro.defaultScriptUrlPattern,
      ],
      // region: "eu"
    }}
  >
    <VisitorData />
  </FpjsProvider>
);

const VisitorData = () => {
  const { data } = useVisitorData();
  return (
    <div>
      Visitor ID: ${data?.visitorId}, Request ID: ${data?.requestId}
    </div>
  );
};
```

The returned `visitorId` is a unique and stable identifier of your visitor. The `requestId` is the unique identifier for a specific identification event.

4. All the code snippets on the Integrations page already include your public API Key, but you can also find it in **App Settings** → **[API Keys](https://dashboard.fingerprint.com/api-keys)**.
5. Open your website or application with Fingerprint Pro installed. You should see your identification event inside the Fingerprint [dashboard](https://dashboard.fingerprint.com/) → **[Identification](https://dashboard.fingerprint.com/visits)**.

Consult the Fingerprint [Quick Start Guide](https://dev.fingerprint.com/docs/quick-start-guide) or contact [Fingerprint support](https://fingerprint.com/support/) if you have any questions.

> Note: For production deployments, we recommend routing requests to Fingerprint APIs through your own domain. This prevents ad blockers from disrupting identification requests and improves accuracy. We offer a variety of proxy integration options, see [Protecting your JavaScript agent from ad blockers](https://dev.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers) for more details.

## 2. Send Fingerprint identification results to Auth0

Modify your Auth0 implementation to send the Fingerprint identification results as additional _authorization parameters_.

For most JavaScript-based Auth0 SDKs, you can pass the `requestId` and `visitorId` as custom `authorizationParams` into the `loginWithRedirect` function. Here is an example using the [Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react):

```jsx
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";
import { useAuth0 } from "@auth0/auth0-react";

const Login = () => {
  const { loginWithRedirect } = useAuth0();
  const { data } = useVisitorData();

  return (
    <Button
      onClick={() =>
        loginWithRedirect({
          authorizationParams: {
            visitorId: data?.visitorId,
            requestId: data?.requestId,
          },
        })
      }
    >
      Log in
    </Button>
  );
};
```

If you are using a redirect-based Auth0 SDK designed for server-rendered applications, you will need to:

1. Pass the `requestId` and `visitorId` as query parameters to the login route. An example using [Auth0 Next SDK](https://auth0.com/docs/quickstart/webapp/nextjs/01-login):

   ```jsx
   import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";

   const LoginLink = () => {
     const { data } = useVisitorData();

     return (
       <AnchorLink
         href={`/api/auth/login?visitorId=${data?.visitorId}&requestId=${data?.requestId}`}
       >
         Log in
       </AnchorLink>
     );
   };
   ```

2. Customize the login route handler to pass the query parameters to Auth0 as `authorizationParams`. An example using the [Auth0 Next SDK](https://auth0.com/docs/quickstart/webapp/nextjs/01-login):

   ```jsx
   // src/pages/api/auth/[...auth0].js

   import { handleAuth, handleLogin } from "@auth0/nextjs-auth0";

   export default handleAuth({
     async login(req, res) {
       // Pass visitorId as custom parameter to login
       await handleLogin(req, res, {
         authorizationParams: {
           visitorId: req.query.visitorId,
           requestId: req.query.requestId,
         },
       });
     },
   });
   ```

Your implementation details will vary depending on how you integrate Auth0 with your application. Reach out to Auth0 support if you have any questions about passing custom authorization parameters.

We recommend using the Fingerprint integration with the New Universal Login as it's server-side rendered. Using it with the Classic Universal Login will result in the additional parameters being visible to the end user.

## 3. Use Fingerprint identification results in Auth0 Actions

The Fingerprint parameters are now accessible within Auth0 [Actions](https://auth0.com/docs/customize/actions/actions-overview). For example, you can [create an Action](https://auth0.com/docs/customize/actions/write-your-first-action) in your login flow to store a user's device identifiers [in their metadata](https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow#enrich-the-user-profile). This list of recognized devices can then be used to decide whether to prompt for additional verification: if the device is unknown, trigger MFA; if it's recognized, allow a smoother login without extra MFA steps. You can also use the Fingerprint event data within your Actions to verify that the user logging in is human, not a bot.

1. Use the `requestId` to obtain more information about the visitor and verify their details. If necessary, prompt for MFA.

```javascript
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
```

2. Based on the user's authentication outcome and the requirements set in Action #1, determine whether the user can log in. If they can, update their known device list.

> The following code should be added to a new login action and follow the action above in order of execution.

```javascript
/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Get variables from first Action
  const appMetadata = event.user.app_metadata || {};
  const visitorId = appMetadata.currentVisitorId;
  const mfaNeeded = appMetadata.mfaNeeded;
  api.user.setAppMetadata("currentVisitorId", null);
  api.user.setAppMetadata("mfaNeeded", null);

  // If no visitorId has been passed there is an error
  if (!visitorId) return api.access.deny("Visitor identification not found.");

  // Check if the user successfully completed authentication and MFA if needed
  if (!event.authentication) return api.access.deny("Failed authentication.");
  const mfaSuccess = event.authentication.methods.find((m) => m.name == "mfa");
  if (mfaNeeded && !mfaSuccess)
    return api.access.deny("Failed multi-factor authentication.");

  // If successfully passed all checks, associate the visitor ID with the user
  let updatedVisitorIds = appMetadata.visitorIds || [];
  if (!updatedVisitorIds.includes(visitorId)) {
    // Update the app_metadata with the new visitorId
    updatedVisitorIds.push(visitorId);
    api.user.setAppMetadata("visitorIds", updatedVisitorIds);
  }

  // Optional: set the visitorIds as a custom claim so it can be accessed from the app
  api.idToken.setCustomClaim("visitorIds", updatedVisitorIds);
};
```

Explore different ways to prevent fraud and streamline user experiences with Fingerprint by visiting our [use case demos](https://fingerprint.com/use-cases/).

## Troubleshooting

For more information about Fingerprint, visit our [website](https://fingerprint.com/) or check out the [documentation](https://dev.fingerprint.com/docs). If you have any questions, reach out to our [support team](https://fingerprint.com/support/) for help.
