import { register } from "@shopify/web-pixels-extension";
const API_URL = "https://your-url.com/api"

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
