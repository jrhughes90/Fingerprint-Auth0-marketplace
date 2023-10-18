#  Fingerprint - Prevent sign-up fraud for Auth0 Users

The Fingerprint and Okta Customer Identity Cloud (CIC) powered by Auth0 integration is designed to provide a unique identifier for each of your user's devices. This is a powerful signal that helps reduce fraud and improve the user experience.

The integration is powered by Fingerprint Pro's device detection technology, which is an industry-leading solution that quickly and accurately identifies the characteristics of a browser or device. The device information, with unparalleled accuracy, is then used to create a unique and immutable device fingerprint that can be used to securely identify a user's device and detect any malicious activity.

This guide demonstrates using Fingerprint to prevent multiple sign-ups from the same device or browser.

Prerequisites
-------------

> __*Note*__: This integration requires the sign-up page to be hosted by the application so you can install the Fingerprint JavaScript agent and send the identification results as part of the sign-up request. This integration is not supported when using the Auth0-hosted sign-up page (Universal Login / classic Lock).

1.  An Auth0 account and tenant. [Sign up for free](https://auth0.com/signup).
2.  A Fingerprint Pro account. [Sign up for free](https://dashboard.fingerprint.com/signup/).
3.  A custom sign-up page (not Auth0 hosted / Universal Login). 

1\. Add Fingerprint Pro to your application
-------------------------------------------

To identify your visitors, add the Fingerprint Pro device intelligence agent to your website or application:

1.  [Sign up](https://dashboard.fingerprint.com/signup) for Fingerprint Pro if you haven't already and [log in](https://dashboard.fingerprint.com/login) to your dashboard.

2.  Navigate to **App Settings** → **Integrations** to explore the available SDKs and find the easiest way to install Fingerprint Pro.

3.  Add the SDK to your application - You can [import](https://dev.fingerprint.com/docs/js-agent#installing-the-agent--quick-usage-examples) the script directly in vanilla JavaScript or use a type-safe [SDK](https://dev.fingerprint.com/docs/frontend-libraries) for your favorite framework. Here is a [React SDK](https://github.com/fingerprintjs/fingerprintjs-pro-react) example wrapping the application (or component) inside `FpjsProvider`:

    ```js
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

   4. All the code snippets on the Integrations page already include your Public API Key, but you can also find it in **App Settings** → **API Keys**.

   5. Open your website or application with Fingerprint Pro installed. You should see your identification event inside the Fingerprint [dashboard](https://dashboard.fingerprint.com/) → **Identification**.

Consult the Fingerprint Pro [Quick Start Guide](https://dev.fingerprint.com/docs/quick-start-guide) or contact [Fingerprint support](https://fingerprint.com/support/) if you have any questions.

> Note: For production deployments, we recommend routing requests to Fingerprint Pro APIs through your own domain. This prevents ad blockers from disrupting identification requests and improves accuracy. We offer a variety of proxy integration options, see [Protecting your JavaScript agent from ad blockers](https://dev.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers) for more details.


2\. Send Fingerprint Pro results to Auth0 during sign-up
-----------------------------------------

> __*Note*__: Your sign-up page must be hosted by your application so you can use Fingerprint on it and send the results as part of the sign-up request. This integration is not supported when using the Auth0-hosted sign-up page (Universal Login / classic Lock).

1. Modify your sign-up page get the Fingerprint data and send the `visitorId` and `requestId` as additional parameters of your sign-up API request. See the basic React example below: 

 ```js
 import React from "react";
 import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";

 const SignupComponent = () => {
  const { data } = useVisitorData();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`api/signup`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: event.currentTarget.name.value,
          email: event.currentTarget.email.value,
          password: event.currentTarget.password.value,
          visitorId: data?.visitorId,
          requestId: data?.requestId,
        }),
        method: "POST",
      });

      const responseData = await response.json();
      if (response?.ok) {
        // Handle successful sign-up
      }
    } catch (err) {
      // Handle sign up error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Name" />
      <input type="email" name="email" placeholder="Email" />
      <input type="password" name="password" placeholder="Password" />
      <button type="submit" value="Submit" name="submit-form">
        Sign up
      </button>
    </form>
  );
};
```

2. On the server, include the Fingerprint values inside `app_metadata` when [creating a user with the Auth0 Management API](https://auth0.com/docs/api/management/v2/users/post-users):

  ```js
    // pages/api/signup.js
    export default async function createUserEndpoint(req, res) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Accept", "application/json");
      myHeaders.append("Authorization", `Bearer {YOUR_AUTH0_BEARER_TOKEN}`);
    
      const { name, email, password, visitorId, requestId } = req.body;
    
      var requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connection: "YOUR_AUTH0_DATABASE_CONNECTION_NAME",
          email,
          password,
          name,
          app_metadata: {
            visitorId,
            requestId,
          },
        }),
      };
    
      try {
        const result = (
          await fetch(
            "https://YOUR_AUTH0_DOMAIN_AND_REGION.auth0.com/api/v2/users",
            requestOptions
          )
        ).json();
        return res.status(200).json(result);
      } catch (error) {
        console.log(error);
        return res.status(400).json(error);
      }
    }
  ```

Note: To use Auth0 Management API this way you will need the following:
  
* [Machine-to-machine application](https://auth0.com/docs/get-started/auth0-overview/create-applications)
* [Database connection](https://auth0.com/docs/authenticate/database-connections)
* [Mechanism for getting the Management API Bearer token in production](https://auth0.com/docs/secure/tokens/access-tokens/get-management-api-access-tokens-for-production)

Your implementation details will vary depending on your user registration flow. The goal is to send the request and visitor IDs within `app_metadata` when creating the user via Auth0 API as shown above.


3\. Use the Fingerprint result in a Pre User Registration Auth0 Action
-----------------------------------------------------

The Fingerprint `visitorId` and `requestId` will be available inside the Auth0 [Action](https://auth0.com/docs/customize/actions/actions-overview). The pre-registration flow outlined below prevents malicious actors from creating multiple accounts on the same browser or device by checking how many accounts are already associated with that visitor ID.


1. Create a new [Pre User Registration Action](https://auth0.com/docs/customize/actions/flows-and-triggers/pre-user-registration-flow) in Auth0.
2. Add the `@fingerprintjs/fingerprintjs-pro-server-api` library as a dependency of the action using the [Auth0 Action Dependencies](https://auth0.com/docs/customize/actions/manage-dependencies). 
    > You will use the [Fingerprint Server API](https://dev.fingerprint.com/reference/pro-server-api) to verify the authenticity of the provided visitor ID and check additional Smart signals for signs of fraudulent activity.
3. Add `auth0` as a dependency in the same way.
    > In this example, `visitorIds` are stored in `app_metadata` of the user's Auth0 profile.  You will use the Auth0 Management API client to find all users with the provided visitor ID. In production, we recommend storing the user-visitorId association in your database instead.
5. Add the following [Auth0 secret values](https://auth0.com/docs/customize/actions/write-your-first-action#add-a-secret) to your action:
    * `api_key` - your Fingerprint Secret API Key
    * `domain` - your Auth0 domain
    * `clientId` - your Auth0 application Client ID
    * `clientSecret` - your Auth0 application Client Secret
6. Add the action source code below.

```js
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
      // If not, create the user and initialize their visitorIds array with the provided visitor ID
      api.user.setAppMetadata("visitorIds", [visitorId]);
    }
  } catch (err) {
    // In case of error, fail silently - don't block sign-up
    console.log("Auth0-related error: ", err);
  }
};
```

The above action script is just an example of how Fingerprint can prevent promo abuse or synthetic account creation at sign-up. See [Use cases](https://fingerprint.com/use-cases/) to explore different ways of preventing fraud and streamlining user experiences with Fingerprint.

Troubleshooting
---------------

To learn more about Fingerprint Pro, visit our [website](https://fingerprint.com/) or read the [documentation](https://dev.fingerprint.com/docs). If you have any questions, reach out to our [support](https://fingerprint.com/support/).
