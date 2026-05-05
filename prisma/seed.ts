import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ProductSeed = {
  id: string;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

type CustomerSeed = {
  id: string;
  name: string;
};

const products: ProductSeed[] = [
  // Lácteos
  { id: "seed_prod_01", name: "Leche entera 1L",           costPrice: 18, salePrice: 23, stock: 45 },
  { id: "seed_prod_02", name: "Leche descremada 1L",        costPrice: 19, salePrice: 25, stock: 28 },
  { id: "seed_prod_03", name: "Yogur natural 1kg",          costPrice: 28, salePrice: 36, stock: 20 },
  { id: "seed_prod_04", name: "Queso Oaxaca 400g",          costPrice: 55, salePrice: 72, stock: 14 },
  { id: "seed_prod_05", name: "Queso Manchego 400g",        costPrice: 62, salePrice: 80, stock:  4 },
  { id: "seed_prod_06", name: "Crema ácida 250ml",          costPrice: 18, salePrice: 24, stock:  0 },
  { id: "seed_prod_07", name: "Mantequilla 90g",            costPrice: 22, salePrice: 30, stock:  3 },
  { id: "seed_prod_08", name: "Jocoque 1kg",                costPrice: 25, salePrice: 34, stock:  0 },
  // Bebidas
  { id: "seed_prod_09", name: "Refresco Cola 600ml",        costPrice: 12, salePrice: 18, stock: 60 },
  { id: "seed_prod_10", name: "Agua purificada 1.5L",       costPrice:  8, salePrice: 14, stock: 75 },
  { id: "seed_prod_11", name: "Jugo de naranja 1L",         costPrice: 22, salePrice: 30, stock: 22 },
  { id: "seed_prod_12", name: "Agua mineral 500ml",         costPrice:  7, salePrice: 12, stock: 48 },
  { id: "seed_prod_13", name: "Refresco sabor limón 600ml", costPrice: 11, salePrice: 17, stock: 36 },
  { id: "seed_prod_14", name: "Bebida energética 250ml",    costPrice: 20, salePrice: 30, stock:  2 },
  { id: "seed_prod_15", name: "Néctar de mango 1L",         costPrice: 18, salePrice: 26, stock:  0 },
  { id: "seed_prod_16", name: "Té frío limón 500ml",        costPrice: 10, salePrice: 16, stock:  0 },
  // Granos y cereales
  { id: "seed_prod_17", name: "Arroz blanco 1kg",           costPrice: 22, salePrice: 30, stock: 55 },
  { id: "seed_prod_18", name: "Frijol negro 1kg",           costPrice: 28, salePrice: 38, stock: 40 },
  { id: "seed_prod_19", name: "Avena entera 500g",          costPrice: 18, salePrice: 26, stock: 32 },
  { id: "seed_prod_20", name: "Cereal de trigo 500g",       costPrice: 32, salePrice: 44, stock: 18 },
  { id: "seed_prod_21", name: "Pasta espagueti 500g",       costPrice: 14, salePrice: 20, stock: 42 },
  { id: "seed_prod_22", name: "Lenteja 500g",               costPrice: 20, salePrice: 28, stock:  5 },
  // Snacks
  { id: "seed_prod_23", name: "Papas fritas 45g",           costPrice: 10, salePrice: 16, stock: 90 },
  { id: "seed_prod_24", name: "Galletas de chocolate 100g", costPrice: 15, salePrice: 22, stock: 58 },
  { id: "seed_prod_25", name: "Palomitas de maíz 100g",     costPrice:  8, salePrice: 14, stock: 45 },
  { id: "seed_prod_26", name: "Cacahuates con chile 100g",  costPrice: 12, salePrice: 18, stock:  5 },
  { id: "seed_prod_27", name: "Chicharrones 30g",           costPrice:  6, salePrice: 10, stock:  0 },
  // Limpieza
  { id: "seed_prod_28", name: "Detergente en polvo 1kg",    costPrice: 42, salePrice: 58, stock: 25 },
  { id: "seed_prod_29", name: "Jabón de lavandería",        costPrice:  8, salePrice: 14, stock: 35 },
  { id: "seed_prod_30", name: "Cloro 1L",                   costPrice: 18, salePrice: 26, stock: 18 },
  { id: "seed_prod_31", name: "Escoba plástica",            costPrice: 55, salePrice: 80, stock:  3 },
  { id: "seed_prod_32", name: "Trapeador de algodón",       costPrice: 65, salePrice: 95, stock:  0 },
  // Carnes
  { id: "seed_prod_33", name: "Pechuga de pollo 1kg",       costPrice: 65, salePrice: 88, stock: 12 },
  { id: "seed_prod_34", name: "Carne molida de res 1kg",    costPrice: 88, salePrice: 115, stock: 4 },
  { id: "seed_prod_35", name: "Jamón de pavo 200g",         costPrice: 28, salePrice: 40, stock:  1 },
  { id: "seed_prod_36", name: "Salchicha de puerco 250g",   costPrice: 22, salePrice: 34, stock:  0 },
  // Panadería
  { id: "seed_prod_37", name: "Pan de caja blanco",         costPrice: 28, salePrice: 40, stock: 16 },
  { id: "seed_prod_38", name: "Pan dulce surtido 6 piezas", costPrice: 20, salePrice: 32, stock:  0 },
  { id: "seed_prod_39", name: "Tortilla de maíz 1kg",       costPrice: 18, salePrice: 26, stock: 28 },
  // Condimentos
  { id: "seed_prod_40", name: "Salsa roja picante 120ml",   costPrice: 16, salePrice: 24, stock: 38 },
  { id: "seed_prod_41", name: "Mayonesa 400g",              costPrice: 32, salePrice: 45, stock: 22 },
  { id: "seed_prod_42", name: "Aceite vegetal 1L",          costPrice: 32, salePrice: 46, stock: 20 },
  { id: "seed_prod_43", name: "Azúcar estándar 1kg",        costPrice: 20, salePrice: 28, stock:  1 },
  // Frutas y verduras
  { id: "seed_prod_44", name: "Jitomate por kg",            costPrice: 18, salePrice: 26, stock: 15 },
  { id: "seed_prod_45", name: "Cebolla blanca por kg",      costPrice: 14, salePrice: 22, stock: 20 },
  { id: "seed_prod_46", name: "Plátano por kg",             costPrice: 12, salePrice: 18, stock: 18 },
  { id: "seed_prod_47", name: "Limón por kg",               costPrice: 16, salePrice: 24, stock: 25 },
  // Higiene
  { id: "seed_prod_48", name: "Jabón de baño 100g",         costPrice: 10, salePrice: 16, stock: 35 },
  { id: "seed_prod_49", name: "Pasta dental 100ml",         costPrice: 22, salePrice: 34, stock:  2 },
  { id: "seed_prod_50", name: "Papel higiénico 4 rollos",   costPrice: 28, salePrice: 42, stock: 28 },
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

async function main() {
  console.log("Seeding products...");
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        name: product.name,
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
      create: {
        id: customer.id,
        name: customer.name,
      },
    });
  }
  console.log(`${customers.length} customers ready.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
