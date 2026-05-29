import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const app = initializeApp({
  credential: cert(JSON.parse(readFileSync("credentials-palestra-2.json"))),
});

const db = getFirestore(app);

async function importData() {
  const backup = JSON.parse(readFileSync("backup-palestra.json"));
  const collections = Object.keys(backup);

  for (const colId of collections) {
    console.log(`Importando coleção: ${colId}`);
    const documents = Object.entries(backup[colId]);
    let count = 0;

    for (const [docId, data] of documents) {
      await db.collection(colId).doc(docId).set(data);
      count++;
    }

    console.log(`✓ ${colId} — ${count} documentos`);
  }

  console.log("\nImport concluído — todos os dados estão no palestra-2.");
}

importData().catch(console.error);