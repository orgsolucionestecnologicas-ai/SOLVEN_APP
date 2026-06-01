import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_TENANT_EMAIL = "demo@solven.app";
const DEMO_TENANT_ID = "seed_tenant_demo";

type ProductSeed = {
  id: string;
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

type CustomerSeed = {
  id: string;
  name: string;
};

type SaleItemSeed = { productId: string; qty: number; price: number };

const products: ProductSeed[] = [
  // Lácteos
  { id: "seed_prod_01", name: "Leche entera 1L",           categoryName: "Lácteos",          costPrice: 18, salePrice: 23, stock: 45 },
  { id: "seed_prod_02", name: "Leche descremada 1L",        categoryName: "Lácteos",          costPrice: 19, salePrice: 25, stock: 28 },
  { id: "seed_prod_03", name: "Yogur natural 1kg",          categoryName: "Lácteos",          costPrice: 28, salePrice: 36, stock: 20 },
  { id: "seed_prod_04", name: "Queso Oaxaca 400g",          categoryName: "Lácteos",          costPrice: 55, salePrice: 72, stock: 14 },
  { id: "seed_prod_05", name: "Queso Manchego 400g",        categoryName: "Lácteos",          costPrice: 62, salePrice: 80, stock:  4 },
  { id: "seed_prod_06", name: "Crema ácida 250ml",          categoryName: "Lácteos",          costPrice: 18, salePrice: 24, stock:  0 },
  { id: "seed_prod_07", name: "Mantequilla 90g",            categoryName: "Lácteos",          costPrice: 22, salePrice: 30, stock:  3 },
  { id: "seed_prod_08", name: "Jocoque 1kg",                categoryName: "Lácteos",          costPrice: 25, salePrice: 34, stock:  0 },
  // Bebidas
  { id: "seed_prod_09", name: "Refresco Cola 600ml",        categoryName: "Bebidas",          costPrice: 12, salePrice: 18, stock: 60 },
  { id: "seed_prod_10", name: "Agua purificada 1.5L",       categoryName: "Bebidas",          costPrice:  8, salePrice: 14, stock: 75 },
  { id: "seed_prod_11", name: "Jugo de naranja 1L",         categoryName: "Bebidas",          costPrice: 22, salePrice: 30, stock: 22 },
  { id: "seed_prod_12", name: "Agua mineral 500ml",         categoryName: "Bebidas",          costPrice:  7, salePrice: 12, stock: 48 },
  { id: "seed_prod_13", name: "Refresco sabor limón 600ml", categoryName: "Bebidas",          costPrice: 11, salePrice: 17, stock: 36 },
  { id: "seed_prod_14", name: "Bebida energética 250ml",    categoryName: "Bebidas",          costPrice: 20, salePrice: 30, stock:  2 },
  { id: "seed_prod_15", name: "Néctar de mango 1L",         categoryName: "Bebidas",          costPrice: 18, salePrice: 26, stock:  0 },
  { id: "seed_prod_16", name: "Té frío limón 500ml",        categoryName: "Bebidas",          costPrice: 10, salePrice: 16, stock:  0 },
  // Alimentos (granos, cereales)
  { id: "seed_prod_17", name: "Arroz blanco 1kg",           categoryName: "Alimentos",        costPrice: 22, salePrice: 30, stock: 55 },
  { id: "seed_prod_18", name: "Frijol negro 1kg",           categoryName: "Alimentos",        costPrice: 28, salePrice: 38, stock: 40 },
  { id: "seed_prod_19", name: "Avena entera 500g",          categoryName: "Alimentos",        costPrice: 18, salePrice: 26, stock: 32 },
  { id: "seed_prod_20", name: "Cereal de trigo 500g",       categoryName: "Alimentos",        costPrice: 32, salePrice: 44, stock: 18 },
  { id: "seed_prod_21", name: "Pasta espagueti 500g",       categoryName: "Alimentos",        costPrice: 14, salePrice: 20, stock: 42 },
  { id: "seed_prod_22", name: "Lenteja 500g",               categoryName: "Alimentos",        costPrice: 20, salePrice: 28, stock:  5 },
  // Snacks
  { id: "seed_prod_23", name: "Papas fritas 45g",           categoryName: "Snacks",           costPrice: 10, salePrice: 16, stock: 90 },
  { id: "seed_prod_24", name: "Galletas de chocolate 100g", categoryName: "Snacks",           costPrice: 15, salePrice: 22, stock: 58 },
  { id: "seed_prod_25", name: "Palomitas de maíz 100g",     categoryName: "Snacks",           costPrice:  8, salePrice: 14, stock: 45 },
  { id: "seed_prod_26", name: "Cacahuates con chile 100g",  categoryName: "Snacks",           costPrice: 12, salePrice: 18, stock:  5 },
  { id: "seed_prod_27", name: "Chicharrones 30g",           categoryName: "Snacks",           costPrice:  6, salePrice: 10, stock:  0 },
  // Limpieza
  { id: "seed_prod_28", name: "Detergente en polvo 1kg",    categoryName: "Limpieza",         costPrice: 42, salePrice: 58, stock: 25 },
  { id: "seed_prod_29", name: "Jabón de lavandería",        categoryName: "Limpieza",         costPrice:  8, salePrice: 14, stock: 35 },
  { id: "seed_prod_30", name: "Cloro 1L",                   categoryName: "Limpieza",         costPrice: 18, salePrice: 26, stock: 18 },
  { id: "seed_prod_31", name: "Escoba plástica",            categoryName: "Limpieza",         costPrice: 55, salePrice: 80, stock:  3 },
  { id: "seed_prod_32", name: "Trapeador de algodón",       categoryName: "Limpieza",         costPrice: 65, salePrice: 95, stock:  0 },
  // Alimentos (carnes)
  { id: "seed_prod_33", name: "Pechuga de pollo 1kg",       categoryName: "Alimentos",        costPrice: 65, salePrice: 88, stock: 12 },
  { id: "seed_prod_34", name: "Carne molida de res 1kg",    categoryName: "Alimentos",        costPrice: 88, salePrice: 115, stock: 4 },
  { id: "seed_prod_35", name: "Jamón de pavo 200g",         categoryName: "Alimentos",        costPrice: 28, salePrice: 40, stock:  1 },
  { id: "seed_prod_36", name: "Salchicha de puerco 250g",   categoryName: "Alimentos",        costPrice: 22, salePrice: 34, stock:  0 },
  // Panadería
  { id: "seed_prod_37", name: "Pan de caja blanco",         categoryName: "Panadería",        costPrice: 28, salePrice: 40, stock: 16 },
  { id: "seed_prod_38", name: "Pan dulce surtido 6 piezas", categoryName: "Panadería",        costPrice: 20, salePrice: 32, stock:  0 },
  { id: "seed_prod_39", name: "Tortilla de maíz 1kg",       categoryName: "Panadería",        costPrice: 18, salePrice: 26, stock: 28 },
  // Alimentos (condimentos y frescos)
  { id: "seed_prod_40", name: "Salsa roja picante 120ml",   categoryName: "Alimentos",        costPrice: 16, salePrice: 24, stock: 38 },
  { id: "seed_prod_41", name: "Mayonesa 400g",              categoryName: "Alimentos",        costPrice: 32, salePrice: 45, stock: 22 },
  { id: "seed_prod_42", name: "Aceite vegetal 1L",          categoryName: "Alimentos",        costPrice: 32, salePrice: 46, stock: 20 },
  { id: "seed_prod_43", name: "Azúcar estándar 1kg",        categoryName: "Alimentos",        costPrice: 20, salePrice: 28, stock:  1 },
  { id: "seed_prod_44", name: "Jitomate por kg",            categoryName: "Alimentos",        costPrice: 18, salePrice: 26, stock: 15 },
  { id: "seed_prod_45", name: "Cebolla blanca por kg",      categoryName: "Alimentos",        costPrice: 14, salePrice: 22, stock: 20 },
  { id: "seed_prod_46", name: "Plátano por kg",             categoryName: "Alimentos",        costPrice: 12, salePrice: 18, stock: 18 },
  { id: "seed_prod_47", name: "Limón por kg",               categoryName: "Alimentos",        costPrice: 16, salePrice: 24, stock: 25 },
  // Cuidado Personal
  { id: "seed_prod_48", name: "Jabón de baño 100g",         categoryName: "Cuidado Personal", costPrice: 10, salePrice: 16, stock: 35 },
  { id: "seed_prod_49", name: "Pasta dental 100ml",         categoryName: "Cuidado Personal", costPrice: 22, salePrice: 34, stock:  2 },
  // Hogar
  { id: "seed_prod_50", name: "Papel higiénico 4 rollos",   categoryName: "Hogar",            costPrice: 28, salePrice: 42, stock: 28 },
];

const customers: CustomerSeed[] = [
  { id: "seed_cust_01", name: "María Guadalupe Ramírez Torres" },
  { id: "seed_cust_02", name: "José Antonio Hernández López" },
  { id: "seed_cust_03", name: "Ana Patricia Flores García" },
  { id: "seed_cust_04", name: "Carlos Eduardo Martínez Sánchez" },
  { id: "seed_cust_05", name: "Laura Beatriz González Pérez" },
  { id: "seed_cust_06", name: "Roberto Miguel Jiménez Morales" },
  { id: "seed_cust_07", name: "Alejandra Isabel Reyes Cruz" },
  { id: "seed_cust_08", name: "Francisco Javier Mendoza Castillo" },
  { id: "seed_cust_09", name: "Sofía Valentina Vargas Romero" },
  { id: "seed_cust_10", name: "Manuel Ernesto Gutiérrez Navarro" },
  { id: "seed_cust_11", name: "Claudia Lorena Aguilar Ríos" },
  { id: "seed_cust_12", name: "Héctor Ramón Medina Fuentes" },
  { id: "seed_cust_13", name: "Verónica Esther Delgado Vega" },
  { id: "seed_cust_14", name: "Fernando Luis Cervantes Ruiz" },
  { id: "seed_cust_15", name: "Patricia Elena Soto Miranda" },
];

async function seedOperations(stock: Map<string, number>, tenantId: string) {
  const existingCount = await prisma.sale.count({ where: { tenantId } });
  if (existingCount > 0) {
    console.log(`Operations already seeded (${existingCount} sales found), skipping.`);
    return;
  }

  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86_400_000);

  async function cashSale(id: string, date: Date, items: SaleItemSeed[]) {
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: { id, tenantId, saleDate: date, paymentType: "CASH", totalAmount: total },
      });
      await tx.saleItem.createMany({
        data: items.map((i) => ({
          saleId: sale.id,
          productId: i.productId,
          quantity: i.qty,
          unitPrice: i.price,
          total: i.qty * i.price,
        })),
      });
      for (const i of items) {
        const prev = stock.get(i.productId)!;
        const next = prev - i.qty;
        await tx.product.update({ where: { id: i.productId }, data: { stock: next } });
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: i.productId,
            movementDate: date,
            reason: `SALE:${sale.id}`,
            previousStock: prev,
            newStock: next,
            quantityChange: -i.qty,
          },
        });
        stock.set(i.productId, next);
      }
      await tx.cashMovement.create({
        data: { tenantId, movementDate: date, type: "IN", amount: total, source: "SALE", referenceId: sale.id },
      });
    });
  }

  async function creditSale(
    saleId: string,
    debtId: string,
    date: Date,
    customerId: string,
    items: SaleItemSeed[]
  ) {
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: { id: debtId, tenantId, customerId, totalAmount: total, remainingAmount: total },
      });
      await tx.sale.create({
        data: {
          id: saleId,
          tenantId,
          saleDate: date,
          paymentType: "CREDIT",
          customerId,
          totalAmount: total,
          debtId: debt.id,
        },
      });
      await tx.saleItem.createMany({
        data: items.map((i) => ({
          saleId,
          productId: i.productId,
          quantity: i.qty,
          unitPrice: i.price,
          total: i.qty * i.price,
        })),
      });
      for (const i of items) {
        const prev = stock.get(i.productId)!;
        const next = prev - i.qty;
        await tx.product.update({ where: { id: i.productId }, data: { stock: next } });
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: i.productId,
            movementDate: date,
            reason: `SALE:${saleId}`,
            previousStock: prev,
            newStock: next,
            quantityChange: -i.qty,
          },
        });
        stock.set(i.productId, next);
      }
    });
  }

  // ── DAY 1 (today − 6) ──────────────────────────────────────────────────────
  const d1 = day(6);
  await cashSale("seed_sale_01", d1, [
    { productId: "seed_prod_01", qty: 1, price: 23 },
    { productId: "seed_prod_09", qty: 2, price: 18 },
    { productId: "seed_prod_23", qty: 3, price: 16 },
  ]);
  await cashSale("seed_sale_02", d1, [
    { productId: "seed_prod_17", qty: 2, price: 30 },
    { productId: "seed_prod_18", qty: 1, price: 38 },
    { productId: "seed_prod_39", qty: 1, price: 26 },
  ]);
  await cashSale("seed_sale_03", d1, [
    { productId: "seed_prod_10", qty: 3, price: 14 },
    { productId: "seed_prod_24", qty: 2, price: 22 },
  ]);
  await cashSale("seed_sale_04", d1, [
    { productId: "seed_prod_48", qty: 2, price: 16 },
    { productId: "seed_prod_50", qty: 1, price: 42 },
    { productId: "seed_prod_49", qty: 1, price: 34 },
  ]);
  await creditSale("seed_sale_05", "seed_debt_01", d1, "seed_cust_01", [
    { productId: "seed_prod_33", qty: 2, price: 88 },
    { productId: "seed_prod_41", qty: 1, price: 45 },
    { productId: "seed_prod_42", qty: 1, price: 46 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_01", tenantId, expenseDate: d1, category: "Servicios", description: "Pago de luz", amount: 350 },
  });
  await prisma.expense.create({
    data: { id: "seed_exp_02", tenantId, expenseDate: d1, category: "Insumos", description: "Bolsas de plástico", amount: 85 },
  });

  // ── DAY 2 (today − 5) ──────────────────────────────────────────────────────
  const d2 = day(5);
  await cashSale("seed_sale_06", d2, [
    { productId: "seed_prod_01", qty: 2, price: 23 },
    { productId: "seed_prod_03", qty: 1, price: 36 },
    { productId: "seed_prod_37", qty: 1, price: 40 },
  ]);
  await cashSale("seed_sale_07", d2, [
    { productId: "seed_prod_09", qty: 3, price: 18 },
    { productId: "seed_prod_10", qty: 2, price: 14 },
  ]);
  await cashSale("seed_sale_08", d2, [
    { productId: "seed_prod_45", qty: 1, price: 22 },
    { productId: "seed_prod_44", qty: 2, price: 26 },
    { productId: "seed_prod_47", qty: 1, price: 24 },
  ]);
  await creditSale("seed_sale_09", "seed_debt_02", d2, "seed_cust_02", [
    { productId: "seed_prod_28", qty: 1, price: 58 },
    { productId: "seed_prod_29", qty: 2, price: 14 },
    { productId: "seed_prod_30", qty: 1, price: 26 },
  ]);
  await creditSale("seed_sale_10", "seed_debt_03", d2, "seed_cust_03", [
    { productId: "seed_prod_17", qty: 2, price: 30 },
    { productId: "seed_prod_18", qty: 2, price: 38 },
    { productId: "seed_prod_21", qty: 2, price: 20 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_03", tenantId, expenseDate: d2, category: "Mantenimiento", description: "Reparación de refrigerador", amount: 450 },
  });
  // Stock adjustment: Azúcar 1→8 (physical count correction)
  {
    const prev = stock.get("seed_prod_43")!;
    const next = 8;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: "seed_prod_43" }, data: { stock: next } });
      await tx.inventoryMovement.create({
        data: {
          id: "seed_im_adj_01",
          tenantId,
          productId: "seed_prod_43",
          movementDate: d2,
          reason: "Conteo físico de inventario",
          previousStock: prev,
          newStock: next,
          quantityChange: next - prev,
        },
      });
    });
    stock.set("seed_prod_43", next);
  }

  // ── DAY 3 (today − 4) ──────────────────────────────────────────────────────
  const d3 = day(4);
  await cashSale("seed_sale_11", d3, [
    { productId: "seed_prod_01", qty: 1, price: 23 },
    { productId: "seed_prod_04", qty: 1, price: 72 },
    { productId: "seed_prod_39", qty: 2, price: 26 },
  ]);
  await cashSale("seed_sale_12", d3, [
    { productId: "seed_prod_23", qty: 4, price: 16 },
    { productId: "seed_prod_24", qty: 3, price: 22 },
    { productId: "seed_prod_25", qty: 2, price: 14 },
  ]);
  await cashSale("seed_sale_13", d3, [
    { productId: "seed_prod_11", qty: 2, price: 30 },
    { productId: "seed_prod_12", qty: 3, price: 12 },
  ]);
  await cashSale("seed_sale_14", d3, [
    { productId: "seed_prod_34", qty: 1, price: 115 },
    { productId: "seed_prod_35", qty: 1, price: 40 },
  ]);
  await cashSale("seed_sale_15", d3, [
    { productId: "seed_prod_42", qty: 1, price: 46 },
    { productId: "seed_prod_43", qty: 2, price: 28 },
    { productId: "seed_prod_40", qty: 2, price: 24 },
  ]);
  await creditSale("seed_sale_16", "seed_debt_04", d3, "seed_cust_04", [
    { productId: "seed_prod_33", qty: 3, price: 88 },
    { productId: "seed_prod_41", qty: 1, price: 45 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_04", tenantId, expenseDate: d3, category: "Servicios", description: "Pago de agua", amount: 120 },
  });
  await prisma.expense.create({
    data: { id: "seed_exp_05", tenantId, expenseDate: d3, category: "Insumos", description: "Etiquetas de precio", amount: 65 },
  });
  // Debt payment: seed_cust_01 pays 100 on seed_debt_01 (267 → 167 remaining)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_01", tenantId, debtId: "seed_debt_01", amount: 100, paymentDate: d3 },
    });
    await tx.debt.update({ where: { id: "seed_debt_01" }, data: { remainingAmount: 167 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d3, type: "IN", amount: 100, source: "DEBT_PAYMENT", referenceId: "seed_dpay_01" },
    });
  });

  // ── DAY 4 (today − 3) ──────────────────────────────────────────────────────
  const d4 = day(3);
  await cashSale("seed_sale_17", d4, [
    { productId: "seed_prod_01", qty: 3, price: 23 },
    { productId: "seed_prod_02", qty: 2, price: 25 },
  ]);
  await cashSale("seed_sale_18", d4, [
    { productId: "seed_prod_19", qty: 2, price: 26 },
    { productId: "seed_prod_20", qty: 1, price: 44 },
  ]);
  await cashSale("seed_sale_19", d4, [
    { productId: "seed_prod_46", qty: 3, price: 18 },
    { productId: "seed_prod_45", qty: 1, price: 22 },
    { productId: "seed_prod_44", qty: 1, price: 26 },
  ]);
  await creditSale("seed_sale_20", "seed_debt_05", d4, "seed_cust_05", [
    { productId: "seed_prod_24", qty: 5, price: 22 },
    { productId: "seed_prod_23", qty: 5, price: 16 },
    { productId: "seed_prod_25", qty: 3, price: 14 },
  ]);
  await creditSale("seed_sale_21", "seed_debt_06", d4, "seed_cust_06", [
    { productId: "seed_prod_09", qty: 5, price: 18 },
    { productId: "seed_prod_10", qty: 4, price: 14 },
  ]);
  await creditSale("seed_sale_22", "seed_debt_07", d4, "seed_cust_07", [
    { productId: "seed_prod_37", qty: 2, price: 40 },
    { productId: "seed_prod_39", qty: 3, price: 26 },
    { productId: "seed_prod_07", qty: 1, price: 30 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_06", tenantId, expenseDate: d4, category: "Servicios", description: "Internet del negocio", amount: 200 },
  });
  // Debt payment: seed_cust_02 pays 112 on seed_debt_02 (fully paid)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_02", tenantId, debtId: "seed_debt_02", amount: 112, paymentDate: d4 },
    });
    await tx.debt.update({ where: { id: "seed_debt_02" }, data: { remainingAmount: 0 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d4, type: "IN", amount: 112, source: "DEBT_PAYMENT", referenceId: "seed_dpay_02" },
    });
  });

  // ── DAY 5 (today − 2) ──────────────────────────────────────────────────────
  const d5 = day(2);
  await cashSale("seed_sale_23", d5, [
    { productId: "seed_prod_04", qty: 1, price: 72 },
    { productId: "seed_prod_37", qty: 1, price: 40 },
    { productId: "seed_prod_01", qty: 2, price: 23 },
  ]);
  await cashSale("seed_sale_24", d5, [
    { productId: "seed_prod_28", qty: 1, price: 58 },
    { productId: "seed_prod_29", qty: 2, price: 14 },
    { productId: "seed_prod_50", qty: 2, price: 42 },
  ]);
  await cashSale("seed_sale_25", d5, [
    { productId: "seed_prod_17", qty: 1, price: 30 },
    { productId: "seed_prod_18", qty: 1, price: 38 },
    { productId: "seed_prod_22", qty: 1, price: 28 },
  ]);
  await cashSale("seed_sale_26", d5, [
    { productId: "seed_prod_10", qty: 4, price: 14 },
    { productId: "seed_prod_11", qty: 2, price: 30 },
  ]);
  await creditSale("seed_sale_27", "seed_debt_08", d5, "seed_cust_08", [
    { productId: "seed_prod_33", qty: 2, price: 88 },
    { productId: "seed_prod_34", qty: 1, price: 115 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_07", tenantId, expenseDate: d5, category: "Proveedores", description: "Reabastecimiento de lácteos", amount: 800 },
  });
  await prisma.expense.create({
    data: { id: "seed_exp_08", tenantId, expenseDate: d5, category: "Servicios", description: "Gasolina para surtido", amount: 250 },
  });
  // Stock adjustment: Refresco Cola damaged in warehouse (50 → 47)
  {
    const prev = stock.get("seed_prod_09")!;
    const next = prev - 3;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: "seed_prod_09" }, data: { stock: next } });
      await tx.inventoryMovement.create({
        data: {
          id: "seed_im_adj_02",
          tenantId,
          productId: "seed_prod_09",
          movementDate: d5,
          reason: "Producto dañado en almacén",
          previousStock: prev,
          newStock: next,
          quantityChange: -3,
        },
      });
    });
    stock.set("seed_prod_09", next);
  }
  // Debt payment: seed_cust_01 pays remaining 167 on seed_debt_01 (fully paid)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_03", tenantId, debtId: "seed_debt_01", amount: 167, paymentDate: d5 },
    });
    await tx.debt.update({ where: { id: "seed_debt_01" }, data: { remainingAmount: 0 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d5, type: "IN", amount: 167, source: "DEBT_PAYMENT", referenceId: "seed_dpay_03" },
    });
  });
  // Debt payment: seed_cust_03 pays 100 on seed_debt_03 (176 → 76 remaining)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_04", tenantId, debtId: "seed_debt_03", amount: 100, paymentDate: d5 },
    });
    await tx.debt.update({ where: { id: "seed_debt_03" }, data: { remainingAmount: 76 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d5, type: "IN", amount: 100, source: "DEBT_PAYMENT", referenceId: "seed_dpay_04" },
    });
  });

  // ── DAY 6 (today − 1) ──────────────────────────────────────────────────────
  const d6 = day(1);
  await cashSale("seed_sale_28", d6, [
    { productId: "seed_prod_01", qty: 2, price: 23 },
    { productId: "seed_prod_03", qty: 1, price: 36 },
    { productId: "seed_prod_04", qty: 1, price: 72 },
  ]);
  await cashSale("seed_sale_29", d6, [
    { productId: "seed_prod_23", qty: 5, price: 16 },
    { productId: "seed_prod_24", qty: 3, price: 22 },
    { productId: "seed_prod_26", qty: 2, price: 18 },
  ]);
  await cashSale("seed_sale_30", d6, [
    { productId: "seed_prod_09", qty: 4, price: 18 },
    { productId: "seed_prod_12", qty: 5, price: 12 },
  ]);
  await cashSale("seed_sale_31", d6, [
    { productId: "seed_prod_39", qty: 2, price: 26 },
    { productId: "seed_prod_37", qty: 1, price: 40 },
    { productId: "seed_prod_42", qty: 1, price: 46 },
  ]);
  await cashSale("seed_sale_32", d6, [
    { productId: "seed_prod_48", qty: 3, price: 16 },
    { productId: "seed_prod_50", qty: 2, price: 42 },
  ]);
  await cashSale("seed_sale_33", d6, [
    { productId: "seed_prod_45", qty: 2, price: 22 },
    { productId: "seed_prod_44", qty: 2, price: 26 },
    { productId: "seed_prod_46", qty: 2, price: 18 },
    { productId: "seed_prod_47", qty: 2, price: 24 },
  ]);
  await creditSale("seed_sale_34", "seed_debt_09", d6, "seed_cust_09", [
    { productId: "seed_prod_17", qty: 3, price: 30 },
    { productId: "seed_prod_18", qty: 2, price: 38 },
    { productId: "seed_prod_21", qty: 3, price: 20 },
  ]);
  await creditSale("seed_sale_35", "seed_debt_10", d6, "seed_cust_10", [
    { productId: "seed_prod_28", qty: 2, price: 58 },
    { productId: "seed_prod_30", qty: 2, price: 26 },
    { productId: "seed_prod_29", qty: 3, price: 14 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_09", tenantId, expenseDate: d6, category: "Insumos", description: "Rollos de recibo", amount: 120 },
  });
  // Debt payment: seed_cust_04 pays 150 on seed_debt_04 (309 → 159 remaining)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_05", tenantId, debtId: "seed_debt_04", amount: 150, paymentDate: d6 },
    });
    await tx.debt.update({ where: { id: "seed_debt_04" }, data: { remainingAmount: 159 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d6, type: "IN", amount: 150, source: "DEBT_PAYMENT", referenceId: "seed_dpay_05" },
    });
  });

  // ── DAY 7 (today) ──────────────────────────────────────────────────────────
  const d7 = day(0);
  await cashSale("seed_sale_36", d7, [
    { productId: "seed_prod_01", qty: 3, price: 23 },
    { productId: "seed_prod_02", qty: 1, price: 25 },
    { productId: "seed_prod_03", qty: 1, price: 36 },
  ]);
  await cashSale("seed_sale_37", d7, [
    { productId: "seed_prod_23", qty: 3, price: 16 },
    { productId: "seed_prod_24", qty: 4, price: 22 },
    { productId: "seed_prod_25", qty: 2, price: 14 },
  ]);
  await cashSale("seed_sale_38", d7, [
    { productId: "seed_prod_10", qty: 5, price: 14 },
    { productId: "seed_prod_09", qty: 3, price: 18 },
  ]);
  await creditSale("seed_sale_39", "seed_debt_11", d7, "seed_cust_11", [
    { productId: "seed_prod_33", qty: 2, price: 88 },
    { productId: "seed_prod_42", qty: 1, price: 46 },
    { productId: "seed_prod_41", qty: 1, price: 45 },
  ]);
  await prisma.expense.create({
    data: { id: "seed_exp_10", tenantId, expenseDate: d7, category: "Servicios", description: "Pago de renta", amount: 3500 },
  });
  // Debt payment: seed_cust_03 pays remaining 76 on seed_debt_03 (fully paid)
  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: { id: "seed_dpay_06", tenantId, debtId: "seed_debt_03", amount: 76, paymentDate: d7 },
    });
    await tx.debt.update({ where: { id: "seed_debt_03" }, data: { remainingAmount: 0 } });
    await tx.cashMovement.create({
      data: { tenantId, movementDate: d7, type: "IN", amount: 76, source: "DEBT_PAYMENT", referenceId: "seed_dpay_06" },
    });
  });

  console.log("7 days of operations seeded.");
}

async function main() {
  console.log("Seeding demo tenant and user...");
  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: { id: DEMO_TENANT_ID, businessName: "Comercio Demo", email: DEMO_TENANT_EMAIL },
  });
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: DEMO_TENANT_EMAIL },
    update: {},
    create: {
      email: DEMO_TENANT_EMAIL,
      password: hashedPassword,
      name: "Comercio Demo",
      role: "OWNER",
      tenantId: tenant.id,
    },
  });
  console.log(`Demo tenant ready (email: ${DEMO_TENANT_EMAIL}, password: demo1234)`);

  const tenantId = tenant.id;

  console.log("Seeding products...");
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { categoryName: product.categoryName },
      create: {
        id: product.id,
        tenantId,
        name: product.name,
        categoryName: product.categoryName,
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        stock: product.stock,
      },
    });
  }
  console.log(`${products.length} products ready.`);

  console.log("Seeding customers...");
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: {},
      create: { id: customer.id, tenantId, name: customer.name },
    });
  }
  console.log(`${customers.length} customers ready.`);

  console.log("Seeding operations...");
  const stock = new Map<string, number>(products.map((p) => [p.id, p.stock]));
  await seedOperations(stock, tenantId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
