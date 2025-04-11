
import React from 'react';
import {
  Line, LineChart as RechartsLineChart,
  Bar, BarChart as RechartsBarChart,
  Pie, PieChart as RechartsPieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Cell, CartesianGrid
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './chart';

export type DataPoint = {
  [key: string]: string | number;
};

interface LineChartProps {
  data: DataPoint[];
  index: string;
  categories: string[];
  colors?: string[];
  className?: string;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  yAxisWidth?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  index,
  categories,
  colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#10b981', '#8b5cf6'], // Default colors with gold/amber as primary
  className,
  showLegend = true,
  valueFormatter = (value) => value.toString(),
  yAxisWidth = 40
}) => {
  return (
    <ChartContainer
      config={{
        ...Object.fromEntries(
          categories.map((category, i) => [
            category,
            { color: colors[i % colors.length], label: category }
          ])
        )
      }}
      className={className}
    >
      <RechartsLineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey={index}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
          tickFormatter={valueFormatter}
          width={yAxisWidth}
        />
        <ChartTooltip
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              label={label}
              formatter={(value) => [valueFormatter(Number(value)), '']}
            />
          )}
        />
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i % colors.length]}
            activeDot={{ r: 6 }}
            strokeWidth={2}
            dot={{ strokeWidth: 2, r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
};

interface BarChartProps {
  data: DataPoint[];
  index: string;
  categories: string[];
  colors?: string[];
  className?: string;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  layout?: 'vertical' | 'horizontal';
  yAxisWidth?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  index,
  categories,
  colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
  className,
  showLegend = true,
  valueFormatter = (value) => value.toString(),
  layout = 'vertical',
  yAxisWidth = 40
}) => {
  return (
    <ChartContainer
      config={{
        ...Object.fromEntries(
          categories.map((category, i) => [
            category,
            { color: colors[i % colors.length], label: category }
          ])
        )
      }}
      className={className}
    >
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={layout === 'vertical'} vertical={layout === 'horizontal'} strokeOpacity={0.3} />
        <XAxis
          dataKey={layout === 'vertical' ? index : undefined}
          type={layout === 'vertical' ? 'category' : 'number'}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
        />
        <YAxis
          dataKey={layout === 'horizontal' ? index : undefined}
          type={layout === 'horizontal' ? 'category' : 'number'}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
          tickFormatter={layout === 'vertical' ? valueFormatter : undefined}
          width={layout === 'vertical' ? yAxisWidth : undefined}
        />
        <ChartTooltip
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              label={label}
              formatter={(value) => [valueFormatter(Number(value)), '']}
            />
          )}
        />
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
};

interface PieChartProps {
  data: DataPoint[];
  index: string;
  categories: string[];
  colors?: string[];
  className?: string;
  valueFormatter?: (value: number) => string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  index,
  categories,
  colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
  className,
  valueFormatter = (value) => value.toString()
}) => {
  // Handle empty data case
  if (!data || data.length === 0 || !categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground italic">
        No data available
      </div>
    );
  }

  // Make sure we have a valid category to use
  const category = categories[0] || 'value';
  
  // Prepare pie data safely
  const pieData = data.map((item) => ({
    name: String(item[index] || 'Unknown'),
    value: Number(item[category] || 0)
  }));

  return (
    <ChartContainer
      config={{
        ...Object.fromEntries(
          pieData.map((entry, i) => [
            entry.name || `item-${i}`,
            { color: colors[i % colors.length], label: entry.name || `Item ${i+1}` }
          ])
        )
      }}
      className={className}
    >
      <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <ChartTooltip
          content={({ active, payload }) => (
            <ChartTooltipContent
              active={active}
              payload={payload}
              formatter={(value) => [valueFormatter(Number(value)), '']}
            />
          )}
        />
        <Legend />
      </RechartsPieChart>
    </ChartContainer>
  );
};
