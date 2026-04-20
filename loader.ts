import fs from "fs";
import https from "https";

async function run() {
  console.log("Downloading logo...");
  const logoUrl = "https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png";
  
  https.get(logoUrl, (res) => {
    const file = fs.createWriteStream("public/salu-logo.png");
    res.pipe(file);
    file.on("finish", () => {
      file.close();
      console.log("Downloaded logo.");
    });
  });

}
run();
