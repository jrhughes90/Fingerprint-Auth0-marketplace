# Fingerprint - Prevent Sign-up Abuse - Auth0 Marketplace

The Fingerprint and Okta Customer Identity Cloud (CIC) powered by Auth0 integration is designed to provide a unique identifier for each of your user's devices. This is a powerful signal that helps reduce fraud and improve the user experience. 

The integration is powered by Fingerprint Pro's device detection technology, which is an industry-leading solution that quickly and accurately identifies the characteristics of a browser or device. The device information, with unparalleled accuracy, is then used to create a unique and immutable device fingerprint that can be used to securely identify a user's device and detect any malicious activity.

## Prerequisites

1. An Auth0 account and tenant. [Sign up for free](https://auth0.com/signup).
2. A Fingerprint Pro account. [Sign up for free](https://dashboard.fingerprint.com/signup/)

## Set up Fingerprint Pro

To configure the integration with Fingerprint:

1. Create your Fingerprint Pro Account and Log into the dashboard
2. Login to the Fingerprint dashboard https://dashboard.fingerprint.com/login
3. Make sure the correct region is selected during account setup https://dev.fingerprintjs.com/docs/regions
4. Click on “API keys” on the left pane to get your Public and Private keys. The public key will be used in the configuration of your client side application.
5. Follow the quickstart guide here https://dev.fingerprint.com/docs/quick-start-guide Fingerprint offers multiple SDKs for mobile and web applications, choose the most suitable for your application. If you have issues, please contact https://fingerprint.com/support/
6. After integration, redeploy and visit your application.
7. Return to your Fingerprint Dashboard, click on "Fingerprint Pro" in the left hand menu and verify a visitorId and RequestId is being returned.
8. In your application, find where the Auth0 Login is being called. In this example, we created a wrapper for the Auth0 Login method to pass in the Fingerprint visitorId and the requestId.

```async function loginWithFingerprint() {
if (data) {
return loginWithRedirect({
fingerprint: `${data.visitorId} ${data.requestId}`,
});
}
return console.log(data);
}
```

This is languange dependent and your implementation may look different than this. Ultimately, you are passing in the visitorId as well as the requestId into Auth0's /authorize URL. Relevant snippets from a React example will be included at the bottom of this guide.

9. The visitorId and requestId can now be accessed within a post-login Action using ```event.request.query.fingerprint```. Note: you will need to split the string to use the values independently. 

Additional Considerations:
It's important to note that this is only recommended for use with the New Universal Login Experience as it's server-side rendered. Using this integration with Classic UL will result in the additonal parameters being visible to the end user.


#### Subdomain Setup:

While the Fingerprint Subdomain integration is not required, we highly recommend configuring this. It increases accuracy by allowing Fingerprint to use first-party cookies and protects from identification requests being blocked by browsers or ad blockers.
https://dev.fingerprint.com/docs/subdomain-integration
If more than 1 subdomain is needed, setup all of the subdomains together and then add the A records for all domains in your DNS.

#### React SPA Snippet examples:

##### //Index.js

```
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Auth0Provider } from "@auth0/auth0-react";
import { FpjsProvider } from "@fingerprintjs/fingerprintjs-pro-react";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
<React.StrictMode>
<FpjsProvider
cacheLocation="memory"
loadOptions={{
        apiKey: process.env.REACT_APP_FPJS_PUBLIC_API_KEY,
        endpoint: ["fp.YOURDOMAIN.com"],
        region: "us",
      }} >
<Auth0Provider
            domain={process.env.REACT_APP_DOMAIN}
            clientId={process.env.REACT_APP_CLIENT_ID}
            redirectUri={window.location.origin}
          >
<App />
</Auth0Provider>
,
</FpjsProvider>
</React.StrictMode>

```

##### //NavBar.js

```
import { useAuth0 } from "@auth0/auth0-react";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";

const Navbar = () => {
const navigate = useNavigate();
const dispatch = useDispatch();

const { data } = useVisitorData();
const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();

    async function loginWithFingerprint() {
    if (data) {
      return loginWithRedirect({
        fingerprint: `${data.visitorId} ${data.requestId}`,
      });
    }
    return console.log(data);

}

  <Button onClick={loginWithFingerprint}>
   <AccountCircleOutlinedIcon />
       SIGN IN
   </Button>
```



## Troubleshooting

Fingerprint Documentation: https://dev.fingerprint.com/docs
Language Specific Fingeprint Repos: https://github.com/orgs/fingerprintjs/repositories
Fingerprint Support: https://fingerprint.com/support/
