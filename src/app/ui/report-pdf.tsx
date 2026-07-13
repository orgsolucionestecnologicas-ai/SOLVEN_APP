"use client";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" },
  header: { backgroundColor: "#7c3aed", padding: 20, marginBottom: 24, borderRadius: 4 },
  headerTitle: { color: "white", fontSize: 18, fontFamily: "Helvetica-Bold" },
  headerSub: { color: "#e9d5ff", fontSize: 10, marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: "6 6", borderRadius: 2, marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "5 6", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  cell: { flex: 1, paddingRight: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, color: "#94a3b8", fontSize: 8, textAlign: "center" },
});

export function ReportPDFDocument({
  businessName,
  reportTitle,
  rangeLabel,
  headers,
  rows,
}: {
  businessName: string;
  reportTitle: string;
  rangeLabel: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSub}>{reportTitle} — {rangeLabel}</Text>
        </View>

        <View style={styles.tableHeader}>
          {headers.map((h) => (
            <Text key={h} style={[styles.cell, styles.bold]}>{h}</Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            {row.map((cell, j) => (
              <Text key={j} style={styles.cell}>{cell}</Text>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text>Generado por SOLVEN — {businessName}</Text>
        </View>
      </Page>
    </Document>
  );
}
