import { Beer, Sandwich, UtensilsCrossed, Candy, Banknote, QrCode, CreditCard } from "lucide-react";

export const LOW_STOCK = 5;

export const CATS = [
  { key: "cerveja", label: "Cervejas", icon: Beer },
  { key: "salgado", label: "Salgados", icon: Sandwich },
  { key: "porcao", label: "Porções", icon: UtensilsCrossed },
  { key: "doce", label: "Doces", icon: Candy },
  { key: "refrigetante",  label: "Refrigerantes", icon: CupSoda },
];
export const catLabel = (k) => (CATS.find((c) => c.key === k) || {}).label || k;

// Formas de pagamento — ficha NÃO é forma de pagamento (ver "Trocar ficha" em Vender).
export const PAYS = [
  { key: "dinheiro", label: "Dinheiro", icon: Banknote },
  { key: "pix", label: "Pix", icon: QrCode },
  { key: "cartao", label: "Cartão", icon: CreditCard },
];
export const payLabel = (k) => (PAYS.find((p) => p.key === k) || {}).label || k;

// Tipos de despesa do menu Balanço.
export const EXPENSE_CATS = [
  { key: "aluguel", label: "Aluguel" },
  { key: "agua", label: "Água" },
  { key: "energia", label: "Energia" },
  { key: "internet", label: "Internet" },
  { key: "mercado", label: "Mercado" },
  { key: "cache", label: "Cachê / Show" },
  { key: "outros", label: "Outros" },
];
export const expenseLabel = (k) => (EXPENSE_CATS.find((c) => c.key === k) || {}).label || k;

// Produtos de exemplo criados na primeira execução (podem ser editados/removidos).
export const SEED_PRODUCTS = [
  { name: "Skol Lata 350ml", category: "cerveja", price: 6, cost: 3.5, stock: 48 },
  { name: "Brahma Lata 350ml", category: "cerveja", price: 6.5, cost: 3.8, stock: 36 },
  { name: "Heineken Long Neck", category: "cerveja", price: 10, cost: 6, stock: 24 },
  { name: "Original 600ml", category: "cerveja", price: 14, cost: 8.5, stock: 12 },
  { name: "Coxinha", category: "salgado", price: 8, cost: 3, stock: 20 },
  { name: "Pastel de Carne", category: "salgado", price: 9, cost: 3.5, stock: 15 },
  { name: "Batata Frita", category: "porcao", price: 25, cost: 9, stock: 30 },
  { name: "Calabresa Acebolada", category: "porcao", price: 30, cost: 12, stock: 25 },
  { name: "Pudim (fatia)", category: "doce", price: 8, cost: 2.5, stock: 12 },
  { name: "Brigadeiro", category: "doce", price: 3.5, cost: 1, stock: 40 },
];