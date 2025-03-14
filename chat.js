import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import proxyChain from "puppeteer-page-proxy";
import fs from "fs";
import ora from "ora";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Enable Stealth mode
puppeteer.use(StealthPlugin());

const STAKE_URL = "https://stake.com/chat";
const MESSAGE_INTERVAL = 15000; // 15 seconds
const COOKIES_FILE = "cookies.json";
const MESSAGE_FILE = "NTE-Pesan.txt";

// Proxy Settings
const USE_PROXY = process.env.USE_PROXY === "true"; // Enable/Disable proxy
const PROXY_URL = process.env.PROXY_URL; // Example: http://your-proxy-ip:port
const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

// Function to load cookies
async function loadCookies(page) {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE));
    await page.setCookie(...cookies);
    console.log("✅ Loaded cookies!");
  }
}

// Function to save cookies
async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies saved!");
}

async function startBot() {
  console.clear();
  console.log("🚀 Starting the bot...");

  const spinner = ora("Launching browser...").start();

  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
      ...(USE_PROXY ? [`--proxy-server=${PROXY_URL}`] : []), // Apply proxy if enabled
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
  );

  if (USE_PROXY && PROXY_USERNAME && PROXY_PASSWORD) {
    await page.authenticate({
      username: PROXY_USERNAME,
      password: PROXY_PASSWORD,
    });
    console.log("✅ Proxy authentication successful!");
  }

  await loadCookies(page);
  await page.goto(STAKE_URL, { waitUntil: "networkidle2" });

  if (!(await page.cookies()).some(cookie => cookie.name === "session")) {
    spinner.warn("⚠️ Log in manually. Press ENTER when done...");
    await new Promise(resolve => process.stdin.once("data", resolve));
    await saveCookies(page);
  }

  spinner.succeed("✅ Browser ready. Starting automation...");

  // Load messages
  const messages = fs.readFileSync(MESSAGE_FILE, "utf8")
    .split("\n")
    .map(m => m.trim())
    .filter(m => m);

  if (messages.length === 0) {
    console.error("❌ No messages found in NTE-Pesan.txt");
    await browser.close();
    return;
  }

  const chatSelectors = [
    { name: "English", selector: 'path[d="M48 96c26.51 0 48-21.49 48-48S74.51 0 48 0 0 21.49 0 48s21.49 48 48 48Z"]' },
    { name: "Sport", selector: 'path[d="M54.43 95.557a46.563 46.563 0 0 1-6.474.441c-26.428 0-47.85-21.423-47.85-47.85 0-26.427 21.422-47.85 47.85-47.85 24.14 0 44.102 17.874 47.379 41.112l.03.252a46.44 46.44 0 0 1 .444 6.498c0 24.141-17.883 44.106-41.127 47.367l-.253.03Z"]' },
    { name: "Challenges", selector: 'path[d="M72 6.435H24L0 48l24 41.565h48L96 48 72 6.435Z"]' },
  ];

  for (let i = 0; i < 10000000; i++) {
    for (const chat of chatSelectors) {
      try {
        await sendMessage(page, messages, chat.name);
      } catch {
        console.log(`❌ Failed to chat in ${chat.name}`);
      }

      try {
        await switchChat(page, chat.selector);
      } catch {
        console.log(`❌ Failed to switch to ${chat.name}`);
      }
    }
  }
}

async function sendMessage(page, messages, chatName) {
  const spinner = ora(`💬 Sending message in ${chatName} chat...`).start();

  await page.waitForSelector(
    "#svelte > div.wrap.svelte-1j5sgxf > div.footer.svelte-1g9csv6 > div.chat-input.svelte-15zhun5 > label > div > textarea",
    { timeout: 60000 }
  );

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  await page.type(
    "#svelte > div.wrap.svelte-1j5sgxf > div.footer.svelte-1g9csv6 > div.chat-input.svelte-15zhun5 > label > div > textarea",
    randomMessage
  );

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  spinner.succeed(`✅ Sent message: "${randomMessage}"`);
  await new Promise(resolve => setTimeout(resolve, MESSAGE_INTERVAL));
}

async function switchChat(page, selector) {
  const spinner = ora("🔄 Switching chat...").start();

  await page.waitForSelector(
    '#svelte > div.wrap.svelte-1j5sgxf > div.header.svelte-1g9csv6 > div.dropdown.svelte-16sy7kx.transparent > button',
    { timeout: 60000 }
  );
  await page.click(
    '#svelte > div.wrap.svelte-1j5sgxf > div.header.svelte-1g9csv6 > div.dropdown.svelte-16sy7kx.transparent > button'
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  await page.waitForSelector(selector, { timeout: 60000 });
  await page.click(selector);

  spinner.succeed("✅ Switched chat!");
  await new Promise(resolve => setTimeout(resolve, 5000));
}

startBot();
