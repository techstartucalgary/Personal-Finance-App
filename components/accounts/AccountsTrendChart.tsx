import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

type AccountLike = {
  id: string | number;
  account_name?: string | null;
  account_type?: string | null;
  balance?: number | null;
};

type TransactionLike = {
  account_id?: number | null;
  amount?: number | null;
  transaction_date?: string | null;
  created_at?: string | null;
};

type TrendSeries = {
  id: string | number;
  label: string;
  color: string;
  values: number[];
};

type AccountsTrendChartProps = {
  accounts: AccountLike[];
  transactions: TransactionLike[];
  months?: number;
  height?: number;
  textColor: string;
  mutedTextColor: string;
  gridColor: string;
};

const CREDIT_PALETTE = ["#D86666", "#E07A7A", "#C95454", "#E39191"];
const DEBIT_PALETTE = ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"];

const normalizeId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? String(value) : asNumber;
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const local = new Date(y, m - 1, d);
      if (!Number.isNaN(local.getTime())) return local;
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);

const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
};

const withAlpha = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const getAccountColor = (account: AccountLike, index: number) => {
  const type = (account.account_type ?? "").toLowerCase();
  const palette = type === "debit" ? DEBIT_PALETTE : CREDIT_PALETTE;
  return palette[index % palette.length];
};

export function AccountsTrendChart({
  accounts,
  transactions,
  months = 4,
  height = 220,
  textColor,
  mutedTextColor,
  gridColor,
}: AccountsTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

  const monthBuckets = useMemo(() => {
    const now = new Date();
    return Array.from({ length: months }, (_, idx) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1 - idx),
        1,
      );
      const year = date.getFullYear();
      const month = date.getMonth();
      return {
        key: `${year}-${month + 1}`,
        label: date.toLocaleString("en-CA", { month: "short" }),
        year,
        month,
      };
    });
  }, [months]);

  const series = useMemo<TrendSeries[]>(() => {
    if (accounts.length === 0) return [];

    const bucketIndex = new Map(
      monthBuckets.map((bucket, idx) => [bucket.key, idx]),
    );
    const totalsByAccount = new Map<string | number, number[]>();

    accounts.forEach((account) => {
      const id = normalizeId(account.id);
      if (id === null) return;
      totalsByAccount.set(id, new Array(months).fill(0));
    });

    transactions.forEach((transaction) => {
      const accountId = normalizeId(transaction.account_id ?? null);
      if (accountId === null) return;
      const date = parseDate(transaction.transaction_date) ??
        parseDate(transaction.created_at);
      if (!date) return;
      const bucketKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const idx = bucketIndex.get(bucketKey);
      if (idx === undefined) return;
      const amount = Math.abs(transaction.amount ?? 0);
      const totals = totalsByAccount.get(accountId);
      if (!totals) return;
      totals[idx] += amount;
    });

    return accounts
      .map((account, idx) => {
        const id = normalizeId(account.id);
        const totals = id !== null ? totalsByAccount.get(id) : undefined;
        const monthly = totals ?? new Array(months).fill(0);
        const endBalance = account.balance ?? 0;
        let running = endBalance;
        const values = new Array(months).fill(0);
        for (let i = months - 1; i >= 0; i -= 1) {
          values[i] = running;
          running += monthly[i];
        }
        return {
          id: id ?? idx,
          label: account.account_name ?? `Account ${idx + 1}`,
          color: getAccountColor(account, idx),
          values,
        };
      })
      .filter((item) => item.values.some((value) => value > 0));
  }, [accounts, transactions, monthBuckets, months]);

  const maxValue = useMemo(() => {
    if (series.length === 0) return 1;
    const rawMax = Math.max(0, ...series.flatMap((item) => item.values));
    return rawMax <= 0 ? 1 : niceMax(rawMax);
  }, [series]);

  const ticks = useMemo(() => {
    const rawMax =
      series.length === 0
        ? 0
        : Math.max(0, ...series.flatMap((item) => item.values));
    if (rawMax <= 0 || Number.isNaN(maxValue)) {
      return [0, 0, 0, 0];
    }
    const step = maxValue / 3;
    return [maxValue, maxValue - step, maxValue - step * 2, 0];
  }, [maxValue, series]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, event.nativeEvent.layout.width);
    if (nextWidth !== chartWidth) setChartWidth(nextWidth);
  };

  const paddingY = 8;
  const innerHeight = Math.max(0, height - paddingY * 2);
  const xStep = months > 1 ? chartWidth / (months - 1) : 0;
  const valueToY = (value: number) => {
    if (maxValue <= 0) return paddingY + innerHeight;
    const clamped = Math.max(0, value);
    return paddingY + (1 - clamped / maxValue) * innerHeight;
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartRow, { height }]}>
        <View style={[styles.yAxis, { paddingVertical: paddingY }]}>
          {ticks.map((tick, index) => (
            <ThemedText
              key={`tick-${index}`}
              style={[styles.yLabel, { color: mutedTextColor }]}
            >
              {formatCompact(tick)}
            </ThemedText>
          ))}
        </View>

        <View style={[styles.chartArea, { height }]} onLayout={handleLayout}>
          {chartWidth > 0 &&
            ticks.map((_, idx) => (
              <View
                key={`grid-${idx}`}
                style={[
                  styles.gridLine,
                  {
                    borderColor: gridColor,
                    top: paddingY + (innerHeight * idx) / (ticks.length - 1),
                  },
                ]}
              />
            ))}

          {chartWidth > 0 &&
            series.map((item) => {
              const points = item.values.map((value, idx) => ({
                x: idx * xStep,
                y: valueToY(value),
              }));
              return (
                <View
                  key={`series-${item.id}`}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                >
                  {points.slice(1).map((point, idx) => {
                    const prev = points[idx];
                    const dx = point.x - prev.x;
                    const dy = point.y - prev.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    const midX = (prev.x + point.x) / 2;
                    const midY = (prev.y + point.y) / 2;
                    return (
                      <View key={`glow-${idx}`}>
                        <View
                          style={[
                            styles.lineSegment,
                            {
                              left: midX - length / 2,
                              top: midY,
                              width: length,
                              height: 6,
                              backgroundColor: withAlpha(item.color, 0.18),
                              transform: [
                                { translateY: -3 },
                                { rotateZ: `${angle}deg` },
                              ],
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.lineSegment,
                            {
                              left: midX - length / 2,
                              top: midY,
                              width: length,
                              height: 3,
                              backgroundColor: item.color,
                              transform: [
                                { translateY: -1.5 },
                                { rotateZ: `${angle}deg` },
                              ],
                            },
                          ]}
                        />
                      </View>
                    );
                  })}

                  {points.map((point, idx) => (
                    <View
                      key={`dot-${idx}`}
                      style={[
                        styles.dot,
                        {
                          left: point.x - 3.5,
                          top: point.y - 3.5,
                          borderColor: item.color,
                          backgroundColor: withAlpha(item.color, 0.15),
                        },
                      ]}
                    />
                  ))}
                </View>
              );
            })}
        </View>
      </View>

      <View style={styles.monthRow}>
        {monthBuckets.map((bucket, idx) => (
          <ThemedText
            key={bucket.key}
            style={[
              styles.monthLabel,
              { color: idx === monthBuckets.length - 1 ? textColor : mutedTextColor },
            ]}
          >
            {bucket.label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxis: {
    width: 36,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  yLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  chartArea: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  lineSegment: {
    position: "absolute",
    borderRadius: 999,
  },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
  monthRow: {
    marginTop: 6,
    paddingHorizontal: 42,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
