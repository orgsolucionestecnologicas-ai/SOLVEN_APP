export {
  createProduct,
  getProductById,
  importProducts,
  listProducts,
  updateProduct,
  type ImportProductRow,
  type ImportProductsResult
} from "./product-data-access";
export {
  IVA_RATES,
  PRODUCT_CATEGORIES,
  ProductValidationError,
  type CreateProductInput,
  type IvaRate,
  type ProductCategory,
  type UpdateProductInput,
  type ValidatedProductInput,
  validateCreateProductInput,
  validateUpdateProductInput
} from "./product-validation";
