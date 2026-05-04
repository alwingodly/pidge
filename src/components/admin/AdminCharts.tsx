"use client"

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  BarChart, Bar, LabelList,
} from "recharts"

export type TrendPoint  = { day: string; bookings: number }
export type StatusSlice = { name: string; value: number; color: string }
export type DoctorBar   = { name: string; count: number }
export type ServiceBar  = { name: string; count: number }

// ── Booking trend line ────────────────────────────────────────────────────────

export function BookingTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDDCC6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#9A7A5A" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9A7A5A" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #EDDCC6",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          itemStyle={{ color: "#BF4646" }}
          labelStyle={{ color: "#1C1007", fontWeight: 600, marginBottom: 2 }}
          formatter={(value) => [Number(value ?? 0), "Bookings"]}
        />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke="#BF4646"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#BF4646", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Status donut ──────────────────────────────────────────────────────────────

export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx={70} cy={70}
            innerRadius={44} outerRadius={62}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #EDDCC6",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            formatter={(value, _name, entry) => [Number(value ?? 0), (entry.payload as StatusSlice).name]}
          />
        </PieChart>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground truncate">{d.name}</span>
            <span className="text-xs font-semibold text-foreground ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal bar — top doctors ─────────────────────────────────────────────

export function TopDoctorsBarChart({ data }: { data: DoctorBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 100)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 2, right: 40, bottom: 2, left: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9A7A5A" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: "#1C1007" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #EDDCC6",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          cursor={{ fill: "#FFF4EA" }}
          formatter={(value) => [Number(value ?? 0), "Appointments"]}
        />
        <Bar dataKey="count" fill="#BF4646" radius={[0, 3, 3, 0]} maxBarSize={18}>
          <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#9A7A5A", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Services bar ──────────────────────────────────────────────────────────────

export function TopServicesBarChart({ data }: { data: ServiceBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 100)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 2, right: 40, bottom: 2, left: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9A7A5A" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: "#1C1007" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #EDDCC6",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          cursor={{ fill: "#FFF4EA" }}
          formatter={(value) => [Number(value ?? 0), "Bookings"]}
        />
        <Bar dataKey="count" fill="#7EACB5" radius={[0, 3, 3, 0]} maxBarSize={18}>
          <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#9A7A5A", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
