# Fingerprint - Account Takeover Protection for Auth0 Users

The Fingerprint and Okta Customer Identity Cloud (CIC) powered by Auth0 integration is designed to provide a unique identifier for each of your user's devices. This is a powerful signal that helps reduce fraud and improve the user experience.

The integration is powered by Fingerprint Pro's device detection technology, which is an industry-leading solution that quickly and accurately identifies the characteristics of a browser or device. The device information, with unparalleled accuracy, is then used to create a unique and immutable device fingerprint that can be used to securely identify a user's device and detect any malicious activity.

Prerequisites
-------------

1.  An Auth0 account and tenant. [Sign up for free](https://auth0.com/signup).
2.  A Fingerprint Pro account. [Sign up for free](https://dashboard.fingerprint.com/signup/).

1\. Add Fingerprint Pro to your application
-------------------------------------------

To identify your visitors, add the Fingerprint Pro device intelligence agent to your website or application:

1.  [Sign up](https://dashboard.fingerprint.com/signup) for Fingerprint Pro if you haven't already and [log in](https://dashboard.fingerprint.com/login) to your dashboard.

2.  Navigate to **App Settings** → **Integrations** to explore the available SDKs and find the easiest way to install Fingerprint Pro.

3.  You can [import](https://dev.fingerprint.com/docs/js-agent#installing-the-agent--quick-usage-examples) the script directly in vanilla JavaScript or use a type-safe [SDK](https://dev.fingerprint.com/docs/frontend-libraries) for your favorite framework. Here is a [React SDK](https://github.com/fingerprintjs/fingerprintjs-pro-react) example wrapping the application (or component) inside `FpjsProvider`:

    ```ts
    import {
         FpjsProvider,
         useVisitorData
     } from '@fingerprintjs/fingerprintjs-pro-react';

     const App = () => (
       <FpjsProvider
         loadOptions={{
           apiKey: 'YOUR_PUBLIC_API_KEY',
           endpoint: 'YOUR_CUSTOM_ENDPOINT'
         }}>
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

    The returned `visitorId` is a unique and stable identifier of your visitor.

4.  All the code snippets on the Integrations page already include your Public API Key, but you can also find it in **App Settings → API Keys**.

5.  Open your website or application with Fingerprint Pro installed. You should see your identification event inside the Fingerprint [dashboard](https://dashboard.fingerprint.com/) → **Identification**.

Consult the Fingerprint Pro [Quick Start Guide](https://dev.fingerprint.com/docs/quick-start-guide) or contact [Fingerprint support](https://fingerprint.com/support/) if you have any questions.

> Note: For production deployments, we recommend routing requests to Fingerprint Pro APIs through your own domain. This prevents ad blockers from disrupting identification requests and improves accuracy. We offer a variety of proxy integration options, see [Protecting your JavaScript agent from ad blockers](https://dev.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers) for more details

2\. Send Fingerprint Pro results to Auth0
-----------------------------------------

Modify your Auth0 integration to send the Fingerprint Pro identification results as additional authorization parameters.

For most JavaScript-based Auth0 SDKs, you can pass the `requestId` and `visitorId` as custom `authorizationParams` into the `loginWithRedirect` function. Here is an example using the [Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react):

```ts
import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react';
import { useAuth0 } from '@auth0/auth0-react';

const Login = () => {
  const { loginWithRedirect } = useAuth0();
  const { data } = useVisitorData();

  return (
    <Button
      onClick={() =>
        loginWithRedirect({
          authorizationParams: {
            visitorId: data?.visitorId,
            requestId: data?.requestId
          }
        })
      }>
      Log in
    </Button>
  );
};
```

If you are using a redirect-based Auth0 SDK designed for server-rendered applications, you will need to:

1.  Pass the `requestId` and `visitorId` as query parameters to the login route. An example using [Auth0 Next SDK](https://auth0.com/docs/quickstart/webapp/nextjs/01-login):

    ```ts
     import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react';

     const LoginLink = () => {
       const { data } = useVisitorData();

       return (
         <AnchorLink
           href={`/api/auth/login?visitorId=${data?.visitorId}&requestId=${data?.requestId}`}>
           Log in
         </AnchorLink>
       );
     };
    ```

2.  Customize the login route handler to pass the query parameters to Auth0 as `authorizationParams`. An example using the [Auth0 Next SDK](https://auth0.com/docs/quickstart/webapp/nextjs/01-login):

    ```ts
     // src/pages/api/auth/[...auth0].js

     import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

     export default handleAuth({
       async login(req, res) {
         // Pass visitorId as custom parameter to login
         await handleLogin(req, res, {
           authorizationParams: {
             visitorId: req.query.visitorId,
             requestId: req.query.requestId,
           },
         });
       }
     });
    ```

Your implementation details will vary depending on how you integrate Auth0 with your application. Reach out to Auth0 support if you have any questions about passing custom authorization parameters.

We recommend using the Fingerprint integration with the New Universal Login as it's server-side rendered. Using it with the Classic Universal Login will result in the additional parameters being visible to the end user.

3\. Use the Fingerprint Pro result in an Auth0 Action
-----------------------------------------------------

The Fingerprint Pro result parameters will be available inside Auth0 [Actions](https://auth0.com/docs/customize/actions/actions-overview). For example, you can [create](https://auth0.com/docs/customize/actions/write-your-first-action) an Action in your login flow that stores all device identifiers of a single user [in their metadata](https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow#enrich-the-user-profile). 

1. Create a new [Login Action](https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow) in Auth0.

2. Use the example Action script below to check for new devices.
  > This example stores an array of visitorId's in the `app_metadata` of the users profile, checks the `visitorId` sent in the authorization params matches the `visitorId` for the associated request using Fingerprint's Event API and requests MFA as part of the authentication if the `VisitorId` (device/browser) is not recognised.

3. Ensure that you replace the placeholder parameter values in the example below for `region` and `api_key`. You can store the Fingerprint `api_key` within the [Auth0 secret values](https://auth0.com/docs/customize/actions/write-your-first-action#add-a-secret). 

4. Add the `@fingerprintjs/fingerprintjs-pro-server-api` library as a dependency of the Action using the [Auth0 Action Dependencies](https://auth0.com/docs/customize/actions/manage-dependencies).

```ts
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


    // Verify that the provided visitorId was not tampered with
    var serverSideVisitorId = identificationEvent.products.identification.data.visitorId;
    console.log("visitorId from Server API: " + serverSideVisitorId + ", visitorId sent in authorization params: " + visitorId)
    if (serverSideVisitorId !== visitorId) {
        api.access.deny('Tampering detected');
    }

    const metadata = event.user.app_metadata;

    // Optional: Force multi-factor authentication for new visitor IDs
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
```

The above action script is an example of how Fingerprint can prevent account takeovers from unknown devices. See [Use cases](https://fingerprint.com/use-cases/) to explore different ways of preventing fraud and streamlining user experiences with Fingerprint Pro.

Troubleshooting
---------------

To learn more about Fingerprint Pro, visit our [website](https://fingerprint.com/) or read the [documentation](https://dev.fingerprint.com/docs). If you have any questions, reach out to our [support](https://fingerprint.com/support/).
