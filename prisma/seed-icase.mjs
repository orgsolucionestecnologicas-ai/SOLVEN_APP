/**
 * SEED ICASE — Tienda de prueba Apple Premium
 * Ejecutar: node --env-file=.env prisma/seed-icase.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "seed_tenant_demo";

let _counter = 0;
function genCode(prefix) {
  _counter++;
  return `${prefix.slice(0, 3).toUpperCase()}-${String(_counter).padStart(4, "0")}`;
}

function rStock(min = 4, max = 18) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createProduct({ name, categoryId, subcategoryId, categoryName, sale, cost, stock, minStock, ivaRate }) {
  await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      name,
      productCode: genCode(categoryName),
      categoryId,
      subcategoryId,
      categoryName,
      salePrice: sale,
      costPrice: cost,
      ivaRate: ivaRate ?? 0.21,
      stock: stock ?? rStock(),
      minStock: minStock ?? 2,
    },
  });
}

// ─── LIMPIAR ──────────────────────────────────────────────────────────────────

async function clearDemoData() {
  console.log("\n⬛ Limpiando datos del tenant demo...");

  await prisma.auditLog.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.promotionUsage.deleteMany({});

  const sales = await prisma.sale.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
  if (sales.length) await prisma.saleItem.deleteMany({ where: { saleId: { in: sales.map(s => s.id) } } });

  const quotes = await prisma.quote.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
  if (quotes.length) await prisma.quoteItem.deleteMany({ where: { quoteId: { in: quotes.map(q => q.id) } } });

  await prisma.debtPayment.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.inventoryMovement.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.cashMovement.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.expense.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.quote.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.sale.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.debt.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.customer.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.product.deleteMany({ where: { tenantId: TENANT_ID } });

  const cats = await prisma.category.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } });
  if (cats.length) await prisma.subcategory.deleteMany({ where: { categoryId: { in: cats.map(c => c.id) } } });

  await prisma.category.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.service.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.promotion.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.codeCounter.deleteMany({});

  console.log("✅ Limpieza completa.");
}

// ─── IPHONES ─────────────────────────────────────────────────────────────────

async function seedIphones(catId) {
  console.log("\n📱 Creando iPhones...");

  const createModel = async (modelName, colors, storages) => {
    const sub = await prisma.subcategory.create({ data: { name: modelName, categoryId: catId } });
    for (const s of storages)
      for (const c of colors)
        await createProduct({ name: `${modelName} ${s.label} ${c}`, categoryId: catId, subcategoryId: sub.id, categoryName: "iPhone", sale: s.sale, cost: s.cost });
  };

  await createModel("iPhone 16",
    ["Negro Onyx", "Blanco", "Rosa", "Verde", "Ultramarino"],
    [{ label: "128GB", sale: 2_100_000, cost: 1_680_000 }, { label: "256GB", sale: 2_450_000, cost: 1_960_000 }, { label: "512GB", sale: 2_900_000, cost: 2_320_000 }]
  );

  await createModel("iPhone 16 Plus",
    ["Negro Onyx", "Blanco", "Rosa", "Verde", "Ultramarino"],
    [{ label: "128GB", sale: 2_400_000, cost: 1_920_000 }, { label: "256GB", sale: 2_750_000, cost: 2_200_000 }, { label: "512GB", sale: 3_200_000, cost: 2_560_000 }]
  );

  await createModel("iPhone 16 Pro",
    ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Desierto"],
    [{ label: "256GB", sale: 3_100_000, cost: 2_480_000 }, { label: "512GB", sale: 3_600_000, cost: 2_880_000 }, { label: "1TB", sale: 4_400_000, cost: 3_520_000 }]
  );

  await createModel("iPhone 16 Pro Max",
    ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Desierto"],
    [{ label: "256GB", sale: 3_500_000, cost: 2_800_000 }, { label: "512GB", sale: 4_000_000, cost: 3_200_000 }, { label: "1TB", sale: 4_800_000, cost: 3_840_000 }]
  );

  await createModel("iPhone 16e",
    ["Negro", "Blanco"],
    [{ label: "128GB", sale: 1_600_000, cost: 1_280_000 }, { label: "256GB", sale: 1_900_000, cost: 1_520_000 }]
  );

  await createModel("iPhone 17",
    ["Negro", "Blanco", "Rosa", "Verde", "Celeste"],
    [{ label: "128GB", sale: 2_500_000, cost: 2_000_000 }, { label: "256GB", sale: 2_850_000, cost: 2_280_000 }, { label: "512GB", sale: 3_350_000, cost: 2_680_000 }]
  );

  await createModel("iPhone 17 Air",
    ["Negro", "Blanco", "Celeste"],
    [{ label: "128GB", sale: 3_000_000, cost: 2_400_000 }, { label: "256GB", sale: 3_400_000, cost: 2_720_000 }]
  );

  await createModel("iPhone 17 Pro",
    ["Titanio Negro", "Titanio Blanco", "Titanio Natural"],
    [{ label: "256GB", sale: 3_700_000, cost: 2_960_000 }, { label: "512GB", sale: 4_250_000, cost: 3_400_000 }, { label: "1TB", sale: 5_100_000, cost: 4_080_000 }]
  );

  await createModel("iPhone 17 Pro Max",
    ["Titanio Negro", "Titanio Blanco", "Titanio Natural"],
    [{ label: "256GB", sale: 4_200_000, cost: 3_360_000 }, { label: "512GB", sale: 4_800_000, cost: 3_840_000 }, { label: "1TB", sale: 5_700_000, cost: 4_560_000 }]
  );

  console.log("✅ iPhones OK");
}

// ─── IPADS ───────────────────────────────────────────────────────────────────

async function seedIpads(catId) {
  console.log("\n📟 Creando iPads...");

  const createModel = async (modelName, colors, configs) => {
    const sub = await prisma.subcategory.create({ data: { name: modelName, categoryId: catId } });
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({ name: `${modelName} ${cfg.label} ${c}`, categoryId: catId, subcategoryId: sub.id, categoryName: "iPad", sale: cfg.sale, cost: cfg.cost });
  };

  await createModel("iPad 11na Gen",
    ["Azul", "Rosa", "Amarillo", "Plata"],
    [{ label: "128GB WiFi", sale: 800_000, cost: 640_000 }, { label: "256GB WiFi", sale: 1_050_000, cost: 840_000 },
     { label: "128GB WiFi+Cell", sale: 1_100_000, cost: 880_000 }, { label: "256GB WiFi+Cell", sale: 1_350_000, cost: 1_080_000 }]
  );

  await createModel("iPad mini 7",
    ["Azul", "Púrpura", "Starlight", "Negro Espacial"],
    [{ label: "128GB WiFi", sale: 1_100_000, cost: 880_000 }, { label: "256GB WiFi", sale: 1_350_000, cost: 1_080_000 },
     { label: "128GB WiFi+Cell", sale: 1_400_000, cost: 1_120_000 }, { label: "256GB WiFi+Cell", sale: 1_650_000, cost: 1_320_000 }]
  );

  await createModel('iPad Air M3 11"',
    ["Azul", "Púrpura", "Starlight", "Negro Espacial"],
    [{ label: "128GB WiFi", sale: 1_400_000, cost: 1_120_000 }, { label: "256GB WiFi", sale: 1_650_000, cost: 1_320_000 },
     { label: "512GB WiFi", sale: 2_000_000, cost: 1_600_000 }, { label: "128GB WiFi+Cell", sale: 1_700_000, cost: 1_360_000 },
     { label: "256GB WiFi+Cell", sale: 1_950_000, cost: 1_560_000 }, { label: "512GB WiFi+Cell", sale: 2_300_000, cost: 1_840_000 }]
  );

  await createModel('iPad Air M3 13"',
    ["Azul", "Púrpura", "Starlight", "Negro Espacial"],
    [{ label: "128GB WiFi", sale: 1_800_000, cost: 1_440_000 }, { label: "256GB WiFi", sale: 2_050_000, cost: 1_640_000 },
     { label: "512GB WiFi", sale: 2_400_000, cost: 1_920_000 }, { label: "128GB WiFi+Cell", sale: 2_100_000, cost: 1_680_000 },
     { label: "256GB WiFi+Cell", sale: 2_350_000, cost: 1_880_000 }, { label: "512GB WiFi+Cell", sale: 2_700_000, cost: 2_160_000 }]
  );

  await createModel('iPad Pro M4 11"',
    ["Plata", "Negro Espacial"],
    [{ label: "256GB WiFi", sale: 2_800_000, cost: 2_240_000 }, { label: "512GB WiFi", sale: 3_300_000, cost: 2_640_000 },
     { label: "1TB WiFi", sale: 4_200_000, cost: 3_360_000 }, { label: "256GB WiFi+Cell", sale: 3_100_000, cost: 2_480_000 },
     { label: "512GB WiFi+Cell", sale: 3_600_000, cost: 2_880_000 }, { label: "1TB WiFi+Cell", sale: 4_500_000, cost: 3_600_000 }]
  );

  await createModel('iPad Pro M4 13"',
    ["Plata", "Negro Espacial"],
    [{ label: "256GB WiFi", sale: 3_500_000, cost: 2_800_000 }, { label: "512GB WiFi", sale: 4_000_000, cost: 3_200_000 },
     { label: "1TB WiFi", sale: 5_000_000, cost: 4_000_000 }, { label: "256GB WiFi+Cell", sale: 3_800_000, cost: 3_040_000 },
     { label: "512GB WiFi+Cell", sale: 4_300_000, cost: 3_440_000 }, { label: "1TB WiFi+Cell", sale: 5_300_000, cost: 4_240_000 }]
  );

  console.log("✅ iPads OK");
}

// ─── MACBOOKS ─────────────────────────────────────────────────────────────────

async function seedMacbooks(catId) {
  console.log("\n💻 Creando MacBooks...");

  const createModel = async (modelName, colors, configs, maxStock = 8) => {
    const sub = await prisma.subcategory.create({ data: { name: modelName, categoryId: catId } });
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({ name: `${modelName} ${cfg.label} ${c}`, categoryId: catId, subcategoryId: sub.id, categoryName: "MacBook", sale: cfg.sale, cost: cfg.cost, stock: rStock(1, maxStock) });
  };

  await createModel('MacBook Air M4 13"',
    ["Medianoche", "Luz de Luna", "Azul Cielo", "Verde Salvia"],
    [{ label: "16GB / 256GB SSD", sale: 2_200_000, cost: 1_760_000 }, { label: "16GB / 512GB SSD", sale: 2_600_000, cost: 2_080_000 },
     { label: "24GB / 512GB SSD", sale: 3_000_000, cost: 2_400_000 }, { label: "24GB / 1TB SSD", sale: 3_500_000, cost: 2_800_000 }]
  );

  await createModel('MacBook Air M4 15"',
    ["Medianoche", "Luz de Luna", "Azul Cielo", "Verde Salvia"],
    [{ label: "16GB / 512GB SSD", sale: 3_100_000, cost: 2_480_000 }, { label: "24GB / 512GB SSD", sale: 3_500_000, cost: 2_800_000 },
     { label: "24GB / 1TB SSD", sale: 4_000_000, cost: 3_200_000 }], 6
  );

  await createModel('MacBook Pro M4 14"',
    ["Negro Espacial", "Plata"],
    [{ label: "16GB / 512GB SSD", sale: 3_800_000, cost: 3_040_000 }, { label: "24GB / 512GB SSD", sale: 4_300_000, cost: 3_440_000 },
     { label: "24GB / 1TB SSD", sale: 4_900_000, cost: 3_920_000 }], 5
  );

  await createModel('MacBook Pro M4 Pro 14"',
    ["Negro Espacial", "Plata"],
    [{ label: "24GB / 512GB SSD", sale: 5_500_000, cost: 4_400_000 }, { label: "24GB / 1TB SSD", sale: 6_200_000, cost: 4_960_000 },
     { label: "48GB / 1TB SSD", sale: 7_200_000, cost: 5_760_000 }], 4
  );

  await createModel('MacBook Pro M4 Pro 16"',
    ["Negro Espacial", "Plata"],
    [{ label: "24GB / 512GB SSD", sale: 6_200_000, cost: 4_960_000 }, { label: "24GB / 1TB SSD", sale: 6_900_000, cost: 5_520_000 },
     { label: "48GB / 1TB SSD", sale: 8_000_000, cost: 6_400_000 }, { label: "48GB / 2TB SSD", sale: 9_200_000, cost: 7_360_000 }], 3
  );

  await createModel('MacBook Pro M4 Max 16"',
    ["Negro Espacial", "Plata"],
    [{ label: "48GB / 1TB SSD", sale: 9_500_000, cost: 7_600_000 }, { label: "64GB / 1TB SSD", sale: 11_000_000, cost: 8_800_000 },
     { label: "128GB / 2TB SSD", sale: 14_000_000, cost: 11_200_000 }], 2
  );

  console.log("✅ MacBooks OK");
}

// ─── APPLE WATCH ──────────────────────────────────────────────────────────────

async function seedWatches(catId) {
  console.log("\n⌚ Creando Apple Watch...");

  const createModel = async (modelName, colors, sale, cost) => {
    const sub = await prisma.subcategory.create({ data: { name: modelName, categoryId: catId } });
    for (const c of colors)
      await createProduct({ name: `${modelName} ${c}`, categoryId: catId, subcategoryId: sub.id, categoryName: "Apple Watch", sale, cost });
  };

  await createModel("Apple Watch Series 10 40mm Aluminio",
    ["Negro Jet", "Plata", "Oro Rosa", "Azul", "Verde"], 650_000, 520_000);

  await createModel("Apple Watch Series 10 42mm Aluminio",
    ["Negro Jet", "Plata", "Oro Rosa", "Azul", "Verde"], 750_000, 600_000);

  await createModel("Apple Watch Series 10 40mm Acero",
    ["Plata", "Oro", "Grafito"], 950_000, 760_000);

  await createModel("Apple Watch Series 10 42mm Acero",
    ["Plata", "Oro", "Grafito"], 1_050_000, 840_000);

  await createModel("Apple Watch SE 3 40mm",
    ["Medianoche", "Starlight", "Rosado"], 450_000, 360_000);

  await createModel("Apple Watch SE 3 44mm",
    ["Medianoche", "Starlight", "Rosado"], 500_000, 400_000);

  await createModel("Apple Watch Ultra 2",
    ["Titanio Natural", "Titanio Negro"], 1_800_000, 1_440_000);

  console.log("✅ Apple Watch OK");
}

// ─── ACCESORIOS PANZER ────────────────────────────────────────────────────────

async function seedAccesorios(catId) {
  console.log("\n🛡️  Creando Accesorios Panzer...");

  const iphoneModels = [
    "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e",
    "iPhone 17", "iPhone 17 Air", "iPhone 17 Pro", "iPhone 17 Pro Max",
  ];
  const ipadModels = [
    "iPad 11na Gen", "iPad mini 7", 'iPad Air M3 11"', 'iPad Air M3 13"',
    'iPad Pro M4 11"', 'iPad Pro M4 13"',
  ];

  // Protectores de Cámara (solo iPhones)
  const subCam = await prisma.subcategory.create({ data: { name: "Protectores de Cámara", categoryId: catId } });
  for (const model of iphoneModels)
    await createProduct({ name: `Panzer Protector de Cámara ${model}`, categoryId: catId, subcategoryId: subCam.id, categoryName: "Accesorios", sale: 28_000, cost: 12_000, stock: rStock(10, 40), minStock: 5 });

  // Protectores de Pantalla (iPhones + iPads)
  const subScr = await prisma.subcategory.create({ data: { name: "Protectores de Pantalla", categoryId: catId } });
  for (const model of iphoneModels)
    await createProduct({ name: `Panzer Cristal Templado ${model}`, categoryId: catId, subcategoryId: subScr.id, categoryName: "Accesorios", sale: 38_000, cost: 16_000, stock: rStock(10, 50), minStock: 5 });
  for (const model of ipadModels) {
    const isLarge = model.includes("13") || model.includes("Pro M4");
    await createProduct({ name: `Panzer Cristal Templado ${model}`, categoryId: catId, subcategoryId: subScr.id, categoryName: "Accesorios", sale: isLarge ? 78_000 : 55_000, cost: isLarge ? 36_000 : 25_000, stock: rStock(8, 30), minStock: 3 });
  }

  console.log("✅ Accesorios Panzer OK");
}

// ─── OTROS ACCESORIOS ─────────────────────────────────────────────────────────

async function seedOtrosAccesorios(catId) {
  console.log("\n🔌 Creando Otros Accesorios...");

  const sub = await prisma.subcategory.create({ data: { name: "Cargadores y Auriculares", categoryId: catId } });

  const items = [
    { name: "Cargador MagSafe 15W Apple",         sale: 45_000,  cost: 25_000 },
    { name: "Cargador USB-C 20W Apple",            sale: 35_000,  cost: 18_000 },
    { name: "Cargador USB-C 30W Apple",            sale: 52_000,  cost: 28_000 },
    { name: "Cargador USB-C 67W Apple",            sale: 98_000,  cost: 52_000 },
    { name: "Cargador MagSafe MacBook 96W Apple",  sale: 125_000, cost: 70_000 },
    { name: "AirPods 4",                           sale: 225_000, cost: 145_000 },
    { name: "AirPods 4 con Cancelación de Ruido",  sale: 285_000, cost: 185_000 },
    { name: "AirPods Pro 2",                       sale: 385_000, cost: 255_000 },
    { name: "AirPods Max Medianoche",              sale: 760_000, cost: 510_000 },
    { name: "AirPods Max Blanco Estrella",         sale: 760_000, cost: 510_000 },
  ];

  for (const item of items)
    await createProduct({ name: item.name, categoryId: catId, subcategoryId: sub.id, categoryName: "Otros Accesorios", sale: item.sale, cost: item.cost, stock: rStock(5, 25), minStock: 2 });

  console.log("✅ Otros Accesorios OK");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  await clearDemoData();

  console.log("\n🏪 Construyendo catálogo ICASE...");

  const catIphone    = await prisma.category.create({ data: { tenantId: TENANT_ID, name: "iPhone" } });
  const catIpad      = await prisma.category.create({ data: { tenantId: TENANT_ID, name: "iPad" } });
  const catMacbook   = await prisma.category.create({ data: { tenantId: TENANT_ID, name: "MacBook" } });
  const catWatch     = await prisma.category.create({ data: { tenantId: TENANT_ID, name: "Apple Watch" } });
  const catAccesorios= await prisma.category.create({ data: { tenantId: TENANT_ID, name: "Accesorios" } });
  const catOtros     = await prisma.category.create({ data: { tenantId: TENANT_ID, name: "Otros Accesorios" } });

  console.log("✅ 6 categorías creadas");

  await seedIphones(catIphone.id);
  await seedIpads(catIpad.id);
  await seedMacbooks(catMacbook.id);
  await seedWatches(catWatch.id);
  await seedAccesorios(catAccesorios.id);
  await seedOtrosAccesorios(catOtros.id);

  const totalProducts    = await prisma.product.count({ where: { tenantId: TENANT_ID } });
  const totalCategories  = await prisma.category.count({ where: { tenantId: TENANT_ID } });
  const totalSubcats     = await prisma.subcategory.count({ where: { category: { tenantId: TENANT_ID } } });

  console.log("\n" + "=".repeat(52));
  console.log("🎉 ICASE cargado exitosamente!");
  console.log(`   📂 Categorías:    ${totalCategories}`);
  console.log(`   📁 Subcategorías: ${totalSubcats}`);
  console.log(`   📦 Productos:     ${totalProducts}`);
  console.log("=".repeat(52));
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
