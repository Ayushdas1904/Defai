"use client";   
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ChartProps = {
  title: string;
  labels: string[];
  values?: number[];
  series?: Array<{
    name: string;
    data: number[];
    color?: string;
  }>;
  type?: "line" | "bar";
};

export default function Chart({ title, labels, values, series, type = "line" }: ChartProps) {
  // Note: type parameter is for future bar chart support
  const chartType = type; // Suppress unused variable warning
  // Handle single series (legacy format)
  const data = values ? labels.map((label, i) => ({
    name: label,
    value: values[i],
  })) : 
  // Handle multiple series (comparison format)
  series ? labels.map((label, i) => {
    const dataPoint: any = { name: label };
    series.forEach(s => {
      dataPoint[s.name] = s.data[i];
    });
    return dataPoint;
  }) : [];

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-4 mt-4 border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "0.5rem",
              color: "#f9fafb",
            }}
          />
          {values ? (
            // Single series (legacy format)
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ) : (
            // Multiple series (comparison format)
            series?.map((s, index) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color || `hsl(${index * 120}, 70%, 50%)`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                name={s.name}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
