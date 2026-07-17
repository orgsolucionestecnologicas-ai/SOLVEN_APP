"use client";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ReturnReasonCategory } from "@prisma/client";
import type { ReturnDetailRecord } from "@/modules/returns";

const REASON_LABELS: Record<ReturnReasonCategory, string> = {
  DEFECTO: "Producto defectuoso",
  ERROR_VENTA: "Error en la venta",
  CAMBIO_OPINION: "Cambio de opinión del cliente",
  OTRO: "Otro"
};

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

export function ReturnCreditNotePDFDocument({
  returnRecord,
  businessName,
}: {
  returnRecord: ReturnDetailRecord;
  businessName: string;
}) {
  const createdAt = new Date(returnRecord.createdAt).toLocaleDateString("es-AR");
  const saleDate = new Date(returnRecord.sale.saleDate).toLocaleDateString("es-AR");
  const total = Number(returnRecord.totalAmount);
  const reasonLabel = REASON_LABELS[returnRecord.reasonCategory] ?? returnRecord.reasonCategory;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSub}>Nota de crédito N° {returnRecord.id.slice(-8).toUpperCase()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la devolución</Text>
          <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text style={styles.value}>{createdAt}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Venta de origen:</Text><Text style={styles.value}>#{returnRecord.sale.id.slice(-8).toUpperCase()} ({saleDate})</Text></View>
          {returnRecord.sale.customerName ? (
            <View style={styles.row}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{returnRecord.sale.customerName}</Text></View>
          ) : null}
          <View style={styles.row}><Text style={styles.label}>Motivo:</Text><Text style={styles.value}>{reasonLabel}</Text></View>
          {returnRecord.reasonNote ? (
            <View style={styles.row}><Text style={styles.label}>Nota:</Text><Text style={styles.value}>{returnRecord.reasonNote}</Text></View>
          ) : null}
          {returnRecord.refundMethod ? (
            <View style={styles.row}><Text style={styles.label}>Reintegro:</Text><Text style={styles.value}>{returnRecord.refundMethod}</Text></View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos devueltos</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.bold]}>Producto</Text>
            <Text style={[styles.colQty, styles.bold]}>Cant.</Text>
            <Text style={[styles.colPrice, styles.bold]}>Precio unit.</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {returnRecord.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>{item.productName}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatARS(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatARS(item.total)}</Text>
            </View>
          ))}
        </View>

        <View>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.bold]}>TOTAL DEVUELTO:</Text>
            <Text style={[styles.totalsValue, styles.bold]}>{formatARS(total)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generado por SOLVEN — {businessName}</Text>
        </View>
      </Page>
    </Document>
  );
}
