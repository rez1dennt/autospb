import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const root = process.cwd();
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const assetsDir = path.join(root, "assets");
const sourceDir = path.join(assetsDir, "source");
const tmpDir = path.join(root, "tmp", "web-assets");

const assets = [
  {
    name: "apt-kitchen.webp",
    sourceName: "apt-kitchen-clean.jpg",
    title: "Empty apartment in Berlin with fitted kitchen, chair and plant",
    page: "https://commons.wikimedia.org/wiki/File:Empty_apartment_in_Berlin_with_fitted_kitchen,_chair_and_plant.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Empty_apartment_in_Berlin_with_fitted_kitchen%2C_chair_and_plant.jpg",
    license: "CC0",
    width: 420,
    height: 300,
    quality: 0.82,
  },
  {
    name: "apt-room.webp",
    sourceName: "apt-room.jpg",
    title: "Modern living room with stylish furniture",
    page: "https://commons.wikimedia.org/wiki/File:Modern_living_room_with_stylish_furniture_and_a_view_of_the_outdoors_in_a_cozy_apartment_setting.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Modern_living_room_with_stylish_furniture_and_a_view_of_the_outdoors_in_a_cozy_apartment_setting.jpg/1280px-Modern_living_room_with_stylish_furniture_and_a_view_of_the_outdoors_in_a_cozy_apartment_setting.jpg",
    license: "CC BY 2.0",
    width: 420,
    height: 300,
    quality: 0.82,
  },
  {
    name: "apt-bedroom.webp",
    sourceName: "apt-bedroom.jpg",
    title: "Hotel Room with queen size bed",
    page: "https://commons.wikimedia.org/wiki/File:Hotel_Room_with_queen_size_bed.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Hotel_Room_with_queen_size_bed.jpg/1280px-Hotel_Room_with_queen_size_bed.jpg",
    license: "CC BY-SA 3.0",
    width: 420,
    height: 300,
    quality: 0.82,
  },
  {
    name: "route-hermitage.webp",
    sourceName: "route-hermitage.jpg",
    title: "Hermitage Museum - Exterior view",
    page: "https://commons.wikimedia.org/wiki/File:Hermitage_Museum_-_Exterior_view_1.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hermitage_Museum_-_Exterior_view_1.jpg/1280px-Hermitage_Museum_-_Exterior_view_1.jpg",
    license: "CC BY-SA 3.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-interior.webp",
    sourceName: "route-interior-yusupov.jpg",
    title: "Interiors of the Yusupov Palace on Moika",
    page: "https://commons.wikimedia.org/wiki/File:20230520_Interiors_of_the_Yusupov_Palace_on_Moika_236.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/20230520_Interiors_of_the_Yusupov_Palace_on_Moika_236.jpg/1280px-20230520_Interiors_of_the_Yusupov_Palace_on_Moika_236.jpg",
    license: "CC BY 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-strelna.webp",
    sourceName: "route-strelna.jpg",
    title: "Konstantinovsky Palace, Strelna",
    page: "https://commons.wikimedia.org/wiki/File:8141.3._Strelna._Konstantinovsky_Palace.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/8141.3._Strelna._Konstantinovsky_Palace.jpg/1280px-8141.3._Strelna._Konstantinovsky_Palace.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-pushkin.webp",
    sourceName: "route-pushkin.jpg",
    title: "Catherine Palace in Tsarskoe Selo",
    page: "https://commons.wikimedia.org/wiki/File:Catherine_Palace_in_Tsarskoe_Selo.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Catherine_Palace_in_Tsarskoe_Selo.jpg/1280px-Catherine_Palace_in_Tsarskoe_Selo.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-pavlovsk.webp",
    sourceName: "route-pavlovsk.jpg",
    title: "Pavlovsk Palace",
    page: "https://commons.wikimedia.org/wiki/File:Pavlovsk_Palace-p1030787.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pavlovsk_Palace-p1030787.jpg/1280px-Pavlovsk_Palace-p1030787.jpg",
    license: "CC BY-SA 2.5",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-palace.webp",
    sourceName: "route-palace.jpg",
    title: "Mausoleum to Husband-Benefactor in Pavlovsk Park",
    page: "https://commons.wikimedia.org/wiki/File:Mausoleum_to_Husband-Benefactor_in_Pavlovsk_Park_01.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Mausoleum_to_Husband-Benefactor_in_Pavlovsk_Park_01.jpg/1280px-Mausoleum_to_Husband-Benefactor_in_Pavlovsk_Park_01.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-peterhof.webp",
    sourceName: "route-peterhof.jpg",
    title: "Samson fountain in Peterhof",
    page: "https://commons.wikimedia.org/wiki/File:Samson_fountain_in_Peterhof_02.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Samson_fountain_in_Peterhof_02.jpg/1280px-Samson_fountain_in_Peterhof_02.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-lomonosov.webp",
    sourceName: "route-lomonosov.jpg",
    title: "Menshikovsky Palace in Oranienbaum",
    page: "https://commons.wikimedia.org/wiki/File:Menshikovsky_Palace_in_Oranienbaum_01.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Menshikovsky_Palace_in_Oranienbaum_01.jpg/1280px-Menshikovsky_Palace_in_Oranienbaum_01.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-harbor.webp",
    sourceName: "route-harbor.jpg",
    title: "Peter III Palace in Oranienbaum",
    page: "https://commons.wikimedia.org/wiki/File:Peter_III_Palace_in_Oranienbaum.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Peter_III_Palace_in_Oranienbaum.jpg/1280px-Peter_III_Palace_in_Oranienbaum.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-gatchina.webp",
    sourceName: "route-gatchina.jpg",
    title: "Gatchina Grand Palace",
    page: "https://commons.wikimedia.org/wiki/File:Gatchina._Grand_Palace..JPG",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Gatchina._Grand_Palace..JPG/1280px-Gatchina._Grand_Palace..JPG",
    license: "CC BY-SA 3.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-kronstadt-cathedral.webp",
    sourceName: "route-kronstadt-cathedral.jpg",
    title: "Naval Cathedral of Saint Nicholas in Kronstadt",
    page: "https://commons.wikimedia.org/wiki/File:Naval_Cathedral_of_St_Nicholas_in_Kronstadt_01.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Naval_Cathedral_of_St_Nicholas_in_Kronstadt_01.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "route-kronstadt-fort.webp",
    sourceName: "route-kronstadt-fort.jpg",
    title: "Fort Alexander I near Kronstadt",
    page: "https://commons.wikimedia.org/wiki/File:RUS-2016-Aerial-SPB-Forts_of_Kronstadt_(Fort_Alexander_I).jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/10/RUS-2016-Aerial-SPB-Forts_of_Kronstadt_%28Fort_Alexander_I%29.jpg",
    license: "CC BY-SA 4.0",
    width: 420,
    height: 290,
    quality: 0.82,
  },
  {
    name: "custom-route.webp",
    sourceName: "custom-route.jpg",
    title: "Palace Bridge, St. Petersburg",
    page: "https://commons.wikimedia.org/wiki/File:Saint_Petersburg_Palace_Bridge,_St._Petersburg_(37931957696).jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Saint_Petersburg_Palace_Bridge%2C_St._Petersburg_%2837931957696%29.jpg/1280px-Saint_Petersburg_Palace_Bridge%2C_St._Petersburg_%2837931957696%29.jpg",
    license: "CC BY 2.0",
    width: 860,
    height: 560,
    quality: 0.84,
  },
  {
    name: "night-spb.webp",
    sourceName: "night-spb.jpg",
    title: "Saint Petersburg view to Palace Bridge at night",
    page: "https://commons.wikimedia.org/wiki/File:Saint_Petersburg._View_to_Palace_Bridge_at_night_(1).jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Saint_Petersburg._View_to_Palace_Bridge_at_night_%281%29.jpg/1280px-Saint_Petersburg._View_to_Palace_Bridge_at_night_%281%29.jpg",
    license: "CC BY-SA 4.0",
    width: 900,
    height: 485,
    quality: 0.84,
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFrom(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function runEdge(args, captureStdout = false) {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(tmpDir, `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`);
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
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `Edge exited with ${code}`));
        return;
      }
      resolve(captureStdout ? Buffer.concat(stdout).toString("utf8") : "");
    });
  });
}

async function download(asset) {
  const file = path.join(sourceDir, asset.sourceName);
  try {
    const existing = await stat(file);
    if (existing.size > 0) return file;
  } catch {
    // Download below.
  }

  let response;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    response = await fetch(asset.url, {
      headers: {
        "User-Agent": "AutotourSPB/1.0 local site asset fetcher",
      },
    });
    if (response.ok) break;
    if (response.status !== 429 || attempt === 8) {
      throw new Error(`Download failed for ${asset.name}: ${response.status}`);
    }
    await wait(4000 * attempt);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(file, buffer);
  return file;
}

async function encodeWebp(source, asset) {
  const base64 = await readFile(source, "base64");
  const payload = {
    dataUrl: `data:${mimeFrom(source)};base64,${base64}`,
    width: asset.width,
    height: asset.height,
    quality: asset.quality,
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<img id="source" alt="" src="${payload.dataUrl}" style="display:none">
<pre id="result">pending</pre>
<script>
const spec = ${JSON.stringify({ ...payload, dataUrl: "" })};
window.addEventListener("load", () => {
  try {
    const image = document.getElementById("source");
    const canvas = document.createElement("canvas");
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    const srcRatio = image.naturalWidth / image.naturalHeight;
    const dstRatio = spec.width / spec.height;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (srcRatio > dstRatio) {
      sw = image.naturalHeight * dstRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / dstRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, spec.width, spec.height);
    document.getElementById("result").textContent = canvas.toDataURL("image/webp", spec.quality);
  } catch (error) {
    document.getElementById("result").textContent = "ERROR: " + error.stack;
  }
});
</script></body></html>`;

  const temp = path.join(tmpDir, `${asset.name}.html`);
  await writeFile(temp, html, "utf8");

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const output = await runEdge(
      [
        "--allow-file-access-from-files",
        "--virtual-time-budget=18000",
        "--dump-dom",
        pathToFileURL(temp).href,
      ],
      true,
    );
    const match = output.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      await writeFile(path.join(assetsDir, asset.name), Buffer.from(match[1], "base64"));
      return;
    }
  }
  throw new Error(`WebP data was not produced for ${asset.name}.`);
}

async function main() {
  await mkdir(sourceDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  const manifest = [];
  for (const asset of assets) {
    console.log(`download: ${asset.name}`);
    const source = await download(asset);
    await wait(900);
    console.log(`webp: ${asset.name}`);
    await encodeWebp(source, asset);
    manifest.push({
      file: `assets/${asset.name}`,
      title: asset.title,
      source: asset.page,
      license: asset.license,
    });
  }

  await writeFile(path.join(assetsDir, "image-sources.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
