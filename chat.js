import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin()); // Enable Stealth mode

const STAKE_URL = "https://stake.com/chat";
const MESSAGE_INTERVAL = 15000; // 15 seconds
const COOKIES_FILE = "cookies.json";

// Load cookies if available
async function loadCookies(page) {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE));
    await page.setCookie(...cookies);
    console.log("✅ Loaded cookies!");
  }
}

// Save cookies after login
async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies saved!");
}

async function startBot() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for manual login
    ignoreHTTPSErrors: true, // Bypass SSL errors
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled", // Hide automation
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
  );

  await loadCookies(page);
  await page.goto(STAKE_URL, { waitUntil: "networkidle2" });

  if (!(await page.cookies()).some(cookie => cookie.name === "session")) {
    console.log("🚀 Log in manually. Press ENTER when done...");
    await new Promise(resolve => process.stdin.once("data", resolve));
    await saveCookies(page);
  }

  console.log("✅ Starting automation...");

  const messages = fs
    .readFileSync("NTE-Pesan.txt", "utf8")
    .split("\n")
    .map((m) => m.trim())
    .filter((m) => m);

  if (messages.length === 0) {
    console.error("❌ No messages found in NTE-Pesan.txt");
    await browser.close();
    return;
  }

  // Wait for the chat input box
  await page.waitForSelector(
    "#svelte > div.wrap.svelte-1j5sgxf > div.footer.svelte-1g9csv6 > div.chat-input.svelte-15zhun5 > label > div > textarea",
    { timeout: 60000 }
  );

  async function sendMessage() {
    const randomMessage =
      messages[Math.floor(Math.random() * messages.length)];

    await page.type(
      "#svelte > div.wrap.svelte-1j5sgxf > div.footer.svelte-1g9csv6 > div.chat-input.svelte-15zhun5 > label > div > textarea",
      randomMessage
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Press Enter to send the message
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    console.log("✅ Sent message:", randomMessage);
  }

  setInterval(sendMessage, MESSAGE_INTERVAL);
}

startBot();
