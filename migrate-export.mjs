import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";

const app = initializeApp({
  credential: cert(JSON.parse(readFileSync("credentials-palestra.json"))),
});

const db = getFirestore(app);

async function exportData() {
  const collections = await db.listCollections();
  const backup = {};

  for (const col of collections) {
    console.log(`Exportando coleção: ${col.id}`);
    backup[col.id] = {};
    const snapshot = await col.get();
    snapshot.forEach((doc) => {
      backup[col.id][doc.id] = doc.data();
    });
    console.log(`✓ ${col.id} — ${snapshot.size} documentos`);
  }

  writeFileSync("backup-palestra.json", JSON.stringify(backup, null, 2));
  console.log("\nExport concluído — backup-palestra.json gerado.");
}

exportData().catch(console.error);