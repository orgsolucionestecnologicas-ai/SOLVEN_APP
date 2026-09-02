"use client";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 56, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" },
  header: { backgroundColor: "#7c3aed", padding: 20, marginBottom: 12, borderRadius: 4 },
  headerTitle: { color: "white", fontSize: 18, fontFamily: "Helvetica-Bold" },
  headerSub: { color: "#e9d5ff", fontSize: 10, marginTop: 4 },
  generatedAt: { fontSize: 8, color: "#94a3b8", textAlign: "right", marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: "6 6", borderRadius: 2, marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "5 6", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  totalsRow: { flexDirection: "row", padding: "6 6", marginTop: 2, borderTopWidth: 1, borderTopColor: "#cbd5e1" },
  cellLeft: { paddingRight: 4, textAlign: "left" },
  cellRight: { paddingRight: 4, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    color: "#94a3b8",
    fontSize: 8,
  },
});

export type ReportPDFColumn = {
  align?: "left" | "right";
  width?: number;
};

export function ReportPDFDocument({
  businessName,
  reportTitle,
  rangeLabel,
  headers,
  rows,
  columns,
  totalsRow,
}: {
  businessName: string;
  reportTitle: string;
  rangeLabel: string;
  headers: string[];
  rows: string[][];
  columns?: ReportPDFColumn[];
  totalsRow?: (string | null)[];
}) {
  const widths = headers.map((_, i) => columns?.[i]?.width ?? 1);
  const generatedAt = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSub}>{reportTitle} — {rangeLabel}</Text>
        </View>
        <Text style={styles.generatedAt}>Generado el {generatedAt}</Text>

        <View style={styles.tableHeader}>
          {headers.map((h, i) => (
            <Text
              key={h}
              style={[columns?.[i]?.align === "right" ? styles.cellRight : styles.cellLeft, styles.bold, { flex: widths[i] }]}
            >
              {h}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            {row.map((cell, j) => (
              <Text
                key={j}
                style={[columns?.[j]?.align === "right" ? styles.cellRight : styles.cellLeft, { flex: widths[j] }]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
        {totalsRow ? (
          <View style={styles.totalsRow}>
            {totalsRow.map((cell, j) => (
              <Text
                key={j}
                style={[columns?.[j]?.align === "right" ? styles.cellRight : styles.cellLeft, styles.bold, { flex: widths[j] }]}
              >
                {cell ?? ""}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Generado por SOLVEN — {businessName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
