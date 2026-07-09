import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const tmpDir = path.join(root, "tmp");
const assetsDir = path.join(root, "assets");
const pdfDir = path.join(root, "output", "pdf");
const refImage = path.join(assetsDir, "ChatGPT Image 8 июл. 2026 г., 19_42_05.png");
const driverImage = path.join(assetsDir, "99fc98ad-0b0b-415e-8066-b01ac6d9e27a.jpg");
const generatedDir = path.join(
  process.env.USERPROFILE || "",
  ".codex",
  "generated_images",
  "019f426a-9b97-7002-af2b-aed76c0721df",
);
const heroPolo = path.join(generatedDir, "ig_06fce85fbbd7712a016a4e72149338819181b90775fcbcfc19.png");
const fleetPolo = path.join(generatedDir, "ig_06fce85fbbd7712a016a4e7276b54c819185c2d007244bf65f.png");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function connectChrome() {
  const userDataDir = path.join(tmpDir, "edge-profile");
  await rm(userDataDir, { recursive: true, force: true });
  await mkdir(userDataDir, { recursive: true });

  const port = 9333;
  const edge = spawn(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let version;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      version = await getJson(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await wait(250);
    }
  }

  if (!version?.webSocketDebuggerUrl) {
    edge.kill();
    throw new Error("Edge DevTools endpoint did not start.");
  }

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const text = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
    const payload = JSON.parse(text);
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) {
      reject(new Error(payload.error.message));
    } else {
      resolve(payload.result);
    }
  });
  ws.addEventListener("close", () => {
    for (const { reject } of pending.values()) {
      reject(new Error("Edge DevTools connection closed."));
    }
    pending.clear();
  });

  const sendRaw = (method, params = {}, sessionId = undefined) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject });
      const message = { id, method, params };
      if (sessionId) message.sessionId = sessionId;
      ws.send(JSON.stringify(message));
    });

  const { targetId } = await sendRaw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await sendRaw("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  return {
    edge,
    send(method, params = {}) {
      return sendRaw(method, params, sessionId);
    },
    close() {
      ws.close();
      edge.kill();
    },
  };
}

function mimeFrom(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function runEdge(args, captureStdout = false) {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(tmpDir, `edge-run-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const baseArgs = [
      "--headless",
      "--disable-gpu",
      "--disable-gpu-compositing",
      "--disable-gpu-sandbox",
      "--disable-accelerated-2d-canvas",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-first-run",
      "--disable-extensions",
      `--user-data-dir=${userDataDir}`,
    ];
    const child = spawn(edgePath, [...baseArgs, ...args], { windowsHide: true });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const errorText = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(`Edge exited with code ${code}${errorText ? `: ${errorText}` : ""}`));
        return;
      }
      resolve(captureStdout ? Buffer.concat(stdout).toString("utf8") : "");
    });
  });
}

async function encodeWebp(spec) {
  const base64 = await readFile(spec.source, "base64");
  const payload = {
    dataUrl: `data:${mimeFrom(spec.source)};base64,${base64}`,
    width: spec.width,
    height: spec.height,
    crop: spec.crop || null,
    fit: spec.fit || "cover",
    quality: spec.quality || 0.82,
  };

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head><body><img id="source" alt="" src="${payload.dataUrl}" style="display:none"><pre id="result">pending</pre>
<script>
const spec = ${JSON.stringify({ ...payload, dataUrl: "" })};
window.addEventListener("load", () => {
  try {
    const image = document.getElementById("source");
    const canvas = document.createElement("canvas");
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;

    if (spec.crop) {
      sx = spec.crop.sx;
      sy = spec.crop.sy;
      sw = spec.crop.sw;
      sh = spec.crop.sh;
    } else if (spec.fit === "cover") {
      const srcRatio = image.naturalWidth / image.naturalHeight;
      const dstRatio = spec.width / spec.height;
      if (srcRatio > dstRatio) {
        sw = image.naturalHeight * dstRatio;
        sx = (image.naturalWidth - sw) / 2;
      } else {
        sh = image.naturalWidth / dstRatio;
        sy = (image.naturalHeight - sh) / 2;
      }
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, spec.width, spec.height);
    document.getElementById("result").textContent = canvas.toDataURL("image/webp", spec.quality);
  } catch (error) {
    document.getElementById("result").textContent = "ERROR: " + error.stack;
  }
});
</script></body></html>`;

  const tempHtml = path.join(tmpDir, `encode-${spec.name}.html`);
  await writeFile(tempHtml, html, "utf8");
  const output = await runEdge(
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--allow-file-access-from-files",
      "--virtual-time-budget=15000",
      "--dump-dom",
      pathToFileURL(tempHtml).href,
    ],
    true,
  );
  const match = output.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
  if (!match) {
    await writeFile(path.join(tmpDir, "last-dump.html"), output, "utf8");
    throw new Error(`WebP data was not produced for ${spec.name}.`);
  }
  const out = Buffer.from(match[1], "base64");
  await writeFile(path.join(assetsDir, spec.name), out);
}

const imageSpecs = [
  { name: "hero-polo.webp", source: heroPolo, width: 1600, height: 720, quality: 0.86 },
  { name: "polo-fleet.webp", source: fleetPolo, width: 800, height: 400, quality: 0.84 },
  {
    name: "driver-vadim.webp",
    source: driverImage,
    width: 520,
    height: 520,
    quality: 0.84,
    crop: { sx: 150, sy: 470, sw: 900, sh: 900 },
  },
  { name: "apt-kitchen.webp", source: refImage, width: 320, height: 230, quality: 0.72, crop: { sx: 54, sy: 469, sw: 84, sh: 76 } },
  { name: "apt-room.webp", source: refImage, width: 320, height: 230, quality: 0.72, crop: { sx: 139, sy: 469, sw: 84, sh: 76 } },
  { name: "apt-bedroom.webp", source: refImage, width: 320, height: 230, quality: 0.72, crop: { sx: 224, sy: 469, sw: 84, sh: 76 } },
  { name: "route-hermitage.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 329, sy: 468, sw: 82, sh: 68 } },
  { name: "route-interior.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 414, sy: 468, sw: 82, sh: 68 } },
  { name: "route-strelna.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 499, sy: 468, sw: 84, sh: 68 } },
  { name: "route-pushkin.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 329, sy: 581, sw: 82, sh: 68 } },
  { name: "route-pavlovsk.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 414, sy: 581, sw: 82, sh: 68 } },
  { name: "route-palace.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 499, sy: 581, sw: 84, sh: 68 } },
  { name: "route-peterhof.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 329, sy: 694, sw: 82, sh: 68 } },
  { name: "route-lomonosov.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 414, sy: 694, sw: 82, sh: 68 } },
  { name: "route-harbor.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 499, sy: 694, sw: 84, sh: 68 } },
  { name: "route-gatchina.webp", source: refImage, width: 320, height: 220, quality: 0.72, crop: { sx: 329, sy: 807, sw: 82, sh: 68 } },
  { name: "custom-route.webp", source: refImage, width: 760, height: 500, quality: 0.78, crop: { sx: 565, sy: 1078, sw: 259, sh: 174 } },
  { name: "night-spb.webp", source: refImage, width: 800, height: 430, quality: 0.78, crop: { sx: 38, sy: 1304, sw: 286, sh: 152 } },
];

const routes = [
  { number: "1", title: "Маршрут №1 (4 дня)", price: "76 000 рублей" },
  { number: "2", title: "Маршрут №2 (3 дня)", price: "60 000 рублей" },
  { number: "3", title: "Маршрут №3 (без предоставления апартаментов)", price: "61 000 рублей" },
];

function contractHtml(route) {
  const routeLine = route.title;
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Публичный договор оферты - ${routeLine}</title>
  <style>
    @page { size: A4; margin: 18mm 17mm 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #14243a;
      font-family: "Times New Roman", Georgia, serif;
      font-size: 12.4pt;
      line-height: 1.44;
      background: #ffffff;
    }
    .document { width: 100%; }
    .topline {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
      border-bottom: 2px solid #c9872b;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .brand { font-family: Georgia, "Times New Roman", serif; font-size: 18pt; font-weight: 700; color: #08274a; }
    .sub { color: #8b5c1f; font-size: 10.5pt; letter-spacing: 0.04em; text-transform: uppercase; }
    .number {
      min-width: 170px;
      border: 1px solid #d9c4a7;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fffaf2;
      text-align: right;
      font-size: 11pt;
    }
    h1 {
      margin: 10px 0 18px;
      color: #08274a;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20pt;
      line-height: 1.18;
      text-align: center;
      text-transform: uppercase;
    }
    h2 {
      margin: 18px 0 8px;
      color: #08274a;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 14pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 1px solid #e5d2b9;
      padding-bottom: 4px;
      break-after: avoid;
    }
    p { margin: 0 0 9px; text-align: justify; }
    ol, ul { margin: 0 0 9px 18px; padding: 0; }
    li { margin: 0 0 7px; text-align: justify; }
    .route-box {
      margin: 14px 0 16px;
      padding: 12px 14px;
      border: 1px solid #d9c4a7;
      border-left: 5px solid #c9872b;
      border-radius: 8px;
      background: #fffaf2;
      color: #08274a;
      font-weight: 700;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 28px;
      break-inside: avoid;
    }
    .sign {
      min-height: 92px;
      border: 1px solid #d9c4a7;
      border-radius: 8px;
      padding: 12px;
      background: #fffdfa;
    }
    .line { border-bottom: 1px solid #8d8d8d; height: 28px; margin-top: 16px; }
    .muted { color: #516071; font-size: 10.6pt; }
  </style>
</head>
<body>
  <main class="document">
    <header class="topline">
      <div>
        <div class="brand">АвтоТурСПб</div>
        <div class="sub">Путешествуйте с комфортом</div>
      </div>
      <div class="number">
        <strong>№ ${route.number}</strong><br>
        ${routeLine}<br>
        <span class="muted">${route.price}</span>
      </div>
    </header>

    <h1>Публичный договор (оферта) аренды транспортного средства с водителем</h1>

    <div class="route-box">Выбранный маршрут для настоящего договора: ${routeLine}.</div>

    <h2>Общие положения</h2>
    <p>Настоящая Публичная Оферта аренды транспортного средства с водителем является предложением Арендодателя заключить публичный договор посредством интернет-ресурса ………. с любым заинтересованным лицом, отвечающим критериям, установленным лицом, адресовавшим оферту, на условиях, предусмотренных ниже.</p>
    <p>Настоящий Договор является публичной офертой в соответствии со ст. 437 Гражданского кодекса РФ, т.е. содержит все существенные условия Договора, из которого усматривается воля лица, делающего предложение, заключить Договор на указанных условиях с любым лицом, совершившим акцепт оферты (предоплата - 5000 рублей) в соответствии с условиями настоящего Договора.</p>
    <p>Настоящая Электронный Договор по юридической силе приравнивается к Договору, составленному в письменной форме и подписанному Сторонами, в том числе удостоверенному печатями Сторон.</p>
    <p>Действующая редакция настоящего Договора размещается по адресу: https://www........l.</p>
    <p>Самозанятый Комарницкий Вадим Леонидович, ИНН 780520775646, № паспорта 4026 456989, именуемый в дальнейшем Арендодатель, с одной стороны, и лицо, акцептовавшее условия настоящей оферты, именуемое в дальнейшем Арендатор, с другой стороны, далее совместно именуемые Стороны, а по отдельности - Сторона, договорились заключить настоящий договор на указанных ниже условиях.</p>
    <p>Арендатор обязан полностью ознакомиться с условиями настоящего Договора. Акцепт (предоплата 5000 рублей) настоящего Договора означает принятие Арендатором условий настоящего Договора в соответствии с нормами действующего законодательства Российской Федерации.</p>

    <h2>Предмет договора</h2>
    <ol>
      <li>Арендодатель предоставляет Арендатору автомобиль(+кондиционер) с водителем на 9 часов (ПОДРЯД) в сутки, согласно выбранному маршруту, указанному на сайте …..: <strong>${routeLine}</strong>.</li>
      <li>Территория использования - территория СПб и ЛО.</li>
      <li>Заключение договора на аренду апартаментов осуществляется после их осмотра арендатором.</li>
    </ol>

    <h2>Порядок оплаты</h2>
    <p>100% оплата после прибытия арендатора на временное место проживания согласно выбранного маршрута на сайте …..</p>
    <p>Ознакомление Арендатора в полном объеме с условиями настоящего Договора, путем проставления отметки («галочка») в специальном поле при заполнении формы на Сайте, которую настоящим Арендодатель и Арендатор признают аналогом собственноручной подписи Арендатора, равным по юридической силе собственноручной подписи Арендатора Договора на бумажном носителе.</p>

    <h2>Срок действия</h2>
    <ul>
      <li>Договор вступает в силу с момента акцепта условий Арендатором.</li>
      <li>Договор заключен на определенный срок согласно выбранному Маршруту <strong>${routeLine}</strong> на сайте ….. Датой начала аренды является дата прибытия или следующий день от даты прибытия арендатора в город Санкт - Петербург.</li>
    </ul>

    <h2>Заключительные положения</h2>
    <ul>
      <li>Арендодатель вправе в одностороннем порядке вносить изменения в редакцию настоящего договора, уведомив об этом Арендатора путем публикации новой версии договора на Сайте Арендодателя. Оферта настоящего Договора является актуальной с момента публикации его на странице Сайта и действует неограниченное количество времени. Споры, возникающие из заключения, исполнения, изменения или прекращения настоящего договора, разрешаются по месту нахождения Арендодателя. Соблюдение предварительного (претензионного) порядка перед обращением в суд является для Сторон обязательным.</li>
      <li>Все уведомления и документация, связанные с исполнением обязательств по Договору, считаются надлежащим образом направленными и доставленными одной из Сторон, если они направляются в мессенджере WhatsApp, МАКС. Номер телефона Арендатора указывается последним через форму обратной связи на Сайте. Арендодатель вправе уведомлять Арендатора об изменении номера WhatsApp, МАКС, и реквизитов путем публикации новой информации на Сайте.</li>
      <li>Стороны признают юридическую силу переписки, сообщений, документов, направленных и/или размещенных на Сайте, и(или) в мессенджере WhatsApp, МАКС.</li>
      <li>В случае изменения почтового адреса, адреса электронной почты или каких-либо иных реквизитов, указанных в настоящем Договоре, Арендодатель публикует новые реквизиты на Сайте, а Арендатор направляет уведомление в адрес Арендодателя. Сторона обязана немедленно направить другой Стороне соответствующее уведомление с указанием нового адреса.</li>
    </ul>

    <section class="signatures">
      <div class="sign">
        <strong>Арендодатель</strong><br>
        Самозанятый Комарницкий Вадим Леонидович
        <div class="line"></div>
      </div>
      <div class="sign">
        <strong>Арендатор</strong><br>
        Лицо, акцептовавшее условия настоящей оферты
        <div class="line"></div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function printPdf(route) {
  const html = contractHtml(route);
  const slug = `marshrut-${route.number}`;
  const htmlPath = path.join(tmpDir, `dogovor-${slug}.html`);
  const pdfPath = path.join(pdfDir, `dogovor-${slug}.pdf`);
  await writeFile(htmlPath, html, "utf8");
  await runEdge([
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--allow-file-access-from-files",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ]);
}

async function main() {
  console.log(`build root: ${root}`);
  console.log(`images: ${imageSpecs.length}, pdfs: ${routes.length}`);
  const buildOnly = process.env.BUILD_ONLY || "pdf";
  await mkdir(assetsDir, { recursive: true });
  await mkdir(pdfDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  if (buildOnly !== "pdf") {
    for (const spec of imageSpecs) {
      console.log(`start image: ${spec.name}`);
      await encodeWebp(spec);
      console.log(`image: ${spec.name}`);
    }
  }
  if (buildOnly !== "images") {
    for (const route of routes) {
      await printPdf(route);
      console.log(`pdf: ${route.title}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
