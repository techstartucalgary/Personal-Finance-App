import React, { useMemo } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

export type IncomeExpenseChartProps = {
    expenses: { amount: number | null; transaction_date?: string | null }[];
    plaidTransactions: { amount: number; date: string }[];
};

export default function IncomeExpenseChart({
    expenses,
    plaidTransactions,
}: IncomeExpenseChartProps) {
    const isDark = useColorScheme() === 'dark';
    const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const incomeColor = isDark ? '#8CF2D1' : '#1F6F5B';
    const expenseColor = isDark ? '#ff6b6b' : '#e03131';

    const chartData = useMemo(() => {
        // We want the last 5 months to match the typical view
        const monthMap = new Map<string, { income: number; expense: number; label: string }>();

        const now = new Date();
        // Initialize last 5 months
        for (let i = 4; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            monthMap.set(key, {
                income: 0,
                expense: 0,
                label: d.toLocaleString('en-US', { month: 'short' })
            });
        }

        const startMonthD = new Date(now.getFullYear(), now.getMonth() - 4, 1);

        // Process expenses (all treated as expense)
        expenses.forEach((ex) => {
            if (!ex.transaction_date || !ex.amount) return;
            const d = new Date(ex.transaction_date);
            // Use local month mapping to avoid timezone issues
            const userTimezoneOffset = d.getTimezoneOffset() * 60000;
            const localD = new Date(d.getTime() + userTimezoneOffset);

            if (localD < startMonthD) return;
            const key = `${localD.getFullYear()}-${localD.getMonth()}`;
            if (monthMap.has(key)) {
                monthMap.get(key)!.expense += ex.amount;
            }
        });

        // Process Plaid transactions
        plaidTransactions.forEach((tx) => {
            if (!tx.date) return;
            // tx.date is usually YYYY-MM-DD which is parsed differently depending on TZ, let's treat it as local
            const d = new Date(tx.date + 'T12:00:00');
            if (d < startMonthD) return;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (monthMap.has(key)) {
                if (tx.amount < 0) {
                    // Negative is income
                    monthMap.get(key)!.income += Math.abs(tx.amount);
                } else {
                    // Positive is expense
                    monthMap.get(key)!.expense += tx.amount;
                }
            }
        });

        const data: any[] = [];

        Array.from(monthMap.values()).forEach((monthData, index) => {
            // Income bar
            data.push({
                value: monthData.income,
                label: monthData.label,
                spacing: 2,
                labelWidth: 40,
                labelTextStyle: { color: labelColor, fontSize: 12, textAlign: 'center' },
                frontColor: incomeColor,
            });
            // Expense bar
            data.push({
                value: monthData.expense,
                frontColor: expenseColor,
                spacing: index === 4 ? 0 : 20, // space to next group
            });
        });

        return data;

    }, [expenses, plaidTransactions, incomeColor, expenseColor, labelColor]);

    if (chartData.length === 0) return null;

    const maxValue = Math.max(...chartData.map((d: any) => d.value));

    return (
        <View style={styles.container}>
            <BarChart
                data={chartData}
                barWidth={10}
                spacing={20}
                initialSpacing={10}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: labelColor, fontSize: 12 }}
                noOfSections={4}
                maxValue={Math.max(maxValue, 1000) * 1.1} // leave 10% headroom
                formatYLabel={(label: string) => {
                    const val = Number(label);
                    if (val === 0) return '0';
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val.toString();
                }}
                barBorderRadius={4}
                height={200}
                yAxisLabelWidth={30}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -20,
    }
});
