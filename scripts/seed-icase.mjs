/**
 * seed-icase.mjs
 * Borra TODOS los datos del tenant de prueba y carga el catálogo completo Icase.
 * Uso: node --env-file=.env scripts/seed-icase.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Antes se usaba prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } }),
// pero en una base con tenants reales el más viejo no es necesariamente el
// tenant de pruebas — esto podía borrar los datos de un cliente real.
// Ahora apunta siempre al tenant demo conocido (mismo id que usa prisma/seed.ts).
const SEED_TENANT_ID = process.env.SEED_TENANT_ID || "seed_tenant_demo";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cost = (sale) => Math.round(sale * 0.8);
const p = (n) => n; // para legibilidad

// ─── Productos por modelo ──────────────────────────────────────────────────────

const IPHONE_16_COLORS = ["Negro", "Blanco", "Rosa", "Azul Verdoso", "Ultramar"];
const IPHONE_16_PRO_COLORS = ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Desierto"];

// [storage, salePrice]
const IPHONE_16_STORAGE = [
  ["128GB", 1_899_000],
  ["256GB", 2_099_000],
  ["512GB", 2_399_000],
];
const IPHONE_16_PLUS_STORAGE = [
  ["128GB", 2_099_000],
  ["256GB", 2_299_000],
  ["512GB", 2_599_000],
];
const IPHONE_16_PRO_STORAGE = [
  ["128GB", 2_399_000],
  ["256GB", 2_699_000],
  ["512GB", 2_999_000],
  ["1TB",   3_399_000],
];
const IPHONE_16_PRO_MAX_STORAGE = [
  ["256GB", 2_999_000],
  ["512GB", 3_399_000],
  ["1TB",   3_799_000],
];

// iPad colors
const IPAD_MINI_COLORS = ["Gris Espacial", "Azul", "Púrpura", "Estelar"];
const IPAD_BASE_COLORS = ["Azul", "Rosa", "Amarillo", "Plata"];
const IPAD_AIR_COLORS  = ["Azul Cielo", "Azul Índigo", "Estelar", "Rosado"];
const IPAD_PRO_COLORS  = ["Negro Espacial", "Plata"];

const IPAD_MINI_STORAGE  = [["128GB", 1_199_000], ["256GB", 1_399_000]];
const IPAD_BASE_STORAGE  = [["128GB",   899_000], ["256GB", 1_099_000]];
const IPAD_AIR11_STORAGE = [["128GB", 1_499_000], ["256GB", 1_699_000], ["512GB", 1_999_000]];
const IPAD_AIR13_STORAGE = [["128GB", 1_799_000], ["256GB", 1_999_000], ["512GB", 2_299_000]];
const IPAD_PRO11_STORAGE = [["256GB", 2_499_000], ["512GB", 2_799_000], ["1TB", 3_199_000]];
const IPAD_PRO13_STORAGE = [["256GB", 2_999_000], ["512GB", 3_299_000], ["1TB", 3_799_000], ["2TB", 4_399_000]];

// MacBook colors
const MB_AIR_COLORS = ["Azul Cielo", "Azul Medianoche", "Plateado", "Arena Estelar"];
const MB_PRO_COLORS = ["Negro Espacial", "Plata"];

const MB_AIR13_CONFIGS = [
  ["8GB / 256GB",  2_699_000],
  ["16GB / 256GB", 2_999_000],
  ["16GB / 512GB", 3_399_000],
  ["24GB / 512GB", 3_799_000],
];
const MB_AIR15_CONFIGS = [
  ["16GB / 256GB", 3_299_000],
  ["16GB / 512GB", 3_699_000],
  ["24GB / 512GB", 4_099_000],
];
const MB_PRO14_M4_CONFIGS    = [["16GB / 512GB", 3_999_000], ["24GB / 1TB", 4_799_000]];
const MB_PRO14_M4P_CONFIGS   = [["24GB / 512GB", 5_499_000], ["48GB / 1TB", 6_499_000]];
const MB_PRO14_M4MAX_CONFIGS = [["36GB / 1TB", 7_499_000], ["64GB / 1TB", 8_999_000]];
const MB_PRO16_M4P_CONFIGS   = [["24GB / 512GB", 6_499_000], ["48GB / 1TB", 7_499_000]];
const MB_PRO16_M4MAX_CONFIGS = [["36GB / 1TB", 8_499_000], ["64GB / 2TB", 10_499_000]];

// Apple Watch
const WATCH_S10_40_COLORS = ["Jet Negro", "Plata", "Oro Rosa", "Dorado"];
const WATCH_S10_42_COLORS = ["Jet Negro", "Plata", "Oro Rosa", "Dorado"];
const WATCH_S10_46_COLORS = ["Titanio Natural", "Titanio Negro", "Titanio Oro"];
const WATCH_ULTRA2_COLORS = ["Titanio Natural", "Titanio Negro"];
const WATCH_SE_40_COLORS  = ["Medianoche", "Estelar", "Plata"];
const WATCH_SE_44_COLORS  = ["Medianoche", "Estelar", "Plata"];

// Panzer — modelos para los que hay accesorio
const IPHONE_PANZER_MODELS = ["iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max"];
const IPAD_PANZER_MODELS   = ["iPad mini A17 Pro", "iPad A16", "iPad Air M3 11\"", "iPad Air M3 13\"", "iPad Pro M4 11\"", "iPad Pro M4 13\""];

// ─── 20 Clientes argentinos ────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: "Martina López",      phone: "+5491155234810", email: "martina.lopez@gmail.com",       customerCode: "CLI-001" },
  { name: "Santiago Rodríguez", phone: "+5491162345921", email: "srodriguez@hotmail.com",         customerCode: "CLI-002" },
  { name: "Valentina García",   phone: "+5491173456032", email: "vgarcia.compras@gmail.com",      customerCode: "CLI-003" },
  { name: "Lucas Fernández",    phone: "+5491184567143", email: "lucas.fernandez@yahoo.com.ar",   customerCode: "CLI-004" },
  { name: "Sofía Martínez",     phone: "+5491195678254", email: "sofi.martinez@gmail.com",        customerCode: "CLI-005" },
  { name: "Mateo González",     phone: "+5491106789365", email: "mateo.gonzalez@outlook.com",     customerCode: "CLI-006" },
  { name: "Julieta Pereyra",    phone: "+5491117890476", email: "juli.pereyra@gmail.com",         customerCode: "CLI-007" },
  { name: "Facundo Romero",     phone: "+5491128901587", email: "facundo.romero@gmail.com",       customerCode: "CLI-008" },
  { name: "Agustina Torres",    phone: "+5491139012698", email: "agustina.torres@icloud.com",     customerCode: "CLI-009" },
  { name: "Nicolás Díaz",       phone: "+5491140123709", email: "nicolas.diaz.ba@gmail.com",      customerCode: "CLI-010" },
  { name: "Camila Ruiz",        phone: "+5491151234810", email: "camila.ruiz1990@gmail.com",      customerCode: "CLI-011" },
  { name: "Tomás Álvarez",      phone: "+5491162345921", email: "tomas.alvarez@hotmail.com",      customerCode: "CLI-012" },
  { name: "Florencia Moreno",   phone: "+5491173456032", email: "flo.moreno@gmail.com",           customerCode: "CLI-013" },
  { name: "Ignacio Herrera",    phone: "+5491184567143", email: "ignacio.herrera@outlook.com",    customerCode: "CLI-014" },
  { name: "Lucía Medina",       phone: "+5491195678254", email: "lucia.medina.ok@gmail.com",      customerCode: "CLI-015" },
  { name: "Joaquín Castro",     phone: "+5491106789365", email: "jcastro.compras@gmail.com",      customerCode: "CLI-016" },
  { name: "Pilar Suárez",       phone: "+5491117890476", email: "pilar.suarez@yahoo.com.ar",      customerCode: "CLI-017" },
  { name: "Emiliano Vargas",    phone: "+5491128901587", email: "emiliano.vargas@gmail.com",      customerCode: "CLI-018" },
  { name: "Rocío Acosta",       phone: "+5491139012698", email: "rocio.acosta.rba@gmail.com",     customerCode: "CLI-019" },
  { name: "Esteban Quiroga",    phone: "+5491140123709", email: "esteban.quiroga@hotmail.com",    customerCode: "CLI-020" },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Iniciando seed Icase...\n");

  // 1. Tenant
  const tenant = await prisma.tenant.findUnique({ where: { id: SEED_TENANT_ID } });
  if (!tenant) {
    console.error(`❌ No existe el tenant demo (${SEED_TENANT_ID}). Ejecuta npm run reset:users primero.`);
    process.exit(1);
  }
  const TID = tenant.id;
  console.log(`🏢 Tenant: ${tenant.businessName} (${TID})\n`);

  // 2. Wipe data (FK-safe order)
  console.log("🗑️  Borrando datos existentes del tenant...");
  await prisma.auditLog.deleteMany({ where: { tenantId: TID } });
  await prisma.promotionUsage.deleteMany({ where: { promotion: { tenantId: TID } } });

  // ReturnItem / Return — sin tenantId propio, borrar via sale
  const saleIds = (await prisma.sale.findMany({ where: { tenantId: TID }, select: { id: true } })).map(s => s.id);
  if (saleIds.length) {
    const returnIds = (await prisma.return.findMany({ where: { saleId: { in: saleIds } }, select: { id: true } })).map(r => r.id);
    if (returnIds.length) {
      await prisma.returnItem.deleteMany({ where: { returnId: { in: returnIds } } });
      await prisma.return.deleteMany({ where: { id: { in: returnIds } } });
    }
    await prisma.invoice.deleteMany({ where: { tenantId: TID } });
    await prisma.quoteItem.deleteMany({ where: { quote: { tenantId: TID } } });
    await prisma.quote.deleteMany({ where: { tenantId: TID } });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
    await prisma.sale.deleteMany({ where: { tenantId: TID } });
  } else {
    await prisma.invoice.deleteMany({ where: { tenantId: TID } });
    await prisma.quoteItem.deleteMany({ where: { quote: { tenantId: TID } } });
    await prisma.quote.deleteMany({ where: { tenantId: TID } });
  }

  await prisma.debtPayment.deleteMany({ where: { tenantId: TID } });
  await prisma.debt.deleteMany({ where: { tenantId: TID } });
  await prisma.cashMovement.deleteMany({ where: { tenantId: TID } });
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId: TID } });
  await prisma.inventoryMovement.deleteMany({ where: { tenantId: TID } });
  await prisma.expense.deleteMany({ where: { tenantId: TID } });
  await prisma.service.deleteMany({ where: { tenantId: TID } });
  await prisma.promotion.deleteMany({ where: { tenantId: TID } });
  await prisma.product.deleteMany({ where: { tenantId: TID } });

  // Subcategory → Category
  const catIds = (await prisma.category.findMany({ where: { tenantId: TID }, select: { id: true } })).map(c => c.id);
  if (catIds.length) {
    await prisma.subcategory.deleteMany({ where: { categoryId: { in: catIds } } });
    await prisma.category.deleteMany({ where: { tenantId: TID } });
  }

  await prisma.customer.deleteMany({ where: { tenantId: TID } });
  await prisma.codeCounter.deleteMany({});
  console.log("✅ Datos borrados\n");

  // ─── 3. Categorías ──────────────────────────────────────────────────────────
  console.log("📁 Creando categorías...");

  const catIphone     = await prisma.category.create({ data: { tenantId: TID, name: "iPhone" } });
  const catIpad       = await prisma.category.create({ data: { tenantId: TID, name: "iPad" } });
  const catMacbook    = await prisma.category.create({ data: { tenantId: TID, name: "MacBook" } });
  const catWatch      = await prisma.category.create({ data: { tenantId: TID, name: "Apple Watch" } });
  const catAccesorios = await prisma.category.create({ data: { tenantId: TID, name: "Accesorios" } });
  const catOtros      = await prisma.category.create({ data: { tenantId: TID, name: "Otros Accesorios" } });

  // Subcategorías
  const subIph16     = await prisma.subcategory.create({ data: { name: "iPhone 16",      categoryId: catIphone.id } });
  const subIph16P    = await prisma.subcategory.create({ data: { name: "iPhone 16 Plus",  categoryId: catIphone.id } });
  const subIph16Pro  = await prisma.subcategory.create({ data: { name: "iPhone 16 Pro",   categoryId: catIphone.id } });
  const subIph16PM   = await prisma.subcategory.create({ data: { name: "iPhone 16 Pro Max", categoryId: catIphone.id } });

  const subIpadMini  = await prisma.subcategory.create({ data: { name: "iPad mini A17 Pro", categoryId: catIpad.id } });
  const subIpadBase  = await prisma.subcategory.create({ data: { name: "iPad A16",          categoryId: catIpad.id } });
  const subIpadAir11 = await prisma.subcategory.create({ data: { name: "iPad Air M3 11\"",  categoryId: catIpad.id } });
  const subIpadAir13 = await prisma.subcategory.create({ data: { name: "iPad Air M3 13\"",  categoryId: catIpad.id } });
  const subIpadPro11 = await prisma.subcategory.create({ data: { name: "iPad Pro M4 11\"",  categoryId: catIpad.id } });
  const subIpadPro13 = await prisma.subcategory.create({ data: { name: "iPad Pro M4 13\"",  categoryId: catIpad.id } });

  const subMbAir13   = await prisma.subcategory.create({ data: { name: "MacBook Air M4 13\"",  categoryId: catMacbook.id } });
  const subMbAir15   = await prisma.subcategory.create({ data: { name: "MacBook Air M4 15\"",  categoryId: catMacbook.id } });
  const subMbPro14   = await prisma.subcategory.create({ data: { name: "MacBook Pro 14\"",     categoryId: catMacbook.id } });
  const subMbPro16   = await prisma.subcategory.create({ data: { name: "MacBook Pro 16\"",     categoryId: catMacbook.id } });

  const subWatchS10  = await prisma.subcategory.create({ data: { name: "Watch Series 10",  categoryId: catWatch.id } });
  const subWatchU2   = await prisma.subcategory.create({ data: { name: "Watch Ultra 2",    categoryId: catWatch.id } });
  const subWatchSE   = await prisma.subcategory.create({ data: { name: "Watch SE",         categoryId: catWatch.id } });

  const subPanzerCam  = await prisma.subcategory.create({ data: { name: "Protectores de Cámara",  categoryId: catAccesorios.id } });
  const subPanzerPant = await prisma.subcategory.create({ data: { name: "Protectores de Pantalla", categoryId: catAccesorios.id } });

  console.log("✅ Categorías y subcategorías creadas\n");

  // ─── Helper crear producto ──────────────────────────────────────────────────
  let prodCount = 0;
  async function createProduct({ code, name, categoryName, categoryId, subcategoryId, salePrice, stock = 5 }) {
    await prisma.product.create({
      data: {
        tenantId:     TID,
        productCode:  code,
        name,
        categoryName,
        categoryId,
        subcategoryId,
        salePrice,
        costPrice:    cost(salePrice),
        ivaRate:      0.21,
        stock,
        minStock:     1,
      },
    });
    prodCount++;
  }

  // ─── 4. iPhones ─────────────────────────────────────────────────────────────
  console.log("📱 Cargando iPhones...");

  for (const [stor, price] of IPHONE_16_STORAGE) {
    for (const color of IPHONE_16_COLORS) {
      const code = `IPH16-${stor.replace("GB","")}-${color.substring(0,3).toUpperCase()}`.replace(/\s/g,"-");
      await createProduct({
        code,
        name: `iPhone 16 ${stor} ${color}`,
        categoryName: "iPhone",
        categoryId: catIphone.id,
        subcategoryId: subIph16.id,
        salePrice: price,
      });
    }
  }

  for (const [stor, price] of IPHONE_16_PLUS_STORAGE) {
    for (const color of IPHONE_16_COLORS) {
      const code = `IPH16P-${stor.replace("GB","")}-${color.substring(0,3).toUpperCase()}`.replace(/\s/g,"-");
      await createProduct({
        code,
        name: `iPhone 16 Plus ${stor} ${color}`,
        categoryName: "iPhone",
        categoryId: catIphone.id,
        subcategoryId: subIph16P.id,
        salePrice: price,
      });
    }
  }

  for (const [stor, price] of IPHONE_16_PRO_STORAGE) {
    for (const color of IPHONE_16_PRO_COLORS) {
      const colorCode = color.split(" ").map(w => w[0]).join("").toUpperCase();
      const code = `IPH16PR-${stor.replace("GB","").replace("TB","T")}-${colorCode}`;
      await createProduct({
        code,
        name: `iPhone 16 Pro ${stor} ${color}`,
        categoryName: "iPhone",
        categoryId: catIphone.id,
        subcategoryId: subIph16Pro.id,
        salePrice: price,
      });
    }
  }

  for (const [stor, price] of IPHONE_16_PRO_MAX_STORAGE) {
    for (const color of IPHONE_16_PRO_COLORS) {
      const colorCode = color.split(" ").map(w => w[0]).join("").toUpperCase();
      const code = `IPH16PM-${stor.replace("GB","").replace("TB","T")}-${colorCode}`;
      await createProduct({
        code,
        name: `iPhone 16 Pro Max ${stor} ${color}`,
        categoryName: "iPhone",
        categoryId: catIphone.id,
        subcategoryId: subIph16PM.id,
        salePrice: price,
      });
    }
  }

  console.log(`   ✅ ${prodCount} iPhones cargados`);
  const phonesDone = prodCount;

  // ─── 5. iPads ────────────────────────────────────────────────────────────────
  console.log("📱 Cargando iPads...");

  const ipadModels = [
    { prefix: "IPDMINI", name: "iPad mini A17 Pro", subId: subIpadMini.id, colors: IPAD_MINI_COLORS,  storage: IPAD_MINI_STORAGE  },
    { prefix: "IPDBASE", name: "iPad A16",           subId: subIpadBase.id, colors: IPAD_BASE_COLORS,  storage: IPAD_BASE_STORAGE  },
    { prefix: "IPDA11",  name: "iPad Air M3 11\"",   subId: subIpadAir11.id, colors: IPAD_AIR_COLORS,  storage: IPAD_AIR11_STORAGE },
    { prefix: "IPDA13",  name: "iPad Air M3 13\"",   subId: subIpadAir13.id, colors: IPAD_AIR_COLORS,  storage: IPAD_AIR13_STORAGE },
    { prefix: "IPDP11",  name: "iPad Pro M4 11\"",   subId: subIpadPro11.id, colors: IPAD_PRO_COLORS,  storage: IPAD_PRO11_STORAGE },
    { prefix: "IPDP13",  name: "iPad Pro M4 13\"",   subId: subIpadPro13.id, colors: IPAD_PRO_COLORS,  storage: IPAD_PRO13_STORAGE },
  ];

  for (const model of ipadModels) {
    for (const [stor, price] of model.storage) {
      for (const color of model.colors) {
        const colorCode = color.split(" ").map(w => w[0]).join("").toUpperCase();
        const code = `${model.prefix}-${stor.replace("GB","").replace("TB","T")}-${colorCode}`;
        await createProduct({
          code,
          name: `${model.name} ${stor} ${color}`,
          categoryName: "iPad",
          categoryId: catIpad.id,
          subcategoryId: model.subId,
          salePrice: price,
        });
      }
    }
  }

  console.log(`   ✅ ${prodCount - phonesDone} iPads cargados`);
  const ipadsDone = prodCount;

  // ─── 6. MacBooks ────────────────────────────────────────────────────────────
  console.log("💻 Cargando MacBooks...");

  const mbModels = [
    { prefix: "MBA13",    name: "MacBook Air M4 13\"",       subId: subMbAir13.id, colors: MB_AIR_COLORS, configs: MB_AIR13_CONFIGS    },
    { prefix: "MBA15",    name: "MacBook Air M4 15\"",       subId: subMbAir15.id, colors: MB_AIR_COLORS, configs: MB_AIR15_CONFIGS    },
    { prefix: "MBP14M4",  name: "MacBook Pro 14\" M4",       subId: subMbPro14.id, colors: MB_PRO_COLORS, configs: MB_PRO14_M4_CONFIGS  },
    { prefix: "MBP14M4P", name: "MacBook Pro 14\" M4 Pro",  subId: subMbPro14.id, colors: MB_PRO_COLORS, configs: MB_PRO14_M4P_CONFIGS  },
    { prefix: "MBP14M4X", name: "MacBook Pro 14\" M4 Max",  subId: subMbPro14.id, colors: MB_PRO_COLORS, configs: MB_PRO14_M4MAX_CONFIGS },
    { prefix: "MBP16M4P", name: "MacBook Pro 16\" M4 Pro",  subId: subMbPro16.id, colors: MB_PRO_COLORS, configs: MB_PRO16_M4P_CONFIGS  },
    { prefix: "MBP16M4X", name: "MacBook Pro 16\" M4 Max",  subId: subMbPro16.id, colors: MB_PRO_COLORS, configs: MB_PRO16_M4MAX_CONFIGS },
  ];

  for (const model of mbModels) {
    for (const [cfg, price] of model.configs) {
      for (const color of model.colors) {
        const colorCode = color.split(" ").map(w => w[0]).join("").toUpperCase();
        const cfgCode   = cfg.replace(/\s*\/\s*/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
        const code = `${model.prefix}-${cfgCode}-${colorCode}`;
        await createProduct({
          code,
          name: `${model.name} ${cfg} ${color}`,
          categoryName: "MacBook",
          categoryId: catMacbook.id,
          subcategoryId: model.subId,
          salePrice: price,
          stock: 3,
        });
      }
    }
  }

  console.log(`   ✅ ${prodCount - ipadsDone} MacBooks cargados`);
  const mbDone = prodCount;

  // ─── 7. Apple Watch ─────────────────────────────────────────────────────────
  console.log("⌚ Cargando Apple Watches...");

  const watchModels = [
    { prefix: "WS10-40",  name: "Apple Watch Series 10 40mm", subId: subWatchS10.id, colors: WATCH_S10_40_COLORS, price: 699_000  },
    { prefix: "WS10-42",  name: "Apple Watch Series 10 42mm", subId: subWatchS10.id, colors: WATCH_S10_42_COLORS, price: 749_000  },
    { prefix: "WS10-46",  name: "Apple Watch Series 10 46mm Titanio", subId: subWatchS10.id, colors: WATCH_S10_46_COLORS, price: 1_099_000 },
    { prefix: "WU2",      name: "Apple Watch Ultra 2 49mm",   subId: subWatchU2.id,  colors: WATCH_ULTRA2_COLORS, price: 1_299_000 },
    { prefix: "WSE-40",   name: "Apple Watch SE 40mm",        subId: subWatchSE.id,  colors: WATCH_SE_40_COLORS,  price: 449_000  },
    { prefix: "WSE-44",   name: "Apple Watch SE 44mm",        subId: subWatchSE.id,  colors: WATCH_SE_44_COLORS,  price: 499_000  },
  ];

  for (const model of watchModels) {
    for (const color of model.colors) {
      const colorCode = color.split(" ").map(w => w[0]).join("").toUpperCase();
      const code = `${model.prefix}-${colorCode}`;
      await createProduct({
        code,
        name: `${model.name} ${color}`,
        categoryName: "Apple Watch",
        categoryId: catWatch.id,
        subcategoryId: model.subId,
        salePrice: model.price,
        stock: 3,
      });
    }
  }

  console.log(`   ✅ ${prodCount - mbDone} Apple Watches cargados`);
  const watchDone = prodCount;

  // ─── 8. Panzer — Protectores Cámara ─────────────────────────────────────────
  console.log("🛡️  Cargando Panzer Protectores de Cámara...");

  for (const model of IPHONE_PANZER_MODELS) {
    const slug = model.replace(/\s+/g, "").toUpperCase().substring(0, 8);
    await createProduct({
      code:          `PNZ-CAM-${slug}`,
      name:          `Panzer Protector de Cámara ${model}`,
      categoryName:  "Accesorios",
      categoryId:    catAccesorios.id,
      subcategoryId: subPanzerCam.id,
      salePrice:     24_990,
      stock:         20,
    });
  }

  for (const model of IPAD_PANZER_MODELS) {
    const slug = model.replace(/[\s"]+/g, "").toUpperCase().substring(0, 8);
    await createProduct({
      code:          `PNZ-CAMI-${slug}`,
      name:          `Panzer Protector de Cámara ${model}`,
      categoryName:  "Accesorios",
      categoryId:    catAccesorios.id,
      subcategoryId: subPanzerCam.id,
      salePrice:     21_990,
      stock:         15,
    });
  }

  // ─── 9. Panzer — Protectores Pantalla ───────────────────────────────────────
  console.log("🛡️  Cargando Panzer Protectores de Pantalla...");

  for (const model of IPHONE_PANZER_MODELS) {
    const slug = model.replace(/\s+/g, "").toUpperCase().substring(0, 8);
    await createProduct({
      code:          `PNZ-PAN-${slug}`,
      name:          `Panzer Protector de Pantalla ${model}`,
      categoryName:  "Accesorios",
      categoryId:    catAccesorios.id,
      subcategoryId: subPanzerPant.id,
      salePrice:     34_990,
      stock:         20,
    });
  }

  for (const model of IPAD_PANZER_MODELS) {
    const slug = model.replace(/[\s"]+/g, "").toUpperCase().substring(0, 8);
    await createProduct({
      code:          `PNZ-PANI-${slug}`,
      name:          `Panzer Protector de Pantalla ${model}`,
      categoryName:  "Accesorios",
      categoryId:    catAccesorios.id,
      subcategoryId: subPanzerPant.id,
      salePrice:     44_990,
      stock:         15,
    });
  }

  console.log(`   ✅ ${prodCount - watchDone} accesorios Panzer cargados`);
  const panzerDone = prodCount;

  // ─── 10. Otros Accesorios (cargadores y auriculares) ───────────────────────
  console.log("🔌 Cargando cargadores y auriculares...");

  const otrosAccesorios = [
    { code: "ACC-CABLE-C1M",   name: "Cable USB-C a USB-C 1m Apple",        price: 14_990 },
    { code: "ACC-CABLE-C2M",   name: "Cable USB-C a USB-C 2m Apple",        price: 18_990 },
    { code: "ACC-CARG-20W",    name: "Cargador USB-C 20W Apple",             price: 34_990 },
    { code: "ACC-CARG-35W",    name: "Cargador USB-C 35W Doble Puerto Apple",price: 64_990 },
    { code: "ACC-CARG-67W",    name: "Cargador USB-C 67W Apple",             price: 89_990 },
    { code: "ACC-MAGSAFE-1M",  name: "Cargador MagSafe 1m Apple",            price: 44_990 },
    { code: "ACC-AIRPODS4",    name: "AirPods 4",                            price: 249_000 },
    { code: "ACC-AIRPODS4ANC", name: "AirPods 4 con Cancelación de Ruido",  price: 299_000 },
    { code: "ACC-AIRPODSPRO2", name: "AirPods Pro 2 con MagSafe",           price: 399_000 },
    { code: "ACC-AIRPODSMAX",  name: "AirPods Max USB-C",                   price: 899_000 },
  ];

  for (const item of otrosAccesorios) {
    await createProduct({
      code:         item.code,
      name:         item.name,
      categoryName: "Otros Accesorios",
      categoryId:   catOtros.id,
      salePrice:    item.price,
      stock:        10,
    });
  }

  console.log(`   ✅ ${prodCount - panzerDone} accesorios cargados`);

  // ─── 11. Clientes ────────────────────────────────────────────────────────────
  console.log("\n👥 Cargando 20 clientes...");
  for (const c of CUSTOMERS) {
    await prisma.customer.create({
      data: { tenantId: TID, ...c },
    });
  }
  console.log("   ✅ 20 clientes cargados");

  // ─── Resumen ─────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 Seed Icase completado:`);
  console.log(`   📱 Productos cargados : ${prodCount}`);
  console.log(`   👥 Clientes cargados  : ${CUSTOMERS.length}`);
  console.log(`   📁 Categorías         : iPhone, iPad, MacBook, Apple Watch, Accesorios, Otros Accesorios`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("💡 Nota: Los campos 'distribuidor' y 'marca' no existen en el schema.");
  console.log("   El distribuidor 'Apple' / 'Panzer Inc' está implícito en el nombre del producto.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
