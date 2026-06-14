/**
 * SEED ICASE — Tienda de prueba Apple Premium
 * Carga: iPhone 16+, iPad 2025, MacBook 2025, Apple Watch, Accesorios Panzer, Otros Accesorios
 * Distribuidor Apple: iPhone, iPad, MacBook, Apple Watch
 * Distribuidor Panzer Inc / Marca Panzer: Protectores de cámara y pantalla
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "seed_tenant_demo";

// ─── Helpers ────────────────────────────────────────────────────────────────

let codeCounter = 0;
function genCode(prefix: string): string {
  codeCounter++;
  return `${prefix}-${String(codeCounter).padStart(4, "0")}`;
}

function rStock(min = 4, max = 18): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── CLEAR ──────────────────────────────────────────────────────────────────

async function clearDemoData() {
  console.log("\n⬛ Limpiando datos existentes del tenant demo...");

  await prisma.auditLog.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.promotionUsage.deleteMany({});

  const sales = await prisma.sale.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
  });
  if (sales.length) {
    await prisma.saleItem.deleteMany({
      where: { saleId: { in: sales.map((s) => s.id) } },
    });
  }

  const quotes = await prisma.quote.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
  });
  if (quotes.length) {
    await prisma.quoteItem.deleteMany({
      where: { quoteId: { in: quotes.map((q) => q.id) } },
    });
  }

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

  const cats = await prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
  });
  if (cats.length) {
    await prisma.subcategory.deleteMany({
      where: { categoryId: { in: cats.map((c) => c.id) } },
    });
  }

  await prisma.category.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.service.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.promotion.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.codeCounter.deleteMany({});

  console.log("✅ Datos limpiados.");
}

// ─── Product factory ─────────────────────────────────────────────────────────

async function createProduct(data: {
  name: string;
  categoryId: string;
  subcategoryId: string;
  categoryName: string;
  sale: number;
  cost: number;
  stock?: number;
  minStock?: number;
  ivaRate?: number;
}) {
  await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      name: data.name,
      productCode: genCode(data.categoryName.substring(0, 3).toUpperCase()),
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      categoryName: data.categoryName,
      salePrice: data.sale,
      costPrice: data.cost,
      ivaRate: data.ivaRate ?? 0.21,
      stock: data.stock ?? rStock(),
      minStock: data.minStock ?? 2,
    },
  });
}

// ─── IPHONES ─────────────────────────────────────────────────────────────────

async function seedIphones(catId: string) {
  console.log("\n📱 Creando iPhones...");

  // ── iPhone 16 ──────────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 16", categoryId: catId },
    });
    const colors = ["Negro Onyx", "Blanco", "Rosa", "Verde", "Ultramarino"];
    const storages = [
      { label: "128GB", sale: 2_100_000, cost: 1_680_000 },
      { label: "256GB", sale: 2_450_000, cost: 1_960_000 },
      { label: "512GB", sale: 2_900_000, cost: 2_320_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 16 ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 16 Plus ──────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 16 Plus", categoryId: catId },
    });
    const colors = ["Negro Onyx", "Blanco", "Rosa", "Verde", "Ultramarino"];
    const storages = [
      { label: "128GB", sale: 2_400_000, cost: 1_920_000 },
      { label: "256GB", sale: 2_750_000, cost: 2_200_000 },
      { label: "512GB", sale: 3_200_000, cost: 2_560_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 16 Plus ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 16 Pro ──────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 16 Pro", categoryId: catId },
    });
    const colors = [
      "Titanio Negro",
      "Titanio Blanco",
      "Titanio Natural",
      "Titanio Desierto",
    ];
    const storages = [
      { label: "256GB", sale: 3_100_000, cost: 2_480_000 },
      { label: "512GB", sale: 3_600_000, cost: 2_880_000 },
      { label: "1TB",   sale: 4_400_000, cost: 3_520_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 16 Pro ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 16 Pro Max ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 16 Pro Max", categoryId: catId },
    });
    const colors = [
      "Titanio Negro",
      "Titanio Blanco",
      "Titanio Natural",
      "Titanio Desierto",
    ];
    const storages = [
      { label: "256GB", sale: 3_500_000, cost: 2_800_000 },
      { label: "512GB", sale: 4_000_000, cost: 3_200_000 },
      { label: "1TB",   sale: 4_800_000, cost: 3_840_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 16 Pro Max ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 16e ─────────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 16e", categoryId: catId },
    });
    const colors = ["Negro", "Blanco"];
    const storages = [
      { label: "128GB", sale: 1_600_000, cost: 1_280_000 },
      { label: "256GB", sale: 1_900_000, cost: 1_520_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 16e ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 17 ──────────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 17", categoryId: catId },
    });
    const colors = ["Negro", "Blanco", "Rosa", "Verde", "Celeste"];
    const storages = [
      { label: "128GB", sale: 2_500_000, cost: 2_000_000 },
      { label: "256GB", sale: 2_850_000, cost: 2_280_000 },
      { label: "512GB", sale: 3_350_000, cost: 2_680_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 17 ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 17 Air ──────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 17 Air", categoryId: catId },
    });
    const colors = ["Negro", "Blanco", "Celeste"];
    const storages = [
      { label: "128GB", sale: 3_000_000, cost: 2_400_000 },
      { label: "256GB", sale: 3_400_000, cost: 2_720_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 17 Air ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 17 Pro ──────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 17 Pro", categoryId: catId },
    });
    const colors = [
      "Titanio Negro",
      "Titanio Blanco",
      "Titanio Natural",
    ];
    const storages = [
      { label: "256GB", sale: 3_700_000, cost: 2_960_000 },
      { label: "512GB", sale: 4_250_000, cost: 3_400_000 },
      { label: "1TB",   sale: 5_100_000, cost: 4_080_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 17 Pro ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  // ── iPhone 17 Pro Max ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPhone 17 Pro Max", categoryId: catId },
    });
    const colors = [
      "Titanio Negro",
      "Titanio Blanco",
      "Titanio Natural",
    ];
    const storages = [
      { label: "256GB", sale: 4_200_000, cost: 3_360_000 },
      { label: "512GB", sale: 4_800_000, cost: 3_840_000 },
      { label: "1TB",   sale: 5_700_000, cost: 4_560_000 },
    ];
    for (const s of storages)
      for (const c of colors)
        await createProduct({
          name: `iPhone 17 Pro Max ${s.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPhone",
          sale: s.sale,
          cost: s.cost,
        });
  }

  console.log("✅ iPhones creados.");
}

// ─── IPADS ───────────────────────────────────────────────────────────────────

async function seedIpads(catId: string) {
  console.log("\n📟 Creando iPads...");

  // ── iPad 11na Gen (A16, 2025) ────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad 11na Gen", categoryId: catId },
    });
    const colors = ["Azul", "Rosa", "Amarillo", "Plata"];
    const configs = [
      { label: "128GB WiFi",      sale: 800_000,   cost: 640_000 },
      { label: "256GB WiFi",      sale: 1_050_000, cost: 840_000 },
      { label: "128GB WiFi+Cell", sale: 1_100_000, cost: 880_000 },
      { label: "256GB WiFi+Cell", sale: 1_350_000, cost: 1_080_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad 11na Gen ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  // ── iPad mini 7 ──────────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad mini 7", categoryId: catId },
    });
    const colors = ["Azul", "Púrpura", "Starlight", "Negro Espacial"];
    const configs = [
      { label: "128GB WiFi",      sale: 1_100_000, cost: 880_000 },
      { label: "256GB WiFi",      sale: 1_350_000, cost: 1_080_000 },
      { label: "128GB WiFi+Cell", sale: 1_400_000, cost: 1_120_000 },
      { label: "256GB WiFi+Cell", sale: 1_650_000, cost: 1_320_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad mini 7 ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  // ── iPad Air M3 11" ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad Air M3 11\"", categoryId: catId },
    });
    const colors = ["Azul", "Púrpura", "Starlight", "Negro Espacial"];
    const configs = [
      { label: "128GB WiFi",      sale: 1_400_000, cost: 1_120_000 },
      { label: "256GB WiFi",      sale: 1_650_000, cost: 1_320_000 },
      { label: "512GB WiFi",      sale: 2_000_000, cost: 1_600_000 },
      { label: "128GB WiFi+Cell", sale: 1_700_000, cost: 1_360_000 },
      { label: "256GB WiFi+Cell", sale: 1_950_000, cost: 1_560_000 },
      { label: "512GB WiFi+Cell", sale: 2_300_000, cost: 1_840_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad Air M3 11" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  // ── iPad Air M3 13" ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad Air M3 13\"", categoryId: catId },
    });
    const colors = ["Azul", "Púrpura", "Starlight", "Negro Espacial"];
    const configs = [
      { label: "128GB WiFi",      sale: 1_800_000, cost: 1_440_000 },
      { label: "256GB WiFi",      sale: 2_050_000, cost: 1_640_000 },
      { label: "512GB WiFi",      sale: 2_400_000, cost: 1_920_000 },
      { label: "128GB WiFi+Cell", sale: 2_100_000, cost: 1_680_000 },
      { label: "256GB WiFi+Cell", sale: 2_350_000, cost: 1_880_000 },
      { label: "512GB WiFi+Cell", sale: 2_700_000, cost: 2_160_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad Air M3 13" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  // ── iPad Pro M4 11" ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad Pro M4 11\"", categoryId: catId },
    });
    const colors = ["Plata", "Negro Espacial"];
    const configs = [
      { label: "256GB WiFi",      sale: 2_800_000, cost: 2_240_000 },
      { label: "512GB WiFi",      sale: 3_300_000, cost: 2_640_000 },
      { label: "1TB WiFi",        sale: 4_200_000, cost: 3_360_000 },
      { label: "256GB WiFi+Cell", sale: 3_100_000, cost: 2_480_000 },
      { label: "512GB WiFi+Cell", sale: 3_600_000, cost: 2_880_000 },
      { label: "1TB WiFi+Cell",   sale: 4_500_000, cost: 3_600_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad Pro M4 11" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  // ── iPad Pro M4 13" ──────────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "iPad Pro M4 13\"", categoryId: catId },
    });
    const colors = ["Plata", "Negro Espacial"];
    const configs = [
      { label: "256GB WiFi",      sale: 3_500_000, cost: 2_800_000 },
      { label: "512GB WiFi",      sale: 4_000_000, cost: 3_200_000 },
      { label: "1TB WiFi",        sale: 5_000_000, cost: 4_000_000 },
      { label: "256GB WiFi+Cell", sale: 3_800_000, cost: 3_040_000 },
      { label: "512GB WiFi+Cell", sale: 4_300_000, cost: 3_440_000 },
      { label: "1TB WiFi+Cell",   sale: 5_300_000, cost: 4_240_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `iPad Pro M4 13" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "iPad",
          sale: cfg.sale,
          cost: cfg.cost,
        });
  }

  console.log("✅ iPads creados.");
}

// ─── MACBOOKS ─────────────────────────────────────────────────────────────────

async function seedMacbooks(catId: string) {
  console.log("\n💻 Creando MacBooks...");

  // ── MacBook Air M4 13" ──────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Air M4 13\"", categoryId: catId },
    });
    const colors = ["Medianoche", "Luz de Luna", "Azul Cielo", "Verde Salvia"];
    const configs = [
      { label: "16GB / 256GB SSD", sale: 2_200_000, cost: 1_760_000 },
      { label: "16GB / 512GB SSD", sale: 2_600_000, cost: 2_080_000 },
      { label: "24GB / 512GB SSD", sale: 3_000_000, cost: 2_400_000 },
      { label: "24GB / 1TB SSD",   sale: 3_500_000, cost: 2_800_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Air M4 13" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(2, 8),
        });
  }

  // ── MacBook Air M4 15" ──────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Air M4 15\"", categoryId: catId },
    });
    const colors = ["Medianoche", "Luz de Luna", "Azul Cielo", "Verde Salvia"];
    const configs = [
      { label: "16GB / 512GB SSD", sale: 3_100_000, cost: 2_480_000 },
      { label: "24GB / 512GB SSD", sale: 3_500_000, cost: 2_800_000 },
      { label: "24GB / 1TB SSD",   sale: 4_000_000, cost: 3_200_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Air M4 15" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(2, 6),
        });
  }

  // ── MacBook Pro M4 14" ──────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Pro M4 14\"", categoryId: catId },
    });
    const colors = ["Negro Espacial", "Plata"];
    const configs = [
      { label: "16GB / 512GB SSD", sale: 3_800_000, cost: 3_040_000 },
      { label: "24GB / 512GB SSD", sale: 4_300_000, cost: 3_440_000 },
      { label: "24GB / 1TB SSD",   sale: 4_900_000, cost: 3_920_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Pro M4 14" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(1, 5),
        });
  }

  // ── MacBook Pro M4 Pro 14" ──────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Pro M4 Pro 14\"", categoryId: catId },
    });
    const colors = ["Negro Espacial", "Plata"];
    const configs = [
      { label: "24GB / 512GB SSD", sale: 5_500_000, cost: 4_400_000 },
      { label: "24GB / 1TB SSD",   sale: 6_200_000, cost: 4_960_000 },
      { label: "48GB / 1TB SSD",   sale: 7_200_000, cost: 5_760_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Pro M4 Pro 14" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(1, 4),
        });
  }

  // ── MacBook Pro M4 Pro 16" ──────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Pro M4 Pro 16\"", categoryId: catId },
    });
    const colors = ["Negro Espacial", "Plata"];
    const configs = [
      { label: "24GB / 512GB SSD", sale: 6_200_000, cost: 4_960_000 },
      { label: "24GB / 1TB SSD",   sale: 6_900_000, cost: 5_520_000 },
      { label: "48GB / 1TB SSD",   sale: 8_000_000, cost: 6_400_000 },
      { label: "48GB / 2TB SSD",   sale: 9_200_000, cost: 7_360_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Pro M4 Pro 16" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(1, 3),
        });
  }

  // ── MacBook Pro M4 Max 16" ──────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "MacBook Pro M4 Max 16\"", categoryId: catId },
    });
    const colors = ["Negro Espacial", "Plata"];
    const configs = [
      { label: "48GB / 1TB SSD",   sale: 9_500_000,  cost: 7_600_000 },
      { label: "64GB / 1TB SSD",   sale: 11_000_000, cost: 8_800_000 },
      { label: "128GB / 2TB SSD",  sale: 14_000_000, cost: 11_200_000 },
    ];
    for (const cfg of configs)
      for (const c of colors)
        await createProduct({
          name: `MacBook Pro M4 Max 16" ${cfg.label} ${c}`,
          categoryId: catId,
          subcategoryId: sub.id,
          categoryName: "MacBook",
          sale: cfg.sale,
          cost: cfg.cost,
          stock: rStock(1, 2),
        });
  }

  console.log("✅ MacBooks creados.");
}

// ─── APPLE WATCH ──────────────────────────────────────────────────────────────

async function seedWatches(catId: string) {
  console.log("\n⌚ Creando Apple Watch...");

  // ── Series 10 Aluminio 40mm ──────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch Series 10 40mm Aluminio", categoryId: catId },
    });
    const colors = [
      "Negro Jet",
      "Plata",
      "Oro Rosa",
      "Azul",
      "Verde",
    ];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch Series 10 40mm Aluminio ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 650_000,
        cost: 520_000,
      });
  }

  // ── Series 10 Aluminio 42mm ──────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch Series 10 42mm Aluminio", categoryId: catId },
    });
    const colors = [
      "Negro Jet",
      "Plata",
      "Oro Rosa",
      "Azul",
      "Verde",
    ];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch Series 10 42mm Aluminio ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 750_000,
        cost: 600_000,
      });
  }

  // ── Series 10 Acero 40mm ─────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch Series 10 40mm Acero", categoryId: catId },
    });
    const colors = ["Plata", "Oro", "Grafito"];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch Series 10 40mm Acero ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 950_000,
        cost: 760_000,
      });
  }

  // ── Series 10 Acero 42mm ─────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch Series 10 42mm Acero", categoryId: catId },
    });
    const colors = ["Plata", "Oro", "Grafito"];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch Series 10 42mm Acero ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 1_050_000,
        cost: 840_000,
      });
  }

  // ── Apple Watch SE 3 40mm ────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch SE 3 40mm", categoryId: catId },
    });
    const colors = ["Medianoche", "Starlight", "Rosado"];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch SE 3 40mm ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 450_000,
        cost: 360_000,
      });
  }

  // ── Apple Watch SE 3 44mm ────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch SE 3 44mm", categoryId: catId },
    });
    const colors = ["Medianoche", "Starlight", "Rosado"];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch SE 3 44mm ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 500_000,
        cost: 400_000,
      });
  }

  // ── Apple Watch Ultra 2 ──────────────────────────────────────
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Apple Watch Ultra 2", categoryId: catId },
    });
    const colors = ["Titanio Natural", "Titanio Negro"];
    for (const c of colors)
      await createProduct({
        name: `Apple Watch Ultra 2 ${c}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Apple Watch",
        sale: 1_800_000,
        cost: 1_440_000,
        stock: rStock(2, 5),
      });
  }

  console.log("✅ Apple Watch creados.");
}

// ─── ACCESORIOS PANZER ────────────────────────────────────────────────────────

async function seedAccesorios(catId: string) {
  console.log("\n🛡️  Creando Accesorios Panzer...");

  // Modelos de iPhone
  const iphoneModels = [
    "iPhone 16",
    "iPhone 16 Plus",
    "iPhone 16 Pro",
    "iPhone 16 Pro Max",
    "iPhone 16e",
    "iPhone 17",
    "iPhone 17 Air",
    "iPhone 17 Pro",
    "iPhone 17 Pro Max",
  ];

  // Modelos de iPad
  const ipadModels = [
    "iPad 11na Gen",
    "iPad mini 7",
    "iPad Air M3 11\"",
    "iPad Air M3 13\"",
    "iPad Pro M4 11\"",
    "iPad Pro M4 13\"",
  ];

  // Subcategoría: Protectores de Cámara
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Protectores de Cámara", categoryId: catId },
    });
    for (const model of iphoneModels)
      await createProduct({
        name: `Panzer Protector de Cámara ${model}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Accesorios",
        sale: 28_000,
        cost: 12_000,
        stock: rStock(10, 40),
        minStock: 5,
        ivaRate: 0.21,
      });
  }

  // Subcategoría: Protectores de Pantalla
  {
    const sub = await prisma.subcategory.create({
      data: { name: "Protectores de Pantalla", categoryId: catId },
    });

    for (const model of iphoneModels)
      await createProduct({
        name: `Panzer Cristal Templado ${model}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Accesorios",
        sale: 38_000,
        cost: 16_000,
        stock: rStock(10, 50),
        minStock: 5,
        ivaRate: 0.21,
      });

    for (const model of ipadModels) {
      const isLarge = model.includes("13") || model.includes("Pro M4");
      await createProduct({
        name: `Panzer Cristal Templado ${model}`,
        categoryId: catId,
        subcategoryId: sub.id,
        categoryName: "Accesorios",
        sale: isLarge ? 78_000 : 55_000,
        cost: isLarge ? 36_000 : 25_000,
        stock: rStock(8, 30),
        minStock: 3,
        ivaRate: 0.21,
      });
    }
  }

  console.log("✅ Accesorios Panzer creados.");
}

// ─── OTROS ACCESORIOS ─────────────────────────────────────────────────────────

async function seedOtrosAccesorios(catId: string) {
  console.log("\n🔌 Creando Otros Accesorios...");

  const sub = await prisma.subcategory.create({
    data: { name: "Cargadores y Auriculares", categoryId: catId },
  });

  const items = [
    // Cargadores
    { name: "Cargador MagSafe 15W Apple",          sale: 45_000,  cost: 25_000 },
    { name: "Cargador USB-C 20W Apple",             sale: 35_000,  cost: 18_000 },
    { name: "Cargador USB-C 30W Apple",             sale: 52_000,  cost: 28_000 },
    { name: "Cargador USB-C 67W Apple",             sale: 98_000,  cost: 52_000 },
    { name: "Cargador MagSafe MacBook 96W Apple",   sale: 125_000, cost: 70_000 },
    // Auriculares
    { name: "AirPods 4",                            sale: 225_000, cost: 145_000 },
    { name: "AirPods 4 con Cancelación de Ruido",   sale: 285_000, cost: 185_000 },
    { name: "AirPods Pro 2",                        sale: 385_000, cost: 255_000 },
    { name: "AirPods Max Medianoche",               sale: 760_000, cost: 510_000 },
    { name: "AirPods Max Blanco Estrella",          sale: 760_000, cost: 510_000 },
  ];

  for (const item of items)
    await createProduct({
      name: item.name,
      categoryId: catId,
      subcategoryId: sub.id,
      categoryName: "Otros Accesorios",
      sale: item.sale,
      cost: item.cost,
      stock: rStock(5, 25),
      minStock: 2,
      ivaRate: 0.21,
    });

  console.log("✅ Otros Accesorios creados.");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  await clearDemoData();

  console.log("\n🏪 Construyendo catálogo ICASE...\n");

  // Crear categorías principales
  const catIphone = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "iPhone" },
  });
  const catIpad = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "iPad" },
  });
  const catMacbook = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "MacBook" },
  });
  const catWatch = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "Apple Watch" },
  });
  const catAccesorios = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "Accesorios" },
  });
  const catOtros = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "Otros Accesorios" },
  });

  console.log("✅ Categorías creadas: iPhone, iPad, MacBook, Apple Watch, Accesorios, Otros Accesorios");

  await seedIphones(catIphone.id);
  await seedIpads(catIpad.id);
  await seedMacbooks(catMacbook.id);
  await seedWatches(catWatch.id);
  await seedAccesorios(catAccesorios.id);
  await seedOtrosAccesorios(catOtros.id);

  // ── Resumen final
  const totalProducts = await prisma.product.count({ where: { tenantId: TENANT_ID } });
  const totalCategories = await prisma.category.count({ where: { tenantId: TENANT_ID } });
  const totalSubcategories = await prisma.subcategory.count({
    where: { category: { tenantId: TENANT_ID } },
  });

  console.log("\n" + "=".repeat(50));
  console.log("🎉 ICASE cargado exitosamente!");
  console.log(`   📂 Categorías:    ${totalCategories}`);
  console.log(`   📁 Subcategorías: ${totalSubcategories}`);
  console.log(`   📦 Productos:     ${totalProducts}`);
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
