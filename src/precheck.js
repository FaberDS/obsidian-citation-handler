const MIN_CHROME_VERSION = 144;
export function checkBrowserSupport() {
  const ua = navigator.userAgent;

  const isMobile = /Mobi|Android/i.test(ua);

  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const isChrome = !!chromeMatch && !/Edg|OPR|Brave/i.test(ua);
  const version = chromeMatch ? parseInt(chromeMatch[1], 10) : 0;

  if (navigator.userAgentData) {
    const brands = navigator.userAgentData.brands;
    const isMobileData = navigator.userAgentData.mobile;

    const chromeBrand = brands.find(
      (b) => b.brand === "Google Chrome" || b.brand === "Chromium",
    );

    if (isMobileData) return fail("Mobile devices are not supported.");
    if (!chromeBrand) return fail("This application requires Google Chrome.");

    if (parseInt(chromeBrand.version) < MIN_CHROME_VERSION) {
      return fail(
        `Chrome version ${MIN_CHROME_VERSION}+ is required. You have version ${chromeBrand.version}.`,
      );
    }

    return true;
  }

  if (isMobile) return fail("Mobile devices are not supported.");
  if (!isChrome) return fail("This application requires Google Chrome.");
  if (version < MIN_CHROME_VERSION)
    return fail(
      `Chrome version ${MIN_CHROME_VERSION}+ is required. You have version ${version}.`,
    );

  return true;
}

function fail(reason) {
  document.body.innerHTML = `
    <div style="
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: sans-serif;
      background: #fdfdfd;
      color: #1a1b1e;
      padding: 20px;
    ">
      <h2 style="color: #e03131; margin-bottom: 10px;">Browser Not Supported</h2>
      <p style="font-size: 16px; color: #5e6c84; max-width: 400px; line-height: 1.5;">
        ${reason}
      </p>
      <p style="margin-top: 20px; font-size: 14px; color: #888;">
        This application relies on the File System Access API which is only available 
        in the latest desktop versions of Google Chrome.
      </p>
    </div>
  `;

  throw new Error("Precheck failed: " + reason);
}
