Shopify Web Pixel API makes it easier to collect customers' behavioural data. We will be creating a simple tracker that sends add-to-cart events and event data to our app backend. While making this tracker we will understand how this extension works.

> **Prerequisites**
> 
> I am assuming that you have some knowledge of building Shopify apps.

I have already created a basic test app using the command

```bash
yarn create @shopify/app
```

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1675864019238/73ffc481-01e4-4d86-a5c0-b02dabff0e9c.png)

To use Pixel API our app needs two Shopify scopes. Scopes are write\_pixel and read\_customer\_events.

`./shopify.app.toml`

```ini
# This file stores configurations for your Shopify app.

scopes = "write_products,write_pixels,read_customer_events"
```

We need to install the app on our development store using the command.

```bash
yarn dev
```

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686670777717/8b01f491-e4b4-47a1-b8a1-3049cda93803.png)

With this app installation end's on the store now we need to start tracking events with pixel API.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686670833546/f369a49a-f9df-4040-b6fc-6ce29d09c493.png )

To connect pixel API with our current app we will use a Shopify command to create an extension.

```bash
yarn run shopify app generate extension
```

There are many extension options available we need to choose Web Pixel.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686670325525/e8f85c26-fc33-4d62-bc10-086ca5141a9a.png )

After this, we can see that a new folder has appeared in our app folder structure.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686670400501/82d2bb23-41ed-4348-ab0e-6f9f8b860344.png )

Now we need to create an endpoint to enable pixel API. We will use the webPixelCreate mutation.

```javascript
app.post("/api/webpixel", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const response = await client.query({
    data: {
      query: `
      mutation webPixelCreate($webPixelInput: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixelInput) {
          webPixel {
            settings
            id
          }
          userErrors {
            code
            field
            message
          }
        }
      }
      `,
      variables: {
        webPixelInput: {
          settings: {
            accountID: crypto.randomUUID(),
          },
        },
      },
    },
  });

  if (response.body.data.webPixelCreate.userErrors.length) {
    const errors = queryResponse.body.data.webPixelCreate.userErrors;
    throw new Error(errors.map((error) => error.message).join(" , "));
  }

  return response.body.data.webPixelCreate.webPixel;
});
```

We are first creating a graphql client. After that we are sending a webPixelCreate mutation.

> The accountID in variables is the setting that we pass from webpixel to Shopify. We can create other variables like this by editing the shopify.ui.extension.toml file.

Let's create a button on the frontend to consume this endpoint

`./web/frontend/pages/index.jsx`

```javascript
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Text,
  Button,
} from "@shopify/polaris";
import {
  TitleBar,
  useAuthenticatedFetch,
  useToast,
} from "@shopify/app-bridge-react";
import { useTranslation, Trans } from "react-i18next";

import { trophyImage } from "../assets";

import { ProductsCard } from "../components";

export default function HomePage() {
  const { t } = useTranslation();
  const fetch = useAuthenticatedFetch();
  const toast = useToast();

  const enableTracker = async () => {
    const response = await fetch("/api/webpixel", {
      method: "POST",
    });
    const data = await response.json();

    toast.show("Tracker installed");
  };

  return (
    <Page narrowWidth>
      <Button primary onClick={enableTracker}>
        Enable Tracker
      </Button>
      <TitleBar title={t("HomePage.title")} primaryAction={null} />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Stack
              wrap={false}
              spacing="extraTight"
              distribution="trailing"
              alignment="center"
            >
              <Stack.Item fill>
                <TextContainer spacing="loose">
                  <Text as="h2" variant="headingMd">
                    {t("HomePage.heading")}
                  </Text>
                  <p>
                    <Trans
                      i18nKey="HomePage.yourAppIsReadyToExplore"
                      components={{
                        PolarisLink: (
                          <Link url="https://polaris.shopify.com/" external />
                        ),
                        AdminApiLink: (
                          <Link
                            url="https://shopify.dev/api/admin-graphql"
                            external
                          />
                        ),
                        AppBridgeLink: (
                          <Link
                            url="https://shopify.dev/apps/tools/app-bridge"
                            external
                          />
                        ),
                      }}
                    />
                  </p>
                  <p>{t("HomePage.startPopulatingYourApp")}</p>
                  <p>
                    <Trans
                      i18nKey="HomePage.learnMore"
                      components={{
                        ShopifyTutorialLink: (
                          <Link
                            url="https://shopify.dev/apps/getting-started/add-functionality"
                            external
                          />
                        ),
                      }}
                    />
                  </p>
                </TextContainer>
              </Stack.Item>
              <Stack.Item>
                <div style={{ padding: "0 20px" }}>
                  <Image
                    source={trophyImage}
                    alt={t("HomePage.trophyAltText")}
                    width={120}
                  />
                </div>
              </Stack.Item>
            </Stack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <ProductsCard />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

This is a simple react component that we will use to enable the tracker.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686670700544/c911a296-0a1b-4385-8f74-78e55436e069.png )

Now let's send some customer events to our backend.

Pixel API can subscribe to different events the most common ones are

1. checkout\_started - Fires on checkout start.
    
2. collection\_viewed - Fires on collection page view.
    
3. page\_viewed - Fires when customers view any page.
    
4. product\_added\_to\_cart - Fires when the customer adds any product to the cart.
    
5. product\_viewed - Fires when the customer visits the product page.
    
6. checkout\_completed - Fires on checkout complete.
    

With Every event, we get an event object which consists of different types of data depending on the event. For example, when product\_added\_to\_cart event fires then we will get an event object. This object will contain information about the product that the customer has added.

`./extensions/tracker/src/index.ts`

```typescript
import { register } from "@shopify/web-pixels-extension";

register(({ analytics }) => {
  analytics.subscribe("product_added_to_cart", async (event) => {
    console.log("event", event);
  });
});
```

Now when we add a product to our cart we will get an event of this type.

```json
{
    "id": "sh-b52dc9da-35AC-47D6-3C29-8ABBBD3D7BBB",
    "clientId": "76dfa2b795f37436170c42978f9dbaab",
    "timestamp": "2023-06-13T14:34:12.629Z",
    "name": "product_added_to_cart",
    "context": {
        "document": {
            "location": {
               // window location related 
            },
        },
        "navigator": {
            // window navigator properties
        },
        "window": {
          // some important window properties
        }
    },
    "data": {
        "cartLine": {
            "cost": {
                "totalAmount": {
                    "amount": 600,
                    "currencyCode": "INR"
                }
            },
            "merchandise": {
                "id": "123456789",
                "image": {
                    "src": "https://something-random.com"
                },
                "price": {
                    "amount": 600,
                    "currencyCode": "INR"
                },
                "product": {
                    "id": "8123348812079",
                    "title": "The Collection Snowboard: Hydrogen",
                    "vendor": "Hydrogen Vendor",
                    "type": "",
                    "untranslatedTitle": "The Collection Snowboard: Hydrogen"
                },
                "sku": "",
                "title": null,
                "untranslatedTitle": null
            },
            "quantity": 1
        }
    }
}
```

To send this event to the backend we will use window beacon API.

<mark>The endpoint that pixel api request to send tracking data should be open. Pixel api request doesn't have the session token generated by the shopify app bridge. This session token validates the request.</mark>

```typescript
import { register } from "@shopify/web-pixels-extension";
import {API_URL} from "./constants";

register(({ analytics, browser }) => {
  analytics.subscribe("product_added_to_cart", async (event) => {
    const url = `${API_URL}/track`;
    const isSuccessful = await browser.sendBeacon(
      url,
      JSON.stringify({ ...event })
    );
    if (!isSuccessful) throw new Error("Unable to send via Beacon API");
  });
});
```

We can now create a backend route for this endpoint.

```typescript
app.post("/api/track", (_req, res) => {
  console.log(_req.body);
});
```

With this our simple tracker is finished!.