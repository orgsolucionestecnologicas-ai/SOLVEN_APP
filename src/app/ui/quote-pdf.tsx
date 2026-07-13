"use client";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Customer, Quote, QuoteItem } from "@prisma/client";

type QuoteWithItems = Quote & { items: QuoteItem[]; customer?: Customer | null };

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1e293b" },
  header: { backgroundColor: "#7c3aed", padding: 20, marginBottom: 24, borderRadius: 4 },
  headerTitle: { color: "white", fontSize: 20, fontFamily: "Helvetica-Bold" },
  headerSub: { color: "#e9d5ff", fontSize: 10, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#7c3aed", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: "#64748b" },
  value: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: "6 8", borderRadius: 2, marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "5 8", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalsLabel: { width: 120, textAlign: "right", color: "#64748b", marginRight: 8 },
  totalsValue: { width: 80, textAlign: "right" },
  footer: { marginTop: 32, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, color: "#94a3b8", fontSize: 9, textAlign: "center" },
});

function formatARS(n: number | string | { toString(): string }) {
  return `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotePDFDocument({
  quote,
  businessName,
}: {
  quote: QuoteWithItems;
  businessName: string;
}) {
  const subtotal = Number(quote.totalAmount) + Number(quote.discountAmount);
  const discount = Number(quote.discountAmount);
  const total = Number(quote.totalAmount);
  const validUntil = new Date(quote.validUntil).toLocaleDateString("es-AR");
  const createdAt = new Date(quote.createdAt).toLocaleDateString("es-AR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSub}>Cotización N° {quote.quoteNumber}</Text>
        </View>

        {/* Info cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del cliente</Text>
          <View style={styles.row}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{quote.customerName || "—"}</Text></View>
          {quote.customerEmail ? <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{quote.customerEmail}</Text></View> : null}
          {quote.customerPhone ? <View style={styles.row}><Text style={styles.label}>Teléfono:</Text><Text style={styles.value}>{quote.customerPhone}</Text></View> : null}
          {quote.customer?.address ? <View style={styles.row}><Text style={styles.label}>Dirección:</Text><Text style={styles.value}>{quote.customer.address}</Text></View> : null}
        </View>

        {/* Info cotización */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la cotización</Text>
          <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text style={styles.value}>{createdAt}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Válida hasta:</Text><Text style={styles.value}>{validUntil}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Estado:</Text><Text style={styles.value}>{quote.status}</Text></View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.bold]}>Producto / Servicio</Text>
            <Text style={[styles.colQty, styles.bold]}>Cant.</Text>
            <Text style={[styles.colPrice, styles.bold]}>Precio unit.</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {quote.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatARS(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatARS(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View>
          {discount > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal:</Text>
                <Text style={styles.totalsValue}>{formatARS(subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descuento:</Text>
                <Text style={styles.totalsValue}>- {formatARS(discount)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.bold]}>TOTAL:</Text>
            <Text style={[styles.totalsValue, styles.bold]}>{formatARS(total)}</Text>
          </View>
        </View>

        {/* Notas */}
        {quote.notes ? (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>Generado por SOLVEN — {businessName}</Text>
        </View>
      </Page>
    </Document>
  );
}
