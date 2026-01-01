import fs from "fs";
import path from "path";

const assets = path.join(process.cwd(), "assets")

export default async function index(dir, format_filter) {
  const info = {};
  const infoPath = path.join(assets, dir);
  const files = fs
    .readdirSync(infoPath, { recursive: true })
    .filter((file) => file.endsWith( format_filter ));
  for await (let file of files) {
    const filePath = path.join(infoPath, file);
    const title = path.basename(filePath).replace(format_filter, "").toLowerCase();
    
    info[title] = filePath
  }
  return info;
}